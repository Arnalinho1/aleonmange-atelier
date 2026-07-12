"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { CATEGORIE_COLOR, CATEGORIE_LABEL } from "@/lib/nav";
import { Dot } from "@/components/ui/Badge";
import type { Composant, CategorieComposant } from "@/lib/supabase/database.types";
import { createComposant, createRecette } from "./actions";

/** Quantités saisies par composant sélectionné (grammes, chaîne brute du champ). */
type Selection = Record<string, string>;

/**
 * Bouton "Nouveau plat" + drawer de création de fiche technique (CTA réel).
 * Les composants existants se cochent ; un mini-formulaire permet d'en créer
 * sans quitter la fiche (router.refresh() rafraîchit la liste reçue en props).
 */
export function NewRecipeDrawer({ composants }: { composants: Composant[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({});
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // Mini-formulaire composant (imbriqué visuellement, PAS un <form> HTML imbriqué).
  const [compOpen, setCompOpen] = useState(false);
  const [compNom, setCompNom] = useState("");
  const [compCat, setCompCat] = useState<CategorieComposant>("proteine");
  const [compCout, setCompCout] = useState("");
  const [compError, setCompError] = useState<string | undefined>();
  const [compPending, startCompTransition] = useTransition();

  function toggle(id: string) {
    setSelection((s) => {
      const next = { ...s };
      if (id in next) delete next[id];
      else next[id] = "";
      return next;
    });
  }

  function onAddComposant() {
    const fd = new FormData();
    fd.set("comp_nom", compNom);
    fd.set("comp_categorie", compCat);
    fd.set("comp_cout", compCout);
    startCompTransition(async () => {
      const res = await createComposant(undefined, fd);
      if (res?.error) {
        setCompError(res.error);
      } else {
        setCompError(undefined);
        setCompNom("");
        setCompCout("");
        setCompOpen(false);
        router.refresh(); // La liste des composants (props serveur) se met à jour.
      }
    });
  }

  function onSubmit(formData: FormData) {
    const lignes = Object.entries(selection).map(([composant_id, q]) => ({
      composant_id,
      quantite_g: q.trim() ? Number(q.replace(",", ".")) : null,
    }));
    formData.set("lignes", JSON.stringify(lignes));
    startTransition(async () => {
      const res = await createRecette(undefined, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setError(undefined);
        setSelection({});
        setOpen(false);
        router.refresh();
      }
    });
  }

  const actifs = composants.filter((c) => c.actif);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
        style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
      >
        <Plus size={16} strokeWidth={2.4} />
        Nouveau plat
      </button>

      {open && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setOpen(false)}>
          <div
            className="fz-scroll h-full overflow-y-auto"
            style={{ width: "min(460px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>
                  Fiche technique
                </p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>
                  Nouveau plat
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "#8fcfe2" }}>
                <X size={20} />
              </button>
            </div>

            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              <Field label="Nom du plat" name="nom" placeholder="ex : Coco-curry" required />
              <Field
                label="Rendement (portions, optionnel)"
                name="rendement"
                type="number"
                placeholder="ex : 12"
              />

              <div className="flex flex-col gap-1.5">
                <Label>Composition</Label>
                {actifs.length === 0 && (
                  <p style={{ fontSize: 12.5, color: "#6b7469", background: "#f1ead9", borderRadius: 8, padding: "8px 10px" }}>
                    Aucun composant en base — créez le premier ci-dessous.
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {actifs.map((c) => {
                    const sel = c.id in selection;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => toggle(c.id)}
                        className="flex items-center gap-1.5"
                        style={{
                          padding: "6px 11px",
                          borderRadius: 100,
                          fontSize: 12.5,
                          fontWeight: 600,
                          border: sel ? "1px solid transparent" : "1px solid #dfd4bf",
                          background: sel ? "#0e3947" : "#fbf8f1",
                          color: sel ? "#f6f1e7" : "#6b7469",
                        }}
                      >
                        <Dot color={CATEGORIE_COLOR[c.categorie]} />
                        {c.nom}
                      </button>
                    );
                  })}
                </div>

                {Object.keys(selection).length > 0 && (
                  <div className="flex flex-col gap-2" style={{ marginTop: 6 }}>
                    {actifs
                      .filter((c) => c.id in selection)
                      .map((c) => (
                        <div key={c.id} className="flex items-center gap-2" style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "7px 10px" }}>
                          <Dot color={CATEGORIE_COLOR[c.categorie]} />
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0e3947" }}>{c.nom}</span>
                          <input
                            value={selection[c.id]}
                            onChange={(e) => setSelection((s) => ({ ...s, [c.id]: e.target.value }))}
                            placeholder="qté"
                            inputMode="decimal"
                            className="outline-none font-mono"
                            style={{ width: 64, background: "#fbf8f1", border: "1px solid #dfd4bf", borderRadius: 8, padding: "5px 8px", fontSize: 12.5, textAlign: "right", color: "#0e3947" }}
                          />
                          <span className="font-mono" style={{ fontSize: 11, color: "#9a927f" }}>g</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Création de composant sans quitter la fiche */}
                {compOpen ? (
                  <div className="flex flex-col gap-2" style={{ background: "#f1ead9", borderRadius: 10, padding: 12, marginTop: 6 }}>
                    <Label>Nouveau composant</Label>
                    <input
                      value={compNom}
                      onChange={(e) => setCompNom(e.target.value)}
                      placeholder="ex : Poulet fermier"
                      className="outline-none"
                      style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#0e3947" }}
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      {(Object.keys(CATEGORIE_LABEL) as CategorieComposant[]).map((cat) => (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => setCompCat(cat)}
                          className="flex items-center gap-1.5"
                          style={{
                            padding: "5px 10px",
                            borderRadius: 100,
                            fontSize: 12,
                            fontWeight: 600,
                            border: compCat === cat ? "1px solid transparent" : "1px solid #dfd4bf",
                            background: compCat === cat ? "#0e3947" : "#fbf8f1",
                            color: compCat === cat ? "#f6f1e7" : "#6b7469",
                          }}
                        >
                          <Dot color={CATEGORIE_COLOR[cat]} size={7} />
                          {CATEGORIE_LABEL[cat]}
                        </button>
                      ))}
                    </div>
                    <input
                      value={compCout}
                      onChange={(e) => setCompCout(e.target.value)}
                      placeholder="Coût matière €/kg (optionnel)"
                      inputMode="decimal"
                      className="outline-none"
                      style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#0e3947" }}
                    />
                    {compError && (
                      <p style={{ fontSize: 12, color: "#c0442e" }}>{compError}</p>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setCompOpen(false)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 12.5, fontWeight: 600, color: "#6b7469" }}>
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={onAddComposant}
                        disabled={compPending}
                        style={{ flex: 1, padding: "8px", borderRadius: 9, background: "#0e3947", color: "#f6f1e7", fontSize: 12.5, fontWeight: 600, opacity: compPending ? 0.6 : 1 }}
                      >
                        {compPending ? "…" : "Ajouter le composant"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCompOpen(true)}
                    className="flex items-center gap-1.5"
                    style={{ alignSelf: "flex-start", marginTop: 4, fontSize: 12.5, fontWeight: 600, color: "#1493be" }}
                  >
                    <Plus size={14} strokeWidth={2.4} />
                    Nouveau composant
                  </button>
                )}
              </div>

              <label className="flex flex-col gap-1.5">
                <Label>Étapes (une par ligne, optionnel)</Label>
                <textarea
                  name="etapes"
                  rows={4}
                  placeholder={"ex :\nFaire revenir le poulet.\nAjouter le lait de coco."}
                  className="outline-none fz-scroll"
                  style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, color: "#0e3947", resize: "vertical" }}
                />
              </label>

              {error && (
                <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px" }}>
                  {error}
                </p>
              )}

              <div className="flex gap-2" style={{ marginTop: 4 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 14, fontWeight: 600, color: "#6b7469" }}>
                  Annuler
                </button>
                <button type="submit" disabled={pending} className="font-display" style={{ flex: 1, padding: "11px", borderRadius: 11, background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, opacity: pending ? 0.6 : 1 }}>
                  {pending ? "…" : "Créer la fiche"}
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

function Field({ label, name, type = "text", placeholder, required }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        min={type === "number" ? 1 : undefined}
        className="outline-none"
        style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
      />
    </label>
  );
}
