/*
 * EduKSX-Staffing – Testdaten des Prototyps.
 * Personen, Schule und Schülerzahlen sind ERFUNDEN. Die Parameter folgen den öffentlichen Vorgaben des Kantons
 * Zürich (Volksschulamt, Stand Weisung 2026/27 und Handbuch Berufsauftrag 1.1.2024) und sind vor einem Einsatz zu
 * prüfen (ZU PRÜFEN). Quellen: siehe ANFORDERUNGEN.md, Abschnitt 2.
 */
window.STAFFING_DATEN = (function () {
  const parameter = {
    kanton: "ZH",
    // Berufsauftrag (LPG §§ 18–18c, Handbuch Berufsauftrag)
    faktorLektion: 58,              // Jahresstunden je Wochenlektion (Unterricht)
    klassenlehrperson: 100,         // Jahresstunden je Klasse, bei zwei Klassenlehrpersonen aufteilbar
    pauschaleSchule: 60,            // Jahresstunden bei 100 %, Teilpensen anteilig
    pauschaleZusammenarbeit: 50,
    pauschaleWeiterbildung: 30,
    bruttoJahresarbeitszeit: 2184,  // 52 × 42 h
    nettoJahresarbeitszeit: [       // nach Ferienanspruch (Alter)
      { bisAlter: 20, stunden: 1873, ferientage: 27 },
      { bisAlter: 49, stunden: 1890, ferientage: 25 },
      { bisAlter: 59, stunden: 1873, ferientage: 27 },
      { bisAlter: 200, stunden: 1831, ferientage: 32 },
    ],
    mindestpensum: 35,              // Beschäftigungsgrad in der Regel mindestens 35 %
    maxPensum: 100,
    anteilUnterrichtMin: 60,        // 60-%-Regel: mind. 60 % der Netto-Arbeitszeit im Unterricht
    klpMindestlektionen: 6,         // Sekundarstufe: Mindest-WL der Klassenlehrperson in ihrer Klasse
    kustodieMaxStunden: 50,         // bis 50 h im Berufsauftrag gedeckt
    lektionenJeVZE: 27.3,           // 1 VZE Berufsauftrag = 27.3 WL
    // Stellenberechnung Sekundarstufe (Weisung Lehrerstellenbewilligung 2026/27)
    basiswert: 16.88,
    korrekturfaktor: 1.032,
    slSockel: 0.204,                // VZE Schulleitung je Schulgemeinde
    slJeVZE: 0.041,
    slGrossJe25: 0.128,
    gestaltungspoolJeVZE: 0.028,
    koordinationSekJeVZE: 0.011,    // kommunal
    therapieMaxJe100: 0.1,          // Sek: max. VZE je 100 SuS
    dazErstesJahrWL: 2,             // WL je Schüler/in im ersten Jahr (ausserhalb VZE)
    dazFolgejahrWL: 0.625,          // 0.5–0.75 WL im 2./3. Jahr (Mittelwert, Beispiel)
    vikariatPoolMaxWochen: 14,
    maxKlassengroesse: { A: 25, B: 23, C: 18 },
    // Tagesstrukturen (kommunal, Beispielwerte)
    betreuungsschluessel: 12,
    mindestbesetzung: 2,
    schulwochen: 39,
    jahresarbeitszeitBetreuung: 2000,
    // Prototyp
    stichjahr: 2027,
    planungsdatum: "2027-01-20",
  };

  const stellen = {
    schuelerzahl: 120,       // Stichtag 15. September des Vorjahres
    sozialindex: 104.0,      // Mittelwert der drei Vorjahre (Beispiel)
    dazErstesJahr: 3,
    dazFolgejahre: 4,
    therapieVZE: 0.1,
    // für das VZE-Tool des VSA (Blatt «Schulleitung»)
    schulleitungen: [{ name: "Petra Leitwerk", vze: 0.52, bemerkung: "" }],
    koordination: [{ person: "p3", vze: 0.08 }],
  };

  const schulen = [
    { id: "s1", name: "Sekundarschule Musterhausen" },
    { id: "s2", name: "Primarschule Musterhausen" },
  ];
  const schuljahre = ["2027/28", "2026/27"];

  const personen = [
    { id: "p1", name: "Lea Muster", jahrgang: 1993, art: "Lehrperson", faecher: ["D", "RZG", "RKE", "MI"] },
    { id: "p2", name: "Jonas Beispiel", jahrgang: 1975, art: "Lehrperson", faecher: ["Ma", "NT", "MI"] },
    { id: "p3", name: "Mira Exempel", jahrgang: 1986, art: "Lehrperson", faecher: ["F", "E"] },
    { id: "p4", name: "Noah Probe", jahrgang: 1998, art: "Lehrperson", faecher: ["Ma", "NT", "BS"], berufseinfuehrung: true },
    { id: "p5", name: "Sara Testmann", jahrgang: 1969, art: "Lehrperson", faecher: ["D", "RZG", "Mu", "BO", "PU"] },
    { id: "p6", name: "Luca Fiktiv", jahrgang: 1982, art: "Lehrperson", faecher: ["E", "F", "WAH", "PU", "KOM"] },
    { id: "p7", name: "Elena Modell", jahrgang: 1966, art: "Lehrperson", faecher: ["BG", "TTG", "WAH", "KOM"] },
    { id: "p8", name: "David Entwurf", jahrgang: 1990, art: "Lehrperson", faecher: ["BS", "NT", "Ma"] },
    { id: "p9", name: "Nina Schema", jahrgang: 1978, art: "Schulische Heilpädagogik", faecher: ["IF"] },
    { id: "p10", name: "Ruth Vorlage", jahrgang: 1972, art: "Lehrperson DaZ", faecher: ["DaZ", "D"] },
    { id: "p11", name: "Tim Kurzmann", jahrgang: 2001, art: "Klassenassistenz", faecher: [], prozent: 40 },
    { id: "p12", name: "Aline Pool", jahrgang: 1995, art: "Stellvertretungspool", faecher: ["Ma", "D", "BS"], pool: true },
    { id: "p13", name: "Marco Hort", jahrgang: 1984, art: "Betreuung", faecher: [], prozent: 60, tagesstruktur: true },
    { id: "p14", name: "Ida Mittag", jahrgang: 1991, art: "Betreuung", faecher: [], prozent: 40, tagesstruktur: true },
  ];

  const faecher = {
    D: "Deutsch", E: "Englisch", F: "Französisch", Ma: "Mathematik", NT: "Natur und Technik",
    RZG: "Räume, Zeiten, Gesellschaften", WAH: "Wirtschaft, Arbeit, Haushalt", RKE: "Religionen, Kulturen, Ethik",
    BG: "Bildnerisches Gestalten", Mu: "Musik", BS: "Bewegung und Sport", MI: "Medien und Informatik",
    TTG: "Textiles und Technisches Gestalten", BO: "Berufliche Orientierung", PU: "Projektunterricht",
    KOM: "Wahlfächer (kommunal)", IF: "Integrative Förderung", DaZ: "Deutsch als Zweitsprache",
  };

  // Lektionentafeln Sekundarstufe ZH (Lektionenzusammenstellung ab 2020/21). [WL, Halbklassen?]
  // 3. Jahrgang vereinfacht – Quelle im Textauszug nicht vollständig lesbar (ZU PRÜFEN).
  const lektionentafeln = {
    1: { name: "1. Sek (A/B)", vze: 1.39, wlKlasse: 38, pflicht: 35,
      faecher: { D: 5, E: 3, F: 3, Ma: 6, NT: 3, RZG: 3, WAH: [3, true], RKE: 2, BG: 2, Mu: 1, BS: 3, MI: 1 } },
    2: { name: "2. Sek (A/B)", vze: 1.36, wlKlasse: 37, pflicht: 34,
      faecher: { D: 5, E: 3, F: 3, Ma: 6, NT: 3, RZG: 3, TTG: [3, true], RKE: 1, BG: 2, Mu: 1, BS: 3, BO: 1 } },
    "3A": { name: "3. Sek A (vereinfacht, ZU PRÜFEN)", vze: 0.81, wlKlasse: 22, pflicht: "32–36", kommunal: 3,
      faecher: { D: 4, E: 2, F: 3, Ma: 4, NT: 3, BS: 3, MI: 1, PU: 2 } },
    "3B": { name: "3. Sek B (vereinfacht, ZU PRÜFEN)", vze: 0.84, wlKlasse: 23, pflicht: "32–36", kommunal: 3,
      faecher: { D: 4, E: 3, F: 3, Ma: 4, NT: 3, BS: 3, MI: 1, PU: 2 } },
  };

  const klassen = [
    { id: "1A", jahrgang: 1, abteilung: "A", tafel: 1, schueler: 22, klp: ["p1"] },
    { id: "1B", jahrgang: 1, abteilung: "B", tafel: 1, schueler: 18, klp: ["p2"] },
    { id: "2A", jahrgang: 2, abteilung: "A", tafel: 2, schueler: 24, klp: ["p3"] },
    { id: "2B", jahrgang: 2, abteilung: "B", tafel: 2, schueler: 17, klp: ["p4"] },
    { id: "3A", jahrgang: 3, abteilung: "A", tafel: "3A", schueler: 26, klp: ["p5"] },
    { id: "3B", jahrgang: 3, abteilung: "B", tafel: "3B", schueler: 13, klp: ["p6", "p8"] },
  ];

  // Wer unterrichtet was – Fach: Person bzw. [Halbklasse 1, Halbklasse 2]; "" = offen
  const verteilung = {
    "1A": { D: "p1", E: "p3", F: "p3", Ma: "p2", NT: "p2", RZG: "p1", WAH: ["p6", "p7"], RKE: "p1", BG: "p7", Mu: "p5", BS: "p8", MI: "p1" },
    "1B": { D: "p10", E: "p6", F: "p3", Ma: "p2", NT: "p2", RZG: "p5", WAH: ["p6", "p7"], RKE: "p1", BG: "p7", Mu: "p5", BS: "p4", MI: "p2" },
    "2A": { D: "p1", E: "p3", F: "p3", Ma: "p4", NT: "p8", RZG: "p5", TTG: ["p7", ""], RKE: "p1", BG: "p7", Mu: "p5", BS: "p8", BO: "p5" },
    "2B": { D: "p5", E: "p6", F: "p6", Ma: "p4", NT: "p4", RZG: "p1", TTG: ["p7", "p7"], RKE: "", BG: "p7", Mu: "", BS: "p4", BO: "p5" },
    "3A": { D: "p5", E: "p3", F: "p3", Ma: "p8", NT: "p2", BS: "p8", MI: "", PU: "p5", KOM: "p6" },
    "3B": { D: "p1", E: "p6", F: "p6", Ma: "", NT: "p8", BS: "p4", MI: "p2", PU: "p6", KOM: "p7" },
  };

  let n = 0;
  const lektionen = [];
  for (const k of klassen) {
    const t = lektionentafeln[k.tafel];
    const v = verteilung[k.id];
    for (const [fach, wert] of Object.entries(t.faecher)) {
      const [wl, halb] = Array.isArray(wert) ? wert : [wert, false];
      if (halb) {
        [0, 1].forEach((i) => lektionen.push({ id: "l" + (++n), klasse: k.id, fach, wl, halbklasse: i + 1, ressource: "ba", person: v[fach][i] || "" }));
      } else {
        lektionen.push({ id: "l" + (++n), klasse: k.id, fach, wl, ressource: "ba", person: v[fach] || "" });
      }
    }
    if (t.kommunal) lektionen.push({ id: "l" + (++n), klasse: k.id, fach: "KOM", wl: t.kommunal, ressource: "kommunal", person: v.KOM || "" });
  }
  const zusatz = [
    ["1A", "IF", 2, "ba", "p9"], ["1B", "IF", 3, "ba", "p9"], ["2B", "IF", 3, "ba", "p9"], ["3A", "IF", 2, "ba", "p9"], ["3B", "IF", 2, "ba", "p9"],
    ["1B", "DaZ", 2, "daz", "p10"], ["2B", "DaZ", 2, "daz", "p10"], ["3B", "DaZ", 2, "daz", ""],
  ];
  for (const [klasse, fach, wl, ressource, person] of zusatz) lektionen.push({ id: "l" + (++n), klasse, fach, wl, ressource, person, zusatz: true });

  const lehrpersonen = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];
  // art "pauschal": Verwendung der Pauschale des Tätigkeitsbereichs; art "zusatz": zusätzliche Stunden (erhöhen den Beschäftigungsgrad)
  const gefaesse = [
    { id: "g1", name: "Schulkonferenz und Teamsitzungen", bereich: "Schule", art: "pauschal", regel: "linear", stunden: 40, sockel: 15, max: 40, ressource: "", teilnehmende: lehrpersonen.slice() },
    { id: "g2", name: "Pädagogisches Team Zyklus 3", bereich: "Zusammenarbeit", art: "pauschal", regel: "fix", stunden: 30, ressource: "", teilnehmende: ["p1", "p2", "p3", "p4", "p5", "p6"] },
    { id: "g3", name: "Schulinterne Weiterbildung", bereich: "Weiterbildung", art: "pauschal", regel: "linear", stunden: 16, sockel: 8, max: 16, ressource: "", teilnehmende: lehrpersonen.slice() },
    { id: "g4", name: "Stufenleitung", bereich: "Schule", art: "zusatz", regel: "fix", stunden: 120, ressource: "pool", teilnehmende: ["p3"] },
    { id: "g5", name: "ICT-Verantwortung", bereich: "Schule", art: "zusatz", regel: "fix", stunden: 60, ressource: "pool", teilnehmende: ["p8"] },
    { id: "g6", name: "Projektgruppe Lernlandschaft", bereich: "Zusammenarbeit", art: "zusatz", regel: "fix", stunden: 30, ressource: "", teilnehmende: ["p1", "p4", "p6"] },
    { id: "g7", name: "Kustodie Sport", bereich: "Schule", art: "zusatz", kustodie: true, regel: "fix", stunden: 25, ressource: "", teilnehmende: ["p4"] },
  ];

  const ressourcen = [
    { id: "ba", name: "VZE Berufsauftrag (Unterricht und IF)", einheit: "WL", berechnet: true, kantonal: true },
    { id: "pool", name: "Gestaltungspool", einheit: "WL", berechnet: true, kantonal: true },
    { id: "kommunal", name: "Kommunal: 3 WL je 3. Sek, Wahlfächer", einheit: "WL", budget: 6 },
    { id: "daz", name: "DaZ-Aufnahmeunterricht (ausserhalb VZE)", einheit: "WL", berechnet: true },
    { id: "assistenz", name: "Klassenassistenz (ausserhalb Berufsauftrag)", einheit: "%", budget: 50 },
  ];

  const umfrage = {
    p1: { status: "eingereicht", weiter: "ja", wunschProzent: 90, wunschWL: 25, stufen: "Sek A/B", faecher: "D, RZG, RKE, MI", klp: "ja", wuensche: "gerne wieder 1A", sperr: "Mittwochnachmittag", frei: "Freitag", bemerkung: "" },
    p2: { status: "eingereicht", weiter: "ja", wunschProzent: 85, wunschWL: 23, stufen: "Sek A/B", faecher: "Ma, NT, MI", klp: "ja", wuensche: "Projektgruppe MINT", sperr: "", frei: "Montagmorgen", bemerkung: "" },
    p3: { status: "eingereicht", weiter: "ja", wunschProzent: 80, wunschWL: 20, stufen: "Sek A/B", faecher: "F, E", klp: "ja", wuensche: "Stufenleitung weiterführen", sperr: "", frei: "", bemerkung: "" },
    p4: { status: "in Bearbeitung", weiter: "ja", wunschProzent: 90, wunschWL: 25, stufen: "", faecher: "", klp: "", wuensche: "", sperr: "", frei: "", bemerkung: "" },
    p5: { status: "eingereicht", weiter: "ja", wunschProzent: 70, wunschWL: 18, stufen: "Sek A/B", faecher: "D, RZG, Mu, BO", klp: "nein", wuensche: "keine Klassenlehrperson mehr", sperr: "Dienstag", frei: "", bemerkung: "Pensenreduktion gewünscht" },
    p6: { status: "eingereicht", weiter: "ja", wunschProzent: 90, wunschWL: 25, stufen: "Sek A/B", faecher: "E, F, WAH", klp: "ja", wuensche: "", sperr: "", frei: "Mittwoch", bemerkung: "" },
    p7: { status: "eingeladen" },
    p8: { status: "eingereicht", weiter: "ja", wunschProzent: 80, wunschWL: 21, stufen: "Sek A/B", faecher: "BS, NT, Ma", klp: "ja", wuensche: "ICT-Verantwortung", sperr: "", frei: "", bemerkung: "" },
    p9: { status: "eingereicht", weiter: "ja", wunschProzent: 45, wunschWL: 12, stufen: "Sek", faecher: "IF", klp: "nein", wuensche: "", sperr: "Montag", frei: "", bemerkung: "" },
    p10: { status: "eingereicht", weiter: "ja", wunschProzent: 40, wunschWL: 10, stufen: "Sek", faecher: "DaZ, D", klp: "nein", wuensche: "mehr DaZ", sperr: "", frei: "", bemerkung: "" },
    p11: { status: "eingereicht", weiter: "nein", wunschProzent: 0, wunschWL: 0, stufen: "", faecher: "", klp: "nein", wuensche: "", sperr: "", frei: "", bemerkung: "Studium ab Sommer" },
  };

  const ausfaelle = [
    { id: "a1", person: "p7", grund: "Krankheit", von: "2027-10-04", bis: "2027-10-29", wl: 26, vertretung: "p12", quelle: "Kurzvikariat (ausserhalb Berufsauftrag)", status: "geplant", rapport: [] },
    { id: "a2", person: "p4", grund: "Weiterbildung", von: "2027-11-08", bis: "2027-11-12", wl: 24, vertretung: "", quelle: "Gestaltungspool", status: "erfasst", rapport: [] },
    { id: "a3", person: "p2", grund: "Unfall", von: "2027-09-13", bis: "2027-09-24", wl: 23, vertretung: "p12", quelle: "Kurzvikariat (ausserhalb Berufsauftrag)", status: "an Kanton gemeldet",
      rapport: [{ datum: "2027-09-13", lektionen: 5 }, { datum: "2027-09-14", lektionen: 4 }, { datum: "2027-09-15", lektionen: 3 }] },
  ];

  const mutationen = [
    { id: "u1", klasse: "3A", was: "Teamteaching", warum: "Klasse 3A über der Höchstzahl (26 statt 25)", lektionen: 2, quelle: "Gestaltungspool", person: "p12", start: "2027-08-23", status: "erfasst" },
  ];

  const angebote = [
    { id: "t1", name: "Mittagstisch", tag: "Mo", von: "11:45", bis: "13:30", kinder: 34 },
    { id: "t2", name: "Mittagstisch", tag: "Di", von: "11:45", bis: "13:30", kinder: 28 },
    { id: "t3", name: "Mittagstisch", tag: "Do", von: "11:45", bis: "13:30", kinder: 30 },
    { id: "t4", name: "Mittagstisch", tag: "Fr", von: "11:45", bis: "13:30", kinder: 22 },
    { id: "t5", name: "Aufgabenbetreuung", tag: "Mo", von: "15:30", bis: "17:00", kinder: 15 },
    { id: "t6", name: "Aufgabenbetreuung", tag: "Di", von: "15:30", bis: "17:00", kinder: 12 },
    { id: "t7", name: "Aufgabenbetreuung", tag: "Do", von: "15:30", bis: "17:00", kinder: 10 },
  ];

  const gespraeche = [
    { id: "m1", person: "p4", art: "Probezeitgespräch", datum: "2027-10-21", status: "geplant", freigegeben: false },
    { id: "m2", person: "p6", art: "Mitarbeitendenbeurteilung", datum: "2027-11-30", status: "Formular vorbereitet", freigegeben: false },
    { id: "m3", person: "p1", art: "Unterrichtsbesuch", datum: "2027-09-28", status: "dokumentiert", freigegeben: true },
    { id: "m4", person: "p8", art: "Mitarbeitendengespräch (Arbeitszeit)", datum: "2027-03-15", status: "geplant", freigegeben: false },
  ];

  // Jahresablauf für die Planung 2027/28 – Termine nach Weisung 2026/27 sinngemäss ein Jahr später (ZU PRÜFEN)
  const termine = [
    { datum: "2026-09-15", titel: "Stichtag Schülerzahlen (Bildungsstatistik)", wer: "Schulverwaltung" },
    { datum: "2026-12-18", titel: "Beschäftigungsgrad mit den Lehrpersonen klären (vor Weihnachten), Pensenumfrage abschliessen", wer: "Schulleitung" },
    { datum: "2027-02-15", titel: "Stellenplan, Zusammenstellung VZE und VZE-Tool an das Volksschulamt", wer: "Schulpflege / Schulverwaltung" },
    { datum: "2027-03-31", titel: "Arbeitszuweisung (Pensenvereinbarung) – muss nicht vorher abgeschlossen sein", wer: "Schulleitung" },
    { datum: "2027-06-30", titel: "Letzte Korrektur Schülerzahlen, Kredit und Umlagerung Therapie → IF", wer: "Schulverwaltung" },
    { datum: "2027-07-09", titel: "Klassenbildung vor den Sommerferien abschliessen", wer: "Schulleitung" },
    { datum: "2027-08-16", titel: "Schuljahresbeginn 2027/28", wer: "alle" },
    { datum: "2027-09-30", titel: "Nicht besetzte Ressourcen (Vakanzen) per VZE-Tool und Liste «VZE Mutationen» melden", wer: "Schulverwaltung" },
  ];

  return { parameter, stellen, schulen, schuljahre, personen, faecher, lektionentafeln, klassen, lektionen, gefaesse,
    ressourcen, umfrage, ausfaelle, mutationen, angebote, gespraeche, termine };
})();
