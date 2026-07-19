"use client";

import { useMemo, useState } from "react";
import { Carte, SurTitre, BadgeMono, Stepper } from "@/components/ui";
import { Champ, ChampSelect, BoutonSubmit } from "@/components/forms";
import type { FamilleCarte } from "@/lib/data/carte";
import type { CreneauProposable } from "@/lib/data/creneaux";

/** Prix affiche (INDICATIF) — le montant reel est recalcule en base. */
function fmtEuro(n: number): string {
  return n.toFixed(2).replace(".", ",") + " EUR";
}

const POIDS_OPTIONS = [250, 500, 1000]; // g, pour les articles au poids

type EmplacementChoix = { code: string; nom: string; jour: string; dateLabel?: string | null };

export function PanierPrecommande({
  canal,
  familles,
  creneaux = [],
  emplacements = [],
  emplacementInitial = "",
}: {
  canal: "boutique" | "truck";
  familles: FamilleCarte[];
  creneaux?: CreneauProposable[];
  emplacements?: EmplacementChoix[];
  emplacementInitial?: string;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [poids, setPoids] = useState<Record<string, number>>({});
  const [creneau, setCreneau] = useState("");
  const [emplacement, setEmplacement] = useState(emplacementInitial);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [enAttente, setEnAttente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ reference: string; retrait: string } | null>(null);

  const articles = useMemo(() => familles.flatMap((f) => f.articles), [familles]);

  const lignes = useMemo(() => {
    const out: { id: string; nom: string; montant: number; detail: string; qte?: number; poids_g?: number }[] = [];
    for (const a of articles) {
      if (a.auPoids) {
        const g = poids[a.id] ?? 0;
        if (g > 0 && a.prix != null) out.push({ id: a.id, nom: a.nom, poids_g: g, montant: Math.round((a.prix * g) / 1000 * 100) / 100, detail: `${g} g` });
      } else {
        const q = qty[a.id] ?? 0;
        if (q > 0 && a.prix != null) out.push({ id: a.id, nom: a.nom, qte: q, montant: Math.round(a.prix * q * 100) / 100, detail: `x${q}` });
      }
    }
    return out;
  }, [articles, qty, poids]);

  const total = useMemo(() => lignes.reduce((s, l) => s + l.montant, 0), [lignes]);
  const panierVide = lignes.length === 0;
  const contactOk = nom.trim().length > 0 && /.+@.+\..+/.test(email);
  const retraitOk = canal === "boutique" ? creneau.length > 0 : emplacement.length > 0;
  const peutEnvoyer = !panierVide && contactOk && retraitOk && !enAttente;
  const emplacementChoisi = useMemo(() => emplacements.find((e) => e.code === emplacement), [emplacements, emplacement]);

  async function envoyer() {
    setErreur(null);
    setEnAttente(true);
    try {
      const payload = {
        canal,
        ...(canal === "boutique" ? { creneau } : { emplacement_code: emplacement }),
        client: { nom: nom.trim(), email: email.trim(), telephone: telephone.trim() || undefined },
        lignes: lignes.map((l) => (l.poids_g != null ? { produit_id: l.id, poids_g: l.poids_g } : { produit_id: l.id, qte: l.qte })),
      };
      const res = await fetch("/api/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data?.error ?? "Une erreur est survenue. Reessayez.");
      } else {
        setResultat({ reference: data.reference, retrait: data.retrait });
      }
    } catch {
      setErreur("Impossible de contacter le serveur. Reessayez.");
    } finally {
      setEnAttente(false);
    }
  }

  if (resultat) {
    return (
      <Carte className="p-8 text-center max-w-[560px] mx-auto">
        <BadgeMono ton="vert">En attente de confirmation par l&apos;atelier</BadgeMono>
        <h2 className="font-display font-extrabold text-[24px] text-canard mt-4">Demande bien recue</h2>
        <p className="text-[14.5px] text-texte-2 mt-3 leading-relaxed">
          Votre demande de precommande est enregistree. L&apos;atelier la confirme et vous recevez un email.
          Le montant est a regler au retrait.
        </p>
        <p className="text-[13.5px] text-texte-2 mt-3">Retrait souhaite : <strong>{resultat.retrait}</strong></p>
        <p className="font-mono text-[12px] text-texte-3 mt-2">Reference : {resultat.reference}</p>
      </Carte>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
      {/* Carte / selection des produits */}
      <div className="grid gap-6">
        {familles.length === 0 ? (
          <Carte className="p-8 text-center">
            <p className="font-display font-bold text-[16px] text-canard">La carte arrive</p>
            <p className="text-[13.5px] text-texte-2 mt-2">Les produits a precommander s&apos;afficheront ici.</p>
          </Carte>
        ) : (
          familles.map((f) => (
            <Carte key={f.nom} className="p-5 md:p-6">
              <p className="font-display font-bold text-[16px] text-canard border-b-[1.5px] border-bord-2 pb-2">{f.nom}</p>
              {f.note && <p className="mt-1.5 text-[12px] text-texte-3">{f.note}</p>}
              <ul className="mt-3 divide-y divide-bord">
                {f.articles.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <span className="text-[14px] text-canard">{a.nom}</span>
                      {a.description && <span className="block text-[12px] leading-snug text-texte-3">{a.description}</span>}
                      <span className="block font-display font-bold text-[13px] text-[var(--accent)] mt-0.5">
                        {a.prix != null ? (a.auPoids ? `${fmtEuro(a.prix)}/kg` : fmtEuro(a.prix)) : ""}
                      </span>
                    </div>
                    {a.auPoids ? (
                      <select
                        aria-label={`Poids pour ${a.nom}`}
                        value={poids[a.id] ?? 0}
                        onChange={(e) => setPoids((p) => ({ ...p, [a.id]: Number(e.target.value) }))}
                        className="rounded-carte border border-bord-2 bg-surface px-2.5 py-1.5 text-[13px] text-canard outline-none shrink-0"
                      >
                        <option value={0}>-</option>
                        {POIDS_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g < 1000 ? `${g} g` : `${g / 1000} kg`}</option>
                        ))}
                      </select>
                    ) : (
                      <Stepper
                        quantite={qty[a.id] ?? 0}
                        onMoins={() => setQty((q) => ({ ...q, [a.id]: Math.max(0, (q[a.id] ?? 0) - 1) }))}
                        onPlus={() => setQty((q) => ({ ...q, [a.id]: (q[a.id] ?? 0) + 1 }))}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Carte>
          ))
        )}
      </div>

      {/* Recap + retrait + coordonnees */}
      <Carte className="p-5 md:p-6 lg:sticky lg:top-24">
        <SurTitre>Votre precommande</SurTitre>
        {panierVide ? (
          <p className="text-[13.5px] text-texte-2 mt-3">Ajoutez des produits pour composer votre precommande.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {lignes.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="text-canard">{l.nom} <span className="text-texte-3">{l.detail}</span></span>
                <span className="font-mono text-texte-2 whitespace-nowrap">{fmtEuro(l.montant)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-bord-2 mt-3 pt-3">
          <span className="font-display font-bold text-[14px] text-canard">Total indicatif</span>
          <span className="font-display font-extrabold text-[15px] text-canard">{fmtEuro(total)}</span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[.1em] text-muet mt-1">A regler au retrait</p>

        <div className="mt-5 grid gap-3">
          {canal === "boutique" ? (
            <ChampSelect label="Creneau de retrait" value={creneau} onChange={(e) => setCreneau(e.target.value)}>
              <option value="">Choisir un creneau</option>
              {creneaux.map((c) => (
                <option key={c.iso} value={c.iso}>{c.label}</option>
              ))}
            </ChampSelect>
          ) : (
            <ChampSelect label="Emplacement du marche" value={emplacement} onChange={(e) => setEmplacement(e.target.value)}>
              <option value="">Choisir un emplacement</option>
              {emplacements.map((e) => (
                <option key={e.code} value={e.code}>{e.nom} ({e.dateLabel ?? e.jour})</option>
              ))}
            </ChampSelect>
          )}
          {canal === "truck" && emplacementChoisi?.dateLabel && (
            <p className="text-[12.5px] text-texte-2">Retrait le <strong className="text-canard">{emplacementChoisi.dateLabel}</strong>, a regler sur place.</p>
          )}
          {canal === "boutique" && creneaux.length === 0 && (
            <p className="text-[12px] text-texte-3">Aucun creneau disponible pour le moment.</p>
          )}
          <Champ label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Votre nom" autoComplete="name" />
          <Champ label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.fr" autoComplete="email" />
          <Champ label="Telephone (optionnel)" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="06 ..." autoComplete="tel" />
        </div>

        {erreur && <p className="text-[13px] text-[var(--accent)] mt-3">{erreur}</p>}

        <form action={envoyer} className="mt-4">
          <BoutonSubmit enAttente={enAttente} disabled={!peutEnvoyer} className="w-full">
            Envoyer ma demande
          </BoutonSubmit>
        </form>
        <p className="text-[11.5px] text-texte-3 mt-2 text-center">
          Aucun paiement en ligne. Votre demande est confirmee par l&apos;atelier.
        </p>
      </Carte>
    </div>
  );
}
