"""Kontrastprüfung (WCAG 2.1 AA) der Farbwerte nach CI MarKusSXCH in allen Prototypen (assets/eduksx.css) und der Einstiegsseite (seite/eduksx.css).

Text ≥ 4.5 : 1, Fokus/Linien ≥ 3 : 1 – hell (:root) und dunkel (.dark). Gleiche Paare wie in EduKSX-Glossary.
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT = [
    ("foreground", "background"), ("foreground", "card"), ("muted-foreground", "background"), ("muted-foreground", "muted"),
    ("primary-foreground", "primary"), ("secondary-foreground", "secondary"), ("accent-foreground", "accent"),
    ("link", "background"), ("link", "card"), ("success", "success-soft"), ("warning", "warning-soft"),
    ("destructive", "destructive-soft"), ("info", "info-soft"), ("violet-text", "violet-soft"),
]
LINIE = [("ring", "background"), ("brand-blue", "muted")]


def werte(css: str, selektor: str) -> dict:
    block = re.search(re.escape(selektor) + r"\s*\{(.*?)\n\}", css, re.S).group(1)
    return {k: v.lower() for k, v in re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]{6})", block)}


def luminanz(hexwert: str) -> float:
    kanaele = [int(hexwert[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in kanaele]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def kontrast(a: str, b: str) -> float:
    la, lb = sorted((luminanz(a), luminanz(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


class Kontrast(unittest.TestCase):
    def test_farbpaare(self):
        dateien = sorted(list(ROOT.glob("prototypen/*/assets/eduksx.css")) + list(ROOT.glob("seite/eduksx.css")))
        for datei in dateien:
            css = datei.read_text(encoding="utf-8")
            hell = werte(css, ":root")
            dunkel = {**hell, **werte(css, ".dark")}
            for name, farben in (("hell", hell), ("dunkel", dunkel)):
                for paare, minimum in ((TEXT, 4.5), (LINIE, 3.0)):
                    for vg, hg in paare:
                        with self.subTest(datei=str(datei.relative_to(ROOT)), modus=name, paar=f"{vg}/{hg}"):
                            self.assertGreaterEqual(round(kontrast(farben[vg], farben[hg]), 2), minimum)


if __name__ == "__main__":
    unittest.main()
