import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";

/**
 * Shell commun à tous les écrans : sidebar persistante + topbar + zone contenu.
 * Les badges (notifs non lues, commandes ouvertes) et le profil seront câblés
 * sur Supabase une fois la base branchée ; ici, valeurs par défaut (état vide :
 * badges masqués, jamais "0").
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto" style={{ padding: "clamp(20px,3vw,34px)" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
