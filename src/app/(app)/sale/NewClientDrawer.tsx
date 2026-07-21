"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createClientFiche } from "../clients/actions";

/**
 * Bouton « Nouveau client » + drawer de création de fiche DANS la saisie de vente :
 * l'ancien lien vers /clients faisait perdre la vente en cours. Mêmes champs que le
 * drawer de /clients, même server action (createClientFiche) — à la création réussie,
 * onCreated(id, nom, type) permet au composeur de présélectionner le client.
 */
export function NewClientDrawer({
  onCreated,
}: {
  onCreated: (c: { id: string; nom: string; type: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"particulier" | "pro">("particulier");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function ouvrir() {
    setError(undefined);
    setType("particulier");
    setOpen(true);
  }

  function onSubmit(formData: FormData) {
    const nom = String(formData.get("nom") ?? "").trim();
    startTransition(async () => {
      const res = await createClientFiche(undefined, formData);
      if (res?.error || !res?.id) {
        setError(res?.error ?? "Création impossible.");
      } else {
        setError(undefined);
        setOpen(false);
        onCreated({ id: res.id, nom, type });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        className="flex items-center gap-1.5"
        style={{ fontSize: 12.5, fontWeight: 600, color: "#1493be" }}
      >
        <Plus size={14} strokeWidth={2.4} />
        Nouveau client
      </button>

      {open && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setOpen(false)}>
          <div
            className="fz-scroll h-full overflow-y-auto fz-drawer-full"
            style={{ width: "min(440px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>
                  Clients
                </p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>
                  Nouveau client
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "#8fcfe2" }}>
                <X size={20} />
              </button>
            </div>

            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              <Field label="Nom" name="nom" placeholder="ex : Mairie de Theizé" required />

              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {(["particulier", "pro"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        border: type === t ? "1px solid #1493be" : "1px solid #dfd4bf",
                        background: type === t ? "rgba(20,147,190,.1)" : "#fbf8f1",
                        color: type === t ? "#1493be" : "#6b7469",
                      }}
                    >
                      {t === "particulier" ? "Particulier" : "Pro"}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="type" value={type} />
              </div>

              <Field label="E-mail (optionnel)" name="email" type="email" placeholder="contact@..." />
              <Field label="Téléphone (optionnel)" name="telephone" placeholder="06 ..." />
              <Field label="Code postal (optionnel)" name="code_postal" placeholder="69620" />

              <label className="flex flex-col gap-1.5">
                <Label>Notes (optionnel)</Label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Allergies, préférences, contexte…"
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
        className="outline-none"
        style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
      />
    </label>
  );
}
