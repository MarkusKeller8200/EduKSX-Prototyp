/*
 * EduKSX-Sign – Klickprototyp: persönliche Ablage und elektronische Signatur
 *
 * Alles läuft im Browser. Signaturen, PDF/A-Umwandlung, Siegel und der Abgleich mit der Cloud-Ablage sind simuliert.
 * Zustand im Browser gesichert (localStorage); hochgeladene Originale nur für die laufende Sitzung (Object-URL).
 * Nur erfundene Testdaten.
 */
(function () {
  "use strict";

  const D = window.SIGN_DATEN;
  const VERSION = "0.1.3";
  const EINSTIEG = "https://markuskeller8200.github.io/EduKSX-Prototyp/"; // Einstiegsseite aller Prototypen
  const SPEICHER = "eduksx-sign-v1";

  // ---------------------------------------------------------------- Hilfen
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const klon = (o) => JSON.parse(JSON.stringify(o));
  let zaehler = Date.now() % 100000;
  const uid = (p) => `${p}-${(zaehler++).toString(36)}`;
  const zwei = (n) => String(n).padStart(2, "0");
  function jetzt() { const d = new Date(); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}T${zwei(d.getHours())}:${zwei(d.getMinutes())}`; }
  function heute() { return jetzt().slice(0, 10); }
  function plusTage(iso, n) { const d = new Date(iso.slice(0, 10) + "T12:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`; }
  function datum(iso) { if (!iso) return ""; const [j, m, t] = iso.slice(0, 10).split("-"); return `${t}.${m}.${j}`; }
  function datumZeit(iso) { return iso ? `${datum(iso)} ${iso.slice(11, 16)}` : ""; }
  function groesse(b) { if (b == null) return "–"; if (b < 1024) return b + " B"; if (b < 1048576) return Math.round(b / 1024) + " KB"; return (b / 1048576).toFixed(1).replace(".", ",") + " MB"; }
  const basis = (name) => name.replace(/\.[^.]+$/, "");
  const endung = (name) => (name.match(/\.([^.]+)$/) || ["", ""])[1].toLowerCase();
  function sauber(html) {
    // Nur einfache Auszeichnungen aus der Bearbeitung übernehmen, alle Attribute entfernen
    return String(html || "").replace(/<(\/?)([a-z0-9]+)[^>]*>/gi, (m, s, t) => (["b", "i", "u", "strong", "em", "br"].includes(t.toLowerCase()) ? `<${s}${t.toLowerCase()}>` : ""));
  }
  const textAus = (html) => { const d = document.createElement("div"); d.innerHTML = sauber(html); return d.textContent || ""; };
  function pruefsumme(obj) {
    // Prüfsumme für die Anzeige im Prototyp (FNV-1a, 8 × 32 Bit) – im Modul SHA-256 des PDF
    const s = JSON.stringify(obj);
    let out = "";
    for (let k = 0; k < 8; k++) {
      let h = 0x811c9dc5 ^ (k * 0x9e3779b1);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
      out += (h >>> 0).toString(16).padStart(8, "0");
    }
    return out;
  }

  const TYPEN = {
    pdf: { kurz: "PDF", name: "PDF-Dokument", endungen: ["pdf"] },
    docx: { kurz: "DOCX", name: "Word-Dokument", endungen: ["docx", "doc", "rtf", "dotx"] },
    xlsx: { kurz: "XLSX", name: "Excel-Tabelle", endungen: ["xlsx", "xls", "xlsm", "csv"] },
    bild: { kurz: "BILD", name: "Bild", endungen: ["png", "jpg", "jpeg", "gif", "webp", "svg"] },
    text: { kurz: "TXT", name: "Textdatei", endungen: ["txt", "md"] },
    andere: { kurz: "DATEI", name: "Andere Datei", endungen: [] },
  };
  function typVon(name) { const e = endung(name); return Object.keys(TYPEN).find((k) => TYPEN[k].endungen.includes(e)) || "andere"; }
  const signierbar = (d) => d.typ !== "andere";
  const gesperrt = (d) => ["signiert", "versiegelt"].includes(d.status) || !!inSignatur(d);
  const typBadge = (t) => `<span class="typ ${t}" title="${esc(TYPEN[t].name)}">${TYPEN[t].kurz}</span>`;

  const STUFEN = {
    ses: { kurz: "SES", name: "Einfache elektronische Signatur", text: "Bestätigung per Klick und E-Mail. Für interne Bestätigungen und Visa ohne Formvorschrift." },
    aes: { kurz: "FES", name: "Fortgeschrittene elektronische Signatur", text: "Eindeutig der Person zugeordnet, Bestätigung mit Code aufs Mobiltelefon. Für Verträge ohne gesetzliche Formvorschrift." },
    qes: { kurz: "QES", name: "Qualifizierte elektronische Signatur", text: "Der eigenhändigen Unterschrift gleichgestellt (Schriftform). Einmalige Identifikation der Person nötig." },
  };
  const RECHTSRAUM = { zertes: "Schweiz (ZertES)", eidas: "EU (eIDAS)" };
  const ROLLEN = { unterschreiben: "Unterschreiben", genehmigen: "Genehmigen", kopie: "Kopie erhalten" };

  // ---------------------------------------------------------------- Zustand
  function neuerZustand() {
    const dok = klon(D.DOKUMENTE).map((d) => Object.assign({ version: 1, sync: "ok", status: null, elemente: [], signaturen: [], siegel: null }, d));
    return {
      ordner: klon(D.ORDNER),
      dokumente: dok,
      eingang: klon(D.EINGANG),
      prozesse: [],
      unterschrift: null,
      einst: { stufe: "aes", rechtsraum: "zertes" },
      sync: { aktiv: true, ziel: "Cloud-Ablage › Dokumente › EduKSX-Sign", richtung: "beide", intervall: "5", konflikt: "beide", letzte: jetzt(), protokoll: [{ zeit: jetzt(), text: "Erster Abgleich: 8 Ordner, 7 Dateien" }], offen: [], cloudNr: 0 },
    };
  }
  function laden() { try { const r = localStorage.getItem(SPEICHER); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  let S = laden() || neuerZustand();
  function speichern() {
    try { localStorage.setItem(SPEICHER, JSON.stringify(S)); }
    catch (e) { toast("Browser-Speicher voll – Änderungen gelten nur bis zum Neuladen (grosse Bilder?)."); }
  }
  const DATEIEN = new Map(); // hochgeladene Originale (nur diese Sitzung)
  const E = { werkzeug: "auswahl", auswahl: null, dialog: null, aktivPerson: 0, wordGeaendert: false, bearbeitet: {}, ziehen: null };

  const dok = (id) => S.dokumente.find((d) => d.id === id);
  const prozess = (id) => S.prozesse.find((p) => p.id === id);
  const ordnerVon = (id) => S.ordner.find((o) => o.id === id);
  const kinder = (id) => S.ordner.filter((o) => o.eltern === (id || null)).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const dokumenteIn = (id) => S.dokumente.filter((d) => (d.ordner || null) === (id || null)).sort((a, b) => a.name.localeCompare(b.name, "de"));
  function pfad(id) { const p = []; let o = ordnerVon(id); while (o) { p.unshift(o); o = ordnerVon(o.eltern); } return p; }
  const pfadText = (id) => ["Meine Ablage"].concat(pfad(id).map((o) => o.name)).join(" / ");
  function unterordnerAlle(id) { const r = []; kinder(id).forEach((k) => { r.push(k.id); r.push(...unterordnerAlle(k.id)); }); return r; }
  const anzahlIn = (id) => { const ids = [id].concat(unterordnerAlle(id)); return S.dokumente.filter((d) => ids.includes(d.ordner)).length; };
  const inSignatur = (d) => S.prozesse.find((p) => p.dokId === d.id && p.status === "laufend");
  const person = (pid) => (pid === "ich" ? D.ICH : D.PERSONEN.find((p) => p.id === pid));
  function freierName(name, ordner) {
    if (!S.dokumente.some((d) => d.name === name && (d.ordner || null) === (ordner || null))) return name;
    const b = basis(name), e = endung(name);
    for (let i = 2; ; i++) { const n = `${b} (${i})${e ? "." + e : ""}`; if (!S.dokumente.some((d) => d.name === n && (d.ordner || null) === (ordner || null))) return n; }
  }
  function geaendert(d, text) {
    d.geaendert = jetzt();
    if (!E.bearbeitet[d.id]) { d.version = (d.version || 1) + 1; E.bearbeitet[d.id] = true; }
    if (d.sync !== "konflikt") d.sync = "ausstehend";
    if (text) syncNotiz(text);
    speichern();
    if (S.sync.aktiv && S.sync.intervall === "sofort") setTimeout(() => { syncJetzt(true); }, 900);
  }
  function syncNotiz(text) { S.sync.offen.push(text); }

  // ---------------------------------------------------------------- Darstellung: Bausteine
  function wordmark(zusatz) {
    const name = "EduKSX" + (zusatz ? "-" + zusatz : "");
    return `<span class="wm" role="img" aria-label="${esc(name)}"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span><span class="o">K</span><span class="b">SX</span>${zusatz ? `<span class="n">-${esc(zusatz)}</span>` : ""}</span></span>`;
  }
  const WM_DEV = `<span class="wm" role="img" aria-label="MarKusSXCH"><span aria-hidden="true"><span class="v">M</span><span class="n">ar</span><span class="o">K</span><span class="n">us</span><span class="b">SXCH</span></span></span>`;
  // Icon EduKSX-Sign (vorläufig, nicht im freigegebenen Icon-Set): Füllfeder über Unterschriftslinie
  const ICON_SIGN = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5l6 6-8.2 8.2-4.6 1.4 1.4-4.6z" stroke="var(--brand-neutral)"/><path d="M12.5 5.5l6 6" stroke="var(--brand-neutral)"/><path d="M3 20.5c1.2-1.6 2.2-1.6 3 0s1.8 1.6 3 0" stroke="var(--brand-violet)"/></g><circle cx="9.6" cy="14.4" r="1.1" fill="var(--brand-orange)"/><circle cx="20" cy="20.5" r="1" fill="var(--brand-blue)"/></svg>`;
  const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    uebersicht: ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    ablage: ico('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    eingang: ico('<path d="M4 13h4l1.5 2.5h5L16 13h4"/><path d="M4 13l2-7h12l2 7v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M12 3v6M9.5 6.5 12 9l2.5-2.5"/>'),
    prozesse: ico('<path d="M14.5 3.5l6 6-8.2 8.2-4.6 1.4 1.4-4.6z"/><path d="M3 20.5h9"/>'),
    sync: ico('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>'),
    profil: ico('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>'),
    einbindung: ico('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M10 6.5h4a3 3 0 0 1 3 3V14"/><path d="M14.5 11.5 17 14l2.5-2.5"/>'),
    ordner: ico('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    ordnerOffen: ico('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v1"/><path d="M3 19l2.5-8h16L19 19z"/>'),
  };
  const NAVI = [
    ["uebersicht", "Übersicht"],
    ["ablage", "Meine Ablage"],
    ["gruppe", "Signieren"],
    ["eingang", "Zu unterschreiben"],
    ["prozesse", "Signaturprozesse"],
    ["gruppe", "Einstellungen"],
    ["sync", "Synchronisation"],
    ["profil", "Meine Unterschrift"],
    ["einbindung", "Einbindung"],
  ];

  function statusBadge(d) {
    const p = inSignatur(d);
    if (p) return `<span class="badge info">✍ in Signatur</span>`;
    if (d.status === "signiert") return `<span class="badge erfolg">✓ signiert</span>${d.siegel ? ' <span class="badge violett">🔏 versiegelt</span>' : ""}`;
    if (d.status === "versiegelt") return `<span class="badge violett">🔏 versiegelt</span>`;
    return "";
  }
  function syncBadge(d) {
    if (!S.sync.aktiv) return `<span class="sync">– nicht abgeglichen</span>`;
    if (d.sync === "konflikt") return `<span class="sync konflikt" title="In der Cloud-Ablage und hier geändert">⚠ Konflikt</span>`;
    if (d.sync === "ausstehend") return `<span class="sync ausstehend" title="Wird beim nächsten Abgleich übertragen">↻ ausstehend</span>`;
    return `<span class="sync ok" title="Mit der Cloud-Ablage abgeglichen">✓ abgeglichen</span>`;
  }
  const offeneEingang = () => S.eingang.filter((e) => e.status === "offen");
  const meineZuge = () => S.prozesse.filter((p) => p.status === "laufend" && aktivePersonen(p).some((x) => x.id === "ich"));
  function toast(text) {
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = text;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3800);
  }

  // ---------------------------------------------------------------- Seitenmodell (vereinfachtes PDF)
  function blockHTML(b, ctx) {
    switch (b.t) {
      case "h1": case "h2": case "p": case "klein": return `<div class="b-${b.t}">${esc(b.x)}</div>`;
      case "html": return `<div class="b-${b.stil === "p" ? "p" : b.stil}">${sauber(b.html)}</div>`;
      case "pre": return `<pre>${esc(b.x)}</pre>`;
      case "abstand": return `<div class="b-abstand"></div>`;
      case "linie": return `<div class="b-linie">${esc(b.x)}</div>`;
      case "bild": return b.src ? `<img class="b-bild" src="${esc(b.src)}" alt="">` : "";
      case "tabelle": return `<table><thead><tr>${b.kopf.map((k) => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${b.zeilen.map((z, zi) => `<tr${b.summe && zi === b.zeilen.length - 1 ? ' style="font-weight:700"' : ""}>${z.map((c) => `<td${/^[-+]?[\d'.,:]+$/.test(c) ? ' class="zahl"' : ""}>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      case "feld": {
        const id = `f-${ctx.dokId}-${b.id}`;
        if (ctx.formular) {
          if (b.typ === "check") return `<div class="b-feld"><label for="${id}">${esc(b.label)}</label><span><input type="checkbox" id="${id}" data-formfeld="${esc(b.id)}" ${b.wert ? "checked" : ""}></span></div>`;
          return `<div class="b-feld"><label for="${id}">${esc(b.label)}</label><input type="${b.typ === "datum" ? "date" : "text"}" id="${id}" data-formfeld="${esc(b.id)}" value="${esc(b.wert)}"></div>`;
        }
        const w = b.typ === "check" ? (b.wert ? "☒ ja" : "☐ nein") : b.typ === "datum" ? datum(b.wert) : b.wert;
        return `<div class="b-feld"><label>${esc(b.label)}</label><span class="wert">${esc(w)}</span></div>`;
      }
      default: return "";
    }
  }
  function elementHTML(el, ctx) {
    const pos = `left:${el.x}%;top:${el.y}%;${el.w ? `width:${el.w}%;height:${el.h}%;` : ""}`;
    const beweg = ctx.bearbeitbar && el.art !== "sig" && el.art !== "siegel" && el.art !== "fix";
    const cls = `el ${beweg ? "beweglich" : ""} ${E.auswahl === el.id ? "ausgewaehlt" : ""}`;
    const weg = beweg ? `<button class="weg" data-aktion="el-weg" data-el="${el.id}" aria-label="Element entfernen" title="Entfernen">✕</button>` : "";
    switch (el.art) {
      case "text": case "datum": case "fix":
        return `<div class="${cls} el-${el.art === "datum" ? "datum" : "text"}" style="${pos}" data-el="${el.id}">${ctx.bearbeitbar && el.art !== "fix" ? `<span contenteditable="true" data-eltext="${el.id}" spellcheck="false">${esc(el.text)}</span>` : esc(el.text)}${weg}</div>`;
      case "kommentar":
        return `<div class="${cls} el-kommentar" style="${pos}" data-el="${el.id}" title="${esc(el.text || "Kommentar")}" role="note" aria-label="Kommentar ${el.nr}: ${esc(el.text)}">${el.nr}${weg}</div>`;
      case "feld": {
        if (el.sig) return `<div class="el el-sig" style="${pos}"><img src="${esc(el.sig.img)}" alt="Unterschrift ${esc(el.sig.name)}"><div class="unter">${esc(el.sig.name)} · ${esc(datumZeit(el.sig.zeit))} · ${esc(STUFEN[el.sig.stufe] ? STUFEN[el.sig.stufe].kurz : "")}</div></div>`;
        const idx = ctx.personen ? ctx.personen.findIndex((p) => p.id === el.person) : 0;
        const p = ctx.personen && ctx.personen[idx];
        const mein = ctx.meinFeld && el.person === "ich";
        return `<div class="${cls} el-feld p${Math.max(0, idx) % 5} ${mein ? "mein" : ""}" style="${pos}" data-el="${el.id}" ${mein ? `data-aktion="${ctx.meinFeld}" tabindex="0" role="button" aria-label="Hier unterschreiben"` : ""}>✍ ${mein ? "Hier unterschreiben" : "Unterschrift"}${p ? `<span class="wer">${idx + 1} · ${esc(p.name)}</span>` : '<span class="wer">noch nicht zugeordnet</span>'}${weg}</div>`;
      }
      case "sig":
        return `<div class="el el-sig" style="${pos}"><img src="${esc(el.img)}" alt="Unterschrift ${esc(el.name)}"><div class="unter">${esc(el.name)} · ${esc(datumZeit(el.zeit))} · ${esc(el.stufe)}</div></div>`;
      case "siegel":
        return `<div class="el el-siegel" style="${pos}" role="img" aria-label="Elektronisches Siegel ${esc(el.org)}"><span>🔏<br>${esc(el.org)}<br>elektronisch versiegelt<br>${esc(datum(el.zeit))}</span></div>`;
      default: return "";
    }
  }
  function seitenHTML(seiten, elemente, ctx) {
    return seiten.map((s, i) => {
      const els = (elemente || []).filter((e) => (e.seite || 0) === i).map((e) => elementHTML(e, ctx)).join("");
      const ph = ctx.platzhalterZeigen ? (s.platzhalter || []).map((p) => `<span class="platzhalter" style="left:${p.x}%;top:${p.y + 6}%">${esc(p.text)}</span>`).join("") : "";
      const leer = s.leer ? `<div class="leer-hinweis">${esc(s.leer)}</div>` : "";
      return `<div class="seitennr">Seite ${i + 1} von ${seiten.length}</div>
        <div class="seite ${ctx.platzieren ? "werkzeug-aktiv" : ""}" data-seite="${i}" ${ctx.quelle ? `data-quelle="${ctx.quelle}"` : ""} ${ctx.platzieren ? 'data-platzieren="1"' : ""}>
          <div class="fluss">${(s.bloecke || []).map((b) => blockHTML(b, ctx)).join("")}</div>${ph}${leer}${els}
        </div>`;
    }).join("");
  }

  // Umwandlung in PDF/A (simuliert): Inhalt wird zu festen Seiten, Formularwerte und Anmerkungen werden übernommen
  function zuPdfSeiten(d) {
    const umbruch = (bloecke, gewicht, max) => {
      const seiten = [{ bloecke: [] }]; let g = 0;
      bloecke.forEach((b) => { const w = gewicht(b); if (g + w > max && seiten[seiten.length - 1].bloecke.length) { seiten.push({ bloecke: [] }); g = 0; } seiten[seiten.length - 1].bloecke.push(b); g += w; });
      return seiten;
    };
    if (d.typ === "pdf") return klon(d.inhalt.seiten);
    if (d.typ === "docx") {
      const bl = d.inhalt.absaetze.map((a) => ({ t: "html", stil: a.stil, html: a.html }));
      return umbruch(bl, (b) => (b.stil === "h1" ? 3 : b.stil === "h2" ? 2.2 : Math.ceil(textAus(b.html).length / 85) + 1), 36);
    }
    if (d.typ === "xlsx") {
      const z = d.inhalt.zellen; const zeilen = klon(z.slice(1));
      const sp = d.inhalt.summeSpalte;
      let summe = false;
      if (sp != null) { const t = zeilen.reduce((a, r) => a + (parseFloat(String(r[sp]).replace(/'/g, "")) || 0), 0); const r = z[0].map(() => ""); r[0] = "Total"; r[sp] = t.toFixed(2); zeilen.push(r); summe = true; }
      return [{ bloecke: [{ t: "klein", x: d.name }, { t: "h1", x: d.inhalt.titel || basis(d.name) }, { t: "tabelle", kopf: z[0], zeilen, summe }] }];
    }
    if (d.typ === "bild") return [{ bloecke: [{ t: "klein", x: d.name }, { t: "bild", src: d.inhalt.src }], leer: d.inhalt.src ? null : "Bild wird im Prototyp nicht dargestellt (Datei zu gross oder nicht gelesen)." }];
    if (d.typ === "text") {
      const bl = String(d.inhalt.text || "").split(/\n\s*\n/).map((x) => ({ t: "pre", x }));
      return umbruch(bl, (b) => b.x.split("\n").length + Math.ceil(b.x.length / 90), 38);
    }
    return [{ bloecke: [], leer: "Dieses Format kann nicht umgewandelt werden." }];
  }
  function schriftzug(name) {
    const c = document.createElement("canvas"); c.width = 600; c.height = 200;
    const g = c.getContext("2d");
    g.fillStyle = "#08415f"; g.font = "italic 64px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";
    g.textBaseline = "middle"; g.fillText(name, 20, 105, 560);
    return c.toDataURL("image/png");
  }

  // ---------------------------------------------------------------- Rahmen
  function rahmen(seite, inhalt) {
    const zu = offeneEingang().length + meineZuge().length;
    const navi = NAVI.map((n) => {
      if (n[0] === "gruppe") return `<li class="gruppe" aria-hidden="true">${esc(n[1])}</li>`;
      const aktiv = seite === n[0] || ({ dok: "ablage", prozess: "prozesse", eingangDok: "eingang" }[seite] === n[0]);
      const zahl = n[0] === "eingang" && zu ? ` <span class="zaehler" aria-label="${zu} offen">${zu}</span>` : "";
      return `<li><a href="#/${n[0]}" ${aktiv ? 'aria-current="page"' : ""}>${ICONS[n[0]]}<span>${esc(n[1])}</span>${zahl}</a></li>`;
    }).join("");
    const dunkel = document.documentElement.classList.contains("dark");
    return `
      <header class="kopf">
        <a class="marke" href="#/uebersicht">${ICON_SIGN}${wordmark("Sign")}</a>
        <span class="muted small">Signatur / Persönliche Ablage</span>
        <a class="btn zurueck" href="${EINSTIEG}" title="Zurück zur Einstiegsseite aller EduKSX-Prototypen" aria-label="Zurück zur Einstiegsseite aller EduKSX-Prototypen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>
        <div class="werkzeuge">
          <span class="badge neutral" title="Angemeldet (erfunden)">👤 ${esc(D.ICH.name)} · ${esc(D.ICH.funktion)}</span>
          <button class="btn" data-aktion="thema" aria-pressed="${dunkel}" title="Hell/Dunkel">${dunkel ? "☀ Hell" : "☾ Dunkel"}</button>
          <button class="btn" data-aktion="zuruecksetzen" title="Testdaten neu laden">↺ Testdaten</button>
        </div>
      </header>
      <div class="hinweis-band" role="note"><strong>Prototyp</strong> – Personen und Dokumente sind erfunden. Signaturen, PDF/A-Umwandlung, Siegel und der Abgleich mit der Cloud-Ablage werden nur simuliert.</div>
      <div class="rahmen">
        <nav class="navi" aria-label="Hauptnavigation"><ul><li class="gruppe" aria-hidden="true">EduKSX-Prototypen</li><li><a class="einstieg" href="${EINSTIEG}" title="Zur Einstiegsseite aller EduKSX-Prototypen">${ico('<path d="M15 18l-6-6 6-6"/>')}<span>Alle Prototypen</span></a></li><li class="trenner" aria-hidden="true"></li>${navi}</ul></nav>
        <main id="inhalt" tabindex="-1">${inhalt}</main>
      </div>
      <footer class="fuss"><span>${wordmark("Sign")} · Prototyp ${VERSION} · in Entwicklung · <a href="${EINSTIEG}">Alle Prototypen</a></span><span>Developed by ${WM_DEV}</span></footer>
      ${dialogHTML()}`;
  }

  // ---------------------------------------------------------------- Übersicht
  function seiteUebersicht() {
    const offen = offeneEingang(); const meine = meineZuge();
    const laufend = S.prozesse.filter((p) => p.status === "laufend");
    const ausstehend = S.dokumente.filter((d) => d.sync !== "ok").length;
    const zuletzt = S.dokumente.slice().sort((a, b) => b.geaendert.localeCompare(a.geaendert)).slice(0, 6);
    const zuListe = offen.map((e) => `<li><a href="#/eingang/${e.id}"><strong>${esc(e.titel)}</strong></a><div class="small muted">aus ${wordmark(e.quelle.replace("EduKSX-", ""))} · von ${esc(person(e.von).name)} · Frist ${datum(e.frist)} ${e.frist < heute() ? '<span class="badge fehler">⚠ überfällig</span>' : ""}</div></li>`)
      .concat(meine.map((p) => `<li><a href="#/prozess/${p.id}"><strong>${esc(p.titel)}</strong></a><div class="small muted">eigener Signaturprozess – Sie sind an der Reihe</div></li>`)).join("");
    return `
      <div class="seitenkopf"><div><h1>Übersicht</h1><p class="muted">Ihr persönlicher Bereich: Dokumente ablegen, ausfüllen und bearbeiten, Unterschriften einholen und Signaturanfragen aus den anderen Modulen erledigen.</p></div>
        <div class="aktionen"><a class="btn primaer" href="#/ablage">${ICONS.ablage.replace("<svg", '<svg width="16" height="16"')} Meine Ablage</a></div></div>
      <div class="karten">
        <a class="karte" href="#/eingang" style="text-decoration:none;color:inherit"><div class="titel">Zu unterschreiben</div><div class="zahl">${offen.length + meine.length}</div><div class="small muted">${offen.filter((e) => e.frist < heute()).length} überfällig</div></a>
        <a class="karte" href="#/prozesse" style="text-decoration:none;color:inherit"><div class="titel">Laufende Signaturprozesse</div><div class="zahl">${laufend.length}</div><div class="small muted">${S.prozesse.filter((p) => p.status === "abgeschlossen").length} abgeschlossen</div></a>
        <a class="karte" href="#/ablage" style="text-decoration:none;color:inherit"><div class="titel">Dokumente in der Ablage</div><div class="zahl">${S.dokumente.length}</div><div class="small muted">in ${S.ordner.length} Ordnern</div></a>
        <a class="karte" href="#/sync" style="text-decoration:none;color:inherit"><div class="titel">Cloud-Ablage</div><div class="zahl">${ausstehend ? "↻ " + ausstehend : "✓"}</div><div class="small muted">${ausstehend ? "Änderungen ausstehend" : "abgeglichen"} · zuletzt ${datumZeit(S.sync.letzte)}</div></a>
      </div>
      <div class="spalten">
        <section class="karte"><h2>Zu unterschreiben</h2>${zuListe ? `<ul class="infoliste">${zuListe}</ul>` : '<p class="muted">Nichts offen. ✓</p>'}</section>
        <section class="karte"><h2>Zuletzt geändert</h2><ul class="infoliste">${zuletzt.map((d) => `<li><span class="dateiname">${typBadge(d.typ)} <a href="#/dok/${d.id}">${esc(d.name)}</a></span><div class="small muted">${esc(pfadText(d.ordner))} · ${datumZeit(d.geaendert)} ${statusBadge(d)}</div></li>`).join("")}</ul></section>
      </div>`;
  }

  // ---------------------------------------------------------------- Ablage
  function baumHTML(aktiv) {
    const zweig = (eltern) => {
      const k = kinder(eltern); if (!k.length) return "";
      return `<ul>${k.map((o) => `<li><a href="#/ablage/${o.id}" data-ordner-ziel="${o.id}" ${aktiv === o.id ? 'aria-current="page"' : ""}>${aktiv === o.id ? ICONS.ordnerOffen : ICONS.ordner}<span>${esc(o.name)}</span><span class="anzahl">${anzahlIn(o.id)}</span></a>${zweig(o.id)}</li>`).join("")}</ul>`;
    };
    return `<nav class="baum" aria-label="Ordner"><ul><li><a href="#/ablage" data-ordner-ziel="" ${!aktiv ? 'aria-current="page"' : ""}>${ICONS.ablage}<span><strong>Meine Ablage</strong></span><span class="anzahl">${S.dokumente.length}</span></a>${zweig(null)}</li></ul>
      <p class="small muted" style="margin:.6rem .4rem 0">${S.sync.aktiv ? `⇄ abgeglichen mit<br><span title="${esc(S.sync.ziel)}">${esc(S.sync.ziel)}</span>` : "Abgleich ausgeschaltet"}</p></nav>`;
  }
  function seiteAblage(oid) {
    if (oid && !ordnerVon(oid)) return `<p>Ordner nicht gefunden. <a href="#/ablage">Zur Ablage</a></p>`;
    const p = pfad(oid);
    const krumen = `<div class="pfad"><a href="#/ablage">Meine Ablage</a>${p.map((o, i) => ` › ${i === p.length - 1 ? esc(o.name) : `<a href="#/ablage/${o.id}">${esc(o.name)}</a>`}`).join("")}</div>`;
    const unter = kinder(oid).map((o) => `<tr data-ordner-ziel="${o.id}"><td><span class="dateiname">${ICONS.ordner}<a href="#/ablage/${o.id}">${esc(o.name)}</a></span></td><td><span class="typ ordner">ORDNER</span></td><td>${anzahlIn(o.id)} Dateien</td><td></td>
      <td><div class="zeilenaktionen"><button class="btn klein" data-aktion="ordner-umbenennen" data-ordner="${o.id}">Umbenennen</button><button class="btn klein gefahr" data-aktion="ordner-loeschen" data-ordner="${o.id}" aria-label="Ordner ${esc(o.name)} löschen">Löschen</button></div></td></tr>`).join("");
    const dateien = dokumenteIn(oid).map((d) => `<tr draggable="true" data-dok-ziehen="${d.id}">
      <td><span class="dateiname">${typBadge(d.typ)}<a href="#/dok/${d.id}">${esc(d.name)}</a></span></td>
      <td>${statusBadge(d)}</td><td>${datumZeit(d.geaendert)}<div class="small muted">v${d.version || 1} · ${groesse(d.groesse)}</div></td><td>${syncBadge(d)}</td>
      <td><div class="zeilenaktionen">
        ${signierbar(d) && !inSignatur(d) && !d.status ? `<button class="btn klein primaer" data-aktion="prozess-start" data-dok="${d.id}">✍ Signieren</button>` : ""}
        <details class="menu"><summary class="btn klein" aria-label="Weitere Aktionen für ${esc(d.name)}">⋯</summary><div class="liste">
          <a href="#/dok/${d.id}">Öffnen</a>
          ${signierbar(d) && d.status !== "versiegelt" && !d.siegel ? `<button data-aktion="versiegeln" data-dok="${d.id}">🔏 Versiegeln</button>` : ""}
          <button data-aktion="umbenennen" data-dok="${d.id}">Umbenennen</button>
          <button data-aktion="verschieben" data-dok="${d.id}">Verschieben …</button>
          ${DATEIEN.has(d.id) ? `<a href="${DATEIEN.get(d.id)}" download="${esc(d.name)}">⬇ Herunterladen</a>` : ""}
          <button data-aktion="loeschen" data-dok="${d.id}" class="gefahr">Löschen …</button>
        </div></details></div></td></tr>`).join("");
    const leer = !unter && !dateien;
    return `
      <div class="seitenkopf"><div>${krumen}<h1>${esc(oid ? ordnerVon(oid).name : "Meine Ablage")}</h1><p class="muted">Dateien hierher ziehen oder hochladen. Unterstützt: PDF, Word, Excel, Bilder, Text und weitere Formate (abgelegt und abgeglichen; signieren erst nach Umwandlung in PDF). Zeilen lassen sich auf Ordner ziehen.</p></div>
        <div class="aktionen"><button class="btn" data-aktion="ordner-neu" data-ordner="${oid || ""}">+ Ordner</button>
          <button class="btn primaer" data-aktion="hochladen-waehlen">⇪ Hochladen</button><input id="hochladen" type="file" multiple hidden data-hochladen="${oid || ""}"></div></div>
      <div class="ablage">${baumHTML(oid)}
        <section class="ablagezone" data-ablagezone="${oid || ""}" aria-label="Dateien in ${esc(oid ? ordnerVon(oid).name : "Meine Ablage")}">
          ${leer ? "" : `<div class="tabelle-wrap"><table><thead><tr><th>Name</th><th>Status</th><th>Geändert</th><th>Cloud-Ablage</th><th><span class="sr-only">Aktionen</span></th></tr></thead><tbody>${unter}${dateien}</tbody></table></div>`}
          <div class="dropflaeche">${leer ? "<strong>Dieser Ordner ist leer.</strong><br>" : ""}⇪ Dateien hier ablegen oder <button class="link" data-aktion="hochladen-waehlen">auswählen</button> – sie werden in «${esc(pfadText(oid))}» gespeichert und mit der Cloud-Ablage abgeglichen.</div>
        </section></div>`;
  }

  // ---------------------------------------------------------------- Dokument ansehen und bearbeiten
  function seiteDok(id) {
    const d = dok(id);
    if (!d) return `<p>Dokument nicht gefunden. <a href="#/ablage">Zur Ablage</a></p>`;
    const p = pfad(d.ordner);
    const krumen = `<div class="pfad"><a href="#/ablage">Meine Ablage</a>${p.map((o) => ` › <a href="#/ablage/${o.id}">${esc(o.name)}</a>`).join("")}</div>`;
    const lauf = inSignatur(d);
    const sperre = gesperrt(d);
    const aktionen = `
      ${signierbar(d) && !lauf && !d.status ? `<button class="btn primaer" data-aktion="prozess-start" data-dok="${d.id}">✍ Signaturprozess starten</button>` : ""}
      ${lauf ? `<a class="btn" href="#/prozess/${lauf.id}">✍ Laufender Prozess</a>` : ""}
      ${signierbar(d) && d.status !== "versiegelt" && !d.siegel && !lauf ? `<button class="btn" data-aktion="versiegeln" data-dok="${d.id}">🔏 Versiegeln</button>` : ""}
      ${DATEIEN.has(d.id) ? `<a class="btn" href="${DATEIEN.get(d.id)}" download="${esc(d.name)}">⬇ Original</a>` : ""}
      <button class="btn" data-aktion="umbenennen" data-dok="${d.id}">Umbenennen</button>`;
    let editor = "";
    if (d.typ === "pdf") editor = pdfEditor(d, sperre);
    else if (d.typ === "docx") editor = wordEditor(d, sperre);
    else if (d.typ === "xlsx") editor = excelEditor(d, sperre);
    else if (d.typ === "bild" || d.typ === "text") editor = `<div class="seitenspalte">${seitenHTML(zuPdfSeiten(d), [], { dokId: d.id })}</div>`;
    else editor = `<div class="karte"><h2>Keine Vorschau</h2><p>Dateien im Format <code>.${esc(endung(d.name))}</code> werden abgelegt und mit der Cloud-Ablage abgeglichen, aber nicht angezeigt. Zum Signieren das Dokument zuerst als PDF, Word oder Excel speichern.</p>${DATEIEN.has(d.id) ? `<a class="btn" href="${DATEIEN.get(d.id)}" download="${esc(d.name)}">⬇ Herunterladen</a>` : ""}</div>`;
    return `
      <div class="seitenkopf"><div>${krumen}<h1><span class="dateiname">${typBadge(d.typ)} ${esc(d.name)}</span></h1><p class="muted">${esc(TYPEN[d.typ].name)} ${statusBadge(d)}</p></div><div class="aktionen">${aktionen}</div></div>
      <div class="dokrahmen"><div>${editor}</div><aside class="seitenleiste">${seitenleisteDok(d)}</aside></div>`;
  }

  function pdfEditor(d, sperre) {
    const w = (k, sym, txt, tip) => `<button class="btn klein" data-aktion="werkzeug" data-werkzeug="${k}" aria-pressed="${E.werkzeug === k}" title="${esc(tip)}">${sym} ${txt}</button>`;
    const leiste = sperre
      ? `<div class="werkzeugleiste" role="note">🔒 ${d.status === "versiegelt" || d.siegel ? "Versiegelt" : d.status === "signiert" ? "Signiert" : "Im Signaturprozess"} – nicht mehr veränderbar; jede Änderung würde die Signatur ungültig machen. <span class="rechts"><button class="btn klein" data-aktion="kopie" data-dok="${d.id}">Bearbeitbare Kopie erstellen</button></span></div>`
      : `<div class="werkzeugleiste" role="toolbar" aria-label="Werkzeuge">${w("auswahl", "↖", "Auswählen", "Elemente auswählen und verschieben; Formularfelder ausfüllen")}<span class="trenner"></span>
          ${w("text", "T", "Text", "Klick ins Dokument setzt ein Textfeld")}${w("kommentar", "💬", "Kommentar", "Klick setzt eine Kommentar-Markierung")}${w("datum", "📅", "Datum", "Klick setzt das heutige Datum")}${w("feld", "✍", "Unterschriftsfeld", "Klick setzt ein Unterschriftsfeld (im Signaturprozess übernommen)")}
          <span class="rechts small muted">${E.werkzeug === "auswahl" ? "Formularfelder direkt ausfüllen · Elemente ziehen" : "In die Seite klicken zum Platzieren · Esc beendet"}</span></div>`;
    return `${leiste}<div class="seitenspalte">${seitenHTML(d.inhalt.seiten, d.elemente, { dokId: d.id, formular: !sperre, bearbeitbar: !sperre, platzieren: !sperre && E.werkzeug !== "auswahl", quelle: "dok:" + d.id, personen: [D.ICH], platzhalterZeigen: !sperre })}</div>`;
  }
  function wordEditor(d, sperre) {
    const abs = d.inhalt.absaetze.map((a, i) => `<div class="s-${a.stil}" ${sperre ? "" : 'contenteditable="true"'} data-absatz="${i}" role="textbox" aria-label="Absatz ${i + 1}" aria-multiline="true">${sauber(a.html)}</div>`).join("");
    const leiste = sperre ? `<div class="werkzeugleiste" role="note">🔒 Gesperrt, solange das Dokument im Signaturprozess ist.</div>`
      : `<div class="werkzeugleiste" role="toolbar" aria-label="Formatierung">
          <button class="btn klein" data-aktion="format" data-befehl="bold" title="Fett (Strg+B)"><b>F</b></button>
          <button class="btn klein" data-aktion="format" data-befehl="italic" title="Kursiv (Strg+I)"><i>K</i></button>
          <button class="btn klein" data-aktion="format" data-befehl="underline" title="Unterstrichen (Strg+U)"><u>U</u></button><span class="trenner"></span>
          <button class="btn klein" data-aktion="absatz-stil" data-stil="h2" title="Aktuellen Absatz als Überschrift">Überschrift</button>
          <button class="btn klein" data-aktion="absatz-stil" data-stil="p" title="Aktuellen Absatz als Text">Text</button>
          <button class="btn klein" data-aktion="absatz-neu" title="Absatz am Ende anfügen">¶ Absatz</button>
          <span class="rechts"><span class="small muted" id="word-stand">${E.wordGeaendert ? "● ungespeichert" : "✓ gespeichert"}</span><button class="btn klein primaer" data-aktion="word-speichern" data-dok="${d.id}">Speichern</button></span></div>`;
    return `${leiste}<div class="seitenspalte"><div class="wordblatt ${sperre ? "gesperrt" : ""}" data-word="${d.id}">${abs}</div></div>`;
  }
  function excelEditor(d, sperre) {
    const z = d.inhalt.zellen; const sp = d.inhalt.summeSpalte;
    const buchst = (i) => String.fromCharCode(65 + i);
    const summe = sp != null ? z.slice(1).reduce((a, r) => a + (parseFloat(String(r[sp]).replace(/'/g, "")) || 0), 0) : null;
    const zeilen = z.map((r, ri) => `<tr><td class="zeilenkopf">${ri + 1}</td>${r.map((c, ci) => `<td>${sperre ? esc(c) : `<input aria-label="Zelle ${buchst(ci)}${ri + 1}" data-zelle="${ri},${ci}" value="${esc(c)}" ${ri === 0 ? 'style="font-weight:600"' : ""}>`}</td>`).join("")}</tr>`).join("");
    const tot = summe != null ? `<tr class="summe"><td class="zeilenkopf">Σ</td>${z[0].map((_, ci) => `<td class="${ci === sp ? "zahl" : ""}">${ci === 0 ? "Total" : ci === sp ? summe.toFixed(2) : ""}</td>`).join("")}</tr>` : "";
    return `<div class="werkzeugleiste">${sperre ? "🔒 Gesperrt (im Signaturprozess)." : `<button class="btn klein" data-aktion="zeile-neu" data-dok="${d.id}">+ Zeile</button><span class="rechts small muted">Zellen direkt bearbeiten – wird sofort gespeichert. Zum Signieren wird die Tabelle in PDF/A umgewandelt.</span>`}</div>
      <h2>${esc(d.inhalt.titel || "")}</h2>
      <div class="tabellenblatt"><table><thead><tr><th class="zeilenkopf"></th>${z[0].map((_, i) => `<th>${buchst(i)}</th>`).join("")}</tr></thead><tbody>${zeilen}${tot}</tbody></table></div>`;
  }
  function seitenleisteDok(d) {
    const info = `<section class="karte"><h2>Angaben</h2><div class="feldliste small">
      <div class="feldzeile"><span>Ordner</span><span>${esc(pfadText(d.ordner))}</span></div>
      <div class="feldzeile"><span>Grösse</span><span>${groesse(d.groesse)}</span></div>
      <div class="feldzeile"><span>Version</span><span>${d.version || 1}</span></div>
      <div class="feldzeile"><span>Geändert</span><span>${datumZeit(d.geaendert)}</span></div>
      <div class="feldzeile"><span>Cloud-Ablage</span><span>${syncBadge(d)}</span></div></div>
      ${d.sync === "konflikt" ? `<div class="meldung fehler small" style="margin:.6rem 0 0">⚠ Die Datei wurde gleichzeitig in der Cloud-Ablage geändert. Die Cloud-Fassung liegt als «… (Konflikt Cloud)» daneben.<div style="margin-top:.4rem"><button class="btn klein" data-aktion="konflikt-loesen" data-dok="${d.id}">Diese Fassung behalten</button></div></div>` : ""}</section>`;
    let kommentare = "";
    if (d.typ === "pdf" && !(gesperrt(d) && !(d.elemente || []).some((e) => e.art === "kommentar"))) {
      const k = (d.elemente || []).filter((e) => e.art === "kommentar");
      kommentare = `<section class="karte"><h2>💬 Kommentare</h2>${k.length ? `<ul class="kommentarliste">${k.map((e) => `<li><label class="small" for="k-${e.id}"><strong>${e.nr}</strong> · Seite ${e.seite + 1} · ${esc(D.ICH.name)}</label>${gesperrt(d) ? `<div>${esc(e.text)}</div>` : `<textarea id="k-${e.id}" data-kommentar="${e.id}" placeholder="Kommentar schreiben …">${esc(e.text)}</textarea>`}</li>`).join("")}</ul>` : '<p class="small muted">Noch keine Kommentare. Werkzeug «Kommentar» wählen und in die Seite klicken.</p>'}</section>`;
    }
    let pruefung = "";
    if (d.signaturen && d.signaturen.length || d.siegel) {
      pruefung = `<section class="karte"><h2>✓ Signaturen prüfen</h2><ul class="pruefliste">
        ${(d.signaturen || []).map((s) => `<li><span class="ok">✓</span><span><strong>${esc(s.name)}</strong><br><span class="muted">${esc(STUFEN[s.stufe].name)} · ${esc(RECHTSRAUM[s.rechtsraum])} · ${datumZeit(s.zeit)}</span></span></li>`).join("")}
        ${d.siegel ? `<li><span class="ok">✓</span><span><strong>🔏 ${esc(d.siegel.org)}</strong><br><span class="muted">${d.siegel.stufe === "qes" ? "Qualifiziertes" : "Fortgeschrittenes"} elektronisches Siegel · ${esc(RECHTSRAUM[d.siegel.rechtsraum])} · ${datumZeit(d.siegel.zeit)}</span></span></li>` : ""}
        <li><span class="ok">✓</span><span>Dokument seit der letzten Signatur unverändert</span></li>
        <li><span class="ok">✓</span><span>PDF/A-2b, Zeitstempel eingebettet</span></li></ul>
        <p class="small" style="margin-top:.6rem">Prüfsumme<br><span class="hash">${esc(d.pruefsumme || "")}</span></p></section>`;
    }
    const hinweis = d.typ === "pdf" && !gesperrt(d) ? `<section class="karte small"><h2>So geht's</h2><p>Formularfelder (blau hinterlegt) direkt ausfüllen. Mit den Werkzeugen Text, Kommentar, Datum oder ein Unterschriftsfeld setzen. Alles wird sofort gespeichert und abgeglichen.</p><p>Unterschriftsfelder werden beim Signaturprozess übernommen.</p></section>` : "";
    return info + pruefung + kommentare + hinweis;
  }

  // ---------------------------------------------------------------- Signaturprozess: Assistent
  const SCHRITTE = ["Dokument", "Unterzeichnende", "Felder platzieren", "Senden"];
  function prozessStart(dokId) {
    const d = dok(dokId);
    const entwurf = S.prozesse.find((p) => p.dokId === dokId && p.status === "entwurf");
    if (entwurf) { location.hash = "#/prozess/" + entwurf.id; return; }
    const p = {
      id: uid("sp"), dokId, titel: basis(d.name), quelleName: d.name, status: "entwurf", schritt: 0, erstellt: jetzt(),
      umgewandelt: false, seiten: null, elementeFix: [], felder: [], platzhalterUebernommen: false, pdfaAblegen: false,
      personen: [{ id: "ich", name: D.ICH.name, mail: D.ICH.mail, rolle: "unterschreiben", status: "offen" }],
      reihenfolge: "nacheinander", stufe: S.einst.stufe, rechtsraum: S.einst.rechtsraum,
      nachricht: "", frist: plusTage(heute(), 7), erinnerung: "3", versiegeln: false, protokoll: [],
    };
    S.prozesse.unshift(p); speichern();
    location.hash = "#/prozess/" + p.id;
  }
  function seiteProzess(id) {
    const p = prozess(id);
    if (!p) return `<p>Signaturprozess nicht gefunden. <a href="#/prozesse">Zur Liste</a></p>`;
    if (p.status !== "entwurf") return prozessDetail(p);
    const d = dok(p.dokId);
    const kette = `<ol class="schritte" aria-label="Schritte">${SCHRITTE.map((s, i) => `<li class="${i < p.schritt ? "erledigt" : i === p.schritt ? "aktuell" : ""}" ${i === p.schritt ? 'aria-current="step"' : ""}>${i < p.schritt ? `<button data-aktion="schritt" data-p="${p.id}" data-s="${i}">${esc(s)}</button>` : esc(s)}</li>`).join("")}</ol>`;
    let inhalt = "";
    if (p.schritt === 0) inhalt = schrittDokument(p, d);
    else if (p.schritt === 1) inhalt = schrittPersonen(p);
    else if (p.schritt === 2) inhalt = schrittFelder(p);
    else inhalt = schrittSenden(p, d);
    return `<div class="seitenkopf"><div><div class="pfad"><a href="#/prozesse">Signaturprozesse</a> › Neu</div><h1>Signaturprozess: ${esc(p.titel)}</h1><p class="muted">Quelle: ${d ? `<a href="#/dok/${d.id}">${esc(pfadText(d.ordner))} / ${esc(d.name)}</a>` : esc(p.quelleName)}</p></div>
      <div class="aktionen"><button class="btn gefahr" data-aktion="entwurf-verwerfen" data-p="${p.id}">Entwurf verwerfen</button></div></div>${kette}${inhalt}`;
  }
  function weiterLeiste(p, ok, grund) {
    return `<div class="formzeile" style="margin-top:1rem;justify-content:space-between">${p.schritt > 0 ? `<button class="btn" data-aktion="schritt" data-p="${p.id}" data-s="${p.schritt - 1}">← Zurück</button>` : "<span></span>"}
      <span>${!ok && grund ? `<span class="small muted" style="margin-right:.6rem">${esc(grund)}</span>` : ""}<button class="btn primaer" data-aktion="schritt" data-p="${p.id}" data-s="${p.schritt + 1}" ${ok ? "" : "disabled"}>Weiter →</button></span></div>`;
  }
  function schrittDokument(p, d) {
    if (!d) return `<div class="meldung fehler">Das Quelldokument wurde gelöscht.</div>`;
    const umwandeln = d.typ !== "pdf";
    const ziel = basis(d.name) + ".pdf";
    const vorschau = p.umgewandelt ? `<div class="seitenspalte" style="margin-top:1rem">${seitenHTML(p.seiten, p.elementeFix, { dokId: p.id })}</div>` : "";
    return `<section class="karte"><h2>1. Dokument für die Signatur vorbereiten</h2>
      <p class="muted">Signiert wird immer ein PDF/A (Langzeitformat). ${umwandeln ? "Word-, Excel-, Text- und Bilddateien werden zuerst umgewandelt; das Original bleibt unverändert in der Ablage." : "Das PDF wird als PDF/A-2b normalisiert: Schriften eingebettet, ausgefüllte Formularfelder und gesetzte Texte fest übernommen."}</p>
      <div class="umwandlung"><div class="karte"><div class="dateiname">${typBadge(d.typ)} <strong>${esc(d.name)}</strong></div><div class="small muted">${esc(TYPEN[d.typ].name)} · ${groesse(d.groesse)} · v${d.version || 1}</div></div>
        <div class="pfeil" aria-hidden="true">→</div>
        <div class="karte"><div class="dateiname">${typBadge("pdf")} <strong>${esc(ziel)}</strong></div><div class="small muted">${p.umgewandelt ? `✓ PDF/A-2b · ${p.seiten.length} Seite(n) · ${esc(datumZeit(p.umgewandeltAm))}` : "PDF/A-2b – noch nicht erstellt"}</div></div></div>
      <div style="margin-top:.8rem">${p.umgewandelt ? `<span class="badge erfolg">✓ Bereit zur Signatur</span> <button class="btn klein" data-aktion="umwandeln" data-p="${p.id}">Erneut umwandeln</button>` : `<button class="btn primaer" data-aktion="umwandeln" data-p="${p.id}">${umwandeln ? "In PDF/A umwandeln" : "Als PDF/A vorbereiten"}</button><div class="fortschritt" style="margin-top:.6rem;max-width:420px" hidden id="umw-fortschritt"><span></span></div>`}</div>
      ${umwandeln ? `<label class="small" style="display:block;margin-top:.7rem"><input type="checkbox" data-pfeld="pdfaAblegen" ${p.pdfaAblegen ? "checked" : ""}> PDF/A-Datei zusätzlich unsigniert im Ordner ablegen</label>` : ""}
      ${vorschau}</section>${weiterLeiste(p, p.umgewandelt, "Zuerst umwandeln.")}`;
  }
  function schrittPersonen(p) {
    const opts = (sel) => `<option value="ich" ${sel === "ich" ? "selected" : ""}>${esc(D.ICH.name)} (ich)</option>${D.PERSONEN.map((x) => `<option value="${x.id}" ${sel === x.id ? "selected" : ""}>${esc(x.name)} – ${esc(x.funktion)}</option>`).join("")}${sel && sel.startsWith("x-") ? `<option value="${sel}" selected>${esc(p.personen.find((x) => x.id === sel).name)} (extern)</option>` : ""}<option value="extern">Externe Person …</option>`;
    const zeilen = p.personen.map((x, i) => `<div class="personzeile"><span class="nr p${i % 5}" aria-hidden="true">${i + 1}</span>
      <label><span class="sr-only">Person ${i + 1}</span><select data-person-idx="${i}" style="width:100%">${opts(x.id)}</select><div class="small muted">${esc(x.mail)}</div></label>
      <label><span class="sr-only">Rolle</span><select data-rolle-idx="${i}" style="width:100%">${Object.entries(ROLLEN).map(([k, v]) => `<option value="${k}" ${x.rolle === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      <button class="btn klein" data-aktion="person-weg" data-p="${p.id}" data-i="${i}" ${p.personen.length < 2 ? "disabled" : ""} aria-label="Person ${i + 1} entfernen">✕</button></div>`).join("");
    const unterschreibende = p.personen.filter((x) => x.rolle === "unterschreiben").length;
    const doppelt = new Set(p.personen.map((x) => x.id)).size !== p.personen.length;
    const stufen = Object.entries(STUFEN).map(([k, s]) => `<label class="wahlkarte"><span><input type="radio" name="stufe" data-pfeld="stufe" value="${k}" ${p.stufe === k ? "checked" : ""}><strong>${s.kurz}</strong> – ${esc(s.name)}</span><span class="small">${esc(s.text)}</span></label>`).join("");
    return `<div class="spalten"><section class="karte"><h2>2. Wer unterschreibt?</h2>${zeilen}
        <div class="formzeile" style="margin-top:.7rem"><button class="btn" data-aktion="person-neu" data-p="${p.id}">+ Person</button></div>
        <fieldset style="border:none;padding:0;margin:.5rem 0 0"><legend class="small muted">Reihenfolge</legend>
          <label class="small" style="margin-right:1rem"><input type="radio" name="reihenfolge" data-pfeld="reihenfolge" value="nacheinander" ${p.reihenfolge === "nacheinander" ? "checked" : ""}> nacheinander (in der Reihenfolge der Liste)</label>
          <label class="small"><input type="radio" name="reihenfolge" data-pfeld="reihenfolge" value="gleichzeitig" ${p.reihenfolge === "gleichzeitig" ? "checked" : ""}> gleichzeitig (Genehmigende zuerst)</label></fieldset></section>
      <section class="karte"><h2>Signaturstufe</h2><div class="wahlkarten">${stufen}</div>
        <div class="formzeile" style="margin-top:.8rem"><label class="feld">Rechtsraum<select data-pfeld="rechtsraum">${Object.entries(RECHTSRAUM).map(([k, v]) => `<option value="${k}" ${p.rechtsraum === k ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
        ${p.stufe === "qes" ? '<p class="small muted">Für QES müssen alle Unterzeichnenden einmalig identifiziert sein (Video- oder Vor-Ort-Identifikation). Im Prototyp gilt das als erledigt.</p>' : ""}</section></div>
      ${weiterLeiste(p, unterschreibende > 0 && !doppelt, doppelt ? "Jede Person nur einmal aufführen." : "Mindestens eine Person muss unterschreiben.")}`;
  }
  function platzhalterUebernehmen(p) {
    const signer = p.personen.filter((x) => x.rolle === "unterschreiben");
    let n = 0;
    p.seiten.forEach((s, si) => (s.platzhalter || []).forEach((ph) => {
      const x = signer[ph.nr - 1]; if (!x) return;
      if (!p.felder.some((f) => f.ph === `${si}-${ph.nr}`)) { p.felder.push({ id: uid("f"), seite: si, x: ph.x, y: ph.y, w: 36, h: 9, person: x.id, ph: `${si}-${ph.nr}` }); n++; }
    }));
    p.platzhalterUebernommen = true;
    return n;
  }
  function schrittFelder(p) {
    const signer = p.personen.map((x, i) => [x, i]).filter(([x]) => x.rolle === "unterschreiben");
    if (!signer.some(([, i]) => i === E.aktivPerson)) E.aktivPerson = signer[0][1];
    const knoepfe = signer.map(([x, i]) => `<button class="btn klein" data-aktion="aktiv-person" data-i="${i}" aria-pressed="${E.aktivPerson === i}"><span class="nr p${i % 5}" aria-hidden="true">${i + 1}</span> ${esc(x.name)}</button>`).join("");
    const fehlt = signer.filter(([x]) => !p.felder.some((f) => f.person === x.id));
    const anzahlPh = p.seiten.reduce((a, s) => a + (s.platzhalter || []).length, 0);
    const liste = signer.map(([x, i]) => { const n = p.felder.filter((f) => f.person === x.id).length; return `<li><span class="nr p${i % 5}" aria-hidden="true">${i + 1}</span> ${esc(x.name)} – ${n ? `<span class="badge erfolg">✓ ${n} Feld${n > 1 ? "er" : ""}</span>` : '<span class="badge warnung">⚠ noch kein Feld</span>'}</li>`; }).join("");
    return `<div class="dokrahmen"><div>
        <div class="werkzeugleiste" role="toolbar" aria-label="Unterschriftsfelder"><span class="small muted">Feld setzen für:</span> ${knoepfe}<span class="rechts small muted">Klick in die Seite setzt ein Feld · Felder ziehen zum Verschieben</span></div>
        <div class="seitenspalte">${seitenHTML(p.seiten, p.elementeFix.concat(p.felder.map((f) => Object.assign({ art: "feld" }, f))), { dokId: p.id, bearbeitbar: true, platzieren: true, quelle: "prozess:" + p.id, personen: p.personen, platzhalterZeigen: true })}</div></div>
      <aside class="seitenleiste"><section class="karte"><h2>3. Felder platzieren</h2><ul class="infoliste" style="list-style:none">${liste}</ul>
        ${anzahlPh ? `<p class="small" style="margin-top:.6rem">${anzahlPh} Platzhalter (<code>#sign#n#</code>) im Dokument erkannt${p.platzhalterUebernommen ? " und übernommen" : ""}. <button class="link small" data-aktion="platzhalter" data-p="${p.id}">Erneut übernehmen</button></p>` : ""}
        <p class="small muted">Wie im Signaturdienst: Personen erhalten nur ihre eigenen Felder. Mehrere Felder pro Person sind möglich (z. B. Visum auf jeder Seite).</p></section></aside></div>
      ${weiterLeiste(p, !fehlt.length, fehlt.length ? `Feld fehlt für ${fehlt.map(([x]) => x.name).join(", ")}.` : "")}`;
  }
  function schrittSenden(p, d) {
    const zielName = basis(p.quelleName) + "_sign.pdf";
    return `<div class="spalten"><section class="karte"><h2>4. Nachricht und Optionen</h2>
        <label class="feld">Nachricht an die Unterzeichnenden<textarea data-pfeld="nachricht" rows="3" placeholder="z. B. Bitte bis Freitag unterzeichnen.">${esc(p.nachricht)}</textarea></label>
        <div class="formzeile" style="margin-top:.6rem"><label class="feld">Frist<input type="date" data-pfeld="frist" value="${esc(p.frist)}"></label>
          <label class="feld">Erinnerung<select data-pfeld="erinnerung">${[["0", "keine"], ["1", "nach 1 Tag"], ["3", "nach 3 Tagen"], ["7", "nach 7 Tagen"]].map(([k, v]) => `<option value="${k}" ${p.erinnerung === k ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
        <label class="small" style="display:block"><input type="checkbox" data-pfeld="versiegeln" ${p.versiegeln ? "checked" : ""}> Nach der letzten Unterschrift mit dem Organisationssiegel «${esc(D.ORGANISATION.name)}» versiegeln</label></section>
      <section class="karte"><h2>Zusammenfassung</h2><div class="feldliste small">
        <div class="feldzeile"><span>Dokument</span><span>${esc(basis(p.quelleName))}.pdf · PDF/A-2b · ${p.seiten.length} S.</span></div>
        <div class="feldzeile"><span>Signaturstufe</span><span>${STUFEN[p.stufe].kurz} · ${esc(RECHTSRAUM[p.rechtsraum])}</span></div>
        <div class="feldzeile"><span>Reihenfolge</span><span>${p.reihenfolge}</span></div>
        ${p.personen.map((x, i) => `<div class="feldzeile"><span><span class="nr p${i % 5}" aria-hidden="true">${i + 1}</span> ${esc(x.name)}</span><span>${ROLLEN[x.rolle]}${x.rolle === "unterschreiben" ? ` · ${p.felder.filter((f) => f.person === x.id).length} Feld(er)` : ""}</span></div>`).join("")}
        <div class="feldzeile"><span>Ergebnis</span><span>${esc(pfadText(d ? d.ordner : null))} / <strong>${esc(zielName)}</strong></span></div></div></section></div>
      <div class="formzeile" style="margin-top:1rem;justify-content:space-between"><button class="btn" data-aktion="schritt" data-p="${p.id}" data-s="2">← Zurück</button>
        <button class="btn primaer" data-aktion="senden" data-p="${p.id}">✉ Signaturprozess starten</button></div>`;
  }

  // ---------------------------------------------------------------- Signaturprozess: Ablauf
  function aktivePersonen(p) {
    if (p.status !== "laufend") return [];
    const offen = p.personen.filter((x) => x.rolle !== "kopie" && x.status === "offen");
    if (p.reihenfolge === "nacheinander") return offen.slice(0, 1);
    const gen = offen.filter((x) => x.rolle === "genehmigen");
    return gen.length ? gen : offen;
  }
  function protokoll(p, text) { p.protokoll.push({ zeit: jetzt(), text }); }
  function senden(p) {
    const d = dok(p.dokId);
    p.status = "laufend"; p.gesendet = jetzt();
    protokoll(p, `Signaturprozess gestartet (${STUFEN[p.stufe].kurz}, ${RECHTSRAUM[p.rechtsraum]}, ${p.reihenfolge})`);
    if (p.pdfaAblegen && d) {
      const n = freierName(basis(d.name) + ".pdf", d.ordner);
      S.dokumente.push({ id: uid("d"), name: n, typ: "pdf", ordner: d.ordner, groesse: Math.round((d.groesse || 30000) * 1.3), geaendert: jetzt(), version: 1, sync: "ausstehend", status: null, elemente: klon(p.elementeFix), signaturen: [], siegel: null, inhalt: { seiten: klon(p.seiten) } });
      protokoll(p, `PDF/A-Datei «${n}» abgelegt`);
    }
    benachrichtigen(p);
    speichern();
  }
  function benachrichtigen(p) {
    aktivePersonen(p).forEach((x) => { if (!x.benachrichtigt) { x.benachrichtigt = true; protokoll(p, x.id === "ich" ? "Sie sind an der Reihe" : `E-Mail an ${x.name} (${x.mail}) gesendet`); } });
  }
  function personErledigt(p, pid, img) {
    const x = p.personen.find((y) => y.id === pid);
    x.status = "unterschrieben"; x.zeit = jetzt();
    if (x.rolle === "genehmigen") protokoll(p, `${x.name} hat genehmigt`);
    else {
      const bild = img || schriftzug(x.name);
      p.felder.filter((f) => f.person === pid).forEach((f) => { f.sig = { img: bild, name: x.name, zeit: x.zeit, stufe: p.stufe }; });
      protokoll(p, `${x.name} hat unterschrieben (${STUFEN[p.stufe].kurz})`);
    }
    if (!p.personen.some((y) => y.rolle !== "kopie" && y.status === "offen")) abschliessen(p);
    else benachrichtigen(p);
    speichern();
  }
  function abschliessen(p) {
    const d = dok(p.dokId);
    const ordner = d ? d.ordner : null;
    const name = freierName(basis(p.quelleName) + "_sign.pdf", ordner);
    const unterschriften = p.personen.filter((x) => x.rolle === "unterschreiben");
    const protokollSeite = { bloecke: [
      { t: "klein", x: "EduKSX-Sign · Signaturprotokoll" },
      { t: "h1", x: "Signaturprotokoll" },
      { t: "p", x: `Dokument: ${basis(p.quelleName)}.pdf (PDF/A-2b, ${p.seiten.length} Seite(n)) · Prozess ${p.id}` },
      { t: "tabelle", kopf: ["Person", "Rolle", "Zeitpunkt", "Stufe"], zeilen: p.personen.filter((x) => x.rolle !== "kopie").map((x) => [`${x.name} (${x.mail})`, ROLLEN[x.rolle], datumZeit(x.zeit), x.rolle === "unterschreiben" ? `${STUFEN[p.stufe].kurz} · ${RECHTSRAUM[p.rechtsraum]}` : "–"]) },
      { t: "p", x: `Gestartet ${datumZeit(p.gesendet)} von ${D.ICH.name}. Abgeschlossen ${datumZeit(jetzt())}.` },
      { t: "p", x: "Die elektronischen Signaturen und der Zeitstempel sind im PDF eingebettet. Jede Änderung am Dokument macht sie ungültig." },
    ] };
    const elemente = klon(p.elementeFix).concat(p.felder.map((f) => ({ id: uid("e"), art: "sig", seite: f.seite, x: f.x, y: f.y, w: f.w, h: f.h, img: f.sig.img, name: f.sig.name, zeit: f.sig.zeit, stufe: STUFEN[p.stufe].kurz })));
    const neu = {
      id: uid("d"), name, typ: "pdf", ordner, groesse: Math.round(((d && d.groesse) || 40000) * 1.6), geaendert: jetzt(), version: 1, sync: "ausstehend", status: "signiert",
      inhalt: { seiten: klon(p.seiten).concat([protokollSeite]) }, elemente,
      signaturen: unterschriften.map((x) => ({ name: x.name, zeit: x.zeit, stufe: p.stufe, rechtsraum: p.rechtsraum })), siegel: null, prozessId: p.id,
    };
    if (p.versiegeln) siegelAnbringen(neu, { stufe: "aes", rechtsraum: p.rechtsraum, sichtbar: true });
    neu.pruefsumme = pruefsumme(neu.inhalt) ;
    S.dokumente.push(neu);
    p.status = "abgeschlossen"; p.abgeschlossen = jetzt(); p.ergebnisId = neu.id;
    protokoll(p, `Alle Unterschriften vorhanden – «${name}» in «${pfadText(ordner)}» abgelegt${p.versiegeln ? " und versiegelt" : ""}`);
    p.personen.filter((x) => x.rolle === "kopie").forEach((x) => protokoll(p, `Kopie an ${x.name} gesendet`));
    toast(`Alle haben unterschrieben – «${name}» liegt im Ursprungsordner.`);
  }
  function siegelAnbringen(d, opt) {
    const z = jetzt();
    d.siegel = { org: D.ORGANISATION.name, stufe: opt.stufe, rechtsraum: opt.rechtsraum, zeit: z };
    if (opt.sichtbar) d.elemente.push({ id: uid("e"), art: "siegel", seite: d.inhalt.seiten.length - 1, x: 74, y: 80, org: D.ORGANISATION.name, zeit: z });
    d.pruefsumme = pruefsumme(d.inhalt);
  }
  function prozessDetail(p) {
    const akt = aktivePersonen(p).map((x) => x.id);
    const st = { laufend: ["info", "↻ läuft"], abgeschlossen: ["erfolg", "✓ abgeschlossen"], abgelehnt: ["fehler", "✕ abgelehnt"], zurueckgezogen: ["neutral", "– zurückgezogen"] }[p.status];
    const zeilen = p.personen.map((x, i) => {
      let aktion = "";
      if (akt.includes(x.id)) {
        if (x.id === "ich") aktion = `<button class="btn klein primaer" data-aktion="ich-unterschreibe" data-p="${p.id}">✍ ${x.rolle === "genehmigen" ? "Genehmigen" : "Jetzt unterschreiben"}</button>`;
        else aktion = `<button class="btn klein" data-aktion="sim-ok" data-p="${p.id}" data-pid="${x.id}" title="Simuliert die Handlung der Person">↩ ${x.rolle === "genehmigen" ? "Genehmigung" : "Unterschrift"} simulieren</button> <button class="btn klein gefahr" data-aktion="sim-nein" data-p="${p.id}" data-pid="${x.id}">Ablehnung simulieren</button>`;
      }
      const s = x.rolle === "kopie" ? (p.status === "abgeschlossen" ? '<span class="badge neutral">✉ Kopie erhalten</span>' : '<span class="badge neutral">erhält Kopie</span>')
        : x.status === "unterschrieben" ? `<span class="badge erfolg">✓ ${x.rolle === "genehmigen" ? "genehmigt" : "unterschrieben"}</span>`
        : x.status === "abgelehnt" ? '<span class="badge fehler">✕ abgelehnt</span>'
        : akt.includes(x.id) ? '<span class="badge warnung">● an der Reihe</span>' : '<span class="badge neutral">○ wartet</span>';
      return `<tr><td><span class="nr p${i % 5}" aria-hidden="true">${i + 1}</span></td><td>${esc(x.name)}<div class="small muted">${esc(x.mail)}</div></td><td>${ROLLEN[x.rolle]}</td><td>${s}<div class="small muted">${esc(datumZeit(x.zeit))}</div></td><td>${aktion}</td></tr>`;
    }).join("");
    const erg = p.ergebnisId && dok(p.ergebnisId);
    const ctx = { dokId: p.id, personen: p.personen, meinFeld: akt.includes("ich") ? "ich-unterschreibe" : null };
    const els = p.elementeFix.concat(p.felder.map((f) => Object.assign({ art: "feld" }, f)));
    return `<div class="seitenkopf"><div><div class="pfad"><a href="#/prozesse">Signaturprozesse</a> › ${esc(p.id)}</div><h1>${esc(p.titel)} <span class="badge ${st[0]}">${st[1]}</span></h1>
        <p class="muted">${STUFEN[p.stufe].kurz} · ${esc(RECHTSRAUM[p.rechtsraum])} · ${p.reihenfolge} · Frist ${datum(p.frist)}${p.versiegeln ? " · wird versiegelt" : ""}</p></div>
      <div class="aktionen">${erg ? `<a class="btn primaer" href="#/dok/${erg.id}">📄 ${esc(erg.name)} öffnen</a>` : ""}${p.status === "laufend" ? `<button class="btn" data-aktion="erinnern" data-p="${p.id}">✉ Erinnern</button><button class="btn gefahr" data-aktion="zurueckziehen" data-p="${p.id}">Zurückziehen …</button>` : ""}</div></div>
      ${akt.includes("ich") ? `<div class="meldung info">✍ Sie sind an der Reihe. Auf Ihr Feld im Dokument klicken oder «Jetzt unterschreiben».</div>` : ""}
      <div class="tabelle-wrap"><table><thead><tr><th></th><th>Person</th><th>Rolle</th><th>Status</th><th>Aktion</th></tr></thead><tbody>${zeilen}</tbody></table></div>
      <div class="dokrahmen" style="margin-top:1rem"><div class="seitenspalte">${seitenHTML(p.seiten, els, ctx)}</div>
        <aside class="seitenleiste"><section class="karte"><h2>Verlauf</h2><ol class="zeitachse">${p.protokoll.slice().reverse().map((e) => `<li><time>${esc(datumZeit(e.zeit))}</time>${esc(e.text)}</li>`).join("")}</ol></section>
        ${p.nachricht ? `<section class="karte small"><h2>Nachricht</h2><p>${esc(p.nachricht)}</p></section>` : ""}</aside></div>`;
  }
  function seiteProzesse() {
    const zeilen = S.prozesse.map((p) => {
      const st = { entwurf: ["neutral", "✎ Entwurf"], laufend: ["info", "↻ läuft"], abgeschlossen: ["erfolg", "✓ abgeschlossen"], abgelehnt: ["fehler", "✕ abgelehnt"], zurueckgezogen: ["neutral", "– zurückgezogen"] }[p.status];
      const fertig = p.personen.filter((x) => x.rolle !== "kopie" && x.status === "unterschrieben").length, alle = p.personen.filter((x) => x.rolle !== "kopie").length;
      const an = aktivePersonen(p).map((x) => x.id === "ich" ? "Sie" : x.name).join(", ");
      return `<tr><td><a href="#/prozess/${p.id}">${esc(p.titel)}</a><div class="small muted">${esc(p.quelleName)}</div></td><td><span class="badge ${st[0]}">${st[1]}</span></td><td>${p.status === "entwurf" ? "–" : `${fertig} / ${alle}`}${an ? `<div class="small muted">an der Reihe: ${esc(an)}</div>` : ""}</td><td>${STUFEN[p.stufe].kurz}</td><td>${datumZeit(p.gesendet || p.erstellt)}</td></tr>`;
    }).join("");
    return `<div class="seitenkopf"><div><h1>Signaturprozesse</h1><p class="muted">Von Ihnen gestartete Prozesse. Neue Prozesse starten Sie in der Ablage mit «✍ Signieren».</p></div><div class="aktionen"><a class="btn primaer" href="#/ablage">Dokument wählen</a></div></div>
      ${zeilen ? `<div class="tabelle-wrap"><table><thead><tr><th>Dokument</th><th>Status</th><th>Unterschriften</th><th>Stufe</th><th>Gestartet</th></tr></thead><tbody>${zeilen}</tbody></table></div>` : '<div class="karte"><p>Noch keine Signaturprozesse. Tipp: <a href="#/dok/d-laptop">Vereinbarung Laptop-Ausleihe</a> enthält Platzhalter für zwei Unterschriften, <a href="#/dok/d-ziel">Zielvereinbarung 2026</a> ist ein Word-Dokument, das zuerst in PDF/A umgewandelt wird.</p></div>'}`;
  }

  // ---------------------------------------------------------------- Eingang
  function seiteEingang() {
    const zeilen = S.eingang.map((e) => {
      const st = e.status === "offen" ? (e.frist < heute() ? '<span class="badge fehler">⚠ überfällig</span>' : '<span class="badge warnung">● offen</span>') : e.status === "unterschrieben" ? '<span class="badge erfolg">✓ unterschrieben</span>' : '<span class="badge fehler">✕ abgelehnt</span>';
      return `<tr><td><a href="#/eingang/${e.id}">${esc(e.titel)}</a><div class="small muted">${esc(e.datei)}</div></td><td>${wordmark(e.quelle.replace("EduKSX-", ""))}</td><td>${esc(person(e.von).name)}<div class="small muted">${esc(person(e.von).funktion)}</div></td><td>${datum(e.erhalten)}</td><td>${datum(e.frist)}</td><td>${STUFEN[e.stufe].kurz}</td><td>${st}</td></tr>`;
    }).join("");
    const meine = meineZuge();
    return `<div class="seitenkopf"><div><h1>Zu unterschreiben</h1><p class="muted">Signaturanfragen an Sie – aus den anderen ${wordmark()}-Modulen oder von Kolleg:innen. Unterschreiben Sie direkt im Dokument.</p></div><div class="aktionen"><a class="btn" href="#/einbindung">Anfrage aus einem Modul simulieren</a></div></div>
      ${meine.length ? `<div class="meldung info">✍ In eigenen Signaturprozessen sind Sie an der Reihe: ${meine.map((p) => `<a href="#/prozess/${p.id}">${esc(p.titel)}</a>`).join(", ")}</div>` : ""}
      ${zeilen ? `<div class="tabelle-wrap"><table><thead><tr><th>Dokument</th><th>Aus</th><th>Von</th><th>Erhalten</th><th>Frist</th><th>Stufe</th><th>Status</th></tr></thead><tbody>${zeilen}</tbody></table></div>` : '<p class="muted">Keine Anfragen.</p>'}`;
  }
  function seiteEingangDok(id) {
    const e = S.eingang.find((x) => x.id === id);
    if (!e) return `<p>Anfrage nicht gefunden. <a href="#/eingang">Zum Eingang</a></p>`;
    const offen = e.status === "offen";
    const ctx = { dokId: e.id, personen: [D.ICH], meinFeld: offen ? "eingang-unterschreiben" : null };
    return `<div class="seitenkopf"><div><div class="pfad"><a href="#/eingang">Zu unterschreiben</a> › ${esc(e.datei)}</div><h1>${esc(e.titel)}</h1>
        <p class="muted">aus ${wordmark(e.quelle.replace("EduKSX-", ""))} · von ${esc(person(e.von).name)} · Frist ${datum(e.frist)} · ${STUFEN[e.stufe].kurz} · ${esc(RECHTSRAUM[e.rechtsraum])}</p></div>
      <div class="aktionen">${offen ? `<button class="btn primaer" data-aktion="eingang-unterschreiben" data-e="${e.id}">✍ Unterschreiben</button><button class="btn gefahr" data-aktion="eingang-ablehnen" data-e="${e.id}">Ablehnen …</button>` : e.ablage ? `<a class="btn" href="#/dok/${e.ablage}">📄 In der Ablage öffnen</a>` : ""}</div></div>
      ${e.nachricht ? `<div class="meldung info"><strong>${esc(person(e.von).name)}:</strong> ${esc(e.nachricht)}</div>` : ""}
      <div class="dokrahmen"><div class="seitenspalte">${seitenHTML(e.seiten, e.felder.map((f) => Object.assign({ art: "feld" }, f)), ctx)}</div>
        <aside class="seitenleiste"><section class="karte"><h2>Unterschriften</h2><ul class="pruefliste">
          ${e.unterschriebenVon.map((u) => `<li><span class="ok">✓</span><span>${esc(u.name)}<br><span class="muted">${esc(u.funktion)} · ${datumZeit(u.zeit)}</span></span></li>`).join("")}
          <li><span>${e.status === "unterschrieben" ? '<span class="ok">✓</span>' : e.status === "abgelehnt" ? "✕" : "○"}</span><span>${esc(D.ICH.name)} (Sie)<br><span class="muted">${e.status === "offen" ? "offen" : e.status === "abgelehnt" ? "abgelehnt: " + esc(e.grund || "") : datumZeit(e.zeit)}</span></span></li></ul></section>
        <section class="karte small"><h2>Rückmeldung</h2><p>Nach dem Unterschreiben meldet ${wordmark("Sign")} das Ergebnis an ${wordmark(e.quelle.replace("EduKSX-", ""))} zurück; dort läuft der Vorgang weiter. Eine Kopie landet in «Unterzeichnet erhalten».</p></section></aside></div>`;
  }

  // ---------------------------------------------------------------- Synchronisation
  function syncJetzt(still) {
    const geaenderte = S.dokumente.filter((d) => d.sync === "ausstehend");
    const ein = S.sync.offen.splice(0);
    geaenderte.forEach((d) => { d.sync = "ok"; ein.push(`↑ ${pfadText(d.ordner)} / ${d.name} (v${d.version || 1})`); });
    S.sync.letzte = jetzt();
    if (!ein.length) ein.push("Keine Änderungen");
    ein.forEach((t) => S.sync.protokoll.unshift({ zeit: S.sync.letzte, text: t }));
    S.sync.protokoll = S.sync.protokoll.slice(0, 60);
    speichern();
    if (!still) toast(`Abgleich abgeschlossen: ${geaenderte.length} Datei(en) übertragen.`);
    const a = document.activeElement;
    if (!still || !a || !(/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable)) render();
  }
  function cloudAenderung() {
    const n = ++S.sync.cloudNr;
    const ziele = ["o-sitzungen", "o-formulare", null, "o-spesen"];
    const ordner = ziele[n % ziele.length];
    const name = freierName(["Protokoll Elternrat.docx", "Merkblatt Spesen.pdf", "Präsentation Elternabend.pdf", "Belege Oktober.xlsx"][n % 4], ordner);
    const typ = typVon(name);
    const inhalt = typ === "docx" ? { absaetze: [{ stil: "h1", html: basis(name) }, { stil: "p", html: "Diese Datei wurde in der Cloud-Ablage (z. B. auf dem Notebook) hinzugefügt und beim Abgleich übernommen." }] }
      : typ === "xlsx" ? { titel: basis(name), summeSpalte: 1, zellen: [["Beleg", "Betrag CHF"], ["Bahn", "12.40"], ["Material", "8.90"]] }
      : { seiten: [{ bloecke: [{ t: "h1", x: basis(name) }, { t: "p", x: "Aus der Cloud-Ablage übernommen (erfundener Inhalt)." }] }] };
    S.dokumente.push({ id: uid("d"), name, typ, ordner, groesse: 30000 + n * 1700, geaendert: jetzt(), version: 1, sync: "ok", status: null, elemente: [], signaturen: [], siegel: null, inhalt });
    S.sync.protokoll.unshift({ zeit: jetzt(), text: `↓ ${pfadText(ordner)} / ${name} (neu aus der Cloud-Ablage)` });
    S.sync.letzte = jetzt(); speichern(); toast(`«${name}» aus der Cloud-Ablage übernommen.`); render();
  }
  function cloudKonflikt() {
    const d = S.dokumente.find((x) => x.typ === "docx" && !gesperrt(x) && x.sync !== "konflikt" && !/Konflikt/.test(x.name));
    if (!d) { toast("Kein passendes Word-Dokument für den Konflikt gefunden."); return; }
    d.sync = "konflikt";
    let text = `⚠ Konflikt: ${pfadText(d.ordner)} / ${d.name} – hier und in der Cloud-Ablage geändert`;
    if (S.sync.konflikt === "beide") {
      const kopie = klon(d); kopie.id = uid("d"); kopie.name = freierName(`${basis(d.name)} (Konflikt Cloud).${endung(d.name)}`, d.ordner); kopie.sync = "ok"; kopie.geaendert = jetzt();
      if (kopie.inhalt.absaetze) kopie.inhalt.absaetze.push({ stil: "p", html: "<i>Ergänzung aus der Cloud-Fassung (erfunden).</i>" });
      S.dokumente.push(kopie); text += ` → beide Fassungen behalten («${kopie.name}»)`;
    } else if (S.sync.konflikt === "neuer") { d.sync = "ok"; text += " → neuere Fassung (Cloud) übernommen"; }
    S.sync.protokoll.unshift({ zeit: jetzt(), text }); speichern(); toast("Konflikt simuliert – siehe Ablage."); render();
  }
  function seiteSync() {
    const s = S.sync;
    const zeilenOrdner = [{ id: null, name: "Meine Ablage" }].concat(S.ordner.slice().sort((a, b) => pfadText(a.id).localeCompare(pfadText(b.id), "de"))).map((o) => {
      const docs = dokumenteIn(o.id); const aus = docs.filter((d) => d.sync === "ausstehend").length; const k = docs.filter((d) => d.sync === "konflikt").length;
      return `<tr><td style="padding-left:${0.7 + pfad(o.id).length * 1}rem">${ICONS.ordner.replace("<svg", '<svg width="16" height="16" style="vertical-align:-3px"')} ${esc(o.name)}</td><td class="zahl">${docs.length}</td><td class="zahl">${docs.length - aus}</td><td>${!s.aktiv ? "–" : k ? '<span class="sync konflikt">⚠ Konflikt</span>' : aus ? `<span class="sync ausstehend">↻ ${aus} ausstehend</span>` : '<span class="sync ok">✓ gleich</span>'}</td></tr>`;
    }).join("");
    const aus = S.dokumente.filter((d) => d.sync === "ausstehend").length + s.offen.length;
    const konf = S.dokumente.filter((d) => d.sync === "konflikt").length;
    const sel = (feld, opts) => `<select data-sync="${feld}">${opts.map(([k, v]) => `<option value="${k}" ${s[feld] === k ? "selected" : ""}>${v}</option>`).join("")}</select>`;
    return `<div class="seitenkopf"><div><h1>Synchronisation</h1><p class="muted">Die Ordnerstruktur Ihrer Ablage wird mit einem Ordner Ihrer persönlichen Cloud-Ablage abgeglichen – inklusive aller Unterordner und Dateien, in beide Richtungen. So sind die Dokumente auch auf dem Notebook und im Dateiexplorer verfügbar.</p></div>
        <div class="aktionen"><button class="btn primaer" data-aktion="sync-jetzt" ${s.aktiv ? "" : "disabled"}>↻ Jetzt abgleichen</button></div></div>
      <div class="syncbild"><div class="karte"><div>${ICON_SIGN.replace("<svg", '<svg width="32" height="32"')}</div><strong>${wordmark("Sign")} · Meine Ablage</strong><div class="small muted">${S.ordner.length} Ordner · ${S.dokumente.length} Dateien</div></div>
        <div class="pfeil" aria-label="${s.richtung === "beide" ? "in beide Richtungen" : "nur hochladen"}">${s.richtung === "beide" ? "⇄" : "→"}</div>
        <div class="karte"><div style="font-size:1.6rem" aria-hidden="true">☁</div><strong>Cloud-Ablage</strong><div class="small muted">${esc(s.ziel)}</div></div></div>
      <div class="meldung ${!s.aktiv ? "warnung" : konf ? "fehler" : aus ? "info" : ""}" style="margin-top:1rem">${!s.aktiv ? "Abgleich ausgeschaltet." : konf ? `⚠ ${konf} Datei(en) mit Konflikt – in der Datei «Diese Fassung behalten» wählen oder die Konflikt-Kopie löschen.` : aus ? `↻ ${aus} Änderung(en) warten auf den nächsten Abgleich (${s.intervall === "sofort" ? "sofort" : "alle " + s.intervall + " Min."}).` : "✓ Alles abgeglichen."} Letzter Abgleich: ${datumZeit(s.letzte)}.</div>
      <div class="spalten"><section class="karte"><h2>Einstellungen</h2>
          <label class="small" style="display:block;margin-bottom:.6rem"><input type="checkbox" data-sync="aktiv" ${s.aktiv ? "checked" : ""}> Abgleich mit der Cloud-Ablage eingeschaltet</label>
          <div class="formzeile"><label class="feld" style="flex:1">Zielordner in der Cloud-Ablage<input type="text" data-sync="ziel" value="${esc(s.ziel)}" style="width:100%"></label></div>
          <div class="formzeile"><label class="feld">Richtung${sel("richtung", [["beide", "in beide Richtungen"], ["hoch", "nur hochladen (Sicherung)"]])}</label>
            <label class="feld">Abgleich${sel("intervall", [["sofort", "sofort bei Änderung"], ["5", "alle 5 Minuten"], ["15", "alle 15 Minuten"], ["60", "stündlich"]])}</label>
            <label class="feld">Bei Konflikt${sel("konflikt", [["beide", "beide Fassungen behalten"], ["neuer", "neuere Fassung gewinnt"], ["fragen", "nachfragen"]])}</label></div>
          <p class="small muted">Signierte und versiegelte Dateien werden in der Cloud-Ablage schreibgeschützt abgelegt; Änderungen dort erzeugen eine Kopie statt die Signatur zu brechen.</p>
          <h3 style="margin-top:1rem">Ausprobieren</h3><div class="formzeile"><button class="btn" data-aktion="sync-cloud" ${s.aktiv ? "" : "disabled"}>↓ Neue Datei in der Cloud simulieren</button><button class="btn" data-aktion="sync-konflikt" ${s.aktiv ? "" : "disabled"}>⚠ Konflikt simulieren</button></div></section>
        <section class="karte"><h2>Ordnerabgleich</h2><div class="tabelle-wrap"><table><thead><tr><th>Ordner</th><th class="zahl">hier</th><th class="zahl">Cloud</th><th>Stand</th></tr></thead><tbody>${zeilenOrdner}</tbody></table></div></section></div>
      <section class="karte" style="margin-top:1rem"><h2>Protokoll</h2><ol class="zeitachse">${s.protokoll.slice(0, 25).map((e) => `<li><time>${esc(datumZeit(e.zeit))}</time>${esc(e.text)}</li>`).join("")}</ol></section>`;
  }

  // ---------------------------------------------------------------- Einbindung in die Plattform
  const ANFRAGEN = {
    staffing: { quelle: "EduKSX-Staffing", von: "p2", titel: "Pensenvereinbarung Schuljahr 2027/28", datei: "Pensenvereinbarung_2027-28.pdf", stufe: "aes", nachricht: "Bitte die Pensenvereinbarung bestätigen.",
      bloecke: [{ t: "klein", x: "Einsatzplanung" }, { t: "h1", x: "Pensenvereinbarung 2027/28" }, { t: "tabelle", kopf: ["Bereich", "Lektionen"], zeilen: [["Unterricht", "–"], ["Schulverwaltung", "80 %"]] }, { t: "p", x: "Mit der Unterschrift wird die Vereinbarung bestätigt." }] },
    time: { quelle: "EduKSX-Time", von: "p1", titel: "Monatsvisum November 2026", datei: "Monatsvisum_2026-11.pdf", stufe: "ses", nachricht: "Monatsabschluss November – bitte visieren.",
      bloecke: [{ t: "klein", x: "Zeiterfassung · Monatsabschluss" }, { t: "h1", x: "Monatsvisum November 2026" }, { t: "tabelle", kopf: ["Position", "Stunden"], zeilen: [["Soll", "134:24"], ["Ist", "133:50"], ["Saldo Monat", "-0:34"]] }, { t: "p", x: "Ich bestätige die Richtigkeit der erfassten Zeiten." }] },
    flow: { quelle: "EduKSX-Flow", von: "p1", titel: "Onboarding: Merkblatt Datenschutz", datei: "Merkblatt_Datenschutz_Bestaetigung.pdf", stufe: "ses", nachricht: "Schritt «Merkblatt Datenschutz bestätigen» aus dem Onboarding-Ablauf.",
      bloecke: [{ t: "klein", x: "Ablauf Onboarding · Schritt 7" }, { t: "h1", x: "Bestätigung Merkblatt Datenschutz" }, { t: "p", x: "Ich habe das Merkblatt Datenschutz und die Nutzungsrichtlinie ICT gelesen und verstanden." }] },
    core: { quelle: "EduKSX-Core", von: "p3", titel: "Protokoll Schulpflegesitzung 11/2026", datei: "Protokoll_SPf_2026-11.pdf", stufe: "qes", nachricht: "Protokoll zur Unterzeichnung durch die Aktuarin.",
      bloecke: [{ t: "klein", x: "Schulpflege · Protokoll" }, { t: "h1", x: "Protokoll der Sitzung vom 12.11.2026" }, { t: "p", x: "Traktanden 1–6 (erfundener Inhalt). Beschlüsse siehe Beilage." }] },
  };
  function anfrageSimulieren(k) {
    const a = ANFRAGEN[k];
    const e = { id: uid("e"), quelle: a.quelle, von: a.von, titel: a.titel, datei: a.datei, erhalten: jetzt(), frist: plusTage(heute(), 5), stufe: a.stufe, rechtsraum: "zertes", status: "offen", nachricht: a.nachricht,
      seiten: [{ bloecke: a.bloecke.concat([{ t: "abstand" }]) }], felder: [{ id: "f1", seite: 0, x: 8, y: 60, w: 36, h: 9, person: "ich" }], unterschriebenVon: [] };
    S.eingang.unshift(e); speichern(); toast(`Neue Signaturanfrage aus ${a.quelle}.`); location.hash = "#/eingang/" + e.id;
  }
  function seiteEinbindung() {
    const karte = (k, modul, text) => `<section class="karte"><h3>${wordmark(modul)}</h3><p class="small">${esc(text)}</p>${k ? `<button class="btn klein" data-aktion="anfrage" data-k="${k}">Anfrage simulieren</button>` : ""}</section>`;
    return `<div class="seitenkopf"><div><h1>Einbindung in die Plattform</h1><p class="muted">${wordmark("Sign")} ist ein eigenständiges Modul und zugleich der Signaturdienst für alle anderen Anwendungen. Jedes Modul übergibt Dokumente über dieselbe Schnittstelle und erhält das Ergebnis zurück; die Unterzeichnenden erledigen alles an einem Ort («Zu unterschreiben»).</p></div></div>
      <div class="einbindung">
        ${karte("staffing", "Staffing", "Anstellungsverfügungen, Pensenvereinbarungen und Stellvertretungsverträge zur Unterschrift; Rückmeldung setzt den Anstellungsschritt auf erledigt.")}
        ${karte("time", "Time", "Monatsvisum der Zeiterfassung (Mitarbeiter:in, danach vorgesetzte Person) mit einfacher Signatur.")}
        ${karte("flow", "Flow", "Ablaufschritt «Unterschrift einholen» ruft den Vorgang sign.prozess.starten auf und wartet auf die Rückmeldung.")}
        ${karte("core", "Core", "Protokolle, Verfügungen und Beschlüsse der Behörde; qualifizierte Signatur und Organisationssiegel.")}
        ${karte(null, "Connect", "Fremdanwendungen (Schulverwaltungs-, Lohn- und Finanzsoftware) über Konnektoren anbinden – dieselbe Schnittstelle, gleicher Eingang.")}
        ${karte(null, "Shop", "Bestellungen und Ausleihen (z. B. Geräteausleihe) mit Vereinbarung zur Unterschrift.")}
      </div>
      <div class="spalten" style="margin-top:1rem"><section class="karte"><h2>Schnittstelle (Entwurf)</h2>
        <ul class="infoliste small">
          <li><code>POST /sign/v1/prozesse</code> – Dokument (PDF/A, Word, Excel) mit Unterzeichnenden, Stufe, Feldern oder Platzhaltern <code>#sign#n#</code> übergeben</li>
          <li><code>GET /sign/v1/prozesse/{id}</code> – Status und Verlauf</li>
          <li><code>POST /sign/v1/siegel</code> – Dokument mit dem Organisationssiegel versehen (ohne Unterschrift)</li>
          <li><code>POST /sign/v1/pruefen</code> – Signaturen und Siegel eines PDF prüfen</li>
          <li>Ereignisse: <code>sign.prozess.abgeschlossen</code>, <code>sign.prozess.abgelehnt</code> – mit Ablageort des Ergebnisses</li></ul></section>
        <section class="karte"><h2>Weitere Einstiege (Ideen, ZU PRÜFEN)</h2><ul class="infoliste small">
          <li>Kontextmenü «Mit EduKSX-Sign signieren» im Dateiexplorer über den abgeglichenen Ordner</li>
          <li>Add-in in den Office-Programmen: Dokument direkt aus Word/Excel in den Signaturprozess geben</li>
          <li>Mobil: Unterschreiben auf dem Telefon (installierbare Web-App, wie EduKSX-Time)</li>
          <li>E-Mail-Benachrichtigung mit Direktlink auf das Feld</li></ul></section></div>`;
  }

  // ---------------------------------------------------------------- Meine Unterschrift
  function seiteProfil() {
    return `<div class="seitenkopf"><div><h1>Meine Unterschrift</h1><p class="muted">Das Bild Ihrer Unterschrift erscheint im Dokument. Rechtlich massgebend ist die elektronische Signatur dahinter (Stufe und Bestätigung beim Unterschreiben).</p></div></div>
      <div class="spalten"><section class="karte"><h2>Unterschrift zeichnen</h2>
          <canvas class="zeichenflaeche" width="900" height="300" aria-label="Zeichenfläche für die Unterschrift – mit Maus, Finger oder Stift zeichnen"></canvas>
          <div class="formzeile" style="margin-top:.6rem"><button class="btn" data-aktion="zeichnen-leeren">Leeren</button><button class="btn" data-aktion="zeichnen-name">Name als Schriftzug</button><button class="btn primaer" data-aktion="zeichnen-speichern">Speichern</button></div></section>
        <section class="karte"><h2>Gespeichert</h2>${S.unterschrift ? `<div class="unterschrift-vorschau"><img src="${S.unterschrift}" alt="Gespeicherte Unterschrift"></div><p class="small muted" style="margin-top:.5rem">${esc(D.ICH.name)}</p>` : '<p class="muted">Noch keine Unterschrift gespeichert. Beim ersten Unterschreiben werden Sie danach gefragt.</p>'}
          <h3 style="margin-top:1rem">Voreinstellung für neue Prozesse</h3>
          <div class="formzeile"><label class="feld">Signaturstufe<select data-einst="stufe">${Object.entries(STUFEN).map(([k, v]) => `<option value="${k}" ${S.einst.stufe === k ? "selected" : ""}>${v.kurz} – ${v.name}</option>`).join("")}</select></label>
            <label class="feld">Rechtsraum<select data-einst="rechtsraum">${Object.entries(RECHTSRAUM).map(([k, v]) => `<option value="${k}" ${S.einst.rechtsraum === k ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
          <h3 style="margin-top:1rem">Organisationssiegel</h3><p class="small">🔏 ${esc(D.ORGANISATION.siegel)}<br><span class="muted">Zertifikat der Organisation, verwaltet von der Administration. Berechtigt zum Versiegeln: Schulverwaltung, Schulleitung.</span></p>
          <h3 style="margin-top:1rem">Identifikation</h3><p class="small">✓ Mobilnummer bestätigt (${esc(D.ICH.tel)}) – für FES<br>✓ Identifikation für QES vorhanden (simuliert)</p></section></div>`;
  }
  let zeichnung = { striche: 0 };
  function zeichenflaecheVorbereiten() {
    const c = document.querySelector("canvas.zeichenflaeche"); if (!c) return;
    const g = c.getContext("2d"); g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#08415f";
    zeichnung = { striche: 0 };
    let an = false;
    const pt = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
    c.addEventListener("pointerdown", (e) => { an = true; c.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); zeichnung.striche++; });
    c.addEventListener("pointermove", (e) => { if (!an) return; const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); });
    c.addEventListener("pointerup", () => { an = false; });
  }
  function zeichnungAlsBild() {
    const c = document.querySelector("canvas.zeichenflaeche");
    if (!c || !zeichnung.striche) return null;
    return c.toDataURL("image/png");
  }

  // ---------------------------------------------------------------- Dialoge
  function dialogHTML() {
    const dl = E.dialog; if (!dl) return "";
    const kopf = (t) => `<h2 id="dlg-titel">${esc(t)}</h2>`;
    const fuss = (ok, okCls = "primaer", dis = "") => `<div class="formzeile" style="justify-content:flex-end;margin:1rem 0 0"><button class="btn" data-aktion="dialog-zu">Abbrechen</button><button class="btn ${okCls}" data-aktion="dialog-ok" ${dis}>${esc(ok)}</button></div>`;
    let inhalt = "";
    if (dl.art === "frage") inhalt = kopf(dl.titel) + `<p>${dl.text}</p>` + fuss(dl.ok, dl.gefahr ? "gefahr" : "primaer");
    else if (dl.art === "eingabe") inhalt = kopf(dl.titel) + dl.felder.map((f, i) => `<label class="feld" style="margin-bottom:.6rem">${esc(f.label)}${f.mehrzeilig ? `<textarea data-dlg="${i}" rows="3">${esc(f.wert || "")}</textarea>` : `<input type="${f.typ || "text"}" data-dlg="${i}" value="${esc(f.wert || "")}" style="width:100%">`}</label>`).join("") + fuss(dl.ok);
    else if (dl.art === "verschieben") inhalt = kopf("Verschieben: " + dl.name) + `<label class="feld">Zielordner<select data-dlg="0">${[["", "Meine Ablage"]].concat(S.ordner.map((o) => [o.id, pfadText(o.id)])).sort((a, b) => a[1].localeCompare(b[1], "de")).map(([k, v]) => `<option value="${k}" ${k === (dl.ordner || "") ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>` + fuss("Verschieben");
    else if (dl.art === "versiegeln") {
      const d = dok(dl.dokId);
      const umw = d.typ !== "pdf";
      inhalt = kopf("Dokument versiegeln") + `<p class="small">Das elektronische Siegel bestätigt, dass «${esc(d.name)}» von der <strong>${esc(D.ORGANISATION.name)}</strong> stammt und seither nicht verändert wurde. Es ersetzt keine persönliche Unterschrift.</p>
        ${umw ? `<div class="meldung info small">Das Dokument wird zuerst in PDF/A umgewandelt; das Original bleibt unverändert.</div>` : ""}
        <div class="formzeile"><label class="feld">Siegel<select disabled><option>${esc(D.ORGANISATION.siegel)}</option></select></label></div>
        <div class="formzeile"><label class="feld">Stufe<select data-dlg="stufe"><option value="aes">Fortgeschrittenes Siegel</option><option value="qes">Qualifiziertes Siegel</option></select></label>
          <label class="feld">Rechtsraum<select data-dlg="rechtsraum">${Object.entries(RECHTSRAUM).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label></div>
        <label class="small"><input type="checkbox" data-dlg="sichtbar" checked> Siegelbild auf der letzten Seite anzeigen</label>
        <p class="small muted" style="margin-top:.6rem">Ergebnis: ${d.status === "signiert" ? `das signierte Dokument erhält zusätzlich das Siegel (bestehende Signaturen bleiben gültig).` : `«${esc(basis(d.name))}_seal.pdf» im selben Ordner.`}</p>` + fuss("🔏 Versiegeln");
    } else if (dl.art === "signieren") {
      const stufe = dl.stufe;
      const hatBild = !!S.unterschrift;
      inhalt = kopf(`Unterschreiben – ${STUFEN[stufe].kurz}`) + `<p class="small muted">${esc(dl.titel)} · ${esc(STUFEN[stufe].name)} · ${esc(RECHTSRAUM[dl.rechtsraum])}</p>
        ${dl.rolle === "genehmigen" ? "" : hatBild && !dl.neuZeichnen ? `<div class="unterschrift-vorschau"><img src="${S.unterschrift}" alt="Ihre Unterschrift"></div><button class="link small" data-aktion="dlg-neu-zeichnen">Andere Unterschrift zeichnen</button>`
          : `<p class="small">Zeichnen Sie Ihre Unterschrift (wird für künftige Unterschriften gespeichert):</p><canvas class="zeichenflaeche" width="900" height="300" aria-label="Zeichenfläche für die Unterschrift"></canvas><div class="formzeile" style="margin-top:.4rem"><button class="btn klein" data-aktion="zeichnen-leeren">Leeren</button><button class="btn klein" data-aktion="zeichnen-name">Name als Schriftzug</button></div>`}
        <div style="margin-top:.9rem">${stufe === "ses"
          ? `<label class="small"><input type="checkbox" data-dlg="bestaetigt"> Ich ${dl.rolle === "genehmigen" ? "genehmige" : "unterschreibe"} dieses Dokument elektronisch.</label>`
          : `<p class="small">Bestätigungscode an ${esc(D.ICH.tel)} gesendet (Prototyp: Code <strong>123456</strong>).</p><label class="feld">Bestätigungscode<input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" class="code-eingabe" data-dlg="code"></label>${stufe === "qes" ? '<p class="small muted">QES: Identifikation vorhanden ✓ – Zeitstempel und qualifiziertes Zertifikat werden eingebettet.</p>' : ""}`}</div>
        <p class="small" id="dlg-fehler" style="color:var(--destructive)" role="alert"></p>` + fuss(dl.rolle === "genehmigen" ? "✓ Genehmigen" : "✍ Unterschreiben");
    }
    return `<dialog id="dlg" aria-labelledby="dlg-titel">${inhalt}</dialog>`;
  }
  function frage(titel, text, ok, fn, gefahr) { E.dialog = { art: "frage", titel, text, ok, fn, gefahr }; render(); }
  function eingabe(titel, felder, ok, fn) { E.dialog = { art: "eingabe", titel, felder, ok, fn }; render(); }
  function dialogOk() {
    const dl = E.dialog; const dlg = document.getElementById("dlg");
    const wert = (k) => { const el = dlg.querySelector(`[data-dlg="${k}"]`); return el ? (el.type === "checkbox" ? el.checked : el.value) : null; };
    if (dl.art === "frage") { E.dialog = null; dl.fn(); render(); return; }
    if (dl.art === "eingabe") { const w = dl.felder.map((_, i) => wert(i)); const fehler = dl.fn(w); if (fehler) { toast(fehler); return; } E.dialog = null; render(); return; }
    if (dl.art === "verschieben") { const d = dok(dl.dokId); const ziel = wert(0) || null; if (ziel !== (d.ordner || null)) { syncNotiz(`→ ${d.name}: ${pfadText(d.ordner)} → ${pfadText(ziel)}`); d.ordner = ziel; d.name = freierName(d.name, ziel); speichern(); toast(`Verschoben nach «${pfadText(ziel)}».`); } E.dialog = null; render(); return; }
    if (dl.art === "versiegeln") { versiegeln(dl.dokId, { stufe: wert("stufe"), rechtsraum: wert("rechtsraum"), sichtbar: wert("sichtbar") }); return; }
    if (dl.art === "signieren") {
      const fehler = (t) => { dlg.querySelector("#dlg-fehler").textContent = t; };
      let bild = S.unterschrift;
      if (dl.rolle !== "genehmigen" && (!bild || dl.neuZeichnen)) { bild = zeichnungAlsBild(); if (!bild) { fehler("Bitte zuerst eine Unterschrift zeichnen."); return; } S.unterschrift = bild; }
      if (dl.stufe === "ses" && !wert("bestaetigt")) { fehler("Bitte die Bestätigung ankreuzen."); return; }
      if (dl.stufe !== "ses" && String(wert("code")).replace(/\s/g, "") !== "123456") { fehler("Code stimmt nicht (Prototyp: 123456)."); return; }
      E.dialog = null; dl.fn(bild); render();
    }
  }
  function versiegeln(dokId, opt) {
    const d = dok(dokId);
    if (d.status === "signiert") {
      siegelAnbringen(d, opt); d.geaendert = jetzt(); d.sync = "ausstehend"; syncNotiz(`🔏 ${d.name} versiegelt`);
      speichern(); E.dialog = null; toast(`«${d.name}» versiegelt.`); render(); return;
    }
    const n = freierName(basis(d.name) + "_seal.pdf", d.ordner);
    const els = d.typ === "pdf" ? klon(d.elemente || []).filter((e) => ["text", "datum", "kommentar"].includes(e.art)).map((e) => (e.art === "kommentar" ? e : Object.assign(e, { art: "fix" }))) : [];
    const neu = { id: uid("d"), name: n, typ: "pdf", ordner: d.ordner, groesse: Math.round((d.groesse || 30000) * 1.2), geaendert: jetzt(), version: 1, sync: "ausstehend", status: "versiegelt", inhalt: { seiten: zuPdfSeiten(d) }, elemente: els, signaturen: [], siegel: null };
    siegelAnbringen(neu, opt);
    S.dokumente.push(neu); speichern();
    E.dialog = null; toast(`«${n}» erstellt und versiegelt.`); location.hash = "#/dok/" + neu.id; render();
  }

  // ---------------------------------------------------------------- Hochladen und Ziehen
  function hochladen(liste, ordner) {
    const dateien = Array.from(liste || []); if (!dateien.length) return;
    dateien.forEach((f) => {
      const typ = typVon(f.name);
      const name = freierName(f.name, ordner);
      const d = { id: uid("d"), name, typ, ordner: ordner || null, groesse: f.size, geaendert: jetzt(), version: 1, sync: "ausstehend", status: null, elemente: [], signaturen: [], siegel: null, hochgeladen: true, inhalt: {} };
      if (typ === "pdf") d.inhalt = { seiten: [{ bloecke: [{ t: "klein", x: name }], leer: "Hochgeladenes PDF – der Inhalt wird im Prototyp nicht dargestellt. Text, Kommentar, Datum und Unterschriftsfelder lassen sich trotzdem setzen und signieren." }] };
      if (typ === "docx") d.inhalt = { absaetze: [{ stil: "h1", html: esc(basis(name)) }, { stil: "p", html: "<i>Der Inhalt der hochgeladenen Datei wird im Prototyp nicht ausgelesen – hier kann Text erfasst werden.</i>" }] };
      if (typ === "xlsx") d.inhalt = { titel: basis(name), zellen: [["A", "B", "C"], ["(Inhalt wird im Prototyp nicht ausgelesen)", "", ""]] };
      if (typ === "bild") d.inhalt = { src: null };
      if (typ === "text") d.inhalt = { text: "" };
      try { DATEIEN.set(d.id, URL.createObjectURL(f)); } catch (e) { /* ohne Download */ }
      if (typ === "bild" && f.size < 1500000) { const r = new FileReader(); r.onload = () => { d.inhalt.src = r.result; speichern(); render(); }; r.readAsDataURL(f); }
      if (typ === "text" && f.size < 300000) { const r = new FileReader(); r.onload = () => { d.inhalt.text = String(r.result); speichern(); render(); }; r.readAsText(f); }
      S.dokumente.push(d);
    });
    speichern();
    toast(`${dateien.length} Datei${dateien.length > 1 ? "en" : ""} in «${pfadText(ordner)}» abgelegt – Abgleich ausstehend.`);
    if (S.sync.aktiv && S.sync.intervall === "sofort") setTimeout(() => syncJetzt(true), 900);
    render();
  }
  let ziehTiefe = 0;
  document.addEventListener("dragstart", (e) => {
    const z = e.target.closest && e.target.closest("[data-dok-ziehen]");
    if (z) { e.dataTransfer.setData("text/x-sign-dok", z.dataset.dokZiehen); e.dataTransfer.effectAllowed = "move"; }
  });
  document.addEventListener("dragover", (e) => {
    const typen = Array.from(e.dataTransfer.types || []);
    if (!typen.includes("Files") && !typen.includes("text/x-sign-dok")) return;
    e.preventDefault();
    document.querySelectorAll(".ziel-aktiv").forEach((x) => x.classList.remove("ziel-aktiv"));
    const ziel = e.target.closest("[data-ordner-ziel]");
    if (ziel) ziel.classList.add("ziel-aktiv");
    const zone = document.querySelector("[data-ablagezone]");
    if (zone && typen.includes("Files")) zone.classList.toggle("ziehen", !ziel && !!e.target.closest("[data-ablagezone]"));
    e.dataTransfer.dropEffect = typen.includes("Files") ? "copy" : "move";
  });
  document.addEventListener("dragenter", () => { ziehTiefe++; });
  document.addEventListener("dragleave", () => { ziehTiefe--; if (ziehTiefe <= 0) { ziehTiefe = 0; aufraeumen(); } });
  function aufraeumen() { document.querySelectorAll(".ziel-aktiv").forEach((x) => x.classList.remove("ziel-aktiv")); const z = document.querySelector(".ablagezone.ziehen"); if (z) z.classList.remove("ziehen"); }
  document.addEventListener("drop", (e) => {
    const typen = Array.from(e.dataTransfer.types || []);
    if (!typen.includes("Files") && !typen.includes("text/x-sign-dok")) return;
    e.preventDefault(); ziehTiefe = 0; aufraeumen();
    const ziel = e.target.closest("[data-ordner-ziel]");
    const zone = e.target.closest("[data-ablagezone]");
    const ordner = ziel ? (ziel.dataset.ordnerZiel || null) : zone ? (zone.dataset.ablagezone || null) : null;
    if (typen.includes("Files") && e.dataTransfer.files.length) {
      if (!ziel && !zone) { toast("Zum Hochladen die Dateien in die Ablage ziehen."); return; }
      hochladen(e.dataTransfer.files, ordner); return;
    }
    const id = e.dataTransfer.getData("text/x-sign-dok");
    if (id && ziel) { const d = dok(id); if (d && (d.ordner || null) !== ordner) { syncNotiz(`→ ${d.name}: ${pfadText(d.ordner)} → ${pfadText(ordner)}`); d.ordner = ordner; d.name = freierName(d.name, ordner); speichern(); toast(`«${d.name}» nach «${pfadText(ordner)}» verschoben.`); render(); } }
  });

  // ---------------------------------------------------------------- Elemente platzieren und verschieben
  function elementListe(quelle) {
    const [art, id] = quelle.split(":");
    if (art === "dok") return dok(id).elemente;
    if (art === "prozess") return prozess(id).felder;
    return [];
  }
  function nachAenderung(quelle, text) { const [art, id] = quelle.split(":"); if (art === "dok") geaendert(dok(id), text); else speichern(); }
  function platzieren(seiteEl, ev) {
    const quelle = seiteEl.dataset.quelle; const r = seiteEl.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * 100, y = (ev.clientY - r.top) / r.height * 100;
    const seite = Number(seiteEl.dataset.seite);
    const liste = elementListe(quelle);
    const klemm = (v, max) => Math.max(0, Math.min(max, v));
    if (quelle.startsWith("prozess:")) {
      const p = prozess(quelle.split(":")[1]);
      const pers = p.personen[E.aktivPerson];
      liste.push({ id: uid("f"), seite, x: klemm(x - 18, 64), y: klemm(y - 4.5, 91), w: 36, h: 9, person: pers.id });
      speichern(); render(); return;
    }
    const w = E.werkzeug;
    const el = { id: uid("e"), art: w, seite, x: klemm(x - 1, 92), y: klemm(y - 1.2, 96) };
    if (w === "text") el.text = "Text";
    if (w === "datum") el.text = datum(heute());
    if (w === "kommentar") { el.text = ""; el.nr = liste.filter((e) => e.art === "kommentar").length + 1; }
    if (w === "feld") { Object.assign(el, { x: klemm(x - 17, 66), y: klemm(y - 4, 92), w: 34, h: 8, person: "ich" }); }
    liste.push(el); E.auswahl = el.id;
    if (w !== "kommentar") E.werkzeug = "auswahl";
    nachAenderung(quelle, null); render();
    const neu = document.querySelector(`[data-eltext="${el.id}"]`) || document.getElementById("k-" + el.id);
    if (neu) { neu.focus(); if (neu.isContentEditable) document.execCommand("selectAll", false, null); }
  }
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".el.beweglich");
    if (!el || e.target.closest(".weg") || (e.target.isContentEditable && E.auswahl === el.dataset.el)) return;
    const seite = el.closest(".seite"); if (!seite) return;
    const r = seite.getBoundingClientRect();
    E.ziehen = { el, id: el.dataset.el, quelle: seite.dataset.quelle, r, sx: e.clientX, sy: e.clientY, ox: parseFloat(el.style.left), oy: parseFloat(el.style.top), bewegt: false };
    el.setPointerCapture(e.pointerId);
  });
  document.addEventListener("pointermove", (e) => {
    const z = E.ziehen; if (!z) return;
    const dx = e.clientX - z.sx, dy = e.clientY - z.sy;
    if (!z.bewegt && Math.hypot(dx, dy) < 4) return;
    z.bewegt = true; e.preventDefault();
    z.nx = Math.max(0, Math.min(97, z.ox + dx / z.r.width * 100)); z.ny = Math.max(0, Math.min(97, z.oy + dy / z.r.height * 100));
    z.el.style.left = z.nx + "%"; z.el.style.top = z.ny + "%";
  });
  document.addEventListener("pointerup", () => {
    const z = E.ziehen; if (!z) return; E.ziehen = null;
    if (z.bewegt) { const el = elementListe(z.quelle).find((x) => x.id === z.id); if (el) { el.x = z.nx; el.y = z.ny; nachAenderung(z.quelle, null); } }
    else { document.querySelectorAll(".el.ausgewaehlt").forEach((x) => x.classList.remove("ausgewaehlt")); z.el.classList.add("ausgewaehlt"); E.auswahl = z.id; }
  });

  // ---------------------------------------------------------------- Aktionen
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-aktion]");
    if (!t) {
      const s = ev.target.closest(".seite[data-platzieren]");
      if (s && !ev.target.closest(".el, input, label, [contenteditable]")) platzieren(s, ev);
      if (!ev.target.closest("details.menu")) document.querySelectorAll("details.menu[open]").forEach((d) => d.removeAttribute("open"));
      return;
    }
    if (t.tagName === "INPUT" || t.tagName === "SELECT") return;
    const a = t.dataset.aktion;
    const p = t.dataset.p ? prozess(t.dataset.p) : null;
    const d = t.dataset.dok ? dok(t.dataset.dok) : null;
    switch (a) {
      case "thema": document.documentElement.classList.toggle("dark"); try { localStorage.setItem("eduksx-thema", document.documentElement.classList.contains("dark") ? "dunkel" : "hell"); } catch (e) { /* */ } render(); break;
      case "zuruecksetzen": frage("Testdaten neu laden?", "Alle Änderungen, hochgeladenen Dateien und Signaturprozesse in diesem Prototyp werden verworfen.", "Neu laden", () => { S = neuerZustand(); DATEIEN.clear(); speichern(); location.hash = "#/uebersicht"; }, true); break;
      case "dialog-zu": E.dialog = null; render(); break;
      case "hochladen-waehlen": document.getElementById("hochladen").click(); break;
      case "dialog-ok": dialogOk(); break;
      case "dlg-neu-zeichnen": E.dialog.neuZeichnen = true; render(); break;
      // Ablage
      case "ordner-neu": eingabe("Neuer Ordner", [{ label: "Name" }], "Anlegen", ([n]) => {
        n = String(n || "").trim(); if (!n) return "Bitte einen Namen eingeben.";
        const eltern = t.dataset.ordner || null;
        if (kinder(eltern).some((o) => o.name.toLowerCase() === n.toLowerCase())) return "Diesen Ordner gibt es hier schon.";
        S.ordner.push({ id: uid("o"), name: n, eltern }); syncNotiz(`+ Ordner ${pfadText(eltern)} / ${n}`); speichern(); toast(`Ordner «${n}» angelegt.`); return null;
      }); break;
      case "ordner-umbenennen": { const o = ordnerVon(t.dataset.ordner); eingabe("Ordner umbenennen", [{ label: "Name", wert: o.name }], "Umbenennen", ([n]) => { n = String(n || "").trim(); if (!n) return "Bitte einen Namen eingeben."; syncNotiz(`✎ Ordner ${o.name} → ${n}`); o.name = n; speichern(); return null; }); break; }
      case "ordner-loeschen": {
        const o = ordnerVon(t.dataset.ordner); const n = anzahlIn(o.id); const u = unterordnerAlle(o.id).length;
        frage(`Ordner «${o.name}» löschen?`, n || u ? `Der Ordner enthält <strong>${n} Datei(en)</strong>${u ? ` und ${u} Unterordner` : ""}. Alles wird gelöscht – auch in der Cloud-Ablage.` : "Der leere Ordner wird auch in der Cloud-Ablage gelöscht.", "Löschen", () => {
          const ids = [o.id].concat(unterordnerAlle(o.id));
          S.dokumente = S.dokumente.filter((x) => !ids.includes(x.ordner)); S.ordner = S.ordner.filter((x) => !ids.includes(x.id));
          syncNotiz(`✕ Ordner ${o.name} gelöscht (${n} Dateien)`); speichern(); toast(`Ordner «${o.name}» gelöscht.`);
          if (location.hash.includes(o.id)) location.hash = "#/ablage" + (o.eltern ? "/" + o.eltern : "");
        }, true); break;
      }
      case "umbenennen": eingabe("Umbenennen", [{ label: "Dateiname", wert: d.name }], "Umbenennen", ([n]) => {
        n = String(n || "").trim(); if (!n) return "Bitte einen Namen eingeben.";
        if (endung(n) !== endung(d.name)) n = n + "." + endung(d.name);
        if (n !== d.name && S.dokumente.some((x) => x.name === n && x.ordner === d.ordner)) return "Diesen Namen gibt es im Ordner schon.";
        syncNotiz(`✎ ${d.name} → ${n}`); d.name = n; d.sync = d.sync === "konflikt" ? d.sync : "ausstehend"; speichern(); return null;
      }); break;
      case "verschieben": E.dialog = { art: "verschieben", dokId: d.id, name: d.name, ordner: d.ordner }; render(); break;
      case "loeschen": frage(`«${d.name}» löschen?`, `Die Datei wird aus «${esc(pfadText(d.ordner))}» und beim nächsten Abgleich auch aus der Cloud-Ablage gelöscht.${d.status ? " <strong>Es handelt sich um ein signiertes bzw. versiegeltes Dokument.</strong>" : ""}`, "Löschen", () => {
        S.dokumente = S.dokumente.filter((x) => x.id !== d.id); if (DATEIEN.has(d.id)) { URL.revokeObjectURL(DATEIEN.get(d.id)); DATEIEN.delete(d.id); }
        syncNotiz(`✕ ${pfadText(d.ordner)} / ${d.name} gelöscht`); speichern(); toast(`«${d.name}» gelöscht.`);
        if (location.hash === "#/dok/" + d.id) location.hash = "#/ablage" + (d.ordner ? "/" + d.ordner : "");
      }, true); break;
      case "kopie": {
        const k = klon(d); k.id = uid("d"); k.name = freierName(basis(d.name).replace(/_(sign|seal)$/, "") + " (Kopie).pdf", d.ordner); k.status = null; k.signaturen = []; k.siegel = null; k.version = 1; k.sync = "ausstehend"; k.geaendert = jetzt();
        k.elemente = k.elemente.filter((e) => !["sig", "siegel"].includes(e.art)); delete k.pruefsumme; delete k.prozessId;
        if (k.inhalt.seiten && d.prozessId) k.inhalt.seiten = k.inhalt.seiten.slice(0, -1);
        S.dokumente.push(k); speichern(); toast("Bearbeitbare Kopie ohne Signaturen erstellt."); location.hash = "#/dok/" + k.id; break;
      }
      case "konflikt-loesen": d.sync = "ausstehend"; syncNotiz(`✓ Konflikt ${d.name}: lokale Fassung behalten`); speichern(); render(); break;
      // Bearbeiten
      case "werkzeug": E.werkzeug = t.dataset.werkzeug; E.auswahl = null; render(); break;
      case "el-weg": {
        const seite = t.closest(".seite"); const q = seite.dataset.quelle; const liste = elementListe(q);
        const i = liste.findIndex((x) => x.id === t.dataset.el); if (i >= 0) liste.splice(i, 1);
        liste.filter((x) => x.art === "kommentar").forEach((x, n) => { x.nr = n + 1; });
        nachAenderung(q, null); render(); break;
      }
      case "format": ev.preventDefault(); document.execCommand(t.dataset.befehl, false, null); wordMarkieren(); break;
      case "absatz-stil": { const f = document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-absatz]") || E.letzterAbsatz; if (!f) { toast("Zuerst in einen Absatz klicken."); break; } f.className = "s-" + t.dataset.stil; f.dataset.stil = t.dataset.stil; wordMarkieren(); break; }
      case "absatz-neu": { const blatt = document.querySelector("[data-word]"); const n = blatt.querySelectorAll("[data-absatz]").length; const div = document.createElement("div"); div.className = "s-p"; div.contentEditable = "true"; div.dataset.absatz = n; div.setAttribute("role", "textbox"); div.innerHTML = "<br>"; blatt.appendChild(div); div.focus(); wordMarkieren(); break; }
      case "word-speichern": wordSpeichern(d); break;
      case "zeile-neu": d.inhalt.zellen.push(d.inhalt.zellen[0].map(() => "")); geaendert(d, null); render(); break;
      // Signaturprozess
      case "prozess-start": prozessStart(d.id); break;
      case "entwurf-verwerfen": frage("Entwurf verwerfen?", "Der Entwurf des Signaturprozesses wird gelöscht. Das Dokument in der Ablage bleibt unverändert.", "Verwerfen", () => { S.prozesse = S.prozesse.filter((x) => x.id !== p.id); speichern(); location.hash = "#/dok/" + p.dokId; }, true); break;
      case "umwandeln": {
        const balken = document.getElementById("umw-fortschritt"); const quelle = dok(p.dokId);
        const fertig = () => {
          p.seiten = zuPdfSeiten(quelle); p.umgewandelt = true; p.umgewandeltAm = jetzt();
          p.elementeFix = (quelle.elemente || []).filter((e) => ["text", "datum", "kommentar"].includes(e.art)).map((e) => (e.art === "kommentar" ? klon(e) : Object.assign(klon(e), { art: "fix" })));
          p.felder = (quelle.elemente || []).filter((e) => e.art === "feld").map((e) => ({ id: uid("f"), seite: e.seite, x: e.x, y: e.y, w: e.w, h: e.h, person: "ich" }));
          p.platzhalterUebernommen = false; protokoll(p, `In PDF/A-2b umgewandelt (${p.seiten.length} Seite(n))`); speichern(); render();
        };
        if (balken) { balken.hidden = false; t.disabled = true; requestAnimationFrame(() => { balken.firstElementChild.style.width = "100%"; }); setTimeout(fertig, 950); } else fertig();
        break;
      }
      case "schritt": {
        const s = Number(t.dataset.s);
        if (s === 2 && !p.platzhalterUebernommen) { const n = platzhalterUebernehmen(p); if (n) toast(`${n} Unterschriftsfeld(er) aus Platzhaltern gesetzt.`); }
        p.schritt = s; speichern(); render(); window.scrollTo(0, 0); break;
      }
      case "platzhalter": { p.felder = p.felder.filter((f) => !f.ph); const n = platzhalterUebernehmen(p); speichern(); toast(`${n} Feld(er) aus Platzhaltern gesetzt.`); render(); break; }
      case "person-neu": { const frei = D.PERSONEN.find((x) => !p.personen.some((y) => y.id === x.id)); if (!frei) { toast("Alle Personen sind schon aufgeführt."); break; } p.personen.push({ id: frei.id, name: frei.name, mail: frei.mail, rolle: "unterschreiben", status: "offen" }); speichern(); render(); break; }
      case "person-weg": { const x = p.personen.splice(Number(t.dataset.i), 1)[0]; p.felder = p.felder.filter((f) => f.person !== x.id); E.aktivPerson = 0; speichern(); render(); break; }
      case "aktiv-person": E.aktivPerson = Number(t.dataset.i); render(); break;
      case "senden": senden(p); toast("Signaturprozess gestartet."); render(); break;
      case "ich-unterschreibe": {
        const pp = p || prozess(location.hash.split("/")[2]); const ich = pp.personen.find((x) => x.id === "ich");
        E.dialog = { art: "signieren", titel: pp.titel, stufe: pp.stufe, rechtsraum: pp.rechtsraum, rolle: ich.rolle, fn: (bild) => { personErledigt(pp, "ich", bild); if (pp.status === "laufend") toast(ich.rolle === "genehmigen" ? "Genehmigt." : "Unterschrieben – die nächste Person wird benachrichtigt."); } };
        render(); break;
      }
      case "sim-ok": personErledigt(p, t.dataset.pid); render(); break;
      case "sim-nein": eingabe("Ablehnung simulieren", [{ label: "Begründung (erfunden)", wert: "Bitte Ziffer 3 anpassen.", mehrzeilig: true }], "Ablehnen", ([g]) => {
        const x = p.personen.find((y) => y.id === t.dataset.pid); x.status = "abgelehnt"; x.zeit = jetzt(); p.status = "abgelehnt"; protokoll(p, `${x.name} hat abgelehnt: ${g || "ohne Begründung"}`); speichern(); return null;
      }); break;
      case "erinnern": aktivePersonen(p).filter((x) => x.id !== "ich").forEach((x) => protokoll(p, `Erinnerung an ${x.name} gesendet`)); speichern(); toast("Erinnerung gesendet."); render(); break;
      case "zurueckziehen": frage("Signaturprozess zurückziehen?", "Offene Unterschriften verfallen, die Beteiligten werden informiert. Das Dokument in der Ablage wird wieder bearbeitbar.", "Zurückziehen", () => { p.status = "zurueckgezogen"; protokoll(p, "Von Ihnen zurückgezogen"); speichern(); }, true); break;
      // Eingang
      case "eingang-unterschreiben": {
        const e = S.eingang.find((x) => x.id === (t.dataset.e || location.hash.split("/")[2]));
        E.dialog = { art: "signieren", titel: e.titel, stufe: e.stufe, rechtsraum: e.rechtsraum, rolle: "unterschreiben", fn: (bild) => eingangUnterschrieben(e, bild) };
        render(); break;
      }
      case "eingang-ablehnen": {
        const e = S.eingang.find((x) => x.id === t.dataset.e);
        eingabe("Signaturanfrage ablehnen", [{ label: `Begründung an ${person(e.von).name}`, mehrzeilig: true }], "Ablehnen", ([g]) => { if (!String(g || "").trim()) return "Bitte eine Begründung angeben."; e.status = "abgelehnt"; e.grund = g; e.zeit = jetzt(); speichern(); toast(`Abgelehnt – ${e.quelle} wurde informiert.`); return null; });
        break;
      }
      case "anfrage": anfrageSimulieren(t.dataset.k); break;
      // Versiegeln
      case "versiegeln": E.dialog = { art: "versiegeln", dokId: d.id }; render(); break;
      // Synchronisation
      case "sync-jetzt": syncJetzt(); break;
      case "sync-cloud": cloudAenderung(); break;
      case "sync-konflikt": cloudKonflikt(); break;
      // Unterschrift
      case "zeichnen-leeren": { const c = document.querySelector("canvas.zeichenflaeche"); c.getContext("2d").clearRect(0, 0, c.width, c.height); zeichnung.striche = 0; break; }
      case "zeichnen-name": { const c = document.querySelector("canvas.zeichenflaeche"); const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height); const img = new Image(); img.onload = () => { g.drawImage(img, 0, 0, c.width, c.height); zeichnung.striche = 1; }; img.src = schriftzug(D.ICH.name); break; }
      case "zeichnen-speichern": { const b = zeichnungAlsBild(); if (!b) { toast("Bitte zuerst zeichnen."); break; } S.unterschrift = b; speichern(); toast("Unterschrift gespeichert."); render(); break; }
      default: break;
    }
  });
  function eingangUnterschrieben(e, bild) {
    e.status = "unterschrieben"; e.zeit = jetzt();
    e.felder.forEach((f) => { f.sig = { img: bild, name: D.ICH.name, zeit: e.zeit, stufe: e.stufe }; });
    const elemente = e.felder.map((f) => ({ id: uid("e"), art: "sig", seite: f.seite, x: f.x, y: f.y, w: f.w, h: f.h, img: bild, name: D.ICH.name, zeit: e.zeit, stufe: STUFEN[e.stufe].kurz }));
    const name = freierName(basis(e.datei) + "_sign.pdf", "o-eingang");
    const neu = { id: uid("d"), name, typ: "pdf", ordner: "o-eingang", groesse: 64000, geaendert: jetzt(), version: 1, sync: "ausstehend", status: "signiert", inhalt: { seiten: klon(e.seiten) }, elemente,
      signaturen: e.unterschriebenVon.map((u) => ({ name: u.name, zeit: u.zeit, stufe: e.stufe, rechtsraum: e.rechtsraum })).concat([{ name: D.ICH.name, zeit: e.zeit, stufe: e.stufe, rechtsraum: e.rechtsraum }]), siegel: null };
    neu.pruefsumme = pruefsumme(neu.inhalt);
    S.dokumente.push(neu); e.ablage = neu.id;
    speichern(); toast(`Unterschrieben – Rückmeldung an ${e.quelle} gesendet.`);
  }
  function wordMarkieren() { E.wordGeaendert = true; const s = document.getElementById("word-stand"); if (s) s.textContent = "● ungespeichert"; }
  function wordSpeichern(d) {
    const blatt = document.querySelector(`[data-word="${d.id}"]`); if (!blatt) return;
    d.inhalt.absaetze = Array.from(blatt.querySelectorAll("[data-absatz]")).map((el) => ({ stil: el.dataset.stil || (el.className.replace("s-", "") || "p"), html: sauber(el.innerHTML) })).filter((a) => textAus(a.html).trim() || a.stil === "p");
    E.wordGeaendert = false; geaendert(d, null); toast("Gespeichert – Abgleich mit der Cloud-Ablage ausstehend."); render();
  }

  // Eingaben ohne neues Zeichnen
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.dataset.eltext) { const q = t.closest(".seite").dataset.quelle; const el = elementListe(q).find((x) => x.id === t.dataset.eltext); if (el) { el.text = t.textContent; spaeter(() => nachAenderung(q, null)); } return; }
    if (t.dataset.kommentar) { const d = dok(location.hash.split("/")[2]); const el = d.elemente.find((x) => x.id === t.dataset.kommentar); if (el) { el.text = t.value; const pin = document.querySelector(`.el[data-el="${el.id}"]`); if (pin) pin.title = t.value; spaeter(() => geaendert(d, null)); } return; }
    if (t.closest && t.closest("[data-word]")) { wordMarkieren(); return; }
    if (t.dataset.formfeld && t.type !== "checkbox") { formfeld(t); return; }
    if (t.dataset.zelle) { const d = dok(location.hash.split("/")[2]); const [r, c] = t.dataset.zelle.split(",").map(Number); d.inhalt.zellen[r][c] = t.value; spaeter(() => geaendert(d, null)); return; }
    if (t.dataset.pfeld && (t.type === "text" || t.tagName === "TEXTAREA" || t.type === "date")) { const p = prozess(location.hash.split("/")[2]); p[t.dataset.pfeld] = t.value; spaeter(speichern); return; }
    if (t.dataset.sync === "ziel") { S.sync.ziel = t.value; spaeter(speichern); }
  });
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.dataset.hochladen !== undefined) { hochladen(t.files, t.dataset.hochladen || null); t.value = ""; return; }
    if (t.dataset.formfeld) { formfeld(t); return; }
    if (t.dataset.pfeld) {
      const p = prozess(location.hash.split("/")[2]);
      p[t.dataset.pfeld] = t.type === "checkbox" ? t.checked : t.value; speichern();
      if (["stufe", "reihenfolge", "rechtsraum"].includes(t.dataset.pfeld)) render();
      return;
    }
    if (t.dataset.personIdx !== undefined) {
      const p = prozess(location.hash.split("/")[2]); const i = Number(t.dataset.personIdx); const alt = p.personen[i];
      if (t.value === "extern") {
        t.value = alt.id;
        eingabe("Externe Person", [{ label: "Name" }, { label: "E-Mail", typ: "email" }], "Übernehmen", ([n, m]) => {
          if (!String(n || "").trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m || "")) return "Bitte Name und gültige E-Mail angeben.";
          const id = "x-" + Date.now().toString(36);
          p.felder.forEach((f) => { if (f.person === alt.id) f.person = id; });
          p.personen[i] = { id, name: n.trim(), mail: m.trim(), rolle: alt.rolle, status: "offen", extern: true }; speichern(); return null;
        });
        return;
      }
      const neu = person(t.value);
      p.felder.forEach((f) => { if (f.person === alt.id) f.person = neu.id; });
      p.personen[i] = { id: neu.id, name: neu.name, mail: neu.mail, rolle: alt.rolle, status: "offen" }; speichern(); render(); return;
    }
    if (t.dataset.rolleIdx !== undefined) { const p = prozess(location.hash.split("/")[2]); p.personen[Number(t.dataset.rolleIdx)].rolle = t.value; speichern(); render(); return; }
    if (t.dataset.sync) { S.sync[t.dataset.sync] = t.type === "checkbox" ? t.checked : t.value; if (t.dataset.sync === "aktiv" && t.checked) S.sync.protokoll.unshift({ zeit: jetzt(), text: "Abgleich eingeschaltet" }); speichern(); render(); return; }
    if (t.dataset.einst) { S.einst[t.dataset.einst] = t.value; speichern(); toast("Voreinstellung gespeichert."); }
  });
  document.addEventListener("mousedown", (ev) => { if (ev.target.closest && ev.target.closest('[data-aktion="format"], [data-aktion="absatz-stil"]')) ev.preventDefault(); });
  document.addEventListener("focusin", (ev) => { const a = ev.target.closest && ev.target.closest("[data-absatz]"); if (a) E.letzterAbsatz = a; });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && E.werkzeug !== "auswahl" && !E.dialog) { E.werkzeug = "auswahl"; render(); }
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches(".el-feld.mein")) { ev.preventDefault(); ev.target.click(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "s" && document.querySelector("[data-word]")) { ev.preventDefault(); wordSpeichern(dok(document.querySelector("[data-word]").dataset.word)); }
  });
  function formfeld(t) {
    const d = dok(location.hash.split("/")[2]);
    d.inhalt.seiten.forEach((s) => s.bloecke.forEach((b) => { if (b.t === "feld" && b.id === t.dataset.formfeld) b.wert = t.type === "checkbox" ? t.checked : t.value; }));
    spaeter(() => geaendert(d, null));
  }
  let spaeterZeit = null;
  function spaeter(fn) { clearTimeout(spaeterZeit); spaeterZeit = setTimeout(fn, 400); }

  // ---------------------------------------------------------------- Navigation
  function route() { const h = (location.hash || "#/uebersicht").slice(2).split("/"); return [h[0] || "uebersicht", h[1], h[2]]; }
  function render() {
    const [s, a] = route();
    let seite = s, inhalt;
    switch (s) {
      case "ablage": inhalt = seiteAblage(a || null); break;
      case "dok": inhalt = seiteDok(a); break;
      case "prozesse": inhalt = seiteProzesse(); break;
      case "prozess": inhalt = seiteProzess(a); break;
      case "eingang": if (a) { seite = "eingangDok"; inhalt = seiteEingangDok(a); } else inhalt = seiteEingang(); break;
      case "sync": inhalt = seiteSync(); break;
      case "profil": inhalt = seiteProfil(); break;
      case "einbindung": inhalt = seiteEinbindung(); break;
      default: seite = "uebersicht"; inhalt = seiteUebersicht();
    }
    const fokus = document.activeElement && document.activeElement.id;
    document.getElementById("app").innerHTML = rahmen(seite, inhalt);
    document.title = `EduKSX-Sign (Prototyp)`;
    zeichenflaecheVorbereiten();
    const dlg = document.getElementById("dlg");
    if (dlg) { dlg.showModal(); dlg.addEventListener("cancel", (e) => { e.preventDefault(); E.dialog = null; render(); }); const f = dlg.querySelector("input:not([type=checkbox]), textarea, select"); if (f) f.focus(); }
    else if (fokus) { const f = document.getElementById(fokus); if (f) f.focus(); }
  }
  window.addEventListener("hashchange", () => {
    E.werkzeug = "auswahl"; E.auswahl = null; E.bearbeitet = {}; E.dialog = null;
    if (E.wordGeaendert) { E.wordGeaendert = false; toast("Hinweis: ungespeicherte Word-Änderungen wurden verworfen."); }
    render(); const m = document.getElementById("inhalt"); if (m) m.focus();
  });
  window.addEventListener("beforeunload", (e) => { if (E.wordGeaendert) { e.preventDefault(); e.returnValue = ""; } });
  try { if (localStorage.getItem("eduksx-thema") === "dunkel") document.documentElement.classList.add("dark"); } catch (e) { /* */ }
  render();
})();
