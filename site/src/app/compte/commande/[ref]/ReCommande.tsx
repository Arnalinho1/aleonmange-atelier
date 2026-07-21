"use client";

import { useState } from "react";

export type LigneReco = { produit_id: string; qte?: number; poids_g?: number };

/** Re-commande 1-geste (maquette d-cmd). Recompose le panier depuis la commande
 *  passee ; le client choisit juste le creneau. POST /api/commande (meme RPC que
 *  la precommande : web_a_confirmer, create-or-match par l'email du client). */
export function ReCommande({
  canal,
  lignes,
  creneaux,
  emplacements,
  clientNom,
  clientEmail,
}: {
  canal: "boutique" | "truck";
  lignes: LigneReco[];
  creneaux: { iso: string; label: string }[];
  emplacements: { code: string; nom: string; dateLabel: string | null }[];
  clientNom: string;
  clientEmail: string;
}) {
  const [choix, setChoix] = useState("");
  const [enAttente, setEnAttente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const boutique = canal === "boutique";
  const aDesCreneaux = boutique ? creneaux.length > 0 : emplacements.length > 0;
  const peut = choix.length > 0 && !enAttente;

  async function envoyer() {
    setErreur(null);
    setEnAttente(true);
    try {
      const payload = {
        canal,
        ...(boutique ? { creneau: choix } : { emplacement_code: choix }),
        client: { nom: clientNom, email: clientEmail },
        lignes,
      };
      const res = await fetch("/api/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setErreur(data?.error ?? "Une erreur est survenue. Réessayez.");
      else setOk(true);
    } catch {
      setErreur("Impossible de contacter le serveur. Réessayez.");
    } finally {
      setEnAttente(false);
    }
  }

  if (ok) {
    return (
      <div className="rounded-[20px] border border-[#c9dec4] bg-vert-fond p-6">
        <div className="flex items-center gap-2.5">
          <span className="w-[30px] h-[30px] rounded-full bg-vert shrink-0 grid place-items-center">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <p className="font-display font-extrabold text-[17px] text-[#215239]">Demande envoyée</p>
        </div>
        <p className="text-[13px] text-[#3b6b4e] leading-[1.5] mt-2.5">
          À régler <strong>au retrait</strong>. Le chef confirmera la disponibilité, vous serez
          prévenu(e). Statut : en attente de confirmation par l’atelier.
        </p>
        <button
          type="button"
          onClick={() => { setOk(false); setChoix(""); }}
          className="mt-3.5 font-sans font-semibold text-[13px] text-[#215239] underline"
        >
          Recommander à nouveau
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-bord bg-surface p-6">
      <p className="font-display font-extrabold text-[18px] text-canard">Envie de la même chose ?</p>
      <p className="text-[13.5px] text-texte-2 leading-[1.5] mt-1.5">
        Tout est déjà rempli. On recompose votre panier en un geste, vous choisissez juste le créneau.
      </p>

      <div className="mt-4">
        <label className="block font-mono uppercase text-[10px] tracking-[.1em] text-terracotta mb-1.5">
          {boutique ? "Créneau de retrait" : "Emplacement du marché"}
        </label>
        {aDesCreneaux ? (
          <select
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            aria-label={boutique ? "Créneau de retrait" : "Emplacement du marché"}
            className="w-full rounded-xl border border-bord-3 bg-surface-2 px-3.5 py-3 text-[14px] text-canard outline-none focus:border-[var(--accent)]"
          >
            <option value="">{boutique ? "Choisir un créneau" : "Choisir un emplacement"}</option>
            {boutique
              ? creneaux.map((c) => (
                  <option key={c.iso} value={c.iso}>{c.label}</option>
                ))
              : emplacements.map((e) => (
                  <option key={e.code} value={e.code}>{e.nom}{e.dateLabel ? ` (${e.dateLabel})` : ""}</option>
                ))}
          </select>
        ) : (
          <p className="text-[12.5px] text-muet">
            {boutique ? "Aucun créneau disponible pour le moment." : "Aucune date de marché disponible pour le moment."}
          </p>
        )}
      </div>

      {erreur && <p className="text-[13px] text-[var(--accent)] mt-3">{erreur}</p>}

      <button
        type="button"
        onClick={envoyer}
        disabled={!peut}
        className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] text-white font-display font-bold text-[15.5px] py-[15px] rounded-pille mt-4 transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        {enAttente ? "Envoi..." : "Recommander cette commande"}
      </button>
      <p className="text-center text-[11.5px] text-muet mt-2.5">
        Aucun paiement en ligne. À régler au retrait, après confirmation de l’atelier.
      </p>
    </div>
  );
}
