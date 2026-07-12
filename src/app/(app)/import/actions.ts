"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Paiement } from "@/lib/supabase/database.types";

export type ImportFormState = { error?: string; ok?: boolean; importees?: number; exclues?: number } | undefined;

/** Ligne CSV extraite côté client — REVALIDÉE intégralement ici. */
type LigneImport = {
  designation: string;
  qte: number | null;
  poids_kg: number | null;
  montant: number | null;
  reglement: string | null;
};

type Payload = {
  jour: string; // YYYY-MM-DD (jour d'exploitation — occurred_at métier)
  fichier_nom: string | null;
  separateur: string;
  colonnes: Record<string, string>;
  lignes: LigneImport[];
};

/** Normalisation de désignation pour le rapprochement produit. */
function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapperReglement(r: string | null): Paiement {
  const n = (r ?? "").toLowerCase();
  if (n.includes("esp") || n.includes("cash")) return "especes";
  if (n.includes("tick") || n.includes("tr")) return "ticket";
  if (n.includes("vir")) return "virement";
  return "cb"; // défaut boutique (Contrat §04)
}

/**
 * Import caisse (Contrat §05 — MAPPING PROVISOIRE, point ouvert #1) :
 * chaque ligne valide devient une vente boutique instantanée → remise,
 * occurred_at = JOUR D'EXPLOITATION à 12:00 Europe/Paris (jamais
 * created_at). Lignes non rapprochées EXCLUES — jamais créées à l'aveugle.
 * source_vente='import' (badge Import dans l'Historique).
 */
export async function importerVentes(
  _prev: ImportFormState,
  formData: FormData
): Promise<ImportFormState> {
  let p: Payload;
  try {
    p = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Fichier illisible." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.jour)) return { error: "Jour d'exploitation invalide." };
  if (!Array.isArray(p.lignes) || p.lignes.length === 0) return { error: "Aucune ligne à importer." };

  const supabase = await createClient();

  // Rapprochement produit côté serveur (le client ne fait qu'un aperçu).
  const { data: prods, error: prodError } = await supabase
    .from("produit")
    .select("*")
    .eq("canal", "boutique")
    .eq("actif", true);
  if (prodError) return { error: prodError.message };
  const parNom = new Map((prods ?? []).map((x) => [normaliser(x.nom), x]));

  const occurredAt = new Date(`${p.jour}T12:00:00+02:00`).toISOString();
  let importees = 0;
  let exclues = 0;

  const ventesAcreer: { montant: number; paiement: Paiement; ligne: LigneImport; produit: NonNullable<ReturnType<typeof parNom.get>> }[] = [];

  for (const l of p.lignes) {
    const produit = parNom.get(normaliser(l.designation ?? ""));
    if (!produit) {
      exclues++;
      continue;
    }
    let montant = l.montant;
    if (produit.mode === "poids") {
      if (l.poids_kg == null || l.poids_kg <= 0) {
        exclues++;
        continue;
      }
      if (montant == null && produit.prix_kg != null) montant = produit.prix_kg * l.poids_kg;
    } else {
      const qte = l.qte ?? 1;
      if (montant == null && produit.prix_unitaire != null) montant = produit.prix_unitaire * qte;
    }
    if (montant == null || !Number.isFinite(montant) || montant <= 0) {
      exclues++;
      continue;
    }
    ventesAcreer.push({ montant: Math.round(montant * 100) / 100, paiement: mapperReglement(l.reglement), ligne: l, produit });
  }

  if (ventesAcreer.length === 0) return { error: "Aucune ligne rapprochée — corrigez le mapping ou le catalogue." };

  // Sauvegarde du mapping (configurable, réutilisé au prochain import).
  const { data: mappingExistant } = await supabase
    .from("import_mapping")
    .select("id")
    .eq("nom", "defaut")
    .maybeSingle();
  let mappingId: string | null = mappingExistant?.id ?? null;
  if (mappingId) {
    await supabase
      .from("import_mapping")
      .update({ separateur: p.separateur, colonnes: p.colonnes, actif: true })
      .eq("id", mappingId);
  } else {
    const { data: cree } = await supabase
      .from("import_mapping")
      .insert({ nom: "defaut", separateur: p.separateur, colonnes: p.colonnes, actif: true })
      .select("id")
      .maybeSingle();
    mappingId = cree?.id ?? null;
  }

  for (const v of ventesAcreer) {
    const { data: vente, error: venteError } = await supabase
      .from("vente")
      .insert({
        // Comptoir importé : les TROIS dates coïncident au jour d'exploitation
        // (0016) et l'encaissement est acquis — statut 'regle' + règlement (0017).
        occurred_at: occurredAt,
        commande_le: occurredAt,
        encaisse_le: occurredAt,
        statut_paiement: "regle",
        canal: "boutique",
        emplacement_id: null,
        montant_total: v.montant,
        moyen_paiement: v.paiement,
        origine: "spontane",
        mode_vente: "instantane",
        fulfillment: "remis", // instantané → remis (Contrat §05)
        source_vente: "import",
        due_at: null,
      })
      .select("id")
      .single();
    if (venteError) return { error: `${venteError.message} (après ${importees} ventes importées)` };

    const { error: reglementError } = await supabase.from("reglement").insert({
      vente_id: vente.id,
      montant: v.montant,
      encaisse_le: occurredAt,
      moyen_paiement: v.paiement,
      note: "Encaissement caisse (import)",
    });
    if (reglementError) {
      await supabase.from("vente").delete().eq("id", vente.id);
      return { error: `${reglementError.message} (après ${importees} ventes importées)` };
    }

    const { error: ligneError } = await supabase.from("vente_ligne").insert({
      vente_id: vente.id,
      type: "produit",
      mode: v.produit.mode,
      produit_id: v.produit.id,
      recette_id: null,
      libelle: v.produit.nom,
      qte: v.produit.mode === "unite" ? (v.ligne.qte ?? 1) : null,
      prix_unitaire: v.produit.mode === "unite" ? v.produit.prix_unitaire : null,
      poids_g: v.produit.mode === "poids" ? Math.round((v.ligne.poids_kg ?? 0) * 1000) : null,
      prix_kg: v.produit.mode === "poids" ? v.produit.prix_kg : null,
      montant: v.montant,
    });
    if (ligneError) {
      await supabase.from("vente").delete().eq("id", vente.id);
      return { error: `${ligneError.message} (après ${importees} ventes importées)` };
    }
    importees++;
  }

  await supabase.from("import_batch").insert({
    mapping_id: mappingId,
    fichier_nom: p.fichier_nom,
    lignes_total: p.lignes.length,
    lignes_valides: importees,
    statut: "valide",
    jour_exploitation: p.jour,
  });

  revalidatePath("/history");
  revalidatePath("/import");
  return { ok: true, importees, exclues };
}
