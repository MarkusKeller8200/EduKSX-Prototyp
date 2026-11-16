#!/usr/bin/env python3
"""Neuen Prototyp aus prototypen/_vorlage/ anlegen.

    python3 tools/neuer_prototyp.py <name> [--titel "Anzeigename"] [--technik html|laravel|php|node|python|andere]
                                           [--modul EduKSX-Time] [--beschreibung "…"]

<name> ist der Ordnername in kebab-case, z. B. «stundenplan-raster». Danach wird die Übersicht im README.md
nachgeführt. Ein vorhandener Ordner wird nie überschrieben.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pruefen  # noqa: E402


def anlegen(name: str, titel: str, technik: str, modul: str, beschreibung: str, basis: Path = pruefen.PROTOTYPEN) -> Path:
    if not pruefen.NAME.match(name):
        raise ValueError(f"«{name}»: nur Kleinbuchstaben, Ziffern und Bindestriche (z. B. «stundenplan-raster»).")
    if technik not in pruefen.TECHNIK:
        raise ValueError(f"Technik «{technik}» unbekannt ({', '.join(pruefen.TECHNIK)}).")
    ziel = basis / name
    if ziel.exists():
        raise FileExistsError(f"{ziel} gibt es schon.")
    shutil.copytree(basis / pruefen.VORLAGE, ziel)
    daten = json.loads((ziel / "prototyp.json").read_text(encoding="utf-8"))
    daten.update(name=titel, beschreibung=beschreibung or "Noch zu beschreiben.", version="0.1.0", status="idee",
                 technik=technik, modul=modul)
    if technik != "html":
        (ziel / "index.html").unlink()
        daten["start"] = ""
    (ziel / "prototyp.json").write_text(json.dumps(daten, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    readme = (ziel / "README.md").read_text(encoding="utf-8")
    readme = readme.replace("# Prototyp: Vorlage", f"# Prototyp: {titel}").replace(
        "**Status:** idee · **Technik:** html · **Ziel-Modul:** –",
        f"**Status:** idee · **Technik:** {technik} · **Ziel-Modul:** {modul or '–'}")
    if technik != "html":
        readme = readme.replace("`index.html` im Browser öffnen.", "Hier beschreiben, wie der Prototyp gestartet wird.")
    (ziel / "README.md").write_text(readme, encoding="utf-8")
    if technik == "html":
        html = (ziel / "index.html").read_text(encoding="utf-8").replace("Prototyp – Vorlage", f"Prototyp – {titel}")
        (ziel / "index.html").write_text(html, encoding="utf-8")
    return ziel


def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description="Neuen Prototyp anlegen")
    p.add_argument("name")
    p.add_argument("--titel", default="")
    p.add_argument("--technik", default="html", choices=pruefen.TECHNIK)
    p.add_argument("--modul", default="")
    p.add_argument("--beschreibung", default="")
    a = p.parse_args(argv)
    try:
        ziel = anlegen(a.name, a.titel or a.name.replace("-", " ").title(), a.technik, a.modul, a.beschreibung)
    except (ValueError, FileExistsError) as e:
        print(f"✗ {e}")
        return 1
    pruefen.pruefe_readme(schreiben=True)
    print(f"✓ {ziel.relative_to(pruefen.ROOT)} angelegt. Frage und Start im README.md des Prototyps ergänzen.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
