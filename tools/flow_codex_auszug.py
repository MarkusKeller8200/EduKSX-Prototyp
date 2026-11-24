#!/usr/bin/env python3
"""Auszug aus EduKSX-Codex für EduKSX-Flow erzeugen.

Ordnet jede Quelle im Quellenverzeichnis von Flow (prototypen/ablaufplanung/assets/vorlagen.js) dem Erlass in der
Rechtssammlung (prototypen/rechtssammlung/data) zu – über die Ordnungsnummer (LS bzw. SR) – und schreibt die
aktuelle Fassung als statischen Auszug nach prototypen/ablaufplanung/assets/codex-auszug.js.

Die Prototypen bleiben zur Laufzeit unabhängig (AGENTS.md): Flow liest nur den erzeugten Auszug, keinen Code und
keine Dateien der Rechtssammlung. Im Betrieb ersetzt die Codex-API diesen Auszug (Konzept Flow, Abschnitt 8).

Aufruf: python3 tools/flow_codex_auszug.py [--pruefen]   (--pruefen: nur vergleichen, Exit 1 wenn veraltet)
"""
import json
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
FLOW = WURZEL / "prototypen/ablaufplanung"
CODEX = WURZEL / "prototypen/rechtssammlung/data"
ZIEL = FLOW / "assets/codex-auszug.js"

# Quellen ohne Ordnungsnummer: Merkblätter und Arbeitshilfen von Behörden bzw. schuleigene Unterlagen.
INTERN = {"FD", "Prozessliste", "Jahresplanung ICT", "Master-Checkliste", "Jahreskalender ICT", "Ferienplan"}


def quellenverzeichnis():
    text = (FLOW / "assets/vorlagen.js").read_text(encoding="utf-8")
    block = text.split("D.QUELLENVERZEICHNIS = {", 1)[1].split("};", 1)[0]
    return dict(re.findall(r'^\s*"([^"]+)": \["([^"]+)"', block, re.M))


def iso(ddmmyyyy):
    t, m, j = ddmmyyyy.split(".")
    return f"{j}-{m}-{t}"


def auszug():
    rg = json.loads((CODEX / "rechtsgrundlagen.json").read_text(encoding="utf-8"))
    zh = json.loads((CODEX / "raw/zhlex-versionen.json").read_text(encoding="utf-8"))
    fed = json.loads((CODEX / "raw/fedlex-versionen.json").read_text(encoding="utf-8"))
    erlasse = {}
    for key, titel in quellenverzeichnis().items():
        m = re.search(r"\b(LS|SR) ([\d.]+)", titel)
        if not m:
            erlasse[key] = {"art": "intern" if key in INTERN else "merkblatt"}
            continue
        samml, nr = m.groups()
        eintr = [e for e in rg["eintraege"] if re.search(rf"\b{samml} {re.escape(nr)}(?![\d.])", e["erlass"])]
        e = {"art": "erlass", "ordnungsnummer": f"{samml} {nr}", "rechtsgrundlagen": [{"nr": x["nr"], "stelle": x["stelle"], "relevanz": x["relevanz"]} for x in eintr]}
        if samml == "LS" and nr in zh:
            z = zh[nr]
            v = [x.split("|") for x in z["v"] if x.split("|")[1] != "-"]
            aktuell = next((x for x in v if not x[2]), v[0])
            ed, ik = (aktuell[3], aktuell[4]) if len(aktuell) > 3 else (z["e"], z["i"])
            ymd = lambda d: "_".join(reversed(d.split("."))) if d and d != "-" else ""
            # gleiche Linkbildung wie die Rechtssammlung (tools/build.py, zhlex_versionen); doppelte Nachträge zählen einmal
            anzahl = len({(x.split("|")[0], x.split("|")[3] if x.count("|") > 2 else z["e"]) for x in z["v"]})
            e.update(titel=z["t"], sammlung="ZH-Lex", fassung=f"Nachtrag {aktuell[0]}", publiziert=iso(aktuell[1]), fassungen=anzahl,
                     url=f"https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung/zhlex-ls/erlass-{nr.replace('.', '_')}-{ymd(ed)}-{ymd(ik)}-{aktuell[0]}.html")
        elif samml == "SR" and nr in fed:
            f = fed[nr]
            stand = f["v"][-1][0]
            e.update(titel=f["k"], sammlung="Fedlex", fassung=f"Stand {stand[6:8]}.{stand[4:6]}.{stand[:4]}", publiziert=f"{stand[:4]}-{stand[4:6]}-{stand[6:8]}",
                     fassungen=len(f["v"]), url=f"https://www.fedlex.admin.ch/eli/cc/{f['eli']}/de")
        erlasse[key] = e
    return {"stand": rg["stand"], "herkunft": "Auszug aus dem Prototyp EduKSX-Codex (Rechtssammlung): Rechtsgrundlagen Volksschule und Fassungen aus ZH-Lex/Fedlex", "erlasse": erlasse}


def main():
    a = auszug()
    inhalt = ("/* Erzeugt mit tools/flow_codex_auszug.py – nicht von Hand ändern. Im Betrieb liefert EduKSX-Codex diese Angaben über die API. */\n"
              f"window.FLOW_CODEX_AUSZUG = {json.dumps(a, ensure_ascii=False, indent=1)};\n")
    if "--pruefen" in sys.argv:
        ok = ZIEL.exists() and ZIEL.read_text(encoding="utf-8") == inhalt
        print("✓ Codex-Auszug aktuell" if ok else "✗ Codex-Auszug veraltet: python3 tools/flow_codex_auszug.py")
        sys.exit(0 if ok else 1)
    ZIEL.write_text(inhalt, encoding="utf-8")
    e = a["erlasse"].values()
    print(f"{ZIEL.relative_to(WURZEL)}: {sum(x['art'] == 'erlass' for x in e)} Erlasse "
          f"({sum(bool(x.get('fassung')) for x in e)} mit Fassung, {sum(bool(x.get('rechtsgrundlagen')) for x in e)} in den Rechtsgrundlagen), "
          f"{sum(x['art'] == 'merkblatt' for x in e)} Merkblätter, {sum(x['art'] == 'intern' for x in e)} interne Unterlagen")


if __name__ == "__main__":
    main()
