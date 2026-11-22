# Übergabe an einen neuen Chat – EduKSX-Prototyp

Stand: **JJJJ-MM-TT (hh:mm)** – ein Satz zum Stand (letztes Release, laufender Meilenstein, was im Beta-Test ist).
[PROJEKTSTAND.md](PROJEKTSTAND.md) (aktuell), [PROJEKTSTAND-ARCHIV.md](PROJEKTSTAND-ARCHIV.md) (Verlauf), Konzepte in
`docs/KONZEPT-*.md`. Bei jeder Übergabe nachführen.

## Start nächster Chat (Übergabe JJJJ-MM-TT, hh:mm)

**Zuerst lesen:** CLAUDE.md → AGENTS.md → dieser Abschnitt → PROJEKTSTAND.md → passende KONZEPT-*.md.

**Stand Code und CI**
- `main` = `abc1234` (kurz, was der letzte Commit war). Arbeitsbaum sauber? CI auf `main` grün?
- Letztes Release **v0.1.0** (Datum). Release in Arbeit? Nächstes nur auf ausdrückliche Freigabe.
- Prüfen: `python3 tools/pruefen.py` (Anzahl Tests, Dauer); weitere Prüfungen mit Befehl.

**Offene Issues und ihr Status**

| Issue | Meilenstein | Status | Inhalt / Testliste |
|---|---|---|---|
| #1 | 0.2.0 – Thema | `_3 Beta-Test` | was zu testen ist |
| #2 | Funktionen | `_1 bereit` | **nicht umgesetzt** – erst auf Wort von Projektverantwortliche:r |

Schliessen erst nach «getestet ok» bzw. abgehakter Testliste.

**Hinweise für die Arbeit**
- Werkzeuge, Testdaten, Stolpersteine (z. B. Cache, Zugänge, was nur von Hand geht).

**Arbeitsregeln** (siehe AGENTS.md)
- Jedes Thema aus dem Chat → Issue mit Testliste; Status `_1 bereit` → `_2 in Arbeit` → `_3 Beta-Test`.
- Verbesserungen aus dem Test nur als Issue anlegen; umsetzen erst nach Freigabe.
- Releases nur nach ausdrücklicher Freigabe; `VERSION`, Tags und Releases nicht anfassen.
- Löschen nur nach Rückfrage.

## Sitzungen

Neueste oben. Je Sitzung: Datum und Zeit, Thema, umgesetzte Issues, Entscheide (mit Datum), Offenes. Ältere Sitzungen
gelegentlich gekürzt nach `PROJEKTSTAND-ARCHIV.md` verschieben.

### Sitzung 2026-11-20 – Codex 0.34.0 – Rechtsänderungs-Monitoring, Phase 6 (#62)

- Phase 6 des Plans. `rechtsaenderungen()` in build.py: je Erlass Unterschied der zwei jüngsten geltenden Fassungen (texte/<nr>/delta_*.json), Absätze den Paragrafen zugeordnet; reine Umbrüche der PDF-Umwandlung (gleiche Zeichen) ausgeblendet. 37 Erlasse mit inhaltlicher Änderung.
- Auswirkungen: Verbindungen mit geänderter Belegstelle (9), Rechtsstellen im Elternwegweiser (2), kommunale Dokumente «zu prüfen» (22, Beispiele der kommunalen Knoten an diesen Verbindungen, z. B. LPVO § 3 → 7 Organisationsstatute/Funktionendiagramme) und «zur Kenntnis» (418, nur Zählung).
- Seite `#/aenderungen/<org>/<monate>` mit Filter Organisation und Zeitraum (6/12/24 Monate, alle), Kennzahlen, Prüfliste je Organisation, Haken «geprüft» (im Prototyp nur im Browser); Link auf der Organisationsseite; Menü unter Gesetzestexte.
- Datenmodell: `change_review_items` (Status offen, keine Anpassung, Anpassung nötig, angepasst, nicht relevant), `act_version_differences.changed_locations`/`cosmetic_count`; API `GET /legal-changes`, Ressource `/change-review-items`, Ereignis `codex.change_review.created`. Pflichtenheft CDX-F-28, offener Punkt 9.
- Nächste Phase: 5 – Praxisthemen für Schulleitungen.

### Sitzung 2026-11-20 – Codex 0.33.0 – «keine Relevanz» im Pflichtkatalog (#61)

- Pflichtkatalog: Auswahl «Für Organisation erfassen» (Route `#/pflicht/<org>`, Knopf «Erfassen» je Zeile). Spalte «Bei <Organisation>» mit Status (vorhanden, unsicher, fehlt) und bei fehlenden bzw. unsicheren Einträgen Haken «keine Relevanz» mit Grund (gibt es nicht, muss nicht geregelt werden, anderswo geregelt, anderer Grund) und Bemerkung. Vollständigkeit zählt nicht relevante Einträge nicht mit; neue Spalte «Keine Relevanz». Struktur-Matrix zeigt solche Zellen als «∅ keine Relevanz».
- Im Prototyp nur im Browser gespeichert (localStorage `eduksx-codex-keine-relevanz`); getestet mit Playwright (Zählung 2/5 → 2/4, Matrix, Reload).
- Datenmodell: Tabelle `mandatory_document_assessments` (Herausgeber × Pflichtdokument, is_relevant, reason, note); API `PUT /publishers/{publisher_key}/mandatory-documents/{document_key}/relevance` und Liste `/mandatory-document-assessments`. Pflichtenheft CDX-F-27. SQL-Test PostgreSQL ok (42 Tabellen), OpenAPI validiert.

### Sitzung 2026-11-20 – Codex 0.32.0 – Dokumenttyp A/B/C, Phase 4 (#60)

- Phase 4 des Plans. Typen: A Rechtserlass (gehört in die Rechtssammlung, § 7 Abs. 2 GG), A/B je nach Ausgestaltung, B verbindliches Führungsdokument, C ergänzendes Dokument, – gehört nicht in die Sammlung, ? unklar. Überall als Vorschlag mit Status ZU PRÜFEN gekennzeichnet.
- Pflichtkatalog (`PFLICHT_TYP` in build.py): 18 × A, 13 × A/B, 9 × B. Kommunale Dokumente (`doktyp()`): aus Dokumentart nach Leitfaden (Gemeinde-/Behördenerlass, Vertrag, Raumplan → A; nicht rechtsetzend → B bei Konzept/Richtlinie/Funktionendiagramm …, sonst C; Beschluss/Budget → –): 585 A, 57 B, 23 C, 208 –, 62 unklar.
- Anzeige: Spalte «Typ (Vorschlag)» und Erläuterung im Pflichtkatalog, Typ in der Struktur-Matrix (Pflichtzeilen), Spalte «Typ» in den Dokumentlisten, Zählung je Organisation.
- Datenmodell: `document_class` und `document_class_reviewed` auf `mandatory_documents` und `legal_acts`; API-Schema MandatoryDocumentEntry; Importblatt «pflichtdokumente» mit `document_class`; Ladetest PostgreSQL ok. Pflichtenheft CDX-F-26, offener Punkt 8 (fachliche Abnahme).
- Nächste Phase: 6 – Rechtsänderungs-Monitoring.

### Sitzung 2026-11-20 – Codex 0.31.0 – Schulsozialarbeit, Schulanlagen, Phase 3 (#59)

- Phase 3 des Plans, 31 Themen. **schulsozialarbeit**: ZGB Art. 314c/314d, StGB Art. 320 → KJHG §§ 6 c, 12, 19, VSG § 51, IDG §§ 16–17 → Konzept/Leistungsvereinbarung (keine Beispiele in den erfassten Sammlungen). **schulanlagen**: BehiG Art. 3 → PBG §§ 60, 239 a, VSG § 41 → VSV § 3 a → Benützungs- und Gebührenreglemente (9 Beispiele: SKM, Sek Bülach, Meilen, Hochfelden, Dübendorf, Sek Dübendorf-Schwerzenbach, Fehraltorf; Schiessanlagen, Veloabstellplätze, Statuten, Clubs ausgeschlossen).
- Nächste Phase: 4 – Dokumenttyp A/B/C (Vorschlag mit Status ZU PRÜFEN; fachliche Abnahme offen).

### Sitzung 2026-11-20 – Codex 0.30.0 – Gruppen neu, Phase 2 (#58)

- Phase 2 des Plans: neun statt sieben Gruppen. Finanzen & Beschaffung (finanzen, beschaffung), Information & ICT (datenschutz), Infrastruktur & Sicherheit (haftung; Schulanlagen folgt in Phase 3). Reihenfolge finanzen → beschaffung → datenschutz → haftung. Adressen der Themen unverändert.
- KI-RECHERCHE.md und KONZEPT-CODEX-VERSIONEN.md mit den neuen Gruppennamen.
- Nächste Phase: 3 – Schulsozialarbeit & Jugendhilfe, Schulanlagen & Raumnutzung.

### Sitzung 2026-11-20 – Codex 0.29.0 – vier Ergänzungen, Phase 1 (#57)

- Phase 1 des Plans (Whiteboard «EduKSX-Codex – Plan Ausbau Normenhierarchie», https://claude.ai/artifact/MvC5pVrPpdWuQ6fddfqUGK).
- Neue Erlasse (62 Textfassungen): SR 412.10 BBG, SR 151.1 GlG, SR 822.11 ArG, SR 822.113 ArGV 3 (Fedlex), LS 413.31 EG BBG (ZH-Lex, 16 Fassungen). Arbeitsgesetz gilt für Gemeinden nur beim Gesundheitsschutz (Art. 3a).
- Ergänzt über `_ergaenzen()` in `build.py`: **beurteilung** heisst jetzt «Beurteilung, Laufbahn & Berufswahl» (neue Ebene Bund; BBG Art. 12, 51 → EG BBG § 34; VSV § 29 lit. f Schnupperlehren); **tagesstrukturen** mit Knoten Aufgabenhilfe/Nachhilfe/HSK (VSG §§ 15, 17, 17 a; VSV § 13; 2 Beispiele); **absenzen** mit Ebene Bund (BV Art. 15 → VSV § 29 lit. c hohe religiöse Feiertage); **personal** mit GlG Art. 2/3, ArG Art. 3a/6 und ArGV 3.
- Nächste Phase: 2 – Gruppe «Ressourcen» aufteilen.

### Sitzung 2026-11-20 – Codex 0.28.0 – Sport und Haftung mit neuen Erlassen (#56)

- Neue Erlasse (57 statt 52 Textfassungen): SR 415.0 SpoFöG (ELI 2012/460), SR 415.01 SpoFöV (2012/461), SR 832.10 KVG und SR 832.20 UVG (je die zwei letzten geltenden Fassungen) über `tools/fedlex.py`; LS 170.1 Haftungsgesetz über `tools/zhlex_versionen.py` (13 Fassungen) und `tools/texte.py --nur-aktuell`. ELI über SPARQL nach SR-Nummer ermittelt.
- Neue Normenhierarchien (29): **sport** (Gruppe Unterricht; SpoFöG Art. 8, 12 → SpoFöV Art. 49 drei Lektionen → VSG §§ 18, 21 → Lehrplan/Lektionentafel → Schulsport- und Lagerreglemente; 6 Beispiele: Sek Bülach, Meilen, Sek Dübendorf-Schwerzenbach), **haftung** (Gruppe Ressourcen; UVG Art. 1a, KVG Art. 1a/28 → Haftungsgesetz §§ 2, 6 → VSG § 10 → VSV §§ 8, 32 m → Versicherungen, Schulweg, Schülertransport; 5 Beispiele: Trüllikon, Meilen).
- Elternwegweiser: Kosten → sport (Lager). Inhaltspaket neu exportiert (29 Hierarchien, 185 Knoten, 206 Verbindungen).
- Offen (als Ergänzung bestehender Themen vorgeschlagen): Berufswahl/Sek II zu Beurteilung & Laufbahn, ergänzende Angebote zu Tagesstrukturen, religiöse Feiertage zu Absenzen, Arbeitssicherheit/Gleichstellung zu Personal.

### Sitzung 2026-11-20 – Codex 0.27.0 – Schulbetrieb, Disziplin, Privatschulen (#55)

- Neue Normenhierarchien (27 statt 24): **schulbetrieb** (Gruppe Schule; VSG §§ 21, 26, 27, 30 → VSV §§ 21, 26, 32 → Lektionentafel BRB 5/2017, 1/2019, 5/2021 → Ferienplan/Stundenplan), **disziplin** (Gruppe Kinder; KRK Art. 28, BV Art. 19 → VSG §§ 50, 52, 52 a, 75 → VRG § 19 → VSV §§ 56, 58 → Schul-/Hausordnung), **privatschulen** (Gruppe Schule; BV Art. 62 → VSG §§ 68, 69, 71 → VSV §§ 67, 73). Alle Belegstellen in der geltenden Fassung gefunden.
- Kommunale Beispiele: Privatschulen 1 (Fehraltorf), Schulbetrieb und Disziplin 0 – Ferienpläne und Schulordnungen stehen meist nicht in der Rechtssammlung. Suchmuster bewusst eng (keine Hausordnungen von Sammelstellen o. Ä.).
- Elternwegweiser: Disziplin → disziplin, Eintritt → privatschulen, Absenzen → schulbetrieb.
- Inhaltspaket `data/inhalte/` neu exportiert (27 Hierarchien, 174 Knoten, 195 Verbindungen).
- Als Nächstes (#55 folgt): Sport & Bewegung und Haftung & Versicherung – dafür neue Erlasse aufnehmen.

### Sitzung 2026-11-20 – Codex 0.26.0 – Menü und Ebenen-Reihenfolge (#54)

- Menü: Gruppe «Gesetzestexte & Verordnungen» zuerst: Publikationsquellen (vorher Herkunftsliste), Rechtsgrundlagen Volksschule (vorher Rechtsgrundlagen Schule; Seitentitel vorher «Gesetzestexte & Verordnungen»), Normenhierarchien (24 Themen, vorher Einzahl), Textfassungen & Änderungen, Elternwegweiser. Gruppe «Gemeinde-Sammlungen»: Versionen & Abgleich, Übersicht, Vergleich, Gemeinden, Schulgemeinden, Struktur-Matrix, Pflichtkatalog, Leitfaden Rechtssammlung (Gemeindeamt). Zähler bei Hierarchien und Textfassungen.
- Reihenfolge der Ebenen zentral in `app.js` (`RANG`, `rang()`, `nachEbene()`): Bund, Interkantonal, Kanton, Bildungsrat, Volksschulamt, Gemeindeamt, Bezirk, Gemeinde. Angewendet auf Quellenkatalog (je Klasse), massgebende Publikationsquellen, Rechtsgrundlagen (je Sachbereich), Textfassungen (SR vor LS), Rechtsstellen im Elternwegweiser, Kennzahlen bei Versionen & Abgleich. Routen unverändert.
- Umbenennung «Rechtsgrundlagen Volksschule» auch in Datenmodell, API und Pflichtenheft.

### Sitzung 2026-11-20 – Codex 0.25.0 – Inhalte in die Datenbank (#53)

- Datenmodell (`docs/umsetzung/codex/datenbank.sql`): Redaktionsspalten (`content_status`, `review_status`, Recherche, Importlauf, Freigabe) auf Hierarchien, Elternthemen, Pflichtdokumenten, Rechtsgrundlagen; neue Tabellen `content_imports`, `content_import_items`, `hierarchy_node_links`, `hierarchy_edge_evidences`, `parent_guide_topic_hierarchies`; `legal_bases` mit Titel/Fundstelle, Erlass optional (BRB, kommunal). Zuordnung Anzeige → Tabelle: Pflichtenheft 3.7.
- API: `…/by-key/{key}` (GET/PUT/DELETE), `…/publication`, `/content-imports/bundle|file` (dry_run/apply), `/content-imports/{id}/application`, `/content-exports`, Ereignis `codex.content.published`. OpenAPI validiert.
- `prototypen/rechtssammlung/tools/inhalte.py`: export (→ `data/inhalte/` JSON, XLSX, CSV, Vorlage), pruefen, umwandeln, sql. Rundlauf JSON↔Excel↔CSV verlustfrei; Ladetest in PostgreSQL 16 mit allen 24 Hierarchien, 160 Knoten, 180 Verbindungen, 207 Belegen, 13 Elternthemen, 40 Pflichtdokumenten, 79 Rechtsgrundlagen. 14 Warnungen = bekannte Lücken (Verbindungen ohne Beleg).
- `docs/umsetzung/codex/KI-RECHERCHE.md`: Auftrag zum Kopieren, Quellen, Schreibweisen, Ablauf (Probelauf → Entwurf → Freigabe durch Menschen).
- Offen (Pflichtenheft 5.5–5.7): Rechte des KI-Clients, Versionierung von Hierarchien, Rhythmus der Recherche. Implementierung der API selbst erfolgt im Modul.

### Sitzung 2026-11-20 – EduKSX-Codex 0.24.0

- Rückmeldung: Themenauswahl unübersichtlich. Umgesetzt (#52 → `_3 Beta-Test`): `KURZTITEL` in tools/build.py, Navigation
  `.themenwahl` (CSS-Spalten, Gruppen ungeteilt). Version 0.24.0, weil eine parallele Sitzung 0.23.1 vergeben hat (#51).

### Sitzung 2026-11-20 – Umsetzungsgrundlagen nach DB-/API-Standard (#51)

- Architektur (PR #66, gemerged): DB-Standard 1.3 (A8, DB-E13), API-Standard 1.2 (A8, API-E37) – englische Namen,
  deutsche Beschreibungen verbindlich; Modulschlüssel `flow` registriert.
- `docs/umsetzung/*/datenbank.sql` englisch mit strukturierten Kommentaren; `standardtabellen.sql` wird in jedes
  Skript kopiert. Erzeugen/prüfen: `python3 tools/umsetzung_bauen.py [--pruefen]` (Definitionen der API in
  `tools/umsetzung/api_<modul>.py`, Parser in `tools/umsetzung/modell.py`), danach `python3 tools/entwickler_bauen.py`.
- Geprüft: PostgreSQL 16 (127 Tabellen, 6 Ansichten, 1561 Kommentare; `time.daily_totals` rechnet 540 Min. Ist),
  openapi-spec-validator, Tests grün. `core-referenz.sql` gelöscht (nach Rückfrage), ersetzt durch `standardtabellen.sql`.

### Sitzung 2026-11-20 – EduKSX-Codex 0.23.0

- Auftrag: Organisation ergänzen (Behörden, Gemeindeversammlung, Organisationsstruktur). Umgesetzt (#46 → `_3 Beta-Test`);
  GPR (LS 161) und VPR (LS 161.1) in ZH-Lex geprüft, geltende Fassung als Text. Kommunale Beispiele bei Zweckverbänden auf Schule,
  Kinder und Jugend eingeschränkt.

### Sitzung 2026-11-20 – EduKSX-Codex 0.21.0

- Auftrag: Themen aus Elternsicht, Variante B (Wegweiser statt doppelter Hierarchien). Umgesetzt (#45 → `_3 Beta-Test`):
  `ELTERNFRAGEN`/`elternwegweiser()` in tools/build.py, Seite `#/eltern/<org>`; Gruppen Kinder und Eltern getrennt.

### Sitzung 2026-11-20 – EduKSX-Codex 0.20.0

- Auftrag: alle Themen aus der Durchsicht des Volksschulgesetzes umsetzen. Umgesetzt (#44 → `_3 Beta-Test`); Ordnungsnummern
  über ZH-Lex geprüft (410.6, 410.61, 852.1, 413.21, 413.250.1, 413.250.2, 414.16), PAVO über Fedlex (ELI 1977/1931_1931_1931).
  LS 852.23 (Bewilligung Kinderhorte) nicht abrufbar – Kinderhorte der Schule sind in VSG § 30 c und VSV §§ 32 g ff. geregelt.

### Sitzung 2026-11-20 – EduKSX-Codex 0.19.0

- Auftrag: Übersicht Eltern und Thema Gesundheit. Umgesetzt (#43 → `_3 Beta-Test`); Ordnungsnummern in ZH-Lex geprüft
  (810.1, 818.22, 818.11), EpG über Fedlex (ELI 2015/297).

### Sitzung 2026-11-20 – EduKSX-Codex 0.18.0

- Auftrag: Personalrecht prüfen, Themen nach Volksschulbezug ordnen. Umgesetzt (#42 → `_3 Beta-Test`): `REIHENFOLGE` und
  `GRUPPEN` in tools/build.py; Personalrecht neu mit Knoten vsg und anst.

### Sitzung 2026-11-20 – EduKSX-Codex 0.17.0

- Punkte 2, 5, 8 umgesetzt (#41 → `_3 Beta-Test`). Nächste Schritte als Vorschlag in `docs/KONZEPT-CODEX-VERSIONEN.md` Kapitel 4a
  (OFFEN / ZU PRÜFEN) – Entscheid des Auftraggebers ausstehend. Punkt 1 (fachliche Prüfung) bleibt extern.

### Sitzung 2026-11-20 – EduKSX-Codex 0.16.0

- Auftrag (Zwischenmeldung): Recherche «Pflichtdokumente und optionale Reglemente …» als Liste/Menüpunkt, in die Struktur-Matrix,
  Matrix mit Auswahl bis 3 Organisationen. Umgesetzt (#40 → `_3 Beta-Test`): `data/pflichtkatalog.json`, `pflicht_matrix()` in
  tools/build.py, Seite `#/pflicht`, Matrix-Route `#/matrix/<ids>`.
- Offen: Einstufungen der Recherche sind **ZU PRÜFEN** (KI-gestützte Recherche, nicht abschliessend).

### Sitzung 2026-11-20 – EduKSX-Codex 0.15.0

- Punkt 4 umgesetzt (#39 → `_3 Beta-Test`): `maschinell()` und `abgleich_kanten()` in tools/build.py; Felder `status`,
  `maschinell`, `vorschlaege`, `fehlende_erlasse`.

### Sitzung 2026-11-20 – EduKSX-Codex 0.14.0

- Punkt 3 umgesetzt (#38 → `_3 Beta-Test`): `tools/fedlex.py` (SPARQL fedlex.data.admin.ch + HTML-Filestore, beide aus dem
  Arbeitsbereich erreichbar), Texte in `texte/sr-<SR>/<JJJJMMTT>.md`, Index-Feld `fundstelle`; künftige Stände nur als Metadaten.
- Hinweis: Die Ordner `texte/sr-*` wurden während der Arbeit einmal gelöscht und neu erzeugt (eigene, noch nicht eingecheckte Dateien).

### Sitzung 2026-11-20 – EduKSX-Codex 0.13.0

- Auftrag: offene Punkte ohne Prüfung von aussen, Reihenfolge 7 → 6 → 3 → 4 → 2, dazu 5 (Themen «Verfahren & Rechtsschutz»,
  «Unterricht & Medien») und 8 (Konzept). Punkt 1 (fachliche Prüfung) bleibt offen.
- Umgesetzt (#37 → `_3 Beta-Test`): Darstellung (Andockpunkte, Beschriftungen in eigener SVG-Ebene, Hervorhebung), Ansicht je
  Organisation, Querbezüge (`querbezuege()` in tools/build.py, Feld `themen`).

### Sitzung 2026-11-20 (07:55–08:40) – Entwicklerbereich in allen Prototypen

- Auftrag: DB und API direkt lesbar in den Modulen, wie bei EduKSX-Glossary. Entscheid im Chat (2026-11-20):
  Scalar **und** Swagger; Datenmodell als Tabellen mit eigenem Diagramm (ohne Mermaid).
- `tools/entwickler_bauen.py` erzeugt `prototypen/<name>/entwickler/` (index, api, swagger, openapi.json/.yaml,
  datenmodell.sql, lib/). Bibliotheken neu holen: `npm install @scalar/api-reference swagger-ui-dist` in einem
  temporären Ordner, dann `--lib <node_modules>`. Menüpunkt «Entwickler» in allen fünf Prototypen.
- Stolperstein: Ein Element mit `id="api-reference"` lässt Scalar zusätzlich mit Standardwerten laden (Schriften
  von fonts.scalar.com) – darum `#api-doku`; zusätzlich CSP `font-src 'self'`. Geprüft: keine externen Abrufe.
- Grösse: ca. 6,7 MB je Prototyp (Scalar 4,6 MB). CodeQL überspringt minifizierte Dateien – beobachten.
- Issues nachgeholt: #47 (Titel/Zurück-Taste), #48 (Umsetzungsgrundlagen), #49 (Entwickler), #50 (Sign), alle `_3 Beta-Test`.
  **Hinweis:** `gh auth status` meldet ein ungültiges Token und GraphQL ist gesperrt – Issues trotzdem über die REST-API
  anlegen: `gh api repos/MarkusKeller8200/EduKSX-Prototyp/issues -f title=… -f body=… -f "labels[]=…"`.

### Sitzung 2026-11-20 (03:00–03:50) – Umsetzungsgrundlagen aller Module

- Auftrag im Chat: für alle Module Datenbankstruktur, API sowie Anforderungskatalog/Pflichtenheft/Prüfpunkte.
- Neu `docs/umsetzung/`: README (Konventionen DB/API, 17 gemeinsame Prüfpunkte), `core-referenz.sql` (Platzhalter
  für Core), je Modul `datenbank.sql`, `openapi.yaml`, `PFLICHTENHEFT.md`. Abgeleitet aus den Daten und Ansichten der
  Prototypen (Stand Staffing 0.1.x, Flow 0.5.x, Codex 0.20.x, Sign 0.1.x, Time 0.3.x).
- Geprüft: alle SQL-Skripte in PostgreSQL 16 lauffähig (111 Tabellen/Ansichten), Tagesberechnung Time gegen Beispiel,
  OpenAPI mit `openapi-spec-validator` gültig, `tools/test_umsetzung.py` (YAML-Teil nur mit PyYAML).
- Alles ENTWURF/EMPFOHLEN. OFFEN u. a.: PostgreSQL oder Vorgabe von EduKSX-Core (MariaDB?), Python-Importdienste
  Codex, Signaturanbieter, Pausenregel Time. Issue noch anzulegen (GitHub-CLI ohne Anmeldung).

### Sitzung 2026-11-20 (00:00–00:30) – Prototyp EduKSX-Sign

- Neuer Prototyp `prototypen/signatur` (EduKSX-Sign – Signatur / Persönliche Ablage), Auftrag im Chat: Ablage je
  Mitarbeiter:in mit Ordnern und Drag & Drop, Abgleich mit der Cloud-Ablage, PDF-Formulare/Anmerkungen, Word inline,
  Signaturprozess mit PDF/A, Ergebnis `_sign` im Ursprungsordner, Versiegeln. Vorbild Signaturdienst (Name nicht im Prototyp).
- Getestet im Browser (Chrome, hell/dunkel, schmal): Hochladen, Formular, Werkzeuge, Prozess mit Platzhaltern,
  Unterschrift mit Code, Abschluss mit Siegel, Word-Umwandlung, Versiegeln Excel, Eingang, Abgleich/Konflikt.
- Issue nachgeholt: #50 (`_3 Beta-Test`).
- ZU PRÜFEN: Suffix `_seal`; Ablage erhaltener Unterschriften in «Unterzeichnet erhalten». OFFEN: Anbindung Cloud-Ablage, Anbieter.

### Sitzung 2026-11-17 (13:20–13:45) – Prototyp EduKSX-Time

- Neuer Prototyp `prototypen/zeiterfassung` (EduKSX-Time – Zeiterfassung / Stempeln), Vorbild: die im Intranet
  angebundene Zeiterfassung (Kommen/Gehen, Buchungsarten, Sollzeit). Schritt 1 = installierbare Mobil-App (PWA) zum
  Ein- und Ausstempeln (#19 → `_3 Beta-Test`). Getestet mit Handy-Ansicht (hell/dunkel), offline, Service Worker.
- Herstellername erscheint nicht im Prototyp (Regel «keine Fremd-/Herstellernamen»).
- EduKSX-Time 0.2.0: animierte Uhr beim Eingestempelt-Sein (#21 → `_3 Beta-Test`).
- EduKSX-Time 0.3.0: Soll-Markierung, gesetzliche Pause 30 Min. nach 5 h (zählt nicht als Arbeitszeit) (#22 → `_3 Beta-Test`).
  Entscheid 2026-11-17: Regel «nach 5 h 30 Min.» (Vorgabe Projektleitung); Abgleich mit Personalrecht ZU PRÜFEN.
- EduKSX-Time 0.3.1: gesetzliche Pause um alle gestempelten Pausen des Tages reduziert (#23 → `_3 Beta-Test`).
- EduKSX-Time 0.3.2: Pausentaste mit eigener Farbe und Kaffeetasse (#24 → `_3 Beta-Test`).
- EduKSX-Time 0.3.3: Symbole Kommen/Gehen als Tür mit Pfeil (#25 → `_3 Beta-Test`).
- EduKSX-Time 0.3.4: Gehen-Pfeil nach links, Farbe je Zustand (Kommen grün, Pause bernstein, Gehen rot) (#26 → `_3 Beta-Test`).
- Offen: Stempeln per NFC-Tag (Idee, noch kein Issue – Antwort Projektleitung ausstehend).
- Offen: weitere Schritte («der ganze Rest») je als Issue nach Freigabe; Icon «time» vorläufig, nicht im Icon-Set.

### Sitzung 2026-11-20 (02:40–03:00) – EduKSX-Codex 0.12.0

- Restliche Themen umgesetzt (#36 → `_3 Beta-Test`): Sonderpädagogik, Beschaffung & Bau, Kindesschutz & Schweigepflicht.
- Belegstelle per Textsuche (`("720.1", "suche:Art. 4 ¹ …")`) für Artikel im Anhang (IVöB).
- Texte neu: VFiSo, Aufsicht Sonderschulung, SpiV, BeiG IVöB, SVO, PBG (nur geltende Fassung, 34 Fassungen vorhanden).
- Offen: Bundesrecht (Fedlex) noch ohne Textfassung; kommunale Kindesschutz-Abläufe sind meist Merkblätter.

### Sitzung 2026-11-20 (02:05–02:40) – EduKSX-Codex 0.11.0

- Auftrag: weitere Themen für die Normenhierarchie – zuerst Volksschule und Datenschutz, einchecken, dann Sonderpädagogik,
  Beschaffung/Bau, Kindesschutz.
- Umgesetzt (#35 → `_3 Beta-Test`): `HIERARCHIEN` um «volksschule» und «datenschutz» erweitert; Knotenfeld `liste`
  (z. B. Bildungsratsbeschlüsse), Belegstelle «Ingress»; Linienart «nicht direkt anwendbar».
- Texte neu: BiG, VSM, Zeugnisreglement, IDG, IDV, IVSV, ArchG, ArchV, Auslagerungsgesetz (21 Erlasse).

### Sitzung 2026-11-20 (02:10–02:50) – EduKSX-Codex 0.10.0

- Auftrag: FAG und CRG aufnehmen, GG und VGG mit allen Fassungen als Text, Normenhierarchie Finanzen.
- Umgesetzt (#34 → `_3 Beta-Test`): Einträge 63–65 (FAG, FAV, CRG) in `data/rechtsgrundlagen.json` (Feld «ergaenzung»);
  Texte für 12 Erlasse; `HIERARCHIEN` in `tools/build.py` (Personalrecht, Finanzen) mit gemeinsamer Funktion
  `hierarchie()`; Route `#/hierarchie/<id>`.
- Offen: Gebühren-Spezialerlasse (Wasser, Abwasser, Abfall) bewusst ausgeschlossen; weitere Themen (Volksschule,
  Datenschutz); Tabellen in PDFs.

### Sitzung 2026-11-20 (01:10–02:10) – EduKSX-Codex 0.9.0

- Entscheide 2026-11-20: Aufbereitung vorab (Dateien statt Laufzeit-KI/API); Test an VSG, VSV, LPVO; Normenhierarchie Personalrecht.
- Umgesetzt (#33 → `_3 Beta-Test`): `tools/texte.py` (ZH-Lex-PDF → Markdown, Unterschiede), Ansichten «Textfassungen & Änderungen» und «Normenhierarchie».
- Hinweis: Der Arbeitsbereich erreicht zh.ch und notes.zh.ch direkt (curl/urllib) – die Aufbereitung braucht keinen Browser.
  `tools/seite_bauen.py` veröffentlicht jetzt Markdown in `texte/`-Ordnern (sonst *.md weiterhin ausgeschlossen).
- Offen: Tabellen (LPVO-Anhang); restliche 23 ZH-Lex-Erlasse; GitHub Action für Abgleich + Aufbereitung; kommunale Erlasse.

### Sitzung 2026-11-20 (00:50–01:30) – EduKSX-Codex 0.8.0

- Entscheide 2026-11-20: Quellenklassen A–F; Dateidatum bei fehlendem Website-Datum zulässig (gekennzeichnet); alle Dokumente mit «Veröffentlicht» und «Version»; alte Versionen behalten, Anzahl zeigen, Klick = Historik; Analyse-Version je Gemeinde.
- Umgesetzt (#32 → `_3 Beta-Test`): Quellenkatalog, ZH-Lex-Fassungen (26 Erlasse / 466 Fassungen), Historik-Dialog, Seite «Versionen & Abgleich».
- Offen (Konzept `docs/KONZEPT-CODEX-VERSIONEN.md`): Dateidatum der Gemeinde-Dokumente beim ersten Abgleich holen (je Website eine Browser-Freigabe); Fedlex «Stand am»; Markdown-Fassung und farbige Deltas (Empfehlung: vorab aufbereiten, statisch ausliefern, keine KI zur Laufzeit); Normenhierarchie grafisch.

### Sitzung 2026-11-20 (01:10–01:40) – EduKSX-Codex 0.7.0

- Menüsektion «Gesetzestexte & Verordnungen»: Rechtsgrundlagen Schule (62) und Herkunftsliste (#31 → `_3 Beta-Test`).
- Ausgangsliste vom Projektverantwortlichen (20.11.2026) ist **nicht juristisch validiert**; geprüft wurden die Ordnungsnummern
  412.121.31, 172.71, 412.106, 412.106.1, 720.11, 720.1 (dazu 131.1/131.11). Nr. 44: Beitrittsgesetz IVöB = LS 720.1 ergänzt;
  Abkürzung Submissionsverordnung = SVO.
- Offen: übrige Fundstellen und Paragrafen prüfen; Verknüpfung Gesetz ↔ Vollzugsverordnung; kommunale Erlasse der Schulgemeinden anbinden.

### Sitzung 2026-11-20 (00:35–01:10) – EduKSX-Codex 0.6.0

- Startseite «Übersicht» nach dem Muster von Flow/Sign (Kennzahlen, Fortschritt je Bezirk, Handlungsbedarf, Dokumentarten); bisherige Übersicht → «Vergleich» (#19 → `_3 Beta-Test`).
- Achtung: `index.html` der Rechtssammlung wird von `tools/build.py` erzeugt – Änderungen dort (z. B. Zurück-Taste aus 0.5.5) im Generator nachführen.

### Sitzung 2026-11-17 (05:10–05:50) – EduKSX-Codex 0.5.0

- Auftrag «alle anderen Gemeinden aufnehmen» – auf Rückfrage eingegrenzt auf Dübendorf und Fehraltorf (Entscheid 2026-11-17).
- Erfasst: Stadt Dübendorf (89 Erlasse), Primarschule Dübendorf (10), Sek Dübendorf-Schwerzenbach (27), Fehraltorf (118) (#15 → `_3 Beta-Test`).
- Fehraltorf ist Einheitsgemeinde; Schule Fehraltorf hat keine eigene Rechtssammlung (nicht als Organisation erfasst).
- Offen: nächste Gemeinden nach Wunsch; Erfassung braucht je Website eine Browser-Freigabe.

### Sitzung 2026-11-17 (04:40–05:10) – EduKSX-Codex 0.4.0

- Leitfaden systematische Rechtssammlung geprüft (identisch mit zh.ch, Stand 14.10.2025) und unter
  `prototypen/rechtssammlung/quellen/` abgelegt; Ansicht «Grundlagen» mit GG/VGG-Links (ZH-Lex), Anforderungen,
  Anhang 1/2 und LS-Ordnern; Leitfaden-Prüfung je Organisation; Matrix-Gruppe «Gehört nicht in die SR» (#14 → `_3 Beta-Test`).
- Befund: Nur Meilen, Höri und Winkel nummerieren jedes Dokument mit Sachgebietsziffer; PS Trüllikon und SKM führen
  überwiegend Beschlüsse/Protokolle/Rechnungen in der SR (Leitfaden Ziff. 7: gehört nicht hinein).
- Offen: Prüfregeln fachlich abnehmen (Schwellen, Einordnung Konzept/Merkblatt); ZH-Lex-Deep-Links je Erlass nur über
  die Kurz-URL `zhlex.zh.ch/Erlass.html?Open&Ordnr=…` stabil.

### Sitzung 2026-11-17 (03:45–04:40) – EduKSX-Codex 0.3.0

- Erfasst: Meilen, Bachenbülach (+ Schule), Höri (+ Primarschulgemeinde), Winkel (+ Schule), Hochfelden (#8).
- Alle 60 Schulgemeinden nach Gemeindeverzeichnis (Stand 1.7.2026), Vermerk Einheitsgemeinde je Gemeinde im Menü (#9).
- Struktur-Matrix mit Erkennung ähnlicher Dokumente (#10); Ansichten Nachbau / iFrame-Variante / Original ⟷ Nachbau,
  Widget `embed/` (#11); PDF-Vorschau (#12). Alle → `_3 Beta-Test`.
- Befund 2026-11-17: Nur SKM erlaubt Einbettung; i-web sendet `X-Frame-Options: DENY`, Escola `frame-ancestors 'self'`,
  übrige `SAMEORIGIN` → Original im geteilten Fenster nur bei SKM, sonst Fenster nebeneinander; PDF-Vorschau ebenso.
- Offen: Mitgliedschaft Bachenbülach/Winkel in der Sek Bülach bestätigen; Mitglieder regionaler Schulgemeinden
  (Vermerk «?»); CMS-Namen vs. Regel «keine Fremd-/Herstellernamen» (Entscheid Projektverantwortliche:r).

### Sitzung 2026-11-17 (03:20–03:45) – Prototyp EduKSX-Codex

- Neuer Prototyp `prototypen/rechtssammlung` (EduKSX-Codex): Evaluation der Rechtssammlungen von PG Trüllikon,
  PS Trüllikon, SKM Marthalen und Sek Bülach, Gemeindeliste (160), 4 Demo-Seiten; Einstiegsseite mit Icon «codex» (vorläufig). Issue #6 → `_3 Beta-Test`.
- Entscheid 2026-11-17: Demo-Seiten übernehmen Schrift, Farben und Aufbau der Originale, aber keine Logos; Hinweis «keine offizielle Seite» und `noindex`, weil öffentlich auf GitHub Pages.
- Codex 0.2.0: Menü links Bezirk › Politische Gemeinden / Schulgemeinden (eigener Zweig, Entscheid 2026-11-17) › Rubriken (#7 → `_3 Beta-Test`).
- Offen: CMS-Namen (i-web, Escola, WordPress) stehen als Evaluationsdaten im Prototyp – mit Regel «keine Fremd-/Herstellernamen» abgleichen.

### Sitzung JJJJ-MM-TT (hh:mm–) – Thema

- …

## Entscheide

Beschlüsse mit Datum, damit sie nicht erneut diskutiert werden («Entscheid JJJJ-MM-TT: …»). Dauerhafte Regeln
gehören zusätzlich in AGENTS.md.
