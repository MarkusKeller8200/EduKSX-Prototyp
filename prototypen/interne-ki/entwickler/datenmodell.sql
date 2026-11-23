-- EduKSX-AI – Datenmodell (Entwurf), direkt ausführbar (inkl. Standardtabellen)
-- Quelle: docs/umsetzung/ai/datenbank.sql

-- EduKSX-AI – Datenbankstruktur (Interne KI)
-- Stand 2026-11-23 · Status ENTWURF · DB-Standard 1.3 · Grundlage: Prototyp prototypen/interne-ki
-- Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert. Erzeugte Blöcke (>>> … <<<) nicht von Hand
-- ändern: python3 tools/umsetzung_bauen.py
--
-- Die Modelle laufen nicht in der Datenbank: Anfragen gehen über ein internes Gateway an OpenAI-kompatible
-- Schnittstellen (interner KI-Server oder freigegebene Schweizer Anbieter). Die Datenbank hält Konfiguration,
-- Unterhaltungen, Wissenssammlungen mit Suchindex (Erweiterung pgvector – ZU PRÜFEN) und das Metadaten-Protokoll.
-- Inhalte von Unterhaltungen werden nie ins Protokoll geschrieben.

CREATE SCHEMA IF NOT EXISTS ai;
SET search_path TO ai;

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

-- ------------------------------------------------------------------ Organisation, Rollen, Gruppen

-- Einstellungen der KI-Plattform je Organisation (Angaben für Briefe, Datenschutzregeln)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Verwaltung › Organisation und › Datenschutz; Hinweis wird jeder Unterhaltung vorangestellt
CREATE TABLE ai_settings (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    display_name        text NOT NULL,                   -- Name der Organisation | in Briefen und Antworten
    postal_address      text,                            -- Postadresse | in Briefen
    phone               text,                            -- Telefon Sekretariat | in Briefen
    email               text,                            -- E-Mail Sekretariat | in Briefen
    website             text,                            -- Website | in Antworten
    model_instructions  text CHECK (char_length(model_instructions) <= 1000),   -- Hinweis an das Modell | Ton, Schreibweise, Regeln; jeder Unterhaltung vorangestellt
    retention_days      integer NOT NULL DEFAULT 90 CHECK (retention_days BETWEEN 1 AND 365),   -- Aufbewahrung (Tage) | Unterhaltungen ohne Änderung werden danach gelöscht
    default_protection_level text NOT NULL DEFAULT 'internal' CHECK (default_protection_level IN ('public','internal','confidential','sensitive')),   -- Schutzbedarf neuer Unterhaltungen | Vorgabe | public=öffentlich; internal=intern; confidential=vertraulich; sensitive=besonders schützenswert
    usage_logging       text NOT NULL DEFAULT 'metadata' CHECK (usage_logging IN ('metadata','off')),   -- Protokollierung | nie Inhalte | metadata=nur Metadaten; off=aus
    personal_data_check boolean NOT NULL DEFAULT true,   -- Personendaten prüfen | vor dem Senden Schutzbedarf vorschlagen
    show_error_notice   boolean NOT NULL DEFAULT true,   -- Hinweis «KI kann Fehler machen» | im Chat anzeigen
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id)
);

-- Rolle mit Rechten (Administration ist fest und hat immer alle Rechte)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Verwaltung › Rollen & Rechte
CREATE TABLE roles (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    role_key            text NOT NULL,                   -- Schlüssel | z. B. «admin», «editor», «staff», «learner»
    name                text NOT NULL,                   -- Name | Anzeige
    description         text,                            -- Beschreibung | Anzeige
    is_fixed            boolean NOT NULL DEFAULT false,  -- Fest | nicht änderbar (Administration)
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (organization_id, role_key)
);

-- Recht einer Rolle
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Matrix in Verwaltung › Rollen & Rechte
CREATE TABLE role_permissions (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    role_id             uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,   -- Rolle | Verweis
    permission          text NOT NULL CHECK (permission IN ('chat','attach_files','web_search','create_assistants','share_assistants','create_collections','share_collections','choose_model','process_confidential','administer')),   -- Recht | was die Rolle darf | chat=Chat verwenden; attach_files=Dateien anhängen; web_search=Websuche; create_assistants=Assistenten erstellen; share_assistants=Assistenten freigeben; create_collections=Wissenssammlungen erstellen; share_collections=Wissenssammlungen freigeben; choose_model=Modell wählen; process_confidential=vertrauliche Daten verarbeiten; administer=Verwaltung öffnen
    UNIQUE (role_id, permission)
);

-- Rolle, Sperre und Aktivität einer Person in EduKSX-AI (Konto selbst aus EduKSX-Ident)
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Verwaltung › Benutzer & Gruppen; Konten aus dem Abgleich mit EduKSX-Ident
CREATE TABLE user_accounts (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Person | Konto aus EduKSX-Ident
    role_id             uuid NOT NULL REFERENCES roles(id),   -- Rolle | Rechte | intern
    is_blocked          boolean NOT NULL DEFAULT false,  -- Gesperrt | kein Zugang | intern
    last_active_at      timestamptz,                     -- Zuletzt aktiv | Anzeige
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, user_id)
);

-- Gruppe von Personen für Freigaben
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Verwaltung › Benutzer & Gruppen › Gruppen; steuert, wer Assistenten und Sammlungen sieht
CREATE TABLE user_groups (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    name                text NOT NULL,                   -- Gruppe | Name
    description         text,                            -- Beschreibung | Anzeige
    source              text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ident')),   -- Herkunft | wer die Gruppe pflegt | intern | manual=hier angelegt; ident=aus EduKSX-Ident
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (organization_id, name)
);

-- Mitgliedschaft einer Person in einer Gruppe
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Dialog «Gruppen» bei einer Person
CREATE TABLE user_group_members (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_group_id       uuid NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,   -- Gruppe | Verweis | intern
    user_id             uuid NOT NULL REFERENCES users(id),   -- Person | Mitglied
    UNIQUE (user_group_id, user_id)
);

-- ------------------------------------------------------------------ Betriebsorte und Modelle

-- Betriebsort: Ort, an dem Modelle rechnen (interner Server oder geprüfter Anbieter)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Verwaltung › Betriebsorte; nur freigegebene, aktive Orte erhalten Anfragen, und nur bis zum Schutzbedarf «max_protection_level»
CREATE TABLE inference_endpoints (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    name                text NOT NULL,                   -- Name | Anzeige
    endpoint_kind       text NOT NULL CHECK (endpoint_kind IN ('internal','ch_api','ch_gpu','foreign')),   -- Art | Betriebsmodell | internal=interner Server; ch_api=CH-Cloud Inferenz-API; ch_gpu=CH-Cloud eigene GPU; foreign=ausserhalb der Schweiz
    location            text,                            -- Standort | Rechenzentren
    base_url            text NOT NULL,                   -- Adresse | OpenAI-kompatible Schnittstelle (…/v1)
    api_style           text NOT NULL DEFAULT 'openai' CHECK (api_style IN ('openai','other')),   -- Schnittstelle | Protokoll | openai=OpenAI-kompatibel; other=andere
    secret_reference    text,                            -- Zugangsschlüssel | Verweis in den Tresor, nie der Schlüssel selbst
    infrastructure      text,                            -- Infrastruktur | z. B. GPU-Ausstattung
    certifications      text,                            -- Nachweise | Zertifizierungen, Rechtsgrundlage
    subject_to_cloud_act boolean NOT NULL DEFAULT false, -- US CLOUD Act | Anbieter betroffen
    dpa_status          text NOT NULL DEFAULT 'open' CHECK (dpa_status IN ('not_needed','open','in_review','signed')),   -- Vertrag (ADV) | Auftragsdatenbearbeitung | not_needed=nicht nötig; open=offen; in_review=in Prüfung; signed=abgeschlossen
    max_protection_level text NOT NULL DEFAULT 'public' CHECK (max_protection_level IN ('public','internal','confidential','sensitive')),   -- Zulässig bis | höchster Schutzbedarf | public=öffentlich; internal=intern; confidential=vertraulich; sensitive=besonders schützenswert
    approval_status     text NOT NULL DEFAULT 'in_review' CHECK (approval_status IN ('in_review','approved','rejected')),   -- Freigabe | nach Datenschutzprüfung | in_review=in Prüfung; approved=freigegeben; rejected=abgelehnt
    approved_on         date,                            -- Geprüft am | Datum der Freigabe
    approved_by_id      uuid REFERENCES users(id),       -- Geprüft von | Person
    is_active           boolean NOT NULL DEFAULT false CHECK (NOT is_active OR approval_status = 'approved'),   -- Aktiv | Modelle dürfen den Ort nutzen
    provider_url        text,                            -- Website des Anbieters | Quelle
    remarks             text,                            -- Bemerkung | Ergebnis der Prüfung
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- Ergebnis einer Prüfung der Verbindung (Systemzustand)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: stündliche Prüfung und «Verbindung testen» bzw. «Jetzt prüfen»
CREATE TABLE endpoint_checks (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    inference_endpoint_id uuid NOT NULL REFERENCES inference_endpoints(id) ON DELETE CASCADE,   -- Betriebsort | Verweis
    checked_at          timestamptz NOT NULL DEFAULT now(),   -- Geprüft am | Zeitpunkt
    is_reachable        boolean NOT NULL,                -- Erreichbar | Schnittstelle antwortet
    latency_ms          integer,                         -- Antwortzeit (ms) | Messung
    gpu_load_percent    integer CHECK (gpu_load_percent BETWEEN 0 AND 100),   -- GPU-Auslastung (%) | nur bei eigener Hardware
    message             text                             -- Meldung | Fehlertext
);

-- Modell im Katalog (offene Gewichte)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Verwaltung › Modelle; neue Modelle sind ausgeschaltet, bis sie geprüft sind
CREATE TABLE models (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    model_identifier    text NOT NULL,                   -- Kennung | z. B. Name bei Hugging Face; wird an die Schnittstelle übergeben
    name                text NOT NULL,                   -- Anzeigename | Auswahl im Chat
    origin              text,                            -- Herkunft | Organisation · Land
    license             text,                            -- Lizenz | laut Modellkarte
    parameter_size      text,                            -- Grösse | Parameter
    context_tokens      integer,                         -- Kontext (Tokens) | maximale Länge
    model_card_url      text,                            -- Modellkarte | Quelle
    purpose             text NOT NULL DEFAULT 'chat' CHECK (purpose IN ('chat','embedding','transcription')),   -- Zweck | Einsatz | chat=Chat; embedding=Suchindex; transcription=Sprache zu Text
    description         text,                            -- Beschreibung | Anzeige im Katalog
    is_enabled          boolean NOT NULL DEFAULT false,  -- Freigeschaltet | im Chat wählbar
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (organization_id, model_identifier)
);

-- Fähigkeit eines Modells
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Katalog; steuert z. B. Bildanhänge und Werkzeugnutzung
CREATE TABLE model_capabilities (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    model_id            uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,   -- Modell | Verweis
    capability          text NOT NULL CHECK (capability IN ('text','reasoning','code','vision','multilingual','fast','tools','embedding','speech')),   -- Fähigkeit | Anzeige und Steuerung | text=Text; reasoning=Denkmodus; code=Code; vision=Bildverständnis; multilingual=mehrsprachig; fast=schnell; tools=Werkzeuge; embedding=Suchindex; speech=Sprache zu Text
    UNIQUE (model_id, capability)
);

-- Bereitstellung: Modell läuft auf einem Betriebsort
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «Läuft auf» im Katalog; Weiterleitung wählt den zulässigen Ort (interner Server zuerst)
CREATE TABLE model_deployments (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    model_id            uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,   -- Modell | Verweis
    inference_endpoint_id uuid NOT NULL REFERENCES inference_endpoints(id) ON DELETE CASCADE,   -- Betriebsort | Verweis
    remote_model_name   text,                            -- Name beim Betriebsort | falls abweichend von der Kennung
    priority            integer NOT NULL DEFAULT 100,    -- Reihenfolge | kleiner = bevorzugt
    UNIQUE (model_id, inference_endpoint_id)
);

-- Standardmodell je Schutzbedarf
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Verwaltung › Modelle › Standardmodell; für neue Unterhaltungen und Personen ohne Modellwahl
CREATE TABLE default_models (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    protection_level    text NOT NULL CHECK (protection_level IN ('public','internal','confidential','sensitive')),   -- Schutzbedarf | Stufe | public=öffentlich; internal=intern; confidential=vertraulich; sensitive=besonders schützenswert
    model_id            uuid NOT NULL REFERENCES models(id),   -- Modell | Standard für diese Stufe
    UNIQUE (organization_id, protection_level)
);

-- Werkzeug, das ein Modell während einer Antwort nutzen darf (intern, Websuche, MCP-Anbindung)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Verwaltung › Werkzeuge; Anbindungen an EduKSX-Module über das Model Context Protocol
CREATE TABLE tools (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    name                text NOT NULL,                   -- Name | Anzeige
    tool_kind           text NOT NULL CHECK (tool_kind IN ('internal','external','eduksx','mcp')),   -- Art | Herkunft | internal=intern; external=verlässt die Schule; eduksx=EduKSX-Modul; mcp=andere MCP-Anbindung
    description         text,                            -- Beschreibung | Zweck
    server_url          text,                            -- Adresse | MCP-Server
    secret_reference    text,                            -- Zugangsschlüssel | Verweis in den Tresor
    max_protection_level text NOT NULL DEFAULT 'public' CHECK (max_protection_level IN ('public','internal','confidential','sensitive')),   -- Zulässig bis | höchster Schutzbedarf | public=öffentlich; internal=intern; confidential=vertraulich; sensitive=besonders schützenswert
    is_enabled          boolean NOT NULL DEFAULT false,  -- Eingeschaltet | nutzbar
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- ------------------------------------------------------------------ Wissen und Assistenten

-- Wissenssammlung (Dokumente für Antworten mit Quellen)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Seite «Wissen»; Suchindex immer auf dem internen Server
CREATE TABLE knowledge_collections (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    owner_id            uuid NOT NULL REFERENCES users(id),   -- Verantwortlich | Person
    name                text NOT NULL,                   -- Sammlung | Name
    description         text,                            -- Beschreibung | Anzeige
    protection_level    text NOT NULL DEFAULT 'internal' CHECK (protection_level IN ('public','internal','confidential','sensitive')),   -- Schutzbedarf | nur in Unterhaltungen mit mindestens gleicher Stufe wählbar | public=öffentlich; internal=intern; confidential=vertraulich; sensitive=besonders schützenswert
    sharing_scope       text NOT NULL DEFAULT 'private' CHECK (sharing_scope IN ('private','groups','organization')),   -- Freigabe | wer die Sammlung sieht | private=nur ich; groups=ausgewählte Gruppen; organization=ganze Organisation
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- Datei einer Wissenssammlung
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «Dateien hinzufügen»; Inhalt im Objektspeicher (Schweiz)
CREATE TABLE knowledge_files (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    knowledge_collection_id uuid NOT NULL REFERENCES knowledge_collections(id) ON DELETE CASCADE,   -- Sammlung | Verweis
    file_name           text NOT NULL,                   -- Datei | Name
    mime_type           text NOT NULL,                   -- MIME-Typ | technischer Dateityp
    size_bytes          bigint NOT NULL,                 -- Grösse | Bytes
    storage_key         text NOT NULL,                   -- Speicherort | Objekt im Objektspeicher
    sha256              char(64) NOT NULL,               -- Prüfsumme | SHA-256, verhindert Doppelte
    index_status        text NOT NULL DEFAULT 'pending' CHECK (index_status IN ('pending','indexing','indexed','no_text','failed')),   -- Status | Suchindex | pending=wartet; indexing=wird indexiert; indexed=indexiert; no_text=ohne Text; failed=Fehler
    chunk_count         integer NOT NULL DEFAULT 0,      -- Abschnitte | im Suchindex
    indexed_at          timestamptz,                     -- Indexiert am | Zeitpunkt
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (knowledge_collection_id, sha256)
);

-- Abschnitt einer Datei mit Vektor (Suchindex)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Indexierung mit dem Einbettungsmodell; Quelle in Antworten
CREATE TABLE knowledge_chunks (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    knowledge_file_id   uuid NOT NULL REFERENCES knowledge_files(id) ON DELETE CASCADE,   -- Datei | Verweis
    position            integer NOT NULL,                -- Reihenfolge | in der Datei
    location_label      text,                            -- Stelle | z. B. «Seite 3» oder «Abschnitt 2»
    content             text NOT NULL,                   -- Text | Abschnitt
    embedding_model_id  uuid NOT NULL REFERENCES models(id),   -- Einbettungsmodell | mit dem der Vektor erzeugt wurde
    embedding           bytea NOT NULL,                  -- Vektor | im Entwurf als Bytes; in der Umsetzung Typ «vector» (pgvector, ZU PRÜFEN)
    UNIQUE (knowledge_file_id, position)
);

-- Assistent: feste Anweisungen, Modell und Wissen für wiederkehrende Aufgaben
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Seite «Assistenten»; Import/Export als JSON «eduksx-ai-assistant/1»
CREATE TABLE assistants (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    owner_id            uuid NOT NULL REFERENCES users(id),   -- Erstellt von | Person
    name                text NOT NULL,                   -- Name | Anzeige
    symbol              text,                            -- Symbol | ein bis zwei Zeichen
    description         text,                            -- Kurzbeschreibung | Anzeige
    instructions        text CHECK (char_length(instructions) <= 4000),   -- Anweisungen | an das Modell
    model_id            uuid REFERENCES models(id) ON DELETE SET NULL,   -- Modell | leer = Standardmodell
    protection_level    text NOT NULL DEFAULT 'internal' CHECK (protection_level IN ('public','internal','confidential','sensitive')),   -- Schutzbedarf | für Unterhaltungen mit dem Assistenten | public=öffentlich; internal=intern; confidential=vertraulich; sensitive=besonders schützenswert
    web_search          boolean NOT NULL DEFAULT false,  -- Websuche | erlaubt (nur bei «öffentlich»)
    starters            text[] NOT NULL DEFAULT '{}',    -- Gesprächsanfänge | Vorschläge, höchstens sechs
    sharing_scope       text NOT NULL DEFAULT 'private' CHECK (sharing_scope IN ('private','groups','organization')),   -- Freigabe | wer den Assistenten sieht | private=nur ich; groups=ausgewählte Gruppen; organization=ganze Organisation
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- Wissenssammlung eines Assistenten
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Editor des Assistenten › Wissen
CREATE TABLE assistant_collections (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    assistant_id        uuid NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,   -- Assistent | Verweis
    knowledge_collection_id uuid NOT NULL REFERENCES knowledge_collections(id) ON DELETE CASCADE,   -- Sammlung | Verweis
    UNIQUE (assistant_id, knowledge_collection_id)
);

-- Freigabe eines Assistenten oder einer Sammlung an eine Gruppe (bei Freigabe «ausgewählte Gruppen»)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Feld «Freigabe» bei Assistent und Sammlung
CREATE TABLE group_shares (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_group_id       uuid NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,   -- Gruppe | Empfängerin
    assistant_id        uuid REFERENCES assistants(id) ON DELETE CASCADE,   -- Assistent | freigegeben
    knowledge_collection_id uuid REFERENCES knowledge_collections(id) ON DELETE CASCADE,   -- Sammlung | freigegeben
    CHECK (num_nonnulls(assistant_id, knowledge_collection_id) = 1)
);

-- Favorit einer Person
-- Geltungsbereich: persönlich · Datenklasse: intern
-- Herkunft/Verwendung: Stern bei Assistenten
CREATE TABLE favorites (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Person | Besitzerin bzw. Besitzer
    assistant_id        uuid NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,   -- Assistent | markiert
    UNIQUE (user_id, assistant_id)
);

-- ------------------------------------------------------------------ Unterhaltungen

-- Unterhaltung (Chat) einer Person
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Seite «Chat»; nach der Aufbewahrungsfrist gelöscht (angeheftete ausgenommen)
CREATE TABLE conversations (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Person | Besitzerin bzw. Besitzer | intern
    title               text NOT NULL,                   -- Titel | aus der ersten Nachricht oder umbenannt
    model_id            uuid REFERENCES models(id) ON DELETE SET NULL,   -- Modell | gewählt | intern
    assistant_id        uuid REFERENCES assistants(id) ON DELETE SET NULL,   -- Assistent | falls mit Assistent gestartet | intern
    protection_level    text NOT NULL CHECK (protection_level IN ('public','internal','confidential','sensitive')),   -- Schutzbedarf | bestimmt zulässige Betriebsorte | intern | public=öffentlich; internal=intern; confidential=vertraulich; sensitive=besonders schützenswert
    is_pinned           boolean NOT NULL DEFAULT false,  -- Angeheftet | von der Löschfrist ausgenommen | intern
    last_activity_at    timestamptz NOT NULL DEFAULT now(),   -- Letzte Änderung | Sortierung und Löschfrist | intern
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- Gewählte Wissenssammlung einer Unterhaltung
-- Geltungsbereich: persönlich · Datenklasse: intern
-- Herkunft/Verwendung: Knopf «Wissen» im Chat
CREATE TABLE conversation_collections (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,   -- Unterhaltung | Verweis
    knowledge_collection_id uuid NOT NULL REFERENCES knowledge_collections(id) ON DELETE CASCADE,   -- Sammlung | Verweis
    UNIQUE (conversation_id, knowledge_collection_id)
);

-- Nachricht einer Unterhaltung (Frage oder Antwort)
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Chat; Antworten mit Modell, Betriebsort und Verbrauch
CREATE TABLE messages (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,   -- Unterhaltung | Verweis | intern
    position            integer NOT NULL,                -- Reihenfolge | in der Unterhaltung | intern
    author_role         text NOT NULL CHECK (author_role IN ('user','assistant')),   -- Von | wer schreibt | intern | user=Person; assistant=Modell
    content             text NOT NULL,                   -- Inhalt | Text (Markdown)
    model_id            uuid REFERENCES models(id) ON DELETE SET NULL,   -- Modell | bei Antworten | intern
    inference_endpoint_id uuid REFERENCES inference_endpoints(id) ON DELETE SET NULL,   -- Betriebsort | wo die Antwort entstand | intern
    tools_used          text[] NOT NULL DEFAULT '{}',    -- Werkzeuge | genutzt, z. B. «EduKSX-Codex» | intern
    input_tokens        integer,                         -- Tokens Eingabe | Verbrauch | intern
    output_tokens       integer,                         -- Tokens Antwort | Verbrauch | intern
    duration_ms         integer,                         -- Dauer (ms) | bis zur vollständigen Antwort | intern
    finish_reason       text CHECK (finish_reason IN ('complete','stopped','error')),   -- Ende | wie die Antwort endete | intern | complete=vollständig; stopped=abgebrochen; error=Fehler
    feedback            text CHECK (feedback IN ('helpful','not_helpful')),   -- Rückmeldung | Daumen | intern | helpful=hilfreich; not_helpful=nicht hilfreich
    feedback_reason     text CHECK (feedback_reason IN ('wrong','incomplete','tone','sources','other')),   -- Grund | bei «nicht hilfreich» | intern | wrong=inhaltlich falsch; incomplete=unvollständig; tone=Ton oder Stil; sources=Quellen; other=anderes
    feedback_comment    text,                            -- Bemerkung | freiwillig
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (conversation_id, position)
);

-- Anhang einer Nachricht
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Knopf «Anhang» im Chat; Inhalt im Objektspeicher, gelöscht mit der Unterhaltung
CREATE TABLE message_attachments (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    message_id          uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,   -- Nachricht | Verweis | intern
    file_name           text NOT NULL,                   -- Datei | Name
    mime_type           text NOT NULL,                   -- MIME-Typ | technischer Dateityp | intern
    size_bytes          bigint NOT NULL,                 -- Grösse | Bytes | intern
    storage_key         text NOT NULL                    -- Speicherort | Objekt im Objektspeicher | intern
);

-- Quelle einer Antwort (Abschnitt aus einer Wissenssammlung)
-- Geltungsbereich: persönlich · Datenklasse: intern
-- Herkunft/Verwendung: Liste «Quellen» unter der Antwort
CREATE TABLE message_sources (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    message_id          uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,   -- Nachricht | Antwort
    position            integer NOT NULL,                -- Nummer | [1], [2] … im Text
    knowledge_chunk_id  uuid REFERENCES knowledge_chunks(id) ON DELETE SET NULL,   -- Abschnitt | Verweis; leer, wenn gelöscht
    file_name           text NOT NULL,                   -- Datei | Stand bei der Antwort
    location_label      text,                            -- Stelle | z. B. «Abschnitt 2»
    UNIQUE (message_id, position)
);

-- ------------------------------------------------------------------ Protokoll

-- Metadaten einer Anfrage an ein Modell (nie Inhalte)
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Gateway bei jeder Anfrage, wenn Protokollierung «nur Metadaten»; Systemzustand › Nutzung; Löschung nach der Aufbewahrungsfrist
CREATE TABLE usage_events (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid REFERENCES users(id) ON DELETE SET NULL,   -- Person | wer angefragt hat
    occurred_at         timestamptz NOT NULL DEFAULT now(),   -- Zeitpunkt | Anfrage | intern
    model_id            uuid REFERENCES models(id) ON DELETE SET NULL,   -- Modell | Verweis | intern
    inference_endpoint_id uuid REFERENCES inference_endpoints(id) ON DELETE SET NULL,   -- Betriebsort | Verweis | intern
    protection_level    text NOT NULL CHECK (protection_level IN ('public','internal','confidential','sensitive')),   -- Schutzbedarf | der Unterhaltung | intern | public=öffentlich; internal=intern; confidential=vertraulich; sensitive=besonders schützenswert
    input_tokens        integer NOT NULL DEFAULT 0,      -- Tokens Eingabe | Verbrauch | intern
    output_tokens       integer NOT NULL DEFAULT 0,      -- Tokens Antwort | Verbrauch | intern
    duration_ms         integer,                         -- Dauer (ms) | Messung | intern
    outcome             text NOT NULL CHECK (outcome IN ('ok','stopped','error','blocked')),   -- Ergebnis | Ausgang | intern | ok=beantwortet; stopped=abgebrochen; error=Fehler; blocked=abgewiesen (kein zulässiger Betriebsort)
    personal_data_hint  boolean NOT NULL DEFAULT false   -- Personendaten-Hinweis | Prüfung hat angeschlagen | intern
);

-- Ausnahmetabelle (doppelt gespeichert, DB A2)
-- message_sources.file_name: Dateiname auch bei vorhandenem Abschnitt – Grund: Quelle bleibt lesbar, wenn die Datei gelöscht wird
-- messages.content: Inhalt der Antwort – Grund: Verlauf; keine Ableitung möglich

-- >>> indizes
CREATE INDEX organizations_parent_id_index ON organizations (parent_id);
CREATE INDEX users_organization_id_index ON users (organization_id);
CREATE INDEX school_holidays_organization_id_index ON school_holidays (organization_id);
CREATE INDEX school_holidays_school_year_id_index ON school_holidays (school_year_id);
CREATE INDEX role_permissions_organization_id_index ON role_permissions (organization_id);
CREATE INDEX user_accounts_user_id_index ON user_accounts (user_id);
CREATE INDEX user_accounts_role_id_index ON user_accounts (role_id);
CREATE INDEX user_group_members_organization_id_index ON user_group_members (organization_id);
CREATE INDEX user_group_members_user_id_index ON user_group_members (user_id);
CREATE INDEX inference_endpoints_organization_id_index ON inference_endpoints (organization_id);
CREATE INDEX inference_endpoints_approved_by_id_index ON inference_endpoints (approved_by_id);
CREATE INDEX endpoint_checks_organization_id_index ON endpoint_checks (organization_id);
CREATE INDEX endpoint_checks_inference_endpoint_id_index ON endpoint_checks (inference_endpoint_id);
CREATE INDEX model_capabilities_organization_id_index ON model_capabilities (organization_id);
CREATE INDEX model_deployments_organization_id_index ON model_deployments (organization_id);
CREATE INDEX model_deployments_inference_endpoint_id_index ON model_deployments (inference_endpoint_id);
CREATE INDEX default_models_model_id_index ON default_models (model_id);
CREATE INDEX tools_organization_id_index ON tools (organization_id);
CREATE INDEX knowledge_collections_organization_id_index ON knowledge_collections (organization_id);
CREATE INDEX knowledge_collections_owner_id_index ON knowledge_collections (owner_id);
CREATE INDEX knowledge_files_organization_id_index ON knowledge_files (organization_id);
CREATE INDEX knowledge_chunks_organization_id_index ON knowledge_chunks (organization_id);
CREATE INDEX knowledge_chunks_embedding_model_id_index ON knowledge_chunks (embedding_model_id);
CREATE INDEX assistants_organization_id_index ON assistants (organization_id);
CREATE INDEX assistants_owner_id_index ON assistants (owner_id);
CREATE INDEX assistants_model_id_index ON assistants (model_id);
CREATE INDEX assistant_collections_organization_id_index ON assistant_collections (organization_id);
CREATE INDEX assistant_collections_knowledge_collection_id_index ON assistant_collections (knowledge_collection_id);
CREATE INDEX group_shares_organization_id_index ON group_shares (organization_id);
CREATE INDEX group_shares_user_group_id_index ON group_shares (user_group_id);
CREATE INDEX group_shares_assistant_id_index ON group_shares (assistant_id);
CREATE INDEX group_shares_knowledge_collection_id_index ON group_shares (knowledge_collection_id);
CREATE INDEX favorites_organization_id_index ON favorites (organization_id);
CREATE INDEX favorites_assistant_id_index ON favorites (assistant_id);
CREATE INDEX conversations_organization_id_index ON conversations (organization_id);
CREATE INDEX conversations_user_id_index ON conversations (user_id);
CREATE INDEX conversations_model_id_index ON conversations (model_id);
CREATE INDEX conversations_assistant_id_index ON conversations (assistant_id);
CREATE INDEX conversation_collections_organization_id_index ON conversation_collections (organization_id);
CREATE INDEX conversation_collections_knowledge_collection_id_index ON conversation_collections (knowledge_collection_id);
CREATE INDEX messages_organization_id_index ON messages (organization_id);
CREATE INDEX messages_model_id_index ON messages (model_id);
CREATE INDEX messages_inference_endpoint_id_index ON messages (inference_endpoint_id);
CREATE INDEX message_attachments_organization_id_index ON message_attachments (organization_id);
CREATE INDEX message_attachments_message_id_index ON message_attachments (message_id);
CREATE INDEX message_sources_organization_id_index ON message_sources (organization_id);
CREATE INDEX message_sources_knowledge_chunk_id_index ON message_sources (knowledge_chunk_id);
CREATE INDEX usage_events_organization_id_index ON usage_events (organization_id);
CREATE INDEX usage_events_user_id_index ON usage_events (user_id);
CREATE INDEX usage_events_model_id_index ON usage_events (model_id);
CREATE INDEX usage_events_inference_endpoint_id_index ON usage_events (inference_endpoint_id);
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
COMMENT ON TABLE ai_settings IS 'Einstellungen der KI-Plattform je Organisation (Angaben für Briefe, Datenschutzregeln) – Verwaltung › Organisation und › Datenschutz; Hinweis wird jeder Unterhaltung vorangestellt';
COMMENT ON COLUMN ai_settings.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN ai_settings.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN ai_settings.display_name IS 'Name der Organisation – in Briefen und Antworten';
COMMENT ON COLUMN ai_settings.postal_address IS 'Postadresse – in Briefen';
COMMENT ON COLUMN ai_settings.phone IS 'Telefon Sekretariat – in Briefen';
COMMENT ON COLUMN ai_settings.email IS 'E-Mail Sekretariat – in Briefen';
COMMENT ON COLUMN ai_settings.website IS 'Website – in Antworten';
COMMENT ON COLUMN ai_settings.model_instructions IS 'Hinweis an das Modell – Ton, Schreibweise, Regeln; jeder Unterhaltung vorangestellt';
COMMENT ON COLUMN ai_settings.retention_days IS 'Aufbewahrung (Tage) – Unterhaltungen ohne Änderung werden danach gelöscht';
COMMENT ON COLUMN ai_settings.default_protection_level IS 'Schutzbedarf neuer Unterhaltungen – Vorgabe';
COMMENT ON COLUMN ai_settings.usage_logging IS 'Protokollierung – nie Inhalte';
COMMENT ON COLUMN ai_settings.personal_data_check IS 'Personendaten prüfen – vor dem Senden Schutzbedarf vorschlagen';
COMMENT ON COLUMN ai_settings.show_error_notice IS 'Hinweis «KI kann Fehler machen» – im Chat anzeigen';
COMMENT ON COLUMN ai_settings.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN ai_settings.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN ai_settings.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN ai_settings.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN ai_settings.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE roles IS 'Rolle mit Rechten (Administration ist fest und hat immer alle Rechte) – Verwaltung › Rollen & Rechte';
COMMENT ON COLUMN roles.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN roles.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN roles.role_key IS 'Schlüssel – z. B. «admin», «editor», «staff», «learner»';
COMMENT ON COLUMN roles.name IS 'Name – Anzeige';
COMMENT ON COLUMN roles.description IS 'Beschreibung – Anzeige';
COMMENT ON COLUMN roles.is_fixed IS 'Fest – nicht änderbar (Administration)';
COMMENT ON COLUMN roles.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN roles.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN roles.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN roles.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN roles.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN roles.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN roles.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE role_permissions IS 'Recht einer Rolle – Matrix in Verwaltung › Rollen & Rechte';
COMMENT ON COLUMN role_permissions.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN role_permissions.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN role_permissions.role_id IS 'Rolle – Verweis';
COMMENT ON COLUMN role_permissions.permission IS 'Recht – was die Rolle darf';
COMMENT ON TABLE user_accounts IS 'Rolle, Sperre und Aktivität einer Person in EduKSX-AI (Konto selbst aus EduKSX-Ident) – Verwaltung › Benutzer & Gruppen; Konten aus dem Abgleich mit EduKSX-Ident';
COMMENT ON COLUMN user_accounts.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN user_accounts.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN user_accounts.user_id IS 'Person – Konto aus EduKSX-Ident';
COMMENT ON COLUMN user_accounts.role_id IS 'Rolle – Rechte';
COMMENT ON COLUMN user_accounts.is_blocked IS 'Gesperrt – kein Zugang';
COMMENT ON COLUMN user_accounts.last_active_at IS 'Zuletzt aktiv – Anzeige';
COMMENT ON COLUMN user_accounts.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN user_accounts.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN user_accounts.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN user_accounts.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN user_accounts.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE user_groups IS 'Gruppe von Personen für Freigaben – Verwaltung › Benutzer & Gruppen › Gruppen; steuert, wer Assistenten und Sammlungen sieht';
COMMENT ON COLUMN user_groups.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN user_groups.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN user_groups.name IS 'Gruppe – Name';
COMMENT ON COLUMN user_groups.description IS 'Beschreibung – Anzeige';
COMMENT ON COLUMN user_groups.source IS 'Herkunft – wer die Gruppe pflegt';
COMMENT ON COLUMN user_groups.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN user_groups.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN user_groups.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN user_groups.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN user_groups.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN user_groups.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN user_groups.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE user_group_members IS 'Mitgliedschaft einer Person in einer Gruppe – Dialog «Gruppen» bei einer Person';
COMMENT ON COLUMN user_group_members.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN user_group_members.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN user_group_members.user_group_id IS 'Gruppe – Verweis';
COMMENT ON COLUMN user_group_members.user_id IS 'Person – Mitglied';
COMMENT ON TABLE inference_endpoints IS 'Betriebsort: Ort, an dem Modelle rechnen (interner Server oder geprüfter Anbieter) – Verwaltung › Betriebsorte; nur freigegebene, aktive Orte erhalten Anfragen, und nur bis zum Schutzbedarf «max_protection_level»';
COMMENT ON COLUMN inference_endpoints.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN inference_endpoints.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN inference_endpoints.name IS 'Name – Anzeige';
COMMENT ON COLUMN inference_endpoints.endpoint_kind IS 'Art – Betriebsmodell';
COMMENT ON COLUMN inference_endpoints.location IS 'Standort – Rechenzentren';
COMMENT ON COLUMN inference_endpoints.base_url IS 'Adresse – OpenAI-kompatible Schnittstelle (…/v1)';
COMMENT ON COLUMN inference_endpoints.api_style IS 'Schnittstelle – Protokoll';
COMMENT ON COLUMN inference_endpoints.secret_reference IS 'Zugangsschlüssel – Verweis in den Tresor, nie der Schlüssel selbst';
COMMENT ON COLUMN inference_endpoints.infrastructure IS 'Infrastruktur – z. B. GPU-Ausstattung';
COMMENT ON COLUMN inference_endpoints.certifications IS 'Nachweise – Zertifizierungen, Rechtsgrundlage';
COMMENT ON COLUMN inference_endpoints.subject_to_cloud_act IS 'US CLOUD Act – Anbieter betroffen';
COMMENT ON COLUMN inference_endpoints.dpa_status IS 'Vertrag (ADV) – Auftragsdatenbearbeitung';
COMMENT ON COLUMN inference_endpoints.max_protection_level IS 'Zulässig bis – höchster Schutzbedarf';
COMMENT ON COLUMN inference_endpoints.approval_status IS 'Freigabe – nach Datenschutzprüfung';
COMMENT ON COLUMN inference_endpoints.approved_on IS 'Geprüft am – Datum der Freigabe';
COMMENT ON COLUMN inference_endpoints.approved_by_id IS 'Geprüft von – Person';
COMMENT ON COLUMN inference_endpoints.is_active IS 'Aktiv – Modelle dürfen den Ort nutzen';
COMMENT ON COLUMN inference_endpoints.provider_url IS 'Website des Anbieters – Quelle';
COMMENT ON COLUMN inference_endpoints.remarks IS 'Bemerkung – Ergebnis der Prüfung';
COMMENT ON COLUMN inference_endpoints.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN inference_endpoints.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN inference_endpoints.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN inference_endpoints.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN inference_endpoints.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN inference_endpoints.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN inference_endpoints.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE endpoint_checks IS 'Ergebnis einer Prüfung der Verbindung (Systemzustand) – stündliche Prüfung und «Verbindung testen» bzw. «Jetzt prüfen»';
COMMENT ON COLUMN endpoint_checks.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN endpoint_checks.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN endpoint_checks.inference_endpoint_id IS 'Betriebsort – Verweis';
COMMENT ON COLUMN endpoint_checks.checked_at IS 'Geprüft am – Zeitpunkt';
COMMENT ON COLUMN endpoint_checks.is_reachable IS 'Erreichbar – Schnittstelle antwortet';
COMMENT ON COLUMN endpoint_checks.latency_ms IS 'Antwortzeit (ms) – Messung';
COMMENT ON COLUMN endpoint_checks.gpu_load_percent IS 'GPU-Auslastung (%) – nur bei eigener Hardware';
COMMENT ON COLUMN endpoint_checks.message IS 'Meldung – Fehlertext';
COMMENT ON TABLE models IS 'Modell im Katalog (offene Gewichte) – Verwaltung › Modelle; neue Modelle sind ausgeschaltet, bis sie geprüft sind';
COMMENT ON COLUMN models.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN models.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN models.model_identifier IS 'Kennung – z. B. Name bei Hugging Face; wird an die Schnittstelle übergeben';
COMMENT ON COLUMN models.name IS 'Anzeigename – Auswahl im Chat';
COMMENT ON COLUMN models.origin IS 'Herkunft – Organisation · Land';
COMMENT ON COLUMN models.license IS 'Lizenz – laut Modellkarte';
COMMENT ON COLUMN models.parameter_size IS 'Grösse – Parameter';
COMMENT ON COLUMN models.context_tokens IS 'Kontext (Tokens) – maximale Länge';
COMMENT ON COLUMN models.model_card_url IS 'Modellkarte – Quelle';
COMMENT ON COLUMN models.purpose IS 'Zweck – Einsatz';
COMMENT ON COLUMN models.description IS 'Beschreibung – Anzeige im Katalog';
COMMENT ON COLUMN models.is_enabled IS 'Freigeschaltet – im Chat wählbar';
COMMENT ON COLUMN models.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN models.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN models.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN models.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN models.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN models.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN models.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE model_capabilities IS 'Fähigkeit eines Modells – Katalog; steuert z. B. Bildanhänge und Werkzeugnutzung';
COMMENT ON COLUMN model_capabilities.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN model_capabilities.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN model_capabilities.model_id IS 'Modell – Verweis';
COMMENT ON COLUMN model_capabilities.capability IS 'Fähigkeit – Anzeige und Steuerung';
COMMENT ON TABLE model_deployments IS 'Bereitstellung: Modell läuft auf einem Betriebsort – «Läuft auf» im Katalog; Weiterleitung wählt den zulässigen Ort (interner Server zuerst)';
COMMENT ON COLUMN model_deployments.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN model_deployments.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN model_deployments.model_id IS 'Modell – Verweis';
COMMENT ON COLUMN model_deployments.inference_endpoint_id IS 'Betriebsort – Verweis';
COMMENT ON COLUMN model_deployments.remote_model_name IS 'Name beim Betriebsort – falls abweichend von der Kennung';
COMMENT ON COLUMN model_deployments.priority IS 'Reihenfolge';
COMMENT ON TABLE default_models IS 'Standardmodell je Schutzbedarf – Verwaltung › Modelle › Standardmodell; für neue Unterhaltungen und Personen ohne Modellwahl';
COMMENT ON COLUMN default_models.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN default_models.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN default_models.protection_level IS 'Schutzbedarf – Stufe';
COMMENT ON COLUMN default_models.model_id IS 'Modell – Standard für diese Stufe';
COMMENT ON TABLE tools IS 'Werkzeug, das ein Modell während einer Antwort nutzen darf (intern, Websuche, MCP-Anbindung) – Verwaltung › Werkzeuge; Anbindungen an EduKSX-Module über das Model Context Protocol';
COMMENT ON COLUMN tools.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN tools.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN tools.name IS 'Name – Anzeige';
COMMENT ON COLUMN tools.tool_kind IS 'Art – Herkunft';
COMMENT ON COLUMN tools.description IS 'Beschreibung – Zweck';
COMMENT ON COLUMN tools.server_url IS 'Adresse – MCP-Server';
COMMENT ON COLUMN tools.secret_reference IS 'Zugangsschlüssel – Verweis in den Tresor';
COMMENT ON COLUMN tools.max_protection_level IS 'Zulässig bis – höchster Schutzbedarf';
COMMENT ON COLUMN tools.is_enabled IS 'Eingeschaltet – nutzbar';
COMMENT ON COLUMN tools.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN tools.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN tools.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN tools.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN tools.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN tools.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN tools.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE knowledge_collections IS 'Wissenssammlung (Dokumente für Antworten mit Quellen) – Seite «Wissen»; Suchindex immer auf dem internen Server';
COMMENT ON COLUMN knowledge_collections.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN knowledge_collections.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN knowledge_collections.owner_id IS 'Verantwortlich – Person';
COMMENT ON COLUMN knowledge_collections.name IS 'Sammlung – Name';
COMMENT ON COLUMN knowledge_collections.description IS 'Beschreibung – Anzeige';
COMMENT ON COLUMN knowledge_collections.protection_level IS 'Schutzbedarf – nur in Unterhaltungen mit mindestens gleicher Stufe wählbar';
COMMENT ON COLUMN knowledge_collections.sharing_scope IS 'Freigabe – wer die Sammlung sieht';
COMMENT ON COLUMN knowledge_collections.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN knowledge_collections.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN knowledge_collections.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN knowledge_collections.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN knowledge_collections.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN knowledge_collections.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN knowledge_collections.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE knowledge_files IS 'Datei einer Wissenssammlung – «Dateien hinzufügen»; Inhalt im Objektspeicher (Schweiz)';
COMMENT ON COLUMN knowledge_files.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN knowledge_files.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN knowledge_files.knowledge_collection_id IS 'Sammlung – Verweis';
COMMENT ON COLUMN knowledge_files.file_name IS 'Datei – Name';
COMMENT ON COLUMN knowledge_files.mime_type IS 'MIME-Typ – technischer Dateityp';
COMMENT ON COLUMN knowledge_files.size_bytes IS 'Grösse – Bytes';
COMMENT ON COLUMN knowledge_files.storage_key IS 'Speicherort – Objekt im Objektspeicher';
COMMENT ON COLUMN knowledge_files.sha256 IS 'Prüfsumme – SHA-256, verhindert Doppelte';
COMMENT ON COLUMN knowledge_files.index_status IS 'Status – Suchindex';
COMMENT ON COLUMN knowledge_files.chunk_count IS 'Abschnitte – im Suchindex';
COMMENT ON COLUMN knowledge_files.indexed_at IS 'Indexiert am – Zeitpunkt';
COMMENT ON COLUMN knowledge_files.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN knowledge_files.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN knowledge_files.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN knowledge_files.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN knowledge_files.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN knowledge_files.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN knowledge_files.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE knowledge_chunks IS 'Abschnitt einer Datei mit Vektor (Suchindex) – Indexierung mit dem Einbettungsmodell; Quelle in Antworten';
COMMENT ON COLUMN knowledge_chunks.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN knowledge_chunks.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN knowledge_chunks.knowledge_file_id IS 'Datei – Verweis';
COMMENT ON COLUMN knowledge_chunks.position IS 'Reihenfolge – in der Datei';
COMMENT ON COLUMN knowledge_chunks.location_label IS 'Stelle – z. B. «Seite 3» oder «Abschnitt 2»';
COMMENT ON COLUMN knowledge_chunks.content IS 'Text – Abschnitt';
COMMENT ON COLUMN knowledge_chunks.embedding_model_id IS 'Einbettungsmodell – mit dem der Vektor erzeugt wurde';
COMMENT ON COLUMN knowledge_chunks.embedding IS 'Vektor – im Entwurf als Bytes; in der Umsetzung Typ «vector» (pgvector, ZU PRÜFEN)';
COMMENT ON TABLE assistants IS 'Assistent: feste Anweisungen, Modell und Wissen für wiederkehrende Aufgaben – Seite «Assistenten»; Import/Export als JSON «eduksx-ai-assistant/1»';
COMMENT ON COLUMN assistants.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN assistants.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN assistants.owner_id IS 'Erstellt von – Person';
COMMENT ON COLUMN assistants.name IS 'Name – Anzeige';
COMMENT ON COLUMN assistants.symbol IS 'Symbol – ein bis zwei Zeichen';
COMMENT ON COLUMN assistants.description IS 'Kurzbeschreibung – Anzeige';
COMMENT ON COLUMN assistants.instructions IS 'Anweisungen – an das Modell';
COMMENT ON COLUMN assistants.model_id IS 'Modell';
COMMENT ON COLUMN assistants.protection_level IS 'Schutzbedarf – für Unterhaltungen mit dem Assistenten';
COMMENT ON COLUMN assistants.web_search IS 'Websuche – erlaubt (nur bei «öffentlich»)';
COMMENT ON COLUMN assistants.starters IS 'Gesprächsanfänge – Vorschläge, höchstens sechs';
COMMENT ON COLUMN assistants.sharing_scope IS 'Freigabe – wer den Assistenten sieht';
COMMENT ON COLUMN assistants.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN assistants.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN assistants.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN assistants.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN assistants.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN assistants.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN assistants.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE assistant_collections IS 'Wissenssammlung eines Assistenten – Editor des Assistenten › Wissen';
COMMENT ON COLUMN assistant_collections.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN assistant_collections.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN assistant_collections.assistant_id IS 'Assistent – Verweis';
COMMENT ON COLUMN assistant_collections.knowledge_collection_id IS 'Sammlung – Verweis';
COMMENT ON TABLE group_shares IS 'Freigabe eines Assistenten oder einer Sammlung an eine Gruppe (bei Freigabe «ausgewählte Gruppen») – Feld «Freigabe» bei Assistent und Sammlung';
COMMENT ON COLUMN group_shares.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN group_shares.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN group_shares.user_group_id IS 'Gruppe – Empfängerin';
COMMENT ON COLUMN group_shares.assistant_id IS 'Assistent – freigegeben';
COMMENT ON COLUMN group_shares.knowledge_collection_id IS 'Sammlung – freigegeben';
COMMENT ON TABLE favorites IS 'Favorit einer Person – Stern bei Assistenten';
COMMENT ON COLUMN favorites.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN favorites.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN favorites.user_id IS 'Person – Besitzerin bzw. Besitzer';
COMMENT ON COLUMN favorites.assistant_id IS 'Assistent – markiert';
COMMENT ON TABLE conversations IS 'Unterhaltung (Chat) einer Person – Seite «Chat»; nach der Aufbewahrungsfrist gelöscht (angeheftete ausgenommen)';
COMMENT ON COLUMN conversations.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN conversations.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN conversations.user_id IS 'Person – Besitzerin bzw. Besitzer';
COMMENT ON COLUMN conversations.title IS 'Titel – aus der ersten Nachricht oder umbenannt';
COMMENT ON COLUMN conversations.model_id IS 'Modell – gewählt';
COMMENT ON COLUMN conversations.assistant_id IS 'Assistent – falls mit Assistent gestartet';
COMMENT ON COLUMN conversations.protection_level IS 'Schutzbedarf – bestimmt zulässige Betriebsorte';
COMMENT ON COLUMN conversations.is_pinned IS 'Angeheftet – von der Löschfrist ausgenommen';
COMMENT ON COLUMN conversations.last_activity_at IS 'Letzte Änderung – Sortierung und Löschfrist';
COMMENT ON COLUMN conversations.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN conversations.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN conversations.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN conversations.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN conversations.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN conversations.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN conversations.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE conversation_collections IS 'Gewählte Wissenssammlung einer Unterhaltung – Knopf «Wissen» im Chat';
COMMENT ON COLUMN conversation_collections.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN conversation_collections.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN conversation_collections.conversation_id IS 'Unterhaltung – Verweis';
COMMENT ON COLUMN conversation_collections.knowledge_collection_id IS 'Sammlung – Verweis';
COMMENT ON TABLE messages IS 'Nachricht einer Unterhaltung (Frage oder Antwort) – Chat; Antworten mit Modell, Betriebsort und Verbrauch';
COMMENT ON COLUMN messages.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN messages.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN messages.conversation_id IS 'Unterhaltung – Verweis';
COMMENT ON COLUMN messages.position IS 'Reihenfolge – in der Unterhaltung';
COMMENT ON COLUMN messages.author_role IS 'Von – wer schreibt';
COMMENT ON COLUMN messages.content IS 'Inhalt – Text (Markdown)';
COMMENT ON COLUMN messages.model_id IS 'Modell – bei Antworten';
COMMENT ON COLUMN messages.inference_endpoint_id IS 'Betriebsort – wo die Antwort entstand';
COMMENT ON COLUMN messages.tools_used IS 'Werkzeuge – genutzt, z. B. «EduKSX-Codex»';
COMMENT ON COLUMN messages.input_tokens IS 'Tokens Eingabe – Verbrauch';
COMMENT ON COLUMN messages.output_tokens IS 'Tokens Antwort – Verbrauch';
COMMENT ON COLUMN messages.duration_ms IS 'Dauer (ms) – bis zur vollständigen Antwort';
COMMENT ON COLUMN messages.finish_reason IS 'Ende – wie die Antwort endete';
COMMENT ON COLUMN messages.feedback IS 'Rückmeldung – Daumen';
COMMENT ON COLUMN messages.feedback_reason IS 'Grund – bei «nicht hilfreich»';
COMMENT ON COLUMN messages.feedback_comment IS 'Bemerkung – freiwillig';
COMMENT ON COLUMN messages.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON TABLE message_attachments IS 'Anhang einer Nachricht – Knopf «Anhang» im Chat; Inhalt im Objektspeicher, gelöscht mit der Unterhaltung';
COMMENT ON COLUMN message_attachments.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN message_attachments.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN message_attachments.message_id IS 'Nachricht – Verweis';
COMMENT ON COLUMN message_attachments.file_name IS 'Datei – Name';
COMMENT ON COLUMN message_attachments.mime_type IS 'MIME-Typ – technischer Dateityp';
COMMENT ON COLUMN message_attachments.size_bytes IS 'Grösse – Bytes';
COMMENT ON COLUMN message_attachments.storage_key IS 'Speicherort – Objekt im Objektspeicher';
COMMENT ON TABLE message_sources IS 'Quelle einer Antwort (Abschnitt aus einer Wissenssammlung) – Liste «Quellen» unter der Antwort';
COMMENT ON COLUMN message_sources.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN message_sources.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN message_sources.message_id IS 'Nachricht – Antwort';
COMMENT ON COLUMN message_sources.position IS 'Nummer – [1], [2] … im Text';
COMMENT ON COLUMN message_sources.knowledge_chunk_id IS 'Abschnitt – Verweis; leer, wenn gelöscht';
COMMENT ON COLUMN message_sources.file_name IS 'Datei – Stand bei der Antwort';
COMMENT ON COLUMN message_sources.location_label IS 'Stelle – z. B. «Abschnitt 2»';
COMMENT ON TABLE usage_events IS 'Metadaten einer Anfrage an ein Modell (nie Inhalte) – Gateway bei jeder Anfrage, wenn Protokollierung «nur Metadaten»; Systemzustand › Nutzung; Löschung nach der Aufbewahrungsfrist';
COMMENT ON COLUMN usage_events.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN usage_events.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN usage_events.user_id IS 'Person – wer angefragt hat';
COMMENT ON COLUMN usage_events.occurred_at IS 'Zeitpunkt – Anfrage';
COMMENT ON COLUMN usage_events.model_id IS 'Modell – Verweis';
COMMENT ON COLUMN usage_events.inference_endpoint_id IS 'Betriebsort – Verweis';
COMMENT ON COLUMN usage_events.protection_level IS 'Schutzbedarf – der Unterhaltung';
COMMENT ON COLUMN usage_events.input_tokens IS 'Tokens Eingabe – Verbrauch';
COMMENT ON COLUMN usage_events.output_tokens IS 'Tokens Antwort – Verbrauch';
COMMENT ON COLUMN usage_events.duration_ms IS 'Dauer (ms) – Messung';
COMMENT ON COLUMN usage_events.outcome IS 'Ergebnis – Ausgang';
COMMENT ON COLUMN usage_events.personal_data_hint IS 'Personendaten-Hinweis – Prüfung hat angeschlagen';
-- <<< kommentare
