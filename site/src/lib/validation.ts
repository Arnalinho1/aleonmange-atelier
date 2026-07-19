import "server-only";
import { z } from "zod";

/**
 * Schemas de validation des entrees PUBLIQUES (zod). Le client n'envoie JAMAIS
 * de prix : une ligne = un produit_id + une quantite (piece) OU un poids (g).
 * Le montant est recalcule cote base (RPC web_creer_precommande). Le moyen de
 * paiement n'est pas choisi (paiement au retrait) : la route pose 'especes'.
 */

const ligneSchema = z
  .object({
    produit_id: z.uuid(),
    qte: z.number().int().positive().max(99).optional(),
    poids_g: z.number().int().positive().max(50_000).optional(),
  })
  .refine((l) => (l.qte == null) !== (l.poids_g == null), {
    message: "Une ligne porte soit une quantite, soit un poids.",
  });

const contactSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  email: z.email().max(180),
  telephone: z.string().trim().max(30).optional(),
});

/** Precommande boutique (creneau ISO) OU truck (code emplacement). */
export const commandeSchema = z
  .object({
    canal: z.enum(["boutique", "truck"]),
    creneau: z.iso.datetime({ offset: true }).optional(), // boutique : creneau choisi
    emplacement_code: z.string().trim().max(60).optional(), // truck : marche choisi
    client: contactSchema,
    lignes: z.array(ligneSchema).min(1).max(40),
  })
  .refine((c) => (c.canal === "boutique" ? !!c.creneau : true), {
    message: "Creneau de retrait requis pour la boutique.",
  })
  .refine((c) => (c.canal === "truck" ? !!c.emplacement_code : true), {
    message: "Emplacement requis pour le truck.",
  });

export const devisSchema = z.object({
  type_evenement: z.string().trim().max(120).optional(),
  date_evenement: z.iso.date().optional(),
  nb_convives: z.number().int().positive().max(100_000).optional(),
  budget_indicatif: z.string().trim().max(60).optional(),
  description: z.string().trim().max(4000).optional(),
  contact_nom: z.string().trim().min(1).max(120),
  contact_email: z.email().max(180),
  contact_telephone: z.string().trim().max(30).optional(),
});

export const newsletterSchema = z.object({
  email: z.email().max(180),
});

export type CommandePayload = z.infer<typeof commandeSchema>;
export type DevisPayload = z.infer<typeof devisSchema>;
