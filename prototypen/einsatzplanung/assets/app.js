/*
 * EduKSX-Staffing – Klickprototyp (ohne Abhängigkeiten, ohne Server).
 * Zustand im Speicher, auf Wunsch im Browser gespeichert (localStorage). Alle Daten sind erfunden.
 */
(function () {
  "use strict";

  const SPEICHER = "eduksx-staffing-prototyp-v5";
  const D = window.STAFFING_DATEN;

  // ---------------------------------------------------------------- Zustand
  function neuerZustand() {
    const s = JSON.parse(JSON.stringify(D));
    s.rolle = "schulleitung";
    s.schule = "s1";
    s.schuljahr = "2027/28";
    s.freigaben = {};          // pid -> { stand, angestellt, erledigt, bemerkung, aenderungSV }
    s.verlauf = [];            // { zeit, text }
    s.budgetGesperrt = false;
    s.erinnert = {};
    s.betreuungFreigabe = false;
    return s;
  }
  let S = laden() || neuerZustand();

  function laden() {
    try {
      const roh = localStorage.getItem(SPEICHER);
      return roh ? JSON.parse(roh) : null;
    } catch (e) {
      return null;
    }
  }
  function speichern() {
    try { localStorage.setItem(SPEICHER, JSON.stringify(S)); } catch (e) { /* Vorschau ohne Speicher */ }
  }
  function protokoll(text) {
    S.verlauf.unshift({ zeit: new Date().toISOString(), rolle: S.rolle, text });
  }

  // ---------------------------------------------------------------- Hilfen
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const zahl = (v, st = 0) => Number(v || 0).toLocaleString("de-CH", { minimumFractionDigits: st, maximumFractionDigits: st });
  const person = (id) => S.personen.find((p) => p.id === id);
  const pname = (id) => (person(id) ? person(id).name : "–");
  const datum = (iso) => (iso ? new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("de-CH") : "–");
  const zeit = (iso) => new Date(iso).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" });
  const ROLLEN = { schulleitung: "Schulleitung", verwaltung: "Schulverwaltung", betreuung: "Leitung Tagesstrukturen" };
  const istSL = () => S.rolle === "schulleitung";
  const istSV = () => S.rolle === "verwaltung";
  const istBL = () => S.rolle === "betreuung";
  const lehrpersonen = () => S.personen.filter((p) => !p.tagesstruktur && p.art !== "Klassenassistenz" && !p.pool);
  const planbar = () => S.personen.filter((p) => !p.tagesstruktur && !p.pool);
  const RESS_NAME = () => Object.fromEntries(S.ressourcen.map((r) => [r.id, r.name]));


  // ---------------------------------------------------------------- EduKSX-Glossary (Einbindung für Entwickler, Variante 1)
  // Feste Version mit Prüfsumme (SRI) gemäss https://glossary.eduksx.ch/entwickler. data-scope="none": Die Anwendung
  // bestimmt selbst, welche Texte erklärt werden (Beschreibungen, Hinweise, Gesetzestexte) – nicht Tabellen und
  // Eingabefelder. Die Suche läuft im Browser; es werden keine Inhalte an das Glossary gesendet, keine Cookies.
  const GLOSSAR = {
    src: "https://glossary.eduksx.ch/embed/v1.0.0/glossary.js",
    integrity: "sha384-1mCvqROb5QPmHVzczuZc5aX4LLhtgGihVfRPA1jWZLfWdqNo5CRCNX9ggamRAS8x",
    bereiche: "main .seitenkopf p, main .meldung, main p.small, main .karte > p, main section > p, main .paragraf-text, main li",
  };
  const glossarAn = () => { try { return localStorage.getItem("eduksx-glossar") !== "aus"; } catch (e) { return true; } };
  function glossarLaden() {
    if (!glossarAn() || document.getElementById("eduksx-glossary")) return;
    const sc = document.createElement("script");
    sc.id = "eduksx-glossary";
    sc.src = GLOSSAR.src;
    sc.integrity = GLOSSAR.integrity;
    sc.crossOrigin = "anonymous";
    sc.dataset.scope = "none";
    sc.dataset.max = "1000000";
    sc.dataset.names = "true"; // auch ausgeschriebene Bezeichnungen (z. B. «Vollzeiteinheiten», «Schulpflege»)
    // nur Fachgebiete der Einsatzplanung (z. B. nicht «B» = Budget, «Abs.» bei jedem Verweis)
    sc.dataset.categories = "Behörden,Personal,Sonderpädagogik,Unterricht,Lektion,Qualität,Statistik";
    document.head.appendChild(sc);
  }
  function glossarErklaeren() {
    if (!glossarAn()) return;
    const go = () => {
      if (!window.EduksxGlossary) return false;
      const laeufe = [];
      document.querySelectorAll(GLOSSAR.bereiche).forEach((el) => { if (!el.closest("[data-glossary-ignore], table, nav, header")) laeufe.push(window.EduksxGlossary.scan(el)); });
      // Nur erste Fundstelle je Begriff und Ansicht. data-first-only der Einbindung gilt je Seitenlebensdauer
      // und passt nicht zum Ansichtswechsel ohne Neuladen (EduKSX-Glossary #474) – deshalb hier selbst.
      Promise.all(laeufe).then(() => {
        const gesehen = new Set();
        document.querySelectorAll("main .gls-term").forEach((m) => {
          const k = m.dataset.glsCodes || m.textContent;
          if (!gesehen.has(k)) { gesehen.add(k); return; }
          m.replaceWith(document.createTextNode(m.textContent));
        });
      }).catch(() => {});
      return true;
    };
    if (!go()) { let n = 0; const t = setInterval(() => { if (go() || ++n > 40) clearInterval(t); }, 250); }
  }

  // ---------------------------------------------------------------- Gesetzliche Grundlagen (LPG, LPVO, VVO)
  const RECHT = window.STAFFING_RECHT || {};
  const pAnker = (kurz, nr, ueb) => `${kurz}-${ueb ? "ueb" + ueb + "-" : ""}${String(nr).replace(/\s+/g, "")}`;
  function paragraph(kurz, nr) {
    const g = RECHT[kurz];
    if (!g) return null;
    for (const a of g.abschnitte) for (const p of a.paragraphen) if (!p.uebergang && p.nr === nr) return p;
    return null;
  }
  /** Verweis aus der Anwendung: R("LPVO", "2 c", "Abs. 4") → Link auf die Hilfe mit Randtitel als Tooltip. */
  function R(kurz, nr, zusatz) {
    const p = paragraph(kurz, nr);
    const titel = p ? `${kurz} § ${nr}${p.titel ? " – " + p.titel : ""}` : `${kurz} § ${nr}`;
    return `<a class="gesetz" data-glossary-ignore href="#/hilfe/${kurz}/${String(nr).replace(/\s+/g, "")}" title="${esc(titel)}">${kurz} § ${esc(nr)}${zusatz ? " " + esc(zusatz) : ""}</a>`;
  }
  const RR = (...liste) => liste.map((x) => R(...x)).join(", ");

  function wordmark(zusatz) {
    const name = "EduKSX" + (zusatz ? "-" + zusatz : "");
    return `<span class="wm" role="img" aria-label="${esc(name)}"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span><span class="o">K</span><span class="b">SX</span>${zusatz ? `<span class="n">-${esc(zusatz)}</span>` : ""}</span></span>`;
  }
  const WM_DEV = `<span class="wm" role="img" aria-label="MarKusSXCH"><span aria-hidden="true"><span class="v">M</span><span class="n">ar</span><span class="o">K</span><span class="n">us</span><span class="b">SXCH</span></span></span>`;

  // Icon EduKSX-Staffing (freigegebenes Icon-Set, Farben über Markenwerte)
  const ICON_STAFFING = '<!--eduksx-icon:staffing-->'; // Icon aus EduKSX-UI, beim Bauen eingesetzt
  const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    uebersicht: ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    klassen: ico('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 9h4M7 13h7M15 20h-6"/>'),
    matrix: ico('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
    unterricht: ico('<path d="M4 5h16v11H4z"/><path d="M8 20h8M12 16v4"/>'),
    personen: ico('<circle cx="9" cy="8" r="3"/><path d="M3 20c.6-3.5 3-5.5 6-5.5s5.4 2 6 5.5"/><path d="M16 4.5a3 3 0 0 1 0 6M18 14.5c1.6.7 2.6 2.6 3 5.5"/>'),
    berufsauftrag: ico('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>'),
    ressourcen: ico('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    freigaben: ico('<path d="M5 12l4 4 10-10"/><path d="M4 20h16"/>'),
    umfrage: ico('<path d="M5 4h14v16H5z"/><path d="M9 9l1.5 1.5L13 8M9 15h6"/>'),
    stellvertretung: ico('<path d="M7 7h11l-3-3M17 17H6l3 3"/>'),
    tagesstrukturen: ico('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>'),
    gespraeche: ico('<path d="M4 5h16v10H9l-5 4z"/>'),
    stellenplan: ico('<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 9v11"/>'),
    jahresablauf: ico('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    vzetool: ico('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12l2 2 4-4"/>'),
    hilfe: ico('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17.5v.01"/>'),
    parameter: ico('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'),
  };

  // ---------------------------------------------------------------- Rechnungen (Regeln Kanton Zürich, siehe ANFORDERUNGEN.md § 2)
  const P = () => S.parameter;
  const pauschale = () => P().pauschaleSchule + P().pauschaleZusammenarbeit + P().pauschaleWeiterbildung;
  const PAUSCHALE = () => ({ Schule: P().pauschaleSchule, Zusammenarbeit: P().pauschaleZusammenarbeit, Weiterbildung: P().pauschaleWeiterbildung });
  const tafel = (k) => S.lektionentafeln[k.tafel];
  // ---- Einsätze (Lektionengefässe und Anstellungen): Einheiten WL (Wochenlektion), % (Stellenprozent),
  //      WStd (Wochenstunde während der Schulwochen). Umrechnung über Richtwerte: 1 WL = 58 h, 100 % = 1'890 h,
  //      1 WStd = Schulwochen × 1 h. «BG-Richtwert» = Stunden / 1'890 h × 100.
  const EINHEITEN = { WL: "Wochenlektionen", "%": "Stellenprozent", WStd: "Wochenstunden während der Schulwochen" };
  const GRUPPEN = { klasse: "Klassenlektionen", weitere: "Weitere Lektionen", sp: "Sonderpädagogik", anstellung: "Anstellungen und Gestaltungspool" };
  const einheit = (l) => l.einheit || "WL";
  const semF = (l) => (l.semester || [true, true]).filter(Boolean).length / 2;
  const sollLp = (l) => (l.wlLp != null ? Number(l.wlLp) : Number(l.wlSus || 0) * (l.halbklassen ? 2 : 1));
  const istLp = (l) => l.zuteilung.reduce((a, z) => a + Number(z.wl || 0), 0);
  const gruppe = (l) => l.gruppe || (l.klasse ? "klasse" : "weitere");
  const imBA = (l) => gruppe(l) !== "anstellung";
  const anstellungstyp = (l) => l.anstellung || (["kommunal", "daz", "kommAnst", "betreuung", "assistenz"].includes(l.ressource) ? "kommunal" : "kantonal");
  const eTitel = (l) => (l.name || `${l.klasse ? l.klasse + " " : ""}${S.faecher[l.fach] || l.fach}`) + (l.halbklassen ? " (Halbklassen)" : "");
  /** Jahresstunden eines Werts in seiner Einheit (Richtwert, ohne persönliche Faktoren) */
  function stundenRichtwert(l, wert) {
    const e = einheit(l);
    if (e === "WL") return Number(wert) * semF(l) * P().faktorLektion;
    if (e === "%") return (Number(wert) / 100) * 1890;
    return Number(wert) * P().schulwochen;
  }
  const bgRichtwert = (l, wert) => (stundenRichtwert(l, wert) / 1890) * 100;
  function umrechnen(l, wert, ziel) {
    if (einheit(l) === ziel && ziel !== "WL") return Number(wert);
    if (ziel === "WL") return einheit(l) === "WL" ? Number(wert) * semF(l) : stundenRichtwert(l, wert) / P().faktorLektion;
    const h = stundenRichtwert(l, wert);
    return ziel === "%" ? (h / 1890) * 100 : h / P().schulwochen;
  }
  function zuteilungenVon(pid) {
    const out = [];
    for (const l of S.lektionen) for (const z of l.zuteilung) if (z.person === pid && Number(z.wl)) out.push({ l, z });
    return out;
  }
  /** Wochenlektionen (aufs Jahr gerechnet) einer Person im Berufsauftrag, optional je Ressource */
  function wlVon(pid, ressource) {
    return zuteilungenVon(pid).filter((x) => imBA(x.l) && (!ressource || x.l.ressource === ressource)).reduce((a, x) => a + umrechnen(x.l, x.z.wl, "WL"), 0);
  }
  function klpAnteile(pid) {
    return S.klassen.filter((k) => k.klp.includes(pid)).map((k) => {
      const h = k.klpStunden && k.klpStunden[pid] != null ? Number(k.klpStunden[pid]) : P().klassenlehrperson / k.klp.length;
      const wlInKlasse = S.lektionen.filter((l) => l.klasse === k.id && einheit(l) === "WL").reduce((a, l) => a + l.zuteilung.filter((z) => z.person === pid).reduce((b, z) => b + Number(z.wl), 0), 0);
      return { klasse: k.id, stunden: h, geteilt: k.klp.length > 1, wlInKlasse };
    });
  }
  /** Stunden eines Gefässes für 100 % bzw. je Person (fix): Anzahl × (Präsenz + Vorbereitung) oder fester Wert */
  const gefaessBasis = (g) => (g.anzahl != null && g.praesenz != null ? Number(g.anzahl) * (Number(g.praesenz) + Number(g.vorbereitung || 0)) : Number(g.stunden || 0));
  function gefaessStunden(g, pid) {
    if (!g.teilnehmende.includes(pid)) return 0;
    const vz = g.vorzeichen === "-" ? -1 : 1;
    const basis = g.regel === "linear" ? Number(g.stunden || 0) : gefaessBasis(g);
    if (g.regel !== "linear") return vz * basis;
    const wl = wlVon(pid);
    let h = (basis * wl) / P().lektionenJeVZE;
    if (g.gesamtAb != null && wl >= Number(g.gesamtAb)) h = basis;
    if (g.sockelBis == null || wl <= Number(g.sockelBis)) h = Math.max(Number(g.sockel || 0), h);
    return vz * Math.min(Number(g.max || basis), h);
  }
  function alterAm(p, iso) {
    const g = new Date(p.geburtsdatum + "T00:00:00"), d = new Date(iso + "T00:00:00");
    return d.getFullYear() - g.getFullYear() - (d.getMonth() < g.getMonth() || (d.getMonth() === g.getMonth() && d.getDate() < g.getDate()) ? 1 : 0);
  }
  const stichtag = () => `${P().stichjahr}-08-01`;
  // Ferienanspruch gilt ab Beginn des Schuljahres, in dem das Altersjahr vollendet wird (Handbuch Berufsauftrag)
  function alter(p) { return alterAm(p, `${P().stichjahr + 1}-07-31`); }
  function njaz(p) { return P().nettoJahresarbeitszeit.find((x) => alter(p) <= x.bisAlter); }

  function rechnung(pid) {
    const p = person(pid);
    const n = njaz(p).stunden;
    const zs = zuteilungenVon(pid);
    const lekt = zs.filter((x) => imBA(x.l));
    const weitere = zs.filter((x) => !imBA(x.l)).map((x) => ({ l: x.l, wert: Number(x.z.wl), einheit: einheit(x.l), prozent: (stundenRichtwert(x.l, x.z.wl) / n) * 100, stunden: stundenRichtwert(x.l, x.z.wl), typ: anstellungstyp(x.l) }));
    const weitereProzent = weitere.reduce((a, w) => a + w.prozent, 0);
    const weitereStunden = weitere.reduce((a, w) => a + w.stunden, 0);
    const klassen = klpAnteile(pid);
    const gefaesse = S.gefaesse.map((g) => ({ g, h: gefaessStunden(g, pid) })).filter((x) => x.h > 0);
    const lehrperson = lekt.length || klassen.length || gefaesse.length || p.bgSoll;
    const basis = { p, njaz: n, weitere, weitereProzent, weitereStunden, warnungen: [], klassen: [], gefaesse: [], bereiche: {}, wl: 0, unterrichtH: 0, klpH: 0, zusatzH: 0, entschaedigtH: 0 };
    if (!lehrperson) return Object.assign(basis, { festProzent: true, pensum: weitereProzent, total: weitereProzent, netto: weitereStunden });
    const zeile = (x) => {
      const wl = umrechnen(x.l, x.z.wl, "WL");
      const f = (x.l.faktor != null ? Number(x.l.faktor) : P().faktorLektion) + (p.berufseinfuehrung ? 1.5 : 0);
      return { l: x.l, z: x.z, wl, faktor: f, stunden: wl * f, typ: anstellungstyp(x.l) };
    };
    const lektionen = lekt.map(zeile);
    const wl = lektionen.reduce((a, x) => a + x.wl, 0);
    const unterrichtH = lektionen.reduce((a, x) => a + x.stunden, 0);
    const kommunalH = lektionen.filter((x) => x.typ === "kommunal").reduce((a, x) => a + x.stunden, 0);
    const klpH = klassen.reduce((a, k) => a + k.stunden, 0);
    const zusatzH = gefaesse.filter((x) => x.g.art === "zusatz" && !x.g.entschaedigt).reduce((a, x) => a + x.h, 0);
    const entschaedigtH = gefaesse.filter((x) => x.g.entschaedigt).reduce((a, x) => a + x.h, 0);
    // Beschäftigungsgrad: BG × Netto-Jahresarbeitszeit = Unterricht + Klassenlehrperson + Zusatz + BG × Pauschalen
    const bg = (unterrichtH + klpH + zusatzH) / (n - pauschale());
    const netto = bg * n;
    const pz = bg * 100;
    const kommunalProzent = unterrichtH + klpH + zusatzH ? pz * (kommunalH / (unterrichtH + klpH + zusatzH)) : 0;
    const bereiche = {};
    for (const [b, h] of Object.entries(PAUSCHALE())) {
      bereiche[b] = { soll: h * bg, verplant: gefaesse.filter((x) => x.g.art === "pauschal" && x.g.bereich === b).reduce((a, x) => a + x.h, 0) };
    }
    const flexH = gefaesse.filter((x) => x.g.art === "pauschal" && x.g.bereich === "Flex").reduce((a, x) => a + x.h, 0);
    const frei = Object.values(bereiche).reduce((a, x) => a + Math.max(0, x.soll - x.verplant), 0);
    const anteilU = netto ? (unterrichtH / netto) * 100 : 0;
    // Vereinbarter Beschäftigungsgrad (Soll) gegen Zuteilung (Ist)
    const soll = p.bgSoll != null ? (() => { const f = p.bgSoll / 100; const sollH = f * n; const istH = unterrichtH + klpH + zusatzH + f * pauschale(); return { prozent: p.bgSoll, sollH, istH, diffH: istH - sollH }; })() : null;
    const warnungen = [];
    if (pz < P().mindestpensum - 0.05) warnungen.push({ text: `Beschäftigungsgrad unter ${P().mindestpensum} % (Mindestpensum in der Regel)`, recht: ["LPG", "6", "Abs. 1"] });
    if (pz > P().maxPensum + 0.05) warnungen.push({ text: `Beschäftigungsgrad über ${P().maxPensum} %`, recht: ["LPVO", "9"] });
    if (netto && anteilU < P().anteilUnterrichtMin) warnungen.push({ text: `60-%-Regel verletzt: nur ${zahl(anteilU)} % der Netto-Arbeitszeit im Unterricht`, recht: ["LPG", "6", "Abs. 2"] });
    if (soll && Math.abs(soll.diffH) > 5) warnungen.push({ text: `Zuteilung weicht vom vereinbarten Beschäftigungsgrad (${zahl(soll.prozent)} %) um ${soll.diffH > 0 ? "+" : "−"}${zahl(Math.abs(soll.diffH))} h ab`, recht: ["LPVO", "9"] });
    for (const k of klassen) if (k.wlInKlasse < P().klpMindestlektionen) warnungen.push({ text: `Klassenlehrperson ${k.klasse}: nur ${k.wlInKlasse} WL in der Klasse (mindestens ${P().klpMindestlektionen})`, recht: ["LPVO", "10 f"] });
    for (const [b, x] of Object.entries(bereiche)) if (x.verplant > x.soll + 0.5) warnungen.push({ text: `Bereich ${b}: ${zahl(x.verplant)} h verplant, Pauschale nur ${zahl(x.soll)} h`, recht: ["LPVO", { Schule: "10 a", Zusammenarbeit: "10 b", Weiterbildung: "10 c" }[b]] });
    if (flexH > frei + 0.5) warnungen.push({ text: `Flexible Aufgaben (${zahl(flexH)} h) übersteigen die nicht zugewiesene Zeit (${zahl(frei)} h)`, recht: ["LPVO", "10", "Abs. 1"] });
    for (const x of gefaesse) if (x.g.kustodie && !x.g.entschaedigt && x.h > P().kustodieMaxStunden) warnungen.push({ text: `${x.g.name}: über ${P().kustodieMaxStunden} h – zusätzlich entschädigen`, recht: ["LPVO", "2 f"] });
    return Object.assign(basis, { lektionen, wl, faktor: P().faktorLektion + (p.berufseinfuehrung ? 1.5 : 0), unterrichtH, kommunalH, klpH, klassen, gefaesse, zusatzH, entschaedigtH,
      netto, bereiche, flexH, reserve: frei - flexH, anteilU, pensum: pz, kommunalProzent, kantonalProzent: pz - kommunalProzent, total: pz + weitereProzent, soll, warnungen });
  }
  function personRessourcen(pid) {
    const r = {};
    for (const res of S.ressourcen) r[res.id] = 0;
    for (const x of zuteilungenVon(pid)) {
      const res = S.ressourcen.find((y) => y.id === x.l.ressource);
      if (res) r[res.id] += umrechnen(x.l, x.z.wl, res.einheit);
    }
    for (const g of S.gefaesse) if (g.ressource === "pool") r.pool += gefaessStunden(g, pid) / P().faktorLektion;
    return r;
  }
  function stand(pid) {
    const r = rechnung(pid);
    return {
      wl: Math.round(r.wl * 100) / 100,
      stunden: Math.round(r.unterrichtH + r.klpH + r.zusatzH + r.weitereStunden),
      pensum: Math.round(r.total * 10) / 10,
      ressourcen: personRessourcen(pid),
      posten: zuteilungenVon(pid).map((x) => `${eTitel(x.l)} (${x.z.wl} ${einheit(x.l)})`)
        .concat(r.klassen.map((k) => `Klassenlehrperson ${k.klasse} (${zahl(k.stunden)} h)`))
        .concat(r.gefaesse.map((x) => `${x.g.name} (${Math.round(x.h)} h)`)),
    };
  }
  const gleich = (a, b) => JSON.stringify([a.wl, a.stunden, a.posten]) === JSON.stringify([b.wl, b.stunden, b.posten]);
  function status(pid) {
    const f = S.freigaben[pid];
    if (!f || !f.stand) return { key: "entwurf", text: "Entwurf", cls: "neutral", sym: "○" };
    if (!gleich(f.stand, stand(pid))) return { key: "geaendert", text: "Geändert nach Freigabe", cls: "warnung", sym: "△" };
    if (f.angestellt) return { key: "angestellt", text: "Angestellt", cls: "erfolg", sym: "✓" };
    return { key: "freigegeben", text: "Freigegeben", cls: "info", sym: "➜" };
  }
  const badge = (st) => `<span class="badge ${st.cls}"><span aria-hidden="true">${st.sym}</span>${esc(st.text)}</span>`;

  // Stellenberechnung Sekundarstufe: VZE = Schülerzahl × Sozialindex × Korrekturfaktor / (Basiswert × 100)
  function stellenRechnung() {
    const p = P();
    const st = S.stellen;
    const vze = (st.schuelerzahl * st.sozialindex * p.korrekturfaktor) / (p.basiswert * 100);
    const sl = p.slSockel + p.slJeVZE * vze + (vze >= 25 ? Math.floor(vze / 25) * p.slGrossJe25 : 0);
    const pool = p.gestaltungspoolJeVZE * vze;
    const koordination = p.koordinationSekJeVZE * vze;
    const therapieMax = (p.therapieMaxJe100 * st.schuelerzahl) / 100;
    const dazWL = st.dazErstesJahr * p.dazErstesJahrWL + st.dazFolgejahre * p.dazFolgejahrWL;
    const bedarfKlassenVZE = S.klassen.reduce((a, k) => a + tafel(k).vze, 0);
    return { vze, wlBA: vze * p.lektionenJeVZE, sl, pool, wlPool: pool * p.lektionenJeVZE, koordination, therapieMax, dazWL, bedarfKlassenVZE };
  }
  function budget(r) {
    if (!r.berechnet) return Number(r.budget || 0);
    const s = stellenRechnung();
    return { ba: s.wlBA, pool: s.wlPool, daz: s.dazWL, sl: s.sl * 100 }[r.id] || 0;
  }
  function klassengroesse(k) {
    const max = P().maxKlassengroesse[k.abteilung];
    if (k.schueler > max + 3) return { cls: "fehler", sym: "✕", text: `${k.schueler} / max. ${max} – Massnahme zwingend (Halbklassen, Teamteaching oder Teilung)` };
    if (k.schueler > max) return { cls: "warnung", sym: "△", text: `${k.schueler} / max. ${max} – über der Höchstzahl` };
    return { cls: "erfolg", sym: "✓", text: `${k.schueler} / max. ${max}` };
  }

  function verbrauch(sicht) {
    // sicht: "sl" = Planungsstand, "sv" = nur freigegebene Stände
    const res = {};
    for (const r of S.ressourcen) res[r.id] = { verplant: 0, bedarf: 0, posten: [] };
    for (const l of S.lektionen) { const r = S.ressourcen.find((x) => x.id === l.ressource); if (r) res[r.id].bedarf += umrechnen(l, sollLp(l), r.einheit); }
    for (const p of S.personen) {
      const quelle = sicht === "sv" ? (S.freigaben[p.id] && S.freigaben[p.id].stand && S.freigaben[p.id].stand.ressourcen) : personRessourcen(p.id);
      if (!quelle) continue;
      for (const [rid, wert] of Object.entries(quelle)) {
        if (!res[rid] || !wert) continue;
        res[rid].verplant += wert;
        res[rid].posten.push({ pid: p.id, wert });
      }
    }
    for (const g of S.gefaesse) if (g.ressource === "pool") res.pool.bedarf += g.teilnehmende.reduce((a, pid) => a + gefaessStunden(g, pid), 0) / P().faktorLektion;
    return res;
  }

  function tagesstrukturRechnung() {
    const p = P();
    const dauer = (a) => { const [h1, m1] = a.von.split(":").map(Number); const [h2, m2] = a.bis.split(":").map(Number); return (h2 * 60 + m2 - h1 * 60 - m1) / 60; };
    const zeilen = S.angebote.map((a) => {
      const personal = Math.max(p.mindestbesetzung, Math.ceil(a.kinder / p.betreuungsschluessel));
      const jahresH = personal * dauer(a) * p.schulwochen;
      return { a, personal, stunden: dauer(a), jahresH };
    });
    const sollH = zeilen.reduce((x, z) => x + z.jahresH, 0);
    const sollProzent = (sollH / p.jahresarbeitszeitBetreuung) * 100;
    const einsaetze = S.lektionen.filter((l) => l.ressource === "betreuung");
    const ist = einsaetze.reduce((x, l) => x + l.zuteilung.reduce((a, z) => a + (stundenRichtwert(l, z.wl) / p.jahresarbeitszeitBetreuung) * 100, 0), 0);
    return { zeilen, sollH, sollProzent, ist, einsaetze };
  }

  // ---------------------------------------------------------------- Rahmen
  const NAVI = [
    ["uebersicht", "Übersicht", "alle"],
    ["gruppe", "Planung"],
    ["stellenplan", "Stellenplan und VZE", "sl sv"],
    ["vzetool", "VZE-Tool (VSA)", "sl sv"],
    ["klassen", "Klassen", "sl sv"],
    ["unterricht", "Unterricht und Einsätze", "sl sv"],
    ["matrix", "Klasse – Fach – Lehrperson", "sl sv"],
    ["personen", "Personen und Pensen", "sl sv"],
    ["berufsauftrag", "Berufsauftrag", "sl sv"],
    ["ressourcen", "Ressourcen", "sl sv"],
    ["freigaben", "Freigaben", "sl sv"],
    ["gruppe", "Abläufe"],
    ["jahresablauf", "Jahresablauf und Fristen", "sl sv"],
    ["umfrage", "Pensenumfrage", "sl"],
    ["stellvertretung", "Stellvertretungen", "sl sv"],
    ["gespraeche", "Personalgespräche", "sl sv"],
    ["tagesstrukturen", "Tagesstrukturen", "sl sv bl"],
    ["gruppe", "Einstellungen"],
    ["hilfe", "Hilfe und Gesetze", "alle"],
    ["parameter", "Parameter und Lektionentafeln", "sl sv"],
  ];
  const rolleKurz = () => ({ schulleitung: "sl", verwaltung: "sv", betreuung: "bl" }[S.rolle]);
  function erlaubt(seite) {
    const e = NAVI.find((n) => n[0] === seite);
    if (!e) return ["person", "einsatz", "klasse"].includes(seite) && !istBL();
    return e[2] === "alle" || e[2].split(" ").includes(rolleKurz());
  }

  function rahmen(seite, inhalt) {
    const navi = NAVI.map((n) => {
      if (n[0] === "gruppe") return `<li class="gruppe" aria-hidden="true">${esc(n[1])}</li>`;
      if (!erlaubt(n[0])) return "";
      const aktiv = seite === n[0] || ({ person: "personen", einsatz: "unterricht", klasse: "klassen" }[seite] === n[0]);
      return `<li><a href="#/${n[0]}" ${aktiv ? 'aria-current="page"' : ""}>${ICONS[n[0]]}<span>${esc(n[1])}</span></a></li>`;
    }).join("") + `<li class="gruppe" aria-hidden="true">Entwicklung</li><li><a href="entwickler/" title="Datenmodell und API – Entwurf für die Umsetzung">${ico('<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 4-4 16"/>')}<span>Entwickler</span></a></li>`;
    const schulen = S.schulen.map((s) => `<option value="${s.id}" ${s.id === S.schule ? "selected" : ""}>${esc(s.name)}</option>`).join("");
    const jahre = S.schuljahre.map((j) => `<option ${j === S.schuljahr ? "selected" : ""}>${esc(j)}</option>`).join("");
    const rollen = Object.entries(ROLLEN).map(([k, v]) => `<option value="${k}" ${k === S.rolle ? "selected" : ""}>${esc(v)}</option>`).join("");
    const dunkel = document.documentElement.classList.contains("dark");
    return `
      <header class="kopf">
        <a class="marke" href="#/uebersicht">${ICON_STAFFING}${wordmark("Staffing")}</a>
        <span class="muted small">Einsatzplanung</span>
        <a class="btn zurueck" href="../" title="Zurück zur Einstiegsseite aller EduKSX-Prototypen" aria-label="Zurück zur Einstiegsseite aller EduKSX-Prototypen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>
        <div class="werkzeuge">
          <label class="sr-only" for="w-schule">Schule</label><select id="w-schule" data-aktion="schule">${schulen}</select>
          <label class="sr-only" for="w-jahr">Schuljahr</label><select id="w-jahr" data-aktion="schuljahr">${jahre}</select>
          <label class="sr-only" for="w-rolle">Rolle</label><select id="w-rolle" data-aktion="rolle" title="Rolle im Prototyp wechseln">${rollen}</select>
          <button class="btn" data-aktion="thema" aria-pressed="${dunkel}" title="Hell/Dunkel">${dunkel ? "☀ Hell" : "☾ Dunkel"}</button>
          <button class="btn" data-aktion="glossar" aria-pressed="${glossarAn()}" title="Abkürzungen mit EduKSX-Glossary erklären">${glossarAn() ? "Ⓖ Begriffe an" : "Ⓖ Begriffe aus"}</button>
          <button class="btn" data-aktion="zuruecksetzen" title="Testdaten neu laden">↺ Testdaten</button>
        </div>
      </header>
      <div class="hinweis-band" role="note"><strong>Prototyp</strong> – Personen, Schule und Schülerzahlen sind erfunden. Parameter nach den öffentlichen Vorgaben des Kantons Zürich (Weisung VZE 2026/27, Berufsauftrag), ohne Gewähr.</div>
      <div class="rahmen">
        <nav class="navi" aria-label="Hauptnavigation"><ul>${navi}</ul></nav>
        <main id="inhalt" tabindex="-1">${inhalt}</main>
      </div>
      <footer class="fuss"><span>${wordmark("Staffing")} · Prototyp 0.2.1 · in Entwicklung · <a href="../">Alle Prototypen</a> · Begriffe: <a href="https://glossary.eduksx.ch">EduKSX-Glossary</a> (CC BY 4.0)</span><span>Developed by ${WM_DEV}</span></footer>
      <div class="sr-only" aria-live="polite" id="ansage"></div>`;
  }

  // ---------------------------------------------------------------- Seiten
  const seiten = {};

  seiten.uebersicht = function () {
    const lp = planbar();
    const offen = S.lektionen.filter((l) => imBA(l) && einheit(l) === "WL" && istLp(l) < sollLp(l) - 0.005);
    const offenWL = offen.reduce((a, l) => a + (sollLp(l) - istLp(l)) * semF(l), 0);
    const v = verbrauch("sl");
    const saldo = S.ressourcen.filter((r) => r.einheit === "WL").reduce((a, r) => a + (budget(r) - v[r.id].verplant), 0);
    const sts = lp.map((p) => status(p.id).key);
    const eingereicht = Object.values(S.umfrage).filter((u) => u.status === "eingereicht").length;
    const aktiv = S.ausfaelle.filter((a) => a.status !== "an Kanton gemeldet").length;
    const vze = lp.reduce((a, p) => a + rechnung(p.id).pensum, 0) / 100;
    const ts = tagesstrukturRechnung();
    if (istBL()) {
      return `<div class="seitenkopf"><div><h1>Übersicht Tagesstrukturen</h1><p class="muted">${esc(S.schuljahr)} · Rolle ${esc(ROLLEN[S.rolle])}</p></div></div>
      <div class="karten">
        <div class="karte"><div class="titel">Personalbedarf (Soll)</div><div class="zahl">${zahl(ts.sollProzent)} %</div></div>
        <div class="karte"><div class="titel">Geplante Pensen (Ist)</div><div class="zahl">${zahl(ts.ist)} %</div></div>
        <div class="karte"><div class="titel">Differenz</div><div class="zahl">${zahl(ts.ist - ts.sollProzent)} %</div></div>
      </div><p><a href="#/tagesstrukturen">Zur Planung der Tagesstrukturen</a></p>`;
    }
    const schritte = [];
    if (offen.length) schritte.push(`<li>${offen.length} Lektionengefässe (${offenWL} WL) sind noch offen – <a href="#/unterricht?offen=1">zuweisen</a> (<a href="#/matrix">Matrix</a>)</li>`);
    const entwurf = sts.filter((s) => s === "entwurf").length;
    if (entwurf && istSL()) schritte.push(`<li>${entwurf} Personen sind noch nicht zur Anstellung freigegeben – <a href="#/freigaben">Freigaben</a></li>`);
    const geaendert = sts.filter((s) => s === "geaendert").length;
    if (geaendert) schritte.push(`<li>${geaendert} Planungen wurden nach der Freigabe geändert – <a href="#/freigaben">prüfen</a></li>`);
    const uberzogen = S.ressourcen.filter((r) => budget(r) - v[r.id].verplant < -0.05);
    const mitWarnung = lp.filter((p) => rechnung(p.id).warnungen.length);
    if (mitWarnung.length) schritte.push(`<li>${mitWarnung.length} Personen verletzen eine Regel des Berufsauftrags (Mindestpensum, 60-%-Regel, Klassenlehrperson) – ${mitWarnung.map((p) => `<a href="#/person/${p.id}">${esc(p.name)}</a>`).join(", ")}</li>`);
    const grosse = S.klassen.filter((k) => klassengroesse(k).cls !== "erfolg");
    if (grosse.length) schritte.push(`<li>Klassengrösse über der Höchstzahl: ${grosse.map((k) => esc(k.id)).join(", ")} – <a href="#/stellenplan">Stellenplan</a></li>`);
    for (const r of uberzogen) schritte.push(`<li>Budget «${esc(r.name)}» ist überschritten – <a href="#/ressourcen">Ressourcen</a></li>`);
    const ausstehend = Object.values(S.umfrage).filter((u) => u.status !== "eingereicht").length;
    if (ausstehend && istSL()) schritte.push(`<li>${ausstehend} Pensenumfragen sind noch nicht eingereicht – <a href="#/umfrage">Umfrage</a></li>`);
    return `
      <div class="seitenkopf"><div><h1>Übersicht</h1><p class="muted">${esc(S.schulen.find((s) => s.id === S.schule).name)} · Schuljahr ${esc(S.schuljahr)} · Rolle ${esc(ROLLEN[S.rolle])}</p></div></div>
      <div class="karten">
        <div class="karte"><div class="titel">VZE Berufsauftrag (zugeteilt)</div><div class="zahl">${zahl(stellenRechnung().vze, 2)}</div><div class="small muted"><a href="#/stellenplan">Stellenplan</a></div></div>
        <div class="karte"><div class="titel">Nächste Frist</div><div class="zahl" style="font-size:1.1rem">${(() => { const t = S.termine.find((x) => x.datum >= P().planungsdatum); return t ? datum(t.datum) : "–"; })()}</div><div class="small muted">${(() => { const t = S.termine.find((x) => x.datum >= P().planungsdatum); return t ? esc(t.titel) : ""; })()}</div></div>
        <div class="karte"><div class="titel">Geplante Vollzeiteinheiten</div><div class="zahl">${zahl(vze, 2)}</div><div class="small muted">${lp.length} Personen</div></div>
        <div class="karte"><div class="titel">Offene Lektionen</div><div class="zahl">${zahl(offenWL)} WL</div><div class="small muted">${offen.length} Gefässe</div></div>
        <div class="karte"><div class="titel">Saldo Lektionen-Ressourcen</div><div class="zahl">${saldo < 0 ? "−" : ""}${zahl(Math.abs(saldo), 1)} WL</div><div class="small muted">Budget minus verplant</div></div>
        <div class="karte"><div class="titel">Freigegeben bzw. angestellt</div><div class="zahl">${sts.filter((s) => s === "freigegeben" || s === "angestellt").length} / ${lp.length}</div><div class="small muted">${geaendert} geändert nach Freigabe</div></div>
        <div class="karte"><div class="titel">Pensenumfrage</div><div class="zahl">${eingereicht} / ${Object.keys(S.umfrage).length}</div><div class="small muted">eingereicht</div></div>
        <div class="karte"><div class="titel">Stellvertretungen in Arbeit</div><div class="zahl">${aktiv}</div><div class="small muted">${S.ausfaelle.length} Ausfälle erfasst</div></div>
      </div>
      <div class="spalten">
        <section class="karte"><h2>Nächste Schritte</h2>${schritte.length ? `<ul>${schritte.join("")}</ul>` : '<p class="muted">Keine offenen Punkte.</p>'}</section>
        <section class="karte"><h2>Letzte Änderungen</h2>${S.verlauf.length ? `<ul class="small">${S.verlauf.slice(0, 6).map((e) => `<li><span class="muted">${zeit(e.zeit)} · ${esc(ROLLEN[e.rolle] || "")}</span> – ${esc(e.text)}</li>`).join("")}</ul>` : '<p class="muted">Noch keine Änderungen in dieser Sitzung.</p>'}</section>
      </div>`;
  };

  // ---------------------------------------------------------------- Einsätze: Lektionen, Sonderpädagogik, Anstellungen
  const kuerzel = (pid) => (person(pid) ? person(pid).kuerzel || person(pid).name : "–");
  const fmtE = (l, w) => `${zahl(w, Number.isInteger(Number(w)) ? 0 : 2)} ${einheit(l) === "%" ? "%" : einheit(l)}`;
  function diffBadge(d, l) {
    if (Math.abs(d) < 0.005) return '<span class="badge erfolg"><span aria-hidden="true">✓</span>gedeckt</span>';
    return d < 0 ? `<span class="badge warnung"><span aria-hidden="true">△</span>${fmtE(l, -d)} offen</span>` : `<span class="badge fehler"><span aria-hidden="true">✕</span>${fmtE(l, d)} zu viel</span>`;
  }
  seiten.unterricht = function (q) {
    const g = q.get("gruppe") || "klasse";
    const klasse = q.get("klasse") || "";
    const nurOffen = q.get("offen") === "1";
    const rn = RESS_NAME();
    const liste = S.lektionen.filter((l) => gruppe(l) === g && (!klasse || l.klasse === klasse) && (!nurOffen || Math.abs(sollLp(l) - istLp(l)) > 0.005));
    const tab = (k) => `<button role="tab" aria-selected="${g === k}" data-aktion="einsatz-gruppe" data-gruppe="${k}">${GRUPPEN[k]} <span class="small muted">(${S.lektionen.filter((l) => gruppe(l) === k).length})</span></button>`;
    const zeilen = liste.map((l) => {
      const soll = sollLp(l), ist = istLp(l);
      return `<tr><td><a href="#/einsatz/${l.id}">${esc(eTitel(l))}</a>${l.kategorie ? `<div class="small muted">${esc(l.kategorie)}${l.stufe ? " · " + esc(l.stufe) : ""}</div>` : ""}</td>
        <td class="small">${esc(rn[l.ressource] || l.ressource)}<div class="muted">${anstellungstyp(l)}</div></td>
        <td class="zahl">${einheit(l) === "WL" && g !== "anstellung" ? zahl(l.wlSus || 0) : "–"}</td>
        <td class="zahl">${fmtE(l, soll)}</td>
        <td>${l.zuteilung.length ? l.zuteilung.map((z) => `<a href="#/person/${z.person}" title="${esc(pname(z.person))}">${esc(kuerzel(z.person))}</a> ${zahl(z.wl, Number.isInteger(Number(z.wl)) ? 0 : 1)}`).join(" · ") : '<span class="muted">–</span>'}</td>
        <td class="zahl">${fmtE(l, ist)}</td><td>${diffBadge(ist - soll, l)}</td>
        <td class="small">${semF(l) < 1 ? (l.semester[0] ? "1. Sem." : "2. Sem.") : "ganzjährig"}${l.faktor != null ? `<div>Faktor ${zahl(l.faktor)}</div>` : ""}</td></tr>`;
    }).join("");
    const kOpts = `<option value="">alle</option>` + S.klassen.map((k) => `<option ${k.id === klasse ? "selected" : ""}>${k.id}</option>`).join("");
    const summeSoll = liste.reduce((a, l) => a + umrechnen(l, sollLp(l), "WL"), 0), summeIst = liste.reduce((a, l) => a + umrechnen(l, istLp(l), "WL"), 0);
    return `<div class="seitenkopf"><div><h1>Unterricht und Einsätze</h1><p class="muted">Jedes Gefäss hat ein Soll (Lehrpersonen-Lektionen, Stellenprozent oder Wochenstunden) und wird einer oder mehreren Personen zugeteilt. Halbklassen verdoppeln die Lektionen der Lehrpersonen; Semesterfächer zählen halb. Abweichender Faktor je Gefäss: ${R("LPVO", "10", "Abs. 1")}.</p></div>
      <div class="aktionen">${istSL() ? `<button class="btn primaer" data-aktion="einsatz-neu" data-gruppe="${g}">+ ${g === "anstellung" ? "Anstellung" : "Gefäss"}</button>` : ""}</div></div>
      ${istSV() ? '<div class="meldung info">Die Schulverwaltung sieht den Planungsstand nur lesend.</div>' : ""}
      <div class="reiter" role="tablist">${Object.keys(GRUPPEN).map(tab).join("")}</div>
      <div class="formzeile">${g !== "anstellung" ? `<label class="feld">Klasse<select data-aktion="filter-klasse">${kOpts}</select></label>` : ""}
        <label class="feld"><span><input type="checkbox" data-aktion="filter-offen" ${nurOffen ? "checked" : ""}> nur Gefässe mit Differenz</span></label>
        <span class="muted small">${liste.length} Gefässe · Soll ${zahl(summeSoll, 1)} · zugeteilt ${zahl(summeIst, 1)} (WL-Richtwert)</span></div>
      <div class="tabelle-wrap"><table><thead><tr><th>Gefäss</th><th>Ressource / Anstellung</th><th class="zahl">WL Schüler/innen</th><th class="zahl">Soll</th><th>Zuteilung (Kürzel)</th><th class="zahl">Ist</th><th>Differenz</th><th>Zeit</th></tr></thead>
      <tbody>${zeilen || '<tr><td colspan="8" class="muted">Keine Gefässe für diesen Filter.</td></tr>'}</tbody></table></div>`;
  };

  seiten.einsatz = function (q, id) {
    const l = S.lektionen.find((x) => x.id === id);
    if (!l) return "<p>Gefäss nicht gefunden.</p>";
    const d = istSL() ? "" : "disabled";
    const soll = sollLp(l), ist = istLp(l);
    const kandidaten = S.personen.filter((p) => !l.zuteilung.some((z) => z.person === p.id));
    const zt = l.zuteilung.map((z, i) => `<tr><td><a href="#/person/${z.person}">${esc(pname(z.person))}</a> <span class="muted small">${esc(kuerzel(z.person))}</span></td>
      <td class="zahl"><input type="number" min="0" step="${einheit(l) === "WL" ? 1 : 0.5}" value="${z.wl}" data-aktion="zt-wert" data-id="${l.id}" data-i="${i}" aria-label="Anteil ${esc(pname(z.person))}" ${d}> ${einheit(l)}</td>
      <td class="zahl">${zahl(bgRichtwert(l, z.wl), 2)} %</td>${istSL() ? `<td><button class="btn klein" data-aktion="zt-weg" data-id="${l.id}" data-i="${i}" aria-label="${esc(pname(z.person))} entfernen">✕</button></td>` : ""}</tr>`).join("");
    const rn = RESS_NAME();
    const feld = (t, html) => `<div class="feldzeile"><span class="muted">${t}</span><span>${html}</span></div>`;
    return `<p class="small"><a href="#/unterricht?gruppe=${gruppe(l)}">← ${GRUPPEN[gruppe(l)]}</a></p>
      <div class="seitenkopf"><div><h1>${esc(eTitel(l))}</h1><p class="muted">${esc(GRUPPEN[gruppe(l)])}${l.kategorie ? " · " + esc(l.kategorie) : ""}${l.klasse ? ` · Klasse <a href="#/klasse/${l.klasse}">${esc(l.klasse)}</a>` : ""} · ${anstellungstyp(l)}</p></div>
        <div class="aktionen">${diffBadge(ist - soll, l)}${istSL() ? ` <button class="btn gefahr" data-aktion="einsatz-loeschen" data-id="${l.id}">Löschen …</button>` : ""}</div></div>
      <div class="spalten">
        <section class="karte"><h2>Soll</h2><div class="feldliste">
          ${feld("Einheit", `<select data-aktion="e-feld" data-id="${l.id}" data-feld="einheit" ${d}>${Object.entries(EINHEITEN).map(([k, v]) => `<option value="${k}" ${einheit(l) === k ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`)}
          ${einheit(l) === "WL" ? feld("WL Schüler/innen", `<input type="number" min="0" value="${l.wlSus || 0}" data-aktion="e-feld" data-id="${l.id}" data-feld="wlSus" ${d}>`) + feld("in Halbklassen", `<input type="checkbox" data-aktion="e-feld" data-id="${l.id}" data-feld="halbklassen" ${l.halbklassen ? "checked" : ""} ${d}> <span class="small muted">verdoppelt die Lektionen der Lehrpersonen</span>`) : ""}
          ${feld(einheit(l) === "WL" ? "WL Lehrpersonen (Soll)" : "Soll", `<input type="number" min="0" step="0.5" value="${l.wlLp != null ? l.wlLp : ""}" placeholder="${soll}" data-aktion="e-feld" data-id="${l.id}" data-feld="wlLp" ${d}> <span class="small muted">${l.wlLp != null ? "abweichend festgelegt" : "berechnet: " + fmtE(l, soll)}</span>`)}
          ${feld("BG-Richtwert", `${zahl(bgRichtwert(l, soll), 2)} % Soll · ${zahl(bgRichtwert(l, ist), 2)} % Ist`)}
          ${einheit(l) === "WL" ? feld("Semester", `<label><input type="checkbox" data-aktion="e-sem" data-id="${l.id}" data-i="0" ${l.semester[0] ? "checked" : ""} ${d}> 1.</label> <label><input type="checkbox" data-aktion="e-sem" data-id="${l.id}" data-i="1" ${l.semester[1] ? "checked" : ""} ${d}> 2.</label>`) + feld("Faktor (h je WL)", `<input type="number" min="0" step="0.5" value="${l.faktor != null ? l.faktor : ""}" placeholder="${P().faktorLektion}" data-aktion="e-feld" data-id="${l.id}" data-feld="faktor" ${d}> <span class="small">${R("LPVO", "10", "Abs. 1")}</span>`) : ""}
          ${feld("Ressource", `<select data-aktion="e-feld" data-id="${l.id}" data-feld="ressource" ${d}>${S.ressourcen.map((r) => `<option value="${r.id}" ${r.id === l.ressource ? "selected" : ""}>${esc(r.name)}</option>`).join("")}</select>`)}
          ${feld("Anstellung", `${anstellungstyp(l)} <span class="small muted">(aus der Ressource)</span>`)}
          ${feld("Stufe", `<input type="text" value="${esc(l.stufe || (l.klasse ? "Sek" : ""))}" data-aktion="e-feld" data-id="${l.id}" data-feld="stufe" ${d}>`)}
        </div></section>
        <section class="karte"><h2>Zuteilung</h2>
          <div class="tabelle-wrap"><table><thead><tr><th>Person</th><th class="zahl">Anteil</th><th class="zahl">BG-Richtwert</th>${istSL() ? "<th></th>" : ""}</tr></thead><tbody>${zt || '<tr><td colspan="4" class="muted">noch niemand</td></tr>'}
            <tr class="summe"><td>Ist</td><td class="zahl">${fmtE(l, ist)}</td><td class="zahl">${zahl(bgRichtwert(l, ist), 2)} %</td>${istSL() ? "<td></td>" : ""}</tr></tbody></table></div>
          ${istSL() ? `<div class="formzeile" style="margin-top:.75rem"><label class="feld">Person hinzufügen<select data-aktion="zt-dazu" data-id="${l.id}"><option value="">wählen …</option>${kandidaten.map((p) => `<option value="${p.id}">${esc(p.name)} (${esc(p.kuerzel || "")})${l.fach && p.faecher.includes(l.fach) ? " ✓ Fach" : ""}</option>`).join("")}</select></label></div>` : ""}
          <h3 style="margin-top:1rem">Bemerkungen</h3><textarea rows="3" style="width:100%" data-aktion="e-feld" data-id="${l.id}" data-feld="bemerkung" ${d}>${esc(l.bemerkung || "")}</textarea>
        </section>
      </div>`;
  };

  seiten.klassen = function () {
    const zeilen = S.klassen.map((k) => {
      const t = tafel(k); const g = klassengroesse(k); const ks = klasseZahlen(k);
      return `<tr><td><a href="#/klasse/${k.id}">${esc(k.id)}</a>${k.nameVorjahr ? `<div class="small muted">Vorjahr ${esc(k.nameVorjahr)}</div>` : ""}</td><td class="small">${esc(t.name)}</td>
        <td><span class="badge ${g.cls}"><span aria-hidden="true">${g.sym}</span>${esc(g.text)}</span></td>
        <td>${k.klp.map((pid) => `<a href="#/person/${pid}" title="${esc(pname(pid))}">${esc(kuerzel(pid))}</a>`).join(" / ") || '<span class="badge warnung"><span aria-hidden="true">△</span>fehlt</span>'}</td>
        <td class="zahl">${zahl(ks.klpIst)} / ${zahl(ks.klpSoll)} h</td><td class="zahl">${zahl(ks.wlSus)}</td><td class="zahl">${zahl(ks.wlLpIst)} / ${zahl(ks.wlLpSoll)}</td>
        <td>${Math.abs(ks.wlLpIst - ks.wlLpSoll) < 0.005 && Math.abs(ks.klpIst - ks.klpSoll) < 0.5 ? '<span class="badge erfolg"><span aria-hidden="true">✓</span>vollständig</span>' : `<span class="badge warnung"><span aria-hidden="true">△</span>${ks.wlLpSoll - ks.wlLpIst ? zahl(ks.wlLpSoll - ks.wlLpIst) + " WL offen" : ""}${Math.abs(ks.klpIst - ks.klpSoll) >= 0.5 ? " KLP " + zahl(ks.klpIst - ks.klpSoll) + " h" : ""}</span>`}</td></tr>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Klassen</h1><p class="muted">Klassenlehrpersonen (100 h je Klasse, frei aufteilbar – ${R("LPVO", "10 f")}), Lektionen der Schüler/innen und der Lehrpersonen (Soll und zugeteilt).</p></div></div>
      <div class="tabelle-wrap"><table><thead><tr><th>Klasse</th><th>Lektionentafel</th><th>Schüler/innen</th><th>Klassenlehrperson</th><th class="zahl">KLP-Stunden</th><th class="zahl">WL Schüler/innen</th><th class="zahl">WL Lehrpersonen</th><th>Stand</th></tr></thead><tbody>${zeilen}</tbody></table></div>`;
  };
  function klasseZahlen(k) {
    const ls = S.lektionen.filter((l) => l.klasse === k.id && gruppe(l) === "klasse");
    const klpSoll = P().klassenlehrperson;
    const klpIst = k.klp.reduce((a, pid) => a + (k.klpStunden && k.klpStunden[pid] != null ? Number(k.klpStunden[pid]) : klpSoll / k.klp.length), 0);
    return { ls, klpSoll, klpIst, wlSus: ls.reduce((a, l) => a + Number(l.wlSus || 0) * semF(l), 0), wlLpSoll: ls.reduce((a, l) => a + sollLp(l) * semF(l), 0), wlLpIst: ls.reduce((a, l) => a + istLp(l) * semF(l), 0) };
  }
  seiten.klasse = function (q, id) {
    const k = S.klassen.find((x) => x.id === id);
    if (!k) return "<p>Klasse nicht gefunden.</p>";
    const d = istSL() ? "" : "disabled";
    const ks = klasseZahlen(k); const t = tafel(k); const g = klassengroesse(k);
    const klp = k.klp.map((pid) => `<tr><td><a href="#/person/${pid}">${esc(pname(pid))}</a></td><td class="zahl"><input type="number" min="0" max="100" step="5" value="${k.klpStunden && k.klpStunden[pid] != null ? k.klpStunden[pid] : zahl(P().klassenlehrperson / k.klp.length)}" data-aktion="klp-h" data-klasse="${k.id}" data-p="${pid}" ${d}> h</td>${istSL() ? `<td><button class="btn klein" data-aktion="klp-weg" data-klasse="${k.id}" data-p="${pid}">✕</button></td>` : ""}</tr>`).join("");
    const lz = ks.ls.map((l) => `<tr><td><a href="#/einsatz/${l.id}">${esc(eTitel(l))}</a></td><td class="zahl">${zahl(l.wlSus || 0)}</td><td class="zahl">${zahl(sollLp(l))}</td><td>${l.zuteilung.map((z) => `${esc(kuerzel(z.person))} ${z.wl}`).join(" · ") || "–"}</td><td>${diffBadge(istLp(l) - sollLp(l), l)}</td></tr>`).join("");
    return `<p class="small"><a href="#/klassen">← Klassen</a></p>
      <div class="seitenkopf"><div><h1>Klasse ${esc(k.id)}</h1><p class="muted">${esc(t.name)} · <span class="badge ${g.cls}"><span aria-hidden="true">${g.sym}</span>${esc(g.text)}</span>${k.nameVorjahr ? " · Vorjahr " + esc(k.nameVorjahr) : ""}</p></div></div>
      <div class="karten">
        <div class="karte"><div class="titel">WL Schüler/innen</div><div class="zahl">${zahl(ks.wlSus)}</div><div class="small muted">Pflichtlektionen je Schüler/in ${esc(String(t.pflicht))}</div></div>
        <div class="karte"><div class="titel">WL Lehrpersonen</div><div class="zahl">${zahl(ks.wlLpIst)} / ${zahl(ks.wlLpSoll)}</div><div class="small muted">zugeteilt / Soll (inkl. Halbklassen)</div></div>
        <div class="karte"><div class="titel">Klassenlehrperson</div><div class="zahl">${zahl(ks.klpIst)} / ${zahl(ks.klpSoll)} h</div><div class="small muted">${R("LPVO", "10 f")}</div></div>
        <div class="karte"><div class="titel">VZE der Klasse</div><div class="zahl">${zahl(t.vze, 2)}</div><div class="small muted">nach Tabelle VSA</div></div>
      </div>
      <div class="spalten">
        <section class="karte"><h2>Klassenlehrperson(en)</h2><div class="tabelle-wrap"><table><tbody>${klp || '<tr><td class="muted">keine</td></tr>'}</tbody></table></div>
          ${istSL() ? `<div class="formzeile" style="margin-top:.5rem"><label class="feld">Person hinzufügen<select data-aktion="klp-dazu" data-klasse="${k.id}"><option value="">wählen …</option>${lehrpersonen().filter((p) => !k.klp.includes(p.id)).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label></div>` : ""}
          <div class="formzeile" style="margin-top:.75rem"><label class="feld">Schüler/innen<input type="number" min="0" value="${k.schueler}" data-aktion="schueler" data-klasse="${k.id}" ${d}></label><label class="feld">Name im Vorjahr<input type="text" value="${esc(k.nameVorjahr || "")}" data-aktion="k-feld" data-klasse="${k.id}" data-feld="nameVorjahr" ${d}></label></div>
          <h3>Bemerkungen</h3><textarea rows="3" style="width:100%" data-aktion="k-feld" data-klasse="${k.id}" data-feld="bemerkung" ${d}>${esc(k.bemerkung || "")}</textarea></section>
        <section><h2>Lektionen</h2><div class="tabelle-wrap"><table><thead><tr><th>Gefäss</th><th class="zahl">WL SuS</th><th class="zahl">WL Lp</th><th>Zuteilung</th><th>Stand</th></tr></thead><tbody>${lz}</tbody></table></div></section>
      </div>`;
  };

  seiten.matrix = function () {
    const ks = S.klassen;
    const kl = S.lektionen.filter((l) => gruppe(l) === "klasse" && l.klasse);
    const faecher = Object.keys(S.faecher).filter((f) => kl.some((l) => l.fach === f));
    const klpVon = (pid) => S.klassen.filter((k) => k.klp.includes(pid)).map((k) => k.id);
    const zelle = (k, f) => {
      const ls = kl.filter((l) => l.klasse === k.id && l.fach === f);
      if (!ls.length) return '<td class="muted" aria-label="kein Fach">·</td>';
      const pids = [...new Set(ls.flatMap((l) => l.zuteilung.map((z) => z.person)))];
      const offen = ls.some((l) => istLp(l) < sollLp(l) - 0.005);
      const hier = pids.some((pid) => k.klp.includes(pid));
      const andere = !hier && pids.some((pid) => klpVon(pid).length);
      const txt = pids.map((pid) => `<a href="#/person/${pid}" title="${esc(pname(pid))}${k.klp.includes(pid) ? " – Klassenlehrperson dieser Klasse" : klpVon(pid).length ? " – Klassenlehrperson " + klpVon(pid).join(", ") : ""}">${k.klp.includes(pid) ? "● " : klpVon(pid).length ? "○ " : ""}${esc(kuerzel(pid))}</a>`).join(" ");
      return `<td class="${hier ? "klp-hier" : andere ? "klp-andere" : ""}">${txt}${offen ? ' <span class="badge warnung" title="nicht vollständig zugeteilt"><span aria-hidden="true">△</span></span>' : ""}</td>`;
    };
    const zeilen = ks.map((k) => { const z = klasseZahlen(k); const d = z.wlLpIst - z.wlLpSoll;
      return `<tr><td><a href="#/klasse/${k.id}">${esc(k.id)}</a></td><td class="zahl">${Math.abs(d) < 0.005 ? "0" : `<span class="badge warnung">${zahl(d, 1)}</span>`}</td><td>${k.klp.map((pid) => esc(kuerzel(pid))).join("/") || "–"}</td>${faecher.map((f) => zelle(k, f)).join("")}</tr>`; }).join("");
    const kats = [...new Set(S.lektionen.filter((l) => gruppe(l) === "weitere").map((l) => l.kategorie || "Weitere"))];
    const weitere = kats.map((kat) => {
      const ls = S.lektionen.filter((l) => gruppe(l) === "weitere" && (l.kategorie || "Weitere") === kat);
      return `<tr><th scope="rowgroup" colspan="4">${esc(kat)}</th></tr>${ls.map((l) => `<tr><td><a href="#/einsatz/${l.id}">${esc(eTitel(l))}</a></td><td class="zahl">${zahl(sollLp(l))}</td><td>${l.zuteilung.map((z) => esc(kuerzel(z.person))).join(", ") || '<span class="badge warnung"><span aria-hidden="true">△</span>offen</span>'}</td><td>${diffBadge(istLp(l) - sollLp(l), l)}</td></tr>`).join("")}`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Klasse – Fach – Lehrperson</h1><p class="muted">Wer unterrichtet was in welcher Klasse. Kürzel mit ● = Klassenlehrperson dieser Klasse (hinterlegt), ○ = Klassenlehrperson einer anderen Klasse (gestrichelt), ohne Zeichen = Fachlehrperson. Spalte «Diff.»: zugeteilte minus benötigte Lektionen der Lehrpersonen.</p></div>
      <div class="aktionen"><button class="btn" data-aktion="export-matrix">⇩ Matrix (CSV)</button></div></div>
      <h2>Klassenlektionen</h2>
      <div class="tabelle-wrap"><table class="matrix"><thead><tr><th>Klasse</th><th class="zahl">Diff.</th><th>KLP</th>${faecher.map((f) => `<th title="${esc(S.faecher[f])}">${esc(f)}</th>`).join("")}</tr></thead><tbody>${zeilen}</tbody></table></div>
      <h2 style="margin-top:1.25rem">Weitere Lektionen</h2>
      <div class="tabelle-wrap" style="max-width:820px"><table><thead><tr><th>Gefäss</th><th class="zahl">WL</th><th>Lehrperson</th><th>Stand</th></tr></thead><tbody>${weitere}</tbody></table></div>`;
  };

  seiten.personen = function () {
    const zeilen = S.personen.filter((p) => !p.pool).map((p) => {
      const r = rechnung(p.id);
      const u = S.umfrage[p.id];
      const diff = r.soll ? r.soll.diffH : null;
      return `<tr><td>${esc(p.kuerzel || "")}</td><td><a href="#/person/${p.id}">${esc(p.name)}</a><div class="small muted">${esc(p.art)}</div></td>
        <td class="zahl">${r.festProzent ? "–" : zahl(r.wl, 1)}</td>
        <td class="zahl">${p.bgSoll != null ? zahl(p.bgSoll) + " %" : "–"}</td>
        <td class="zahl">${r.festProzent ? "–" : zahl(r.pensum, 1) + " %"}${r.warnungen.length ? ` <span class="badge warnung" title="${esc(r.warnungen.map((w) => w.text).join(" · "))}"><span aria-hidden="true">△</span>${r.warnungen.length}</span>` : ""}</td>
        <td class="zahl">${diff == null ? "–" : Math.abs(diff) <= 5 ? `<span class="badge erfolg"><span aria-hidden="true">✓</span>${diff >= 0 ? "+" : "−"}${zahl(Math.abs(diff))} h</span>` : `<span class="badge warnung"><span aria-hidden="true">△</span>${diff >= 0 ? "+" : "−"}${zahl(Math.abs(diff))} h</span>`}</td>
        <td class="zahl">${r.weitereProzent ? zahl(r.weitereProzent, 1) + " %" : "–"}</td>
        <td class="zahl">${zahl(r.total, 1)} %</td>
        <td class="zahl">${p.pensumVorjahr != null ? zahl(p.pensumVorjahr) + " %" : "–"}</td>
        <td class="zahl">${u && u.status === "eingereicht" ? u.wunschProzent + " %" : "–"}</td><td>${badge(status(p.id))}</td></tr>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Personen und Pensen</h1><p class="muted">Vereinbarter Beschäftigungsgrad (Soll) gegenüber dem aus den Zuteilungen berechneten (Ist); Differenz in Stunden. Grundlage: ${RR(["LPG", "6"], ["LPG", "18"], ["LPVO", "7"], ["LPVO", "9"], ["LPVO", "10"], ["LPVO", "10 f"])}.</p></div>
      <div class="aktionen"><button class="btn" data-aktion="export-personen">⇩ Personalliste (CSV)</button></div></div>
      <div class="tabelle-wrap"><table><thead><tr><th>Kürzel</th><th>Person</th><th class="zahl">WL</th><th class="zahl">BG vereinbart</th><th class="zahl">BG berechnet</th><th class="zahl">Differenz</th><th class="zahl">Weitere Anst.</th><th class="zahl">Total</th><th class="zahl">Vorjahr</th><th class="zahl">Wunsch</th><th>Status</th></tr></thead><tbody>${zeilen}</tbody></table></div>`;
  };

  seiten.person = function (q, id) {
    const p = person(id);
    if (!p) return "<p>Person nicht gefunden.</p>";
    const r = rechnung(id);
    const u = S.umfrage[id];
    const f = S.freigaben[id];
    const d = istSL() ? "" : "disabled";
    const n = njaz(p);
    const ja = (x) => (x ? "ja" : "nein");
    const zeileDl = (t, w) => `<div class="feldzeile"><span class="muted">${t}</span><span>${w}</span></div>`;
    const lZeilen = (r.lektionen || []).map((x) => `<tr><td><a href="#/einsatz/${x.l.id}">${esc(eTitel(x.l))}</a>${semF(x.l) < 1 ? ' <span class="small muted">Semester</span>' : ""}</td><td class="small">${x.typ}</td><td class="zahl">${zahl(x.wl, 1)}</td><td class="zahl">${zahl(x.faktor, 1)}</td><td class="zahl">${zahl(x.stunden)}</td></tr>`).join("");
    const gZeilen = r.gefaesse.map((x) => `<tr><td>${esc(x.g.name)}</td><td>${esc(x.g.bereich)}</td><td>${x.g.entschaedigt ? '<span class="badge info">entschädigt</span>' : x.g.art === "zusatz" ? '<span class="badge violett">zusätzlich</span>' : '<span class="badge neutral">aus Pauschale</span>'}</td><td class="zahl">${zahl(x.h)}</td></tr>`).join("");
    const wZeilen = r.weitere.map((w) => `<tr><td><a href="#/einsatz/${w.l.id}">${esc(eTitel(w.l))}</a></td><td class="small">${w.typ}</td><td class="zahl">${fmtE(w.l, w.wert)}</td><td class="zahl">${zahl(w.stunden)} h</td><td class="zahl">${zahl(w.prozent, 1)} %</td></tr>`).join("");
    const flex = r.festProzent ? 0 : r.reserve;
    const bereichZeilen = r.festProzent ? "" : Object.entries(r.bereiche).map(([b, x]) => `<tr><td>${R("LPVO", { Schule: "10 a", Zusammenarbeit: "10 b", Weiterbildung: "10 c" }[b])} · ${b}: Pauschale ${PAUSCHALE()[b]} h × ${zahl(r.pensum, 1)} %<div class="small muted">davon in Gefässen verplant ${zahl(x.verplant)} h, frei ${zahl(x.soll - x.verplant)} h</div></td><td class="zahl">${zahl(x.soll)} h</td></tr>`).join("");
    return `
      <p class="small"><a href="#/personen">← Personen</a></p>
      <div class="seitenkopf"><div><h1>${esc(p.name)} <span class="muted" style="font-weight:500">${esc(p.kuerzel || "")}</span></h1><p class="muted">${esc(p.art)}${p.faecher.length ? " · Fächer " + esc(p.faecher.join(", ")) : ""}</p></div>
        <div class="aktionen">${badge(status(id))}
          ${istSL() ? `<button class="btn primaer" data-aktion="freigeben" data-id="${id}">Zur Anstellung freigeben</button>` : ""}
          <button class="btn" data-aktion="drucken">⎙ Pensenübersicht (PDF)</button></div></div>
      ${r.warnungen.length ? `<div class="meldung warnung" role="status"><strong>Prüfen:</strong><ul style="margin:.3rem 0 0">${r.warnungen.map((w) => `<li>${esc(w.text)} – ${R(...w.recht)}</li>`).join("")}</ul></div>` : ""}
      <div class="karten">
        <div class="karte"><div class="titel">Beschäftigungsgrad vereinbart</div><div class="zahl">${p.bgSoll != null ? zahl(p.bgSoll) + " %" : "–"}</div><div class="small muted">Vorjahr ${p.pensumVorjahr != null ? zahl(p.pensumVorjahr) + " %" : "–"}</div></div>
        <div class="karte"><div class="titel">Beschäftigungsgrad aus Zuteilung</div><div class="zahl">${r.festProzent ? "–" : zahl(r.pensum, 1) + " %"}</div>${f && f.stand ? `<div class="small muted">freigegeben: ${zahl(f.stand.pensum, 1)} %</div>` : ""}</div>
        <div class="karte"><div class="titel">Differenz Soll/Ist</div><div class="zahl">${r.soll ? (r.soll.diffH >= 0 ? "+" : "−") + zahl(Math.abs(r.soll.diffH)) + " h" : "–"}</div><div class="small muted">${r.soll ? `Soll ${zahl(r.soll.sollH)} h · Ist ${zahl(r.soll.istH)} h` : "kein Soll vereinbart"}</div></div>
        <div class="karte"><div class="titel">Total inkl. weitere Anstellungen</div><div class="zahl">${zahl(r.total, 1)} %</div><div class="small muted">Wunsch ${u && u.status === "eingereicht" ? u.wunschProzent + " %" : "–"}</div></div>
      </div>
      <div class="spalten">
        <section class="karte"><h2>Stammdaten</h2><div class="feldliste">
          ${zeileDl("Kürzel", esc(p.kuerzel || "–"))}
          ${zeileDl("Geburtsdatum", datum(p.geburtsdatum))}
          ${zeileDl(`Alter am ${datum(stichtag())}`, alterAm(p, stichtag()))}
          ${zeileDl("Ferienanspruch / Netto-Jahresarbeitszeit", `${n.ferientage} Tage · ${zahl(n.stunden)} h bei 100 % <span class="small">(${R("LPVO", "13")}, ${R("VVO", "79")})</span>`)}
          ${zeileDl("Neuanstellung", ja(p.neu))}
          ${zeileDl("Berufseinführung", `${ja(p.berufseinfuehrung)}${p.berufseinfuehrung ? " (+1,5 h je WL, " + R("LPVO", "7", "Abs. 4") + ")" : ""}`)}
          ${zeileDl("Quereinstieg (Studium)", ja(p.quest))}
          <p class="small muted" style="margin-top:.5rem">Stammdaten später aus EduKSX-Ident.</p></div></section>
        <section class="karte"><h2>Anstellung und Finanzierung</h2><div class="feldliste">
          ${zeileDl("Vereinbarter Beschäftigungsgrad", `<input type="number" min="0" max="100" step="1" value="${p.bgSoll != null ? p.bgSoll : ""}" data-aktion="p-feld" data-id="${id}" data-feld="bgSoll" ${d}> %`)}
          ${r.festProzent ? "" : zeileDl("Kantonal (Berufsauftrag)", zahl(r.kantonalProzent, 1) + " %") + zeileDl("Kommunal (Berufsauftrag)", zahl(r.kommunalProzent, 1) + " %")}
          ${zeileDl("Weitere Anstellungen (ausserhalb Berufsauftrag)", zahl(r.weitereProzent, 1) + " %" + (r.weitereProzent ? ` <span class="small">(${R("VVO", "144")})</span>` : ""))}
          ${zeileDl("<strong>Total</strong>", `<strong>${zahl(r.total, 1)} %</strong>`)}
          ${zeileDl("Zusätzlich entschädigt", `${zahl(r.entschaedigtH)} h · ${zahl((r.entschaedigtH / n.stunden) * 100, 1)} % (${R("LPVO", "2 f")})`)}
          ${zeileDl("Pensum Vorjahr", p.pensumVorjahr != null ? zahl(p.pensumVorjahr) + " %" : "–")}
          ${r.festProzent ? "" : zeileDl("Nicht zugewiesene Zeit (Reserve)", `${zahl(flex)} h <span class="small muted">frei in den Pauschalen${r.flexH ? `, nach ${zahl(r.flexH)} h flexiblen Aufgaben` : ""}</span>`)}
        </div>
        <h3 style="margin-top:.75rem">Bemerkungen intern</h3><textarea rows="2" style="width:100%" data-aktion="p-feld" data-id="${id}" data-feld="bemerkung" ${d}>${esc(p.bemerkung || "")}</textarea>
        <h3 style="margin-top:.5rem">Bemerkung auf der Pensenübersicht</h3><textarea rows="2" style="width:100%" data-aktion="p-feld" data-id="${id}" data-feld="bemerkungPensen" ${d}>${esc(p.bemerkungPensen || "")}</textarea></section>
      </div>
      ${r.festProzent ? "" : `
      <h2 style="margin-top:1rem">Berufsauftrag nach Tätigkeitsbereichen</h2>
      <div class="tabelle-wrap"><table><tbody>
        <tr><td>${R("LPVO", "7", p.berufseinfuehrung ? "Abs. 1 und 4" : "Abs. 1")} · Unterricht: ${zahl(r.wl, 1)} WL (Faktor je Gefäss)</td><td class="zahl">${zahl(r.unterrichtH)} h</td></tr>
        <tr><td>${R("LPVO", "10 f")} · Klassenlehrperson ${esc(r.klassen.map((k) => `${k.klasse} (${zahl(k.stunden)} h)`).join(", ") || "–")}</td><td class="zahl">${zahl(r.klpH)} h</td></tr>
        <tr><td>${R("LPVO", "2 c", "Abs. 4 lit. a")} · Zusätzliche Aufgaben (Ämter, Kustodien, Projekte)</td><td class="zahl">${zahl(r.zusatzH)} h</td></tr>
        ${bereichZeilen}
        <tr class="summe"><td>Netto-Arbeitszeit = Beschäftigungsgrad × ${zahl(r.njaz)} h</td><td class="zahl">${zahl(r.netto)} h</td></tr>
        <tr class="summe"><td>Beschäftigungsgrad (${R("LPVO", "9")}, ${R("LPG", "6")}) · Anteil Unterricht ${zahl(r.anteilU)} %</td><td class="zahl">${zahl(r.pensum, 1)} %</td></tr>
      </tbody></table></div>
      <div class="spalten" style="margin-top:1rem">
        <section><h3>Unterricht</h3><div class="tabelle-wrap"><table><thead><tr><th>Gefäss</th><th>Anstellung</th><th class="zahl">WL</th><th class="zahl">Faktor</th><th class="zahl">h</th></tr></thead><tbody>${lZeilen || '<tr><td colspan="5" class="muted">keine</td></tr>'}</tbody></table></div></section>
        <section><h3>Gefässe des Berufsauftrags</h3><div class="tabelle-wrap"><table><thead><tr><th>Gefäss</th><th>Bereich</th><th>Art</th><th class="zahl">h</th></tr></thead><tbody>${gZeilen || '<tr><td colspan="4" class="muted">keine</td></tr>'}</tbody></table></div></section>
      </div>`}
      ${r.weitere.length ? `<h3 style="margin-top:1rem">Weitere Anstellungen</h3><div class="tabelle-wrap"><table><thead><tr><th>Anstellung</th><th>Typ</th><th class="zahl">Umfang</th><th class="zahl">h/Jahr</th><th class="zahl">%</th></tr></thead><tbody>${wZeilen}</tbody></table></div>` : ""}
      ${u && u.status === "eingereicht" ? `<h2 style="margin-top:1rem">Angaben aus der Pensenumfrage</h2><div class="karte small">${umfrageDetail(u)}</div>` : ""}
      ${dossierHtml(p)}`;
  };

  function dossierHtml(p) {
    if (!istSL() && !istSV()) return "";
    const eintraege = (S.dossier[p.id] || []).slice().sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
    const gespr = S.gespraeche.filter((g) => g.person === p.id);
    const gruppen = S.dossierKategorien.map((k, i) => {
      const e = eintraege.filter((x) => x.kategorie === i);
      const g = i === 3 ? gespr : [];
      const n = e.length + g.length;
      return `<details class="gefaess"${n ? "" : ""}><summary><span>${esc(k)}</span><span class="badge neutral">${n}</span></summary><div class="inhalt">
        ${n ? `<ul class="small">${e.map((x) => `<li>${datum(x.datum)} · ${esc(x.titel)}${x.notiz ? ` <span class="muted">– ${esc(x.notiz)}</span>` : ""}${istSL() ? ` <button class="btn klein" data-aktion="dossier-weg" data-id="${p.id}" data-i="${x.id}" aria-label="Eintrag ${esc(x.titel)} entfernen">✕</button>` : ""}</li>`).join("")}${g.map((x) => `<li>${datum(x.datum)} · ${esc(x.art)} <span class="muted">– ${esc(x.status)} (<a href="#/gespraeche">Personalgespräche</a>)</span></li>`).join("")}</ul>` : '<p class="small muted">keine Einträge</p>'}</div></details>`;
    }).join("");
    return `<div class="bereichskopf"><h2>Personaldossier</h2>${istSL() ? `<button class="btn" data-aktion="dossier-neu" data-id="${p.id}">+ Eintrag aus Vorlage</button>` : ""}</div>
      <p class="small muted">Nur Verweise und Metadaten; die Dokumente selbst liegen später im Dokumentenspeicher von EduKSX. Sichtbar für Schulleitung und Schulverwaltung. Führung, Gliederung, Aufbewahrung und Einsicht: ${RR(["VVO", "21"], ["VVO", "22"], ["VVO", "23"], ["VVO", "27"])}; Mitarbeitendenbeurteilung: ${RR(["LPG", "20"], ["VVO", "136"])}.</p>${gruppen}`;
  }

  const BEREICHE = ["Schule", "Zusammenarbeit", "Weiterbildung", "Flex"];
  const BEREICH_TEXT = { Schule: "Pauschale Schule", Zusammenarbeit: "Pauschale Zusammenarbeit", Weiterbildung: "Pauschale Weiterbildung", Flex: "Nicht zugewiesene Zeit (flexibel)" };
  const gTotal = (g) => g.teilnehmende.reduce((a, pid) => a + gefaessStunden(g, pid), 0);
  function gefaessKarte(g) {
    const lp = lehrpersonen();
    const dis = istSL() ? "" : "disabled";
    const total = gTotal(g);
    const teil = g.teilnehmende.map((pid) => `<tr><td><a href="#/person/${pid}">${esc(pname(pid))}</a> <span class="small muted">${esc(kuerzel(pid))}</span></td><td class="zahl">${zahl(wlVon(pid), 1)}</td><td class="zahl">${zahl(gefaessStunden(g, pid))}</td>${istSL() ? `<td><button class="btn klein" data-aktion="teil-weg" data-g="${g.id}" data-p="${pid}" aria-label="${esc(pname(pid))} entfernen">✕</button></td>` : ""}</tr>`).join("");
    const fehlen = lp.filter((p) => !g.teilnehmende.includes(p.id));
    const num = (f, t, v, ph) => `<label class="feld">${t}<input type="number" min="0" step="0.5" value="${v != null ? v : ""}" ${ph ? `placeholder="${ph}"` : ""} data-aktion="g-feld" data-g="${g.id}" data-feld="${f}" ${dis}></label>`;
    const txt = (f, t, v) => `<label class="feld">${t}<input type="text" value="${esc(v || "")}" data-aktion="g-feld" data-g="${g.id}" data-feld="${f}" ${dis}></label>`;
    const art = g.art === "zusatz" ? '<span class="badge violett">zusätzlich</span>' : '<span class="badge neutral">aus Pauschale</span>';
    return `<details class="gefaess" ${location.hash.includes("g=" + g.id) ? "open" : ""}><summary><span><strong>${esc(g.name)}</strong> ${g.kurz ? `<span class="muted small">${esc(g.kurz)}</span>` : ""} ${art}${g.vorzeichen === "-" ? ' <span class="badge info">Entlastung</span>' : ""}${g.entschaedigt ? ' <span class="badge info">entschädigt</span>' : ""}</span>
        <span class="small">${g.regel === "linear" ? `${zahl(g.stunden)} h bei 100 %` : `${zahl(gefaessBasis(g))} h je Person`} · ${g.teilnehmende.length} Pers. · <strong>${zahl(total)} h</strong></span></summary>
      <div class="inhalt">
        <div class="formzeile">${txt("name", "Name", g.name)}${txt("kurz", "Name kurz", g.kurz)}
          <label class="feld">Bereich<select data-aktion="g-feld" data-g="${g.id}" data-feld="bereich" ${dis}>${BEREICHE.map((x) => `<option ${x === g.bereich ? "selected" : ""}>${x}</option>`).join("")}</select></label>
          <label class="feld">Art<select data-aktion="g-feld" data-g="${g.id}" data-feld="art" ${dis}><option value="pauschal" ${g.art === "pauschal" ? "selected" : ""}>aus Pauschale</option><option value="zusatz" ${g.art === "zusatz" ? "selected" : ""}>zusätzlich (erhöht BG)</option></select></label>
          <label class="feld">Vorzeichen<select data-aktion="g-feld" data-g="${g.id}" data-feld="vorzeichen" ${dis}><option value="+" ${g.vorzeichen !== "-" ? "selected" : ""}>+ Aufgabe</option><option value="-" ${g.vorzeichen === "-" ? "selected" : ""}>− Entlastung</option></select></label></div>
        <div class="formzeile">
          <label class="feld">Regel Zeit<select data-aktion="g-feld" data-g="${g.id}" data-feld="regel" ${dis}><option value="fix" ${g.regel !== "linear" ? "selected" : ""}>fix je Person</option><option value="linear" ${g.regel === "linear" ? "selected" : ""}>linear nach WL (Basis ${P().lektionenJeVZE} WL)</option></select></label>
          ${g.regel === "linear" ? num("stunden", "Stunden bei 100 %", g.stunden) + num("sockel", "Sockel h", g.sockel) + num("sockelBis", "Sockel bis WL", g.sockelBis) + num("gesamtAb", "Gesamte Zeit ab WL", g.gesamtAb) + num("max", "Maximum h", g.max, g.stunden)
            : num("anzahl", "Anzahl pro Jahr", g.anzahl) + num("praesenz", "Präsenz h pro Mal", g.praesenz) + num("vorbereitung", "Vorbereitung h pro Mal", g.vorbereitung) + (g.anzahl == null ? num("stunden", "oder Stunden je Person", g.stunden) : "")}
        </div>
        <div class="formzeile">
          <label class="feld"><span><input type="checkbox" data-aktion="g-feld" data-g="${g.id}" data-feld="amt" ${g.amt ? "checked" : ""} ${dis}> Amt oder Kustodie (mit Stunden-Soll)</span></label>
          ${g.amt ? num("soll", "Stunden Soll", g.soll) + `<label class="feld"><span><input type="checkbox" data-aktion="g-feld" data-g="${g.id}" data-feld="kustodie" ${g.kustodie ? "checked" : ""} ${dis}> Kustodie</span></label><label class="feld"><span><input type="checkbox" data-aktion="g-feld" data-g="${g.id}" data-feld="entschaedigt" ${g.entschaedigt ? "checked" : ""} ${dis}> zusätzlich entschädigt (${R("LPVO", "2 f")})</span></label>` : ""}
          <label class="feld"><span><input type="checkbox" data-aktion="g-feld" data-g="${g.id}" data-feld="ressource" data-wert="pool" ${g.ressource === "pool" ? "checked" : ""} ${dis}> belastet Gestaltungspool</span></label>
        </div>
        <div class="formzeile">${txt("beschreibung", "Beschreibung", g.beschreibung)}${txt("bemerkung", "Bemerkungen", g.bemerkung)}
          ${istSL() && fehlen.length ? `<label class="feld">Person hinzufügen<select data-aktion="teil-dazu" data-g="${g.id}"><option value="">wählen …</option>${fehlen.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label>` : ""}
          ${istSL() && fehlen.length ? `<button class="btn klein" data-aktion="teil-alle" data-g="${g.id}">alle Lehrpersonen</button>` : ""}
          <button class="btn klein" data-aktion="praesenz" data-g="${g.id}">⇩ Präsenzliste</button>${istSL() ? ` <button class="btn klein gefahr" data-aktion="g-loeschen" data-g="${g.id}">Löschen …</button>` : ""}</div>
        <div class="tabelle-wrap"><table><thead><tr><th>Teilnehmende</th><th class="zahl">WL</th><th class="zahl">Stunden</th>${istSL() ? "<th></th>" : ""}</tr></thead><tbody>${teil || '<tr><td colspan="4" class="muted">noch niemand</td></tr>'}</tbody></table></div>
      </div></details>`;
  }
  seiten.berufsauftrag = function (q) {
    const ansicht = q.get("ansicht") || "bereiche";
    const tab = (k, t) => `<button role="tab" aria-selected="${ansicht === k}" data-aktion="ba-ansicht" data-k="${k}">${t}</button>`;
    let inhalt;
    if (ansicht === "aemter") {
      const aemter = S.gefaesse.filter((g) => g.amt);
      const zeilen = aemter.map((g) => {
        const ist = gTotal(g); const soll = Number(g.soll || 0); const d = ist - soll;
        return `<tr><td><a href="#/berufsauftrag?g=${g.id}" data-aktion-link>${esc(g.name)}</a>${g.kustodie ? ' <span class="badge neutral">Kustodie</span>' : ""}${g.entschaedigt ? ' <span class="badge info">entschädigt</span>' : ""}${g.beschreibung ? `<div class="small muted">${esc(g.beschreibung)}</div>` : ""}</td>
          <td class="zahl">${zahl(soll)} h</td><td>${g.teilnehmende.map((pid) => `<a href="#/person/${pid}" title="${esc(pname(pid))}">${esc(kuerzel(pid))}</a> ${zahl(gefaessStunden(g, pid))}`).join(" · ") || '<span class="muted">–</span>'}</td><td class="zahl">${zahl(ist)} h</td>
          <td>${Math.abs(d) < 0.5 ? '<span class="badge erfolg"><span aria-hidden="true">✓</span>gedeckt</span>' : d < 0 ? `<span class="badge warnung"><span aria-hidden="true">△</span>${zahl(-d)} h offen</span>` : `<span class="badge fehler"><span aria-hidden="true">✕</span>${zahl(d)} h zu viel</span>`}</td><td class="small">${esc(g.bemerkung || "")}</td></tr>`;
      }).join("");
      inhalt = `<p class="muted small">Ämter und Kustodien mit Stunden-Soll. Kustodien bis ${P().kustodieMaxStunden} h im Berufsauftrag, darüber zusätzlich entschädigt (${R("LPVO", "2 f")}).</p>
        <div class="tabelle-wrap"><table><thead><tr><th>Amt / Kustodie</th><th class="zahl">Soll</th><th>Zuteilung (Kürzel, h)</th><th class="zahl">Ist</th><th>Differenz</th><th>Bemerkung</th></tr></thead><tbody>${zeilen || '<tr><td colspan="6" class="muted">keine</td></tr>'}</tbody></table></div>`;
    } else {
      inhalt = BEREICHE.map((b) => {
        const gs = S.gefaesse.filter((g) => g.bereich === b);
        const h = gs.reduce((a, g) => a + gTotal(g), 0);
        return `<div class="bereichskopf"><h2>${esc(b)} <span class="muted small" style="font-weight:400">${esc(BEREICH_TEXT[b])}</span></h2><span class="small">${gs.length} Gefässe · ${zahl(h)} h total</span></div>${gs.map(gefaessKarte).join("") || '<p class="small muted">keine Gefässe</p>'}`;
      }).join("");
    }
    return `<div class="seitenkopf"><div><h1>Berufsauftrag</h1><p class="muted">Aufgaben, Ämter und Sitzungen als Gefässe je Tätigkeitsbereich. «Aus Pauschale» plant, wofür die Pauschalen Schule (60 h), Zusammenarbeit (50 h) und Weiterbildung (30 h bei 100 %) verwendet werden; «Flex» nutzt die nicht zugewiesene Zeit; «zusätzlich» erhöht den Beschäftigungsgrad. Grundlage: ${RR(["LPG", "18 a"], ["LPG", "18 b"], ["LPG", "18 c"], ["LPVO", "10 a"], ["LPVO", "10 b"], ["LPVO", "10 c"], ["LPVO", "10 e"])}.</p></div>
      <div class="aktionen">${istSL() ? '<button class="btn primaer" data-aktion="g-neu">+ Gefäss</button>' : ""}<button class="btn" data-aktion="export-ba">⇩ Gesamtexport (CSV)</button></div></div>
      <div class="reiter" role="tablist">${tab("bereiche", "Gefässe nach Bereich")}${tab("aemter", "Ämter und Kustodien")}</div>${inhalt}`;
  };

  seiten.ressourcen = function (q) {
    const sicht = q.get("sicht") || (istSV() ? "sv" : "sl");
    const tab = (k, t) => `<button role="tab" aria-selected="${sicht === k}" data-aktion="sicht" data-sicht="${k}">${t}</button>`;
    const vSL = verbrauch("sl");
    const vSV = verbrauch("sv");
    const darf = istSL() && !S.budgetGesperrt;
    const fmt = (r, w) => (r.einheit === "%" ? `${zahl(w)} %` : `${zahl(w, 1)} ${r.einheit}`);
    const zeile = (r, v) => {
      const b = budget(r);
      const s = b - v.verplant;
      const anteil = b ? (v.verplant / b) * 100 : 0;
      return `<tr><td><details><summary>${esc(r.name)}</summary><ul class="small">${v.posten.map((x) => `<li>${esc(pname(x.pid))}: ${fmt(r, x.wert)}</li>`).join("") || "<li>keine Posten</li>"}</ul></details></td>
        <td class="zahl">${darf && !r.berechnet ? `<input type="number" min="0" step="0.5" value="${r.budget}" data-aktion="budget" data-r="${r.id}" aria-label="Budget ${esc(r.name)}">` : fmt(r, b)}${r.berechnet ? '<div class="small muted">aus <a href="#/stellenplan">Stellenberechnung</a></div>' : ""}</td>
        <td class="zahl">${fmt(r, v.bedarf)}</td><td class="zahl">${fmt(r, v.verplant)}</td>
        <td class="zahl">${s < -0.05 ? `<span class="badge fehler"><span aria-hidden="true">✕</span>${fmt(r, s)}</span>` : fmt(r, s)}</td>
        <td><div class="balken ${anteil > 100.5 ? "ueber" : anteil > 95 ? "voll" : ""}" role="img" aria-label="${zahl(anteil)} Prozent verplant"><span style="width:${Math.min(100, anteil)}%"></span></div></td></tr>`;
    };
    const kopf = `<thead><tr><th>Ressource (Posten aufklappen)</th><th class="zahl">Budget</th><th class="zahl">Bedarf</th><th class="zahl">Verplant</th><th class="zahl">Saldo</th><th>Verbrauch</th></tr></thead>`;
    let inhalt;
    if (sicht === "vze") {
      const vzeVon = (r, w) => (r.einheit === "WL" ? w / P().lektionenJeVZE : r.einheit === "%" ? w / 100 : (w * P().schulwochen) / 1890);
      const zeilenV = S.ressourcen.map((r) => ({ r, soll: vzeVon(r, budget(r)), ist: vzeVon(r, vSL[r.id].verplant), kantonal: !!r.kantonal }));
      const summe = (f) => { const z = zeilenV.filter(f); return { soll: z.reduce((a, x) => a + x.soll, 0), ist: z.reduce((a, x) => a + x.ist, 0) }; };
      const lp = lehrpersonen();
      const bgIst = lp.reduce((a, p) => a + rechnung(p.id).pensum / 100, 0);
      const bgRicht = lp.reduce((a, p) => a + wlVon(p.id) / P().lektionenJeVZE, 0);
      const d3 = (x) => zahl(x, 2);
      const dz = (soll, ist) => { const d = ist - soll; return Math.abs(d) < 0.005 ? '<span class="badge erfolg"><span aria-hidden="true">✓</span>0.00</span>' : d < 0 ? `<span class="badge warnung"><span aria-hidden="true">△</span>${d3(d)}</span>` : `<span class="badge fehler"><span aria-hidden="true">✕</span>+${d3(d)}</span>`; };
      const z = (t, x, stark) => `<tr${stark ? ' class="summe"' : ""}><td>${t}</td><td class="zahl">${d3(x.soll)}</td><td class="zahl">${d3(x.ist)}</td><td>${dz(x.soll, x.ist)}</td></tr>`;
      inhalt = `<p class="muted small">Alle Ressourcen in Vollzeiteinheiten (1 VZE = ${P().lektionenJeVZE} WL = 100 % = 1'890 h; Wochenstunden × ${P().schulwochen} Schulwochen). Soll = Budget bzw. Stellenberechnung, Ist = zugeteilt.</p>
        <div class="tabelle-wrap" style="max-width:820px"><table><thead><tr><th>Summen</th><th class="zahl">Soll VZE</th><th class="zahl">Ist VZE</th><th>Differenz</th></tr></thead><tbody>
          ${z("<strong>Gesamt</strong>", summe(() => true), true)}${z("Kantonale Anstellung", summe((x) => x.kantonal))}${z("Kommunale Anstellung", summe((x) => !x.kantonal))}
          <tr><td>Abweichung Beschäftigungsgrad gegenüber WL-Richtwert <div class="small muted">Lehrpersonen: Σ Beschäftigungsgrad minus Σ WL / ${P().lektionenJeVZE} (Klassenlehrperson, zusätzliche Aufgaben, Faktoren)</div></td><td class="zahl">${d3(bgRicht)}</td><td class="zahl">${d3(bgIst)}</td><td class="zahl">${bgIst - bgRicht >= 0 ? "+" : ""}${d3(bgIst - bgRicht)}</td></tr>
        </tbody></table></div>
        <h2 style="margin-top:1rem">Je Ressource</h2>
        <div class="tabelle-wrap" style="max-width:820px"><table><thead><tr><th>Ressource</th><th>Anstellung</th><th class="zahl">Soll VZE</th><th class="zahl">Ist VZE</th><th>Differenz</th></tr></thead><tbody>
          ${zeilenV.map((x) => `<tr><td>${esc(x.r.name)} <span class="small muted">(${x.r.einheit})</span></td><td class="small">${x.kantonal ? "kantonal" : "kommunal"}</td><td class="zahl">${d3(x.soll)}</td><td class="zahl">${d3(x.ist)}</td><td>${dz(x.soll, x.ist)}</td></tr>`).join("")}
        </tbody></table></div>`;
    } else if (sicht === "vergleich") {
      inhalt = `<div class="tabelle-wrap"><table><thead><tr><th>Ressource</th><th class="zahl">Budget</th><th class="zahl">Planung Schulleitung</th><th class="zahl">Freigegeben (Verwaltung)</th><th class="zahl">Differenz</th></tr></thead><tbody>${S.ressourcen.map((r) => {
        const d = vSL[r.id].verplant - vSV[r.id].verplant;
        return `<tr><td>${esc(r.name)}</td><td class="zahl">${fmt(r, budget(r))}</td><td class="zahl">${fmt(r, vSL[r.id].verplant)}</td><td class="zahl">${fmt(r, vSV[r.id].verplant)}</td><td class="zahl">${Math.abs(d) > 0.05 ? `<span class="badge warnung"><span aria-hidden="true">△</span>${d > 0 ? "+" : ""}${fmt(r, d)}</span>` : "–"}</td></tr>`;
      }).join("")}</tbody></table></div>`;
    } else {
      const v = sicht === "sv" ? vSV : vSL;
      inhalt = `<p class="muted small">${sicht === "sv" ? "Verbrauch aus den zur Anstellung freigegebenen Ständen." : "Aktueller Planungsstand inklusive nicht freigegebener Zuweisungen."}</p>
        <div class="tabelle-wrap"><table>${kopf}<tbody>${S.ressourcen.map((r) => zeile(r, v[r.id])).join("")}</tbody></table></div>`;
    }
    const ueber = S.ressourcen.filter((r) => budget(r) - vSL[r.id].verplant < -0.05);
    return `<div class="seitenkopf"><div><h1>Ressourcen</h1><p class="muted">Budget je Ressourcentyp, Verbrauch aus den Zuweisungen, Saldo und Posten. Kantonale VZE: ${RR(["LPG", "3"], ["LPG", "4"], ["LPVO", "2 c"])}; gemeindeeigene: ${R("LPVO", "2 e")}.</p></div>
      <div class="aktionen">${istSV() ? `<button class="btn" data-aktion="sperre" aria-pressed="${S.budgetGesperrt}">${S.budgetGesperrt ? "🔒 Budget entsperren" : "🔓 Budget für Schulleitung sperren"}</button>` : (S.budgetGesperrt ? '<span class="badge neutral"><span aria-hidden="true">🔒</span>Budget von der Schulverwaltung gesperrt</span>' : "")}
      <button class="btn" data-aktion="export-ress">⇩ Excel/CSV</button></div></div>
      ${ueber.length ? `<div class="meldung warnung" role="status"><strong>Warnung:</strong> Budget überschritten bei ${ueber.map((r) => esc(r.name)).join(", ")}. Die Planung bleibt möglich; bitte begründen oder umverteilen.</div>` : ""}
      <div class="reiter" role="tablist">${tab("sl", "Sicht Schulleitung")}${tab("vze", "Übersicht in VZE")}${tab("sv", "Sicht Schulverwaltung")}${tab("vergleich", "Vergleich")}</div>${inhalt}`;
  };

  seiten.freigaben = function () {
    const zeilen = planbar().map((p) => {
      const st = status(p.id);
      const f = S.freigaben[p.id] || {};
      const jetzt = stand(p.id);
      const auswahl = istSL() ? `<td><input type="checkbox" data-sammel="${p.id}" aria-label="${esc(p.name)} auswählen" ${st.key === "freigegeben" || st.key === "angestellt" ? "disabled" : ""}></td>` : "";
      let aktion = "";
      if (istSL()) {
        aktion = `${st.key !== "freigegeben" && st.key !== "angestellt" ? `<button class="btn klein primaer" data-aktion="freigeben" data-id="${p.id}">${st.key === "geaendert" ? "Neu freigeben" : "Freigeben"}</button>` : ""}
          ${f.stand && !f.angestellt ? `<button class="btn klein" data-aktion="zurueckziehen" data-id="${p.id}">Zurückziehen</button>` : ""}`;
      } else if (istSV()) {
        aktion = `${f.stand && !f.angestellt ? `<button class="btn klein primaer" data-aktion="angestellt" data-id="${p.id}">Als angestellt markieren</button>` : ""}
          ${f.stand ? `<label class="small"><input type="checkbox" data-aktion="erledigt" data-id="${p.id}" ${f.erledigt ? "checked" : ""}> erledigt</label>` : ""}
          ${f.aenderungSV ? `<button class="btn klein" data-aktion="quittieren" data-id="${p.id}">Änderung quittieren</button>` : ""}
          ${f.stand ? `<button class="btn klein" data-aktion="bemerkung" data-id="${p.id}">Bemerkung</button>` : ""}`;
      }
      return `<tr>${auswahl}<td><a href="#/person/${p.id}">${esc(p.name)}</a>${f.bemerkung ? `<div class="small muted">Bemerkung: ${esc(f.bemerkung)}</div>` : ""}</td><td>${badge(st)}${f.aenderungSV ? ' <span class="badge warnung"><span aria-hidden="true">!</span>neu für Verwaltung</span>' : ""}</td>
        <td class="zahl">${zahl(jetzt.pensum, 1)} %</td><td class="zahl">${f.stand ? zahl(f.stand.pensum, 1) + " %" : "–"}</td><td class="small">${f.zeit ? zeit(f.zeit) : "–"}</td>
        <td>${f.stand ? `<button class="btn klein" data-aktion="vergleich" data-id="${p.id}">Vergleich</button>` : ""} ${aktion}</td></tr>`;
    }).join("");
    const verlauf = S.verlauf.filter((e) => /freigegeben|angestellt|zurückgezogen|quittiert|Bemerkung|erledigt/.test(e.text));
    return `<div class="seitenkopf"><div><h1>Freigaben und Anstellung</h1><p class="muted">Die Schulleitung gibt abgeschlossene Planungen frei; die Schulverwaltung stellt an. Änderungen nach der Freigabe werden erkannt. Grundlage: ${RR(["LPVO", "9", "Abs. 1"], ["LPG", "7"], ["LPVO", "3"], ["LPVO", "4"])}.</p></div>
      <div class="aktionen">${istSL() ? '<button class="btn primaer" data-aktion="sammel">Auswahl freigeben</button>' : ""}<button class="btn" data-aktion="export-personen">⇩ Personalliste</button></div></div>
      <div class="tabelle-wrap"><table><thead><tr>${istSL() ? '<th><span class="sr-only">Auswahl</span></th>' : ""}<th>Person</th><th>Status</th><th class="zahl">Pensum jetzt</th><th class="zahl">Pensum freigegeben</th><th>Freigabe</th><th>Aktionen</th></tr></thead><tbody>${zeilen}</tbody></table></div>
      <h2 style="margin-top:1.25rem">Verlauf</h2>
      ${verlauf.length ? `<ul class="small">${verlauf.map((e) => `<li><span class="muted">${zeit(e.zeit)} · ${esc(ROLLEN[e.rolle] || "")}</span> – ${esc(e.text)}</li>`).join("")}</ul>` : '<p class="muted">Noch keine Freigaben.</p>'}`;
  };

  function umfrageDetail(u) {
    const z = (t, v) => `<tr><th scope="row" style="background:none">${t}</th><td>${esc(v || "–")}</td></tr>`;
    return `<table><tbody>${z("Weiterbeschäftigung", u.weiter)}${z("Pensenwunsch", u.wunschProzent != null ? `${u.wunschProzent} % bzw. ${u.wunschWL} WL` : "")}${z("Stufen", u.stufen)}${z("Fächer", u.faecher)}${z("Interesse Klassenlehrperson", u.klp)}${z("Klassen- und Aufgabenwünsche", u.wuensche)}${z("Verbindliche Sperrzeiten", u.sperr)}${z("Bevorzugte freie Zeiten", u.frei)}${z("Bemerkungen", u.bemerkung)}</tbody></table>`;
  }

  seiten.umfrage = function () {
    const eintraege = Object.entries(S.umfrage);
    const anz = (s) => eintraege.filter(([, u]) => u.status === s).length;
    const zeilen = eintraege.map(([pid, u]) => {
      const r = rechnung(pid);
      const st = { eingereicht: ["erfolg", "✓"], "in Bearbeitung": ["info", "…"], eingeladen: ["neutral", "○"] }[u.status];
      const diff = u.status === "eingereicht" ? r.pensum - u.wunschProzent : null;
      return `<tr><td><a href="#/person/${pid}">${esc(pname(pid))}</a></td><td><span class="badge ${st[0]}"><span aria-hidden="true">${st[1]}</span>${esc(u.status)}</span>${S.erinnert[pid] ? ' <span class="small muted">erinnert</span>' : ""}</td>
        <td>${esc(u.weiter || "–")}</td><td class="zahl">${u.wunschProzent != null ? u.wunschProzent + " %" : "–"}</td><td class="zahl">${zahl(r.pensum, 1)} %</td>
        <td class="zahl">${diff == null ? "–" : Math.abs(diff) > 5 ? `<span class="badge warnung"><span aria-hidden="true">△</span>${diff > 0 ? "+" : ""}${zahl(diff, 1)}</span>` : `${diff > 0 ? "+" : ""}${zahl(diff, 1)}`}</td>
        <td>${esc(u.sperr || "–")}</td>
        <td>${u.status === "eingereicht" ? `<button class="btn klein" data-aktion="umfrage-zeigen" data-id="${pid}">Antworten</button>` : `<button class="btn klein" data-aktion="erinnern" data-id="${pid}">Erinnern</button>`}</td></tr>`;
    }).join("");
    const offenePersonen = planbar().filter((p) => !S.umfrage[p.id]);
    return `<div class="seitenkopf"><div><h1>Pensenumfrage ${esc(S.schuljahr)}</h1><p class="muted">Angaben der Mitarbeitenden für das kommende Schuljahr: Weiterbeschäftigung, Pensenwunsch, Befähigungen, Wünsche und Sperrzeiten. Die Schulleitung legt den Beschäftigungsgrad fest (${R("LPVO", "9")}); Teilbeschäftigte können nicht zur Erhöhung verpflichtet werden (${R("LPVO", "8")}).</p></div>
      <div class="aktionen">${offenePersonen.length ? `<button class="btn primaer" data-aktion="einladen">Alle übrigen einladen (${offenePersonen.length})</button>` : ""}<button class="btn" data-aktion="erinnern-alle">Erinnerung an ausstehende</button></div></div>
      <div class="karten"><div class="karte"><div class="titel">Eingereicht</div><div class="zahl">${anz("eingereicht")}</div></div><div class="karte"><div class="titel">In Bearbeitung</div><div class="zahl">${anz("in Bearbeitung")}</div></div><div class="karte"><div class="titel">Eingeladen</div><div class="zahl">${anz("eingeladen")}</div></div></div>
      <div class="tabelle-wrap"><table><thead><tr><th>Person</th><th>Status</th><th>Weiter</th><th class="zahl">Wunsch</th><th class="zahl">Geplant</th><th class="zahl">Differenz</th><th>Sperrzeiten</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></div>
      <p class="small muted" style="margin-top:.75rem">Erinnerungen und Einladungen laufen später über EduKSX-Flow; die Anmeldung der Mitarbeitenden über EduKSX-Ident.</p>`;
  };

  const wochen = (a) => Math.ceil((new Date(a.bis) - new Date(a.von)) / 86400000 / 7);
  const SV_SCHRITTE = ["erfasst", "geplant", "unterschrieben", "an Schulverwaltung", "an Kanton gemeldet"];
  seiten.stellvertretung = function () {
    const pool = S.personen.filter((p) => p.pool || (!p.tagesstruktur && p.art !== "Klassenassistenz"));
    const zeilen = S.ausfaelle.map((a) => {
      const i = SV_SCHRITTE.indexOf(a.status);
      const kette = SV_SCHRITTE.map((s, j) => `<span class="${j < i ? "erledigt" : j === i ? "aktuell" : ""}">${j < i ? "✓ " : ""}${esc(s)}</span>`).join('<span aria-hidden="true" style="background:none">›</span>');
      const naechster = SV_SCHRITTE[i + 1];
      const darfWeiter = naechster && ((istSL() && i < 3) || (istSV() && i === 3));
      const rapport = a.rapport.reduce((x, r) => x + r.lektionen, 0);
      return `<tr><td>${esc(pname(a.person))}</td><td>${esc(a.grund)}</td><td class="small">${datum(a.von)} – ${datum(a.bis)}</td><td class="zahl">${a.wl}</td>
        <td>${istSL() && i < 2 ? `<select data-aktion="vertretung" data-id="${a.id}" aria-label="Stellvertretung"><option value="">– wählen –</option>${pool.filter((p) => p.id !== a.person).map((p) => `<option value="${p.id}" ${p.id === a.vertretung ? "selected" : ""}>${esc(p.name)}${p.pool ? " (Pool)" : ""}</option>`).join("")}</select>` : esc(pname(a.vertretung))}</td>
        <td><div class="ablauf" aria-label="Ablauf, aktueller Schritt ${esc(a.status)}">${kette}</div></td>
        <td class="small">${esc(a.quelle || "–")}${a.quelle === "Gestaltungspool" && wochen(a) > P().vikariatPoolMaxWochen ? ` <span class="badge fehler"><span aria-hidden="true">✕</span>über ${P().vikariatPoolMaxWochen} Schulwochen</span>` : ""}<div>${rapport ? `${rapport} Lektionen rapportiert` : ""}</div></td>
        <td>${darfWeiter ? `<button class="btn klein primaer" data-aktion="sv-weiter" data-id="${a.id}" ${naechster === "geplant" && !a.vertretung ? "disabled title=\"Zuerst Stellvertretung wählen\"" : ""}>${naechster === "unterschrieben" ? "✍ Unterschreiben" : "→ " + esc(naechster)}</button>` : ""}
          ${istSL() && i >= 1 ? `<button class="btn klein" data-aktion="rapport" data-id="${a.id}">+ Rapport</button>` : ""}</td></tr>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Stellvertretungen</h1><p class="muted">Ausfälle erfassen, Vikariate planen, Formulare unterschreiben und weitergeben. Gründe nur als Kategorie, ohne Diagnose. Vikariate aus dem Gestaltungspool höchstens 14 Schulwochen je Einsatz; Kurzvikariate liegen ausserhalb des Berufsauftrags. Grundlage: ${RR(["LPG", "5", "Abs. 2"], ["LPG", "25"], ["LPVO", "30"], ["LPVO", "31"], ["LPVO", "2 c", "Abs. 4 lit. d"], ["LPVO", "27"], ["LPVO", "28"], ["LPVO", "29"])}; Urlaub, Krankheit und Unfall nach allgemeinem Personalrecht: ${RR(["VVO", "84"], ["VVO", "96"], ["VVO", "99"])}.</p></div>
      <div class="aktionen">${istSL() ? '<button class="btn primaer" data-aktion="ausfall-neu">+ Ausfall erfassen</button>' : ""}</div></div>
      <div class="tabelle-wrap"><table><thead><tr><th>Person</th><th>Grund</th><th>Zeitraum</th><th class="zahl">WL</th><th>Stellvertretung</th><th>Ablauf</th><th>Quelle / Rapport</th><th>Aktion</th></tr></thead><tbody>${zeilen}</tbody></table></div>
      <p class="small muted" style="margin-top:.75rem">Unterschrift über EduKSX-Sign (Signaturstufe ZU PRÜFEN); Meldung an den Kanton über EduKSX-Connect, sofern eine Schnittstelle besteht. Im Prototyp nur angedeutet.</p>`;
  };

  seiten.gespraeche = function () {
    const liste = S.gespraeche.filter((g) => istSL() || g.freigegeben);
    const zeilen = liste.map((g) => `<tr><td>${esc(pname(g.person))}</td><td>${esc(g.art)}</td><td>${datum(g.datum)}</td><td>${esc(g.status)}</td>
      <td>${g.freigegeben ? '<span class="badge info"><span aria-hidden="true">➜</span>an Verwaltung freigegeben</span>' : '<span class="badge neutral"><span aria-hidden="true">🔒</span>nur Schulleitung</span>'}</td>
      <td>${istSL() ? `<button class="btn klein" data-aktion="formular" data-id="${g.id}">Formular vorausfüllen</button> ${g.freigegeben ? "" : `<button class="btn klein" data-aktion="g-freigeben" data-id="${g.id}">An Verwaltung freigeben</button>`}` : ""}</td></tr>`).join("");
    return `<div class="seitenkopf"><div><h1>Personalgespräche und Dossier</h1><p class="muted">Mitarbeitendenbeurteilungen, Probezeitgespräche und Unterrichtsbesuche planen und dokumentieren. Grundlage: ${RR(["LPG", "20"], ["LPVO", "23"], ["LPG", "7 a"], ["LPG", "11 b"], ["LPG", "21"])}.</p></div>
      <div class="aktionen">${istSL() ? '<button class="btn primaer" data-aktion="termin-neu">+ Termin</button>' : ""}</div></div>
      <div class="meldung warnung" role="note"><strong>Besonders schützenswerte Personendaten.</strong> Zugriff nur für die zuständige Schulleitung; jede Einsicht wird protokolliert (${R("LPG", "1 a")}). Aufbewahrungs- und Löschfristen je Dokumentart.${istSV() ? " Die Schulverwaltung sieht nur ausdrücklich freigegebene Unterlagen." : ""}</div>
      <div class="tabelle-wrap"><table><thead><tr><th>Person</th><th>Art</th><th>Datum</th><th>Stand</th><th>Sichtbarkeit</th><th></th></tr></thead><tbody>${zeilen || '<tr><td colspan="6" class="muted">Keine freigegebenen Unterlagen.</td></tr>'}</tbody></table></div>`;
  };

  seiten.tagesstrukturen = function () {
    const t = tagesstrukturRechnung();
    const p = P();
    const darf = istBL() || istSL();
    const zeilen = t.zeilen.map((z) => `<tr><td>${esc(z.a.name)}</td><td>${esc(z.a.tag)}</td><td>${esc(z.a.von)}–${esc(z.a.bis)}</td>
      <td class="zahl">${darf ? `<input type="number" min="0" value="${z.a.kinder}" data-aktion="kinder" data-id="${z.a.id}" aria-label="Angemeldete Kinder ${esc(z.a.name)} ${esc(z.a.tag)}">` : z.a.kinder}</td>
      <td class="zahl">${z.personal}</td><td class="zahl">${zahl(z.jahresH)}</td></tr>`).join("");
    const team = t.einsaetze.map((l) => `<tr><td colspan="2"><strong>${esc(eTitel(l))}</strong> <span class="small muted">Soll ${fmtE(l, sollLp(l))}${einheit(l) !== "%" ? ` (${zahl(bgRichtwert(l, sollLp(l)))} %)` : ""}</span></td></tr>` + l.zuteilung.map((z, i) => `<tr><td>${esc(pname(z.person))}</td><td class="zahl">${darf ? `<input type="number" min="0" step="1" value="${z.wl}" data-aktion="zt-wert" data-id="${l.id}" data-i="${i}" aria-label="Umfang ${esc(pname(z.person))}">` : z.wl} ${einheit(l)}</td></tr>`).join("")).join("");
    const diff = t.ist - t.sollProzent;
    const tage = ["Mo", "Di", "Mi", "Do", "Fr"].map((tag) => {
      const n = t.zeilen.filter((z) => z.a.tag === tag).reduce((a, z) => a + z.a.kinder, 0);
      return `<tr><td>${tag}</td><td class="zahl">${n}</td><td><div class="balken" role="img" aria-label="${n} Kinder"><span style="width:${Math.min(100, n * 2)}%"></span></div></td></tr>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Planung Tagesstrukturen</h1><p class="muted">Personalbedarf aus den Betreuungsangeboten; Soll-Ist-Vergleich der Pensen.</p></div>
      <div class="aktionen">${darf ? `<button class="btn primaer" data-aktion="b-freigeben">${S.betreuungFreigabe ? "Erneut zur Anstellung freigeben" : "Zur Anstellung freigeben"}</button>` : ""}</div></div>
      <div class="karten">
        <div class="karte"><div class="titel">Soll</div><div class="zahl">${zahl(t.sollProzent)} %</div><div class="small muted">${zahl(t.sollH)} h im Jahr</div></div>
        <div class="karte"><div class="titel">Ist (geplante Pensen)</div><div class="zahl">${zahl(t.ist)} %</div></div>
        <div class="karte"><div class="titel">Differenz</div><div class="zahl">${diff >= 0 ? "+" : "−"}${zahl(Math.abs(diff))} %</div><div class="small">${Math.abs(diff) <= 5 ? '<span class="badge erfolg"><span aria-hidden="true">✓</span>gedeckt</span>' : diff < 0 ? '<span class="badge warnung"><span aria-hidden="true">△</span>Unterdeckung</span>' : '<span class="badge info"><span aria-hidden="true">ℹ</span>Überdeckung</span>'}</div></div>
        <div class="karte"><div class="titel">Freigabe</div><div class="zahl" style="font-size:1rem">${S.betreuungFreigabe ? badge({ cls: "info", sym: "➜", text: "freigegeben" }) : badge({ cls: "neutral", sym: "○", text: "Entwurf" })}</div></div>
      </div>
      <p class="small muted">Parameter (Beispielwerte): Betreuungsschlüssel 1 : ${p.betreuungsschluessel}, Mindestbesetzung ${p.mindestbesetzung}, ${p.schulwochen} Schulwochen, Jahresarbeitszeit ${zahl(p.jahresarbeitszeitBetreuung)} h. Die genaue Berechnungslogik ist offen (ST-K6).</p>
      <div class="spalten">
        <section><h2>Betreuungsangebote</h2><div class="tabelle-wrap"><table><thead><tr><th>Angebot</th><th>Tag</th><th>Zeit</th><th class="zahl">Kinder</th><th class="zahl">Personal</th><th class="zahl">h/Jahr</th></tr></thead><tbody>${zeilen}</tbody></table></div></section>
        <section><h2>Team und Einsätze</h2><p class="small muted">Betreuungs-Anstellungen in Stellenprozent oder Wochenstunden während der Schulwochen; Bearbeitung auch unter <a href="#/unterricht?gruppe=anstellung">Anstellungen</a>.</p><div class="tabelle-wrap"><table><thead><tr><th>Person</th><th class="zahl">Umfang</th></tr></thead><tbody>${team}</tbody></table></div>
          <h2 style="margin-top:1rem">Kinder je Wochentag</h2><div class="tabelle-wrap"><table><tbody>${tage}</tbody></table></div></section>
      </div>`;
  };

  seiten.stellenplan = function () {
    const p = P();
    const st = S.stellen;
    const x = stellenRechnung();
    const darf = istSL() || istSV();
    const ein = (k, t, step, hilfe) => `<label class="feld">${t}<input type="number" step="${step}" value="${st[k]}" data-aktion="stelle" data-k="${k}" ${darf ? "" : "disabled"}><span class="small">${hilfe}</span></label>`;
    const v = verbrauch("sl");
    const lekBedarf = S.lektionen.filter((l) => l.ressource === "ba" && !l.zusatz && einheit(l) === "WL").reduce((a, l) => a + sollLp(l) * semF(l), 0);
    const klassenZ = S.klassen.map((k) => {
      const g = klassengroesse(k);
      const t = tafel(k);
      return `<tr><td>${esc(k.id)}</td><td>${esc(t.name)}</td><td class="zahl">${darf ? `<input type="number" min="0" value="${k.schueler}" data-aktion="schueler" data-klasse="${k.id}" aria-label="Schülerzahl ${k.id}">` : k.schueler}</td><td><span class="badge ${g.cls}"><span aria-hidden="true">${g.sym}</span>${esc(g.text)}</span></td><td class="zahl">${zahl(t.vze, 2)}</td><td class="zahl">${t.wlKlasse}${t.kommunal ? ` + ${t.kommunal} kommunal` : ""}</td></tr>`;
    }).join("");
    const muts = S.mutationen.map((m) => {
      const tag = new Date(m.start + "T00:00:00").getDay();
      return `<tr><td>${esc(m.was)}</td><td>${esc(m.warum)}</td><td class="zahl">${m.lektionen}</td><td>${esc(m.quelle)}</td><td>${esc(pname(m.person))}</td><td>${datum(m.start)}${tag !== 1 ? ' <span class="badge fehler"><span aria-hidden="true">✕</span>kein Montag</span>' : ""}</td><td>${esc(m.status)}</td>
        <td>${istSV() && m.status === "erfasst" ? `<button class="btn klein" data-aktion="mutation-melden" data-id="${m.id}">An VSA melden</button>` : ""}</td></tr>`;
    }).join("");
    const summeKlassen = S.klassen.reduce((a, k) => a + k.schueler, 0);
    return `<div class="seitenkopf"><div><h1>Stellenplan und VZE</h1><p class="muted">Zuteilung der Vollzeiteinheiten (VZE) nach Schülerzahl und Sozialindex, Klassenbildung und Meldungen an das Volksschulamt. Werte nach Weisung 2026/27 (ZU PRÜFEN).</p></div>
      <div class="aktionen"><button class="btn" data-aktion="export-stellenplan">⇩ Zusammenstellung VZE (CSV)</button></div></div>
      <section class="karte" style="margin-bottom:1rem"><h2>Berechnung VZE Berufsauftrag Sekundarstufe</h2>
        <div class="formzeile">
          ${ein("schuelerzahl", "Schülerzahl", "1", "Stichtag 15. September des Vorjahres")}
          ${ein("sozialindex", "Sozialindex", "0.1", "100–120, Mittel der drei Vorjahre")}
          <label class="feld">Korrekturfaktor<input type="number" value="${p.korrekturfaktor}" disabled><span class="small">Sek 2026/27</span></label>
          <label class="feld">Basiswert<input type="number" value="${p.basiswert}" disabled><span class="small">Sekundarstufe</span></label>
        </div>
        <p class="small">VZE = ${st.schuelerzahl} × ${zahl(st.sozialindex, 1)} × ${p.korrekturfaktor} / (${p.basiswert} × 100) = <strong>${zahl(x.vze, 2)} VZE</strong> = ${zahl(x.wlBA, 1)} WL (1 VZE = ${p.lektionenJeVZE} WL). Klassen nach Lektionentafel brauchen ${zahl(x.bedarfKlassenVZE, 2)} VZE.</p>
        <p class="small muted">Grundlage: ${RR(["LPG", "3", "Abs. 1"], ["LPVO", "2", "Abs. 1–4"], ["LPVO", "2 a"], ["LPVO", "2 b"], ["LPVO", "2 d"])}</p>
      </section>
      <div class="karten">
        <div class="karte"><div class="titel">VZE Berufsauftrag</div><div class="zahl">${zahl(x.vze, 2)}</div><div class="small muted">${zahl(x.wlBA, 1)} WL · verplant ${zahl(v.ba.verplant, 1)} WL</div></div>
        <div class="karte"><div class="titel">VZE Schulleitung</div><div class="zahl">${zahl(x.sl, 3)}</div><div class="small muted">${p.slSockel} + ${p.slJeVZE} × VZE BA${x.vze >= 25 ? " + Sockel je 25 VZE" : ""} · ${R("LPVO", "2 c", "Abs. 1–2")}</div></div>
        <div class="karte"><div class="titel">Gestaltungspool</div><div class="zahl">${zahl(x.pool, 3)} VZE</div><div class="small muted">${zahl(x.wlPool, 1)} WL · ${p.gestaltungspoolJeVZE} × VZE BA · ${R("LPVO", "2 c", "Abs. 4–5")}</div></div>
        <div class="karte"><div class="titel">Koordination Sek (kommunal)</div><div class="zahl">${zahl(x.koordination, 3)} VZE</div><div class="small muted">${p.koordinationSekJeVZE} × VZE BA, Kosten Gemeinde · ${R("LPVO", "2 e", "Abs. 1")}</div></div>
        <div class="karte"><div class="titel">Therapien (Höchstangebot)</div><div class="zahl">${zahl(x.therapieMax, 3)} VZE</div><div class="small muted">${p.therapieMaxJe100} VZE je 100 SuS; nicht genutzte in IF umlagerbar (Bewilligung) · ${R("LPVO", "2 e", "Abs. 2 lit. c, e")}</div></div>
        <div class="karte"><div class="titel">DaZ-Aufnahmeunterricht</div><div class="zahl">${zahl(x.dazWL, 1)} WL</div><div class="small muted">ausserhalb VZE · ${st.dazErstesJahr} SuS 1. Jahr × ${p.dazErstesJahrWL} WL, ${st.dazFolgejahre} SuS Folgejahre</div></div>
      </div>
      <div class="formzeile">${ein("dazErstesJahr", "DaZ-SuS im 1. Jahr", "1", "2 WL je SuS")}${ein("dazFolgejahre", "DaZ-SuS 2./3. Jahr", "1", "0.5–0.75 WL je SuS")}</div>
      <h2>Klassenbildung</h2>
      <p class="small muted">Die Gemeinde legt im Stellenplan die Aufteilung der VZE auf Abteilungen und Klassen fest (${R("LPG", "3", "Abs. 2")}) und meldet ihn dem Volksschulamt (${R("LPVO", "2", "Abs. 5")}).</p>
      <p class="small muted">Variante 2 Abteilungen (A/B). Höchstzahlen: A ${p.maxKlassengroesse.A}, B ${p.maxKlassengroesse.B}, C ${p.maxKlassengroesse.C}. Mehr als drei über dem Maximum: Halbklassen-/Teamteaching-Lektionen oder Teilung innerhalb der zugeteilten VZE. Schüler/innen in Klassen: ${summeKlassen} (Stichtag: ${st.schuelerzahl}).</p>
      <div class="tabelle-wrap"><table><thead><tr><th>Klasse</th><th>Lektionentafel</th><th class="zahl">Schüler/innen</th><th>Klassengrösse</th><th class="zahl">VZE</th><th class="zahl">WL der Klasse</th></tr></thead><tbody>${klassenZ}
        <tr class="summe"><td colspan="4">Total Klassenlektionen (ohne IF)</td><td class="zahl">${zahl(x.bedarfKlassenVZE, 2)}</td><td class="zahl">${lekBedarf}</td></tr></tbody></table></div>
      <h2 style="margin-top:1.25rem">Mutationen an das Volksschulamt</h2>
      <p class="small muted">Änderungen während des Schuljahres vor der Eingabe im Personalsystem melden: was, warum, Lektionen, Quelle (Gestaltungspool oder Stellenpool), Person und Startdatum (ein Montag). Anpassung der VZE bei geänderten Verhältnissen: ${R("LPG", "3", "Abs. 3")}.</p>
      <div class="tabelle-wrap"><table><thead><tr><th>Was</th><th>Warum</th><th class="zahl">Lektionen</th><th>Quelle</th><th>Person</th><th>Start</th><th>Stand</th><th></th></tr></thead><tbody>${muts || '<tr><td colspan="8" class="muted">Keine Mutationen.</td></tr>'}</tbody></table></div>
      ${istSL() || istSV() ? '<p style="margin-top:.5rem"><button class="btn" data-aktion="mutation-neu">+ Mutation erfassen</button></p>' : ""}`;
  };

  seiten.jahresablauf = function () {
    const heute = P().planungsdatum;
    const zeilen = S.termine.map((t) => {
      const vorbei = t.datum < heute;
      const naechster = !vorbei && S.termine.filter((x) => x.datum >= heute)[0] === t;
      return `<tr><td>${datum(t.datum)}</td><td>${esc(t.titel)}</td><td>${esc(t.wer)}</td><td class="small">${t.recht ? R(...t.recht) : ""}</td><td>${vorbei ? '<span class="badge erfolg"><span aria-hidden="true">✓</span>vorbei</span>' : naechster ? '<span class="badge warnung"><span aria-hidden="true">!</span>nächste Frist</span>' : '<span class="badge neutral"><span aria-hidden="true">○</span>offen</span>'}</td></tr>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Jahresablauf Planung ${esc(S.schuljahr)}</h1><p class="muted">Fristen der Lehrerstellenbewilligung und der Personalplanung. Planungsdatum im Prototyp: ${datum(heute)}. Daten sinngemäss nach Weisung 2026/27 (ZU PRÜFEN).</p></div></div>
      <div class="tabelle-wrap"><table><thead><tr><th>Datum</th><th>Schritt</th><th>Zuständig</th><th>Grundlage</th><th>Stand</th></tr></thead><tbody>${zeilen}</tbody></table></div>
      <p class="small muted" style="margin-top:.75rem">Erinnerungen und Fristen laufen später über EduKSX-Flow.</p>`;
  };

  seiten.parameter = function () {
    const p = P();
    const dis = istSL() ? "" : "disabled";
    const feld = (k, t, hilfe) => `<label class="feld">${t}<input type="number" step="any" value="${p[k]}" data-aktion="param" data-k="${k}" ${dis}><span class="small">${hilfe}</span></label>`;
    const tafeln = Object.entries(S.lektionentafeln).map(([id, t]) => `<section class="karte"><h3>${esc(t.name)}</h3><p class="small muted">${t.vze} VZE · ${t.wlKlasse} WL der Klasse · Pflichtlektionen je Schüler/in ${t.pflicht}${t.kommunal ? ` · zusätzlich ${t.kommunal} WL kommunal` : ""}</p><div class="tabelle-wrap"><table><thead><tr><th>Fach</th><th class="zahl">WL</th></tr></thead><tbody>${Object.entries(t.faecher).map(([f, w]) => `<tr><td>${esc(S.faecher[f])}${Array.isArray(w) ? " <span class=\"small muted\">(Halbklassen)</span>" : ""}</td><td class="zahl">${Array.isArray(w) ? w[0] + " × 2" : w}</td></tr>`).join("")}</tbody></table></div></section>`).join("");
    return `<div class="seitenkopf"><div><h1>Parameter und Lektionentafeln</h1><p class="muted">Kanton Zürich: Berufsauftrag (Handbuch, Stand 1.1.2024) und Lehrerstellenbewilligung (Weisung 2026/27). Werte je Kanton und Schuljahr zu pflegen – im Prototyp änderbar, Änderungen wirken sofort.</p></div></div>
      <h2>Berufsauftrag</h2>
      <div class="formzeile">
        ${feld("faktorLektion", "Unterricht: h je Wochenlektion", `Lektionenfaktor; Berufseinführung +1.5 h · ${R("LPVO", "7")}`)}
        ${feld("klassenlehrperson", "Klassenlehrperson: h je Klasse", `bei zwei Personen aufteilbar · ${R("LPVO", "10 f")}`)}
        ${feld("pauschaleSchule", "Schule: h bei 100 %", `anteilig · ${R("LPVO", "10 a")}`)}
        ${feld("pauschaleZusammenarbeit", "Zusammenarbeit: h bei 100 %", `anteilig · ${R("LPVO", "10 b")}`)}
        ${feld("pauschaleWeiterbildung", "Weiterbildung: h bei 100 %", `anteilig · ${R("LPVO", "10 c")}`)}
      </div>
      <div class="formzeile">
        ${feld("mindestpensum", "Mindestpensum %", `in der Regel · ${R("LPG", "6", "Abs. 1")}`)}
        ${feld("anteilUnterrichtMin", "Mindestanteil Unterricht %", `60-%-Regel · ${R("LPG", "6", "Abs. 2")}`)}
        ${feld("klpMindestlektionen", "Klassenlehrperson: Mindest-WL", "Sekundarstufe")}
        ${feld("kustodieMaxStunden", "Kustodie im Berufsauftrag bis h", `darüber Entschädigung · ${R("LPVO", "2 f")}`)}
      </div>
      <div class="tabelle-wrap" style="max-width:640px"><table><thead><tr><th>Alter</th><th class="zahl">Ferientage</th><th class="zahl">Netto-Jahresarbeitszeit 100 %</th></tr></thead><tbody>${p.nettoJahresarbeitszeit.map((x, i, arr) => `<tr><td>${i === 0 ? "bis 20" : i === arr.length - 1 ? "ab 60" : (arr[i - 1].bisAlter + 1) + "–" + x.bisAlter}</td><td class="zahl">${x.ferientage}</td><td class="zahl">${zahl(x.stunden)} h</td></tr>`).join("")}<tr><td colspan="2">Brutto (52 × 42 h)</td><td class="zahl">${zahl(p.bruttoJahresarbeitszeit)} h</td></tr></tbody></table></div><p class="small muted">Ferienanspruch nach Alter: ${R("VVO", "79")}, für Lehrpersonen ab Beginn des Schuljahres (${R("LPVO", "13")}).</p>
      <h2 style="margin-top:1.25rem">Lektionentafeln Sekundarstufe</h2><div class="spalten">${tafeln}</div>`;
  };

  // ---------------------------------------------------------------- VZE-Tool des VSA
  let VZE = null; // { name, bytes, analyse, se, leeren, fehler } – nur im Speicher, nie gespeichert oder hochgeladen
  function vzeDaten() {
    const x = stellenRechnung();
    const gpMut = (k) => S.mutationen.filter((m) => m.klasse === k && m.quelle === "Gestaltungspool").reduce((a, m) => a + Number(m.lektionen), 0);
    const klassen = S.klassen.map((k) => ({
      name: k.id, jahrgang: k.jahrgang, abteilung: k.abteilung, schueler: k.schueler,
      klp: k.klp.map(pname).join(" / "),
      lektionen: S.lektionen.filter((l) => l.klasse === k.id && l.ressource === "ba" && !l.zusatz && einheit(l) === "WL").reduce((a, l) => a + sollLp(l) * semF(l), 0),
      gestaltungspoolWL: gpMut(k.id),
    }));
    const vzeJeStunde = 1 / (P().faktorLektion * P().lektionenJeVZE);
    const bg = {};
    for (const g of S.gefaesse) if (g.ressource === "pool" && g.art === "zusatz") for (const pid of g.teilnehmende) bg[pid] = (bg[pid] || 0) + gefaessStunden(g, pid) * vzeJeStunde;
    const wlFach = (pid, test) => S.lektionen.filter((l) => test(l)).reduce((a, l) => a + l.zuteilung.filter((z) => z.person === pid).reduce((b, z) => b + Number(z.wl) * semF(l), 0), 0);
    const ifPersonen = planbar().filter((p) => wlFach(p.id, (l) => l.fach === "IF") > 0);
    const slEinsaetze = S.lektionen.filter((l) => l.ressource === "sl");
    return {
      stufe: "Sekundar",
      klassen,
      gpZuteilungVZE: x.pool,
      ifWL: S.lektionen.filter((l) => l.fach === "IF").reduce((a, l) => a + sollLp(l) * semF(l), 0),
      ifGestaltungspoolWL: 0,
      erhoehungBG: Object.entries(bg).map(([pid, vze]) => ({ name: pname(pid), vze })),
      vikariate: S.ausfaelle.filter((a) => a.quelle === "Gestaltungspool").map((a) => ({ lektionen: a.wl * wochen(a), text: `${pname(a.person)}, ${datum(a.von)}–${datum(a.bis)}` })),
      schulleitung: {
        slVZE: x.sl, koordinationVZE: x.koordination,
        personen: slEinsaetze.flatMap((l) => l.zuteilung.map((z) => ({ name: pname(z.person), vze: Number(z.wl) / 100, bemerkung: l.bemerkung || "" }))),
        lehrpersonen: (S.stellen.koordination || []).map((k) => ({ name: pname(k.person), vze: k.vze, ko: true })),
      },
      kontrolleSP: ifPersonen.map((p) => ({
        name: p.name,
        ifWL: wlFach(p.id, (l) => l.fach === "IF"),
        regelklasseWL: wlFach(p.id, (l) => l.fach !== "IF" && l.ressource === "ba" && einheit(l) === "WL"),
      })),
    };
  }
  const MUSTER = "muster/VZE-Tool_Muster_VSA-2.19.xlsx";
  async function vzeMusterLaden() {
    try {
      const antwort = await fetch(MUSTER);
      if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
      await vzeLaden({ name: "VZE-Tool_Muster_VSA-2.19.xlsx", arrayBuffer: () => antwort.arrayBuffer() }, true);
    } catch (e) {
      VZE = { name: "Hinterlegtes Muster", fehlerLaden: `konnte nicht geladen werden (${e.message}). Lokal geöffnet (file://) blockiert der Browser das Nachladen – online über GitHub Pages öffnen oder die Datei «muster/VZE-Tool_Muster_VSA-2.19.xlsx» über «Datei wählen» laden.` };
      zeichnen();
    }
  }
  async function vzeLaden(datei, muster) {
    try {
      const bytes = new Uint8Array(await datei.arrayBuffer());
      const mappe = await XlsxVorlage.Mappe.oeffnen(bytes);
      const analyse = await VZETool.analysieren(mappe);
      VZE = { name: datei.name, bytes, analyse, se: (analyse.schuleinheiten[0] || {}).index, leeren: true, fehler: null, muster: !!muster };
      protokoll(`VZE-Tool geladen (${analyse.version}, ${analyse.schuleinheiten.length} Schuleinheiten)`);
    } catch (e) {
      VZE = { name: datei.name, fehlerLaden: e.message };
    }
    zeichnen();
  }
  async function vzeAusfuellen() {
    const se = VZE.analyse.schuleinheiten.find((x) => x.index === Number(VZE.se));
    const { zellen } = VZETool.belegung(VZE.analyse.version, se, vzeDaten());
    const mappe = await XlsxVorlage.Mappe.oeffnen(VZE.bytes);
    const r = await VZETool.ausfuellen(mappe, VZE.analyse.version, se, zellen, { leeren: VZE.leeren });
    VZE.fehler = r.fehler;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([r.bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    a.download = VZE.name.replace(/\.xlsx$/i, "") + "_EduKSX.xlsx";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    protokoll(`VZE-Tool ausgefüllt: ${se.anzeige}, ${r.geschrieben} Zellen`);
    ansage(`${a.download} erstellt – ${r.geschrieben} Eingabezellen ausgefüllt${r.fehler.length ? `, ${r.fehler.length} Hinweise` : ""}.`);
    speichern();
    zeichnen();
  }

  seiten.vzetool = function () {
    const v = VZE && VZE.analyse;
    const seListe = v ? v.schuleinheiten : [{ index: 1, anzeige: "Schuleinheit 1 (Beispiel)", blatt: "SE1" }];
    const se = seListe.find((x) => x.index === Number(VZE && VZE.se)) || seListe[0];
    const version = v && v.bekannt ? v.version : "VSA 2.19";
    const { zellen, hinweise } = VZETool.belegung(version, se, vzeDaten());
    const gruppen = {};
    for (const z of zellen) (gruppen[z.bereich] = gruppen[z.bereich] || []).push(z);
    const vorschau = Object.entries(gruppen).map(([b, zs]) => `<details ${b === "Klassenbildung" ? "open" : ""}><summary><strong>${esc(b)}</strong> · ${zs.length} Zellen</summary>
      <div class="tabelle-wrap" style="margin:.5rem 0 1rem"><table><thead><tr><th>Blatt</th><th>Zelle</th><th>Wert</th><th>Bedeutung</th></tr></thead><tbody>${zs.map((z) => `<tr><td class="small">${esc(z.blatt)}</td><td><code>${esc(z.ref)}</code></td><td class="${typeof z.wert === "number" ? "zahl" : ""}">${esc(typeof z.wert === "number" ? zahl(z.wert, Number.isInteger(z.wert) ? 0 : 2) : z.wert)}</td><td class="small">${esc(z.text)}</td></tr>`).join("")}</tbody></table></div></details>`).join("");
    const info = v ? `<div class="tabelle-wrap" style="max-width:720px"><table><tbody>
        <tr><th scope="row">Datei</th><td>${esc(VZE.name)}</td></tr>
        <tr><th scope="row">Version</th><td>${esc(v.version)} ${v.bekannt ? '<span class="badge erfolg"><span aria-hidden="true">✓</span>Zellbelegung bekannt</span>' : '<span class="badge fehler"><span aria-hidden="true">✕</span>unbekannte Version – Zellbelegung prüfen</span>'}</td></tr>
        <tr><th scope="row">Schuljahr</th><td>${esc(v.schuljahr || "–")}${v.schuljahr && v.schuljahr !== S.schuljahr ? ` <span class="badge warnung"><span aria-hidden="true">△</span>Planung ist ${esc(S.schuljahr)}</span>` : ""}</td></tr>
        <tr><th scope="row">Schulgemeinde</th><td>${esc(v.gemeinde)} (${esc(v.nummer)})</td></tr>
        <tr><th scope="row">Schuleinheiten</th><td>${v.schuleinheiten.map((x) => esc(x.anzeige)).join(", ")}</td></tr></tbody></table></div>` : "";
    return `<div class="seitenkopf"><div><h1>VZE-Tool des Volksschulamts</h1><p class="muted">Das Excel-Tool, das die Schulgemeinde vom VSA erhält, wird mit der Planung aus EduKSX-Staffing ausgefüllt – exakt im Original: Formatierung, Formeln, Kommentare, Blattschutz und ausgeblendete Blätter bleiben unverändert. Geschrieben wird nur in Eingabezellen. Meldung des Stellenplans: ${R("LPVO", "2", "Abs. 5")}.</p></div></div>
      <div class="meldung info" role="note"><strong>Datenschutz:</strong> Die Datei wird nur in diesem Browser verarbeitet und nirgends hochgeladen oder gespeichert. Excel rechnet beim Öffnen alle Formeln neu (in LibreOffice: «Neu berechnen» bzw. Strg+Umschalt+F9).</div>
      <section class="karte" style="margin-bottom:1rem"><h2>1. VZE-Tool wählen</h2>
        <div class="formzeile"><label class="feld">Excel-Datei des VSA (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-aktion="vze-datei"></label>
          <span class="muted small" style="align-self:center">oder</span>
          <button class="btn" data-aktion="vze-muster" title="Anonymisiertes VZE-Tool (VSA 2.19, Schulgemeinde Musterhausen, Schulhaus A und B) zum Ausprobieren">⇪ Hinterlegtes Muster laden</button></div>
        ${VZE && VZE.muster ? '<div class="meldung warnung small">Hinterlegtes Muster: anonymisiertes VZE-Tool 2026/27 (Schulgemeinde Musterhausen, Schulhaus A und B) – nur zum Ausprobieren, nicht für eine Meldung an das VSA verwenden.</div>' : ""}
        ${VZE && VZE.fehlerLaden ? `<div class="meldung fehler" role="alert">${esc(VZE.name)}: ${esc(VZE.fehlerLaden)}</div>` : ""}
        ${info || '<p class="small muted">Ohne Datei zeigt die Vorschau unten die Zellbelegung für eine Beispiel-Schuleinheit.</p>'}
      </section>
      <section class="karte" style="margin-bottom:1rem"><h2>2. Schuleinheit und Optionen</h2>
        <div class="formzeile">
          <label class="feld">Planung «${esc(S.schulen.find((x) => x.id === S.schule).name)}» eintragen in<select data-aktion="vze-se" ${v ? "" : "disabled"}>${seListe.map((x) => `<option value="${x.index}" ${x.index === se.index ? "selected" : ""}>${esc(x.anzeige)}</option>`).join("")}</select></label>
          <label class="feld"><span><input type="checkbox" data-aktion="vze-leeren" ${!VZE || VZE.leeren !== false ? "checked" : ""}> bisherige Eingaben dieser Schuleinheit vorher leeren</span></label>
        </div>
        ${hinweise.length ? `<div class="meldung warnung">${hinweise.map(esc).join("<br>")}</div>` : ""}
        <p><button class="btn primaer" data-aktion="vze-ausfuellen" ${v && v.bekannt ? "" : "disabled"}>⇩ Ausfüllen und herunterladen</button> <span class="small muted">${zellen.length} Eingabezellen</span></p>
        ${VZE && VZE.fehler ? (VZE.fehler.length ? `<div class="meldung warnung"><strong>Nicht geschrieben:</strong><ul>${VZE.fehler.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>` : '<div class="meldung info">Alle Werte geschrieben. Datei vor dem Versand in Excel öffnen, prüfen (rote Felder) und unterschreiben lassen.</div>') : ""}
      </section>
      <h2>3. Vorschau der Zellbelegung (${esc(version)})</h2><div data-glossary-ignore>${vorschau}</div>
      <p class="small muted">Nicht automatisch ausgefüllt: Abteilungen und Anforderungsstufen, kommunale Erweiterung, Zus. ISR, Antrag zusätzliche VZE, Datum und Unterschriften – diese Blätter bleiben wie geliefert.</p>`;
  };

  // ---------------------------------------------------------------- Hilfe
  function verlinken(text, kurz) {
    // §-Verweise im Gesetzestext verlinken: gleiches Erlass, «LPG»/«Lehrpersonalgesetz» → LPG; andere Erlasse nicht
    return esc(text).replace(/(§§?\s?)(\d+(?:\s[a-z](?![a-zäöüß]))?)/g, (m, vor, nr, pos, ganz) => {
      const danach = ganz.slice(pos + m.length, pos + m.length + 70).split("§")[0];
      let ziel = kurz;
      if (/\bLPG\b|Lehrpersonalgesetz|Lehrerpersonalgesetz/.test(danach)) ziel = "LPG";
      else if (/\bVVO\b|Vollzugsverordnung zum Personalgesetz/.test(danach)) ziel = "VVO";
      else if (/Volksschul|Personalgesetz|Personalverordnung|VVO|Verordnung (über|vom)|Übergangsordnung|Berufseinführung|Obligationenrecht|OR\b|Mittelschul|Vollzugs|[a-zäöü]gesetz|Bundes/.test(danach)) return m;
      if (!paragraph(ziel, nr)) return m;
      return `${vor}<a class="gesetz" data-glossary-ignore href="#/hilfe/${ziel}/${nr.replace(/\s+/g, "")}">${nr}</a>`;
    });
  }
  // Stichworte der Anwendung, die im Gesetzestext nicht wörtlich vorkommen (für die Suche)
  const STICHWORTE = {
    "LPG-3": "VZE Stellenplan Sozialindex", "LPG-6": "Mindestpensum 35 % 60-%-Regel Beschäftigungsgrad", "LPG-5": "Vikariat Stellvertretung",
    "LPG-18": "Berufsauftrag Unterricht", "LPG-18a": "Berufsauftrag Schule", "LPG-18b": "Berufsauftrag Zusammenarbeit", "LPG-18c": "Berufsauftrag Weiterbildung",
    "LPG-20": "MAB Mitarbeitendenbeurteilung", "LPG-7a": "Probezeitgespräch",
    "LPVO-2": "VZE Formel Basiswert Korrekturfaktor Stellenplan 1. März", "LPVO-2c": "Gestaltungspool Schulleitung VZE 0,028 0,204 0,041",
    "LPVO-2d": "27,3 Wochenlektionen VZE", "LPVO-2e": "Koordination Sekundarstufe kommunal Mehrferien Altersentlastung Wahlfächer 3. Sek",
    "LPVO-2f": "Kustodie Entschädigung 50 Stunden Ämter", "LPVO-7": "Lektionenfaktor 58 Stunden Berufseinführung 1,5",
    "LPVO-9": "Beschäftigungsgrad Schulleitung Pensum", "LPVO-10": "Arbeitszeit Pensenvereinbarung Absenzen 1/12",
    "LPVO-10a": "Pauschale Schule 60 Stunden", "LPVO-10b": "Pauschale Zusammenarbeit 50 Stunden", "LPVO-10c": "Pauschale Weiterbildung 30 Stunden",
    "LPVO-10f": "Klassenlehrperson KLP 100 Stunden", "LPVO-11": "Arbeitszeitsaldo 300 Stunden", "LPVO-23": "MAB Mitarbeitendenbeurteilung jährlich",
    "VVO-21": "Personaldossier Führung", "VVO-22": "Personaldossier Gliederung Inhalt", "VVO-23": "Personaldossier Aufbewahrung", "VVO-27": "Einsichtsrecht Personaldossier",
    "VVO-79": "Ferienanspruch Alter Netto-Jahresarbeitszeit", "VVO-84": "Urlaub Abwesenheit", "VVO-92": "Unbezahlter Urlaub", "VVO-96": "Mutterschaftsurlaub Stellvertretung",
    "VVO-99": "Lohnfortzahlung Krankheit Unfall Stellvertretung", "VVO-136": "Mitarbeiterbeurteilung MAB", "VVO-137": "Mitarbeiterbeurteilung Verfahren", "VVO-139": "Austrittsgespräch Arbeitszeugnis",
    "VVO-15": "Kündigungsfrist Freistellung", "VVO-144": "Nebenbeschäftigung weitere Anstellung", "VVO-125": "Überzeit",
    "LPVO-30": "Vikariat Stellvertretung", "LPVO-31": "Vikariat Lohn Lektionenansatz", "LPVO-1a": "Schuljahr 1. August",
  };
  seiten.hilfe = function (q, kurz, nr) {
    const aktiv = RECHT[kurz] ? kurz : (q.get("g") || "");
    const tab = (k, t) => `<a role="tab" class="btn ${aktiv === k ? "primaer" : ""}" href="#/hilfe${k ? "/" + k : ""}" aria-selected="${aktiv === k}">${t}</a>`;
    let inhalt;
    if (!aktiv) {
      inhalt = `<section class="karte" style="max-width:860px"><h2>So arbeitet EduKSX-Staffing</h2>
        <ol>
          <li><strong>Stellenplan und VZE</strong> – zugeteilte Vollzeiteinheiten nach Schülerzahl und Sozialindex (${R("LPG", "3")}, ${R("LPVO", "2")}), Schulleitung und Gestaltungspool (${R("LPVO", "2 c")}).</li>
          <li><strong>Unterricht</strong> – Lektionen der Klassen Personen zuweisen; 27,3 Wochenlektionen je VZE (${R("LPVO", "2 d")}).</li>
          <li><strong>Personen und Pensen</strong> – Beschäftigungsgrad aus dem Berufsauftrag (${R("LPG", "18")}–${R("LPG", "18 c")}, ${R("LPVO", "7")}, ${R("LPVO", "10 a")}–${R("LPVO", "10 f")}); Mindestpensum und 60-%-Regel (${R("LPG", "6")}).</li>
          <li><strong>Freigaben</strong> – die Schulleitung legt den Beschäftigungsgrad im Rahmen des bewilligten Stellenplans fest (${R("LPVO", "9")}), die Gemeinde stellt an (${R("LPG", "7")}).</li>
          <li><strong>VZE-Tool (VSA)</strong> – Stellenplan an das Volksschulamt melden (${R("LPVO", "2", "Abs. 5")}).</li>
          <li><strong>Allgemeines Personalrecht</strong> – wo die LPVO darauf verweist, gilt die Vollzugsverordnung zum Personalgesetz: Ferienanspruch (${R("LPVO", "13")}, ${R("VVO", "79")}), Urlaub (${R("LPVO", "27")}, ${R("VVO", "84")}–${R("VVO", "98")}), Lohnfortzahlung (${R("VVO", "99")}), Personaldossier (${R("VVO", "21")}–${R("VVO", "27")}), Mitarbeiterbeurteilung (${R("VVO", "136")}).</li>
        </ol>
        <p class="small muted">Verweise in der Anwendung (z. B. ${R("LPG", "6", "Abs. 2")}) öffnen die Bestimmung hier in der Hilfe.</p></section>
        <div class="karten" style="margin-top:1rem">${Object.values(RECHT).map((g) => `<a class="karte" href="#/hilfe/${g.kurz}" style="text-decoration:none;color:inherit"><div class="titel">LS ${esc(g.nummer)} · Stand ${esc(g.stand)}</div><div class="zahl" style="font-size:1.2rem">${esc(g.titel)}</div><div class="small muted">${g.abschnitte.reduce((a, x) => a + x.paragraphen.filter((p) => p.nr && !p.uebergang).length, 0)} Paragraphen</div></a>`).join("")}</div>`;
    } else {
      const g = RECHT[aktiv];
      let ueb = 0;
      const inhaltVz = g.abschnitte.filter((a) => !a.titel.startsWith("Übergangs")).map((a) => `<li><strong>${esc(a.titel)}</strong>${a.paragraphen.length ? `<div class="small">${a.paragraphen.map((p) => `<a href="#/hilfe/${aktiv}/${p.nr.replace(/\s+/g, "")}" title="${esc(p.titel || "")}">§ ${esc(p.nr)}</a>`).join(" · ")}</div>` : ""}</li>`).join("");
      const text = g.abschnitte.map((a) => {
        const istUeb = a.titel.startsWith("Übergangs");
        if (istUeb) ueb++;
        return `<section class="gesetz-abschnitt"><h2 style="margin-top:1.5rem">${esc(a.titel)}</h2>${a.paragraphen.map((p) => {
          const id = pAnker(aktiv, p.nr || "x", istUeb ? ueb : 0);
          const absaetze = p.absaetze.map((x) => x.liste ? `<li style="list-style:none">${verlinken(x.text, aktiv)}</li>` : `<p>${x.nr ? `<sup>${esc(x.nr)}</sup> ` : ""}${verlinken(x.text, aktiv)}</p>`).join("");
          return `<article class="paragraf${p.aufgehoben ? " muted" : ""}" id="${id}" data-suchtext="${esc(((p.titel || "") + " " + (istUeb ? "" : STICHWORTE[id] || "") + " " + p.absaetze.map((x) => x.text).join(" ")).toLowerCase())}" tabindex="-1">
            ${p.nr ? `<h3>§ ${esc(p.nr)}${p.titel ? ` <span class="muted" style="font-weight:500">${esc(p.titel)}</span>` : ""}</h3>` : ""}<div class="paragraf-text">${absaetze}</div>${!istUeb && STICHWORTE[id] ? `<p class="small muted">In EduKSX-Staffing: ${esc(STICHWORTE[id])}</p>` : ""}</article>`;
        }).join("")}</section>`;
      }).join("");
      inhalt = `<div class="spalten" style="grid-template-columns:minmax(0,260px) minmax(0,1fr);align-items:start">
        <nav class="karte" aria-label="Inhalt ${esc(aktiv)}" style="position:sticky;top:5rem;max-height:75vh;overflow:auto"><h2>Inhalt</h2><ol style="padding-left:1rem;margin:0">${inhaltVz}</ol></nav>
        <div>
          <div class="seitenkopf" style="margin-bottom:.5rem"><div><h2 style="font-size:1.3rem">${esc(g.titel)}</h2><p class="muted small">LS ${esc(g.nummer)} · Stand ${esc(g.stand)} · aufbereitet aus der Zürcher Gesetzessammlung, ohne Fussnoten${aktiv === "LPVO" ? " und ohne Anhang (Lohntabellen)" : ""}.${aktiv === "VVO" ? " Gilt für Lehrpersonen, soweit LPG und LPVO darauf verweisen oder nichts anderes regeln (z. B. §§ 118–134 nicht anwendbar, " + R("LPVO", "10") + ")." : ""} Massgebend ist die <a href="${esc(g.url)}" target="_blank" rel="noopener">amtliche Fassung</a>.</p></div></div>
          <div class="formzeile"><label class="feld">Im ${esc(aktiv)} suchen<input type="search" data-aktion="hilfe-suche" placeholder="z. B. Gestaltungspool, Klassenlehrperson" style="min-width:18rem"></label><span class="small muted" id="hilfe-treffer"></span></div>
          ${text}
        </div></div>`;
    }
    return `<div class="seitenkopf"><div><h1>Hilfe und gesetzliche Grundlagen</h1><p class="muted">Lehrpersonalgesetz (LPG), Lehrpersonalverordnung (LPVO) und Vollzugsverordnung zum Personalgesetz (VVO) des Kantons Zürich – mit Verweisen aus der Anwendung.</p></div></div>
      <div class="formzeile" role="tablist">${tab("", "Übersicht")}${tab("LPG", "Lehrpersonalgesetz (LPG)")}${tab("LPVO", "Lehrpersonalverordnung (LPVO)")}${RECHT.VVO ? tab("VVO", "Vollzugsverordnung Personalgesetz (VVO)") : ""}</div>${inhalt}`;
  };

  // ---------------------------------------------------------------- Dialog, Ansage, Export
  function dialog(titel, html, knoepfe) {
    const d = document.createElement("dialog");
    d.innerHTML = `<h2>${esc(titel)}</h2><div>${html}</div><div class="formzeile" style="justify-content:flex-end;margin:1rem 0 0">${(knoepfe || []).map((k, i) => `<button class="btn ${k.primaer ? "primaer" : ""}" data-k="${i}">${esc(k.text)}</button>`).join("")}<button class="btn" data-k="x">Schliessen</button></div>`;
    document.body.appendChild(d);
    d.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]");
      if (!b) return;
      if (b.dataset.k !== "x") { const r = knoepfe[Number(b.dataset.k)].los(d); if (r === false) return; }
      d.close();
    });
    d.addEventListener("close", () => d.remove());
    d.showModal();
    return d;
  }
  function ansage(text) {
    const a = document.getElementById("ansage");
    if (a) a.textContent = text;
    const t = document.createElement("div");
    t.className = "meldung info";
    t.setAttribute("role", "status");
    t.style.cssText = "position:fixed;right:1rem;bottom:1rem;z-index:50;max-width:360px;box-shadow:var(--shadow)";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  function csv(name, zeilen) {
    const text = zeilen.map((z) => z.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ansage(`${name} erstellt (Testdaten).`);
  }

  // ---------------------------------------------------------------- Aktionen
  function freigeben(pid) {
    const f = S.freigaben[pid] || {};
    const warAngestellt = !!f.angestellt;
    S.freigaben[pid] = { ...f, stand: stand(pid), zeit: new Date().toISOString(), angestellt: false, erledigt: false, aenderungSV: warAngestellt || !!f.aenderungSV };
    protokoll(`${pname(pid)} zur Anstellung freigegeben (${zahl(S.freigaben[pid].stand.pensum, 1)} %)`);
  }

  function aktion(el, e) {
    const a = el.dataset.aktion;
    const id = el.dataset.id;
    switch (a) {
      case "rolle": S.rolle = el.value; ansage(`Rolle: ${ROLLEN[S.rolle]}`); if (!erlaubt(aktuelleSeite())) location.hash = "#/uebersicht"; break;
      case "schule": if (el.value !== "s1") { ansage("Im Prototyp ist nur die Sekundarschule mit Testdaten befüllt."); el.value = "s1"; return; } break;
      case "schuljahr": if (el.value !== "2027/28") { ansage("Frühere Schuljahre sind im Prototyp nur angedeutet (Übernahme aus dem Vorjahr: ST-A3)."); el.value = "2027/28"; return; } break;
      case "thema": {
        const dunkel = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", dunkel);
        try { localStorage.setItem("eduksx-thema", dunkel ? "dark" : "light"); } catch (x) { /* egal */ }
        break;
      }
      case "glossar": {
        const neu = !glossarAn();
        try { localStorage.setItem("eduksx-glossar", neu ? "an" : "aus"); } catch (x) { /* egal */ }
        if (!neu) { location.reload(); return; }
        glossarLaden(); zeichnen(); return;
      }
      case "zuruecksetzen":
        dialog("Testdaten neu laden?", "<p>Alle Änderungen dieser Sitzung gehen verloren.</p>", [{ text: "Neu laden", primaer: true, los: () => { S = neuerZustand(); speichern(); zeichnen(); } }]);
        return;
      case "einsatz-gruppe": { const q = new URLSearchParams(); q.set("gruppe", el.dataset.gruppe); location.hash = "#/unterricht?" + q; return; }
      case "ba-ansicht": location.hash = "#/berufsauftrag?ansicht=" + el.dataset.k; return;
      case "einsatz-neu": {
        const g = el.dataset.gruppe;
        const einh = g === "anstellung" ? "%" : "WL";
        dialog(g === "anstellung" ? "Neue Anstellung" : "Neues Gefäss", `<div class="formzeile"><label class="feld">Name<input type="text" id="en-name" value=""></label>
          ${g === "klasse" ? `<label class="feld">Klasse<select id="en-klasse">${S.klassen.map((k) => `<option>${k.id}</option>`).join("")}</select></label><label class="feld">Fach<select id="en-fach">${Object.entries(S.faecher).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label>` : `<label class="feld">Kategorie<input type="text" id="en-kat" value="${g === "weitere" ? "Freifach" : g === "sp" ? "Integrative Förderung" : "Kommunal"}"></label>`}
          <label class="feld">Einheit<select id="en-einheit">${Object.entries(EINHEITEN).map(([k, v]) => `<option value="${k}" ${k === einh ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
          <label class="feld">Soll<input type="number" id="en-soll" min="0" value="${einh === "%" ? 10 : 2}"></label>
          <label class="feld">Ressource<select id="en-r">${S.ressourcen.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</select></label></div>`,
          [{ text: "Anlegen", primaer: true, los: (d) => {
            const name = d.querySelector("#en-name").value.trim();
            const e = d.querySelector("#en-einheit").value; const soll = Number(d.querySelector("#en-soll").value);
            const l = { id: "l" + Date.now(), gruppe: g, klasse: g === "klasse" ? d.querySelector("#en-klasse").value : "", fach: g === "klasse" ? d.querySelector("#en-fach").value : "", name: name || undefined, kategorie: g === "klasse" ? undefined : d.querySelector("#en-kat").value,
              einheit: e, wlSus: e === "WL" ? soll : 0, wlLp: e === "WL" ? undefined : soll, halbklassen: false, ressource: d.querySelector("#en-r").value, faktor: null, semester: [true, true], zuteilung: [], bemerkung: "", stufe: "Sek" };
            if (g !== "klasse" && !name) return false;
            S.lektionen.push(l); protokoll(`${GRUPPEN[g]}: «${eTitel(l)}» angelegt`); speichern(); location.hash = "#/einsatz/" + l.id; } }]);
        return;
      }
      case "einsatz-loeschen": {
        const l = S.lektionen.find((x) => x.id === id);
        dialog("Gefäss löschen?", `<p>«${esc(eTitel(l))}» mit ${l.zuteilung.length} Zuteilungen wird aus der Planung entfernt.</p>`, [{ text: "Löschen", primaer: true, los: () => { S.lektionen = S.lektionen.filter((x) => x !== l); protokoll(`«${eTitel(l)}» gelöscht`); speichern(); location.hash = "#/unterricht?gruppe=" + gruppe(l); } }]);
        return;
      }
      case "e-feld": {
        const l = S.lektionen.find((x) => x.id === id); const f = el.dataset.feld;
        if (el.type === "checkbox") l[f] = el.checked;
        else if (["wlSus", "wlLp", "faktor"].includes(f)) { if (el.value === "") { if (f === "wlLp") delete l.wlLp; else l[f] = f === "faktor" ? null : 0; } else l[f] = Number(el.value); }
        else l[f] = el.value;
        protokoll(`«${eTitel(l)}»: ${f} angepasst`); break;
      }
      case "e-sem": { const l = S.lektionen.find((x) => x.id === id); l.semester[Number(el.dataset.i)] = el.checked; if (!l.semester.some(Boolean)) l.semester = [true, true]; protokoll(`«${eTitel(l)}»: Semester angepasst`); break; }
      case "zt-wert": { const l = S.lektionen.find((x) => x.id === id); l.zuteilung[Number(el.dataset.i)].wl = Number(el.value); protokoll(`«${eTitel(l)}»: ${pname(l.zuteilung[Number(el.dataset.i)].person)} ${el.value} ${einheit(l)}`); break; }
      case "zt-weg": { const l = S.lektionen.find((x) => x.id === id); const z = l.zuteilung.splice(Number(el.dataset.i), 1)[0]; protokoll(`«${eTitel(l)}»: ${pname(z.person)} entfernt`); break; }
      case "zt-dazu": { if (!el.value) return; const l = S.lektionen.find((x) => x.id === id); l.zuteilung.push({ person: el.value, wl: Math.max(0, sollLp(l) - istLp(l)) }); protokoll(`«${eTitel(l)}»: ${pname(el.value)} zugeteilt`); break; }
      case "klp-h": { const k = S.klassen.find((x) => x.id === el.dataset.klasse); k.klpStunden = k.klpStunden || {}; k.klpStunden[el.dataset.p] = Number(el.value); protokoll(`Klassenlehrperson ${k.id}: ${pname(el.dataset.p)} ${el.value} h`); break; }
      case "klp-weg": { const k = S.klassen.find((x) => x.id === el.dataset.klasse); k.klp = k.klp.filter((x) => x !== el.dataset.p); if (k.klpStunden) delete k.klpStunden[el.dataset.p]; protokoll(`Klassenlehrperson ${k.id}: ${pname(el.dataset.p)} entfernt`); break; }
      case "klp-dazu": { if (!el.value) return; const k = S.klassen.find((x) => x.id === el.dataset.klasse); k.klp.push(el.value); protokoll(`Klassenlehrperson ${k.id}: ${pname(el.value)} hinzugefügt`); break; }
      case "k-feld": { const k = S.klassen.find((x) => x.id === el.dataset.klasse); k[el.dataset.feld] = el.value; protokoll(`Klasse ${k.id}: ${el.dataset.feld} angepasst`); break; }
      case "p-feld": { const p = person(id); const f = el.dataset.feld; if (f === "bgSoll") { if (el.value === "") delete p.bgSoll; else p.bgSoll = Number(el.value); } else p[f] = el.value; protokoll(`${p.name}: ${f} angepasst`); break; }
      case "dossier-neu": {
        const p = person(id);
        dialog(`Dossier-Eintrag für ${esc(p.name)}`, `<div class="formzeile"><label class="feld">Vorlage<select id="dn-v">${S.dossierVorlagen.map((v, i) => `<option value="${i}">${esc(v.titel)} (${esc(S.dossierKategorien[v.kategorie])})</option>`).join("")}</select></label>
          <label class="feld">Datum<input type="date" id="dn-d" value="${P().planungsdatum}"></label><label class="feld">Notiz<input type="text" id="dn-n" value=""></label></div>`,
          [{ text: "Erfassen", primaer: true, los: (d) => { const v = S.dossierVorlagen[Number(d.querySelector("#dn-v").value)]; (S.dossier[id] = S.dossier[id] || []).push({ id: "d" + Date.now(), kategorie: v.kategorie, titel: v.titel, datum: d.querySelector("#dn-d").value, notiz: d.querySelector("#dn-n").value }); protokoll(`Dossier ${p.name}: ${v.titel}`); fertig(); } }]);
        return;
      }
      case "dossier-weg": {
        const e = (S.dossier[id] || []).find((x) => x.id === el.dataset.i);
        dialog("Eintrag entfernen?", `<p>«${esc(e.titel)}» vom ${datum(e.datum)} wird aus dem Dossier entfernt.</p>`, [{ text: "Entfernen", primaer: true, los: () => { S.dossier[id] = S.dossier[id].filter((x) => x !== e); protokoll(`Dossier ${pname(id)}: ${e.titel} entfernt`); fertig(); } }]);
        return;
      }
      case "teil-alle": { const g = S.gefaesse.find((x) => x.id === el.dataset.g); for (const p of lehrpersonen()) if (!g.teilnehmende.includes(p.id)) g.teilnehmende.push(p.id); protokoll(`Alle Lehrpersonen zu «${g.name}» hinzugefügt`); break; }
      case "g-loeschen": {
        const g = S.gefaesse.find((x) => x.id === el.dataset.g);
        dialog("Gefäss löschen?", `<p>«${esc(g.name)}» mit ${g.teilnehmende.length} Teilnehmenden wird entfernt.</p>`, [{ text: "Löschen", primaer: true, los: () => { S.gefaesse = S.gefaesse.filter((x) => x !== g); protokoll(`Gefäss «${g.name}» gelöscht`); fertig(); } }]);
        return;
      }
      case "export-matrix": {
        const faecher = Object.keys(S.faecher).filter((f) => S.lektionen.some((l) => l.klasse && l.fach === f));
        csv("klasse-fach-lehrperson.csv", [["Klasse", "KLP"].concat(faecher)].concat(S.klassen.map((k) => [k.id, k.klp.map(kuerzel).join("/")].concat(faecher.map((f) => S.lektionen.filter((l) => l.klasse === k.id && l.fach === f).flatMap((l) => l.zuteilung.map((z) => kuerzel(z.person))).join(" "))))));
        return;
      }
      case "klp": { const k = S.klassen.find((x) => x.id === el.dataset.klasse); k.klp = el.value ? [el.value].concat(k.klp.slice(1).filter((x) => x !== el.value)) : k.klp.slice(1); protokoll(`Klassenlehrperson ${k.id}: ${pname(el.value)}`); break; }
      case "filter-klasse": { const q = new URLSearchParams(location.hash.split("?")[1] || ""); el.value ? q.set("klasse", el.value) : q.delete("klasse"); location.hash = "#/unterricht?" + q; return; }
      case "filter-offen": { const q = new URLSearchParams(location.hash.split("?")[1] || ""); el.checked ? q.set("offen", "1") : q.delete("offen"); location.hash = "#/unterricht?" + q; return; }
      case "g-feld": {
        const g = S.gefaesse.find((x) => x.id === el.dataset.g); const f = el.dataset.feld;
        if (f === "ressource") g.ressource = el.checked ? "pool" : "";
        else if (el.type === "checkbox") g[f] = el.checked;
        else if (el.type === "number") { if (el.value === "") delete g[f]; else g[f] = Number(el.value); }
        else g[f] = el.value;
        if (f === "amt" && el.checked && g.soll == null) g.soll = Math.round(gTotal(g));
        protokoll(`Gefäss «${g.name}» angepasst`); break;
      }
      case "teil-dazu": { if (!el.value) return; const g = S.gefaesse.find((x) => x.id === el.dataset.g); g.teilnehmende.push(el.value); protokoll(`${pname(el.value)} zu «${g.name}» hinzugefügt`); break; }
      case "teil-weg": { const g = S.gefaesse.find((x) => x.id === el.dataset.g); g.teilnehmende = g.teilnehmende.filter((x) => x !== el.dataset.p); protokoll(`${pname(el.dataset.p)} aus «${g.name}» entfernt`); break; }
      case "g-neu":
        dialog("Neues Gefäss", `<div class="formzeile"><label class="feld">Name<input type="text" id="gn-name" value="Arbeitsgruppe"></label><label class="feld">Bereich<select id="gn-bereich"><option>Schule</option><option>Zusammenarbeit</option><option>Weiterbildung</option></select></label><label class="feld">Stunden je Person<input type="number" id="gn-h" value="20"></label><label class="feld"><span><input type="checkbox" id="gn-pool"> zusätzlich, aus Gestaltungspool</span></label></div>`,
          [{ text: "Anlegen", primaer: true, los: (d) => { const name = d.querySelector("#gn-name").value.trim(); if (!name) return false; S.gefaesse.push({ id: "g" + Date.now(), name, bereich: d.querySelector("#gn-bereich").value, art: d.querySelector("#gn-pool").checked ? "zusatz" : "pauschal", regel: "fix", stunden: Number(d.querySelector("#gn-h").value), ressource: d.querySelector("#gn-pool").checked ? "pool" : "", teilnehmende: [] }); protokoll(`Gefäss «${name}» angelegt`); fertig(); } }]);
        return;
      case "budget": { const r = S.ressourcen.find((x) => x.id === el.dataset.r); r.budget = Number(el.value); protokoll(`Budget «${r.name}»: ${r.budget}`); break; }
      case "sperre": S.budgetGesperrt = !S.budgetGesperrt; protokoll(S.budgetGesperrt ? "Budget für die Schulleitung gesperrt" : "Budget entsperrt"); break;
      case "sicht": { location.hash = "#/ressourcen?sicht=" + el.dataset.sicht; return; }
      case "freigeben": freigeben(id); ansage(`${pname(id)} freigegeben.`); break;
      case "sammel": {
        const ids = [...document.querySelectorAll("[data-sammel]:checked")].map((x) => x.dataset.sammel);
        if (!ids.length) { ansage("Bitte zuerst Personen auswählen."); return; }
        ids.forEach(freigeben); ansage(`${ids.length} Personen freigegeben.`); break;
      }
      case "zurueckziehen": { const f = S.freigaben[id]; delete f.stand; delete f.zeit; protokoll(`Freigabe ${pname(id)} zurückgezogen`); break; }
      case "angestellt": S.freigaben[id].angestellt = true; protokoll(`${pname(id)} als angestellt markiert`); break;
      case "erledigt": S.freigaben[id].erledigt = el.checked; protokoll(`${pname(id)} ${el.checked ? "als erledigt markiert" : "nicht mehr erledigt"}`); break;
      case "quittieren": S.freigaben[id].aenderungSV = false; protokoll(`Änderung ${pname(id)} quittiert`); break;
      case "bemerkung":
        dialog(`Bemerkung zu ${pname(id)}`, `<label class="feld">Interne Bemerkung der Schulverwaltung<textarea id="bem" rows="3">${esc(S.freigaben[id].bemerkung || "")}</textarea></label>`,
          [{ text: "Speichern", primaer: true, los: (d) => { S.freigaben[id].bemerkung = d.querySelector("#bem").value; protokoll(`Bemerkung zu ${pname(id)} erfasst`); fertig(); } }]);
        return;
      case "vergleich": {
        const alt = S.freigaben[id].stand; const neu = stand(id);
        const weg = alt.posten.filter((x) => !neu.posten.includes(x)); const dazu = neu.posten.filter((x) => !alt.posten.includes(x));
        dialog(`Vergleich mit letzter Freigabe – ${pname(id)}`, `<table><thead><tr><th></th><th class="zahl">freigegeben</th><th class="zahl">jetzt</th></tr></thead><tbody>
          <tr><td>Wochenlektionen</td><td class="zahl">${alt.wl}</td><td class="zahl">${neu.wl}</td></tr><tr><td>Jahresstunden</td><td class="zahl">${zahl(alt.stunden)}</td><td class="zahl">${zahl(neu.stunden)}</td></tr>
          <tr><td>Pensum</td><td class="zahl">${zahl(alt.pensum, 1)} %</td><td class="zahl">${zahl(neu.pensum, 1)} %</td></tr></tbody></table>
          <h3 style="margin-top:1rem">Änderungen</h3>${weg.length || dazu.length ? `<ul>${weg.map((x) => `<li class="diff-alt">− ${esc(x)}</li>`).join("")}${dazu.map((x) => `<li class="diff-neu">+ ${esc(x)}</li>`).join("")}</ul>` : '<p class="muted">Keine Änderungen.</p>'}`);
        return;
      }
      case "drucken": window.print(); return;
      case "umfrage-zeigen": dialog(`Pensenumfrage – ${pname(id)}`, umfrageDetail(S.umfrage[id])); return;
      case "erinnern": S.erinnert[id] = true; protokoll(`Erinnerung Pensenumfrage an ${pname(id)}`); ansage(`Erinnerung an ${pname(id)} vorgemerkt.`); break;
      case "erinnern-alle": { const ids = Object.keys(S.umfrage).filter((k) => S.umfrage[k].status !== "eingereicht"); ids.forEach((k) => (S.erinnert[k] = true)); protokoll(`Erinnerung an ${ids.length} Personen`); ansage(`${ids.length} Erinnerungen vorgemerkt.`); break; }
      case "einladen": { const ids = planbar().filter((p) => !S.umfrage[p.id]).map((p) => p.id); ids.forEach((k) => (S.umfrage[k] = { status: "eingeladen" })); protokoll(`${ids.length} Personen zur Pensenumfrage eingeladen`); break; }
      case "vertretung": { const x = S.ausfaelle.find((y) => y.id === id); x.vertretung = el.value; protokoll(`Stellvertretung für ${pname(x.person)}: ${pname(el.value)}`); break; }
      case "sv-weiter": { const x = S.ausfaelle.find((y) => y.id === id); x.status = SV_SCHRITTE[SV_SCHRITTE.indexOf(x.status) + 1]; protokoll(`Stellvertretung ${pname(x.person)}: ${x.status}`); break; }
      case "rapport":
        dialog("Rapport erfassen", `<div class="formzeile"><label class="feld">Datum<input type="date" id="rp-d" value="${S.ausfaelle.find((y) => y.id === id).von}"></label><label class="feld">Lektionen<input type="number" id="rp-l" value="4" min="1"></label></div>`,
          [{ text: "Erfassen", primaer: true, los: (d) => { const x = S.ausfaelle.find((y) => y.id === id); x.rapport.push({ datum: d.querySelector("#rp-d").value, lektionen: Number(d.querySelector("#rp-l").value) }); protokoll(`Rapport für Stellvertretung ${pname(x.person)}`); fertig(); } }]);
        return;
      case "ausfall-neu":
        dialog("Ausfall erfassen", `<div class="formzeile"><label class="feld">Person<select id="af-p">${lehrpersonen().map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label><label class="feld">Grund (Kategorie)<select id="af-g"><option>Krankheit</option><option>Unfall</option><option>Weiterbildung</option><option>Urlaub</option><option>Mutterschaft/Vaterschaft</option><option>anderes</option></select></label><label class="feld">Quelle<select id="af-q"><option>Kurzvikariat (ausserhalb Berufsauftrag)</option><option>Gestaltungspool</option></select></label><label class="feld">Von<input type="date" id="af-v" value="2027-11-15"></label><label class="feld">Bis<input type="date" id="af-b" value="2027-11-19"></label></div>`,
          [{ text: "Erfassen", primaer: true, los: (d) => { const pid = d.querySelector("#af-p").value; S.ausfaelle.unshift({ id: "a" + Date.now(), person: pid, grund: d.querySelector("#af-g").value, von: d.querySelector("#af-v").value, bis: d.querySelector("#af-b").value, wl: wlVon(pid), vertretung: "", quelle: d.querySelector("#af-q").value, status: "erfasst", rapport: [] }); protokoll(`Ausfall ${pname(pid)} erfasst`); fertig(); } }]);
        return;
      case "termin-neu":
        dialog("Termin planen", `<div class="formzeile"><label class="feld">Person<select id="tm-p">${planbar().map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label><label class="feld">Art<select id="tm-a"><option>Mitarbeitendenbeurteilung</option><option>Probezeitgespräch</option><option>Unterrichtsbesuch</option></select></label><label class="feld">Datum<input type="date" id="tm-d" value="2027-12-07"></label></div>`,
          [{ text: "Planen", primaer: true, los: (d) => { S.gespraeche.push({ id: "m" + Date.now(), person: d.querySelector("#tm-p").value, art: d.querySelector("#tm-a").value, datum: d.querySelector("#tm-d").value, status: "geplant", freigegeben: false }); protokoll("Gesprächstermin geplant"); fertig(); } }]);
        return;
      case "formular": { const g = S.gespraeche.find((x) => x.id === id); const p = person(g.person); g.status = "Formular vorbereitet";
        dialog(`${g.art} – Formular (Entwurf)`, `<p class="small muted">Vorausgefüllt aus vorhandenen Daten (ST-I2). Unterschrift später über EduKSX-Sign.</p><table><tbody><tr><th scope="row">Person</th><td>${esc(p.name)}</td></tr><tr><th scope="row">Anstellung</th><td>${esc(p.art)}, ${zahl(rechnung(p.id).pensum, 1)} %</td></tr><tr><th scope="row">Fächer</th><td>${esc(p.faecher.join(", ") || "–")}</td></tr><tr><th scope="row">Termin</th><td>${datum(g.datum)}</td></tr><tr><th scope="row">Schule</th><td>${esc(S.schulen[0].name)}</td></tr></tbody></table>`);
        protokoll(`Formular ${g.art} ${p.name} vorbereitet`); speichern(); return; }
      case "g-freigeben": { const g = S.gespraeche.find((x) => x.id === id); g.freigegeben = true; protokoll(`Unterlagen ${g.art} ${pname(g.person)} an Verwaltung freigegeben`); break; }
      case "kinder": { S.angebote.find((x) => x.id === id).kinder = Number(el.value); break; }
      case "b-freigeben": S.betreuungFreigabe = true; protokoll("Pensen Tagesstrukturen zur Anstellung freigegeben"); ansage("Pensen der Tagesstrukturen freigegeben."); break;
      case "vze-datei": if (el.files && el.files[0]) vzeLaden(el.files[0]); return;
      case "vze-muster": vzeMusterLaden(); return;
      case "vze-se": VZE.se = Number(el.value); VZE.fehler = null; zeichnen(); return;
      case "vze-leeren": if (VZE) VZE.leeren = el.checked; else VZE = { leeren: el.checked }; return;
      case "vze-ausfuellen": vzeAusfuellen().catch((x) => { VZE.fehler = [x.message]; zeichnen(); }); return;
      case "param": S.parameter[el.dataset.k] = Number(el.value); protokoll(`Parameter ${el.dataset.k}: ${el.value}`); break;
      case "stelle": S.stellen[el.dataset.k] = Number(el.value); protokoll(`Stellenberechnung ${el.dataset.k}: ${el.value}`); break;
      case "schueler": { const k = S.klassen.find((x) => x.id === el.dataset.klasse); k.schueler = Number(el.value); protokoll(`Schülerzahl ${k.id}: ${k.schueler}`); break; }
      case "mutation-melden": { const m = S.mutationen.find((x) => x.id === id); m.status = "an VSA gemeldet"; protokoll(`Mutation «${m.was}» an das Volksschulamt gemeldet`); break; }
      case "mutation-neu":
        dialog("Mutation erfassen", `<div class="formzeile"><label class="feld">Was<select id="mu-w"><option>IF</option><option>Teamteaching</option><option>Halbklassenunterricht</option><option>Klassenlektionen</option><option>Vikariat</option></select></label><label class="feld">Warum<input type="text" id="mu-g" value="Zuzug von Schüler/innen"></label><label class="feld">Lektionen<input type="number" id="mu-l" value="2" min="1"></label><label class="feld">Quelle<select id="mu-q"><option>Gestaltungspool</option><option>Stellenpool</option></select></label><label class="feld">Person<select id="mu-p">${planbar().concat(S.personen.filter((x) => x.pool)).map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></label><label class="feld">Start (Montag)<input type="date" id="mu-s" value="2027-09-06"></label></div>`,
          [{ text: "Erfassen", primaer: true, los: (d) => { S.mutationen.push({ id: "u" + Date.now(), was: d.querySelector("#mu-w").value, warum: d.querySelector("#mu-g").value, lektionen: Number(d.querySelector("#mu-l").value), quelle: d.querySelector("#mu-q").value, person: d.querySelector("#mu-p").value, start: d.querySelector("#mu-s").value, status: "erfasst" }); protokoll("Mutation erfasst"); fertig(); } }]);
        return;
      case "export-stellenplan": { const x = stellenRechnung(); csv("zusammenstellung-vze.csv", [["Position", "Wert"], ["Schülerzahl", S.stellen.schuelerzahl], ["Sozialindex", S.stellen.sozialindex], ["VZE Berufsauftrag", x.vze.toFixed(3)], ["VZE Schulleitung", x.sl.toFixed(3)], ["VZE Gestaltungspool", x.pool.toFixed(3)], ["VZE Koordination Sek (kommunal)", x.koordination.toFixed(3)], ["DaZ WL", x.dazWL.toFixed(1)]].concat(S.klassen.map((k) => [`Klasse ${k.id} (${k.schueler} SuS)`, tafel(k).vze]))); return; }
      case "praesenz": { const g = S.gefaesse.find((x) => x.id === el.dataset.g); csv(`praesenzliste-${g.id}.csv`, [["Gefäss", "Person", "Stunden", "Unterschrift"]].concat(g.teilnehmende.map((pid) => [g.name, pname(pid), Math.round(gefaessStunden(g, pid)), ""]))); return; }
      case "export-ba": csv("berufsauftrag.csv", [["Gefäss", "Bereich", "Regel", "Person", "Stunden"]].concat(S.gefaesse.flatMap((g) => g.teilnehmende.map((pid) => [g.name, g.bereich, g.regel, pname(pid), Math.round(gefaessStunden(g, pid))])))); return;
      case "export-personen": csv("personalliste.csv", [["Kürzel", "Person", "Anstellung", "WL", "BG vereinbart %", "BG berechnet %", "Differenz h", "Weitere Anstellungen %", "Total %", "Vorjahr %", "Status", "Bemerkung Pensenübersicht"]].concat(S.personen.filter((p) => !p.pool).map((p) => { const r = rechnung(p.id); return [p.kuerzel || "", p.name, p.art, r.wl.toFixed(2), p.bgSoll != null ? p.bgSoll : "", (r.festProzent ? 0 : r.pensum).toFixed(1), r.soll ? r.soll.diffH.toFixed(1) : "", r.weitereProzent.toFixed(1), r.total.toFixed(1), p.pensumVorjahr != null ? p.pensumVorjahr : "", status(p.id).text, p.bemerkungPensen || ""]; }))); return;
      case "export-ress": { const v = verbrauch("sl"); csv("ressourcen.csv", [["Ressource", "Einheit", "Budget", "Bedarf", "Verplant", "Saldo"]].concat(S.ressourcen.map((r) => [r.name, r.einheit, budget(r).toFixed(1), v[r.id].bedarf.toFixed(1), v[r.id].verplant.toFixed(1), (budget(r) - v[r.id].verplant).toFixed(1)]))); return; }
      default: return;
    }
    fertig();
  }
  function fertig() { speichern(); zeichnen(true); }

  // ---------------------------------------------------------------- Routing
  function aktuelleSeite() { return (location.hash.replace(/^#\//, "").split("?")[0].split("/")[0]) || "uebersicht"; }
  function zeichnen(behalteFokus) {
    const [pfad, query] = location.hash.replace(/^#\//, "").split("?");
    const [seite, param, param2] = (pfad || "uebersicht").split("/");
    const ziel = seiten[seite] && erlaubt(seite) ? seite : "uebersicht";
    const fokusId = behalteFokus && document.activeElement ? selektor(document.activeElement) : null;
    const scroll = window.scrollY;
    document.getElementById("app").innerHTML = rahmen(ziel, seiten[ziel](new URLSearchParams(query || ""), param, param2));
    const titel = document.querySelector("main h1");
    document.title = (titel ? titel.textContent + " – " : "") + "EduKSX-Staffing (Prototyp)";
    if (fokusId) { const el = document.querySelector(fokusId); if (el) el.focus(); window.scrollTo(0, scroll); }
    glossarErklaeren();
    if (ziel === "hilfe" && param && param2) {
      const anker = document.getElementById(pAnker(param, param2));
      if (anker) { anker.classList.add("markiert"); setTimeout(() => { anker.scrollIntoView({ block: "start" }); anker.focus({ preventScroll: true }); }, 0); }
    }
  }
  function selektor(el) {
    if (el.id) return "#" + CSS.escape(el.id);
    const ds = el.dataset || {};
    const teile = ["aktion", "id", "g", "p", "r", "k", "feld", "klasse", "sicht", "i", "gruppe"].filter((k) => ds[k]).map((k) => `[data-${k}="${CSS.escape(ds[k])}"]`);
    return teile.length ? el.tagName.toLowerCase() + teile.join("") : null;
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("button[data-aktion]");
    if (el && !el.disabled) aktion(el, e);
  });
  document.addEventListener("input", (e) => {
    const el = e.target.closest('input[data-aktion="hilfe-suche"]');
    if (!el) return;
    const w = el.value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll("article.paragraf").forEach((a) => { const t = !w || a.dataset.suchtext.includes(w); a.hidden = !t; if (t && w) n++; });
    document.querySelectorAll("section.gesetz-abschnitt").forEach((sct) => { sct.hidden = !!w && !sct.querySelector("article.paragraf:not([hidden])"); });
    const t = document.getElementById("hilfe-treffer"); if (t) t.textContent = w ? `${n} Paragraphen` : "";
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches('input[data-aktion="hilfe-suche"]')) return;
    const el = e.target.closest("select[data-aktion], input[data-aktion], textarea[data-aktion]");
    if (el) aktion(el, e);
  });
  window.addEventListener("hashchange", () => { window.scrollTo(0, 0); zeichnen(); const m = document.getElementById("inhalt"); if (m && !/^#\/hilfe\/[^/]+\/./.test(location.hash)) m.focus({ preventScroll: true }); });

  try {
    const t = localStorage.getItem("eduksx-thema");
    const dunkel = t ? t === "dark" : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dunkel);
  } catch (e) { /* hell */ }
  glossarLaden();
  zeichnen();

  // für Tests und Konsole
  window.STAFFING = { rechnung, stand, status, verbrauch, tagesstrukturRechnung, zustand: () => S };
})();
