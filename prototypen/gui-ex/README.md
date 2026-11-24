# Prototyp: GUI-Experience (GUI-EX)

**Status:** in-arbeit · **Technik:** html · **Ziel-Modul:** EduKSX-Experience (übergreifend, alle Module)

## Frage

Alle bisherigen Prototypen nutzen dasselbe Verwaltungs-Layout (Kopfzeile, Navigation links, Kennzahl-Karten,
Tabellen). Welche grundlegend andere Oberfläche fühlt sich für Lehrpersonen, Schulleitung und Verwaltung besser an?
Dazu zeigen fünf Varianten **denselben Inhalt** (Aufgaben, Termine, Meldungen der Module Staffing, Flow, Codex,
Time, Sign, AI, Glossary) mit völlig anderer Bedienung.

| Variante | Datei | Leitidee |
|---|---|---|
| A – Fokus | `fokus.html` | Eine grosse Eingabe («Was möchtest du tun?») statt Menü; sucht Aktionen, Aufgaben, Termine, Module, Begriffe; Tastatur `/`, `Ctrl/⌘ K`, ↑↓, Enter, Esc. Sonst nur die drei nächsten Aufgaben. |
| B – Kacheln | `kacheln.html` | Startbildschirm wie auf dem Tablet: grosse, lebende Kacheln (Stempeluhr, Signieren, Termine …), zweite Seite seitlich wischen, Dock unten, Module als Vollbild-Blatt. |
| C – Zeitstrahl | `zeitstrahl.html` | Alles auf einer Zeitachse: Bahn je Modul, Tage als Spalten, Jetzt-Linie, schraffiertes Wochenende, Zoom Woche/2 Wochen/Monat, Filter je Modul; Aufgaben als Karten mit Fortschrittsbalken, Detailspalte mit Fortschrittsring und abhakbaren Teilschritten; schmal als senkrechte Liste. |
| D – Arbeitsfläche | `fenster.html` | Fenster wie am Desktop: Modulsymbole, verschiebbare und vergrösserbare Fenster, Taskleiste oben, «Anordnen», Aufgaben per Ziehen in den Wochenkalender. |
| E – Cockpit | `cockpit.html` | Bedienpult im festen Stil Neo-Dunkel: Stempeluhr als Leuchtring, Ringe für Stellenplan, Aufgaben, Signaturen und Woche, Verlaufskurve der Arbeitszeit mit Soll-Linie, Schnellschalter, Aufgaben als Pillen mit Fortschritt, runde Modultasten. |

**Stil-Schalter:** Aufbau und Aussehen sind getrennt. A–D lassen sich in vier Stilen zeigen – *Standard* (EduKSX wie bisher), *Neo-Dunkel* (weiche Tiefe, Orange als Leuchtakzent, immer dunkel), *Glas* (durchscheinend auf Pastellverlauf, hell oder dunkel), *Clay* (weich und plastisch). Die Stile ändern nur Flächen, Tiefe, Rundung und Hintergrund (`assets/gemeinsam.css`, `html[data-stil]`); Farben bleiben die CI-Werte, Rahmen bleiben für den Kontrast sichtbar. Anregung: Bildbeispiele aus dem Chat (nur konzeptionell, nichts übernommen).

Eine schwebende Leiste unten wechselt zwischen den Varianten, wählt den Stil, schaltet Hell/Dunkel und öffnet die **Bewertung**
(Zurechtfinden, Tempo, Gefallen, Bemerkung; nur im Browser gespeichert). Die Übersicht `index.html` zeigt Vergleich und
eigene Bewertungen und kopiert sie als Text.

## Starten

`index.html` im Browser öffnen (Icons erscheinen erst in der gebauten Seite, `tools/seite_bauen.py`).

## Ergebnis

Noch offen – nach dem Test: welche Variante, welcher Stil bzw. welche Teile (z. B. Befehlszeile aus A in allen Modulen, Kacheln aus B
für Mobil) werden in EduKSX-UI übernommen?

## Hinweise

- Nur erfundene Testdaten (`assets/daten.js`), keine echten Personen.
- Farben nur aus `assets/eduksx.css`; Orange nur als Fläche mit dunkler Schrift; Status immer mit Symbol und Text.
- Kein Entwickler-Bereich (DB/API): der Prototyp prüft nur Bedienkonzepte, keine Daten.
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
