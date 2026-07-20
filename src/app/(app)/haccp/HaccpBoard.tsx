"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Thermometer, SprayCan, ClipboardCheck } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import { KpiCard } from "@/components/ui/KpiCard";
import { enregistrerReleve } from "./actions";

export type Releve = {
  id: string;
  type: string;
  cible: string | null;
  valeur: number | null;
  conforme: boolean | null;
  note: string | null;
  occurred_at: string;
  jour: string;
  heure: string;
  operateur_nom: string | null;
};

const TYPE_META: Record<string, { label: string; icone: React.ReactNode }> = {
  temperature: { label: "Température", icone: <Thermometer size={13} /> },
  nettoyage: { label: "Nettoyage", icone: <SprayCan size={13} /> },
  controle: { label: "Contrôle", icone: <ClipboardCheck size={13} /> },
};

/**
 * HACCP — registre réglementaire : relevés horodatés (température,
 * nettoyage, contrôle), conformité + action corrective obligatoire en cas
 * de non-conformité. Les contrôles « dus » (planning) restent à cadrer.
 */
export function HaccpBoard({ releves, aujourdhui }: { releves: Releve[]; aujourdhui: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"temperature" | "nettoyage" | "controle">("temperature");
  const [conforme, setConforme] = useState(true);
  // Champs CONTRÔLÉS : React 19 réinitialise un <form action> après l'action,
  // même en erreur — sans état, l'opérateur devrait tout retaper.
  const [cible, setCible] = useState("");
  const [valeur, setValeur] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const duJour = releves.filter((r) => r.jour === aujourdhui);
  const conformes = duJour.filter((r) => r.conforme === true).length;
  const nonConformes = duJour.filter((r) => r.conforme === false).length;

  function onSubmit(formData: FormData) {
    formData.set("type", type);
    formData.set("conforme", conforme ? "oui" : "non");
    formData.set("cible", cible);
    formData.set("valeur", valeur);
    formData.set("note", note);
    setError(undefined);
    startTransition(async () => {
      const res = await enregistrerReleve(undefined, formData);
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        setConforme(true);
        setCible("");
        setValeur("");
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex justify-end" style={{ marginBottom: 16 }}>
        <button
          onClick={() => { setError(undefined); setOpen(true); }}
          className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
          style={{ background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Enregistrer un relevé
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Relevés aujourd'hui" value={String(duJour.length)} />
        <KpiCard label="Conformes" value={String(conformes)} />
        <KpiCard label="Non-conformités" value={String(nonConformes)} sub={nonConformes > 0 ? "action corrective consignée" : "rien à signaler"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Relevés du jour" compteur={`${duJour.length} relevé${duJour.length > 1 ? "s" : ""}`} />
          <div style={{ padding: duJour.length === 0 ? 16 : 0 }}>
            {duJour.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7469" }}>
                Aucun relevé aujourd&apos;hui — pensez aux contrôles de température matin et soir.
              </p>
            ) : (
              duJour.map((r) => <LigneReleve key={r.id} r={r} />)
            )}
          </div>
        </Card>

        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Historique de conformité" sous="30 derniers jours." />
          <div style={{ padding: releves.length === 0 ? 16 : 0 }}>
            {releves.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7469" }}>Le registre se remplit avec les relevés.</p>
            ) : (
              releves.slice(0, 20).map((r) => <LigneReleve key={r.id} r={r} avecJour />)
            )}
          </div>
        </Card>
      </div>

      {open && (
        <div className="fixed inset-0 flex justify-end" style={{ background: "rgba(15,24,19,.5)", zIndex: 70 }} onClick={() => setOpen(false)}>
          <div
            className="fz-scroll h-full overflow-y-auto fz-drawer-full"
            style={{ width: "min(420px,92vw)", background: "#fbf8f1", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ background: "#0e3947", padding: "18px 20px" }}>
              <div>
                <p className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".14em", color: "#8fcfe2" }}>HACCP</p>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 800, color: "#f6f1e7" }}>Nouveau relevé</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "#8fcfe2" }}><X size={20} /></button>
            </div>

            <form action={onSubmit} className="flex flex-col gap-4" style={{ padding: 20 }}>
              <div className="flex flex-col gap-1.5">
                <Libelle>Type de relevé</Libelle>
                <div className="flex gap-2">
                  {(Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t as typeof type)}
                      className="flex items-center gap-1.5"
                      style={{
                        flex: 1, justifyContent: "center", padding: "9px 8px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                        border: type === t ? "1px solid #1493be" : "1px solid #dfd4bf",
                        background: type === t ? "rgba(20,147,190,.1)" : "#fbf8f1",
                        color: type === t ? "#1493be" : "#6b7469",
                      }}
                    >
                      {TYPE_META[t].icone} {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <Libelle>{type === "temperature" ? "Enceinte (frigo, congélateur…)" : type === "nettoyage" ? "Zone nettoyée" : "Contrôle effectué"}</Libelle>
                <input name="cible" value={cible} onChange={(e) => setCible(e.target.value)} required placeholder={type === "temperature" ? "ex : Frigo positif n°1" : type === "nettoyage" ? "ex : Plan de travail" : "ex : Réception marchandises"} className="outline-none" style={champ} />
              </label>

              {type === "temperature" && (
                <label className="flex flex-col gap-1.5">
                  <Libelle>Température (°C)</Libelle>
                  <input name="valeur" value={valeur} onChange={(e) => setValeur(e.target.value)} required inputMode="decimal" placeholder="ex : 3,5" className="outline-none font-display" style={{ ...champ, fontSize: 24, fontWeight: 700 }} />
                </label>
              )}

              <div className="flex flex-col gap-1.5">
                <Libelle>Conformité</Libelle>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConforme(true)} style={{ flex: 1, padding: "9px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: conforme ? "1px solid #1f8a5b" : "1px solid #dfd4bf", background: conforme ? "#e9f3ec" : "#fbf8f1", color: conforme ? "#1f7a50" : "#6b7469" }}>
                    Conforme
                  </button>
                  <button type="button" onClick={() => setConforme(false)} style={{ flex: 1, padding: "9px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: !conforme ? "1px solid #c0442e" : "1px solid #dfd4bf", background: !conforme ? "rgba(192,68,46,.1)" : "#fbf8f1", color: !conforme ? "#c0442e" : "#6b7469" }}>
                    Non conforme
                  </button>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <Libelle>{conforme ? "Note (optionnel)" : "Action corrective (obligatoire)"}</Libelle>
                <textarea name="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={conforme ? "Observation…" : "ex : Denrées déplacées, maintenance appelée."} className="outline-none fz-scroll" style={{ ...champ, resize: "vertical" }} />
              </label>

              {error && (
                <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px" }}>{error}</p>
              )}

              <div className="flex gap-2" style={{ marginTop: 4 }}>
                <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: "11px", borderRadius: 11, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 14, fontWeight: 600, color: "#6b7469" }}>
                  Annuler
                </button>
                <button type="submit" disabled={pending} className="font-display" style={{ flex: 1, padding: "11px", borderRadius: 11, background: "#1493be", color: "#f6f1e7", fontWeight: 700, fontSize: 14, opacity: pending ? 0.6 : 1 }}>
                  {pending ? "…" : "Enregistrer le relevé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function LigneReleve({ r, avecJour }: { r: Releve; avecJour?: boolean }) {
  return (
    <div className="flex items-center gap-3" style={{ padding: "9px 16px", borderBottom: "1px solid #efe7d6" }}>
      <Dot color={r.conforme === false ? "#c0442e" : "#1f8a5b"} size={8} />
      <span className="font-mono" style={{ fontSize: 11, color: "#8a7f6a", width: avecJour ? 76 : 40, flexShrink: 0 }}>
        {avecJour ? `${fmtJourCourt(r.jour)} ${r.heure}` : r.heure}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.cible ?? "—"}
          {r.valeur != null && (
            <span className="font-mono" style={{ marginLeft: 6, fontSize: 12, color: "#1493be" }}>{String(r.valeur).replace(".", ",")} °C</span>
          )}
        </span>
        <span className="font-mono" style={{ fontSize: 9.5, color: "#a79b84" }}>
          {TYPE_META[r.type]?.label ?? r.type}
          {r.operateur_nom ? ` · ${r.operateur_nom}` : ""}
          {r.note ? ` · ${r.conforme === false ? "Action : " : ""}${r.note}` : ""}
        </span>
      </span>
      <Badge tone={r.conforme === false ? "critique" : "succes"}>{r.conforme === false ? "Non conforme" : "Conforme"}</Badge>
    </div>
  );
}

const champ: React.CSSProperties = { background: "#fff", border: "1px solid #dfd4bf", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#0e3947" };

function Libelle({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#9a927f" }}>
      {children}
    </span>
  );
}

function fmtJourCourt(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" }).format(new Date(`${iso}T12:00:00Z`));
}
