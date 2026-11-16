/*
 * EduKSX-Staffing – VZE-Tool des Volksschulamts (Kanton Zürich) befüllen.
 *
 * Die Schulgemeinde erhält das VZE-Tool jedes Jahr vom VSA (bereits mit Gemeinde, Schuleinheiten und zugewiesenen
 * VZE). EduKSX-Staffing füllt nur dessen Eingabezellen aus; Formatierung, Formeln, Schutz und ausgeblendete Blätter
 * bleiben unverändert (XlsxVorlage). Die Zellbelegung ist je Tool-Version festgelegt (VERSIONEN).
 * Die Datei bleibt im Browser; nichts wird hochgeladen.
 */
(function (global) {
  "use strict";
  const X = typeof module !== "undefined" && module.exports ? require("./xlsx-vorlage.js") : global.XlsxVorlage;
  const spalten = (von, bis) => { const a = []; for (let n = X.spalteZuNr(von); n <= X.spalteZuNr(bis); n++) a.push(X.nrZuSpalte(n)); return a; };

  // Zellbelegung je Version des VZE-Tools (intern!C1). Neue Version: Abschnitt kopieren, Zeilen/Spalten prüfen.
  const VERSIONEN = {
    "VSA 2.19": {
      schuljahr: "2026/27",
      intern: { version: "C1", gemeinde: "C2", nummer: "C3", seErsteZeile: 36, seAnzahl: 37 },
      se: {
        gpZuteilung: "E15",
        gpKlassenplanung: { KG: "W18", Primar: "X18", Sekundar: "Y18" },
        klassen: { von: 27, bis: 69, schulhaus: "B", name: "D", besondere: "E", korrektur: "Y", gestaltungspool: "Z", faecher: spalten("AJ", "AV"), schueler: spalten("F", "V") },
        sekSpalte: { 1: { A: "N", B: "O", C: "P" }, 2: { A: "Q", B: "R", C: "S" }, 3: { A: "T", B: "U", C: "V" } },
        standardWL: { 1: { A: 38, B: 38, C: 38 }, 2: { A: 37, B: 37, C: 37 }, 3: { A: 20, B: 21, C: 21 } },
        ifZeilen: { wl: 78, gestaltungspool: 80 }, ifSpalte: { KG: "F", Primar: "H", Sekundar: "N" },
        erhoehungBG: { von: 90, bis: 92, name: "B", spalte: { KG: "F", Primar: "H", Sekundar: "N" } },
        vikariate: { von: 99, bis: 118, lektionen: "B" },
      },
      schulleitung: { blatt: "Schulleitung", block: 25, zugeteilt: { sl: 6, gestaltungspool: 7, koordination: 8, kommunal: 9 }, zugeteiltSpalte: "I",
        personen: { von: 15, bis: 23, name: "B", vze: "I", vakant: "J", bemerkung: "K", lpName: "L", lpVze: "N", lpVakant: "O", lpSL: "P", lpKO: "Q" } },
      kontrolleSP: { blatt: "Kontrolle Sonderpädagogik", block: 33, von: 6, bis: 34,
        spalten: { name: "B", verwaist: "C", ifSek: "J", ifUmlagerungSek: "K", isrSek: "L", regelklasse: "N", bemerkung: "P", einsatzAb: "Q" } },
    },
  };

  async function analysieren(mappe) {
    if (!mappe.blatt("intern") || !mappe.blatt("Eingabe")) throw new Error("Das ist kein VZE-Tool des Volksschulamts (Blätter «Eingabe»/«intern» fehlen).");
    const version = String(await mappe.lesen("intern", "C1") || "").trim();
    const v = VERSIONEN[version];
    const i = (v || VERSIONEN["VSA 2.19"]).intern;
    const gemeinde = await mappe.lesen("intern", i.gemeinde);
    const nummer = await mappe.lesen("intern", i.nummer);
    const schuleinheiten = [];
    for (let k = 0; k < i.seAnzahl; k++) {
      const z = i.seErsteZeile + k;
      const code = await mappe.lesen("intern", "C" + z);
      if (code === null || code === "") continue;
      const name = await mappe.lesen("intern", "D" + z);
      const anzeige = `${String(code).padStart(3, "0")}  ${name}`;
      const blatt = mappe.blatt(anzeige) ? anzeige : "SE" + (k + 1);
      schuleinheiten.push({ index: k + 1, code, name, anzeige, blatt, vorhanden: !!mappe.blatt(blatt) });
    }
    const titel = await mappe.lesen("Eingabe", "A2");
    return { version, bekannt: !!v, schuljahr: v ? v.schuljahr : (/(\d{4}\/\d{2})/.exec(titel || "") || [])[1], gemeinde, nummer, schuleinheiten };
  }

  /** Alle Eingabezellen einer Schuleinheit, die EduKSX-Staffing beschreibt (zum Leeren vor dem Ausfüllen). */
  function bereiche(version, se) {
    const v = VERSIONEN[version];
    const s = v.se;
    const out = [];
    const add = (blatt, ref) => out.push({ blatt, ref });
    add(se.blatt, s.gpZuteilung);
    for (const ref of Object.values(s.gpKlassenplanung)) add(se.blatt, ref);
    for (let z = s.klassen.von; z <= s.klassen.bis; z++) {
      for (const c of [s.klassen.schulhaus, s.klassen.name, s.klassen.besondere, s.klassen.korrektur, s.klassen.gestaltungspool, ...s.klassen.schueler, ...s.klassen.faecher]) add(se.blatt, c + z);
    }
    for (const z of Object.values(s.ifZeilen)) for (const c of Object.values(s.ifSpalte)) add(se.blatt, c + z);
    for (let z = s.erhoehungBG.von; z <= s.erhoehungBG.bis; z++) for (const c of [s.erhoehungBG.name, ...Object.values(s.erhoehungBG.spalte)]) add(se.blatt, c + z);
    for (let z = s.vikariate.von; z <= s.vikariate.bis; z++) add(se.blatt, s.vikariate.lektionen + z);
    const sl = v.schulleitung; const b = sl.block * (se.index - 1);
    for (const z of Object.values(sl.zugeteilt)) add(sl.blatt, sl.zugeteiltSpalte + (z + b));
    for (let z = sl.personen.von; z <= sl.personen.bis; z++) for (const [k, c] of Object.entries(sl.personen)) if (k !== "von" && k !== "bis") add(sl.blatt, c + (z + b));
    const kp = v.kontrolleSP; const bk = kp.block * (se.index - 1);
    for (let z = kp.von; z <= kp.bis; z++) for (const c of Object.values(kp.spalten)) add(kp.blatt, c + (z + bk));
    return out;
  }

  /**
   * Zellbelegung aus den Daten von EduKSX-Staffing.
   * daten: { stufe: "Sekundar", klassen:[{name, jahrgang, abteilung, schueler, klp, lektionen, gestaltungspoolWL}],
   *   gpZuteilungVZE, ifWL, ifGestaltungspoolWL, erhoehungBG:[{name, vze}], vikariate:[{lektionen}],
   *   schulleitung:{ slVZE, gestaltungspoolVZE, koordinationVZE, kommunalVZE, personen:[{name, vze, vakant, bemerkung}],
   *     lehrpersonen:[{name, vze, vakant, sl, ko}] }, kontrolleSP:[{name, ifWL, isrWL, regelklasseWL, bemerkung}] }
   */
  function belegung(version, se, daten) {
    const v = VERSIONEN[version];
    const s = v.se;
    const out = [];
    const hinweise = [];
    const setze = (blatt, ref, wert, bereich, text) => { if (wert !== null && wert !== undefined && wert !== "" && wert !== 0) out.push({ blatt, ref, wert, bereich, text }); };
    const r2 = (x) => Math.round(x * 100) / 100;
    const stufe = daten.stufe || "Sekundar";

    setze(se.blatt, s.gpZuteilung, r2(daten.gpZuteilungVZE || 0), "Gestaltungspool", "Zuteilung Gestaltungspool an Schule (VZE)");
    let gpKlassen = 0;
    const klassen = daten.klassen || [];
    if (klassen.length > s.klassen.bis - s.klassen.von + 1) hinweise.push(`Nur ${s.klassen.bis - s.klassen.von + 1} Klassenzeilen im VZE-Tool – ${klassen.length - (s.klassen.bis - s.klassen.von + 1)} Klassen fehlen.`);
    klassen.slice(0, s.klassen.bis - s.klassen.von + 1).forEach((k, i) => {
      const z = s.klassen.von + i;
      const spalte = (s.sekSpalte[k.jahrgang] || {})[k.abteilung];
      if (!spalte) { hinweise.push(`Klasse ${k.name}: Jahrgang/Abteilung ${k.jahrgang}${k.abteilung} unbekannt.`); return; }
      setze(se.blatt, s.klassen.schulhaus + z, se.anzeige, "Klassenbildung", `Klasse ${k.name}: Schulhaus`);
      setze(se.blatt, s.klassen.name + z, k.klp || `Klasse ${k.name}`, "Klassenbildung", `Klasse ${k.name}: Name LP`);
      setze(se.blatt, spalte + z, k.schueler, "Klassenbildung", `Klasse ${k.name}: Schülerzahl (${k.jahrgang}. Sek ${k.abteilung})`);
      const standard = s.standardWL[k.jahrgang][k.abteilung];
      const korrektur = r2((k.lektionen || standard) - standard);
      if (korrektur) setze(se.blatt, s.klassen.korrektur + z, korrektur, "Klassenbildung", `Klasse ${k.name}: Korrektur (+/-) in WL (${k.lektionen} geplant, Standard ${standard})`);
      if (k.gestaltungspoolWL) { setze(se.blatt, s.klassen.gestaltungspool + z, k.gestaltungspoolWL, "Klassenbildung", `Klasse ${k.name}: Unterricht aus Gestaltungspool in WL`); gpKlassen += k.gestaltungspoolWL; }
    });
    if (gpKlassen) setze(se.blatt, s.gpKlassenplanung[stufe], r2(gpKlassen / 27.3), "Gestaltungspool", "3a. VZE Gestaltungspool an Klassenplanung");
    setze(se.blatt, s.ifSpalte[stufe] + s.ifZeilen.wl, daten.ifWL, "Integrative Förderung", "IF in Wochenlektionen");
    setze(se.blatt, s.ifSpalte[stufe] + s.ifZeilen.gestaltungspool, daten.ifGestaltungspoolWL, "Integrative Förderung", "IF aus dem Gestaltungspool in WL");
    const bg = daten.erhoehungBG || [];
    if (bg.length > s.erhoehungBG.bis - s.erhoehungBG.von + 1) hinweise.push(`Nur ${s.erhoehungBG.bis - s.erhoehungBG.von + 1} Zeilen für «Erhöhung Beschäftigungsgrad» – bitte zusammenfassen.`);
    bg.slice(0, s.erhoehungBG.bis - s.erhoehungBG.von + 1).forEach((p, i) => {
      const z = s.erhoehungBG.von + i;
      setze(se.blatt, s.erhoehungBG.name + z, p.name, "Gestaltungspool", "Erhöhung Beschäftigungsgrad: Name");
      setze(se.blatt, s.erhoehungBG.spalte[stufe] + z, r2(p.vze), "Gestaltungspool", `Erhöhung Beschäftigungsgrad ${p.name} (VZE)`);
    });
    (daten.vikariate || []).slice(0, s.vikariate.bis - s.vikariate.von + 1).forEach((x, i) => {
      setze(se.blatt, s.vikariate.lektionen + (s.vikariate.von + i), x.lektionen, "Gestaltungspool", `Vikariat aus Gestaltungspool: Anzahl Lektionen${x.text ? " – " + x.text : ""}`);
    });

    const sl = v.schulleitung; const b = sl.block * (se.index - 1); const d = daten.schulleitung || {};
    setze(sl.blatt, sl.zugeteiltSpalte + (sl.zugeteilt.sl + b), d.slVZE != null ? r2(d.slVZE) : null, "Schulleitung", "Zugeteilte VZE: SL VZE");
    setze(sl.blatt, sl.zugeteiltSpalte + (sl.zugeteilt.gestaltungspool + b), d.gestaltungspoolVZE ? r2(d.gestaltungspoolVZE) : null, "Schulleitung", "Zugeteilte VZE: Gestaltungspool");
    setze(sl.blatt, sl.zugeteiltSpalte + (sl.zugeteilt.koordination + b), d.koordinationVZE ? r2(d.koordinationVZE) : null, "Schulleitung", "Zugeteilte VZE: Koordination Sekundarschule");
    setze(sl.blatt, sl.zugeteiltSpalte + (sl.zugeteilt.kommunal + b), d.kommunalVZE ? r2(d.kommunalVZE) : null, "Schulleitung", "Zugeteilte VZE: Kommunale Erweiterung");
    const zeilen = sl.personen.bis - sl.personen.von + 1;
    (d.personen || []).slice(0, zeilen).forEach((p, i) => {
      const z = sl.personen.von + i + b;
      setze(sl.blatt, sl.personen.name + z, p.name, "Schulleitung", "Name Schulleitung");
      setze(sl.blatt, sl.personen.vze + z, r2(p.vze), "Schulleitung", `VZE ${p.name}`);
      if (p.vakant) setze(sl.blatt, sl.personen.vakant + z, "x", "Schulleitung", "Vakant");
      if (p.bemerkung) setze(sl.blatt, sl.personen.bemerkung + z, p.bemerkung, "Schulleitung", "Bemerkung");
    });
    (d.lehrpersonen || []).slice(0, zeilen).forEach((p, i) => {
      const z = sl.personen.von + i + b;
      setze(sl.blatt, sl.personen.lpName + z, p.name, "Schulleitung", "Name LP für Erhöhung BG");
      setze(sl.blatt, sl.personen.lpVze + z, r2(p.vze), "Schulleitung", `VZE ${p.name}`);
      if (p.vakant) setze(sl.blatt, sl.personen.lpVakant + z, "x", "Schulleitung", "LP vakant");
      if (p.sl) setze(sl.blatt, sl.personen.lpSL + z, "x", "Schulleitung", "SL VZE für Lehrperson");
      if (p.ko) setze(sl.blatt, sl.personen.lpKO + z, "x", "Schulleitung", "Koordination Sekundarschule für Lehrperson");
    });

    const kp = v.kontrolleSP; const bk = kp.block * (se.index - 1);
    (daten.kontrolleSP || []).slice(0, kp.bis - kp.von + 1).forEach((p, i) => {
      const z = kp.von + i + bk; const c = kp.spalten;
      setze(kp.blatt, c.name + z, p.name, "Kontrolle Sonderpädagogik", "Lehrperson IF/ISR");
      setze(kp.blatt, c.ifSek + z, p.ifWL, "Kontrolle Sonderpädagogik", `IF in WL (Sek) ${p.name}`);
      setze(kp.blatt, c.isrSek + z, p.isrWL, "Kontrolle Sonderpädagogik", `ISR in WL (Sek) ${p.name}`);
      setze(kp.blatt, c.regelklasse + z, p.regelklasseWL, "Kontrolle Sonderpädagogik", `Regelklasse in WL ${p.name}`);
      if (p.bemerkung) setze(kp.blatt, c.bemerkung + z, p.bemerkung, "Kontrolle Sonderpädagogik", "Bemerkung");
    });
    return { zellen: out, hinweise };
  }

  /** Vorlage befüllen; leeren = vorhandene Eingaben der Schuleinheit vorher entfernen. Gibt {bytes, fehler, geschrieben} zurück. */
  async function ausfuellen(mappe, version, se, zellen, optionen) {
    const je = {};
    const fehler = [];
    if (optionen && optionen.leeren) {
      for (const z of bereiche(version, se)) {
        if (!mappe.blatt(z.blatt)) continue;
        if (await mappe.istEingabe(z.blatt, z.ref)) (je[z.blatt] = je[z.blatt] || new Map()).set(z.ref, null);
      }
    }
    for (const z of zellen) (je[z.blatt] = je[z.blatt] || new Map()).set(z.ref, z.wert);
    for (const [blatt, werte] of Object.entries(je)) {
      fehler.push(...await mappe.schreiben(blatt, [...werte].map(([ref, wert]) => ({ ref, wert }))));
    }
    return { bytes: await mappe.speichern(), fehler, geschrieben: zellen.length };
  }

  const api = { VERSIONEN, analysieren, bereiche, belegung, ausfuellen };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.VZETool = api;
})(typeof window !== "undefined" ? window : globalThis);
