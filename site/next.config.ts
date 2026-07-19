import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo : deux lockfiles (racine Atelier + site). Sans cette racine
  // explicite, Turbopack remonte au repo et compile le proxy de l'Atelier.
  // Sur Vercel, outputFileTracingRoot est injecte a la racine du repo et
  // PREVAUT sur turbopack.root (meme piege, rejoue au build distant) : les
  // deux racines doivent etre alignees ici. site/ est autonome (son propre
  // lockfile), le tracing confine a ce dossier est correct.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
