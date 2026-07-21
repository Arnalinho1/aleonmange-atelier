import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clientSession } from "@/lib/supabase/session";
import { creneauxRetraitBoutique, prochainRetraitTruck } from "@/lib/data/creneaux";
import { emplacementsTruck } from "@/lib/data/emplacements";
import { ReCommande, type LigneReco } from "./ReCommande";
import { formaterDateLongue, formaterMontant, libelleCanalDetaille, refCourt } from "@/lib/commandes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Détail de commande", robots: { index: false } };

type LigneDetail = {
  produit_id: string | null;
  libelle: string | null;
  qte: number | null;
  poids_g: number | null;
  mode: string | null;
  montant: number | null;
};

/** Detail de commande + re-commande 1-geste (maquette CD d-cmd). La re-commande
 *  recompose le panier depuis cette commande et reutilise la RPC de precommande
 *  (web_a_confirmer, create-or-match par email du client connecte). */
export default async function DetailCommande({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/compte/connexion");
  await supabase.rpc("web_rattacher_compte_client");

  const [{ data: vente }, { data: client }] = await Promise.all([
    supabase
      .from("vente")
      .select("id, occurred_at, canal, source_vente, fulfillment, montant_total, vente_ligne(produit_id, libelle, qte, poids_g, mode, montant)")
      .eq("id", ref)
      .maybeSingle(),
    supabase.from("client").select("nom, email").maybeSingle(),
  ]);

  if (!vente) redirect("/compte");

  const lignes = (vente.vente_ligne ?? []) as LigneDetail[];
  const canal = vente.canal as string;
  const recommandable = canal === "boutique" || canal === "truck";

  // Creneaux / emplacements pour la re-commande (memes sources que la precommande).
  let creneaux: { iso: string; label: string }[] = [];
  let emplacements: { code: string; nom: string; dateLabel: string | null }[] = [];
  if (recommandable && canal === "boutique") {
    creneaux = await creneauxRetraitBoutique();
  } else if (recommandable && canal === "truck") {
    const empl = await emplacementsTruck();
    emplacements = empl.map((e) => ({
      code: e.code,
      nom: e.nom,
      dateLabel: e.jourSemaine != null ? (prochainRetraitTruck(e.jourSemaine)?.label ?? null) : null,
    }));
  }

  // Lignes re-commandables (produit encore reference, quantite valide) pour
  // recomposer le panier. Une ligne porte SOIT une qte SOIT un poids (>0).
  const lignesReco: LigneReco[] = lignes.flatMap((l): LigneReco[] => {
    if (!l.produit_id) return [];
    if (l.mode === "poids") return (l.poids_g ?? 0) > 0 ? [{ produit_id: l.produit_id, poids_g: l.poids_g as number }] : [];
    return (l.qte ?? 0) > 0 ? [{ produit_id: l.produit_id, qte: l.qte as number }] : [];
  });

  return (
    <section className="mx-auto max-w-[1120px] px-4 md:px-8 py-8 md:py-12">
      <div className="grid md:grid-cols-[1fr_400px] gap-8 items-start">
        {/* Detail */}
        <div>
          <Link
            href="/compte"
            className="inline-flex items-center gap-1.5 font-sans text-[13.5px] font-bold text-texte-2 hover:text-canard transition-colors"
          >
            <span aria-hidden>←</span> Mes commandes
          </Link>
          <h1 className="font-display font-extrabold text-[28px] text-canard tracking-[-.02em] mt-3">
            Commande du {formaterDateLongue(vente.occurred_at as string)}
          </h1>
          <p className="font-mono text-[11px] text-terracotta tracking-[.04em] mt-1 uppercase">
            {libelleCanalDetaille(canal, vente.source_vente as string | null)} · #{refCourt(vente.id as string)}
          </p>

          <div className="rounded-carte-lg border border-bord bg-surface overflow-hidden mt-[18px]">
            {lignes.map((l, i) => (
              <div
                key={i}
                className={`flex gap-3 items-center px-[18px] py-[15px] ${i < lignes.length - 1 ? "border-b border-bord" : ""}`}
              >
                <span className="w-[52px] h-[52px] rounded-[11px] shrink-0 bg-voile grid place-items-center text-terracotta/60">
                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <circle cx="8.5" cy="9.5" r="1.8" />
                    <path d="m4 18 5-5 3.5 3.5L16 13l4 4" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-canard">{l.libelle ?? "Article"}</p>
                  <p className="text-[12.5px] text-muet">
                    {l.mode === "poids" ? `${l.poids_g ?? 0} g` : `×${l.qte ?? 1}`}
                  </p>
                </div>
                <span className="font-display font-bold text-[14.5px] text-canard">{formaterMontant(l.montant)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-bord-2">
            <span className="text-[14.5px] text-texte-2">Total</span>
            <span className="font-display font-extrabold text-[22px] text-canard">{formaterMontant(vente.montant_total)}</span>
          </div>
          <p className="mt-2 text-[12px] text-muet leading-[1.45]">
            Paiement <strong className="text-texte-2">au retrait</strong> ; paiement en ligne : V2, non actif.
          </p>
        </div>

        {/* Re-commande */}
        <div className="md:sticky md:top-5">
          {recommandable && lignesReco.length > 0 && client?.email ? (
            <ReCommande
              canal={canal as "boutique" | "truck"}
              lignes={lignesReco}
              creneaux={creneaux}
              emplacements={emplacements}
              clientNom={client.nom || client.email.split("@")[0] || "Client"}
              clientEmail={client.email}
            />
          ) : (
            <div className="rounded-[20px] border border-bord bg-surface p-6 text-[13.5px] text-texte-2 leading-[1.5]">
              {canal === "traiteur"
                ? "Pour une nouvelle prestation, faites une demande de devis traiteur."
                : "Cette commande n'est pas re-commandable en ligne pour le moment."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
