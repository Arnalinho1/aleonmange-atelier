"use client";

import { useActionState, useState } from "react";
import {
  majProfil,
  basculerFidelite,
  enregistrerPreferences,
  sAbonnerNewsletter,
  type EtatProfil,
} from "./actions";
import { seDeconnecter } from "../actions";

const GOUTS = ["Fait maison", "Végétarien", "Épicé", "Sans gluten", "Local et de saison", "Gourmand sucré"];
const FREQUENCES = ["Chaque semaine", "Quelques fois par mois", "Occasionnellement"];

type ClientProfil = {
  nom: string;
  email: string;
  telephone: string;
  code_postal: string;
  fidelite_opt_in: boolean;
};
type Preference = { gouts: string[]; emplacement_favori: string; frequence: string };

export function ProfilForm({
  client,
  preference,
  emplacements,
}: {
  client: ClientProfil;
  preference: Preference;
  emplacements: string[];
}) {
  const mots = client.nom.trim().split(/\s+/).filter(Boolean);
  const prenom = mots[0] ?? "";
  const nom = mots.slice(1).join(" ");

  const [etatCoord, actionCoord, coordEnCours] = useActionState<EtatProfil, FormData>(majProfil, undefined);
  const [etatPref, actionPref, prefEnCours] = useActionState<EtatProfil, FormData>(enregistrerPreferences, undefined);
  const [etatNews, actionNews, newsEnCours] = useActionState<EtatProfil, FormData>(sAbonnerNewsletter, undefined);
  const [supprOuvert, setSupprOuvert] = useState(false);

  return (
    <div className="grid md:grid-cols-2 gap-[34px] pt-6">
      {/* Colonne gauche : coordonnees + consentements */}
      <div>
        <Titre>Coordonnées</Titre>
        <form action={actionCoord} className="rounded-carte border border-bord-2 bg-surface overflow-hidden">
          <div className="grid grid-cols-2 gap-3 p-4 border-b border-bord">
            <ChampProfil name="prenom" label="Prénom" defaultValue={prenom} />
            <ChampProfil name="nom" label="Nom" defaultValue={nom} />
          </div>
          <div className="p-4 border-b border-bord">
            <p className="text-[13px] text-muet mb-1">Email</p>
            <p className="text-[14px] font-semibold text-canard break-all">{client.email}</p>
            <span className="inline-block mt-1.5 font-mono text-[9px] tracking-[.04em] text-terracotta bg-[#f4ebd9] border border-[#ead9b6] px-2 py-0.5 rounded-pille">
              clé fidélité
            </span>
          </div>
          <div className="p-4 border-b border-bord">
            <ChampProfil name="telephone" label="Téléphone" type="tel" defaultValue={client.telephone} placeholder="06 12 34 56 78" />
            <span className="inline-block mt-1.5 font-mono text-[9px] tracking-[.04em] text-muet bg-[#f0eadc] border border-bord-2 px-2 py-0.5 rounded-pille">
              secours
            </span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-[13px] text-muet">Code postal</span>
            <span className="text-[14px] font-semibold text-canard">{client.code_postal || "—"}</span>
          </div>
          <div className="flex items-center gap-3 p-4 pt-0">
            <button
              type="submit"
              disabled={coordEnCours}
              className="rounded-pille bg-canard text-white font-display font-bold text-[13.5px] px-5 py-2.5 disabled:opacity-60"
            >
              {coordEnCours ? "..." : "Enregistrer"}
            </button>
            {etatCoord?.info && <span className="text-[12.5px] text-vert">{etatCoord.info}</span>}
            {etatCoord?.erreur && <span className="text-[12.5px] text-terracotta">{etatCoord.erreur}</span>}
          </div>
        </form>

        <Titre className="mt-5">Consentements (RGPD)</Titre>
        <div className="rounded-carte border border-bord-2 bg-surface overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-bord">
            <div>
              <p className="text-[14px] font-semibold text-canard">Programme fidélité</p>
              <p className="text-[12px] text-muet">{client.fidelite_opt_in ? "actif" : "inactif"}</p>
            </div>
            <form action={basculerFidelite}>
              <input type="hidden" name="cible" value={client.fidelite_opt_in ? "desactiver" : "activer"} />
              <Switch actif={client.fidelite_opt_in} label="Programme fidélité" />
            </form>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-[14px] font-semibold text-canard">Newsletter</p>
              <p className="text-[12px] text-muet">emplacements et nouveautés</p>
            </div>
            <form action={actionNews}>
              <input type="hidden" name="email" value={client.email} />
              <button
                type="submit"
                disabled={newsEnCours}
                className="rounded-pille border border-bord-2 bg-surface-2 text-texte-2 font-sans font-semibold text-[12.5px] px-4 py-2 hover:text-canard disabled:opacity-60"
              >
                {newsEnCours ? "..." : "S'abonner"}
              </button>
            </form>
          </div>
        </div>
        {etatNews?.info && <p className="mt-2 text-[12.5px] text-vert">{etatNews.info}</p>}
        {etatNews?.erreur && <p className="mt-2 text-[12.5px] text-terracotta">{etatNews.erreur}</p>}
        <p className="mt-2 text-[11.5px] text-muet leading-[1.45]">
          Désinscription de la newsletter à tout moment via le lien en bas de nos emails.
        </p>

        <div className="flex gap-2.5 mt-[18px]">
          <form action={seDeconnecter} className="flex-1">
            <button className="w-full text-center font-sans font-semibold text-[13px] text-texte-2 bg-[#f0eadc] border border-bord-2 py-3 rounded-pille hover:text-canard">
              Se déconnecter
            </button>
          </form>
          <button
            type="button"
            onClick={() => setSupprOuvert((v) => !v)}
            className="flex-1 text-center font-sans font-semibold text-[13px] text-[#a2542e] bg-[#f6e9e1] border border-[#ead2c4] py-3 rounded-pille"
          >
            Supprimer mon compte
          </button>
        </div>
        {supprOuvert && (
          <p className="mt-2.5 text-[12px] text-texte-2 leading-[1.5] rounded-lg bg-surface-2 border border-bord-2 p-3">
            Pour supprimer définitivement votre compte et vos données, écrivez-nous à{" "}
            <a href="mailto:aleonmange@yahoo.com" className="text-terracotta font-semibold underline">
              aleonmange@yahoo.com
            </a>
            . La suppression en libre-service arrivera prochainement.
          </p>
        )}
      </div>

      {/* Colonne droite : preferences */}
      <div id="preferences">
        <div className="rounded-[14px] bg-[#f4ebd9] border border-[#ead9b6] px-4 py-3.5">
          <p className="font-display font-bold text-[13.5px] text-[#8a5a24]">Aidez-nous à mieux vous servir</p>
          <p className="text-[12px] text-[#93764a] leading-[1.5] mt-1">
            Ces préférences sont <strong>enregistrées pour la suite</strong>. Aujourd’hui, le site ne
            personnalise pas encore vos recommandations, cela viendra.
          </p>
        </div>

        <form action={actionPref}>
          <Titre className="mt-5">Goûts culinaires</Titre>
          <Chips type="checkbox" name="gouts" options={GOUTS} selection={preference.gouts} />

          {emplacements.length > 0 && (
            <>
              <Titre className="mt-[18px]">Emplacement favori</Titre>
              <Chips
                type="radio"
                name="emplacement_favori"
                options={emplacements}
                selection={preference.emplacement_favori ? [preference.emplacement_favori] : []}
              />
            </>
          )}

          <Titre className="mt-[18px]">Fréquence de communication</Titre>
          <Chips
            type="radio"
            name="frequence"
            options={FREQUENCES}
            selection={preference.frequence ? [preference.frequence] : []}
          />

          <div className="flex items-center gap-3 mt-5">
            <button
              type="submit"
              disabled={prefEnCours}
              className="rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[13.5px] px-5 py-2.5 disabled:opacity-60"
            >
              {prefEnCours ? "..." : "Enregistrer mes préférences"}
            </button>
            {etatPref?.info && <span className="text-[12.5px] text-vert">{etatPref.info}</span>}
            {etatPref?.erreur && <span className="text-[12.5px] text-terracotta">{etatPref.erreur}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

function Titre({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-mono uppercase text-[10px] tracking-[.1em] text-terracotta mb-2.5 ${className}`}>
      {children}
    </p>
  );
}

function ChampProfil({
  name,
  label,
  type = "text",
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] text-muet mb-1">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-bord-2 bg-surface-2 px-3 py-2 text-[14px] font-semibold text-canard outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}

function Switch({ actif, label }: { actif: boolean; label: string }) {
  return (
    <button
      type="submit"
      aria-label={`${actif ? "Désactiver" : "Activer"} : ${label}`}
      className={`w-[44px] h-[26px] rounded-pille relative shrink-0 transition-colors ${
        actif ? "bg-[var(--accent)]" : "bg-bord-4"
      }`}
    >
      <span
        className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all ${
          actif ? "right-[3px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function Chips({
  type,
  name,
  options,
  selection,
}: {
  type: "checkbox" | "radio";
  name: string;
  options: string[];
  selection: string[];
}) {
  return (
    <div className="flex flex-wrap gap-[9px]">
      {options.map((opt) => (
        <label key={opt} className="cursor-pointer">
          <input
            type={type}
            name={name}
            value={opt}
            defaultChecked={selection.includes(opt)}
            className="peer sr-only"
          />
          <span className="inline-block font-sans text-[13px] font-semibold px-[13px] py-2 rounded-pille border border-bord-2 bg-surface text-texte-2 transition-colors peer-checked:bg-[var(--accent)] peer-checked:text-white peer-checked:border-[var(--accent)]">
            {opt}
          </span>
        </label>
      ))}
    </div>
  );
}
