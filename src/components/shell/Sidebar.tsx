"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_GROUPS } from "@/lib/nav";
import { useGuide } from "@/components/guide/GuideContext";
import { signOut } from "@/app/login/actions";

/** Slug ASCII d'un titre de groupe (« Activité » -> "activite") pour l'ancre data-g. */
function slugGroupe(titre: string): string {
  return titre.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Sidebar persistante (250px, fond canard #0E3947). Structure & groupes exacts
 * (MOCKUP_DIGEST §1). Badges dynamiques : masqués quand 0 (jamais "0").
 */
export function Sidebar({
  badges,
  profil,
  open,
  onNavigate,
}: {
  badges?: Partial<Record<"notifs" | "orders", number>>;
  profil?: { nom: string; role: string };
  open?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fz-scroll app-sidebar shrink-0 sticky top-0 flex flex-col${open ? " is-open" : ""}`}
      style={{ flex: "0 0 250px", width: 250, height: "100vh", background: "#0e3947", color: "#bfdce7", overflowY: "auto" }}
    >
      {/* En-tête logo */}
      <div className="flex items-center gap-3" style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <span
          className="shrink-0 grid place-items-center rounded-full overflow-hidden"
          style={{ width: 42, height: 42, background: "#f6f1e7", boxShadow: "0 0 0 2px rgba(255,255,255,.12)" }}
        >
          <Image src="/alm-mark.png" alt="A Léon Mange" width={42} height={42} style={{ objectFit: "cover" }} />
        </span>
        <div>
          <p className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "#f6f1e7", lineHeight: 1.1 }}>
            A Léon Mange
          </p>
          <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".18em", color: "#8fcfe2" }}>
            Atelier
          </p>
        </div>
      </div>

      {/* Nav — ancres data-g stables pour le guide d'onboarding (spotlight). */}
      <nav className="flex-1" style={{ padding: "14px 12px" }} data-g="nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.titre} data-g={`nav-${slugGroupe(group.titre)}`}>
            <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".12em", color: "#5c8593", margin: "10px 10px 4px" }}>
              {group.titre}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              const badgeVal = item.badge ? badges?.[item.badge] : undefined;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  data-g={`nav-${item.id}`}
                  className="flex items-center gap-[11px] w-full transition-all"
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    background: active ? "#1493be" : "transparent",
                    color: active ? "#f6f1e7" : "#bfdce7",
                  }}
                >
                  <span className="grid place-items-center shrink-0" style={{ width: 20 }}>
                    <Icon size={20} strokeWidth={1.9} />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                  {badgeVal && badgeVal > 0 && (
                    <span
                      className="font-mono ml-auto grid place-items-center rounded-full"
                      style={{ background: "#d81020", color: "#fff", fontSize: 10, minWidth: 18, height: 18, padding: "0 5px" }}
                    >
                      {badgeVal}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Entrée permanente du guide d'onboarding — « Guide · X% » (pied de sidebar). */}
      <GuideEntree onNavigate={onNavigate} />

      {/* Pied avatar — cliquable → Mon profil (handoff Profil & Stock §01) */}
      <div className="flex items-center gap-[10px]" style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <Link
          href="/profil"
          title="Mon profil"
          onClick={onNavigate}
          className="flex items-center gap-[10px] rounded-lg transition-colors hover:bg-white/10"
          style={{ minWidth: 0, flex: 1, padding: "3px 4px", margin: "-3px -4px" }}
        >
          <span
            className="shrink-0 grid place-items-center rounded-full font-display"
            style={{ width: 34, height: 34, background: "#3fa8ce", color: "#0e3947", fontWeight: 800, fontSize: 15 }}
          >
            {(profil?.nom ?? "A").charAt(0).toUpperCase()}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#f6f1e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {profil?.nom ?? "Compte propriétaire"}
            </p>
            <p style={{ fontSize: 11, color: "#8fcfe2" }}>{profil?.role ?? "A Léon Mange"}</p>
          </div>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            title="Se déconnecter"
            className="grid place-items-center rounded-lg transition-colors hover:bg-white/10"
            style={{ width: 30, height: 30, color: "#8fcfe2" }}
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Bouton « Guide · X% » — ouvre le hub du guide (progression via useGuide). */
function GuideEntree({ onNavigate }: { onNavigate?: () => void }) {
  const guide = useGuide();
  if (!guide) return null;
  return (
    <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
      <button
        type="button"
        data-g="nav-guide"
        onClick={() => {
          guide.ouvrirHub();
          onNavigate?.();
        }}
        className="flex items-center gap-[11px] w-full rounded-lg transition-colors hover:bg-white/10"
        style={{ padding: "9px 12px", color: "#bfdce7", cursor: "pointer", textAlign: "left" }}
      >
        <span className="grid place-items-center shrink-0" style={{ width: 20 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f0c173" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
        </span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Guide · {guide.pct}</span>
      </button>
    </div>
  );
}
