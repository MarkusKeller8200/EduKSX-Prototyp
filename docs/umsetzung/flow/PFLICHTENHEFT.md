# EduKSX-Flow – Anforderungskatalog, Pflichtenheft und Prüfpunkte

Stand: 2026-11-20 · Status: **ENTWURF** · Prototyp [`prototypen/ablaufplanung`](../../../prototypen/ablaufplanung)
(0.7.x, Stufe 1 der Engine nach [`KONZEPT-FLOW.md`](../../KONZEPT-FLOW.md)) · Datenbank [`datenbank.sql`](datenbank.sql) · API [`openapi.json`](openapi.json)

Stufen wie in [`KONZEPT-VORLAGE.md`](../../KONZEPT-VORLAGE.md); ohne Vermerk gilt **EMPFOHLEN**.

## 1. Zweck und Abgrenzung

EduKSX-Flow plant wiederkehrende Abläufe einer Schule (Personal, Lernende, Behörden, Finanzen, Infrastruktur, ICT)
als Schritte mit Rolle, Frist ab Stichtag, Vorgängern, Bedingung und Quelle. Jeder Schritt ruft **genau einen
Vorgang** eines anderen Moduls auf – Flow enthält keine Fachlogik, es plant, verteilt Aufgaben und hält fest, was
wann geschehen ist. Dazu kommt der **Jahreskalender** mit Zeitregeln nach Schuljahr, Semester, Ferien und
Arbeitstagen.

**Nicht dazu gehören:** Fachlogik der Module (Konten, Pensen, Dossiers …), Dokumentablage, E-Mail-Versand (über
Core/Mitteilung), Rechtsauskunft (Quellen verweisen auf EduKSX-Codex).

## 2. Anforderungskatalog

### 2.1 Fachliche Anforderungen

| ID | Anforderung | Priorität | Herkunft im Prototyp |
|---|---|---|---|
| FLW-F-01 | Ablaufvorlagen mit Code, Titel, Gruppe, Stichtagname, Beschreibung und Startfeldern (Text, Zahl, Datum, Auswahl, Person). | MUSS | Ablaufvorlagen |
| FLW-F-02 | Schritte mit Titel, verantwortlicher Rolle, Frist relativ zum Stichtag (`T−21`), Vorgängern, Bedingung, zu informierenden Rollen, Nummer im Funktionendiagramm. | MUSS | Vorlage › Schritte |
| FLW-F-03 | **Quellenangabe bei jedem Schritt** (Gesetz/Paragraf, Merkblatt, interne Grundlage) mit Quellenverzeichnis je Vorlage. | MUSS (BESCHLOSSEN) | Quellen |
| FLW-F-04 | Ein Schritt ruft höchstens einen Vorgang aus dem Vorgangsregister auf; Parameter mit Platzhaltern aus Startfeldern, Datumsrechnung (`{stichtag-14}`) und Ergebnissen früherer Schritte (`{o5.benutzername}`). | MUSS | Vorgänge, Platzhalter |
| FLW-F-05 | Vorgangsregister: jedes Modul meldet Vorgänge mit Parametern, Ergebnis und Antwortart (sofort / mit Rückmeldung). | MUSS | Vorgänge der Module |
| FLW-F-06 | Prüfung vor Freigabe: Kreise, fehlende Parameter, unbekannte Platzhalter, Ergebnisse noch nicht vorhanden, Frist vor Vorgänger, Rolle gegen Funktionendiagramm (V/I). | MUSS | Vorlage › Prüfung |
| FLW-F-07 | Versionierung: Änderungen an freigegebener Vorlage ergeben einen Entwurf mit neuer Version; freigeben durch berechtigte Rolle (SV bereitet vor, RV gibt frei). | MUSS | Versionierung |
| FLW-F-08 | Ablaufbild (Bahnen je Rolle, Reihenfolge) zu jeder Vorlage. | SOLL | Ablaufbild |
| FLW-F-09 | Ablauf starten mit Kontext und Stichtag; Vorschau mit Fristen und entfallenden Schritten; Ablauf arbeitet mit Kopie der Vorlage. | MUSS | Ablauf starten |
| FLW-F-10 | Motor: Schritt wird «bereit», wenn Vorgänger erledigt sind; automatische Schritte laufen bei erreichter Frist; Rückmeldungen schliessen Schritte ab; Fehler mit «Erneut versuchen». | MUSS | Laufende Abläufe |
| FLW-F-11 | Meine Aufgaben je Rolle/Person mit Frist und Überfälligkeit; Schritte erledigen, überspringen (mit Begründung), Frist/Zuständigkeit ändern. | MUSS | Meine Aufgaben |
| FLW-F-12 | Hinweise an informierte Rollen (Start, Abschluss, Fehler). | SOLL | Hinweise |
| FLW-F-13 | Aufrufprotokoll mit aufgelösten Parametern, Antwort, Status, Auslöser – nachvollziehbar und unveränderbar. | MUSS | Aufrufprotokoll |
| FLW-F-14 | Funktionendiagramm pflegen (Nummer, Aufgabe, Kompetenz je Rolle); Vorschläge und Warnungen in der Vorlage. | SOLL | Funktionendiagramm |
| FLW-F-15 | Jahreskalender: Ereignisse mit Bereich, Beteiligung je Rolle (A/E/V/M), Teilaufgaben, Quelle, Notiz, Erledigt je Vorkommen. | MUSS | Jahreskalender |
| FLW-F-16 | Zeitregeln: jährlich (Quartal, KW, Datum, Zeitraum, «nur Jahr»), Schuljahresanker ± Tage/Wochen/Monate, Ferienanker, Trimester/Semester/Quartal (Beginn, Ende, ganz ± Tage), monatlich, wöchentlich, täglich, Wochentage, Wochenende, Arbeitstage (Feiertage ZH, Ostern berechnet), Schultage. | MUSS | Zeitregeln |
| FLW-F-17 | Ferienregel je Ereignis: beibehalten, letzter Schultag davor, erster danach, auslassen. | MUSS | Ferienregel |
| FLW-F-18 | Schuljahresdaten und Ferien/schulfreie Tage je Schuljahr pflegen (in EduKSX-Core) mit Plausibilitätsprüfung. | MUSS | Schuljahre |
| FLW-F-19 | Ansichten Zeitleiste (Bereiche × KW, Kalender- oder Schuljahr), Liste, Quartale; Filter nach Bereich, Rolle, Quelle, Regel, «nur offen», «nur mit Ablauf». | SOLL | Kalender-Ansichten |
| FLW-F-20 | Ereignis mit Ablaufvorlage verknüpfen; «Ablauf starten» übernimmt das Datum des Vorkommens als Stichtag. | MUSS | Verknüpfung |
| FLW-F-21 | Abläufe automatisch starten durch Ereignisse anderer Module (Datensatz erstellt/geändert, Status geändert, z. B. «Anstellung genehmigt» → Onboarding), durch Termine im Jahreskalender (Start, sobald der erste Schritt fällig wird) und durch den Abschluss eines anderen Ablaufs; doppelte Starts werden protokolliert statt ausgeführt. | MUSS | Auslöser |
| FLW-F-22 | Kalender als iCalendar-Abo je Rolle. | KANN | – |
| FLW-F-23 | 45 Ablaufvorlagen des Prototyps als Startpaket (nach Prüfung der Quellen «ZU PRÜFEN»). | SOLL | Vorlagen |
| FLW-F-24 | Arten von Schritten: Aufgabe, Aufruf an Modul, Genehmigung (Ablehnung mit Begründung), Entscheidung (Möglichkeiten), Nachweis, Termin, Warten bis Frist, Benachrichtigung, Unterprozess. | MUSS | Vorlage › Schritt (Art) |
| FLW-F-25 | Verzweigung: Bedingung auf das Ergebnis eines früheren Schritts; entfällt ein Zweig, entfallen die Schritte, die nur auf ihn warten. Prüfung: der entscheidende Schritt muss Vorgänger sein. | MUSS | Zweige |
| FLW-F-26 | Unterprozess startet eine freigegebene Vorlage mit übernommenen Startwerten und schliesst den Schritt bei deren Abschluss ab; Kreise werden bei der Prüfung erkannt. | MUSS | Unterprozess |
| FLW-F-27 | Fristarten gesetzlich (Quelle mit Paragraf Pflicht), intern, Empfehlung; Eskalationsstufen je Fristart (Erinnerung, überfällig, vorgesetzte Stelle, Leitung); blockierte Schritte mit abgelaufener Frist als «Frist gefährdet». | MUSS | Fristen, Eskalation |
| FLW-F-28 | Eingriffe durch Prozessverantwortliche mit Begründung: pausieren/fortsetzen, abbrechen (Unterprozesse mit, Kompensationshinweis für ausgeführte Aufrufe), Stichtag verschieben, Schritt überspringen, wieder öffnen (ohne automatische Wiederholung), Zuständigkeit ändern, Schritt einfügen. | MUSS | Eingriffe |
| FLW-F-29 | Journal je Ablauf (Start, Entscheide, Unterprozesse, Eskalationen ab Stufe 3, Eingriffe) getrennt vom Aufrufprotokoll. | MUSS | Journal |
| FLW-F-31 | Einstellungen: Kataloge Kompetenzen, Funktionen (gruppiert), Zeitpunkte, Intervalle, Aufgabenbereiche (Haupt- und Unterbereiche) mit Kürzel, Bezeichnung, Beschreibung, Aktiv; verwendete Einträge nur deaktivieren. Datenmodell ZU PRÜFEN: in EduKSX-Core bzw. eigenem Modul (Konzept E15). | SOLL | Einstellungen |
| FLW-F-30 | Auslöseprotokoll mit Quelle, Vorlage, Ergebnis (gestartet, doppelt, ohne Ablauf). | SOLL | Auslöser |

### 2.2 Nicht fachliche Anforderungen

| ID | Anforderung | Priorität |
|---|---|---|
| FLW-NF-01 | Motor läuft serverseitig als geplanter Job (mind. alle 15 Min. und bei jedem Ereignis); idempotent, kein Schritt wird doppelt ausgelöst. | MUSS |
| FLW-NF-02 | Aufrufe an Module mit Zeitlimit, Wiederholung mit Backoff, Idempotenzschlüssel (Aufruf-ID); Modul-Ausfall blockiert nur betroffene Schritte. | MUSS |
| FLW-NF-03 | Aufrufprotokoll nur anhängend (append-only), Aufbewahrung gemäss Aktenführung (ab 1.1.2029 digital, ZU PRÜFEN). | MUSS |
| FLW-NF-04 | Vorkommen-Berechnung für ein Jahr < 500 ms bei 200 Ereignissen. | SOLL |
| FLW-NF-05 | Zeitzone Europe/Zurich, Feiertage Kanton Zürich berechnet und je Gemeinde ergänzbar. | MUSS |
| FLW-NF-06 | Rollen aus EduKSX-Ident; Aufgaben nur für eigene Rollen sichtbar, Übersicht für Schulverwaltung/Schulleitung. | MUSS |

## 3. Pflichtenheft

### 3.1 Architektur

- Laravel-Modul (Repository EduKSX-Flow) mit drei Teilen: **Vorlagen/Register** (CRUD, Prüfung, Versionierung),
  **Motor** (Queue-Worker + Scheduler; Zustandsautomat je Schritt), **Kalender** (Vorkommen-Berechnung als reine
  Funktion, Ergebnis zwischengespeichert je Jahr).
- Aufrufe an Module über deren API gemäss Vorgangsregister (`vorgangAufrufen`); Antwortart «rueckmeldung» → Schritt
  `laeuft`, Abschluss über `POST /api/v1/org/operation-calls/callback`.
- Kalenderlogik aus `prototypen/ablaufplanung/assets/kalender.js` als Referenz übernehmen (gleiche Testfälle).

### 3.2 Zustandsautomat eines Schritts

```
wartet ──(Vorgänger erledigt/übersprungen, Bedingung erfüllt)──► bereit ──(automatisch & Frist erreicht)──► laeuft
   │                                                             │ manuell erledigen                       │
   └─(Bedingung nicht erfüllt)─► uebersprungen                    ▼                                         ▼
                                                               erledigt ◄──(Rückmeldung ok)── laeuft ──(Fehler)──► fehler ─(wiederholen)─► laeuft
```

`geplant` = bereit, aber Frist noch nicht erreicht (automatische Aufrufe, Warten, Benachrichtigung). Ein Ablauf ist
abgeschlossen, wenn alle Schritte erledigt oder übersprungen sind.

Ergänzungen Stufe 1 (Referenz: `motor()` in `prototypen/ablaufplanung/assets/app.js`):

- Bedingung auf ein Kontextfeld → sofort `uebersprungen` (Nachfolger laufen weiter). Bedingung auf ein Ergebnis →
  `wartet`, bis der entscheidende Schritt erledigt ist; trifft sie nicht zu → `uebersprungen` mit `is_branch_skipped`;
  ein Schritt, dessen Vorgänger **alle** so übersprungen sind, entfällt ebenfalls.
- Unterprozess: beim Bereitwerden Kind-Ablauf starten → `laeuft`; Kind abgeschlossen → `erledigt`, Kind abgebrochen →
  `fehler`. Warten: bei erreichter Frist `erledigt`. Benachrichtigung: bei erreichter Frist Hinweis an Rolle und
  Informierte, `erledigt`.
- Ablauf `paused`: Motor und Eskalation ruhen. Ablauf `cancelled`: offene Schritte `cancelled`.
- Nach «wieder öffnen» gilt `is_manual_only`: ein automatischer Aufruf läuft nicht ein zweites Mal von selbst.

### 3.3 Datenmodell

[`datenbank.sql`](datenbank.sql), Schema `flow`. Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert (DB-Standard 1.3, siehe [README](../README.md#1-datenbank--konventionen-beschlossen)). Tabellen: `roles`, `role_calendar_roles`,
`responsibility_tasks`, `responsibility_task_roles`, `sources`, `modules`, `module_operations`, `templates`
(+ `template_fields`, `template_steps`, `template_step_predecessors`, `template_step_informed_roles`), `runs`,
`run_steps` (Kopie + Zustand), `operation_calls`, `notices`, `module_events`, `template_triggers`,
`escalation_rules`, `run_journal_entries`, `trigger_events`, `calendar_areas`, `calendar_events` (Zeitregel als
JSON), `calendar_event_roles`, `calendar_event_tasks`, `calendar_completions`. Schuljahre und Ferien in den
Standardtabellen `school_years`, `school_holidays`.

### 3.4 API

[`openapi.json`](openapi.json) (API-Standard 1.2): `GET /api/v1/me/tasks`, `GET /api/v1/org/overview`, Vorlagen
(CRUD, `…/release`, `…/copy`, `…/diagram`), `POST /api/v1/org/runs/preview`, `POST /api/v1/org/runs`,
Schrittaktionen (`…/steps/{code}/completion`, `…/skip`, `…/retry`, `PATCH`), `GET /api/v1/org/operation-calls`,
`POST …/operation-calls/callback`, Register (`/api/v1/org/modules`, `…/check`), Kalender
(`/api/v1/org/calendar-events`, `/api/v1/org/calendar-occurrences`, `…/completion`, `…/run`, `…/export`).
Stufe 1: `…/runs/{id}/pause`, `…/resume`, `…/reference-date`, `POST …/runs/{id}/steps` (einfügen),
`…/steps/{code}/reopen`, `POST /api/v1/org/module-events` (Ereignis eines Moduls), `GET /api/v1/org/trigger-events`.
Webhooks: `flow.operation.invoked` (an Module), `flow.run.completed`, `flow.step.escalated`.

### 3.5 Rollen und Berechtigungen

| Recht (Scopes) | Schulverwaltung | Schulleitung | Ressortvorstand | Mitarbeitende | Module (technisch) |
|---|---|---|---|---|---|
| Lesen – `flow:*.read` | ✓ | ✓ | ✓ | eigene Aufgaben | – |
| Bearbeiten – `flow:runs.write`, `flow:notices.write` | ✓ | ✓ | ✓ | eigene Aufgaben | – |
| Vorlagen – `flow:templates.write`, freigeben `flow:templates.admin` | bearbeiten (V) | bearbeiten | freigeben (E) | – | – |
| Register – `flow:modules.write`, `flow:operation-calls.write` | – | – | – | – | ✓ (Client-Credentials) |
| Verwaltung – `flow:{roles,responsibility-tasks,sources,calendar-events}.write`, `flow:modules.admin` | ✓ | – | – | – | – |

### 3.6 Schnittstellen

| Partner | Richtung | Inhalt |
|---|---|---|
| alle Module | ↔ | Vorgangsregister melden (`/api/v1/org/modules`), Aufrufe empfangen, Rückmeldungen senden |
| EduKSX-Staffing | ← | Ereignisse «Anstellung genehmigt», «Austritt erfasst», «Pensum geändert» starten Abläufe (`module-events`); Fristen als Kalenderereignisse |
| EduKSX-Ident / Connect | → | Konten, Zugänge, Sperren (Vorgänge `ident.*`, `connect.*`) |
| EduKSX-Sign | ↔ | Signaturanfrage als Vorgang mit Rückmeldung |
| EduKSX-Codex | ← | Quellen verlinken auf Erlass und Fassung (`codex_ref`) |
| Core | ← | Personen, Rollen, Schuljahre, Ferien; Mitteilungen senden |

### 3.7 Datenübernahme

Vorlagen, Funktionendiagramm, Quellenverzeichnis, Kalenderereignisse und Schuljahre aus `assets/daten.js`,
`vorlagen.js`, `kalender.js` per Importskript; Quellen mit Status «ZU PRÜFEN» vor Freigabe der Vorlage klären.

## 4. Prüfpunkte für die produktive Umsetzung

Zusätzlich zu den gemeinsamen Prüfpunkten in [`../README.md`](../README.md#4-gemeinsame-prüfpunkte-alle-module).

| Nr. | Prüfpunkt | Bereich | erledigt |
|---|---|---|---|
| FLW-P-01 | Alle Quellen mit «ZU PRÜFEN» (42 Schritte im Prototyp) fachlich geklärt; jede freigegebene Vorlage hat bei jedem Schritt eine gültige Quelle. | Fachlich | ☐ |
| FLW-P-02 | Vorlagen der Personalabläufe mit Schulverwaltung und Ressortvorstand abgenommen (Funktionendiagramm der Gemeinde). | Fachlich | ☐ |
| FLW-P-03 | Zeitregeln mit Referenztests aus dem Prototyp (alle Regelarten, Ferienregel, Schaltjahr, Ostern, Jahreswechsel) grün. | Tests | ☐ |
| FLW-P-04 | Motor: Doppelauslösung ausgeschlossen (paralleler Worker, Neustart), Fehler und Wiederholung getestet, Modul-Ausfall simuliert. | Tests | ☐ |
| FLW-P-05 | Jedes angebundene Modul hat seine Vorgänge im Register gemeldet; Vertragstests (Parameter/Ergebnis) je Vorgang grün. | Schnittstellen | ☐ |
| FLW-P-06 | Aufrufprotokoll enthält keine unnötigen Personendaten (nur Verweise und benötigte Parameter); Aufbewahrungsfrist festgelegt. | Datenschutz | ☐ |
| FLW-P-07 | Offene Fragen der Prozessliste entschieden (Zeitpunkt Login, Sperrregeln Offboarding, Modul für Schlüssel/Geräte). | Fachlich | ☐ |
| FLW-P-08 | Schuljahres- und Feriendaten des Mandanten erfasst und geprüft (keine Testdaten der Sek Bülach bei anderen Mandanten). | Betrieb | ☐ |
| FLW-P-09 | Pilot: ein Eintritt und ein Austritt einer Lehrperson vollständig über Flow mit echten Modulaufrufen. | Abnahme | ☐ |
| FLW-P-10 | Stufe 1: Zweige, Unterprozess (inkl. Abbruch), Pause, Stichtag verschieben, Wiederöffnen ohne Doppelaufruf, doppelter Auslöser mit den Szenarien des Prototyps getestet. | Tests | ☐ |
| FLW-P-11 | Einstufung gesetzlicher Fristen und Eskalationsstufen fachlich abgenommen (Konzept E6, E12). | Fachlich | ☐ |

## 5. Offene Punkte

Siehe «Offene Fragen» im README des Prototyps. Zusätzlich:

1. EMPFOHLEN (Konzept E7): Automatischer Start aus Kalenderereignissen, sobald der erste Schritt fällig wird.
4. OFFEN: Entscheide E4–E13 in [`KONZEPT-FLOW.md`](../../KONZEPT-FLOW.md) (u. a. wer eingreifen darf, Eskalationsstufen).
2. OFFEN: Teilaufgaben im Kalender als eigene Ablaufschritte?
3. ZU PRÜFEN: Gehört das Aufrufprotokoll zum Personaldossier (digitale Aktenführung ab 2029)?
