import type { ReactNode } from "react";

/**
 * Primitives de formulaire du site (aucune n'existait : BoutonPille est un <a>).
 * Style aligne sur le design system (creme/canard/accent, rounded, font-display).
 */

const champStyle =
  "w-full rounded-carte border border-bord-2 bg-surface px-3.5 py-2.5 text-[14.5px] text-canard outline-none focus:border-[var(--accent)] transition-colors";

export function Label({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10.5px] uppercase tracking-[.12em] text-texte-3">{children}</span>;
}

export function Champ({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <input className={champStyle} {...props} />
      {hint && <span className="text-[12px] text-texte-3">{hint}</span>}
    </label>
  );
}

export function ChampZone({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <textarea className={`${champStyle} resize-y min-h-[96px]`} {...props} />
    </label>
  );
}

export function ChampSelect({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <select className={champStyle} {...props}>
        {children}
      </select>
    </label>
  );
}

/** Bouton de soumission (le vrai <button type="submit"> qui manquait). */
export function BoutonSubmit({
  children,
  enAttente,
  ...props
}: { children: ReactNode; enAttente?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      disabled={enAttente || props.disabled}
      className="inline-flex items-center justify-center h-[48px] px-7 rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-50"
      {...props}
    >
      {enAttente ? "Envoi..." : children}
    </button>
  );
}
