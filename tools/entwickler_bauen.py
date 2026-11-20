#!/usr/bin/env python3
"""Erzeugt den Bereich «Entwickler» in jedem Prototyp – wie die Entwicklerseite von EduKSX-Glossary.

    python3 tools/entwickler_bauen.py [--lib PFAD_NODE_MODULES] [--pruefen]

Quelle sind die Umsetzungsgrundlagen in docs/umsetzung/<modul>/ (datenbank.sql, openapi.yaml). Je Prototyp entsteht
prototypen/<name>/entwickler/ mit:

    index.html        Datenmodell (Beziehungsdiagramm, Tabellen mit Spalten, Ansichten) und Links zur API
    api.html          interaktive API-Dokumentation (Scalar, selbst ausgeliefert, ohne Schriften aus dem Netz)
    swagger.html      Swagger UI (Anfragen senden ist ausgeschaltet – es gibt noch keinen Server)
    openapi.json/.yaml, datenmodell.sql (inkl. Core-Platzhalter, direkt ausführbar)
    lib/              Scalar (MIT) und Swagger UI (Apache-2.0), je Prototyp eigene Kopie (Prototypen bleiben unabhängig)

Das Diagramm zeichnet dieses Skript selbst (SVG, keine Fremdkomponente). openapi.json braucht PyYAML; ohne PyYAML
bleibt die vorhandene openapi.json stehen. --lib zeigt auf node_modules mit @scalar/api-reference und
swagger-ui-dist (nur beim Aktualisieren der Bibliotheken nötig). --pruefen meldet veraltete Dateien (Exit 1).
"""
from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UMSETZUNG = ROOT / "docs" / "umsetzung"

# Scalar liefert im npm-Paket keine LICENSE-Datei mit (Lizenz laut package.json und README: MIT)
SCALAR_LIZENZ = """@scalar/api-reference – https://github.com/scalar/scalar
Lizenz: MIT (package.json «license»: «MIT»; README: «MIT licensed»), Volltext:
https://github.com/scalar/scalar/blob/main/LICENSE

MIT License

Copyright (c) 2023-present Scalar

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
"""

# Modul → (Prototyp-Ordner, Wortmarke)
MODULE = {
    "staffing": ("einsatzplanung", "EduKSX-Staffing"),
    "flow": ("ablaufplanung", "EduKSX-Flow"),
    "codex": ("rechtssammlung", "EduKSX-Codex"),
    "sign": ("signatur", "EduKSX-Sign"),
    "time": ("zeiterfassung", "EduKSX-Time"),
}
LIB = {
    "scalar/standalone.js": "@scalar/api-reference/dist/browser/standalone.js",
    "swagger-ui/swagger-ui-bundle.js": "swagger-ui-dist/swagger-ui-bundle.js",
    "swagger-ui/swagger-ui.css": "swagger-ui-dist/swagger-ui.css",
    "swagger-ui/LICENSE": "swagger-ui-dist/LICENSE",
    "swagger-ui/NOTICE": "swagger-ui-dist/NOTICE",
}
E = html.escape


# ---------------------------------------------------------------------------------------------------- SQL lesen

@dataclass
class Spalte:
    name: str
    typ: str
    pflicht: bool = False
    vorgabe: str | None = None
    schluessel: str | None = None      # PK, UK
    verweis: str | None = None         # schema.tabelle.spalte
    text: str = ""


@dataclass
class Tabelle:
    schema: str
    name: str
    text: str = ""
    spalten: list[Spalte] = field(default_factory=list)
    regeln: list[str] = field(default_factory=list)   # UNIQUE/CHECK auf Tabellenebene
    ansicht: bool = False

    @property
    def voll(self) -> str:
        return f"{self.schema}.{self.name}"


def _teilen(rumpf: str) -> list[tuple[str, str]]:
    """Teilt den Rumpf eines CREATE TABLE an Kommas der obersten Ebene; liefert (Definition, Kommentar)."""
    teile, tiefe, aktuell, kommentar, zitat = [], 0, "", "", False
    for zeile in rumpf.splitlines():
        code, _, notiz = zeile.partition("--")
        notiz = notiz.strip()
        for z in code:
            if z == "'":
                zitat = not zitat
            elif not zitat and z in "({":
                tiefe += 1
            elif not zitat and z in ")}":
                tiefe -= 1
            if z == "," and tiefe == 0 and not zitat:
                teile.append((aktuell.strip(), kommentar))
                aktuell, kommentar = "", ""
                continue
            aktuell += z
        aktuell += " "
        if notiz:
            # Kommentar gehört zur Definition, die auf dieser Zeile endet bzw. steht
            if teile and not aktuell.strip():
                d, k = teile[-1]
                teile[-1] = (d, (k + " " + notiz).strip())
            else:
                kommentar = (kommentar + " " + notiz).strip()
    if aktuell.strip():
        teile.append((aktuell.strip(), kommentar))
    return [(re.sub(r"\s+", " ", d), k) for d, k in teile if d]


def _kommentar_davor(text: str, pos: int) -> str:
    zeilen = text[:pos].rstrip("\n").splitlines()
    gesammelt = []
    for z in reversed(zeilen):
        if z.startswith("--") and not z.startswith("-- ---"):
            gesammelt.append(z[2:].strip())
        else:
            break
    return " ".join(reversed(gesammelt))


def tabellen_lesen(sql: str) -> list[Tabelle]:
    out: list[Tabelle] = []
    for m in re.finditer(r"CREATE TABLE (?:IF NOT EXISTS )?(\w+)\.(\w+) \((.*?)\n\);", sql, re.S):
        t = Tabelle(m.group(1), m.group(2), _kommentar_davor(sql, m.start()))
        pk_tabelle: list[str] = []
        for d, k in _teilen(m.group(3)):
            kopf = d.split(" ", 1)[0].upper()
            if kopf in ("UNIQUE", "CHECK", "PRIMARY", "CONSTRAINT", "FOREIGN"):
                if kopf == "PRIMARY":
                    pk_tabelle = [x.strip() for x in re.search(r"\((.*?)\)", d).group(1).split(",")]
                t.regeln.append(d)
                continue
            name, rest = d.split(" ", 1)
            typ = re.match(r"([a-z]+(?:\s+precision)?(?:\([\d, ]+\))?(?:\[\])?)", rest).group(1)
            s = Spalte(name, typ, text=k)
            s.pflicht = "NOT NULL" in rest or "PRIMARY KEY" in rest
            if "PRIMARY KEY" in rest:
                s.schluessel = "PK"
            elif re.search(r"\bUNIQUE\b", rest):
                s.schluessel = "UK"
            if (v := re.search(r"DEFAULT (.+?)(?: NOT NULL| REFERENCES| CHECK| UNIQUE| PRIMARY|$)", rest)):
                s.vorgabe = v.group(1).strip()
            if (w := re.search(r"CHECK \(\w+ IN \((.*?)\)\)", rest)):
                werte = ", ".join(x.strip().strip("'") for x in w.group(1).split(","))
                s.text = (s.text + " · " if s.text else "") + f"Werte: {werte}"
            if (r := re.search(r"REFERENCES (\w+)\.(\w+)\((\w+)\)", rest)):
                s.verweis = f"{r.group(1)}.{r.group(2)}.{r.group(3)}"
            t.spalten.append(s)
        for s in t.spalten:
            if s.name in pk_tabelle:
                s.schluessel = "PK"
                s.pflicht = True
        out.append(t)
    for m in re.finditer(r"CREATE VIEW (\w+)\.(\w+) AS", sql):
        out.append(Tabelle(m.group(1), m.group(2), _kommentar_davor(sql, m.start()), ansicht=True))
    return out


# ---------------------------------------------------------------------------------------------------- Diagramm

def diagramm(tabellen: list[Tabelle], core: list[Tabelle]) -> str:
    """Beziehungsdiagramm als SVG: Spalten nach Abhängigkeitstiefe, Core-Tabellen links (grau)."""
    eigene = {t.voll: t for t in tabellen if not t.ansicht}
    verwendet_core = {s.verweis.rsplit(".", 1)[0] for t in eigene.values() for s in t.spalten
                      if s.verweis and s.verweis.startswith("core.") and s.name != "mandant_id"}
    knoten = {**{t.voll: t for t in core if t.voll in verwendet_core}, **eigene}

    tiefe: dict[str, int] = {}

    def stufe(n: str, weg: tuple = ()) -> int:
        if n in tiefe:
            return tiefe[n]
        t = knoten[n]
        if t.schema == "core":
            tiefe[n] = 0
            return 0
        ziele = {s.verweis.rsplit(".", 1)[0] for s in t.spalten if s.verweis}
        ziele = [z for z in ziele if z in knoten and z != n and z not in weg]
        tiefe[n] = 1 + max((stufe(z, weg + (n,)) for z in ziele), default=0)
        return tiefe[n]

    for n in knoten:
        stufe(n)

    B, ZEILE, KOPF, LUECKE_X, LUECKE_Y = 210, 15, 22, 70, 18
    spalten: dict[int, list[str]] = {}
    for n in sorted(knoten, key=lambda x: (tiefe[x], x)):
        spalten.setdefault(tiefe[n], []).append(n)

    def zeilen(t: Tabelle) -> list[Spalte]:
        if t.schema == "core":
            return [s for s in t.spalten if s.schluessel == "PK"]
        return [s for s in t.spalten if s.schluessel == "PK" or (s.verweis and s.name != "mandant_id")]

    pos: dict[str, tuple[float, float, float]] = {}
    hoehe_max = 0.0
    for i, (st, namen) in enumerate(sorted(spalten.items())):
        y = 10.0
        for n in namen:
            h = KOPF + ZEILE * len(zeilen(knoten[n])) + 6
            pos[n] = (10 + i * (B + LUECKE_X), y, h)
            y += h + LUECKE_Y
        hoehe_max = max(hoehe_max, y)
    breite = 10 + len(spalten) * (B + LUECKE_X)

    kanten = []
    for n, t in knoten.items():
        if t.schema == "core":
            continue
        x, y, _ = pos[n]
        for j, s in enumerate(zeilen(t)):
            if not s.verweis:
                continue
            ziel = s.verweis.rsplit(".", 1)[0]
            if ziel not in pos:
                continue
            zx, zy, zh = pos[ziel]
            y1 = y + KOPF + ZEILE * j + ZEILE / 2 + 2
            y2 = zy + KOPF / 2
            if ziel == n:      # Selbstbezug (Baum)
                kanten.append(f'<path class="kante" d="M{x + B} {y1} c 22 0 22 {-(y1 - y2)} 0 {-(y1 - y2)}"/>')
                continue
            x1, x2 = x, zx + B
            if x2 > x1:        # Ziel rechts davon (Zyklus) – rechts herum
                x1 = x + B
                x2 = zx
            m = (x1 + x2) / 2
            kanten.append(f'<path class="kante" d="M{x1} {y1} C{m} {y1} {m} {y2} {x2} {y2}"/>')

    boxen = []
    for n, (x, y, h) in pos.items():
        t = knoten[n]
        klasse = "box core" if t.schema == "core" else "box"
        inhalt = [f'<rect x="{x}" y="{y}" width="{B}" height="{h}" rx="6"/>',
                  f'<rect class="kopfzeile" x="{x}" y="{y}" width="{B}" height="{KOPF}" rx="6"/>',
                  f'<text class="name" x="{x + 8}" y="{y + 15}">{E(t.name)}</text>']
        for j, s in enumerate(zeilen(t)):
            zeichen = "🔑 " if s.schluessel == "PK" else "→ "
            inhalt.append(f'<text x="{x + 8}" y="{y + KOPF + ZEILE * j + 12}">{zeichen}{E(s.name)}</text>')
        ziel = f"#t-{t.schema}-{t.name}" if t.schema != "core" else "#core"
        boxen.append(f'<a href="{ziel}" class="{klasse}"><title>{E(t.voll)}</title>{"".join(inhalt)}</a>')

    return (f'<svg class="diagramm" viewBox="0 0 {breite:.0f} {hoehe_max:.0f}" width="{breite:.0f}" height="{hoehe_max:.0f}" '
            f'role="img" aria-label="Beziehungsdiagramm: {len(eigene)} Tabellen; die Tabellenliste unten enthält dieselben Angaben">'
            f'{"".join(kanten)}{"".join(boxen)}</svg>')


# ---------------------------------------------------------------------------------------------------- Seiten

def wortmarke(name: str) -> str:
    rest = name[len("EduKSX"):]
    return (f'<span class="wm" role="img" aria-label="{E(name)}"><span aria-hidden="true"><span class="v">E</span>'
            f'<span class="n">du</span><span class="o">K</span><span class="b">SX</span><span class="n">{E(rest)}</span></span></span>')


ZURUECK = ('<a class="btn zurueck" href="../" title="Zurück zum Prototyp" aria-label="Zurück zum Prototyp">'
           '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" '
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>')

THEMA = ('<script>try { var t = localStorage.getItem("eduksx-thema"); if (t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches) '
         'document.documentElement.classList.add("dark"); } catch (e) {}</script>')


def kopf(produkt: str, seite: str, aktiv: str) -> str:
    links = [("index.html", "Datenmodell"), ("api.html", "API-Dokumentation"), ("swagger.html", "Swagger"),
             ("openapi.json", "OpenAPI (JSON)"), ("openapi.yaml", "YAML"), ("datenmodell.sql", "SQL")]
    nav = " · ".join(
        f'<a href="{h}"{" aria-current=\"page\"" if h == aktiv else ""}{" download" if h.endswith((".sql", ".yaml")) else ""}>{t}</a>' for h, t in links)
    return f"""  <header class="kopf">
    <a class="marke" href="index.html">{wortmarke(produkt)}</a><span class="muted small">Entwickler · {E(seite)}</span>
    {ZURUECK}
    <nav class="entwickler-nav" aria-label="Entwickler">{nav}</nav>
  </header>
  <div class="hinweis-band" role="note"><strong>Entwurf</strong> – Grundlage für die Umsetzung im Modul-Repository, abgeleitet aus dem Prototyp. Noch keine laufende API; Quelle <code>docs/umsetzung/</code>.</div>
"""


STIL = """  <style>
    body { margin: 0; }
    .entwickler-nav { margin-left: auto; display: flex; flex-wrap: wrap; gap: .25rem .5rem; font-size: .9rem; }
    .entwickler-nav a[aria-current] { font-weight: 700; color: var(--foreground); text-decoration: none; }
    .btn.zurueck { display: inline-flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; padding: 0; flex: none; }
    main.entwickler { max-width: 1200px; margin: 0 auto; padding: 1.25rem; }
    .entwickler h2 { margin-top: 2rem; }
    .diagramm-wrap { overflow: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); max-height: 75vh; }
    .diagramm { display: block; font: 12px var(--font-sans); }
    .diagramm .box rect { fill: var(--card); stroke: var(--input); }
    .diagramm .box .kopfzeile { fill: var(--accent); stroke: var(--input); }
    .diagramm .box.core rect { fill: var(--muted); stroke-dasharray: 4 3; }
    .diagramm .box.core .kopfzeile { fill: var(--muted); }
    .diagramm text { fill: var(--foreground); }
    .diagramm .name { font-weight: 700; }
    .diagramm a:hover rect, .diagramm a:focus rect { stroke: var(--ring); stroke-width: 2; }
    .diagramm .kante { fill: none; stroke: var(--muted-foreground); stroke-width: 1.2; opacity: .55; }
    .tabelle { margin: 1.25rem 0; scroll-margin-top: 5rem; }
    .tabelle h3 { margin: 0 0 .25rem; font-family: ui-monospace, monospace; font-size: 1rem; }
    .tabelle table { width: 100%; border-collapse: collapse; font-size: .85rem; }
    .tabelle th, .tabelle td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    .tabelle td.code, .tabelle td code { font-family: ui-monospace, monospace; }
    .regeln { font-size: .8rem; margin: .3rem 0 0; }
    .inhalt-liste { columns: 3 14rem; font-size: .85rem; font-family: ui-monospace, monospace; }
    .api-karten { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: .75rem; }
    #api-doku { min-height: 80vh; }
  </style>
"""


def seite_index(produkt: str, modul: str, tabellen: list[Tabelle], core: list[Tabelle], api: dict | None) -> str:
    eigene = [t for t in tabellen if not t.ansicht]
    ansichten = [t for t in tabellen if t.ansicht]

    def tab(t: Tabelle) -> str:
        zeilen = []
        for s in t.spalten:
            verweis = ""
            if s.verweis:
                ziel_schema, ziel_tab, ziel_sp = s.verweis.split(".")
                anker = "#core" if ziel_schema == "core" else f"#t-{ziel_schema}-{ziel_tab}"
                verweis = f'<a href="{anker}"><code>{E(ziel_schema)}.{E(ziel_tab)}</code></a>'
            zeilen.append(f"<tr><td class=\"code\">{E(s.name)}</td><td class=\"code\">{E(s.typ)}</td><td>{'ja' if s.pflicht else ''}</td>"
                          f"<td class=\"code\">{E(s.vorgabe or '')}</td><td>{E(s.schluessel or '')}</td><td>{verweis}</td><td>{E(s.text)}</td></tr>")
        regeln = "".join(f"<li><code>{E(r)}</code></li>" for r in t.regeln)
        return (f'<section class="tabelle" id="t-{t.schema}-{t.name}"><h3>{E(t.voll)}</h3>'
                f'{f"<p class=\"muted small\">{E(t.text)}</p>" if t.text else ""}'
                f'<div class="tabelle-wrap"><table><thead><tr><th>Spalte</th><th>Typ</th><th>Pflicht</th><th>Vorgabe</th>'
                f'<th>Schlüssel</th><th>Verweis</th><th>Beschreibung</th></tr></thead><tbody>{"".join(zeilen)}</tbody></table></div>'
                f'{f"<ul class=\"regeln muted\">{regeln}</ul>" if regeln else ""}</section>')

    pfade = sum(len([m for m in v if m != "parameters"]) for v in api["paths"].values()) if api else 0
    schemas = len(api["components"]["schemas"]) if api else 0
    inhalt = "".join(f'<li><a href="#t-{t.schema}-{t.name}">{E(t.name)}</a></li>' for t in eigene)
    core_verwendet = any(s.verweis and s.verweis.startswith("core.") and s.name != "mandant_id" for t in eigene for s in t.spalten)
    core_satz = ("; Personen, Organisationen und Schuljahre liegen in EduKSX-Core (im Diagramm grau)" if core_verwendet
                 else " (→ <code>core.mandant</code>); sonst keine Verweise auf EduKSX-Core")
    return f"""<!DOCTYPE html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Entwickler – {E(produkt)}</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="../assets/eduksx.css">
{STIL}  {THEMA}
</head>
<body>
{kopf(produkt, "Datenmodell", "index.html")}  <main class="entwickler" id="inhalt">
    <h1>Entwickler</h1>
    <p>Datenmodell und Schnittstelle von {wortmarke(produkt)} für die Umsetzung – abgeleitet aus dem, was der Prototyp anzeigt
      und bearbeitet. Berechnete Werte werden nicht gespeichert, sondern über Ansichten oder die API berechnet.</p>

    <h2>API</h2>
    <div class="api-karten">
      <section class="karte"><h3>API-Dokumentation</h3><p class="small">Interaktive Beschreibung aller Endpunkte, Felder und Beispiele (Scalar).</p><a class="btn primaer" href="api.html">Dokumentation öffnen</a></section>
      <section class="karte"><h3>Swagger</h3><p class="small">Dieselbe Beschreibung in Swagger UI. Anfragen senden ist ausgeschaltet, solange es keinen Server gibt.</p><a class="btn" href="swagger.html">Swagger öffnen</a></section>
      <section class="karte"><h3>OpenAPI 3.1</h3><p class="small">{pfade} Operationen, {schemas} Schemas. Maschinenlesbar zum Import, z. B. in Postman.</p><a class="btn" href="openapi.json">JSON</a> <a class="btn" href="openapi.yaml" download>YAML</a></section>
    </div>

    <h2>Datenmodell</h2>
    <p>PostgreSQL 16, Schema <code>{E(modul)}</code>, {len(eigene)} Tabellen und {len(ansichten)} Ansichten. Jede Tabelle hat
      <code>mandant_id</code>{core_satz}.
      <a class="btn klein" href="datenmodell.sql" download>SQL-Script herunterladen</a></p>
    <div class="diagramm-wrap">{diagramm(tabellen, core)}</div>
    <p class="small muted">🔑 Primärschlüssel, → Verweis auf eine andere Tabelle. <code>mandant_id</code> (→ <code>core.mandant</code>, in jeder Tabelle) ist der Übersicht halber weggelassen. Ein Klick auf eine Tabelle führt zu ihren Spalten.</p>

    <h3>Tabellen</h3>
    <ul class="inhalt-liste">{inhalt}</ul>
    {"".join(tab(t) for t in eigene)}

    {"<h2>Ansichten</h2><ul>" + "".join(f"<li><code>{E(t.voll)}</code> – {E(t.text)}</li>" for t in ansichten) + "</ul>" if ansichten else ""}

    <h2 id="core">Core-Platzhalter</h2>
    <p class="small muted">Diese Tabellen gehören EduKSX-Core; sie sind im SQL-Script nur enthalten, damit es für sich lauffähig ist.</p>
    {"".join(tab(t) for t in core)}
  </main>
  <footer class="fuss"><span>{wortmarke(produkt)} · Entwickler · Stand der Umsetzungsgrundlagen</span><span><a href="../">Zurück zum Prototyp</a></span></footer>
</body>
</html>
"""


def seite_api(produkt: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <!-- Kein Element mit id="api-reference": Scalar würde es zusätzlich mit Standardwerten (Schriften aus dem Netz) laden.
       Die CSP verhindert jeden Abruf ausserhalb. -->
  <meta http-equiv="Content-Security-Policy" content="font-src 'self' data:; connect-src 'self'; img-src 'self' data:">
  <title>API – {E(produkt)}</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="../assets/eduksx.css">
{STIL}  {THEMA}
</head>
<body>
{kopf(produkt, "API-Dokumentation", "api.html")}  <noscript>Die interaktive Dokumentation braucht JavaScript. Die Beschreibung steht als <a href="openapi.json">OpenAPI-Datei</a> zur Verfügung.</noscript>
  <div id="api-doku"></div>
  <!-- Scalar API Reference (MIT), selbst ausgeliefert: keine Abrufe bei CDN oder fonts.scalar.com -->
  <script src="lib/scalar/standalone.js"></script>
  <script>
    Scalar.createApiReference("#api-doku", {{
      url: "openapi.json",
      withDefaultFonts: false,
      hideDownloadButton: false,
      hideTestRequestButton: true,
      showDeveloperTools: "never",
      telemetry: false,
      agent: {{ disabled: true }},
      darkMode: document.documentElement.classList.contains("dark"),
      defaultHttpClient: {{ targetKey: "shell", clientKey: "curl" }},
      metaData: {{ title: "API – {E(produkt)}" }},
      customCss: ".scalar-app {{ --scalar-font: var(--font-sans); --scalar-font-code: ui-monospace, SFMono-Regular, Menlo, monospace; }}",
    }});
  </script>
</body>
</html>
"""


def seite_swagger(produkt: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <meta http-equiv="Content-Security-Policy" content="font-src 'self' data:; connect-src 'self'; img-src 'self' data:">
  <title>Swagger – {E(produkt)}</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="../assets/eduksx.css">
  <link rel="stylesheet" href="lib/swagger-ui/swagger-ui.css">
{STIL}  {THEMA}
</head>
<body>
{kopf(produkt, "Swagger", "swagger.html")}  <noscript>Die Swagger-Seite braucht JavaScript. Die Beschreibung steht als <a href="openapi.json">OpenAPI-Datei</a> zur Verfügung.</noscript>
  <div id="swagger-ui" style="background:#fff"></div>
  <!-- Swagger UI (Apache-2.0), selbst ausgeliefert; Anfragen senden ausgeschaltet (noch kein Server) -->
  <script src="lib/swagger-ui/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({{ url: "openapi.json", dom_id: "#swagger-ui", deepLinking: true, supportedSubmitMethods: [], validatorUrl: null,
      defaultModelsExpandDepth: 0, docExpansion: "list" }});
  </script>
</body>
</html>
"""


# ---------------------------------------------------------------------------------------------------- Bauen

def dateien(modul: str) -> dict[str, str | bytes]:
    _, produkt = MODULE[modul]
    core_sql = (UMSETZUNG / "core-referenz.sql").read_text(encoding="utf-8")
    sql = (UMSETZUNG / modul / "datenbank.sql").read_text(encoding="utf-8")
    yaml_text = (UMSETZUNG / modul / "openapi.yaml").read_text(encoding="utf-8")
    try:
        import yaml  # nur zum Umwandeln nach JSON
        api = yaml.safe_load(yaml_text)
        api_json: str | None = json.dumps(api, ensure_ascii=False, indent=2) + "\n"
    except ImportError:
        vorhanden = ROOT / "prototypen" / MODULE[modul][0] / "entwickler" / "openapi.json"
        api = json.loads(vorhanden.read_text(encoding="utf-8")) if vorhanden.is_file() else None
        api_json = None
    out: dict[str, str | bytes] = {
        "index.html": seite_index(produkt, modul, tabellen_lesen(sql), tabellen_lesen(core_sql), api),
        "api.html": seite_api(produkt),
        "swagger.html": seite_swagger(produkt),
        "openapi.yaml": yaml_text,
        "lib/scalar/LICENSE": SCALAR_LIZENZ,
        "datenmodell.sql": f"-- {produkt} – Datenmodell (Entwurf), direkt ausführbar: zuerst Core-Platzhalter, dann das Modul\n"
                           f"-- Quelle: docs/umsetzung/core-referenz.sql und docs/umsetzung/{modul}/datenbank.sql\n\n{core_sql}\n{sql}",
    }
    if api_json is not None:
        out["openapi.json"] = api_json
    return out


def bauen(lib: Path | None, pruefen: bool) -> list[str]:
    veraltet = []
    for modul, (ordner, _) in MODULE.items():
        ziel = ROOT / "prototypen" / ordner / "entwickler"
        for name, inhalt in dateien(modul).items():
            pfad = ziel / name
            alt = pfad.read_text(encoding="utf-8") if pfad.is_file() else None
            if alt != inhalt:
                veraltet.append(str(pfad.relative_to(ROOT)))
                if not pruefen:
                    pfad.parent.mkdir(parents=True, exist_ok=True)
                    pfad.write_text(inhalt, encoding="utf-8")
        for rel, quelle in LIB.items():
            pfad = ziel / "lib" / rel
            if lib:
                q = lib / quelle
                if not pfad.is_file() or pfad.read_bytes() != q.read_bytes():
                    veraltet.append(str(pfad.relative_to(ROOT)))
                    if not pruefen:
                        pfad.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(q, pfad)
            elif not pfad.is_file():
                veraltet.append(f"{pfad.relative_to(ROOT)} (fehlt – mit --lib node_modules angeben)")
    return veraltet


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--lib", type=Path, help="node_modules mit @scalar/api-reference und swagger-ui-dist")
    ap.add_argument("--pruefen", action="store_true", help="nur prüfen, ob alles aktuell ist")
    a = ap.parse_args(argv)
    veraltet = bauen(a.lib, a.pruefen)
    if a.pruefen:
        for v in veraltet:
            print(f"✗ veraltet: {v}")
        print("✓ Entwicklerbereiche aktuell." if not veraltet else "→ python3 tools/entwickler_bauen.py")
        return 1 if veraltet else 0
    print(f"✓ {len(veraltet)} Datei(en) geschrieben." if veraltet else "✓ Alles aktuell.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
