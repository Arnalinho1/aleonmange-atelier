import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Crawlers : tout autorise sauf l'espace client prive. Reference le sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/compte" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
