import "server-only";
import { clientLecture } from "@/lib/supabase/serveur";

/**
 * Creneaux de retrait click & collect — DERIVES (jamais une constante) :
 * horaires d'ouverture (horaire_boutique, 0023) INTERSECTES [maintenant+delai,
 * maintenant+horizon], par pas, en Europe/Paris. Config lue depuis creneau_retrait
 * (0024). Reutilise cote PAGE (affichage) ET cote ROUTE (validation du creneau
 * choisi) : une seule source, pas de divergence.
 */

export type CreneauProposable = { iso: string; label: string };

const JOURS_FR = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MOIS_FR = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];
const WEEKDAY = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as const;

type Config = { pas: number; delaiMin: number; horizon: number; plageDebut: number | null; plageFin: number | null };
type JourHoraire = { plage1_debut: string | null; plage1_fin: string | null; plage2_debut: string | null; plage2_fin: string | null };

/** "HH:MM:SS" ou "HH:MM" -> minutes depuis minuit. null -> null. */
function minutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}

/** Decalage Europe/Paris ("+02:00"/"+01:00") pour un instant donne (gere l'heure d'ete). */
function offsetParis(d: Date): string {
  const nom = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const m = nom.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return "+00:00";
  return `${m[1]}${m[2].padStart(2, "0")}:${m[3] ?? "00"}`;
}

/** Composantes de la date Europe/Paris d'un instant (annee, mois, jour, jour de semaine 1-7). */
function partsParis(d: Date): { y: number; mo: number; da: number; jour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    }).formatToParts(d).map((p) => [p.type, p.value])
  );
  return { y: +parts.year, mo: +parts.month, da: +parts.day, jour: WEEKDAY[parts.weekday as keyof typeof WEEKDAY] };
}

/** Instant UTC d'une heure locale Paris (date + minutes depuis minuit). */
function instantParis(y: number, mo: number, da: number, min: number): Date {
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  const dd = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
  // Offset calcule sur un ancrage midi du jour (loin de tout bord DST).
  const ancrageMidi = new Date(`${dd}T12:00:00+00:00`);
  return new Date(`${dd}T${hh}:${mm}:00${offsetParis(ancrageMidi)}`);
}

function labelCreneau(inst: Date): string {
  const p = partsParis(inst);
  const hhmm = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })
    .format(inst)
    .replace(":", "h");
  return `${JOURS_FR[p.jour]} ${p.da} ${MOIS_FR[p.mo - 1]}, ${hhmm}`;
}

/** Liste des creneaux proposables. Vide si non configure / boutique fermee sur l'horizon. */
export async function creneauxRetraitBoutique(): Promise<CreneauProposable[]> {
  const supabase = clientLecture();
  if (!supabase) return [];

  const [cfg, hor] = await Promise.all([
    supabase.from("creneau_retrait").select("pas_minutes, delai_min_minutes, horizon_jours, plage_debut, plage_fin").eq("actif", true).order("created_at").limit(1).maybeSingle(),
    supabase.from("horaire_boutique").select("jour, plage1_debut, plage1_fin, plage2_debut, plage2_fin"),
  ]);
  if (cfg.error || !cfg.data || hor.error) return [];

  const config: Config = {
    pas: cfg.data.pas_minutes,
    delaiMin: cfg.data.delai_min_minutes,
    horizon: cfg.data.horizon_jours,
    plageDebut: minutes(cfg.data.plage_debut as string | null),
    plageFin: minutes(cfg.data.plage_fin as string | null),
  };
  const parJour = new Map<number, JourHoraire>(
    ((hor.data ?? []) as (JourHoraire & { jour: number })[]).map((r) => [r.jour, r])
  );

  const maintenant = new Date();
  const planche = new Date(maintenant.getTime() + config.delaiMin * 60_000); // borne basse = now + delai
  const out: CreneauProposable[] = [];

  for (let k = 0; k <= config.horizon; k++) {
    // Ancrage midi UTC + k jours -> jour Paris cible (jamais de saut de minuit).
    const ancre = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate(), 12) + k * 86_400_000);
    const { y, mo, da, jour } = partsParis(ancre);
    const h = parJour.get(jour);
    if (!h) continue;

    const plages: [number, number][] = [];
    for (const [d, f] of [[h.plage1_debut, h.plage1_fin], [h.plage2_debut, h.plage2_fin]] as const) {
      const md = minutes(d);
      const mf = minutes(f);
      if (md == null || mf == null) continue;
      // Intersection avec la restriction optionnelle de la config.
      const debut = config.plageDebut != null ? Math.max(md, config.plageDebut) : md;
      const fin = config.plageFin != null ? Math.min(mf, config.plageFin) : mf;
      if (fin > debut) plages.push([debut, fin]);
    }

    for (const [debut, fin] of plages) {
      for (let min = debut; min < fin; min += config.pas) {
        const inst = instantParis(y, mo, da, min);
        if (inst.getTime() >= planche.getTime()) {
          out.push({ iso: inst.toISOString(), label: labelCreneau(inst) });
        }
      }
    }
  }
  return out;
}

/**
 * Precommande truck : prochain jour de marche (jour_semaine) ENCORE commandable,
 * cutoff = la VEILLE a 23h59 Europe/Paris. due_at provisoire = debut de service
 * (defaut 11h30, l'horaire precis est libre cote emplacement). null si aucun dans
 * les 14 jours (ne devrait pas arriver). Enforce le cutoff cote serveur.
 */
export function prochainRetraitTruck(jourSemaine: number, heureDebutMin = 11 * 60 + 30): { iso: string; label: string } | null {
  if (!Number.isInteger(jourSemaine) || jourSemaine < 1 || jourSemaine > 7) return null;
  const maintenant = new Date();
  for (let k = 0; k <= 14; k++) {
    const ancre = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), maintenant.getUTCDate(), 12) + k * 86_400_000);
    const { y, mo, da, jour } = partsParis(ancre);
    if (jour !== jourSemaine) continue;
    const cutoff = new Date(instantParis(y, mo, da, 0).getTime() - 60_000); // veille 23h59
    if (maintenant.getTime() <= cutoff.getTime()) {
      const due = instantParis(y, mo, da, heureDebutMin);
      return { iso: due.toISOString(), label: `${JOURS_FR[jour]} ${da} ${MOIS_FR[mo - 1]}` };
    }
  }
  return null;
}
