# Prototyp: Rechtssammlung

**Status:** in-arbeit · **Version:** 0.16.0 · **Technik:** html · **Ziel-Modul:** EduKSX-Codex

## Frage

Wie sind die systematischen Rechtssammlungen der Zürcher Gemeinden und Schulgemeinden heute aufgebaut
(Menüpfad, Rubriken, Nummerierung, Dateien) – und wie lässt sich daraus eine einheitliche Codex-Normalform ableiten?

## Starten

`index.html` im Browser öffnen. Links das Menü: je Bezirk die politischen Gemeinden und die Schulgemeinden (eigener
Zweig); bei erfassten Organisationen klappen die Rubriken der Rechtssammlung auf. Rechts Steckbrief, Befunde,
Struktur und Dokumente; von dort führen die Demo-Seiten unter `demo/` weiter. Online über die Einstiegsseite der Prototypen.

Neu erzeugen (JSON, Übersicht, Demo-Seiten, Evaluation): `python3 prototypen/rechtssammlung/tools/build.py`

## Inhalt

| Pfad | Zweck |
|---|---|
| `index.html` | Übersicht im EduKSX-Auftritt mit Menü links: Bezirk › Politische Gemeinden (Vermerk «EG» = Einheitsgemeinde, «EG ?» = nicht gesichert) / Schulgemeinden › Rubriken |
| `assets/app.js`, `assets/codex.css` | Menü und Ansichten: Übersicht (Kennzahlen, Fortschritt je Bezirk, Handlungsbedarf), Vergleich, Bezirk, Gemeinde, Schulgemeinden, Organisation (Steckbrief, Nachbau, iFrame-Variante, Original ⟷ Nachbau, Matrix-Spalte), Rubrik mit PDF-Vorschau, Struktur-Matrix |
| `assets/daten.js` | Daten für Übersicht und Widget (erzeugt von `tools/build.py`) |
| `embed/` | Einbettbares Widget (`embed/index.html?org=<id>`): Sachgebiet › Unterordner › Dokument, Suche, PDF-Vorschau, meldet seine Höhe per `postMessage` |
| `demo/<id>.html` | Nachbau der Original-Seite (Schrift, Farben, Aufbau; ohne Logos) |
| `demo/<id>-iframe.html` | Gleicher Nachbau, Inhalt durch das Widget im iFrame ersetzt |
| `docs/evaluation.md` | Evaluation mit Menüstruktur und vollständiger Dateiliste je Organisation |
| `data/rechtssammlungen.json` | Normalisiertes Datenmodell (Rubrik → Unterordner → Dokument) |
| `data/gemeinden-zh.csv` | 160 politische Gemeinden mit Website (aus Verwaltungs-E-Mail), CMS, Status |
| `data/raw/zhlex-versionen.json` | Fassungen (Nachträge) von 29 kantonalen Erlassen aus ZH-Lex mit Publikations-, Inkraftsetzungs- und Aufhebungsdatum, abgerufen 20.11.2026 |
| `data/raw/` | Rohdaten aus den Websites |
| `data/pflichtkatalog.json` | Pflichtkatalog Schulgemeinde: 40 Dokumente in 5 Kategorien mit Einstufung P/B/O, Aufnahme in die Rechtssammlung, Quelle und Suchmuster (Recherche 20.11.2026, Original in `quellen/pflichtdokumente_schulgemeinde_zh.md`, zu prüfen) |
| `data/rechtsgrundlagen.json` | Gesetzestexte & Verordnungen: 65 Rechtsgrundlagen für Schulen (62 aus der Liste, ergänzt um FAG, FAV, CRG; Bund, Kanton, Bildungsrat, Gemeinde) mit Sachbereich, Artikel und Quelle; Fundstelle, Ebene und Direktlink ergänzt `tools/build.py` |
| `quellen/` | Leitfaden systematische Rechtssammlung (Original von zh.ch und PDF für die Vorschau), Herkunft in `quellen/README.md` |
| `texte/` | Textfassungen (Markdown) je ZH-Lex-Fassung und Unterschiede je Fassungspaar (JSON), erzeugt von `tools/texte.py` – 27 kantonale Erlasse (u. a. VSG, VSV, VSM, LPVO, GG, VGG, CRG, IDG, IVSV, SVO, PBG) und 9 Bundeserlasse (BV, KRK, BehiG, ZGB, OR, URG, DSG, DSV, StGB) |
| `tools/fedlex.py` | Bundesrecht aus Fedlex: Fassungen über den SPARQL-Endpunkt, amtliche HTML-Fassung → Markdown (`texte/sr-<SR>/`), Fassungsliste `data/raw/fedlex-versionen.json` |
| `tools/texte.py` | Vorab-Aufbereitung: ZH-Lex-PDF laden, in Markdown umwandeln, Unterschiede berechnen (`python3 tools/texte.py 412.100`) |
| `tools/build.py` | Generator: Datenmodell, Normenhierarchien (`HIERARCHIEN`: 7 Themen – Personalrecht, Finanzen, Volksschule, Datenschutz & ICT, Sonderpädagogik, Beschaffung & Bau, Kindesschutz), Schulgemeinden (60) mit Einheitsgemeinde-Herleitung, Struktur-Matrix, Nachbauten |

## Erfasst (Stand 17.11.2026)

| Organisation | Menüpfad | Dokumente |
|---|---|---|
| Politische Gemeinde Trüllikon | Wir für Sie › Rechtssammlung | 39 |
| Primarschule Trüllikon | Download › Systematische Rechtssammlung | 190 |
| Sekundarschule Kreis Marthalen | Schulgemeinde › Systematische Rechtssammlung | 50 |
| Sekundarschule Bülach | Schulverwaltung › Systematische Rechtssammlung | 12 |
| Politische Gemeinde Meilen (Einheitsgemeinde) | Verwaltung › Rechtssammlung › 1–9 | 164 |
| Politische Gemeinde Bachenbülach | Verwaltung › Systematische Rechtssammlung | 26 |
| Schule Bachenbülach (Primarstufe der Gemeinde) | Schule › Service › Reglemente und Dokumente | 27 |
| Politische Gemeinde Höri | Politik & Verwaltung › Verwaltung › Rechtssammlung | 49 |
| Primarschulgemeinde Höri | Organisation › Schulpflege › Rechtsgrundlagen | 4 |
| Politische Gemeinde Winkel | Verwaltung › Rechtssammlung › 1–9 | 46 |
| Schule Winkel (Primarstufe der Gemeinde) | Betreuung › Dokumente | 7 |
| Politische Gemeinde Hochfelden | Politik › Gesetzessammlung | 77 |
| Politische Gemeinde Dübendorf | Politik › Gesetzessammlung › 1–9 | 89 |
| Primarschule Dübendorf (Primarstufe der Stadt) | Organisation › Rechtssammlung | 10 |
| Sekundarschulgemeinde Dübendorf-Schwerzenbach | Informationen › Systematische Rechtssammlung | 27 |
| Politische Gemeinde Fehraltorf (Einheitsgemeinde) | Verwaltung › Gesetzessammlung › 1–9 | 118 |

## Quellen

- **Leitfaden zum Aufbau einer systematischen Rechtssammlung** (Gemeindeamt Kanton Zürich mit VZGV, Juni 2018,
  Ergänzung Februar 2019), abgelegt in `quellen/`. Daraus abgeleitet: Ansicht «Grundlagen» und die automatische
  Leitfaden-Prüfung je Organisation (Gliederung, höchstens 9 Sachgebiete, Nummern, nur Erlasse und rechtsetzende
  Verträge, Kennzeichnung nicht rechtsetzender Dokumente, Systematik Anhang 1/2). Die Prüfung stützt sich nur auf
  Titel und Ablageorte und ist ein Anhaltspunkt, keine rechtliche Beurteilung.
- Rechtsgrundlagen: Gemeindegesetz (GG, LS 131.1) § 7 Abs. 2, Gemeindeverordnung (VGG, LS 131.11) § 2; Systematik der
  Zürcher Gesetzessammlung (ZH-Lex, 14 Ordner der Loseblattsammlung).

- Schulgemeinden und Zahl der Gemeinden mit Schulaufgaben: Gemeindeamt Kanton Zürich, «Verzeichnis der Gemeinden des
  Kantons Zürich», Stand 1. Juli 2026 (8 Volksschul-, 24 Primarschul-, 28 Sekundarschulgemeinden; 114 politische
  Gemeinden mit Schulaufgaben).
- Websites: Domain der Verwaltungs-E-Mail aus «Liste Politische Gemeinden» (Gemeindeamt); BFS-Nummern über die
  Gebietsstammdaten-API.
- Der Vermerk «EG» (Einheitsgemeinde) ist hergeleitet; «?» heisst: Mitglieder einer Schulgemeinde im Bezirk noch nicht
  bekannt. Bei den erfassten Gemeinden ist er geprüft (Bachenbülach/Winkel: Zugehörigkeit zur Sek Bülach noch offen).

## Ergebnis

Noch offen. Erste Erkenntnisse in `docs/evaluation.md` (Befunde je Organisation, nächste Schritte).

## Hinweise

- Die Daten sind öffentlich publizierte Erlasse und Dokumentnamen der Organisationen, keine Personendaten.
- Demo-Seiten übernehmen Schrift, Farben und Seitenaufbau der Originale, aber **keine Logos**; sie tragen den Hinweis
  «keine offizielle Seite» und `noindex`. Die Original-Stylesheets sind nur als Kommentar referenziert.
- Einbettung geprüft (17.11.2026): Nur die SKM-Website erlaubt das Einbetten in fremde Seiten; alle anderen senden
  `X-Frame-Options` bzw. `frame-ancestors`. Darum zeigt «Original ⟷ Nachbau» dort einen Knopf, der beide Seiten als
  Fenster nebeneinander öffnet, und die PDF-Vorschau funktioniert vorerst nur bei der SKM – nach Übernahme der
  Dokumente in die EduKSX-Dokumentenablage für alle.
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
