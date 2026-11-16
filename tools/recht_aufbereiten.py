#!/usr/bin/env python3
"""Gesetzestexte (Zürcher Gesetzessammlung, PDF) für die Hilfe von EduKSX-Staffing aufbereiten.

    python3 tools/recht_aufbereiten.py LPG.pdf LPVO.pdf

Erzeugt prototypen/einsatzplanung/assets/recht.js (window.STAFFING_RECHT) mit Abschnitten, Paragraphen,
Randtiteln und Absätzen. Fussnoten und der Anhang (Lohntabellen) werden weggelassen; massgebend bleibt die
amtliche Fassung (Link in der Hilfe). Braucht pdfplumber und pdftotext (nur für die Aufbereitung, nicht in der CI).
Erlasse sind nach Art. 5 URG nicht urheberrechtlich geschützt.
"""
import json
import re
import sys
from pathlib import Path

import pdfplumber
HAUPT = 9.0
def woerter(page):
    page = page.filter(lambda o: not (o.get('object_type') == 'char' and o.get('text') == ' '))
    return page.extract_words(extra_attrs=['size','fontname'], x_tolerance=1.0, keep_blank_chars=False)
def zeilen_bilden(ws):
    ws = sorted(ws, key=lambda w: (round(w['top']), w['x0']))
    zeilen = []
    for w in ws:
        for z in zeilen:
            if abs(z['top'] - w['top']) < 4.5 or (w['size'] < 7 and -1 < (w['top'] - z['top']) < 5.5) or (w['size'] < 7 and -5.5 < (w['top'] - z['top']) < 0):
                z['w'].append(w); break
        else:
            zeilen.append({'top': w['top'], 'w': [w]})
    for z in zeilen: z['w'].sort(key=lambda w: w['x0'])
    zeilen.sort(key=lambda z: z['top'])
    return zeilen
def parse(pfad, kurz):
    absaetze_alle = []   # (art, text, meta)
    rand = []            # (seite, top, text)
    starts = []
    titel = None; stand = None
    with pdfplumber.open(pfad) as pdf:
        for si, page in enumerate(pdf.pages):
            ws = woerter(page)
            if not ws: continue
            # Fussnotenseiten (fast nur 8.0) überspringen
            n8 = sum(1 for w in ws if round(w['size'],1) == 8.0); n9 = sum(1 for w in ws if w['size'] >= 9)
            if n8 > n9: continue
            main = [w for w in ws if (w['size'] >= HAUPT or w['size'] < 7) and 55 < w['top'] < 555]
            marg = [w for w in ws if abs(w['size'] - 7.5) < 0.2 and 55 < w['top'] < 555]
            for w in ws:
                m = re.match(r'(\d+\. ?\d+\. ?\d+ - \d+)', '')
            fuss = ' '.join(w['text'] for w in ws if w['top'] > 555)
            m = re.search(r'(\d{1,2}\. ?\d{1,2}\. ?\d{2})\s*-\s*\d+', fuss)
            if m and not stand: stand = m.group(1)
            # Randtitel als Blöcke
            for z in zeilen_bilden(marg):
                t = ' '.join(w['text'] for w in z['w'])
                if rand and rand[-1][0] == si and z['top'] - rand[-1][3] < 11:
                    prev = rand[-1]
                    txt = prev[2][:-1] + t if prev[2].endswith('-') and t[:1].islower() else prev[2] + ' ' + t
                    rand[-1] = (si, prev[1], txt, z['top'])
                else:
                    rand.append((si, z['top'], t, z['top']))
            for z in zeilen_bilden(main):
                toks = []
                for i, w in enumerate(z['w']):
                    t = w['text']; klein = w['size'] < 7
                    if klein:
                        nachPar = any(z['w'][j]['text'] == '§' for j in range(max(0, i-4), i))
                        erstes = (i == 0 and re.fullmatch(r'\d{1,2}', t) and 2 <= int(t) <= 20) or (nachPar and t == '1')
                        if erstes and i + 1 < len(z['w']) and z['w'][i+1]['size'] >= HAUPT:
                            toks.append(('ABS', t))
                        continue  # Fussnotenzeichen
                    toks.append(('W', t, w['fontname'], w['size']))
                if not toks: continue
                absaetze_alle.append((si, z['top'], toks))
    # Textstrom aufbauen
    abschnitte = []; aktuell = None; par = None
    def neuer_absatz(nr=None):
        par['absaetze'].append({'nr': nr, 'text': ''})
    for si, top, toks in absaetze_alle:
        woerter_ = [t for t in toks if t[0] == 'W']
        text = ' '.join(t[1] for t in woerter_)
        fett = woerter_ and all('Bold' in t[2] for t in woerter_)
        gross = woerter_ and woerter_[0][3] >= 11
        if gross:
            titel = (titel + ' ' + text) if titel and si == 0 and top < 120 else (titel or text)
            continue
        if re.match(r'^\(vom \d', text) and par is None:
            continue
        m = re.match(r'^§ ?(\d+ ?[a-z]?)\.(?:\s|$)', text) or re.match(r'^§§ ?(\d+ ?[a-z]? und \d+ ?[a-z]?)\.(?:\s|$)', text)
        if m and toks[0][0] == 'W' and toks[0][1] in ('§', '§§'):
            nr = m.group(1).replace(' ', ' ')
            par = {'nr': nr, 'titel': None, 'absaetze': [], 'seite': si, 'top': top}
            if aktuell is None:
                aktuell = {'titel': '', 'paragraphen': []}; abschnitte.append(aktuell)
            aktuell['paragraphen'].append(par)
            rest = text[m.end():].strip()
            # Absatznummer direkt nach §?
            absnr = next((t[1] for t in toks if t[0] == 'ABS'), None)
            neuer_absatz(absnr)
            par['absaetze'][-1]['text'] = rest
            continue
        if (fett and not text.startswith('§') and len(text) < 120) or (text.startswith('Übergangsbestimmung') and re.search(r'\(OS \d+, \d+\)$', text)):
            aktuell = {'titel': text, 'paragraphen': []}; abschnitte.append(aktuell); par = None
            continue
        if par is None:
            if aktuell is not None and aktuell['titel'] and not aktuell['titel'].startswith('Anhang'):
                par = {'nr': '', 'titel': None, 'absaetze': [{'nr': None, 'text': text}], 'seite': si, 'top': top}
                aktuell['paragraphen'].append(par)
            continue
        if toks[0][0] == 'ABS':
            neuer_absatz(toks[0][1]); par['absaetze'][-1]['text'] = text; continue
        if re.match(r'^(?:[a-z]|aa|bb|cc|dd|ee)\.(\d+)?(\s|$)', text):
            par['absaetze'].append({'nr': None, 'liste': True, 'text': text}); continue
        cur = par['absaetze'][-1]
        if cur['text'].endswith('-') and text[:1].islower():
            cur['text'] = cur['text'][:-1] + text
        else:
            cur['text'] = (cur['text'] + ' ' + text).strip()
    # Randtitel zuordnen
    for ab in abschnitte:
        for p in ab['paragraphen']:
            kand = [r for r in rand if r[0] == p['seite'] and abs(r[1] - p['top']) < 8]
            if kand: p['titel'] = kand[0][2]
    for ab in abschnitte:
        ab['paragraphen'] = [{k: v for k, v in p.items() if k not in ('seite', 'top')} for p in ab['paragraphen']]
        for p in ab['paragraphen']:
            for a in p['absaetze']:
                a['text'] = re.sub(r'\s+([,.;:)])', r'\1', re.sub(r'\s{2,}', ' ', a['text'])).strip()
                a['text'] = re.sub(r'([.;:,])\s\d{1,3}$', r'\1', a['text'])
                a['text'] = a['text'].replace('Formel: Schülerzahl × Sozialindex × Korrekturfaktor Basiswert × 100', 'Formel: (Schülerzahl × Sozialindex × Korrekturfaktor) / (Basiswert × 100)')
                a['text'] = a['text'].replace('jeden ganzen Monat um / gekürzt', 'jeden ganzen Monat um 1/12 gekürzt')
            p['absaetze'] = [a for a in p['absaetze'] if a['text']]
    abschnitte = [a for a in abschnitte if a['paragraphen'] or a['titel']]
    import subprocess
    txt = subprocess.run(['pdftotext', pfad, '-'], capture_output=True, text=True).stdout
    m = re.search(r'(\d{1,2})\. ?(\d{1,2})\. ?(\d{2}) - (\d+)', txt)
    stand = f"{int(m.group(1))}.{int(m.group(2))}.20{m.group(3)}" if m else None
    nachtrag = m.group(4) if m else None
    # Anhang und Abschnitte nach dem Anhang ohne Paragraphen entfernen
    aus = []
    for a in abschnitte:
        if a['titel'].startswith('Anhang'): break
        aus.append(a)
    return {'kurz': kurz, 'titel': titel, 'stand': stand, 'nachtrag': nachtrag, 'abschnitte': aus}
def _alt_main():
    d = parse(sys.argv[1], sys.argv[2])
    json.dump(d, open(sys.argv[3], 'w'), ensure_ascii=False, indent=1)
    n = sum(len(a['paragraphen']) for a in d['abschnitte'])
    print(d['titel'], d['stand'], 'Abschnitte', len(d['abschnitte']), 'Paragraphen', n)


QUELLEN = {
    "LPG": {"nummer": "412.31", "url": "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung/zhlex-ls/erlass-412_31-1999_05_10-2000_10_01-118.html"},
    "LPVO": {"nummer": "412.311", "url": "https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung/zhlex-ls/erlass-412_311-2000_07_19-2000_10_01-132.html"},
}
KORREKTUREN = {"Überführungins": "Überführung ins"}


def nachbearbeiten(d):
    for a in d["abschnitte"]:
        for p in a["paragraphen"]:
            if p.get("titel"):
                for alt, neu in KORREKTUREN.items():
                    p["titel"] = p["titel"].replace(alt, neu)
            if p["nr"] and not p["absaetze"]:
                p["absaetze"] = [{"nr": None, "text": "Aufgehoben."}]
                p["aufgehoben"] = True
            if a["titel"].startswith("Übergangsbestimmung"):
                p["uebergang"] = True
    return d


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 1
    daten = {}
    for pfad, kurz in zip(argv, ("LPG", "LPVO")):
        d = nachbearbeiten(parse(pfad, kurz))
        d.update(QUELLEN[kurz])
        daten[kurz] = d
        n = sum(1 for a in d["abschnitte"] for p in a["paragraphen"] if p["nr"])
        print(f"{kurz}: {d['titel']}, Stand {d['stand']}, {n} Paragraphen")
    ziel = Path(__file__).resolve().parent.parent / "prototypen" / "einsatzplanung" / "assets" / "recht.js"
    ziel.write_text("/* Erzeugt mit tools/recht_aufbereiten.py – nicht von Hand bearbeiten. Massgebend ist die amtliche Fassung. */\n"
                    "window.STAFFING_RECHT = " + json.dumps(daten, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
    print(f"✓ {ziel}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
