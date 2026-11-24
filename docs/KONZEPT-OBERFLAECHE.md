# Konzept: Oberfläche – Ansichten je Arbeit und wählbare Stile (#93)

Stand: 2026-11-24 (Prototyp GUI-EX 0.6.0 / Meilenstein «EduKSX-Experience – GUI-Experience») · Status: **ENTWURF**

Entscheidungsgrundlage für EduKSX-UI und alle Module. Erprobt im Prototyp `prototypen/gui-ex` (#90, #92, #93, #95).
Umgesetzt wird erst, was als Issue mit `_1 bereit` freigegeben ist.

| Stufe | Bedeutung |
|---|---|
| **BESCHLOSSEN** | Vorgabe von Projektverantwortliche:r (mit Datum) |
| **EMPFOHLEN** | Vorschlag, noch nicht bestätigt |
| **OFFEN** | muss vor der Umsetzung entschieden werden |
| **ZU PRÜFEN** | technische Machbarkeit, Lizenz oder Kosten klären |

## 1. Ziel

Alle bisherigen Prototypen nutzen dasselbe Verwaltungs-Layout (Kopfzeile, Navigation links, Kennzahl-Karten,
Tabellen). GUI-EX hat sieben Bedienkonzepte und vier Stile erprobt.

- **BESCHLOSSEN (24.11.2026):** Die Konzepte eignen sich für verschiedene Arten von Arbeit – es gibt nicht *ein*
  Layout für alles. Beispiel: A (Befehlszeile) eignet sich nicht zum Bearbeiten von Tabellen.
- **EMPFOHLEN:** Ein gemeinsamer Rahmen für alle Module, darin Ansichten je Art der Arbeit; das Aussehen (Stil) ist
  davon getrennt und durch die Benutzer:innen wählbar.

**Nichtziele:** keine frei konfigurierbaren Layouts je Person; keine parallelen Oberflächen je Modul; keine
Stile, die die CI-Farben ersetzen.

## 2. Ablauf – Ansichten je Art der Arbeit

| Art der Arbeit | Ansicht | Herkunft GUI-EX | Stufe |
|---|---|---|---|
| Schnell finden oder auslösen (stempeln, Dokument, Person, Modul) | **Suche/Befehle** als Fenster über jeder Seite, `Ctrl/⌘ K` bzw. `/` | A Fokus (als Fenster in B–F erprobt) | EMPFOHLEN |
| Tagesüberblick, unterwegs, Handy/Tablet | **Startseite** mit lebenden Kacheln bzw. Cockpit | B Kacheln, E Cockpit | EMPFOHLEN |
| Planen mit Fristen und Abläufen (Flow, Jahresplanung, Stellvertretungen) | **Zeitstrahl** als Ansicht («als Zeitstrahl zeigen») mit Fortschritt und Detailspalte | C Zeitstrahl | EMPFOHLEN |
| Massendaten erfassen und korrigieren (Pensen, Lizenzen, Codex-Erfassung) | **Tabelle/Raster**: direkt in der Zelle bearbeiten, Tastatur, Mehrfachauswahl, Sammeländerung, Summen, Prüfhinweise, Rückgängig; Detailbereich oben, feste Ansichten mit Zählern, Mini-Grafiken und Kennzeichen in der Zeile, Statuszeile | F Tabelle | EMPFOHLEN |
| Vergleichen, mehrere Dinge parallel | **Arbeitsfläche** mit Fenstern, nur auf grossen Bildschirmen, optional – Tabs (G) decken den häufigen Fall «zwischen Dossiers springen» einfacher ab | D Arbeitsfläche | OFFEN (E3) |
| An einzelnen Datensätzen arbeiten (Lernende, Lehrpersonen, Klassen) | **Dossier**: Kopf mit wenigen Kernangaben, Abschnittsmenü mit Zählern, Karten mit Feldern; geöffnete Dossiers als **Tabs** | G Dossier (Anregung: Tab-Konzept einer bestehenden Schulverwaltungs-Software) | EMPFOHLEN |
| Kurz einen Datensatz ansehen oder ändern, ohne die Liste zu verlassen | Detailspalte rechts (wie C) | C Zeitstrahl | EMPFOHLEN |

Ein Modul bietet die Ansichten an, die zu seinen Daten passen (z. B. Staffing: Tabelle + Zeitstrahl; Time: Startseite
+ Tabelle für Korrekturen; Codex: Tabelle + Lesesicht). Die Suche ist überall gleich.

### Regeln für Tabs (EMPFOHLEN)

- Tabs nur für **Datensätze** (Dossiers), nicht für Module oder Listen; Start-Tab fest.
- Höchstens **8** offene Tabs; beim neunten rutscht der älteste nicht angeheftete nach «Zuletzt geöffnet» (OFFEN E6).
- Anheften, Schliessen mit × und mittlerer Maustaste, Wechsel mit Alt+1–9 bzw. Pfeiltasten in der Tableiste.
- Offene Tabs stehen in der Adresse (Link teilbar, Zurück-Taste des Browsers bleibt sinnvoll) und überstehen das Neuladen.
- Schmale Bildschirme: Auswahlliste «Geöffnet / Zuletzt» statt Tabs.
- Tabtitel wahlweise mit **Kürzel** statt vollem Namen (Bildschirm in Unterricht/Sitzung sichtbar).

### Datenschutz in Dossiers (EMPFOHLEN)

- Heikle Angaben (z. B. Sozialversicherungsnummer, Geburtsdatum, Adresse, Notizen) nicht auf der Übersicht im Klartext:
  je nach **Rolle** ausgeblendet («Keine Berechtigung») oder erst nach **«Anzeigen»** sichtbar.
- Jedes Anzeigen geschützter Angaben wird **protokolliert** (wer, was, wann) – Bezug zur Informationssicherheit
  (ISMS); Aufbewahrung und Einsicht ins Protokoll ZU PRÜFEN.
- Leere Felder kompakt darstellen statt vieler «–».

## 3. Stile (Themes)

Ein Stil ändert nur Flächen, Tiefe, Rundung, Hintergrund und Schatten – nie die Bedeutung von Farben. Status bleibt
immer Symbol + Text, Orange nie Schrift.

| Stil | Wirkung | Geeignet für | Stand | Stufe |
|---|---|---|---|---|
| Standard | ruhig, hell, wie bisher | alle | in GUI-EX | EMPFOHLEN (Grundstil) |
| Neo-Dunkel | weiche Tiefe, Orange leuchtet, immer dunkel | Cockpit, Abendarbeit | in GUI-EX | OFFEN (E1) |
| Glas | durchscheinend auf Pastellverlauf, hell/dunkel | Startseite, Planung | in GUI-EX | OFFEN (E1) |
| Clay | weich und plastisch, Pastell, zurückhaltende Rundung (16/10 px) | Startseite, Lehrpersonen | in GUI-EX | OFFEN (E1) |
| Hoher Kontrast | schwarz/weiss, dicke Fokusrahmen, keine Transparenz | Barrierefreiheit | in GUI-EX | EMPFOHLEN (Pflicht) |
| Aurora | dunkles Glas über weichen Farbschleiern in Violett/Blau/Orange | Startseite, «Wow» | in GUI-EX | OFFEN (E1) |
| Neubrutalismus | dicke dunkle Rahmen, harte versetzte Schatten, kräftige Flächen | Primarstufe, Lernende, Kampagnen | in GUI-EX | OFFEN (E1) |
| Papier | warmes Off-White, Serifen-Überschriften, feine Linien | Codex, Rechtstexte, lange Lesestrecken | in GUI-EX | OFFEN (E1) |
| Spielerisch (Primar) | grosse Rundungen, kräftige Pastellfarben, grosse Tasten | Schülerinnen und Schüler Primarstufe | in GUI-EX | OFFEN (E1) |

Zusätzlich, unabhängig vom Stil:

- **Hell/Dunkel** je Stil (ausser Neo-Dunkel und Hoher Kontrast) – EMPFOHLEN.
- **Dichte** «normal / kompakt» für Tabellen (Zeilenhöhe, Abstände) – EMPFOHLEN.
- **Akzentfarbe je Schule** (Mandant): eine zusätzliche Akzentfarbe neben dem EduKSX-Orange, z. B. für Kopfzeile und
  Auswahl – OFFEN (E5), Kontrast automatisch prüfen.

### Erscheinungsbild in fünf unabhängigen Einstellungen (EMPFOHLEN, im Prototyp 0.6.0)

Nicht alle Eigenschaften an einen Stil koppeln, sondern getrennte Ebenen von Design-Werten (Tokens):

| Ebene | Zuständig für | Wer legt fest |
|---|---|---|
| Stil (Theme) | Formensprache, Schatten, Rahmen, Rundung, Typografie | Schule gibt Standard vor, Person darf wählen (E2) |
| Farbmodus | Hell, Dunkel, System | Person |
| Akzent | Akzent- bzw. Schulfarbe (Hauptknöpfe, Auswahl, Markierungen) | Schule (Mandant), ggf. Person (E5) |
| Dichte | Abstände, Zeilenhöhen, Schriftgrösse: Kompakt / Normal / Komfortabel | Person |
| Barrierefreiheit | erhöhter Kontrast, Animationen reduzieren, Transparenz deaktivieren | Person; wirkt über jedem Stil |

Beispiel: Schulsekretariat «Swiss + Hell + Kompakt», Lernende «Cyberpunk + Dunkel + Komfortabel». Barrierefreiheit
bleibt unabhängig vom Stil gewährleistet. Stilnamen ohne Hersteller- oder Systemnamen.

Im Prototyp zusätzlich gebaut: Swiss, Tonal, Sachlich, Neumorph, Bento, Minimal, Natur, Zen, Enterprise, Cyberpunk,
Terminal (insgesamt 20 Stile). Noch nicht gebaut: Memphis, Elegant/Premium, Editorial.

## 4. Entscheide

| Nr. | Frage | Optionen | Entscheid | Status |
|---|---|---|---|---|
| E1 | Welche Stile werden angeboten? | nur Standard + Hoher Kontrast / eine Auswahl (z. B. je Gruppe 1–2) / alle 20 | – | OFFEN |
| E2 | Wer wählt den Stil? | jede Person im Profil / Schule legt fest / beides (Schule Vorgabe, Person darf ändern) | – | OFFEN |
| E3 | Arbeitsfläche (D) anbieten? | gar nicht / optional ab grossem Bildschirm | – | OFFEN |
| E4 | Startseite: Kacheln (B) oder Cockpit (E)? | B / E / B als Standard, E als Stil «Neo-Dunkel» der Startseite | – | OFFEN |
| E5 | Akzentfarbe je Schule? | nein / ja, mit Kontrastprüfung | – | OFFEN |
| E6 | Tabs für Dossiers? | nein / ja mit Obergrenze 8 / andere Obergrenze | – | OFFEN |
| E7 | Welche Angaben gelten als geschützt, je Rolle? | Liste mit Datenschutz abstimmen | – | OFFEN |
| E8 | Erscheinungsbild in fünf Ebenen übernehmen? | ja (wie Prototyp) / vereinfacht (Stil + Modus) | – | OFFEN |

## 5. Umsetzung

- **Grundregel für EduKSX-UI (EMPFOHLEN):** Bausteine verwenden nur Variablen (Farben, Flächen, Schatten, Rundung,
  Abstände), nie feste Werte. Ein Stil ist ein Satz Werte, technisch `html[data-stil]` wie in
  `prototypen/gui-ex/assets/gemeinsam.css`.
- **Prüfung (EMPFOHLEN):** automatische Kontrastprüfung je Stil und Hell/Dunkel (Ausbau von `tools/test_kontrast.py`);
  neue Bausteine werden in allen Stilen geprüft (Aufwand wächst mit Stilen × Bausteinen, daher E1 klein halten).
- **Speicherung:** Stil, Hell/Dunkel, Dichte im Benutzerprofil (Core), damit die Wahl auf allen Geräten gilt; ohne
  Anmeldung im Browser. Datenmodell und API erst nach E1/E2 – ZU PRÜFEN.
- **Suche:** ein gemeinsamer Suchdienst über alle Module (Berechtigungen beachten: nur Treffer, die die Person sehen
  darf) – ZU PRÜFEN, Teil von EduKSX-Core.
- **Tabelle:** Bearbeiten in der Zelle braucht Rückgängig, sichtbare ungespeicherte Änderungen und Prüfhinweise je
  Zeile; Barrierefreiheit nach dem Grid-Muster (Pfeiltasten, eine Zelle im Tab-Fokus). Keine neue Bibliothek ohne
  Prüfung von Lizenz und Pflege.
- Aufwand grob: Stile günstig (Werte + Prüfung), Ansichten teuer (je Ansicht eigene Logik) – deshalb wenige
  Ansichten, mehrfach verwendet.

## 6. Issues

| Issue | Inhalt | Status |
|---|---|---|
| #90 | GUI-EX: Varianten A–D | `_3 Beta-Test` |
| #92 | GUI-EX: Stil-Schalter, Variante E, Zeitstrahl mit Fortschritt | `_3 Beta-Test` |
| #93 | GUI-EX: Variante F Tabelle, Suche überall, dieses Konzept | `_3 Beta-Test` |
| #95 | GUI-EX: Variante G Dossier mit Tabs, Dossier-Ansicht und Tab-Regeln | `_3 Beta-Test` |
| #98 | GUI-EX: weitere Stile, Variante F mit Detailbereich, Mini-Grafiken, Statuszeile | `_3 Beta-Test` |
| #100 | GUI-EX: elf weitere Stile, Fenster «Erscheinungsbild» mit fünf Einstellungen | `_3 Beta-Test` |

## 7. Verlauf

- 2026-11-24: Konzept angelegt nach Test von GUI-EX 0.2.0; Beschluss «Konzepte je Art der Arbeit».
- 2026-11-24: Dossier-Ansicht, Regeln für Tabs und Datenschutz in Dossiers ergänzt (G, #95); E6, E7 neu.
- 2026-11-24: Clay weniger rund; fünf weitere Stile und erweiterte Tabelle im Prototyp (#98).
- 2026-11-24: Erscheinungsbild in fünf Ebenen und elf weitere Stile (#100); E8 neu.
