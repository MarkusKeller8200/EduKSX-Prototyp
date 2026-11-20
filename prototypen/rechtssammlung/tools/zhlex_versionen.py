#!/usr/bin/env python3
"""EduKSX-Codex – Fassungen (Nachträge) kantonaler Erlasse aus ZH-Lex abgleichen.

Liest je Ordnungsnummer die geltende Fassung über die ZH-Lex-Suche, die «Historie Nachtragsnr.» und je Fassung
Erlass-, Inkraftsetzungs-, Aufhebungs- und Publikationsdatum. Ergebnis in data/raw/zhlex-versionen.json
(gleiches kompaktes Format wie der erste Abruf vom 20.11.2026). Bestehende Einträge werden ersetzt, andere bleiben.

    python3 tools/zhlex_versionen.py 132.1 132.11 611
"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
ZIEL = ROOT / "data" / "raw" / "zhlex-versionen.json"
BASIS = "https://www.zh.ch"
SUCHE = "/de/politik-staat/gesetze-beschluesse/gesetzessammlung/_jcr_content/main/lawcollectionsearch_312548694.zhweb-zhlex-ls.zhweb-cache.json"

def holen(pfad):
    for n in range(3):
        try:
            req = urllib.request.Request(BASIS + pfad if pfad.startswith("/") else pfad, headers={"User-Agent": "EduKSX-Codex-Prototyp (Versionsabgleich)"})
            return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
        except Exception:
            if n == 2: raise
            time.sleep(2 + 3 * n)

def felder(html):
    main = BeautifulSoup(html, "html.parser").find("main")
    zeilen = main.get_text("\n", strip=True).split("\n")
    def f(k):
        try: return zeilen[zeilen.index(k) + 1].strip()
        except ValueError: return ""
    hist = [(a.get_text(" ", strip=True), a["href"]) for a in main.find_all("a", href=True)
            if "/zhlex-ls/erlass-" in a["href"] and "(" in a.get_text()]
    return {"titel": f("Erlasstitel"), "erlassdatum": f("Erlassdatum"), "inkraft": f("Inkraftsetzungsdatum"),
            "aufhebung": f("Aufhebungsdatum"), "publikation": f("Publikationsdatum"), "hist": hist}

def abrufen(nr):
    j = json.loads(holen(SUCHE + "?" + urllib.parse.urlencode({"referenceNumber": nr, "page": 1})))
    treffer = [x for x in j["data"] if x["referenceNumber"] == nr]
    hit = next((x for x in treffer if not x["withdrawalDate"]), treffer[0] if treffer else None)
    if not hit: raise SystemExit(f"LS {nr}: kein Treffer in ZH-Lex")
    akt = felder(holen(hit["link"]))
    e0, i0, v = akt["erlassdatum"], akt["inkraft"], []
    for text, href in akt["hist"]:
        x = felder(holen(href)); time.sleep(0.2)
        z = [text.split(" ")[0], x["publikation"], "" if x["aufhebung"] == "-" else x["aufhebung"]]
        if x["erlassdatum"] != e0 or x["inkraft"] != i0: z += [x["erlassdatum"], x["inkraft"]]
        v.append("|".join(z))
    return {"t": akt["titel"], "e": e0, "i": i0, "v": v}

def main(nrs):
    daten = json.loads(ZIEL.read_text(encoding="utf-8"))
    for nr in nrs:
        print("ZH-Lex LS", nr, end=" … ", flush=True)
        daten[nr] = abrufen(nr)
        print(len(daten[nr]["v"]), "Fassungen –", daten[nr]["t"])
    ZIEL.write_text("{" + ",\n".join(json.dumps(k, ensure_ascii=False) + ":" + json.dumps(v, ensure_ascii=False, separators=(",", ":")) for k, v in daten.items()) + "\n}\n", encoding="utf-8")

if __name__ == "__main__":
    main(sys.argv[1:])
