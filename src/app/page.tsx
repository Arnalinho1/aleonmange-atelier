import { redirect } from "next/navigation";

/**
 * Racine : renvoie vers le tableau de bord. Le flag `?guide=1` (deeplink du
 * guide d'onboarding — CONTRAT D'URL FIGÉ, ciblé par le CTA « Découvrir votre
 * Atelier » de la cérémonie d'inauguration et par l'email chefs) est reporté
 * sur la redirection, sinon il serait perdu avant que le shell ne le lise.
 */
export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  redirect(params.guide === "1" ? "/dashboard?guide=1" : "/dashboard");
}
