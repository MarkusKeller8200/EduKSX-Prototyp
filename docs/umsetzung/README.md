# Umsetzungsgrundlagen der Module

Stand: 2026-11-20 · Status: **ENTWURF** – Entscheidungsgrundlage, keine Freigabe (Stufen wie in
[`KONZEPT-VORLAGE.md`](../KONZEPT-VORLAGE.md): BESCHLOSSEN, EMPFOHLEN, OFFEN, ZU PRÜFEN).

Für jeden Prototyp liegt hier, was die produktive Umsetzung im jeweiligen Modul-Repository braucht:

| Modul | Prototyp | Datenbank | API | Anforderungen · Pflichtenheft · Prüfpunkte |
|---|---|---|---|---|
| EduKSX-Staffing | [`einsatzplanung`](../../prototypen/einsatzplanung) | [`staffing/datenbank.sql`](staffing/datenbank.sql) | [`staffing/openapi.json`](staffing/openapi.json) | [`staffing/PFLICHTENHEFT.md`](staffing/PFLICHTENHEFT.md) |
| EduKSX-Flow | [`ablaufplanung`](../../prototypen/ablaufplanung) | [`flow/datenbank.sql`](flow/datenbank.sql) | [`flow/openapi.json`](flow/openapi.json) | [`flow/PFLICHTENHEFT.md`](flow/PFLICHTENHEFT.md) |
| EduKSX-Codex | [`rechtssammlung`](../../prototypen/rechtssammlung) | [`codex/datenbank.sql`](codex/datenbank.sql) | [`codex/openapi.json`](codex/openapi.json) | [`codex/PFLICHTENHEFT.md`](codex/PFLICHTENHEFT.md) |
| EduKSX-Sign | [`signatur`](../../prototypen/signatur) | [`sign/datenbank.sql`](sign/datenbank.sql) | [`sign/openapi.json`](sign/openapi.json) | [`sign/PFLICHTENHEFT.md`](sign/PFLICHTENHEFT.md) |
| EduKSX-Time | [`zeiterfassung`](../../prototypen/zeiterfassung) | [`time/datenbank.sql`](time/datenbank.sql) | [`time/openapi.json`](time/openapi.json) | [`time/PFLICHTENHEFT.md`](time/PFLICHTENHEFT.md) |
| EduKSX-AI | [`interne-ki`](../../prototypen/interne-ki) | [`ai/datenbank.sql`](ai/datenbank.sql) | [`ai/openapi.json`](ai/openapi.json) | [`ai/PFLICHTENHEFT.md`](ai/PFLICHTENHEFT.md) |

Grundlage ist jeweils, **was der Prototyp anzeigt und bearbeitet** (Testdaten in `assets/daten.js`, Zustand im
Browser-Speicher). Jedes angezeigte Feld hat eine Spalte; berechnete Werte (Ist-Pensum, Saldo, Fristen …) werden
**nicht** gespeichert, sondern über Ansichten oder in der API berechnet – ausser sie müssen zu einem
Zeitpunkt eingefroren werden (Freigaben, Abschlüsse, Protokolle).

Die Prototypen bleiben unabhängig (AGENTS.md): Diese Dateien sind Vorlagen für die Modul-Repositorys, kein
gemeinsamer Code. Übernommene Teile werden dort als Laravel-Migrationen und Controller neu umgesetzt.

**Direkt lesbar in jedem Prototyp:** Menüpunkt «Entwickler» (wie die Entwicklerseite von EduKSX-Glossary) mit
Datenmodell (Beziehungsdiagramm, Tabellen mit Spalte, deutschem Begriff, Herkunft/Verwendung, Datenklasse, Typ,
Pflicht, Vorgabe, Schlüssel, Verweis und Werten; SQL-Script zum Herunterladen), API-Dokumentation (Scalar), Swagger und OpenAPI als JSON/YAML – unter
`prototypen/<name>/entwickler/`. Erzeugt aus diesem Ordner mit `python3 tools/entwickler_bauen.py`; nach jeder
Änderung hier neu erzeugen (der Test meldet veraltete Dateien). Scalar und Swagger UI liegen in jedem Prototyp als
eigene Kopie (`entwickler/lib/`, Liste in `docs/third-party.json`), laden nichts aus dem Netz und senden keine
Anfragen.

## 1. Datenbank – Konventionen (BESCHLOSSEN)

Verbindlich ist der **DB-Standard 1.3** von EduKSX-Architektur (`docs/KONZEPT-DB-GUIDELINE.md`); hier nur, wie die
Skripte ihn umsetzen.

| Thema | Umsetzung |
|---|---|
| System | PostgreSQL 16; die Skripte laufen ohne Erweiterungen. |
| Schema | ein Schema je Modulschlüssel (`staffing`, `flow`, `codex`, `sign`, `time`, `ai`); jedes Skript setzt `search_path` und ist für sich lauffähig. |
| Namen | **englisch**, `snake_case`, Tabellen im Plural (`classes`, `staff_members`), Fremdschlüssel `<ziel>_id`, Zeitpunkte `_at`, Daten `_on`, Zeiträume `valid_from`/`valid_until`, Wahrheitswerte `is_…`, Aufzählungen `status`/`<x>_type`. |
| Deutsche Beschreibung (A8) | je Tabelle Kurzbeschreibung, **Geltungsbereich** (global / Organisation / persönlich), **Datenklasse** (öffentlich, intern, personenbezogen, besonders schützenswert, geheim) und Herkunft/Verwendung; je Spalte deutscher Begriff, Herkunft/Verwendung, abweichende Datenklasse und die deutschen Labels jedes Werts. Steht als strukturierter Kommentar im Skript und wird als `COMMENT ON` in die Datenbank geschrieben. |
| Schlüssel | `id uuid` (UUID v7, von der Anwendung vergeben); fachliche Kürzel als eigene Spalte mit Eindeutigkeit je Organisation. Index auf jedem Fremdschlüssel. |
| Mandant | `organization_id` (→ `organizations`) in jeder Tabelle mit Geltungsbereich Organisation oder persönlich; globale Tabellen (Rechtsbestand in EduKSX-Codex) ohne. Persönliche Daten zusätzlich mit `user_id`. |
| Standardspalten | `created_at`, `created_by_id`, `updated_at`, `updated_by_id`, `lock_version` (optimistisches Sperren ↔ `ETag`/`If-Match`), bei fachlichen Haupttabellen `deleted_at`/`deleted_by_id` (Papierkorb). |
| Standardtabellen | [`standardtabellen.sql`](standardtabellen.sql) – `organizations`, `users` (Personenreferenz), `school_years`, `school_holidays`, `data_changes` – wird in jedes Modulskript kopiert (Platzhalter für EduKSX-Core, massgeblich ist dessen Modell). |
| Aufzählungen | `text` mit `CHECK (… IN (…))`, Werte englisch, Labels deutsch. |
| Zeit, Zahlen | `date`, `timestamptz` (UTC, Anzeige Europe/Zurich), Dauern in Minuten (`integer`); Pensen und Beträge `numeric`, nie Gleitkommazahlen. |
| Doppelt gespeichert | nur in der Ausnahmetabelle am Ende jedes Skripts begründet (eingefrorene Stände). |

**Erzeugen:** Indizes und `COMMENT ON` sowie die Standardtabellen sind in den Blöcken `-- >>> …` / `-- <<< …` erzeugt –
nicht von Hand ändern, sondern `python3 tools/umsetzung_bauen.py` ausführen. Das Werkzeug meldet fehlende
Beschreibungen, Labels oder Mandantenspalten als Mängel.

## 2. API – Konventionen (BESCHLOSSEN)

Verbindlich ist der **API-Standard 1.2** von EduKSX-Architektur (`docs/KONZEPT-API-GUIDELINE.md`).
[`openapi.json`](staffing/openapi.json) entsteht mit `tools/umsetzung_bauen.py` aus dem Datenmodell
(`tools/umsetzung/api_<modul>.py` beschreibt Ressourcen und Aktionen); `openapi.yaml` ist derselbe Inhalt.

| Thema | Umsetzung |
|---|---|
| Pfade | `/api/v1/…`, Ressourcen englisch, `kebab-case`, Plural; Organisationsdaten unter `/api/v1/org/…`, eigene Daten unter `/api/v1/me/…`, globale unter `/api/v1/…`. |
| Felder | `snake_case` = Spaltenname; Aufzählungen englisch mit `<feld>_label` (deutsch) und `x-eduksx-labels`; Beträge als Zeichenkette (`format: decimal`). |
| Deutsch (A8) | `title` und `description` jeder Operation, jedes Schemas, Felds und Parameters deutsch; Tags mit deutschem Anzeigenamen. |
| Hülle | `{ data, meta, links }`; Listen mit `cursor`/`limit` (max. 200) und `sort`. |
| Ändern | `PATCH` (JSON Merge Patch); `ETag` in jeder Antwort, `If-Match` Pflicht (412 bei Konflikt). |
| Fehler | `application/problem+json` mit `code` und `errors: [{field, code, detail}]`. |
| Anmeldung | OIDC über EduKSX-Ident; Scopes `<modul>:<ressource>.<read|write|delete|admin>`; Kopfzeile `EduKSX-Organization` nur bei mehreren Organisationen. |
| Kennzeichen | `info.x-eduksx-module`, `x-eduksx-api-standard`, je Operation `x-eduksx-ability`, `x-eduksx-data-classes`, `x-eduksx-purpose`. |
| Aktionen | fachliche Schritte als Unterressource im Nomen (`POST …/releases/{id}/approval`), nicht als Statusfeld. |
| Ereignisse | als `webhooks` in der Datei (`<modul>.<objekt>.<vorgang>`), Liste je Modul im Pflichtenheft. |

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

`python3 -m unittest discover -s tools` prüft, dass die erzeugten Teile aktuell sind, das Werkzeug keine Mängel
meldet (Beschreibungen, Labels, Geltungsbereich, Datenklasse, Mandantenspalte, Plural), die OpenAPI-Dateien dem
API-Standard folgen (Pfade, `operationId`, `$ref`) und keine Gleitkommazahlen vorkommen. Getestet am 2026-11-20 mit
PostgreSQL 16: alle fünf Skripte nebeneinander in einer leeren Datenbank legen 127 Tabellen und 6 Ansichten mit
1561 deutschen Kommentaren an; die OpenAPI-Dateien sind mit `openapi-spec-validator` gültig.

```sh
python3 tools/umsetzung_bauen.py
psql -v ON_ERROR_STOP=1 -f docs/umsetzung/staffing/datenbank.sql
```
