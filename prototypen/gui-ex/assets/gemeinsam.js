/* EduKSX-Experience – Variantenwahl, Hell/Dunkel und Bewertung (in allen Varianten gleich). */
(function () {
  "use strict";
  const VARIANTEN = [
    { key: "fokus", buchstabe: "A", name: "Fokus", datei: "fokus.html" },
    { key: "kacheln", buchstabe: "B", name: "Kacheln", datei: "kacheln.html" },
    { key: "zeitstrahl", buchstabe: "C", name: "Zeitstrahl", datei: "zeitstrahl.html" },
    { key: "fenster", buchstabe: "D", name: "Arbeitsfläche", datei: "fenster.html" },
    { key: "cockpit", buchstabe: "E", name: "Cockpit", datei: "cockpit.html" },
    { key: "tabelle", buchstabe: "F", name: "Tabelle", datei: "tabelle.html" },
    { key: "dossier", buchstabe: "G", name: "Dossier", datei: "dossier.html" },
  ];
  // Aussehen unabhängig vom Aufbau: jede Variante lässt sich in jedem Stil zeigen
  const STILE = [
    { key: "standard", name: "Standard", text: "EduKSX wie bisher", muster: "linear-gradient(#fff,#f4f6f8)" },
    { key: "neo", name: "Neo-Dunkel", text: "weiche Tiefe, Orange leuchtet", muster: "linear-gradient(135deg,#2a313b,#1b2027)" },
    { key: "glas", name: "Glas", text: "durchscheinend auf Pastell", muster: "linear-gradient(135deg,#c8d5f6,#f9dfe8,#fde6d2)" },
    { key: "clay", name: "Clay", text: "weich und plastisch", muster: "linear-gradient(135deg,#ffffff,#dfe3f5)" },
    { key: "aurora", name: "Aurora", text: "dunkles Glas über Farbschleiern", muster: "radial-gradient(circle at 25% 30%,#7952b3,transparent 60%),radial-gradient(circle at 80% 70%,#ff8a00,transparent 55%),#0e1220" },
    { key: "brutal", name: "Neubrutalismus", text: "dicke Rahmen, harte Schatten", muster: "linear-gradient(135deg,#fff3c4 0 60%,#222 60% 64%,#fff3c4 64%)" },
    { key: "papier", name: "Papier", text: "ruhig wie Gedrucktes, Serifen", muster: "linear-gradient(#fbf7ef,#efe6d4)" },
    { key: "spiel", name: "Spielerisch", text: "kräftig und gross (Primar)", muster: "linear-gradient(135deg,#ffd6e8,#d6ecff,#fff0c2)" },
    { key: "kontrast", name: "Hoher Kontrast", text: "Barrierefreiheit, keine Transparenz", muster: "linear-gradient(135deg,#fff 50%,#000 50%)" },
    { key: "swiss", name: "Swiss", text: "präzise, sachlich, klares Raster", muster: "linear-gradient(#fff 0 70%,#111 70% 76%,#fff 76%)" },
    { key: "tonal", name: "Tonal", text: "dynamisch, abgestufte Farbflächen", muster: "linear-gradient(135deg,#fdf7ff,#e8def8,#eaddff)" },
    { key: "sachlich", name: "Sachlich", text: "vertraut wie Büroanwendungen", muster: "linear-gradient(#f5f5f5 0 40%,#fff 40%)" },
    { key: "neumorph", name: "Neumorph", text: "weiche Schatten, monochrom", muster: "linear-gradient(135deg,#f6f8fb,#cfd5df)" },
    { key: "bento", name: "Bento", text: "modulare Blöcke, modern", muster: "linear-gradient(90deg,#fff 0 48%,#f2f3f5 48% 52%,#e6f3fa 52%)" },
    { key: "minimal", name: "Minimal", text: "flach und reduziert", muster: "#ffffff" },
    { key: "natur", name: "Natur", text: "Salbei und Sand, sanfte Formen", muster: "linear-gradient(135deg,#dfe8d8,#f3f0e7,#e6d6b8)" },
    { key: "zen", name: "Zen", text: "ruhig und reizarm", muster: "linear-gradient(#f7f5f2,#ebe6de)" },
    { key: "enterprise", name: "Enterprise", text: "kompakt, hohe Informationsdichte", muster: "repeating-linear-gradient(#fff 0 4px,#d8dee6 4px 5px)" },
    { key: "cyberpunk", name: "Cyberpunk", text: "Neon, futuristisch", muster: "linear-gradient(135deg,#07060d 40%,#ff2bd6 40% 55%,#00e5ff 55% 70%,#07060d 70%)" },
    { key: "terminal", name: "Terminal", text: "Monospace, technisch", muster: "linear-gradient(#0b0f0c 0 60%,#5dff95 60% 66%,#0b0f0c 66%)" },
  ];
  // Gruppen für das Fenster «Erscheinungsbild»
  const STILGRUPPEN = [
    ["Sachlich", ["standard", "swiss", "sachlich", "enterprise", "minimal", "papier"]],
    ["Weich", ["clay", "neumorph", "tonal", "glas", "bento"]],
    ["Ruhig", ["zen", "natur"]],
    ["Ausdrucksstark", ["neo", "aurora", "cyberpunk", "terminal", "brutal", "spiel"]],
    ["Barrierefrei", ["kontrast"]],
  ];
  const IMMER_DUNKEL = ["neo", "aurora", "cyberpunk", "terminal"];
  const AKZENTE = [["orange", "EduKSX-Orange", "#ff8a00"], ["blau", "Blau", "#0272ad"], ["violett", "Violett", "#6b46a3"], ["gruen", "Grün", "#1b7a3d"], ["rot", "Rot", "#b71c1c"]];
  // Vorgabe der Schule (im Prototyp fest; später je Mandant in EduKSX-Core)
  const SCHULVORGABE = { stil: "standard", modus: "system", dichte: "normal", akzent: "orange", kontrast: false, bewegung: false, transparenz: false };
  const SPEICHER = "eduksx-ex-bewertung";

  function lesen(k, standard) { try { const v = localStorage.getItem(k); return v === null ? standard : JSON.parse(v); } catch (e) { return standard; } }
  function schreiben(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  const html = document.documentElement;
  const festerStil = () => document.body && document.body.dataset.stilFest;
  let stilJetzt = lesen("eduksx-ex-stil", "standard");
  // Erscheinungsbild: fünf unabhängige Einstellungen (Stil, Farbmodus, Dichte, Akzent, Barrierefreiheit)
  const altDunkel = lesen("eduksx-ex-dunkel", null);
  const eb = Object.assign({}, SCHULVORGABE, altDunkel === null ? {} : { modus: altDunkel ? "dunkel" : "hell" }, lesen("eduksx-ex-eb", {}));
  delete eb.stil;
  const systemDunkel = () => !!(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  function ebSetzen(k, v) { eb[k] = v; schreiben("eduksx-ex-eb", eb); anwenden(); }
  function thema(dunkel) { ebSetzen("modus", dunkel ? "dunkel" : "hell"); }
  if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (eb.modus === "system") anwenden(); });
  function anwenden() {
    const stil = festerStil() || stilJetzt;
    html.dataset.stil = stil;
    html.dataset.dichte = eb.dichte; html.dataset.akzent = eb.akzent;
    eb.kontrast ? html.dataset.kontrast = "an" : delete html.dataset.kontrast;
    eb.bewegung ? html.dataset.bewegung = "aus" : delete html.dataset.bewegung;
    eb.transparenz ? html.dataset.transparenz = "aus" : delete html.dataset.transparenz;
    // Neo-Dunkel ist immer dunkel; sonst gilt die eigene Wahl
    html.classList.toggle("dark", IMMER_DUNKEL.includes(stil) || eb.modus === "dunkel" || (eb.modus === "system" && systemDunkel()));
  }
  function stil(key) { stilJetzt = key; schreiben("eduksx-ex-stil", key); anwenden(); document.dispatchEvent(new CustomEvent("ex-stil", { detail: key })); }
  anwenden();

  function toast(text) {
    const t = document.createElement("div");
    t.className = "ex-toast"; t.setAttribute("role", "status"); t.textContent = text;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
  }

  function bewerten(aktuell) {
    const v = VARIANTEN.find((x) => x.key === aktuell);
    const alt = lesen(SPEICHER, {})[aktuell] || {};
    const d = document.createElement("dialog");
    d.className = "ex-dialog";
    const skala = (feld, titel) => `<fieldset><legend>${titel}</legend><div class="ex-skala">` +
      [1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="${feld}" value="${n}" ${alt[feld] == n ? "checked" : ""}><span>${n}</span></label>`).join("") +
      `</div></fieldset>`;
    d.innerHTML = `<form method="dialog">
      <h2>Variante ${v.buchstabe} – ${v.name} bewerten</h2>
      <p class="muted small" style="margin:0">1 = gar nicht, 5 = sehr. Bleibt nur in diesem Browser gespeichert.</p>
      ${skala("finden", "Ich finde mich sofort zurecht")}
      ${skala("tempo", "Ich komme schnell zum Ziel")}
      ${skala("gefallen", "Die Oberfläche gefällt mir")}
      <label class="small" style="font-weight:600">Bemerkung<textarea name="text" placeholder="Was war gut, was hat gestört?"></textarea></label>
      <div class="zeile"><button value="abbrechen" type="submit">Abbrechen</button><button class="primaer" value="ok" type="submit">Speichern</button></div>
    </form>`;
    d.querySelector("textarea").value = alt.text || "";
    document.body.appendChild(d);
    d.addEventListener("close", () => {
      if (d.returnValue === "ok") {
        const f = new FormData(d.querySelector("form"));
        const alle = lesen(SPEICHER, {});
        alle[aktuell] = { finden: f.get("finden"), tempo: f.get("tempo"), gefallen: f.get("gefallen"), text: f.get("text") || "", zeit: new Date().toISOString() };
        toast(schreiben(SPEICHER, alle) ? "Bewertung gespeichert" : "Speichern in diesem Browser nicht möglich");
      }
      d.remove();
    });
    d.showModal();
  }

  function leiste(aktuell) {
    const nav = document.createElement("nav");
    nav.className = "ex-leiste";
    nav.setAttribute("aria-label", "Oberfläche wechseln");
    nav.innerHTML =
      `<a href="index.html" title="Übersicht aller Varianten" aria-label="Übersicht aller Varianten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>` +
      `<span class="trenner" aria-hidden="true"></span>` +
      VARIANTEN.map((v) => `<a href="${v.datei}" ${v.key === aktuell ? 'aria-current="page"' : ""} title="Variante ${v.buchstabe}: ${v.name}">${v.buchstabe}<span class="lang">&nbsp;${v.name}</span></a>`).join("") +
      `<span class="trenner" aria-hidden="true"></span>` +
      `<button type="button" data-ex="thema" title="Hell/Dunkel umschalten" aria-label="Hell/Dunkel umschalten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>` +
      `<button type="button" data-ex="bewerten" title="Diese Variante bewerten"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg><span class="lang">Bewerten</span></button>`;
    if (aktuell !== "fokus") {
      const sk = document.createElement("button");
      sk.type = "button"; sk.title = "Suchen (Ctrl/⌘ K)"; sk.setAttribute("aria-label", "Suchen (Ctrl/⌘ K)");
      sk.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`;
      sk.addEventListener("click", suche);
      nav.insertBefore(sk, nav.querySelector('[data-ex="thema"]'));
    }
    const ebKnopf = document.createElement("button");
    ebKnopf.type = "button"; ebKnopf.title = "Erscheinungsbild"; ebKnopf.setAttribute("aria-haspopup", "dialog");
    ebKnopf.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A5.7 5.7 0 0 0 22 9.7C22 5.4 17.5 2 12 2z"/></svg><span class="lang">Erscheinungsbild</span>`;
    ebKnopf.addEventListener("click", erscheinungsbild);
    nav.insertBefore(ebKnopf, nav.querySelector('[data-ex="thema"]'));
    const themaKnopf = nav.querySelector('[data-ex="thema"]');
    if (IMMER_DUNKEL.includes(festerStil())) themaKnopf.remove();
    else themaKnopf.addEventListener("click", () => {
      if (IMMER_DUNKEL.includes(festerStil() || stilJetzt)) { toast("Dieser Stil ist immer dunkel"); return; }
      thema(!html.classList.contains("dark"));
    });
    nav.querySelector('[data-ex="bewerten"]').addEventListener("click", () => bewerten(aktuell));
    document.body.appendChild(nav);
  }

  // ---------- Fenster «Erscheinungsbild»: fünf unabhängige Einstellungen ----------
  function erscheinungsbild() {
    if (document.querySelector(".ex-eb")) return;
    const fest = festerStil();
    const d = document.createElement("dialog");
    d.className = "ex-dialog ex-eb"; d.setAttribute("aria-labelledby", "eb-titel");
    const seg = (name, werte, aktuell, gesperrt) => `<div class="segment-eb" role="radiogroup" aria-label="${name}">${werte.map(([k, t]) => `<button type="button" role="radio" data-${name.toLowerCase()}="${k}" aria-checked="${k === aktuell}" ${gesperrt ? "disabled" : ""}>${t}</button>`).join("")}</div>`;
    const stilAkt = fest || stilJetzt, dunkelFest = IMMER_DUNKEL.includes(stilAkt);
    d.innerHTML = `<form method="dialog">
      <h2 id="eb-titel">Erscheinungsbild<button type="submit" class="zu" aria-label="Schliessen">×</button></h2>
      <div class="vorgabe"><span>Vorgabe der Schule: <b>Standard</b>, Akzent <b>EduKSX-Orange</b>, Modus wie System.</span><button type="button" data-zurueck>Auf Schulvorgabe zurücksetzen</button></div>
      <section aria-labelledby="eb-stil"><h3 id="eb-stil">Stil</h3>${fest ? `<p class="muted small" style="margin:0">Diese Variante hat den festen Stil «${STILE.find((x) => x.key === fest).name}».</p>` :
        STILGRUPPEN.map(([g, keys]) => `<div class="stilgruppe">${g}</div><div class="stilraster" role="radiogroup" aria-label="Stil ${g}">${keys.map((k) => { const x = STILE.find((y) => y.key === k); return `<button type="button" role="radio" data-stil="${k}" aria-checked="${k === stilJetzt}"><span class="muster" style="background:${x.muster}" aria-hidden="true"></span><span>${x.name}<small>${x.text}</small></span></button>`; }).join("")}</div>`).join("")}</section>
      <div class="zweispaltig">
        <section><h3>Farbmodus</h3>${seg("Modus", [["hell", "Hell"], ["dunkel", "Dunkel"], ["system", "System"]], eb.modus, dunkelFest)}${dunkelFest ? `<p class="muted small" style="margin:.4rem 0 0">Dieser Stil ist immer dunkel.</p>` : ""}</section>
        <section><h3>Informationsdichte</h3>${seg("Dichte", [["kompakt", "Kompakt"], ["normal", "Normal"], ["komfortabel", "Komfortabel"]], eb.dichte)}</section>
      </div>
      <div class="zweispaltig">
        <section><h3>Akzentfarbe</h3><div class="akzente" role="radiogroup" aria-label="Akzentfarbe">${AKZENTE.map(([k, t, f]) => `<button type="button" role="radio" data-akzent="${k}" aria-checked="${k === eb.akzent}" title="${t}" aria-label="${t}" style="background:${f}">${k === eb.akzent ? "✓" : ""}</button>`).join("")}</div>
          <p class="muted small" style="margin:.4rem 0 0">Z. B. Farbe der Schule; die Wortmarke bleibt unverändert.</p></section>
        <section class="a11y"><h3>Barrierefreiheit</h3>
          <label><input type="checkbox" data-a11y="kontrast" ${eb.kontrast ? "checked" : ""}><span>Erhöhter Kontrast<small>gilt über jedem Stil</small></span></label>
          <label><input type="checkbox" data-a11y="bewegung" ${eb.bewegung ? "checked" : ""}><span>Animationen reduzieren</span></label>
          <label><input type="checkbox" data-a11y="transparenz" ${eb.transparenz ? "checked" : ""}><span>Transparenz deaktivieren<small>z. B. bei Glas und Aurora</small></span></label></section>
      </div>
      <p class="muted small" style="margin:0">Alles wird sofort angewendet und gilt für alle Varianten (gespeichert in diesem Browser; später im Benutzerprofil).</p>
    </form>`;
    document.body.appendChild(d);
    const neuZeichnen = () => {
      const f = document.activeElement, sel = f && [...f.attributes].find((a) => /^data-(stil|modus|dichte|akzent)$/.test(a.name) || a.name === "data-zurueck");
      d._neu = true; d.close(); d.remove(); erscheinungsbild();
      const n = sel && document.querySelector(`.ex-eb [${sel.name}${sel.value ? `="${sel.value}"` : ""}]`); if (n) n.focus();
    };
    d.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) { if (e.target === d) d.close(); return; }
      if (t.dataset.stil) { stil(t.dataset.stil); toast("Stil: " + STILE.find((x) => x.key === t.dataset.stil).name); neuZeichnen(); }
      else if (t.dataset.modus) { ebSetzen("modus", t.dataset.modus); neuZeichnen(); }
      else if (t.dataset.dichte) { ebSetzen("dichte", t.dataset.dichte); neuZeichnen(); }
      else if (t.dataset.akzent) { ebSetzen("akzent", t.dataset.akzent); neuZeichnen(); }
      else if (t.hasAttribute("data-zurueck")) { Object.assign(eb, SCHULVORGABE); delete eb.stil; schreiben("eduksx-ex-eb", eb); if (!fest) stil(SCHULVORGABE.stil); else anwenden(); toast("Schulvorgabe wiederhergestellt"); neuZeichnen(); }
    });
    d.addEventListener("change", (e) => { const c = e.target.closest("[data-a11y]"); if (c) ebSetzen(c.dataset.a11y, c.checked); });
    d.addEventListener("close", () => { if (d._neu) return; d.remove(); const k = document.querySelector('.ex-leiste [aria-haspopup="dialog"]'); if (k) k.focus(); });
    d.showModal();
    const erst = d.querySelector('[aria-checked="true"]'); if (erst) erst.focus();
  }

  // ---------- Suche aus Variante A als Fenster in allen anderen Varianten (Ctrl/⌘ K oder /) ----------
  function suchEintraege() {
    const X = window.EX, liste = [];
    VARIANTEN.forEach((v) => liste.push({ art: "aktion", gruppe: "Aktionen", titel: `Variante ${v.buchstabe} – ${v.name} öffnen`, worte: "variante wechseln " + v.name, tun: () => { location.href = v.datei; } }));
    if (!festerStil()) STILE.forEach((x) => liste.push({ art: "aktion", gruppe: "Aktionen", titel: `Stil: ${x.name}`, worte: "stil aussehen theme " + x.text, tun: () => { stil(x.key); toast("Stil: " + x.name); } }));
    liste.push({ art: "aktion", gruppe: "Aktionen", titel: "Erscheinungsbild …", worte: "stil dichte akzent farbe kontrast barrierefreiheit animation transparenz einstellungen", tun: erscheinungsbild });
    liste.push({ art: "aktion", gruppe: "Aktionen", titel: "Hell/Dunkel umschalten", worte: "dunkel hell modus thema", tun: () => { if (IMMER_DUNKEL.includes(festerStil() || stilJetzt)) toast("Dieser Stil ist immer dunkel"); else thema(!html.classList.contains("dark")); } });
    if (!X) return liste;
    X.AUFGABEN.forEach((a) => liste.push({ art: "aufgabe", id: a.id, gruppe: "Aufgaben", titel: a.titel, neben: X.fmtRelativ(a.faellig), modul: a.modul, worte: a.text + " " + X.modul(a.modul).titel + " " + X.STATUS[a.status].text }));
    X.TERMINE.forEach((t) => liste.push({ art: "termin", id: t.id, gruppe: "Termine", titel: t.titel, neben: X.fmtRelativ(t.start), modul: t.modul, worte: "termin " + t.ort }));
    (X.LERNENDE || []).forEach((l) => liste.push({ art: "lernende", id: l.id, gruppe: "Lernende", titel: l.name + " " + l.vorname, neben: "Klasse " + l.klasse, modul: "staffing", worte: "lernende schüler dossier " + l.klasse + " " + l.schulhaus }));
    (X.PENSEN || []).forEach((p) => liste.push({ art: "person", id: p.id, gruppe: "Personen", titel: p.name + " " + p.vorname, neben: p.funktion, modul: "staffing", worte: p.klassen + " " + p.faecher + " pensum lehrperson" }));
    X.MODULE.forEach((m) => liste.push({ art: "modul", id: m.key, gruppe: "Module", titel: m.titel, neben: m.name, modul: m.key, worte: m.kurz + " modul " + m.name }));
    return liste;
  }
  let sucheOffen = null;
  function suche() {
    if (sucheOffen) return;
    const X = window.EX, d = document.createElement("dialog");
    d.className = "ex-suche"; d.setAttribute("aria-label", "Suche und Befehle");
    d.innerHTML = `<div class="feld"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input type="text" role="combobox" aria-expanded="true" aria-controls="ex-treffer" aria-autocomplete="list" placeholder="Suchen oder Befehl …" aria-label="Suchen oder Befehl eingeben" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
      <div id="ex-treffer" role="listbox" aria-label="Treffer"></div>`;
    document.body.appendChild(d); sucheOffen = d;
    const ein = d.querySelector("input"), box = d.querySelector("#ex-treffer");
    let flach = [], aktiv = 0;
    const alle = suchEintraege();
    function zeigen() {
      const w = ein.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      flach = alle.filter((e) => !w.length ? e.art === "aktion" || e.art === "aufgabe" : w.every((x) => (e.titel + " " + (e.neben || "") + " " + e.worte).toLowerCase().includes(x))).slice(0, 40);
      aktiv = Math.min(aktiv, Math.max(0, flach.length - 1));
      let gruppe = "", html = "";
      flach.forEach((e, i) => {
        if (e.gruppe !== gruppe) { gruppe = e.gruppe; html += `<div class="gruppe" role="presentation">${gruppe}</div>`; }
        const m = e.modul && X ? X.modul(e.modul) : null;
        html += `<div role="option" id="ex-o${i}" data-i="${i}" aria-selected="${i === aktiv}" class="${m ? "m-" + m.farbe : ""}"><span class="ico">${m ? m.icon : "›"}</span><span>${X ? X.esc(e.titel) : e.titel}</span><span class="neben">${X && e.neben ? X.esc(e.neben) : ""}</span></div>`;
      });
      box.innerHTML = html || `<div class="leer">Nichts gefunden.</div>`;
      ein.setAttribute("aria-activedescendant", flach.length ? "ex-o" + aktiv : "");
      const sel = box.querySelector('[aria-selected="true"]'); if (sel) sel.scrollIntoView({ block: "nearest" });
    }
    function waehlen(e) {
      if (!e) return; zu();
      if (e.art === "aktion") { e.tun(); return; }
      if (typeof window.EXUI.beiOeffnen === "function" && window.EXUI.beiOeffnen(e)) return;
      toast(e.titel.slice(0, 48) + " öffnen (Prototyp)");
    }
    const zuvor = document.activeElement;
    function zu() { d.close(); d.remove(); sucheOffen = null; if (zuvor && document.contains(zuvor)) zuvor.focus(); }
    ein.addEventListener("input", () => { aktiv = 0; zeigen(); });
    ein.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { aktiv = Math.min(aktiv + 1, flach.length - 1); zeigen(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { aktiv = Math.max(aktiv - 1, 0); zeigen(); e.preventDefault(); }
      else if (e.key === "Enter") { waehlen(flach[aktiv]); e.preventDefault(); }
    });
    box.addEventListener("mousedown", (e) => { const o = e.target.closest('[role="option"]'); if (o) { e.preventDefault(); waehlen(flach[+o.dataset.i]); } });
    d.addEventListener("cancel", (e) => { e.preventDefault(); zu(); });
    d.addEventListener("click", (e) => { if (e.target === d) zu(); });
    d.showModal(); zeigen(); ein.focus();
  }
  document.addEventListener("keydown", (e) => {
    const v = document.body && document.body.dataset.variante;
    if (!v || v === "fokus" || sucheOffen) return; // A hat die Suche schon als Hauptelement
    const imFeld = e.target.closest && e.target.closest("input, select, textarea, [contenteditable], dialog");
    if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !imFeld)) { e.preventDefault(); suche(); }
  });

  function wortmarke(name) {
    const zusatz = name.slice(6);
    return `<span class="wm" role="img" aria-label="${name}"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span><span class="o">K</span><span class="b">SX</span>${zusatz ? `<span class="n">${zusatz}</span>` : ""}</span></span>`;
  }

  function statusChip(key) {
    const s = window.EX.STATUS[key];
    return `<span class="status ${s.klasse}"><span class="sym" aria-hidden="true">${s.symbol}</span>${s.text}</span>`;
  }

  window.EXUI = { erscheinungsbild, suche, stil, stilAktuell: () => stilJetzt, STILE, VARIANTEN, leiste, wortmarke, statusChip, toast, lesen, schreiben, SPEICHER };
  anwenden();
  if (document.body.dataset.variante) leiste(document.body.dataset.variante);
})();
