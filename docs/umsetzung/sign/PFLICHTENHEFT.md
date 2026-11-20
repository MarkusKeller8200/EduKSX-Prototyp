# EduKSX-Sign – Anforderungskatalog, Pflichtenheft und Prüfpunkte

Stand: 2026-11-20 · Status: **ENTWURF** · Prototyp [`prototypen/signatur`](../../../prototypen/signatur) (0.1.x) ·
Datenbank [`datenbank.sql`](datenbank.sql) · API [`openapi.yaml`](openapi.yaml)

Stufen wie in [`KONZEPT-VORLAGE.md`](../../KONZEPT-VORLAGE.md); ohne Vermerk gilt **EMPFOHLEN**.

## 1. Zweck und Abgrenzung

EduKSX-Sign ist der Signaturdienst der Plattform und zugleich der **persönliche Bereich** jeder Mitarbeiterin und
jedes Mitarbeiters: Dokumente ablegen (Ordner, Drag & Drop), mit der Cloud-Ablage abgleichen, PDF-Formulare
ausfüllen und anmerken, Word inline bearbeiten, Signaturprozesse mit PDF/A-Umwandlung starten, Anfragen aus anderen
Modulen unterschreiben und Dokumente mit dem Organisationssiegel versiegeln. Ergebnis `<Name>_sign.pdf` bzw.
`<Name>_seal.pdf` im Ursprungsordner.

**Nicht dazu gehören:** eigener Vertrauensdienst (Zertifikate stellt ein anerkannter Anbieter aus), Aktenführung
und Archiv der Organisation, Bürosoftware (Word/Excel-Bearbeitung nur einfach).

## 2. Anforderungskatalog

### 2.1 Fachliche Anforderungen

| ID | Anforderung | Priorität | Herkunft im Prototyp |
|---|---|---|---|
| SGN-F-01 | Persönliche Ablage mit Ordnerbaum: anlegen, umbenennen, löschen (mit Bestätigung), verschieben per Ziehen oder Menü. | MUSS | Meine Ablage |
| SGN-F-02 | Hochladen per Knopf und Drag & Drop (auch auf Ordner); Formate PDF, Word, Excel, Bild, Text anzeigen, übrige ablegen. | MUSS | Hochladen |
| SGN-F-03 | Versionen je Dokument (jede Speicherung, Umwandlung, Cloud-Änderung) mit Prüfsumme. | MUSS | Version |
| SGN-F-04 | PDF-Formulare inline ausfüllen; Werkzeuge Text, Kommentar, Datum, Unterschriftsfeld; Elemente verschiebbar. | MUSS | Werkzeugleiste |
| SGN-F-05 | Word inline bearbeiten (Absätze, Fett/Kursiv/Unterstrichen, Überschrift/Text, Absatz anfügen, Speichern). | SOLL | Word |
| SGN-F-06 | Umwandlung in PDF/A-2b vor dem Signieren (Word, Excel, Bild, PDF); Anmerkungen werden eingebrannt. | MUSS | Assistent Schritt 1 |
| SGN-F-07 | Signaturprozess: Unterzeichnende/Genehmigende/Kopie, Reihenfolge nacheinander/gleichzeitig, Stufe SES/FES/QES, Rechtsraum ZertES/eIDAS. | MUSS | Assistent Schritt 2 |
| SGN-F-08 | Unterschriftsfelder je Person platzieren; Platzhalter `#sign#n#` im Dokument automatisch erkennen. | MUSS | Assistent Schritt 3 |
| SGN-F-09 | Nachricht, Frist, Erinnerung; Senden prüft, dass jede unterschreibende Person ein Feld hat. | MUSS | Assistent Schritt 4 |
| SGN-F-10 | Prozessübersicht mit Status, Protokoll, Erinnern, Zurückziehen; Ablehnung mit Begründung. | MUSS | Signaturprozesse |
| SGN-F-11 | Ergebnis nach der letzten Unterschrift als `<Name>_sign.pdf` mit Signaturprotokoll im Ordner des Originals; Original und Ergebnis gesperrt. | MUSS (BESCHLOSSEN) | Abschluss |
| SGN-F-12 | Versiegeln mit dem Organisationssiegel (fortgeschritten/qualifiziert, Rechtsraum, sichtbar); Ergebnis `<Name>_seal.pdf`. | MUSS | Versiegeln (Suffix ZU PRÜFEN) |
| SGN-F-13 | Eingang «Zu unterschreiben» für Anfragen aus Staffing, Time, Flow, Core mit Frist; Unterschrift direkt im Dokument, FES mit Code aufs Mobiltelefon. | MUSS | Zu unterschreiben |
| SGN-F-14 | Schnittstelle für Module: Prozess mit Dokument und Unterzeichnenden in einem Aufruf, Rückruf bei Abschluss, Siegel, Prüfung. | MUSS | Einbindung |
| SGN-F-15 | Abgleich mit der persönlichen Cloud-Ablage inkl. Unterordner: Zielordner, Richtung, Intervall, Konfliktregel, Ordnerabgleich, Protokoll. | SOLL | Synchronisation |
| SGN-F-16 | Bearbeiten signierter Dokumente nur als Kopie ohne Signaturen. | MUSS | Entscheide |
| SGN-F-17 | Signaturen und Siegel eines beliebigen PDF prüfen (Prüfbericht). | SOLL | `/pruefen` |
| SGN-F-18 | Kopie erhaltener Unterschriften im Ordner «Unterzeichnet erhalten». | KANN | ZU PRÜFEN |

### 2.2 Nicht fachliche Anforderungen

| ID | Anforderung | Priorität |
|---|---|---|
| SGN-NF-01 | Signaturen über einen anerkannten Anbieter nach ZertES (QES) bzw. eIDAS; Anbieter austauschbar hinter einer internen Schnittstelle. | MUSS |
| SGN-NF-02 | Dateien verschlüsselt im Objektspeicher in der Schweiz; Prüfsumme je Version; Virenprüfung beim Hochladen. | MUSS |
| SGN-NF-03 | Persönliche Ablage nur für die besitzende Person sichtbar (auch nicht für Administration ohne Protokoll und Begründung). | MUSS |
| SGN-NF-04 | Rendering von PDF/Word/Excel serverseitig oder mit geprüfter Komponente (Fremdkomponente nur mit Issue, Lizenz geprüft). | MUSS |
| SGN-NF-05 | Uploads bis 100 MB, Vorschau der ersten Seite < 2 s. | SOLL |
| SGN-NF-06 | Rückrufe an Module signiert (HMAC) und mit Wiederholung. | MUSS |

## 3. Pflichtenheft

### 3.1 Architektur

- Laravel-Modul (Repository EduKSX-Sign) mit Objektspeicher; Dienste für **Umwandlung** (PDF/A, z. B. über einen
  Office-Konverter – ZU PRÜFEN), **Rendering**, **Signaturanbieter** (Adapter) und **Abgleich** (über EduKSX-Connect).
- Dokumentzustand: `bearbeitbar` → `in_signatur` → `signiert` (gesperrt) bzw. `versiegelt`; Bearbeiten nur als
  Kopie.
- Modul-Schnittstelle `POST /v1/prozesse/modul` ist idempotent; Ergebnis per Webhook `prozessAbgeschlossen`.

### 3.2 Datenmodell

[`datenbank.sql`](datenbank.sql), Schema `sign`: `ordner`, `dokument`, `dokument_version`, `element`, `prozess`,
`prozess_person`, `prozess_feld`, `prozess_protokoll`, `signatur`, `siegel`, `einstellung`, `anfrage`,
`sync_konfiguration`, `sync_eintrag`, `sync_protokoll`. Dateiinhalte nicht in der Datenbank.

### 3.3 API

[`openapi.yaml`](openapi.yaml): Ablage (`/v1/ordner`, `/v1/dokumente`, `…/hochladen`, `…/inhalt`, `…/versionen`,
`…/kopieren`), Bearbeiten (`…/elemente`, `…/word`, `…/pdfa`), Prozesse (`/v1/prozesse`, `…/senden`,
`…/platzhalter`, `…/erinnern`, `…/zurueckziehen`, `/v1/prozesse/modul`), Eingang (`/v1/eingang`, `…/unterschreiben`,
`…/code`), Siegel (`/v1/siegel`, `/v1/pruefen`), Abgleich, Einstellungen. Webhook `prozessAbgeschlossen`.

### 3.4 Rollen und Berechtigungen

| Scope | Mitarbeitende | Siegelberechtigte (z. B. Schulverwaltung) | Module (technisch) |
|---|---|---|---|
| `sign:lesen`, `sign:ablage` | eigene Ablage | eigene Ablage | – |
| `sign:signieren` | ✓ | ✓ | – |
| `sign:siegel` | – | ✓ | ✓ (wenn vom Mandanten erlaubt) |
| `sign:modul` | – | – | ✓ |

### 3.5 Schnittstellen

| Partner | Richtung | Inhalt |
|---|---|---|
| Signaturanbieter | ↔ | Prozess anlegen, Unterschrift, Siegel, Prüfung (Anbieter OFFEN) |
| EduKSX-Connect | ↔ | Cloud-Ablage der Person (Rechte pro Person, Zielordner) |
| EduKSX-Staffing, -Time, -Flow, -Core | → Sign | Signaturanfragen (Pensenvereinbarung, Monatsvisum, Gesprächsprotokoll …) |
| EduKSX-Flow | ↔ | Vorgang «Signatur einholen» mit Rückmeldung |
| EduKSX-Ident | ← | Personen, Mobilnummer für FES (nur mit Einwilligung) |

### 3.6 Datenübernahme

Keine produktiven Daten aus dem Prototyp. Ordnerstruktur-Vorlage («Formulare», «Verträge», «Unterzeichnet
erhalten») je neuer Person.

## 4. Prüfpunkte für die produktive Umsetzung

Zusätzlich zu den gemeinsamen Prüfpunkten in [`../README.md`](../README.md#4-gemeinsame-prüfpunkte-alle-module).

| Nr. | Prüfpunkt | Bereich | erledigt |
|---|---|---|---|
| SGN-P-01 | Signaturanbieter gewählt (anerkannt nach ZertES, Datenstandort Schweiz), Vertrag, Kosten je Signatur, Organisationszertifikat für das Siegel. | Recht | ☐ |
| SGN-P-02 | Rechtliche Einordnung der Stufen für die typischen Dokumente der Schule geklärt (welche brauchen QES/Schriftform?). | Recht | ☐ |
| SGN-P-03 | PDF/A-Konformität der Umwandlung mit Validator geprüft (PDF/A-2b); Anmerkungen korrekt eingebrannt. | Tests | ☐ |
| SGN-P-04 | Signierte Ergebnisse mit unabhängigem Validator geprüft (gültig, unverändert, Zeitstempel). | Tests | ☐ |
| SGN-P-05 | Sperre signierter/versiegelter Dokumente nicht umgehbar (API, Abgleich aus der Cloud erzeugt Konflikt statt Überschreiben). | Sicherheit | ☐ |
| SGN-P-06 | Zugriff auf persönliche Ablage durch Dritte ausgeschlossen bzw. nur protokolliert mit Begründung (z. B. Austritt). | Datenschutz | ☐ |
| SGN-P-07 | Vorgehen bei Austritt festgelegt (Ablage übergeben, exportieren, löschen nach Frist). | Datenschutz | ☐ |
| SGN-P-08 | Cloud-Abgleich: Rechte pro Person, keine organisationsweiten Schreibrechte; Konflikte und Löschungen getestet. | Sicherheit | ☐ |
| SGN-P-09 | Modul-Anfragen idempotent, Rückruf signiert; Ende-zu-Ende-Test mit EduKSX-Time (Monatsvisum) und Staffing (Pensenvereinbarung). | Schnittstellen | ☐ |
| SGN-P-10 | Fremdkomponenten (Rendering, Konverter) im Verzeichnis `third-party.json` mit Lizenz und Pflege eingetragen. | Betrieb | ☐ |

## 5. Offene Punkte

Siehe «Entscheide und offene Punkte» im README des Prototyps (Suffix `_seal`, Ordner «Unterzeichnet erhalten»,
Render-Komponente, Anbindung Cloud-Ablage, Anbieter/Kosten). Zusätzlich:

1. OFFEN: Gespeicherte Unterschrift als Bild (Bequemlichkeit) – rechtlich ohne Wirkung, trotzdem gewünscht?
2. OFFEN: Externe Unterzeichnende (Eltern, Behördenmitglieder ohne Konto) – Identifikation für FES/QES?
