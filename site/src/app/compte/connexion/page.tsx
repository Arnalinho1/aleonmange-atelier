import type { Metadata } from "next";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon compte",
  description: "Connexion et creation de compte client A Leon Mange.",
};

/**
 * Ecran connexion / creation (espace client, Vague 4).
 * NOTE : version SOCLE (infra auth) volontairement sobre. La maquette CD
 * (d-login : panneau "Pourquoi un compte", visuels) est branchee en Phase B.
 */
export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  return (
    <section className="mx-auto max-w-[460px] px-4 md:px-8 py-12 md:py-16">
      <h1 className="font-display font-extrabold text-[26px] text-canard mb-1.5">Mon compte</h1>
      <p className="text-[14px] text-canard/70 mb-6">
        Retrouvez vos commandes et votre carte de fidelite.
      </p>
      {erreur === "lien" && (
        <p className="mb-4 text-[13px] rounded-lg px-3 py-2 bg-terracotta/10 text-terracotta">
          Le lien de confirmation est invalide ou a expire. Reconnectez-vous ou recreez le lien.
        </p>
      )}
      <FormulaireConnexion />
    </section>
  );
}
