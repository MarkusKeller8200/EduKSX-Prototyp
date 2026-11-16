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
    koordination: [{ person: "p3", vze: 0.08 }],
  };

  const schulen = [
    { id: "s1", name: "Sekundarschule Musterhausen" },
    { id: "s2", name: "Primarschule Musterhausen" },
  ];
  const schuljahre = ["2027/28", "2026/27"];

  // Stammdaten kommen später aus EduKSX-Ident (Kürzel, Geburtsdatum); Planungsangaben aus EduKSX-Staffing.
  // bgSoll = mit der Lehrperson vereinbarter Beschäftigungsgrad (Ziel der Planung), pensumVorjahr zum Vergleich.
  const personen = [
    { id: "p1", name: "Lea Muster", kuerzel: "LMu", geburtsdatum: "1993-04-12", art: "Lehrperson", faecher: ["D", "RZG", "RKE", "MI"], bgSoll: 75, pensumVorjahr: 72, bemerkung: "Wunsch: wieder 1A übernehmen" },
    { id: "p2", name: "Jonas Beispiel", kuerzel: "JBe", geburtsdatum: "1975-09-30", art: "Lehrperson", faecher: ["Ma", "NT", "MI"], bgSoll: 85, pensumVorjahr: 85 },
    { id: "p3", name: "Mira Exempel", kuerzel: "MEx", geburtsdatum: "1986-01-22", art: "Lehrperson", faecher: ["F", "E"], bgSoll: 80, pensumVorjahr: 78 },
    { id: "p4", name: "Noah Probe", kuerzel: "NPr", geburtsdatum: "1998-06-03", art: "Lehrperson", faecher: ["Ma", "NT", "BS"], berufseinfuehrung: true, neu: true, bgSoll: 90 },
    { id: "p5", name: "Sara Testmann", kuerzel: "STe", geburtsdatum: "1968-02-15", art: "Lehrperson", faecher: ["D", "RZG", "Mu", "BO", "PU"], bgSoll: 70, pensumVorjahr: 80, bemerkung: "Pensenreduktion vereinbart" },
    { id: "p6", name: "Luca Fiktiv", kuerzel: "LFi", geburtsdatum: "1982-11-08", art: "Lehrperson", faecher: ["E", "F", "WAH", "PU", "KOM"], bgSoll: 90, pensumVorjahr: 88 },
    { id: "p7", name: "Elena Modell", kuerzel: "EMo", geburtsdatum: "1966-05-27", art: "Lehrperson", faecher: ["BG", "TTG", "WAH", "KOM"], bgSoll: 90, pensumVorjahr: 90 },
    { id: "p8", name: "David Entwurf", kuerzel: "DEn", geburtsdatum: "1990-08-19", art: "Lehrperson", faecher: ["BS", "NT", "Ma"], quest: true, bgSoll: 70, pensumVorjahr: 65, bemerkung: "Quereinstieg, Studium berufsbegleitend" },
    { id: "p9", name: "Nina Schema", kuerzel: "NSc", geburtsdatum: "1978-03-11", art: "Schulische Heilpädagogik", faecher: ["IF"], bgSoll: 40, pensumVorjahr: 40 },
    { id: "p10", name: "Ruth Vorlage", kuerzel: "RVo", geburtsdatum: "1972-12-01", art: "Lehrperson DaZ", faecher: ["DaZ", "D"], bgSoll: 35, pensumVorjahr: 45, bemerkung: "zusätzlich Mediothek 10 %", bemerkungPensen: "Mediothek separat angestellt (kommunal)" },
    { id: "p11", name: "Tim Kurzmann", kuerzel: "TKu", geburtsdatum: "2001-07-14", art: "Klassenassistenz", faecher: [], pensumVorjahr: 40 },
    { id: "p15", name: "Petra Leitwerk", kuerzel: "PLe", geburtsdatum: "1979-03-30", art: "Schulleitung", faecher: [], pensumVorjahr: 50 },
    { id: "p12", name: "Aline Pool", kuerzel: "APo", geburtsdatum: "1995-10-05", art: "Stellvertretungspool", faecher: ["Ma", "D", "BS"], pool: true },
    { id: "p13", name: "Marco Hort", kuerzel: "MHo", geburtsdatum: "1984-04-23", art: "Betreuung", faecher: [], tagesstruktur: true, pensumVorjahr: 60 },
    { id: "p14", name: "Ida Mittag", kuerzel: "IMi", geburtsdatum: "1991-09-09", art: "Betreuung", faecher: [], tagesstruktur: true },
  ];

  const faecher = {
    D: "Deutsch", E: "Englisch", F: "Französisch", Ma: "Mathematik", NT: "Natur und Technik",
    RZG: "Räume, Zeiten, Gesellschaften", WAH: "Wirtschaft, Arbeit, Haushalt", RKE: "Religionen, Kulturen, Ethik",
    BG: "Bildnerisches Gestalten", Mu: "Musik", BS: "Bewegung und Sport", MI: "Medien und Informatik",
    TTG: "Textiles und Technisches Gestalten", BO: "Berufliche Orientierung", PU: "Projektunterricht",
    KOM: "Wahlfächer (kommunal)", TT: "Teamteaching", IF: "Integrative Förderung", DaZ: "Deutsch als Zweitsprache",
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
    { id: "1A", jahrgang: 1, abteilung: "A", tafel: 1, schueler: 22, klp: ["p1"], nameVorjahr: "", bemerkung: "" },
    { id: "1B", jahrgang: 1, abteilung: "B", tafel: 1, schueler: 18, klp: ["p2"], nameVorjahr: "", bemerkung: "" },
    { id: "2A", jahrgang: 2, abteilung: "A", tafel: 2, schueler: 24, klp: ["p3"], nameVorjahr: "1A", bemerkung: "" },
    { id: "2B", jahrgang: 2, abteilung: "B", tafel: 2, schueler: 17, klp: ["p4"], nameVorjahr: "1B", bemerkung: "" },
    { id: "3A", jahrgang: 3, abteilung: "A", tafel: "3A", schueler: 26, klp: ["p5"], nameVorjahr: "2A", bemerkung: "Über der Höchstzahl – Teamteaching Deutsch aus dem Gestaltungspool" },
    { id: "3B", jahrgang: 3, abteilung: "B", tafel: "3B", schueler: 13, klp: ["p6", "p8"], klpStunden: { p6: 60, p8: 40 }, nameVorjahr: "2B", bemerkung: "Klassenlehrperson geteilt (60/40)" },
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

  // Lektionengefäss: WL der Schüler/innen (wlSus); bei Halbklassen doppelt so viele Lehrpersonen-Lektionen (wlLp),
  // Zuteilung an eine oder mehrere Personen, Semester (1./2.), abweichender Faktor (LPVO § 10 Abs. 1), Bemerkung.
  let n = 0;
  const lektionen = [];
  const neu = (o) => lektionen.push(Object.assign({ id: "l" + (++n), halbklassen: false, ressource: "ba", faktor: null, semester: [true, true], zuteilung: [], bemerkung: "" }, o));
  const zuteilen = (personen, wl) => {
    const z = [];
    for (const pid of personen) { if (!pid) continue; const x = z.find((y) => y.person === pid); if (x) x.wl += wl; else z.push({ person: pid, wl }); }
    return z;
  };
  for (const k of klassen) {
    const t = lektionentafeln[k.tafel];
    const v = verteilung[k.id];
    for (const [fach, wert] of Object.entries(t.faecher)) {
      const [wl, halb] = Array.isArray(wert) ? wert : [wert, false];
      neu({ klasse: k.id, fach, wlSus: wl, halbklassen: halb, zuteilung: zuteilen(halb ? v[fach] : [v[fach]], wl) });
    }
    if (t.kommunal) neu({ klasse: k.id, fach: "KOM", wlSus: t.kommunal, ressource: "kommunal", zuteilung: zuteilen([v.KOM], t.kommunal) });
  }
  const zusatz = [
    ["1A", "IF", 2, "ba", "p9"], ["1B", "IF", 3, "ba", "p9"], ["2B", "IF", 3, "ba", "p9"], ["3A", "IF", 2, "ba", "p9"], ["3B", "IF", 2, "ba", "p9"],
    ["1B", "DaZ", 2, "daz", "p10"], ["2B", "DaZ", 2, "daz", "p10"], ["3B", "DaZ", 2, "daz", ""],
  ];
  for (const [klasse, fach, wl, ressource, person] of zusatz) neu({ klasse, fach, wlSus: wl, ressource, zusatz: true, zuteilung: zuteilen([person], wl) });
  // Gruppen: Klassenlektionen, weitere Lektionen (Wahl-, Freifächer, Kurse, Niveau), Sonderpädagogik, Anstellungen (%)
  for (const l of lektionen) l.gruppe = l.fach === "KOM" ? "weitere" : (l.fach === "IF" || l.fach === "DaZ") ? "sp" : "klasse";
  for (const l of lektionen) if (l.fach === "KOM") { l.kategorie = "Wahlfach (3. Sek)"; l.stufe = "Sek"; }
  neu({ gruppe: "weitere", kategorie: "Freifach", name: "Freifach Chor", klasse: "", stufe: "Sek", wlSus: 2, ressource: "kommunal", zuteilung: [{ person: "p5", wl: 2 }] });
  neu({ gruppe: "weitere", kategorie: "Niveauunterricht", name: "Niveaugruppe Mathematik 3. Sek", klasse: "", stufe: "Sek 3", wlSus: 2, ressource: "ba", zuteilung: [] , bemerkung: "Klassenübergreifend 3A/3B" });
  neu({ gruppe: "weitere", kategorie: "Andere Angebote", name: "Aufgabenstunde", klasse: "", stufe: "Sek", wlSus: 1, ressource: "kommunal", zuteilung: [{ person: "p3", wl: 1 }] });
  neu({ gruppe: "weitere", kategorie: "Kurs", name: "Kurs Schach", klasse: "", stufe: "Sek", wlSus: 1, ressource: "kommunal", semester: [true, false], zuteilung: [{ person: "p8", wl: 1 }] });
  neu({ gruppe: "sp", kategorie: "Begabungsförderung", name: "Begabungs- und Begabtenförderung", klasse: "", stufe: "Sek", einheit: "%", wlLp: 10, ressource: "ba", zuteilung: [], bemerkung: "Stelle noch offen" });
  neu({ gruppe: "anstellung", kategorie: "Schulleitung", name: "Schulleitung", klasse: "", stufe: "Sek", einheit: "%", wlLp: 52, ressource: "sl", zuteilung: [{ person: "p15", wl: 52 }] });
  neu({ gruppe: "anstellung", kategorie: "Assistenz", name: "Klassenassistenz Sek", klasse: "", stufe: "Sek", einheit: "WStd", wlLp: 20, ressource: "assistenz", zuteilung: [{ person: "p11", wl: 16 }], bemerkung: "Wochenstunden während der Schulwochen" });
  neu({ gruppe: "anstellung", kategorie: "Betreuung", name: "Betreuung Tagesstrukturen", klasse: "", stufe: "Sek", einheit: "%", wlLp: 70, ressource: "betreuung", zuteilung: [{ person: "p13", wl: 60 }] });
  neu({ gruppe: "anstellung", kategorie: "Betreuung", name: "Mittagstisch Sek", klasse: "", stufe: "Sek", einheit: "WStd", wlLp: 20, ressource: "betreuung", zuteilung: [{ person: "p14", wl: 20 }] });
  neu({ gruppe: "anstellung", kategorie: "Kommunal", name: "Mediothek", klasse: "", stufe: "alle", einheit: "%", wlLp: 10, ressource: "kommAnst", zuteilung: [{ person: "p10", wl: 10 }] });
  neu({ gruppe: "anstellung", kategorie: "Kommunal", name: "Schulleitungsassistenz", klasse: "", stufe: "alle", einheit: "%", wlLp: 30, ressource: "kommAnst", zuteilung: [] });

  // Beispiele: Teamteaching aus dem Gestaltungspool (nur Lehrpersonen-Lektionen), Semesterfach, abweichender Faktor
  neu({ gruppe: "klasse", klasse: "3A", fach: "TT", wlSus: 0, wlLp: 2, ressource: "pool", zusatz: true, zuteilung: [{ person: "p1", wl: 2 }], bemerkung: "Teamteaching Deutsch wegen Klassengrösse" });
  const bo = lektionen.find((l) => l.klasse === "2B" && l.fach === "BO"); bo.semester = [false, true]; bo.wlSus = 2; bo.zuteilung = [{ person: "p5", wl: 2 }]; bo.bemerkung = "Berufliche Orientierung nur im 2. Semester (2 WL)";
  const nt = lektionen.find((l) => l.klasse === "2A" && l.fach === "NT"); nt.faktor = 60; nt.bemerkung = "Faktor 60 h: Laborvorbereitung (Entscheid Schulleitung)";
  const ma = lektionen.find((l) => l.klasse === "1A" && l.fach === "Ma"); ma.zuteilung = [{ person: "p2", wl: 4 }, { person: "p8", wl: 2 }]; ma.bemerkung = "Aufgeteilt auf zwei Lehrpersonen";

  const lehrpersonen = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"];
  // art "pauschal": Verwendung der Pauschale des Tätigkeitsbereichs; art "zusatz": zusätzliche Stunden (erhöhen den Beschäftigungsgrad)
  // Gefässe des Berufsauftrags. Stunden je Person: fix = Anzahl × (Präsenz + Vorbereitung); linear = nach Wochenlektionen
  // (Basis 27.3 WL) zwischen Sockel und Maximum. Vorzeichen «−» = Entlastung. Ämter und Kustodien haben ein Stunden-Soll.
  const gefaesse = [
    { id: "g1", name: "Schulkonferenz und Teamsitzungen", kurz: "SK", bereich: "Schule", art: "pauschal", regel: "linear", stunden: 40, sockel: 15, sockelBis: 7, gesamtAb: 22, max: 40, anzahl: 16, praesenz: 2.5, vorbereitung: 0, ressource: "", teilnehmende: lehrpersonen.slice(), beschreibung: "Konferenzen, Teamsitzungen und Schulanlässe" },
    { id: "g2", name: "Pädagogisches Team Zyklus 3", kurz: "PT3", bereich: "Zusammenarbeit", art: "pauschal", regel: "fix", anzahl: 12, praesenz: 2, vorbereitung: 0.5, ressource: "", teilnehmende: ["p1", "p2", "p3", "p4", "p5", "p6"] },
    { id: "g3", name: "Schulinterne Weiterbildung", kurz: "SCHILF", bereich: "Weiterbildung", art: "pauschal", regel: "linear", stunden: 16, sockel: 8, max: 16, ressource: "", teilnehmende: lehrpersonen.slice() },
    { id: "g9", name: "Kompakt-Weiterbildung Berufseinstieg", kurz: "WBE", bereich: "Weiterbildung", art: "pauschal", regel: "fix", anzahl: 1, praesenz: 40, vorbereitung: 0, ressource: "", teilnehmende: ["p4"], beschreibung: "Für Lehrpersonen in der Berufseinführung" },
    { id: "g10", name: "Elternabende und Elterngespräche", kurz: "EL", bereich: "Flex", art: "pauschal", regel: "linear", stunden: 20, sockel: 6, max: 20, ressource: "", teilnehmende: ["p1", "p2", "p3", "p6", "p8"], bemerkung: "aus der nicht zugewiesenen Zeit" },
    { id: "g11", name: "Entlastung Altersjahr (Beispiel)", kurz: "ENT", bereich: "Schule", art: "pauschal", vorzeichen: "-", regel: "fix", anzahl: 1, praesenz: 10, vorbereitung: 0, ressource: "", teilnehmende: [] },
    { id: "g4", name: "Stufenleitung", kurz: "STL", bereich: "Schule", art: "zusatz", amt: true, soll: 120, regel: "fix", stunden: 120, ressource: "pool", teilnehmende: ["p3"] },
    { id: "g5", name: "ICT-Verantwortung", kurz: "ICT", bereich: "Schule", art: "zusatz", amt: true, soll: 60, regel: "fix", stunden: 60, ressource: "pool", teilnehmende: ["p8"] },
    { id: "g6", name: "Projektgruppe Lernlandschaft", kurz: "PLL", bereich: "Zusammenarbeit", art: "zusatz", regel: "fix", stunden: 30, ressource: "", teilnehmende: ["p1", "p4", "p6"] },
    { id: "g12", name: "Berufswahl-Koordination", kurz: "BWK", bereich: "Schule", art: "zusatz", amt: true, soll: 10, regel: "fix", stunden: 10, ressource: "", teilnehmende: ["p2"] },
    { id: "g13", name: "Elternrat-Begleitung", kurz: "ER", bereich: "Schule", art: "zusatz", amt: true, soll: 30, regel: "fix", stunden: 15, ressource: "", teilnehmende: ["p6"], bemerkung: "zweite Person gesucht" },
    { id: "g7", name: "Kustodie Sport", kurz: "KSP", bereich: "Schule", art: "zusatz", amt: true, kustodie: true, soll: 25, regel: "fix", stunden: 25, ressource: "", teilnehmende: ["p4"] },
    { id: "g8", name: "Kustodie Informatikräume", kurz: "KIN", bereich: "Schule", art: "zusatz", amt: true, kustodie: true, entschaedigt: true, soll: 70, regel: "fix", stunden: 70, ressource: "", teilnehmende: ["p8"] },
  ];


  const ressourcen = [
    { id: "ba", name: "VZE Berufsauftrag (Unterricht und IF)", einheit: "WL", berechnet: true, kantonal: true },
    { id: "pool", name: "Gestaltungspool", einheit: "WL", berechnet: true, kantonal: true },
    { id: "kommunal", name: "Kommunal: 3 WL je 3. Sek, Wahlfächer", einheit: "WL", budget: 6 },
    { id: "daz", name: "DaZ-Aufnahmeunterricht (ausserhalb VZE)", einheit: "WL", berechnet: true },
    { id: "assistenz", name: "Klassenassistenz (ausserhalb Berufsauftrag)", einheit: "WStd", budget: 20 },
    { id: "sl", name: "Schulleitung (VZE Schulleitung)", einheit: "%", berechnet: true, kantonal: true },
    { id: "betreuung", name: "Betreuung Tagesstrukturen (kommunal)", einheit: "%", budget: 120 },
    { id: "kommAnst", name: "Kommunale Anstellungen (Mediothek, SL-Assistenz)", einheit: "%", budget: 40 },
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

  // Personaldossier: Einträge je Person (Kategorien wie in der Personalführung üblich)
  const dossierKategorien = ["Diplome, Weiterbildung, Fächer", "Anstellung, Urlaub, Abwesenheit", "Mitarbeitendenbeurteilung", "Besuche, Gespräche, Notizen", "Weitere Unterlagen"];
  const dossierVorlagen = [
    { titel: "Diplom oder Zertifikat", kategorie: 0 }, { titel: "Dokument zur Anstellung", kategorie: 1 },
    { titel: "Probezeit: Zwischengespräch", kategorie: 3 }, { titel: "Probezeit: Schlussgespräch", kategorie: 3 },
    { titel: "Mitarbeitendenbeurteilung Lehrperson", kategorie: 2 }, { titel: "Mitarbeitendenbeurteilung Fachperson Sonderpädagogik", kategorie: 2 },
    { titel: "Zielvereinbarung", kategorie: 2 }, { titel: "Vertiefte Beurteilung", kategorie: 2 },
    { titel: "Unterrichtsbesuch", kategorie: 3 }, { titel: "Therapie-/Förderbesuch", kategorie: 3 }, { titel: "Gespräch", kategorie: 3 }, { titel: "Notiz", kategorie: 3 },
    { titel: "Urlaub oder Abwesenheit", kategorie: 1 }, { titel: "Weitere Unterlage", kategorie: 4 },
  ];
  const dossier = {
    p1: [{ id: "d1", kategorie: 0, titel: "Lehrdiplom Sekundarstufe I", datum: "2008-07-01", notiz: "Fächer D, Geschichte" }, { id: "d2", kategorie: 3, titel: "Unterrichtsbesuch", datum: "2026-09-28", notiz: "" }],
    p4: [{ id: "d3", kategorie: 1, titel: "Anstellungsverfügung", datum: "2026-08-01", notiz: "Probezeit bis 31.1." }, { id: "d4", kategorie: 3, titel: "Probezeit: Zwischengespräch", datum: "2026-10-21", notiz: "" }],
    p6: [{ id: "d5", kategorie: 2, titel: "Mitarbeitendenbeurteilung Lehrperson", datum: "2025-11-30", notiz: "" }],
  };

  // Jahresablauf für die Planung 2027/28 – Termine nach Weisung 2026/27 sinngemäss ein Jahr später (ZU PRÜFEN)
  const termine = [
    { datum: "2026-09-15", titel: "Stichtag Schülerzahlen (Bildungsstatistik)", wer: "Schulverwaltung" },
    { datum: "2026-12-18", titel: "Beschäftigungsgrad mit den Lehrpersonen klären (vor Weihnachten), Pensenumfrage abschliessen", wer: "Schulleitung", recht: ["LPVO", "9"] },
    { datum: "2027-02-15", titel: "Stellenplan, Zusammenstellung VZE und VZE-Tool an das Volksschulamt (Weisung; Verordnung: bis 1. März)", wer: "Schulpflege / Schulverwaltung", recht: ["LPVO", "2", "Abs. 5"] },
    { datum: "2027-03-31", titel: "Arbeitszuweisung (Pensenvereinbarung) – muss nicht vorher abgeschlossen sein", wer: "Schulleitung", recht: ["LPVO", "10", "Abs. 1"] },
    { datum: "2027-06-30", titel: "Letzte Korrektur Schülerzahlen, Kredit und Umlagerung Therapie → IF", wer: "Schulverwaltung" },
    { datum: "2027-07-09", titel: "Klassenbildung vor den Sommerferien abschliessen", wer: "Schulleitung" },
    { datum: "2027-08-16", titel: "Schuljahresbeginn 2027/28 (anstellungsrechtlich 1. August)", wer: "alle", recht: ["LPVO", "1 a"] },
    { datum: "2027-09-30", titel: "Nicht besetzte Ressourcen (Vakanzen) per VZE-Tool und Liste «VZE Mutationen» melden", wer: "Schulverwaltung", recht: ["LPG", "3", "Abs. 3"] },
  ];

  return { parameter, stellen, schulen, schuljahre, personen, faecher, lektionentafeln, klassen, lektionen, gefaesse,
    ressourcen, umfrage, ausfaelle, mutationen, angebote, gespraeche, termine, dossier, dossierKategorien, dossierVorlagen };
})();
