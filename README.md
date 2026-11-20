# EduKSX-Prototyp

Ablage für Prototypen der EduKSX-Plattform: Klickprototypen und lauffähige Versuche, je als eigenes Unterprojekt unter prototypen/<name>/ – zum Ausprobieren und Abstimmen von Ideen, bevor sie in ein Modul-Repository übernommen werden.

## Prototypen

**Online ausprobieren:** https://markuskeller8200.github.io/EduKSX-Prototyp/ – Einstiegsseite mit allen Prototypen
(GitHub Pages, Workflow `seite`).

<!-- prototypen:start -->
| Prototyp | Beschreibung | Version | Status | Technik | Ziel-Modul |
|---|---|---|---|---|---|
| [Ablaufplanung / Termine und ToDo](prototypen/ablaufplanung/) | Abläufe einer Schulgemeinde als Schritte planen (45 Vorlagen: Gemeindeversammlung, Schulbehörde, RPK, Finanzen, Lernende, Personal, Infrastruktur, ICT) – mit Quellenangabe je Schritt, Fristen ab Stichtag und Zuständigkeit nach Funktionendiagramm; jeder Schritt ruft einen Vorgang aus einem anderen EduKSX-Modul auf. Jahreskalender mit Zeitregeln, Ferien und Verknüpfung zu Abläufen. | 0.5.5 | in-arbeit | html | EduKSX-Flow |
| [Einsatzplanung](prototypen/einsatzplanung/) | Pensen, Ressourcen und Berufsauftrag planen, Stellenplan und VZE nach den Vorgaben des Kantons Zürich, Anstellungsfreigaben, Pensenumfrage, Stellvertretungen, Personalgespräche und Tagesstrukturen. | 0.1.2 | in-arbeit | html | EduKSX-Staffing |
| [Rechtssammlung](prototypen/rechtssammlung/) | Systematische Rechtssammlungen der Zürcher Gemeinden und Schulgemeinden erfassen und vergleichen: Menü nach Bezirk › Gemeinde (mit Vermerk Einheitsgemeinde) › Rubriken, alle 160 Gemeinden und 60 Schulgemeinden, Struktur-Matrix mit Ähnlichkeitserkennung, Nachbau der Original-Seiten, einbettbares iFrame-Widget mit PDF-Vorschau und geteiltes Fenster Original ⟷ Nachbau, Prüfung gegen den kantonalen Leitfaden systematische Rechtssammlung (Grundlagen mit ZH-Lex-Systematik). | 0.12.0 | in-arbeit | html | EduKSX-Codex |
| [Signatur / Persönliche Ablage](prototypen/signatur/) | Persönliche Ablage je Mitarbeiter:in mit Ordnern, Drag & Drop und Abgleich mit der persönlichen Cloud-Ablage; PDF-Formulare inline ausfüllen, Text, Kommentar, Datum und Unterschriftsfeld setzen; Word inline bearbeiten; Signaturprozess mit PDF/A-Umwandlung, Unterzeichnenden, Signaturstufe und Feldern – Ergebnis mit Suffix _sign im Ursprungsordner; Dokumente versiegeln; Eingang für Signaturanfragen aus den anderen Modulen. | 0.1.4 | in-arbeit | html | EduKSX-Sign |
| [Zeiterfassung / Stempeln](prototypen/zeiterfassung/) | Installierbare Mobil-App (PWA) zum Ein- und Ausstempeln: Kommen, Pause, Gehen mit Buchungsart (Arbeitszeit, Homeoffice), Tagesliste, Ist/Soll/Saldo, Verlauf der letzten 14 Tage, funktioniert offline. Schritt 1 – Abwesenheiten, Korrekturen, Monatsabschluss und Visum folgen. | 0.3.6 | in-arbeit | html | EduKSX-Time |
<!-- prototypen:ende -->

Die Tabelle erzeugt `python3 tools/pruefen.py --schreiben` aus den `prototyp.json` der einzelnen Ordner.

## Aufbau

```
prototypen/
  _vorlage/              Vorlage für neue Prototypen (nicht direkt bearbeiten)
  <name>/                ein Prototyp = ein Unterprojekt, Ordnername in kebab-case
    prototyp.json        Name, Beschreibung, Version, Status, Technik, Ziel-Modul, Startdatei
    README.md            Frage, Starten, Ergebnis
    …                    eigene Dateien und Abhängigkeiten (HTML/JS, Laravel, …)
seite/
  eduksx.css             Farbwerte nach CI MarKusSXCH für die Einstiegsseite
tools/
  seite_bauen.py         Einstiegsseite (Menü) und Prototypen nach _site/ für GitHub Pages
  neuer_prototyp.py      neuen Prototyp aus der Vorlage anlegen
  pruefen.py             alle Prüfungen (lokal und im Workflow «pruefungen»)
```

- **Neuer Prototyp:** `python3 tools/neuer_prototyp.py stundenplan-raster --titel "Stundenplan-Raster" --technik html --modul EduKSX-Time`
- **Technik je Prototyp:** `html` (Klickprototyp, `index.html` im Browser öffnen), `laravel`/`php`, `node`, `python`,
  `andere`. Abhängigkeiten (`composer.json`, `package.json`) liegen im Ordner des Prototyps.
- **Status:** `idee` → `in-arbeit` → `abgestimmt` → `uebernommen` (ins Modul-Repository) oder `verworfen`.
- **Version:** jeder Prototyp hat eine eigene Version in `prototyp.json`; wer einen Prototyp ändert, erhöht sie
  (geprüft beim Release). Das Repository selbst zählt in `VERSION`.
- **Daten:** nur erfundene Testdaten, keine echten Personendaten, keine Zugangsdaten.
- **Prüfen:** `python3 tools/pruefen.py` (Python 3.11+, nur Standardbibliothek; inkl. Kontrastprüfung der CI-Farben).
- **Veröffentlichen:** Jeder Push auf `main` unter `prototypen/` baut die Einstiegsseite neu (`python3 tools/seite_bauen.py`
  lokal zum Ansehen). Neue Prototypen erscheinen automatisch im Menü; Prototypen mit Startdatei bekommen «öffnen».
- **Auftritt:** CI MarKusSXCH (EduKSX: Orange als UI-Akzent, Wortmarke E violett · du · K orange · SX blau).

## Mitmachen

Fehler, Verbesserungen und Ideen bitte über die Issue-Formulare melden. Wie Meldungen freigegeben und umgesetzt
werden, steht in [CONTRIBUTING.md](CONTRIBUTING.md) und [docs/GITHUB-ABLAUF.md](docs/GITHUB-ABLAUF.md).
Sicherheitslücken bitte nicht öffentlich melden, sondern wie in [SECURITY.md](SECURITY.md) beschrieben.

## Versionen

Änderungen stehen im [CHANGELOG.md](CHANGELOG.md). Releases entstehen nach Freigabe automatisch (`VERSION`,
Workflow `release.yml`).
