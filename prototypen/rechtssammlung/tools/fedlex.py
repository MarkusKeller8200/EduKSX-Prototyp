"""Bundesrecht aus Fedlex aufbereiten (Auftrag 20.11.2026, Normenhierarchie Punkt 3).

Fassungen (Konsolidierungen) über den SPARQL-Endpunkt von Fedlex abfragen, die amtliche HTML-Fassung laden und
in dasselbe Markdown-Format wie die ZH-Lex-Texte (tools/texte.py) umwandeln: «## Abschnitt», «### Art. n Randtitel»,
Absätze mit hochgestellter Nummer, Aufzählungen «- a. …», Fussnoten «[^n]». Unterschiede zwischen Fassungen mit
texte.delta(). Ergebnis in texte/sr-<SR-Nummer>/<JJJJMMTT>.md, Index in texte/index.json, Fassungsliste aller
Konsolidierungen in data/raw/fedlex-versionen.json.

Aufruf:  python3 tools/fedlex.py            (alle Erlasse in ERLASSE)
         python3 tools/fedlex.py 151.3 235.1 (nur diese)
"""
import hashlib, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag

sys.path.insert(0, str(Path(__file__).parent))
from texte import delta  # noqa: E402

BASIS = Path(__file__).resolve().parent.parent
OUT = BASIS / "texte"
RAW = BASIS / "data" / "raw" / "fedlex-versionen.json"
CACHE = Path("/tmp/eduksx-codex-fedlex")
SPARQL = "https://fedlex.data.admin.ch/sparqlendpoint"

# SR-Nummer → (ELI-Pfad, Kurztitel, Anzahl Fassungen als Text; None = alle)
ERLASSE = {
    "101":    ("1999/404", "Bundesverfassung (BV)", 6),
    "0.107":  ("1998/2055_2055_2055", "UN-Kinderrechtskonvention (KRK)", None),
    "151.3":  ("2003/667", "Behindertengleichstellungsgesetz (BehiG)", None),
    "210":    ("24/233_245_233", "Zivilgesetzbuch (ZGB)", 4),
    "220":    ("27/317_321_377", "Obligationenrecht (OR)", 4),
    "231.1":  ("1993/1798_1798_1798", "Urheberrechtsgesetz (URG)", None),
    "235.1":  ("2022/491", "Datenschutzgesetz (DSG)", None),
    "235.11": ("2022/568", "Datenschutzverordnung (DSV)", None),
    "311.0":  ("54/757_781_799", "Strafgesetzbuch (StGB)", 4),
    "818.101": ("2015/297", "Epidemiengesetz (EpG)", None),
    "211.222.338": ("1977/1931_1931_1931", "Pflegekinderverordnung (PAVO)", None),
    "415.0":  ("2012/460", "Sportförderungsgesetz (SpoFöG)", None),
    "415.01": ("2012/461", "Sportförderungsverordnung (SpoFöV)", None),
    "832.10": ("1995/1328_1328_1328", "Krankenversicherungsgesetz (KVG)", 2),
    "832.20": ("1982/1676_1676_1676", "Unfallversicherungsgesetz (UVG)", 2),
}
HEUTE = "20261120"   # Stichtag der Aufbereitung
HOCH = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")

def holen(url, ziel=None):
    for versuch in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "EduKSX-Codex-Prototyp"}), timeout=120) as r:
                daten = r.read()
            if ziel: Path(ziel).write_bytes(daten)
            return daten
        except Exception:
            if versuch == 2: raise
            time.sleep(2)

def konsolidierungen(eli):
    q = f"""PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
SELECT DISTINCT ?date ?url WHERE {{
 ?c jolux:isMemberOf <https://fedlex.data.admin.ch/eli/cc/{eli}> ; jolux:dateApplicability ?date ; jolux:isRealizedBy ?e .
 ?e jolux:language <http://publications.europa.eu/resource/authority/language/DEU> ; jolux:isEmbodiedBy ?m .
 ?m jolux:userFormat <https://fedlex.data.admin.ch/vocabulary/user-format/html> ; jolux:isExemplifiedBy ?url .
}} ORDER BY ?date"""
    url = SPARQL + "?" + urllib.parse.urlencode({"query": q})
    req = urllib.request.Request(url, headers={"Accept": "application/sparql-results+json", "User-Agent": "EduKSX-Codex-Prototyp"})
    with urllib.request.urlopen(req, timeout=120) as r:
        b = json.load(r)["results"]["bindings"]
    je = {}
    for x in b: je[x["date"]["value"]] = x["url"]["value"]   # je Datum eine HTML-Datei (letzte gewinnt)
    return sorted(je.items())

def datum_ch(iso): j, m, t = iso[:10].split("-"); return f"{t}.{m}.{j}"

def inline(el, fn):
    """Text eines Elements; Fussnotenverweise als [^n], hochgestellte Absatznummern als ¹²³."""
    teile = []
    for c in el.children:
        if isinstance(c, NavigableString): teile.append(str(c)); continue
        if not isinstance(c, Tag): continue
        if c.name == "div" and "footnotes" in (c.get("class") or []): continue
        if c.name == "sup":
            a = c.find("a", href=re.compile(r"^#fn-"))
            if a: teile.append(f"[^{a.get_text(strip=True)}]"); fn.add(a["href"][1:]); continue
            t = c.get_text(strip=True)
            teile.append(t.translate(HOCH) if t.isdigit() else t); continue
        if c.name == "br": teile.append(" "); continue
        if c.name in ("p", "div"): teile.append(" " + inline(c, fn) + " "); continue
        teile.append(inline(c, fn))
    return "".join(teile)

def sauber(t):
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"\s+([,.;:)])", r"\1", t)
    return re.sub(r"(?<=[¹²³⁴⁵⁶⁷⁸⁹⁰])\s*(?=\S)", " ", t, count=1) if re.match(r"^[¹²³⁴⁵⁶⁷⁸⁹⁰]", t) else t

def html_zu_markdown(html):
    s = BeautifulSoup(html, "html.parser")
    fn = set(); zeilen = []
    h1 = s.find("h1"); titel = sauber(h1.get_text(" ")) if h1 else ""
    zeilen.append("# " + titel); zeilen.append("")
    praeambel = s.find(id="preamble")
    if praeambel:
        zeilen.append(sauber(inline(praeambel, fn))); zeilen.append("")
    for el in s.find_all(["h1", "h2", "h3", "h4", "h5", "article"]):
        if el is h1 or el.find_parent("article") or el.find_parent(id="preamble"): continue
        if el.name != "article":
            if el.find_parent("div", class_="footnotes"): continue
            t = sauber(inline(el, fn))
            if t and not (el.name == "h2" and el.find_previous(["h1", "h2", "article"]) is h1):
                zeilen += ["## " + t, ""]
            elif t:   # Kurztitel unter dem Titel
                zeilen += [t, ""]
            continue
        kopf = el.find(["h6", "h5", "h4"])
        zeilen += ["### " + (sauber(inline(kopf, fn)) if kopf else el.get("id", "")), ""]
        rumpf = el.find("div", class_="collapseable") or el
        for c in rumpf.children:
            if not isinstance(c, Tag) or c is kopf: continue
            if c.name == "div" and "footnotes" in (c.get("class") or []): continue
            if c.name == "dl":
                for dt in c.find_all("dt", recursive=False):
                    dd = dt.find_next_sibling("dd")
                    zeilen += [f"- {sauber(inline(dt, fn))} {sauber(inline(dd, fn)) if dd else ''}".rstrip(), ""]
            elif c.name in ("p", "div", "blockquote", "table"):
                if c.name == "table":
                    for tr in c.find_all("tr"):
                        zeilen += ["| " + " | ".join(sauber(inline(td, fn)) for td in tr.find_all(["td", "th"])) + " |"]
                    zeilen.append("")
                    continue
                if c.find("dl"):
                    for x in c.children:
                        if isinstance(x, Tag) and x.name == "dl":
                            for dt in x.find_all("dt", recursive=False):
                                dd = dt.find_next_sibling("dd")
                                zeilen += [f"- {sauber(inline(dt, fn))} {sauber(inline(dd, fn)) if dd else ''}".rstrip(), ""]
                        elif isinstance(x, Tag) or str(x).strip():
                            t = sauber(inline(x, fn) if isinstance(x, Tag) else str(x))
                            if t: zeilen += [t, ""]
                    continue
                t = sauber(inline(c, fn))
                if t: zeilen += [t, ""]
    # Fussnoten
    noten = []
    for p in s.select("div.footnotes p[id^=fn-]"):
        a = p.find("a"); n = a.get_text(strip=True) if a else p["id"]
        erste = a.find_parent("sup") if a else None
        if erste: erste.decompose()
        text = sauber(inline(p, set()))
        noten.append(f"[^{n}]: {text}")
    md = "\n".join(zeilen).rstrip() + "\n"
    if noten: md += "\n---\n\n" + "\n".join(noten) + "\n"
    return titel, md, {"absaetze": sum(1 for z in zeilen if z.startswith(tuple("¹²³⁴⁵⁶⁷⁸⁹"))), "fussnoten": len(noten), "artikel": sum(1 for z in zeilen if z.startswith("### "))}

def aufbereiten(sr):
    eli, kurz, anzahl = ERLASSE[sr]
    alle = konsolidierungen(eli)
    if not alle: print("  keine Fassungen gefunden"); return None, []
    schluessel = "sr-" + sr
    ordner = OUT / schluessel; ordner.mkdir(parents=True, exist_ok=True); CACHE.mkdir(parents=True, exist_ok=True)
    versionen = []
    for i, (d, url) in enumerate(alle):
        bis = alle[i + 1][0] if i + 1 < len(alle) else ""
        versionen.append({"stand": d[:10].replace("-", ""), "datum": datum_ch(d), "bis": datum_ch(bis) if bis else "", "html": url,
                          "seite": f"https://www.fedlex.admin.ch/eli/cc/{eli}/{d[:10].replace('-', '')}/de"})
    geltend = [v for v in versionen if v["stand"] <= HEUTE]          # künftige Konsolidierungen nur als Metadaten
    auswahl = geltend if anzahl is None else geltend[-anzahl:]
    titel = kurz; eintraege = []
    for v in auswahl:
        roh = CACHE / f"{sr}_{v['stand']}.html"
        if not roh.exists(): holen(v["html"], roh); time.sleep(0.3)
        html = roh.read_text(encoding="utf-8", errors="replace")
        t, md, info = html_zu_markdown(html)
        titel = t or titel
        sha = hashlib.sha256(html.encode("utf-8")).hexdigest()
        kopf = ["---", f"erlass: \"{kurz}\"", f"ordnungsnummer: \"SR {sr}\"", f"nachtrag: \"{v['stand']}\"",
                f"veroeffentlicht: \"{v['datum']}\"", f"in_kraft_bis: \"{v['bis']}\"", f"quelle: \"{v['seite']}\"",
                f"html_sha256: \"{sha}\"", "aufbereitet: \"20.11.2026\"",
                "hinweis: \"Maschinell aus der amtlichen HTML-Fassung (Fedlex) erzeugt – massgebend ist die amtliche Fassung.\"", "---", ""]
        (ordner / f"{v['stand']}.md").write_text("\n".join(kopf) + md, encoding="utf-8")
        e = {"nachtrag": v["stand"], "veroeffentlicht": v["datum"], "in_kraft_bis": v["bis"], "seite": v["seite"], **info, "html_sha256": sha}
        eintraege.append(e)
        print(f"  SR {sr} Stand {v['datum']} – {info['artikel']} Artikel")
    for alt, neu in zip(eintraege, eintraege[1:]):
        a = (ordner / f"{alt['nachtrag']}.md").read_text(encoding="utf-8")
        n = (ordner / f"{neu['nachtrag']}.md").read_text(encoding="utf-8")
        dd = delta(a, n); dd.update(alt=alt["nachtrag"], neu=neu["nachtrag"])
        (ordner / f"delta_{alt['nachtrag']}_{neu['nachtrag']}.json").write_text(json.dumps(dd, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        neu["delta"] = dd["zusammenfassung"]
    return {"ordnungsnummer": "SR " + sr, "titel": kurz, "titel_amtlich": titel, "quelle": "Fedlex", "fassungen_gesamt": len(versionen),
            "fassungen": eintraege}, versionen

def main(argv):
    nrs = [a for a in argv if not a.startswith("--")] or list(ERLASSE)
    idx_pfad = OUT / "index.json"
    index = json.loads(idx_pfad.read_text(encoding="utf-8")) if idx_pfad.exists() else {"erlasse": {}}
    raw = json.loads(RAW.read_text(encoding="utf-8")) if RAW.exists() else {"_quelle": "Fedlex SPARQL (fedlex.data.admin.ch), abgerufen 20.11.2026"}
    for sr in nrs:
        print("Aufbereiten SR", sr)
        e, versionen = aufbereiten(sr)
        if not e: continue
        index["erlasse"]["sr-" + sr] = e
        raw[sr] = {"t": e["titel_amtlich"], "k": e["titel"], "eli": ERLASSE[sr][0], "v": [[v["stand"], v["bis"]] for v in versionen]}
    index["stand"] = "20.11.2026"
    idx_pfad.write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    RAW.write_text(json.dumps(raw, ensure_ascii=False, indent=0), encoding="utf-8")

if __name__ == "__main__":
    main(sys.argv[1:])
