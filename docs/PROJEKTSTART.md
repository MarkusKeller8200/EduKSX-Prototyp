# Projektstart – EduKSX-Prototyp

Stand: 2026-11-16 · Status: **BESTÄTIGT** – Grundgerüst am 2026-11-16 angelegt

Steckbrief aus der Start-Checkliste (`start.py --ziel …` im GitHub-Blueprint). Er ist die Grundlage für das Grundgerüst
und für die Konfiguration in `.github/blueprint.toml`. Änderungen hier festhalten und `start.py` erneut ausführen.

## Ziel

Ablage für Prototypen der EduKSX-Plattform: Klickprototypen und lauffähige Versuche, je als eigenes Unterprojekt unter prototypen/<name>/ – zum Ausprobieren und Abstimmen von Ideen, bevor sie in ein Modul-Repository übernommen werden.

**Nichtziele:**

- kein produktiver Betrieb und keine echten Personendaten (nur erfundene Testdaten)
- kein gemeinsamer Code für Module (gehört nach EduKSX-Core)
- kein Ersatz für die Modul-Repositorys: übernommene Prototypen werden dort neu umgesetzt

## Datenschutz

- Zielgruppe: nur intern
- Anwendbares Recht: DSG
- Daten: keine Personendaten · Schutzbedarf: **öffentlich**

Die Zuordnung ist eine Arbeitshilfe, keine Rechtsberatung; bei öffentlichen Organen die zuständige
Datenschutzstelle einbeziehen (z. B. Vorabkontrolle bzw. Datenschutz-Folgenabschätzung).

## Antworten

| Frage | Antwort |
|---|---|
| Wie heisst das Projekt (voller Name)? | EduKSX-Prototyp |
| Was soll das Projekt leisten, und für wen? (ein bis zwei Sätze) | Ablage für Prototypen der EduKSX-Plattform: Klickprototypen und lauffähige Versuche, je als eigenes Unterprojekt unter prototypen/<name>/ – zum Ausprobieren und Abstimmen von Ideen, bevor sie in ein Modul-Repository übernommen werden. |
| Was gehört ausdrücklich nicht dazu (Nichtziele)? | kein produktiver Betrieb und keine echten Personendaten (nur erfundene Testdaten), kein gemeinsamer Code für Module (gehört nach EduKSX-Core), kein Ersatz für die Modul-Repositorys: übernommene Prototypen werden dort neu umgesetzt |
| Welcher Kurzname soll in den Release-Titeln stehen? | EduKSX-Prototyp |
| Ist es eine Web-Anwendung, eine Desktop-Anwendung oder beides? | web |
| Wer nutzt die Anwendung? | nur intern |
| Ist das Repository neu oder gibt es es schon? | neu |
| Wer gibt Issues und Releases frei (Rolle genügt)? | Projektverantwortliche:r |
| Arbeitest du allein oder im Team? | allein |
| Ist das Repository öffentlich oder privat? | öffentlich |
| Unter welcher Lizenz steht der Code? | MIT |
| Auf wen lautet die Lizenz? | Markus Keller |
| In welchen Programmiersprachen wird entwickelt? | JavaScript / TypeScript, PHP |
| Welcher Grundsatz gilt für Abhängigkeiten? | geprüfte Pakete |
| Wo läuft die Web-Anwendung? | offen |
| Wie kommt die Anwendung zu den Nutzer:innen? | nur Quellcode |
| Welches Framework bzw. welche Grundlage? | je Prototyp: HTML/CSS/JS (Klickprototyp) oder Laravel (PHP 8.4) |
| Welche Daten verarbeitet die Anwendung? | keine Personendaten |
| Welcher Schutzbedarf gilt für die Daten (Klassifizierung)? | öffentlich |
| Welche Anmeldungen und Zugänge braucht es? | keine |
| In welchen Sprachen wird die Oberfläche ausgeliefert? | de-CH |
| Gibt es Plugins oder Module mit eigener Version? | ja |
| Mit welchem Befehl laufen alle Prüfungen? | python3 tools/pruefen.py |
| In welcher Datei steht die Versionsnummer? | VERSION |
| Mit welcher Version startet das Projekt? | 0.1.0 |
| Mit welchen KI-Agenten wird gearbeitet? | Claude |
| Wie heisst der erste Meilenstein? | 0.1.0 – Grundgerüst |
| Übergabe und Projektstand auch als Kopie im Claude-Projekt führen? | nein |
| Welche ersten Funktionen gehören in diesen Meilenstein? | Ordnerstruktur prototypen/<name>/ mit Vorlage prototypen/_vorlage/, Prüfskript tools/pruefen.py: jeder Prototyp hat prototyp.json (Name, Version, Status, Technik) und README, Übersicht aller Prototypen im README |

## Grundgerüst

Vorschlag für Aufbau, Ordner und erste Dateien – wird vor dem Anlegen mit Projektverantwortliche:r
abgestimmt (Status je Punkt: BESCHLOSSEN, EMPFOHLEN, OFFEN, ZU PRÜFEN):

| Punkt | Vorschlag | Status |
|---|---|---|
| Technik | je Prototyp frei: HTML/CSS/JS (Klickprototyp), Laravel (PHP 8.4) oder andere | BESCHLOSSEN |
| Ordner | `prototypen/<name>/` je Unterprojekt, Vorlage `prototypen/_vorlage/`, Werkzeuge in `tools/` | BESCHLOSSEN |
| Prüfungen | `python3 tools/pruefen.py` (Workflow «pruefungen», Python 3.12) | BESCHLOSSEN |
| Version | Repository: `VERSION` mit 0.1.0; jeder Prototyp eigene `version` in `prototyp.json` | BESCHLOSSEN |
| Auslieferung | nur Quellcode; GitHub Pages für Klickprototypen später möglich | EMPFOHLEN |

## Erster Meilenstein: 0.1.0 – Grundgerüst

- [ ] Ordnerstruktur prototypen/<name>/ mit Vorlage prototypen/_vorlage/
- [ ] Prüfskript tools/pruefen.py: jeder Prototyp hat prototyp.json (Name, Version, Status, Technik) und README
- [ ] Übersicht aller Prototypen im README

Diese Punkte werden nach Bestätigung als Issues mit Testliste angelegt.
