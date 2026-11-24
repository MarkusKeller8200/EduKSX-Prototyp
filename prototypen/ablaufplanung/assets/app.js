/*
 * EduKSX-Flow – Klickprototyp Ablaufplanung (ohne Abhängigkeiten, ohne Server).
 * Abläufe werden als Schritte geplant; jeder Schritt ruft einen Vorgang auf, den ein anderes EduKSX-Modul im
 * Vorgangsregister anbietet. Die Aufrufe sind simuliert. Zustand im Speicher, im Browser gesichert (localStorage).
 */
(function () {
  "use strict";

  const SPEICHER = "eduksx-flow-prototyp-v6";
  const VERSION = "0.13.0";
  const EINSTIEG = "https://markuskeller8200.github.io/EduKSX-Prototyp/"; // übergeordnete Einstiegsseite aller Prototypen
  const D = window.FLOW_DATEN;
  const ROLLEN = D.ROLLEN;
  const ROLLEN_PROTOTYP = Object.keys(ROLLEN); // Rollenwechsel oben rechts nur für diese Rollen

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
  const datum = (iso) => (iso ? esc(new Date(iso + "T12:00:00Z").toLocaleDateString("de-CH", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })) : "–");
  const datumKurz = (iso) => (iso ? esc(new Date(iso + "T12:00:00Z").toLocaleDateString("de-CH")) : "–");
  const relTage = (n) => { n = Number(n) || 0; return esc(n === 0 ? "am Stichtag" : n < 0 ? `${-n} Tage vorher` : `${n} Tage nachher`); };
  const tKurz = (n) => { n = Number(n) || 0; return esc(n === 0 ? "T" : n < 0 ? `T−${-n}` : `T+${n}`); };
  const slug = (t) => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

  const alleVorgaenge = () => D.MODULE.flatMap((m) => m.vorgaenge.map((v) => Object.assign({ modul: m }, v)));
  const vorgang = (id) => alleVorgaenge().find((v) => v.id === id);
  const modulVon = (id) => D.MODULE.find((m) => id && id.startsWith(m.key + "."));
  const fdListe = () => (S && S.fd) || D.FUNKTIONENDIAGRAMM;
  const fdEintrag = (nr) => fdListe().find((f) => f.nr === nr);
  const FD_SPALTEN = ["SPF", "SPr", "RV", "SL", "HD", "SV", "LP", "ICT"];

  // ---------------------------------------------------------------- Zustand
  function neuerZustand() {
    const st = {
      rolle: "SV",
      heute: isoHeute(),
      vorlagen: kopie(D.VORLAGEN),
      laeufe: [],
      aufrufe: [],
      hinweise: [],
      ausloesungen: [],
      ausgeloest: {},
      einstellungen: kopie(window.FLOW_EINSTELLUNGEN_DATEN),
      fd: kopie(D.FUNKTIONENDIAGRAMM),
      vertretungen: kopie(D.VERTRETUNGEN || []).map((v) => Object.assign(v, { von: addTage(isoHeute(), v.vonTage), bis: addTage(isoHeute(), v.bisTage) })),
      fdSpalten: FD_SPALTEN.slice(),
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
      const lauf = laufAnlegen(v, Object.assign(startVorgabe(v), l.kontext, { stichtag: addTage(st.heute, l.tageBisStichtag) }), true);
      st.ausgeloest[startSchluessel(v, lauf.kontext)] = lauf.id;
      journal(lauf, "Start", "Testablauf (Vorgeschichte nachgebildet).", "", "Flow");
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
    ausloeserKalender();
    motor();
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
  const uhr = () => new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });

  // Aufgabentypen (Konzept 3.1). Ohne Angabe: mit Vorgang = Aufruf, sonst Aufgabe.
  const TYPEN = {
    aufgabe: ["✋", "Aufgabe", "Die zuständige Rolle meldet die Aufgabe als erledigt."],
    aufruf: ["⚙", "Aufruf an Modul", "Flow ruft einen Vorgang eines anderen Moduls auf."],
    genehmigung: ["⚖", "Genehmigung", "Die zuständige Rolle genehmigt oder lehnt ab (Ablehnung mit Begründung)."],
    entscheidung: ["◇", "Entscheidung", "Die zuständige Rolle wählt eine der Möglichkeiten; spätere Schritte können davon abhängen."],
    nachweis: ["📎", "Nachweis", "Ein Dokument bzw. eine Referenz muss hinterlegt werden."],
    termin: ["📅", "Termin", "Termin festhalten (Datum, Ort)."],
    warten: ["⏳", "Warten bis Frist", "Flow wartet bis zur Frist (z. B. Rekursfrist); niemand muss handeln."],
    benachrichtigung: ["✉", "Benachrichtigung", "Flow informiert die Rollen zur Frist, ohne Modulaufruf."],
    unterprozess: ["⧉", "Unterprozess", "Flow startet eine andere freigegebene Vorlage und wartet auf deren Abschluss."],
  };
  const TYP_ERGEBNIS = { aufgabe: [], genehmigung: ["entscheid", "begruendung"], entscheidung: ["wahl"], nachweis: ["nachweis"], termin: ["termin", "ort"], warten: [], benachrichtigung: [], unterprozess: ["ablauf"] };
  const typVon = (s) => s.typ || (s.aktion ? "aufruf" : "aufgabe");
  function ergebnisFelder(s) {
    const t = typVon(s);
    if (t === "aufruf") { const v = s.aktion && vorgang(s.aktion.vorgang); return v ? v.ergebnis : []; }
    return TYP_ERGEBNIS[t] || [];
  }
  const FRISTARTEN = { intern: ["", "interne Frist"], gesetzlich: ["§", "gesetzliche Frist"], empfehlung: ["≈", "Empfehlung"] };
  const istRef = (b) => !!(b && b.feld && b.feld.includes("."));
  let NOCHMALS = false; // ein weiterer Motorlauf ist nötig (neuer Unterprozess, Abschluss)

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

  function bedingungWert(b, lauf) {
    if (istRef(b)) {
      const [sid, f] = b.feld.split(".");
      const q = lauf.schritte.find((x) => x.id === sid);
      return q && q.ergebnis ? q.ergebnis[f] : undefined;
    }
    return lauf.kontext[b.feld];
  }
  function bedingungErfuellt(b, lauf) {
    if (!b || !b.feld) return true;
    const ist = bedingungWert(b, lauf);
    if (ist === undefined && istRef(b)) return false;
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
  /** Lesbare Bedingung; mit Schrittliste wird ein Verweis auf ein Ergebnis mit dem Schritttitel gezeigt. */
  function bedingungText(b, schritte) {
    if (!b || !b.feld) return "";
    let feld = b.feld;
    if (istRef(b) && schritte) {
      const [sid, f] = b.feld.split(".");
      const q = schritte.find((x) => x.id === sid);
      if (q) feld = `${{ entscheid: "Entscheid", wahl: "Wahl" }[f] || f} «${q.titel}»`;
    }
    return `${feld} ${b.op === "in" ? "ist eines von" : b.op} ${b.wert}`;
  }

  function journal(lauf, art, text, grund, wer) {
    (lauf.journal = lauf.journal || []).unshift({ tag: S.heute, uhr: uhr(), wer: wer || ROLLEN[S.rolle], art, text, grund: grund || "" });
  }

  function laufAnlegen(v, kontext, still) {
    const lauf = {
      id: "L" + String(S.zaehler++).padStart(3, "0"),
      vorlage: v.id, version: v.version, titel: v.titel, stichtagName: v.stichtag,
      kontext: kopie(kontext), gestartet: S.heute, abgeschlossen: null, abgebrochen: null, pausiert: false, journal: [],
      schritte: kopie(v.schritte).map((x) => Object.assign(x, { status: "wartet", ergebnis: null, erledigtAm: null, param: null, eskaliert: [] })),
      pv: kopie(v.prozessverantwortlich || D.PROZESSVERANTWORTLICH || []),
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
      id: "A" + String(S.aufrufe.length + 1).padStart(4, "0"), tag: S.heute, uhr: uhr(),
      lauf: lauf.id, schritt: sch.id, titel: sch.titel, person: lauf.kontext.person,
      vorgang: sch.aktion ? sch.aktion.vorgang : "", param: sch.param || {}, status, antwort,
    });
  }

  /** Stellvertretungen, die heute gelten (Stufe 2). */
  const vertretungenHeute = () => (S.vertretungen || []).filter((v) => v.von <= S.heute && S.heute <= v.bis);
  const vertretungVon = (r) => vertretungenHeute().filter((v) => v.rolle === r).map((v) => v.vertretung);
  const vertritt = (r) => vertretungenHeute().some((v) => v.rolle === r && v.vertretung === S.rolle);
  /** Wer muss bei einem Schritt jetzt handeln? Mehrfachgenehmigung: alle ohne Stimme; Delegation: ausführende Rolle. */
  function handelnde(s) {
    if (typVon(s) === "genehmigung" && s.mehrfach && (s.mehrfach.rollen || []).length) return s.mehrfach.rollen.filter((r) => !(s.stimmen || {})[r]);
    return [s.ausfuehrend || s.rolle];
  }
  /** Für welche Rolle handelt die angemeldete Rolle bei diesem Schritt (selbst oder in Vertretung)? */
  function handeltFuer(s) {
    const h = handelnde(s);
    if (h.includes(S.rolle)) return S.rolle;
    return h.find((r) => vertritt(r)) || ((D.EXTERN || []).find((r) => h.includes(r)) || null);
  }
  function hinweis(rollen, lauf, text) {
    [...new Set(rollen || [])].forEach((r) => {
      S.hinweise.unshift({ rolle: r, tag: S.heute, lauf: lauf.id, text });
      vertretungVon(r).forEach((v) => S.hinweise.unshift({ rolle: v, tag: S.heute, lauf: lauf.id, text: `In Vertretung für ${ROLLEN[r] || r}: ${text}` }));
    });
    S.hinweise = S.hinweise.slice(0, 300);
  }

  function abschliessen(lauf, sch, durch) {
    sch.status = "erledigt";
    sch.erledigtAm = S.heute;
    sch.fehler = null;
    if (!sch.ergebnis) sch.ergebnis = ergebnisErzeugen(lauf, sch);
    if (sch.informiert && sch.informiert.length) hinweis(sch.informiert, lauf, `${lauf.kontext.person}: «${sch.titel}» erledigt${durch ? " (" + durch + ")" : ""}.`);
  }

  /**
   * Schritt ausführen. Aufruf: Vorgang im Zielmodul aufrufen (simuliert). Andere Arten: mit den Angaben aus dem
   * Erledigen-Dialog abschliessen (Entscheid, Wahl, Nachweis, Termin).
   */
  function ausfuehren(lauf, sch, durch, eingabe) {
    const t = typVon(sch);
    if (t === "genehmigung" && eingabe && eingabe.entscheid && genehmigungStimme(lauf, sch, durch, eingabe)) return;
    if (t !== "aufruf") {
      if (t === "benachrichtigung") { benachrichtigen(lauf, sch, durch); return; }
      sch.ergebnis = eingabe && Object.keys(eingabe).length ? kopie(eingabe) : { erledigt: "ja" };
      abschliessen(lauf, sch, durch);
      if (t === "genehmigung" || t === "entscheidung") journal(lauf, "Entscheid", `«${sch.titel}»: ${sch.ergebnis.entscheid || sch.ergebnis.wahl}`, sch.ergebnis.begruendung, durch);
      return;
    }
    if (!sch.aktion) { sch.status = "fehler"; sch.fehler = "Kein Vorgang hinterlegt."; return; }
    const v = vorgang(sch.aktion.vorgang);
    sch.param = Object.fromEntries(Object.entries(sch.aktion.param || {}).map(([k, w]) => [k, aufloesen(w, lauf, k === "datum" || k === "ab" || k === "gueltigAb" || k === "per")]));
    if (!v) { sch.status = "fehler"; sch.fehler = "Vorgang ist im Register nicht (mehr) vorhanden."; aufrufProtokoll(lauf, sch, "fehler", sch.fehler); return; }
    if (!S.erreichbar[v.modul.key]) {
      sch.status = "fehler"; sch.fehler = `EduKSX-${v.modul.name} nicht erreichbar.`;
      aufrufProtokoll(lauf, sch, "fehler", sch.fehler);
      hinweis(["ICT"], lauf, `Aufruf ${esc(v.id)} für ${lauf.kontext.person} fehlgeschlagen – EduKSX-${v.modul.name} nicht erreichbar.`);
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

  /**
   * Stufe 2: Mehrfachgenehmigung (Quorum) und Vier-Augen-Prinzip. Gibt true zurück, wenn der Schritt noch offen bleibt
   * oder hier abgeschlossen wurde; false = normal abschliessen.
   */
  function genehmigungStimme(lauf, sch, durch, e) {
    const wer = handeltFuer(sch) || S.rolle;
    if (sch.mehrfach && (sch.mehrfach.rollen || []).length) {
      sch.stimmen = sch.stimmen || {};
      sch.stimmen[wer] = { entscheid: e.entscheid, begruendung: e.begruendung || "", am: S.heute, durch };
      journal(lauf, "Entscheid", `«${sch.titel}»: ${ROLLEN[wer] || wer} – ${e.entscheid}${wer !== S.rolle ? ` (in Vertretung durch ${ROLLEN[S.rolle]})` : ""}.`, e.begruendung, durch);
      const n = sch.mehrfach.rollen.length, noetig = quorumZahl(sch.mehrfach);
      const ja = Object.values(sch.stimmen).filter((x) => x.entscheid === "genehmigt").length;
      const nein = Object.values(sch.stimmen).filter((x) => x.entscheid === "abgelehnt").length;
      const fertig = ja >= noetig ? "genehmigt" : nein > n - noetig ? "abgelehnt" : null;
      if (!fertig) { hinweis(handelnde(sch), lauf, `«${sch.titel}» (${lauf.kontext.person}): Ihre Stimme fehlt noch (${ja} von ${noetig} Genehmigungen).`); return true; }
      sch.ergebnis = { entscheid: fertig, begruendung: Object.entries(sch.stimmen).map(([r, x]) => `${r}: ${x.entscheid}${x.begruendung ? " – " + x.begruendung : ""}`).join("; "), stimmen: `${ja} ja, ${nein} nein` };
      abschliessen(lauf, sch, durch);
      journal(lauf, "Entscheid", `«${sch.titel}»: ${fertig} (${quorumText(sch.mehrfach)}; ${ja} ja, ${nein} nein).`, "", "Flow");
      return true;
    }
    const f = sch.fd && fdEintrag(sch.fd);
    const m = f ? (f.merkmale || {})[(sch.vierAugen && sch.vierAugen.erst) ? sch.vierAugen.erst.rolle : sch.rolle] : null;
    if (m && m.vierAugen === "ja" && e.entscheid === "genehmigt" && !(sch.vierAugen && sch.vierAugen.erst)) {
      const erst = sch.rolle;
      const pruef = (f && Object.entries(f.rollen).find(([r, c]) => r !== erst && /[PFGZ]/.test(String(c).replace(/[()0-9]/g, ""))) || [])[0] || vorgesetztVon(erst) || D.LEITUNG;
      sch.vierAugen = { erst: { rolle: erst, entscheid: e.entscheid, begruendung: e.begruendung || "", am: S.heute, durch }, zweit: pruef };
      sch.rolle = pruef; sch.ausfuehrend = null; sch.eskaliert = [];
      journal(lauf, "Entscheid", `«${sch.titel}»: erste Genehmigung durch ${ROLLEN[erst] || erst}; Vier-Augen-Prinzip – zweite Prüfung durch ${ROLLEN[pruef] || pruef}.`, e.begruendung, durch);
      hinweis([pruef], lauf, `«${sch.titel}» (${lauf.kontext.person}): zweite Prüfung nach dem Vier-Augen-Prinzip (genehmigt durch ${ROLLEN[erst] || erst}).`);
      return true;
    }
    if (sch.vierAugen && sch.vierAugen.erst) {
      if (sch.vierAugen.erst.durch === durch && S.rolle === sch.vierAugen.erst.rolle) return true; // gleiche Person: nicht zulässig (UI verhindert es)
      e.begruendung = [sch.vierAugen.erst.begruendung && `1. ${sch.vierAugen.erst.rolle}: ${sch.vierAugen.erst.begruendung}`, e.begruendung && `2. ${S.rolle}: ${e.begruendung}`].filter(Boolean).join("; ");
      journal(lauf, "Entscheid", `«${sch.titel}»: zweite Prüfung (Vier-Augen) durch ${ROLLEN[S.rolle] || S.rolle} – ${e.entscheid}.`, "", durch);
    }
    return false;
  }

  function rueckmeldung(lauf, sch) {
    sch.ergebnis = ergebnisErzeugen(lauf, sch);
    aufrufProtokoll(lauf, sch, "rückmeldung", sch.ergebnis);
    abschliessen(lauf, sch, "Rückmeldung " + (modulVon(sch.aktion.vorgang) ? "EduKSX-" + modulVon(sch.aktion.vorgang).name : ""));
  }

  /** Benachrichtigung ohne Modulaufruf: zuständige und zu informierende Rollen erhalten eine Mitteilung. */
  function benachrichtigen(lauf, sch, durch) {
    const an = [sch.rolle, ...(sch.informiert || [])];
    hinweis(an, lauf, `${lauf.kontext.person}: ${sch.titel}.`);
    sch.ergebnis = { versandt: [...new Set(an)].join(", ") };
    sch.status = "erledigt";
    sch.erledigtAm = S.heute;
    journal(lauf, "Benachrichtigung", `«${sch.titel}» an ${[...new Set(an)].map((r) => ROLLEN[r] || r).join(", ")}.`, "", durch || "Flow");
  }

  /** Unterprozess: andere freigegebene Vorlage mit übernommenen Kontextfeldern starten (Konzept E8). */
  function unterStarten(lauf, sch) {
    const u = sch.unter || {};
    const vk = vorlageVon(u.vorlage);
    if (!vk || vk.status !== "freigegeben") {
      sch.status = "fehler";
      sch.fehler = vk ? `Unterprozess «${vk.titel}» ist nicht freigegeben.` : "Unterprozess-Vorlage fehlt.";
      return;
    }
    const k = startVorgabe(vk);
    vk.felder.forEach((f) => { const w = lauf.kontext[f.key]; if (w != null && w !== "") k[f.key] = w; });
    k.stichtag = addTage(lauf.kontext.stichtag, Number(u.versatz || 0));
    const kind = laufAnlegen(vk, k, true);
    kind.eltern = { lauf: lauf.id, schritt: sch.id };
    journal(kind, "Start", `Als Unterprozess von ${lauf.id} «${lauf.titel}» gestartet.`, "", "Flow");
    journal(lauf, "Unterprozess", `«${sch.titel}»: ${esc(kind.id)} «${kind.titel}» (Version ${esc(kind.version)}) gestartet.`, "", "Flow");
    sch.kind = kind.id;
    sch.status = "laeuft";
    sch.fehler = null;
    NOCHMALS = true;
  }
  function unterPruefen(lauf, sch) {
    const kind = laufVon(sch.kind);
    if (!kind) { sch.status = "fehler"; sch.fehler = "Unterprozess nicht gefunden."; return true; }
    if (kind.abgeschlossen) {
      sch.ergebnis = { ablauf: kind.id };
      abschliessen(lauf, sch, "Unterprozess abgeschlossen");
      journal(lauf, "Unterprozess", `${esc(kind.id)} «${kind.titel}» abgeschlossen.`, "", "Flow");
      return true;
    }
    if (kind.abgebrochen) { sch.status = "fehler"; sch.fehler = `Unterprozess ${esc(kind.id)} wurde abgebrochen.`; return true; }
    return false;
  }

  /** Eskalation (Konzept 3.3): bei Stufenwechsel nur die höchste neu erreichte Stufe melden. */
  function eskalieren(lauf) {
    lauf.schritte.forEach((sch) => {
      if (!["bereit", "laeuft", "fehler"].includes(sch.status)) return;
      if (sch.status === "laeuft" && typVon(sch) === "unterprozess") return;
      const fa = sch.fristart || "intern";
      const katalog = (S.einstellungen && S.einstellungen.eskalation) || null;
      const regel = katalog ? katalog.filter((e) => e.aktiv && e.fristart === fa).map((e) => ({ tage: Number(e.tage) || 0, stufe: Number(e.stufe) || 1, text: e.name, an: e.an })).sort((a, b) => a.stufe - b.stufe)
        : D.ESKALATION[fa === "gesetzlich" ? "gesetzlich" : "normal"];
      const d = tageZwischen(fristVon(lauf, sch), S.heute);
      sch.eskaliert = sch.eskaliert || [];
      const neu = regel.filter((st) => d >= st.tage && !sch.eskaliert.includes(st.stufe));
      if (!neu.length) return;
      neu.forEach((st) => sch.eskaliert.push(st.stufe));
      const st = neu[neu.length - 1];
      const an = st.an === "zustaendig" ? sch.rolle : st.an === "vorgesetzt" ? (vorgesetztVon(sch.rolle) || D.LEITUNG) : st.an === "leitung" ? D.LEITUNG : st.an;
      hinweis([an], lauf, `${st.text}: «${sch.titel}» (${lauf.kontext.person}, Frist ${datumKurz(fristVon(lauf, sch))}, zuständig ${ROLLEN[sch.rolle] || sch.rolle}).`);
      if (st.stufe >= 3) journal(lauf, "Eskalation", `Stufe ${st.stufe} – ${st.text}: «${sch.titel}» an ${ROLLEN[an] || an}.`, "", "Flow");
    });
  }
  // ---------------------------------------------------------------- Kompetenzmerkmale (Konzept E14)
  const instanzVon = (code) => { const m = String(code || "").match(/[EG](\d)/); return m ? Number(m[1]) : 1; };
  const zahlCH = (n) => Number(n).toLocaleString("de-CH");
  function merkmalText(m) {
    if (!m) return [];
    const out = [];
    if (m.betrag) out.push([`≤ ${zahlCH(m.betrag)}`, `Betragsgrenze CHF ${zahlCH(m.betrag)}`]);
    if (m.vierAugen === "ja") out.push(["4A", "Vier-Augen-Prinzip"]);
    if (m.kollektiv === "ja") out.push(["koll.", "nur gemeinsam (kollektiv)"]);
    if (m.delegierbar === "ja") out.push(["deleg.", "delegierbar"]);
    if (m.delegierbar === "nein") out.push(["n. deleg.", "nicht delegierbar"]);
    if (m.befristetBis) out.push([`bis ${datumKurz(m.befristetBis)}`, `befristet bis ${datumKurz(m.befristetBis)}`]);
    if (m.bedingt) out.push(["bed.", `bedingt: ${m.bedingt}`]);
    if (m.geltung) out.push(["nur " + kuerzen(m.geltung, 12), `Geltungsbereich: ${m.geltung}`]);
    return out;
  }
  const merkmalHtml = (m) => merkmalText(m).map(([k, t]) => `<span class="merkmal" title="${esc(t)}">${esc(k)}</span>`).join("");
  /** Gilt die Kompetenz der Rolle für diesen Ablauf (Betragsgrenze, Befristung)? Sonst Grund zurückgeben. */
  function kompetenzGrenze(m, lauf) {
    if (!m) return "";
    const betrag = Number(lauf.kontext.betrag);
    if (m.betrag && betrag > Number(m.betrag)) return `Betrag CHF ${zahlCH(betrag)} über der Grenze von CHF ${zahlCH(m.betrag)}`;
    if (m.befristetBis && S.heute > m.befristetBis) return `Kompetenz befristet bis ${datumKurz(m.befristetBis)}`;
    return "";
  }
  /** Genehmigung: ist die Rolle laut Funktionendiagramm nicht (mehr) zuständig, geht sie an die nächste Instanz. */
  function kompetenzPruefen(lauf, sch) {
    sch.kompetenzGeprueft = true;
    const f = sch.fd && fdEintrag(sch.fd);
    if (!f) return;
    const grund = kompetenzGrenze((f.merkmale || {})[sch.rolle], lauf);
    if (!grund) return;
    const kandidaten = Object.entries(f.rollen).filter(([r, c]) => r !== sch.rolle && /[EG]/.test(c) && !kompetenzGrenze((f.merkmale || {})[r], lauf))
      .sort((a, b) => instanzVon(a[1]) - instanzVon(b[1]));
    const naechste = kandidaten.find(([, c]) => instanzVon(c) > instanzVon(f.rollen[sch.rolle])) || kandidaten[0];
    const alt = sch.rolle;
    if (naechste) {
      sch.rolle = naechste[0];
      sch.instanzwechsel = { von: alt, grund };
      journal(lauf, "Entscheid", `«${sch.titel}»: ${grund} – zuständig ist die nächste Instanz ${ROLLEN[sch.rolle] || sch.rolle} (FD ${f.nr}).`, "", "Flow");
      hinweis([sch.rolle, alt], lauf, `«${sch.titel}» (${lauf.kontext.person}): ${grund} – Genehmigung durch ${ROLLEN[sch.rolle] || sch.rolle}.`);
    } else {
      sch.instanzwechsel = { von: alt, grund, offen: true };
      hinweis(["SV", alt], lauf, `«${sch.titel}» (${lauf.kontext.person}): ${grund} – im Funktionendiagramm ${f.nr} ist keine weitere Instanz zuständig.`);
    }
  }

  /** Vorgesetzte Rolle laut Einstellungen › Funktionen (Konzept E6). */
  function vorgesetztVon(r) {
    const f = ((S.einstellungen && S.einstellungen.funktionen) || []).find((e) => e.kuerzel === r);
    return f && f.vorgesetzt ? f.vorgesetzt : f ? "" : D.VORGESETZT[r];
  }
  const eskStufe = (sch) => Math.max(0, ...(sch.eskaliert || []));

  /** Status aller offenen Schritte neu bestimmen; automatische Schritte ausführen, sobald Vorgänger erledigt und Frist erreicht. */
  function motor() {
    let runde = 0;
    NOCHMALS = true;
    while (NOCHMALS && runde++ < 10) {
      NOCHMALS = false;
      [...S.laeufe].forEach((lauf) => {
        if (lauf.abgeschlossen || lauf.abgebrochen || lauf.pausiert) return;
        let geaendert = true, runden = 0;
        while (geaendert && runden++ < 50) {
          geaendert = false;
          lauf.schritte.forEach((sch) => {
            if (["erledigt", "uebersprungen", "fehler", "abgebrochen"].includes(sch.status)) return;
            if (sch.status === "laeuft") { if (typVon(sch) === "unterprozess" && unterPruefen(lauf, sch)) geaendert = true; return; }
            const vorher = sch.status;
            const b = sch.erzwungen ? null : sch.bedingung;
            if (b && b.feld && !istRef(b) && !bedingungErfuellt(b, lauf)) { sch.status = "uebersprungen"; sch.grund = "Bedingung: " + bedingungText(b); geaendert = true; return; }
            const vor = (sch.nach || []).map((n) => lauf.schritte.find((x) => x.id === n)).filter(Boolean);
            if (!sch.erzwungen && vor.length && vor.every((v) => v.status === "uebersprungen" && v.zweig)) { sch.status = "uebersprungen"; sch.zweig = true; sch.grund = "Zweig entfällt"; geaendert = true; return; }
            if (vor.some((v) => !ERLEDIGT.includes(v.status))) { sch.status = "wartet"; if (vorher !== sch.status) geaendert = true; return; }
            if (istRef(b)) {
              const q = lauf.schritte.find((x) => x.id === b.feld.split(".")[0]);
              if (q && !ERLEDIGT.includes(q.status)) { sch.status = "wartet"; if (vorher !== sch.status) geaendert = true; return; }
              if (!bedingungErfuellt(b, lauf)) { sch.status = "uebersprungen"; sch.zweig = true; sch.grund = "Zweig: " + bedingungText(b, lauf.schritte); geaendert = true; return; }
            }
            const t = typVon(sch);
            const faellig = S.heute >= fristVon(lauf, sch);
            if (t === "aufruf" && sch.auto && sch.aktion && !sch.manuell) {
              if (faellig) { ausfuehren(lauf, sch, "automatisch"); geaendert = true; return; }
              sch.status = "geplant";
            } else if (t === "warten") {
              if (faellig) { sch.ergebnis = { erreicht: datumKurz(fristVon(lauf, sch)) }; abschliessen(lauf, sch, "Frist erreicht"); journal(lauf, "Frist", `«${sch.titel}»: Frist ${datumKurz(fristVon(lauf, sch))} erreicht.`, "", "Flow"); geaendert = true; return; }
              sch.status = "geplant";
            } else if (t === "benachrichtigung" && !sch.manuell) {
              if (faellig) { benachrichtigen(lauf, sch, "Flow"); geaendert = true; return; }
              sch.status = "geplant";
            } else if (t === "unterprozess") { unterStarten(lauf, sch); geaendert = true; return; }
            else { sch.status = "bereit"; if (t === "genehmigung" && !sch.kompetenzGeprueft) kompetenzPruefen(lauf, sch); }
            if (vorher !== sch.status) geaendert = true;
          });
        }
        eskalieren(lauf);
        if (lauf.schritte.every((x) => ERLEDIGT.includes(x.status))) {
          lauf.abgeschlossen = S.heute;
          journal(lauf, "Abschluss", "Ablauf abgeschlossen.", "", "Flow");
          hinweis(["SV", "SL"], lauf, `Ablauf «${lauf.titel}» für ${lauf.kontext.person} abgeschlossen.`);
          ausloeserAbschluss(lauf);
          NOCHMALS = true;
        }
      });
    }
  }

  // ---------------------------------------------------------------- Auslöser (Konzept 3.2)
  function ausloesung(e) {
    S.ausloesungen.unshift(Object.assign({ tag: S.heute, uhr: uhr() }, e));
    S.ausloesungen = S.ausloesungen.slice(0, 300);
  }
  const startSchluessel = (v, k) => `${v.id}|${k.person}|${k.stichtag}`;
  /** Ablauf aus einem Auslöser starten – doppelte Starts werden nicht ausgeführt, sondern protokolliert. */
  function ausloesen(v, kontext, quelle, schluessel) {
    const key = schluessel || startSchluessel(v, kontext);
    const da = S.ausgeloest[key] && laufVon(S.ausgeloest[key]);
    if (da && !da.abgebrochen) { ausloesung({ quelle, vorlage: v.id, lauf: da.id, ergebnis: "doppelt", text: `Bereits als ${da.id} gestartet – nicht erneut gestartet.` }); return null; }
    const lauf = laufAnlegen(v, kontext);
    lauf.ausloeser = quelle;
    S.ausgeloest[key] = lauf.id;
    S.ausgeloest[startSchluessel(v, kontext)] = lauf.id;
    journal(lauf, "Start", `Automatisch gestartet – ${quelle}.`, "", "Flow");
    ausloesung({ quelle, vorlage: v.id, lauf: lauf.id, ergebnis: "gestartet", text: `${lauf.id} für ${kontext.person}` });
    NOCHMALS = true;
    return lauf;
  }
  const mitAusloeser = (art) => S.vorlagen.filter((v) => v.status === "freigegeben").flatMap((v) => (v.ausloeser || []).filter((a) => a.art === art).map((a) => [v, a]));
  /** Kalender: Start, sobald der erste Schritt fällig wird (Vorlauf = frühester Schritt, Konzept E7). */
  function ausloeserKalender() {
    mitAusloeser("kalender").forEach(([v, a]) => {
      const ev = S.ereignisse.find((e) => e.id === a.ereignis);
      if (!ev) return;
      const vorlauf = Math.max(0, -Math.min(0, ...v.schritte.map((s) => s.tage)));
      KAL.vorkommenZwischen(ev, addTage(S.heute, -7), addTage(S.heute, vorlauf)).forEach((o) => {
        if (o.von < addTage(S.heute, -7) || addTage(o.von, -vorlauf) > S.heute) return;
        const key = `kal|${v.id}|${o.key}`;
        if (S.ausgeloest[key]) return;
        const k = startVorgabe(v);
        k.person = `${ev.titel} ${datumKurz(o.von)}`;
        k.stichtag = o.von;
        const lauf = ausloesen(v, k, `Jahreskalender «${ev.titel}» am ${datumKurz(o.von)}`, key);
        if (lauf) { lauf.ereignis = o.key; lauf.ereignisTitel = ev.titel; }
      });
    });
  }
  /** Modul-Ereignis (simuliert): alle Vorlagen starten, die das Ereignis abonniert haben. */
  function ausloeserEreignis(eid, daten) {
    const me = D.MODULEREIGNISSE.find((x) => x.id === eid);
    const m = D.MODULE.find((x) => x.key === me.modul);
    const quelle = `EduKSX-${m ? m.name : me.modul}: ${me.titel}`;
    const ziele = mitAusloeser("ereignis").filter(([, a]) => a.ereignis === eid);
    if (!ziele.length) { ausloesung({ quelle, vorlage: "", lauf: "", ergebnis: "ohne Ablauf", text: "Keine freigegebene Vorlage hat dieses Ereignis abonniert." }); return []; }
    return ziele.map(([v]) => {
      const k = Object.assign(startVorgabe(v), me.fest || {});
      v.felder.forEach((f) => { const w = daten[f.key]; if (w != null && w !== "") k[f.key] = f.typ === "zahl" ? Number(w) : w; });
      return ausloesen(v, k, quelle);
    }).filter(Boolean);
  }
  /** Abschluss eines Ablaufs startet nachgelagerte Abläufe. */
  function ausloeserAbschluss(lauf) {
    mitAusloeser("abschluss").filter(([, a]) => a.vorlage === lauf.vorlage).forEach(([v, a]) => {
      const k = startVorgabe(v);
      v.felder.forEach((f) => { const w = lauf.kontext[f.key]; if (w != null && w !== "" && f.key !== "stichtag") k[f.key] = w; });
      k.stichtag = addTage(lauf.kontext.stichtag, Number(a.versatz || 0));
      ausloesen(v, k, `Abschluss ${lauf.id} «${lauf.titel}»`, `ab|${v.id}|${lauf.id}`);
    });
  }
  function ausloeserText(a) {
    if (a.art === "kalender") { const ev = S.ereignisse.find((e) => e.id === a.ereignis); return `📅 Jahreskalender: ${ev ? ev.titel : "Ereignis fehlt"} (automatisch, sobald der erste Schritt fällig wird)`; }
    if (a.art === "ereignis") { const me = D.MODULEREIGNISSE.find((x) => x.id === a.ereignis); const m = me && D.MODULE.find((x) => x.key === me.modul); return `⚡ ${me ? `EduKSX-${m ? m.name : me.modul}: ${me.titel} (${me.art})` : a.ereignis}`; }
    if (a.art === "abschluss") { const q = vorlageVon(a.vorlage); return `✓ Abschluss von «${q ? q.titel : a.vorlage}»${a.versatz ? `, Stichtag ${a.versatz > 0 ? "+" : ""}${a.versatz} Tage` : ""}`; }
    return a.art;
  }

  // ---------------------------------------------------------------- Eingriffe in laufende Abläufe (Konzept 3.4)
  /** Prozessverantwortung je Vorlage (Konzept E5); der Ablauf übernimmt sie beim Start. */
  const pvVon = (l) => (l && l.pv) || (l && (vorlageVon(l.vorlage) || {}).prozessverantwortlich) || D.PROZESSVERANTWORTLICH || [];
  const darfEingreifen = (l) => pvVon(l).includes(S.rolle);
  function abbrechen(lauf, grund, wer) {
    lauf.abgebrochen = S.heute;
    const ausgefuehrt = lauf.schritte.filter((x) => x.status === "erledigt" && typVon(x) === "aufruf");
    lauf.schritte.forEach((x) => {
      if (typVon(x) === "unterprozess" && x.kind) { const k = laufVon(x.kind); if (k && !k.abgeschlossen && !k.abgebrochen) abbrechen(k, "Hauptablauf abgebrochen: " + grund, wer); }
      if (!ERLEDIGT.includes(x.status)) x.status = "abgebrochen";
    });
    journal(lauf, "Abbruch", "Ablauf abgebrochen.", grund, wer);
    if (ausgefuehrt.length) {
      journal(lauf, "Kompensation", `Bereits ausgeführte Aufrufe wurden nicht rückgängig gemacht: ${ausgefuehrt.map((x) => x.titel).join("; ")}. Prüfen, ob sie in den Modulen zurückzunehmen sind.`, "", "Flow");
      hinweis(["SV"], lauf, `Abbruch ${lauf.id} (${lauf.kontext.person}): ${ausgefuehrt.length} bereits ausgeführte Aufrufe prüfen (Kompensation).`);
    }
    hinweis(["SV", "SL"], lauf, `Ablauf «${lauf.titel}» für ${lauf.kontext.person} abgebrochen: ${grund}`);
  }

  // ---------------------------------------------------------------- Prüfung einer Vorlage
  function vorfahren(v, id, seen) {
    seen = seen || new Set();
    const s = v.schritte.find((x) => x.id === id);
    (s ? s.nach : []).forEach((n) => { if (!seen.has(n)) { seen.add(n); vorfahren(v, n, seen); } });
    return seen;
  }
  /** Vorlagen, die eine Vorlage über Unterprozesse (auch indirekt) aufruft. */
  function unterVorlagen(v, seen) {
    seen = seen || new Set();
    v.schritte.forEach((s) => {
      if (typVon(s) !== "unterprozess" || !s.unter || seen.has(s.unter.vorlage)) return;
      seen.add(s.unter.vorlage);
      const q = vorlageVon(s.unter.vorlage);
      if (q) unterVorlagen(q, seen);
    });
    return seen;
  }
  function pruefen(v) {
    const m = [];
    const ids = new Set(v.schritte.map((x) => x.id));
    const felder = new Set(v.felder.map((f) => f.key));
    v.schritte.forEach((s) => {
      const name = `«${s.titel}»`;
      const t = typVon(s);
      if (!TYPEN[t]) m.push(["fehler", `${name}: unbekannte Art «${t}».`]);
      if (!s.rolle) m.push(["fehler", `${name}: keine verantwortliche Rolle.`]);
      if (!String(s.quelle || "").trim()) m.push(["warnung", `${name}: Quellenangabe fehlt.`]);
      if (s.fristart === "gesetzlich" && !/§|Art\./.test(s.quelle || "")) m.push(["warnung", `${name}: gesetzliche Frist ohne Paragraf bzw. Artikel in der Quelle.`]);
      (s.nach || []).forEach((n) => { if (!ids.has(n)) m.push(["fehler", `${name}: Vorgänger ${n} gibt es nicht.`]); });
      if (vorfahren(v, s.id).has(s.id)) m.push(["fehler", `${name}: Kreis in der Reihenfolge – der Schritt hängt von sich selbst ab.`]);
      (s.nach || []).forEach((n) => { const p = v.schritte.find((x) => x.id === n); if (p && p.tage > s.tage) m.push(["warnung", `${name} (${tKurz(s.tage)}) ist früher fällig als sein Vorgänger «${p.titel}» (${tKurz(p.tage)}).`]); });
      if (t !== "aufruf" && s.aktion) m.push(["fehler", `${name}: nur Schritte der Art «Aufruf an Modul» rufen einen Vorgang auf.`]);
      if (t === "aufruf" && !s.aktion) m.push(["fehler", `${name}: Aufruf ohne Vorgang.`]);
      if (t === "entscheidung" && (s.optionen || []).filter(Boolean).length < 2) m.push(["fehler", `${name}: eine Entscheidung braucht mindestens zwei Möglichkeiten.`]);
      if (t === "unterprozess") {
        const q = s.unter && vorlageVon(s.unter.vorlage);
        if (!q) m.push(["fehler", `${name}: Vorlage für den Unterprozess fehlt.`]);
        else {
          if (q.id === v.id || unterVorlagen(q).has(v.id)) m.push(["fehler", `${name}: Unterprozess ruft diese Vorlage wieder auf (Kreis).`]);
          if (q.status !== "freigegeben") m.push(["warnung", `${name}: Unterprozess «${q.titel}» ist noch nicht freigegeben.`]);
        }
      }
      if (s.aktion && t === "aufruf") {
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
            if (!q || !ergebnisFelder(q).includes(feld)) m.push(["fehler", `${name}: Platzhalter {${k}} – Schritt ${sid} liefert kein «${feld}».`]);
            else if (!vf.has(sid)) m.push(["warnung", `${name}: nutzt das Ergebnis von «${q.titel}», ist aber nicht danach eingeplant.`]);
          } else if (!felder.has(k)) m.push(["fehler", `${name}: Platzhalter {${k}} ist kein Kontextfeld.`]);
          return g;
        }));
      } else if (s.auto) m.push(["warnung", `${name}: nur Aufrufe an Module können automatisch laufen.`]);
      if (s.fd) {
        const f = fdEintrag(s.fd);
        const z = f && f.rollen[s.rolle];
        if (!f) m.push(["warnung", `${name}: Funktionendiagramm ${s.fd} unbekannt.`]);
        else if (!z || !/[EV]/.test(z)) m.push(["warnung", `${name}: Laut Funktionendiagramm ${s.fd} hat ${ROLLEN[s.rolle]} hier «${z || "–"}» – Lead (V) liegt bei ${Object.entries(f.rollen).filter(([, x]) => /V/.test(x)).map(([r]) => ROLLEN[r]).join(", ") || "–"}.`]);
      }
      if (s.bedingung && s.bedingung.feld) {
        if (istRef(s.bedingung)) {
          const [sid, f] = s.bedingung.feld.split(".");
          const q = v.schritte.find((x) => x.id === sid);
          if (!q || !ergebnisFelder(q).includes(f)) m.push(["fehler", `${name}: Bedingung nutzt «${s.bedingung.feld}» – diesen Wert liefert kein Schritt.`]);
          else if (!vorfahren(v, s.id).has(sid)) m.push(["fehler", `${name}: Bedingung hängt von «${q.titel}» ab, der Schritt ist aber nicht danach eingeplant.`]);
          else if (typVon(q) === "entscheidung" && f === "wahl" && !(q.optionen || []).includes(s.bedingung.wert) && s.bedingung.op === "=") m.push(["warnung", `${name}: «${s.bedingung.wert}» ist keine Möglichkeit von «${q.titel}».`]);
        } else if (!felder.has(s.bedingung.feld)) m.push(["fehler", `${name}: Bedingung nutzt unbekanntes Feld «${s.bedingung.feld}».`]);
      }
    });
    (v.ausloeser || []).forEach((a) => {
      if (a.art === "kalender" && !S.ereignisse.some((e) => e.id === a.ereignis)) m.push(["fehler", `Auslöser: Ereignis im Jahreskalender fehlt.`]);
      if (a.art === "abschluss" && !vorlageVon(a.vorlage)) m.push(["fehler", `Auslöser: Vorlage ${a.vorlage} fehlt.`]);
      if (a.art === "ereignis") {
        const me = D.MODULEREIGNISSE.find((x) => x.id === a.ereignis);
        if (!me) m.push(["fehler", `Auslöser: Modul-Ereignis ${a.ereignis} ist nicht registriert.`]);
        else {
          const fehlt = v.felder.filter((f) => !me.felder.some((x) => x.key === f.key) && !(me.fest || {})[f.key]).map((f) => f.label);
          if (fehlt.length) m.push(["warnung", `Auslöser «${me.titel}» liefert nicht: ${fehlt.join(", ")} – es gilt die Vorgabe der Vorlage.`]);
        }
      }
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
  const ICON_FLOW = '<!--eduksx-icon:flow-->'; // Icon aus EduKSX-UI, beim Bauen eingesetzt
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
    ausloeser: ico('<path d="M13 2L4.5 13.5H12L11 22l8.5-11.5H12z"/>'),
    vertretungen: ico('<circle cx="8" cy="8" r="3"/><path d="M3 19c.5-3 2.6-5 5-5"/><path d="M14 13h7M18 10l3 3-3 3"/>'),
    "einstellungen/kompetenzen": ico('<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="1.8" fill="currentColor"/><circle cx="15" cy="12" r="1.8" fill="currentColor"/><circle cx="10" cy="18" r="1.8" fill="currentColor"/>'),
    "einstellungen/funktionen": ico('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.2c2.3.2 4 1.9 4.5 4.8"/>'),
    "einstellungen/zeitpunkte": ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    "einstellungen/intervalle": ico('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>'),
    "einstellungen/perioden": ico('<path d="M3 12h3l2-5 3 10 2-5h8"/>'),
    "einstellungen/eskalation": ico('<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>'),
    "einstellungen/aufgabenbereiche": ico('<rect x="3" y="3" width="7" height="7" rx="1"/><path d="M14 5h7M14 8h5M6.5 10v4.5H14M6.5 14.5V19H14"/><rect x="14" y="12.5" width="7" height="4" rx="1"/><rect x="14" y="17" width="7" height="4" rx="1"/>'),
  };
  const NAVI = [
    ["uebersicht", "Übersicht"],
    ["aufgaben", "Meine Aufgaben"],
    ["gruppe", "Abläufe"],
    ["laeufe", "Laufende Abläufe"],
    ["neu", "Ablauf starten"],
    ["vertretungen", "Stellvertretungen"],
    ["gruppe", "Planung"],
    ["kalender", "Jahreskalender"],
    ["vorlagen", "Ablaufvorlagen"],
    ["funktionendiagramm", "Funktionendiagramm"],
    ["gruppe", "Automatisierung"],
    ["ausloeser", "Auslöser"],
    ["vorgaenge", "Vorgänge der Module"],
    ["gruppe", "Nachvollziehen"],
    ["protokoll", "Aufrufprotokoll"],
    ["gruppe", "Einstellungen"],
    ["einstellungen/kompetenzen", "Kompetenzen"],
    ["einstellungen/funktionen", "Funktionen"],
    ["einstellungen/zeitpunkte", "Zeitpunkte"],
    ["einstellungen/intervalle", "Intervalle"],
    ["einstellungen/perioden", "Periode"],
    ["einstellungen/aufgabenbereiche", "Aufgabenbereiche"],
    ["einstellungen/eskalation", "Eskalation"],
  ];

  const STATUS = {
    erledigt: ["erfolg", "✓", "erledigt"],
    uebersprungen: ["neutral", "–", "übersprungen"],
    bereit: ["info", "●", "zu erledigen"],
    geplant: ["violett", "◷", "geplant (automatisch)"],
    laeuft: ["warnung", "⧗", "wartet auf Rückmeldung"],
    wartet: ["neutral", "…", "wartet auf Vorgänger"],
    fehler: ["fehler", "✕", "Fehler"],
    abgebrochen: ["neutral", "⊘", "abgebrochen"],
  };
  const badge = (st, sch) => {
    if (sch && st === "laeuft" && typVon(sch) === "unterprozess") return `<span class="badge warnung">⧉ Unterprozess läuft</span>`;
    if (sch && st === "geplant" && typVon(sch) === "warten") return `<span class="badge violett">⏳ wartet bis Frist</span>`;
    const b = STATUS[st] || STATUS.wartet; return `<span class="badge ${b[0]}">${b[1]} ${b[2]}</span>`;
  };
  const ueberfaellig = (lauf, sch) => ["bereit", "laeuft", "fehler"].includes(sch.status) && S.heute > fristVon(lauf, sch);
  const fristBadge = (lauf, sch) => {
    if (ERLEDIGT.includes(sch.status) || sch.status === "abgebrochen" || lauf.abgebrochen) return "";
    const d = tageZwischen(S.heute, fristVon(lauf, sch));
    const esk = eskStufe(sch) >= 3 ? ` <span class="badge fehler" title="Eskalationsstufe ${eskStufe(sch)}">↑ Eskalation ${eskStufe(sch)}</span>` : "";
    if (d < 0 && ["bereit", "laeuft", "fehler"].includes(sch.status)) return ` <span class="badge fehler">! ${-d} T überfällig</span>${esk}`;
    if (d < 0 && ["wartet", "geplant"].includes(sch.status) && typVon(sch) !== "warten") return ` <span class="badge warnung" title="Die Frist ist vorbei, der Schritt ist aber noch blockiert">⚠ Frist gefährdet</span>`;
    if (d <= 3 && ["bereit", "laeuft"].includes(sch.status)) return ` <span class="badge warnung">! ${d === 0 ? "heute" : "in " + d + " T"}</span>`;
    return "";
  };
  const gefaehrdet = (lauf, sch) => ["wartet", "geplant"].includes(sch.status) && typVon(sch) !== "warten" && S.heute > fristVon(lauf, sch);
  const fristartBadge = (s) => (s.fristart === "gesetzlich" ? ` <span class="badge info" title="Gesetzliche Frist – nicht frei verschiebbar">§ gesetzlich</span>` : s.fristart === "empfehlung" ? ` <span class="badge neutral" title="Empfohlener Zeitpunkt">≈ Empfehlung</span>` : "");
  const typHtml = (s) => { const t = TYPEN[typVon(s)] || TYPEN.aufgabe; return `<span class="typ" title="${esc(t[2])}">${t[0]} ${esc(t[1])}</span>`; };
  /** Namen der Funktionen aus den Einstellungen übernehmen (Kürzel → Bezeichnung). */
  function rollenAbgleichen() { ((S && S.einstellungen && S.einstellungen.funktionen) || []).forEach((e) => { if (e.kuerzel && e.name) ROLLEN[e.kuerzel] = e.name; }); }
  /** Aktive Funktionen (Einstellungen) gruppiert; die aktuelle Auswahl bleibt wählbar, auch wenn inaktiv. */
  function rollenOptionen(aktuell, zusatz) {
    const akt = ES.aktiveFunktionen();
    const gruppen = [...new Set(akt.map((e) => e.gruppe || "Weitere"))];
    const fehlt = aktuell && !akt.some((e) => e.kuerzel === aktuell) ? `<option value="${esc(aktuell)}" selected>${esc(ROLLEN[aktuell] || aktuell)} (inaktiv)</option>` : "";
    return fehlt + gruppen.map((g) => `<optgroup label="${esc(g)}">${akt.filter((e) => (e.gruppe || "Weitere") === g).map((e) => `<option value="${esc(e.kuerzel)}" ${e.kuerzel === aktuell ? "selected" : ""}>${esc(e.name)} (${esc(e.kuerzel)})${zusatz ? esc(zusatz(e.kuerzel)) : ""}</option>`).join("")}</optgroup>`).join("");
  }
  const rollenWerte = () => ES.aktiveFunktionen().map((e) => [e.kuerzel, `${e.name} (${e.kuerzel})`]);
  const rolleBadge = (r) => {
    const f = S && S.einstellungen ? ES.farbeVon("funktionen", r) : "";
    return `<span class="rolle" ${f ? `style="background:${esc(f)};color:${ES.textFarbe(f)};border-color:${esc(f)}"` : ""} title="${esc((S && S.einstellungen && ES.tooltip("funktionen", r)) || ROLLEN[r] || r)}">${esc(r)}</span>`;
  };
  /** Tooltip für Kompetenz-Einträge wie «E1/V»: je Kürzel der Tooltip aus Einstellungen › Kompetenzen. */
  const kompetenzTooltip = (w) => String(w || "").split("/").map((x) => { const k = x.replace(/[()\s0-9]/g, ""); return k ? (ES.tooltip("kompetenzen", k) || k) + (/[0-9]/.test(x) ? ` (Instanz ${x.replace(/\D/g, "")})` : "") : ""; }).filter(Boolean).join(" · ");
  function aufrufText(s) {
    const t = typVon(s);
    if (t === "unterprozess") { const u = s.unter && vorlageVon(s.unter.vorlage); return `${typHtml(s)}<div class="small">${u ? `<a href="#/vorlage/${u.id}">${esc(u.titel)}</a>` : `<span class="badge fehler">✕ Vorlage fehlt</span>`}</div>`; }
    if (t === "entscheidung") return `${typHtml(s)}<div class="small muted">${esc((s.optionen || []).join(" / "))}</div>`;
    if (t === "benachrichtigung") return `${typHtml(s)}<div class="small muted">an ${esc([s.rolle, ...(s.informiert || [])].join(", "))}</div>`;
    if (t !== "aufruf") return typHtml(s);
    if (!s.aktion) return `<span class="badge fehler">✕ Vorgang fehlt</span>`;
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
      const tp = typVon(s);
      const wozu = tp === "aufruf" ? (s.aktion ? (modulVon(s.aktion.vorgang) || { name: "?" }).name : "?") : TYPEN[tp] ? TYPEN[tp][1] : tp;
      const zweig = istRef(s.bedingung) ? ` · wenn ${s.bedingung.wert}` : s.bedingung && s.bedingung.feld ? " · bedingt" : "";
      const unten = opt.lauf ? `${(STATUS[st] || STATUS.wartet)[1]} ${(STATUS[st] || STATUS.wartet)[2]} · ${datumKurz(fristVon(opt.lauf, s))}` : `${TYPEN[tp] ? TYPEN[tp][0] : ""} ${tKurz(s.tage)}${s.fristart === "gesetzlich" ? " §" : ""} · ${wozu}${s.auto ? " · auto" : ""}${zweig}`;
      const ziel = opt.lauf ? "" : `data-aktion="schritt-bearbeiten" data-id="${esc(s.id)}" tabindex="0" role="button" aria-label="${esc(s.titel)} bearbeiten"`;
      svg += `<g class="knoten typ-${esc(tp)} ${st ? "st-" + esc(st) : ""} ${s.bedingung && s.bedingung.feld ? "bedingt" : ""}" ${ziel}><title>${esc(s.titel)}${s.fd ? " – Funktionendiagramm " + esc(s.fd) : ""}</title>`;
      svg += `<rect x="${esc(p.x)}" y="${esc(p.y)}" width="${W}" height="${H}" rx="8"/>`;
      svg += `<text x="${esc(p.x + 10)}" y="${esc(p.y + 18)}" class="nr">${idx + 1}</text>`;
      zeilen.forEach((z, i) => { svg += `<text x="${esc(p.x + 28)}" y="${esc(p.y + 18 + i * 15)}" class="t">${esc(z)}</text>`; });
      svg += `<text x="${esc(p.x + 10)}" y="${esc(p.y + H - 9)}" class="u">${esc(kuerzen(unten, 33))}</text></g>`;
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
    const aufgaben = offeneAufgaben(S.rolle, true).length;
    const navi = NAVI.map((n) => {
      if (n[0] === "gruppe") return `<li class="gruppe" aria-hidden="true">${esc(n[1])}</li>`;
      const unter = route()[1] || "kompetenzen";
      const aktiv = seite === n[0] || ({ lauf: "laeufe", vorlage: "vorlagen" }[seite] === n[0]) || (seite === "einstellungen" && n[0] === "einstellungen/" + unter);
      const zahl = n[0] === "aufgaben" && aufgaben ? ` <span class="zaehler" aria-label="${aufgaben} offen">${aufgaben}</span>` : "";
      return `<li><a href="#/${n[0]}" ${aktiv ? 'aria-current="page"' : ""}>${ICONS[n[0]]}<span>${esc(n[1])}</span>${zahl}</a></li>`;
    }).join("") + `<li class="gruppe" aria-hidden="true">Entwicklung</li><li><a href="entwickler/" title="Datenmodell und API – Entwurf für die Umsetzung">${ico('<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 4-4 16"/>')}<span>Entwickler</span></a></li>`;
    const rollen = Object.entries(ROLLEN).filter(([k]) => ROLLEN_PROTOTYP.includes(k) && !["LP", "GV", "VSA", "MA", "ELT"].includes(k)).map(([k, v]) => `<option value="${k}" ${k === S.rolle ? "selected" : ""}>${esc(v)}</option>`).join("");
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

  function offeneAufgaben(rolle, mitVertretung) {
    const out = [];
    const rollen = rolle ? [rolle].concat(mitVertretung ? vertretungenHeute().filter((v) => v.vertretung === rolle).map((v) => v.rolle) : []) : null;
    S.laeufe.forEach((l) => { if (l.pausiert || l.abgebrochen) return; l.schritte.forEach((s) => { if ((!rollen || handelnde(s).some((r) => rollen.includes(r))) && ["bereit", "laeuft", "fehler"].includes(s.status) && !(s.status === "laeuft" && typVon(s) === "unterprozess")) out.push([l, s]); }); });
    return out.sort((a, b) => fristVon(a[0], a[1]).localeCompare(fristVon(b[0], b[1])));
  }

  function aktionKnopf(l, s) {
    if (l.abgebrochen) return "";
    if (l.pausiert) return `<span class="small muted">⏸ pausiert</span>`;
    const meine = !!handeltFuer(s);
    const titel = meine ? "" : `title="Nur ${esc(handelnde(s).map((r) => ROLLEN[r] || r).join(", "))} – Rolle oben rechts wechseln"`;
    const dis = meine ? "" : "disabled";
    const d = `data-lauf="${esc(l.id)}" data-id="${esc(s.id)}"`;
    const t = typVon(s);
    if (s.status === "bereit") {
      if (t === "aufruf") return `<button class="btn klein primaer" data-aktion="ausfuehren" ${d} ${dis} ${titel}>▶ Aufruf an EduKSX-${esc((modulVon(s.aktion && s.aktion.vorgang) || { name: "?" }).name)}</button>`;
      const text = { genehmigung: "⚖ Entscheiden", entscheidung: "◇ Entscheiden", nachweis: "📎 Nachweis ablegen", termin: "📅 Termin festhalten" }[t];
      if (text) return `<button class="btn klein primaer" data-aktion="erledigen" ${d} ${dis} ${titel}>${text}</button>`;
      return `<button class="btn klein primaer" data-aktion="ausfuehren" ${d} ${dis} ${titel}>${(D.EXTERN || []).includes(s.rolle) ? "✓ Eingang bestätigen" : "✓ Erledigt melden"}</button>`;
    }
    if (s.status === "laeuft" && t === "unterprozess") return s.kind ? `<a class="btn klein" href="#/lauf/${esc(s.kind)}">⧉ Zum Unterprozess ${esc(s.kind)}</a>` : "";
    if (s.status === "laeuft") return `<button class="btn klein" data-aktion="rueckmeldung" ${d} title="Simuliert die Rückmeldung des Moduls (z. B. Unterschrift eingegangen)">↩ Rückmeldung simulieren</button>`;
    if (s.status === "fehler") return `<button class="btn klein" data-aktion="nochmals" ${d}>↻ Erneut versuchen</button>`;
    if (s.status === "geplant" && t === "warten") return `<span class="small muted">wartet bis ${datumKurz(fristVon(l, s))}</span>`;
    if (s.status === "geplant") return `<button class="btn klein" data-aktion="jetzt" ${d} ${dis} ${titel} title="Automatischen Schritt vor der Frist auslösen">▶ Jetzt auslösen</button>`;
    return "";
  }
  /** Delegieren bzw. zurücknehmen (Stufe 2); gesperrt, wenn die Kompetenz laut Funktionendiagramm nicht delegierbar ist. */
  function delegationKnopf(l, s) {
    if (l.abgebrochen || l.pausiert || s.status !== "bereit" || (s.mehrfach && (s.mehrfach.rollen || []).length)) return "";
    const d = `data-lauf="${esc(l.id)}" data-id="${esc(s.id)}"`;
    if (s.ausfuehrend && (S.rolle === s.rolle || vertritt(s.rolle))) return ` <button class="btn klein" data-aktion="delegation-zurueck" ${d} title="Delegation an ${esc(ROLLEN[s.ausfuehrend] || s.ausfuehrend)} zurücknehmen">↩ zurücknehmen</button>`;
    if (s.ausfuehrend || !(S.rolle === s.rolle || vertritt(s.rolle))) return "";
    const m = s.fd && fdEintrag(s.fd) ? (fdEintrag(s.fd).merkmale || {})[s.rolle] : null;
    if (m && m.delegierbar === "nein") return ` <button class="btn klein" disabled title="Laut Funktionendiagramm ${esc(s.fd)} nicht delegierbar">↪ Delegieren</button>`;
    return ` <button class="btn klein" data-aktion="delegieren" ${d} title="Ausführung an eine andere Funktion übertragen – die Verantwortung bleibt">↪ Delegieren</button>`;
  }
  /** Eingriffe je Schritt für Prozessverantwortliche (überspringen, Zuständigkeit, wieder öffnen). */
  function eingriffKnoepfe(l, s) {
    if (!darfEingreifen(l) || l.abgebrochen) return "";
    const d = `data-lauf="${esc(l.id)}" data-id="${esc(s.id)}"`;
    const k = [];
    if (["wartet", "bereit", "geplant", "fehler", "laeuft"].includes(s.status) && !(s.status === "laeuft" && typVon(s) === "unterprozess")) {
      k.push(`<button class="btn klein" data-aktion="ein-ueberspringen" ${d} title="Schritt überspringen (mit Begründung)" aria-label="Überspringen">↷</button>`);
      k.push(`<button class="btn klein" data-aktion="ein-rolle" ${d} title="Zuständigkeit ändern" aria-label="Zuständigkeit ändern">👤</button>`);
    }
    if (["erledigt", "uebersprungen"].includes(s.status)) k.push(`<button class="btn klein" data-aktion="ein-oeffnen" ${d} title="Schritt wieder öffnen (mit Begründung)" aria-label="Wieder öffnen">↺</button>`);
    return k.length ? `<div class="eingriff">${k.join(" ")}</div>` : "";
  }
  /** Zusätze zur Zuständigkeit: Delegation, Vertretung, Vier-Augen, Mehrfachgenehmigung. */
  function zustaendigText(s) {
    const t = [];
    if (s.ausfuehrend) t.push(`↪ ausgeführt durch ${esc(s.ausfuehrend)}`);
    if (!ERLEDIGT.includes(s.status)) handelnde(s).forEach((r) => vertretungVon(r).forEach((v) => t.push(`abwesend – Vertretung ${esc(v)}`)));
    if (s.vierAugen && s.vierAugen.erst) t.push(`4A: 1. ${esc(s.vierAugen.erst.rolle)} ✓${s.status !== "erledigt" ? ", 2. Prüfung offen" : ""}`);
    if (s.mehrfach && (s.mehrfach.rollen || []).length) t.push(`${esc(quorumText(s.mehrfach))}: ${s.mehrfach.rollen.map((r) => `${esc(r)} ${(s.stimmen || {})[r] ? ((s.stimmen[r].entscheid === "genehmigt") ? "✓" : "✕") : "…"}`).join(" · ")}`);
    return t.map((x) => `<div class="small">${x}</div>`).join("");
  }
  const quorumText = (m) => (m.quorum === "mehrheit" ? "Mehrheit" : m.quorum === "alle" || !m.quorum ? "alle" : `mind. ${m.quorum}`) + ` von ${m.rollen.length}`;
  const quorumZahl = (m) => (m.quorum === "mehrheit" ? Math.floor(m.rollen.length / 2) + 1 : m.quorum === "alle" || !m.quorum ? m.rollen.length : Math.min(Number(m.quorum), m.rollen.length));
  const laufStatus = (l) => (l.abgebrochen ? `<span class="badge neutral">⊘ abgebrochen ${datumKurz(l.abgebrochen)}</span>` : l.abgeschlossen ? `<span class="badge erfolg">✓ abgeschlossen</span>` : l.pausiert ? `<span class="badge warnung">⏸ pausiert</span>` : "");

  // ---------------------------------------------------------------- Seiten
  function seiteUebersicht() {
    const aktiv = S.laeufe.filter((l) => !l.abgeschlossen && !l.abgebrochen);
    const alle = offeneAufgaben(null);
    const gef = []; aktiv.forEach((l) => { if (!l.pausiert) l.schritte.forEach((x) => { if (gefaehrdet(l, x)) gef.push([l, x]); }); });
    const pausiert = aktiv.filter((l) => l.pausiert).length;
    const heuteAusg = S.ausloesungen.filter((x) => x.tag === S.heute && x.ergebnis === "gestartet").length;
    const ueber = alle.filter(([l, s]) => ueberfaellig(l, s));
    const fehler = alle.filter(([, s]) => s.status === "fehler");
    const zeilen = S.laeufe.map((l) => {
      const [e, n, p] = fortschritt(l);
      const naechste = l.schritte.filter((s) => ["bereit", "laeuft", "fehler", "geplant"].includes(s.status)).sort((a, b) => a.tage - b.tage)[0];
      return `<tr><td><a href="#/lauf/${esc(l.id)}">${esc(l.kontext.person)}</a><div class="small muted">${esc(l.kontext.funktion || "")}${l.eltern ? ` · ⧉ Unterprozess von ${esc(l.eltern.lauf)}` : ""}${l.ausloeser ? " · ⚡ automatisch" : ""}</div></td><td>${esc(l.titel)} <span class="small muted">v${esc(l.version)}</span></td>
        <td>${esc(l.stichtagName)}: ${datumKurz(l.kontext.stichtag)}<div class="small muted">${relTage(tageZwischen(l.kontext.stichtag, S.heute)).replace("vorher", "bis dahin").replace("nachher", "her")}</div></td>
        <td>${balken(p)}<div class="small muted">${e} von ${n} Schritten</div></td>
        <td>${l.abgeschlossen || l.abgebrochen ? laufStatus(l) : naechste ? `${l.pausiert ? laufStatus(l) + " " : ""}${badge(naechste.status, naechste)}${fristBadge(l, naechste)}<div class="small">${esc(naechste.titel)} · ${rolleBadge(naechste.rolle)}</div>` : ""}</td></tr>`;
    }).join("");
    const jeRolle = Object.keys(ROLLEN).map((r) => [r, offeneAufgaben(r).length]).filter(([, n]) => n);
    return `
      ${fuerSie()}
      <div class="seitenkopf"><div><h1>Übersicht</h1><p class="muted">Abläufe bestehen aus geplanten Schritten. Jeder Schritt ruft einen Vorgang in einem anderen Modul auf – ${wordmark("Flow")} plant, verteilt die Aufgaben und hält fest, was wann geschehen ist.</p></div>
        <div class="aktionen"><a class="btn primaer" href="#/neu">▶ Ablauf starten</a></div></div>
      <div class="karten">
        <div class="karte"><div class="zahl">${aktiv.length}</div><div class="titel">laufende Abläufe</div></div>
        <div class="karte"><div class="zahl">${alle.length}</div><div class="titel">offene Aufgaben (alle Rollen)</div></div>
        <div class="karte"><div class="zahl">${ueber.length}</div><div class="titel">${ueber.length ? "⚠ " : ""}überfällig</div></div>
        <div class="karte"><div class="zahl">${fehler.length}</div><div class="titel">${fehler.length ? "✕ " : ""}fehlgeschlagene Aufrufe</div></div>
        <div class="karte"><div class="zahl">${gef.length}</div><div class="titel">${gef.length ? "⚠ " : ""}Frist gefährdet (blockiert)</div></div>
        <div class="karte"><div class="zahl">${pausiert}</div><div class="titel">${pausiert ? "⏸ " : ""}pausierte Abläufe</div></div>
        <div class="karte"><a href="#/ausloeser" class="zahl">${heuteAusg}</a><div class="titel">⚡ heute automatisch gestartet</div></div>
      </div>
      <section><h2>Abläufe</h2><div class="tabelle-wrap"><table><thead><tr><th>Person</th><th>Ablauf</th><th>Stichtag</th><th>Fortschritt</th><th>Nächster Schritt</th></tr></thead><tbody>${zeilen || `<tr><td colspan="5" class="muted">Noch keine Abläufe.</td></tr>`}</tbody></table></div></section>
      <section style="margin-top:1.25rem"><h2>Jahreskalender: als Nächstes</h2>${kalListe(KAL.demnaechst(28, false).slice(0, 6))}<p class="small"><a href="#/kalender">Zum Jahreskalender</a></p></section>
      <section style="margin-top:1.25rem"><h2>Offene Aufgaben je Rolle</h2><p class="small muted">Wer zuständig ist, folgt aus der Vorlage bzw. dem Funktionendiagramm (V = operativer Lead).</p>
        <div class="karten">${jeRolle.map(([r, n]) => `<div class="karte"><div class="zahl">${n}</div><div class="titel">${rolleBadge(r)} ${esc(ROLLEN[r])}</div></div>`).join("") || `<p class="muted">Keine offenen Aufgaben.</p>`}</div></section>`;
  }

  function seiteAufgaben() {
    const meine = offeneAufgaben(S.rolle, true);
    const vertr = vertretungenHeute().filter((v) => v.vertretung === S.rolle);
    const abwesend = vertretungenHeute().filter((v) => v.rolle === S.rolle);
    const bald = [];
    S.laeufe.forEach((l) => l.schritte.forEach((s) => { if (s.rolle === S.rolle && ["wartet", "geplant"].includes(s.status) && tageZwischen(S.heute, fristVon(l, s)) <= 21) bald.push([l, s]); }));
    bald.sort((a, b) => fristVon(a[0], a[1]).localeCompare(fristVon(b[0], b[1])));
    const info = S.hinweise.filter((h) => h.rolle === S.rolle).slice(0, 12);
    const zeile = ([l, s], mitAktion) => `<tr><td>${badge(s.status, s)}${fristBadge(l, s)}</td><td><strong>${esc(s.titel)}</strong>${mitAktion && handeltFuer(s) && handeltFuer(s) !== S.rolle && !(D.EXTERN || []).includes(handeltFuer(s)) ? ` <span class="badge violett">in Vertretung für ${esc(handeltFuer(s))}</span>` : ""}${s.ausfuehrend === S.rolle ? ` <span class="badge info">delegiert von ${esc(s.delegiertVon || s.rolle)}</span>` : ""}<div class="small muted"><a href="#/lauf/${esc(l.id)}">${esc(l.kontext.person)} · ${esc(l.titel)}</a>${s.fd ? ` · FD ${esc(s.fd)}` : ""}</div>${s.fehler ? `<div class="small" style="color:var(--destructive)">✕ ${esc(s.fehler)}</div>` : ""}</td>
      <td>${datumKurz(fristVon(l, s))}</td><td>${aufrufText(s)}</td><td>${mitAktion ? aktionKnopf(l, s) + delegationKnopf(l, s) : (s.status === "wartet" ? `<span class="small muted">nach ${esc((s.nach || []).map((n) => (l.schritte.find((x) => x.id === n) || {}).titel).join(", "))}</span>` : `<span class="small muted">läuft automatisch am ${datumKurz(fristVon(l, s))}</span>`)}</td></tr>`;
    return `
      <div class="seitenkopf"><div><h1>Meine Aufgaben</h1><p class="muted">Rolle: ${rolleBadge(S.rolle)} ${esc(ROLLEN[S.rolle])}. Aufgaben entstehen, sobald die Vorgänger eines Schritts erledigt sind. Automatische Schritte erscheinen hier nur, wenn ein Aufruf fehlschlägt.</p></div></div>
      ${vertr.length ? `<p class="meldung info">Sie vertreten heute: ${vertr.map((v) => `<strong>${esc(ROLLEN[v.rolle] || v.rolle)}</strong> bis ${datumKurz(v.bis)}`).join(", ")} – deren Aufgaben stehen unten mit «in Vertretung».</p>` : ""}
      ${abwesend.length ? `<p class="meldung warnung">Für Ihre Funktion ist eine Abwesenheit erfasst (bis ${datumKurz(abwesend[0].bis)}); Ihre Aufgaben erscheinen auch bei ${abwesend.map((v) => esc(ROLLEN[v.vertretung] || v.vertretung)).join(", ")}.</p>` : ""}
      <section><h2>Zu erledigen (${meine.length})</h2><div class="tabelle-wrap"><table><thead><tr><th>Status</th><th>Schritt</th><th>Frist</th><th>Aufruf</th><th></th></tr></thead><tbody>${meine.map((x) => zeile(x, true)).join("") || `<tr><td colspan="5" class="muted">Nichts zu erledigen. 🎉</td></tr>`}</tbody></table></div></section>
      <section style="margin-top:1.25rem"><h2>Demnächst (21 Tage)</h2><div class="tabelle-wrap"><table><thead><tr><th>Status</th><th>Schritt</th><th>Frist</th><th>Aufruf</th><th></th></tr></thead><tbody>${bald.map((x) => zeile(x, false)).join("") || `<tr><td colspan="5" class="muted">Keine anstehenden Schritte.</td></tr>`}</tbody></table></div></section>
      <section style="margin-top:1.25rem"><h2>Termine aus dem Jahreskalender</h2><p class="small muted">Ereignisse der nächsten 4 Wochen (und überfällige), bei denen ${esc(ROLLEN[S.rolle])} laut Jahresplanung entscheidet oder verantwortlich ist.</p>${kalListe(KAL.demnaechst(28, true))}</section>
      <section style="margin-top:1.25rem"><h2>Zur Information</h2><p class="small muted">Mitteilungen an ${esc(ROLLEN[S.rolle])} – entspricht «I» im Funktionendiagramm bzw. «Kommunikation an» in der Prozessliste.</p>
        <ul class="infoliste">${info.map((h) => `<li><span class="small muted">${datumKurz(h.tag)}</span> ${esc(h.text)} <a class="small" href="#/lauf/${esc(h.lauf)}">Ablauf</a></li>`).join("") || `<li class="muted">Keine Mitteilungen.</li>`}</ul></section>`;
  }

  function kalListe(liste) {
    if (!liste.length) return `<p class="muted small">Keine anstehenden Ereignisse.</p>`;
    return `<ul class="infoliste">${liste.map((o) => `<li><button class="link" data-aktion="kal-oeffnen" data-id="${esc(o.ev.id)}" data-von="${esc(o.von)}">${esc(o.ev.titel)}</button> <span class="small muted">${KAL.wann(o)}</span> ${KAL.statusBadge(o)} ${o.ev.flow ? `<span class="badge violett" title="Mit Ablaufvorlage verknüpft">⇢ ${esc((vorlageVon(o.ev.flow) || { titel: "Ablauf" }).titel)}</span>` : ""}</li>`).join("")}</ul>`;
  }

  function seiteLaeufe() {
    const karten = S.laeufe.map((l) => {
      const [e, n, p] = fortschritt(l);
      return `<a class="karte laufkarte" href="#/lauf/${esc(l.id)}"><div class="small muted">${esc(l.id)} · ${esc(l.titel)} v${esc(l.version)}</div><h3>${esc(l.kontext.person)}</h3><div class="small">${esc(l.kontext.funktion || "")} · ${esc(l.stichtagName)} ${datumKurz(l.kontext.stichtag)}</div>${balken(p)}<div class="small muted">${l.abgebrochen ? "⊘ abgebrochen am " + datumKurz(l.abgebrochen) : l.abgeschlossen ? "✓ abgeschlossen am " + datumKurz(l.abgeschlossen) : `${l.pausiert ? "⏸ pausiert · " : ""}${e} von ${n} Schritten erledigt`}${l.eltern ? ` · ⧉ Unterprozess von ${esc(l.eltern.lauf)}` : ""}${l.ausloeser ? " · ⚡ " + esc(l.ausloeser) : ""}</div></a>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Laufende Abläufe</h1><p class="muted">Jeder Ablauf arbeitet mit einer Kopie der Vorlage in der Version beim Start – spätere Änderungen an der Vorlage verändern laufende Abläufe nicht.</p></div><div class="aktionen"><a class="btn primaer" href="#/neu">▶ Ablauf starten</a></div></div><div class="karten">${karten}</div>`;
  }

  function seiteLauf(id, reiter) {
    const l = laufVon(id);
    if (!l) return `<h1>Ablauf nicht gefunden</h1><p><a href="#/laeufe">Zur Liste</a></p>`;
    const [e, n, p] = fortschritt(l);
    reiter = reiter || "schritte";
    const kontext = Object.entries(l.kontext).map(([k, w]) => `<div class="feldzeile"><span class="muted">${esc(k)}</span><span>${esc(k === "stichtag" ? datum(w) : w)}</span></div>`).join("");
    const zeilen = l.schritte.map((s, i) => `<tr class="${["uebersprungen", "abgebrochen"].includes(s.status) ? "blass" : ""}">
      <td class="zahl">${i + 1}</td>
      <td><strong>${esc(s.titel)}</strong>${s.zusatz ? ` <span class="badge violett" title="Im laufenden Ablauf eingefügt">＋ eingefügt</span>` : ""}${s.quelle ? `<div class="quelle">📖 ${quelleHtml(s.quelle)}</div>` : ""}${s.bedingung && s.bedingung.feld ? `<div class="small muted">${istRef(s.bedingung) ? "Zweig" : "Bedingung"}: ${esc(bedingungText(s.bedingung, l.schritte))}${s.erzwungen ? " (aufgehoben)" : ""}</div>` : ""}${s.status === "uebersprungen" && s.grund ? `<div class="small muted">↷ ${esc(s.grund)}</div>` : ""}${s.fehler && s.status === "fehler" ? `<div class="small" style="color:var(--destructive)">✕ ${esc(s.fehler)}</div>` : ""}</td>
      <td>${rolleBadge(s.rolle)}${zustaendigText(s)}${s.fd ? `<div class="small muted">FD ${esc(s.fd)}</div>` : ""}${s.fd && fdEintrag(s.fd) ? merkmalHtml((fdEintrag(s.fd).merkmale || {})[s.rolle]) : ""}${s.instanzwechsel ? `<div class="small" title="${esc(s.instanzwechsel.grund)}">↑ statt ${esc(s.instanzwechsel.von)}${s.instanzwechsel.offen ? " – keine Instanz" : ""}</div>` : ""}</td>
      <td>${datumKurz(fristVon(l, s))}${fristartBadge(s)}<div class="small muted">${tKurz(s.tage)}</div></td>
      <td>${aufrufText(s)}${s.param ? `<div class="param">${Object.entries(s.param).map(([k, w]) => `${esc(k)}: ${esc(w)}`).join("<br>")}</div>` : ""}</td>
      <td>${badge(s.status, s)}${fristBadge(l, s)}${s.ergebnis ? `<div class="param">${Object.entries(s.ergebnis).map(([k, w]) => `→ ${esc(k)}: ${k === "ablauf" ? `<a href="#/lauf/${esc(w)}">${esc(w)}</a>` : esc(w)}`).join("<br>")}</div>` : ""}${s.erledigtAm ? `<div class="small muted">${datumKurz(s.erledigtAm)}</div>` : ""}</td>
      <td>${aktionKnopf(l, s)}${delegationKnopf(l, s)}${eingriffKnoepfe(l, s)}</td></tr>`).join("");
    const aufrufe = S.aufrufe.filter((a) => a.lauf === l.id);
    const kinder = S.laeufe.filter((x) => x.eltern && x.eltern.lauf === l.id);
    const offen = !l.abgeschlossen && !l.abgebrochen;
    const d = `data-lauf="${esc(l.id)}"`;
    const eingriffe = darfEingreifen(l) && offen ? `<div class="aktionen">
        <button class="btn" data-aktion="ein-pause" ${d}>${l.pausiert ? "▶ Fortsetzen" : "⏸ Pausieren"}</button>
        <button class="btn" data-aktion="ein-stichtag" ${d}>📅 Stichtag verschieben</button>
        <button class="btn" data-aktion="ein-einfuegen" ${d}>＋ Schritt einfügen</button>
        <button class="btn gefahr" data-aktion="ein-abbrechen" ${d}>⊘ Abbrechen</button></div>` : "";
    const journalHtml = (l.journal || []).length ? `<div class="tabelle-wrap"><table><thead><tr><th>Wann</th><th>Wer</th><th>Art</th><th>Was</th><th>Begründung</th></tr></thead><tbody>${l.journal.map((j) => `<tr><td class="small">${datumKurz(j.tag)}<div class="muted">${esc(j.uhr)}</div></td><td class="small">${esc(j.wer)}</td><td><span class="badge ${["Abbruch", "Eskalation", "Kompensation"].includes(j.art) ? "warnung" : j.art === "Eingriff" ? "violett" : "neutral"}">${esc(j.art)}</span></td><td class="small">${esc(j.text)}</td><td class="small">${esc(j.grund)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Noch keine Einträge.</p>`;
    return `
      <div class="seitenkopf"><div><div class="small muted"><a href="#/laeufe">Laufende Abläufe</a> › ${esc(l.id)}</div><h1>${esc(l.titel)}: ${esc(l.kontext.person)} ${laufStatus(l)}</h1>
        <p class="muted">Vorlage Version ${esc(l.version)}, gestartet ${datumKurz(l.gestartet)} · ${esc(l.stichtagName)}: ${datum(l.kontext.stichtag)}${l.ereignisTitel ? ` · aus dem <a href="#/kalender/liste">Jahreskalender</a>: ${esc(l.ereignisTitel)}` : ""}${l.ausloeser ? ` · ⚡ ${esc(l.ausloeser)}` : ""}${l.eltern ? ` · ⧉ Unterprozess von <a href="#/lauf/${esc(l.eltern.lauf)}">${esc(l.eltern.lauf)}</a>` : ""}</p></div>${eingriffe}</div>
      ${l.pausiert ? `<p class="meldung warnung">⏸ Pausiert: Es laufen keine automatischen Schritte, Fristen werden nicht eskaliert, Aufgaben erscheinen nicht unter «Meine Aufgaben».</p>` : ""}
      ${l.abgebrochen ? `<p class="meldung info">⊘ Abgebrochen am ${datumKurz(l.abgebrochen)}. Bereits ausgeführte Aufrufe stehen im Journal (Kompensation).</p>` : ""}
      ${darfEingreifen(l) || !offen ? "" : `<p class="small muted">Eingriffe (pausieren, abbrechen, Stichtag verschieben, Schritte überspringen oder einfügen) dürfen die Prozessverantwortlichen dieser Vorlage: ${pvVon(l).map((r) => esc(ROLLEN[r] || r)).join(", ")}.</p>`}
      <div class="spalten" style="grid-template-columns: 2fr 1fr; margin-bottom:1rem">
        <div class="karte"><div class="titel muted small">Fortschritt</div><div class="zahl">${p} %</div>${balken(p)}<div class="small muted">${e} von ${n} Schritten erledigt oder übersprungen${l.abgeschlossen ? " · ✓ abgeschlossen am " + datumKurz(l.abgeschlossen) : ""}</div>${kinder.length ? `<div class="small" style="margin-top:.5rem">Unterprozesse: ${kinder.map((k) => `<a href="#/lauf/${esc(k.id)}">${esc(k.id)} ${esc(k.titel)}</a> ${laufStatus(k) || `(${fortschritt(k)[2]} %)`}`).join(" · ")}</div>` : ""}</div>
        <div class="karte"><div class="titel muted small">Kontext (Eingaben beim Start)</div><div class="feldliste">${kontext}</div></div>
      </div>
      <div class="reiter" role="tablist">
        <button role="tab" aria-selected="${reiter === "schritte"}" data-aktion="reiter" data-ziel="#/lauf/${esc(l.id)}/schritte">Schritte</button>
        <button role="tab" aria-selected="${reiter === "bild"}" data-aktion="reiter" data-ziel="#/lauf/${esc(l.id)}/bild">Ablaufbild</button>
        <button role="tab" aria-selected="${reiter === "journal"}" data-aktion="reiter" data-ziel="#/lauf/${esc(l.id)}/journal">Journal (${(l.journal || []).length})</button>
        <button role="tab" aria-selected="${reiter === "protokoll"}" data-aktion="reiter" data-ziel="#/lauf/${esc(l.id)}/protokoll">Aufrufe (${aufrufe.length})</button>
      </div>
      ${reiter === "bild" ? legende() + ablaufbild(l.schritte, { lauf: l })
        : reiter === "protokoll" ? protokollTabelle(aufrufe)
        : reiter === "journal" ? `<p class="small muted">Fachliches Journal: Start, Entscheide, Unterprozesse, Eskalationen ab Stufe 3 und alle Eingriffe mit Begründung. Technische Aufrufe stehen unter «Aufrufe».</p>${journalHtml}`
        : `<div class="tabelle-wrap"><table><thead><tr><th class="zahl">#</th><th>Schritt</th><th>Wer</th><th>Frist</th><th>Art bzw. Aufruf</th><th>Status und Ergebnis</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></div>`}`;
  }
  const legende = () => `<p class="small muted legende">${Object.keys(STATUS).map((k) => badge(k)).join(" ")}</p>`;

  function seiteNeu(vid) {
    const frei = S.vorlagen.filter((v) => v.status === "freigegeben");
    const v = vorlageVon(vid) && vorlageVon(vid).status === "freigegeben" ? vorlageVon(vid) : frei[0];
    if (!v) return `<h1>Ablauf starten</h1><p class="meldung warnung">Keine freigegebene Vorlage vorhanden.</p>`;
    const E = START_EINGABE[v.id] || (START_EINGABE[v.id] = startVorgabe(v));
    const feld = (f) => {
      const w = E[f.key] == null ? "" : E[f.key];
      if (f.typ === "auswahl") return `<label class="feld">${esc(f.label)}<select data-aktion="start-feld" data-key="${esc(f.key)}">${f.werte.map((x) => `<option ${x === w ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
      return `<label class="feld">${esc(f.label)}<input type="${f.typ === "datum" ? "date" : f.typ === "zahl" ? "number" : "text"}" value="${esc(w)}" data-aktion="start-feld" data-key="${esc(f.key)}"></label>`;
    };
    const probe = { kontext: E, schritte: v.schritte.map((s) => Object.assign({}, s, { ergebnis: null })) };
    const zweigHaengt = new Set();
    v.schritte.forEach((s) => { if (istRef(s.bedingung) || (s.nach || []).some((n) => zweigHaengt.has(n) && (s.nach || []).every((m) => zweigHaengt.has(m)))) zweigHaengt.add(s.id); });
    const zeilen = v.schritte.map((s, i) => {
      if (zweigHaengt.has(s.id)) return `<tr><td class="zahl">${i + 1}</td><td>${esc(s.titel)}</td><td>${rolleBadge(s.rolle)}</td><td>${E.stichtag ? datumKurz(addTage(E.stichtag, s.tage)) : "–"}${fristartBadge(s)}</td><td>${aufrufText(s)}</td><td><span class="badge violett">◇ entscheidet sich im Ablauf</span>${istRef(s.bedingung) ? `<div class="small muted">${esc(bedingungText(s.bedingung, v.schritte))}</div>` : ""}</td></tr>`;
      const ok = bedingungErfuellt(s.bedingung, probe);
      const frist = E.stichtag ? addTage(E.stichtag, s.tage) : "";
      const vergangen = frist && frist < S.heute;
      return `<tr class="${ok ? "" : "blass"}"><td class="zahl">${i + 1}</td><td>${esc(s.titel)}</td><td>${rolleBadge(s.rolle)}</td><td>${datumKurz(frist)}${fristartBadge(s)}${vergangen && ok ? ` <span class="badge warnung">! schon vorbei</span>` : ""}</td><td>${aufrufText(s)}${s.auto ? ` <span class="badge violett">auto</span>` : ""}</td><td>${ok ? `<span class="badge info">● wird geplant</span>` : `<span class="badge neutral">– entfällt</span><div class="small muted">${esc(bedingungText(s.bedingung))}</div>`}</td></tr>`;
    }).join("");
    const knapp = E.stichtag && v.schritte.some((s) => !istRef(s.bedingung) && bedingungErfuellt(s.bedingung, probe) && addTage(E.stichtag, s.tage) < S.heute);
    const doppel = S.ausgeloest[startSchluessel(v, E)] && laufVon(S.ausgeloest[startSchluessel(v, E)]);
    return `
      <div class="seitenkopf"><div><h1>Ablauf starten</h1><p class="muted">Vorlage wählen, Angaben erfassen – ${wordmark("Flow")} rechnet die Fristen vom Stichtag aus und lässt Schritte weg, deren Bedingung nicht zutrifft.</p></div></div>
      ${START_EREIGNIS[v.id] ? `<p class="meldung info">Aus dem Jahreskalender: <strong>${esc(START_EREIGNIS[v.id].titel)}</strong> – Stichtag vom Ereignis übernommen.</p>` : ""}
      <div class="formzeile"><label class="feld">Vorlage<select data-aktion="start-vorlage">${[...new Set(frei.map((x) => x.gruppe || "Weitere"))].map((g) => `<optgroup label="${esc(g)}">${frei.filter((x) => (x.gruppe || "Weitere") === g).map((x) => `<option value="${esc(x.id)}" ${x.id === v.id ? "selected" : ""}>${esc(x.titel)} (v${esc(x.version)})</option>`).join("")}</optgroup>`).join("")}</select></label></div>
      <div class="karte" style="margin-bottom:1rem"><p class="small muted">${esc(v.beschreibung)}</p><div class="formzeile">${v.felder.map(feld).join("")}</div>
        ${knapp ? `<p class="meldung warnung">⚠ Einzelne Fristen liegen schon in der Vergangenheit – diese Schritte sind ab Start überfällig.</p>` : ""}
        ${doppel && !doppel.abgebrochen ? `<p class="meldung warnung">⚠ Mit gleicher Bezeichnung und gleichem Stichtag läuft bereits <a href="#/lauf/${esc(doppel.id)}">${esc(doppel.id)}</a>. Ein zweiter Start ist möglich, aber vermutlich doppelt.</p>` : ""}
        ${(v.ausloeser || []).length ? `<p class="small muted">Diese Vorlage startet auch automatisch: ${v.ausloeser.map((a) => esc(ausloeserText(a))).join(" · ")}</p>` : ""}
        <button class="btn primaer" data-aktion="starten" data-vorlage="${esc(v.id)}" ${E.person && E.stichtag ? "" : "disabled"}>▶ Ablauf starten</button></div>
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
      return `<div class="karte"><div class="small muted">Version ${esc(v.version)} · ${v.schritte.length} Schritte · ${laufend} laufend</div><h3><a href="#/vorlage/${esc(v.id)}">${esc(v.titel)}</a></h3><p class="small">${esc(v.beschreibung)}</p>
        <div>${v.status === "freigegeben" ? `<span class="badge erfolg">✓ freigegeben</span>` : `<span class="badge warnung">✎ Entwurf</span>`} ${f ? `<span class="badge fehler">✕ ${f} Fehler</span>` : ""} ${w ? `<span class="badge warnung">⚠ ${w} Hinweise</span>` : ""} ${(v.ausloeser || []).length ? `<span class="badge violett" title="${esc(v.ausloeser.map(ausloeserText).join(" · "))}">⚡ ${v.ausloeser.length} Auslöser</span>` : ""} ${v.schritte.some((x) => typVon(x) === "unterprozess") ? `<span class="badge neutral">⧉ mit Unterprozess</span>` : ""}</div></div>`;
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
      <td><strong>${esc(s.titel)}</strong><div class="small muted">${esc(s.id)}${s.bedingung && s.bedingung.feld ? " · nur wenn " + esc(bedingungText(s.bedingung, v.schritte)) : ""}</div></td>
      <td>${rolleBadge(s.rolle)}${s.fd ? `<div class="small muted">FD ${esc(s.fd)}</div>` : ""}${(s.informiert || []).length ? `<div class="small muted">I: ${s.informiert.map(esc).join(", ")}</div>` : ""}</td>
      <td>${tKurz(s.tage)}${fristartBadge(s)}<div class="small muted">${relTage(s.tage)}</div></td>
      <td class="small">${(s.nach || []).map((n) => { const q = v.schritte.findIndex((x) => x.id === n); return q >= 0 ? "#" + (q + 1) : esc(n); }).join(", ") || "–"}</td>
      <td>${aufrufText(s)}${s.aktion ? `<div class="param">${Object.entries(s.aktion.param || {}).map(([k, w]) => `${esc(k)}: ${esc(w)}`).join("<br>")}</div>` : ""}</td>
      <td>${typVon(s) === "aufruf" ? (s.auto ? `<span class="badge violett">◷ automatisch</span>` : `<span class="badge info">● bestätigen</span>`) : ["warten", "benachrichtigung", "unterprozess"].includes(typVon(s)) ? `<span class="badge violett">◷ durch Flow</span>` : `<span class="badge neutral">✋ von Hand</span>`}</td>
      <td class="quelle">${quelleHtml(s.quelle)}</td>
      <td style="white-space:nowrap">${darf ? `<button class="btn klein" data-aktion="schritt-bearbeiten" data-id="${esc(s.id)}" aria-label="Bearbeiten">✎</button> <button class="btn klein" data-aktion="schritt-hoch" data-id="${esc(s.id)}" aria-label="Nach oben" ${i ? "" : "disabled"}>↑</button> <button class="btn klein" data-aktion="schritt-runter" data-id="${esc(s.id)}" aria-label="Nach unten" ${i < v.schritte.length - 1 ? "" : "disabled"}>↓</button> <button class="btn klein gefahr" data-aktion="schritt-loeschen" data-id="${esc(s.id)}" aria-label="Löschen">✕</button>` : ""}</td></tr>`).join("");
    const felder = v.felder.map((f) => `<tr><td><code>{${esc(f.key)}}</code></td><td>${esc(f.label)}</td><td>${esc(f.typ)}${f.werte ? `<div class="small muted">${esc(f.werte.join(", "))}</div>` : ""}</td></tr>`).join("");
    return `
      <div class="seitenkopf"><div><div class="small muted"><a href="#/vorlagen">Ablaufvorlagen</a> › ${esc(v.id)}</div><h1>${esc(v.titel)}</h1>
        <p class="muted">Version ${esc(v.version)} · ${v.status === "freigegeben" ? `<span class="badge erfolg">✓ freigegeben</span>` : `<span class="badge warnung">✎ Entwurf</span>`} · Stichtag: ${esc(v.stichtag)} · ${esc(v.beschreibung)}</p></div>
        <div class="aktionen">
          ${darf ? `<button class="btn" data-aktion="schritt-neu">＋ Schritt</button>` : ""}
          ${v.status === "entwurf" ? `<button class="btn primaer" data-aktion="freigeben" ${S.rolle === "RV" && !fehler.length ? "" : `disabled title="${S.rolle !== "RV" ? "Freigabe durch Ressortvorstand (E, FD 1.1.5)" : "Erst Fehler beheben"}"`}>✓ Freigeben</button>` : `<a class="btn primaer" href="#/neu/${esc(v.id)}">▶ Ablauf starten</a>`}
        </div></div>
      ${darf ? "" : `<p class="meldung info">Bearbeiten kann die Schulverwaltung (V), freigeben der Ressortvorstand (E) – Rolle oben rechts wechseln.</p>`}
      ${v.status === "freigegeben" && darf ? `<p class="small muted">Eine Änderung macht aus der freigegebenen Version ${esc(v.version)} einen Entwurf der Version ${esc(v.version + 1)}. Laufende Abläufe bleiben auf ihrer Version.</p>` : ""}
      <p class="small">Prozessverantwortlich (darf in laufende Abläufe eingreifen): ${darf ? `${[...new Set([...(v.prozessverantwortlich || []), ...ES.aktiveFunktionen().map((e) => e.kuerzel).filter((k) => ["SV", "SL", "SPr", "RV", "SPF", "ICT", "HD", "GL", "LSV", "HR", "FIN"].includes(k))])].map((r) => `<label class="chip" title="${esc(ROLLEN[r] || r)}"><input type="checkbox" data-aktion="pv-rolle" data-rolle="${esc(r)}" ${(v.prozessverantwortlich || []).includes(r) ? "checked" : ""}> ${esc(r)}</label>`).join(" ")}` : (v.prozessverantwortlich || []).map((r) => rolleBadge(r)).join(" ")}</p>
      ${meldungen}
      <div class="reiter" role="tablist">
        <button role="tab" aria-selected="${reiter === "bild"}" data-aktion="reiter" data-ziel="#/vorlage/${esc(v.id)}/bild">Ablaufbild</button>
        <button role="tab" aria-selected="${reiter === "liste"}" data-aktion="reiter" data-ziel="#/vorlage/${esc(v.id)}/liste">Schritte (${v.schritte.length})</button>
        <button role="tab" aria-selected="${reiter === "felder"}" data-aktion="reiter" data-ziel="#/vorlage/${esc(v.id)}/felder">Kontextfelder</button>
        <button role="tab" aria-selected="${reiter === "ausloeser"}" data-aktion="reiter" data-ziel="#/vorlage/${esc(v.id)}/ausloeser">Auslöser (${(v.ausloeser || []).length})</button>
      </div>
      ${reiter === "bild" ? `${quellenVerzeichnis(v.schritte)}<p class="small muted">Bahnen = verantwortliche Rolle, von links nach rechts = Reihenfolge (Pfeil = «nach»). ${darf ? "Schritt anklicken zum Bearbeiten." : ""} Gestrichelt = nur unter Bedingung.</p>${ablaufbild(v.schritte)}`
        : reiter === "ausloeser" ? vorlageAusloeser(v, darf)
        : reiter === "felder" ? `<p class="small muted">Angaben beim Start eines Ablaufs. Sie stehen als Platzhalter in den Parametern zur Verfügung, dazu <code>{stichtag+N}</code>/<code>{stichtag-N}</code> und Ergebnisse früherer Schritte wie <code>{o5.benutzername}</code>.</p><div class="tabelle-wrap"><table><thead><tr><th>Platzhalter</th><th>Bezeichnung</th><th>Typ</th></tr></thead><tbody>${felder}</tbody></table></div>`
        : `<div class="tabelle-wrap"><table><thead><tr><th class="zahl">#</th><th>Schritt</th><th>Wer</th><th>Frist</th><th>Nach</th><th>Aufruf</th><th>Ausführung</th><th>Quelle</th><th></th></tr></thead><tbody>${zeilen}</tbody></table></div>${quellenVerzeichnis(v.schritte)}`}`;
  }

  function vorlageAusloeser(v, darf) {
    const liste = (v.ausloeser || []).map((a, i) => `<li>${esc(ausloeserText(a))} ${darf ? `<button class="btn klein gefahr" data-aktion="ausl-weg" data-i="${i}" aria-label="Auslöser entfernen">✕</button>` : ""}</li>`).join("");
    const evs = S.ereignisse.filter((e) => !e.flow || e.flow === v.id).slice().sort((a, b) => a.titel.localeCompare(b.titel));
    const neu = darf ? `<div class="karte" style="margin-top:1rem"><h3>Auslöser hinzufügen</h3><div class="formzeile">
        <label class="feld">Art<select id="ausl-art" data-aktion="ausl-art"><option value="ereignis" ${AUSL_ART === "ereignis" ? "selected" : ""}>Modul-Ereignis (Datensatz, Status)</option><option value="kalender" ${AUSL_ART === "kalender" ? "selected" : ""}>Jahreskalender (automatisch)</option><option value="abschluss" ${AUSL_ART === "abschluss" ? "selected" : ""}>Abschluss eines Ablaufs</option></select></label>
        <label class="feld">Quelle<select id="ausl-quelle">${AUSL_ART === "ereignis" ? D.MODULEREIGNISSE.map((e) => `<option value="${e.id}">${esc(e.titel)} (${esc(e.art)})</option>`).join("")
          : AUSL_ART === "kalender" ? evs.map((e) => `<option value="${e.id}">${esc(e.titel)}</option>`).join("")
          : S.vorlagen.filter((x) => x.id !== v.id).map((x) => `<option value="${esc(x.id)}">${esc(x.titel)}</option>`).join("")}</select></label>
        ${AUSL_ART === "abschluss" ? `<label class="feld">Stichtag + Tage<input type="number" id="ausl-versatz" value="0"></label>` : ""}
        <button class="btn" data-aktion="ausl-neu" style="align-self:end">＋ Hinzufügen</button></div>
        <p class="small muted">Eine Änderung macht aus der Vorlage einen Entwurf; ausgelöst werden nur freigegebene Vorlagen.</p></div>` : "";
    return `<p class="small muted">Neben dem Start von Hand kann eine Vorlage automatisch starten. Doppelte Starts (gleiche Bezeichnung, gleicher Stichtag) werden nicht ausgeführt, sondern protokolliert. <a href="#/ausloeser">Alle Auslöser und Simulation</a></p>
      <ul class="infoliste">${liste || `<li class="muted">Nur Start von Hand.</li>`}</ul>${neu}`;
  }
  let AUSL_ART = "ereignis";

  const darfVertretung = () => ["SV", "SL", "SPr"].includes(S.rolle);
  function seiteVertretungen() {
    const h = S.heute;
    const stand = (v) => (v.bis < h ? ["neutral", "vorbei"] : v.von > h ? ["info", "geplant"] : ["erfolg", "gilt heute"]);
    const betroffen = (v) => v.von <= h && h <= v.bis ? offeneAufgaben(v.rolle).length : 0;
    const zeilen = (S.vertretungen || []).slice().sort((a, b) => a.von.localeCompare(b.von)).map((v) => `<tr class="${v.bis < h ? "blass" : ""}">
      <td>${rolleBadge(v.rolle)} ${esc(ROLLEN[v.rolle] || v.rolle)}</td><td>${datumKurz(v.von)} – ${datumKurz(v.bis)}</td><td>${rolleBadge(v.vertretung)} ${esc(ROLLEN[v.vertretung] || v.vertretung)}</td>
      <td class="small">${esc(v.grund)}</td><td><span class="badge ${stand(v)[0]}">${stand(v)[1]}</span>${betroffen(v) ? ` <span class="small muted">${betroffen(v)} Aufgaben</span>` : ""}</td>
      <td>${darfVertretung() ? `<button class="btn klein gefahr" data-aktion="vertretung-weg" data-id="${esc(v.id)}" aria-label="Stellvertretung löschen">✕</button>` : ""}</td></tr>`).join("");
    return `<div class="seitenkopf"><div><h1>Stellvertretungen</h1><p class="muted">Während einer Abwesenheit erscheinen die Aufgaben der abwesenden Funktion bei der Stellvertretung unter «Meine Aufgaben» («in Vertretung»); Hinweise und Eskalationen gehen zusätzlich an sie. Die Verantwortung bleibt bei der abwesenden Funktion; das Journal hält fest, wer in Vertretung gehandelt hat.</p></div>
        <div class="aktionen"><button class="btn primaer" data-aktion="vertretung-neu" ${darfVertretung() ? "" : 'disabled title="Schulverwaltung, Schulleitung oder Schulpräsidium"'}>＋ Stellvertretung</button></div></div>
      <p class="small muted">Im Betrieb kommen Abwesenheiten aus EduKSX-Staffing bzw. EduKSX-Time; im Prototyp werden sie hier erfasst. Delegation einzelner Aufgaben: Knopf «↪ Delegieren» beim Schritt.</p>
      <div class="tabelle-wrap"><table><thead><tr><th>Abwesend</th><th>Zeitraum</th><th>Stellvertretung</th><th>Grund</th><th>Stand</th><th></th></tr></thead><tbody>${zeilen || `<tr><td colspan="6" class="muted">Keine Stellvertretungen.</td></tr>`}</tbody></table></div>`;
  }
  /** Rollenbezogener Teil der Übersicht (Stufe 2). */
  function fuerSie() {
    const r = S.rolle, h = S.heute;
    const meine = offeneAufgaben(r, true);
    const ueber = meine.filter(([l, x]) => ueberfaellig(l, x));
    const entscheide = meine.filter(([, x]) => ["genehmigung", "entscheidung"].includes(typVon(x)));
    const vertretung = meine.filter(([, x]) => !handelnde(x).includes(r));
    const delegiert = meine.filter(([, x]) => x.ausfuehrend === r);
    const liste = (l, leer) => (l.length ? `<ul class="infoliste">${l.slice(0, 6).map(([lf, x]) => `<li><a href="#/lauf/${esc(lf.id)}">${esc(x.titel)}</a> <span class="small muted">${esc(lf.kontext.person)} · ${datumKurz(fristVon(lf, x))}</span>${fristBadge(lf, x)}</li>`).join("")}</ul>` : `<p class="small muted">${leer}</p>`);
    let teil = "";
    if (["SPF", "SPr", "RV"].includes(r)) {
      const esk = []; S.laeufe.forEach((l) => { if (!l.abgeschlossen && !l.abgebrochen) l.schritte.forEach((x) => { if (eskStufe(x) >= 3 && !ERLEDIGT.includes(x.status)) esk.push([l, x]); }); });
      const ges = []; S.laeufe.forEach((l) => { if (!l.abgeschlossen && !l.abgebrochen) l.schritte.forEach((x) => { const d = tageZwischen(h, fristVon(l, x)); if (x.fristart === "gesetzlich" && !ERLEDIGT.includes(x.status) && d >= 0 && d <= 30) ges.push([l, x]); }); });
      teil = `<div class="spalten"><div class="karte"><h3>Wartet auf Ihren Entscheid</h3>${liste(entscheide, "Keine Genehmigungen offen.")}</div><div class="karte"><h3>Eskalationen (ab Stufe 3)</h3>${liste(esk, "Keine Eskalationen.")}</div><div class="karte"><h3>Gesetzliche Fristen (30 Tage)</h3>${liste(ges.sort((a, b) => fristVon(a[0], a[1]).localeCompare(fristVon(b[0], b[1]))), "Keine gesetzlichen Fristen.")}</div></div>`;
    } else if (r === "ICT") {
      const fehl = offeneAufgaben(null).filter(([, x]) => x.status === "fehler");
      const auto = []; S.laeufe.forEach((l) => { if (!l.abgeschlossen && !l.abgebrochen && !l.pausiert) l.schritte.forEach((x) => { if (x.status === "geplant" && tageZwischen(h, fristVon(l, x)) <= 7) auto.push([l, x]); }); });
      teil = `<div class="spalten"><div class="karte"><h3>Fehlgeschlagene Aufrufe</h3>${liste(fehl, "Keine Fehler.")}</div><div class="karte"><h3>Automatische Schritte (7 Tage)</h3>${liste(auto, "Keine geplanten Aufrufe.")}</div><div class="karte"><h3>Heute ausgelöst</h3><p class="zahl">${S.ausloesungen.filter((x) => x.tag === h && x.ergebnis === "gestartet").length}</p><p class="small"><a href="#/ausloeser">Auslöseprotokoll</a></p></div></div>`;
    } else {
      const last = {}; S.laeufe.forEach((l) => { if (!l.abgeschlossen && !l.abgebrochen) l.schritte.forEach((x) => { const d = tageZwischen(h, fristVon(l, x)); if (!ERLEDIGT.includes(x.status) && d <= 30) handelnde(x).forEach((q) => { last[q] = (last[q] || 0) + 1; }); }); });
      const max = Math.max(1, ...Object.values(last));
      const balkenListe = Object.entries(last).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([q, n]) => `<div class="lastzeile"><span>${rolleBadge(q)}</span><span class="lastbalken" style="width:${Math.round((n / max) * 100)}%" role="img" aria-label="${n} Schritte"></span><span class="small">${n}</span></div>`).join("");
      teil = `<div class="spalten"><div class="karte"><h3>Meine nächsten Aufgaben</h3>${liste(meine, "Nichts zu erledigen.")}</div><div class="karte"><h3>Belastung je Funktion (fällig in 30 Tagen inkl. überfällig)</h3>${balkenListe || '<p class="small muted">Keine.</p>'}</div></div>`;
    }
    return `<section class="fuersie" style="margin-bottom:1.25rem"><h2>Für ${esc(ROLLEN[r] || r)}</h2>
      <div class="karten">
        <a class="karte" href="#/aufgaben"><div class="zahl">${meine.length}</div><div class="titel">meine offenen Aufgaben</div></a>
        <div class="karte"><div class="zahl">${ueber.length}</div><div class="titel">${ueber.length ? "⚠ " : ""}davon überfällig</div></div>
        <div class="karte"><div class="zahl">${entscheide.length}</div><div class="titel">Genehmigungen und Entscheide</div></div>
        <div class="karte"><div class="zahl">${vertretung.length}</div><div class="titel">in Vertretung${delegiert.length ? ` · ${delegiert.length} an mich delegiert` : ""}</div></div>
      </div>${teil}</section>`;
  }

  function seiteAusloeser() {
    const karten = D.MODULEREIGNISSE.map((me) => {
      const m = D.MODULE.find((x) => x.key === me.modul);
      const ziele = mitAusloeser("ereignis").filter(([, a]) => a.ereignis === me.id).map(([v]) => v);
      const E = EREIGNIS_EINGABE[me.id] || (EREIGNIS_EINGABE[me.id] = Object.fromEntries(me.felder.map((f) => [f.key, f.typ === "auswahl" ? f.werte[0] : f.typ === "datum" ? addTage(S.heute, 45) : f.typ === "zahl" ? (f.key === "pensumAlt" ? 100 : 80) : ""])));
      const feld = (f) => f.typ === "auswahl"
        ? `<label class="feld">${esc(f.label)}<select data-aktion="ereignis-feld" data-ev="${esc(me.id)}" data-key="${esc(f.key)}">${f.werte.map((x) => `<option ${x === E[f.key] ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`
        : `<label class="feld">${esc(f.label)}<input type="${f.typ === "datum" ? "date" : f.typ === "zahl" ? "number" : "text"}" value="${esc(E[f.key])}" data-aktion="ereignis-feld" data-ev="${esc(me.id)}" data-key="${esc(f.key)}"></label>`;
      return `<div class="karte"><div class="small muted">${wordmark(m ? m.name : me.modul)} · ${esc(me.art)}</div><h3>⚡ ${esc(me.titel)}</h3>
        <p class="small">Startet: ${ziele.map((v) => `<a href="#/vorlage/${esc(v.id)}/ausloeser">${esc(v.titel)}</a>`).join(", ") || `<span class="muted">keine freigegebene Vorlage</span>`}</p>
        <div class="formzeile">${me.felder.map(feld).join("")}</div>
        <button class="btn primaer" data-aktion="ereignis-senden" data-ev="${esc(me.id)}" ${E.person ? "" : "disabled title=\"Name fehlt\""}>⚡ Ereignis simulieren</button></div>`;
    }).join("");
    const alle = S.vorlagen.flatMap((v) => (v.ausloeser || []).map((a) => [v, a]));
    const st = { gestartet: "erfolg", doppelt: "warnung", "ohne Ablauf": "neutral" };
    return `<div class="seitenkopf"><div><h1>Auslöser</h1><p class="muted">Abläufe starten nicht nur von Hand: ein Ereignis eines Moduls (Datensatz erstellt oder geändert, Status geändert), ein Termin im Jahreskalender oder der Abschluss eines anderen Ablaufs kann sie auslösen. ${wordmark("Flow")} hört nur zu – die Module melden ihre Ereignisse.</p></div></div>
      <section><h2>Modul-Ereignisse simulieren</h2><p class="small muted">Im Prototyp gibt es die Module nicht; hier wird ein Ereignis so ausgelöst, als käme es aus dem Modul.</p><div class="karten">${karten}</div></section>
      <section style="margin-top:1.25rem"><h2>Alle Auslöser (${alle.length})</h2><div class="tabelle-wrap"><table><thead><tr><th>Vorlage</th><th>Auslöser</th><th>Stand</th></tr></thead><tbody>${alle.map(([v, a]) => `<tr><td><a href="#/vorlage/${esc(v.id)}/ausloeser">${esc(v.titel)}</a></td><td>${esc(ausloeserText(a))}</td><td>${v.status === "freigegeben" ? `<span class="badge erfolg">✓ aktiv</span>` : `<span class="badge warnung">✎ Entwurf – inaktiv</span>`}</td></tr>`).join("")}</tbody></table></div></section>
      <section style="margin-top:1.25rem"><h2>Auslöseprotokoll</h2>${S.ausloesungen.length ? `<div class="tabelle-wrap"><table><thead><tr><th>Wann</th><th>Quelle</th><th>Vorlage</th><th>Ergebnis</th></tr></thead><tbody>${S.ausloesungen.map((x) => `<tr><td class="small">${datumKurz(x.tag)}<div class="muted">${esc(x.uhr)}</div></td><td class="small">${esc(x.quelle)}</td><td class="small">${x.vorlage ? esc((vorlageVon(x.vorlage) || { titel: x.vorlage }).titel) : "–"}</td><td><span class="badge ${st[x.ergebnis] || "neutral"}">${esc(x.ergebnis)}</span> <span class="small">${x.lauf ? `<a href="#/lauf/${esc(x.lauf)}">${esc(x.text)}</a>` : esc(x.text)}</span></td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Noch keine Auslösungen.</p>`}</section>`;
  }
  const EREIGNIS_EINGABE = {};

  function seiteVorgaenge() {
    const verwendung = {};
    S.vorlagen.forEach((v) => v.schritte.forEach((s) => { if (s.aktion) (verwendung[s.aktion.vorgang] = verwendung[s.aktion.vorgang] || []).push(v.titel + ": " + s.titel); }));
    const karten = D.MODULE.map((m) => `
      <section class="karte" style="margin-bottom:1rem">
        <div class="bereichskopf" style="margin-top:0"><h2>${wordmark(m.name)} <span class="small muted">${esc(m.aufgabe)}</span></h2>
          <label class="small"><input type="checkbox" data-aktion="erreichbar" data-key="${esc(m.key)}" ${S.erreichbar[m.key] ? "checked" : ""}> Modul erreichbar (Simulation)</label></div>
        ${S.erreichbar[m.key] ? "" : `<p class="meldung fehler">✕ Simuliert: EduKSX-${esc(m.name)} antwortet nicht. Automatische Schritte schlagen fehl und erscheinen als Aufgabe beim ICT-Support bzw. der zuständigen Rolle.</p>`}
        <div class="tabelle-wrap"><table><thead><tr><th>Vorgang</th><th>Parameter</th><th>Ergebnis</th><th>Antwort</th><th>Verwendet in</th></tr></thead><tbody>
        ${m.vorgaenge.map((v) => `<tr><td><strong>${esc(v.titel)}</strong><div class="param">${esc(v.id)}</div></td><td class="param">${v.parameter.map(esc).join(", ")}</td><td class="param">${v.ergebnis.map(esc).join(", ")}</td><td>${v.art === "sofort" ? `<span class="badge erfolg">sofort</span>` : `<span class="badge warnung">⧗ mit Rückmeldung</span>`}</td><td class="small">${(verwendung[v.id] || []).length ? `<details><summary>${verwendung[v.id].length} Schritt(e)</summary>${verwendung[v.id].map(esc).join("<br>")}</details>` : `<span class="muted">–</span>`}</td></tr>`).join("")}
        </tbody></table></div></section>`).join("");
    return `<div class="seitenkopf"><div><h1>Vorgänge der Module</h1><p class="muted">${wordmark("Flow")} enthält keine Fachlogik. Jedes Modul meldet im Vorgangsregister, welche Vorgänge es anbietet, welche Parameter es braucht und was es zurückgibt. Ein Schritt ruft genau einen Vorgang auf; Ergebnisse (z. B. der Benutzername aus EduKSX-Ident) stehen späteren Schritten als Platzhalter zur Verfügung.</p></div></div>
      <p class="meldung info"><strong>Zwei Antwortarten:</strong> «sofort» – der Schritt ist mit dem Aufruf erledigt. «Mit Rückmeldung» – das Modul nimmt den Auftrag an und meldet später (z. B. Unterschrift eingegangen, Lieferung da); bis dahin wartet der Schritt.</p>${karten}`;
  }

  /** Kompetenz-Eintrag prüfen: Kürzel (mit «/», Klammern und Instanzziffern wie «E1») gegen die aktiven Kompetenzen. */
  function fdUnbekannt(w) {
    const ok = new Set(ES.aktiveKompetenzen().map((e) => e.kuerzel));
    return String(w || "").split("/").map((x) => x.replace(/[()\s0-9]/g, "")).filter((x) => x && !ok.has(x));
  }
  const darfFd = () => ["SV", "RV"].includes(S.rolle);
  function seiteFunktionendiagramm() {
    const darf = darfFd();
    const sp = S.fdSpalten;
    const verwendung = {};
    S.vorlagen.forEach((v) => v.schritte.forEach((s) => { if (s.fd) (verwendung[s.fd] = verwendung[s.fd] || []).push(`${v.titel}: ${s.titel} (${s.rolle})`); }));
    const haupt = ES.hauptbereiche();
    const nrSort = (a, b) => a.nr.split(".").map(Number).reduce((r, x, i) => r || x - (Number(b.nr.split(".")[i]) || 0), 0) || a.nr.length - b.nr.length;
    const befunde = [];
    fdListe().forEach((f) => {
      Object.entries(f.rollen).forEach(([r, w]) => { const u = fdUnbekannt(w); if (u.length) befunde.push(`${f.nr} ${f.titel}: «${w}» bei ${r} – ${u.join(", ")} ist keine aktive Kompetenz.`); });
      if (!Object.values(f.rollen).some((w) => /[EV]/.test(w))) befunde.push(`${f.nr} ${f.titel}: weder Entscheid (E) noch Verantwortung (V) vergeben.`);
    });
    const inaktivSp = sp.filter((r) => !ES.aktiveFunktionen().some((e) => e.kuerzel === r));
    const zelle = (f, r) => {
      const w = f.rollen[r] || "";
      const fehlerhaft = fdUnbekannt(w).length;
      const mh = merkmalHtml((f.merkmale || {})[r]);
      if (!darf) return `<td class="fd ${/[EV]/.test(w) ? "lead" : ""}" title="${esc(kompetenzTooltip(w))}">${esc(w)}${fehlerhaft ? " ⚠" : ""}${mh ? `<div>${mh}</div>` : ""}</td>`;
      const knopf = w ? `<button class="link small" data-aktion="fd-merkmale" data-nr="${esc(f.nr)}" data-rolle="${esc(r)}" title="Merkmale: Betragsgrenze, Vier-Augen, delegierbar, befristet …" aria-label="Merkmale ${esc(f.nr)} ${esc(r)}">⋯</button>` : "";
      return `<td class="fd ${/[EV]/.test(w) ? "lead" : ""}">${mh ? `<div>${mh}</div>` : ""}${knopf}<label class="sr-only" for="fd-${esc(f.nr)}-${esc(r)}">${esc(f.nr)} ${esc(r)}</label><input id="fd-${esc(f.nr)}-${esc(r)}" class="fdzelle ${fehlerhaft ? "ungueltig" : ""}" data-aktion="fd-zelle" data-nr="${esc(f.nr)}" data-rolle="${esc(r)}" value="${esc(w)}" title="${fehlerhaft ? "Unbekannte Kompetenz" : esc(kompetenzTooltip(w) || ROLLEN[r] || r)}" ${fehlerhaft ? 'aria-invalid="true"' : ""}></td>`;
    };
    const zeile = (f) => `<tr><td>${esc(f.nr)}</td><td>${darf ? `<label class="sr-only" for="fdt-${esc(f.nr)}">Aufgabe ${esc(f.nr)}</label><input id="fdt-${esc(f.nr)}" data-aktion="fd-titel" data-nr="${esc(f.nr)}" value="${esc(f.titel)}" style="width:100%;min-width:14rem">` : esc(f.titel)}</td>${sp.map((r) => zelle(f, r)).join("")}<td class="small">${(verwendung[f.nr] || []).map(esc).join("<br>") || `<span class="muted">–</span>`}</td><td>${darf && !(verwendung[f.nr] || []).length ? `<button class="btn klein gefahr" data-aktion="fd-loeschen" data-nr="${esc(f.nr)}" aria-label="Aufgabe ${esc(f.nr)} löschen">✕</button>` : ""}</td></tr>`;
    const kopf = `<thead><tr><th>Nr.</th><th>Aufgabe</th>${sp.map((r) => `<th title="${esc(ROLLEN[r] || r)}">${esc(r)}${darf ? ` <button class="link small" data-aktion="fd-spalte-weg" data-rolle="${esc(r)}" aria-label="Spalte ${esc(r)} ausblenden" title="Spalte ausblenden (Einträge bleiben)">×</button>` : ""}</th>`).join("")}<th>Verwendet in Schritten</th><th></th></tr></thead>`;
    const gruppen = haupt.map((h) => [h.kuerzel, `${h.kuerzel} ${h.name}`, h.aktiv]).concat([["", "Ohne Aufgabenbereich", true]]);
    const inhalt = gruppen.map(([nr, titel, aktiv]) => {
      const fs = fdListe().filter((f) => (nr ? f.bereich === nr : !haupt.some((h) => h.kuerzel === f.bereich))).sort(nrSort);
      if (!fs.length && (!darf || !nr)) return "";
      if (!fs.length && !aktiv) return "";
      return `<details class="gefaess" ${fs.length ? "open" : ""} style="margin-top:.75rem"><summary><span><strong>${esc(titel)}</strong>${aktiv ? "" : ' <span class="badge neutral">inaktiv</span>'}</span><span class="small muted">${fs.length} Aufgaben</span></summary><div class="inhalt">
        ${fs.length ? `<div class="tabelle-wrap"><table>${kopf}<tbody>${fs.map(zeile).join("")}</tbody></table></div>` : `<p class="small muted">Noch keine Aufgaben.</p>`}
        ${darf && nr ? `<button class="btn klein" data-aktion="fd-neu" data-bereich="${esc(nr)}">＋ Aufgabe in «${esc(titel)}»</button>` : ""}</div></details>`;
    }).join("");
    const freie = ES.aktiveFunktionen().filter((e) => !sp.includes(e.kuerzel));
    return `<div class="seitenkopf"><div><h1>Funktionendiagramm</h1><p class="muted">Muster mit den Aufgaben, die Abläufe berühren, gruppiert nach den <a href="#/einstellungen/aufgabenbereiche">Aufgabenbereichen</a>. Ist einem Schritt eine Nummer zugeordnet, schlägt ${wordmark("Flow")} die Rolle mit «V» als verantwortlich und die Rollen mit «I» als zu informieren vor und warnt bei Abweichungen.</p></div></div>
      <p class="small muted">${ES.aktiveKompetenzen().map((e) => `${ES.labelVon("kompetenzen", e.kuerzel)} <span title="${esc(e.beschreibung || "")}">${esc(e.name)}</span>`).join(" · ")} · <a href="#/einstellungen/kompetenzen">Kompetenzen</a> · Mehrere mit «/» trennen, Instanz als Ziffer (z. B. E1/E2), Klammern für bedingt.</p>
      ${darf ? `<div class="formzeile"><label class="feld">Spalte (Funktion) einblenden<select id="fd-spalte-neu"><option value="">– Funktion wählen –</option>${[...new Set(freie.map((e) => e.gruppe || "Weitere"))].map((g) => `<optgroup label="${esc(g)}">${freie.filter((e) => (e.gruppe || "Weitere") === g).map((e) => `<option value="${esc(e.kuerzel)}">${esc(e.name)} (${esc(e.kuerzel)})</option>`).join("")}</optgroup>`).join("")}</select></label><button class="btn" data-aktion="fd-spalte" style="align-self:end">＋ Spalte</button></div>` : `<p class="meldung info">Ändern können die Schulverwaltung und der Ressortvorstand – Rolle oben rechts wechseln.</p>`}
      ${inaktivSp.length ? `<p class="meldung warnung">⚠ Spalten mit inaktiver Funktion: ${inaktivSp.map(esc).join(", ")} – unter <a href="#/einstellungen/funktionen">Funktionen</a> aktivieren oder Spalte ausblenden.</p>` : ""}
      ${befunde.length ? `<details class="meldung warnung"><summary>⚠ ${befunde.length} Hinweise zur Prüfung</summary><ul>${befunde.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
      ${inhalt}`;
  }


  function protokollTabelle(liste) {
    if (!liste.length) return `<p class="muted">Noch keine Aufrufe.</p>`;
    const st = { ok: "erfolg", "angenommen": "warnung", "rückmeldung": "erfolg", fehler: "fehler" };
    return `<div class="tabelle-wrap"><table><thead><tr><th>Wann</th><th>Ablauf</th><th>Schritt</th><th>Vorgang</th><th>Parameter</th><th>Antwort</th></tr></thead><tbody>${liste.map((a) => `<tr>
      <td class="small">${datumKurz(a.tag)}<div class="muted">${esc(a.uhr)}</div></td><td class="small"><a href="#/lauf/${esc(a.lauf)}">${esc(a.person)}</a></td><td class="small">${esc(a.titel)}</td>
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
    const s = sid ? kopie(v.schritte.find((x) => x.id === sid)) : { id: neueId(v), typ: "aufgabe", titel: "", rolle: "SV", tage: 0, nach: [], aktion: null, auto: false, informiert: [], bedingung: null, fd: "", quelle: "" };
    if (!s.typ) s.typ = typVon(s);
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
    const platzhalter = ["{" + v.felder.map((f) => f.key).join("} {") + "}", "{stichtag-7}", ...andere.flatMap((x) => ergebnisFelder(x).map((e) => `{${esc(x.id)}.${e}}`))];
    const b = s.bedingung || { feld: "", op: "=", wert: "" };
    const t = typVon(s);
    const verzweiger = andere.filter((x) => ["genehmigung", "entscheidung"].includes(typVon(x)));
    const refWerte = istRef(b) ? (() => { const q = v.schritte.find((x) => x.id === b.feld.split(".")[0]); return q ? (typVon(q) === "genehmigung" ? ["genehmigt", "abgelehnt"] : q.optionen || []) : []; })() : [];
    dlg.innerHTML = `
      <form method="dialog" class="editor" data-glossary-ignore>
        <h2>${EDIT.neu ? "Neuer Schritt" : "Schritt bearbeiten"} <span class="small muted">${esc(s.id)} · ${esc(v.titel)}</span></h2>
        <label class="feld">Bezeichnung<input type="text" data-e="titel" value="${esc(s.titel)}" required style="width:100%"></label>
        <label class="feld" style="margin-top:.5rem">Quelle (Gesetz, Paragraf, Merkblatt, interne Grundlage)<input type="text" data-e="quelle" value="${esc(s.quelle || "")}" placeholder="z. B. GG § 18 Abs. 2; Checkliste GV" style="width:100%"></label>
        <div class="formzeile" style="margin-top:.5rem">
          <label class="feld">Art des Schritts<select data-e="typ">${Object.entries(TYPEN).map(([k, x]) => `<option value="${k}" ${k === t ? "selected" : ""}>${x[0]} ${esc(x[1])}</option>`).join("")}</select></label>
          <span class="small muted" style="align-self:center;max-width:24rem">${esc(TYPEN[t][2])}</span>
        </div>
        <fieldset><legend>Zuständigkeit</legend>
          <div class="formzeile">
            <label class="feld">Funktionendiagramm<select data-e="fd"><option value="">– keine Zuordnung –</option>${fdListe().map((f) => `<option value="${esc(f.nr)}" ${f.nr === s.fd ? "selected" : ""}>${esc(f.nr + " " + f.titel)}</option>`).join("")}</select></label>
            <label class="feld">Verantwortlich<select data-e="rolle">${rollenOptionen(s.rolle, (k) => (fd && fd.rollen[k] ? " – FD " + fd.rollen[k] : ""))}</select></label>
          </div>
          ${fd ? `<p class="small muted">FD ${esc(fd.nr)}: ${Object.entries(fd.rollen).map(([r, z]) => `${esc(r)} ${esc(z)}`).join(" · ")} – Vorschlag übernommen: V → verantwortlich, I → informieren.</p>` : ""}
          <div class="small">Informieren (I): ${[...new Set([...(s.informiert || []), ...ES.aktiveFunktionen().map((e) => e.kuerzel)])].map((r) => `<label class="chip"><input type="checkbox" data-e="informiert" value="${r}" ${(s.informiert || []).includes(r) ? "checked" : ""}> ${esc(r)}</label>`).join(" ")}</div>
        </fieldset>
        <fieldset><legend>Zeitpunkt und Reihenfolge</legend>
          <div class="formzeile"><label class="feld">Frist in Tagen zum Stichtag (${esc(v.stichtag)})<input type="number" data-e="tage" value="${s.tage}"></label><span class="small muted" style="align-self:center">${relTage(Number(s.tage))} · negativ = vorher</span>
            <label class="feld">Fristart<select data-e="fristart">${Object.entries(FRISTARTEN).map(([k, x]) => `<option value="${k}" ${k === (s.fristart || "intern") ? "selected" : ""}>${esc(x[1])}</option>`).join("")}</select></label></div>
          <p class="small muted">Gesetzliche Fristen brauchen eine Quelle mit Paragraf und werden früher eskaliert (Erinnerung 7 Tage vorher, vorgesetzte Stelle am Fristtag).</p>
          <div class="small">Erst nach: ${andere.map((x) => `<label class="chip"><input type="checkbox" data-e="nach" value="${esc(x.id)}" ${(s.nach || []).includes(x.id) ? "checked" : ""}> ${esc(kuerzen(x.titel, 34))}</label>`).join(" ") || "–"}</div>
        </fieldset>
        ${t === "aufruf" ? `<fieldset><legend>Aufruf</legend>
          <div class="formzeile">
            <label class="feld">Modul<select data-e="modul"><option value="">– Modul wählen –</option>${D.MODULE.map((m) => `<option value="${esc(m.key)}" ${m.key === modul ? "selected" : ""}>EduKSX-${esc(m.name)}</option>`).join("")}</select></label>
            ${modul ? `<label class="feld">Vorgang<select data-e="vorgang">${D.MODULE.find((m) => m.key === modul).vorgaenge.map((x) => `<option value="${esc(x.id)}" ${vg && x.id === vg.id ? "selected" : ""}>${esc(x.titel)}</option>`).join("")}</select></label>` : ""}
          </div>
          ${vg ? `<div class="formzeile">${vg.parameter.map((p) => `<label class="feld">${esc(p)}<input type="text" data-e="param" data-p="${p}" value="${esc((s.aktion.param || {})[p] || "")}" list="ph-liste"></label>`).join("")}</div>
            <datalist id="ph-liste">${platzhalter.map((p) => `<option value="${esc(p)}">`).join("")}</datalist>
            <p class="small muted">Platzhalter: ${platzhalter.map((p) => `<code>${esc(p)}</code>`).join(" ")} · Ergebnis: ${vg.ergebnis.map((e) => `<code>{${esc(s.id)}.${esc(e)}}</code>`).join(" ")} · Antwort ${vg.art === "sofort" ? "sofort" : "mit Rückmeldung"}</p>
            <label class="small"><input type="checkbox" data-e="auto" ${s.auto ? "checked" : ""}> Automatisch aufrufen, sobald Vorgänger erledigt und Frist erreicht (sonst bestätigt die verantwortliche Rolle)</label>` : `<p class="small muted">Modul wählen, dann den Vorgang.</p>`}
        </fieldset>` : ""}
        ${t === "entscheidung" ? `<fieldset><legend>Möglichkeiten</legend><label class="feld">Möglichkeiten, mit Komma getrennt<input type="text" data-e="optionen" value="${esc((s.optionen || []).join(", "))}" placeholder="z. B. verfügbar, nicht verfügbar" style="width:100%"></label><p class="small muted">Spätere Schritte können über die Bedingung «Ergebnis: Wahl» davon abhängen (Verzweigung).</p></fieldset>` : ""}
        ${t === "genehmigung" ? `<fieldset><legend>Mehrfachgenehmigung (optional)</legend>
          <div class="small">Genehmigen müssen zusätzlich zur verantwortlichen Rolle: ${ES.aktiveFunktionen().map((e) => e.kuerzel).filter((k) => k !== s.rolle).map((k) => `<label class="chip"><input type="checkbox" data-e="mehrfach" value="${esc(k)}" ${((s.mehrfach || {}).rollen || []).includes(k) ? "checked" : ""}> ${esc(k)}</label>`).join(" ")}</div>
          <div class="formzeile"><label class="feld">Nötig<select data-e="quorum">${[["alle", "alle"], ["mehrheit", "Mehrheit"], ["1", "mindestens 1"], ["2", "mindestens 2"], ["3", "mindestens 3"]].map(([v, x]) => `<option value="${v}" ${String((s.mehrfach || {}).quorum || "alle") === v ? "selected" : ""}>${x}</option>`).join("")}</select></label></div></fieldset>` : ""}
        ${t === "genehmigung" ? `<p class="small muted">Ergebnis <code>{${esc(s.id)}.entscheid}</code> = genehmigt oder abgelehnt, <code>{${esc(s.id)}.begruendung}</code>. Spätere Schritte können über eine Bedingung davon abhängen.</p>` : ""}
        ${t === "unterprozess" ? `<fieldset><legend>Unterprozess</legend><div class="formzeile">
            <label class="feld">Vorlage<select data-e="unter">${S.vorlagen.filter((x) => x.id !== v.id).map((x) => `<option value="${esc(x.id)}" ${s.unter && s.unter.vorlage === x.id ? "selected" : ""}>${esc(x.titel)}${x.status === "entwurf" ? " (Entwurf)" : ""}</option>`).join("")}</select></label>
            <label class="feld">Stichtag des Unterprozesses: Tage zum eigenen Stichtag<input type="number" data-e="versatz" value="${esc(s.unter ? s.unter.versatz || 0 : 0)}"></label></div>
            <p class="small muted">Gleichnamige Kontextfelder werden übernommen. Der Schritt ist erledigt, wenn der Unterprozess abgeschlossen ist.</p></fieldset>` : ""}
        <fieldset><legend>Bedingung (optional)</legend>
          <div class="formzeile">
            <label class="feld">Feld<select data-e="b-feld"><option value="">– immer ausführen –</option><optgroup label="Kontextfelder">${v.felder.map((f) => `<option value="${esc(f.key)}" ${f.key === b.feld ? "selected" : ""}>${esc(f.label)}</option>`).join("")}</optgroup>${verzweiger.length ? `<optgroup label="Ergebnis eines früheren Schritts (Verzweigung)">${verzweiger.map((x) => { const k = x.id + (typVon(x) === "genehmigung" ? ".entscheid" : ".wahl"); return `<option value="${k}" ${k === b.feld ? "selected" : ""}>${esc(kuerzen(x.titel, 40))}: ${typVon(x) === "genehmigung" ? "Entscheid" : "Wahl"}</option>`; }).join("")}</optgroup>` : ""}</select></label>
            <label class="feld">Vergleich<select data-e="b-op">${["=", "≠", "<", ">", "in"].map((o) => `<option ${o === b.op ? "selected" : ""}>${o}</option>`).join("")}</select></label>
            <label class="feld">Wert<input type="text" data-e="b-wert" value="${esc(b.wert)}" placeholder="z. B. Klassenlehrperson" ${refWerte.length ? 'list="ref-werte"' : ""}></label>${refWerte.length ? `<datalist id="ref-werte">${refWerte.map((w) => `<option value="${esc(w)}">`).join("")}</datalist>` : ""}
          </div><p class="small muted">«in»: Werte mit Komma trennen. Wert kann ein Platzhalter sein, z. B. <code>{pensumAlt}</code>. Bei einer Verzweigung wartet der Schritt auf den Entscheid; entfällt er, entfallen auch die Schritte, die nur auf ihn warten. Der Schritt muss nach dem entscheidenden Schritt eingeplant sein.</p>
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
    s.typ = q("typ").value;
    s.fristart = q("fristart").value === "intern" ? undefined : q("fristart").value;
    if (q("optionen")) s.optionen = q("optionen").value.split(",").map((x) => x.trim()).filter(Boolean);
    if (s.typ === "unterprozess") s.unter = { vorlage: q("unter") ? q("unter").value : (S.vorlagen.find((x) => x.id !== EDIT.vid) || {}).id, versatz: q("versatz") ? Number(q("versatz").value || 0) : 0 };
    else delete s.unter;
    if (s.typ === "entscheidung" && !s.optionen) s.optionen = ["ja", "nein"];
    if (s.typ === "genehmigung" && dlg.querySelector('[data-e="quorum"]')) {
      const weitere = [...dlg.querySelectorAll('[data-e="mehrfach"]:checked')].map((x) => x.value);
      s.mehrfach = weitere.length ? { rollen: [s.rolle, ...weitere.filter((r) => r !== s.rolle)], quorum: q("quorum").value } : undefined;
    } else if (s.typ !== "genehmigung") delete s.mehrfach;
    const modul = q("modul") ? q("modul").value : "";
    if (s.typ !== "aufruf" || !modul) { s.aktion = null; s.auto = false; }
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
    if (v.status === "freigegeben") { v.status = "entwurf"; v.version += 1; ansage(`Vorlage ist jetzt Entwurf Version ${esc(v.version)}.`); }
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
  /**
   * Eingabe im eigenen Dialog. felder: [{ key, label, typ: text|textarea|datum|zahl|auswahl, werte, wert, pflicht, pflichtWenn }]
   * pflichtWenn: (werte) => bool. Rückgabe an ok(werte).
   */
  function formular(titel, text, felder, okText, ok) {
    let d = document.getElementById("formular");
    if (!d) { d = document.createElement("dialog"); d.id = "formular"; document.body.appendChild(d); }
    const feld = (f) => {
      const w = f.wert == null ? "" : f.wert;
      const id = "frm-" + f.key;
      if (f.typ === "auswahl") return `<label class="feld" for="${id}">${esc(f.label)}<select id="${id}" data-f="${esc(f.key)}">${f.werte.map((x) => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(v) === String(w) ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select></label>`;
      if (f.typ === "textarea") return `<label class="feld" for="${id}" style="width:100%">${esc(f.label)}${f.pflicht ? " *" : ""}<textarea id="${id}" data-f="${esc(f.key)}" rows="3" style="width:100%">${esc(w)}</textarea></label>`;
      return `<label class="feld" for="${id}">${esc(f.label)}${f.pflicht ? " *" : ""}<input id="${id}" type="${f.typ === "datum" ? "date" : f.typ === "zahl" ? "number" : "text"}" data-f="${esc(f.key)}" value="${esc(w)}"></label>`;
    };
    d.innerHTML = `<div class="editor" data-glossary-ignore><h2>${esc(titel)}</h2>${text ? `<p class="small" style="white-space:pre-line">${esc(text)}</p>` : ""}<div class="formzeile">${felder.map(feld).join("")}</div><p class="small" id="frm-fehler" role="alert" style="color:var(--destructive)"></p>
      <div class="formzeile" style="justify-content:flex-end;margin-top:.75rem"><button class="btn" data-frm="nein">Abbrechen</button><button class="btn primaer" data-frm="ja">${esc(okText)}</button></div></div>`;
    d.onclick = (ev) => {
      const b = ev.target.closest("[data-frm]");
      if (!b) return;
      if (b.dataset.frm === "nein") { d.close(); return; }
      const werte = {};
      felder.forEach((f) => { const el = d.querySelector(`[data-f="${esc(f.key)}"]`); werte[f.key] = el ? el.value.trim() : ""; });
      const fehlt = felder.filter((f) => (f.pflicht || (f.pflichtWenn && f.pflichtWenn(werte))) && !werte[f.key]);
      if (fehlt.length) { d.querySelector("#frm-fehler").textContent = "Bitte ausfüllen: " + fehlt.map((f) => f.label).join(", "); return; }
      d.close();
      ok(werte);
    };
    d.showModal();
    const erstes = d.querySelector("[data-f]");
    if (erstes) erstes.focus();
  }
  const GRUND = { key: "grund", label: "Begründung", typ: "textarea", pflicht: true };

  /** Erledigen-Dialog je Aufgabentyp. */
  function erledigenDialog(l, s) {
    const t = typVon(s);
    const durch = ROLLEN[S.rolle];
    const fertig = (eingabe) => { ausfuehren(l, s, durch, eingabe); weiter(); ansage(`«${s.titel}»: ${STATUS[s.status][2]}.`); };
    const mm = s.fd && fdEintrag(s.fd) ? (fdEintrag(s.fd).merkmale || {})[s.rolle] : null;
    const mmText = merkmalText(mm).map(([, x]) => x).join(" · ");
    if (t === "genehmigung") return formular(s.titel, `${l.kontext.person} · ${l.titel}${s.instanzwechsel ? `\nZuständig als nächste Instanz: ${s.instanzwechsel.grund}.` : ""}${mmText ? `\nKompetenz laut Funktionendiagramm ${s.fd}: ${mmText}.` : ""}${mm && mm.vierAugen === "ja" && !(s.vierAugen && s.vierAugen.erst) ? "\nVier-Augen-Prinzip: Nach einer Genehmigung folgt eine zweite, unabhängige Prüfung." : ""}${s.vierAugen && s.vierAugen.erst ? `\nZweite Prüfung (Vier-Augen): genehmigt durch ${ROLLEN[s.vierAugen.erst.rolle] || s.vierAugen.erst.rolle}${s.vierAugen.erst.begruendung ? " – " + s.vierAugen.erst.begruendung : ""}.` : ""}${s.mehrfach && (s.mehrfach.rollen || []).length ? `\nMehrfachgenehmigung (${quorumText(s.mehrfach)}). Sie stimmen für ${ROLLEN[handeltFuer(s)] || handeltFuer(s)}.` : ""}${handeltFuer(s) && handeltFuer(s) !== S.rolle && !(D.EXTERN || []).includes(handeltFuer(s)) ? `\nIn Vertretung für ${ROLLEN[handeltFuer(s)] || handeltFuer(s)}.` : ""}`, [{ key: "entscheid", label: "Entscheid", typ: "auswahl", werte: ["genehmigt", "abgelehnt"] }, { key: "begruendung", label: "Begründung (bei Ablehnung Pflicht)", typ: "textarea", pflichtWenn: (w) => w.entscheid === "abgelehnt" }], "Entscheid festhalten", fertig);
    if (t === "entscheidung") return formular(s.titel, `${l.kontext.person} · ${l.titel}`, [{ key: "wahl", label: "Entscheid", typ: "auswahl", werte: s.optionen || ["ja", "nein"] }], "Entscheid festhalten", fertig);
    if (t === "nachweis") return formular(s.titel, "Dokument bzw. Referenz hinterlegen (z. B. Dossiernummer). Im Prototyp wird nichts hochgeladen.", [{ key: "nachweis", label: "Nachweis", typ: "text", pflicht: true, wert: "" }], "Nachweis ablegen", fertig);
    if (t === "termin") return formular(s.titel, "", [{ key: "termin", label: "Datum", typ: "datum", pflicht: true, wert: fristVon(l, s) }, { key: "ort", label: "Ort", typ: "text" }], "Termin festhalten", (w) => fertig({ termin: datumKurz(w.termin), ort: w.ort }));
    return fertig();
  }

  /** Eingriffe in laufende Abläufe (Konzept 3.4), jeweils mit Begründung und Journal. */
  function eingriff(ak, l, s) {
    const wer = ROLLEN[S.rolle];
    if (!darfEingreifen(l)) { ansage("Eingriffe nur für die Prozessverantwortlichen dieser Vorlage."); return; }
    if (ak === "ein-pause") {
      if (l.pausiert) return formular("Ablauf fortsetzen", `${esc(l.id)} · ${l.titel}: ${l.kontext.person}`, [GRUND], "Fortsetzen", (w) => { l.pausiert = false; journal(l, "Eingriff", "Ablauf fortgesetzt.", w.grund, wer); weiter(); ansage("Ablauf fortgesetzt."); });
      return formular("Ablauf pausieren", "Während der Pause laufen keine automatischen Schritte und Fristen werden nicht eskaliert.", [GRUND], "Pausieren", (w) => { l.pausiert = true; journal(l, "Eingriff", "Ablauf pausiert.", w.grund, wer); weiter(); ansage("Ablauf pausiert."); });
    }
    if (ak === "ein-abbrechen") {
      const aus = l.schritte.filter((x) => x.status === "erledigt" && typVon(x) === "aufruf");
      return formular("Ablauf abbrechen", `${esc(l.id)} · ${l.titel}: ${l.kontext.person}\n\nOffene Schritte und laufende Unterprozesse werden abgebrochen.${aus.length ? `\nBereits ausgeführt und NICHT automatisch rückgängig gemacht:\n– ${aus.map((x) => x.titel).join("\n– ")}` : ""}`, [GRUND], "Ablauf abbrechen", (w) => { abbrechen(l, w.grund, wer); weiter(); ansage("Ablauf abgebrochen."); });
    }
    if (ak === "ein-stichtag") {
      const ges = l.schritte.filter((x) => x.fristart === "gesetzlich" && !ERLEDIGT.includes(x.status));
      return formular(`${l.stichtagName} verschieben`, `Offene Fristen verschieben sich mit; erledigte Schritte bleiben.${ges.length ? `\n⚠ Gesetzliche Fristen betroffen: ${ges.map((x) => x.titel).join("; ")} – prüfen, ob die Verschiebung zulässig ist.` : ""}`, [{ key: "datum", label: "Neuer Stichtag", typ: "datum", pflicht: true, wert: l.kontext.stichtag }, GRUND], "Verschieben", (w) => {
        const alt = l.kontext.stichtag;
        if (w.datum === alt) return;
        l.kontext.stichtag = w.datum;
        l.schritte.forEach((x) => { if (!ERLEDIGT.includes(x.status)) x.eskaliert = []; });
        journal(l, "Eingriff", `Stichtag von ${datumKurz(alt)} auf ${datumKurz(w.datum)} verschoben.`, w.grund, wer);
        weiter(); ansage("Stichtag verschoben.");
      });
    }
    if (ak === "ein-einfuegen") {
      const nachWerte = [["", "– sofort (ohne Vorgänger) –"], ...l.schritte.map((x) => [x.id, kuerzen(x.titel, 50)])];
      return formular("Schritt einfügen", "Der Schritt gilt nur für diesen Ablauf, nicht für die Vorlage.", [
        { key: "titel", label: "Bezeichnung", typ: "text", pflicht: true },
        { key: "typ", label: "Art", typ: "auswahl", werte: ["aufgabe", "nachweis", "termin", "genehmigung"].map((k) => [k, TYPEN[k][0] + " " + TYPEN[k][1]]) },
        { key: "rolle", label: "Verantwortlich", typ: "auswahl", werte: rollenWerte(), wert: S.rolle },
        { key: "frist", label: "Frist", typ: "datum", pflicht: true, wert: addTage(S.heute, 7) },
        { key: "nach", label: "Erst nach", typ: "auswahl", werte: nachWerte },
        GRUND,
      ], "Einfügen", (w) => {
        let n = 1; while (l.schritte.some((x) => x.id === `${l.id}z${n}`)) n++;
        const neu = { id: `${l.id}z${n}`, typ: w.typ, titel: w.titel, rolle: w.rolle, tage: tageZwischen(l.kontext.stichtag, w.frist), nach: w.nach ? [w.nach] : [], aktion: null, auto: false, informiert: [], bedingung: null, fd: "", quelle: "Eingriff im laufenden Ablauf: " + w.grund, status: "wartet", ergebnis: null, erledigtAm: null, param: null, eskaliert: [], zusatz: true, erzwungen: true };
        const i = w.nach ? l.schritte.findIndex((x) => x.id === w.nach) + 1 : l.schritte.length;
        l.schritte.splice(i, 0, neu);
        if (l.abgeschlossen) l.abgeschlossen = null;
        journal(l, "Eingriff", `Schritt «${w.titel}» eingefügt (${ROLLEN[w.rolle]}, Frist ${datumKurz(w.frist)}).`, w.grund, wer);
        weiter(); ansage("Schritt eingefügt.");
      });
    }
    if (!s) return;
    if (ak === "ein-ueberspringen") return formular("Schritt überspringen", `«${s.titel}»\nNachfolgende Schritte laufen weiter.`, [GRUND], "Überspringen", (w) => {
      if (s.status === "laeuft" && typVon(s) === "aufruf") aufrufProtokoll(l, s, "fehler", "Rückmeldung nicht mehr erwartet (übersprungen).");
      s.status = "uebersprungen"; s.zweig = false; s.grund = "übersprungen: " + w.grund; s.erledigtAm = S.heute;
      journal(l, "Eingriff", `Schritt «${s.titel}» übersprungen.`, w.grund, wer);
      weiter(); ansage("Schritt übersprungen.");
    });
    if (ak === "ein-rolle") return formular("Zuständigkeit ändern", `«${s.titel}» – bisher ${ROLLEN[s.rolle] || s.rolle}`, [{ key: "rolle", label: "Neu verantwortlich", typ: "auswahl", werte: [[s.rolle, ROLLEN[s.rolle] || s.rolle], ...rollenWerte().filter(([k]) => k !== s.rolle)], wert: s.rolle }, GRUND], "Ändern", (w) => {
      if (w.rolle === s.rolle) return;
      journal(l, "Eingriff", `Zuständigkeit «${s.titel}»: ${ROLLEN[s.rolle]} → ${ROLLEN[w.rolle]}.`, w.grund, wer);
      s.rolle = w.rolle; s.eskaliert = [];
      hinweis([w.rolle], l, `Neu zuständig: «${s.titel}» (${l.kontext.person}).`);
      weiter(); ansage("Zuständigkeit geändert.");
    });
    if (ak === "ein-oeffnen") {
      const t = typVon(s);
      const warn = t === "aufruf" && s.status === "erledigt" ? "\nDer bereits ausgeführte Aufruf wird NICHT automatisch wiederholt; die zuständige Rolle löst ihn bei Bedarf von Hand erneut aus." : t === "unterprozess" ? "\nEin neuer Unterprozess wird gestartet." : "";
      return formular("Schritt wieder öffnen", `«${s.titel}»${warn}\nBereits erledigte Nachfolger bleiben erledigt.`, [GRUND], "Wieder öffnen", (w) => {
        s.frueher = { status: s.status, ergebnis: s.ergebnis, erledigtAm: s.erledigtAm };
        s.status = "wartet"; s.ergebnis = null; s.erledigtAm = null; s.manuell = true; s.erzwungen = true; s.zweig = false; s.grund = ""; s.eskaliert = [];
        if (l.abgeschlossen) l.abgeschlossen = null;
        journal(l, "Eingriff", `Schritt «${s.titel}» wieder geöffnet.`, w.grund, wer);
        weiter(); ansage("Schritt wieder geöffnet.");
      });
    }
  }

  function route() { return (location.hash || "#/uebersicht").slice(2).split("/"); }
  function render() {
    rollenAbgleichen();
    const [seite, a, b] = route();
    // feste Zuordnung Route → Seite (kein Aufruf über einen Namen aus der Adresse)
    const inhalt = () => {
      switch (seite) {
        case "aufgaben": return seiteAufgaben();
        case "laeufe": return seiteLaeufe();
        case "lauf": return seiteLauf(a, b);
        case "neu": return seiteNeu(a);
        case "vorlagen": return seiteVorlagen();
        case "vorlage": return seiteVorlage(a, b);
        case "kalender": return KAL.seite(a);
        case "vorgaenge": return seiteVorgaenge();
        case "funktionendiagramm": return seiteFunktionendiagramm();
        case "protokoll": return seiteProtokoll();
        case "ausloeser": return seiteAusloeser();
        case "vertretungen": return seiteVertretungen();
        case "einstellungen": return ES.seite(a);
        default: return seiteUebersicht();
      }
    };
    document.getElementById("app").innerHTML = rahmen(seite, inhalt());
    document.title = "EduKSX-Flow (Prototyp)";
    glossarErklaeren();
  }
  function weiter() { ausloeserKalender(); motor(); speichern(); render(); }

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
        S.laeufe.forEach((x) => { if (x.pausiert || x.abgebrochen || x.abgeschlossen) return; x.schritte.forEach((y) => { if (!ERLEDIGT.includes(y.status) && y.status !== "abgebrochen") { const f = fristVon(x, y); if (f > S.heute) kandidaten.push(f); } }); });
        if (!kandidaten.length) { ansage("Keine weitere Frist."); break; }
        S.heute = kandidaten.sort()[0]; weiter(); ansage("Simulierter Tag: " + datum(S.heute)); break;
      }
      case "thema": document.documentElement.classList.toggle("dark"); try { localStorage.setItem("eduksx-thema", document.documentElement.classList.contains("dark") ? "dunkel" : "hell"); } catch (e) { /* */ } render(); break;
      case "glossar": try { localStorage.setItem("eduksx-glossar", glossarAn() ? "aus" : "an"); } catch (e) { /* */ } if (glossarAn()) { glossarLaden(); render(); } else location.reload(); break;
      case "zuruecksetzen": frage("Alle Änderungen verwerfen und Testdaten neu laden?", "Testdaten laden", () => { S = neuerZustand(); speichern(); location.hash = "#/uebersicht"; render(); }); break;
      case "reiter": location.hash = el.dataset.ziel; break;
      case "ausfuehren": ausfuehren(l, s, ROLLEN[S.rolle]); weiter(); ansage(`«${s.titel}»: ${STATUS[s.status][2]}.`); break;
      case "jetzt": ausfuehren(l, s, ROLLEN[S.rolle] + ", vorgezogen"); weiter(); break;
      case "erledigen": erledigenDialog(l, s); break;
      case "delegieren": {
        if (!s) break;
        formular("Aufgabe delegieren", `«${s.titel}» (${l.kontext.person})\nDie Ausführung geht an die gewählte Funktion, die Verantwortung bleibt bei ${ROLLEN[s.rolle] || s.rolle}.`, [
          { key: "an", label: "Delegieren an", typ: "auswahl", werte: rollenWerte().filter(([k]) => k !== s.rolle) }, GRUND], "Delegieren", (w) => {
          s.ausfuehrend = w.an; s.delegiertVon = S.rolle; s.eskaliert = [];
          journal(l, "Eingriff", `«${s.titel}» delegiert an ${ROLLEN[w.an] || w.an}${S.rolle !== s.rolle ? ` (in Vertretung für ${ROLLEN[s.rolle]})` : ""}.`, w.grund);
          hinweis([w.an], l, `An Sie delegiert: «${s.titel}» (${l.kontext.person}), Frist ${datumKurz(fristVon(l, s))}.`);
          weiter(); ansage("Aufgabe delegiert.");
        });
        break;
      }
      case "delegation-zurueck": if (s) { journal(l, "Eingriff", `Delegation von «${s.titel}» an ${ROLLEN[s.ausfuehrend] || s.ausfuehrend} zurückgenommen.`); s.ausfuehrend = null; weiter(); ansage("Delegation zurückgenommen."); } break;
      case "vertretung-neu": {
        if (!darfVertretung()) break;
        formular("Stellvertretung erfassen", "Abwesenheit einer Funktion mit Stellvertretung.", [
          { key: "rolle", label: "Abwesend", typ: "auswahl", werte: rollenWerte() },
          { key: "vertretung", label: "Stellvertretung", typ: "auswahl", werte: rollenWerte() },
          { key: "von", label: "von", typ: "datum", pflicht: true, wert: S.heute },
          { key: "bis", label: "bis", typ: "datum", pflicht: true, wert: addTage(S.heute, 7) },
          { key: "grund", label: "Grund", typ: "text", wert: "Abwesenheit" },
        ], "Erfassen", (w) => {
          if (w.rolle === w.vertretung) { ansage("Abwesend und Stellvertretung müssen verschieden sein."); return; }
          if (w.bis < w.von) { ansage("«bis» liegt vor «von»."); return; }
          S.vertretungen.push({ id: "V" + S.zaehler++, rolle: w.rolle, vertretung: w.vertretung, von: w.von, bis: w.bis, grund: w.grund });
          weiter(); ansage("Stellvertretung erfasst.");
        });
        break;
      }
      case "vertretung-weg": {
        const v = (S.vertretungen || []).find((x) => x.id === el.dataset.id);
        if (v && darfVertretung()) frage(`Stellvertretung ${v.rolle} → ${v.vertretung} (${datumKurz(v.von)}–${datumKurz(v.bis)}) löschen?`, "Löschen", () => { S.vertretungen = S.vertretungen.filter((x) => x !== v); weiter(); ansage("Stellvertretung gelöscht."); });
        break;
      }
      case "fd-spalte": { const w = (document.getElementById("fd-spalte-neu") || {}).value; if (w && darfFd() && !S.fdSpalten.includes(w)) { S.fdSpalten.push(w); speichern(); render(); } break; }
      case "fd-spalte-weg": if (darfFd()) { S.fdSpalten = S.fdSpalten.filter((r) => r !== el.dataset.rolle); speichern(); render(); ansage(`Spalte ${el.dataset.rolle} ausgeblendet – Einträge bleiben erhalten.`); } break;
      case "fd-neu": {
        if (!darfFd()) break;
        const b = el.dataset.bereich;
        const vorhanden = fdListe().filter((f) => f.bereich === b).map((f) => f.nr);
        formular("Aufgabe im Funktionendiagramm", `Aufgabenbereich ${b}`, [{ key: "nr", label: "Nr.", typ: "text", pflicht: true, wert: `${b}.${vorhanden.length + 1}` }, { key: "titel", label: "Aufgabe", typ: "text", pflicht: true }], "Hinzufügen", (w) => {
          if (fdEintrag(w.nr)) { ansage(`Nr. ${w.nr} gibt es schon.`); return; }
          S.fd.push({ nr: w.nr, titel: w.titel, rollen: {}, bereich: b }); speichern(); render(); ansage("Aufgabe hinzugefügt.");
        });
        break;
      }
      case "fd-merkmale": {
        const f = fdEintrag(el.dataset.nr), r = el.dataset.rolle;
        if (!f || !darfFd()) break;
        const m = (f.merkmale = f.merkmale || {})[r] || {};
        const jn = [["", "–"], ["ja", "ja"], ["nein", "nein"]];
        formular(`Merkmale: ${f.nr} · ${ROLLEN[r] || r} (${f.rollen[r] || "–"})`, "Zusätzliche Eigenschaften der Kompetenzzuweisung (Konzept E14). Bei Genehmigungen prüft Flow Betragsgrenze und Befristung und gibt sonst an die nächste Instanz (E1 → E2) weiter.", [
          { key: "betrag", label: "Betragsgrenze CHF", typ: "zahl", wert: m.betrag || "" },
          { key: "vierAugen", label: "Vier-Augen-Prinzip", typ: "auswahl", werte: jn, wert: m.vierAugen || "" },
          { key: "kollektiv", label: "Kollektiv (nur gemeinsam)", typ: "auswahl", werte: jn, wert: m.kollektiv || "" },
          { key: "delegierbar", label: "Delegierbar", typ: "auswahl", werte: jn, wert: m.delegierbar || "" },
          { key: "befristetBis", label: "Befristet bis", typ: "datum", wert: m.befristetBis || "" },
          { key: "bedingt", label: "Bedingung", typ: "text", wert: m.bedingt || "" },
          { key: "geltung", label: "Geltungsbereich", typ: "text", wert: m.geltung || "" },
        ], "Übernehmen", (w) => {
          const neu = {};
          Object.entries(w).forEach(([k, x]) => { if (x) neu[k] = k === "betrag" ? Number(x) : x; });
          if (Object.keys(neu).length) f.merkmale[r] = neu; else delete f.merkmale[r];
          speichern(); render(); ansage("Merkmale übernommen.");
        });
        break;
      }
      case "fd-loeschen": {
        const f = fdEintrag(el.dataset.nr);
        if (f && darfFd()) frage(`Aufgabe «${f.nr} ${f.titel}» aus dem Funktionendiagramm löschen?`, "Löschen", () => { S.fd = S.fd.filter((x) => x !== f); speichern(); render(); ansage("Aufgabe gelöscht."); });
        break;
      }
      case "ein-pause": case "ein-abbrechen": case "ein-stichtag": case "ein-einfuegen": case "ein-ueberspringen": case "ein-rolle": case "ein-oeffnen": eingriff(ak, l, s); break;
      case "ereignis-senden": {
        const neu = ausloeserEreignis(el.dataset.ev, EREIGNIS_EINGABE[el.dataset.ev] || {});
        delete EREIGNIS_EINGABE[el.dataset.ev];
        weiter();
        ansage(neu.length ? `${neu.length} Ablauf/Abläufe gestartet: ${neu.map((x) => x.id).join(", ")}.` : "Kein Ablauf gestartet – siehe Auslöseprotokoll.");
        break;
      }
      case "ausl-neu": {
        const v = vorlageVon(a); const q = document.getElementById("ausl-quelle"); if (!q || !q.value) break;
        const neu = AUSL_ART === "abschluss" ? { art: "abschluss", vorlage: q.value, versatz: Number((document.getElementById("ausl-versatz") || {}).value || 0) } : { art: AUSL_ART, ereignis: q.value };
        entwurfMachen(v); v.ausloeser = (v.ausloeser || []).concat([neu]); speichern(); render(); break;
      }
      case "ausl-weg": { const v = vorlageVon(a); entwurfMachen(v); v.ausloeser.splice(Number(el.dataset.i), 1); speichern(); render(); break; }
      case "rueckmeldung": rueckmeldung(l, s); weiter(); ansage(`Rückmeldung zu «${s.titel}» eingegangen.`); break;
      case "nochmals": s.fehler = null; s.status = "wartet"; if (typVon(s) === "aufruf" && !s.auto) ausfuehren(l, s, ROLLEN[S.rolle] + ", erneut"); weiter(); ansage(`«${s.titel}»: ${STATUS[s.status][2]}.`); break;
      case "starten": {
        const v = vorlageVon(el.dataset.vorlage);
        const lauf = laufAnlegen(v, START_EINGABE[v.id]);
        if (START_EREIGNIS[v.id]) { lauf.ereignis = START_EREIGNIS[v.id].key; lauf.ereignisTitel = START_EREIGNIS[v.id].titel; }
        S.ausgeloest[startSchluessel(v, lauf.kontext)] = lauf.id;
        journal(lauf, "Start", `Von Hand gestartet${lauf.ereignisTitel ? " aus dem Jahreskalender (" + lauf.ereignisTitel + ")" : ""}.`);
        delete START_EINGABE[v.id];
        delete START_EREIGNIS[v.id];
        motor(); speichern(); location.hash = "#/lauf/" + lauf.id; ansage("Ablauf gestartet."); break;
      }
      case "vorlage-neu": {
        const id = "vorlage-" + S.zaehler++;
        S.vorlagen.push({ id, gruppe: "Weitere", titel: "Neue Ablaufvorlage", version: 1, status: "entwurf", prozessverantwortlich: ["SV", "SL", "SPr"], stichtag: "Stichtag", beschreibung: "Noch zu beschreiben.",
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
      case "freigeben": { const v = vorlageVon(a); v.status = "freigegeben"; speichern(); render(); ansage(`Version ${esc(v.version)} freigegeben.`); break; }
      case "dlg-abbrechen": ev.preventDefault(); document.getElementById("dlg").close(); EDIT = null; break;
      case "dlg-speichern": ev.preventDefault(); if (dialogSpeichern()) { document.getElementById("dlg").close(); speichern(); render(); } break;
      default: if (!(ak.startsWith("es-") && ES.klick(ak, el)) && !ak.startsWith("es-")) KAL.klick(ak, el); break;
    }
  });
  document.addEventListener("keydown", (ev) => {
    const el = ev.target.closest && ev.target.closest('g[data-aktion="schritt-bearbeiten"]');
    if (el && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
  });
  document.addEventListener("change", (ev) => {
    const el = ev.target;
    if (el.dataset.e && EDIT && ["fd", "modul", "vorgang", "b-feld", "typ", "unter"].includes(el.dataset.e)) { dialogLesen(el.dataset.e); dialogZeichnen(); return; }
    if (el.dataset.e === "tage" && EDIT) { dialogLesen(); dialogZeichnen(); return; }
    const ak = el.dataset.aktion;
    if (ak && ak.startsWith("es-")) { ES.aenderung(ak, el); return; }
    if ((ak && ak.startsWith("kal-")) || el.dataset.neuZeichnen) { KAL.aenderung(ak || "", el); return; }
    if (ak === "rolle") { S.rolle = el.value; speichern(); render(); ansage("Rolle: " + ROLLEN[S.rolle]); }
    if (ak === "erreichbar") { S.erreichbar[el.dataset.key] = el.checked; weiter(); }
    if (ak === "start-vorlage") location.hash = "#/neu/" + el.value;
    if ((ak === "fd-zelle" || ak === "fd-titel") && darfFd()) {
      const f = fdEintrag(el.dataset.nr);
      if (!f) return;
      if (ak === "fd-titel") { if (el.value.trim()) f.titel = el.value.trim(); }
      else { const w = el.value.trim().toUpperCase().replace(/\s+/g, ""); if (w) f.rollen[el.dataset.rolle] = w; else delete f.rollen[el.dataset.rolle]; }
      speichern(); render();
      if (ak === "fd-zelle" && fdUnbekannt(f.rollen[el.dataset.rolle]).length) ansage(`«${f.rollen[el.dataset.rolle]}»: unbekannte Kompetenz.`);
    }
    if (ak === "ereignis-feld") { const E = EREIGNIS_EINGABE[el.dataset.ev]; E[el.dataset.key] = el.value; render(); }
    if (ak === "ausl-art") { AUSL_ART = el.value; render(); }
    if (ak === "pv-rolle" && S.rolle === "SV") {
      const [, vid] = route(); const v = vorlageVon(vid); if (!v) return;
      const neu = el.checked ? [...new Set([...(v.prozessverantwortlich || []), el.dataset.rolle])] : (v.prozessverantwortlich || []).filter((r) => r !== el.dataset.rolle);
      if (!neu.length) { ansage("Mindestens eine Rolle muss prozessverantwortlich sein."); render(); return; }
      entwurfMachen(v); v.prozessverantwortlich = neu; speichern(); render();
    }
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
    S: () => S, vorlageVon, fortschritt, speichern, render, startVorbereiten, aktiveBezuege: (b) => ES.aktiveBezuege(b),
  });
  const ES = window.FLOW_EINSTELLUNGEN({ D, esc, ansage, frage, speichern, render: () => render(), S: () => S });
  S = laden() || neuerZustand();
  if (!S.einstellungen) S.einstellungen = kopie(window.FLOW_EINSTELLUNGEN_DATEN);
  if (!S.fd) S.fd = kopie(D.FUNKTIONENDIAGRAMM);
  if (!S.vertretungen) S.vertretungen = [];
  if (!S.einstellungen.eskalation) S.einstellungen.eskalation = kopie(window.FLOW_EINSTELLUNGEN_DATEN.eskalation);
  if (!S.einstellungen.perioden) S.einstellungen.perioden = kopie(window.FLOW_EINSTELLUNGEN_DATEN.perioden);
  Object.entries(S.einstellungen).forEach(([b, l]) => (l || []).forEach((e) => {
    if (e.tooltip === undefined) e.tooltip = e.kuerzel ? `${e.kuerzel} = ${e.name}` : "";
    if (e.farbe === undefined) e.farbe = "";
    if (b === "intervalle" && e.periode === undefined) { const v = window.FLOW_EINSTELLUNGEN_DATEN.intervalle.find((x) => x.kuerzel === e.kuerzel); e.periode = v ? v.periode : ""; }
  }));
  S.einstellungen.funktionen.forEach((e) => { if (e.vorgesetzt === undefined) { const v = window.FLOW_EINSTELLUNGEN_DATEN.funktionen.find((x) => x.kuerzel === e.kuerzel); e.vorgesetzt = v ? v.vorgesetzt : ""; } });
  S.vorlagen.forEach((v) => { if (!v.prozessverantwortlich) { const d = D.VORLAGEN.find((x) => x.id === v.id); v.prozessverantwortlich = kopie((d && d.prozessverantwortlich) || D.PROZESSVERANTWORTLICH); } });
  S.fd.forEach((f) => { if (!f.merkmale) { const d = D.FUNKTIONENDIAGRAMM.find((x) => x.nr === f.nr); f.merkmale = kopie((d && d.merkmale) || {}); } });
  if (!S.fdSpalten) S.fdSpalten = FD_SPALTEN.slice();
  rollenAbgleichen();
  try { if (localStorage.getItem("eduksx-thema") === "dunkel") document.documentElement.classList.add("dark"); } catch (e) { /* */ }
  motor();
  speichern();
  glossarLaden();
  render();
})();
