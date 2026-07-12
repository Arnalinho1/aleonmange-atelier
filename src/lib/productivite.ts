import type { Canal } from "@/lib/supabase/database.types";

/**
 * Productivité élargie — agrégats PURS de la charge de production du vendu
 * (rythme, coût matière consommé, temps estimé). Consommés par l'écran
 * Productivité (et le futur design CD) ; les primitives par ligne (coût,
 * temps) vivent dans lib/calculs.ts — une fonction, deux lecteurs avec
 * Finances, jamais de recalcul parallèle.
 *
 * GARDE IMPORT : les ventes importées portent une heure FICTIVE (jour
 * d'exploitation à 12:00 — wizard Import caisse). Tout calcul HORAIRE les
 * exclut et remonte le nombre d'exclues pour affichage.
 */

export type VenteProduction = {
  id: string;
  canal: Canal;
  occurred_at: string;
  /** Libellé d'emplacement résolu côté serveur (truck), null sinon. */
  emplacement: string | null;
  source_vente: string;
};

export type LigneProduction = {
  vente_id: string;
  canal: Canal;
  montant: number;
  /** Coût matière (calculs.ts coutMatiereLigneVente) — null = non couvert. */
  cout: number | null;
  /** Minutes estimées (calculs.ts tempsProductionLigne) — 0 = revendu, null = temps non défini. */
  temps: number | null;
};

const heureParis = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" });
const jourParis = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
const heureMinuteParis = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export type Rythme = {
  /** Ventes par heure de la journée (Europe/Paris), heures actives uniquement, triées. */
  histogramme: { heure: number; ventes: number }[];
  pic: { heure: number; ventes: number } | null;
  /** Débit moyen = ventes ÷ heures ACTIVES (créneaux jour×heure ayant ≥ 1 vente). */
  debitParHeureActive: number | null;
  /** Ventes importées EXCLUES des calculs horaires (heure fictive 12:00). */
  exclusImport: number;
};

export function rythmeVentes(ventes: VenteProduction[]): Rythme {
  const manuelles = ventes.filter((v) => v.source_vente !== "import");
  const exclusImport = ventes.length - manuelles.length;

  const parHeure = new Map<number, number>();
  const creneauxActifs = new Set<string>();
  for (const v of manuelles) {
    const d = new Date(v.occurred_at);
    const h = Number(heureParis.format(d)) % 24;
    parHeure.set(h, (parHeure.get(h) ?? 0) + 1);
    creneauxActifs.add(`${jourParis.format(d)}·${h}`);
  }
  const histogramme = [...parHeure.entries()]
    .map(([heure, nb]) => ({ heure, ventes: nb }))
    .sort((a, b) => a.heure - b.heure);
  const pic = histogramme.reduce<Rythme["pic"]>(
    (max, x) => (max == null || x.ventes > max.ventes ? x : max),
    null
  );
  return {
    histogramme,
    pic,
    debitParHeureActive: creneauxActifs.size > 0 ? manuelles.length / creneauxActifs.size : null,
    exclusImport,
  };
}

export type ServiceTruck = {
  emplacement: string;
  /** Jour Europe/Paris (YYYY-MM-DD) — un service truck = (emplacement × date). */
  date: string;
  ventes: number;
  /** Amplitude OBSERVÉE (première → dernière vente) — pas les horaires d'ouverture. */
  debut: string;
  fin: string;
};

/** Services truck = (emplacement × date), ventes manuelles uniquement, plus récents d'abord. */
export function servicesTruck(ventes: VenteProduction[]): ServiceTruck[] {
  const groupes = new Map<string, ServiceTruck>();
  for (const v of ventes) {
    if (v.canal !== "truck" || v.source_vente === "import") continue;
    const date = jourParis.format(new Date(v.occurred_at));
    const emplacement = v.emplacement ?? "Sans emplacement";
    const cle = `${date}·${emplacement}`;
    const cur = groupes.get(cle);
    if (!cur) {
      groupes.set(cle, { emplacement, date, ventes: 1, debut: v.occurred_at, fin: v.occurred_at });
    } else {
      cur.ventes += 1;
      if (v.occurred_at < cur.debut) cur.debut = v.occurred_at;
      if (v.occurred_at > cur.fin) cur.fin = v.occurred_at;
    }
  }
  return [...groupes.values()].sort((a, b) => b.date.localeCompare(a.date) || a.emplacement.localeCompare(b.emplacement));
}

/** Ventes par jour (Europe/Paris), manuelles uniquement, plus récents d'abord. */
export function ventesParJour(ventes: VenteProduction[]): { jour: string; ventes: number }[] {
  const parJour = new Map<string, number>();
  for (const v of ventes) {
    if (v.source_vente === "import") continue;
    const jour = jourParis.format(new Date(v.occurred_at));
    parJour.set(jour, (parJour.get(jour) ?? 0) + 1);
  }
  return [...parJour.entries()]
    .map(([jour, nb]) => ({ jour, ventes: nb }))
    .sort((a, b) => b.jour.localeCompare(a.jour));
}

export type ChargeProduction = {
  ca: number;
  /** Coût matière consommé (lignes couvertes uniquement). */
  cout: number;
  /** Part du CA dont le coût est CONNU (0-1) — affichée même à 100 %. */
  couverture: number;
  lignesSansCout: number;
  /** Temps de production estimé total (minutes) — lignes au temps connu. */
  minutes: number;
  lignesSansTemps: number;
};

/** Agrégat coût consommé + temps estimé + couverture, en une passe. */
export function chargeProduction(lignes: LigneProduction[]): ChargeProduction {
  let ca = 0;
  let caCouvert = 0;
  let cout = 0;
  let lignesSansCout = 0;
  let minutes = 0;
  let lignesSansTemps = 0;
  for (const l of lignes) {
    ca += l.montant;
    if (l.cout != null) {
      cout += l.cout;
      caCouvert += l.montant;
    } else {
      lignesSansCout += 1;
    }
    if (l.temps != null) minutes += l.temps;
    else lignesSansTemps += 1;
  }
  return {
    ca,
    cout,
    couverture: ca > 0 ? caCouvert / ca : 1,
    lignesSansCout,
    minutes,
    lignesSansTemps,
  };
}

/** Amplitude observée d'un service : « 11:05 → 13:55 ». */
export function fmtAmplitude(debut: string, fin: string): string {
  return `${heureMinuteParis.format(new Date(debut))} → ${heureMinuteParis.format(new Date(fin))}`;
}
