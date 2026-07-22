#!/usr/bin/env python3
"""Diff entre deux releves de prix (usage 2 du cadrage : suivi des cartes dans le temps).

Usage : python scripts/diff_prix.py data/prix_2026-07-22.json data/prix_2026-08-01.json

Compare par cle (concurrent, plat normalise) :
- NOUVEAUX  : dans le fichier recent, pas dans l'ancien ;
- DISPARUS  : dans l'ancien, plus dans le recent ;
- CHANGES   : meme plat, prix different (avant -> apres).
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path


def normaliser(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return re.sub(r"\s+", " ", "".join(c for c in s if not unicodedata.combining(c))).strip()


def charger(chemin: Path) -> dict[tuple[str, str], dict]:
    releve = {}
    for e in json.loads(chemin.read_text(encoding="utf-8")):
        releve[(e["concurrent"], normaliser(e["plat"]))] = e
    return releve


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip())
        return 2
    avant_f, apres_f = Path(sys.argv[1]), Path(sys.argv[2])
    avant, apres = charger(avant_f), charger(apres_f)

    nouveaux = sorted(set(apres) - set(avant))
    disparus = sorted(set(avant) - set(apres))
    changes = sorted(k for k in set(avant) & set(apres) if avant[k]["prix"] != apres[k]["prix"])

    print(f"Diff {avant_f.name} -> {apres_f.name}")
    print(f"  Nouveaux : {len(nouveaux)} · Disparus : {len(disparus)} · Prix changes : {len(changes)}\n")
    for titre, cles, rendu in (
        ("NOUVEAUX", nouveaux, lambda k: f"{apres[k]['plat']} · {apres[k]['prix']:.2f} EUR"),
        ("DISPARUS", disparus, lambda k: f"{avant[k]['plat']} · {avant[k]['prix']:.2f} EUR"),
        ("PRIX CHANGES", changes, lambda k: f"{apres[k]['plat']} · {avant[k]['prix']:.2f} -> {apres[k]['prix']:.2f} EUR"),
    ):
        if cles:
            print(f"== {titre}")
            for k in cles:
                print(f"  [{k[0]}] {rendu(k)}")
            print()
    if not (nouveaux or disparus or changes):
        print("Aucune difference.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
