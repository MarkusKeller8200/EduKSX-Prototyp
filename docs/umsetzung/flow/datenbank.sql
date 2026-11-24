-- EduKSX-Flow – Datenbankstruktur (Ablaufplanung / Termine und ToDo)
-- Stand 2026-11-20 · Status ENTWURF · DB-Standard 1.3 · Grundlage: Prototyp prototypen/ablaufplanung
-- Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert. Erzeugte Blöcke (>>> … <<<) nicht von Hand
-- ändern: python3 tools/umsetzung_bauen.py
--
-- Rollen und Funktionendiagramm, Vorgangsregister der Module, Ablaufvorlagen (versioniert) mit Schritten, laufende
-- Abläufe als Kopie der Vorlage, Aufrufprotokoll, Hinweise und Jahreskalender mit Zeitregeln. Fristen, «bereit» und
-- Kalendervorkommen berechnet der Motor; gespeichert wird nur der Zustand je Schritt eines laufenden Ablaufs.

CREATE SCHEMA IF NOT EXISTS flow;
SET search_path TO flow;

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

-- ------------------------------------------------------------------ Rollen, Funktionendiagramm, Quellen

-- Rolle in Abläufen oder im Jahreskalender (SV, SL, RV, ICT …)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Funktionendiagramm der Schulgemeinde; Zuständigkeit der Schritte und Termine
CREATE TABLE roles (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    code                text NOT NULL,                   -- Kürzel | z. B. «SV»
    name                text NOT NULL,                   -- Rolle | z. B. «Schulverwaltung»
    role_scope          text NOT NULL DEFAULT 'workflow' CHECK (role_scope IN ('workflow','calendar','both')),   -- Verwendung | Abläufe, Kalender oder beides | intern | workflow=Abläufe; calendar=Jahreskalender; both=beides
    superior_role_id    uuid REFERENCES roles(id),       -- Vorgesetzte Rolle | Empfänger der Eskalation Stufe 3 (Konzept E6 OFFEN)
    may_intervene       boolean NOT NULL DEFAULT false,  -- Prozessverantwortlich | darf in laufende Abläufe eingreifen (Konzept E5 OFFEN)
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, code)
);

-- Zuordnung Ablaufrolle → Kalenderrollen
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «Meine Termine» zeigt die Kalenderrollen der eigenen Ablaufrolle
CREATE TABLE role_calendar_roles (
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    role_id             uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,            -- Ablaufrolle | Verweis
    calendar_role_id    uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,            -- Kalenderrolle | Verweis
    PRIMARY KEY (role_id, calendar_role_id)
);

-- Aufgabe im Funktionendiagramm
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Funktionendiagramm der Schulgemeinde; Vorschlag der Zuständigkeit je Schritt
CREATE TABLE responsibility_tasks (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    number              text NOT NULL,                   -- Nummer | z. B. «5.2.2»
    title               text NOT NULL,                   -- Aufgabe | Text im Funktionendiagramm
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, number)
);

-- Kompetenz einer Rolle bei einer Aufgabe
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Funktionendiagramm; «V» wird verantwortlich, «I» informiert
CREATE TABLE responsibility_task_roles (
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    responsibility_task_id uuid NOT NULL REFERENCES responsibility_tasks(id) ON DELETE CASCADE,   -- Aufgabe | Verweis
    role_id             uuid NOT NULL REFERENCES roles(id),   -- Rolle | Verweis
    competence          text NOT NULL,                   -- Kompetenz | V verantwortlich, E entscheidet, A ausführen, M mitwirken, I informiert
    PRIMARY KEY (responsibility_task_id, role_id)
);

-- Quelle eines Schritts (Gesetz, Merkblatt, Prozessliste)
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Quellenverzeichnis der Vorlagen; Pflicht bei jedem Schritt
CREATE TABLE sources (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    code                text NOT NULL,                   -- Kürzel | z. B. «LPVO»
    title               text NOT NULL,                   -- Titel | vollständiger Titel
    url                 text,                            -- Adresse | Link zur Quelle
    codex_reference     text,                            -- Erlass in EduKSX-Codex | Verweis auf Erlass und Fassung
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, code)
);

-- ------------------------------------------------------------------ Vorgangsregister der Module

-- Modul, das Vorgänge anbietet
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: jedes Modul meldet sich im Vorgangsregister an; «Vorgänge der Module»
CREATE TABLE modules (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    module_key          text NOT NULL,                   -- Modulschlüssel | aus dem Modulregister, z. B. «ident»
    name                text NOT NULL,                   -- Modul | Anzeigename
    purpose             text,                            -- Aufgabe | Kurzbeschreibung
    endpoint_url        text,                            -- Adresse | Basis-URL der API
    is_reachable        boolean NOT NULL DEFAULT true,   -- Erreichbar | letzte Prüfung
    checked_at          timestamptz,                     -- Geprüft am | letzte Prüfung
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, module_key)
);

-- Vorgang eines Moduls mit Parametern und Ergebnissen
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: gemeldet vom Modul; ein Schritt ruft genau einen Vorgang auf
CREATE TABLE module_operations (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    module_id           uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,   -- Modul | Verweis
    operation_key       text NOT NULL,                   -- Vorgang | z. B. «ident.account.create»
    title               text NOT NULL,                   -- Bezeichnung | z. B. «Konto anlegen»
    parameters          text[] NOT NULL DEFAULT '{}',    -- Parameter | Namen der Eingaben
    results             text[] NOT NULL DEFAULT '{}',    -- Ergebnisse | Namen der Rückgaben, z. B. «username»
    response_type       text NOT NULL DEFAULT 'immediate' CHECK (response_type IN ('immediate','callback')),   -- Antwortart | sofort oder mit Rückmeldung | intern | immediate=sofort; callback=mit Rückmeldung
    is_active           boolean NOT NULL DEFAULT true,   -- Aktiv | verwendbar in Vorlagen
    UNIQUE (organization_id, operation_key)
);

-- Ereignis, das ein Modul meldet (Datensatz erstellt/geändert, Status geändert)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Seite «Auslöser»; Module melden ihre Ereignisse wie ihre Vorgänge
CREATE TABLE module_events (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    module_id           uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,   -- Modul | meldet das Ereignis
    event_key           text NOT NULL,                   -- Ereignis | Schlüssel, z. B. «staffing.anstellung.genehmigt»
    title               text NOT NULL,                   -- Bezeichnung | z. B. «Anstellung genehmigt»
    event_type          text NOT NULL CHECK (event_type IN ('record_created','record_changed','status_changed')),   -- Art | was geschieht | intern | record_created=Datensatz erstellt; record_changed=Datensatz geändert; status_changed=Status geändert
    payload_fields      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- Felder | gelieferte Werte mit Schlüssel und Bezeichnung
    is_active           boolean NOT NULL DEFAULT true,   -- Aktiv | wird ausgewertet
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, event_key)
);

-- ------------------------------------------------------------------ Ablaufvorlagen

-- Ablaufvorlage; Änderungen nach der Freigabe ergeben eine neue Version
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «Ablaufvorlagen»; Schulverwaltung bereitet vor, Ressortvorstand gibt frei
CREATE TABLE templates (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    code                text NOT NULL,                   -- Kürzel | z. B. «EIN-LP»
    version_number      integer NOT NULL DEFAULT 1,      -- Version | laufende Abläufe behalten ihre Kopie
    title               text NOT NULL,                   -- Titel | z. B. «Eintritt Lehrperson»
    template_group      text NOT NULL DEFAULT 'Weitere', -- Gruppe | z. B. «Personal (kantonal)»
    status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','released','archived')),   -- Status | Freigabe der Vorlage | intern | draft=Entwurf; released=freigegeben; archived=archiviert
    reference_date_label text NOT NULL,                  -- Stichtag (Bezeichnung) | z. B. «Eintrittsdatum»
    description         text,                            -- Beschreibung | Zweck der Vorlage
    released_at         timestamptz,                     -- Freigegeben am | Freigabe
    released_by_id      uuid,                            -- Freigegeben von | Ressortvorstand (ohne Constraint)
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (organization_id, code, version_number)
);

-- Eingabefeld beim Start eines Ablaufs
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Vorlage › Startfelder; Werte stehen den Schritten als Platzhalter zur Verfügung
CREATE TABLE template_fields (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    template_id         uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,   -- Vorlage | Verweis
    position            integer NOT NULL,                -- Reihenfolge | Anzeige
    field_key           text NOT NULL,                   -- Schlüssel | Platzhalter, z. B. «person»
    label               text NOT NULL,                   -- Bezeichnung | Beschriftung im Startformular
    field_type          text NOT NULL CHECK (field_type IN ('text','number','date','choice','person')),   -- Art | Eingabeart | intern | text=Text; number=Zahl; date=Datum; choice=Auswahl; person=Person
    options             text[],                          -- Auswahlwerte | bei Auswahl
    is_required         boolean NOT NULL DEFAULT true,   -- Pflicht | Start nur mit Wert
    UNIQUE (template_id, field_key)
);

-- Schritt einer Vorlage
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Vorlage › Schritte; Rolle, Frist ab Stichtag, Vorgang, Bedingung, Quelle
CREATE TABLE template_steps (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    template_id         uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,   -- Vorlage | Verweis
    code                text NOT NULL,                   -- Kürzel | z. B. «o1»
    position            integer NOT NULL,                -- Reihenfolge | Anzeige
    title               text NOT NULL,                   -- Schritt | Bezeichnung
    role_id             uuid NOT NULL REFERENCES roles(id),   -- Verantwortlich | Rolle
    offset_days         integer NOT NULL DEFAULT 0,      -- Frist (Tage) | relativ zum Stichtag, negativ = vorher
    step_type           text NOT NULL DEFAULT 'task' CHECK (step_type IN ('task','call','approval','decision','evidence','appointment','wait','notification','subprocess')),   -- Art | Aufgabentyp (Konzept Flow 3.1) | intern | task=Aufgabe; call=Aufruf an Modul; approval=Genehmigung; decision=Entscheidung; evidence=Nachweis; appointment=Termin; wait=Warten bis Frist; notification=Benachrichtigung; subprocess=Unterprozess
    deadline_type       text NOT NULL DEFAULT 'internal' CHECK (deadline_type IN ('statutory','internal','recommendation')),   -- Fristart | bestimmt die Eskalationsstufen | intern | statutory=gesetzliche Frist; internal=interne Frist; recommendation=Empfehlung
    module_operation_id uuid REFERENCES module_operations(id),   -- Vorgang | nur bei Art «Aufruf an Modul»
    parameters          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- Parameter | mit Platzhaltern «{person}», «{o3.username}»
    is_automatic        boolean NOT NULL DEFAULT false,  -- Automatisch | ohne Bestätigung bei erreichter Frist
    options             text[],                          -- Möglichkeiten | bei Art «Entscheidung»
    sub_template_id     uuid REFERENCES templates(id),   -- Unterprozess | Vorlage, die gestartet wird (aktuell freigegebene Version)
    sub_offset_days     integer NOT NULL DEFAULT 0,      -- Stichtag Unterprozess | Tage zum eigenen Stichtag
    condition           jsonb,                           -- Bedingung | Kontextfeld oder Ergebnis eines früheren Schritts (Verzweigung), z. B. {"field":"s5.decision","op":"=","value":"approved"}
    responsibility_task_id uuid REFERENCES responsibility_tasks(id),   -- Funktionendiagramm | Nummer der Aufgabe
    source_id           uuid REFERENCES sources(id),     -- Quelle | Pflicht (Quelle oder Stelle)
    source_location     text,                            -- Stelle | z. B. «§ 12 Abs. 2»
    UNIQUE (template_id, code),
    CHECK (source_id IS NOT NULL OR source_location IS NOT NULL),
    CHECK ((step_type = 'call') = (module_operation_id IS NOT NULL)),
    CHECK (step_type <> 'subprocess' OR sub_template_id IS NOT NULL)
);

-- Vorgänger eines Schritts («erst nach»)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Vorlage › Schritte; ein Schritt wird bereit, wenn die Vorgänger erledigt sind
CREATE TABLE template_step_predecessors (
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    template_step_id    uuid NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,   -- Schritt | Verweis
    predecessor_id      uuid NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,   -- Vorgänger | Verweis
    PRIMARY KEY (template_step_id, predecessor_id),
    CHECK (template_step_id <> predecessor_id)
);

-- Zu informierende Rollen eines Schritts
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Vorlage › Schritte; Hinweise bei Abschluss
CREATE TABLE template_step_informed_roles (
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    template_step_id    uuid NOT NULL REFERENCES template_steps(id) ON DELETE CASCADE,   -- Schritt | Verweis
    role_id             uuid NOT NULL REFERENCES roles(id),   -- Rolle | wird informiert
    PRIMARY KEY (template_step_id, role_id)
);

-- Auslöser einer Vorlage (neben dem Start von Hand)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Vorlage › Auslöser; nur freigegebene Vorlagen werden ausgelöst (Konzept Flow 3.2)
CREATE TABLE template_triggers (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    template_id         uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,   -- Vorlage | wird gestartet
    trigger_type        text NOT NULL CHECK (trigger_type IN ('module_event','calendar','run_completed')),   -- Art | Herkunft des Auslösers | intern | module_event=Ereignis eines Moduls; calendar=Jahreskalender; run_completed=Abschluss eines Ablaufs
    module_event_id     uuid REFERENCES module_events(id),   -- Modul-Ereignis | bei Art «Ereignis eines Moduls»
    calendar_event_id   uuid,                            -- Termin | bei Art «Jahreskalender» (Verweis auf calendar_events)
    source_template_id  uuid REFERENCES templates(id),   -- Vorlage (Abschluss) | bei Art «Abschluss eines Ablaufs»
    offset_days         integer NOT NULL DEFAULT 0,      -- Stichtag (Tage) | Abschluss: Stichtag des neuen Ablaufs relativ zum abgeschlossenen
    is_active           boolean NOT NULL DEFAULT true,   -- Aktiv | ausschalten ohne zu löschen
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1,
    CHECK ((trigger_type = 'module_event') = (module_event_id IS NOT NULL)),
    CHECK ((trigger_type = 'calendar') = (calendar_event_id IS NOT NULL)),
    CHECK ((trigger_type = 'run_completed') = (source_template_id IS NOT NULL))
);

-- Eskalationsstufe je Fristart
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Motor; Erinnerung, überfällig, vorgesetzte Stelle, Leitung (Konzept Flow 3.3, E6 OFFEN)
CREATE TABLE escalation_rules (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    deadline_type       text NOT NULL CHECK (deadline_type IN ('statutory','internal','recommendation')),   -- Fristart | für welche Fristen | intern | statutory=gesetzliche Frist; internal=interne Frist; recommendation=Empfehlung
    level               integer NOT NULL CHECK (level BETWEEN 1 AND 9),   -- Stufe | 1 = Erinnerung
    offset_days         integer NOT NULL,                -- Abstand zur Frist (Tage) | negativ = vorher
    recipient           text NOT NULL CHECK (recipient IN ('responsible','superior','management')),   -- Empfänger | wer informiert wird | intern | responsible=zuständige Rolle; superior=vorgesetzte Rolle; management=Leitung
    text                text NOT NULL,                   -- Meldung | Text des Hinweises
    is_journaled        boolean NOT NULL DEFAULT false,  -- Ins Journal | ab Stufe 3 im Journal des Ablaufs
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, deadline_type, level)
);

-- ------------------------------------------------------------------ Laufende Abläufe

-- Laufender Ablauf als Kopie einer Vorlage in der Version beim Start
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: gestartet in «Ablauf starten», aus dem Kalender oder durch ein Ereignis eines Moduls
CREATE TABLE runs (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    number              text NOT NULL,                   -- Nummer | z. B. «L001» | intern
    template_id         uuid NOT NULL REFERENCES templates(id),   -- Vorlage | Verweis | intern
    template_version    integer NOT NULL,                -- Version der Vorlage | beim Start | intern
    title               text NOT NULL,                   -- Titel | aus der Vorlage | intern
    reference_date_label text NOT NULL,                  -- Stichtag (Bezeichnung) | aus der Vorlage | intern
    reference_on        date NOT NULL,                   -- Stichtag | Fristen werden davon berechnet | intern
    context             jsonb NOT NULL,                  -- Startwerte | Eingaben beim Start, z. B. Name und Funktion
    user_id             uuid REFERENCES users(id) ON DELETE SET NULL,   -- Person | betroffene Person, falls vorhanden
    status              text NOT NULL DEFAULT 'running' CHECK (status IN ('running','paused','completed','cancelled')),   -- Status | Stand des Ablaufs | intern | running=läuft; paused=pausiert; completed=abgeschlossen; cancelled=abgebrochen
    started_on          date NOT NULL DEFAULT current_date,   -- Gestartet am | Start | intern
    started_by_id       uuid,                            -- Gestartet von | Person (ohne Constraint) | intern
    completed_on        date,                            -- Abgeschlossen am | Ende | intern
    trigger_source      text,                            -- Auslöser | «manuell», Ereignis eines Moduls, Kalender oder Abschluss | intern
    template_trigger_id uuid REFERENCES template_triggers(id) ON DELETE SET NULL,   -- Auslöser (Verweis) | leer = von Hand | intern
    dedup_key           text,                            -- Doppelstart-Schlüssel | Vorlage, Bezeichnung und Stichtag bzw. Vorkommen; zweiter Start wird protokolliert statt ausgeführt | intern
    parent_run_id       uuid REFERENCES runs(id),        -- Hauptablauf | bei Unterprozessen | intern
    parent_run_step_id  uuid,                            -- Schritt im Hauptablauf | bei Unterprozessen (Verweis auf run_steps) | intern
    cancelled_on        date,                            -- Abgebrochen am | Eingriff | intern
    cancel_reason       text,                            -- Grund des Abbruchs | Pflicht beim Abbruch
    lock_version        integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, number)
);

-- Schritt eines laufenden Ablaufs (Kopie aus der Vorlage mit Zustand)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «Laufende Abläufe» und «Meine Aufgaben»; Zustand setzt der Motor
CREATE TABLE run_steps (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    run_id              uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,   -- Ablauf | Verweis
    code                text NOT NULL,                   -- Kürzel | aus der Vorlage
    position            integer NOT NULL,                -- Reihenfolge | Anzeige
    title               text NOT NULL,                   -- Schritt | aus der Vorlage
    role_code           text NOT NULL,                   -- Verantwortlich | Rolle
    assignee_id         uuid REFERENCES users(id) ON DELETE SET NULL,   -- Zuständige Person | wenn zugewiesen
    offset_days         integer NOT NULL,                -- Frist (Tage) | relativ zum Stichtag
    due_on              date NOT NULL,                   -- Frist | Stichtag plus Tage, änderbar
    predecessors        text[] NOT NULL DEFAULT '{}',    -- Vorgänger | Kürzel
    informed_roles      text[] NOT NULL DEFAULT '{}',    -- Informiert | Rollen
    step_type           text NOT NULL DEFAULT 'task' CHECK (step_type IN ('task','call','approval','decision','evidence','appointment','wait','notification','subprocess')),   -- Art | aus der Vorlage | intern | task=Aufgabe; call=Aufruf an Modul; approval=Genehmigung; decision=Entscheidung; evidence=Nachweis; appointment=Termin; wait=Warten bis Frist; notification=Benachrichtigung; subprocess=Unterprozess
    deadline_type       text NOT NULL DEFAULT 'internal' CHECK (deadline_type IN ('statutory','internal','recommendation')),   -- Fristart | aus der Vorlage | intern | statutory=gesetzliche Frist; internal=interne Frist; recommendation=Empfehlung
    options             text[],                          -- Möglichkeiten | bei Entscheidung
    child_run_id        uuid REFERENCES runs(id),        -- Unterprozess (Ablauf) | gestarteter Ablauf
    escalation_level    integer NOT NULL DEFAULT 0,      -- Eskalationsstufe | höchste erreichte Stufe
    is_branch_skipped   boolean NOT NULL DEFAULT false,  -- Zweig entfällt | übersprungen wegen eines Entscheids; Nachfolger nur auf diesem Zweig entfallen mit
    is_added            boolean NOT NULL DEFAULT false,  -- Eingefügt | im laufenden Ablauf ergänzt, nicht aus der Vorlage
    is_manual_only      boolean NOT NULL DEFAULT false,  -- Nur von Hand | nach «wieder öffnen»: Aufruf wird nicht automatisch wiederholt
    operation_key       text,                            -- Vorgang | Schlüssel im Register
    parameter_template  jsonb NOT NULL DEFAULT '{}'::jsonb,   -- Parameter (Vorlage) | mit Platzhaltern
    parameters          jsonb,                           -- Parameter (aufgelöst) | beim Aufruf | personenbezogen
    is_automatic        boolean NOT NULL DEFAULT false,  -- Automatisch | ohne Bestätigung
    condition           jsonb,                           -- Bedingung | aus der Vorlage
    responsibility_number text,                          -- Funktionendiagramm | Nummer der Aufgabe
    source_text         text NOT NULL,                   -- Quelle | aus der Vorlage
    status              text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','ready','scheduled','running','done','skipped','failed','cancelled')),   -- Status | Zustand des Schritts | intern | waiting=wartet; ready=bereit; scheduled=geplant; running=läuft; done=erledigt; skipped=übersprungen; failed=Fehler; cancelled=abgebrochen
    result              jsonb,                           -- Ergebnis | Rückgabe des Moduls bzw. Entscheid, Wahl, Nachweis, Termin; Platzhalter für spätere Schritte | personenbezogen
    done_on             date,                            -- Erledigt am | Abschluss
    done_by_id          uuid,                            -- Erledigt von | Person (ohne Constraint)
    remark              text,                            -- Bemerkung | z. B. Grund für Überspringen
    lock_version        integer NOT NULL DEFAULT 1,
    UNIQUE (run_id, code)
);

-- Aufruf eines Vorgangs mit aufgelösten Parametern und Antwort
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: geschrieben vom Motor; «Aufrufprotokoll», Nachweis für die Aktenführung
CREATE TABLE operation_calls (
    id                  bigserial PRIMARY KEY,
    event_id            uuid NOT NULL UNIQUE,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    number              text NOT NULL,                   -- Nummer | z. B. «A0001» | intern
    occurred_at         timestamptz NOT NULL DEFAULT now(),   -- Zeitpunkt | wann | intern
    run_id              uuid NOT NULL REFERENCES runs(id),    -- Ablauf | Verweis | intern
    run_step_id         uuid NOT NULL REFERENCES run_steps(id),   -- Schritt | Verweis | intern
    operation_key       text NOT NULL,                   -- Vorgang | Schlüssel | intern
    parameters          jsonb NOT NULL,                  -- Parameter | aufgelöst
    status              text NOT NULL CHECK (status IN ('ok','failed','pending','retried')),   -- Status | Ergebnis des Aufrufs | intern | ok=erfolgreich; failed=Fehler; pending=ausstehend; retried=wiederholt
    response            jsonb,                           -- Antwort | Rückgabe des Moduls
    duration_ms         integer,                         -- Dauer (ms) | Laufzeit | intern
    triggered_by_id     uuid,                            -- Ausgelöst von | leer = automatisch (ohne Constraint) | intern
    UNIQUE (organization_id, number)
);

-- Hinweis an eine Rolle («Ablauf gestartet», «Aufruf fehlgeschlagen»)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: geschrieben vom Motor; Übersicht und «Meine Aufgaben»
CREATE TABLE notices (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    role_code           text NOT NULL,                   -- Rolle | Empfänger
    notice_on           date NOT NULL DEFAULT current_date,   -- Datum | wann
    run_id              uuid REFERENCES runs(id) ON DELETE CASCADE,   -- Ablauf | Bezug
    text                text NOT NULL,                   -- Hinweis | Text
    read_by_ids         uuid[] NOT NULL DEFAULT '{}'     -- Gelesen von | Personen, die ihn gelesen haben
);

-- Journal eines Ablaufs: Start, Entscheide, Unterprozesse, Eskalationen, Eingriffe mit Begründung
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Ablauf › Journal; fachlich, getrennt vom Aufrufprotokoll (technisch) und Audit-Log (Konzept Flow 3.4)
CREATE TABLE run_journal_entries (
    id                  bigserial PRIMARY KEY,
    event_id            uuid NOT NULL UNIQUE,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    run_id              uuid NOT NULL REFERENCES runs(id),    -- Ablauf | Verweis | intern
    run_step_id         uuid REFERENCES run_steps(id),        -- Schritt | Bezug, falls vorhanden | intern
    occurred_at         timestamptz NOT NULL DEFAULT now(),   -- Zeitpunkt | wann | intern
    actor_id            uuid,                            -- Wer | Person; leer = Flow (ohne Constraint) | intern
    entry_type          text NOT NULL CHECK (entry_type IN ('start','decision','subprocess','deadline','notification','escalation','intervention','cancellation','compensation','completion')),   -- Art | Art des Eintrags | intern | start=Start; decision=Entscheid; subprocess=Unterprozess; deadline=Frist; notification=Benachrichtigung; escalation=Eskalation; intervention=Eingriff; cancellation=Abbruch; compensation=Kompensation; completion=Abschluss
    text                text NOT NULL,                   -- Was | Beschreibung
    reason              text                             -- Begründung | Pflicht bei Eingriffen
);

-- Auslöseprotokoll: jedes Ereignis, jeder Kalendertermin und jeder Abschluss, der einen Ablauf starten soll
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Seite «Auslöser»; doppelte Starts werden hier statt als Ablauf vermerkt
CREATE TABLE trigger_events (
    id                  bigserial PRIMARY KEY,
    event_id            uuid NOT NULL UNIQUE,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    occurred_at         timestamptz NOT NULL DEFAULT now(),   -- Zeitpunkt | wann
    source_text         text NOT NULL,                   -- Quelle | z. B. «EduKSX-Staffing: Anstellung genehmigt»
    template_id         uuid REFERENCES templates(id),   -- Vorlage | die gestartet werden sollte
    run_id              uuid REFERENCES runs(id),        -- Ablauf | gestartet bzw. bereits vorhanden
    outcome             text NOT NULL CHECK (outcome IN ('started','duplicate','no_template','failed')),   -- Ergebnis | was geschah | intern | started=gestartet; duplicate=doppelt, nicht gestartet; no_template=ohne Ablauf; failed=Fehler
    payload             jsonb,                           -- Gelieferte Werte | aus dem Ereignis | personenbezogen
    correlation_id      uuid                             -- Korrelations-ID | Verfolgung über Module
);

-- ------------------------------------------------------------------ Jahreskalender

-- Themenbereich des Jahreskalenders
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Jahresplanung ICT-Prozesse; Zeilen der Zeitleiste
CREATE TABLE calendar_areas (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    area_key            text NOT NULL,                   -- Schlüssel | z. B. «budget»
    name                text NOT NULL,                   -- Bereich | z. B. «Budget und Finanzen»
    color               text,                            -- Farbe | Anzeige in der Zeitleiste
    UNIQUE (organization_id, area_key)
);

-- Termin oder ToDo im Jahreskalender mit Zeitregel
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «Jahreskalender»; Zeitregel als JSON (jährlich, Schuljahresanker, Semester, monatlich, Arbeitstage …)
CREATE TABLE calendar_events (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    code                text NOT NULL,                   -- Kürzel | z. B. «k001»
    title               text NOT NULL,                   -- Termin | Bezeichnung
    calendar_area_id    uuid REFERENCES calendar_areas(id),   -- Bereich | Zeile der Zeitleiste
    time_rule           jsonb NOT NULL,                  -- Zeitregel | z. B. {"rule":"reference","anchor":"school_year_end","offset":-30,"unit":"days"}
    only_year           integer,                         -- Nur im Jahr | leer = wiederkehrend
    holiday_rule        text CHECK (holiday_rule IN ('before','after','skip')),   -- Ferienregel | Termin auf einem Nicht-Schultag | intern | before=letzter Schultag davor; after=erster Schultag danach; skip=auslassen
    source_id           uuid REFERENCES sources(id),     -- Quelle | Herkunft des Termins
    template_code       text,                            -- Ablaufvorlage | Start aus dem Kalender
    note                text,                            -- Notiz | Freitext
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (organization_id, code)
);

-- Beteiligung einer Kalenderrolle an einem Termin
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Jahresplanung; Filter «Zuständigkeit»
CREATE TABLE calendar_event_roles (
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    calendar_event_id   uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,   -- Termin | Verweis
    role_id             uuid NOT NULL REFERENCES roles(id),   -- Rolle | Verweis
    participation       text NOT NULL,                   -- Beteiligung | A ausführen, E entscheiden, V verantwortlich, M mitwirken
    PRIMARY KEY (calendar_event_id, role_id)
);

-- Teilaufgabe eines Termins
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Master-Checkliste; einzeln abhakbar
CREATE TABLE calendar_event_tasks (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    calendar_event_id   uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,   -- Termin | Verweis
    position            integer NOT NULL,                -- Reihenfolge | Anzeige
    title               text NOT NULL,                   -- Teilaufgabe | Bezeichnung
    UNIQUE (calendar_event_id, position)
);

-- Erledigt-Vermerk je Vorkommen eines Termins (optional je Teilaufgabe)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «erledigt» im Kalender bzw. Start eines Ablaufs aus dem Vorkommen
CREATE TABLE calendar_completions (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    calendar_event_id   uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,   -- Termin | Verweis
    occurrence_on       date NOT NULL,                   -- Vorkommen | Datum des Vorkommens
    task_position       integer,                         -- Teilaufgabe | leer = ganzer Termin
    completed_on        date NOT NULL DEFAULT current_date,   -- Erledigt am | Abschluss
    completed_by_id     uuid,                            -- Erledigt von | Person (ohne Constraint)
    run_id              uuid REFERENCES runs(id),        -- Ablauf | aus dem Vorkommen gestartet
    UNIQUE NULLS NOT DISTINCT (calendar_event_id, occurrence_on, task_position)
);

-- Ausnahmetabelle (doppelt gespeichert, DB A2)
-- runs/run_steps: Kopie der Vorlage beim Start – Grund: spätere Änderungen an der Vorlage verändern laufende Abläufe nicht; nie nachgeführt
-- operation_calls.parameters: aufgelöste Parameter – Grund: Nachweis, was aufgerufen wurde; unveränderlich

-- >>> indizes
CREATE INDEX organizations_parent_id_index ON organizations (parent_id);
CREATE INDEX users_organization_id_index ON users (organization_id);
CREATE INDEX school_holidays_organization_id_index ON school_holidays (organization_id);
CREATE INDEX school_holidays_school_year_id_index ON school_holidays (school_year_id);
CREATE INDEX roles_superior_role_id_index ON roles (superior_role_id);
CREATE INDEX role_calendar_roles_organization_id_index ON role_calendar_roles (organization_id);
CREATE INDEX responsibility_task_roles_organization_id_index ON responsibility_task_roles (organization_id);
CREATE INDEX module_operations_module_id_index ON module_operations (module_id);
CREATE INDEX module_events_module_id_index ON module_events (module_id);
CREATE INDEX template_fields_organization_id_index ON template_fields (organization_id);
CREATE INDEX template_steps_organization_id_index ON template_steps (organization_id);
CREATE INDEX template_steps_role_id_index ON template_steps (role_id);
CREATE INDEX template_steps_module_operation_id_index ON template_steps (module_operation_id);
CREATE INDEX template_steps_sub_template_id_index ON template_steps (sub_template_id);
CREATE INDEX template_steps_responsibility_task_id_index ON template_steps (responsibility_task_id);
CREATE INDEX template_steps_source_id_index ON template_steps (source_id);
CREATE INDEX template_step_predecessors_organization_id_index ON template_step_predecessors (organization_id);
CREATE INDEX template_step_informed_roles_organization_id_index ON template_step_informed_roles (organization_id);
CREATE INDEX template_triggers_organization_id_index ON template_triggers (organization_id);
CREATE INDEX template_triggers_template_id_index ON template_triggers (template_id);
CREATE INDEX template_triggers_module_event_id_index ON template_triggers (module_event_id);
CREATE INDEX template_triggers_source_template_id_index ON template_triggers (source_template_id);
CREATE INDEX runs_template_id_index ON runs (template_id);
CREATE INDEX runs_user_id_index ON runs (user_id);
CREATE INDEX runs_template_trigger_id_index ON runs (template_trigger_id);
CREATE INDEX runs_parent_run_id_index ON runs (parent_run_id);
CREATE INDEX run_steps_organization_id_index ON run_steps (organization_id);
CREATE INDEX run_steps_assignee_id_index ON run_steps (assignee_id);
CREATE INDEX run_steps_child_run_id_index ON run_steps (child_run_id);
CREATE INDEX operation_calls_run_id_index ON operation_calls (run_id);
CREATE INDEX operation_calls_run_step_id_index ON operation_calls (run_step_id);
CREATE INDEX notices_organization_id_index ON notices (organization_id);
CREATE INDEX notices_run_id_index ON notices (run_id);
CREATE INDEX run_journal_entries_organization_id_index ON run_journal_entries (organization_id);
CREATE INDEX run_journal_entries_run_id_index ON run_journal_entries (run_id);
CREATE INDEX run_journal_entries_run_step_id_index ON run_journal_entries (run_step_id);
CREATE INDEX trigger_events_organization_id_index ON trigger_events (organization_id);
CREATE INDEX trigger_events_template_id_index ON trigger_events (template_id);
CREATE INDEX trigger_events_run_id_index ON trigger_events (run_id);
CREATE INDEX calendar_events_calendar_area_id_index ON calendar_events (calendar_area_id);
CREATE INDEX calendar_events_source_id_index ON calendar_events (source_id);
CREATE INDEX calendar_event_roles_organization_id_index ON calendar_event_roles (organization_id);
CREATE INDEX calendar_event_tasks_organization_id_index ON calendar_event_tasks (organization_id);
CREATE INDEX calendar_completions_organization_id_index ON calendar_completions (organization_id);
CREATE INDEX calendar_completions_run_id_index ON calendar_completions (run_id);
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
COMMENT ON TABLE roles IS 'Rolle in Abläufen oder im Jahreskalender (SV, SL, RV, ICT …) – Funktionendiagramm der Schulgemeinde; Zuständigkeit der Schritte und Termine';
COMMENT ON COLUMN roles.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN roles.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN roles.code IS 'Kürzel – z. B. «SV»';
COMMENT ON COLUMN roles.name IS 'Rolle – z. B. «Schulverwaltung»';
COMMENT ON COLUMN roles.role_scope IS 'Verwendung – Abläufe, Kalender oder beides';
COMMENT ON COLUMN roles.superior_role_id IS 'Vorgesetzte Rolle – Empfänger der Eskalation Stufe 3 (Konzept E6 OFFEN)';
COMMENT ON COLUMN roles.may_intervene IS 'Prozessverantwortlich – darf in laufende Abläufe eingreifen (Konzept E5 OFFEN)';
COMMENT ON COLUMN roles.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN roles.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN roles.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE role_calendar_roles IS 'Zuordnung Ablaufrolle → Kalenderrollen – «Meine Termine» zeigt die Kalenderrollen der eigenen Ablaufrolle';
COMMENT ON COLUMN role_calendar_roles.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN role_calendar_roles.role_id IS 'Ablaufrolle – Verweis';
COMMENT ON COLUMN role_calendar_roles.calendar_role_id IS 'Kalenderrolle – Verweis';
COMMENT ON TABLE responsibility_tasks IS 'Aufgabe im Funktionendiagramm – Funktionendiagramm der Schulgemeinde; Vorschlag der Zuständigkeit je Schritt';
COMMENT ON COLUMN responsibility_tasks.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN responsibility_tasks.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN responsibility_tasks.number IS 'Nummer – z. B. «5.2.2»';
COMMENT ON COLUMN responsibility_tasks.title IS 'Aufgabe – Text im Funktionendiagramm';
COMMENT ON COLUMN responsibility_tasks.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN responsibility_tasks.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN responsibility_tasks.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE responsibility_task_roles IS 'Kompetenz einer Rolle bei einer Aufgabe – Funktionendiagramm; «V» wird verantwortlich, «I» informiert';
COMMENT ON COLUMN responsibility_task_roles.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN responsibility_task_roles.responsibility_task_id IS 'Aufgabe – Verweis';
COMMENT ON COLUMN responsibility_task_roles.role_id IS 'Rolle – Verweis';
COMMENT ON COLUMN responsibility_task_roles.competence IS 'Kompetenz – V verantwortlich, E entscheidet, A ausführen, M mitwirken, I informiert';
COMMENT ON TABLE sources IS 'Quelle eines Schritts (Gesetz, Merkblatt, Prozessliste) – Quellenverzeichnis der Vorlagen; Pflicht bei jedem Schritt';
COMMENT ON COLUMN sources.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN sources.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN sources.code IS 'Kürzel – z. B. «LPVO»';
COMMENT ON COLUMN sources.title IS 'Titel – vollständiger Titel';
COMMENT ON COLUMN sources.url IS 'Adresse – Link zur Quelle';
COMMENT ON COLUMN sources.codex_reference IS 'Erlass in EduKSX-Codex – Verweis auf Erlass und Fassung';
COMMENT ON COLUMN sources.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN sources.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN sources.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE modules IS 'Modul, das Vorgänge anbietet – jedes Modul meldet sich im Vorgangsregister an; «Vorgänge der Module»';
COMMENT ON COLUMN modules.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN modules.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN modules.module_key IS 'Modulschlüssel – aus dem Modulregister, z. B. «ident»';
COMMENT ON COLUMN modules.name IS 'Modul – Anzeigename';
COMMENT ON COLUMN modules.purpose IS 'Aufgabe – Kurzbeschreibung';
COMMENT ON COLUMN modules.endpoint_url IS 'Adresse – Basis-URL der API';
COMMENT ON COLUMN modules.is_reachable IS 'Erreichbar – letzte Prüfung';
COMMENT ON COLUMN modules.checked_at IS 'Geprüft am – letzte Prüfung';
COMMENT ON COLUMN modules.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN modules.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN modules.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE module_operations IS 'Vorgang eines Moduls mit Parametern und Ergebnissen – gemeldet vom Modul; ein Schritt ruft genau einen Vorgang auf';
COMMENT ON COLUMN module_operations.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN module_operations.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN module_operations.module_id IS 'Modul – Verweis';
COMMENT ON COLUMN module_operations.operation_key IS 'Vorgang – z. B. «ident.account.create»';
COMMENT ON COLUMN module_operations.title IS 'Bezeichnung – z. B. «Konto anlegen»';
COMMENT ON COLUMN module_operations.parameters IS 'Parameter – Namen der Eingaben';
COMMENT ON COLUMN module_operations.results IS 'Ergebnisse – Namen der Rückgaben, z. B. «username»';
COMMENT ON COLUMN module_operations.response_type IS 'Antwortart – sofort oder mit Rückmeldung';
COMMENT ON COLUMN module_operations.is_active IS 'Aktiv – verwendbar in Vorlagen';
COMMENT ON TABLE module_events IS 'Ereignis, das ein Modul meldet (Datensatz erstellt/geändert, Status geändert) – Seite «Auslöser»; Module melden ihre Ereignisse wie ihre Vorgänge';
COMMENT ON COLUMN module_events.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN module_events.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN module_events.module_id IS 'Modul – meldet das Ereignis';
COMMENT ON COLUMN module_events.event_key IS 'Ereignis – Schlüssel, z. B. «staffing.anstellung.genehmigt»';
COMMENT ON COLUMN module_events.title IS 'Bezeichnung – z. B. «Anstellung genehmigt»';
COMMENT ON COLUMN module_events.event_type IS 'Art – was geschieht';
COMMENT ON COLUMN module_events.payload_fields IS 'Felder – gelieferte Werte mit Schlüssel und Bezeichnung';
COMMENT ON COLUMN module_events.is_active IS 'Aktiv – wird ausgewertet';
COMMENT ON COLUMN module_events.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN module_events.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN module_events.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE templates IS 'Ablaufvorlage; Änderungen nach der Freigabe ergeben eine neue Version – «Ablaufvorlagen»; Schulverwaltung bereitet vor, Ressortvorstand gibt frei';
COMMENT ON COLUMN templates.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN templates.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN templates.code IS 'Kürzel – z. B. «EIN-LP»';
COMMENT ON COLUMN templates.version_number IS 'Version – laufende Abläufe behalten ihre Kopie';
COMMENT ON COLUMN templates.title IS 'Titel – z. B. «Eintritt Lehrperson»';
COMMENT ON COLUMN templates.template_group IS 'Gruppe – z. B. «Personal (kantonal)»';
COMMENT ON COLUMN templates.status IS 'Status – Freigabe der Vorlage';
COMMENT ON COLUMN templates.reference_date_label IS 'Stichtag (Bezeichnung) – z. B. «Eintrittsdatum»';
COMMENT ON COLUMN templates.description IS 'Beschreibung – Zweck der Vorlage';
COMMENT ON COLUMN templates.released_at IS 'Freigegeben am – Freigabe';
COMMENT ON COLUMN templates.released_by_id IS 'Freigegeben von – Ressortvorstand (ohne Constraint)';
COMMENT ON COLUMN templates.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN templates.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN templates.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN templates.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN templates.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN templates.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN templates.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE template_fields IS 'Eingabefeld beim Start eines Ablaufs – Vorlage › Startfelder; Werte stehen den Schritten als Platzhalter zur Verfügung';
COMMENT ON COLUMN template_fields.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN template_fields.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN template_fields.template_id IS 'Vorlage – Verweis';
COMMENT ON COLUMN template_fields.position IS 'Reihenfolge – Anzeige';
COMMENT ON COLUMN template_fields.field_key IS 'Schlüssel – Platzhalter, z. B. «person»';
COMMENT ON COLUMN template_fields.label IS 'Bezeichnung – Beschriftung im Startformular';
COMMENT ON COLUMN template_fields.field_type IS 'Art – Eingabeart';
COMMENT ON COLUMN template_fields.options IS 'Auswahlwerte – bei Auswahl';
COMMENT ON COLUMN template_fields.is_required IS 'Pflicht – Start nur mit Wert';
COMMENT ON TABLE template_steps IS 'Schritt einer Vorlage – Vorlage › Schritte; Rolle, Frist ab Stichtag, Vorgang, Bedingung, Quelle';
COMMENT ON COLUMN template_steps.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN template_steps.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN template_steps.template_id IS 'Vorlage – Verweis';
COMMENT ON COLUMN template_steps.code IS 'Kürzel – z. B. «o1»';
COMMENT ON COLUMN template_steps.position IS 'Reihenfolge – Anzeige';
COMMENT ON COLUMN template_steps.title IS 'Schritt – Bezeichnung';
COMMENT ON COLUMN template_steps.role_id IS 'Verantwortlich – Rolle';
COMMENT ON COLUMN template_steps.offset_days IS 'Frist (Tage)';
COMMENT ON COLUMN template_steps.step_type IS 'Art – Aufgabentyp (Konzept Flow 3.1)';
COMMENT ON COLUMN template_steps.deadline_type IS 'Fristart – bestimmt die Eskalationsstufen';
COMMENT ON COLUMN template_steps.module_operation_id IS 'Vorgang – nur bei Art «Aufruf an Modul»';
COMMENT ON COLUMN template_steps.parameters IS 'Parameter – mit Platzhaltern «{person}», «{o3.username}»';
COMMENT ON COLUMN template_steps.is_automatic IS 'Automatisch – ohne Bestätigung bei erreichter Frist';
COMMENT ON COLUMN template_steps.options IS 'Möglichkeiten – bei Art «Entscheidung»';
COMMENT ON COLUMN template_steps.sub_template_id IS 'Unterprozess – Vorlage, die gestartet wird (aktuell freigegebene Version)';
COMMENT ON COLUMN template_steps.sub_offset_days IS 'Stichtag Unterprozess – Tage zum eigenen Stichtag';
COMMENT ON COLUMN template_steps.condition IS 'Bedingung';
COMMENT ON COLUMN template_steps.responsibility_task_id IS 'Funktionendiagramm – Nummer der Aufgabe';
COMMENT ON COLUMN template_steps.source_id IS 'Quelle – Pflicht (Quelle oder Stelle)';
COMMENT ON COLUMN template_steps.source_location IS 'Stelle – z. B. «§ 12 Abs. 2»';
COMMENT ON TABLE template_step_predecessors IS 'Vorgänger eines Schritts («erst nach») – Vorlage › Schritte; ein Schritt wird bereit, wenn die Vorgänger erledigt sind';
COMMENT ON COLUMN template_step_predecessors.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN template_step_predecessors.template_step_id IS 'Schritt – Verweis';
COMMENT ON COLUMN template_step_predecessors.predecessor_id IS 'Vorgänger – Verweis';
COMMENT ON TABLE template_step_informed_roles IS 'Zu informierende Rollen eines Schritts – Vorlage › Schritte; Hinweise bei Abschluss';
COMMENT ON COLUMN template_step_informed_roles.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN template_step_informed_roles.template_step_id IS 'Schritt – Verweis';
COMMENT ON COLUMN template_step_informed_roles.role_id IS 'Rolle – wird informiert';
COMMENT ON TABLE template_triggers IS 'Auslöser einer Vorlage (neben dem Start von Hand) – Vorlage › Auslöser; nur freigegebene Vorlagen werden ausgelöst (Konzept Flow 3.2)';
COMMENT ON COLUMN template_triggers.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN template_triggers.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN template_triggers.template_id IS 'Vorlage – wird gestartet';
COMMENT ON COLUMN template_triggers.trigger_type IS 'Art – Herkunft des Auslösers';
COMMENT ON COLUMN template_triggers.module_event_id IS 'Modul-Ereignis – bei Art «Ereignis eines Moduls»';
COMMENT ON COLUMN template_triggers.calendar_event_id IS 'Termin – bei Art «Jahreskalender» (Verweis auf calendar_events)';
COMMENT ON COLUMN template_triggers.source_template_id IS 'Vorlage (Abschluss) – bei Art «Abschluss eines Ablaufs»';
COMMENT ON COLUMN template_triggers.offset_days IS 'Stichtag (Tage) – Abschluss: Stichtag des neuen Ablaufs relativ zum abgeschlossenen';
COMMENT ON COLUMN template_triggers.is_active IS 'Aktiv – ausschalten ohne zu löschen';
COMMENT ON COLUMN template_triggers.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN template_triggers.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN template_triggers.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN template_triggers.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN template_triggers.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE escalation_rules IS 'Eskalationsstufe je Fristart – Motor; Erinnerung, überfällig, vorgesetzte Stelle, Leitung (Konzept Flow 3.3, E6 OFFEN)';
COMMENT ON COLUMN escalation_rules.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN escalation_rules.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN escalation_rules.deadline_type IS 'Fristart – für welche Fristen';
COMMENT ON COLUMN escalation_rules.level IS 'Stufe';
COMMENT ON COLUMN escalation_rules.offset_days IS 'Abstand zur Frist (Tage)';
COMMENT ON COLUMN escalation_rules.recipient IS 'Empfänger – wer informiert wird';
COMMENT ON COLUMN escalation_rules.text IS 'Meldung – Text des Hinweises';
COMMENT ON COLUMN escalation_rules.is_journaled IS 'Ins Journal – ab Stufe 3 im Journal des Ablaufs';
COMMENT ON COLUMN escalation_rules.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN escalation_rules.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN escalation_rules.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE runs IS 'Laufender Ablauf als Kopie einer Vorlage in der Version beim Start – gestartet in «Ablauf starten», aus dem Kalender oder durch ein Ereignis eines Moduls';
COMMENT ON COLUMN runs.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN runs.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN runs.number IS 'Nummer – z. B. «L001»';
COMMENT ON COLUMN runs.template_id IS 'Vorlage – Verweis';
COMMENT ON COLUMN runs.template_version IS 'Version der Vorlage – beim Start';
COMMENT ON COLUMN runs.title IS 'Titel – aus der Vorlage';
COMMENT ON COLUMN runs.reference_date_label IS 'Stichtag (Bezeichnung) – aus der Vorlage';
COMMENT ON COLUMN runs.reference_on IS 'Stichtag – Fristen werden davon berechnet';
COMMENT ON COLUMN runs.context IS 'Startwerte – Eingaben beim Start, z. B. Name und Funktion';
COMMENT ON COLUMN runs.user_id IS 'Person – betroffene Person, falls vorhanden';
COMMENT ON COLUMN runs.status IS 'Status – Stand des Ablaufs';
COMMENT ON COLUMN runs.started_on IS 'Gestartet am – Start';
COMMENT ON COLUMN runs.started_by_id IS 'Gestartet von – Person (ohne Constraint)';
COMMENT ON COLUMN runs.completed_on IS 'Abgeschlossen am – Ende';
COMMENT ON COLUMN runs.trigger_source IS 'Auslöser – «manuell», Ereignis eines Moduls, Kalender oder Abschluss';
COMMENT ON COLUMN runs.template_trigger_id IS 'Auslöser (Verweis)';
COMMENT ON COLUMN runs.dedup_key IS 'Doppelstart-Schlüssel – Vorlage, Bezeichnung und Stichtag bzw. Vorkommen; zweiter Start wird protokolliert statt ausgeführt';
COMMENT ON COLUMN runs.parent_run_id IS 'Hauptablauf – bei Unterprozessen';
COMMENT ON COLUMN runs.parent_run_step_id IS 'Schritt im Hauptablauf – bei Unterprozessen (Verweis auf run_steps)';
COMMENT ON COLUMN runs.cancelled_on IS 'Abgebrochen am – Eingriff';
COMMENT ON COLUMN runs.cancel_reason IS 'Grund des Abbruchs – Pflicht beim Abbruch';
COMMENT ON COLUMN runs.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE run_steps IS 'Schritt eines laufenden Ablaufs (Kopie aus der Vorlage mit Zustand) – «Laufende Abläufe» und «Meine Aufgaben»; Zustand setzt der Motor';
COMMENT ON COLUMN run_steps.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN run_steps.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN run_steps.run_id IS 'Ablauf – Verweis';
COMMENT ON COLUMN run_steps.code IS 'Kürzel – aus der Vorlage';
COMMENT ON COLUMN run_steps.position IS 'Reihenfolge – Anzeige';
COMMENT ON COLUMN run_steps.title IS 'Schritt – aus der Vorlage';
COMMENT ON COLUMN run_steps.role_code IS 'Verantwortlich – Rolle';
COMMENT ON COLUMN run_steps.assignee_id IS 'Zuständige Person – wenn zugewiesen';
COMMENT ON COLUMN run_steps.offset_days IS 'Frist (Tage) – relativ zum Stichtag';
COMMENT ON COLUMN run_steps.due_on IS 'Frist – Stichtag plus Tage, änderbar';
COMMENT ON COLUMN run_steps.predecessors IS 'Vorgänger – Kürzel';
COMMENT ON COLUMN run_steps.informed_roles IS 'Informiert – Rollen';
COMMENT ON COLUMN run_steps.step_type IS 'Art – aus der Vorlage';
COMMENT ON COLUMN run_steps.deadline_type IS 'Fristart – aus der Vorlage';
COMMENT ON COLUMN run_steps.options IS 'Möglichkeiten – bei Entscheidung';
COMMENT ON COLUMN run_steps.child_run_id IS 'Unterprozess (Ablauf) – gestarteter Ablauf';
COMMENT ON COLUMN run_steps.escalation_level IS 'Eskalationsstufe – höchste erreichte Stufe';
COMMENT ON COLUMN run_steps.is_branch_skipped IS 'Zweig entfällt – übersprungen wegen eines Entscheids; Nachfolger nur auf diesem Zweig entfallen mit';
COMMENT ON COLUMN run_steps.is_added IS 'Eingefügt – im laufenden Ablauf ergänzt, nicht aus der Vorlage';
COMMENT ON COLUMN run_steps.is_manual_only IS 'Nur von Hand – nach «wieder öffnen»: Aufruf wird nicht automatisch wiederholt';
COMMENT ON COLUMN run_steps.operation_key IS 'Vorgang – Schlüssel im Register';
COMMENT ON COLUMN run_steps.parameter_template IS 'Parameter (Vorlage) – mit Platzhaltern';
COMMENT ON COLUMN run_steps.parameters IS 'Parameter (aufgelöst) – beim Aufruf';
COMMENT ON COLUMN run_steps.is_automatic IS 'Automatisch – ohne Bestätigung';
COMMENT ON COLUMN run_steps.condition IS 'Bedingung – aus der Vorlage';
COMMENT ON COLUMN run_steps.responsibility_number IS 'Funktionendiagramm – Nummer der Aufgabe';
COMMENT ON COLUMN run_steps.source_text IS 'Quelle – aus der Vorlage';
COMMENT ON COLUMN run_steps.status IS 'Status – Zustand des Schritts';
COMMENT ON COLUMN run_steps.result IS 'Ergebnis – Rückgabe des Moduls bzw. Entscheid, Wahl, Nachweis, Termin; Platzhalter für spätere Schritte';
COMMENT ON COLUMN run_steps.done_on IS 'Erledigt am – Abschluss';
COMMENT ON COLUMN run_steps.done_by_id IS 'Erledigt von – Person (ohne Constraint)';
COMMENT ON COLUMN run_steps.remark IS 'Bemerkung – z. B. Grund für Überspringen';
COMMENT ON COLUMN run_steps.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE operation_calls IS 'Aufruf eines Vorgangs mit aufgelösten Parametern und Antwort – geschrieben vom Motor; «Aufrufprotokoll», Nachweis für die Aktenführung';
COMMENT ON COLUMN operation_calls.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN operation_calls.event_id IS 'Ereignis-ID – eindeutig über Module und Exporte hinweg';
COMMENT ON COLUMN operation_calls.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN operation_calls.number IS 'Nummer – z. B. «A0001»';
COMMENT ON COLUMN operation_calls.occurred_at IS 'Zeitpunkt – wann';
COMMENT ON COLUMN operation_calls.run_id IS 'Ablauf – Verweis';
COMMENT ON COLUMN operation_calls.run_step_id IS 'Schritt – Verweis';
COMMENT ON COLUMN operation_calls.operation_key IS 'Vorgang – Schlüssel';
COMMENT ON COLUMN operation_calls.parameters IS 'Parameter – aufgelöst';
COMMENT ON COLUMN operation_calls.status IS 'Status – Ergebnis des Aufrufs';
COMMENT ON COLUMN operation_calls.response IS 'Antwort – Rückgabe des Moduls';
COMMENT ON COLUMN operation_calls.duration_ms IS 'Dauer (ms) – Laufzeit';
COMMENT ON COLUMN operation_calls.triggered_by_id IS 'Ausgelöst von';
COMMENT ON TABLE notices IS 'Hinweis an eine Rolle («Ablauf gestartet», «Aufruf fehlgeschlagen») – geschrieben vom Motor; Übersicht und «Meine Aufgaben»';
COMMENT ON COLUMN notices.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN notices.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN notices.role_code IS 'Rolle – Empfänger';
COMMENT ON COLUMN notices.notice_on IS 'Datum – wann';
COMMENT ON COLUMN notices.run_id IS 'Ablauf – Bezug';
COMMENT ON COLUMN notices.text IS 'Hinweis – Text';
COMMENT ON COLUMN notices.read_by_ids IS 'Gelesen von – Personen, die ihn gelesen haben';
COMMENT ON TABLE run_journal_entries IS 'Journal eines Ablaufs: Start, Entscheide, Unterprozesse, Eskalationen, Eingriffe mit Begründung – Ablauf › Journal; fachlich, getrennt vom Aufrufprotokoll (technisch) und Audit-Log (Konzept Flow 3.4)';
COMMENT ON COLUMN run_journal_entries.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN run_journal_entries.event_id IS 'Ereignis-ID – eindeutig über Module und Exporte hinweg';
COMMENT ON COLUMN run_journal_entries.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN run_journal_entries.run_id IS 'Ablauf – Verweis';
COMMENT ON COLUMN run_journal_entries.run_step_id IS 'Schritt – Bezug, falls vorhanden';
COMMENT ON COLUMN run_journal_entries.occurred_at IS 'Zeitpunkt – wann';
COMMENT ON COLUMN run_journal_entries.actor_id IS 'Wer – Person; leer = Flow (ohne Constraint)';
COMMENT ON COLUMN run_journal_entries.entry_type IS 'Art – Art des Eintrags';
COMMENT ON COLUMN run_journal_entries.text IS 'Was – Beschreibung';
COMMENT ON COLUMN run_journal_entries.reason IS 'Begründung – Pflicht bei Eingriffen';
COMMENT ON TABLE trigger_events IS 'Auslöseprotokoll: jedes Ereignis, jeder Kalendertermin und jeder Abschluss, der einen Ablauf starten soll – Seite «Auslöser»; doppelte Starts werden hier statt als Ablauf vermerkt';
COMMENT ON COLUMN trigger_events.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN trigger_events.event_id IS 'Ereignis-ID – eindeutig über Module und Exporte hinweg';
COMMENT ON COLUMN trigger_events.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN trigger_events.occurred_at IS 'Zeitpunkt – wann';
COMMENT ON COLUMN trigger_events.source_text IS 'Quelle – z. B. «EduKSX-Staffing: Anstellung genehmigt»';
COMMENT ON COLUMN trigger_events.template_id IS 'Vorlage – die gestartet werden sollte';
COMMENT ON COLUMN trigger_events.run_id IS 'Ablauf – gestartet bzw. bereits vorhanden';
COMMENT ON COLUMN trigger_events.outcome IS 'Ergebnis – was geschah';
COMMENT ON COLUMN trigger_events.payload IS 'Gelieferte Werte – aus dem Ereignis';
COMMENT ON COLUMN trigger_events.correlation_id IS 'Korrelations-ID – Verfolgung über Module';
COMMENT ON TABLE calendar_areas IS 'Themenbereich des Jahreskalenders – Jahresplanung ICT-Prozesse; Zeilen der Zeitleiste';
COMMENT ON COLUMN calendar_areas.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN calendar_areas.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN calendar_areas.area_key IS 'Schlüssel – z. B. «budget»';
COMMENT ON COLUMN calendar_areas.name IS 'Bereich – z. B. «Budget und Finanzen»';
COMMENT ON COLUMN calendar_areas.color IS 'Farbe – Anzeige in der Zeitleiste';
COMMENT ON TABLE calendar_events IS 'Termin oder ToDo im Jahreskalender mit Zeitregel – «Jahreskalender»; Zeitregel als JSON (jährlich, Schuljahresanker, Semester, monatlich, Arbeitstage …)';
COMMENT ON COLUMN calendar_events.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN calendar_events.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN calendar_events.code IS 'Kürzel – z. B. «k001»';
COMMENT ON COLUMN calendar_events.title IS 'Termin – Bezeichnung';
COMMENT ON COLUMN calendar_events.calendar_area_id IS 'Bereich – Zeile der Zeitleiste';
COMMENT ON COLUMN calendar_events.time_rule IS 'Zeitregel – z. B. {"rule":"reference","anchor":"school_year_end","offset":-30,"unit":"days"}';
COMMENT ON COLUMN calendar_events.only_year IS 'Nur im Jahr';
COMMENT ON COLUMN calendar_events.holiday_rule IS 'Ferienregel – Termin auf einem Nicht-Schultag';
COMMENT ON COLUMN calendar_events.source_id IS 'Quelle – Herkunft des Termins';
COMMENT ON COLUMN calendar_events.template_code IS 'Ablaufvorlage – Start aus dem Kalender';
COMMENT ON COLUMN calendar_events.note IS 'Notiz – Freitext';
COMMENT ON COLUMN calendar_events.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN calendar_events.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN calendar_events.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN calendar_events.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN calendar_events.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN calendar_events.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN calendar_events.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE calendar_event_roles IS 'Beteiligung einer Kalenderrolle an einem Termin – Jahresplanung; Filter «Zuständigkeit»';
COMMENT ON COLUMN calendar_event_roles.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN calendar_event_roles.calendar_event_id IS 'Termin – Verweis';
COMMENT ON COLUMN calendar_event_roles.role_id IS 'Rolle – Verweis';
COMMENT ON COLUMN calendar_event_roles.participation IS 'Beteiligung – A ausführen, E entscheiden, V verantwortlich, M mitwirken';
COMMENT ON TABLE calendar_event_tasks IS 'Teilaufgabe eines Termins – Master-Checkliste; einzeln abhakbar';
COMMENT ON COLUMN calendar_event_tasks.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN calendar_event_tasks.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN calendar_event_tasks.calendar_event_id IS 'Termin – Verweis';
COMMENT ON COLUMN calendar_event_tasks.position IS 'Reihenfolge – Anzeige';
COMMENT ON COLUMN calendar_event_tasks.title IS 'Teilaufgabe – Bezeichnung';
COMMENT ON TABLE calendar_completions IS 'Erledigt-Vermerk je Vorkommen eines Termins (optional je Teilaufgabe) – «erledigt» im Kalender bzw. Start eines Ablaufs aus dem Vorkommen';
COMMENT ON COLUMN calendar_completions.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN calendar_completions.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN calendar_completions.calendar_event_id IS 'Termin – Verweis';
COMMENT ON COLUMN calendar_completions.occurrence_on IS 'Vorkommen – Datum des Vorkommens';
COMMENT ON COLUMN calendar_completions.task_position IS 'Teilaufgabe';
COMMENT ON COLUMN calendar_completions.completed_on IS 'Erledigt am – Abschluss';
COMMENT ON COLUMN calendar_completions.completed_by_id IS 'Erledigt von – Person (ohne Constraint)';
COMMENT ON COLUMN calendar_completions.run_id IS 'Ablauf – aus dem Vorkommen gestartet';
-- <<< kommentare
