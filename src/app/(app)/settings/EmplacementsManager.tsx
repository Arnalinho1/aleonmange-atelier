"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil } from "lucide-react";
import { JOUR_SEMAINE_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import type { Emplacement } from "@/lib/supabase/database.types";
import { createEmplacement, updateEmplacement, toggleEmplacementActif } from "./actions";

/**
 * Gestion du référentiel emplacements : ajouter / renommer / désactiver.
 * Pas de suppression — un emplacement désactivé quitte les choix de saisie
 * mais reste en base (les ventes passées gardent leur FK).
 */
export function EmplacementsManager({ emplacements }: { emplacements: Emplacement[] }) {
  const router = useRouter();
  // Drawer : null = fermé, "new" = création, sinon l'emplacement en édition.
  const [drawer, setDrawer] = useState<"new" | Emplacement | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const action = drawer === "new" ? createEmplacement : updateEmplacement;
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

  function onToggle(e: Emplacement) {
    startTransition(async () => {
      const res = await toggleEmplacementActif(e.id, !e.actif);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  const actifs = emplacements.filter((e) => e.actif);
  const inactifs = emplacements.filter((e) => !e.actif);
  const edition = drawer !== null && drawer !== "new" ? drawer : null;

  return (
    <>
      <div className="flex justify-end" style={{ marginBottom: 16 }}>
        <button
          onClick={() => { setError(undefined); setDrawer("new"); }}
          className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
          style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Nouvel emplacement
        </button>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <SectionHeader
          titre="Emplacements truck"
          sous="La vente porte une FK vers cette table — on désactive, on ne supprime jamais."
          compteur={`${actifs.length} actif${actifs.length > 1 ? "s" : ""}`}
        />
        <div>
          <div
            className="font-mono uppercase"
            style={{ display: "grid", gridTemplateColumns: "1.7fr .8fr .8fr .6fr .5fr", gap: 8, padding: "8px 16px", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
          >
            <span>Emplacement</span>
            <span>Code</span>
            <span>Jour</span>
            <span>Statut</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {[...actifs, ...inactifs].map((e) => (
            <div
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.7fr .8fr .8fr .6fr .5fr",
                gap: 8,
                padding: "11px 16px",
                alignItems: "center",
                borderBottom: "1px solid #efe7d6",
                opacity: e.actif ? 1 : 0.55,
              }}
            >
              <div className="flex items-center gap-2">
                <Dot color={e.actif ? "#e9a23b" : "#9a927f"} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0e3947" }}>{e.libelle}</span>
              </div>
              <span className="font-mono" style={{ fontSize: 11.5, color: "#8a7f6a" }}>{e.code}</span>
              <span style={{ fontSize: 12.5, color: "#6b7469" }}>
                {e.jour_semaine != null ? JOUR_SEMAINE_LABEL[e.jour_semaine] : "—"}
              </span>
              <span>
                <Badge tone={e.actif ? "succes" : "neutre"}>{e.actif ? "Actif" : "Désactivé"}</Badge>
              </span>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { setError(undefined); setDrawer(e); }}
                  title="Renommer / modifier"
                  style={{ color: "#1493be", padding: 4 }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onToggle(e)}
                  disabled={pending}
                  style={{ fontSize: 12, fontWeight: 600, color: e.actif ? "#c0442e" : "#1f8a5b", opacity: pending ? 0.5 : 1 }}
                >
                  {e.actif ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {error && drawer === null && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginTop: 12 }}>
          {error}
        </p>
      )}

      {drawer !== null && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setDrawer(null)}>
          <div
            className="fz-scroll h-full overflow-y-auto"
            style={{ width: "min(420px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>
                  Réglages
                </p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>
                  {edition ? "Modifier l'emplacement" : "Nouvel emplacement"}
                </p>
              </div>
              <button onClick={() => setDrawer(null)} style={{ color: "#8fcfe2" }}>
                <X size={20} />
              </button>
            </div>

            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              {edition && <input type="hidden" name="id" value={edition.id} />}

              <label className="flex flex-col gap-1.5">
                <Label>Libellé</Label>
                <input
                  name="libelle"
                  defaultValue={edition?.libelle ?? ""}
                  placeholder="ex : Marché de Villefranche"
                  required
                  className="outline-none"
                  style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <Label>Jour de présence (optionnel)</Label>
                <select
                  name="jour_semaine"
                  defaultValue={edition?.jour_semaine != null ? String(edition.jour_semaine) : ""}
                  className="outline-none"
                  style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
                >
                  <option value="">—</option>
                  {Object.entries(JOUR_SEMAINE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>

              {edition ? (
                <p className="font-mono" style={{ fontSize: 11, color: "#8a7f6a", background: "#f1ead9", borderRadius: 8, padding: "8px 10px" }}>
                  Code : {edition.code} (immuable — clé d&apos;analytique)
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "#9a927f" }}>
                  Le code stable est généré automatiquement à partir du libellé.
                </p>
              )}

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
                  {pending ? "…" : edition ? "Enregistrer" : "Créer l'emplacement"}
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
