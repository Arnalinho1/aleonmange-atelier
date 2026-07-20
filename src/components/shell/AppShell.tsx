"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Shell client : tient l'etat du drawer mobile (sidebar off-canvas sous 1024px).
 * Le layout (Server Component) fait le fetch Supabase et passe badges/profil/
 * hasUnread ici. L'overlay est rendu HORS du Topbar : le backdrop-blur du Topbar
 * deviendrait sinon le bloc conteneur du position:fixed et ecraserait l'overlay.
 * Desktop (>=1024px) : aucun effet (les classes app-* n'ont de regles que sous 1024).
 */
export function AppShell({
  badges,
  profil,
  hasUnread,
  children,
}: {
  badges?: Partial<Record<"notifs" | "orders", number>>;
  profil?: { nom: string; role: string };
  hasUnread?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Verrou de scroll du body quand le drawer est ouvert (comme le menu du site).
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Repasse en desktop -> ferme le drawer (evite un etat ouvert bloque au resize).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar badges={badges} profil={profil} open={open} onNavigate={() => setOpen(false)} />
      <div
        className={`app-overlay${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar hasUnread={hasUnread} onMenuOpen={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto" style={{ padding: "clamp(20px,3vw,34px)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
