# EduKSX-Staffing – Anforderungen (Prototyp)

Stand: 2026-11-16 · Prototyp `prototypen/einsatzplanung` · Version 0.1.0 · Kanton Zürich als erster Kanton

**EduKSX-Staffing** ist das Modul der EduKSX-Plattform für die **Einsatzplanung** von Lehrpersonen und weiteren
Mitarbeitenden einer Schule: Pensen, Ressourcen, Berufsauftrag, Anstellungsfreigaben, Pensenumfrage,
Stellvertretungen, Personalgespräche und die Planung der Tagesstrukturen. Es richtet sich an Schulleitungen,
Schulverwaltungen und Leitungen der Tagesstrukturen. Schüleradministration, Noten, Zeugnisse, Raumreservationen
und die zeitliche Stundenplanung gehören **nicht** dazu (siehe Abgrenzung).

Verbindlichkeitsstufen wie in `docs/KONZEPT-VORLAGE.md`: **BESCHLOSSEN**, **EMPFOHLEN**, **OFFEN**, **ZU PRÜFEN**.
Alles in diesem Dokument ist ein Vorschlag aus dem Prototyp und noch nicht freigegeben, ausser es steht
ausdrücklich BESCHLOSSEN. Die Spalte «Prototyp» zeigt, ob der Punkt im Klickprototyp zu sehen ist
(✓ bedienbar, ◐ angedeutet, – nicht enthalten).

## 1. Grundprinzip

Die Schule erhält **Ressourcen** (Budget nach Ressourcentyp). Daraus entstehen **Gefässe** – Klassenlektionen,
weitere Unterrichtsressourcen, Ämter und Aufgaben des Berufsauftrags. Gefässe werden **Personen zugewiesen**; daraus
ergeben sich Pensum und Arbeitszeit jeder Person. Die Schulleitung **gibt** abgeschlossene Planungen **frei**, die
Schulverwaltung **stellt an** und kontrolliert den Verbrauch. Jede Änderung nach einer Freigabe bleibt
nachvollziehbar.

```
Ressourcenbudget ─► Gefässe (Lektionen, Aufgaben, Ämter) ─► Zuweisung an Personen ─► Pensum / Berufsauftrag
                                                                                 └─► Freigabe ─► Anstellung (Verwaltung)
```

## 2. Vorgaben Kanton Zürich (Volksschule)

Grundlage: öffentliche Seiten und Dokumente des Volksschulamts zur Klassen- und Stellenplanung (Stand der Abfrage
16.11.2026). EduKSX-Staffing hinterlegt diese Werte als **Parameter je Kanton und Schuljahr**; sie sind vor dem
Einsatz mit den Originaldokumenten zu prüfen (ZU PRÜFEN). Rechtsgrundlagen: Lehrpersonalgesetz (LPG),
Lehrpersonalverordnung (LPVO), Volksschulverordnung (VSV).

### 3.1 Zuteilung der Stellen (VZE)

| ID | Regel / Wert | Stufe | Prototyp |
|---|---|---|---|
| ST-Z1 | VZE Berufsauftrag = Schülerzahl × Sozialindex × Korrekturfaktor / (Basiswert × 100); Schülerzahl am Stichtag 15. September, Sozialindex (100–120) als Mittel der drei Vorjahre. | EMPFOHLEN | ✓ |
| ST-Z2 | Basiswerte KG 22.41, Primar 17.65, Sek 16.88; Korrekturfaktor 2026/27 KG/Primar 1.031, Sek 1.032. | ZU PRÜFEN | ✓ |
| ST-Z3 | 1 VZE Berufsauftrag = 27.3 Wochenlektionen. | ZU PRÜFEN | ✓ |
| ST-Z4 | VZE Schulleitung: Sockel 0.204 je Schulgemeinde + 0.041 je VZE Berufsauftrag; ab 25 VZE zusätzlich 0.128 je 25 VZE (gilt 2026/27–2028/29). Kommunale Erweiterungen (z. B. Direktunterstellung 0.0175 VZE je 100 %, Kurzvikariate 0.0065 je VZE) mit Bewilligung. | EMPFOHLEN | ✓ |
| ST-Z5 | Gestaltungspool 0.028 × VZE Berufsauftrag; Verwendung: höhere Pensen, zusätzliche Unterrichts-/IF-Lektionen, Teamteaching, Schulleitung, Vikariate bis 14 Schulwochen je Einsatz. | EMPFOHLEN | ✓ |
| ST-Z6 | Koordination Sekundarschule 0.011 × VZE Berufsauftrag Sek (kommunal finanziert). | EMPFOHLEN | ✓ |
| ST-Z7 | IF-Mindestangebot KG 0.4, Primar 0.5 VZE je 100 SuS, Sek nach Gemeinde; Therapien höchstens KG 0.6, Primar 0.4, Sek 0.1 VZE je 100 SuS; nicht genutzte Therapie-VZE mit Bewilligung in IF umlagerbar (gleiche Stufe). | EMPFOHLEN | ◐ |
| ST-Z8 | DaZ-Aufnahmeunterricht ausserhalb der VZE: KG 0.5–0.75 WL, Primar/Sek 1. Jahr 2 WL, 2./3. Jahr 0.5–0.75 WL je Schüler/in. | EMPFOHLEN | ✓ |
| ST-Z9 | Ressourcen ausserhalb des Berufsauftrags getrennt führen (z. B. Vikariate, DaZ-Aufnahmeunterricht, Therapien, Klassen- und Schulassistenzen, Aufgabenstunde, Tagesstrukturen, Schulsozialarbeit, Schulverwaltung). | EMPFOHLEN | ✓ |
| ST-Z10 | Kredit bei Zunahme um ≥ 5 Schüler/innen (zusätzliche SuS × Sozialindex / 100 / Basiswert) und Stellenpool-Gesuch; Rückforderung bei Rückgang. | OFFEN | – |
| ST-Z11 | Weitere Zusatzressourcen (ISR, QUIMS bis 75 % des Staatsbeitrags, PICTS) als eigene Ressourcentypen. | OFFEN | – |

### 3.2 Klassenbildung und Lektionentafel

| ID | Regel / Wert | Stufe | Prototyp |
|---|---|---|---|
| ST-Z12 | VZE und Lektionen je Klasse nach Tabelle «Klassen und VZE Pflichtlektionen» (z. B. Sek 1. Jg. 1.39 VZE / 38 WL, 2. Jg. 1.36 / 37, 3. Jg. A 0.73–0.81 / 20–22, B/C 0.77–0.84 / 21–23). | EMPFOHLEN | ✓ |
| ST-Z13 | Lektionentafel Sek je Jahrgang mit Halbklassen (WAH 1. Jg., TTG 2. Jg.); im 3. Jg. 3 WL je Klasse und übrige Wahlfächer kommunal. Lektionentafel 3. Jg. im Prototyp vereinfacht. | ZU PRÜFEN | ✓ |
| ST-Z14 | Höchstzahlen (VSV § 21): Sek A 25/23, B 23/21, C 18/16 (einklassig/mehrklassig), KG 21, Primar 25/21; mehr als drei über dem Maximum → Halbklassen-/Teamteaching-Lektionen oder Teilung (§ 22) innerhalb der VZE. | EMPFOHLEN | ✓ |
| ST-Z15 | Variante der Sekundarschule (2 oder 3 Abteilungen) und höchstens 3 Fächer in Anforderungsstufen melden. | EMPFOHLEN | ◐ |

### 3.3 Berufsauftrag und Beschäftigungsgrad

| ID | Regel / Wert | Stufe | Prototyp |
|---|---|---|---|
| ST-Z16 | Vier Tätigkeitsbereiche: Unterricht, Schule, Zusammenarbeit, Weiterbildung (LPG §§ 18–18c), dazu Klassenlehrperson. | EMPFOHLEN | ✓ |
| ST-Z17 | Unterricht 58 h je Wochenlektion (Berufseinführung +1.5 h); Klassenlehrperson 100 h je Klasse (bei zwei Personen aufteilbar); Pauschalen bei 100 %: Schule 60 h, Zusammenarbeit 50 h, Weiterbildung 30 h, anteilig. | EMPFOHLEN | ✓ |
| ST-Z18 | Netto-Jahresarbeitszeit bei 100 % nach Ferienanspruch: bis 20 J. 1'873 h, 21–49 J. 1'890 h, ab 50 J. 1'873 h, ab 60 J. 1'831 h (brutto 2'184 h). Ersetzt die «Mehrferien»-Rechnung. | EMPFOHLEN | ✓ |
| ST-Z19 | Beschäftigungsgrad so, dass Beschäftigungsgrad × Netto-Jahresarbeitszeit vollständig auf die Bereiche verteilt ist. | EMPFOHLEN | ✓ |
| ST-Z20 | Prüfregeln: Pensum in der Regel ≥ 35 %, höchstens 100 %; mindestens 60 % der Netto-Arbeitszeit im Unterricht; Klassenlehrperson Sek mindestens 6 WL in der Klasse; Kustodien bis 50 h im Berufsauftrag, darüber Entscheid der Schulpflege. | EMPFOHLEN | ✓ |
| ST-Z21 | Unterjährige Änderungen und Absenzen > 1 Monat kürzen die Jahresarbeitszeit um 1/12 je Monat; Saldo positiv höchstens 300 h übertragbar, verschuldet negativ höchstens 50 h. Gehört zur Zeiterfassung (EduKSX-Time). | OFFEN | – |

### 3.4 Fristen und Meldungen

| ID | Regel / Wert | Stufe | Prototyp |
|---|---|---|---|
| ST-Z22 | Jahresablauf mit Fristen: Stichtag Schülerzahlen 15.9.; Beschäftigungsgrad vor Weihnachten klären; Stellenplan, Zusammenstellung VZE und VZE-Tool bis 15.2.; Korrekturen Schülerzahlen/Kredit/Umlagerung bis 30.6.; Klassenbildung vor den Sommerferien; Vakanzen bis 30.9. | EMPFOHLEN | ✓ |
| ST-Z23 | Export im Format der kantonalen Unterlagen («Zusammenstellung VZE», «VZE Mutationen»); Stellen erst besetzen, wenn die VZE innerhalb der zugeteilten liegen. | EMPFOHLEN | ◐ |
| ST-Z25 | **VZE-Tool des VSA exakt befüllen:** Die Schulgemeinde lädt das jährlich vom VSA gelieferte Excel-Tool; EduKSX-Staffing schreibt die Planung (Klassenbildung je Schuleinheit, Gestaltungspool, IF, Erhöhung Beschäftigungsgrad, Vikariate aus dem Gestaltungspool, Blatt Schulleitung, Kontrolle Sonderpädagogik) nur in die Eingabezellen. Formatierung, Formeln, Kommentare, Blattschutz und ausgeblendete Blätter bleiben unverändert; Excel rechnet beim Öffnen neu. Zellbelegung je Tool-Version (ab VSA 2.19). Datei wird nur lokal verarbeitet. | BESCHLOSSEN | ✓ |
| ST-Z26 | Weitere Blätter des VZE-Tools befüllen (Abteilungen und Anforderungsstufen, kommunale Erweiterung, Zus. ISR, Antrag zusätzliche VZE) und Eingaben aus einem bestehenden VZE-Tool übernehmen (Import). | OFFEN | – |
| ST-Z24 | Mutationen während des Schuljahres: was, warum, Lektionen, Quelle (Gestaltungspool/Stellenpool), Person, Startdatum (Montag); erst nach Bewilligung ins Personalsystem. | EMPFOHLEN | ✓ |

**Quellen (Kanton Zürich, Bildungsdirektion, Volksschulamt):**
[Klassen- und Stellenplanung](https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule/volksschule-fuehrung/volksschule-klassen-stellen-planen.html) ·
[Berechnung von Stellen](https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule/volksschule-fuehrung/volksschule-klassen-stellen-planen/volksschule-stellen-berechnen.html) ·
[Planung von Stellen](https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule/volksschule-fuehrung/volksschule-klassen-stellen-planen/volksschule-stellen-planen.html) ·
[Bewilligung von Stellen](https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule/volksschule-fuehrung/volksschule-klassen-stellen-planen/volksschule-stellen-bewilligen.html) ·
[Planung des Schuljahres](https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule/volksschule-fuehrung/volksschule-klassen-stellen-planen/volksschule-schuljahr-planen.html) ·
Weisung Lehrerstellenbewilligung und VZE 2026/27 · Handbuch Berufsauftrag für Schulleitungen (Stand 1.1.2024) ·
Lektionenzusammenstellung Sekundarstufe · Maximale Klassengrösse an der Volksschule · Klassen und VZE Pflichtlektionen.
Die kantonalen Excel-Werkzeuge (VZE-Tool, Planungstool Berufsauftrag, Zeiterfassung) dienen als fachliche
Referenz; EduKSX-Staffing ersetzt deren Rechnungen, liefert aber die Meldungen im verlangten Format.

## 3. Schule, Schuljahr und Stammdaten

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-A1 | Mehrere Schulen je Schulgemeinde; berechtigte Personen wechseln zwischen Schulen. | EMPFOHLEN | ◐ |
| ST-A2 | Planung je Schuljahr; Wechsel zwischen Schuljahren zum Nachschlagen früherer Stände. | EMPFOHLEN | ◐ |
| ST-A3 | Neues Schuljahr aus dem Vorjahr übernehmen (Klassen, Gefässe, Zuweisungen als Entwurf). | EMPFOHLEN | ◐ |
| ST-A4 | Klassen und Klassentypen (z. B. Abteilungen, altersdurchmischte Klassen, Lernlandschaften) erfassen. | EMPFOHLEN | ✓ |
| ST-A5 | Lektionentafeln je Klassentyp; kantonale Vorlagen übernehmen und schulspezifisch anpassen. | EMPFOHLEN | ✓ |
| ST-A6 | Personen, Klassen und Organisationseinheiten kommen aus **EduKSX-Ident** (führende Quelle); Import aus Dateien nur als Übergang. | EMPFOHLEN | – |
| ST-A7 | Eigene Einheiten und Ressourcentypen in den Voreinstellungen der Schule. | EMPFOHLEN | ◐ |

## 4. Personen, Anstellungen und Pensum

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-B1 | Personendetail: Anstellungen, Zuweisungen, Berufsauftrag und Pensum auf einen Blick. | EMPFOHLEN | ✓ |
| ST-B2 | Mehrere Anstellungen je Person (z. B. Lehrperson und Klassenassistenz). | EMPFOHLEN | ◐ |
| ST-B3 | Beschäftigungsgrad nach Berufsauftrag (ST-Z17–Z19) mit Prüfregeln (ST-Z20). | EMPFOHLEN | ✓ |
| ST-B4 | Faktor und Stunden je Zuweisung abweichend festlegen (begründet, sichtbar markiert). | EMPFOHLEN | ◐ |
| ST-B5 | Netto-Jahresarbeitszeit nach Alter (Ferienanspruch) berücksichtigen (ST-Z18); fehlende Ressourcen für ältere Lehrpersonen kommunal ausgleichen (ab 50 J. 27 Tage, ab 60 J. 32 Tage). | EMPFOHLEN | ✓ |
| ST-B6 | Pensenübersicht je Person als PDF (aktueller Stand und Stand der letzten Freigabe). | EMPFOHLEN | ◐ |

## 5. Klassen und Unterricht

Gemeint ist die **mengenmässige und personelle** Zuweisung von Unterricht, nicht die zeitliche Platzierung im
Stundenplan (das ist Sache eines Stundenplanmoduls).

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-C1 | Eine oder mehrere Klassenlehrpersonen je Klasse. | EMPFOHLEN | ✓ |
| ST-C2 | Lektionen der Klasse direkt einer Person zuweisen; Pool aller Klassenlektionen. | EMPFOHLEN | ✓ |
| ST-C3 | Filter «offene Lektionen»: noch nicht zugewiesene Lektionen auf einen Blick. | EMPFOHLEN | ✓ |
| ST-C4 | Klassenübergreifende Lektionen über gemeinsame Gefässe oder anteilige Zuweisung je Klasse. | EMPFOHLEN | – |
| ST-C5 | Niveauunterricht, Teamteaching und geteilte Einsätze über mehrere anteilige Zuweisungen. | EMPFOHLEN | ◐ |
| ST-C6 | Sonderpädagogische und weitere Unterrichtsressourcen (z. B. IF, DaZ, Begabtenförderung) als eigene Gefässe. | EMPFOHLEN | ✓ |

## 6. Berufsauftrag

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-D1 | Stunden für Unterricht automatisch aus den Lektionen (Faktor je Wochenlektion, als Parameter). | EMPFOHLEN | ✓ |
| ST-D2 | Pauschale für die Klassenlehrperson (Parameter, je Person änderbar). | EMPFOHLEN | ✓ |
| ST-D3 | Stunden den Bereichen des Berufsauftrags zuordnen (Unterricht, Schule, Zusammenarbeit, Weiterbildung). | EMPFOHLEN | ◐ |
| ST-D4 | Ämter und Aufgaben als Gefässe; entschädigte Ämter getrennt ausweisen. | EMPFOHLEN | ✓ |
| ST-D5 | Ein Gefäss mehreren Personen zuweisen; Teilnehmendenliste bearbeiten. | EMPFOHLEN | ✓ |
| ST-D6 | Verteilregeln je Gefäss: fest je Person, linear nach Wochenlektionen (Basis 27.3 WL), mit Sockel und Maximum; Gefässe entweder als Verwendung der Pauschalen (Schule, Zusammenarbeit, Weiterbildung) oder als zusätzliche Stunden. | EMPFOHLEN | ✓ |
| ST-D7 | Berechnete Stunden je Person korrigieren; Korrektur bleibt sichtbar. | EMPFOHLEN | ◐ |
| ST-D8 | Zuweisungen von einer Person oder einem Gefäss kopieren. | EMPFOHLEN | – |
| ST-D9 | Präsenz- und Teilnehmendenlisten sowie Gesamtexport aller Gefässe (Tabelle). | EMPFOHLEN | ◐ |

Die Parameter richten sich nach den kantonalen Vorgaben (für Zürich siehe Abschnitt 2) und werden **je Kanton und
Schuljahr gepflegt**.

## 7. Ressourcen und Controlling

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-E1 | Ressourcenbudget je Ressourcentyp; kantonale Budgets (VZE Berufsauftrag, Gestaltungspool, DaZ) aus der Stellenberechnung, kommunale und ausserhalb des Berufsauftrags von Hand. | EMPFOHLEN | ✓ |
| ST-E2 | Verbrauch automatisch aus den Zuweisungen; Saldo verfügbar – verplant. | EMPFOHLEN | ✓ |
| ST-E3 | Ressourcenposten: welche Gefässe und Personen eine Ressource verbrauchen. | EMPFOHLEN | ✓ |
| ST-E4 | Zwei Sichten: Schulleitung (Planungsstand inkl. Entwürfe) und Schulverwaltung (nur freigegebene Pensen); Vergleich nebeneinander. | EMPFOHLEN | ✓ |
| ST-E5 | Schulverwaltung kann das Budget für die Schulleitung sperren. | EMPFOHLEN | ✓ |
| ST-E6 | Mehrferien als Ressource ausgleichen, wenn die Schule das so regelt. | ZU PRÜFEN | – |
| ST-E7 | Warnung bei Überschreitung des Budgets (nicht blockierend, mit Begründung). | EMPFOHLEN | ✓ |

## 8. Freigabe und Anstellung

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-F1 | Planung je Person zur Anstellung freigeben; Sammelfreigabe mehrerer Personen. | EMPFOHLEN | ✓ |
| ST-F2 | Status sichtbar ohne Farbe allein (Symbol und Text): Entwurf, freigegeben, geändert nach Freigabe, angestellt. | EMPFOHLEN | ✓ |
| ST-F3 | Freigabe zurückziehen. | EMPFOHLEN | ✓ |
| ST-F4 | Änderungen nach der Freigabe erkennen, anzeigen und mit dem freigegebenen Stand vergleichen. | EMPFOHLEN | ✓ |
| ST-F5 | Verlauf aller Freigaben und unterjährigen Änderungen. | EMPFOHLEN | ✓ |
| ST-F6 | Schulverwaltung markiert «angestellt» bzw. «erledigt», erfasst Bemerkungen, quittiert Änderungsanzeigen. | EMPFOHLEN | ✓ |
| ST-F7 | Freigaben laufen als Ablauf über **EduKSX-Flow** (Benachrichtigung, Fristen, Stellvertretung der Freigebenden). | EMPFOHLEN | – |

## 9. Auswertungen und Exporte

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-G1 | Jede Liste als interaktive Ansicht und als Tabelle; Filter nach Anstellung, Status, Klasse, Ressource. | EMPFOHLEN | ◐ |
| ST-G2 | Exporte: Personalliste (je Person bzw. je Anstellung), Ressourcen, Berufsauftrag, Präsenzlisten (CSV/XLSX), Pensenübersicht (PDF). | EMPFOHLEN | ◐ |
| ST-G3 | Vorlage für die Arbeitszeiterfassung; die Erfassung selbst gehört zu **EduKSX-Time**. | EMPFOHLEN | – |

## 10. Pensenumfrage

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-H1 | Vorbereitete Umfrage für das nächste Schuljahr; Mitarbeitende einladen, Teilnahmestand verfolgen, erinnern. | EMPFOHLEN | ✓ |
| ST-H2 | Angaben: Weiterbeschäftigung, Pensenwunsch (Lektionen/Prozent), Stufen und Fächer, Klassen- und Aufgabenwünsche, Interesse Klassenlehrperson, verbindliche Sperrzeiten, bevorzugte freie Zeiten, Bemerkungen. | EMPFOHLEN | ✓ |
| ST-H3 | Zusammenfassung für die Planung; Pensenwunsch neben dem geplanten Pensum. | EMPFOHLEN | ✓ |
| ST-H4 | Eingereichte Angaben nachbearbeiten (mit Verlauf). | EMPFOHLEN | – |
| ST-H5 | Eigene Fragen je Schule ergänzen. | OFFEN | – |
| ST-H6 | Sperrzeiten an ein Stundenplanmodul weitergeben. | OFFEN | – |

## 11. Personaldossier und Mitarbeitendengespräche

Besonders schützenswerte Personendaten: Zugriff nur für die zuständige Schulleitung und die von ihr bestimmten
Personen; jede Einsicht wird protokolliert.

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-I1 | Termine für Mitarbeitendenbeurteilung, Probezeitgespräch und Unterrichtsbesuch planen und überblicken. | EMPFOHLEN | ✓ |
| ST-I2 | Formulare aus vorhandenen Daten vorausfüllen; Vorlagen je Schule. | EMPFOHLEN | ◐ |
| ST-I3 | Unterlagen je Person und Gespräch ablegen (Dossier). | EMPFOHLEN | ◐ |
| ST-I4 | Kenntnisnahme bzw. Unterschrift über **EduKSX-Sign**; Signaturstufe je Dokumentart festlegen. | ZU PRÜFEN | – |
| ST-I5 | Weitergabe ausgewählter Unterlagen an die Schulverwaltung. | EMPFOHLEN | ◐ |
| ST-I6 | Aufbewahrungs- und Löschfristen je Dokumentart, automatische Löschung nach Ablauf. | EMPFOHLEN | – |

## 12. Stellvertretungen

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-J1 | Ausfälle erfassen (Person, Zeitraum, Grund-Kategorie ohne Diagnose). | EMPFOHLEN | ✓ |
| ST-J2 | Vikariat planen: Stellvertretung, Lektionen bzw. Einsätze, Zeitraum. | EMPFOHLEN | ✓ |
| ST-J3 | Übersicht aller Ausfälle und Einsätze; Rapporte der geleisteten Einsätze. | EMPFOHLEN | ✓ |
| ST-J4 | Formulare vorausfüllen; Unterschrift über **EduKSX-Sign**. | EMPFOHLEN | ◐ |
| ST-J5 | Ablauf: erfasst → geplant → unterschrieben → an Schulverwaltung → an Kanton gemeldet. | EMPFOHLEN | ✓ |
| ST-J6 | Vorschläge für verfügbare Stellvertretungen (Pool, Sperrzeiten, Fächer). | OFFEN | – |
| ST-J7 | Meldung an die kantonale Stelle über eine Schnittstelle von **EduKSX-Connect**, soweit der Kanton eine anbietet. | ZU PRÜFEN | – |

## 13. Tagesstrukturen

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-K1 | Betreuungsangebote (Modul, Wochentag, Zeitfenster, angemeldete Kinder). | EMPFOHLEN | ✓ |
| ST-K2 | Personalbedarf aus Angebot und Planungsparametern (Betreuungsschlüssel, Mindestbesetzung) berechnen. | EMPFOHLEN | ✓ |
| ST-K3 | Pensen der Mitarbeitenden der Tagesstrukturen planen; Soll-Ist-Vergleich. | EMPFOHLEN | ✓ |
| ST-K4 | Statistiken (Auslastung, Bedarf je Wochentag). | EMPFOHLEN | ◐ |
| ST-K5 | Freigabe zur Anstellung wie ST-F. | EMPFOHLEN | ◐ |
| ST-K6 | Berechnungslogik (Quoten, Anwesenheiten, Zeitfenster) mit Betreuungsleitungen abstimmen. | OFFEN | – |

## 14. Übergreifend: Bedienung, Rollen, Sicherheit

Diese Punkte folgen den Standards der EduKSX-Plattform (EduKSX-Core) und sind bewusst ausführlicher als üblich.

| ID | Anforderung | Stufe | Prototyp |
|---|---|---|---|
| ST-L1 | Webanwendung, Desktop/Tablet/Smartphone, hell/dunkel, Auftritt nach CI MarKusSXCH (Wortmarke EduKSX-Staffing, Orange als UI-Akzent). | EMPFOHLEN | ✓ |
| ST-L2 | Rollen: Schulleitung, Schulverwaltung, Betreuungsleitung, Mitarbeitende (Umfrage), Administration; Rechte als Matrix dokumentiert und je Schule anpassbar. | EMPFOHLEN | ◐ |
| ST-L3 | Anmeldung über **EduKSX-Ident** (Entra ID / SSO, OpenID Connect, MFA); Benutzer über SCIM. | EMPFOHLEN | – |
| ST-L4 | REST-API nach EduKSX-API-Standard und Ereignisse (z. B. «Anstellung freigegeben») für Lohn- und Personalsysteme über **EduKSX-Connect**. | EMPFOHLEN | – |
| ST-L5 | Änderungsprotokoll auf Feldebene (wer, wann, alt/neu) und Einsichtsprotokoll für Personaldossiers. | EMPFOHLEN | ◐ |
| ST-L6 | Mehrere Personen gleichzeitig; Konflikte werden erkannt (Optimistic Locking). | EMPFOHLEN | – |
| ST-L7 | Daten in der Schweiz; Betrieb selbst gehostet (EduKSX-Suite) oder gehostet; keine Weitergabe an Monitoringdienste im Ausland. | EMPFOHLEN | – |
| ST-L8 | Sicherung, Wiederherstellung mit dokumentiertem RTO/RPO; regelmässige unabhängige Sicherheitsprüfung. | EMPFOHLEN | – |
| ST-L9 | Barrierefreiheit WCAG 2.1 AA: Kontrast, Tastatur, Fokus, Screenreader, Status nie nur über Farbe. | EMPFOHLEN | ✓ |
| ST-L10 | Hilfetexte an Feldern und Kennzahlen (Tooltips); Abkürzungen (VZE, WL, IF, DaZ, KLP, MAB …) erklärt **EduKSX-Glossary** – Einbindung «feste Version mit Prüfsumme (SRI)», die Anwendung bestimmt die erklärten Bereiche (Beschreibungen, Hinweise, Gesetzestexte; nicht Tabellen und Eingaben) und die Fachgebiete; abschaltbar; keine Daten an das Glossary, keine Cookies. | BESCHLOSSEN | ✓ |
| ST-L11 | **Gesetzliche Grundlagen in der Hilfe:** LPG, LPVO und Vollzugsverordnung zum Personalgesetz (VVO, LS 177.111; gilt, soweit die LPVO darauf verweist) des Kantons Zürich vollständig, gegliedert nach Abschnitten und Paragraphen mit Randtiteln, durchsuchbar, §-Verweise im Text verlinkt, auch von der LPVO in die VVO; Stand und Link zur amtlichen Fassung. Regeln, Warnungen und Parameter der Anwendung verweisen direkt auf die Bestimmung (z. B. Mindestpensum → LPG § 6 Abs. 1). Bei neuem Stand neu aufbereiten (`tools/recht_aufbereiten.py`). | BESCHLOSSEN | ✓ |

## 15. Einbettung in die EduKSX-Plattform

| Modul | Rolle für EduKSX-Staffing | Stufe |
|---|---|---|
| EduKSX-Core | Fehler, Sicherheit, Pagination, ETag, Konformitätstests | EMPFOHLEN |
| EduKSX-Ident | Personen, Organisationseinheiten, Anmeldung, Rollen | EMPFOHLEN |
| EduKSX-Time | Arbeitszeiterfassung auf Basis des geplanten Pensums | EMPFOHLEN |
| EduKSX-Flow | Freigaben, Stellvertretungsablauf, Erinnerungen der Umfrage | EMPFOHLEN |
| EduKSX-Sign | Unterschriften für Stellvertretung und Gespräche | ZU PRÜFEN |
| EduKSX-Connect | Export an Lohn-/Personalsysteme und kantonale Meldungen | ZU PRÜFEN |
| EduKSX-Glossary | Begriffe wie Berufsauftrag, Gestaltungspool, VZE | EMPFOHLEN |

## 16. Abgrenzung (Nichtziele)

- Keine Schüleradministration, keine Noten und Zeugnisse, keine Raumreservation.
- Keine zeitliche Stundenplanung (nur Mengen und Personen); Sperrzeiten werden höchstens weitergegeben.
- Keine Lohnberechnung; Pensum und Anstellungsdaten gehen an das Lohnsystem.
- Keine eigene Benutzerverwaltung neben EduKSX-Ident.

## 17. Offene Fragen

1. Wer pflegt die kantonalen Parameter je Schuljahr (Abschnitt 2), und wie werden sie gegen die Originaldokumente
   geprüft? Lektionentafel 3. Sek im Original nachtragen.
2. Wie fein sollen Rollen und Rechte sein (z. B. Stufenleitung mit Teilrechten)?
3. Gehören Personaldossier/Gespräche in EduKSX-Staffing oder in ein eigenes Modul mit strengeren Rechten?
4. Welche Signaturstufe genügt für Stellvertretungs- und Gesprächsdokumente?
5. Welche Lohn- bzw. Personalsysteme und kantonalen Meldestellen sollen angebunden werden?
6. Berechnungslogik der Tagesstrukturen (siehe ST-K6).
7. Wie werden «Sockel bis» und «Gesamte Zeit ab» bei linearen Gefässen genau bemessen (WL oder Beschäftigungsgrad)? Siehe ST-P6.

## 18. Planungsdaten im Detail (Ergänzung)

Die folgenden Informationen muss EduKSX-Staffing erfassen und auswerten. Vorlage war eine Liste fachlicher Angaben
aus dem Planungsalltag. Die Bedienoberfläche ist eigenständig im EduKSX-Design gestaltet: keine fremden Layouts,
Farbcodes oder Symbolleisten.

| Nr. | Anforderung | Status |
|---|---|---|
| ST-P1 | **Personen:** Kürzel, Geburtsdatum, Alter am Stichtag (1.8.), Ferienanspruch und Netto-Jahresarbeitszeit, Neuanstellung, Berufseinführung (+1,5 h je WL), Quereinstieg; vereinbarter Beschäftigungsgrad (Soll) gegen den aus der Zuteilung berechneten (Ist) mit Differenz in Stunden (Hinweis ab ±5 h); Anteil kantonal/kommunal, weitere Anstellungen, Total, zusätzlich entschädigte Stunden, Pensum Vorjahr; Bemerkung intern und Bemerkung auf der Pensenübersicht. | BESCHLOSSEN |
| ST-P2 | **Klassen:** Lektionentafel, Schülerzahl, Name im Vorjahr, Bemerkung; Klassenlehrperson(en) mit frei aufteilbaren Stunden (Soll 100 h je Klasse); WL der Schüler/innen und WL der Lehrpersonen (Soll/zugeteilt). | BESCHLOSSEN |
| ST-P3 | **Gefässe (Klassenlektionen, weitere Lektionen, Sonderpädagogik, Anstellungen):** WL Schüler/innen, Halbklassen, Soll der Lehrpersonen (abweichend festlegbar), Zuteilung an **mehrere Personen**, Semester 1/2, abweichender Faktor je Gefäss, Ressource, Anstellungstyp (kantonal/kommunal), Stufe, Kategorie, Bemerkung; Soll/Ist/Differenz und BG-Richtwert. | BESCHLOSSEN |
| ST-P4 | **Einheiten:** Wochenlektionen (WL), Stellenprozent (%) und Wochenstunden während der Schulwochen (WStd), z. B. Klassenassistenz oder Mittagstisch. Umrechnung über Richtwerte: 1 WL = 58 h/Jahr, 100 % = 1'890 h, 1 WStd = Schulwochen × 1 h. | ZU PRÜFEN (Werte) |
| ST-P5 | **Ämter und Kustodien:** Stunden-Soll je Amt, Zuteilung an Personen, Ist und Differenz, Beschreibung, Bemerkung; Kustodien über 50 h zusätzlich entschädigt. | BESCHLOSSEN |
| ST-P6 | **Gefässe des Berufsauftrags je Bereich** (Schule, Zusammenarbeit, Weiterbildung, Flex = nicht zugewiesene Zeit): Name kurz, Anzahl pro Jahr, Präsenz und Vorbereitung pro Mal, Vorzeichen (Aufgabe/Entlastung), Regel fix oder linear mit Sockel, «Sockel bis», «Gesamte Zeit ab» und Maximum, Beschreibung, Bemerkung. Im Prototyp werden «Sockel bis» und «Gesamte Zeit ab» in WL bemessen. | ZU PRÜFEN |
| ST-P7 | **Personaldossier:** Einträge je Person in den Kategorien Diplome/Weiterbildung/Fächer, Anstellung/Urlaub/Abwesenheit, Mitarbeitendenbeurteilung, Besuche/Gespräche/Notizen, Weitere Unterlagen; Erfassung aus Vorlagen; Personalgespräche erscheinen automatisch. Nur Metadaten, Dokumente im EduKSX-Dokumentenspeicher. Rechte siehe Offene Frage 3. | ZU PRÜFEN (Rechte) |
| ST-P8 | **Übersicht Klasse – Fach – Lehrperson:** Matrix aller Klassen und Fächer mit Kürzeln, Kennzeichnung Klassenlehrperson dieser bzw. einer anderen Klasse (Symbol und Fläche, nicht nur Farbe), Lektionendifferenz je Klasse; weitere Lektionen nach Kategorie; CSV-Export. | BESCHLOSSEN |
| ST-P9 | **Ressourcen in VZE:** Gesamtsumme, kantonale und kommunale Anstellungen sowie jede Ressource mit Soll, Ist und Differenz in VZE; Abweichung des Beschäftigungsgrads gegenüber dem WL-Richtwert. | BESCHLOSSEN |
| ST-P10 | **Betreuung und Klassenassistenz** als Anstellungen in % oder WStd; die Planung Tagesstrukturen zeigt Soll aus den Angeboten und Ist aus diesen Anstellungen. | BESCHLOSSEN |
