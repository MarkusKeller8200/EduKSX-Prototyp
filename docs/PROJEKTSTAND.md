# EduKSX-Prototyp – Projektstand

> Stand 2026-11-16 (23:45): Repository eingerichtet (Blueprint-Dateien, Struktur `prototypen/`, Vorlage, Prüf- und Anlegeskript). Noch keine Prototypen. GitHub-Einstellungen (Labels, Meilensteine, Rulesets) und Umbenennung des Repositorys stehen noch aus.

## Umgesetzt

| Bereich | Stand | Seit Version | Konzept |
|---|---|---|---|
| Grundgerüst Prototypen-Ablage | fertig | 0.1.0 | `docs/PROJEKTSTART.md` |

## Offen bzw. geplant

- Meilenstein «0.1.0 – Grundgerüst»: Issues noch anzulegen (GitHub-Teil von apply.py)
- Sammlungen Fehler / Verbesserungen / Funktionen: nur nach Freigabe

## Technik

- Unterprojekte unter `prototypen/<name>/` mit `prototyp.json`; Vorlage `prototypen/_vorlage/`; Werkzeuge in `tools/` (nur Python-Standardbibliothek).
- Prüfen: `python3 tools/pruefen.py`
