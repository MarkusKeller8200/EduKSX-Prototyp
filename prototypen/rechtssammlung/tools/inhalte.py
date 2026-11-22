"""Redaktionelle Inhalte des EduKSX-Codex als Inhaltspaket (Importformat 1.0) – Export, Umwandlung, Prüfung.

Das Inhaltspaket ist das Format der Pflege-API (`POST /api/v1/content-imports/bundle`, Schema «ContentBundle»
in docs/umsetzung/codex/openapi.json). Dieselben Inhalte lassen sich als Excel-Arbeitsmappe oder als CSV-Dateien
(ein Blatt = eine Datei) bearbeiten; dieses Werkzeug wandelt zwischen den Formaten um und prüft eine Lieferung
so, wie es die API im Probelauf tun wird.

Aufruf:
  python3 tools/inhalte.py export                 heutige Inhalte des Prototyps → data/inhalte/ (JSON, XLSX, CSV)
  python3 tools/inhalte.py pruefen <datei>        Paket (.json), Arbeitsmappe (.xlsx) oder CSV-Ordner prüfen
  python3 tools/inhalte.py umwandeln <ein> <aus>  zwischen .json, .xlsx und CSV-Ordner umwandeln
  python3 tools/inhalte.py vorlage                leere Vorlage data/inhalte/vorlage.xlsx (nur Kopfzeilen und Beispiel)
  python3 tools/inhalte.py sql <paket> <aus.sql>  Paket als INSERT-Skript für das Schema «codex» (Ladetest; Erlasse als Platzhalter)

Rückgabewert von «pruefen»: 0 ohne Fehler (Warnungen erlaubt), 1 mit Fehlern.
"""
import csv, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "inhalte"
FORMAT = "1.0"
TRENNER = " | "   # Listen in einer Zelle (Ebenen, Fragen, Hierarchien)

# ---------------------------------------------------------------- Tabellen (Blätter bzw. CSV-Dateien) und Spalten
BLAETTER = {
    "info":             ["format_version", "research_note", "sources", "researched_at"],
    "hierarchien":      ["hierarchy_key", "title", "short_title", "hierarchy_group", "position", "levels", "note", "research_note"],
    "knoten":           ["hierarchy_key", "node_key", "level_index", "citation", "title", "act_kind", "note", "external_url", "match_pattern", "exclusion_pattern", "position"],
    "beschluesse":      ["hierarchy_key", "node_key", "title", "url", "note"],
    "verbindungen":     ["hierarchy_key", "from_node_key", "to_node_key", "relation", "relation_type", "status"],
    "belege":           ["hierarchy_key", "from_node_key", "to_node_key", "citation", "location", "side"],
    "elternthemen":     ["topic_key", "title", "audience", "position", "questions", "hierarchy_keys", "match_pattern", "exclusion_pattern", "research_note"],
    "elternstellen":    ["topic_key", "citation", "location"],
    "hinweise":         ["topic_key", "title", "publisher_name", "url", "note", "retrieved_at"],
    "pflichtdokumente": ["document_key", "category_number", "category_title", "document", "obligation", "intake", "document_class", "source", "source_url",
                         "match_pattern", "uncertain_pattern", "exclusion_pattern", "remark"],
    "rechtsgrundlagen": ["number", "legal_area_number", "citation", "title", "location", "relevance", "source_url"],
    "loeschen":         ["content_type", "content_key"],
}
BESCHREIBUNG = {
    "info": "Angaben zur Lieferung (eine Zeile): Formatversion 1.0, Recherche (Auftrag, Vorgehen, Modell), Quellen (Adressen, getrennt mit « | »), Stand",
    "hierarchien": "Je Normenhierarchie eine Zeile; Ebenen von oben nach unten, getrennt mit « | »",
    "knoten": "Je Knoten eine Zeile; level_index = Ebene (0 = oben); citation = «LS …», «SR …», «kommunal» oder «Bildungsratsbeschlüsse»",
    "beschluesse": "Liste «Beschlüsse und Erlasse» eines Knotens (z. B. Bildungsratsbeschlüsse)",
    "verbindungen": "Von = untergeordneter Knoten, Nach = übergeordneter Knoten; relation_type: basis, implementation, subsidiary, reference, not_applicable",
    "belege": "Belegstellen einer Verbindung: Erlass (citation) und Stelle (z. B. «§ 41 a.», «Art. 62», «Ingress», «suche:Art. 4 ¹ Im …»); side: from, to, other",
    "elternthemen": "Je Thema eine Zeile; audience parents (Elternwegweiser) oder school_leaders (Praxisthemen); Fragen und Hierarchie-Schlüssel getrennt mit « | »",
    "elternstellen": "Rechtsstellen zu einem Elternthema bzw. Praxisthema (Erlass und Stelle)",
    "hinweise": "Hinweise kantonaler Stellen zu einem Thema – Quelle (url) ist Pflicht; ergänzende Quelle Klasse C, keine Rechtsgrundlage",
    "pflichtdokumente": "Pflichtkatalog Schulgemeinde; obligation P (Pflicht), B (bedingt), O (optional); document_class A, A/B, B, C (Dokumenttyp, Vorschlag ZU PRÜFEN)",
    "rechtsgrundlagen": "Verzeichnis «Rechtsgrundlagen Volksschule»; number ist der Schlüssel",
    "loeschen": "Zu löschende Einträge: content_type (norm_hierarchies, parent_guide_topics, mandatory_documents, legal_bases) und Schlüssel",
}
LINIENART = [(r"nicht direkt", "not_applicable"), (r"Vollzug", "implementation"), (r"subsidi", "subsidiary"), (r"Grundlage|Umsetzung", "basis")]
FUNDSTELLE = re.compile(r"^((LS|SR) \d[\d.]*\d( \(Anhang\))?( / \d[\d.]*\d)*|kommunal|Bildungsratsbeschlüsse)$")
STELLE = re.compile(r"^(§ \d+( [a-z])?\.|Art\. \d+[a-z]*|Ingress|suche:.+)$")


def linienart(relation):
    return next((t for m, t in LINIENART if re.search(m, relation or "")), "reference")


# ---------------------------------------------------------------- Export aus dem Prototyp
def export_prototyp():
    sys.path.insert(0, str(Path(__file__).parent))
    import build as B   # noqa: E402  (Prototyp-Generator; enthält HIERARCHIEN, ELTERNFRAGEN, Pflichtkatalog)
    texte = B.texte_index()
    fund = {nr: e.get("fundstelle") or ("SR " + nr[3:] if nr.startswith("sr-") else "LS " + nr) for nr, e in texte["erlasse"].items()}
    def fs_von(nr):
        return fund.get(nr) or ("SR " + nr[3:] if nr.startswith("sr-") else "LS " + nr)
    paket = {"format_version": FORMAT, "research_note": "Export der redaktionellen Inhalte aus dem Prototyp EduKSX-Codex (Recherchen im Chat, Stand 20.11.2026)",
             "sources": ["https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung.html", "https://www.fedlex.admin.ch"],
             "researched_at": "2026-11-20T00:00:00+01:00", "norm_hierarchies": [], "parent_guide_topics": [], "mandatory_documents": [], "legal_bases": []}
    for pos, sp in enumerate(B.HIERARCHIEN):
        knoten, schluessel_ls = [], {}
        for i, k in enumerate(sp["knoten"]):
            if k.get("sr"): cit, ls = "SR " + k["sr"], "sr-" + k["sr"]
            elif k.get("ls"): cit, ls = fs_von(k["ls"]), k["ls"]
            else: cit, ls = k.get("fundstelle"), None
            schluessel_ls[k["id"]] = cit
            n = {"node_key": k["id"], "level_index": k["ebene"], "citation": cit, "title": k["titel"], "act_kind": k.get("art"), "note": k.get("hinweis"),
                 "external_url": k.get("url") if not ls else None, "match_pattern": k.get("muster"), "exclusion_pattern": k.get("ohne"), "position": i,
                 "links": [{"title": l["titel"], "url": l.get("url"), "note": l.get("hinweis")} for l in k.get("liste", [])]}
            knoten.append({a: b for a, b in n.items() if b not in (None, [])})
        kanten = []
        for x in sp["kanten"]:
            belege = []
            for schl in ("beleg", "beleg_oben", "beleg_unten"):
                if x.get(schl):
                    nr, stelle = x[schl]
                    cit = fs_von(nr)
                    seite = "from" if cit == schluessel_ls.get(x["von"]) else "to" if cit == schluessel_ls.get(x["nach"]) else "other"
                    belege.append({"citation": cit, "location": stelle, "side": seite})
            e = {"from_node_key": x["von"], "to_node_key": x["nach"], "relation": x["art"], "relation_type": linienart(x["art"]), "status": "manual", "evidences": belege}
            kanten.append(e)
        paket["norm_hierarchies"].append({"hierarchy_key": sp["id"], "title": sp["titel"], "short_title": B.KURZTITEL.get(sp["id"]),
                                          "hierarchy_group": B.GRUPPEN.get(sp["id"], ""), "levels": sp["ebenen"], "position": pos, "nodes": knoten, "edges": kanten})
    for pos, (f, zielgruppe) in enumerate([(x, "parents") for x in B.ELTERNFRAGEN] + [(x, "school_leaders") for x in B.PRAXISTHEMEN]):
        paket["parent_guide_topics"].append({k: v for k, v in {
            "topic_key": f["id"] if zielgruppe == "parents" else "praxis-" + f["id"], "title": f["titel"], "audience": zielgruppe, "questions": f["fragen"], "position": pos, "hierarchy_keys": f["themen"],
            "notes": [{"title": x["titel"], "publisher_name": x["herausgeber"], "url": x["url"], "note": x["text"], "retrieved_at": "2026-11-22"} for x in f.get("hinweise", [])],
            "provisions": [{"citation": fs_von(nr), "location": st} for nr, st in f["stellen"]],
            "match_pattern": f.get("muster"), "exclusion_pattern": f.get("ohne")}.items() if v not in (None, [])})
    pk = B.pflichtkatalog()
    for kat in pk["kategorien"]:
        for e in kat["eintraege"]:
            paket["mandatory_documents"].append({k: v for k, v in {
                "document_key": e["id"], "category_number": kat["nr"], "category_title": kat["titel"], "document": e["dokument"], "obligation": e["stufe"],
                "intake": e["aufnahme"], "document_class": e.get("typ"), "source": e["quelle"], "source_url": e["quelle_url"], "match_pattern": e.get("muster"),
                "uncertain_pattern": e.get("muster_unsicher"), "exclusion_pattern": e.get("ohne"), "remark": e.get("bemerkung") or None}.items() if v not in (None, "")})
    for e in B.rechtsgrundlagen()["eintraege"]:   # Fundstelle wie im Prototyp ergänzt (Alias-Tabelle, Bildungsrat, kommunal)
        fund = e.get("fundstelle") or ("Bildungsratsbeschlüsse" if e.get("ebene") == "Bildungsrat" else "kommunal")
        paket["legal_bases"].append({k: v for k, v in {
            "number": e["nr"], "legal_area_number": e["sachbereich"], "citation": fund, "title": e["titel"], "location": e.get("stelle"),
            "relevance": e.get("relevanz"), "source_url": e.get("quelle_url")}.items() if v not in (None, "")})
    return paket


# ---------------------------------------------------------------- Paket ↔ Tabellen
def liste(x): return TRENNER.join(x or [])
def aus_liste(x): return [t.strip() for t in str(x or "").split("|") if t.strip()]


def paket_zu_tabellen(p):
    T = {b: [] for b in BLAETTER}
    T["info"].append({"format_version": p.get("format_version", FORMAT), "research_note": p.get("research_note"), "sources": liste(p.get("sources")), "researched_at": p.get("researched_at")})
    for h in p.get("norm_hierarchies", []):
        T["hierarchien"].append({**{k: h.get(k) for k in BLAETTER["hierarchien"]}, "levels": liste(h.get("levels"))})
        for n in h.get("nodes", []):
            T["knoten"].append({"hierarchy_key": h["hierarchy_key"], **{k: n.get(k) for k in BLAETTER["knoten"][1:]}})
            for l in n.get("links", []):
                T["beschluesse"].append({"hierarchy_key": h["hierarchy_key"], "node_key": n["node_key"], **l})
        for e in h.get("edges", []):
            T["verbindungen"].append({"hierarchy_key": h["hierarchy_key"], **{k: e.get(k) for k in BLAETTER["verbindungen"][1:]}})
            for b in e.get("evidences", []):
                T["belege"].append({"hierarchy_key": h["hierarchy_key"], "from_node_key": e["from_node_key"], "to_node_key": e["to_node_key"], **{k: b.get(k) for k in ("citation", "location", "side")}})
    for t in p.get("parent_guide_topics", []):
        T["elternthemen"].append({**{k: t.get(k) for k in BLAETTER["elternthemen"]}, "questions": liste(t.get("questions")), "hierarchy_keys": liste(t.get("hierarchy_keys"))})
        for s in t.get("provisions", []):
            T["elternstellen"].append({"topic_key": t["topic_key"], "citation": s["citation"], "location": s["location"]})
        for n in t.get("notes", []):
            T["hinweise"].append({"topic_key": t["topic_key"], **{k: n.get(k) for k in BLAETTER["hinweise"][1:]}})
    for d in p.get("mandatory_documents", []):
        T["pflichtdokumente"].append({k: d.get(k) for k in BLAETTER["pflichtdokumente"]})
    for r in p.get("legal_bases", []):
        T["rechtsgrundlagen"].append({k: r.get(k) for k in BLAETTER["rechtsgrundlagen"]})
    for art, keys in (p.get("delete_keys") or {}).items():
        for k in keys: T["loeschen"].append({"content_type": art, "content_key": k})
    return T


def leer(v): return v is None or (isinstance(v, str) and not v.strip())
def zahl(v): return None if leer(v) else int(float(v))
def sauber(d): return {k: (v.strip() if isinstance(v, str) else v) for k, v in d.items() if not leer(v)}


def tabellen_zu_paket(T):
    info = (T.get("info") or [{}])[0]
    p = {"format_version": str(info.get("format_version") or FORMAT), "research_note": info.get("research_note"), "sources": aus_liste(info.get("sources")),
         "researched_at": info.get("researched_at"), "norm_hierarchies": [], "parent_guide_topics": [], "mandatory_documents": [], "legal_bases": []}
    H = {}
    for r in T.get("hierarchien", []):
        r = sauber(r)
        h = {**r, "levels": aus_liste(r.get("levels")), "nodes": [], "edges": []}
        if "position" in h: h["position"] = zahl(h["position"])
        H[r["hierarchy_key"]] = h; p["norm_hierarchies"].append(h)
    N = {}
    for r in T.get("knoten", []):
        r = sauber(r); h = H.get(r.get("hierarchy_key"))
        n = {k: v for k, v in r.items() if k != "hierarchy_key"}
        n["level_index"] = zahl(n.get("level_index"));
        if "position" in n: n["position"] = zahl(n["position"])
        if h is None: n["_fehler"] = f"Hierarchie «{r.get('hierarchy_key')}» fehlt im Blatt hierarchien"; h = H.setdefault(r.get("hierarchy_key"), {"hierarchy_key": r.get("hierarchy_key"), "nodes": [], "edges": [], "_unbekannt": True})
        h["nodes"].append(n); N[(r.get("hierarchy_key"), r.get("node_key"))] = n
    for r in T.get("beschluesse", []):
        r = sauber(r); n = N.get((r.get("hierarchy_key"), r.get("node_key")))
        if n is not None: n.setdefault("links", []).append({k: r[k] for k in ("title", "url", "note") if k in r})
    E = {}
    for r in T.get("verbindungen", []):
        r = sauber(r); h = H.get(r.get("hierarchy_key"))
        e = {k: v for k, v in r.items() if k != "hierarchy_key"}; e["evidences"] = []
        if h is not None: h["edges"].append(e)
        E[(r.get("hierarchy_key"), r.get("from_node_key"), r.get("to_node_key"))] = e
    for r in T.get("belege", []):
        r = sauber(r); e = E.get((r.get("hierarchy_key"), r.get("from_node_key"), r.get("to_node_key")))
        if e is not None: e["evidences"].append({k: r[k] for k in ("citation", "location", "side") if k in r})
    TH = {}
    for r in T.get("elternthemen", []):
        r = sauber(r)
        t = {**r, "questions": aus_liste(r.get("questions")), "hierarchy_keys": aus_liste(r.get("hierarchy_keys")), "provisions": []}
        if "position" in t: t["position"] = zahl(t["position"])
        TH[r["topic_key"]] = t; p["parent_guide_topics"].append(t)
    for r in T.get("elternstellen", []):
        r = sauber(r); t = TH.get(r.get("topic_key"))
        if t is not None: t["provisions"].append({"citation": r.get("citation"), "location": r.get("location")})
    for r in T.get("hinweise", []):
        r = sauber(r); t = TH.get(r.get("topic_key"))
        if t is not None:
            if "retrieved_at" in r: r["retrieved_at"] = str(r["retrieved_at"])[:10]
            t.setdefault("notes", []).append({k: r[k] for k in BLAETTER["hinweise"][1:] if k in r})
    for r in T.get("pflichtdokumente", []):
        r = sauber(r)
        if r: p["mandatory_documents"].append({**r, "category_number": zahl(r.get("category_number"))})
    for r in T.get("rechtsgrundlagen", []):
        r = sauber(r)
        if r: p["legal_bases"].append({**r, "number": zahl(r.get("number")), "legal_area_number": zahl(r.get("legal_area_number"))})
    loe = {}
    for r in T.get("loeschen", []):
        r = sauber(r)
        if r: loe.setdefault(r["content_type"], []).append(r["content_key"])
    if loe: p["delete_keys"] = loe
    return {k: v for k, v in p.items() if v not in (None, [])} | {"format_version": p["format_version"]}


# ---------------------------------------------------------------- Dateien lesen und schreiben
def schreibe_xlsx(T, pfad, beschreibung=True):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter
    wb = Workbook(); wb.remove(wb.active)
    for blatt, spalten in BLAETTER.items():
        ws = wb.create_sheet(blatt)
        ws.append(spalten)
        for c in ws[1]: c.font = Font(bold=True); c.fill = PatternFill("solid", fgColor="E8EEF7")
        for z in T.get(blatt, []): ws.append([z.get(s) for s in spalten])
        ws.freeze_panes = "A2"
        for i, s in enumerate(spalten, 1):
            breite = max([len(str(s))] + [len(str(z.get(s) or "")) for z in T.get(blatt, [])[:200]])
            ws.column_dimensions[get_column_letter(i)].width = max(10, min(60, breite + 2))
    if beschreibung:
        ws = wb.create_sheet("_anleitung", 0)
        ws.append(["Blatt", "Inhalt"]); ws["A1"].font = ws["B1"].font = Font(bold=True)
        for b, t in BESCHREIBUNG.items(): ws.append([b, t])
        ws.append([]); ws.append(["Hinweis", "Schlüssel (hierarchy_key, node_key, topic_key, document_key, number) bestimmen, ob ein Eintrag neu ist oder ersetzt wird. "
                                  "Eine Hierarchie bzw. ein Elternthema wird immer vollständig ersetzt: nicht aufgeführte Knoten, Verbindungen und Stellen werden entfernt."])
        ws.column_dimensions["A"].width = 18; ws.column_dimensions["B"].width = 140
    wb.save(pfad)


def lese_xlsx(pfad):
    from openpyxl import load_workbook
    wb = load_workbook(pfad, read_only=True, data_only=True); T = {}
    for blatt in BLAETTER:
        if blatt not in wb.sheetnames: continue
        zeilen = list(wb[blatt].iter_rows(values_only=True))
        if not zeilen: continue
        kopf = [str(x).strip() if x is not None else "" for x in zeilen[0]]
        T[blatt] = [dict(zip(kopf, z)) for z in zeilen[1:] if any(v not in (None, "") for v in z)]
    return T


def schreibe_csv(T, ordner):
    ordner.mkdir(parents=True, exist_ok=True)
    for blatt, spalten in BLAETTER.items():
        with open(ordner / f"{blatt}.csv", "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=spalten, delimiter=";", extrasaction="ignore")
            w.writeheader()
            for z in T.get(blatt, []): w.writerow({k: ("" if v is None else v) for k, v in z.items()})


def lese_csv(ordner):
    T = {}
    for blatt in BLAETTER:
        f = ordner / f"{blatt}.csv"
        if f.exists():
            with open(f, encoding="utf-8-sig", newline="") as fh:
                probe = fh.read(2048); fh.seek(0)
                T[blatt] = list(csv.DictReader(fh, delimiter=";" if probe.count(";") >= probe.count(",") else ","))
    return T


def lese(pfad):
    pfad = Path(pfad)
    if pfad.is_dir(): return tabellen_zu_paket(lese_csv(pfad))
    if pfad.suffix.lower() == ".xlsx": return tabellen_zu_paket(lese_xlsx(pfad))
    if pfad.suffix.lower() == ".json": return json.loads(pfad.read_text(encoding="utf-8"))
    raise SystemExit(f"Unbekanntes Format: {pfad} (erwartet .json, .xlsx oder Ordner mit CSV)")


def schreibe(paket, pfad):
    pfad = Path(pfad)
    if pfad.suffix.lower() == ".json": pfad.write_text(json.dumps(paket, ensure_ascii=False, indent=1), encoding="utf-8")
    elif pfad.suffix.lower() == ".xlsx": schreibe_xlsx(paket_zu_tabellen(paket), pfad)
    else: schreibe_csv(paket_zu_tabellen(paket), pfad)


# ---------------------------------------------------------------- Prüfung (wie der Probelauf der API)
def pruefen(p, mit_texten=True):
    """Liefert Liste von Meldungen (ergebnis, inhaltsart, schluessel, text) – ergebnis «error» oder «warning»."""
    M = []
    def meld(art, schl, text, stufe="error"): M.append((stufe, art, schl, text))
    texte = {}
    if mit_texten:
        try:
            sys.path.insert(0, str(Path(__file__).parent)); import build as B
            idx = B.texte_index()
            for nr, e in idx["erlasse"].items():
                texte[e.get("fundstelle") or ("LS " + nr)] = (nr, e["fassungen"][-1]["nachtrag"] if e["fassungen"] else None)
            paragraf = B.paragraf
        except Exception as x:   # noqa: BLE001
            meld("paket", "-", f"Textfassungen nicht verfügbar ({x}) – Stellen werden nicht geprüft", "warning"); paragraf = None
    else:
        paragraf = None
    if str(p.get("format_version")) != FORMAT: meld("paket", "-", f"Formatversion «{p.get('format_version')}» – erwartet «{FORMAT}»")
    def regex(art, schl, feld, v):
        if v:
            try: re.compile(v)
            except re.error as x: meld(art, schl, f"{feld}: ungültiger regulärer Ausdruck ({x})")
    def stelle(art, schl, cit, loc):
        if not cit or not FUNDSTELLE.match(cit): meld(art, schl, f"Fundstelle «{cit}» hat kein gültiges Format (LS …, SR …, kommunal)"); return
        if loc and not STELLE.match(loc): meld(art, schl, f"Stelle «{loc}» – erwartet «§ 12.», «§ 41 a.», «Art. 62», «Ingress» oder «suche:…»", "warning")
        cit = cit.split(" / ")[0]
        if paragraf and cit.startswith(("LS", "SR")) and "(Anhang)" not in cit:
            if cit not in texte: meld(art, schl, f"{cit}: keine Textfassung vorhanden – Erlass zuerst aufnehmen (ZH-Lex/Fedlex)", "warning")
            elif loc and not paragraf(texte[cit][0], texte[cit][1], loc): meld(art, schl, f"{cit} {loc}: Stelle in der geltenden Fassung nicht gefunden", "warning")
    gesehen = set()
    for h in p.get("norm_hierarchies", []):
        hk = h.get("hierarchy_key") or "?"
        if hk in gesehen: meld("norm_hierarchy", hk, "Schlüssel doppelt")
        gesehen.add(hk)
        for f in ("title", "hierarchy_group", "levels"):
            if not h.get(f): meld("norm_hierarchy", hk, f"Pflichtfeld «{f}» fehlt")
        if h.get("_unbekannt"): meld("norm_hierarchy", hk, "Knoten zu einer Hierarchie ohne Zeile im Blatt «hierarchien»")
        ebenen = len(h.get("levels") or [])
        nk = {}
        for n in h.get("nodes", []):
            s = f"{hk}/{n.get('node_key')}"
            if n.get("_fehler"): meld("hierarchy_node", s, n["_fehler"])
            if not n.get("node_key") or not n.get("title"): meld("hierarchy_node", s, "node_key und title sind Pflicht")
            if n.get("node_key") in nk: meld("hierarchy_node", s, "Schlüssel doppelt in der Hierarchie")
            nk[n.get("node_key")] = n
            li = n.get("level_index")
            if li is None or not (0 <= li < max(1, ebenen)): meld("hierarchy_node", s, f"Ebene {li} ausserhalb 0–{ebenen - 1}")
            regex("hierarchy_node", s, "match_pattern", n.get("match_pattern")); regex("hierarchy_node", s, "exclusion_pattern", n.get("exclusion_pattern"))
            cit = n.get("citation")
            if cit and cit.startswith(("LS", "SR")):
                stelle("hierarchy_node", s, cit, None)
            elif cit not in ("kommunal", "Bildungsratsbeschlüsse", None) and not (cit or "").startswith("LS "):
                meld("hierarchy_node", s, f"Fundstelle «{cit}» unbekannt", "warning")
            if cit == "kommunal" and not n.get("match_pattern"): meld("hierarchy_node", s, "kommunaler Knoten ohne Suchmuster – keine Beispiele", "warning")
        paare = set()
        for e in h.get("edges", []):
            s = f"{hk}/{e.get('from_node_key')}→{e.get('to_node_key')}"
            for f in ("from_node_key", "to_node_key"):
                if e.get(f) not in nk: meld("hierarchy_edge", s, f"{f} «{e.get(f)}» ist kein Knoten dieser Hierarchie")
            if e.get("from_node_key") == e.get("to_node_key"): meld("hierarchy_edge", s, "Verbindung auf sich selbst")
            if (e.get("from_node_key"), e.get("to_node_key")) in paare: meld("hierarchy_edge", s, "Verbindung doppelt")
            paare.add((e.get("from_node_key"), e.get("to_node_key")))
            if not e.get("relation"): meld("hierarchy_edge", s, "Beziehung fehlt")
            if e.get("relation_type") and e["relation_type"] not in ("basis", "implementation", "subsidiary", "reference", "not_applicable", "suggestion"):
                meld("hierarchy_edge", s, f"Linienart «{e['relation_type']}» unbekannt")
            if not e.get("evidences") and not ("kommunal" in [nk.get(e.get("from_node_key"), {}).get("citation")] and e.get("relation") in ("gestützt auf", "im Rahmen der")):
                meld("hierarchy_edge", s, "ohne Belegstelle", "warning")
            for b in e.get("evidences", []):
                stelle("hierarchy_edge", s, b.get("citation"), b.get("location"))
    hkeys = {h.get("hierarchy_key") for h in p.get("norm_hierarchies", [])}
    for t in p.get("parent_guide_topics", []):
        s = t.get("topic_key") or "?"
        if not t.get("title") or not t.get("questions"): meld("parent_guide_topic", s, "title und questions sind Pflicht")
        for k in t.get("hierarchy_keys", []):
            if hkeys and k not in hkeys: meld("parent_guide_topic", s, f"Normenhierarchie «{k}» nicht im Paket – muss bereits bestehen", "warning")
        regex("parent_guide_topic", s, "match_pattern", t.get("match_pattern")); regex("parent_guide_topic", s, "exclusion_pattern", t.get("exclusion_pattern"))
        for x in t.get("provisions", []): stelle("parent_guide_topic", s, x.get("citation"), x.get("location"))
        if t.get("audience") not in (None, "parents", "school_leaders"): meld("parent_guide_topic", s, f"Zielgruppe «{t.get('audience')}» – erlaubt parents, school_leaders")
        for n in t.get("notes", []):
            if not n.get("url") or not str(n["url"]).startswith("http"): meld("parent_guide_topic", s, f"Hinweis «{n.get('title')}» ohne Quelle (url)")
            for f in ("title", "publisher_name", "note"):
                if not n.get(f): meld("parent_guide_topic", s, f"Hinweis «{n.get('title')}»: Pflichtfeld «{f}» fehlt")
    dk = set()
    for d in p.get("mandatory_documents", []):
        s = d.get("document_key") or "?"
        if s in dk: meld("mandatory_document", s, "Schlüssel doppelt")
        dk.add(s)
        if d.get("obligation") not in ("P", "B", "O"): meld("mandatory_document", s, f"Stufe «{d.get('obligation')}» – erlaubt P, B, O")
        if d.get("document_class") not in (None, "A", "A/B", "B", "C", "none", "unclear"): meld("mandatory_document", s, f"Dokumenttyp «{d.get('document_class')}» – erlaubt A, A/B, B, C")
        for f in ("document", "intake", "category_number"):
            if leer(d.get(f)): meld("mandatory_document", s, f"Pflichtfeld «{f}» fehlt")
        for f in ("match_pattern", "uncertain_pattern", "exclusion_pattern"): regex("mandatory_document", s, f, d.get(f))
    nr = set()
    for r in p.get("legal_bases", []):
        s = str(r.get("number"))
        if s in nr: meld("legal_basis", s, "Nummer doppelt")
        nr.add(s)
        if r.get("citation") not in ("kommunal", "Bildungsratsbeschlüsse"): stelle("legal_basis", s, r.get("citation"), None)
        elif not r.get("citation"): meld("legal_basis", s, "Fundstelle fehlt")
    for art in (p.get("delete_keys") or {}):
        if art not in ("norm_hierarchies", "parent_guide_topics", "mandatory_documents", "legal_bases"): meld("paket", art, "unbekannte Inhaltsart in delete_keys")
    return M


def zusammenfassung(p):
    return {"norm_hierarchies": len(p.get("norm_hierarchies", [])), "hierarchy_nodes": sum(len(h.get("nodes", [])) for h in p.get("norm_hierarchies", [])),
            "hierarchy_edges": sum(len(h.get("edges", [])) for h in p.get("norm_hierarchies", [])), "parent_guide_topics": len(p.get("parent_guide_topics", [])),
            "mandatory_documents": len(p.get("mandatory_documents", [])), "legal_bases": len(p.get("legal_bases", [])),
            "delete_keys": sum(len(v) for v in (p.get("delete_keys") or {}).values())}


# ---------------------------------------------------------------- SQL (Ladetest gegen docs/umsetzung/codex/datenbank.sql)
def als_sql(p):
    """Erzeugt INSERTs für eine leere Datenbank: Herausgeber und Erlasse als Platzhalter aus den Fundstellen, dann alle Inhalte als Entwurf."""
    import uuid
    def q(v):
        if v is None: return "NULL"
        if isinstance(v, bool): return "true" if v else "false"
        if isinstance(v, int): return str(v)
        if isinstance(v, list): return "ARRAY[" + ",".join(q(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
        if isinstance(v, dict): return q(json.dumps(v, ensure_ascii=False)) + "::jsonb"
        return "'" + str(v).replace("'", "''") + "'"
    def ins(t, d): return f"INSERT INTO {t} ({', '.join(d)}) VALUES ({', '.join(q(v) for v in d.values())});"
    U = lambda: str(uuid.uuid4())
    L = ["SET search_path TO codex;", "BEGIN;"]
    imp = U()
    L.append(ins("content_imports", {"id": imp, "source_kind": "json", "mode": "apply", "status": "applied", "format_version": p.get("format_version"),
                                     "research_note": p.get("research_note"), "sources": p.get("sources", []), "summary": zusammenfassung(p)}))
    pub = {"LS": U(), "SR": U()}
    L.append(ins("publishers", {"id": pub["LS"], "publisher_key": "zh", "level": "cantonal", "publisher_type": "canton", "name": "Kanton Zürich"}))
    L.append(ins("publishers", {"id": pub["SR"], "publisher_key": "ch", "level": "federal", "publisher_type": "confederation", "name": "Bund"}))
    acts = {}
    def act(cit):
        if not cit or not cit.startswith(("LS", "SR")): return None
        cit = cit.split(" / ")[0]
        if cit not in acts:
            acts[cit] = U()
            L.append(ins("legal_acts", {"id": acts[cit], "publisher_id": pub[cit[:2]], "act_key": cit.lower().replace(" ", "-"), "title": cit, "citation": cit,
                                        "order_number": cit[3:].replace(" (Anhang)", "")}))
        return acts[cit]
    red = {"content_status": "draft", "review_status": "to_review", "content_import_id": imp}
    H = {}
    for h in p.get("norm_hierarchies", []):
        hid = H[h["hierarchy_key"]] = U()
        L.append(ins("norm_hierarchies", {"id": hid, "hierarchy_key": h["hierarchy_key"], "title": h["title"], "short_title": h.get("short_title"),
                                          "hierarchy_group": h["hierarchy_group"], "levels": h["levels"], "note": h.get("note"), "position": h.get("position", 0),
                                          "research_note": h.get("research_note"), **red}))
        N = {}
        for n in h.get("nodes", []):
            nid = N[n["node_key"]] = U()
            L.append(ins("hierarchy_nodes", {"id": nid, "norm_hierarchy_id": hid, "node_key": n["node_key"], "level_index": n["level_index"], "legal_act_id": act(n.get("citation")),
                                             "citation": n.get("citation"), "title": n["title"], "act_kind": n.get("act_kind"), "note": n.get("note"), "external_url": n.get("external_url"),
                                             "match_pattern": n.get("match_pattern"), "exclusion_pattern": n.get("exclusion_pattern"), "position": n.get("position", 0)}))
            for i, l in enumerate(n.get("links", [])):
                L.append(ins("hierarchy_node_links", {"id": U(), "hierarchy_node_id": nid, "title": l["title"], "url": l.get("url"), "note": l.get("note"), "position": i}))
        for i, e in enumerate(h.get("edges", [])):
            eid = U()
            L.append(ins("hierarchy_edges", {"id": eid, "norm_hierarchy_id": hid, "from_node_id": N[e["from_node_key"]], "to_node_id": N[e["to_node_key"]], "relation": e["relation"],
                                             "relation_type": e.get("relation_type") or linienart(e["relation"]), "status": e.get("status", "manual"), "position": i}))
            for j, b in enumerate(e.get("evidences", [])):
                if act(b["citation"]):
                    L.append(ins("hierarchy_edge_evidences", {"id": U(), "hierarchy_edge_id": eid, "legal_act_id": act(b["citation"]), "location": b["location"], "side": b.get("side", "from"), "position": j}))
    for t in p.get("parent_guide_topics", []):
        tid = U()
        L.append(ins("parent_guide_topics", {"id": tid, "topic_key": t["topic_key"], "title": t["title"], "audience": t.get("audience", "parents"), "questions": t["questions"], "match_pattern": t.get("match_pattern"),
                                             "exclusion_pattern": t.get("exclusion_pattern"), "position": t.get("position", 0), "research_note": t.get("research_note"), **red}))
        for i, k in enumerate(t.get("hierarchy_keys", [])):
            L.append(ins("parent_guide_topic_hierarchies", {"parent_guide_topic_id": tid, "norm_hierarchy_id": H[k], "position": i}))
        for i, n in enumerate(t.get("notes", [])):
            L.append(ins("guide_topic_notes", {"id": U(), "parent_guide_topic_id": tid, "title": n["title"], "publisher_name": n["publisher_name"], "url": n["url"], "note": n["note"],
                                               "retrieved_at": n.get("retrieved_at"), "position": i}))
        for i, x in enumerate(t.get("provisions", [])):
            L.append(ins("parent_guide_provisions", {"id": U(), "parent_guide_topic_id": tid, "legal_act_id": act(x["citation"]), "location": x["location"], "position": i}))
    K = {}
    for i, d in enumerate(p.get("mandatory_documents", [])):
        if d["category_number"] not in K:
            K[d["category_number"]] = U(); L.append(ins("mandatory_document_categories", {"id": K[d["category_number"]], "number": d["category_number"], "title": d.get("category_title") or str(d["category_number"])}))
        L.append(ins("mandatory_documents", {"id": U(), "document_key": d["document_key"], "category_id": K[d["category_number"]], "document": d["document"], "obligation": d["obligation"],
                                             "intake": d["intake"], "source": d.get("source"), "source_url": d.get("source_url"), "match_pattern": d.get("match_pattern"),
                                             "uncertain_pattern": d.get("uncertain_pattern"), "exclusion_pattern": d.get("exclusion_pattern"), "remark": d.get("remark"), "position": i,
                                             "document_class": d.get("document_class"), **red}))
    A = {}
    for r in p.get("legal_bases", []):
        if r["legal_area_number"] not in A:
            A[r["legal_area_number"]] = U(); L.append(ins("legal_areas", {"id": A[r["legal_area_number"]], "number": r["legal_area_number"], "title": f"Sachbereich {r['legal_area_number']}"}))
        L.append(ins("legal_bases", {"id": U(), "number": r["number"], "legal_area_id": A[r["legal_area_number"]], "legal_act_id": act(r["citation"]),
                                     "title": r["title"], "citation": r["citation"], "location": r.get("location"),
                                     "relevance": r.get("relevance"), "source": r.get("source_url"), **red}))
    L.append("COMMIT;")
    return "\n".join(L) + "\n"


def main(argv):
    if not argv or argv[0] in ("-h", "--help"): print(__doc__); return 0
    cmd = argv[0]
    if cmd == "export":
        OUT.mkdir(parents=True, exist_ok=True)
        p = export_prototyp()
        schreibe(p, OUT / "codex-inhalte.json"); schreibe(p, OUT / "codex-inhalte.xlsx"); schreibe(p, OUT / "csv")
        print("Export:", json.dumps(zusammenfassung(p), ensure_ascii=False))
        M = pruefen(p)
        print(f"Prüfung: {sum(1 for m in M if m[0] == 'error')} Fehler, {sum(1 for m in M if m[0] == 'warning')} Warnungen")
        (OUT / "pruefbericht.txt").write_text("\n".join(f"{a.upper():7} {b:18} {c:40} {d}" for a, b, c, d in M) + "\n", encoding="utf-8")
        return 0
    if cmd == "vorlage":
        OUT.mkdir(parents=True, exist_ok=True)
        beispiel = {"format_version": FORMAT, "research_note": "Beispiel", "sources": ["https://www.zh.ch/…"], "norm_hierarchies": [{
            "hierarchy_key": "beispiel", "title": "Beispielthema", "short_title": "Beispiel", "hierarchy_group": "Schule", "levels": ["Kanton – Gesetze", "Gemeinde / Schulgemeinde"], "position": 99,
            "nodes": [{"node_key": "vsg", "level_index": 0, "citation": "LS 412.100", "title": "Volksschulgesetz (VSG)", "act_kind": "Gesetz (Kantonsrat)"},
                      {"node_key": "kom", "level_index": 1, "citation": "kommunal", "title": "Reglement der Schule", "match_pattern": "reglement"}],
            "edges": [{"from_node_key": "kom", "to_node_key": "vsg", "relation": "Grundlage", "relation_type": "basis", "evidences": [{"citation": "LS 412.100", "location": "§ 41 a.", "side": "to"}]}]}]}
        schreibe_xlsx(paket_zu_tabellen(beispiel), OUT / "vorlage.xlsx"); print(OUT / "vorlage.xlsx"); return 0
    if cmd == "pruefen" and len(argv) >= 2:
        p = lese(argv[1]); M = pruefen(p)
        print("Inhalt:", json.dumps(zusammenfassung(p), ensure_ascii=False))
        for a, b, c, d in M: print(f"{a.upper():7} {b:18} {c:40} {d}")
        f = sum(1 for m in M if m[0] == "error")
        print(f"→ {f} Fehler, {len(M) - f} Warnungen"); return 1 if f else 0
    if cmd == "sql" and len(argv) >= 3:
        Path(argv[2]).write_text(als_sql(lese(argv[1])), encoding="utf-8"); print("→", argv[2]); return 0
    if cmd == "umwandeln" and len(argv) >= 3:
        schreibe(lese(argv[1]), argv[2]); print("→", argv[2]); return 0
    print(__doc__); return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
