# Redaktionelle Inhalte im Importformat 1.0

Erzeugt mit `python3 tools/inhalte.py export` aus dem Generator (`tools/build.py`) – **nicht von Hand ändern**,
sondern als Vorlage kopieren.

| Datei | Inhalt |
|---|---|
| `codex-inhalte.json` | Inhaltspaket (Schema `ContentBundle` der Pflege-API) – Erstbefüllung der Datenbank |
| `codex-inhalte.xlsx` | dieselben Inhalte als Excel-Arbeitsmappe (Blatt `_anleitung` erklärt die Blätter) |
| `csv/*.csv` | dieselben Inhalte als CSV (UTF-8, Semikolon), eine Datei je Blatt |
| `vorlage.xlsx` | leere Vorlage mit einem Beispiel |
| `pruefbericht.txt` | Ergebnis der Prüfung des Exports (Warnungen = bekannte Lücken, z. B. Verbindungen ohne Belegstelle) |

Werkzeug:

```
python3 tools/inhalte.py pruefen <datei.json|.xlsx|csv-ordner>   # Prüfung wie der Probelauf der API
python3 tools/inhalte.py umwandeln <ein> <aus>                   # zwischen JSON, Excel und CSV
python3 tools/inhalte.py sql <paket> <aus.sql>                   # Ladetest gegen docs/umsetzung/codex/datenbank.sql
```

Pflege später ohne Deploy: Pflege-API (`/api/v1/content-imports`, `…/by-key/{key}`), Anweisung für die KI-Recherche
in [`docs/umsetzung/codex/KI-RECHERCHE.md`](../../../../docs/umsetzung/codex/KI-RECHERCHE.md), Zuordnung Anzeige →
Tabelle im [Pflichtenheft 3.7](../../../../docs/umsetzung/codex/PFLICHTENHEFT.md).
