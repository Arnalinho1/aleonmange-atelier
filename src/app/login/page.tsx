"use client";

import { useActionState } from "react";
import Image from "next/image";
import { signIn, type AuthState } from "./actions";

/**
 * Connexion : accès réservé à l'équipe. Les inscriptions Supabase sont ouvertes
 * globalement (espace client du site public, Vague 4), mais un compte SANS profil
 * n'a AUCUN accès (fail-closed via le hook app_role / est_chef()) : se créer un
 * compte ici ne donnerait rien. L'ajout d'un membre d'équipe se fait par la table
 * profil (futur écran d'invitation /users) ; aucune auto-inscription sur cet écran.
 */
export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, undefined);

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
            Connexion
          </h1>
          <p style={{ fontSize: 13, color: "#6b7469", marginBottom: 18 }}>
            Accès réservé à l&apos;équipe A Léon Mange.
          </p>

          <form action={formAction} className="flex flex-col gap-3">
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
              {pending ? "…" : "Se connecter"}
            </button>
          </form>

          <p style={{ marginTop: 14, fontSize: 12, color: "#9a927f" }}>
            Pas de compte ? L&apos;accès est ouvert par l&apos;équipe — contactez Arnaud.
          </p>
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
