"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, CheckCircle2 } from "lucide-react";
import { CANAL_COLOR, CANAL_LABEL, CATEGORIE_COLOR, CATEGORIE_LABEL, PAIEMENT_LABEL } from "@/lib/nav";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { fmtEuro } from "@/lib/calculs";
import type {
  Canal,
  CategorieComposant,
  Composant,
  Emplacement,
  Client,
  ModeVente,
  Origine,
  Paiement,
  Produit,
} from "@/lib/supabase/database.types";
import { createVente } from "./actions";
import { NewClientDrawer } from "./NewClientDrawer";

const CATEGORIES: CategorieComposant[] = ["proteine", "feculent", "legume", "sauce"];
const ORIGINE_LABEL: Record<Origine, string> = {
  spontane: "Spontané",
  insta: "Vu sur Insta",
  tiktok: "Vu sur TikTok",
  facebook: "Vu sur Facebook",
  code: "Code promo",
};
/** Défaut de paiement par canal (Contrat §04). */
const PAIEMENT_DEFAUT: Record<Canal, Paiement> = { truck: "especes", boutique: "cb", traiteur: "virement" };

type BowlEnCours = Record<CategorieComposant, string | "">;

/** Un bowl ajouté au panier (qte 1 par entrée — composition individuelle). */
type BowlPanier = { key: number; produit_id: string; composants: BowlEnCours; libre: boolean };

export function SaleComposer({
  canalInitial,
  produits,
  composants,
  emplacements,
  clients,
  compositionParProduit,
  jourSemaineAuj,
}: {
  /** Préférence perso « canal par défaut » (null = ask, comportement standard). */
  canalInitial: Canal | null;
  produits: Produit[];
  composants: Composant[];
  emplacements: Emplacement[];
  clients: Client[];
  /** Composition signature (1 composant par catégorie) issue de la fiche liée. */
  compositionParProduit: Record<string, Partial<Record<CategorieComposant, string>>>;
  /** 1=lundi … 7=dimanche, calculé serveur en Europe/Paris (badge « AUJ. »). */
  jourSemaineAuj: number;
}) {
  const router = useRouter();
  const [canal, setCanal] = useState<Canal>(canalInitial ?? "truck");
  const [modeVente, setModeVente] = useState<ModeVente>(
    (canalInitial ?? "truck") === "traiteur" ? "precommande" : "instantane"
  );
  const [emplacementId, setEmplacementId] = useState<string>("");
  const [qtyParProduit, setQtyParProduit] = useState<Record<string, number>>({});
  const [poidsParProduit, setPoidsParProduit] = useState<Record<string, string>>({});
  const [bowls, setBowls] = useState<BowlPanier[]>([]);
  const [bowlKey, setBowlKey] = useState(1);
  const [clientId, setClientId] = useState("");
  /** Clients créés depuis le drawer local, en attendant que router.refresh() resynchronise la prop. */
  const [clientsExtra, setClientsExtra] = useState<{ id: string; nom: string; type: string }[]>([]);
  const [couverts, setCouverts] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueHeure, setDueHeure] = useState("");
  const [paiement, setPaiement] = useState<Paiement>(PAIEMENT_DEFAUT[canalInitial ?? "truck"]);
  const [origine, setOrigine] = useState<Origine>("spontane");
  const [error, setError] = useState<string | undefined>();
  const [confirmation, setConfirmation] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // Guide d'onboarding (B4) : préremplissage d'une vente de démonstration.
  // L'événement remplit l'ÉTAT CONTRÔLÉ (canal, panier, emplacement du jour) —
  // AUCUNE écriture : le chef encaisse lui-même par le parcours normal.
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const d = (e as CustomEvent<{ canal?: Canal; produit?: string; qte?: number }>).detail ?? {};
      const canalCible: Canal = d.canal ?? "truck";
      const produit = produits.find((p) => p.canal === canalCible && p.nom === d.produit);
      if (!produit) return;
      setCanal(canalCible);
      setModeVente(canalCible === "traiteur" ? "precommande" : "instantane");
      setPaiement(PAIEMENT_DEFAUT[canalCible]);
      setPoidsParProduit({});
      setBowls([]);
      setQtyParProduit({ [produit.id]: d.qte ?? 1 });
      if (canalCible === "truck") {
        const actifs = emplacements.filter((emp) => emp.actif);
        const emp = actifs.find((x) => x.jour_semaine === jourSemaineAuj) ?? actifs[0];
        if (emp) setEmplacementId(emp.id);
      }
      setError(undefined);
    };
    window.addEventListener("alm:guide:prefill-vente", onPrefill);
    return () => window.removeEventListener("alm:guide:prefill-vente", onPrefill);
  }, [produits, emplacements, jourSemaineAuj]);

  const prodParId = useMemo(() => new Map(produits.map((p) => [p.id, p])), [produits]);
  // Props serveur + créations locales dédupliquées : la value du select est toujours présente (aucun flash).
  const optionsClients = useMemo(() => {
    const vus = new Set(clients.map((c) => c.id));
    return [
      ...clients.map((c) => ({ id: c.id, nom: c.nom, type: c.type as string })),
      ...clientsExtra.filter((c) => !vus.has(c.id)),
    ];
  }, [clients, clientsExtra]);
  const duCanal = produits.filter((p) => p.canal === canal);
  const bowlsCatalogue = duCanal.filter((p) => p.is_bowl && p.mode === "unite");
  const finis = duCanal.filter((p) => !p.is_bowl);

  function switchCanal(c: Canal) {
    setCanal(c);
    // Le mode est SAISI mais contraint : truck=instantané, traiteur=précommande.
    setModeVente(c === "truck" ? "instantane" : c === "traiteur" ? "precommande" : "instantane");
    setPaiement(PAIEMENT_DEFAUT[c]);
    // Changer de canal vide le panier (catalogues distincts) et l'emplacement.
    setQtyParProduit({});
    setPoidsParProduit({});
    setBowls([]);
    if (c !== "truck") setEmplacementId("");
    setError(undefined);
  }

  function bump(produitId: string, delta: number) {
    setQtyParProduit((s) => {
      const next = Math.max(0, (s[produitId] ?? 0) + delta);
      const copy = { ...s };
      if (next === 0) delete copy[produitId];
      else copy[produitId] = next;
      return copy;
    });
  }

  function ajouterBowl(produit: Produit) {
    const signature = compositionParProduit[produit.id] ?? {};
    const composition: BowlEnCours = { proteine: "", feculent: "", legume: "", sauce: "" };
    for (const cat of CATEGORIES) composition[cat] = signature[cat] ?? "";
    setBowls((s) => [...s, { key: bowlKey, produit_id: produit.id, composants: composition, libre: false }]);
    setBowlKey((k) => k + 1);
  }

  function changerComposant(key: number, cat: CategorieComposant, composantId: string) {
    setBowls((s) =>
      s.map((b) => {
        if (b.key !== key) return b;
        const composants = { ...b.composants, [cat]: composantId };
        const signature = compositionParProduit[b.produit_id] ?? {};
        const libre = CATEGORIES.some((c) => (signature[c] ?? "") !== composants[c]);
        return { ...b, composants, libre };
      })
    );
  }

  // ── Total affiché (indicatif) — le montant réel est recalculé côté serveur.
  const lignesAffichees = useMemo(() => {
    const out: { libelle: string; detail?: string; montant: number }[] = [];
    for (const [id, qte] of Object.entries(qtyParProduit)) {
      const p = prodParId.get(id);
      if (p?.prix_unitaire != null) out.push({ libelle: `${qte} × ${p.nom}`, montant: p.prix_unitaire * qte });
    }
    for (const [id, g] of Object.entries(poidsParProduit)) {
      const p = prodParId.get(id);
      const grammes = Number(g.replace(",", "."));
      if (p?.prix_kg != null && Number.isFinite(grammes) && grammes > 0)
        out.push({ libelle: p.nom, detail: `${grammes} g × ${fmtEuro(p.prix_kg)} €/kg`, montant: (p.prix_kg * grammes) / 1000 });
    }
    for (const b of bowls) {
      const p = prodParId.get(b.produit_id);
      if (p?.prix_unitaire != null)
        out.push({ libelle: p.nom, detail: b.libre ? "composition libre" : "signature", montant: p.prix_unitaire });
    }
    return out;
  }, [qtyParProduit, poidsParProduit, bowls, prodParId]);

  const total = lignesAffichees.reduce((acc, l) => acc + l.montant, 0);
  const panierVide = lignesAffichees.length === 0;
  const bowlIncomplet = bowls.some((b) => CATEGORIES.some((c) => !b.composants[c]));

  function encaisser() {
    const payload = {
      canal,
      mode_vente: modeVente,
      emplacement_id: canal === "truck" ? emplacementId || null : null,
      client_id: clientId || null,
      moyen_paiement: paiement,
      origine,
      couverts: canal === "traiteur" && couverts ? Number(couverts) : null,
      due_date: modeVente === "precommande" ? dueDate || null : null,
      due_heure: modeVente === "precommande" ? dueHeure || null : null,
      lignes: [
        ...Object.entries(qtyParProduit).map(([produit_id, qte]) => ({ produit_id, qte })),
        ...Object.entries(poidsParProduit)
          .filter(([, g]) => Number(g.replace(",", ".")) > 0)
          .map(([produit_id, g]) => ({ produit_id, poids_g: Number(g.replace(",", ".")) })),
        ...bowls.map((b) => ({
          produit_id: b.produit_id,
          qte: 1,
          composants: CATEGORIES.map((c) => b.composants[c]).filter(Boolean),
          composition_libre: b.libre,
        })),
      ],
    };
    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    startTransition(async () => {
      const res = await createVente(undefined, fd);
      if (res?.error) {
        setError(res.error);
        setConfirmation(undefined);
      } else {
        setError(undefined);
        // Guide d'onboarding (B4) : confirme la réussite RÉELLE de la saisie
        // (émis seulement après un createVente OK — jamais sur simple clic).
        window.dispatchEvent(new CustomEvent("alm:guide:vente-ok"));
        setConfirmation(
          `Vente enregistrée — ${fmtEuro(total)} € · ${CANAL_LABEL[canal]} · ${
            modeVente === "instantane" ? "remise immédiate" : "envoyée en production"
          }`
        );
        setQtyParProduit({});
        setPoidsParProduit({});
        setBowls([]);
        setCouverts("");
        setDueDate("");
        setDueHeure("");
        setClientId("");
        setOrigine("spontane");
        // PAS de router.refresh() ici : le refresh en pleine rafale d'encaissements
        // avale les clics suivants (état perdu pendant la fenêtre de re-render).
        // revalidatePath côté action suffit — badges et écrans se rafraîchissent
        // à la prochaine navigation.
      }
    });
  }

  const empActifs = emplacements.filter((e) => e.actif);

  return (
    <>
      {/* Onglets canal — data-g : cible du guide d'onboarding (B4). */}
      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 12 }} data-g="saisie-canaux">
        {(["truck", "boutique", "traiteur"] as const).map((c) => (
          <button
            key={c}
            onClick={() => switchCanal(c)}
            className="flex items-center gap-1.5"
            style={{
              padding: "8px 14px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 600,
              border: canal === c ? "1px solid transparent" : "1px solid #dfd4bf",
              background: canal === c ? "#0e3947" : "#fbf8f1",
              color: canal === c ? "#f6f1e7" : "#6b7469",
            }}
          >
            <Dot color={CANAL_COLOR[c]} />
            {CANAL_LABEL[c]}
          </button>
        ))}
      </div>

      {/* Mode de vente : saisi (jamais dérivé du canal) mais contraint par lui */}
      <div className="flex gap-2 flex-wrap items-center" style={{ marginBottom: 14 }}>
        {(["instantane", "precommande"] as const).map((mv) => {
          const bloque = (canal === "truck" && mv === "precommande") || (canal === "traiteur" && mv === "instantane");
          return (
            <button
              key={mv}
              disabled={bloque}
              onClick={() => setModeVente(mv)}
              style={{
                padding: "8px 13px",
                borderRadius: 11,
                fontSize: 12.5,
                fontWeight: 600,
                textAlign: "left",
                border: modeVente === mv ? "1px solid #1493be" : "1px solid #dfd4bf",
                background: modeVente === mv ? "rgba(20,147,190,.1)" : "#fbf8f1",
                color: bloque ? "#c9c1ae" : modeVente === mv ? "#1493be" : "#6b7469",
                cursor: bloque ? "not-allowed" : "pointer",
              }}
            >
              <span style={{ display: "block" }}>{mv === "instantane" ? "Vente instantanée" : "Commande à produire"}</span>
              <span className="font-mono" style={{ fontSize: 9.5, letterSpacing: ".05em" }}>
                {mv === "instantane" ? "comptoir → remis" : "précommande → a_produire"}
              </span>
            </button>
          );
        })}
        <span className="font-mono" style={{ fontSize: 10.5, color: "#a79b84" }}>
          → destination : {modeVente === "instantane" ? "CA du jour (remis)" : "file de production"}
        </span>
      </div>

      {/* Session truck : emplacement obligatoire */}
      {canal === "truck" && (
        <div style={{ background: "#f1ead9", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
          <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#b07a2e", marginBottom: 8 }}>
            Session truck · emplacement
          </p>
          <div className="flex gap-2 flex-wrap">
            {empActifs.map((e) => (
              <button
                key={e.id}
                onClick={() => setEmplacementId(e.id)}
                className="flex items-center gap-1.5"
                style={{
                  padding: "6px 12px",
                  borderRadius: 100,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: emplacementId === e.id ? "1px solid transparent" : "1px solid #e4d3ae",
                  background: emplacementId === e.id ? "#b07a2e" : "#fbf8f1",
                  color: emplacementId === e.id ? "#fff" : "#8a6f34",
                }}
              >
                {e.libelle}
                {e.jour_semaine === jourSemaineAuj && (
                  <span className="font-mono" style={{ fontSize: 9, background: "rgba(216,16,32,.85)", color: "#fff", borderRadius: 100, padding: "1px 6px" }}>
                    AUJ.
                  </span>
                )}
              </button>
            ))}
            {empActifs.length === 0 && (
              <span style={{ fontSize: 12.5, color: "#8a6f34" }}>
                Aucun emplacement actif — <Link href="/settings" style={{ color: "#b00d1a", fontWeight: 600 }}>gérez-les dans Réglages</Link>.
              </span>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: 16,
          alignItems: "start",
          // Saisie gelée pendant l'écriture : le reset du panier au retour de
          // l'action ne peut jamais avaler des clics partis entre-temps.
          pointerEvents: pending ? "none" : "auto",
          opacity: pending ? 0.7 : 1,
        }}
        className="fz-users-grid"
      >
        {/* ── Colonne composition */}
        <div className="flex flex-col gap-4">
          {duCanal.length === 0 ? (
            <Card style={{ padding: 24 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0e3947", marginBottom: 4 }}>
                Aucun produit sur ce canal
              </p>
              <p style={{ fontSize: 13, color: "#6b7469" }}>
                Le catalogue {CANAL_LABEL[canal]} est vide —{" "}
                <Link href="/catalog" style={{ color: "#1493be", fontWeight: 600 }}>ajoutez-en au Catalogue</Link>.
              </p>
            </Card>
          ) : (
            <>
              {bowlsCatalogue.length > 0 && (
                <Card style={{ padding: 16 }}>
                  <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 10 }}>
                    Bowls — 1 choix par catégorie
                  </p>
                  <div className="flex gap-2 flex-wrap" style={{ marginBottom: bowls.length ? 12 : 0 }}>
                    {bowlsCatalogue.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => ajouterBowl(p)}
                        className="flex items-center gap-1.5"
                        style={{ padding: "8px 13px", borderRadius: 11, fontSize: 13, fontWeight: 600, border: "1px solid #dfd4bf", background: "#fbf8f1", color: "#0e3947" }}
                      >
                        <Plus size={14} strokeWidth={2.4} style={{ color: "#1493be" }} />
                        {p.nom}
                        <span className="font-mono" style={{ fontSize: 11, color: "#9a927f" }}>
                          {p.prix_unitaire != null ? `${fmtEuro(p.prix_unitaire)} €` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                  {bowls.map((b) => {
                    const p = prodParId.get(b.produit_id);
                    return (
                      <div key={b.key} style={{ background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0e3947", flex: 1 }}>{p?.nom}</span>
                          {b.libre ? <Badge tone="alerte">Composition libre</Badge> : <Badge tone="info">Signature</Badge>}
                          <button onClick={() => setBowls((s) => s.filter((x) => x.key !== b.key))} style={{ fontSize: 12, color: "#c0442e", fontWeight: 600 }}>
                            Retirer
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
                          {CATEGORIES.map((cat) => (
                            <div key={cat}>
                              <p className="font-mono uppercase flex items-center gap-1" style={{ fontSize: 9, letterSpacing: ".08em", color: "#a79b84", marginBottom: 4 }}>
                                <Dot color={CATEGORIE_COLOR[cat]} size={6} /> {CATEGORIE_LABEL[cat]}
                              </p>
                              <select
                                value={b.composants[cat]}
                                onChange={(e) => changerComposant(b.key, cat, e.target.value)}
                                className="outline-none"
                                style={{ width: "100%", background: "#fff", border: b.composants[cat] ? "1px solid #dfd4bf" : "1px solid #e9a23b", borderRadius: 9, padding: "7px 8px", fontSize: 12.5, color: "#0e3947" }}
                              >
                                <option value="">— au choix —</option>
                                {composants.filter((c) => c.categorie === cat).map((c) => (
                                  <option key={c.id} value={c.id}>{c.nom}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </Card>
              )}

              {finis.length > 0 && (
                <Card style={{ padding: 16 }}>
                  <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 10 }}>
                    {canal === "truck" ? "Produits à emporter" : canal === "boutique" ? "Produits boutique" : "Plats & plateaux"}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
                    {finis.map((p) => (
                      <div key={p.id} style={{ background: "#fbf8f1", border: "1px solid #e4dac6", borderRadius: 11, padding: "10px 12px" }}>
                        <div className="flex items-center justify-between gap-2" style={{ marginBottom: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0e3947" }}>{p.nom}</span>
                          <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: "#0e3947", whiteSpace: "nowrap" }}>
                            {p.mode === "unite" ? `${fmtEuro(p.prix_unitaire ?? 0)} €` : `${fmtEuro(p.prix_kg ?? 0)} €/kg`}
                          </span>
                        </div>
                        {p.mode === "unite" ? (
                          <div className="flex items-center gap-3">
                            <button onClick={() => bump(p.id, -1)} className="grid place-items-center" style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #dfd4bf", background: "#fff", color: "#6b7469" }}>
                              <Minus size={14} />
                            </button>
                            <span className="font-mono" style={{ fontSize: 15, fontWeight: 700, color: "#0e3947", minWidth: 20, textAlign: "center" }}>
                              {qtyParProduit[p.id] ?? 0}
                            </span>
                            <button onClick={() => bump(p.id, 1)} className="grid place-items-center" style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #dfd4bf", background: "#fff", color: "#1493be" }}>
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              value={poidsParProduit[p.id] ?? ""}
                              onChange={(e) => setPoidsParProduit((s) => ({ ...s, [p.id]: e.target.value }))}
                              placeholder="0"
                              inputMode="decimal"
                              className="outline-none font-mono"
                              style={{ width: 80, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 8, padding: "6px 8px", fontSize: 13, textAlign: "right", color: "#0e3947" }}
                            />
                            <span className="font-mono" style={{ fontSize: 11.5, color: "#9a927f" }}>g (pesée réelle)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {canal === "traiteur" && (
                <Card style={{ padding: 16 }}>
                  <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 10 }}>
                    Événement traiteur
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <label className="flex flex-col gap-1">
                      <span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".08em", color: "#9a927f" }}>Convives</span>
                      <input value={couverts} onChange={(e) => setCouverts(e.target.value)} type="number" min={1} placeholder="ex : 40" className="outline-none" style={{ width: 110, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "8px 10px", fontSize: 13.5, color: "#0e3947" }} />
                    </label>
                  </div>
                </Card>
              )}

              {modeVente === "precommande" && (
                <Card style={{ padding: 16 }}>
                  <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 10 }}>
                    Remise prévue (file de production)
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <label className="flex flex-col gap-1">
                      <span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".08em", color: "#9a927f" }}>Date *</span>
                      <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="outline-none" style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "8px 10px", fontSize: 13.5, color: "#0e3947" }} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".08em", color: "#9a927f" }}>Créneau</span>
                      <input value={dueHeure} onChange={(e) => setDueHeure(e.target.value)} type="time" className="outline-none" style={{ background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "8px 10px", fontSize: 13.5, color: "#0e3947" }} />
                    </label>
                  </div>
                </Card>
              )}

              {/* data-g : cible du guide d'onboarding (B4, fidélité = client rattaché). */}
              <div data-g="saisie-fidelite">
              <Card style={{ padding: 16 }}>
                <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 10 }}>
                  Client {canal === "boutique" && "(optionnel — comptoir anonyme)"}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="outline-none"
                    style={{ minWidth: 220, background: "#fff", border: "1px solid #dfd4bf", borderRadius: 9, padding: "8px 10px", fontSize: 13.5, color: "#0e3947" }}
                  >
                    <option value="">— anonyme —</option>
                    {optionsClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}{c.type === "pro" ? " (pro)" : ""}</option>
                    ))}
                  </select>
                  <NewClientDrawer
                    onCreated={(c) => {
                      setClientsExtra((s) => [...s, c]);
                      setClientId(c.id);
                      // Resynchronise la prop clients ; l'état de la vente en cours (useState) survit.
                      router.refresh();
                    }}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  <p className="font-mono uppercase flex items-center gap-2" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 8 }}>
                    Origine de la vente <Badge tone="demo">Proxy déclaratif</Badge>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(ORIGINE_LABEL) as Origine[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => setOrigine(o)}
                        style={{
                          padding: "5px 11px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                          border: origine === o ? "1px solid transparent" : "1px solid #dfd4bf",
                          background: origine === o ? "#0e3947" : "#fbf8f1",
                          color: origine === o ? "#f6f1e7" : "#6b7469",
                        }}
                      >
                        {ORIGINE_LABEL[o]}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11.5, color: "#9a927f", marginTop: 6 }}>Alimente l&apos;attribution social → ventes.</p>
                </div>
              </Card>
              </div>
            </>
          )}
        </div>

        {/* ── Colonne récap (sticky) */}
        <div style={{ position: "sticky", top: 16 }} className="flex flex-col gap-3 fz-unsticky">
          <div style={{ background: "#0e3947", borderRadius: 16, padding: 18 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
              <Dot color={CANAL_COLOR[canal]} />
              <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: ".1em", color: "#8fcfe2" }}>
                {CANAL_LABEL[canal]}
                {canal === "truck" && emplacementId && ` · ${empActifs.find((e) => e.id === emplacementId)?.libelle ?? ""}`}
              </span>
            </div>
            {panierVide ? (
              <p style={{ fontSize: 13, color: "#bfdce7", padding: "14px 0" }}>Panier vide — composez la vente à gauche.</p>
            ) : (
              <div className="flex flex-col" style={{ marginBottom: 8 }}>
                {lignesAffichees.map((l, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2" style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#f6f1e7" }}>{l.libelle}</p>
                      {l.detail && <p className="font-mono" style={{ fontSize: 10, color: "#8fcfe2" }}>{l.detail}</p>}
                    </div>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: "#f6f1e7", whiteSpace: "nowrap" }}>
                      {fmtEuro(l.montant)} €
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-baseline justify-between" style={{ marginTop: 10 }}>
              <span className="font-mono uppercase" style={{ fontSize: 10.5, letterSpacing: ".1em", color: "#8fcfe2" }}>Total</span>
              <span className="font-display" style={{ fontSize: 32, fontWeight: 800, color: "#f6f1e7" }}>{fmtEuro(total)} €</span>
            </div>
            <p className="font-mono" style={{ fontSize: 10, color: "#5c8593", marginTop: 2 }}>
              montant recalculé en base à l&apos;encaissement
            </p>
          </div>

          <Card style={{ padding: 16 }}>
            <p className="font-mono uppercase" style={{ fontSize: 9.5, letterSpacing: ".09em", color: "#a79b84", marginBottom: 8 }}>
              Moyen de paiement
            </p>
            <div className="flex gap-2 flex-wrap" style={{ marginBottom: 14 }}>
              {(Object.keys(PAIEMENT_LABEL) as Paiement[]).map((mp) => (
                <button
                  key={mp}
                  onClick={() => setPaiement(mp)}
                  style={{
                    padding: "6px 12px", borderRadius: 100, fontSize: 12.5, fontWeight: 600,
                    border: paiement === mp ? "1px solid transparent" : "1px solid #dfd4bf",
                    background: paiement === mp ? "#0e3947" : "#fbf8f1",
                    color: paiement === mp ? "#f6f1e7" : "#6b7469",
                  }}
                >
                  {PAIEMENT_LABEL[mp]}
                </button>
              ))}
            </div>

            {error && (
              <p style={{ fontSize: 12.5, color: "#c0442e", background: "rgba(192,68,46,.1)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                {error}
              </p>
            )}
            {confirmation && !error && (
              <p className="flex items-center gap-2" style={{ fontSize: 12.5, color: "#1f7a50", background: "#e9f3ec", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
                <CheckCircle2 size={15} /> {confirmation}
              </p>
            )}

            <button
              onClick={encaisser}
              disabled={pending || panierVide || bowlIncomplet || (canal === "truck" && !emplacementId)}
              data-g="saisie-encaisser"
              className="font-display transition-opacity hover:opacity-90"
              style={{
                width: "100%", padding: "13px", borderRadius: 12, background: "#d81020", color: "#f6f1e7",
                fontWeight: 700, fontSize: 16,
                opacity: pending || panierVide || bowlIncomplet || (canal === "truck" && !emplacementId) ? 0.45 : 1,
                cursor: pending || panierVide || bowlIncomplet || (canal === "truck" && !emplacementId) ? "not-allowed" : "pointer",
              }}
            >
              {pending ? "…" : modeVente === "instantane" ? "Encaisser" : "Enregistrer la commande"}
            </button>
            <p style={{ fontSize: 11, color: "#9a927f", marginTop: 8 }}>
              {bowlIncomplet
                ? "Complétez la composition des bowls (1 choix par catégorie)."
                : canal === "truck" && !emplacementId
                  ? "Choisissez l'emplacement de la session truck."
                  : modeVente === "instantane"
                    ? "Écrit la vente (occurred_at = maintenant, Europe/Paris) en fulfillment « remis »."
                    : "Crée la commande en « à produire » — visible dans Commandes du jour."}
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
