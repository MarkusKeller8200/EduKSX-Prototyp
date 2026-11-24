# Konzept: EduKSX-Flow – Ausbau der Prozess-Engine

Stand: 2026-11-24 (Prototyp `prototypen/ablaufplanung` 0.7.0) · Status: **IN ARBEIT**

Entscheidungsgrundlage für den Ausbau von EduKSX-Flow (Ablaufplanung / Termine und ToDo). Auslöser ist ein externes
Review vom 24.11.2026 (Vorschläge in 20 Kapiteln). Dieses Konzept gewichtet die Vorschläge, trennt Beschlossenes von
Empfehlungen und legt fest, was als **Stufe 1** in den Klickprototyp kommt.

| Stufe | Bedeutung |
|---|---|
| **BESCHLOSSEN** | Vorgabe von Projektverantwortliche:r (mit Datum) |
| **EMPFOHLEN** | Vorschlag, noch nicht bestätigt |
| **OFFEN** | muss vor der Umsetzung entschieden werden |
| **ZU PRÜFEN** | technische Machbarkeit, Lizenz, Recht oder Kosten klären |

## 1. Ziel

EduKSX-Flow plant, **wann** etwas zu tun ist, **wer** zuständig ist und **ob** es erledigt wurde. Die Fachmodule
(Core, Ident, Connect, Staffing, Time, Shop, Finance) entscheiden, **wie** es fachlich ausgeführt wird.

- **BESCHLOSSEN (24.11.2026):** Vor weiteren Ablaufvorlagen wird die Prozess-Engine ausgebaut. Stufe 1 wird im
  Prototyp umgesetzt (Auftrag im Chat «Ja. Dann Stufe 1 ausführen»).
- **BESCHLOSSEN (Grundsatz seit 0.1.0):** Flow enthält keine Fachlogik anderer Module; Aufrufe laufen über das
  Vorgangsregister.

**Nichtziele:** kein Nachbau von Personal-, Benutzer-, Finanz-, Dokumenten- oder Archivverwaltung; keine
Leistungsüberwachung von Personen; kein produktiver Betrieb, keine echten Personendaten.

## 2. Gewichtung des Reviews

Bereits im Prototyp vorhanden (das Review konnte die Oberfläche nicht bedienen):

- Parallele Schritte und Zusammenführung (ein Schritt wartet auf mehrere Vorgänger, «nach»).
- Bedingungen auf Kontextfeldern (Schritt entfällt), Warten auf Rückmeldung eines Moduls, Fehlerstatus mit erneutem
  Versuch, simulierter Tag, Versionierung mit Freigabe (SV bearbeitet, RV gibt frei), Quellen je Schritt.
- Start eines Ablaufs aus einem Ereignis des Jahreskalenders (von Hand).

| Kapitel Review | Einstufung | Stufe |
|---|---|---|
| 2.2 Aufgabentypen | übernehmen | **1** |
| 2.3 Auslöser (Trigger) | übernehmen, Teilmenge | **1** |
| 2.1 Unterprozesse, Entscheidungsknoten, Warteereignisse | übernehmen ohne grafischen Editor | **1** |
| 4 Fristarten und Eskalation | übernehmen | **1** |
| 13 Eingriffe in laufende Abläufe | übernehmen, Teilmenge | **1** |
| 2.1 Drag-and-drop-Designer, BPMN-Export | zurückstellen; Tabelleneditor + automatisches Ablaufbild genügen | später |
| 3 Stellvertretung, Delegation, Vier-Augen, Quorum, Organisationseinheiten | übernehmen | 2 |
| 5 Persönliches Aufgabenmanagement | nur «alle meine Aufgaben aus allen Modulen»; kein Kanban/Kommentare (Kollaborationsumgebung) | 2 |
| 6 Kalenderansichten, ICS-Abo, Serien-Ausnahmen, Belastungsübersicht | übernehmen | 2 |
| 7 Rollenbasierte Übersicht | übernehmen | 2 |
| 14 Benachrichtigungszentrum (Kanäle) | als EduKSX-weiter Dienst, nicht in Flow | 2 |
| 8 Prozesslenkung (Metadaten, Reviews) | übernehmen | 3 |
| 9 Verknüpfung mit der Rechtssammlung | übernehmen; strukturierte Referenz statt freier Text | 3 |
| 10 Vorlagenbibliothek, Versionsvergleich | übernehmen | 3 |
| 11 Weitere Ablaufvorlagen | erst nach Stufe 1–3 | 3 |
| 12 Integrationsarchitektur (Event Bus, Idempotenz, Retry …) | Konzept für die Modul-Repos, nicht im Klickprototyp | – |
| 15 Datenschutz, Mandantentrennung | Architekturvorgabe für alle Stufen | – |
| 16 Kennzahlen | spät, nur mit Personalvertretung und Datenschutz | 4 |

## 3. Stufe 1 – Ablauf aus Sicht der Nutzer:innen

### 3.1 Aufgabentypen

Jeder Schritt hat eine **Art**. Ohne Angabe gilt wie bisher: mit Vorgang = «Aufruf», sonst «Aufgabe».

| Art | Wer handelt | Ergebnis (Platzhalter) |
|---|---|---|
| Aufgabe | zuständige Rolle meldet erledigt | – |
| Aufruf an Modul | Flow ruft einen Vorgang auf (von Hand bestätigt oder automatisch) | laut Vorgangsregister |
| Genehmigung | zuständige Rolle genehmigt oder lehnt ab, Ablehnung mit Begründung | `{id.entscheid}` |
| Entscheidung | zuständige Rolle wählt eine von mehreren Möglichkeiten | `{id.wahl}` |
| Nachweis | Dokument bzw. Referenz muss hinterlegt werden | `{id.nachweis}` |
| Termin | Termin festhalten (Datum, Ort) | `{id.termin}` |
| Warten | Flow wartet bis zur Frist (z. B. Rekursfrist), niemand muss handeln | – |
| Benachrichtigung | Flow informiert Rollen zur Frist, ohne Modulaufruf | – |
| Unterprozess | Flow startet eine andere freigegebene Vorlage und wartet auf deren Abschluss | `{id.ablauf}` |

**Verzweigung:** Eine Bedingung kann auf das Ergebnis eines früheren Schritts verweisen (z. B. `ictsw5.entscheid =
genehmigt`). Der Schritt wartet, bis jener Schritt erledigt ist. Entfällt ein Schritt wegen einer solchen Bedingung,
entfallen auch die Schritte, die **nur** auf ihn warten (der Zweig wird abgeschlossen). Entfällt ein Schritt wegen
eines Kontextfelds, gilt das bisherige Verhalten (Nachfolger laufen weiter).

### 3.2 Auslöser

Eine Vorlage kann Auslöser haben; ausgelöst werden nur **freigegebene** Vorlagen.

| Auslöser | Beispiel im Prototyp |
|---|---|
| Manuell | wie bisher «Ablauf starten» |
| Kalender (automatisch) | Ordentliche Schulpflegesitzung, Schulleitungskonferenz: Start, sobald der erste Schritt fällig wird |
| Modul-Ereignis (Datensatz erstellt/geändert, Status geändert) | Anstellung genehmigt → Onboarding; Austritt erfasst → Offboarding; Pensum geändert → Mutation; Lernende erfasst → Eintritt |
| Abschluss eines Ablaufs | Hardwarebeschaffung (unterjährig) abgeschlossen → Investition buchen |

Modul-Ereignisse werden auf der Seite «Auslöser» simuliert. **Doppelte Starts** (gleiche Vorlage, gleiche
Bezeichnung, gleicher Stichtag) werden nicht gestartet, sondern im Auslöseprotokoll vermerkt.

### 3.3 Fristarten und Eskalation

- Jede Frist ist **gesetzlich**, **intern** (Vorgabe) oder **Empfehlung**. Gesetzliche Fristen brauchen eine Quelle mit
  Paragraf bzw. Artikel (Prüfung warnt) und werden früher eskaliert.
- Eskalationsstufen (Annahme im Prototyp):

| Stufe | intern / Empfehlung | gesetzlich | an |
|---|---|---|---|
| 1 Erinnerung | 2 Tage vor Frist | 7 Tage vor Frist | zuständige Rolle |
| 2 überfällig bzw. dringend | Frist | 2 Tage vor Frist | zuständige Rolle |
| 3 Information vorgesetzte Stelle | 2 Tage nach Frist | Frist | vorgesetzte Rolle |
| 4 Eskalation Leitung | 5 Tage nach Frist | 2 Tage nach Frist | Schulpräsidium |

- Auch **blockierte** Schritte (Vorgänger offen, Frist vorbei) werden als «Frist gefährdet» angezeigt.

### 3.4 Eingriffe in laufende Abläufe

Prozessverantwortliche (im Prototyp: Schulverwaltung, Schulleitung, Schulpräsidium) können eingreifen; jeder Eingriff
verlangt eine Begründung und steht im **Journal** des Ablaufs.

- Ablauf pausieren / fortsetzen (keine automatischen Schritte, keine Eskalation während der Pause).
- Ablauf abbrechen: offene Schritte werden abgebrochen, laufende Unterprozesse ebenso; bereits ausgeführte Aufrufe
  werden **nicht** rückgängig gemacht, sondern als Kompensationshinweis aufgelistet.
- Stichtag verschieben: offene Fristen verschieben sich, erledigte Schritte bleiben, Hinweis bei gesetzlichen Fristen.
- Schritt überspringen, Schritt wieder öffnen (ein bereits ausgeführter Aufruf wird nicht automatisch wiederholt),
  Zuständigkeit ändern, zusätzlichen Schritt einfügen (nur in diesem Ablauf).

## 4. Entscheide

| Nr. | Frage | Optionen | Entscheid | Status |
|---|---|---|---|---|
| E1 | Ausbau Engine vor weiteren Vorlagen? | Engine / Vorlagen | Engine zuerst | BESCHLOSSEN 24.11.2026 |
| E2 | Stufe 1 im Prototyp | ja / nein | ja, Umfang Kap. 3 | BESCHLOSSEN 24.11.2026 |
| E3 | Grafischer Prozessdesigner | Drag-and-drop / Tabelle + Bild | Tabelle + automatisches Bild | EMPFOHLEN |
| E4 | Aufgabentyp «Formular» | eigener Typ / Nachweis + Kontextfelder | vorerst nicht; Bedarf klären | OFFEN |
| E5 | Wer darf eingreifen (Prozessverantwortung)? | SV, SL, SPr / je Vorlage festlegen | Prototyp: SV, SL, SPr; produktiv je Vorlage (Stufe 3, Metadaten) | OFFEN |
| E6 | Eskalationsstufen und vorgesetzte Rollen | feste Tabelle / je Vorlage | Prototyp: feste Tabelle (Kap. 3.3) | OFFEN |
| E7 | Kalender-Auslöser: Vorlauf | ab erstem fälligem Schritt / fester Vorlauf | ab erstem fälligem Schritt | EMPFOHLEN |
| E8 | Unterprozess: Version | Version beim Start des Unterprozesses / beim Start des Hauptablaufs | beim Start des Unterprozesses | EMPFOHLEN |
| E9 | Kontext ändern im laufenden Ablauf | erlauben / nur Stichtag | vorerst nur Stichtag; Auswirkung auf bereits entschiedene Bedingungen klären | OFFEN |
| E10 | Prozessmigration laufender Abläufe auf neue Version | ja / nein | Stufe 3 | OFFEN |
| E11 | Sammelstart (mehrere Personen) | Stufe 1 / 2 | Stufe 2 | EMPFOHLEN |
| E12 | Gesetzliche Fristen je Schritt | Einstufung durch SV / durch Rechtssammlung | Prototyp: Einstufung in der Vorlage; die Einstufungen sind fachlich zu prüfen | ZU PRÜFEN |
| E13 | Benachrichtigungskanäle (E-Mail, Kollaborationsumgebung) | in Flow / EduKSX-weiter Dienst | EduKSX-weiter Dienst | EMPFOHLEN |

## 5. Umsetzung im Prototyp (Stufe 1)

- `assets/app.js`: Motor mit Arten, Verzweigung, Unterprozess, Warten, Benachrichtigung, Eskalation, Pause/Abbruch;
  Auslöser (Kalender, Modul-Ereignis, Abschluss) mit Deduplizierung; Eingriffe mit Journal; Prüfung erweitert
  (Art, Zweige, Unterprozess-Kreise, gesetzliche Fristen ohne Paragraf, Auslöser); Seite «Auslöser».
- `assets/erweiterung.js` (neu): Beispiele in bestehenden Vorlagen (Genehmigung mit Zweigen, Entscheidungen, Nachweis,
  Warten, Benachrichtigung, Unterprozesse, gesetzliche Fristen), Modul-Ereignisse, Auslöser, Rollenhierarchie für die
  Eskalation, weitere Testabläufe.
- Speicherschlüssel `eduksx-flow-prototyp-v6` (neues Datenmodell; alte Stände werden nicht übernommen).
- Umsetzungsgrundlagen `docs/umsetzung/flow/` nachgeführt: Tabellen `module_events`, `template_triggers`,
  `escalation_rules`, `run_journal_entries`, `trigger_events`, neue Spalten in `roles`, `template_steps`, `runs`,
  `run_steps`; API-Aktionen pausieren/fortsetzen, Stichtag, Schritt einfügen/wieder öffnen, Modul-Ereignis empfangen,
  Auslöseprotokoll; Webhook `flow.step.escalated`; Anforderungen FLW-F-24–30, Prüfpunkte FLW-P-10–11.
- Keine neuen Abhängigkeiten.

**Für die Modul-Repos (nicht im Prototyp):** Ereignisse über einen Event Bus mit Korrelations-ID; Aufrufe idempotent
mit Wiederholungsstrategie und Ablage dauerhaft fehlgeschlagener Aufrufe; Schema-Validierung der Parameter;
API-Versionierung; Simulation strikt getrennt von der produktiven Ausführung; Journal (fachlich), Aufrufprotokoll
(technisch) und Audit-Log (Sicherheit) getrennt.

## 5a. Einstellungen und Funktionendiagramm (0.8.0)

Auftrag im Chat 24.11.2026: Menü «Einstellungen» mit Kompetenzen, Funktionen (gruppiert), Zeitpunkten, Intervallen
und Aufgabenbereichen (gruppiert nach Hauptbereichen), je mit Kürzel/Nr., Bezeichnung, Beschreibung und Aktiv –
**BESCHLOSSEN** und im Prototyp umgesetzt. Grundlage ist ein Vorschlag zur Erweiterung des Funktionendiagramms.

| Nr. | Frage | Optionen | Entscheid | Status |
|---|---|---|---|---|
| E14 | Kompetenzmerkmale (bedingt, Instanz, Betragsgrenze, kollektiv, delegierbar, befristet, Vier-Augen, Geltungsbereich) | Eigenschaft der Zuweisung / eigene Kompetenzart | Eigenschaft der Zuweisung | EMPFOHLEN |
| E15 | Wohin gehört das Funktionendiagramm? | Flow / EduKSX-Core / eigenes Modul (EduKSX-Competence bzw. EduKSX-Organization) | – | OFFEN |
| E16 | Aufgabenbereiche (23 Hauptbereiche) als Nummerierung des Funktionendiagramms | ersetzen / zuordnen | – | OFFEN |
| E17 | Zeitpunkte und Intervalle steuern die Auswahl der Zeitregeln im Kalender | ja / nein | – | OFFEN |
| E18 | Plausibilitätsprüfung (fehlender Entscheid, fehlende Ausführung, Konflikt, Funktionstrennung) | Stufe 2 / 3 | Stufe 3 | EMPFOHLEN |

## 6. Issues

`gh` ist in dieser Umgebung nicht angemeldet; die Issues werden nachgetragen, sobald es geht (OFFEN).

| Issue | Inhalt | Status |
|---|---|---|
| – | Stufe 1: Aufgabentypen, Verzweigung, Unterprozess | im Chat freigegeben |
| – | Stufe 1: Auslöser und Deduplizierung | im Chat freigegeben |
| – | Stufe 1: Fristarten und Eskalation | im Chat freigegeben |
| – | Stufe 1: Eingriffe und Journal | im Chat freigegeben |

## 7. Verlauf

- 2026-11-24: Einstellungen (Kataloge) im Prototyp 0.8.0; Entscheide E14–E18 ergänzt.
- 2026-11-24: Konzept angelegt aus dem Review; Stufe 1 freigegeben und im Prototyp 0.7.0 umgesetzt.
