import type { ReactNode } from "react";

/**
 * Composants de base du design system site (handoff §02) :
 * carte, bouton pilule, badge mono, stepper, placeholder photo.
 */

export function BoutonPille({
  children,
  variante = "accent",
  href,
  className = "",
  ...props
}: {
  children: ReactNode;
  variante?: "accent" | "contour" | "canard";
  href?: string;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const styles: Record<string, string> = {
    accent: "bg-[var(--accent)] text-white",
    contour: "border border-bord-2 bg-surface text-canard",
    canard: "bg-canard text-surface-2",
  };
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 h-[46px] px-6 rounded-pille font-display font-bold text-[14.5px] transition-opacity hover:opacity-90 ${styles[variante]} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

export function BadgeMono({
  children,
  ton = "creme",
}: {
  children: ReactNode;
  ton?: "creme" | "vert" | "accent" | "canard";
}) {
  const styles: Record<string, string> = {
    creme: "bg-surface-2 text-texte-3 border border-bord-2",
    vert: "bg-vert-fond text-vert",
    accent: "bg-[var(--accent)] text-white",
    canard: "bg-canard text-or",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[.1em] px-[11px] py-[5px] rounded-pille ${styles[ton]}`}
    >
      {children}
    </span>
  );
}

export function Carte({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-bord rounded-carte-lg ${className}`}>
      {children}
    </div>
  );
}

/** Sur-titre mono terracotta en capitales espacees (motif recurrent). */
export function SurTitre({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[.14em] text-terracotta">
      {children}
    </p>
  );
}

/**
 * Placeholder photo NEUTRE et identifie — en attendant les vraies photos
 * (jamais de photo IA, jamais de visuel Foodizy, aucun asset de la maquette).
 */
export function PhotoAvenir({
  ratio = "4/3",
  libelle = "Photo à venir",
  className = "",
}: {
  ratio?: string;
  libelle?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-voile ${className}`}
      style={{
        aspectRatio: ratio,
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent, transparent 14px, rgba(14,57,71,.04) 14px, rgba(14,57,71,.04) 15px)",
      }}
      role="img"
      aria-label={libelle}
    >
      <span className="absolute inset-0 grid place-items-center">
        <span className="font-mono text-[10px] uppercase tracking-[.14em] text-texte-2/70 border border-bord-4 rounded-pille px-3 py-1.5 bg-surface/70">
          {libelle}
        </span>
      </span>
    </div>
  );
}

/**
 * Stepper quantite (+/−) du design system — pret pour les paniers de la
 * Vague 2 (click & collect, precommande truck). Purement presentational.
 */
export function Stepper({
  quantite,
  onMoins,
  onPlus,
}: {
  quantite: number;
  onMoins: () => void;
  onPlus: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <button
        type="button"
        onClick={onMoins}
        aria-label="Retirer un"
        className="w-8 h-8 rounded-full border-[1.5px] border-bord-4 bg-surface text-canard text-[19px] leading-none grid place-items-center"
      >
        −
      </button>
      <span
        className={`min-w-[18px] text-center font-display font-extrabold text-[16px] ${quantite > 0 ? "text-[var(--accent)]" : "text-bord-4"}`}
      >
        {quantite}
      </span>
      <button
        type="button"
        onClick={onPlus}
        aria-label="Ajouter un"
        className="w-8 h-8 rounded-full bg-[var(--accent)] text-white text-[19px] leading-none grid place-items-center"
      >
        +
      </button>
    </span>
  );
}
