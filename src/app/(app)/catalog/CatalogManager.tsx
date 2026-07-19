"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil, BookOpen } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Produit, Recette, Canal } from "@/lib/supabase/database.types";
import { createProduit, updateProduit, toggleProduitActif } from "./actions";

/** Coût/portion et marge brute matière pré-calculés côté serveur (source unique calculs.ts). */
export type CoutParProduit = Record<string, { cout: number | null; marge: number | null }>;

/**
 * Catalogue : créer / éditer / retirer d'un canal (soft delete). La fiche
 * technique liée (recette_id) alimente les colonnes Coût et Marge (MOCKUP §3.5)
 * et le dépliage bowl de la saisie de vente.
 */
export function CatalogManager({
  produits,
  recettes,
  couts,
}: {
  produits: Produit[];
  recettes: Recette[];
  couts: CoutParProduit;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<"new" | Produit | null>(null);
  const [mode, setMode] = useState<"unite" | "poids">("unite");
  const [canal, setCanal] = useState<Canal>("boutique");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function openDrawer(target: "new" | Produit) {
    setError(undefined);
    if (target === "new") {
      setMode("unite");
      setCanal("boutique");
    } else {
      setMode(target.mode);
      setCanal(target.canal);
    }
    setDrawer(target);
  }

  function onSubmit(formData: FormData) {
    const action = drawer === "new" ? createProduit : updateProduit;
    startTransition(async () => {
      const res = await action(undefined, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setError(undefined);
        setDrawer(null);
        router.refresh();
      }
    });
  }

  function onToggle(p: Produit) {
    startTransition(async () => {
      const res = await toggleProduitActif(p.id, !p.actif);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  const parCanal = groupByCanal(produits);
  const edition = drawer !== null && drawer !== "new" ? drawer : null;

  return (
    <>
      <div className="flex justify-end" style={{ marginBottom: 16 }}>
        <button
          onClick={() => openDrawer("new")}
          className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
          style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Nouveau produit
        </button>
      </div>

      {produits.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={30} strokeWidth={1.6} />}
          titre="Aucun produit — créez le premier"
          message="Le catalogue démarre vide et se remplit avec vos vrais plats (canal, mode unité ou poids, prix, fiche technique liée). Cliquez sur « Nouveau produit » pour commencer."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {(Object.keys(parCanal) as Canal[]).map((c) => (
            <Card key={c} style={{ overflow: "hidden" }}>
              <SectionHeader
                titre={CANAL_LABEL[c]}
                compteur={`${parCanal[c].filter((p) => p.actif).length} produit${parCanal[c].filter((p) => p.actif).length > 1 ? "s" : ""}`}
              />
              <div>
                <div
                  className="font-mono uppercase"
                  style={{ display: "grid", gridTemplateColumns: "1.7fr .8fr .55fr .6fr .55fr .6fr .6fr .4fr", gap: 8, padding: "8px 16px", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
                >
                  <span>Produit</span>
                  <span>Catégorie</span>
                  <span>Mode</span>
                  <span style={{ textAlign: "right" }}>Prix</span>
                  <span style={{ textAlign: "right" }}>Coût</span>
                  <span style={{ textAlign: "right" }}>Marge</span>
                  <span>Statut</span>
                  <span />
                </div>
                {parCanal[c].map((p) => {
                  const k = couts[p.id];
                  return (
                    <div
                      key={p.id}
                      style={{ display: "grid", gridTemplateColumns: "1.7fr .8fr .55fr .6fr .55fr .6fr .6fr .4fr", gap: 8, padding: "11px 16px", alignItems: "center", borderBottom: "1px solid #efe7d6", opacity: p.actif ? 1 : 0.55 }}
                    >
                      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                        <Dot color={CANAL_COLOR[c]} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</span>
                        {p.is_bowl && <Badge tone="info">Bowl</Badge>}
                        {!p.visible_site && <Badge tone="neutre">Masqué du site</Badge>}
                      </div>
                      <span style={{ fontSize: 12.5, color: "#6b7469" }}>{p.categorie ?? "—"}</span>
                      <span className="font-mono" style={{ fontSize: 12, color: "#6b7469" }}>
                        {p.mode === "unite" ? "unité" : "poids"}
                      </span>
                      <span className="font-mono" style={{ fontSize: 13.5, fontWeight: 600, color: "#0e3947", textAlign: "right" }}>
                        {p.mode === "unite" ? `${fmt(p.prix_unitaire)} €` : `${fmt(p.prix_kg)} €/kg`}
                      </span>
                      <span className="font-mono" style={{ fontSize: 12.5, color: "#6b7469", textAlign: "right" }}>
                        {k?.cout != null ? `${fmt(k.cout)} €` : "—"}
                      </span>
                      <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#1493be", textAlign: "right" }}>
                        {k?.marge != null ? `${fmt(k.marge)} €` : "—"}
                      </span>
                      <span>
                        <Badge tone={p.actif ? "succes" : "neutre"}>{p.actif ? "Actif" : "Retiré"}</Badge>
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openDrawer(p)} title="Éditer le produit" style={{ color: "#1493be", padding: 4 }}>
                          <Pencil size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {error && drawer === null && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginTop: 12 }}>
          {error}
        </p>
      )}

      {drawer !== null && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setDrawer(null)}>
          <div
            className="fz-scroll h-full overflow-y-auto"
            style={{ width: "min(440px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>
                  Catalogue
                </p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>
                  {edition ? "Éditer le produit" : "Nouveau produit"}
                </p>
              </div>
              <button onClick={() => setDrawer(null)} style={{ color: "#8fcfe2" }}>
                <X size={20} />
              </button>
            </div>

            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              {edition && <input type="hidden" name="id" value={edition.id} />}
              <Field label="Nom du produit" name="nom" defaultValue={edition?.nom} placeholder="ex : Gratin dauphinois" required />

              <div className="flex flex-col gap-1.5">
                <Label>Canal</Label>
                <div className="flex gap-2 flex-wrap">
                  {(["truck", "boutique", "traiteur"] as const).map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCanal(c)}
                      className="flex items-center gap-1.5"
                      style={{
                        padding: "7px 12px",
                        borderRadius: 100,
                        fontSize: 12.5,
                        fontWeight: 600,
                        border: canal === c ? "1px solid transparent" : "1px solid #dfd4bf",
                        background: canal === c ? "#0e3947" : "#fbf8f1",
                        color: canal === c ? "#f6f1e7" : "#6b7469",
                      }}
                    >
                      <span className="rounded-full" style={{ width: 8, height: 8, background: CANAL_COLOR[c] }} />
                      {CANAL_LABEL[c]}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="canal" value={canal} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Mode de tarification</Label>
                <div className="flex gap-2">
                  {(["unite", "poids"] as const).map((mo) => (
                    <button
                      type="button"
                      key={mo}
                      onClick={() => setMode(mo)}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        border: mode === mo ? "1px solid #1493be" : "1px solid #dfd4bf",
                        background: mode === mo ? "rgba(20,147,190,.1)" : "#fbf8f1",
                        color: mode === mo ? "#1493be" : "#6b7469",
                      }}
                    >
                      {mo === "unite" ? "À l'unité" : "Au poids (€/kg)"}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="mode" value={mode} />
              </div>

              <Field
                label={mode === "unite" ? "Prix à l'unité (€)" : "Prix au kilo (€/kg)"}
                name="prix"
                defaultValue={edition ? fmtInput(edition.mode === "unite" ? edition.prix_unitaire : edition.prix_kg) : undefined}
                inputMode="decimal"
                placeholder="0,00"
                required
              />

              <div className="flex flex-col gap-1.5">
                <Field
                  label={mode === "unite" ? "Coût d'achat (€/pièce, optionnel)" : "Coût d'achat (€/kg, optionnel)"}
                  name="cout_achat"
                  defaultValue={edition ? fmtInput(edition.cout_achat) : undefined}
                  inputMode="decimal"
                  placeholder="0,00"
                />
                <span style={{ fontSize: 11.5, color: "#9a927f" }}>
                  Pour les produits revendus sans fiche — la fiche technique liée reste prioritaire pour le coût matière.
                </span>
              </div>

              <Field label="Catégorie (optionnel)" name="categorie" defaultValue={edition?.categorie ?? ""} placeholder="ex : Plat mijoté" />

              <div className="flex flex-col gap-1.5">
                <label className="flex flex-col gap-1.5">
                  <Label>Description pour le site (optionnel)</Label>
                  <textarea
                    name="description"
                    defaultValue={edition?.description ?? ""}
                    placeholder="ex : Pommes de terre fondantes, crème et muscade — la recette de la maison."
                    rows={3}
                    className="outline-none"
                    style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947", resize: "vertical", fontFamily: "inherit" }}
                  />
                </label>
                <span style={{ fontSize: 11.5, color: "#9a927f" }}>
                  Affichée sous le nom du produit sur le site public. Vide = rien d&apos;affiché.
                </span>
              </div>

              <label className="flex items-center gap-2" style={{ fontSize: 13, color: "#6b7469" }}>
                <input type="checkbox" name="visible_site" defaultChecked={edition ? edition.visible_site : true} />
                Visible sur le site — le site public n&apos;affiche que les produits actifs ET visibles
              </label>

              <label className="flex flex-col gap-1.5">
                <Label>Fiche technique liée (optionnel)</Label>
                <select
                  name="recette_id"
                  defaultValue={edition?.recette_id ?? ""}
                  className="outline-none"
                  style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
                >
                  <option value="">— aucune —</option>
                  {recettes.map((r) => (
                    <option key={r.id} value={r.id}>{r.nom}</option>
                  ))}
                </select>
                <span style={{ fontSize: 11.5, color: "#9a927f" }}>
                  Alimente le coût matière, la marge brute et le dépliage bowl.
                </span>
              </label>

              <label className="flex items-center gap-2" style={{ fontSize: 13, color: "#6b7469" }}>
                <input type="checkbox" name="is_bowl" defaultChecked={edition?.is_bowl} />
                Produit composé (bowl) — déplié en composants pour le coût matière
              </label>

              {error && (
                <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px" }}>
                  {error}
                </p>
              )}

              <div className="flex gap-2" style={{ marginTop: 4 }}>
                <button type="button" onClick={() => setDrawer(null)} style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 14, fontWeight: 600, color: "#6b7469" }}>
                  Annuler
                </button>
                <button type="submit" disabled={pending} className="font-display" style={{ flex: 1, padding: "11px", borderRadius: 11, background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, opacity: pending ? 0.6 : 1 }}>
                  {pending ? "…" : edition ? "Enregistrer" : "Créer le produit"}
                </button>
              </div>

              {edition && (
                <button
                  type="button"
                  onClick={() => { onToggle(edition); setDrawer(null); }}
                  disabled={pending}
                  style={{ fontSize: 13, fontWeight: 600, color: edition.actif ? "#c0442e" : "#1f8a5b", padding: "6px 0" }}
                >
                  {edition.actif ? "Retirer du canal (désactiver)" : "Réactiver le produit"}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function groupByCanal(produits: Produit[]): Record<Canal, Produit[]> {
  const acc = { truck: [], boutique: [], traiteur: [] } as Record<Canal, Produit[]>;
  for (const p of produits) acc[p.canal].push(p);
  (Object.keys(acc) as Canal[]).forEach((c) => acc[c].length === 0 && delete (acc as Record<string, Produit[]>)[c]);
  return acc;
}

function fmt(n: number | null): string {
  return n == null ? "—" : n.toFixed(2).replace(".", ",");
}

function fmtInput(n: number | null): string {
  return n == null ? "" : String(n).replace(".", ",");
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#9a927f" }}>
      {children}
    </span>
  );
}

function Field({ label, name, defaultValue, placeholder, required, inputMode }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; inputMode?: "decimal" }) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <input
        name={name}
        defaultValue={defaultValue}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        className="outline-none"
        style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
      />
    </label>
  );
}
