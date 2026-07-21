import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap des pages PUBLIQUES indexables. Exclut /compte/** (prive), les tunnels
 * transactionnels (commander / precommander / devis, newsletter/confirmer) et
 * mentions-legales (noindex). URLs absolues (non composees depuis metadataBase).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/boutique`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/food-truck`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/traiteur`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/histoire`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];
}
