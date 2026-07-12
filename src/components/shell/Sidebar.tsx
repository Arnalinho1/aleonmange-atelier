"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/nav";

/**
 * Sidebar persistante (250px, fond canard #0E3947). Structure & groupes exacts
 * (MOCKUP_DIGEST §1). Badges dynamiques : masqués quand 0 (jamais "0").
 */
export function Sidebar({
  badges,
  profil,
}: {
  badges?: Partial<Record<"notifs" | "orders", number>>;
  profil?: { nom: string; role: string };
}) {
  const pathname = usePathname();

  return (
    <aside
      className="fz-scroll shrink-0 sticky top-0 flex flex-col"
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

      {/* Nav */}
      <nav className="flex-1" style={{ padding: "14px 12px" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.titre}>
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

      {/* Pied avatar */}
      <div className="flex items-center gap-[10px]" style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <span
          className="shrink-0 grid place-items-center rounded-full font-display"
          style={{ width: 34, height: 34, background: "#3fa8ce", color: "#0e3947", fontWeight: 800, fontSize: 15 }}
        >
          {(profil?.nom ?? "A").charAt(0).toUpperCase()}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: "#f6f1e7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profil?.nom ?? "Compte propriétaire"}
          </p>
          <p style={{ fontSize: 11, color: "#8fcfe2" }}>{profil?.role ?? "A Léon Mange"}</p>
        </div>
      </div>
    </aside>
  );
}
