import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clientSession } from "@/lib/supabase/session";
import { clientLecture } from "@/lib/supabase/serveur";
import { ProfilForm } from "./ProfilForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mon profil", robots: { index: false, follow: false } };

/** Profil, consentements et preferences (maquette CD d-profil). Preferences
 *  STOCKEES mais non exploitees en V1 (aucune personnalisation promise). */
export default async function ProfilPage() {
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/compte/connexion");
  await supabase.rpc("web_rattacher_compte_client");

  const [{ data: client }, { data: pref }] = await Promise.all([
    supabase
      .from("client")
      .select("id, nom, email, telephone, code_postal, fidelite_opt_in, fidelite_opt_in_le")
      .maybeSingle(),
    supabase.from("client_preference").select("gouts, emplacement_favori, frequence").maybeSingle(),
  ]);

  if (!client) redirect("/compte");

  // Emplacements truck reels (role site_lecteur) pour l'option "emplacement favori".
  const lecture = clientLecture();
  const { data: empl } = lecture
    ? await lecture.from("emplacement").select("libelle").eq("actif", true).order("libelle")
    : { data: null };
  const emplacements = Array.from(
    new Set(((empl ?? []) as { libelle: string | null }[]).map((e) => e.libelle).filter(Boolean) as string[])
  );

  const membreDepuis =
    client.fidelite_opt_in && client.fidelite_opt_in_le
      ? new Date(client.fidelite_opt_in_le).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      : null;
  const initiales = initialesDe(client.nom ?? client.email ?? "");

  return (
    <section className="mx-auto max-w-[1120px] px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-center gap-3.5 pb-5 border-b border-bord">
        <span className="w-[56px] h-[56px] rounded-full bg-canard text-white grid place-items-center font-display font-extrabold text-[20px]">
          {initiales}
        </span>
        <div>
          <h1 className="font-display font-extrabold text-[22px] text-canard tracking-[-.02em]">
            {client.nom || "Mon profil"}
          </h1>
          <p className="text-[13px] text-muet">
            {membreDepuis ? `Membre fidélité depuis ${membreDepuis}` : "Programme fidélité non activé"}
          </p>
        </div>
        <Link
          href="/compte"
          className="ml-auto inline-flex items-center gap-1.5 font-sans text-[13.5px] font-bold text-texte-2 hover:text-canard transition-colors"
        >
          <span aria-hidden>←</span> Tableau de bord
        </Link>
      </div>

      <ProfilForm
        client={{
          nom: client.nom ?? "",
          email: client.email ?? user.email ?? "",
          telephone: client.telephone ?? "",
          code_postal: client.code_postal ?? "",
          fidelite_opt_in: Boolean(client.fidelite_opt_in),
        }}
        preference={{
          gouts: (pref?.gouts as string[] | null) ?? [],
          emplacement_favori: (pref?.emplacement_favori as string | null) ?? "",
          frequence: (pref?.frequence as string | null) ?? "",
        }}
        emplacements={emplacements}
      />
    </section>
  );
}

function initialesDe(s: string): string {
  const mots = s.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}
