/*
 * EduKSX-Staffing – Klickprototyp (ohne Abhängigkeiten, ohne Server).
 * Zustand im Speicher, auf Wunsch im Browser gespeichert (localStorage). Alle Daten sind erfunden.
 */
(function () {
  "use strict";

  const SPEICHER = "eduksx-staffing-prototyp-v4";
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
    s.betreuungPensen = {};    // pid -> Prozent (Tagesstrukturen)
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


  // ---------------------------------------------------------------- Gesetzliche Grundlagen (LPG, LPVO)
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
    return `<a class="gesetz" href="#/hilfe/${kurz}/${String(nr).replace(/\s+/g, "")}" title="${esc(titel)}">${kurz} § ${esc(nr)}${zusatz ? " " + esc(zusatz) : ""}</a>`;
  }
  const RR = (...liste) => liste.map((x) => R(...x)).join(", ");

  function wordmark(zusatz) {
    const name = "EduKSX" + (zusatz ? "-" + zusatz : "");
    return `<span class="wm" role="img" aria-label="${esc(name)}"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span><span class="o">K</span><span class="b">SX</span>${zusatz ? `<span class="n">-${esc(zusatz)}</span>` : ""}</span></span>`;
  }
  const WM_DEV = `<span class="wm" role="img" aria-label="MarKusSXCH"><span aria-hidden="true"><span class="v">M</span><span class="n">ar</span><span class="o">K</span><span class="n">us</span><span class="b">SXCH</span></span></span>`;

  // Icon EduKSX-Staffing (freigegebenes Icon-Set, Farben über Markenwerte)
  const ICON_STAFFING = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="7.8" r="3" stroke="var(--brand-orange)"/><path d="M3 19.5c.6-3.4 2.8-5.4 5.5-5.4 1.4 0 2.6.5 3.6 1.5" stroke="var(--brand-orange)"/><rect x="13" y="12.5" width="8" height="8" rx="1.6" stroke="var(--brand-neutral)"/><path d="M13 15.5h8" stroke="var(--brand-neutral)"/></g><circle cx="17" cy="18" r="1" fill="var(--brand-blue)"/></svg>`;
  const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    uebersicht: ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
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
  function alter(p) { return P().stichjahr - p.jahrgang; }
  function njaz(p) { return P().nettoJahresarbeitszeit.find((x) => alter(p) <= x.bisAlter); }
  const pauschale = () => P().pauschaleSchule + P().pauschaleZusammenarbeit + P().pauschaleWeiterbildung;
  const PAUSCHALE = () => ({ Schule: P().pauschaleSchule, Zusammenarbeit: P().pauschaleZusammenarbeit, Weiterbildung: P().pauschaleWeiterbildung });
  const faktor = (p) => P().faktorLektion + (p.berufseinfuehrung ? 1.5 : 0);
  const tafel = (k) => S.lektionentafeln[k.tafel];
  function wlVon(pid, ressource) {
    return S.lektionen.filter((l) => l.person === pid && (!ressource || l.ressource === ressource)).reduce((a, l) => a + Number(l.wl), 0);
  }
  function klpAnteile(pid) {
    return S.klassen.filter((k) => k.klp.includes(pid)).map((k) => ({ klasse: k.id, anteil: 1 / k.klp.length, wlInKlasse: S.lektionen.filter((l) => l.klasse === k.id && l.person === pid).reduce((a, l) => a + Number(l.wl), 0) }));
  }
  function gefaessStunden(g, pid) {
    if (!g.teilnehmende.includes(pid)) return 0;
    if (g.regel === "fix") return Number(g.stunden);
    const roh = (Number(g.stunden) * wlVon(pid)) / P().lektionenJeVZE;
    return Math.min(Number(g.max || g.stunden), Math.max(Number(g.sockel || 0), roh));
  }
  function rechnung(pid) {
    const p = person(pid);
    if (p.prozent != null && !p.faecher.length) {
      return { wl: 0, unterrichtH: 0, klpH: 0, klassen: [], gefaesse: [], zusatzH: 0, njaz: njaz(p).stunden, pensum: p.prozent, festProzent: true, warnungen: [], bereiche: {} };
    }
    const n = njaz(p).stunden;
    const wl = wlVon(pid);
    const unterrichtH = wl * faktor(p);
    const klassen = klpAnteile(pid);
    const klpH = klassen.reduce((a, k) => a + k.anteil * P().klassenlehrperson, 0);
    const gefaesse = S.gefaesse.map((g) => ({ g, h: gefaessStunden(g, pid) })).filter((x) => x.h > 0);
    const zusatzH = gefaesse.filter((x) => x.g.art === "zusatz").reduce((a, x) => a + x.h, 0);
    // Beschäftigungsgrad BG: BG × Netto-Jahresarbeitszeit = Unterricht + Klassenlehrperson + Zusatz + BG × Pauschalen
    const bg = (unterrichtH + klpH + zusatzH) / (n - pauschale());
    const netto = bg * n;
    const bereiche = {};
    for (const [b, h] of Object.entries(PAUSCHALE())) {
      bereiche[b] = { soll: h * bg, verplant: gefaesse.filter((x) => x.g.art === "pauschal" && x.g.bereich === b).reduce((a, x) => a + x.h, 0) };
    }
    const anteilU = netto ? (unterrichtH / netto) * 100 : 0;
    const warnungen = [];
    const pz = bg * 100;
    if (pz < P().mindestpensum - 0.05) warnungen.push({ text: `Beschäftigungsgrad unter ${P().mindestpensum} % (Mindestpensum in der Regel)`, recht: ["LPG", "6", "Abs. 1"] });
    if (pz > P().maxPensum + 0.05) warnungen.push({ text: `Beschäftigungsgrad über ${P().maxPensum} %`, recht: ["LPVO", "9"] });
    if (netto && anteilU < P().anteilUnterrichtMin) warnungen.push({ text: `60-%-Regel verletzt: nur ${zahl(anteilU)} % der Netto-Arbeitszeit im Unterricht`, recht: ["LPG", "6", "Abs. 2"] });
    for (const k of klassen) if (k.wlInKlasse < P().klpMindestlektionen) warnungen.push({ text: `Klassenlehrperson ${k.klasse}: nur ${k.wlInKlasse} WL in der Klasse (mindestens ${P().klpMindestlektionen})`, recht: ["LPVO", "10 f"] });
    for (const [b, x] of Object.entries(bereiche)) if (x.verplant > x.soll + 0.5) warnungen.push({ text: `Bereich ${b}: ${zahl(x.verplant)} h verplant, Pauschale nur ${zahl(x.soll)} h`, recht: ["LPVO", { Schule: "10 a", Zusammenarbeit: "10 b", Weiterbildung: "10 c" }[b]] });
    for (const x of gefaesse) if (x.g.kustodie && x.h > P().kustodieMaxStunden) warnungen.push({ text: `${x.g.name}: über ${P().kustodieMaxStunden} h – Entscheid der Schulpflege nötig`, recht: ["LPVO", "2 f"] });
    return { wl, faktor: faktor(p), unterrichtH, klpH, klassen, gefaesse, zusatzH, njaz: n, netto, bereiche, anteilU, pensum: pz, warnungen };
  }
  function personRessourcen(pid) {
    const p = person(pid);
    const r = { ba: wlVon(pid, "ba"), pool: 0, kommunal: wlVon(pid, "kommunal"), daz: wlVon(pid, "daz"), assistenz: 0 };
    for (const g of S.gefaesse) if (g.ressource === "pool") r.pool += gefaessStunden(g, pid) / P().faktorLektion;
    if (p.art === "Klassenassistenz") r.assistenz = p.prozent || 0;
    return r;
  }
  function stand(pid) {
    const r = rechnung(pid);
    return {
      wl: r.wl,
      stunden: Math.round(r.unterrichtH + r.klpH + r.zusatzH),
      pensum: Math.round(r.pensum * 10) / 10,
      ressourcen: personRessourcen(pid),
      posten: S.lektionen.filter((l) => l.person === pid).map((l) => `${l.klasse} ${l.fach}${l.halbklasse ? " (Halbklasse " + l.halbklasse + ")" : ""} (${l.wl} WL)`)
        .concat(r.klassen.map((k) => `Klassenlehrperson ${k.klasse}${k.anteil < 1 ? " (geteilt)" : ""}`))
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
    return { ba: s.wlBA, pool: s.wlPool, daz: s.dazWL }[r.id] || 0;
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
    for (const l of S.lektionen) if (res[l.ressource]) res[l.ressource].bedarf += Number(l.wl);
    for (const p of planbar()) {
      const quelle = sicht === "sv" ? (S.freigaben[p.id] && S.freigaben[p.id].stand && S.freigaben[p.id].stand.ressourcen) : personRessourcen(p.id);
      if (!quelle) continue;
      for (const [rid, wert] of Object.entries(quelle)) {
        if (!res[rid] || !wert) continue;
        res[rid].verplant += wert;
        res[rid].posten.push({ pid: p.id, wert });
      }
    }
    for (const g of S.gefaesse) if (g.ressource === "pool") res.pool.bedarf += g.teilnehmende.reduce((a, pid) => a + gefaessStunden(g, pid), 0) / P().faktorLektion;
    res.assistenz.bedarf = res.assistenz.verplant;
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
    const team = S.personen.filter((x) => x.tagesstruktur);
    const ist = team.reduce((x, t) => x + Number(S.betreuungPensen[t.id] != null ? S.betreuungPensen[t.id] : t.prozent), 0);
    return { zeilen, sollH, sollProzent, ist, team };
  }

  // ---------------------------------------------------------------- Rahmen
  const NAVI = [
    ["uebersicht", "Übersicht", "alle"],
    ["gruppe", "Planung"],
    ["stellenplan", "Stellenplan und VZE", "sl sv"],
    ["vzetool", "VZE-Tool (VSA)", "sl sv"],
    ["unterricht", "Unterricht", "sl sv"],
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
    if (!e) return seite === "person";
    return e[2] === "alle" || e[2].split(" ").includes(rolleKurz());
  }

  function rahmen(seite, inhalt) {
    const navi = NAVI.map((n) => {
      if (n[0] === "gruppe") return `<li class="gruppe" aria-hidden="true">${esc(n[1])}</li>`;
      if (!erlaubt(n[0])) return "";
      const aktiv = seite === n[0] || (seite === "person" && n[0] === "personen");
      return `<li><a href="#/${n[0]}" ${aktiv ? 'aria-current="page"' : ""}>${ICONS[n[0]]}<span>${esc(n[1])}</span></a></li>`;
    }).join("");
    const schulen = S.schulen.map((s) => `<option value="${s.id}" ${s.id === S.schule ? "selected" : ""}>${esc(s.name)}</option>`).join("");
    const jahre = S.schuljahre.map((j) => `<option ${j === S.schuljahr ? "selected" : ""}>${esc(j)}</option>`).join("");
    const rollen = Object.entries(ROLLEN).map(([k, v]) => `<option value="${k}" ${k === S.rolle ? "selected" : ""}>${esc(v)}</option>`).join("");
    const dunkel = document.documentElement.classList.contains("dark");
    return `
      <header class="kopf">
        <a class="marke" href="#/uebersicht">${ICON_STAFFING}${wordmark("Staffing")}</a>
        <span class="muted small">Einsatzplanung</span>
        <div class="werkzeuge">
          <label class="sr-only" for="w-schule">Schule</label><select id="w-schule" data-aktion="schule">${schulen}</select>
          <label class="sr-only" for="w-jahr">Schuljahr</label><select id="w-jahr" data-aktion="schuljahr">${jahre}</select>
          <label class="sr-only" for="w-rolle">Rolle</label><select id="w-rolle" data-aktion="rolle" title="Rolle im Prototyp wechseln">${rollen}</select>
          <button class="btn" data-aktion="thema" aria-pressed="${dunkel}" title="Hell/Dunkel">${dunkel ? "☀ Hell" : "☾ Dunkel"}</button>
          <button class="btn" data-aktion="zuruecksetzen" title="Testdaten neu laden">↺ Testdaten</button>
        </div>
      </header>
      <div class="hinweis-band" role="note"><strong>Prototyp</strong> – Personen, Schule und Schülerzahlen sind erfunden. Parameter nach den öffentlichen Vorgaben des Kantons Zürich (Weisung VZE 2026/27, Berufsauftrag), ohne Gewähr.</div>
      <div class="rahmen">
        <nav class="navi" aria-label="Hauptnavigation"><ul>${navi}</ul></nav>
        <main id="inhalt" tabindex="-1">${inhalt}</main>
      </div>
      <footer class="fuss"><span>${wordmark("Staffing")} · Prototyp 0.1.0 · in Entwicklung · <a href="../">Alle Prototypen</a></span><span>Developed by ${WM_DEV}</span></footer>
      <div class="sr-only" aria-live="polite" id="ansage"></div>`;
  }

  // ---------------------------------------------------------------- Seiten
  const seiten = {};

  seiten.uebersicht = function () {
    const lp = planbar();
    const offen = S.lektionen.filter((l) => !l.person);
    const offenWL = offen.reduce((a, l) => a + Number(l.wl), 0);
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
    if (offen.length) schritte.push(`<li>${offen.length} Lektionengefässe (${offenWL} WL) sind noch offen – <a href="#/unterricht?offen=1">zuweisen</a></li>`);
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

  seiten.unterricht = function (q) {
    const klasse = q.get("klasse") || "";
    const nurOffen = q.get("offen") === "1";
    const lp = planbar().filter((p) => p.art !== "Klassenassistenz");
    const liste = S.lektionen.filter((l) => (!klasse || l.klasse === klasse) && (!nurOffen || !l.person));
    const rn = RESS_NAME();
    const opts = (sel, fach) => `<option value="">– offen –</option>` + lp.map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}${p.faecher.includes(fach) ? "" : " (ohne Fachangabe)"}</option>`).join("");
    const klassenTab = S.klassen.map((k) => {
      const ls = S.lektionen.filter((l) => l.klasse === k.id);
      const offen = ls.filter((l) => !l.person).reduce((a, l) => a + Number(l.wl), 0);
      const total = ls.reduce((a, l) => a + Number(l.wl), 0);
      const klpSel = istSL() ? `<select data-aktion="klp" data-klasse="${k.id}" aria-label="Klassenlehrperson ${k.id}"><option value="">–</option>${lehrpersonen().map((p) => `<option value="${p.id}" ${k.klp[0] === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>${k.klp.length > 1 ? ` <span class="small muted">+ ${k.klp.slice(1).map(pname).join(", ")} (geteilt)</span>` : ""}` : esc(k.klp.map(pname).join(", "));
      return `<tr><td><a href="#/unterricht?klasse=${k.id}">${esc(k.id)}</a></td><td>${esc(tafel(k).name)}</td><td>${(() => { const g = klassengroesse(k); return `<span class="badge ${g.cls}"><span aria-hidden="true">${g.sym}</span>${esc(g.text)}</span>`; })()}</td><td>${klpSel}</td><td class="zahl">${total}</td><td class="zahl">${offen ? `<span class="badge warnung"><span aria-hidden="true">△</span>${offen} offen</span>` : '<span class="badge erfolg"><span aria-hidden="true">✓</span>vollständig</span>'}</td></tr>`;
    }).join("");
    const zeilen = liste.map((l) => `<tr>
        <td>${esc(l.klasse)}</td><td>${esc(S.faecher[l.fach] || l.fach)}${l.halbklasse ? ` <span class="small muted">Halbklasse ${l.halbklasse}</span>` : ""}</td><td><span class="badge ${l.ressource === "ba" && !l.zusatz ? "neutral" : "violett"}">${esc(rn[l.ressource])}</span></td>
        <td class="zahl">${l.wl}</td>
        <td>${istSL() ? `<select data-aktion="lektion" data-id="${l.id}" aria-label="Lehrperson für ${esc(l.klasse)} ${esc(l.fach)}">${opts(l.person, l.fach)}</select>` : (l.person ? esc(pname(l.person)) : '<span class="badge warnung"><span aria-hidden="true">△</span>offen</span>')}</td></tr>`).join("");
    const kOpts = `<option value="">alle Klassen</option>` + S.klassen.map((k) => `<option ${k.id === klasse ? "selected" : ""}>${k.id}</option>`).join("");
    return `
      <div class="seitenkopf"><div><h1>Unterricht</h1><p class="muted">Lektionen der Klassen und weitere Unterrichtsressourcen Personen zuweisen. Es geht um Mengen und Personen, nicht um den Stundenplan.</p></div></div>
      ${istSV() ? '<div class="meldung info">Die Schulverwaltung sieht den Planungsstand nur lesend.</div>' : ""}
      <h2>Klassen</h2>
      <div class="tabelle-wrap"><table><thead><tr><th>Klasse</th><th>Lektionentafel</th><th>Schüler/innen</th><th>Klassenlehrperson</th><th class="zahl">WL total</th><th class="zahl">Stand</th></tr></thead><tbody>${klassenTab}</tbody></table></div>
      <h2 style="margin-top:1.25rem">Lektionenpool</h2>
      <div class="formzeile">
        <label class="feld">Klasse<select data-aktion="filter-klasse">${kOpts}</select></label>
        <label class="feld"><span><input type="checkbox" data-aktion="filter-offen" ${nurOffen ? "checked" : ""}> nur offene Lektionen</span></label>
        <span class="muted small">${liste.length} Gefässe · ${liste.reduce((a, l) => a + Number(l.wl), 0)} WL</span>
      </div>
      <div class="tabelle-wrap"><table><thead><tr><th>Klasse</th><th>Fach</th><th>Ressource</th><th class="zahl">WL</th><th>Lehrperson</th></tr></thead><tbody>${zeilen || '<tr><td colspan="5" class="muted">Keine Lektionen für diesen Filter.</td></tr>'}</tbody></table></div>`;
  };

  seiten.personen = function () {
    const zeilen = planbar().map((p) => {
      const r = rechnung(p.id);
      const u = S.umfrage[p.id];
      const wunsch = u && u.status === "eingereicht" ? `${u.wunschProzent} %` : "–";
      const w = Math.min(100, r.pensum);
      return `<tr><td><a href="#/person/${p.id}">${esc(p.name)}</a></td><td>${esc(p.art)}</td><td class="zahl">${r.festProzent ? "–" : r.wl}</td><td class="zahl">${r.festProzent ? "–" : zahl(r.netto)}</td>
        <td class="zahl">${zahl(r.pensum, 1)} %${r.warnungen.length ? ` <span class="badge warnung" title="${esc(r.warnungen.map((w) => w.text).join(" · "))}"><span aria-hidden="true">△</span>${r.warnungen.length}</span>` : ""}</td><td><div class="balken ${r.pensum > 100 ? "ueber" : r.pensum > 95 ? "voll" : ""}" role="img" aria-label="Pensum ${zahl(r.pensum, 1)} Prozent"><span style="width:${w}%"></span></div></td>
        <td class="zahl">${wunsch}</td><td>${badge(status(p.id))}</td></tr>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Personen und Pensen</h1><p class="muted">Beschäftigungsgrad nach Berufsauftrag Kanton Zürich: Unterricht (58 h je WL) + Klassenlehrperson (100 h je Klasse) + zusätzliche Aufgaben + anteilige Pauschalen Schule, Zusammenarbeit und Weiterbildung = Beschäftigungsgrad × Netto-Jahresarbeitszeit (nach Alter). Grundlage: ${RR(["LPG", "6"], ["LPG", "18"], ["LPVO", "7"], ["LPVO", "9"], ["LPVO", "10"], ["LPVO", "10 f"])}.</p></div>
      <div class="aktionen"><button class="btn" data-aktion="export-personen">⇩ Personalliste (CSV)</button></div></div>
      <div class="tabelle-wrap"><table><thead><tr><th>Person</th><th>Anstellung</th><th class="zahl">WL</th><th class="zahl">Netto-Arbeitszeit h</th><th class="zahl">Beschäftigungsgrad</th><th>Auslastung</th><th class="zahl">Wunsch</th><th>Status</th></tr></thead><tbody>${zeilen}</tbody></table></div>`;
  };

  seiten.person = function (q, id) {
    const p = person(id);
    if (!p) return "<p>Person nicht gefunden.</p>";
    const r = rechnung(id);
    const u = S.umfrage[id];
    const f = S.freigaben[id];
    const ls = S.lektionen.filter((l) => l.person === id);
    const rn = RESS_NAME();
    const lZeilen = ls.map((l) => `<tr><td>${esc(l.klasse)}</td><td>${esc(S.faecher[l.fach])}${l.halbklasse ? " (Halbklasse " + l.halbklasse + ")" : ""}</td><td class="small">${esc(rn[l.ressource])}</td><td class="zahl">${l.wl}</td><td class="zahl">${zahl(l.wl * r.faktor)}</td></tr>`).join("");
    const gZeilen = r.gefaesse.map((x) => `<tr><td>${esc(x.g.name)}</td><td>${esc(x.g.bereich)}</td><td>${x.g.art === "zusatz" ? '<span class="badge violett">zusätzlich</span>' : '<span class="badge neutral">aus Pauschale</span>'}</td><td class="zahl">${zahl(x.h)}</td></tr>`).join("");
    const ab = (key) => (f && f.stand ? f.stand[key] : null);
    const n = njaz(p);
    const bereichZeilen = r.festProzent ? "" : Object.entries(r.bereiche).map(([b, x]) => `<tr><td>${R("LPVO", { Schule: "10 a", Zusammenarbeit: "10 b", Weiterbildung: "10 c" }[b])} · ${b}: Pauschale ${PAUSCHALE()[b]} h × ${zahl(r.pensum, 1)} %<div class="small muted">davon in Gefässen verplant ${zahl(x.verplant)} h, frei ${zahl(x.soll - x.verplant)} h</div></td><td class="zahl">${zahl(x.soll)} h</td></tr>`).join("");
    return `
      <p class="small"><a href="#/personen">← Personen</a></p>
      <div class="seitenkopf"><div><h1>${esc(p.name)}</h1><p class="muted">${esc(p.art)}${p.berufseinfuehrung ? " · Berufseinführung" : ""} · Jahrgang ${p.jahrgang} (Alter ${alter(p)}, Ferienanspruch ${n.ferientage} Tage) · Fächer ${esc(p.faecher.join(", ") || "–")}</p></div>
        <div class="aktionen">${badge(status(id))}
          ${istSL() ? `<button class="btn primaer" data-aktion="freigeben" data-id="${id}">Zur Anstellung freigeben</button>` : ""}
          <button class="btn" data-aktion="drucken">⎙ Pensenübersicht (PDF)</button></div></div>
      ${r.warnungen.length ? `<div class="meldung warnung" role="status"><strong>Prüfen:</strong><ul style="margin:.3rem 0 0">${r.warnungen.map((w) => `<li>${esc(w.text)} – ${R(...w.recht)}</li>`).join("")}</ul></div>` : ""}
      <div class="karten">
        <div class="karte"><div class="titel">Beschäftigungsgrad geplant</div><div class="zahl">${zahl(r.pensum, 1)} %</div>${ab("pensum") != null ? `<div class="small muted">freigegeben: ${zahl(ab("pensum"), 1)} %</div>` : ""}</div>
        <div class="karte"><div class="titel">Netto-Arbeitszeit</div><div class="zahl">${r.festProzent ? "–" : zahl(r.netto) + " h"}</div><div class="small muted">von ${zahl(r.njaz)} h bei 100 %</div></div>
        <div class="karte"><div class="titel">Wochenlektionen</div><div class="zahl">${r.wl}</div>${r.festProzent ? "" : `<div class="small muted">Anteil Unterricht ${zahl(r.anteilU)} % (mind. ${P().anteilUnterrichtMin} %)</div>`}</div>
        <div class="karte"><div class="titel">Wunsch Pensenumfrage</div><div class="zahl">${u && u.status === "eingereicht" ? u.wunschProzent + " %" : "–"}</div><div class="small muted">${u ? esc(u.status) : "nicht eingeladen"}</div></div>
      </div>
      ${r.festProzent ? `<div class="meldung info">Anstellung mit festem Pensum (${p.prozent} %) ausserhalb des kantonalen Berufsauftrags.</div>` : `
      <h2>Berufsauftrag nach Tätigkeitsbereichen</h2>
      <div class="tabelle-wrap"><table><tbody>
        <tr><td>${R("LPVO", "7", p.berufseinfuehrung ? "Abs. 1 und 4" : "Abs. 1")} · Unterricht: ${r.wl} WL × <span class="tip" title="Lektionenfaktor 58 h je Wochenlektion${p.berufseinfuehrung ? ", in der Berufseinführung +1.5 h" : ""}">${zahl(r.faktor, 1)} h</span></td><td class="zahl">${zahl(r.unterrichtH)} h</td></tr>
        <tr><td>${R("LPVO", "10 f")} · Klassenlehrperson ${esc(r.klassen.map((k) => k.klasse + (k.anteil < 1 ? " (geteilt)" : "")).join(", ") || "–")}</td><td class="zahl">${zahl(r.klpH)} h</td></tr>
        <tr><td>${R("LPVO", "2 c", "Abs. 4 lit. a")} · Zusätzliche Aufgaben (Ämter, Kustodien, Projekte)</td><td class="zahl">${zahl(r.zusatzH)} h</td></tr>
        ${bereichZeilen}
        <tr class="summe"><td>Netto-Arbeitszeit = Beschäftigungsgrad × ${zahl(r.njaz)} h</td><td class="zahl">${zahl(r.netto)} h</td></tr>
        <tr class="summe"><td>Beschäftigungsgrad (${R("LPVO", "9")}, ${R("LPG", "6")})</td><td class="zahl">${zahl(r.pensum, 1)} %</td></tr>
      </tbody></table></div>
      <div class="spalten" style="margin-top:1rem">
        <section><h3>Lektionen</h3><div class="tabelle-wrap"><table><thead><tr><th>Klasse</th><th>Fach</th><th>Ressource</th><th class="zahl">WL</th><th class="zahl">h</th></tr></thead><tbody>${lZeilen || '<tr><td colspan="5" class="muted">keine</td></tr>'}</tbody></table></div></section>
        <section><h3>Gefässe</h3><div class="tabelle-wrap"><table><thead><tr><th>Gefäss</th><th>Bereich</th><th>Art</th><th class="zahl">h</th></tr></thead><tbody>${gZeilen || '<tr><td colspan="4" class="muted">keine</td></tr>'}</tbody></table></div></section>
      </div>`}
      ${u && u.status === "eingereicht" ? `<h2 style="margin-top:1rem">Angaben aus der Pensenumfrage</h2><div class="karte small">${umfrageDetail(u)}</div>` : ""}`;
  };

  seiten.berufsauftrag = function () {
    const lp = lehrpersonen();
    const karten = S.gefaesse.map((g) => {
      const total = g.teilnehmende.reduce((a, pid) => a + gefaessStunden(g, pid), 0);
      const teil = g.teilnehmende.map((pid) => `<tr><td>${esc(pname(pid))}</td><td class="zahl">${wlVon(pid)}</td><td class="zahl">${zahl(gefaessStunden(g, pid))}</td>${istSL() ? `<td><button class="btn klein" data-aktion="teil-weg" data-g="${g.id}" data-p="${pid}" aria-label="${esc(pname(pid))} entfernen">✕</button></td>` : ""}</tr>`).join("");
      const fehlen = lp.filter((p) => !g.teilnehmende.includes(p.id));
      const dis = istSL() ? "" : "disabled";
      return `<section class="karte" style="margin-bottom:1rem">
        <div class="seitenkopf" style="margin-bottom:.5rem"><div><h2>${esc(g.name)}</h2><p class="muted small">${esc(g.bereich)} · ${g.art === "zusatz" ? "zusätzlich zur Pauschale (erhöht den Beschäftigungsgrad)" : "Verwendung der Pauschale"}${g.kustodie ? ` · Kustodie (bis ${P().kustodieMaxStunden} h im Berufsauftrag)` : ""}${g.ressource === "pool" ? " · belastet Gestaltungspool" : ""} · ${g.teilnehmende.length} Teilnehmende · ${zahl(total)} h</p></div>
          <div class="aktionen"><button class="btn klein" data-aktion="praesenz" data-g="${g.id}">⇩ Präsenzliste</button></div></div>
        <div class="formzeile">
          <label class="feld">Art<select data-aktion="g-feld" data-g="${g.id}" data-feld="art" ${dis}><option value="pauschal" ${g.art === "pauschal" ? "selected" : ""}>aus Pauschale</option><option value="zusatz" ${g.art === "zusatz" ? "selected" : ""}>zusätzlich</option></select></label>
          <label class="feld">Regel<select data-aktion="g-feld" data-g="${g.id}" data-feld="regel" ${dis}><option value="fix" ${g.regel === "fix" ? "selected" : ""}>fix je Person</option><option value="linear" ${g.regel === "linear" ? "selected" : ""}>linear nach WL (Basis 27.3 WL)</option></select></label>
          <label class="feld">${g.regel === "fix" ? "Stunden je Person" : "Stunden bei 100 %"}<input type="number" min="0" value="${g.stunden}" data-aktion="g-feld" data-g="${g.id}" data-feld="stunden" ${dis}></label>
          ${g.regel === "linear" ? `<label class="feld">Sockel<input type="number" min="0" value="${g.sockel || 0}" data-aktion="g-feld" data-g="${g.id}" data-feld="sockel" ${dis}></label><label class="feld">Maximum<input type="number" min="0" value="${g.max || g.stunden}" data-aktion="g-feld" data-g="${g.id}" data-feld="max" ${dis}></label>` : ""}
          ${istSL() && fehlen.length ? `<label class="feld">Person hinzufügen<select data-aktion="teil-dazu" data-g="${g.id}"><option value="">wählen …</option>${fehlen.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></label>` : ""}
        </div>
        <div class="tabelle-wrap"><table><thead><tr><th>Teilnehmende</th><th class="zahl">WL</th><th class="zahl">Stunden</th>${istSL() ? "<th></th>" : ""}</tr></thead><tbody>${teil || '<tr><td colspan="4" class="muted">noch niemand</td></tr>'}</tbody></table></div>
      </section>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Berufsauftrag</h1><p class="muted">Aufgaben, Ämter und Sitzungen als Gefässe. «Aus Pauschale» plant, wofür die Pauschalen Schule (60 h), Zusammenarbeit (50 h) und Weiterbildung (30 h bei 100 %) verwendet werden; «zusätzlich» erhöht den Beschäftigungsgrad. Stunden je Person fix oder linear nach Wochenlektionen. Grundlage: ${RR(["LPG", "18 a"], ["LPG", "18 b"], ["LPG", "18 c"], ["LPVO", "10 a"], ["LPVO", "10 b"], ["LPVO", "10 c"], ["LPVO", "10 e"])}; Entschädigung über 50 h: ${R("LPVO", "2 f")}.</p></div>
      <div class="aktionen">${istSL() ? '<button class="btn primaer" data-aktion="g-neu">+ Gefäss</button>' : ""}<button class="btn" data-aktion="export-ba">⇩ Gesamtexport (CSV)</button></div></div>${karten}`;
  };

  seiten.ressourcen = function (q) {
    const sicht = q.get("sicht") || (istSV() ? "sv" : "sl");
    const tab = (k, t) => `<button role="tab" aria-selected="${sicht === k}" data-aktion="sicht" data-sicht="${k}">${t}</button>`;
    const vSL = verbrauch("sl");
    const vSV = verbrauch("sv");
    const darf = istSL() && !S.budgetGesperrt;
    const fmt = (r, w) => (r.einheit === "%" ? `${zahl(w)} %` : `${zahl(w, 1)} WL`);
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
    if (sicht === "vergleich") {
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
      <div class="reiter" role="tablist">${tab("sl", "Sicht Schulleitung")}${tab("sv", "Sicht Schulverwaltung")}${tab("vergleich", "Vergleich")}</div>${inhalt}`;
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
    return `<div class="seitenkopf"><div><h1>Stellvertretungen</h1><p class="muted">Ausfälle erfassen, Vikariate planen, Formulare unterschreiben und weitergeben. Gründe nur als Kategorie, ohne Diagnose. Vikariate aus dem Gestaltungspool höchstens 14 Schulwochen je Einsatz; Kurzvikariate liegen ausserhalb des Berufsauftrags. Grundlage: ${RR(["LPG", "5", "Abs. 2"], ["LPG", "25"], ["LPVO", "30"], ["LPVO", "31"], ["LPVO", "2 c", "Abs. 4 lit. d"], ["LPVO", "27"], ["LPVO", "28"], ["LPVO", "29"])}.</p></div>
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
    const team = t.team.map((x) => {
      const w = S.betreuungPensen[x.id] != null ? S.betreuungPensen[x.id] : x.prozent;
      return `<tr><td>${esc(x.name)}</td><td class="zahl">${darf ? `<input type="number" min="0" max="100" step="5" value="${w}" data-aktion="b-pensum" data-id="${x.id}" aria-label="Pensum ${esc(x.name)}"> %` : w + " %"}</td></tr>`;
    }).join("");
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
        <section><h2>Team</h2><div class="tabelle-wrap"><table><thead><tr><th>Person</th><th class="zahl">Pensum</th></tr></thead><tbody>${team}</tbody></table></div>
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
    const lekBedarf = S.lektionen.filter((l) => l.ressource === "ba" && !l.zusatz).reduce((a, l) => a + Number(l.wl), 0);
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
      <div class="tabelle-wrap" style="max-width:640px"><table><thead><tr><th>Alter</th><th class="zahl">Ferientage</th><th class="zahl">Netto-Jahresarbeitszeit 100 %</th></tr></thead><tbody>${p.nettoJahresarbeitszeit.map((x, i, arr) => `<tr><td>${i === 0 ? "bis 20" : i === arr.length - 1 ? "ab 60" : (arr[i - 1].bisAlter + 1) + "–" + x.bisAlter}</td><td class="zahl">${x.ferientage}</td><td class="zahl">${zahl(x.stunden)} h</td></tr>`).join("")}<tr><td colspan="2">Brutto (52 × 42 h)</td><td class="zahl">${zahl(p.bruttoJahresarbeitszeit)} h</td></tr></tbody></table></div>
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
      lektionen: S.lektionen.filter((l) => l.klasse === k.id && l.ressource === "ba" && !l.zusatz).reduce((a, l) => a + Number(l.wl), 0),
      gestaltungspoolWL: gpMut(k.id),
    }));
    const vzeJeStunde = 1 / (P().faktorLektion * P().lektionenJeVZE);
    const bg = {};
    for (const g of S.gefaesse) if (g.ressource === "pool" && g.art === "zusatz") for (const pid of g.teilnehmende) bg[pid] = (bg[pid] || 0) + gefaessStunden(g, pid) * vzeJeStunde;
    const ifPersonen = planbar().filter((p) => S.lektionen.some((l) => l.person === p.id && l.fach === "IF"));
    return {
      stufe: "Sekundar",
      klassen,
      gpZuteilungVZE: x.pool,
      ifWL: S.lektionen.filter((l) => l.fach === "IF").reduce((a, l) => a + Number(l.wl), 0),
      ifGestaltungspoolWL: 0,
      erhoehungBG: Object.entries(bg).map(([pid, vze]) => ({ name: pname(pid), vze })),
      vikariate: S.ausfaelle.filter((a) => a.quelle === "Gestaltungspool").map((a) => ({ lektionen: a.wl * wochen(a), text: `${pname(a.person)}, ${datum(a.von)}–${datum(a.bis)}` })),
      schulleitung: {
        slVZE: x.sl, koordinationVZE: x.koordination,
        personen: S.stellen.schulleitungen || [],
        lehrpersonen: (S.stellen.koordination || []).map((k) => ({ name: pname(k.person), vze: k.vze, ko: true })),
      },
      kontrolleSP: ifPersonen.map((p) => ({
        name: p.name,
        ifWL: S.lektionen.filter((l) => l.person === p.id && l.fach === "IF").reduce((a, l) => a + Number(l.wl), 0),
        regelklasseWL: S.lektionen.filter((l) => l.person === p.id && l.fach !== "IF" && l.ressource === "ba").reduce((a, l) => a + Number(l.wl), 0),
      })),
    };
  }
  async function vzeLaden(datei) {
    try {
      const bytes = new Uint8Array(await datei.arrayBuffer());
      const mappe = await XlsxVorlage.Mappe.oeffnen(bytes);
      const analyse = await VZETool.analysieren(mappe);
      VZE = { name: datei.name, bytes, analyse, se: (analyse.schuleinheiten[0] || {}).index, leeren: true, fehler: null };
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
        <div class="formzeile"><label class="feld">Excel-Datei des VSA (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-aktion="vze-datei"></label></div>
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
      <h2>3. Vorschau der Zellbelegung (${esc(version)})</h2>${vorschau}
      <p class="small muted">Nicht automatisch ausgefüllt: Abteilungen und Anforderungsstufen, kommunale Erweiterung, Zus. ISR, Antrag zusätzliche VZE, Datum und Unterschriften – diese Blätter bleiben wie geliefert.</p>`;
  };

  // ---------------------------------------------------------------- Hilfe
  function verlinken(text, kurz) {
    // §-Verweise im Gesetzestext verlinken: gleiches Erlass, «LPG»/«Lehrpersonalgesetz» → LPG; andere Erlasse nicht
    return esc(text).replace(/(§§?\s?)(\d+(?:\s[a-z](?![a-zäöüß]))?)/g, (m, vor, nr, pos, ganz) => {
      const danach = ganz.slice(pos + m.length, pos + m.length + 70).split("§")[0];
      let ziel = kurz;
      if (/\bLPG\b|Lehrpersonalgesetz|Lehrerpersonalgesetz/.test(danach)) ziel = "LPG";
      else if (/Volksschul|Personalgesetz|Personalverordnung|VVO|Verordnung (über|vom)|Übergangsordnung|Berufseinführung|Obligationenrecht|OR\b|Mittelschul|Vollzugs/.test(danach)) return m;
      if (!paragraph(ziel, nr)) return m;
      return `${vor}<a class="gesetz" href="#/hilfe/${ziel}/${nr.replace(/\s+/g, "")}">${nr}</a>`;
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
          <div class="seitenkopf" style="margin-bottom:.5rem"><div><h2 style="font-size:1.3rem">${esc(g.titel)}</h2><p class="muted small">LS ${esc(g.nummer)} · Stand ${esc(g.stand)} · aufbereitet aus der Zürcher Gesetzessammlung, ohne Fussnoten${aktiv === "LPVO" ? " und ohne Anhang (Lohntabellen)" : ""}. Massgebend ist die <a href="${esc(g.url)}" target="_blank" rel="noopener">amtliche Fassung</a>.</p></div></div>
          <div class="formzeile"><label class="feld">Im ${esc(aktiv)} suchen<input type="search" data-aktion="hilfe-suche" placeholder="z. B. Gestaltungspool, Klassenlehrperson" style="min-width:18rem"></label><span class="small muted" id="hilfe-treffer"></span></div>
          ${text}
        </div></div>`;
    }
    return `<div class="seitenkopf"><div><h1>Hilfe und gesetzliche Grundlagen</h1><p class="muted">Lehrpersonalgesetz (LPG) und Lehrpersonalverordnung (LPVO) des Kantons Zürich – mit Verweisen aus der Anwendung.</p></div></div>
      <div class="formzeile" role="tablist">${tab("", "Übersicht")}${tab("LPG", "Lehrpersonalgesetz (LPG)")}${tab("LPVO", "Lehrpersonalverordnung (LPVO)")}</div>${inhalt}`;
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
      case "zuruecksetzen":
        dialog("Testdaten neu laden?", "<p>Alle Änderungen dieser Sitzung gehen verloren.</p>", [{ text: "Neu laden", primaer: true, los: () => { S = neuerZustand(); speichern(); zeichnen(); } }]);
        return;
      case "lektion": {
        const l = S.lektionen.find((x) => x.id === id);
        l.person = el.value;
        protokoll(`${l.klasse} ${S.faecher[l.fach]}: ${el.value ? pname(el.value) : "offen"}`);
        break;
      }
      case "klp": { const k = S.klassen.find((x) => x.id === el.dataset.klasse); k.klp = el.value ? [el.value].concat(k.klp.slice(1).filter((x) => x !== el.value)) : k.klp.slice(1); protokoll(`Klassenlehrperson ${k.id}: ${pname(el.value)}`); break; }
      case "filter-klasse": { const q = new URLSearchParams(location.hash.split("?")[1] || ""); el.value ? q.set("klasse", el.value) : q.delete("klasse"); location.hash = "#/unterricht?" + q; return; }
      case "filter-offen": { const q = new URLSearchParams(location.hash.split("?")[1] || ""); el.checked ? q.set("offen", "1") : q.delete("offen"); location.hash = "#/unterricht?" + q; return; }
      case "g-feld": { const g = S.gefaesse.find((x) => x.id === el.dataset.g); g[el.dataset.feld] = ["regel", "art"].includes(el.dataset.feld) ? el.value : Number(el.value); protokoll(`Gefäss «${g.name}» angepasst`); break; }
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
      case "b-pensum": S.betreuungPensen[id] = Number(el.value); break;
      case "b-freigeben": S.betreuungFreigabe = true; protokoll("Pensen Tagesstrukturen zur Anstellung freigegeben"); ansage("Pensen der Tagesstrukturen freigegeben."); break;
      case "vze-datei": if (el.files && el.files[0]) vzeLaden(el.files[0]); return;
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
      case "export-personen": csv("personalliste.csv", [["Person", "Anstellung", "WL", "Netto-Arbeitszeit h", "Beschäftigungsgrad %", "Status"]].concat(planbar().map((p) => { const r = rechnung(p.id); return [p.name, p.art, r.wl, Math.round(r.netto || 0), r.pensum.toFixed(1), status(p.id).text]; }))); return;
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
    if (ziel === "hilfe" && param && param2) {
      const anker = document.getElementById(pAnker(param, param2));
      if (anker) { anker.classList.add("markiert"); setTimeout(() => { anker.scrollIntoView({ block: "start" }); anker.focus({ preventScroll: true }); }, 0); }
    }
  }
  function selektor(el) {
    if (el.id) return "#" + CSS.escape(el.id);
    const ds = el.dataset || {};
    const teile = ["aktion", "id", "g", "p", "r", "k", "feld", "klasse", "sicht"].filter((k) => ds[k]).map((k) => `[data-${k}="${CSS.escape(ds[k])}"]`);
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
    const el = e.target.closest("select[data-aktion], input[data-aktion]");
    if (el) aktion(el, e);
  });
  window.addEventListener("hashchange", () => { window.scrollTo(0, 0); zeichnen(); const m = document.getElementById("inhalt"); if (m && !/^#\/hilfe\/[^/]+\/./.test(location.hash)) m.focus({ preventScroll: true }); });

  try {
    const t = localStorage.getItem("eduksx-thema");
    const dunkel = t ? t === "dark" : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dunkel);
  } catch (e) { /* hell */ }
  zeichnen();

  // für Tests und Konsole
  window.STAFFING = { rechnung, stand, status, verbrauch, tagesstrukturRechnung, zustand: () => S };
})();
