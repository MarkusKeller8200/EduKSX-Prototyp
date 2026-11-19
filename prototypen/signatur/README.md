# Prototyp: Signatur / Persönliche Ablage (EduKSX-Sign)

**Status:** in-arbeit · **Technik:** html · **Ziel-Modul:** EduKSX-Sign · **Version:** siehe `prototyp.json`

## Frage

EduKSX-Sign soll als Signaturdienst in möglichst alle Anwendungen der Plattform eingebunden werden und zugleich
jeder Mitarbeiterin und jedem Mitarbeiter einen eigenen Bereich bieten, um Dokumente abzulegen, zu bearbeiten und
zu signieren. Der Prototyp prüft Ablauf und Bedienung dieses persönlichen Bereichs.

## Starten

`index.html` im Browser öffnen (oder über die Einstiegsseite auf GitHub Pages). Zustand bleibt im Browser
gespeichert; «↺ Testdaten» setzt alles zurück.

## Umfang (Anforderungen vom 20.11.2026)

| Anforderung | Umsetzung im Prototyp |
|---|---|
| Ablagebereich mit Ordnerstruktur je Mitarbeiter:in | «Meine Ablage» mit Ordnerbaum, Ordner anlegen/umbenennen/löschen, Dateien verschieben (ziehen oder Menü) |
| Dokumente per Drag & Drop oder Hochladen übernehmen | Dateien in die Liste oder auf einen Ordner ziehen; Knopf «Hochladen» |
| Abgleich mit der persönlichen Cloud-Ablage inkl. Unterordner | Seite «Synchronisation»: Zielordner, beide Richtungen, Intervall, Konfliktregel, Ordnerabgleich, Protokoll; neue Datei und Konflikt aus der Cloud simulierbar |
| Formate: PDF, Word, Excel und weitere | PDF, Word, Excel, Bilder, Text werden angezeigt; andere Formate werden abgelegt und abgeglichen |
| PDF-Formulare inline ausfüllen; Text, Kommentar, Datum, Unterschriftsfeld | Formularfelder direkt in der Seite; Werkzeugleiste Text / Kommentar / Datum / Unterschriftsfeld, Elemente verschiebbar |
| Word inline bearbeiten | Absätze direkt bearbeiten, Fett/Kursiv/Unterstrichen, Überschrift/Text, Absatz anfügen, Speichern (Strg+S) |
| Signaturprozess, Word/Excel zuerst in PDF/A | Assistent: 1 Dokument (Umwandlung PDF/A-2b) · 2 Unterzeichnende, Rollen, Reihenfolge, Stufe SES/FES/QES, Rechtsraum · 3 Felder je Person platzieren, Platzhalter `#sign#n#` werden erkannt · 4 Nachricht, Frist, Erinnerung, Senden |
| Ergebnis im Ursprungsordner mit Suffix `_sign` | Nach der letzten Unterschrift: `<Name>_sign.pdf` mit Signaturprotokoll im Ordner des Originals |
| Dokument versiegeln | «🔏 Versiegeln» mit dem Organisationssiegel (fortgeschritten/qualifiziert, Rechtsraum, sichtbar); Ergebnis `<Name>_seal.pdf`, bei signierten Dokumenten zusätzlich auf dem Dokument |
| Einbindung in alle Anwendungen | Eingang «Zu unterschreiben» für Anfragen aus EduKSX-Staffing, -Time, -Flow, -Core (simulierbar unter «Einbindung»), Schnittstellen-Entwurf `/sign/v1/…` |

Vorbild für Ablauf und Begriffe (Signaturstufen, Platzhalter, Genehmigende, Siegel) ist ein Schweizer
Signaturdienst; im Prototyp erscheint wie vereinbart kein Herstellername.

## Entscheide und offene Punkte

- Suffix beim Versiegeln: `_seal` (analog zu `_sign`) – **ZU PRÜFEN**.
- Signierte und versiegelte Dokumente sind gesperrt; bearbeitet wird eine Kopie ohne Signaturen.
- Unterschriften von Signaturanfragen aus anderen Modulen landen als Kopie im Ordner «Unterzeichnet erhalten» – **ZU PRÜFEN**.
- Darstellung echter hochgeladener PDF/Word/Excel-Inhalte braucht im Modul eine Render-Komponente (z. B. PDF-Renderer);
  im Prototyp erscheint ein Platzhalter, die Werkzeuge funktionieren trotzdem. Neue Fremdkomponente nur mit Issue.
- Abgleich mit der Cloud-Ablage: Anbindung über EduKSX-Connect (Rechte pro Person, Zielordner) – **OFFEN**.
- Signaturdienst-Anbieter, Kosten pro Signatur und Organisationszertifikat – **OFFEN**.

## Ergebnis

Noch in Abstimmung.

## Hinweise

- Nur erfundene Testdaten; Signaturen, PDF/A-Umwandlung, Siegel und Abgleich sind simuliert
  (Bestätigungscode im Prototyp: 123456).
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
