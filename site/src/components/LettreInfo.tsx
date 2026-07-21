"use client";

import { useEffect, useState } from "react";

/**
 * Modale « lettre d'information » (d-lettre). Vague 2 : inscription en DOUBLE
 * opt-in — l'email n'est actif qu'apres clic sur le lien de confirmation recu
 * par mail (consentement RGPD date au clic). S'ouvre via l'evenement global
 * "alm:lettre" (en-tete + pied de page).
 */
export function LettreInfo() {
  const [ouverte, setOuverte] = useState(false);
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"idle" | "envoi" | "ok" | "erreur">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const ouvrir = () => {
      setEtat("idle");
      setMessage("");
      setEmail("");
      setOuverte(true);
    };
    window.addEventListener("alm:lettre", ouvrir);
    return () => window.removeEventListener("alm:lettre", ouvrir);
  }, []);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEtat("erreur");
        setMessage(data?.error ?? "Une erreur est survenue.");
      } else {
        setEtat("ok");
        setMessage(data?.message ?? "Verifiez votre boite mail pour confirmer votre inscription.");
      }
    } catch {
      setEtat("erreur");
      setMessage("Impossible de contacter le serveur. Reessayez.");
    }
  }

  if (!ouverte) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center p-4 bg-canard/55"
      onClick={() => setOuverte(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Lettre d'information"
    >
      <div className="w-full max-w-[440px] bg-surface rounded-carte-lg border border-bord p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
        <p className="font-mono text-[11px] uppercase tracking-[.14em] text-terracotta">Lettre d&apos;information</p>
        <h2 className="font-display font-extrabold text-[24px] text-canard leading-tight mt-2">Les nouvelles de la maison</h2>
        <p className="text-[14px] leading-relaxed text-texte-2 mt-3">
          Les plats de la semaine, les emplacements du food truck et les nouveautes de la boutique,
          directement dans votre boite mail.
        </p>

        {etat === "ok" ? (
          <div className="mt-5 rounded-carte border border-bord-2 bg-surface-2 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[.12em] text-vert bg-vert-fond inline-block px-2.5 py-1 rounded-pille">
              Presque termine
            </p>
            <p className="text-[13.5px] leading-relaxed text-texte-2 mt-2.5">{message}</p>
          </div>
        ) : (
          <form onSubmit={envoyer} className="mt-5 flex flex-col gap-2.5">
            <input
              type="email"
              aria-label="Votre adresse email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.fr"
              autoComplete="email"
              className="w-full rounded-carte border border-bord-2 bg-surface px-3.5 py-2.5 text-[14.5px] text-canard outline-none focus:border-[var(--accent)]"
            />
            {etat === "erreur" && <p className="text-[13px] text-[var(--accent)]">{message}</p>}
            <button
              type="submit"
              disabled={etat === "envoi"}
              className="w-full inline-flex items-center justify-center h-[46px] rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[14px] disabled:opacity-50"
            >
              {etat === "envoi" ? "Envoi..." : "S'inscrire"}
            </button>
            <p className="text-[11.5px] text-texte-3 text-center">
              Double confirmation : vous recevrez un email pour valider votre inscription.
            </p>
          </form>
        )}

        <button
          type="button"
          onClick={() => setOuverte(false)}
          className="mt-5 w-full inline-flex items-center justify-center h-[46px] rounded-pille border border-bord-2 bg-surface text-canard font-display font-bold text-[14px]"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
