"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type VenteClient,
  crediteUnPassage,
  formaterDateCourte,
  formaterMontant,
  libelleCanalDetaille,
  resumeArticles,
  statutClient,
} from "@/lib/commandes";

type Filtre = "toutes" | "boutique" | "truck";

/** Liste "Mes commandes" (maquette d-compte) : chips de filtre + cartes de commande.
 *  Les ventes sont chargees cote serveur (RLS) et filtrees ici sans re-fetch. */
export function MesCommandes({ ventes }: { ventes: VenteClient[] }) {
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const liste = ventes.filter((v) => filtre === "toutes" || v.canal === filtre);

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="font-display font-extrabold text-[20px] text-canard">Mes commandes</h2>
        <div className="flex gap-[7px]">
          <Chip actif={filtre === "toutes"} onClick={() => setFiltre("toutes")}>
            Toutes
          </Chip>
          <Chip actif={filtre === "boutique"} onClick={() => setFiltre("boutique")}>
            Boutique
          </Chip>
          <Chip actif={filtre === "truck"} onClick={() => setFiltre("truck")}>
            Food truck
          </Chip>
        </div>
      </div>

      {liste.length === 0 ? (
        <div className="rounded-[18px] border border-bord-2 bg-surface p-8 text-center text-[14px] text-muet">
          Aucune commande pour le moment. Vos précommandes boutique et food truck apparaîtront ici.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3.5">
          {liste.map((v) => (
            <CarteCommande key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function CarteCommande({ v }: { v: VenteClient }) {
  const statut = statutClient(v.fulfillment, v.refuse_le);
  const enAttente = v.fulfillment === "web_a_confirmer" && !v.refuse_le;
  const passage = crediteUnPassage(v);

  return (
    <div
      className={`rounded-[18px] p-4 bg-surface ${
        enAttente ? "border border-dashed border-[#d9c08a] sm:col-span-2" : "border border-bord-2"
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono uppercase text-[10px] tracking-[.06em] text-terracotta">
          {libelleCanalDetaille(v.canal, enAttente ? "web" : null)}
        </span>
        <span className="font-mono text-[11px] text-muet">{formaterDateCourte(v.occurred_at)}</span>
      </div>

      <div className="flex gap-3 items-center">
        <span className="w-[56px] h-[56px] rounded-xl shrink-0 bg-voile grid place-items-center text-terracotta/60">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9.5" r="1.8" />
            <path d="m4 18 5-5 3.5 3.5L16 13l4 4" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14.5px] font-bold text-canard truncate">{resumeArticles(v.vente_ligne)}</p>
          <p className="text-[12.5px] text-muet mt-px">{formaterMontant(v.montant_total)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-[5px] rounded-pille border ${
            statut.ton === "vert"
              ? "text-vert bg-vert-fond border-[#c9dec4]"
              : statut.ton === "attente"
                ? "text-[#b07a2e] bg-[#f4ead6] border-[#e7cf9e]"
                : "text-texte-2 bg-surface-2 border-bord-2"
          }`}
        >
          {statut.ton === "attente" && <span className="w-1.5 h-1.5 rounded-full bg-[#e0a63a]" aria-hidden />}
          {statut.label}
        </span>
        {passage && <span className="text-[11px] font-semibold text-terracotta">+1 passage</span>}
      </div>

      {enAttente ? (
        <p className="mt-2.5 text-[11.5px] text-muet leading-[1.45]">
          Le passage sera crédité au retrait, pas maintenant. Paiement au retrait ; paiement en ligne :
          V2, non actif.
        </p>
      ) : (
        <Link
          href={`/compte/commande/${v.id}`}
          className="block text-center font-display font-bold text-[13.5px] text-white bg-[var(--accent)] py-[11px] rounded-pille mt-3 transition-opacity hover:opacity-90"
        >
          Recommander
        </Link>
      )}
    </div>
  );
}

function Chip({
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
      className={`font-sans text-[12px] font-semibold px-[13px] py-[7px] rounded-pille transition-colors ${
        actif ? "text-white bg-canard" : "text-texte-2 bg-surface border border-bord-2 hover:text-canard"
      }`}
    >
      {children}
    </button>
  );
}
