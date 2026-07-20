"use client";

import Link from "next/link";
import { Bell, Menu, Plus, Search } from "lucide-react";

/** Topbar sticky floue (MOCKUP_DIGEST §1). Hamburger visible sous 1024px (mobile). */
export function Topbar({ hasUnread = false, onMenuOpen }: { hasUnread?: boolean; onMenuOpen?: () => void }) {
  return (
    <header
      className="sticky top-0 flex items-center gap-4"
      style={{
        zIndex: 20,
        background: "rgba(237,231,218,.86)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid #dfd4bf",
        padding: "14px clamp(18px,3vw,34px)",
      }}
    >
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Ouvrir le menu"
        className="app-burger shrink-0"
        style={{ width: 40, height: 40, background: "#f6f1e7", border: "1px solid #dfd4bf", borderRadius: 11, color: "#0e3947" }}
      >
        <Menu size={20} />
      </button>

      <div
        className="app-topsearch flex items-center gap-2"
        style={{ flex: 1, maxWidth: 420, background: "#f6f1e7", border: "1px solid #dfd4bf", borderRadius: 11, padding: "9px 13px" }}
      >
        <Search size={16} color="#9a927f" />
        <input
          placeholder="Rechercher un composant, une commande, un lot…"
          className="bg-transparent outline-none w-full"
          style={{ fontSize: 13.5, color: "#0e3947" }}
        />
      </div>

      <div className="flex items-center gap-[10px]" style={{ marginLeft: "auto" }}>
        <Link
          href="/sale"
          className="flex items-center gap-2 font-display transition-opacity hover:opacity-90"
          style={{ background: "#d81020", color: "#f6f1e7", fontWeight: 700, fontSize: 14, padding: "9px 15px", borderRadius: 11 }}
        >
          <Plus size={16} strokeWidth={2.4} />
          Vente
        </Link>
        <Link
          href="/notifs"
          className="relative grid place-items-center"
          style={{ width: 40, height: 40, background: "#f6f1e7", border: "1px solid #dfd4bf", borderRadius: 11 }}
        >
          <Bell size={18} color="#0e3947" />
          {hasUnread && (
            <span className="absolute rounded-full" style={{ width: 8, height: 8, background: "#d81020", top: 8, right: 8 }} />
          )}
        </Link>
      </div>
    </header>
  );
}
