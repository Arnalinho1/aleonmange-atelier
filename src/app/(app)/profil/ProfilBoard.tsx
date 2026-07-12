"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, KeyRound, LogOut, Moon, UserCog } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL, ROLE_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, SectionHeader } from "@/components/ui/Card";
import type { Profil, UserPreference } from "@/lib/supabase/database.types";
import { signOut } from "@/app/login/actions";
import { changerMotDePasse, savePreference, updateNom } from "./actions";

const CANAUX_DEFAUT = ["ask", "truck", "boutique", "traiteur"] as const;
const ECRANS_ACCUEIL = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "sale", label: "Saisie de vente" },
  { id: "orders", label: "Commandes du jour" },
] as const;

/**
 * Mon profil — écran PERSONNEL (handoff « Profil & Stock » §01) : compte +
 * préférences de travail owner-only, persistées immédiatement. Distinct de
 * Utilisateurs & rôles (équipe/accès) — lien croisé, pas de recouvrement.
 */
export function ProfilBoard({
  profil,
  email,
  preference,
}: {
  profil: Profil;
  email: string;
  preference: UserPreference | null;
}) {
  const router = useRouter();
  const [nom, setNom] = useState(profil.nom);
  const [canalDefaut, setCanalDefaut] = useState<string>(preference?.canal_defaut ?? "ask");
  const [ecranAccueil, setEcranAccueil] = useState<string>(preference?.ecran_accueil ?? "dashboard");
  const [mdpOuvert, setMdpOuvert] = useState(false);
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | undefined>();
  const [pending, setPending] = useState(false);

  async function agir(fn: () => Promise<{ error?: string } | undefined>, succes: string) {
    setMessage(undefined);
    setPending(true);
    try {
      const res = await fn();
      if (res?.error) setMessage({ type: "erreur", texte: res.error });
      else {
        setMessage({ type: "ok", texte: succes });
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  function enregistrerNom() {
    const fd = new FormData();
    fd.set("nom", nom);
    agir(() => updateNom(undefined, fd), "Nom mis à jour.");
  }

  function choisir(champ: "canal_defaut" | "ecran_accueil", valeur: string) {
    if (champ === "canal_defaut") setCanalDefaut(valeur);
    else setEcranAccueil(valeur);
    agir(() => savePreference(champ, valeur), "Préférence enregistrée.");
  }

  function validerMdp() {
    const fd = new FormData();
    fd.set("nouveau", nouveau);
    fd.set("confirmation", confirmation);
    agir(async () => {
      const res = await changerMotDePasse(undefined, fd);
      if (!res?.error) {
        setMdpOuvert(false);
        setNouveau("");
        setConfirmation("");
      }
      return res;
    }, "Mot de passe changé.");
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 760 }}>
      {message && (
        <p
          style={{
            fontSize: 12.5,
            color: message.type === "ok" ? "#1f7a50" : "#c0442e",
            background: message.type === "ok" ? "#e9f3ec" : "rgba(192,68,46,.1)",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          {message.texte}
        </p>
      )}

      {/* Identité / compte */}
      <Card style={{ overflow: "hidden" }}>
        <SectionHeader titre="Mon compte" />
        <div className="flex items-start gap-5 flex-wrap" style={{ padding: 20 }}>
          <span
            className="grid place-items-center rounded-full font-display"
            style={{ width: 72, height: 72, background: "#3fa8ce", color: "#0e3947", fontSize: 30, fontWeight: 800, flexShrink: 0 }}
          >
            {(nom || "?").charAt(0).toUpperCase()}
          </span>
          <div className="flex flex-col gap-3" style={{ flex: 1, minWidth: 240 }}>
            <label className="flex flex-col gap-1.5">
              <Libelle>Nom affiché</Libelle>
              <div className="flex gap-2">
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="outline-none"
                  style={{ flex: 1, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 11, padding: "10px 13px", fontSize: 14.5, fontWeight: 600, color: "#0e3947" }}
                />
                <button
                  onClick={enregistrerNom}
                  disabled={pending || nom.trim() === profil.nom}
                  style={{ padding: "9px 14px", borderRadius: 10, background: "#0e3947", color: "#f6f1e7", fontSize: 12.5, fontWeight: 600, opacity: pending || nom.trim() === profil.nom ? 0.45 : 1 }}
                >
                  Enregistrer
                </button>
              </div>
            </label>
            <div>
              <Libelle>E-mail du compte</Libelle>
              <p className="font-mono" style={{ fontSize: 13, color: "#6b7469", marginTop: 4 }}>
                {email} <Badge tone="neutre">{ROLE_LABEL[profil.role]}</Badge>
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 4 }}>
              <button
                onClick={() => setMdpOuvert(!mdpOuvert)}
                className="flex items-center gap-1.5"
                style={{ fontSize: 12.5, fontWeight: 600, color: "#1493be" }}
              >
                <KeyRound size={14} /> Changer le mot de passe
              </button>
              <form action={signOut}>
                <button className="flex items-center gap-1.5" style={{ fontSize: 12.5, fontWeight: 600, color: "#c0442e" }}>
                  <LogOut size={14} /> Se déconnecter
                </button>
              </form>
            </div>
            {mdpOuvert && (
              <div className="flex flex-col gap-2" style={{ background: "#f1ead9", borderRadius: 10, padding: 12 }}>
                <input
                  type="password"
                  value={nouveau}
                  onChange={(e) => setNouveau(e.target.value)}
                  placeholder="Nouveau mot de passe (8 caractères min.)"
                  className="outline-none"
                  style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "9px 11px", fontSize: 13.5, color: "#0e3947" }}
                />
                <input
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="Confirmer le nouveau mot de passe"
                  className="outline-none"
                  style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "9px 11px", fontSize: 13.5, color: "#0e3947" }}
                />
                <div className="flex gap-2">
                  <button onClick={() => setMdpOuvert(false)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: "1px solid #dfd4bf", background: "#fbf8f1", fontSize: 12.5, fontWeight: 600, color: "#6b7469" }}>
                    Annuler
                  </button>
                  <button
                    onClick={validerMdp}
                    disabled={pending}
                    style={{ flex: 1, padding: "8px", borderRadius: 9, background: "#0e3947", color: "#f6f1e7", fontSize: 12.5, fontWeight: 600, opacity: pending ? 0.5 : 1 }}
                  >
                    {pending ? "…" : "Valider"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Préférences de travail */}
      <Card style={{ overflow: "hidden" }}>
        <SectionHeader titre="Mes préférences de travail" sous="Ces réglages n'affectent que votre session — jamais celle des autres." />
        <div className="flex flex-col gap-5" style={{ padding: 20 }}>
          <div>
            <Libelle>Canal par défaut à l&apos;ouverture de la Saisie</Libelle>
            <div className="flex gap-2 flex-wrap" style={{ marginTop: 8 }}>
              {CANAUX_DEFAUT.map((c) => (
                <button
                  key={c}
                  onClick={() => choisir("canal_defaut", c)}
                  disabled={pending}
                  className="flex items-center gap-1.5"
                  style={{
                    padding: "7px 13px", borderRadius: 100, fontSize: 12.5, fontWeight: 600,
                    border: canalDefaut === c ? "1px solid transparent" : "1px solid #dfd4bf",
                    background: canalDefaut === c ? "#0e3947" : "#fbf8f1",
                    color: canalDefaut === c ? "#f6f1e7" : "#6b7469",
                  }}
                >
                  {c !== "ask" && <Dot color={CANAL_COLOR[c]} size={7} />}
                  {c === "ask" ? "Demander" : CANAL_LABEL[c]}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11.5, color: "#9a927f", marginTop: 6 }}>
              « Demander » = pas de présélection. La Saisie de vente lit cette préférence à l&apos;ouverture.
            </p>
          </div>

          <div>
            <Libelle>Écran d&apos;accueil à la connexion</Libelle>
            <div className="flex gap-2 flex-wrap" style={{ marginTop: 8 }}>
              {ECRANS_ACCUEIL.map((e) => (
                <button
                  key={e.id}
                  onClick={() => choisir("ecran_accueil", e.id)}
                  disabled={pending}
                  style={{
                    padding: "7px 13px", borderRadius: 100, fontSize: 12.5, fontWeight: 600,
                    border: ecranAccueil === e.id ? "1px solid transparent" : "1px solid #dfd4bf",
                    background: ecranAccueil === e.id ? "#0e3947" : "#fbf8f1",
                    color: ecranAccueil === e.id ? "#f6f1e7" : "#6b7469",
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3" style={{ opacity: 0.55 }}>
            <Moon size={16} style={{ color: "#9a927f" }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0e3947" }}>Apparence (clair / sombre)</p>
              <p style={{ fontSize: 11.5, color: "#9a927f" }}>Optionnel · à confirmer — non implémenté sans demande de l&apos;équipe.</p>
            </div>
            <Badge tone="neutre">Bientôt</Badge>
          </div>
        </div>
      </Card>

      {/* Liens croisés — pas de doublon */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/notifs"
          className="flex items-center gap-2"
          style={{ flex: 1, minWidth: 220, background: "#f6f1e7", border: "1px solid #dfd4bf", borderRadius: 13, padding: "13px 16px", fontSize: 13, fontWeight: 600, color: "#0e3947" }}
        >
          <Bell size={16} style={{ color: "#1493be" }} />
          Gérer mes alertes
          <span className="font-mono" style={{ marginLeft: "auto", fontSize: 10, color: "#9a927f" }}>Notifications →</span>
        </Link>
        <Link
          href="/users"
          className="flex items-center gap-2"
          style={{ flex: 1, minWidth: 220, background: "#f6f1e7", border: "1px solid #dfd4bf", borderRadius: 13, padding: "13px 16px", fontSize: 13, fontWeight: 600, color: "#0e3947" }}
        >
          <UserCog size={16} style={{ color: "#1493be" }} />
          L&apos;équipe et les accès
          <span className="font-mono" style={{ marginLeft: "auto", fontSize: 10, color: "#9a927f" }}>Utilisateurs & rôles →</span>
        </Link>
      </div>
    </div>
  );
}

function Libelle({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: ".1em", color: "#9a927f" }}>
      {children}
    </span>
  );
}
