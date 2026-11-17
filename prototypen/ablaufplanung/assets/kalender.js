/*
 * EduKSX-Flow – Jahreskalender (Teil des Klickprototyps Ablaufplanung).
 * Wiederkehrende und einmalige Ereignisse (Quartal, Kalenderwoche, Datum oder Zeitraum) mit Zuständigkeit und
 * Teilaufgaben. Ein Ereignis kann mit einer Ablaufvorlage verknüpft werden: Flow startet den Ablauf mit dem Datum
 * des Ereignisses als Stichtag. Wird von app.js über window.FLOW_KALENDER eingebunden.
 */
(function () {
  "use strict";

  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const MON_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const QUARTAL = { 1: "Januar–März", 2: "April–Juni", 3: "Juli–September", 4: "Oktober–Dezember" };
  const pad = (n) => String(n).padStart(2, "0");

  window.FLOW_KALENDER = function (X) {
    // X: gemeinsame Hilfen aus app.js (Zustand, Darstellung, Navigation)
    const { D, esc, addTage, tageZwischen, datumKurz, kopie, rolleBadge, ansage, frage } = X;
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
    function vorkommenIm(ev, y) {
      const z = ev.zeit;
      if (z.q) return { von: `${y}-${pad(3 * z.q - 2)}-01`, bis: `${y}-${pad(3 * z.q)}-${letzterTag(y, 3 * z.q)}` };
      if (z.kw) { const v = isoMontag(y, z.kw); return { von: v, bis: addTage(v, 4) }; }
      if (z.am) return { von: `${y}-${z.am}`, bis: `${y}-${z.am}` };
      return { von: `${y}-${z.von}`, bis: `${y}-${z.bis}` };
    }
    function periode() {
      const k = S().kal;
      return k.modus === "schuljahr" ? { von: `${k.jahr}-08-01`, bis: `${k.jahr + 1}-07-31`, name: `Schuljahr ${k.jahr}/${String(k.jahr + 1).slice(2)}` }
        : { von: `${k.jahr}-01-01`, bis: `${k.jahr}-12-31`, name: `Kalenderjahr ${k.jahr}` };
    }
    /** Das Vorkommen eines Ereignisses, das am meisten mit dem Zeitraum überlappt (oder null). */
    function vorkommen(ev, p) {
      p = p || periode();
      const y0 = Number(p.von.slice(0, 4));
      let best = null, bestTage = 0;
      [y0 - 1, y0, y0 + 1].forEach((y) => {
        if (ev.jahr && ev.jahr !== y) return;
        const o = vorkommenIm(ev, y);
        const a = o.von > p.von ? o.von : p.von, b = o.bis < p.bis ? o.bis : p.bis;
        const t = a <= b ? tageZwischen(a, b) + 1 : 0;
        if (t > bestTage) { bestTage = t; best = o; }
      });
      return best ? Object.assign({ ev, key: ev.id + "|" + best.von }, best) : null;
    }
    function zeitregel(ev) {
      const z = ev.zeit;
      const w = ev.jahr ? `nur ${ev.jahr}` : "jährlich";
      if (z.q) return `${w}, Quartal ${z.q} (${QUARTAL[z.q]})`;
      if (z.kw) return `${w}, Kalenderwoche ${z.kw}`;
      if (z.am) return `${w}, am ${z.am.split("-").reverse().join(".")}.`;
      return `${w}, ${z.von.split("-").reverse().join(".")}.–${z.bis.split("-").reverse().join(".")}.`;
    }
    const wann = (o) => (o.von === o.bis ? datumKurz(o.von) : `${datumKurz(o.von)} – ${datumKurz(o.bis)}`) + (o.ev.zeit.kw ? ` · KW ${o.ev.zeit.kw}` : o.ev.zeit.q ? ` · Q${o.ev.zeit.q}` : "");

    // ------------------------------------------------------------ Status und Filter
    const erledigt = (o) => !!S().kalErledigt[o.key];
    const teilErledigt = (o, i) => !!S().kalErledigt[o.key + "#" + i];
    function status(o) {
      const h = S().heute;
      if (erledigt(o)) return ["erfolg", "✓", "erledigt"];
      if (o.bis < h) return ["fehler", "!", "überfällig"];
      if (o.von <= h) return ["info", "●", "läuft"];
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
    function gefiltert(liste) {
      const f = S().kal;
      const meine = D.KAL_ZUORDNUNG[S().rolle] || [];
      return liste.filter((o) => {
        if (f.bereich && o.ev.bereich !== f.bereich) return false;
        if (f.quelle && o.ev.quelle !== f.quelle) return false;
        if (f.nurFlow && !o.ev.flow) return false;
        if (f.nurOffen && erledigt(o)) return false;
        if (f.rolle === "meine" && !zustaendig(o.ev).some(([r]) => meine.includes(r))) return false;
        if (f.rolle && f.rolle !== "meine" && !/[EV]/.test((o.ev.rollen || {})[f.rolle] || "")) return false;
        return true;
      });
    }
    function alleVorkommen(p) {
      return S().ereignisse.map((ev) => vorkommen(ev, p)).filter(Boolean).sort((a, b) => a.von.localeCompare(b.von) || a.bis.localeCompare(b.bis));
    }
    /** Nächste Termine ab heute (für Übersicht und Aufgaben), über die Jahresgrenze hinweg. */
    function demnaechst(tage, nurMeine) {
      const h = S().heute, y0 = Number(h.slice(0, 4));
      const meine = D.KAL_ZUORDNUNG[S().rolle] || [];
      const out = [];
      S().ereignisse.forEach((ev) => [y0 - 1, y0, y0 + 1].forEach((y) => {
        if (ev.jahr && ev.jahr !== y) return;
        const o = Object.assign({ ev }, vorkommenIm(ev, y));
        o.key = ev.id + "|" + o.von;
        if (erledigt(o) || o.bis < addTage(h, -60) || o.von > addTage(h, tage)) return;
        if (nurMeine && !zustaendig(ev).some(([r]) => meine.includes(r))) return;
        out.push(o);
      }));
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
      const opt = (liste, wert) => liste.map(([v, t]) => `<option value="${esc(v)}" ${v === wert ? "selected" : ""}>${esc(t)}</option>`).join("");
      return `<div class="formzeile filterleiste">
        <label class="feld">Zeitraum<select data-aktion="kal-zeitraum">${opt(zeitr, aktiv)}</select></label>
        <label class="feld">Bereich<select data-aktion="kal-filter" data-f="bereich">${opt([["", "alle Bereiche"]].concat(Object.entries(B).map(([b, v]) => [b, v[0]])), k.bereich)}</select></label>
        <label class="feld">Zuständig (E/V)<select data-aktion="kal-filter" data-f="rolle">${opt([["", "alle Rollen"], ["meine", `meine Rolle (${X.ROLLEN[S().rolle]})`]].concat(Object.entries(D.KAL_ROLLEN).map(([r, n]) => [r, `${r} – ${n}`])), k.rolle)}</select></label>
        <label class="feld">Quelle<select data-aktion="kal-filter" data-f="quelle">${opt([["", "alle Quellen"]].concat(Object.entries(D.QUELLEN)), k.quelle)}</select></label>
        <label class="small"><input type="checkbox" data-aktion="kal-filter" data-f="nurFlow" ${k.nurFlow ? "checked" : ""}> nur mit Ablauf verknüpft</label>
        <label class="small"><input type="checkbox" data-aktion="kal-filter" data-f="nurOffen" ${k.nurOffen ? "checked" : ""}> nur offene</label>
      </div>`;
    }

    function seite(ansicht) {
      ansicht = ansicht || "zeitleiste";
      const p = periode();
      const alle = alleVorkommen(p);
      const liste = gefiltert(alle);
      const h = S().heute;
      const ueber = alle.filter((o) => !erledigt(o) && o.bis < h);
      const bald = alle.filter((o) => !erledigt(o) && o.bis >= h && tageZwischen(h, o.von) <= 28);
      const verkn = alle.filter((o) => o.ev.flow);
      const darf = ["SV", "SL", "ICT"].includes(S().rolle);
      const naechste = demnaechst(28, false).slice(0, 6);
      const inhalt = ansicht === "liste" ? listenAnsicht(liste, p) : ansicht === "quartale" ? quartalsAnsicht(liste, p) : zeitleiste(liste, p);
      return `
        <div class="seitenkopf"><div><h1>Jahreskalender</h1><p class="muted">Wiederkehrende Aufgaben und Termine im Jahreslauf – aus der Jahresplanung ICT-Prozesse, der Master-Checkliste und dem Jahreskalender der Fachstelle ICT. Ereignisse lassen sich mit einer Ablaufvorlage verknüpfen; der Ablauf startet dann mit dem Datum des Ereignisses als Stichtag.</p></div>
          <div class="aktionen"><button class="btn primaer" data-aktion="kal-neu" ${darf ? "" : 'disabled title="Schulverwaltung, Schulleitung oder ICT-Support"'}>＋ Ereignis</button></div></div>
        <div class="karten">
          <div class="karte"><div class="zahl">${alle.length}</div><div class="titel">Ereignisse im ${esc(p.name)}</div></div>
          <div class="karte"><div class="zahl">${bald.length}</div><div class="titel">◷ in den nächsten 4 Wochen</div></div>
          <div class="karte"><div class="zahl">${ueber.length}</div><div class="titel">${ueber.length ? "⚠ " : ""}überfällig, nicht erledigt</div></div>
          <div class="karte"><div class="zahl">${verkn.length}</div><div class="titel">mit Ablauf verknüpft</div></div>
        </div>
        ${naechste.length ? `<div class="karte demnaechst"><h2>Als Nächstes</h2><ul class="infoliste">${naechste.map((o) => `<li><button class="link" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}">${esc(o.ev.titel)}</button> <span class="small muted">${wann(o)}</span> ${statusBadge(o)} ${o.ev.flow ? `<span class="badge violett" title="Mit Ablaufvorlage verknüpft">⇢ Ablauf</span>` : ""}</li>`).join("")}</ul></div>` : ""}
        ${filterLeiste()}
        <div class="reiter" role="tablist">
          <button role="tab" aria-selected="${ansicht === "zeitleiste"}" data-aktion="reiter" data-ziel="#/kalender/zeitleiste">Zeitleiste</button>
          <button role="tab" aria-selected="${ansicht === "liste"}" data-aktion="reiter" data-ziel="#/kalender/liste">Liste (${liste.length})</button>
          <button role="tab" aria-selected="${ansicht === "quartale"}" data-aktion="reiter" data-ziel="#/kalender/quartale">Quartale</button>
        </div>
        ${inhalt}`;
    }

    function zeitleiste(liste, p) {
      const start = addTage(p.von, -((new Date(p.von + "T12:00:00Z").getUTCDay() || 7) - 1));
      const N = Math.ceil((tageZwischen(start, p.bis) + 1) / 7);
      const col = (d) => Math.min(N, Math.max(1, Math.floor(tageZwischen(start, d) / 7) + 1));
      const MIN = 7; // sichtbare Mindestbreite in Wochen, damit die Bezeichnung lesbar bleibt
      let html = `<div class="zl-wrap" data-glossary-ignore><div class="zl" style="grid-template-columns: 190px repeat(${N}, minmax(15px, 1fr))">`;
      // Monate
      let row = 1;
      html += `<div class="zl-ecke" style="grid-row:1;grid-column:1">${esc(p.name)}</div>`;
      for (let d = p.von; d <= p.bis; ) {
        const y = Number(d.slice(0, 4)), m = Number(d.slice(5, 7));
        const naechster = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
        const c1 = col(d), c2 = col(addTage(naechster, -1));
        html += `<div class="zl-monat" style="grid-row:1;grid-column:${c1 + 1} / ${c2 + 2}">${MON_KURZ[m - 1]}</div>`;
        d = naechster;
      }
      // Kalenderwochen
      row = 2;
      html += `<div class="zl-ecke klein" style="grid-row:2;grid-column:1">KW</div>`;
      for (let i = 1; i <= N; i++) { const kw = kwVon(addTage(start, (i - 1) * 7)); html += `<div class="zl-kw" style="grid-row:2;grid-column:${i + 1}">${i % 2 ? kw : ""}</div>`; }
      row = 3;
      const bereiche = Object.keys(B).filter((b) => liste.some((o) => o.ev.bereich === b));
      if (!bereiche.length) return `<p class="muted">Keine Ereignisse für diese Auswahl.</p>`;
      bereiche.forEach((b, bi) => {
        const items = liste.filter((o) => o.ev.bereich === b).map((o) => ({ o, c1: col(o.von < p.von ? p.von : o.von), c2: col(o.bis > p.bis ? p.bis : o.bis) }))
          .sort((a, z) => a.c1 - z.c1 || z.c2 - a.c2);
        const bahnen = [];
        items.forEach((it) => {
          it.cv = Math.min(N, Math.max(it.c2, it.c1 + MIN - 1));
          let l = bahnen.findIndex((ende) => ende < it.c1);
          if (l < 0) { bahnen.push(0); l = bahnen.length - 1; }
          bahnen[l] = it.cv; it.l = l;
        });
        const n = Math.max(1, bahnen.length);
        html += `<div class="zl-bahn ${bi % 2 ? "b2" : ""}" style="grid-row:${row} / span ${n};grid-column:1 / ${N + 2}"></div>`;
        html += `<div class="zl-label" style="grid-row:${row} / span ${n}">${bereichBadge(b)}<span class="small muted">${items.length}</span></div>`;
        items.forEach((it) => {
          const o = it.o, s = status(o);
          const punkt = it.c2 < it.cv;
          html += `<button class="zl-item b-${(B[b] || ["", "neutral"])[1]} st-${s[0]} ${punkt ? "punkt" : ""}" style="grid-row:${row + it.l};grid-column:${(o.von < p.von ? col(p.von) : it.c1) + 1} / ${it.cv + 2}" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}" title="${esc(o.ev.titel)} – ${esc(wann(o))} – ${s[2]}${o.ev.flow ? " – mit Ablauf verknüpft" : ""}">${s[0] === "erfolg" ? "✓ " : s[0] === "fehler" ? "! " : ""}${o.ev.flow ? "⇢ " : ""}${esc(o.ev.titel)}</button>`;
        });
        row += n;
      });
      // Heute
      const h = S().heute;
      if (h >= p.von && h <= p.bis) html += `<div class="zl-heute" style="grid-row:1 / ${row};grid-column:${col(h) + 1}" title="Heute (simuliert): ${datumKurz(h)}"><span>heute</span></div>`;
      html += `</div></div><p class="small muted">Balken = Zeitraum (Quartal, Termin mit Teilaufgaben); Einzeltermine (Kalenderwoche, Datum) beginnen mit einem Punkt in ihrer Woche. ⇢ = mit Ablaufvorlage verknüpft, ✓ erledigt, ! überfällig.</p>`;
      return html;
    }

    function listenAnsicht(liste, p) {
      if (!liste.length) return `<p class="muted">Keine Ereignisse für diese Auswahl.</p>`;
      let monat = "";
      const zeilen = liste.map((o) => {
        const m = (o.von < p.von ? p.von : o.von).slice(0, 7);
        let kopf = "";
        if (m !== monat) { monat = m; kopf = `<tr class="monat"><th colspan="7">${MONATE[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}</th></tr>`; }
        const v = o.ev.flow ? X.vorlageVon(o.ev.flow) : null;
        const teil = o.ev.teil.length ? `<div class="small muted">Teilaufgaben ${o.ev.teil.filter((t, i) => teilErledigt(o, i)).length}/${o.ev.teil.length}</div>` : "";
        return kopf + `<tr class="${erledigt(o) ? "blass" : ""}"><td class="small" style="white-space:nowrap">${wann(o)}</td>
          <td><button class="link" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}">${esc(o.ev.titel)}</button>${teil}</td>
          <td>${bereichBadge(o.ev.bereich)}</td><td>${zustaendigText(o.ev)}</td>
          <td class="small">${o.ev.jahr ? `nur ${o.ev.jahr}` : "jährlich"}</td>
          <td class="small">${v ? `<span class="badge violett">⇢ ${esc(v.titel)}</span>` : `<span class="muted">–</span>`}</td>
          <td style="white-space:nowrap">${statusBadge(o)} <button class="btn klein" data-aktion="kal-erledigt" data-key="${esc(o.key)}" aria-label="${erledigt(o) ? "wieder offen" : "als erledigt markieren"}" title="${erledigt(o) ? "Wieder offen" : "Als erledigt markieren"}">${erledigt(o) ? "↺" : "✓"}</button></td></tr>`;
      }).join("");
      return `<div class="tabelle-wrap"><table><thead><tr><th>Wann</th><th>Ereignis</th><th>Bereich</th><th>Zuständig</th><th>Wiederkehr</th><th>Ablauf</th><th>Status</th></tr></thead><tbody>${zeilen}</tbody></table></div>`;
    }

    function quartalsAnsicht(liste, p) {
      const q = (o) => Math.floor((Number(o.von.slice(5, 7)) - 1) / 3) + 1;
      const reihenfolge = S().kal.modus === "schuljahr" ? [3, 4, 1, 2] : [1, 2, 3, 4];
      const karte = (n) => {
        const inQ = liste.filter((o) => q(o) === n);
        const plan = inQ.filter((o) => o.ev.quelle === "plan");
        const jaehrlich = plan.filter((o) => !o.ev.jahr), einmalig = plan.filter((o) => o.ev.jahr);
        const weitere = inQ.length - plan.length;
        const li = (o) => `<li><button class="link" data-aktion="kal-oeffnen" data-id="${o.ev.id}" data-von="${o.von}">${erledigt(o) ? "✓ " : ""}${esc(o.ev.titel)}</button>${o.ev.flow ? ` <span class="badge violett">⇢</span>` : ""}</li>`;
        return `<div class="karte quartal"><h2>Q${n} <span class="small muted">${QUARTAL[n]}</span></h2>
          ${jaehrlich.length ? `<h3 class="small muted">jährlich</h3><ul>${jaehrlich.map(li).join("")}</ul>` : ""}
          ${einmalig.length ? `<h3 class="small muted">nur ${einmalig[0].ev.jahr} (DigiLex)</h3><ul class="einmalig">${einmalig.map(li).join("")}</ul>` : ""}
          ${weitere ? `<p class="small muted">+ ${weitere} Termine aus Checkliste und Fachstellen-Kalender – <a href="#/kalender/liste">Liste</a></p>` : ""}
          ${!inQ.length ? `<p class="muted small">Keine Ereignisse.</p>` : ""}</div>`;
      };
      return `<p class="small muted">Aufbau wie die Jahresplanung ICT-Prozesse (Flipchart): je Quartal die jährlich wiederkehrenden Aufgaben und die einmaligen Vorhaben.</p><div class="quartale">${reihenfolge.map(karte).join("")}</div>`;
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
      const y = K.von ? Number(K.von.slice(0, 4)) : Number(S().heute.slice(0, 4));
      const o = Object.assign({ ev }, vorkommenIm(ev, ev.jahr || y));
      o.key = ev.id + "|" + o.von;
      return o;
    }
    function zeichnen() {
      let d = document.getElementById("kal-dlg");
      if (!d) { d = document.createElement("dialog"); d.id = "kal-dlg"; d.className = "breit"; document.body.appendChild(d); }
      d.innerHTML = K.bearbeiten ? formular() : ansicht();
      if (!d.open) d.showModal();
    }
    function ansicht() {
      const o = aktuellesVorkommen();
      const ev = o.ev;
      const darf = ["SV", "SL", "ICT"].includes(S().rolle);
      const v = ev.flow ? X.vorlageVon(ev.flow) : null;
      const laeufe = S().laeufe.filter((l) => l.ereignis && l.ereignis.split("|")[0] === ev.id);
      const rollen = Object.entries(ev.rollen || {});
      const startbar = v && v.status === "freigegeben";
      return `<div class="kal-detail" data-glossary-ignore>
        <div class="small muted">${esc(D.QUELLEN[ev.quelle] || "Eigenes Ereignis")}</div>
        <h2>${esc(ev.titel)}</h2>
        <p>${bereichBadge(ev.bereich)} ${statusBadge(o)} <span class="small muted">${esc(zeitregel(ev))}</span></p>
        <div class="feldliste">
          <div class="feldzeile"><span class="muted">Dieses Jahr</span><span>${wann(o)}</span></div>
          <div class="feldzeile"><span class="muted">Zuständigkeit</span><span>${rollen.length ? rollen.map(([r, z]) => `<span class="rolle" title="${esc(D.KAL_ROLLEN[r] || r)}">${esc(r)}</span> ${esc(z)}`).join(" · ") : `<span class="muted">noch offen</span>`}</span></div>
        </div>
        ${rollen.length ? `<p class="small muted">A = Abnahme · E = Entscheid · V = Verantwortung · M = Mitarbeit</p>` : ""}
        ${ev.notiz ? `<p>${esc(ev.notiz)}</p>` : ""}
        ${ev.teil.length ? `<h3>Teilaufgaben</h3><ul class="teilliste">${ev.teil.map((t, i) => `<li><label><input type="checkbox" data-aktion="kal-teil" data-key="${esc(o.key + "#" + i)}" ${teilErledigt(o, i) ? "checked" : ""}> ${esc(t[0])}</label> <span class="small muted">${datumKurz(`${o.von.slice(0, 4)}-${t[1]}`)}</span></li>`).join("")}</ul>` : ""}
        <h3>Verknüpfter Ablauf</h3>
        <div class="formzeile">
          <label class="feld">Ablaufvorlage<select data-aktion="kal-flow" ${darf ? "" : "disabled"}><option value="">– kein Ablauf –</option>${S().vorlagen.map((x) => `<option value="${x.id}" ${x.id === ev.flow ? "selected" : ""}>${esc(x.titel)} (v${x.version}${x.status === "entwurf" ? ", Entwurf" : ""})</option>`).join("")}</select></label>
          ${v ? `<button class="btn primaer" data-aktion="kal-starten" ${startbar ? "" : 'disabled title="Vorlage ist noch nicht freigegeben"'}>▶ Ablauf starten</button>` : ""}
        </div>
        <p class="small muted">${v ? `Beim Start wird das Datum dieses Ereignisses (${datumKurz(o.bis)}) als «${esc(v.stichtag)}» vorgeschlagen; ${esc(v.titel)} plant die Schritte von dort aus.` : "Noch keine Vorlage verknüpft – später z. B. Beschaffung, Schuljahreswechsel oder On-/Offboarding."}</p>
        ${laeufe.length ? `<ul class="infoliste">${laeufe.map((l) => `<li><a href="#/lauf/${l.id}" data-aktion="kal-schliessen">${esc(l.titel)}: ${esc(l.kontext.person)}</a> <span class="small muted">${l.abgeschlossen ? "✓ abgeschlossen" : X.fortschritt(l)[2] + " %"}</span></li>`).join("")}</ul>` : ""}
        <div class="formzeile" style="justify-content:flex-end;margin-top:1rem">
          ${darf ? `<button class="btn" data-aktion="kal-bearbeiten">✎ Bearbeiten</button>` : ""}
          <button class="btn" data-aktion="kal-erledigt" data-key="${esc(o.key)}">${erledigt(o) ? "↺ Wieder offen" : "✓ Als erledigt markieren"}</button>
          <button class="btn" data-aktion="kal-schliessen">Schliessen</button>
        </div></div>`;
    }
    function formular() {
      const ev = K.ev, z = ev.zeit;
      const art = z.q ? "q" : z.kw ? "kw" : z.am ? "am" : "zeitraum";
      const datumFeld = (key, wert) => `<input type="text" data-k="${key}" value="${esc(wert || "")}" placeholder="MM-TT" pattern="\\d{2}-\\d{2}" style="width:6rem">`;
      const j0 = Number(S().heute.slice(0, 4));
      return `<form class="editor" data-glossary-ignore onsubmit="return false">
        <h2>${K.neu ? "Neues Ereignis" : "Ereignis bearbeiten"}</h2>
        <label class="feld">Bezeichnung<input type="text" data-k="titel" value="${esc(ev.titel)}" style="width:100%"></label>
        <div class="formzeile" style="margin-top:.6rem">
          <label class="feld">Bereich<select data-k="bereich">${Object.entries(B).map(([b, v]) => `<option value="${b}" ${b === ev.bereich ? "selected" : ""}>${esc(v[0])}</option>`).join("")}</select></label>
          <label class="feld">Wiederkehr<select data-k="jahr"><option value="">jährlich</option>${[j0, j0 + 1].map((y) => `<option value="${y}" ${ev.jahr === y ? "selected" : ""}>nur ${y}</option>`).join("")}</select></label>
        </div>
        <fieldset><legend>Zeitpunkt</legend><div class="formzeile">
          <label class="feld">Art<select data-k="art" data-neu-zeichnen="1">${[["q", "Quartal"], ["kw", "Kalenderwoche"], ["am", "Datum"], ["zeitraum", "Zeitraum"]].map(([v, t]) => `<option value="${v}" ${v === art ? "selected" : ""}>${t}</option>`).join("")}</select></label>
          ${art === "q" ? `<label class="feld">Quartal<select data-k="q">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${z.q === n ? "selected" : ""}>Q${n} (${QUARTAL[n]})</option>`).join("")}</select></label>` : ""}
          ${art === "kw" ? `<label class="feld">Kalenderwoche<input type="number" min="1" max="53" data-k="kw" value="${z.kw || 1}"></label>` : ""}
          ${art === "am" ? `<label class="feld">Datum (MM-TT)${datumFeld("am", z.am)}</label>` : ""}
          ${art === "zeitraum" ? `<label class="feld">von (MM-TT)${datumFeld("von", z.von)}</label><label class="feld">bis (MM-TT)${datumFeld("bis", z.bis)}</label>` : ""}
        </div></fieldset>
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
      const ev = K.ev;
      ev.titel = q("titel").value.trim();
      ev.bereich = q("bereich").value;
      ev.jahr = q("jahr").value ? Number(q("jahr").value) : null;
      ev.notiz = q("notiz").value;
      const art = q("art").value;
      const z = ev.zeit;
      // beim Wechsel der Art sinnvoll vorbelegen (aus der bisherigen Zeitregel)
      const alt = vorkommenIm({ zeit: z }, Number(S().heute.slice(0, 4)));
      const md = (iso) => iso.slice(5);
      if (art === "zeitraum" && !q("von")) { z.von = md(alt.von); z.bis = md(alt.bis); }
      if (art === "am" && !q("am")) z.am = md(alt.von);
      if (art === "kw" && !q("kw")) z.kw = kwVon(alt.von);
      if (art === "q" && !q("q")) z.q = Math.floor((Number(alt.von.slice(5, 7)) - 1) / 3) + 1;
      if (art === "q") ev.zeit = { q: q("q") ? Number(q("q").value) : z.q || 1 };
      else if (art === "kw") ev.zeit = { kw: q("kw") ? Math.min(53, Math.max(1, Number(q("kw").value) || 1)) : z.kw || kwVon(S().heute) };
      else if (art === "am") ev.zeit = { am: q("am") ? q("am").value : z.am || S().heute.slice(5) };
      else ev.zeit = { von: q("von") ? q("von").value : z.von || S().heute.slice(5), bis: q("bis") ? q("bis").value : z.bis || S().heute.slice(5) };
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
        case "kal-bearbeiten": K.bearbeiten = true; zeichnen(); return true;
        case "kal-abbrechen": if (K.neu) { document.getElementById("kal-dlg").close(); K = null; } else { K = { id: K.id, von: K.von, ev: kopie(st.ereignisse.find((x) => x.id === K.id)) }; zeichnen(); } return true;
        case "kal-speichern": {
          formularLesen();
          const f = gueltig(K.ev);
          if (f) { ansage(f); return true; }
          const i = st.ereignisse.findIndex((x) => x.id === K.ev.id);
          if (i >= 0) st.ereignisse[i] = K.ev; else st.ereignisse.push(K.ev);
          const o = vorkommen(K.ev) || Object.assign({}, vorkommenIm(K.ev, K.ev.jahr || Number(st.heute.slice(0, 4))));
          K = { id: K.ev.id, von: o.von, ev: kopie(K.ev) };
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
        default: return false;
      }
    }
    function aenderung(ak, el) {
      const st = S();
      if (ak === "kal-zeitraum") { const [m, y] = el.value.split(":"); st.kal.modus = m; st.kal.jahr = Number(y); X.speichern(); X.render(); return true; }
      if (ak === "kal-filter") { st.kal[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value; X.speichern(); X.render(); return true; }
      if (ak === "kal-teil") { const k = el.dataset.key; if (el.checked) st.kalErledigt[k] = st.heute; else delete st.kalErledigt[k]; X.speichern(); X.render(); return true; }
      if (ak === "kal-flow") {
        const ev = st.ereignisse.find((x) => x.id === K.id);
        ev.flow = el.value || null; K.ev = kopie(ev);
        X.speichern(); X.render(); zeichnen(); ansage(ev.flow ? "Ablauf verknüpft." : "Verknüpfung entfernt.");
        return true;
      }
      if (el.dataset.neuZeichnen && K && K.bearbeiten) { formularLesen(); zeichnen(); return true; }
      return false;
    }

    /** Testdaten: Vergangenes ist erledigt – bis auf wenige Beispiele, die überfällig bzw. teilweise erledigt sind. */
    function vorbelegen() {
      const st = S(), h = st.heute, y0 = Number(h.slice(0, 4));
      const offen = ["Office-Lizenzen", "Erneuerung Geräte älter als 5 Jahre (Notebooks, Tablets)", "Betriebssystem-Updates aktiv blockieren"];
      st.ereignisse.forEach((ev) => [y0 - 1, y0].forEach((y) => {
        if (ev.jahr && ev.jahr !== y) return;
        const o = vorkommenIm(ev, y);
        const key = ev.id + "|" + o.von;
        ev.teil.forEach((t, i) => { if (`${y}-${t[1]}` < h && !(offen.includes(ev.titel) && i >= 2)) st.kalErledigt[key + "#" + i] = `${y}-${t[1]}`; });
        if (o.bis < addTage(h, -2) && !offen.includes(ev.titel)) st.kalErledigt[key] = o.bis;
      }));
    }

    return { seite, klick, vorbelegen, aenderung, demnaechst, wann, statusBadge, bereichBadge, kwVon, zustaendig };
  };
})();
