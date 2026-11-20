# EduKSX-Time – Anforderungskatalog, Pflichtenheft und Prüfpunkte

Stand: 2026-11-20 · Status: **ENTWURF** · Prototyp [`prototypen/zeiterfassung`](../../../prototypen/zeiterfassung)
(0.3.x) · Datenbank [`datenbank.sql`](datenbank.sql) · API [`openapi.json`](openapi.json)

Stufen wie in [`KONZEPT-VORLAGE.md`](../../KONZEPT-VORLAGE.md); ohne Vermerk gilt **EMPFOHLEN**.

## 1. Zweck und Abgrenzung

EduKSX-Time erfasst die Arbeitszeit der Mitarbeitenden (zuerst Verwaltung, Betreuung, Assistenzen): als
installierbare Mobil-App (PWA) zum Ein- und Ausstempeln, mit Soll aus dem Pensum, Ist und Saldo inkl. gesetzlicher
Pause, Offline-Erfassung und Verlauf. Im Ausbau folgen Abwesenheiten, Korrekturen, Monatsübersicht mit Ferien und
der Monatsabschluss mit Visum.

**Nicht dazu gehören:** Lohnabrechnung, Einsatz- und Pensenplanung (→ EduKSX-Staffing), Stundenplan, Überwachung
von Standort oder Gerät.

## 2. Anforderungskatalog

### 2.1 Fachliche Anforderungen

| ID | Anforderung | Priorität | Herkunft im Prototyp |
|---|---|---|---|
| TIM-F-01 | Stempeln mit grossen Tasten: Kommen → Pause / Gehen → Pause beenden; Buchungsart vor dem Kommen (Arbeitszeit, Homeoffice). | MUSS | Stempeln |
| TIM-F-02 | Status mit laufender Zeit (Block seit Kommen/Pausenende, Gesamtzeit heute), Tagesliste der Buchungen. | MUSS | Startseite, Uhr |
| TIM-F-03 | Soll = Pensum × 8:24 je Arbeitstag (Regel je Mandant), Ist, Saldo heute; Soll-Markierung «noch h:mm · bis hh:mm». | MUSS | Uhr als Tagesachse |
| TIM-F-04 | Gesetzliche Pause: nach 5 h Arbeit 30 Min., zählt nicht als Arbeitszeit; gestempelte Pausen des Tages reduzieren sie, ab 30 Min. entfällt sie. | MUSS (BESCHLOSSEN 2026-11-17, Abgleich Personalrecht ZU PRÜFEN) | Gesetzliche Pause |
| TIM-F-05 | Letzte Buchung 2 Min. lang rückgängig (Storno, nicht löschen). | MUSS | Rückgängig |
| TIM-F-06 | Vergessenes Gehen nachtragen (Kennzeichen «nachgetragen»); Hinweis bei offener Buchung eines früheren Tags. | MUSS | Gehen nachtragen |
| TIM-F-07 | Offline stempeln; Buchungen werden mit Verbindung übertragen, Kennzeichen je Buchung; keine Doppelbuchungen. | MUSS | Offline |
| TIM-F-08 | Verlauf: Woche und letzte 14 Tage mit Zeiten, Ist und Saldo. | MUSS | Verlauf |
| TIM-F-09 | Installierbar (Manifest, Icons, Hinweis iPhone), hell/dunkel, «Bewegung reduzieren» beachtet. | MUSS | PWA |
| TIM-F-10 | Arbeitsmodell je Person (Pensum, Arbeitstage, abweichendes Tagessoll), übernommen aus dem freigegebenen Pensum von EduKSX-Staffing. | MUSS | Person, Pensum |
| TIM-F-11 | Abwesenheiten (Ferien, Krankheit, Unfall, Weiterbildung, Militär, Urlaub) beantragen und bewilligen; Soll gilt als erfüllt. | SOLL | «Folgt» |
| TIM-F-12 | Buchungen korrigieren bzw. ergänzen per Antrag mit Begründung, Bestätigung durch vorgesetzte Person. | SOLL | «Folgt» |
| TIM-F-13 | Monatsübersicht mit Zeitsaldo (Vortrag) und Ferienguthaben. | SOLL | «Folgt» |
| TIM-F-14 | Monat einreichen, Visum der Schulleitung (optional mit EduKSX-Sign), Werte eingefroren. | SOLL | «Folgt» |
| TIM-F-15 | Feiertage Kanton Zürich und Schulferien (aus Core) im Soll berücksichtigen (je Arbeitsmodell). | SOLL | – |
| TIM-F-16 | Teamübersicht für Vorgesetzte: offene Anträge, Monate zum Visieren. | KANN | – |

### 2.2 Nicht fachliche Anforderungen

| ID | Anforderung | Priorität |
|---|---|---|
| TIM-NF-01 | Buchungs-ID wird auf dem Gerät erzeugt; Übertragung idempotent (gleiche ID = gleiche Buchung). | MUSS |
| TIM-NF-02 | Buchungen werden nie überschrieben (Storno/Korrektur mit Verweis) – vollständige Nachvollziehbarkeit. | MUSS |
| TIM-NF-03 | Zeitprüfung: Gerätezeit gegen Serverzeit, Abweichung > 5 Min. wird markiert; keine Buchungen in der Zukunft. | MUSS |
| TIM-NF-04 | Kein Standort, keine Gerätekennung ausser einer App-Installations-ID; keine Leistungsüberwachung. | MUSS |
| TIM-NF-05 | Stempeln < 300 ms Antwort, App startet offline < 1 s. | SOLL |
| TIM-NF-06 | Anmeldung über EduKSX-Ident mit langlebiger, widerrufbarer Sitzung auf dem Handy (Gerät verlieren → Sitzung sperren). | MUSS |

## 3. Pflichtenheft

### 3.1 Architektur

- Laravel-Modul (Repository EduKSX-Time) mit API gemäss [`openapi.json`](openapi.json); PWA mit Service Worker und
  lokaler Warteschlange (IndexedDB statt localStorage) für Offline-Buchungen.
- Berechnung (Ist, gesetzliche Pause, Saldo) als reine Funktion; Referenz ist `prototypen/zeiterfassung/assets/app.js`
  (Konstanten `SOLL_100`, `ZWANG_AB_MIN`, `ZWANG_DAUER_MIN`) bzw. die Ansicht `time.daily_totals`.
- Regeln versioniert je Mandant (`valid_from`), damit eine Änderung (z. B. Pausenstufen nach ArG) vergangene Monate
  nicht verändert.

### 3.2 Zustände

```
aus ──Kommen──► ein ──Pause──► pause ──Pause beenden──► ein ──Gehen──► aus
                 ▲                                            │
                 └─────── (offene Buchung am Vortag) ◄── vergessen ──Gehen nachtragen──► aus
```

### 3.3 Datenmodell

[`datenbank.sql`](datenbank.sql), Schema `time`. Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert (DB-Standard 1.3, siehe [README](../README.md#1-datenbank--konventionen-beschlossen)). Tabellen: `working_time_rules`,
`work_schedules`, `booking_types`, `bookings` (ID vom Gerät, Storno statt Löschen); Ausbau `absence_types`,
`absences`, `booking_corrections`, `vacation_entitlements`, `month_closings`. Ansicht `daily_totals` berechnet
Anwesenheit, Pausen, gesetzliche Pause und Ist je Tag (Beispiel: 7:30–12:00, 12:10–17:00 → 560 Min. anwesend,
10 Min. Pause, 20 Min. gesetzliche Pause, Ist 540 Min.; mit PostgreSQL 16 nachgerechnet).

### 3.4 API

[`openapi.json`](openapi.json) (API-Standard 1.2), eigene Zeiten unter `/api/v1/me/…`: `GET /status`,
`POST /bookings`, `POST /bookings/batch`, `POST /bookings/{id}/cancellation`, `POST /bookings/clock-out-backdate`,
`GET /days/{date}`, `GET /history`; Ausbau `/absences`, `/booking-corrections`, `/month-closings/{month}`
(`…/submission`); Team und Verwaltung unter `/api/v1/org/…` (`/month-closings`, `…/approval`, Entscheide zu
Korrekturen und Abwesenheiten, `/working-time-rules`, `/booking-types`, `/work-schedules`). Webhook
`time.month_closing.changed`.

### 3.5 Rollen und Berechtigungen

| Recht (Scopes) | Mitarbeitende | Schulleitung (vorgesetzt) | Schulverwaltung |
|---|---|---|---|
| Stempeln – `time:bookings.read/.write`, `time:days.read` | eigene | eigene | eigene |
| Anträge – `time:{absences,booking-corrections,month-closings}.write` | eigene | eigene | eigene |
| Visum – `time:{absences,booking-corrections,month-closings}.admin` | – | eigenes Team | – |
| Verwaltung – `time:{working-time-rules,booking-types,work-schedules}.write` | – | – | ✓ |

OFFEN: Wer ist «vorgesetzt» (aus Core-Organisation oder Funktionendiagramm in Flow)?

### 3.6 Schnittstellen

| Partner | Richtung | Inhalt |
|---|---|---|
| EduKSX-Staffing | ← | Pensum/Arbeitsmodell aus `pensumFreigegeben` |
| Core | ← | Personen, Schuljahre, Ferien, Feiertage |
| EduKSX-Sign | ↔ | Monatsvisum als Signaturanfrage (optional) |
| EduKSX-Flow | → | Erinnerungen (Monat einreichen), Ereignis `monatGeaendert` |
| EduKSX-Connect | → | Saldi/Abwesenheiten an Lohn- und Personalsysteme (ZU PRÜFEN) |

### 3.7 Datenübernahme

Aus der heutigen Zeiterfassung (Intranet): Saldovorträge und Ferienguthaben je Person zum Stichtag; keine
Buchungshistorie (OFFEN).

## 4. Prüfpunkte für die produktive Umsetzung

Zusätzlich zu den gemeinsamen Prüfpunkten in [`../README.md`](../README.md#4-gemeinsame-prüfpunkte-alle-module).

| Nr. | Prüfpunkt | Bereich | erledigt |
|---|---|---|---|
| TIM-P-01 | Pausenregel mit dem anwendbaren Personalrecht (kantonales/kommunales Personalrecht, ArG Art. 15) abgeglichen und als Regel hinterlegt. | Recht | ☐ |
| TIM-P-02 | Sollzeit (42-h-Woche, 8:24), Arbeitstage, Feiertage und Behandlung der Schulferien je Personalkategorie geklärt. | Fachlich | ☐ |
| TIM-P-03 | Zeiterfassung ist mit Personalvertretung/Mitarbeitenden besprochen; Zweck (keine Leistungs-/Verhaltensüberwachung) dokumentiert. | Datenschutz | ☐ |
| TIM-P-04 | Aufbewahrungsfrist der Buchungen (ArGV 1 Art. 73: 5 Jahre, ZU PRÜFEN für öffentliches Personal) umgesetzt. | Datenschutz | ☐ |
| TIM-P-05 | Offline-Tests: Flugmodus, mehrere Tage offline, doppelte Übertragung, Uhrzeit des Geräts falsch, App neu installiert. | Tests | ☐ |
| TIM-P-06 | Berechnungstests: Tage über Mitternacht, Zeitumstellung März/Oktober, Pausen vor/nach 5 h, nachgetragenes Gehen, Storno. | Tests | ☐ |
| TIM-P-07 | PWA auf iOS und Android installiert und geprüft (Startbildschirm, Offline, Benachrichtigungen falls genutzt). | Tests | ☐ |
| TIM-P-08 | Gerät verloren: Sitzung serverseitig widerrufbar, lokale Daten verschlüsselt bzw. ohne Personendaten. | Sicherheit | ☐ |
| TIM-P-09 | Übernahme Saldovorträge/Ferien aus dem bisherigen System abgestimmt (Stichtag, Kontrolle durch Schulverwaltung). | Betrieb | ☐ |
| TIM-P-10 | Pilot mit mind. 5 Personen über einen vollen Monat inkl. Monatsabschluss. | Abnahme | ☐ |

## 5. Offene Punkte

1. ZU PRÜFEN: Pausenregel «nach 5 h 30 Min.» gegenüber ArG-Stufen (>5,5 h 15 Min., >7 h 30 Min., >9 h 1 h).
2. OFFEN: Gilt die Zeiterfassung auch für Lehrpersonen (Jahresarbeitszeit, Berufsauftrag) oder nur für Verwaltung,
   Betreuung und Assistenzen?
3. OFFEN: Buchungshistorie aus dem bisherigen System übernehmen?
