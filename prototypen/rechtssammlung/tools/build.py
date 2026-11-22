#!/usr/bin/env python3
"""EduKSX-Codex Prototyp 0.29.0 – Generator.

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

# ---------------------------------------------------------------- Erweiterung 17.11.2026: weitere Gemeinden
RAW = ROOT / "data" / "raw"
def lade(name): return json.loads((RAW / name).read_text(encoding="utf-8"))

def iweb_gk(raw, basis):
    """i-web mit Unterseiten je Sachgebiet: Tabellen Nummer | Titel | Gültig seit (Meilen, Winkel)."""
    secs, aufgehoben = [], 0
    for eintrag in raw:
        titel, items = eintrag[0], eintrag[-1]
        sec = {"titel": titel, "nummer": titel.split()[0], "kinder": [], "dokumente": []}
        ziel = sec
        for it in items:
            if it[0] == "G":
                ziel = {"titel": it[1], "kinder": [], "dokumente": []}; sec["kinder"].append(ziel)
            elif it[0] == "X":
                aufgehoben += 1
            else:
                nr, tit, datum = (it[1].split("¦") + ["", "", ""])[:3]
                ref = it[2] if it[2].startswith("/") else "/_rte/information/" + it[2]
                ziel["dokumente"].append(doc(tit, basis + ref, nummer=nr, datum=datum, typ="Seite mit PDF"))
        secs.append(sec)
    return secs, aufgehoben

def dam_tree(raw, basis):
    """Ordnerablage mit Ebenen (Bachenbülach, Höri): Ordner [id, eltern, name], Dateien [ordner, titel, grösse, pfad]."""
    knoten = {fid: {"titel": name, "kinder": [], "dokumente": [], "_p": par} for fid, par, name in raw["f"]}
    wurzel = {"titel": "", "kinder": [], "dokumente": []}
    for fid, k in knoten.items():
        (knoten[k["_p"]]["kinder"] if k["_p"] in knoten else wurzel["kinder"]).append(k)
    for par, titel, gr, pfad in raw["d"]:
        url = pfad[1:] if pfad.startswith("@") else basis + pfad
        (knoten.get(par) or wurzel)["dokumente"].append(doc(titel, url, groesse=gr, typ=(pfad.split("?")[0].rsplit(".", 1)[-1] if "." in pfad else "")))
    def sauber(k):
        k.pop("_p", None); [sauber(x) for x in k["kinder"]]; return k
    for k in knoten.values(): sauber(k)
    if wurzel["dokumente"]:
        wurzel["kinder"].insert(0, {"titel": "Ohne Ordner", "kinder": [], "dokumente": wurzel["dokumente"]})
    return wurzel["kinder"]

def contao_akkordeon(raw):
    secs, ziel = [], None
    for it in raw["items"]:
        if it[0] == "T":
            sec = {"titel": it[1], "nummer": it[1].split()[0], "kinder": [], "dokumente": []}; secs.append(sec); ziel = sec
        elif it[0] == "H":
            ziel = {"titel": it[1], "kinder": [], "dokumente": []}; secs[-1]["kinder"].append(ziel)
        else:
            nr = it[1].split("_", 1)[0] if re.match(r"^\d", it[1]) else ""
            ziel["dokumente"].append(doc(it[1], raw["base"] + it[3], groesse=it[2], nummer=nr, typ="PDF"))
    return secs

mei_secs, mei_aufgehoben = iweb_gk(lade("pg-meilen.json"), "https://www.meilen.ch")
win_secs, win_aufgehoben = iweb_gk(lade("pg-winkel.json"), "https://www.winkel.ch")
bb_raw = lade("bachenbuelach.json")
bb_secs = dam_tree(bb_raw["rs"], bb_raw["base"])
bbs_secs = dam_tree(bb_raw["schule"], bb_raw["base"])
hoe_secs = dam_tree(lade("pg-hoeri.json"), "https://www.hoeri.ch/public/upload/assets/")
hoch_secs = contao_akkordeon(lade("pg-hochfelden.json"))
PSH = "https://www.schulehoeri.ch/download.php?action=download&doc_id={}&download_type=3"
psh_secs = [{"titel": "Rechtsgrundlagen", "kinder": [], "dokumente": [doc(n, PSH.format(i), typ="pdf", groesse=g, datum=d) for n, g, d, i in [
    ("Schulgemeindeordnung 2022", "212.18 KB", "26.01.2022", "bazv2ytfgah3htanhcbl0mrx3quy1h2zpy8l"),
    ("Organisationsstatut", "7.2 MB", "16.07.2018", "ulv25ub7l48403qjrzje7gcukh81zkznhwle"),
    ("Entschädigungsverordnung", "177.28 KB", "11.03.2024", "SgwknTGKauhC0k3mcYTMeYId80ouKx4OORsJo86EZKF9rDAZ"),
    ("Personalverordnung Primarschule Höri", "364.89 KB", "02.10.2024", "xavi3KIOLlkxPfbEtDpGbrTJxyqj2IvbeeVY6KLiZZVD0le2")]]}]
SW = "https://www.schule-winkel.ch/download.php?action=download&doc_id={}&download_type=3"
sw_secs = [{"titel": "Betreuung › Dokumente", "kinder": [], "dokumente": [doc(n, SW.format(i), typ="pdf", groesse=g, datum=d) for n, g, d, i in [
    ("Betriebskonzept Schulergänzende Betreuung", "216.02 KB", "27.05.2025", "ewZOtmLQDZNpSC1OYYmwqaINLxEDWcZlG5RMnU19E3x36fUp"),
    ("ABC der Betreuung inkl. Tarife", "98.6 KB", "12.05.2025", "821nvbt6564sn7jcj0h2xt0ab7hhq8tnajkl"),
    ("Reglement Ferienbetreuung", "257.21 KB", "16.02.2026", "1Myi4HT0NTF2naxrpARhM67DORNbbDNWByQ9Y9wiNf6XI0eF"),
    ("Merkblatt Flexibles Betreuungsmodell", "125.32 KB", "12.05.2025", "f33rlxh5br6xsg44zqka6876c5xmp3kpwygu"),
    ("Bestätigung des Arbeitgebers", "69.68 KB", "15.04.2023", "whtp2bkg4xxutk1v0vbrv2cwmfvxjewmqgfy"),
    ("Anleitung Escola-App", "1.38 MB", "12.05.2025", "82fbVRWT2qxdkRU8kuodll5BpIf7USd1B7T4WevA277IzTxL"),
    ("Merkblatt zur Ermittlung des massgebenden Einkommens", "70.86 KB", "24.11.2025", "4nI94swxel1tnUIkHpPezE1CZ2XpRXT16tXM81Lyc4tMGhy8")]]}]

NEU = [
 {"id": "pg-meilen", "name": "Politische Gemeinde Meilen", "kurz": "Meilen", "typ": "Politische Gemeinde", "bezirk": "Meilen",
  "gemeinden": ["Meilen"], "sitz": "Meilen", "website": "https://www.meilen.ch", "rs_url": "https://www.meilen.ch/rechtssammlung",
  "cms": "i-web / icms (Innovative Web AG)", "menu_pfad": ["Verwaltung", "Rechtssammlung", "1–9 Sachgebiet (je eine Unterseite)"],
  "weitere_einstiege": ["Bildung / Schule › Schule Meilen (eigene Website)"], "renderer": "iweb_gk",
  "struktur": "Neun Unterseiten je Sachgebiet; je Untergruppe eine Tabelle Nummer | Titel | Gültig seit. Jeder Eintrag führt auf eine Detailseite mit dem PDF.",
  "nummerierung": "Vollständige Erlassnummern nach Leitfaden (z. B. 100.1, 110.111) mit Inkraftsetzungsdatum",
  "css": ["https://www.meilen.ch/dist/meilen/2026/css/main.a1f5a5f377089a42d2a4.css"],
  "theme": {"font": "Roboto", "text": "#071327", "primary": "#009992", "button": "#009992", "surface": "#f2f4f3", "dark": "#071327"},
  "nav": ["Verwaltung", "Politik", "Leben", "Bildung / Schule", "Freizeit"], "einheit": "Einheitsgemeinde",
  "befunde": ["Vorbildlich: einheitliche Erlassnummern und «Gültig seit» bei jedem Erlass.",
              "Einheitsgemeinde: die Erlasse der Schule stehen im Sachgebiet 4 der Gemeinde-Rechtssammlung (400.x «Reglement der Schule betr. …»).",
              f"{mei_aufgehoben} aufgehobene Erlasse bleiben als Zeile stehen («Aufgehoben.»), ohne Dokument.",
              "Links führen auf Detailseiten statt direkt auf das PDF – ein Klick mehr."],
  "sections": mei_secs},
 {"id": "pg-bachenbuelach", "name": "Politische Gemeinde Bachenbülach", "kurz": "Bachenbülach", "typ": "Politische Gemeinde", "bezirk": "Bülach",
  "gemeinden": ["Bachenbülach"], "sitz": "Bachenbülach", "website": "https://www.bachenbuelach.ch",
  "rs_url": "https://www.bachenbuelach.ch/verwaltung/systematische-rechtssammlung.html/397",
  "cms": "Gemeinde-CMS mit Dokumentablage (Ordnerbaum)", "menu_pfad": ["Verwaltung", "Systematische Rechtssammlung"],
  "weitere_einstiege": ["Schule › Service › Reglemente und Dokumente (eigene Ablage der Schule)"], "renderer": "dam",
  "struktur": "Aufklappbarer Ordnerbaum (Ebene 1 = Sachgebiet 01–09, Ebene 2 = Untergruppe) mit Dateiname | Grösse | Format und «Ordnerinhalt herunterladen».",
  "nummerierung": "Sachgebiete 01–09 und Untergruppen (10, 11 …); Dateien ohne Erlassnummer, Abkürzung in Klammer (GO, EVO …)",
  "css": ["https://www.bachenbuelach.ch/public/templates/31/1518-normalize_3223-basics_3103-application_3124-layout.css"],
  "theme": {"font": "Roboto", "heading": "Roboto Condensed", "text": "#333333", "primary": "#373a3d", "button": "#373a3d", "surface": "#f4f4f4", "dark": "#373a3d"},
  "nav": ["Porträt", "Politik", "Verwaltung", "Freizeit / Kultur", "Schule"], "einheit": "Einheitsgemeinde Primarstufe",
  "befunde": ["Keine Schul-Erlasse in der Rechtssammlung: Organisationsreglement Schule, Elternbeitrags- und Hortreglemente liegen nur in der Schul-Ablage.",
              "Fehleinordnung: Geschäftsreglement Kinder-/Jugendkommission und Rabattreglement unter «02 Zivilrecht».",
              "Gemeindeordnung liegt unter «11 Gemeinderat», das Organisationsreglement unter «10 Gemeinde».",
              "Tippfehler im Titel «Verodnung über die Wasserversorgungsanlagen».",
              "Einheitsgemeinde Primarstufe (laut Gemeindeverzeichnis keine Primarschulgemeinde); Sekundarstufe vermutlich Sek Bülach – zu prüfen."],
  "sections": bb_secs},
 {"id": "schule-bachenbuelach", "name": "Schule Bachenbülach (Primarstufe der Gemeinde)", "kurz": "Schule Bachenbülach", "typ": "Schule der Einheitsgemeinde", "bezirk": "Bülach",
  "gemeinden": ["Bachenbülach"], "sitz": "Bachenbülach", "website": "https://www.bachenbuelach.ch/schule",
  "rs_url": "https://www.bachenbuelach.ch/organisation/reglemente-und-dokumente.html/295",
  "cms": "Gemeinde-CMS mit Dokumentablage (Ordnerbaum)", "menu_pfad": ["Schule", "Service", "Reglemente und Dokumente"],
  "weitere_einstiege": [], "renderer": "dam",
  "struktur": "Ordnerbaum der Schule: Reglemente/Konzepte/Merkblätter, Hort, Freizeitkurse, Anmeldung u. a. – gemischt mit Formularen und Elterninformationen.",
  "nummerierung": "keine",
  "css": ["https://www.bachenbuelach.ch/public/templates/31/1518-normalize_3223-basics_3103-application_3124-layout.css"],
  "theme": {"font": "Roboto", "heading": "Roboto Condensed", "text": "#333333", "primary": "#373a3d", "button": "#373a3d", "surface": "#f4f4f4", "dark": "#373a3d"},
  "nav": ["Porträt", "Politik", "Verwaltung", "Freizeit / Kultur", "Schule"], "einheit": "Einheitsgemeinde Primarstufe",
  "befunde": ["Keine Rechtssammlung im Sinne des Leitfadens: Erlasse (ORSS, Elternbeitragsreglement, Ferienhortreglement) stehen zwischen Formularen und Liedern.",
              "Diese Erlasse fehlen in der Rechtssammlung der Gemeinde."],
  "sections": bbs_secs},
 {"id": "pg-hoeri", "name": "Politische Gemeinde Höri", "kurz": "Höri", "typ": "Politische Gemeinde", "bezirk": "Bülach",
  "gemeinden": ["Höri"], "sitz": "Höri", "website": "https://www.hoeri.ch", "rs_url": "https://www.hoeri.ch/politik-verwaltung/verwaltung/rechtssammlung.html/50",
  "cms": "Gemeinde-CMS mit Dokumentablage (Ordnerbaum, per AJAX)", "menu_pfad": ["Politik & Verwaltung", "Verwaltung", "Rechtssammlung"],
  "weitere_einstiege": ["Bildung › Kindergarten/Primarschule Höri (eigene Website)", "Bildung › Sekundarschule Bülach"], "renderer": "dam",
  "struktur": "Aufklappbarer Ordnerbaum mit den 9 Sachgebieten; Dateien direkt im Sachgebiet, Inhalte werden per AJAX nachgeladen.",
  "nummerierung": "Erlassnummer im Dateinamen (100.1, 120.1.1 …)",
  "css": ["https://www.hoeri.ch/public/templates/1/8-normalize_899-basics_900-application_932-layout_897-nav_883-responsive.css"],
  "theme": {"font": "Inter", "text": "#000000", "primary": "#005bbb", "button": "#005bbb", "surface": "#f4f4f4", "dark": "#333333"},
  "nav": ["Politik & Verwaltung", "Leben & Wohnen", "Bildung", "Freizeit"], "einheit": "keine Einheitsgemeinde",
  "befunde": ["Saubere Nummerierung nach Leitfaden, aber keine Untergruppen-Ordner (alle Dateien direkt im Sachgebiet).",
              "Gemischte Nummerformate (721.1.0 neben 721.2).",
              "Primarstufe bei der Primarschulgemeinde Höri, Sekundarstufe bei der Sekundarschule Bülach."],
  "sections": hoe_secs},
 {"id": "ps-hoeri", "name": "Primarschulgemeinde Höri", "kurz": "Primarschule Höri", "typ": "Primarschulgemeinde", "bezirk": "Bülach",
  "gemeinden": ["Höri"], "sitz": "Höri", "website": "https://www.schulehoeri.ch",
  "rs_url": "https://www.schulehoeri.ch/organisation/schulpflege/rechtsgrundlagen/p-183568/",
  "cms": "Escola-Schulplattform (Dokumentablage per AJAX)", "menu_pfad": ["Organisation", "Schulpflege", "Rechtsgrundlagen"],
  "weitere_einstiege": ["Elternrat › Reglement", "Informationen › Elternrechte/-Pflichten"], "renderer": "escola_tables",
  "struktur": "Eine Dokumenttabelle «Rechtsgrundlagen» (Name, Typ, Grösse, Datum).",
  "nummerierung": "keine",
  "css": ["https://www.schulehoeri.ch/inc/customers/hoeri/css/main.css?8"],
  "theme": {"font": "Roboto", "text": "#000000", "primary": "#5a9556", "button": "#397c34", "surface": "#eef4ee", "dark": "#397c34"},
  "nav": ["Schule", "Organisation", "Informationen", "Elternrat", "Kontakt"], "einheit": "",
  "befunde": ["Nur vier Grunderlasse; weitere Reglemente (z. B. Elternrat) liegen an anderen Stellen der Website.",
              "Keine Gliederung nach Sachgebieten, keine Nummern.", "Menüpunkt heisst «Rechtsgrundlagen», nicht «Rechtssammlung»."],
  "sections": psh_secs},
 {"id": "pg-winkel", "name": "Politische Gemeinde Winkel", "kurz": "Winkel", "typ": "Politische Gemeinde", "bezirk": "Bülach",
  "gemeinden": ["Winkel"], "sitz": "Winkel", "website": "https://www.winkel.ch", "rs_url": "https://www.winkel.ch/gesetzessammlung",
  "cms": "i-web / icms (Innovative Web AG)", "menu_pfad": ["Verwaltung", "Rechtssammlung", "1–9 Sachgebiet (je eine Unterseite)"],
  "weitere_einstiege": ["Primarschule (eigene Website schule-winkel.ch)"], "renderer": "iweb_gk",
  "struktur": "Wie Meilen: neun Unterseiten je Sachgebiet mit Tabellen Nummer | Titel | Gültig seit, Detailseite je Erlass.",
  "nummerierung": "Vollständige Erlassnummern nach Leitfaden mit Inkraftsetzungsdatum",
  "css": ["https://www.winkel.ch/dist/winkel/2024/css/main.a8473739849e6cf571e1.css"],
  "theme": {"font": "Arial", "text": "#000000", "primary": "#a01c1e", "button": "#a01c1e", "surface": "#f8f8f8", "dark": "#333333"},
  "nav": ["Verwaltung", "Politik", "Leben", "Bildung", "Freizeit"], "einheit": "Einheitsgemeinde Primarstufe",
  "befunde": ["Einheitsgemeinde Primarstufe, aber keine Schul-Erlasse in der Rechtssammlung (Sachgebiet 4 enthält nur Betreuung, Bibliothek, Vereine).",
              "Schul-Reglemente (z. B. Reglement Ferienbetreuung) liegen auf der Website der Schule.",
              "Seiten-Adresse heisst «gesetzessammlung», Menüpunkt «Rechtssammlung»."],
  "sections": win_secs},
 {"id": "schule-winkel", "name": "Schule Winkel (Primarstufe der Gemeinde)", "kurz": "Schule Winkel", "typ": "Schule der Einheitsgemeinde", "bezirk": "Bülach",
  "gemeinden": ["Winkel"], "sitz": "Winkel", "website": "https://www.schule-winkel.ch", "rs_url": "https://www.schule-winkel.ch/betreuung/dokumente/p-1158/",
  "cms": "Escola-Schulplattform (Dokumentablage per AJAX)", "menu_pfad": ["Betreuung", "Dokumente"],
  "weitere_einstiege": ["Informationen › Dokumente (öffentlich leer)"], "renderer": "escola_tables",
  "struktur": "Einzelne Dokumenttabellen ohne Überschriften auf der Seite «Betreuung › Dokumente».",
  "nummerierung": "keine",
  "css": ["https://www.schule-winkel.ch/inc/customers/winkel/css/main.css"],
  "theme": {"font": "Roboto", "text": "rgba(0,0,0,.75)", "primary": "#a01c1e", "button": "#a01c1e", "surface": "#f4f4f4", "dark": "#333333"},
  "nav": ["Schule", "Informationen", "Betreuung", "Kontakt"], "einheit": "Einheitsgemeinde Primarstufe",
  "befunde": ["Keine Rechtssammlung; einziges Erlass-artiges Dokument ist das «Reglement Ferienbetreuung».",
              "Seite «Informationen › Dokumente» zeigt öffentlich keine Dokumente."],
  "sections": sw_secs},
 {"id": "pg-hochfelden", "name": "Politische Gemeinde Hochfelden", "kurz": "Hochfelden", "typ": "Politische Gemeinde", "bezirk": "Bülach",
  "gemeinden": ["Hochfelden"], "sitz": "Hochfelden", "website": "https://www.hochfelden.ch", "rs_url": "https://www.hochfelden.ch/politik/gesetzessammlung",
  "cms": "Contao", "menu_pfad": ["Politik", "Gesetzessammlung"],
  "weitere_einstiege": ["Bildung › Schulwesen › Schule Hochfelden (eigene Website)"], "renderer": "contao",
  "struktur": "Eine Seite mit Akkordeon je Sachgebiet (1–9); darin Untergruppen (H3) und Downloadlisten mit Dateigrösse.",
  "nummerierung": "Erlassnummer im Dateinamen (100.1_…), Untergruppen nach Leitfaden",
  "css": ["https://www.hochfelden.ch/assets/css/styles.css"],
  "theme": {"font": "Verdana", "heading": "Hind", "text": "#555555", "primary": "#f2c400", "button": "#3c3e40", "surface": "#f4f4f4", "dark": "#3c3e40"},
  "nav": ["Aktuelles", "Politik", "Verwaltung", "Leben", "Bildung", "Freizeit"], "einheit": "Einheitsgemeinde Primarstufe",
  "befunde": ["Gut strukturiert: Sachgebiet › Untergruppe › Erlass mit Nummer und Grösse.",
              "Einheitsgemeinde Primarstufe: Primarschul-Erlasse unter «40 Primarschule»; die Gemeindeordnung der Sekundarschule steht unter «41 Sekundarschule» (Fremderlass).",
              "Dateinamen teils mit «.pdf» im Titel, einer ohne Nummer (Gebührenverordnung).",
              "Menüpunkt heisst «Gesetzessammlung», Seitentitel «Systematische Rechtssammlung (SR)»."],
  "sections": hoch_secs},
]
ORGS += NEU
due_secs, due_aufgehoben = iweb_gk(lade("pg-duebendorf.json"), "https://www.duebendorf.ch")
feh_secs, feh_aufgehoben = iweb_gk(lade("pg-fehraltorf.json"), "https://www.fehraltorf.ch")
for _s in due_secs + feh_secs:   # «G»-Zeilen ohne Erlasse (z. B. leere Sachgebiete) bleiben als leere Rubrik stehen
    _s["kinder"] = [k for k in _s["kinder"] if k["dokumente"]]
PSD = "https://www.schule-duebendorf.ch/_doc/{}"
psd_secs = [{"titel": "Dokumente", "kinder": [], "dokumente": [doc(n, PSD.format(i), typ="pdf", groesse=g) for n, i, g in [
    ("Allgemeine Richtlinie Informationsicherheitund Datenschutz Primarschule Dübendorf", 524434, "176 kB"),
    ("Finanzreglement Primarschule Dübendorf 01.09.2026", 521068, "189 kB"),
    ("Funktionendiagramm Primarschule Dübendorf 01.09", 521326, "44 kB"),
    ("Geschäftsreglement 01.09.2026", 521071, "156 kB"),
    ("Kommunikationskonzept", 395185, "674 kB"),
    ("Konzept sonderpädagogischer Hort - Dezember 2025", 497989, "321 kB"),
    ("Reglement Projektorganisation Primarschule 01.09.2026", 521074, "121 kB"),
    ("Reglement Videoüberwachung", 422053, "1.23 MB"),
    ("Schularealordnung", 395188, "480 kB"),
    ("Reglement Ausschuss Sonderpädagogik Primarschule D", 529648, "91 kB")]]}]
SDS = "https://www.sek-ds.ch/download.php?action=download&download_type=3&doc_id={}"
_sds = {
 "1 Gemeinde – Behörden – Verwaltung": [("1.1 Gemeindeordnung", "S5nrIkGfWsdhjAGDK2VgOql4gxXhKptfKiQ85iO7OZyLv15Y"), ("1.2 Behördenverzeichnis", "vJjDxXrbZ1aHessitnWugYrqZwRzy8UVoBEnqNnaf1Qovt3H"),
   ("1.3 Organisationsstatut", "ZgCbPBL8wopkxzPvj3lZeQQ6gYzwDSM0byOdNKKTTrIkrFN5"), ("1.4 Organigramm", "XWWR8Bs6S9GUBNi0DXXcBGKClMlgTZ1aB1I9iGFJMefouX4k"),
   ("1.5 Personalverordnung", "KvYjxhGfFAZYNwzmKq9spZ6qsRvVO6fwtpclpg3xwp2SUucG"), ("1.6 Ausführungsbestimmungen zur Personalverordnung", "goI8dYJcJxBYloJiVSym493cizFckU9yibtiT98hWcr4U76T"),
   ("1.7 Leitbild", "yryI0d41Ymt4v9EWGolP0rdL9df86gP6Yr33FLnETRYXOevg"), ("1.8 Verordnung Entschädigung Behörde, Kommissionen", "1ARiHNL2ytGB3MU2YkE5D7PLzOrHkdydq9ksvQdurE0rnFVY")],
 "2 Schulbetrieb Sekundarschule": [("2.1 Reglement Absenzen, Dispensationen und Jokertage", "25tmHhoGslNC5Ga8M9ulztTewXzrYOl5r8Xh5bvPiWp5VYAR"), ("2.2 Reglement Berufsvorbereitungsjahr", "UeJTIT3eIveWYKn2GwOwLkocsAeOQH1lJBp71Zi3oB9DOlJW"),
   ("2.3 Reglement Elternmitwirkung", "LrDD9Al2mQdeFHTFCQA1vHXmCRU8150aPsNri6JjCdVblOZM"), ("2.4 Hausordnung Grüze 1-7, 2025", "v2mrcxlqZEbrMfpl2wFatnfbUqNSzcI2Ld8hGG5NoKpkZnKp"),
   ("2.5 Hausordnung Stägenbuck 2023", "OgiglR0QiRZ6xEGu9EYHUb779fDJEImvZ37jnh6C0ijYEoSv"), ("2.6 Nutzungsreglement Schüler iPad", "gTkgQvPyZyX84kQmuIyUYa141Ss9Uvy0QV0XoE6GNONg4IUD"),
   ("2.7 Prozessablauf Querversetzungen innerhalb der SSDS", "KMYhXjUyCMCQq1WP1LYnsLaXKG0ZCvFb5CzdMSaKZcF2XVvk"), ("2.8 Konzept Sonderpädagogik", "8r4wYLk59Q0cP27ISiBXoJYtCHR97Ea3TP4YJnWeNQYbVZ26"),
   ("2.9 Anschlussvertrag Schulpsychologischer Dienst", "XcILCddhloNiCJXAXruEm4E6kbmIWC0m6MJYl8YRM8mHd7VH")],
 "3 Schulergänzende Angebote": [("3.1 Konzept LIFT", "Tee5clLeWjhy2wsDckTakZayK6sobVO7tdXZ1H9b0GHsimyU"), ("3.2 Reglement Tagesstrukturen", "UeYzrr2hl2y4NDozTWGmpLYNy6PJHlAEmOidCD6zRWjqFQip"),
   ("3.3 Reglement Ufzgi-Club", "yZjTA3q3P4GgSP0yXltEfXRBqUQskGmpfcyKIFkUhWgizjJ4")],
 "4 Sport und Freizeit": [("4.1 Benützerreglement für Schulräume", "HmCc6EIvhuc4lkJLVY6N3iW7Rwz2kw6vLK2MdLs6irwim7re"), ("4.2 Benützerreglement für Schulräume - Tarife", "x8jT9J39NVKnGPsNyd20JndCbgBb9wwDPnQIkCjDGy9Kt9pL"),
   ("4.3 Reglement Klassenlager, Schulreisen, Lager u. weiteres", "kaAGbCcLEC9blSWoCrj2Oeo9uWn4kXkR5vEmus4sBunWlPqz")],
 "5 Finanzen – Gebühren": [("5.1 Gebührenverordnung", "U5be3ffJWyJ4idfUcaqVBDKCYvfp87eB649dt3e56l3AzIIM"), ("5.2 Gebührentarif", "9nn3i2wMJciyKOpYLV5rH5uPcWnrsCM6eKzE5z0wkgNlbZVI"),
   ("5.3 Finanzreglement (gültig ab 1. März 2025)", "Lr0mQxGvGUWKeGMxqn2WDTnZ3iJ5cSLvSJRVHlmH5ntuHvZo")],
 "6 Öffentliche Ordnung & Sicherheit": [("6.1 Videoüberwachung Reglement", "sjCAKYvI8YZvSbWcD6I7cGRkGgYaKO4HYM3HNbMY3TVn9l5e")],
}
sds_secs = [{"titel": t, "nummer": t.split()[0], "kinder": [], "dokumente": [doc(n, SDS.format(i), typ="pdf", nummer=n.split()[0]) for n, i in docs]} for t, docs in _sds.items()]

NEU2 = [
 {"id": "pg-duebendorf", "name": "Politische Gemeinde Dübendorf", "kurz": "Dübendorf", "typ": "Politische Gemeinde", "bezirk": "Uster",
  "gemeinden": ["Dübendorf"], "sitz": "Dübendorf", "website": "https://www.duebendorf.ch", "rs_url": "https://www.duebendorf.ch/gesetzessammlung",
  "cms": "i-web / icms (Innovative Web AG)", "menu_pfad": ["Politik", "Gesetzessammlung", "1–9 Sachgebiet (je eine Unterseite)"],
  "weitere_einstiege": ["Verwaltung › Bildung › Primarschule (eigene Website schule-duebendorf.ch)", "Sekundarschule Dübendorf-Schwerzenbach (eigene Website sek-ds.ch)"],
  "renderer": "iweb_gk",
  "struktur": "Wie Meilen/Winkel: neun Unterseiten je Sachgebiet, Untergruppen (Zehner bzw. Hunderter) mit Tabellen Nummer | Titel | Gültig seit; Detailseite je Erlass.",
  "nummerierung": "Vollständige Erlassnummern nach Leitfaden (z. B. 100.1, 600.211) mit Inkraftsetzungsdatum",
  "css": ["https://www.duebendorf.ch/dist/duebendorf/2025/css/main.fb611fe9a92ed9f69515.css"],
  "theme": {"font": "Barlow", "text": "#39393c", "primary": "#05192d", "button": "#ffff00", "surface": "#f3f5fa", "dark": "#080817"},
  "nav": ["Aktuelles", "Politik", "Verwaltung", "Dienstleistungen", "Leben", "Wirtschaft", "Karriere"], "einheit": "",
  "befunde": ["Gleicher Aufbau wie Meilen und Winkel: Erlassnummer mit Sachgebietsziffer und «Gültig seit» bei jedem Erlass.",
              "Primarstufe gehört zur Stadt (Geschäftsordnung Primarschulpflege 104.1 in der Stadt-SR); die übrigen Primarschul-Erlasse stehen aber nur auf der Schul-Website.",
              "Sachgebiete 3 Strafrecht und 9 Wirtschaft/Gewerbe sind leer.",
              "Mit «Kommunikationskonzept» (150.1), «Gesamtverkehrskonzept» (780.1) und einer Richtlinie (160.1) stehen nicht rechtsetzende Dokumente ohne Kennzeichnung in der SR.",
              "Menüpunkt «Gesetzessammlung» unter Politik."],
  "sections": due_secs},
 {"id": "schule-duebendorf", "name": "Primarschule Dübendorf (Primarstufe der Stadt)", "kurz": "Primarschule Dübendorf", "typ": "Schule der Einheitsgemeinde", "bezirk": "Uster",
  "gemeinden": ["Dübendorf"], "sitz": "Dübendorf", "website": "https://www.schule-duebendorf.ch", "rs_url": "https://www.schule-duebendorf.ch/rechtssammlung",
  "cms": "i-web / icms (Innovative Web AG)", "menu_pfad": ["Organisation", "Rechtssammlung"],
  "weitere_einstiege": ["Downloads je Schuleinheit (Birchlen, Dorf, Flugfeld …)"], "renderer": "escola_tables",
  "struktur": "Eine Seite «Rechtssammlung» mit einer alphabetischen Dokumentliste (Titel, PDF, Grösse), ohne Sachgebiete.",
  "nummerierung": "keine",
  "css": ["https://www.schule-duebendorf.ch/dist/duebendorf-primarschule/2020/css/main.bbfa513b4a33aeead507.css"],
  "theme": {"font": "Source Sans Pro", "text": "#000000", "primary": "#1f6f99", "button": "#93ceec", "surface": "#eef7fc", "dark": "#000000"},
  "nav": ["Organisation", "Schulen", "Angebote", "Aktuelles"], "einheit": "Einheitsgemeinde Primarstufe",
  "befunde": ["Alphabetische Liste ohne Sachgebiete und Nummern – genügt dem Leitfaden nicht (Ziff. 3).",
              "Gemischt: Reglemente neben Konzepten, Funktionendiagramm und Richtlinie.",
              "Die Primarstufe gehört zur Stadt: diese Erlasse gehörten ins Sachgebiet 4 der Stadt-SR."],
  "sections": psd_secs},
 {"id": "ssg-duebendorf-schwerzenbach", "name": "Sekundarschulgemeinde Dübendorf-Schwerzenbach", "kurz": "Sek Dübendorf-Schwerzenbach", "typ": "Sekundarschulgemeinde", "bezirk": "Uster",
  "gemeinden": ["Dübendorf", "Schwerzenbach"], "sitz": "Dübendorf", "website": "https://www.sek-ds.ch",
  "rs_url": "https://www.sek-ds.ch/informationen/systematische-rechtssammlung/p-80/",
  "cms": "Escola-Schulplattform", "menu_pfad": ["Informationen", "Systematische Rechtssammlung"],
  "weitere_einstiege": [], "renderer": "escola_tables",
  "struktur": "Eine Seite mit sechs Sachgebieten (Überschriften 1–6) und je einer Downloadliste.",
  "nummerierung": "Sachgebiet.Laufnummer im Titel (1.1, 2.4 …), Sachgebiete nach Leitfaden Anhang 2 plus «6 Öffentliche Ordnung & Sicherheit»",
  "css": ["https://www.sek-ds.ch/inc/css/base/responsive/tables.css"],
  "theme": {"font": "Arial", "heading": "IBM Plex Sans", "text": "#666666", "primary": "#0066cc", "button": "#0066cc", "surface": "#f2f7fc", "dark": "#0066cc"},
  "nav": ["Über uns", "Schule Grüze 1-4", "Schule Grüze 5-7", "Schule Stägenbuck", "Informationen"], "einheit": "",
  "befunde": ["Sachgebiete 1–5 folgen dem Leitfaden (Anhang 2), dazu ein eigenes Sachgebiet 6 für Videoüberwachung.",
              "Nicht rechtsetzende Dokumente in der SR: Behördenverzeichnis, Organigramm, Leitbild, Konzepte, Prozessablauf.",
              "Kein Inkraftsetzungsdatum in der Liste (nur beim Finanzreglement im Titel)."],
  "sections": sds_secs},
 {"id": "pg-fehraltorf", "name": "Politische Gemeinde Fehraltorf", "kurz": "Fehraltorf", "typ": "Politische Gemeinde", "bezirk": "Pfäffikon",
  "gemeinden": ["Fehraltorf"], "sitz": "Fehraltorf", "website": "https://www.fehraltorf.ch", "rs_url": "https://www.fehraltorf.ch/gesetzessammlung",
  "cms": "i-web / icms (Innovative Web AG)", "menu_pfad": ["Verwaltung", "Gesetzessammlung", "1–9 Sachgebiet (je eine Unterseite)"],
  "weitere_einstiege": ["Schule Fehraltorf (eigene Website schulefehraltorf.ch, nur «Informationen»/Downloads)"], "renderer": "iweb_gk",
  "struktur": "Neun Unterseiten je Sachgebiet mit Tabellen Nummer | Titel | Gültig seit, Detailseite je Erlass. Eigene Systematik: 2 = Schule/Bildung, 6 = Bauwesen, 9 = Rechtspflege.",
  "nummerierung": "Erlassnummern mit Sachgebietsziffer (101, 111.1, 202.1.1), teils ohne Punkt (2010, 5010)",
  "css": ["https://www.fehraltorf.ch/dist/fehraltorf/2023/css/main.1d24fe3f8975ae1fb6e2.css"],
  "theme": {"font": "Avenir LT Std Book", "heading": "Avenir LT Std Black", "text": "#00314e", "primary": "#00314e", "button": "#00314e", "surface": "#f2f5f7", "dark": "#00314e"},
  "nav": ["Gemeinde", "Politik", "Verwaltung", "Freizeit, Kultur und Veranstaltungen", "Aktuelles und Gesellschaft", "Schule Fehraltorf", "Werke Fehraltorf"],
  "einheit": "Einheitsgemeinde",
  "befunde": ["Einheitsgemeinde (Gemeindeordnung Art. 2: Gemeinde erfüllt die Aufgaben der Volksschule): die Schul-Erlasse stehen in der Gemeinde-SR (Sachgebiet 2).",
              "Eigene Sachgebiet-Reihenfolge statt Leitfaden Anhang 1 (Schule = 2, Bauwesen = 6, Finanzen = 7, Rechtspflege = 9); Seitenadressen der Unterseiten (gk-zivilrecht …) passen nicht zum Inhalt.",
              "Zonenplan, Kernzonen- und Gestaltungspläne als Dokumente abgelegt (Leitfaden: Hinweis genügt).",
              "Nicht rechtsetzend und ungekennzeichnet: Konzepte, Leistungsvereinbarungen, Archivplan, Bericht zum Energieplan, Weisung.",
              "Schul-Website hat keine eigene Rechtssammlung, nur eine Liste «Informationen» (Neuigkeiten und Downloads)."],
  "sections": feh_secs},
]
ORGS += NEU2
# Einbettung (X-Frame-Options / frame-ancestors am 17.11.2026 geprüft) und PDF-Vorschau
EINBETTBAR = {"skm-marthalen"}
for o in ORGS:
    o["einbettbar"] = o["id"] in EINBETTBAR
    o["pdf_vorschau"] = o["id"] in EINBETTBAR
    o.setdefault("renderer", {"pg-truellikon": "iweb", "ps-truellikon": "escola_tree", "skm-marthalen": "wp", "sek-buelach": "escola_tables_sb"}.get(o["id"], ""))
    o.setdefault("einheit", {"pg-truellikon": "keine Einheitsgemeinde"}.get(o["id"], ""))

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
<div><!--CX-->{''.join(f'<h3>{esc(c)}</h3>' for c in PGT_CATS)}
<h2>Dokumente</h2><div class="filter"><input id="q" type="search" placeholder="Filtern" aria-label="Filtern"></div>
<table><thead><tr><th>Name</th><th>Download</th></tr></thead><tbody id="tb">{trs}</tbody></table>
<div class="pager"><span id="info"></span><span id="pg"></span></div><!--/CX--></div></main>
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
<main><div class="crumbs">Home › Download › <b>Systematische Rechtssammlung</b></div><h1 class="pt">Systematische Rechtssammlung</h1><!--CX-->{secs}<!--/CX--></main></div>
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
<main class="container"><!--CX-->{secs}<!--/CX--></main>
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
<main><!--CX--><p>Das Gemeindegesetz vom 20. April 2015 verpflichtet alle Gemeinden, ihr Recht in einer systematisch aufgebauten Rechtssammlung zu veröffentlichen. In der systematischen Rechtssammlung der Sekundarschule Bülach finden sich sämtliche aktuell gültigen rechtssetzenden Verordnungen und Reglemente der Schulbehörde.</p>
{secs}<p style="margin-top:22px"><a href="https://www.bws-buelach.ch/agenda/infos/reglemente.html" target="_blank" rel="noopener" style="color:{t['primary']}">Link zu BWS Bülach / Reglemente</a></p><!--/CX--></main></div>
<footer id="footer"><div class="holder">{esc(o['name'])} · Nachbau des Layouts für EduKSX-Codex</div></footer>"""
    return page(o, css, body)


# --- generische Kopf-/Fusszeile für weitere Nachbauten
def kopf_html(o, cls=""):
    t = o["theme"]; nav = "".join(f'<a href="#"{" class=on" if n == o["menu_pfad"][0] else ""}>{esc(n)}</a>' for n in o.get("nav", []))
    return f'<header class="hdr {cls}"><div class="wrap">{logo(o)}<nav>{nav}</nav></div></header>'
def basis_css(o):
    t = o["theme"]; hf = t.get("heading", t["font"])
    return f"""
body{{font-family:'{t['font']}',Arial,sans-serif;color:{t['text']};font-size:16px;line-height:1.55}}
h1,h2,h3{{font-family:'{hf}','{t['font']}',Arial,sans-serif}}
.wrap{{max-width:1200px;margin:0 auto;padding:0 20px}}
.hdr{{border-bottom:1px solid #e3e3e3;background:#fff}} .hdr .wrap{{display:flex;align-items:center;justify-content:space-between;min-height:88px;gap:20px}}
.hdr nav a{{margin-left:22px;color:{t['text']};text-decoration:none;font-weight:600;font-size:15px}} .hdr nav a.on{{color:{t['primary']};border-bottom:3px solid {t['primary']};padding-bottom:4px}}
.band{{background:{t.get('surface','#f4f4f4')};padding:28px 0 20px}} .crumb{{font-size:13px;opacity:.75}} .band h1{{margin:6px 0 0;font-size:34px}}
.grid{{display:grid;grid-template-columns:250px 1fr;gap:36px;padding:30px 20px 60px}}
aside a{{display:block;padding:8px 0;border-bottom:1px solid #e3e3e3;color:{t['text']};text-decoration:none;font-size:15px}} aside a.on{{color:{t['primary']};font-weight:700}}
footer.fuss{{background:{t.get('dark','#333')};color:#fff;padding:26px 0;font-size:14px}}
@media(max-width:800px){{.grid{{grid-template-columns:1fr}} aside,.hdr nav{{display:none}}}}"""
def gerust(o, aside, inhalt, crumb):
    return f"""{kopf_html(o)}
<section class="band"><div class="wrap"><div class="crumb">Home › {' › '.join(map(esc, crumb))}</div><h1>{esc(crumb[-1] if crumb else 'Rechtssammlung')}</h1></div></section>
<main class="wrap grid"><aside>{aside}</aside><div><!--CX-->{inhalt}<!--/CX--></div></main>
<footer class="fuss"><div class="wrap">{esc(o['name'])} · Nachbau des Layouts für EduKSX-Codex</div></footer>"""

def render_iweb_gk(o):
    """i-web mit Unterseiten je Sachgebiet (Meilen, Winkel): Sachgebiet-Menü links, Tabellen Nummer | Titel | Gültig seit."""
    t = o["theme"]
    aside = "".join(f'<a href="#sg{i}" data-sg="{i}"{" class=on" if i == 0 else ""}>{esc(s["titel"])}</a>' for i, s in enumerate(o["sections"]))
    def tab(docs):
        return ('<table class="erl"><tbody>' + "".join(
            f'<tr><td class="nr">{dl(d, "", d.get("nummer", ""))}</td><td>{dl(d)}</td><td class="dt">{dl(d, "", d.get("datum", ""))}</td></tr>' for d in docs) + "</tbody></table>")
    teile = ""
    for i, s in enumerate(o["sections"]):
        inner = (tab(s["dokumente"]) if s["dokumente"] else "") + "".join(
            f'<table class="erl kopf"><tbody><tr><td><b>{esc(k["titel"])}</b></td><td class="dt"><b>Gültig seit</b></td></tr></tbody></table>{tab(k["dokumente"])}' for k in s["kinder"])
        teile += f'<section class="sg" id="sg{i}"{"" if i == 0 else " hidden"}><h2>{esc(s["titel"])}</h2>{inner or "<p>Keine Erlasse.</p>"}</section>'
    css = basis_css(o) + f"""
.erl{{width:100%;border-collapse:collapse;margin:0 0 6px}} .erl td{{padding:9px 8px;border-bottom:1px solid #e3e3e3;vertical-align:top}}
.erl td.nr{{width:12%;white-space:nowrap}} .erl td.dt{{width:18%;white-space:nowrap}} .erl.kopf td{{border-bottom:2px solid {t['text']};padding-top:18px}}
.erl a{{color:{t['text']};text-decoration:none}} .erl a:hover{{color:{t['primary']};text-decoration:underline}} h2{{font-size:26px;margin:0 0 10px}}"""
    js = """<script>document.querySelectorAll('aside a[data-sg]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();
document.querySelectorAll('aside a').forEach(x=>x.classList.remove('on'));a.classList.add('on');
document.querySelectorAll('section.sg').forEach(s=>s.hidden=s.id!=='sg'+a.dataset.sg);}));</script>"""
    return page(o, css, gerust(o, aside, teile, o["menu_pfad"][:2]), js)

def render_dam(o):
    """Ordnerablage mit aufklappbaren Ebenen (Bachenbülach, Höri)."""
    t = o["theme"]; zeilen = []
    def ordner(n, ebene, eltern):
        fid = f"f{len(zeilen)}"
        zeilen.append(f'<tr class="ord" data-id="{fid}" data-p="{eltern}"{"" if ebene == 1 else " hidden"}><td class="l{ebene}"><button type="button" class="tog" aria-expanded="false">'
                      f'<span class="ic">▸</span> 📁 <span class="vh">Ebene {ebene}: </span>{esc(n["titel"])}</button></td><td></td><td></td></tr>')
        for k in n["kinder"]: ordner(k, ebene + 1, fid)
        for d in n["dokumente"]:
            zeilen.append(f'<tr class="dat" data-p="{fid}" hidden><td class="l{ebene + 1}">📄 {dl(d)}</td><td>{esc(d.get("groesse", ""))}</td><td>{esc(d.get("typ", ""))}</td></tr>')
    for s in o["sections"]: ordner(s, 1, "")
    inhalt = f'<p>Die systematische Rechtssammlung ist nach Sachgebieten geordnet.</p><table class="dms"><thead><tr><th>Dateiname</th><th>Grösse</th><th>Format</th></tr></thead><tbody>{"".join(zeilen)}</tbody></table>'
    aside = "".join(f'<a href="#"{" class=on" if n == o["menu_pfad"][-1] else ""}>{esc(n)}</a>' for n in o["menu_pfad"])
    css = basis_css(o) + f"""
.dms{{width:100%;border-collapse:collapse}} .dms th{{text-align:left;border-bottom:2px solid {t['text']};padding:8px}} .dms td{{padding:7px 8px;border-bottom:1px solid #e6e6e6}}
.dms td:nth-child(n+2){{white-space:nowrap;width:90px;opacity:.75}} .tog{{background:none;border:0;font:inherit;color:inherit;cursor:pointer;padding:0;text-align:left;font-weight:600}}
.l2{{padding-left:28px!important}} .l3{{padding-left:52px!important}} .l4{{padding-left:76px!important}} .vh{{position:absolute;left:-9999px}}
.dms a{{color:{t['primary']};text-decoration:none}} .dms a:hover{{text-decoration:underline}}"""
    js = """<script>document.querySelectorAll('.tog').forEach(b=>b.addEventListener('click',()=>{const tr=b.closest('tr'),id=tr.dataset.id,auf=b.getAttribute('aria-expanded')!=='true';
b.setAttribute('aria-expanded',auf);b.querySelector('.ic').textContent=auf?'▾':'▸';
const zu=p=>document.querySelectorAll('tr[data-p="'+p+'"]').forEach(r=>{r.hidden=true;if(r.dataset.id){const t=r.querySelector('.tog');t.setAttribute('aria-expanded','false');t.querySelector('.ic').textContent='▸';zu(r.dataset.id);}});
if(auf)document.querySelectorAll('tr[data-p="'+id+'"]').forEach(r=>r.hidden=false);else zu(id);}));</script>"""
    return page(o, css, gerust(o, aside, inhalt, o["menu_pfad"]), js)

def render_contao(o):
    """Akkordeon je Sachgebiet mit Untergruppen und Downloadlisten (Hochfelden)."""
    t = o["theme"]
    teile = "".join(
        f'<details class="acc"><summary>{esc(s["titel"])}</summary><div class="in">' + "".join(
            f'<h3>{esc(k["titel"])}</h3><ul class="dl">' + "".join(f'<li>{dl(d)} <span>({esc(d.get("groesse", ""))})</span></li>' for d in k["dokumente"]) + "</ul>"
            for k in s["kinder"]) + ("" if s["kinder"] else "<p>Keine Erlasse.</p>") + "</div></details>" for s in o["sections"])
    inhalt = f'<h2>Themenbereiche</h2>{teile}'
    aside = "".join(f'<a href="#"{" class=on" if n == "Gesetzessammlung" else ""}>{esc(n)}</a>' for n in ["Gemeinderat", "Behörden / Kommissionen", "Gemeindeversammlungen", "Abstimmungen / Wahlen", "Gesetzessammlung"])
    css = basis_css(o) + f"""
.band{{border-left:8px solid {t['primary']}}} h2{{font-size:24px;color:#3b3c42}}
.acc{{border:1px solid #ddd;margin:0 0 8px;background:#fff}} .acc summary{{cursor:pointer;padding:14px 16px;font-weight:700;background:{t['dark']};color:#fff;list-style:none}}
.acc summary::after{{content:"+";float:right;color:{t['primary']};font-size:20px;line-height:1}} .acc[open] summary::after{{content:"–"}}
.acc .in{{padding:6px 18px 14px}} .acc h3{{font-size:17px;margin:14px 0 6px;color:#3b3c42}}
ul.dl{{list-style:none;margin:0;padding:0}} ul.dl li{{padding:6px 0;border-bottom:1px dotted #ccc}} ul.dl li::before{{content:"⬇ ";color:{t['primary']}}}
ul.dl a{{color:#3b3c42;text-decoration:none}} ul.dl a:hover{{text-decoration:underline}} ul.dl span{{color:#777;font-size:13px}}"""
    return page(o, css, gerust(o, aside, inhalt, ["Politik", "Gesetzessammlung"]))

def render_escola_generic(o):
    t = o["theme"]
    secs = "".join(
        f'<h3>{esc(s["titel"])}</h3><table class="docs"><thead><tr><th>Name</th><th>Typ</th><th>Grösse</th><th>Datum</th></tr></thead><tbody>' + "".join(
            f'<tr><td>{dl(d)}</td><td>{esc(d.get("typ", ""))}</td><td>{esc(d.get("groesse", ""))}</td><td>{esc(d.get("datum", ""))}</td></tr>' for d in s["dokumente"]) + "</tbody></table>"
        for s in o["sections"])
    aside = "".join(f'<a href="#"{" class=on" if n == o["menu_pfad"][-1] else ""}>{esc(n)}</a>' for n in o["menu_pfad"])
    css = basis_css(o) + f"""
.hdr{{border-top:6px solid {t['dark']}}} h3{{font-size:20px;margin:24px 0 8px}}
table.docs{{width:100%;border-collapse:collapse;font-size:15px}} table.docs th{{text-align:left;background:{t['surface']};padding:8px 10px}}
table.docs td{{padding:8px 10px;border-bottom:1px solid #e6e6e6}} table.docs td:nth-child(n+2){{white-space:nowrap;opacity:.6}}
table.docs a{{color:{t['primary']};text-decoration:none}}"""
    return page(o, css, gerust(o, aside, secs, o["menu_pfad"]))

def iframe_variante(o, html_nachbau):
    """Gleicher Seitenrahmen wie der Nachbau, Inhalt ersetzt durch das einbettbare EduKSX-Codex-Widget."""
    t = o["theme"]
    block = (f'<div class="cx-iframe-hinweis">Hier eingebettet: EduKSX-Codex-Widget (iFrame) – so könnte die Gemeinde die Rechtssammlung in ihre eigene Seite einbauen.</div>'
             f'<iframe id="cx-frame" class="cx-frame" title="Rechtssammlung {esc(o["name"])}" src="../embed/index.html?org={o["id"]}" loading="lazy"></iframe>')
    neu = re.sub(r"<!--CX-->.*?<!--/CX-->", lambda m: "<!--CX-->" + block + "<!--/CX-->", html_nachbau, count=1, flags=re.S)
    neu = re.sub(r"<script>.*?</script>", "", neu, flags=re.S)
    zusatz = ("<style>.cx-frame{width:100%;min-height:560px;border:0;display:block}.cx-iframe-hinweis{font:12px/1.4 system-ui,sans-serif;background:#fff7d6;border-left:4px solid #f2b705;padding:6px 10px;margin:0 0 10px}</style>"
              "<script>window.addEventListener('message',function(e){if(e.data&&e.data.cxHoehe){document.getElementById('cx-frame').style.height=(e.data.cxHoehe+20)+'px';}});</script></body>")
    return neu.replace("</body>", zusatz, 1).replace("Nachbau des Seitenaufbaus", "Nachbau mit eingebettetem EduKSX-Codex-Widget", 1)

RENDER = {"iweb": render_iweb, "escola_tree": render_escola_tree, "wp": render_wp, "escola_tables_sb": render_escola_tables,
          "iweb_gk": render_iweb_gk, "dam": render_dam, "contao": render_contao, "escola_tables": render_escola_generic}



# ---------------------------------------------------------------- Schulgemeinden (Gemeindeverzeichnis Gemeindeamt, Stand 1.7.2026)
ABK = [("a. A.", "am Albis"), ("a. S.", "am See"), ("a. I.", "am Irchel"), ("a. d. Th.", "an der Thur"), ("a. d. L.", "an der Limmat")]
def lang(n):
    for a, b in ABK: n = n.replace(a, b)
    return n.strip()
# (Typ, Name, Bezirk, Sitz, bekannte Mitglieder oder None = nur Sitz sicher)
SG = [
 ("Volksschulgemeinde", "Hittnau", "Pfäffikon", "Hittnau", None), ("Volksschulgemeinde", "Elsau - Schlatt", "Winterthur", "Elsau", ["Elsau", "Schlatt"]),
 ("Volksschulgemeinde", "Wiesendangen", "Winterthur", "Wiesendangen", None), ("Volksschulgemeinde", "Flaachtal", "Andelfingen", "Flaach", None),
 ("Volksschulgemeinde", "Dietlikon", "Bülach", "Dietlikon", None), ("Volksschulgemeinde", "Rorbas - Freienstein-Teufen", "Bülach", "Rorbas", ["Rorbas", "Freienstein-Teufen"]),
 ("Volksschulgemeinde", "Unteres Rafzerfeld", "Bülach", "Wil", None), ("Volksschulgemeinde", "Wehntal", "Dielsdorf", "Niederweningen", None),
 ("Primarschulgemeinde", "Maschwanden", "Affoltern", "Maschwanden", None), ("Primarschulgemeinde", "Wettswil a. A.", "Affoltern", "Wettswil am Albis", None),
 ("Primarschulgemeinde", "Schwerzenbach", "Uster", "Schwerzenbach", None), ("Primarschulgemeinde", "Wila", "Pfäffikon", "Wila", None),
 ("Primarschulgemeinde", "Dägerlen", "Winterthur", "Dägerlen", None), ("Primarschulgemeinde", "Elgg", "Winterthur", "Elgg", None),
 ("Primarschulgemeinde", "Ellikon a. d. Th.", "Winterthur", "Ellikon an der Thur", None), ("Primarschulgemeinde", "Turbenthal", "Winterthur", "Turbenthal", None),
 ("Primarschulgemeinde", "Andelfingen", "Andelfingen", "Andelfingen", None), ("Primarschulgemeinde", "Benken", "Andelfingen", "Benken", None),
 ("Primarschulgemeinde", "Dachsen", "Andelfingen", "Dachsen", None), ("Primarschulgemeinde", "Laufen-Uhwiesen", "Andelfingen", "Laufen-Uhwiesen", None),
 ("Primarschulgemeinde", "Marthalen", "Andelfingen", "Marthalen", None), ("Primarschulgemeinde", "Ossingen", "Andelfingen", "Ossingen", None),
 ("Primarschulgemeinde", "Trüllikon", "Andelfingen", "Trüllikon", ["Trüllikon"]), ("Primarschulgemeinde", "Truttikon", "Andelfingen", "Truttikon", None),
 ("Primarschulgemeinde", "Höri", "Bülach", "Höri", ["Höri"]), ("Primarschulgemeinde", "Bachs", "Dielsdorf", "Bachs", None),
 ("Primarschulgemeinde", "Boppelsen", "Dielsdorf", "Boppelsen", None), ("Primarschulgemeinde", "Dänikon - Hüttikon", "Dielsdorf", "Dänikon", ["Dänikon", "Hüttikon"]),
 ("Primarschulgemeinde", "Dielsdorf", "Dielsdorf", "Dielsdorf", None), ("Primarschulgemeinde", "Regensberg", "Dielsdorf", "Regensberg", None),
 ("Primarschulgemeinde", "Stadel", "Dielsdorf", "Stadel", None), ("Primarschulgemeinde", "Oetwil - Geroldswil", "Dietikon", "Oetwil an der Limmat", ["Oetwil an der Limmat", "Geroldswil"]),
 ("Sekundarschulgemeinde", "Affoltern a. A. - Aeugst a. A.", "Affoltern", "Affoltern am Albis", ["Affoltern am Albis", "Aeugst am Albis"]),
 ("Sekundarschulgemeinde", "Bonstetten", "Affoltern", "Bonstetten", None), ("Sekundarschulgemeinde", "Hausen a. A.", "Affoltern", "Hausen am Albis", None),
 ("Sekundarschulgemeinde", "Knonau - Maschwanden - Mettmenstetten", "Affoltern", "Knonau", ["Knonau", "Maschwanden", "Mettmenstetten"]),
 ("Sekundarschulgemeinde", "Obfelden - Ottenbach", "Affoltern", "Obfelden", ["Obfelden", "Ottenbach"]),
 ("Sekundarschulgemeinde", "Wädenswil", "Horgen", "Wädenswil", None),
 ("Sekundarschulgemeinde", "Dübendorf - Schwerzenbach", "Uster", "Dübendorf", ["Dübendorf", "Schwerzenbach"]),
 ("Sekundarschulgemeinde", "Nänikon - Greifensee", "Uster", "Greifensee", ["Greifensee"]), ("Sekundarschulgemeinde", "Uster", "Uster", "Uster", None),
 ("Sekundarschulgemeinde", "Wila", "Pfäffikon", "Wila", None), ("Sekundarschulgemeinde", "Elgg", "Winterthur", "Elgg", None),
 ("Sekundarschulgemeinde", "Rickenbach", "Winterthur", "Rickenbach", None), ("Sekundarschulgemeinde", "Seuzach", "Winterthur", "Seuzach", None),
 ("Sekundarschulgemeinde", "Turbenthal - Wildberg", "Winterthur", "Turbenthal", ["Turbenthal", "Wildberg"]),
 ("Sekundarschulgemeinde", "Andelfingen", "Andelfingen", "Andelfingen", None), ("Sekundarschulgemeinde", "Kreis Uhwiesen", "Andelfingen", "Laufen-Uhwiesen", None),
 ("Sekundarschulgemeinde", "Kreis Marthalen", "Andelfingen", "Marthalen", ["Benken", "Marthalen", "Rheinau", "Trüllikon"]),
 ("Sekundarschulgemeinde", "Ossingen - Truttikon", "Andelfingen", "Ossingen", ["Ossingen", "Truttikon"]),
 ("Sekundarschulgemeinde", "Bülach", "Bülach", "Bülach", ["Bülach", "Höri", "Hochfelden"]), ("Sekundarschulgemeinde", "Embrach", "Bülach", "Embrach", None),
 ("Sekundarschulgemeinde", "Dielsdorf", "Dielsdorf", "Dielsdorf", None), ("Sekundarschulgemeinde", "Niederhasli - Niederglatt", "Dielsdorf", "Niederhasli", ["Niederhasli", "Niederglatt"]),
 ("Sekundarschulgemeinde", "Unteres Furttal", "Dielsdorf", "Otelfingen", None),
 ("Sekundarschulgemeinde", "Regensdorf - Buchs - Dällikon", "Dielsdorf", "Regensdorf", ["Regensdorf", "Buchs", "Dällikon"]),
 ("Sekundarschulgemeinde", "Rümlang - Oberglatt", "Dielsdorf", "Rümlang", ["Rümlang", "Oberglatt"]), ("Sekundarschulgemeinde", "Stadel", "Dielsdorf", "Stadel", None),
 ("Sekundarschulgemeinde", "Birmensdorf - Aesch", "Dietikon", "Birmensdorf", ["Birmensdorf", "Aesch"]), ("Sekundarschulgemeinde", "Weiningen", "Dietikon", "Weiningen", None),
]
ORG_SG = {("Primarschulgemeinde", "Trüllikon"): "ps-truellikon", ("Sekundarschulgemeinde", "Kreis Marthalen"): "skm-marthalen",
          ("Sekundarschulgemeinde", "Bülach"): "sek-buelach", ("Primarschulgemeinde", "Höri"): "ps-hoeri",
          ("Sekundarschulgemeinde", "Dübendorf - Schwerzenbach"): "ssg-duebendorf-schwerzenbach"}
# Ergebnisse der Recherche vom 17.11.2026 (sicher), Rest wird hergeleitet
UNSICHER_MITGLIED = {("Sekundarschulgemeinde", "Bülach"): ["Bachenbülach", "Winkel"]}
STUFE_FIX = {"Bachenbülach": ("Gemeinde", None), "Winkel": ("Gemeinde", None), "Hochfelden": ("Gemeinde", "Sekundarschulgemeinde Bülach"),
             "Meilen": ("Gemeinde", "Gemeinde"), "Fehraltorf": ("Gemeinde", "Gemeinde"),
             "Dübendorf": ("Gemeinde", "Sekundarschulgemeinde Dübendorf - Schwerzenbach")}

def schulgemeinden():
    out = []
    for typ, name, bez, sitz, mit in SG:
        out.append({"typ": typ, "name": f"{typ} {lang(name)}", "kurz": lang(name), "bezirk": bez, "sitz": sitz,
                    "mitglieder": mit or [sitz], "mitglieder_sicher": mit is not None,
                    "mitglieder_unsicher": UNSICHER_MITGLIED.get((typ, name), []), "org": ORG_SG.get((typ, name))})
    return out

def einheit(gemeinden, sgs):
    """Je politische Gemeinde: wer trägt Primar- und Sekundarstufe? → Klammervermerk (Einheitsgemeinde …)."""
    for g in gemeinden:
        name = g["gemeinde"].replace(" (ZH)", "")
        stufen = {}
        for stufe, typen in (("primar", ("Volksschulgemeinde", "Primarschulgemeinde")), ("sek", ("Volksschulgemeinde", "Sekundarschulgemeinde"))):
            treffer = [s for s in sgs if s["typ"] in typen and name in s["mitglieder"]]
            vermutet = [s for s in sgs if s["typ"] in typen and name in s["mitglieder_unsicher"]]
            vielleicht = [s for s in sgs if s["typ"] in typen and s["bezirk"] == g["bezirk"] and (not s["mitglieder_sicher"] or name in s["mitglieder_unsicher"]) and s not in treffer]
            if treffer: stufen[stufe] = (treffer[0]["name"], True)
            elif vermutet: stufen[stufe] = (vermutet[0]["name"], False)
            elif vielleicht: stufen[stufe] = ("Gemeinde", False)
            else: stufen[stufe] = ("Gemeinde", True)
        fix = STUFE_FIX.get(name)
        if fix:
            if fix[0]: stufen["primar"] = (fix[0], True)
            if fix[1]: stufen["sek"] = (fix[1], True)
        p, s = stufen["primar"], stufen["sek"]
        if p[0] == "Gemeinde" and s[0] == "Gemeinde": text = "Einheitsgemeinde"
        elif p[0] == "Gemeinde": text = "Einheitsgemeinde Primarstufe"
        elif s[0] == "Gemeinde": text = "Einheitsgemeinde Sekundarstufe"
        else: text = "keine Einheitsgemeinde"
        sicher = p[1] and s[1]
        g["einheit"] = text if sicher else text + " ?"
        g["einheit_sicher"] = sicher
        g["schultraeger"] = {"primar": p[0], "sek": s[0]}
    return gemeinden

# ---------------------------------------------------------------- Struktur-Matrix (Menü › Untermenü › Dokument × Organisation)
def norm(t):
    t = t.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("é", "e"), ("_", " "), ("-", " ")): t = t.replace(a, b)
    return re.sub(r"\s+", " ", t)
BEHOERDE = r"beschluss|beschluesse|protokoll|verhandlungsbericht|traktand|abnahme|einladung|ankuendigung|praesentation|beleuchtend|formularsatz|wahl|konstituierung|interessenbindung"
ERLASS = r"reglement|verordnung|statut|ordnung|vertrag"
# (Menü, Untermenü, Dokument, sicher-Muster, unsicher-Muster, Sammelzeile)
NICHT_SR = "Gehört nicht in die SR (Leitfaden Ziff. 7)"
KATALOG = [
 ("1 Gemeinde – Behörden – Verwaltung", "Organisation", "Gemeindeordnung", r"gemeindeordnung|\(go\)", None, False),
 ("1 Gemeinde – Behörden – Verwaltung", "Organisation", "Organisationsreglement / -statut / Geschäftsordnung Exekutive", r"organisationsreglement|organisationsstatut|organisations und verwaltungsreglement|geschaeftsordnung(?! planungsgruppe| stiftung)|\borgr\b|\borgg\b|orss", r"geschaeftsreglement (schulpflege|gemeinderat)", False),
 ("1 Gemeinde – Behörden – Verwaltung", "Organisation", "Geschäftsreglemente Kommissionen/Ausschüsse", r"geschaeftsreglement", None, True),
 ("1 Gemeinde – Behörden – Verwaltung", "Organisation", "Funktionendiagramm / Kompetenzen", r"funktionendiagramm|ausgabenkompetenz|finanzkompetenz|zustaendigkeiten|kompetenzregelung", r"rechnungsvisum", False),
 ("1 Gemeinde – Behörden – Verwaltung", "Organisation", "Organigramm", r"organigramm", None, False),
 ("1 Gemeinde – Behörden – Verwaltung", "Organisation", "Amtliche Publikationen / Publikationsorgan", r"publikation", r"dorfziitig", False),
 ("1 Gemeinde – Behörden – Verwaltung", "Personal und Entschädigung", "Entschädigungsverordnung Behörden", r"entschaedigungsverordnung|entschaedigungsreglement|\bevo\b|entschaedigung (der )?behoerde", r"entschaedigung(?!s? und sold)", False),
 ("1 Gemeinde – Behörden – Verwaltung", "Personal und Entschädigung", "Personalverordnung / -reglement", r"personalverordnung|personalreglement|\bpevo\b|\bpvo\b|personal und entschaedigungsverordnung", None, False),
 ("1 Gemeinde – Behörden – Verwaltung", "Personal und Entschädigung", "Vollzugs-/Ausführungsbestimmungen", r"(vollzug|vollziehung|ausfuehrung)s?(bestimmungen|reglement) zur (personal|entschaedigung)|vollziehungsbestimmungen", None, False),
 ("1 Gemeinde – Behörden – Verwaltung", "Personal und Entschädigung", "Arbeitszeit, Spesen, Weiterbildung, Urlaub", r"arbeitszeit|spesen|weiterbildung|urlaub", None, True),
 ("1 Gemeinde – Behörden – Verwaltung", "Information und Datenschutz", "Verzeichnis der Informationsbestände", r"informationsbest", None, False),
 ("1 Gemeinde – Behörden – Verwaltung", "Information und Datenschutz", "Informationssicherheit, Informatik, Archiv", r"informationssicherheit|internet|informatik|gever|einwohnerregister", None, True),
 ("2 Zivilrecht", "Zusammenarbeit", "Kindes- und Erwachsenenschutz (KESB)", r"erwachsenenschutz|kesb|kesr|berufsbeist", None, True),
 ("2 Zivilrecht", "Zusammenarbeit", "Zivilstandskreis", r"zivilstand", None, False),
 ("2 Zivilrecht", "Zusammenarbeit", "Betreibungskreis", r"betreibung", None, False),
 ("4 Schule – Bildung – Sport – Freizeit", "Schulbetrieb", "Klassenlager, Schulreisen, Sportlager", r"klassenlager|schulreise|skilager|wintersport|sportlager|exkursion|projektwoche", None, True),
 ("4 Schule – Bildung – Sport – Freizeit", "Schulbetrieb", "Hausordnung / Hausregeln", r"hausordnung(?! sammelstelle)|hausregeln|aufenthaltsraum", None, False),
 ("4 Schule – Bildung – Sport – Freizeit", "Schulbetrieb", "Elternrat / Elternmitwirkung", r"elternrat", None, False),
 ("4 Schule – Bildung – Sport – Freizeit", "Schulbetrieb", "Bild- und Tonaufnahmen", r"foto|aufnahmen", None, False),
 ("4 Schule – Bildung – Sport – Freizeit", "Schulbetrieb", "Schulweg / Schülertransport", r"schulweg|schuelertransport|schulbus reglement|schulbus_reglement", None, False),
 ("4 Schule – Bildung – Sport – Freizeit", "Schulbetrieb", "Schulzahnpflege", r"zahnpflege|schulzahn|zahlnpflege", None, False),
 ("4 Schule – Bildung – Sport – Freizeit", "Schulbetrieb", "Schulgelder / Beiträge", r"schulgeld|schulbeitr|sozialbeitr", None, True),
 ("4 Schule – Bildung – Sport – Freizeit", "Schulbetrieb", "Mittelschulvorbereitung", r"mittelschul|gymi", None, False),
 ("4 Schule – Bildung – Sport – Freizeit", "Betreuung", "Familien- und schulergänzende Betreuung", r"kinderbetreuung|schulergaenzende betreuung|familienergaenzend|\bkibe\b|\bfeb\b|hort|ferienbetreuung", r"betreuung", True),
 ("4 Schule – Bildung – Sport – Freizeit", "Betreuung", "Elternbeiträge / Tarife Betreuung", r"elternbeitrag|tarife schul", None, False),
 ("4 Schule – Bildung – Sport – Freizeit", "Anlagen und Freizeit", "Benützung / Vermietung von Anlagen", r"benuetzung|benutzung|vermietung|nutzungsreglement|nutzungsordnung|badeordnung|badereglement|betriebsreglement", None, True),
 ("4 Schule – Bildung – Sport – Freizeit", "Anlagen und Freizeit", "Vereinsunterstützung", r"verein", None, True),
 ("4 Schule – Bildung – Sport – Freizeit", "Anlagen und Freizeit", "Bibliothek / Musikschule", r"bibliothek|ludothek|musikschul", None, True),
 ("5 Sicherheit", "Polizei", "Polizeiverordnung", r"polizeiverordnung|\bpolvo\b", None, False),
 ("5 Sicherheit", "Polizei", "Ordnungsbussen", r"bussen", None, False),
 ("5 Sicherheit", "Polizei", "Videoüberwachung", r"video", None, True),
 ("5 Sicherheit", "Polizei", "Parkieren / Nachtparkieren", r"nachtpark|parkier|parkplatz|parkhaus|velopark", None, True),
 ("5 Sicherheit", "Feuerwehr und Zivilschutz", "Feuerwehr", r"feuerwehr", None, True),
 ("5 Sicherheit", "Feuerwehr und Zivilschutz", "Zivilschutz / Sicherheitsverbund", r"zivilschutz|sicherheitsverbund|sicherheits zweckverband|katastroph", None, True),
 ("6 Finanzen – Steuern – Gebühren", "Gebühren", "Gebührenverordnung", r"gebuehrenverordnung(?! (ueber|fuer|im|der wasser))|\bgebvo\b(?! wvvo)", r"gebuehrenreglement(?! (zur|der feuerwehr|wasser|siedlung|abfall))|gebuehrenordnung", False),
 ("6 Finanzen – Steuern – Gebühren", "Gebühren", "Gebührentarif", r"gebuehrentarif|allgemeiner gebuehrentarif", r"\btarif|gebuehren", False),
 ("6 Finanzen – Steuern – Gebühren", "Haushalt", "Haushaltführung / HRM2 / Aktivierungsgrenze", r"hrm2|haushalt|aktivierung|globalbudget|restatement", None, True),
 ("6 Finanzen – Steuern – Gebühren", "Haushalt", "Finanz- und Aufgabenplan", r"aufgabenplan|investitionsprogramm", None, True),
 ("6 Finanzen – Steuern – Gebühren", "Haushalt", "Steuern", r"steuer", None, True),
 ("7 Raumplanung – Bauen – Umwelt", "Bauen", "Bau- und Zonenordnung", r"bau und zonenordnung|\bbzo\b", None, False),
 (NICHT_SR, "Raumpläne – Hinweis genügt (ÖREB-Kataster)", "Zonen- und Kernzonenpläne", r"zonenplan", None, True),
 ("7 Raumplanung – Bauen – Umwelt", "Bauen", "Gebühren Bauwesen", r"(gebuehren|tarif)\w* (im )?(kommunalen )?bauwesen|gebuehren im bauwesen", None, False),
 ("7 Raumplanung – Bauen – Umwelt", "Bauen", "Regionale Planungsgruppe", r"planungsgruppe|regionalkonferenz|\bzpw\b|\bzpp\b", None, True),
 ("7 Raumplanung – Bauen – Umwelt", "Ver- und Entsorgung", "Wasserversorgung", r"wasserversorg|\bwvvo\b|\bwv\b|gebuehrenblatt wasser|seewasserwerk", None, True),
 ("7 Raumplanung – Bauen – Umwelt", "Ver- und Entsorgung", "Siedlungsentwässerung / Abwasser", r"siedlungsentwaesserung|abwasser|\bsevo\b|\bara\b", None, True),
 ("7 Raumplanung – Bauen – Umwelt", "Ver- und Entsorgung", "Abfall", r"abfall|kehricht", None, True),
 ("7 Raumplanung – Bauen – Umwelt", "Natur und Landschaft", "Natur-, Landschafts- und Denkmalschutz", r"natur|landschaft|denkmal", None, True),
 ("8 Soziales – Gesundheit", "Soziales", "Zusatzleistungen / Sozialhilfe / Asyl", r"zusatzleistung|sozialhilfe|asyl|fuersorge", None, True),
 ("8 Soziales – Gesundheit", "Gesundheit", "Friedhof und Bestattung", r"friedhof|grabmal|bestattung", None, True),
 ("8 Soziales – Gesundheit", "Gesundheit", "Pflege, Alter, Spitex", r"pflege(?!heim eichi)|alters|spitex|\bkzu\b|palliativ|senectute|pflegeheim", None, True),
 ("8 Soziales – Gesundheit", "Gesundheit", "Spital", r"spital", None, True),
 ("9 Wirtschaft – Landwirtschaft – Gewerbe", "Wirtschaft", "Forst, Jagd, Landwirtschaft", r"forst|jagd|pacht|landwirtschaft|bodenverbesserung|befoersterung", None, True),
 ("9 Wirtschaft – Landwirtschaft – Gewerbe", "Wirtschaft", "Markt / Gewerbe", r"markt|gewerbe", None, True),
 ("Übergreifend", "Zusammenarbeit", "Statuten Zweckverbände / Anstalten", r"statuten|anstaltsvertrag|verbandsordnung|zweckverband", None, True),
 ("Übergreifend", "Zusammenarbeit", "Anschluss- und Zusammenarbeitsverträge", r"anschlussvertrag|zusammenarbeitsvertrag|leistungsvereinbarung|vereinbarung|vertrag", None, True),
 (NICHT_SR, "Gemeindeversammlung", "Unterlagen / Einladungen", r"gemeindeversammlung|einladung|ankuendigung|beleuchtend|formularsatz|praesentation", None, True),
 (NICHT_SR, "Gemeindeversammlung", "Protokolle und Beschlüsse GV", r"protokoll gv|protokoll gemeindeversammlung|gemeindeversammlungsbeschluesse|beschluss gemeindeversammlung|beschluesse gemeindeversammlung|^protokoll$|^beschluesse$", None, True),
 (NICHT_SR, "Behörde", "Verhandlungsberichte", r"verhandlungsbericht", None, True),
 (NICHT_SR, "Behörde", "Öffentliche Beschlüsse", r"beschluss|zirkularbeschluss|protokollauszug", None, True),
 (NICHT_SR, "Behörde", "Wahlen und Konstituierung", r"wahl|konstituierung|interessenbindung", None, True),
]
JAHRE = list(range(2027, 2019, -1))
BEHOERDEN_ZEILEN = {55, 56, 57, 58, 59}

def matrix():
    zeilen = [{"menu": m, "unter": u, "dok": d, "key": f"k{i}", "sammel": s} for i, (m, u, d, *_ , s) in enumerate(KATALOG)]
    for art in ("Jahresrechnung", "Budget"):
        for j in JAHRE:
            zeilen.append({"menu": NICHT_SR, "unter": "Jahresrechnungen (Beschluss)" if art == "Jahresrechnung" else "Budgets", "dok": f"{art} {j}", "key": f"{art[0]}{j}", "sammel": False})
    reihen = {z["key"]: i for i, z in enumerate(zeilen)}
    zellen, rest = {}, {}
    for o in ORGS:
        urls_gesehen = {}
        def setze(key, d, status, hinweis=""):
            c = zellen.setdefault(key, {}).setdefault(o["id"], {"status": "ja", "docs": [], "hinweise": []})
            c["docs"].append({"titel": d["titel"], "url": d.get("url"), "ablage": None})
            if status == "unsicher" and c["status"] == "ja" and len(c["docs"]) == 1: c["status"] = "unsicher"
            elif status == "ja": c["status"] = "ja"
            if hinweis: c["hinweise"].append(hinweis)
        def besuche(n, pfad):
            for d in n.get("dokumente", []):
                t = norm(d["titel"] + " " + d.get("nummer", "") + " " + pfad)
                titel = norm(d["titel"])
                pf = norm(pfad)
                behoerde = (re.search(BEHOERDE, titel) or re.search(r"beschl|verhandlungsbericht|gemeindeversammlung", pf)) and not re.search(ERLASS, titel)
                getroffen = False
                # Jahresrechnung / Budget je Jahr
                m = re.search(r"(jahresrechnung|\bjr\b|rechnung|budget|voranschlag)\D{0,25}?(20\d\d)", titel) or (re.search(r"(20\d\d)\D{0,30}(jahresrechnung|budget|voranschlag)", titel))
                if m and not re.search(r"beschluss|abnahme|revision|pruefbericht", titel):
                    jahr = next(g for g in m.groups() if g and g.isdigit()); art = "B" if re.search(r"budget|voranschlag", titel) else "J"
                    if int(jahr) in JAHRE:
                        hinweis, st = "", "ja"
                        url_jahre = set(re.findall(r"(20\d\d)", (d.get("url") or "").rsplit("/", 1)[-1])) - {jahr}
                        if url_jahre and art == "J" and not re.search(jahr, (d.get("url") or "")):
                            st, hinweis = "unsicher", f"Link zeigt auf Datei mit Jahr {', '.join(sorted(url_jahre))}"
                        setze(f"{'Jahresrechnung'[0] if art == 'J' else 'B'}{jahr}", d, st, hinweis); getroffen = True
                    if not getroffen: getroffen = True
                if not getroffen:
                    treffer = []
                    for i, (_, _, _, stark, schwach, _) in enumerate(KATALOG):
                        ist_behoerde_zeile = i in BEHOERDEN_ZEILEN
                        if behoerde and not ist_behoerde_zeile: continue
                        if not behoerde and ist_behoerde_zeile and not re.search(r"gemeindeversammlung|protokoll|beschlu", titel): continue
                        st = "ja" if re.search(stark, titel) else "unsicher" if schwach and re.search(schwach, titel) else None
                        if st: treffer.append((i, st))
                    if any(i == 8 for i, _ in treffer): treffer = [(i, st) for i, st in treffer if i not in (6, 7)]
                    einzel = [i for i, _ in treffer if not KATALOG[i][5]]
                    for i, st in treffer:
                        hinweis = ""
                        if not d.get("url"): st, hinweis = "unsicher", "kein Link"
                        u = d.get("url")
                        if u and u in urls_gesehen and urls_gesehen[u] != d["titel"]:
                            st, hinweis = "unsicher", f"gleiche Datei wie «{urls_gesehen[u]}»"
                        if i == 0 and "sekundarschul" in titel and o["typ"] == "Politische Gemeinde":
                            st, hinweis = "unsicher", "Gemeindeordnung der Sekundarschulgemeinde (Fremderlass)"
                        if len(einzel) > 1 and i in einzel and st == "ja":
                            st, hinweis = "unsicher", "kombinierter Erlass – mehreren Zeilen zugeordnet"
                        setze(f"k{i}", d, st, hinweis); getroffen = True
                if not getroffen and behoerde:
                    ziel = 58 if re.search(r"beschl", pf) else 55 if re.search(r"gemeindeversammlung", pf) else 57 if "verhandlungsbericht" in pf else None
                    if ziel is not None: setze(f"k{ziel}", d, "unsicher", "nur über den Ordner zugeordnet"); getroffen = True
                if d.get("url"): urls_gesehen.setdefault(d["url"], d["titel"])
                if not getroffen: rest.setdefault(o["id"], []).append({"titel": d["titel"], "url": d.get("url"), "pfad": pfad})
            for k in n.get("kinder", []): besuche(k, pfad + " › " + k["titel"])
        for s in o["sections"]: besuche(s, s["titel"])
    # Zeilen ohne Treffer bei allen Organisationen weglassen (ausser Katalog-Pflichtzeilen der Rubrik 1)
    zeilen = [z for z in zeilen if z["key"] in zellen or z["menu"].startswith("1 ")]
    zeilen.sort(key=lambda z: 2 if z["menu"] == NICHT_SR else 1 if z["menu"] == "Übergreifend" else 0)  # stabil: Reihenfolge innerhalb bleibt
    pz, pzellen, pzus = pflicht_matrix()
    zellen.update(pzellen)
    return {"zeilen": pz + zeilen, "zellen": zellen, "nicht_zugeordnet": rest, "pflicht": pzus}

# ---------------------------------------------------------------- Pflichtkatalog Schulgemeinde (Auftrag 20.11.2026)
# Quelle: Recherche des Auftraggebers (data/pflichtkatalog.json, Original in quellen/). Einstufung P/B/O, fachlich zu prüfen.
PFLICHT_MENU = "0 Pflichtkatalog Schulgemeinde (Recherche, zu prüfen)"
def pflichtkatalog():
    return json.loads((ROOT / "data" / "pflichtkatalog.json").read_text(encoding="utf-8"))

def pflicht_relevanz(o):
    """Gilt der Katalog für die Rechtssammlung dieser Organisation?"""
    if o["typ"] != "Politische Gemeinde": return "ja", "Schulgemeinde bzw. Schule"
    if not (o.get("einheit") or "").startswith("Einheitsgemeinde"): return "nein", "Politische Gemeinde ohne Schulaufgaben – Schule hat eigene Rechtssammlung"
    if any(x["typ"] == "Schule der Einheitsgemeinde" and x.get("sitz") == o.get("sitz") for x in ORGS):
        return "teilweise", "Einheitsgemeinde – Schulerlasse in der eigenen Sammlung der Schule erfasst"
    return "ja", "Einheitsgemeinde – Schulerlasse in der Rechtssammlung der Gemeinde"

def pflicht_matrix():
    PK = pflichtkatalog()
    zeilen, zellen, zus = [], {}, {}
    for kat in PK["kategorien"]:
        for e in kat["eintraege"]:
            zeilen.append({"menu": PFLICHT_MENU, "unter": f"{kat['nr']} {kat['titel']}", "dok": e["dokument"], "key": e["id"], "sammel": False,
                           "stufe": e["stufe"], "pflicht": True, "aufnahme": e["aufnahme"]})
    for o in ORGS:
        rel, grund = pflicht_relevanz(o)
        z = {"relevanz": rel, "grund": grund, "stufen": {st: [0, 0] for st in "PBO"}}
        docs = []
        for sec in o["sections"]:
            for d in walk(sec):
                t = norm(d["titel"])
                if re.search(BEHOERDE, t) and not re.search(ERLASS, t): continue
                docs.append((t, d))
        for kat in PK["kategorien"]:
            for e in kat["eintraege"]:
                z["stufen"][e["stufe"]][1] += 1
                c = None
                for t, d in docs:
                    if e.get("ohne") and re.search(e["ohne"], t): continue
                    st = "ja" if re.search(e["muster"], t) else "unsicher" if e.get("muster_unsicher") and re.search(e["muster_unsicher"], t) else None
                    if not st: continue
                    c = c or {"status": st, "docs": [], "hinweise": []}
                    if st == "ja": c["status"] = "ja"
                    c["docs"].append({"titel": d["titel"], "url": d.get("url"), "ablage": None})
                if c:
                    if c["status"] == "unsicher": c["hinweise"].append("nur ähnlicher Titel")
                    zellen.setdefault(e["id"], {})[o["id"]] = c
                    if c["status"] == "ja": z["stufen"][e["stufe"]][0] += 1
        zus[o["id"]] = z
    return zeilen, zellen, zus

# ---------------------------------------------------------------- Leitfaden systematische Rechtssammlung (Gemeindeamt/VZGV 2018/2019)
LEITFADEN = {
 "titel": "Leitfaden zum Aufbau einer systematischen Rechtssammlung",
 "herausgeber": "Gemeindeamt Kanton Zürich mit VZGV, Juni 2018, Ergänzung Februar 2019",
 "quelle": "https://www.zh.ch/de/politik-staat/gemeinden/gemeindeorganisation.html",
 "original": "https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/politik-staat/gemeinden/gemeindeorganisation/leitfaden_systematische_rechtssammlung.docx",
 "ablage_docx": "quellen/leitfaden_systematische_rechtssammlung.docx",
 "ablage_pdf": "quellen/leitfaden_systematische_rechtssammlung.pdf",
 "rechtsgrundlagen": [
   {"kurz": "GG", "titel": "Gemeindegesetz", "ls": "131.1", "stelle": "§ 7 Abs. 2 – Recht in einer systematisch aufgebauten Rechtssammlung veröffentlichen", "url": "http://www.zhlex.zh.ch/Erlass.html?Open&Ordnr=131.1"},
   {"kurz": "VGG", "titel": "Gemeindeverordnung", "ls": "131.11", "stelle": "§ 2 – Inhalt, Gliederung nach Sachgebieten, Veröffentlichung im Internet", "url": "http://www.zhlex.zh.ch/Erlass.html?Open&Ordnr=131.11"}],
 "anforderungen": [
   ("3", "Recht nach Sachgebieten gliedern – logisch, übersichtlich; eine alphabetische Liste genügt nicht"),
   ("3", "Für kleinere und mittlere Gemeinden höchstens neun Sachgebiete; jedes Dokument genau einem Sachgebiet"),
   ("3", "Jedes Dokument mit eindeutiger Nummer, die mit der Ziffer des Sachgebiets beginnt"),
   ("3", "Gliederung starr halten, vorab festlegen, im Internet veröffentlichen"),
   ("3", "Nur aktuell geltendes Recht; aufgehobene Erlasse entfernen, Revisionen einbauen (Nachführungspflicht)"),
   ("3", "Vollständig; vor Veränderung durch Unberechtigte geschützt; spätestens ab 1.1.2022"),
   ("5", "Bezeichnung: Gemeindeerlass = Verordnung (Ausnahme Gemeindeordnung, BZO = Ordnung), Behördenerlass = Reglement"),
   ("6", "In die SR: alle Erlasse und rechtsetzenden interkommunalen Verträge (Anschluss-, Zusammenarbeitsverträge, Zweckverbandsstatuten, Anstaltsordnungen)"),
   ("7", "Nicht in die SR: Verfügungen/Beschlüsse (z. B. Budget-, Kredit-, Wahlbeschluss), Allgemeinverfügungen, Raumpläne, Verwaltungsverordnungen, nicht rechtsetzende Verträge"),
   ("7", "Raumpläne: Hinweis genügt (Richtpläne mit Festsetzungsdatum, Nutzungspläne über den ÖREB-Kataster)"),
   ("8", "Generell-abstrakte «Beschlüsse» (z. B. Haushaltsgleichgewicht) gehören in die SR; Konzepte/Leitbilder nur, wenn als «nichtrechtsetzend» gekennzeichnet"),
   ("9", "Systematik nach Kanton/Bund (Anhang 1 bzw. 2), nicht nach Ressorts, Verwaltungsabteilungen oder Archivplan"),
   ("10", "Zweckverbände und gemeinsame Anstalten: Recht im Internet, alphabetisch genügt"),
   ("Anhang 1", "Sachgebiet «Schule» auch in politischen Gemeinden ohne Schulaufgaben führen"),
 ],
 "anhang1": [("1", "Gemeinde – Behörden – Verwaltung – Bevölkerung", "Organisationserlasse, Personalrecht, Entschädigung, Kompetenzen, Publikationen, Datenschutz, Archiv, Informatik"),
             ("2", "Zivilrecht – Familienrecht – Grundbuch – Notariat – Schuldbetreibung & Konkurs", "Kindes- und Erwachsenenschutz, Zivilstandswesen, Friedensrichter"),
             ("3", "Strafrecht – Opferhilfe – Gewaltschutz", ""),
             ("4", "Schule & Bildung – Sport – Freizeit – Kultur", "Kindergarten, Primar- und Sekundarschule, Bibliothek, Vereine, Benutzung Schulliegenschaften"),
             ("5", "Öffentliche Ordnung & Sicherheit: Polizei – Zivilschutz – Feuerwehr & Feuerpolizei – Tierschutz", "Polizeiverordnung, Schiessanlagen, Hundehaltung"),
             ("6", "Finanzen – Steuern – Gebühren", "allgemeine, themenübergreifende Gebührenerlasse"),
             ("7", "Raumplanung – Bauen – Umwelt – Energie – Verkehr", "BZO, Beschaffung, Entsorgung, Versorgung, Strassen, Parkierung, Verkehr"),
             ("8", "Soziales – Gesundheit – Arbeit", "Sozialhilfe, Ergänzungsleistungen, Asyl, Friedhof, Pflege, Spitex, Spital"),
             ("9", "Wirtschaft – Landwirtschaft – Gewerbe", "Jagd, Fischerei, Forst, Chilbi, Markt")],
 "anhang2": [("1", "Gemeinde – Behörden – Verwaltung", "Organisationsstatut, Organisationserlasse, Entschädigung Schulpflege, Personalrecht, Informationsverwaltung"),
             ("2", "Schulbetrieb: Kindergarten, Primar- & Sekundarschule", "Hausordnung, Jokertage, Dispensation, Klassenlager, Sonderschule, Schulpsychologischer Dienst"),
             ("3", "Schulergänzende Angebote", "Musikschule, Freifächer, Bibliothek, Aufgabenhilfe, Tagesstrukturen, Schülertransport, Schulweg"),
             ("4", "Sport und Freizeit", "Schwimmreglement, Benutzung Sportanlagen, Gebühren Sportanlagen, freiwillige Lager"),
             ("5", "Finanzen – Gebühren", "allgemeine, themenübergreifende Gebührenerlasse")],
 "ls_ordner": [("1", "101–176", "Verfassung – Kantonsgebiet – Gemeinden – Bürgerrecht – Politische Rechte – Behörden"), ("2", "177–184", "Staatspersonal – Kirchen – Religionsgemeinschaften"),
   ("3", "211–255", "Gerichtsorganisation – Zivilrecht – Notariat – Grundbuch"), ("4", "281–351", "Schuldbetreibung und Konkurs – Strafrecht – Strafvollzug – Opferhilfe – Gewaltschutz"),
   ("5", "410–412", "Bildung – Volksschule"), ("6", "413", "Mittelschulen – Berufsbildung"), ("7", "414", "Fachhochschulen"), ("8", "415–440", "Universität – Dokumentation – Kultur"),
   ("9", "511–554", "Militär – Bevölkerungsschutz – Polizei"), ("10", "611–691", "Finanzhaushalt – Steuern – Gebühren"), ("11", "700–715", "Raumplanung – Baurecht – Umweltschutz"),
   ("12", "720–782", "Beschaffungswesen – Strassen – Wasserwirtschaft – Energie – Verkehr – Enteignung"), ("13", "810–857", "Gesundheit – Arbeit – Sozialversicherung – Fürsorge"),
   ("14", "861–954", "Feuerpolizei – Landwirtschaft – Wald und Jagd – Industrie und Gewerbe – Handel – Banken")],
}
ARTEN = {"gemeindeerlass": "Gemeindeerlass (Verordnung/Ordnung)", "behoerdenerlass": "Behördenerlass (Reglement)", "vertrag": "Rechtsetzender Vertrag / Statuten",
         "nicht_rechtsetzend": "Nicht rechtsetzend (Konzept, Merkblatt, Richtlinie …)", "raumplan": "Raumplan (Hinweis genügt)",
         "nicht_sr": "Gehört nicht in die SR (Beschluss, Budget, Protokoll …)", "unklar": "Unklar – prüfen"}

def art(d, pfad):
    """Einordnung nach Leitfaden Ziff. 5–8 und Anhang 3 – nur anhand Titel und Ablageort (Anhaltspunkt, keine Rechtsprüfung)."""
    t, pf = norm(d["titel"]), norm(pfad)
    if re.search(r"zonenplan|richtplan|verkehrsplan|gestaltungsplan|quartierplan|ergaenzungsplan|quartiererhaltungszone", t): return "raumplan"
    if re.search(r"jahresrechnung|\bbudget|voranschlag|formularsatz|rechnung 20|pruefbericht|revisionsbericht", t) and not re.search(r"verordnung|reglement", t): return "nicht_sr"
    if (re.search(BEHOERDE, t) or re.search(r"beschl|verhandlungsbericht|gemeindeversammlung", pf)) and not re.search(r"reglement|verordnung|statut|ordnung|vertrag", t):
        return "nicht_sr"
    if re.search(r"konzept|merkblatt|leitbild|leitfaden|anleitung|formular|antrag|gesuch|bestaetigung|elterninformation|lieder|linksammlung|flyer|abc der|kresse|leistungsvereinbarung|richtlinie|angebot|konstituierung|organigramm|verzeichnis der informationsbestaende|funktionendiagramm|interessenbindung", t):
        return "nicht_rechtsetzend"
    if re.search(r"organisationsstatut", t): return "behoerdenerlass"
    if re.search(r"statuten|anschlussvertrag|zusammenarbeitsvertrag|anstaltsvertrag|vertrag|vereinbarung|verbandsordnung|stiftungsurkunde", t): return "vertrag"
    if re.search(r"verordnung|gemeindeordnung|zonenordnung|\bgo\b|\bbzo\b|\bevo\b|\bpvo\b|\bgebvo\b|\bpolvo\b|\bavo\b|\bsevo\b|\bwvvo\b", t): return "gemeindeerlass"
    if re.search(r"reglement|ordnung|tarif|bestimmungen|statut", t): return "behoerdenerlass"
    return "unklar"

def leitfaden_pruefung(o):
    """Prüfpunkte je Organisation aus dem Leitfaden. Status: ja / unsicher / nein / info."""
    ist_pg = o["typ"] == "Politische Gemeinde"
    docs = [(d, s["titel"] + " " + pfad) for s in o["sections"] for d, pfad in _alle(s, "")]
    n = len(docs) or 1
    arten = {}
    for d, pf in docs:
        a = art(d, pf); d["art"] = a; arten[a] = arten.get(a, 0) + 1
    P = []
    def p(ziffer, titel, status, text): P.append({"ziffer": ziffer, "titel": titel, "status": status, "text": text})
    # Ziff. 3 – Gliederung nach Sachgebieten
    nummeriert = [s for s in o["sections"] if re.match(r"^\s*(SR\s*-\s*)?\d", s["titel"])]
    if len(o["sections"]) >= 3 and len(nummeriert) >= len(o["sections"]) - 1:
        p("3", "Nach Sachgebieten gegliedert", "ja", f"{len(o['sections'])} Sachgebiete/Rubriken, nummeriert.")
    elif len(o["sections"]) >= 3:
        p("3", "Nach Sachgebieten gegliedert", "unsicher", f"{len(o['sections'])} Rubriken, aber ohne Sachgebietsziffern.")
    else:
        p("3", "Nach Sachgebieten gegliedert", "nein", "Keine Gliederung nach Sachgebieten (nur eine Liste/Tabelle).")
    # Ziff. 3 – höchstens neun Sachgebiete
    p("3", "Höchstens neun Sachgebiete", "ja" if len(o["sections"]) <= 9 else "nein", f"{len(o['sections'])} Rubriken auf oberster Ebene.")
    # Ziff. 9 / Anhang – Systematik
    ziel = LEITFADEN["anhang1"] if ist_pg else LEITFADEN["anhang2"]
    def kern(x): return set(w for w in re.findall(r"[a-zäöü]{5,}", x.lower()))
    treffer = sum(1 for nr, tit, _ in ziel if any(kern(tit) & kern(s["titel"]) for s in o["sections"]))
    anteil = treffer / len(ziel)
    p("9", "Systematik nach Leitfaden (Anhang 1 bzw. 2)",
      "ja" if anteil >= .8 else "unsicher" if anteil >= .4 else "nein",
      f"{'Anhang 1 (politische Gemeinde)' if ist_pg else 'Anhang 2 (Schulgemeinde)'}: {treffer} von {len(ziel)} empfohlenen Sachgebieten erkennbar.")
    # Ziff. 3 – eindeutige Nummer mit Sachgebietsziffer
    mit_nr = 0
    for s in o["sections"]:
        sz = (re.match(r"^\s*(?:SR\s*-\s*)?0?(\d)", s["titel"]) or [None, None])[1]
        for d, _ in _alle(s, ""):
            nr = d.get("nummer") or (re.match(r"^\s*(\d{3}(?:\.\d+)*)", d["titel"]) or [None, ""])[1] or ""
            if nr and sz and nr.lstrip("0").startswith(sz): mit_nr += 1
    q = mit_nr / n
    p("3", "Eindeutige Nummer je Dokument (beginnt mit Sachgebietsziffer)", "ja" if q >= .9 else "unsicher" if q >= .4 else "nein", f"{mit_nr} von {len(docs)} Dokumenten ({q:.0%}).")
    # Ziff. 7 – nur Erlasse und rechtsetzende Verträge
    fremd = arten.get("nicht_sr", 0)
    p("7", "Keine Beschlüsse, Budgets, Rechnungen, Protokolle", "ja" if fremd == 0 else "unsicher" if fremd / n <= .1 else "nein",
      "Keine gefunden." if fremd == 0 else f"{fremd} von {len(docs)} Dokumenten gehören nicht in die SR ({fremd / n:.0%}).")
    rp = arten.get("raumplan", 0)
    p("7", "Raumpläne nur als Hinweis", "info" if rp else "ja", f"{rp} Raumpläne (Zonen-/Kernzonen-/Richtpläne) als Dokument abgelegt – zulässig, Hinweis auf ÖREB-Kataster genügt." if rp else "Keine Raumpläne abgelegt.")
    # Ziff. 8 – nicht rechtsetzende Dokumente gekennzeichnet
    nr_ = arten.get("nicht_rechtsetzend", 0)
    p("8", "Nicht rechtsetzende Dokumente gekennzeichnet", "ja" if nr_ == 0 else "unsicher",
      "Keine gefunden." if nr_ == 0 else f"{nr_} Konzepte/Merkblätter/Richtlinien o. Ä. ohne Kennzeichnung «nichtrechtsetzend».")
    # Ziff. 3 – nur geltendes Recht
    aufg = {"pg-meilen": mei_aufgehoben, "pg-winkel": win_aufgehoben, "pg-duebendorf": due_aufgehoben, "pg-fehraltorf": feh_aufgehoben}.get(o["id"], 0)
    p("3", "Nur geltendes Recht (keine aufgehobenen Erlasse)", "unsicher" if aufg else "info",
      f"{aufg} aufgehobene Erlasse stehen weiterhin als Zeile in der Liste." if aufg else "Aus der Website nicht prüfbar (Inkraft-/Aufhebungsdaten fehlen meist).")
    # Ziff. 6 – interkommunale Verträge
    v = arten.get("vertrag", 0)
    p("6", "Rechtsetzende interkommunale Verträge enthalten", "ja" if v else ("info" if not ist_pg else "unsicher"), f"{v} Verträge/Statuten." if v else "Keine Verträge oder Statuten gefunden.")
    # Ziff. 5 – Bezeichnung
    ge, be = arten.get("gemeindeerlass", 0), arten.get("behoerdenerlass", 0)
    p("5", "Bezeichnung der Erlasse (Verordnung / Reglement)", "info", f"{ge} als Verordnung/Ordnung, {be} als Reglement o. Ä. bezeichnet, {arten.get('unklar', 0)} unklar. Ob Legislative oder Exekutive erlassen hat, ist aus dem Titel nicht prüfbar.")
    # Anhang 1 – Sachgebiet Schule
    if ist_pg:
        s4 = next((s for s in o["sections"] if re.match(r"^\s*0?4\b", s["titel"])), None)
        einheit = o.get("einheit", "")
        schul = 0
        if s4:
            schul = sum(1 for d, _ in _alle(s4, "") if re.search(r"schul|primar|sekundar|kindergarten|hort|lager", norm(d["titel"])))
        anderswo = {}
        for s in o["sections"]:
            if s is s4: continue
            k = sum(1 for d, _ in _alle(s, "") if re.search(r"schul|primar|sekundar|kindergarten|lager", norm(d["titel"])))
            if k >= 2: anderswo[s["titel"]] = k
        if einheit.startswith("Einheitsgemeinde"):
            if schul >= 2: st, txt = "ja", f"{schul} Schul-Erlasse im Sachgebiet 4."
            elif anderswo:
                st, txt = "unsicher", "Schul-Erlasse stehen in der SR, aber nicht im Sachgebiet 4 (Leitfaden Anhang 1): " + "; ".join(f"{k} in «{t}»" for t, k in anderswo.items()) + "."
            else:
                st, txt = "unsicher", f"{schul} Schul-Erlasse im Sachgebiet 4. Die Schule ist Teil der Gemeinde – ihre Erlasse gehören in diese SR; prüfen, ob sie nur auf der Schul-Website stehen."
            p("Anhang 1", "Sachgebiet 4 «Schule» in der politischen Gemeinde", st, txt)
        else:
            p("Anhang 1", "Sachgebiet 4 «Schule» in der politischen Gemeinde", "ja" if s4 else "unsicher", "Sachgebiet 4 vorhanden (auch ohne Schulaufgaben zu führen)." if s4 else "Kein Sachgebiet 4.")
    o["leitfaden"] = P
    o["arten"] = arten
    return P

def _alle(n, pfad):
    for d in n.get("dokumente", []): yield d, pfad
    for k in n.get("kinder", []): yield from _alle(k, pfad + " › " + k["titel"])

# ---------------------------------------------------------------- Gesetzestexte & Verordnungen (Rechtsgrundlagen Volksschule)
# Rohliste: data/rechtsgrundlagen.json (aus quellen/rechtsgrundlagen_schulen_zh.md). Hier werden Fundstelle, Ebene,
# Abkürzung, Direktlink und Herkunft ergänzt. «Geprüft» = Ordnungsnummer am 20.11.2026 in ZH-Lex nachgesehen.
RG_ALIAS = [  # Titelanfang ohne Fundstelle → (Abkürzung, Fundstelle)
 (r"^Volksschulgesetz und Volksschulverordnung", ("VSG / VSV", "LS 412.100 / 412.101")),
 (r"^Lehrpersonalgesetz und Lehrpersonalverordnung", ("LPG / LPVO", "LS 412.31 / 412.311")),
 (r"^Volksschulgesetz", ("VSG", "LS 412.100")), (r"^Volksschulverordnung", ("VSV", "LS 412.101")),
 (r"^Gemeindegesetz", ("GG", "LS 131.1")), (r"^Schweizerisches Zivilgesetzbuch", ("ZGB", "SR 210")),
 (r"^Schweizerisches Strafgesetzbuch", ("StGB", "SR 311.0")),
 (r"^Interkantonale Vereinbarung über das öffentliche Beschaffungswesen", ("IVöB", "LS 720.1 (Anhang)")),
 (r"^Kantonales Beitrittsgesetz zur IVöB", ("BeiG IVöB", "LS 720.1")),
 (r"^Gemeindeordnung der jeweiligen Schulgemeinde", ("GO", "kommunal")),
 (r"^Kommunales Personalreglement", ("", "kommunal")),
]
RG_GEPRUEFT = {"131.1", "131.11", "412.121.31", "172.71", "412.106", "412.106.1", "720.11", "720.1", "132.1", "132.11", "611", "810.1", "818.22", "818.11", "410.6", "410.61", "852.1", "413.21", "413.250.1", "413.250.2", "414.16", "161", "161.1"}
ZHLEX = "http://www.zhlex.zh.ch/Erlass.html?Open&Ordnr={}"

def rechtsgrundlagen():
    d = json.loads((ROOT / "data/rechtsgrundlagen.json").read_text(encoding="utf-8"))
    for e in d["eintraege"]:
        titel = e["erlass"]
        m = re.search(r",?\s*\b(LS|SR)\s+([\d.]+)\s*$", titel)
        abk = (re.search(r"\(([A-ZÄÖÜ][A-Za-zÄÖÜäöü]{1,7})\)", titel) or [None, ""])[1]
        if m:
            fund, kurz = f"{m[1]} {m[2]}", re.sub(r",?\s*\b(LS|SR)\s+[\d.]+\s*$", "", titel)
        else:
            fund, kurz = "", titel
            for muster, (a, f) in RG_ALIAS:
                if re.search(muster, titel): abk, fund = abk or a, f; break
        if not abk and re.fullmatch(r"[A-ZÄÖÜ]{2,6}", kurz.strip()): abk = kurz.strip()
        if abk == "SV": abk, kurz = "SVO", kurz.replace("(SV)", "(SVO)")   # amtliche Abkürzung laut ZH-Lex
        if kurz.startswith("Verfassung des Kantons Zürich"): abk = "KV"
        if re.match(r"BRB", e["stelle"]): ebene = "Bildungsrat"
        elif fund.startswith("SR") or re.match(r"^SR", fund): ebene = "Bund"
        elif fund.startswith("LS"): ebene = "Kanton"
        elif fund == "kommunal": ebene = "Gemeinde"
        else: ebene = "Kanton"
        nummern = re.findall(r"\d{3}(?:\.\d+)+|\d{3}", fund) if fund.startswith("LS") else []
        if fund.startswith("LS") and "/" in fund:   # «LS 412.100 / 412.101»
            nummern = re.findall(r"\d{3}\.\d+(?:\.\d+)*", fund)
        direkt = []
        for n in nummern:
            direkt.append({"text": "ZH-Lex LS " + n, "url": ZHLEX.format(n)})
        if ebene == "Bund" and e["quelle_url"] and "fedlex" in e["quelle_url"]:
            direkt.append({"text": "Fedlex " + fund, "url": e["quelle_url"]})
        if ebene == "Bildungsrat" and e["quelle_url"]:
            direkt.append({"text": e["stelle"], "url": e["quelle_url"]})
        u = e["quelle_url"] or ""
        herkunft = ("Fedlex" if "fedlex" in u else "Bildungsrat" if "/bildungsrat" in u else "Volksschulamt" if "informationen-volksschule" in u or "/volksschule" in u
                    else "Gemeindeamt" if "gemeindeorganisation" in u or "gemeindeamt" in u else "ZH-Lex" if "gesetzessammlung" in u
                    else "Personalamt Kanton Zürich" if "arbeiten-beim-kanton" in u else "Kanton Zürich")
        if ebene == "Gemeinde": herkunft = "Kommunal"   # Rechtssammlung der Schule (Platzhalter «Schule XYZ»)
        generisch = u.rstrip("/").endswith(("gesetzessammlung.html", "informationen-volksschule.html", "gemeindeorganisation.html"))
        e.update({"titel": kurz, "abk": abk, "fundstelle": fund, "ebene": ebene, "direkt": direkt, "herkunft": herkunft,
                  "quelle_generisch": generisch, "geprueft": any(n in RG_GEPRUEFT for n in nummern)})
        rg_metadaten(e)
    # Kommunale Ebene: Platzhalter, wird durch die gewählte Schulgemeinde ersetzt (deren erfasste Rechtssammlung)
    d["publikationsquellen"].append({"ebene": "Kommunal", "name": "Rechtssammlung der Schule XYZ", "url": None, "platzhalter": True})
    d["quellenkatalog"], d["quellenklassen"] = quellenkatalog(), [{"klasse": k, "titel": t, "aufnahme": a} for k, t, a in QUELLENKLASSEN]
    d["zhlex_abgerufen"] = "20.11.2026"
    d["erlasse"] = sorted({e["fundstelle"] for e in d["eintraege"] if e["fundstelle"] and e["fundstelle"] != "kommunal"} )
    return d

# ---------------------------------------------------------------- Quellenkatalog (Klassen A–F, Entscheid 20.11.2026)
QUELLENKLASSEN = [("A", "Rechtsnormen", "vollständig aufnehmen"), ("B", "Behördenbeschlüsse", "vollständig, soweit schulrelevant"),
                  ("C", "Vollzugsvorgaben", "vollständig, sofern gültig und anwendbar"), ("D", "Fachliche Auslegung", "ergänzende Referenz"),
                  ("E", "Rechtsprechung", "mit den betroffenen Rechtsartikeln verknüpfen"), ("F", "Historische Quellen", "für Versionshistorie und Rechtsentwicklung")]
VERBINDLICH = {"A": "rechtsverbindlich", "B": "rechtsverbindlich (Beschluss)", "C": "behördliche Vorgabe", "D": "Auslegung / Orientierung",
               "E": "Rechtsprechung", "F": "historisch"}
QUELLEN = [  # (Klasse, Name, Ebene, Herausgeber, Inhalt, URL, Priorität, Versionierung)
 ("A", "Fedlex – Systematische Rechtssammlung (SR)", "Bund", "Bundeskanzlei", "Konsolidiertes geltendes Bundesrecht", "https://www.fedlex.admin.ch/de/cc", "hoch", "«Stand am» je Fassung"),
 ("A", "Fedlex – Amtliche Sammlung (AS)", "Bund", "Bundeskanzlei", "Amtliche Veröffentlichung neuer und geänderter Bundeserlasse", "https://www.fedlex.admin.ch/de/oc", "niedrig", "Publikationsdatum"),
 ("A", "Fedlex – Bundesblatt (BBl)", "Bund", "Bundeskanzlei", "Botschaften, Erläuterungen, amtliche Bekanntmachungen", "https://www.fedlex.admin.ch/de/fga", "niedrig", "Publikationsdatum"),
 ("A", "ZH-Lex – Loseblattsammlung (LS)", "Kanton", "Staatskanzlei, Rechtsdienst", "Systematisch gegliedertes geltendes kantonales Recht", "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung.html", "hoch", "Nachtragsnummer mit Publikations- und Aufhebungsdatum"),
 ("A", "ZH-Lex – Offizielle Gesetzessammlung (OS)", "Kanton", "Staatskanzlei, Rechtsdienst", "Chronologische Veröffentlichung kantonaler Erlasse und Änderungen", "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung.html", "mittel", "Band und Seite"),
 ("A", "Amtsblatt des Kantons Zürich", "Kanton", "Staatskanzlei", "Amtliche Bekanntmachungen von Kanton und Gemeinden", "https://www.amtsblatt.zh.ch/", "mittel", "Publikationsdatum"),
 ("A", "Rechtssammlung der Schule XYZ", "Gemeinde", "Schulgemeinde bzw. Gemeinde mit Schulaufgaben", "Gemeindeordnung, Organisationsstatut, Verordnungen, Reglemente – Platzhalter, wird durch die gewählte Schulgemeinde ersetzt", None, "hoch", "Dateidatum / Version im Titel, Abgleich mit erfasster Fassung"),
 ("A", "Amtliches Publikationsorgan der Gemeinde", "Gemeinde", "Gemeinde / Schulgemeinde", "Rechtsverbindliche Bekanntmachung von Erlassen und Beschlüssen; je Gemeinde verschieden (Zeitung, Amtsblatt, Mitteilungsblatt, elektronische Plattform)", "https://www.zh.ch/de/politik-staat/wahlen-abstimmungen/vorgaben-zur-amtlichen-publikation.html", "mittel", "Publikationsdatum"),
 ("B", "Bildungsratsbeschlüsse (BRB)", "Kanton", "Bildungsrat", "Lehrplan, Lektionentafel, Lehrmittel, Beurteilung", "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat.html", "hoch", "Beschlussnummer und Sitzungsdatum"),
 ("B", "Regierungsratsbeschlüsse (RRB)", "Kanton", "Regierungsrat", "Regierungsentscheide, Erlassvorlagen, Ausführungsbeschlüsse", "https://www.zh.ch/de/politik-staat/gesetze-beschluesse.html", "mittel", "Beschlussnummer und Datum"),
 ("B", "Zürcher Lehrplan 21", "Kanton", "Bildungsrat", "Verbindliche Kompetenzen und Fachbereiche", "https://zh.lehrplan.ch/", "mittel", "BRB-Stand"),
 ("B", "Lehrmittelverzeichnis", "Kanton", "Bildungsrat / Volksschulamt", "Obligatorische und alternativ-obligatorische Lehrmittel, jährlich", "https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule.html", "mittel", "Schuljahr"),
 ("C", "Volksschulamt – Informationen für die Volksschule", "Kanton", "Volksschulamt", "Vollzugshilfen zu Organisation, Personal, Unterricht", "https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule.html", "hoch", "Seitenstand / Dokumentdatum"),
 ("C", "Volksschulamt – Bildung und ICT", "Kanton", "Volksschulamt", "ICT-Vorgaben, Datenschutzgrundlagen, Orientierungshilfen", "https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule/volksschule-fuehrung/volksschule-finanzen-infrastruktur/bildung-und-ict.html", "mittel", "Dokumentdatum"),
 ("C", "Gemeindeamt – Gemeindeorganisation", "Kanton", "Gemeindeamt", "Mustergemeindeordnungen, Leitfaden systematische Rechtssammlung", "https://www.zh.ch/de/politik-staat/gemeinden/gemeindeorganisation.html", "hoch", "Fassung (z. B. April 2025)"),
 ("C", "Gemeindeamt – Finanzhaushalt", "Kanton", "Gemeindeamt", "Handbuch Finanzhaushalt, HRM2, Kontenrahmen", "https://www.zh.ch/de/steuern-finanzen/gemeindefinanzen/finanzhaushalt-gemeinden.html", "mittel", "Fassung"),
 ("C", "Kantonale Beschaffung – Hilfsmittel", "Kanton", "Baudirektion / Kommission Beschaffungswesen", "Leitfäden, Schwellenwerte, Praxishilfen", "https://www.zh.ch/de/politik-staat/kanton/kantonale-verwaltung/beschaffung-einkaeufe/hilfsmittel-beratung.html", "mittel", "Dokumentdatum"),
 ("C", "Bezirksrat", "Bezirk", "Bezirksrat", "Aufsicht über die Gemeinden und Schulgemeinden; Rekursinstanz gegen Anordnungen der Schulpflege", None, "mittel", "Entscheiddatum"),
 ("D", "Behördenhandbuch Volksschule", "Kanton", "Volksschulamt", "Rechtliche Grundlagen, Führung, Zuständigkeiten der Schulbehörden", "https://www.behoerdenhandbuch.ch/", "mittel", "Seitenstand"),
 ("D", "Datenschutzbeauftragte Kanton Zürich", "Kanton", "Datenschutzbeauftragte", "Datenschutzlexikon Volksschule, Merkblätter, Empfehlungen", "https://www.zh.ch/de/politik-staat/datenschutz.html", "mittel", "Dokumentdatum"),
 ("D", "Staatsarchiv – Informationsverwaltung", "Kanton", "Staatsarchiv", "Leitfäden zu Informationsverwaltung, Archivierung, Aktenführung", "https://www.zh.ch/de/politik-staat/wie-behoerden-informationen-verwalten.html", "mittel", "Version im Dokument"),
 ("D", "Fachstelle für Schulbeurteilung", "Kanton", "Bildungsdirektion", "Evaluationsvorgaben, Qualitätsrahmen", "https://www.zh.ch/de/bildungsdirektion/fachstelle-fuer-schulbeurteilung.html", "niedrig", "Dokumentdatum"),
 ("D", "Amt für Jugend und Berufsberatung – Schulsozialarbeit", "Kanton", "AJB", "Grundlagen und Empfehlungen zur Zusammenarbeit", "https://www.zh.ch/de/bildung/informationen-fuer-schulen/informationen-volksschule/volksschule-schulinfo-unterrichtsergaenzende-angebote/schulinfo-schulsozialarbeit.html", "niedrig", "Dokumentdatum"),
 ("D", "Schulblatt Kanton Zürich", "Kanton", "Bildungsdirektion", "Amtliche Mitteilungen, Bildungsratsgeschäfte", "https://www.zh.ch/de/bildung/bildungssystem/schulblatt.html", "niedrig", "Ausgabe"),
 ("E", "ZHEntscheide", "Kanton", "Staatskanzlei", "Ausgewählte Rekursentscheide kantonaler Behörden (u. a. Bildungsdirektion) ab 2001", "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/rekursentscheide.html", "mittel", "Entscheiddatum"),
 ("E", "Verwaltungsgericht des Kantons Zürich", "Kanton", "Verwaltungsgericht", "Entscheide zu Verwaltungs-, Personal- und Schulrecht", "https://www.zh.ch/de/politik-staat/streitigkeiten-vor-verwaltungsgericht/rechtsprechung-des-verwaltungsgerichts.html", "mittel", "Entscheiddatum, Rechtskraft"),
 ("E", "Bundesgericht", "Bund", "Bundesgericht", "Höchstrichterliche Rechtsprechung", "https://www.bger.ch/", "niedrig", "Entscheiddatum"),
 ("E", "EDK – Interkantonale Rechtssammlung", "Interkantonal", "EDK", "Konkordate und Vereinbarungen – Beitritt Zürich je prüfen", "https://www.edk.ch/de/dokumentation/rechtstexte-beschluesse/rechtssammlung", "niedrig", "Stand"),
 ("F", "Staatsarchiv – Zentrale Serien", "Kanton", "Staatsarchiv", "Historische Gesetzessammlungen, Amtsblätter, Protokolle", "https://zszh.sources-online.org/", "niedrig", "historische Fassung"),
]
# Klasse E «EDK» ist interkantonales Recht (Klasse A), sobald Zürich beigetreten ist – hier vorerst als Referenz geführt.

def quellenkatalog():
    return [{"klasse": k, "name": n, "ebene": e, "herausgeber": h, "inhalt": i, "url": u, "prioritaet": p, "versionierung": v,
             "verbindlichkeit": VERBINDLICH[k]} for k, n, e, h, i, u, p, v in QUELLEN]

ZHLEX_SEITE = "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung/zhlex-ls/"
def _ymd(d): return "_".join(reversed(d.split("."))) if d and d != "-" else ""
def zhlex_versionen(nr):
    roh = json.loads((RAW / "zhlex-versionen.json").read_text(encoding="utf-8")).get(nr)
    if not roh: return None
    out, gesehen = [], set()
    for z in roh["v"]:
        f = z.split("|")
        nachtrag, pub, aufh = f[0], f[1], f[2]
        ed, ik = (f[3], f[4]) if len(f) > 3 else (roh["e"], roh["i"])
        if (nachtrag, ed) in gesehen: continue   # ZH-Lex führt einzelne Nachträge doppelt
        gesehen.add((nachtrag, ed))
        out.append({"version": "Nachtrag " + nachtrag, "veroeffentlicht": "" if pub == "-" else pub, "in_kraft_bis": aufh,
                    "erlassdatum": ed, "inkraft": "" if ik == "-" else ik, "erlass_neu": ed != roh["e"],
                    "url": f"{ZHLEX_SEITE}erlass-{nr.replace('.', '_')}-{_ymd(ed)}-{_ymd(ik)}-{nachtrag}.html", "quelle": "ZH-Lex"})
    return {"titel_amtlich": roh["t"], "versionen": out}

ERLASSENDE = [(r"^Verfassung", "Stimmberechtigte"), (r"^Reglement", "Bildungsrat"), (r"[Vv]erordnung", "Regierungsrat"),
              (r"[Gg]esetz", "Kantonsrat")]
STAND_ISO = "20261120"
FEDLEX_RAW = ROOT / "data" / "raw" / "fedlex-versionen.json"
def fedlex_versionen(fund):
    """Konsolidierte Fassungen («Stand am») aus Fedlex, neueste zuerst; mit Textfassung, wo aufbereitet."""
    m = re.match(r"SR (\d+(?:\.\d+)*)", fund or "")
    if not m or not FEDLEX_RAW.exists(): return []
    raw = json.loads(FEDLEX_RAW.read_text(encoding="utf-8")).get(m.group(1))
    if not raw: return []
    idx = json.loads((TEXTE / "index.json").read_text(encoding="utf-8"))["erlasse"].get("sr-" + m.group(1), {})
    da = {f["nachtrag"] for f in idx.get("fassungen", [])}
    def ch(x): return f"{x[6:8]}.{x[4:6]}.{x[:4]}" if x else ""
    out = []
    for stand, bis in reversed(raw["v"]):
        v = {"version": "Stand " + ch(stand), "inkraft": ch(stand), "in_kraft_bis": bis, "veroeffentlicht": None, "quelle": "Fedlex",
             "url": f"https://www.fedlex.admin.ch/eli/cc/{raw['eli']}/{stand}/de"}
        if stand in da: v.update(text_key="sr-" + m.group(1), text_nachtrag=stand)
        if stand > STAND_ISO: v["kuenftig"] = True
        out.append(v)
    geltend = [v for v in out if not v.get("kuenftig")]
    return geltend[:1] + [v for v in out if v.get("kuenftig")] + geltend[1:]   # geltende Fassung zuerst

HERAUSGEBER_FIX = {"413.250.1": "Regierungsrat"}   # «Reglement», aber vom Regierungsrat erlassen (Ingress)

def rg_metadaten(e):
    """Felder nach Entscheid 20.11.2026: Quellenklasse, herausgebende Behörde, massgebende Publikationsstelle, Downloadort, Versionen."""
    fund = e["fundstelle"]
    if e["ebene"] == "Bildungsrat":
        e.update(klasse="B", herausgeber="Bildungsrat", publikationsstelle="Bildungsratsbeschlüsse (zh.ch), Schulblatt", downloadort=e["quelle_url"],
                 veroeffentlicht=None, version=e["stelle"], versionen=[])
    elif e["ebene"] == "Gemeinde":
        e.update(klasse="A", herausgeber="Schulgemeinde (Schule XYZ)", publikationsstelle="Amtliches Publikationsorgan der Gemeinde",
                 downloadort="Rechtssammlung der Schule XYZ", veroeffentlicht=None, version=None, versionen=[])
    elif e["ebene"] == "Bund":
        her = "Bundesrat" if re.search(r"verordnung", e["titel"], re.I) else "UNO / Bundesversammlung" if "Konvention" in e["titel"] else "Bundesversammlung"
        fv = fedlex_versionen(fund)
        akt = fv[0] if fv else None
        e.update(klasse="A", herausgeber=her, publikationsstelle="Fedlex SR (Erstpublikation AS)", downloadort=akt["url"] if akt else e["quelle_url"],
                 veroeffentlicht=akt["inkraft"] if akt else None, version=akt["version"] if akt else None, versionen=fv)
        if not fv: e["version_hinweis"] = "Stand bei Fedlex noch nicht abgefragt"
    else:
        nummern = re.findall(r"\d{3}(?:\.\d+)*", fund)
        zv = zhlex_versionen(nummern[0]) if nummern else None
        def erlassend(t): return next((b for m, b in ERLASSENDE if re.search(m, t)), "Kanton Zürich")
        teile = e["titel"].split(" und ") if " und " in e["titel"] and "/" in fund else [zv["titel_amtlich"] if zv else e["titel"]]
        her = " / ".join(dict.fromkeys(erlassend(t) for t in teile))
        if fund.startswith("LS 720.1 (Anhang)"): her = "Interkantonales Organ (Beitritt Kantonsrat)"
        if nummern and nummern[0] in HERAUSGEBER_FIX: her = HERAUSGEBER_FIX[nummern[0]]
        akt = zv["versionen"][0] if zv else None
        e.update(klasse="A", herausgeber=her, publikationsstelle="ZH-Lex LS (Erstpublikation OS)",
                 downloadort=akt["url"] if akt else (e["direkt"][0]["url"] if e["direkt"] else None),
                 veroeffentlicht=akt["veroeffentlicht"] if akt else None, version=akt["version"] if akt else None,
                 versionen=zv["versionen"] if zv else [], titel_amtlich=zv["titel_amtlich"] if zv else None)
        if len(nummern) > 1: e["version_hinweis"] = "Versionen für LS " + nummern[0] + "; " + ", ".join("LS " + n for n in nummern[1:]) + " siehe Direktlink"
    e["anzahl_versionen"] = len(e["versionen"])

# ---------------------------------------------------------------- Analyse-Version je Organisation (Auftrag 20.11.2026)
# Jede Analyse (Website lesen, Struktur und Dokumente katalogisieren) erhält eine Versionsnummer und ein Datum.
# Ein späterer Abgleich hängt eine neue Analyse an; frühere bleiben erhalten.
ANALYSEN = {o_id: [{"version": 1, "datum": "17.11.2026", "art": "Erstanalyse", "bemerkung": "Struktur und Dokumentliste erfasst"}]
            for o_id in ["pg-truellikon", "ps-truellikon", "skm-marthalen", "sek-buelach", "pg-meilen", "pg-bachenbuelach", "schule-bachenbuelach",
                         "pg-hoeri", "ps-hoeri", "pg-winkel", "schule-winkel", "pg-hochfelden", "pg-duebendorf", "schule-duebendorf",
                         "ssg-duebendorf-schwerzenbach", "pg-fehraltorf"]}
def analyse_info(o):
    a = ANALYSEN.get(o["id"], [{"version": 1, "datum": STAND, "art": "Erstanalyse", "bemerkung": ""}])
    for x in a: x.setdefault("dokumente", o["anzahl_dokumente"]); x.setdefault("rubriken", o["anzahl_rubriken"])
    o["analysen"] = a
    o["analyse_version"], o["analysiert_am"] = a[-1]["version"], a[-1]["datum"]

# ---------------------------------------------------------------- Datum und Version der erfassten Dokumente
ERFASST_AM = "17.11.2026"  # Datum der Erstanalyse aller bisher erfassten Organisationen
VERSION_IM_TITEL = r"\b[Vv](?:ersion)?\s?(\d+(?:\.\d+)+)\b|\bVersion\s+(\d+)\b|\bStand\s+(\d{1,2}\.\d{1,2}\.\d{4}|[A-Za-zä]+\s+\d{4}|\d{4})|\b[Rr]ev(?:idiert|\.)?\s*(\d{4})"
def doc_datum_version(o):
    for s in o["sections"]:
        for d in walk(s):
            if o["renderer"] == "iweb_gk" and d.get("datum"):
                d["gueltig_seit"] = d["datum"]          # i-web «Gültig seit» = Inkraftsetzung, nicht Veröffentlichung
                d["veroeffentlicht"], d["datum_herkunft"] = None, None
            elif d.get("datum"):
                d["veroeffentlicht"], d["datum_herkunft"] = d["datum"], "Website"
            else:
                d["veroeffentlicht"], d["datum_herkunft"] = None, None
            m = re.search(VERSION_IM_TITEL, d["titel"])
            d["version"] = next((g for g in m.groups() if g), None) if m else None
            if m and m.group(3): d["version"] = "Stand " + m.group(3)
            d["vid"] = o["id"] + ":" + (d.get("nummer") or norm(d["titel"])[:60])
            d["versionen"] = [{"version": d["version"] or "erfasst", "veroeffentlicht": d["veroeffentlicht"], "gueltig_seit": d.get("gueltig_seit"),
                               "erfasst": ERFASST_AM, "url": d.get("url"), "quelle": o["website"], "status": "aktuell"}]
            d["anzahl_versionen"] = 1

# ---------------------------------------------------------------- Textfassungen (texte/, erzeugt von tools/texte.py)
TEXTE = ROOT / "texte"
def texte_index():
    p = TEXTE / "index.json"
    if not p.exists(): return {"erlasse": {}}
    idx = json.loads(p.read_text(encoding="utf-8"))
    for nr, e in idx["erlasse"].items():
        fs = e["fassungen"]
        e["fundstelle"] = e["ordnungsnummer"] if str(e.get("ordnungsnummer", "")).startswith("SR") else "LS " + nr
        e["voll"] = len(fs) > 1                       # alle Fassungen aufbereitet (sonst nur geltende)
        e["verweise"] = verweise(nr, fs[-1]["nachtrag"], e["fundstelle"]) if fs else []
    return idx

def _md(nr, nachtrag):
    p = TEXTE / nr / f"{nachtrag}.md"
    return p.read_text(encoding="utf-8") if p.exists() else ""

def verweise(nr, nachtrag, eigen=None):
    """Ausgehende Verweise der geltenden Fassung: Fussnoten mit LS-/SR-Nummer, gezählt nach Zielerlass."""
    md = _md(nr, nachtrag); fn = {}
    for m in re.finditer(r"^\[\^(\w+)\]: (.*)$", md, re.M):
        for art, num in re.findall(r"\b(LS|SR) (\d[\d.]*\d)", m.group(2)): fn.setdefault(m.group(1), []).append(f"{art} {num}")
    zaehl = {}
    for ref in re.findall(r"\[\^(\w+)\]", md.split("\n---\n\n[^")[0] if "\n---\n\n[^" in md else md):
        for z in fn.get(ref, []): zaehl[z] = zaehl.get(z, 0) + 1
    return sorted(([z, n] for z, n in zaehl.items() if z != (eigen or "LS " + nr)), key=lambda x: -x[1])

def paragraf(nr, nachtrag, para):
    """Text eines Paragrafen (Überschrift und Absätze) aus der Markdown-Fassung."""
    md = _md(nr, nachtrag)
    if para.startswith("suche:"):
        m = re.search(r"^" + re.escape(para[6:]) + r"[^\n]*", md, re.M)
        return re.sub(r"\[\^\w+\]", "", m.group(0)).strip() if m else ""
    if para == "Ingress":
        m = re.search(r"^\(vom [^\n]*", md, re.M)
        return re.sub(r"\) \d+,", ")", re.sub(r"\[\^\w+\]", "", m.group(0))).strip() if m else ""
    m = re.search(r"^### " + re.escape(para) + r"(?![\d])[^\n]*\n\n(.*?)(?=\n### |\n## |\n---\n|\Z)", md, re.S | re.M)
    if not m: return ""
    return re.sub(r"\[\^\w+\]", "", m.group(0)).replace("### ", "").strip()

# ---------------------------------------------------------------- Normenhierarchien (Personalrecht, Finanzen – Aufträge 20.11.2026)
# Verbindungen von Hand festgelegt; Belegstellen werden aus den aufbereiteten Texten (texte/) gezogen,
# Verweise aus den Fussnoten gezählt, kommunale Beispiele aus den erfassten Rechtssammlungen gesucht.
HIERARCHIEN = [
 {"id": "personal", "titel": "Personalrecht",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "or", "ebene": 0, "titel": "Obligationenrecht (OR)", "sr": "220", "art": "Bundesgesetz",
    "url": "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de", "hinweis": "Arbeitsvertrag Art. 319 ff. – im öffentlichen Personalrecht nur, wo das kantonale Recht darauf verweist (z. B. missbräuchliche Kündigung, Art. 336 OR)"},
   {"id": "lpg", "ebene": 1, "titel": "Lehrpersonalgesetz (LPG) – Lehrpersonen und Schulleitungen", "art": "Gesetz (Kantonsrat)", "ls": "412.31",
    "hinweis": "Kantonales Recht für Lehrpersonen und Schulleitungen der Volksschule (§ 1); die Gemeinde stellt an (§ 7)"},
   {"id": "pg", "ebene": 1, "titel": "Personalgesetz (PG)", "art": "Gesetz (Kantonsrat)", "ls": "177.10",
    "hinweis": "Gilt direkt für das Staatspersonal; für Lehrpersonen ergänzend (§ 2 LPG), für Gemeindepersonal sinngemäss, soweit die Gemeinde nichts regelt (§ 53 Abs. 2 GG)"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Schulleitung, Leitung Bildung, Lehrerschaft", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 43 Leitung Bildung (kommunal angestellt), § 44 Schulleitung mit personeller Führung, § 45 Schulkonferenz; §§ 58–60 Lehrpersonenkonferenz der Volksschule (Mitwirkung der Lehrerschaft)"},
   {"id": "gg", "ebene": 1, "titel": "Gemeindegesetz (GG) – Gemeindepersonal", "art": "Gesetz (Kantonsrat)", "ls": "131.1",
    "hinweis": "§ 53: Arbeitsverhältnis öffentlich-rechtlich; eigenes Recht der Gemeinde, sonst kantonales Personalrecht sinngemäss"},
   {"id": "lpvo", "ebene": 2, "titel": "Lehrpersonalverordnung (LPVO)", "art": "Verordnung (Regierungsrat)", "ls": "412.311",
    "hinweis": "§ 3: Die Schulpflege übt die Arbeitgeberrechte aus; Lohnskalen im Anhang"},
   {"id": "pvo", "ebene": 2, "titel": "Personalverordnung (PVO)", "art": "Verordnung (Regierungsrat)", "ls": "177.11"},
   {"id": "vvo", "ebene": 2, "titel": "Vollzugsverordnung zum Personalgesetz (VVO)", "art": "Verordnung (Regierungsrat)", "ls": "177.111"},
   {"id": "anst", "ebene": 3, "titel": "Zuständigkeiten Personal der Schule (Organisationsstatut, Funktionendiagramm)", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Für Lehrpersonen und Schulleitungen regelt die Gemeinde keine Löhne oder Anstellungsbedingungen, sondern nur, wer anstellt, beurteilt und führt",
    "muster": r"organisationsstatut|funktionendiagramm|personalfuehrung|personaladministration|mitarbeiterbeurteilung|kompetenz.*personal|personal.*kompetenz",
    "ohne": r"gemeinderat|werkkommission|\brfo\b|\bika\b|\bara|befoerderung|beilagen"},
   {"id": "gem", "ebene": 3, "titel": "Personalverordnung der Gemeinde / Schulgemeinde – übriges Personal", "fundstelle": "kommunal", "art": "Gemeindeerlass",
    "hinweis": "Schulverwaltung, Hausdienst, Betreuung, Leitung Bildung; ohne eigene Verordnung gilt das kantonale Personalrecht sinngemäss (§ 53 Abs. 2 GG)",
    "muster": r"personalverordnung|personalreglement|anstellungs und besoldungsverordnung|\bpevo\b", "ohne": r"anhang|vollz|ausf"}],
  "kanten": [
   {"von": "pg", "nach": "or", "art": "verweist auf", "beleg": ("177.10", "§ 18."), "beleg_oben": ("sr-220", "Art. 336")},
   {"von": "lpg", "nach": "pg", "art": "subsidiär", "beleg": ("412.31", "§ 2.")},
   {"von": "pvo", "nach": "pg", "art": "Vollzug", "beleg": ("177.11", "§ 1.")},
   {"von": "vvo", "nach": "pg", "art": "Vollzug", "beleg_text": "Vollzugsverordnung zum Personalgesetz (VVO) – Titel: Vollzug des Personalgesetzes"},
   {"von": "lpvo", "nach": "lpg", "art": "Vollzug", "beleg": ("412.311", "§ 1.")},
   {"von": "lpvo", "nach": "vvo", "art": "verweist auf"},
   {"von": "anst", "nach": "lpg", "art": "Grundlage", "beleg": ("412.31", "§ 7.")},
   {"von": "anst", "nach": "lpvo", "art": "Grundlage", "beleg": ("412.311", "§ 3.")},
   {"von": "anst", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 44."), "beleg_unten": ("412.100", "§ 58.")},
   {"von": "gem", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 53.")},
   {"von": "gem", "nach": "pg", "art": "subsidiär (§ 53 Abs. 2 GG)"},
   {"von": "gem", "nach": "pvo", "art": "subsidiär (§ 53 Abs. 2 GG)"},
   {"von": "gem", "nach": "vsg", "art": "Leitung Bildung", "beleg": ("412.100", "§ 43.")}]},
 {"id": "finanzen", "titel": "Finanzen",
  "ebenen": ["Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "gg", "ebene": 0, "titel": "Gemeindegesetz (GG)", "art": "Gesetz (Kantonsrat)", "ls": "131.1", "hinweis": "4. Teil: Finanzhaushalt (§§ 84 ff.) – Haushaltsführung, Budget, Ausgaben, Rechnungslegung, Prüfung"},
   {"id": "fag", "ebene": 0, "titel": "Finanzausgleichsgesetz (FAG)", "art": "Gesetz (Kantonsrat)", "ls": "132.1", "hinweis": "Finanzausgleich zwischen politischen Gemeinden, Schulgemeinden und Kanton"},
   {"id": "crg", "ebene": 0, "titel": "Gesetz über Controlling und Rechnungslegung (CRG)", "art": "Gesetz (Kantonsrat)", "ls": "611", "hinweis": "Haushaltsrecht des Kantons – für Gemeinden nicht direkt anwendbar; Gemeinden: GG 4. Teil"},
   {"id": "vsgfin", "ebene": 0, "titel": "Volksschulgesetz (VSG) – Finanzen", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 11 Unentgeltlichkeit und Elternbeiträge; §§ 61–67 Kostenanteil des Kantons, Kosten der Sonderschulung, Mitteleinsatz der Gemeinden, Drittmittel"},
   {"id": "vgg", "ebene": 1, "titel": "Gemeindeverordnung (VGG)", "art": "Verordnung (Regierungsrat)", "ls": "131.11", "hinweis": "2. Teil: Finanzhaushalt"},
   {"id": "vfiso", "ebene": 1, "titel": "Verordnung über die Finanzierung der Sonderschulung (VFiSo)", "art": "Verordnung (Regierungsrat)", "ls": "412.106"},
   {"id": "fav", "ebene": 1, "titel": "Finanzausgleichsverordnung (FAV)", "art": "Verordnung (Regierungsrat)", "ls": "132.11"},
   {"id": "go", "ebene": 2, "titel": "Gemeindeordnung – Finanzbefugnisse", "fundstelle": "kommunal", "art": "Gemeindeordnung (Stimmberechtigte)",
    "hinweis": "Regelt Ausgaben- und Kreditkompetenzen von Gemeindeversammlung, Vorstand bzw. Schulpflege", "muster": r"gemeindeordnung|\(go\)", "ohne": r"sekundarschul.*politische|protokoll"},
   {"id": "fin", "ebene": 2, "titel": "Finanzreglement / Haushaltsregeln", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "hinweis": "Finanzkompetenzen, Haushaltführung, Aktivierungsgrenze, Fonds", "muster": r"finanzreglement|finanzordnung|finanzkompetenz|haushalt|aktivierung|globalbudget|ausgabenkompetenz|fonds|sonderrechnung", "ohne": r"mehrwert|oekologie|infrastruktur zuerichsee"},
   {"id": "geb", "ebene": 2, "titel": "Gebührenverordnung / Gebührentarif", "fundstelle": "kommunal", "art": "Gemeindeerlass",
    "hinweis": "Allgemeine Gebühren; Spezialgebühren (Wasser, Abwasser, Abfall) in eigenen Erlassen", "muster": r"gebuehrenverordnung|gebuehrenreglement|gebuehrentarif|gebuehrenordnung|allgemeiner gebuehrentarif", "ohne": r"wasser|abwasser|siedlung|abfall|feuerwehr|bauwesen|kesb|werke|bibliothek"}],
  "kanten": [
   {"von": "vgg", "nach": "gg", "art": "Vollzug", "beleg": ("131.11", "§ 47.")},
   {"von": "fav", "nach": "fag", "art": "Vollzug", "beleg": ("132.11", "§ 1.")},
   {"von": "go", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 104.")},
   {"von": "go", "nach": "fag", "art": "betrifft (Ausgleich)", "beleg": ("132.1", "§ 1.")},
   {"von": "fin", "nach": "go", "art": "gestützt auf"},
   {"von": "fin", "nach": "gg", "art": "Grundsätze", "beleg": ("131.1", "§ 84.")},
   {"von": "fin", "nach": "vgg", "art": "verweist auf", "beleg": ("131.11", "§ 8.")},
   {"von": "geb", "nach": "gg", "art": "Verursacherprinzip", "beleg": ("131.1", "§ 84.")},
   {"von": "vfiso", "nach": "vsgfin", "art": "Vollzug", "beleg": ("412.106", "Ingress"), "beleg_oben": ("412.100", "§ 64.")},
   {"von": "fin", "nach": "vsgfin", "art": "Mitteleinsatz", "beleg": ("412.100", "§ 66."), "beleg_unten": ("412.100", "§ 61.")},
   {"von": "geb", "nach": "vsgfin", "art": "Elternbeiträge", "beleg": ("412.100", "§ 11.")}]},
 {"id": "volksschule", "titel": "Volksschule",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Bildungsrat", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "bv", "ebene": 0, "titel": "Bundesverfassung (BV)", "sr": "101", "art": "Verfassung", "url": "https://www.fedlex.admin.ch/eli/cc/1999/404/de",
    "hinweis": "Art. 19 Anspruch auf ausreichenden und unentgeltlichen Grundschulunterricht; Art. 62 Schulwesen ist Sache der Kantone"},
   {"id": "big", "ebene": 1, "titel": "Bildungsgesetz (BiG)", "art": "Gesetz (Kantonsrat)", "ls": "410.1", "hinweis": "Rahmen für das ganze Bildungswesen; 6. Teil: Bildungsrat"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG)", "art": "Gesetz (Kantonsrat)", "ls": "412.100"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV)", "art": "Verordnung (Regierungsrat)", "ls": "412.101"},
   {"id": "vsm", "ebene": 2, "titel": "Verordnung über die sonderpädagogischen Massnahmen (VSM)", "art": "Verordnung (Regierungsrat)", "ls": "412.103"},
   {"id": "lp", "ebene": 3, "titel": "Lehrplan 21 und Lektionentafel", "fundstelle": "Bildungsratsbeschlüsse", "art": "Beschluss (Bildungsrat)",
    "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-4-volksschule-lehrplan-fuer-die-volksschule-des-kantons-zuerich.html",
    "hinweis": "Verbindliche Unterrichtsvorgaben; nicht in der Gesetzessammlung, sondern als Bildungsratsbeschlüsse publiziert",
    "liste": [{"titel": "BRB 4/2017 – Lehrplan für die Volksschule", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-4-volksschule-lehrplan-fuer-die-volksschule-des-kantons-zuerich.html"},
              {"titel": "BRB 5/2017 – Lektionentafel Kindergarten, Primar- und Sekundarstufe", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-5-volksschule-lektionentafel-fuer-die-kindergarten-primar-und-sekundarstufe.html"},
              {"titel": "BRB 1/2019 – Anpassung Lektionentafel Sekundarschule", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2019-brb-1-anpassung-lektionentafel-sekundarschule.html"},
              {"titel": "BRB 5/2021 – weitere Anpassung Lektionentafel", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2021-brb-05.html"},
              {"titel": "BRB 8/2026 – Lehrmittel Sprachförderung und DaZ", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2026-brb-08.html"}]},
   {"id": "zr", "ebene": 3, "titel": "Zeugnisreglement", "art": "Reglement (Bildungsrat)", "ls": "412.121.31",
    "liste": [{"titel": "BRB 5/2025 – Anpassungen Beurteilung und Zeugnis", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2025-brb-05.html", "hinweis": "Beurteilung in RKE und MI in der Primarstufe"}]},
   {"id": "go", "ebene": 4, "titel": "Gemeindeordnung (Schulgemeinde)", "fundstelle": "kommunal", "art": "Gemeindeordnung (Stimmberechtigte)",
    "hinweis": "Organisation der Schulpflege, Leitung Bildung, Vertretung der Lehrpersonen", "muster": r"gemeindeordnung|\(go\)", "ohne": r"protokoll"},
   {"id": "os", "ebene": 4, "titel": "Organisationsstatut", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Zuständigkeiten und Entscheidbefugnisse von Schulpflege, Schulleitung und Schulverwaltung", "muster": r"organisationsstatut|schulorganisation|organisationsreglement|kompetenzregelung|funktionendiagramm", "ohne": r"gemeinderat|gemeindeverwaltung|stadtverwaltung|werkkommission|\brfo\b|\bika\b|\bara|befoerderung|beilagen"},
   {"id": "so", "ebene": 4, "titel": "Schul- und Betreuungsreglemente", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "hinweis": "Schulordnung, Tagesstrukturen und Betreuung, Absenzen, Disziplin, Schulweg, Sonderpädagogik", "muster": r"schulordnung|schulreglement|tagesstruktur|betreuung|hort|absenz|disziplin|schulweg|sonderpaedagog|schulergaenzend|mittagstisch|musikschul", "ohne": r"zweckverband|alters|pflegeheim|spitex|merkblatt|allgemeine geschaeftsbedingungen|vorschul|familienergaenzend"}],
  "kanten": [
   {"von": "big", "nach": "bv", "art": "Grundlage", "beleg": ("sr-101", "Art. 62")},
   {"von": "vsg", "nach": "big", "art": "Rahmen", "beleg": ("410.1", "§ 8.")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 1.")},
   {"von": "vsm", "nach": "vsg", "art": "Vollzug", "beleg": ("412.103", "§ 1.")},
   {"von": "lp", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 21.")},
   {"von": "lp", "nach": "big", "art": "Zuständigkeit Bildungsrat", "beleg": ("410.1", "§ 21.")},
   {"von": "zr", "nach": "vsg", "art": "Grundlage", "beleg": ("412.121.31", "Ingress")},
   {"von": "go", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 42.")},
   {"von": "os", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 41 a.")},
   {"von": "os", "nach": "go", "art": "im Rahmen der"},
   {"von": "so", "nach": "os", "art": "gestützt auf"},
   {"von": "so", "nach": "vsv", "art": "verweist auf"}]},
 {"id": "datenschutz", "titel": "Datenschutz & ICT",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "dsg", "ebene": 0, "titel": "Datenschutzgesetz des Bundes (DSG)", "sr": "235.1", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/2022/491/de",
    "hinweis": "Gilt für Private und Bundesorgane – für die Volksschule nicht direkt; massgebend wird es bei privaten Dienstleistern (z. B. Cloud- und Software-Anbieter)"},
   {"id": "dsv", "ebene": 0, "titel": "Datenschutzverordnung (DSV)", "sr": "235.11", "art": "Verordnung (Bundesrat)", "url": "https://www.fedlex.admin.ch/eli/cc/2022/568/de"},
   {"id": "idg", "ebene": 1, "titel": "Gesetz über die Information und den Datenschutz (IDG)", "art": "Gesetz (Kantonsrat)", "ls": "170.4",
    "hinweis": "Massgebend für Schulgemeinden und Schulen als öffentliche Organe (§ 3 IDG)"},
   {"id": "vsgd", "ebene": 1, "titel": "Volksschulgesetz – Bearbeitung von Personendaten", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§§ 3 a ff. VSG: besondere Bestimmungen für Schülerdaten"},
   {"id": "archg", "ebene": 1, "titel": "Archivgesetz (ArchG)", "art": "Gesetz (Kantonsrat)", "ls": "170.6"},
   {"id": "ausl", "ebene": 1, "titel": "Gesetz über die Auslagerung von Informatikdienstleistungen", "art": "Gesetz (Kantonsrat)", "ls": "172.71"},
   {"id": "idv", "ebene": 2, "titel": "Verordnung über die Information und den Datenschutz (IDV)", "art": "Verordnung (Regierungsrat)", "ls": "170.41"},
   {"id": "ivsv", "ebene": 2, "titel": "Verordnung über die Informationsverwaltung und -sicherheit (IVSV)", "art": "Verordnung (Regierungsrat)", "ls": "170.8"},
   {"id": "archv", "ebene": 2, "titel": "Archivverordnung (ArchV)", "art": "Verordnung (Regierungsrat)", "ls": "170.61"},
   {"id": "dsk", "ebene": 3, "titel": "Datenschutz-, Informatik- und Nutzungsreglemente", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "hinweis": "Datenschutz, Informationssicherheit, ICT-Nutzung, Videoüberwachung, Social Media", "muster": r"datenschutz|informatik|\bict\b|informationssicherheit|video|social media|nutzungsrichtlinie|nutzungsreglement|internet|e-mail|digital", "ohne": r"schuetzenstube|forsthaus|parkhaus|liegenschaften|versand|liste der|oeffentliche[mn]? grund"},
   {"id": "akten", "ebene": 3, "titel": "Archiv- und Aktenreglement", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "hinweis": "Aktenplan, Registratur, Aufbewahrung und Archivierung", "muster": r"archiv|aktenplan|registratur|aktenfuehrung|aufbewahrung"}],
  "kanten": [
   {"von": "dsv", "nach": "dsg", "art": "Vollzug", "beleg": ("sr-235.11", "Ingress")},
   {"von": "idg", "nach": "dsg", "art": "nicht direkt anwendbar", "beleg": ("170.4", "§ 2."), "beleg_oben": ("sr-235.1", "Art. 2")},
   {"von": "vsgd", "nach": "idg", "art": "besondere Bestimmungen", "beleg": ("412.100", "§ 3 a.")},
   {"von": "idv", "nach": "idg", "art": "Vollzug", "beleg": ("170.41", "§ 1.")},
   {"von": "ivsv", "nach": "idg", "art": "Vollzug", "beleg": ("170.8", "Ingress")},
   {"von": "archv", "nach": "archg", "art": "Vollzug", "beleg": ("170.61", "§ 1.")},
   {"von": "ausl", "nach": "idg", "art": "verweist auf", "beleg": ("172.71", "§ 3.")},
   {"von": "dsk", "nach": "idg", "art": "Grundlage", "beleg": ("170.4", "§ 3.")},
   {"von": "dsk", "nach": "ivsv", "art": "Grundlage", "beleg": ("170.8", "§ 1.")},
   {"von": "dsk", "nach": "ausl", "art": "bei Auslagerung"},
   {"von": "akten", "nach": "archg", "art": "Grundlage", "beleg": ("170.6", "§ 6.")},
   {"von": "akten", "nach": "archv", "art": "subsidiär (§ 1 Abs. 2 ArchV)"}]},
 {"id": "sonderpaedagogik", "titel": "Sonderpädagogik",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "behig", "ebene": 0, "titel": "Behindertengleichstellungsgesetz (BehiG)", "sr": "151.3", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/2003/667/de",
    "hinweis": "Art. 20: Die Kantone sorgen für eine angepasste Grundschulung und fördern die Integration in die Regelschule"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz – Sonderpädagogische Massnahmen", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§§ 33–40 VSG; Finanzierung §§ 64 ff."},
   {"id": "vsm", "ebene": 2, "titel": "Verordnung über die sonderpädagogischen Massnahmen (VSM)", "art": "Verordnung (Regierungsrat)", "ls": "412.103"},
   {"id": "vfiso", "ebene": 2, "titel": "Verordnung über die Finanzierung der Sonderschulung (VFiSo)", "art": "Verordnung (Regierungsrat)", "ls": "412.106"},
   {"id": "auf", "ebene": 2, "titel": "Verordnung über die Aufsicht über die Sonderschulung", "art": "Verordnung (Bildungsdirektion)", "ls": "412.106.1"},
   {"id": "spiv", "ebene": 2, "titel": "Spitalschulverordnung (SpiV)", "art": "Verordnung (Regierungsrat)", "ls": "412.107"},
   {"id": "kom", "ebene": 3, "titel": "Konzepte und Reglemente Sonderpädagogik", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Förderkonzept, Integrative Förderung, Therapien, DaZ, Begabtenförderung, Schulpsychologie", "muster": r"sonderpaedagog|integrativ|(?<!be)foerder|therapie|logopaed|psychomotor|\bdaz\b|deutsch als zweit|begab|schulpsycholog|sonderschul", "ohne": r"jugendfoerder|wohn|energie|kultur|sport|wirtschaft|wald|natur|siedlung|anfrage"}],
  "kanten": [
   {"von": "vsg", "nach": "behig", "art": "Umsetzung", "beleg": ("sr-151.3", "Art. 20"), "beleg_unten": ("412.100", "§ 33.")},
   {"von": "vsm", "nach": "vsg", "art": "Vollzug", "beleg": ("412.103", "§ 1.")},
   {"von": "vfiso", "nach": "vsg", "art": "Vollzug", "beleg": ("412.106", "Ingress")},
   {"von": "auf", "nach": "vsg", "art": "Vollzug", "beleg": ("412.106.1", "Ingress")},
   {"von": "spiv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.107", "Ingress")},
   {"von": "kom", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 35.")},
   {"von": "kom", "nach": "vsm", "art": "Grundlage", "beleg": ("412.103", "§ 6.")}]},
 {"id": "beschaffung", "titel": "Beschaffung & Bau",
  "ebenen": ["Interkantonal (Konkordat)", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "ivoeb", "ebene": 0, "titel": "Interkantonale Vereinbarung über das öffentliche Beschaffungswesen (IVöB)", "fundstelle": "LS 720.1 (Anhang)", "art": "Konkordat",
    "url": "http://www.zhlex.zh.ch/Erlass.html?Open&Ordnr=720.1", "hinweis": "Vom 15. November 2019; gilt für Kanton und Gemeinden – Text im Anhang zum Beitrittsgesetz"},
   {"id": "beig", "ebene": 1, "titel": "Gesetz über den Beitritt zur IVöB (BeiG IVöB)", "art": "Gesetz (Kantonsrat)", "ls": "720.1"},
   {"id": "pbg", "ebene": 1, "titel": "Planungs- und Baugesetz (PBG)", "art": "Gesetz (Kantonsrat)", "ls": "700.1", "hinweis": "Schulhausbauten, Umbauten, Nutzungsänderungen; Pflicht der Gemeinden zur Bau- und Zonenordnung (§ 45)"},
   {"id": "svo", "ebene": 2, "titel": "Submissionsverordnung (SVO)", "art": "Verordnung (Regierungsrat)", "ls": "720.11"},
   {"id": "besch", "ebene": 3, "titel": "Beschaffungsrichtlinien / Vergabereglement", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "hinweis": "Zuständigkeiten und Schwellenwerte für Beschaffungen", "muster": r"beschaffung|submission|vergabe|einkauf", "ohne": r"pacht|landvergabe|abnahme|vergabeentscheid|anhang \d"},
   {"id": "bzo", "ebene": 3, "titel": "Bau- und Zonenordnung (BZO)", "fundstelle": "kommunal", "art": "Gemeindeerlass (Stimmberechtigte)",
    "hinweis": "Nur bei politischen Gemeinden; massgebend für Schulbauten", "muster": r"bau und zonenordnung|bau- und zonenordnung|bauordnung|\bbzo\b|zonenplan|baureglement", "ohne": r"gebuehr|foerderung|kernzonenplan|vollzugsrichtlinie"}],
  "kanten": [
   {"von": "beig", "nach": "ivoeb", "art": "Beitritt", "beleg": ("720.1", "§ 1.")},
   {"von": "svo", "nach": "beig", "art": "Vollzug", "beleg": ("720.11", "Ingress")},
   {"von": "svo", "nach": "ivoeb", "art": "verweist auf", "beleg": ("720.11", "§ 2.")},
   {"von": "besch", "nach": "ivoeb", "art": "Grundlage", "beleg": ("720.1", "suche:Art. 4 ¹ Im Staatsvertragsbereich")},
   {"von": "besch", "nach": "svo", "art": "verweist auf"},
   {"von": "bzo", "nach": "pbg", "art": "Grundlage", "beleg": ("700.1", "§ 45.")}]},
 {"id": "kindesschutz", "titel": "Kindesschutz & Schweigepflicht",
  "ebenen": ["Völkerrecht", "Bund", "Kanton", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "ukrk", "ebene": 0, "titel": "UN-Kinderrechtskonvention (KRK)", "sr": "0.107", "art": "Staatsvertrag", "url": "https://www.fedlex.admin.ch/eli/cc/1998/2055_2055_2055/de",
    "hinweis": "Art. 3 Kindeswohl, Art. 12 Anhörung, Art. 28/29 Recht auf Bildung"},
   {"id": "zgb", "ebene": 1, "titel": "Zivilgesetzbuch (ZGB) – elterliche Sorge und Kindesschutz", "sr": "210", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/24/233_245_233/de",
    "hinweis": "Art. 301–303 elterliche Sorge und Erziehung; Art. 307 ff. Kindesschutzmassnahmen; Art. 314c ff. Melderechte und -pflichten"},
   {"id": "stgb", "ebene": 1, "titel": "Strafgesetzbuch (StGB) – Amts- und Berufsgeheimnis", "sr": "311.0", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/54/757_781_799/de",
    "hinweis": "Art. 320 Amtsgeheimnis (Behörden, Lehrpersonen), Art. 321 Berufsgeheimnis (z. B. Schulpsychologie, Therapie)"},
   {"id": "vsg", "ebene": 2, "titel": "Volksschulgesetz – Meldepflicht und Zusammenarbeit", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 50 Grundsätze, § 51 Meldepflicht"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung – Information der Kindesschutzbehörde", "art": "Verordnung (Regierungsrat)", "ls": "412.101"},
   {"id": "kom", "ebene": 3, "titel": "Abläufe Kindesschutz, Krisen und Gewalt", "fundstelle": "kommunal", "art": "Behördenerlass oder Merkblatt",
    "hinweis": "Meist Leitfäden und Merkblätter statt Erlasse", "muster": r"kindesschutz|gefaehrdung|krise|notfall|meldung|schweigepflicht|gewalt|mobbing|praevention|sucht", "ohne": r"informationstafel|feuerwehr|zivilschutz|strafrecht"}],
  "kanten": [
   {"von": "zgb", "nach": "ukrk", "art": "Umsetzung", "beleg": ("sr-0.107", "Art. 3")},
   {"von": "vsg", "nach": "zgb", "art": "verweist auf", "beleg": ("412.100", "§ 51."), "beleg_oben": ("sr-210", "Art. 307")},
   {"von": "vsg", "nach": "ukrk", "art": "Mitwirkung (Art. 12 KRK)", "beleg": ("412.100", "§ 50."), "beleg_oben": ("sr-0.107", "Art. 12")},
   {"von": "vsg", "nach": "stgb", "art": "Amtsgeheimnis", "beleg": ("sr-311.0", "Art. 320")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 58.")},
   {"von": "kom", "nach": "vsg", "art": "gestützt auf"},
   {"von": "kom", "nach": "zgb", "art": "Melderecht", "beleg": ("sr-210", "Art. 314c")}]},
 {"id": "verfahren", "titel": "Verfahren & Rechtsschutz",
  "ebenen": ["Bund", "Kanton – Verfassung", "Kanton – Gesetze", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "bv", "ebene": 0, "titel": "Bundesverfassung (BV) – Verfahrensgarantien", "sr": "101", "art": "Verfassung", "url": "https://www.fedlex.admin.ch/eli/cc/1999/404/de",
    "hinweis": "Art. 29 Verfahrensgarantien (rechtliches Gehör), Art. 29a Rechtsweggarantie"},
   {"id": "kv", "ebene": 1, "titel": "Verfassung des Kantons Zürich (KV)", "art": "Verfassung (Stimmberechtigte)", "ls": "101",
    "hinweis": "Art. 18 Verfahrensgarantien, Art. 77 Rechtsschutz, Art. 85/89 Gemeindeautonomie und Gemeindeordnung"},
   {"id": "vrg", "ebene": 2, "titel": "Verwaltungsrechtspflegegesetz (VRG)", "art": "Gesetz (Kantonsrat)", "ls": "175.2",
    "hinweis": "Akteneinsicht (§ 8), Begründung und Rechtsmittelbelehrung (§ 10), Rekurs (§§ 19 ff.)"},
   {"id": "gg", "ebene": 2, "titel": "Gemeindegesetz (GG) – Neubeurteilung", "art": "Gesetz (Kantonsrat)", "ls": "131.1", "hinweis": "§§ 170 f.: Neubeurteilung von Entscheiden unterstellter Organe"},
   {"id": "vsg", "ebene": 2, "titel": "Volksschulgesetz (VSG) – Aufsicht und Rechtsschutz", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 73 Aufsicht und Ersatzvornahme, § 74 Begründung und Neubeurteilung, § 75 Rekursinstanzen, § 76 Strafbestimmungen (z. B. Verletzung der Schulpflicht)"},
   {"id": "go", "ebene": 3, "titel": "Gemeindeordnung – Zuständigkeiten und Delegation", "fundstelle": "kommunal", "art": "Gemeindeordnung (Stimmberechtigte)",
    "hinweis": "Legt fest, welche Organe entscheiden – Grundlage für Neubeurteilung und Rekurs", "muster": r"gemeindeordnung|\(go\)", "ohne": r"protokoll"},
   {"id": "gs", "ebene": 3, "titel": "Geschäftsordnung / Organisationsstatut – Delegation an Schulleitung und Verwaltung", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Übertragene Entscheide können bei der Schulpflege zur Neubeurteilung gebracht werden", "muster": r"organisationsstatut|funktionendiagramm|geschaeftsordnung.*schul|geschaeftsreglement.*schul|schulpflege.*geschaefts",
    "ohne": r"gemeinderat|werkkommission|energie|kirch|feuerwehr|forst|wasser|praevention"}],
  "kanten": [
   {"von": "kv", "nach": "bv", "art": "konkretisiert", "beleg": ("101", "suche:Art. 18 ¹"), "beleg_oben": ("sr-101", "Art. 29")},
   {"von": "vrg", "nach": "kv", "art": "Umsetzung", "beleg": ("101", "suche:Art. 77 ¹")},
   {"von": "gg", "nach": "vrg", "art": "verweist auf", "beleg": ("131.1", "§ 171.")},
   {"von": "vsg", "nach": "vrg", "art": "verweist auf", "beleg": ("412.100", "§ 75."), "beleg_unten": ("412.100", "§ 73.")},
   {"von": "go", "nach": "kv", "art": "Grundlage", "beleg": ("101", "suche:Art. 89 ¹")},
   {"von": "go", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 170.")},
   {"von": "gs", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 74.")},
   {"von": "gs", "nach": "go", "art": "gestützt auf"}]},
 {"id": "unterricht", "titel": "Unterricht & Medien",
  "ebenen": ["Bund", "Kanton – Gesetze", "Bildungsrat", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "urg", "ebene": 0, "titel": "Urheberrechtsgesetz (URG)", "sr": "231.1", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/1993/1798_1798_1798/de",
    "hinweis": "Art. 19 Abs. 1 lit. b: Verwendung geschützter Werke durch Lehrpersonen für den Unterricht in der Klasse; Vergütung über Gemeinsame Tarife"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Lehrplan und Lehrmittel", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 21 Lehrplan, § 22 Lehrmittel"},
   {"id": "idg", "ebene": 1, "titel": "Gesetz über die Information und den Datenschutz (IDG)", "art": "Gesetz (Kantonsrat)", "ls": "170.4", "hinweis": "Bilder, Videos und Plattformen im Unterricht: Bearbeitung von Personendaten"},
   {"id": "lm", "ebene": 2, "titel": "Lehrmittel und Lehrplan (Bildungsrat)", "fundstelle": "Bildungsratsbeschlüsse", "art": "Beschluss (Bildungsrat)",
    "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2026-brb-08.html", "hinweis": "Obligatorische und zugelassene Lehrmittel; Anforderungen an Lehrmittel",
    "liste": [{"titel": "BRB 8/2026 – Anforderungen an ein Lehrmittel für Sprachförderung und DaZ", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2026-brb-08.html"},
              {"titel": "BRB 4/2017 – Lehrplan für die Volksschule", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-4-volksschule-lehrplan-fuer-die-volksschule-des-kantons-zuerich.html"}]},
   {"id": "kom", "ebene": 3, "titel": "Medien-, ICT- und Lehrmittelregelungen der Schule", "fundstelle": "kommunal", "art": "Behördenerlass oder Konzept",
    "hinweis": "Medien- und ICT-Konzept, Nutzungsregeln Geräte, Mediothek/Bibliothek", "muster": r"medien|lehrmittel|ict|ipad|tablet|mediothek|schulbibliothek|informatik(konzept| konzept)|nutzungsreglement schueler",
    "ohne": r"schuetzenstube|forsthaus|gemeindesaal|gebuehr"}],
  "kanten": [
   {"von": "lm", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 22.")},
   {"von": "kom", "nach": "urg", "art": "Eigengebrauch im Unterricht", "beleg": ("sr-231.1", "Art. 19")},
   {"von": "kom", "nach": "idg", "art": "Personendaten", "beleg": ("170.4", "§ 3.")},
   {"von": "kom", "nach": "lm", "art": "verweist auf"},
   {"von": "kom", "nach": "vsg", "art": "gestützt auf", "beleg": ("412.100", "§ 21.")}]},
 {"id": "eltern", "titel": "Eltern",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "krk", "ebene": 0, "titel": "UN-Kinderrechtskonvention (KRK)", "sr": "0.107", "art": "Staatsvertrag", "url": "https://www.fedlex.admin.ch/eli/cc/1998/2055_2055_2055/de",
    "hinweis": "Art. 18: Eltern tragen die Hauptverantwortung für Erziehung und Entwicklung; Art. 12: Anhörung des Kindes"},
   {"id": "zgb", "ebene": 0, "titel": "Zivilgesetzbuch (ZGB) – elterliche Sorge", "sr": "210", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/24/233_245_233/de",
    "hinweis": "Art. 301–303: Erziehung, gewaltfreie Erziehung; Art. 302 Abs. 3: Zusammenarbeit der Eltern mit Schule und Jugendhilfe"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Stellung der Eltern", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 28 Absenzen und Dispensation, § 52 Disziplin, §§ 54–57 Zusammenarbeit, Mitwirkung, Elternpflichten"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – Absenzen, Information, Mitwirkung", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§§ 28–30 Absenzen, Dispensation, Jokertage; §§ 59–66 Information, Elterngespräche, Mitwirkung, Elternpflichten"},
   {"id": "os", "ebene": 3, "titel": "Elternmitwirkung (Organisationsstatut, Reglement)", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Das Organisationsstatut regelt die Mitwirkung der Eltern (§ 55 VSG), oft mit eigenem Reglement Elternrat/Elternforum",
    "muster": r"elternmitwirkung|elternrat|elternforum|elternmitarbeit|elternorganisation"},
   {"id": "abs", "ebene": 3, "titel": "Absenzen, Jokertage, Schulordnung", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Regeln zu Absenzen, Urlaub, Dispensation, Jokertagen, Verhalten und Disziplin",
    "muster": r"absenz|jokertag|dispens|urlaub von schuel|schulordnung|schulhausordnung|verhaltens|disziplin", "ohne": r"sammelstelle|entsorg|friedhof|werkhof|personal|mitarbeit|antrag|gesuch|formular|verpflichtungserklaerung"}],
  "kanten": [
   {"von": "zgb", "nach": "krk", "art": "Umsetzung", "beleg": ("sr-0.107", "Art. 18")},
   {"von": "vsg", "nach": "zgb", "art": "Zusammenarbeit (Art. 302 ZGB)", "beleg": ("412.100", "§ 54."), "beleg_oben": ("sr-210", "Art. 302")},
   {"von": "vsg", "nach": "krk", "art": "Mitwirkung", "beleg": ("412.100", "§ 50."), "beleg_oben": ("sr-0.107", "Art. 12")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 66."), "beleg_unten": ("412.101", "§ 28.")},
   {"von": "os", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 55.")},
   {"von": "os", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 65.")},
   {"von": "abs", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 30."), "beleg_unten": ("412.101", "§ 28.")},
   {"von": "abs", "nach": "vsg", "art": "Disziplin", "beleg": ("412.100", "§ 52.")}]},
 {"id": "gesundheit", "titel": "Gesundheit",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "epg", "ebene": 0, "titel": "Epidemiengesetz (EpG)", "sr": "818.101", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/2015/297/de",
    "hinweis": "Art. 21: Kantone überprüfen den Impfstatus während der obligatorischen Schulzeit; Art. 40: Massnahmen gegenüber der Bevölkerung (z. B. Schulschliessungen)"},
   {"id": "gesg", "ebene": 1, "titel": "Gesundheitsgesetz (GesG)", "art": "Gesetz (Kantonsrat)", "ls": "810.1",
    "hinweis": "§ 49 Gesundheitsförderung in Schulen, § 50 Prävention und ärztliche Überwachung während der Schulpflicht"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – schulärztlicher Dienst", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 20: Die Gemeinden bezeichnen die schulärztlichen Dienste"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – Untersuchungen, Impfen", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§ 16 schulärztlicher Dienst, §§ 17–17 c drei schulärztliche Untersuchungen, § 18 Impfen"},
   {"id": "vvepig", "ebene": 2, "titel": "Vollzugsverordnung zur Epidemiengesetzgebung (VV EpiG)", "art": "Verordnung (Regierungsrat)", "ls": "818.11"},
   {"id": "vsvz", "ebene": 2, "titel": "Verordnung über die Schul- und Volkszahnpflege (VSVZ)", "art": "Verordnung (Regierungsrat)", "ls": "818.22",
    "hinweis": "§ 1: Die Gemeinden organisieren die Schulzahnpflege (Prophylaxe, jährliche Untersuchung)"},
   {"id": "sad", "ebene": 3, "titel": "Schulärztlicher und schulzahnärztlicher Dienst, Gesundheitsförderung", "fundstelle": "kommunal", "art": "Behördenerlass oder Vertrag",
    "hinweis": "Vertrag mit Schulärztin/Schularzt und Schulzahnklinik, Reglement Schulgesundheit, Präventionskonzept",
    "muster": r"schulaerzt|schularzt|schulzahn|zahnpflege|zahnarzt|zahnklinik|schulgesundheit|gesundheitsfoerder|suchtpraevention|praevention", "ohne": r"spitex|alters|pflegeheim|friedhof|kommission|brand|feuer"}],
  "kanten": [
   {"von": "gesg", "nach": "epg", "art": "Umsetzung (Art. 21 EpG)", "beleg": ("810.1", "§ 50."), "beleg_oben": ("sr-818.101", "Art. 21")},
   {"von": "vvepig", "nach": "epg", "art": "Vollzug", "beleg": ("818.11", "§ 6.")},
   {"von": "vsg", "nach": "gesg", "art": "verweist auf", "beleg": ("412.100", "§ 20.")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 16.")},
   {"von": "vsv", "nach": "epg", "art": "Impfen", "beleg": ("412.101", "§ 18.")},
   {"von": "vsvz", "nach": "gesg", "art": "Gesundheitsgesetzgebung"},
   {"von": "sad", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 20.")},
   {"von": "sad", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 17.")},
   {"von": "sad", "nach": "vsvz", "art": "Grundlage", "beleg": ("818.22", "§ 1.")},
   {"von": "sad", "nach": "gesg", "art": "Grundlage", "beleg": ("810.1", "§ 49.")}]}, {"id": "organisation", "titel": "Schulorganisation & Qualität",
  "ebenen": ["Kanton – Verfassung", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "kv", "ebene": 0, "titel": "Verfassung des Kantons Zürich (KV)", "art": "Verfassung (Stimmberechtigte)", "ls": "101", "hinweis": "Art. 85 Gemeindeautonomie, Art. 89 Gemeindeordnung"},
   {"id": "gg", "ebene": 1, "titel": "Gemeindegesetz (GG) – Schulpflege", "art": "Gesetz (Kantonsrat)", "ls": "131.1", "hinweis": "§§ 54 ff.: Schulpflege in politischen Gemeinden und Schulgemeinden"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Organisation und Qualität", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§§ 41–46 Schulträger, Organisationsstatut, Schulprogramm, Schulpflege, Leitung Bildung, Schulleitung, Schulkonferenz, Schulverwaltung; §§ 47–49 Qualitätssicherung"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – Organisation und Qualität", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§§ 41–46 Organisationsstatut, Schulprogramm, Schulpflege, Schulkonferenz; §§ 47–53 interne und externe Beurteilung (Fachstelle Schulbeurteilung)"},
   {"id": "go", "ebene": 3, "titel": "Gemeindeordnung", "fundstelle": "kommunal", "art": "Gemeindeordnung (Stimmberechtigte)", "muster": r"gemeindeordnung|\(go\)", "ohne": r"protokoll"},
   {"id": "os", "ebene": 3, "titel": "Organisationsstatut, Funktionendiagramm", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "muster": r"organisationsstatut|funktionendiagramm|organisationsreglement.*schul|schulorganisation", "ohne": r"gemeinderat|werkkommission|beilagen"},
   {"id": "sp", "ebene": 3, "titel": "Schulprogramm, Leitbild, Qualität", "fundstelle": "kommunal", "art": "Planungsinstrument (Schulkonferenz/Schulpflege)",
    "hinweis": "Pflicht zur Dokumentation (§ 41 b VSG), nicht zwingend in der Rechtssammlung", "muster": r"schulprogramm|jahresplanung|leitbild|qualitaetskonzept|qualitaetsmanagement|schulentwicklung"},
   {"id": "gs", "ebene": 3, "titel": "Geschäftsordnung Schulpflege, Schulkonferenz", "fundstelle": "kommunal", "art": "Behördenerlass",
    "muster": r"geschaeftsordnung.*schul|geschaeftsreglement.*schul|schulpflege.*geschaefts|schulkonferenz|konvent"}],
  "kanten": [
   {"von": "gg", "nach": "kv", "art": "Grundlage", "beleg": ("101", "suche:Art. 85 ¹")},
   {"von": "vsg", "nach": "gg", "art": "verweist auf", "beleg": ("412.100", "§ 42."), "beleg_oben": ("131.1", "§ 54.")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 41."), "beleg_unten": ("412.101", "§ 49.")},
   {"von": "go", "nach": "kv", "art": "Grundlage", "beleg": ("101", "suche:Art. 89 ¹")},
   {"von": "go", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 54.")},
   {"von": "os", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 41 a.")},
   {"von": "os", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 41.")},
   {"von": "os", "nach": "go", "art": "im Rahmen der"},
   {"von": "sp", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 41 b.")},
   {"von": "sp", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 42."), "beleg_unten": ("412.101", "§ 48.")},
   {"von": "gs", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 45.")},
   {"von": "gs", "nach": "go", "art": "gestützt auf"}]},
 {"id": "tagesstrukturen", "titel": "Tagesstrukturen & ergänzende Angebote",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "pavo", "ebene": 0, "titel": "Pflegekinderverordnung (PAVO)", "sr": "211.222.338", "art": "Verordnung (Bundesrat)", "url": "https://www.fedlex.admin.ch/eli/cc/1977/1931_1931_1931/de",
    "hinweis": "Art. 13 ff.: Bewilligungspflicht für Einrichtungen, die Kinder tagsüber betreuen"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Tagesstrukturen, ergänzende Angebote", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§§ 15–18 heimatliche Sprache, musikalische Grundbildung, Aufgabenhilfe, Schulsport; §§ 30 a–30 e Tagesstrukturen, Tagesschulen, Kinderhorte, Betreuungsschlüssel"},
   {"id": "kjhg", "ebene": 1, "titel": "Kinder- und Jugendhilfegesetz (KJHG)", "art": "Gesetz (Kantonsrat)", "ls": "852.1", "hinweis": "§§ 18–18 b familienergänzende Betreuung im Vorschulbereich"},
   {"id": "musg", "ebene": 1, "titel": "Musikschulgesetz (MuSG)", "art": "Gesetz (Kantonsrat)", "ls": "410.6"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – Tagesstrukturen, Horte", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§§ 32 a–32 f Angebot, Betreuungsschlüssel, Tagesschulen; §§ 32 g–32 m bewilligungspflichtige Kinderhorte"},
   {"id": "musv", "ebene": 2, "titel": "Musikschulverordnung (MuSV)", "art": "Verordnung (Regierungsrat)", "ls": "410.61"},
   {"id": "ts", "ebene": 3, "titel": "Tagesstrukturen, Betreuung, Tarife", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "muster": r"tagesstruktur|tagesschule|betreuung|\bhort|mittagstisch|schulergaenzend", "ohne": r"vorschul|familienergaenzend|alters|spitex|pflege|merkblatt|kesb"},
   {"id": "ms", "ebene": 3, "titel": "Musikschule", "fundstelle": "kommunal", "art": "Gemeindeerlass oder Vereinbarung", "muster": r"musikschul|musikalisch"},
   {"id": "kb", "ebene": 3, "titel": "Familienergänzende Kinderbetreuung (Vorschulbereich)", "fundstelle": "kommunal", "art": "Gemeindeerlass",
    "hinweis": "Meist Sache der politischen Gemeinde", "muster": r"familienergaenzend|kinderbetreuung|\bkita|krippe|tagesfamil", "ohne": r"merkblatt"}],
  "kanten": [
   {"von": "vsg", "nach": "pavo", "art": "verweist auf", "beleg": ("412.100", "§ 30 c."), "beleg_oben": ("sr-211.222.338", "Art. 13")},
   {"von": "kjhg", "nach": "pavo", "art": "verweist auf", "beleg": ("852.1", "§ 18 b.")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 32 a."), "beleg_unten": ("412.101", "§ 32 g.")},
   {"von": "musv", "nach": "musg", "art": "Vollzug", "beleg": ("410.61", "§ 1.")},
   {"von": "ts", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 30 a.")},
   {"von": "ts", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 32 a."), "beleg_unten": ("412.101", "§ 32 b.")},
   {"von": "ms", "nach": "musg", "art": "Grundlage", "beleg": ("410.6", "§ 2.")},
   {"von": "ms", "nach": "musv", "art": "Beiträge", "beleg": ("410.61", "§ 19.")},
   {"von": "kb", "nach": "kjhg", "art": "Grundlage", "beleg": ("852.1", "§ 18.")},
   {"von": "kb", "nach": "pavo", "art": "Bewilligung", "beleg": ("sr-211.222.338", "Art. 13")}]},
 {"id": "schulpflicht", "titel": "Schulpflicht, Schulort & Privatschulen",
  "ebenen": ["Bund", "Interkantonal", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "bv", "ebene": 0, "titel": "Bundesverfassung (BV) – Grundschulunterricht", "sr": "101", "art": "Verfassung", "url": "https://www.fedlex.admin.ch/eli/cc/1999/404/de",
    "hinweis": "Art. 19 ausreichender und unentgeltlicher Grundschulunterricht; Art. 62 obligatorisch, unter staatlicher Leitung oder Aufsicht"},
   {"id": "rsa", "ebene": 1, "titel": "Regionales Schulabkommen (RSA 2009)", "art": "Beitrittsgesetz (Kantonsrat)", "ls": "414.16", "hinweis": "Schulbesuch in anderen Kantonen und Beiträge zwischen den Kantonen"},
   {"id": "vsg", "ebene": 2, "titel": "Volksschulgesetz (VSG) – Schulpflicht, Schulort, Privatschulen", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 3 Schulpflicht; §§ 10–12 Schulort, Unentgeltlichkeit, Elternbeiträge, Schulgeld; §§ 68–72 Privatschulen und Privatunterricht; § 67 a interkantonale Verträge"},
   {"id": "vsv", "ebene": 3, "titel": "Volksschulverordnung (VSV) – Schulort, Privatschulen", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§§ 2–3 Schulpflicht, Rückstellung; §§ 7–11 Wohnort, Schulort, Schulweg, Zuteilung, Schulgeld; §§ 67–74 Privatschulen, Privatunterricht"},
   {"id": "sg", "ebene": 4, "titel": "Schulweg, Zuteilung, Schulgeld, Elternbeiträge", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "muster": r"schulgeld|schulweg|schulbus|zuteilung|einzugsgebiet|schulkreis|verpflegungsbeitrag|elternbeitr|schuelertransport", "ohne": r"beschluss|stellenbeschrieb|merkblatt"}],
  "kanten": [
   {"von": "vsg", "nach": "bv", "art": "Umsetzung", "beleg": ("412.100", "§ 3."), "beleg_oben": ("sr-101", "Art. 19")},
   {"von": "rsa", "nach": "bv", "art": "Koordination (Art. 62 BV)", "beleg": ("414.16", "§ 1."), "beleg_oben": ("sr-101", "Art. 62")},
   {"von": "vsg", "nach": "rsa", "art": "interkantonale Verträge", "beleg": ("412.100", "§ 67 a.")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 7."), "beleg_unten": ("412.101", "§ 67.")},
   {"von": "sg", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 11.")},
   {"von": "sg", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 8."), "beleg_unten": ("412.101", "§ 11.")}]},
 {"id": "beurteilung", "titel": "Beurteilung & Schullaufbahn",
  "ebenen": ["Kanton – Gesetze", "Kanton – Verordnungen", "Bildungsrat", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "vsg", "ebene": 0, "titel": "Volksschulgesetz (VSG) – Beurteilung, Promotion", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 31 Beurteilung, § 32 Promotion und Übertritte"},
   {"id": "msg", "ebene": 0, "titel": "Mittelschulgesetz (MSG)", "art": "Gesetz (Kantonsrat)", "ls": "413.21", "hinweis": "§ 14: Aufnahme in die Mittelschulen"},
   {"id": "vsv", "ebene": 1, "titel": "Volksschulverordnung (VSV) – Schullaufbahn", "art": "Verordnung (Regierungsrat)", "ls": "412.101", "hinweis": "§§ 33–40 Schullaufbahnentscheide, Promotion, Repetition, Übertritt, Wechsel in der Sekundarstufe"},
   {"id": "aufn6", "ebene": 1, "titel": "Aufnahme Gymnasium nach der 6. Klasse", "art": "Reglement (Regierungsrat)", "ls": "413.250.1"},
   {"id": "aufn", "ebene": 1, "titel": "Aufnahme in die Maturitätsschulen nach der Sekundarstufe", "art": "Verordnung (Regierungsrat)", "ls": "413.250.2"},
   {"id": "zr", "ebene": 2, "titel": "Zeugnisreglement", "art": "Reglement (Bildungsrat)", "ls": "412.121.31",
    "liste": [{"titel": "BRB 5/2025 – Anpassungen Beurteilung und Zeugnis", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2025-brb-05.html"}]},
   {"id": "kom", "ebene": 3, "titel": "Beurteilung, Einstufung, Übertritt in der Schule", "fundstelle": "kommunal", "art": "Behördenerlass oder Richtlinie",
    "hinweis": "Selten als Erlass – meist interne Richtlinien", "muster": r"zeugnis|promotion|uebertritt|einstufung|stufenwechsel|lernbericht|beurteilung", "ohne": r"mitarbeit|personal|schulbeurteilung|beurteilungsteam"}],
  "kanten": [
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 33."), "beleg_unten": ("412.101", "§ 39.")},
   {"von": "zr", "nach": "vsg", "art": "Grundlage", "beleg": ("412.121.31", "Ingress"), "beleg_oben": ("412.100", "§ 31.")},
   {"von": "aufn6", "nach": "msg", "art": "Grundlage", "beleg": ("413.250.1", "Ingress"), "beleg_oben": ("413.21", "§ 14.")},
   {"von": "aufn", "nach": "msg", "art": "Grundlage", "beleg": ("413.250.2", "Ingress")},
   {"von": "aufn6", "nach": "vsg", "art": "Übertritt (§ 32 VSG)", "beleg": ("412.100", "§ 32.")},
   {"von": "kom", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 34.")},
   {"von": "kom", "nach": "zr", "art": "verweist auf"}]},
 {"id": "sprache", "titel": "Sprache & Integration",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Bildungsrat", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "bv", "ebene": 0, "titel": "Bundesverfassung (BV) – Sprachen", "sr": "101", "art": "Verfassung", "url": "https://www.fedlex.admin.ch/eli/cc/1999/404/de", "hinweis": "Art. 70: Amtssprachen; die Kantone bestimmen ihre Amtssprachen"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Sprache, zusätzliche Angebote", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 15 Kurse in heimatlicher Sprache und Kultur, § 24 Unterrichtssprache, § 25 zusätzliche Angebote (QUIMS), § 34 sonderpädagogische Massnahmen inkl. DaZ"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – HSK, QUIMS", "art": "Verordnung (Regierungsrat)", "ls": "412.101", "hinweis": "§§ 13–14 Kurse in heimatlicher Sprache und Kultur, § 20 QUIMS"},
   {"id": "vsm", "ebene": 2, "titel": "Verordnung über die sonderpädagogischen Massnahmen (VSM) – DaZ", "art": "Verordnung (Regierungsrat)", "ls": "412.103",
    "hinweis": "§§ 12 ff. Unterricht in Deutsch als Zweitsprache, § 16 a Aufnahmeklassen Asyl"},
   {"id": "brb", "ebene": 3, "titel": "Lehrmittel DaZ (Bildungsrat)", "fundstelle": "Bildungsratsbeschlüsse", "art": "Beschluss (Bildungsrat)", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2026-brb-08.html",
    "liste": [{"titel": "BRB 8/2026 – Anforderungen an ein Lehrmittel für Sprachförderung und DaZ", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2026-brb-08.html"}]},
   {"id": "kom", "ebene": 4, "titel": "DaZ-, Integrations- und QUIMS-Konzepte", "fundstelle": "kommunal", "art": "Konzept oder Behördenerlass",
    "muster": r"\bdaz\b|deutsch als zweit|integration|quims|\bhsk\b|heimatliche sprache|aufnahmeklass|interkulturell|sprachfoerder", "ohne": r"integrierte sonderschul|integrative foerderung"}],
  "kanten": [
   {"von": "vsg", "nach": "bv", "art": "Unterrichtssprache", "beleg": ("412.100", "§ 24."), "beleg_oben": ("sr-101", "Art. 70")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 13."), "beleg_unten": ("412.101", "§ 20.")},
   {"von": "vsm", "nach": "vsg", "art": "Vollzug", "beleg": ("412.103", "§ 1.")},
   {"von": "brb", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 22.")},
   {"von": "kom", "nach": "vsm", "art": "Grundlage", "beleg": ("412.103", "§ 12.")},
   {"von": "kom", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 20.")},
   {"von": "kom", "nach": "brb", "art": "verweist auf"}]},
 {"id": "absenzen", "titel": "Absenzen, Urlaub, Jokertage",
  "ebenen": ["Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "vsg", "ebene": 0, "titel": "Volksschulgesetz (VSG) – Absenzen und Dispensation", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 28 Absenzen und Dispensation, § 57 Elternpflichten, § 76 Strafbestimmungen"},
   {"id": "vsv", "ebene": 1, "titel": "Volksschulverordnung (VSV) – Absenzen, Dispensation, Jokertage", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§ 28 Absenzen, § 29 Dispensation, § 30 Jokertage, § 66 Elternpflichten"},
   {"id": "abs", "ebene": 2, "titel": "Absenzen- und Urlaubsregelung der Schule", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Zuständigkeit für Urlaubsgesuche, Fristen, Formulare", "muster": r"absenz|jokertag|dispens|urlaub", "ohne": r"personal|mitarbeit|lehrperson"}],
  "kanten": [
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 28."), "beleg_unten": ("412.101", "§ 29.")},
   {"von": "abs", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 30."), "beleg_unten": ("412.101", "§ 29.")},
   {"von": "abs", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 28.")}]},
 {"id": "kosten", "titel": "Kosten für Eltern",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "bv", "ebene": 0, "titel": "Bundesverfassung (BV) – unentgeltlicher Grundschulunterricht", "sr": "101", "art": "Verfassung", "url": "https://www.fedlex.admin.ch/eli/cc/1999/404/de", "hinweis": "Art. 19 und 62 Abs. 2: Grundschulunterricht an öffentlichen Schulen ist unentgeltlich"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Unentgeltlichkeit und Elternbeiträge", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 11 Unentgeltlichkeit und Elternbeiträge (z. B. Verpflegung in Lagern), § 30 a Tagesstrukturen"},
   {"id": "musg", "ebene": 1, "titel": "Musikschulgesetz (MuSG) – Elternbeiträge", "art": "Gesetz (Kantonsrat)", "ls": "410.6", "hinweis": "§ 9 Elternbeiträge an die Musikschule"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – Schulgeld, Verpflegung", "art": "Verordnung (Regierungsrat)", "ls": "412.101", "hinweis": "§ 11 Schulgeld und Verpflegungsbeitrag, § 17 c Kosten der schulärztlichen Untersuchung"},
   {"id": "musv", "ebene": 2, "titel": "Musikschulverordnung (MuSV)", "art": "Verordnung (Regierungsrat)", "ls": "410.61"},
   {"id": "kom", "ebene": 3, "titel": "Elternbeiträge und Tarife (Lager, Betreuung, Musikschule)", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "muster": r"elternbeitr|lagerbeitr|kostenbeteiligung|tarif.*(betreu|hort|schul|musik|tagesstruktur)|(betreu|hort|schul|musik).*tarif|beitragsverordnung|schulgeld", "ohne": r"wasser|abwasser|werke|kesb|bibliothek|bau|personal|benuetzer|benutzer|schulraeume|vermiet"}],
  "kanten": [
   {"von": "vsg", "nach": "bv", "art": "Umsetzung", "beleg": ("412.100", "§ 11."), "beleg_oben": ("sr-101", "Art. 19")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 11."), "beleg_unten": ("412.101", "§ 17 c.")},
   {"von": "musv", "nach": "musg", "art": "Vollzug", "beleg": ("410.61", "§ 1.")},
   {"von": "kom", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 11.")},
   {"von": "kom", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 11.")},
   {"von": "kom", "nach": "musg", "art": "Elternbeiträge Musikschule", "beleg": ("410.6", "§ 9.")}]},
 {"id": "gemeindeorganisation", "titel": "Gemeindeorganisation, Rechtsetzung & Information",
  "ebenen": ["Kanton – Verfassung", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "kv", "ebene": 0, "titel": "Verfassung des Kantons Zürich (KV)", "art": "Verfassung (Stimmberechtigte)", "ls": "101", "hinweis": "Art. 85 Gemeindeautonomie, Art. 89 Gemeindeordnung"},
   {"id": "gg", "ebene": 1, "titel": "Gemeindegesetz (GG) – Grundlagen", "art": "Gesetz (Kantonsrat)", "ls": "131.1",
    "hinweis": "§ 2 Autonomie, § 3 Gliederung, § 4 Rechtsetzung, § 5 Gemeindeorgane, § 6 Protokoll, § 7 Publikation, § 8 Schweigepflicht, § 43 Ausschluss der Öffentlichkeit"},
   {"id": "idg", "ebene": 1, "titel": "Gesetz über die Information und den Datenschutz (IDG) – Öffentlichkeitsprinzip", "art": "Gesetz (Kantonsrat)", "ls": "170.4", "hinweis": "§ 20 Zugang zu Informationen"},
   {"id": "vgg", "ebene": 2, "titel": "Gemeindeverordnung (VGG) – Rechtssammlung", "art": "Verordnung (Regierungsrat)", "ls": "131.11", "hinweis": "§ 2: Inhalt der Rechtssammlung (Gemeindeordnung, Gemeinde- und Behördenerlasse, Zweckverbandsstatuten)"},
   {"id": "go", "ebene": 3, "titel": "Gemeindeordnung", "fundstelle": "kommunal", "art": "Gemeindeordnung (Stimmberechtigte)", "muster": r"gemeindeordnung|\(go\)", "ohne": r"protokoll"},
   {"id": "pub", "ebene": 3, "titel": "Publikation, Information, Rechtssammlung", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "hinweis": "Publikationsorgan, Informationsreglement, Kommunikation – und die systematische Rechtssammlung selbst (Leitfaden, Pflichtkatalog)",
    "muster": r"publikation|amtsblatt|informationsreglement|informationskonzept|kommunikation|oeffentlichkeitsprinzip|rechtssammlung", "ohne": r"protokoll|beschluss"}],
  "kanten": [
   {"von": "gg", "nach": "kv", "art": "Grundlage", "beleg": ("101", "suche:Art. 85 ¹")},
   {"von": "vgg", "nach": "gg", "art": "Vollzug", "beleg": ("131.11", "§ 2."), "beleg_oben": ("131.1", "§ 7.")},
   {"von": "go", "nach": "kv", "art": "Grundlage", "beleg": ("101", "suche:Art. 89 ¹")},
   {"von": "go", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 4."), "beleg_unten": ("131.1", "§ 5.")},
   {"von": "pub", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 7."), "beleg_unten": ("131.1", "§ 6.")},
   {"von": "pub", "nach": "vgg", "art": "Grundlage", "beleg": ("131.11", "§ 2.")},
   {"von": "pub", "nach": "idg", "art": "Öffentlichkeitsprinzip", "beleg": ("170.4", "§ 20.")}]},
 {"id": "stimmberechtigte", "titel": "Stimmberechtigte, Gemeindeversammlung & Parlament",
  "ebenen": ["Kanton – Verfassung", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "kv", "ebene": 0, "titel": "Verfassung des Kantons Zürich (KV)", "art": "Verfassung (Stimmberechtigte)", "ls": "101", "hinweis": "Art. 86 Volksrechte in der Gemeinde, Art. 87 Organe der Gemeinde"},
   {"id": "gg", "ebene": 1, "titel": "Gemeindegesetz (GG) – Stimmberechtigte, Versammlung, Parlament", "art": "Gesetz (Kantonsrat)", "ls": "131.1",
    "hinweis": "§§ 9–13 Urnengeschäfte, Antragsrecht; §§ 14–26 Gemeindeversammlung (Einberufung, beleuchtender Bericht, Abstimmung, Wahlen); §§ 27–37 Gemeindeparlament"},
   {"id": "gpr", "ebene": 1, "titel": "Gesetz über die politischen Rechte (GPR)", "art": "Gesetz (Kantonsrat)", "ls": "161"},
   {"id": "vpr", "ebene": 2, "titel": "Verordnung über die politischen Rechte (VPR)", "art": "Verordnung (Regierungsrat)", "ls": "161.1"},
   {"id": "go", "ebene": 3, "titel": "Gemeindeordnung – Zuständigkeiten der Stimmberechtigten", "fundstelle": "kommunal", "art": "Gemeindeordnung (Stimmberechtigte)", "muster": r"gemeindeordnung|\(go\)", "ohne": r"protokoll"},
   {"id": "gv", "ebene": 3, "titel": "Geschäftsordnung Gemeindeversammlung / Parlament", "fundstelle": "kommunal", "art": "Gemeinde- oder Parlamentserlass",
    "muster": r"gemeindeversammlung|parlament|geschaeftsordnung des gemeinderat|geschaeftsordnung gemeinderat", "ohne": r"protokoll|einladung|beleuchtend"}],
  "kanten": [
   {"von": "gg", "nach": "kv", "art": "Grundlage", "beleg": ("101", "suche:Art. 86 ¹")},
   {"von": "gpr", "nach": "kv", "art": "Umsetzung", "beleg": ("161", "§ 1.")},
   {"von": "vpr", "nach": "gpr", "art": "Vollzug", "beleg": ("161.1", "Ingress")},
   {"von": "gg", "nach": "gpr", "art": "verweist auf", "beleg": ("131.1", "§ 13.")},
   {"von": "go", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 15."), "beleg_unten": ("131.1", "§ 10.")},
   {"von": "gv", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 18."), "beleg_unten": ("131.1", "§ 20.")},
   {"von": "gv", "nach": "go", "art": "gestützt auf"}]},
 {"id": "behoerden", "titel": "Behörden & Kommissionen",
  "ebenen": ["Kanton – Gesetze", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "gg", "ebene": 0, "titel": "Gemeindegesetz (GG) – Behörden", "art": "Gesetz (Kantonsrat)", "ls": "131.1",
    "hinweis": "§§ 38–46 Beschlussfassung, Ausstand, Ausschluss der Öffentlichkeit, Aufgabenübertragung, beratende Kommissionen; §§ 47–52 Gemeindevorstand, Kommissionen; §§ 54–57 Schulpflege"},
   {"id": "vrg", "ebene": 0, "titel": "Verwaltungsrechtspflegegesetz (VRG) – Ausstand", "art": "Gesetz (Kantonsrat)", "ls": "175.2", "hinweis": "§ 5 a Ausstand"},
   {"id": "vsg", "ebene": 0, "titel": "Volksschulgesetz (VSG) – Schulpflege", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 42 Aufgaben der Schulpflege, Übertragung an Schulleitung, Leitung Bildung, Verwaltung"},
   {"id": "gs", "ebene": 1, "titel": "Geschäftsordnung der Behörde", "fundstelle": "kommunal", "art": "Behördenerlass", "muster": r"geschaeftsordnung|geschaeftsreglement", "ohne": r"gemeindeversammlung|parlament|kommission|geschaeftsordnung des gemeinderat"},
   {"id": "kom", "ebene": 1, "titel": "Kommissionen (Reglemente)", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "muster": r"kommission.*(reglement|ordnung|verordnung)|(reglement|ordnung|verordnung).*kommission", "ohne": r"rechnungspruefung|geschaeftspruefung"},
   {"id": "komp", "ebene": 1, "titel": "Kompetenzen und Delegation (Funktionendiagramm, Unterschriften)", "fundstelle": "kommunal", "art": "Behördenerlass",
    "muster": r"kompetenz|funktionendiagramm|unterschrift|zustaendigkeitsordnung|delegation", "ohne": r"befoerderung|kompetenzzentrum|anstaltsvertrag"}],
  "kanten": [
   {"von": "gg", "nach": "vrg", "art": "Ausstand", "beleg": ("131.1", "§ 42."), "beleg_oben": ("175.2", "§ 5 a.")},
   {"von": "gs", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 38."), "beleg_unten": ("131.1", "§ 39.")},
   {"von": "kom", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 51."), "beleg_unten": ("131.1", "§ 50.")},
   {"von": "komp", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 44."), "beleg_unten": ("131.1", "§ 45.")},
   {"von": "komp", "nach": "vsg", "art": "Delegation Schulpflege", "beleg": ("412.100", "§ 42.")}]},
 {"id": "wahlen", "titel": "Wahlen & Behördenmitglieder",
  "ebenen": ["Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "gpr", "ebene": 0, "titel": "Gesetz über die politischen Rechte (GPR) – Wahlen", "art": "Gesetz (Kantonsrat)", "ls": "161",
    "hinweis": "§ 23 Wohnsitzpflicht, §§ 25–30 Unvereinbarkeit, § 32 Amtsdauer, § 40 Wahl der Gemeindeorgane, § 47 Teilämter, §§ 54 ff. stille Wahl"},
   {"id": "gg", "ebene": 0, "titel": "Gemeindegesetz (GG) – Wahlen, Schulpflege", "art": "Gesetz (Kantonsrat)", "ls": "131.1", "hinweis": "§ 26 Wahlverfahren an der Versammlung, § 55 Zusammensetzung der Schulpflege"},
   {"id": "vpr", "ebene": 1, "titel": "Verordnung über die politischen Rechte (VPR)", "art": "Verordnung (Regierungsrat)", "ls": "161.1"},
   {"id": "go", "ebene": 2, "titel": "Gemeindeordnung – Wahlart, Mitgliederzahl, Amtsdauer", "fundstelle": "kommunal", "art": "Gemeindeordnung (Stimmberechtigte)", "muster": r"gemeindeordnung|\(go\)", "ohne": r"protokoll"},
   {"id": "ent", "ebene": 2, "titel": "Entschädigung der Behördenmitglieder", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "muster": r"entschaedigungsverordnung|entschaedigungsreglement|\bevo\b|entschaedigung (der )?behoerde|behoerdenentschaedigung|sitzungsgeld", "ohne": r"beschluss|anpassung"}],
  "kanten": [
   {"von": "vpr", "nach": "gpr", "art": "Vollzug", "beleg": ("161.1", "Ingress"), "beleg_unten": ("161.1", "§ 27.")},
   {"von": "gg", "nach": "gpr", "art": "verweist auf", "beleg": ("131.1", "§ 26.")},
   {"von": "go", "nach": "gpr", "art": "Grundlage", "beleg": ("161", "§ 40."), "beleg_unten": ("161", "§ 25.")},
   {"von": "go", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 55.")},
   {"von": "ent", "nach": "go", "art": "gestützt auf"}]},
 {"id": "kontrolle", "titel": "Prüfung & Aufsicht",
  "ebenen": ["Kanton – Gesetze", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "gg", "ebene": 0, "titel": "Gemeindegesetz (GG) – Prüfung und Aufsicht", "art": "Gesetz (Kantonsrat)", "ls": "131.1",
    "hinweis": "§§ 58–62 Rechnungsprüfungs- und Geschäftsprüfungskommission; §§ 163–169 Aufsicht (Bezirksrat, Kanton), §§ 170–172 Neubeurteilung und Weiterzug"},
   {"id": "vsg", "ebene": 0, "titel": "Volksschulgesetz (VSG) – Aufsicht", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 73 Aufsicht und Ersatzvornahme; §§ 47–49 Qualitätssicherung"},
   {"id": "rpk", "ebene": 1, "titel": "Rechnungsprüfungs- und Geschäftsprüfungskommission", "fundstelle": "kommunal", "art": "Gemeinde- oder Behördenerlass",
    "muster": r"rechnungspruefung|geschaeftspruefung|\brpk\b|\bgpk\b", "ohne": r"bericht|abschied|antrag|anpassung|entschaedigung"}],
  "kanten": [
   {"von": "vsg", "nach": "gg", "art": "Aufsicht", "beleg": ("412.100", "§ 73."), "beleg_oben": ("131.1", "§ 164.")},
   {"von": "rpk", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 58."), "beleg_unten": ("131.1", "§ 59.")}]},
 {"id": "zusammenarbeit", "titel": "Zusammenarbeit & Gemeindestrukturen",
  "ebenen": ["Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "gg", "ebene": 0, "titel": "Gemeindegesetz (GG) – Zusammenarbeit, Zusammenschluss", "art": "Gesetz (Kantonsrat)", "ls": "131.1",
    "hinweis": "§§ 63–70 Aufgabenträger, Ausgliederung; §§ 71–83 Anschlussvertrag, Zusammenarbeitsvertrag, Zweckverband, gemeinsame Anstalt; §§ 151–162 Zusammenschluss, § 154 Übernahme der Schulaufgaben"},
   {"id": "vsg", "ebene": 0, "titel": "Volksschulgesetz (VSG) – Schulträger", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 41 Schulträger"},
   {"id": "vgg", "ebene": 1, "titel": "Gemeindeverordnung (VGG)", "art": "Verordnung (Regierungsrat)", "ls": "131.11", "hinweis": "§ 2: Zweckverbandsstatuten gehören in die Rechtssammlung"},
   {"id": "zv", "ebene": 2, "titel": "Zweckverbände und Verträge im Schulbereich", "fundstelle": "kommunal", "art": "Rechtsetzender Vertrag / Statuten",
    "hinweis": "Nur Schule, Kinder und Jugend; weitere Zweckverbände (Feuerwehr, Wasser, Abfall …) sind ausgeblendet",
    "muster": r"(zweckverband|statuten|anschlussvertrag|zusammenarbeitsvertrag|interkommunal|gemeinsame anstalt|leistungsvereinbarung|vereinbarung).*(schul|psycholog|sonder|musik|bildung|jugend|kind|hort|betreu)|(schul|psycholog|sonder|musik|bildung|jugend|kind|hort|betreu).*(zweckverband|statuten|anschlussvertrag|vertrag|vereinbarung)",
    "ohne": r"protokoll|beschluss|kindes und erwachsenenschutz|kesb|pflege|forst"},
   {"id": "eg", "ebene": 2, "titel": "Einheitsgemeinde (Übernahme der Schulaufgaben)", "fundstelle": "kommunal", "art": "Gemeindeordnung / Zusammenschlussvertrag",
    "hinweis": "Politische Gemeinde übernimmt die Schulaufgaben (§ 154 GG) – in der Gemeindeliste mit «EG» vermerkt"}],
  "kanten": [
   {"von": "zv", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 73."), "beleg_unten": ("131.1", "§ 71.")},
   {"von": "zv", "nach": "vgg", "art": "Rechtssammlung", "beleg": ("131.11", "§ 2.")},
   {"von": "eg", "nach": "gg", "art": "Grundlage", "beleg": ("131.1", "§ 154.")},
   {"von": "eg", "nach": "vsg", "art": "Schulträger", "beleg": ("412.100", "§ 41.")}]},
]

# ---------------------------------------------------------------- Elternwegweiser (Auftrag 20.11.2026, Variante B)
# Fragen aus Sicht der Eltern; je Frage die einschlägigen Stellen (Zitat aus der Textfassung), die passenden Themen der
# Normenhierarchie und Suchmuster für die Dokumente der gewählten Gemeinde. Kein Rechtsrat – massgebend sind die Erlasse.
ELTERNFRAGEN = [
 {"id": "eintritt", "titel": "Schuleintritt & Schulweg", "fragen": ["Wann beginnt die Schulpflicht, kann der Eintritt verschoben werden?", "Welche Schule besucht mein Kind, wie ist der Schulweg geregelt?"],
  "stellen": [("412.100", "§ 3."), ("412.100", "§ 10."), ("412.101", "§ 2."), ("412.101", "§ 3."), ("412.101", "§ 8.")], "themen": ["schulpflicht", "privatschulen"],
  "muster": r"schulweg|schulbus|zuteilung|einzugsgebiet|einschulung|schuleintritt|rueckstellung|schuelertransport", "ohne": r"beschluss|stellenbeschrieb"},
 {"id": "absenzen", "titel": "Absenzen, Urlaub, Jokertage", "fragen": ["Mein Kind ist krank – was muss ich melden?", "Wie beantrage ich Urlaub, eine Dispensation oder einen Jokertag?"],
  "stellen": [("412.100", "§ 28."), ("412.101", "§ 28."), ("412.101", "§ 29."), ("412.101", "§ 30.")], "themen": ["absenzen", "schulbetrieb", "eltern"],
  "muster": r"absenz|jokertag|dispens|urlaub", "ohne": r"personal|mitarbeit|lehrperson"},
 {"id": "kosten", "titel": "Kosten für Eltern", "fragen": ["Was ist unentgeltlich, was bezahle ich (Lager, Verpflegung, Betreuung, Musikschule)?"],
  "stellen": [("sr-101", "Art. 19"), ("412.100", "§ 11."), ("412.101", "§ 11."), ("410.6", "§ 9.")], "themen": ["kosten", "tagesstrukturen", "sport"],
  "muster": r"elternbeitr|lagerbeitr|kostenbeteiligung|tarif|beitragsverordnung|schulgeld", "ohne": r"wasser|abwasser|werke|kesb|bibliothek|bau|personal|gebuehrentarif$|benuetzer|benutzer|schulraeume|vermiet"},
 {"id": "betreuung", "titel": "Betreuung ausserhalb des Unterrichts", "fragen": ["Welche Betreuung bietet die Gemeinde an (Morgen, Mittag, Nachmittag, Ferien)?"],
  "stellen": [("412.100", "§ 30 a."), ("412.101", "§ 32 a.")], "themen": ["tagesstrukturen"],
  "muster": r"tagesstruktur|tagesschule|betreuung|\bhort|mittagstisch|schulergaenzend|ferienbetreuung", "ohne": r"alters|spitex|pflege|kesb"},
 {"id": "mitwirkung", "titel": "Information & Mitwirkung", "fragen": ["Wie werde ich informiert, wann gibt es Elterngespräche?", "Wo kann ich mitwirken (Elternrat, Elternforum)?"],
  "stellen": [("412.100", "§ 54."), ("412.100", "§ 55."), ("412.100", "§ 56."), ("412.101", "§ 63."), ("412.101", "§ 65.")], "themen": ["eltern"],
  "muster": r"elternmitwirkung|elternrat|elternforum|elternmitarbeit|elternorganisation"},
 {"id": "pflichten", "titel": "Pflichten der Eltern", "fragen": ["Welche Pflichten habe ich gegenüber der Schule?"],
  "stellen": [("412.100", "§ 57."), ("412.101", "§ 66."), ("sr-210", "Art. 302")], "themen": ["eltern"], "muster": None},
 {"id": "disziplin", "titel": "Verhalten, Disziplin, Auszeit", "fragen": ["Was darf die Schule bei Fehlverhalten tun?", "Was bedeutet eine Auszeit oder eine vorübergehende Wegweisung?"],
  "stellen": [("412.100", "§ 52."), ("412.100", "§ 52 a."), ("412.101", "§ 54."), ("412.101", "§ 56."), ("412.101", "§ 57.")], "themen": ["disziplin", "eltern"],
  "muster": r"disziplin|verhaltens|schulordnung|schulhausordnung", "ohne": r"sammelstelle|entsorg|friedhof|werkhof|personal|mitarbeit"},
 {"id": "foerderung", "titel": "Förderung & Sonderpädagogik", "fragen": ["Bekommt mein Kind Unterstützung (Integrative Förderung, Therapie, DaZ)?", "Wer entscheidet über sonderpädagogische Massnahmen?"],
  "stellen": [("412.100", "§ 33."), ("412.100", "§ 34."), ("412.100", "§ 37."), ("412.103", "§ 12.")], "themen": ["sonderpaedagogik", "sprache"],
  "muster": r"sonderpaedagog|integrativ|therapie|logopaed|\bdaz\b|deutsch als zweit|begab|schulpsycholog", "ohne": r"siedlung|anfrage|befoerderung"},
 {"id": "uebertritt", "titel": "Zeugnis, Promotion, Übertritt", "fragen": ["Wie wird mein Kind beurteilt?", "Wie läuft der Übertritt in die Sekundarschule oder ans Gymnasium?"],
  "stellen": [("412.100", "§ 31."), ("412.100", "§ 32."), ("412.101", "§ 39."), ("413.21", "§ 14.")], "themen": ["beurteilung"],
  "muster": r"zeugnis|promotion|uebertritt|einstufung|stufenwechsel", "ohne": r"mitarbeit|personal"},
 {"id": "gesundheit", "titel": "Gesundheit", "fragen": ["Welche schulärztlichen Untersuchungen und Impfberatungen gibt es?", "Wie ist die Schulzahnpflege organisiert?"],
  "stellen": [("412.101", "§ 17."), ("412.101", "§ 18."), ("810.1", "§ 50."), ("818.22", "§ 1.")], "themen": ["gesundheit"],
  "muster": r"schulaerzt|schularzt|schulzahn|zahnpflege|zahnarzt|zahnklinik|schulgesundheit"},
 {"id": "daten", "titel": "Daten & Fotos", "fragen": ["Welche Daten über mein Kind darf die Schule bearbeiten und weitergeben?", "Darf die Schule Fotos veröffentlichen?"],
  "stellen": [("412.100", "§ 3 a."), ("170.4", "§ 16.")], "themen": ["datenschutz"],
  "muster": r"datenschutz|foto|bildrecht|medien|video", "ohne": r"oeffentliche[mn]? grund|parkhaus|schuetzenstube|forsthaus"},
 {"id": "entscheid", "titel": "Wer entscheidet an unserer Schule?", "fragen": ["Wer ist zuständig – Schulpflege, Schulleitung, Gemeindeversammlung?", "Wie wird die Schulpflege gewählt?"],
  "stellen": [("412.100", "§ 42."), ("412.100", "§ 44."), ("131.1", "§ 15."), ("131.1", "§ 55."), ("161", "§ 40.")], "themen": ["behoerden", "organisation", "wahlen", "stimmberechtigte"],
  "muster": r"organisationsstatut|funktionendiagramm|gemeindeordnung|geschaeftsordnung.*schul|geschaeftsreglement.*schul|kompetenz", "ohne": r"protokoll|gemeinderat|werkkommission|befoerderung"},
 {"id": "beschwerde", "titel": "Nicht einverstanden – was tun?", "fragen": ["Wie verlange ich eine Begründung oder Neubeurteilung?", "Wie und wo kann ich Rekurs erheben?"],
  "stellen": [("412.100", "§ 74."), ("412.100", "§ 75."), ("131.1", "§ 170."), ("175.2", "§ 19.")], "themen": ["verfahren"],
  "muster": r"rekurs|beschwerde|neubeurteilung|ombuds|anlaufstelle"},
]

def elternwegweiser(texte):
    akt = {nr: e["fassungen"][-1]["nachtrag"] for nr, e in texte["erlasse"].items() if e["fassungen"]}
    out = []
    for f in ELTERNFRAGEN:
        stellen = []
        for nr, para in f["stellen"]:
            if nr not in akt: continue
            t = paragraf(nr, akt[nr], para)
            if t: stellen.append({"ls": nr, "nachtrag": akt[nr], "fundstelle": texte["erlasse"][nr]["fundstelle"], "titel": texte["erlasse"][nr]["titel"], "stelle": para, "text": t})
        docs = []
        if f.get("muster"):
            for o in ORGS:
                gesehen = set()
                for sec in o["sections"]:
                    for d in walk(sec):
                        t = norm(d["titel"])
                        if re.search(BEHOERDE, t) and not re.search(ERLASS, t): continue
                        if re.search(f["muster"], t) and not (f.get("ohne") and re.search(f["ohne"], t)) and t not in gesehen:
                            gesehen.add(t); docs.append({"org": o["id"], "titel": d["titel"], "url": d.get("url")})
        out.append({"id": f["id"], "titel": f["titel"], "fragen": f["fragen"], "stellen": stellen, "themen": f["themen"], "dokumente": docs})
    return out

# Reihenfolge nach Bezug zur Volksschule (Auftrag 20.11.2026): Schule → Kinder → Personal → Unterricht → Organisation und Ressourcen
# Drei weitere Themen aus dem Volksschulgesetz (22.11.2026): Schulbetrieb, Disziplin, Privatschulen
HIERARCHIEN += [
 {"id": "schulbetrieb", "titel": "Schulbetrieb: Klassen, Unterrichtszeit & Ferien",
  "ebenen": ["Kanton – Gesetze", "Kanton – Verordnungen", "Bildungsrat", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "vsg", "ebene": 0, "titel": "Volksschulgesetz (VSG) – Schulbetrieb", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 21 Abs. 2 Lektionentafeln, § 26 Klassen, § 27 Unterrichtszeit und Blockzeiten, § 29 Besuchstage, § 30 Ferien (höchstens 13 Wochen)"},
   {"id": "vsv", "ebene": 1, "titel": "Volksschulverordnung (VSV) – Klassen, Stundenplan, Ferien", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§§ 21–25 Klassengrösse und Zusammensetzung, § 26 Stundenplan, § 31 Besuchstage und Samstagsanlässe, § 32 Ferien und schulfreie Tage"},
   {"id": "lt", "ebene": 2, "titel": "Lektionentafel (Bildungsrat)", "fundstelle": "Bildungsratsbeschlüsse", "art": "Beschluss (Bildungsrat)",
    "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-5-volksschule-lektionentafel-fuer-die-kindergarten-primar-und-sekundarstufe.html", "hinweis": "Unterrichtszeit je Fach und Stufe; Teil des Lehrplans",
    "liste": [{"titel": "BRB 5/2017 – Lektionentafel Kindergarten-, Primar- und Sekundarstufe", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-5-volksschule-lektionentafel-fuer-die-kindergarten-primar-und-sekundarstufe.html"},
              {"titel": "BRB 1/2019 – Anpassung Lektionentafel Sekundarschule", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2019-brb-1-anpassung-lektionentafel-sekundarschule.html"},
              {"titel": "BRB 5/2021 – Anpassung Sekundarstufe", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2021-brb-05.html"}]},
   {"id": "kom", "ebene": 3, "titel": "Ferienplan, Stundenplan- und Schulordnung", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Ferien und schulfreie Tage, Blockzeiten, Klassenbildung",
    "muster": r"ferienplan|schulferien|ferienordnung|stundenplan|blockzeit|schuljahr|klassenbildung|unterrichtszeit",
    "ohne": r"personal|lehrperson|ferienpass|ferienhaus|ferienwohnung|ferienlager|anstellung|musikschul"}],
  "kanten": [
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 21."), "beleg_oben": ("412.100", "§ 26.")},
   {"von": "lt", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 21.")},
   {"von": "kom", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 32."), "beleg_unten": ("412.101", "§ 26.")},
   {"von": "kom", "nach": "vsg", "art": "gestützt auf", "beleg": ("412.100", "§ 27.")},
   {"von": "kom", "nach": "lt", "art": "verweist auf"}]},
 {"id": "disziplin", "titel": "Disziplin, Wegweisung & Auszeit",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "krk", "ebene": 0, "titel": "UN-Kinderrechtskonvention (KRK)", "sr": "0.107", "art": "Staatsvertrag", "url": "https://www.fedlex.admin.ch/eli/cc/1998/2055_2055_2055/de",
    "hinweis": "Art. 28 Abs. 2: Schuldisziplin muss der Menschenwürde des Kindes entsprechen"},
   {"id": "bv", "ebene": 0, "titel": "Bundesverfassung (BV) – Anspruch auf Grundschulunterricht", "sr": "101", "art": "Verfassung", "url": "https://www.fedlex.admin.ch/eli/cc/1999/404/de",
    "hinweis": "Art. 19 Anspruch auf Grundschulunterricht – Ausschluss nur befristet; Art. 29 Verfahrensgarantien (rechtliches Gehör)"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Stellung der Schülerinnen und Schüler", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 50 Grundsätze, § 52 Disziplinarmassnahmen (Schulleitung, Schulpflege), § 52 a Auszeit bis zwölf Wochen, § 65 g Kosten der Auszeit, § 75 Rekurs an den Bezirksrat"},
   {"id": "vrg", "ebene": 1, "titel": "Verwaltungsrechtspflegegesetz (VRG)", "art": "Gesetz (Kantonsrat)", "ls": "175.2",
    "hinweis": "§ 10 Begründung und Rechtsmittelbelehrung, § 19 Rekurs gegen Anordnungen der Schulpflege"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – Disziplinarmassnahmen", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§ 55 Haltung der Lehrpersonen, § 56 Disziplinarmassnahmen der Lehrperson, § 57 vorübergehende Wegweisung, § 58 Betreuung und Beschäftigung"},
   {"id": "kom", "ebene": 3, "titel": "Schul- und Hausordnung, Verhaltensregeln", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege) bzw. Regeln der Schule",
    "hinweis": "Verhalten, Handy, Pausenplatz; Zuständigkeiten für Disziplinarmassnahmen und Auszeit",
    "muster": r"schulordnung|schulhausordnung|hausordnung.*schul|schul.*hausordnung|disziplin|verhaltensregel|schulregel|auszeit|time.?out|handy|smartphone|pausenplatz",
    "ohne": r"personal|lehrperson|anstellung|badi|friedhof|gemeindehaus|sammelstelle"}],
  "kanten": [
   {"von": "vsg", "nach": "bv", "art": "Umsetzung", "beleg": ("412.100", "§ 52."), "beleg_oben": ("sr-101", "Art. 19")},
   {"von": "vsg", "nach": "krk", "art": "Umsetzung", "beleg": ("412.100", "§ 50."), "beleg_oben": ("sr-0.107", "Art. 28")},
   {"von": "vsg", "nach": "vrg", "art": "Verfahren (Rekurs)", "beleg": ("412.100", "§ 75."), "beleg_oben": ("175.2", "§ 19.")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 56."), "beleg_oben": ("412.100", "§ 52.")},
   {"von": "kom", "nach": "vsv", "art": "Grundlage", "beleg": ("412.101", "§ 56."), "beleg_unten": ("412.101", "§ 58.")},
   {"von": "kom", "nach": "vsg", "art": "gestützt auf", "beleg": ("412.100", "§ 52 a.")}]},
 {"id": "privatschulen", "titel": "Privatschulen & Privatunterricht",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "bv", "ebene": 0, "titel": "Bundesverfassung (BV) – Schulwesen", "sr": "101", "art": "Verfassung", "url": "https://www.fedlex.admin.ch/eli/cc/1999/404/de",
    "hinweis": "Art. 62 Abs. 2: Grundschulunterricht obligatorisch, unter staatlicher Leitung oder Aufsicht"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Privatschulen und Privatunterricht", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 68 Bewilligung (Gleichwertigkeit), § 69 Privatunterricht (Meldung an Wohngemeinde und Direktion), § 70 Aufsicht, § 71 Leistungen der Wohngemeinde, § 72 Subventionen"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – Privatschulen und Privatunterricht", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§§ 67–72 Gleichwertigkeit, Bewilligung, Auflagen, Offenlegung, Meldepflicht, Aufsicht; §§ 73–74 Privatunterricht (Unterrichtsprogramm, Aufsicht durch das Volksschulamt)"},
   {"id": "kom", "ebene": 3, "titel": "Regelungen der Wohngemeinde zu Privatschule und Privatunterricht", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Meldung des Privatunterrichts, Bezug von Lehrmitteln, Musikschule, freiwilliger Schulsport, Therapien (§ 71 VSG)",
    "muster": r"privatschul|privatunterricht|homeschooling|hausunterricht", "ohne": r"personal|anstellung"}],
  "kanten": [
   {"von": "vsg", "nach": "bv", "art": "Umsetzung", "beleg": ("412.100", "§ 68."), "beleg_oben": ("sr-101", "Art. 62")},
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 67."), "beleg_unten": ("412.101", "§ 73."), "beleg_oben": ("412.100", "§ 69.")},
   {"von": "kom", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 69."), "beleg_unten": ("412.100", "§ 71.")},
   {"von": "kom", "nach": "vsv", "art": "gestützt auf", "beleg": ("412.101", "§ 73.")}]},
]

# Zwei Themen mit neu aufgenommenen Erlassen (22.11.2026): Sport & Bewegung, Haftung & Versicherung
HIERARCHIEN += [
 {"id": "sport", "titel": "Sport, Bewegung & Lager",
  "ebenen": ["Bund – Gesetze", "Bund – Verordnungen", "Kanton – Gesetze", "Bildungsrat", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "spofoeg", "ebene": 0, "titel": "Sportförderungsgesetz (SpoFöG)", "sr": "415.0", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/2012/460/de",
    "hinweis": "Art. 12 Sportunterricht in der obligatorischen Schule obligatorisch, Kantone sorgen für Anlagen; Art. 6–8 «Jugend und Sport» (Kurse und Lager)"},
   {"id": "spofoev", "ebene": 1, "titel": "Sportförderungsverordnung (SpoFöV)", "sr": "415.01", "art": "Verordnung (Bundesrat)", "url": "https://www.fedlex.admin.ch/eli/cc/2012/461/de",
    "hinweis": "Art. 49 mindestens drei Lektionen Sport pro Woche (Primar- und Sekundarstufe I), Art. 50 Lehrplan Sport; J+S-Leitende Schulsport"},
   {"id": "vsg", "ebene": 2, "titel": "Volksschulgesetz (VSG) – Sport und Schulsport", "art": "Gesetz (Kantonsrat)", "ls": "412.100",
    "hinweis": "§ 18 freiwilliger Schulsport, § 21 Lehrplan und Lektionentafeln, § 71 Schulsport für Privatschülerinnen und -schüler"},
   {"id": "lp", "ebene": 3, "titel": "Lehrplan und Lektionentafel – Bewegung und Sport (Bildungsrat)", "fundstelle": "Bildungsratsbeschlüsse", "art": "Beschluss (Bildungsrat)",
    "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-5-volksschule-lektionentafel-fuer-die-kindergarten-primar-und-sekundarstufe.html", "hinweis": "Fachbereich Bewegung und Sport, Lektionen je Stufe",
    "liste": [{"titel": "BRB 4/2017 – Lehrplan für die Volksschule", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-4-volksschule-lehrplan-fuer-die-volksschule-des-kantons-zuerich.html"},
              {"titel": "BRB 5/2017 – Lektionentafel Kindergarten-, Primar- und Sekundarstufe", "url": "https://www.zh.ch/de/bildungsdirektion/generalsekretariat-der-bildungsdirektion/bildungsrat/suche-bildungsratsbeschluesse/2017-brb-5-volksschule-lektionentafel-fuer-die-kindergarten-primar-und-sekundarstufe.html"}]},
   {"id": "kom", "ebene": 4, "titel": "Schulsport, Lager und Sportanlagen der Schule", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
    "hinweis": "Freiwilliger Schulsport, Klassen- und Skilager, Schwimmunterricht, Nutzung der Turnhallen",
    "muster": r"schulsport|sportlager|skilager|schneesport|klassenlager|lagerreglement|schullager|schwimmunterricht|turnhalle|sporthalle",
    "ohne": r"vermiet|gebuehr|tarif|benuetzungsgebuehr|vereine"}],
  "kanten": [
   {"von": "spofoev", "nach": "spofoeg", "art": "Vollzug", "beleg": ("sr-415.01", "Art. 49"), "beleg_oben": ("sr-415.0", "Art. 12")},
   {"von": "vsg", "nach": "spofoeg", "art": "Rahmen (Sportunterricht obligatorisch)", "beleg": ("sr-415.0", "Art. 12"), "beleg_unten": ("412.100", "§ 21.")},
   {"von": "lp", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 21.")},
   {"von": "lp", "nach": "spofoev", "art": "Mindestlektionen", "beleg": ("sr-415.01", "Art. 49")},
   {"von": "kom", "nach": "vsg", "art": "gestützt auf", "beleg": ("412.100", "§ 18.")},
   {"von": "kom", "nach": "spofoeg", "art": "J+S-Kurse und Lager", "beleg": ("sr-415.0", "Art. 8")}]},
 {"id": "haftung", "titel": "Haftung, Versicherung & Sicherheit",
  "ebenen": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
  "knoten": [
   {"id": "uvg", "ebene": 0, "titel": "Unfallversicherungsgesetz (UVG)", "sr": "832.20", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/1982/1676_1676_1676/de",
    "hinweis": "Art. 1a obligatorische Unfallversicherung der Arbeitnehmenden – Lehrpersonen und Personal der Schule"},
   {"id": "kvg", "ebene": 0, "titel": "Krankenversicherungsgesetz (KVG)", "sr": "832.10", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/1995/1328_1328_1328/de",
    "hinweis": "Art. 1a Abs. 2 lit. b und Art. 28: Unfälle von Schülerinnen und Schülern deckt die Krankenversicherung, soweit keine Unfallversicherung aufkommt"},
   {"id": "hg", "ebene": 1, "titel": "Haftungsgesetz (HG)", "art": "Gesetz (Kantonsrat)", "ls": "170.1",
    "hinweis": "§ 2 gilt für Gemeinden und Schulgemeinden, § 6 Haftung für Schäden durch Angestellte (kein direkter Anspruch gegen Lehrpersonen), §§ 14–15 Rückgriff bei Vorsatz oder grober Fahrlässigkeit"},
   {"id": "vsg", "ebene": 1, "titel": "Volksschulgesetz (VSG) – Schulort", "art": "Gesetz (Kantonsrat)", "ls": "412.100", "hinweis": "§ 10 Schulort"},
   {"id": "vsv", "ebene": 2, "titel": "Volksschulverordnung (VSV) – Schulweg, Versicherung", "art": "Verordnung (Regierungsrat)", "ls": "412.101",
    "hinweis": "§ 8 Schulort und Schulweg, § 32 m Versicherung von Kinderhorten"},
   {"id": "kom", "ebene": 3, "titel": "Versicherungen, Schulweg und Sicherheitskonzepte der Schule", "fundstelle": "kommunal", "art": "Behördenerlass bzw. Konzept",
    "hinweis": "Haftpflicht- und Unfallversicherung, Schulweg und Schülertransport, Notfall- und Krisenkonzept",
    "muster": r"haftpflicht|unfallversicher|schulversicher|schulweg|schuelertransport|schulbus|sicherheitskonzept|notfallkonzept|krisenkonzept|notfallorganisation",
    "ohne": r"pensionskasse|vorsorge|feuerwehr|gebaeudeversicher|wasser|abwasser"}],
  "kanten": [
   {"von": "vsv", "nach": "vsg", "art": "Vollzug", "beleg": ("412.101", "§ 8."), "beleg_oben": ("412.100", "§ 10.")},
   {"von": "kom", "nach": "hg", "art": "Haftung der Schulgemeinde", "beleg": ("170.1", "§ 2."), "beleg_unten": ("170.1", "§ 6.")},
   {"von": "kom", "nach": "uvg", "art": "Unfallversicherung Personal", "beleg": ("sr-832.20", "Art. 1a")},
   {"von": "kom", "nach": "kvg", "art": "Unfälle der Kinder", "beleg": ("sr-832.10", "Art. 28"), "beleg_oben": ("sr-832.10", "Art. 1a")},
   {"von": "kom", "nach": "vsv", "art": "Schulweg", "beleg": ("412.101", "§ 8."), "beleg_unten": ("412.101", "§ 32 m.")}]},
]

# Ergänzungen bestehender Themen (22.11.2026): Berufswahl, ergänzende Angebote, religiöse Feiertage, Gesundheitsschutz und Gleichstellung
def _ergaenzen(hid, oben=None, knoten=(), kanten=(), hinweise=None, belege=None, titel=None):
    """Fügt einem Thema Knoten und Verbindungen hinzu. oben: neue oberste Ebene (bestehende rücken eine Ebene nach unten)."""
    h = next(x for x in HIERARCHIEN if x["id"] == hid)
    if oben:
        h["ebenen"] = [oben] + h["ebenen"]
        for k in h["knoten"]: k["ebene"] += 1
    h["knoten"] += list(knoten)
    h["kanten"] += list(kanten)
    for kid, text in (hinweise or {}).items():
        next(k for k in h["knoten"] if k["id"] == kid)["hinweis"] = text
    for (von, nach), werte in (belege or {}).items():
        next(x for x in h["kanten"] if x["von"] == von and x["nach"] == nach).update(werte)
    if titel: h["titel"] = titel

_ergaenzen("beurteilung", oben="Bund", titel="Beurteilung, Laufbahn & Berufswahl",
  knoten=[{"id": "bbg", "ebene": 0, "titel": "Berufsbildungsgesetz (BBG)", "sr": "412.10", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/2003/674/de",
           "hinweis": "Art. 12 Vorbereitung auf die berufliche Grundbildung am Ende der obligatorischen Schulzeit, Art. 49–51 Berufs-, Studien- und Laufbahnberatung (Aufgabe der Kantone)"},
          {"id": "egbbg", "ebene": 1, "titel": "Einführungsgesetz zum Berufsbildungsgesetz (EG BBG)", "art": "Gesetz (Kantonsrat)", "ls": "413.31",
           "hinweis": "§ 34 Berufsberatung durch den Kanton (Berufsinformationszentren), regionales Angebot"}],
  kanten=[{"von": "egbbg", "nach": "bbg", "art": "Umsetzung", "beleg": ("413.31", "§ 34."), "beleg_oben": ("sr-412.10", "Art. 51")},
          {"von": "vsv", "nach": "bbg", "art": "Berufsvorbereitung (Schnupperlehren)", "beleg": ("412.101", "§ 29."), "beleg_oben": ("sr-412.10", "Art. 12")},
          {"von": "kom", "nach": "egbbg", "art": "Zusammenarbeit mit der Berufsberatung", "beleg": ("413.31", "§ 34.")}],
  hinweise={"vsv": "§ 33 Schullaufbahnentscheide, § 34 Zeitpunkt und Verfahren, §§ 36–38 Promotion, § 29 Abs. 2 lit. f Dispensation für Schnupperlehren"})

_ergaenzen("tagesstrukturen",
  knoten=[{"id": "ang", "ebene": 3, "titel": "Aufgabenhilfe, Nachhilfe und Kurse HSK", "fundstelle": "kommunal", "art": "Behördenerlass (Schulpflege)",
           "hinweis": "Betreute Aufgabenstunden, Nachhilfeunterricht für Zugezogene, Räume für Kurse in heimatlicher Sprache und Kultur",
           "muster": r"aufgabenhilfe|aufgabenstunde|hausaufgabenhilfe|nachhilfe|heimatliche[nr]? sprache|\bhsk\b|ergaenzende angebote", "ohne": r"personal|anstellung"}],
  kanten=[{"von": "ang", "nach": "vsg", "art": "Grundlage", "beleg": ("412.100", "§ 17."), "beleg_unten": ("412.100", "§ 17 a.")},
          {"von": "ang", "nach": "vsv", "art": "Kurse HSK", "beleg": ("412.101", "§ 13.")}],
  hinweise={"vsg": "§ 15 Kurse in heimatlicher Sprache und Kultur, § 16 musikalische Grundbildung, § 17 Aufgabenhilfe, § 17 a Nachhilfeunterricht, § 18 freiwilliger Schulsport, §§ 30 a–30 e Tagesstrukturen und Horte"},
  belege={("vsv", "vsg"): {"beleg_oben": ("412.100", "§ 15.")}})

_ergaenzen("absenzen", oben="Bund",
  knoten=[{"id": "bv", "ebene": 0, "titel": "Bundesverfassung (BV) – Glaubens- und Gewissensfreiheit", "sr": "101", "art": "Verfassung", "url": "https://www.fedlex.admin.ch/eli/cc/1999/404/de",
           "hinweis": "Art. 15 Glaubens- und Gewissensfreiheit – Grundlage für Dispensationen an hohen religiösen Feiertagen"}],
  kanten=[{"von": "vsv", "nach": "bv", "art": "Religiöse Feiertage", "beleg": ("412.101", "§ 29."), "beleg_oben": ("sr-101", "Art. 15")}],
  hinweise={"vsv": "§ 28 Absenzen, § 29 Dispensation (Abs. 2 lit. c hohe religiöse Feiertage, lit. d–f Kultur, Sport, Schnupperlehren), § 29 a Dispensation von Fächern, § 30 Jokertage"})

_ergaenzen("personal",
  knoten=[{"id": "glg", "ebene": 0, "titel": "Gleichstellungsgesetz (GlG)", "sr": "151.1", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/1996/1498_1498_1498/de",
           "hinweis": "Art. 2 gilt für öffentlich-rechtliche Arbeitsverhältnisse der Gemeinden, Art. 3 Diskriminierungsverbot, Art. 4 sexuelle Belästigung, Art. 13a Lohngleichheitsanalyse"},
          {"id": "arg", "ebene": 0, "titel": "Arbeitsgesetz (ArG) – Gesundheitsschutz", "sr": "822.11", "art": "Bundesgesetz", "url": "https://www.fedlex.admin.ch/eli/cc/1966/57_57_57/de",
           "hinweis": "Für Gemeinden gelten nur die Bestimmungen zum Gesundheitsschutz (Art. 3a): Art. 6 Pflichten der Arbeitgeber, Schutz der persönlichen Integrität"},
          {"id": "argv3", "ebene": 0, "titel": "Verordnung 3 zum Arbeitsgesetz (ArGV 3) – Gesundheitsschutz", "sr": "822.113", "art": "Verordnung (Bundesrat)", "url": "https://www.fedlex.admin.ch/eli/cc/1993/2553_2553_2553/de",
           "hinweis": "Art. 2 Grundsatz, Art. 3 besondere Pflichten, Art. 5 Information, Art. 6 Anhörung der Arbeitnehmenden"}],
  kanten=[{"von": "argv3", "nach": "arg", "art": "Vollzug", "beleg": ("sr-822.113", "Art. 1"), "beleg_oben": ("sr-822.11", "Art. 6")},
          {"von": "gem", "nach": "arg", "art": "Gesundheitsschutz (Art. 3a ArG)", "beleg": ("sr-822.11", "Art. 3a")},
          {"von": "gem", "nach": "glg", "art": "Gleichstellung im Arbeitsverhältnis", "beleg": ("sr-151.1", "Art. 2"), "beleg_oben": ("sr-151.1", "Art. 3")}])

REIHENFOLGE = ["volksschule", "schulpflicht", "privatschulen", "tagesstrukturen", "schulbetrieb", "sonderpaedagogik", "kindesschutz", "disziplin", "gesundheit", "eltern", "absenzen", "kosten",
               "personal", "unterricht", "beurteilung", "sprache", "sport",
               "gemeindeorganisation", "stimmberechtigte", "behoerden", "wahlen", "organisation", "kontrolle", "zusammenarbeit", "verfahren",
               "finanzen", "datenschutz", "beschaffung", "haftung"]
HIERARCHIEN.sort(key=lambda h: REIHENFOLGE.index(h["id"]))
KURZTITEL = {"sport": "Sport & Lager", "haftung": "Haftung & Versicherung", "schulpflicht": "Schulpflicht & Schulort", "privatschulen": "Privatschulen & Privatunterricht", "schulbetrieb": "Klassen, Unterrichtszeit & Ferien", "disziplin": "Disziplin & Wegweisung", "tagesstrukturen": "Tagesstrukturen & Angebote", "kindesschutz": "Kindesschutz",
             "absenzen": "Absenzen & Urlaub", "unterricht": "Unterricht & Medien", "beurteilung": "Beurteilung & Berufswahl",
             "gemeindeorganisation": "Gemeinde & Information", "stimmberechtigte": "Versammlung & Parlament", "behoerden": "Behörden & Kommissionen",
             "wahlen": "Wahlen & Behördenmitglieder", "organisation": "Schulorganisation & Qualität", "kontrolle": "Prüfung & Aufsicht",
             "zusammenarbeit": "Zusammenarbeit & Strukturen", "verfahren": "Verfahren & Rechtsschutz", "beschaffung": "Beschaffung & Bau"}
GRUPPEN = {"sport": "Unterricht", "haftung": "Ressourcen", "volksschule": "Schule", "schulpflicht": "Schule", "privatschulen": "Schule", "tagesstrukturen": "Schule", "schulbetrieb": "Schule", "disziplin": "Kinder",
           "sonderpaedagogik": "Kinder", "kindesschutz": "Kinder", "gesundheit": "Kinder", "eltern": "Eltern", "absenzen": "Eltern", "kosten": "Eltern",
           "personal": "Personal", "unterricht": "Unterricht", "beurteilung": "Unterricht", "sprache": "Unterricht",
           "gemeindeorganisation": "Behörden & Organisation", "stimmberechtigte": "Behörden & Organisation", "behoerden": "Behörden & Organisation",
           "wahlen": "Behörden & Organisation", "organisation": "Behörden & Organisation", "kontrolle": "Behörden & Organisation",
           "zusammenarbeit": "Behörden & Organisation", "verfahren": "Behörden & Organisation",
           "finanzen": "Ressourcen", "datenschutz": "Ressourcen", "beschaffung": "Ressourcen"}

# ---------------------------------------------------------------- Maschinelle Verbindungen (Auftrag 20.11.2026, Punkt 4)
# Aus den Textfassungen: Ingress («gestützt auf …») = Grundlage, § 1 / Art. 1 mit «Vollzug» = Vollzug, Fussnoten = Verweise.
# Die Vorschläge werden neben den von Hand gesetzten Verbindungen gezeigt; massgebend bleiben die Hand-Verbindungen.
def _fussnoten(md):
    d = {}
    for m in re.finditer(r"^\[\^(\w+)\]: (.*)$", md, re.M):
        d[m.group(1)] = [f"{a} {n}" for a, n in re.findall(r"\b(LS|SR) (\d[\d.]*\d)", m.group(2))]
    return d

def maschinell(nr, nachtrag):
    """Grundlagen laut Ingress und Vollzugsbestimmung der geltenden Fassung: {Fundstelle: (Art, Stelle, Text)}."""
    md = _md(nr, nachtrag)
    if not md: return {}
    rumpf = md.split("\n---\n\n[^")[0]
    rumpf = re.sub(r"^---\n.*?\n---\n", "", rumpf, flags=re.S)
    F, out = _fussnoten(md), {}
    absaetze = [x.strip() for x in rumpf.split("\n\n") if x.strip()]
    ingress = next((x for x in absaetze[:6] if not x.startswith("#") and re.search(r"gestützt auf|beschliesst|verordnet|verfügt|erlässt|vereinbar", x)), "")
    if "gestützt auf" in ingress:
        for r in re.findall(r"\[\^(\w+)\]", ingress):
            for z in F.get(r, []): out.setdefault(z, ("Grundlage (Ingress)", "Ingress", re.sub(r"\[\^\w+\]", "", ingress)[:400]))
    m = re.search(r"^### (?:§|Art\.) 1(?![\d])[^\n]*\n\n(.*?)(?=\n### |\n## |\Z)", rumpf, re.S | re.M)
    if m and re.search(r"Vollzug|Ausführung", m.group(1)):
        for r in re.findall(r"\[\^(\w+)\]", m.group(1)):
            for z in F.get(r, []): out.setdefault(z, ("Vollzug (§ 1)" if nr[:3] != "sr-" else "Vollzug (Art. 1)", "§ 1" if nr[:3] != "sr-" else "Art. 1", re.sub(r"\[\^\w+\]", "", m.group(1))[:400]))
    return out

def abgleich_kanten(H, texte):
    """Hand-Verbindungen mit der maschinellen Auswertung vergleichen; Vorschläge für fehlende Verbindungen."""
    akt = {nr: e["fassungen"][-1]["nachtrag"] for nr, e in texte["erlasse"].items() if e["fassungen"]}
    fund = {k["id"]: k["fundstelle"] for k in H["knoten"]}
    nach_fund = {}
    for k in H["knoten"]: nach_fund.setdefault(k["fundstelle"], []).append(k["id"])
    hand = {(k["von"], k["nach"]) for k in H["kanten"]}
    vorschlaege, fehlt = [], []
    for k in H["knoten"]:
        nr = k.get("ls")
        if not nr or nr not in akt: continue
        m = maschinell(nr, akt[nr])
        vw = dict(map(tuple, texte["erlasse"][nr]["verweise"]))
        ziele = set(m) | {z for z, n in vw.items() if n >= 1}
        for z in ziele:
            if z == k["fundstelle"]: continue
            art, stelle, text = m.get(z, ("verweist auf", "Fussnoten", ""))
            ids = [i for i in nach_fund.get(z, []) if i != k["id"]]
            if ids:
                for zid in ids:
                    if (k["id"], zid) in hand:
                        for x in H["kanten"]:
                            if (x["von"], x["nach"]) == (k["id"], zid): x["maschinell"] = {"art": art, "stelle": stelle, "verweise": vw.get(z, 0)}
                    elif (zid, k["id"]) not in hand and (z in m or vw.get(z, 0) >= 2):
                        vorschlaege.append({"von": k["id"], "nach": zid, "art": art, "stelle": stelle, "verweise": vw.get(z, 0), "text": text})
            elif z in m or vw.get(z, 0) >= 3:
                fehlt.append({"von": k["id"], "ziel": z, "art": art, "verweise": vw.get(z, 0)})
    for x in H["kanten"]:
        x["status"] = "bestaetigt" if x.get("maschinell") else ("nur_hand" if fund[x["von"]] != "kommunal" and K_hat_text(H, x["von"], akt) else "kommunal_oder_ohne_text")
    H["vorschlaege"] = vorschlaege
    namen = {e["fundstelle"]: e["titel"] for e in texte["erlasse"].values()}
    zl = json.loads((ROOT / "data" / "raw" / "zhlex-versionen.json").read_text(encoding="utf-8"))
    for nr, z in zl.items():
        if isinstance(z, dict) and z.get("t"): namen.setdefault("LS " + nr, z["t"])
    for f in fehlt: f["titel"] = namen.get(f["ziel"], "")
    H["fehlende_erlasse"] = sorted(fehlt, key=lambda x: -x["verweise"])[:12]
    return H

def K_hat_text(H, kid, akt):
    k = next(x for x in H["knoten"] if x["id"] == kid)
    return bool(k.get("ls") and k["ls"] in akt)

def querbezuege(hs, texte):
    """Querbezüge: in welchen Themen kommt ein Erlass vor (Schlüssel LS-Nummer bzw. SR-Fundstelle)."""
    def schluessel(k): return k["fundstelle"] if k["fundstelle"] != "kommunal" else None
    wo = {}
    for H in hs:
        for k in H["knoten"]:
            sk = schluessel(k)
            if sk and [H["id"], H["titel"]] not in wo.setdefault(sk, []): wo[sk].append([H["id"], H["titel"]])
    for H in hs:
        for k in H["knoten"]:
            sk = schluessel(k)
            if sk: k["themen"] = wo[sk]
    for nr, e in texte["erlasse"].items():
        e["themen"] = wo.get(e["fundstelle"], [])
    QUERBEZUG.update(wo)
    return hs

QUERBEZUG = {}

def hierarchie(texte, spec):
    akt = {nr: e["fassungen"][-1]["nachtrag"] for nr, e in texte["erlasse"].items() if e["fassungen"]}
    knoten = [dict(k) for k in spec["knoten"]]
    for k in knoten:
        if k.get("sr"):
            k["ls"] = "sr-" + k.pop("sr")
            k["fundstelle"] = "SR " + k["ls"][3:]
        elif k.get("ls"):
            k["fundstelle"] = "LS " + k["ls"]
            k["url"] = f"http://www.zhlex.zh.ch/Erlass.html?Open&Ordnr={k['ls']}"
        if k.get("ls"):
            k["text"] = k["ls"] in akt
            k["versionen"] = len(texte["erlasse"].get(k["ls"], {}).get("fassungen", []))
        if k.get("muster"):
            bsp, gesehen = [], set()
            for o in ORGS:
                for s in o["sections"]:
                    for d in walk(s):
                        t = norm(d["titel"])
                        if re.search(BEHOERDE, t) and not re.search(ERLASS, t): continue
                        if re.search(k["muster"], t) and not (k.get("ohne") and re.search(k["ohne"], t)):
                            key = (o["id"], t[-30:])
                            if key in gesehen: continue
                            gesehen.add(key)
                            bsp.append({"org": o["id"], "orgname": o["kurz"], "typ": o["typ"], "titel": d["titel"], "url": d.get("url")})
            k["beispiele"] = bsp
            k.pop("muster"); k.pop("ohne", None)
    fund = {k["id"]: k["fundstelle"] for k in knoten}
    ls_von = {k["id"]: k.get("ls") for k in knoten}
    kanten = []
    for x in spec["kanten"]:
        k = {"von": x["von"], "nach": x["nach"], "art": x["art"], "beleg": None}
        if x.get("beleg") and x["beleg"][0] in akt:
            nr, para = x["beleg"]
            text = paragraf(nr, akt[nr], para)
            stelle = (para[6:].split(" ¹")[0] + (" (Anhang IVöB)" if nr == "720.1" else "")) if para.startswith("suche:") else para
            if text: k["beleg"] = {"fundstelle": texte["erlasse"][nr]["fundstelle"], "stelle": stelle, "text": text}
        zusatz = []
        for schl in ("beleg_oben", "beleg_unten"):
            if x.get(schl) and x[schl][0] in akt:
                t2 = paragraf(x[schl][0], akt[x[schl][0]], x[schl][1])
                if t2: zusatz.append({"fundstelle": texte["erlasse"][x[schl][0]]["fundstelle"], "stelle": x[schl][1], "text": t2})
        if zusatz: k["weitere_belege"] = zusatz
        if not k["beleg"] and x.get("beleg_text"):
            k["beleg"] = {"fundstelle": fund[x["von"]], "stelle": "Titel", "text": x["beleg_text"]}
        q = ls_von.get(x["von"])
        if q and q in texte["erlasse"]:
            k["verweise"] = sum(n for z, n in texte["erlasse"][q]["verweise"] if z == fund[x["nach"]])
        kanten.append(k)
    return {"id": spec["id"], "titel": spec["titel"], "gruppe": GRUPPEN.get(spec["id"], ""), "kurz": KURZTITEL.get(spec["id"], spec["titel"]), "ebenen": spec["ebenen"], "knoten": knoten, "kanten": kanten,
            "hinweis": "Pilot: Verbindungen von Hand festgelegt und mit Belegstellen aus den aufbereiteten Texten (ZH-Lex, geltende Fassung) hinterlegt; Verweise automatisch aus den Fussnoten gezählt; kommunale Beispiele aus den erfassten Rechtssammlungen."}

# ---------------------------------------------------------------- Übersicht
WM = ('<span class="wm" role="img" aria-label="EduKSX-Codex"><span aria-hidden="true"><span class="v">E</span><span class="n">du</span>'
      '<span class="o">K</span><span class="b">SX</span><span class="n">-Codex</span></span></span>')
ICON = ('<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" fill="var(--brand-violet)"/>'
        '<rect x="13" y="3.5" width="7.5" height="7.5" rx="2" fill="none" stroke="var(--brand-neutral)" stroke-width="1.75"/>'
        '<rect x="3.5" y="13" width="7.5" height="7.5" rx="2" fill="var(--brand-orange)"/><rect x="13" y="13" width="7.5" height="7.5" rx="2" fill="var(--brand-blue)"/></svg>')

def render_daten(gemeinden):
    bezirke = list(dict.fromkeys(g["bezirk"] for g in gemeinden))
    sgs = schulgemeinden()
    pg = {o["sitz"]: o["id"] for o in ORGS if o["typ"] == "Politische Gemeinde"}
    gem = [{**g, "org": pg.get(g["gemeinde"])} for g in gemeinden]
    einheit(gem, sgs)
    for o in ORGS:
        if o["typ"] == "Politische Gemeinde":
            g = next((x for x in gem if x["gemeinde"] == o["sitz"]), None)
            if g: o["einheit"] = g["einheit"]
    for o in ORGS: leitfaden_pruefung(o); doc_datum_version(o); analyse_info(o)
    TX = texte_index()
    daten = {"stand": STAND, "bezirke": bezirke, "gemeinden": gem, "schulgemeinden": sgs, "organisationen": ORGS, "matrix": matrix(), "leitfaden": LEITFADEN, "arten": ARTEN, "rechtsgrundlagen": rechtsgrundlagen(), "pflichtkatalog": pflichtkatalog(),
             "elternwegweiser": elternwegweiser(TX),
             "texte": TX, "hierarchien": querbezuege([abgleich_kanten(hierarchie(TX, sp), TX) for sp in HIERARCHIEN], TX),
             "quelle_sg": "Gemeindeamt Kanton Zürich, Verzeichnis der Gemeinden, Stand 1. Juli 2026"}
    for e in daten["rechtsgrundlagen"]["eintraege"]:
        t = []
        for nr in re.findall(r"\d+(?:\.\d+)*", e.get("fundstelle") or ""):
            for sk in (("SR " + nr,) if (e.get("fundstelle") or "").startswith("SR") else ("LS " + nr,)):
                for x in QUERBEZUG.get(sk, []):
                    if x not in t: t.append(x)
        e["themen"] = t
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
    <a class="btn zurueck" href="../" title="Zurück zur Einstiegsseite aller EduKSX-Prototypen" aria-label="Zurück zur Einstiegsseite aller EduKSX-Prototypen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>
    <div class="werkzeuge"><button class="btn" id="thema" type="button">◐ Hell/Dunkel</button></div>
  </header>
  <div class="hinweis-band" role="note"><strong>Prototyp</strong> – Evaluation öffentlich zugänglicher Rechtssammlungen, Stand {STAND}.
    Die Demo-Seiten bauen den Seitenaufbau der Originale nach und sind keine offiziellen Seiten; alle Downloads führen zu den Original-Dokumenten.</div>
  <div class="rahmen" id="rahmen"><main style="padding:2rem">Prototyp wird geladen … Für diesen Prototyp muss JavaScript eingeschaltet sein.</main></div>
  <footer class="fuss"><span>{WM} · Prototyp 0.29.0 · Stand {STAND}</span><span><a href="https://github.com/MarkusKeller8200/EduKSX-Prototyp/tree/main/prototypen/rechtssammlung">Quellcode</a></span></footer>
  <script src="assets/daten.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
"""

def render_md():
    L = [f"# EduKSX-Codex – Evaluation systematischer Rechtssammlungen", "", f"Prototyp 0.29.0 · Stand {STAND}", "",
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
        SYM = {"ja": "✓ erfüllt", "unsicher": "? prüfen", "nein": "✗ nicht erfüllt", "info": "ℹ Hinweis"}
        L += ["", "### Leitfaden-Prüfung (automatisch, Anhaltspunkt)", "", "| Ziff. | Prüfpunkt | Ergebnis | Befund |", "|---|---|---|---|"]
        L += [f"| {p['ziffer']} | {p['titel']} | {SYM[p['status']]} | {p['text']} |" for p in o.get("leitfaden", [])]
        L += ["", "Dokumentarten: " + ", ".join(f"{ARTEN[k]} {v}" for k, v in sorted(o.get("arten", {}).items(), key=lambda x: -x[1]))]
    L += ["", "## Grundlage: Leitfaden systematische Rechtssammlung", "",
          f"{LEITFADEN['titel']} ({LEITFADEN['herausgeber']}), abgelegt unter `quellen/`. Quelle: {LEITFADEN['quelle']}", "",
          "| Ziff. | Anforderung |", "|---|---|"] + [f"| {z} | {t} |" for z, t in LEITFADEN["anforderungen"]]
    L += ["", "## Nächste Schritte", "",
          "1. Website-URL jeder der 160 Gemeinden aus der Gebietsstammdaten-API bzw. dem Gemeindeverzeichnis ergänzen (data/gemeinden-zh.csv).",
          "2. CMS automatisch erkennen (i-web, Escola, WordPress, …) und je CMS einen Crawler-Adapter schreiben – die vier Piloten decken bereits drei Plattformen ab.",
          "3. Schulgemeinden (60) und Zweckverbände als eigene Liste aufnehmen; sie sind gemäss Leitfaden ebenfalls rechtssammlungspflichtig.",
          "4. Codex-Normalform festlegen: Sachgebiet 1–9 (kantonaler Leitfaden) + Erlassnummer + Inkraftsetzung + Status (gültig/aufgehoben) + Dokumentart (Erlass/Beschluss/Finanzen)."]
    return "\n".join(L) + "\n"

def main():
    gem = list(csv.DictReader(open(ROOT/"data/gemeinden-zh.csv", encoding="utf-8")))
    (ROOT/"demo").mkdir(exist_ok=True)
    for o in ORGS:
        nachbau = RENDER[o["renderer"]](o)
        (ROOT/f"demo/{o['id']}.html").write_text(nachbau, encoding="utf-8")
        (ROOT/f"demo/{o['id']}-iframe.html").write_text(iframe_variante(o, nachbau), encoding="utf-8")
    (ROOT/"index.html").write_text(render_index(gem), encoding="utf-8")
    (ROOT/"assets/daten.js").write_text(render_daten(gem), encoding="utf-8")
    (ROOT/"data/rechtssammlungen.json").write_text(json.dumps({"stand": STAND, "organisationen": ORGS}, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT/"docs").mkdir(exist_ok=True)
    (ROOT/"docs/evaluation.md").write_text(render_md(), encoding="utf-8")
    for o in ORGS: print(f"{o['id']:22} {o['anzahl_rubriken']:2} Rub {o['anzahl_dokumente']:4} Dok | " + " ".join(p["status"][0] for p in o["leitfaden"]) + " | " + str(o["arten"]))

if __name__ == "__main__":
    main()
