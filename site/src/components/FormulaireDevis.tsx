"use client";

import { useState } from "react";
import { Carte, BadgeMono, SurTitre } from "@/components/ui";
import { Champ, ChampZone, BoutonSubmit } from "@/components/forms";

/** Demande de devis traiteur (d-devis). Ecrit dans demande_devis (pas une vente). */
export function FormulaireDevis() {
  const [enAttente, setEnAttente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer(formData: FormData) {
    setErreur(null);
    setEnAttente(true);
    try {
      const payload = {
        type_evenement: str(formData.get("type_evenement")),
        date_evenement: str(formData.get("date_evenement")),
        nb_convives: num(formData.get("nb_convives")),
        budget_indicatif: str(formData.get("budget_indicatif")),
        description: str(formData.get("description")),
        contact_nom: String(formData.get("contact_nom") ?? "").trim(),
        contact_email: String(formData.get("contact_email") ?? "").trim(),
        contact_telephone: str(formData.get("contact_telephone")),
      };
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean(payload)),
      });
      const data = await res.json();
      if (!res.ok) setErreur(data?.error ?? "Une erreur est survenue. Reessayez.");
      else setEnvoye(true);
    } catch {
      setErreur("Impossible de contacter le serveur. Reessayez.");
    } finally {
      setEnAttente(false);
    }
  }

  if (envoye) {
    return (
      <Carte className="p-8 text-center max-w-[560px] mx-auto">
        <BadgeMono ton="vert">Demande envoyee</BadgeMono>
        <h2 className="font-display font-extrabold text-[24px] text-canard mt-4">Merci, c&apos;est bien recu</h2>
        <p className="text-[14.5px] text-texte-2 mt-3 leading-relaxed">
          Aucun paiement maintenant. Nous etudions votre projet et revenons vers vous <strong>sous 48h</strong>.
        </p>
      </Carte>
    );
  }

  return (
    <Carte className="p-6 md:p-8 max-w-[680px]">
      <SurTitre>Votre projet</SurTitre>
      <form action={envoyer} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Champ label="Type d'evenement" name="type_evenement" placeholder="Mariage, anniversaire, cocktail..." />
        <Champ label="Date envisagee" name="date_evenement" type="date" />
        <Champ label="Nombre de convives" name="nb_convives" type="number" min={1} placeholder="ex : 30" />
        <Champ label="Budget indicatif (optionnel)" name="budget_indicatif" placeholder="ex : 500 a 800 EUR" />
        <div className="sm:col-span-2">
          <ChampZone label="Votre projet" name="description" placeholder="Decrivez votre evenement, vos envies, contraintes..." />
        </div>
        <Champ label="Votre nom" name="contact_nom" required placeholder="Nom et prenom" autoComplete="name" />
        <Champ label="Email" name="contact_email" type="email" required placeholder="vous@email.fr" autoComplete="email" />
        <Champ label="Telephone (optionnel)" name="contact_telephone" placeholder="06 ..." autoComplete="tel" />
        {erreur && <p className="sm:col-span-2 text-[13px] text-[var(--accent)]">{erreur}</p>}
        <div className="sm:col-span-2 flex flex-col gap-2">
          <BoutonSubmit enAttente={enAttente}>Envoyer ma demande</BoutonSubmit>
          <p className="text-[11.5px] text-texte-3">Une demande de devis n&apos;est pas un engagement. Aucun paiement en ligne.</p>
        </div>
      </form>
    </Carte>
  );
}

function str(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}
function num(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
function clean<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
