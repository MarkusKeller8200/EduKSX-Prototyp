/*
 * EduKSX-Flow – Einstellungen: Kataloge für Kompetenzen, Funktionen, Zeitpunkte, Intervalle und Aufgabenbereiche.
 * Grundlage: Vorschlag zur Erweiterung des Funktionendiagramms (24.11.2026); Kürzel sind Vorschläge und je Mandant
 * anpassbar. Die bestehenden Kürzel des Prototyps (Rollen, Kompetenzen E/V/M/C/I) bleiben unverändert.
 * Definiert window.FLOW_EINSTELLUNGEN_DATEN (Vorgabe) und window.FLOW_EINSTELLUNGEN(X) (Seiten und Steuerung).
 */
(function () {
  "use strict";

  const k = (kuerzel, name, beschreibung, weitere) => Object.assign({ kuerzel, name, beschreibung, aktiv: true }, weitere || {});

  // ------------------------------------------------------------ Kompetenzen
  const KOMPETENZEN = [
    k("E", "Entscheid", "Verbindliche Entscheidung treffen"),
    k("V", "Verantwortung", "Operativer Lead, Vorbereitung des Entscheids"),
    k("M", "Mitwirkung", "Anhörung, Vernehmlassung und Mitwirkung"),
    k("C", "Controlling", "Regelmässige Überwachung und Kontrolle"),
    k("I", "Information", "Wird über Sachverhalte und Entscheide informiert"),
    k("A", "Ausführung", "Operative Umsetzung einer Aufgabe", { neu: true }),
    k("G", "Genehmigung", "Formelle Genehmigung eines Antrags oder Ergebnisses", { neu: true }),
    k("P", "Prüfung", "Fachliche, rechtliche oder finanzielle Prüfung", { neu: true }),
    k("B", "Beratung", "Beratende Funktion ohne Entscheidungsbefugnis", { neu: true }),
    k("K", "Koordination", "Abstimmung zwischen beteiligten Organisationseinheiten", { neu: true }),
    k("F", "Freigabe", "Freigabe zur Umsetzung oder Veröffentlichung", { neu: true }),
    k("U", "Unterstützung", "Unterstützende Tätigkeit bei der Ausführung", { neu: true }),
    k("S", "Stellvertretung", "Übernahme einer Kompetenz im Vertretungsfall", { neu: true }),
    k("Z", "Zustimmung", "Erforderliche Zustimmung zu einem Entscheid", { neu: true }),
    k("R", "Rechenschaft", "Rechenschafts- und Berichterstattungspflicht", { neu: true }),
    k("T", "Antragstellung", "Formelle Einreichung eines Antrags", { neu: true }),
    k("D", "Delegation", "Befugnis zur Übertragung einer Aufgabe oder Kompetenz", { neu: true }),
    k("W", "Weisungsbefugnis", "Erteilung verbindlicher Anweisungen", { neu: true }),
  ];

  // ------------------------------------------------------------ Funktionen (gruppiert)
  const f = (gruppe, liste) => liste.map(([kuerzel, name, beschreibung]) => k(kuerzel, name, beschreibung || "", { gruppe }));
  const FUNKTIONEN = [
    ...f("Politische und strategische Führung", [
      ["STB", "Stimmberechtigte / Urne", "Entscheide an der Urne"],
      ["GV", "Gemeindeversammlung (Stimmberechtigte)", "Budget, Jahresrechnung, Sachgeschäfte"],
      ["GR", "Gemeinderat", "Exekutive der politischen Gemeinde"],
      ["SPF", "Schulpflege", "Schulbehörde; strategische Führung der Schule"],
      ["SPr", "Schulpräsidium", "Vorsitz der Schulbehörde"],
      ["RV", "Ressortvorstand", "Mitglied der Schulbehörde mit Ressort"],
      ["RPK", "Rechnungsprüfungskommission", "Prüft Budget, Jahresrechnung und Anträge"],
      ["KOM", "Kommission", "Weitere Kommission der Schulgemeinde"],
    ]),
    ...f("Operative Führung", [
      ["GL", "Geschäftsleitung", "Operative Gesamtleitung"],
      ["RSL", "Rektorat / Gesamtschulleitung", "Leitung mehrerer Schuleinheiten"],
      ["SL", "Schulleitung", "Leitung einer Schuleinheit"],
      ["SSL", "Stellvertretende Schulleitung", "Vertretung der Schulleitung"],
      ["BL", "Bereichsleitung", "Leitung eines Bereichs"],
      ["FL", "Fachbereichsleitung", "Leitung eines Fachbereichs"],
      ["TL", "Teamleitung", "Leitung eines Teams"],
      ["PL", "Projektleitung", "Leitung eines Projekts"],
    ]),
    ...f("Verwaltung und Support", [
      ["SV", "Schulverwaltung", "Administration der Schule"],
      ["LSV", "Leitung Schulverwaltung", "Führung der Schulverwaltung"],
      ["HR", "Personalwesen", "Personaladministration"],
      ["FIN", "Finanzwesen", "Rechnungswesen und Finanzen"],
      ["ICT", "ICT-Support (TICTS/PICTS)", "Fachstelle ICT"],
      ["ISB", "Informationssicherheitsbeauftragte", "Informationssicherheit, ISMS"],
      ["DSB", "Datenschutzbeauftragte", "Datenschutz"],
      ["QM", "Qualitätsmanagement", "Qualitätssicherung und -entwicklung"],
      ["KOMM", "Kommunikation", "Öffentlichkeitsarbeit"],
      ["RD", "Rechtsdienst", "Rechtliche Beratung"],
      ["IM", "Immobilienmanagement", "Strategie und Bewirtschaftung der Liegenschaften"],
      ["FM", "Facility Management", "Betrieb der Gebäude"],
      ["HD", "Hausdienst", "Hauswartung und Unterhalt"],
      ["SIBE", "Sicherheitsbeauftragte", "Sicherheit und Arbeitssicherheit"],
      ["AV", "Archivverantwortliche", "Archiv und Aktenführung"],
      ["BES", "Beschaffungswesen", "Einkauf und Submissionen"],
    ]),
    ...f("Pädagogischer Bereich", [
      ["LP", "Lehrperson", "Unterricht"],
      ["KLP", "Klassenlehrperson", "Führung einer Klasse"],
      ["FLP", "Fachlehrperson", "Fachunterricht"],
      ["SHP", "Schulische Heilpädagogik", "Integrative Förderung"],
      ["SSA", "Schulsozialarbeit", "Soziale Arbeit an der Schule"],
      ["SPD", "Schulpsychologischer Dienst", "Abklärung und Beratung"],
      ["DaZ", "Deutsch als Zweitsprache", "DaZ-Unterricht"],
      ["PICTS", "Pädagogischer ICT-Support", "Unterstützung im Unterricht mit ICT"],
      ["TICTS", "Technischer ICT-Support", "Technische Unterstützung vor Ort"],
      ["TA", "Therapieangebote", "Logopädie, Psychomotorik u. a."],
      ["SA", "Schulassistenz", "Unterstützung im Unterricht"],
      ["BB", "Berufsbildner", "Ausbildung von Lernenden"],
      ["SK", "Schulkonferenz", "Konferenz aller Lehrpersonen"],
      ["PK", "Pädagogische Konferenz", "Pädagogische Fragen"],
      ["BT", "Betreuung / Tagesstrukturen", "Mittagstisch, Hort"],
    ]),
    ...f("Weitere Beteiligte", [
      ["ELT", "Erziehungsberechtigte", "Eltern bzw. Sorgeberechtigte (im Vorschlag «EB»)"],
      ["SuS", "Schülerinnen und Schüler", ""],
      ["ER", "Elternrat", ""],
      ["SR", "Schülerrat", ""],
      ["MA", "Mitarbeitende Person", "Betroffene Person in Personalabläufen"],
      ["EXT", "Externe Dienstleister", ""],
      ["VSA", "Volksschulamt (extern)", "Kantonale Stelle"],
      ["REV", "Externe Revisionsstelle", "Finanztechnische Prüfung"],
    ]),
  ];

  // ------------------------------------------------------------ Zeitpunkte (Bezugstermine)
  const ZEITPUNKTE = [
    k("ST", "Stichtag", "Bezugsdatum eines Ablaufs (z. B. Eintritt); Fristen in Tagen davor oder danach", { bezug: "stichtag" }),
    k("DAT", "Datum", "Fester Tag im Jahr (Tag und Monat)", { bezug: "am" }),
    k("KW", "Kalenderwoche", "Kalenderwoche im Jahr", { bezug: "kw" }),
    k("ZR", "Zeitraum", "Von–bis im Jahr", { bezug: "von-bis" }),
    k("SJW", "Schuljahreswechsel", "Wechsel des Schuljahres (Datum je Schuljahr)", { bezug: "schuljahreswechsel" }),
    k("SJB", "Schuljahresbeginn", "Erster Schultag", { bezug: "schuljahresbeginn" }),
    k("SE1", "Semesterende (1. Semester)", "Ende des ersten Semesters", { bezug: "semesterende1" }),
    k("SW", "Semesterwechsel", "Beginn des 2. Semesters", { bezug: "semesterwechsel" }),
    k("SE", "Semesterende (beide Semester)", "Ende jedes Semesters", { bezug: "semesterende" }),
    k("SJE", "Schuljahresende", "Letzter Schultag", { bezug: "schuljahresende" }),
    k("HFB", "Beginn Herbstferien", "", { bezug: "herbstferien" }), k("HFE", "Ende Herbstferien", "Letzter Ferientag", { bezug: "herbstferien_ende" }),
    k("WFB", "Beginn Weihnachtsferien", "", { bezug: "weihnachtsferien" }), k("WFE", "Ende Weihnachtsferien", "Letzter Ferientag", { bezug: "weihnachtsferien_ende" }),
    k("SFB", "Beginn Sportferien", "", { bezug: "sportferien" }), k("SFE", "Ende Sportferien", "Letzter Ferientag", { bezug: "sportferien_ende" }),
    k("FFB", "Beginn Frühlingsferien", "", { bezug: "fruehlingsferien" }), k("FFE", "Ende Frühlingsferien", "Letzter Ferientag", { bezug: "fruehlingsferien_ende" }),
    k("SOB", "Beginn Sommerferien", "", { bezug: "sommerferien" }), k("SOE", "Ende Sommerferien", "Letzter Ferientag", { bezug: "sommerferien_ende" }),
  ];

  // ------------------------------------------------------------ Intervalle
  const INTERVALLE = [
    k("1X", "einmalig", "Nur ein bestimmtes Jahr", { bezug: "jahr" }),
    k("J", "jährlich", "Einmal pro Jahr (Datum, KW, Quartal oder Schuljahrestermin)", { bezug: "jaehrlich" }),
    k("TRI", "trimesterweise", "Jedes Trimester (nicht üblich, der Vollständigkeit halber)", { bezug: "trimester" }),
    k("SEM", "semesterweise", "Jedes Semester", { bezug: "semester" }),
    k("Q", "quartalsweise", "Jedes Quartal", { bezug: "quartal" }),
    k("M", "monatlich", "Jeden Monat an einem Tag (oder letzter Tag)", { bezug: "monatlich" }),
    k("W", "wöchentlich", "Jede Woche an einem Wochentag", { bezug: "woechentlich" }),
    k("T", "täglich", "Jeden Tag", { bezug: "taeglich" }),
    k("WT", "alle Wochentage", "Montag bis Freitag", { bezug: "wochentage" }),
    k("WE", "Wochenende", "Samstag und Sonntag", { bezug: "wochenende" }),
    k("AT", "Arbeitstage", "Montag bis Freitag ohne Feiertage Kanton Zürich", { bezug: "arbeitstage" }),
    k("ST", "Schultage", "Ohne Ferien und schulfreie Tage", { bezug: "schultage" }),
  ];

  // ------------------------------------------------------------ Aufgabenbereiche (Hauptbereiche mit Unterbereichen)
  const BEREICHE = [
    ["Organisation und Führung", "Grundlagen, Strategie, Organisationsentwicklung, Governance"],
    ["Personalwesen", "Rekrutierung, Anstellung, Personalentwicklung, Austritte"],
    ["Finanzen", "Budget, Rechnungswesen, Finanzplanung, Kredite"],
    ["Schulbetrieb", "Schuljahresplanung, Stundenplanung, Klassenbildung"],
    ["Pädagogik", "Unterricht, Schulentwicklung, Lehrmittel, Beurteilung"],
    ["Schülerinnen und Schüler", "Aufnahme, Zuteilung, Absenzen, Disziplinarmassnahmen"],
    ["Sonderpädagogik", "Fördermassnahmen, Sonderschulung, Therapien"],
    ["Betreuung und Tagesstrukturen", "Mittagstisch, Betreuung, Ferienangebote"],
    ["ICT und Digitalisierung", "Infrastruktur, Anwendungen, Support, Digitalisierung"],
    ["Informationssicherheit", "ISMS, Risikomanagement, Sicherheitsvorfälle, Notfallmanagement"],
    ["Datenschutz", "Datenbearbeitung, Auskunftsbegehren, Datenschutzvorfälle"],
    ["Immobilien und Infrastruktur", "Gebäude, Unterhalt, Reinigung, Raumplanung"],
    ["Beschaffungswesen", "Ausschreibungen, Evaluationen, Bestellungen, Verträge"],
    ["Kommunikation", "Öffentlichkeitsarbeit, Elternkommunikation, Medien"],
    ["Recht und Compliance", "Rechtssammlung, Rechtsmittel, Reglemente, Weisungen"],
    ["Qualitätsmanagement", "Evaluation, Qualitätsentwicklung, Audits"],
    ["Projektmanagement", "Projektanträge, Projektfreigaben, Projektsteuerung"],
    ["Krisen- und Notfallmanagement", "Krisenstab, Alarmierung, Evakuation, Betriebskontinuität"],
    ["Dokumentenmanagement", "Dokumentenlenkung, Freigaben, Archivierung"],
    ["Gesundheit und Arbeitssicherheit", "Gesundheitsschutz, Unfallprävention, Sicherheitskonzepte"],
    ["Kooperationen und Partnerschaften", "Andere Schulen, Gemeinden, Behörden, externe Stellen"],
    ["Nachhaltigkeit", "Energie, Umwelt, Ressourcenmanagement"],
    ["Controlling und Reporting", "Kennzahlen, Zielerreichung, internes Kontrollsystem"],
  ];
  const AUFGABENBEREICHE = [];
  BEREICHE.forEach(([titel, unter], i) => {
    const nr = String(i + 1);
    AUFGABENBEREICHE.push(k(nr, titel, unter, { haupt: nr }));
    unter.split(",").map((x) => x.trim()).forEach((u, j) => AUFGABENBEREICHE.push(k(`${nr}.${j + 1}`, u, "", { haupt: nr })));
  });

  // ------------------------------------------------------------ Vorgesetzte Rolle je Funktion (Eskalation, Konzept E6)
  const VORGESETZT = { SV: "SPr", LSV: "SPr", HD: "SV", ICT: "SV", ISB: "SPr", DSB: "SPr", HR: "SPr", FIN: "SPr", LP: "SL", KLP: "SL", FLP: "SL", SHP: "SL", SA: "SL", SSA: "SL",
    PICTS: "ICT", TICTS: "ICT", MA: "SL", SL: "SPr", SSL: "SL", RSL: "SPr", GL: "SPr", RV: "SPr", SPr: "SPF", BT: "SL", FM: "SV", IM: "RV" };
  FUNKTIONEN.forEach((e) => { e.vorgesetzt = VORGESETZT[e.kuerzel] || ""; });

  // ------------------------------------------------------------ Eskalation je Fristart (Konzept 3.3, E6)
  const es = (fristart, stufe, tage, an, name, beschreibung) => k(`${{ gesetzlich: "G", intern: "I", empfehlung: "E" }[fristart]}${stufe}`, name, beschreibung, { fristart, stufe, tage, an });
  const ESKALATION = [
    es("gesetzlich", 1, -7, "zustaendig", "Erinnerung (gesetzliche Frist)", "7 Tage vor der Frist an die zuständige Rolle"),
    es("gesetzlich", 2, -2, "zustaendig", "Dringend: gesetzliche Frist in 2 Tagen", "2 Tage vor der Frist"),
    es("gesetzlich", 3, 0, "vorgesetzt", "Gesetzliche Frist erreicht – Information an die vorgesetzte Stelle", "am Fristtag; im Journal"),
    es("gesetzlich", 4, 2, "SPr", "Gesetzliche Frist verpasst – Eskalation an das Schulpräsidium", "2 Tage nach der Frist; im Journal"),
    es("intern", 1, -2, "zustaendig", "Erinnerung", "2 Tage vor der Frist"),
    es("intern", 2, 0, "zustaendig", "Frist erreicht bzw. überschritten", "am Fristtag"),
    es("intern", 3, 2, "vorgesetzt", "Information an die vorgesetzte Stelle", "2 Tage nach der Frist; im Journal"),
    es("intern", 4, 5, "SPr", "Eskalation an das Schulpräsidium", "5 Tage nach der Frist; im Journal"),
    es("empfehlung", 1, 0, "zustaendig", "Empfohlener Zeitpunkt erreicht", "am Tag der Empfehlung"),
    es("empfehlung", 2, 7, "zustaendig", "Empfohlener Zeitpunkt überschritten", "eine Woche danach"),
  ];

  // ------------------------------------------------------------ Periode: Häufigkeit pro Jahr (Wert) für Planung und Berechnung
  const pe = (name, kuerzel, wert, beschreibung) => k(kuerzel, name, beschreibung, { wert, farbe: "" });
  const PERIODEN = [
    pe("keiner", "-", 0, "keine Wiederholung / nicht definiert"),
    pe("nicht berücksichtigen", "X", 0, "wird von Berechnung ausgeschlossen"),
    pe("Tage", "T", 365, "tägliche Wiederholung auf Jahresbasis"),
    pe("Wochen", "W", 52, "wöchentliche Wiederholung"),
    pe("Schulwochen", "SW", 39, "nur während Schulbetrieb"),
    pe("Monate", "M", 12, "monatliche Wiederholung"),
    pe("Quartal", "Q", 4, "vierteljährliche Wiederholung"),
    pe("Semester", "S", 2, "halbjährliche Wiederholung"),
    pe("Jahr", "J", 1, "einmal jährlich"),
    pe("Alle 2 Jahre", "2J", 0.5, "alle zwei Jahre (überarbeiten Konzepte)"),
    pe("Alle 3 Jahre", "3J", 0.333, "alle drei Jahre (z. B. Abschreibung SuS-Geräte auflösen)"),
    pe("Alle 4 Jahre", "4J", 0.25, "alle vier Jahre"),
    pe("Alle 5 Jahre", "5J", 0.2, "alle fünf Jahre (Ersatzbeschaffung, Ausserbetriebnahme persönlicher Geräte)"),
  ];
  // Intervall → Periode (nur eindeutige Zuordnungen; Rest bleibt leer)
  const IV_PERIODE = { "1X": "-", J: "J", SEM: "S", Q: "Q", M: "M", W: "W", T: "T" };
  INTERVALLE.forEach((e) => { e.periode = IV_PERIODE[e.kuerzel] || ""; });

  // Farbe je Eintrag (für Labels): Vorgabe leer = neutrales Label
  [KOMPETENZEN, FUNKTIONEN, ZEITPUNKTE, INTERVALLE, AUFGABENBEREICHE, ESKALATION].forEach((l) => l.forEach((e) => { e.farbe = e.farbe || ""; }));
  // Tooltip je Eintrag: Vorgabe «Kürzel = Bezeichnung»
  [KOMPETENZEN, FUNKTIONEN, ZEITPUNKTE, INTERVALLE, AUFGABENBEREICHE, ESKALATION, PERIODEN].forEach((l) => l.forEach((e) => { e.tooltip = `${e.kuerzel} = ${e.name}`; }));

  window.FLOW_EINSTELLUNGEN_DATEN = { kompetenzen: KOMPETENZEN, funktionen: FUNKTIONEN, zeitpunkte: ZEITPUNKTE, intervalle: INTERVALLE, perioden: PERIODEN, aufgabenbereiche: AUFGABENBEREICHE, eskalation: ESKALATION };

  // ------------------------------------------------------------ Seiten und Steuerung
  const KATALOGE = {
    kompetenzen: { titel: "Kompetenzen", spalten: ["Kürzel", "Kompetenz"], extra: [{ k: "farbe", label: "Farbe / Label", typ: "farbe", titel: "Farbe für das Label; Text schwarz oder weiss je nach Kontrast" }, { k: "tooltip", label: "Tooltip", typ: "text", titel: "Erscheint beim Darüberfahren, z. B. «E = Entscheid»" }], text: "Kompetenzarten im Funktionendiagramm. Entscheid, Genehmigung und Freigabe sind bewusst getrennt: z. B. entscheidet die Geschäftsleitung über eine Beschaffung, das Finanzwesen prüft die Finanzierung, eine andere Stelle gibt die Bestellung frei. Aktive Kompetenzen erscheinen in der Legende des Funktionendiagramms." },
    funktionen: { titel: "Funktionen", spalten: ["Kürzel", "Funktion"], gruppiert: "gruppe", extra: [{ k: "vorgesetzt", label: "Vorgesetzt", typ: "funktion", titel: "Empfänger der Eskalation «vorgesetzte Stelle»" }, { k: "farbe", label: "Farbe / Label", typ: "farbe", titel: "Farbe für das Label; Text schwarz oder weiss je nach Kontrast" }, { k: "tooltip", label: "Tooltip", typ: "text", titel: "Erscheint beim Darüberfahren, z. B. «E = Entscheid»" }], text: "Organisatorische Funktionen (Rollen). Aktive Funktionen stehen bei «Verantwortlich» und «Informieren» in den Ablaufvorlagen zur Auswahl. Kürzel sind Vorschläge und je Schule anpassbar." },
    zeitpunkte: { titel: "Zeitpunkte", spalten: ["Kürzel", "Zeitpunkt"], extra: [{ k: "farbe", label: "Farbe / Label", typ: "farbe", titel: "Farbe für das Label; Text schwarz oder weiss je nach Kontrast" }, { k: "tooltip", label: "Tooltip", typ: "text", titel: "Erscheint beim Darüberfahren, z. B. «E = Entscheid»" }], text: "Bezugstermine für Fristen und für die Zeitregeln im Jahreskalender (Schuljahres- und Ferientermine je Schuljahr unter Jahreskalender › Schuljahre). Nur aktive Zeitpunkte stehen beim Bearbeiten eines Termins zur Wahl." },
    intervalle: { titel: "Intervalle", spalten: ["Kürzel", "Intervall"], extra: [{ k: "periode", label: "Periode", typ: "periode", titel: "Häufigkeit pro Jahr (Einstellungen › Periode)" }, { k: "farbe", label: "Farbe / Label", typ: "farbe", titel: "Farbe für das Label; Text schwarz oder weiss je nach Kontrast" }, { k: "tooltip", label: "Tooltip", typ: "text", titel: "Erscheint beim Darüberfahren, z. B. «E = Entscheid»" }], text: "Wiederholungen für Termine und ToDos im Jahreskalender (wann genau ein Termin liegt). Nur aktive Intervalle stehen beim Bearbeiten eines Termins als Art der Zeitregel zur Wahl. Die Periode ordnet jedem Intervall eine Häufigkeit pro Jahr zu." },
    perioden: { titel: "Periode", spalten: ["Kürzel", "Periode"], extra: [{ k: "wert", label: "Wert", typ: "dezimal", titel: "Vorkommen pro Jahr (z. B. Monate = 12, alle 2 Jahre = 0,5)" }, { k: "farbe", label: "Farbe / Label", typ: "farbe", titel: "Farbe für das Label; Text schwarz oder weiss je nach Kontrast" }, { k: "tooltip", label: "Tooltip", typ: "text", titel: "Erscheint beim Darüberfahren, z. B. «E = Entscheid»" }], text: "Häufigkeit pro Jahr für Planung und Berechnung (z. B. Aufwand pro Jahr, Erneuerungszyklen von Geräten). Wert = Vorkommen pro Jahr; «nicht berücksichtigen» schliesst von Berechnungen aus. Die Perioden ab zwei Jahren haben noch keine Zeitregel im Kalender (Konzept E19 OFFEN)." },
    eskalation: { titel: "Eskalation", spalten: ["Kürzel", "Meldung"], gruppiert: "fristart", gruppenTitel: { gesetzlich: "Gesetzliche Fristen", intern: "Interne Fristen", empfehlung: "Empfehlungen" },
      extra: [{ k: "stufe", label: "Stufe", typ: "zahl" }, { k: "tage", label: "Tage zur Frist", typ: "zahl", titel: "negativ = vorher" }, { k: "an", label: "An", typ: "empfaenger" }, { k: "farbe", label: "Farbe / Label", typ: "farbe", titel: "Farbe für das Label; Text schwarz oder weiss je nach Kontrast" }, { k: "tooltip", label: "Tooltip", typ: "text", titel: "Erscheint beim Darüberfahren, z. B. «E = Entscheid»" }],
      text: "Eskalationsstufen je Fristart (Konzept E6). Tage zur Frist: negativ = vorher. Empfänger: zuständige Rolle, vorgesetzte Stelle (siehe Funktionen › Vorgesetzt) oder eine bestimmte Funktion. Ab Stufe 3 steht die Meldung im Journal des Ablaufs. Ohne aktive Stufen eskaliert eine Fristart nicht." },
    aufgabenbereiche: { titel: "Aufgabenbereiche", spalten: ["Nr.", "Aufgabenbereich"], gruppiert: "haupt", extra: [{ k: "farbe", label: "Farbe / Label", typ: "farbe", titel: "Farbe für das Label; Text schwarz oder weiss je nach Kontrast" }, { k: "tooltip", label: "Tooltip", typ: "text", titel: "Erscheint beim Darüberfahren, z. B. «E = Entscheid»" }], text: "Gliederung des Funktionendiagramms in Hauptbereiche und Unterbereiche (Vorschlag für einen schulübergreifenden Standard). Das Funktionendiagramm ist nach den Hauptbereichen gruppiert." },
  };

  window.FLOW_EINSTELLUNGEN = function (X) {
    const { esc, ansage, frage, speichern, render } = X;
    const S = () => X.S();
    const darf = () => ["SV", "RV"].includes(S().rolle);
    const liste = (b) => S().einstellungen[b];

    const fdListe = () => S().fd || X.D.FUNKTIONENDIAGRAMM;
    /** Welche Zeitpunkte und Intervalle (Bezug) nutzt eine Zeitregel des Kalenders? */
    function regelBezuege(z, jahr) {
      const r = z.regel, out = [];
      if (!r) { out.push("jaehrlich"); out.push(z.kw ? "kw" : z.am ? "am" : z.von ? "von-bis" : ""); }
      else if (r === "stichtag") { out.push("jaehrlich", z.anker); }
      else out.push(r);
      if (jahr) out.push("jahr");
      return out;
    }
    /** Wie oft wird ein Eintrag verwendet (Vorlagen, Funktionendiagramm, Jahreskalender)? */
    function verwendung(b, e) {
      const D = X.D;
      if (b === "funktionen") {
        let n = 0;
        S().vorlagen.forEach((v) => v.schritte.forEach((s) => { if (s.rolle === e.kuerzel || (s.informiert || []).includes(e.kuerzel)) n++; }));
        fdListe().forEach((fd) => { if (fd.rollen[e.kuerzel]) n++; });
        return n;
      }
      if (b === "aufgabenbereiche") return e.kuerzel === e.haupt ? fdListe().filter((fd) => fd.bereich === e.kuerzel).length : 0;
      if (b === "eskalation") return 0;
      if (b === "perioden") return liste("intervalle").filter((x) => x.periode === e.kuerzel).length;
      if (b === "zeitpunkte" || b === "intervalle") return S().ereignisse.filter((ev) => regelBezuege(ev.zeit, ev.jahr).includes(e.bezug)).length;
      if (b === "kompetenzen") return fdListe().filter((fd) => Object.values(fd.rollen).some((z) => String(z).replace(/[()0-9]/g, "").split("/").includes(e.kuerzel))).length;
      return 0;
    }

    function pruefung(b) {
      const m = [];
      const gesehen = {};
      liste(b).forEach((e) => {
        if (!String(e.kuerzel).trim()) m.push(`Eintrag «${e.name || "ohne Bezeichnung"}» hat kein ${KATALOGE[b].spalten[0]}.`);
        else if (gesehen[e.kuerzel]) m.push(`${KATALOGE[b].spalten[0]} «${e.kuerzel}» kommt mehrfach vor.`);
        gesehen[e.kuerzel] = true;
        if (!String(e.name).trim()) m.push(`«${e.kuerzel}» hat keine Bezeichnung.`);
        if (!e.aktiv && verwendung(b, e)) m.push(`«${e.kuerzel}» ist inaktiv, wird aber ${verwendung(b, e)}× verwendet.`);
      });
      return m;
    }

    function extraFeld(b, e, i, x, dis) {
      const id = `es-${b}-${i}-${x.k}`, d = `data-aktion="es-feld" data-k="${esc(x.k)}" data-bereich="${esc(b)}" data-i="${i}" id="${id}" ${dis}`;
      const lab = `<label class="sr-only" for="${id}">${esc(x.label)}</label>`;
      const w = e[x.k] == null ? "" : e[x.k];
      if (x.typ === "zahl") return `${lab}<input type="number" step="any" ${d} value="${esc(w)}" style="width:5rem">`;
      if (x.typ === "dezimal") return `${lab}<input type="text" inputmode="decimal" ${d} value="${esc(String(w).replace(".", ","))}" style="width:5rem;text-align:right" title="Dezimalzahl, z. B. 0,333">`;
      if (x.typ === "text") return `${lab}<input type="text" ${d} value="${esc(w)}" style="width:100%;min-width:9rem">`;
      if (x.typ === "farbe") return `${lab}<span class="es-farbe"><input type="color" ${d} value="${esc(w || "#d0d5dd")}" title="${w ? esc(w) : "keine Farbe"}">${label(e)}${w && !dis ? `<button class="link small" data-aktion="es-farbe-weg" data-bereich="${esc(b)}" data-i="${i}" title="Farbe entfernen" aria-label="Farbe entfernen">×</button>` : ""}</span>`;
      if (x.typ === "periode") {
        const pw = liste("perioden").filter((f) => f.kuerzel && (f.aktiv || f.kuerzel === w)).map((f) => [f.kuerzel, `${f.kuerzel} – ${f.name}`]);
        return `${lab}<select ${d} style="max-width:11rem"><option value="">–</option>${pw.map(([v, t]) => `<option value="${esc(v)}" ${v === w ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
      }
      const funk = liste("funktionen").filter((f) => f.kuerzel && (f.aktiv || f.kuerzel === w)).map((f) => [f.kuerzel, `${f.kuerzel} – ${f.name}`]);
      const werte = x.typ === "empfaenger" ? [["zustaendig", "zuständige Rolle"], ["vorgesetzt", "vorgesetzte Stelle"]].concat(funk) : [["", "–"]].concat(funk.filter(([kk]) => kk !== e.kuerzel));
      return `${lab}<select ${d} style="max-width:12rem">${werte.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(w) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
    }
    /** Textfarbe mit genügend Kontrast (WCAG-Luminanz) zur Hintergrundfarbe. */
    function textFarbe(hex) {
      const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
      if (!m) return "";
      const [r, g, bl] = [0, 2, 4].map((j) => { const c = parseInt(m[1].slice(j, j + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "#000000" : "#ffffff";
    }
    /** Label eines Eintrags: Kürzel auf der Farbe des Eintrags, Tooltip als Titel. */
    function label(e, text) {
      if (!e) return "";
      const t = esc(text || e.kuerzel || e.name);
      const tip = esc(e.tooltip || `${e.kuerzel} = ${e.name}`);
      return e.farbe ? `<span class="es-label" style="background:${esc(e.farbe)};color:${textFarbe(e.farbe)};border-color:${esc(e.farbe)}" title="${tip}">${t}</span>` : `<span class="es-label" title="${tip}">${t}</span>`;
    }
    const labelVon = (b, kz, text) => label(liste(b).find((x) => x.kuerzel === kz), text);
    /** Breite der Verknüpfungshinweise nach dem längsten Text im Katalog, damit die Felder bündig sind. */
    const bezugBreite = (b) => Math.max(0, ...liste(b).map((e) => String(e.bezug || "").length)) + 2.5;
    function zeile(b, e, i) {
      const dis = darf() ? "" : "disabled";
      const d = `data-bereich="${esc(b)}" data-i="${i}"`;
      const n = verwendung(b, e);
      const unter = b === "aufgabenbereiche" && e.kuerzel !== e.haupt;
      return `<tr class="${e.aktiv ? "" : "blass"}">
        <td style="width:7rem"><label class="sr-only" for="es-${b}-${i}-k">${esc(KATALOGE[b].spalten[0])}</label><input id="es-${b}-${i}-k" type="text" value="${esc(e.kuerzel)}" data-aktion="es-feld" data-k="kuerzel" ${d} ${dis} style="width:100%;${unter ? "padding-left:1.2rem" : "font-weight:600"}"></td>
        <td><div class="es-name"><label class="sr-only" for="es-${b}-${i}-n">${esc(KATALOGE[b].spalten[1])}</label><input id="es-${b}-${i}-n" type="text" value="${esc(e.name)}" data-aktion="es-feld" data-k="name" ${d} ${dis} title="${esc(e.tooltip || "")}">${e.neu ? `<span class="badge violett" title="Vorschlag zur Erweiterung">neu</span>` : ""}${e.bezug ? `<span class="small muted es-bezug" style="width:${bezugBreite(b)}ch" title="Verknüpfung mit den Zeitregeln des Kalenders">⇢ ${esc(e.bezug)}</span>` : ""}</div></td>
        <td><label class="sr-only" for="es-${b}-${i}-b">Beschreibung</label><input id="es-${b}-${i}-b" type="text" value="${esc(e.beschreibung)}" data-aktion="es-feld" data-k="beschreibung" ${d} ${dis} style="width:100%"></td>
        ${(KATALOGE[b].extra || []).map((x) => `<td>${extraFeld(b, e, i, x, dis)}</td>`).join("")}
        <td style="text-align:center"><label class="chip"><input type="checkbox" data-aktion="es-aktiv" ${d} ${e.aktiv ? "checked" : ""} ${dis}> <span class="small">${e.aktiv ? "aktiv" : "inaktiv"}</span></label></td>
        <td class="small muted" style="text-align:right">${n ? `${n}×` : "–"}</td>
        <td>${darf() ? `<button class="btn klein gefahr" data-aktion="es-loeschen" ${d} aria-label="Eintrag löschen" title="${n ? "Wird verwendet – nur deaktivieren möglich" : "Löschen"}" ${n ? "disabled" : ""}>✕</button>` : ""}</td></tr>`;
    }

    function seite(b) {
      b = KATALOGE[b] ? b : "kompetenzen";
      const kat = KATALOGE[b];
      const alle = liste(b);
      const kopf = `<thead><tr><th>${esc(kat.spalten[0])}</th><th>${esc(kat.spalten[1])}</th><th>Beschreibung</th>${(kat.extra || []).map((x) => `<th ${x.titel ? `title="${esc(x.titel)}"` : ""}>${esc(x.label)}</th>`).join("")}<th>Aktiv</th><th title="Verwendung in Vorlagen, im Funktionendiagramm bzw. im Jahreskalender">verwendet</th><th></th></tr></thead>`;
      let inhalt;
      if (kat.gruppiert) {
        const gruppen = [...new Set(alle.map((e) => e[kat.gruppiert]))];
        inhalt = gruppen.map((g) => {
          const zeilen = alle.map((e, i) => [e, i]).filter(([e]) => e[kat.gruppiert] === g);
          const titel = b === "aufgabenbereiche" ? `${g} ${(alle.find((e) => e.kuerzel === g) || { name: "" }).name}` : (kat.gruppenTitel && kat.gruppenTitel[g]) || g;
          const aktiv = zeilen.filter(([e]) => e.aktiv).length;
          return `<details class="gefaess" open style="margin-top:.75rem"><summary><span><strong>${esc(titel)}</strong></span><span class="small muted">${aktiv} von ${zeilen.length} aktiv</span></summary><div class="inhalt">
            <div class="tabelle-wrap"><table>${kopf}<tbody>${zeilen.map(([e, i]) => zeile(b, e, i)).join("")}</tbody></table></div>
            ${darf() ? `<button class="btn klein" data-aktion="es-neu" data-bereich="${esc(b)}" data-gruppe="${esc(g)}">＋ ${{ aufgabenbereiche: "Unterbereich", eskalation: "Stufe", funktionen: "Funktion" }[b]} in «${esc(titel)}»</button>` : ""}</div></details>`;
        }).join("") + (darf() && b !== "eskalation" ? `<p style="margin-top:1rem"><button class="btn" data-aktion="es-neu-gruppe" data-bereich="${esc(b)}">＋ ${b === "aufgabenbereiche" ? "Hauptbereich" : "Gruppe"}</button></p>` : "");
      } else {
        inhalt = `<div class="tabelle-wrap"><table>${kopf}<tbody>${alle.map((e, i) => zeile(b, e, i)).join("")}</tbody></table></div>${darf() ? `<p><button class="btn" data-aktion="es-neu" data-bereich="${esc(b)}">＋ Eintrag</button></p>` : ""}`;
      }
      const m = pruefung(b);
      return `<div class="seitenkopf"><div><div class="small muted">Einstellungen › ${esc(kat.titel)}</div><h1>${esc(kat.titel)}</h1><p class="muted">${esc(kat.text)}</p></div>
          <div class="aktionen">${darf() ? `<button class="btn" data-aktion="es-vorgabe" data-bereich="${esc(b)}">↺ Vorgabe laden</button>` : ""}</div></div>
        ${darf() ? "" : `<p class="meldung info">Ändern können die Schulverwaltung und der Ressortvorstand – Rolle oben rechts wechseln.</p>`}
        <p class="small muted">${alle.filter((e) => e.aktiv).length} von ${alle.length} aktiv. Änderungen werden sofort gespeichert. Verwendete Einträge lassen sich nicht löschen, nur deaktivieren.</p>
        ${m.length ? `<div class="meldung warnung"><strong>⚠ Hinweise</strong><ul>${m.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
        ${inhalt}`;
    }

    function klick(ak, el) {
      const b = el.dataset.bereich;
      if (!b || !KATALOGE[b] || !darf()) return false;
      const l = liste(b);
      if (ak === "es-neu") {
        const g = el.dataset.gruppe;
        const e = { kuerzel: "", name: "", beschreibung: "", aktiv: true };
        if (b === "funktionen" && g) e.gruppe = g;
        if (b === "eskalation" && g) { const n = l.filter((x) => x.fristart === g).length + 1; Object.assign(e, { fristart: g, stufe: n, tage: 0, an: "zustaendig", kuerzel: `${{ gesetzlich: "G", intern: "I", empfehlung: "E" }[g]}${n}` }); }
        let pos = l.length;
        if (b === "aufgabenbereiche" && g) {
          const unter = l.filter((x) => x.haupt === g && x.kuerzel !== g).map((x) => Number(String(x.kuerzel).split(".")[1]) || 0);
          e.haupt = g; e.kuerzel = `${g}.${Math.max(0, ...unter) + 1}`;
        }
        if (g) { const letzte = l.map((x, i) => [x, i]).filter(([x]) => x[KATALOGE[b].gruppiert] === g).pop(); if (letzte) pos = letzte[1] + 1; }
        l.splice(pos, 0, e);
        speichern(); render(); ansage("Eintrag hinzugefügt – Kürzel und Bezeichnung erfassen.");
        const f = document.getElementById(`es-${b}-${pos}-${e.kuerzel ? "n" : "k"}`); if (f) f.focus();
        return true;
      }
      if (ak === "es-neu-gruppe") {
        if (b === "aufgabenbereiche") {
          const nr = String(Math.max(0, ...l.map((x) => Number(x.haupt) || 0)) + 1);
          l.push({ kuerzel: nr, name: "Neuer Hauptbereich", beschreibung: "", aktiv: true, haupt: nr });
        } else {
          let n = 1; while (l.some((x) => x.gruppe === `Neue Gruppe ${n}`)) n++;
          l.push({ kuerzel: "", name: "", beschreibung: "", aktiv: true, gruppe: `Neue Gruppe ${n}` });
        }
        speichern(); render(); return true;
      }
      if (ak === "es-loeschen") {
        const i = Number(el.dataset.i), e = l[i];
        const kinder = b === "aufgabenbereiche" && e.kuerzel === e.haupt ? l.filter((x) => x.haupt === e.haupt && x !== e) : [];
        frage(`«${e.kuerzel} ${e.name}» löschen?${kinder.length ? `\n\nDamit werden auch die ${kinder.length} Unterbereiche gelöscht.` : ""}\n\nStatt löschen kann der Eintrag auch deaktiviert werden.`, "Löschen", () => {
          S().einstellungen[b] = l.filter((x) => x !== e && !kinder.includes(x));
          speichern(); render(); ansage("Eintrag gelöscht.");
        });
        return true;
      }
      if (ak === "es-farbe-weg") { const e = l[Number(el.dataset.i)]; if (e) { e.farbe = ""; speichern(); render(); } return true; }
      if (ak === "es-vorgabe") {
        frage(`Alle Einträge unter «${KATALOGE[b].titel}» durch die Vorgabe ersetzen? Eigene Änderungen gehen verloren.`, "Vorgabe laden", () => {
          S().einstellungen[b] = JSON.parse(JSON.stringify(window.FLOW_EINSTELLUNGEN_DATEN[b]));
          speichern(); render(); ansage("Vorgabe geladen.");
        });
        return true;
      }
      return false;
    }

    function aenderung(ak, el) {
      const b = el.dataset.bereich;
      if (!b || !KATALOGE[b] || !darf()) return false;
      const e = liste(b)[Number(el.dataset.i)];
      if (!e) return false;
      if (ak === "es-aktiv") { e.aktiv = el.checked; speichern(); render(); ansage(`«${e.kuerzel}» ${e.aktiv ? "aktiviert" : "deaktiviert"}.`); return true; }
      if (ak === "es-feld") {
        const k = el.dataset.k, w = ["stufe", "tage", "wert"].includes(el.dataset.k) ? Number(String(el.value || 0).replace(",", ".")) : el.value.trim();
        if (k === "name" && (!e.tooltip || e.tooltip === `${e.kuerzel} = ${e.name}`)) e.tooltip = `${e.kuerzel} = ${w}`;
        if (k === "kuerzel" && (!e.tooltip || e.tooltip === `${e.kuerzel} = ${e.name}`)) e.tooltip = `${w} = ${e.name}`;
        if (b === "aufgabenbereiche" && k === "kuerzel" && e.kuerzel === e.haupt) liste(b).forEach((x) => { if (x !== e && x.haupt === e.haupt) { x.haupt = w; x.kuerzel = String(x.kuerzel).replace(/^[^.]+/, w); } });
        if (b === "aufgabenbereiche" && k === "kuerzel" && e.kuerzel === e.haupt) e.haupt = w;
        e[k] = w;
        speichern(); render();
        return true;
      }
      return false;
    }

    /** Aktive Funktionen als Auswahl (Kürzel → Name), für Rollenlisten in den Vorlagen. */
    const aktiveFunktionen = () => liste("funktionen").filter((e) => e.aktiv && e.kuerzel);
    const aktiveKompetenzen = () => liste("kompetenzen").filter((e) => e.aktiv && e.kuerzel);
    const aktiveBezuege = (b) => new Set(liste(b).filter((e) => e.aktiv).map((e) => e.bezug || e.kuerzel));
    /** Tooltip eines Eintrags (Kürzel) in einem Katalog; leer, wenn unbekannt. */
    const tooltip = (b, kz) => { const e = liste(b).find((x) => x.kuerzel === kz); return e ? e.tooltip || `${e.kuerzel} = ${e.name}` : ""; };
    const hauptbereiche = () => liste("aufgabenbereiche").filter((e) => e.kuerzel && e.kuerzel === e.haupt);
    return { seite, klick, aenderung, aktiveFunktionen, aktiveKompetenzen, aktiveBezuege, hauptbereiche, tooltip, labelVon, farbeVon: (b, kz) => ((liste(b).find((x) => x.kuerzel === kz) || {}).farbe || ""), textFarbe, KATALOGE };
  };
})();
