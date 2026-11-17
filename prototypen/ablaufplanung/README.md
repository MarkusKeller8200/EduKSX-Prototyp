# Prototyp: Ablaufplanung (EduKSX-Flow)

**Status:** in-arbeit · **Technik:** html · **Ziel-Modul:** EduKSX-Flow

## Frage

Wie plant eine Schule wiederkehrende Abläufe (Onboarding, Offboarding, Mutationen) als Schritte – und wie ruft jeder
Schritt den passenden Vorgang in einem anderen EduKSX-Modul auf, ohne dass EduKSX-Flow selbst Fachlogik enthält?

## Starten

`index.html` im Browser öffnen. Alle Daten sind erfunden; Aufrufe an andere Module werden simuliert.

## Was der Prototyp zeigt

- **Ablaufvorlagen** mit Schritten: Bezeichnung, verantwortliche Rolle, Frist relativ zum Stichtag (`T−21`),
  Vorgänger («erst nach»), Bedingung (z. B. nur für Klassenlehrpersonen) und genau ein **Aufruf** eines Vorgangs.
  Darstellung als Liste und als **Ablaufbild** (Bahnen je Rolle, Reihenfolge von links nach rechts).
- **Vorgangsregister:** Jedes Modul meldet seine Vorgänge mit Parametern, Ergebnis und Antwortart («sofort» oder
  «mit Rückmeldung»). Flow kennt nur diese Verträge. Module im Prototyp: Core, Ident, Connect, Staffing, Time, Shop.
- **Platzhalter und Verkettung:** Parameter nutzen Kontextfelder (`{person}`, `{stichtag-14}`) und Ergebnisse
  früherer Schritte (`{o5.benutzername}` aus EduKSX-Ident → Zugänge über EduKSX-Connect).
- **Funktionendiagramm:** Ein Schritt kann einer Aufgabe zugeordnet werden; Flow schlägt «V» als verantwortlich und
  «I» als zu informieren vor und warnt bei Abweichungen. Prozessbeschriebe: SV bearbeitet (V), RV gibt frei (E).
- **Prüfung vor Freigabe:** Kreise, fehlende Parameter, unbekannte Platzhalter, Ergebnisse, die noch nicht vorliegen,
  Fristen vor dem Vorgänger, Zuständigkeit gegen Funktionendiagramm.
- **Versionierung:** Änderungen an einer freigegebenen Vorlage ergeben einen Entwurf mit neuer Version; laufende
  Abläufe arbeiten mit der Kopie der Version beim Start.
- **Laufende Abläufe:** Start mit Kontext (Name, Funktion, Stichtag …), Vorschau der Fristen und entfallenden Schritte;
  danach Aufgabenliste je Rolle, automatische Schritte (laufen bei erreichter Frist), Rückmeldungen, Fehler mit
  «Erneut versuchen», Mitteilungen an informierte Rollen, Aufrufprotokoll.
- **Simulation:** simulierter Tag (+1, +7, nächste Frist), Module als «nicht erreichbar» schalten, Rollenwechsel.

## Grundlagen

- Prozessliste der Arbeitsgruppe (Onboarding, Offboarding, Mutationen, Gruppen) – Schritte und Zuständigkeiten.
- Funktionendiagramm einer Primarschule im Kanton Zürich (Muster), Auszug Personal und ICT.
- Zielsysteme ohne Hersteller-/Produktnamen (Office-Konto, Schulverwaltungssoftware, Lehrmittelportal, Notfall-App).

## Offene Fragen (ZU PRÜFEN)

- Ab wann dürfen Logins erstellt werden (Prozessliste: offen)? Im Prototyp T−21 bzw. gültig ab T−14.
- Regeln, wann was gesperrt wird (Offboarding): im Prototyp Sperre am Tag nach dem letzten Arbeitstag.
- Welches Modul führt Schlüssel und Geräte (im Prototyp EduKSX-Shop)?
- Vikariate und Schulsozialarbeit (Zugriff auf SuS-Daten) als eigene Vorlagen.
- Digitale Aktenführung ab 1.1.2029: Aufrufprotokoll als Teil des Personaldossiers?

## Ergebnis

Noch offen – nach der Abstimmung festhalten, was nach EduKSX-Flow übernommen wird (Vorgangsregister als
Schnittstelle zu den Modulen, Vorlagen-Versionierung, Motor für Fristen und automatische Schritte).

## Hinweise

- Nur erfundene Testdaten verwenden.
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
