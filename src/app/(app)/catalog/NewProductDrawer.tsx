"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL } from "@/lib/nav";
import { createProduit } from "./actions";

/** Bouton "Nouveau produit" + drawer de création (CTA réel — écrit en base). */
export function NewProductDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"unite" | "poids">("unite");
  const [canal, setCanal] = useState<"truck" | "boutique" | "traiteur">("boutique");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createProduit(undefined, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setError(undefined);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
        style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
      >
        <Plus size={16} strokeWidth={2.4} />
        Nouveau produit
      </button>

      {open && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setOpen(false)}>
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
                  Nouveau produit
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "#8fcfe2" }}>
                <X size={20} />
              </button>
            </div>

            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              <Field label="Nom du produit" name="nom" placeholder="ex : Gratin dauphinois" required />

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
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                required
              />

              <Field label="Catégorie (optionnel)" name="categorie" placeholder="ex : Plat mijoté" />

              <label className="flex items-center gap-2" style={{ fontSize: 13, color: "#6b7469" }}>
                <input type="checkbox" name="is_bowl" />
                Produit composé (bowl) — déplié en composants pour le coût matière
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
                  {pending ? "…" : "Créer le produit"}
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

function Field({ label, name, type = "text", placeholder, required, inputMode }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; inputMode?: "decimal" }) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        className="outline-none"
        style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
      />
    </label>
  );
}
