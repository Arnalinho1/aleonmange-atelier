import type { Metadata } from "next";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte",
  description: "Connexion et création de compte client A Léon Mange.",
};

/** Ecran connexion / creation (espace client, Vague 4), conforme maquette CD d-login :
 *  colonne formulaire + panneau sombre "Pourquoi un compte". */
export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  return (
    <section className="mx-auto max-w-[1120px] px-4 md:px-8 py-10 md:py-14">
      <div className="rounded-carte-lg border border-bord-3 bg-surface-2 overflow-hidden shadow-[0_40px_90px_-44px_rgba(14,57,71,0.4)]">
        <div className="grid md:grid-cols-[1fr_420px]">
          <div className="p-7 md:p-11">
            <p className="font-mono uppercase text-[11px] tracking-[.14em] text-terracotta">
              Votre espace
            </p>
            <h1 className="font-display font-extrabold text-[30px] md:text-[34px] leading-[1.05] tracking-[-.02em] text-canard mt-[7px]">
              Fidélité, commandes et préférences
            </h1>
            {erreur === "lien" && (
              <p className="mt-4 max-w-[560px] text-[13px] rounded-lg px-3 py-2 bg-terracotta/10 text-terracotta">
                Le lien de confirmation est invalide ou a expiré. Reconnectez-vous ou recréez le lien.
              </p>
            )}
            <FormulaireConnexion />
          </div>

          <aside className="bg-canard text-[#F6F1E7] p-8 md:p-10 flex flex-col justify-center">
            <p className="font-mono uppercase text-[10.5px] tracking-[.14em] text-[#8FCFE2]">
              Pourquoi un compte
            </p>
            <div className="flex flex-col gap-5 mt-5">
              <Atout titre="Fidélité automatique" detail="Vos passages sont comptés au retrait, sans carte à tamponner.">
                <path d="M12 2 15 9l7 .5-5.5 4.5L18 21l-6-3.8L6 21l1.5-7L2 9.5 9 9z" />
              </Atout>
              <Atout titre="Vos commandes en un geste" detail="Retrouvez et recommandez vos plats préférés.">
                <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
                <path d="M9 7h6M9 11h6" />
              </Atout>
              <Atout titre="Vos préférences" detail="Goûts et emplacement favori, pour mieux vous servir.">
                <path d="M12 3v18M3 12h18" />
              </Atout>
            </div>
            <div className="flex gap-2 items-start mt-6 pt-[18px] border-t border-white/15">
              <span className="font-mono text-[12px] text-or shrink-0" aria-hidden>
                ↳
              </span>
              <span className="text-[12.5px] text-[#CDDCE0] leading-[1.5]">
                Aucun paiement en ligne. Vos données restent chez nous, jamais revendues.
              </span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Atout({
  titre,
  detail,
  children,
}: {
  titre: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-[13px]">
      <span className="w-[30px] h-[30px] shrink-0 rounded-[9px] bg-or/15 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F0C173" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {children}
        </svg>
      </span>
      <span className="block">
        <span className="block font-display font-bold text-[16px]">{titre}</span>
        <span className="block text-[13px] text-[#C9DCE2] leading-[1.5] mt-0.5">{detail}</span>
      </span>
    </div>
  );
}
