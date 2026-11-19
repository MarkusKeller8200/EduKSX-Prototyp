/*
 * EduKSX-Sign – Testdaten (alle Personen, Organisationen und Inhalte erfunden)
 *
 * Seitenmodell (vereinfachtes PDF): seiten[] mit bloecke[] im Textfluss und elemente[] als Überlagerung
 * (Position x/y in Prozent der Seite). Word: absaetze[], Excel: zellen[][], Text: text, Bild: src.
 */
window.SIGN_DATEN = (function () {
  "use strict";

  const ICH = { id: "ich", name: "Andrea Muster", funktion: "Schulverwaltung", mail: "andrea.muster@schule-muster.example", tel: "+41 79 000 00 01" };

  const PERSONEN = [
    { id: "p1", name: "Beat Beispiel", funktion: "Schulleitung", mail: "beat.beispiel@schule-muster.example" },
    { id: "p2", name: "Carla Test", funktion: "Personalverantwortliche", mail: "carla.test@schule-muster.example" },
    { id: "p3", name: "Daniel Demo", funktion: "Präsident Schulpflege", mail: "daniel.demo@schule-muster.example" },
    { id: "p4", name: "Eva Exempel", funktion: "Lehrperson", mail: "eva.exempel@schule-muster.example" },
    { id: "p5", name: "Fabio Fiktiv", funktion: "Finanzen", mail: "fabio.fiktiv@schule-muster.example" },
  ];

  const ORGANISATION = { name: "Sekundarschule Muster", ort: "Musterwil", siegel: "Sekundarschule Muster – Organisationssiegel" };

  const ORDNER = [
    { id: "o-vertraege", name: "Verträge", eltern: null },
    { id: "o-formulare", name: "Formulare", eltern: null },
    { id: "o-personal", name: "Personal", eltern: null },
    { id: "o-ziel", name: "Zielvereinbarungen", eltern: "o-personal" },
    { id: "o-finanzen", name: "Finanzen", eltern: null },
    { id: "o-spesen", name: "Spesen", eltern: "o-finanzen" },
    { id: "o-sitzungen", name: "Sitzungen", eltern: null },
    { id: "o-eingang", name: "Unterzeichnet erhalten", eltern: null },
  ];

  const PLAKAT = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 594"><rect width="420" height="594" fill="#fff3e5"/>' +
    '<rect x="30" y="30" width="360" height="534" rx="16" fill="#ffffff" stroke="#ff8a00" stroke-width="4"/>' +
    '<text x="210" y="140" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="700" fill="#5b3a8f">Elternabend</text>' +
    '<text x="210" y="185" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#222">Sekundarschule Muster</text>' +
    '<circle cx="210" cy="300" r="70" fill="#e6f3fa" stroke="#007ebb" stroke-width="4"/>' +
    '<text x="210" y="312" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#007ebb">19:30</text>' +
    '<text x="210" y="430" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#222">Aula Schulhaus Mitte</text>' +
    '<text x="210" y="465" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#5a6678">Donnerstag, 3. Dezember 2026</text></svg>');

  const DOKUMENTE = [
    {
      id: "d-antrag", name: "Antrag Weiterbildung.pdf", typ: "pdf", ordner: "o-formulare", groesse: 184000, geaendert: "2026-11-12T09:14",
      inhalt: { seiten: [{ bloecke: [
        { t: "klein", x: "Sekundarschule Muster · Personaldienst" },
        { t: "h1", x: "Antrag Weiterbildung" },
        { t: "p", x: "Bitte vollständig ausfüllen, unterschreiben und an die Schulleitung weiterleiten. Der Antrag ist spätestens sechs Wochen vor Kursbeginn einzureichen." },
        { t: "h2", x: "1. Angaben zur Person" },
        { t: "feld", id: "name", label: "Name, Vorname", typ: "text", wert: "" },
        { t: "feld", id: "funktion", label: "Funktion", typ: "text", wert: "" },
        { t: "h2", x: "2. Weiterbildung" },
        { t: "feld", id: "kurs", label: "Kurs / Anbieter", typ: "text", wert: "" },
        { t: "feld", id: "beginn", label: "Kursbeginn", typ: "datum", wert: "" },
        { t: "feld", id: "kosten", label: "Kosten (CHF)", typ: "text", wert: "" },
        { t: "feld", id: "beitrag", label: "Beitrag der Schule wird beantragt", typ: "check", wert: false },
        { t: "feld", id: "zeit", label: "Unterricht fällt aus (Lektionen)", typ: "text", wert: "" },
        { t: "h2", x: "3. Begründung" },
        { t: "feld", id: "begruendung", label: "Nutzen für den Unterricht / die Schule", typ: "text", wert: "" },
        { t: "abstand" },
        { t: "linie", x: "Ort, Datum · Unterschrift Antragsteller:in" },
        { t: "linie", x: "Bewilligt: Ort, Datum · Unterschrift Schulleitung" },
      ] }] },
      elemente: [],
    },
    {
      id: "d-laptop", name: "Vereinbarung Laptop-Ausleihe.pdf", typ: "pdf", ordner: "o-vertraege", groesse: 96000, geaendert: "2026-11-03T15:40",
      inhalt: { seiten: [
        { bloecke: [
          { t: "klein", x: "Sekundarschule Muster · Fachstelle ICT" },
          { t: "h1", x: "Vereinbarung über die Ausleihe eines Laptops" },
          { t: "p", x: "zwischen der Sekundarschule Muster (nachfolgend «Schule») und der unterzeichnenden Mitarbeiterin bzw. dem unterzeichnenden Mitarbeiter (nachfolgend «Nutzer:in»)." },
          { t: "h2", x: "1. Gegenstand" },
          { t: "p", x: "Die Schule überlässt der Nutzerin bzw. dem Nutzer ein Notebook (Inventar-Nr. ICT-2026-0815, erfunden) samt Netzteil und Tasche für die Dauer der Anstellung." },
          { t: "h2", x: "2. Nutzung" },
          { t: "p", x: "Das Gerät dient der Erfüllung des Berufsauftrags. Die Nutzungsrichtlinie ICT der Schule ist Bestandteil dieser Vereinbarung. Private Nutzung ist im üblichen Rahmen gestattet." },
          { t: "h2", x: "3. Sorgfalt und Haftung" },
          { t: "p", x: "Die Nutzerin bzw. der Nutzer behandelt das Gerät sorgfältig und meldet Verlust oder Schäden umgehend der Fachstelle ICT. Bei grober Fahrlässigkeit kann eine Kostenbeteiligung verlangt werden." },
        ] },
        { bloecke: [
          { t: "h2", x: "4. Rückgabe" },
          { t: "p", x: "Bei Beendigung des Arbeitsverhältnisses ist das Gerät vollständig und zurückgesetzt der Fachstelle ICT zurückzugeben. Persönliche Daten sind vorher zu sichern und zu löschen." },
          { t: "h2", x: "5. Schlussbestimmungen" },
          { t: "p", x: "Änderungen bedürfen der Schriftform. Diese Vereinbarung wird elektronisch unterzeichnet; die elektronische Unterschrift gilt als Schriftform." },
          { t: "abstand" }, { t: "abstand" },
          { t: "p", x: "Musterwil, im November 2026" },
        ], platzhalter: [
          { nr: 1, x: 8, y: 66, text: "#sign#1#" },
          { nr: 2, x: 54, y: 66, text: "#sign#2#" },
        ] },
      ] },
      elemente: [],
    },
    {
      id: "d-ziel", name: "Zielvereinbarung 2026.docx", typ: "docx", ordner: "o-ziel", groesse: 41000, geaendert: "2026-11-18T16:02",
      inhalt: { absaetze: [
        { stil: "h1", html: "Zielvereinbarung Schuljahr 2026/27" },
        { stil: "p", html: "<b>Mitarbeiterin:</b> Andrea Muster, Schulverwaltung<br><b>Vorgesetzter:</b> Beat Beispiel, Schulleitung" },
        { stil: "h2", html: "Ziel 1 – Digitale Ablage" },
        { stil: "p", html: "Die Personaldossiers sind bis Ende Schuljahr vollständig in der digitalen Ablage erfasst. Papierablagen werden nach Ablauf der Aufbewahrungsfrist vernichtet." },
        { stil: "h2", html: "Ziel 2 – Elektronische Unterschrift" },
        { stil: "p", html: "Anstellungsverfügungen, Vereinbarungen und Visa werden ab dem zweiten Semester <i>elektronisch</i> unterzeichnet. Messgrösse: Anteil elektronisch unterzeichneter Dokumente über 80 %." },
        { stil: "h2", html: "Ziel 3 – Weiterbildung" },
        { stil: "p", html: "Besuch eines Kurses zum Thema Datenschutz in der Schulverwaltung (2 Tage)." },
        { stil: "h2", html: "Beurteilung" },
        { stil: "p", html: "Die Zielerreichung wird im Mitarbeitendengespräch im Juni besprochen." },
      ] },
    },
    {
      id: "d-spesen", name: "Spesenabrechnung November.xlsx", typ: "xlsx", ordner: "o-spesen", groesse: 22000, geaendert: "2026-11-19T11:30",
      inhalt: { titel: "Spesenabrechnung November 2026 – Andrea Muster", summeSpalte: 3, zellen: [
        ["Datum", "Anlass", "Art", "Betrag CHF"],
        ["04.11.2026", "Weiterbildung Datenschutz, Zürich", "Bahn 2. Kl.", "34.80"],
        ["04.11.2026", "Weiterbildung Datenschutz, Zürich", "Verpflegung", "25.00"],
        ["12.11.2026", "Sitzung Schulverwaltungen Bezirk", "Bahn 2. Kl.", "18.40"],
        ["17.11.2026", "Material Elternabend", "Material", "42.15"],
      ] },
    },
    {
      id: "d-notizen", name: "Notizen Teamsitzung.txt", typ: "text", ordner: "o-sitzungen", groesse: 1200, geaendert: "2026-11-16T17:45",
      inhalt: { text: "Teamsitzung Schulverwaltung, 16.11.2026\n\n1. Elektronische Unterschrift: Pilot mit EduKSX-Sign ab Januar.\n2. Ablage: Ordnerstruktur je Mitarbeiter:in, Abgleich mit der Cloud-Ablage.\n3. Elternabend 3.12.: Plakat ist bereit, Druck bis 25.11.\n4. Verschiedenes: keine Einträge." },
    },
    {
      id: "d-plakat", name: "Plakat Elternabend.svg", typ: "bild", ordner: null, groesse: 3400, geaendert: "2026-11-15T10:05",
      inhalt: { src: PLAKAT },
    },
    {
      id: "d-statuten", name: "Reglement Schulfonds.odt", typ: "andere", ordner: "o-vertraege", groesse: 58000, geaendert: "2026-10-28T08:20",
      inhalt: {},
    },
  ];

  // Signaturanfragen, die andere Module an EduKSX-Sign übergeben (Eingang «Zu unterschreiben»)
  const EINGANG = [
    {
      id: "e-verfuegung", quelle: "EduKSX-Staffing", von: "p2", titel: "Anstellungsverfügung Schuljahr 2026/27", datei: "Anstellungsverfuegung_2026-27.pdf",
      erhalten: "2026-11-18T08:30", frist: "2026-11-27", stufe: "aes", rechtsraum: "zertes", status: "offen",
      nachricht: "Bitte die Anstellungsverfügung für das neue Schuljahr unterzeichnen. Danke!",
      seiten: [{ bloecke: [
        { t: "klein", x: "Sekundarschule Muster · Schulpflege" },
        { t: "h1", x: "Anstellungsverfügung" },
        { t: "p", x: "Die Schulpflege der Sekundarschule Muster verfügt gestützt auf das Personalrecht (Muster):" },
        { t: "tabelle", kopf: ["Angabe", "Wert"], zeilen: [["Name", "Andrea Muster"], ["Funktion", "Sachbearbeiterin Schulverwaltung"], ["Beschäftigungsgrad", "80 %"], ["Beginn", "01.08.2026"], ["Lohnstufe", "Muster-Stufe 12"]] },
        { t: "p", x: "Die Mitarbeiterin bestätigt mit ihrer Unterschrift den Empfang dieser Verfügung." },
        { t: "abstand" },
      ] }],
      felder: [{ id: "f1", seite: 0, x: 8, y: 74, w: 36, h: 9, person: "ich" }],
      unterschriebenVon: [{ name: "Daniel Demo", funktion: "Präsident Schulpflege", zeit: "2026-11-17T19:02" }],
    },
    {
      id: "e-visum", quelle: "EduKSX-Time", von: "p1", titel: "Monatsvisum Oktober 2026", datei: "Monatsvisum_2026-10.pdf",
      erhalten: "2026-11-05T07:10", frist: "2026-11-10", stufe: "ses", rechtsraum: "zertes", status: "offen",
      nachricht: "Zeiterfassung Oktober – bitte visieren.",
      seiten: [{ bloecke: [
        { t: "klein", x: "Zeiterfassung · Monatsabschluss" },
        { t: "h1", x: "Monatsvisum Oktober 2026" },
        { t: "tabelle", kopf: ["Position", "Stunden"], zeilen: [["Soll", "134:24"], ["Ist", "136:10"], ["Saldo Monat", "+1:46"], ["Saldo kumuliert", "+6:12"], ["Ferien bezogen (Tage)", "5"]] },
        { t: "p", x: "Ich bestätige die Richtigkeit der erfassten Zeiten." },
      ] }],
      felder: [{ id: "f1", seite: 0, x: 8, y: 52, w: 36, h: 9, person: "ich" }],
      unterschriebenVon: [],
    },
  ];

  return { ICH, PERSONEN, ORGANISATION, ORDNER, DOKUMENTE, EINGANG };
})();
