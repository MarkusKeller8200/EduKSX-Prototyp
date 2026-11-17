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

  // Laufende Abläufe (Stichtage relativ zum heutigen Tag, damit der Prototyp immer «aktuell» wirkt)
  const LAEUFE = [
    { vorlage: "onboarding", tageBisStichtag: 25, kontext: { person: "Lea Muster", funktion: "Klassenlehrperson", pensum: 80 }, erledigt: ["o1", "o2", "o3", "o4", "o12", "o14"] },
    { vorlage: "offboarding", tageBisStichtag: 6, kontext: { person: "Jonas Beispiel", funktion: "Lehrperson" }, erledigt: ["f1", "f2", "f3", "f4"] },
    { vorlage: "onboarding", tageBisStichtag: 70, kontext: { person: "Noah Probst", funktion: "Klassenassistenz", pensum: 40 }, erledigt: [] },
  ];

  window.FLOW_DATEN = { ROLLEN, FUNKTIONENDIAGRAMM, MODULE, ZIELSYSTEME, FUNKTIONEN, VORLAGEN, LAEUFE };
})();
