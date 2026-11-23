# EduKSX-AI – Anforderungskatalog, Pflichtenheft und Prüfpunkte

Stand: 2026-11-23 · Status: **ENTWURF** · Prototyp [`prototypen/interne-ki`](../../../prototypen/interne-ki) (0.1.x) ·
Datenbank [`datenbank.sql`](datenbank.sql) · API [`openapi.json`](openapi.json)

Stufen wie in [`KONZEPT-VORLAGE.md`](../../KONZEPT-VORLAGE.md); ohne Vermerk gilt **EMPFOHLEN**.

## 1. Zweck und Abgrenzung

EduKSX-AI ist die **interne KI-Plattform** der Schule: Chat, Assistenten und Wissenssammlungen in einer
Weboberfläche, wie man sie von bekannten KI-Assistenten kennt – aber mit **offenen Modellen**, die auf einem
eigenen KI-Server oder bei einem geprüften **Schweizer Anbieter** laufen. Jede Unterhaltung, jeder Assistent und
jede Sammlung hat einen **Schutzbedarf**; die Plattform leitet Anfragen nur an Betriebsorte weiter, die dafür
freigegeben sind.

**Nicht dazu gehören:** Training oder Feinabstimmung eigener Modelle, Betrieb der GPU-Hardware (Infrastruktur),
Bild- und Videoerzeugung, Nutzung durch Lernende ohne eigenes Konzept (Rolle «Lernende» vorbereitet, aber aus).

## 2. Anforderungskatalog

### 2.1 Fachliche Anforderungen

| ID | Anforderung | Priorität | Herkunft im Prototyp |
|---|---|---|---|
| AI-F-01 | Chat mit fortlaufender Antwort (Ereignisstrom), Abbrechen, Neu erzeugen, Kopieren; Antworten mit Markdown. | MUSS | Chat |
| AI-F-02 | Unterhaltungen: Liste nach Zeit gruppiert, Suche im Titel und Inhalt, Anheften, Umbenennen, Löschen. | MUSS | Chat › Liste |
| AI-F-03 | Modellwahl je Unterhaltung; nur Modelle mit zulässigem Betriebsort wählbar, gesperrte mit Grund. | MUSS | Chat › Modell |
| AI-F-04 | Schutzbedarf je Unterhaltung (öffentlich, intern, vertraulich, besonders schützenswert); Wechsel prüft Modell und Wissen. | MUSS (BESCHLOSSEN im Prototyp) | Chat › Schutzbedarf |
| AI-F-05 | Anzeige des Betriebsorts bei jeder Unterhaltung und Antwort (intern bzw. Anbieter und Standort). | MUSS | Chat › Betriebsort |
| AI-F-06 | Prüfung auf mögliche Personendaten vor dem Senden mit Vorschlag, den Schutzbedarf zu erhöhen. | MUSS | Dialog «Mögliche Personendaten» |
| AI-F-07 | Dateien anhängen (PDF, Word, Excel, Text, Bild bei Modellen mit Bildverständnis). | MUSS | Anhang |
| AI-F-08 | Wissenssammlungen: Dateien hochladen, Indexierung im Hintergrund, Status je Datei, Schutzbedarf, Freigabe. | MUSS | Wissen |
| AI-F-09 | Antworten mit Wissen nennen ihre Quellen (Datei und Stelle). | MUSS | Quellen |
| AI-F-10 | Assistenten mit Anweisungen, Modell, Wissen, Schutzbedarf, Gesprächsanfängen und Freigabe (nur ich, Gruppen, Organisation). | MUSS | Assistenten |
| AI-F-11 | Assistenten exportieren und importieren (JSON «eduksx-ai-assistant/1», ohne Wissen und Freigabe). | SOLL | Exportieren/Importieren |
| AI-F-12 | Rückmeldung je Antwort (hilfreich/nicht hilfreich mit Grund und freiwilliger Bemerkung). | SOLL | Daumen |
| AI-F-13 | Websuche nur bei Schutzbedarf «öffentlich» und wenn eingeschaltet. | MUSS | Websuche |
| AI-F-14 | Werkzeuge über das Model Context Protocol, u. a. EduKSX-Codex (Rechtssammlung) und EduKSX-Glossary; je Werkzeug «zulässig bis». | SOLL | Werkzeuge |
| AI-F-15 | Modellkatalog: Kennung, Herkunft, Lizenz, Grösse, Kontext, Fähigkeiten, Betriebsorte; neue Modelle ausgeschaltet. | MUSS | Verwaltung › Modelle |
| AI-F-16 | Standardmodell je Schutzbedarf. | MUSS | Verwaltung › Modelle |
| AI-F-17 | Betriebsorte mit Art, Standort, Schnittstelle, Nachweisen, CLOUD Act, Vertrag (ADV), Freigabe und «zulässig bis»; Verbindung testen. | MUSS | Verwaltung › Betriebsorte |
| AI-F-18 | Rollen mit Rechtematrix; Administration fest. | MUSS | Verwaltung › Rollen & Rechte |
| AI-F-19 | Personen (aus EduKSX-Ident) mit Rolle, Gruppen und Sperre; Gruppen für Freigaben. | MUSS | Verwaltung › Benutzer & Gruppen |
| AI-F-20 | Organisationsangaben und Hinweis an das Modell (Ton, Schreibweise), jeder Unterhaltung vorangestellt. | SOLL | Verwaltung › Organisation |
| AI-F-21 | Datenschutzregeln: Aufbewahrung 1–365 Tage, Schutzbedarf neuer Unterhaltungen, Protokollierung nur Metadaten, Personendaten-Prüfung. | MUSS | Verwaltung › Datenschutz |
| AI-F-22 | Systemzustand: Erreichbarkeit und Antwortzeit je Betriebsort, GPU-Auslastung eigener Hardware, Suchindex, Nutzung je Modell, Rückmeldungen. | SOLL | Verwaltung › Systemzustand |
| AI-F-23 | Transkription (Sprache zu Text) für Sitzungen und Diktate. | KANN | Modell vorbereitet, aus |

### 2.2 Nicht fachliche Anforderungen

| ID | Anforderung | Priorität |
|---|---|---|
| AI-NF-01 | Anfragen an Modelle nur über ein internes Gateway mit OpenAI-kompatibler Schnittstelle; Anbieter austauschbar. | MUSS |
| AI-NF-02 | Weiterleitung erzwingt den Schutzbedarf serverseitig (nicht nur in der Oberfläche): kein zulässiger Ort → Anfrage abgewiesen. | MUSS |
| AI-NF-03 | Eingaben werden bei keinem Anbieter gespeichert oder zum Training verwendet (vertraglich, ADV). | MUSS |
| AI-NF-04 | Suchindex, Dateien und Unterhaltungen in der Schweiz (Objektspeicher verschlüsselt). | MUSS |
| AI-NF-05 | Protokoll nur mit Metadaten, nie mit Inhalten; Löschung nach Aufbewahrungsfrist. | MUSS |
| AI-NF-06 | Erste Zeichen einer Antwort auf dem internen Server < 2 s (Modell bis 70 Mrd. Parameter). | SOLL |
| AI-NF-07 | Zugangsschlüssel der Anbieter nur im Tresor; in der Datenbank nur Verweise. | MUSS |
| AI-NF-08 | Barrierefreiheit nach WCAG 2.1 AA, Bedienung per Tastatur (Enter senden, Umschalt+Enter Zeile). | MUSS |

## 3. Pflichtenheft

### 3.1 Architektur

- Laravel-Modul (Repository EduKSX-AI) mit Weboberfläche; **Gateway** (z. B. LiteLLM oder eigener Dienst – ZU
  PRÜFEN) zwischen Modul und Betriebsorten; auf dem internen Server Inferenz mit **vLLM** (OpenAI-kompatibel).
- Weiterleitung: `ortFuer(Modell, Schutzbedarf)` = erster aktiver, freigegebener Betriebsort des Modells mit
  `max_protection_level ≥ Schutzbedarf`, interner Server zuerst. Gleiche Regel für Werkzeuge.
- Wissenssammlungen: Zerlegen in Abschnitte, Einbettung mit dem Einbettungsmodell auf dem internen Server,
  Vektorsuche in PostgreSQL (Erweiterung pgvector – ZU PRÜFEN).
- Antworten als Ereignisstrom (Server-Sent Events: `delta`, `sources`, `done`).

### 3.2 Datenmodell

[`datenbank.sql`](datenbank.sql), Schema `ai`. Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert (DB-Standard 1.3, siehe [README](../README.md#1-datenbank--konventionen-beschlossen)). Tabellen: `ai_settings`, `roles`,
`role_permissions`, `user_accounts`, `user_groups`, `user_group_members`, `inference_endpoints`, `endpoint_checks`,
`models`, `model_capabilities`, `model_deployments`, `default_models`, `tools`, `knowledge_collections`,
`knowledge_files`, `knowledge_chunks`, `assistants`, `assistant_collections`, `group_shares`, `favorites`,
`conversations`, `conversation_collections`, `messages`, `message_attachments`, `message_sources`, `usage_events`.
Unterhaltungen sind **persönlich** (`user_id`); Dateiinhalte nicht in der Datenbank.

### 3.3 API

[`openapi.json`](openapi.json) (API-Standard 1.2): eigene Unterhaltungen unter `/api/v1/me/conversations`
(`…/messages` mit Ereignisstrom, `…/regeneration`, `…/feedback`, `…/attachments`, `…/stop`), Assistenten
(`/api/v1/org/assistants`, `…/favorite`, `…/export`, `…/import`), Wissen (`/api/v1/org/knowledge-collections`,
`…/files`), Verwaltung (`/models`, `/default-models`, `/endpoints`, `…/check`, `/tools`, `/roles`, `/groups`,
`/user-accounts`, `/settings`, `/system-status`).

### 3.4 Rollen und Berechtigungen

| Recht (Scopes) | Administration | Wissensredaktion | Mitarbeitende | Lernende (optional) |
|---|---|---|---|---|
| Chat – `ai:conversations.*`, `ai:messages.write` | ✓ | ✓ | ✓ | ✓ (nur freigegebene Assistenten) |
| Assistenten/Wissen erstellen – `ai:assistants.write`, `ai:knowledge.write` | ✓ | ✓ | ✓ (eigene) | – |
| Für Gruppen/Organisation freigeben | ✓ | ✓ | – | – |
| Vertrauliche Daten verarbeiten | ✓ | ✓ | ✓ | – |
| Verwaltung – `ai:{models,endpoints,tools,roles,groups,settings,status}.admin` | ✓ | – | – | – |

### 3.5 Schnittstellen

| Partner | Richtung | Inhalt |
|---|---|---|
| Interner KI-Server (vLLM) | ↔ | Chat, Einbettung, Transkription (OpenAI-kompatibel) |
| Schweizer Anbieter (Inferenz-API bzw. GPU) | ↔ | Chat für freigegebene Schutzbedarfsstufen |
| EduKSX-Ident | ← | Personen, Gruppen, Anmeldung (OIDC) |
| EduKSX-Codex, EduKSX-Glossary, EduKSX-Flow | ↔ | Werkzeuge über MCP |
| EduKSX-Sign | → | Entwurf aus dem Chat in die persönliche Ablage übernehmen (später) |

### 3.6 Datenübernahme

Keine produktiven Daten aus dem Prototyp. Modellkatalog, Betriebsorte und Assistenten-Vorlagen als Startdaten
(Stand der Anbieterprüfung neu erheben).

## 4. Prüfpunkte für die produktive Umsetzung

Zusätzlich zu den gemeinsamen Prüfpunkten in [`../README.md`](../README.md#4-gemeinsame-prüfpunkte-alle-module).

| Nr. | Prüfpunkt | Bereich | erledigt |
|---|---|---|---|
| AI-P-01 | Datenschutz-Folgenabschätzung bzw. Vorabkontrolle mit der zuständigen Datenschutzstelle; Einordnung der Schutzbedarfsstufen nach ISMS der Schule. | Datenschutz | ☐ |
| AI-P-02 | Je Anbieter: Vertrag zur Auftragsdatenbearbeitung, Datenstandort Schweiz, keine Speicherung/kein Training, Unterauftragnehmer, CLOUD-Act-Frage schriftlich geklärt. | Recht | ☐ |
| AI-P-03 | Lizenz jedes Modells geprüft (kommerzielle bzw. öffentliche Nutzung, Einschränkungen eigener Lizenzen). | Recht | ☐ |
| AI-P-04 | Weiterleitung nach Schutzbedarf serverseitig getestet (auch direkte API-Aufrufe, Assistent mit tieferem Schutzbedarf, Wechsel mitten in der Unterhaltung). | Sicherheit | ☐ |
| AI-P-05 | Personendaten-Prüfung mit Testsätzen (AHV-Nummer, Geburtsdatum, Gesundheitsangaben) und Fehlalarm-Quote gemessen. | Tests | ☐ |
| AI-P-06 | Hardware des internen Servers für die gewählten Modelle dimensioniert (GPU-Speicher, gleichzeitige Nutzende, Antwortzeit). | Betrieb | ☐ |
| AI-P-07 | Protokoll enthält keine Inhalte (Stichprobe Gateway-, Server- und Anbieterprotokolle). | Datenschutz | ☐ |
| AI-P-08 | Löschung nach Aufbewahrungsfrist inkl. Anhängen und Suchindex nachgewiesen. | Datenschutz | ☐ |
| AI-P-09 | Werkzeuge (MCP) nur mit Rechten der angemeldeten Person; Anweisungen aus Dokumenten und Websuche können keine Werkzeuge auslösen (Prompt-Injection-Test). | Sicherheit | ☐ |
| AI-P-10 | Gateway, vLLM, pgvector und Oberflächen-Komponenten in `third-party.json` mit Lizenz und Pflege eingetragen. | Betrieb | ☐ |

## 5. Offene Punkte

Siehe «Entscheide und offene Punkte» im README des Prototyps. Zusätzlich:

1. OFFEN: Eigener KI-Server, gemietete GPU in der Schweiz oder Inferenz-API – Kosten und Betriebsaufwand vergleichen.
2. OFFEN: Zugang für Lernende (Altersgrenzen, Aufsicht, Lehrmittelbezug).
3. ZU PRÜFEN: pgvector als Erweiterung in der Datenbank der Plattform.
