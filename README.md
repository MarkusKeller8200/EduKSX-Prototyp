# EduKSX-Prototyp

Ablage für Prototypen der EduKSX-Plattform: Klickprototypen und lauffähige Versuche, je als eigenes Unterprojekt unter prototypen/<name>/ – zum Ausprobieren und Abstimmen von Ideen, bevor sie in ein Modul-Repository übernommen werden.

## Prototypen

<!-- prototypen:start -->
_Noch keine Prototypen – neuen anlegen mit `python3 tools/neuer_prototyp.py <name>`._
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
tools/
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
- **Prüfen:** `python3 tools/pruefen.py` (Python 3.11+, nur Standardbibliothek).

## Mitmachen

Fehler, Verbesserungen und Ideen bitte über die Issue-Formulare melden. Wie Meldungen freigegeben und umgesetzt
werden, steht in [CONTRIBUTING.md](CONTRIBUTING.md) und [docs/GITHUB-ABLAUF.md](docs/GITHUB-ABLAUF.md).
Sicherheitslücken bitte nicht öffentlich melden, sondern wie in [SECURITY.md](SECURITY.md) beschrieben.

## Versionen

Änderungen stehen im [CHANGELOG.md](CHANGELOG.md). Releases entstehen nach Freigabe automatisch (`VERSION`,
Workflow `release.yml`).
