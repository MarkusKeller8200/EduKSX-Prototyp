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
  function sgIn(b) { return D.schulgemeinden.filter(function (s) { return s.bezirk === b; }); }
  function eschulen(b) { return D.organisationen.filter(function (o) { return o.bezirk === b && o.typ === "Schule der Einheitsgemeinde"; }); }
  // Kurzform im Menü: EG = Einheitsgemeinde (Schule ganz oder für eine Stufe bei der Gemeinde), «?» = nicht gesichert
  function egKurz(e) {
    if (!e) return "";
    if (/^keine/.test(e)) return "keine EG";
    return "EG" + (/\?\s*$/.test(e) ? " ?" : "");
  }
  function egTitel(e) { return e ? e.replace(/\s*\?\s*$/, " (nicht gesichert)") : ""; }
  function vermerk(g) { return g.einheit ? " (" + egKurz(g.einheit) + ")" : ""; }
  var SYM = { ja: ["✓", "erfolg", "vorhanden"], unsicher: ["?", "warnung", "unsicher"], nein: ["–", "neutral", "fehlt"] };
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
    var aktivSg = r.art === "sg" ? D.schulgemeinden.filter(function (s) { return s.name === r.a; })[0] : null;
    var aktivBezirk = r.art === "bezirk" ? r.a : r.art === "gemeinde" ? r.a : aktivOrg ? aktivOrg.bezirk : aktivSg ? aktivSg.bezirk : "";
    function eintrag(href, text, aktiv, extra, titel) {
      return h("a", { href: href, title: titel || null, "aria-current": aktiv ? "page" : null }, h("span", { cls: "nl", text: text }), extra || null);
    }
    function rubriken(o) {
      if (!aktivOrg || aktivOrg.id !== o.id) return null;
      return h("ul", { cls: "rubriken" }, o.sections.map(function (s, i) {
        return h("li", null, eintrag(link("org", o.id, String(i)), s.titel, r.b === String(i) || r.b.indexOf(i + "-") === 0, h("span", { cls: "anz", text: zaehle(s) })));
      }));
    }
    function orgEintrag(o, text, titel) {
      return h("li", null, eintrag(link("org", o.id), text, aktivOrg && aktivOrg.id === o.id && !r.b, h("span", { cls: "ok", title: "erfasst", text: "✓" }), titel), rubriken(o));
    }
    var liste = h("ul", { cls: "baum" });
    D.bezirke.forEach(function (b) {
      var gem = gemeindenIn(b), sch = schulenIn(b);
      var erf = D.organisationen.filter(function (o) { return o.bezirk === b; }).length;
      var det = h("details", { open: b === aktivBezirk || null, "data-bezirk": b },
        h("summary", null, h("span", { cls: "nl", text: "Bezirk " + b }), h("span", { cls: "anz", title: gem.filter(orgZuGemeinde).length + " von " + gem.length + " Gemeinden analysiert" },
          String(gem.filter(orgZuGemeinde).length) + " / ", h("strong", { text: String(gem.length) }))),
        h("ul", null,
          h("li", null, eintrag(link("bezirk", b), "Übersicht Bezirk", r.art === "bezirk" && r.a === b, erf ? h("span", { cls: "anz", text: erf + " ✓" }) : null)),
          h("li", { cls: "zweig", "aria-hidden": "true", text: "Politische Gemeinden" }),
          gem.map(function (g) {
            var o = orgZuGemeinde(g);
            if (o) return orgEintrag(o, g.gemeinde + vermerk(g), egTitel(g.einheit));
            return h("li", { "data-name": g.gemeinde }, eintrag(link("gemeinde", b, g.gemeinde), g.gemeinde + vermerk(g), r.art === "gemeinde" && r.b === g.gemeinde, null, egTitel(g.einheit)));
          }),
          h("li", { cls: "zweig", "aria-hidden": "true", text: "Schulgemeinden" }),
          sgIn(b).length ? sgIn(b).map(function (s) {
            if (s.org && ORG[s.org]) return orgEintrag(ORG[s.org], s.name);
            return h("li", { "data-name": s.name }, eintrag(link("sg", s.name), s.name, r.art === "sg" && r.a === s.name));
          }) : h("li", { cls: "leer", text: "keine Schulgemeinden (alle Einheitsgemeinden)" }),
          eschulen(b).length ? [h("li", { cls: "zweig", "aria-hidden": "true", text: "Schulen der Einheitsgemeinden" }),
            eschulen(b).map(function (o) { return orgEintrag(o, o.kurz + " (EG)", "Schule der Einheitsgemeinde"); })] : null));
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
        h("li", null, eintrag("#/", "Übersicht", r.art === "")),
        h("li", null, eintrag(link("vergleich"), "Vergleich", r.art === "vergleich")),
        h("li", null, eintrag(link("gemeinden"), "Alle 160 Gemeinden", r.art === "gemeinden")),
        h("li", null, eintrag(link("schulgemeinden"), "Alle " + D.schulgemeinden.length + " Schulgemeinden", r.art === "schulgemeinden")),
        h("li", null, eintrag(link("matrix"), "Struktur-Matrix", r.art === "matrix")),
        h("li", null, eintrag(link("grundlagen"), "Grundlagen (Leitfaden, ZH-Lex)", r.art === "grundlagen")),
        h("li", { cls: "gruppe", "aria-hidden": "true", text: "Gesetzestexte & Verordnungen" }),
        h("li", null, eintrag(link("rechtsgrundlagen"), "Rechtsgrundlagen Schule", r.art === "rechtsgrundlagen", h("span", { cls: "anz", text: String(D.rechtsgrundlagen.eintraege.length) }))),
        h("li", null, eintrag(link("herkunft"), "Herkunftsliste (Publikationsquellen)", r.art === "herkunft")),
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

  function vergleich() {
    var karten = D.organisationen.map(function (o) {
      return h("article", { cls: "karte org" },
        h("h2", null, h("a", { href: link("org", o.id), text: o.name })),
        h("p", { cls: "small" }, badge("neutral", "", o.typ), " ", badge("neutral", "", "Bezirk " + o.bezirk), " ", badge("violett", "", o.anzahl_dokumente + " Dokumente")),
        fakten([["Menüpfad", o.menu_pfad.join(" › ")], ["CMS", o.cms], ["Aufbau", o.struktur]]),
        h("div", { cls: "formzeile" }, h("a", { cls: "btn primaer", href: link("org", o.id), text: "Struktur ansehen" }),
          h("a", { cls: "btn", href: link("org", o.id, "ansicht-vergleich"), text: "Original ⟷ Nachbau" })));
    });
    var zeilen = [["CMS", "cms"], ["Menüpfad", function (o) { return o.menu_pfad.join(" › "); }],
      ["Rubriken / Dokumente", function (o) { return o.anzahl_rubriken + " / " + o.anzahl_dokumente; }],
      ["Leitfaden-Prüfung", function (o) { return lfZusammenfassung(o); }],
      ["Ordnertiefe", "max_tiefe"], ["Nummerierung", "nummerierung"]];
    var erfasst = D.gemeinden.filter(function (g) { return g.org; }).length;
    var schulAufgaben = D.gemeinden.filter(function (g) { return /^Einheitsgemeinde/.test(g.einheit || ""); }).length;
    return [
      kopf("Vergleich der erfassten Rechtssammlungen",
        "Aufbau, Menüpfad, Umfang und Nummerierung je Organisation – Grundlage für eine einheitliche Codex-Normalform."),
      h("div", { cls: "karten kennzahlen" },
        [["Bezirke", D.bezirke.length], ["Politische Gemeinden", D.gemeinden.length], ["davon erfasst", erfasst],
         ["Schulgemeinden", D.schulgemeinden.length], ["Organisationen erfasst", D.organisationen.length],
         ["mit Schulaufgaben (Herleitung)", schulAufgaben + " / 114"]].map(function (k) {
          return h("div", { cls: "karte" }, h("div", { cls: "titel muted small", text: k[0] }), h("div", { cls: "zahl", text: k[1] }));
        })),
      h("p", { cls: "small muted", text: "«mit Schulaufgaben»: aus dem Gemeindeverzeichnis hergeleitet (Einheitsgemeinde ganz oder für eine Stufe); amtlich sind es 114. Abweichungen entstehen, wo die Mitglieder einer Schulgemeinde noch nicht bekannt sind (Vermerk «EG ?» im Menü, EG = Einheitsgemeinde)." }),
      h("h2", { text: "Erfasst: " + D.organisationen.length + " Organisationen" }),
      h("div", { cls: "gitter" }, karten),
      h("h2", { text: "Vergleichstabelle" }),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, h("th", { scope: "col", text: "Organisation" }), zeilen.map(function (z) { return h("th", { scope: "col", text: z[0] }); }))),
        h("tbody", null, D.organisationen.map(function (o) {
          return h("tr", null, h("th", { scope: "row" }, h("a", { href: link("org", o.id), text: o.kurz })), zeilen.map(function (z) {
            var v = typeof z[1] === "function" ? z[1](o) : String(o[z[1]]);
            return typeof v === "string" ? h("td", { text: v }) : h("td", null, v);
          }));
        }))))
    ];
  }

  // ------------------------------------------------------------------ Übersicht (Startseite)
  function kennzahl(href, titel, zahl, unter) {
    return h("a", { cls: "karte kachel", href: href }, h("div", { cls: "titel", text: titel }), h("div", { cls: "zahl" }, zahl), h("div", { cls: "small muted" }, unter));
  }
  function balken(teil, ganz, text) {
    var anteil = ganz ? Math.round(teil / ganz * 100) : 0;
    return h("span", { cls: "fortschritt" }, h("span", { cls: "balken", role: "img", "aria-label": text || (teil + " von " + ganz) },
      h("span", { style: "width:" + anteil + "%" })), h("span", { cls: "small muted", text: text || (teil + " / " + ganz) }));
  }
  function uebersicht() {
    var orgs = D.organisationen;
    var pgErf = D.gemeinden.filter(function (g) { return g.org; }).length;
    var sgErf = D.schulgemeinden.filter(function (s) { return s.org; }).length;
    var schulenEg = orgs.filter(function (o) { return o.typ === "Schule der Einheitsgemeinde"; }).length;
    var dokumente = orgs.reduce(function (n, o) { return n + o.anzahl_dokumente; }, 0);
    var punkte = { ja: 0, unsicher: 0, nein: 0 };
    orgs.forEach(function (o) { (o.leitfaden || []).forEach(function (p) { if (punkte[p.status] !== undefined) punkte[p.status]++; }); });
    var arten = {};
    orgs.forEach(function (o) { Object.keys(o.arten || {}).forEach(function (a) { arten[a] = (arten[a] || 0) + o.arten[a]; }); });
    var vorbildlich = orgs.filter(function (o) { return !(o.leitfaden || []).some(function (p) { return p.status === "nein"; }) && (o.leitfaden || []).filter(function (p) { return p.status === "unsicher"; }).length <= 2; });
    var handlung = [], handlungOrg = [];
    orgs.forEach(function (o) {
      var nein = (o.leitfaden || []).filter(function (p) { return p.status === "nein"; });
      nein.forEach(function (p) { handlung.push([o, p]); });
      if (nein.length) handlungOrg.push([o, nein]);
    });
    handlungOrg.sort(function (a, b) { return b[1].length - a[1].length || b[0].anzahl_dokumente - a[0].anzahl_dokumente; });
    var cms = {};
    orgs.forEach(function (o) { var k = o.cms.split(" (")[0]; cms[k] = (cms[k] || 0) + 1; });
    var bezirke = D.bezirke.map(function (b) {
      var g = gemeindenIn(b);
      return { b: b, n: g.length, erf: g.filter(orgZuGemeinde).length, sg: sgIn(b).length, sgErf: sgIn(b).filter(function (s) { return s.org; }).length };
    });
    var orgsSortiert = orgs.slice().sort(function (a, b) { return b.anzahl_dokumente - a.anzahl_dokumente; });

    return [
      kopf("Übersicht",
        "Gemeinden und Schulgemeinden veröffentlichen ihr geltendes Recht in einer systematisch aufgebauten Rechtssammlung (§ 7 Abs. 2 GG). EduKSX-Codex erfasst, wie diese heute aufgebaut sind, prüft sie gegen den kantonalen Leitfaden und bereitet eine einheitliche Rechtssammlung vor.",
        [h("a", { cls: "btn", href: link("grundlagen"), text: "Leitfaden" }), h("a", { cls: "btn primaer", href: link("matrix"), text: "Struktur-Matrix" })]),
      h("div", { cls: "karten" },
        kennzahl(link("gemeinden"), "Politische Gemeinden erfasst", [String(pgErf), h("span", { cls: "von", text: " / " + D.gemeinden.length })], "in " + bezirke.filter(function (x) { return x.erf; }).length + " von " + D.bezirke.length + " Bezirken"),
        kennzahl(link("schulgemeinden"), "Schulgemeinden erfasst", [String(sgErf), h("span", { cls: "von", text: " / " + D.schulgemeinden.length })], "dazu " + schulenEg + " Schulen von Einheitsgemeinden"),
        kennzahl(link("vergleich"), "Dokumente erfasst", String(dokumente), "aus " + orgs.length + " Rechtssammlungen"),
        kennzahl(link("grundlagen"), "Leitfaden-Prüfung", [badge("erfolg", "✓", String(punkte.ja)), " ", badge("warnung", "?", String(punkte.unsicher)), " ", badge("fehler", "✗", String(punkte.nein))],
          handlung.length + " Prüfpunkte nicht erfüllt")),
      h("div", { cls: "spalten" },
        h("section", { cls: "karte" }, h("h2", { text: "Fortschritt je Bezirk" }),
          h("table", { cls: "kompakt" },
            h("thead", null, h("tr", null, h("th", { scope: "col", text: "Bezirk" }), h("th", { scope: "col", text: "Politische Gemeinden" }), h("th", { scope: "col", text: "Schulgemeinden" }))),
            h("tbody", null, bezirke.map(function (x) {
              return h("tr", null, h("th", { scope: "row" }, h("a", { href: link("bezirk", x.b), text: x.b })),
                h("td", null, balken(x.erf, x.n)), h("td", null, x.sg ? balken(x.sgErf, x.sg) : h("span", { cls: "small muted", text: "keine" })));
            })))),
        h("section", { cls: "karte" }, h("h2", { text: "Handlungsbedarf nach Leitfaden" }),
          h("p", { cls: "small muted", text: handlungOrg.length + " von " + orgs.length + " Rechtssammlungen erfüllen mindestens einen Prüfpunkt nicht." }),
          handlungOrg.length ? h("ul", { cls: "infoliste" }, handlungOrg.slice(0, 6).map(function (x) {
            return h("li", null, h("a", { href: link("org", x[0].id) }, h("strong", { text: x[0].kurz })), " ", badge("fehler", "✗", x[1].length + " nicht erfüllt"),
              h("ul", { cls: "small punkte" }, x[1].map(function (p) { return h("li", { title: p.text, text: p.titel + " (Ziff. " + p.ziffer + ")" }); })));
          })) : h("p", { cls: "muted", text: "Keine Prüfpunkte offen. ✓" }),
          handlungOrg.length > 6 ? h("p", { cls: "small" }, h("a", { href: link("grundlagen"), text: "Alle " + handlung.length + " Befunde in den Grundlagen ansehen →" })) : null)),
      h("div", { cls: "spalten" },
        h("section", { cls: "karte" }, h("h2", { text: "Erfasste Rechtssammlungen" }),
          h("table", { cls: "kompakt" },
            h("thead", null, h("tr", null, ["Organisation", "Bezirk", "Dok.", "Leitfaden"].map(function (t) { return h("th", { scope: "col", text: t }); }))),
            h("tbody", null, orgsSortiert.map(function (o) {
              return h("tr", null, h("th", { scope: "row" }, h("a", { href: link("org", o.id), text: o.kurz }), h("div", { cls: "small muted", text: o.typ })),
                h("td", { text: o.bezirk }), h("td", { cls: "zahlrechts", text: String(o.anzahl_dokumente) }), h("td", { cls: "nowrap" }, lfZusammenfassung(o)));
            })))),
        h("section", { cls: "karte" }, h("h2", { text: "Dokumentarten (alle erfassten Dokumente)" }),
          h("table", { cls: "kompakt" }, h("tbody", null, Object.keys(arten).sort(function (a, b) { return arten[b] - arten[a]; }).map(function (a) {
            return h("tr", null, h("th", { scope: "row", text: D.arten[a] }), h("td", null, balken(arten[a], dokumente, arten[a] + " · " + Math.round(arten[a] / dokumente * 100) + " %")));
          }))),
          h("p", { cls: "small muted", text: "Einordnung nach Leitfaden Ziff. 5–8 anhand von Titel und Ablageort – ein Anhaltspunkt, keine rechtliche Prüfung." }),
          h("h2", { text: "Vorbildliche Beispiele" }),
          h("p", { cls: "small" }, vorbildlich.length ? vorbildlich.map(function (o, i) { return [i ? ", " : "", h("a", { href: link("org", o.id), text: o.kurz })]; }) : "noch keine",
            " – gegliedert nach Leitfaden, Erlassnummer mit Sachgebietsziffer, kein Prüfpunkt «nicht erfüllt». Musterbeispiele des Kantons: Meilen und Dürnten."),
          h("h2", { text: "Plattformen der Websites" }),
          h("ul", null, Object.keys(cms).sort(function (a, b) { return cms[b] - cms[a]; }).map(function (k) { return h("li", null, h("strong", { text: String(cms[k]) }), " " + k); })),
          h("p", { cls: "small muted", text: "Einbetten erlaubt nur " + orgs.filter(function (o) { return o.einbettbar; }).length + " von " + orgs.length + " Websites; die übrigen verbieten die Anzeige im iFrame. Deshalb öffnen sich Original und Nachbau meist nebeneinander, und die PDF-Vorschau funktioniert erst mit der eigenen Dokumentenablage." }))),
      h("section", { cls: "karte" }, h("h2", { text: "So funktioniert EduKSX-Codex" }),
        h("ol", null,
          h("li", null, h("strong", { text: "Erfassen: " }), "Rechtssammlung einer Gemeinde oder Schulgemeinde mit allen Rubriken und Dokumenten übernehmen (Menü links: Bezirk › Gemeinde)."),
          h("li", null, h("strong", { text: "Vergleichen: " }), "Struktur-Matrix ordnet ähnliche Dokumente einander zu (✓ vorhanden, ? unsicher, – fehlt); der ", h("a", { href: link("vergleich"), text: "Vergleich" }), " zeigt Aufbau und Nummerierung."),
          h("li", null, h("strong", { text: "Prüfen: " }), "Leitfaden-Prüfung je Organisation zeigt, was nach kantonalem Leitfaden fehlt oder nicht in die Rechtssammlung gehört."),
          h("li", null, h("strong", { text: "Veröffentlichen: " }), "Nachbau im Stil der Gemeinde-Website und einbettbares Widget (iFrame) mit Navigation, Suche und PDF-Vorschau.")))
    ];
  }

  // ------------------------------------------------------------------ Gesetzestexte & Verordnungen
  var EBENE_BADGE = { Bund: ["info", "CH"], Kanton: ["violett", "ZH"], Bildungsrat: ["neutral", "BR"], Gemeinde: ["warnung", "G"] };
  function ebeneBadge(e) { var b = EBENE_BADGE[e] || ["neutral", ""]; return badge(b[0], b[1], e); }
  function rechtsgrundlagenAnsicht() {
    var R = D.rechtsgrundlagen, E = R.eintraege;
    var such = h("input", { type: "search", placeholder: "Erlass, Paragraf oder Thema suchen", "aria-label": "Rechtsgrundlagen durchsuchen" });
    var selSb = h("select", { "aria-label": "Sachbereich" }, h("option", { value: "", text: "Alle Sachbereiche" }),
      R.sachbereiche.map(function (s) { return h("option", { value: String(s.nr), text: s.nr + " " + s.titel }); }));
    var selEb = h("select", { "aria-label": "Ebene" }, h("option", { value: "", text: "Alle Ebenen" }),
      ["Bund", "Kanton", "Bildungsrat", "Gemeinde"].map(function (e) { return h("option", { value: e, text: e }); }));
    var zaehler = h("p", { cls: "small muted" });
    var huelle = h("div");
    function zeile(e) {
      return h("tr", null,
        h("td", { cls: "zahlrechts", text: String(e.nr) }),
        h("td", null, h("strong", { text: e.titel }), e.abk && e.titel.indexOf("(" + e.abk + ")") < 0 && e.titel !== e.abk ? h("span", { cls: "muted", text: " (" + e.abk + ")" }) : null),
        h("td", { cls: "nowrap" }, e.fundstelle || h("span", { cls: "muted", text: "–" }), e.geprueft ? h("span", { cls: "ok-mark", title: "Ordnungsnummer am 20.11.2026 in ZH-Lex geprüft", text: " ✓" }) : null),
        h("td", { text: e.stelle }),
        h("td", { text: e.relevanz }),
        h("td", null, ebeneBadge(e.ebene)),
        h("td", null, e.direkt.map(function (d, i) { return [i ? h("br") : null, extern(d.url, d.text + " ↗")]; }),
          e.quelle_url ? [e.direkt.length ? h("br") : null, h("span", { cls: "small muted" }, "Quelle: ", extern(e.quelle_url, e.quelle), e.quelle_generisch ? h("span", { title: "Link führt auf eine allgemeine Seite, nicht direkt auf den Erlass", text: " (allgemein)" }) : null)] : null));
    }
    function zeigen() {
      var f = such.value.trim().toLowerCase(), sb = selSb.value, eb = selEb.value;
      var treffer = E.filter(function (e) {
        return (!sb || String(e.sachbereich) === sb) && (!eb || e.ebene === eb) &&
          (!f || [e.titel, e.abk, e.fundstelle, e.stelle, e.relevanz].join(" ").toLowerCase().indexOf(f) >= 0);
      });
      zaehler.textContent = treffer.length + " von " + E.length + " Einträgen";
      huelle.textContent = "";
      R.sachbereiche.forEach(function (s) {
        var t = treffer.filter(function (e) { return e.sachbereich === s.nr; });
        if (!t.length) return;
        huelle.appendChild(h("h2", { text: s.nr + ". " + s.titel + " (" + t.length + ")" }));
        huelle.appendChild(h("div", { cls: "tabelle-wrap" }, h("table", { cls: "rg" },
          h("thead", null, h("tr", null, ["Nr.", "Erlass / Rechtsgrundlage", "Fundstelle", "Artikel / Paragraf", "Relevanz im Schulumfeld", "Ebene", "Erlasstext"].map(function (x) { return h("th", { scope: "col", text: x }); }))),
          h("tbody", null, t.map(zeile)))));
      });
      if (!treffer.length) huelle.appendChild(h("p", { cls: "muted", text: "Keine Einträge gefunden." }));
    }
    [such, selSb, selEb].forEach(function (el) { el.addEventListener("input", zeigen); });
    zeigen();
    var n = function (eb) { return E.filter(function (e) { return e.ebene === eb; }).length; };
    return [kopf("Gesetzestexte & Verordnungen", "Rechtsgrundlagen für öffentliche Schulen im Kanton Zürich – Schwerpunkt Volksschule, insbesondere Sekundarstufe. Stand der Recherche " + R.stand + ".",
        [h("a", { cls: "btn", href: link("herkunft"), text: "Herkunftsliste" }), h("a", { cls: "btn", href: "https://github.com/MarkusKeller8200/EduKSX-Prototyp/blob/main/prototypen/rechtssammlung/quellen/rechtsgrundlagen_schulen_zh.md", target: "_blank", rel: "noopener", text: "Ausgangsliste ↗" })]),
      h("div", { cls: "karten" },
        h("div", { cls: "karte" }, h("div", { cls: "titel", text: "Einträge" }), h("div", { cls: "zahl", text: String(E.length) }), h("div", { cls: "small muted", text: "in " + R.sachbereiche.length + " Sachbereichen" })),
        h("div", { cls: "karte" }, h("div", { cls: "titel", text: "Verschiedene Erlasse" }), h("div", { cls: "zahl", text: String(R.erlasse.length) }), h("div", { cls: "small muted", text: "mit LS- oder SR-Nummer" })),
        h("div", { cls: "karte" }, h("div", { cls: "titel", text: "Nach Ebene" }), h("div", { cls: "small" }, ebeneBadge("Bund"), " " + n("Bund") + "  ", ebeneBadge("Kanton"), " " + n("Kanton")),
          h("div", { cls: "small", style: "margin-top:.35rem" }, ebeneBadge("Bildungsrat"), " " + n("Bildungsrat") + "  ", ebeneBadge("Gemeinde"), " " + n("Gemeinde"))),
        h("div", { cls: "karte" }, h("div", { cls: "titel", text: "Fundstelle geprüft" }), h("div", { cls: "zahl", text: String(E.filter(function (e) { return e.geprueft; }).length) }), h("div", { cls: "small muted", text: "übrige noch zu prüfen" }))),
      h("p", { cls: "meldung warnung" }, h("strong", { text: "Ausgangsliste, noch nicht juristisch validiert. " }),
        "Vor der Übernahme die konsolidierte Fassung, die genauen Paragrafen und die Anwendbarkeit auf die jeweilige Schulgemeinde prüfen. «Erlasstext» führt über den dauerhaften ZH-Lex-Link (Ordnungsnummer) bzw. Fedlex auf die aktuelle Fassung; «(allgemein)» heisst: die Quelle in der Ausgangsliste zeigt nur auf eine allgemeine Seite."),
      h("div", { cls: "filterzeile" }, such, selSb, selEb, zaehler),
      huelle,
      h("section", { cls: "karte", style: "margin-top:1rem" }, h("h2", { text: "Geplantes Datenmodell (Rechtskataster)" }),
        h("p", { cls: "small", text: "Zwei Ebenen: Erlass (Erlass-ID z. B. ZH-412.100, Titel, Abkürzung, Ebene, Erlasstyp, Fundstelle, Direktlink, Rechtsstatus, gültig ab/bis, letzte Rechtsprüfung) und darunter einzelne Artikel/Paragrafen (Sachgebiet, Kurzbeschreibung, zuständige Stelle, verknüpfte Verordnung). Ergänzt um die kommunalen Erlasse der Schulgemeinden (Gemeindeordnung, Organisationsstatut, Geschäftsordnung, Personalreglement, Finanzkompetenzen) aus den erfassten Rechtssammlungen." }))];
  }
  function herkunftsliste() {
    var R = D.rechtsgrundlagen, E = R.eintraege;
    var nach = {};
    E.forEach(function (e) { nach[e.herkunft] = (nach[e.herkunft] || 0) + 1; });
    var beschreibung = {
      "Fedlex": "Systematische Rechtssammlung (SR) des Bundes – geltendes Bundesrecht und Staatsverträge, dauerhafte ELI-Links.",
      "ZH-Lex": "Zürcher Gesetzessammlung: Loseblattsammlung (LS) = geltendes kantonales Recht nach Sachgebieten; Offizielle Sammlung (OS) = Erlasse und Änderungen chronologisch.",
      "Gemeindeamt": "Gemeindeorganisation, Musterordnungen, Leitfaden systematische Rechtssammlung, Verzeichnis der Gemeinden.",
      "Volksschulamt": "Erläuterungen und Vollzugshilfen für die Volksschule (Organisation, Personal, Unterricht) – keine amtliche Publikation der Erlasse selbst.",
      "Bildungsrat": "Bildungsratsbeschlüsse (BRB) zu Lehrplan, Lektionentafel, Lehrmitteln und Beurteilung.",
      "Kommunal": "Systematische Rechtssammlung der Schulgemeinde bzw. der Gemeinde mit Schulaufgaben: Gemeindeordnung, Organisationsstatut, Geschäftsordnung, Personal- und Entschädigungsverordnung, Reglemente. Platzhalter «Schule XYZ» – wird durch die gewählte Schulgemeinde ersetzt."
    };
    var weitere = [
      ["Leitfaden systematische Rechtssammlung", "Gemeindeamt / VZGV, Juni 2018, Ergänzung Februar 2019 – abgelegt in quellen/", link("grundlagen")],
      ["Verzeichnis der Gemeinden des Kantons Zürich", "Gemeindeamt, Stand 1. Juli 2026 – Schulgemeinden und Gemeinden mit Schulaufgaben", null],
      ["Liste politische Gemeinden", "Gemeindeamt – Verwaltungs-E-Mail, daraus die Websites der 160 Gemeinden", null],
      ["Websites der Gemeinden und Schulgemeinden", D.organisationen.length + " Rechtssammlungen, Stand " + D.stand + " – alle Dokumentlinks führen auf die Originale", link("vergleich")],
      ["Rechtsgrundlagen für öffentliche Schulen im Kanton Zürich", "Ausgangsliste mit " + E.length + " Einträgen, Stand der Recherche " + R.stand + " – abgelegt in quellen/", link("rechtsgrundlagen")]
    ];
    return [kopf("Herkunftsliste", "Woher die Rechtsgrundlagen und Daten in EduKSX-Codex stammen. Massgebend ist immer die amtliche Publikation."),
      h("h2", { text: "Offizielle Publikationsquellen" }),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, ["Ebene", "Massgebende Quelle", "Was dort publiziert wird", "Einträge in der Liste"].map(function (x) { return h("th", { scope: "col", text: x }); }))),
        h("tbody", null, R.publikationsquellen.map(function (q) {
          var key = q.ebene === "Kommunal" ? "Kommunal" : /Fedlex/.test(q.name) ? "Fedlex" : /ZH-Lex/.test(q.name) ? "ZH-Lex" : /Gemeindeamt/.test(q.name) ? "Gemeindeamt" : /Volksschule/.test(q.name) ? "Volksschulamt" : "Bildungsrat";
          return h("tr", null, h("th", { scope: "row", text: q.ebene }), h("td", null, q.url ? extern(q.url, q.name + " ↗") : [h("span", { text: q.name }), h("div", { cls: "small" }, badge("warnung", "…", "Platzhalter"), " ", h("a", { href: link("schulgemeinden"), text: "erfasste Schulgemeinden →" }))]),
            h("td", { text: beschreibung[key] || "" }),
            h("td", { cls: "zahlrechts", text: String(nach[key] || 0) }));
        })))),
      h("p", { cls: "small muted", text: (nach["Personalamt Kanton Zürich"] || 0) + " Einträge verweisen auf das Handbuch Personalrecht des Kantons, " + (nach["Kanton Zürich"] || 0) + " auf weitere Seiten des Kantons (Leitfaden Informationsverwaltung, MAB-Grundlagen). Für die Rechtsgrundlagen-Liste werden diese Hinweise durch den direkten ZH-Lex- bzw. Fedlex-Link ergänzt." }),
      h("h2", { text: "Direktlinks" }),
      h("ul", null,
        h("li", null, h("strong", { text: "ZH-Lex: " }), "dauerhafter Link auf die aktuelle Fassung über die Ordnungsnummer – ", h("code", { text: "http://www.zhlex.zh.ch/Erlass.html?Open&Ordnr=412.100" })),
        h("li", null, h("strong", { text: "Fedlex: " }), "ELI-Link auf die systematische Fassung – z. B. ", h("code", { text: "https://www.fedlex.admin.ch/eli/cc/1999/404/de" }))),
      h("h2", { text: "Weitere Quellen dieses Prototyps" }),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, ["Quelle", "Inhalt und Stand", ""].map(function (x) { return h("th", { scope: "col", text: x }); }))),
        h("tbody", null, weitere.map(function (w) {
          return h("tr", null, h("th", { scope: "row", text: w[0] }), h("td", { text: w[1] }), h("td", null, w[2] ? h("a", { href: w[2], text: "ansehen →" }) : null));
        }))))];
  }

  function alleGemeinden() {
    var such = h("input", { type: "text", placeholder: "Gemeinde oder Bezirk" });
    var body = h("tbody", null, D.gemeinden.map(function (g) {
      var o = orgZuGemeinde(g);
      return h("tr", null, h("td", null, h("a", { href: link("bezirk", g.bezirk), text: g.bezirk })),
        h("td", null, h("a", { href: o ? link("org", o.id) : link("gemeinde", g.bezirk, g.gemeinde), text: g.gemeinde })),
        h("td", { text: g.einheit || "" }), h("td", { text: g.cms || "" }), h("td", null, status(!!o)));
    }));
    such.addEventListener("input", function () {
      var f = such.value.toLowerCase();
      Array.prototype.forEach.call(body.rows, function (tr) { tr.style.display = tr.textContent.toLowerCase().indexOf(f) >= 0 ? "" : "none"; });
    });
    return [kopf("Alle 160 politischen Gemeinden", "Stand gemäss Gemeindeverzeichnis Kanton Zürich."),
      h("div", { cls: "formzeile" }, h("label", { cls: "feld" }, "Filtern ", such)),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, ["Bezirk", "Gemeinde", "Schulträger", "CMS", "Status"].map(function (t) { return h("th", { text: t }); }))), body))];
  }

  function bezirk(b) {
    if (D.bezirke.indexOf(b) < 0) return nichtGefunden();
    var gem = gemeindenIn(b), sch = schulenIn(b);
    return [kopf("Bezirk " + b, gem.length + " politische Gemeinden · " + sgIn(b).length + " Schulgemeinden"),
      h("h2", { text: "Politische Gemeinden" }),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, ["Gemeinde", "CMS", "Rechtssammlung", "Status"].map(function (t) { return h("th", { text: t }); }))),
        h("tbody", null, gem.map(function (g) {
          var o = orgZuGemeinde(g);
          return h("tr", null, h("td", null, h("a", { href: o ? link("org", o.id) : link("gemeinde", b, g.gemeinde), text: g.gemeinde }), h("span", { cls: "muted small", text: vermerk(g) })),
            h("td", { text: g.cms || "" }), h("td", null, g.rechtssammlung_url ? extern(g.rechtssammlung_url, "Original ↗") : ""), h("td", null, status(!!o)));
        })))),
      h("h2", { text: "Schulgemeinden" }),
      sgIn(b).length ? sgTabelle(sgIn(b)) : h("p", { cls: "meldung info", text: "Im Bezirk gibt es keine Schulgemeinden – alle politischen Gemeinden sind Einheitsgemeinden." }),
      eschulen(b).length ? [h("h2", { text: "Schulen der Einheitsgemeinden (erfasst)" }), h("ul", null, eschulen(b).map(function (o) { return h("li", null, h("a", { href: link("org", o.id), text: o.name })); }))] : null];
  }

  function gemeinde(b, name) {
    var g = D.gemeinden.filter(function (x) { return x.bezirk === b && x.gemeinde === name; })[0];
    if (!g) return nichtGefunden();
    var schulen = D.organisationen.filter(function (o) { return (o.gemeinden || []).indexOf(name) >= 0 && o.typ !== "Politische Gemeinde"; });
    return [kopf(name, "Politische Gemeinde · Bezirk " + b, h("a", { cls: "btn", href: link("bezirk", b), text: "← Bezirk " + b })),
      h("p", { cls: "meldung info" }, "Die Rechtssammlung von ", name, " ist noch nicht erfasst. Nächster Schritt: Website und CMS ermitteln, dann Menüpfad, Rubriken und Dateien aufnehmen."),
      fakten([["Status", status(false)], ["Website", g.website ? extern(g.website, g.website) : "noch nicht ermittelt"],
        ["Schulträger Primarstufe", g.schultraeger ? g.schultraeger.primar : ""], ["Schulträger Sekundarstufe", g.schultraeger ? g.schultraeger.sek : ""],
        ["Vermerk", (g.einheit || "") + (g.einheit_sicher ? "" : " – hergeleitet, Mitglieder der Schulgemeinden noch zu prüfen")]]),
      schulen.length ? [h("h2", { text: "Erfasste Schulgemeinden mit " + name }),
        h("ul", null, schulen.map(function (o) { return h("li", null, h("a", { href: link("org", o.id), text: o.name })); }))] : null];
  }

  function baum(o, n, pfad, tiefe) {
    return h("li", null,
      h("a", { href: link("org", o.id, pfad.join("-")), text: n.titel }), " ",
      h("span", { cls: "muted small", text: "(" + zaehle(n) + ")" }),
      tiefe < 3 && n.kinder.length ? h("ul", null, n.kinder.map(function (k, i) { return baum(o, k, pfad.concat(i), tiefe + 1); })) : null);
  }

  function reiter(o, aktiv) {
    var r = [["", "Steckbrief und Struktur"], ["ansicht-nachbau", "Demoseite (Nachbau)"], ["ansicht-iframe", "iFrame-Variante"], ["ansicht-vergleich", "Original ⟷ Nachbau"], ["ansicht-matrix", "Matrix-Spalte"]];
    return h("div", { cls: "reiter", role: "tablist", "aria-label": "Ansicht wählen" }, r.map(function (x) {
      return h("a", { href: link("org", o.id, x[0]), role: "tab", "aria-selected": aktiv === x[0] ? "true" : "false", cls: "reiterlink", text: x[1] });
    }));
  }
  function kopfOrg(o, aktiv) {
    return [kopf(o.name + (o.einheit ? " (" + egKurz(o.einheit) + ")" : ""), o.typ + (o.einheit ? " · " + egTitel(o.einheit) : "") + " · Bezirk " + o.bezirk + (o.sitz ? " · Sitz " + o.sitz : ""),
        [h("a", { cls: "btn", href: "demo/" + o.id + ".html", target: "_blank", rel: "noopener", text: "Demoseite ↗" }), " ", extern(o.rs_url, "Original ↗")]), reiter(o, aktiv)];
  }
  function organisation(o) {
    return [kopfOrg(o, ""),
      h("div", { cls: "spalten" },
        h("div", { cls: "karte" }, h("h2", { text: "Steckbrief" }),
          fakten([["Website", extern(o.website, o.website)], ["Menüpfad", o.menu_pfad.join(" › ")],
            ["Weitere Einstiege", o.weitere_einstiege.join("; ")], ["CMS", o.cms], ["Aufbau", o.struktur],
            ["Nummerierung", o.nummerierung], ["Umfang", o.anzahl_rubriken + " Rubriken · " + o.anzahl_dokumente + " Dokumente · Ordnertiefe " + o.max_tiefe],
            ["Stand", o.stand]])),
        h("div", { cls: "karte" }, h("h2", { text: "Befunde" }), h("ul", null, o.befunde.map(function (b) { return h("li", { text: b }); })))),
      leitfadenKarte(o),
      h("h2", { text: "Struktur der Rechtssammlung" }),
      h("div", { cls: "karte" }, h("ul", { cls: "struktur" }, o.sections.map(function (s, i) { return baum(o, s, [i], 1); })))];
  }

  // ------------------------------------------------------------------ Leitfaden
  var LF_SYM = { ja: ["erfolg", "✓", "erfüllt"], unsicher: ["warnung", "?", "prüfen"], nein: ["fehler", "✗", "nicht erfüllt"], info: ["info", "ℹ", "Hinweis"] };
  function lfBadge(st) { var x = LF_SYM[st]; return badge(x[0], x[1], x[2]); }
  function lfZusammenfassung(o) {
    var z = { ja: 0, unsicher: 0, nein: 0 };
    (o.leitfaden || []).forEach(function (p) { if (z[p.status] !== undefined) z[p.status]++; });
    return h("span", null, badge("erfolg", "✓", String(z.ja)), " ", badge("warnung", "?", String(z.unsicher)), " ", badge("fehler", "✗", String(z.nein)));
  }
  function leitfadenKarte(o) {
    var arten = Object.keys(o.arten || {}).sort(function (a, b) { return o.arten[b] - o.arten[a]; });
    return [h("h2", { text: "Leitfaden-Prüfung" }),
      h("div", { cls: "karte" },
        h("p", { cls: "small muted" }, "Automatische Prüfung gegen den ", h("a", { href: link("grundlagen"), text: "Leitfaden systematische Rechtssammlung" }),
          " – nur anhand von Titeln und Ablageorten. Ein Anhaltspunkt, keine rechtliche Beurteilung."),
        h("div", { cls: "tabelle-wrap" }, h("table", null,
          h("thead", null, h("tr", null, ["Ziff.", "Prüfpunkt", "Ergebnis", "Befund"].map(function (t) { return h("th", { scope: "col", text: t }); }))),
          h("tbody", null, (o.leitfaden || []).map(function (p) {
            return h("tr", null, h("td", { text: p.ziffer }), h("td", { text: p.titel }), h("td", null, lfBadge(p.status)), h("td", { text: p.text }));
          })))),
        h("h3", { text: "Dokumentarten (Einordnung nach Leitfaden Ziff. 5–8)" }),
        h("ul", null, arten.map(function (a) { return h("li", null, h("strong", { text: String(o.arten[a]) }), " " + D.arten[a]); })))];
  }
  function grundlagen() {
    var L = D.leitfaden;
    var pdf = { titel: L.titel, url: L.ablage_pdf };
    function tab(kopfzeile, zeilen) {
      return h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, kopfzeile.map(function (t) { return h("th", { scope: "col", text: t }); }))),
        h("tbody", null, zeilen.map(function (z) { return h("tr", null, z.map(function (c, i) { return h(i ? "td" : "th", i ? { text: c } : { scope: "row", text: c }); })); }))));
    }
    // Zuordnung kommunale Sachgebiete → LS-Ordner (Orientierung nach Leitfaden Ziff. 9)
    var ls = { "1": "1–2 (101–184)", "2": "3–4 (211–351)", "3": "4 (281–351)", "4": "5–8 (410–440)", "5": "9 (511–554), 14 (861 Feuerpolizei)",
      "6": "10 (611–691)", "7": "11–12 (700–782)", "8": "13 (810–857)", "9": "14 (861–954)" };
    return [kopf("Grundlagen", L.titel + " · " + L.herausgeber,
        [h("button", { type: "button", cls: "btn", onclick: function () { pdfVorschau({ pdf_vorschau: true }, pdf); }, text: "Leitfaden ansehen" }), " ",
         h("a", { cls: "btn", href: L.ablage_docx, download: "", text: "Original (Word) herunterladen" })]),
      h("p", { cls: "meldung info" }, "Der Leitfaden ist in diesem Prototyp abgelegt (unverändertes Original von zh.ch, dazu ein PDF für die Vorschau). Quelle: ",
        extern(L.quelle, "zh.ch › Gemeindeorganisation › Systematische Rechtssammlung"), "."),
      h("h2", { text: "Rechtsgrundlagen" }),
      h("ul", null, L.rechtsgrundlagen.map(function (r) { return h("li", null, extern(r.url, r.titel + " (" + r.kurz + ", LS " + r.ls + ")"), " – " + r.stelle); }),
        h("li", null, extern("https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung.html#zhlex_ls", "Zürcher Gesetzessammlung (ZH-Lex, Loseblattsammlung LS)")),
        h("li", null, extern(L.quelle, "Mustergemeindeordnungen für politische Gemeinden und Schulgemeinden"), " (Gemeindeamt)")),
      h("h2", { text: "Anforderungen an die Rechtssammlung" }),
      tab(["Ziff.", "Anforderung"], L.anforderungen),
      h("h2", { text: "Systematik politische Gemeinden (Anhang 1)" }),
      tab(["Nr.", "Sachgebiet", "Beispiele", "LS-Ordner Kanton"], L.anhang1.map(function (a) { return [a[0], a[1], a[2], ls[a[0]]]; })),
      h("h2", { text: "Systematik Schulgemeinden (Anhang 2)" }),
      tab(["Nr.", "Sachgebiet", "Beispiele"], L.anhang2),
      h("p", { cls: "small muted", text: "Für politische Gemeinden mit Schulaufgaben (Einheitsgemeinden) gehören die Schul-Erlasse ins Sachgebiet 4. Musterbeispiele gemäss Leitfaden: Gemeinden Meilen und Dürnten." }),
      h("h2", { text: "Kantonale Systematik: 14 Ordner der Loseblattsammlung (LS)" }),
      tab(["Ordner", "LS-Nummern", "Sachgebiete"], L.ls_ordner),
      h("h2", { text: "Leitfaden-Prüfung im Vergleich" }),
      h("div", { cls: "tabelle-wrap" }, h("table", null,
        h("thead", null, h("tr", null, h("th", { scope: "col", text: "Prüfpunkt" }), D.organisationen.map(function (o) { return h("th", { scope: "col" }, h("a", { href: link("org", o.id), text: o.kurz })); }))),
        h("tbody", null, pruefpunkte().map(function (t) {
          return h("tr", null, h("th", { scope: "row", text: t }), D.organisationen.map(function (o) {
            var p = (o.leitfaden || []).filter(function (x) { return x.titel === t; })[0];
            return h("td", { title: p ? p.text : "" }, p ? lfBadge(p.status) : h("span", { cls: "muted", text: "–" }));
          }));
        }))))];
  }
  function pruefpunkte() {
    var t = [];
    D.organisationen.forEach(function (o) { (o.leitfaden || []).forEach(function (p) { if (t.indexOf(p.titel) < 0) t.push(p.titel); }); });
    return t;
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
          return h("tr", null, h("td", null, d.url ? [extern(d.url, d.titel), " ", h("button", { type: "button", cls: "btn klein", onclick: function () { pdfVorschau(o, d); }, text: "Vorschau" })] : h("span", null, d.titel, " ", badge("warnung", "!", "kein Link"))),
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


  // ------------------------------------------------------------------ Schulgemeinden
  function sgTabelle(liste) {
    return h("div", { cls: "tabelle-wrap" }, h("table", null,
      h("thead", null, h("tr", null, ["Schulgemeinde", "Bezirk", "Sitz", "Mitglieder (bekannt)", "Status"].map(function (t) { return h("th", { text: t }); }))),
      h("tbody", null, liste.map(function (s) {
        var o = s.org ? ORG[s.org] : null;
        return h("tr", null, h("td", null, h("a", { href: o ? link("org", o.id) : link("sg", s.name), text: s.name })),
          h("td", { text: s.bezirk }), h("td", { text: s.sitz }),
          h("td", { text: s.mitglieder.join(", ") + (s.mitglieder_sicher ? "" : " (nur Sitz bekannt)") + (s.mitglieder_unsicher.length ? "; vermutet: " + s.mitglieder_unsicher.join(", ") : "") }),
          h("td", null, status(!!o)));
      }))));
  }
  function alleSchulgemeinden() {
    var typen = ["Volksschulgemeinde", "Primarschulgemeinde", "Sekundarschulgemeinde"];
    return [kopf("Alle " + D.schulgemeinden.length + " Schulgemeinden", D.quelle_sg),
      h("p", { cls: "meldung info", text: "In Klammer beim Gemeindenamen im Menü: «EG» = Einheitsgemeinde (Schule ganz oder für eine Stufe bei der Gemeinde), «keine EG» = Schule bei Schulgemeinden. «?» = nicht gesichert, hergeleitet, weil die Mitglieder einer Schulgemeinde im Bezirk noch nicht bekannt sind. Die Langform steht im Tooltip und auf der Gemeindeseite." }),
      typen.map(function (t) {
        var l = D.schulgemeinden.filter(function (s) { return s.typ === t; });
        return [h("h2", { text: t + "n (" + l.length + ")" }), sgTabelle(l)];
      })];
  }
  function sgAnsicht(name) {
    var s = D.schulgemeinden.filter(function (x) { return x.name === name; })[0];
    if (!s) return nichtGefunden();
    if (s.org && ORG[s.org]) { location.replace(link("org", s.org)); return []; }
    return [kopf(s.name, s.typ + " · Bezirk " + s.bezirk + " · Sitz " + s.sitz, h("a", { cls: "btn", href: link("bezirk", s.bezirk), text: "← Bezirk " + s.bezirk })),
      h("p", { cls: "meldung info", text: "Die Rechtssammlung dieser Schulgemeinde ist noch nicht erfasst." }),
      fakten([["Mitglieder", s.mitglieder.join(", ") + (s.mitglieder_sicher ? "" : " (nur Sitz bekannt – weitere Gemeinden zu prüfen)")], ["Quelle", D.quelle_sg]])];
  }

  // ------------------------------------------------------------------ Ansichten einer Organisation
  function rahmenFrame(src, titel, extra) {
    return h("iframe", { src: src, title: titel, cls: "vollframe" + (extra ? " " + extra : ""), loading: "lazy" });
  }
  function ansicht(o, art) {
    if (art === "ansicht-nachbau") return [kopfOrg(o, art),
      h("p", { cls: "small muted", text: "Nachbau der Original-Seite (Schrift, Farben, Aufbau) mit den erfassten Daten. Logos bewusst nicht übernommen." }),
      rahmenFrame("demo/" + o.id + ".html", "Nachbau " + o.name)];
    if (art === "ansicht-iframe") return [kopfOrg(o, art),
      h("p", { cls: "small muted", text: "So kann die Gemeinde die Rechtssammlung einbauen: ihre Seite (hier nachgebaut) mit dem EduKSX-Codex-Widget im iFrame – navigierbar, mit Suche und PDF-Vorschau." }),
      h("details", { cls: "karte" }, h("summary", { text: "Einbettungscode für die Gemeinde-Website" }),
        h("pre", { cls: "code", text: '<iframe src="' + new URL("embed/index.html?org=" + o.id, location.href).href + '"\n        title="Rechtssammlung ' + o.name + '" style="width:100%;min-height:600px;border:0"></iframe>\n<script>window.addEventListener("message",function(e){if(e.data&&e.data.cxHoehe){\n  document.querySelector("iframe[title^=Rechtssammlung]").style.height=(e.data.cxHoehe+20)+"px";}});<\/script>' })),
      rahmenFrame("demo/" + o.id + "-iframe.html", "iFrame-Variante " + o.name)];
    if (art === "ansicht-vergleich") {
      var rechts = h("div", { cls: "split-teil" });
      function setzeRechts(v) {
        rechts.textContent = "";
        rechts.appendChild(h("div", { cls: "split-kopf" }, h("strong", { text: v === "iframe" ? "iFrame-Variante" : "Nachbau" }), " ",
          h("button", { type: "button", cls: "btn klein", onclick: function () { setzeRechts(v === "iframe" ? "nachbau" : "iframe"); }, text: v === "iframe" ? "→ Nachbau zeigen" : "→ iFrame-Variante zeigen" })));
        rechts.appendChild(rahmenFrame("demo/" + o.id + (v === "iframe" ? "-iframe" : "") + ".html", "Nachbau " + o.name, "split"));
      }
      setzeRechts("nachbau");
      var links = h("div", { cls: "split-teil" }, h("div", { cls: "split-kopf" }, h("strong", { text: "Original" }), " ", extern(o.rs_url, "in neuem Fenster ↗")),
        o.einbettbar ? rahmenFrame(o.rs_url, "Original " + o.name, "split")
          : h("div", { cls: "split-ersatz" },
              h("p", null, h("strong", { text: "Die Original-Website lässt sich nicht einbetten." }), " Sie verbietet die Anzeige in fremden Seiten (Sicherheitseinstellung X-Frame-Options bzw. frame-ancestors)."),
              h("p", { text: "Alternative: beide Seiten als Fenster nebeneinander öffnen." }),
              h("button", { type: "button", cls: "btn primaer", onclick: function () { nebeneinander(o); }, text: "Original und Nachbau nebeneinander öffnen" }),
              h("p", { cls: "small muted", text: "Der Browser kann Fenster blockieren – dann Pop-ups für diese Seite erlauben." })));
      return [kopfOrg(o, art), h("div", { cls: "split" }, links, rechts)];
    }
    if (art === "ansicht-matrix") return [kopfOrg(o, art), matrixAnsicht([o.id])];
    return nichtGefunden();
  }
  function nebeneinander(o) {
    var w = Math.floor(screen.availWidth / 2), hh = screen.availHeight;
    window.open(o.rs_url, "cx_original", "left=0,top=0,width=" + w + ",height=" + hh);
    window.open(new URL("demo/" + o.id + ".html", location.href).href, "cx_nachbau", "left=" + w + ",top=0,width=" + w + ",height=" + hh);
  }

  // ------------------------------------------------------------------ Struktur-Matrix
  function matrixAnsicht(nurIds) {
    var M = D.matrix, orgs = D.organisationen.filter(function (o) { return !nurIds || nurIds.indexOf(o.id) >= 0; });
    var filter = { leer: false, behoerde: true, text: "" };
    var huelle = h("div");
    function zelle(z, o) {
      var c = (M.zellen[z.key] || {})[o.id];
      var st = c ? c.status : "nein", sym = SYM[st];
      var td = h("td", { cls: "mz mz-" + st, title: sym[2] + (c && c.hinweise.length ? " – " + c.hinweise.join("; ") : "") },
        h("span", { cls: "badge " + sym[1] }, h("span", { "aria-hidden": "true", text: sym[0] }), h("span", { cls: "sr-only", text: sym[2] })));
      if (c) {
        var ul = h("ul", { cls: "mz-docs" });
        c.docs.slice(0, z.sammel ? 3 : 4).forEach(function (d) {
          ul.appendChild(h("li", null, d.url ? h("a", { href: d.ablage || d.url, target: "_blank", rel: "noopener", title: d.titel, text: kurz(d.titel) }) : h("span", { text: kurz(d.titel) })));
        });
        if (c.docs.length > (z.sammel ? 3 : 4)) ul.appendChild(h("li", { cls: "muted", text: "+ " + (c.docs.length - (z.sammel ? 3 : 4)) + " weitere" }));
        td.appendChild(ul);
      }
      return td;
    }
    function kurz(t) { return t.length > 46 ? t.slice(0, 44) + "…" : t; }
    function bauen() {
      huelle.textContent = "";
      var zeilen = M.zeilen.filter(function (z) {
        if (!filter.behoerde && /^Gehört nicht in die SR/.test(z.menu)) return false;
        var hat = orgs.some(function (o) { return (M.zellen[z.key] || {})[o.id]; });
        if (filter.leer && !hat) return false;
        if (nurIds && !hat && !/^1 /.test(z.menu)) return false;
        var f = filter.text.toLowerCase();
        return !f || (z.menu + " " + z.unter + " " + z.dok).toLowerCase().indexOf(f) >= 0;
      });
      var body = h("tbody"), letzt = "";
      zeilen.forEach(function (z) {
        if (z.menu !== letzt) { letzt = z.menu; body.appendChild(h("tr", { cls: "mz-menu" }, h("th", { colspan: String(3 + orgs.length), scope: "colgroup", text: z.menu }))); }
        body.appendChild(h("tr", null, h("td", { cls: "muted small", text: z.menu.replace(/^(\d) .*/, "$1") }), h("td", { text: z.unter }),
          h("th", { scope: "row", text: z.dok + (z.sammel ? " (Sammelzeile)" : "") }), orgs.map(function (o) { return zelle(z, o); })));
      });
      huelle.appendChild(h("div", { cls: "tabelle-wrap matrix-wrap" }, h("table", { cls: "matrix" },
        h("thead", null, h("tr", null, h("th", { text: "Menü" }), h("th", { text: "Untermenü" }), h("th", { text: "Dokument" }),
          orgs.map(function (o) { return h("th", { scope: "col", cls: "mz-org" }, h("a", { href: link("org", o.id), text: o.kurz })); }))),
        body)));
      var rest = orgs.map(function (o) { return [o, M.nicht_zugeordnet[o.id] || []]; }).filter(function (x) { return x[1].length; });
      if (rest.length) huelle.appendChild(h("details", { cls: "karte" }, h("summary", { text: "Nicht zugeordnete Dokumente (" + rest.reduce(function (s, x) { return s + x[1].length; }, 0) + ")" }),
        rest.map(function (x) { return [h("h3", { text: x[0].name }), h("ul", null, x[1].map(function (d) { return h("li", null, d.url ? extern(d.url, d.titel) : d.titel, h("span", { cls: "muted small", text: " – " + d.pfad })); }))]; })));
    }
    var such = h("input", { type: "text", placeholder: "Zeile filtern (z. B. Gebühren)" });
    such.addEventListener("input", function () { filter.text = such.value; bauen(); });
    var cbLeer = h("input", { type: "checkbox" }); cbLeer.addEventListener("change", function () { filter.leer = cbLeer.checked; bauen(); });
    var cbBeh = h("input", { type: "checkbox", checked: "checked" }); cbBeh.addEventListener("change", function () { filter.behoerde = cbBeh.checked; bauen(); });
    bauen();
    return [h("div", { cls: "formzeile" }, h("label", { cls: "feld" }, "Filtern ", such),
        h("label", null, cbLeer, " nur Zeilen mit Treffern"), h("label", null, cbBeh, " «Gehört nicht in die SR» zeigen")),
      h("p", { cls: "small legende" }, badge("erfolg", "✓", "vorhanden"), " ", badge("warnung", "?", "unsicher (ähnlicher Titel, kombinierter Erlass, falscher Link …)"), " ",
        badge("neutral", "–", "fehlt"), " · Hinter dem Symbol der Link zum Dokument (später zur EduKSX-Dokumentenablage)."),
      huelle];
  }
  function matrix() {
    return [kopf("Struktur-Matrix", "Je Zeile ein Dokument der Codex-Struktur (Menü › Untermenü › Dokument), je Spalte eine Organisation. Ähnliche Dokumente werden auch bei abweichender Schreibweise erkannt."),
      matrixAnsicht(null)];
  }


  function pdfVorschau(o, d) {
    var dlg = h("dialog", { cls: "vorschau-dialog", "aria-label": "Vorschau " + d.titel });
    var zu = h("button", { type: "button", cls: "btn", onclick: function () { dlg.close(); dlg.remove(); }, text: "Schliessen" });
    dlg.appendChild(h("div", { cls: "seitenkopf" }, h("strong", { text: d.titel }), h("div", { cls: "aktionen" }, extern(d.url, "Öffnen ↗"), " ", zu)));
    dlg.appendChild(o.pdf_vorschau ? h("iframe", { src: d.url, title: "Vorschau", cls: "vorschau-frame" })
      : h("p", { cls: "meldung info", text: "Die Website der Organisation verbietet die eingebettete Anzeige ihrer Dokumente. Die Vorschau funktioniert, sobald das Dokument in der EduKSX-Dokumentenablage liegt – bis dahin über «Öffnen ↗»." }));
    document.body.appendChild(dlg); dlg.showModal();
    dlg.addEventListener("close", function () { dlg.remove(); });
  }
  function nichtGefunden() { return [kopf("Nicht gefunden"), h("p", null, h("a", { href: "#/", text: "Zur Übersicht" }))]; }

  // ------------------------------------------------------------------ Aufbau
  function zeigen() {
    document.querySelectorAll("dialog").forEach(function (d) { if (d.open) d.close(); d.remove(); });
    var r = route(), inhalt;
    if (r.art === "") inhalt = uebersicht();
    else if (r.art === "vergleich") inhalt = vergleich();
    else if (r.art === "gemeinden") inhalt = alleGemeinden();
    else if (r.art === "bezirk") inhalt = bezirk(r.a);
    else if (r.art === "gemeinde") inhalt = gemeinde(r.a, r.b);
    else if (r.art === "schulgemeinden") inhalt = alleSchulgemeinden();
    else if (r.art === "sg") inhalt = sgAnsicht(r.a);
    else if (r.art === "matrix") inhalt = matrix();
    else if (r.art === "grundlagen") inhalt = grundlagen();
    else if (r.art === "rechtsgrundlagen") inhalt = rechtsgrundlagenAnsicht();
    else if (r.art === "herkunft") inhalt = herkunftsliste();
    else if (r.art === "org" && ORG[r.a]) inhalt = !r.b ? organisation(ORG[r.a]) : r.b.indexOf("ansicht-") === 0 ? ansicht(ORG[r.a], r.b) : rubrik(ORG[r.a], r.b);
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
