# EduKSX-Codex – Anforderungskatalog, Pflichtenheft und Prüfpunkte

Stand: 2026-11-20 · Status: **ENTWURF** · Prototyp [`prototypen/rechtssammlung`](../../../prototypen/rechtssammlung)
(0.25.x) · Datenbank [`datenbank.sql`](datenbank.sql) · API [`openapi.json`](openapi.json)

Stufen wie in [`KONZEPT-VORLAGE.md`](../../KONZEPT-VORLAGE.md); ohne Vermerk gilt **EMPFOHLEN**.

## 1. Zweck und Abgrenzung

EduKSX-Codex ist die systematische Rechtssammlung für Schulgemeinden und Gemeinden: die **eigenen Erlasse** nach dem
Leitfaden des Gemeindeamts (Rubrik › Erlass › Fassung, höchstens 9 Sachgebiete), verknüpft mit dem **übergeordneten
Recht** (Bund, Kanton, Bildungsrat) in Fassungen mit Textfassung, dazu die **Rechtsgrundlagen für Schulen**,
**Normenhierarchien** je Thema, der **Pflichtkatalog** einer Schulgemeinde und die **Vergleichsmatrix**. Die
Evaluation der heutigen Rechtssammlungen (Menüpfade, Nachbau, Leitfaden-Prüfung) ist der Startpunkt.

**Nicht dazu gehören:** Rechtsberatung, amtliche Publikation (rechtsverbindlich bleiben die Originalquellen),
Geschäftsverwaltung/Beschlüsse, allgemeine Dokumentablage.

## 2. Anforderungskatalog

### 2.1 Fachliche Anforderungen

| ID | Anforderung | Priorität | Herkunft im Prototyp |
|---|---|---|---|
| CDX-F-01 | Verzeichnis der Bezirke, politischen Gemeinden (BFS-Nr., Einheitsgemeinde, Schulträger) und Schulgemeinden mit Mitgliedern; Erfassungsstand je Bezirk. | MUSS | Menü Bezirk › Gemeinden / Schulgemeinden |
| CDX-F-02 | Rechtssammlung je Organisation: Rubriken (verschachtelt, Nummer, Reihenfolge), Erlasse mit Art, Fundstelle, Abkürzung. | MUSS | Organisation › Struktur |
| CDX-F-03 | Fassungen je Erlass mit Bezeichnung, Nachtrag, Publikation, Inkraft/Aufhebung, Herkunft des Datums, Originaldatei (Prüfsumme) und Textfassung. | MUSS | Dokumente, Fassungen |
| CDX-F-04 | Gültige Fassung zu einem Stichtag; Vergleich zweier Fassungen mit Unterschieden. | MUSS | Gesetzestexte & Verordnungen |
| CDX-F-05 | Einteilung jedes Dokuments nach Art (Gemeindeerlass, Behördenerlass, Vertrag, nicht rechtsetzend, Raumplan, gehört nicht in die SR, unklar). | MUSS | Arten |
| CDX-F-06 | Bundes- und Kantonsrecht automatisch aus Fedlex und ZH-Lex übernehmen (Fassungen, Text, Verweise), als gemeinsamer Bestand für alle Mandanten. | MUSS | Bundesrecht aus Fedlex, ZH-Lex-Fassungen |
| CDX-F-07 | Volltextsuche über Titel und Texte, Filter nach Organisation, Ebene, Thema, Stichtag; Auflösen von Fundstellen («LS 412.100 § 12»). | MUSS | Suche |
| CDX-F-08 | Rechtsgrundlagen für Schulen: Erlass + Stelle + Relevanz je Sachbereich; Quellenkatalog mit Klassen, Priorität, Versionierung, Verbindlichkeit. | MUSS | Rechtsgrundlagen |
| CDX-F-09 | Normenhierarchien je Thema (Volksschule, Sonderpädagogik, Personal, Datenschutz & ICT, Finanzen …) mit Ebenen, Knoten, Kanten mit Beleg; Ansicht je Organisation mit kommunalen Erlassen. | SOLL | Normenhierarchie |
| CDX-F-10 | Maschinelle Verbindungsvorschläge aus Verweisen; Redaktion bestätigt oder lehnt ab; fehlende Erlasse werden gemeldet. | SOLL | Vorschläge |
| CDX-F-11 | Pflichtkatalog Schulgemeinde (Kategorien, P/B/O, Aufnahme, Quelle, Suchmuster) mit Prüfstatus. | MUSS | Pflichtkatalog |
| CDX-F-12 | Vergleichsmatrix Pflichtdokumente × Organisationen mit automatischer Zuordnung über Suchmuster und Handkorrektur. | SOLL | Matrix |
| CDX-F-13 | Leitfaden-Prüfung je Organisation (Gliederung, max. 9 Sachgebiete, Nummern, nur Erlasse/Verträge, Kennzeichnung nicht rechtsetzend, Systematik Anhang 1/2) als Anhaltspunkt mit Status ja/nein/unsicher/info. | SOLL | Grundlagen, Leitfaden |
| CDX-F-14 | Analysen versioniert je Organisation (Erfassung, Nachführung) mit Befunden und Kennzahlen. | SOLL | Evaluation |
| CDX-F-15 | Einbettbares Widget für die Website der Schulgemeinde (Sachgebiet › Unterordner › Dokument, Suche, PDF-Vorschau, Höhe per `postMessage`). | MUSS | `embed/` |
| CDX-F-16 | Redaktion der eigenen Sammlung: Rubriken pflegen, Erlass anlegen, neue Fassung hochladen (Text wird erzeugt), alte Fassung aufheben. | MUSS | – (Ausbau) |
| CDX-F-17 | Bereitstellung für andere Module: Gesetzestexte für die Hilfe (Staffing), Quellenlinks (Flow), Ereignis bei neuer Fassung. | SOLL | Staffing-Hilfe |
| CDX-F-18 | Darstellung der Rechtssammlung im Auftritt der Gemeinde (Schrift, Farben, ohne Logo), gekennzeichnet als «keine offizielle Seite», solange Codex nicht die amtliche Sammlung ist. | KANN | Demo-Seiten |
| CDX-F-19 | Redaktionelle Inhalte (Normenhierarchien, Elternwegweiser, Pflichtkatalog, Rechtsgrundlagen) liegen in der Datenbank und werden ohne Deploy gepflegt; Zuordnung siehe 3.7. | MUSS | heute im Generator `build.py` |
| CDX-F-20 | Pflege-API über fachliche Schlüssel: Hierarchie, Elternthema und Pflichtdokument per `PUT …/by-key/{key}` anlegen oder vollständig ersetzen, per `DELETE` löschen; `dry_run` prüft ohne zu speichern. | MUSS | `tools/inhalte.py pruefen` |
| CDX-F-21 | Import als Inhaltspaket (JSON), Excel-Arbeitsmappe oder CSV-Dateien nach Importvorlage; Probelauf mit Prüfbericht je Datensatz (neu, geändert, gelöscht, unverändert; Fehler, Warnungen), danach Übernahme. | MUSS | `tools/inhalte.py`, `data/inhalte/` |
| CDX-F-22 | Export im selben Format (JSON, Excel, CSV) als Ausgangspunkt für Änderungen («herunterladen – ändern – einlesen»). | MUSS | `tools/inhalte.py export` |
| CDX-F-23 | Freigabe: Importe und Änderungen über die API sind Entwürfe; öffentlich erst nach fachlicher Prüfung und Freigabe durch die zentrale Redaktion (`…/publication`), mit Ereignis `codex.content.published`. | MUSS | – |
| CDX-F-24 | Nachvollziehbarkeit: jeder Importlauf mit Herkunft (API, CSV, Excel, KI-Recherche), Recherchevermerk, Quellen, Prüfsumme der Datei und Protokoll je Datensatz; Datensätze verweisen auf den letzten Importlauf. | MUSS | – |
| CDX-F-25 | KI-gestützte Aktualisierung nach der Anweisung [`KI-RECHERCHE.md`](KI-RECHERCHE.md): Abgleich mit ZH-Lex/Fedlex, Lieferung als Inhaltspaket, nie direkte Veröffentlichung. | SOLL | Recherchen im Chat |
| CDX-F-26 | Dokumenttyp A/B/C je Pflichtdokument und je kommunalem Dokument: A Rechtserlass (gehört in die Rechtssammlung, § 7 Abs. 2 GG), B verbindliches Führungsdokument, C ergänzendes Dokument; A/B je nach Ausgestaltung. Vorschlag bis zur fachlichen Abnahme sichtbar als «zu prüfen». | SOLL | Pflichtkatalog, Struktur-Matrix, Dokumentlisten |
| CDX-F-27 | Je Organisation und Pflichtdokument «keine Relevanz» setzen, mit Grund (gibt es nicht, muss nicht geregelt werden, anderswo geregelt, anderer Grund) und Bemerkung; nicht relevante Einträge zählen nicht zur Vollständigkeit und erscheinen in der Struktur-Matrix als «keine Relevanz». Recht: Redaktion der Organisation. | MUSS | Pflichtkatalog «Für Organisation erfassen» (im Prototyp nur im Browser gespeichert) |
| CDX-F-28 | Rechtsänderungs-Monitoring: bei neuer Fassung die geänderten Stellen bestimmen (reine Umbrüche der Umwandlung ausgenommen), Verbindungen mit geänderter Belegstelle und Rechtsstellen im Elternwegweiser kennzeichnen und für die kommunalen Dokumente der betroffenen Knoten Prüfaufträge anlegen (zu prüfen bzw. zur Kenntnis); Status je Prüfauftrag (offen, keine Anpassung, Anpassung nötig, angepasst, nicht relevant); Mitteilung an die Organisation. | MUSS | Seite «Rechtsänderungen & Prüfliste» (Prüfstatus im Prototyp nur im Browser) |

### 2.2 Nicht fachliche Anforderungen

| ID | Anforderung | Priorität |
|---|---|---|
| CDX-NF-01 | Öffentliche Leseansicht ohne Anmeldung, cachebar (CDN), mit `noindex` bis zur Freigabe als amtliche Sammlung. | MUSS |
| CDX-NF-02 | Abrufe bei Fedlex (SPARQL) und ZH-Lex (PDF) zeitgesteuert, schonend (Rate-Limit), mit Prüfsumme; Änderungen nur bei neuer Fassung. | MUSS |
| CDX-NF-03 | Textaufbereitung reproduzierbar (gleiche PDF → gleicher Text), Abweichungen zum Original prüfbar. | MUSS |
| CDX-NF-04 | Suche < 500 ms über 10 000 Fassungen; Volltextindex Deutsch. | SOLL |
| CDX-NF-05 | Original-Dateien unverändert in der Dokumentenablage; Codex zeigt Hinweis, dass die Originalquelle massgeblich ist. | MUSS |
| CDX-NF-06 | Barrierefreie Darstellung von Gesetzestexten (Überschriften, Anker je Paragraf, Fussnoten). | MUSS |
| CDX-NF-07 | Import idempotent: dasselbe Paket zweimal eingelesen ergibt keine Änderung; Übernahme in einer Transaktion (alles oder nichts). | MUSS |
| CDX-NF-08 | Importgrösse bis 5 MB bzw. 10 000 Zeilen in unter 30 s geprüft; grössere Lieferungen als Warteschlangen-Job. | SOLL |

## 3. Pflichtenheft

### 3.1 Architektur

- Laravel-Modul (Repository EduKSX-Codex) mit **Leseteil** (öffentlich, stark gecacht), **Redaktion** (pro Mandant)
  und **Importdiensten** (Fedlex, ZH-Lex, Gemeinde-Websites) als Warteschlangen-Jobs.
- Die Python-Werkzeuge des Prototyps (`tools/build.py`, `tools/texte.py`, `tools/fedlex.py`, `recht_aufbereiten.py`)
  sind die fachliche Referenz für Import und Textaufbereitung; produktiv als eigener Dienst oder in PHP neu umgesetzt
  (OFFEN).
- Widget als statisches JavaScript mit der Lese-API (`/api/v1/embed/{publisher_key}`).

### 3.2 Datenmodell

[`datenbank.sql`](datenbank.sql), Schema `codex`. Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert (DB-Standard 1.3, siehe [README](../README.md#1-datenbank--konventionen-beschlossen)). Rechtsbestand, Verzeichnis, Hierarchien und
Pflichtkatalog sind **global** (ohne `organization_id`, nur Redaktion); eine Sammlung gehört über
`publishers.owner_platform_id` einer Gemeinde/Schulgemeinde. Kern: `publishers` › `sections` › `legal_acts` ›
`act_versions` (+ `act_version_differences`, `act_references`); `municipalities`, `school_communities`,
`legal_bases`, `legal_areas`, `topics`, `publication_sources`, `source_classes`; `norm_hierarchies`,
`hierarchy_nodes`, `hierarchy_edges`; `mandatory_document_categories`, `mandatory_documents`, `matrix_rows`,
`matrix_cells`; `parent_guide_topics` (+ `_provisions`, `_documents`); `collection_analyses`, `guideline_rules`,
`guideline_checks`. Ansichten `current_act_versions`, `district_progress`.

### 3.3 API

[`openapi.json`](openapi.json) (API-Standard 1.2), globale Daten unter `/api/v1/…`: Verzeichnis
(`/municipalities`, `/school-communities`, `/overview`), Sammlungen (`/publishers`, `…/section-tree`, `/sections`),
Erlasse und Fassungen (`/legal-acts`, `…/versions`, `/act-versions/{id}/text|file`, `…/differences`), Suche
(`/search`, `/citations/resolution`), Rechtsgrundlagen, Hierarchien mit Vorschlägen und Entscheid
(`/hierarchy-edges/{id}/decision`), Pflichtkatalog und Matrix, Evaluation (`…/analysis`), Widget (`/embed/…`).
Webhook `codex.act_version.created`.

Pflege (CDX-F-20 bis 23): `GET|PUT|DELETE /norm-hierarchies/by-key/{hierarchy_key}`, `PUT|DELETE
/parent-guide-topics/by-key/{topic_key}`, `PUT /mandatory-documents/by-key/{document_key}`, Freigabe
`POST …/{id}/publication`; Importe `POST /content-imports/bundle` (JSON) und `/content-imports/file` (Excel, ZIP mit
CSV), je mit `mode=dry_run|apply`, Übernahme eines Probelaufs `POST /content-imports/{id}/application`, Protokoll
`GET /content-imports/{id}`; Export `GET /content-exports?format=json|xlsx|csv`. Webhook `codex.content.published`.
Fundstellen («LS 412.100», «SR 101») werden auf `legal_acts` aufgelöst; Auszüge der Belegstellen liest der Server
aus der geltenden Fassung (nie aus der Lieferung).

### 3.4 Rollen und Berechtigungen

| Recht (Scopes) | Öffentlichkeit | Mitarbeitende | Redaktion Mandant | Redaktion EduKSX-Codex |
|---|---|---|---|---|
| Lesen – `codex:*.read` | ✓ (anonym) | ✓ | ✓ | ✓ |
| Redaktion – `codex:{publishers,sections,legal-acts,legal-bases}.write` | – | – | eigene Sammlung | ✓ |
| Zentrale Redaktion – `codex:{municipalities,school-communities,publication-sources,mandatory-documents,matrix,parent-guide-topics}.write`, `codex:norm-hierarchies.admin` | – | – | – | ✓ |
| Import einreichen (Probelauf, Entwurf) – `codex:content-imports.create`; auch technischer Client einer KI-Recherche | – | – | – | ✓ |
| Übernahme und Freigabe – `codex:content-imports.admin`, `codex:*.admin` | – | – | – | ✓ (nur Menschen) |
| Evaluation – `codex:collection-analyses.admin` | – | – | eigene Organisation | ✓ |

### 3.5 Schnittstellen

| Partner | Richtung | Inhalt |
|---|---|---|
| Fedlex (SPARQL, HTML) | ← | Bundesrecht: Fassungen, Text |
| ZH-Lex (PDF) | ← | Kantonsrecht: Fassungen (Nachträge), Text |
| Gemeinde-Websites | ← | Evaluation, solange die Sammlung nicht in Codex gepflegt wird |
| Gemeindeamt-Verzeichnis, BFS-API | ← | Gemeinden, Schulgemeinden, BFS-Nummern |
| EduKSX-Staffing | → | Gesetzestexte für die Hilfe (LPG, LPVO, VVO) |
| EduKSX-Flow | → | Quellen der Ablaufschritte (`codex_ref`), Ereignis `fassungNeu` |
| Dokumentenablage | ↔ | Originaldateien |

### 3.6 Datenübernahme

Aus `data/rechtssammlungen.json`, `rechtsgrundlagen.json`, `pflichtkatalog.json`, `raw/*-versionen.json`, `texte/`
und den Hierarchien in `tools/build.py` per Importskript. Logos der Gemeinden werden nicht übernommen.

Die redaktionellen Inhalte liegen bereits im Importformat vor: `python3 tools/inhalte.py export` (im Prototyp) erzeugt
`data/inhalte/codex-inhalte.json|.xlsx` und `csv/` (24 Hierarchien, 160 Knoten, 180 Verbindungen, 13 Elternthemen,
40 Pflichtdokumente, 79 Rechtsgrundlagen). Erstbefüllung = erster Import dieses Pakets. Ladetest gegen
`datenbank.sql` mit `tools/inhalte.py sql` erfolgreich (PostgreSQL 16).

### 3.7 Redaktionelle Inhalte – Zuordnung Anzeige → Tabelle

| Anzeige im Prototyp | Heute | Tabelle(n) | Schlüssel | Import-Blatt |
|---|---|---|---|---|
| Normenhierarchie: Thema, Gruppe, Kurztitel, Ebenen, Reihenfolge | `HIERARCHIEN`, `GRUPPEN`, `KURZTITEL`, `REIHENFOLGE` | `norm_hierarchies` | `hierarchy_key` | hierarchien |
| Kasten (Erlass bzw. kommunaler Platzhalter) mit Hinweis, Link, Suchmuster | `knoten` | `hierarchy_nodes` (Erlass über `citation` → `legal_act_id`) | `hierarchy_key` + `node_key` | knoten |
| Liste «Beschlüsse und Erlasse» im Kasten | `knoten.liste` | `hierarchy_node_links` | Position | beschluesse |
| Verbindung mit Beziehung und Linienart | `kanten` | `hierarchy_edges` | Von + Nach | verbindungen |
| Belegstelle(n) mit Auszug | `beleg`, `beleg_oben`, `beleg_unten` | `hierarchy_edge_evidences` (Auszug vom Server) | Position | belege |
| Maschinelle Vorschläge, Abgleich | `maschinell()` | `hierarchy_edges.status = suggested`, `machine_relation`, `reference_count` | – | – (berechnet) |
| Elternwegweiser: Thema, Fragen, Suchmuster | `ELTERNFRAGEN` | `parent_guide_topics` | `topic_key` | elternthemen |
| Rechtsstellen im Elternwegweiser | `ELTERNFRAGEN.stellen` | `parent_guide_provisions` | Position | elternstellen |
| Verknüpfte Normenhierarchien | `ELTERNFRAGEN.themen` | `parent_guide_topic_hierarchies` | – | elternthemen.hierarchy_keys |
| Pflichtkatalog mit Kategorien und Suchmustern | `pflichtkatalog.json` | `mandatory_document_categories`, `mandatory_documents` | `document_key` | pflichtdokumente |
| Rechtsgrundlagen Volksschule | `rechtsgrundlagen.json` + `RG_ALIAS` | `legal_bases` (+ `legal_areas`) | `number` | rechtsgrundlagen |
| Publikationsquellen, Quellenklassen | `QUELLENKLASSEN`, `quellenkatalog()` | `publication_sources`, `source_classes` | – | – (Ausbau) |
| Erlasse und Fassungen | `texte/`, ZH-Lex, Fedlex | `legal_acts`, `act_versions` | `act_key` | – (eigene Importdienste) |

Jede gepflegte Tabelle trägt die Redaktionsspalten `content_status` (Entwurf, veröffentlicht, archiviert),
`review_status`, `research_note`, `researched_at`, `content_import_id`, `reviewed_*`, `published_at`; Importläufe in
`content_imports` und `content_import_items`.

## 4. Prüfpunkte für die produktive Umsetzung

Zusätzlich zu den gemeinsamen Prüfpunkten in [`../README.md`](../README.md#4-gemeinsame-prüfpunkte-alle-module).

| Nr. | Prüfpunkt | Bereich | erledigt |
|---|---|---|---|
| CDX-P-01 | Nutzungsbedingungen von Fedlex und ZH-Lex für automatischen Abruf und Wiedergabe geprüft; Quellenangabe in jeder Ansicht. | Recht | ☐ |
| CDX-P-02 | Urheber- und Publikationsrechte für Erlasse der Gemeinden geklärt (Einverständnis der Gemeinde für Übernahme/Einbettung). | Recht | ☐ |
| CDX-P-03 | Hinweis «massgeblich ist die amtliche Publikation» überall sichtbar; Codex nicht als amtliche Sammlung bezeichnet, solange nicht beschlossen. | Recht | ☐ |
| CDX-P-04 | Textaufbereitung stichprobenweise gegen Original geprüft (je Erlass mind. 3 Paragrafen, Fussnoten, Tabellen). | Fachlich | ☐ |
| CDX-P-05 | Pflichtkatalog (Status «ZU PRÜFEN») fachlich abgenommen (Gemeindeamt bzw. Fachstelle). | Fachlich | ☐ |
| CDX-P-06 | Normenhierarchien: alle Kanten mit Beleg; maschinelle Vorschläge nur nach Bestätigung sichtbar. | Fachlich | ☐ |
| CDX-P-07 | Stichtagsabfrage gegen bekannte Fassungswechsel getestet (Inkraft/Aufhebung, rückwirkende Änderungen). | Tests | ☐ |
| CDX-P-08 | Widget auf einer Pilot-Website eingebunden (CSP, `frame-ancestors`, Barrierefreiheit, Höhe). | Abnahme | ☐ |
| CDX-P-09 | Import-Jobs überwacht (Fehler, Laufzeit, Änderungen) und ohne Last für die Quellen (Rate-Limit). | Betrieb | ☐ |
| CDX-P-10 | Keine Personendaten in Erlassen veröffentlicht, die nicht amtlich publiziert sind (z. B. Unterschriften, Kontaktdaten). | Datenschutz | ☐ |

## 5. Offene Punkte

1. OFFEN: Soll Codex die amtliche Sammlung einer Gemeinde werden (Publikationsorgan) oder nur Spiegel/Hilfsmittel?
2. OFFEN: Import und Textaufbereitung in Python als eigener Dienst oder in PHP?
3. ZU PRÜFEN: Zugehörigkeit Bachenbülach/Winkel zur Sek Bülach; weitere «EG ?»-Vermerke.
4. ZU PRÜFEN: Ergänzende Quellen (Bildungsrat, Volksschulamt-Merkblätter) als Erlasse oder als Quellen-Klasse B?
5. OFFEN: Darf ein technischer Client (KI-Recherche) Probeläufe nur einreichen (EMPFOHLEN) oder auch übernehmen? Freigabe bleibt in jedem Fall beim Menschen.
6. OFFEN: Wird eine Hierarchie beim Ersetzen versioniert (Historie der Fassungen der Hierarchie) oder genügt das Änderungsprotokoll `data_changes` (EMPFOHLEN für den Start)?
7. ZU PRÜFEN: Rhythmus der KI-Recherche (EMPFOHLEN monatlich und nach Kantonsrats-Publikationen) und wer den Prüfbericht abnimmt.
8. ZU PRÜFEN: Einstufung Dokumenttyp A/B/C (Vorschlag Codex 0.32.0: Pflichtkatalog 18 × A, 13 × A/B, 9 × B; kommunale Dokumente aus Dokumentart und Titel) – fachliche Abnahme und abnehmende Stelle offen.
9. OFFEN: Monitoring – nur Belegstellen (EMPFOHLEN, wenig Fehlalarme) oder alle Stellen eines Erlasses als Prüfauftrag? Wer erhält die Mitteilung (Schulverwaltung, Schulpflege)? Rhythmus (bei jeder neuen Fassung, EMPFOHLEN)?
