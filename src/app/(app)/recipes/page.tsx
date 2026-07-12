import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Badge, Dot } from "@/components/ui/Badge";
import { SCREEN_META, CATEGORIE_COLOR, CATEGORIE_LABEL } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { coutMatiereFiche, coutParPortion, margeBruteMatiere, fmtEuro } from "@/lib/calculs";
import type { Recette, RecetteComposant, Composant, Produit } from "@/lib/supabase/database.types";
import { ChefHat } from "lucide-react";
import { NewRecipeDrawer } from "./NewRecipeDrawer";

export const metadata = { title: "Recettes & plats — Atelier ALM" };

/**
 * Fiches techniques de production (HANDOFF §02 recipes) : composants, quantités,
 * étapes, rendement. Rôle production — la marge « brute matière » (prix − coût
 * matière) s'affiche ici ; la marge « nette » (après charges) vit dans Finances
 * (marges nommées distinctement, jamais le même libellé pour deux calculs).
 * CONTENU refait avec les chefs : l'écran démarre vide.
 */
export default async function RecipesPage() {
  const m = SCREEN_META.recipes;
  let recettes: Recette[] = [];
  let lignes: RecetteComposant[] = [];
  let composants: Composant[] = [];
  let produits: Produit[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const [r, l, c, p] = await Promise.all([
      supabase.from("recette").select("*").eq("actif", true).order("nom"),
      supabase.from("recette_composant").select("*"),
      supabase.from("composant").select("*").order("nom"),
      supabase.from("produit").select("*").eq("actif", true).not("recette_id", "is", null),
    ]);
    recettes = r.data ?? [];
    lignes = l.data ?? [];
    composants = c.data ?? [];
    produits = p.data ?? [];
  }

  const compParId = new Map(composants.map((c) => [c.id, c]));
  const lignesParRecette = new Map<string, RecetteComposant[]>();
  for (const l of lignes) {
    const arr = lignesParRecette.get(l.recette_id) ?? [];
    arr.push(l);
    lignesParRecette.set(l.recette_id, arr);
  }
  const produitParRecette = new Map(produits.map((p) => [p.recette_id as string, p]));

  return (
    <>
      <ScreenHeader
        rubrique={m.rubrique}
        titre={m.titre}
        desc={m.desc}
        action={<NewRecipeDrawer composants={composants} />}
      />

      {recettes.length === 0 ? (
        <EmptyState
          icon={<ChefHat size={30} strokeWidth={1.6} />}
          titre="Aucune fiche technique — créez-en une"
          message="Les fiches (composants, quantités, étapes, rendement) se créent avec les chefs. Rôle production : coût matière et marge brute, pas de recalcul commercial."
        />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 16 }}>
            {recettes.map((r) => {
              const comps = lignesParRecette.get(r.id) ?? [];
              const cout = coutMatiereFiche(comps, compParId);
              const produit = produitParRecette.get(r.id);
              const etapes = Array.isArray(r.etapes) ? (r.etapes as string[]) : [];
              return (
                <Card key={r.id} style={{ padding: 18 }}>
                  <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                    <span
                      className="grid place-items-center rounded-full font-display"
                      style={{ width: 46, height: 46, background: "#0e3947", color: "#f6f1e7", fontSize: 19, fontWeight: 800, flexShrink: 0 }}
                    >
                      {r.nom.charAt(0).toUpperCase()}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#0e3947", lineHeight: 1.15 }}>
                        {r.nom}
                      </p>
                      <p className="font-mono" style={{ fontSize: 10.5, color: "#a79b84", marginTop: 2 }}>
                        {r.rendement ? `${r.rendement} portion${r.rendement > 1 ? "s" : ""}` : "rendement non renseigné"}
                        {etapes.length > 0 && ` · ${etapes.length} étape${etapes.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    {r.is_virtuelle && <Badge tone="info">Bowl</Badge>}
                  </div>

                  <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 6 }}>
                    Recette
                  </p>
                  <div className="flex flex-col" style={{ marginBottom: 12 }}>
                    {comps.map((l) => {
                      const c = compParId.get(l.composant_id);
                      const coutLigne =
                        l.quantite != null && c?.cout_matiere_kg != null
                          ? (l.quantite / 1000) * c.cout_matiere_kg
                          : null;
                      return (
                        <div key={l.id} className="flex items-center gap-2" style={{ padding: "6px 0", borderBottom: "1px solid #efe7d6" }}>
                          <Dot color={CATEGORIE_COLOR[l.categorie]} size={7} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0e3947" }}>
                            {c?.nom ?? "Composant retiré"}
                          </span>
                          <span className="font-mono" style={{ fontSize: 10.5, color: "#a79b84" }}>
                            {CATEGORIE_LABEL[l.categorie]}
                          </span>
                          <span className="font-mono" style={{ fontSize: 12, color: "#6b7469", width: 52, textAlign: "right" }}>
                            {l.quantite != null ? `${fmtQte(l.quantite)} g` : "—"}
                          </span>
                          <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "#0e3947", width: 56, textAlign: "right" }}>
                            {coutLigne != null ? `${fmtEuro(coutLigne)} €` : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ background: "#f1ead9", borderRadius: 12, padding: "12px 14px" }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                      <span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#8a7f6a" }}>
                        Coût &amp; marge
                      </span>
                      <Badge tone="calcule">Calculé</Badge>
                    </div>
                    <LigneCalc label="Coût matière (fiche)" value={cout != null ? `${fmtEuro(cout)} €` : "—"} />
                    <LigneCalc
                      label="Coût / portion"
                      value={cout != null && r.rendement ? `${fmtEuro(cout / r.rendement)} €` : "—"}
                    />
                    <LigneCalc
                      label="Prix de vente"
                      value={produit?.prix_unitaire != null ? `${fmtEuro(produit.prix_unitaire)} €` : "—"}
                    />
                    <LigneCalc
                      label="Marge brute matière"
                      value={afficherMarge(cout, r.rendement, produit)}
                      strong
                    />
                  </div>
                </Card>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "#9a927f", marginTop: 14 }}>
            La marge <strong>nette</strong> (après charges) est calculée dans Finances — jamais ici.
          </p>
        </>
      )}
    </>
  );
}

function LigneCalc({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "3px 0" }}>
      <span style={{ fontSize: 12.5, color: "#6b7469" }}>{label}</span>
      <span
        className="font-mono"
        style={{ fontSize: strong ? 14 : 12.5, fontWeight: strong ? 700 : 600, color: strong ? "#1493be" : "#0e3947" }}
      >
        {value}
      </span>
    </div>
  );
}

/** Marge brute matière affichable — « — » dès qu'un terme manque (jamais NaN). */
function afficherMarge(cout: number | null, rendement: number | null, produit: Produit | undefined): string {
  const marge = margeBruteMatiere(produit?.prix_unitaire ?? null, coutParPortion(cout, rendement));
  return marge == null ? "—" : `${fmtEuro(marge)} €`;
}

function fmtQte(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}
