"""Tests für tools/pruefen.py und tools/neuer_prototyp.py (python3 -m unittest discover -s tools)."""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import neuer_prototyp  # noqa: E402
import pruefen  # noqa: E402


class Vorlage(unittest.TestCase):
    def test_vorlage_ist_gueltig(self):
        self.assertEqual(pruefen.pruefe_prototyp(pruefen.PROTOTYPEN / pruefen.VORLAGE), [])


class Anlegen(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(dir=pruefen.PROTOTYPEN.parent))
        shutil.copytree(pruefen.PROTOTYPEN / pruefen.VORLAGE, self.tmp / pruefen.VORLAGE)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_html_prototyp(self):
        ziel = neuer_prototyp.anlegen("stundenplan-raster", "Stundenplan-Raster", "html", "EduKSX-Time", "", self.tmp)
        daten = json.loads((ziel / "prototyp.json").read_text(encoding="utf-8"))
        self.assertEqual(daten["name"], "Stundenplan-Raster")
        self.assertEqual(daten["modul"], "EduKSX-Time")
        self.assertIn("Stundenplan-Raster", (ziel / "index.html").read_text(encoding="utf-8"))
        self.assertEqual(pruefen.pruefe_prototyp(ziel), [])

    def test_laravel_ohne_index(self):
        ziel = neuer_prototyp.anlegen("api-versuch", "API-Versuch", "laravel", "", "Test", self.tmp)
        self.assertFalse((ziel / "index.html").exists())
        self.assertEqual(pruefen.pruefe_prototyp(ziel), [])

    def test_ungueltiger_name(self):
        with self.assertRaises(ValueError):
            neuer_prototyp.anlegen("Mein Prototyp", "x", "html", "", "", self.tmp)

    def test_kein_ueberschreiben(self):
        neuer_prototyp.anlegen("doppelt", "Doppelt", "html", "", "", self.tmp)
        with self.assertRaises(FileExistsError):
            neuer_prototyp.anlegen("doppelt", "Doppelt", "html", "", "", self.tmp)

    def test_fehler_werden_gemeldet(self):
        ziel = neuer_prototyp.anlegen("kaputt", "Kaputt", "html", "", "", self.tmp)
        (ziel / "prototyp.json").write_text('{"name": "x", "version": "abc", "status": "fertig"}', encoding="utf-8")
        fehler = " ".join(pruefen.pruefe_prototyp(ziel))
        for teil in ("«version» ungültig", "«status»", "«technik» fehlt", "«beschreibung» fehlt"):
            self.assertIn(teil, fehler)


class Readme(unittest.TestCase):
    def test_block_ersetzen(self):
        text = f"a\n{pruefen.START}\nalt\n{pruefen.ENDE}\nb"
        self.assertEqual(pruefen.readme_block(text, "neu"), f"a\n{pruefen.START}\nneu\n{pruefen.ENDE}\nb")
        self.assertIsNone(pruefen.readme_block("ohne", "neu"))


if __name__ == "__main__":
    unittest.main()
