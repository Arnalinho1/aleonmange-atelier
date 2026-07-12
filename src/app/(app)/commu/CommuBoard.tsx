"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ThumbsUp, Music2, Send } from "lucide-react";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import type { Emplacement, SocialPost } from "@/lib/supabase/database.types";
import { createSocialPost } from "./actions";

const RESEAUX = [
  { id: "insta", label: "Instagram", icone: <Camera size={14} /> },
  { id: "tiktok", label: "TikTok", icone: <Music2 size={14} /> },
  { id: "facebook", label: "Facebook", icone: <ThumbsUp size={14} /> },
] as const;

const RESEAU_LABEL: Record<string, string> = { insta: "Instagram", tiktok: "TikTok", facebook: "Facebook" };

/**
 * Réseaux sociaux — SQUELETTE du référentiel social (POINT OUVERT #4).
 * « Annoncer l'emplacement du jour » écrit vraiment en base (publie /
 * programme) ; l'attribution post → ventes et les stats de réseaux
 * attendent le cadrage marketing.
 */
export function CommuBoard({
  emplacements,
  posts,
  jourSemaineAuj,
}: {
  emplacements: Emplacement[];
  posts: (SocialPost & { quand: string; emplacement_libelle: string | null })[];
  jourSemaineAuj: number;
}) {
  const router = useRouter();
  const [reseau, setReseau] = useState<string>("insta");
  const [emplacementId, setEmplacementId] = useState<string>("");
  const [contenu, setContenu] = useState("");
  const [programmeLe, setProgrammeLe] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function envoyer(action: "publier" | "programmer") {
    const fd = new FormData();
    fd.set("reseau", reseau);
    fd.set("emplacement_id", emplacementId);
    fd.set("contenu", contenu);
    fd.set("action", action);
    fd.set("programme_le", programmeLe);
    setError(undefined);
    startTransition(async () => {
      const res = await createSocialPost(undefined, fd);
      if (res?.error) setError(res.error);
      else {
        setContenu("");
        setProgrammeLe("");
        router.refresh();
      }
    });
  }

  const emplacementChoisi = emplacements.find((e) => e.id === emplacementId);

  return (
    <>
      {/* B1 — Annoncer l'emplacement du jour (carte foncée) */}
      <div style={{ background: "#0e3947", borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
          <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "#f6f1e7" }}>
            Annoncer l&apos;emplacement du jour
          </p>
          <Badge tone="demo">Squelette · périmètre à cadrer</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
          {/* Composer */}
          <div>
            <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#5c8593", marginBottom: 6 }}>Emplacement</p>
            <div className="flex gap-2 flex-wrap" style={{ marginBottom: 12 }}>
              <button
                onClick={() => setEmplacementId("")}
                style={{ padding: "6px 11px", borderRadius: 100, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,.2)", background: emplacementId === "" ? "#b07a2e" : "transparent", color: emplacementId === "" ? "#fff" : "#bfdce7" }}
              >
                Sans emplacement
              </button>
              {emplacements.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEmplacementId(e.id)}
                  className="flex items-center gap-1.5"
                  style={{ padding: "6px 11px", borderRadius: 100, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,.2)", background: emplacementId === e.id ? "#b07a2e" : "transparent", color: emplacementId === e.id ? "#fff" : "#bfdce7" }}
                >
                  {e.libelle}
                  {e.jour_semaine === jourSemaineAuj && (
                    <span className="font-mono" style={{ fontSize: 9, background: "rgba(216,16,32,.85)", color: "#fff", borderRadius: 100, padding: "1px 6px" }}>AUJ.</span>
                  )}
                </button>
              ))}
            </div>
            <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#5c8593", marginBottom: 6 }}>Réseau</p>
            <div className="flex gap-2 flex-wrap" style={{ marginBottom: 12 }}>
              {RESEAUX.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReseau(r.id)}
                  className="flex items-center gap-1.5"
                  style={{ padding: "6px 12px", borderRadius: 100, fontSize: 12.5, fontWeight: 600, border: "1px solid rgba(255,255,255,.2)", background: reseau === r.id ? "#1493be" : "transparent", color: reseau === r.id ? "#fff" : "#bfdce7" }}
                >
                  {r.icone} {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Texte de la publication… (l'emplacement du jour, le plat à l'affiche)"
              className="outline-none fz-scroll"
              style={{ width: "100%", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, color: "#f6f1e7", resize: "vertical" }}
            />
            <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 10 }}>
              <span className="font-mono" style={{ fontSize: 10.5, color: "#5c8593" }}>{contenu.length}/500</span>
              <input
                type="datetime-local"
                value={programmeLe}
                onChange={(e) => setProgrammeLe(e.target.value)}
                className="outline-none"
                style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 9, padding: "7px 9px", fontSize: 12, color: "#f6f1e7", colorScheme: "dark" }}
              />
              <button
                onClick={() => envoyer("programmer")}
                disabled={pending || !contenu.trim() || !programmeLe}
                style={{ padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "1px solid rgba(255,255,255,.25)", color: "#f6f1e7", opacity: pending || !contenu.trim() || !programmeLe ? 0.4 : 1 }}
              >
                Programmer
              </button>
              <button
                onClick={() => envoyer("publier")}
                disabled={pending || !contenu.trim()}
                className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
                style={{ marginLeft: "auto", padding: "10px 16px", borderRadius: 11, background: "#d81020", color: "#f6f1e7", fontWeight: 700, fontSize: 14, opacity: pending || !contenu.trim() ? 0.4 : 1 }}
              >
                <Send size={14} strokeWidth={2.4} /> Publier
              </button>
            </div>
            {error && (
              <p style={{ fontSize: 12.5, color: "#ffb3ab", marginTop: 8 }}>{error}</p>
            )}
            <p className="font-mono" style={{ fontSize: 9.5, color: "#5c8593", marginTop: 8 }}>
              journalisé en base — la publication automatique vers les plateformes n&apos;est pas branchée (cadrage marketing).
            </p>
          </div>

          {/* Aperçu */}
          <div style={{ background: "#fbf8f1", borderRadius: 12, padding: 14 }}>
            <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 8 }}>Aperçu</p>
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <span className="grid place-items-center rounded-full font-display" style={{ width: 28, height: 28, background: "#0e3947", color: "#f6f1e7", fontSize: 12, fontWeight: 800 }}>A</span>
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 700, color: "#0e3947" }}>A Léon Mange</p>
                <p className="font-mono" style={{ fontSize: 9.5, color: "#a79b84" }}>{RESEAU_LABEL[reseau]}{emplacementChoisi ? ` · ${emplacementChoisi.libelle}` : ""}</p>
              </div>
            </div>
            <div style={{ height: 64, borderRadius: 9, background: "linear-gradient(120deg,#0e3947,#1493be)", marginBottom: 8 }} />
            <p style={{ fontSize: 12.5, color: "#0e3947", whiteSpace: "pre-wrap" }}>
              {contenu || "Le texte de la publication s'affichera ici."}
            </p>
          </div>
        </div>
      </div>

      {/* Journal des annonces */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }} className="fz-users-grid">
        <Card style={{ overflow: "hidden" }}>
          <SectionHeader titre="Annonces" compteur={`${posts.length} publication${posts.length > 1 ? "s" : ""}`} />
          <div style={{ padding: posts.length === 0 ? 16 : 0 }}>
            {posts.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6b7469" }}>Aucune publication programmée — composez la première ci-dessus.</p>
            ) : (
              posts.map((p) => (
                <div key={p.id} className="flex items-start gap-3" style={{ padding: "11px 16px", borderBottom: "1px solid #efe7d6" }}>
                  <Dot color={p.statut === "publie" ? "#1f8a5b" : "#b07a2e"} size={8} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#0e3947", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.contenu}</p>
                    <p className="font-mono" style={{ fontSize: 10, color: "#a79b84", marginTop: 2 }}>
                      {RESEAU_LABEL[p.reseau] ?? p.reseau}
                      {p.emplacement_libelle ? ` · ${p.emplacement_libelle}` : ""} · {p.quand}
                    </p>
                  </div>
                  <Badge tone={p.statut === "publie" ? "succes" : "alerte"}>{p.statut === "publie" ? "Publié" : "Programmé"}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card style={{ padding: 16, opacity: 0.65 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947" }}>Attribution & audiences</p>
            <Badge tone="demo">Point ouvert #4</Badge>
          </div>
          <p style={{ fontSize: 12.5, color: "#6b7469" }}>
            L&apos;attribution post → plat → ventes (via l&apos;origine déclarative de la Saisie) et les stats
            de réseaux arrivent avec le cadrage marketing du référentiel social.
          </p>
        </Card>
      </div>
    </>
  );
}
