# Prototyp: EduKSX-Flow – Ablaufplanung / Termine und ToDo

**Status:** in-arbeit · **Technik:** html · **Ziel-Modul:** EduKSX-Flow

## Frage

Wie plant eine Schule wiederkehrende Abläufe (Onboarding, Offboarding, Mutationen) als Schritte – und wie ruft jeder
Schritt den passenden Vorgang in einem anderen EduKSX-Modul auf, ohne dass EduKSX-Flow selbst Fachlogik enthält?

## Starten

`index.html` im Browser öffnen. Alle Daten sind erfunden; Aufrufe an andere Module werden simuliert.

## Was der Prototyp zeigt

- **Ablaufvorlagen** mit Schritten: Bezeichnung, verantwortliche Rolle, Frist relativ zum Stichtag (`T−21`),
  Vorgänger («erst nach»), Bedingung (z. B. nur für Klassenlehrpersonen) und genau ein **Aufruf** eines Vorgangs.
  Darstellung als Liste und als **Ablaufbild** (Bahnen je Rolle, Reihenfolge von links nach rechts).
- **Vorgangsregister:** Jedes Modul meldet seine Vorgänge mit Parametern, Ergebnis und Antwortart («sofort» oder
  «mit Rückmeldung»). Flow kennt nur diese Verträge. Module im Prototyp: Core, Ident, Connect, Staffing, Time, Shop.
- **Platzhalter und Verkettung:** Parameter nutzen Kontextfelder (`{person}`, `{stichtag-14}`) und Ergebnisse
  früherer Schritte (`{o5.benutzername}` aus EduKSX-Ident → Zugänge über EduKSX-Connect).
- **Funktionendiagramm:** Ein Schritt kann einer Aufgabe zugeordnet werden; Flow schlägt «V» als verantwortlich und
  «I» als zu informieren vor und warnt bei Abweichungen. Prozessbeschriebe: SV bearbeitet (V), RV gibt frei (E).
- **Prüfung vor Freigabe:** Kreise, fehlende Parameter, unbekannte Platzhalter, Ergebnisse, die noch nicht vorliegen,
  Fristen vor dem Vorgänger, Zuständigkeit gegen Funktionendiagramm.
- **Versionierung:** Änderungen an einer freigegebenen Vorlage ergeben einen Entwurf mit neuer Version; laufende
  Abläufe arbeiten mit der Kopie der Version beim Start.
- **Laufende Abläufe:** Start mit Kontext (Name, Funktion, Stichtag …), Vorschau der Fristen und entfallenden Schritte;
  danach Aufgabenliste je Rolle, automatische Schritte (laufen bei erreichter Frist), Rückmeldungen, Fehler mit
  «Erneut versuchen», Mitteilungen an informierte Rollen, Aufrufprotokoll.
- **Jahreskalender:** Termine und ToDos mit Zuständigkeit (A/E/V/M), Teilaufgaben und Status. Zeitregeln:
  - einmal pro Jahr: Quartal, Kalenderwoche, Datum, Zeitraum (auch «nur 2026»);
  - Schuljahr: Schuljahreswechsel, Schuljahresbeginn, Semesterende (1. oder beide Semester), Semesterwechsel,
    Schuljahresende – jeweils genau oder ± x Tage/Wochen/Monate (z. B. «2 Monate vor Schuljahresende»);
  - wiederkehrend: jedes Trimester, Semester, Quartal (Beginn, Ende oder ganzer Abschnitt, ± Tage), monatlich
    (Tag oder letzter Tag), wöchentlich (Wochentag), täglich, alle Wochentage (Mo–Fr), Wochenende (Sa–So),
    Arbeitstage (Mo–Fr ohne Feiertage Kanton Zürich, Ostern berechnet), Schultage (ohne Ferien und schulfreie Tage);
  - Ferienbeginn und -ende (Herbst-, Weihnachts-, Sport-, Frühlings-, Sommerferien) als Bezugstermine;
  - Ferienregel je Ereignis: fällt ein Termin auf einen Nicht-Schultag → beibehalten, auf den letzten Schultag davor,
    auf den ersten Schultag danach oder auslassen.
  - **Schuljahresdaten** je Schuljahr pflegbar (Schuljahreswechsel, -beginn, Semesterende, Semesterwechsel,
    Schuljahresende, Trimestergrenzen) mit Plausibilitätsprüfung; sie steuern die Schuljahres-, Semester- und
    Trimesterregeln. **Ferien und schulfreie Tage** je Schuljahr pflegbar (Ferien, schulfrei, Anlass), mit Anzahl
    Schultage; Testdaten aus dem öffentlichen Ferienplan der Sekundarschulgemeinde Bülach 2025/26–2028/29 (auf Wunsch
    der Projektleitung, Ausnahme zur Regel «keine echten Schuldaten»). In der Zeitleiste schraffiert. Serien (täglich bis wöchentlich) erscheinen als eine Zeile mit dem nächsten Vorkommen. Ansichten Zeitleiste (Bereiche × Kalenderwochen, Kalender- oder
  Schuljahr), Liste und Quartale (wie die Jahresplanung auf dem Flipchart); Filter nach Bereich, Zuständigkeit, Quelle.
  Ein Ereignis kann mit einer **Ablaufvorlage verknüpft** werden; «Ablauf starten» übernimmt das Datum des Ereignisses
  als Stichtag (Beispiel: Vorlage «Beschaffung Geräte»). Anstehende Termine erscheinen in Übersicht und «Meine Aufgaben».
- **Simulation:** simulierter Tag (+1, +7, nächste Frist), Module als «nicht erreichbar» schalten, Rollenwechsel.

## Grundlagen

- Prozessliste der Arbeitsgruppe (Onboarding, Offboarding, Mutationen, Gruppen) – Schritte und Zuständigkeiten.
- Funktionendiagramm einer Primarschule im Kanton Zürich (Muster), Auszug Personal und ICT.
- Jahresplanung ICT-Prozesse inkl. DigiLex (Stand 27.05.2026, Flipchart der Arbeitsgruppe), Master-Checkliste
  ICT-Jahreszyklus und Jahreskalender einer Fachstelle ICT (Kalenderwochen) – für den Kalender.
- Zielsysteme ohne Hersteller-/Produktnamen (Office-Konto, Schulverwaltungssoftware, Lehrmittelportal, Notfall-App).

## Offene Fragen (ZU PRÜFEN)

- Ab wann dürfen Logins erstellt werden (Prozessliste: offen)? Im Prototyp T−21 bzw. gültig ab T−14.
- Regeln, wann was gesperrt wird (Offboarding): im Prototyp Sperre am Tag nach dem letzten Arbeitstag.
- Welches Modul führt Schlüssel und Geräte (im Prototyp EduKSX-Shop)?
- Vikariate und Schulsozialarbeit (Zugriff auf SuS-Daten) als eigene Vorlagen.
- Jahresplanung: Rolle «LB» (Bezeichnung offen); Zuordnung der Spalten zu den Flow-Rollen (TICTS/PICTS/VT → ICT,
  LB → Ressortvorstand) für «Meine Termine».
- Schuljahresdaten: Semester- und Trimestergrenzen sind Annahmen (Trimester nicht üblich, nur der Vollständigkeit
  halber). Entschieden 2026-11-19: Ferien werden benötigt; «Arbeitstage» bleiben ohne Ferien (Verwaltung),
  «Schultage» ohne Ferien und schulfreie Tage.
- Kalender: Teilaufgaben als eigene Ablaufschritte führen? Automatisch starten, wenn ein verknüpftes Ereignis näher rückt?
- Digitale Aktenführung ab 1.1.2029: Aufrufprotokoll als Teil des Personaldossiers?

## Ergebnis

Noch offen – nach der Abstimmung festhalten, was nach EduKSX-Flow übernommen wird (Vorgangsregister als
Schnittstelle zu den Modulen, Vorlagen-Versionierung, Motor für Fristen und automatische Schritte).

## Hinweise

- Nur erfundene Testdaten verwenden.
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
