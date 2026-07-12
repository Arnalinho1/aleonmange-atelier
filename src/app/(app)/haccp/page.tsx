import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SCREEN_META } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profil, ReleveHaccp } from "@/lib/supabase/database.types";
import { HaccpBoard, type Releve } from "./HaccpBoard";

export const metadata = { title: "HACCP & traçabilité — Atelier ALM" };

/**
 * HACCP — registre réglementaire : relevés horodatés saisis par l'équipe
 * (température, nettoyage, contrôle), conformité tracée avec action
 * corrective. Le planning des contrôles « dus » reste à cadrer.
 */
export default async function HaccpPage() {
  const m = SCREEN_META.haccp;
  let releves: Releve[] = [];
  const fmtJour = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
  const aujourdhui = fmtJour.format(new Date());

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 30 * 86400000).toISOString();
    const [r, p] = await Promise.all([
      supabase.from("releve_haccp").select("*").gte("occurred_at", depuis).order("occurred_at", { ascending: false }),
      supabase.from("profil").select("id, nom"),
    ]);
    const profils = new Map(((p.data ?? []) as Pick<Profil, "id" | "nom">[]).map((x) => [x.id, x.nom]));
    const fmtHeure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

    releves = ((r.data ?? []) as ReleveHaccp[]).map((x) => ({
      id: x.id,
      type: x.type,
      cible: x.cible,
      valeur: x.valeur,
      conforme: x.conforme,
      note: x.note,
      occurred_at: x.occurred_at,
      jour: fmtJour.format(new Date(x.occurred_at)),
      heure: fmtHeure.format(new Date(x.occurred_at)),
      operateur_nom: x.operateur_id ? profils.get(x.operateur_id) ?? null : null,
    }));
  }

  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <HaccpBoard releves={releves} aujourdhui={aujourdhui} />
    </>
  );
}
