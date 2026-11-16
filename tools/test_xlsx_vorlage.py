"""Tests für prototypen/einsatzplanung/assets/xlsx-vorlage.js und vze-tool.js (über Node, falls vorhanden).

Eine kleine, selbst erzeugte Excel-Datei mit Blattschutz-Formaten (gesperrt/offen) wird befüllt; geprüft wird:
nur Eingabezellen werden geschrieben, Formatierung (s=…) bleibt, unveränderte ZIP-Einträge bleiben Byte für Byte
gleich, Excel rechnet beim Öffnen neu. Echte VZE-Tools des VSA gehören nicht ins Repository.
"""
import json
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "prototypen" / "einsatzplanung" / "assets"
NODE = shutil.which("node")

WORKBOOK = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>
<sheet name="Eingabe" sheetId="1" r:id="rId1"/><sheet name="intern" sheetId="2" state="veryHidden" r:id="rId2"/>
<sheet name="001  Test" sheetId="3" r:id="rId3"/></sheets><calcPr calcId="191028"/></workbook>"""
RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>"""
STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="1" borderId="0" xfId="0" applyProtection="1"><protection locked="0"/></xf>
<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>"""
SST = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="4" uniqueCount="4"><si><t>VSA 2.19</t></si><si><t>Musterhausen</t></si><si><t>Test</t></si><si><t>Alt</t></si></sst>"""
def blatt(zeilen):
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
            + zeilen + "</sheetData></worksheet>")
EINGABE = blatt('<row r="2"><c r="A2" t="inlineStr"><is><t>Eingabe der Lehrerstellen für das Schuljahr 2026/27</t></is></c></row>')
INTERN = blatt('<row r="1"><c r="C1" t="s"><v>0</v></c></row><row r="2"><c r="C2" t="s"><v>1</v></c></row>'
               '<row r="3"><c r="C3" t="inlineStr"><is><t>X99</t></is></c></row>'
               '<row r="36"><c r="C36"><v>1</v></c><c r="D36" t="s"><v>2</v></c></row>')
SE = blatt('<row r="27"><c r="B27" s="1"/><c r="D27" s="1" t="s"><v>3</v></c><c r="N27" s="1"/><c r="W27" s="2"><f>SUM(F27:V27)</f><v>0</v></c></row>'
           '<row r="28"><c r="D28" s="1"><v>5</v></c></row>')


def mappe(pfad: Path):
    with zipfile.ZipFile(pfad, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        z.writestr("xl/workbook.xml", WORKBOOK)
        z.writestr("xl/_rels/workbook.xml.rels", RELS)
        z.writestr("xl/styles.xml", STYLES)
        z.writestr("xl/sharedStrings.xml", SST)
        z.writestr("xl/worksheets/sheet1.xml", EINGABE)
        z.writestr("xl/worksheets/sheet2.xml", INTERN)
        z.writestr("xl/worksheets/sheet3.xml", SE)


SKRIPT = """
const X = require(process.argv[2] + '/xlsx-vorlage.js'); const V = require(process.argv[2] + '/vze-tool.js');
const fs = require('fs');
(async () => {
  const m = await X.Mappe.oeffnen(fs.readFileSync(process.argv[3]));
  const a = await V.analysieren(m);
  const se = a.schuleinheiten[0];
  const { zellen } = V.belegung(a.version, se, { klassen: [{ name: '1A', jahrgang: 1, abteilung: 'A', schueler: 21, klp: 'Lea <Muster> & Co', lektionen: 38 }] });
  const fehler = await m.schreiben(se.blatt, [{ ref: 'W27', wert: 9 }, { ref: 'D28', wert: null }]);
  const r = await V.ausfuellen(m, a.version, se, zellen.filter((z) => z.blatt === se.blatt), { leeren: false });
  fs.writeFileSync(process.argv[4], r.bytes);
  console.log(JSON.stringify({ analyse: a, fehler: fehler.concat(r.fehler), zellen: zellen.map((z) => z.blatt + '!' + z.ref) }));
})().catch((e) => { console.error(e); process.exit(1); });
"""


@unittest.skipUnless(NODE, "Node.js nicht vorhanden")
class XlsxVorlage(unittest.TestCase):
    def test_befuellen(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            ein, aus = tmp / "ein.xlsx", tmp / "aus.xlsx"
            mappe(ein)
            (tmp / "t.js").write_text(SKRIPT, encoding="utf-8")
            erg = subprocess.run([NODE, str(tmp / "t.js"), str(ASSETS), str(ein), str(aus)], capture_output=True, text=True, check=True)
            info = json.loads(erg.stdout)
            a = info["analyse"]
            self.assertEqual((a["version"], a["bekannt"], a["schuljahr"], a["gemeinde"], a["nummer"]), ("VSA 2.19", True, "2026/27", "Musterhausen", "X99"))
            self.assertEqual(a["schuleinheiten"][0]["blatt"], "001  Test")
            self.assertIn("001  Test!W27: gesperrte Zelle – nicht geschrieben", info["fehler"])
            self.assertIn("001  Test!N27", info["zellen"])
            with zipfile.ZipFile(ein) as z1, zipfile.ZipFile(aus) as z2:
                self.assertEqual(z1.namelist(), z2.namelist())
                geaendert = [n for n in z1.namelist() if z1.read(n) != z2.read(n)]
                self.assertEqual(sorted(geaendert), ["xl/workbook.xml", "xl/worksheets/sheet3.xml"])
                se = z2.read("xl/worksheets/sheet3.xml").decode()
                wb = z2.read("xl/workbook.xml").decode()
            self.assertIn('fullCalcOnLoad="1"', wb)
            self.assertIn('<c r="N27" s="1"><v>21</v></c>', se)
            self.assertIn('<c r="D27" s="1" t="inlineStr"><is><t xml:space="preserve">Lea &lt;Muster&gt; &amp; Co</t></is></c>', se)
            self.assertIn('<c r="B27" s="1" t="inlineStr"><is><t xml:space="preserve">001  Test</t></is></c>', se)
            self.assertIn('<c r="D28" s="1"/>', se)
            self.assertIn('<c r="W27" s="2"><f>SUM(F27:V27)</f><v>0</v></c>', se)
        finally:
            shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
