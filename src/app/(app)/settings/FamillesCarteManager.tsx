"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import type { Canal, FamilleCarte } from "@/lib/supabase/database.types";
import { saveFamilleCarte, toggleFamilleCarteActif } from "./actions";

/**
 * Familles de carte (0021) — ordre d'affichage + note par canal, LUES par le
 * site public. Rapprochement par (canal, nom = produit.categorie) : une
 * famille dont le nom ne matche aucune catégorie en usage n'agit pas sur la
 * carte (badge « Sans catégorie » + liste des catégories à couvrir).
 * Référentiel : désactivation, jamais de suppression.
 */
export function FamillesCarteManager({
  familles,
  categoriesParCanal,
}: {
  familles: FamilleCarte[];
  categoriesParCanal: Record<Canal, string[]>;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<"new" | FamilleCarte | null>(null);
  const [canal, setCanal] = useState<Canal>("boutique");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const edition = drawer !== null && drawer !== "new" ? drawer : null;
  const CANAUX: Canal[] = ["boutique", "truck", "traiteur"];

  function openDrawer(target: "new" | FamilleCarte) {
    setError(undefined);
    setCanal(target === "new" ? "boutique" : target.canal);
    setDrawer(target);
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveFamilleCarte(undefined, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setError(undefined);
        setDrawer(null);
        router.refresh();
      }
    });
  }

  function onToggle(f: FamilleCarte) {
    startTransition(async () => {
      const res = await toggleFamilleCarteActif(f.id, !f.actif);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end" style={{ marginBottom: 16 }}>
        <button
          onClick={() => openDrawer("new")}
          className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
          style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Nouvelle famille
        </button>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <SectionHeader
          titre="Familles de carte"
          sous="Ordre et notes des familles sur le site public — le nom doit correspondre à une catégorie du catalogue."
          compteur={`${familles.filter((f) => f.actif).length} active${familles.filter((f) => f.actif).length > 1 ? "s" : ""}`}
        />
        {CANAUX.map((c) => {
          const duCanal = familles.filter((f) => f.canal === c);
          const couvertes = new Set(duCanal.filter((f) => f.actif).map((f) => f.nom));
          const sansFamille = (categoriesParCanal[c] ?? []).filter((cat) => !couvertes.has(cat));
          if (duCanal.length === 0 && sansFamille.length === 0) return null;
          return (
            <div key={c}>
              <div className="flex items-center gap-2 flex-wrap" style={{ padding: "10px 16px", background: "#f6f1e7", borderBottom: "1px solid #efe7d6" }}>
                <Dot color={CANAL_COLOR[c]} />
                <span className="font-display" style={{ fontSize: 13.5, fontWeight: 700, color: "#0e3947" }}>{CANAL_LABEL[c]}</span>
                {sansFamille.length > 0 && (
                  <span style={{ fontSize: 11.5, color: "#9a927f" }}>
                    Catégories sans famille : {sansFamille.join(" · ")}
                  </span>
                )}
              </div>
              <div className="fz-tscroll"><div style={{ minWidth: 520 }}>
              {duCanal.map((f) => {
                const matche = (categoriesParCanal[c] ?? []).includes(f.nom);
                return (
                  <div
                    key={f.id}
                    style={{ display: "grid", gridTemplateColumns: "1.6fr 1.6fr .5fr .7fr .6fr", gap: 8, padding: "11px 16px", alignItems: "center", borderBottom: "1px solid #efe7d6", opacity: f.actif ? 1 : 0.55 }}
                  >
                    <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nom}</span>
                      {!matche && f.actif && (
                        <span title="Aucun produit du catalogue n'a cette catégorie : cette famille reste vide sur la carte publique.">
                          <Badge tone="alerte">Aucun produit</Badge>
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12.5, color: "#6b7469", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.note ?? "—"}</span>
                    <span className="font-mono" style={{ fontSize: 12.5, color: "#6b7469", textAlign: "right" }}>{f.ordre}</span>
                    <span>
                      <Badge tone={f.actif ? "succes" : "neutre"}>{f.actif ? "Active" : "Désactivée"}</Badge>
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openDrawer(f)} title="Modifier la famille" style={{ color: "#1493be", padding: 4 }}>
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => onToggle(f)}
                        disabled={pending}
                        style={{ fontSize: 12, fontWeight: 600, color: f.actif ? "#c0442e" : "#1f8a5b", opacity: pending ? 0.5 : 1 }}
                      >
                        {f.actif ? "Désactiver" : "Réactiver"}
                      </button>
                    </div>
                  </div>
                );
              })}
              </div></div>
            </div>
          );
        })}
        {familles.length === 0 && (
          <p style={{ padding: "14px 16px", fontSize: 12.5, color: "#9a927f" }}>
            Aucune famille — le site trie alphabétiquement en attendant. Créez une famille par
            catégorie pour choisir l&apos;ordre d&apos;affichage et ajouter une note.
          </p>
        )}
      </Card>

      {error && drawer === null && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginTop: 12 }}>
          {error}
        </p>
      )}

      {drawer !== null && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setDrawer(null)}>
          <div
            className="fz-scroll h-full overflow-y-auto fz-drawer-full"
            style={{ width: "min(420px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>
                  Réglages
                </p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>
                  {edition ? "Modifier la famille" : "Nouvelle famille"}
                </p>
              </div>
              <button onClick={() => setDrawer(null)} style={{ color: "#8fcfe2" }}>
                <X size={20} />
              </button>
            </div>

            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              {edition && <input type="hidden" name="id" value={edition.id} />}

              <div className="flex flex-col gap-1.5">
                <Label>Canal</Label>
                <div className="flex gap-2 flex-wrap">
                  {CANAUX.map((c) => (
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
                <label className="flex flex-col gap-1.5">
                  <Label>Nom (= catégorie du catalogue)</Label>
                  <input
                    name="nom"
                    defaultValue={edition?.nom ?? ""}
                    placeholder="ex : Plats préparés"
                    required
                    list={`categories-${canal}`}
                    className="outline-none"
                    style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
                  />
                </label>
                {CANAUX.map((c) => (
                  <datalist key={c} id={`categories-${c}`}>
                    {(categoriesParCanal[c] ?? []).map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                ))}
                <span style={{ fontSize: 11.5, color: "#9a927f" }}>
                  {(categoriesParCanal[canal] ?? []).length > 0
                    ? `Catégories en usage sur ce canal : ${(categoriesParCanal[canal] ?? []).join(" · ")}`
                    : "Aucune catégorie en usage sur ce canal pour l'instant."}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex flex-col gap-1.5">
                  <Label>Note affichée sous le titre (optionnel)</Label>
                  <input
                    name="note"
                    defaultValue={edition?.note ?? ""}
                    placeholder="ex : Servis chauds, à réchauffer chez vous"
                    className="outline-none"
                    style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <Label>Ordre d&apos;affichage</Label>
                <input
                  name="ordre"
                  type="number"
                  min={0}
                  max={999}
                  defaultValue={edition?.ordre ?? 0}
                  className="outline-none font-mono"
                  style={{ width: 110, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
                />
                <span style={{ fontSize: 11.5, color: "#9a927f" }}>
                  Du plus petit au plus grand — les familles sans réglage passent après, par ordre alphabétique.
                </span>
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
                  {pending ? "…" : edition ? "Enregistrer" : "Créer la famille"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#9a927f" }}>
      {children}
    </span>
  );
}
