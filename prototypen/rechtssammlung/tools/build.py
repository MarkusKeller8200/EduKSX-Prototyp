#!/usr/bin/env python3
"""EduKSX-Codex Prototyp 0.1.0 – Generator.

Liest die erfassten Rechtssammlungen (Stand 17.11.2026), normalisiert sie in ein
gemeinsames Datenmodell (data/rechtssammlungen.json) und erzeugt:
  - demo/<id>.html   je eine repräsentative Seite im Stil der Original-Website
  - index.html       Übersicht / Evaluation (EduKSX-Label)
  - docs/evaluation.md
Aufruf:  python3 prototypen/rechtssammlung/tools/build.py
"""
import json, csv, html, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STAND = "17.11.2026"
esc = html.escape

# ---------------------------------------------------------------- Rohdaten
def doc(titel, url, **meta):
    return {"titel": titel, "url": url, **meta}

# --- Politische Gemeinde Trüllikon (i-web, flache DataTable) ---
PGT_BASE = "https://www.truellikon.ch/_doc/"
pgt_raw = [
 ("1- Entschädigungsverordnung EVO",5751847,"43 kB"),("1- Gemeindeordnung",5751850,"6.77 MB"),
 ("1- Geschäftsordnung des Gemeinderats vom 18.08.2026",7193332,"233 kB"),("1- Statuten GVP",5751856,"37 kB"),
 ("1- Statuten GVPA",5751859,"243 kB"),("1- Personalverordnung",5751862,"48 kB"),
 ("2 - Anschlussvertrag Kindes- und Erwachsenenschutzkreis Winterthur-Andelfingen",5751865,"9.31 MB"),
 ("2 - Vertrag über die Zusammenarbeit der Gemeinden im Betreibungskreis Andelfingen",5751868,"5.88 MB"),
 ("2- Vertrag über die Zusammenarbeit im Zivilstandskreis Andelfingen",5751871,"330 kB"),
 ("3 - Strafrecht - Opferhilfe - Gewaltschutz",5751883,"76 kB"),("4 - Schule & Bildung - Sport - Freizeit - Kultur",5751886,"76 kB"),
 ("5 - Elternbeitragsreglement",5751889,"74 kB"),("5 - Polizeiverordnung vom 01.04.2015",7074544,"61 kB"),
 ("5 - KIBE Verordnung",5751892,"46 kB"),("5 - Sicherheits-Zweckverband Weinland - Statuten",5751895,"2.77 MB"),
 ("5 - Zweckverband Feuerwehr Weinland - Zusammenarbeitsvertrag",5751901,"938 kB"),
 ("5 - Zweckverband Feuerwehr Weinland - Statuten in Kraft per 01.01.2023",6276400,"2.54 MB"),
 ("6 - Gebührentarif",5751904,"90 kB"),("6 - Gebührenverordnung",5751907,"128 kB"),("7 - Abfallverordnung",5751913,"21 kB"),
 ("7 - Bau- und Zonenordnung",5751916,"158 kB"),("7 - Friedhof- und Bestattungsverordnung",5751919,"61 kB"),
 ("7 - Verordnung über die Gebühren für Wasserversorgungsanlagen (GebVO WVVO)",5751922,"44 kB"),
 ("7 - GWK (Gruppenwasserversorgung Kohlfirst) - Statuten",5751925,"1020 kB"),
 ("7 - KEWY (Kehrichtorganisation Wyland) - Statuten",5751928,"77 kB"),
 ("7 - RK ZNO (Regionalkonferenz Zürich-Nordost) - Statuten",5751931,"105 kB"),
 ("7 - SEVO Verordnung über die Siedlungsentwässerungsanlagen",5751934,"319 kB"),
 ("7 - SEVO GebVo (Verordnung über die Gebühren für Siedlungsentwässerungsanlagen)",5751937,"1.57 MB"),
 ("7 - Vertrag Betriebe Abfalldeponie",5751940,"276 kB"),("7 - WVVO (Verordnung über die Wasserversorgungsanlagen)",5751943,"68 kB"),
 ("7- Zonenplan Rudolfingen",5751946,"216 kB"),("7 - Zonenplan Trüllikon",5751952,"224 kB"),("7 - Zonenplan Wildensbuch",5751958,"198 kB"),
 ("7- ZPW (Zweckverband Zürcher Planungsgruppe Weinland) - Statuten",5751961,"334 kB"),
 ("7 - Zweckverband ARA Weinland - Statuten",5751964,"163 kB"),
 ("8 - ZPBW (Zweckverband für Pflege & Betreuung Weinland (Mitte) - Statuten",5751967,"579 kB"),
 ("8 - Zusammenarbeitsvertrag betreffend Mandatsführung KESR",5751970,"772 kB"),
 ("9 - Jagdpachtvertrag Revier Trüllikon 2025 bis 2033",6949573,"2.6 MB"),
 ("9 - Richtlinien Pachtlandvergabe landwirtschaftliche Flächen 2012",7119016,"552 kB"),
]
PGT_CATS = ["1: Gemeinde - Behörden - Verwaltung - Bevölkerung","2: Zivilrecht - Familienrecht - Grundbuch - Notariat",
 "3: Strafrecht - Opferhilfe - Gewaltschutz","4: Schule & Bildung - Sport - Freizeit - Kultur",
 "5: Öffentliche Ordnung & Sicherheit: Polizei - Zivilschutz Feuerwehr & Feuerpolizei - Tierschutz",
 "6: Finanzen - Steuern - Gebühren","7: Raumplanung - Bauen - Umwelt - Energie - Verkehr",
 "8: Soziales - Gesundheit - Arbeit","9: Wirtschaft - Landwirtschaft - Gewerbe"]
pgt_sections = []
for c in PGT_CATS:
    n = c.split(":")[0]
    pgt_sections.append({"titel": c, "nummer": n, "kinder": [], "dokumente": [
        doc(re.sub(r"^\d\s*-\s*", "", t), PGT_BASE+str(i), groesse=s, typ="PDF", original_titel=t)
        for t,i,s in pgt_raw if re.match(rf"^{n}\s*-", t)]})

# --- Primarschule Trüllikon (Escola, Ordner-Sitemap) ---
PST_DL = "https://www.schule-truellikon.ch/download.php?action=download&doc_id={}&download_type=3"
def pst_tree():
    raw = json.loads((ROOT/"data/raw/ps-truellikon.json").read_text(encoding="utf-8"))
    secs = []
    for titel, folders, loose in raw:
        sec = {"titel": titel.replace("  ", " "), "kinder": [], "dokumente": [doc(t, PST_DL.format(i)) for t,i in loose]}
        stack = {0: sec}
        for depth, name, files in folders:
            node = {"titel": name, "kinder": [], "dokumente": [doc(t, PST_DL.format(i)) for t,i in files]}
            stack[depth-1]["kinder"].append(node); stack[depth] = node
        secs.append(sec)
    return secs

# --- Sekundarschule Kreis Marthalen (WordPress/BeTheme, H2/H4-Liste) ---
SKM = "https://www.skmarthalen.ch/wp-content/uploads/"
skm_sections = [
 ("100 Gemeinde - Behörden - Verwaltung", [("100.1 Schulgemeindeordnung","2021/01/Gemeindeordnung-SKM.pdf"),
   ("100.2 Entschädigungsverordnung","2022/09/Entschaedigungsverordnung-SKM.pdf"),
   ("100.3 Organisationsstatut","2026/08/Organisationsstatut-SKM-Endversion-01.07.24-Anhang1-30.06.2026.pdf"),
   ("100.4 Organigramm","2026/07/Organigramm-SKM-2026-2030.pdf"),("100.5 Konstituierung","2026/07/Konstituierung-2026-2030.pdf"),
   ("100.6 Zweckverband Andelfingen","2021/01/Zweckverband-Afi.pdf"),("100.7 Reglement für Rechnungsvisum","2021/12/Reglement-fuer-Rechnungsvisum.pdf"),
   ("100.8 Verzeichnis der Informationsbestände","2021/12/Verzeichnis-der-Informationenbestaende.pdf"),
   ("100.9 Personalverordnung","2023/06/Personalverordnung-neu-1.1.2023.pdf"),
   ("100.10 Weiterbildungsreglement","2023/10/Weiterbildungsreglement-SKM-unterzeichnet.pdf")]),
 ("101 Schulbetrieb und Unterricht", [("101.1 Hausordnung","2021/01/Hausregeln.pdf"),("101.2 Benutzung Aufenthaltsraum","2021/01/Hausregeln.pdf")]),
 ("102 Schulergänzende Angebote", [("102.1 Schulzahnpflege","2021/01/Reglement-ueber-die-Schulzahlnpflege.pdf"),("102.2 Mittelschulvorbereitung",None)]),
 ("103 Sport und Freizeit", [("103.1 Benutzung Räumlichkeiten und Anlagen","2024/12/Benuetzungsreglement-Raeumlichkeiten-und-Anlagen-SKM-1.1.2025-unterzeichnet.pdf"),
   ("103.2 Gebühren Schulräume u. Sporthalle","2024/12/Gebuehrenreglement-V1-01.01.25.pdf")]),
 ("104 Finanzen", [("104.1 Jahresrechnung 2025","2026/07/2025-JR-Formularsatz-FINAL.pdf"),("104.1 Jahresrechnung 2024","2025/06/Jahresrechnung-2024-final-1.pdf"),
   ("104.1 Jahresrechnung 2023","2024/05/Jahresrechnung-2023.pdf"),("104.1 Jahresrechnung 2022","2025/06/Jahresrechnung-2024-final.pdf"),
   ("104.1 Jahresrechnung 2021","2022/09/Jahresrechnung-2021-mit-Beschluss.pdf"),("104.1 Jahresrechnung 2020","2023/01/JR20abgenommen.pdf"),
   ("104.2 Budget 2026","2026/01/Budget-2026.pdf"),("104.2 Budget 2025","2024/11/Budget-2025.pdf"),("104.2 Budget 2024","2023/12/Budget-2024.pdf"),
   ("104.2 Budget 2023","2024/06/Budget-2023-Formularsatz-vollstaendig-29.10.2022.pdf"),("104.2 Budget 2022","2023/01/Budget-2022.pdf")]),
 ("105 Beschlüsse", [("105.1 Publikationsorgan","2022/10/Auszug-Publikationsorgan.pdf"),("Sammlung aller Beschlüsse","@https://www.skmarthalen.ch/beschluesse/")]),
]
skm_archiv = [("Schulgemeindeversammlung 19. November 2025","2026/06/2025_11_19_Protokoll-GV-SKM.pdf","2026/06/Beschluss_Gemeindeversammlung-251119.pdf"),
 ("Schulgemeindeversammlung 11. Juni 2025","2025/06/2025_06_11_Protokoll-GV-SKM.pdf","2025/06/Beschluss_Gemeindeversammlung-250611.pdf"),
 ("Schulgemeindeversammlung 19. November 2024","2024/11/0461_001.pdf","2024/11/Beschluss_Gemeindeversammlung-241119.pdf"),
 ("Schulgemeindeversammlung 12. Juni 2024","2024/06/2024_06_12-Protokoll-GV-SKM.pdf","2024/06/Beschluss_Gemeindeversammlung-240612.pdf"),
 ("Schulgemeindeversammlung 20. November 2023","2023/11/2023_11_20-Protokoll-GV-SKM.pdf","2023/11/Beschluss_Gemeindeversammlung-231120.pdf"),
 ("Schulgemeindeversammlung 14. Juni 2023","2023/06/2023_06_14-Protokoll-GV-SKM.pdf","2023/06/Beschluss_Gemeindeversammlung-230614.pdf"),
 ("Schulgemeindeversammlung vom 16.11.2022","2022/11/2022_11_16-Protokoll-GV-SKM-1.pdf","2022/11/2022_11_16_Gemeindeversammlungsbeschluesse-1.pdf"),
 ("Schulgemeindeversammlung vom 08.06.2022","2022/06/Protokoll_Gemeindeversammlung_220608.pdf","2022/06/Beschluss_Gemeindeversammlung-220608.pdf"),
 ("Schulgemeindeversammlung vom 17.11.2021","2021/11/2021_11_17_Protokoll_SKM_GV.pdf","2021/11/2021_11_17_Gemeindeversammlungsbeschluesse.pdf"),
 ("Schulgemeindeversammlung vom 02.06.2021","2022/10/Protokoll-GV-02.06.2021.pdf","2022/10/2021_06_02_Gemeindeversammlungsbeschluesse.pdf")]
def skm_url(p):
    if p is None: return None
    return p[1:] if p.startswith("@") else SKM+p
skm_secs = [{"titel": t, "nummer": t.split()[0], "kinder": [], "dokumente": [doc(n, skm_url(p), typ="PDF") for n,p in items]} for t,items in skm_sections]
skm_secs.append({"titel": "Archiv", "kinder": [
    {"titel": t, "kinder": [], "dokumente": [doc("Protokoll", SKM+a, typ="PDF"), doc("Beschlüsse", SKM+b, typ="PDF")]} for t,a,b in skm_archiv]
  + [{"titel": "Wahlergebnisse", "kinder": [], "dokumente": [doc("Gesamterneuerungswahlen 2022 - 2026", SKM+"2022/03/Wahlergebnisse_Erneuerungswahl-Amtsdauer-2022-2026.pdf", typ="PDF")]}],
  "dokumente": []})

# --- Sekundarschule Bülach (Escola, AJAX-Dokumenttabellen je Rubrik) ---
SB = "https://www.sekbuelach.ch/download.php?action=download&doc_id={}&download_type=3"
sb_raw = [
 ("Gemeinde - Behörden - Verwaltung", [
   ("2022.01.01 Gemeindeordnung","704.01 KB","07.02.2022","xlze8mgxuwety5k0upenlh60zuyq6m52r6hp"),
   ("2026.04.01 Geschäftsordnung ab 01.04.2026 def_signed","342.74 KB","23.09.2026","YZKIG9oNMiMYBxqP76Kbvo4hN63JUbp96wyaGeI4uNWQfBQ9"),
   ("2024.03.07 Anpassung RPK Entschädigung ab 01.01.2024","259.56 KB","23.09.2026","AcJqRg5El0mSYjzwGp1u3AEITmKmSE5nqGKgEmU2wHZmCyGe"),
   ("2022.08.01 Personalverordnung","436.54 KB","22.07.2022","rgmc5x7p8ngpqhks6wyxupshmhv5ms5wq3ue"),
   ("2022.08.01 Personalverordnung Vollziehungsbestimmungen","687.15 KB","22.07.2022","ttx68hjqwnjh3fv8abespaftk2y5ju305hlh"),
   ("2010.08.16 Entschädigungsverordnung","87.76 KB","07.02.2022","a1qk77n6v6aepujzyytkgbm3rr4xurn15vma"),
   ("2024.06.06 Gebührenverordnung","5.22 MB","23.09.2026","qDqUFet41k4BPonigmBHtftDgkmUiv6shGsJO8sTfp5nTHed"),
   ("2024.06.11 Gebührentarif","197.75 KB","23.09.2026","BXAr0ioanUDZQCqnYP05OdzlXHmi8xITMP3i2Rd7togtSkNT")]),
 ("Schulbetrieb", [("2018 Reglement Klassenlager, Wintersportlager, Projektwochen, Exkursionen und Schulreisen","4.48 MB","07.02.2022","n5x3mshs2g08ve3e1ww08t74hm52p1mr8hsz")]),
 ("Infrastruktur, Sport und Freizeit", [("2011.04.12 Reglement VideoüberwachungSchulanlagen","84.32 KB","07.02.2022","22qng7pvfwrf5tlyb3h718z68uyychy8h7lh")]),
 ("Finanzen und Gebühren", [("2023.08.01 Erlass ueber die Haushaltfuehrung mit Globalbudget","237.87 KB","07.11.2023","9t5ie5Lp9V9jMMxgadST4bCX7OEA37oE1JGtmIhp7aLRFUn2")]),
 ("BWS - Anhang zur Personalverordnung", [("2022.08.01 Personalverordnung Anhang BWS","229.38 KB","22.07.2022","f8hvlasbk2hpwbbt1nn45hye4sra2n328ys1")]),
]
sb_secs = [{"titel": t, "kinder": [], "dokumente": [doc(n, SB.format(i), typ="pdf", groesse=g, datum=d) for n,g,d,i in items]} for t,items in sb_raw]

# ---------------------------------------------------------------- Modell
ORGS = [
 {"id": "pg-truellikon", "name": "Politische Gemeinde Trüllikon", "kurz": "Gemeinde Trüllikon", "typ": "Politische Gemeinde",
  "bezirk": "Andelfingen", "gemeinden": ["Trüllikon"], "sitz": "Trüllikon", "website": "https://www.truellikon.ch", "rs_url": "https://www.truellikon.ch/rechtssammlung",
  "cms": "i-web / icms (Innovative Web AG)", "menu_pfad": ["Wir für Sie", "Rechtssammlung"],
  "weitere_einstiege": ["Wir für Sie › Online Schalter › Reglemente A-Z"],
  "struktur": "Flache Dokumenttabelle (DataTables, 20 pro Seite, Filterfeld); die 9 Sachgebiete stehen nur als Textliste darüber, die Zuordnung erfolgt über die Ziffer im Dateititel («5 - …»).",
  "nummerierung": "Sachgebiet 1–9 als Präfix im Titel, keine Erlassnummer",
  "css": ["https://www.truellikon.ch/dist/truellikon/2025/css/cssvars.9dec850ebdd5679837cb.css",
          "https://www.truellikon.ch/compiled/modules/css/modules.43ebf1179fb267780051.css",
          "https://www.truellikon.ch/dist/truellikon/2025/css/main.9e2210af21a02619a5be.css"],
  "theme": {"font": "Montserrat", "text": "#000000", "primary": "#b62314", "button": "#cc3322", "surface": "#f4f4f4",
            "logo": "https://www.truellikon.ch/dist/truellikon/2025/images/logo.be5b44f027b10d2833ba.png"},
  "befunde": ["Kategorien 2 (Zivilrecht) wird mit Verträgen bespielt, 3 und 4 enthalten je nur ein PDF mit dem Namen des Sachgebiets (vermutlich Platzhalter «keine Erlasse»).",
              "Keine Erlassnummern, kein Inkraftsetzungsdatum als Feld; Datum steckt teils im Titel.",
              "Uneinheitliche Präfixe («1-», «1 -», «7-»).",
              "Zweckverbands-Statuten und Verträge sind mit kommunalen Erlassen vermischt (fachlich korrekt gem. Leitfaden, aber ohne Kennzeichnung)."],
  "sections": pgt_sections},
 {"id": "ps-truellikon", "name": "Primarschule Trüllikon", "kurz": "Schule Trüllikon", "typ": "Primarschulgemeinde",
  "bezirk": "Andelfingen", "gemeinden": ["Trüllikon"], "sitz": "Trüllikon", "website": "https://www.schule-truellikon.ch",
  "rs_url": "https://www.schule-truellikon.ch/links-und-download/systematische-rechtssammlung/p-122/",
  "cms": "Escola-Schulplattform (Ordner-Sitemap)", "menu_pfad": ["Download", "Systematische Rechtssammlung"],
  "weitere_einstiege": ["Information › Regelungen und Konzepte", "Download › Konzepte und Merkblätter"],
  "struktur": "Ordner-Sitemap: Rubriken «SR - 00» bis «SR - 11» mit bis zu zwei Unterordner-Ebenen; Dokumente direkt als Links (ohne Grösse/Datum).",
  "nummerierung": "Erlassnummer + Datum im Dateinamen (z. B. 100.02-20220101_PST_…), Rubriken SR-00…SR-11",
  "css": ["https://www.schule-truellikon.ch/inc/css/css_for_all.min.css?38",
          "https://www.schule-truellikon.ch/inc/customers/truellikon/css/main.css?2",
          "https://www.schule-truellikon.ch/inc/customers/truellikon/css/overwrite.css?10"],
  "theme": {"font": "Montserrat", "text": "#001514", "primary": "#ed1b24", "button": "#ed1b24", "surface": "#f5f5f5",
            "logo": "https://www.schule-truellikon.ch/inc/customers/truellikon/images/logo-header.svg"},
  "befunde": ["Rechtssammlung enthält weit mehr als Erlasse: Gemeindeversammlungen, Budgets/Rechnungen ab 2015, Verhandlungsberichte und Beschlüsse – nur rund 17 der 190 Dokumente sind Erlasse.",
              "«21 - Reglemente» erscheint als eigene Top-Rubrik statt unter SR-02 (SR-02 fehlt).",
              "Leere Rubriken: SR-03, SR-04, SR-09 und Ordner «10 - Organisationserlasse».",
              "Doppelter Eintrag Verhandlungsbericht 2023_03_20 (zwei Dateien gleichen Namens).",
              "Tippfehler in Dateinamen («Trüllion», «Urnenabstimmunt»), Budget 2026 als «2026_12_08» datiert."],
  "sections": pst_tree()},
 {"id": "skm-marthalen", "name": "Sekundarschule Kreis Marthalen (SKM)", "kurz": "SKM", "typ": "Sekundarschulgemeinde",
  "bezirk": "Andelfingen", "gemeinden": ["Benken", "Marthalen", "Rheinau", "Trüllikon"], "sitz": "Marthalen", "website": "https://www.skmarthalen.ch", "rs_url": "https://skmarthalen.ch/systematische-rechtssammlung/",
  "cms": "WordPress (Theme BeTheme)", "menu_pfad": ["Schulgemeinde", "Systematische Rechtssammlung"],
  "weitere_einstiege": ["Schulgemeinde › Gemeindeordnung (direkter PDF-Link)", "Schulgemeinde › Beschlüsse", "Information › Informationen A – Z"],
  "struktur": "Eine redaktionelle Seite: H2 = Sachgebiet (100–105, Archiv), H4 = Erlass mit Nummer, darunter ein «PDF»-Button.",
  "nummerierung": "Eigene Systematik 100–105 mit Unterziffern (100.1 …); Jahresrechnungen/Budgets teilen sich 104.1 bzw. 104.2",
  "css": ["https://skmarthalen.ch/wp-content/themes/betheme/css/be.css?ver=29.0.5",
          "https://skmarthalen.ch/wp-content/uploads/betheme/css/post-16.css"],
  "theme": {"font": "Lato", "heading": "Montserrat", "text": "#626262", "primary": "#0266bc", "button": "#0266bc", "surface": "#f7f7f7",
            "logo": "https://skmarthalen.ch/wp-content/uploads/2020/08/SKM-e1597839968144.jpg"},
  "befunde": ["104.1 «Jahresrechnung 2022» verlinkt auf die Datei der Jahresrechnung 2024.",
              "102.2 «Mittelschulvorbereitung» hat keinen Link (href=\"#\").",
              "101.1 und 101.2 zeigen auf dieselbe Datei (Hausregeln.pdf).",
              "Systematik 100–105 weicht von den 9 Sachgebieten des kantonalen Leitfadens ab.",
              "Keine Dateigrössen/Daten; Pflege rein manuell im Seiteneditor."],
  "sections": skm_secs},
 {"id": "sek-buelach", "name": "Sekundarschule Bülach", "kurz": "Sek Bülach", "typ": "Sekundarschulgemeinde",
  "bezirk": "Bülach", "gemeinden": ["Bülach"], "sitz": "Bülach", "website": "https://www.sekbuelach.ch",
  "rs_url": "https://www.sekbuelach.ch/schulverwaltung/systematische-rechtssammlung/p-5984/",
  "cms": "Escola-Schulplattform (Dokumentablage per AJAX)", "menu_pfad": ["Schulverwaltung", "Systematische Rechtssammlung"],
  "weitere_einstiege": ["Externer Link: BWS Bülach › Reglemente"],
  "struktur": "Einleitungstext + 5 Rubriken (H3), je eine dynamisch nachgeladene Dokumenttabelle mit Name, Typ, Grösse, Upload-Datum.",
  "nummerierung": "Datum JJJJ.MM.TT als Titel-Präfix, keine Erlassnummer",
  "css": ["https://www.sekbuelach.ch/inc/customers/buelach/css/main.css?14"],
  "theme": {"font": "Open Sans", "text": "rgba(0,0,0,.75)", "primary": "#00aeef", "button": "#00aeef", "surface": "#f2f2f2", "dark": "#000000",
            "logo": "https://www.sekbuelach.ch/inc/customers/buelach/images/logo-alt.svg"},
  "befunde": ["Schlank und rein auf Erlasse beschränkt (12 Dokumente) – inhaltlich am nächsten am Leitfaden.",
              "Gebührenverordnung/-tarif liegen unter «Gemeinde - Behörden - Verwaltung» statt «Finanzen und Gebühren».",
              "Inhalte werden per JavaScript nachgeladen → für Suchmaschinen und einfache Crawler unsichtbar.",
              "Upload-Datum ≠ Inkraftsetzung; Inkraftsetzung nur im Titel."],
  "sections": sb_secs},
]

def walk(node):
    yield from node.get("dokumente", [])
    for k in node.get("kinder", []): yield from walk(k)
def count(org): return sum(1 for s in org["sections"] for _ in walk(s))
def depth(node, d=1): return max([d] + [depth(k, d+1) for k in node.get("kinder", [])])

for o in ORGS:
    o["stand"] = STAND
    o["anzahl_dokumente"] = count(o)
    o["anzahl_rubriken"] = len(o["sections"])
    o["max_tiefe"] = max(depth(s) for s in o["sections"])

# ---------------------------------------------------------------- Renderer
BANNER = ('<div class="cx-banner"><a href="../index.html">← Übersicht EduKSX-Codex</a> · Prototyp – Nachbau des Seitenaufbaus '
          'zu Analysezwecken, <strong>keine offizielle Seite</strong>. Original: <a href="{u}" target="_blank" rel="noopener">{u}</a> · Stand {s}</div>')

def logo(o):
    """Platzhalter statt Original-Logo: die Demo-Seiten sind öffentlich und dürfen nicht wie die echte Seite wirken."""
    return f'<span class="cx-logo" title="Platzhalter – Original-Logo bewusst nicht übernommen">{esc(o["name"])}</span>' 
BASE_CSS = """
.cx-banner{background:#222;color:#fff;font:13px/1.4 system-ui,sans-serif;padding:6px 16px;text-align:center}
.cx-banner a{color:#9cf}
*{box-sizing:border-box} body{margin:0} img{max-width:100%}
.dl-empty{opacity:.55;font-style:italic}
.cx-logo{display:inline-block;border:2px dashed currentColor;padding:8px 14px;font-weight:700;font-size:16px;line-height:1.2;max-width:300px;opacity:.85}
"""

def dl(d, cls="", label=None):
    if not d.get("url"): return f'<span class="dl-empty">{esc(label or d["titel"])} (kein Link)</span>'
    return f'<a class="{cls}" href="{esc(d["url"])}" target="_blank" rel="noopener">{esc(label or d["titel"])}</a>'

def page(o, css, body, extra_js=""):
    links = "\n".join(f"<!-- Original-Stylesheet: {u} -->" for u in o["css"])
    return f"""<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Rechtssammlung – {esc(o['name'])} (EduKSX-Codex Prototyp)</title>
{links}
<style>{BASE_CSS}{css}</style></head>
<body>{BANNER.format(u=esc(o['rs_url']), s=STAND)}{body}{extra_js}</body></html>"""

# --- i-web (PG Trüllikon)
def render_iweb(o):
    t = o["theme"]
    rows = [(s["nummer"], d) for s in o["sections"] for d in s["dokumente"]]
    css = f"""
body{{font-family:{t['font']},Arial,sans-serif;color:{t['text']};background:#fff}}
.hdr{{border-bottom:1px solid #e2e2e2;background:#fff}} .wrap{{max-width:1200px;margin:0 auto;padding:0 20px}}
.hdr .wrap{{display:flex;align-items:center;justify-content:space-between;height:96px}} .hdr img{{height:56px}}
.hdr nav a{{margin-left:28px;color:#000;text-decoration:none;font-weight:600;font-size:15px}} .hdr nav a.on{{color:{t['primary']}}}
.mast{{background:{t['surface']};padding:36px 0 26px}} .crumb{{font-size:13px;color:#5d5f5f}} .crumb a{{color:#5d5f5f}}
h1{{font-size:40px;font-weight:700;margin:10px 0 0}}
.grid{{display:grid;grid-template-columns:260px 1fr;gap:40px;padding:36px 0 60px}}
aside a{{display:block;padding:9px 0;border-bottom:1px solid #e2e2e2;color:#000;text-decoration:none;font-size:15px}}
aside a.on{{color:{t['primary']};font-weight:700}}
h3{{font-size:17px;font-weight:600;margin:0 0 8px}} h2{{font-size:28px;margin:34px 0 14px}}
.filter input{{border:1px solid #aaabab;border-radius:4px;padding:10px 12px;width:280px;font:inherit}}
table{{width:100%;border-collapse:collapse;margin-top:14px}} th,td{{text-align:left;padding:12px 8px;border-bottom:1px solid #e2e2e2;font-weight:400}}
thead th{{font-weight:700;border-bottom:2px solid #000}} th a{{color:#000;font-size:14px}} .meta{{color:#5d5f5f;font-size:13px}}
.btn{{display:inline-block;border:2px solid {t['button']};color:{t['button']};padding:6px 18px;border-radius:24px;text-decoration:none;font-weight:600;font-size:14px}}
.btn:hover{{background:{t['button']};color:#fff}}
.pager{{display:flex;gap:6px;justify-content:space-between;align-items:center;margin-top:14px;font-size:14px}}
.pager button{{border:1px solid #c6c6c6;background:#fff;padding:6px 12px;border-radius:4px;cursor:pointer;font:inherit}}
.pager button.on{{background:{t['primary']};color:#fff;border-color:{t['primary']}}}
footer{{background:{t['primary']};color:#fff;padding:30px 0;font-size:14px}}
@media(max-width:800px){{.grid{{grid-template-columns:1fr}} aside{{display:none}} .hdr nav{{display:none}}}}"""
    trs = "\n".join(
        f'<tr data-k="{n}"><th scope="row">{dl(d)} <span class="meta">({d.get("typ","PDF")}, {esc(d.get("groesse",""))})</span></th>'
        f'<td>{dl(d,"btn","Download")}</td></tr>' for n,d in rows)
    body = f"""
<header class="hdr"><div class="wrap">{logo(o)}
<nav><a class="on" href="#">Wir für Sie</a><a href="#">Lebenslagen</a><a href="#">Politik &amp; Verwaltung</a><a href="#">Aktuelles</a><a href="#">Entdecken</a></nav></div></header>
<section class="mast"><div class="wrap"><div class="crumb"><a href="#">Home</a> › <a href="#">Wir für Sie</a> › Rechtssammlung</div><h1>Rechtssammlung</h1></div></section>
<main class="wrap grid"><aside>
<a href="#">Online Schalter</a><a href="#">Dienstleistungen A-Z</a><a href="#">Entsorgung</a><a href="#">Schutz / Sicherheit</a><a href="#">Mobilität</a>
<a class="on" href="#">Rechtssammlung</a><a href="#">Windkraftanlagen</a><a href="#">Deponiestandort Birchbüel</a></aside>
<div>{''.join(f'<h3>{esc(c)}</h3>' for c in PGT_CATS)}
<h2>Dokumente</h2><div class="filter"><input id="q" type="search" placeholder="Filtern" aria-label="Filtern"></div>
<table><thead><tr><th>Name</th><th>Download</th></tr></thead><tbody id="tb">{trs}</tbody></table>
<div class="pager"><span id="info"></span><span id="pg"></span></div></div></main>
<footer><div class="wrap">{esc(o['name'])} · Nachbau des Layouts für EduKSX-Codex</div></footer>"""
    js = """<script>
const rows=[...document.querySelectorAll('#tb tr')],q=document.getElementById('q');let p=0;const N=20;
function draw(){const f=q.value.toLowerCase(),v=rows.filter(r=>r.textContent.toLowerCase().includes(f));
rows.forEach(r=>r.style.display='none');const pages=Math.max(1,Math.ceil(v.length/N));if(p>=pages)p=0;
v.slice(p*N,p*N+N).forEach(r=>r.style.display='');
document.getElementById('info').textContent=v.length?`${p*N+1} bis ${Math.min(v.length,p*N+N)} von ${v.length} Einträgen`:'Keine Einträge';
const pg=document.getElementById('pg');pg.innerHTML='';for(let i=0;i<pages;i++){const b=document.createElement('button');b.textContent=i+1;if(i===p)b.className='on';b.onclick=()=>{p=i;draw()};pg.appendChild(b)}}
q.oninput=()=>{p=0;draw()};draw();</script>"""
    return page(o, css, body, js)

# --- Escola Ordner-Sitemap (PS Trüllikon)
def render_escola_tree(o):
    t = o["theme"]
    def node(n, lvl):
        docs = "".join(f'<li class="doc">{dl(d)}</li>' for d in n["dokumente"])
        kids = "".join(node(k, lvl+1) for k in n["kinder"])
        cnt = sum(1 for _ in walk(n))
        return (f'<details class="fold l{lvl}"{" open" if lvl==1 and cnt<15 else ""}><summary><span class="ico">📁</span>{esc(n["titel"])} <em>({cnt})</em></summary>'
                f'<ul>{docs}</ul>{kids}</details>')
    secs = ""
    for s in o["sections"]:
        cnt = sum(1 for _ in walk(s))
        inner = "".join(f'<li class="doc">{dl(d)}</li>' for d in s["dokumente"])
        secs += (f'<section class="folder-sitemap-section"><h1>{esc(s["titel"])} <em>({cnt})</em></h1>'
                 f'<ul>{inner}</ul>{"".join(node(k,1) for k in s["kinder"])}'
                 f'{"<p class=empty>Keine Dokumente</p>" if cnt==0 else ""}</section>')
    css = f"""
body{{font-family:{t['font']},'PT Sans',Roboto,Arial,sans-serif;color:{t['text']};font-size:16px}}
#header{{border-bottom:1px solid #e6e6e6}} .holder{{max-width:1440px;margin:0 auto;padding:0 24px}}
#header .holder{{display:flex;align-items:center;gap:40px;height:100px}} #header img{{height:62px}}
.menu a{{color:{t['text']};text-decoration:none;font-weight:600;margin-right:26px}} .menu a.on{{color:{t['primary']}}}
.hero{{height:120px;background:linear-gradient(90deg,{t['primary']},#b5141b)}}
.cw{{display:grid;grid-template-columns:250px 1fr;gap:48px;max-width:1120px;margin:0 auto;padding:30px 24px 60px}}
.sub a{{display:block;padding:8px 0;color:{t['text']};text-decoration:none;border-bottom:1px solid #eee}} .sub a.on{{color:{t['primary']};font-weight:700}}
.crumbs{{font-size:12px;color:#aeaeae;margin-bottom:14px}} .crumbs b{{font-weight:700}}
h1.pt{{font-size:30px;margin:0 0 20px}}
.folder-sitemap-section{{margin-bottom:22px}} .folder-sitemap-section h1{{font-size:20px;color:{t['primary']};margin:18px 0 8px;border-bottom:2px solid {t['primary']};padding-bottom:4px}}
em{{font-style:normal;color:#999;font-size:.85em}} ul{{list-style:none;margin:0;padding-left:28px}}
details{{margin:4px 0 4px 6px}} summary{{cursor:pointer;font-weight:600;padding:3px 0}} .ico{{margin-right:6px}}
.doc a{{color:{t['primary']};text-decoration:none;font-size:14px;line-height:1.9}} .doc a:before{{content:"📄 "}}
.doc a:hover{{text-decoration:underline}} .empty{{color:#999;font-style:italic;padding-left:28px}}
#footer{{background:#2b2b2b;color:#ddd;padding:28px 24px;font-size:14px}}
@media(max-width:800px){{.cw{{grid-template-columns:1fr}} .sub,.menu{{display:none}}}}"""
    body = f"""
<header id="header"><div class="holder">{logo(o)}
<nav class="menu"><a href="#">Schule</a><a href="#">Organisation</a><a href="#">Information</a><a href="#">Angebote</a><a class="on" href="#">Download</a><a href="#">Services</a></nav></div></header>
<div class="hero"></div>
<div class="cw"><nav class="sub"><a href="#">Links</a><a href="#">Dokumente</a><a href="#">Konzepte und Merkblätter</a><a href="#">Ferienplan</a><a href="#">Stundenpläne</a><a class="on" href="#">Systematische Rechtssammlung</a></nav>
<main><div class="crumbs">Home › Download › <b>Systematische Rechtssammlung</b></div><h1 class="pt">Systematische Rechtssammlung</h1>{secs}</main></div>
<footer id="footer">{esc(o['name'])} · Nachbau des Layouts für EduKSX-Codex</footer>"""
    return page(o, css, body)

# --- WordPress BeTheme (SKM)
def render_wp(o):
    t = o["theme"]
    secs = ""
    for s in o["sections"]:
        items = "".join(f'<div class="item"><h4>{esc(d["titel"])}</h4>{dl(d,"button","PDF") if d.get("url") else "<span class=dl-empty>PDF (kein Link)</span>"}</div>' for d in s["dokumente"])
        items += "".join(f'<div class="item"><h4>{esc(k["titel"])}</h4>{" ".join(dl(d,"button") for d in k["dokumente"])}</div>' for k in s["kinder"])
        secs += f'<div class="sec"><h2>{esc(s["titel"])}</h2><div class="items">{items}</div></div>'
    css = f"""
body{{font-family:{t['font']},-apple-system,'Segoe UI',Roboto,sans-serif;color:{t['text']};font-size:17px;line-height:1.6}}
h2,h4,#menu a{{font-family:{t['heading']},sans-serif}}
#Top_bar{{background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.06)}} .container{{max-width:1220px;margin:0 auto;padding:0 20px}}
#Top_bar .container{{display:flex;align-items:center;justify-content:space-between;height:90px}} #Top_bar img{{height:66px}}
#menu a{{color:{t['primary']};text-decoration:none;padding:10px 14px;font-size:16px}} #menu a.on{{background:rgba(0,0,0,.02);border-bottom:2px solid {t['primary']}}}
#Subheader{{background:#f7f7f7;padding:30px 0}} #Subheader h1{{font-family:{t['heading']},sans-serif;font-weight:400;font-size:30px;margin:0;color:#000}}
.sec{{padding:26px 0;border-bottom:1px solid #eee}} h2{{font-weight:400;font-size:26px;color:#000;margin:0 0 14px}}
.items{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px 30px}}
.item{{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px dotted #ddd;padding:6px 0}}
h4{{font-weight:400;font-size:18px;color:#0a0a0a;margin:0}}
.button{{background:{t['button']};color:#fff;text-decoration:none;padding:5px 14px;border-radius:5px;font-size:14px;white-space:nowrap}}
.button:hover{{filter:brightness(1.1)}} #Footer{{color:#aeaeae;padding:30px 0;font-size:15px}}"""
    body = f"""
<div id="Top_bar"><div class="container">{logo(o)}
<nav id="menu"><a href="#">Home</a><a href="#">Organisation</a><a href="#">Schulisches Umfeld</a><a href="#">Information</a><a class="on" href="#">Schulgemeinde</a><a href="#">Kontakt</a></nav></div></div>
<div id="Subheader"><div class="container"><h1>Systematische Rechtssammlung</h1></div></div>
<main class="container">{secs}</main>
<footer id="Footer"><div class="container">{esc(o['name'])} · Nachbau des Layouts für EduKSX-Codex</div></footer>"""
    return page(o, css, body)

# --- Escola Dokumenttabellen (Sek Bülach)
def render_escola_tables(o):
    t = o["theme"]
    secs = ""
    for s in o["sections"]:
        trs = "".join(f'<tr><td>{dl(d)}</td><td>{esc(d.get("typ",""))}</td><td>{esc(d.get("groesse",""))}</td><td>{esc(d.get("datum",""))}</td></tr>' for d in s["dokumente"])
        secs += f'<h3>{esc(s["titel"])}</h3><table class="docs"><thead><tr><th>Name</th><th>Typ</th><th>Grösse</th><th>Datum</th></tr></thead><tbody>{trs}</tbody></table>'
    css = f"""
body{{font-family:'{t['font']}',Arial,sans-serif;color:{t['text']};font-size:18px;line-height:1.55}}
.top{{background:{t['dark']};color:#fff;font-size:14px;padding:6px 0}} .holder{{max-width:1200px;margin:0 auto;padding:0 24px}}
#header .holder{{display:flex;align-items:center;justify-content:space-between;height:96px}} #header img{{height:54px}}
#header nav a{{color:{t['primary']};text-decoration:none;margin-left:18px;font-weight:600;font-size:15px;white-space:nowrap}} #header nav a.on{{color:#000}}
.band{{background:{t['primary']};color:#fff;padding:26px 0}} .band h1{{margin:0;font-weight:600;font-size:32px}}
.cw{{display:grid;grid-template-columns:240px 1fr;gap:44px;padding:34px 24px 60px}}
.sub a{{display:block;color:rgba(0,0,0,.75);text-decoration:none;padding:7px 0;font-size:16px;border-bottom:1px solid #eee}} .sub a.on{{color:{t['primary']};font-weight:700}}
h3{{font-size:21px;margin:30px 0 10px;color:#000}} p{{margin:0 0 12px}}
table.docs{{width:100%;border-collapse:collapse;font-size:15px}} table.docs th{{text-align:left;background:{t['surface']};padding:8px 10px;font-weight:600}}
table.docs td{{padding:8px 10px;border-bottom:1px solid #e8e8e8}} table.docs td:nth-child(n+2){{white-space:nowrap;color:rgba(0,0,0,.5)}}
table.docs a{{color:{t['primary']};text-decoration:none}} table.docs a:hover{{text-decoration:underline}}
#footer{{border-top:4px solid {t['primary']};color:rgba(0,0,0,.5);padding:26px 0;font-size:16px}}
@media(max-width:800px){{.cw{{grid-template-columns:1fr}} .sub,#header nav{{display:none}}}}"""
    body = f"""
<div class="top"><div class="holder">Sekundarschule Bülach · Schule Hinterbirch · Schule Mettmenriet</div></div>
<header id="header"><div class="holder">{logo(o)}
<nav><a href="#">Schule Hinterbirch</a><a href="#">Schule Mettmenriet</a><a href="#">Schulpflege</a><a class="on" href="#">Schulverwaltung</a></nav></div></header>
<div class="band"><div class="holder"><h1>Systematische Rechtssammlung</h1></div></div>
<div class="holder cw"><nav class="sub"><a href="#">Kontakt</a><a href="#">Team</a><a href="#">Formulare</a><a class="on" href="#">Systematische Rechtssammlung</a></nav>
<main><p>Das Gemeindegesetz vom 20. April 2015 verpflichtet alle Gemeinden, ihr Recht in einer systematisch aufgebauten Rechtssammlung zu veröffentlichen. In der systematischen Rechtssammlung der Sekundarschule Bülach finden sich sämtliche aktuell gültigen rechtssetzenden Verordnungen und Reglemente der Schulbehörde.</p>
{secs}<p style="margin-top:22px"><a href="https://www.bws-buelach.ch/agenda/infos/reglemente.html" target="_blank" rel="noopener" style="color:{t['primary']}">Link zu BWS Bülach / Reglemente</a></p></main></div>
<footer id="footer"><div class="holder">{esc(o['name'])} · Nachbau des Layouts für EduKSX-Codex</div></footer>"""
    return page(o, css, body)

RENDER = {"pg-truellikon": render_iweb, "ps-truellikon": render_escola_tree, "skm-marthalen": render_wp, "sek-buelach": render_escola_tables}

# ---------------------------------------------------------------- Übersicht
WM = ('<span class="wm" role="img" aria-label="EduKSX-Codex"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span>'
      '<span class="o">K</span><span class="b">SX</span><span class="n">-Codex</span></span></span>')
ICON = ('<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" fill="var(--brand-violet)"/>'
        '<rect x="13" y="3.5" width="7.5" height="7.5" rx="2" fill="none" stroke="var(--brand-neutral)" stroke-width="1.75"/>'
        '<rect x="3.5" y="13" width="7.5" height="7.5" rx="2" fill="var(--brand-orange)"/><rect x="13" y="13" width="7.5" height="7.5" rx="2" fill="var(--brand-blue)"/></svg>')

def render_daten(gemeinden):
    bezirke = list(dict.fromkeys(g["bezirk"] for g in gemeinden))
    pg = {o["sitz"]: o["id"] for o in ORGS if o["typ"] == "Politische Gemeinde"}
    gem = [{**g, "org": pg.get(g["gemeinde"]) if g["status"] != "offen" else None} for g in gemeinden]
    daten = {"stand": STAND, "bezirke": bezirke, "gemeinden": gem, "organisationen": ORGS}
    return ("/* Erzeugt von tools/build.py – nicht von Hand bearbeiten. */\nwindow.CODEX = "
            + json.dumps(daten, ensure_ascii=False, separators=(",", ":")) + ";\n")

def render_index(gemeinden):
    return f"""<!DOCTYPE html>
<html lang="de-CH">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>EduKSX-Codex – Rechtssammlungen (Prototyp)</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="assets/eduksx.css">
  <link rel="stylesheet" href="assets/codex.css">
  <script>
    try {{ var t = localStorage.getItem("eduksx-thema"); if (t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches) document.documentElement.classList.add("dark"); }} catch (e) {{}}
  </script>
</head>
<body>
  <header class="kopf">
    <a class="marke" href="#/">{ICON}{WM}</a><span class="muted small">Prototyp Rechtssammlung</span>
    <div class="werkzeuge"><a class="btn" href="../">← Alle Prototypen</a> <button class="btn" id="thema" type="button">◐ Hell/Dunkel</button></div>
  </header>
  <div class="hinweis-band" role="note"><strong>Prototyp</strong> – Evaluation öffentlich zugänglicher Rechtssammlungen, Stand {STAND}.
    Die Demo-Seiten bauen den Seitenaufbau der Originale nach und sind keine offiziellen Seiten; alle Downloads führen zu den Original-Dokumenten.</div>
  <div class="rahmen" id="rahmen"><main style="padding:2rem">Prototyp wird geladen … Für diesen Prototyp muss JavaScript eingeschaltet sein.</main></div>
  <footer class="fuss"><span>{WM} · Prototyp 0.2.0 · Stand {STAND}</span><span><a href="https://github.com/MarkusKeller8200/EduKSX-Prototyp/tree/main/prototypen/rechtssammlung">Quellcode</a></span></footer>
  <script src="assets/daten.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
"""

def render_md():
    L = [f"# EduKSX-Codex – Evaluation systematischer Rechtssammlungen", "", f"Prototyp 0.1.0 · Stand {STAND}", "",
         "## Vergleich", "", "| | " + " | ".join(o["kurz"] for o in ORGS) + " |", "|---|" + "---|"*len(ORGS)]
    for lab, f in [("CMS", lambda o:o["cms"]), ("Menüpfad", lambda o:" › ".join(o["menu_pfad"])),
                   ("Rubriken / Dokumente", lambda o:f"{o['anzahl_rubriken']} / {o['anzahl_dokumente']}"),
                   ("Ordnertiefe", lambda o:str(o["max_tiefe"])), ("Nummerierung", lambda o:o["nummerierung"])]:
        L.append(f"| {lab} | " + " | ".join(f(o).replace("|","/") for o in ORGS) + " |")
    for o in ORGS:
        L += ["", f"## {o['name']}", "", f"- **Typ / Bezirk:** {o['typ']}, {o['bezirk']}", f"- **Website:** {o['website']}",
              f"- **Rechtssammlung:** {o['rs_url']}", f"- **Menüpfad:** {' › '.join(o['menu_pfad'])}",
              f"- **Weitere Einstiege:** {'; '.join(o['weitere_einstiege'])}", f"- **CMS:** {o['cms']}",
              f"- **Struktur:** {o['struktur']}", f"- **Nummerierung:** {o['nummerierung']}",
              f"- **Umfang:** {o['anzahl_rubriken']} Rubriken, {o['anzahl_dokumente']} Dokumente", "", "### Menüstruktur und Dateien", ""]
        def tree(n, lvl):
            c = sum(1 for _ in walk(n))
            L.append("  "*lvl + f"- **{n['titel']}** ({c})")
            for d in n["dokumente"]: L.append("  "*(lvl+1) + f"- {d['titel']}")
            for k in n["kinder"]: tree(k, lvl+1)
        for s in o["sections"]: tree(s, 0)
        L += ["", "### Befunde", ""] + [f"- {b}" for b in o["befunde"]]
    L += ["", "## Nächste Schritte", "",
          "1. Website-URL jeder der 160 Gemeinden aus der Gebietsstammdaten-API bzw. dem Gemeindeverzeichnis ergänzen (data/gemeinden-zh.csv).",
          "2. CMS automatisch erkennen (i-web, Escola, WordPress, …) und je CMS einen Crawler-Adapter schreiben – die vier Piloten decken bereits drei Plattformen ab.",
          "3. Schulgemeinden (60) und Zweckverbände als eigene Liste aufnehmen; sie sind gemäss Leitfaden ebenfalls rechtssammlungspflichtig.",
          "4. Codex-Normalform festlegen: Sachgebiet 1–9 (kantonaler Leitfaden) + Erlassnummer + Inkraftsetzung + Status (gültig/aufgehoben) + Dokumentart (Erlass/Beschluss/Finanzen)."]
    return "\n".join(L) + "\n"

def main():
    gem = list(csv.DictReader(open(ROOT/"data/gemeinden-zh.csv", encoding="utf-8")))
    (ROOT/"data/rechtssammlungen.json").write_text(json.dumps({"stand": STAND, "organisationen": ORGS}, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT/"demo").mkdir(exist_ok=True)
    for o in ORGS: (ROOT/f"demo/{o['id']}.html").write_text(RENDER[o["id"]](o), encoding="utf-8")
    (ROOT/"index.html").write_text(render_index(gem), encoding="utf-8")
    (ROOT/"assets/daten.js").write_text(render_daten(gem), encoding="utf-8")
    (ROOT/"docs").mkdir(exist_ok=True)
    (ROOT/"docs/evaluation.md").write_text(render_md(), encoding="utf-8")
    for o in ORGS: print(f"{o['id']:15} {o['anzahl_rubriken']:2} Rubriken {o['anzahl_dokumente']:4} Dokumente Tiefe {o['max_tiefe']}")

if __name__ == "__main__":
    main()
