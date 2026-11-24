#!/usr/bin/env node
/*
 * Erzeugt PRUEFLISTE.md für die fachliche Kontrolle aus den Daten des Prototyps (daten.js, vorlagen.js,
 * erweiterung.js, einstellungen.js). Aufruf: node werkzeuge/pruefliste.js  (im Ordner prototypen/ablaufplanung)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ordner = path.join(__dirname, "..");
const ctx = { window: {}, console };
vm.createContext(ctx);
["daten.js", "vorlagen.js", "erweiterung.js", "einstellungen.js", "codex-auszug.js"].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ordner, "assets", f), "utf8"), ctx, { filename: f }));
const D = ctx.window.FLOW_DATEN, E = ctx.window.FLOW_EINSTELLUNGEN_DATEN;
const version = JSON.parse(fs.readFileSync(path.join(ordner, "prototyp.json"), "utf8")).version;

const t = (n) => (n === 0 ? "T" : n < 0 ? `T−${-n}` : `T+${n}`);
const zelle = (x) => String(x == null ? "" : x).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ");
const tabelle = (kopf, zeilen) => [`| ${kopf.join(" | ")} |`, `|${kopf.map(() => "---").join("|")}|`, ...zeilen.map((z) => `| ${z.map(zelle).join(" | ")} |`)].join("\n");

const out = [];
out.push(`# Prüfliste EduKSX-Flow – fachliche Kontrolle`, "",
  `Erzeugt aus den Daten des Prototyps ${version} mit \`node werkzeuge/pruefliste.js\` – nicht von Hand ändern, sondern die Daten anpassen und neu erzeugen.`,
  `Zweck: Was vor einer produktiven Nutzung fachlich (Schulverwaltung, Ressortvorstand, ggf. Rechtsdienst) zu prüfen ist. Keine Rechtsberatung.`, "",
  "Abhaken: ☐ offen · ☑ geprüft (mit Kürzel und Datum in der Spalte «geprüft»).", "");

// 1. Quellen ZU PRÜFEN
const zp = [];
D.VORLAGEN.forEach((v) => v.schritte.forEach((s) => { if (/ZU PRÜFEN/.test(s.quelle || "")) zp.push([v, s]); }));
out.push(`## 1. Quellen «ZU PRÜFEN» (${zp.length} Schritte)`, "",
  "Gemeindeeigene Regelungen (Gemeindeordnung, Geschäftsordnung, Personalverordnung) oder noch nicht verifizierte Paragrafen.", "",
  tabelle(["Vorlage", "Schritt", "Frist", "Quelle", "geprüft"], zp.map(([v, s]) => [v.titel, s.titel, t(s.tage), s.quelle, "☐"])), "");
const ohne = [];
D.VORLAGEN.forEach((v) => v.schritte.forEach((s) => { if (!String(s.quelle || "").trim()) ohne.push([v, s]); }));
out.push(`## 2. Schritte ohne Quelle (${ohne.length})`, "", ohne.length ? tabelle(["Vorlage", "Schritt", "geprüft"], ohne.map(([v, s]) => [v.titel, s.titel, "☐"])) : "Keine.", "");

// 3. Gesetzliche Fristen
const ges = [];
D.VORLAGEN.forEach((v) => v.schritte.forEach((s) => { if (s.fristart === "gesetzlich") ges.push([v, s]); }));
out.push(`## 3. Einstufung der Fristen (Konzept E12)`, "",
  `Als **gesetzlich** eingestuft (${ges.length}); gesetzliche Fristen werden früher eskaliert. Alle übrigen Fristen gelten als intern, einzelne als Empfehlung.`, "",
  tabelle(["Vorlage", "Schritt", "Frist", "Quelle", "Einstufung korrekt"], ges.map(([v, s]) => [v.titel, s.titel, t(s.tage), s.quelle, "☐"])), "");
const empf = [];
D.VORLAGEN.forEach((v) => v.schritte.forEach((s) => { if (s.fristart === "empfehlung") empf.push([v, s]); }));
if (empf.length) out.push("Als **Empfehlung** eingestuft:", "", tabelle(["Vorlage", "Schritt", "Frist", "geprüft"], empf.map(([v, s]) => [v.titel, s.titel, t(s.tage), "☐"])), "");

// 4. Funktionendiagramm
const ab = Object.fromEntries(E.aufgabenbereiche.filter((x) => x.kuerzel === x.haupt).map((x) => [x.kuerzel, x.name]));
out.push(`## 4. Funktionendiagramm (Muster) – Zuordnung und Kompetenzen`, "",
  "Zuordnung der Muster-Nummern zu den Hauptbereichen (Konzept E16, Vorschlag) und Kompetenzen je Funktion. Kompetenzmerkmale (E14) als Beispiel.", "",
  tabelle(["Nr.", "Aufgabe", "Hauptbereich", "Kompetenzen", "Merkmale", "geprüft"], D.FUNKTIONENDIAGRAMM.map((f) => [f.nr, f.titel, f.bereich ? `${f.bereich} ${ab[f.bereich] || ""}` : "–",
    Object.entries(f.rollen).map(([r, c]) => `${r} ${c}`).join(", "),
    Object.entries(f.merkmale || {}).map(([r, m]) => `${r}: ${Object.entries(m).map(([k, w]) => `${k}=${w}`).join(", ")}`).join("; "), "☐"])), "");

// 5. Annahmen
out.push(`## 5. Annahmen in den Einstellungen und Vorlagen`, "");
out.push("### 5.1 Eskalationsstufen (Konzept E6)", "", tabelle(["Fristart", "Stufe", "Tage zur Frist", "An", "Meldung", "geprüft"], E.eskalation.map((e) => [e.fristart, e.stufe, e.tage, e.an, e.name, "☐"])), "");
out.push("### 5.2 Vorgesetzte Rolle je Funktion", "", tabelle(["Funktion", "Vorgesetzt", "geprüft"], E.funktionen.filter((f) => f.vorgesetzt).map((f) => [`${f.kuerzel} ${f.name}`, f.vorgesetzt, "☐"])), "");
const grp = {};
D.VORLAGEN.forEach((v) => { const k = (v.prozessverantwortlich || []).join(", "); (grp[v.gruppe + "|" + k] = grp[v.gruppe + "|" + k] || []).push(v.titel); });
out.push("### 5.3 Prozessverantwortung je Gruppe (Konzept E5)", "", tabelle(["Gruppe", "Prozessverantwortlich", "Vorlagen", "geprüft"], Object.entries(grp).map(([k, l]) => [k.split("|")[0], k.split("|")[1], l.length, "☐"])), "");
out.push("### 5.4 Prozesslenkung: Kategorie, Schutzbedarf, Reviewintervall", "", tabelle(["Nr.", "Vorlage", "Kategorie", "Schutzbedarf", "Review", "geprüft"], D.VORLAGEN.map((v) => [v.meta.nummer, v.titel, { fuehrung: "Führung", kern: "Kern", support: "Support" }[v.meta.kategorie], v.meta.schutzbedarf, v.meta.reviewPeriode, "☐"])), "");
out.push("### 5.5 Intervall → Periode (Konzept E19)", "", tabelle(["Intervall", "Periode", "geprüft"], E.intervalle.map((i) => [`${i.kuerzel} ${i.name}`, i.periode || "– (keine eindeutige)", "☐"])), "");
out.push("### 5.6 Kompetenzen und Funktionen (Vorschlag mit neuen Kürzeln)", "",
  `Neue Kompetenzarten: ${E.kompetenzen.filter((k) => k.neu).map((k) => `${k.kuerzel} ${k.name}`).join(", ")} – mit dem bestehenden Muster abstimmen. Funktionen: ${E.funktionen.length} Vorschläge in ${new Set(E.funktionen.map((f) => f.gruppe)).size} Gruppen; Erziehungsberechtigte als «ELT» statt «EB» (in den Vorlagen verwendet). ☐`, "");
const CX = ctx.window.FLOW_CODEX_AUSZUG || { erlasse: {} };
const artText = { erlass: "Erlass", merkblatt: "Merkblatt / Arbeitshilfe", intern: "schuleigen" };
out.push(`## 6. Zuordnung zu EduKSX-Codex (Konzept 5b, E20–E24)`, "",
  `Auszug aus dem Codex-Prototyp, Stand ${CX.stand || "–"}. Erlasse ohne Eintrag unter den Rechtsgrundlagen Volksschule: Aufnahme in Codex prüfen; Merkblätter: E23.`, "",
  tabelle(["Quelle", "Art", "Codex", "Fassung", "Rechtsgrundlage Nr.", "geprüft"], Object.entries(CX.erlasse).map(([k, e]) => [k, artText[e.art], e.ordnungsnummer || "–", e.fassung ? `${e.fassung} (${e.publiziert})` : "–",
    e.art === "erlass" ? ((e.rechtsgrundlagen || []).map((r) => r.nr).join(", ") || "⚠ fehlt") : "–", "☐"])), "");
out.push(`## 7. Weitere offene Punkte`, "",
  "- ☐ Ab wann dürfen Logins erstellt werden (Prozessliste)? Im Prototyp T−21 bzw. gültig ab T−14.",
  "- ☐ Sperrregeln Offboarding (im Prototyp Tag nach dem letzten Arbeitstag).",
  "- ☐ Welches Modul führt Schlüssel und Geräte (im Prototyp EduKSX-Shop)?",
  "- ☐ Semester- und Trimestergrenzen in den Schuljahresdaten (Annahmen).",
  "- ☐ Aufrufprotokoll und Journal als Teil des Personaldossiers (digitale Aktenführung ab 1.1.2029)?",
  "- ☐ Revision PG § 17 (Kündigungsfristen) – hängig.", "");
fs.writeFileSync(path.join(ordner, "PRUEFLISTE.md"), out.join("\n"));
console.log(`PRUEFLISTE.md geschrieben: ${zp.length} Quellen ZU PRÜFEN, ${ges.length} gesetzliche Fristen, ${D.FUNKTIONENDIAGRAMM.length} FD-Aufgaben.`);
