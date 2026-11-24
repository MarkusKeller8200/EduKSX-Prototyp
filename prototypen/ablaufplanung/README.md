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
- **45 Ablaufvorlagen in Gruppen**, jeder Schritt mit **Quellenangabe** (Gesetz und Paragraf, Merkblatt, interne
  Grundlage; Links im Quellenverzeichnis je Vorlage; «ZU PRÜFEN» für gemeindeeigene Regelungen):
  - Gemeinde: Gemeindeversammlung (GG §§ 6, 17–19, Checkliste und Leitfaden des Gemeindeamts)
  - Schulbehörde: ordentliche Sitzung, Antrag/Geschäft, Zirkularbeschluss, Präsidialbeschluss (GG §§ 6, 39–41)
  - Rechnungsprüfungskommission: Prüfung Jahresrechnung, Prüfung Budget (GG §§ 58–59, 101, 128; Merkblatt Budget)
  - Schulleitung: Schulleitungskonferenz
  - Finanzen: Budget, Jahresrechnung, Investition (GG §§ 95–96, 99, 101–108, 115, 125, 128; VGG §§ 13, 20–21)
  - Lernende: Eintritt, Austritt, Mutation Personenangaben, Ein-/Umteilung, Zahnarzt- und Arztgutscheine
    (VSG §§ 3, 50; VSV § 8; GesG § 51; VSVZ § 7; FD 4.4.1, 6.1.x)
  - Personal: Anstellung kantonal/kommunal Ein- und Austritt, Mitarbeiterbeurteilung, Mitarbeitergespräch,
    Mutationen, Vikariat kantonal/kommunal, provisorische Anstellung, Unfall (Bagatell, > 3 Tage, kantonal),
    Krankheit (LPG §§ 3, 7, 7 a, 8, 20, 25; LPVO §§ 4, 23, 24, 30; VVO §§ 11, 13, 21–25, 30, 99, 100, 136–139;
    PG §§ 14, 17; UVG Art. 45; Informationen des Volksschulamts)
  - Infrastruktur: Schulraumprognose, Schulraum für Dritte (FD 1.2.7, 1.2.8, 1.2.11, 2.6)
  - ICT: Hardwarebeschaffung Schuljahreswechsel und unterjährig, Arbeitsplatz, Klassenzimmerausrüstung, Lehrmittel,
    Anwendungen/Schulsoftware, Onboarding und Offboarding LP/MA (Jahresplanung, Master-Checkliste, Jahreskalender ICT)
  Externe Beteiligte (Gemeindeversammlung, Volksschulamt, Mitarbeitende, Erziehungsberechtigte) erscheinen als Rollen;
  ihre Schritte bestätigt die zuständige Stelle («Eingang bestätigen»). Neues (geplantes) Modul EduKSX-Finance.
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
- **Prozess-Engine Stufe 1** (0.7.0, `docs/KONZEPT-FLOW.md`):
  - **Arten von Schritten:** Aufgabe, Aufruf an Modul, Genehmigung (Ablehnung mit Begründung), Entscheidung
    (mehrere Möglichkeiten), Nachweis, Termin, Warten bis Frist, Benachrichtigung, Unterprozess.
  - **Verzweigung:** Bedingung auf das Ergebnis eines früheren Schritts (`ictsw5.entscheid = genehmigt`); ein
    entfallender Zweig nimmt die Schritte mit, die nur auf ihn warten. Vorschau zeigt «entscheidet sich im Ablauf».
  - **Unterprozesse:** Budget → RPK-Prüfung Budget, Jahresrechnung → RPK-Prüfung Rechnung, Anstellung kommunal →
    ICT-Onboarding; Kontextfelder werden übernommen, Kreise werden erkannt.
  - **Auslöser:** Modul-Ereignisse (Anstellung genehmigt, Austritt erfasst, Pensum geändert, Lernende angemeldet –
    auf der Seite «Auslöser» simulierbar), Jahreskalender automatisch (Schulpflegesitzung, Schulleitungskonferenz;
    Start, sobald der erste Schritt fällig wird), Abschluss eines Ablaufs (Hardwarebeschaffung → Investition buchen).
    Doppelte Starts werden protokolliert statt ausgeführt.
  - **Fristarten und Eskalation:** gesetzlich (§, mit Paragraf in der Quelle), intern, Empfehlung; Stufen Erinnerung,
    überfällig, vorgesetzte Stelle, Schulpräsidium (gesetzliche Fristen früher); blockierte Schritte mit
    abgelaufener Frist als «Frist gefährdet».
  - **Eingriffe** (Schulverwaltung, Schulleitung, Schulpräsidium): pausieren, abbrechen (Unterprozesse mit,
    Kompensationshinweis für ausgeführte Aufrufe), Stichtag verschieben, Schritt überspringen, wieder öffnen (ohne
    automatische Wiederholung), Zuständigkeit ändern, Schritt einfügen – mit Begründung im **Journal** des Ablaufs.
- **Einstellungen** (0.8.0): Kataloge **Kompetenzen**, **Funktionen** (gruppiert), **Zeitpunkte**, **Intervalle**
  und **Aufgabenbereiche** (gruppiert nach Hauptbereichen) mit Kürzel/Nr., Bezeichnung, Beschreibung und Aktiv.
  Grundlage: Vorschlag zur Erweiterung des Funktionendiagramms (24.11.2026); Kürzel sind Vorschläge, je Schule
  anpassbar. Verwendete Einträge (Vorlagen, Funktionendiagramm, Kalender) lassen sich nur deaktivieren. Seit 0.9.0:
  aktive Intervalle und Zeitpunkte steuern die Zeitregeln im Kalender; das **Funktionendiagramm** ist nach
  Aufgabenbereichen gruppiert und für SV/RV bearbeitbar (Kompetenzen geprüft, Spalten aus den Funktionen).
- **Entscheide umgesetzt** (0.10.0): Prozessverantwortung je Vorlage (E5); Einstellungen › **Eskalation** und
  «Vorgesetzt» je Funktion (E6); **Kompetenzmerkmale** je Zuweisung im Funktionendiagramm (E14) mit Wirkung auf
  Genehmigungen (Betragsgrenze → nächste Instanz E1 → E2). Vier-Augen wird angezeigt, der zweite Prüfschritt folgt in
  Stufe 2.
- **Stufe 2** (0.11.0): Stellvertretungen, Delegation, Vier-Augen-Prinzip (zweite Prüfung), Mehrfachgenehmigung mit
  Quorum, rollenbasierte Übersicht («Für …»), Kalender mit Monats- und Wochenansicht sowie ICS-Export.
- **Periode und Tooltips** (0.12.0): Katalog Periode (Häufigkeit pro Jahr mit Wert und Farbe), Intervalle mit
  zugeordneter Periode, Tooltip in allen Katalogen.
- **Farbe und Label** (0.13.0): jede Einstellung hat eine Farbe; daraus entsteht ein Label (Kontrast automatisch),
  verwendet für Rollen und Kompetenzen.
- **Stufe 3 – Prozesslenkung** (0.15.0): Prozessblatt je Vorlage, Freigabe mit Änderungsbegründung und
  Versionsverlauf, Prozessreviews nach Intervall, Prozesslandkarte (Führungs-, Kern-, Supportprozesse).
- **Stufe 3 – Rechtsgrundlagen und Bibliothek** (0.16.0): Rückwärtssuche vom Gesetzesartikel zu den Schritten,
  Änderungen einer Rechtsgrundlage lösen Reviews aus, Versionsverlauf und -vergleich, Vorlagenbibliothek mit
  Drei-Wege-Abgleich (lokale Anpassungen werden nie überschrieben).
- **Rechtsgrundlagen aus EduKSX-Codex** (0.17.0): Erlasse und Fassungen führt EduKSX-Codex; Flow zeigt je Quelle die
  Fassung aus einem Auszug des Codex-Prototyps (neu erzeugen: `python3 tools/flow_codex_auszug.py` im Repo) und macht
  bei neuen Fassungen Reviews fällig. Konzept: `docs/KONZEPT-FLOW.md` Abschnitt 5b.
- **Simulation:** simulierter Tag (+1, +7, nächste Frist), Module als «nicht erreichbar» schalten, Rollenwechsel.

## Grundlagen

- Prozessliste der Arbeitsgruppe (Onboarding, Offboarding, Mutationen, Gruppen) – Schritte und Zuständigkeiten.
- Funktionendiagramm einer Primarschule im Kanton Zürich (Muster), Auszug Personal und ICT.
- Jahresplanung ICT-Prozesse inkl. DigiLex (Stand 27.05.2026, Flipchart der Arbeitsgruppe), Master-Checkliste
  ICT-Jahreszyklus und Jahreskalender einer Fachstelle ICT (Kalenderwochen) – für den Kalender.
- Zielsysteme ohne Hersteller-/Produktnamen (Office-Konto, Schulverwaltungssoftware, Lehrmittelportal, Notfall-App).

## Offene Fragen (ZU PRÜFEN)

Alle prüfbedürftigen Punkte stehen in [`PRUEFLISTE.md`](PRUEFLISTE.md) (aus den Daten erzeugt: `node werkzeuge/pruefliste.js`).


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
- Quellen «ZU PRÜFEN» (42 Schritte): Geschäftsordnung der Schulpflege, Personalverordnung, Gemeindeordnung
  (Finanzkompetenzen), Submissionsschwellen, Paragrafen VSV/IDG/VGG § 39. Recherchestand 19.11.2026, keine
  Rechtsberatung. Revision PG § 17 (Kündigungsfristen) hängig.
- Stufe 1 (Konzept, OFFEN): Wer darf eingreifen (E5)? Eskalationsstufen und vorgesetzte Rollen (E6)? Kontext im
  laufenden Ablauf ändern (E9)? Einstufung gesetzlicher Fristen fachlich prüfen (E12).
- Einstellungen (0.9.0 verknüpft): Zuordnung der Muster-Nummern zu den Hauptbereichen ist ein Vorschlag (ZU PRÜFEN);
  Kompetenzmerkmale (Betragsgrenze, Instanz, Vier-Augen …) noch nicht erfassbar (E14).
- Digitale Aktenführung ab 1.1.2029: Aufrufprotokoll als Teil des Personaldossiers?

## Ergebnis

Entscheide siehe `docs/KONZEPT-FLOW.md` (E1–E18). Noch offen – nach der Abstimmung festhalten, was nach EduKSX-Flow übernommen wird (Vorgangsregister als
Schnittstelle zu den Modulen, Vorlagen-Versionierung, Motor für Fristen und automatische Schritte).

## Entwickler

Auf GitHub Pages: <https://markuskeller8200.github.io/EduKSX-Prototyp/ablaufplanung/entwickler/>.

Menüpunkt «Entwickler» bzw. `entwickler/`: Datenmodell (Diagramm, Tabellen, SQL), API-Dokumentation (Scalar),
Swagger und OpenAPI – erzeugt mit `python3 tools/entwickler_bauen.py` aus `docs/umsetzung/flow/` (nicht von Hand ändern).

## Hinweise

- Nur erfundene Testdaten verwenden.
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
