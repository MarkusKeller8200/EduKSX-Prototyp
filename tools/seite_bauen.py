#!/usr/bin/env python3
"""Einstiegsseite (Menü) und alle Prototypen für GitHub Pages zusammenstellen.

    python3 tools/seite_bauen.py [ZIEL]     Standard: _site

Das Menü entsteht aus den prototyp.json unter prototypen/ (ohne _vorlage). Jeder Prototyp wird als Ordner
<name>/ kopiert; Prototypen mit Startdatei bekommen den Knopf «Öffnen», die übrigen nur Links auf den Quellcode.
Nur Python-Standardbibliothek.
"""
from __future__ import annotations

import html
import json
import shutil
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "https://github.com/MarkusKeller8200/EduKSX-Prototyp"
STATUS = {
    "idee": ("neutral", "○", "Idee"),
    "in-arbeit": ("info", "…", "In Arbeit"),
    "abgestimmt": ("erfolg", "✓", "Abgestimmt"),
    "uebernommen": ("violett", "➜", "Ins Modul übernommen"),
    "verworfen": ("neutral", "✕", "Verworfen"),
}
# Icons aus dem freigegebenen EduKSX-Icon-Set (markussxch/docs/brand/icons/eduksx), Farben über Markenwerte
ICONS = {
    "eduksx": '<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" fill="var(--brand-violet)"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" fill="none" stroke="var(--brand-neutral)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="2" fill="var(--brand-orange)"/><rect x="13" y="13" width="7.5" height="7.5" rx="2" fill="var(--brand-blue)"/>',
    "staffing": '<g fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="7.8" r="3" stroke="var(--brand-orange)"/><path d="M3 19.5c.6-3.4 2.8-5.4 5.5-5.4 1.4 0 2.6.5 3.6 1.5" stroke="var(--brand-orange)"/><rect x="13" y="12.5" width="8" height="8" rx="1.6" stroke="var(--brand-neutral)"/><path d="M13 15.5h8" stroke="var(--brand-neutral)"/></g><circle cx="17" cy="18" r="1" fill="var(--brand-blue)"/>',
}


def icon(name: str, groesse: int = 40) -> str:
    return f'<svg viewBox="0 0 24 24" width="{groesse}" height="{groesse}" aria-hidden="true">{ICONS.get(name, ICONS["eduksx"])}</svg>'


def wortmarke(name: str) -> str:
    """EduKSX-Wortmarke nach CI: E violett, du neutral, K orange, SX blau, Zusatz neutral; sonst Klartext."""
    e = html.escape
    if not name.startswith("EduKSX"):
        return e(name)
    zusatz = name[len("EduKSX"):]
    teil = f'<span class="n">{e(zusatz)}</span>' if zusatz else ""
    return (f'<span class="wm" role="img" aria-label="{e(name)}"><span aria-hidden="true"><span class="v">E</span>'
            f'<span class="n">du</span><span class="o">K</span><span class="b">SX</span>{teil}</span></span>')


def prototypen() -> list[tuple[Path, dict]]:
    liste = []
    for ordner in sorted((ROOT / "prototypen").iterdir()):
        if ordner.is_dir() and ordner.name != "_vorlage" and (ordner / "prototyp.json").is_file():
            liste.append((ordner, json.loads((ordner / "prototyp.json").read_text(encoding="utf-8"))))
    return liste


def karte(ordner: Path, d: dict) -> str:
    e = html.escape
    cls, sym, text = STATUS.get(d.get("status", ""), ("neutral", "○", d.get("status", "")))
    start = str(d.get("start", "")).strip()
    titel = wortmarke(d["produkt"]) if d.get("produkt") else e(d.get("name", ordner.name))
    links = []
    if start:
        links.append(f'<a class="btn primaer" href="{e(ordner.name)}/{e(start)}">Prototyp öffnen</a>')
    for datei, beschriftung in (("ANFORDERUNGEN.md", "Anforderungen"), ("README.md", "Beschreibung")):
        if (ordner / datei).is_file():
            links.append(f'<a class="btn" href="{REPO}/blob/main/prototypen/{e(ordner.name)}/{datei}">{beschriftung}</a>')
    links.append(f'<a class="btn" href="{REPO}/tree/main/prototypen/{e(ordner.name)}">Quellcode</a>')
    return f"""
      <article class="karte prototyp">
        <div class="prototyp-kopf">{icon(d.get("icon", "eduksx"))}<div><h2>{titel}</h2><p class="muted">{e(d.get("name", ""))}</p></div></div>
        <p>{e(d.get("beschreibung", ""))}</p>
        <p class="small"><span class="badge {cls}"><span aria-hidden="true">{sym}</span>{e(text)}</span>
          <span class="badge neutral">Version {e(str(d.get("version", "")))}</span>
          <span class="badge neutral">Technik {e(d.get("technik", ""))}</span>
          {f'<span class="badge violett">Ziel-Modul {e(d["modul"])}</span>' if d.get("modul") else ""}</p>
        <div class="formzeile">{"".join(links)}</div>
      </article>"""


def menue(liste: list[tuple[Path, dict]]) -> str:
    karten = "".join(karte(o, d) for o, d in liste) or '<p class="muted">Noch keine Prototypen.</p>'
    return f"""<!DOCTYPE html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>EduKSX – Prototypen</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="assets/eduksx.css">
  <style>
    .seite {{ max-width: 1152px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }}
    .gitter {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); gap: 1rem; }}
    .prototyp {{ display: flex; flex-direction: column; gap: .25rem; }}
    .prototyp-kopf {{ display: flex; gap: .75rem; align-items: center; margin-bottom: .5rem; }}
    .prototyp-kopf h2 {{ font-size: 1.25rem; margin: 0; }}
    .prototyp-kopf p {{ margin: 0; }}
    .prototyp .formzeile {{ margin-top: auto; margin-bottom: 0; }}
    a.btn {{ text-decoration: none; }}
  </style>
  <script>
    try {{ var t = localStorage.getItem("eduksx-thema"); if (t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark"); }} catch (e) {{}}
  </script>
</head>
<body>
  <header class="kopf">
    <a class="marke" href="./">{icon("eduksx", 30)}{wortmarke("EduKSX")}</a><span class="muted small">Prototypen</span>
    <div class="werkzeuge"><button class="btn" id="thema" type="button">◐ Hell/Dunkel</button></div>
  </header>
  <div class="hinweis-band" role="note"><strong>Prototypen</strong> zum Ausprobieren und Abstimmen – mit erfundenen Testdaten, ohne Anmeldung und ohne Speicherung auf einem Server. In Entwicklung.</div>
  <main class="seite">
    <h1>Prototypen der EduKSX-Plattform</h1>
    <p class="muted">Ideen und Abläufe werden hier zuerst als Prototyp geprüft und danach im passenden Modul-Repository umgesetzt.</p>
    <div class="gitter">{karten}
    </div>
  </main>
  <footer class="fuss"><span>{wortmarke("EduKSX")} · Stand {date.today().strftime("%d.%m.%Y")} · <a href="{REPO}">Repository</a></span><span>Developed by <span class="wm" role="img" aria-label="MarKusSXCH"><span aria-hidden="true"><span class="v">M</span><span class="n">ar</span><span class="o">K</span><span class="n">us</span><span class="b">SXCH</span></span></span></span></footer>
  <script>
    document.getElementById("thema").addEventListener("click", function () {{
      var d = document.documentElement.classList.toggle("dark");
      try {{ localStorage.setItem("eduksx-thema", d ? "dark" : "light"); }} catch (e) {{}}
    }});
  </script>
</body>
</html>
"""


def cache_brechen(ordner: Path) -> None:
    """Lokale CSS-/JS-Verweise in HTML-Dateien mit ?v=<Prüfsumme> versehen.

    GitHub Pages erlaubt Browsern 10 Minuten Cache; mit der Prüfsumme lädt jede geänderte Datei sofort neu."""
    import hashlib
    import re
    for html in ordner.rglob("*.html"):
        text = html.read_text(encoding="utf-8")

        def ersetzen(m: re.Match) -> str:
            datei = (html.parent / m.group(2)).resolve()
            if not datei.is_file():
                return m.group(0)
            pruef = hashlib.sha256(datei.read_bytes()).hexdigest()[:10]
            return f'{m.group(1)}"{m.group(2)}?v={pruef}"'

        neu = re.sub(r'((?:src|href)=)"((?!https?:|//|#)[^"?]+\.(?:js|css))"', ersetzen, text)
        if neu != text:
            html.write_text(neu, encoding="utf-8")


def bauen(ziel: Path) -> list[str]:
    if ziel.exists():
        shutil.rmtree(ziel)
    (ziel / "assets").mkdir(parents=True)
    shutil.copy2(ROOT / "seite" / "eduksx.css", ziel / "assets" / "eduksx.css")
    liste = prototypen()
    for ordner, _ in liste:
        shutil.copytree(ordner, ziel / ordner.name, ignore=shutil.ignore_patterns("node_modules", "vendor", ".env*", "*.md", "__pycache__"))
        cache_brechen(ziel / ordner.name)
    (ziel / "index.html").write_text(menue(liste), encoding="utf-8")
    (ziel / ".nojekyll").write_text("", encoding="utf-8")
    return [o.name for o, _ in liste]


def main(argv: list[str]) -> int:
    ziel = Path(argv[0]) if argv else ROOT / "_site"
    namen = bauen(ziel.resolve())
    print(f"✓ {ziel}: Einstiegsseite mit {len(namen)} Prototyp(en): {', '.join(namen) or '–'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
