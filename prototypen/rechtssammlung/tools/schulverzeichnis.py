#!/usr/bin/env python3
"""Schulverzeichnis Kanton Zürich mit Standorten (Auftrag 22.11.2026).

Quellen (alle öffentlich):
  1. Bildungsdirektion, «Schule finden» (https://www.zh.ch/de/bildung/schulen.html): Schulträger der Volksschule
     mit Behörde, VSA-Nummer («Gde-Nr.»), Kontaktstelle, Adresse, Telefon, E-Mail, Website, Koordinaten.
  2. swisstopo, amtliches Gebäudeadressverzeichnis (api3.geo.admin.ch SearchServer): Adresse → gebäudegenaue
     Koordinaten und EGID; Gemeindegrenzen (swissBOUNDARIES3D) → BFS-Nummer.
  3. swisstopo, swissNAMES3D, Objektart «Schul- und Hochschulareal»: benannte Schulareale (Schulhäuser) im Kanton.
  4. Stadt Zürich, Open Data «Schulanlagen» (WFS, CC0): Volksschulen, Kindergärten, Sonderschulen der Stadt.

Personendaten werden nicht übernommen (AGENTS.md): Namen in Kontaktstellen, persönliche E-Mail-Adressen und
Adressen von Personen (z. B. Präsidium an der Wohnadresse) werden entfernt bzw. nur als Hinweis geführt.

Aufruf:  python3 tools/schulverzeichnis.py      → data/schulverzeichnis.json, data/schulanlagen.json
"""
import json, re, sys, math, html, urllib.request, urllib.parse, collections
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
QUELLE_ZH = "https://www.zh.ch/de/bildung/schulen.html"
GEO = "https://api3.geo.admin.ch/rest/services/api"
STZH_WFS = "https://www.ogd.stadt-zuerich.ch/wfs/geoportal/Schulanlagen"
HEUTE = date.today().strftime("%d.%m.%Y")

def hole(url, roh=False, versuche=3):
    fehler = None
    for _ in range(versuche):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "EduKSX-Codex-Prototyp"}), timeout=90) as r:
                d = r.read()
                return d.decode("utf-8") if roh else json.loads(d)
        except Exception as e:
            fehler = e
    raise fehler

# ---------------------------------------------------------------- Personendaten
GENERISCH = re.compile(r"^(info|schule|schulen|sekretariat|schulsekretariat|verwaltung|schulverwaltung|kanzlei|praesidium|präsidium|"
                       r"schulpflege|primarschule|sekundarschule|oberstufe|bildung|kontakt|admin|office|mail|zentrale|empfang|"
                       r"schulleitung|gemeinde|gemeindeverwaltung|ksp|kreisschulbehoerde|[a-z]*schul[a-z]*|[a-z]*verwaltung[a-z]*|"
                       r"[a-z-]*sekretariat[a-z]*|[a-z]+\.?schule|ps|sek|os|dlz[a-z.-]*|abteilung[a-z.-]*|bildung[a-z.-]*)$", re.I)

def person_im_text(t):
    return bool(re.search(r"\b(Herr|Frau|Hr\.|Fr\.)\s+[A-ZÄÖÜ]", t or ""))

STICHWORTE = ("schul", "schule", "sekretariat", "verwaltung", "kanzlei", "praesid", "präsid", "info", "kontakt", "bildung", "primar", "sekundar",
              "oberstufe", "pflege", "office", "admin", "zentrale", "empfang", "gemeinde", "stadt", "dlz", "abteilung", "leitung", "ksp", "kreis", "mail")

def mail_ok(m):
    """Funktionsadresse ja, persönliche Adresse (vorname.nachname, v.nachname …) nein."""
    lokal = m.split("@")[0].lower()
    if GENERISCH.match(lokal) or any(w in lokal for w in STICHWORTE): return True
    return False

# ---------------------------------------------------------------- 1. Kantonales Schulverzeichnis
def verzeichnis():
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(hole(QUELLE_ZH, roh=True), "html.parser")
    out = []
    for e in soup.select("div.mdl-contact_entry--location"):
        titel = e.select_one(".mdl-contact_entry__title").get_text(" ", strip=True)
        adr_el = e.select_one(".mdl-contact_entry__address-title")
        adresse = [x.strip() for x in adr_el.get_text("\n").split("\n") if x.strip()] if adr_el else []
        lat = lon = None
        r = e.select_one("a.mdl-contact_entry__show-route")
        m = r and re.search(r"destination=([\d.]+),([\d.]+)", r["href"])
        if m: lat, lon = round(float(m[1]), 6), round(float(m[2]), 6)
        texte = [x.get_text(" ", strip=True) for x in e.select(".mdl-contact_entry__section-cell")]
        tel = fax = None
        for t in texte:
            for typ, nr in re.findall(r"(Telefon|Fax)\s+(\+?[\d ]{9,})", t):
                if typ == "Telefon" and not tel: tel = nr.strip()
                if typ == "Fax" and not fax: fax = nr.strip()
        mails = [a["href"][7:].strip() for a in e.select('a[href^="mailto:"]')]
        webs = [a["href"] for a in e.select('a[href^="http"]') if "google.com/maps" not in a["href"]]
        out.append({"titel": titel, "adresse": adresse, "lat_zh": lat, "lon_zh": lon, "telefon": tel, "fax": fax, "emails": mails, "websites": webs})
    return out

ARTEN = r"(Primarschulpflege|Primarschule|Sekundarschulpflege|Sekundarschule|Sekundarstufe|Oberstufenschulpflege|Oberstufe|Schulpflege|Schulverwaltung|Schule|Kreisschulpflege|Schulzweckverband|Schulsekretariat|Politische Gemeinde)"

def zerlegen(o):
    t = o["titel"]
    m = re.search(r"\(\s*(?:Gde-Nr\.?\s*)?([A-Z]\d{2})\s*\)", t) or re.search(r"Gde-Nr\.?\s*([A-Z]\d{2})", t)
    o["vsa_nr"] = m[1] if m else None
    kopf, _, stelle = t.partition(" – ")
    behoerde = re.sub(r"\s*\(.*$|\s*Gde-Nr.*$", "", kopf).strip()
    m = re.match(ARTEN + r"\s+(.*)", behoerde)
    art, ort = (m[1], m[2]) if m else ("Schulbehörde", behoerde)
    ort = re.sub(r"^(der |des )?(Stadt|Gemeinde)\s+", "", ort).replace("a. A.", "am Albis").strip()
    o["behoerde"] = behoerde
    o["behoerde_art"] = art
    o["ort"] = ort
    o["stufe"] = "P" if art.startswith("Primar") else "S" if art.startswith(("Sekundar", "Oberstufe")) else "V"
    stelle = stelle.strip()
    o["person_entfernt"] = person_im_text(stelle) or person_im_text(kopf)
    if o["person_entfernt"]:
        stelle = "Präsidium bzw. Kontaktperson"
        o["titel"] = kopf.strip() + " – " + stelle
    o["kontaktstelle"] = stelle or None
    s = (stelle or "").lower()
    o["standort_art"] = ("Kontaktperson" if o["person_entfernt"] else "Schulhaus" if re.search(r"schulhaus|schulanlage|campus|zentrum|schule ", s + " ")
                         else "Gemeindeverwaltung" if re.search(r"gemeinde|stadt |stadthaus|dlz", s + " ")
                         else "Schulverwaltung")
    if art == "Kreisschulpflege": o["schulkreis"] = ort.replace("Zürich-", "")
    return o

def personen_entfernen(o):
    weg = [m for m in o["emails"] if not mail_ok(m)]
    o["email"] = next((m for m in o["emails"] if mail_ok(m)), None)
    o["email_entfernt"] = bool(weg)
    if o["person_entfernt"]:
        # Kontaktadresse einer Person (oft Wohnadresse): nur Ort übernehmen, keine Strasse, kein Telefon
        o["adresse_hinweis"] = "Kontakt über eine Person – Adresse und Telefon nicht übernommen (Personendaten)"
        o["adresse"] = o["adresse"][-1:] if o["adresse"] else []
        o["telefon"] = o["fax"] = None
        o["lat_zh"] = o["lon_zh"] = None
    del o["emails"]
    return o

# ---------------------------------------------------------------- 2. Adressen und Gemeinde (swisstopo)
def gemeinde_an(lon, lat):
    r = hole(f"{GEO}/MapServer/identify?" + urllib.parse.urlencode({
        "geometry": f"{lon},{lat}", "geometryType": "esriGeometryPoint", "sr": "4326",
        "layers": "all:ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill", "tolerance": "0", "returnGeometry": "false",
        "mapExtent": f"{lon-.05},{lat-.05},{lon+.05},{lat+.05}", "imageDisplay": "100,100,96"}))["results"]
    r = [z for z in r if z["attributes"].get("is_current_jahr")]
    return (r[0]["attributes"]["gde_nr"], r[0]["attributes"]["gemname"], r[0]["attributes"]["kanton"]) if r else (None, None, None)

def adresse_pruefen(o):
    if len(o["adresse"]) >= 2:
        text = " ".join(o["adresse"])
        r = hole(f"{GEO}/SearchServer?" + urllib.parse.urlencode({"searchText": text, "type": "locations", "origins": "address", "limit": "1", "sr": "4326"}))["results"]
        if r:
            a = r[0]["attrs"]; lab = re.sub("<[^>]+>", "", a["label"])
            nr = re.search(r"\s(\d+\s?\w?)\s*$", o["adresse"][0])
            strasse = re.sub(r"\s\d.*$", "", o["adresse"][0]).lower()
            if strasse and strasse in lab.lower() and (not nr or re.search(r"\b" + re.escape(nr[1].replace(" ", "")) + r"\b", lab.replace(" ", " "))):
                o.update(lat=round(a["lat"], 6), lon=round(a["lon"], 6), egid=a["featureId"].split("_")[0], koordinaten_quelle="Gebäudeadressverzeichnis (swisstopo)",
                         adresse_amtlich=lab, plz_abweichend=not bool(re.search(r"\b" + re.search(r"\b(\d{4})\b", text)[1] + r"\b", lab)) if re.search(r"\b(\d{4})\b", text) else False)
    if "lat" not in o and o.get("lat_zh"):
        o.update(lat=o["lat_zh"], lon=o["lon_zh"], koordinaten_quelle="Schulverzeichnis Kanton Zürich")
    if o.get("lat_zh") and o.get("lat") and o["koordinaten_quelle"].startswith("Gebäude"):
        o["abweichung_m"] = round(math.hypot((o["lon"] - o["lon_zh"]) * 75000, (o["lat"] - o["lat_zh"]) * 111000))
    if o.get("lat"):
        o["bfs_nr"], o["gemeinde_adresse"], _ = gemeinde_an(o["lon"], o["lat"])
    for k in ("lat_zh", "lon_zh"): o.pop(k, None)
    return o

# ---------------------------------------------------------------- 3. Schulhäuser (swissNAMES3D) und 4. Stadt Zürich
SUCHWORTE = ["Schulhaus", "Primarschule", "Sekundarschule", "Oberstufe", "Schulanlage", "Schulzentrum", "Kindergarten", "Schule ",
             "Kantonsschule", "Gymnasium", "Heilpädagogische", "Sonderschule", "Tagesschule", "Berufsschule", "Berufsfachschule",
             "Bildungszentrum", "Campus", "Primar", "Schul"]

def kategorie(name):
    n = name.lower()
    if re.search(r"kantonsschule|gymnasium|berufs|berufswahl|hochschule|universit|eth |eth$|fachschule|bildungszentrum|kv |mittelschule|höhere|agogis|technikum|ost$", n): return "Sekundarstufe II / Tertiär"
    if re.search(r"heilpädagog|sonderschul|schulheim|sprachheil|\bheim\b|stiftung|hps", n): return "Sonderschule"
    if re.search(r"bilingual|international|privat|steiner|montessori|christlich|freie |freie$|academy|école|ecole|lycée", n): return "Privatschule"
    if re.search(r"tagesschule|campus", n): return "Volksschule (zu prüfen)"
    return "Volksschule"

def stufe_aus_name(name):
    n = name.lower()
    if re.search(r"sekundar|oberstufe|\bsek\b|\bos\b", n): return "S"
    if re.search(r"primar|kindergarten", n): return "P"
    return None

def swissnames():
    alle = {}
    for t in SUCHWORTE:
        r = hole(f"{GEO}/MapServer/find?" + urllib.parse.urlencode({"layer": "ch.swisstopo.swissnames3d", "searchText": t, "searchField": "name",
                                                                   "returnGeometry": "true", "sr": "4326", "geometryFormat": "geojson", "contains": "true"}))["results"]
        for x in r:
            if x["properties"]["objektart"] != "Schul- und Hochschulareal": continue
            b = x["bbox"]; lon, lat = round((b[0] + b[2]) / 2, 6), round((b[1] + b[3]) / 2, 6)
            if 8.35 < lon < 8.99 and 47.15 < lat < 47.70:
                alle[x["featureId"]] = {"id": f"sn3d-{x['featureId']}", "name": x["properties"]["name"], "lat": lat, "lon": lon,
                                        "quelle": "swissNAMES3D (swisstopo), Schul- und Hochschulareal", "name_status": x["properties"]["status"]}
    # Ergänzung je Gemeinde über die Ortsnamensuche (die Abfrage oben liefert nicht alle Areale)
    import csv
    gemeinden = [r["gemeinde"] for r in csv.DictReader(open(ROOT / "data/gemeinden-zh.csv", encoding="utf-8"))]
    def je_gemeinde(g):
        treffer = []
        for wort in ("Schulhaus", "Schule", "Primarschule", "Sekundarschule", "Oberstufe", "Schulanlage", "Kindergarten", "Schulzentrum"):
            r = hole(f"{GEO}/SearchServer?" + urllib.parse.urlencode({"searchText": f"{wort} {g.replace(' (ZH)', '')}", "type": "locations", "origins": "gazetteer", "limit": "50", "sr": "4326"}))["results"]
            for x in r:
                lab = re.sub("<[^>]+>", "", x["attrs"]["label"])
                m = re.match(r"Schul- und Hochschulareal (.*) \(ZH\) - (.*)$", lab)
                if m and m[2].strip() in (g, g.replace(" (ZH)", "")):
                    treffer.append({"id": f"sn3d-{x['attrs'].get('featureId') or x['id']}", "name": m[1].strip(), "lat": round(x["attrs"]["lat"], 6), "lon": round(x["attrs"]["lon"], 6),
                                    "quelle": "swissNAMES3D (swisstopo), Schul- und Hochschulareal", "gemeinde_fix": g, "kanton_fix": "ZH"})
        return treffer
    with ThreadPoolExecutor(10) as ex:
        for liste in ex.map(je_gemeinde, gemeinden):
            for t in liste:
                doppelt = next((k for k, v in alle.items() if v["name"] == t["name"] and abs(v["lat"] - t["lat"]) < .003 and abs(v["lon"] - t["lon"]) < .003), None)
                if doppelt is None: alle["g-" + t["id"] + t["name"]] = t
    pts = list(alle.values())
    def zuordnen(p):
        if p.get("gemeinde_fix"):
            p["gemeinde"], p["kanton"] = p.pop("gemeinde_fix"), p.pop("kanton_fix"); p["bfs_nr"] = None; return p
        p["bfs_nr"], p["gemeinde"], p["kanton"] = gemeinde_an(p["lon"], p["lat"]); return p
    with ThreadPoolExecutor(10) as ex: pts = list(ex.map(zuordnen, pts))
    pts = [p for p in pts if p["kanton"] == "ZH" and p["gemeinde"] != "Zürich"]   # Stadt Zürich: amtliche Daten der Stadt
    for p in pts:
        p.pop("kanton"); p["kategorie"] = kategorie(p["name"]); p["stufe"] = stufe_aus_name(p["name"])
    return pts

def stadt_zuerich():
    out = []
    for layer, kat in (("poi_volksschule_view", "Volksschule"), ("poi_kindergarten_view", "Kindergarten"), ("poi_sonderschule_view", "Sonderschule")):
        d = hole(f"{STZH_WFS}?" + urllib.parse.urlencode({"SERVICE": "WFS", "REQUEST": "GetFeature", "VERSION": "1.1.0", "TYPENAME": layer,
                                                         "OUTPUTFORMAT": "application/vnd.geo+json", "SRSNAME": "EPSG:4326"}))
        for f in d["features"]:
            p = f["properties"]; lon, lat = f["geometry"]["coordinates"][:2]
            name = p.get("name") or ""
            if kat == "Volksschule" and not name.lower().startswith("schul"): name = "Schulhaus " + name
            out.append({"id": f"stzh-{p.get('poi_id')}", "name": name, "einheit": p.get("einheit"), "kategorie": kat,
                        "stufe": "P" if kat == "Kindergarten" else stufe_aus_name(name), "schulkreis": p.get("schulkreis"),
                        "adresse": [x for x in [p.get("adresse"), " ".join(filter(None, [p.get("plz"), p.get("ort")]))] if x],
                        "telefon": p.get("tel"), "website": p.get("www"), "lat": round(lat, 6), "lon": round(lon, 6),
                        "bfs_nr": 261, "gemeinde": "Zürich", "quelle": "Stadt Zürich, Open Data «Schulanlagen» (CC0)"})
    return out

# ---------------------------------------------------------------- 5. Schulträgerkarte des Gemeindeamts (zh.ch/de/politik-staat/gemeinden.html)
QUELLE_STK = "https://www.zh.ch/de/politik-staat/gemeinden.html"
OBS = "https://api.observablehq.com/d/06f16eabd96b28b2.js?v=3"     # Datenmodul der eingebetteten Karte (Statistisches Amt)
STK_FLAECHEN = {"P": "https://www.web.statistik.zh.ch/geodaten_visualisierungen/VIS_PS_Schulgemeinden_GEN_F_KTZH/VIS_PS_Schulgemeinden_GEN_F_KTZH_2023_01_01_union.json",
                "S": "https://www.web.statistik.zh.ch/geodaten_visualisierungen/VIS_OS_Schulgemeinden_GEN_F_KTZH/VIS_OS_Schulgemeinden_GEN_F_KTZH_2023_01_01_union.json"}

def _csv_anhang(js, name):
    import gzip, csv, io
    m = re.search(r'\["' + re.escape(name) + r'", \{url: "([^"]+)"', js)
    with urllib.request.urlopen(m[1], timeout=90) as r: roh = r.read()
    try: roh = gzip.decompress(roh)
    except OSError: pass
    return list(csv.DictReader(io.StringIO(roh.decode("utf-8"))))

def _runden(geo, stellen=4):
    def r(c): return [round(c[0], stellen), round(c[1], stellen)] if isinstance(c[0], (int, float)) else [r(x) for x in c]
    out = []
    for f in geo["features"]:
        if f["properties"].get("ART_N") == "See": continue
        g = f["geometry"]
        out.append({"code": f["properties"]["GEBIET_C"], "name": f["properties"]["GEBIET_N"], "typ": g["type"], "koord": r(g["coordinates"])})
    return out

def schultraegerkarte():
    js = hole(OBS, roh=True)
    traeger = []
    for stufe, datei in (("P", "fetchedDataPS-2.csv"), ("S", "fetchedDataOS-16@1.csv")):
        for z in _csv_anhang(js, datei):
            av = None if z["anschlussvertrag"] in ("NA", "") else z["anschlussvertrag"]
            traeger.append({"stufe": stufe, "code": z["code"], "name": z["name"], "typ": z["typ"], "bezeichnung": z["gemeindename"], "bfs": int(z["bfs"]),
                            "schulgebiet": z["schulgebiet"], "anschlussvertrag": av})
    zuordnung = [{"bfs": int(z["bfs"]), "gemeinde": z["gemeinde_name"], "traeger_code": z["code"], "traeger": z["schulgemeinde_name"],
                  "primar": z["primar"] == "1", "sekundar": z["sekundar"] == "1"} for z in _csv_anhang(js, "schulgemeinden@2.csv")]
    flaechen = {k: _runden(hole(u)) for k, u in STK_FLAECHEN.items()}
    meta = {"stand": HEUTE, "quelle": QUELLE_STK, "daten": OBS, "flaechen_stand": "1.1.2023 (Geometrie)",
            "hinweis": "Schulträgerkarte des Gemeindeamts (Statistisches Amt): Primar- und Sekundarschulträger mit Code, Schulgebiet und Anschlussverträgen. Die Karte selbst hat keine Direktlinks je Schulträger."}
    return {"meta": meta, "traeger": traeger, "zuordnung": zuordnung, "flaechen": flaechen}

# ---------------------------------------------------------------- 6. Privatschulen, Sonderschulen, Sekundarstufe II
QUELLE_PRIVAT = "https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/bildung/schulen/spezielle-schulen/privatschulen_oeffentliches_register_plz.pdf"
QUELLE_SONDER = "https://www.zh.ch/de/bildung/schulen/volksschule/volksschule-besonderer-bildungsbedarf/sonderschulen.html"
QUELLE_SEK2 = "https://maps.zh.ch/wfs/OGDZHWFS"

def adresse_suchen(text):
    text = text[:120]
    try: r = hole(f"{GEO}/SearchServer?" + urllib.parse.urlencode({"searchText": text, "type": "locations", "origins": "address", "limit": "1", "sr": "4326"}))["results"]
    except Exception: return None
    if not r: return None
    a = r[0]["attrs"]; lab = re.sub("<[^>]+>", "", a["label"])
    nr = re.search(r"\s(\d+\w?)\b", text)
    if nr and nr[1] not in lab: return None
    return {"lat": round(a["lat"], 6), "lon": round(a["lon"], 6), "egid": a["featureId"].split("_")[0], "adresse_amtlich": lab, "koordinaten_quelle": "Gebäudeadressverzeichnis (swisstopo)"}

def name_suchen(name, ort):
    try: return _name_suchen(name[:80], ort[:40])
    except Exception: return {"koordinaten_quelle": "nicht gefunden – Lage zu prüfen", "lage_zu_pruefen": True}

def _name_suchen(name, ort):
    for q in (f"{name} {ort}", name):
        r = hole(f"{GEO}/SearchServer?" + urllib.parse.urlencode({"searchText": q, "type": "locations", "origins": "gazetteer", "limit": "5", "sr": "4326"}))["results"]
        for x in r:
            lab = re.sub("<[^>]+>", "", x["attrs"]["label"])
            if "areal" in lab.lower() and ort.split()[0].lower()[:5] in lab.lower():
                return {"lat": round(x["attrs"]["lat"], 6), "lon": round(x["attrs"]["lon"], 6), "koordinaten_quelle": "swissNAMES3D (Name)", "treffer": lab}
    r = hole(f"{GEO}/SearchServer?" + urllib.parse.urlencode({"searchText": ort, "type": "locations", "origins": "gg25,zipcode", "limit": "1", "sr": "4326"}))["results"]
    if r: return {"lat": round(r[0]["attrs"]["lat"], 6), "lon": round(r[0]["attrs"]["lon"], 6), "koordinaten_quelle": "Ortsmitte – Lage zu prüfen", "lage_zu_pruefen": True}
    return {}

def privatschulen():
    import pdfplumber, tempfile
    with urllib.request.urlopen(QUELLE_PRIVAT, timeout=120) as r: roh = r.read()
    f = tempfile.NamedTemporaryFile(suffix=".pdf"); f.write(roh); f.flush()
    pdf = pdfplumber.open(f.name)
    zeilen = [z.strip() for p in pdf.pages for z in (p.extract_text() or "").split("\n") if z.strip()]
    stand = next((z for z in zeilen[:12] if re.match(r"\d{1,2}\. \w+ \d{4}$", z)), None)
    schluessel = {"Schulstufen": "stufen", "Schwerpunkte, Art": "art", "Telefon, E-Mail": "kontakt", "Website": "website", "Standort(e)": "standorte", "Trägerschaft": "traegerschaft", "Verbindungen*": "verbindungen", "Leitung": None}
    out, akt, feld = [], None, None
    for i, z in enumerate(zeilen):
        if i + 1 < len(zeilen) and zeilen[i + 1].startswith("Schulstufen"):
            akt = {"name": z, "kategorie": "Privatschule"}; out.append(akt); feld = None; continue
        if akt is None: continue
        k = next((k for k in schluessel if z.startswith(k + " ") or z == k), None)
        if k:
            feld = schluessel[k]
            if feld: akt[feld] = z[len(k):].strip()
            continue
        if feld == "standorte" and re.search(r"\d{4} ", z): akt["standorte"] += "; " + z   # Fortsetzung mehrerer Standorte
        elif feld in ("art", "traegerschaft") and not re.match(r"^\d{4} ", z) and not z.startswith(("*", "Kanton", "Bildungsdirektion")): akt[feld] += " " + z
    res = []
    for a in out:
        tel, mail = None, None
        if a.get("kontakt"):
            m = re.match(r"([\d +]{9,}),?\s*(\S+@\S+)?", a["kontakt"]); tel = m[1].strip() if m else None; mail = m[2] if m and m[2] else None
        if mail and not mail_ok(mail): mail = None
        orte = [x.strip() for x in re.split(r";\s*", a.get("standorte", "")) if x.strip()]
        for j, ort in enumerate(orte or [""]):
            e = {"id": f"priv-{len(res) + 1:03d}", "name": a["name"] + (f" (Standort {j + 1})" if len(orte) > 1 else ""), "kategorie": "Privatschule",
                 "stufen_text": a.get("stufen"), "art": a.get("art"), "telefon": tel, "email": mail, "website": ("https://" + a["website"]) if a.get("website") and not a["website"].startswith("http") else a.get("website"),
                 "traegerschaft": a.get("traegerschaft"), "adresse": [x.strip() for x in ort.split(",")] if ort else [], "quelle": "Öffentliches Register Privatschulen, Volksschulamt" + (f", Stand {stand}" if stand else ""),
                 "stufe": "S" if a.get("stufen") and "Sekundar" in a["stufen"] and "Primar" not in a["stufen"] else "P" if a.get("stufen") and "Sekundar" not in a["stufen"] else "V"}
            g = adresse_suchen(ort) if ort else None
            e.update(g or {"lage_zu_pruefen": True})
            res.append(e)
    return res, stand

def sonderschulen():
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(hole(QUELLE_SONDER, roh=True), "html.parser")
    out = []
    for item in soup.select(".mdl-accordion__item"):
        bezirk = item.select_one("button").get_text(" ", strip=True)
        typ = None
        for el in item.select("h4, li"):
            if el.name == "h4": typ = el.get_text(" ", strip=True); continue
            t = el.get_text(" ", strip=True)
            if "Schulstufe" not in t: continue
            a = el.select_one("a"); name = a.get_text(" ", strip=True) if a else t.split(",")[0]
            m = re.search(r",\s*([^.]+?)\.\s*Schulstufen?:\s*(.*)$", t)
            ort, stufen = (m[1].strip(), m[2].strip()) if m else ("", "")
            out.append({"id": f"sond-{len(out) + 1:03d}", "name": name, "kategorie": "Sonderschule", "sonderschultyp": typ, "bezirk_liste": bezirk, "ort": ort, "stufen_text": stufen,
                        "website": a["href"] if a and a.get("href", "").startswith("http") else None, "quelle": "Volksschulamt, Sonderschulen nach Bezirk und Typ",
                        "stufe": "S" if stufen.strip() in ("Sekundarstufe",) else None})
    with ThreadPoolExecutor(8) as ex:
        for e, g in zip(out, ex.map(lambda e: name_suchen(e["name"], e["ort"]) if e["ort"] else {}, out)): e.update(g)
    return out

def sekundarstufe2():
    d = hole(f"{QUELLE_SEK2}?" + urllib.parse.urlencode({"SERVICE": "WFS", "VERSION": "2.0.0", "REQUEST": "GetFeature", "TYPENAMES": "ms:ogd-0600_giszhpub_mba_sekii_schulen_p",
                                                        "OUTPUTFORMAT": "geojson", "SRSNAME": "EPSG:4326"}))
    out = []
    for f in d["features"]:
        p = f["properties"]; lon, lat = f["geometry"]["coordinates"][:2]
        mail = p.get("kontakt_mail")
        out.append({"id": f"sek2-{p.get('geodb_oid')}", "name": p.get("schule_name"), "kategorie": "Sekundarstufe II / Tertiär", "schultyp": p.get("schule_typ"), "standort_typ": p.get("standort_typ"),
                    "adresse": [f"{(p.get('schule_strasse') or '').strip()} {p.get('schule_haus_nr') or ''}".strip(), f"{p.get('schule_plz') or ''} {p.get('schule_ort') or ''}".strip()],
                    "telefon": p.get("kontakt_tel"), "email": mail if mail and mail_ok(mail) else None, "website": p.get("web"), "lat": round(lat, 6), "lon": round(lon, 6),
                    "koordinaten_quelle": "Geodatensatz Schulen SekII (GIS-ZH Nr. 600)", "quelle": "Kanton Zürich, Geodatensatz «Schulen SekII» (OGD)"})
    return out

# ---------------------------------------------------------------- Hauptprogramm
def main():
    v = [personen_entfernen(zerlegen(o)) for o in verzeichnis()]
    with ThreadPoolExecutor(10) as ex: v = list(ex.map(adresse_pruefen, v))
    for i, o in enumerate(v): o["id"] = f"vsa-{o['vsa_nr'] or 'x'}-{i + 1:03d}"
    meta = {"stand": HEUTE, "quelle": QUELLE_ZH, "anzahl": len(v),
            "hinweis": "Schulträger der Volksschule gemäss Bildungsdirektion; Koordinaten aus dem Gebäudeadressverzeichnis (swisstopo), sonst aus dem Verzeichnis. Personendaten entfernt."}
    (ROOT / "data/schulverzeichnis.json").write_text(json.dumps({"meta": meta, "eintraege": v}, ensure_ascii=False, indent=1), encoding="utf-8")
    stk = schultraegerkarte()
    (ROOT / "data/schultraeger.json").write_text(json.dumps(stk, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"✓ Schulträgerkarte: {len(stk['traeger'])} Trägereinträge, {len(stk['zuordnung'])} Zuordnungen")
    sn = [x for x in swissnames() if x["kategorie"] in ("Volksschule", "Volksschule (zu prüfen)")]   # übrige Arten aus den amtlichen Listen
    sz = stadt_zuerich()
    pv, pv_stand = privatschulen(); so = sonderschulen(); s2 = sekundarstufe2()
    for liste in (pv, so):
        for e in liste:
            if e.get("lat"): e["bfs_nr"], e["gemeinde"], _ = gemeinde_an(e["lon"], e["lat"])
    for e in s2: e["bfs_nr"], e["gemeinde"], _ = gemeinde_an(e["lon"], e["lat"])
    sz = [x for x in sz if x["kategorie"] != "Sonderschule"] + [x for x in sz if x["kategorie"] == "Sonderschule"]
    sn = sn + pv + so + s2
    meta2 = {"stand": HEUTE, "quellen": ["swisstopo swissNAMES3D – Schul- und Hochschulareal (ohne Stadt Zürich)", "Stadt Zürich – Open Data Schulanlagen (WFS, CC0)",
                                         "Volksschulamt – Öffentliches Register Privatschulen" + (f" ({pv_stand})" if pv_stand else ""), "Volksschulamt – Sonderschulen nach Bezirk und Typ",
                                         "Kanton Zürich – Geodatensatz Schulen SekII (GIS-ZH Nr. 600)"],
             "hinweis": "Benannte Schulareale; nicht abschliessend (unbenannte Areale fehlen). Zuordnung zum Schulträger über Gemeinde und Stufe – hergeleitet."}
    (ROOT / "data/schulanlagen.json").write_text(json.dumps({"meta": meta2, "anlagen": sn + sz}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(v)} Schulträger-Einträge ({sum(1 for o in v if o.get('egid'))} mit EGID, {sum(1 for o in v if o['person_entfernt'] or o['email_entfernt'])} mit entfernten Personendaten)")
    print(f"✓ {len(sn)} Schulareale swissNAMES3D, {len(sz)} Anlagen Stadt Zürich – {collections.Counter(x['kategorie'] for x in sn + sz)}")

if __name__ == "__main__":
    main()
