# Prototyp: EduKSX-Time – Zeiterfassung / Stempeln

**Status:** in-arbeit · **Technik:** html (PWA) · **Ziel-Modul:** EduKSX-Time

## Frage

Wie einfach lässt sich die Arbeitszeit mit dem Handy ein- und ausstempeln, wenn EduKSX-Time als installierbare
App (PWA) auf dem Startbildschirm liegt? Vorbild ist die heute im Intranet angebundene Zeiterfassung mit
Kommen-/Gehen-Buchungen, Buchungsarten und Sollzeit pro Tag.

## Schritt 1 (0.1.0)

- Grosse Stempeltasten: **Kommen** → **Pause** / **Gehen** → **Pause beenden**; Buchungsart vor dem Kommen
  (Arbeitszeit, Homeoffice).
- Status mit laufender Zeit, Tagesliste der Buchungen, Ist / Soll / Saldo heute (Soll = Pensum × 8:24 pro Arbeitstag).
- Letzte Buchung 2 Minuten lang **rückgängig**; vergessenes **Gehen nachtragen** (als nachgetragen gekennzeichnet).
- Hinweis, wenn nach 6 Stunden noch keine Pause von 30 Minuten gebucht ist.
- **Verlauf**: Woche und letzte 14 Tage mit Zeiten, Ist und Saldo.
- **Offline**: Service Worker hält die App bereit; Buchungen bleiben auf dem Gerät und werden mit Verbindung
  «übertragen» (simuliert, Kennzeichen je Buchung).
- Installierbar (Manifest, Icons, iPhone-Hinweis «Zum Home-Bildschirm»), hell/dunkel nach Systemeinstellung.

Folgt später: Abwesenheiten, Korrekturen, Monatsübersicht mit Saldo und Ferien, Einreichen und Visum, Anmeldung über
EduKSX-Ident, echte Schnittstelle.

## Starten

Über GitHub Pages (Einstiegsseite › EduKSX-Time) auf dem Handy öffnen und installieren. Lokal braucht der Service
Worker einen Webserver: `python3 -m http.server -d prototypen/zeiterfassung 8000` → http://localhost:8000.

## Ergebnis

Noch offen – Rückmeldungen aus dem Test (Issue #19).

## Hinweise

- Nur erfundene Testdaten (Demo-Person «Lea Muster»); Buchungen liegen nur im Browser (localStorage).
- Bei Änderungen `version` in `prototyp.json` und `VERSION` in `sw.js` erhöhen.
