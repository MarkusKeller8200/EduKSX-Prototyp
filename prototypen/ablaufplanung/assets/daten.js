/*
 * EduKSX-Flow – Testdaten des Prototyps. Alle Personen sind erfunden.
 * Grundlage: Prozessliste Onboarding/Offboarding/Mutationen der Arbeitsgruppe und ein Funktionendiagramm (Muster)
 * einer Primarschule im Kanton Zürich. Zielsysteme ohne Hersteller-/Produktnamen.
 */
(function () {
  "use strict";

  // Rollen = Spalten des Funktionendiagramms (TICTS/PICTS als ICT-Support zusammengefasst)
  const ROLLEN = {
    SPF: "Schulpflege",
    SPr: "Schulpräsidium",
    RV: "Ressortvorstand",
    SL: "Schulleitung",
    SV: "Schulverwaltung",
    HD: "Hausdienst",
    ICT: "ICT-Support (TICTS/PICTS)",
    LP: "Lehrperson",
  };

  // Funktionendiagramm (Muster): nur die Aufgaben, die Abläufe im Personalbereich berühren.
  // E = Entscheid, V = operativer Lead, M = Mitwirkung, C = Controlling, I = wird informiert
  const FUNKTIONENDIAGRAMM = [
    { nr: "1.1.5", titel: "Prozessbeschriebe", rollen: { SPF: "C", RV: "E", SV: "V/I" } },
    { nr: "3.7", titel: "Beschaffung und Erneuerung Hardware", rollen: { RV: "E", SL: "M", SV: "M", ICT: "V" } },
    { nr: "3.8", titel: "Beschaffung und Erneuerung Software / Kontoverantwortung", rollen: { RV: "E", SL: "M", HD: "M", SV: "M", ICT: "V" } },
    { nr: "3.10", titel: "Benutzerverwaltung", rollen: { SV: "V", ICT: "C" } },
    { nr: "5.1.5", titel: "Berufsauftrag für Lehrpersonen", rollen: { SL: "E/V", LP: "M" } },
    { nr: "5.2.2", titel: "Anstellung Lehrpersonen", rollen: { SPF: "I", RV: "C", SL: "E/V", SV: "I" } },
    { nr: "5.2.3", titel: "Entlassung Lehrpersonen", rollen: { SPF: "E", SL: "V", SV: "I" } },
    { nr: "5.2.6", titel: "Anstellung/Entlassung Schulassistenzen", rollen: { SPF: "E", SPr: "V", SL: "V", SV: "I" } },
    { nr: "5.2.8", titel: "Anstellung/Entlassung Vikarinnen und Vikare", rollen: { RV: "C", SL: "E/V", SV: "I" } },
    { nr: "5.4.8", titel: "Arbeitszeugnisse", rollen: { SL: "V", SV: "V" } },
  ];

  // Vorgangsregister: was jedes Modul für Flow anbietet. Flow ruft nur registrierte Vorgänge auf.
  // art: "sofort" = Ergebnis direkt; "rueckmeldung" = Modul meldet später (z. B. Unterschrift eingegangen)
  const MODULE = [
    { key: "core", name: "Core", aufgabe: "Personen, Dossiers, Dokumente, Mitteilungen", vorgaenge: [
      { id: "core.dossier.eroeffnen", titel: "Personaldossier eröffnen", parameter: ["person", "funktion", "ab"], ergebnis: ["dossier"], art: "sofort" },
      { id: "core.dossier.abschliessen", titel: "Personaldossier abschliessen", parameter: ["person", "per"], ergebnis: ["archiv"], art: "sofort" },
      { id: "core.dokument.unterschrift", titel: "Dokument zur Unterschrift senden", parameter: ["person", "dokument"], ergebnis: ["unterzeichnet"], art: "rueckmeldung" },
      { id: "core.dokument.anfordern", titel: "Dokument einfordern", parameter: ["person", "dokument"], ergebnis: ["eingang"], art: "rueckmeldung" },
      { id: "core.mitteilung.senden", titel: "Mitteilung senden", parameter: ["an", "vorlage"], ergebnis: ["gesendet"], art: "sofort" },
      { id: "core.antrag.stellen", titel: "Antrag zum Entscheid vorlegen", parameter: ["an", "betreff"], ergebnis: ["entscheid"], art: "rueckmeldung" },
    ] },
    { key: "ident", name: "Ident", aufgabe: "Konten, Funktionsgruppen, Berechtigungen", vorgaenge: [
      { id: "ident.konto.anlegen", titel: "Konto anlegen", parameter: ["person", "gueltigAb"], ergebnis: ["benutzername"], art: "sofort" },
      { id: "ident.gruppe.zuweisen", titel: "Funktionsgruppe zuweisen", parameter: ["konto", "gruppe"], ergebnis: ["rechte"], art: "sofort" },
      { id: "ident.konto.aendern", titel: "Konto ändern (Name, Funktion)", parameter: ["konto", "aenderung"], ergebnis: ["konto"], art: "sofort" },
      { id: "ident.konto.sperren", titel: "Konto sperren", parameter: ["konto", "ab", "abwesenheitsnotiz"], ergebnis: ["gesperrt"], art: "sofort" },
      { id: "ident.rechte.pruefen", titel: "Zugriffsberechtigungen überprüfen", parameter: ["konto"], ergebnis: ["befund"], art: "rueckmeldung" },
    ] },
    { key: "connect", name: "Connect", aufgabe: "Basisdaten in Zielsysteme verteilen", vorgaenge: [
      { id: "connect.zugang.verteilen", titel: "Zugang in Zielsystem anlegen", parameter: ["konto", "ziel"], ergebnis: ["zugang"], art: "sofort" },
      { id: "connect.zugang.entfernen", titel: "Zugang in Zielsystem entfernen", parameter: ["konto", "ziel"], ergebnis: ["entfernt"], art: "sofort" },
      { id: "connect.daten.abgleichen", titel: "Änderung an Zielsysteme verteilen", parameter: ["konto"], ergebnis: ["abgeglichen"], art: "sofort" },
    ] },
    { key: "staffing", name: "Staffing", aufgabe: "Anstellung, Pensum, Berufsauftrag", vorgaenge: [
      { id: "staffing.verfuegung.erstellen", titel: "Anstellungsverfügung ausstellen", parameter: ["person", "pensum", "ab"], ergebnis: ["verfuegung"], art: "rueckmeldung" },
      { id: "staffing.verfuegung.beenden", titel: "Anstellung beenden / nicht verlängern", parameter: ["person", "per"], ergebnis: ["beendet"], art: "sofort" },
      { id: "staffing.pensum.aendern", titel: "Pensum ändern", parameter: ["person", "pensum", "ab"], ergebnis: ["verfuegung"], art: "rueckmeldung" },
      { id: "staffing.berufsauftrag.festlegen", titel: "Berufsauftrag festlegen", parameter: ["person", "pensum"], ergebnis: ["berufsauftrag"], art: "sofort" },
    ] },
    { key: "time", name: "Time", aufgabe: "Termine und Stundenpläne", vorgaenge: [
      { id: "time.termin.planen", titel: "Termin planen", parameter: ["titel", "datum", "mit"], ergebnis: ["termin"], art: "sofort" },
      { id: "time.stundenplan.zustellen", titel: "Stundenplan zustellen", parameter: ["person", "ab"], ergebnis: ["stundenplan"], art: "sofort" },
    ] },
    { key: "shop", name: "Shop", aufgabe: "Material, Geräte, Schlüssel", vorgaenge: [
      { id: "shop.material.bestellen", titel: "Material und Lehrmittel bestellen", parameter: ["person", "paket"], ergebnis: ["bestellung"], art: "rueckmeldung" },
      { id: "shop.ausgabe.erfassen", titel: "Ausgabe erfassen (Gerät, Schlüssel)", parameter: ["person", "gegenstand"], ergebnis: ["protokoll"], art: "sofort" },
      { id: "shop.rueckgabe.erfassen", titel: "Rückgabe erfassen", parameter: ["person", "gegenstand"], ergebnis: ["protokoll"], art: "rueckmeldung" },
      { id: "shop.geraete.bestellen", titel: "Geräte bestellen", parameter: ["artikel", "menge"], ergebnis: ["bestellung"], art: "rueckmeldung" },
      { id: "shop.inventar.erfassen", titel: "Inventar erfassen und zuweisen", parameter: ["bestellung", "menge"], ergebnis: ["inventar"], art: "sofort" },
    ] },
  ];

  const ZIELSYSTEME = ["Office-Konto", "Schulverwaltungssoftware", "Schuladministration (Noten, Absenzen)", "Lehrmittelportal", "Notfall-App"];
  const FUNKTIONEN = ["Lehrperson", "Klassenlehrperson", "Schulische Heilpädagogin/-pädagoge", "Klassenassistenz", "Vikarin/Vikar", "Hausdienst", "Schulverwaltung"];

  // Schritt: id, titel, rolle (verantwortlich), fd (Nr. Funktionendiagramm, optional), informiert[], tage (relativ zum
  // Stichtag), nach[] (Vorgänger), aktion {vorgang, param{}} oder null (Aufgabe von Hand), auto (Flow ruft selbst auf,
  // sobald Vorgänger erledigt und Frist erreicht), bedingung {feld, op, wert} oder null, dokument (optional)
  const s = (id, titel, rolle, tage, nach, aktion, weitere) => Object.assign({ id, titel, rolle, tage, nach, aktion, auto: false, informiert: [], bedingung: null, fd: "" }, weitere || {});
  const a = (vorgang, param) => ({ vorgang, param });

  const VORLAGEN = [
    {
      id: "onboarding", titel: "Onboarding Mitarbeitende", version: 3, status: "freigegeben", stichtag: "Eintrittsdatum",
      beschreibung: "Vom Entscheid über die Anstellung bis zur Einführung am ersten Arbeitstag.",
      felder: [
        { key: "person", label: "Name", typ: "text" },
        { key: "funktion", label: "Funktion", typ: "auswahl", werte: FUNKTIONEN },
        { key: "stichtag", label: "Eintrittsdatum", typ: "datum" },
        { key: "pensum", label: "Pensum in %", typ: "zahl" },
      ],
      schritte: [
        s("o1", "Meldung über Eintritt an Schulverwaltung", "SL", -60, [], a("core.mitteilung.senden", { an: "SV", vorlage: "Eintritt {person}, {funktion}, ab {stichtag}" }), { fd: "5.2.2", informiert: ["SV"] }),
        s("o2", "Anstellungsverfügung ausstellen", "SV", -50, ["o1"], a("staffing.verfuegung.erstellen", { person: "{person}", pensum: "{pensum}", ab: "{stichtag}" }), { informiert: ["SL"] }),
        s("o3", "Personaldaten erfassen, Personaldossier eröffnen", "SV", -45, ["o2"], a("core.dossier.eroeffnen", { person: "{person}", funktion: "{funktion}", ab: "{stichtag}" }), { auto: true }),
        s("o4", "Strafregister-Auszug einholen", "SV", -40, ["o1"], a("core.dokument.anfordern", { person: "{person}", dokument: "Sonderprivatauszug" })),
        s("o5", "Konto anlegen gemäss Rollen- und Berechtigungskonzept", "SV", -21, ["o3"], a("ident.konto.anlegen", { person: "{person}", gueltigAb: "{stichtag-14}" }), { auto: true, fd: "3.10", informiert: ["ICT"] }),
        s("o6", "Funktionsgruppe zuweisen (Berechtigungen, Tools)", "SV", -21, ["o5"], a("ident.gruppe.zuweisen", { konto: "{o5.benutzername}", gruppe: "{funktion}" }), { auto: true, fd: "3.10" }),
        s("o7", "Office-Konto bereitstellen", "ICT", -14, ["o6"], a("connect.zugang.verteilen", { konto: "{o5.benutzername}", ziel: "Office-Konto" }), { auto: true }),
        s("o8", "Zugang Schulverwaltungssoftware und Schuladministration", "ICT", -14, ["o6"], a("connect.zugang.verteilen", { konto: "{o5.benutzername}", ziel: "Schuladministration (Noten, Absenzen)" }), { auto: true }),
        s("o9", "Zugang Lehrmittelportal", "ICT", -14, ["o6"], a("connect.zugang.verteilen", { konto: "{o5.benutzername}", ziel: "Lehrmittelportal" }), { auto: true, bedingung: { feld: "funktion", op: "in", wert: "Lehrperson, Klassenlehrperson, Schulische Heilpädagogin/-pädagoge, Vikarin/Vikar" } }),
        s("o10", "Zugang Notfall-App", "ICT", -7, ["o6"], a("connect.zugang.verteilen", { konto: "{o5.benutzername}", ziel: "Notfall-App" }), { auto: true }),
        s("o11", "Datenschutz-Weisung und Nutzungsvereinbarung unterzeichnen", "SV", -14, ["o3"], a("core.dokument.unterschrift", { person: "{person}", dokument: "Datenschutz-Weisung, Nutzungsvereinbarung, Verschwiegenheitserklärung" })),
        s("o12", "Berufsauftrag definieren", "SL", -30, ["o2"], a("staffing.berufsauftrag.festlegen", { person: "{person}", pensum: "{pensum}" }), { fd: "5.1.5", bedingung: { feld: "funktion", op: "in", wert: "Lehrperson, Klassenlehrperson, Schulische Heilpädagogin/-pädagoge" } }),
        s("o13", "Stundenplan abgeben", "SL", -14, ["o12"], a("time.stundenplan.zustellen", { person: "{person}", ab: "{stichtag}" }), { bedingung: { feld: "funktion", op: "in", wert: "Lehrperson, Klassenlehrperson, Schulische Heilpädagogin/-pädagoge" } }),
        s("o14", "Material und Lehrmittel bestellen", "SV", -21, ["o2"], a("shop.material.bestellen", { person: "{person}", paket: "Grundausstattung {funktion}" })),
        s("o15", "Schlüssel abgeben (Räume gemäss Einsatz)", "HD", -1, ["o3"], a("shop.ausgabe.erfassen", { person: "{person}", gegenstand: "Schlüssel" }), { informiert: ["SV"] }),
        s("o16", "Geräte übergeben, Übergabeprotokoll", "ICT", 0, ["o7"], a("shop.ausgabe.erfassen", { person: "{person}", gegenstand: "Notebook, Tablet" }), { fd: "3.7" }),
        s("o17", "Begrüssungsmail Schulleitung", "SL", -7, ["o7"], a("core.mitteilung.senden", { an: "{o5.benutzername}", vorlage: "Willkommen im Team, {person}" })),
        s("o18", "Mitteilung an das Team via Wocheninfo", "SL", -7, ["o2"], a("core.mitteilung.senden", { an: "Team", vorlage: "Neu bei uns ab {stichtag}: {person} ({funktion})" })),
        s("o19", "Kommunikation an Eltern und Klasse", "SL", -10, ["o2"], a("core.mitteilung.senden", { an: "Eltern der Klasse", vorlage: "Vorstellungsbrief {person}" }), { bedingung: { feld: "funktion", op: "=", wert: "Klassenlehrperson" } }),
        s("o20", "Einführung durch die Schulleitung", "SL", 0, ["o3"], a("time.termin.planen", { titel: "Einführung {person}", datum: "{stichtag}", mit: "{person}, SL" })),
      ],
    },
    {
      id: "offboarding", titel: "Offboarding Mitarbeitende", version: 2, status: "freigegeben", stichtag: "Letzter Arbeitstag",
      beschreibung: "Vom Austritt bis zum abgeschlossenen Personaldossier – Logins werden erst nach dem letzten Arbeitstag gesperrt.",
      felder: [
        { key: "person", label: "Name", typ: "text" },
        { key: "funktion", label: "Funktion", typ: "auswahl", werte: FUNKTIONEN },
        { key: "stichtag", label: "Letzter Arbeitstag", typ: "datum" },
      ],
      schritte: [
        s("f1", "Meldung über Austritt", "SL", -45, [], a("core.mitteilung.senden", { an: "SV", vorlage: "Austritt {person} per {stichtag}" }), { informiert: ["SV", "ICT", "HD"] }),
        s("f2", "Anstellung beenden bzw. Verfügung nicht verlängern", "SV", -40, ["f1"], a("staffing.verfuegung.beenden", { person: "{person}", per: "{stichtag}" }), { fd: "5.2.3", informiert: ["SPF"] }),
        s("f3", "Austrittsgespräch Schulleitung", "SL", -14, ["f1"], a("time.termin.planen", { titel: "Austrittsgespräch {person}", datum: "{stichtag-14}", mit: "{person}, SL" })),
        s("f4", "Nachfolge für Ämter festlegen, Übergabe", "SL", -14, ["f1"], null, { informiert: ["SV"] }),
        s("f5", "Arbeitszeugnis erstellen", "SV", -7, ["f3"], a("core.dokument.unterschrift", { person: "SL", dokument: "Arbeitszeugnis {person}" }), { fd: "5.4.8" }),
        s("f6", "Austrittserklärung unterzeichnen", "SV", -5, ["f2"], a("core.dokument.unterschrift", { person: "{person}", dokument: "Austrittserklärung" })),
        s("f7", "Rückgabe Geräte und Zubehör", "ICT", 0, ["f1"], a("shop.rueckgabe.erfassen", { person: "{person}", gegenstand: "Notebook, Tablet, Zubehör" })),
        s("f8", "Rückgabe Lehrmittel und Material", "SV", 0, ["f1"], a("shop.rueckgabe.erfassen", { person: "{person}", gegenstand: "Lehrmittel" }), { bedingung: { feld: "funktion", op: "in", wert: "Lehrperson, Klassenlehrperson, Schulische Heilpädagogin/-pädagoge, Vikarin/Vikar" } }),
        s("f9", "Schlüssel zurückfordern", "HD", 0, ["f1"], a("shop.rueckgabe.erfassen", { person: "{person}", gegenstand: "Schlüssel" })),
        s("f10", "Logins sperren, Abwesenheitsnotiz setzen", "SV", 1, ["f2"], a("ident.konto.sperren", { konto: "{person}", ab: "{stichtag+1}", abwesenheitsnotiz: "ja" }), { auto: true, fd: "3.10", informiert: ["ICT"] }),
        s("f11", "Zugänge in Zielsystemen entfernen", "ICT", 1, ["f10"], a("connect.zugang.entfernen", { konto: "{person}", ziel: "alle" }), { auto: true }),
        s("f12", "Personaldossier abschliessen", "SV", 30, ["f6", "f11"], a("core.dossier.abschliessen", { person: "{person}", per: "{stichtag}" })),
      ],
    },
    {
      id: "mutation", titel: "Mutation Mitarbeitende", version: 1, status: "entwurf", stichtag: "Gültig ab",
      beschreibung: "Änderung von Pensum, Funktion oder Name. Welche Schritte nötig sind, entscheidet die Art der Mutation.",
      felder: [
        { key: "person", label: "Name", typ: "text" },
        { key: "art", label: "Art der Mutation", typ: "auswahl", werte: ["Pensum", "Funktion/Rolle", "Name"] },
        { key: "funktion", label: "Funktion (neu)", typ: "auswahl", werte: FUNKTIONEN },
        { key: "stichtag", label: "Gültig ab", typ: "datum" },
        { key: "pensumAlt", label: "Pensum bisher in %", typ: "zahl" },
        { key: "pensum", label: "Pensum neu in %", typ: "zahl" },
      ],
      schritte: [
        s("m1", "Meldung über Mutation", "SL", -30, [], a("core.mitteilung.senden", { an: "SV", vorlage: "Mutation {art}: {person} ab {stichtag}" }), { informiert: ["SV"] }),
        s("m2", "Pensum anpassen (neue Verfügung)", "SV", -21, ["m1"], a("staffing.pensum.aendern", { person: "{person}", pensum: "{pensum}", ab: "{stichtag}" }), { bedingung: { feld: "art", op: "=", wert: "Pensum" } }),
        s("m3", "Teilkündigung bei Reduktion", "SL", -21, ["m1"], null, { bedingung: { feld: "pensum", op: "<", wert: "{pensumAlt}" }, informiert: ["SV"] }),
        s("m4", "Gruppen und Berechtigungen anpassen", "SV", -7, ["m1"], a("ident.gruppe.zuweisen", { konto: "{person}", gruppe: "{funktion}" }), { auto: true, fd: "3.10", bedingung: { feld: "art", op: "=", wert: "Funktion/Rolle" } }),
        s("m5", "Name im Konto ändern", "SV", -7, ["m1"], a("ident.konto.aendern", { konto: "{person}", aenderung: "Name" }), { auto: true, bedingung: { feld: "art", op: "=", wert: "Name" } }),
        s("m6", "Änderung an Zielsysteme verteilen", "ICT", 0, ["m4", "m5"], a("connect.daten.abgleichen", { konto: "{person}" }), { auto: true }),
        s("m7", "Zugriffsberechtigungen überprüfen", "SV", 7, ["m6"], a("ident.rechte.pruefen", { konto: "{person}" }), { fd: "3.10", informiert: ["ICT"] }),
      ],
    },
  ];

  VORLAGEN.push({
    id: "beschaffung", titel: "Beschaffung Geräte", version: 1, status: "freigegeben", stichtag: "Geräte bereit ab",
    beschreibung: "Jährliche Gerätebeschaffung (Master-Checkliste ICT-Jahreszyklus): von der Mengenplanung bis zu den bereitgestellten Geräten.",
    felder: [
      { key: "person", label: "Bezeichnung (z. B. Tablets 1. Klassen)", typ: "text" },
      { key: "menge", label: "Anzahl Geräte", typ: "zahl" },
      { key: "stichtag", label: "Geräte bereit ab", typ: "datum" },
    ],
    schritte: [
      s("b1", "Mengenplanung (Life-Cycle, neue Stellen, Reserve)", "ICT", -91, [], null, { informiert: ["SL"] }),
      s("b2", "Offerten einholen und prüfen", "ICT", -82, ["b1"], null),
      s("b3", "Antrag Beschaffung zum Entscheid", "ICT", -75, ["b2"], a("core.antrag.stellen", { an: "RV", betreff: "Beschaffung {menge} × {person}" }), { fd: "3.7", informiert: ["SL", "SV"] }),
      s("b4", "Bestellung auslösen", "ICT", -61, ["b3"], a("shop.geraete.bestellen", { artikel: "{person}", menge: "{menge}" }), { auto: true, informiert: ["SV"] }),
      s("b5", "Inventar erfassen und Klassen zuweisen", "ICT", -47, ["b4"], a("shop.inventar.erfassen", { bestellung: "{b4.bestellung}", menge: "{menge}" }), { auto: true }),
      s("b6", "Setup und Installation", "ICT", -16, ["b5"], null),
      s("b7", "Beschriftungen erstellen und anbringen", "ICT", -16, ["b5"], null),
      s("b8", "Geräte bereitstellen", "ICT", 0, ["b6", "b7"], a("shop.ausgabe.erfassen", { person: "Klassen gemäss Zuteilung", gegenstand: "{person}" }), { informiert: ["SL"] }),
    ],
  });

  // ---------------------------------------------------------------- Jahreskalender
  // Grundlagen: Jahresplanung ICT-Prozesse (Q1–Q4, Stand 27.05.2026, auch Flipchart der Arbeitsgruppe),
  // Master-Checkliste ICT-Jahreszyklus (Termine mit Teilaufgaben), Jahreskalender Fachstelle ICT (Kalenderwochen).
  // Produkt-, Hersteller- und Ortsnamen sind durch neutrale Begriffe ersetzt.
  const KAL_ROLLEN = {
    SPF: "Schulpflege", LB: "LB (Bezeichnung zu prüfen)", SL: "Schulleitung", SK: "Schulkonferenz", PICTS: "Pädagogischer ICT-Support",
    SV: "Schulverwaltung", VT: "Verantwortliche Technik", TICTS: "Technischer ICT-Support", ISV: "Informationssicherheit", DB: "Datenschutzberatung",
  };
  // Zuordnung Rollen in EduKSX-Flow → Spalten der Jahresplanung (für «Meine Termine»)
  const KAL_ZUORDNUNG = { SPF: ["SPF"], RV: ["LB"], SL: ["SL", "SK"], SV: ["SV"], ICT: ["PICTS", "VT", "TICTS"], HD: [], SPr: [], LP: [] };
  const BEREICHE = {
    budget: ["Budget & Planung", "violett"],
    beschaffung: ["Beschaffung & Geräte", "warnung"],
    ma: ["On-/Offboarding Mitarbeitende", "info"],
    sus: ["Schülerinnen und Schüler", "erfolg"],
    sjw: ["Schuljahreswechsel & Daten", "neutral"],
    apps: ["Lizenzen & Apps", "info"],
    wb: ["Weiterbildung", "violett"],
    ds: ["Datenschutz & Sicherheit", "fehler"],
    qual: ["Qualität & Evaluation", "erfolg"],
    komm: ["Kommunikation & Eltern", "warnung"],
    digi: ["Digitale Verwaltung (DigiLex)", "neutral"],
    betrieb: ["Betrieb & Support", "neutral"],
  };
  const QUELLEN = { plan: "Jahresplanung ICT-Prozesse", liste: "Master-Checkliste ICT-Jahreszyklus", kw: "Jahreskalender Fachstelle ICT", beispiel: "Beispiele Zeitregeln (Prototyp)" };

  // Schuljahresdaten mit Ferien. Testdaten: Ferienplan der Sekundarschulgemeinde Bülach (öffentlich, Ferienplan
  // 2026–2029 auf buelach.ch; 2025/26 nach den Daten der Kreisgemeinden). Semester- und Trimestergrenzen sind
  // Annahmen (Semesterwechsel Anfang Februar, vgl. Jahreskalender Fachstelle ICT KW 5/6).
  // Ferienarten: ferien = Ferien, frei = schulfrei (Feiertag, Brücke), anlass = besonderer Tag ohne Unterrichtsausfall
  const f = (name, von, bis, art) => ({ name, von, bis: bis || von, art: art || "ferien" });
  const SCHULJAHRE = [
    { name: "2025/26", wechsel: "2025-08-01", beginn: "2025-08-18", semesterende1: "2026-01-30", semesterwechsel: "2026-02-02", ende: "2026-07-10", trimester2: "2025-11-17", trimester3: "2026-03-09",
      ferien: [f("Herbstferien", "2025-10-06", "2025-10-17"), f("Weihnachtsferien", "2025-12-22", "2026-01-02"), f("Sportferien", "2026-02-09", "2026-02-20"),
        f("Ostern", "2026-04-03", "2026-04-06", "frei"), f("Frühlingsferien", "2026-04-20", "2026-05-01"), f("Auffahrtsbrücke", "2026-05-14", "2026-05-15", "frei"),
        f("Pfingstmontag", "2026-05-25", null, "frei"), f("Sommerferien", "2026-07-13", "2026-08-14")] },
    { name: "2026/27", wechsel: "2026-08-01", beginn: "2026-08-17", semesterende1: "2027-01-29", semesterwechsel: "2027-02-01", ende: "2027-07-16", trimester2: "2026-11-16", trimester3: "2027-03-08",
      ferien: [f("Herbstferien", "2026-10-05", "2026-10-16"), f("Herbstmärt mit Brücke", "2026-11-02", "2026-11-03", "frei"), f("Schulsilvester", "2026-12-18", null, "anlass"),
        f("Weihnachtsferien", "2026-12-21", "2027-01-01"), f("Sportferien", "2027-02-15", "2027-02-26"), f("Gründonnerstag (Schulschluss 12 Uhr)", "2027-03-25", null, "anlass"),
        f("Ostern", "2027-03-26", "2027-03-29", "frei"), f("Frühlingsferien", "2027-04-26", "2027-05-07"), f("Auffahrtsbrücke", "2027-05-06", "2027-05-07", "frei"),
        f("Pfingstmontag", "2027-05-17", null, "frei"), f("Maimärt", "2027-05-25", null, "anlass"), f("Sommerferien", "2027-07-19", "2027-08-20")] },
    { name: "2027/28", wechsel: "2027-08-01", beginn: "2027-08-23", semesterende1: "2028-02-04", semesterwechsel: "2028-02-07", ende: "2028-07-14", trimester2: "2027-11-22", trimester3: "2028-03-13",
      ferien: [f("Herbstferien", "2027-10-11", "2027-10-22"), f("Herbstmärt mit Brücke", "2027-11-01", "2027-11-02", "frei"), f("Schulsilvester", "2027-12-17", null, "anlass"),
        f("Weihnachtsferien", "2027-12-20", "2027-12-31"), f("Sportferien", "2028-02-14", "2028-02-25"), f("Gründonnerstag (Schulschluss 12 Uhr)", "2028-04-13", null, "anlass"),
        f("Ostern", "2028-04-14", "2028-04-17", "frei"), f("Frühlingsferien", "2028-04-17", "2028-04-28"), f("Auffahrtsbrücke", "2028-05-25", "2028-05-26", "frei"),
        f("Maimärt", "2028-05-30", null, "anlass"), f("Pfingstmontag", "2028-06-05", null, "frei"), f("Sommerferien", "2028-07-17", "2028-08-18")] },
    { name: "2028/29", wechsel: "2028-08-01", beginn: "2028-08-21", semesterende1: "2029-02-02", semesterwechsel: "2029-02-05", ende: "2029-07-13", trimester2: "2028-11-20", trimester3: "2029-03-12",
      ferien: [f("Herbstferien", "2028-10-09", "2028-10-20"), f("Herbstmärt mit Brücke", "2028-10-30", "2028-10-31", "frei"), f("Schulsilvester", "2028-12-22", null, "anlass"),
        f("Weihnachtsferien", "2028-12-25", "2029-01-05"), f("Sportferien", "2029-02-12", "2029-02-23"), f("Gründonnerstag (Schulschluss 12 Uhr)", "2029-03-29", null, "anlass"),
        f("Ostern", "2029-03-30", "2029-04-02", "frei"), f("Frühlingsferien", "2029-04-23", "2029-05-04"), f("Auffahrtsbrücke", "2029-05-10", "2029-05-11", "frei"),
        f("Pfingstmontag", "2029-05-21", null, "frei"), f("Maimärt", "2029-05-29", null, "anlass"), f("Sommerferien", "2029-07-16", "2029-08-17")] },
  ];

  const r = (txt) => Object.fromEntries(String(txt || "").split(/\s+/).filter(Boolean).map((x) => x.split(":")));
  const EREIGNISSE = [];
  let nr = 0;
  // zeit: { q } Quartal · { kw } Kalenderwoche · { am } Datum MM-TT · { von, bis } Zeitraum MM-TT
  const e = (titel, bereich, zeit, rollen, quelle, weitere) => EREIGNISSE.push(Object.assign({ id: "k" + String(++nr).padStart(3, "0"), titel, bereich, zeit, jahr: null, rollen: r(rollen), quelle, flow: null, teil: [], notiz: "" }, weitere || {}));
  const nur26 = { jahr: 2026 };

  // Jahresplanung ICT-Prozesse – jährlich wiederkehrend
  e("Budget vorbereiten", "budget", { q: 1 }, "LB:E SL:E PICTS:M SV:M VT:M TICTS:M ISV:M DB:M", "plan");
  e("Hardwarebeschaffung: Submission", "beschaffung", { q: 1 }, "SPF:E PICTS:M SV:M VT:M TICTS:M", "plan", { flow: "beschaffung" });
  e("Pensenplanung ICT pädagogisch", "budget", { q: 1 }, "SL:E PICTS:M SV:M", "plan");
  e("Pensenplanung ICT technisch", "budget", { q: 1 }, "SPF:E SV:M VT:M TICTS:M", "plan");
  e("Weiterbildungsplanung pädagogisch", "wb", { q: 1 }, "SL:E SK:E PICTS:M", "plan");
  e("Weiterbildungsplanung Informationssicherheit und Datenschutz", "wb", { q: 1 }, "SPF:E LB:M SL:M PICTS:M VT:M TICTS:M ISV:E/V DB:M", "plan");
  e("Umsetzung budgetierte Projekte", "budget", { q: 1 }, "SL:M PICTS:M VT:E/V TICTS:M ISV:M", "plan");
  e("Gestaltung Schulprogramm", "qual", { q: 1 }, "SPF:A LB:V SL:E SK:E PICTS:M", "plan");
  e("Überarbeitung Nutzungsvereinbarung Lehrpersonen", "ma", { q: 1 }, "SPF:V SL:M ISV:M DB:M", "plan");
  e("Überarbeitung Nutzungsvereinbarung Schülerinnen und Schüler", "sus", { q: 1 }, "SL:V PICTS:M ISV:M", "plan");
  e("Hardware bereit machen, aufsetzen", "beschaffung", { q: 2 }, "VT:V TICTS:M ISV:M", "plan");
  e("Qualitätsmanagement: Schwerpunkte des ICT-Konzepts auswerten", "qual", { q: 2 }, "SPF:M LB:V SL:E PICTS:M SV:M VT:M TICTS:M ISV:M", "plan");
  e("Budget definieren (Eingabe neues Kalenderjahr, ER und IR)", "budget", { q: 2 }, "SPF:E LB:M", "plan");
  e("On-/Offboarding Mitarbeitende und SuS inkl. Schulungen vorbereiten", "ma", { q: 2 }, "LB:V SL:V PICTS:M VT:V TICTS:M ISV:V", "plan", { flow: "onboarding" });
  e("PICTS-Übergaben bei Mutationen", "ma", { q: 2 }, "SL:V PICTS:M", "plan", { flow: "mutation" });
  e("App-Mutationen", "apps", { q: 2 }, "SL:M SK:E PICTS:M/E SV:M VT:V TICTS:M ISV:E", "plan");
  e("Benutzer-Mutationen in Apps", "apps", { q: 2 }, "PICTS:M VT:V TICTS:M", "plan");
  e("On-/Offboarding Behörden", "ma", { q: 2 }, "SPF:M PICTS:M VT:V TICTS:M ISV:M", "plan");
  e("Legislaturziele", "budget", { q: 2 }, "SPF:E LB:M SL:M SK:M PICTS:M SV:M VT:M TICTS:M ISV:M DB:M", "plan");
  e("Evaluation pädagogisch: Was haben wir von unseren Vorhaben umgesetzt?", "qual", { q: 2 }, "LB:M SL:V SK:V PICTS:V", "plan");
  e("App-Mutationen (Lernsoftware und Plattformen)", "apps", { q: 3 }, "SL:M PICTS:M VT:V TICTS:M ISV:M", "plan");
  e("Gerätemutationen", "beschaffung", { q: 3 }, "VT:V TICTS:M", "plan");
  e("On-/Offboarding neue Mitarbeitende durchführen (Konten, Nutzungsvereinbarung)", "ma", { q: 3 }, "SL:M PICTS:M VT:V TICTS:M", "plan", { flow: "onboarding" });
  e("On-/Offboarding neue SuS durchführen (Konten, Nutzungsvereinbarung)", "sus", { q: 3 }, "PICTS:M VT:V TICTS:M", "plan");
  e("Weiterbildung mit ICT-Fokus durchführen, auch Datenschutz", "wb", { q: 3 }, "SL:V PICTS:M VT:M TICTS:M ISV:M", "plan");
  e("Data-Cleaning-Day (alte Daten löschen bzw. ablegen)", "ds", { q: 3 }, "SL:V PICTS:M VT:M TICTS:M ISV:M", "plan");
  e("Weiterbildung mit ICT-Fokus durchführen, auch Datenschutz", "wb", { q: 4 }, "LB:V SL:V PICTS:M VT:M TICTS:M ISV:M", "plan");
  e("Evaluation technisch: Was haben wir von unseren Vorhaben umgesetzt?", "qual", { q: 4 }, "LB:M/V PICTS:M VT:V TICTS:M", "plan");
  e("Planung Massnahmen nächstes Kalenderjahr (ohne Budgetrelevanz)", "budget", { q: 4 }, "LB:V SL:M SK:M PICTS:M VT:V TICTS:M ISV:M DB:M", "plan");
  e("Wiederherstellungstest aus Backup (auch bei Anbietern nachfragen)", "ds", { q: 4 }, "VT:V TICTS:M ISV:V", "plan");
  e("Aktualisierung und Überprüfung Inventar", "beschaffung", { q: 4 }, "VT:V TICTS:M ISV:V", "plan");
  e("Schutzbedarfsanalyse überprüfen und überarbeiten", "ds", { q: 4 }, "SL:M PICTS:M SV:M VT:M TICTS:M ISV:V DB:M", "plan");
  e("Rollen- und Berechtigungskonzept prüfen", "ds", { q: 4 }, "SL:M PICTS:M SV:M VT:M ISV:V DB:M", "plan");
  e("Überprüfung Datensicherheit (Benutzer, Rechte)", "ds", { q: 4 }, "SV:M VT:M ISV:V", "plan");
  e("Auftragsdatenvereinbarungen mit externen Dienstleistern prüfen", "ds", { q: 4 }, "SPF:M SV:M VT:M ISV:V", "plan");
  e("Aufbewahrungsfristen Dossiers (Schulverwaltung)", "ds", { q: 4 }, "SV:V ISV:V DB:M", "plan");
  e("Planung Awareness-Kampagnen (z. B. Phishing)", "ds", { q: 4 }, "LB:M SL:M VT:M ISV:V DB:M", "plan");

  // Jahresplanung – nur 2026 (Gesetz über die digitale Verwaltung, DigiLex)
  e("Massgebliche Kanäle definieren", "digi", { q: 1 }, "", "plan", nur26);
  e("Prozesse festlegen", "digi", { q: 1 }, "", "plan", nur26);
  e("Budget festlegen", "digi", { q: 1 }, "", "plan", nur26);
  e("Signaturlösung (QES) und Zustellplattform evaluieren und entscheiden", "digi", { q: 1 }, "", "plan", nur26);
  e("Info an Mitarbeitende durch Informationssicherheit und Schulleitung", "digi", { q: 2 }, "", "plan", nur26);
  e("Technische Implementierung Signaturlösung und Zustellplattform", "digi", { q: 2 }, "", "plan", nur26);
  e("Schulung DigiLex an Mitarbeitende und Erziehungsberechtigte", "digi", { q: 3 }, "", "plan", nur26);
  e("Kommunikation intern und extern", "digi", { q: 3 }, "", "plan", nur26);
  e("Testen Kanal und Signaturlösung", "digi", { q: 3 }, "", "plan", nur26);
  e("Definition interne Prozesse (wer macht wann was, Fristen)", "digi", { q: 3 }, "", "plan", nur26);
  e("Meldung massgeblicher Kanal an die Staatskanzlei", "digi", { q: 4 }, "", "plan", nur26);
  e("Information an Erziehungsberechtigte: Kanal steht bereit", "digi", { q: 4 }, "", "plan", nur26);

  // Master-Checkliste ICT-Jahreszyklus – Termine mit Teilaufgaben
  e("Elternabend Medienbildung (5. Klasse)", "komm", { von: "03-01", bis: "05-31" }, "PICTS:V", "liste", { teil: [["Aktuelle Ausschreibung anfordern", "03-01"], ["Einladung vorbereiten", "03-15"], ["Einladung an Eltern und LP versenden", "04-01"], ["Hinweis an LP: bei Eltern werben", "04-15"], ["Details mit externer Fachstelle klären", "04-15"], ["Raumeinrichtung mit Hausdienst besprechen", "05-01"], ["Erinnerung an Eltern versenden", "05-01"], ["Durchführung Elternabend", "05-31"]] });
  e("Beschaffung Geräte SuS", "beschaffung", { von: "04-01", bis: "07-31" }, "TICTS:V", "liste", { flow: "beschaffung", teil: [["Mengenplanung (7–10 Reserve)", "04-01"], ["Offerten einholen und prüfen", "04-10"], ["Bestellung auslösen", "05-01"], ["Inventar erfassen und Klassen zuweisen", "05-15"], ["Setup und Installation", "06-15"], ["Beschriftungen erstellen und anbringen", "06-15"], ["Geräte bereitstellen", "07-01"]] });
  e("Beschaffung Geräte Lehrpersonen", "beschaffung", { von: "04-01", bis: "06-30" }, "TICTS:V", "liste", { flow: "beschaffung", teil: [["Mengenplanung Life-Cycle und zusätzliche Stellen", "04-01"], ["Gerätetyp mit Lehrpersonen klären", "04-02"], ["Rücksprache Nachbarschule für gemeinsame Bestellung", "04-02"], ["Offerten einholen und prüfen", "04-10"], ["Bestellung auslösen", "05-01"], ["Inventar erfassen", "05-15"], ["Setup und Installation", "05-15"], ["Beschriftungen erstellen und anbringen", "05-15"], ["Life-Cycle-Tausch je Lehrperson auslösen", "05-15"]] });
  e("Zubehör-Check", "beschaffung", { von: "05-01", bis: "05-31" }, "TICTS:V", "liste", { teil: [["Kopfhörer: Bestand prüfen und bestellen", "05-01"], ["Geräte-Hüllen: Bestand prüfen und bestellen", "05-01"], ["USB-C-Adapter: Bestand prüfen und bestellen", "05-01"], ["Audio-Adapter: Bestand prüfen und bestellen", "05-01"]] });
  e("Schuljahreswechsel Schuladministration", "sjw", { von: "05-01", bis: "08-01" }, "TICTS:V SV:M", "liste", { teil: [["Klassenbesetzung per Umfrage erfassen", "05-01"], ["Neues Schuljahr eröffnen", "05-01"], ["Daten für neues Schuljahr importieren", "05-01"], ["Klassenzuteilungen abbilden", "05-31"], ["Zugänge löschen und neue erstellen", "08-01"]] });
  e("Schuljahreswechsel Eltern-App", "sjw", { von: "05-15", bis: "07-31" }, "TICTS:V", "liste", { teil: [["Neue 1. Klassen erstellen (Abgleich aus Schuladministration)", "05-15"], ["Info an Schulverwaltung: Zugangscodes verfügbar", "05-16"], ["Neue Klassen erstellen", "07-15"], ["Alte Klassen deaktivieren", "07-15"], ["Zugänge löschen", "07-15"]] });
  e("Budget- und Zukunftsplanung", "budget", { von: "06-01", bis: "06-30" }, "TICTS:V", "liste", { teil: [["Life-Cycle-Ersatz fürs Folgejahr planen (3 Reserve)", "06-01"], ["Projekte fürs Folgejahr planen", "06-01"], ["Anschaffungen und Ersatz fürs Folgejahr planen", "06-01"], ["Lizenzen Schuladministration bei Bedarf erweitern", "06-15"], ["Budget-Eingaben weitergeben", "06-30"]] });
  e("SuS-Logins 1. Klasse", "sus", { von: "07-01", bis: "07-02" }, "TICTS:V", "liste", { teil: [["Liste für Import erstellen", "07-01"], ["Liste für Import an Datenverarbeitung senden", "07-02"], ["Logins Lehrmittelportal erstellen", "07-01"], ["Logins Lern-App erstellen", "07-01"], ["Zugangsliste an Klassenlehrpersonen senden", "07-02"]] });
  e("Hardware-Rotation mit der Sekundarschule", "beschaffung", { von: "07-01", bis: "09-30" }, "TICTS:V", "liste", { teil: [["Pool-Geräte identifizieren", "07-01"], ["Austrittsgeräte SuS zurücknehmen und zurücksetzen", "07-15"], ["Inventar: Mutationen und Standorte anpassen", "07-15"], ["Geräte an die Sekundarschule übergeben", "07-31"], ["Altgeräte der Sekundarschule übernehmen", "08-01"], ["Bestand prüfen und Altgeräte zuteilen", "08-30"]] });
  e("Einführung SuS-Geräte (5. Klasse)", "sus", { von: "07-01", bis: "09-30" }, "PICTS:V", "liste", { teil: [["Info an Klassenlehrpersonen mit Terminauswahl", "07-01"], ["Elternschreiben und Ferienregelung drucken", "09-01"], ["Einführung je Schulhaus", "09-30"]] });
  e("Schuljahreswechsel Verzeichnisdienst", "sjw", { regel: "stichtag", anker: "schuljahreswechsel", versatz: 0, einheit: "tage" }, "TICTS:V", "liste", { teil: [["Konten Lehrpersonen verschieben", "08-01"], ["Konten SuS verschieben", "08-01"]] });
  e("Schuljahreswechsel Lernstandsplattform", "sjw", { von: "08-15", bis: "08-30" }, "TICTS:V", "liste", { teil: [["Klassen erstellen", "08-15"], ["Pakete für Lehrpersonen freischalten", "08-30"]] });
  e("Office-Lizenzen", "apps", { von: "09-01", bis: "10-31" }, "TICTS:V SV:M", "liste", { teil: [["Anzahl Mitarbeitende ermitteln (LP, Gestaltungspool, SSA)", "09-01"], ["Anzahl Lizenzen an Lizenzpartner melden", "09-15"], ["Lizenzen bei Bedarf erweitern", "09-15"], ["Lizenzen aktivieren", "10-01"]] });
  e("Elternabend Medienbildung (Kindergarten)", "komm", { von: "09-01", bis: "11-30" }, "PICTS:V", "liste", { teil: [["Aktuelle Ausschreibung anfordern", "09-01"], ["Einladung vorbereiten", "09-15"], ["Einladung an Eltern und LP versenden", "10-01"], ["Hinweis an LP: bei Eltern werben", "10-15"], ["Details mit externer Fachstelle klären", "10-15"], ["Raumeinrichtung mit Hausdienst besprechen", "11-01"], ["Erinnerung an Eltern versenden", "11-01"], ["Durchführung Elternabend", "11-30"]] });
  e("Bereinigung Verzeichnisdienst", "ds", { von: "10-01", bis: "12-31" }, "TICTS:V", "liste", { teil: [["Alte Konten deaktivieren", "10-01"], ["Alte Konten löschen", "12-31"]] });

  // Jahreskalender Fachstelle ICT – nach Kalenderwochen
  const kw = (w, titel, bereich, weitere) => e(titel, bereich, { kw: w }, "TICTS:V", "kw", weitere);
  kw(1, "Schuladministration: 2. Semester anlegen", "sjw");
  kw(3, "Schuladministration: 2. Semester sichtbar machen", "sjw");
  kw(5, "Schuladministration: Notenabgabe Zeugnis 1. Semester", "sjw");
  kw(5, "Schuladministration: Zeugnisdruck 1. Semester", "sjw");
  kw(6, "Schuladministration: 2. Semester bearbeitbar", "sjw");
  kw(6, "WLAN Gäste: Passwortwechsel", "ds");
  kw(6, "Offboarding SuS: Ablauf definieren", "sus");
  kw(7, "Offboarding SuS: Information Kauf Tablet (SuS und Eltern)", "sus");
  kw(8, "Offizieller Umstufungstermin (Sportferien)", "sus");
  kw(9, "Standortbestimmungstests durchführen", "apps");
  kw(9, "Offboarding SuS: Info Verkauf Tablet an Lehrpersonen", "sus");
  kw(9, "Onboarding SuS: Nutzungsvereinbarung aktualisieren", "sus");
  kw(9, "Onboarding Lehrpersonen: Nutzungsvereinbarung aktualisieren", "ma");
  kw(10, "Beschaffung: Ausschreibung (Tablets, Notebooks)", "beschaffung", { flow: "beschaffung" });
  kw(12, "Schülereinteilung (Tabelle) – Schulverwaltung", "sjw");
  kw(13, "Offboarding SuS: Verkaufsinfo im Jahrgangsteam präsentieren", "sus");
  kw(13, "Weiterbildung Schule: Fachstelle ICT informiert (30 Min.)", "wb");
  kw(13, "Inventarisierung: Geräte der Lehrpersonen etikettieren", "beschaffung");
  kw(14, "Zeugnisübertragung Schuladministration → Schulverwaltungssoftware", "sjw");
  kw(14, "Beschaffung: Abgabetermin Ausschreibung", "beschaffung");
  kw(14, "Schuladministration: 1. Semester neues Schuljahr anlegen", "sjw");
  kw(14, "Nutzungsvereinbarungen SuS und LP durch Geschäftsleitung abnehmen lassen", "ds");
  kw(14, "Offboarding SuS: Elterninfo Ablauf Geräteverkauf", "sus");
  kw(16, "Beschaffung: Antrag an Geschäftsleitung", "beschaffung");
  kw(16, "Offizieller Umstufungstermin (Frühlingsferien)", "sus");
  kw(18, "Beschaffung: Antrag an Schulpflege", "beschaffung");
  kw(19, "Onboarding Lehrpersonen: Material in Boxen bereitstellen", "ma");
  kw(20, "Beschaffung: Bestellung auslösen", "beschaffung");
  kw(20, "Schülereinteilung: Import in Schulverwaltungssoftware", "sjw");
  kw(20, "Offboarding SuS: Terminplanung Rückgabe in der Klasse (Umfrage)", "sus");
  kw(22, "Onboarding Lehrpersonen: Onboarding-Kurs aktualisieren", "ma");
  kw(22, "Einteilungsbrief versenden", "komm");
  kw(23, "Erster Import Schulverwaltungssoftware → Schuladministration", "sjw");
  kw(23, "Beschaffung: Distributionsmaterial (Boxen)", "beschaffung");
  kw(24, "Beschaffung: Auslieferung Notebooks", "beschaffung");
  kw(25, "Beschaffung: Notebooks inventarisieren", "beschaffung");
  kw(25, "Eltern-App: Zugangsdaten erstellen", "komm");
  kw(25, "Offboarding SuS: Klassenliste Kauf/Rückgabe vorbereiten", "sus");
  kw(26, "Eltern-App: Zugangsdaten an Eltern versenden", "komm");
  kw(27, "Offboarding Lehrpersonen: Rückgabe-Ablauf per Mail an Austretende", "ma", { flow: "offboarding" });
  kw(27, "Onboarding SuS: Terminplanung mit Lehrpersonen, Passwortblätter, Nutzungsvereinbarung verteilen", "sus");
  kw(27, "Onboarding Lehrpersonen: IT-Boxen, Benutzerdatenblatt, Nutzungsvereinbarung", "ma", { flow: "onboarding" });
  kw(27, "Offboarding SuS: Zahlungseingang überwachen, Geräte zurücksetzen", "sus");
  kw(28, "Offboarding Lehrpersonen: Rückgabeboxen in den Schulhäusern", "ma");
  kw(28, "Onboarding: Kick-off I für neue Mitarbeitende, Abgabe IT-Boxen", "ma");
  kw(28, "Schuladministration: Notenabgabe und Zeugnisdruck 2. Semester", "sjw");
  kw(28, "Beschaffung: Auslieferung Tablets", "beschaffung");
  kw(28, "Lehrmittel-Lizenzen: Import Benutzer und Klassen", "apps");
  kw(28, "Datenabgleich: Synchronisation stoppen", "sjw");
  kw(29, "Datenabgleich: manueller Import und Bereinigung Importfehler", "sjw");
  kw(29, "Onboarding SuS: Klassensätze vorbereiten", "sus");
  kw(29, "Beschaffung: Tablets inventarisieren", "beschaffung");
  kw(29, "Systeme nur begrenzt verfügbar", "sjw");
  kw(29, "Erster Import Schuladministration → Office-Konten", "sjw");
  kw(29, "Eltern-App: Aktivierungsbriefe drucken", "komm");
  kw(30, "Datenabgleich: Abschluss Import Schuljahreswechsel", "sjw");
  kw(31, "WLAN: Passwortwechsel neues Schuljahr", "ds");
  kw(31, "Offboarding Lehrpersonen: Geräte zurücksetzen", "ma");
  kw(32, "Schuladministration: 1. Semester bearbeitbar", "sjw");
  kw(32, "Eltern-App: erste Synchronisation mit Schuladministration", "komm");
  kw(33, "Onboarding: Kick-off II (Zimmerinfrastruktur)", "ma");
  kw(33, "Support-Spitze Schulstart", "sjw");
  kw(33, "Medien- und Bibliotheksverwaltung: SuS und LP aktualisieren", "apps");
  kw(33, "Lehrmittel-Lizenzen: Lizenzzuweisung", "apps");
  kw(33, "Website und Klassenauswahl aktualisieren", "komm");
  kw(35, "Rücklauf Geräte an Rücknahmepartner (SuS und LP)", "beschaffung");
  kw(35, "Lernplattform und Portfolio: Import Klassen, SuS, Lizenzzuweisung", "apps");
  kw(36, "Betriebssystem-Updates aktiv blockieren", "ds");
  kw(44, "Erneuerung Geräte älter als 5 Jahre (Notebooks, Tablets)", "beschaffung", { flow: "beschaffung" });
  kw(45, "Offizieller Umstufungstermin", "sus");

  // Beispiele für die übrigen Zeitregeln (Schuljahrestermine und Wiederholungen)
  const bsp = (titel, bereich, zeit, rollen, weitere) => e(titel, bereich, zeit, rollen, "beispiel", weitere);
  bsp("Onboarding neue Lehrpersonen: Abläufe starten", "ma", { regel: "stichtag", anker: "schuljahresbeginn", versatz: -6, einheit: "wochen" }, "SL:V SV:M TICTS:M", { flow: "onboarding" });
  bsp("Klassenlisten fürs neue Schuljahr bereitstellen", "sjw", { regel: "stichtag", anker: "schuljahresende", versatz: -2, einheit: "monate" }, "SV:V TICTS:M");
  bsp("Konten des alten Schuljahres archivieren", "ds", { regel: "stichtag", anker: "schuljahreswechsel", versatz: 0, einheit: "tage" }, "TICTS:V ISV:M");
  bsp("Erinnerung Notenabgabe an Lehrpersonen", "komm", { regel: "stichtag", anker: "semesterende", versatz: -14, einheit: "tage" }, "SL:V PICTS:M");
  bsp("Info zum Semesterwechsel an Lehrpersonen", "komm", { regel: "stichtag", anker: "semesterwechsel", versatz: -7, einheit: "tage" }, "PICTS:V SL:M");
  bsp("Trimesterbericht ICT an die Schulleitung", "qual", { regel: "trimester", bezug: "ende", versatz: -5 }, "PICTS:V SL:M");
  bsp("Gerätecheck Klassensätze", "beschaffung", { regel: "semester", bezug: "beginn", versatz: 14 }, "PICTS:V TICTS:M");
  bsp("ICT-Quartalsbericht an den Ressortvorstand", "qual", { regel: "quartal", bezug: "ende", versatz: 0 }, "VT:V LB:M");
  bsp("Lizenz- und Kontenbericht", "apps", { regel: "monatlich", tag: "letzter" }, "TICTS:V SV:M");
  bsp("ICT-Sprechstunde für Lehrpersonen", "wb", { regel: "woechentlich", wochentag: 3 }, "PICTS:V");
  bsp("Systemmeldungen und Monitoring sichten", "betrieb", { regel: "taeglich" }, "TICTS:V");
  bsp("Support-Tickets sichten und zuweisen", "betrieb", { regel: "wochentage" }, "TICTS:V PICTS:M");
  bsp("Wartungsfenster: Updates einspielen", "betrieb", { regel: "wochenende" }, "VT:V TICTS:M");
  bsp("Backup-Protokoll prüfen", "ds", { regel: "arbeitstage" }, "TICTS:V ISV:M");
  bsp("Geräteausleihe Klassensätze kontrollieren", "beschaffung", { regel: "schultage" }, "PICTS:V");
  bsp("Updates vor den Sommerferien freigeben", "ds", { regel: "stichtag", anker: "sommerferien", versatz: -1, einheit: "wochen" }, "VT:V TICTS:M");
  bsp("Geräte-Rückläufer nach den Herbstferien prüfen", "beschaffung", { regel: "stichtag", anker: "herbstferien_ende", versatz: 3, einheit: "tage" }, "TICTS:V", { ferien: "nachher" });
  bsp("Passwort-Erinnerung an Lehrpersonen (Monatsanfang, nur an Schultagen)", "komm", { regel: "monatlich", tag: 1 }, "PICTS:V", { ferien: "nachher" });

  // Laufende Abläufe (Stichtage relativ zum heutigen Tag, damit der Prototyp immer «aktuell» wirkt)
  const LAEUFE = [
    { vorlage: "onboarding", tageBisStichtag: 25, kontext: { person: "Lea Muster", funktion: "Klassenlehrperson", pensum: 80 }, erledigt: ["o1", "o2", "o3", "o4", "o12", "o14"] },
    { vorlage: "offboarding", tageBisStichtag: 6, kontext: { person: "Jonas Beispiel", funktion: "Lehrperson" }, erledigt: ["f1", "f2", "f3", "f4"] },
    { vorlage: "onboarding", tageBisStichtag: 70, kontext: { person: "Noah Probst", funktion: "Klassenassistenz", pensum: 40 }, erledigt: [] },
  ];

  window.FLOW_DATEN = { ROLLEN, FUNKTIONENDIAGRAMM, MODULE, ZIELSYSTEME, FUNKTIONEN, VORLAGEN, LAEUFE, KAL_ROLLEN, KAL_ZUORDNUNG, BEREICHE, QUELLEN, EREIGNISSE, SCHULJAHRE };
})();
