"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Bell, Info, OctagonAlert } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import type { Notification, NotificationPreference } from "@/lib/supabase/database.types";
import { marquerLue, toutMarquerLu, togglePreference } from "./actions";

const CATEGORIES = ["stock", "dlc", "seuil", "traiteur"] as const;
const CATEGORIE_NOTIF_LABEL: Record<string, string> = {
  stock: "Stock",
  dlc: "DLC",
  seuil: "Seuils",
  traiteur: "Traiteur",
};
const SEVERITE_META: Record<string, { tone: "critique" | "alerte" | "info"; icone: React.ReactNode }> = {
  critique: { tone: "critique", icone: <OctagonAlert size={16} style={{ color: "#c0442e" }} /> },
  alerte: { tone: "alerte", icone: <AlertTriangle size={16} style={{ color: "#a9761e" }} /> },
  info: { tone: "info", icone: <Info size={16} style={{ color: "#1493be" }} /> },
};

/**
 * Notifications — centre d'alertes (lu/tout lire persistés, badge de nav
 * synchronisé) + préférences par catégorie (in-app / e-mail, par profil).
 * Les RÈGLES de génération (seuils stock, DLC…) = POINT OUVERT #2 : rien
 * n'écrit encore dans `notification`, structure et états posés.
 */
export function NotifsBoard({
  notifications,
  preferences,
}: {
  notifications: (Notification & { heure: string })[];
  preferences: NotificationPreference[];
}) {
  const router = useRouter();
  const [onglet, setOnglet] = useState<"centre" | "prefs">("centre");
  const [chip, setChip] = useState<string>("toutes");
  const [error, setError] = useState<string | undefined>();
  // pending MANUEL (pas useTransition) : le refresh routeur resterait dans la
  // transition et laisserait les boutons désactivés le temps du re-render dev.
  const [pending, setPending] = useState(false);

  const nonLues = notifications.filter((n) => !n.lu);
  const filtrees = useMemo(
    () => notifications.filter((n) => chip === "toutes" || n.categorie === chip),
    [notifications, chip]
  );
  const prefParCategorie = useMemo(
    () => new Map(preferences.map((p) => [p.categorie, p])),
    [preferences]
  );

  async function agir(fn: () => Promise<{ error?: string } | undefined>) {
    setError(undefined);
    setPending(true);
    try {
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Non lues" value={String(nonLues.length)} />
        <KpiCard label="Critiques non lues" value={String(nonLues.filter((n) => n.severite === "critique").length)} />
        <KpiCard label="Total (30 j)" value={String(notifications.length)} />
      </div>

      {/* Tabs segmentés */}
      <div className="flex" style={{ background: "#ede7da", borderRadius: 100, padding: 4, width: "fit-content", marginBottom: 16 }}>
        {(["centre", "prefs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOnglet(t)}
            style={{
              padding: "7px 16px", borderRadius: 100, fontSize: 13, fontWeight: 600,
              background: onglet === t ? "#0e3947" : "transparent",
              color: onglet === t ? "#f6f1e7" : "#6b7469",
            }}
          >
            {t === "centre" ? "Centre d'alertes" : "Préférences"}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>{error}</p>
      )}

      {onglet === "centre" ? (
        <>
          <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 14 }}>
            {["toutes", ...CATEGORIES].map((c) => {
              const count = c === "toutes" ? notifications.length : notifications.filter((n) => n.categorie === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setChip(c)}
                  className="font-mono"
                  style={{
                    padding: "6px 12px", borderRadius: 100, fontSize: 11.5, fontWeight: 600,
                    border: chip === c ? "1px solid transparent" : "1px solid #dfd4bf",
                    background: chip === c ? "#0e3947" : "#fbf8f1",
                    color: chip === c ? "#f6f1e7" : "#6b7469",
                  }}
                >
                  {c === "toutes" ? "Toutes" : CATEGORIE_NOTIF_LABEL[c]} {count}
                </button>
              );
            })}
            {nonLues.length > 0 && (
              <button
                onClick={() => agir(() => toutMarquerLu())}
                disabled={pending}
                style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 100, fontSize: 12.5, fontWeight: 600, border: "1px solid #dfd4bf", background: "#fbf8f1", color: "#1493be", opacity: pending ? 0.5 : 1 }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {filtrees.length === 0 ? (
            <Card style={{ padding: 24 }}>
              <p className="flex items-center gap-2" style={{ fontSize: 13.5, color: "#6b7469" }}>
                <Bell size={16} style={{ color: "#9a927f" }} />
                Aucune notification — rien à traiter. Les alertes naîtront des règles (seuils stock, DLC), à valider — point ouvert.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {filtrees.map((n) => {
                const meta = SEVERITE_META[n.severite] ?? SEVERITE_META.info;
                return (
                  <Card key={n.id} style={{ padding: "13px 16px", opacity: n.lu ? 0.6 : 1 }}>
                    <div className="flex items-start gap-3">
                      {meta.icone}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0e3947" }}>{n.titre}</span>
                          <Badge tone={meta.tone}>{n.severite}</Badge>
                          <span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".07em", color: "#a79b84" }}>
                            {CATEGORIE_NOTIF_LABEL[n.categorie] ?? n.categorie}
                          </span>
                        </div>
                        {n.description && <p style={{ fontSize: 12.5, color: "#6b7469", marginTop: 3 }}>{n.description}</p>}
                        <div className="flex items-center gap-3" style={{ marginTop: 7 }}>
                          {n.ecran && (
                            <Link href={`/${n.ecran}`} style={{ fontSize: 12, fontWeight: 600, color: "#1493be" }}>
                              Aller à →
                            </Link>
                          )}
                          {!n.lu && (
                            <button
                              onClick={() => agir(() => marquerLue(n.id))}
                              disabled={pending}
                              style={{ fontSize: 12, fontWeight: 600, color: "#6b7469", opacity: pending ? 0.5 : 1 }}
                            >
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
                        <span className="font-mono" style={{ fontSize: 11, color: "#8a7f6a" }}>{n.heure}</span>
                        {!n.lu && <Dot color="#d81020" size={8} />}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
          <Card style={{ overflow: "hidden" }}>
            <SectionHeader titre="Par type d'alerte" sous="Vos préférences personnelles — persistées." />
            <div style={{ padding: "10px 16px" }}>
              <div
                className="font-mono uppercase"
                style={{ display: "grid", gridTemplateColumns: "1fr 74px 74px", gap: 8, fontSize: 10, letterSpacing: ".08em", color: "#a79b84", paddingBottom: 7, borderBottom: "1px solid #efe7d6" }}
              >
                <span>Événement</span>
                <span style={{ textAlign: "center" }}>Dans l&apos;app</span>
                <span style={{ textAlign: "center" }}>E-mail</span>
              </div>
              {CATEGORIES.map((c) => {
                const pref = prefParCategorie.get(c) ?? { in_app: true, email: false };
                return (
                  <div key={c} style={{ display: "grid", gridTemplateColumns: "1fr 74px 74px", gap: 8, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #efe7d6" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0e3947" }}>{CATEGORIE_NOTIF_LABEL[c]}</span>
                    {(["in_app", "email"] as const).map((canal) => (
                      <span key={canal} style={{ textAlign: "center" }}>
                        <Toggle
                          actif={pref[canal]}
                          disabled={pending}
                          onClick={() => agir(() => togglePreference(c, canal, !pref[canal]))}
                        />
                      </span>
                    ))}
                  </div>
                );
              })}
              <p style={{ fontSize: 11.5, color: "#9a927f", marginTop: 10 }}>
                L&apos;envoi d&apos;e-mails suivra la mise en place des règles d&apos;alerte.
              </p>
            </div>
          </Card>

          <Card style={{ padding: 16, opacity: 0.65 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>Seuils & horaires</p>
              <Badge tone="demo">Point ouvert</Badge>
            </div>
            <p style={{ fontSize: 12.5, color: "#6b7469" }}>
              Seuils de déclenchement (stock bas, jours avant DLC) et heures calmes arrivent avec les
              règles d&apos;alerte — à valider avant d&apos;être figés (point ouvert #2).
            </p>
          </Card>
        </div>
      )}
    </>
  );
}

function Toggle({ actif, disabled, onClick }: { actif: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={actif}
      style={{
        width: 40, height: 22, borderRadius: 100, position: "relative",
        background: actif ? "#1493be" : "#d8cdb6", transition: "all .15s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: actif ? 21 : 3, width: 16, height: 16,
          borderRadius: "50%", background: "#f6f1e7", transition: "all .15s",
        }}
      />
    </button>
  );
}
