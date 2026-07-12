import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Badge, Dot } from "@/components/ui/Badge";
import { SCREEN_META, CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Produit, Canal } from "@/lib/supabase/database.types";
import { NewProductDrawer } from "./NewProductDrawer";

export const metadata = { title: "Catalogue — Atelier ALM" };

/**
 * Catalogue = CONTENU refait à la main (les produits de démo ne sont PAS portés).
 * Vide au lancement. Le formulaire "Nouveau produit" (CTA réel) écrit en base :
 * c'est l'entrée du vrai contenu validé par les chefs.
 */
export default async function CatalogPage() {
  const m = SCREEN_META.catalog;
  let produits: Produit[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("produit")
      .select("*")
      .eq("actif", true)
      .order("canal")
      .order("nom");
    produits = data ?? [];
  }

  const parCanal = groupByCanal(produits);

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} action={<NewProductDrawer />} />

      {produits.length === 0 ? (
        <EmptyState
          titre="Aucun produit — créez le premier"
          message="Le catalogue démarre vide et se remplit avec vos vrais plats (canal, mode unité ou poids, prix). Cliquez sur « Nouveau produit » pour commencer."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {(Object.keys(parCanal) as Canal[]).map((canal) => (
            <Card key={canal} style={{ overflow: "hidden" }}>
              <SectionHeader
                titre={CANAL_LABEL[canal]}
                compteur={`${parCanal[canal].length} produit${parCanal[canal].length > 1 ? "s" : ""}`}
              />
              <div>
                <div
                  className="font-mono uppercase"
                  style={{ display: "grid", gridTemplateColumns: "1.6fr .9fr .7fr .7fr", gap: 8, padding: "8px 16px", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
                >
                  <span>Produit</span>
                  <span>Catégorie</span>
                  <span>Mode</span>
                  <span style={{ textAlign: "right" }}>Prix</span>
                </div>
                {parCanal[canal].map((p) => (
                  <div
                    key={p.id}
                    style={{ display: "grid", gridTemplateColumns: "1.6fr .9fr .7fr .7fr", gap: 8, padding: "11px 16px", alignItems: "center", borderBottom: "1px solid #efe7d6" }}
                  >
                    <div className="flex items-center gap-2">
                      <Dot color={CANAL_COLOR[canal]} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0e3947" }}>{p.nom}</span>
                      {p.is_bowl && <Badge tone="info">Bowl</Badge>}
                    </div>
                    <span style={{ fontSize: 12.5, color: "#6b7469" }}>{p.categorie ?? "—"}</span>
                    <span className="font-mono" style={{ fontSize: 12, color: "#6b7469" }}>
                      {p.mode === "unite" ? "unité" : "poids"}
                    </span>
                    <span className="font-mono" style={{ fontSize: 13.5, fontWeight: 600, color: "#0e3947", textAlign: "right" }}>
                      {p.mode === "unite" ? `${fmt(p.prix_unitaire)} €` : `${fmt(p.prix_kg)} €/kg`}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function groupByCanal(produits: Produit[]): Record<Canal, Produit[]> {
  const acc = { truck: [], boutique: [], traiteur: [] } as Record<Canal, Produit[]>;
  for (const p of produits) acc[p.canal].push(p);
  // Retire les canaux vides
  (Object.keys(acc) as Canal[]).forEach((c) => acc[c].length === 0 && delete (acc as Record<string, Produit[]>)[c]);
  return acc;
}

function fmt(n: number | null): string {
  return n == null ? "—" : n.toFixed(2).replace(".", ",");
}
