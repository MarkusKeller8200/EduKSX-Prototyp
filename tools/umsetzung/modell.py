"""Datenmodell aus docs/umsetzung/**/datenbank.sql lesen – mit deutschen Beschreibungen nach DB-Standard A8.

Form der Beschreibungen im SQL (nur Python-Standardbibliothek):

    -- <Kurzbeschreibung der Tabelle>
    -- Geltungsbereich: global | Organisation | persönlich · Datenklasse: <Vorgabe für die Spalten>
    -- Herkunft/Verwendung: <woher bzw. wofür>
    CREATE TABLE classes (
        student_count integer NOT NULL,   -- <Begriff> | <Herkunft/Verwendung> | <Datenklasse> | <wert=Label; wert=Label>

Teile nach dem Begriff sind freiwillig; die Datenklasse fehlt → Vorgabe der Tabelle; Labels nur bei Aufzählungen.
Standardspalten (id, organization_id, created_at, …) beschreibt eduksx/core einheitlich (STANDARD).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

DATENKLASSEN = {
    "öffentlich": "public", "intern": "internal", "personenbezogen": "personal",
    "besonders schützenswert": "sensitive", "geheim": "secret",
}
GELTUNGSBEREICHE = {"global", "Organisation", "persönlich"}

# Feste Beschreibungen der Standardspalten (DB A8) – Begriff, Herkunft/Verwendung, Datenklasse
STANDARD = {
    "id": ("ID", "UUID v7, von der Anwendung vergeben", "intern"),
    "organization_id": ("Organisation", "Mandant; aus dem Token, nie aus der Eingabe", "intern"),
    "created_at": ("Erstellt am", "Zeitpunkt der Erfassung (UTC)", "intern"),
    "created_by_id": ("Erstellt von", "Person, die den Datensatz angelegt hat (ohne Constraint)", "intern"),
    "updated_at": ("Geändert am", "Zeitpunkt der letzten Änderung (UTC)", "intern"),
    "updated_by_id": ("Geändert von", "Person der letzten Änderung (ohne Constraint)", "intern"),
    "lock_version": ("Version", "optimistisches Sperren; ETag und If-Match", "intern"),
    "deleted_at": ("Gelöscht am", "Papierkorb: vorläufig gelöscht", "intern"),
    "deleted_by_id": ("Gelöscht von", "Person, die gelöscht hat (ohne Constraint)", "intern"),
    "event_id": ("Ereignis-ID", "eindeutig über Module und Exporte hinweg", "intern"),
}


@dataclass
class Spalte:
    name: str
    typ: str
    pflicht: bool = False
    vorgabe: str | None = None
    schluessel: str | None = None      # PK, UK
    verweis: str | None = None         # tabelle.spalte (gleiches Schema) bzw. schema.tabelle.spalte
    werte: list[str] = field(default_factory=list)
    begriff: str = ""
    herkunft: str = ""
    datenklasse: str = ""
    labels: dict[str, str] = field(default_factory=dict)
    standard: bool = False


@dataclass
class Tabelle:
    schema: str
    name: str
    text: str = ""
    geltung: str = ""
    datenklasse: str = ""
    herkunft: str = ""
    spalten: list[Spalte] = field(default_factory=list)
    regeln: list[str] = field(default_factory=list)
    ansicht: bool = False
    standardtabelle: bool = False

    @property
    def voll(self) -> str:
        return f"{self.schema}.{self.name}"

    def spalte(self, name: str) -> Spalte | None:
        return next((s for s in self.spalten if s.name == name), None)


def _teilen(rumpf: str) -> list[tuple[str, str]]:
    """Teilt den Rumpf eines CREATE TABLE an Kommas der obersten Ebene; liefert (Definition, Kommentar)."""
    teile, tiefe, aktuell, kommentar, zitat = [], 0, "", "", False
    for zeile in rumpf.splitlines():
        code, notiz = zeile, ""
        # «--» ausserhalb von Zeichenketten trennt den Kommentar ab
        drin = False
        for i, z in enumerate(zeile):
            if z == "'":
                drin = not drin
            if not drin and zeile[i:i + 2] == "--":
                code, notiz = zeile[:i], zeile[i + 2:].strip()
                break
        for z in code:
            if z == "'":
                zitat = not zitat
            elif not zitat and z in "({":
                tiefe += 1
            elif not zitat and z in ")}":
                tiefe -= 1
            if z == "," and tiefe == 0 and not zitat:
                teile.append([aktuell.strip(), kommentar])
                aktuell, kommentar = "", ""
                continue
            aktuell += z
        aktuell += " "
        if notiz:
            if teile and not aktuell.strip():
                teile[-1][1] = (teile[-1][1] + " " + notiz).strip()
            else:
                kommentar = (kommentar + " " + notiz).strip()
    if aktuell.strip():
        teile.append([aktuell.strip(), kommentar])
    return [(re.sub(r"\s+", " ", d), k) for d, k in teile if d]


def _kopf(text: str, pos: int) -> list[str]:
    """Zusammenhängende Kommentarzeilen direkt vor pos (ohne Trennlinien)."""
    zeilen = text[:pos].rstrip("\n").splitlines()
    gesammelt = []
    for z in reversed(zeilen):
        s = z.strip()
        if s.startswith("--") and not s.startswith("-- ---") and not s.startswith("-- >>>") and not s.startswith("-- <<<"):
            gesammelt.append(s[2:].strip())
        else:
            break
    return list(reversed(gesammelt))


def _kommentar_spalte(s: Spalte, k: str, vorgabe_klasse: str) -> None:
    teile = [t.strip() for t in k.split(" | ")] if k else []
    if teile:
        s.begriff = teile[0]
    for t in teile[1:]:
        if t in DATENKLASSEN:
            s.datenklasse = t
        elif "=" in t and all("=" in x for x in t.split(";") if x.strip()):
            for paar in t.split(";"):
                if "=" in paar:
                    w, l = paar.split("=", 1)
                    s.labels[w.strip()] = l.strip()
        elif not s.herkunft:
            s.herkunft = t
    if s.name in STANDARD:
        b, h, d = STANDARD[s.name]
        s.standard = True
        s.begriff = s.begriff or b
        s.herkunft = s.herkunft or h
        s.datenklasse = s.datenklasse or d
    s.datenklasse = s.datenklasse or vorgabe_klasse


def lesen(sql: str, standard_von: int | None = None, standard_bis: int | None = None) -> list[Tabelle]:
    """Tabellen und Ansichten eines Skripts. Tabellen zwischen den Positionen standard_von/-bis gelten als Standardtabellen."""
    m = re.search(r"SET search_path TO (\w+)", sql)
    schema_vorgabe = m.group(1) if m else "public"
    out: list[Tabelle] = []
    for m in re.finditer(r"CREATE TABLE (?:IF NOT EXISTS )?(?:(\w+)\.)?(\w+) \((.*?)\n\);", sql, re.S):
        t = Tabelle(m.group(1) or schema_vorgabe, m.group(2))
        t.standardtabelle = standard_von is not None and standard_von <= m.start() <= (standard_bis or 10**9)
        kopf = _kopf(sql, m.start())
        if kopf:
            t.text = kopf[0]
            for z in kopf[1:]:
                for teil in z.split(" · "):
                    if teil.startswith("Geltungsbereich:"):
                        t.geltung = teil.split(":", 1)[1].strip()
                    elif teil.startswith("Datenklasse:"):
                        t.datenklasse = teil.split(":", 1)[1].strip()
                    elif teil.startswith("Herkunft/Verwendung:"):
                        t.herkunft = teil.split(":", 1)[1].strip()
        pk: list[str] = []
        for d, k in _teilen(m.group(3)):
            kopfwort = d.split(" ", 1)[0].upper()
            if kopfwort in ("UNIQUE", "CHECK", "PRIMARY", "CONSTRAINT", "FOREIGN"):
                if kopfwort == "PRIMARY":
                    pk = [x.strip() for x in re.search(r"\((.*?)\)", d).group(1).split(",")]
                t.regeln.append(d)
                continue
            name, rest = d.split(" ", 1)
            typ = re.match(r"([a-z]+(?:\s+precision)?(?:\([\d, ]+\))?(?:\[\])?)", rest).group(1)
            s = Spalte(name, typ)
            s.pflicht = "NOT NULL" in rest or "PRIMARY KEY" in rest
            if "PRIMARY KEY" in rest:
                s.schluessel = "PK"
            elif re.search(r"\bUNIQUE\b", rest):
                s.schluessel = "UK"
            if (v := re.search(r"DEFAULT (.+?)(?: NOT NULL| REFERENCES| CHECK| UNIQUE| PRIMARY|$)", rest)):
                s.vorgabe = v.group(1).strip()
            if (r := re.search(r"REFERENCES (?:(\w+)\.)?(\w+)\((\w+)\)", rest)):
                s.verweis = f"{r.group(1) or t.schema}.{r.group(2)}.{r.group(3)}"
            if (w := re.search(r"CHECK \(\w+ IN \((.*?)\)\)", rest)):
                s.werte = [x.strip().strip("'") for x in w.group(1).split(",")]
            _kommentar_spalte(s, k, t.datenklasse)
            t.spalten.append(s)
        for s in t.spalten:
            if s.name in pk:
                s.schluessel = "PK"
                s.pflicht = True
        out.append(t)
    for m in re.finditer(r"CREATE VIEW (?:(\w+)\.)?(\w+) AS", sql):
        kopf = _kopf(sql, m.start())
        out.append(Tabelle(m.group(1) or schema_vorgabe, m.group(2), kopf[0] if kopf else "", ansicht=True,
                           herkunft=" ".join(kopf[1:])))
    return out


def maengel(tabellen: list[Tabelle]) -> list[str]:
    """Fehlende deutsche Beschreibungen nach DB A8."""
    fehler = []
    for t in tabellen:
        if not t.text:
            fehler.append(f"{t.voll}: Kurzbeschreibung fehlt")
        if t.ansicht:
            continue
        if t.geltung not in GELTUNGSBEREICHE:
            fehler.append(f"{t.voll}: Geltungsbereich fehlt oder ungültig ({t.geltung!r})")
        if not t.herkunft:
            fehler.append(f"{t.voll}: Herkunft/Verwendung fehlt")
        if t.geltung == "Organisation" and not t.spalte("organization_id"):
            fehler.append(f"{t.voll}: Geltungsbereich Organisation ohne organization_id")
        if t.geltung == "global" and t.spalte("organization_id") and not t.standardtabelle and t.name != "data_changes":
            fehler.append(f"{t.voll}: global, aber mit organization_id")
        for s in t.spalten:
            if not s.begriff:
                fehler.append(f"{t.voll}.{s.name}: deutscher Begriff fehlt")
            if s.datenklasse not in DATENKLASSEN:
                fehler.append(f"{t.voll}.{s.name}: Datenklasse fehlt oder ungültig ({s.datenklasse!r})")
            for w in s.werte:
                if w not in s.labels:
                    fehler.append(f"{t.voll}.{s.name}: Label für Wert {w!r} fehlt")
            if re.search(r"[A-ZÄÖÜäöüß]", s.name):
                fehler.append(f"{t.voll}.{s.name}: Name nicht englisch snake_case")
        if not re.fullmatch(r"[a-z][a-z0-9_]*s", t.name) and t.name not in ("data_changes",):
            fehler.append(f"{t.voll}: Tabellenname nicht im Plural (englisch, snake_case)")
    return fehler


def kommentare_sql(tabellen: list[Tabelle]) -> str:
    """COMMENT ON TABLE/COLUMN für PostgreSQL (DB A8: «Begriff – Herkunft/Verwendung»)."""
    q = lambda x: "'" + x.replace("'", "''") + "'"
    zeilen = []
    for t in tabellen:
        if t.ansicht:
            zeilen.append(f"COMMENT ON VIEW {t.name} IS {q(t.text)};")
            continue
        zeilen.append(f"COMMENT ON TABLE {t.name} IS {q(t.text + ' – ' + t.herkunft if t.herkunft else t.text)};")
        for s in t.spalten:
            txt = s.begriff + (f" – {s.herkunft}" if s.herkunft else "")
            zeilen.append(f"COMMENT ON COLUMN {t.name}.{s.name} IS {q(txt)};")
    return "\n".join(zeilen)


def indizes_sql(tabellen: list[Tabelle]) -> str:
    """Index auf jeder Fremdschlüsselspalte, die nicht schon vorne in PK/UNIQUE steht (DB A3)."""
    zeilen = []
    for t in tabellen:
        if t.ansicht:
            continue
        vorne = set()
        for r in t.regeln:
            if (m := re.match(r"(?:PRIMARY KEY|UNIQUE(?: NULLS NOT DISTINCT)?) \((\w+)", r)):
                vorne.add(m.group(1))
        for s in t.spalten:
            if s.verweis and s.schluessel is None and s.name not in vorne:
                zeilen.append(f"CREATE INDEX {t.name}_{s.name}_index ON {t.name} ({s.name});")
    return "\n".join(zeilen)
