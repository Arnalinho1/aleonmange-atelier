import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientSession } from "@/lib/supabase/session";
import { seDeconnecter } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mon compte" };

/**
 * Espace client (Vague 4) - version SOCLE (infra auth). Prouve, une fois
 * connecte : le rattachement au client (0039), l'isolation RLS (ne voit QUE ses
 * ventes) et la fidelite derivee (v_fidelite_client). La maquette CD complete
 * (d-compte : carte fidelite a tampons, chips, re-commande) arrive en Phase B.
 */
export default async function ComptePage() {
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/compte/connexion");

  // Rattachement idempotent : self-heal si le callback de confirmation a echoue.
  await supabase.rpc("web_rattacher_compte_client");

  const [{ data: client }, { data: ventes }, { data: fid }, { data: param }] = await Promise.all([
    supabase.from("client").select("id, nom, email, fidelite_opt_in, fidelite_opt_in_le").maybeSingle(),
    supabase
      .from("vente")
      .select("id, occurred_at, canal, fulfillment, refuse_le, montant_total")
      .order("occurred_at", { ascending: false })
      .limit(25),
    supabase.from("v_fidelite_client").select("passages, recompenses_utilisees").maybeSingle(),
    supabase.from("parametre_fidelite").select("seuil, recompense, actif").maybeSingle(),
  ]);

  const seuil = param?.seuil ?? 0;
  const passages = fid?.passages ?? 0;
  const disponibles = seuil > 0 ? Math.floor(passages / seuil) - (fid?.recompenses_utilisees ?? 0) : 0;

  return (
    <section className="mx-auto max-w-[760px] px-4 md:px-8 py-10 md:py-14">
      <div className="flex items-center justify-between gap-4 mb-1.5">
        <h1 className="font-display font-extrabold text-[26px] text-canard">Mon compte</h1>
        <form action={seDeconnecter}>
          <button className="text-[13px] font-semibold text-canard/60 hover:text-terracotta transition-colors">
            Se deconnecter
          </button>
        </form>
      </div>
      <p className="text-[14px] text-canard/70 mb-8">{client?.email ?? user.email}</p>

      {!client ? (
        <div className="rounded-2xl border border-bord bg-surface p-5 text-[14px] text-canard/80">
          Votre compte est confirme mais pas encore rattache a un client. Rechargez la page dans un
          instant, ou contactez-nous si cela persiste.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-bord bg-surface p-5 md:p-6 mb-6">
            <p className="font-mono uppercase text-[10px] tracking-[.14em] text-terracotta mb-2">
              Fidelite
            </p>
            {client.fidelite_opt_in ? (
              <p className="text-[15px] text-canard">
                <span className="font-display font-extrabold text-[22px]">{passages}</span>
                {seuil > 0 && <span className="text-canard/60"> / {seuil} retraits</span>}
                {disponibles > 0 && (
                  <span className="ml-2 rounded-pille bg-[var(--accent)]/12 px-2.5 py-1 text-[12.5px] font-bold text-canard">
                    {disponibles} recompense{disponibles > 1 ? "s" : ""} disponible
                    {disponibles > 1 ? "s" : ""} : {param?.recompense}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-[14px] text-canard/70">
                Vous ne participez pas encore au programme de fidelite.
              </p>
            )}
          </div>

          <p className="font-mono uppercase text-[10px] tracking-[.14em] text-terracotta mb-3">
            Mes commandes ({ventes?.length ?? 0})
          </p>
          <div className="flex flex-col gap-2">
            {(ventes ?? []).map((v) => (
              <div
                key={v.id as string}
                className="flex items-center justify-between gap-3 rounded-xl border border-bord bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-semibold text-canard">
                    {libelleCanal(v.canal as string)}
                    <span className="text-canard/50 font-normal">
                      {" "}
                      &middot; {formaterDate(v.occurred_at as string)}
                    </span>
                  </p>
                  <p className="text-[12.5px] text-canard/60">
                    {statutClient(v.fulfillment as string, v.refuse_le as string | null)}
                  </p>
                </div>
                <p className="text-[14px] font-display font-bold text-canard shrink-0">
                  {formaterMontant(v.montant_total)}
                </p>
              </div>
            ))}
            {(ventes?.length ?? 0) === 0 && (
              <p className="text-[14px] text-canard/60">Aucune commande pour le moment.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/** Statut VISIBLE au client. Regle verrouillee : une commande web non confirmee
 *  est TOUJOURS "En attente de confirmation par l'atelier", jamais "validee". */
function statutClient(fulfillment: string, refuseLe: string | null): string {
  if (fulfillment === "web_a_confirmer") {
    return refuseLe ? "Non confirmee" : "En attente de confirmation par l'atelier";
  }
  if (fulfillment === "remis") return "Retiree";
  if (fulfillment === "annule") return "Annulee";
  return "En cours de preparation";
}

function libelleCanal(canal: string): string {
  if (canal === "boutique") return "Boutique";
  if (canal === "truck") return "Food truck";
  if (canal === "traiteur") return "Traiteur";
  return canal;
}

function formaterDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

function formaterMontant(m: unknown): string {
  const n = typeof m === "number" ? m : Number(m ?? 0);
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
