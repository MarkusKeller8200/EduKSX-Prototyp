"""Prüft die Umsetzungsgrundlagen in docs/umsetzung/ (python3 -m unittest discover -s tools).

- Jedes Modul hat datenbank.sql, openapi.yaml und PFLICHTENHEFT.md.
- datenbank.sql: legt nur Tabellen im eigenen Schema an; jede Tabelle hat mandant_id.
- openapi.yaml: OpenAPI 3.1, alle internen $ref lösen auf, jede Operation hat operationId und Antworten
  (nur wenn PyYAML installiert ist).
- PFLICHTENHEFT.md: enthält die fünf Teile und verweist auf die gemeinsamen Prüfpunkte.
"""
import re
import unittest
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover - CI ohne PyYAML
    yaml = None

sys.path.insert(0, str(Path(__file__).resolve().parent))
UMSETZUNG = Path(__file__).resolve().parent.parent / "docs" / "umsetzung"
MODULE = {"staffing": "staffing", "flow": "flow", "codex": "codex", "sign": "sign", "time": "time"}
TEILE = ["## 1. Zweck und Abgrenzung", "## 2. Anforderungskatalog", "## 3. Pflichtenheft",
         "## 4. Prüfpunkte für die produktive Umsetzung", "## 5. Offene Punkte"]


def tabellen(sql: str):
    """Liefert (schema, tabelle, rumpf) je CREATE TABLE."""
    for m in re.finditer(r"CREATE TABLE (\w+)\.(\w+) \((.*?)\n\);", sql, re.S):
        yield m.group(1), m.group(2), m.group(3)


class Dateien(unittest.TestCase):
    def test_vollstaendig(self):
        for modul in MODULE:
            for datei in ("datenbank.sql", "openapi.yaml", "PFLICHTENHEFT.md"):
                self.assertTrue((UMSETZUNG / modul / datei).is_file(), f"{modul}/{datei} fehlt")
        self.assertTrue((UMSETZUNG / "core-referenz.sql").is_file())


class Datenbank(unittest.TestCase):
    def test_schema_und_mandant(self):
        for modul, schema in MODULE.items():
            sql = (UMSETZUNG / modul / "datenbank.sql").read_text(encoding="utf-8")
            self.assertIn(f"CREATE SCHEMA IF NOT EXISTS {schema};", sql, modul)
            gefunden = list(tabellen(sql))
            self.assertTrue(gefunden, f"{modul}: keine Tabellen erkannt")
            for s, t, rumpf in gefunden:
                with self.subTest(modul=modul, tabelle=t):
                    self.assertEqual(s, schema, f"{t} liegt nicht im Schema {schema}")
                    self.assertRegex(rumpf, r"\bmandant_id\s+uuid\b", f"{s}.{t} ohne mandant_id")
            self.assertEqual(sql.count("CREATE TABLE"), len(gefunden), f"{modul}: CREATE TABLE nicht im erwarteten Format")

    def test_keine_float(self):
        for modul in MODULE:
            sql = (UMSETZUNG / modul / "datenbank.sql").read_text(encoding="utf-8")
            self.assertNotRegex(sql, r"\b(float|real|double precision)\b", f"{modul}: Gleitkommazahl statt numeric")


@unittest.skipUnless(yaml, "PyYAML nicht installiert")
class Api(unittest.TestCase):
    def test_openapi(self):
        for modul in MODULE:
            with self.subTest(modul=modul):
                doc = yaml.safe_load((UMSETZUNG / modul / "openapi.yaml").read_text(encoding="utf-8"))
                self.assertEqual(doc["openapi"], "3.1.0")
                self.assertTrue(doc["info"]["title"].startswith("EduKSX-"))
                text = yaml.safe_dump(doc)
                for ref in set(re.findall(r"\$ref: '?#/components/(\w+)/(\w+)'?", text)):
                    self.assertIn(ref[1], doc["components"].get(ref[0], {}), f"{modul}: $ref {ref} fehlt")
                ids = []
                for pfad, eintrag in doc["paths"].items():
                    self.assertTrue(pfad.startswith("/v1/"), f"{modul}: {pfad} ohne /v1/")
                    for methode, op in eintrag.items():
                        if methode == "parameters":
                            continue
                        self.assertIn("operationId", op, f"{modul}: {methode} {pfad}")
                        self.assertTrue(op.get("responses"), f"{modul}: {methode} {pfad} ohne Antworten")
                        ids.append(op["operationId"])
                self.assertEqual(len(ids), len(set(ids)), f"{modul}: operationId doppelt")


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
            sql = (UMSETZUNG / modul / "datenbank.sql").read_text(encoding="utf-8")
            for s, t, _ in tabellen(sql):
                self.assertIn(f'id="t-{s}-{t}"', index, f"{ordner}: Tabelle {t} fehlt im Datenmodell")
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
