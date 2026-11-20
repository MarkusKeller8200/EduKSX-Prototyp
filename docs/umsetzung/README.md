# Umsetzungsgrundlagen der Module

Stand: 2026-11-20 · Status: **ENTWURF** – Entscheidungsgrundlage, keine Freigabe (Stufen wie in
[`KONZEPT-VORLAGE.md`](../KONZEPT-VORLAGE.md): BESCHLOSSEN, EMPFOHLEN, OFFEN, ZU PRÜFEN).

Für jeden Prototyp liegt hier, was die produktive Umsetzung im jeweiligen Modul-Repository braucht:

| Modul | Prototyp | Datenbank | API | Anforderungen · Pflichtenheft · Prüfpunkte |
|---|---|---|---|---|
| EduKSX-Staffing | [`einsatzplanung`](../../prototypen/einsatzplanung) | [`staffing/datenbank.sql`](staffing/datenbank.sql) | [`staffing/openapi.yaml`](staffing/openapi.yaml) | [`staffing/PFLICHTENHEFT.md`](staffing/PFLICHTENHEFT.md) |
| EduKSX-Flow | [`ablaufplanung`](../../prototypen/ablaufplanung) | [`flow/datenbank.sql`](flow/datenbank.sql) | [`flow/openapi.yaml`](flow/openapi.yaml) | [`flow/PFLICHTENHEFT.md`](flow/PFLICHTENHEFT.md) |
| EduKSX-Codex | [`rechtssammlung`](../../prototypen/rechtssammlung) | [`codex/datenbank.sql`](codex/datenbank.sql) | [`codex/openapi.yaml`](codex/openapi.yaml) | [`codex/PFLICHTENHEFT.md`](codex/PFLICHTENHEFT.md) |
| EduKSX-Sign | [`signatur`](../../prototypen/signatur) | [`sign/datenbank.sql`](sign/datenbank.sql) | [`sign/openapi.yaml`](sign/openapi.yaml) | [`sign/PFLICHTENHEFT.md`](sign/PFLICHTENHEFT.md) |
| EduKSX-Time | [`zeiterfassung`](../../prototypen/zeiterfassung) | [`time/datenbank.sql`](time/datenbank.sql) | [`time/openapi.yaml`](time/openapi.yaml) | [`time/PFLICHTENHEFT.md`](time/PFLICHTENHEFT.md) |

Grundlage ist jeweils, **was der Prototyp anzeigt und bearbeitet** (Testdaten in `assets/daten.js`, Zustand im
Browser-Speicher). Jedes angezeigte Feld hat eine Spalte; berechnete Werte (Ist-Pensum, Saldo, Fristen …) werden
**nicht** gespeichert, sondern über Ansichten (`v_…`) oder in der API berechnet – ausser sie müssen zu einem
Zeitpunkt eingefroren werden (Freigaben, Abschlüsse, Protokolle).

Die Prototypen bleiben unabhängig (AGENTS.md): Diese Dateien sind Vorlagen für die Modul-Repositorys, kein
gemeinsamer Code. Übernommene Teile werden dort als Laravel-Migrationen und Controller neu umgesetzt.

## 1. Datenbank – Konventionen (EMPFOHLEN)

| Thema | Vorschlag |
|---|---|
| System | PostgreSQL 16 (Laravel-tauglich); die Skripte laufen ohne Erweiterungen (`gen_random_uuid()` ist eingebaut). OFFEN: ob EduKSX-Core MariaDB vorgibt – dann JSONB → JSON, Schemas → Tabellenpräfix. |
| Schemas | ein Schema je Modul (`staffing`, `flow`, `codex`, `sign`, `time`); gemeinsame Stammdaten im Schema `core` (gehört EduKSX-Core). |
| Namen | Deutsch, `snake_case`, Tabellen im Singular (`staffing.klasse`), Fremdschlüssel `<tabelle>_id`. |
| Schlüssel | `id uuid` (technisch, nie angezeigt); fachliche Kürzel (Klasse «1A», Fach «D», Vorlage «EIN-LP») als `kurz`/`code` mit Eindeutigkeit je Mandant. |
| Mandant | jede fachliche Tabelle hat `mandant_id` (→ `core.mandant`); Zugriff per Row-Level-Security nach Mandant (ZU PRÜFEN mit Laravel-Anbindung). Ausnahme EduKSX-Codex: `mandant_id NULL` = gemeinsamer Bestand (Bundes-/Kantonsrecht, Verzeichnis). |
| Protokollfelder | `erstellt_am`, `erstellt_von`, `geaendert_am`, `geaendert_von`, `version` (optimistisches Sperren, wird bei jeder Änderung erhöht – passt zu `ETag`/`If-Match` der API). |
| Aufzählungen | als `text` mit `CHECK (… IN (…))` statt PostgreSQL-ENUM – leichter erweiterbar und 1:1 als Laravel-Migration abbildbar. |
| Zeit | Datum `date`, Zeitpunkte `timestamptz` (UTC gespeichert, Anzeige Europe/Zurich), Dauern in Minuten (`integer`) oder Stunden (`numeric(7,2)`) – je Modul vermerkt. |
| Beträge/Pensen | `numeric` mit fester Genauigkeit (WL `numeric(6,2)`, Prozent `numeric(5,2)`, VZE `numeric(8,4)`), nie `float`. |
| Flexible Inhalte | nur wo der Prototyp frei strukturierte Daten zeigt (Parameter eines Vorgangs, Dokumentinhalt): `jsonb` mit beschriebenem Aufbau. |
| Löschen | fachlich nicht hart löschen: `archiviert_am` bzw. Status; Personendaten nach Aufbewahrungsfrist löschen/anonymisieren (Prüfpunkte je Modul). |
| Personendaten | nur Verweise auf `core.person`; Namen, Geburtsdatum, Kontakt liegen **einmal** in Core. OFFEN (vorgemerkt 2026-11): optionale Verschlüsselung der Personendaten mit lokalem Schlüssel – betrifft nur `core.person`. |

[`core-referenz.sql`](core-referenz.sql) legt die von allen Modulen benutzten Core-Tabellen als **Platzhalter** an,
damit jedes Modulskript für sich lauffähig und prüfbar ist. Massgeblich ist das Datenmodell von EduKSX-Core.

## 2. API – Konventionen (EMPFOHLEN)

| Thema | Vorschlag |
|---|---|
| Beschreibung | OpenAPI 3.1, je Modul eine Datei; Pfade **ohne** Modulpräfix (`/v1/…`). Namensräume (`/<modul>/v1`, Schemas/Tags/operationId mit Modulschlüssel) setzt erst das Zusammenführen in EduKSX-Architektur (vorgemerkt 2026-11-19). |
| Anmeldung | OpenID Connect über EduKSX-Ident, Bearer-Token (JWT); Berechtigungen als Scopes `<modul>:<recht>` (z. B. `staffing:freigeben`) plus Rolle im Mandanten. |
| Mandant | aus dem Token; Kopfzeile `EduKSX-Mandant` nur für Personen mit mehreren Mandanten. |
| Namen in JSON | Deutsch, `camelCase` (`schuelerzahl`, `bgSoll`), Datum ISO 8601. |
| Listen | `?seite=1&anzahl=50` (max. 200), Antwort `{ daten: [...], seite, anzahl, total }`; Filter als Query-Parameter. |
| Ändern | `PUT` ganz, `PATCH` (JSON Merge Patch) teilweise; `ETag` in jeder Antwort, `If-Match` beim Ändern Pflicht (412 bei Konflikt). |
| Fehler | `application/problem+json` (RFC 9457) mit `type`, `title`, `status`, `detail`, bei Prüfregeln `fehler: [{feld, regel, text}]`. |
| Aktionen | fachliche Schritte als eigene Pfade mit Verb (`POST /v1/freigaben/{id}/freigeben`), nicht als Statusfeld zum Setzen. |
| Ereignisse | Änderungen, die andere Module brauchen, als Ereignis (Webhook/Nachricht) – Liste je Modul im Pflichtenheft; EduKSX-Flow ruft Vorgänge über das Vorgangsregister auf. |

Gemeinsame Bausteine (Fehler, Seitenangaben, Kopfzeilen) stehen in jeder Datei unter `components`, bis das
Zusammenführen sie einmal in Core-Bausteine auslagert.

## 3. Aufbau der Pflichtenhefte

Jedes `PFLICHTENHEFT.md` hat dieselben Teile:

1. **Zweck und Abgrenzung**
2. **Anforderungskatalog** – nummerierte Anforderungen (`<MOD>-F-nn` fachlich, `<MOD>-NF-nn` nicht fachlich) mit
   Priorität MUSS/SOLL/KANN, Stufe und Herkunft im Prototyp
3. **Pflichtenheft** – wie die Umsetzung die Anforderungen erfüllt: Architektur, Datenmodell, API, Rollen und
   Berechtigungen, Schnittstellen und Ereignisse, Berechnungsregeln, Datenübernahme, Betrieb
4. **Prüfpunkte für die produktive Umsetzung** – Abnahmeliste (Recht/Datenschutz, Fachlich, Sicherheit, Betrieb,
   Tests), abzuhaken vor dem ersten produktiven Einsatz
5. **Offene Punkte**

## 4. Gemeinsame Prüfpunkte (alle Module)

Vor dem ersten produktiven Einsatz eines Moduls abzuhaken – zusätzlich zu den Prüfpunkten im jeweiligen Pflichtenheft.

| Nr. | Prüfpunkt | Bereich | erledigt |
|---|---|---|---|
| G-01 | Datenschutz-Folgenabschätzung bzw. Vorabkontrolle nach IDG Kanton Zürich geprüft; Verzeichnis der Bearbeitungstätigkeiten nachgeführt. | Datenschutz | ☐ |
| G-02 | ISDS-Konzept (Schutzbedarf, Massnahmen) erstellt; Personendaten nur so viele wie nötig (Datenminimierung). | Datenschutz | ☐ |
| G-03 | Datenhaltung und Sicherungen in der Schweiz; Auftragsbearbeitungsvertrag mit dem Betreiber. | Datenschutz | ☐ |
| G-04 | Aufbewahrungs- und Löschfristen je Tabelle festgelegt (Archivgesetz, Personalrecht), Löschung bzw. Anonymisierung automatisiert. | Datenschutz | ☐ |
| G-05 | Anmeldung nur über EduKSX-Ident (OIDC), MFA für Rollen mit Personendaten; keine lokalen Konten. | Sicherheit | ☐ |
| G-06 | Mandantentrennung technisch durchgesetzt (Row-Level-Security o. ä.) und mit Tests über zwei Mandanten belegt. | Sicherheit | ☐ |
| G-07 | Rechte-Matrix umgesetzt und je Rolle automatisiert getestet (positiv und negativ). | Sicherheit | ☐ |
| G-08 | Änderungsprotokoll (wer, wann, alt/neu) für alle fachlichen Tabellen; Protokolle manipulationssicher und mit Frist. | Sicherheit | ☐ |
| G-09 | Sicherheitsprüfung (OWASP ASVS Stufe 2, Penetrationstest) ohne offene hohe Befunde; CodeQL und Abhängigkeitsprüfung grün. | Sicherheit | ☐ |
| G-10 | OpenAPI-Beschreibung vollständig, Konformitätstests gegen die laufende API grün (Fehlerformat, ETag/If-Match, Seiten). | Schnittstellen | ☐ |
| G-11 | Ereignisse an andere Module beschrieben, mit Wiederholung bei Ausfall und Idempotenz. | Schnittstellen | ☐ |
| G-12 | Barrierefreiheit WCAG 2.1 AA geprüft (Tastatur, Screenreader, Kontrast, Status nicht nur über Farbe). | Bedienung | ☐ |
| G-13 | Auftritt nach CI MarKusSXCH; keine Fremd-/Herstellernamen; Begriffe über EduKSX-Glossary. | Bedienung | ☐ |
| G-14 | Sicherung und Wiederherstellung getestet; RTO/RPO dokumentiert und eingehalten. | Betrieb | ☐ |
| G-15 | Überwachung (Verfügbarkeit, Fehler, Laufzeiten) ohne Personendaten in Protokollen; Betriebshandbuch vorhanden. | Betrieb | ☐ |
| G-16 | Datenübernahme aus dem Prototyp bzw. Altsystem getestet; Testdaten des Prototyps nicht in der Produktion. | Betrieb | ☐ |
| G-17 | Abnahme durch Projektverantwortliche:r mit Pilotschule; Schulung und Hilfetexte bereit. | Abnahme | ☐ |

## 5. Prüfen

`python3 tools/test_umsetzung.py` prüft, dass jede OpenAPI-Datei gültiges YAML ist, alle `$ref` auflösen und jede
Operation eine `operationId` hat, und dass jede Datenbankdatei die Konventionen einhält (eigenes Schema,
`mandant_id` in jeder Tabelle, keine Gleitkommazahlen). Getestet am 2026-11-20 mit PostgreSQL 16: alle Skripte
zusammen legen 111 Tabellen und Ansichten an; die OpenAPI-Dateien sind mit `openapi-spec-validator` gültig. Mit einer PostgreSQL-Instanz
lassen sich die Skripte zusätzlich ausführen:

```sh
psql -v ON_ERROR_STOP=1 -f docs/umsetzung/core-referenz.sql -f docs/umsetzung/staffing/datenbank.sql
```
