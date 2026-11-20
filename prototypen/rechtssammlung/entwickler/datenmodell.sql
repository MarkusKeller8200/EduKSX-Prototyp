-- EduKSX-Codex – Datenmodell (Entwurf), direkt ausführbar (inkl. Standardtabellen)
-- Quelle: docs/umsetzung/codex/datenbank.sql

-- EduKSX-Codex – Datenbankstruktur (systematische Rechtssammlung)
-- Stand 2026-11-20 · Status ENTWURF · DB-Standard 1.3 · Grundlage: Prototyp prototypen/rechtssammlung
-- Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert. Erzeugte Blöcke (>>> … <<<) nicht von Hand
-- ändern: python3 tools/umsetzung_bauen.py
--
-- Erlasse, Verzeichnis, Hierarchien und Pflichtkatalog sind öffentlich und für alle gleich: Geltungsbereich «global»
-- (keine organization_id, Änderungen nur über die Redaktion). Welche Organisation eine Sammlung pflegt, steht als
-- Plattform-ID in publishers.owner_platform_id.
-- Kern: publishers (Herausgeber) › sections (Rubriken) › legal_acts (Erlasse) › act_versions (Fassungen mit Datei/Text).

CREATE SCHEMA IF NOT EXISTS codex;
SET search_path TO codex;

-- >>> standardtabellen
-- Platzhalter für die Standardtabellen aus eduksx/core (Quelle: docs/umsetzung/standardtabellen.sql)

-- Organisation (Schulgemeinde, Schule, Verwaltung); Stammdaten führt EduKSX-Ident
-- Geltungsbereich: global · Datenklasse: intern
-- Herkunft/Verwendung: aus EduKSX-Ident (Plattform-ID); Mandant aller Daten des Moduls
CREATE TABLE organizations (
    id                  uuid PRIMARY KEY,
    platform_id         uuid UNIQUE,                                    -- Plattform-ID | ID der Organisation in EduKSX-Ident
    parent_id           uuid REFERENCES organizations(id),              -- Übergeordnete Organisation | Schule gehört zur Schulgemeinde
    organization_type   text NOT NULL CHECK (organization_type IN ('school_community','school','school_unit','administration','day_care','authority','external')),   -- Art | aus EduKSX-Ident | intern | school_community=Schulgemeinde; school=Schule; school_unit=Schuleinheit; administration=Verwaltung; day_care=Tagesstruktur; authority=Behörde; external=extern
    name                text NOT NULL,                                  -- Name | aus EduKSX-Ident | öffentlich
    short_name          text,                                           -- Kurzname | aus EduKSX-Ident | öffentlich
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1
);

-- Personenreferenz: Person mit oder ohne Anmeldung (Mitarbeitende, Behördenmitglieder, Externe)
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: aus EduKSX-Ident bzw. EduKSX-Connect; das Modul hält nur, was es braucht
CREATE TABLE users (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    platform_id         uuid UNIQUE,                                    -- Plattform-ID | ID der Person in EduKSX-Ident | intern
    issuer              text,                                           -- Aussteller | Anmeldung über EduKSX-Ident (OIDC «iss») | intern
    subject             text,                                           -- Subjekt | Anmeldung über EduKSX-Ident (OIDC «sub») | intern
    display_name        text NOT NULL,                                  -- Name | Anzeige in allen Listen
    short_name          text,                                           -- Kürzel | z. B. «LMu» in Stundenplan und Matrix
    email               text,                                           -- E-Mail | Benachrichtigungen, Signaturanfragen
    locale              text NOT NULL DEFAULT 'de' CHECK (locale IN ('de','fr','it','en')),   -- Sprache | Anzeige und Mitteilungen | intern | de=Deutsch; fr=Französisch; it=Italienisch; en=Englisch
    is_external         boolean NOT NULL DEFAULT false,                 -- Extern | Person ohne Anstellung (z. B. Unterzeichnende) | intern
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (issuer, subject)
);

-- Schuljahr mit Semester- und Trimestergrenzen
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Plattform-Stammdaten, gepflegt in «Schuljahre»; steuert Fristen, Kalenderregeln und Pensen
CREATE TABLE school_years (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    name                text NOT NULL,                                  -- Schuljahr | z. B. «2026/27»
    starts_on           date NOT NULL,                                  -- Schuljahresbeginn | erster Schultag
    ends_on             date NOT NULL,                                  -- Schuljahresende | letzter Schultag
    changeover_on       date,                                           -- Schuljahreswechsel | Stichtag für Abläufe und Pensen
    first_semester_ends_on date,                                        -- Semesterende (1. Semester) | Kalenderregeln
    second_semester_starts_on date,                                     -- Semesterwechsel | Beginn 2. Semester
    second_trimester_starts_on date,                                    -- Beginn 2. Trimester | nur der Vollständigkeit halber
    third_trimester_starts_on date,                                     -- Beginn 3. Trimester | nur der Vollständigkeit halber
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, name),
    CHECK (ends_on > starts_on)
);

-- Ferien, Feiertage und schulfreie Tage eines Schuljahrs
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Ferienplan der Schulgemeinde; für Schultage, Kalender und Sollzeit
CREATE TABLE school_holidays (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    school_year_id      uuid NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,   -- Schuljahr | Verweis auf das Schuljahr
    name                text NOT NULL,                                  -- Bezeichnung | z. B. «Herbstferien»
    holiday_type        text NOT NULL DEFAULT 'holidays' CHECK (holiday_type IN ('holidays','public_holiday','bridge_day','training_day','day_off')),   -- Art | Ferienplan | öffentlich | holidays=Ferien; public_holiday=Feiertag; bridge_day=Brückentag; training_day=Weiterbildung; day_off=schulfrei
    valid_from          date NOT NULL,                                  -- Von | erster freier Tag
    valid_until         date NOT NULL,                                  -- Bis | letzter freier Tag
    CHECK (valid_until >= valid_from)
);

-- Änderungshistorie aller Tabellen
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: geschrieben von der Service-Schicht in derselben Transaktion; Nachweis wer, wann, was
CREATE TABLE data_changes (
    id                  bigserial PRIMARY KEY,
    event_id            uuid NOT NULL UNIQUE,
    subject_type        text NOT NULL,                                  -- Tabelle | betroffene Tabelle
    subject_id          uuid NOT NULL,                                  -- Datensatz | ID des Datensatzes (ohne Constraint)
    organization_id     uuid,                                           -- Organisation | leer bei globalen Daten (ohne Constraint)
    action              text NOT NULL CHECK (action IN ('created','updated','deleted','restored')),   -- Aktion | Art der Änderung | intern | created=angelegt; updated=geändert; deleted=gelöscht; restored=wiederhergestellt
    changes             jsonb NOT NULL DEFAULT '{}'::jsonb,             -- Änderungen | Feld → alt/neu nach Datenklasse
    actor_type          text NOT NULL CHECK (actor_type IN ('user','service_account','system')),   -- Auslöser (Art) | wer | intern | user=Person; service_account=Servicekonto; system=System
    actor_id            uuid,                                           -- Auslöser | ID (ohne Constraint)
    actor_label         text,                                           -- Auslöser (Text) | lesbar nach Pseudonymisierung | personenbezogen
    source              text NOT NULL CHECK (source IN ('web','api','import','mcp','job','system','migration')),   -- Quelle | woher die Änderung kam | intern | web=Oberfläche; api=API; import=Import; mcp=MCP; job=Auftrag; system=System; migration=Migration
    transaction_id      uuid NOT NULL,                                  -- Transaktion | gemeinsame Kennung einer Transaktion
    request_id          text,                                           -- Anfrage | Anfrage-ID aus dem Protokoll
    schema_version      text NOT NULL,                                  -- Schemastand | um alte Einträge richtig zu lesen
    occurred_at         timestamptz NOT NULL DEFAULT now()              -- Zeitpunkt | wann (UTC)
);
-- <<< standardtabellen

-- ------------------------------------------------------------------ Gemeindeverzeichnis (Kanton Zürich)

-- Politische Gemeinde
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Verzeichnis der Gemeinden des Gemeindeamts, BFS-Gebietsstammdaten; Menü «Bezirk › Gemeinden»
CREATE TABLE municipalities (
    id                      uuid PRIMARY KEY,
    bfs_number              integer UNIQUE,                  -- BFS-Nummer | Gebietsstammdaten des BFS
    name                    text NOT NULL,                   -- Gemeinde | Name
    district                text NOT NULL,                   -- Bezirk | Gliederung im Menü
    municipality_type       text NOT NULL DEFAULT 'political' CHECK (municipality_type IN ('political')),   -- Art | heute nur politische Gemeinden | öffentlich | political=Politische Gemeinde
    is_unified_municipality boolean,                         -- Einheitsgemeinde | Vermerk «EG»
    is_unified_confirmed    boolean NOT NULL DEFAULT false,  -- Einheitsgemeinde gesichert | sonst «EG ?»
    website_url             text,                            -- Website | aus der Verwaltungs-E-Mail
    website_source          text,                            -- Herkunft der Website | Beleg
    cms                     text,                            -- CMS | erkanntes System der Website (intern) | intern
    legal_collection_url    text,                            -- Rechtssammlung (Adresse) | Einstieg auf der Website
    capture_status          text NOT NULL DEFAULT 'open' CHECK (capture_status IN ('open','captured','verified')),   -- Erfassung | Stand der Evaluation | intern | open=offen; captured=erfasst; verified=geprüft
    primary_school_provider text,                            -- Schulträger Primar | Schulgemeinde bzw. Einheitsgemeinde
    secondary_school_provider text,                          -- Schulträger Sek | Schulgemeinde bzw. Einheitsgemeinde
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1
);

-- Schulgemeinde (Volks-, Primar-, Sekundarschulgemeinde)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Verzeichnis der Gemeinden des Gemeindeamts; Menü «Schulgemeinden»
CREATE TABLE school_communities (
    id                      uuid PRIMARY KEY,
    community_type          text NOT NULL CHECK (community_type IN ('unified_school','primary_school','secondary_school','association')),   -- Art | Typ der Schulgemeinde | öffentlich | unified_school=Volksschulgemeinde; primary_school=Primarschulgemeinde; secondary_school=Sekundarschulgemeinde; association=Zweckverband
    name                    text NOT NULL UNIQUE,            -- Schulgemeinde | Name
    short_name              text,                            -- Kurzname | Anzeige
    district                text NOT NULL,                   -- Bezirk | Gliederung im Menü
    seat                    text,                            -- Sitz | Sitzgemeinde
    is_membership_confirmed boolean NOT NULL DEFAULT false,  -- Mitglieder gesichert | sonst «?»
    source                  text,                            -- Quelle | z. B. «Verzeichnis der Gemeinden, Stand 1.7.2026»
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1
);

-- Mitgliedgemeinde einer Schulgemeinde
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Verzeichnis der Gemeinden; Zuordnung Gemeinde ↔ Schulgemeinde
CREATE TABLE school_community_members (
    school_community_id     uuid NOT NULL REFERENCES school_communities(id) ON DELETE CASCADE,   -- Schulgemeinde | Verweis
    municipality_id         uuid NOT NULL REFERENCES municipalities(id),   -- Gemeinde | Verweis
    is_confirmed            boolean NOT NULL DEFAULT true,   -- Gesichert | Zugehörigkeit belegt
    PRIMARY KEY (school_community_id, municipality_id)
);

-- ------------------------------------------------------------------ Herausgeber und Rechtssammlung

-- Herausgeber mit eigener Rechtssammlung (Bund, Kanton, Bildungsrat, Gemeinde, Schulgemeinde)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Erfassung in der Evaluation bzw. Redaktion; Steckbrief einer Organisation
CREATE TABLE publishers (
    id                      uuid PRIMARY KEY,
    owner_platform_id       uuid,                            -- Gepflegt von | Plattform-ID der Organisation mit eigener Redaktion | intern
    publisher_key           text NOT NULL UNIQUE,            -- Schlüssel | z. B. «ps-truellikon», «kanton-zh»
    level                   text NOT NULL CHECK (level IN ('federal','intercantonal','cantonal','education_council','municipal')),   -- Ebene | Normenhierarchie | öffentlich | federal=Bund; intercantonal=Interkantonal; cantonal=Kanton; education_council=Bildungsrat; municipal=Gemeinde
    publisher_type          text NOT NULL,                   -- Art | z. B. «Primarschulgemeinde»
    name                    text NOT NULL,                   -- Herausgeber | Name
    short_name              text,                            -- Kurzname | Anzeige
    district                text,                            -- Bezirk | Gliederung
    municipality_id         uuid REFERENCES municipalities(id),       -- Gemeinde | Verweis
    school_community_id     uuid REFERENCES school_communities(id),   -- Schulgemeinde | Verweis
    seat                    text,                            -- Sitz | Ort
    website_url             text,                            -- Website | Adresse
    legal_collection_url    text,                            -- Rechtssammlung (Adresse) | Einstieg auf der Website
    menu_path               text[] NOT NULL DEFAULT '{}',    -- Menüpfad | Weg auf der Website, Evaluation
    other_entries           text[] NOT NULL DEFAULT '{}',    -- Weitere Einstiege | Evaluation
    structure_note          text,                            -- Gliederung | Beschreibung der Struktur
    numbering_note          text,                            -- Nummerierung | Beschreibung
    is_embeddable           boolean NOT NULL DEFAULT false,  -- Einbettbar | Website erlaubt iFrame
    has_pdf_preview         boolean NOT NULL DEFAULT false,  -- PDF-Vorschau | im Widget möglich
    appearance              jsonb,                           -- Darstellung | Schrift und Farben für den Nachbau, ohne Logo
    captured_on             date,                            -- Stand | Datum der Erfassung
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- Rubrik bzw. Sachgebiet einer Rechtssammlung (höchstens 9 Sachgebiete, Unterordner über parent_id)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Gliederung der Sammlung nach dem Leitfaden des Gemeindeamts; Menü «Rubriken», Widget
CREATE TABLE sections (
    id                      uuid PRIMARY KEY,
    publisher_id            uuid NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,   -- Herausgeber | Verweis
    parent_id               uuid REFERENCES sections(id) ON DELETE CASCADE,   -- Übergeordnete Rubrik | Unterordner
    number                  text,                            -- Nummer | z. B. «1.2»
    title                   text NOT NULL,                   -- Rubrik | Titel
    position                integer NOT NULL DEFAULT 0,      -- Reihenfolge | Anzeige
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1
);

-- Sachbereich des Rechtsgrundlagenverzeichnisses
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Verzeichnis «Rechtsgrundlagen Schule»
CREATE TABLE legal_areas (
    id                      uuid PRIMARY KEY,
    number                  integer NOT NULL UNIQUE,         -- Nummer | Reihenfolge
    title                   text NOT NULL                    -- Sachbereich | z. B. «Schulrecht, Unterricht und Schulbetrieb»
);

-- Thema der Normenhierarchien und des Elternwegweisers
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Redaktion EduKSX-Codex; Filter und Gruppen
CREATE TABLE topics (
    id                      uuid PRIMARY KEY,
    topic_key               text NOT NULL UNIQUE,            -- Schlüssel | z. B. «volksschule»
    title                   text NOT NULL,                   -- Thema | Anzeige
    topic_group             text,                            -- Gruppe | z. B. «Kinder und Eltern»
    position                integer NOT NULL DEFAULT 0       -- Reihenfolge | Anzeige
);

-- Erlass bzw. Dokument einer Rechtssammlung
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Website der Gemeinde, Fedlex, ZH-Lex oder Redaktion; Listen, Suche, Widget
CREATE TABLE legal_acts (
    id                      uuid PRIMARY KEY,
    publisher_id            uuid NOT NULL REFERENCES publishers(id),   -- Herausgeber | Verweis
    section_id              uuid REFERENCES sections(id) ON DELETE SET NULL,   -- Rubrik | Ablage in der Sammlung
    act_key                 text NOT NULL UNIQUE,            -- Schlüssel | stabil, z. B. «ls-412.100»
    title                   text NOT NULL,                   -- Titel | bereinigt
    original_title          text,                            -- Titel (Original) | wie auf der Website
    abbreviation            text,                            -- Abkürzung | z. B. «VSG»
    citation                text,                            -- Fundstelle | z. B. «LS 412.100», «SR 101»
    order_number            text,                            -- Ordnungsnummer | Systematik
    act_type                text NOT NULL DEFAULT 'unclear' CHECK (act_type IN ('constitution','statute','ordinance','municipal_act','authority_act','contract','zoning_plan','non_legislative','not_in_collection','unclear')),   -- Art | Einteilung nach dem Leitfaden | öffentlich | constitution=Verfassung; statute=Gesetz; ordinance=Verordnung; municipal_act=Gemeindeerlass; authority_act=Behördenerlass; contract=rechtsetzender Vertrag; zoning_plan=Raumplan; non_legislative=nicht rechtsetzend; not_in_collection=gehört nicht in die Sammlung; unclear=unklar
    source_class            char(1),                         -- Quellenklasse | A Rechtsnorm, B …
    issuer                  text,                            -- Erlassen von | z. B. «Kantonsrat»
    publication_place       text,                            -- Publikationsstelle | z. B. «ZH-Lex»
    bindingness             text,                            -- Verbindlichkeit | z. B. «rechtsverbindlich»
    has_full_text           boolean NOT NULL DEFAULT false,  -- Textfassung | Volltext vorhanden
    is_verified             boolean NOT NULL DEFAULT false,  -- Geprüft | von der Redaktion
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- Thema eines Erlasses
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Redaktion; Filter nach Thema
CREATE TABLE legal_act_topics (
    legal_act_id            uuid NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,   -- Erlass | Verweis
    topic_id                uuid NOT NULL REFERENCES topics(id),   -- Thema | Verweis
    PRIMARY KEY (legal_act_id, topic_id)
);

-- Fassung eines Erlasses (Nachtrag bzw. «Stand am») mit Datei und Text
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Fedlex (SPARQL), ZH-Lex (PDF) bzw. Website; «Textfassungen & Änderungen», Stichtagsabfrage
CREATE TABLE act_versions (
    id                      uuid PRIMARY KEY,
    legal_act_id            uuid NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,   -- Erlass | Verweis
    label                   text NOT NULL,                   -- Fassung | z. B. «Stand 03.03.2024»
    supplement_number       text,                            -- Nachtrag | ZH-Lex
    published_on            date,                            -- Veröffentlicht am | Publikation
    valid_from              date,                            -- In Kraft ab | Gültigkeit
    valid_until             date,                            -- In Kraft bis | leer = gilt
    date_origin             text,                            -- Herkunft des Datums | Titel, PDF-Metadaten oder Website
    status                  text NOT NULL DEFAULT 'current' CHECK (status IN ('draft','current','repealed','superseded')),   -- Status | Geltung der Fassung | öffentlich | draft=Entwurf; current=aktuell; repealed=aufgehoben; superseded=ersetzt
    source_url              text,                            -- Quelle (Seite) | Seite der Publikation
    file_url                text,                            -- Originaldatei | Adresse
    file_type               text,                            -- Dateityp | PDF, DOCX, HTML
    file_size               bigint,                          -- Dateigrösse | Bytes
    file_sha256             char(64),                        -- Prüfsumme | SHA-256 der Originaldatei
    storage_reference       text,                            -- Ablage | Kopie in der Dokumentenablage
    page_count              integer,                         -- Seiten | Textaufbereitung
    paragraph_count         integer,                         -- Absätze | Textaufbereitung
    footnote_count          integer,                         -- Fussnoten | Textaufbereitung
    text_markdown           text,                            -- Textfassung | Volltext für Suche und Anzeige
    captured_on             date NOT NULL DEFAULT current_date,   -- Erfasst am | Import
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);
CREATE INDEX act_versions_text_search_index ON act_versions USING gin (to_tsvector('german', coalesce(text_markdown, '')));

-- Unterschiede zwischen zwei Fassungen
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: vorab berechnet bei neuer Fassung; Ansicht «Änderungen»
CREATE TABLE act_version_differences (
    id                      uuid PRIMARY KEY,
    old_version_id          uuid NOT NULL REFERENCES act_versions(id) ON DELETE CASCADE,   -- Ältere Fassung | Verweis
    new_version_id          uuid NOT NULL REFERENCES act_versions(id) ON DELETE CASCADE,   -- Neuere Fassung | Verweis
    changes                 jsonb NOT NULL,                  -- Änderungen | Liste mit Art, Stelle, alt, neu
    UNIQUE (old_version_id, new_version_id)
);

-- Verweis eines Erlasses auf einen anderen
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: aus Ingress, Fussnoten und Text; Grundlage für Hierarchie-Vorschläge
CREATE TABLE act_references (
    id                      uuid PRIMARY KEY,
    from_act_id             uuid NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,   -- Erlass | verweisender Erlass
    to_act_id               uuid REFERENCES legal_acts(id),  -- Ziel-Erlass | leer, wenn noch nicht erfasst
    target_citation         text NOT NULL,                   -- Ziel (Fundstelle) | z. B. «LS 412.100.1»
    location                text,                            -- Stelle | z. B. «Fussnoten»
    reference_count         integer NOT NULL DEFAULT 1,      -- Anzahl | Verweise
    UNIQUE (from_act_id, target_citation)
);

-- ------------------------------------------------------------------ Rechtsgrundlagen und Quellen

-- Rechtsgrundlage für Schulen (Erlass, Stelle und Relevanz je Sachbereich)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Rechtsgrundlagenverzeichnis; Ansicht «Rechtsgrundlagen Schule»
CREATE TABLE legal_bases (
    id                      uuid PRIMARY KEY,
    number                  integer NOT NULL UNIQUE,         -- Nummer | Reihenfolge
    legal_area_id           uuid NOT NULL REFERENCES legal_areas(id),   -- Sachbereich | Verweis
    legal_act_id            uuid NOT NULL REFERENCES legal_acts(id),    -- Erlass | Verweis
    location                text,                            -- Stelle | z. B. «Art. 19, 62»
    relevance               text,                            -- Relevanz | Bedeutung für die Schule
    source                  text,                            -- Quelle | Herkunft des Eintrags
    is_generic_source       boolean NOT NULL DEFAULT false,  -- Quelle allgemein | nur Startseite statt Fundstelle
    is_verified             boolean NOT NULL DEFAULT false   -- Geprüft | von der Redaktion
);

-- Quellenklasse (A Rechtsnormen, B …)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Quellenkatalog; was vollständig aufgenommen wird
CREATE TABLE source_classes (
    id                      uuid PRIMARY KEY,
    code                    char(1) NOT NULL UNIQUE,         -- Klasse | Buchstabe
    title                   text NOT NULL,                   -- Bezeichnung | z. B. «Rechtsnormen»
    intake                  text NOT NULL                    -- Aufnahme | z. B. «vollständig aufnehmen»
);

-- Publikationsquelle (Fedlex, ZH-Lex, Gemeinde-Websites …)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Quellenkatalog; Ansicht «Herkunftsliste» und Importdienste
CREATE TABLE publication_sources (
    id                      uuid PRIMARY KEY,
    source_class_id         uuid REFERENCES source_classes(id),   -- Klasse | Verweis
    level                   text NOT NULL,                   -- Ebene | Bund, Kanton …
    name                    text NOT NULL,                   -- Quelle | Name
    publisher_name          text,                            -- Herausgeber | Name
    content                 text,                            -- Inhalt | Beschreibung
    url                     text,                            -- Adresse | Link
    priority                text CHECK (priority IN ('high','medium','low')),   -- Priorität | Reihenfolge der Erfassung | öffentlich | high=hoch; medium=mittel; low=tief
    versioning              text,                            -- Versionierung | z. B. «Stand am je Fassung»
    bindingness             text,                            -- Verbindlichkeit | rechtsverbindlich oder Information
    retrieval               text CHECK (retrieval IN ('api','sparql','pdf','html','manual')),   -- Abruf | Art des Imports | intern | api=API; sparql=SPARQL; pdf=PDF; html=HTML; manual=von Hand
    retrieved_at            timestamptz                      -- Zuletzt abgerufen | Import | intern
);

-- ------------------------------------------------------------------ Normenhierarchien

-- Normenhierarchie eines Themas
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Redaktion; Ansicht «Normenhierarchie»
CREATE TABLE norm_hierarchies (
    id                      uuid PRIMARY KEY,
    hierarchy_key           text NOT NULL UNIQUE,            -- Schlüssel | z. B. «volksschule»
    title                   text NOT NULL,                   -- Thema | Anzeige
    hierarchy_group         text,                            -- Gruppe | z. B. «Schule»
    levels                  text[] NOT NULL,                 -- Ebenen | Bund bis Gemeinde
    note                    text,                            -- Hinweis | Erläuterung
    position                integer NOT NULL DEFAULT 0       -- Reihenfolge | Anzeige
);

-- Knoten einer Hierarchie (ein Erlass auf einer Ebene)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Redaktion; Kasten im Hierarchiebild
CREATE TABLE hierarchy_nodes (
    id                      uuid PRIMARY KEY,
    norm_hierarchy_id       uuid NOT NULL REFERENCES norm_hierarchies(id) ON DELETE CASCADE,   -- Hierarchie | Verweis
    node_key                text NOT NULL,                   -- Schlüssel | z. B. «vsg»
    level_index             integer NOT NULL,                -- Ebene | Index in den Ebenen
    legal_act_id            uuid REFERENCES legal_acts(id),  -- Erlass | leer bei kommunalen Platzhaltern
    title                   text NOT NULL,                   -- Titel | Anzeige
    act_kind                text,                            -- Art | z. B. «Gesetz (Kantonsrat)»
    note                    text,                            -- Hinweis | z. B. massgebende Artikel
    UNIQUE (norm_hierarchy_id, node_key)
);

-- Verbindung zwischen zwei Knoten mit Beleg
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: von Hand oder als bestätigter Vorschlag aus den Verweisen; Linie im Hierarchiebild
CREATE TABLE hierarchy_edges (
    id                      uuid PRIMARY KEY,
    norm_hierarchy_id       uuid NOT NULL REFERENCES norm_hierarchies(id) ON DELETE CASCADE,   -- Hierarchie | Verweis
    from_node_id            uuid NOT NULL REFERENCES hierarchy_nodes(id) ON DELETE CASCADE,    -- Von | untergeordneter Knoten
    to_node_id              uuid NOT NULL REFERENCES hierarchy_nodes(id) ON DELETE CASCADE,    -- Nach | übergeordneter Knoten
    relation                text NOT NULL,                   -- Beziehung | z. B. «Grundlage», «Vollzug», «verweist auf»
    evidence_citation       text,                            -- Beleg (Fundstelle) | Erlass des Belegs
    evidence_location       text,                            -- Beleg (Stelle) | z. B. «Art. 62»
    evidence_text           text,                            -- Beleg (Text) | Textausschnitt
    reference_count         integer,                         -- Verweise | Anzahl gefundener Verweise
    status                  text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','manual','confirmed','rejected','municipal_or_without_text')),   -- Status | Herkunft und Prüfung | öffentlich | suggested=Vorschlag; manual=von Hand; confirmed=bestätigt; rejected=abgelehnt; municipal_or_without_text=kommunal bzw. ohne Text
    verified_by_id          uuid,                            -- Geprüft von | Redaktion (ohne Constraint) | intern
    verified_at             timestamptz,                     -- Geprüft am | Redaktion | intern
    CHECK (from_node_id <> to_node_id)
);

-- ------------------------------------------------------------------ Pflichtkatalog, Matrix, Elternwegweiser

-- Kategorie des Pflichtkatalogs einer Schulgemeinde
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Recherche Pflichtdokumente; Ansicht «Pflichtkatalog Schulgemeinde»
CREATE TABLE mandatory_document_categories (
    id                      uuid PRIMARY KEY,
    number                  integer NOT NULL UNIQUE,         -- Nummer | Reihenfolge
    title                   text NOT NULL                    -- Kategorie | z. B. «Behördenorganisation und Gemeinderecht»
);

-- Pflichtdokument einer Schulgemeinde
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Recherche Pflichtdokumente (zu prüfen); Zeilen der Matrix, automatische Zuordnung über Suchmuster
CREATE TABLE mandatory_documents (
    id                      uuid PRIMARY KEY,
    document_key            text NOT NULL UNIQUE,            -- Schlüssel | z. B. «p1»
    category_id             uuid NOT NULL REFERENCES mandatory_document_categories(id),   -- Kategorie | Verweis
    document                text NOT NULL,                   -- Dokument | z. B. «Gemeindeordnung»
    obligation              char(1) NOT NULL CHECK (obligation IN ('P','B','O')),   -- Stufe | Pflicht nach Rechtsgrundlage | öffentlich | P=Pflicht; B=bedingte Pflicht; O=optional
    intake                  text NOT NULL,                   -- Aufnahme | in die Rechtssammlung aufnehmen?
    source                  text,                            -- Quelle | Rechtsgrundlage bzw. Merkblatt
    source_url              text,                            -- Quelle (Adresse) | Link
    match_pattern           text,                            -- Suchmuster | regulärer Ausdruck für die Zuordnung
    uncertain_pattern       text,                            -- Suchmuster unsicher | Treffer nur als «unsicher»
    remark                  text,                            -- Bemerkung | Freitext
    review_status           text NOT NULL DEFAULT 'to_review' CHECK (review_status IN ('to_review','reviewed')),   -- Prüfstatus | fachliche Abnahme | intern | to_review=zu prüfen; reviewed=geprüft
    lock_version            integer NOT NULL DEFAULT 1
);

-- Zeile der Vergleichsmatrix (Rubrik › Unterordner › Dokumenttyp)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: aus den erfassten Sammlungen und dem Pflichtkatalog; Ansicht «Struktur-Matrix»
CREATE TABLE matrix_rows (
    id                      uuid PRIMARY KEY,
    row_key                 text NOT NULL UNIQUE,            -- Schlüssel | z. B. «k6»
    menu                    text NOT NULL,                   -- Rubrik | Menü der Normalform
    submenu                 text,                            -- Unterordner | Gliederung
    document                text NOT NULL,                   -- Dokument | Dokumenttyp
    is_collective           boolean NOT NULL DEFAULT false,  -- Sammelzeile | mehrere Dokumente
    obligation              char(1) CHECK (obligation IN ('P','B','O')),   -- Stufe | aus dem Pflichtkatalog | öffentlich | P=Pflicht; B=bedingte Pflicht; O=optional
    is_mandatory            boolean NOT NULL DEFAULT false,  -- Pflicht | Zeile aus dem Pflichtkatalog
    intake                  text,                            -- Aufnahme | in die Rechtssammlung aufnehmen?
    mandatory_document_id   uuid REFERENCES mandatory_documents(id),   -- Pflichtdokument | Verweis
    position                integer NOT NULL DEFAULT 0       -- Reihenfolge | Anzeige
);

-- Zelle der Matrix: hat der Herausgeber das Dokument der Zeile?
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: automatische Zuordnung über Suchmuster, Korrektur von Hand
CREATE TABLE matrix_cells (
    id                      uuid PRIMARY KEY,
    matrix_row_id           uuid NOT NULL REFERENCES matrix_rows(id) ON DELETE CASCADE,   -- Zeile | Verweis
    publisher_id            uuid NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,    -- Herausgeber | Spalte
    status                  text NOT NULL CHECK (status IN ('yes','uncertain','no','not_applicable')),   -- Status | vorhanden? | öffentlich | yes=ja; uncertain=unsicher; no=nein; not_applicable=nicht zutreffend
    notes                   text[] NOT NULL DEFAULT '{}',    -- Hinweise | Erläuterungen
    assignment              text NOT NULL DEFAULT 'automatic' CHECK (assignment IN ('automatic','manual')),   -- Zuordnung | Herkunft | intern | automatic=automatisch; manual=von Hand
    UNIQUE (matrix_row_id, publisher_id)
);

-- Erlasse einer Matrixzelle
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Zuordnung; Links in der Zelle
CREATE TABLE matrix_cell_acts (
    matrix_cell_id          uuid NOT NULL REFERENCES matrix_cells(id) ON DELETE CASCADE,   -- Zelle | Verweis
    legal_act_id            uuid NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,     -- Erlass | Verweis
    PRIMARY KEY (matrix_cell_id, legal_act_id)
);

-- Thema des Elternwegweisers (Fragen von Eltern mit Rechtsstellen und Dokumenten)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Redaktion EduKSX-Codex; Ansicht «Elternwegweiser»
CREATE TABLE parent_guide_topics (
    id                      uuid PRIMARY KEY,
    topic_key               text NOT NULL UNIQUE,            -- Schlüssel | z. B. «eintritt»
    title                   text NOT NULL,                   -- Thema | z. B. «Schuleintritt & Schulweg»
    questions               text[] NOT NULL DEFAULT '{}',    -- Fragen | typische Fragen von Eltern
    topic_id                uuid REFERENCES topics(id),      -- Thema (Hierarchie) | Verweis
    position                integer NOT NULL DEFAULT 0       -- Reihenfolge | Anzeige
);

-- Rechtsstelle zu einem Thema des Elternwegweisers
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Textfassung des Erlasses; Auszug im Elternwegweiser
CREATE TABLE parent_guide_provisions (
    id                      uuid PRIMARY KEY,
    parent_guide_topic_id   uuid NOT NULL REFERENCES parent_guide_topics(id) ON DELETE CASCADE,   -- Thema | Verweis
    act_version_id          uuid NOT NULL REFERENCES act_versions(id),   -- Fassung | Verweis auf Erlass und Nachtrag
    location                text NOT NULL,                   -- Stelle | z. B. «§ 3»
    excerpt                 text,                            -- Auszug | Text der Stelle
    position                integer NOT NULL DEFAULT 0       -- Reihenfolge | Anzeige
);

-- Kommunales Dokument zu einem Thema des Elternwegweisers
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Rechtssammlungen der Gemeinden; Beispiele im Elternwegweiser
CREATE TABLE parent_guide_documents (
    parent_guide_topic_id   uuid NOT NULL REFERENCES parent_guide_topics(id) ON DELETE CASCADE,   -- Thema | Verweis
    legal_act_id            uuid NOT NULL REFERENCES legal_acts(id) ON DELETE CASCADE,   -- Dokument | Verweis
    PRIMARY KEY (parent_guide_topic_id, legal_act_id)
);

-- ------------------------------------------------------------------ Leitfaden-Prüfung und Analysen

-- Anforderung des Leitfadens zum Aufbau einer systematischen Rechtssammlung
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Leitfaden des Gemeindeamts (2018/2019); Ansicht «Grundlagen»
CREATE TABLE guideline_rules (
    id                      uuid PRIMARY KEY,
    clause                  text NOT NULL UNIQUE,            -- Ziffer | im Leitfaden
    title                   text NOT NULL,                   -- Anforderung | Kurztitel
    text                    text,                            -- Text | Wortlaut bzw. Zusammenfassung
    is_automatic            boolean NOT NULL DEFAULT true    -- Maschinell prüfbar | anhand Titel und Ablageort
);

-- Analyse einer Rechtssammlung (Evaluation, wiederholbar)
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: Einlesen der Website bzw. der Sammlung; Steckbrief, Befunde, Kennzahlen
CREATE TABLE collection_analyses (
    id                      uuid PRIMARY KEY,
    publisher_id            uuid NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,   -- Herausgeber | Verweis
    analysis_number         integer NOT NULL,                -- Analyse | laufende Nummer
    analysed_on             date NOT NULL,                   -- Datum | Durchführung
    analysis_type           text NOT NULL,                   -- Art | z. B. «Erfassung», «Nachführung»
    remark                  text,                            -- Bemerkung | Freitext
    document_count          integer NOT NULL,                -- Dokumente | Anzahl
    section_count           integer NOT NULL,                -- Rubriken | Anzahl
    max_depth               integer,                         -- Tiefe | grösste Verschachtelung
    type_counts             jsonb NOT NULL DEFAULT '{}'::jsonb,   -- Anzahl je Art | Verteilung der Dokumentarten
    findings                text[] NOT NULL DEFAULT '{}',    -- Befunde | Liste
    UNIQUE (publisher_id, analysis_number)
);

-- Ergebnis einer Leitfaden-Regel in einer Analyse
-- Geltungsbereich: global · Datenklasse: öffentlich
-- Herkunft/Verwendung: automatische Prüfung (Anhaltspunkt, keine rechtliche Beurteilung)
CREATE TABLE guideline_checks (
    id                      uuid PRIMARY KEY,
    collection_analysis_id  uuid NOT NULL REFERENCES collection_analyses(id) ON DELETE CASCADE,   -- Analyse | Verweis
    guideline_rule_id       uuid NOT NULL REFERENCES guideline_rules(id),   -- Anforderung | Verweis
    status                  text NOT NULL CHECK (status IN ('yes','no','uncertain','info')),   -- Ergebnis | erfüllt? | öffentlich | yes=ja; no=nein; uncertain=unsicher; info=Hinweis
    text                    text,                            -- Begründung | Erläuterung
    UNIQUE (collection_analysis_id, guideline_rule_id)
);

-- ------------------------------------------------------------------ Ansichten

-- Gültige Fassung je Erlass am heutigen Tag
-- Grundlage für Listen, Suche und Widget (Stichtag über die API)
CREATE VIEW current_act_versions AS
SELECT DISTINCT ON (v.legal_act_id) v.*
FROM act_versions v
WHERE v.status <> 'draft'
  AND (v.valid_from IS NULL OR v.valid_from <= current_date)
  AND (v.valid_until IS NULL OR v.valid_until > current_date)
ORDER BY v.legal_act_id, v.valid_from DESC NULLS LAST, v.published_on DESC NULLS LAST;

-- Erfassungsstand je Bezirk
-- Übersicht «Fortschritt je Bezirk»
CREATE VIEW district_progress AS
SELECT m.district, count(*) AS municipality_count, count(*) FILTER (WHERE m.capture_status <> 'open') AS captured_count
FROM municipalities m GROUP BY m.district;

-- Ausnahmetabelle (doppelt gespeichert, DB A2)
-- act_versions.text_markdown: Textfassung neben der Originaldatei – Grund: Volltextsuche und Vergleich; neu erzeugt bei neuer Fassung
-- parent_guide_provisions.excerpt: Auszug der Stelle – Grund: Anzeige ohne Volltext; neu erzeugt bei neuer Fassung

-- >>> indizes
CREATE INDEX organizations_parent_id_index ON organizations (parent_id);
CREATE INDEX users_organization_id_index ON users (organization_id);
CREATE INDEX school_holidays_organization_id_index ON school_holidays (organization_id);
CREATE INDEX school_holidays_school_year_id_index ON school_holidays (school_year_id);
CREATE INDEX publishers_municipality_id_index ON publishers (municipality_id);
CREATE INDEX publishers_school_community_id_index ON publishers (school_community_id);
CREATE INDEX sections_publisher_id_index ON sections (publisher_id);
CREATE INDEX sections_parent_id_index ON sections (parent_id);
CREATE INDEX legal_acts_publisher_id_index ON legal_acts (publisher_id);
CREATE INDEX legal_acts_section_id_index ON legal_acts (section_id);
CREATE INDEX act_versions_legal_act_id_index ON act_versions (legal_act_id);
CREATE INDEX act_version_differences_new_version_id_index ON act_version_differences (new_version_id);
CREATE INDEX act_references_to_act_id_index ON act_references (to_act_id);
CREATE INDEX legal_bases_legal_area_id_index ON legal_bases (legal_area_id);
CREATE INDEX legal_bases_legal_act_id_index ON legal_bases (legal_act_id);
CREATE INDEX publication_sources_source_class_id_index ON publication_sources (source_class_id);
CREATE INDEX hierarchy_nodes_legal_act_id_index ON hierarchy_nodes (legal_act_id);
CREATE INDEX hierarchy_edges_norm_hierarchy_id_index ON hierarchy_edges (norm_hierarchy_id);
CREATE INDEX hierarchy_edges_from_node_id_index ON hierarchy_edges (from_node_id);
CREATE INDEX hierarchy_edges_to_node_id_index ON hierarchy_edges (to_node_id);
CREATE INDEX mandatory_documents_category_id_index ON mandatory_documents (category_id);
CREATE INDEX matrix_rows_mandatory_document_id_index ON matrix_rows (mandatory_document_id);
CREATE INDEX matrix_cells_publisher_id_index ON matrix_cells (publisher_id);
CREATE INDEX parent_guide_topics_topic_id_index ON parent_guide_topics (topic_id);
CREATE INDEX parent_guide_provisions_parent_guide_topic_id_index ON parent_guide_provisions (parent_guide_topic_id);
CREATE INDEX parent_guide_provisions_act_version_id_index ON parent_guide_provisions (act_version_id);
CREATE INDEX guideline_checks_guideline_rule_id_index ON guideline_checks (guideline_rule_id);
-- <<< indizes

-- >>> kommentare
COMMENT ON TABLE organizations IS 'Organisation (Schulgemeinde, Schule, Verwaltung); Stammdaten führt EduKSX-Ident – aus EduKSX-Ident (Plattform-ID); Mandant aller Daten des Moduls';
COMMENT ON COLUMN organizations.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN organizations.platform_id IS 'Plattform-ID – ID der Organisation in EduKSX-Ident';
COMMENT ON COLUMN organizations.parent_id IS 'Übergeordnete Organisation – Schule gehört zur Schulgemeinde';
COMMENT ON COLUMN organizations.organization_type IS 'Art – aus EduKSX-Ident';
COMMENT ON COLUMN organizations.name IS 'Name – aus EduKSX-Ident';
COMMENT ON COLUMN organizations.short_name IS 'Kurzname – aus EduKSX-Ident';
COMMENT ON COLUMN organizations.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN organizations.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN organizations.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE users IS 'Personenreferenz: Person mit oder ohne Anmeldung (Mitarbeitende, Behördenmitglieder, Externe) – aus EduKSX-Ident bzw. EduKSX-Connect; das Modul hält nur, was es braucht';
COMMENT ON COLUMN users.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN users.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN users.platform_id IS 'Plattform-ID – ID der Person in EduKSX-Ident';
COMMENT ON COLUMN users.issuer IS 'Aussteller – Anmeldung über EduKSX-Ident (OIDC «iss»)';
COMMENT ON COLUMN users.subject IS 'Subjekt – Anmeldung über EduKSX-Ident (OIDC «sub»)';
COMMENT ON COLUMN users.display_name IS 'Name – Anzeige in allen Listen';
COMMENT ON COLUMN users.short_name IS 'Kürzel – z. B. «LMu» in Stundenplan und Matrix';
COMMENT ON COLUMN users.email IS 'E-Mail – Benachrichtigungen, Signaturanfragen';
COMMENT ON COLUMN users.locale IS 'Sprache – Anzeige und Mitteilungen';
COMMENT ON COLUMN users.is_external IS 'Extern – Person ohne Anstellung (z. B. Unterzeichnende)';
COMMENT ON COLUMN users.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN users.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN users.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN users.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN users.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE school_years IS 'Schuljahr mit Semester- und Trimestergrenzen – Plattform-Stammdaten, gepflegt in «Schuljahre»; steuert Fristen, Kalenderregeln und Pensen';
COMMENT ON COLUMN school_years.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN school_years.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN school_years.name IS 'Schuljahr – z. B. «2026/27»';
COMMENT ON COLUMN school_years.starts_on IS 'Schuljahresbeginn – erster Schultag';
COMMENT ON COLUMN school_years.ends_on IS 'Schuljahresende – letzter Schultag';
COMMENT ON COLUMN school_years.changeover_on IS 'Schuljahreswechsel – Stichtag für Abläufe und Pensen';
COMMENT ON COLUMN school_years.first_semester_ends_on IS 'Semesterende (1. Semester) – Kalenderregeln';
COMMENT ON COLUMN school_years.second_semester_starts_on IS 'Semesterwechsel – Beginn 2. Semester';
COMMENT ON COLUMN school_years.second_trimester_starts_on IS 'Beginn 2. Trimester – nur der Vollständigkeit halber';
COMMENT ON COLUMN school_years.third_trimester_starts_on IS 'Beginn 3. Trimester – nur der Vollständigkeit halber';
COMMENT ON COLUMN school_years.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN school_years.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN school_years.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE school_holidays IS 'Ferien, Feiertage und schulfreie Tage eines Schuljahrs – Ferienplan der Schulgemeinde; für Schultage, Kalender und Sollzeit';
COMMENT ON COLUMN school_holidays.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN school_holidays.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN school_holidays.school_year_id IS 'Schuljahr – Verweis auf das Schuljahr';
COMMENT ON COLUMN school_holidays.name IS 'Bezeichnung – z. B. «Herbstferien»';
COMMENT ON COLUMN school_holidays.holiday_type IS 'Art – Ferienplan';
COMMENT ON COLUMN school_holidays.valid_from IS 'Von – erster freier Tag';
COMMENT ON COLUMN school_holidays.valid_until IS 'Bis – letzter freier Tag';
COMMENT ON TABLE data_changes IS 'Änderungshistorie aller Tabellen – geschrieben von der Service-Schicht in derselben Transaktion; Nachweis wer, wann, was';
COMMENT ON COLUMN data_changes.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN data_changes.event_id IS 'Ereignis-ID – eindeutig über Module und Exporte hinweg';
COMMENT ON COLUMN data_changes.subject_type IS 'Tabelle – betroffene Tabelle';
COMMENT ON COLUMN data_changes.subject_id IS 'Datensatz – ID des Datensatzes (ohne Constraint)';
COMMENT ON COLUMN data_changes.organization_id IS 'Organisation – leer bei globalen Daten (ohne Constraint)';
COMMENT ON COLUMN data_changes.action IS 'Aktion – Art der Änderung';
COMMENT ON COLUMN data_changes.changes IS 'Änderungen – Feld → alt/neu nach Datenklasse';
COMMENT ON COLUMN data_changes.actor_type IS 'Auslöser (Art) – wer';
COMMENT ON COLUMN data_changes.actor_id IS 'Auslöser – ID (ohne Constraint)';
COMMENT ON COLUMN data_changes.actor_label IS 'Auslöser (Text) – lesbar nach Pseudonymisierung';
COMMENT ON COLUMN data_changes.source IS 'Quelle – woher die Änderung kam';
COMMENT ON COLUMN data_changes.transaction_id IS 'Transaktion – gemeinsame Kennung einer Transaktion';
COMMENT ON COLUMN data_changes.request_id IS 'Anfrage – Anfrage-ID aus dem Protokoll';
COMMENT ON COLUMN data_changes.schema_version IS 'Schemastand – um alte Einträge richtig zu lesen';
COMMENT ON COLUMN data_changes.occurred_at IS 'Zeitpunkt – wann (UTC)';
COMMENT ON TABLE municipalities IS 'Politische Gemeinde – Verzeichnis der Gemeinden des Gemeindeamts, BFS-Gebietsstammdaten; Menü «Bezirk › Gemeinden»';
COMMENT ON COLUMN municipalities.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN municipalities.bfs_number IS 'BFS-Nummer – Gebietsstammdaten des BFS';
COMMENT ON COLUMN municipalities.name IS 'Gemeinde – Name';
COMMENT ON COLUMN municipalities.district IS 'Bezirk – Gliederung im Menü';
COMMENT ON COLUMN municipalities.municipality_type IS 'Art – heute nur politische Gemeinden';
COMMENT ON COLUMN municipalities.is_unified_municipality IS 'Einheitsgemeinde – Vermerk «EG»';
COMMENT ON COLUMN municipalities.is_unified_confirmed IS 'Einheitsgemeinde gesichert – sonst «EG ?»';
COMMENT ON COLUMN municipalities.website_url IS 'Website – aus der Verwaltungs-E-Mail';
COMMENT ON COLUMN municipalities.website_source IS 'Herkunft der Website – Beleg';
COMMENT ON COLUMN municipalities.cms IS 'CMS – erkanntes System der Website (intern)';
COMMENT ON COLUMN municipalities.legal_collection_url IS 'Rechtssammlung (Adresse) – Einstieg auf der Website';
COMMENT ON COLUMN municipalities.capture_status IS 'Erfassung – Stand der Evaluation';
COMMENT ON COLUMN municipalities.primary_school_provider IS 'Schulträger Primar – Schulgemeinde bzw. Einheitsgemeinde';
COMMENT ON COLUMN municipalities.secondary_school_provider IS 'Schulträger Sek – Schulgemeinde bzw. Einheitsgemeinde';
COMMENT ON COLUMN municipalities.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN municipalities.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN municipalities.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN municipalities.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE school_communities IS 'Schulgemeinde (Volks-, Primar-, Sekundarschulgemeinde) – Verzeichnis der Gemeinden des Gemeindeamts; Menü «Schulgemeinden»';
COMMENT ON COLUMN school_communities.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN school_communities.community_type IS 'Art – Typ der Schulgemeinde';
COMMENT ON COLUMN school_communities.name IS 'Schulgemeinde – Name';
COMMENT ON COLUMN school_communities.short_name IS 'Kurzname – Anzeige';
COMMENT ON COLUMN school_communities.district IS 'Bezirk – Gliederung im Menü';
COMMENT ON COLUMN school_communities.seat IS 'Sitz – Sitzgemeinde';
COMMENT ON COLUMN school_communities.is_membership_confirmed IS 'Mitglieder gesichert – sonst «?»';
COMMENT ON COLUMN school_communities.source IS 'Quelle – z. B. «Verzeichnis der Gemeinden, Stand 1.7.2026»';
COMMENT ON COLUMN school_communities.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN school_communities.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN school_communities.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE school_community_members IS 'Mitgliedgemeinde einer Schulgemeinde – Verzeichnis der Gemeinden; Zuordnung Gemeinde ↔ Schulgemeinde';
COMMENT ON COLUMN school_community_members.school_community_id IS 'Schulgemeinde – Verweis';
COMMENT ON COLUMN school_community_members.municipality_id IS 'Gemeinde – Verweis';
COMMENT ON COLUMN school_community_members.is_confirmed IS 'Gesichert – Zugehörigkeit belegt';
COMMENT ON TABLE publishers IS 'Herausgeber mit eigener Rechtssammlung (Bund, Kanton, Bildungsrat, Gemeinde, Schulgemeinde) – Erfassung in der Evaluation bzw. Redaktion; Steckbrief einer Organisation';
COMMENT ON COLUMN publishers.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN publishers.owner_platform_id IS 'Gepflegt von – Plattform-ID der Organisation mit eigener Redaktion';
COMMENT ON COLUMN publishers.publisher_key IS 'Schlüssel – z. B. «ps-truellikon», «kanton-zh»';
COMMENT ON COLUMN publishers.level IS 'Ebene – Normenhierarchie';
COMMENT ON COLUMN publishers.publisher_type IS 'Art – z. B. «Primarschulgemeinde»';
COMMENT ON COLUMN publishers.name IS 'Herausgeber – Name';
COMMENT ON COLUMN publishers.short_name IS 'Kurzname – Anzeige';
COMMENT ON COLUMN publishers.district IS 'Bezirk – Gliederung';
COMMENT ON COLUMN publishers.municipality_id IS 'Gemeinde – Verweis';
COMMENT ON COLUMN publishers.school_community_id IS 'Schulgemeinde – Verweis';
COMMENT ON COLUMN publishers.seat IS 'Sitz – Ort';
COMMENT ON COLUMN publishers.website_url IS 'Website – Adresse';
COMMENT ON COLUMN publishers.legal_collection_url IS 'Rechtssammlung (Adresse) – Einstieg auf der Website';
COMMENT ON COLUMN publishers.menu_path IS 'Menüpfad – Weg auf der Website, Evaluation';
COMMENT ON COLUMN publishers.other_entries IS 'Weitere Einstiege – Evaluation';
COMMENT ON COLUMN publishers.structure_note IS 'Gliederung – Beschreibung der Struktur';
COMMENT ON COLUMN publishers.numbering_note IS 'Nummerierung – Beschreibung';
COMMENT ON COLUMN publishers.is_embeddable IS 'Einbettbar – Website erlaubt iFrame';
COMMENT ON COLUMN publishers.has_pdf_preview IS 'PDF-Vorschau – im Widget möglich';
COMMENT ON COLUMN publishers.appearance IS 'Darstellung – Schrift und Farben für den Nachbau, ohne Logo';
COMMENT ON COLUMN publishers.captured_on IS 'Stand – Datum der Erfassung';
COMMENT ON COLUMN publishers.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN publishers.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN publishers.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN publishers.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN publishers.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN publishers.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN publishers.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE sections IS 'Rubrik bzw. Sachgebiet einer Rechtssammlung (höchstens 9 Sachgebiete, Unterordner über parent_id) – Gliederung der Sammlung nach dem Leitfaden des Gemeindeamts; Menü «Rubriken», Widget';
COMMENT ON COLUMN sections.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN sections.publisher_id IS 'Herausgeber – Verweis';
COMMENT ON COLUMN sections.parent_id IS 'Übergeordnete Rubrik – Unterordner';
COMMENT ON COLUMN sections.number IS 'Nummer – z. B. «1.2»';
COMMENT ON COLUMN sections.title IS 'Rubrik – Titel';
COMMENT ON COLUMN sections.position IS 'Reihenfolge – Anzeige';
COMMENT ON COLUMN sections.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN sections.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN sections.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE legal_areas IS 'Sachbereich des Rechtsgrundlagenverzeichnisses – Verzeichnis «Rechtsgrundlagen Schule»';
COMMENT ON COLUMN legal_areas.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN legal_areas.number IS 'Nummer – Reihenfolge';
COMMENT ON COLUMN legal_areas.title IS 'Sachbereich – z. B. «Schulrecht, Unterricht und Schulbetrieb»';
COMMENT ON TABLE topics IS 'Thema der Normenhierarchien und des Elternwegweisers – Redaktion EduKSX-Codex; Filter und Gruppen';
COMMENT ON COLUMN topics.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN topics.topic_key IS 'Schlüssel – z. B. «volksschule»';
COMMENT ON COLUMN topics.title IS 'Thema – Anzeige';
COMMENT ON COLUMN topics.topic_group IS 'Gruppe – z. B. «Kinder und Eltern»';
COMMENT ON COLUMN topics.position IS 'Reihenfolge – Anzeige';
COMMENT ON TABLE legal_acts IS 'Erlass bzw. Dokument einer Rechtssammlung – Website der Gemeinde, Fedlex, ZH-Lex oder Redaktion; Listen, Suche, Widget';
COMMENT ON COLUMN legal_acts.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN legal_acts.publisher_id IS 'Herausgeber – Verweis';
COMMENT ON COLUMN legal_acts.section_id IS 'Rubrik – Ablage in der Sammlung';
COMMENT ON COLUMN legal_acts.act_key IS 'Schlüssel – stabil, z. B. «ls-412.100»';
COMMENT ON COLUMN legal_acts.title IS 'Titel – bereinigt';
COMMENT ON COLUMN legal_acts.original_title IS 'Titel (Original) – wie auf der Website';
COMMENT ON COLUMN legal_acts.abbreviation IS 'Abkürzung – z. B. «VSG»';
COMMENT ON COLUMN legal_acts.citation IS 'Fundstelle – z. B. «LS 412.100», «SR 101»';
COMMENT ON COLUMN legal_acts.order_number IS 'Ordnungsnummer – Systematik';
COMMENT ON COLUMN legal_acts.act_type IS 'Art – Einteilung nach dem Leitfaden';
COMMENT ON COLUMN legal_acts.source_class IS 'Quellenklasse – A Rechtsnorm, B …';
COMMENT ON COLUMN legal_acts.issuer IS 'Erlassen von – z. B. «Kantonsrat»';
COMMENT ON COLUMN legal_acts.publication_place IS 'Publikationsstelle – z. B. «ZH-Lex»';
COMMENT ON COLUMN legal_acts.bindingness IS 'Verbindlichkeit – z. B. «rechtsverbindlich»';
COMMENT ON COLUMN legal_acts.has_full_text IS 'Textfassung – Volltext vorhanden';
COMMENT ON COLUMN legal_acts.is_verified IS 'Geprüft – von der Redaktion';
COMMENT ON COLUMN legal_acts.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN legal_acts.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN legal_acts.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN legal_acts.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN legal_acts.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN legal_acts.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN legal_acts.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE legal_act_topics IS 'Thema eines Erlasses – Redaktion; Filter nach Thema';
COMMENT ON COLUMN legal_act_topics.legal_act_id IS 'Erlass – Verweis';
COMMENT ON COLUMN legal_act_topics.topic_id IS 'Thema – Verweis';
COMMENT ON TABLE act_versions IS 'Fassung eines Erlasses (Nachtrag bzw. «Stand am») mit Datei und Text – Fedlex (SPARQL), ZH-Lex (PDF) bzw. Website; «Textfassungen & Änderungen», Stichtagsabfrage';
COMMENT ON COLUMN act_versions.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN act_versions.legal_act_id IS 'Erlass – Verweis';
COMMENT ON COLUMN act_versions.label IS 'Fassung – z. B. «Stand 03.03.2024»';
COMMENT ON COLUMN act_versions.supplement_number IS 'Nachtrag – ZH-Lex';
COMMENT ON COLUMN act_versions.published_on IS 'Veröffentlicht am – Publikation';
COMMENT ON COLUMN act_versions.valid_from IS 'In Kraft ab – Gültigkeit';
COMMENT ON COLUMN act_versions.valid_until IS 'In Kraft bis';
COMMENT ON COLUMN act_versions.date_origin IS 'Herkunft des Datums – Titel, PDF-Metadaten oder Website';
COMMENT ON COLUMN act_versions.status IS 'Status – Geltung der Fassung';
COMMENT ON COLUMN act_versions.source_url IS 'Quelle (Seite) – Seite der Publikation';
COMMENT ON COLUMN act_versions.file_url IS 'Originaldatei – Adresse';
COMMENT ON COLUMN act_versions.file_type IS 'Dateityp – PDF, DOCX, HTML';
COMMENT ON COLUMN act_versions.file_size IS 'Dateigrösse – Bytes';
COMMENT ON COLUMN act_versions.file_sha256 IS 'Prüfsumme – SHA-256 der Originaldatei';
COMMENT ON COLUMN act_versions.storage_reference IS 'Ablage – Kopie in der Dokumentenablage';
COMMENT ON COLUMN act_versions.page_count IS 'Seiten – Textaufbereitung';
COMMENT ON COLUMN act_versions.paragraph_count IS 'Absätze – Textaufbereitung';
COMMENT ON COLUMN act_versions.footnote_count IS 'Fussnoten – Textaufbereitung';
COMMENT ON COLUMN act_versions.text_markdown IS 'Textfassung – Volltext für Suche und Anzeige';
COMMENT ON COLUMN act_versions.captured_on IS 'Erfasst am – Import';
COMMENT ON TABLE act_version_differences IS 'Unterschiede zwischen zwei Fassungen – vorab berechnet bei neuer Fassung; Ansicht «Änderungen»';
COMMENT ON COLUMN act_version_differences.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN act_version_differences.old_version_id IS 'Ältere Fassung – Verweis';
COMMENT ON COLUMN act_version_differences.new_version_id IS 'Neuere Fassung – Verweis';
COMMENT ON COLUMN act_version_differences.changes IS 'Änderungen – Liste mit Art, Stelle, alt, neu';
COMMENT ON TABLE act_references IS 'Verweis eines Erlasses auf einen anderen – aus Ingress, Fussnoten und Text; Grundlage für Hierarchie-Vorschläge';
COMMENT ON COLUMN act_references.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN act_references.from_act_id IS 'Erlass – verweisender Erlass';
COMMENT ON COLUMN act_references.to_act_id IS 'Ziel-Erlass – leer, wenn noch nicht erfasst';
COMMENT ON COLUMN act_references.target_citation IS 'Ziel (Fundstelle) – z. B. «LS 412.100.1»';
COMMENT ON COLUMN act_references.location IS 'Stelle – z. B. «Fussnoten»';
COMMENT ON COLUMN act_references.reference_count IS 'Anzahl – Verweise';
COMMENT ON TABLE legal_bases IS 'Rechtsgrundlage für Schulen (Erlass, Stelle und Relevanz je Sachbereich) – Rechtsgrundlagenverzeichnis; Ansicht «Rechtsgrundlagen Schule»';
COMMENT ON COLUMN legal_bases.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN legal_bases.number IS 'Nummer – Reihenfolge';
COMMENT ON COLUMN legal_bases.legal_area_id IS 'Sachbereich – Verweis';
COMMENT ON COLUMN legal_bases.legal_act_id IS 'Erlass – Verweis';
COMMENT ON COLUMN legal_bases.location IS 'Stelle – z. B. «Art. 19, 62»';
COMMENT ON COLUMN legal_bases.relevance IS 'Relevanz – Bedeutung für die Schule';
COMMENT ON COLUMN legal_bases.source IS 'Quelle – Herkunft des Eintrags';
COMMENT ON COLUMN legal_bases.is_generic_source IS 'Quelle allgemein – nur Startseite statt Fundstelle';
COMMENT ON COLUMN legal_bases.is_verified IS 'Geprüft – von der Redaktion';
COMMENT ON TABLE source_classes IS 'Quellenklasse (A Rechtsnormen, B …) – Quellenkatalog; was vollständig aufgenommen wird';
COMMENT ON COLUMN source_classes.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN source_classes.code IS 'Klasse – Buchstabe';
COMMENT ON COLUMN source_classes.title IS 'Bezeichnung – z. B. «Rechtsnormen»';
COMMENT ON COLUMN source_classes.intake IS 'Aufnahme – z. B. «vollständig aufnehmen»';
COMMENT ON TABLE publication_sources IS 'Publikationsquelle (Fedlex, ZH-Lex, Gemeinde-Websites …) – Quellenkatalog; Ansicht «Herkunftsliste» und Importdienste';
COMMENT ON COLUMN publication_sources.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN publication_sources.source_class_id IS 'Klasse – Verweis';
COMMENT ON COLUMN publication_sources.level IS 'Ebene – Bund, Kanton …';
COMMENT ON COLUMN publication_sources.name IS 'Quelle – Name';
COMMENT ON COLUMN publication_sources.publisher_name IS 'Herausgeber – Name';
COMMENT ON COLUMN publication_sources.content IS 'Inhalt – Beschreibung';
COMMENT ON COLUMN publication_sources.url IS 'Adresse – Link';
COMMENT ON COLUMN publication_sources.priority IS 'Priorität – Reihenfolge der Erfassung';
COMMENT ON COLUMN publication_sources.versioning IS 'Versionierung – z. B. «Stand am je Fassung»';
COMMENT ON COLUMN publication_sources.bindingness IS 'Verbindlichkeit – rechtsverbindlich oder Information';
COMMENT ON COLUMN publication_sources.retrieval IS 'Abruf – Art des Imports';
COMMENT ON COLUMN publication_sources.retrieved_at IS 'Zuletzt abgerufen – Import';
COMMENT ON TABLE norm_hierarchies IS 'Normenhierarchie eines Themas – Redaktion; Ansicht «Normenhierarchie»';
COMMENT ON COLUMN norm_hierarchies.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN norm_hierarchies.hierarchy_key IS 'Schlüssel – z. B. «volksschule»';
COMMENT ON COLUMN norm_hierarchies.title IS 'Thema – Anzeige';
COMMENT ON COLUMN norm_hierarchies.hierarchy_group IS 'Gruppe – z. B. «Schule»';
COMMENT ON COLUMN norm_hierarchies.levels IS 'Ebenen – Bund bis Gemeinde';
COMMENT ON COLUMN norm_hierarchies.note IS 'Hinweis – Erläuterung';
COMMENT ON COLUMN norm_hierarchies.position IS 'Reihenfolge – Anzeige';
COMMENT ON TABLE hierarchy_nodes IS 'Knoten einer Hierarchie (ein Erlass auf einer Ebene) – Redaktion; Kasten im Hierarchiebild';
COMMENT ON COLUMN hierarchy_nodes.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN hierarchy_nodes.norm_hierarchy_id IS 'Hierarchie – Verweis';
COMMENT ON COLUMN hierarchy_nodes.node_key IS 'Schlüssel – z. B. «vsg»';
COMMENT ON COLUMN hierarchy_nodes.level_index IS 'Ebene – Index in den Ebenen';
COMMENT ON COLUMN hierarchy_nodes.legal_act_id IS 'Erlass – leer bei kommunalen Platzhaltern';
COMMENT ON COLUMN hierarchy_nodes.title IS 'Titel – Anzeige';
COMMENT ON COLUMN hierarchy_nodes.act_kind IS 'Art – z. B. «Gesetz (Kantonsrat)»';
COMMENT ON COLUMN hierarchy_nodes.note IS 'Hinweis – z. B. massgebende Artikel';
COMMENT ON TABLE hierarchy_edges IS 'Verbindung zwischen zwei Knoten mit Beleg – von Hand oder als bestätigter Vorschlag aus den Verweisen; Linie im Hierarchiebild';
COMMENT ON COLUMN hierarchy_edges.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN hierarchy_edges.norm_hierarchy_id IS 'Hierarchie – Verweis';
COMMENT ON COLUMN hierarchy_edges.from_node_id IS 'Von – untergeordneter Knoten';
COMMENT ON COLUMN hierarchy_edges.to_node_id IS 'Nach – übergeordneter Knoten';
COMMENT ON COLUMN hierarchy_edges.relation IS 'Beziehung – z. B. «Grundlage», «Vollzug», «verweist auf»';
COMMENT ON COLUMN hierarchy_edges.evidence_citation IS 'Beleg (Fundstelle) – Erlass des Belegs';
COMMENT ON COLUMN hierarchy_edges.evidence_location IS 'Beleg (Stelle) – z. B. «Art. 62»';
COMMENT ON COLUMN hierarchy_edges.evidence_text IS 'Beleg (Text) – Textausschnitt';
COMMENT ON COLUMN hierarchy_edges.reference_count IS 'Verweise – Anzahl gefundener Verweise';
COMMENT ON COLUMN hierarchy_edges.status IS 'Status – Herkunft und Prüfung';
COMMENT ON COLUMN hierarchy_edges.verified_by_id IS 'Geprüft von – Redaktion (ohne Constraint)';
COMMENT ON COLUMN hierarchy_edges.verified_at IS 'Geprüft am – Redaktion';
COMMENT ON TABLE mandatory_document_categories IS 'Kategorie des Pflichtkatalogs einer Schulgemeinde – Recherche Pflichtdokumente; Ansicht «Pflichtkatalog Schulgemeinde»';
COMMENT ON COLUMN mandatory_document_categories.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN mandatory_document_categories.number IS 'Nummer – Reihenfolge';
COMMENT ON COLUMN mandatory_document_categories.title IS 'Kategorie – z. B. «Behördenorganisation und Gemeinderecht»';
COMMENT ON TABLE mandatory_documents IS 'Pflichtdokument einer Schulgemeinde – Recherche Pflichtdokumente (zu prüfen); Zeilen der Matrix, automatische Zuordnung über Suchmuster';
COMMENT ON COLUMN mandatory_documents.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN mandatory_documents.document_key IS 'Schlüssel – z. B. «p1»';
COMMENT ON COLUMN mandatory_documents.category_id IS 'Kategorie – Verweis';
COMMENT ON COLUMN mandatory_documents.document IS 'Dokument – z. B. «Gemeindeordnung»';
COMMENT ON COLUMN mandatory_documents.obligation IS 'Stufe – Pflicht nach Rechtsgrundlage';
COMMENT ON COLUMN mandatory_documents.intake IS 'Aufnahme – in die Rechtssammlung aufnehmen?';
COMMENT ON COLUMN mandatory_documents.source IS 'Quelle – Rechtsgrundlage bzw. Merkblatt';
COMMENT ON COLUMN mandatory_documents.source_url IS 'Quelle (Adresse) – Link';
COMMENT ON COLUMN mandatory_documents.match_pattern IS 'Suchmuster – regulärer Ausdruck für die Zuordnung';
COMMENT ON COLUMN mandatory_documents.uncertain_pattern IS 'Suchmuster unsicher – Treffer nur als «unsicher»';
COMMENT ON COLUMN mandatory_documents.remark IS 'Bemerkung – Freitext';
COMMENT ON COLUMN mandatory_documents.review_status IS 'Prüfstatus – fachliche Abnahme';
COMMENT ON COLUMN mandatory_documents.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE matrix_rows IS 'Zeile der Vergleichsmatrix (Rubrik › Unterordner › Dokumenttyp) – aus den erfassten Sammlungen und dem Pflichtkatalog; Ansicht «Struktur-Matrix»';
COMMENT ON COLUMN matrix_rows.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN matrix_rows.row_key IS 'Schlüssel – z. B. «k6»';
COMMENT ON COLUMN matrix_rows.menu IS 'Rubrik – Menü der Normalform';
COMMENT ON COLUMN matrix_rows.submenu IS 'Unterordner – Gliederung';
COMMENT ON COLUMN matrix_rows.document IS 'Dokument – Dokumenttyp';
COMMENT ON COLUMN matrix_rows.is_collective IS 'Sammelzeile – mehrere Dokumente';
COMMENT ON COLUMN matrix_rows.obligation IS 'Stufe – aus dem Pflichtkatalog';
COMMENT ON COLUMN matrix_rows.is_mandatory IS 'Pflicht – Zeile aus dem Pflichtkatalog';
COMMENT ON COLUMN matrix_rows.intake IS 'Aufnahme – in die Rechtssammlung aufnehmen?';
COMMENT ON COLUMN matrix_rows.mandatory_document_id IS 'Pflichtdokument – Verweis';
COMMENT ON COLUMN matrix_rows.position IS 'Reihenfolge – Anzeige';
COMMENT ON TABLE matrix_cells IS 'Zelle der Matrix: hat der Herausgeber das Dokument der Zeile? – automatische Zuordnung über Suchmuster, Korrektur von Hand';
COMMENT ON COLUMN matrix_cells.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN matrix_cells.matrix_row_id IS 'Zeile – Verweis';
COMMENT ON COLUMN matrix_cells.publisher_id IS 'Herausgeber – Spalte';
COMMENT ON COLUMN matrix_cells.status IS 'Status – vorhanden?';
COMMENT ON COLUMN matrix_cells.notes IS 'Hinweise – Erläuterungen';
COMMENT ON COLUMN matrix_cells.assignment IS 'Zuordnung – Herkunft';
COMMENT ON TABLE matrix_cell_acts IS 'Erlasse einer Matrixzelle – Zuordnung; Links in der Zelle';
COMMENT ON COLUMN matrix_cell_acts.matrix_cell_id IS 'Zelle – Verweis';
COMMENT ON COLUMN matrix_cell_acts.legal_act_id IS 'Erlass – Verweis';
COMMENT ON TABLE parent_guide_topics IS 'Thema des Elternwegweisers (Fragen von Eltern mit Rechtsstellen und Dokumenten) – Redaktion EduKSX-Codex; Ansicht «Elternwegweiser»';
COMMENT ON COLUMN parent_guide_topics.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN parent_guide_topics.topic_key IS 'Schlüssel – z. B. «eintritt»';
COMMENT ON COLUMN parent_guide_topics.title IS 'Thema – z. B. «Schuleintritt & Schulweg»';
COMMENT ON COLUMN parent_guide_topics.questions IS 'Fragen – typische Fragen von Eltern';
COMMENT ON COLUMN parent_guide_topics.topic_id IS 'Thema (Hierarchie) – Verweis';
COMMENT ON COLUMN parent_guide_topics.position IS 'Reihenfolge – Anzeige';
COMMENT ON TABLE parent_guide_provisions IS 'Rechtsstelle zu einem Thema des Elternwegweisers – Textfassung des Erlasses; Auszug im Elternwegweiser';
COMMENT ON COLUMN parent_guide_provisions.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN parent_guide_provisions.parent_guide_topic_id IS 'Thema – Verweis';
COMMENT ON COLUMN parent_guide_provisions.act_version_id IS 'Fassung – Verweis auf Erlass und Nachtrag';
COMMENT ON COLUMN parent_guide_provisions.location IS 'Stelle – z. B. «§ 3»';
COMMENT ON COLUMN parent_guide_provisions.excerpt IS 'Auszug – Text der Stelle';
COMMENT ON COLUMN parent_guide_provisions.position IS 'Reihenfolge – Anzeige';
COMMENT ON TABLE parent_guide_documents IS 'Kommunales Dokument zu einem Thema des Elternwegweisers – Rechtssammlungen der Gemeinden; Beispiele im Elternwegweiser';
COMMENT ON COLUMN parent_guide_documents.parent_guide_topic_id IS 'Thema – Verweis';
COMMENT ON COLUMN parent_guide_documents.legal_act_id IS 'Dokument – Verweis';
COMMENT ON TABLE guideline_rules IS 'Anforderung des Leitfadens zum Aufbau einer systematischen Rechtssammlung – Leitfaden des Gemeindeamts (2018/2019); Ansicht «Grundlagen»';
COMMENT ON COLUMN guideline_rules.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN guideline_rules.clause IS 'Ziffer – im Leitfaden';
COMMENT ON COLUMN guideline_rules.title IS 'Anforderung – Kurztitel';
COMMENT ON COLUMN guideline_rules.text IS 'Text – Wortlaut bzw. Zusammenfassung';
COMMENT ON COLUMN guideline_rules.is_automatic IS 'Maschinell prüfbar – anhand Titel und Ablageort';
COMMENT ON TABLE collection_analyses IS 'Analyse einer Rechtssammlung (Evaluation, wiederholbar) – Einlesen der Website bzw. der Sammlung; Steckbrief, Befunde, Kennzahlen';
COMMENT ON COLUMN collection_analyses.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN collection_analyses.publisher_id IS 'Herausgeber – Verweis';
COMMENT ON COLUMN collection_analyses.analysis_number IS 'Analyse – laufende Nummer';
COMMENT ON COLUMN collection_analyses.analysed_on IS 'Datum – Durchführung';
COMMENT ON COLUMN collection_analyses.analysis_type IS 'Art – z. B. «Erfassung», «Nachführung»';
COMMENT ON COLUMN collection_analyses.remark IS 'Bemerkung – Freitext';
COMMENT ON COLUMN collection_analyses.document_count IS 'Dokumente – Anzahl';
COMMENT ON COLUMN collection_analyses.section_count IS 'Rubriken – Anzahl';
COMMENT ON COLUMN collection_analyses.max_depth IS 'Tiefe – grösste Verschachtelung';
COMMENT ON COLUMN collection_analyses.type_counts IS 'Anzahl je Art – Verteilung der Dokumentarten';
COMMENT ON COLUMN collection_analyses.findings IS 'Befunde – Liste';
COMMENT ON TABLE guideline_checks IS 'Ergebnis einer Leitfaden-Regel in einer Analyse – automatische Prüfung (Anhaltspunkt, keine rechtliche Beurteilung)';
COMMENT ON COLUMN guideline_checks.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN guideline_checks.collection_analysis_id IS 'Analyse – Verweis';
COMMENT ON COLUMN guideline_checks.guideline_rule_id IS 'Anforderung – Verweis';
COMMENT ON COLUMN guideline_checks.status IS 'Ergebnis – erfüllt?';
COMMENT ON COLUMN guideline_checks.text IS 'Begründung – Erläuterung';
COMMENT ON VIEW current_act_versions IS 'Gültige Fassung je Erlass am heutigen Tag';
COMMENT ON VIEW district_progress IS 'Erfassungsstand je Bezirk';
-- <<< kommentare
