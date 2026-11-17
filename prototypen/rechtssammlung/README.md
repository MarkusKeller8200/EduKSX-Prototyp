# Prototyp: Rechtssammlung

**Status:** in-arbeit · **Technik:** html · **Ziel-Modul:** EduKSX-Codex

## Frage

Wie sind die systematischen Rechtssammlungen der Zürcher Gemeinden und Schulgemeinden heute aufgebaut
(Menüpfad, Rubriken, Nummerierung, Dateien) – und wie lässt sich daraus eine einheitliche Codex-Normalform ableiten?

## Starten

`index.html` im Browser öffnen (Übersicht, Vergleich, Liste der 160 politischen Gemeinden); von dort führen die
Demo-Seiten unter `demo/` weiter. Online über die Einstiegsseite der Prototypen.

Neu erzeugen (JSON, Übersicht, Demo-Seiten, Evaluation): `python3 prototypen/rechtssammlung/tools/build.py`

## Inhalt

| Pfad | Zweck |
|---|---|
| `index.html` | Übersicht im EduKSX-Auftritt: Pilot-Evaluation, Vergleich, Gemeindeliste |
| `demo/*.html` | Je eine nachgebaute Rechtssammlungs-Seite im Stil der Original-Website |
| `docs/evaluation.md` | Evaluation mit Menüstruktur und vollständiger Dateiliste je Organisation |
| `data/rechtssammlungen.json` | Normalisiertes Datenmodell (Rubrik → Unterordner → Dokument) |
| `data/gemeinden-zh.csv` | 160 politische Gemeinden nach Bezirk mit Erfassungsstatus |
| `data/raw/` | Rohdaten aus den Websites |
| `tools/build.py` | Generator (nur Python-Standardbibliothek) |

## Pilot (Stand 17.11.2026)

| Organisation | Menüpfad | Dokumente |
|---|---|---|
| Politische Gemeinde Trüllikon | Wir für Sie › Rechtssammlung | 39 |
| Primarschule Trüllikon | Download › Systematische Rechtssammlung | 190 |
| Sekundarschule Kreis Marthalen | Schulgemeinde › Systematische Rechtssammlung | 50 |
| Sekundarschule Bülach | Schulverwaltung › Systematische Rechtssammlung | 12 |

## Ergebnis

Noch offen. Erste Erkenntnisse in `docs/evaluation.md` (Befunde je Organisation, nächste Schritte).

## Hinweise

- Die Daten sind öffentlich publizierte Erlasse und Dokumentnamen der Organisationen, keine Personendaten.
- Demo-Seiten übernehmen Schrift, Farben und Seitenaufbau der Originale, aber **keine Logos**; sie tragen den Hinweis
  «keine offizielle Seite» und `noindex`. Die Original-Stylesheets sind nur als Kommentar referenziert.
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
