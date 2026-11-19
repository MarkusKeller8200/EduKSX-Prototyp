/*
 * EduKSX-Flow – Ablaufvorlagen für Schulgemeinden im Kanton Zürich (Gemeinde, Behörde, Finanzen, Lernende, Personal,
 * Infrastruktur, ICT). Jeder Schritt trägt eine Quellenangabe (Feld «quelle»). Grundlage: Gemeindegesetz (GG, LS 131.1),
 * Gemeindeverordnung (VGG, LS 131.11), Lehrpersonalgesetz (LPG, LS 412.31), Lehrpersonalverordnung (LPVO, LS 412.311),
 * Vollzugsverordnung zum Personalgesetz (VVO, LS 177.111), Personalgesetz (PG, LS 177.10), Volksschulgesetz und
 * -verordnung (VSG/VSV), Gesundheitsgesetz (GesG § 51), Verordnung über die Schul- und Volkszahnpflege (VSVZ, LS 818.22),
 * UVG (SR 832.20), Hilfsmittel des Gemeindeamts, Informationen des Volksschulamts, Funktionendiagramm (Muster),
 * Prozessliste der Arbeitsgruppe, Jahresplanung ICT, Master-Checkliste und Jahreskalender Fachstelle ICT.
 * «ZU PRÜFEN» = gemeindeeigene Regelung (Gemeindeordnung, Geschäftsordnung, Personalverordnung) oder Paragraf noch nicht
 * verifiziert. Stand der Recherche: 19.11.2026 – keine Rechtsberatung.
 * Wird nach daten.js geladen und ergänzt window.FLOW_DATEN.
 */
(function () {
  "use strict";
  const D = window.FLOW_DATEN;

  // ------------------------------------------------------------ Rollen, Funktionendiagramm, Vorgänge ergänzen
  Object.assign(D.ROLLEN, {
    RPK: "Rechnungsprüfungskommission",
    GV: "Gemeindeversammlung (Stimmberechtigte)",
    VSA: "Volksschulamt (extern)",
    MA: "Mitarbeitende Person",
    ELT: "Erziehungsberechtigte",
  });
  D.EXTERN = ["GV", "VSA", "MA", "ELT", "LP"]; // ohne eigene Anmeldung: Schritt bestätigt die zuständige Stelle
  Object.assign(D.KAL_ZUORDNUNG, { RPK: [], GV: [], VSA: [], MA: [], ELT: [] });

  const fd = (nr, titel, rollen) => D.FUNKTIONENDIAGRAMM.push({ nr, titel, rollen });
  fd("1.1.2", "Organisationsstatut (Organigramm, Geschäftsordnung, Funktionendiagramm)", { SPF: "E", SPr: "V", SL: "M", SV: "M" });
  fd("1.1.10", "Öffentlichkeitsarbeit", { SPF: "M", SPr: "(E/V)", SL: "(E/V)", SV: "M/I" });
  fd("1.2.6", "Stellen- und Einreihungsplan kommunale Stellen", { SPF: "E", SL: "(V)", HD: "(V)", SV: "(V)/I" });
  fd("1.2.7", "Immobilienstrategie", { SPF: "E", RV: "V", SL: "M", HD: "M" });
  fd("1.2.8", "Schulraumplanung", { SPF: "E", RV: "V", SL: "M", HD: "M" });
  fd("1.2.11", "Schulraumbelegung ausserhalb Unterrichtszeit (V: Drittnutzer)", { SPF: "I", HD: "E" });
  fd("2.1", "Finanz- und Investitionsplanung", { SPF: "E", RV: "V", SL: "M", SV: "M" });
  fd("2.2", "Budget und Mittelzuteilung, Jahresrechnung (E2: Gemeindeversammlung)", { SPF: "E1", RV: "V", SL: "M", HD: "M", SV: "M/I" });
  fd("2.3", "Budgetkontrolle, Submissionen", { SPF: "C", RV: "E", SL: "M", HD: "M", SV: "V" });
  fd("2.6", "Tarife Gebühren", { SPF: "E", SL: "(M)", HD: "(M)", SV: "V" });
  fd("3.1", "ICT-Grundlagen, Konzept", { SPF: "E", RV: "V", SL: "M", SV: "M" });
  fd("4.4.1", "Zuteilung Schülerinnen und Schüler in die Klassen", { SPF: "I", SL: "E", SV: "V" });
  fd("5.1.2", "Personalanlässe (gesamte Schule)", { SPF: "I", SL: "E/V", HD: "M", SV: "M/I", LP: "I" });
  fd("5.2.4", "Anstellung/Entlassung Schulverwaltung und Hausdienst", { SPF: "E", SPr: "V", SV: "I" });
  fd("5.2.5", "Anstellung/Entlassung weitere Mitarbeitende Schulbetrieb", { SPF: "E", SPr: "V", SL: "V", HD: "I", SV: "I", LP: "I" });
  fd("5.4.2", "Beurteilung und Aufsicht Lehrpersonen", { SPF: "C", SL: "E/V", SV: "I" });
  fd("5.4.7", "Schulbesuche", { SPF: "E/V", SL: "M", HD: "M", SV: "M" });
  fd("6.1.2", "Schullaufbahnentscheide ohne Wechsel Schule", { SPF: "C", SL: "E", SV: "I", LP: "V" });
  fd("6.1.4", "Zeugnisse", { SL: "E2", SV: "I", LP: "E1/V" });

  const modul = (key) => D.MODULE.find((m) => m.key === key);
  modul("core").aufgabe = "Personen, Lernende, Dossiers, Dokumente, Geschäfte, Mitteilungen";
  modul("core").vorgaenge.push(
    { id: "core.geschaeft.erfassen", titel: "Geschäft / Antrag erfassen", parameter: ["titel", "an"], ergebnis: ["geschaeft"], art: "sofort" },
    { id: "core.traktandenliste.versenden", titel: "Einladung und Traktandenliste versenden", parameter: ["sitzung", "an"], ergebnis: ["versand"], art: "sofort" },
    { id: "core.akten.auflegen", titel: "Akten auflegen / elektronisch veröffentlichen", parameter: ["geschaeft", "ort"], ergebnis: ["auflage"], art: "sofort" },
    { id: "core.publikation.veroeffentlichen", titel: "Im amtlichen Publikationsorgan veröffentlichen", parameter: ["text"], ergebnis: ["publikation"], art: "sofort" },
    { id: "core.beschluss.protokollieren", titel: "Beschluss / Protokoll erfassen", parameter: ["geschaeft", "gremium"], ergebnis: ["beschluss"], art: "sofort" },
    { id: "core.zirkular.versenden", titel: "Zirkulationsbeschluss einholen", parameter: ["geschaeft", "an"], ergebnis: ["stimmen"], art: "rueckmeldung" },
    { id: "core.dokument.erstellen", titel: "Dokument aus Vorlage erstellen", parameter: ["vorlage", "fuer"], ergebnis: ["dokument"], art: "sofort" },
    { id: "core.lernende.erfassen", titel: "Lernende erfassen (Eintritt)", parameter: ["person", "klasse", "ab"], ergebnis: ["lernende"], art: "sofort" },
    { id: "core.lernende.mutieren", titel: "Lernende mutieren", parameter: ["person", "aenderung", "ab"], ergebnis: ["lernende"], art: "sofort" },
    { id: "core.lernende.austreten", titel: "Lernende austreten lassen", parameter: ["person", "per"], ergebnis: ["austritt"], art: "sofort" },
  );
  modul("connect").vorgaenge.push(
    { id: "connect.meldung.uebermitteln", titel: "Meldung an externe Stelle übermitteln", parameter: ["an", "formular"], ergebnis: ["eingang"], art: "rueckmeldung" },
  );
  modul("staffing").vorgaenge.push(
    { id: "staffing.beurteilung.erfassen", titel: "Mitarbeiterbeurteilung erfassen", parameter: ["person", "schuljahr"], ergebnis: ["beurteilung"], art: "sofort" },
    { id: "staffing.absenz.erfassen", titel: "Absenz erfassen", parameter: ["person", "grund", "ab"], ergebnis: ["absenz"], art: "sofort" },
  );
  D.MODULE.push({ key: "finance", name: "Finance", aufgabe: "Budget, Jahresrechnung, Kredite, Investitionen (Modul geplant)", vorgaenge: [
    { id: "finance.budget.erfassen", titel: "Budget erfassen / übernehmen", parameter: ["jahr"], ergebnis: ["budget"], art: "sofort" },
    { id: "finance.kredit.pruefen", titel: "Kredit prüfen (Budget-, Verpflichtungskredit)", parameter: ["vorhaben", "betrag"], ergebnis: ["kredit"], art: "sofort" },
    { id: "finance.rechnung.abschliessen", titel: "Jahresrechnung abschliessen", parameter: ["jahr"], ergebnis: ["abschluss"], art: "rueckmeldung" },
    { id: "finance.investition.buchen", titel: "Investition buchen / aktivieren", parameter: ["projekt", "betrag"], ergebnis: ["anlage"], art: "sofort" },
  ] });

  // ------------------------------------------------------------ Quellenverzeichnis (Kurzbezeichnung → Titel, Link)
  const ZH = "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung.html";
  const VSA = "https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule/";
  D.QUELLENVERZEICHNIS = {
    "GG": ["Gemeindegesetz (GG), LS 131.1", "https://www.notes.zh.ch/appl/zhlex_r.nsf/WebView/4808386286967F00C1258DC400297A31/$File/131.1_20.4.15_132.pdf"],
    "VGG": ["Gemeindeverordnung (VGG), LS 131.11", ZH],
    "LPG": ["Lehrpersonalgesetz (LPG), LS 412.31", ZH],
    "LPVO": ["Lehrpersonalverordnung (LPVO), LS 412.311", ZH],
    "VVO": ["Vollzugsverordnung zum Personalgesetz (VVO), LS 177.111", ZH],
    "PG": ["Personalgesetz (PG), LS 177.10 – Handbuch Personalrecht", "https://www.zh.ch/de/arbeiten-beim-kanton/fuer-hr-profis/handbuch-personalrecht/definition/beendigung-arbeitsverhaeltnis/grundlagen-zur-kuendigung.html"],
    "VSG": ["Volksschulgesetz (VSG), LS 412.100", ZH],
    "VSV": ["Volksschulverordnung (VSV), LS 412.101", ZH],
    "GesG": ["Gesundheitsgesetz (GesG) § 51 – Schulzahnpflege", "https://www.zh.ch/de/gesundheit/gesundheitsberufe/fachspezifische-informationen/zahnmedizin/schulzahnmedizin.html"],
    "VSVZ": ["Verordnung über die Schul- und Volkszahnpflege (VSVZ), LS 818.22", "https://www.zh.ch/de/gesundheit/gesundheitsberufe/fachspezifische-informationen/zahnmedizin/schulzahnmedizin.html"],
    "UVG": ["Unfallversicherungsgesetz (UVG), SR 832.20 – SUVA: Unfall korrekt melden", "https://www.suva.ch/de-ch/unfall/schadenabwicklung/schadenmeldung/unfall-schaden-korrekt-melden"],
    "SUVA": ["SUVA: Ordentlicher Unfall oder Bagatellunfall", "https://www.suva.ch/de-ch/ueber-uns/magazin-und-medien/magazin/ordentlicher-unfall-oder-bagatellunfall"],
    "Checkliste GV": ["Gemeindeamt: Checkliste Gemeindeversammlung (Juni 2026)", "https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/politik-staat/wahlen-abstimmungen/gemeindeversammlung/Checkliste_Gemeindeversammlung.pdf"],
    "Leitfaden GV": ["Gemeindeamt: Leitfaden Leitung der Gemeindeversammlung", "https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/politik-staat/wahlen-abstimmungen/gemeindeversammlung/Leitfaden_Leitung_Gemeindeversammlung.pdf"],
    "Merkblatt Budget": ["Gemeindeamt: Häufig gestellte Fragen zum Budgetverfahren", "https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/politik-staat/gemeinden/gemeindeorganisation/merkblatt_haeufig-gestellte-fragen-budgetverfahren.pdf"],
    "Leitfaden RGPK": ["Gemeindeamt: Leitfaden Rechnungs- und Geschäftsprüfungskommission", "https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/politik-staat/gemeinden/gemeindeorganisation/leitfaden_rgpk.pdf"],
    "VSA Abwesenheit": ["Volksschulamt: Abwesenheit (Krankheit, Unfall)", VSA + "volksschule-anstellung-arbeit/volksschule-abwesenheiten-und-urlaube/volksschule-abwesenheit.html"],
    "VSA Unfallmeldung": ["Volksschulamt: Elektronische Unfallmeldung", VSA + "volksschule-anstellung-arbeit/volksschule-projekt-aurora/elektronische-unfallmeldung.html"],
    "VSA Versicherung": ["Volksschulamt: Versicherungen und Vorsorge", VSA + "volksschule-anstellung-arbeit/volksschule-versicherung-und-vorsorge.html"],
    "VSA Vikariat": ["Volksschulamt: Vikariat", VSA + "vikariat.html"],
    "VSA Beendigung": ["Volksschulamt: Beendigung des Arbeitsverhältnisses", VSA + "volksschule-anstellung-arbeit/volksschule-arbeitsverhaeltnis-beenden.html"],
    "VSA Anpassung": ["Volksschulamt: Anpassung des Arbeitsverhältnisses", VSA + "volksschule-anstellung-arbeit/volksschule-arbeitsverhaeltnis_anpassen.html"],
    "VSA Beginn": ["Volksschulamt: Beginn des Arbeitsverhältnisses", VSA + "volksschule-anstellung-arbeit/volksschule-arbeitsverhaeltnis-beginnen.html"],
    "VSA Stellensituation": ["Volksschulamt: Stellensituation, provisorische Zulassung", VSA + "volksschule-fuehrung/volksschule-stellensituation.html"],
    "VSA Stellen": ["Volksschulamt: Bewilligung von Stellen (Stellenplan 1. März)", VSA + "volksschule-fuehrung/volksschule-klassen-stellen-planen/volksschule-stellen-bewilligen.html"],
    "VSA Case Management": ["Volksschulamt: Schwierige Personalsituationen (Case Management)", VSA + "volksschule-fuehrung/volksschule-personal-fuehren/volksschule-schwierige-personalsituationen.html"],
    "VSA Schularzt": ["Volksschulamt: Schulärztlicher Dienst", VSA + "volksschule-schulinfo-unterrichtsergaenzende-angebote/schulinfo-schulaerztlicher-dienst.html"],
    "Schülerprognose": ["Bildungsplanung: Prognose Anzahl Schülerinnen und Schüler", "https://www.zh.ch/de/bildung/bildungssystem/zahlen-fakten/prognose-der-anzahl-schuelerinnen-und-schueler-in-der-regelschule.html"],
    "Ferienplan": ["Ferienplan 2026–2029 Sekundarschulgemeinde Bülach (Testdaten)", "https://www.buelach.ch/_docn/7118380/Ferienplan_2026_2029.pdf"],
    "FD": ["Funktionendiagramm (Muster einer Primarschule im Kanton Zürich)", ""],
    "Prozessliste": ["Prozessliste der Arbeitsgruppe (Onboarding, Offboarding, Mutationen)", ""],
    "Jahresplanung ICT": ["Jahresplanung ICT-Prozesse inkl. DigiLex (Stand 27.05.2026)", ""],
    "Master-Checkliste": ["Master-Checkliste ICT-Jahreszyklus", ""],
    "Jahreskalender ICT": ["Jahreskalender Fachstelle ICT (Kalenderwochen)", ""],
  };

  // ------------------------------------------------------------ Bausteine
  const a = (vorgang, param) => ({ vorgang, param });
  const F = {
    bez: (label) => ({ key: "person", label: label || "Bezeichnung", typ: "text" }),
    name: (label) => ({ key: "person", label: label || "Name", typ: "text" }),
    datum: (label) => ({ key: "stichtag", label, typ: "datum" }),
    anst: () => ({ key: "anstellung", label: "Anstellung", typ: "auswahl", werte: ["kantonal", "kommunal"] }),
    wahl: (key, label, werte) => ({ key, label, typ: "auswahl", werte }),
    zahl: (key, label) => ({ key, label, typ: "zahl" }),
    text: (key, label) => ({ key, label, typ: "text" }),
  };
  /**
   * Vorlage aus Zeilen: [titel, rolle, tage, aktion|null, quelle, optionen]. Ohne «nach» folgt ein Schritt dem
   * vorherigen; «nach: [1, 3]» verweist auf Schrittnummern (1-basiert), «nach: []» = parallel ab Start.
   */
  function V(id, gruppe, titel, stichtag, beschreibung, felder, zeilen) {
    const schritte = zeilen.map((z, i) => {
      const [t, rolle, tage, aktion, quelle, o] = z;
      const opt = o || {};
      const nach = opt.nach ? opt.nach.map((n) => id + n) : i ? [id + i] : [];
      return { id: id + (i + 1), titel: t, rolle, tage, nach, aktion: aktion || null, auto: !!opt.auto, informiert: opt.i || [], bedingung: opt.b || null, fd: opt.fd || "", quelle: quelle || "" };
    });
    D.VORLAGEN.push({ id, gruppe, titel, version: 1, status: "freigegeben", stichtag, beschreibung, felder, schritte });
  }
  const mit = (an, vorlage) => a("core.mitteilung.senden", { an, vorlage });
  const pub = (text) => a("core.publikation.veroeffentlichen", { text });
  const bes = (gremium) => a("core.beschluss.protokollieren", { geschaeft: "{person}", gremium });
  const ges = (an) => a("core.geschaeft.erfassen", { titel: "{person}", an });
  const term = (titel, mitw) => a("time.termin.planen", { titel, datum: "{stichtag}", mit: mitw || "{person}" });
  const meld = (an, formular) => a("connect.meldung.uebermitteln", { an, formular });
  const anf = (person, dokument) => a("core.dokument.anfordern", { person, dokument });
  const uz = (person, dokument) => a("core.dokument.unterschrift", { person, dokument });
  const kantonal = { feld: "anstellung", op: "=", wert: "kantonal" };
  const kommunal = { feld: "anstellung", op: "=", wert: "kommunal" };

  // Bestehende Vorlagen: Gruppe und Quellen ergänzen
  const QB = {
    onboarding: ["Prozessliste (Meldung über Eintritt); FD 5.2.2", "Prozessliste (Anstellungsverfügung); LPVO § 4; VVO § 13", "Prozessliste (Personaldossier); VVO § 21", "Prozessliste (Strafregister-Auszug)", "Prozessliste (Login gemäss Rollen- und Berechtigungskonzept); FD 3.10", "Prozessliste (Funktionsgruppe); FD 3.10", "Prozessliste (Microsoft-Login → Office-Konto)", "Prozessliste (Login Schulverwaltungssystem/Schuladministration)", "Prozessliste (Login Lehrmittel)", "Prozessliste (Zugang Notfall-App)", "Prozessliste (Datenschutz-Weisung, Nutzungsvereinbarung); Jahresplanung ICT Q1", "Prozessliste (Berufsauftrag); FD 5.1.5; LPG § 18 ff.", "Prozessliste (Abgabe Stundenplan)", "Prozessliste (Material, Lehrmittel bestellen)", "Prozessliste (Schlüssel)", "Prozessliste (Übergabe Geräte, Übergabeprotokoll); FD 3.7", "Prozessliste (Begrüssungsmail SL)", "Prozessliste (Wocheninfo)", "Prozessliste (Kommunikation an Eltern und Klasse)", "Prozessliste (Einführung durch SL)"],
    offboarding: ["Prozessliste (Meldung über Austritt)", "Prozessliste (Nicht-Verlängerung); LPG § 8; FD 5.2.3", "Prozessliste (Austrittsgespräch SL); VVO § 139 Abs. 1", "Prozessliste (Nachfolge, Übergabe)", "VVO § 139 Abs. 2; FD 5.4.8", "Prozessliste (Austrittserklärung)", "Prozessliste (Rückgabe Geräte)", "Prozessliste (Rückgabe Lehrmittel/Material)", "Prozessliste (Schlüssel zurückfordern)", "Prozessliste (Logins sperren, Autoresponder); FD 3.10", "Prozessliste (Logins entziehen); Master-Checkliste (Konten deaktivieren)", "Prozessliste (Personaldossier abschliessen, digitale Aktenführung ab 1.1.2029); VVO §§ 21–25"],
    mutation: ["Prozessliste (Meldung über Mutation)", "VSA Anpassung; LPVO § 4", "VSA Anpassung (Reduktion = Teilkündigung); LPG § 8", "Prozessliste (Gruppen/Berechtigungen anpassen); FD 3.10", "Prozessliste (Mutation Name)", "Prozessliste (Mutationen)", "Prozessliste (Überprüfung Zugriffsberechtigungen); FD 3.10"],
    beschaffung: ["Master-Checkliste (Mengenplanung, 1.4.)", "Master-Checkliste (Offerten einholen, 10.4.); Submissionsrecht (Schwellenwerte ZU PRÜFEN)", "FD 3.7 (RV E, ICT V); Jahreskalender ICT KW 16/18 (Antrag an GL bzw. Schulpflege)", "Master-Checkliste (Bestellung auslösen, 1.5.); Jahreskalender ICT KW 20", "Master-Checkliste (Inventar erfassen, 15.5.)", "Master-Checkliste (Setup und Installation, 15.6.)", "Master-Checkliste (Beschriftungen, 15.6.)", "Master-Checkliste (Geräte bereitstellen, 1.7.)"],
  };
  const GRUPPE = { onboarding: "Personal", offboarding: "Personal", mutation: "Personal", beschaffung: "ICT" };
  D.VORLAGEN.forEach((v) => {
    v.gruppe = GRUPPE[v.id] || "Weitere";
    (v.schritte || []).forEach((s, i) => { s.quelle = (QB[v.id] || [])[i] || "ZU PRÜFEN"; });
  });
  // Offboarding: Verfügung vollzieht die Schulverwaltung, Lead (V) liegt laut FD 5.2.3 bei der Schulleitung → nur als Quelle
  D.VORLAGEN.find((v) => v.id === "offboarding").schritte[1].fd = "";
  const besch = D.VORLAGEN.find((v) => v.id === "beschaffung");
  besch.titel = "Hardwarebeschaffung Schuljahreswechsel";
  besch.beschreibung = "Jährliche Gerätebeschaffung auf den Schuljahreswechsel (Master-Checkliste, Jahreskalender Fachstelle ICT): von der Mengenplanung bis zu den bereitgestellten Geräten.";

  // ------------------------------------------------------------ Gemeinde
  V("gv", "Gemeinde", "Gemeindeversammlung", "Datum Gemeindeversammlung",
    "Vorbereitung, Durchführung und Nachbereitung einer Gemeindeversammlung der Schulgemeinde nach Gemeindegesetz und Checkliste des Gemeindeamts.",
    [F.bez("Bezeichnung (z. B. Budgetversammlung 2027)"), F.wahl("art", "Art", ["Budget", "Jahresrechnung", "Sachgeschäft"]), F.datum("Datum Gemeindeversammlung")], [
      ["Geschäfte festlegen, Anträge der Schulbehörde beschliessen", "SPF", -70, bes("Schulpflege"), "GG § 18 Abs. 1 (Gemeindevorstand beruft ein)"],
      ["Vorlagen der RPK zur Prüfung überweisen", "SV", -63, mit("RPK", "Prüfung: {person}"), "GG § 59 (RPK prüft Budget, Jahresrechnung, Anträge); Leitfaden RGPK", { i: ["RPK"] }],
      ["Antrag (Abschied) der RPK einholen", "RPK", -35, anf("RPK", "Abschied RPK zu {person}"), "GG § 59; Checkliste GV (RPK-Abschiede gehören zu den Akten)"],
      ["Ankündigung im amtlichen Publikationsorgan (mind. 4 Wochen)", "SV", -28, pub("Ankündigung {person} am {stichtag} mit Geschäften und Hinweis Anfragerecht"), "GG § 18 Abs. 2 (mind. vier Wochen, dringend zwei Wochen); Checkliste GV", { nach: [1] }],
      ["Akten auflegen (bei Budget/Rechnung auch elektronisch)", "SV", -28, a("core.akten.auflegen", { geschaeft: "{person}", ort: "Schulverwaltung und Website" }), "Checkliste GV (Aktenauflage, elektronische Veröffentlichung)", { nach: [3] }],
      ["Beleuchtender Bericht zustellen (mind. 2 Wochen)", "SV", -14, mit("Stimmberechtigte", "Beleuchtender Bericht {person}"), "GG § 19 Abs. 2 (mind. zwei Wochen oder Hinweis auf Auflage)", { nach: [4] }],
      ["Eingangsfrist Anfragen (10 Arbeitstage vorher)", "SPr", -14, null, "GG § 17 (Anfragerecht, 10 Arbeitstage)", { nach: [4] }],
      ["Anfragen schriftlich beantworten (spätestens 1 Tag vorher)", "SPF", -1, mit("Anfragende", "Antwort auf Anfrage"), "GG § 17; Checkliste GV (Veröffentlichung der Antwort empfohlen)"],
      ["Organisation (Raum, Technik, Stimmzettel, Urne)", "SV", -3, term("Gemeindeversammlung {person}", "Präsidium, Verwaltung"), "Checkliste GV (Organisation)", { nach: [4] }],
      ["Gemeindeversammlung durchführen", "SPr", 0, null, "Leitfaden GV; Checkliste GV (Eröffnung, Stimmenzählende, Abstimmungen)", { nach: [6, 8, 9] }],
      ["Protokoll erstellen und abnehmen", "SV", 7, bes("Gemeindeversammlung"), "GG § 6 (Mindestinhalt Protokoll); Checkliste GV"],
      ["Beschlüsse mit Rechtsmittelbelehrung publizieren", "SV", 7, pub("Beschlüsse {person} mit Rechtsmittelbelehrung"), "Checkliste GV (Publikation; Rekurs 5 Tage Stimmrecht, 30 Tage übrige)", { nach: [10] }],
      ["Rekursfrist abwarten, Rechtskraft feststellen", "SV", 37, null, "Checkliste GV (Rekurs beim Bezirksrat 30 Tage)"],
    ]);

  // ------------------------------------------------------------ Schulbehörde
  V("sb", "Schulbehörde", "Ordentliche Schulbehördensitzung", "Sitzungsdatum",
    "Sitzung der Schulpflege: Traktandenliste, Unterlagen, Beschlussfassung, Protokoll und Information.",
    [F.bez("Sitzung (z. B. Schulpflege Dezember)"), F.datum("Sitzungsdatum")], [
      ["Geschäfte sammeln, Traktandenliste entwerfen", "SV", -14, ges("Schulpflege"), "Geschäftsordnung der Schulpflege (ZU PRÜFEN); FD 1.1.2"],
      ["Traktandenliste mit dem Präsidium bereinigen", "SPr", -10, null, "Geschäftsordnung der Schulpflege (ZU PRÜFEN)"],
      ["Einladung und Unterlagen versenden", "SV", -7, a("core.traktandenliste.versenden", { sitzung: "{person}", an: "Schulpflege" }), "Geschäftsordnung (Versandfrist ZU PRÜFEN)"],
      ["Sitzung durchführen (beschlussfähig mit Mehrheit)", "SPr", 0, term("{person}", "Schulpflege"), "GG § 39 (Mehrheit anwesend, Kollegialbehörde); GG § 40 (offene Abstimmung, Stichentscheid)"],
      ["Protokoll erstellen", "SV", 5, bes("Schulpflege"), "GG § 6 (Protokoll mit Beschlüssen)"],
      ["Beschlüsse eröffnen und Umsetzung auslösen", "SV", 7, mit("Betroffene", "Beschlüsse {person}"), "GG § 6; Rechtsmittelbelehrung bei Verfügungen (VRG, ZU PRÜFEN)", { nach: [5] }],
      ["Protokoll genehmigen", "SPF", 14, null, "Geschäftsordnung der Schulpflege (ZU PRÜFEN)", { nach: [5] }],
      ["Öffentlichkeit informieren (Beschlüsse von allgemeinem Interesse)", "SPr", 10, pub("Mitteilungen aus der Schulpflege: {person}"), "FD 1.1.10 (Öffentlichkeitsarbeit); Informationspflicht IDG (ZU PRÜFEN)", { nach: [5] }],
    ]);
  V("ag", "Schulbehörde", "Antrag / Geschäft an die Schulbehörde", "Sitzung der Schulbehörde",
    "Vom Antrag der vorbereitenden Stelle (V im Funktionendiagramm) bis zum Beschluss und zur Eröffnung.",
    [F.bez("Geschäft"), F.zahl("betrag", "Kosten in CHF (0 = keine)"), F.datum("Sitzung der Schulbehörde")], [
      ["Antrag verfassen (Ausgangslage, Erwägungen, Antrag, Kosten)", "SL", -21, ges("Schulpflege"), "FD (Legende: V = operativer Lead, Vorbereitung Entscheid/Antrag)"],
      ["Mitwirkung einholen (M laut Funktionendiagramm)", "SL", -18, mit("Mitwirkende", "Vernehmlassung {person}"), "FD (Legende: M = Mitwirkung, Vernehmlassung, Anhörung)"],
      ["Finanzierung prüfen (Budget-, Verpflichtungskredit)", "SV", -16, a("finance.kredit.pruefen", { vorhaben: "{person}", betrag: "{betrag}" }), "GG §§ 103–105 (Ausgabenbewilligung); GG § 115 (Nachtragskredit)", { nach: [1], b: { feld: "betrag", op: ">", wert: "0" } }],
      ["Antrag beim Ressort / Präsidium einreichen", "SL", -14, mit("RV", "Antrag {person}"), "Geschäftsordnung (Eingabefrist ZU PRÜFEN)", { nach: [2, 3] }],
      ["Traktandieren", "SPr", -10, null, "Geschäftsordnung der Schulpflege (ZU PRÜFEN)"],
      ["Beschluss der Schulbehörde", "SPF", 0, bes("Schulpflege"), "GG §§ 39–40"],
      ["Beschluss eröffnen, Informierte benachrichtigen", "SV", 3, mit("Antragsteller und Informierte (I)", "Beschluss {person}"), "GG § 6; FD (Legende: I = wird informiert)"],
    ]);
  V("zb", "Schulbehörde", "Zirkularbeschluss", "Antwortfrist",
    "Beschluss auf dem Zirkularweg – nur in Ausnahmefällen.",
    [F.bez("Geschäft"), F.datum("Antwortfrist")], [
      ["Ausnahmefall begründen", "SPr", -7, null, "GG § 39 (Zirkularweg nur in Ausnahmefällen)"],
      ["Antrag mit Unterlagen an alle Mitglieder senden", "SV", -7, a("core.zirkular.versenden", { geschaeft: "{person}", an: "Mitglieder Schulpflege" }), "GG § 39"],
      ["Stimmen bis Fristablauf einholen", "SV", 0, null, "Geschäftsordnung (Einstimmigkeit bzw. Verlangen einer Sitzung ZU PRÜFEN)"],
      ["Ergebnis feststellen und protokollieren", "SV", 1, bes("Schulpflege (Zirkular)"), "GG § 6; GG § 40 (Stichentscheid)"],
      ["Beschluss mitteilen", "SV", 2, mit("Betroffene", "Zirkularbeschluss {person}"), "GG § 6"],
      ["Kenntnisnahme an der nächsten Sitzung", "SPF", 14, null, "Geschäftsordnung (ZU PRÜFEN)", { nach: [4] }],
    ]);
  V("pb", "Schulbehörde", "Präsidialbeschluss", "Entscheiddatum",
    "Entscheid des Präsidiums in dringenden Angelegenheiten oder bei Ermächtigung für Geschäfte von geringer Bedeutung.",
    [F.bez("Geschäft"), F.wahl("grund", "Grund", ["dringlich", "Ermächtigung (geringe Bedeutung)"]), F.datum("Entscheiddatum")], [
      ["Dringlichkeit bzw. Ermächtigung prüfen", "SPr", 0, null, "GG § 41 (Präsidialentscheid)"],
      ["Präsidialentscheid fällen und dokumentieren", "SPr", 0, bes("Präsidium"), "GG § 41; GG § 6"],
      ["Entscheid mitteilen", "SV", 1, mit("Betroffene", "Präsidialentscheid {person}"), "GG § 6"],
      ["Behörde informieren", "SPF", 14, mit("SPF", "Information Präsidialentscheid {person}"), "GG § 41 (nachträgliche Information der Behörde)", { nach: [2] }],
    ]);

  // ------------------------------------------------------------ RPK
  V("rpkr", "Rechnungsprüfungskommission", "RPK – Prüfung Jahresrechnung", "Gemeindeversammlung (Rechnung)",
    "Prüfung der Jahresrechnung durch die RPK; Genehmigung innert sechs Monaten nach Ablauf des Rechnungsjahres.",
    [F.bez("Jahresrechnung (z. B. 2026)"), F.datum("Gemeindeversammlung (Rechnung)")], [
      ["Jahresrechnung der RPK und der finanztechnischen Prüfstelle übergeben", "SV", -70, mit("RPK", "Jahresrechnung {person}"), "GG § 59; Leitfaden RGPK", { i: ["RPK"] }],
      ["Prüfung durch die RPK (rechnerisch, finanziell, sachlich angemessen)", "RPK", -45, null, "GG §§ 58–59 (Prüfungsumfang)"],
      ["Bericht der finanztechnischen Prüfung einholen", "RPK", -45, anf("Prüfstelle", "Prüfungsbericht {person}"), "VGG § 39 (Prüfungsurteil, ZU PRÜFEN)", { nach: [1] }],
      ["Rückfragen an Schulverwaltung und Ressort klären", "SV", -40, null, "Leitfaden RGPK", { nach: [2] }],
      ["Abschied / Antrag der RPK verabschieden", "RPK", -30, anf("RPK", "Abschied RPK {person}"), "GG § 59; Checkliste GV (RPK-Abschiede zu den Akten)", { nach: [3, 4] }],
      ["Genehmigung durch die Gemeindeversammlung", "GV", 0, null, "GG § 128 (Genehmigung innert sechs Monaten)"],
      ["Jahresrechnung beim Bezirksrat einreichen", "SV", 14, meld("Bezirksrat", "Jahresrechnung {person}"), "GG § 128 (Einreichung beim Bezirksrat)"],
    ]);
  V("rpkb", "Rechnungsprüfungskommission", "RPK – Prüfung Budget", "Budgetversammlung",
    "Prüfung des Budgets und Antrag der RPK; Beschluss von Budget und Steuerfuss bis spätestens Ende Jahr.",
    [F.bez("Budget (z. B. 2027)"), F.datum("Budgetversammlung")], [
      ["Budget mit Finanz- und Aufgabenplan der RPK überweisen", "SV", -70, mit("RPK", "Budget {person} mit Finanz- und Aufgabenplan"), "GG § 59; GG §§ 95–96 (Finanz- und Aufgabenplan mit dem Budget)", { i: ["RPK"] }],
      ["Prüfung durch die RPK", "RPK", -42, null, "GG §§ 58–59"],
      ["Korrekturen vor erneuter Auflage mitteilen", "SV", -40, mit("RPK", "Korrekturen Budget {person}"), "Merkblatt Budget (Ziff. 1.2: RPK über Fehler informieren)"],
      ["Antrag der RPK zum Budget", "RPK", -30, anf("RPK", "Antrag RPK Budget {person}"), "Merkblatt Budget (Ziff. 1.1c: Antrag gehört zu den Unterlagen)"],
      ["Beschluss Budget und Steuerfuss (getrennt, zuerst Budget)", "GV", 0, null, "GG § 101 (spätestens Ende Jahr); Merkblatt Budget (Ziff. 2.4)"],
      ["Beschluss inkl. Budget publizieren", "SV", 7, pub("Beschluss Budget {person}"), "Merkblatt Budget (Ziff. 3.2b)"],
    ]);

  // ------------------------------------------------------------ Schulleitungskonferenz
  V("slk", "Schulleitung", "Schulleitungskonferenz – Sitzung", "Sitzungsdatum",
    "Sitzung der Schulleitungskonferenz mit Pendenzen und Anträgen an die Schulbehörde.",
    [F.bez("Sitzung"), F.datum("Sitzungsdatum")], [
      ["Traktanden sammeln", "SL", -10, ges("Schulleitungskonferenz"), "Organisationsstatut, FD 1.1.2; Geschäftsordnung SLK (intern, ZU PRÜFEN)"],
      ["Einladung und Unterlagen versenden", "SL", -5, a("core.traktandenliste.versenden", { sitzung: "{person}", an: "Schulleitungen" }), "Geschäftsordnung SLK (ZU PRÜFEN)"],
      ["Sitzung durchführen", "SL", 0, term("{person}", "Schulleitungen, Schulverwaltung"), "Geschäftsordnung SLK (ZU PRÜFEN)"],
      ["Protokoll und Pendenzenliste", "SV", 3, bes("Schulleitungskonferenz"), "GG § 6 sinngemäss (Protokoll)"],
      ["Anträge an die Schulbehörde weiterleiten", "SL", 5, mit("SPF", "Anträge aus {person}"), "FD (Legende: V bereitet Entscheid von E vor)"],
      ["Information an die Teams (Wocheninfo)", "SL", 5, mit("Teams", "Wocheninfo: {person}"), "Prozessliste (Wocheninfo); FD 5.1.2", { nach: [4] }],
    ]);

  // ------------------------------------------------------------ Finanzen
  V("budget", "Finanzen", "Budget erstellen", "Budgetversammlung",
    "Von den Budgetvorgaben über die Eingaben der Schulen bis zum Beschluss von Budget und Steuerfuss.",
    [F.bez("Budgetjahr (z. B. Budget 2027)"), F.datum("Budgetversammlung")], [
      ["Budgetvorgaben festlegen", "SPF", -180, bes("Schulpflege"), "FD 2.2 (SPF E1, RV V); GG § 101"],
      ["Budgeteingaben einholen (Schulen, ICT, Liegenschaften)", "SV", -150, mit("SL, ICT, HD", "Budgeteingaben {person}"), "FD 2.2 (SL M, HD M); Jahresplanung ICT Q2; Master-Checkliste (Budget-Eingaben bis 30.6.)"],
      ["Budgetentwurf erfassen", "SV", -120, a("finance.budget.erfassen", { jahr: "{person}" }), "VGG § 13 (Vergleich mit Vorjahresbudget und letzter Rechnung)"],
      ["Finanz- und Aufgabenplan nachführen (mind. 4 Jahre)", "SV", -110, null, "GG §§ 95–96; FD 2.1"],
      ["Antrag des Ressorts Finanzen", "RV", -100, ges("Schulpflege"), "FD 2.2 (RV V)", { nach: [3, 4] }],
      ["Budget zuhanden RPK bzw. Gemeinderat verabschieden", "SPF", -90, bes("Schulpflege"), "FD 2.2 (SPF E1); Merkblatt Budget (Ziff. 4.2b Einheitsgemeinde)"],
      ["Prüfung durch die RPK (Ablauf «RPK – Prüfung Budget»)", "RPK", -30, anf("RPK", "Antrag RPK {person}"), "GG § 59"],
      ["Beschluss Budget und Steuerfuss", "GV", 0, null, "GG § 101 (spätestens Ende Jahr; sonst Notbudget, Merkblatt Budget Ziff. 2.5); FD 2.2 (E2)"],
      ["Budget übernehmen, Änderungen nachführen, Kredite freigeben", "SV", 10, a("finance.budget.erfassen", { jahr: "{person} (beschlossen)" }), "Merkblatt Budget (Ziff. 3.2a: Änderungen ins Budget übernehmen)"],
    ]);
  V("rechnung", "Finanzen", "Jahresrechnung erstellen", "Genehmigung Jahresrechnung",
    "Abschluss des Rechnungsjahres bis zur Genehmigung (innert sechs Monaten) und Einreichung beim Bezirksrat.",
    [F.bez("Rechnungsjahr (z. B. 2026)"), F.datum("Genehmigung Jahresrechnung")], [
      ["Abschlussbuchungen und Abgrenzungen", "SV", -150, a("finance.rechnung.abschliessen", { jahr: "{person}" }), "GG § 128 (Gemeindevorstand erstellt die Jahresrechnung)"],
      ["Anlagenbuchhaltung und Abschreibungen", "SV", -140, null, "VGG § 21 (Aktivierung); GG §§ 99, 125"],
      ["Kreditabrechnungen erstellen", "SV", -130, null, "GG §§ 106–108 (Verpflichtungs- und Zusatzkredite)"],
      ["Kommentare der Schulen zu Abweichungen", "SL", -120, anf("Schulleitungen", "Kommentare Abweichungen {person}"), "FD 2.2 (SL M); FD 2.3 (Budgetkontrolle)", { nach: [1] }],
      ["Jahresrechnung durch die Schulbehörde verabschieden", "SPF", -90, bes("Schulpflege"), "GG § 128 Abs. 1", { nach: [2, 3, 4] }],
      ["Finanztechnische Prüfung und RPK (Ablauf «RPK – Prüfung Jahresrechnung»)", "RPK", -30, anf("RPK", "Abschied RPK {person}"), "GG § 59; VGG § 39 (ZU PRÜFEN)"],
      ["Genehmigung durch die Gemeindeversammlung", "GV", 0, null, "GG § 128 (innert sechs Monaten nach Ablauf des Rechnungsjahres)"],
      ["Beim Bezirksrat einreichen", "SV", 14, meld("Bezirksrat", "Jahresrechnung {person}"), "GG § 128"],
    ]);
  V("invest", "Finanzen", "Investition buchen", "Inbetriebnahme",
    "Investition im Verwaltungsvermögen: Kredit, Aktivierungsgrenze, Buchung, Aktivierung und Kreditabrechnung.",
    [F.bez("Projekt"), F.zahl("betrag", "Gesamtkosten in CHF"), F.datum("Inbetriebnahme")], [
      ["Neue oder gebundene Ausgabe? Kreditart prüfen", "SV", -60, a("finance.kredit.pruefen", { vorhaben: "{person}", betrag: "{betrag}" }), "GG §§ 103–105"],
      ["Aktivierungsgrenze prüfen (Gemeindevorstand, höchstens CHF 50'000)", "SV", -60, null, "VGG § 21 (Aktivierungsgrenze); VGG § 20", { nach: [] }],
      ["Verpflichtungskredit beim zuständigen Organ beschliessen", "SPF", -45, bes("Zuständiges Organ gemäss Gemeindeordnung"), "GG §§ 106–107; Gemeindeordnung (Finanzkompetenzen, ZU PRÜFEN)", { nach: [1, 2], b: { feld: "betrag", op: ">", wert: "50000" } }],
      ["Budgetkredit vorhanden? Sonst Nachtragskredit", "SV", -40, null, "GG §§ 104, 115", { nach: [1, 2] }],
      ["Ausgaben in der Investitionsrechnung buchen", "SV", 0, a("finance.investition.buchen", { projekt: "{person}", betrag: "{betrag}" }), "GG §§ 99, 125; VGG § 20", { nach: [3, 4] }],
      ["Anlage aktivieren, Abschreibung ab Nutzung", "SV", 7, null, "VGG § 21"],
      ["Kreditabrechnung nach Abschluss", "SV", 90, null, "GG §§ 106–108; Merkblatt Budget (Ziff. 3.3b: Überschreitungen erläutern)"],
    ]);

  // ------------------------------------------------------------ Lernende
  const STUFE = ["Kindergarten", "Primarstufe", "Sekundarstufe"];
  V("le", "Lernende", "Lernende – Eintritt", "Eintrittsdatum",
    "Eintritt einer Schülerin oder eines Schülers (Zuzug, Schulwechsel, Einschulung).",
    [F.name("Name Lernende/r"), F.wahl("stufe", "Stufe", STUFE), F.text("klasse", "Klasse (falls bekannt)"), F.datum("Eintrittsdatum")], [
      ["Anmeldung und Unterlagen entgegennehmen", "SV", -14, anf("{person}", "Anmeldung, Zeugnisse, Angaben Erziehungsberechtigte"), "VSG § 3 (Recht auf Schulbesuch, Schulpflicht)"],
      ["Schulort prüfen (Wohnort)", "SV", -12, null, "VSV § 8 (Schulort in der Regel in der Wohngemeinde)"],
      ["Klasse zuteilen", "SL", -10, null, "FD 4.4.1 (SL E, SV V)", { fd: "4.4.1" }],
      ["Lernende erfassen", "SV", -7, a("core.lernende.erfassen", { person: "{person}", klasse: "{klasse}", ab: "{stichtag}" }), "FD 4.4.1 (SV V); Jahreskalender ICT (Schülereinteilung, Import)", { auto: true, fd: "4.4.1" }],
      ["Konten bereitstellen (Lernplattform, Office-Konto)", "ICT", -3, a("connect.zugang.verteilen", { konto: "{person}", ziel: "Lernplattform, Office-Konto" }), "Jahresplanung ICT Q3 (On-/Offboarding neue SuS)", { auto: true, b: { feld: "stufe", op: "≠", wert: "Kindergarten" } }],
      ["Klassenlehrperson und Erziehungsberechtigte informieren", "SL", -3, mit("Klassenlehrperson, Erziehungsberechtigte", "Eintritt {person} ab {stichtag}"), "FD 4.4.1 (I)", { nach: [4] }],
      ["Nutzungsvereinbarung SuS unterzeichnen", "ELT", 0, uz("{person}", "Nutzungsvereinbarung SuS"), "Jahresplanung ICT Q1 (Nutzungsvereinbarung SuS); Jahreskalender ICT KW 27", { nach: [5], b: { feld: "stufe", op: "≠", wert: "Kindergarten" } }],
      ["Gerät und Lehrmittel abgeben", "ICT", 0, a("shop.ausgabe.erfassen", { person: "{person}", gegenstand: "Gerät, Lehrmittel" }), "Jahreskalender ICT (Klassensätze, Geräteabgabe)", { b: { feld: "stufe", op: "≠", wert: "Kindergarten" } }],
    ]);
  V("la", "Lernende", "Lernende – Austritt", "Austrittsdatum",
    "Austritt bei Wegzug, Schulwechsel oder Ende der Schulpflicht.",
    [F.name("Name Lernende/r"), F.wahl("grund", "Grund", ["Wegzug", "Schulwechsel", "Ende Schulpflicht"]), F.datum("Austrittsdatum")], [
      ["Abmeldung erfassen", "SV", -14, a("core.lernende.austreten", { person: "{person}", per: "{stichtag}" }), "VSG § 3 (Schulpflicht: Weiterbeschulung sicherstellen, ZU PRÜFEN)"],
      ["Klassenlehrperson informieren", "SV", -12, mit("Klassenlehrperson", "Austritt {person} per {stichtag}"), "FD 4.4.1 (I)"],
      ["Zeugnis bzw. Schullaufbahn abschliessen", "LP", -5, null, "FD 6.1.4 (Zeugnisse: LP E1/V, SL E2)"],
      ["Gerät und Lehrmittel zurücknehmen bzw. Kauf abwickeln", "ICT", 0, a("shop.rueckgabe.erfassen", { person: "{person}", gegenstand: "Gerät, Lehrmittel" }), "Jahreskalender ICT (Offboarding SuS: Rückgabe/Kauf)", { nach: [1] }],
      ["Konten deaktivieren", "ICT", 1, a("connect.zugang.entfernen", { konto: "{person}", ziel: "alle" }), "Master-Checkliste (Zugänge löschen); Jahresplanung ICT Q3", { auto: true }],
      ["Schülerakten weitergeben bzw. archivieren", "SV", 5, a("core.dossier.abschliessen", { person: "{person}", per: "{stichtag}" }), "Archiv- und Datenschutzrecht (Aufbewahrung ZU PRÜFEN)", { nach: [3] }],
    ]);
  V("lmp", "Lernende", "Lernende – Mutation Personenangaben", "Gültig ab",
    "Änderung von Name, Adresse oder Angaben der Erziehungsberechtigten.",
    [F.name("Name Lernende/r"), F.wahl("art", "Änderung", ["Adresse", "Name", "Erziehungsberechtigte", "Sorgerecht"]), F.datum("Gültig ab")], [
      ["Änderung entgegennehmen", "SV", 0, a("core.lernende.mutieren", { person: "{person}", aenderung: "{art}", ab: "{stichtag}" }), "Prozessliste (Mutationen); Datenschutz: richtige und vollständige Daten (IDG, ZU PRÜFEN)"],
      ["Belege prüfen (z. B. Sorgerecht)", "SV", 0, null, "ZU PRÜFEN (Zivilrecht, Entscheid KESB)", { nach: [], b: { feld: "art", op: "in", wert: "Erziehungsberechtigte, Sorgerecht" } }],
      ["Zielsysteme abgleichen (Schuladministration, Eltern-App)", "ICT", 1, a("connect.daten.abgleichen", { konto: "{person}" }), "Jahreskalender ICT (Datenabgleich)", { auto: true, nach: [1, 2] }],
      ["Klassenlehrperson informieren", "SV", 1, mit("Klassenlehrperson", "Mutation {art}: {person}"), "FD 4.4.1 (I)", { nach: [1] }],
    ]);
  V("lmu", "Lernende", "Lernende – Mutation Ein- und Umteilung", "Wechsel ab",
    "Umstufung oder Klassenwechsel mit Anhörung und Entscheid.",
    [F.name("Name Lernende/r"), F.wahl("art", "Art", ["Umstufung", "Klassenwechsel"]), F.datum("Wechsel ab")], [
      ["Anlass festhalten (Antrag Lehrperson oder Eltern)", "LP", -21, ges("Schulleitung"), "FD 6.1.2 (LP V)"],
      ["Erziehungsberechtigte anhören", "LP", -14, term("Gespräch {person}", "Erziehungsberechtigte, Lehrperson"), "FD 6.1.2; Jahreskalender ICT (offizielle Umstufungstermine KW 8, 16, 45)"],
      ["Entscheid der Schulleitung", "SL", -10, bes("Schulleitung"), "FD 6.1.2 (SL E); FD 4.4.1", { fd: "6.1.2" }],
      ["Umteilung erfassen", "SV", -5, a("core.lernende.mutieren", { person: "{person}", aenderung: "{art}", ab: "{stichtag}" }), "FD 4.4.1 (SV V)", { fd: "4.4.1" }],
      ["Erziehungsberechtigte und Lehrpersonen informieren", "SL", -3, mit("Erziehungsberechtigte, bisherige und neue Lehrperson", "{art} {person} ab {stichtag}"), "FD 6.1.2 (SV I)", { nach: [3] }],
      ["Zielsysteme und Lizenzen anpassen", "ICT", 0, a("connect.daten.abgleichen", { konto: "{person}" }), "Jahreskalender ICT (Lizenzen, Klassen)", { auto: true, nach: [4] }],
    ]);
  V("zahn", "Lernende", "Zahnarztgutscheine", "Versand Gutscheine",
    "Jährliche obligatorische schulzahnärztliche Untersuchung mit Gutschein «Zürcher Schulzahnuntersuchung».",
    [F.bez("Schuljahr (z. B. 2026/27)"), F.datum("Versand Gutscheine")], [
      ["Klassenlisten und Adressen bereitstellen", "SV", -14, null, "VSVZ § 7 (jährliche obligatorische Untersuchung); GesG § 51"],
      ["Gutscheine erstellen", "SV", -7, a("core.dokument.erstellen", { vorlage: "Gutschein Zürcher Schulzahnuntersuchung", fuer: "alle Lernenden" }), "GesG (Gutschein «Zürcher Schulzahnuntersuchung», Gesundheitsdirektion)"],
      ["Gutscheine an Erziehungsberechtigte versenden", "SV", 0, mit("Erziehungsberechtigte", "Gutschein Schulzahnuntersuchung {person}"), "GesG (Merkblatt für Eltern)"],
      ["Rücklauf und Untersuchungen überwachen", "SV", 90, null, "VSVZ § 7 (Untersuchung obligatorisch)"],
      ["Erinnerung bei fehlender Untersuchung", "SV", 100, mit("Erziehungsberechtigte", "Erinnerung Schulzahnuntersuchung"), "VSVZ § 7"],
      ["Rechnungen der Zahnärztinnen und Zahnärzte prüfen und bezahlen", "SV", 120, null, "VSVZ (Gemeinden tragen die Kosten der Untersuchung)", { nach: [4] }],
    ]);
  V("arzt", "Lernende", "Arztgutscheine (schulärztliche Untersuchung)", "Versand Gutscheine",
    "Schulärztliche Untersuchungen im Kindergarten, in der 5. Primarklasse und in der 2. Sekundarklasse.",
    [F.bez("Schuljahr"), F.wahl("stufe", "Stufe", ["Kindergarten", "5. Primarklasse", "2. Sekundarklasse"]), F.datum("Versand Gutscheine")], [
      ["Betroffene Klassen bestimmen", "SV", -14, null, "VSG § 50 (ärztliche Überwachung der Gesundheit); VSA Schularzt (Untersuchungen Kindergarten, 5. Primar, 2. Sek)"],
      ["Gutscheine und Untersuchungskarten erstellen", "SV", -7, a("core.dokument.erstellen", { vorlage: "Gutschein schulärztliche Untersuchung ({stufe})", fuer: "Klassen {stufe}" }), "VSV (Untersuchungskarte des schulärztlichen Dienstes, § ZU PRÜFEN)"],
      ["An Erziehungsberechtigte versenden", "SV", 0, mit("Erziehungsberechtigte", "Gutschein schulärztliche Untersuchung"), "VSA Schularzt"],
      ["Rücklauf überwachen", "SV", 60, null, "VSA Schularzt"],
      ["Abrechnung mit Schulärztin/Schularzt", "SV", 90, null, "VSA Schularzt (Vertrag der Schulgemeinde mit Schulärztinnen und -ärzten)"],
    ]);

  // ------------------------------------------------------------ Personal
  const PERS = [F.name(), F.wahl("funktion", "Funktion", D.FUNKTIONEN), F.zahl("pensum", "Pensum in %")];
  V("pek", "Personal", "Anstellung kantonal – Eintritt", "Eintritt",
    "Anstellung einer Lehrperson oder Schulleitung (kantonales Arbeitsverhältnis, Lohn über das Volksschulamt).",
    PERS.concat([F.wahl("diplom", "Lehrdiplom vorhanden", ["ja", "nein"]), F.datum("Eintritt")]), [
      ["Stelle im Stellenplan bewilligt?", "SL", -150, null, "LPG § 3 Abs. 2 (Stellenplan); VSA Stellen (Eingabe Stellenplan 1. März)"],
      ["Stelle ausschreiben", "SL", -120, pub("Stellenausschreibung {funktion} {pensum} %"), "LPG § 2 i. V. m. VVO § 11 (Ausschreibung)"],
      ["Anstellungsentscheid", "SL", -90, bes("Schulleitung"), "LPG § 7 Abs. 1; FD 5.2.2 (SL E/V)", { fd: "5.2.2", i: ["SPF", "SV"] }],
      ["Provisorische Zulassung beim VSA beantragen (ohne Lehrdiplom)", "SV", -85, meld("VSA", "Antrag provisorische Zulassung {person}"), "LPG § 7 Abs. 2 und 4; VSA Stellensituation", { b: { feld: "diplom", op: "=", wert: "nein" } }],
      ["Sonderprivatauszug einholen", "SV", -80, anf("{person}", "Sonderprivatauszug"), "Prozessliste (Strafregister-Auszug); LPG § 11 a", { nach: [3] }],
      ["Anstellung erfassen und dem VSA melden", "SV", -60, meld("VSA", "Anstellung {person}, {funktion}, {pensum} %"), "LPVO § 4 (Meldepflicht, Formulare VSA); VSA Beginn (Lebenslauf-Formular)", { nach: [4, 5] }],
      ["Anstellungsverfügung erhalten", "VSA", -30, a("staffing.verfuegung.erstellen", { person: "{person}", pensum: "{pensum}", ab: "{stichtag}" }), "VVO § 13; VSA Beginn (anstellungsrechtliches Schuljahr 1.8.–31.7.)"],
      ["Onboarding auslösen (Ablauf «Onboarding Mitarbeitende»)", "SV", -30, null, "Prozessliste (Onboarding)"],
      ["Probezeitgespräch vor Ablauf der 5 Monate", "SL", 140, term("Probezeitgespräch {person}", "{person}, Schulleitung"), "LPG § 7 a (Probezeit 5 Monate, Kündigung 7 Tage auf den letzten Schultag vor Ferien)"],
    ]);
  V("pekm", "Personal", "Anstellung kommunal – Eintritt", "Eintritt",
    "Anstellung von kommunalem Personal (z. B. Schulverwaltung, Hausdienst, Assistenz, Betreuung).",
    PERS.concat([F.datum("Eintritt")]), [
      ["Stelle im kommunalen Stellenplan und Budget?", "SV", -120, null, "FD 1.2.6 (Stellenplan kommunal); GG §§ 103–105"],
      ["Stelle ausschreiben", "SV", -100, pub("Stellenausschreibung {funktion} {pensum} %"), "Personalverordnung der Gemeinde (ZU PRÜFEN); VVO § 11 sinngemäss"],
      ["Anstellungsentscheid gemäss Funktionendiagramm", "SPF", -60, bes("Anstellungsbehörde gemäss FD"), "FD 5.2.4–5.2.6 (je nach Funktion)", { i: ["SV"] }],
      ["Anstellungsverfügung bzw. Vertrag erstellen", "SV", -45, a("staffing.verfuegung.erstellen", { person: "{person}", pensum: "{pensum}", ab: "{stichtag}" }), "Personalverordnung der Gemeinde (ZU PRÜFEN); VVO § 13 sinngemäss"],
      ["Sozialversicherungen anmelden (AHV, Pensionskasse, UVG, KTG)", "SV", -14, meld("Sozialversicherungen", "Anmeldung {person}"), "UVG (Versicherungspflicht); Anschlussverträge der Gemeinde (ZU PRÜFEN)"],
      ["Personaldossier eröffnen", "SV", -14, a("core.dossier.eroeffnen", { person: "{person}", funktion: "{funktion}", ab: "{stichtag}" }), "VVO § 21 sinngemäss (Personaldossier)", { nach: [4] }],
      ["Onboarding auslösen", "SV", -14, null, "Prozessliste (Onboarding)", { nach: [4] }],
      ["Probezeitgespräch (Probezeit 3 Monate)", "SL", 80, term("Probezeitgespräch {person}", "{person}, vorgesetzte Stelle"), "PG § 14 (Probezeit 3 Monate, Kündigungsfrist 7 Tage) bzw. Personalverordnung der Gemeinde"],
    ]);
  V("pak", "Personal", "Anstellung kantonal – Austritt", "Austritt",
    "Beendigung bei Lehrpersonen auf das Ende des anstellungsrechtlichen Schuljahres (31. Juli), Kündigungsfrist vier Monate.",
    [F.name(), F.wahl("funktion", "Funktion", D.FUNKTIONEN), F.wahl("durch", "Kündigung durch", ["Lehrperson", "Schulpflege", "gegenseitiges Einvernehmen"]), F.datum("Austritt")], [
      ["Kündigung schriftlich entgegennehmen bzw. rechtliches Gehör gewähren", "SL", -125, anf("{person}", "Kündigung (schriftlich)"), "LPG § 8 (vier Monate auf Ende Schuljahr); VSA Beendigung"],
      ["Entscheid bzw. Kenntnisnahme Schulpflege", "SPF", -122, bes("Schulpflege"), "LPG § 8 Abs. 1 (Schulpflege zuständig); FD 5.2.3", { fd: "5.2.3" }],
      ["Austritt erfassen und dem VSA melden", "SV", -115, meld("VSA", "Austritt {person} per {stichtag}"), "LPVO § 4; VSA Beendigung (Schulverwaltung erfasst Austritt)"],
      ["Offboarding auslösen (Ablauf «Offboarding Mitarbeitende»)", "SV", -45, null, "Prozessliste (Offboarding)"],
      ["Austrittsgespräch", "SL", -20, term("Austrittsgespräch {person}", "{person}, Schulleitung"), "VVO § 139 Abs. 1", { nach: [2] }],
      ["Arbeitszeugnis ausstellen", "SL", -5, uz("SL", "Arbeitszeugnis {person}"), "VVO § 139 Abs. 2; FD 5.4.8"],
      ["Personaldossier abschliessen", "SV", 30, a("core.dossier.abschliessen", { person: "{person}", per: "{stichtag}" }), "VVO §§ 21–25 (Personaldossier, Aufbewahrung)"],
    ]);
  V("pakm", "Personal", "Anstellung kommunal – Austritt", "Austritt",
    "Beendigung eines kommunalen Arbeitsverhältnisses (Kündigungsfristen nach Personalverordnung der Gemeinde bzw. PG).",
    [F.name(), F.wahl("funktion", "Funktion", D.FUNKTIONEN), F.datum("Austritt")], [
      ["Kündigung entgegennehmen bzw. aussprechen (rechtliches Gehör)", "SV", -90, anf("{person}", "Kündigung (schriftlich)"), "PG § 17 (Fristen nach Dienstjahr, auf Monatsende; Revision hängig) bzw. Personalverordnung der Gemeinde (ZU PRÜFEN)"],
      ["Entscheid bzw. Kenntnisnahme gemäss Funktionendiagramm", "SPF", -85, bes("Anstellungsbehörde"), "FD 5.2.4–5.2.6"],
      ["Offboarding auslösen", "SV", -30, null, "Prozessliste (Offboarding)"],
      ["Austrittsgespräch", "SL", -14, term("Austrittsgespräch {person}", "{person}, vorgesetzte Stelle"), "VVO § 139 Abs. 1 sinngemäss", { nach: [2] }],
      ["Ferien- und Zeitsaldo abrechnen", "SV", -10, null, "VVO § 83 sinngemäss (Barabgeltung der Ferien nur ausnahmsweise)", { nach: [2] }],
      ["Arbeitszeugnis ausstellen", "SL", -3, uz("SL", "Arbeitszeugnis {person}"), "VVO § 139 Abs. 2 sinngemäss", { nach: [4] }],
      ["Lohn bis Austritt abrechnen, Sozialversicherungen abmelden", "SV", 0, meld("Sozialversicherungen", "Abmeldung {person}"), "VVO § 41 sinngemäss (Lohn bei Austritt)", { nach: [5] }],
      ["Personaldossier abschliessen", "SV", 30, a("core.dossier.abschliessen", { person: "{person}", per: "{stichtag}" }), "VVO §§ 21–25 sinngemäss"],
    ]);
  V("mab", "Personal", "Mitarbeiterbeurteilung", "Beurteilungsgespräch",
    "Jährliche Mitarbeiterbeurteilung mit Beurteilungs- und Förderungsgespräch.",
    [F.name(), F.anst(), F.datum("Beurteilungsgespräch")], [
      ["Beurteilungsinstrument und Termin festlegen", "SL", -30, null, "LPG § 20 Abs. 1 (einheitliche kantonale Instrumente); LPVO § 23 (in der Regel jährlich); VVO § 136 (kommunal sinngemäss)", { fd: "5.4.2" }],
      ["Unterrichtsbesuche bzw. Beobachtungen", "SL", -21, term("Unterrichtsbesuch {person}", "{person}, Schulleitung"), "FD 5.4.2 (SL E/V); FD 5.4.7 (Schulbesuche)"],
      ["Selbstbeurteilung der Mitarbeitenden", "MA", -7, anf("{person}", "Selbstbeurteilung"), "VVO § 136 Abs. 3 (Gegenstand der Beurteilung)", { nach: [1] }],
      ["Beurteilungs- und Förderungsgespräch", "SL", 0, term("Beurteilungsgespräch {person}", "{person}, Schulleitung"), "VVO § 138 Abs. 1", { nach: [2, 3] }],
      ["Stellungnahme, Bestätigung und Kopie", "MA", 7, uz("{person}", "Mitarbeiterbeurteilung"), "VVO § 138 Abs. 2 (Bestätigung, Kopie; Besprechung mit nächsthöherer Stelle nach Abs. 3)"],
      ["Ablage im Personaldossier, allfällige Lohnwirkung", "SV", 14, a("staffing.beurteilung.erfassen", { person: "{person}", schuljahr: "{stichtag}" }), "LPVO § 24 (Lohnerhöhung, Rückstufung); VVO § 22 (Inhalt Personaldossier)"],
    ]);
  V("mag", "Personal", "Mitarbeitergespräch", "Gesprächstermin",
    "Standort- oder Fördergespräch ohne formelle Beurteilung.",
    [F.name(), F.wahl("anlass", "Anlass", ["Standortgespräch", "Zielvereinbarung", "Rückkehrgespräch", "Konfliktgespräch"]), F.datum("Gesprächstermin")], [
      ["Einladen und Thema mitteilen", "SL", -14, term("{anlass} {person}", "{person}, Schulleitung"), "VVO § 136 Abs. 2 (Förderung des Personals)"],
      ["Gesprächsvorlage vorbereiten", "SL", -7, a("core.dokument.erstellen", { vorlage: "Gesprächsleitfaden {anlass}", fuer: "{person}" }), "Interne Vorlage (ZU PRÜFEN)"],
      ["Gespräch führen", "SL", 0, null, "VVO § 138 Abs. 1 sinngemäss"],
      ["Vereinbarungen festhalten und bestätigen lassen", "MA", 3, uz("{person}", "Gesprächsnotiz {anlass}"), "VVO § 138 Abs. 2 sinngemäss"],
      ["Nachkontrolle der Vereinbarungen", "SL", 90, term("Nachkontrolle {person}", "{person}, Schulleitung"), "Interne Vorgabe (ZU PRÜFEN)"],
    ]);
  V("pmp", "Personal", "Mutation Personalangaben", "Gültig ab",
    "Änderung persönlicher Angaben (Name, Zivilstand, Bankverbindung, Aufenthaltsbewilligung, Adresse).",
    [F.name(), F.anst(), F.wahl("art", "Änderung", ["Name", "Zivilstand", "Bankverbindung", "Aufenthaltsbewilligung", "Adresse"]), F.datum("Gültig ab")], [
      ["Meldung der Mitarbeitenden", "MA", 0, anf("{person}", "Meldung {art} mit Beleg"), "VVO § 30 Abs. 1 (Meldepflicht der Angestellten)"],
      ["Weiterleitung durch die vorgesetzte Stelle", "SL", 1, mit("SV", "Mutation {art}: {person}"), "VVO § 30 Abs. 2"],
      ["Meldung an das VSA (ausser Adresse)", "SV", 2, meld("VSA", "Änderung {art} {person}"), "VSA Anpassung (Änderungen persönlicher Angaben; Aufenthaltsbewilligung umgehend); LPVO § 4", { b: kantonal }],
      ["Lohnsystem und Personaldossier anpassen", "SV", 2, a("core.dokument.erstellen", { vorlage: "Mutation {art}", fuer: "{person}" }), "VVO § 22 sinngemäss; Personalverordnung der Gemeinde (ZU PRÜFEN)", { nach: [2], b: kommunal }],
      ["Konten und Zielsysteme anpassen", "ICT", 3, a("ident.konto.aendern", { konto: "{person}", aenderung: "{art}" }), "Prozessliste (Mutationen: Name)", { auto: true, nach: [2], b: { feld: "art", op: "=", wert: "Name" } }],
    ]);
  V("pmpa", "Personal", "Mutation Pensum und Anstellung", "Gültig ab (in der Regel 1.8.)",
    "Änderung des Beschäftigungsgrads oder der Funktion; eine Reduktion durch die Schulpflege ist eine Teilkündigung.",
    [F.name(), F.anst(), F.zahl("pensumAlt", "Pensum bisher in %"), F.zahl("pensum", "Pensum neu in %"), F.datum("Gültig ab (in der Regel 1.8.)")], [
      ["Antrag der Lehrperson bzw. Anlass Schulorganisation festhalten", "SL", -150, ges("Schulleitung"), "VSA Anpassung (Personaleinsatz Schuljahreswechsel)"],
      ["Rechtliches Gehör zur Teilkündigung", "SL", -130, term("Rechtliches Gehör {person}", "{person}, Schulleitung"), "VSA Anpassung (Reduktion = Teilkündigung); LPG § 8 (vier Monate)", { b: { feld: "pensum", op: "<", wert: "{pensumAlt}" } }],
      ["Entscheid", "SPF", -125, bes("Schulpflege bzw. Schulleitung gemäss FD"), "FD 5.2.2 / 5.2.3", { nach: [1, 2] }],
      ["Meldung an das VSA (Lohnwirkung)", "SV", -120, meld("VSA", "Pensumänderung {person}: {pensumAlt} → {pensum} %"), "LPVO § 4", { b: kantonal }],
      ["Kommunal: Verfügung bzw. Vertrag anpassen", "SV", -60, a("staffing.pensum.aendern", { person: "{person}", pensum: "{pensum}", ab: "{stichtag}" }), "Personalverordnung der Gemeinde (ZU PRÜFEN)", { nach: [3], b: kommunal }],
      ["Berufsauftrag bzw. Einsatzplanung anpassen", "SL", -30, a("staffing.berufsauftrag.festlegen", { person: "{person}", pensum: "{pensum}" }), "LPG §§ 18–19 c (Berufsauftrag); FD 5.1.5", { nach: [3] }],
      ["Rollen und Zielsysteme anpassen", "ICT", 0, a("connect.daten.abgleichen", { konto: "{person}" }), "Prozessliste (Mutationen)", { auto: true }],
    ]);
  V("vik", "Personal", "Vikariat – kantonal", "Beginn Absenz",
    "Stellvertretung einer Lehrperson durch eine vom Volksschulamt abgeordnete Vikarin oder einen Vikar.",
    [F.name("Abwesende Lehrperson"), F.text("vikar", "Vikarin/Vikar"), F.wahl("grund", "Grund", ["Krankheit", "Unfall", "Urlaub", "Militär/Zivildienst", "Weiterbildung"]), F.datum("Beginn Absenz")], [
      ["Absenz dem VSA melden (Formular «Meldung einer Absenz»)", "SL", 3, meld("VSA", "Meldung Absenz {person} ({grund})"), "VSA Abwesenheit (ab 4. Tag); LPVO § 30 Abs. 1 (VSA errichtet Vikariate über 3 Tage)"],
      ["Vikarin oder Vikar suchen und vorschlagen", "SL", 1, null, "VSA Vikariat (Organisation zusammen mit der Schule); LPG § 25 Abs. 2 (keine Ausschreibung)", { nach: [] }],
      ["Abordnung durch das VSA", "VSA", 4, a("staffing.verfuegung.erstellen", { person: "{vikar}", pensum: "Vikariat für {person}", ab: "{stichtag}" }), "LPG § 25 Abs. 1; LPVO § 30", { nach: [1, 2] }],
      ["Einführung, Zugänge und Schlüssel", "SL", 4, a("ident.konto.anlegen", { person: "{vikar}", gueltigAb: "{stichtag}" }), "Prozessliste (Onboarding, verkürzt)"],
      ["Ende des Vikariats melden (innert einer Woche)", "MA", 30, meld("VSA", "Ende Vikariat {vikar}, letzter Schultag"), "LPVO § 30 Abs. 3 (Meldung durch Vikar/in mit letztem Schultag)"],
      ["Zugänge entfernen", "ICT", 31, a("ident.konto.sperren", { konto: "{vikar}", ab: "{stichtag+31}", abwesenheitsnotiz: "nein" }), "Prozessliste (Logins entziehen)", { auto: true }],
    ]);
  V("vikm", "Personal", "Vikariat – kommunal", "Beginn Absenz",
    "Kurzvikariat bis drei Tage auf Kosten der Gemeinde bzw. Stellvertretung von kommunalem Personal.",
    [F.name("Abwesende Person"), F.text("vikar", "Stellvertretung"), F.datum("Beginn Absenz")], [
      ["Absenz feststellen, Stellvertretung organisieren", "SL", 0, null, "LPVO § 30 Abs. 2 (Gemeinde kann bis drei Tage auf eigene Kosten ein Vikariat errichten); VSA Vikariat (Kurzvikariat)"],
      ["Einsatz erfassen", "SV", 1, a("staffing.absenz.erfassen", { person: "{person}", grund: "Kurzvikariat {vikar}", ab: "{stichtag}" }), "Personalverordnung der Gemeinde (Entschädigung, ZU PRÜFEN)"],
      ["Bei längerer Absenz: Ablauf «Vikariat – kantonal» auslösen", "SL", 3, null, "LPVO § 30 Abs. 1"],
      ["Einsatz abrechnen", "SV", 30, null, "Personalverordnung der Gemeinde (ZU PRÜFEN)", { nach: [2] }],
    ]);
  V("prov", "Personal", "Anstellung provisorisch (ohne Lehrdiplom)", "Eintritt",
    "Befristete Anstellung mit provisorischer Zulassung zum Schuldienst, wenn der Bedarf nicht gedeckt werden kann.",
    PERS.concat([F.datum("Eintritt")]), [
      ["Bedarf belegen (keine geeignete Bewerbung mit Diplom)", "SL", -60, null, "LPG § 7 Abs. 4; VSA Stellensituation"],
      ["Provisorische befristete Zulassung beim VSA beantragen", "SV", -55, meld("VSA", "Antrag provisorische Zulassung {person}"), "VSA Stellensituation (Gemeinde beantragt Zulassung)"],
      ["Zulassungsentscheid des VSA", "VSA", -30, null, "VSA Stellensituation; LPG § 7 Abs. 4"],
      ["Befristet anstellen (längstens ein Jahr)", "SL", -25, meld("VSA", "Befristete Anstellung {person}"), "LPG § 7 Abs. 4 (längstens ein Jahr); LPVO § 4"],
      ["Auflagen vereinbaren (Begleitung, Ausbildung)", "SL", 0, term("Auflagen {person}", "{person}, Schulleitung"), "VSA Stellensituation (individuelle Auflagen)"],
      ["Ablauf der Befristung überwachen", "SL", 300, term("Ende Befristung {person}", "Schulleitung"), "LPG § 7 Abs. 4"],
    ]);
  V("ubk", "Personal", "Unfall – Bagatellunfall kommunal", "Unfalltag",
    "Unfall mit keiner oder höchstens drei Kalendertagen Arbeitsunfähigkeit (Unfalltag mitgezählt).",
    [F.name(), F.wahl("art", "Art", ["Berufsunfall", "Nichtberufsunfall"]), F.datum("Unfalltag")], [
      ["Unfall der vorgesetzten Stelle melden", "MA", 0, null, "SUVA (Unfälle umgehend dem Arbeitgeber melden); VVO § 100 Abs. 1 sinngemäss"],
      ["Bagatellunfall-Meldung an den Unfallversicherer", "SV", 1, meld("Unfallversicherer", "Bagatellunfall-Meldung UVG {person}"), "UVG Art. 45 Abs. 2 (Arbeitgeber meldet unverzüglich); SUVA (Bagatellunfall: höchstens 3 Kalendertage)"],
      ["Rechnungen weiterleiten", "SV", 14, null, "Unfallversicherer der Gemeinde (ZU PRÜFEN)"],
      ["Fall abschliessen und ablegen", "SV", 30, null, "VVO § 22 sinngemäss (Personaldossier)"],
    ]);
  V("uok", "Personal", "Unfall – kommunal (über 3 Tage)", "Unfalltag",
    "Ordentlicher Unfall mit mehr als drei Tagen Arbeitsunfähigkeit beim kommunalen Personal.",
    [F.name(), F.wahl("art", "Art", ["Berufsunfall", "Nichtberufsunfall"]), F.datum("Unfalltag")], [
      ["Unfall der vorgesetzten Stelle melden", "MA", 0, null, "SUVA; VVO § 100 Abs. 1 sinngemäss"],
      ["Schadenmeldung UVG an den Unfallversicherer", "SV", 1, meld("Unfallversicherer", "Schadenmeldung UVG {person}"), "UVG Art. 45 Abs. 2; SUVA (ordentlicher Unfall: mehr als 3 Kalendertage)"],
      ["Stellvertretung organisieren", "SL", 1, null, "Personalverordnung der Gemeinde (ZU PRÜFEN)", { nach: [1] }],
      ["Arztzeugnis einreichen (Absenz über eine Woche)", "MA", 7, anf("{person}", "Arztzeugnis"), "VVO § 100 Abs. 2 sinngemäss", { nach: [1] }],
      ["Taggeld und Lohnfortzahlung abrechnen", "SV", 30, null, "VVO §§ 99, 104 sinngemäss (Lohnfortzahlung, Anrechnung Taggelder)", { nach: [2] }],
      ["Case Management prüfen", "SL", 30, null, "VVO § 100 a sinngemäss", { nach: [4] }],
      ["Wiedereinstieg planen", "SL", 45, term("Rückkehrgespräch {person}", "{person}, vorgesetzte Stelle"), "Interne Vorgabe (ZU PRÜFEN)"],
    ]);
  V("uka", "Personal", "Unfall – kantonal", "Unfalltag",
    "Unfall einer kantonal angestellten Lehrperson oder Schulleitung.",
    [F.name(), F.wahl("art", "Art", ["Berufsunfall", "Nichtberufsunfall"]), F.datum("Unfalltag")], [
      ["Unfall umgehend der Schulleitung melden", "MA", 0, null, "VSA Abwesenheit (Arbeitsunfähigkeit umgehend den Vorgesetzten melden)"],
      ["Elektronische Unfallmeldung (kantonales Formular)", "MA", 1, meld("Volksschulamt / Unfallversicherer des Kantons", "Unfallmeldung {person}"), "VSA Unfallmeldung; VSA Versicherung (Sektor Lohn übermittelt an die Versicherung); UVG Art. 45"],
      ["Absenz ab dem 4. Tag dem VSA melden", "SL", 3, meld("VSA", "Meldung Absenz {person} (Unfall)"), "VSA Abwesenheit (Formular «Meldung einer Absenz»)", { nach: [1] }],
      ["Vikariat auslösen (Ablauf «Vikariat – kantonal»)", "SL", 3, null, "LPVO § 30", { nach: [1] }],
      ["Arztzeugnis einreichen (über eine Woche)", "MA", 7, anf("{person}", "Arztzeugnis"), "VSA Abwesenheit; VVO § 100 Abs. 2", { nach: [1] }],
      ["Kontakt halten, Case Management prüfen", "SL", 30, meld("VSA", "Antrag Case Management {person}"), "VSA Case Management; VVO § 100 a", { nach: [3] }],
    ]);
  V("krank", "Personal", "Krankheit", "Erster Krankheitstag",
    "Krankheitsbedingte Abwesenheit mit Meldung, Arztzeugnissen, Stellvertretung und Lohnfortzahlung.",
    [F.name(), F.anst(), F.datum("Erster Krankheitstag")], [
      ["Krankmeldung an die vorgesetzte Stelle", "MA", 0, null, "VVO § 100 Abs. 1 (so rasch als möglich melden)"],
      ["Stellvertretung bzw. Vikariat organisieren", "SL", 1, null, "LPVO § 30; VSA Vikariat"],
      ["Absenz ab dem 4. Tag dem VSA melden", "SL", 3, meld("VSA", "Meldung Absenz {person} (Krankheit)"), "VSA Abwesenheit", { nach: [1], b: kantonal }],
      ["Arztzeugnis einreichen (Absenz über eine Woche)", "MA", 7, anf("{person}", "Arztzeugnis"), "VVO § 100 Abs. 2", { nach: [1] }],
      ["Folgezeugnisse monatlich (Absenz über einen Monat)", "MA", 31, anf("{person}", "Folgezeugnis"), "VVO § 100 Abs. 3"],
      ["Case Management bei längerer Absenz prüfen", "SL", 30, null, "VVO § 100 a; VSA Case Management", { nach: [4] }],
      ["Krankentaggeld melden (kommunal)", "SV", 30, meld("Krankentaggeldversicherung", "Meldung {person}"), "Personalverordnung / KTG-Vertrag der Gemeinde (ZU PRÜFEN)", { nach: [4], b: kommunal }],
      ["Lohnfortzahlung überwachen (3/6/12 Monate je Dienstjahr)", "SV", 60, null, "VVO § 99 (Lohnfortzahlung)", { nach: [4] }],
    ]);

  // ------------------------------------------------------------ Infrastruktur
  V("srp", "Infrastruktur", "Schulraumprognose", "Bericht an die Schulbehörde",
    "Jährliche Prognose von Schülerzahlen, Klassen und Raumbedarf als Grundlage der Schulraumplanung.",
    [F.bez("Prognose (z. B. 2027–2032)"), F.datum("Bericht an die Schulbehörde")], [
      ["Kantonale Schülerprognose und eigene Zahlen beschaffen", "SV", -90, null, "Schülerprognose (Bildungsplanung, fünf Jahre)"],
      ["Gemeindedaten ergänzen (Bautätigkeit, Geburten, Zuzüge)", "SV", -75, null, "FD 1.2.8 (Schulraumplanung); kommunale Planungsgrundlagen (ZU PRÜFEN)"],
      ["Klassenbildung und Raumbedarf ableiten", "SL", -60, null, "LPG § 3 (Vollzeiteinheiten nach Schülerzahlen); FD 1.2.8 (SL M)"],
      ["Raumbestand mit dem Hausdienst abgleichen", "HD", -50, null, "FD 1.2.8 (HD M)"],
      ["Bericht und Antrag des Ressorts", "RV", -20, ges("Schulpflege"), "FD 1.2.8 (RV V)", { fd: "1.2.8", nach: [3, 4] }],
      ["Entscheid der Schulbehörde", "SPF", 0, bes("Schulpflege"), "FD 1.2.8 (SPF E); FD 1.2.7 (Immobilienstrategie)", { fd: "1.2.8" }],
    ]);
  V("srd", "Infrastruktur", "Schulraum für Dritte", "Nutzungsdatum",
    "Vermietung bzw. Nutzung von Schulräumen ausserhalb der Unterrichtszeit.",
    [F.bez("Nutzung (z. B. Verein, Anlass)"), F.datum("Nutzungsdatum")], [
      ["Gesuch erfassen", "SV", -30, ges("Hausdienst"), "FD 1.2.11 (V: Drittnutzer, E: Hausdienst)"],
      ["Verfügbarkeit prüfen (Unterricht, Ferien, Anlässe)", "HD", -25, null, "FD 1.2.11; Ferienplan"],
      ["Bewilligung bzw. Vertrag nach Benützungsreglement und Tarifen", "HD", -20, uz("Gesuchsteller", "Benützungsvertrag {person}"), "FD 1.2.11 (HD E); FD 2.6 (Tarife); Benützungsreglement (ZU PRÜFEN)", { fd: "1.2.11" }],
      ["Schulpflege informieren", "SV", -20, mit("SPF", "Raumnutzung Dritte: {person}"), "FD 1.2.11 (SPF I)", { nach: [2] }],
      ["Schlüssel bzw. Zutritt abgeben", "HD", -1, a("shop.ausgabe.erfassen", { person: "{person}", gegenstand: "Schlüssel" }), "FD 1.2.11"],
      ["Abnahme und Rechnung", "HD", 1, null, "FD 2.6 (Tarife Gebühren)"],
    ]);

  // ------------------------------------------------------------ ICT
  V("hwb", "ICT", "Hardwarebeschaffung (unterjährig)", "Gerät bereit ab",
    "Einzelbeschaffung von Hardware ausserhalb der jährlichen Beschaffung.",
    [F.bez("Gerät / Bedarf"), F.zahl("menge", "Anzahl"), F.zahl("betrag", "Kosten in CHF"), F.datum("Gerät bereit ab")], [
      ["Bedarf und Begründung erfassen", "SL", -45, ges("ICT-Support"), "Jahresplanung ICT (Hardwarebeschaffung)"],
      ["Kredit prüfen (Budget, Aktivierungsgrenze)", "SV", -40, a("finance.kredit.pruefen", { vorhaben: "{person}", betrag: "{betrag}" }), "GG §§ 103–105; VGG § 21 (Aktivierungsgrenze)"],
      ["Offerte einholen", "ICT", -35, null, "Master-Checkliste (Offerten einholen und prüfen); Submissionsrecht (Schwellenwerte ZU PRÜFEN)", { nach: [1] }],
      ["Freigabe nach Finanzkompetenz", "RV", -30, bes("Ressort bzw. zuständige Stelle"), "FD 3.7 (RV E, ICT V); Gemeindeordnung (Finanzkompetenzen, ZU PRÜFEN)", { nach: [2, 3] }],
      ["Bestellen", "ICT", -28, a("shop.geraete.bestellen", { artikel: "{person}", menge: "{menge}" }), "Master-Checkliste (Bestellung auslösen)", { auto: true }],
      ["Inventarisieren", "ICT", -7, a("shop.inventar.erfassen", { bestellung: "{hwb5.bestellung}", menge: "{menge}" }), "Master-Checkliste (Inventar erfassen); Jahresplanung ICT Q4 (Inventar)", { auto: true }],
      ["Einrichten und übergeben (Übergabeprotokoll)", "ICT", 0, a("shop.ausgabe.erfassen", { person: "Antragsteller", gegenstand: "{person}" }), "Prozessliste (Übergabe Geräte, Übergabeprotokoll)"],
    ]);
  V("ictap", "ICT", "Arbeitsplatz beantragen", "Arbeitsbeginn",
    "Arbeitsplatz mit Gerät, Konten und Zubehör für neue oder geänderte Stellen.",
    [F.name("Für"), F.wahl("funktion", "Funktion", D.FUNKTIONEN), F.datum("Arbeitsbeginn")], [
      ["Antrag der vorgesetzten Stelle", "SL", -30, ges("ICT-Support"), "Prozessliste (Übergabe Geräte und Einführung)"],
      ["Bewilligung (Budget, Standard-Arbeitsplatz)", "RV", -25, bes("Ressort"), "FD 3.7 (RV E); FD 3.8 (Software)"],
      ["Gerät und Zubehör bereitstellen", "ICT", -10, a("shop.ausgabe.erfassen", { person: "{person}", gegenstand: "Arbeitsplatz {funktion}" }), "Master-Checkliste (Geräte bereitstellen); Jahreskalender ICT (IT-Boxen)"],
      ["Konto und Berechtigungen", "ICT", -10, a("ident.konto.anlegen", { person: "{person}", gueltigAb: "{stichtag}" }), "FD 3.10 (Benutzerverwaltung); Prozessliste (Login gemäss Rollen- und Berechtigungskonzept)", { nach: [2] }],
      ["Übergabe mit Protokoll und Nutzungsvereinbarung", "ICT", 0, uz("{person}", "Übergabeprotokoll, Nutzungsvereinbarung"), "Prozessliste (Übergabeprotokoll); Jahresplanung ICT Q1 (Nutzungsvereinbarung)", { nach: [3, 4] }],
    ]);
  V("ictkz", "ICT", "Klassenzimmerausrüstung beantragen", "Inbetriebnahme",
    "Präsentationstechnik, Audio, Netzwerk oder Mobiliar mit ICT-Bezug für ein Schulzimmer.",
    [F.bez("Zimmer / Ausrüstung"), F.zahl("betrag", "Kosten in CHF"), F.datum("Inbetriebnahme")], [
      ["Antrag der Schulleitung", "SL", -90, ges("ICT-Support"), "Jahresplanung ICT Q1 (Budget vorbereiten)"],
      ["Abgleich mit dem ICT-Konzept", "ICT", -80, null, "FD 3.1 (ICT-Konzept); Jahresplanung ICT"],
      ["Kredit prüfen", "SV", -75, a("finance.kredit.pruefen", { vorhaben: "{person}", betrag: "{betrag}" }), "GG §§ 103–105; VGG § 21"],
      ["Freigabe", "RV", -60, bes("Ressort"), "FD 3.7 (RV E)", { nach: [2, 3] }],
      ["Installation mit dem Hausdienst planen", "HD", -20, term("Installation {person}", "ICT-Support, Hausdienst"), "FD 3.7 (HD M); Ferienplan (Arbeiten in unterrichtsfreier Zeit)"],
      ["Abnahme und Inventar", "ICT", 0, a("shop.inventar.erfassen", { bestellung: "{person}", menge: "1" }), "Jahresplanung ICT Q4 (Aktualisierung Inventar)"],
    ]);
  V("ictlm", "ICT", "Lehrmittel beantragen", "Einsatz ab",
    "Gedruckte oder digitale Lehrmittel inkl. Lizenzen.",
    [F.bez("Lehrmittel"), F.text("klassen", "Klassen / Anzahl"), F.datum("Einsatz ab")], [
      ["Antrag der Lehrperson", "LP", -60, ges("Schulleitung"), "Prozessliste (Lehrmittel bestellen)"],
      ["Prüfen: obligatorisch bzw. zugelassen, Budget", "SL", -50, null, "Lehrmittelverzeichnis des Kantons (ZU PRÜFEN); FD 2.2"],
      ["Bestellen", "SV", -40, a("shop.material.bestellen", { person: "{klassen}", paket: "{person}" }), "Prozessliste (Lehrmittel bestellen)"],
      ["Digitale Lizenzen zuweisen", "ICT", -7, a("connect.zugang.verteilen", { konto: "{klassen}", ziel: "Lehrmittelportal" }), "Jahreskalender ICT (Lehrmittel-Lizenzen KW 28/33)", { nach: [3] }],
      ["Lehrpersonen informieren", "SL", -5, mit("Lehrpersonen", "Lehrmittel {person} ab {stichtag}"), "Prozessliste (Wocheninfo)"],
    ]);
  V("ictsw", "ICT", "Anwendungen und Schulsoftware beantragen", "Einführung",
    "Neue App, Lernsoftware oder Plattform mit Datenschutz- und Sicherheitsprüfung.",
    [F.bez("Anwendung"), F.wahl("daten", "Personendaten von SuS", ["ja", "nein"]), F.datum("Einführung")], [
      ["Antrag mit Zweck und Nutzergruppe", "LP", -90, ges("ICT-Support"), "Jahresplanung ICT (App-Mutationen)"],
      ["Pädagogische Beurteilung", "SL", -80, null, "Jahresplanung ICT Q2 (App-Mutationen: SK E, PICTS M/E)"],
      ["Datenschutz- und Sicherheitsprüfung", "ICT", -70, null, "Jahresplanung ICT (ISV E); Datenschutz (IDG, Vorabkontrolle bei besonderen Risiken, ZU PRÜFEN)", { nach: [1], b: { feld: "daten", op: "=", wert: "ja" } }],
      ["Auftragsdatenvereinbarung abschliessen", "SV", -50, uz("Anbieter", "Auftragsdatenvereinbarung {person}"), "Jahresplanung ICT Q4 (Auftragsdatenvereinbarungen prüfen)", { nach: [3], b: { feld: "daten", op: "=", wert: "ja" } }],
      ["Entscheid und Lizenz beschaffen", "RV", -40, bes("Ressort"), "FD 3.8 (Software: RV E, ICT V)", { nach: [2, 4] }],
      ["Einrichten und Benutzer zuweisen", "ICT", -10, a("connect.zugang.verteilen", { konto: "Nutzergruppe", ziel: "{person}" }), "Jahresplanung ICT (Benutzer-Mutationen in Apps)"],
      ["Schulung und Information", "ICT", 0, term("Einführung {person}", "Lehrpersonen"), "Jahresplanung ICT (Weiterbildung mit ICT-Fokus)"],
    ]);
  V("icton", "ICT", "Onboarding LP / MA (ICT)", "Eintritt",
    "ICT-Teil des Onboardings: Benutzerdatenblatt, Konten, IT-Box, Nutzungsvereinbarung, Kick-off.",
    [F.name(), F.wahl("funktion", "Funktion", D.FUNKTIONEN), F.datum("Eintritt")], [
      ["Eintritt von der Schulverwaltung erhalten", "SV", -45, mit("ICT", "Eintritt {person} ({funktion}) ab {stichtag}"), "Prozessliste (Meldung über Eintritt)"],
      ["Konten erstellen gemäss Rollen- und Berechtigungskonzept", "ICT", -21, a("ident.konto.anlegen", { person: "{person}", gueltigAb: "{stichtag-14}" }), "Prozessliste (Logins); Master-Checkliste (Konten erstellen); FD 3.10", { auto: true }],
      ["Benutzerdatenblatt und Zugangsdaten versenden", "ICT", -14, mit("{person}", "Benutzerdatenblatt, Zugangsdaten"), "Jahreskalender ICT KW 27 (Benutzerdatenblatt); Master-Checkliste (Zugangsdaten versenden)"],
      ["IT-Box vorbereiten (Gerät, Zubehör)", "ICT", -14, a("shop.ausgabe.erfassen", { person: "{person}", gegenstand: "IT-Box" }), "Jahreskalender ICT KW 27 (IT-Boxen); Master-Checkliste (Arbeitsgerät bereitstellen)", { nach: [1] }],
      ["Nutzungsvereinbarung unterzeichnen", "MA", -7, uz("{person}", "Nutzungsvereinbarung"), "Jahresplanung ICT Q1; Jahreskalender ICT KW 27", { nach: [3] }],
      ["Kick-off mit Einführung und Passwortwechsel", "ICT", 0, term("ICT-Kick-off {person}", "{person}, PICTS"), "Jahreskalender ICT KW 28/33 (Kick-off I/II); Master-Checkliste (Einführung, Passwort ändern)", { nach: [4, 5] }],
    ]);
  V("ictoff", "ICT", "Offboarding LP / MA (ICT)", "Letzter Arbeitstag",
    "ICT-Teil des Offboardings: Rückgabe-Ablauf, Rückgabeboxen, Geräte zurücksetzen, Konten deaktivieren.",
    [F.name(), F.datum("Letzter Arbeitstag")], [
      ["Rückgabe-Ablauf per Mail an Austretende", "ICT", -21, mit("{person}", "Rückgabe-Ablauf Geräte und Daten"), "Jahreskalender ICT KW 27 (Rückgabe-Ablauf); Master-Checkliste (Austritts-Info versenden)"],
      ["Rückgabeboxen bereitstellen", "HD", -14, null, "Jahreskalender ICT KW 28 (Rückgabeboxen in den Schulhäusern)", { nach: [] }],
      ["Daten sichern bzw. übergeben (Data-Cleaning)", "MA", -3, null, "Jahresplanung ICT Q3 (Data-Cleaning-Day)", { nach: [1] }],
      ["Gerät zurücknehmen und zurücksetzen", "ICT", 0, a("shop.rueckgabe.erfassen", { person: "{person}", gegenstand: "Gerät, Zubehör" }), "Jahreskalender ICT KW 31 (Geräte zurücksetzen); Master-Checkliste (Arbeitsgerät zurücknehmen)", { nach: [2, 3] }],
      ["Konten deaktivieren, Abwesenheitsnotiz", "ICT", 1, a("ident.konto.sperren", { konto: "{person}", ab: "{stichtag+1}", abwesenheitsnotiz: "ja" }), "Master-Checkliste (Konten deaktivieren/löschen); Prozessliste (Logins sperren, Autoresponder)", { auto: true, nach: [1] }],
      ["Rücklauf an den Rücknahmepartner", "ICT", 30, null, "Jahreskalender ICT KW 35 (Rücklauf)", { nach: [4] }],
      ["Konten löschen (Bereinigung Verzeichnisdienst)", "ICT", 90, a("connect.zugang.entfernen", { konto: "{person}", ziel: "alle" }), "Master-Checkliste (AD-Bereinigung: alte Konten löschen)", { nach: [5] }],
    ]);

  // ------------------------------------------------------------ Jahreskalender: Ereignisse mit den neuen Vorlagen verknüpfen
  const evTitel = (t) => D.EREIGNISSE.find((e) => e.titel === t);
  const link = (t, flow) => { const e = evTitel(t); if (e) e.flow = flow; };
  link("Budget vorbereiten", "budget");
  link("Budget definieren (Eingabe neues Kalenderjahr, ER und IR)", "budget");
  link("Budget- und Zukunftsplanung", "budget");
  link("Aktualisierung und Überprüfung Inventar", "hwb");
  link("App-Mutationen", "ictsw");
  link("App-Mutationen (Lernsoftware und Plattformen)", "ictsw");
  link("On-/Offboarding neue SuS durchführen (Konten, Nutzungsvereinbarung)", "le");
  link("Offboarding Lehrpersonen: Rückgabe-Ablauf per Mail an Austretende", "ictoff");
  link("Onboarding Lehrpersonen: IT-Boxen, Benutzerdatenblatt, Nutzungsvereinbarung", "icton");
  const n0 = D.EREIGNISSE.length;
  const ev = (titel, bereich, zeit, rollen, flow, weitere) => D.EREIGNISSE.push(Object.assign({ id: "kv" + (D.EREIGNISSE.length - n0 + 1), titel, bereich, zeit, jahr: null,
    rollen: Object.fromEntries(rollen.split(/\s+/).filter(Boolean).map((x) => x.split(":"))), quelle: "beispiel", flow, teil: [], notiz: "" }, weitere || {}));
  ev("Ordentliche Sitzung der Schulpflege", "budget", { regel: "monatlich", tag: 10 }, "SPF:E SV:V", "sb", { ferien: "nachher" });
  ev("Schulleitungskonferenz", "qual", { regel: "monatlich", tag: 3 }, "SL:V", "slk", { ferien: "nachher" });
  ev("Rechnungsgemeindeversammlung (Genehmigung bis 30. Juni)", "budget", { am: "06-15" }, "SPF:V", "rechnung", { notiz: "GG § 128: Genehmigung innert sechs Monaten nach Ablauf des Rechnungsjahres." });
  ev("Budgetgemeindeversammlung (Beschluss bis Ende Jahr)", "budget", { am: "12-01" }, "SPF:V", "gv", { notiz: "GG § 101: Budget und Steuerfuss bis spätestens Ende Jahr." });
  ev("Jahresabschluss beginnen", "budget", { am: "01-15" }, "SV:V", "rechnung");
  ev("Mitarbeiterbeurteilungen durchführen", "ma", { regel: "stichtag", anker: "schuljahresende", versatz: -3, einheit: "monate" }, "SL:E/V", "mab", { ferien: "nachher", notiz: "LPVO § 23: in der Regel jährlich." });
  ev("Zahnarztgutscheine versenden", "sus", { regel: "stichtag", anker: "schuljahresbeginn", versatz: 3, einheit: "wochen" }, "SV:V", "zahn", { ferien: "nachher" });
  ev("Schulraumprognose aktualisieren", "beschaffung", { am: "09-30" }, "SL:M SV:V", "srp");
  ev("Stellenplan beim Volksschulamt eingeben (1. März)", "ma", { am: "03-01" }, "SL:V SV:M", null, { ferien: "vorher", notiz: "VSA: Eingabe Stellenplan bis 1. März." });
  ev("Kündigungstermin Lehrpersonen (4 Monate vor 31. Juli)", "ma", { am: "03-31" }, "SL:V SV:M", "pak", { notiz: "LPG § 8: Kündigung auf Ende Schuljahr mit vier Monaten Frist." });
})();
