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
| E5 | Wer darf eingreifen (Prozessverantwortung)? | feste Rollen / je Vorlage / über Kompetenz im FD | je Vorlage festlegen (Prozessverantwortung als Angabe der Vorlage, Vorgabe SV, SL, SPr) | BESCHLOSSEN 24.11.2026 |
| E6 | Eskalationsstufen und vorgesetzte Rollen | feste Tabelle / unter Einstellungen / je Vorlage | unter Einstellungen pflegbar: Stufen je Fristart, vorgesetzte Rolle je Funktion | BESCHLOSSEN 24.11.2026 |
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
| E14 | Kompetenzmerkmale (bedingt, Instanz, Betragsgrenze, kollektiv, delegierbar, befristet, Vier-Augen, Geltungsbereich) | Eigenschaft der Zuweisung / eigene Kompetenzart / später | Eigenschaft der Zuweisung (je Zelle im Funktionendiagramm); Flow nutzt sie für Genehmigungen | BESCHLOSSEN 24.11.2026 |
| E15 | Wohin gehört das Funktionendiagramm? | Flow / EduKSX-Core / eigenes Modul (EduKSX-Competence bzw. EduKSX-Organization) | eigenes Modul **EduKSX-Organization** (Funktionendiagramm, Organigramm, Stellenbeschreibungen); Flow, Staffing, Ident nutzen es. Im Prototyp bleibt es vorerst in Flow; Modulname ZU PRÜFEN | BESCHLOSSEN 24.11.2026 |
| E16 | Aufgabenbereiche (23 Hauptbereiche) als Nummerierung des Funktionendiagramms | ersetzen / zuordnen | zuordnen: Aufgaben behalten ihre Nr., gruppiert nach Hauptbereich (0.9.0); Zuordnung der Muster-Nummern ZU PRÜFEN | BESCHLOSSEN 24.11.2026 |
| E17 | Zeitpunkte und Intervalle steuern die Auswahl der Zeitregeln im Kalender | ja / nein | ja (0.9.0) | BESCHLOSSEN 24.11.2026 |
| E19 | Periode und Intervall | zusammenlegen / getrennt mit Verknüpfung | getrennt: Intervall = Zeitregel im Kalender (wann genau), Periode = Häufigkeit pro Jahr für Planung und Berechnung (Wert); Intervall verweist auf eine Periode. Mehrjährige Perioden (2J–5J) als Wiederholung «alle n Jahre ab Jahr» im Kalender (0.14.0; während Abwesenheit der Projektleitung umgesetzt, zur Bestätigung) | EMPFOHLEN |
| E18 | Plausibilitätsprüfung (fehlender Entscheid, fehlende Ausführung, Konflikt, Funktionstrennung) | Stufe 2 / 3 | Stufe 3 | EMPFOHLEN |

## 5b. Rechtsgrundlagen aus EduKSX-Codex (0.17.0)

Auftrag 24.11.2026: die Seite «Rechtsgrundlagen» klar als Teil von EduKSX-Codex kennzeichnen und die Schnittstelle
festhalten. Die Rechtsgrundlagen in Flow sind **nicht neu recherchiert**: Sie stammen aus den Quellenangaben der
Vorlagen (Prozesslisten, Checklisten, Merkblätter, Gesetzeszitate).

### Aufgabenteilung (E20)

| | EduKSX-Codex | EduKSX-Flow |
|---|---|---|
| führt | Erlass (Kennung LS/SR, kommunale Erlassnummer), Fassungen mit Publikation und Gültigkeit, Text, Rechtsgrundlagen Volksschule, Monitoring | Verwendung: welcher Schritt sich auf welchen Erlass und welche Stelle (§) stützt, geprüfte Fassung, Prozessentscheid |
| meldet | neue Fassung: Ereignis `codex.act_version.created` (Codex-Pflichtenheft 3.3) | fälliger Review: Ereignis `flow.template.review_due` |
| nicht | keine Prozessentscheide, keine Fristen | keine Gesetzestexte, keine eigene Pflege von Erlassen |

### Verweis je Schritt (FLW-F-39, **EMPFOHLEN**)

Heute steht die Quelle als Freitext («GG § 18; FD 1.1.2»). Im Betrieb wird sie strukturiert:

- `source_id` → Erlass mit `codex_reference` (z. B. `ZH:LS:131.1`), `source_location` = Stelle («§ 18 Abs. 2»),
  `source_checked_version` = Fassung bei der letzten Prüfung («Nachtrag 132»).
- Freitext bleibt nur für schuleigene Unterlagen (Funktionendiagramm, Prozessliste, ICT-Jahresplanung); Merkblätter und
  Arbeitshilfen von Behörden (Volksschulamt, SUVA, Gemeindeamt) kommen nach Codex (E23).
- Datenübernahme: Die Freitexte werden mit `/citations/resolution` von Codex aufgelöst; was nicht eindeutig ist, kommt
  auf die Prüfliste.

### Ablauf bei einer neuen Fassung (FLW-F-40, **EMPFOHLEN**)

1. Codex übernimmt eine neue Fassung (nach Bestätigung durch die Redaktion) und sendet `codex.act_version.created`.
2. Flow nimmt das Ereignis über `POST /api/v1/org/source-changes` an (Servicekonto); gleiche `codex_event_id` wird nicht
   doppelt verarbeitet.
3. Flow sucht die Vorlagen mit Schritten auf diesem Erlass, deren geprüfte Fassung älter ist **und deren zitierter
   Paragraf sich geändert hat** (E21), und macht deren Review fällig. **Laufende Abläufe werden nicht verändert.**
4. Prüfauftrag an die Prozessverantwortlichen der Vorlage (E5); im Review wird die geprüfte Fassung je Schritt
   nachgeführt.

### Prototyp

`tools/flow_codex_auszug.py` erzeugt aus den Daten des Codex-Prototyps einen statischen Auszug
(`assets/codex-auszug.js`): 11 Erlasse mit aktueller Fassung (10 davon unter den Rechtsgrundlagen Volksschule),
17 Merkblätter, 6 schuleigene Unterlagen. Die Prototypen bleiben zur Laufzeit unabhängig (AGENTS.md). Die Seite zeigt je
Quelle die Fassung in Codex und unter «Abgleich mit EduKSX-Codex» die Erlasse, deren aktuelle Fassung nach dem letzten
Review einer Vorlage publiziert wurde; «Übernehmen» spielt das Ereignis nach.

Befunde aus dem Abgleich (für Codex):

- **UVG** (SR 832.20) hat in Codex Fassungen (Fedlex), steht aber nicht unter den Rechtsgrundlagen Volksschule – Aufnahme
  vorschlagen (Unfallmeldung).
- **GesG** war in Flow ohne Ordnungsnummer erfasst; ergänzt (LS 810.1).
- Gemeindeeigene Regelungen (Geschäftsordnung, Personalverordnung, Gemeindeordnung) machen den grössten Teil der
  44 Schritte «ZU PRÜFEN» aus; sie gehören in die kommunale Sammlung der Organisation in Codex (E24).

### Entscheide

| Nr. | Frage | Optionen | Empfehlung | Status |
|---|---|---|---|---|
| E20 | Wer führt Erlasse und Fassungen? | Flow / Codex | Codex führt, Flow speichert nur Verweis, Stelle und geprüfte Fassung | EMPFOHLEN |
| E21 | Wann wird ein Review fällig? | jede neue Fassung des Erlasses / nur wenn die zitierte Stelle geändert hat | **nur wenn der zitierte Paragraf geändert hat.** Setzt voraus, dass Codex Unterschiede je § liefert (Codex-Konzept «Textfassung», bisher OFFEN – wird damit Voraussetzung). Schritte ohne Stellenangabe: jede Fassung des Erlasses gilt als Änderung (ZU PRÜFEN). Im Prototyp ohne §-Unterschiede nur auf Erlass-Ebene simuliert (#119) | BESCHLOSSEN 24.11.2026 |
| E22 | Wer erhält den Prüfauftrag? | Prozessverantwortliche der Vorlage / Empfänger aus Codex (CDX-F-32) | Prozessverantwortliche (E5); Codex informiert weiterhin seine eigenen Empfänger | EMPFOHLEN |
| E23 | Merkblätter und Arbeitshilfen von Behörden (VSA, SUVA, Gemeindeamt) in Codex aufnehmen? | ja, als eigene Klasse / nein, bleibt Freitext in Flow | **ja** – in Codex aufnehmen; Einordnung in die Quellenklassen A–F von Codex ZU PRÜFEN; Flow verweist dann auch bei Merkblättern auf Codex (#121) | BESCHLOSSEN 24.11.2026 |
| E24 | Gemeindeeigene Erlasse | in Flow als Freitext / über die kommunale Sammlung in Codex | über Codex (kommunale Sammlung der Organisation); löst die meisten «ZU PRÜFEN» | EMPFOHLEN |

## 6. Issues

Nachgetragen am 24.11.2026; umgesetzte Stände stehen auf `_3 Beta-Test` (Testliste im Issue).

| Issue | Inhalt | Status |
|---|---|---|
| [#107](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/107) | 0.7.0: Stufe 1 der Prozess-Engine | Beta-Test |
| [#108](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/108) | 0.8.0: Menü Einstellungen mit Katalogen | Beta-Test |
| [#109](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/109) | 0.9.0: Einstellungen mit Kalender und Funktionendiagramm verknüpft | Beta-Test |
| [#110](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/110) | 0.10.0: Prozessverantwortung, Eskalation, Kompetenzmerkmale | Beta-Test |
| [#111](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/111) | 0.11.0: Stufe 2 der Prozess-Engine | Beta-Test |
| [#112](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/112) | 0.12.0/0.13.0: Katalog Periode, Tooltips, Farbe und Label | Beta-Test |
| [#113](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/113) | 0.14.0: Mehrjährige Termine im Jahreskalender (E19) | Beta-Test |
| [#114](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/114) | 0.15.0: Stufe 3 – Prozesslenkung, Reviews, Prozesslandkarte | Beta-Test |
| [#115](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/115) | 0.16.0: Stufe 3 – Rechtsgrundlagen, Versionsvergleich, Vorlagenbibliothek | Beta-Test |
| [#116](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/116) | 0.17.0: Rechtsgrundlagen aus EduKSX-Codex | Beta-Test |
| [#117](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/117) | Entscheid E19: Periode und Intervall: getrennt mit Verknüpfung? | zu entscheiden |
| [#118](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/118) | Entscheid E20: Wer führt Erlasse und Fassungen – Codex oder Flow? | zu entscheiden |
| [#119](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/119) | Entscheid E21: Wann wird ein Review nach einer Rechtsänderung fällig? | beschlossen 24.11.2026 |
| [#120](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/120) | Entscheid E22: Wer erhält den Prüfauftrag bei einer neuen Fassung? | zu entscheiden |
| [#121](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/121) | Entscheid E23: Merkblätter und Arbeitshilfen von Behörden in EduKSX-Codex aufnehmen? | beschlossen 24.11.2026 |
| [#122](https://github.com/MarkusKeller8200/EduKSX-Prototyp/issues/122) | Entscheid E24: Gemeindeeigene Erlasse über die kommunale Sammlung in Codex verweisen? | zu entscheiden |

## 7. Verlauf

- 2026-11-24: E21 (nur bei geändertem Paragrafen) und E23 (Merkblätter in Codex) beschlossen; Issues #107–#122 nachgetragen.
- 2026-11-24: Rechtsgrundlagen als Teil von EduKSX-Codex gekennzeichnet, Abgleich und Schnittstelle (0.17.0, Abschnitt 5b; E20–E24).
- 2026-11-24: Stufe 3 umgesetzt (0.15.0 Prozesslenkung, Reviews, Prozesslandkarte; 0.16.0 Rechtsgrundlagen, Versionsvergleich, Vorlagenbibliothek) – während Abwesenheit der Projektleitung, zur Abnahme.
- 2026-11-24: Katalog Periode und Tooltips (0.12.0), E19 empfohlen.
- 2026-11-24: Stufe 2 im Prototyp 0.11.0 (Stellvertretung, Delegation, Vier-Augen, Mehrfachgenehmigung, rollenbasierte Übersicht, Kalender Monat/Woche, ICS). Offen aus Stufe 2: Organisationseinheiten, Funktionspostfächer, ICS-Abo mit fester Adresse (erst mit Server).
- 2026-11-24: E5, E6, E14 im Prototyp 0.10.0 umgesetzt.
- 2026-11-24: Entscheide E5, E6, E14, E15 beschlossen (Rückfrage im Chat).
- 2026-11-24: Einstellungen verknüpft (0.9.0): E16, E17 beschlossen; Funktionendiagramm bearbeitbar.
- 2026-11-24: Einstellungen (Kataloge) im Prototyp 0.8.0; Entscheide E14–E18 ergänzt.
- 2026-11-24: Konzept angelegt aus dem Review; Stufe 1 freigegeben und im Prototyp 0.7.0 umgesetzt.
