/* EduKSX-Codex – Rechtssammlung: Übersicht mit Menü Bezirk › Gemeinde › Rubriken.
 * Daten aus assets/daten.js (window.CODEX, erzeugt von tools/build.py). Navigation über #/…-Adressen.
 * DOM wird ausschliesslich mit createElement/textContent aufgebaut (kein innerHTML mit Daten). */
(function () {
  "use strict";
  var D = window.CODEX;
  var ORG = {};
  D.organisationen.forEach(function (o) { ORG[o.id] = o; });

  // ------------------------------------------------------------------ Hilfen
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "text") el.textContent = v;
      else if (k === "cls") el.className = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  function enc(s) { return encodeURIComponent(s); }
  function badge(cls, sym, text) { return h("span", { cls: "badge " + cls }, h("span", { "aria-hidden": "true", text: sym }), text); }
  function status(erfasst) { return erfasst ? badge("erfolg", "✓", "erfasst") : badge("neutral", "○", "offen"); }
  function extern(url, text) { return h("a", { href: url, target: "_blank", rel: "noopener" }, text); }
  function zaehle(n) { return (n.dokumente || []).length + (n.kinder || []).reduce(function (s, k) { return s + zaehle(k); }, 0); }
  function knoten(o, pfad) {
    var n = { kinder: o.sections };
    pfad.forEach(function (i) { n = n.kinder[i]; });
    return n;
  }
  function gemeindenIn(b) { return D.gemeinden.filter(function (g) { return g.bezirk === b; }); }
  function schulenIn(b) { return D.organisationen.filter(function (o) { return o.bezirk === b && o.typ !== "Politische Gemeinde"; }); }
  function orgZuGemeinde(g) { return g.org ? ORG[g.org] : null; }

  // ------------------------------------------------------------------ Adresse
  function route() {
    var teile = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
    return { art: teile[0] || "", a: teile[1] || "", b: teile[2] || "" };
  }
  function link(art, a, b) { return "#/" + [art, a, b].filter(Boolean).map(enc).join("/"); }

  // ------------------------------------------------------------------ Menü
  function navi(r) {
    var aktivOrg = r.art === "org" ? ORG[r.a] : null;
    var aktivBezirk = r.art === "bezirk" ? r.a : r.art === "gemeinde" ? r.a : aktivOrg ? aktivOrg.bezirk : "";
    function eintrag(href, text, aktiv, extra) {
      return h("a", { href: href, "aria-current": aktiv ? "page" : null }, h("span", { cls: "nl", text: text }), extra || null);
    }
    function rubriken(o) {
      if (!aktivOrg || aktivOrg.id !== o.id) return null;
      return h("ul", { cls: "rubriken" }, o.sections.map(function (s, i) {
        return h("li", null, eintrag(link("org", o.id, String(i)), s.titel, r.b === String(i), h("span", { cls: "anz", text: zaehle(s) })));
      }));
    }
    function orgEintrag(o, text) {
      return h("li", null, eintrag(link("org", o.id), text, aktivOrg && aktivOrg.id === o.id && !r.b, h("span", { cls: "ok", title: "erfasst", text: "✓" })), rubriken(o));
    }
    var liste = h("ul", { cls: "baum" });
    D.bezirke.forEach(function (b) {
      var gem = gemeindenIn(b), sch = schulenIn(b);
      var erf = gem.filter(function (g) { return g.org; }).length + sch.length;
      var det = h("details", { open: b === aktivBezirk || null, "data-bezirk": b },
        h("summary", null, h("span", { cls: "nl", text: "Bezirk " + b }), h("span", { cls: "anz", text: gem.length })),
        h("ul", null,
          h("li", null, eintrag(link("bezirk", b), "Übersicht Bezirk", r.art === "bezirk" && r.a === b, erf ? h("span", { cls: "anz", text: erf + " ✓" }) : null)),
          h("li", { cls: "zweig", "aria-hidden": "true", text: "Politische Gemeinden" }),
          gem.map(function (g) {
            var o = orgZuGemeinde(g);
            if (o) return orgEintrag(o, g.gemeinde);
            return h("li", { "data-name": g.gemeinde }, eintrag(link("gemeinde", b, g.gemeinde), g.gemeinde, r.art === "gemeinde" && r.b === g.gemeinde));
          }),
          h("li", { cls: "zweig", "aria-hidden": "true", text: "Schulgemeinden" }),
          sch.length ? sch.map(function (o) { return orgEintrag(o, o.name); })
                     : h("li", { cls: "leer", text: "noch nicht erfasst" })));
      liste.appendChild(h("li", null, det));
    });
    var such = h("input", { type: "text", id: "suche", placeholder: "Gemeinde suchen", "aria-label": "Gemeinde im Menü suchen" });
    such.addEventListener("input", function () {
      var f = such.value.trim().toLowerCase();
      liste.querySelectorAll("details").forEach(function (d) {
        var treffer = 0;
        d.querySelectorAll(":scope > ul > li").forEach(function (li) {
          if (li.classList.contains("zweig") || li.classList.contains("leer")) return;
          var t = li.textContent.toLowerCase();
          var ok = !f || t.indexOf(f) >= 0 || d.getAttribute("data-bezirk").toLowerCase().indexOf(f) >= 0;
          li.style.display = ok ? "" : "none";
          if (ok && f) treffer++;
        });
        d.style.display = !f || treffer ? "" : "none";
        if (f) d.open = treffer > 0;
      });
    });
    return h("nav", { cls: "navi", "aria-label": "Rechtssammlungen nach Bezirk" },
      h("ul", null,
        h("li", { cls: "gruppe", "aria-hidden": "true", text: "Überblick" }),
        h("li", null, eintrag("#/", "Übersicht und Vergleich", r.art === "")),
        h("li", null, eintrag(link("gemeinden"), "Alle 160 Gemeinden", r.art === "gemeinden")),
        h("li", { cls: "gruppe", "aria-hidden": "true", text: "Bezirke" })),
      h("div", { cls: "suche" }, such),
      liste);
  }

  // ------------------------------------------------------------------ Ansichten
  function kopf(titel, unter, aktionen) {
    return h("div", { cls: "seitenkopf" }, h("div", null, h("h1", { text: titel }), unter ? h("p", { cls: "muted", text: unter }) : null),
      aktionen ? h("div", { cls: "aktionen" }, aktionen) : null);
  }
  function fakten(paare) {
    return h("dl", { cls: "fakten" }, paare.map(function (p) { return [h("dt", { text: p[0] }), h("dd", null, p[1])]; }));
  }

  function uebersicht() {
    var karten = D.organisationen.map(function (o) {
      return h("article", { cls: "karte org" },
        h("h2", null, h("a", { href: link("org", o.id), text: o.name })),
        h("p", { cls: "small" }, badge("neutral", "", o.typ), " ", badge("neutral", "", "Bezirk " + o.bezirk), " ", badge("violett", "", o.anzahl_dokumente + " Dokumente")),
        fakten([["Menüpfad", o.menu_pfad.join(" › ")], ["CMS", o.cms], ["Aufbau", o.struktur]]),
        h("div", { cls: "formzeile" }, h("a", { cls: "btn primaer", href: link("org", o.id), text: "Struktur ansehen" }),
          h("a", { cls: "btn", href: "demo/" + o.id + ".html", text: "Demo-Seite" })));
    });
    var zeilen = [["CMS", "cms"], ["Menüpfad", function (o) { return o.menu_pfad.join(" › "); }],
      ["Rubriken / Dokumente", function (o) { return o.anzahl_rubriken + " / " + o.anzahl_dokumente; }],
      ["Ordnertiefe", "max_tiefe"], ["Nummerierung", "nummerierung"]];
    var erfasst = D.gemeinden.filter(function (g) { return g.org; }).length;
    return [
      kopf("Systematische Rechtssammlungen im Kanton Zürich",
        "Gemeinden und Schulgemeinden veröffentlichen ihr geltendes Recht in einer systematisch aufgebauten Rechtssammlung. EduKSX-Codex erfasst, wie sie heute aufgebaut sind."),
      h("div", { cls: "karten kennzahlen" },
        [["Bezirke", D.bezirke.length], ["Politische Gemeinden", D.gemeinden.length], ["davon erfasst", erfasst],
         ["Schulgemeinden erfasst", D.organisationen.length - erfasst]].map(function (k) {
          return h("div", { cls: "karte" }, h("div", { cls: "titel muted small", text: k[0] }), h("div", { cls: "zahl", text: k[1] }));
        })),
      h("h2", { text: "Pilot: " + D.organisationen.length + " Organisationen" }),
      h("div", { cls: "gitter" }, karten),
      h("h2", { text: "Vergleich" }),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, h("th"), D.organisationen.map(function (o) { return h("th", { scope: "col", text: o.kurz }); }))),
        h("tbody", null, zeilen.map(function (z) {
          return h("tr", null, h("th", { scope: "row", text: z[0] }), D.organisationen.map(function (o) {
            return h("td", { text: typeof z[1] === "function" ? z[1](o) : String(o[z[1]]) });
          }));
        }))))
    ];
  }

  function alleGemeinden() {
    var such = h("input", { type: "text", placeholder: "Gemeinde oder Bezirk" });
    var body = h("tbody", null, D.gemeinden.map(function (g) {
      var o = orgZuGemeinde(g);
      return h("tr", null, h("td", null, h("a", { href: link("bezirk", g.bezirk), text: g.bezirk })),
        h("td", null, h("a", { href: o ? link("org", o.id) : link("gemeinde", g.bezirk, g.gemeinde), text: g.gemeinde })),
        h("td", { text: g.cms || "" }), h("td", null, status(!!o)));
    }));
    such.addEventListener("input", function () {
      var f = such.value.toLowerCase();
      Array.prototype.forEach.call(body.rows, function (tr) { tr.style.display = tr.textContent.toLowerCase().indexOf(f) >= 0 ? "" : "none"; });
    });
    return [kopf("Alle 160 politischen Gemeinden", "Stand gemäss Gemeindeverzeichnis Kanton Zürich."),
      h("div", { cls: "formzeile" }, h("label", { cls: "feld" }, "Filtern ", such)),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, ["Bezirk", "Gemeinde", "CMS", "Status"].map(function (t) { return h("th", { text: t }); }))), body))];
  }

  function bezirk(b) {
    if (D.bezirke.indexOf(b) < 0) return nichtGefunden();
    var gem = gemeindenIn(b), sch = schulenIn(b);
    return [kopf("Bezirk " + b, gem.length + " politische Gemeinden · " + sch.length + " Schulgemeinden erfasst"),
      h("h2", { text: "Politische Gemeinden" }),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, ["Gemeinde", "CMS", "Rechtssammlung", "Status"].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, gem.map(function (g) {
          var o = orgZuGemeinde(g);
          return h("tr", null, h("td", null, h("a", { href: o ? link("org", o.id) : link("gemeinde", b, g.gemeinde), text: g.gemeinde })),
            h("td", { text: g.cms || "" }), h("td", null, g.rechtssammlung_url ? extern(g.rechtssammlung_url, "Original ↗") : ""), h("td", null, status(!!o)));
        })))),
      h("h2", { text: "Schulgemeinden" }),
      sch.length ? h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, ["Schulgemeinde", "Typ", "Sitz", "Dokumente"].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, sch.map(function (o) {
          return h("tr", null, h("td", null, h("a", { href: link("org", o.id), text: o.name })), h("td", { text: o.typ }),
            h("td", { text: o.sitz || "" }), h("td", { cls: "zahl", text: o.anzahl_dokumente }));
        }))))
        : h("p", { cls: "meldung info", text: "In diesem Bezirk ist noch keine Schulgemeinde erfasst." })];
  }

  function gemeinde(b, name) {
    var g = D.gemeinden.filter(function (x) { return x.bezirk === b && x.gemeinde === name; })[0];
    if (!g) return nichtGefunden();
    var schulen = D.organisationen.filter(function (o) { return (o.gemeinden || []).indexOf(name) >= 0 && o.typ !== "Politische Gemeinde"; });
    return [kopf(name, "Politische Gemeinde · Bezirk " + b, h("a", { cls: "btn", href: link("bezirk", b), text: "← Bezirk " + b })),
      h("p", { cls: "meldung info" }, "Die Rechtssammlung von ", name, " ist noch nicht erfasst. Nächster Schritt: Website und CMS ermitteln, dann Menüpfad, Rubriken und Dateien aufnehmen."),
      fakten([["Status", status(false)], ["Website", g.website ? extern(g.website, g.website) : "noch nicht ermittelt"]]),
      schulen.length ? [h("h2", { text: "Erfasste Schulgemeinden mit " + name }),
        h("ul", null, schulen.map(function (o) { return h("li", null, h("a", { href: link("org", o.id), text: o.name })); }))] : null];
  }

  function baum(o, n, pfad, tiefe) {
    return h("li", null,
      h("a", { href: link("org", o.id, pfad.join("-")), text: n.titel }), " ",
      h("span", { cls: "muted small", text: "(" + zaehle(n) + ")" }),
      tiefe < 3 && n.kinder.length ? h("ul", null, n.kinder.map(function (k, i) { return baum(o, k, pfad.concat(i), tiefe + 1); })) : null);
  }

  function organisation(o) {
    return [kopf(o.name, o.typ + " · Bezirk " + o.bezirk + (o.sitz ? " · Sitz " + o.sitz : ""),
        [h("a", { cls: "btn primaer", href: "demo/" + o.id + ".html", text: "Demo-Seite" }), " ", extern(o.rs_url, "Original ↗")]),
      h("div", { cls: "spalten" },
        h("div", { cls: "karte" }, h("h2", { text: "Steckbrief" }),
          fakten([["Website", extern(o.website, o.website)], ["Menüpfad", o.menu_pfad.join(" › ")],
            ["Weitere Einstiege", o.weitere_einstiege.join("; ")], ["CMS", o.cms], ["Aufbau", o.struktur],
            ["Nummerierung", o.nummerierung], ["Umfang", o.anzahl_rubriken + " Rubriken · " + o.anzahl_dokumente + " Dokumente · Ordnertiefe " + o.max_tiefe],
            ["Stand", o.stand]])),
        h("div", { cls: "karte" }, h("h2", { text: "Befunde" }), h("ul", null, o.befunde.map(function (b) { return h("li", { text: b }); })))),
      h("h2", { text: "Struktur der Rechtssammlung" }),
      h("div", { cls: "karte" }, h("ul", { cls: "struktur" }, o.sections.map(function (s, i) { return baum(o, s, [i], 1); })))];
  }

  function rubrik(o, pfadText) {
    var pfad = pfadText.split("-").map(Number), n;
    try { n = knoten(o, pfad); } catch (e) { n = null; }
    if (!n || !n.titel) return nichtGefunden();
    var krumen = [h("a", { href: link("org", o.id), text: o.name })];
    var lauf = { kinder: o.sections };
    pfad.forEach(function (i, x) {
      lauf = lauf.kinder[i];
      krumen.push(" › ");
      krumen.push(x === pfad.length - 1 ? h("strong", { text: lauf.titel }) : h("a", { href: link("org", o.id, pfad.slice(0, x + 1).join("-")), text: lauf.titel }));
    });
    function tabelle(docs) {
      var spalten = docs.some(function (d) { return d.groesse || d.datum; });
      return h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, h("th", { text: "Dokument" }), spalten ? [h("th", { text: "Grösse" }), h("th", { text: "Datum" })] : null)),
        h("tbody", null, docs.map(function (d) {
          return h("tr", null, h("td", null, d.url ? extern(d.url, d.titel) : h("span", null, d.titel, " ", badge("warnung", "!", "kein Link"))),
            spalten ? [h("td", { text: d.groesse || "" }), h("td", { text: d.datum || "" })] : null);
        }))));
    }
    function abschnitt(k, ebene) {
      return [h(ebene === 2 ? "h2" : "h3", { text: k.titel + " (" + zaehle(k) + ")" }),
        k.dokumente.length ? tabelle(k.dokumente) : null,
        k.kinder.map(function (kk) { return abschnitt(kk, 3); }),
        !zaehle(k) ? h("p", { cls: "muted", text: "Keine Dokumente." }) : null];
    }
    return [h("p", { cls: "small muted" }, krumen),
      kopf(n.titel, zaehle(n) + " Dokumente", h("a", { cls: "btn", href: link("org", o.id), text: "← Struktur" })),
      n.dokumente.length ? tabelle(n.dokumente) : null,
      n.kinder.map(function (k) { return abschnitt(k, 2); }),
      !zaehle(n) ? h("p", { cls: "meldung info", text: "Diese Rubrik ist in der Original-Rechtssammlung leer." }) : null];
  }

  function nichtGefunden() { return [kopf("Nicht gefunden"), h("p", null, h("a", { href: "#/", text: "Zur Übersicht" }))]; }

  // ------------------------------------------------------------------ Aufbau
  function zeigen() {
    var r = route(), inhalt;
    if (r.art === "") inhalt = uebersicht();
    else if (r.art === "gemeinden") inhalt = alleGemeinden();
    else if (r.art === "bezirk") inhalt = bezirk(r.a);
    else if (r.art === "gemeinde") inhalt = gemeinde(r.a, r.b);
    else if (r.art === "org" && ORG[r.a]) inhalt = r.b ? rubrik(ORG[r.a], r.b) : organisation(ORG[r.a]);
    else inhalt = nichtGefunden();
    var rahmen = document.getElementById("rahmen");
    var alteSuche = document.getElementById("suche");
    var suchwert = alteSuche ? alteSuche.value : "";
    rahmen.textContent = "";
    var nav = navi(r);
    rahmen.appendChild(nav);
    rahmen.appendChild(h("main", { id: "inhalt", tabindex: "-1" }, inhalt));
    if (suchwert) { var s = document.getElementById("suche"); s.value = suchwert; s.dispatchEvent(new Event("input")); }
    var aktiv = nav.querySelector('[aria-current="page"]');
    if (aktiv && aktiv.scrollIntoView) aktiv.scrollIntoView({ block: "nearest" });
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", zeigen);
  document.getElementById("thema").addEventListener("click", function () {
    var d = document.documentElement.classList.toggle("dark");
    try { localStorage.setItem("eduksx-thema", d ? "dark" : "light"); } catch (e) {}
  });
  zeigen();
})();
