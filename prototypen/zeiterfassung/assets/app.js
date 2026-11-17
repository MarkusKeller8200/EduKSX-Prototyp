/*
 * EduKSX-Time – Stempeln (Prototyp, Schritt 1)
 * Kommen / Pause / Gehen mit Buchungsart, Tagesliste, Ist/Soll/Saldo, Verlauf, Offline-Speicher.
 * Nur erfundene Testdaten; Buchungen bleiben im Browser (localStorage), die Übertragung ist simuliert.
 */
(function () {
  "use strict";

  const SPEICHER = "eduksx-time-v1";
  const SOLL_100 = 8.4; // Stunden pro Arbeitstag bei 100 % (42-Stunden-Woche)
  const RUECKGAENGIG_MS = 2 * 60 * 1000;
  // Gesetzliche Pause (Vorgabe Projektleitung 17.11.2026): nach 5 Stunden Arbeit 30 Minuten, die nicht als Arbeitszeit
  // zählen. Bereits gebuchte Pausen werden angerechnet. ZU PRÜFEN: Abgleich mit Personalrecht/ArG Art. 15.
  const ZWANG_AB_MIN = 5 * 60;
  const ZWANG_DAUER_MIN = 30;
  const M = 60000;

  const ARTEN = {
    arbeitszeit: { name: "Arbeitszeit", zeichen: "▣" },
    homeoffice: { name: "Homeoffice", zeichen: "⌂" },
  };
  const TYPEN = {
    kommen: { name: "Kommen", pfeil: "→" },
    pause_beginn: { name: "Pause", pfeil: "॥" },
    pause_ende: { name: "Pause beendet", pfeil: "▸" },
    gehen: { name: "Gehen", pfeil: "←" },
  };
  // Kaffeetasse = Pause, Pfeil in die Tasse hinein bzw. Play = weiterarbeiten
  const SYMBOL_TASSE = '<svg class="symbol-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3.5c-.6.8-.6 1.7 0 2.5M12 3.5c-.6.8-.6 1.7 0 2.5"/></svg>';
  const SYMBOL_WEITER = '<svg class="symbol-svg" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
  const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  // ---------- Hilfen ----------
  const e = (s) => String(s ?? "").replace(/[&<>"']/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[z]);
  const zwei = (n) => String(n).padStart(2, "0");
  const hhmm = (ms) => { const d = new Date(ms); return `${zwei(d.getHours())}:${zwei(d.getMinutes())}`; };
  const tagKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`; };
  const tagStart = (key) => { const [j, m, t] = key.split("-").map(Number); return new Date(j, m - 1, t).getTime(); };
  const datumLang = (ms) => new Date(ms).toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const datumKurz = (key) => { const d = new Date(tagStart(key)); return `${WOCHENTAGE[d.getDay()].slice(0, 2)} ${d.getDate()}.${d.getMonth() + 1}.`; };
  function dauer(stunden, mitVorzeichen) {
    const neg = stunden < 0;
    const min = Math.round(Math.abs(stunden) * 60);
    const text = `${Math.floor(min / 60)}:${zwei(min % 60)}`;
    return mitVorzeichen ? (neg ? "−" : min === 0 ? "±" : "+") + text : (neg ? "−" : "") + text;
  }
  function laufzeit(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 3600)}:${zwei(Math.floor((s % 3600) / 60))}:${zwei(s % 60)}`;
  }
  const id = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

  // ---------- Daten ----------
  let daten = laden();
  let installEreignis = null;
  let hinweisInstallZu = false;

  function laden() {
    try {
      const d = JSON.parse(localStorage.getItem(SPEICHER) || "null");
      if (d && Array.isArray(d.buchungen)) return d;
    } catch (_) { /* neu anlegen */ }
    return demoDaten();
  }
  function speichern() {
    try { localStorage.setItem(SPEICHER, JSON.stringify(daten)); } catch (_) { /* privat/voll: nur im Speicher */ }
  }

  /** Erfundene Buchungen der letzten zwei Wochen (Arbeitstage), alle übertragen. */
  function demoDaten() {
    let z = 7;
    const zufall = (min, max) => { z = (z * 9301 + 49297) % 233280; return min + Math.round((z / 233280) * (max - min)); };
    const buchungen = [];
    const heute = tagStart(tagKey(Date.now()));
    for (let i = 14; i >= 1; i--) {
      const tag = new Date(heute); tag.setDate(tag.getDate() - i);
      const wt = tag.getDay();
      if (wt === 0 || wt === 6) continue;
      const art = wt === 3 && i < 8 ? "homeoffice" : "arbeitszeit";
      const um = (h, m) => { const d = new Date(tag); d.setHours(h, m, 0, 0); return d.getTime(); };
      const kommen = um(7, zufall(10, 50));
      const pause = um(12, zufall(0, 20));
      const pauseEnde = pause + zufall(30, 55) * 60000;
      const gehen = um(16, zufall(40, 59)) + zufall(0, 60) * 60000;
      buchungen.push(
        { id: id(), typ: "kommen", zeit: kommen, art, uebertragen: true },
        { id: id(), typ: "pause_beginn", zeit: pause, art, uebertragen: true },
        { id: id(), typ: "pause_ende", zeit: pauseEnde, art, uebertragen: true },
        { id: id(), typ: "gehen", zeit: gehen, art, uebertragen: true },
      );
    }
    return {
      person: { name: "Lea Muster", funktion: "Schulverwaltung", pensum: 80 },
      art: "arbeitszeit",
      buchungen,
    };
  }

  const sortiert = () => [...daten.buchungen].sort((a, b) => a.zeit - b.zeit);
  const letzte = () => sortiert().at(-1) || null;

  /** aus | ein | pause | vergessen (offene Buchung von einem früheren Tag) */
  function zustand(jetzt = Date.now()) {
    const l = letzte();
    if (!l || l.typ === "gehen") return { art: "aus", letzte: l };
    if (tagKey(l.zeit) !== tagKey(jetzt)) return { art: "vergessen", letzte: l };
    return { art: l.typ === "pause_beginn" ? "pause" : "ein", letzte: l };
  }

  function sollTag(key) {
    const wt = new Date(tagStart(key)).getDay();
    if (wt === 0 || wt === 6) return 0;
    return SOLL_100 * (Number(daten.person.pensum) || 0) / 100;
  }

  /** Arbeitsblöcke (von–bis) aus den Buchungen; offenAb = laufender Block ohne Ende. */
  function bloecke(liste) {
    const iv = [];
    let start = null;
    for (const b of liste) {
      if (b.typ === "kommen" || b.typ === "pause_ende") start = b.zeit;
      else if (start !== null) { iv.push({ von: start, bis: b.zeit }); start = null; }
    }
    return { iv, offenAb: start };
  }

  /**
   * Zeitachse des Tages: Arbeit, gebuchte Pause (Lücken) und gesetzliche Pause. Sobald 5 Stunden gearbeitet sind, wird
   * die gesetzliche Pause abgezogen – reduziert um alle am Tag gestempelten Pausen, auch spätere (#23). Wer insgesamt
   * mindestens 30 Minuten Pause stempelt, hat keine gesetzliche Pause; die schraffierte Fläche wird nachträglich kleiner.
   * laufendePauseMin: gerade laufende gestempelte Pause (noch ohne Ende), zählt ebenfalls.
   */
  function segmentieren(iv, laufendePauseMin = 0) {
    let gestempelt = laufendePauseMin;
    iv.forEach((x, i) => { if (i > 0 && x.von > iv[i - 1].bis) gestempelt += (x.von - iv[i - 1].bis) / M; });
    let zwangRest = Math.max(0, ZWANG_DAUER_MIN - gestempelt);
    const seg = [];
    let arbeit = 0, pause = 0, vorher = null;
    for (const { von, bis } of iv) {
      if (vorher !== null && von > vorher) { seg.push({ typ: "pause", von: vorher, bis: von }); pause += (von - vorher) / M; }
      let cur = Math.max(von, vorher ?? von);
      while (cur < bis) {
        if (arbeit >= ZWANG_AB_MIN && zwangRest > 0) {
          const ende = Math.min(bis, cur + zwangRest * M);
          if (ende - cur < 1) { zwangRest = 0; continue; }
          seg.push({ typ: "zwang", von: cur, bis: ende }); pause += (ende - cur) / M; zwangRest -= (ende - cur) / M; cur = ende;
        } else {
          const ende = Math.min(bis, arbeit < ZWANG_AB_MIN ? cur + (ZWANG_AB_MIN - arbeit) * M : bis);
          if (ende - cur < 1) { arbeit = ZWANG_AB_MIN; continue; }
          seg.push({ typ: "arbeit", von: cur, bis: ende }); arbeit += (ende - cur) / M; cur = ende;
        }
      }
      vorher = Math.max(vorher ?? bis, bis);
    }
    return { seg, arbeit, pause, gestempelt };
  }

  /** Ist und Pausen eines Tages; laufender Block zählt bis jetzt (nur heute), gesetzliche Pause abgezogen. */
  function auswertung(key, jetzt = Date.now()) {
    const liste = sortiert().filter((b) => tagKey(b.zeit) === key);
    const { iv, offenAb } = bloecke(liste);
    let offen = false;
    if (offenAb !== null) {
      if (key === tagKey(jetzt)) iv.push({ von: offenAb, bis: Math.max(offenAb, jetzt) }); else offen = true;
    }
    const letzteB = liste.at(-1);
    const laufend = key === tagKey(jetzt) && offenAb === null && letzteB?.typ === "pause_beginn" ? (jetzt - letzteB.zeit) / M : 0;
    const s = segmentieren(iv, laufend);
    const soll = sollTag(key);
    const ist = s.arbeit / 60;
    const zwang = s.seg.filter((x) => x.typ === "zwang").reduce((n, x) => n + (x.bis - x.von) / 3600000, 0);
    const letztes = s.seg.at(-1);
    const zwangJetzt = offenAb !== null && key === tagKey(jetzt) && letztes?.typ === "zwang" && letztes.bis >= jetzt - 1000 ? letztes : null;
    return { liste, ist, pause: s.pause / 60 + laufend / 60, gestempelt: s.gestempelt / 60, zwang, soll, saldo: ist - soll, offen, seg: s.seg, start: iv[0]?.von ?? null, zwangJetzt };
  }

  /** Vorschau ab jetzt bei ununterbrochener Arbeit: wann ist das Soll erreicht, wo liegt die gesetzliche Pause. */
  function prognose(key, jetzt, a) {
    if (a.soll <= 0) return null;
    const liste = sortiert().filter((b) => tagKey(b.zeit) === key);
    const { iv, offenAb } = bloecke(liste);
    iv.push({ von: offenAb ?? jetzt, bis: jetzt + 24 * 3600000 });
    const { seg } = segmentieren(iv);
    const sollMin = a.soll * 60;
    let summe = 0, sollEnde = null;
    for (const s of seg) {
      if (s.typ !== "arbeit") continue;
      const d = (s.bis - s.von) / M;
      if (summe + d >= sollMin) { sollEnde = s.von + (sollMin - summe) * M; break; }
      summe += d;
    }
    const zukunft = seg.filter((s) => s.typ === "zwang" && s.bis > jetzt && (sollEnde === null || s.von < sollEnde))
      .map((s) => ({ ...s, von: Math.max(s.von, jetzt) }));
    return { sollEnde, zukunft };
  }

  /** Ende der laufenden gesetzlichen Pause, wenn ohne Unterbruch weitergearbeitet wird. */
  function zwangEnde(jetzt) {
    const { iv, offenAb } = bloecke(sortiert().filter((b) => tagKey(b.zeit) === tagKey(jetzt)));
    iv.push({ von: offenAb ?? jetzt, bis: jetzt + 24 * 3600000 });
    const s = segmentieren(iv).seg.find((x) => x.typ === "zwang" && x.von <= jetzt && x.bis > jetzt);
    return s ? s.bis : jetzt;
  }

  function buchen(typ, zeit = Date.now(), extra = {}) {
    const b = { id: id(), typ, zeit, art: daten.art, uebertragen: false, ...extra };
    daten.buchungen.push(b);
    daten.zuletzt = extra.nachgetragen ? null : { id: b.id, um: Date.now() };
    speichern();
    if (navigator.vibrate) navigator.vibrate(30);
    uebertragen();
    zeichnen();
    ansage(`${TYPEN[typ].name} ${hhmm(zeit)} gebucht.`);
  }

  function rueckgaengig() {
    if (!daten.zuletzt) return;
    daten.buchungen = daten.buchungen.filter((b) => b.id !== daten.zuletzt.id);
    daten.zuletzt = null;
    speichern();
    zeichnen();
    ansage("Letzte Buchung rückgängig gemacht.");
  }

  /** Simulierte Übertragung an EduKSX-Time: nur mit Verbindung, kurz verzögert. */
  let uebertragungLaeuft = false;
  function uebertragen() {
    if (!navigator.onLine || uebertragungLaeuft) return;
    if (!daten.buchungen.some((b) => !b.uebertragen)) return;
    uebertragungLaeuft = true;
    setTimeout(() => {
      uebertragungLaeuft = false;
      if (!navigator.onLine) { zeichnen(); return; }
      daten.buchungen.forEach((b) => { b.uebertragen = true; });
      speichern();
      zeichnen();
    }, 1500);
  }

  // ---------- Darstellung ----------
  const app = document.getElementById("app");
  const seite = () => (["verlauf", "mehr"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "stempeln");

  const ICON_EDUKSX = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5" stroke="var(--brand-neutral)"/><path d="M12 7.2V12h3.4" stroke="var(--brand-violet)"/></g><circle cx="12" cy="12" r="1.3" fill="var(--brand-orange)"/><circle cx="17.6" cy="17.6" r="1" fill="var(--brand-blue)"/></svg>';
  const TAB_ICONS = {
    stempeln: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    verlauf: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4M8 13.5h3M8 16.5h6"/></svg>',
    mehr: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
  };
  function wortmarke(name) {
    const zusatz = name.slice("EduKSX".length);
    return `<span class="wm" role="img" aria-label="${e(name)}"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span><span class="o">K</span><span class="b">SX</span><span class="n">${e(zusatz)}</span></span></span>`;
  }

  function rahmen(inhalt) {
    const s = seite();
    const tab = (k, t) => `<a href="#${k}"${s === k ? ' aria-current="page"' : ""}>${TAB_ICONS[k]}<span>${t}</span></a>`;
    const p = daten.person;
    return `<div class="app">
      <header class="app-kopf">
        <a class="marke" href="#stempeln">${ICON_EDUKSX}${wortmarke("EduKSX-Time")}</a>
        <div class="person"><b>${e(p.name)}</b><span>${e(p.funktion)} · ${e(p.pensum)} %</span></div>
      </header>
      <div class="band${navigator.onLine ? "" : " offline"}" role="note">${navigator.onLine
        ? "Prototyp mit erfundenen Testdaten – Buchungen bleiben auf diesem Gerät."
        : "<b>Offline</b> – Buchungen werden gespeichert und übertragen, sobald wieder eine Verbindung besteht."}</div>
      <main id="inhalt" class="inhalt" tabindex="-1">${inhalt}</main>
      <nav class="tabs" aria-label="Hauptnavigation">${tab("stempeln", "Stempeln")}${tab("verlauf", "Verlauf")}${tab("mehr", "Mehr")}</nav>
      <div id="ansage" class="sr-only" aria-live="polite"></div>
      <div id="leiste-platz"></div>
    </div>`;
  }

  function syncBadge(b) {
    return b.uebertragen
      ? '<span class="sync ok">✓ übertragen</span>'
      : '<span class="sync offen">↻ noch nicht übertragen</span>';
  }

  function buchungsliste(liste) {
    if (!liste.length) return '<ul class="liste"><li class="leer">Heute noch keine Buchung.</li></ul>';
    return `<ul class="liste">${[...liste].reverse().map((b) => `<li>
      <span class="punkt ${b.typ}" aria-hidden="true"></span>
      <span class="uhrzeit">${hhmm(b.zeit)}</span>
      <span class="art">${e(TYPEN[b.typ].name)}<small>${e(ARTEN[b.art]?.name || b.art)}${b.nachgetragen ? " · nachgetragen" : ""}</small></span>
      ${syncBadge(b)}</li>`).join("")}</ul>`;
  }

  /**
   * Animierte Stempeluhr (eingestempelt bzw. Pause). Der Ring ist die Tagesachse ab dem ersten Kommen (mindestens
   * 10 Stunden, Striche alle 10 Minuten, lang je Stunde): Arbeit grün (über Soll violett), gebuchte Pause grau,
   * gesetzliche Pause schraffiert (künftige blasser), Markierung beim voraussichtlichen Erreichen des Solls.
   * Sekundenpunkt läuft per CSS rund; Ring und Mitte werden jede Sekunde nachgeführt.
   */
  const UHR_R = 100;
  function punkt(winkel, r) {
    const w = (winkel - 90) * Math.PI / 180;
    return [120 + r * Math.cos(w), 120 + r * Math.sin(w)];
  }
  function bogen(w1, w2, klasse) {
    if (w2 - w1 < 0.2) return "";
    const [x1, y1] = punkt(w1, UHR_R), [x2, y2] = punkt(Math.min(w2, w1 + 359.9), UHR_R);
    return `<path class="${klasse}" d="M${x1.toFixed(2)} ${y1.toFixed(2)}A${UHR_R} ${UHR_R} 0 ${w2 - w1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}"/>`;
  }
  function ringZeichnen(a, p, jetzt) {
    const t0 = a.start ?? jetzt;
    const ende = Math.max(jetzt, p?.sollEnde ?? 0, ...(p?.zukunft || []).map((s) => s.bis));
    const stunden = Math.max(10, Math.ceil((ende - t0) / 3600000 + 0.25));
    const winkel = (ms) => Math.max(0, Math.min(360, ((ms - t0) / (stunden * 3600000)) * 360));
    const teile = [];
    for (let i = 0; i < stunden * 6; i++) {
      const lang = i % 6 === 0;
      const [xa, ya] = punkt(i * 360 / (stunden * 6), lang ? 82 : 85), [xb, yb] = punkt(i * 360 / (stunden * 6), 90);
      teile.push(`<line class="strich${lang ? " lang" : ""}" x1="${xa.toFixed(2)}" y1="${ya.toFixed(2)}" x2="${xb.toFixed(2)}" y2="${yb.toFixed(2)}"/>`);
    }
    teile.push(`<circle class="spur" cx="120" cy="120" r="${UHR_R}"/>`);
    let summe = 0;
    const sollMin = a.soll * 60;
    for (const s of a.seg) {
      if (s.typ === "arbeit") {
        const d = (s.bis - s.von) / M;
        const grenze = sollMin > 0 && summe < sollMin && summe + d > sollMin ? s.von + (sollMin - summe) * M : null;
        const ueber = sollMin > 0 && summe >= sollMin;
        if (grenze) { teile.push(bogen(winkel(s.von), winkel(grenze), "seg arbeit"), bogen(winkel(grenze), winkel(s.bis), "seg arbeit ueber")); }
        else teile.push(bogen(winkel(s.von), winkel(s.bis), `seg arbeit${ueber || sollMin === 0 ? " ueber" : ""}`));
        summe += d;
      } else teile.push(bogen(winkel(s.von), winkel(s.bis), `seg ${s.typ}`));
    }
    (p?.zukunft || []).forEach((s) => teile.push(bogen(winkel(s.von), winkel(s.bis), "seg zwang zukunft")));
    if (p?.sollEnde) {
      const w = winkel(p.sollEnde);
      const [x1, y1] = punkt(w, UHR_R - 12), [x2, y2] = punkt(w, UHR_R + 13), [fx, fy] = punkt(w, UHR_R + 15);
      teile.push(`<line class="soll-marke" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/><circle class="soll-fahne" cx="${fx.toFixed(2)}" cy="${fy.toFixed(2)}" r="4"/>`);
    }
    const [jx, jy] = punkt(winkel(jetzt), UHR_R);
    teile.push(`<circle class="jetzt" cx="${jx.toFixed(2)}" cy="${jy.toFixed(2)}" r="6"/>`);
    return teile.join("");
  }
  function uhrTexte(z, a, p, jetzt) {
    let etikett = z.art === "pause" ? `Pause seit ${hhmm(z.letzte.zeit)}` : `Eingecheckt seit ${hhmm(z.letzte.zeit)}`;
    if (z.art === "ein" && a.zwangJetzt) etikett = "Gesetzliche Pause";
    let soll = "Heute kein Soll";
    if (a.soll > 0 && p?.sollEnde) {
      soll = a.ist < a.soll ? `Soll ${dauer(a.soll)} · noch ${dauer(a.soll - a.ist)} · bis ${hhmm(p.sollEnde)}` : `Soll ${dauer(a.soll)} erreicht um ${hhmm(p.sollEnde)}`;
    }
    return { etikett, block: laufzeit(jetzt - z.letzte.zeit), gesamt: laufzeit(a.ist * 3600000), soll };
  }
  function stempeluhr(z, a, jetzt) {
    const pause = z.art === "pause";
    const p = prognose(tagKey(jetzt), jetzt, a);
    const x = uhrTexte(z, a, p, jetzt);
    const verzoegerung = -(((jetzt - z.letzte.zeit) / 1000) % 60);
    return `<section class="stempeluhr${pause ? " ist-pause" : ""}${a.zwangJetzt && !pause ? " ist-zwang" : ""}" data-stempeluhr aria-label="Laufende Zeit, Gesamtzeit heute und Soll">
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <defs><pattern id="schraffur" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <rect class="schraffur-grund" width="5" height="5"/><line class="schraffur-linie" x1="0" y1="0" x2="0" y2="5"/></pattern></defs>
        <g data-ring>${ringZeichnen(a, p, jetzt)}</g>
        <g class="umlauf" style="animation-delay:${verzoegerung.toFixed(2)}s"><circle cx="120" cy="34" r="3.5"/></g>
      </svg>
      <div class="mitte">
        <span class="etikett"><span class="puls" aria-hidden="true"></span><span data-etikett>${e(x.etikett)}</span></span>
        <span class="block" data-block>${x.block}</span>
        <span class="trenn" aria-hidden="true"></span>
        <span class="gesamt-etikett">Heute gesamt</span>
        <span class="gesamt" data-gesamt>${x.gesamt}</span>
        <span class="soll muted" data-sollzeile>${e(x.soll)}</span>
      </div>
    </section>
    <ul class="legende" aria-label="Legende">
      <li><span class="farbe arbeit" aria-hidden="true"></span>Arbeitszeit</li>
      <li><span class="farbe pause" aria-hidden="true"></span>Pause</li>
      <li><span class="farbe zwang" aria-hidden="true"></span>Gesetzliche Pause</li>
      <li><span class="farbe soll" aria-hidden="true"></span>Soll erreicht</li>
    </ul>`;
  }
  function uhrNachfuehren(jetzt, a) {
    const uhr = document.querySelector("[data-stempeluhr]");
    if (!uhr) return;
    const z = zustand(jetzt);
    if (z.art !== "ein" && z.art !== "pause") return;
    const p = prognose(tagKey(jetzt), jetzt, a);
    const x = uhrTexte(z, a, p, jetzt);
    uhr.querySelector("[data-ring]").innerHTML = ringZeichnen(a, p, jetzt);
    uhr.querySelector("[data-etikett]").textContent = x.etikett;
    uhr.querySelector("[data-block]").textContent = x.block;
    uhr.querySelector("[data-gesamt]").textContent = x.gesamt;
    uhr.querySelector("[data-sollzeile]").textContent = x.soll;
  }

  function seiteStempeln() {
    const jetzt = Date.now();
    const z = zustand(jetzt);
    const heute = tagKey(jetzt);
    const a = auswertung(heute, jetzt);
    const teile = [];

    if (z.art === "ein" || z.art === "pause") teile.push(stempeluhr(z, a, jetzt));
    else teile.push(`<section class="uhr" aria-label="Aktuelle Zeit"><div class="zeit" data-uhr>${hhmm(jetzt)}</div><div class="datum">${e(datumLang(jetzt))}</div></section>`);

    // Status
    let status;
    if (z.art === "ein") {
      const seit = z.letzte.typ === "pause_ende" ? "wieder seit" : "seit";
      status = `<div class="status ein" role="status"><span class="symbol" aria-hidden="true">✓</span><div><b>Eingestempelt</b><span class="muted">${e(ARTEN[z.letzte.art]?.name)} ${seit} ${hhmm(z.letzte.zeit)}</span></div></div>`;
    } else if (z.art === "pause") {
      status = `<div class="status pause" role="status"><span class="symbol" aria-hidden="true">${SYMBOL_TASSE}</span><div><b>In der Pause</b><span class="muted">seit ${hhmm(z.letzte.zeit)}</span></div></div>`;
    } else {
      status = `<div class="status aus" role="status"><span class="symbol" aria-hidden="true">○</span><div><b>Nicht eingestempelt</b><span class="muted">${a.liste.length ? `Zuletzt gegangen um ${hhmm(z.letzte.zeit)}` : "Guten Tag – bereit zum Stempeln"}</span></div></div>`;
    }
    teile.push(status);

    // Vergessenes Gehen
    if (z.art === "vergessen") {
      teile.push(`<div class="meldung warnung" role="alert"><span class="zeichen" aria-hidden="true">!</span><div>
        <p><b>Gehen fehlt am ${e(datumKurz(tagKey(z.letzte.zeit)))}</b> – letzte Buchung: ${e(TYPEN[z.letzte.typ].name)} um ${hhmm(z.letzte.zeit)}.
        Bitte zuerst nachtragen, wann Sie gegangen sind.</p>
        <button class="btn primaer" data-aktion="nachtragen">Gehen nachtragen</button></div></div>`);
    }

    // Installationshinweis
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (!standalone && !hinweisInstallZu) {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (installEreignis) {
        teile.push(`<div class="meldung info"><span class="zeichen" aria-hidden="true">i</span><div><p>EduKSX-Time als App auf dem Startbildschirm installieren – dann ist Stempeln mit einem Tipp möglich, auch offline.</p>
          <div class="knoepfe" style="justify-content:flex-start"><button class="btn primaer" data-aktion="installieren">App installieren</button><button class="btn" data-aktion="install-zu">Später</button></div></div></div>`);
      } else if (ios) {
        teile.push(`<div class="meldung info"><span class="zeichen" aria-hidden="true">i</span><div><p>Als App installieren: in Safari unten auf <b>Teilen</b> tippen, dann <b>«Zum Home-Bildschirm»</b>.</p>
          <button class="btn" data-aktion="install-zu">Ausblenden</button></div></div>`);
      }
    }

    // Buchungsart (nur vor dem Kommen wählbar)
    if (z.art === "aus") {
      teile.push(`<fieldset class="arten"><legend>Buchungsart</legend>${Object.entries(ARTEN).map(([k, v]) => `
        <label><input type="radio" name="art" value="${k}"${daten.art === k ? " checked" : ""}><span><span aria-hidden="true">${v.zeichen}</span> ${e(v.name)}</span></label>`).join("")}</fieldset>`);
    }

    // Tasten
    let tasten = "";
    if (z.art === "aus") {
      tasten = `<button class="taste kommen" data-aktion="kommen"><span class="pfeil" aria-hidden="true">→</span> Kommen</button>`;
    } else if (z.art === "ein") {
      tasten = `<div class="tasten-zwei"><button class="taste pause" data-aktion="pause_beginn">${SYMBOL_TASSE} Pause</button>
        <button class="taste gehen" data-aktion="gehen"><span class="pfeil" aria-hidden="true">←</span> Gehen</button></div>`;
    } else if (z.art === "pause") {
      tasten = `<button class="taste pause-ende" data-aktion="pause_ende"><span class="tasse-gross">${SYMBOL_TASSE}</span><span class="zweizeilig"><span>Pause beenden</span><small>${SYMBOL_WEITER} weiterarbeiten</small></span></button>
        <button class="taste klein" data-aktion="gehen"><span aria-hidden="true">←</span> Gehen (Feierabend)</button>`;
    }
    if (tasten) teile.push(`<div class="tasten">${tasten}</div>`);

    // Gesetzliche Pause läuft
    if (z.art === "ein" && a.zwangJetzt) {
      teile.push(`<div class="meldung info"><span class="zeichen" aria-hidden="true">▨</span><p><b>Gesetzliche Pause bis ${hhmm(zwangEnde(jetzt))}</b> – nach 5 Stunden Arbeit zählen ${ZWANG_DAUER_MIN} Minuten Pause nicht als Arbeitszeit; gestempelte Pausen werden angerechnet. Die Uhr läuft weiter.</p></div>`);
    }

    // Kennzahlen heute
    teile.push(`<section aria-label="Heute"><div class="zahlen">
      <div class="zahl"><small>Ist heute</small><b data-ist>${dauer(a.ist)}</b></div>
      <div class="zahl"><small>Soll heute</small><b>${dauer(a.soll)}</b></div>
      <div class="zahl"><small>Saldo heute</small><b data-saldo class="${a.saldo >= 0 ? "plus" : "minus"}">${dauer(a.saldo, true)}</b></div>
    </div></section>`);

    teile.push(`<section class="abschnitt"><h2>Buchungen heute <span class="muted">${a.pause > 0 ? `Pause ${dauer(a.pause)}${a.zwang > 0 ? `, davon gesetzlich ${dauer(a.zwang)}` : ""}` : ""}</span></h2>${buchungsliste(a.liste)}</section>`);
    return teile.join("");
  }

  function seiteVerlauf() {
    const jetzt = Date.now();
    const heute = tagStart(tagKey(jetzt));
    const tage = [];
    for (let i = 0; i < 14; i++) { const d = new Date(heute); d.setDate(d.getDate() - i); tage.push(tagKey(d.getTime())); }
    const montag = new Date(heute); montag.setDate(montag.getDate() - ((montag.getDay() + 6) % 7));
    let wIst = 0, wSoll = 0;
    const zeilen = tage.map((key) => {
      const a = auswertung(key, jetzt);
      if (tagStart(key) >= montag.getTime()) { wIst += a.ist; wSoll += a.soll; }
      if (!a.liste.length && a.soll === 0) return "";
      const zeiten = [];
      let von = null;
      a.liste.forEach((b) => {
        if (b.typ === "kommen" || b.typ === "pause_ende") von = b.zeit;
        else if (von !== null) { zeiten.push(`${hhmm(von)}–${hhmm(b.zeit)}`); von = null; }
      });
      if (von !== null) zeiten.push(`${hhmm(von)}–${key === tagKey(jetzt) ? "läuft" : "<b>Gehen fehlt</b>"}`);
      const arten = [...new Set(a.liste.map((b) => ARTEN[b.art]?.name || b.art))].join(", ");
      const offen = a.liste.some((b) => !b.uebertragen);
      return `<li class="tag"><b>${e(datumKurz(key))}${key === tagKey(jetzt) ? " · heute" : ""}</b>
        <span class="ist">${dauer(a.ist)}</span>
        <span class="saldo ${a.saldo >= 0 ? "plus" : "minus"}">${dauer(a.saldo, true)}</span>
        <small>${a.liste.length ? `${zeiten.join(", ")} · ${e(arten)}${a.zwang > 0 ? ` · gesetzliche Pause ${dauer(a.zwang)}` : ""}${offen ? " · ↻ noch nicht übertragen" : ""}` : "Keine Buchung"}</small></li>`;
    }).join("");
    return `<section class="abschnitt"><h2>Diese Woche</h2>
        <div class="zahlen"><div class="zahl"><small>Ist</small><b>${dauer(wIst)}</b></div><div class="zahl"><small>Soll</small><b>${dauer(wSoll)}</b></div>
        <div class="zahl"><small>Saldo</small><b class="${wIst - wSoll >= 0 ? "plus" : "minus"}">${dauer(wIst - wSoll, true)}</b></div></div></section>
      <section class="abschnitt"><h2>Letzte 14 Tage <span class="muted">Ist · Saldo</span></h2><ul class="liste">${zeilen}</ul></section>
      <p class="muted small">Soll aus Pensum (${e(daten.person.pensum)} % von ${dauer(SOLL_100)} pro Arbeitstag); Feiertage und Abwesenheiten folgen in einem späteren Schritt.</p>`;
  }

  function seiteMehr() {
    const p = daten.person;
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    return `<section class="abschnitt mehr"><h2>Person (Demo)</h2>
        <label class="feld"><span>Name</span><input id="f-name" value="${e(p.name)}" autocomplete="off"></label>
        <label class="feld"><span>Funktion</span><input id="f-funktion" value="${e(p.funktion)}" autocomplete="off"></label>
        <label class="feld"><span>Pensum in %</span><input id="f-pensum" type="number" min="0" max="100" step="5" inputmode="numeric" value="${e(p.pensum)}"></label>
        <div class="knoepfe" style="justify-content:flex-start"><button class="btn primaer" data-aktion="person">Speichern</button></div>
      </section>
      <section class="abschnitt mehr"><h2>App</h2>
        <p>${standalone ? "✓ Läuft als installierte App." : installEreignis
          ? '<button class="btn primaer" data-aktion="installieren">App installieren</button>'
          : "Installieren: im Browsermenü «App installieren» bzw. «Zum Startbildschirm» (iPhone: Teilen → «Zum Home-Bildschirm»)."}</p>
        <p class="muted small">Funktioniert auch ohne Verbindung; Buchungen werden später übertragen (im Prototyp simuliert).</p>
      </section>
      <section class="abschnitt mehr"><h2>Folgt in weiteren Schritten</h2>
        <ul class="folgt"><li>Abwesenheiten (Ferien, Krankheit, Weiterbildung …)</li><li>Buchungen korrigieren und nachtragen</li>
        <li>Monatsübersicht mit Zeitsaldo und Ferienguthaben</li><li>Monat einreichen, Visum der Schulleitung</li>
        <li>Anmeldung über EduKSX-Ident</li></ul>
      </section>
      <section class="abschnitt mehr"><h2>Prototyp</h2>
        <div class="knoepfe" style="justify-content:flex-start"><button class="btn gefahr" data-aktion="zuruecksetzen">Demo-Daten zurücksetzen</button>
        <a class="btn" href="../">Alle Prototypen</a></div>
      </section>`;
  }

  function zeichnen() {
    const s = seite();
    app.innerHTML = rahmen(s === "verlauf" ? seiteVerlauf() : s === "mehr" ? seiteMehr() : seiteStempeln());
    leisteZeichnen();
  }

  function leisteZeichnen() {
    const platz = document.getElementById("leiste-platz");
    if (!platz) return;
    const rest = daten.zuletzt ? RUECKGAENGIG_MS - (Date.now() - daten.zuletzt.um) : 0;
    const b = daten.zuletzt && daten.buchungen.find((x) => x.id === daten.zuletzt.id);
    document.querySelector(".app")?.classList.toggle("mit-leiste", Boolean(b && rest > 0));
    if (!b || rest <= 0) { platz.innerHTML = ""; daten.zuletzt = rest > 0 ? daten.zuletzt : null; return; }
    if (!platz.firstChild) {
      platz.innerHTML = `<div class="leiste" role="status"><span>${e(TYPEN[b.typ].name)} ${hhmm(b.zeit)} gebucht</span><button data-aktion="rueckgaengig">Rückgängig</button></div>`;
    }
  }

  function ansage(text) {
    const el = document.getElementById("ansage");
    if (el) el.textContent = text;
  }

  /** Jede Sekunde nur Uhr, Laufzeit und Zahlen nachführen (kein Neuaufbau → Fokus bleibt). */
  function ticken() {
    const jetzt = Date.now();
    document.querySelectorAll("[data-uhr]").forEach((el) => { el.textContent = hhmm(jetzt); });
    document.querySelectorAll("[data-lauf]").forEach((el) => { el.textContent = laufzeit(jetzt - Number(el.dataset.lauf)); });
    const a = auswertung(tagKey(jetzt), jetzt);
    uhrNachfuehren(jetzt, a);
    const ist = document.querySelector("[data-ist]");
    if (ist) ist.textContent = dauer(a.ist);
    const saldo = document.querySelector("[data-saldo]");
    if (saldo) { saldo.textContent = dauer(a.saldo, true); saldo.className = a.saldo >= 0 ? "plus" : "minus"; }
    leisteZeichnen();
    // Tageswechsel oder neue Warnung → neu zeichnen
    const zwang = Boolean(a.zwangJetzt);
    if (seite() === "stempeln" && ((ticken.tag && ticken.tag !== tagKey(jetzt)) || (ticken.zwang !== undefined && ticken.zwang !== zwang))) zeichnen();
    ticken.tag = tagKey(jetzt);
    ticken.zwang = zwang;
  }

  // ---------- Dialog «Gehen nachtragen» ----------
  function nachtragen() {
    const l = zustand().letzte;
    const key = tagKey(l.zeit);
    const min = hhmm(l.zeit + 60000);
    const vorschlag = l.zeit < tagStart(key) + 17 * 3600000 ? "17:00" : min;
    const dlg = document.createElement("dialog");
    dlg.innerHTML = `<form method="dialog">
      <h2>Gehen nachtragen</h2>
      <p class="muted">${e(datumLang(l.zeit))} – letzte Buchung ${e(TYPEN[l.typ].name)} um ${hhmm(l.zeit)}.</p>
      <label class="feld"><span>Gegangen um</span><input type="time" name="zeit" required min="${min}" max="23:59" value="${vorschlag}"></label>
      <p class="muted small">Nachgetragene Buchungen werden als solche gekennzeichnet.</p>
      <div class="knoepfe"><button class="btn" value="abbrechen" formnovalidate>Abbrechen</button><button class="btn primaer" value="ok">Nachtragen</button></div>
    </form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener("close", () => {
      if (dlg.returnValue === "ok") {
        const [h, m] = dlg.querySelector("input").value.split(":").map(Number);
        const zeit = tagStart(key) + (h * 60 + m) * 60000;
        if (zeit > l.zeit) buchen("gehen", zeit, { art: l.art, nachgetragen: true });
      }
      dlg.remove();
    });
    dlg.showModal();
  }

  // ---------- Ereignisse ----------
  app.addEventListener("change", (ev) => {
    if (ev.target.name === "art") { daten.art = ev.target.value; speichern(); }
  });
  app.addEventListener("click", async (ev) => {
    const knopf = ev.target.closest("[data-aktion]");
    if (!knopf) return;
    const aktion = knopf.dataset.aktion;
    if (TYPEN[aktion]) {
      const z = zustand();
      const erlaubt = { aus: ["kommen"], ein: ["pause_beginn", "gehen"], pause: ["pause_ende", "gehen"], vergessen: [] }[z.art];
      if (!erlaubt.includes(aktion)) return; // Doppeltipp nach Zustandswechsel abfangen
      const art = aktion === "kommen" ? daten.art : z.letzte?.art || daten.art;
      buchen(aktion, Date.now(), { art });
    } else if (aktion === "rueckgaengig") rueckgaengig();
    else if (aktion === "nachtragen") nachtragen();
    else if (aktion === "install-zu") { hinweisInstallZu = true; zeichnen(); }
    else if (aktion === "installieren" && installEreignis) {
      installEreignis.prompt();
      await installEreignis.userChoice;
      installEreignis = null;
      zeichnen();
    } else if (aktion === "person") {
      const pensum = Math.max(0, Math.min(100, Number(document.getElementById("f-pensum").value) || 0));
      daten.person = { name: document.getElementById("f-name").value.trim() || "Lea Muster", funktion: document.getElementById("f-funktion").value.trim(), pensum };
      speichern(); zeichnen(); ansage("Gespeichert.");
    } else if (aktion === "zuruecksetzen") {
      if (confirm("Alle Buchungen auf diesem Gerät löschen und die erfundenen Demo-Daten neu laden?")) {
        daten = demoDaten(); speichern(); location.hash = "#stempeln"; zeichnen();
      }
    }
  });
  window.addEventListener("hashchange", () => { zeichnen(); document.getElementById("inhalt")?.focus(); window.scrollTo(0, 0); });
  window.addEventListener("online", () => { zeichnen(); uebertragen(); });
  window.addEventListener("offline", zeichnen);
  window.addEventListener("beforeinstallprompt", (ev) => { ev.preventDefault(); installEreignis = ev; zeichnen(); });
  window.addEventListener("appinstalled", () => { installEreignis = null; zeichnen(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { zeichnen(); uebertragen(); } });
  window.addEventListener("storage", (ev) => { if (ev.key === SPEICHER) { daten = laden(); zeichnen(); } });

  const dunkel = matchMedia("(prefers-color-scheme: dark)");
  const farbmodus = () => document.documentElement.classList.toggle("dark", dunkel.matches);
  dunkel.addEventListener?.("change", farbmodus);
  farbmodus();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* Prototyp läuft auch ohne */ });
  }

  speichern();
  zeichnen();
  uebertragen();
  setInterval(ticken, 1000);
})();
