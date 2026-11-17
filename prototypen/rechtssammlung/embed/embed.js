/* EduKSX-Codex – einbettbare Rechtssammlung (iFrame-Widget).
 * Einbinden: <iframe src=".../embed/index.html?org=<id>"></iframe>; das Widget meldet seine Höhe per postMessage
 * ({cxHoehe: Zahl}), damit die Seite der Gemeinde den iFrame ohne Scrollbalken anzeigen kann.
 * Navigation innerhalb des Widgets: Sachgebiet › Unterordner › Dokument, Suche, PDF-Vorschau. Kein innerHTML mit Daten. */
(function () {
  "use strict";
  var D = window.CODEX, root = document.getElementById("cx");
  var q = new URLSearchParams(location.search);
  var org = D.organisationen.filter(function (o) { return o.id === q.get("org"); })[0] || D.organisationen[0];
  var t = org.theme || {};
  var css = document.documentElement.style;
  css.setProperty("--cx-font", "'" + (q.get("schrift") || t.font || "system-ui") + "', Arial, sans-serif");
  css.setProperty("--cx-text", q.get("text") || t.text || "#1d1d1d");
  css.setProperty("--cx-primary", q.get("farbe") || t.primary || "#2f5bd3");
  css.setProperty("--cx-surface", t.surface || "#f4f5f7");
  // Schrift auf Akzentflächen: dunkel bei hellen Akzentfarben (z. B. Gelb), sonst weiss
  (function () {
    var c = (q.get("farbe") || t.primary || "#2f5bd3").replace("#", "");
    if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
    var r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    var hell = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
    css.setProperty("--cx-auf-primary", hell ? "#1d1d1d" : "#fff");
    if (hell) css.setProperty("--cx-link", "#1d1d1d");
  })();
  document.title = "Rechtssammlung – " + org.name;

  function h(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v === null || v === undefined || v === false) return;
      if (k === "text") el.textContent = v; else if (k === "cls") el.className = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v); else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { add(el, x); });
    el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
  function zaehle(n) { return (n.dokumente || []).length + (n.kinder || []).reduce(function (s, k) { return s + zaehle(k); }, 0); }
  function knoten(pfad) { var n = { kinder: org.sections, titel: "Rechtssammlung" }; pfad.forEach(function (i) { n = n.kinder[i]; }); return n; }

  var zustand = { pfad: [], suche: "", dok: null };
  function lesen() {
    var m = location.hash.match(/r=([\d-]*)/);
    zustand.pfad = m && m[1] ? m[1].split("-").map(Number) : [];
  }
  function gehe(pfad) { zustand.dok = null; location.hash = pfad.length ? "r=" + pfad.join("-") : ""; }

  function dokZeile(d) {
    var meta = [d.nummer, d.datum, d.groesse].filter(Boolean).join(" · ");
    return h("li", null, h("button", { type: "button", cls: "cx-zeile", onclick: function () { zustand.dok = d; zeigen(); } },
      h("span", { cls: "cx-dok" }, d.titel), meta ? h("span", { cls: "cx-meta", text: meta }) : null));
  }
  function vorschau(d) {
    var kopf = h("header", null, h("strong", { text: d.titel }),
      h("span", null, d.url ? h("a", { cls: "cx-btn voll", href: d.url, target: "_blank", rel: "noopener", text: "Öffnen ↗" }) : null, " ",
        h("button", { type: "button", cls: "cx-btn", onclick: function () { zustand.dok = null; zeigen(); }, text: "Schliessen" })));
    var inhalt;
    if (!d.url) inhalt = h("p", { cls: "cx-hinweis", text: "Zu diesem Eintrag ist kein Dokument verlinkt." });
    else if (org.pdf_vorschau) inhalt = h("iframe", { src: d.url, title: "Vorschau " + d.titel });
    else inhalt = h("div", { cls: "cx-hinweis" },
      h("p", { text: "Die Website der Gemeinde erlaubt keine eingebettete Vorschau ihrer Dokumente (Sicherheitseinstellung). " +
        "Sobald die Dokumente in der EduKSX-Dokumentenablage liegen, erscheint die PDF-Vorschau direkt hier." }),
      h("a", { cls: "cx-btn voll", href: d.url, target: "_blank", rel: "noopener", text: "Dokument in neuem Fenster öffnen" }));
    return h("section", { cls: "cx-vorschau", "aria-label": "Vorschau" }, kopf, inhalt);
  }
  function alleDocs() {
    var out = [];
    (function lauf(n, p) { (n.dokumente || []).forEach(function (d) { out.push([d, p]); }); (n.kinder || []).forEach(function (k) { lauf(k, p.concat(k.titel)); }); })({ kinder: org.sections }, []);
    return out;
  }

  function zeigen() {
    var n = knoten(zustand.pfad);
    var krumen = [h("button", { type: "button", onclick: function () { gehe([]); }, text: "Rechtssammlung" })];
    var lauf = { kinder: org.sections };
    zustand.pfad.forEach(function (i, x) {
      lauf = lauf.kinder[i];
      var bis = zustand.pfad.slice(0, x + 1);
      krumen.push(" › ", x === zustand.pfad.length - 1 ? h("span", { text: lauf.titel }) : h("button", { type: "button", onclick: function () { gehe(bis); }, text: lauf.titel }));
    });
    var such = h("input", { type: "search", cls: "cx-suche", placeholder: "In der Rechtssammlung suchen", "aria-label": "Suchen", value: zustand.suche });
    such.addEventListener("input", function () { zustand.suche = such.value; liste(); });
    var bereich = h("div");
    function liste() {
      bereich.textContent = "";
      var f = zustand.suche.trim().toLowerCase();
      if (f) {
        var treffer = alleDocs().filter(function (x) { return (x[0].titel + " " + (x[0].nummer || "")).toLowerCase().indexOf(f) >= 0; });
        add(bereich, [h("h2", { text: treffer.length + " Treffer" }),
          treffer.length ? h("ul", { cls: "cx-liste" }, treffer.map(function (x) { var li = dokZeile(x[0]); li.firstChild.appendChild(h("span", { cls: "cx-meta", text: x[1].join(" › ") })); return li; }))
                         : h("p", { cls: "cx-leer", text: "Keine Treffer." })]);
      } else {
        add(bereich, [h("h2", { text: zustand.pfad.length ? n.titel : org.name }),
          h("ul", { cls: "cx-liste" },
            (n.kinder || []).map(function (k, i) {
              var ziel = zustand.pfad.concat(i);
              return h("li", null, h("button", { type: "button", cls: "cx-zeile", onclick: function () { gehe(ziel); } },
                h("span", { cls: "cx-ord", text: k.titel }), h("span", { cls: "cx-anz", text: zaehle(k) + " Dokumente" })));
            }),
            (n.dokumente || []).map(dokZeile)),
          !zaehle(n) ? h("p", { cls: "cx-leer", text: "Keine Dokumente in diesem Bereich." }) : null]);
      }
      if (zustand.dok) bereich.appendChild(vorschau(zustand.dok));
      melden();
    }
    root.textContent = "";
    add(root, [h("div", { cls: "cx-kopf" }, h("nav", { cls: "cx-pfad", "aria-label": "Pfad" }, krumen), such), bereich,
      h("p", { cls: "cx-fuss", text: "Rechtssammlung bereitgestellt mit EduKSX-Codex · Stand " + D.stand }) ]);
    liste();
  }
  function melden() {
    if (window.parent !== window) window.parent.postMessage({ cxHoehe: document.documentElement.scrollHeight }, "*");
  }
  window.addEventListener("hashchange", function () { lesen(); zeigen(); });
  window.addEventListener("resize", melden);
  lesen(); zeigen();
})();
