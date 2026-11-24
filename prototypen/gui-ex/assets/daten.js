/* EduKSX-Experience – gemeinsame, erfundene Testdaten für alle vier Oberflächen.
 * Alle Varianten zeigen denselben Inhalt, damit nur die Bedienung verglichen wird. Keine echten Personendaten. */
(function () {
  "use strict";
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const tag = (n, h, m) => { const d = new Date(heute); d.setDate(d.getDate() + n); d.setHours(h || 0, m || 0); return d; };

  // Icons kommen beim Bauen aus EduKSX-UI (Platzhalter, siehe tools/eduksx_icons.py)
  const MODULE = [
    { key: "staffing", name: "EduKSX-Staffing", titel: "Einsatzplanung", farbe: "violet", icon: '<!--eduksx-icon:staffing-->',
      kurz: "Klassen- und Stellenplanung", kennzahl: "98,5 %", kennzahlText: "Stellenplan belegt" },
    { key: "flow", name: "EduKSX-Flow", titel: "Ablaufplanung", farbe: "blue", icon: '<!--eduksx-icon:flow-->',
      kurz: "Termine und ToDo", kennzahl: "4", kennzahlText: "offene Schritte" },
    { key: "codex", name: "EduKSX-Codex", titel: "Rechtssammlung", farbe: "violet", icon: '<!--eduksx-icon:codex-->',
      kurz: "Erlasse und Reglemente", kennzahl: "2", kennzahlText: "Änderungen diese Woche" },
    { key: "time", name: "EduKSX-Time", titel: "Zeiterfassung", farbe: "orange", icon: '<!--eduksx-icon:time-->',
      kurz: "Stempeln und Saldo", kennzahl: "+3:20 h", kennzahlText: "Saldo" },
    { key: "sign", name: "EduKSX-Sign", titel: "Signatur", farbe: "blue", icon: '<!--eduksx-icon:sign-->',
      kurz: "Dokumente signieren", kennzahl: "2", kennzahlText: "warten auf Signatur" },
    { key: "ai", name: "EduKSX-AI", titel: "Interne KI", farbe: "orange", icon: '<!--eduksx-icon:eduksx-->',
      kurz: "Assistent im geschützten Umfeld", kennzahl: "intern", kennzahlText: "Betriebsort" },
    { key: "glossary", name: "EduKSX-Glossary", titel: "Glossar", farbe: "violet", icon: '<!--eduksx-icon:glossary-->',
      kurz: "Begriffe der Schule", kennzahl: "312", kennzahlText: "Begriffe" },
  ];

  // status: offen | heute | ueberfaellig | erledigt  (immer mit Symbol und Text anzeigen)
  const AUFGABEN = [
    { id: "A1", modul: "sign", titel: "Arbeitsvertrag Lehrperson Mittelstufe signieren", faellig: tag(0, 12), status: "heute", prio: "hoch", teil: [["Vertrag geprüft", true], ["Signatur Fachstelle", false], ["Signatur Schulleitung", false], ["Versiegeln und ablegen", false]],
      text: "Vertrag für die Stellvertretung ab Januar. Zweite Signatur durch die Schulleitung folgt." },
    { id: "A2", modul: "flow", titel: "Onboarding: Konto und Gerät für neue Lehrperson", faellig: tag(1, 9), status: "offen", prio: "mittel", teil: [["Personalien erfasst", true], ["Pensum bestätigt", true], ["Konto anlegen", false], ["Gerät zuteilen", false], ["Klassenteams", false]],
      text: "Schritt 3 von 7 im Ablauf «Eintritt Lehrperson»: Konto anlegen, Gerät zuteilen, Zugang Klassenteams." },
    { id: "A3", modul: "staffing", titel: "Stellenplan Schuljahr 2027/28 prüfen", faellig: tag(3, 17), status: "offen", prio: "hoch", teil: [["Klassenbildung übernommen", true], ["Pensen verteilt", true], ["Abweichung begründen", false]],
      text: "Abgleich mit den kantonalen Vorgaben zur Klassen- und Stellenplanung; Abweichung 1,5 Lektionen." },
    { id: "A4", modul: "time", titel: "Pause vom Montag korrigieren", faellig: tag(-1, 18), status: "ueberfaellig", prio: "tief", teil: [["Pause nachtragen", false]],
      text: "Gestempelte Pause fehlt; gesetzliche Pause wurde automatisch abgezogen." },
    { id: "A5", modul: "codex", titel: "Änderung Personalverordnung zur Kenntnis nehmen", faellig: tag(5, 12), status: "offen", prio: "mittel", teil: [["Änderungen lesen", false], ["Betroffene informieren", false]],
      text: "Neue Fassung gültig ab 1. Januar; zwei Paragrafen betreffen die Stellvertretungen." },
    { id: "A6", modul: "flow", titel: "Jahresplanung ICT: Lizenzen verlängern", faellig: tag(9, 12), status: "offen", prio: "mittel", teil: [["Lizenzliste prüfen", false], ["Offerte einholen", false], ["Bestellung auslösen", false]],
      text: "Wiederkehrender Termin «2 Monate vor Semesterende»." },
    { id: "A7", modul: "sign", titel: "Datenschutz-Vereinbarung Lernplattform", faellig: tag(-3, 12), status: "erledigt", prio: "mittel", teil: [["Signiert", true], ["Versiegelt", true]],
      text: "Signiert und versiegelt, abgelegt mit Suffix _sign." },
  ];

  const TERMINE = [
    { id: "T1", modul: "flow", titel: "Schulleitungskonferenz", start: tag(0, 14, 0), ende: tag(0, 16, 0), ort: "Sitzungszimmer 2" },
    { id: "T2", modul: "flow", titel: "Sitzung Schulbehörde", start: tag(1, 19, 0), ende: tag(1, 21, 30), ort: "Schulhaus Nord" },
    { id: "T3", modul: "staffing", titel: "Gespräch Pensenplanung", start: tag(2, 10, 0), ende: tag(2, 11, 0), ort: "Online" },
    { id: "T4", modul: "flow", titel: "Frist Budgeteingabe RPK", start: tag(4, 0, 0), ende: tag(4, 23, 59), ort: "", ganztags: true },
    { id: "T5", modul: "time", titel: "Monatsabschluss Zeiterfassung", start: tag(6, 0, 0), ende: tag(6, 23, 59), ort: "", ganztags: true },
    { id: "T6", modul: "codex", titel: "Inkrafttreten Reglement Schulsozialarbeit", start: tag(8, 0, 0), ende: tag(8, 23, 59), ort: "", ganztags: true },
  ];

  const MELDUNGEN = [
    { id: "M1", modul: "sign", zeit: tag(0, 7, 42), text: "Schulleitung hat «Weiterbildungsvereinbarung» signiert." },
    { id: "M2", modul: "time", zeit: tag(0, 7, 15), text: "Eingestempelt um 07:15 (Arbeitszeit)." },
    { id: "M3", modul: "codex", zeit: tag(-1, 16, 5), text: "Neue Fassung: Personalverordnung, gültig ab 1. Januar." },
    { id: "M4", modul: "flow", zeit: tag(-1, 11, 30), text: "Ablauf «Eintritt Lehrperson» gestartet (7 Schritte)." },
    { id: "M5", modul: "staffing", zeit: tag(-2, 9, 0), text: "Klassenbildung 2027/28: 14 Klassen vorgeschlagen." },
  ];

  // Arbeitszeit der letzten 7 Arbeitstage in Stunden (erfunden) und Soll je Tag
  const WOCHE_ZEIT = [8.1, 8.9, 7.6, 9.2, 8.4, 8.7, 6.9];
  const SOLL_TAG = 8.4;

  // Pensenplanung (EduKSX-Staffing) für Variante F – erfundene Personen; Vollpensum = 28 Lektionen (Annahme Prototyp)
  const VOLLPENSUM = 28;
  const PENSEN = [
    ["P01", "Beispiel", "Lea", "Klassenlehrperson", "1a", "Deutsch, Geschichte", 26, "bestätigt"],
    ["P02", "Muster", "Tom", "Fachlehrperson", "1a, 1b", "Mathematik", 24, "bestätigt"],
    ["P03", "Probst", "Nina", "Klassenlehrperson", "1b", "Englisch, Französisch", 28, "bestätigt"],
    ["P04", "Gerber", "Jan", "Fachlehrperson", "2a, 2b, 3a", "Sport", 18, "offen"],
    ["P05", "Weber", "Sara", "Klassenlehrperson", "2a", "Deutsch, Lebenskunde", 27, "bestätigt"],
    ["P06", "Huber", "Luca", "Klassenlehrperson", "2b", "Mathematik, Natur und Technik", 30, "offen"],
    ["P07", "Frei", "Mia", "Fachlehrperson", "1a–3b", "Bildnerisches Gestalten", 12, "bestätigt"],
    ["P08", "Keller", "Noah", "Schulische Heilpädagogik", "1a–2b", "Förderunterricht", 20, "offen"],
    ["P09", "Baumann", "Elin", "Klassenlehrperson", "3a", "Geschichte, Geografie", 25, "bestätigt"],
    ["P10", "Meier", "Ben", "Klassenlehrperson", "3b", "Mathematik, Medien und Informatik", 28, "bestätigt"],
    ["P11", "Schmid", "Ida", "Fachlehrperson", "3a, 3b", "Englisch", 10, "Stellvertretung"],
    ["P12", "Brunner", "Leo", "Fachlehrperson", "1b–3b", "Musik", 14, "offen"],
    ["P13", "Steiner", "Zoe", "Fachlehrperson", "2a–3b", "Hauswirtschaft", 9, "bestätigt"],
    ["P14", "Graf", "Elias", "Fachlehrperson", "1a–3b", "Textiles und Technisches Gestalten", 16, "offen"],
  ].map(([id, name, vorname, funktion, klassen, faecher, lektionen, status]) => ({ id, name, vorname, funktion, klassen, faecher, lektionen, status }));

  // Lernende für Variante G – frei erfunden; heikle Angaben sind Platzhalter (Testwerte), keine echten Nummern
  const LERNENDE = [
    ["L01", "Aebi", "Mara", "1a", "w", "2013-03-14", "Deutsch", "Aebi Ruth", 2, 0, 1],
    ["L02", "Bachmann", "Nico", "1a", "m", "2013-07-02", "Deutsch", "Bachmann Petra", 1, 1, 0],
    ["L03", "Caduff", "Lina", "1b", "w", "2012-11-23", "Rätoromanisch", "Caduff Gion", 3, 0, 2],
    ["L04", "Dubois", "Elio", "1b", "m", "2013-01-30", "Französisch", "Dubois Claire", 0, 0, 0],
    ["L05", "Egli", "Jana", "2a", "w", "2012-05-09", "Deutsch", "Egli Markus", 4, 2, 1],
    ["L06", "Fischer", "Tim", "2a", "m", "2012-09-17", "Deutsch", "Fischer Anna", 1, 0, 0],
    ["L07", "Gasser", "Ella", "2b", "w", "2012-02-28", "Italienisch", "Gasser Luca", 2, 0, 3],
    ["L08", "Hofer", "Max", "2b", "m", "2011-12-05", "Deutsch", "Hofer Sandra", 0, 1, 0],
    ["L09", "Iten", "Sofia", "3a", "w", "2011-06-21", "Spanisch", "Iten Carlos", 5, 0, 1],
    ["L10", "Jost", "Liam", "3a", "m", "2011-04-11", "Deutsch", "Jost Karin", 2, 0, 0],
    ["L11", "Kunz", "Anna", "3b", "w", "2011-08-30", "Englisch", "Kunz Peter", 1, 0, 2],
    ["L12", "Lang", "Jonas", "3b", "m", "2011-10-03", "Deutsch", "Lang Monika", 3, 1, 0],
  ].map(([id, name, vorname, klasse, geschlecht, geburt, sprache, kontakt, dokumente, aufgaben, notizen]) => ({
    id, name, vorname, klasse, geschlecht, geburt, sprache, kontakt, dokumente, aufgaben, notizen,
    schulhaus: ["1a", "1b", "2a"].includes(klasse) ? "Schulhaus Nord" : "Schulhaus See",
    status: ["L04", "L08"].includes(id) ? "In Bearbeitung" : "Aktiv",
  }));
  const KLASSENLEHRPERSON = { "1a": "P01", "1b": "P03", "2a": "P05", "2b": "P06", "3a": "P09", "3b": "P10" };

  const PERSON = { name: "Alex Beispiel", rolle: "Leitung Fachstelle ICT", kuerzel: "AB", schule: "Musterschule Seetal" };

  const STATUS = {
    offen: { text: "Offen", symbol: "○", klasse: "s-offen" },
    heute: { text: "Heute fällig", symbol: "◐", klasse: "s-heute" },
    ueberfaellig: { text: "Überfällig", symbol: "!", klasse: "s-ueber" },
    erledigt: { text: "Erledigt", symbol: "✓", klasse: "s-erledigt" },
  };

  const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const fmtZeit = (d) => d.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
  const fmtDatum = (d) => d.toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "short" });
  const fmtRelativ = (d) => {
    const t = Math.round((new Date(d).setHours(0, 0, 0, 0) - heute) / 86400000);
    if (t === 0) return "heute";
    if (t === 1) return "morgen";
    if (t === -1) return "gestern";
    if (t > 1 && t < 7) return WOCHENTAGE[d.getDay()] + ", in " + t + " Tagen";
    if (t < 0) return "vor " + (-t) + " Tagen";
    return fmtDatum(d);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const modul = (key) => MODULE.find((m) => m.key === key);
  // Fortschritt einer Aufgabe in Prozent aus ihren Teilschritten
  const fortschritt = (a) => a.status === "erledigt" ? 100 : Math.round(100 * a.teil.filter((t) => t[1]).length / a.teil.length);

  window.EX = { LERNENDE, KLASSENLEHRPERSON, PENSEN, VOLLPENSUM, WOCHE_ZEIT, SOLL_TAG, heute, MODULE, AUFGABEN, TERMINE, MELDUNGEN, PERSON, STATUS, fmtZeit, fmtDatum, fmtRelativ, esc, modul, fortschritt };
})();
