"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { authentifier, type EtatAuth } from "../actions";
import { trackEvent } from "@/lib/analytics";

type Mode = "creation" | "connexion";

/**
 * Formulaire connexion / creation (client), conforme maquette CD d-login.
 * Deux Server Actions via le dispatcher `authentifier` (champ cache "mode").
 * La creation marque kind='client' (aucun profil, fail-closed) ; confirmation
 * e-mail obligatoire. Deux consentements (fidelite, newsletter) : la fidelite
 * est appliquee au rattachement, la newsletter via la RPC double opt-in.
 */
export function FormulaireConnexion() {
  const [mode, setMode] = useState<Mode>("creation");
  const [etat, formAction, enCours] = useActionState<EtatAuth, FormData>(authentifier, undefined);
  const creation = mode === "creation";
  const compteTracke = useRef(false);
  // Server Action sans redirect : etat.info truthy = inscription reussie (unique
  // au signup ; connexion redirige). Garde useRef : le formulaire n'est pas demonte.
  useEffect(() => {
    if (etat?.info && !compteTracke.current) {
      compteTracke.current = true;
      trackEvent("compte_cree");
    }
  }, [etat?.info]);

  return (
    <div className="mt-6">
      <div className="flex gap-1 p-1 rounded-pille bg-surface-2 border border-bord-2 max-w-[420px]">
        <Onglet actif={creation} onClick={() => setMode("creation")}>
          Créer un compte
        </Onglet>
        <Onglet actif={!creation} onClick={() => setMode("connexion")}>
          Se connecter
        </Onglet>
      </div>

      <form action={formAction} className="mt-5">
        <input type="hidden" name="mode" value={mode} />

        <div className="grid grid-cols-2 gap-3.5 max-w-[560px]">
          {creation && (
            <>
              <Champ name="prenom" placeholder="Prénom" autoComplete="given-name" />
              <Champ name="nom" placeholder="Nom" autoComplete="family-name" />
            </>
          )}
          <label className="col-span-2 flex flex-col gap-1.5">
            <Champ name="email" type="email" placeholder="Email" required autoComplete="email" />
            <span className="text-[11.5px] text-muet ml-0.5">
              Votre email vous rattache à vos points de fidélité.
            </span>
          </label>
          <div className="col-span-2">
            <Champ
              name="motdepasse"
              type="password"
              placeholder="Mot de passe"
              required
              autoComplete={creation ? "new-password" : "current-password"}
            />
          </div>
        </div>

        {creation && (
          <div className="rounded-carte border border-bord-2 bg-surface p-4 mt-4 max-w-[560px]">
            <Consentement
              name="fidelite"
              titre="Je rejoins le programme fidélité"
              detail="Vos passages en boutique et au food truck cumulent des récompenses."
              defaultChecked
            />
            <div className="mt-3 pt-3 border-t border-bord">
              <Consentement
                name="newsletter"
                titre="Je reçois la newsletter"
                detail="Emplacements du truck, nouveautés (1x/mois environ)."
              />
            </div>
            <p className="mt-3 text-[11px] text-muet leading-[1.45]">
              Consentement RGPD explicite, retirable à tout moment depuis votre profil.
            </p>
          </div>
        )}

        {etat?.erreur && (
          <p className="mt-4 max-w-[560px] text-[13px] rounded-lg px-3 py-2 bg-terracotta/10 text-terracotta">
            {etat.erreur}
          </p>
        )}
        {etat?.info && (
          <p className="mt-4 max-w-[560px] text-[13px] rounded-lg px-3 py-2 bg-vert-fond text-vert">
            {etat.info}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="mt-[18px] inline-flex items-center justify-center gap-2 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[15px] px-[30px] py-[15px] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {enCours ? "..." : creation ? "Créer mon compte" : "Se connecter"}
          {!enCours && <span aria-hidden>{"→"}</span>}
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
      className={`flex-1 h-[42px] rounded-pille font-display font-bold text-[14px] transition-colors ${
        actif ? "bg-[var(--accent)] text-white" : "text-texte-2 hover:text-canard"
      }`}
    >
      {children}
    </button>
  );
}

function Champ({
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
}: {
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      aria-label={placeholder}
      required={required}
      autoComplete={autoComplete}
      className="w-full rounded-xl border border-bord-3 bg-surface px-[15px] py-3.5 text-[14px] text-canard outline-none focus:border-[var(--accent)]"
    />
  );
}

function Consentement({
  name,
  titre,
  detail,
  defaultChecked,
}: {
  name: string;
  titre: string;
  detail: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex gap-[11px] items-start cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 w-[18px] h-[18px] accent-[var(--accent)] shrink-0"
      />
      <span className="block">
        <span className="block text-[13.5px] font-semibold text-canard leading-[1.35]">{titre}</span>
        <span className="block text-[12px] text-muet leading-[1.4] mt-0.5">{detail}</span>
      </span>
    </label>
  );
}
