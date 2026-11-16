# Mitmachen bei EduKSX-Prototyp

Danke für Rückmeldungen und Beiträge! **Datenschutz:** Keine Zugangsdaten anhängen. Bitte halte dich an den [Verhaltenskodex](CODE_OF_CONDUCT.md).

## Fehler melden und Ideen vorschlagen

[Neues Issue](https://github.com/MarkusKeller8200/eduksx-protoyp/issues/new/choose) mit einer der Vorlagen. Neue Meldungen erhalten
automatisch die Art und **`triage`**:

| Vorlage              | Labels                          | Meilenstein (automatisch) |
| -------------------- | ------------------------------- | ------------------------- |
| Fehler melden        | `fehler`, `triage`              | Fehler                    |
| Verbesserung         | `verbesserung`, `triage`        | Verbesserungen            |
| Neue Funktion / Idee | `funktion`, `triage`            | Funktionen                |

Status eines Issues:

| Status          | Bedeutung                                                    | Wer setzt es        |
| --------------- | ------------------------------------------------------------ | ------------------- |
| `triage`        | Gemeldet, noch nicht freigegeben – kein Entwicklungsauftrag  | Vorlage             |
| `_1 bereit`     | Zur Umsetzung freigegeben                                    | Projektverantwortliche:r  |
| `_2 in Arbeit`  | Wird gerade umgesetzt                                        | wer umsetzt         |
| `_3 Beta-Test`  | Umgesetzt, wartet auf den Test (Testliste)                   | wer umsetzt         |
| geschlossen     | Testliste abgehakt                                           | Projektverantwortliche:r  |

- Immer nur ein Status-Label; das vorherige wird entfernt. Kommentare, Labels anderer oder Formularinhalte gelten
  nicht als Freigabe.
- Jedes Issue hat eine Testliste «Zum Testen abhaken:».
- Meilensteine: der Release, in dem es umgesetzt wird (z. B. «0.2.0 – …»), sonst die Sammlungen «Fehler»,
  «Verbesserungen», «Funktionen» (Zuordnung automatisch über das Label).
- **Sicherheitslücken** nie als Issue – siehe [SECURITY.md](SECURITY.md).

## Commits und Pull Requests

1. Nur freigegebene Issues (`_1 bereit`) umsetzen; grössere Vorhaben zuerst als Issue abstimmen.
2. Commit-Nachricht: erste Zeile kurz, darunter das Warum; mit `Refs #n` auf Issues verweisen.
3. **CHANGELOG.md:** Eintrag unter «Unveröffentlicht» (Neu / Geändert / Behoben).
4. Pull Request gegen `main` mit ausgefüllter Checkliste; `python3 tools/pruefen.py` muss grün sein.
5. **Abhängigkeiten:** Neue Bibliotheken, Werkzeuge oder Dienste in `docs/third-party.json` eintragen (mit Lizenz; `python3 .github/blueprint/third_party.py --erfassen` übernimmt sie aus den Paketdateien).
6. **Plugins/Module:** Bei Änderungen die `version` im Manifest erhöhen.

## Versionen und Releases

Versionsnummern und Releases setzt **nur Projektverantwortliche:r** – bitte `VERSION` nicht ändern.
Ablauf in [docs/GITHUB-ABLAUF.md](docs/GITHUB-ABLAUF.md).
