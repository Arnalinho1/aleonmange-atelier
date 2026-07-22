# Veille concurrentielle (Scrapling) — tools/scraping

Outillage **Python isolé** des apps du repo : son venv vit ici, **zéro contact** avec
les apps Next.js, `package.json` ou les builds Vercel (le dossier `tools/` est hors
des périmètres des Ignored Build Steps des 2 projets).

Usage visé : 1) parser les prix des concurrents locaux (traiteurs, restaurants,
food trucks du Beaujolais) ; 2) suivre leurs cartes dans le temps (diff entre deux
relevés datés) ; 3) vérifications SEO on-page ponctuelles. Le suivi SEO lourd
(positions, backlinks, volumes) reste sur Ahrefs / Semrush / DataForSEO côté
coordination : ne rien construire en doublon ici.

## Installation

```bash
cd tools/scraping
python3 -m venv .venv               # Python 3.10+ requis
source .venv/bin/activate
pip install -r requirements.txt
scrapling install                   # dépendances navigateur des fetchers (quelques minutes)
```

Vérification rapide :

```bash
python -c "import scrapling; print(scrapling.__version__)"
```

## Scripts

### `scripts/parse_prix.py` — relevé des prix

```bash
python scripts/parse_prix.py                          # tous les concurrents de config/concurrents.yml
python scripts/parse_prix.py --only "Nom"             # un seul concurrent
python scripts/parse_prix.py --url URL --nom "Nom"    # essai one-off sans toucher au YAML
```

- Lit `config/concurrents.yml` (**livré vide** : le remplissage des vrais
  concurrents est un geste d'Arnaud). Par concurrent : fetcher `simple` (site
  statique, défaut) ou `dynamic` (site JavaScript, navigateur), et sélecteurs CSS
  optionnels si les heuristiques ne suffisent pas.
- Extraction volontairement **brute** (nom du plat, prix, catégorie si détectable) :
  l'analyse fine se fait après, sur les fichiers.
- Sortie : `data/prix_YYYY-MM-DD.json` : **un nouveau fichier par run, jamais
  d'écrasement** (suffixe horaire si relance le même jour). Format : voir
  `data/exemple_format.json` (committé ; les vrais relevés sont gitignorés).

### `scripts/diff_prix.py` — comparaison dans le temps

```bash
python scripts/diff_prix.py data/prix_2026-07-22.json data/prix_2026-08-01.json
```

Sort les **nouveaux plats**, les **plats disparus** et les **prix changés**
(clé : concurrent + plat normalisé).

## Règles de politesse (NON NÉGOCIABLES)

1. **robots.txt respecté** : un site qui interdit est sauté, jamais forcé.
2. **1 requête par site à la fois**, délai aléatoire de **2 à 5 s entre toutes les
   requêtes** (robots.txt compris).
3. **User-agent honnête** (`ALMVeille/0.1`, identité + contact), zéro faux référeur,
   zéro camouflage (`stealthy_headers=False`, `impersonate=None`, `google_search=False`).
4. **Exécutions manuelles ponctuelles** : PAS de cron pour l'instant.
5. **Usage = veille interne uniquement** : jamais de republication des contenus
   scrapés, nulle part.

Ces règles sont câblées dans `parse_prix.py` ; ne pas les contourner.
