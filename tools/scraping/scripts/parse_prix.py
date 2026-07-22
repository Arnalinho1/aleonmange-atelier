#!/usr/bin/env python3
"""Veille prix concurrents (usage INTERNE uniquement, jamais de republication).

Lit config/concurrents.yml, recupere chaque page carte/menu avec Scrapling,
extrait le brut structure (plat, prix, categorie si detectable) et ecrit
data/prix_YYYY-MM-DD.json (un NOUVEAU fichier par run, jamais d'ecrasement).

Regles de politesse (non negociables, cf. README) :
- robots.txt respecte (un site qui interdit est SAUTE, jamais force) ;
- 1 requete a la fois, delai aleatoire 2-5 s entre TOUTES les requetes ;
- user-agent honnete (identite + contact), zero faux referer, zero camouflage ;
- executions manuelles ponctuelles (pas de cron).

Usage :
  python scripts/parse_prix.py                       # tous les concurrents du YAML
  python scripts/parse_prix.py --only "Nom"          # un seul concurrent du YAML
  python scripts/parse_prix.py --url URL --nom "Nom" # essai one-off sans toucher au YAML
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
import time
import unicodedata
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

import yaml

RACINE = Path(__file__).resolve().parent.parent
CONFIG_DEFAUT = RACINE / "config" / "concurrents.yml"
DATA = RACINE / "data"

# Identite honnete : qui nous sommes, pourquoi, comment nous joindre.
USER_AGENT = "ALMVeille/0.1 (+https://aleonmange.app ; veille interne A Leon Mange ; contact aleonmange@yahoo.com)"
DELAI_MIN, DELAI_MAX = 2.0, 5.0

# Prix francais : « 12,50 € », « 12.5€ », « 12 € », « 12€50 ».
RE_PRIX = re.compile(r"(\d{1,3}(?:[.,]\d{1,2})?)\s*€(?!\w)|(\d{1,3})\s*€\s*(\d{2})(?!\d)")
TAGS_CATEGORIE = {"h1", "h2", "h3", "h4"}
TAGS_IGNORES = {"script", "style", "noscript", "template", "svg", "path", "head", "meta", "link"}


def pause():
    time.sleep(random.uniform(DELAI_MIN, DELAI_MAX))


def robots_autorise(url: str) -> bool:
    """True si robots.txt autorise notre UA sur cette URL (absent/404 = autorise)."""
    base = "{0.scheme}://{0.netloc}".format(urlsplit(url))
    rp = urllib.robotparser.RobotFileParser()
    try:
        req = urllib.request.Request(f"{base}/robots.txt", headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as reponse:
            rp.parse(reponse.read().decode("utf-8", errors="replace").splitlines())
    except urllib.error.HTTPError as e:
        return e.code >= 400  # pas de robots.txt publie -> autorise
    except OSError:
        return True  # site injoignable : le fetch principal echouera de lui-meme
    return rp.can_fetch(USER_AGENT, url)


def recuperer(url: str, mode: str):
    """Fetch poli : UA honnete, zero camouflage, zero faux referer."""
    if mode == "dynamic":
        from scrapling.fetchers import DynamicFetcher

        return DynamicFetcher.fetch(
            url,
            extra_headers={"User-Agent": USER_AGENT},
            google_search=False,
            network_idle=True,
        )
    from scrapling.fetchers import Fetcher

    return Fetcher.get(
        url,
        headers={"User-Agent": USER_AGENT},
        stealthy_headers=False,
        impersonate=None,
        timeout=30,
        retries=1,
    )


def _texte(element) -> str:
    brut = element.get_all_text(strip=True) if hasattr(element, "get_all_text") else str(element.text or "")
    return re.sub(r"\s+", " ", brut).strip()


def _prix_en_euros(m: re.Match) -> tuple[float, str]:
    if m.group(1) is not None:
        return float(m.group(1).replace(",", ".")), m.group(0).strip()
    return float(f"{m.group(2)}.{m.group(3)}"), m.group(0).strip()


def normaliser(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return re.sub(r"\s+", " ", "".join(c for c in s if not unicodedata.combining(c))).strip()


def extraire_heuristique(page) -> list[dict]:
    """Parcours du document en ordre : les titres h1-h4 posent la categorie courante,
    tout element COURT dont le texte contient exactement 1 prix devient un plat candidat.
    Extraction volontairement BRUTE (cf. cadrage) : l'analyse fine se fait apres."""
    plats: list[dict] = []
    vus: set[tuple[str, float]] = set()
    categorie = None
    for el in page.css("body *"):
        tag = str(getattr(el, "tag", "")).lower()
        if tag in TAGS_IGNORES:
            continue
        if tag in TAGS_CATEGORIE:
            txt = _texte(el)
            if txt and len(txt) <= 80 and not RE_PRIX.search(txt):
                categorie = txt
            continue
        txt = _texte(el)
        if not txt or len(txt) > 200:
            continue
        occurrences = list(RE_PRIX.finditer(txt))
        if len(occurrences) != 1:
            continue
        prix, prix_affiche = _prix_en_euros(occurrences[0])
        libelle = re.sub(r"\s*[·•:|\-–]\s*$", "", txt.replace(occurrences[0].group(0), " ").strip(" .,"))
        libelle = re.sub(r"\s+", " ", libelle).strip()
        if len(libelle) < 3 or not re.search(r"[a-zA-Zà-ÿÀ-Ÿ]{3}", libelle):
            continue
        cle = (normaliser(libelle), prix)
        if cle in vus:  # dedoublonne les blocs imbriques qui portent le meme couple
            continue
        vus.add(cle)
        plats.append({"plat": libelle, "prix": prix, "prix_affiche": prix_affiche, "categorie": categorie})
    return plats


def extraire_selecteurs(page, sel: dict) -> list[dict]:
    plats = []
    for bloc in page.css(sel["plat"]):
        nom = _texte(bloc.css_first(sel["nom"])) if sel.get("nom") and bloc.css_first(sel["nom"]) else None
        brut_prix = _texte(bloc.css_first(sel["prix"])) if sel.get("prix") and bloc.css_first(sel["prix"]) else None
        source = brut_prix or _texte(bloc)
        m = RE_PRIX.search(source or "")
        if not m:
            continue
        prix, prix_affiche = _prix_en_euros(m)
        libelle = nom or re.sub(re.escape(m.group(0)), " ", _texte(bloc)).strip(" .,·-")
        if libelle:
            plats.append({"plat": libelle, "prix": prix, "prix_affiche": prix_affiche, "categorie": None})
    return plats


def fichier_sortie() -> Path:
    DATA.mkdir(exist_ok=True)
    jour = datetime.now().strftime("%Y-%m-%d")
    cible = DATA / f"prix_{jour}.json"
    if cible.exists():  # jamais d'ecrasement : un run = un fichier
        cible = DATA / f"prix_{jour}_{datetime.now().strftime('%H%M%S')}.json"
    return cible


def main() -> int:
    ap = argparse.ArgumentParser(description="Veille prix concurrents (usage interne).")
    ap.add_argument("--config", type=Path, default=CONFIG_DEFAUT)
    ap.add_argument("--only", help="ne traiter que ce concurrent (nom exact du YAML)")
    ap.add_argument("--url", help="essai one-off : URL carte/menu (avec --nom)")
    ap.add_argument("--nom", help="essai one-off : nom du concurrent")
    ap.add_argument("--fetcher", choices=["simple", "dynamic"], default="simple", help="fetcher du one-off")
    args = ap.parse_args()

    if args.url:
        if not args.nom:
            ap.error("--url exige --nom")
        cibles = [{"nom": args.nom, "url": args.url, "fetcher": args.fetcher}]
    else:
        conf = yaml.safe_load(args.config.read_text(encoding="utf-8")) or {}
        cibles = conf.get("concurrents") or []
        if args.only:
            cibles = [c for c in cibles if c.get("nom") == args.only]
        if not cibles:
            print("Aucun concurrent a traiter (config/concurrents.yml est vide : le remplir est un geste d'Arnaud).")
            return 0

    horodatage = datetime.now(timezone.utc).isoformat(timespec="seconds")
    entrees, erreurs = [], 0
    for i, c in enumerate(cibles):
        nom, url = c["nom"], c["url"]
        if i > 0:
            pause()  # delai entre SITES
        if not robots_autorise(url):
            print(f"SAUTE  {nom} : robots.txt interdit {url} (regle non negociable).")
            continue
        pause()  # delai entre le robots.txt et la page elle-meme
        try:
            page = recuperer(url, c.get("fetcher", "simple"))
        except Exception as e:  # site down, TLS, timeout... : on note et on continue
            print(f"ERREUR {nom} : {e}")
            erreurs += 1
            continue
        if getattr(page, "status", None) != 200:
            print(f"ERREUR {nom} : HTTP {getattr(page, 'status', '?')} sur {url}")
            erreurs += 1
            continue
        plats = extraire_selecteurs(page, c["selecteurs"]) if c.get("selecteurs") else extraire_heuristique(page)
        for p in plats:
            entrees.append({"concurrent": nom, "url": url, **p, "horodatage": horodatage})
        print(f"OK     {nom} : {len(plats)} plat(s) extraits de {url}")

    if entrees:
        sortie = fichier_sortie()
        sortie.write_text(json.dumps(entrees, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"\nEcrit : {sortie.relative_to(RACINE)} ({len(entrees)} entrees)")
    else:
        print("\nAucune entree extraite : pas de fichier ecrit.")
    return 1 if erreurs and not entrees else 0


if __name__ == "__main__":
    sys.exit(main())
