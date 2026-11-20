# EduKSX-Codex – Anforderungskatalog, Pflichtenheft und Prüfpunkte

Stand: 2026-11-20 · Status: **ENTWURF** · Prototyp [`prototypen/rechtssammlung`](../../../prototypen/rechtssammlung)
(0.20.x) · Datenbank [`datenbank.sql`](datenbank.sql) · API [`openapi.yaml`](openapi.yaml)

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

### 2.2 Nicht fachliche Anforderungen

| ID | Anforderung | Priorität |
|---|---|---|
| CDX-NF-01 | Öffentliche Leseansicht ohne Anmeldung, cachebar (CDN), mit `noindex` bis zur Freigabe als amtliche Sammlung. | MUSS |
| CDX-NF-02 | Abrufe bei Fedlex (SPARQL) und ZH-Lex (PDF) zeitgesteuert, schonend (Rate-Limit), mit Prüfsumme; Änderungen nur bei neuer Fassung. | MUSS |
| CDX-NF-03 | Textaufbereitung reproduzierbar (gleiche PDF → gleicher Text), Abweichungen zum Original prüfbar. | MUSS |
| CDX-NF-04 | Suche < 500 ms über 10 000 Fassungen; Volltextindex Deutsch. | SOLL |
| CDX-NF-05 | Original-Dateien unverändert in der Dokumentenablage; Codex zeigt Hinweis, dass die Originalquelle massgeblich ist. | MUSS |
| CDX-NF-06 | Barrierefreie Darstellung von Gesetzestexten (Überschriften, Anker je Paragraf, Fussnoten). | MUSS |

## 3. Pflichtenheft

### 3.1 Architektur

- Laravel-Modul (Repository EduKSX-Codex) mit **Leseteil** (öffentlich, stark gecacht), **Redaktion** (pro Mandant)
  und **Importdiensten** (Fedlex, ZH-Lex, Gemeinde-Websites) als Warteschlangen-Jobs.
- Die Python-Werkzeuge des Prototyps (`tools/build.py`, `tools/texte.py`, `tools/fedlex.py`, `recht_aufbereiten.py`)
  sind die fachliche Referenz für Import und Textaufbereitung; produktiv als eigener Dienst oder in PHP neu umgesetzt
  (OFFEN).
- Widget als statisches JavaScript mit der Lese-API (`/v1/einbettung/{org}`).

### 3.2 Datenmodell

[`datenbank.sql`](datenbank.sql), Schema `codex`. `mandant_id NULL` = gemeinsamer Bestand (Bund, Kanton,
Verzeichnis, Hierarchien, Pflichtkatalog), sonst Eigentum der Gemeinde/Schulgemeinde. Kern: `organisation` ›
`rubrik` › `erlass` › `fassung` (+ `fassung_unterschied`, `verweis`); `rechtsgrundlage`, `sachbereich`, `thema`,
`quelle`, `quellenklasse`; `hierarchie`, `hierarchie_knoten`, `hierarchie_kante`; `pflichtkategorie`,
`pflichtdokument`, `matrix_zeile`, `matrix_zelle`; `analyse`, `leitfaden_regel`, `leitfaden_pruefung`. Ansichten
`v_fassung_aktuell`, `v_fortschritt_bezirk`.

### 3.3 API

[`openapi.yaml`](openapi.yaml): Verzeichnis (`/v1/gemeinden`, `/v1/schulgemeinden`, `/v1/bezirke`, `/v1/uebersicht`),
Sammlungen (`/v1/organisationen`, `…/rubriken`), Erlasse und Fassungen (`/v1/erlasse`, `…/fassungen`,
`/v1/fassungen/{id}/text|datei`, `…/unterschiede`), Suche (`/v1/suche`, `/v1/aufloesen`), Rechtsgrundlagen,
Hierarchien mit Vorschlägen und Bestätigung, Pflichtkatalog und Matrix, Evaluation, Widget. Webhook `fassungNeu`.

### 3.4 Rollen und Berechtigungen

| Scope | Öffentlichkeit | Mitarbeitende | Redaktion Mandant | Redaktion EduKSX-Codex |
|---|---|---|---|---|
| `codex:lesen` | ✓ (anonym) | ✓ | ✓ | ✓ |
| `codex:redaktion` | – | – | eigene Sammlung | ✓ |
| `codex:zentral` | – | – | – | ✓ |
| `codex:evaluation` | – | – | eigene Organisation | ✓ |

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
