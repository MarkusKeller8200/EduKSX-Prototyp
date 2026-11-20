/*
 * EduKSX-Flow – Klickprototyp Ablaufplanung (ohne Abhängigkeiten, ohne Server).
 * Abläufe werden als Schritte geplant; jeder Schritt ruft einen Vorgang auf, den ein anderes EduKSX-Modul im
 * Vorgangsregister anbietet. Die Aufrufe sind simuliert. Zustand im Speicher, im Browser gesichert (localStorage).
 */
(function () {
  "use strict";

  const SPEICHER = "eduksx-flow-prototyp-v5";
  const VERSION = "0.6.1";
  const EINSTIEG = "https://markuskeller8200.github.io/EduKSX-Prototyp/"; // übergeordnete Einstiegsseite aller Prototypen
  const D = window.FLOW_DATEN;
  const ROLLEN = D.ROLLEN;

  // ---------------------------------------------------------------- Hilfen
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const kopie = (o) => JSON.parse(JSON.stringify(o));
  const isoHeute = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  function addTage(iso, n) {
    const d = new Date(iso + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + Number(n || 0));
    return d.toISOString().slice(0, 10);
  }
  const tageZwischen = (a, b) => Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000);
  const datum = (iso) => (iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : "–");
  const datumKurz = (iso) => (iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("de-CH") : "–");
  const relTage = (n) => (n === 0 ? "am Stichtag" : n < 0 ? `${-n} Tage vorher` : `${n} Tage nachher`);
  const tKurz = (n) => (n === 0 ? "T" : n < 0 ? `T−${-n}` : `T+${n}`);
  const slug = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

  const alleVorgaenge = () => D.MODULE.flatMap((m) => m.vorgaenge.map((v) => Object.assign({ modul: m }, v)));
  const vorgang = (id) => alleVorgaenge().find((v) => v.id === id);
  const modulVon = (id) => D.MODULE.find((m) => id && id.startsWith(m.key + "."));
  const fdEintrag = (nr) => D.FUNKTIONENDIAGRAMM.find((f) => f.nr === nr);

  // ---------------------------------------------------------------- Zustand
  function neuerZustand() {
    const st = {
      rolle: "SV",
      heute: isoHeute(),
      vorlagen: kopie(D.VORLAGEN),
      laeufe: [],
      aufrufe: [],
      hinweise: [],
      erreichbar: Object.fromEntries(D.MODULE.map((m) => [m.key, true])),
      ereignisse: kopie(D.EREIGNISSE),
      kalErledigt: {},
      schuljahre: kopie(D.SCHULJAHRE),
      kal: { modus: "kalender", jahr: Number(isoHeute().slice(0, 4)), bereich: "", rolle: "", quelle: "", regel: "", nurFlow: false, nurOffen: false },
      zaehler: 1,
    };
    S = st;
    D.LAEUFE.forEach((l) => {
      const v = st.vorlagen.find((x) => x.id === l.vorlage);
      const lauf = laufAnlegen(v, Object.assign({ stichtag: addTage(st.heute, l.tageBisStichtag) }, l.kontext), true);
      // Vorgeschichte: erledigte Schritte ohne Protokoll-Rauschen nachbilden
      l.erledigt.forEach((sid) => {
        const sch = lauf.schritte.find((x) => x.id === sid);
        if (!sch) return;
        sch.status = "erledigt";
        sch.erledigtAm = fristVon(lauf, sch) < st.heute ? fristVon(lauf, sch) : addTage(st.heute, -1);
        sch.ergebnis = ergebnisErzeugen(lauf, sch);
      });
    });
    motor();
    KAL.vorbelegen();
    return st;
  }
  let S = null;
  function laden() {
    try { const roh = localStorage.getItem(SPEICHER); return roh ? JSON.parse(roh) : null; } catch (e) { return null; }
  }
  function speichern() {
    try { localStorage.setItem(SPEICHER, JSON.stringify(S)); } catch (e) { /* Vorschau ohne Speicher */ }
  }

  // ---------------------------------------------------------------- Ablauf-Motor
  const ERLEDIGT = ["erledigt", "uebersprungen"];
  const fristVon = (lauf, sch) => addTage(lauf.kontext.stichtag, sch.tage);

  /** Platzhalter auflösen: {person}, {stichtag}, {stichtag-14}, {o5.benutzername} */
  function aufloesen(text, lauf, roh) {
    return String(text == null ? "" : text).replace(/\{([^}]+)\}/g, (ganz, key) => {
      const k = key.trim();
      const m = k.match(/^stichtag\s*([+-]\s*\d+)?$/);
      if (m) {
        const iso = addTage(lauf.kontext.stichtag, m[1] ? Number(m[1].replace(/\s/g, "")) : 0);
        return roh ? iso : datumKurz(iso);
      }
      if (k.includes(".")) {
        const [sid, feld] = k.split(".");
        const sch = lauf.schritte.find((x) => x.id === sid);
        const w = sch && sch.ergebnis ? sch.ergebnis[feld] : undefined;
        return w == null ? `⟨${k} fehlt⟩` : String(w);
      }
      const w = lauf.kontext[k];
      return w == null || w === "" ? `⟨${k} fehlt⟩` : String(w);
    });
  }

  function bedingungErfuellt(b, lauf) {
    if (!b || !b.feld) return true;
    const ist = lauf.kontext[b.feld];
    const soll = aufloesen(b.wert, lauf, true);
    const num = (x) => Number(String(x).replace(",", "."));
    switch (b.op) {
      case "=": return String(ist) === soll;
      case "≠": return String(ist) !== soll;
      case "<": return num(ist) < num(soll);
      case ">": return num(ist) > num(soll);
      case "in": return soll.split(",").map((x) => x.trim()).includes(String(ist));
      default: return true;
    }
  }
  const bedingungText = (b) => (b && b.feld ? `${b.feld} ${b.op === "in" ? "ist eines von" : b.op} ${b.wert}` : "");

  function laufAnlegen(v, kontext, still) {
    const lauf = {
      id: "L" + String(S.zaehler++).padStart(3, "0"),
      vorlage: v.id, version: v.version, titel: v.titel, stichtagName: v.stichtag,
      kontext: kopie(kontext), gestartet: S.heute, abgeschlossen: null,
      schritte: kopie(v.schritte).map((x) => Object.assign(x, { status: "wartet", ergebnis: null, erledigtAm: null, param: null })),
    };
    S.laeufe.unshift(lauf);
    if (!still) hinweis(["SV", "SL"], lauf, `Ablauf «${lauf.titel}» für ${lauf.kontext.person} gestartet (Version ${lauf.version}).`);
    return lauf;
  }

  let ZAEHLER_ERGEBNIS = 100;
  function ergebnisErzeugen(lauf, sch) {
    const v = sch.aktion ? vorgang(sch.aktion.vorgang) : null;
    if (!v) return { erledigt: "ja" };
    const jahr = lauf.kontext.stichtag.slice(0, 4);
    const nr = () => String(++ZAEHLER_ERGEBNIS + S.zaehler * 7).padStart(4, "0");
    const out = {};
    v.ergebnis.forEach((k) => {
      out[k] = {
        benutzername: slug(lauf.kontext.person) + "@schule.example",
        dossier: `PD-${jahr}-${nr()}`,
        verfuegung: `AV-${jahr}-${nr()}`,
        berufsauftrag: `BA-${jahr}-${nr()}`,
        bestellung: `B-${nr()}`,
        protokoll: `UP-${nr()}`,
        termin: datumKurz(sch.param && sch.param.datum ? sch.param.datum : fristVon(lauf, sch)),
        stundenplan: "zugestellt",
        rechte: `Gruppe «${lauf.kontext.funktion || "–"}»`,
        befund: "keine Abweichungen",
        geschaeft: `G-${jahr}-${nr()}`,
        beschluss: `B-${jahr}-${nr()}`,
        publikation: `publiziert ${datumKurz(S.heute)}`,
        lernende: `S-${nr()}`,
        inventar: `INV-${nr()}`,
        kredit: "Budgetkredit vorhanden",
        stimmen: "einstimmig angenommen",
        eingang: `bestätigt ${datumKurz(S.heute)}`,
        dokument: `DOK-${nr()}`,
      }[k] || "ja";
    });
    return out;
  }

  function aufrufProtokoll(lauf, sch, status, antwort) {
    S.aufrufe.unshift({
      id: "A" + String(S.aufrufe.length + 1).padStart(4, "0"), tag: S.heute, uhr: new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" }),
      lauf: lauf.id, schritt: sch.id, titel: sch.titel, person: lauf.kontext.person,
      vorgang: sch.aktion ? sch.aktion.vorgang : "", param: sch.param || {}, status, antwort,
    });
  }

  function hinweis(rollen, lauf, text) {
    (rollen || []).forEach((r) => S.hinweise.unshift({ rolle: r, tag: S.heute, lauf: lauf.id, text }));
    S.hinweise = S.hinweise.slice(0, 200);
  }

  function abschliessen(lauf, sch, durch) {
    sch.status = "erledigt";
    sch.erledigtAm = S.heute;
    if (!sch.ergebnis) sch.ergebnis = ergebnisErzeugen(lauf, sch);
    if (sch.informiert && sch.informiert.length) hinweis(sch.informiert, lauf, `${lauf.kontext.person}: «${sch.titel}» erledigt${durch ? " (" + durch + ")" : ""}.`);
  }

  /** Schritt ausführen: Vorgang im Zielmodul aufrufen (simuliert) bzw. Aufgabe von Hand als erledigt melden. */
  function ausfuehren(lauf, sch, durch) {
    if (!sch.aktion) { abschliessen(lauf, sch, durch); return; }
    const v = vorgang(sch.aktion.vorgang);
    sch.param = Object.fromEntries(Object.entries(sch.aktion.param || {}).map(([k, w]) => [k, aufloesen(w, lauf, k === "datum" || k === "ab" || k === "gueltigAb" || k === "per")]));
    if (!v) { sch.status = "fehler"; sch.fehler = "Vorgang ist im Register nicht (mehr) vorhanden."; aufrufProtokoll(lauf, sch, "fehler", sch.fehler); return; }
    if (!S.erreichbar[v.modul.key]) {
      sch.status = "fehler"; sch.fehler = `EduKSX-${v.modul.name} nicht erreichbar.`;
      aufrufProtokoll(lauf, sch, "fehler", sch.fehler);
      hinweis(["ICT"], lauf, `Aufruf ${v.id} für ${lauf.kontext.person} fehlgeschlagen – EduKSX-${v.modul.name} nicht erreichbar.`);
      return;
    }
    const fehlt = Object.values(sch.param).some((w) => String(w).includes("fehlt⟩"));
    if (fehlt) { sch.status = "fehler"; sch.fehler = "Parameter unvollständig: " + Object.entries(sch.param).filter(([, w]) => String(w).includes("fehlt⟩")).map(([k]) => k).join(", "); aufrufProtokoll(lauf, sch, "fehler", sch.fehler); return; }
    sch.fehler = null;
    if (v.art === "rueckmeldung") {
      sch.status = "laeuft";
      aufrufProtokoll(lauf, sch, "angenommen", `EduKSX-${v.modul.name} hat den Auftrag angenommen, Rückmeldung folgt.`);
    } else {
      sch.ergebnis = ergebnisErzeugen(lauf, sch);
      aufrufProtokoll(lauf, sch, "ok", sch.ergebnis);
      abschliessen(lauf, sch, durch);
    }
  }

  function rueckmeldung(lauf, sch) {
    sch.ergebnis = ergebnisErzeugen(lauf, sch);
    aufrufProtokoll(lauf, sch, "rückmeldung", sch.ergebnis);
    abschliessen(lauf, sch, "Rückmeldung " + (modulVon(sch.aktion.vorgang) ? "EduKSX-" + modulVon(sch.aktion.vorgang).name : ""));
  }

  /** Status aller offenen Schritte neu bestimmen; automatische Schritte ausführen, sobald Vorgänger erledigt und Frist erreicht. */
  function motor() {
    S.laeufe.forEach((lauf) => {
      if (lauf.abgeschlossen) return;
      let geaendert = true, runden = 0;
      while (geaendert && runden++ < 50) {
        geaendert = false;
        lauf.schritte.forEach((sch) => {
          if (["erledigt", "uebersprungen", "laeuft", "fehler"].includes(sch.status)) return;
          const vorher = sch.status;
          if (!bedingungErfuellt(sch.bedingung, lauf)) { sch.status = "uebersprungen"; geaendert = true; return; }
          const offen = (sch.nach || []).filter((n) => { const v = lauf.schritte.find((x) => x.id === n); return v && !ERLEDIGT.includes(v.status); });
          if (offen.length) { sch.status = "wartet"; }
          else if (sch.auto && sch.aktion) {
            if (S.heute >= fristVon(lauf, sch)) { ausfuehren(lauf, sch, "automatisch"); geaendert = true; return; }
            sch.status = "geplant";
          } else sch.status = "bereit";
          if (vorher !== sch.status) geaendert = true;
        });
      }
      if (lauf.schritte.every((x) => ERLEDIGT.includes(x.status))) {
        lauf.abgeschlossen = S.heute;
        hinweis(["SV", "SL"], lauf, `Ablauf «${lauf.titel}» für ${lauf.kontext.person} abgeschlossen.`);
      }
    });
  }

  // ---------------------------------------------------------------- Prüfung einer Vorlage
  function vorfahren(v, id, seen) {
    seen = seen || new Set();
    const s = v.schritte.find((x) => x.id === id);
    (s ? s.nach : []).forEach((n) => { if (!seen.has(n)) { seen.add(n); vorfahren(v, n, seen); } });
    return seen;
  }
  function pruefen(v) {
    const m = [];
    const ids = new Set(v.schritte.map((x) => x.id));
    const felder = new Set(v.felder.map((f) => f.key));
    v.schritte.forEach((s) => {
      const name = `«${s.titel}»`;
      if (!s.rolle) m.push(["fehler", `${name}: keine verantwortliche Rolle.`]);
      if (!String(s.quelle || "").trim()) m.push(["warnung", `${name}: Quellenangabe fehlt.`]);
      (s.nach || []).forEach((n) => { if (!ids.has(n)) m.push(["fehler", `${name}: Vorgänger ${n} gibt es nicht.`]); });
      if (vorfahren(v, s.id).has(s.id)) m.push(["fehler", `${name}: Kreis in der Reihenfolge – der Schritt hängt von sich selbst ab.`]);
      (s.nach || []).forEach((n) => { const p = v.schritte.find((x) => x.id === n); if (p && p.tage > s.tage) m.push(["warnung", `${name} (${tKurz(s.tage)}) ist früher fällig als sein Vorgänger «${p.titel}» (${tKurz(p.tage)}).`]); });
      if (s.aktion) {
        const vg = vorgang(s.aktion.vorgang);
        if (!vg) { m.push(["fehler", `${name}: Vorgang ${s.aktion.vorgang} ist nicht registriert.`]); return; }
        vg.parameter.forEach((p) => { if (!String((s.aktion.param || {})[p] || "").trim()) m.push(["fehler", `${name}: Parameter «${p}» für ${vg.id} fehlt.`]); });
        const vf = vorfahren(v, s.id);
        Object.values(s.aktion.param || {}).forEach((w) => String(w).replace(/\{([^}]+)\}/g, (g, k) => {
          k = k.trim();
          if (/^stichtag\s*([+-]\s*\d+)?$/.test(k)) return g;
          if (k.includes(".")) {
            const [sid, feld] = k.split(".");
            const q = v.schritte.find((x) => x.id === sid);
            const qv = q && q.aktion ? vorgang(q.aktion.vorgang) : null;
            if (!q || !qv || !qv.ergebnis.includes(feld)) m.push(["fehler", `${name}: Platzhalter {${k}} – Schritt ${sid} liefert kein «${feld}».`]);
            else if (!vf.has(sid)) m.push(["warnung", `${name}: nutzt das Ergebnis von «${q.titel}», ist aber nicht danach eingeplant.`]);
          } else if (!felder.has(k)) m.push(["fehler", `${name}: Platzhalter {${k}} ist kein Kontextfeld.`]);
          return g;
        }));
      } else if (s.auto) m.push(["warnung", `${name}: Aufgaben von Hand können nicht automatisch laufen.`]);
      if (s.fd) {
        const f = fdEintrag(s.fd);
        const z = f && f.rollen[s.rolle];
        if (!f) m.push(["warnung", `${name}: Funktionendiagramm ${s.fd} unbekannt.`]);
        else if (!z || !/[EV]/.test(z)) m.push(["warnung", `${name}: Laut Funktionendiagramm ${s.fd} hat ${ROLLEN[s.rolle]} hier «${z || "–"}» – Lead (V) liegt bei ${Object.entries(f.rollen).filter(([, x]) => /V/.test(x)).map(([r]) => ROLLEN[r]).join(", ") || "–"}.`]);
      }
      if (s.bedingung && s.bedingung.feld && !felder.has(s.bedingung.feld)) m.push(["fehler", `${name}: Bedingung nutzt unbekanntes Feld «${s.bedingung.feld}».`]);
    });
    return m;
  }

  // ---------------------------------------------------------------- Darstellung: Bausteine
  function wordmark(zusatz) {
    const name = "EduKSX" + (zusatz ? "-" + zusatz : "");
    return `<span class="wm" role="img" aria-label="${esc(name)}"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span><span class="o">K</span><span class="b">SX</span>${zusatz ? `<span class="n">-${esc(zusatz)}</span>` : ""}</span></span>`;
  }
  const WM_DEV = `<span class="wm" role="img" aria-label="MarKusSXCH"><span aria-hidden="true"><span class="v">M</span><span class="n">ar</span><span class="o">K</span><span class="n">us</span><span class="b">SXCH</span></span></span>`;
  // Icon EduKSX-Flow: Flussdiagramm (Start – Entscheid – zwei Wege)
  const ICON_FLOW = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2.5" width="8" height="5" rx="1.5" stroke="var(--brand-orange)"/><path d="M12 7.5v2.5" stroke="var(--brand-neutral)"/><path d="M12 10l3.2 3.2L12 16.4 8.8 13.2z" stroke="var(--brand-violet)"/><path d="M8.8 13.2H5.5v3.3M15.2 13.2h3.3v3.3" stroke="var(--brand-neutral)"/><rect x="2.5" y="16.5" width="6" height="5" rx="1.5" stroke="var(--brand-neutral)"/><rect x="15.5" y="16.5" width="6" height="5" rx="1.5" stroke="var(--brand-neutral)"/></g><circle cx="18.5" cy="19" r="1" fill="var(--brand-blue)"/></svg>`;
  const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    uebersicht: ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    aufgaben: ico('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>'),
    laeufe: ico('<path d="M4 12h4l2-5 4 10 2-5h4"/>'),
    neu: ico('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>'),
    vorlagen: ico('<rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="17" width="6" height="4" rx="1"/><rect x="15" y="17" width="6" height="4" rx="1"/><path d="M12 7v4M6 17v-3h12v3"/>'),
    vorgaenge: ico('<path d="M8 4H5a1 1 0 0 0-1 1v3M16 4h3a1 1 0 0 1 1 1v3M8 20H5a1 1 0 0 1-1-1v-3M16 20h3a1 1 0 0 0 1-1v-3"/><path d="M9 12h6M12 9v6"/>'),
    funktionendiagramm: ico('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/><path d="M13 13l2 2 3-3"/>'),
    protokoll: ico('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>'),
    kalender: ico('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7 14h3M14 14h3M7 17.5h3"/>'),
  };
  const NAVI = [
    ["uebersicht", "Übersicht"],
    ["aufgaben", "Meine Aufgaben"],
    ["gruppe", "Abläufe"],
    ["laeufe", "Laufende Abläufe"],
    ["neu", "Ablauf starten"],
    ["gruppe", "Planung"],
    ["kalender", "Jahreskalender"],
    ["vorlagen", "Ablaufvorlagen"],
    ["vorgaenge", "Vorgänge der Module"],
    ["funktionendiagramm", "Funktionendiagramm"],
    ["gruppe", "Nachvollziehen"],
    ["protokoll", "Aufrufprotokoll"],
  ];

  const STATUS = {
    erledigt: ["erfolg", "✓", "erledigt"],
    uebersprungen: ["neutral", "–", "übersprungen"],
    bereit: ["info", "●", "zu erledigen"],
    geplant: ["violett", "◷", "geplant (automatisch)"],
    laeuft: ["warnung", "⧗", "wartet auf Rückmeldung"],
    wartet: ["neutral", "…", "wartet auf Vorgänger"],
    fehler: ["fehler", "✕", "Fehler"],
  };
  const badge = (st) => { const b = STATUS[st] || STATUS.wartet; return `<span class="badge ${b[0]}">${b[1]} ${b[2]}</span>`; };
  const ueberfaellig = (lauf, sch) => ["bereit", "laeuft", "fehler"].includes(sch.status) && S.heute > fristVon(lauf, sch);
  const fristBadge = (lauf, sch) => {
    if (ERLEDIGT.includes(sch.status)) return "";
    const d = tageZwischen(S.heute, fristVon(lauf, sch));
    if (d < 0 && ["bereit", "laeuft", "fehler"].includes(sch.status)) return ` <span class="badge fehler">! ${-d} T überfällig</span>`;
    if (d <= 3 && ["bereit", "laeuft"].includes(sch.status)) return ` <span class="badge warnung">! ${d === 0 ? "heute" : "in " + d + " T"}</span>`;
    return "";
  };
  const rolleBadge = (r) => `<span class="rolle" title="${esc(ROLLEN[r] || r)}">${esc(r)}</span>`;
  function aufrufText(s) {
    if (!s.aktion) return `<span class="muted">von Hand</span>`;
    const m = modulVon(s.aktion.vorgang);
    const v = vorgang(s.aktion.vorgang);
    return `<span class="aufruf"><span class="modul">${m ? "EduKSX-" + esc(m.name) : "?"}</span> ${esc(v ? v.titel : s.aktion.vorgang)}</span>`;
  }
  /** Quellenangabe mit Links auf bekannte Quellen und Markierung «ZU PRÜFEN». */
  function quelleHtml(q) {
    if (!q) return `<span class="badge warnung">⚠ Quelle fehlt</span>`;
    let h = esc(q);
    const QV = D.QUELLENVERZEICHNIS || {};
    Object.keys(QV).sort((x, y) => y.length - x.length).forEach((k) => {
      if (!QV[k][1]) return;
      const re = new RegExp(`(^|[\\s(;,])(${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=[\\s§,;)]|$)`);
      h = h.replace(re, (m, vor, key) => `${vor}<a href="${esc(QV[k][1])}" target="_blank" rel="noopener" title="${esc(QV[k][0])}">${key}</a>`);
    });
    return h.replace(/ZU PRÜFEN/g, '<span class="zupruefen">ZU PRÜFEN</span>');
  }
  function quellenVerzeichnis(schritte) {
    const QV = D.QUELLENVERZEICHNIS || {};
    const alle = schritte.map((s) => s.quelle || "").join(" ; ");
    const genutzt = Object.keys(QV).filter((k) => new RegExp(`(^|[\\s(;,])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s§,;)]|$)`).test(alle));
    if (!genutzt.length) return "";
    return `<details class="gefaess" style="margin-top:1rem"><summary><span><strong>Quellenverzeichnis</strong> (${genutzt.length})</span><span class="small muted">${schritte.filter((s) => /ZU PRÜFEN/.test(s.quelle || "")).length} Schritte mit «ZU PRÜFEN»</span></summary><div class="inhalt"><ul class="infoliste">${genutzt.map((k) => `<li><strong>${esc(k)}</strong> – ${QV[k][1] ? `<a href="${esc(QV[k][1])}" target="_blank" rel="noopener">${esc(QV[k][0])}</a>` : esc(QV[k][0]) + ' <span class="small muted">(Grundlage im Prototyp)</span>'}</li>`).join("")}</ul><p class="small muted">Stand der Recherche 19.11.2026, ohne Gewähr – keine Rechtsberatung. «ZU PRÜFEN»: gemeindeeigene Regelung (Gemeindeordnung, Geschäftsordnung, Personalverordnung) oder Paragraf noch zu verifizieren.</p></div></details>`;
  }
  const fortschritt = (lauf) => { const n = lauf.schritte.length, e = lauf.schritte.filter((x) => ERLEDIGT.includes(x.status)).length; return [e, n, Math.round((e / n) * 100)]; };
  const balken = (p) => `<div class="balken" role="img" aria-label="${p} Prozent erledigt"><span style="width:${p}%"></span></div>`;
  const laufVon = (id) => S.laeufe.find((l) => l.id === id);
  const vorlageVon = (id) => S.vorlagen.find((v) => v.id === id);

  // ---------------------------------------------------------------- Ablaufbild (SVG, Bahnen je Rolle, Spalten nach Reihenfolge)
  function ablaufbild(schritte, opt) {
    opt = opt || {};
    const lvl = {};
    const ebene = (id, tiefe) => {
      if (lvl[id] != null) return lvl[id];
      if ((tiefe || 0) > 60) return 0;
      const s = schritte.find((x) => x.id === id);
      const nach = s ? (s.nach || []).filter((n) => schritte.some((x) => x.id === n)) : [];
      lvl[id] = nach.length ? 1 + Math.max(...nach.map((n) => ebene(n, (tiefe || 0) + 1))) : 0;
      return lvl[id];
    };
    schritte.forEach((s) => ebene(s.id));
    const bahnen = Object.keys(ROLLEN).filter((r) => schritte.some((s) => s.rolle === r));
    const W = 182, H = 62, GX = 34, GY = 10, LW = 120, PAD = 12;
    const zelle = {};
    const pos = {};
    let hoeheBahn = {};
    bahnen.forEach((r) => {
      const inBahn = schritte.filter((s) => s.rolle === r).sort((a, b) => lvl[a.id] - lvl[b.id] || a.tage - b.tage);
      let max = 1;
      inBahn.forEach((s) => { const k = r + "|" + lvl[s.id]; zelle[k] = (zelle[k] || 0) + 1; max = Math.max(max, zelle[k]); s.__i = zelle[k] - 1; });
      hoeheBahn[r] = max * (H + GY) + GY;
    });
    let y = 0;
    const bahnY = {};
    bahnen.forEach((r) => { bahnY[r] = y; y += hoeheBahn[r]; });
    const maxL = Math.max(0, ...Object.values(lvl));
    const breite = LW + PAD + (maxL + 1) * (W + GX);
    schritte.forEach((s) => { pos[s.id] = { x: LW + PAD + lvl[s.id] * (W + GX), y: bahnY[s.rolle] + GY + s.__i * (H + GY) }; });
    let svg = `<svg class="ablaufbild" viewBox="0 0 ${breite} ${y}" width="${breite}" height="${y}" role="img" aria-label="Ablaufbild: Schritte nach Rolle und Reihenfolge">`;
    svg += `<defs><marker id="pfeil" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="pfeilspitze"/></marker></defs>`;
    bahnen.forEach((r, i) => {
      svg += `<rect x="0" y="${bahnY[r]}" width="${breite}" height="${hoeheBahn[r]}" class="${i % 2 ? "bahn2" : "bahn1"}"/>`;
      svg += `<text x="10" y="${bahnY[r] + 22}" class="bahntitel">${esc(r)}</text><text x="10" y="${bahnY[r] + 38}" class="bahnname">${esc(kuerzen(ROLLEN[r], 18))}</text>`;
    });
    schritte.forEach((s) => (s.nach || []).forEach((n) => {
      const a = pos[n], b = pos[s.id];
      if (!a || !b) return;
      const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x - 2, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
      svg += `<path d="M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" class="kante" marker-end="url(#pfeil)"/>`;
    }));
    schritte.forEach((s, idx) => {
      const p = pos[s.id];
      const st = opt.lauf ? s.status : null;
      const zeilen = umbrechen(s.titel, 24, 2);
      const unten = opt.lauf ? `${(STATUS[st] || STATUS.wartet)[1]} ${(STATUS[st] || STATUS.wartet)[2]} · ${datumKurz(fristVon(opt.lauf, s))}` : `${tKurz(s.tage)} · ${s.aktion ? (modulVon(s.aktion.vorgang) || { name: "?" }).name : "von Hand"}${s.auto ? " · auto" : ""}${s.bedingung && s.bedingung.feld ? " · bedingt" : ""}`;
      const ziel = opt.lauf ? "" : `data-aktion="schritt-bearbeiten" data-id="${esc(s.id)}" tabindex="0" role="button" aria-label="${esc(s.titel)} bearbeiten"`;
      svg += `<g class="knoten ${st ? "st-" + st : ""} ${s.bedingung && s.bedingung.feld ? "bedingt" : ""}" ${ziel}><title>${esc(s.titel)}${s.fd ? " – Funktionendiagramm " + esc(s.fd) : ""}</title>`;
      svg += `<rect x="${p.x}" y="${p.y}" width="${W}" height="${H}" rx="8"/>`;
      svg += `<text x="${p.x + 10}" y="${p.y + 18}" class="nr">${idx + 1}</text>`;
      zeilen.forEach((z, i) => { svg += `<text x="${p.x + 28}" y="${p.y + 18 + i * 15}" class="t">${esc(z)}</text>`; });
      svg += `<text x="${p.x + 10}" y="${p.y + H - 9}" class="u">${esc(kuerzen(unten, 33))}</text></g>`;
    });
    return `<div class="bild-wrap" data-glossary-ignore>${svg}</svg></div>`;
  }
  function kuerzen(t, n) { t = String(t || ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; }
  function umbrechen(t, n, max) {
    const w = String(t).split(/\s+/); const z = [""];
    w.forEach((x) => { if ((z[z.length - 1] + " " + x).trim().length > n && z[z.length - 1]) z.push(x); else z[z.length - 1] = (z[z.length - 1] + " " + x).trim(); });
    if (z.length > max) { z.length = max; z[max - 1] = kuerzen(z[max - 1] + " …", n); }
    return z;
  }

  // ---------------------------------------------------------------- Rahmen
  function rahmen(seite, inhalt) {
    const aufgaben = offeneAufgaben(S.rolle).length;
    const navi = NAVI.map((n) => {
      if (n[0] === "gruppe") return `<li class="gruppe" aria-hidden="true">${esc(n[1])}</li>`;
      const aktiv = seite === n[0] || ({ lauf: "laeufe", vorlage: "vorlagen" }[seite] === n[0]);
      const zahl = n[0] === "aufgaben" && aufgaben ? ` <span class="zaehler" aria-label="${aufgaben} offen">${aufgaben}</span>` : "";
      return `<li><a href="#/${n[0]}" ${aktiv ? 'aria-current="page"' : ""}>${ICONS[n[0]]}<span>${esc(n[1])}</span>${zahl}</a></li>`;
    }).join("") + `<li class="gruppe" aria-hidden="true">Entwicklung</li><li><a href="entwickler/" title="Datenmodell und API – Entwurf für die Umsetzung">${ico('<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 4-4 16"/>')}<span>Entwickler</span></a></li>`;
    const rollen = Object.entries(ROLLEN).filter(([k]) => !["LP", "GV", "VSA", "MA", "ELT"].includes(k)).map(([k, v]) => `<option value="${k}" ${k === S.rolle ? "selected" : ""}>${esc(v)}</option>`).join("");
    const dunkel = document.documentElement.classList.contains("dark");
    return `
      <header class="kopf">
        <a class="marke" href="#/uebersicht">${ICON_FLOW}${wordmark("Flow")}</a>
        <span class="muted small">Ablaufplanung / Termine und ToDo</span>
        <a class="btn zurueck" href="${EINSTIEG}" title="Zurück zur Einstiegsseite aller EduKSX-Prototypen" aria-label="Zurück zur Einstiegsseite aller EduKSX-Prototypen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>
        <div class="werkzeuge">
          <span class="simtag" title="Simulierter Tag – damit Fristen und automatische Schritte ausprobiert werden können">📅 ${esc(datum(S.heute))}</span>
          <button class="btn klein" data-aktion="zeit" data-tage="1" title="Einen Tag weiter">+1 Tag</button>
          <button class="btn klein" data-aktion="zeit" data-tage="7" title="Eine Woche weiter">+7 Tage</button>
          <button class="btn klein" data-aktion="naechste-frist" title="Zur nächsten Frist springen">⏭ Nächste Frist</button>
          <label class="sr-only" for="w-rolle">Rolle</label><select id="w-rolle" data-aktion="rolle" title="Rolle im Prototyp wechseln">${rollen}</select>
          <button class="btn" data-aktion="thema" aria-pressed="${dunkel}" title="Hell/Dunkel">${dunkel ? "☀ Hell" : "☾ Dunkel"}</button>
          <button class="btn" data-aktion="glossar" aria-pressed="${glossarAn()}" title="Abkürzungen mit EduKSX-Glossary erklären">${glossarAn() ? "Ⓖ Begriffe an" : "Ⓖ Begriffe aus"}</button>
          <button class="btn" data-aktion="zuruecksetzen" title="Testdaten neu laden">↺ Testdaten</button>
        </div>
      </header>
      <div class="hinweis-band" role="note"><strong>Prototyp</strong> – Personen sind erfunden, Aufrufe an die anderen Module werden nur simuliert. Grundlage: Prozessliste der Arbeitsgruppe und Funktionendiagramm (Muster).</div>
      <div class="rahmen">
        <nav class="navi" aria-label="Hauptnavigation"><ul>${navi}</ul></nav>
        <main id="inhalt" tabindex="-1">${inhalt}</main>
      </div>
      <footer class="fuss"><span>${wordmark("Flow")} · Prototyp ${VERSION} · in Entwicklung · <a href="${EINSTIEG}">Alle Prototypen</a> · Begriffe: <a href="https://glossary.eduksx.ch">EduKSX-Glossary</a> (CC BY 4.0)</span><span>Developed by ${WM_DEV}</span></footer>
      <div class="sr-only" aria-live="polite" id="ansage"></div>`;
  }

  function offeneAufgaben(rolle) {
    const out = [];
    S.laeufe.forEach((l) => l.schritte.forEach((s) => { if ((!rolle || s.rolle === rolle) && ["bereit", "laeuft", "fehler"].includes(s.status)) out.push([l, s]); }));
    return out.sort((a, b) => fristVon(a[0], a[1]).localeCompare(fristVon(b[0], b[1])));
  }

  function aktionKnopf(l, s) {
    const meine = s.rolle === S.rolle || (D.EXTERN || []).includes(s.rolle);
    const titel = meine ? "" : `title="Nur ${esc(ROLLEN[s.rolle])} – Rolle oben rechts wechseln"`;
    const dis = meine ? "" : "disabled";
    const d = `data-lauf="${l.id}" data-id="${s.id}"`;
    if (s.status === "bereit") return s.aktion
      ? `<button class="btn klein primaer" data-aktion="ausfuehren" ${d} ${dis} ${titel}>▶ Aufruf an EduKSX-${esc((modulVon(s.aktion.vorgang) || { name: "?" }).name)}</button>`
      : `<button class="btn klein primaer" data-aktion="ausfuehren" ${d} ${dis} ${titel}>${(D.EXTERN || []).includes(s.rolle) ? "✓ Eingang bestätigen" : "✓ Erledigt melden"}</button>`;
    if (s.status === "laeuft") return `<button class="btn klein" data-aktion="rueckmeldung" ${d} title="Simuliert die Rückmeldung des Moduls (z. B. Unterschrift eingegangen)">↩ Rückmeldung simulieren</button>`;
    if (s.status === "fehler") return `<button class="btn klein" data-aktion="nochmals" ${d}>↻ Erneut versuchen</button>`;
    if (s.status === "geplant") return `<button class="btn klein" data-aktion="jetzt" ${d} ${dis} ${titel} title="Automatischen Schritt vor der Frist auslösen">▶ Jetzt auslösen</button>`;
    return "";
  }

  // ---------------------------------------------------------------- Seiten
  function seiteUebersicht() {
    const aktiv = S.laeufe.filter((l) => !l.abgeschlossen);
    const alle = offeneAufgaben(null);
    const ueber = alle.filter(([l, s]) => ueberfaellig(l, s));
    const fehler = alle.filter(([, s]) => s.status === "fehler");
    const zeilen = S.laeufe.map((l) => {
      const [e, n, p] = fortschritt(l);
      const naechste = l.schritte.filter((s) => ["bereit", "laeuft", "fehler", "geplant"].includes(s.status)).sort((a, b) => a.tage - b.tage)[0];
      return `<tr><td><a href="#/lauf/${l.id}">${esc(l.kontext.person)}</a><div class="small muted">${esc(l.kontext.funktion || "")}</div></td><td>${esc(l.titel)} <span class="small muted">v${l.version}</span></td>
        <td>${esc(l.stichtagName)}: ${datumKurz(l.kontext.stichtag)}<div class="small muted">${relTage(tageZwischen(l.kontext.stichtag, S.heute)).replace("vorher", "bis dahin").replace("nachher", "her")}</div></td>
        <td>${balken(p)}<div class="small muted">${e} von ${n} Schritten</div></td>
        <td>${l.abgeschlossen ? `<span class="badge erfolg">✓ abgeschlossen</span>` : naechste ? `${badge(naechste.status)}${fristBadge(l, naechste)}<div class="small">${esc(naechste.titel)} · ${rolleBadge(naechste.rolle)}</div>` : ""}</td></tr>`;
    }).join("");
    const jeRolle = Object.keys(ROLLEN).map((r) => [r, offeneAufgaben(r).length]).filter(([, n]) => n);
    return `
      <div class="seitenkopf"><div><h1>Übersicht</h1><p class="muted">Abläufe bestehen aus geplanten Schritten. Jeder Schritt ruft einen Vorgang in einem anderen Modul auf – ${wordmark("Flow")} plant, verteilt die Aufgaben und hält fest, was wann geschehen ist.</p></div>
        <div class="aktionen"><a class="btn primaer" href="#/neu">▶ Ablauf starten</a></div></div>
      <div class="karten">
        <div class="karte"><div class="zahl">${aktiv.length}</div><div class="titel">laufende Abläufe</div></div>
        <div class="karte"><div class="zahl">${alle.length}</div><div class="titel">offene Aufgaben (alle Rollen)</div></div>
        <div class="karte"><div class="zahl">${ueber.length}</div><div class="titel">${ueber.length ? "⚠ " : ""}überfällig</div></div>
        <div class="karte"><div class="zahl">${fehler.length}</div><div class="titel">${fehler.length ? "✕ " : ""}fehlgeschlagene Aufrufe</div></div>
      </div>
      <section><h2>Abläufe</h2><div class="tabelle-wrap"><table><thead><tr><th>Person</th><th>Ablauf</th><th>Stichtag</th><th>Fortschritt</th><th>Nächster Schritt</th></tr></thead><tbody>${zeilen || `<tr><td colspan="5" class="muted">Noch keine Abläufe.</td></tr>`}</tbody></table></div></section>
      <section style="margin-top:1.25rem"><h2>Jahreskalender: als Nächstes</h2>${kalListe(KAL.demnaechst(28, false).slice(0, 6))}<p class="small"><a href="#/kalender">Zum Jahreskalender</a></p></section>
      <section style="margin-top:1.25rem"><h2>Offene Aufgaben je Rolle</h2><p class="small muted">Wer zuständig ist, folgt aus der Vorlage bzw. dem Funktionendiagramm (V = operativer Lead).</p>
        <div class="karten">${jeRolle.map(([r, n]) => `<div class="karte"><div class="zahl">${n}</div><div class="titel">${rolleBadge(r)} ${esc(ROLLEN[r])}</div></div>`).join("") || `<p class="muted">Keine offenen Aufgaben.</p>`}</div></section>`;
  }

  function seiteAufgaben() {
    const meine = offeneAufgaben(S.rolle);
    const bald = [];
    S.laeufe.forEach((l) => l.schritte.forEach((s) => { if (s.rolle === S.rolle && ["wartet", "geplant"].includes(s.status) && tageZwischen(S.heute, fristVon(l, s)) <= 21) bald.push([l, s]); }));
    bald.sort((a, b) => fristVon(a[0], a[1]).localeCompare(fristVon(b[0], b[1])));
    const info = S.hinweise.filter((h) => h.rolle === S.rolle).slice(0, 12);
    const zeile = ([l, s], mitAktion) => `<tr><td>${badge(s.status)}${fristBadge(l, s)}</td><td><strong>${esc(s.titel)}</strong><div class="small muted"><a href="#/lauf/${l.id}">${esc(l.kontext.person)} · ${esc(l.titel)}</a>${s.fd ? ` · FD ${esc(s.fd)}` : ""}</div>${s.fehler ? `<div class="small" style="color:var(--destructive)">✕ ${esc(s.fehler)}</div>` : ""}</td>
      <td>${datumKurz(fristVon(l, s))}</td><td>${aufrufText(s)}</td><td>${mitAktion ? aktionKnopf(l, s) : (s.status === "wartet" ? `<span class="small muted">nach ${esc((s.nach || []).map((n) => (l.schritte.find((x) => x.id === n) || {}).titel).join(", "))}</span>` : `<span class="small muted">läuft automatisch am ${datumKurz(fristVon(l, s))}</span>`)}</td></tr>`;
    return `
      <div class="seitenkopf"><div><h1>Meine Aufgaben</h1><p class="muted">Rolle: ${rolleBadge(S.rolle)} ${esc(ROLLEN[S.rolle])}. Aufgaben entstehen, sobald die Vorgänger eines Schritts erledigt sind. Automatische Schritte erscheinen hier nur, wenn ein Aufruf fehlschlägt.</p></div></div>
      <section><h2>Zu erledigen (${meine.length})</h2><div class="tabelle-wrap"><table><thead><tr><th>Status</th><th>Schritt</th><th>Frist</th><th>Aufruf</th><th></th></tr></thead><tbody>${meine.map((x) => zeile(x, true)).join("") || `<tr><td colspan="5" class="muted">Nichts zu erledigen. 🎉</td></tr>`}</tbody></table></div></section>
      <section style="margin-top:1.25rem"><h2>Demnächst (21 Tage)</h2><div class="tabelle-wrap"><table><thead><tr><th>Status</th><th>Schritt</th><th>Frist</th><th>Aufruf</th><th></th></tr></thead><tbody>${bald.map((x) => zeile(x, false)).join("") || `<tr><td colspan="5" class="muted">Keine anstehenden Schritte.</td></tr>`}</tbody></table></div></section>
      <section style="margin-top:1.25rem"><h2>Termine aus dem Jahreskalender</h2><p class="small muted">Ereignisse der nächsten 4 Wochen (und überfällige), bei denen ${esc(ROLLEN[S.rolle])} laut Jahresplanung entscheidet oder verantwortlich ist.</p>${kalListe(KAL.demnaechst(28, true))}</section>
      <section style="margin-top:1.25rem"><h2>Zur Information</h2><p class="small muted">Mitteilungen an ${esc(ROLLEN[S.rolle])} – entspricht «I» im Funktionendiagramm bzw. «Kommunikation an» in der Prozessliste.</p>
        <ul class="infoliste">${info.map((h) => `<li><span class="small muted">${datumKurz(h.tag)}</span> ${esc(h.text)} <a class="small" href="#/lauf/${h.lauf}">Ablauf</a></li>`).join("") || `<li class="muted">Keine Mitteilungen.</li>`}</ul></section>`;
  }

  function kalListe(liste) {
    if (!liste.length) return `<p class="muted small">Keine anstehenden Ereignisse.</p>`;
    return `<ul class="infoliste">${liste.map((o) => `<li><button class="link" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}">${esc(o.ev.titel)}</button> <span class="small muted">${KAL.wann(o)}</span> ${KAL.statusBadge(o)} ${o.ev.flow ? `<span class="badge violett" title="Mit Ablaufvorlage verknüpft">⇢ ${esc((vorlageVon(o.ev.flow) || { titel: "Ablauf" }).titel)}</span>` : ""}</li>`).join("")}</ul>`;
  }

  function seiteLaeufe() {
    const karten = S.laeufe.map((l) => {
      const [e, n, p] = fortschritt(l);
      return `<a class="karte laufkarte" href="#/lauf/${l.id}"><div class="small muted">${esc(l.id)} · ${esc(l.titel)} v${l.version}</div><h3>${esc(l.kontext.person)}</h3><div class="small">${esc(l.kontext.funktion || "")} · ${esc(l.stichtagName)} ${datumKurz(l.kontext.stichtag)}</div>${balken(p)}<div class="small muted">${l.abgeschlossen ? "✓ abgeschlossen am " + datumKurz(l.abgeschlossen) : `${e} von ${n} Schritten erledigt`}</div></a>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Laufende Abläufe</h1><p class="muted">Jeder Ablauf arbeitet mit einer Kopie der Vorlage in der Version beim Start – spätere Änderungen an der Vorlage verändern laufende Abläufe nicht.</p></div><div class="aktionen"><a class="btn primaer" href="#/neu">▶ Ablauf starten</a></div></div><div class="karten">${karten}</div>`;
  }

  function seiteLauf(id, reiter) {
    const l = laufVon(id);
    if (!l) return `<h1>Ablauf nicht gefunden</h1><p><a href="#/laeufe">Zur Liste</a></p>`;
    const [e, n, p] = fortschritt(l);
    reiter = reiter || "schritte";
    const kontext = Object.entries(l.kontext).map(([k, w]) => `<div class="feldzeile"><span class="muted">${esc(k)}</span><span>${esc(k === "stichtag" ? datum(w) : w)}</span></div>`).join("");
    const zeilen = l.schritte.map((s, i) => `<tr class="${s.status === "uebersprungen" ? "blass" : ""}">
      <td class="zahl">${i + 1}</td>
      <td><strong>${esc(s.titel)}</strong>${s.quelle ? `<div class="quelle">📖 ${quelleHtml(s.quelle)}</div>` : ""}${s.bedingung && s.bedingung.feld ? `<div class="small muted">Bedingung: ${esc(bedingungText(s.bedingung))}</div>` : ""}${s.fehler && s.status === "fehler" ? `<div class="small" style="color:var(--destructive)">✕ ${esc(s.fehler)}</div>` : ""}</td>
      <td>${rolleBadge(s.rolle)}${s.fd ? `<div class="small muted">FD ${esc(s.fd)}</div>` : ""}</td>
      <td>${datumKurz(fristVon(l, s))}<div class="small muted">${tKurz(s.tage)}</div></td>
      <td>${aufrufText(s)}${s.param ? `<div class="param">${Object.entries(s.param).map(([k, w]) => `${esc(k)}: ${esc(w)}`).join("<br>")}</div>` : ""}</td>
      <td>${badge(s.status)}${fristBadge(l, s)}${s.ergebnis ? `<div class="param">${Object.entries(s.ergebnis).map(([k, w]) => `→ ${esc(k)}: ${esc(w)}`).join("<br>")}</div>` : ""}${s.erledigtAm ? `<div class="small muted">${datumKurz(s.erledigtAm)}</div>` : ""}</td>
      <td>${aktionKnopf(l, s)}</td></tr>`).join("");
    const aufrufe = S.aufrufe.filter((a) => a.lauf === l.id);
    return `
      <div class="seitenkopf"><div><div class="small muted"><a href="#/laeufe">Laufende Abläufe</a> › ${esc(l.id)}</div><h1>${esc(l.titel)}: ${esc(l.kontext.person)}</h1>
        <p class="muted">Vorlage Version ${l.version}, gestartet ${datumKurz(l.gestartet)} · ${esc(l.stichtagName)}: ${datum(l.kontext.stichtag)}${l.ereignisTitel ? ` · aus dem <a href="#/kalender/liste">Jahreskalender</a>: ${esc(l.ereignisTitel)}` : ""}</p></div></div>
      <div class="spalten" style="grid-template-columns: 2fr 1fr; margin-bottom:1rem">
        <div class="karte"><div class="titel muted small">Fortschritt</div><div class="zahl">${p} %</div>${balken(p)}<div class="small muted">${e} von ${n} Schritten erledigt oder übersprungen${l.abgeschlossen ? " · ✓ abgeschlossen am " + datumKurz(l.abgeschlossen) : ""}</div></div>
        <div class="karte"><div class="titel muted small">Kontext (Eingaben beim Start)</div><div class="feldliste">${kontext}</div></div>
      </div>
      <div class="reiter" role="tablist">
        <button role="tab" aria-selected="${reiter === "schritte"}" data-aktion="reiter" data-ziel="#/lauf/${l.id}/schritte">Schritte</button>
        <button role="tab" aria-selected="${reiter === "bild"}" data-aktion="reiter" data-ziel="#/lauf/${l.id}/bild">Ablaufbild</button>
        <button role="tab" aria-selected="${reiter === "protokoll"}" data-aktion="reiter" data-ziel="#/lauf/${l.id}/protokoll">Aufrufe (${aufrufe.length})</button>
      </div>
      ${reiter === "bild" ? legende() + ablaufbild(l.schritte, { lauf: l })
        : reiter === "protokoll" ? protokollTabelle(aufrufe)
        : `<div class="tabelle-wrap"><table><thead><tr><th class="zahl">#</th><th>Schritt</th><th>Wer</th><th>Frist</th><th>Aufruf und Parameter</th><th>Status und Ergebnis</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></div>`}`;
  }
  const legende = () => `<p class="small muted legende">${Object.keys(STATUS).map((k) => badge(k)).join(" ")}</p>`;

  function seiteNeu(vid) {
    const frei = S.vorlagen.filter((v) => v.status === "freigegeben");
    const v = vorlageVon(vid) && vorlageVon(vid).status === "freigegeben" ? vorlageVon(vid) : frei[0];
    if (!v) return `<h1>Ablauf starten</h1><p class="meldung warnung">Keine freigegebene Vorlage vorhanden.</p>`;
    const E = START_EINGABE[v.id] || (START_EINGABE[v.id] = startVorgabe(v));
    const feld = (f) => {
      const w = E[f.key] == null ? "" : E[f.key];
      if (f.typ === "auswahl") return `<label class="feld">${esc(f.label)}<select data-aktion="start-feld" data-key="${f.key}">${f.werte.map((x) => `<option ${x === w ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
      return `<label class="feld">${esc(f.label)}<input type="${f.typ === "datum" ? "date" : f.typ === "zahl" ? "number" : "text"}" value="${esc(w)}" data-aktion="start-feld" data-key="${f.key}"></label>`;
    };
    const probe = { kontext: E, schritte: v.schritte.map((s) => Object.assign({}, s, { ergebnis: null })) };
    const zeilen = v.schritte.map((s, i) => {
      const ok = bedingungErfuellt(s.bedingung, probe);
      const frist = E.stichtag ? addTage(E.stichtag, s.tage) : "";
      const vergangen = frist && frist < S.heute;
      return `<tr class="${ok ? "" : "blass"}"><td class="zahl">${i + 1}</td><td>${esc(s.titel)}</td><td>${rolleBadge(s.rolle)}</td><td>${datumKurz(frist)}${vergangen && ok ? ` <span class="badge warnung">! schon vorbei</span>` : ""}</td><td>${aufrufText(s)}${s.auto ? ` <span class="badge violett">auto</span>` : ""}</td><td>${ok ? `<span class="badge info">● wird geplant</span>` : `<span class="badge neutral">– entfällt</span><div class="small muted">${esc(bedingungText(s.bedingung))}</div>`}</td></tr>`;
    }).join("");
    const knapp = E.stichtag && v.schritte.some((s) => bedingungErfuellt(s.bedingung, probe) && addTage(E.stichtag, s.tage) < S.heute);
    return `
      <div class="seitenkopf"><div><h1>Ablauf starten</h1><p class="muted">Vorlage wählen, Angaben erfassen – ${wordmark("Flow")} rechnet die Fristen vom Stichtag aus und lässt Schritte weg, deren Bedingung nicht zutrifft.</p></div></div>
      ${START_EREIGNIS[v.id] ? `<p class="meldung info">Aus dem Jahreskalender: <strong>${esc(START_EREIGNIS[v.id].titel)}</strong> – Stichtag vom Ereignis übernommen.</p>` : ""}
      <div class="formzeile"><label class="feld">Vorlage<select data-aktion="start-vorlage">${[...new Set(frei.map((x) => x.gruppe || "Weitere"))].map((g) => `<optgroup label="${esc(g)}">${frei.filter((x) => (x.gruppe || "Weitere") === g).map((x) => `<option value="${x.id}" ${x.id === v.id ? "selected" : ""}>${esc(x.titel)} (v${x.version})</option>`).join("")}</optgroup>`).join("")}</select></label></div>
      <div class="karte" style="margin-bottom:1rem"><p class="small muted">${esc(v.beschreibung)}</p><div class="formzeile">${v.felder.map(feld).join("")}</div>
        ${knapp ? `<p class="meldung warnung">⚠ Einzelne Fristen liegen schon in der Vergangenheit – diese Schritte sind ab Start überfällig.</p>` : ""}
        <button class="btn primaer" data-aktion="starten" data-vorlage="${v.id}" ${E.person && E.stichtag ? "" : "disabled"}>▶ Ablauf starten</button></div>
      <h2>Vorschau</h2><div class="tabelle-wrap"><table><thead><tr><th class="zahl">#</th><th>Schritt</th><th>Wer</th><th>Frist</th><th>Aufruf</th><th>Plan</th></tr></thead><tbody>${zeilen}</tbody></table></div>`;
  }
  const START_EINGABE = {};
  const START_EREIGNIS = {};
  /** Start aus dem Jahreskalender: Stichtag = Datum des Ereignisses, Herkunft merken. */
  function startVorbereiten(v, stichtag, key, titel) {
    const e = startVorgabe(v);
    e.stichtag = stichtag;
    if (v.id === "beschaffung") e.person = titel;
    START_EINGABE[v.id] = e;
    START_EREIGNIS[v.id] = { key, titel };
  }
  function startVorgabe(v) {
    const e = {};
    v.felder.forEach((f) => { e[f.key] = f.typ === "auswahl" ? f.werte[0] : f.typ === "datum" ? addTage(S.heute, 60) : f.typ === "zahl" ? 100 : ""; });
    if (v.id === "mutation") { e.pensumAlt = 100; e.pensum = 80; }
    if (v.id === "beschaffung") { e.person = "Tablets 1. Klassen"; e.menge = 25; e.stichtag = addTage(S.heute, 120); }
    return e;
  }

  function seiteVorlagen() {
    const darf = S.rolle === "SV";
    const gruppen = [...new Set(S.vorlagen.map((v) => v.gruppe || "Weitere"))];
    const karte = (v) => {
      const m = pruefen(v);
      const f = m.filter((x) => x[0] === "fehler").length, w = m.filter((x) => x[0] === "warnung").length;
      const laufend = S.laeufe.filter((l) => l.vorlage === v.id && !l.abgeschlossen).length;
      return `<div class="karte"><div class="small muted">Version ${v.version} · ${v.schritte.length} Schritte · ${laufend} laufend</div><h3><a href="#/vorlage/${v.id}">${esc(v.titel)}</a></h3><p class="small">${esc(v.beschreibung)}</p>
        <div>${v.status === "freigegeben" ? `<span class="badge erfolg">✓ freigegeben</span>` : `<span class="badge warnung">✎ Entwurf</span>`} ${f ? `<span class="badge fehler">✕ ${f} Fehler</span>` : ""} ${w ? `<span class="badge warnung">⚠ ${w} Hinweise</span>` : ""}</div></div>`;
    };
    const karten = gruppen.map((g) => `<h2 class="gruppenkopf">${esc(g)} <span class="small muted">${S.vorlagen.filter((v) => (v.gruppe || "Weitere") === g).length}</span></h2><div class="karten">${S.vorlagen.filter((v) => (v.gruppe || "Weitere") === g).map(karte).join("")}</div>`).join("");
    return `<div class="seitenkopf"><div><h1>Ablaufvorlagen</h1><p class="muted">Vorlagen beschreiben, welche Schritte in welcher Reihenfolge nötig sind, wer zuständig ist und welchen Vorgang jeder Schritt aufruft. Prozessbeschriebe: Schulverwaltung bereitet vor (V), Ressortvorstand gibt frei (E) – Funktionendiagramm 1.1.5.</p></div>
      <div class="aktionen"><button class="btn primaer" data-aktion="vorlage-neu" ${darf ? "" : "disabled title=\"Nur Schulverwaltung (V)\""}>＋ Neue Vorlage</button></div></div>
      <p class="meldung info">Jeder Schritt nennt seine <strong>Quelle</strong> (Gesetz und Paragraf, Merkblatt des Gemeindeamts, Information des Volksschulamts oder interne Grundlage). «ZU PRÜFEN» kennzeichnet gemeindeeigene Regelungen (Gemeindeordnung, Geschäftsordnung, Personalverordnung) und noch nicht verifizierte Paragrafen. Keine Rechtsberatung.</p>${karten}`;
  }

  function seiteVorlage(id, reiter) {
    const v = vorlageVon(id);
    if (!v) return `<h1>Vorlage nicht gefunden</h1>`;
    reiter = reiter || "bild";
    const darf = S.rolle === "SV";
    const m = pruefen(v);
    const fehler = m.filter((x) => x[0] === "fehler");
    const meldungen = m.length ? `<div class="meldung ${fehler.length ? "fehler" : "warnung"}"><strong>${fehler.length ? "✕ Prüfung: nicht freigabebereit" : "⚠ Prüfung: Hinweise"}</strong><ul>${m.map((x) => `<li>${x[0] === "fehler" ? "✕" : "⚠"} ${esc(x[1])}</li>`).join("")}</ul></div>` : `<div class="meldung info">✓ Prüfung ohne Befund: Reihenfolge, Parameter, Platzhalter und Zuständigkeiten passen.</div>`;
    const zeilen = v.schritte.map((s, i) => `<tr>
      <td class="zahl">${i + 1}</td>
      <td><strong>${esc(s.titel)}</strong><div class="small muted">${esc(s.id)}${s.bedingung && s.bedingung.feld ? " · nur wenn " + esc(bedingungText(s.bedingung)) : ""}</div></td>
      <td>${rolleBadge(s.rolle)}${s.fd ? `<div class="small muted">FD ${esc(s.fd)}</div>` : ""}${(s.informiert || []).length ? `<div class="small muted">I: ${s.informiert.map(esc).join(", ")}</div>` : ""}</td>
      <td>${tKurz(s.tage)}<div class="small muted">${relTage(s.tage)}</div></td>
      <td class="small">${(s.nach || []).map((n) => { const q = v.schritte.findIndex((x) => x.id === n); return q >= 0 ? "#" + (q + 1) : esc(n); }).join(", ") || "–"}</td>
      <td>${aufrufText(s)}${s.aktion ? `<div class="param">${Object.entries(s.aktion.param || {}).map(([k, w]) => `${esc(k)}: ${esc(w)}`).join("<br>")}</div>` : ""}</td>
      <td>${s.aktion ? (s.auto ? `<span class="badge violett">◷ automatisch</span>` : `<span class="badge info">● bestätigen</span>`) : `<span class="badge neutral">✋ von Hand</span>`}</td>
      <td class="quelle">${quelleHtml(s.quelle)}</td>
      <td style="white-space:nowrap">${darf ? `<button class="btn klein" data-aktion="schritt-bearbeiten" data-id="${s.id}" aria-label="Bearbeiten">✎</button> <button class="btn klein" data-aktion="schritt-hoch" data-id="${s.id}" aria-label="Nach oben" ${i ? "" : "disabled"}>↑</button> <button class="btn klein" data-aktion="schritt-runter" data-id="${s.id}" aria-label="Nach unten" ${i < v.schritte.length - 1 ? "" : "disabled"}>↓</button> <button class="btn klein gefahr" data-aktion="schritt-loeschen" data-id="${s.id}" aria-label="Löschen">✕</button>` : ""}</td></tr>`).join("");
    const felder = v.felder.map((f) => `<tr><td><code>{${esc(f.key)}}</code></td><td>${esc(f.label)}</td><td>${esc(f.typ)}${f.werte ? `<div class="small muted">${esc(f.werte.join(", "))}</div>` : ""}</td></tr>`).join("");
    return `
      <div class="seitenkopf"><div><div class="small muted"><a href="#/vorlagen">Ablaufvorlagen</a> › ${esc(v.id)}</div><h1>${esc(v.titel)}</h1>
        <p class="muted">Version ${v.version} · ${v.status === "freigegeben" ? `<span class="badge erfolg">✓ freigegeben</span>` : `<span class="badge warnung">✎ Entwurf</span>`} · Stichtag: ${esc(v.stichtag)} · ${esc(v.beschreibung)}</p></div>
        <div class="aktionen">
          ${darf ? `<button class="btn" data-aktion="schritt-neu">＋ Schritt</button>` : ""}
          ${v.status === "entwurf" ? `<button class="btn primaer" data-aktion="freigeben" ${S.rolle === "RV" && !fehler.length ? "" : `disabled title="${S.rolle !== "RV" ? "Freigabe durch Ressortvorstand (E, FD 1.1.5)" : "Erst Fehler beheben"}"`}>✓ Freigeben</button>` : `<a class="btn primaer" href="#/neu/${v.id}">▶ Ablauf starten</a>`}
        </div></div>
      ${darf ? "" : `<p class="meldung info">Bearbeiten kann die Schulverwaltung (V), freigeben der Ressortvorstand (E) – Rolle oben rechts wechseln.</p>`}
      ${v.status === "freigegeben" && darf ? `<p class="small muted">Eine Änderung macht aus der freigegebenen Version ${v.version} einen Entwurf der Version ${v.version + 1}. Laufende Abläufe bleiben auf ihrer Version.</p>` : ""}
      ${meldungen}
      <div class="reiter" role="tablist">
        <button role="tab" aria-selected="${reiter === "bild"}" data-aktion="reiter" data-ziel="#/vorlage/${v.id}/bild">Ablaufbild</button>
        <button role="tab" aria-selected="${reiter === "liste"}" data-aktion="reiter" data-ziel="#/vorlage/${v.id}/liste">Schritte (${v.schritte.length})</button>
        <button role="tab" aria-selected="${reiter === "felder"}" data-aktion="reiter" data-ziel="#/vorlage/${v.id}/felder">Kontextfelder</button>
      </div>
      ${reiter === "bild" ? `${quellenVerzeichnis(v.schritte)}<p class="small muted">Bahnen = verantwortliche Rolle, von links nach rechts = Reihenfolge (Pfeil = «nach»). ${darf ? "Schritt anklicken zum Bearbeiten." : ""} Gestrichelt = nur unter Bedingung.</p>${ablaufbild(v.schritte)}`
        : reiter === "felder" ? `<p class="small muted">Angaben beim Start eines Ablaufs. Sie stehen als Platzhalter in den Parametern zur Verfügung, dazu <code>{stichtag+N}</code>/<code>{stichtag-N}</code> und Ergebnisse früherer Schritte wie <code>{o5.benutzername}</code>.</p><div class="tabelle-wrap"><table><thead><tr><th>Platzhalter</th><th>Bezeichnung</th><th>Typ</th></tr></thead><tbody>${felder}</tbody></table></div>`
        : `<div class="tabelle-wrap"><table><thead><tr><th class="zahl">#</th><th>Schritt</th><th>Wer</th><th>Frist</th><th>Nach</th><th>Aufruf</th><th>Ausführung</th><th>Quelle</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></div>${quellenVerzeichnis(v.schritte)}`}`;
  }

  function seiteVorgaenge() {
    const verwendung = {};
    S.vorlagen.forEach((v) => v.schritte.forEach((s) => { if (s.aktion) (verwendung[s.aktion.vorgang] = verwendung[s.aktion.vorgang] || []).push(v.titel + ": " + s.titel); }));
    const karten = D.MODULE.map((m) => `
      <section class="karte" style="margin-bottom:1rem">
        <div class="bereichskopf" style="margin-top:0"><h2>${wordmark(m.name)} <span class="small muted">${esc(m.aufgabe)}</span></h2>
          <label class="small"><input type="checkbox" data-aktion="erreichbar" data-key="${m.key}" ${S.erreichbar[m.key] ? "checked" : ""}> Modul erreichbar (Simulation)</label></div>
        ${S.erreichbar[m.key] ? "" : `<p class="meldung fehler">✕ Simuliert: EduKSX-${esc(m.name)} antwortet nicht. Automatische Schritte schlagen fehl und erscheinen als Aufgabe beim ICT-Support bzw. der zuständigen Rolle.</p>`}
        <div class="tabelle-wrap"><table><thead><tr><th>Vorgang</th><th>Parameter</th><th>Ergebnis</th><th>Antwort</th><th>Verwendet in</th></tr></thead><tbody>
        ${m.vorgaenge.map((v) => `<tr><td><strong>${esc(v.titel)}</strong><div class="param">${esc(v.id)}</div></td><td class="param">${v.parameter.map(esc).join(", ")}</td><td class="param">${v.ergebnis.map(esc).join(", ")}</td><td>${v.art === "sofort" ? `<span class="badge erfolg">sofort</span>` : `<span class="badge warnung">⧗ mit Rückmeldung</span>`}</td><td class="small">${(verwendung[v.id] || []).length ? `<details><summary>${verwendung[v.id].length} Schritt(e)</summary>${verwendung[v.id].map(esc).join("<br>")}</details>` : `<span class="muted">–</span>`}</td></tr>`).join("")}
        </tbody></table></div></section>`).join("");
    return `<div class="seitenkopf"><div><h1>Vorgänge der Module</h1><p class="muted">${wordmark("Flow")} enthält keine Fachlogik. Jedes Modul meldet im Vorgangsregister, welche Vorgänge es anbietet, welche Parameter es braucht und was es zurückgibt. Ein Schritt ruft genau einen Vorgang auf; Ergebnisse (z. B. der Benutzername aus EduKSX-Ident) stehen späteren Schritten als Platzhalter zur Verfügung.</p></div></div>
      <p class="meldung info"><strong>Zwei Antwortarten:</strong> «sofort» – der Schritt ist mit dem Aufruf erledigt. «Mit Rückmeldung» – das Modul nimmt den Auftrag an und meldet später (z. B. Unterschrift eingegangen, Lieferung da); bis dahin wartet der Schritt.</p>${karten}`;
  }

  function seiteFunktionendiagramm() {
    const sp = ["SPF", "SPr", "RV", "SL", "HD", "SV", "LP", "ICT"];
    const verwendung = {};
    S.vorlagen.forEach((v) => v.schritte.forEach((s) => { if (s.fd) (verwendung[s.fd] = verwendung[s.fd] || []).push(`${v.titel}: ${s.titel} (${s.rolle})`); }));
    const zeilen = D.FUNKTIONENDIAGRAMM.map((f) => `<tr><td>${esc(f.nr)}</td><td>${esc(f.titel)}</td>${sp.map((r) => `<td class="fd ${f.rollen[r] && /[EV]/.test(f.rollen[r]) ? "lead" : ""}">${esc(f.rollen[r] || "")}</td>`).join("")}<td class="small">${(verwendung[f.nr] || []).map(esc).join("<br>") || `<span class="muted">–</span>`}</td></tr>`).join("");
    return `<div class="seitenkopf"><div><h1>Funktionendiagramm</h1><p class="muted">Auszug (Muster) mit den Aufgaben, die Abläufe im Personalbereich berühren. Ist einem Schritt eine Nummer zugeordnet, schlägt ${wordmark("Flow")} die Rolle mit «V» als verantwortlich und die Rollen mit «I» als zu informieren vor und warnt bei Abweichungen.</p></div></div>
      <p class="small muted">E = Entscheid · V = operativer Lead · M = Mitwirkung · C = Controlling · I = wird informiert</p>
      <div class="tabelle-wrap"><table><thead><tr><th>Nr.</th><th>Aufgabe</th>${sp.map((r) => `<th title="${esc(ROLLEN[r])}">${esc(r)}</th>`).join("")}<th>Verwendet in Schritten</th></tr></thead><tbody>${zeilen}</tbody></table></div>`;
  }

  function protokollTabelle(liste) {
    if (!liste.length) return `<p class="muted">Noch keine Aufrufe.</p>`;
    const st = { ok: "erfolg", "angenommen": "warnung", "rückmeldung": "erfolg", fehler: "fehler" };
    return `<div class="tabelle-wrap"><table><thead><tr><th>Wann</th><th>Ablauf</th><th>Schritt</th><th>Vorgang</th><th>Parameter</th><th>Antwort</th></tr></thead><tbody>${liste.map((a) => `<tr>
      <td class="small">${datumKurz(a.tag)}<div class="muted">${esc(a.uhr)}</div></td><td class="small"><a href="#/lauf/${a.lauf}">${esc(a.person)}</a></td><td class="small">${esc(a.titel)}</td>
      <td class="param">${esc(a.vorgang)}</td><td class="param">${Object.entries(a.param).map(([k, w]) => `${esc(k)}: ${esc(w)}`).join("<br>")}</td>
      <td><span class="badge ${st[a.status] || "neutral"}">${esc(a.status)}</span><div class="param">${typeof a.antwort === "object" ? Object.entries(a.antwort).map(([k, w]) => `${esc(k)}: ${esc(w)}`).join("<br>") : esc(a.antwort)}</div></td></tr>`).join("")}</tbody></table></div>`;
  }
  function seiteProtokoll() {
    return `<div class="seitenkopf"><div><h1>Aufrufprotokoll</h1><p class="muted">Jeder Aufruf an ein Modul mit aufgelösten Parametern und Antwort – nachvollziehbar, wer was wann ausgelöst hat (Vorbereitung digitale Aktenführung).</p></div></div>${protokollTabelle(S.aufrufe)}`;
  }

  // ---------------------------------------------------------------- Schritt bearbeiten (Dialog)
  let EDIT = null;
  function editorOeffnen(vid, sid) {
    const v = vorlageVon(vid);
    if (S.rolle !== "SV") { ansage("Bearbeiten nur als Schulverwaltung."); return; }
    const s = sid ? kopie(v.schritte.find((x) => x.id === sid)) : { id: neueId(v), titel: "", rolle: "SV", tage: 0, nach: [], aktion: null, auto: false, informiert: [], bedingung: null, fd: "", quelle: "" };
    EDIT = { vid, neu: !sid, s };
    dialogZeichnen();
  }
  function neueId(v) {
    const p = v.id.charAt(0);
    let n = v.schritte.length + 1;
    while (v.schritte.some((x) => x.id === p + n)) n++;
    return p + n;
  }
  function dialogZeichnen() {
    const v = vorlageVon(EDIT.vid), s = EDIT.s;
    let dlg = document.getElementById("dlg");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "dlg"; document.body.appendChild(dlg); }
    const modul = s.aktion ? (modulVon(s.aktion.vorgang) || {}).key : "";
    const vg = s.aktion ? vorgang(s.aktion.vorgang) : null;
    const fd = fdEintrag(s.fd);
    const andere = v.schritte.filter((x) => x.id !== s.id);
    const platzhalter = ["{" + v.felder.map((f) => f.key).join("} {") + "}", "{stichtag-7}", ...andere.filter((x) => x.aktion && vorgang(x.aktion.vorgang)).flatMap((x) => vorgang(x.aktion.vorgang).ergebnis.map((e) => `{${x.id}.${e}}`))];
    const b = s.bedingung || { feld: "", op: "=", wert: "" };
    dlg.innerHTML = `
      <form method="dialog" class="editor" data-glossary-ignore>
        <h2>${EDIT.neu ? "Neuer Schritt" : "Schritt bearbeiten"} <span class="small muted">${esc(s.id)} · ${esc(v.titel)}</span></h2>
        <label class="feld">Bezeichnung<input type="text" data-e="titel" value="${esc(s.titel)}" required style="width:100%"></label>
        <label class="feld" style="margin-top:.5rem">Quelle (Gesetz, Paragraf, Merkblatt, interne Grundlage)<input type="text" data-e="quelle" value="${esc(s.quelle || "")}" placeholder="z. B. GG § 18 Abs. 2; Checkliste GV" style="width:100%"></label>
        <fieldset><legend>Zuständigkeit</legend>
          <div class="formzeile">
            <label class="feld">Funktionendiagramm<select data-e="fd"><option value="">– keine Zuordnung –</option>${D.FUNKTIONENDIAGRAMM.map((f) => `<option value="${f.nr}" ${f.nr === s.fd ? "selected" : ""}>${esc(f.nr + " " + f.titel)}</option>`).join("")}</select></label>
            <label class="feld">Verantwortlich<select data-e="rolle">${Object.entries(ROLLEN).map(([k, n]) => `<option value="${k}" ${k === s.rolle ? "selected" : ""}>${esc(n)}${fd && fd.rollen[k] ? " (" + fd.rollen[k] + ")" : ""}</option>`).join("")}</select></label>
          </div>
          ${fd ? `<p class="small muted">FD ${esc(fd.nr)}: ${Object.entries(fd.rollen).map(([r, z]) => `${esc(r)} ${esc(z)}`).join(" · ")} – Vorschlag übernommen: V → verantwortlich, I → informieren.</p>` : ""}
          <div class="small">Informieren (I): ${Object.keys(ROLLEN).map((r) => `<label class="chip"><input type="checkbox" data-e="informiert" value="${r}" ${(s.informiert || []).includes(r) ? "checked" : ""}> ${esc(r)}</label>`).join(" ")}</div>
        </fieldset>
        <fieldset><legend>Zeitpunkt und Reihenfolge</legend>
          <div class="formzeile"><label class="feld">Frist in Tagen zum Stichtag (${esc(v.stichtag)})<input type="number" data-e="tage" value="${s.tage}"></label><span class="small muted" style="align-self:center">${relTage(Number(s.tage))} · negativ = vorher</span></div>
          <div class="small">Erst nach: ${andere.map((x) => `<label class="chip"><input type="checkbox" data-e="nach" value="${x.id}" ${(s.nach || []).includes(x.id) ? "checked" : ""}> ${esc(kuerzen(x.titel, 34))}</label>`).join(" ") || "–"}</div>
        </fieldset>
        <fieldset><legend>Aufruf</legend>
          <div class="formzeile">
            <label class="feld">Modul<select data-e="modul"><option value="">✋ von Hand (kein Aufruf)</option>${D.MODULE.map((m) => `<option value="${m.key}" ${m.key === modul ? "selected" : ""}>EduKSX-${esc(m.name)}</option>`).join("")}</select></label>
            ${modul ? `<label class="feld">Vorgang<select data-e="vorgang">${D.MODULE.find((m) => m.key === modul).vorgaenge.map((x) => `<option value="${x.id}" ${vg && x.id === vg.id ? "selected" : ""}>${esc(x.titel)}</option>`).join("")}</select></label>` : ""}
          </div>
          ${vg ? `<div class="formzeile">${vg.parameter.map((p) => `<label class="feld">${esc(p)}<input type="text" data-e="param" data-p="${p}" value="${esc((s.aktion.param || {})[p] || "")}" list="ph-liste"></label>`).join("")}</div>
            <datalist id="ph-liste">${platzhalter.map((p) => `<option value="${esc(p)}">`).join("")}</datalist>
            <p class="small muted">Platzhalter: ${platzhalter.map((p) => `<code>${esc(p)}</code>`).join(" ")} · Ergebnis: ${vg.ergebnis.map((e) => `<code>{${esc(s.id)}.${esc(e)}}</code>`).join(" ")} · Antwort ${vg.art === "sofort" ? "sofort" : "mit Rückmeldung"}</p>
            <label class="small"><input type="checkbox" data-e="auto" ${s.auto ? "checked" : ""}> Automatisch aufrufen, sobald Vorgänger erledigt und Frist erreicht (sonst bestätigt die verantwortliche Rolle)</label>` : `<p class="small muted">Aufgabe ohne Aufruf: Die verantwortliche Rolle meldet sie als erledigt.</p>`}
        </fieldset>
        <fieldset><legend>Bedingung (optional)</legend>
          <div class="formzeile">
            <label class="feld">Feld<select data-e="b-feld"><option value="">– immer ausführen –</option>${v.felder.map((f) => `<option value="${f.key}" ${f.key === b.feld ? "selected" : ""}>${esc(f.label)}</option>`).join("")}</select></label>
            <label class="feld">Vergleich<select data-e="b-op">${["=", "≠", "<", ">", "in"].map((o) => `<option ${o === b.op ? "selected" : ""}>${o}</option>`).join("")}</select></label>
            <label class="feld">Wert<input type="text" data-e="b-wert" value="${esc(b.wert)}" placeholder="z. B. Klassenlehrperson"></label>
          </div><p class="small muted">«in»: Werte mit Komma trennen. Wert kann ein Platzhalter sein, z. B. <code>{pensumAlt}</code>.</p>
        </fieldset>
        <div class="formzeile" style="justify-content:flex-end;margin-top:1rem">
          <button class="btn" value="abbrechen" data-aktion="dlg-abbrechen">Abbrechen</button>
          <button class="btn primaer" value="ok" data-aktion="dlg-speichern">Übernehmen</button>
        </div>
      </form>`;
    if (!dlg.open) dlg.showModal();
  }
  function dialogLesen(ausloeser) {
    const dlg = document.getElementById("dlg");
    const q = (k) => dlg.querySelector(`[data-e="${k}"]`);
    const s = EDIT.s;
    s.titel = q("titel").value;
    s.quelle = q("quelle").value.trim();
    s.tage = Number(q("tage").value || 0);
    s.rolle = q("rolle").value;
    s.informiert = [...dlg.querySelectorAll('[data-e="informiert"]:checked')].map((x) => x.value);
    s.nach = [...dlg.querySelectorAll('[data-e="nach"]:checked')].map((x) => x.value);
    const fdNeu = q("fd").value;
    if (ausloeser === "fd" && fdNeu) {
      const f = fdEintrag(fdNeu);
      const lead = Object.entries(f.rollen).find(([, z]) => /V/.test(z)) || Object.entries(f.rollen).find(([, z]) => /E/.test(z));
      if (lead) s.rolle = lead[0];
      s.informiert = Object.entries(f.rollen).filter(([, z]) => /I/.test(z) && !/V/.test(z)).map(([r]) => r);
    }
    s.fd = fdNeu;
    const modul = q("modul").value;
    if (!modul) { s.aktion = null; s.auto = false; }
    else {
      const m = D.MODULE.find((x) => x.key === modul);
      let vid = q("vorgang") && ausloeser !== "modul" ? q("vorgang").value : m.vorgaenge[0].id;
      if (!m.vorgaenge.some((x) => x.id === vid)) vid = m.vorgaenge[0].id;
      const alt = s.aktion && s.aktion.vorgang === vid ? s.aktion.param : {};
      const param = {};
      vorgang(vid).parameter.forEach((p) => { const i = dlg.querySelector(`[data-e="param"][data-p="${p}"]`); param[p] = i && s.aktion && s.aktion.vorgang === vid ? i.value : (alt[p] || (p === "person" ? "{person}" : p === "konto" ? "{person}" : "")); });
      s.aktion = { vorgang: vid, param };
      s.auto = q("auto") ? q("auto").checked : false;
    }
    const bf = q("b-feld").value;
    s.bedingung = bf ? { feld: bf, op: q("b-op").value, wert: q("b-wert").value } : null;
  }
  function dialogSpeichern() {
    dialogLesen();
    const v = vorlageVon(EDIT.vid);
    if (!EDIT.s.titel.trim()) { ansage("Bezeichnung fehlt."); return false; }
    entwurfMachen(v);
    const i = v.schritte.findIndex((x) => x.id === EDIT.s.id);
    if (i >= 0) v.schritte[i] = EDIT.s; else v.schritte.push(EDIT.s);
    EDIT = null;
    return true;
  }
  function entwurfMachen(v) {
    if (v.status === "freigegeben") { v.status = "entwurf"; v.version += 1; ansage(`Vorlage ist jetzt Entwurf Version ${v.version}.`); }
  }

  // ---------------------------------------------------------------- EduKSX-Glossary (feste Version mit Prüfsumme, wie EduKSX-Staffing)
  const GLOSSAR = {
    src: "https://glossary.eduksx.ch/embed/v1.0.0/glossary.js",
    integrity: "sha384-1mCvqROb5QPmHVzczuZc5aX4LLhtgGihVfRPA1jWZLfWdqNo5CRCNX9ggamRAS8x",
    bereiche: "main .seitenkopf p, main .meldung, main p.small, main .karte > p, main section > p",
  };
  const glossarAn = () => { try { return localStorage.getItem("eduksx-glossar") !== "aus"; } catch (e) { return true; } };
  function glossarLaden() {
    if (!glossarAn() || document.getElementById("eduksx-glossary")) return;
    const sc = document.createElement("script");
    sc.id = "eduksx-glossary"; sc.src = GLOSSAR.src; sc.integrity = GLOSSAR.integrity; sc.crossOrigin = "anonymous";
    sc.dataset.scope = "none"; sc.dataset.max = "1000000"; sc.dataset.names = "true"; sc.dataset.categories = "Behörden,Personal";
    document.head.appendChild(sc);
  }
  function glossarErklaeren() {
    if (!glossarAn()) return;
    const go = () => {
      if (!window.EduksxGlossary) return false;
      const laeufe = [];
      document.querySelectorAll(GLOSSAR.bereiche).forEach((el) => { if (!el.closest("[data-glossary-ignore], table, nav, header")) laeufe.push(window.EduksxGlossary.scan(el)); });
      Promise.all(laeufe).then(() => {
        const gesehen = new Set();
        document.querySelectorAll("main .gls-term").forEach((m) => { const k = m.dataset.glsCodes || m.textContent; if (!gesehen.has(k)) { gesehen.add(k); return; } m.replaceWith(document.createTextNode(m.textContent)); });
      }).catch(() => {});
      return true;
    };
    if (!go()) { let n = 0; const t = setInterval(() => { if (go() || ++n > 40) clearInterval(t); }, 250); }
  }

  // ---------------------------------------------------------------- Steuerung
  function ansage(t) { const a = document.getElementById("ansage"); if (a) a.textContent = t; document.querySelectorAll(".toast").forEach((x) => x.remove()); const z = document.createElement("div"); z.className = "toast"; z.setAttribute("role", "status"); z.textContent = t; document.body.appendChild(z); setTimeout(() => z.remove(), 3200); }
  /** Rückfrage im eigenen Dialog (Browser-Rückfragen sind in eingebetteten Ansichten gesperrt). */
  function frage(text, jaText, ja) {
    let d = document.getElementById("frage");
    if (!d) { d = document.createElement("dialog"); d.id = "frage"; document.body.appendChild(d); }
    d.innerHTML = `<p style="white-space:pre-line">${esc(text)}</p><div class="formzeile" style="justify-content:flex-end"><button class="btn" data-frage="nein">Abbrechen</button><button class="btn primaer" data-frage="ja">${esc(jaText)}</button></div>`;
    d.onclick = (ev) => { const b = ev.target.closest("[data-frage]"); if (!b) return; d.close(); if (b.dataset.frage === "ja") ja(); };
    d.showModal();
  }
  function route() { return (location.hash || "#/uebersicht").slice(2).split("/"); }
  function render() {
    const [seite, a, b] = route();
    const inhalt = {
      uebersicht: seiteUebersicht, aufgaben: seiteAufgaben, laeufe: seiteLaeufe, lauf: () => seiteLauf(a, b), neu: () => seiteNeu(a),
      vorlagen: seiteVorlagen, vorlage: () => seiteVorlage(a, b), kalender: () => KAL.seite(a), vorgaenge: seiteVorgaenge, funktionendiagramm: seiteFunktionendiagramm, protokoll: seiteProtokoll,
    }[seite] || seiteUebersicht;
    document.getElementById("app").innerHTML = rahmen(seite, inhalt());
    document.title = "EduKSX-Flow (Prototyp)";
    glossarErklaeren();
  }
  function weiter() { motor(); speichern(); render(); }

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-aktion]");
    if (!el || el.disabled) return;
    const ak = el.dataset.aktion;
    const [seite, a] = route();
    const l = el.dataset.lauf ? laufVon(el.dataset.lauf) : null;
    const s = l ? l.schritte.find((x) => x.id === el.dataset.id) : null;
    switch (ak) {
      case "zeit": S.heute = addTage(S.heute, Number(el.dataset.tage)); weiter(); ansage("Simulierter Tag: " + datum(S.heute)); break;
      case "naechste-frist": {
        const kandidaten = [];
        S.laeufe.forEach((x) => x.schritte.forEach((y) => { if (!ERLEDIGT.includes(y.status)) { const f = fristVon(x, y); if (f > S.heute) kandidaten.push(f); } }));
        if (!kandidaten.length) { ansage("Keine weitere Frist."); break; }
        S.heute = kandidaten.sort()[0]; weiter(); ansage("Simulierter Tag: " + datum(S.heute)); break;
      }
      case "thema": document.documentElement.classList.toggle("dark"); try { localStorage.setItem("eduksx-thema", document.documentElement.classList.contains("dark") ? "dunkel" : "hell"); } catch (e) { /* */ } render(); break;
      case "glossar": try { localStorage.setItem("eduksx-glossar", glossarAn() ? "aus" : "an"); } catch (e) { /* */ } if (glossarAn()) { glossarLaden(); render(); } else location.reload(); break;
      case "zuruecksetzen": frage("Alle Änderungen verwerfen und Testdaten neu laden?", "Testdaten laden", () => { S = neuerZustand(); speichern(); location.hash = "#/uebersicht"; render(); }); break;
      case "reiter": location.hash = el.dataset.ziel; break;
      case "ausfuehren": ausfuehren(l, s, ROLLEN[S.rolle]); weiter(); ansage(`«${s.titel}»: ${STATUS[s.status][2]}.`); break;
      case "jetzt": ausfuehren(l, s, ROLLEN[S.rolle] + ", vorgezogen"); weiter(); break;
      case "rueckmeldung": rueckmeldung(l, s); weiter(); ansage(`Rückmeldung zu «${s.titel}» eingegangen.`); break;
      case "nochmals": s.fehler = null; s.status = "wartet"; if (!s.auto) ausfuehren(l, s, ROLLEN[S.rolle] + ", erneut"); weiter(); ansage(`«${s.titel}»: ${STATUS[s.status][2]}.`); break;
      case "starten": {
        const v = vorlageVon(el.dataset.vorlage);
        const lauf = laufAnlegen(v, START_EINGABE[v.id]);
        if (START_EREIGNIS[v.id]) { lauf.ereignis = START_EREIGNIS[v.id].key; lauf.ereignisTitel = START_EREIGNIS[v.id].titel; }
        delete START_EINGABE[v.id];
        delete START_EREIGNIS[v.id];
        motor(); speichern(); location.hash = "#/lauf/" + lauf.id; ansage("Ablauf gestartet."); break;
      }
      case "vorlage-neu": {
        const id = "vorlage-" + S.zaehler++;
        S.vorlagen.push({ id, gruppe: "Weitere", titel: "Neue Ablaufvorlage", version: 1, status: "entwurf", stichtag: "Stichtag", beschreibung: "Noch zu beschreiben.",
          felder: [{ key: "person", label: "Name", typ: "text" }, { key: "funktion", label: "Funktion", typ: "auswahl", werte: D.FUNKTIONEN }, { key: "stichtag", label: "Stichtag", typ: "datum" }], schritte: [] });
        speichern(); location.hash = "#/vorlage/" + id + "/liste"; break;
      }
      case "schritt-neu": editorOeffnen(a); break;
      case "schritt-bearbeiten": if (seite === "vorlage") editorOeffnen(a, el.dataset.id); break;
      case "schritt-hoch": case "schritt-runter": {
        const v = vorlageVon(a); const i = v.schritte.findIndex((x) => x.id === el.dataset.id); const j = ak === "schritt-hoch" ? i - 1 : i + 1;
        entwurfMachen(v); [v.schritte[i], v.schritte[j]] = [v.schritte[j], v.schritte[i]]; speichern(); render(); break;
      }
      case "schritt-loeschen": {
        const v = vorlageVon(a); const x = v.schritte.find((y) => y.id === el.dataset.id);
        const abh = v.schritte.filter((y) => (y.nach || []).includes(x.id));
        frage(`Schritt «${x.titel}» aus der Vorlage löschen?${abh.length ? `\n\nFolgende Schritte warten auf ihn; sie übernehmen seine Vorgänger:\n– ${abh.map((y) => y.titel).join("\n– ")}` : ""}`, "Schritt löschen", () => {
          entwurfMachen(v); v.schritte = v.schritte.filter((y) => y.id !== x.id); abh.forEach((y) => { y.nach = y.nach.filter((n) => n !== x.id).concat(x.nach.filter((n) => !y.nach.includes(n))); });
          speichern(); render();
        });
        break;
      }
      case "freigeben": { const v = vorlageVon(a); v.status = "freigegeben"; speichern(); render(); ansage(`Version ${v.version} freigegeben.`); break; }
      case "dlg-abbrechen": ev.preventDefault(); document.getElementById("dlg").close(); EDIT = null; break;
      case "dlg-speichern": ev.preventDefault(); if (dialogSpeichern()) { document.getElementById("dlg").close(); speichern(); render(); } break;
      default: KAL.klick(ak, el); break;
    }
  });
  document.addEventListener("keydown", (ev) => {
    const el = ev.target.closest && ev.target.closest('g[data-aktion="schritt-bearbeiten"]');
    if (el && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target;
    if (el.dataset.e && EDIT && ["fd", "modul", "vorgang", "b-feld"].includes(el.dataset.e)) { dialogLesen(el.dataset.e); dialogZeichnen(); return; }
    if (el.dataset.e === "tage" && EDIT) { dialogLesen(); dialogZeichnen(); return; }
    const ak = el.dataset.aktion;
    if ((ak && ak.startsWith("kal-")) || el.dataset.neuZeichnen) { KAL.aenderung(ak || "", el); return; }
    if (ak === "rolle") { S.rolle = el.value; speichern(); render(); ansage("Rolle: " + ROLLEN[S.rolle]); }
    if (ak === "erreichbar") { S.erreichbar[el.dataset.key] = el.checked; weiter(); }
    if (ak === "start-vorlage") location.hash = "#/neu/" + el.value;
    if (ak === "start-feld") {
      const [, vid] = route();
      const v = vorlageVon(vid) || S.vorlagen.find((x) => x.status === "freigegeben");
      const f = v.felder.find((x) => x.key === el.dataset.key);
      START_EINGABE[v.id][el.dataset.key] = f && f.typ === "zahl" ? Number(el.value) : el.value;
      render();
    }
  });
  document.addEventListener("close", (ev) => { if (ev.target.id === "dlg") EDIT = null; }, true);
  window.addEventListener("hashchange", () => { render(); const m = document.getElementById("inhalt"); if (m) m.focus(); });

  const KAL = window.FLOW_KALENDER({
    D, esc, addTage, tageZwischen, datumKurz, kopie, rolleBadge, ansage, frage, ROLLEN,
    S: () => S, vorlageVon, fortschritt, speichern, render, startVorbereiten,
  });
  S = laden() || neuerZustand();
  try { if (localStorage.getItem("eduksx-thema") === "dunkel") document.documentElement.classList.add("dark"); } catch (e) { /* */ }
  motor();
  speichern();
  glossarLaden();
  render();
})();
