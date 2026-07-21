import { Carte, SurTitre, BoutonPille } from "@/components/ui";
import { clientEcriture } from "@/lib/supabase/ecrivain";

export const metadata = {
  title: "Confirmation de votre interet",
  robots: { index: false },
};
export const dynamic = "force-dynamic"; // confirmation = ecriture, jamais mise en cache

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Etat = "confirme" | "deja" | "inconnu" | "erreur";

const MESSAGES: Record<Etat, { titre: string; texte: string }> = {
  confirme: { titre: "C'est note !", texte: "Merci : votre interet pour le Panier frais du Beaujolais est bien enregistre. On vous ecrit des qu'il est lance. Ce n'est pas une reservation, juste un coup de pouce pour preparer le lancement." },
  deja: { titre: "Deja enregistre", texte: "Votre interet etait deja confirme. Rien de plus a faire : on vous previent au lancement." },
  inconnu: { titre: "Lien invalide", texte: "Ce lien de confirmation n'est pas reconnu ou a expire. Reinscrivez-vous depuis la boutique pour recevoir un nouveau lien." },
  erreur: { titre: "Une erreur est survenue", texte: "La confirmation n'a pas pu aboutir. Reessayez dans un instant depuis le lien de votre email." },
};

export default async function ConfirmerPanierFrais({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let etat: Etat = "erreur";

  if (token && UUID.test(token)) {
    const ecriture = clientEcriture();
    if (ecriture) {
      const { data, error } = await ecriture.rpc("web_confirmer_panier_frais", { p_token: token });
      if (!error && (data === "confirme" || data === "deja" || data === "inconnu")) etat = data;
    }
  } else if (token !== undefined) {
    etat = "inconnu";
  }

  const m = MESSAGES[etat];
  return (
    <section className="mx-auto max-w-[640px] px-4 md:px-8 py-16 md:py-24">
      <SurTitre>Panier frais du Beaujolais</SurTitre>
      <Carte className="mt-4 p-8 text-center">
        <h1 className="font-display font-extrabold text-[clamp(22px,4vw,30px)] text-canard leading-tight">{m.titre}</h1>
        <p className="text-[14.5px] text-texte-2 mt-3 leading-relaxed">{m.texte}</p>
        <div className="mt-6">
          <BoutonPille href="/boutique" variante="accent">Retour a la boutique</BoutonPille>
        </div>
      </Carte>
    </section>
  );
}
