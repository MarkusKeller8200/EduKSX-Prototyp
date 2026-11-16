# Prototyp: EduKSX-Staffing – Einsatzplanung

**Status:** in Arbeit · **Technik:** html (Klickprototyp ohne Server) · **Ziel-Modul:** EduKSX-Staffing

## Frage

Wie soll die Einsatzplanung der EduKSX-Plattform aussehen und rechnen? Stellenplan und VZE nach den Vorgaben des
Kantons Zürich, Pensen und Berufsauftrag, Ressourcen, Anstellungsfreigaben zwischen Schulleitung und
Schulverwaltung, Pensenumfrage, Stellvertretungen, Personalgespräche und Tagesstrukturen.

Anforderungen mit IDs und Verbindlichkeitsstufen: [ANFORDERUNGEN.md](ANFORDERUNGEN.md).

## Starten

- Online: über die Einstiegsseite der Prototypen (GitHub Pages).
- Lokal: `index.html` im Browser öffnen.

Oben rechts lässt sich die **Rolle** wechseln (Schulleitung, Schulverwaltung, Leitung Tagesstrukturen) sowie hell
und dunkel. Änderungen bleiben im Browser gespeichert; «↺ Testdaten» setzt alles zurück.

## Was der Prototyp zeigt

| Bereich | Inhalt |
|---|---|
| Stellenplan und VZE | VZE-Formel (Schülerzahl × Sozialindex × Korrekturfaktor / Basiswert × 100), Schulleitung, Gestaltungspool, Koordination Sek, Therapien, DaZ, Klassengrössen, Mutationen |
| Unterricht | Lektionenpool nach Lektionentafel Sek (mit Halbklassen), offene Lektionen, Klassenlehrpersonen |
| Personen und Pensen | Beschäftigungsgrad nach Berufsauftrag ZH mit Prüfregeln (35 %, 60-%-Regel, Klassenlehrperson ≥ 6 WL) |
| Berufsauftrag | Gefässe als Verwendung der Pauschalen oder als zusätzliche Stunden, Verteilregeln |
| Ressourcen | Budget, Bedarf, Verbrauch, Saldo; Sicht Schulleitung / Schulverwaltung / Vergleich; Sperre |
| Freigaben | Freigabe, Sammelfreigabe, Änderung nach Freigabe, Vergleich, Anstellung, Verlauf |
| VZE-Tool (VSA) | Das Excel-Tool des Volksschulamts laden (oder das hinterlegte anonymisierte Muster `muster/VZE-Tool_Muster_VSA-2.19.xlsx`) und mit der Planung befüllen – exakt im Original (nur Eingabezellen, Formatierung und Formeln unverändert), Vorschau der Zellbelegung; Datei bleibt im Browser |
| Hilfe und Gesetze | Lehrpersonalgesetz (LPG) und Lehrpersonalverordnung (LPVO) mit Suche; Verweise aus Regeln, Warnungen und Parametern führen direkt zur Bestimmung |
| Abläufe | Jahresablauf mit Fristen, Pensenumfrage, Stellvertretungen, Personalgespräche, Tagesstrukturen |

## Ergebnis

Noch offen – Rückmeldungen bitte als Issue.

## Hinweise

- Personen, Schule und Schülerzahlen sind erfunden; die kantonalen Werte sind ohne Gewähr (ZU PRÜFEN).
- Auftritt nach CI MarKusSXCH (Wortmarke EduKSX-Staffing, Icon «Staffing» aus dem freigegebenen Icon-Set).
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
