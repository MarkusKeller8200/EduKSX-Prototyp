/*
 * EduKSX – Excel-Vorlagen befüllen, ohne Formatierung, Formeln, Schutz oder ausgeblendete Blätter anzutasten.
 *
 * Grundsatz: Die Datei bleibt Byte für Byte gleich; nur die Tabellen-XML der Blätter, in die geschrieben wird, und
 * workbook.xml (Neuberechnung beim Öffnen) werden ersetzt. Unveränderte ZIP-Einträge werden roh übernommen.
 * Geschrieben wird nur in Zellen, die im Blattschutz als «nicht gesperrt» formatiert sind (Eingabezellen).
 *
 * Läuft im Browser (window.XlsxVorlage) und in Node ≥ 22 (module.exports); keine Abhängigkeiten
 * (CompressionStream/DecompressionStream «deflate-raw»).
 */
(function (global) {
  "use strict";

  // ------------------------------------------------------------------ ZIP
  const CRC_TAB = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TAB[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  async function strom(bytes, transform) {
    const s = new Blob([bytes]).stream().pipeThrough(transform);
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  const inflate = (b) => strom(b, new DecompressionStream("deflate-raw"));
  const deflate = (b) => strom(b, new CompressionStream("deflate-raw"));
  const utf8 = new TextDecoder("utf-8");
  const enc = new TextEncoder();

  function zipLesen(buf) {
    const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
      if (d.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("Keine gültige Excel-Datei (ZIP-Verzeichnis fehlt).");
    const anzahl = d.getUint16(eocd + 10, true);
    let p = d.getUint32(eocd + 16, true);
    const eintraege = [];
    for (let i = 0; i < anzahl; i++) {
      if (d.getUint32(p, true) !== 0x02014b50) throw new Error("ZIP-Verzeichnis beschädigt.");
      const methode = d.getUint16(p + 10, true);
      const crc = d.getUint32(p + 16, true);
      const csize = d.getUint32(p + 20, true);
      const usize = d.getUint32(p + 24, true);
      const nlen = d.getUint16(p + 28, true);
      const xlen = d.getUint16(p + 30, true);
      const clen = d.getUint16(p + 32, true);
      const lokal = d.getUint32(p + 42, true);
      const name = utf8.decode(buf.subarray(p + 46, p + 46 + nlen));
      const lnlen = d.getUint16(lokal + 26, true);
      const lxlen = d.getUint16(lokal + 28, true);
      const start = lokal + 30 + lnlen + lxlen;
      eintraege.push({ name, methode, crc, csize, usize, roh: buf.subarray(start, start + csize), zeit: d.getUint32(p + 12, true) });
      p += 46 + nlen + xlen + clen;
    }
    return eintraege;
  }

  async function eintragText(e) {
    if (e.text != null) return e.text;
    const daten = e.methode === 0 ? e.roh : await inflate(e.roh);
    e.text = utf8.decode(daten);
    return e.text;
  }

  async function zipSchreiben(eintraege) {
    const teile = [];
    const zentral = [];
    let offset = 0;
    for (const e of eintraege) {
      let roh = e.roh, methode = e.methode, crc = e.crc, usize = e.usize;
      if (e.neu != null) {
        const daten = enc.encode(e.neu);
        roh = await deflate(daten); methode = 8; crc = crc32(daten); usize = daten.length;
      }
      const name = enc.encode(e.name);
      const kopf = new DataView(new ArrayBuffer(30));
      kopf.setUint32(0, 0x04034b50, true); kopf.setUint16(4, 20, true); kopf.setUint16(6, 0x0800, true);
      kopf.setUint16(8, methode, true); kopf.setUint32(10, e.zeit || 0, true); kopf.setUint32(14, crc, true);
      kopf.setUint32(18, roh.length, true); kopf.setUint32(22, usize, true); kopf.setUint16(26, name.length, true);
      teile.push(new Uint8Array(kopf.buffer), name, roh);
      const z = new DataView(new ArrayBuffer(46));
      z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true);
      z.setUint16(10, methode, true); z.setUint32(12, e.zeit || 0, true); z.setUint32(16, crc, true);
      z.setUint32(20, roh.length, true); z.setUint32(24, usize, true); z.setUint16(28, name.length, true);
      z.setUint32(42, offset, true);
      zentral.push(new Uint8Array(z.buffer), name);
      offset += 30 + name.length + roh.length;
    }
    const zGroesse = zentral.reduce((a, b) => a + b.length, 0);
    const ende = new DataView(new ArrayBuffer(22));
    ende.setUint32(0, 0x06054b50, true); ende.setUint16(8, eintraege.length, true); ende.setUint16(10, eintraege.length, true);
    ende.setUint32(12, zGroesse, true); ende.setUint32(16, offset, true);
    const alle = teile.concat(zentral, [new Uint8Array(ende.buffer)]);
    const out = new Uint8Array(alle.reduce((a, b) => a + b.length, 0));
    let p = 0;
    for (const t of alle) { out.set(t, p); p += t.length; }
    return out;
  }

  // ------------------------------------------------------------------ Zellen
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, "&");
  function spalteZuNr(s) { let n = 0; for (const ch of s) n = n * 26 + ch.charCodeAt(0) - 64; return n; }
  function nrZuSpalte(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function teileRef(ref) { const m = /^([A-Z]+)(\d+)$/.exec(ref); if (!m) throw new Error("Ungültige Zelle " + ref); return { spalte: m[1], zeile: Number(m[2]), nr: spalteZuNr(m[1]) }; }
  const zellRegex = (ref) => new RegExp(`<c r="${ref}"(?=[\\s>/])[^>]*?(?:/>|>[\\s\\S]*?</c>)`);

  class Mappe {
    static async oeffnen(bytes) {
      const m = new Mappe();
      m.eintraege = zipLesen(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
      m.idx = Object.fromEntries(m.eintraege.map((e) => [e.name, e]));
      if (!m.idx["xl/workbook.xml"]) throw new Error("Keine Excel-Arbeitsmappe (xl/workbook.xml fehlt).");
      const wb = await eintragText(m.idx["xl/workbook.xml"]);
      const rels = await eintragText(m.idx["xl/_rels/workbook.xml.rels"]);
      const ziele = {};
      for (const r of rels.matchAll(/<Relationship\b[^>]*>/g)) {
        const id = /Id="([^"]+)"/.exec(r[0]); const t = /Target="([^"]+)"/.exec(r[0]);
        if (id && t) ziele[id[1]] = t[1].replace(/^\/?xl\//, "").replace(/^\//, "");
      }
      m.blaetter = [];
      for (const s of wb.matchAll(/<sheet\b[^>]*>/g)) {
        const name = unesc(/name="([^"]*)"/.exec(s[0])[1]);
        const rid = /r:id="([^"]+)"/.exec(s[0])[1];
        const st = /state="([^"]+)"/.exec(s[0]);
        m.blaetter.push({ name, pfad: "xl/" + ziele[rid], zustand: st ? st[1] : "visible" });
      }
      m.sst = [];
      if (m.idx["xl/sharedStrings.xml"]) {
        const t = await eintragText(m.idx["xl/sharedStrings.xml"]);
        for (const si of t.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
          m.sst.push([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => unesc(x[1])).join(""));
        }
      }
      // Zellformate: welche xf-Indizes sind «nicht gesperrt»?
      const styles = await eintragText(m.idx["xl/styles.xml"]);
      const cellXfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)[1];
      m.offen = [];
      for (const xf of cellXfs.matchAll(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)) m.offen.push(/<protection[^>]*locked="0"/.test(xf[0]));
      m.geaendert = new Set();
      return m;
    }
    blatt(name) { return this.blaetter.find((b) => b.name === name); }
    async xml(name) {
      const b = this.blatt(name);
      if (!b) throw new Error(`Blatt «${name}» fehlt.`);
      const e = this.idx[b.pfad];
      return e.neu != null ? e.neu : eintragText(e);
    }
    async lesen(name, ref) {
      const x = await this.xml(name);
      const m = zellRegex(ref).exec(x);
      if (!m) return null;
      const c = m[0];
      const t = (/\st="([^"]+)"/.exec(c.slice(0, c.indexOf(">") + 1)) || [])[1];
      if (t === "inlineStr") { const is = /<is>([\s\S]*?)<\/is>/.exec(c); return is ? [...is[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((y) => unesc(y[1])).join("") : ""; }
      const v = /<v>([\s\S]*?)<\/v>/.exec(c);
      if (!v) return null;
      if (t === "s") return this.sst[Number(v[1])];
      if (t === "str" || t === "e") return unesc(v[1]);
      if (t === "b") return v[1] === "1";
      return Number(v[1]);
    }
    async istEingabe(name, ref) {
      const x = await this.xml(name);
      const m = zellRegex(ref).exec(x);
      if (!m) return false;
      const s = /\ss="(\d+)"/.exec(m[0].slice(0, m[0].indexOf(">") + 1));
      return !!this.offen[s ? Number(s[1]) : 0];
    }
    /** Werte schreiben: [{ref, wert}] mit wert = Zahl, Text oder null (leeren). Nur Eingabezellen. */
    async schreiben(name, werte) {
      const b = this.blatt(name);
      let x = await this.xml(name);
      const fehler = [];
      for (const { ref, wert } of werte) {
        const m = zellRegex(ref).exec(x);
        if (!m) { fehler.push(`${name}!${ref}: Zelle fehlt in der Vorlage`); continue; }
        const alt = m[0];
        const kopf = alt.slice(0, alt.indexOf(">") + 1).replace(/\/>$/, ">");
        const s = /\ss="(\d+)"/.exec(kopf);
        if (!this.offen[s ? Number(s[1]) : 0]) { fehler.push(`${name}!${ref}: gesperrte Zelle – nicht geschrieben`); continue; }
        if (/<f[\s>]/.test(alt)) { fehler.push(`${name}!${ref}: enthält eine Formel – nicht geschrieben`); continue; }
        const attrs = kopf.replace(/^<c\s+/, "").replace(/>$/, "").replace(/\s*\bt="[^"]*"/, "").trim();
        let neu;
        if (wert === null || wert === undefined || wert === "") neu = `<c ${attrs}/>`;
        else if (typeof wert === "number" && isFinite(wert)) neu = `<c ${attrs}><v>${Number(wert.toPrecision(15))}</v></c>`;
        else neu = `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${esc(wert)}</t></is></c>`;
        x = x.replace(alt, () => neu);
      }
      this.idx[b.pfad].neu = x;
      this.geaendert.add(b.pfad);
      return fehler;
    }
    async speichern() {
      // Excel rechnet beim Öffnen alle Formeln neu (die zwischengespeicherten Ergebnisse sind sonst veraltet)
      const wbE = this.idx["xl/workbook.xml"];
      let wb = wbE.neu != null ? wbE.neu : await eintragText(wbE);
      if (/<calcPr\b[^>]*fullCalcOnLoad=/.test(wb)) wb = wb.replace(/fullCalcOnLoad="[^"]*"/, 'fullCalcOnLoad="1"');
      else if (/<calcPr\b/.test(wb)) wb = wb.replace(/<calcPr\b/, '<calcPr fullCalcOnLoad="1"');
      else wb = wb.replace("</workbook>", '<calcPr fullCalcOnLoad="1"/></workbook>');
      wbE.neu = wb;
      return zipSchreiben(this.eintraege);
    }
  }

  const api = { Mappe, crc32, spalteZuNr, nrZuSpalte, teileRef };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.XlsxVorlage = api;
})(typeof window !== "undefined" ? window : globalThis);
