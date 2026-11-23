/*
 * EduKSX-AI – Klickprototyp: interne KI-Plattform
 *
 * Alles läuft im Browser. Antworten der Modelle, Indexierung, Verbindungstests und der Systemzustand sind simuliert.
 * Zustand im Browser gesichert (localStorage). Nur erfundene Testdaten.
 */
(function () {
  "use strict";

  const D = window.AI_DATEN;
  const VERSION = "0.1.0";
  const EINSTIEG = "https://markuskeller8200.github.io/EduKSX-Prototyp/"; // Einstiegsseite aller Prototypen
  const SPEICHER = "eduksx-ai-v1";
  const VERGLEICH = "https://www.openstream.ch/vergleich-ki-anbieter-schweiz/";

  // ---------------------------------------------------------------- Hilfen
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const klon = (o) => JSON.parse(JSON.stringify(o));
  let zaehler = Date.now() % 100000;
  const uid = (p) => `${p}-${(zaehler++).toString(36)}`;
  const zwei = (n) => String(n).padStart(2, "0");
  function jetzt() { const d = new Date(); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}T${zwei(d.getHours())}:${zwei(d.getMinutes())}`; }
  function datum(iso) { if (!iso) return ""; const [j, m, t] = iso.slice(0, 10).split("-"); return `${t}.${m}.${j}`; }
  const datumZeit = (iso) => (iso ? `${datum(iso)} ${iso.slice(11, 16)}` : "");
  function groesse(b) { b = Number(b) || 0; if (b < 1024) return b + " B"; if (b < 1048576) return Math.round(b / 1024) + " KB"; return (b / 1048576).toFixed(1).replace(".", ",") + " MB"; }
  const zahl = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "’");
  function toast(text) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = text;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3800);
  }
  // Sehr einfache Auszeichnung für Antworten: Absätze, **fett**, Listen (- / 1.), `code`. Text wird immer zuerst escaped.
  function auszeichnen(text) {
    const zeile = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
    return String(text || "").split(/\n{2,}/).map((block) => {
      const z = block.split("\n");
      if (z.every((x) => /^\s*[-•]\s+/.test(x))) return `<ul>${z.map((x) => `<li>${zeile(x.replace(/^\s*[-•]\s+/, ""))}</li>`).join("")}</ul>`;
      if (z.every((x) => /^\s*\d+\.\s+/.test(x))) return `<ol>${z.map((x) => `<li>${zeile(x.replace(/^\s*\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
      return `<p>${z.map(zeile).join("<br>")}</p>`;
    }).join("");
  }

  // ---------------------------------------------------------------- Zustand
  function neuerZustand() {
    return {
      org: klon(D.ORGANISATION),
      benutzer: klon(D.BENUTZER), gruppen: klon(D.GRUPPEN), rollen: klon(D.ROLLEN),
      orte: klon(D.BETRIEBSORTE), modelle: klon(D.MODELLE), wissen: klon(D.WISSEN),
      assistenten: klon(D.ASSISTENTEN), chats: klon(D.UNTERHALTUNGEN), werkzeuge: klon(D.WERKZEUGE),
      einst: {
        standard: { oeffentlich: "m-apertus-70b", intern: "m-apertus-70b", vertraulich: "m-apertus-70b", geheim: "m-apertus-8b" },
        aufbewahrung: 90, protokoll: "metadaten", warnung: true, chatHinweis: true, standardSchutz: "intern",
      },
      feedback: [],
      pruefung: "2026-11-23T07:00",
    };
  }
  function laden() { try { const r = localStorage.getItem(SPEICHER); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  let S = laden() || neuerZustand();
  function speichern() { try { localStorage.setItem(SPEICHER, JSON.stringify(S)); } catch (e) { toast("Browser-Speicher voll – Änderungen gelten nur bis zum Neuladen."); } }
  // Flüchtiger Zustand (nicht gespeichert)
  const E = { dialog: null, suche: "", laeuft: null, anhaenge: [], entwurf: "", web: false, assFilter: "alle", assSuche: "", reiter: {} };

  const SCHUTZ_IDX = Object.fromEntries(D.SCHUTZ.map((s, i) => [s.id, i]));
  const schutz = (id) => D.SCHUTZ.find((s) => s.id === id) || D.SCHUTZ[1];
  const modell = (id) => S.modelle.find((m) => m.id === id);
  const ort = (id) => S.orte.find((o) => o.id === id);
  const chat = (id) => S.chats.find((c) => c.id === id);
  const ass = (id) => S.assistenten.find((a) => a.id === id);
  const wissen = (id) => S.wissen.find((w) => w.id === id);
  const gruppe = (id) => S.gruppen.find((g) => g.id === id);
  const benutzer = (id) => S.benutzer.find((b) => b.id === id);
  const rolle = (id) => S.rollen.find((r) => r.id === id);
  const ARTEN = { intern: "Interner Server", "ch-api": "CH-Cloud · Inferenz-API", "ch-gpu": "CH-Cloud · eigene GPU", extern: "Ausserhalb der Schweiz" };
  const FAEHIG = { text: "Text", denken: "Denkmodus", code: "Code", bild: "Bildverständnis", mehrsprachig: "Mehrsprachig", schnell: "Schnell", werkzeuge: "Werkzeuge", einbettung: "Suchindex", sprache: "Sprache → Text" };

  // Zulässiger Betriebsort eines Modells für einen Schutzbedarf (bevorzugt der interne Server)
  function ortFuer(m, schutzId) {
    if (!m || !m.aktiv) return null;
    const kandidaten = m.betrieb.map(ort).filter((o) => o && o.aktiv && o.freigabe === "freigegeben" && SCHUTZ_IDX[o.maxSchutz] >= SCHUTZ_IDX[schutzId]);
    kandidaten.sort((a, b) => (a.art === "intern" ? -1 : 0) - (b.art === "intern" ? -1 : 0));
    return kandidaten[0] || null;
  }
  const chatModelle = () => S.modelle.filter((m) => !m.faehig.includes("einbettung") && !m.faehig.includes("sprache"));
  function grundFuer(m, schutzId) {
    if (!m.aktiv) return "nicht freigeschaltet";
    if (!m.betrieb.length) return "kein Betriebsort";
    const orte = m.betrieb.map(ort).filter(Boolean);
    if (!orte.some((o) => o.aktiv && o.freigabe === "freigegeben")) return "Betriebsort nicht freigegeben";
    return `nicht zulässig für «${schutz(schutzId).name}»`;
  }
  function ortBadge(o) {
    if (!o) return `<span class="badge fehler">✕ kein zulässiger Betriebsort</span>`;
    if (o.art === "intern") return `<span class="badge erfolg" title="${esc(o.standort)}">🔒 ${esc(o.name)} · Daten bleiben in der Schule</span>`;
    return `<span class="badge info" title="${esc(o.standort)}">⛰ CH · ${esc(o.name.split(" – ")[0])} · ${esc(o.standort.split(" (")[0])}</span>`;
  }
  const schutzBadge = (id) => { const s = schutz(id); const cls = { oeffentlich: "neutral", intern: "info", vertraulich: "warnung", geheim: "fehler" }[s.id]; return `<span class="badge ${cls}" title="${esc(s.text)}">${esc(s.kurz)} · ${esc(s.name)}</span>`; };
  function freigabeBadge(f) {
    return { freigegeben: '<span class="badge erfolg">✓ freigegeben</span>', pruefung: '<span class="badge warnung">⏳ in Prüfung</span>', abgelehnt: '<span class="badge fehler">✕ abgelehnt</span>' }[f] || "";
  }
  function sichtbarkeit(f) {
    if (f.art === "organisation") return '<span class="badge violett">◉ ganze Organisation</span>';
    if (f.art === "gruppen" && f.gruppen.length) return f.gruppen.map((g) => `<span class="badge neutral">${esc((gruppe(g) || {}).name || g)}</span>`).join(" ");
    return '<span class="badge neutral">◌ nur ich</span>';
  }

  // ---------------------------------------------------------------- Wortmarke, Icons
  function wordmark(zusatz) {
    const name = "EduKSX" + (zusatz ? "-" + zusatz : "");
    return `<span class="wm" role="img" aria-label="${esc(name)}"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span><span class="o">K</span><span class="b">SX</span>${zusatz ? `<span class="n">-${esc(zusatz)}</span>` : ""}</span></span>`;
  }
  const WM_DEV = `<span class="wm" role="img" aria-label="MarKusSXCH"><span aria-hidden="true"><span class="v">M</span><span class="n">ar</span><span class="o">K</span><span class="n">us</span><span class="b">SXCH</span></span></span>`;
  const ICON_AI = '<!--eduksx-icon:eduksx-->'; // eigenes Icon «ai» fehlt noch in EduKSX-UI – vorläufig das Plattform-Icon
  const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    chat: ico('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
    assistenten: ico('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9.5 13h.01M14.5 13h.01M2.5 13v2M21.5 13v2"/>'),
    wissen: ico('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z"/><path d="M15.5 8h2M15.5 11h2"/>'),
    organisation: ico('<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-5h6v5M8 11h.01M12 11h.01M16 11h.01"/>'),
    benutzer: ico('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.6c1.6.6 2.7 2 3 4.4"/>'),
    rollen: ico('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
    modelle: ico('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12 4 7.5"/>'),
    orte: ico('<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/>'),
    werkzeuge: ico('<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17v3h3l5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>'),
    datenschutz: ico('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/>'),
    zustand: ico('<path d="M3 12h4l2-5 4 10 2-5h6"/>'),
    entwickler: ico('<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m14 4-4 16"/>'),
    senden: ico('<path d="M5 12h13M13 6l6 6-6 6"/>'),
    anhang: ico('<path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3"/>'),
    stopp: ico('<rect x="7" y="7" width="10" height="10" rx="1.5"/>'),
    neu: ico('<path d="M12 5v14M5 12h14"/>'),
  };
  const NAVI = [
    ["chat", "Chat"], ["assistenten", "Assistenten"], ["wissen", "Wissen"],
    ["gruppe", "Verwaltung"],
    ["verwaltung/organisation", "Organisation", "organisation"], ["verwaltung/benutzer", "Benutzer & Gruppen", "benutzer"],
    ["verwaltung/rollen", "Rollen & Rechte", "rollen"], ["verwaltung/modelle", "Modelle", "modelle"],
    ["verwaltung/orte", "Betriebsorte", "orte"], ["verwaltung/werkzeuge", "Werkzeuge", "werkzeuge"],
    ["verwaltung/datenschutz", "Datenschutz", "datenschutz"], ["verwaltung/zustand", "Systemzustand", "zustand"],
  ];

  // ---------------------------------------------------------------- Rahmen
  function rahmen(aktiv, inhalt, breit) {
    const navi = NAVI.map((n) => {
      if (n[0] === "gruppe") return `<li class="gruppe" aria-hidden="true">${esc(n[1])}</li>`;
      const an = aktiv === n[0] || aktiv.startsWith(n[0] + "/");
      return `<li><a href="#/${n[0]}" ${an ? 'aria-current="page"' : ""}>${ICONS[n[2] || n[0]]}<span>${esc(n[1])}</span></a></li>`;
    }).join("") + `<li class="gruppe" aria-hidden="true">Entwicklung</li><li><a href="entwickler/" title="Datenmodell und API – Entwurf für die Umsetzung">${ICONS.entwickler}<span>Entwickler</span></a></li>`;
    const dunkel = document.documentElement.classList.contains("dark");
    const r = rolle(D.ICH.rolle);
    return `
      <header class="kopf">
        <a class="marke" href="#/chat">${ICON_AI}${wordmark("AI")}</a>
        <span class="muted small">Interne KI</span>
        <a class="btn zurueck" href="${EINSTIEG}" title="Zurück zur Einstiegsseite aller EduKSX-Prototypen" aria-label="Zurück zur Einstiegsseite aller EduKSX-Prototypen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>
        <div class="werkzeuge">
          <span class="badge neutral" title="Angemeldet (erfunden)">👤 ${esc(D.ICH.name)} · ${esc(r ? r.name : "")}</span>
          <button class="btn" data-aktion="thema" aria-pressed="${dunkel}" title="Hell/Dunkel">${dunkel ? "☀ Hell" : "☾ Dunkel"}</button>
          <button class="btn" data-aktion="zuruecksetzen" title="Testdaten neu laden">↺ Testdaten</button>
        </div>
      </header>
      <div class="hinweis-band" role="note"><strong>Prototyp</strong> – Personen, Organisation und Unterhaltungen sind erfunden. Antworten der Modelle, Indexierung und Verbindungstests werden nur simuliert.</div>
      <div class="rahmen">
        <nav class="navi" aria-label="Hauptnavigation"><ul>${navi}</ul></nav>
        <main id="inhalt" tabindex="-1" class="${breit ? "breit" : ""}">${inhalt}</main>
      </div>
      <footer class="fuss"><span>${wordmark("AI")} · Prototyp ${VERSION} · in Entwicklung · <a href="${EINSTIEG}">Alle Prototypen</a></span><span>Developed by ${WM_DEV}</span></footer>
      ${dialogHTML()}`;
  }

  // ---------------------------------------------------------------- Chat
  function gruppiert(liste) {
    const heute = jetzt().slice(0, 10);
    const vor7 = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`; })();
    const g = [["Angeheftet", []], ["Heute", []], ["Letzte 7 Tage", []], ["Früher", []]];
    liste.forEach((c) => { const t = c.geaendert.slice(0, 10); (c.angeheftet ? g[0] : t === heute ? g[1] : t >= vor7 ? g[2] : g[3])[1].push(c); });
    return g.filter((x) => x[1].length);
  }
  function chatListe(aktiv) {
    const q = E.suche.trim().toLowerCase();
    const liste = S.chats.slice().sort((a, b) => b.geaendert.localeCompare(a.geaendert))
      .filter((c) => !q || c.titel.toLowerCase().includes(q) || c.nachrichten.some((n) => n.text.toLowerCase().includes(q)));
    const gruppen = gruppiert(liste).map(([titel, cs]) => `<li class="liste-gruppe">${esc(titel)}</li>` + cs.map((c) => {
      const a = c.assistent && ass(c.assistent);
      return `<li><a href="#/chat/${esc(c.id)}" ${c.id === aktiv ? 'aria-current="page"' : ""}><span class="ctitel">${a ? `<span class="mini-sym" aria-hidden="true">${esc(a.symbol)}</span>` : ""}${esc(c.titel)}</span>${c.schutz !== "intern" ? `<span class="schutz-punkt s-${esc(c.schutz)}" title="Schutzbedarf ${esc(schutz(c.schutz).name)}">${esc(schutz(c.schutz).kurz)}</span>` : ""}</a></li>`;
    }).join("")).join("");
    return `<aside class="chatliste" aria-label="Unterhaltungen">
      <button class="btn primaer voll" data-aktion="chat-neu">${ICONS.neu} Neue Unterhaltung</button>
      <label class="sr-only" for="chat-suche">Unterhaltungen durchsuchen</label>
      <input id="chat-suche" type="search" placeholder="Unterhaltungen durchsuchen …" value="${esc(E.suche)}" data-eingabe="suche">
      <ul>${gruppen || '<li class="muted small" style="padding:.5rem">Keine Treffer.</li>'}</ul>
      <p class="small muted aufbewahrung">Unterhaltungen werden nach ${esc(S.einst.aufbewahrung)} Tagen ohne Änderung gelöscht (angeheftete ausgenommen).</p>
    </aside>`;
  }
  function modellAuswahl(c) {
    const r = rolle(D.ICH.rolle);
    const darf = r && r.rechte.includes("modell_waehlen");
    const opts = chatModelle().map((m) => {
      const o = ortFuer(m, c.schutz);
      return `<option value="${esc(m.id)}" ${m.id === c.modell ? "selected" : ""} ${o ? "" : "disabled"}>${esc(m.name)}${o ? "" : " – " + esc(grundFuer(m, c.schutz))}</option>`;
    }).join("");
    return `<label class="kompakt"><span class="small muted">Modell</span><select data-change="chat-modell" ${darf ? "" : "disabled"} aria-label="Modell">${opts}</select></label>`;
  }
  function wissenAuswahl(c) {
    const zul = S.wissen.filter((w) => SCHUTZ_IDX[w.schutz] <= SCHUTZ_IDX[c.schutz] || c.wissen.includes(w.id));
    const n = c.wissen.length;
    return `<details class="aufklapp"><summary class="btn">${ICONS.wissen} Wissen${n ? ` <span class="zaehler">${n}</span>` : ""}</summary>
      <div class="aufklapp-inhalt"><p class="small muted">Antworten stützen sich auf diese Sammlungen und nennen die Quellen.</p>
      ${zul.map((w) => `<label class="haken"><input type="checkbox" data-change="chat-wissen" value="${esc(w.id)}" ${c.wissen.includes(w.id) ? "checked" : ""}> ${esc(w.name)} ${schutzBadge(w.schutz)}</label>`).join("")}
      ${S.wissen.length > zul.length ? `<p class="small muted">${S.wissen.length - zul.length} Sammlung(en) mit höherem Schutzbedarf ausgeblendet – zuerst den Schutzbedarf der Unterhaltung erhöhen.</p>` : ""}</div></details>`;
  }
  function nachrichtHTML(n, i, c) {
    if (n.rolle === "ich") return `<div class="msg ich"><div class="blase">${auszeichnen(n.text)}${(n.anhaenge || []).length ? `<div class="anh">${n.anhaenge.map((a) => `<span class="badge neutral">📎 ${esc(a.name)}</span>`).join(" ")}</div>` : ""}</div></div>`;
    const m = modell(n.modell); const o = ort(n.ort);
    const quellen = (n.quellen || []).map((q, k) => `<li><span class="qnr">${k + 1}</span> ${esc(q.datei)} <span class="muted">· ${esc((wissen(q.wissen) || {}).name || q.wissen)} · ${esc(q.stelle)}</span></li>`).join("");
    const werkzeug = (n.werkzeuge || []).map((w) => `<span class="badge violett">⚙ ${esc(w)}</span>`).join(" ");
    const fb = n.feedback === "gut" ? "gut" : n.feedback === "schlecht" ? "schlecht" : "";
    return `<div class="msg ki" id="msg-${i}">
      <div class="avatar" aria-hidden="true">${ICONS.assistenten}</div>
      <div class="ki-inhalt">
        ${werkzeug ? `<div class="werkzeug-zeile">${werkzeug}</div>` : ""}
        <div class="text" data-text="${i}">${auszeichnen(n.text)}${E.laeuft && E.laeuft.chat === c.id && E.laeuft.index === i ? '<span class="cursor" aria-hidden="true"></span>' : ""}</div>
        ${quellen ? `<details class="quellen" open><summary class="small">Quellen (${n.quellen.length})</summary><ol>${quellen}</ol></details>` : ""}
        <div class="msg-fuss">
          <span class="small muted">${esc(m ? m.name : "?")} · ${o ? (o.art === "intern" ? "🔒 intern" : "⛰ " + esc(o.name.split(" – ")[0])) : ""}${n.tokens ? ` · ${zahl(n.tokens)} Tokens · ${String(n.dauer).replace(".", ",")} s` : ""}</span>
          <span class="msg-aktionen">
            <button class="btn klein" data-aktion="kopieren" data-i="${i}" title="Antwort kopieren">⧉ Kopieren</button>
            <button class="btn klein" data-aktion="nochmal" data-i="${i}" title="Antwort neu erzeugen">↻ Neu</button>
            <button class="btn klein ${fb === "gut" ? "an" : ""}" data-aktion="feedback" data-wert="gut" data-i="${i}" aria-pressed="${fb === "gut"}" title="Hilfreich">👍 <span class="sr-only">Hilfreich</span></button>
            <button class="btn klein ${fb === "schlecht" ? "an" : ""}" data-aktion="feedback" data-wert="schlecht" data-i="${i}" aria-pressed="${fb === "schlecht"}" title="Nicht hilfreich">👎 <span class="sr-only">Nicht hilfreich</span></button>
          </span>
        </div>
      </div></div>`;
  }
  function startHTML(c) {
    const a = c.assistent && ass(c.assistent);
    const vorschlaege = a ? a.starter.map((s) => ["›", s, s]) : D.VORSCHLAEGE;
    const stunde = new Date().getHours();
    const gruss = stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Guten Tag" : "Guten Abend";
    return `<div class="start">
      ${a ? `<div class="start-sym" aria-hidden="true">${esc(a.symbol)}</div><h1>${esc(a.name)}</h1><p class="muted">${esc(a.beschreibung)}</p>`
        : `<div class="start-sym" aria-hidden="true">${ICON_AI}</div><h1>${gruss}, ${esc(D.ICH.name.split(" ")[0])}</h1><p class="muted">Was darf ich für Sie vorbereiten? Ihre Eingaben werden nur an Orten verarbeitet, die für den gewählten Schutzbedarf freigegeben sind.</p>`}
      <div class="vorschlaege">${vorschlaege.map((v) => `<button class="vorschlag" data-aktion="vorschlag" data-text="${esc(v[2])}"><span class="vs-sym" aria-hidden="true">${esc(v[0])}</span><span>${esc(v[1])}</span></button>`).join("")}</div>
    </div>`;
  }
  function seiteChat(id) {
    let c = id && chat(id);
    if (!c) { c = S.chats.slice().sort((a, b) => b.geaendert.localeCompare(a.geaendert))[0]; if (!c) { neuerChat(); c = S.chats[0]; } if (id !== c.id) { history.replaceState(null, "", `#/chat/${c.id}`); } }
    const m = modell(c.modell); const o = ortFuer(m, c.schutz);
    const a = c.assistent && ass(c.assistent);
    const webErlaubt = c.schutz === "oeffentlich" && S.werkzeuge.find((w) => w.id === "t-web").aktiv;
    const laeuft = E.laeuft && E.laeuft.chat === c.id;
    const msgs = c.nachrichten.map((n, i) => nachrichtHTML(n, i, c)).join("");
    return `<div class="chat-layout">
      ${chatListe(c.id)}
      <section class="chat" aria-label="Unterhaltung">
        <div class="chat-kopf">
          <div class="chat-titel"><h1 class="h-chat">${esc(c.titel)}</h1>
            <button class="btn klein" data-aktion="chat-umbenennen" title="Umbenennen">✎</button>
            <button class="btn klein" data-aktion="chat-anheften" aria-pressed="${!!c.angeheftet}" title="${c.angeheftet ? "Lösen" : "Anheften"}">${c.angeheftet ? "📌 angeheftet" : "📌"}</button>
            <button class="btn klein gefahr" data-aktion="chat-loeschen" title="Unterhaltung löschen">🗑 <span class="sr-only">Löschen</span></button>
          </div>
          <div class="chat-steuerung">
            ${a ? `<span class="badge violett" title="${esc(a.beschreibung)}">${esc(a.symbol)} ${esc(a.name)} <button class="x" data-aktion="chat-ohne-assistent" aria-label="Assistent entfernen" title="Ohne Assistent weiter">✕</button></span>` : ""}
            ${modellAuswahl(c)}
            <label class="kompakt"><span class="small muted">Schutzbedarf</span><select data-change="chat-schutz" aria-label="Schutzbedarf">${D.SCHUTZ.map((s) => `<option value="${s.id}" ${s.id === c.schutz ? "selected" : ""}>${esc(s.kurz)} · ${esc(s.name)}</option>`).join("")}</select></label>
            ${wissenAuswahl(c)}
          </div>
          <div class="ort-zeile">${ortBadge(o)} <span class="small muted">${esc(schutz(c.schutz).text)}</span></div>
        </div>
        <div class="verlauf" id="verlauf" aria-live="polite">${msgs || startHTML(c)}</div>
        <form class="eingabe" data-form="senden" autocomplete="off">
          ${E.anhaenge.length ? `<div class="anh">${E.anhaenge.map((x, k) => `<span class="badge neutral">📎 ${esc(x.name)} · ${groesse(x.groesse)} <button type="button" class="x" data-aktion="anhang-weg" data-k="${k}" aria-label="Anhang ${esc(x.name)} entfernen">✕</button></span>`).join(" ")}</div>` : ""}
          <label class="sr-only" for="frage">Nachricht</label>
          <textarea id="frage" rows="2" placeholder="${o ? "Nachricht schreiben … (Enter senden, Umschalt+Enter neue Zeile)" : "Kein Modell zulässig – Schutzbedarf oder Modell ändern"}" ${o ? "" : "disabled"}>${esc(E.entwurf)}</textarea>
          <div class="eingabe-leiste">
            <label class="btn klein" title="Datei anhängen">${ICONS.anhang} Anhang<input type="file" multiple data-change="anhang" class="sr-only"></label>
            <label class="btn klein ${webErlaubt ? "" : "aus"}" title="${webErlaubt ? "Websuche für diese Nachricht" : "Websuche nur bei Schutzbedarf «öffentlich»"}"><input type="checkbox" data-change="web" ${E.web && webErlaubt ? "checked" : ""} ${webErlaubt ? "" : "disabled"}> 🌐 Websuche</label>
            <span class="small muted rechts-text">${S.einst.chatHinweis ? "KI kann Fehler machen – Ergebnisse vor der Verwendung prüfen." : ""}</span>
            ${laeuft ? `<button type="button" class="btn" data-aktion="stopp">${ICONS.stopp} Stopp</button>` : `<button type="submit" class="btn primaer" ${o ? "" : "disabled"}>${ICONS.senden} Senden</button>`}
          </div>
        </form>
      </section>
    </div>`;
  }
  function neuerChat(assistentId) {
    const a = assistentId && ass(assistentId);
    const schutzId = a ? a.schutz : S.einst.standardSchutz;
    const c = { id: uid("c"), titel: a ? `Neu mit ${a.name}` : "Neue Unterhaltung", modell: a ? a.modell : S.einst.standard[schutzId], assistent: a ? a.id : null, wissen: a ? a.wissen.slice() : [], schutz: schutzId, angeheftet: false, geaendert: jetzt(), nachrichten: [] };
    S.chats.push(c); speichern(); return c;
  }

  // Erkennung möglicher Personendaten (nur Beispiele): AHV-Nummer, E-Mail, Telefonnummer, Geburtsdatum
  const PERSONENDATEN = [
    [/756\.\d{4}\.\d{4}\.\d{2}/, "AHV-Nummer"], [/[\w.+-]+@[\w-]+\.[\w.]+/, "E-Mail-Adresse"],
    [/(\+41|0)\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}/, "Telefonnummer"], [/geb(oren|\.)\s*(am\s*)?\d{1,2}\.\s?\d{1,2}\.\s?\d{2,4}/i, "Geburtsdatum"],
    [/\b(diagnose|therapie|IV-Abklärung|Sonderschul|Kindesschutz|KESB)\b/i, "besonders schützenswerte Angaben"],
  ];
  function personendaten(text) { return PERSONENDATEN.filter(([re]) => re.test(text)).map(([, n]) => n); }

  // Simulierte Antwort
  function antwortBauen(c, frage) {
    const f = frage.toLowerCase();
    const a = c.assistent && ass(c.assistent);
    const wz = []; let quellen = [];
    let text;
    if (/eltern|einladung|elternabend|brief/.test(f)) {
      text = `Hier ein Entwurf:\n\n**Betreff: ${/elternabend|einladung/.test(f) ? "Einladung zum Elternabend" : "Information der Schule"}**\n\nSehr geehrte Eltern\n\n${/projektwoche/.test(f) ? "Vom 9. bis 13. März findet unsere Projektwoche statt. Die Lernenden arbeiten in altersgemischten Gruppen an selbst gewählten Themen. Der Unterricht beginnt und endet zu den üblichen Zeiten." : "Gerne laden wir Sie zum Elternabend ein. Wir informieren über das laufende Semester, die Berufswahl und die nächsten Anlässe."}\n\nWir freuen uns auf Ihr Interesse. Bei Fragen erreichen Sie das Sekretariat unter ${S.org.telefon || "der bekannten Nummer"}.\n\nFreundliche Grüsse\n${S.org.name}`;
    } else if (/einfache sprache|vereinfach/.test(f) || (a && a.id === "a-einfach")) {
      text = "In einfacher Sprache:\n\nDie Schulpflege hat etwas entschieden.\nDie Blockzeiten ändern sich.\nBlockzeiten sind die Zeiten, in denen Ihr Kind sicher in der Schule ist.\nDie neuen Zeiten bekommen Sie bald in einem Brief.";
    } else if (/übersetz|rumantsch|albanisch|italienisch|englisch/.test(f) || (a && a.id === "a-uebersetzen")) {
      text = "Die Übersetzung würde hier erscheinen. Im Prototyp werden keine echten Übersetzungen erzeugt.\n\nHinweis des Modells: Begriffe wie «Schulpflege», «Blockzeiten» und «Klassenlehrperson» haben in vielen Sprachen keine direkte Entsprechung – kurze Erklärung in Klammern ergänzen.";
    } else if (/protokoll|zusammenfass|notizen/.test(f)) {
      text = "**Protokoll (Entwurf)**\n\n**Beschlüsse**\n\n- Beschluss 1: …\n- Beschluss 2: …\n\n**Pendenzen**\n\n1. Aufgabe – zuständig – Termin\n2. Aufgabe – zuständig – Termin\n\nFügen Sie Ihre Notizen ein, dann fülle ich Beschlüsse und Pendenzen aus.";
    } else if (/rechtsgrundlage|gesetz|verordnung|dispens|reglement/.test(f)) {
      wz.push("EduKSX-Codex");
      text = "Ich habe in der Rechtssammlung (EduKSX-Codex) nachgeschlagen. Dispensationen vom Unterricht regeln im Kanton Zürich das Volksschulgesetz und die Volksschulverordnung; ergänzend gilt die Schulordnung der Schule.\n\nBitte die genaue Bestimmung im Codex öffnen und prüfen – im Prototyp ist die Antwort simuliert.";
    } else if (/passwort|gerät|drucker|wlan|konto/.test(f)) {
      text = "Laut ICT-Handbuch:\n\n1. Im Verwaltungsportal unter «Konten» die Person suchen.\n2. «Passwort zurücksetzen» wählen.\n3. Einmal-Passwort persönlich übergeben.\n\nFehlt etwas, bitte ein Support-Ticket eröffnen.";
    } else {
      text = `Verstanden. Im Prototyp werden die Antworten simuliert – im Betrieb antwortet hier ${(modell(c.modell) || {}).name || "das gewählte Modell"}.\n\nIhre Nachricht hatte ${frage.trim().split(/\s+/).length} Wörter${E.anhaenge.length ? ` und ${E.anhaenge.length} Anhang/Anhänge` : ""}.`;
    }
    if (c.wissen.length) {
      wz.push("Wissenssammlungen");
      c.wissen.forEach((wid) => { const w = wissen(wid); if (!w) return; w.dateien.filter((d) => d.status === "indexiert").slice(0, 2).forEach((d, k) => quellen.push({ wissen: w.id, datei: d.name, stelle: `Abschnitt ${k + 2}` })); });
      if (quellen.length) text += `\n\nQuellen: ${quellen.map((q, k) => `[${k + 1}]`).join(" ")}`;
    }
    if (E.web && c.schutz === "oeffentlich") { wz.push("Websuche"); }
    if (E.anhaenge.length) wz.push("Dateien lesen");
    return { text, quellen, werkzeuge: wz };
  }
  function senden(text) {
    const [, id] = route();
    const c = chat(id); if (!c || !text.trim() || E.laeuft) return;
    const pd = S.einst.warnung ? personendaten(text) : [];
    const brauchtStufe = pd.includes("besonders schützenswerte Angaben") ? "geheim" : pd.length ? "vertraulich" : null;
    if (brauchtStufe && SCHUTZ_IDX[c.schutz] < SCHUTZ_IDX[brauchtStufe]) {
      E.dialog = { art: "personendaten", text, gefunden: pd, stufe: brauchtStufe }; render(); return;
    }
    abschicken(c, text);
  }
  function abschicken(c, text) {
    const o = ortFuer(modell(c.modell), c.schutz);
    if (!o) { toast("Kein zulässiger Betriebsort für dieses Modell."); return; }
    c.nachrichten.push({ rolle: "ich", text, zeit: jetzt(), anhaenge: E.anhaenge.map((x) => ({ name: x.name, groesse: x.groesse })) });
    if (c.titel === "Neue Unterhaltung" || c.titel.startsWith("Neu mit ")) c.titel = text.replace(/\s+/g, " ").slice(0, 48) + (text.length > 48 ? " …" : "");
    const ant = antwortBauen(c, text);
    E.anhaenge = []; E.entwurf = ""; E.web = false;
    streamen(c, ant, o);
  }
  function streamen(c, ant, o) {
    const start = Date.now();
    c.nachrichten.push({ rolle: "ki", text: "", zeit: jetzt(), modell: c.modell, ort: o.id, quellen: [], werkzeuge: ant.werkzeuge });
    const index = c.nachrichten.length - 1;
    c.geaendert = jetzt();
    E.laeuft = { chat: c.id, index, timer: null };
    render(); nachUnten();
    const woerter = ant.text.split(/(\s+)/); let k = 0;
    const tempo = o.art === "intern" ? 18 : 28;
    E.laeuft.timer = setInterval(() => {
      const n = c.nachrichten[index];
      if (!n) { stopp(); return; }
      n.text += woerter.slice(k, k + 3).join(""); k += 3;
      const el = route()[1] === c.id ? document.querySelector(`[data-text="${index}"]`) : null;
      if (el) { el.innerHTML = auszeichnen(n.text) + '<span class="cursor" aria-hidden="true"></span>'; nachUnten(); }
      if (k >= woerter.length) {
        n.quellen = ant.quellen; n.tokens = Math.round(ant.text.length / 3.6); n.dauer = Math.round((Date.now() - start) / 100) / 10;
        stopp();
      }
    }, tempo);
  }
  function stopp() {
    if (!E.laeuft) return;
    clearInterval(E.laeuft.timer);
    const c = chat(E.laeuft.chat); const n = c && c.nachrichten[E.laeuft.index];
    if (n && n.tokens == null) { n.tokens = Math.round(n.text.length / 3.6); n.dauer = 0; n.text += n.text ? " …" : "(abgebrochen)"; }
    E.laeuft = null; speichern(); render(); nachUnten();
  }
  function nachUnten() { const v = document.getElementById("verlauf"); if (v) v.scrollTop = v.scrollHeight; }

  // ---------------------------------------------------------------- Assistenten
  function sichtbarFuerMich(f, besitzer) {
    if (besitzer === D.ICH.id || f.art === "organisation") return true;
    const ich = benutzer(D.ICH.id);
    return f.art === "gruppen" && f.gruppen.some((g) => ich.gruppen.includes(g));
  }
  function seiteAssistenten() {
    const q = E.assSuche.trim().toLowerCase();
    const filter = { alle: () => true, meine: (a) => a.besitzer === D.ICH.id, geteilt: (a) => a.besitzer !== D.ICH.id, favoriten: (a) => a.favorit };
    const liste = S.assistenten.filter((a) => sichtbarFuerMich(a.freigabe, a.besitzer)).filter(filter[E.assFilter] || filter.alle)
      .filter((a) => !q || (a.name + " " + a.beschreibung).toLowerCase().includes(q)).sort((a, b) => (b.favorit - a.favorit) || a.name.localeCompare(b.name, "de"));
    const karten = liste.map((a) => {
      const m = modell(a.modell);
      return `<article class="karte ass-karte">
        <div class="ass-kopf"><span class="ass-sym" aria-hidden="true">${esc(a.symbol)}</span><div><h2>${esc(a.name)}</h2><p class="small muted">${esc(a.beschreibung)}</p></div>
          <button class="btn klein stern" data-aktion="ass-favorit" data-id="${esc(a.id)}" aria-pressed="${!!a.favorit}" title="${a.favorit ? "Aus Favoriten entfernen" : "Als Favorit markieren"}">${a.favorit ? "★" : "☆"}<span class="sr-only">Favorit</span></button></div>
        <div class="ass-meta small"><span>🧠 ${esc(m ? m.name : "–")}</span>${a.wissen.length ? `<span>${ICONS.wissen.replace("<svg", '<svg width="14" height="14"')} ${a.wissen.map((w) => esc((wissen(w) || {}).name || w)).join(", ")}</span>` : ""}</div>
        <div class="ass-meta">${schutzBadge(a.schutz)} ${sichtbarkeit(a.freigabe)}</div>
        <div class="ass-fuss"><span class="small muted">von ${esc((benutzer(a.besitzer) || {}).name || "?")}</span>
          <span><a class="btn klein" href="#/assistenten/${esc(a.id)}">Bearbeiten</a> <button class="btn klein primaer" data-aktion="ass-chat" data-id="${esc(a.id)}">Chat starten</button></span></div>
      </article>`;
    }).join("");
    const f = (id, t) => `<option value="${id}" ${E.assFilter === id ? "selected" : ""}>${t}</option>`;
    return `<div class="seitenkopf"><div><h1>Assistenten</h1><p class="muted">Vorbereitete Helfer mit festen Anweisungen, Modell und Wissen – für wiederkehrende Aufgaben.</p></div>
        <div class="aktionen"><button class="btn" data-aktion="ass-import" title="Assistent aus Datei (JSON) übernehmen">⇪ Importieren</button><a class="btn primaer" href="#/assistenten/neu">${ICONS.neu} Assistent erstellen</a></div></div>
      <div class="formzeile"><label class="feld">Suchen<input type="search" id="ass-suche" data-eingabe="ass-suche" value="${esc(E.assSuche)}" placeholder="Name oder Beschreibung"></label>
        <label class="feld">Anzeigen<select data-change="ass-filter">${f("alle", "Alle verfügbaren")}${f("meine", "Von mir erstellt")}${f("geteilt", "Mit mir geteilt")}${f("favoriten", "Favoriten")}</select></label>
        <span class="small muted">${liste.length} von ${S.assistenten.length}</span></div>
      ${karten ? `<div class="ass-raster">${karten}</div>` : `<div class="leer"><p><strong>Keine Assistenten in dieser Ansicht.</strong></p><p class="muted">Erstellen Sie einen eigenen oder wählen Sie «Alle verfügbaren».</p></div>`}`;
  }
  function freigabeFelder(f, praefix) {
    return `<fieldset class="feldgruppe"><legend>Freigabe</legend>
      ${[["privat", "Nur ich"], ["gruppen", "Ausgewählte Gruppen"], ["organisation", "Ganze Organisation"]].map(([k, t]) => `<label class="haken"><input type="radio" name="${praefix}-art" value="${k}" ${f.art === k ? "checked" : ""}> ${t}</label>`).join("")}
      <div class="gruppenwahl">${S.gruppen.map((g) => `<label class="haken"><input type="checkbox" name="${praefix}-gruppe" value="${esc(g.id)}" ${f.gruppen.includes(g.id) ? "checked" : ""}> ${esc(g.name)}</label>`).join("")}</div></fieldset>`;
  }
  function freigabeLesen(form, praefix) {
    const art = (form.querySelector(`[name="${praefix}-art"]:checked`) || {}).value || "privat";
    return { art, gruppen: art === "gruppen" ? [...form.querySelectorAll(`[name="${praefix}-gruppe"]:checked`)].map((x) => x.value) : [] };
  }
  function seiteAssistent(id) {
    const neu = id === "neu";
    const a = neu ? { id: "", name: "", symbol: "★", beschreibung: "", anweisung: "", modell: S.einst.standard.intern, wissen: [], web: false, schutz: "intern", freigabe: { art: "privat", gruppen: [] }, starter: [] } : ass(id);
    if (!a) return `<p>Assistent nicht gefunden. <a href="#/assistenten">Zur Übersicht</a></p>`;
    return `<div class="seitenkopf"><div><p class="pfad"><a href="#/assistenten">Assistenten</a> ›</p><h1>${neu ? "Assistent erstellen" : esc(a.name)}</h1></div>
      <div class="aktionen">${neu ? "" : `<button class="btn" data-aktion="ass-export" data-id="${esc(a.id)}">⇩ Exportieren</button><button class="btn gefahr" data-aktion="ass-loeschen" data-id="${esc(a.id)}">🗑 Löschen</button>`}</div></div>
      <form class="zwei-spalten" data-form="assistent" data-id="${esc(a.id)}">
        <div class="karte formular">
          <div class="formzeile"><label class="feld" style="width:5rem">Symbol<input type="text" name="symbol" maxlength="2" value="${esc(a.symbol)}"></label>
            <label class="feld wachsen">Name<input type="text" name="name" required maxlength="60" value="${esc(a.name)}"></label></div>
          <label class="feld">Kurzbeschreibung<input type="text" name="beschreibung" maxlength="140" value="${esc(a.beschreibung)}"></label>
          <label class="feld">Anweisungen an das Modell<textarea name="anweisung" rows="7" maxlength="4000">${esc(a.anweisung)}</textarea><span class="small muted">Wird jeder Unterhaltung vorangestellt, zusammen mit dem Organisationshinweis.</span></label>
          <label class="feld">Gesprächsanfänge (eine Zeile je Vorschlag)<textarea name="starter" rows="3">${esc(a.starter.join("\n"))}</textarea></label>
        </div>
        <div class="karte formular">
          <label class="feld">Schutzbedarf<select name="schutz">${D.SCHUTZ.map((s) => `<option value="${s.id}" ${s.id === a.schutz ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select><span class="small muted">Bestimmt, welche Modelle und Betriebsorte zulässig sind.</span></label>
          <label class="feld">Modell<select name="modell">${chatModelle().map((m) => `<option value="${esc(m.id)}" ${m.id === a.modell ? "selected" : ""}>${esc(m.name)}${ortFuer(m, a.schutz) ? "" : " (für diesen Schutzbedarf nicht zulässig)"}</option>`).join("")}</select></label>
          <fieldset class="feldgruppe"><legend>Wissen</legend>${S.wissen.map((w) => `<label class="haken"><input type="checkbox" name="wissen" value="${esc(w.id)}" ${a.wissen.includes(w.id) ? "checked" : ""}> ${esc(w.name)} ${schutzBadge(w.schutz)}</label>`).join("")}</fieldset>
          ${freigabeFelder(a.freigabe, "ass")}
          <div class="formzeile" style="justify-content:flex-end"><a class="btn" href="#/assistenten">Abbrechen</a><button class="btn primaer" type="submit">Speichern</button></div>
        </div>
      </form>`;
  }

  // ---------------------------------------------------------------- Wissen
  function seiteWissen() {
    const liste = S.wissen.filter((w) => sichtbarFuerMich(w.freigabe, w.besitzer));
    const zeilen = liste.map((w) => {
      const teile = w.dateien.reduce((s, d) => s + (d.teile || 0), 0);
      const offen = w.dateien.filter((d) => d.status === "wird indexiert").length;
      return `<tr><td><a href="#/wissen/${esc(w.id)}"><strong>${esc(w.name)}</strong></a><div class="small muted">${esc(w.beschreibung)}</div></td>
        <td>${schutzBadge(w.schutz)}</td><td>${sichtbarkeit(w.freigabe)}</td><td class="zahl">${w.dateien.length}</td>
        <td class="zahl">${zahl(teile)}${offen ? ` <span class="badge warnung">⏳ ${offen}</span>` : ""}</td><td class="small">${esc((benutzer(w.besitzer) || {}).name || "")}</td></tr>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Wissen</h1><p class="muted">Sammlungen von Dokumenten, auf die sich Antworten stützen. Der Suchindex läuft immer auf dem internen Server.</p></div>
      <div class="aktionen"><button class="btn primaer" data-aktion="wissen-neu">${ICONS.neu} Sammlung anlegen</button></div></div>
      <div class="tabelle-wrap"><table><thead><tr><th>Sammlung</th><th>Schutzbedarf</th><th>Sichtbar für</th><th class="zahl">Dateien</th><th class="zahl">Abschnitte im Index</th><th>Verantwortlich</th></tr></thead><tbody>${zeilen}</tbody></table></div>
      <p class="small muted" style="margin-top:.75rem">Dateien werden in Abschnitte zerlegt und mit ${esc((modell("m-embed") || {}).name || "dem Einbettungsmodell")} in Vektoren umgewandelt. Dateien ohne lesbaren Text (z. B. gescannte Bilder ohne Texterkennung) werden übersprungen.</p>`;
  }
  function seiteWissenDetail(id) {
    const w = wissen(id); if (!w) return `<p>Sammlung nicht gefunden. <a href="#/wissen">Zur Übersicht</a></p>`;
    const status = (d) => d.status === "indexiert" ? '<span class="badge erfolg">✓ indexiert</span>' : d.status === "wird indexiert" ? '<span class="badge warnung">⏳ wird indexiert</span>' : '<span class="badge neutral">– ohne Text</span>';
    return `<div class="seitenkopf"><div><p class="pfad"><a href="#/wissen">Wissen</a> ›</p><h1>${esc(w.name)}</h1><p class="muted">${esc(w.beschreibung)}</p></div>
      <div class="aktionen"><button class="btn" data-aktion="wissen-chat" data-id="${esc(w.id)}">${ICONS.chat} Im Chat verwenden</button><button class="btn gefahr" data-aktion="wissen-loeschen" data-id="${esc(w.id)}">🗑 Löschen</button></div></div>
      <div class="zwei-spalten">
        <section class="karte"><h2>Dateien</h2>
          <div class="tabelle-wrap"><table><thead><tr><th>Datei</th><th class="zahl">Grösse</th><th>Status</th><th class="zahl">Abschnitte</th><th></th></tr></thead><tbody>
          ${w.dateien.map((d, k) => `<tr><td>📄 ${esc(d.name)}</td><td class="zahl">${groesse(d.groesse)}</td><td>${status(d)}</td><td class="zahl">${d.teile || "–"}</td><td><button class="btn klein gefahr" data-aktion="datei-weg" data-id="${esc(w.id)}" data-k="${k}" aria-label="${esc(d.name)} entfernen">✕</button></td></tr>`).join("") || '<tr><td colspan="5" class="muted">Noch keine Dateien.</td></tr>'}
          </tbody></table></div>
          <label class="dropflaeche">⇪ Dateien hinzufügen (PDF, Word, Excel, Text, Markdown)<input type="file" multiple class="sr-only" data-change="wissen-dateien" data-id="${esc(w.id)}"></label>
        </section>
        <form class="karte formular" data-form="wissen" data-id="${esc(w.id)}"><h2>Einstellungen</h2>
          <label class="feld">Name<input type="text" name="name" value="${esc(w.name)}" required></label>
          <label class="feld">Beschreibung<input type="text" name="beschreibung" value="${esc(w.beschreibung)}"></label>
          <label class="feld">Schutzbedarf<select name="schutz">${D.SCHUTZ.map((s) => `<option value="${s.id}" ${s.id === w.schutz ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select><span class="small muted">Sammlungen mit höherem Schutzbedarf sind nur in Unterhaltungen mit mindestens gleichem Schutzbedarf wählbar.</span></label>
          ${freigabeFelder(w.freigabe, "w")}
          <div class="formzeile" style="justify-content:flex-end"><button class="btn primaer" type="submit">Speichern</button></div>
        </form>
      </div>`;
  }

  // ---------------------------------------------------------------- Verwaltung
  function vkopf(titel, text, aktionen) { return `<div class="seitenkopf"><div><h1>${esc(titel)}</h1><p class="muted">${text}</p></div>${aktionen ? `<div class="aktionen">${aktionen}</div>` : ""}</div>`; }
  function seiteOrganisation() {
    const o = S.org;
    return vkopf("Organisation", "Angaben, die das Modell in Briefen und Antworten verwenden darf, und ein Hinweis, der jeder Unterhaltung vorangestellt wird.") +
      `<form class="karte formular schmal" data-form="org">
        <label class="feld">Name der Schule bzw. Organisation<input type="text" name="name" value="${esc(o.name)}"></label>
        <label class="feld">Postadresse<textarea name="adresse" rows="2">${esc(o.adresse)}</textarea></label>
        <div class="formzeile"><label class="feld wachsen">Telefon Sekretariat<input type="text" name="telefon" value="${esc(o.telefon)}"></label><label class="feld wachsen">E-Mail Sekretariat<input type="text" name="mail" value="${esc(o.mail)}"></label></div>
        <label class="feld">Website<input type="text" name="web" value="${esc(o.web)}"></label>
        <label class="feld">Hinweis an das Modell (Ton, Schreibweise, Regeln)<textarea name="hinweis" rows="4" maxlength="1000" data-zaehlen="hz">${esc(o.hinweis)}</textarea><span class="small muted"><span id="hz">${o.hinweis.length}</span> / 1000 Zeichen</span></label>
        <div class="formzeile" style="justify-content:flex-end"><button class="btn primaer" type="submit">Speichern</button></div>
      </form>`;
  }
  function seiteBenutzer() {
    const reiter = E.reiter.benutzer || "personen";
    const r = (k, t) => `<button role="tab" aria-selected="${reiter === k}" data-aktion="reiter" data-gruppe="benutzer" data-wert="${k}">${t}</button>`;
    let inhalt;
    if (reiter === "personen") {
      inhalt = `<div class="tabelle-wrap"><table><thead><tr><th>Name</th><th>E-Mail (Anmeldename)</th><th>Rolle</th><th>Gruppen</th><th>Status</th><th>Zuletzt aktiv</th><th></th></tr></thead><tbody>
        ${S.benutzer.map((b) => `<tr><td><strong>${esc(b.name)}</strong></td><td class="small">${esc(b.mail)}</td>
          <td><select data-change="benutzer-rolle" data-id="${esc(b.id)}" aria-label="Rolle ${esc(b.name)}" ${b.id === D.ICH.id ? 'disabled title="Eigene Rolle nicht änderbar"' : ""}>${S.rollen.map((x) => `<option value="${x.id}" ${x.id === b.rolle ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></td>
          <td>${b.gruppen.map((g) => `<span class="badge neutral">${esc((gruppe(g) || {}).name || g)}</span>`).join(" ")}</td>
          <td>${b.aktiv ? '<span class="badge erfolg">✓ aktiv</span>' : '<span class="badge neutral">⏸ gesperrt</span>'}</td><td class="small">${datumZeit(b.zuletzt)}</td>
          <td class="zeilenaktionen">${b.id === D.ICH.id ? "" : `<button class="btn klein" data-aktion="benutzer-sperren" data-id="${esc(b.id)}">${b.aktiv ? "Sperren" : "Entsperren"}</button>`}<button class="btn klein" data-aktion="benutzer-gruppen" data-id="${esc(b.id)}">Gruppen</button></td></tr>`).join("")}
        </tbody></table></div>
        <p class="small muted" style="margin-top:.75rem">Anmeldung und Konten kommen im Betrieb aus EduKSX-Ident (einmalige Anmeldung mit dem Schulkonto); hier werden nur Rolle, Gruppen und Sperre gepflegt.</p>`;
    } else {
      inhalt = `<div class="tabelle-wrap"><table><thead><tr><th>Gruppe</th><th>Beschreibung</th><th class="zahl">Mitglieder</th><th>Freigegeben</th><th></th></tr></thead><tbody>
        ${S.gruppen.map((g) => { const n = S.benutzer.filter((b) => b.gruppen.includes(g.id)).length; const fa = S.assistenten.filter((a) => a.freigabe.gruppen.includes(g.id)).length; const fw = S.wissen.filter((w) => w.freigabe.gruppen.includes(g.id)).length;
          return `<tr><td><strong>${esc(g.name)}</strong></td><td class="small">${esc(g.beschreibung)}</td><td class="zahl">${n}</td><td class="small">${fa} Assistent(en), ${fw} Sammlung(en)</td><td class="zeilenaktionen"><button class="btn klein gefahr" data-aktion="gruppe-loeschen" data-id="${esc(g.id)}">Löschen</button></td></tr>`; }).join("")}
        </tbody></table></div>`;
    }
    return vkopf("Benutzer & Gruppen", "Wer die Plattform nutzt und in welchen Gruppen – Gruppen steuern die Freigabe von Assistenten und Wissen.",
      reiter === "gruppen" ? `<button class="btn primaer" data-aktion="gruppe-neu">${ICONS.neu} Gruppe anlegen</button>` : `<button class="btn" data-aktion="benutzer-abgleich">↻ Mit EduKSX-Ident abgleichen</button>`) +
      `<div class="reiter" role="tablist">${r("personen", `Personen (${S.benutzer.length})`)}${r("gruppen", `Gruppen (${S.gruppen.length})`)}</div>${inhalt}`;
  }
  function seiteRollen() {
    const kopfzeile = S.rollen.map((r) => `<th class="mitte">${esc(r.name)}${r.fest ? "<br><span class=\"small muted\">fest</span>" : ""}</th>`).join("");
    const zeilen = D.RECHTE.map(([k, t]) => `<tr><td>${esc(t)}</td>${S.rollen.map((r) => `<td class="mitte"><input type="checkbox" data-change="recht" data-rolle="${esc(r.id)}" value="${esc(k)}" ${r.rechte.includes(k) ? "checked" : ""} ${r.fest ? "disabled" : ""} aria-label="${esc(t)} – ${esc(r.name)}"></td>`).join("")}</tr>`).join("");
    return vkopf("Rollen & Rechte", "Was eine Rolle grundsätzlich darf. Welche Assistenten und Sammlungen jemand sieht, regeln die Freigaben; welche Daten wohin dürfen, regelt der Datenschutz.") +
      `<div class="tabelle-wrap"><table class="matrix-rechte"><thead><tr><th>Recht</th>${kopfzeile}</tr></thead><tbody>${zeilen}</tbody>
        <tfoot><tr><td class="small muted">Personen mit dieser Rolle</td>${S.rollen.map((r) => `<td class="mitte small">${S.benutzer.filter((b) => b.rolle === r.id).length}</td>`).join("")}</tr></tfoot></table></div>
      <div class="karten" style="margin-top:1rem">${S.rollen.map((r) => `<div class="karte"><div class="titel">${esc(r.name)}</div><p class="small" style="margin:.3rem 0 0">${esc(r.beschreibung)}</p></div>`).join("")}</div>`;
  }
  function seiteModelle() {
    const ms = S.modelle;
    const zeilen = ms.map((m) => {
      const orte = m.betrieb.map(ort).filter(Boolean);
      const chatbar = !m.faehig.includes("einbettung") && !m.faehig.includes("sprache");
      const zul = D.SCHUTZ.filter((s) => ortFuer(m, s.id)).map((s) => s.kurz).join(" ");
      return `<tr>
        <td><strong>${esc(m.name)}</strong><div class="small muted"><code>${esc(m.kennung)}</code></div><div class="small">${esc(m.text)}</div></td>
        <td class="small">${esc(m.herkunft)}<br><a href="${esc(m.quelle)}" target="_blank" rel="noopener noreferrer">Modellkarte ↗</a></td>
        <td class="small">${esc(m.groesse)}<br>Kontext ${esc(m.kontext)}<br>${esc(m.lizenz)}</td>
        <td>${m.faehig.map((f) => `<span class="badge neutral">${esc(FAEHIG[f] || f)}</span>`).join(" ")}</td>
        <td class="small">${orte.map((o) => `${o.art === "intern" ? "🔒" : "⛰"} ${esc(o.name.split(" – ")[0])}`).join("<br>") || '<span class="badge warnung">⚠ kein Betriebsort</span>'}<br><button class="link small" data-aktion="modell-orte" data-id="${esc(m.id)}">ändern</button></td>
        <td class="small">${chatbar ? (zul ? esc(zul) : "–") : "–"}</td>
        <td><label class="schalter"><input type="checkbox" data-change="modell-aktiv" data-id="${esc(m.id)}" ${m.aktiv ? "checked" : ""}> ${m.aktiv ? "freigeschaltet" : "aus"}</label></td></tr>`;
    }).join("");
    const standard = D.SCHUTZ.map((s) => `<label class="feld">${esc(s.name)}<select data-change="standard-modell" data-schutz="${s.id}">${chatModelle().map((m) => `<option value="${esc(m.id)}" ${S.einst.standard[s.id] === m.id ? "selected" : ""} ${ortFuer(m, s.id) ? "" : "disabled"}>${esc(m.name)}${ortFuer(m, s.id) ? "" : " (nicht zulässig)"}</option>`).join("")}</select></label>`).join("");
    return vkopf("Modelle", `Offene Modelle, die auf dem internen Server oder bei einem freigegebenen Schweizer Anbieter laufen. Neue Modelle werden nie automatisch freigeschaltet. Angaben Stand 23.11.2026 – vor dem Einsatz an der Modellkarte prüfen.`,
      `<button class="btn primaer" data-aktion="modell-neu">${ICONS.neu} Modell hinzufügen</button>`) +
      `<section class="karte" style="margin-bottom:1rem"><h2>Standardmodell je Schutzbedarf</h2><p class="small muted">Gilt für neue Unterhaltungen und für Personen ohne Recht «Modell selbst wählen».</p><div class="raster-4">${standard}</div></section>
      <div class="tabelle-wrap"><table><thead><tr><th>Modell</th><th>Herkunft</th><th>Grösse · Lizenz</th><th>Fähigkeiten</th><th>Läuft auf</th><th title="Zulässig für Schutzbedarf">Zulässig</th><th>Status</th></tr></thead><tbody>${zeilen}</tbody></table></div>`;
  }
  function seiteOrte() {
    const gruppen = Object.keys(ARTEN).map((art) => {
      const os = S.orte.filter((o) => o.art === art); if (!os.length) return "";
      return `<h2 class="abschnitt">${esc(ARTEN[art])}</h2><div class="ort-raster">${os.map((o) => {
        const z = o.zustand || {};
        const verb = !o.aktiv ? '<span class="badge neutral">– nicht aktiv</span>' : z.ok === true ? `<span class="badge erfolg">✓ erreichbar · ${z.ms} ms</span>` : z.ok === false ? '<span class="badge fehler">✕ nicht erreichbar</span>' : '<span class="badge neutral">? nicht geprüft</span>';
        const modelle = S.modelle.filter((m) => m.betrieb.includes(o.id));
        return `<article class="karte ort-karte">
          <div class="ort-kopf"><h3>${esc(o.name)}</h3>${freigabeBadge(o.freigabe)}</div>
          <dl class="fakten">
            <dt>Standort</dt><dd>${esc(o.standort)}</dd>
            <dt>Schnittstelle</dt><dd>${esc(o.schnittstelle)}<br><code>${esc(o.url)}</code></dd>
            <dt>Infrastruktur</dt><dd>${esc(o.hardware)}</dd>
            <dt>Nachweise</dt><dd>${esc(o.zert)}</dd>
            <dt>US CLOUD Act</dt><dd>${o.cloudAct ? '<span class="badge fehler">⚠ betroffen</span>' : '<span class="badge erfolg">✓ nicht betroffen (laut Anbieter)</span>'}</dd>
            <dt>Vertrag (ADV)</dt><dd>${esc(o.avv)}</dd>
            <dt>Zulässig bis</dt><dd>${schutzBadge(o.maxSchutz)}</dd>
            <dt>Modelle</dt><dd>${modelle.map((m) => esc(m.name)).join(", ") || "–"}</dd>
            <dt>Verbindung</dt><dd>${verb}</dd>
          </dl>
          ${o.bemerkung ? `<p class="small meldung warnung">${esc(o.bemerkung)}</p>` : ""}
          <div class="ort-fuss">${o.quelle ? `<a class="small" href="${esc(o.quelle)}" target="_blank" rel="noopener noreferrer">Website des Anbieters ↗</a>` : '<span class="small muted">eigener Betrieb</span>'}
            <span><button class="btn klein" data-aktion="ort-testen" data-id="${esc(o.id)}" ${o.freigabe === "abgelehnt" ? "disabled" : ""}>Verbindung testen</button> <button class="btn klein" data-aktion="ort-bearbeiten" data-id="${esc(o.id)}">Bearbeiten</button></span></div>
        </article>`;
      }).join("")}</div>`;
    }).join("");
    return vkopf("Betriebsorte", `Wo die Modelle rechnen: eigener KI-Server oder geprüfte Schweizer Anbieter mit OpenAI-kompatibler Schnittstelle. Ein Betriebsort wird erst nach Datenschutzprüfung freigegeben und gilt nur bis zum angegebenen Schutzbedarf. Übersicht Schweizer Anbieter: <a href="${VERGLEICH}" target="_blank" rel="noopener noreferrer">Vergleich KI-Anbieter Schweiz (openstream) ↗</a>`,
      `<button class="btn primaer" data-aktion="ort-neu">${ICONS.neu} Betriebsort hinzufügen</button>`) + gruppen;
  }
  function seiteWerkzeuge() {
    return vkopf("Werkzeuge", "Fähigkeiten, die ein Modell während einer Antwort nutzen darf. Anbindungen an EduKSX-Module laufen über das Model Context Protocol (MCP).",
      `<button class="btn primaer" data-aktion="werkzeug-neu">${ICONS.neu} Anbindung hinzufügen</button>`) +
      `<div class="tabelle-wrap"><table><thead><tr><th>Werkzeug</th><th>Art</th><th>Zulässig bis</th><th>Status</th></tr></thead><tbody>
      ${S.werkzeuge.map((w) => `<tr><td><strong>${w.art === "eduksx" ? wordmark(w.name.replace("EduKSX-", "")) : esc(w.name)}</strong><div class="small muted">${esc(w.text)}</div>${w.url ? `<div class="small"><code>${esc(w.url)}</code></div>` : ""}</td>
        <td>${{ intern: '<span class="badge erfolg">🔒 intern</span>', extern: '<span class="badge warnung">↗ verlässt die Schule</span>', eduksx: '<span class="badge violett">◆ EduKSX-Modul (MCP)</span>', mcp: '<span class="badge info">MCP</span>' }[w.art] || ""}</td>
        <td>${schutzBadge(w.maxSchutz)}</td>
        <td><label class="schalter"><input type="checkbox" data-change="werkzeug-aktiv" data-id="${esc(w.id)}" ${w.aktiv ? "checked" : ""}> ${w.aktiv ? "eingeschaltet" : "aus"}</label></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  function seiteDatenschutz() {
    const e = S.einst;
    const matrix = `<div class="tabelle-wrap"><table><thead><tr><th>Betriebsort</th>${D.SCHUTZ.map((s) => `<th class="mitte">${esc(s.name)}</th>`).join("")}</tr></thead><tbody>
      ${S.orte.map((o) => `<tr><td>${esc(o.name)} <span class="small muted">· ${esc(ARTEN[o.art])}</span>${o.freigabe !== "freigegeben" || !o.aktiv ? ` ${freigabeBadge(o.freigabe)}${o.aktiv ? "" : ' <span class="badge neutral">aus</span>'}` : ""}</td>
        ${D.SCHUTZ.map((s) => { const ja = o.aktiv && o.freigabe === "freigegeben" && SCHUTZ_IDX[o.maxSchutz] >= SCHUTZ_IDX[s.id]; return `<td class="mitte">${ja ? '<span class="ja">✓ <span class="sr-only">zulässig</span></span>' : '<span class="nein">– <span class="sr-only">nicht zulässig</span></span>'}</td>`; }).join("")}</tr>`).join("")}
      </tbody></table></div>`;
    return vkopf("Datenschutz", "Welche Daten wo verarbeitet werden dürfen, wie lange Unterhaltungen bleiben und was protokolliert wird.") +
      `<section class="karte" style="margin-bottom:1rem"><h2>Schutzbedarf und zulässige Betriebsorte</h2>
        <p class="small muted">Ergibt sich aus der Freigabe der Betriebsorte («Zulässig bis»). Jede Unterhaltung, jeder Assistent und jede Wissenssammlung hat einen Schutzbedarf; das Modell erhält nur Daten an zulässigen Orten.</p>${matrix}
        <ul class="small schutzliste">${D.SCHUTZ.map((s) => `<li>${schutzBadge(s.id)} ${esc(s.text)}</li>`).join("")}</ul></section>
      <form class="karte formular schmal" data-form="datenschutz"><h2>Regeln</h2>
        <label class="feld">Aufbewahrung von Unterhaltungen (Tage, 1–365)<input type="number" name="aufbewahrung" min="1" max="365" value="${esc(e.aufbewahrung)}"><span class="small muted">Danach automatisch gelöscht; angeheftete Unterhaltungen ausgenommen. Löschung auf Gesuch jederzeit.</span></label>
        <label class="feld">Schutzbedarf neuer Unterhaltungen<select name="standardSchutz">${D.SCHUTZ.map((s) => `<option value="${s.id}" ${s.id === e.standardSchutz ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
        <label class="feld">Protokollierung<select name="protokoll"><option value="metadaten" ${e.protokoll === "metadaten" ? "selected" : ""}>Nur Metadaten (wer, wann, Modell, Betriebsort, Tokens) – empfohlen</option><option value="aus" ${e.protokoll === "aus" ? "selected" : ""}>Aus</option></select><span class="small muted">Inhalte von Unterhaltungen werden nie ins Protokoll geschrieben.</span></label>
        <label class="haken"><input type="checkbox" name="warnung" ${e.warnung ? "checked" : ""}> Vor dem Senden auf mögliche Personendaten prüfen und Schutzbedarf vorschlagen</label>
        <label class="haken"><input type="checkbox" name="chatHinweis" ${e.chatHinweis ? "checked" : ""}> Hinweis «KI kann Fehler machen» im Chat anzeigen</label>
        <label class="haken"><input type="checkbox" checked disabled> Eingaben werden nie zum Training von Modellen verwendet (fest, vertraglich mit jedem Anbieter)</label>
        <div class="formzeile" style="justify-content:flex-end;margin-top:.75rem"><button class="btn primaer" type="submit">Speichern</button></div>
      </form>`;
  }
  function seiteZustand() {
    const aktiv = S.orte.filter((o) => o.aktiv);
    const anfragen = S.chats.reduce((s, c) => s + c.nachrichten.filter((n) => n.rolle === "ki").length, 0);
    const tokens = S.chats.reduce((s, c) => s + c.nachrichten.reduce((t, n) => t + (n.tokens || 0), 0), 0);
    const proModell = {};
    S.chats.forEach((c) => c.nachrichten.forEach((n) => { if (n.rolle === "ki") { proModell[n.modell] = proModell[n.modell] || { n: 0, t: 0 }; proModell[n.modell].n++; proModell[n.modell].t += n.tokens || 0; } }));
    const teile = S.wissen.reduce((s, w) => s + w.dateien.reduce((t, d) => t + (d.teile || 0), 0), 0);
    const gut = S.chats.reduce((s, c) => s + c.nachrichten.filter((n) => n.feedback === "gut").length, 0);
    const schlecht = S.chats.reduce((s, c) => s + c.nachrichten.filter((n) => n.feedback === "schlecht").length, 0);
    const status = (o) => { const z = o.zustand || {}; return z.ok === true ? '<span class="badge erfolg">✓ in Betrieb</span>' : z.ok === false ? '<span class="badge fehler">✕ Störung</span>' : '<span class="badge neutral">? unbekannt</span>'; };
    return vkopf("Systemzustand", `Letzte Prüfung ${esc(datumZeit(S.pruefung))}. Die Prüfung läuft stündlich automatisch.`, `<button class="btn" data-aktion="zustand-pruefen">↻ Jetzt prüfen</button>`) +
      `<div class="karten">
        <div class="karte"><div class="titel">Aktive Betriebsorte</div><div class="zahl">${aktiv.filter((o) => (o.zustand || {}).ok).length} / ${aktiv.length}</div><div class="small muted">erreichbar</div></div>
        <div class="karte"><div class="titel">Antworten (Testdaten)</div><div class="zahl">${zahl(anfragen)}</div><div class="small muted">${zahl(tokens)} Tokens</div></div>
        <div class="karte"><div class="titel">Suchindex</div><div class="zahl">${zahl(teile)}</div><div class="small muted">Abschnitte in ${S.wissen.length} Sammlungen</div></div>
        <div class="karte"><div class="titel">Rückmeldungen</div><div class="zahl">👍 ${gut} · 👎 ${schlecht}</div><div class="small muted">aus dem Chat</div></div>
      </div>
      <div class="zwei-spalten">
        <section class="karte"><h2>Betriebsorte</h2><div class="tabelle-wrap"><table><thead><tr><th>Ort</th><th>Status</th><th class="zahl">Antwortzeit</th><th>GPU-Auslastung</th></tr></thead><tbody>
          ${aktiv.map((o) => { const z = o.zustand || {}; return `<tr><td>${esc(o.name)}</td><td>${status(o)}</td><td class="zahl">${z.ms != null ? z.ms + " ms" : "–"}</td><td>${z.last != null ? `<div class="balken ${z.last > 85 ? "ueber" : z.last > 70 ? "voll" : ""}" title="${z.last} %"><span style="width:${z.last}%"></span></div><span class="small">${z.last} %</span>` : '<span class="small muted">geteilt – keine Angabe</span>'}</td></tr>`; }).join("")}
        </tbody></table></div></section>
        <section class="karte"><h2>Nutzung nach Modell</h2><div class="tabelle-wrap"><table><thead><tr><th>Modell</th><th class="zahl">Antworten</th><th class="zahl">Tokens</th></tr></thead><tbody>
          ${Object.keys(proModell).map((id) => `<tr><td>${esc((modell(id) || {}).name || id)}</td><td class="zahl">${proModell[id].n}</td><td class="zahl">${zahl(proModell[id].t)}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">Noch keine Nutzung.</td></tr>'}
        </tbody></table></div></section>
      </div>`;
  }

  // ---------------------------------------------------------------- Dialoge
  function dialogHTML() {
    const dl = E.dialog; if (!dl) return "";
    const fuss = (ok, cls = "primaer") => `<div class="formzeile" style="justify-content:flex-end;margin:1rem 0 0"><button type="button" class="btn" data-aktion="dialog-zu">Abbrechen</button><button type="submit" class="btn ${cls}">${esc(ok)}</button></div>`;
    let inhalt = "";
    if (dl.art === "frage") inhalt = `<h2 id="dlg-titel">${esc(dl.titel)}</h2><p>${esc(dl.text)}</p>${fuss(dl.ok, dl.gefahr ? "gefahr" : "primaer")}`;
    else if (dl.art === "formular") {
      inhalt = `<h2 id="dlg-titel">${esc(dl.titel)}</h2>${dl.text ? `<p class="small muted">${dl.text}</p>` : ""}` + dl.felder.map((f) => {
        if (f.typ === "select") return `<label class="feld">${esc(f.label)}<select name="${f.name}">${f.optionen.map(([k, t]) => `<option value="${esc(k)}" ${k === f.wert ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
        if (f.typ === "checks") return `<fieldset class="feldgruppe"><legend>${esc(f.label)}</legend>${f.optionen.map(([k, t]) => `<label class="haken"><input type="checkbox" name="${f.name}" value="${esc(k)}" ${f.wert.includes(k) ? "checked" : ""}> ${esc(t)}</label>`).join("")}</fieldset>`;
        if (f.typ === "check") return `<label class="haken"><input type="checkbox" name="${f.name}" ${f.wert ? "checked" : ""}> ${esc(f.label)}</label>`;
        if (f.typ === "textarea") return `<label class="feld">${esc(f.label)}<textarea name="${f.name}" rows="3">${esc(f.wert || "")}</textarea></label>`;
        return `<label class="feld">${esc(f.label)}<input type="text" name="${f.name}" value="${esc(f.wert || "")}" ${f.pflicht ? "required" : ""}></label>`;
      }).join("") + fuss(dl.ok || "Speichern");
    } else if (dl.art === "personendaten") {
      inhalt = `<h2 id="dlg-titel">Mögliche Personendaten erkannt</h2>
        <p>Die Nachricht enthält vermutlich: <strong>${dl.gefunden.map(esc).join(", ")}</strong>.</p>
        <p class="small">Für diese Daten ist mindestens der Schutzbedarf ${schutzBadge(dl.stufe)} nötig. Die Unterhaltung wird dann nur noch an dafür freigegebenen Orten verarbeitet (in der Regel dem internen Server).</p>
        <div class="formzeile" style="justify-content:flex-end;margin:1rem 0 0"><button type="button" class="btn" data-aktion="dialog-zu">Zurück zur Nachricht</button><button type="button" class="btn" data-aktion="pd-trotzdem">Trotzdem senden</button><button type="submit" class="btn primaer">Schutzbedarf erhöhen und senden</button></div>`;
    }
    return `<dialog id="dlg" aria-labelledby="dlg-titel"><form method="dialog" data-form="dialog" class="dlg-form">${inhalt}</form></dialog>`;
  }
  function formWerte(form) {
    const w = {};
    (E.dialog.felder || []).forEach((f) => {
      if (f.typ === "checks") w[f.name] = [...form.querySelectorAll(`[name="${f.name}"]:checked`)].map((x) => x.value);
      else if (f.typ === "check") w[f.name] = form.querySelector(`[name="${f.name}"]`).checked;
      else w[f.name] = (form.querySelector(`[name="${f.name}"]`).value || "").trim();
    });
    return w;
  }
  const frage = (titel, text, ok, gefahr, dann) => { E.dialog = { art: "frage", titel, text, ok, gefahr, dann }; render(); };
  const formular = (titel, felder, dann, ok, text) => { E.dialog = { art: "formular", titel, felder, dann, ok, text }; render(); };
  const SCHUTZ_OPT = D.SCHUTZ.map((s) => [s.id, s.name]);

  // ---------------------------------------------------------------- Aktionen
  const AKTIONEN = {
    thema() { const d = document.documentElement.classList.toggle("dark"); try { localStorage.setItem("eduksx-thema", d ? "dunkel" : "hell"); } catch (e) { /* */ } render(); },
    zuruecksetzen() { frage("Testdaten neu laden?", "Alle Änderungen in diesem Browser gehen verloren.", "Neu laden", true, () => { stoppStill(); S = neuerZustand(); speichern(); location.hash = "#/chat"; }); },
    "dialog-zu"() { E.dialog = null; render(); },
    "chat-neu"() { const c = neuerChat(); location.hash = `#/chat/${c.id}`; },
    "chat-umbenennen"() { const c = aktuellerChat(); formular("Unterhaltung umbenennen", [{ name: "titel", label: "Titel", wert: c.titel, pflicht: true }], (w) => { c.titel = w.titel || c.titel; }); },
    "chat-anheften"() { const c = aktuellerChat(); c.angeheftet = !c.angeheftet; speichern(); render(); },
    "chat-loeschen"() { const c = aktuellerChat(); frage("Unterhaltung löschen?", `«${c.titel}» wird endgültig gelöscht.`, "Löschen", true, () => { S.chats = S.chats.filter((x) => x !== c); location.hash = "#/chat"; }); },
    "chat-ohne-assistent"() { const c = aktuellerChat(); c.assistent = null; speichern(); render(); },
    vorschlag(el) { E.entwurf = el.dataset.text; render(); const t = document.getElementById("frage"); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } },
    "anhang-weg"(el) { E.anhaenge.splice(Number(el.dataset.k), 1); render(); },
    stopp() { stopp(); },
    kopieren(el) { const n = aktuellerChat().nachrichten[Number(el.dataset.i)]; try { navigator.clipboard.writeText(n.text); toast("Antwort kopiert."); } catch (e) { toast("Kopieren nicht möglich."); } },
    nochmal(el) {
      const c = aktuellerChat(); const i = Number(el.dataset.i); if (E.laeuft) return;
      const vorher = c.nachrichten.slice(0, i).reverse().find((n) => n.rolle === "ich"); if (!vorher) return;
      const o = ortFuer(modell(c.modell), c.schutz); if (!o) { toast("Kein zulässiger Betriebsort."); return; }
      c.nachrichten.splice(i, 1); streamen(c, antwortBauen(c, vorher.text), o);
    },
    feedback(el) {
      const n = aktuellerChat().nachrichten[Number(el.dataset.i)]; const w = el.dataset.wert;
      if (n.feedback === w) { n.feedback = null; speichern(); render(); return; }
      n.feedback = w;
      if (w === "schlecht") formular("Was war nicht hilfreich?", [{ name: "grund", label: "Grund", typ: "select", wert: "falsch", optionen: [["falsch", "Inhaltlich falsch"], ["unvollstaendig", "Unvollständig"], ["ton", "Ton oder Stil passt nicht"], ["quelle", "Quellen fehlen oder falsch"], ["anderes", "Anderes"]] }, { name: "text", label: "Bemerkung (freiwillig, ohne Personendaten)", typ: "textarea" }],
        (v) => { n.feedbackGrund = v.grund; S.feedback.push({ zeit: jetzt(), modell: n.modell, grund: v.grund, text: v.text }); toast("Danke für die Rückmeldung."); }, "Senden");
      else { speichern(); render(); toast("Danke für die Rückmeldung."); }
    },
    "pd-trotzdem"() { const dl = E.dialog; E.dialog = null; abschicken(aktuellerChat(), dl.text); },
    "ass-favorit"(el) { const a = ass(el.dataset.id); a.favorit = !a.favorit; speichern(); render(); },
    "ass-chat"(el) { const c = neuerChat(el.dataset.id); location.hash = `#/chat/${c.id}`; },
    "ass-loeschen"(el) { const a = ass(el.dataset.id); frage("Assistent löschen?", `«${a.name}» wird für alle gelöscht, mit denen er geteilt ist. Bestehende Unterhaltungen bleiben erhalten.`, "Löschen", true, () => { S.assistenten = S.assistenten.filter((x) => x !== a); S.chats.forEach((c) => { if (c.assistent === a.id) c.assistent = null; }); location.hash = "#/assistenten"; }); },
    "ass-export"(el) { const a = ass(el.dataset.id); const b = new Blob([JSON.stringify({ format: "eduksx-ai-assistant/1", ...a, id: undefined, besitzer: undefined }, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const x = document.createElement("a"); x.href = u; x.download = `assistent-${a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`; x.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); },
    "ass-import"() {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
      inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then((t) => { try { const j = JSON.parse(t); if (j.format !== "eduksx-ai-assistant/1" || !j.name) throw new Error(); const a = { id: uid("a"), name: String(j.name).slice(0, 60), symbol: String(j.symbol || "★").slice(0, 2), beschreibung: String(j.beschreibung || ""), anweisung: String(j.anweisung || ""), modell: modell(j.modell) ? j.modell : S.einst.standard.intern, wissen: [], web: false, schutz: SCHUTZ_IDX[j.schutz] != null ? j.schutz : "intern", freigabe: { art: "privat", gruppen: [] }, besitzer: D.ICH.id, favorit: false, starter: Array.isArray(j.starter) ? j.starter.map(String).slice(0, 6) : [] }; S.assistenten.push(a); speichern(); location.hash = `#/assistenten/${a.id}`; toast("Assistent übernommen – Wissen und Freigabe bitte prüfen."); } catch (e) { toast("Datei ist kein EduKSX-AI-Assistent."); } }); };
      inp.click();
    },
    "wissen-neu"() { formular("Wissenssammlung anlegen", [{ name: "name", label: "Name", pflicht: true }, { name: "beschreibung", label: "Beschreibung" }, { name: "schutz", label: "Schutzbedarf", typ: "select", wert: "intern", optionen: SCHUTZ_OPT }],
      (w) => { if (!w.name) return; const n = { id: uid("w"), name: w.name, beschreibung: w.beschreibung, schutz: w.schutz, freigabe: { art: "privat", gruppen: [] }, besitzer: D.ICH.id, dateien: [], favorit: false }; S.wissen.push(n); setTimeout(() => { location.hash = `#/wissen/${n.id}`; }); }, "Anlegen"); },
    "wissen-chat"(el) { const w = wissen(el.dataset.id); const c = neuerChat(); c.schutz = SCHUTZ_IDX[w.schutz] > SCHUTZ_IDX[c.schutz] ? w.schutz : c.schutz; c.modell = S.einst.standard[c.schutz]; c.wissen = [w.id]; speichern(); location.hash = `#/chat/${c.id}`; },
    "wissen-loeschen"(el) { const w = wissen(el.dataset.id); frage("Sammlung löschen?", `«${w.name}» und ihr Suchindex werden gelöscht. Assistenten verlieren den Zugriff darauf.`, "Löschen", true, () => { S.wissen = S.wissen.filter((x) => x !== w); S.assistenten.forEach((a) => { a.wissen = a.wissen.filter((x) => x !== w.id); }); S.chats.forEach((c) => { c.wissen = c.wissen.filter((x) => x !== w.id); }); location.hash = "#/wissen"; }); },
    "datei-weg"(el) { const w = wissen(el.dataset.id); const d = w.dateien[Number(el.dataset.k)]; frage("Datei entfernen?", `«${d.name}» wird aus der Sammlung und dem Suchindex entfernt.`, "Entfernen", true, () => { w.dateien.splice(Number(el.dataset.k), 1); }); },
    reiter(el) { E.reiter[el.dataset.gruppe] = el.dataset.wert; render(); },
    "benutzer-sperren"(el) { const b = benutzer(el.dataset.id); b.aktiv = !b.aktiv; speichern(); render(); toast(b.aktiv ? `${b.name} entsperrt.` : `${b.name} gesperrt.`); },
    "benutzer-gruppen"(el) { const b = benutzer(el.dataset.id); formular(`Gruppen von ${b.name}`, [{ name: "gruppen", label: "Gruppen", typ: "checks", wert: b.gruppen, optionen: S.gruppen.map((g) => [g.id, g.name]) }], (w) => { b.gruppen = w.gruppen; }); },
    "benutzer-abgleich"() { toast("Abgleich mit EduKSX-Ident simuliert: keine Änderungen."); },
    "gruppe-neu"() { formular("Gruppe anlegen", [{ name: "name", label: "Name", pflicht: true }, { name: "beschreibung", label: "Beschreibung" }], (w) => { if (w.name) S.gruppen.push({ id: uid("g"), name: w.name, beschreibung: w.beschreibung }); }, "Anlegen"); },
    "gruppe-loeschen"(el) { const g = gruppe(el.dataset.id); frage("Gruppe löschen?", `«${g.name}» wird aus allen Freigaben und bei allen Personen entfernt.`, "Löschen", true, () => { S.gruppen = S.gruppen.filter((x) => x !== g); S.benutzer.forEach((b) => { b.gruppen = b.gruppen.filter((x) => x !== g.id); }); S.assistenten.concat(S.wissen).forEach((a) => { a.freigabe.gruppen = a.freigabe.gruppen.filter((x) => x !== g.id); }); }); },
    "modell-neu"() {
      formular("Modell hinzufügen", [
        { name: "kennung", label: "Kennung (z. B. Hugging-Face-Name)", pflicht: true }, { name: "name", label: "Anzeigename", pflicht: true },
        { name: "herkunft", label: "Herkunft (Organisation · Land)" }, { name: "lizenz", label: "Lizenz" }, { name: "quelle", label: "Link zur Modellkarte" },
        { name: "betrieb", label: "Läuft auf", typ: "checks", wert: [], optionen: S.orte.map((o) => [o.id, o.name]) },
      ], (w) => { if (!w.kennung || !w.name) return; S.modelle.push({ id: uid("m"), name: w.name, kennung: w.kennung, herkunft: w.herkunft || "–", lizenz: w.lizenz || "laut Modellkarte prüfen", groesse: "–", kontext: "–", faehig: ["text"], betrieb: w.betrieb, aktiv: false, quelle: /^https:\/\//.test(w.quelle) ? w.quelle : "", text: "Neu hinzugefügt – vor der Freischaltung testen." }); toast("Modell hinzugefügt – noch nicht freigeschaltet."); }, "Hinzufügen",
      "Neue Modelle sind zuerst ausgeschaltet. Vor der Freischaltung Lizenz, Herkunft und Qualität prüfen.");
    },
    "modell-orte"(el) { const m = modell(el.dataset.id); formular(`Betriebsorte für ${m.name}`, [{ name: "betrieb", label: "Läuft auf", typ: "checks", wert: m.betrieb, optionen: S.orte.map((o) => [o.id, `${o.name} (${{ freigegeben: "freigegeben", pruefung: "in Prüfung", abgelehnt: "abgelehnt" }[o.freigabe]})`]) }], (w) => { m.betrieb = w.betrieb; }); },
    "ort-neu"() {
      formular("Betriebsort hinzufügen", [
        { name: "name", label: "Name", pflicht: true }, { name: "art", label: "Art", typ: "select", wert: "ch-api", optionen: Object.entries(ARTEN) },
        { name: "standort", label: "Standort der Rechenzentren" }, { name: "url", label: "Adresse der Schnittstelle (OpenAI-kompatibel, https://…/v1)" },
        { name: "quelle", label: "Website des Anbieters" }, { name: "zert", label: "Nachweise (Zertifizierungen, Rechtsgrundlage)" },
      ], (w) => { if (!w.name) return; S.orte.push({ id: uid("bo"), name: w.name, art: w.art, standort: w.standort || "–", url: w.url || "–", schnittstelle: "OpenAI-kompatibel", maxSchutz: "oeffentlich", hardware: "–", zert: w.zert || "–", cloudAct: w.art === "extern", avv: "offen", freigabe: "pruefung", geprueft: "", aktiv: false, quelle: /^https:\/\//.test(w.quelle) ? w.quelle : "", zustand: { ok: null } }); toast("Betriebsort erfasst – Status «in Prüfung»."); }, "Hinzufügen",
      "Der Betriebsort ist erst nutzbar, wenn die Datenschutzprüfung abgeschlossen und die Freigabe gesetzt ist.");
    },
    "ort-bearbeiten"(el) {
      const o = ort(el.dataset.id);
      formular(o.name, [
        { name: "freigabe", label: "Freigabe nach Datenschutzprüfung", typ: "select", wert: o.freigabe, optionen: [["pruefung", "In Prüfung"], ["freigegeben", "Freigegeben"], ["abgelehnt", "Abgelehnt"]] },
        { name: "maxSchutz", label: "Zulässig bis Schutzbedarf", typ: "select", wert: o.maxSchutz, optionen: SCHUTZ_OPT },
        { name: "avv", label: "Vertrag zur Auftragsdatenbearbeitung", wert: o.avv }, { name: "url", label: "Adresse der Schnittstelle", wert: o.url },
        { name: "aktiv", label: "Aktiv (Modelle dürfen diesen Ort nutzen)", typ: "check", wert: o.aktiv },
      ], (w) => { Object.assign(o, { freigabe: w.freigabe, maxSchutz: w.maxSchutz, avv: w.avv, url: w.url, aktiv: w.aktiv && w.freigabe === "freigegeben" }); if (w.freigabe === "freigegeben" && !o.geprueft) o.geprueft = jetzt().slice(0, 10); if (w.aktiv && w.freigabe !== "freigegeben") toast("Nur freigegebene Betriebsorte können aktiv sein."); });
    },
    "ort-testen"(el) { const o = ort(el.dataset.id); toast(`Verbindung zu «${o.name}» wird geprüft …`); setTimeout(() => { const ok = o.freigabe !== "abgelehnt"; o.zustand = { ok, ms: ok ? (o.art === "intern" ? 30 + Math.round(Math.random() * 20) : 120 + Math.round(Math.random() * 150)) : null, last: o.art === "intern" || o.art === "ch-gpu" ? 20 + Math.round(Math.random() * 60) : null }; speichern(); render(); toast(ok ? `✓ ${o.name}: Schnittstelle antwortet, ${o.zustand.ms} ms (simuliert).` : `✕ ${o.name}: keine Verbindung.`); }, 700); },
    "werkzeug-neu"() { formular("Anbindung hinzufügen (MCP)", [{ name: "name", label: "Name", pflicht: true }, { name: "url", label: "Adresse des MCP-Servers (https://…)" }, { name: "text", label: "Wozu dient die Anbindung?" }, { name: "maxSchutz", label: "Zulässig bis Schutzbedarf", typ: "select", wert: "oeffentlich", optionen: SCHUTZ_OPT }],
      (w) => { if (w.name) S.werkzeuge.push({ id: uid("t"), name: w.name, art: "mcp", text: w.text || "–", aktiv: false, maxSchutz: w.maxSchutz, url: w.url }); }, "Hinzufügen", "Neue Anbindungen sind ausgeschaltet, bis sie geprüft sind."); },
    "zustand-pruefen"() { S.orte.filter((o) => o.aktiv).forEach((o) => { o.zustand = { ok: true, ms: o.art === "intern" ? 30 + Math.round(Math.random() * 20) : 60 + Math.round(Math.random() * 200), last: o.art === "intern" || o.art === "ch-gpu" ? 20 + Math.round(Math.random() * 70) : null }; }); S.pruefung = jetzt(); speichern(); render(); toast("Prüfung abgeschlossen (simuliert)."); },
  };
  const AENDERUNGEN = {
    "chat-modell"(el) { aktuellerChat().modell = el.value; speichern(); render(); },
    "chat-schutz"(el) {
      const c = aktuellerChat(); c.schutz = el.value;
      if (!ortFuer(modell(c.modell), c.schutz)) { const alt = modell(c.modell); c.modell = S.einst.standard[c.schutz]; toast(`${alt ? alt.name : "Modell"} ist für «${schutz(c.schutz).name}» nicht zulässig – gewechselt auf ${(modell(c.modell) || {}).name}.`); }
      c.wissen = c.wissen.filter((w) => SCHUTZ_IDX[(wissen(w) || {}).schutz] <= SCHUTZ_IDX[c.schutz]);
      speichern(); render();
    },
    "chat-wissen"(el) { const c = aktuellerChat(); c.wissen = el.checked ? [...new Set(c.wissen.concat(el.value))] : c.wissen.filter((x) => x !== el.value); speichern(); render(); const d = document.querySelector(".aufklapp"); if (d) d.open = true; },
    anhang(el) { [...el.files].forEach((f) => E.anhaenge.push({ name: f.name, groesse: f.size })); E.entwurf = (document.getElementById("frage") || {}).value || E.entwurf; render(); },
    web(el) { E.web = el.checked; },
    "ass-filter"(el) { E.assFilter = el.value; render(); },
    "wissen-dateien"(el) {
      const w = wissen(el.dataset.id); const neu = [...el.files].map((f) => ({ name: f.name, groesse: f.size, status: /\.(pdf|docx?|xlsx?|txt|md|csv|pptx?)$/i.test(f.name) ? "wird indexiert" : "ohne Text", teile: 0 }));
      w.dateien.push(...neu); speichern(); render();
      setTimeout(() => { neu.forEach((d) => { if (d.status === "wird indexiert") { d.status = "indexiert"; d.teile = Math.max(1, Math.round(d.groesse / 9000)); } }); speichern(); render(); toast("Indexierung abgeschlossen (simuliert)."); }, 2200);
    },
    "benutzer-rolle"(el) { benutzer(el.dataset.id).rolle = el.value; speichern(); toast("Rolle geändert."); },
    recht(el) { const r = rolle(el.dataset.rolle); r.rechte = el.checked ? [...new Set(r.rechte.concat(el.value))] : r.rechte.filter((x) => x !== el.value); speichern(); },
    "modell-aktiv"(el) {
      const m = modell(el.dataset.id);
      if (el.checked && !m.betrieb.some((id) => { const o = ort(id); return o && o.aktiv && o.freigabe === "freigegeben"; })) { el.checked = false; toast("Zuerst einen freigegebenen, aktiven Betriebsort zuordnen."); return; }
      if (!el.checked && Object.values(S.einst.standard).includes(m.id)) { el.checked = true; toast("Dieses Modell ist ein Standardmodell – zuerst ein anderes Standardmodell wählen."); return; }
      m.aktiv = el.checked; speichern(); render();
    },
    "standard-modell"(el) { S.einst.standard[el.dataset.schutz] = el.value; speichern(); toast("Standardmodell gespeichert."); },
    "werkzeug-aktiv"(el) { const w = S.werkzeuge.find((x) => x.id === el.dataset.id); w.aktiv = el.checked; speichern(); render(); },
  };
  const FORMULARE = {
    senden(form) { const t = form.querySelector("#frage"); senden(t.value); },
    dialog(form) {
      const dl = E.dialog;
      if (dl.art === "personendaten") { const c = aktuellerChat(); c.schutz = dl.stufe; if (!ortFuer(modell(c.modell), c.schutz)) c.modell = S.einst.standard[c.schutz]; E.dialog = null; abschicken(c, dl.text); return; }
      const w = dl.art === "formular" ? formWerte(form) : null;
      E.dialog = null; if (dl.dann) dl.dann(w); speichern(); render();
    },
    assistent(form) {
      const f = new FormData(form); const id = form.dataset.id; const neu = !id;
      const a = neu ? { id: uid("a"), besitzer: D.ICH.id, favorit: false, web: false } : ass(id);
      Object.assign(a, { name: String(f.get("name")).trim() || "Ohne Namen", symbol: String(f.get("symbol")).trim() || "★", beschreibung: String(f.get("beschreibung")).trim(), anweisung: String(f.get("anweisung")), schutz: f.get("schutz"), modell: f.get("modell"), wissen: f.getAll("wissen"), starter: String(f.get("starter")).split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6), freigabe: freigabeLesen(form, "ass") });
      if (!ortFuer(modell(a.modell), a.schutz)) toast(`Hinweis: ${(modell(a.modell) || {}).name} ist für «${schutz(a.schutz).name}» nicht zulässig – im Chat wird das Standardmodell verwendet.`);
      if (neu) S.assistenten.push(a);
      speichern(); location.hash = "#/assistenten"; toast("Assistent gespeichert.");
    },
    wissen(form) { const w = wissen(form.dataset.id); const f = new FormData(form); Object.assign(w, { name: String(f.get("name")).trim() || w.name, beschreibung: String(f.get("beschreibung")).trim(), schutz: f.get("schutz"), freigabe: freigabeLesen(form, "w") }); speichern(); render(); toast("Sammlung gespeichert."); },
    org(form) { const f = new FormData(form); ["name", "adresse", "telefon", "mail", "web", "hinweis"].forEach((k) => { S.org[k] = String(f.get(k)).trim(); }); speichern(); toast("Organisationsangaben gespeichert."); },
    datenschutz(form) { const f = new FormData(form); const t = Math.min(365, Math.max(1, Number(f.get("aufbewahrung")) || 90)); Object.assign(S.einst, { aufbewahrung: t, protokoll: f.get("protokoll"), standardSchutz: f.get("standardSchutz"), warnung: !!f.get("warnung"), chatHinweis: !!f.get("chatHinweis") }); speichern(); render(); toast("Datenschutzregeln gespeichert."); },
  };

  // ---------------------------------------------------------------- Ablauf
  function route() { const h = (location.hash || "#/chat").slice(2).split("/"); return [h[0] || "chat", h[1], h[2]]; }
  const aktuellerChat = () => chat(route()[1]) || S.chats[0];
  function stoppStill() { if (E.laeuft) { clearInterval(E.laeuft.timer); E.laeuft = null; } }
  function render() {
    const [s, a] = route();
    let aktiv = s, inhalt, breit = false;
    switch (s) {
      case "assistenten": inhalt = a ? seiteAssistent(a) : seiteAssistenten(); break;
      case "wissen": inhalt = a ? seiteWissenDetail(a) : seiteWissen(); break;
      case "verwaltung": {
        aktiv = `verwaltung/${a || "organisation"}`;
        inhalt = ({ organisation: seiteOrganisation, benutzer: seiteBenutzer, rollen: seiteRollen, modelle: seiteModelle, orte: seiteOrte, werkzeuge: seiteWerkzeuge, datenschutz: seiteDatenschutz, zustand: seiteZustand }[a] || seiteOrganisation)();
        break;
      }
      default: aktiv = "chat"; breit = true; inhalt = seiteChat(a);
    }
    const fokus = document.activeElement && document.activeElement.id;
    let auswahl = null; try { auswahl = fokus ? document.activeElement.selectionStart : null; } catch (e) { auswahl = null; }
    document.getElementById("app").innerHTML = rahmen(aktiv, inhalt, breit);
    document.title = "EduKSX-AI (Prototyp)";
    const dlg = document.getElementById("dlg");
    if (dlg) { dlg.showModal(); dlg.addEventListener("cancel", (e) => { e.preventDefault(); E.dialog = null; render(); }); const f = dlg.querySelector("input:not([type=checkbox]):not([type=radio]), textarea, select, button[type=submit]"); if (f) f.focus(); }
    else if (fokus) { const f = document.getElementById(fokus); if (f) { f.focus(); if (auswahl != null) { try { f.setSelectionRange(auswahl, auswahl); } catch (e) { /* */ } } } }
    if (s === "chat") nachUnten();
  }

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-aktion]"); if (!el) return;
    const f = AKTIONEN[el.dataset.aktion]; if (!f) return;
    ev.preventDefault(); f(el);
  });
  document.addEventListener("change", (ev) => { const el = ev.target.closest("[data-change]"); if (el && AENDERUNGEN[el.dataset.change]) AENDERUNGEN[el.dataset.change](el); });
  document.addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.id === "frage") { E.entwurf = el.value; return; }
    if (el.dataset.eingabe === "suche") { E.suche = el.value; render(); }
    else if (el.dataset.eingabe === "ass-suche") { E.assSuche = el.value; render(); }
    if (el.dataset.zaehlen) { const z = document.getElementById(el.dataset.zaehlen); if (z) z.textContent = el.value.length; }
  });
  document.addEventListener("submit", (ev) => { const form = ev.target.closest("[data-form]"); if (!form || !FORMULARE[form.dataset.form]) return; ev.preventDefault(); FORMULARE[form.dataset.form](form); });
  document.addEventListener("keydown", (ev) => {
    if (ev.target.id === "frage" && ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); senden(ev.target.value); }
  });
  window.addEventListener("hashchange", () => { E.dialog = null; E.anhaenge = []; E.entwurf = ""; render(); const m = document.getElementById("inhalt"); if (m && !location.hash.startsWith("#/chat")) m.focus(); });
  try { if (localStorage.getItem("eduksx-thema") === "dunkel") document.documentElement.classList.add("dark"); } catch (e) { /* */ }
  render();
})();
