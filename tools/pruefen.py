#!/usr/bin/env python3
"""Prüfungen für EduKSX-Prototyp (nur Python-Standardbibliothek, 3.11+).

    python3 tools/pruefen.py             alle Prüfungen (lokal und im Workflow «pruefungen»)
    python3 tools/pruefen.py --schreiben  Übersicht im README.md neu erzeugen

Geprüft wird:
- jeder Ordner unter prototypen/ hat prototyp.json (gültig) und README.md, der Name ist kebab-case,
  die Startdatei existiert;
- die Übersicht im README.md entspricht den Prototypen;
- Version und CHANGELOG (release.py check des Blueprints, inkl. Versionen der Prototypen);
- die Tests in tools/.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROTOTYPEN = ROOT / "prototypen"
VORLAGE = "_vorlage"
NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
VERSION = re.compile(r"^\d+\.\d+(?:\.\d+)?$")
STATUS = ("idee", "in-arbeit", "abgestimmt", "uebernommen", "verworfen")
TECHNIK = ("html", "laravel", "php", "node", "python", "andere")
PFLICHT = ("name", "beschreibung", "version", "status", "technik")
START = "<!-- prototypen:start -->"
ENDE = "<!-- prototypen:ende -->"


def ordner() -> list[Path]:
    if not PROTOTYPEN.is_dir():
        return []
    return sorted(p for p in PROTOTYPEN.iterdir() if p.is_dir())


def lade(pfad: Path) -> dict:
    return json.loads((pfad / "prototyp.json").read_text(encoding="utf-8"))


def pruefe_prototyp(pfad: Path) -> list[str]:
    fehler: list[str] = []
    rel = pfad.relative_to(ROOT).as_posix()
    if pfad.name != VORLAGE and not NAME.match(pfad.name):
        fehler.append(f"{rel}: Ordnername nur Kleinbuchstaben, Ziffern und Bindestriche (z. B. «stundenplan-raster»).")
    if not (pfad / "README.md").is_file():
        fehler.append(f"{rel}: README.md fehlt.")
    if not (pfad / "prototyp.json").is_file():
        return fehler + [f"{rel}: prototyp.json fehlt."]
    try:
        daten = lade(pfad)
    except json.JSONDecodeError as e:
        return fehler + [f"{rel}/prototyp.json: kein gültiges JSON ({e})."]
    if not isinstance(daten, dict):
        return fehler + [f"{rel}/prototyp.json: Objekt erwartet."]
    for feld in PFLICHT:
        if not str(daten.get(feld, "")).strip():
            fehler.append(f"{rel}/prototyp.json: «{feld}» fehlt.")
    if daten.get("version") and not VERSION.match(str(daten["version"])):
        fehler.append(f"{rel}/prototyp.json: «version» ungültig (z. B. 0.1.0).")
    if daten.get("status") and daten["status"] not in STATUS:
        fehler.append(f"{rel}/prototyp.json: «status» muss eines von {', '.join(STATUS)} sein.")
    if daten.get("technik") and daten["technik"] not in TECHNIK:
        fehler.append(f"{rel}/prototyp.json: «technik» muss eines von {', '.join(TECHNIK)} sein.")
    start = str(daten.get("start", "")).strip()
    if start and not (pfad / start).exists():
        fehler.append(f"{rel}/prototyp.json: Startdatei «{start}» fehlt.")
    return fehler


def uebersicht() -> str:
    zeilen = ["| Prototyp | Beschreibung | Version | Status | Technik | Ziel-Modul |", "|---|---|---|---|---|---|"]
    eintraege = 0
    for pfad in ordner():
        if pfad.name == VORLAGE or not (pfad / "prototyp.json").is_file():
            continue
        try:
            d = lade(pfad)
        except json.JSONDecodeError:
            continue
        eintraege += 1
        zeilen.append(
            f"| [{d.get('name', pfad.name)}](prototypen/{pfad.name}/) | {d.get('beschreibung', '')} | "
            f"{d.get('version', '')} | {d.get('status', '')} | {d.get('technik', '')} | {d.get('modul') or '–'} |"
        )
    if not eintraege:
        return "_Noch keine Prototypen – neuen anlegen mit `python3 tools/neuer_prototyp.py <name>`._"
    return "\n".join(zeilen)


def readme_block(text: str, inhalt: str) -> str | None:
    if START not in text or ENDE not in text:
        return None
    vor, rest = text.split(START, 1)
    _, nach = rest.split(ENDE, 1)
    return f"{vor}{START}\n{inhalt}\n{ENDE}{nach}"


def pruefe_readme(schreiben: bool) -> list[str]:
    pfad = ROOT / "README.md"
    text = pfad.read_text(encoding="utf-8")
    neu = readme_block(text, uebersicht())
    if neu is None:
        return [f"README.md: Markierungen {START} … {ENDE} fehlen."]
    if neu != text:
        if schreiben:
            pfad.write_text(neu, encoding="utf-8")
            print("README.md: Übersicht aktualisiert.")
            return []
        return ["README.md: Übersicht der Prototypen veraltet – `python3 tools/pruefen.py --schreiben` ausführen."]
    return []


def lauf(befehl: list[str], titel: str) -> list[str]:
    erg = subprocess.run(befehl, cwd=ROOT, capture_output=True, text=True)
    if erg.returncode != 0:
        return [f"{titel} fehlgeschlagen:\n{(erg.stdout + erg.stderr).strip()}"]
    return []


def main(argv: list[str]) -> int:
    schreiben = "--schreiben" in argv
    fehler: list[str] = []
    if not (PROTOTYPEN / VORLAGE).is_dir():
        fehler.append(f"prototypen/{VORLAGE}/ fehlt.")
    for pfad in ordner():
        fehler += pruefe_prototyp(pfad)
    fehler += pruefe_readme(schreiben)
    release = ROOT / ".github" / "blueprint" / "release.py"
    if release.is_file():
        fehler += lauf([sys.executable, str(release), "check"], "release.py check")
    fehler += lauf([sys.executable, "-m", "unittest", "discover", "-s", "tools", "-p", "test_*.py"], "Tests in tools/")
    for f in fehler:
        print(f"✗ {f}")
    if fehler:
        print(f"\n{len(fehler)} Fehler.")
        return 1
    print(f"✓ Alle Prüfungen bestanden ({len(ordner())} Ordner unter prototypen/).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
