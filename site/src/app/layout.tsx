import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { EnTete } from "@/components/EnTete";
import { PiedDePage } from "@/components/PiedDePage";
import { LettreInfo } from "@/components/LettreInfo";
import { horairesBoutique, horairesBoutiqueSpec } from "@/lib/data/horaires";
import { SITE_URL, buildJsonLd } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

/**
 * ISR globale : le pied de page affiche les horaires boutique pilotes par
 * l'Atelier (0023) sur TOUTES les routes — les pages statiques suivent donc
 * la meme fraicheur 5 min que les pages a donnees.
 */
export const revalidate = 300;

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700", "800"],
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["400", "500", "600", "700", "800"],
});
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-spline-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "A Léon Mange · plats maison & traiteur en Beaujolais",
    template: "%s · A Léon Mange",
  },
  description:
    "Cuisine artisanale du Beaujolais : boutique de plats faits maison à Létra, food truck sur les marchés, traiteur pour vos événements.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Le pied de page est un composant client : les horaires (lecture serveur)
  // lui sont passes en prop depuis ce layout serveur.
  // Les memes horaires (version machine) alimentent le JSON-LD FoodEstablishment.
  const [horaires, horairesSpec] = await Promise.all([horairesBoutique(), horairesBoutiqueSpec()]);
  const jsonLd = buildJsonLd(horairesSpec);
  return (
    <html lang="fr">
      <body className={`${bricolage.variable} ${hanken.variable} ${splineMono.variable} min-h-screen flex flex-col`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <EnTete />
        <main className="flex-1">{children}</main>
        <PiedDePage horaires={horaires} />
        <LettreInfo />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
