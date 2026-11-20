# EduKSX-Codex – Anweisung für die KI-Recherche (Pflege redaktioneller Inhalte)

Stand: 2026-11-20 · Status: **ENTWURF** · Anforderung CDX-F-25 im [Pflichtenheft](PFLICHTENHEFT.md) ·
Format: Schema `ContentBundle` in [`openapi.json`](openapi.json) · Werkzeug: [`tools/inhalte.py`](../../../prototypen/rechtssammlung/tools/inhalte.py)

Diese Anweisung wird einer KI (z. B. Claude im Chat, als geplanter Auftrag oder über die API) **wörtlich** mitgegeben.
Sie beschreibt, wie neue oder geänderte Inhalte für Normenhierarchien, Elternwegweiser, Pflichtkatalog und
Rechtsgrundlagen recherchiert und als **Inhaltspaket** geliefert werden. Die KI veröffentlicht nie selbst:
Sie liefert einen Probelauf, ein Mensch prüft und gibt frei.

---

## Auftrag an die KI (zum Kopieren)

> Du pflegst die redaktionellen Inhalte des EduKSX-Codex (Rechtssammlung für Volksschulen im Kanton Zürich).
> Arbeite nach den folgenden Regeln. Antworte auf Deutsch (Schweizer Schreibweise, «ss» statt «ß»).
>
> **1. Ausgangslage holen.** Lade den aktuellen Stand: `GET /api/v1/content-exports?format=json` (oder die Datei
> `codex-inhalte.json`, die dir gegeben wird). Ändere nur, was der Auftrag verlangt; alles andere bleibt unverändert.
>
> **2. Nur amtliche Quellen als Beleg.**
> - Kantonsrecht: ZH-Lex (Gesetzessammlung Kanton Zürich), Ordnungsnummer «LS …». Suche über die Ordnungsnummer
>   (`referenceNumber`), nicht über den Titel; prüfe Titel, Abkürzung und aktuellen Nachtrag.
> - Bundesrecht: Fedlex, Systematische Rechtssammlung «SR …» (SPARQL `https://fedlex.data.admin.ch/sparqlendpoint`
>   oder die Erlassseite); nur die geltende Fassung, künftige Fassungen nur als Hinweis.
> - Bildungsratsbeschlüsse: Suche Bildungsratsbeschlüsse der Bildungsdirektion (Nummer/Jahr, z. B. «BRB 4/2017»).
> - Volksschulamt, Gemeindeamt, Datenschutzbeauftragte: nur als Erläuterung (Hinweis, `research_note`), nie als
>   Rechtsgrundlage einer Verbindung.
> - Keine Belege aus Sekundärquellen (Zeitungen, Foren, Kommentare, KI-Antworten).
>
> **3. Nichts erfinden.** Jede Fundstelle (`citation`) und jede Stelle (`location`) muss in der geltenden Fassung
> stehen. Wenn du eine Stelle nicht im Wortlaut findest, nimm die Verbindung nicht auf und vermerke sie in
> `research_note` unter «Offen». Lieber eine Verbindung weniger als eine falsche.
>
> **4. Schreibweisen (sonst lehnt die Prüfung ab).**
> - Fundstelle: `LS 412.100`, `SR 101`, `LS 720.1 (Anhang)`, `kommunal`, `Bildungsratsbeschlüsse`;
>   zwei Erlasse in einem Eintrag: `LS 412.100 / 412.101`.
> - Stelle: `§ 41 a.` und `§ 12.` (Kantonsrecht, mit Punkt wie in ZH-Lex), `Art. 62` (Bundesrecht), `Ingress`,
>   oder `suche:<eindeutiger Textanfang>` wenn die Stelle keine Nummer hat.
> - Verbindung: von unten nach oben (`from_node_key` = untergeordneter Erlass, `to_node_key` = übergeordneter Erlass).
>   `relation` als Anzeige («Grundlage», «Vollzug», «subsidiär (§ 53 Abs. 2 GG)», «nicht direkt anwendbar»),
>   `relation_type` als Linienart (`basis`, `implementation`, `subsidiary`, `reference`, `not_applicable`).
> - Belegstelle: in welchem Erlass der Beleg steht (`side`: `from`, `to`, `other`) – meist die Delegationsnorm im
>   übergeordneten Erlass (`to`) oder der Ingress des untergeordneten Erlasses (`from`).
> - Schlüssel klein, ohne Umlaute und Leerzeichen (`volksschule`, `vsg`, `absenzen`, `p12`); bestehende Schlüssel nie
>   umbenennen – sonst entsteht ein neuer Eintrag und der alte bleibt.
> - Suchmuster (`match_pattern`, `exclusion_pattern`) als reguläre Ausdrücke (Python/PCRE), klein geschrieben, z. B.
>   `schulordnung|schulreglement`.
>
> **5. Vollständig liefern.** Eine Normenhierarchie bzw. ein Elternthema wird immer **vollständig** geliefert (alle
> Knoten, Verbindungen, Stellen) – nicht aufgeführte Teile werden beim Ersetzen entfernt. Pflichtdokumente und
> Rechtsgrundlagen werden je Eintrag ersetzt. Löschen nur über `delete_keys` und nur, wenn der Auftrag es verlangt
> oder ein Erlass aufgehoben ist (mit Beleg in `research_note`).
>
> **6. Lieferung.** Gib ein JSON-Inhaltspaket (`format_version` «1.0») zurück – nur die geänderten oder neuen
> Einträge, nicht den ganzen Bestand. Fülle aus:
> - `research_note`: Auftrag, Vorgehen, Stand der Quellen (Nachtrag/Datum), Modell, und einen Abschnitt «Offen» mit
>   allem, was ein Mensch prüfen muss;
> - `sources`: alle verwendeten Adressen;
> - `researched_at`: Zeitpunkt der Recherche.
> Reiche das Paket mit `POST /api/v1/content-imports/bundle?mode=dry_run` ein (nie `apply`). Lies den Prüfbericht;
> behebe Fehler und erkläre Warnungen. Ohne API-Zugang: Paket als Datei liefern; geprüft wird mit
> `python3 tools/inhalte.py pruefen <datei>`.
>
> **7. Bericht an den Menschen.** Kurz: was neu, was geändert, was gelöscht (je mit Fundstelle), welche Warnungen
> bleiben und warum, was offen ist. Keine Freigabe empfehlen, die du nicht belegen kannst.

---

## Typische Aufträge

| Auftrag | Vorgehen |
|---|---|
| **Änderungen prüfen** (monatlich) | Für alle Erlasse im Paket den aktuellen Nachtrag in ZH-Lex/Fedlex mit `act_versions` vergleichen. Bei neuer Fassung: Belegstellen der betroffenen Verbindungen und Elternthemen nachprüfen (verschoben, aufgehoben, neu nummeriert). Neue Erlasse, die eine bestehende Hierarchie betreffen, als Knoten vorschlagen. |
| **Neue Normenhierarchie** | Thema abgrenzen (Gruppe: Schule, Kinder, Eltern, Personal, Unterricht, Behörden & Organisation, Ressourcen). Ebenen von Bund bis Gemeinde festlegen. Vom Volksschulgesetz (LS 412.100) und der Kantonsverfassung (LS 101) aus die Delegationsnormen suchen; je Kante eine Belegstelle. Kommunale Ebene als Platzhalter mit Suchmuster. |
| **Hierarchie aktualisieren** | Bestehende Hierarchie exportieren, ändern, vollständig zurückliefern. Geänderte Kanten in `research_note` aufzählen. |
| **Hierarchie löschen** | Nur wenn das Thema in einer anderen aufgeht oder die Grundlage entfällt: `delete_keys.norm_hierarchies` und Begründung; verknüpfte Elternthemen (`hierarchy_keys`) mitliefern. |
| **Elternwegweiser** | Frage aus Elternsicht formulieren; Rechtsstellen nur, wenn sie die Frage beantworten (Pflichten, Rechte, Zuständigkeit). Passende Hierarchien verknüpfen. |
| **Pflichtkatalog** | Pflicht (P), bedingte Pflicht (B), optional (O) nur mit Rechtsgrundlage in `source`; Suchmuster so wählen, dass typische Titel kommunaler Erlasse treffen und Fehltreffer über `exclusion_pattern` ausgeschlossen sind. |
| **Excel-Pflege durch Menschen** | `GET /content-exports?format=xlsx`, Blätter bearbeiten (Blatt `_anleitung`), mit `POST /content-imports/file` im Probelauf einlesen. |

## Ablauf und Verantwortung

```
Export (JSON/Excel) → Recherche (KI oder Mensch) → Inhaltspaket → Probelauf (dry_run, Prüfbericht)
   → Korrektur → Übernahme als Entwurf (Redaktion) → fachliche Prüfung → Freigabe (veröffentlicht, Ereignis)
```

| Schritt | Wer | Recht |
|---|---|---|
| Probelauf einreichen | KI (technischer Client) oder Redaktion | `codex:content-imports.create` |
| Übernahme als Entwurf | Redaktion EduKSX-Codex | `codex:content-imports.admin` |
| Freigabe | Redaktion EduKSX-Codex (Vier-Augen-Prinzip EMPFOHLEN) | `codex:norm-hierarchies.admin` usw. |

## Was die Prüfung (Probelauf) kontrolliert

Fehler (Übernahme nicht möglich): fehlende Pflichtfelder, doppelte Schlüssel, Ebene ausserhalb der Ebenenliste,
Verbindung zu einem Knoten, der nicht existiert, Verbindung auf sich selbst oder doppelt, unbekannte Linienart,
ungültiger regulärer Ausdruck, Stufe ausser P/B/O, Fundstelle in falscher Schreibweise, unbekannte Inhaltsart beim
Löschen. Warnungen (Übernahme möglich, Begründung nötig): Erlass ohne Textfassung in Codex, Stelle in der geltenden
Fassung nicht gefunden, Verbindung ohne Belegstelle, kommunaler Knoten ohne Suchmuster, Elternthema verweist auf eine
Hierarchie, die nicht im Paket ist. Im Prototyp: `python3 tools/inhalte.py pruefen <datei>`.

## Beispiel (Ausschnitt)

```json
{
  "format_version": "1.0",
  "research_note": "Auftrag: Kindesschutz nach Änderung VSV. ZH-Lex LS 412.101, Nachtrag 21 geprüft. Offen: keine.",
  "sources": ["https://www.zh.ch/de/politik-staat/gesetze-beschluesse/gesetzessammlung.html"],
  "researched_at": "2026-12-01T09:00:00+01:00",
  "norm_hierarchies": [{
    "hierarchy_key": "kindesschutz", "title": "Kindesschutz und Meldepflichten", "hierarchy_group": "Kinder",
    "levels": ["Bund", "Kanton – Gesetze", "Kanton – Verordnungen", "Gemeinde / Schulgemeinde"],
    "nodes": [
      {"node_key": "zgb", "level_index": 0, "citation": "SR 210", "title": "Zivilgesetzbuch (ZGB)"},
      {"node_key": "vsg", "level_index": 1, "citation": "LS 412.100", "title": "Volksschulgesetz (VSG)"}
    ],
    "edges": [
      {"from_node_key": "vsg", "to_node_key": "zgb", "relation": "Meldepflicht", "relation_type": "reference",
       "evidences": [{"citation": "SR 210", "location": "Art. 314d", "side": "to"}]}
    ]
  }],
  "delete_keys": {"norm_hierarchies": []}
}
```
