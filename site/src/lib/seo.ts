import type { Metadata } from "next";
import { COORDONNEES } from "@/lib/contenu";
import type { OpeningSpec } from "@/lib/data/horaires";

/**
 * Fondations SEO/GEO centralisees. Motif impose par l'API metadata de Next 16 :
 * `openGraph` et `alternates` ne sont PAS deep-merges (une page qui les definit
 * ecrase la version heritee), et un canonical pose au layout serait herite par
 * toutes les pages. On centralise donc ici, et chaque page appelle buildMetadata.
 * Toutes les valeurs proviennent des sources uniques (COORDONNEES, base) — jamais
 * de donnee inventee.
 */

export const SITE_URL = "https://aleonmange.app";
const OG_IMAGE = "/images/boutique-facade.webp"; // resolu en absolu via metadataBase

type PageMetaInput = {
  /** Chemin propre : sert de canonical ET d'og:url (ex. "/boutique", "/"). */
  path: string;
  /** Titre passe au template racine "%s · A Léon Mange". */
  title?: string;
  /** Titre qui COUPE le template (accueil : evite le doublon de marque). */
  titleAbsolute?: string;
  description?: string;
  ogImage?: string;
  /** false => <meta robots="noindex, nofollow">. */
  index?: boolean;
};

/** Metadata complet d'une page : title/description + canonical + OpenGraph (og:url) + Twitter. */
export function buildMetadata(input: PageMetaInput): Metadata {
  const { path, title, titleAbsolute, description, ogImage = OG_IMAGE, index = true } = input;
  const ogTitle = titleAbsolute ?? title;
  const meta: Metadata = {
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: COORDONNEES.nom,
      locale: "fr_FR",
      url: path,
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(description ? { description } : {}),
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      ...(ogTitle ? { title: ogTitle } : {}),
      ...(description ? { description } : {}),
      images: [ogImage],
    },
  };
  if (titleAbsolute) meta.title = { absolute: titleAbsolute };
  else if (title) meta.title = title;
  if (description) meta.description = description;
  if (!index) meta.robots = { index: false, follow: false };
  return meta;
}

/**
 * JSON-LD FoodEstablishment (sous-type de LocalBusiness) alimente EXCLUSIVEMENT
 * par les sources uniques. Les horaires machine viennent de la base (openingHours) ;
 * les coordonnees GPS sont fournies par les chefs (releve reel).
 */
const GEO = { latitude: 45.963299801149596, longitude: 4.512977457671845 };

export function buildJsonLd(openingHours: OpeningSpec[]): Record<string, unknown> {
  // "1923 route de la vallée, 69620 Létra" -> rue / CP / ville
  const [rue, cpVille = ""] = COORDONNEES.adresse.split(",").map((s) => s.trim());
  const m = cpVille.match(/^(\d{5})\s+(.+)$/);
  const postalCode = m?.[1] ?? "";
  const addressLocality = m?.[2] ?? cpVille;

  return {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    name: COORDONNEES.nom,
    url: SITE_URL,
    image: `${SITE_URL}${OG_IMAGE}`,
    telephone: COORDONNEES.telephoneLien,
    email: COORDONNEES.email,
    servesCuisine: "Cuisine française artisanale",
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: rue,
      postalCode,
      addressLocality,
      addressRegion: COORDONNEES.region,
      addressCountry: "FR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: GEO.latitude,
      longitude: GEO.longitude,
    },
    hasMap: COORDONNEES.plan,
    sameAs: [COORDONNEES.instagram, COORDONNEES.facebook],
    ...(openingHours.length ? { openingHoursSpecification: openingHours } : {}),
  };
}
