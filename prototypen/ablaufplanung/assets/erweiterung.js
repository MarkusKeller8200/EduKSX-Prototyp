/*
 * EduKSX-Flow – Stufe 1 der Prozess-Engine (docs/KONZEPT-FLOW.md): Aufgabentypen, Verzweigung, Unterprozesse,
 * Fristarten, Eskalation und Auslöser an Beispielen in den bestehenden Vorlagen.
 * Wird nach vorlagen.js geladen und ergänzt window.FLOW_DATEN.
 */
(function () {
  "use strict";
  const D = window.FLOW_DATEN;
  const V = (id) => D.VORLAGEN.find((v) => v.id === id);
  const S = (vid, nr) => V(vid).schritte[nr - 1]; // Schrittnummer 1-basiert
  const setze = (vid, nr, props) => Object.assign(S(vid, nr), props);
  const art = (vid, nr, typ, props) => setze(vid, nr, Object.assign({ typ, aktion: null, auto: false }, props || {}));
  const neu = (vid, schritt) => {
    const v = V(vid);
    let n = v.schritte.length + 1;
    while (v.schritte.some((x) => x.id === vid + n)) n++;
    v.schritte.push(Object.assign({ id: vid + n, nach: [], aktion: null, auto: false, informiert: [], bedingung: null, fd: "", quelle: "" }, schritt));
  };
  const wenn = (feld, wert) => ({ feld, op: "=", wert });

  // ------------------------------------------------------------ Eskalation (Annahme, Konzept E6 OFFEN)
  D.VORGESETZT = { SV: "SPr", HD: "SV", ICT: "SV", LP: "SL", MA: "SL", SL: "SPr", RV: "SPr", SPr: "SPF", SPF: null, RPK: null, GV: null, VSA: null, ELT: null };
  D.LEITUNG = "SPr";
  // tage = Abstand zur Frist (negativ = vorher); an: zustaendig | vorgesetzt | leitung
  D.ESKALATION = {
    normal: [
      { tage: -2, stufe: 1, text: "Erinnerung", an: "zustaendig" },
      { tage: 0, stufe: 2, text: "Frist erreicht bzw. überschritten", an: "zustaendig" },
      { tage: 2, stufe: 3, text: "Information an die vorgesetzte Stelle", an: "vorgesetzt" },
      { tage: 5, stufe: 4, text: "Eskalation an das Schulpräsidium", an: "leitung" },
    ],
    gesetzlich: [
      { tage: -7, stufe: 1, text: "Erinnerung (gesetzliche Frist)", an: "zustaendig" },
      { tage: -2, stufe: 2, text: "Dringend: gesetzliche Frist in 2 Tagen", an: "zustaendig" },
      { tage: 0, stufe: 3, text: "Gesetzliche Frist erreicht – Information an die vorgesetzte Stelle", an: "vorgesetzt" },
      { tage: 2, stufe: 4, text: "Gesetzliche Frist verpasst – Eskalation an das Schulpräsidium", an: "leitung" },
    ],
  };
  D.PROZESSVERANTWORTLICH = ["SV", "SL", "SPr"]; // dürfen in laufende Abläufe eingreifen (Konzept E5 OFFEN)

  // ------------------------------------------------------------ Modul-Ereignisse (Auslöser «Datensatz/Status»)
  const fName = { key: "person", label: "Name", typ: "text" };
  const fFunktion = { key: "funktion", label: "Funktion", typ: "auswahl", werte: D.FUNKTIONEN };
  D.MODULEREIGNISSE = [
    { id: "staffing.anstellung.genehmigt", modul: "staffing", art: "Status geändert", titel: "Anstellung genehmigt",
      felder: [fName, fFunktion, { key: "pensum", label: "Pensum in %", typ: "zahl" }, { key: "stichtag", label: "Eintritt", typ: "datum" }] },
    { id: "staffing.austritt.erfasst", modul: "staffing", art: "Datensatz erstellt", titel: "Austritt erfasst",
      felder: [fName, fFunktion, { key: "stichtag", label: "Letzter Arbeitstag", typ: "datum" }] },
    { id: "staffing.pensum.geaendert", modul: "staffing", art: "Datensatz geändert", titel: "Pensum geändert",
      felder: [fName, fFunktion, { key: "pensumAlt", label: "Pensum bisher in %", typ: "zahl" }, { key: "pensum", label: "Pensum neu in %", typ: "zahl" }, { key: "stichtag", label: "Gültig ab", typ: "datum" }],
      fest: { art: "Pensum" } },
    { id: "core.lernende.erfasst", modul: "core", art: "Datensatz erstellt", titel: "Lernende angemeldet",
      felder: [{ key: "person", label: "Name Lernende/r", typ: "text" }, { key: "stufe", label: "Stufe", typ: "auswahl", werte: ["Kindergarten", "Primarstufe", "Sekundarstufe"] }, { key: "klasse", label: "Klasse (falls bekannt)", typ: "text" }, { key: "stichtag", label: "Eintrittsdatum", typ: "datum" }] },
  ];

  // ------------------------------------------------------------ Auslöser je Vorlage
  const evId = (titel) => (D.EREIGNISSE.find((e) => e.titel === titel) || {}).id;
  const ausl = (vid, liste) => { V(vid).ausloeser = liste; };
  ausl("onboarding", [{ art: "ereignis", ereignis: "staffing.anstellung.genehmigt" }]);
  ausl("offboarding", [{ art: "ereignis", ereignis: "staffing.austritt.erfasst" }]);
  ausl("mutation", [{ art: "ereignis", ereignis: "staffing.pensum.geaendert" }]);
  ausl("le", [{ art: "ereignis", ereignis: "core.lernende.erfasst" }]);
  ausl("sb", [{ art: "kalender", ereignis: evId("Ordentliche Sitzung der Schulpflege") }]);
  ausl("slk", [{ art: "kalender", ereignis: evId("Schulleitungskonferenz") }]);
  ausl("invest", [{ art: "abschluss", vorlage: "hwb", versatz: 60 }]);

  // ------------------------------------------------------------ Aufgabentypen und Verzweigungen in Beispielvorlagen
  // Anwendungen und Schulsoftware: Genehmigung mit zwei Zweigen
  art("ictsw", 5, "genehmigung", { titel: "Entscheid Ressort: genehmigen oder ablehnen", quelle: "FD 3.8 (Software: RV E, ICT V)" });
  setze("ictsw", 6, { bedingung: wenn("ictsw5.entscheid", "genehmigt") });
  neu("ictsw", { titel: "Ablehnung begründet mitteilen", rolle: "ICT", tage: -38, nach: ["ictsw5"], aktion: { vorgang: "core.mitteilung.senden", param: { an: "Antragstellende", vorlage: "Ablehnung {person}: {ictsw5.begruendung}" } },
    bedingung: wenn("ictsw5.entscheid", "abgelehnt"), quelle: "FD 3.8 (ICT V); Verwaltungsrechtspflegegesetz (Begründungspflicht, ZU PRÜFEN)" });

  // Schulraum für Dritte: Entscheidung mit Zweig «nicht verfügbar»
  art("srd", 2, "entscheidung", { optionen: ["verfügbar", "nicht verfügbar"] });
  setze("srd", 3, { bedingung: wenn("srd2.wahl", "verfügbar") });
  setze("srd", 4, { nach: ["srd3"] });
  neu("srd", { titel: "Absage an Gesuchsteller", rolle: "HD", tage: -24, nach: ["srd2"], aktion: { vorgang: "core.mitteilung.senden", param: { an: "Gesuchsteller", vorlage: "Raum nicht verfügbar: {person}" } },
    bedingung: wenn("srd2.wahl", "nicht verfügbar"), quelle: "FD 1.2.11 (HD E)" });

  // Investition: Entscheidung Budget- oder Nachtragskredit
  art("invest", 4, "entscheidung", { optionen: ["Budgetkredit vorhanden", "Nachtragskredit nötig"] });
  neu("invest", { titel: "Nachtragskredit beantragen", rolle: "SV", tage: -35, nach: ["invest4"], aktion: { vorgang: "core.geschaeft.erfassen", param: { titel: "Nachtragskredit {person}", an: "Schulpflege" } },
    bedingung: wenn("invest4.wahl", "Nachtragskredit nötig"), quelle: "GG § 115 (Nachtragskredit)" });
  setze("invest", 5, { nach: ["invest3", "invest4", "invest8"] });

  // Krankheit: Nachweis Arztzeugnis, Entscheidung Case Management
  art("krank", 4, "nachweis", { titel: "Arztzeugnis im Personaldossier ablegen (Absenz über eine Woche)" });
  art("krank", 6, "entscheidung", { optionen: ["Case Management beantragen", "nicht nötig"] });

  // Mitarbeitergespräch: Termin festhalten
  art("mag", 3, "termin", { titel: "Gespräch führen (Termin festhalten)" });

  // Gemeindeversammlung: gesetzliche Fristen, Warten auf die Rekursfrist
  [4, 6, 7, 8].forEach((nr) => setze("gv", nr, { fristart: "gesetzlich" }));
  art("gv", 13, "warten", { fristart: "gesetzlich", quelle: "Checkliste GV (Rekurs beim Bezirksrat 30 Tage); VRG § 22 Abs. 1 (Rekursfrist 30 Tage, in Stimmrechtssachen 5 Tage; ZU PRÜFEN)" });
  setze("budget", 8, { fristart: "gesetzlich" });
  setze("rechnung", 7, { fristart: "gesetzlich" });
  setze("uok", 2, { fristart: "gesetzlich" });
  setze("invest", 7, { fristart: "empfehlung" });

  // Unterprozesse
  art("budget", 7, "unterprozess", { titel: "Prüfung durch die RPK (Unterprozess)", unter: { vorlage: "rpkb", versatz: 0 } });
  art("rechnung", 6, "unterprozess", { titel: "Finanztechnische Prüfung und RPK (Unterprozess)", unter: { vorlage: "rpkr", versatz: 0 } });
  art("pekm", 7, "unterprozess", { titel: "ICT-Onboarding (Unterprozess)", unter: { vorlage: "icton", versatz: 0 } });

  // Benachrichtigung ohne Modulaufruf
  neu("rechnung", { typ: "benachrichtigung", titel: "Schulpflege und Schulleitungen über den Abschluss informieren", rolle: "SV", tage: 15, nach: ["rechnung8"], informiert: ["SPF", "SL"], quelle: "FD 2.2 (SV M/I)" });

  // ------------------------------------------------------------ Weitere Testabläufe (erfundene Angaben)
  D.LAEUFE.push(
    { vorlage: "ictsw", tageBisStichtag: 45, kontext: { person: "Lernplattform Mathematik", daten: "ja" }, erledigt: ["ictsw1", "ictsw2", "ictsw3", "ictsw4"] },
    { vorlage: "pekm", tageBisStichtag: 50, kontext: { person: "Mara Probe", funktion: "Hausdienst", pensum: 60 }, erledigt: ["pekm1", "pekm2", "pekm3", "pekm4", "pekm5", "pekm6"] },
    { vorlage: "krank", tageBisStichtag: -10, kontext: { person: "Timo Fiktiv", anstellung: "kommunal" }, erledigt: ["krank1", "krank2"] },
  );
})();
