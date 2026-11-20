"""OpenAPI 3.1 aus Datenmodell und API-Definition erzeugen – nach API-Standard 1.2 der EduKSX-Plattform.

- Pfade /api/v1/…, Ressourcen englisch, Plural, kebab-case; Organisationsdaten unter /api/v1/org/…, eigene Daten
  unter /api/v1/me/… (A1)
- Felder = Spalten (englisch, snake_case), Werte englisch, dazu <feld>_label; Hülle data/meta/links (A2)
- Cursor-Listen (cursor, limit) (A5); Fehler als Problem mit code und errors (A6); ETag/If-Match, lock_version (B2)
- Scopes <modul>:<ressource>.<read|write|delete|admin>, x-eduksx-ability, x-eduksx-data-classes, x-eduksx-purpose (C2, C4)
- deutsche Begriffe: title und description je Schema, Feld und Parameter; x-eduksx-labels je Aufzählung (A8)
"""
from __future__ import annotations

import re

from . import modell

API_STANDARD = "1.2"
KLASSE_EN = modell.DATENKLASSEN
NUR_LESEN = {"id", "created_at", "created_by_id", "updated_at", "updated_by_id", "lock_version"}
NICHT_IN_API = {"organization_id", "deleted_at", "deleted_by_id"}
BEISPIEL_UUID = "01937c6e-8f2a-7b3c-9d4e-5f6a7b8c9d0e"


def kebab(name: str) -> str:
    return name.replace("_", "-")


# ---------------------------------------------------------------------------------------------------- Typen

def typ_spalte(s: modell.Spalte) -> dict:
    t = s.typ
    if t.endswith("[]"):
        innen = typ_spalte(modell.Spalte(s.name, t[:-2]))
        return {"type": "array", "items": innen}
    if t == "uuid":
        d = {"type": "string", "format": "uuid"}
    elif t in ("integer", "smallint"):
        d = {"type": "integer", "format": "int32"}
    elif t in ("bigint", "bigserial"):
        d = {"type": "integer", "format": "int64"}
    elif t.startswith("numeric"):
        d = {"type": "string", "format": "decimal", "pattern": r"^-?\d+(\.\d{1,4})?$"}
    elif t == "boolean":
        d = {"type": "boolean"}
    elif t == "date":
        d = {"type": "string", "format": "date"}
    elif t == "timestamptz":
        d = {"type": "string", "format": "date-time"}
    elif t == "time":
        d = {"type": "string", "pattern": "^[0-2][0-9]:[0-5][0-9]$"}
    elif t == "jsonb":
        d = {"type": "object", "additionalProperties": True}
    else:
        d = {"type": "string"}
    if s.werte:
        d["x-extensible-enum"] = list(s.werte)
        d["x-eduksx-labels"] = {w: s.labels.get(w, "") for w in s.werte}
    return d


def beispiel(d: dict, name: str = ""):
    if "x-extensible-enum" in d:
        return d["x-extensible-enum"][0]
    t = d.get("type")
    t = t[0] if isinstance(t, list) else t
    f = d.get("format")
    if t == "array":
        return [beispiel(d["items"], name)]
    if t == "object":
        return {}
    if t == "boolean":
        return False
    if t == "integer":
        return 1
    if f == "uuid":
        return BEISPIEL_UUID
    if f == "decimal":
        return "1.5"
    if f == "date":
        return "2027-08-23"
    if f == "date-time":
        return "2027-08-23T07:30:00Z"
    if f == "email":
        return "lea.muster@sekmuster.example"
    if f == "uri":
        return "https://example.org/dokument.pdf"
    if "pattern" in d and "[0-2]" in d["pattern"]:
        return "11:45"
    return "Beispiel"


def nullbar(d: dict) -> dict:
    if "$ref" in d:
        return {"oneOf": [d, {"type": "null"}]}
    d = dict(d)
    d["type"] = [d["type"], "null"]
    return d


def feld_manuell(spec: tuple) -> dict:
    """(typ, Begriff, Herkunft/Verwendung) für berechnete und Aktions-Schemas. Typ mit «?» = darf leer sein, «!» = nur lesen."""
    typ, titel, text = spec
    nur_lesen = typ.endswith("!")
    typ = typ.rstrip("!")
    leer = typ.endswith("?")
    typ = typ.rstrip("?")
    if typ.startswith("list:"):
        d = {"type": "array", "items": feld_manuell((typ[5:], titel, text))}
        d["items"].pop("title", None)
        d["items"].pop("description", None)
    elif typ.startswith("ref:"):
        d = {"$ref": f"#/components/schemas/{typ[4:]}"}
    elif typ.startswith("enum:"):
        paare = [p.split("=", 1) for p in typ[5:].split(";")]
        d = {"type": "string", "x-extensible-enum": [p[0] for p in paare], "x-eduksx-labels": {p[0]: p[1] for p in paare}}
    else:
        d = typ_spalte(modell.Spalte("x", {"uuid": "uuid", "text": "text", "int": "integer", "decimal": "numeric", "date": "date",
                                           "datetime": "timestamptz", "bool": "boolean", "object": "jsonb", "time": "time"}.get(typ, "text")))
        if typ == "url":
            d = {"type": "string", "format": "uri"}
        elif typ == "email":
            d = {"type": "string", "format": "email"}
    if leer:
        d = nullbar(d)
    if "$ref" in d or "oneOf" in d:
        return {"allOf": [d], "title": titel, "description": text} if "$ref" in d else {**d, "title": titel, "description": text}
    d["title"] = titel
    d["description"] = text
    if nur_lesen:
        d["readOnly"] = True
    return d


# ---------------------------------------------------------------------------------------------------- Schemas aus Tabellen

def schema_tabelle(t: modell.Tabelle, r: dict) -> dict:
    props, pflicht = {}, []
    for s in t.spalten:
        if s.name in NICHT_IN_API or s.name in r.get("ohne", ()):
            continue
        d = typ_spalte(s)
        if not s.pflicht and s.schluessel != "PK":
            d = nullbar(d)
        d["title"] = s.begriff
        d["description"] = s.herkunft or t.herkunft
        if s.name in NUR_LESEN or s.name in r.get("nur_lesen", ()):
            d["readOnly"] = True
        d["x-eduksx-data-class"] = KLASSE_EN[s.datenklasse]
        props[s.name] = d
        if s.werte:
            props[f"{s.name}_label"] = {"type": "string", "readOnly": True, "title": f"{s.begriff} (Text)",
                                        "description": f"deutsches Label zu «{s.name}» in der gewählten Sprache"}
        if s.pflicht and not s.vorgabe and s.name not in NUR_LESEN and s.name not in r.get("nur_lesen", ()):
            pflicht.append(s.name)
    for name, spec in r.get("berechnet", {}).items():
        d = feld_manuell(spec)
        d["readOnly"] = True
        props[name] = d
    for name, spec in r.get("eingebettet", {}).items():
        props[name] = feld_manuell(spec)
    out = {"type": "object", "title": r["einzahl"], "description": f"{t.text}. {t.herkunft}".strip(), "properties": props}
    if pflicht:
        out["required"] = pflicht
    return out


def schema_manuell(name: str, spec: dict) -> dict:
    props = {k: feld_manuell(v) for k, v in spec["felder"].items()}
    out = {"type": "object", "title": spec["title"], "description": spec["description"], "properties": props}
    if spec.get("pflicht"):
        out["required"] = spec["pflicht"]
    return out


def beispiel_objekt(schema: dict, komponenten: dict) -> dict:
    out = {}
    for k, d in schema.get("properties", {}).items():
        if d.get("readOnly"):
            continue
        if "$ref" in d or "allOf" in d:
            continue
        if "oneOf" in d:
            d = d["oneOf"][0]
            if "$ref" in d:
                continue
        out[k] = beispiel(d, k)
    return out


# ---------------------------------------------------------------------------------------------------- Bausteine

def json_inhalt(schema: dict, beispiel_wert=None) -> dict:
    inhalt = {"schema": schema}
    if beispiel_wert is not None:
        inhalt["example"] = beispiel_wert
    return {"application/json": inhalt}


def ref(name: str) -> dict:
    return {"$ref": f"#/components/schemas/{name}"}


def einzeln(name: str) -> dict:
    return {"type": "object", "properties": {"data": ref(name)}, "required": ["data"]}


def liste(name: str) -> dict:
    return {"type": "object", "properties": {"data": {"type": "array", "items": ref(name)}, "meta": ref("ListMeta"), "links": ref("Links")},
            "required": ["data", "meta"]}


FEHLER = {"400": "BadRequest", "401": "Unauthenticated", "403": "Forbidden", "404": "NotFound", "409": "Conflict",
          "412": "PreconditionFailed", "422": "ValidationFailed", "428": "PreconditionRequired"}


def fehler(*codes) -> dict:
    return {c: {"$ref": f"#/components/responses/{FEHLER[c]}"} for c in codes}


def gemeinsam() -> dict:
    problem = {
        "type": "object", "title": "Fehler", "description": "Fehler nach RFC 9457 (application/problem+json); title und detail in der gewählten Sprache.",
        "properties": {
            "type": {"type": "string", "format": "uri", "title": "Typ", "description": "https://docs.eduksx.ch/problems/<code>"},
            "title": {"type": "string", "title": "Titel", "description": "kurze Beschreibung für Menschen"},
            "status": {"type": "integer", "format": "int32", "title": "Status", "description": "HTTP-Statuscode"},
            "detail": {"type": "string", "title": "Einzelheiten", "description": "Erklärung für Menschen"},
            "code": {"type": "string", "title": "Fehlerschlüssel", "description": "stabiler englischer Schlüssel, Teil des Vertrags"},
            "instance": {"type": "string", "title": "Pfad", "description": "betroffene Ressource"},
            "request_id": {"type": "string", "title": "Anfrage-ID", "description": "für den Support"},
            "errors": {"type": "object", "title": "Fehler je Feld", "description": "Feldname → Meldungen", "additionalProperties": {"type": "array", "items": {"type": "string"}}},
        },
        "required": ["type", "title", "status", "code"],
    }
    meta = {"type": "object", "title": "Listenangaben", "description": "Cursor für die nächste Seite",
            "properties": {"next_cursor": {"type": ["string", "null"], "title": "Nächster Cursor", "description": "undurchsichtig; leer am Ende"},
                           "has_more": {"type": "boolean", "title": "Weitere vorhanden", "description": "true, wenn es weitere Einträge gibt"},
                           "limit": {"type": "integer", "format": "int32", "title": "Anzahl", "description": "Einträge je Abruf"}},
            "required": ["has_more"]}
    links = {"type": "object", "title": "Verweise", "description": "Navigation in Listen",
             "properties": {"self": {"type": "string", "title": "Diese Seite", "description": "Adresse dieser Seite"},
                            "next": {"type": ["string", "null"], "title": "Nächste Seite", "description": "Adresse der nächsten Seite"}}}
    pjson = {"application/problem+json": {"schema": ref("Problem")}}
    antworten = {
        "BadRequest": "Anfrage nicht lesbar.", "Unauthenticated": "Nicht angemeldet oder Token ungültig.",
        "Forbidden": "Kein Recht bzw. Scope.", "NotFound": "Gibt es nicht oder darf nicht gesehen werden.",
        "Conflict": "Konflikt mit dem Zustand (z. B. lock_version veraltet).", "PreconditionFailed": "If-Match passt nicht.",
        "ValidationFailed": "Inhaltlich ungültig (Validierung, unbekannte Felder).", "PreconditionRequired": "If-Match fehlt.",
    }
    params = {
        "Id": {"name": "id", "in": "path", "required": True, "description": "UUID v7 des Objekts", "schema": {"type": "string", "format": "uuid", "title": "ID"}, "example": BEISPIEL_UUID},
        "Cursor": {"name": "cursor", "in": "query", "description": "aus meta.next_cursor der vorherigen Antwort", "schema": {"type": "string", "title": "Cursor"}, "example": "eyJpZCI6IjAxOTMifQ"},
        "Limit": {"name": "limit", "in": "query", "description": "Einträge je Abruf, Vorgabe 50, höchstens 200", "schema": {"type": "integer", "format": "int32", "minimum": 1, "maximum": 200, "default": 50, "title": "Anzahl"}, "example": 50},
        "Sort": {"name": "sort", "in": "query", "description": "Feldnamen, Minus = absteigend", "schema": {"type": "string", "title": "Sortierung"}, "example": "-updated_at"},
        "IfMatch": {"name": "If-Match", "in": "header", "required": True, "description": "ETag des gelesenen Stands", "schema": {"type": "string", "title": "ETag"}, "example": f'"{BEISPIEL_UUID}.3"'},
        "Organization": {"name": "EduKSX-Organization", "in": "header", "required": False, "description": "gewählte Organisation, nur bei mehreren Mitgliedschaften", "schema": {"type": "string", "format": "uuid", "title": "Organisation"}, "example": BEISPIEL_UUID},
    }
    return {
        "schemas": {"Problem": problem, "ListMeta": meta, "Links": links},
        "responses": {k: {"description": v, "content": pjson} for k, v in antworten.items()},
        "parameters": params,
    }


# ---------------------------------------------------------------------------------------------------- Erzeugen

def erzeugen(modul: str, d: dict, tabellen: list[modell.Tabelle]) -> dict:
    tab = {t.name: t for t in tabellen}
    teile = gemeinsam()
    schemas, paths, scopes = teile["schemas"], {}, {}
    etag = {"ETag": {"description": "Stand des Objekts: \"<id>.<lock_version>\"", "schema": {"type": "string"}}}

    def sicherheit(ressource: str, aktion: str) -> list:
        scope = f"{modul}:{ressource}.{aktion}"
        scopes.setdefault(scope, f"{d['tags'].get(ressource, ressource)} – {dict(read='lesen', write='schreiben', delete='löschen', admin='verwalten')[aktion]}")
        return [{"eduksx_ident": [scope]}]

    for r in d["ressourcen"]:
        t = tab[r["tabelle"]]
        name = r["schema"]
        schemas[name] = schema_tabelle(t, r)
        ressource = r["pfad"].rstrip("/").split("/")[-1]
        tag = r.get("tag", ressource)
        klassen = sorted({KLASSE_EN[s.datenklasse] for s in t.spalten if s.name not in NICHT_IN_API})
        zweck = r.get("zweck", t.herkunft)
        ops = r.get("ops", "lcrud")
        basis = {"tags": [tag], "x-eduksx-data-classes": klassen, "x-eduksx-purpose": zweck}
        bsp = beispiel_objekt(schemas[name], schemas)
        if "l" in ops or "c" in ops:
            paths.setdefault(r["pfad"], {"parameters": [{"$ref": "#/components/parameters/Organization"}]} if "/org/" in r["pfad"] else {})
        if "l" in ops:
            params = [{"$ref": "#/components/parameters/Cursor"}, {"$ref": "#/components/parameters/Limit"}, {"$ref": "#/components/parameters/Sort"}]
            for f in r.get("filter", []):
                s = t.spalte(f)
                if s:
                    sch = typ_spalte(s)
                    sch["title"] = s.begriff
                    params.append({"name": f, "in": "query", "required": False, "description": s.herkunft or f"Filter nach {s.begriff}", "schema": sch, "example": beispiel(sch, f)})
                else:  # freier Filter (q …)
                    params.append({"name": f, "in": "query", "required": False, "description": "Volltext in der normalisierten Suchspalte", "schema": {"type": "string", "title": "Suche"}, "example": "Muster"})
            paths[r["pfad"]]["get"] = {**basis, "operationId": f"list{r['op_mehrzahl']}",
                                       "summary": f"{r['mehrzahl']} auflisten", "description": f"Liste der {r['mehrzahl']} (Cursor). {zweck}",
                                       "security": sicherheit(ressource, "read"), "x-eduksx-ability": f"{ressource}.read", "parameters": params,
                                       "responses": {"200": {"description": f"{r['mehrzahl']}", "content": json_inhalt(liste(name))}, **fehler("401", "403", "422")}}
        if "c" in ops:
            paths[r["pfad"]]["post"] = {**basis, "operationId": f"create{r['op']}", "summary": f"{r['einzahl']} anlegen",
                                        "description": f"Legt {r.get('artikel', 'ein')} {r['einzahl']} an.",
                                        "security": sicherheit(ressource, "write"), "x-eduksx-ability": f"{ressource}.write",
                                        "requestBody": {"required": True, "content": json_inhalt(ref(name), bsp)},
                                        "responses": {"201": {"description": "Angelegt", "headers": etag, "content": json_inhalt(einzeln(name))}, **fehler("400", "401", "403", "409", "422")}}
        pid = r["pfad"] + "/{id}"
        if any(x in ops for x in "rud"):
            paths.setdefault(pid, {"parameters": [{"$ref": "#/components/parameters/Id"}] + ([{"$ref": "#/components/parameters/Organization"}] if "/org/" in r["pfad"] else [])})
        if "r" in ops:
            paths[pid]["get"] = {**basis, "operationId": f"get{r['op']}", "summary": f"{r['einzahl']} lesen", "description": f"{r['einzahl']} mit allen Feldern der Positivliste.",
                                 "security": sicherheit(ressource, "read"), "x-eduksx-ability": f"{ressource}.read",
                                 "responses": {"200": {"description": r["einzahl"], "headers": etag, "content": json_inhalt(einzeln(name))}, **fehler("401", "403", "404")}}
        if "u" in ops:
            paths[pid]["patch"] = {**basis, "operationId": f"update{r['op']}", "summary": f"{r['einzahl']} ändern", "description": "JSON Merge Patch; fehlendes Feld = unverändert.",
                                   "security": sicherheit(ressource, "write"), "x-eduksx-ability": f"{ressource}.write",
                                   "parameters": [{"$ref": "#/components/parameters/IfMatch"}],
                                   "requestBody": {"required": True, "content": {"application/merge-patch+json": {"schema": ref(name), "example": dict(list(bsp.items())[:2])}}},
                                   "responses": {"200": {"description": "Geändert", "headers": etag, "content": json_inhalt(einzeln(name))}, **fehler("401", "403", "404", "409", "412", "422", "428")}}
        if "d" in ops:
            paths[pid]["delete"] = {**basis, "operationId": f"delete{r['op']}", "summary": f"{r['einzahl']} löschen",
                                    "description": r.get("loeschtext", "In den Papierkorb (wiederherstellbar während der Frist)."),
                                    "security": sicherheit(ressource, "delete"), "x-eduksx-ability": f"{ressource}.delete",
                                    "parameters": [{"$ref": "#/components/parameters/IfMatch"}],
                                    "responses": {"204": {"description": "Gelöscht"}, **fehler("401", "403", "404", "409", "412", "428")}}

    for name, spec in d.get("schemas", {}).items():
        schemas[name] = schema_manuell(name, spec)

    for a in d.get("aktionen", []):
        p = a["pfad"]
        eintrag = paths.setdefault(p, {})
        pp = []
        if "{id}" in p:
            pp.append({"$ref": "#/components/parameters/Id"})
        for x in re.findall(r"\{(\w+)\}", p):
            if x != "id":
                titel, text, bsp = a["pfadparam"][x]
                pp.append({"name": x, "in": "path", "required": True, "description": text, "schema": {"type": "string", "title": titel}, "example": bsp})
        if "/org/" in p:
            pp.append({"$ref": "#/components/parameters/Organization"})
        if pp and "parameters" not in eintrag:
            eintrag["parameters"] = pp
        methode = a.get("methode", "post")
        ressource = a.get("ressource") or [x for x in p.split("/") if x and not x.startswith("{")][3 if "/org/" in p or "/me/" in p else 2]
        aktion = a.get("recht", "read" if methode == "get" else "write")
        op = {"tags": [a.get("tag", ressource)], "operationId": a["op"], "summary": a["summary"], "description": a.get("beschreibung", a["summary"] + "."),
              "security": sicherheit(ressource, aktion), "x-eduksx-ability": f"{ressource}.{a.get('ability', aktion)}",
              "x-eduksx-data-classes": a.get("klassen", ["internal"]), "x-eduksx-purpose": a.get("zweck", a["summary"])}
        params = []
        for q in a.get("query", []):
            qn, qt, qtitel, qtext = q
            sch = feld_manuell((qt, qtitel, qtext))
            params.append({"name": qn, "in": "query", "required": False, "description": qtext, "schema": {k: v for k, v in sch.items() if k != "description"}, "example": beispiel(sch, qn)})
        if a.get("ifmatch"):
            params.append({"$ref": "#/components/parameters/IfMatch"})
        if params:
            op["parameters"] = params
        body = a.get("body")
        if body == "datei":
            felder = {k: feld_manuell(v) for k, v in a.get("formfelder", {}).items()}
            op["requestBody"] = {"required": True, "content": {"multipart/form-data": {"schema": {
                "type": "object", "title": "Datei", "description": "Datei mit Angaben",
                "properties": {"file": {"type": "string", "contentMediaType": "application/octet-stream", "title": "Datei", "description": "hochzuladende Datei"}, **felder},
                "required": ["file"]}}}}
        elif body:
            op["requestBody"] = {"required": True, "content": json_inhalt(ref(body), beispiel_objekt(schemas[body], schemas))}
        antwort, code = a.get("antwort"), a.get("code", "200")
        if antwort is None:
            resp = {"description": a.get("antworttext", "Ausgeführt")}
        elif antwort.startswith("datei:"):
            mime = antwort[6:]
            resp = {"description": a.get("antworttext", "Datei"), "content": {mime: {"schema": {"type": "string", "contentMediaType": mime}}}}
        elif antwort.startswith("liste:"):
            resp = {"description": a.get("antworttext", "Liste"), "content": json_inhalt(liste(antwort[6:]))}
        else:
            resp = {"description": a.get("antworttext", "Ergebnis"), "content": json_inhalt(einzeln(antwort))}
        op["responses"] = {code: resp, **fehler(*a.get("fehler", ("401", "403", "404", "409", "422")))}
        eintrag[methode] = op

    webhooks = {}
    for ev, spec in d.get("ereignisse", {}).items():
        webhooks[ev] = {"post": {"summary": spec[1], "description": f"Ereignis «{ev}» an Abonnenten (B7).",
                                 "requestBody": {"content": json_inhalt(ref(spec[0]))}, "responses": {"204": {"description": "Empfangen"}}}}

    api = {
        "openapi": "3.1.0",
        "info": {
            "title": d["titel"], "version": "0.1.0", "description": d["beschreibung"],
            "x-eduksx-module": modul, "x-eduksx-api-standard": API_STANDARD,
            "license": {"name": "Entwurf – Lizenz des Modul-Repositorys", "identifier": "LicenseRef-EduKSX-Entwurf"},
        },
        "servers": [{"url": "https://{instanz}.eduksx.ch", "description": "eigener Host je Modul bzw. Instanz",
                     "variables": {"instanz": {"default": modul, "description": "Host des Moduls"}}}],
        "tags": [{"name": k, "x-displayName": v, "description": v} for k, v in d["tags"].items()],
        "paths": paths,
        "components": {
            "securitySchemes": {"eduksx_ident": {"type": "oauth2", "description": "Anmeldung über EduKSX-Ident (OpenID Connect)",
                                                 "flows": {"authorizationCode": {"authorizationUrl": "https://ident.eduksx.ch/oauth2/authorize",
                                                                                 "tokenUrl": "https://ident.eduksx.ch/oauth2/token", "scopes": scopes},
                                                           "clientCredentials": {"tokenUrl": "https://ident.eduksx.ch/oauth2/token", "scopes": scopes}}}},
            "parameters": teile["parameters"], "responses": teile["responses"], "schemas": schemas,
        },
    }
    if webhooks:
        api["webhooks"] = webhooks
    return api


def maengel(api: dict) -> list[str]:
    """Prüfung nach API A8: title/description je Schema, Feld, Parameter; x-eduksx-labels je Aufzählung."""
    fehler_liste = []

    def feld(pfad: str, d: dict, eigenschaft: bool = True):
        if eigenschaft and not d.get("title"):
            fehler_liste.append(f"{pfad}: title fehlt")
        if eigenschaft and not d.get("description"):
            fehler_liste.append(f"{pfad}: description fehlt")
        werte = d.get("x-extensible-enum") or d.get("enum")
        if werte:
            labels = d.get("x-eduksx-labels", {})
            for w in werte:
                if w is not None and not labels.get(w):
                    fehler_liste.append(f"{pfad}: Label für {w!r} fehlt")
        for k, v in d.get("properties", {}).items():
            feld(f"{pfad}.{k}", v)
        if isinstance(d.get("items"), dict):
            feld(f"{pfad}[]", d["items"], eigenschaft=False)
        for o in d.get("oneOf", []) + d.get("allOf", []):
            feld(pfad, o, eigenschaft=False)

    for n, s in api["components"]["schemas"].items():
        feld(f"schema {n}", s)
    for p, eintrag in api["paths"].items():
        for m, op in eintrag.items():
            if m == "parameters":
                continue
            if not op.get("summary") or not op.get("description"):
                fehler_liste.append(f"{m.upper()} {p}: summary/description fehlt")
            for prm in op.get("parameters", []) + eintrag.get("parameters", []):
                if "$ref" in prm:
                    continue
                if not prm.get("description") or not prm.get("schema", {}).get("title"):
                    fehler_liste.append(f"{m.upper()} {p} Parameter {prm['name']}: Begriff/Beschreibung fehlt")
                if "example" not in prm:
                    fehler_liste.append(f"{m.upper()} {p} Parameter {prm['name']}: example fehlt")
            if not re.fullmatch(r"[a-z][A-Za-z0-9]*", op.get("operationId", "")):
                fehler_liste.append(f"{m.upper()} {p}: operationId nicht camelCase")
    ids = [op["operationId"] for e in api["paths"].values() for m, op in e.items() if m != "parameters"]
    for x in {i for i in ids if ids.count(i) > 1}:
        fehler_liste.append(f"operationId doppelt: {x}")
    for p in api["paths"]:
        if not re.fullmatch(r"/api/v1(/[a-z0-9-]+|/\{[a-z_]+\})+", p):
            fehler_liste.append(f"Pfad nicht nach A1: {p}")
    return fehler_liste
