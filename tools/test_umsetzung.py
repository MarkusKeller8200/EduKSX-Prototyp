"""Prüft die Umsetzungsgrundlagen in docs/umsetzung/ (python3 -m unittest discover -s tools).

- Jedes Modul hat datenbank.sql, openapi.json/.yaml und PFLICHTENHEFT.md; erzeugte Teile sind aktuell
  (tools/umsetzung_bauen.py).
- datenbank.sql nach DB-Standard 1.3: englische Namen, deutsche Beschreibung je Tabelle/Spalte/Wert, Geltungsbereich und
  Datenklasse; organization_id genau bei Geltungsbereich Organisation und persönlich.
- openapi.json nach API-Standard 1.2: /api/v1, operationId eindeutig, title/description deutsch, $ref lösen auf.
- PFLICHTENHEFT.md: enthält die fünf Teile und verweist auf die gemeinsamen Prüfpunkte.
"""
import json
import re
import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from umsetzung import modell, openapi  # noqa: E402

UMSETZUNG = Path(__file__).resolve().parent.parent / "docs" / "umsetzung"
MODULE = ["staffing", "flow", "codex", "sign", "time", "ai"]
TEILE = ["## 1. Zweck und Abgrenzung", "## 2. Anforderungskatalog", "## 3. Pflichtenheft",
         "## 4. Prüfpunkte für die produktive Umsetzung", "## 5. Offene Punkte"]


def lesen(modul: str):
    sql = (UMSETZUNG / modul / "datenbank.sql").read_text(encoding="utf-8")
    return sql, modell.lesen(sql, sql.find("-- >>> standardtabellen"), sql.find("-- <<< standardtabellen"))


class Dateien(unittest.TestCase):
    def test_vollstaendig(self):
        for modul in MODULE:
            for datei in ("datenbank.sql", "openapi.json", "openapi.yaml", "PFLICHTENHEFT.md"):
                self.assertTrue((UMSETZUNG / modul / datei).is_file(), f"{modul}/{datei} fehlt")
        self.assertTrue((UMSETZUNG / "standardtabellen.sql").is_file())

    def test_aktuell(self):
        import umsetzung_bauen
        self.assertEqual(umsetzung_bauen.main(["--pruefen"]), 0, "→ python3 tools/umsetzung_bauen.py")


class Datenbank(unittest.TestCase):
    def test_standard(self):
        for modul in MODULE:
            with self.subTest(modul=modul):
                sql, tabellen = lesen(modul)
                self.assertIn(f"CREATE SCHEMA IF NOT EXISTS {modul};", sql)
                self.assertIn(f"SET search_path TO {modul};", sql)
                self.assertTrue([t for t in tabellen if not t.standardtabelle and not t.ansicht], "keine Tabellen erkannt")
                self.assertEqual(modell.maengel(tabellen), [])
                self.assertEqual(sql.count("CREATE TABLE"), sum(1 for t in tabellen if not t.ansicht), "CREATE TABLE nicht erkannt")

    def test_mandant(self):
        for modul in MODULE:
            for t in lesen(modul)[1]:
                if t.ansicht or t.standardtabelle:
                    continue
                with self.subTest(modul=modul, tabelle=t.name):
                    namen = {s.name for s in t.spalten}
                    if t.geltung == "global":
                        self.assertNotIn("organization_id", namen)
                    else:
                        self.assertIn("organization_id", namen)
                    self.assertNotIn("mandant_id", namen)

    def test_keine_float(self):
        for modul in MODULE:
            self.assertNotRegex(lesen(modul)[0], r"\b(float|real|double precision)\b", f"{modul}: Gleitkommazahl statt numeric")


class Api(unittest.TestCase):
    def test_openapi(self):
        for modul in MODULE:
            with self.subTest(modul=modul):
                doc = json.loads((UMSETZUNG / modul / "openapi.json").read_text(encoding="utf-8"))
                self.assertEqual(doc["openapi"], "3.1.0")
                self.assertTrue(doc["info"]["title"].startswith("EduKSX-"))
                self.assertEqual(doc["info"]["x-eduksx-module"], modul)
                self.assertEqual(openapi.maengel(doc), [])
                text = json.dumps(doc)
                for art, name in set(re.findall(r'"\$ref": "#/components/(\w+)/(\w+)"', text)):
                    self.assertIn(name, doc["components"].get(art, {}), f"$ref {art}/{name} fehlt")
                ids = []
                for pfad, eintrag in doc["paths"].items():
                    self.assertTrue(pfad.startswith("/api/v1/"), pfad)
                    for methode, op in eintrag.items():
                        if methode == "parameters":
                            continue
                        self.assertTrue(op.get("responses"), f"{methode} {pfad} ohne Antworten")
                        ids.append(op["operationId"])
                self.assertEqual(len(ids), len(set(ids)), "operationId doppelt")


class Entwicklerbereich(unittest.TestCase):
    """prototypen/<name>/entwickler/ ist aus docs/umsetzung/ erzeugt und aktuell (tools/entwickler_bauen.py)."""

    def test_aktuell(self):
        import entwickler_bauen
        self.assertEqual(entwickler_bauen.bauen(None, pruefen=True), [], "→ python3 tools/entwickler_bauen.py")

    def test_inhalt(self):
        import entwickler_bauen
        for modul, (ordner, _) in entwickler_bauen.MODULE.items():
            ziel = UMSETZUNG.parent.parent / "prototypen" / ordner / "entwickler"
            index = (ziel / "index.html").read_text(encoding="utf-8")
            for t in lesen(modul)[1]:
                if not t.ansicht:
                    self.assertIn(f'id="t-{t.name}"', index, f"{ordner}: Tabelle {t.name} fehlt im Datenmodell")
            api = (ziel / "api.html").read_text(encoding="utf-8")
            self.assertNotIn('<div id="api-reference"', api, "Scalar würde sonst zusätzlich mit Standardwerten laden")
            self.assertIn("withDefaultFonts: false", api)
            self.assertIn("supportedSubmitMethods: []", (ziel / "swagger.html").read_text(encoding="utf-8"))


class Pflichtenheft(unittest.TestCase):
    def test_teile(self):
        for modul in MODULE:
            text = (UMSETZUNG / modul / "PFLICHTENHEFT.md").read_text(encoding="utf-8")
            for teil in TEILE:
                self.assertIn(teil, text, f"{modul}: «{teil}» fehlt")
            self.assertIn("../README.md#4-gemeinsame-prüfpunkte-alle-module", text, modul)

    def test_readme_anker(self):
        self.assertIn("## 4. Gemeinsame Prüfpunkte (alle Module)", (UMSETZUNG / "README.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
