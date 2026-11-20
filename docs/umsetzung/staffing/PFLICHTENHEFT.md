# EduKSX-Staffing – Anforderungskatalog, Pflichtenheft und Prüfpunkte

Stand: 2026-11-20 · Status: **ENTWURF** · Prototyp [`prototypen/einsatzplanung`](../../../prototypen/einsatzplanung)
(0.1.x) · Datenbank [`datenbank.sql`](datenbank.sql) · API [`openapi.json`](openapi.json)

Stufen wie in [`KONZEPT-VORLAGE.md`](../../KONZEPT-VORLAGE.md); ohne Vermerk gilt **EMPFOHLEN**. Die fachlichen
Einzelregeln (kantonale Werte, Formeln, Prüfregeln) stehen mit IDs `ST-…` in
[`ANFORDERUNGEN.md`](../../../prototypen/einsatzplanung/ANFORDERUNGEN.md) des Prototyps; dieser Katalog fasst sie
für die Umsetzung zusammen und verweist darauf.

## 1. Zweck und Abgrenzung

EduKSX-Staffing plant den Einsatz von Lehrpersonen und weiteren Mitarbeitenden einer Schule für ein Schuljahr:
Stellen (VZE) nach den kantonalen Vorgaben, Klassen und Unterricht, Pensen und Berufsauftrag, Ressourcen und
Budget, Freigabe durch die Schulleitung und Anstellung durch die Schulverwaltung, Pensenumfrage,
Stellvertretungen, Gespräche und Personaldossier sowie die Tagesstrukturen.

**Nicht dazu gehören:** Schüleradministration, Noten, Stundenplan (Zeiten/Räume), Lohnberechnung, eigene
Benutzerverwaltung (→ EduKSX-Ident), Dokumentablage (→ EduKSX-Sign/Ablage).

## 2. Anforderungskatalog

Priorität: **MUSS** (für den ersten produktiven Einsatz), **SOLL** (erste Ausbaustufe), **KANN** (später).

### 2.1 Fachliche Anforderungen

| ID | Anforderung | Priorität | Herkunft (Prototyp / ANFORDERUNGEN.md) |
|---|---|---|---|
| STF-F-01 | Parameter je Kanton und Schuljahr pflegen (Faktor, Pauschalen, Basiswerte, Korrekturfaktor, Schulleitung, Pool, Höchstzahlen, Netto-Jahresarbeitszeit nach Alter) – mit Quelle und Gültigkeit. | MUSS | Parameter · ST-Z1–Z15, ST-B* |
| STF-F-02 | Stellenplan berechnen: VZE Berufsauftrag, Schulleitung, Gestaltungspool, Koordination Sek, Therapie, DaZ – mit nachvollziehbarem Rechnungsweg und Rechtsgrundlage. | MUSS | Stellenplan und VZE · ST-Z1–Z8 |
| STF-F-03 | Fächer und Lektionentafeln je Schuljahr (WL, Halbklassen, VZE je Klasse, kommunale Lektionen). | MUSS | Klassen · ST-Z12–Z13 |
| STF-F-04 | Klassen mit Jahrgang, Abteilung, Lektionentafel, Schülerzahl, Vorjahresname; Prüfung der Höchstzahl mit Hinweis auf Massnahmen. | MUSS | Klassen · ST-Z14 |
| STF-F-05 | Klassenlehrpersonen je Klasse mit frei aufteilbarem Stundenanteil (Standard 100 h, gleichmässig). | MUSS | Klassen |
| STF-F-06 | Einsätze in vier Gruppen (Klassenlektionen, weitere Lektionen, Sonderpädagogik, Anstellungen) mit Einheit WL/%/WStd, Halbklassen, Semester, abweichendem Faktor, Ressource, Bemerkung. | MUSS | Unterricht und Einsätze |
| STF-F-07 | Zuteilung eines Einsatzes an mehrere Personen; offene Lektionen sichtbar. | MUSS | Unterricht und Einsätze |
| STF-F-08 | Matrix Klasse – Fach – Lehrperson mit Kennzeichnung der Klassenlehrpersonen und Differenz Soll/Ist je Klasse. | SOLL | Klasse – Fach – Lehrperson |
| STF-F-09 | Personen der Planung (Art, kantonal/kommunal/weitere, vereinbarter BG, Vorjahrespensum, Berufseinführung, Fächer); Stammdaten aus EduKSX-Core. | MUSS | Personen und Pensen |
| STF-F-10 | Pensum Soll/Ist je Person in % und Stunden mit Prüfregeln (Mindestpensum, Maximalpensum, Unterrichtsanteil, KLP-Mindestlektionen, Kustodie). | MUSS | Personen und Pensen · ST-P* |
| STF-F-11 | Berufsauftrag: Gefässe je Tätigkeitsbereich (inkl. Flex), Regeln fix/linear mit Sockel, aus Pauschale oder zusätzlich, Ämter und Kustodien mit Soll, Teilnahme mit Abweichung. | MUSS | Berufsauftrag · ST-B* |
| STF-F-12 | Ressourcen mit Budget (Eingabe oder berechnet), Bedarf, Verplant, Saldo und Posten; Sicht Schulleitung / Schulverwaltung / Vergleich. | MUSS | Ressourcen · ST-R* |
| STF-F-13 | Budget-Sperre durch die Schulverwaltung; gesperrte Ressourcen nur noch mit Recht änderbar. | SOLL | Ressourcen |
| STF-F-14 | Freigabe des Pensums je Person und als Sammelfreigabe; der Stand wird eingefroren, Änderungen danach werden erkannt und angezeigt (Vergleich). | MUSS | Freigaben · ST-F* |
| STF-F-15 | Anstellung durch die Schulverwaltung als «erledigt» mit Rückmeldung; Verlauf aller Schritte. | MUSS | Freigaben |
| STF-F-16 | Pensenumfrage: einladen, erinnern, ausfüllen (Weiterbeschäftigung, Wunschpensum, Stufen, Fächer, KLP, Wünsche, Sperrzeiten, freie Tage), einreichen, in die Planung übernehmen. | SOLL | Pensenumfrage |
| STF-F-17 | Stellvertretungen: Ausfall mit Grund, Dauer, WL, Vertretung, Finanzierung, Status; Tagesrapport der gehaltenen Lektionen; Meldung an den Kanton. | SOLL | Stellvertretungen |
| STF-F-18 | Mutationen während des Schuljahrs (Teamteaching, Teilung) mit Begründung und Finanzierung. | SOLL | Stellenplan |
| STF-F-19 | Gespräche (Probezeit, MAB, Unterrichtsbesuch …) planen, Formular vorbereiten, dokumentieren, für die Person freigeben. | SOLL | Personaldossier |
| STF-F-20 | Personaldossier mit Kategorien und Vorlagen; Dokumente in der Ablage, im Dossier nur Verweis. | SOLL | Personaldossier |
| STF-F-21 | Tagesstrukturen: Angebote je Wochentag mit Zeiten und Anmeldungen, Bedarf nach Betreuungsschlüssel und Mindestbesetzung, Freigabe. | KANN | Tagesstrukturen · ST-K* |
| STF-F-22 | Jahresablauf mit Fristen; Fristen als Ereignisse im Jahreskalender von EduKSX-Flow. | SOLL | Abläufe |
| STF-F-23 | Export der Planung (Excel) und Befüllen des VZE-Tools des Volksschulamts im Original (nur Eingabezellen). | MUSS | VZE-Tool (VSA) |
| STF-F-24 | Hilfe mit LPG, LPVO, VVO; Verweise aus Regeln und Parametern führen zur Bestimmung (Quelle künftig EduKSX-Codex). | SOLL | Hilfe und Gesetze · ST-L11 |
| STF-F-25 | Mehrere Schulen und Schuljahre je Mandant; Planung ins Folgejahr übernehmen (Klassen aufsteigen, Personen, Gefässe). | MUSS | Kopfzeile (Schule, Schuljahr) |

### 2.2 Nicht fachliche Anforderungen

| ID | Anforderung | Priorität |
|---|---|---|
| STF-NF-01 | Rollen Schulleitung, Schulverwaltung, Leitung Tagesstrukturen, Mitarbeitende (eigene Umfrage, eigenes Pensum), Administration; Rechte als Matrix (Abschnitt 3.4). | MUSS |
| STF-NF-02 | Anmeldung nur über EduKSX-Ident (OIDC, MFA für Schulleitung/Verwaltung). | MUSS |
| STF-NF-03 | Änderungsprotokoll auf Feldebene; Einsichtsprotokoll für Personaldossier und Gespräche. | MUSS |
| STF-NF-04 | Gleichzeitiges Arbeiten mit Konflikterkennung (ETag/If-Match, `version`). | MUSS |
| STF-NF-05 | Berechnungen (VZE, Pensum, Saldo) serverseitig und deterministisch; gleiche Eingaben → gleiche Ergebnisse wie im Prototyp (Referenztests). | MUSS |
| STF-NF-06 | Antwortzeit Übersichten < 1 s bei 100 Personen / 30 Klassen; Berechnung Stellenplan < 300 ms. | SOLL |
| STF-NF-07 | Barrierefreiheit WCAG 2.1 AA; CI MarKusSXCH; hell/dunkel. | MUSS |
| STF-NF-08 | Datenhaltung in der Schweiz; Mandantentrennung technisch durchgesetzt (Row-Level-Security). | MUSS |
| STF-NF-09 | Begriffe über EduKSX-Glossary (feste Version mit Prüfsumme). | SOLL |

## 3. Pflichtenheft

### 3.1 Architektur

- Laravel-Modul nach EduKSX-Core (Repository EduKSX-Staffing), REST-API gemäss [`openapi.json`](openapi.json),
  Oberfläche als eigenständige Web-App, die nur die API benutzt.
- Berechnungskern (VZE, Pensum, Berufsauftrag, Ressourcen, Prüfregeln) als reine Funktionen in einer eigenen
  Klasse/Bibliothek mit Referenztests; die Formeln aus `prototypen/einsatzplanung/assets/app.js` werden 1:1
  übernommen und gegen die Testdaten des Prototyps geprüft.
- Parameter versioniert je Schuljahr – Berechnungen eines vergangenen Schuljahrs bleiben unverändert.

### 3.2 Datenmodell

[`datenbank.sql`](datenbank.sql), Schema `staffing`. Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert (DB-Standard 1.3, siehe [README](../README.md#1-datenbank--konventionen-beschlossen)). Kernpunkte:

| Bereich | Tabellen | Hinweis |
|---|---|---|
| Grundlagen | `planning_parameters`, `planning_parameter_age_bands`, `staffing_plans`, `staffing_plan_coordinations`, `subjects`, `lesson_tables`, `lesson_table_subjects`, `deadlines` | Parameter je Schuljahr, nie überschreiben |
| Personen | `staff_members`, `staff_member_subjects` | Verweis auf `users` (Personenreferenz); Geburtsdatum nur dort, wo das Altersband es braucht |
| Unterricht | `classes`, `class_teachers`, `assignments`, `assignment_allocations`, `resources` | ein Einsatz = ein Gefäss der Planung |
| Berufsauftrag | `job_duties`, `job_duty_participants` | Stunden je Person berechnet |
| Freigaben | `releases` (Stand als JSON eingefroren), `planning_events` | Vergleich Stand ↔ aktuell |
| Umfrage, Stellvertretung | `workload_surveys`, `absences`, `absence_reports`, `mid_year_changes` | |
| Dossier | `staff_reviews`, `dossier_categories`, `dossier_templates`, `dossier_entries` | besonders schützenswert, Einsichtsprotokoll |
| Tagesstrukturen | `care_offerings` | |
| Ansichten | `staff_member_totals`, `resource_usages`, `assignment_open_amounts` | Grundlage für Übersichten |

### 3.3 API

[`openapi.json`](openapi.json) (API-Standard 1.2): Ressourcen unter `/api/v1/org/…` (Liste, Anlegen, Lesen, Ändern,
Löschen in den Papierkorb) und Fachaktionen – `GET …/staffing-plans/{id}/calculation`, `POST …/budget-lock`,
`GET …/staff-members/{id}/workload`, `GET …/workloads`, `GET …/checks`, `GET …/matrix`,
`POST …/staff-members/{id}/release`, `POST …/releases/bulk`, `POST …/releases/{id}/employment`,
`GET …/releases/{id}/comparison`, `POST …/workload-surveys/invitations`, `POST …/absences/{id}/reports`,
`POST …/exports/vze-tool`; für die Person selbst `GET /api/v1/me/workload-survey` und `…/submission`.
Ereignisse (Webhooks): `staffing.release.created`, `staffing.release.employed`, `staffing.release.changed`.

### 3.4 Rollen und Berechtigungen

| Recht (Scopes) | Schulleitung | Schulverwaltung | Leitung TS | Mitarbeitende | Administration |
|---|---|---|---|---|---|
| Lesen – `staffing:*.read` | ✓ | ✓ | ✓ (TS) | nur eigene Daten | ✓ |
| Planen – `staffing:{classes,assignments,job-duties,resources,staff-members,…}.write` | ✓ | – | – | – | – |
| Freigeben – `staffing:releases.write` | ✓ | – | – | – | – |
| Anstellen – `staffing:releases.admin` | – | ✓ | – | – | – |
| Parameter – `staffing:planning-parameters.write`, `staffing:staffing-plans.write` | – | ✓ | – | – | ✓ |
| Dossier – `staffing:{staff-reviews,dossier-entries}.read/.write` | ✓ (eigene Schule) | ✓ (Anstellung) | – | eigene, freigegebene | – |
| Umfrage – `staffing:workload-surveys.write` (eigene über `/api/v1/me/…`) | – | – | – | eigene | – |
| Tagesstrukturen – `staffing:care-offerings.write` | – | – | ✓ | – | – |

OFFEN: Teilrechte (Stufenleitung), Rechte je Schule innerhalb eines Mandanten.

### 3.5 Schnittstellen und Ereignisse

| Partner | Richtung | Inhalt |
|---|---|---|
| EduKSX-Core / Ident | ← | Personen, Organisation, Schuljahre, Rollen, Anmeldung |
| EduKSX-Flow | → | `pensumFreigegeben` startet Abläufe (Anstellung, Onboarding); Fristen als Kalenderereignisse; Vorgänge `staffing.*` im Vorgangsregister |
| EduKSX-Time | → | Soll-Arbeitszeit aus dem freigegebenen Pensum |
| EduKSX-Sign | ↔ | Unterschrift für Stellvertretungs- und Gesprächsdokumente; Dossier verweist auf Dokumente |
| EduKSX-Codex | ← | Gesetzestexte für die Hilfe (statt eingebetteter Kopie) |
| EduKSX-Connect | → | Pensen/Anstellungen an Lohn- und Personalsysteme, Meldungen an den Kanton (ZU PRÜFEN) |

### 3.6 Berechnungsregeln

Massgeblich sind die Regeln `ST-Z*`, `ST-P*`, `ST-B*`, `ST-R*` in ANFORDERUNGEN.md. Umsetzung:
Semesterfächer zählen halb, Halbklassen verdoppeln die Lehrpersonen-Lektionen, Faktor je Einsatz überschreibt
den Standardfaktor, lineare Gefässe nach Sockel/«Sockel bis»/«gesamt ab» (OFFEN, siehe Frage 7 dort).

### 3.7 Datenübernahme

- Parameter des Kantons Zürich aus dem Prototyp als Startwerte, vor dem Einsatz gegen die Originaldokumente prüfen.
- Planung aus dem Prototyp (localStorage-JSON) als Importformat für Pilotschulen (KANN).
- Folgejahr: Klassen aufsteigen lassen, Personen/Gefässe übernehmen, Zuteilungen optional.

### 3.8 Betrieb

Sicherung täglich, Aufbewahrung nach Schuljahren; Dossierdaten mit eigener Aufbewahrungsfrist je Kategorie.

## 4. Prüfpunkte für die produktive Umsetzung

Zusätzlich zu den gemeinsamen Prüfpunkten in [`../README.md`](../README.md#4-gemeinsame-prüfpunkte-alle-module).

| Nr. | Prüfpunkt | Bereich | erledigt |
|---|---|---|---|
| STF-P-01 | Alle kantonalen Parameter des ersten Schuljahrs mit Originaldokument (Weisung VZE, LPVO, VSV) abgeglichen und mit Quelle hinterlegt. | Fachlich | ☐ |
| STF-P-02 | Referenztests: Stellenplan, Pensen, Ressourcen und Prüfregeln liefern für die Testdaten des Prototyps dieselben Werte. | Tests | ☐ |
| STF-P-03 | VZE-Tool des VSA (aktuelle Version) per Rundreise geprüft: einlesen, leeren, befüllen, neu berechnen, vergleichen. | Fachlich | ☐ |
| STF-P-04 | Freigabe friert den Stand ein; jede Änderung danach wird erkannt und der Schulverwaltung gemeldet. | Tests | ☐ |
| STF-P-05 | Rechte-Matrix getestet: Mitarbeitende sehen nur eigene Daten; Dossier nur mit `staffing:dossier`; Einsichtsprotokoll schreibt jeden Zugriff. | Sicherheit | ☐ |
| STF-P-06 | Aufbewahrungs- und Löschfristen für Personaldossier, Gespräche, Umfragen und Ausfälle festgelegt (Archivgesetz, Personalrecht) und umgesetzt. | Datenschutz | ☐ |
| STF-P-07 | Gesundheitsangaben (Ausfallgrund Krankheit/Unfall) nur als Kategorie, keine Diagnosen; Zugriff eingeschränkt. | Datenschutz | ☐ |
| STF-P-08 | Folgejahr-Übernahme mit einer Pilotschule durchgespielt. | Fachlich | ☐ |
| STF-P-09 | Ereignis `pensumFreigegeben` von EduKSX-Flow und EduKSX-Time empfangen und verarbeitet. | Schnittstellen | ☐ |
| STF-P-10 | Pilot mit mindestens einer Sekundarschule über eine vollständige Planungsrunde (Umfrage bis Anstellung). | Abnahme | ☐ |

## 5. Offene Punkte

Siehe «Offene Fragen» in ANFORDERUNGEN.md (Parameterpflege, Teilrechte, Dossier als eigenes Modul,
Signaturstufe, Lohnsysteme, Tagesstrukturen, lineare Gefässe). Zusätzlich:

1. OFFEN: Soll `einsatz` für Anstellungen (%, WStd) getrennt von Unterricht (WL) geführt werden?
2. ZU PRÜFEN: Welche Daten meldet die Schule elektronisch an den Kanton, und in welchem Format?
