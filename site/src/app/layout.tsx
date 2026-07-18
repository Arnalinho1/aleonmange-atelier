import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { EnTete } from "@/components/EnTete";
import { PiedDePage } from "@/components/PiedDePage";
import { LettreInfo } from "@/components/LettreInfo";
import "./globals.css";

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
  title: {
    default: "A Léon Mange · Boutique, food truck et traiteur en Beaujolais",
    template: "%s · A Léon Mange",
  },
  description:
    "Cuisine artisanale du Beaujolais : boutique de plats faits maison à Létra, food truck sur les marchés, traiteur pour vos événements.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${bricolage.variable} ${hanken.variable} ${splineMono.variable} min-h-screen flex flex-col`}>
        <EnTete />
        <main className="flex-1">{children}</main>
        <PiedDePage />
        <LettreInfo />
      </body>
    </html>
  );
}
