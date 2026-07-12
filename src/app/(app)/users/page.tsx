import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";
import { SCREEN_META, ROLE_LABEL } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profil, RoleEquipe } from "@/lib/supabase/database.types";
import { UserPlus, Check, Minus } from "lucide-react";

export const metadata = { title: "Utilisateurs & rôles — Atelier ALM" };

/**
 * Utilisateurs & rôles (MOCKUP §3.17). Liste réelle depuis `profil` — jamais
 * 0 utilisateur (le 1er inscrit devient owner via trigger handle_new_user).
 *
 * POINT OUVERT #3 (non tranché ici) : le modèle fin de permissions par écran.
 * La matrice affichée est le bootstrap owner/chef/équipe, marquée comme telle.
 * L'invitation par e-mail et l'édition de rôle exigent soit l'API admin
 * (service_role), soit une politique RLS dédiée (aujourd'hui : chacun ne peut
 * modifier que son propre profil) — bouton présent mais inactif, assumé.
 */
export default async function UsersPage() {
  const m = SCREEN_META.users;
  let profils: Profil[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profil")
      .select("*")
      .order("created_at", { ascending: true });
    profils = data ?? [];
  }

  const actifs = profils.filter((p) => p.actif);
  const parRole = (r: RoleEquipe) => actifs.filter((p) => p.role === r).length;

  return (
    <>
      <ScreenHeader
        rubrique={m.rubrique}
        titre={m.titre}
        desc={m.desc}
        action={
          <button
            disabled
            title="Nécessite le modèle de rôles/permissions (point ouvert) — voir la note ci-dessous"
            className="flex items-center gap-2 font-display"
            style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 100, opacity: 0.45, cursor: "not-allowed" }}
          >
            <UserPlus size={16} strokeWidth={2.4} />
            Inviter un utilisateur
          </button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Membres actifs" value={String(actifs.length)} />
        <KpiCard label="Chefs" value={String(parRole("chef") + parRole("owner"))} sub="dont propriétaire" />
        <KpiCard label="Équipe" value={String(parRole("equipe"))} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Membres de l'équipe" compteur={`${actifs.length} membre${actifs.length > 1 ? "s" : ""}`} />
          <div>
            {profils.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3"
                style={{ padding: "13px 16px", borderBottom: "1px solid #efe7d6", opacity: p.actif ? 1 : 0.55 }}
              >
                <span
                  className="grid place-items-center rounded-full font-display"
                  style={{ width: 40, height: 40, background: "#e4dac6", color: "#1493be", fontWeight: 800, fontSize: 16, flexShrink: 0 }}
                >
                  {p.nom.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2">
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: "#0e3947" }}>{p.nom}</p>
                    {!p.actif && <Badge tone="neutre">Désactivé</Badge>}
                  </div>
                  <p className="font-mono" style={{ fontSize: 11, color: "#9a927f", marginTop: 1 }}>
                    arrivé le {formatDate(p.created_at)}
                  </p>
                </div>
                <Badge tone={p.role === "owner" ? "succes" : p.role === "chef" ? "info" : "neutre"}>
                  {ROLE_LABEL[p.role]}
                </Badge>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: "#6b7469", padding: "12px 16px" }}>
            Un nouveau membre crée son compte depuis l&apos;écran de connexion (« Créer un compte ») et
            rejoint automatiquement comme Équipe. L&apos;invitation par e-mail et l&apos;édition des rôles
            arrivent avec le modèle de permissions — <strong>point ouvert, à trancher</strong>.
          </p>
        </Card>

        <div className="flex flex-col gap-4">
          <Card style={{ overflow: "hidden" }}>
            <SectionHeader titre="Accès par rôle" sous="Bootstrap — le modèle fin par écran reste à préciser." />
            <div style={{ padding: "12px 16px" }}>
              <div
                className="font-mono uppercase"
                style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(3,42px)", gap: 4, fontSize: 9.5, letterSpacing: ".07em", color: "#a79b84", paddingBottom: 7, borderBottom: "1px solid #efe7d6" }}
              >
                <span>Fonctionnalité</span>
                <span style={{ textAlign: "center" }}>Ownr</span>
                <span style={{ textAlign: "center" }}>Chef</span>
                <span style={{ textAlign: "center" }}>Équi.</span>
              </div>
              {MATRICE.map((ligne) => (
                <div
                  key={ligne.label}
                  style={{ display: "grid", gridTemplateColumns: "1.5fr repeat(3,42px)", gap: 4, alignItems: "center", padding: "7px 0", borderBottom: "1px solid #efe7d6" }}
                >
                  <span style={{ fontSize: 12.5, color: "#0e3947", fontWeight: 600 }}>{ligne.label}</span>
                  {ligne.acces.map((ok, i) => (
                    <span key={i} style={{ textAlign: "center", color: ok ? "#1f8a5b" : "#d8cdb6" }}>
                      {ok ? <Check size={14} strokeWidth={2.6} style={{ display: "inline" }} /> : <Minus size={14} style={{ display: "inline" }} />}
                    </span>
                  ))}
                </div>
              ))}
              <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
                <Badge tone="demo">Bootstrap</Badge>
                <span style={{ fontSize: 11.5, color: "#9a927f" }}>Indicatif — non appliqué par la base (point ouvert #3).</span>
              </div>
            </div>
          </Card>

          <Card style={{ padding: 16, opacity: 0.6 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>
                Journal d&apos;audit
              </p>
              <Badge tone="neutre">Bientôt · V2</Badge>
            </div>
            <p style={{ fontSize: 12.5, color: "#6b7469" }}>
              Qui a fait quoi, quand — arrive avec le modèle de rôles.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Matrice indicative bootstrap : [owner, chef, equipe]. */
const MATRICE: { label: string; acces: [boolean, boolean, boolean] }[] = [
  { label: "Saisie de vente", acces: [true, true, true] },
  { label: "Commandes & production", acces: [true, true, true] },
  { label: "Catalogue & recettes", acces: [true, true, false] },
  { label: "Stocks & HACCP", acces: [true, true, true] },
  { label: "Pilotage (finances, insights)", acces: [true, true, false] },
  { label: "Réglages & utilisateurs", acces: [true, false, false] },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}
