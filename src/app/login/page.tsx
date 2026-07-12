"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { signIn, signUp, type AuthState } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  return (
    <div className="min-h-screen grid place-items-center" style={{ padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
          <span className="grid place-items-center rounded-full overflow-hidden" style={{ width: 46, height: 46, background: "#f6f1e7", boxShadow: "0 0 0 2px rgba(14,57,71,.1)" }}>
            <Image src="/alm-mark.png" alt="A Léon Mange" width={46} height={46} style={{ objectFit: "cover" }} />
          </span>
          <div>
            <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#0e3947", lineHeight: 1.1 }}>
              A Léon Mange
            </p>
            <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".18em", color: "#b07a2e" }}>
              Atelier
            </p>
          </div>
        </div>

        <div style={{ background: "#f6f1e7", border: "1px solid #dfd4bf", borderRadius: 16, padding: 24 }}>
          <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: "#0e3947", marginBottom: 4 }}>
            {mode === "in" ? "Connexion" : "Créer le compte"}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7469", marginBottom: 18 }}>
            {mode === "in"
              ? "Accès réservé à l'équipe A Léon Mange."
              : "Le premier compte créé devient propriétaire."}
          </p>

          <form action={formAction} className="flex flex-col gap-3">
            {mode === "up" && <Field name="nom" label="Nom" type="text" placeholder="Audrey Depouilly" />}
            <Field name="email" label="E-mail" type="email" placeholder="vous@aleonmange.fr" required />
            <Field name="password" label="Mot de passe" type="password" placeholder="••••••••" required />

            {state?.error && (
              <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px" }}>
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="font-display transition-opacity hover:opacity-90"
              style={{ background: "#d81020", color: "#f6f1e7", fontWeight: 700, fontSize: 15, padding: "11px", borderRadius: 11, marginTop: 4, opacity: pending ? 0.6 : 1 }}
            >
              {pending ? "…" : mode === "in" ? "Se connecter" : "Créer le compte"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            style={{ marginTop: 14, fontSize: 13, color: "#1493be", fontWeight: 600 }}
          >
            {mode === "in" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ name, label, type, placeholder, required }: { name: string; label: string; type: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#9a927f" }}>
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="outline-none"
        style={{ background: "#fbf8f1", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
      />
    </label>
  );
}
