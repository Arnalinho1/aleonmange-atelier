"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil, Users } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Client } from "@/lib/supabase/database.types";
import { createClientFiche, updateClientFiche, toggleClientActif, appliquerRecompense } from "./actions";

/** Agrégats transactionnels par client (dérivés de v_vente_remise — source unique). */
export type ClientStats = Record<string, { commandes: number; ca: number; derniere: string | null }>;

/** Fidélité par client (dérivée de v_fidelite_client — compteur JAMAIS stocké). */
export type FideliteMap = Record<string, { passages: number; cycle: number; disponibles: number }>;

/**
 * Fiches clients : créer / éditer / désactiver (soft delete — les ventes
 * passées gardent leur client_id). Le comptoir anonyme n'apparaît pas ici.
 */
export function ClientsManager({
  clients,
  stats,
  fidelite,
  seuil,
  reward,
}: {
  clients: Client[];
  stats: ClientStats;
  fidelite: FideliteMap;
  seuil: number;
  reward: string;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<"new" | Client | null>(null);
  const [type, setType] = useState<"particulier" | "pro">("particulier");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function onRecompense(id: string) {
    startTransition(async () => {
      const res = await appliquerRecompense(id);
      if (res?.error) setError(res.error);
      else {
        setError(undefined);
        router.refresh();
      }
    });
  }

  function openDrawer(target: "new" | Client) {
    setError(undefined);
    setType(target !== "new" && target.type === "pro" ? "pro" : "particulier");
    setDrawer(target);
  }

  function onSubmit(formData: FormData) {
    const action = drawer === "new" ? createClientFiche : updateClientFiche;
    startTransition(async () => {
      const res = await action(undefined, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setError(undefined);
        setDrawer(null);
        router.refresh();
      }
    });
  }

  function onToggle(c: Client) {
    startTransition(async () => {
      const res = await toggleClientActif(c.id, !c.actif);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  const actifs = clients.filter((c) => c.actif);
  const inactifs = clients.filter((c) => !c.actif);
  const edition = drawer !== null && drawer !== "new" ? drawer : null;

  return (
    <>
      <div className="flex justify-end" style={{ marginBottom: 16 }}>
        <button
          onClick={() => openDrawer("new")}
          className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
          style={{ background: "#d81020", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Nouveau client
        </button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users size={30} strokeWidth={1.6} />}
          titre="Aucun client enregistré"
          message="Les fiches clients (surtout traiteur et click & collect) et leur récurrence apparaîtront ici. Le comptoir anonyme ne crée pas de client. Cliquez sur « Nouveau client » pour créer la première fiche."
        />
      ) : (
      // data-g : cibles du guide d'onboarding (B6) — la liste et ses lignes.
      <div data-g="cli-fiche">
      <Card style={{ overflow: "hidden" }}>
        <SectionHeader
          titre="Fiches clients"
          sous="Traiteur et click & collect — le comptoir anonyme ne crée pas de fiche."
          compteur={`${actifs.length} client${actifs.length > 1 ? "s" : ""}`}
        />
        <div>
          <div className="fz-tscroll"><div style={{ minWidth: 760 }}>
          <div
            className="font-mono uppercase"
            style={{ display: "grid", gridTemplateColumns: "1.8fr .7fr 1.2fr .5fr .8fr .8fr .6fr .6fr", gap: 8, padding: "8px 16px", fontSize: 10, letterSpacing: ".08em", color: "#a79b84", borderBottom: "1px solid #efe7d6" }}
          >
            <span>Client</span>
            <span>Type</span>
            <span>Contact</span>
            <span style={{ textAlign: "right" }}>Cmd</span>
            <span>Dern. livraison</span>
            <span style={{ textAlign: "right" }}>CA remis</span>
            <span>Statut</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {[...actifs, ...inactifs].map((c) => {
            const s = stats[c.id];
            return (
              <div
                key={c.id}
                data-g="cli-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr .7fr 1.2fr .5fr .8fr .8fr .6fr .6fr",
                  gap: 8,
                  padding: "11px 16px",
                  alignItems: "center",
                  borderBottom: "1px solid #efe7d6",
                  opacity: c.actif ? 1 : 0.55,
                }}
              >
                <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                  <Dot color={c.type === "pro" ? "#e9a23b" : "#3fa8ce"} />
                  <div style={{ minWidth: 0 }}>
                    <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nom}</p>
                      {fidelite[c.id]?.disponibles > 0 && (
                        <span
                          title="Récompense fidélité à remettre"
                          className="font-mono"
                          style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: "#8a5a24", background: "#f4ebd9", border: "1px solid #ead9b6", borderRadius: 100, padding: "1px 7px", whiteSpace: "nowrap" }}
                        >
                          ★ Récompense
                        </span>
                      )}
                    </div>
                    {c.code_postal && (
                      <p className="font-mono" style={{ fontSize: 10.5, color: "#a79b84" }}>{c.code_postal}</p>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 12.5, color: "#6b7469" }}>{c.type === "pro" ? "Pro" : "Particulier"}</span>
                <div style={{ minWidth: 0 }}>
                  {c.email && <p className="font-mono" style={{ fontSize: 11, color: "#6b7469", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</p>}
                  {c.telephone && <p className="font-mono" style={{ fontSize: 11, color: "#6b7469" }}>{c.telephone}</p>}
                  {!c.email && !c.telephone && <span style={{ fontSize: 12, color: "#9a927f" }}>—</span>}
                </div>
                <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947", textAlign: "right" }}>
                  {s ? s.commandes : 0}
                </span>
                <span className="font-mono" style={{ fontSize: 11.5, color: "#6b7469" }}>
                  {s?.derniere ? formatDate(s.derniere) : "—"}
                </span>
                <span className="font-mono" style={{ fontSize: 12.5, fontWeight: 600, color: "#0e3947", textAlign: "right" }}>
                  {s ? `${fmt(s.ca)} €` : "—"}
                </span>
                <span>
                  <Badge tone={c.actif ? "succes" : "neutre"}>{c.actif ? "Actif" : "Désactivé"}</Badge>
                </span>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openDrawer(c)} title="Éditer la fiche" style={{ color: "#1493be", padding: 4 }}>
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => onToggle(c)}
                    disabled={pending}
                    style={{ fontSize: 12, fontWeight: 600, color: c.actif ? "#c0442e" : "#1f8a5b", opacity: pending ? 0.5 : 1 }}
                  >
                    {c.actif ? "Désactiver" : "Réactiver"}
                  </button>
                </div>
              </div>
            );
          })}
          </div></div>
        </div>
      </Card>
      </div>
      )}

      {error && drawer === null && (
        <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginTop: 12 }}>
          {error}
        </p>
      )}

      {drawer !== null && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setDrawer(null)}>
          <div
            className="fz-scroll h-full overflow-y-auto fz-drawer-full"
            style={{ width: "min(440px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>
                  Clients
                </p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>
                  {edition ? "Modifier la fiche" : "Nouveau client"}
                </p>
              </div>
              <button onClick={() => setDrawer(null)} style={{ color: "#8fcfe2" }}>
                <X size={20} />
              </button>
            </div>

            {edition && (
              <FideliteDrawer
                fid={fidelite[edition.id]}
                seuil={seuil}
                reward={reward}
                pending={pending}
                onRecompense={() => onRecompense(edition.id)}
              />
            )}

            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              {edition && <input type="hidden" name="id" value={edition.id} />}

              <Field label="Nom" name="nom" defaultValue={edition?.nom} placeholder="ex : Mairie de Theizé" required />

              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {(["particulier", "pro"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        border: type === t ? "1px solid #1493be" : "1px solid #dfd4bf",
                        background: type === t ? "rgba(20,147,190,.1)" : "#fbf8f1",
                        color: type === t ? "#1493be" : "#6b7469",
                      }}
                    >
                      {t === "particulier" ? "Particulier" : "Pro"}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="type" value={type} />
              </div>

              <Field label="E-mail (optionnel)" name="email" type="email" defaultValue={edition?.email ?? ""} placeholder="contact@..." />
              <Field label="Téléphone (optionnel)" name="telephone" defaultValue={edition?.telephone ?? ""} placeholder="06 ..." />
              <Field label="Code postal (optionnel)" name="code_postal" defaultValue={edition?.code_postal ?? ""} placeholder="69620" />

              <label className="flex flex-col gap-1.5">
                <Label>Notes (optionnel)</Label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={edition?.notes ?? ""}
                  placeholder="Allergies, préférences, contexte…"
                  className="outline-none fz-scroll"
                  style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, color: "#0e3947", resize: "vertical" }}
                />
              </label>

              {error && (
                <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px" }}>
                  {error}
                </p>
              )}

              <div className="flex gap-2" style={{ marginTop: 4 }}>
                <button type="button" onClick={() => setDrawer(null)} style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 14, fontWeight: 600, color: "#6b7469" }}>
                  Annuler
                </button>
                <button type="submit" disabled={pending} className="font-display" style={{ flex: 1, padding: "11px", borderRadius: 11, background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, opacity: pending ? 0.6 : 1 }}>
                  {pending ? "…" : edition ? "Enregistrer" : "Créer la fiche"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Paris" });
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#9a927f" }}>
      {children}
    </span>
  );
}

function FideliteDrawer({
  fid,
  seuil,
  reward,
  pending,
  onRecompense,
}: {
  fid: { passages: number; cycle: number; disponibles: number } | undefined;
  seuil: number;
  reward: string;
  pending: boolean;
  onRecompense: () => void;
}) {
  return (
    <div style={{ margin: "16px 20px 0", background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 12, padding: 14 }}>
      <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#b0704c", marginBottom: 8 }}>
        Fidélité
      </p>
      {!fid ? (
        <p style={{ fontSize: 12.5, color: "#6b7469" }}>Programme fidélité non activé par ce client.</p>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#0e3947" }}>
            <strong style={{ fontWeight: 700 }}>{fid.passages}</strong> passage{fid.passages > 1 ? "s" : ""}
            {seuil > 0 && (
              <span style={{ color: "#6b7469" }}>
                {" "}· {fid.cycle}/{seuil} sur la carte en cours
              </span>
            )}
          </p>
          {fid.disponibles > 0 ? (
            <>
              <p style={{ fontSize: 12.5, color: "#8a5a24", marginTop: 5 }}>
                {fid.disponibles} récompense{fid.disponibles > 1 ? "s" : ""} disponible{fid.disponibles > 1 ? "s" : ""} : {reward}
              </p>
              <button
                type="button"
                onClick={onRecompense}
                disabled={pending}
                className="font-display"
                style={{ marginTop: 10, background: "#d81020", color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 14px", borderRadius: 10, opacity: pending ? 0.6 : 1 }}
              >
                {pending ? "…" : "Appliquer une récompense"}
              </button>
              <p style={{ fontSize: 11, color: "#9a927f", marginTop: 7 }}>
                Récompense non monétaire, remise au retrait. Le compteur reste dérivé.
              </p>
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: "#6b7469", marginTop: 5 }}>Aucune récompense disponible pour l&apos;instant.</p>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, name, type = "text", defaultValue, placeholder, required }: { label: string; name: string; type?: string; defaultValue?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="outline-none"
        style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" }}
      />
    </label>
  );
}
