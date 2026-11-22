# Konzept: EduKSX-Codex – Versionen, Abgleich, Textfassung und Normenhierarchie (#32)

Stand: 2026-11-20 (Codex 0.32.0) · Status: **IN ARBEIT**

Ein Konzept ist eine Entscheidungsgrundlage, keine Freigabe: umgesetzt wird erst, was als Issue freigegeben ist.

| Stufe | Bedeutung |
|---|---|
| **BESCHLOSSEN** | Vorgabe von Projektverantwortliche:r (mit Datum) |
| **EMPFOHLEN** | Vorschlag, noch nicht bestätigt |
| **OFFEN** | muss vor der Umsetzung entschieden werden |
| **ZU PRÜFEN** | technische Machbarkeit, Lizenz oder Kosten klären |

## 1. Ziel

Aufträge aus dem Chat vom 20.11.2026:

- Quellen nach Klassen A–F führen; herausgebende Behörde, massgebende Publikationsstelle und Downloadort getrennt
  (**BESCHLOSSEN** 2026-11-20).
- Bei allen Dokumenten eigene Spalten «Veröffentlicht» und – wenn vorhanden – «Version» (**BESCHLOSSEN** 2026-11-20).
- Fehlt auf der Website ein Datum, darf das Dateidatum verwendet werden, sichtbar gekennzeichnet «aus Datei»
  (**BESCHLOSSEN** 2026-11-20).
- Neue Versionen suchen und übernehmen; alte Versionen behalten; Anzahl Versionen anzeigen; ein Klick zeigt die
  Historik (**BESCHLOSSEN** 2026-11-20).
- Je Gemeinde eine Analyse-Version und das Datum der letzten Analyse/Katalogisierung (**BESCHLOSSEN** 2026-11-20).
- Rechtstexte (meist PDF) in eine KI-lesbare Markdown-Fassung bringen; Unterschiede zwischen Versionen farbig
  hervorheben (Wunsch 2026-11-20, **OFFEN**).
- Hierarchie grafisch darstellen, z. B. OR → Personalgesetz → Personalverordnung → Personalverordnung der Gemeinde
  (Frage 2026-11-20, **OFFEN**).

**Nichtziele:** keine rechtliche Beurteilung von Änderungen; keine automatische Übernahme ohne Bestätigung.

## 2. Versionen und Abgleich

### 2.1 Kennung je Dokument (**EMPFOHLEN**)

| Quelle | Feste Kennung | Version | Veröffentlicht |
|---|---|---|---|
| ZH-Lex LS | Ordnungsnummer (z. B. 412.100) | Nachtragsnummer (z. B. 126) | Publikationsdatum der Fassung |
| Fedlex SR | SR-Nummer bzw. ELI | «Stand am» | Datum der Fassung |
| Bildungsratsbeschluss | BRB-Nummer/Jahr | – | Sitzungsdatum |
| Kommunale Rechtssammlung | Organisation + Erlassnummer, sonst normalisierter Titel | Version im Titel («V5.0», «Stand 2025», «rev. 2024») oder Prüfsumme der Datei | Datum laut Website, sonst Dateidatum («aus Datei») |

«Gültig seit» (Inkraftsetzung) bleibt eine eigene Angabe und wird nicht als Veröffentlichung gezählt.

### 2.2 Ablauf (**EMPFOHLEN**)

1. **Suchen** – je Quelle ein Leser (Adapter):
   - ZH-Lex: Suche nach Ordnungsnummer (`lawcollectionsearch … zhweb-zhlex-ls … .json?referenceNumber=`), dann die
     Erlassseite mit «Historie Nachtragsnr.» und je Fassung Publikations-, Inkraftsetzungs- und Aufhebungsdatum.
     **Umgesetzt** für 26 Erlasse / 466 Fassungen (abgerufen 20.11.2026).
   - Fedlex: «Stand am» je Fassung (**ZU PRÜFEN**: Zugriff über SPARQL-Schnittstelle oder Seite).
   - Gemeinde-Websites: bekannte Struktur erneut lesen (Menüpfad, Ordner, Tabellen); Dateidatum über die
     Server-Angabe (Last-Modified) bzw. PDF-Eigenschaften; Prüfsumme (SHA-256) der Datei.
2. **Vergleichen** – gleiche Kennung, aber geänderte Version, Datum oder Prüfsumme = neue Version; Kennung neu = neues
   Dokument; Kennung fehlt = «nicht mehr publiziert».
3. **Prüfliste** – Treffer als «neu», «geändert», «nicht mehr publiziert»; nichts wird ohne Bestätigung übernommen.
4. **Übernehmen** – neue Version wird angehängt, die bisherige als «abgelöst» markiert, **nie gelöscht**. Bei Gemeinden
   zählt die Analyse-Version eins hoch (mit Datum, Anzahl Rubriken und Dokumente).
5. **Rhythmus** – geplanter Lauf (Vorschlag: ZH-Lex wöchentlich, Gemeinden monatlich) und auf Knopfdruck; Ergebnis als
   Mitteilung an die verantwortliche Person (**OFFEN**: wer bestätigt?).

### 2.3 Datenmodell (**EMPFOHLEN**)

```text
dokument { vid, organisation|fundstelle, titel, klasse, herausgeber, publikationsstelle, downloadort,
           versionen: [ { version, veroeffentlicht, datum_herkunft (Website|Datei|ZH-Lex|Fedlex), gueltig_seit,
                          in_kraft_bis, url, sha256, erfasst, quelle, status (aktuell|abgelöst|nicht mehr publiziert) } ] }
organisation { analysen: [ { version, datum, art (Erstanalyse|Abgleich), rubriken, dokumente, bemerkung } ] }
```

Ablage im Prototyp: `data/raw/zhlex-versionen.json` (ZH-Lex), Analysen in `tools/build.py` (`ANALYSEN`). Später in
EduKSX-Core (Dokumentenablage) – append-only.

### 2.4 Anzeige (**umgesetzt** in 0.8.0)

- Spalten «Veröffentlicht» und «Version» in den Rechtsgrundlagen und in jeder Rubrik der Gemeinden; «Gültig seit»
  getrennt; Widget zeigt dieselben Angaben.
- Knopf «⟲ n» = Anzahl Versionen; Klick öffnet die Historik (neueste zuerst, Status, Daten, Link je Fassung) mit
  herausgebender Behörde, Publikationsstelle und Downloadort.
- Steckbrief der Gemeinde: «Analyse Version n · zuletzt analysiert und katalogisiert am …» mit Historik der Analysen.
- Seite «Versionen & Abgleich» mit Stand je Quelle und Organisation.

## 3. Textfassung (Markdown) und Unterschiede zwischen Versionen

### 3.1 Braucht es ein KI-Modell zur Laufzeit? (**EMPFOHLEN**: nein)

- **PDF → Markdown** ist Textextraktion, keine KI-Aufgabe. Erlass-PDFs von ZH-Lex und Fedlex haben eine Textebene;
  Werkzeuge wie pdfplumber/pdfminer (Text und Layout) bzw. Docling oder Marker (Überschriften, Tabellen, Fussnoten)
  liefern Markdown. Eine Nachbearbeitung mit Regeln erkennt Gliederung (Titel, Abschnitte, §, Abs., lit.), Randtitel
  und Fussnoten.
- **KI nur, wo nötig:** gescannte PDFs ohne Textebene (OCR) und schwierige Gliederungen. Das läuft **einmal bei der
  Aufbereitung**, nicht beim Anzeigen.
- **Unterschiede (Delta)** sind ein Textvergleich, keine KI: Vergleich je Paragraf, innerhalb des Paragrafen
  wortgenau (z. B. diff-match-patch oder jsdiff). Hinzugefügtes grün, Gestrichenes rot durchgestrichen, verschobene
  Paragrafen markiert – Zustand nie nur über Farbe (zusätzlich «+»/«–» und Text für Screenreader).

### 3.2 Wo wird gerechnet? (**EMPFOHLEN**: vorab aufbereiten, statisch ausliefern)

| Variante | Vorteile | Nachteile |
|---|---|---|
| **A – vorab im Abgleich** (lokal bzw. GitHub Action): PDF → Markdown je Version, Delta je Versionspaar, Ergebnis als Dateien (`texte/<LS>/<Nachtrag>.md`, `deltas/<LS>/<alt>-<neu>.json`) auf GitHub Pages | kein Server, keine Laufzeitkosten, schnell, prüfbar (Markdown ist versioniert), KI-lesbar | Aufbereitung muss laufen, bevor Neues sichtbar ist |
| B – im Browser zur Laufzeit (PDF.js + Diff in JavaScript) | keine Aufbereitung | langsam bei grossen Erlassen, Gliederung unzuverlässig, Fremd-PDFs oft nicht ladbar (Einbettungs- und CORS-Sperren) |
| C – eigene API mit Dienst | flexibel, später für EduKSX-Core | Betrieb, Datenschutz, Kosten – erst nötig, wenn die Ablage serverseitig läuft |

Empfehlung: **A** im Prototyp; die erzeugten Dateien sind dieselben, die später eine API (EduKSX-Core) ausliefert.
Für die vergleichende Anzeige reicht der Abschnitt `deltas/…json`; der Browser färbt nur ein.

### 3.3 Offene Entscheide

| Nr. | Frage | Optionen | Entscheid | Status |
|---|---|---|---|---|
| E1 | Aufbereitung | A vorab / B Browser / C API | A – vorab aufbereiten, als Dateien veröffentlichen | **BESCHLOSSEN** 2026-11-20 |
| E2 | Werkzeug PDF → Markdown | pdfplumber + Regeln / Docling / Marker | Test an VSG, VSV, LPVO: pdfplumber + Regeln (siehe 3.4) | **BESCHLOSSEN** 2026-11-20 (Test) |
| E3 | Umfang | zuerst Testerlasse, dann alle 26 ZH-Lex-Erlasse, dann kommunale Erlasse | Test mit 3 Erlassen, alle Fassungen | **BESCHLOSSEN** 2026-11-20 |

### 3.4 Ergebnis Test (20.11.2026)

- `tools/texte.py` (pdfplumber, MIT) wandelt die ZH-Lex-PDF je Fassung in Markdown um: Titel, Teile/Abschnitte (`##`),
  Paragrafen mit Randtitel (`### § 31. Beurteilung`), Absatznummern (¹ ² ³), Aufzählungen (`- a.`), Fussnoten
  (`[^64]`). Kopf mit Fundstelle, Nachtrag, Publikationsdatum, Quelle und SHA-256 der PDF.
- Aufbereitet: VSG 24, VSV 12, LPVO 44 Fassungen (alle des geltenden Erlasses) mit Unterschieden je Fassungspaar;
  dazu die geltende Fassung von PG, PVO, VVO, LPG und GG für die Normenhierarchie. Dauer ca. 6 Minuten, 4 MB.
- Unterschiede: Absatzvergleich (difflib), darin wortgenau; Fussnotenverweise zählen nicht als Änderung.
  Beispiel VSG Nachtrag 126: § 31 Abs. 1 um die Notenregel ergänzt – korrekt erkannt.
- **Grenzen:** Tabellen (Lohnskalen im Anhang der LPVO) werden nicht als Tabelle erkannt; vereinzelte Satzartefakte der
  PDF («Kinderder gartenstufe», «enthal - ten») erzeugen kleine Schein-Änderungen. Docling (Tabellen) bleibt Option,
  braucht aber ein grosses Modell-Paket; Marker steht unter GPL – für den Prototyp beide nicht verwendet.
- Nächster Schritt: Tabellen mit `pdfplumber.extract_tables` ergänzen; Lauf als GitHub Action nach dem ZH-Lex-Abgleich.

## 4. Normenhierarchie grafisch (**EMPFOHLEN**)

Beispiel Personalrecht: Bundesrecht (OR, SR 220 – subsidiär für öffentlich-rechtliche Anstellungen) → kantonales
Personalgesetz (PG, LS 177.10) → Personalverordnung (PVO, LS 177.11) und Vollzugsverordnung (VVO, LS 177.111) →
§ 53 GG (Verweis aufs kantonale Recht) → kommunale Personalverordnung der Schulgemeinde (Ausführungsbestimmungen,
Reglemente).

- **Daten:** je Erlass «stützt sich auf» (Rechtsgrundlage im Ingress, z. B. «gestützt auf § 31 Abs. 3 VSG») und
  «verweist auf» (Verweise im Text). Aus der Markdown-Fassung (Kapitel 3) lassen sich Ingress und Verweise
  regelbasiert auslesen; kommunale Erlasse über ihre Titel und Ingresse zuordnen.
- **Anzeige:** Baum bzw. Ebenen-Diagramm Bund → Kanton (Gesetz → Verordnung → Reglement/BRB) → Gemeinde, Knoten
  anklickbar (Erlass, Versionen, Unterschiede). Zuerst für die Themen Personal, Volksschule, Datenschutz.
- **Status:** **BESCHLOSSEN** 2026-11-20 – Pilot Personalrecht umgesetzt (Codex 0.9.0): OR → PG / LPG / GG → PVO / VVO /
  LPVO → Personalverordnung der Gemeinde (17 Beispiele aus den erfassten Rechtssammlungen). Verbindungen von Hand,
  Belegstellen (PG § 18, PVO § 1, LPG § 2, GG § 53) automatisch aus den Textfassungen; Verweise aus den Fussnoten gezählt.
  Erweitert (Codex 0.10.0, #34): Thema **Finanzen** – GG / FAG / CRG → VGG / FAV → Gemeindeordnung (Finanzbefugnisse),
  Finanzreglement, Gebührenverordnung; Belegstellen GG § 84 und § 104, VGG § 8 und § 47, FAG § 1, FAV § 1. CRG nur als
  Bezug (Haushaltsrecht des Kantons). Themen werden in `HIERARCHIEN` (tools/build.py) beschrieben und über Reiter gewählt.
  Erweitert (Codex 0.11.0, #35): **Volksschule** mit eigener Ebene «Bildungsrat» (Lehrplan, Lektionentafel,
  Zeugnisreglement) und **Datenschutz & ICT** mit der Linienart «nicht direkt anwendbar» (IDG → DSG: für Schulen gilt das
  kantonale Recht, das DSG nur bei privaten Dienstleistern).
  Erweitert (Codex 0.12.0, #36): **Sonderpädagogik**, **Beschaffung & Bau** (Ebene «Interkantonal (Konkordat)» für die
  IVöB) und **Kindesschutz & Schweigepflicht** (Ebene «Völkerrecht» für die KRK) – insgesamt 7 Themen.

## 4a. Normenhierarchie – Stand und nächste Schritte (Vorschlag 20.11.2026)

Stand Codex 0.30.0: 29 Themen in neun Gruppen (Schule, Kinder, Eltern, Personal, Unterricht, Behörden & Organisation, Finanzen & Beschaffung, Information & ICT, Infrastruktur & Sicherheit; «Ressourcen» aufgeteilt, #58). Davor: Stand Codex 0.23.0: 24 Themen in sieben Gruppen (Schule, Kinder, Eltern, Personal, Unterricht, Behörden & Organisation, Ressourcen) und Elternwegweiser mit 13 Fragen; früher 9 Themen (Personalrecht, Finanzen, Volksschule, Datenschutz & ICT, Sonderpädagogik, Beschaffung & Bau,
Kindesschutz & Schweigepflicht, Verfahren & Rechtsschutz, Unterricht & Medien), Textfassungen für 29 kantonale und 9 Bundeserlasse,
maschineller Abgleich der Verbindungen (Ingress, § 1, Fussnoten), Ansicht je Organisation, Querbezüge, Pflichtkatalog Schulgemeinde.

| Nr. | Punkt | Vorschlag | Status |
|---|---|---|---|
| 1 | Fachliche Prüfung | Alle 9 Themen und die Einstufungen des Pflichtkatalogs von einer Fachperson (Volksschulamt, Gemeindeamt oder Rechtsdienst) prüfen lassen; Rückmeldungen je Verbindung als «geprüft am / von» im Datenmodell festhalten | **ZU PRÜFEN** (extern) |
| 2 | Vorschläge übernehmen | Maschinelle Vorschläge nicht automatisch übernehmen; je Vorschlag Entscheid «übernehmen / verwerfen» in `HIERARCHIEN` festhalten, damit er nicht erneut erscheint | **OFFEN** |
| 3 | Verbindungen automatisch | Langfristig Verbindungen aus Ingress und § 1 automatisch erzeugen und nur noch Ausnahmen von Hand pflegen (die Auswertung bestätigt heute 26 von 37 Hand-Verbindungen zwischen Erlassen mit Text, rund 70 %) | **OFFEN** |
| 4 | Abgleich automatisieren | GitHub Action (wöchentlich): `tools/zhlex_versionen.py`, `tools/fedlex.py`, `tools/texte.py --nur-neu`, Build; neue Fassungen als Pull Request | **OFFEN** |
| 5 | Kommunale Beispiele | Titelstichwörter durch Zuordnung beim Erfassen ersetzen (Dokument → Katalogeintrag, von Hand bestätigt); weitere Organisationen erfassen | **OFFEN** |
| 6 | Pflichtkatalog | Einstufungen P/B/O prüfen (Punkt 1); Pflichtkatalog je Organisation als Prüfliste «fehlt / vorhanden / nicht anwendbar» mit Begründung | **ZU PRÜFEN** |
| 7 | Textqualität | Kantonsverfassung (Artikel ohne Überschriftzeile) und Tabellen (LPVO-Anhang) in `tools/texte.py` verbessern | **OFFEN** |

## 5. Issues

| Issue | Inhalt | Status |
|---|---|---|
| #32 | Codex 0.8.0: Quellenkatalog A–F, Veröffentlicht/Version, Versionshistorik, Analyse-Version | `_3 Beta-Test` |
| #33 | Textfassung Markdown, Änderungen farbig, Normenhierarchie Personalrecht (Kapitel 3 und 4) | `_3 Beta-Test` |
| #36 | Normenhierarchien Sonderpädagogik, Beschaffung & Bau, Kindesschutz | `_3 Beta-Test` |
| #35 | Normenhierarchien Volksschule und Datenschutz & ICT | `_3 Beta-Test` |
| #34 | Finanzrecht (FAG, FAV, CRG), Fassungen GG/VGG, Normenhierarchie Finanzen | `_3 Beta-Test` |
| #37 | Normenhierarchie: Darstellung, Ansicht je Organisation, Querbezüge | `_3 Beta-Test` |
| #38 | Bundesrecht aus Fedlex als Textfassung, Belegstellen Bund | `_3 Beta-Test` |
| #39 | Normenhierarchie: maschinelle Verbindungsvorschläge und Abgleich | `_3 Beta-Test` |
| #40 | Pflichtkatalog Schulgemeinde, Vollständigkeit in der Struktur-Matrix | `_3 Beta-Test` |
| #41 | Normenhierarchie: Beispiele geschärft, Themen Verfahren und Unterricht, nächste Schritte | `_3 Beta-Test` |
| #42 | Normenhierarchie: Personalrecht überarbeitet, Reihenfolge nach Volksschulbezug | `_3 Beta-Test` |
| #43 | Normenhierarchien Eltern und Gesundheit | `_3 Beta-Test` |
| #44 | Normenhierarchie: fünf Themen aus dem Volksschulgesetz, Erweiterungen | `_3 Beta-Test` |
| #45 | Elternwegweiser, Gruppen Kinder und Eltern, Themen Absenzen und Kosten | `_3 Beta-Test` |
| #46 | Normenhierarchie: Gruppe Behörden & Organisation, GPR/VPR | `_3 Beta-Test` |
| #52 | Normenhierarchie: Themenwahl als Übersicht nach Gruppen | `_3 Beta-Test` |
| #53 | Redaktionelle Inhalte: Datenmodell, Pflege-API, Import CSV/Excel, KI-Recherche | `_3 Beta-Test` |
| #54 | Menü neu gegliedert, Ebenen von Bund bis Gemeinde | `_3 Beta-Test` |
| #55 | Normenhierarchie: Schulbetrieb, Disziplin, Privatschulen | `_3 Beta-Test` |
| #56 | Normenhierarchie: Sport & Lager, Haftung & Versicherung; neue Erlasse | `_3 Beta-Test` |
| #57 | Normenhierarchie: Berufswahl, ergänzende Angebote, Feiertage, Gesundheitsschutz/Gleichstellung | `_3 Beta-Test` |
| #58 | Normenhierarchie: Gruppe Ressourcen aufgeteilt | `_3 Beta-Test` |
| #59 | Normenhierarchie: Schulsozialarbeit, Schulanlagen | `_3 Beta-Test` |
| #60 | Dokumenttyp A/B/C (Vorschlag, zu prüfen) | `_3 Beta-Test` |
