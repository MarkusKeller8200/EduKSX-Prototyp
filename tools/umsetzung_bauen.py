#!/usr/bin/env python3
"""Umsetzungsgrundlagen nachführen (docs/umsetzung/<modul>/) – DB-Standard 1.3, API-Standard 1.2.

    python3 tools/umsetzung_bauen.py [--pruefen]

1. datenbank.sql: erzeugte Blöcke aktualisieren – Standardtabellen (aus standardtabellen.sql), Index auf jedem
   Fremdschlüssel (DB A3), COMMENT ON mit den deutschen Beschreibungen (DB A8).
2. openapi.json und openapi.yaml: aus dem Datenmodell und der API-Definition tools/umsetzung/api_<modul>.py
   (Felder = Spalten, deutsche Begriffe als title/description, Labels als x-eduksx-labels; API A8).
3. Prüft die deutschen Beschreibungen (DB A8) und meldet Mängel.

Nur Python-Standardbibliothek. --pruefen meldet veraltete Dateien und Mängel (Exit 1).
"""
from __future__ import annotations

import importlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UMSETZUNG = ROOT / "docs" / "umsetzung"
sys.path.insert(0, str(Path(__file__).resolve().parent))

from umsetzung import modell, openapi  # noqa: E402

MODULE = ["staffing", "flow", "codex", "sign", "time"]


def block_ersetzen(text: str, name: str, inhalt: str) -> str:
    muster = re.compile(rf"(-- >>> {name}[^\n]*\n)(.*?)(-- <<< {name})", re.S)
    if not muster.search(text):
        raise SystemExit(f"Markierung «-- >>> {name}» fehlt")
    return muster.sub(lambda m: m.group(1) + (inhalt.rstrip("\n") + "\n" if inhalt.strip() else "") + m.group(3), text, count=1)


def standardblock() -> str:
    roh = (UMSETZUNG / "standardtabellen.sql").read_text(encoding="utf-8")
    # Kopf (Erklärung) weglassen, ab der ersten Tabellenbeschreibung übernehmen
    start = roh.index("-- Organisation (")
    return "-- Platzhalter für die Standardtabellen aus eduksx/core (Quelle: docs/umsetzung/standardtabellen.sql)\n\n" + roh[start:]


def sql_bauen(modul: str) -> tuple[str, list[modell.Tabelle]]:
    pfad = UMSETZUNG / modul / "datenbank.sql"
    text = pfad.read_text(encoding="utf-8")
    text = block_ersetzen(text, "standardtabellen", standardblock())
    a = text.index("-- >>> standardtabellen")
    b = text.index("-- <<< standardtabellen")
    tabellen = modell.lesen(text, a, b)
    text = block_ersetzen(text, "indizes", modell.indizes_sql(tabellen))
    text = block_ersetzen(text, "kommentare", modell.kommentare_sql(tabellen))
    return text, tabellen


def api_bauen(modul: str, tabellen: list[modell.Tabelle]) -> dict:
    definition = importlib.import_module(f"umsetzung.api_{modul}").API
    return openapi.erzeugen(modul, definition, tabellen)


def main(argv: list[str]) -> int:
    pruefen = "--pruefen" in argv
    veraltet, maengel = [], []
    for modul in MODULE:
        if not (UMSETZUNG / modul / "datenbank.sql").is_file():
            continue
        sql, tabellen = sql_bauen(modul)
        maengel += [f"{modul}: {m}" for m in modell.maengel(tabellen)]
        dateien = {"datenbank.sql": sql}
        try:
            api = api_bauen(modul, tabellen)
        except ModuleNotFoundError:
            api = None
            maengel.append(f"{modul}: API-Definition tools/umsetzung/api_{modul}.py fehlt")
        if api is not None:
            maengel += [f"{modul}: {m}" for m in openapi.maengel(api)]
            js = json.dumps(api, ensure_ascii=False, indent=2) + "\n"
            dateien["openapi.json"] = js
            # JSON ist gültiges YAML 1.2 (wie /api/openapi.yaml in EduKSX-Glossary)
            dateien["openapi.yaml"] = f"# {api['info']['title']} – OpenAPI 3.1 (JSON-Schreibweise, gültiges YAML)\n" + js
        for name, inhalt in dateien.items():
            pfad = UMSETZUNG / modul / name
            if not pfad.is_file() or pfad.read_text(encoding="utf-8") != inhalt:
                veraltet.append(str(pfad.relative_to(ROOT)))
                if not pruefen:
                    pfad.write_text(inhalt, encoding="utf-8")
    for m in maengel:
        print(f"✗ {m}")
    if pruefen:
        for v in veraltet:
            print(f"✗ veraltet: {v}")
        ok = not veraltet and not maengel
        print("✓ Umsetzungsgrundlagen aktuell und vollständig beschrieben." if ok else "→ python3 tools/umsetzung_bauen.py")
        return 0 if ok else 1
    print(f"✓ {len(veraltet)} Datei(en) geschrieben; {len(maengel)} Mängel.")
    return 1 if maengel else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
