# Changelog – EduKSX-Prototyp

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/), Versionen nach
[Semantic Versioning](https://semver.org/lang/de/) (MAJOR.MINOR.PATCH). Neue Einträge kommen laufend unter
**Unveröffentlicht**; `python3 .github/blueprint/release.py set X.Y.Z --commit` macht daraus eine Version.

## [Unveröffentlicht]

### Geändert

- **Meilenstein je Prototyp (22.11.2026, #75):** Meilensteine für Staffing, Flow, Codex, Time, Sign und «Alle
  Prototypen»; Labels `prototyp:<schlüssel>` an allen offenen Issues. Neue Issues ordnet `issue-milestone` über
  `[meilensteine] zuordnung` nach Prototyp-Label zu, ohne Label nach Art in die Sammlungen.
- **Blueprint-Regeln nachgeführt (22.11.2026):** Laufzeitdateien auf Blueprint 0.1.0 (70e4ce0), neuer Workflow
  `konformitaet.yml`, `docs/PROJEKTSTAND-ARCHIV.md`; Sammlungen, Release-Meilenstein «0.1.0 – Grundgerüst», Label
  `_1 bereit` und weitere Blueprint-Labels, Admin-Issue #76. In `blueprint.toml` ergänzt: Topics, Website «auto»,
  `[betrieb] umgebungen = []` (bewusst keine Umgebungen, nur GitHub Pages), `[konformitaet]`. Projekteigenheiten
  (Prototypen-Regeln, eigenes `seite.yml`) bleiben; Standard-Labels werden vorerst nicht entfernt.

- **Branch nach Merge automatisch löschen (22.11.2026):** neue Action `branch-aufraeumen.yml` löscht nach einem Merge in
  main den Branch des PR. main, gh-pages, Fork-Branches, geschützte Branches und Branches mit neuen Commits bleiben.
- **Icons nur noch aus EduKSX-UI (22.11.2026):** keine eigenen Icon-Kopien mehr. Einstiegsseite und Prototypen
  (Flow, Staffing, Sign, Time, Codex-Übersicht) nutzen das freigegebene Set aus EduKSX-UI; die vorläufigen, abweichenden
  Motive für Codex, Sign und Time entfallen. Neu `tools/eduksx_icons.py`, Workflow `seite.yml` holt `EduKSX-UI/icons/svg`.

### Neu

- **Umsetzungsgrundlagen nach DB-Standard 1.3 / API-Standard 1.2** von EduKSX-Architektur (#51): Datenbank und API
  aller Module mit englischen Namen und deutschen Beschreibungen je Tabelle, Spalte und Wert (Geltungsbereich,
  Datenklasse, Herkunft/Verwendung, Labels; auch als `COMMENT ON`), `organization_id` als Mandant, Standardtabellen
  aus `docs/umsetzung/standardtabellen.sql` (ersetzt `core-referenz.sql`), API unter `/api/v1/org|me/…` mit
  `openapi.json`. Erzeugt und geprüft mit `tools/umsetzung_bauen.py`; der Entwicklerbereich zeigt zu jeder Spalte
  Begriff, Herkunft, Datenklasse und Werte – EduKSX-Staffing 0.2.1, EduKSX-Flow 0.6.1, EduKSX-Codex 0.23.1,
  EduKSX-Sign 0.2.1, EduKSX-Time 0.4.1.
- **Menüpunkt «Entwickler» in allen Prototypen** (wie die Entwicklerseite von EduKSX-Glossary): Datenmodell mit
  eigenem Beziehungsdiagramm, Tabellen und Spalten, SQL-Download; API-Dokumentation mit Scalar, Swagger UI (Senden
  aus), OpenAPI JSON/YAML – unter `prototypen/<name>/entwickler/`, erzeugt mit `tools/entwickler_bauen.py` aus
  `docs/umsetzung/`. Scalar 1.82.1 (MIT) und Swagger UI 5.35.1 (Apache-2.0) je Prototyp lokal, ohne Abrufe aus dem
  Netz; EduKSX-Time speichert den Bereich nicht im Service Worker. EduKSX-Staffing 0.2.0, EduKSX-Flow 0.6.0,
  EduKSX-Codex 0.22.0, EduKSX-Sign 0.2.0, EduKSX-Time 0.4.0.
- **Umsetzungsgrundlagen für alle Module** (`docs/umsetzung/`): je Modul (EduKSX-Staffing, -Flow, -Codex, -Sign,
  -Time) eine Datenbankstruktur (`datenbank.sql`, PostgreSQL 16, ein Schema je Modul, Core-Platzhalter in
  `core-referenz.sql`), eine API-Beschreibung (`openapi.yaml`, OpenAPI 3.1) und ein Dokument mit
  Anforderungskatalog, Pflichtenheft und Prüfpunkten für die produktive Umsetzung (`PFLICHTENHEFT.md`); gemeinsame
  Konventionen und Prüfpunkte im README; Prüfung `tools/test_umsetzung.py`.
- EduKSX-Flow 0.5.5 und EduKSX-Sign 0.1.4: Menüsektion «EduKSX-Prototypen › Alle Prototypen» entfernt – ersetzt durch
  die Zurück-Taste hinter dem Titel.
- Alle Prototypen: «Zurück» als Taste nur mit Icon (Pfeil links, Beschriftung für Screenreader); Einstiegsseite:
  statt des klickbaren Titels ist die ganze obere Fläche der Karte (Icon, Titel, Beschreibung) klickbar und durch
  einen feinen Strich vom Text getrennt; Titel wieder in normaler Grösse – EduKSX-Staffing 0.1.2, EduKSX-Flow 0.5.4,
  EduKSX-Codex 0.5.5, EduKSX-Sign 0.1.3, EduKSX-Time 0.3.6.
- Alle Prototypen: Titel auf der Einstiegsseite (Wortmarke und Icon) ist klickbar und öffnet den Prototyp wie
  «Prototyp öffnen»; jeder Prototyp hat hinter dem Titel einen Button «← Zurück» zur Einstiegsseite (auch in der
  Vorlage) – EduKSX-Staffing 0.1.1, EduKSX-Flow 0.5.3, EduKSX-Codex 0.5.4, EduKSX-Sign 0.1.2, EduKSX-Time 0.3.5.
- EduKSX-Sign 0.1.1: «Alle Prototypen» als Menüsektion über «Übersicht» (wie EduKSX-Flow).
- Prototyp **EduKSX-Sign – Signatur / Persönliche Ablage** (`prototypen/signatur`): persönliche Ablage mit
  Ordnern, Drag & Drop und Abgleich mit der Cloud-Ablage; PDF-Formulare ausfüllen, Text, Kommentar, Datum und
  Unterschriftsfeld setzen; Word inline bearbeiten; Signaturprozess mit PDF/A-Umwandlung, Unterzeichnenden,
  Signaturstufe, Feldern und Platzhaltern – Ergebnis `_sign` im Ursprungsordner; Versiegeln (`_seal`); Eingang
  für Signaturanfragen aus den anderen Modulen; Icon «sign» (vorläufig) auf der Einstiegsseite.
- Prototyp **EduKSX-Time – Zeiterfassung / Stempeln** (`prototypen/zeiterfassung`, Schritt 1, #19): installierbare
  Mobil-App (PWA) zum Ein- und Ausstempeln – Kommen, Pause, Gehen mit Buchungsart, Tagesliste, Ist/Soll/Saldo,
  Rückgängig, Gehen nachtragen, Pausenhinweis, Verlauf 14 Tage, offline mit simulierter Übertragung; Icon «time»
  (vorläufig) auf der Einstiegsseite.
- EduKSX-Time 0.2.0: animierte Uhr, solange man eingestempelt ist – laufender Block und Gesamtzeit heute, Ring
  im Verhältnis zum Soll, umlaufender Sekundenpunkt; in der Pause angehalten (#21).
- EduKSX-Time 0.3.0: Uhr als Tagesachse mit Soll-Markierung («noch … bis …») und gesetzlicher Pause – nach 5 h
  Arbeit 30 Min. schraffiert, zählt nicht als Arbeitszeit, Uhr läuft weiter; gebuchte Pausen angerechnet (#22).
- EduKSX-Time 0.3.1: gesetzliche Pause um alle gestempelten Pausen des Tages reduziert, auch spätere und die laufende;
  ab 30 Min. gestempelter Pause entfällt die schraffierte Fläche nachträglich (#23).
- EduKSX-Time 0.3.2: Pausenmodus mit eigener Tastenfarbe und Kaffeetasse («Pause beenden – weiterarbeiten») (#24).
- EduKSX-Time 0.3.3: markantere Symbole für Kommen und Gehen (Tür mit Pfeil hinein/hinaus) (#25).
- EduKSX-Time 0.3.4: Gehen-Pfeil nach links; eigene Farbe je Zustand – Kommen grün, Pause bernstein, Gehen rot,
  Statuskarte mit farbigem Rand (#26).
- Repository mit dem GitHub-Blueprint eingerichtet.
- Ordnerstruktur `prototypen/<name>/` mit Vorlage `prototypen/_vorlage/` (prototyp.json, README, index.html).
- Prototyp **EduKSX-Staffing – Einsatzplanung** (`prototypen/einsatzplanung`): Anforderungskatalog und
  Klickprototyp mit Stellenplan/VZE und Berufsauftrag nach den Vorgaben des Kantons Zürich.
- VZE-Tool des VSA (ab Version 2.19) aus EduKSX-Staffing befüllen, ohne Formatierung, Formeln oder Schutz zu
  verändern (`assets/xlsx-vorlage.js`, `assets/vze-tool.js`, Test `tools/test_xlsx_vorlage.py`).
- Abkürzungen und ausgeschriebene Begriffe erklärt EduKSX-Glossary (Einbindung 1.0.0 mit SRI, nur ausgewählte Bereiche
  und Fachgebiete, je Ansicht nur erste Fundstelle, abschaltbar); damit auch in den Gesetzestexten der Hilfe.
- Hinterlegtes, anonymisiertes VZE-Tool (VSA 2.19, Musterhausen) zum Ausprobieren, Knopf «Hinterlegtes Muster
  laden»; `tools/test_muster.py` prüft Muster auf Namen und Metadaten.
- Prototyp **EduKSX-Flow – Ablaufplanung** (`prototypen/ablaufplanung`): Ablaufvorlagen (Onboarding, Offboarding,
  Mutation) mit Schritten, Fristen ab Stichtag, Bedingungen und Zuständigkeit nach Funktionendiagramm; jeder Schritt
  ruft einen Vorgang aus dem Vorgangsregister der Module auf (simuliert), mit Ablaufbild, Prüfung, Versionierung,
  Aufgaben je Rolle und Aufrufprotokoll.
- EduKSX-Flow 0.2.0: Menüpunkt **Jahreskalender** (Jahresplanung ICT-Prozesse, Master-Checkliste, Kalender Fachstelle
  ICT) mit Zeitleiste, Liste und Quartalsansicht, Zuständigkeit, Teilaufgaben, Status; Ereignisse lassen sich mit
  Ablaufvorlagen verknüpfen und starten den Ablauf mit ihrem Datum als Stichtag. Neue Vorlage «Beschaffung Geräte».
- EduKSX-Flow 0.5.2: Link «Alle Prototypen» als eigene Menüsektion über «Übersicht» statt in der Kopfzeile.
- EduKSX-Flow 0.5.1: Link «← Alle Prototypen» in der Kopfzeile und im Fuss auf die Einstiegsseite (feste Adresse, funktioniert auch in der Vorschau).
- EduKSX-Flow 0.5.0: 41 neue Ablaufvorlagen (Gemeindeversammlung, Schulbehörde, RPK, Schulleitungskonferenz,
  Finanzen, Lernende, Personal, Infrastruktur, ICT) mit Quellenangabe je Schritt und Quellenverzeichnis; Vorlagen nach
  Gruppen; externe Rollen; Vorgänge für Geschäfte, Beschlüsse, Publikation, Lernende, Meldungen; geplantes Modul
  EduKSX-Finance; Kalenderereignisse mit den neuen Vorlagen verknüpft.
- EduKSX-Flow 0.4.0: Ferien und schulfreie Tage je Schuljahr (Testdaten Ferienplan Sekundarschulgemeinde Bülach
  2025/26–2028/29), Zeitregel «Schultage», Ferienbeginn/-ende als Bezugstermine, Ferienregel je Ereignis
  (beibehalten, vorziehen, nachholen, auslassen), Ferien in der Zeitleiste.
- EduKSX-Flow 0.3.0: Zeitregeln im Jahreskalender – Schuljahrestermine (Schuljahreswechsel, Semesterende,
  Semesterwechsel, Schuljahresende, ± Tage/Wochen/Monate), jedes Trimester/Semester/Quartal, monatlich, wöchentlich,
  täglich, Wochentage, Wochenende, Arbeitstage (Feiertage ZH); Schuljahresdaten je Schuljahr pflegbar; Serien als
  eine Zeile bzw. ein Balken; Filter nach Zeitregel; Beispielereignisse für jede Regel.
- EduKSX-Flow 0.2.1: Untertitel «Ablaufplanung / Termine und ToDo» (Kopfzeile, Einstiegsseite).
- Hilfe mit LPG (Stand 1.1.2022), LPVO (Stand 1.4.2026) und VVO (Stand 1.4.2026, Verweise aus der LPVO verlinkt), Suche und direkten Verweisen aus der Anwendung
  (`assets/recht.js`, erzeugt mit `tools/recht_aufbereiten.py`).
- Einstiegsseite (Menü) für GitHub Pages (`tools/seite_bauen.py`, Workflow `seite`), Kontrastprüfung der CI-Farben.
- EduKSX-Staffing: Datenmodell für Personen, Klassen und Einsätze erweitert (ANFORDERUNGEN § 18): mehrere Personen
  je Gefäss, Einheiten WL/%/Wochenstunden, Soll/Ist-Beschäftigungsgrad, Klassen-Detailseite, Matrix Klasse – Fach –
  Lehrperson, Ämter und Kustodien, Gefässe je Bereich inkl. Flex, Personaldossier, Ressourcen in VZE.
- Prototyp **EduKSX-Codex – Rechtssammlung** (`prototypen/rechtssammlung`): Evaluation der systematischen
  Rechtssammlungen im Kanton Zürich – Pilot mit Politischer Gemeinde Trüllikon, Primarschule Trüllikon, Sekundarschule
  Kreis Marthalen und Sekundarschule Bülach (Menüpfad, Aufbau, Dateien, Befunde), Liste der 160 politischen Gemeinden,
  je eine Demo-Seite im Stil der Original-Website (ohne Original-Logos, mit Hinweis «keine offizielle Seite»);
  Generator `tools/build.py`, Einstiegsseite mit vorläufigem Icon «codex».
- EduKSX-Codex 0.2.0: Menü links nach Bezirk › Politische Gemeinden / Schulgemeinden (eigener Zweig) › Rubriken der
  Rechtssammlung, Suche im Menü; Ansichten Bezirk, Gemeinde, Organisation (Steckbrief, Befunde, Struktur) und Rubrik
  (Dokumente mit Unterordnern). Aufbau ohne innerHTML.
- EduKSX-Codex 0.3.0: weitere Gemeinden erfasst (Meilen, Bachenbülach inkl. Schule, Höri inkl. Primarschulgemeinde,
  Winkel inkl. Schule, Hochfelden); alle 60 Schulgemeinden nach Gemeindeverzeichnis, Vermerk «Einheitsgemeinde» je
  politische Gemeinde im Menü; Struktur-Matrix Menü › Untermenü › Dokument je Organisation mit Erkennung ähnlicher
  Dokumente (vorhanden / unsicher / fehlt, Link hinter dem Symbol); Ansichten Demoseite, iFrame-Variante und
  Original ⟷ Nachbau (geteiltes Fenster); einbettbares Widget `embed/` mit Navigation, Suche und PDF-Vorschau;
  Websites der 160 Gemeinden.
- EduKSX-Codex 0.4.0: Leitfaden systematische Rechtssammlung (Gemeindeamt/VZGV) abgelegt (`quellen/`, Original und
  PDF-Vorschau); Ansicht «Grundlagen» mit Rechtsgrundlagen GG/VGG (ZH-Lex), Anforderungen, Systematik Anhang 1/2 und
  den 14 LS-Ordnern; automatische Leitfaden-Prüfung je Organisation mit Einordnung der Dokumentarten; Matrix-Gruppe
  «Gehört nicht in die SR» (Beschlüsse, Budgets, Jahresrechnungen, Raumpläne).
- EduKSX-Codex 0.5.0: Dübendorf (Stadt, Primarschule, Sekundarschulgemeinde Dübendorf-Schwerzenbach) und Fehraltorf
  (Einheitsgemeinde) erfasst; Leitfaden-Prüfung meldet Schul-Erlasse ausserhalb von Sachgebiet 4.
- EduKSX-Codex 0.5.1: Vermerk im Menü gekürzt – «EG» (Einheitsgemeinde), «EG ?» wenn nicht gesichert, «keine EG»;
  Langform im Tooltip und auf der Gemeinde-/Organisationsseite.
- EduKSX-Codex 0.5.2: Vergleichstabelle der Übersicht gedreht – eine Zeile je Organisation (mit Link), Merkmale als Spalten.
- EduKSX-Codex 0.5.3: Bezirksliste im Menü zeigt «analysiert / **Anzahl Gemeinden**» (z. B. 1 / **10**).
- EduKSX-Codex 0.6.0: neue Startseite «Übersicht» wie in den anderen Modulen – Kennzahlen (erfasste Gemeinden,
  Schulgemeinden, Dokumente, Leitfaden-Prüfung), Fortschritt je Bezirk, Handlungsbedarf nach Leitfaden, erfasste
  Rechtssammlungen, Dokumentarten, vorbildliche Beispiele, Plattformen und Ablauf; bisherige Seite heisst «Vergleich».
  Zurück-Taste aus 0.5.5 in den Generator übernommen.
- EduKSX-Codex 0.7.0: Menüsektion «Gesetzestexte & Verordnungen» – Rechtsgrundlagen Schule (62 Einträge in 7 Sachbereichen,
  Suche und Filter nach Sachbereich und Ebene, Fundstelle mit dauerhaftem ZH-Lex-/Fedlex-Link, 13 Fundstellen geprüft)
  und Herkunftsliste der Publikationsquellen; Ausgangsliste unter `quellen/` abgelegt.
- EduKSX-Codex 0.7.1: Herkunftsliste um Ebene «Kommunal – Rechtssammlung der Schule XYZ» ergänzt (Platzhalter, wird durch
  die gewählte Schulgemeinde ersetzt); kommunale Einträge der Rechtsgrundlagen zählen dorthin.
- EduKSX-Codex 0.7.2: Menü «Gesetzestexte & Verordnungen» – Herkunftsliste als erster Eintrag.
- EduKSX-Codex 0.8.0: Quellenkatalog mit 29 Quellen in Klassen A–F; Rechtsgrundlagen mit herausgebender Behörde,
  Publikationsstelle, Downloadort, Spalten «Veröffentlicht» und «Version»; 466 Fassungen von 26 ZH-Lex-Erlassen mit
  Historik («⟲ n», Klick öffnet die Fassungen); Gemeinde-Dokumente mit «Gültig seit», «Veröffentlicht», «Version»;
  Analyse-Version und Datum je Organisation; Seite «Versionen & Abgleich»; Konzept `docs/KONZEPT-CODEX-VERSIONEN.md` (#32).
- EduKSX-Codex 0.9.0: Textfassungen der Rechtstexte als Markdown (Vorab-Aufbereitung mit `tools/texte.py`, keine KI zur
  Laufzeit) – VSG, VSV und LPVO mit allen Fassungen, Änderungen zwischen Fassungen farbig markiert («nur Änderungen»);
  Normenhierarchie Personalrecht (OR → PG/LPG/GG → PVO/VVO/LPVO → Gemeinde) mit Belegstellen und kommunalen Beispielen;
  Markdown-Dateien in `texte/` werden auf GitHub Pages veröffentlicht (`tools/seite_bauen.py`) (#33).
- EduKSX-Codex 0.10.0: Finanzrecht – FAG (LS 132.1), FAV (LS 132.11) und CRG (LS 611) in den Rechtsgrundlagen
  (jetzt 37 Erlasse Bund und Kanton); alle Fassungen von GG (6) und VGG (11) sowie FAV und CRG als Text mit Änderungen;
  Normenhierarchie mit Reitern «Personalrecht» und «Finanzen» (GG/FAG/CRG → VGG/FAV → Gemeindeordnung,
  Finanzreglement, Gebührenverordnung mit Belegstellen und kommunalen Beispielen); abgelöste Trennstriche in der
  Textaufbereitung werden zusammengefügt (#34).
- EduKSX-Codex 0.11.0: Normenhierarchien «Volksschule» (BV → BiG/VSG → VSV/VSM → Bildungsrat mit Lehrplan,
  Lektionentafel und Zeugnisreglement → Gemeindeordnung, Organisationsstatut, Schulreglemente) und «Datenschutz & ICT»
  (DSG/DSV → IDG, VSG §§ 3 a ff., ArchG, Auslagerungsgesetz → IDV, IVSV, ArchV → kommunale Reglemente); neue Linienart
  «nicht direkt anwendbar»; Liste der Bildungsratsbeschlüsse im Detail; Textfassungen für 9 weitere Erlasse (jetzt 21) (#35).
- EduKSX-Codex 0.12.0: Normenhierarchien «Sonderpädagogik» (BehiG → VSG → VSM, VFiSo, Aufsicht, SpiV → Gemeinde),
  «Beschaffung & Bau» (neue Ebene Konkordat: IVöB → BeiG IVöB, PBG → SVO → Beschaffungsrichtlinien, BZO) und
  «Kindesschutz & Schweigepflicht» (KRK → ZGB, StGB → VSG, VSV → Gemeinde) – jetzt 7 Themen; Textfassungen für
  6 weitere Erlasse (jetzt 27) (#36).
- EduKSX-Codex 0.13.0: Normenhierarchie – Linien verteilt angedockt, Beschriftungen ohne Überlappung, Hervorhebung der
  Verbindungen beim Klick; Ansicht je Organisation («Ansicht für», Route `#/hierarchie/<thema>/<org>`); Querbezüge «auch in» /
  «Kommt vor in» in Hierarchie, Rechtsgrundlagen und Textansicht (#37).
- EduKSX-Codex 0.14.0: Bundesrecht aus Fedlex (`tools/fedlex.py`) – 9 Bundeserlasse als Textfassung mit Änderungen
  zwischen den Ständen, Fassungsliste aller Konsolidierungen in den Rechtsgrundlagen (Historik, «künftig»), Belegstellen aus
  BV, OR, DSG, DSV, BehiG, KRK, ZGB und StGB in der Normenhierarchie (#38).
- EduKSX-Codex 0.15.0: Normenhierarchie – Verbindungen maschinell aus den Textfassungen ausgelesen (Ingress, § 1 / Art. 1,
  Fussnoten): Status «maschinell bestätigt» / «nur von Hand» je Verbindung, Vorschläge für fehlende Verbindungen (in der Grafik
  zuschaltbar) und Liste weiterer Erlasse, auf die oft verwiesen wird (#39).
- EduKSX-Codex 0.16.0: Pflichtkatalog Schulgemeinde als Menüpunkt (40 Dokumente, Einstufung Pflicht / bedingt / optional,
  Aufnahme in die Rechtssammlung, Quelle; Vollständigkeit je Organisation); Struktur-Matrix mit Pflichtkatalog-Zeilen, P/B/O-Zählern
  je Spalte und Auswahl von bis zu 3 Organisationen (#40).
- EduKSX-Codex 0.17.0: Normenhierarchie – kommunale Beispiele geschärft (ohne Behördenbeschlüsse und fachfremde Treffer); neue
  Themen «Verfahren & Rechtsschutz» (BV, KV, VRG, GG, VSG → Gemeinde) und «Unterricht & Medien» (URG, VSG, IDG, Bildungsrat → Schule),
  jetzt 9 Themen; Textfassungen KV und VRG; Konzept Kapitel 4a mit nächsten Schritten (#41).
- EduKSX-Codex 0.18.0: Normenhierarchie – Themen nach Bezug zur Volksschule geordnet und gruppiert (Schule, Kinder, Personal,
  Unterricht, Organisation & Ressourcen); Personalrecht überarbeitet: Strang Lehrpersonen/Schulleitungen (LPG, LPVO, VSG § 44,
  Zuständigkeiten der Schulpflege) getrennt vom übrigen Gemeindepersonal (GG § 53), Belegstelle OR Art. 336 korrigiert (#42).
- EduKSX-Codex 0.19.0: Normenhierarchien «Eltern» (KRK, ZGB → VSG, VSV → Elternmitwirkung, Absenzen) und «Gesundheit»
  (EpG → GesG, VSG → VSV, VV EpiG, VSVZ → schulärztlicher Dienst), jetzt 11 Themen; Rechtsgrundlagen 66–69 (GesG, VSVZ,
  VV EpiG, EpG) mit Fassungen und Textfassungen (#43).
- EduKSX-Codex 0.20.0: Normenhierarchie mit fünf weiteren Themen aus dem Volksschulgesetz – Schulorganisation & Qualität,
  Schulpflicht/Schulort/Privatschulen, Tagesstrukturen & ergänzende Angebote, Beurteilung & Schullaufbahn, Sprache & Integration
  (jetzt 16 Themen); Finanzen, Personal und Verfahren um VSG-Bestimmungen erweitert; Rechtsgrundlagen 70–77 (#44).
- EduKSX-Codex 0.20.1: Musikschulgesetz (LS 410.6), Musikschulverordnung (LS 410.61), Kinder- und Jugendhilfegesetz (LS 852.1),
  Mittelschulgesetz (LS 413.21), Aufnahme Gymnasium (LS 413.250.1), Aufnahme Maturitätsschulen (LS 413.250.2) und RSA 2009 (LS 414.16)
  mit allen Fassungen des geltenden Erlasses als Text und Änderungen (#44).
- EduKSX-Codex 0.21.0: Elternwegweiser (12 Elternfragen mit Zitaten aus Bund und Kanton, Links in die Normenhierarchie,
  Reglemente der gewählten Gemeinde); Normenhierarchie mit getrennten Gruppen Kinder und Eltern und neuen Themen «Absenzen,
  Urlaub, Jokertage» und «Kosten für Eltern» (jetzt 18 Themen) (#45).
- EduKSX-Codex 0.23.0: Normenhierarchie – neue Gruppe «Behörden & Organisation» mit sechs Themen (Gemeindeorganisation,
  Rechtsetzung & Information; Stimmberechtigte, Gemeindeversammlung & Parlament; Behörden & Kommissionen; Wahlen &
  Behördenmitglieder; Prüfung & Aufsicht; Zusammenarbeit & Gemeindestrukturen), Gruppe «Ressourcen»; jetzt 24 Themen;
  Rechtsgrundlagen 78–79 (GPR, VPR); Elternfrage «Wer entscheidet an unserer Schule?» (#46).
- EduKSX-Codex 0.24.0: Normenhierarchie – Themenwahl als Übersicht in Spalten nach Gruppen statt Reiterleiste; alle 24 Themen auf
  einen Blick, Kurzbezeichnungen, gewähltes Thema hervorgehoben (#52).
- EduKSX-Codex 0.25.0: Redaktionelle Inhalte für die Datenbank – Datenmodell mit Redaktionsstatus und Importläufen, Pflege-API
  (Upsert/Löschen über Schlüssel, Freigabe, Import JSON/Excel/CSV mit Probelauf, Export), `tools/inhalte.py` (Export der
  heutigen Inhalte, Prüfung, Umwandlung, Ladetest), Anweisung für die KI-Recherche (#53).
- Entwickler-Seiten: Abschnitt «Unterlagen und Pflege der Inhalte» mit Pflichtenheft, Anweisung KI-Recherche und Downloads
  der Inhalte (Excel, JSON, Vorlage, CSV); Menüeintrag «Entwickler (Datenmodell, API, Pflege)» (#53).
- EduKSX-Codex 0.26.0: Menü neu gegliedert – zuerst «Gesetzestexte & Verordnungen» (Publikationsquellen, Rechtsgrundlagen
  Volksschule, Normenhierarchien, Textfassungen, Elternwegweiser), dann «Gemeinde-Sammlungen» (Versionen & Abgleich, Übersicht,
  Vergleich, …); Listen und Tabellen immer von Bund über Kanton, Bildungsrat, Volksschulamt, Gemeindeamt bis Gemeinde (#54).
- EduKSX-Codex 0.27.0: Normenhierarchie – drei Themen aus dem Volksschulgesetz: Klassen, Unterrichtszeit & Ferien; Disziplin,
  Wegweisung & Auszeit; Privatschulen & Privatunterricht; im Elternwegweiser verknüpft (#55).
- EduKSX-Codex 0.28.0: Normenhierarchie – Sport, Bewegung & Lager und Haftung, Versicherung & Sicherheit; neue Erlasse SpoFöG,
  SpoFöV, KVG, UVG (Fedlex) und Haftungsgesetz LS 170.1 (ZH-Lex) als Textfassung (#56).
- EduKSX-Codex 0.29.0: Normenhierarchie – Ergänzungen Berufswahl (BBG, EG BBG), ergänzende Angebote (Aufgabenhilfe, Nachhilfe,
  HSK), religiöse Feiertage (BV Art. 15) und Gesundheitsschutz/Gleichstellung im Personalrecht (ArG, ArGV 3, GlG) (#57).
- EduKSX-Codex 0.30.0: Normenhierarchie – Gruppe «Ressourcen» aufgeteilt in Finanzen & Beschaffung, Information & ICT,
  Infrastruktur & Sicherheit (#58).
- EduKSX-Codex 0.31.0: Normenhierarchie – Schulsozialarbeit & Jugendhilfe (Gruppe Kinder) und Schulanlagen & Raumnutzung
  (Gruppe Infrastruktur & Sicherheit) (#59).
- EduKSX-Codex 0.32.0: Dokumenttyp A/B/C als Vorschlag (zu prüfen) – Pflichtkatalog, Struktur-Matrix, Dokumentlisten der
  Organisationen, Datenmodell (`document_class`), API und Importvorlage (#60).
- EduKSX-Codex 0.33.0: Pflichtkatalog – je Organisation «keine Relevanz» mit Grund und Bemerkung setzen; zählt nicht zur
  Vollständigkeit, Anzeige in der Struktur-Matrix; Datenmodell `mandatory_document_assessments` und API (#61).
- EduKSX-Codex 0.34.0: Rechtsänderungs-Monitoring – Seite «Rechtsänderungen & Prüfliste» mit geänderten Stellen je Erlass,
  betroffenen Verbindungen, Elternwegweiser und kommunalen Dokumenten zu prüfen; Datenmodell `change_review_items`, API `/legal-changes` (#62).
- EduKSX-Codex 0.35.0: Praxisthemen für Schulleitungen – KI, Prävention, Notfall, Kommunikation, Partizipation mit Rechtsstellen,
  Normenhierarchien, Regelungen der Gemeinde und Hinweisen kantonaler Stellen mit Quelle (Klasse C); Datenmodell und Import (#63).
- EduKSX-Codex 0.36.0: Gemeindeart mit Kürzeln (PG, EG, EG-P, EG-S, SG-P/S/V, KSG-P/S/V), Sek Bülach als Kreissekundarschule;
  Datenmodell und API für die Versionierung der Normenhierarchien; Entscheide zu Quellenklassen und KI-Zugang (#64).
Mitteilung bei Rechtsänderungen: Empfänger je Organisation einstellbar (Schulverwaltung, Schulpflege, Schulleitung, Gemeindeschreiber/in; E-Mail, Anlass) – Tabelle change_notification_recipients, API notification-recipients, Prototyp auf der Seite Rechtsänderungen. Mitglieder der Schulgemeinden als pflegbare Liste data/schulgemeinden-mitglieder.csv mit Quelle; Abgleich mit den Eckwerten des Gemeindeamts (160/114/60/8) auf den Seiten Gemeinden und Schulgemeinden (CDX-F-32, CDX-F-33).
Ebene neu als staatliche Ebene: International, Bund, Interkantonal, Kanton, Bezirk, Gemeinde. Bildungsrat, Volksschulamt und Gemeindeamt sind Behörden des Kantons (Feld Behörde/Erlassgeber, Sortierung innerhalb Kanton); UN-Kinderrechtskonvention neu International, IVöB Interkantonal. Erläuterung «Ebenen und Behörden» auf der Seite Rechtsgrundlagen; Publikationsquellen mit Ebene und Behörde; DB publishers.level erweitert, neues Feld authority (CDX-F-34).
Schulstandorte (Karte): 191 Schulträger der Volksschule aus dem Schulverzeichnis der Bildungsdirektion mit VSA-Nr., Behörde, Kontaktstelle, Adresse, Telefon, E-Mail, Website; Lage gebäudegenau aus dem Gebäudeadressverzeichnis (EGID, BFS-Nr.); 1036 Schulareale (swissNAMES3D) und 489 Anlagen der Stadt Zürich; Filter nach Bezirk, Art, Schulträger; Standorte-Links bei Gemeinden, Schulgemeinden und Organisationen. Gemeindeart aus dem Verzeichnis abgeleitet (114 Gemeinden mit Schulaufgaben = Gemeindeamt). Neue Tabelle school_sites, Felder an school_communities und municipalities, API /school-sites (CDX-F-35 bis CDX-F-37). Personendaten entfernt. Leaflet 1.9.4 im Prototyp-Ordner.
Schulträgerkarte des Gemeindeamts übernommen: Primar- und Sekundarschulträger je Gemeinde mit Code, Schulgebiet, Anschlussvertrag und Zweckverband; Gemeindeart daraus (58 EG, 56 EG-P, 46 PG = 114), Mitglieder aller 60 Schulgemeinden amtlich; Gebiete als Kartenebene. Links je Schulträger erzeugt und gespeichert. Beta «Angaben prüfen» mit einmaligem PIN (Simulation, Tabellen data_review_*, data_corrections, API /data-review). Sonderschulen (Volksschulamt) und Sekundarstufe II (GIS-ZH 600) auf der Karte; Privatschulen ausgeblendet. Fehler behoben: Link auf map.geo.admin.ch nutzt LV95-Koordinaten (CDX-F-38 bis CDX-F-41).
Karte Schulstandorte besser lesbar: Markierungen mit Buchstabe je Art (V Verwaltung, S Schulhaus, K Kindergarten, ? zu prüfen, H Sonderschule, II Sekundarstufe II), weissem Rand und Schatten; Grundkarte aufgehellt, wählbar (Landeskarte hell, farbig, Luftbild); in der Übersicht kleine Punkte, ab Zoomstufe 12 mit Buchstaben.
Neue Seite «Schulträgerkarte»: Flächenkarte der Primar- und Sekundarschulträger im Stil der Schulträgerkarte des Gemeindeamts – Karte wechseln, Gemeinde suchen, Auswahl als Chips und im Link, Legende «Trägertyp (effektiv)» mit Anzahl, Tabelle mit Gemeindegebiet und Link zu den Standorten. Eigene Umsetzung; Quelle (Gemeindeamt, Statistisches Amt, Observable-Notebook) auf der Seite, im Code und in docs/third-party.json vermerkt. Neuer Link je Schulträger «codex_traegerkarte» (CDX-F-42).
Lange Adressen werden nicht mehr ausgeschrieben: Links zeigen die Domain (ohne www) und «› …» bei weiterem Pfad, die volle Adresse steht im Tooltip. Zentral im Link-Baustein der App und im Banner der Demoseiten.
- `tools/neuer_prototyp.py` zum Anlegen und `tools/pruefen.py` für alle Prüfungen inkl. Übersicht im README.
