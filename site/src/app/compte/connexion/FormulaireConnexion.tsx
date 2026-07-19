"use client";

import { useActionState, useState } from "react";
import { authentifier, type EtatAuth } from "../actions";

type Mode = "connexion" | "creation";

/**
 * Formulaire connexion / creation (client). Socle infra auth : deux Server
 * Actions (seConnecter, sInscrire). La creation marque kind='client' cote
 * action -> aucun profil (fail-closed) ; confirmation par e-mail obligatoire.
 */
export function FormulaireConnexion() {
  const [mode, setMode] = useState<Mode>("connexion");
  const [etat, formAction, enCours] = useActionState<EtatAuth, FormData>(authentifier, undefined);

  return (
    <div className="rounded-2xl border border-bord bg-surface p-5 md:p-6">
      <div className="flex gap-1 p-1 mb-5 rounded-pille bg-surface-2 text-[13.5px] font-display font-bold">
        <Onglet actif={mode === "connexion"} onClick={() => setMode("connexion")}>
          Connexion
        </Onglet>
        <Onglet actif={mode === "creation"} onClick={() => setMode("creation")}>
          Creer un compte
        </Onglet>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="mode" value={mode} />
        {mode === "creation" && (
          <div className="flex gap-3">
            <Champ name="prenom" label="Prenom" autoComplete="given-name" />
            <Champ name="nom" label="Nom" autoComplete="family-name" />
          </div>
        )}
        <Champ name="email" label="E-mail" type="email" required autoComplete="email" />
        <Champ
          name="motdepasse"
          label="Mot de passe"
          type="password"
          required
          autoComplete={mode === "creation" ? "new-password" : "current-password"}
        />

        {mode === "creation" && (
          <label className="flex items-start gap-2.5 text-[13px] text-canard/80 mt-1">
            <input type="checkbox" name="fidelite" className="mt-0.5 accent-[var(--accent)]" />
            <span>
              Je rejoins le programme de fidelite (une recompense apres plusieurs retraits en
              boutique ou au food truck). Facultatif, modifiable a tout moment.
            </span>
          </label>
        )}

        {etat?.erreur && (
          <p className="text-[13px] rounded-lg px-3 py-2 bg-terracotta/10 text-terracotta">
            {etat.erreur}
          </p>
        )}
        {etat?.info && (
          <p className="text-[13px] rounded-lg px-3 py-2 bg-[var(--accent)]/10 text-canard">
            {etat.info}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="mt-1 inline-flex items-center justify-center h-[46px] rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[14.5px] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {enCours ? "..." : mode === "connexion" ? "Se connecter" : "Creer mon compte"}
        </button>
      </form>
    </div>
  );
}

function Onglet({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-[38px] rounded-pille transition-colors ${
        actif ? "bg-surface text-canard shadow-sm" : "text-canard/60 hover:text-canard"
      }`}
    >
      {children}
    </button>
  );
}

function Champ({
  name,
  label,
  type = "text",
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex-1 flex flex-col gap-1.5">
      <span className="font-mono uppercase text-[10px] tracking-[.12em] text-canard/50">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="h-[44px] rounded-lg border border-bord-2 bg-surface-2 px-3 text-[14px] text-canard outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}
