import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clientSession } from "@/lib/supabase/session";
import { seDeconnecter } from "./actions";
import { MesCommandes } from "./MesCommandes";
import { calculFidelite, type VenteClient } from "@/lib/commandes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mon compte" };

/** Espace client, tableau de bord (maquette CD d-compte) : carte de fidelite a
 *  tampons + "Mes commandes". Isolation RLS : ne lit QUE les donnees du client. */
export default async function ComptePage() {
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/compte/connexion");

  // Rattachement idempotent : self-heal si le callback de confirmation a echoue.
  await supabase.rpc("web_rattacher_compte_client");

  const [{ data: client }, { data: ventesData }, { data: fid }, { data: param }] = await Promise.all([
    supabase.from("client").select("id, nom, email, fidelite_opt_in").maybeSingle(),
    supabase
      .from("vente")
      .select("id, occurred_at, canal, fulfillment, refuse_le, montant_total, vente_ligne(libelle, qte, montant)")
      .order("occurred_at", { ascending: false })
      .limit(30),
    supabase.from("v_fidelite_client").select("passages, recompenses_utilisees").maybeSingle(),
    supabase.from("parametre_fidelite").select("seuil, recompense, actif").maybeSingle(),
  ]);

  if (!client) {
    return (
      <section className="mx-auto max-w-[760px] px-4 md:px-8 py-14">
        <div className="rounded-carte border border-bord-2 bg-surface p-6 text-[14px] text-texte-2">
          Votre compte est confirmé mais pas encore rattaché à un client. Rechargez la page dans un
          instant, ou contactez-nous si cela persiste.
        </div>
      </section>
    );
  }

  const ventes = (ventesData ?? []) as VenteClient[];
  const seuil = param?.seuil ?? 0;
  const reward = param?.recompense ?? "une récompense";
  const optIn = Boolean(client.fidelite_opt_in);
  const f = calculFidelite(fid?.passages ?? 0, seuil, fid?.recompenses_utilisees ?? 0);
  const prenom = (client.nom ?? "").trim().split(/\s+/)[0] || "vous";
  const initiales = initialesDe(client.nom ?? client.email ?? "");

  return (
    <section className="mx-auto max-w-[1180px] px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] text-muet">Bonjour</p>
          <h1 className="font-display font-extrabold text-[30px] text-canard tracking-[-.02em]">{prenom}</h1>
        </div>
        <span className="w-[46px] h-[46px] rounded-full bg-canard text-white grid place-items-center font-display font-extrabold text-[16px]">
          {initiales}
        </span>
      </div>

      <div className="grid md:grid-cols-[380px_1fr] gap-7 mt-5 items-start">
        {/* Colonne gauche : fidelite + navigation */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[22px] overflow-hidden bg-canard text-white relative shadow-[0_22px_40px_-26px_rgba(14,57,71,0.9)]">
            <div
              className="absolute -top-10 -right-8 w-[170px] h-[170px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(216,16,32,0.34), transparent 70%)" }}
            />
            <div className="px-[22px] pt-5 pb-1.5 relative">
              <p className="font-mono uppercase text-[10px] tracking-[.14em] text-[#8FB6C4]">
                Carte de fidélité
              </p>
              {optIn ? (
                <>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="font-display font-extrabold text-[40px] leading-none">{f.passages}</span>
                    <span className="text-[13px] text-[#B7D2DC]">passages</span>
                  </div>
                  {seuil > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3.5">
                      {Array.from({ length: seuil }).map((_, i) => (
                        <Tampon key={i} rempli={i < f.cycle} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[13.5px] text-[#C9DCE2] leading-[1.5] mt-3">
                  Rejoignez le programme depuis votre profil : vos passages seront comptés au retrait.
                </p>
              )}
            </div>

            {optIn && f.disponibles > 0 && (
              <div className="mx-4 mb-4 mt-3.5 px-4 py-3.5 rounded-[13px] bg-[var(--accent)]">
                <p className="font-display font-extrabold text-[15px]">
                  Récompense disponible{f.disponibles > 1 ? ` (${f.disponibles})` : ""}
                </p>
                <p className="text-[12.5px] text-white/90">{reward}, à votre prochain passage.</p>
              </div>
            )}
            {optIn && f.disponibles === 0 && seuil > 0 && (
              <div className="mx-4 mb-4 mt-3.5 px-[15px] py-[13px] rounded-[13px] bg-white/[.08]">
                <p className="text-[13.5px] leading-[1.45] text-[#EAF2F5]">
                  Plus que <strong className="text-white">{f.reste || seuil}</strong> avant votre
                  récompense : <strong className="text-white">{reward}</strong>.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-carte border border-bord-2 bg-surface px-[15px] py-3.5">
            <p className="text-[12px] text-muet leading-[1.5]">
              Comptés <strong className="text-texte-2">au retrait</strong>, boutique et food truck. Le
              traiteur n’est pas compté.
            </p>
            {seuil > 0 && (
              <p className="font-mono text-[10px] text-terracotta tracking-[.03em] mt-1.5">
                Exemple : {reward} tous les {seuil} passages, paramétrable.
              </p>
            )}
          </div>

          <nav className="flex flex-col gap-2">
            <span className="flex items-center gap-3 bg-canard text-white rounded-[14px] px-[15px] py-3.5">
              <span className="flex-1 font-display font-bold text-[14.5px]">Tableau de bord</span>
            </span>
            <Link
              href="/compte/profil"
              className="flex items-center gap-3 bg-surface border border-bord-2 rounded-[14px] px-[15px] py-3.5 hover:border-bord-4 transition-colors"
            >
              <span className="flex-1 font-display font-bold text-[14.5px] text-canard">Mon profil</span>
              <span className="text-bord-4 text-[18px]" aria-hidden>›</span>
            </Link>
            <Link
              href="/compte/profil#preferences"
              className="flex items-center gap-3 bg-surface border border-bord-2 rounded-[14px] px-[15px] py-3.5 hover:border-bord-4 transition-colors"
            >
              <span className="flex-1 font-display font-bold text-[14.5px] text-canard">Mes préférences</span>
              <span className="text-bord-4 text-[18px]" aria-hidden>›</span>
            </Link>
            <form action={seDeconnecter} className="mt-1">
              <button className="text-[13px] font-semibold text-muet hover:text-terracotta transition-colors px-[15px]">
                Se déconnecter
              </button>
            </form>
          </nav>
        </div>

        {/* Colonne droite : commandes */}
        <MesCommandes ventes={ventes} />
      </div>
    </section>
  );
}

function Tampon({ rempli }: { rempli: boolean }) {
  return (
    <span
      className={`w-[26px] h-[26px] rounded-full grid place-items-center ${
        rempli ? "bg-[var(--accent)] text-white" : "bg-white/10 text-white/30"
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

function initialesDe(s: string): string {
  const mots = s.trim().split(/\s+/).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}
