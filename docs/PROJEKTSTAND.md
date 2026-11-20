# EduKSX-Prototyp – Projektstand

> Stand 2026-11-20: Umsetzungsgrundlagen nach DB-/API-Standard der Architektur umgestellt (#51). Zuvor 03:45: Umsetzungsgrundlagen für alle fünf Module (`docs/umsetzung/`: Datenbank, API, Pflichtenheft mit Prüfpunkten). Zuvor 00:30: Prototyp EduKSX-Sign (Signatur / Persönliche Ablage) angelegt. Zuvor 2026-11-17 (13:45): Prototyp EduKSX-Time (Stempeln, PWA) angelegt (#19). Zuvor 03:45: Prototyp EduKSX-Codex (Rechtssammlung) ergänzt (#6). Zuvor: Erster Prototyp EduKSX-Staffing (Einsatzplanung) mit Vorgaben Kanton Zürich und Einstiegsseite für GitHub Pages. GitHub-Einstellungen (Labels, Meilensteine, Rulesets) und das Einschalten von Pages stehen noch aus.

## Umgesetzt

| Bereich | Stand | Seit Version | Konzept |
|---|---|---|---|
| Grundgerüst Prototypen-Ablage | fertig | 0.1.0 | `docs/PROJEKTSTART.md` |
| Prototyp EduKSX-Staffing (Einsatzplanung) | Klickprototyp, in Abstimmung | 0.1.0 | `prototypen/einsatzplanung/ANFORDERUNGEN.md` |
| Prototyp EduKSX-Flow (Ablaufplanung) | Klickprototyp, in Abstimmung | 0.1.0 | `prototypen/ablaufplanung/README.md` |
| Prototyp EduKSX-Codex (Rechtssammlung) | Evaluation Pilot 4 Organisationen, Demo-Seiten (#6), Menü (#7), 12 Organisationen, Schulgemeinden, Matrix, Widget, PDF-Vorschau (#8–#12), Leitfaden-Prüfung und Grundlagen (#14), Dübendorf und Fehraltorf (#15), Übersicht (#30), Gesetzestexte & Verordnungen (#31), Versionen/Quellenkatalog (#32), Textfassungen und Normenhierarchie (#33), Finanzrecht und Normenhierarchie Finanzen (#34), Normenhierarchien Volksschule und Datenschutz (#35), Sonderpädagogik, Beschaffung & Bau, Kindesschutz (#36), Darstellung und Querbezüge (#37), Bundesrecht aus Fedlex (#38), maschinelle Verbindungsvorschläge (#39), Pflichtkatalog und Matrix-Auswahl (#40), 9 Themen und nächste Schritte (#41), Personalrecht und Reihenfolge (#42), Eltern und Gesundheit (#43), fünf VSG-Themen (#44), Elternwegweiser (#45), Behörden & Organisation (#46), Themenwahl (#52), Inhalte für die Datenbank: Datenmodell, Pflege-API, Import, KI-Recherche (#53), Menü und Ebenen-Reihenfolge (#54) – Prototyp 0.26.0 | 0.1.0 | `prototypen/rechtssammlung/docs/evaluation.md` |
| Prototyp EduKSX-Time (Zeiterfassung / Stempeln) | Schritt 1: Mobil-App (PWA) Ein-/Ausstempeln (#19), animierte Uhr (#21), Soll-Markierung und gesetzliche Pause (#22, #23), Pausentaste (#24), Symbole Kommen/Gehen (#25), Farben je Zustand (#26) – Prototyp 0.3.4 | 0.1.0 | `prototypen/zeiterfassung/README.md` |
| Prototyp EduKSX-Sign (Signatur / Persönliche Ablage) | Klickprototyp 0.1.0: Ablage, Abgleich Cloud-Ablage, PDF-/Word-/Excel-Bearbeitung, Signaturprozess, Versiegeln, Eingang aus den Modulen | 0.1.0 | `prototypen/signatur/README.md` |
| Umsetzungsgrundlagen der Module (Staffing, Flow, Codex, Sign, Time) | Entwurf nach DB-Standard 1.3 / API-Standard 1.2 (englische Namen, deutsche Beschreibungen): Datenbankstruktur (PostgreSQL), OpenAPI 3.1, Anforderungskatalog/Pflichtenheft/Prüfpunkte; erzeugt mit `tools/umsetzung_bauen.py`, geprüft mit `tools/test_umsetzung.py` | – | `docs/umsetzung/README.md` |
| Einstiegsseite GitHub Pages | fertig, Pages noch einzuschalten | 0.1.0 | `tools/seite_bauen.py` |

## Offen bzw. geplant

- Meilenstein «0.1.0 – Grundgerüst»: Issues noch anzulegen (GitHub-Teil von apply.py)
- EduKSX-Codex: Websites und CMS der 160 Gemeinden erfassen, 60 Schulgemeinden ergänzen, Codex-Normalform festlegen (noch kein Issue, erst nach Freigabe)
- EduKSX-Time: weitere Schritte (Abwesenheiten, Korrekturen, Monatsübersicht, Einreichen/Visum, Anmeldung) – je als Issue nach Freigabe
- EduKSX-Sign: offene Punkte im README (Suffix `_seal`, Ablage erhaltener Unterschriften, Anbindung Cloud-Ablage über EduKSX-Connect, Signaturdienst-Anbieter); Issue noch anzulegen
- Sammlungen Fehler / Verbesserungen / Funktionen: nur nach Freigabe

## Technik

- Unterprojekte unter `prototypen/<name>/` mit `prototyp.json`; Vorlage `prototypen/_vorlage/`; Werkzeuge in `tools/` (nur Python-Standardbibliothek).
- Prüfen: `python3 tools/pruefen.py`
