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
- Issue konnte nicht angelegt werden (GitHub-CLI ohne Anmeldung) – nachholen, Status `_3 Beta-Test`.
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
