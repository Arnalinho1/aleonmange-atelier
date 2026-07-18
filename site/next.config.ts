import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo : deux lockfiles (racine Atelier + site). Sans cette racine
  // explicite, Turbopack remonte au repo et compile le proxy de l'Atelier.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
