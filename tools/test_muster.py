"""Anonymisierte Muster-Dateien (prototypen/*/muster/*.xlsx) dürfen keine Namen echter Schulen, Personen oder
Pfade enthalten. Neue Begriffe hier ergänzen, bevor ein weiteres Muster abgelegt wird."""
import re
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERBOTEN = ["Bülach", "Buelach", "B&#252;lach", "Hinterbirch", "Mettmenriet", "Stricker", "Heiniger", "Zolliker", "L04", "absPath", "C:\\Users"]


class Muster(unittest.TestCase):
    def test_anonymisiert(self):
        for datei in sorted(ROOT.glob("prototypen/*/muster/*.xlsx")):
            with zipfile.ZipFile(datei) as z:
                inhalt = b"".join(z.read(n) for n in z.namelist())
                core = z.read("docProps/core.xml").decode("utf-8") if "docProps/core.xml" in z.namelist() else ""
            for wort in VERBOTEN:
                with self.subTest(datei=datei.name, wort=wort):
                    self.assertNotIn(wort.encode("utf-8"), inhalt)
            with self.subTest(datei=datei.name, feld="Autor"):
                self.assertFalse(re.search(r"<dc:creator>[^<]+</dc:creator>|<cp:lastModifiedBy>[^<]+</cp:lastModifiedBy>", core))


if __name__ == "__main__":
    unittest.main()
