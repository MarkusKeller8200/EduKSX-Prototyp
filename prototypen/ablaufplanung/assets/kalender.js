/*
 * EduKSX-Flow – Jahreskalender (Teil des Klickprototyps «Ablaufplanung / Termine und ToDo»).
 * Ereignisse mit Zeitregel, Zuständigkeit und Teilaufgaben. Zeitregeln:
 *  - einmal pro Jahr: Quartal (ganzes Quartal), Kalenderwoche, Datum, Zeitraum
 *  - Schuljahr: Schuljahreswechsel, Schuljahresbeginn, Semesterwechsel, Semesterende, Schuljahresende – je mit
 *    Versatz in Tagen, Wochen oder Monaten (z. B. 2 Monate vor Schuljahresende); Termine je Schuljahr pflegbar
 *  - wiederkehrend: jedes Trimester, Semester, Quartal (Beginn, Ende oder ganzer Abschnitt, mit Versatz),
 *    monatlich, wöchentlich, täglich, alle Wochentage (Mo–Fr), Wochenende (Sa–So), Arbeitstage (Mo–Fr ohne Feiertage)
 * Ein Ereignis kann mit einer Ablaufvorlage verknüpft werden: Flow startet den Ablauf mit dem Datum des Vorkommens
 * als Stichtag. Wird von app.js über window.FLOW_KALENDER eingebunden.
 */
(function () {
  "use strict";

  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const MON_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const WOCHENTAGE = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const QUARTAL = { 1: "Januar–März", 2: "April–Juni", 3: "Juli–September", 4: "Oktober–Dezember" };
  const pad = (n) => String(n).padStart(2, "0");

  // Zeitregeln für Auswahl und Text
  const ARTEN = [
    ["Einmal pro Jahr", [["q", "Quartal (ganzes Quartal)"], ["kw", "Kalenderwoche"], ["am", "Datum"], ["zeitraum", "Zeitraum"]]],
    ["Schuljahr", [["stichtag", "Bezug auf Schuljahrestermin (± Tage/Wochen/Monate)"]]],
    ["Wiederkehrend", [["trimester", "jedes Trimester"], ["semester", "jedes Semester"], ["quartal", "jedes Quartal"], ["monatlich", "monatlich"], ["woechentlich", "wöchentlich"],
      ["taeglich", "täglich"], ["wochentage", "alle Wochentage (Mo–Fr)"], ["wochenende", "Wochenende (Sa–So)"], ["arbeitstage", "Arbeitstage (Mo–Fr ohne Feiertage)"]]],
  ];
  const ANKER = {
    schuljahreswechsel: "Schuljahreswechsel", schuljahresbeginn: "Schuljahresbeginn (1. Schultag)", semesterende1: "Semesterende (1. Semester)",
    semesterwechsel: "Semesterwechsel (Beginn 2. Semester)", semesterende: "Semesterende (beide Semester)", schuljahresende: "Schuljahresende (letzter Schultag)",
  };
  const SERIE = ["taeglich", "wochentage", "wochenende", "arbeitstage", "woechentlich"]; // als eine Zeile/ein Balken darstellen
  const ABSCHNITT = { trimester: "Trimester", semester: "Semester", quartal: "Quartal" };
  const GRENZE = { trimester: ["Trimesterbeginn", "Trimesterende"], semester: ["Semesterbeginn", "Semesterende"], quartal: ["Quartalsbeginn", "Quartalsende"] };

  window.FLOW_KALENDER = function (X) {
    const { D, esc, addTage, tageZwischen, datumKurz, kopie, ansage, frage } = X;
    const S = () => X.S();
    const B = D.BEREICHE;

    // ------------------------------------------------------------ Datum
    function isoMontag(y, w) {
      const j4 = new Date(Date.UTC(y, 0, 4));
      const tag = j4.getUTCDay() || 7;
      j4.setUTCDate(j4.getUTCDate() - tag + 1 + (w - 1) * 7);
      return j4.toISOString().slice(0, 10);
    }
    function kwVon(iso) {
      const d = new Date(iso + "T12:00:00Z");
      const tag = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - tag);
      const j1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(((d - j1) / 86400000 + 1) / 7);
    }
    const letzterTag = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
    const wochentag = (iso) => new Date(iso + "T12:00:00Z").getUTCDay() || 7;
    function addMonate(iso, n) {
      const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)) - 1 + n, t = Number(iso.slice(8, 10));
      const yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
      return `${yy}-${pad(mm + 1)}-${pad(Math.min(t, letzterTag(yy, mm + 1)))}`;
    }
    function versetzt(iso, n, einheit) {
      n = Number(n || 0);
      return einheit === "monate" ? addMonate(iso, n) : addTage(iso, einheit === "wochen" ? n * 7 : n);
    }
    // Gesetzliche Feiertage Kanton Zürich (für «Arbeitstage»)
    const FT_CACHE = {};
    function ostern(y) {
      const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
      const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
      return `${y}-${pad(monat)}-${pad(tag)}`;
    }
    function feiertage(y) {
      if (FT_CACHE[y]) return FT_CACHE[y];
      const o = ostern(y);
      const liste = [[`${y}-01-01`, "Neujahr"], [`${y}-01-02`, "Berchtoldstag"], [addTage(o, -2), "Karfreitag"], [addTage(o, 1), "Ostermontag"], [`${y}-05-01`, "Tag der Arbeit"],
        [addTage(o, 39), "Auffahrt"], [addTage(o, 50), "Pfingstmontag"], [`${y}-08-01`, "Bundesfeier"], [`${y}-12-25`, "Weihnachten"], [`${y}-12-26`, "Stephanstag"]];
      FT_CACHE[y] = { liste, set: new Set(liste.map((x) => x[0])) };
      return FT_CACHE[y];
    }
    const istFeiertag = (iso) => feiertage(Number(iso.slice(0, 4))).set.has(iso);

    // ------------------------------------------------------------ Schuljahre
    const schuljahre = () => S().schuljahre.slice().sort((a, b) => a.beginn.localeCompare(b.beginn));
    function abschnitte(art, von, bis) {
      const out = [];
      if (art === "quartal") {
        for (let y = Number(von.slice(0, 4)) - 1; y <= Number(bis.slice(0, 4)) + 1; y++) for (let q = 1; q <= 4; q++) out.push({ a: `${y}-${pad(3 * q - 2)}-01`, b: `${y}-${pad(3 * q)}-${letzterTag(y, 3 * q)}`, name: `Q${q} ${y}` });
        return out;
      }
      schuljahre().forEach((sj) => {
        if (art === "semester") {
          out.push({ a: sj.beginn, b: sj.semesterende1, name: `1. Semester ${sj.name}` });
          out.push({ a: sj.semesterwechsel, b: sj.ende, name: `2. Semester ${sj.name}` });
        } else {
          out.push({ a: sj.beginn, b: addTage(sj.trimester2, -1), name: `1. Trimester ${sj.name}` });
          out.push({ a: sj.trimester2, b: addTage(sj.trimester3, -1), name: `2. Trimester ${sj.name}` });
          out.push({ a: sj.trimester3, b: sj.ende, name: `3. Trimester ${sj.name}` });
        }
      });
      return out;
    }
    function ankerDaten(anker) {
      const out = [];
      schuljahre().forEach((sj) => {
        const d = { schuljahreswechsel: [sj.wechsel], schuljahresbeginn: [sj.beginn], semesterende1: [sj.semesterende1], semesterwechsel: [sj.semesterwechsel], semesterende: [sj.semesterende1, sj.ende], schuljahresende: [sj.ende] }[anker] || [];
        d.forEach((x) => out.push({ d: x, sj: sj.name }));
      });
      return out;
    }

    // ------------------------------------------------------------ Vorkommen
    const istSerie = (ev) => SERIE.includes(ev.zeit.regel);
    function jaehrlichIm(ev, y) {
      const z = ev.zeit;
      if (z.q) return { von: `${y}-${pad(3 * z.q - 2)}-01`, bis: `${y}-${pad(3 * z.q)}-${letzterTag(y, 3 * z.q)}` };
      if (z.kw) { const v = isoMontag(y, z.kw); return { von: v, bis: addTage(v, 4) }; }
      if (z.am) return { von: `${y}-${z.am}`, bis: `${y}-${z.am}` };
      return { von: `${y}-${z.von}`, bis: `${y}-${z.bis}` };
    }
    /** Alle Vorkommen eines Ereignisses, die den Zeitraum [von, bis] berühren. */
    function vorkommenZwischen(ev, von, bis) {
      const z = ev.zeit, out = [];
      const add = (a, b, info) => { if (b >= von && a <= bis && (!ev.jahr || Number(a.slice(0, 4)) === ev.jahr)) out.push({ ev, von: a, bis: b, info: info || "", key: ev.id + "|" + a }); };
      const r = z.regel;
      if (!r) {
        for (let y = Number(von.slice(0, 4)) - 1; y <= Number(bis.slice(0, 4)) + 1; y++) { const o = jaehrlichIm(ev, y); add(o.von, o.bis); }
      } else if (SERIE.includes(r)) {
        for (let d = von; d <= bis; d = addTage(d, 1)) {
          const w = wochentag(d);
          const ok = r === "taeglich" || (r === "wochentage" && w <= 5) || (r === "wochenende" && w >= 6) || (r === "arbeitstage" && w <= 5 && !istFeiertag(d)) || (r === "woechentlich" && w === Number(z.wochentag || 1));
          if (ok) add(d, d);
        }
      } else if (r === "monatlich") {
        for (let d = `${von.slice(0, 7)}-01`; d <= bis; d = addMonate(d, 1)) {
          const y = Number(d.slice(0, 4)), m = Number(d.slice(5, 7));
          const t = z.tag === "letzter" ? letzterTag(y, m) : Math.min(Number(z.tag || 1), letzterTag(y, m));
          const x = `${d.slice(0, 7)}-${pad(t)}`;
          add(x, x);
        }
      } else if (ABSCHNITT[r]) {
        abschnitte(r, von, bis).forEach((s) => {
          if (z.bezug === "ganz") add(s.a, s.b, s.name);
          else { const x = addTage(z.bezug === "ende" ? s.b : s.a, Number(z.versatz || 0)); add(x, x, s.name); }
        });
      } else if (r === "stichtag") {
        ankerDaten(z.anker).forEach((x) => { const d = versetzt(x.d, z.versatz, z.einheit); add(d, d, `${ANKER[z.anker]} ${x.sj}: ${datumKurz(x.d)}`); });
      }
      const gesehen = new Set();
      return out.filter((o) => (gesehen.has(o.key) ? false : gesehen.add(o.key))).sort((a, b) => a.von.localeCompare(b.von));
    }
    function periode() {
      const k = S().kal;
      return k.modus === "schuljahr" ? { von: `${k.jahr}-08-01`, bis: `${k.jahr + 1}-07-31`, name: `Schuljahr ${k.jahr}/${String(k.jahr + 1).slice(2)}` }
        : { von: `${k.jahr}-01-01`, bis: `${k.jahr}-12-31`, name: `Kalenderjahr ${k.jahr}` };
    }
    /** Einmal-pro-Jahr-Ereignisse: nur das Vorkommen mit der grössten Überlappung (Jahreswechsel bei KW 1 u. ä.). */
    function vorkommenImZeitraum(ev, p) {
      const liste = vorkommenZwischen(ev, p.von, p.bis);
      if (ev.zeit.regel || liste.length < 2) return liste;
      const ueber = (o) => tageZwischen(o.von > p.von ? o.von : p.von, o.bis < p.bis ? o.bis : p.bis);
      return [liste.reduce((a, b) => (ueber(b) > ueber(a) ? b : a))];
    }
    /** Nächstes offenes Vorkommen ab einem Tag (für Serien). */
    function naechstes(ev, ab) {
      ab = ab || S().heute;
      let von = ab;
      for (let i = 0; i < 4; i++) {
        const l = vorkommenZwischen(ev, von, addTage(von, 120)).filter((o) => o.bis >= ab && !erledigt(o));
        if (l.length) return l[0];
        von = addTage(von, 121);
      }
      return null;
    }

    const EINHEIT = { tage: ["Tag", "Tage"], wochen: ["Woche", "Wochen"], monate: ["Monat", "Monate"] };
    function zeitregel(ev) {
      const z = ev.zeit;
      const w = ev.jahr ? `nur ${ev.jahr}` : "jährlich";
      switch (z.regel) {
        case "stichtag": {
          const n = Number(z.versatz || 0), e = EINHEIT[z.einheit || "tage"];
          return n ? `${Math.abs(n)} ${Math.abs(n) === 1 ? e[0] : e[1]} ${n < 0 ? "vor" : "nach"} ${ANKER[z.anker]}` : `am ${ANKER[z.anker]}`;
        }
        case "trimester": case "semester": case "quartal": {
          const a = ABSCHNITT[z.regel];
          if (z.bezug === "ganz") return `jedes ${a} (ganzer Abschnitt)`;
          const n = Number(z.versatz || 0);
          const ort = GRENZE[z.regel][z.bezug === "ende" ? 1 : 0];
          return `jedes ${a}: ${n ? `${Math.abs(n)} ${Math.abs(n) === 1 ? "Tag" : "Tage"} ${n < 0 ? "vor" : "nach"} ` : "am "}${ort}`;
        }
        case "monatlich": return `monatlich am ${z.tag === "letzter" ? "letzten Tag" : z.tag + "."}`;
        case "woechentlich": return `wöchentlich am ${WOCHENTAGE[Number(z.wochentag || 1)]}`;
        case "taeglich": return "täglich";
        case "wochentage": return "alle Wochentage (Montag–Freitag)";
        case "wochenende": return "jedes Wochenende (Samstag–Sonntag)";
        case "arbeitstage": return "alle Arbeitstage (Mo–Fr ohne Feiertage Kanton Zürich)";
        default:
          if (z.q) return `${w}, Quartal ${z.q} (${QUARTAL[z.q]})`;
          if (z.kw) return `${w}, Kalenderwoche ${z.kw}`;
          if (z.am) return `${w}, am ${z.am.split("-").reverse().join(".")}.`;
          return `${w}, ${z.von.split("-").reverse().join(".")}.–${z.bis.split("-").reverse().join(".")}.`;
      }
    }
    const regelKurz = (ev) => ({ stichtag: "Schuljahr", trimester: "Trimester", semester: "Semester", quartal: "Quartal", monatlich: "monatlich", woechentlich: "wöchentlich", taeglich: "täglich", wochentage: "Mo–Fr", wochenende: "Sa–So", arbeitstage: "Arbeitstage" }[ev.zeit.regel] || (ev.jahr ? `nur ${ev.jahr}` : "jährlich"));
    function wann(o) {
      const z = o.ev.zeit;
      if (istSerie(o.ev)) return `${zeitregel(o.ev)} · nächstes ${datumKurz(o.von)}`;
      const d = o.von === o.bis ? datumKurz(o.von) : `${datumKurz(o.von)} – ${datumKurz(o.bis)}`;
      return d + (z.kw ? ` · KW ${z.kw}` : z.q ? ` · Q${z.q}` : "");
    }

    // ------------------------------------------------------------ Status und Filter
    const erledigt = (o) => !!S().kalErledigt[o.key];
    const teilErledigt = (o, i) => !!S().kalErledigt[o.key + "#" + i];
    function status(o) {
      const h = S().heute;
      if (erledigt(o)) return ["erfolg", "✓", "erledigt"];
      if (o.bis < h) return ["fehler", "!", "überfällig"];
      if (o.von <= h) return ["info", "●", o.von === o.bis ? "heute" : "läuft"];
      if (tageZwischen(h, o.von) <= 28) return ["warnung", "◷", "demnächst"];
      return ["neutral", "…", "geplant"];
    }
    const statusBadge = (o) => { const s = status(o); return `<span class="badge ${s[0]}">${s[1]} ${s[2]}</span>`; };
    const bereichBadge = (k) => `<span class="badge ${(B[k] || ["", "neutral"])[1]}">${esc((B[k] || [k])[0])}</span>`;
    const zustaendig = (ev) => Object.entries(ev.rollen || {}).filter(([, z]) => /[EV]/.test(z));
    function zustaendigText(ev) {
      const z = zustaendig(ev);
      return z.length ? z.map(([r, w]) => `<span class="rolle" title="${esc(D.KAL_ROLLEN[r] || r)}">${esc(r)}</span> <span class="small muted">${esc(w)}</span>`).join(" ") : `<span class="muted small">offen</span>`;
    }
    function passt(ev) {
      const f = S().kal;
      const meine = D.KAL_ZUORDNUNG[S().rolle] || [];
      if (f.bereich && ev.bereich !== f.bereich) return false;
      if (f.quelle && ev.quelle !== f.quelle) return false;
      if (f.nurFlow && !ev.flow) return false;
      if (f.regel === "jaehrlich" && ev.zeit.regel) return false;
      if (f.regel === "schuljahr" && ev.zeit.regel !== "stichtag") return false;
      if (f.regel === "wiederkehrend" && !(ev.zeit.regel && ev.zeit.regel !== "stichtag")) return false;
      if (f.rolle === "meine" && !zustaendig(ev).some(([r]) => meine.includes(r))) return false;
      if (f.rolle && f.rolle !== "meine" && !/[EV]/.test((ev.rollen || {})[f.rolle] || "")) return false;
      return true;
    }
    /** Zeilen für Liste/Zeitleiste: Serien als eine Zeile (nächstes Vorkommen), sonst jedes Vorkommen. */
    function zeilen(p) {
      const f = S().kal, h = S().heute;
      const out = [];
      S().ereignisse.filter(passt).forEach((ev) => {
        if (istSerie(ev)) {
          const ab = h < p.von ? p.von : h > p.bis ? p.bis : h;
          const n = naechstes(ev, ab) || vorkommenZwischen(ev, p.von, p.bis).slice(-1)[0];
          if (n && !(f.nurOffen && erledigt(n))) out.push(Object.assign({}, n, { serie: true }));
          return;
        }
        vorkommenImZeitraum(ev, p).forEach((o) => { if (!(f.nurOffen && erledigt(o))) out.push(o); });
      });
      return out.sort((a, b) => (a.serie === b.serie ? 0 : a.serie ? -1 : 1) || a.von.localeCompare(b.von) || a.bis.localeCompare(b.bis));
    }
    /** Nächste Termine ab heute (Übersicht, Aufgaben): Serien nur mit dem nächsten Vorkommen. */
    function demnaechst(tage, nurMeine) {
      const h = S().heute;
      const meine = D.KAL_ZUORDNUNG[S().rolle] || [];
      const out = [];
      S().ereignisse.forEach((ev) => {
        if (nurMeine && !zustaendig(ev).some(([r]) => meine.includes(r))) return;
        if (istSerie(ev)) { const n = naechstes(ev, h); if (n && n.von <= addTage(h, tage)) out.push(n); return; }
        vorkommenZwischen(ev, addTage(h, -60), addTage(h, tage)).forEach((o) => { if (!erledigt(o)) out.push(o); });
      });
      return out.sort((a, b) => a.bis.localeCompare(b.bis) || a.von.localeCompare(b.von));
    }

    // ------------------------------------------------------------ Ansichten
    function filterLeiste() {
      const k = S().kal;
      const j0 = Number(S().heute.slice(0, 4));
      const zeitr = [];
      [j0 - 1, j0, j0 + 1].forEach((y) => zeitr.push([`kalender:${y}`, `Kalenderjahr ${y}`]));
      [j0 - 1, j0].forEach((y) => zeitr.push([`schuljahr:${y}`, `Schuljahr ${y}/${String(y + 1).slice(2)}`]));
      const aktiv = `${k.modus}:${k.jahr}`;
      const opt = (liste, wert) => liste.map(([v, t]) => `<option value="${esc(v)}" ${v === (wert || "") ? "selected" : ""}>${esc(t)}</option>`).join("");
      return `<div class="formzeile filterleiste">
        <label class="feld">Zeitraum<select data-aktion="kal-zeitraum">${opt(zeitr, aktiv)}</select></label>
        <label class="feld">Bereich<select data-aktion="kal-filter" data-f="bereich">${opt([["", "alle Bereiche"]].concat(Object.entries(B).map(([b, v]) => [b, v[0]])), k.bereich)}</select></label>
        <label class="feld">Zeitregel<select data-aktion="kal-filter" data-f="regel">${opt([["", "alle Zeitregeln"], ["jaehrlich", "einmal pro Jahr"], ["schuljahr", "Schuljahrestermine"], ["wiederkehrend", "wiederkehrend (Trimester … täglich)"]], k.regel)}</select></label>
        <label class="feld">Zuständig (E/V)<select data-aktion="kal-filter" data-f="rolle">${opt([["", "alle Rollen"], ["meine", `meine Rolle (${X.ROLLEN[S().rolle]})`]].concat(Object.entries(D.KAL_ROLLEN).map(([r, n]) => [r, `${r} – ${n}`])), k.rolle)}</select></label>
        <label class="feld">Quelle<select data-aktion="kal-filter" data-f="quelle">${opt([["", "alle Quellen"]].concat(Object.entries(D.QUELLEN)), k.quelle)}</select></label>
        <label class="small"><input type="checkbox" data-aktion="kal-filter" data-f="nurFlow" ${k.nurFlow ? "checked" : ""}> nur mit Ablauf verknüpft</label>
        <label class="small"><input type="checkbox" data-aktion="kal-filter" data-f="nurOffen" ${k.nurOffen ? "checked" : ""}> nur offene</label>
      </div>`;
    }

    function seite(ansicht) {
      ansicht = ansicht || "zeitleiste";
      const p = periode();
      const liste = zeilen(p);
      const h = S().heute;
      const ueber = liste.filter((o) => !erledigt(o) && o.bis < h);
      const bald = liste.filter((o) => !erledigt(o) && o.bis >= h && tageZwischen(h, o.von) <= 28);
      const verkn = new Set(liste.filter((o) => o.ev.flow).map((o) => o.ev.id));
      const darf = ["SV", "SL", "ICT"].includes(S().rolle);
      const naechste = demnaechst(28, false).slice(0, 6);
      const inhalt = ansicht === "liste" ? listenAnsicht(liste, p) : ansicht === "quartale" ? quartalsAnsicht(liste) : ansicht === "schuljahre" ? schuljahresAnsicht() : zeitleiste(liste, p);
      return `
        <div class="seitenkopf"><div><h1>Jahreskalender</h1><p class="muted">Termine und ToDos im Jahreslauf – einmal pro Jahr, auf Schuljahrestermine bezogen (z. B. 2 Monate vor Schuljahresende) oder wiederkehrend vom Trimester bis zum Arbeitstag. Ereignisse lassen sich mit einer Ablaufvorlage verknüpfen; der Ablauf startet dann mit dem Datum des Vorkommens als Stichtag.</p></div>
          <div class="aktionen"><button class="btn primaer" data-aktion="kal-neu" ${darf ? "" : 'disabled title="Schulverwaltung, Schulleitung oder ICT-Support"'}>＋ Ereignis</button></div></div>
        <div class="karten">
          <div class="karte"><div class="zahl">${liste.length}</div><div class="titel">Termine im ${esc(p.name)} (Serien je 1)</div></div>
          <div class="karte"><div class="zahl">${bald.length}</div><div class="titel">◷ in den nächsten 4 Wochen</div></div>
          <div class="karte"><div class="zahl">${ueber.length}</div><div class="titel">${ueber.length ? "⚠ " : ""}überfällig, nicht erledigt</div></div>
          <div class="karte"><div class="zahl">${verkn.size}</div><div class="titel">Ereignisse mit Ablauf verknüpft</div></div>
        </div>
        ${naechste.length && ansicht !== "schuljahre" ? `<div class="karte demnaechst"><h2>Als Nächstes</h2><ul class="infoliste">${naechste.map((o) => `<li><button class="link" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}">${esc(o.ev.titel)}</button> <span class="small muted">${istSerie(o.ev) ? datumKurz(o.von) + " · " + esc(regelKurz(o.ev)) : wann(o)}</span> ${statusBadge(o)} ${o.ev.flow ? `<span class="badge violett" title="Mit Ablaufvorlage verknüpft">⇢ Ablauf</span>` : ""}</li>`).join("")}</ul></div>` : ""}
        ${ansicht === "schuljahre" ? "" : filterLeiste()}
        <div class="reiter" role="tablist">
          <button role="tab" aria-selected="${ansicht === "zeitleiste"}" data-aktion="reiter" data-ziel="#/kalender/zeitleiste">Zeitleiste</button>
          <button role="tab" aria-selected="${ansicht === "liste"}" data-aktion="reiter" data-ziel="#/kalender/liste">Liste (${liste.length})</button>
          <button role="tab" aria-selected="${ansicht === "quartale"}" data-aktion="reiter" data-ziel="#/kalender/quartale">Quartale</button>
          <button role="tab" aria-selected="${ansicht === "schuljahre"}" data-aktion="reiter" data-ziel="#/kalender/schuljahre">Schuljahresdaten</button>
        </div>
        ${inhalt}`;
    }

    function zeitleiste(liste, p) {
      const start = addTage(p.von, -((new Date(p.von + "T12:00:00Z").getUTCDay() || 7) - 1));
      const N = Math.ceil((tageZwischen(start, p.bis) + 1) / 7);
      const col = (d) => Math.min(N, Math.max(1, Math.floor(tageZwischen(start, d) / 7) + 1));
      let html = `<div class="zl-wrap" data-glossary-ignore><div class="zl" style="grid-template-columns: 190px repeat(${N}, minmax(15px, 1fr))">`;
      html += `<div class="zl-ecke" style="grid-row:1;grid-column:1">${esc(p.name)}</div>`;
      for (let d = p.von; d <= p.bis; ) {
        const y = Number(d.slice(0, 4)), m = Number(d.slice(5, 7));
        const naechster = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
        html += `<div class="zl-monat" style="grid-row:1;grid-column:${col(d) + 1} / ${col(addTage(naechster, -1)) + 2}">${MON_KURZ[m - 1]}</div>`;
        d = naechster;
      }
      html += `<div class="zl-ecke klein" style="grid-row:2;grid-column:1">KW</div>`;
      for (let i = 1; i <= N; i++) { const kw = kwVon(addTage(start, (i - 1) * 7)); html += `<div class="zl-kw" style="grid-row:2;grid-column:${i + 1}">${i % 2 ? kw : ""}</div>`; }
      // Schuljahrestermine als Markierungen
      const marken = [];
      schuljahre().forEach((sj) => [["wechsel", "Schuljahreswechsel"], ["semesterwechsel", "Semesterwechsel"], ["ende", "Schuljahresende"]].forEach(([k, t]) => { if (sj[k] >= p.von && sj[k] <= p.bis) marken.push([sj[k], t]); }));
      let row = 3;
      const bereiche = Object.keys(B).filter((b) => liste.some((o) => o.ev.bereich === b));
      if (!bereiche.length) return `<p class="muted">Keine Ereignisse für diese Auswahl.</p>`;
      bereiche.forEach((b, bi) => {
        const items = liste.filter((o) => o.ev.bereich === b).map((o) => {
          if (o.serie) return { o, c1: 1, c2: N, cv: N };
          return { o, c1: col(o.von < p.von ? p.von : o.von), c2: col(o.bis > p.bis ? p.bis : o.bis) };
        }).sort((a, z) => (a.o.serie ? -1 : 0) - (z.o.serie ? -1 : 0) || a.c1 - z.c1 || z.c2 - a.c2);
        const bahnen = [];
        items.forEach((it) => {
          const min = it.o.ev.zeit.regel ? 4 : 7;
          if (!it.cv) it.cv = Math.min(N, Math.max(it.c2, it.c1 + min - 1));
          let l = bahnen.findIndex((ende) => ende < it.c1);
          if (l < 0) { bahnen.push(0); l = bahnen.length - 1; }
          bahnen[l] = it.cv; it.l = l;
        });
        const n = Math.max(1, bahnen.length);
        html += `<div class="zl-bahn ${bi % 2 ? "b2" : ""}" style="grid-row:${row} / span ${n};grid-column:1 / ${N + 2}"></div>`;
        html += `<div class="zl-label" style="grid-row:${row} / span ${n}">${bereichBadge(b)}<span class="small muted">${items.length}</span></div>`;
        items.forEach((it) => {
          const o = it.o, s = status(o);
          const punkt = !o.serie && it.c2 < it.cv;
          const text = o.serie ? `↻ ${o.ev.titel} · ${regelKurz(o.ev)}` : `${s[0] === "erfolg" ? "✓ " : s[0] === "fehler" ? "! " : ""}${o.ev.zeit.regel ? "↻ " : ""}${o.ev.titel}`;
          html += `<button class="zl-item b-${(B[b] || ["", "neutral"])[1]} st-${o.serie ? "serie" : s[0]} ${punkt ? "punkt" : ""} ${o.serie ? "serie" : ""}" style="grid-row:${row + it.l};grid-column:${it.c1 + 1} / ${it.cv + 2}" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}" title="${esc(o.ev.titel)} – ${esc(o.serie ? zeitregel(o.ev) + ", nächstes " + datumKurz(o.von) : wann(o))} – ${s[2]}${o.ev.flow ? " – mit Ablauf verknüpft" : ""}">${o.ev.flow ? "⇢ " : ""}${esc(text)}</button>`;
        });
        row += n;
      });
      marken.forEach(([d, t]) => { html += `<div class="zl-marke" style="grid-row:2 / ${row};grid-column:${col(d) + 1}" title="${esc(t)}: ${datumKurz(d)}"><span>${esc(t)}</span></div>`; });
      const h = S().heute;
      if (h >= p.von && h <= p.bis) html += `<div class="zl-heute" style="grid-row:1 / ${row};grid-column:${col(h) + 1}" title="Heute (simuliert): ${datumKurz(h)}"><span>heute</span></div>`;
      html += `</div></div><p class="small muted">Balken = Zeitraum; Einzeltermine beginnen mit einem Punkt in ihrer Woche. ↻ = wiederkehrend; Serien (täglich bis wöchentlich) als ein durchgehender Balken. Gestrichelte Linien = Schuljahreswechsel, Semesterwechsel, Schuljahresende. ⇢ mit Ablauf verknüpft, ✓ erledigt, ! überfällig.</p>`;
      return html;
    }

    function listenAnsicht(liste, p) {
      if (!liste.length) return `<p class="muted">Keine Ereignisse für diese Auswahl.</p>`;
      let monat = "";
      const zeile = (o) => {
        const v = o.ev.flow ? X.vorlageVon(o.ev.flow) : null;
        const teil = o.ev.teil.length ? `<div class="small muted">Teilaufgaben ${o.ev.teil.filter((t, i) => teilErledigt(o, i)).length}/${o.ev.teil.length}</div>` : "";
        const info = o.info && !o.serie ? `<div class="small muted">${esc(o.info)}</div>` : "";
        return `<tr class="${erledigt(o) ? "blass" : ""}"><td class="small" style="white-space:nowrap">${o.serie ? `nächstes ${datumKurz(o.von)}` : wann(o)}</td>
          <td><button class="link" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}">${esc(o.ev.titel)}</button>${info}${teil}</td>
          <td>${bereichBadge(o.ev.bereich)}</td><td>${zustaendigText(o.ev)}</td>
          <td class="small">${esc(o.ev.zeit.regel ? zeitregel(o.ev) : regelKurz(o.ev))}</td>
          <td class="small">${v ? `<span class="badge violett">⇢ ${esc(v.titel)}</span>` : `<span class="muted">–</span>`}</td>
          <td style="white-space:nowrap">${statusBadge(o)} <button class="btn klein" data-aktion="kal-erledigt" data-key="${esc(o.key)}" aria-label="${erledigt(o) ? "wieder offen" : "als erledigt markieren"}" title="${erledigt(o) ? "Wieder offen" : o.serie ? "Dieses Vorkommen als erledigt markieren" : "Als erledigt markieren"}">${erledigt(o) ? "↺" : "✓"}</button></td></tr>`;
      };
      const serien = liste.filter((o) => o.serie), rest = liste.filter((o) => !o.serie);
      let html = serien.length ? `<tr class="monat"><th colspan="7">↻ Laufende Serien (täglich, Wochentage, Wochenende, Arbeitstage, wöchentlich)</th></tr>` + serien.map(zeile).join("") : "";
      html += rest.map((o) => {
        const m = (o.von < p.von ? p.von : o.von).slice(0, 7);
        let kopf = "";
        if (m !== monat) { monat = m; kopf = `<tr class="monat"><th colspan="7">${MONATE[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}</th></tr>`; }
        return kopf + zeile(o);
      }).join("");
      return `<div class="tabelle-wrap"><table><thead><tr><th>Wann</th><th>Ereignis</th><th>Bereich</th><th>Zuständig</th><th>Zeitregel</th><th>Ablauf</th><th>Status</th></tr></thead><tbody>${html}</tbody></table></div>`;
    }

    function quartalsAnsicht(liste) {
      const q = (o) => Math.floor((Number(o.von.slice(5, 7)) - 1) / 3) + 1;
      const reihenfolge = S().kal.modus === "schuljahr" ? [3, 4, 1, 2] : [1, 2, 3, 4];
      const karte = (n) => {
        const inQ = liste.filter((o) => !o.serie && q(o) === n);
        const plan = inQ.filter((o) => o.ev.quelle === "plan");
        const jaehrlich = plan.filter((o) => !o.ev.jahr), einmalig = plan.filter((o) => o.ev.jahr);
        const weitere = inQ.length - plan.length;
        const li = (o) => `<li><button class="link" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}">${erledigt(o) ? "✓ " : ""}${esc(o.ev.titel)}</button>${o.ev.flow ? ` <span class="badge violett">⇢</span>` : ""}</li>`;
        return `<div class="karte quartal"><h2>Q${n} <span class="small muted">${QUARTAL[n]}</span></h2>
          ${jaehrlich.length ? `<h3 class="small muted">jährlich</h3><ul>${jaehrlich.map(li).join("")}</ul>` : ""}
          ${einmalig.length ? `<h3 class="small muted">nur ${einmalig[0].ev.jahr} (DigiLex)</h3><ul class="einmalig">${einmalig.map(li).join("")}</ul>` : ""}
          ${weitere ? `<p class="small muted">+ ${weitere} weitere Termine – <a href="#/kalender/liste">Liste</a></p>` : ""}
          ${!inQ.length ? `<p class="muted small">Keine Ereignisse.</p>` : ""}</div>`;
      };
      return `<p class="small muted">Aufbau wie die Jahresplanung ICT-Prozesse (Flipchart): je Quartal die jährlich wiederkehrenden Aufgaben und die einmaligen Vorhaben. Serien (täglich bis wöchentlich) stehen in der Liste.</p><div class="quartale">${reihenfolge.map(karte).join("")}</div>`;
    }

    function schuljahresAnsicht() {
      const darf = ["SV", "SL"].includes(S().rolle);
      const sjs = schuljahre();
      const feld = (sj, k) => `<td><input type="date" value="${esc(sj[k])}" data-aktion="kal-sj" data-sj="${esc(sj.name)}" data-k="${k}" ${darf ? "" : "disabled"} aria-label="${esc(sj.name)} ${k}"></td>`;
      const pruef = (sj) => {
        const f = [];
        if (!(sj.beginn < sj.semesterende1 && sj.semesterende1 < sj.semesterwechsel && sj.semesterwechsel < sj.ende)) f.push("Reihenfolge Beginn < Semesterende < Semesterwechsel < Ende");
        if (!(sj.beginn < sj.trimester2 && sj.trimester2 < sj.trimester3 && sj.trimester3 < sj.ende)) f.push("Trimester ausserhalb des Schuljahres");
        return f.length ? `<span class="badge fehler">✕ ${esc(f.join("; "))}</span>` : `<span class="badge erfolg">✓ stimmig</span>`;
      };
      const verwendet = S().ereignisse.filter((ev) => ["stichtag", "trimester", "semester"].includes(ev.zeit.regel));
      const y = Number(S().heute.slice(0, 4));
      const naechstesSj = sjs.length ? (() => { const a = Number(sjs[sjs.length - 1].name.slice(0, 4)) + 1; return `${a}/${String(a + 1).slice(2)}`; })() : "";
      return `<p class="small muted">Diese Termine je Schuljahr steuern die Zeitregeln «Bezug auf Schuljahrestermin», «jedes Semester» und «jedes Trimester». Beispielwerte – bitte mit den Ferienplänen der Schule abgleichen. Bearbeiten: Schulverwaltung, Schulleitung.</p>
        <div class="tabelle-wrap"><table class="sj-tabelle"><thead><tr><th>Schuljahr</th><th>Schuljahreswechsel</th><th>Schuljahresbeginn</th><th>Semesterende (1.)</th><th>Semesterwechsel</th><th>Schuljahresende</th><th>2. Trimester ab</th><th>3. Trimester ab</th><th>Prüfung</th></tr></thead>
        <tbody>${sjs.map((sj) => `<tr><td><strong>${esc(sj.name)}</strong></td>${["wechsel", "beginn", "semesterende1", "semesterwechsel", "ende", "trimester2", "trimester3"].map((k) => feld(sj, k)).join("")}<td>${pruef(sj)}</td></tr>`).join("")}</tbody></table></div>
        <p style="margin-top:.6rem"><button class="btn" data-aktion="kal-sj-neu" ${darf ? "" : "disabled"}>＋ Schuljahr ${esc(naechstesSj)}</button></p>
        <div class="spalten" style="margin-top:1rem">
          <div class="karte"><h2>Ereignisse mit Schuljahresbezug (${verwendet.length})</h2><ul class="infoliste">${verwendet.map((ev) => `<li><button class="link" data-aktion="kal-oeffnen" data-id="${ev.id}">${esc(ev.titel)}</button> <span class="small muted">${esc(zeitregel(ev))}</span></li>`).join("") || `<li class="muted">keine</li>`}</ul></div>
          <div class="karte"><h2>Feiertage ${y} (Kanton Zürich)</h2><p class="small muted">Für die Zeitregel «Arbeitstage» (Montag–Freitag ohne diese Tage).</p><ul class="infoliste">${feiertage(y).liste.map(([d, t]) => `<li>${datumKurz(d)} <span class="small muted">${esc(t)}</span></li>`).join("")}</ul></div>
        </div>`;
    }

    // ------------------------------------------------------------ Dialog: Ereignis
    let K = null; // { id, von, bearbeiten, ev (Entwurf) }
    function oeffnen(id, von, bearbeiten) {
      const ev = S().ereignisse.find((x) => x.id === id);
      K = { id, von, bearbeiten: !!bearbeiten, ev: ev ? kopie(ev) : null };
      zeichnen();
    }
    function neu() {
      const id = "k" + Date.now().toString(36);
      K = { id, von: null, bearbeiten: true, neu: true, ev: { id, titel: "", bereich: "budget", zeit: { kw: kwVon(S().heute) }, jahr: null, rollen: {}, quelle: "eigen", flow: null, teil: [], notiz: "" } };
      zeichnen();
    }
    function aktuellesVorkommen() {
      const ev = S().ereignisse.find((x) => x.id === K.id);
      if (!ev) return null;
      const h = S().heute;
      if (K.von) {
        const t = vorkommenZwischen(ev, addTage(K.von, -1), addTage(K.von, 1)).find((o) => o.von === K.von);
        if (t) return t;
      }
      return naechstes(ev, h) || vorkommenZwischen(ev, addTage(h, -400), addTage(h, 400)).slice(-1)[0] || null;
    }
    function zeichnen() {
      let d = document.getElementById("kal-dlg");
      if (!d) { d = document.createElement("dialog"); d.id = "kal-dlg"; d.className = "breit"; document.body.appendChild(d); }
      d.innerHTML = K.bearbeiten ? formular() : ansicht();
      if (!d.open) d.showModal();
    }
    function ansicht() {
      const o = aktuellesVorkommen();
      const ev = S().ereignisse.find((x) => x.id === K.id);
      const darf = ["SV", "SL", "ICT"].includes(S().rolle);
      const v = ev.flow ? X.vorlageVon(ev.flow) : null;
      const laeufe = S().laeufe.filter((l) => l.ereignis && l.ereignis.split("|")[0] === ev.id);
      const rollen = Object.entries(ev.rollen || {});
      const startbar = v && v.status === "freigegeben" && o;
      const kommende = vorkommenZwischen(ev, S().heute, addTage(S().heute, 400)).filter((x) => !o || x.key !== o.key).slice(0, ev.zeit.regel ? 6 : 1);
      return `<div class="kal-detail" data-glossary-ignore>
        <div class="small muted">${esc(D.QUELLEN[ev.quelle] || "Eigenes Ereignis")}</div>
        <h2>${esc(ev.titel)}</h2>
        <p>${bereichBadge(ev.bereich)} ${o ? statusBadge(o) : ""} <span class="small muted">${esc(zeitregel(ev))}</span></p>
        <div class="feldliste">
          <div class="feldzeile"><span class="muted">Vorkommen</span><span>${o ? (o.von === o.bis ? datumKurz(o.von) : `${datumKurz(o.von)} – ${datumKurz(o.bis)}`) + (o.info ? ` <span class="small muted">(${esc(o.info)})</span>` : "") : "– (Schuljahresdaten erfasst?)"}</span></div>
          ${kommende.length ? `<div class="feldzeile"><span class="muted">Weitere</span><span class="small">${kommende.map((x) => `<button class="link" data-aktion="kal-oeffnen" data-id="${ev.id}" data-von="${x.von}">${datumKurz(x.von)}</button>`).join(" · ")}</span></div>` : ""}
          <div class="feldzeile"><span class="muted">Zuständigkeit</span><span>${rollen.length ? rollen.map(([r, z]) => `<span class="rolle" title="${esc(D.KAL_ROLLEN[r] || r)}">${esc(r)}</span> ${esc(z)}`).join(" · ") : `<span class="muted">noch offen</span>`}</span></div>
        </div>
        ${rollen.length ? `<p class="small muted">A = Abnahme · E = Entscheid · V = Verantwortung · M = Mitarbeit</p>` : ""}
        ${ev.notiz ? `<p>${esc(ev.notiz)}</p>` : ""}
        ${ev.teil.length && o ? `<h3>Teilaufgaben</h3><ul class="teilliste">${ev.teil.map((t, i) => `<li><label><input type="checkbox" data-aktion="kal-teil" data-key="${esc(o.key + "#" + i)}" ${teilErledigt(o, i) ? "checked" : ""}> ${esc(t[0])}</label> <span class="small muted">${datumKurz(`${o.von.slice(0, 4)}-${t[1]}`)}</span></li>`).join("")}</ul>` : ""}
        <h3>Verknüpfter Ablauf</h3>
        <div class="formzeile">
          <label class="feld">Ablaufvorlage<select data-aktion="kal-flow" ${darf ? "" : "disabled"}><option value="">– kein Ablauf –</option>${S().vorlagen.map((x) => `<option value="${x.id}" ${x.id === ev.flow ? "selected" : ""}>${esc(x.titel)} (v${x.version}${x.status === "entwurf" ? ", Entwurf" : ""})</option>`).join("")}</select></label>
          ${v ? `<button class="btn primaer" data-aktion="kal-starten" ${startbar ? "" : 'disabled title="Vorlage ist noch nicht freigegeben"'}>▶ Ablauf starten</button>` : ""}
        </div>
        <p class="small muted">${v && o ? `Beim Start wird das Datum dieses Vorkommens (${datumKurz(o.bis)}) als «${esc(v.stichtag)}» vorgeschlagen; ${esc(v.titel)} plant die Schritte von dort aus.` : "Noch keine Vorlage verknüpft – später z. B. Beschaffung, Schuljahreswechsel oder On-/Offboarding."}</p>
        ${laeufe.length ? `<ul class="infoliste">${laeufe.map((l) => `<li><a href="#/lauf/${l.id}" data-aktion="kal-schliessen">${esc(l.titel)}: ${esc(l.kontext.person)}</a> <span class="small muted">${l.abgeschlossen ? "✓ abgeschlossen" : X.fortschritt(l)[2] + " %"}</span></li>`).join("")}</ul>` : ""}
        <div class="formzeile" style="justify-content:flex-end;margin-top:1rem">
          ${darf ? `<button class="btn" data-aktion="kal-bearbeiten">✎ Bearbeiten</button>` : ""}
          ${o ? `<button class="btn" data-aktion="kal-erledigt" data-key="${esc(o.key)}">${erledigt(o) ? "↺ Wieder offen" : ev.zeit.regel ? "✓ Dieses Vorkommen erledigt" : "✓ Als erledigt markieren"}</button>` : ""}
          <button class="btn" data-aktion="kal-schliessen">Schliessen</button>
        </div></div>`;
    }
    const artVon = (z) => z.regel || (z.q ? "q" : z.kw ? "kw" : z.am ? "am" : "zeitraum");
    function formular() {
      const ev = K.ev, z = ev.zeit;
      const art = artVon(z);
      const datumFeld = (key, wert) => `<input type="text" data-k="${key}" value="${esc(wert || "")}" placeholder="MM-TT" pattern="\\d{2}-\\d{2}" style="width:6rem">`;
      const j0 = Number(S().heute.slice(0, 4));
      const sel = (k, liste, wert, neu) => `<select data-k="${k}" ${neu ? 'data-neu-zeichnen="1"' : ""}>${liste.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(wert) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
      const vRichtung = Number(z.versatz || 0) < 0 ? "vor" : Number(z.versatz || 0) > 0 ? "nach" : "am";
      let params = "";
      if (art === "q") params = `<label class="feld">Quartal${sel("q", [1, 2, 3, 4].map((n) => [n, `Q${n} (${QUARTAL[n]})`]), z.q || 1)}</label>`;
      if (art === "kw") params = `<label class="feld">Kalenderwoche<input type="number" min="1" max="53" data-k="kw" value="${z.kw || 1}"></label>`;
      if (art === "am") params = `<label class="feld">Datum (MM-TT)${datumFeld("am", z.am)}</label>`;
      if (art === "zeitraum") params = `<label class="feld">von (MM-TT)${datumFeld("von", z.von)}</label><label class="feld">bis (MM-TT)${datumFeld("bis", z.bis)}</label>`;
      if (art === "stichtag") params = `<label class="feld">Anzahl<input type="number" min="0" data-k="anzahl" value="${Math.abs(Number(z.versatz || 0))}" style="width:5rem"></label>
        <label class="feld">Einheit${sel("einheit", [["tage", "Tage"], ["wochen", "Wochen"], ["monate", "Monate"]], z.einheit || "tage")}</label>
        <label class="feld">Richtung${sel("richtung", [["vor", "vor"], ["am", "am (genau)"], ["nach", "nach"]], vRichtung)}</label>
        <label class="feld">Schuljahrestermin${sel("anker", Object.entries(ANKER), z.anker || "schuljahresende")}</label>`;
      if (ABSCHNITT[art]) params = `<label class="feld">Bezug${sel("bezug", [["beginn", GRENZE[art][0]], ["ende", GRENZE[art][1]], ["ganz", "ganzer Abschnitt"]], z.bezug || "beginn", true)}</label>
        ${z.bezug === "ganz" ? "" : `<label class="feld">Anzahl Tage<input type="number" min="0" data-k="anzahl" value="${Math.abs(Number(z.versatz || 0))}" style="width:5rem"></label><label class="feld">Richtung${sel("richtung", [["vor", "vorher"], ["am", "am Tag selbst"], ["nach", "nachher"]], vRichtung)}</label>`}`;
      if (art === "monatlich") params = `<label class="feld">Tag im Monat${sel("tag", [...Array(28).keys()].map((i) => [i + 1, `${i + 1}.`]).concat([["letzter", "letzter Tag"]]), z.tag || 1)}</label>`;
      if (art === "woechentlich") params = `<label class="feld">Wochentag${sel("wochentag", WOCHENTAGE.slice(1).map((t, i) => [i + 1, t]), z.wochentag || 1)}</label>`;
      let probe = "–";
      try {
        const l = vorkommenZwischen(Object.assign({}, ev, { id: "probe" }), S().heute, addTage(S().heute, 400)).slice(0, 5);
        probe = l.length ? l.map((o) => datumKurz(o.von) + (o.bis !== o.von ? "–" + datumKurz(o.bis) : "")).join(" · ") : "keine Vorkommen im nächsten Jahr";
      } catch (e) { /* unvollständige Eingabe */ }
      return `<form class="editor" data-glossary-ignore onsubmit="return false">
        <h2>${K.neu ? "Neues Ereignis" : "Ereignis bearbeiten"}</h2>
        <label class="feld">Bezeichnung<input type="text" data-k="titel" value="${esc(ev.titel)}" style="width:100%"></label>
        <div class="formzeile" style="margin-top:.6rem">
          <label class="feld">Bereich${sel("bereich", Object.entries(B).map(([b, v]) => [b, v[0]]), ev.bereich)}</label>
          <label class="feld">Gültig${sel("jahr", [["", "jedes Jahr"], [j0, `nur ${j0}`], [j0 + 1, `nur ${j0 + 1}`]], ev.jahr || "")}</label>
        </div>
        <fieldset><legend>Zeitregel</legend><div class="formzeile">
          <label class="feld">Art<select data-k="art" data-neu-zeichnen="1">${ARTEN.map(([g, l]) => `<optgroup label="${esc(g)}">${l.map(([v, t]) => `<option value="${v}" ${v === art ? "selected" : ""}>${esc(t)}</option>`).join("")}</optgroup>`).join("")}</select></label>
          ${params}
        </div>
        <p class="small muted">Vorschau: ${esc(zeitregel(ev))} → <strong>${esc(probe)}</strong> <button class="btn klein" data-aktion="kal-vorschau">↻ aktualisieren</button></p></fieldset>
        <fieldset><legend>Zuständigkeit</legend><div class="rollenraster">${Object.entries(D.KAL_ROLLEN).map(([r, n]) => `<label class="feld" title="${esc(n)}">${esc(r)}<select data-rolle="${r}">${["", "A", "E", "V", "M", "E/V", "M/E", "M/V"].map((w) => `<option ${w === (ev.rollen[r] || "") ? "selected" : ""}>${w}</option>`).join("")}</select></label>`).join("")}</div>
          <p class="small muted">A = Abnahme · E = Entscheid · V = Verantwortung · M = Mitarbeit</p></fieldset>
        <label class="feld" style="margin-top:.6rem">Notiz<textarea data-k="notiz" rows="2" style="width:100%">${esc(ev.notiz)}</textarea></label>
        <p class="small muted">Teilaufgaben: ${ev.teil.length ? ev.teil.map((t) => esc(t[0])).join(" · ") : "keine"} (im Prototyp nicht bearbeitbar)</p>
        <div class="formzeile" style="justify-content:space-between;margin-top:1rem">
          <span>${K.neu ? "" : `<button class="btn gefahr" data-aktion="kal-loeschen">✕ Löschen</button>`}</span>
          <span><button class="btn" data-aktion="kal-abbrechen">Abbrechen</button> <button class="btn primaer" data-aktion="kal-speichern">Übernehmen</button></span>
        </div></form>`;
    }
    function formularLesen() {
      const d = document.getElementById("kal-dlg");
      const q = (k) => d.querySelector(`[data-k="${k}"]`);
      const wert = (k, sonst) => (q(k) ? q(k).value : sonst);
      const ev = K.ev;
      ev.titel = q("titel").value.trim();
      ev.bereich = q("bereich").value;
      ev.jahr = q("jahr").value ? Number(q("jahr").value) : null;
      ev.notiz = q("notiz").value;
      const art = q("art").value;
      const z = ev.zeit, altArt = artVon(z);
      const h = S().heute, y0 = Number(h.slice(0, 4));
      const md = (iso) => iso.slice(5);
      // bisheriges Datum als Ausgangspunkt beim Wechsel der Art
      let basis = h;
      try { const l = vorkommenZwischen(Object.assign({}, ev, { zeit: z }), `${y0}-01-01`, `${y0}-12-31`); if (l.length) basis = l[0].von; } catch (e) { /* */ }
      const versatz = () => { const n = Math.abs(Number(wert("anzahl", Math.abs(Number(z.versatz || 0)))) || 0); const r = wert("richtung", Number(z.versatz || 0) < 0 ? "vor" : "nach"); return r === "am" ? 0 : r === "vor" ? -n : n; };
      const gleich = art === altArt;
      if (art === "q") ev.zeit = { q: Number(wert("q", Math.floor((Number(basis.slice(5, 7)) - 1) / 3) + 1)) };
      else if (art === "kw") ev.zeit = { kw: Math.min(53, Math.max(1, Number(wert("kw", kwVon(basis))) || 1)) };
      else if (art === "am") ev.zeit = { am: gleich ? wert("am", md(basis)) : md(basis) };
      else if (art === "zeitraum") ev.zeit = gleich ? { von: wert("von", md(basis)), bis: wert("bis", md(basis)) } : { von: md(basis), bis: z.bis || md(basis) };
      else if (art === "stichtag") ev.zeit = gleich ? { regel: art, anker: wert("anker", "schuljahresende"), versatz: versatz(), einheit: wert("einheit", "tage") } : { regel: art, anker: "schuljahresende", versatz: -14, einheit: "tage" };
      else if (ABSCHNITT[art]) { const bezug = gleich ? wert("bezug", z.bezug || "beginn") : "beginn"; ev.zeit = { regel: art, bezug, versatz: gleich && bezug !== "ganz" && q("anzahl") ? versatz() : 0 }; }
      else if (art === "monatlich") ev.zeit = { regel: art, tag: gleich ? (wert("tag", "1") === "letzter" ? "letzter" : Number(wert("tag", 1))) : Math.min(28, Number(basis.slice(8, 10))) };
      else if (art === "woechentlich") ev.zeit = { regel: art, wochentag: gleich ? Number(wert("wochentag", 1)) : wochentag(basis) };
      else ev.zeit = { regel: art };
      ev.rollen = {};
      d.querySelectorAll("[data-rolle]").forEach((s) => { if (s.value) ev.rollen[s.dataset.rolle] = s.value; });
    }
    function gueltig(ev) {
      const md = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
      if (!ev.titel) return "Bezeichnung fehlt.";
      if (ev.zeit.am && !md.test(ev.zeit.am)) return "Datum im Format MM-TT angeben (z. B. 08-15).";
      if (ev.zeit.von !== undefined && (!md.test(ev.zeit.von) || !md.test(ev.zeit.bis) || ev.zeit.von > ev.zeit.bis)) return "Zeitraum im Format MM-TT angeben, «von» vor «bis».";
      return "";
    }

    // ------------------------------------------------------------ Steuerung (von app.js aufgerufen)
    function klick(ak, el) {
      const st = S();
      switch (ak) {
        case "kal-oeffnen": oeffnen(el.dataset.id, el.dataset.von); return true;
        case "kal-neu": neu(); return true;
        case "kal-schliessen": { const d = document.getElementById("kal-dlg"); if (d) d.close(); K = null; return true; }
        case "kal-bearbeiten": K.bearbeiten = true; K.ev = kopie(st.ereignisse.find((x) => x.id === K.id)); zeichnen(); return true;
        case "kal-vorschau": formularLesen(); zeichnen(); return true;
        case "kal-abbrechen": if (K.neu) { document.getElementById("kal-dlg").close(); K = null; } else { K = { id: K.id, von: K.von, ev: kopie(st.ereignisse.find((x) => x.id === K.id)) }; zeichnen(); } return true;
        case "kal-speichern": {
          formularLesen();
          const f = gueltig(K.ev);
          if (f) { ansage(f); return true; }
          const i = st.ereignisse.findIndex((x) => x.id === K.ev.id);
          if (i >= 0) st.ereignisse[i] = K.ev; else st.ereignisse.push(K.ev);
          K = { id: K.ev.id, von: null, ev: kopie(K.ev) };
          X.speichern(); X.render(); zeichnen(); ansage("Ereignis gespeichert.");
          return true;
        }
        case "kal-loeschen": {
          const ev = st.ereignisse.find((x) => x.id === K.id);
          document.getElementById("kal-dlg").close();
          frage(`Ereignis «${ev.titel}» aus dem Jahreskalender löschen?`, "Ereignis löschen", () => {
            st.ereignisse = st.ereignisse.filter((x) => x.id !== ev.id); K = null; X.speichern(); X.render(); ansage("Ereignis gelöscht.");
          });
          return true;
        }
        case "kal-erledigt": {
          const k = el.dataset.key;
          if (st.kalErledigt[k]) delete st.kalErledigt[k]; else st.kalErledigt[k] = st.heute;
          X.speichern(); X.render(); if (K && document.getElementById("kal-dlg") && document.getElementById("kal-dlg").open) zeichnen();
          return true;
        }
        case "kal-starten": {
          const o = aktuellesVorkommen();
          const v = X.vorlageVon(o.ev.flow);
          X.startVorbereiten(v, o.bis, o.key, o.ev.titel);
          document.getElementById("kal-dlg").close(); K = null;
          location.hash = "#/neu/" + v.id;
          return true;
        }
        case "kal-sj-neu": {
          const l = schuljahre().slice(-1)[0];
          const plus = (iso) => addTage(iso, 364); // gleicher Wochentag im Folgejahr
          const a = Number(l.name.slice(0, 4)) + 1;
          st.schuljahre.push({ name: `${a}/${String(a + 1).slice(2)}`, wechsel: `${a}-08-01`, beginn: plus(l.beginn), semesterende1: plus(l.semesterende1), semesterwechsel: plus(l.semesterwechsel), ende: plus(l.ende), trimester2: plus(l.trimester2), trimester3: plus(l.trimester3) });
          X.speichern(); X.render(); ansage("Schuljahr ergänzt – Daten bitte prüfen.");
          return true;
        }
        default: return false;
      }
    }
    function aenderung(ak, el) {
      const st = S();
      if (ak === "kal-zeitraum") { const [m, y] = el.value.split(":"); st.kal.modus = m; st.kal.jahr = Number(y); X.speichern(); X.render(); return true; }
      if (ak === "kal-filter") { st.kal[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value; X.speichern(); X.render(); return true; }
      if (ak === "kal-teil") { const k = el.dataset.key; if (el.checked) st.kalErledigt[k] = st.heute; else delete st.kalErledigt[k]; X.speichern(); X.render(); return true; }
      if (ak === "kal-sj") { const sj = st.schuljahre.find((x) => x.name === el.dataset.sj); if (sj && el.value) { sj[el.dataset.k] = el.value; X.speichern(); X.render(); ansage(`Schuljahr ${sj.name}: gespeichert.`); } return true; }
      if (ak === "kal-flow") {
        const ev = st.ereignisse.find((x) => x.id === K.id);
        ev.flow = el.value || null; K.ev = kopie(ev);
        X.speichern(); X.render(); zeichnen(); ansage(ev.flow ? "Ablauf verknüpft." : "Verknüpfung entfernt.");
        return true;
      }
      if (el.dataset.neuZeichnen && K && K.bearbeiten) { formularLesen(); zeichnen(); return true; }
      return false;
    }

    /** Testdaten: Vergangenes (ohne Serien) ist erledigt – bis auf wenige Beispiele, die überfällig bzw. teilweise erledigt sind. */
    function vorbelegen() {
      const st = S(), h = st.heute;
      const offen = ["Office-Lizenzen", "Erneuerung Geräte älter als 5 Jahre (Notebooks, Tablets)", "Betriebssystem-Updates aktiv blockieren"];
      st.ereignisse.forEach((ev) => {
        if (istSerie(ev)) return;
        vorkommenZwischen(ev, addTage(h, -400), addTage(h, -1)).forEach((o) => {
          ev.teil.forEach((t, i) => { const td = `${o.von.slice(0, 4)}-${t[1]}`; if (td < h && !(offen.includes(ev.titel) && i >= 2)) st.kalErledigt[o.key + "#" + i] = td; });
          if (o.bis < addTage(h, -2) && !offen.includes(ev.titel)) st.kalErledigt[o.key] = o.bis;
        });
      });
    }

    return { seite, klick, vorbelegen, aenderung, demnaechst, wann, statusBadge, bereichBadge, kwVon, zustaendig, zeitregel, vorkommenZwischen };
  };
})();
