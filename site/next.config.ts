import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo : deux lockfiles (racine Atelier + site). Sans ces racines
  // explicites, Turbopack remonte au repo et compile le proxy de l'Atelier.
  // Sur Vercel, le projet aleonmange-site DOIT avoir « Include source files
  // outside of the Root Directory » DECOCHE (sandbox = site/ uniquement) :
  // sinon la plateforme injecte outputFileTracingRoot a la racine du repo,
  // qui prevaut sur turbopack.root (piege du proxy rejoue), et l'aligner
  // sur site/ casse la finalisation (lstat .next hors racine). site/ est
  // autonome (son propre lockfile) : la sandbox confinee est correcte, et
  // les deux racines ci-dessous coincident alors partout (local et Vercel).
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
