#!/usr/bin/env python3
"""EduKSX-Codex – Textfassung (Markdown) und Unterschiede zwischen Versionen.

Vorab-Aufbereitung (Entscheid 20.11.2026): Erlass-PDFs aus ZH-Lex je Fassung laden, in Markdown umwandeln und die
Unterschiede zwischen aufeinanderfolgenden Fassungen als JSON ablegen. Der Browser zeigt nur noch an und färbt ein –
kein KI-Modell zur Laufzeit.

    python3 tools/texte.py 412.100 412.101 412.311     # Ordnungsnummern
    python3 tools/texte.py --nur-neu 412.100           # nur Fassungen ohne Markdown
    python3 tools/texte.py --nur-aktuell 177.10        # nur die geltende Fassung (z. B. für die Normenhierarchie)
    python3 tools/texte.py --pdf datei.pdf             # eine PDF-Datei umwandeln (Ausgabe auf stdout)

Ausgabe:
    texte/<LS>/<Nachtrag>.md          Markdown je Fassung (Kopf mit Metadaten)
    texte/<LS>/delta_<alt>_<neu>.json  Unterschiede, bezogen auf die Absätze der neueren Fassung
    texte/index.json                  Übersicht (Fassungen, Datum, Prüfsumme der PDF, Umfang)

Werkzeug: pdfplumber (MIT). Docling/Marker geprüft und für den Prototyp verworfen (siehe Konzept, E2).
"""
import difflib, hashlib, json, re, sys, time, urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "zhlex-versionen.json"
OUT = ROOT / "texte"
CACHE = Path("/tmp/eduksx-codex-pdf")
SEITE = "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung/zhlex-ls/"
HOCH = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")

# ---------------------------------------------------------------- PDF → Markdown
def _cluster(words, tol=3.0):
    """Wörter zu Zeilen bündeln (hochgestellte Ziffern liegen 1–2 pt höher)."""
    zeilen = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if zeilen and abs(w["top"] - zeilen[-1]["top"]) <= tol:
            zeilen[-1]["w"].append(w)
        else:
            zeilen.append({"top": w["top"], "w": [w]})
    for z in zeilen: z["w"].sort(key=lambda w: w["x0"])
    return zeilen

UEBERSCHRIFT = re.compile(r"^(\d+\.\s*Teil\b|[A-Z]\.\s|[IVX]+\.\s|\d+\.\s*Abschnitt\b|\d+\.\s*Kapitel\b|Übergangsbestimmung|Schlussbestimmung|Anhang\b)")
BINDEWORT = {"und", "oder", "bis", "sowie", "bzw.", "noch", "als", "statt"}

def trennung(t):
    """Silbentrennung «Volks- schule» auflösen, aber «Kinder- und Jugendheim» behalten."""
    t = re.sub(r"(?<=[a-zäöüß]) - (?=[a-zäöüß]{2,})(?!(?:und|oder|bis|sowie)\b)", "- ", t)   # abgelöster Trennstrich «Neubeurtei - lung»
    return re.sub(r"(?<=\w)- (\S+)", lambda m: ("- " + m.group(1)) if m.group(1).rstrip(",.;:") in BINDEWORT or not re.match(r"[a-zäöüß]", m.group(1)) else m.group(1), t)

def zeilenende(woerter):
    """Einzelbuchstabe am Zeilenende an das Wort davor hängen (Satzartefakt «un d», «sei t»)."""
    if len(woerter) >= 2 and re.fullmatch(r"[a-zäöüß]", woerter[-1]["text"]) and re.search(r"[a-zäöüß]$", woerter[-2]["text"]):
        woerter = woerter[:-2] + [dict(woerter[-2], text=woerter[-2]["text"] + woerter[-1]["text"], x1=woerter[-1]["x1"])]
    return woerter

def pdf_zu_markdown(pfad):
    pdf = pdfplumber.open(pfad)
    alle = []
    for nr, pg in enumerate(pdf.pages):
        ws = pg.extract_words(x_tolerance=1.5, y_tolerance=2, extra_attrs=["size"])
        h = pg.height
        ws = [w for w in ws if h * 0.105 < w["top"] < h * 0.89]   # Kopf- und Fusszeile
        for w in ws: w["seite"] = nr
        alle.append((pg, ws))
    groessen = {}
    for _, ws in alle:
        for w in ws: groessen[round(w["size"], 1)] = groessen.get(round(w["size"], 1), 0) + len(w["text"])
    body = max(groessen, key=groessen.get)

    def art(w):
        r = w["size"] / body
        if r > 1.15: return "titel"
        if r >= 0.95: return "text"
        if r >= 0.86: return "fn_text"
        if r >= 0.76: return "rand"
        if r >= 0.58: return "hoch"
        return "fn_nr"

    bloecke, fussnoten, titel = [], {}, []
    fn_aktuell = None
    absatz = None          # laufender Absatz (Liste von Textstücken)

    def abschliessen():
        nonlocal absatz
        if absatz and absatz["text"].strip(): bloecke.append(absatz)
        absatz = None

    for pg, ws in alle:
        textwoerter = [w for w in ws if art(w) in ("text", "hoch")]
        if textwoerter:
            links = min(w["x0"] for w in textwoerter); rechts = max(w["x1"] for w in textwoerter)
        else:
            links, rechts = 0, pg.width
        rand = [w for w in ws if art(w) == "rand" and (w["x1"] < links + 2 or w["x0"] > rechts - 2)]
        # Randtitel zu Blöcken
        rbl = []
        for w in sorted(rand, key=lambda w: (w["top"], w["x0"])):
            if rbl and w["top"] - rbl[-1]["unten"] <= 4 and abs(w["top"] - rbl[-1]["letzte"]) <= 12:
                b = rbl[-1]
                b["text"] += (" " if abs(w["top"] - b["letzte"]) > 2 else " ") + w["text"]
                b["unten"], b["letzte"] = w["bottom"], w["top"]
            else:
                rbl.append({"top": w["top"], "unten": w["bottom"], "letzte": w["top"], "text": w["text"]})
        for b in rbl: b["text"] = trennung(b["text"]).strip()
        rand_ids = {id(w) for w in rand}
        # Fussnoten (am Ende des Erlasses)
        for z in _cluster([w for w in ws if art(w) in ("fn_text", "fn_nr")]):
            for w in zeilenende(z["w"]):
                if art(w) == "fn_nr" and re.fullmatch(r"\d+", w["text"]):
                    fn_aktuell = w["text"]; fussnoten[fn_aktuell] = ""
                elif fn_aktuell:
                    fussnoten[fn_aktuell] += (" " if fussnoten[fn_aktuell] else "") + w["text"]
        # Titel
        for z in _cluster([w for w in ws if art(w) == "titel"]):
            titel.append(" ".join(w["text"] for w in z["w"]))
        # Text
        for z in _cluster([w for w in ws if art(w) in ("text", "hoch") and id(w) not in rand_ids]):
            woerter = z["w"]
            # Einzelbuchstabe am Zeilenende an das Wort davor hängen (Satzartefakt «un d»)
            if art(woerter[-1]) == "text": woerter = zeilenende(woerter)
            stuecke, neuer_absatz, abs_nr = [], False, None
            for i, w in enumerate(woerter):
                if art(w) == "hoch" and re.fullmatch(r"\d+[a-z]?", w["text"]):
                    luecke = w["x0"] - woerter[i - 1]["x1"] if i else 99
                    nach = woerter[i + 1] if i + 1 < len(woerter) else None
                    if luecke < 1.5 and i:                        # direkt angehängt → Fussnotenverweis
                        stuecke.append(("fn", w["text"]))
                    elif nach is not None and art(nach) == "text" and int(re.match(r"\d+", w["text"]).group()) <= 30:
                        neuer_absatz, abs_nr = True, w["text"]; stuecke.append(("abs", w["text"]))
                    else:
                        stuecke.append(("fn", w["text"]))
                else:
                    stuecke.append(("w", w["text"]))
            zeile = "".join((" " + t if k == "w" else " " + t.translate(HOCH) if k == "abs" else "[^" + t + "]") for k, t in stuecke).strip()
            zeile = re.sub(r"\s+", " ", zeile)
            zeile = re.sub(r"(\[\^\d+[a-z]?\])\s+([,.;:])", r"\1\2", zeile)
            if not zeile: continue
            ist_par = re.match(r"^§\s*\d+\s*[a-z]?\.", zeile)
            ist_ueb = not ist_par and not neuer_absatz and UEBERSCHRIFT.match(zeile) and len(zeile) < 90
            vorher = (absatz or {}).get("text", "") if absatz else (bloecke[-1]["text"] if bloecke else "")
            ist_lit = (not ist_par and not neuer_absatz and re.match(r"^([a-z]|\d{1,2})\.\s", zeile)
                       and (re.search(r"[:,;]$|\b(und|oder)$", vorher.strip()) or (absatz or {}).get("typ") == "li") and not vorher.endswith("-"))
            rt = next((b for b in rbl if abs(b["top"] - z["top"]) <= 4 and not b.get("weg")), None)
            if ist_par or ist_ueb:
                abschliessen()
                if ist_ueb:
                    bloecke.append({"typ": "h2", "text": zeile}); continue
                m = re.match(r"^(§\s*\d+\s*[a-z]?\.)((?:\[\^\d+\])*)\s*(.*)$", zeile)
                kopf = m.group(1).replace(" ", " ")
                if rt: rt["weg"] = True
                bloecke.append({"typ": "h3", "text": kopf + (" " + rt["text"] if rt else "") + m.group(2)})
                absatz = {"typ": "p", "text": m.group(3)}
                continue
            if rt and not ist_par:
                rt["weg"] = True
                abschliessen(); bloecke.append({"typ": "rand", "text": rt["text"]})
            if neuer_absatz or ist_lit or absatz is None:
                abschliessen()
                absatz = {"typ": "li" if ist_lit else "p", "text": ""}
            # Zeile anfügen, Silbentrennung auflösen
            t = absatz["text"]
            absatz["text"] = trennung((t + " " + zeile).strip())
    abschliessen()

    # erster Listenpunkt «a.» steht oft noch im Absatz davor – abtrennen, wenn «b.» als Liste folgt
    for i in range(len(bloecke) - 1, 0, -1):
        n, v = bloecke[i], bloecke[i - 1]
        if n["typ"] == "li" and re.match(r"^(b|2)\.\s", n["text"]) and v["typ"] in ("p", "li"):
            erster = "a" if n["text"].startswith("b") else "1"
            m = list(re.finditer(r"(?:^|\s)(" + erster + r"\.\s)", v["text"]))
            if m and v["typ"] == "p":
                k = m[-1].start(1)
                kopf, liste = v["text"][:k].rstrip(), v["text"][k:]
                bloecke[i - 1:i] = ([{"typ": "p", "text": kopf}] if kopf else []) + [{"typ": "li", "text": liste}]
    md = []
    if titel: md += ["# " + titel[0], ""]
    for b in bloecke:
        tx = b["text"].strip()
        if b["typ"] == "h2": md += ["## " + tx, ""]
        elif b["typ"] == "h3": md += ["### " + tx, ""]
        elif b["typ"] == "rand": md += ["*" + tx + "*", ""]
        elif b["typ"] == "li": md += ["- " + tx, ""]
        else: md += [tx, ""]
    if fussnoten:
        md += ["---", ""] + [f"[^{k}]: {trennung(v).strip()}" for k, v in fussnoten.items()] + [""]
    return "\n".join(md), {"seiten": len(alle), "absaetze": len(bloecke), "fussnoten": len(fussnoten)}

# ---------------------------------------------------------------- Unterschiede
def absaetze(md):
    """Absätze = durch Leerzeile getrennte Blöcke; Kopf (Metadaten) und Fussnoten bleiben aussen vor."""
    teil = md.split("\n---\n")
    kern = teil[1] if md.startswith("---\n") and len(teil) > 2 else md
    if md.startswith("---\n"):
        kern = md.split("\n---\n", 1)[1]
    kern = kern.split("\n\n---\n\n")[0]
    return [b for b in kern.strip().split("\n\n") if b.strip()]

def _norm(t): return re.sub(r"\[\^\d+[a-z]?\]", "", t)   # Fussnotenverweise ändern sich ständig – nicht als Änderung zählen

def delta(alt_md, neu_md):
    a, b = absaetze(alt_md), absaetze(neu_md)
    sm = difflib.SequenceMatcher(None, [_norm(x) for x in a], [_norm(x) for x in b], autojunk=False)
    aenderungen = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal": continue
        if op == "replace":
            # paarweise wortgenau vergleichen, Überhang als ganz neu/gestrichen
            paare = min(i2 - i1, j2 - j1)
            for k in range(paare):
                aw, nw = _norm(a[i1 + k]).split(" "), _norm(b[j1 + k]).split(" ")
                ws = difflib.SequenceMatcher(None, aw, nw, autojunk=False)
                if ws.ratio() < 0.35:
                    aenderungen.append({"i": j1 + k, "op": "+"}); aenderungen.append({"vor": j1 + k, "op": "-", "text": a[i1 + k]})
                    continue
                teile = []
                for o, x1, x2, y1, y2 in ws.get_opcodes():
                    if o == "equal": teile.append(["=", " ".join(nw[y1:y2])])
                    if o in ("delete", "replace"): teile.append(["-", " ".join(aw[x1:x2])])
                    if o in ("insert", "replace"): teile.append(["+", " ".join(nw[y1:y2])])
                aenderungen.append({"i": j1 + k, "op": "~", "teile": teile})
            for k in range(i1 + paare, i2): aenderungen.append({"vor": j2, "op": "-", "text": a[k]})
            for k in range(j1 + paare, j2): aenderungen.append({"i": k, "op": "+"})
        elif op == "insert":
            for k in range(j1, j2): aenderungen.append({"i": k, "op": "+"})
        elif op == "delete":
            for k in range(i1, i2): aenderungen.append({"vor": j1, "op": "-", "text": a[k]})
    zahl = {"+": 0, "-": 0, "~": 0}
    for x in aenderungen: zahl[x["op"]] += 1
    return {"aenderungen": aenderungen, "zusammenfassung": {"neu": zahl["+"], "gestrichen": zahl["-"], "geaendert": zahl["~"]}}

# ---------------------------------------------------------------- ZH-Lex laden
def holen(url, ziel=None, versuche=3):
    for n in range(versuche):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "EduKSX-Codex-Prototyp (Textaufbereitung)"})
            daten = urllib.request.urlopen(req, timeout=60).read()
            if ziel: ziel.write_bytes(daten)
            return daten
        except Exception:
            if n == versuche - 1: raise
            time.sleep(2 + 3 * n)

def _ymd(d): return "_".join(reversed(d.split("."))) if d and d != "-" else ""

def fassungen(nr):
    roh = json.loads(RAW.read_text(encoding="utf-8"))[nr]
    out, gesehen = [], set()
    for z in roh["v"]:
        f = z.split("|")
        ed, ik = (f[3], f[4]) if len(f) > 3 else (roh["e"], roh["i"])
        if ed != roh["e"] or (f[0] in gesehen): continue     # nur Fassungen des geltenden Erlasses
        gesehen.add(f[0])
        out.append({"nachtrag": f[0], "veroeffentlicht": "" if f[1] == "-" else f[1], "in_kraft_bis": f[2],
                    "seite": f"{SEITE}erlass-{nr.replace('.', '_')}-{_ymd(ed)}-{_ymd(ik)}-{f[0]}.html"})
    def schluessel(v):
        d = v["veroeffentlicht"].split(".")
        return (d[2] + d[1] + d[0]) if len(d) == 3 else "0", v["nachtrag"]
    out.sort(key=schluessel)                                   # alt → neu
    return roh["t"], out

def aufbereiten(nr, nur_neu=False, nur_aktuell=False):
    titel, fs = fassungen(nr)
    if nur_aktuell: fs = fs[-1:]
    ordner = OUT / nr; ordner.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    eintraege = []
    for v in fs:
        md_pfad = ordner / f"{v['nachtrag']}.md"
        pdf_pfad = CACHE / f"{nr}_{v['nachtrag']}.pdf"
        if not (nur_neu and md_pfad.exists()):
            if not pdf_pfad.exists():
                html = holen(v["seite"]).decode("utf-8", "replace")
                m = re.search(r"OpenAttachment\?Open&(?:amp;)?docid=([0-9A-F]+)&(?:amp;)?file=([^\"&]+)", html)
                if not m: print(f"  {nr} {v['nachtrag']}: keine PDF gefunden"); continue
                v["pdf"] = f"https://www.notes.zh.ch/appl/zhlex_r.nsf/WebView/{m.group(1)}/$File/{m.group(2)}"
                holen(v["pdf"], pdf_pfad); time.sleep(0.5)
            md, info = pdf_zu_markdown(pdf_pfad)
            sha = hashlib.sha256(pdf_pfad.read_bytes()).hexdigest()
            kopf = ["---", f"erlass: \"{titel}\"", f"ordnungsnummer: \"LS {nr}\"", f"nachtrag: \"{v['nachtrag']}\"",
                    f"veroeffentlicht: \"{v['veroeffentlicht']}\"", f"in_kraft_bis: \"{v['in_kraft_bis']}\"",
                    f"quelle: \"{v['seite']}\"", f"pdf_sha256: \"{sha}\"", "aufbereitet: \"20.11.2026\"",
                    "hinweis: \"Maschinell aus der amtlichen PDF erzeugt – massgebend ist die amtliche Fassung.\"", "---", ""]
            md_pfad.write_text("\n".join(kopf) + md, encoding="utf-8")
            v.update(info, pdf_sha256=sha)
        eintraege.append(v)
        print(f"  {nr} {v['nachtrag']} {v['veroeffentlicht']}")
    # Unterschiede zwischen aufeinanderfolgenden Fassungen
    for alt, neu in zip(eintraege, eintraege[1:]):
        a = (ordner / f"{alt['nachtrag']}.md").read_text(encoding="utf-8")
        n = (ordner / f"{neu['nachtrag']}.md").read_text(encoding="utf-8")
        d = delta(a, n); d.update(alt=alt["nachtrag"], neu=neu["nachtrag"])
        (ordner / f"delta_{alt['nachtrag']}_{neu['nachtrag']}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        neu["delta"] = d["zusammenfassung"]
    return {"ordnungsnummer": nr, "titel": titel, "fassungen": [{k: v[k] for k in v if k not in ("pdf",)} for v in eintraege]}

def main(argv):
    if argv[:1] == ["--pdf"]:
        print(pdf_zu_markdown(argv[1])[0]); return
    nur_neu, nur_aktuell = "--nur-neu" in argv, "--nur-aktuell" in argv
    nrs = [a for a in argv if not a.startswith("--")] or ["412.100", "412.101", "412.311"]
    idx_pfad = OUT / "index.json"
    index = json.loads(idx_pfad.read_text(encoding="utf-8")) if idx_pfad.exists() else {"erlasse": {}}
    for nr in nrs:
        print("Aufbereiten LS", nr)
        index["erlasse"][nr] = aufbereiten(nr, nur_neu, nur_aktuell)
    index["stand"] = "20.11.2026"
    idx_pfad.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")

if __name__ == "__main__":
    main(sys.argv[1:])
