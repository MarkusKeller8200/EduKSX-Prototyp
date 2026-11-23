# Prototyp: Interne KI (EduKSX-AI)

**Status:** in-arbeit · **Technik:** html · **Ziel-Modul:** EduKSX-AI · **Version:** siehe `prototyp.json`

## Frage

Wie sieht eine KI-Plattform aus, die sich wie ein bekannter KI-Assistent bedienen lässt, aber in einem internen,
geschützten Umfeld läuft – mit offenen Modellen auf einem eigenen KI-Server oder bei einem geprüften Schweizer
Anbieter – und dabei je nach Schutzbedarf der Daten automatisch nur zulässige Betriebsorte verwendet?

## Starten

`index.html` im Browser öffnen (oder über die Einstiegsseite auf GitHub Pages). Zustand bleibt im Browser
gespeichert; «↺ Testdaten» setzt alles zurück.

## Umfang (Auftrag vom 23.11.2026, Issue #88)

| Anforderung | Umsetzung im Prototyp |
|---|---|
| KI in einem internen, geschützten Umfeld | Schutzbedarf je Unterhaltung, Assistent und Sammlung; Weiterleitung nur an freigegebene Betriebsorte bis zur zulässigen Stufe; Anzeige des Betriebsorts bei jeder Antwort |
| Weboberfläche ähnlich bekannten KI-Assistenten | Chat mit Unterhaltungsliste, fortlaufender Antwort, Stopp, Neu erzeugen, Kopieren, Rückmeldung, Anhänge, Quellen, Gesprächsvorschläge |
| Modelle lokal auf eigenem KI-Server oder in geschützter Schweizer Cloud | Seite «Betriebsorte»: interner Server, CH-Inferenz-API, CH-GPU (selbst betrieben), ausserhalb der Schweiz; Freigabe nach Datenschutzprüfung, «zulässig bis», Verbindung testen |
| Schweizer Anbieter, wenn aus Datenschutzsicht in Ordnung | Anbieter als Betriebsorte mit Status freigegeben / in Prüfung / abgelehnt, Nachweise, CLOUD Act, ADV, Link zur Website (siehe unten) |
| Beliebige offene Modelle (Apertus, Qwen, DeepSeek, GLM, Kimi …) | Seite «Modelle»: Katalog mit Kennung, Herkunft, Lizenz, Grösse, Kontext, Fähigkeiten, Betriebsorten; Modell hinzufügen; Standardmodell je Schutzbedarf |
| Oberfläche konzeptionell wie die gezeigten Bildschirmfotos | Gleiche Grundbereiche (Chat, Assistenten, Wissen, Verwaltung), aber eigene Gestaltung im EduKSX-CI, eigene Begriffe und zusätzliche Funktionen (Schutzbedarf, Betriebsorte, Personendaten-Prüfung, MCP-Werkzeuge) |

Zusätzlich: Assistenten (Anweisungen, Modell, Wissen, Freigabe, Export/Import), Wissenssammlungen (Dateien,
Indexstatus, Freigabe), Benutzer & Gruppen, Rollen & Rechte, Werkzeuge (EduKSX-Codex, EduKSX-Glossary über MCP),
Datenschutzregeln und Systemzustand.

## Offene Modelle (Stand 23.11.2026)

Beispiele im Katalog; Grösse, Lizenz und Kontext vor dem Einsatz an der Modellkarte prüfen.

| Modell | Herkunft | Quelle |
|---|---|---|
| Apertus 1.5 (8B, 70B) | Swiss AI Initiative (ETH Zürich, EPFL, CSCS) | <https://huggingface.co/swiss-ai> |
| Qwen3.5 / Qwen3 Embedding | Qwen (Alibaba) | <https://huggingface.co/Qwen> |
| DeepSeek V4.1 Flash | DeepSeek | <https://huggingface.co/deepseek-ai> |
| GLM-5.2 | Z.ai (Zhipu) | <https://huggingface.co/zai-org> |
| Kimi K3 | Moonshot AI | <https://huggingface.co/moonshotai> |
| gpt-oss 120B, Whisper large-v3 | OpenAI (offene Gewichte) | <https://huggingface.co/openai> |

## Schweizer Anbieter (öffentlich angeboten)

Übersicht: [Vergleich KI-Anbieter Schweiz (openstream)](https://www.openstream.ch/vergleich-ki-anbieter-schweiz/).
Angaben laut Anbieter bzw. Vergleich; die Datenschutzprüfung der Schule steht aus.

| Anbieter | Art | Standort laut Anbieter | Im Prototyp |
|---|---|---|---|
| [Infomaniak](https://www.infomaniak.com) | Inferenz-API, OpenAI-kompatibel | Genf | freigegeben bis «vertraulich» (Beispiel) |
| [PHOENIQS](https://www.phoeniqs.com) | Inferenz-API (u. a. Apertus 70B) | Arlesheim BL | in Prüfung |
| [Swisscom Swiss AI Platform](https://www.swisscom.ch) | Inferenz-API | Schweiz | in Prüfung |
| [Safe Swiss Cloud](https://www.safeswisscloud.ch) | Inferenz-API | Zürich | in Prüfung |
| [Exoscale](https://www.exoscale.com) | dedizierte Inferenz (Zone CH) | Genf, Zürich | in Prüfung |
| [cloudscale.ch](https://www.cloudscale.ch) | GPU-Server, Modell selbst betrieben | Rümlang ZH, Lupfig AG | freigegeben bis «vertraulich» (Beispiel) |
| [MAIA](https://www.getmaia.ai/de/) | KI-Plattform (SaaS) | EU | abgelehnt als Betriebsort: Hosting EU, Komplettplattform |

Hyperscaler mit Rechenzentren in Zürich und Genf unterstehen laut Vergleich dem US CLOUD Act und sind deshalb
nicht aufgeführt.

## Entscheide und offene Punkte

- Produktname **EduKSX-AI** (Entscheid 23.11.2026, Namensregel EduKSX-<englischer Begriff>), Untertitel «Interne KI».
- Modelle und öffentlich angebotene Schweizer Anbieter dürfen mit Namen erwähnt und verlinkt werden (Entscheid 23.11.2026).
- Die gezeigten Bildschirmfotos waren nur konzeptionell: keine Übernahme von Namen, Marken, Texten oder Aufbau 1:1.
- Eigenes Icon «ai» fehlt in EduKSX-UI – vorläufig das Plattform-Icon – **OFFEN**.
- Betriebsmodell: eigener Server, gemietete GPU oder Inferenz-API – **OFFEN** (Kosten, Aufwand).
- Gateway zwischen Modul und Betriebsorten (z. B. LiteLLM) und Vektorsuche (pgvector) – **ZU PRÜFEN**.
- Zugang für Lernende – **OFFEN**.

## Ergebnis

Noch in Abstimmung.

## Entwickler

Menüpunkt «Entwickler» bzw. `entwickler/`: Datenmodell (Diagramm, Tabellen, SQL), API-Dokumentation (Scalar),
Swagger und OpenAPI – erzeugt mit `python3 tools/entwickler_bauen.py` aus `docs/umsetzung/ai/` (nicht von Hand ändern).

## Hinweise

- Nur erfundene Testdaten; Antworten der Modelle, Indexierung, Verbindungstests und Systemzustand sind simuliert.
- Personendaten-Prüfung im Prototyp mit Beispielmustern (AHV-Nummer, E-Mail, Telefon, Geburtsdatum, Stichwörter).
- Version in `prototyp.json` erhöhen, wenn sich der Prototyp ändert.
