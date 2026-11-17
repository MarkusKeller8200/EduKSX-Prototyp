# Übergabe an einen neuen Chat – EduKSX-Prototyp

Stand: **JJJJ-MM-TT (hh:mm)** – ein Satz zum Stand (letztes Release, laufender Meilenstein, was im Beta-Test ist).
[PROJEKTSTAND.md](PROJEKTSTAND.md) (aktuell), [PROJEKTSTAND-ARCHIV.md](PROJEKTSTAND-ARCHIV.md) (Verlauf), Konzepte in
`docs/KONZEPT-*.md`. Bei jeder Übergabe nachführen.

## Start nächster Chat (Übergabe JJJJ-MM-TT, hh:mm)

**Zuerst lesen:** CLAUDE.md → AGENTS.md → dieser Abschnitt → PROJEKTSTAND.md → passende KONZEPT-*.md.

**Stand Code und CI**
- `main` = `abc1234` (kurz, was der letzte Commit war). Arbeitsbaum sauber? CI auf `main` grün?
- Letztes Release **v0.1.0** (Datum). Release in Arbeit? Nächstes nur auf ausdrückliche Freigabe.
- Prüfen: `python3 tools/pruefen.py` (Anzahl Tests, Dauer); weitere Prüfungen mit Befehl.

**Offene Issues und ihr Status**

| Issue | Meilenstein | Status | Inhalt / Testliste |
|---|---|---|---|
| #1 | 0.2.0 – Thema | `_3 Beta-Test` | was zu testen ist |
| #2 | Funktionen | `_1 bereit` | **nicht umgesetzt** – erst auf Wort von Projektverantwortliche:r |

Schliessen erst nach «getestet ok» bzw. abgehakter Testliste.

**Hinweise für die Arbeit**
- Werkzeuge, Testdaten, Stolpersteine (z. B. Cache, Zugänge, was nur von Hand geht).

**Arbeitsregeln** (siehe AGENTS.md)
- Jedes Thema aus dem Chat → Issue mit Testliste; Status `_1 bereit` → `_2 in Arbeit` → `_3 Beta-Test`.
- Verbesserungen aus dem Test nur als Issue anlegen; umsetzen erst nach Freigabe.
- Releases nur nach ausdrücklicher Freigabe; `VERSION`, Tags und Releases nicht anfassen.
- Löschen nur nach Rückfrage.

## Sitzungen

Neueste oben. Je Sitzung: Datum und Zeit, Thema, umgesetzte Issues, Entscheide (mit Datum), Offenes. Ältere Sitzungen
gelegentlich gekürzt nach `PROJEKTSTAND-ARCHIV.md` verschieben.

### Sitzung 2026-11-17 (13:20–13:45) – Prototyp EduKSX-Time

- Neuer Prototyp `prototypen/zeiterfassung` (EduKSX-Time – Zeiterfassung / Stempeln), Vorbild: die im Intranet
  angebundene Zeiterfassung (Kommen/Gehen, Buchungsarten, Sollzeit). Schritt 1 = installierbare Mobil-App (PWA) zum
  Ein- und Ausstempeln (#19 → `_3 Beta-Test`). Getestet mit Handy-Ansicht (hell/dunkel), offline, Service Worker.
- Herstellername erscheint nicht im Prototyp (Regel «keine Fremd-/Herstellernamen»).
- EduKSX-Time 0.2.0: animierte Uhr beim Eingestempelt-Sein (#21 → `_3 Beta-Test`).
- EduKSX-Time 0.3.0: Soll-Markierung, gesetzliche Pause 30 Min. nach 5 h (zählt nicht als Arbeitszeit) (#22 → `_3 Beta-Test`).
  Entscheid 2026-11-17: Regel «nach 5 h 30 Min.» (Vorgabe Projektleitung); Abgleich mit Personalrecht ZU PRÜFEN.
- EduKSX-Time 0.3.1: gesetzliche Pause um alle gestempelten Pausen des Tages reduziert (#23 → `_3 Beta-Test`).
- EduKSX-Time 0.3.2: Pausentaste mit eigener Farbe und Kaffeetasse (#24 → `_3 Beta-Test`).
- EduKSX-Time 0.3.3: Symbole Kommen/Gehen als Tür mit Pfeil (#25 → `_3 Beta-Test`).
- EduKSX-Time 0.3.4: Gehen-Pfeil nach links, Farbe je Zustand (Kommen grün, Pause bernstein, Gehen rot) (#26 → `_3 Beta-Test`).
- Offen: Stempeln per NFC-Tag (Idee, noch kein Issue – Antwort Projektleitung ausstehend).
- Offen: weitere Schritte («der ganze Rest») je als Issue nach Freigabe; Icon «time» vorläufig, nicht im Icon-Set.

### Sitzung 2026-11-17 (05:10–05:50) – EduKSX-Codex 0.5.0

- Auftrag «alle anderen Gemeinden aufnehmen» – auf Rückfrage eingegrenzt auf Dübendorf und Fehraltorf (Entscheid 2026-11-17).
- Erfasst: Stadt Dübendorf (89 Erlasse), Primarschule Dübendorf (10), Sek Dübendorf-Schwerzenbach (27), Fehraltorf (118) (#15 → `_3 Beta-Test`).
- Fehraltorf ist Einheitsgemeinde; Schule Fehraltorf hat keine eigene Rechtssammlung (nicht als Organisation erfasst).
- Offen: nächste Gemeinden nach Wunsch; Erfassung braucht je Website eine Browser-Freigabe.

### Sitzung 2026-11-17 (04:40–05:10) – EduKSX-Codex 0.4.0

- Leitfaden systematische Rechtssammlung geprüft (identisch mit zh.ch, Stand 14.10.2025) und unter
  `prototypen/rechtssammlung/quellen/` abgelegt; Ansicht «Grundlagen» mit GG/VGG-Links (ZH-Lex), Anforderungen,
  Anhang 1/2 und LS-Ordnern; Leitfaden-Prüfung je Organisation; Matrix-Gruppe «Gehört nicht in die SR» (#14 → `_3 Beta-Test`).
- Befund: Nur Meilen, Höri und Winkel nummerieren jedes Dokument mit Sachgebietsziffer; PS Trüllikon und SKM führen
  überwiegend Beschlüsse/Protokolle/Rechnungen in der SR (Leitfaden Ziff. 7: gehört nicht hinein).
- Offen: Prüfregeln fachlich abnehmen (Schwellen, Einordnung Konzept/Merkblatt); ZH-Lex-Deep-Links je Erlass nur über
  die Kurz-URL `zhlex.zh.ch/Erlass.html?Open&Ordnr=…` stabil.

### Sitzung 2026-11-17 (03:45–04:40) – EduKSX-Codex 0.3.0

- Erfasst: Meilen, Bachenbülach (+ Schule), Höri (+ Primarschulgemeinde), Winkel (+ Schule), Hochfelden (#8).
- Alle 60 Schulgemeinden nach Gemeindeverzeichnis (Stand 1.7.2026), Vermerk Einheitsgemeinde je Gemeinde im Menü (#9).
- Struktur-Matrix mit Erkennung ähnlicher Dokumente (#10); Ansichten Nachbau / iFrame-Variante / Original ⟷ Nachbau,
  Widget `embed/` (#11); PDF-Vorschau (#12). Alle → `_3 Beta-Test`.
- Befund 2026-11-17: Nur SKM erlaubt Einbettung; i-web sendet `X-Frame-Options: DENY`, Escola `frame-ancestors 'self'`,
  übrige `SAMEORIGIN` → Original im geteilten Fenster nur bei SKM, sonst Fenster nebeneinander; PDF-Vorschau ebenso.
- Offen: Mitgliedschaft Bachenbülach/Winkel in der Sek Bülach bestätigen; Mitglieder regionaler Schulgemeinden
  (Vermerk «?»); CMS-Namen vs. Regel «keine Fremd-/Herstellernamen» (Entscheid Projektverantwortliche:r).

### Sitzung 2026-11-17 (03:20–03:45) – Prototyp EduKSX-Codex

- Neuer Prototyp `prototypen/rechtssammlung` (EduKSX-Codex): Evaluation der Rechtssammlungen von PG Trüllikon,
  PS Trüllikon, SKM Marthalen und Sek Bülach, Gemeindeliste (160), 4 Demo-Seiten; Einstiegsseite mit Icon «codex» (vorläufig). Issue #6 → `_3 Beta-Test`.
- Entscheid 2026-11-17: Demo-Seiten übernehmen Schrift, Farben und Aufbau der Originale, aber keine Logos; Hinweis «keine offizielle Seite» und `noindex`, weil öffentlich auf GitHub Pages.
- Codex 0.2.0: Menü links Bezirk › Politische Gemeinden / Schulgemeinden (eigener Zweig, Entscheid 2026-11-17) › Rubriken (#7 → `_3 Beta-Test`).
- Offen: CMS-Namen (i-web, Escola, WordPress) stehen als Evaluationsdaten im Prototyp – mit Regel «keine Fremd-/Herstellernamen» abgleichen.

### Sitzung JJJJ-MM-TT (hh:mm–) – Thema

- …

## Entscheide

Beschlüsse mit Datum, damit sie nicht erneut diskutiert werden («Entscheid JJJJ-MM-TT: …»). Dauerhafte Regeln
gehören zusätzlich in AGENTS.md.
