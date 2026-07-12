import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SCREEN_META } from "@/lib/nav";

export const metadata = { title: "Utilisateurs & rôles — Atelier ALM" };

/**
 * Utilisateurs & rôles. Non-démo dès le départ : au minimum le compte
 * propriétaire (jamais 0 utilisateur). Le 1er inscrit via Supabase Auth devient
 * 'owner' (trigger handle_new_user). Modèle fin de permissions = POINT OUVERT #3.
 * La liste réelle sera lue depuis `profil` une fois la base branchée.
 */
export default function UsersPage() {
  const m = SCREEN_META.users;
  return (
    <>
      <ScreenHeader rubrique={m.rubrique} titre={m.titre} desc={m.desc} />
      <Card style={{ padding: 20 }}>
        <div className="flex items-center gap-3">
          <span className="grid place-items-center rounded-full font-display" style={{ width: 40, height: 40, background: "#e4dac6", color: "#1493be", fontWeight: 800 }}>
            A
          </span>
          <div style={{ flex: 1 }}>
            <p className="font-display" style={{ fontWeight: 700, fontSize: 15, color: "#0e3947" }}>
              Compte propriétaire
            </p>
            <p className="font-mono" style={{ fontSize: 12, color: "#9a927f" }}>
              créé à la première connexion Supabase
            </p>
          </div>
          <Badge tone="succes">Owner</Badge>
        </div>
        <p style={{ fontSize: 13, color: "#6b7469", marginTop: 14 }}>
          Les membres de l&apos;équipe et leurs rôles apparaîtront ici. Le modèle de permissions par écran
          reste à préciser (point ouvert).
        </p>
      </Card>
    </>
  );
}
