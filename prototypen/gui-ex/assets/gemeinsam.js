/* EduKSX-Experience – Variantenwahl, Hell/Dunkel und Bewertung (in allen Varianten gleich). */
(function () {
  "use strict";
  const VARIANTEN = [
    { key: "fokus", buchstabe: "A", name: "Fokus", datei: "fokus.html" },
    { key: "kacheln", buchstabe: "B", name: "Kacheln", datei: "kacheln.html" },
    { key: "zeitstrahl", buchstabe: "C", name: "Zeitstrahl", datei: "zeitstrahl.html" },
    { key: "fenster", buchstabe: "D", name: "Arbeitsfläche", datei: "fenster.html" },
  ];
  const SPEICHER = "eduksx-ex-bewertung";

  function lesen(k, standard) { try { const v = localStorage.getItem(k); return v === null ? standard : JSON.parse(v); } catch (e) { return standard; } }
  function schreiben(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  function thema(dunkel) {
    document.documentElement.classList.toggle("dark", dunkel);
    schreiben("eduksx-ex-dunkel", dunkel);
  }
  thema(lesen("eduksx-ex-dunkel", window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches));

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
    nav.querySelector('[data-ex="thema"]').addEventListener("click", () => thema(!document.documentElement.classList.contains("dark")));
    nav.querySelector('[data-ex="bewerten"]').addEventListener("click", () => bewerten(aktuell));
    document.body.appendChild(nav);
  }

  function wortmarke(name) {
    const zusatz = name.slice(6);
    return `<span class="wm" role="img" aria-label="${name}"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span><span class="o">K</span><span class="b">SX</span>${zusatz ? `<span class="n">${zusatz}</span>` : ""}</span></span>`;
  }

  function statusChip(key) {
    const s = window.EX.STATUS[key];
    return `<span class="status ${s.klasse}"><span class="sym" aria-hidden="true">${s.symbol}</span>${s.text}</span>`;
  }

  window.EXUI = { VARIANTEN, leiste, wortmarke, statusChip, toast, lesen, schreiben, SPEICHER };
  if (document.body.dataset.variante) leiste(document.body.dataset.variante);
})();
