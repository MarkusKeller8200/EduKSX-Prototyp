# Quellen für EduKSX-Codex

Öffentliche Grundlagen des Kantons Zürich, abgelegt für die Arbeit am Prototyp (Stand 17.11.2026).

| Datei | Inhalt | Herkunft |
|---|---|---|
| `leitfaden_systematische_rechtssammlung.docx` | Leitfaden zum Aufbau einer systematischen Rechtssammlung, Gemeindeamt Kanton Zürich mit VZGV, Juni 2018, Ergänzung Februar 2019 – unverändertes Original | https://www.zh.ch/de/politik-staat/gemeinden/gemeindeorganisation.html › Systematische Rechtssammlung › «Download Leitfaden systematische Rechtssammlung» |
| `leitfaden_systematische_rechtssammlung.pdf` | Dieselbe Datei als PDF für die Online-Vorschau (mit LibreOffice umgewandelt, Metadaten neutralisiert) | erzeugt aus der DOCX |

- Original geprüft: identisch mit der Datei auf zh.ch (86 516 Bytes, Server-Datum 14.10.2025),
  SHA-256 `c8718a61c76a406025841c58a755517722555d18b38010960a424d3a321a75f7`.
- Kantonale Rechtsgrundlagen (nicht abgelegt, nur verlinkt; jeweils aktuelle Version in ZH-Lex):
  - Gemeindegesetz (GG), LS 131.1, § 7 Abs. 2 – Pflicht zur systematischen Rechtssammlung:
    http://www.zhlex.zh.ch/Erlass.html?Open&Ordnr=131.1
  - Gemeindeverordnung (VGG), LS 131.11, § 2 – Inhalt und Aufbau der Rechtssammlung:
    http://www.zhlex.zh.ch/Erlass.html?Open&Ordnr=131.11
  - Zürcher Gesetzessammlung (Loseblattsammlung LS, 14 Ordner nach Sachgebieten):
    https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung.html#zhlex_ls
- Prüfregeln, die aus dem Leitfaden abgeleitet sind, stehen in `tools/build.py` (Abschnitt «Leitfaden-Prüfung»).
