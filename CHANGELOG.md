# Changelog – EduKSX-Prototyp

Format angelehnt an [Keep a Changelog](https://keepachangelog.com/de/), Versionen nach
[Semantic Versioning](https://semver.org/lang/de/) (MAJOR.MINOR.PATCH). Neue Einträge kommen laufend unter
**Unveröffentlicht**; `python3 .github/blueprint/release.py set X.Y.Z --commit` macht daraus eine Version.

## [Unveröffentlicht]

### Neu

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
- Hilfe mit LPG (Stand 1.1.2022), LPVO (Stand 1.4.2026) und VVO (Stand 1.4.2026, Verweise aus der LPVO verlinkt), Suche und direkten Verweisen aus der Anwendung
  (`assets/recht.js`, erzeugt mit `tools/recht_aufbereiten.py`).
- Einstiegsseite (Menü) für GitHub Pages (`tools/seite_bauen.py`, Workflow `seite`), Kontrastprüfung der CI-Farben.
- EduKSX-Staffing: Datenmodell für Personen, Klassen und Einsätze erweitert (ANFORDERUNGEN § 18): mehrere Personen
  je Gefäss, Einheiten WL/%/Wochenstunden, Soll/Ist-Beschäftigungsgrad, Klassen-Detailseite, Matrix Klasse – Fach –
  Lehrperson, Ämter und Kustodien, Gefässe je Bereich inkl. Flex, Personaldossier, Ressourcen in VZE.
- `tools/neuer_prototyp.py` zum Anlegen und `tools/pruefen.py` für alle Prüfungen inkl. Übersicht im README.
