"""EduKSX-Icons aus EduKSX-UI einbinden – dieses Repo hält keine eigenen Kopien (Entscheid 22.11.2026).

Quelle ist allein das Repo EduKSX-UI (`icons/svg/<name>-color.svg`). Gesucht wird in dieser Reihenfolge:
Umgebungsvariable EDUKSX_UI_ICONS, `_eduksx-ui/icons` (Checkout im Workflow), `../EduKSX-UI/icons` (lokal daneben).
Die Farben werden auf die Markenwerte (--brand-*) umgestellt, damit Hell/Dunkel wechselt.

In Prototyp-Dateien (.html, .js) steht nur ein Platzhalter `<!--eduksx-icon:NAME-->` bzw. `<!--eduksx-icon:NAME:GRÖSSE-->`;
`seite_bauen.py` ersetzt ihn beim Bauen. Nur Python-Standardbibliothek.
"""
from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FARBEN = {"#222222": "var(--brand-neutral)", "#7952B3": "var(--brand-violet)", "#FF8A00": "var(--brand-orange)",
          "#007EBB": "var(--brand-blue)"}
PLATZHALTER = re.compile(r"<!--eduksx-icon:([a-z]+)(?::(\d+))?-->")


def ordner() -> Path:
    kandidaten = [os.environ.get("EDUKSX_UI_ICONS"), ROOT / "_eduksx-ui" / "icons", ROOT.parent / "EduKSX-UI" / "icons"]
    for k in kandidaten:
        if k and (Path(k) / "svg").is_dir():
            return Path(k)
    raise SystemExit("EduKSX-UI-Icons nicht gefunden: EduKSX-UI neben dieses Repo klonen oder EDUKSX_UI_ICONS setzen.")


@lru_cache(maxsize=None)
def inhalt(name: str) -> str:
    slug = "eduksx" if name == "eduksx" else f"eduksx-{name}"
    datei = ordner() / "svg" / f"{slug}-color.svg"
    if not datei.exists():
        raise SystemExit(f"Icon «{name}» gibt es in EduKSX-UI nicht ({datei.name}).")
    svg = datei.read_text(encoding="utf-8")
    innen = re.sub(r"^.*?<svg[^>]*>|</svg>\s*$|<title>.*?</title>", "", svg, flags=re.S).strip()
    for hexwert, var in FARBEN.items():
        innen = innen.replace(f'"{hexwert}"', f'"{var}"')
    return re.sub(r"\s*\n\s*", "", innen)


def svg(name: str, groesse: int | None = None) -> str:
    mass = f' width="{groesse}" height="{groesse}"' if groesse else ""
    return f'<svg viewBox="0 0 24 24"{mass} aria-hidden="true">{inhalt(name)}</svg>'


def ersetzen(text: str) -> str:
    return PLATZHALTER.sub(lambda m: svg(m.group(1), int(m.group(2)) if m.group(2) else None), text)


def platzhalter_ersetzen(verzeichnis: Path) -> int:
    n = 0
    for datei in list(verzeichnis.rglob("*.html")) + list(verzeichnis.rglob("*.js")):
        if "/lib/" in datei.as_posix():
            continue
        text = datei.read_text(encoding="utf-8")
        if "<!--eduksx-icon:" in text:
            datei.write_text(ersetzen(text), encoding="utf-8")
            n += 1
    return n
