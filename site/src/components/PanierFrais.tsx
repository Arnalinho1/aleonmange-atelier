"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { trackEvent } from "@/lib/analytics";

/**
 * Bloc « Panier frais du Beaujolais » (phase TEASING, d'apres la maquette CD). Il ne VEND
 * rien : il collecte une INTENTION (email + vote de preferences FACULTATIF) en double opt-in.
 * Wording verrouille : « Prevenez-moi du lancement », « ce n'est pas une reservation » ;
 * jamais « reserver » ni « commander ». Flux calque sur LettreInfo (fetch /api/panier-frais,
 * encart succes « Presque termine »). L'affichage du bloc est conditionne au flag config-source
 * cote page (parametre_site) : ici on suppose deja actif.
 */

type Choix = string | null;
type Etat = "idle" | "envoi" | "ok" | "erreur";

// Mini-vote : 3 questions, choix unique par question, FACULTATIF (l'email seul suffit).
const VOTE = [
  { cle: "taille", label: "Quelle taille ?", options: [["petit", "Petit · 2 pers."], ["grand", "Grand · 4-5 pers."]] },
  { cle: "rythme", label: "À quel rythme ?", options: [["hebdo", "Chaque semaine"], ["quinzaine", "Tous les 15 jours"]] },
  { cle: "contenu", label: "Quel contenu ?", options: [["legumes", "Légumes"], ["fruits", "Fruits"], ["mixte", "Les deux"]] },
] as const;

export function PanierFrais() {
  const [taille, setTaille] = useState<Choix>(null);
  const [rythme, setRythme] = useState<Choix>(null);
  const [contenu, setContenu] = useState<Choix>(null);
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<Etat>("idle");
  const [message, setMessage] = useState("");

  const valeurs: Record<string, Choix> = { taille, rythme, contenu };
  const setters: Record<string, (v: Choix) => void> = { taille: setTaille, rythme: setRythme, contenu: setContenu };

  useEffect(() => {
    if (etat === "ok") trackEvent("panier_frais_interet");
  }, [etat]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    try {
      const res = await fetch("/api/panier-frais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), taille, rythme, contenu }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEtat("erreur");
        setMessage(data?.error ?? "Une erreur est survenue.");
      } else {
        setEtat("ok");
        setMessage(data?.message ?? "Vérifiez votre boîte mail pour confirmer votre inscription.");
      }
    } catch {
      setEtat("erreur");
      setMessage("Impossible de contacter le serveur. Réessayez.");
    }
  }

  const pill = (active: boolean) =>
    `h-[38px] px-[15px] rounded-pille font-sans text-[13px] md:text-[13.5px] font-bold cursor-pointer transition-colors ${
      active
        ? "border border-or bg-or text-canard"
        : "border border-[rgba(243,236,221,.3)] bg-transparent text-[#e7dfc9] hover:border-[rgba(243,236,221,.55)]"
    }`;

  const badgeBientot =
    "font-mono text-[10px] font-semibold uppercase tracking-[.12em] bg-or text-canard rounded-pille px-[11px] py-[5px]";

  return (
    <div className="bg-canard rounded-[20px] md:rounded-[22px] overflow-hidden flex flex-col md:grid md:grid-cols-[1.15fr_1fr] md:items-stretch">
      {/* CONTENU — gauche en desktop, sous la photo en mobile */}
      <div className="px-5 pt-6 pb-[26px] md:px-[44px] md:py-[40px] text-[#f3ecdd]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`hidden md:inline-flex items-center ${badgeBientot}`}>Bientôt</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[.14em] text-or">Uniquement sur réservation</span>
        </div>

        <h2 className="font-display font-extrabold text-[27px] md:text-[36px] leading-[1.08] md:leading-[1.06] tracking-[-.02em] text-[#f7f1e4] mt-2.5 md:mt-4">
          Le Panier frais<br className="hidden md:inline" /> du Beaujolais
        </h2>

        <p className="text-[14px] md:text-[15px] leading-[1.65] md:leading-[1.7] text-[#cddce0] mt-2.5 md:mt-3.5 md:max-w-[460px] [text-wrap:pretty]">
          Chaque semaine, un panier de fruits et légumes de nos producteurs, préparé au labo et
          réservé à l&apos;avance : rien ne se perd, tout est de saison. Aidez-nous à le construire,
          on vous prévient au lancement.
        </p>

        {/* Mini-vote (facultatif) */}
        <div className="mt-6 flex flex-col gap-4">
          {VOTE.map((q) => (
            <div key={q.cle}>
              <div className="font-mono text-[10px] md:text-[10.5px] uppercase tracking-[.14em] text-[#7fa3ad]">
                {q.label}
              </div>
              <div className="flex flex-wrap gap-2.5 mt-2.5">
                {q.options.map(([val, lib]) => {
                  const active = valeurs[q.cle] === val;
                  return (
                    <button
                      type="button"
                      key={val}
                      aria-pressed={active}
                      onClick={() => setters[q.cle](active ? null : val)}
                      className={pill(active)}
                    >
                      {lib}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire OU encart succes (le vote reste affiche au-dessus) */}
        {etat === "ok" ? (
          <div className="mt-6 rounded-[14px] border border-[rgba(240,193,115,.4)] bg-[rgba(240,193,115,.12)] px-[18px] py-4 md:max-w-[460px]">
            <div className="font-mono text-[10px] uppercase tracking-[.12em] text-or">Presque terminé</div>
            <p className="text-[13px] md:text-[13.5px] leading-[1.6] text-[#e7dfc9] mt-1.5">{message}</p>
          </div>
        ) : (
          <form onSubmit={envoyer} className="mt-6 md:max-w-[460px]">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="email"
                required
                aria-label="Votre adresse email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@email.fr"
                className="sm:flex-1 h-[48px] rounded-pille border border-[rgba(243,236,221,.28)] bg-[rgba(243,236,221,.08)] px-[18px] font-sans text-[14.5px] text-[#f7f1e4] placeholder:text-[#a9a088] outline-none focus:border-or"
              />
              <button
                type="submit"
                disabled={etat === "envoi"}
                className="h-[48px] px-[22px] rounded-pille bg-[var(--accent)] text-white font-display font-bold text-[14.5px] whitespace-nowrap transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {etat === "envoi" ? "Envoi..." : "Prévenez-moi du lancement"}
              </button>
            </div>
            {etat === "erreur" && <p className="text-[13px] text-[var(--accent)] mt-2">{message}</p>}
            <p className="text-[11.5px] text-[#7fa3ad] mt-2.5">
              Double confirmation par email · votre avis compte, ce n&apos;est pas une réservation.
            </p>
          </form>
        )}
      </div>

      {/* PHOTO — droite en desktop (pleine hauteur), en tete en mobile (16/9) */}
      <div className="relative order-first md:order-none aspect-[16/9] md:aspect-auto md:h-full">
        <Image
          src="/images/panier-frais.webp"
          alt="Panier en osier de fruits et légumes de saison sur le comptoir de la boutique"
          fill
          sizes="(max-width: 768px) 100vw, 45vw"
          className="object-cover"
        />
        {/* Badge « Bientot » : sur la photo en mobile (le badge du contenu est masque en mobile) */}
        <span className={`md:hidden absolute top-[14px] left-[14px] ${badgeBientot}`}>Bientôt</span>
        {/* Badge flottant « Producteurs / 100% Beaujolais » : desktop uniquement */}
        <div className="hidden md:block absolute left-5 bottom-5 bg-surface rounded-[14px] px-4 py-[11px] shadow-[0_18px_36px_-18px_rgba(14,57,71,.6)]">
          <div className="font-mono text-[9.5px] uppercase tracking-[.14em] text-terracotta">Producteurs</div>
          <div className="font-display font-extrabold text-[16px] text-canard mt-0.5">100% Beaujolais</div>
        </div>
      </div>
    </div>
  );
}
