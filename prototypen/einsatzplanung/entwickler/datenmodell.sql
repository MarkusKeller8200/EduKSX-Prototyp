-- EduKSX-Staffing – Datenmodell (Entwurf), direkt ausführbar (inkl. Standardtabellen)
-- Quelle: docs/umsetzung/staffing/datenbank.sql

-- EduKSX-Staffing – Datenbankstruktur (Einsatzplanung)
-- Stand 2026-11-20 · Status ENTWURF · DB-Standard 1.3 · Grundlage: Prototyp prototypen/einsatzplanung
-- Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert. Erzeugte Blöcke (>>> … <<<) nicht von Hand
-- ändern: python3 tools/umsetzung_bauen.py
--
-- Gespeichert wird, was der Prototyp anzeigt und bearbeitet. Berechnete Werte (VZE, Ist-Pensum, Saldo je Ressource,
-- Prüfregeln) liefern die Ansichten bzw. die API; eingefroren wird nur der Stand bei der Freigabe (releases.snapshot).

CREATE SCHEMA IF NOT EXISTS staffing;
SET search_path TO staffing;

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

-- ------------------------------------------------------------------ Parameter und Grundlagen

-- Kantonale und kommunale Parameter eines Schuljahrs
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Weisung VZE und Lehrpersonalverordnung des Kantons; gepflegt in «Parameter und Lektionentafeln», Grundlage aller Berechnungen
CREATE TABLE planning_parameters (
    id                              uuid PRIMARY KEY,
    organization_id                 uuid NOT NULL REFERENCES organizations(id),
    school_year_id                  uuid NOT NULL REFERENCES school_years(id),   -- Schuljahr | Gültigkeit der Parameter
    canton                          char(2) NOT NULL DEFAULT 'ZH',   -- Kanton | Herkunft der Vorgaben
    reference_year                  integer NOT NULL,                -- Stichjahr | Alter der Personen am Stichtag
    planning_on                     date,                            -- Planungsdatum | Stand der Planung
    hours_per_annual_lesson         numeric(6,2) NOT NULL,           -- Faktor je Jahreslektion | Stunden je Wochenlektion und Jahr
    class_teacher_hours             numeric(6,2) NOT NULL,           -- Klassenlehrperson (Stunden) | je Klasse, frei aufteilbar
    school_allowance_hours          numeric(6,2) NOT NULL,           -- Pauschale Schule | Berufsauftrag bei 100 %
    collaboration_allowance_hours   numeric(6,2) NOT NULL,           -- Pauschale Zusammenarbeit | Berufsauftrag bei 100 %
    training_allowance_hours        numeric(6,2) NOT NULL,           -- Pauschale Weiterbildung | Berufsauftrag bei 100 %
    gross_annual_hours              numeric(7,2) NOT NULL,           -- Brutto-Jahresarbeitszeit | Umrechnung Stunden ↔ Prozent
    minimum_workload_percent        numeric(5,2),                    -- Mindestpensum | Prüfregel Personen und Pensen
    maximum_workload_percent        numeric(5,2),                    -- Maximalpensum | Prüfregel Personen und Pensen
    minimum_teaching_share_percent  numeric(5,2),                    -- Mindestanteil Unterricht | Prüfregel
    class_teacher_minimum_lessons   numeric(5,2),                    -- Mindestlektionen Klassenlehrperson | Prüfregel
    custodian_maximum_hours         numeric(6,2),                    -- Kustodie höchstens | Prüfregel Ämter
    lessons_per_fte                 numeric(6,2) NOT NULL,           -- Wochenlektionen je VZE | Umrechnung VZE ↔ Lektionen
    base_value                      numeric(10,4) NOT NULL,          -- Basiswert | VZE-Formel
    correction_factor               numeric(8,4) NOT NULL,           -- Korrekturfaktor | VZE-Formel
    principal_base_fte              numeric(6,3),                    -- Schulleitung Sockel | VZE Schulleitung
    principal_per_fte               numeric(6,3),                    -- Schulleitung je VZE | VZE Schulleitung
    principal_large_per_25_fte      numeric(6,3),                    -- Schulleitung je 25 VZE | ab 25 VZE
    design_pool_per_fte             numeric(6,3),                    -- Gestaltungspool je VZE | Gestaltungspool
    coordination_per_fte            numeric(6,3),                    -- Koordination Sek je VZE | Koordination
    therapy_max_per_100_students    numeric(6,3),                    -- Therapien höchstens je 100 SuS | Prüfregel Stellenplan
    gsl_first_year_lessons          numeric(6,2),                    -- DaZ 1. Jahr (WL) | DaZ-Aufnahmeunterricht
    gsl_following_year_lessons      numeric(6,2),                    -- DaZ Folgejahre (WL) | DaZ-Aufnahmeunterricht
    substitute_pool_maximum_weeks   numeric(5,2),                    -- Vikariate aus Pool höchstens (Wochen) | Stellvertretungen
    maximum_class_sizes             jsonb NOT NULL DEFAULT '{}'::jsonb,   -- Höchstzahlen je Abteilung | Prüfregel Klassengrösse, z. B. {"A":25}
    care_ratio                      numeric(5,2),                    -- Betreuungsschlüssel | Kinder je Betreuungsperson
    care_minimum_staff              integer,                         -- Mindestbesetzung | Tagesstrukturen
    school_weeks                    integer,                         -- Schulwochen | Wochenstunden ↔ Jahr
    care_annual_hours               numeric(7,2),                    -- Jahresarbeitszeit Betreuung | Tagesstrukturen
    source                          text,                            -- Quelle | z. B. «Weisung VZE 2026/27»
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, school_year_id)
);

-- Netto-Jahresarbeitszeit nach Altersstufe
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Lehrpersonalverordnung; für Pensum in Stunden je Person
CREATE TABLE planning_parameter_age_bands (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    planning_parameter_id   uuid NOT NULL REFERENCES planning_parameters(id) ON DELETE CASCADE,   -- Parameter | Verweis auf die Parameter
    maximum_age             integer NOT NULL,                -- Alter bis | Altersstufe
    net_hours               numeric(7,2) NOT NULL,           -- Netto-Jahresarbeitszeit | Stunden bei 100 %
    vacation_days           integer NOT NULL,                -- Ferientage | Anspruch der Altersstufe
    UNIQUE (planning_parameter_id, maximum_age)
);

-- Stellenplan einer Schule für ein Schuljahr (Eingaben der VZE-Formel)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Stellenplan und VZE»; Grundlage für VZE, Schulleitung, Gestaltungspool
CREATE TABLE staffing_plans (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_id               uuid NOT NULL REFERENCES organizations(id),   -- Schule | Auswahl in der Kopfzeile
    school_year_id          uuid NOT NULL REFERENCES school_years(id),     -- Schuljahr | Auswahl in der Kopfzeile
    student_count           integer NOT NULL CHECK (student_count >= 0),  -- Schülerzahl | Stichtag 15. September; VZE-Formel
    social_index            numeric(6,2) NOT NULL,           -- Sozialindex | Mittel der drei Vorjahre; VZE-Formel
    gsl_first_year_count    integer NOT NULL DEFAULT 0,      -- DaZ 1. Jahr (Anzahl) | Schüler/innen im ersten Jahr
    gsl_following_year_count integer NOT NULL DEFAULT 0,     -- DaZ Folgejahre (Anzahl) | Schüler/innen in Folgejahren
    therapy_fte             numeric(8,4) NOT NULL DEFAULT 0, -- Therapie (VZE) | Therapien der Schule
    status                  text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','reported','approved')),   -- Status | Meldung an den Kanton | intern | planning=in Planung; reported=gemeldet; approved=bewilligt
    is_budget_locked        boolean NOT NULL DEFAULT false,  -- Budget gesperrt | Sperre der Schulverwaltung in «Ressourcen»
    is_care_released        boolean NOT NULL DEFAULT false,  -- Betreuung freigegeben | Freigabe in «Tagesstrukturen»
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (school_id, school_year_id)
);

-- Koordination Sekundarschule je Person
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Stellenplan und VZE»; Teil des Stellenplans
CREATE TABLE staffing_plan_coordinations (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    staffing_plan_id        uuid NOT NULL REFERENCES staffing_plans(id) ON DELETE CASCADE,   -- Stellenplan | Verweis auf den Stellenplan
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | koordinierende Person
    fte                     numeric(8,4) NOT NULL CHECK (fte >= 0)   -- VZE | Anteil Koordination
);

-- Fach mit Kürzel (D, E, F, Ma, NT …)
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Lehrplan; gepflegt in «Parameter und Lektionentafeln», für Klassenlektionen und Matrix
CREATE TABLE subjects (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    code                    text NOT NULL,                   -- Kürzel | z. B. «Ma»
    name                    text NOT NULL,                   -- Fach | z. B. «Mathematik»
    is_active               boolean NOT NULL DEFAULT true,   -- Aktiv | in Auswahllisten anzeigen
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, code)
);

-- Lektionentafel eines Jahrgangs bzw. einer Abteilung
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Lehrplan und Tabelle «Klassen und VZE»; erzeugt die Klassenlektionen
CREATE TABLE lesson_tables (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_year_id          uuid NOT NULL REFERENCES school_years(id),   -- Schuljahr | Gültigkeit
    code                    text NOT NULL,                   -- Kürzel | z. B. «3A»
    name                    text NOT NULL,                   -- Bezeichnung | z. B. «3. Sek A»
    fte                     numeric(8,4) NOT NULL,           -- VZE je Klasse | Stellenplan
    class_lessons           numeric(6,2) NOT NULL,           -- Wochenlektionen der Klasse | Soll der Schüler/innen
    compulsory_lessons      text,                            -- Pflichtlektionen | Zahl oder Spanne wie im Lehrplan
    municipal_lessons       numeric(6,2) NOT NULL DEFAULT 0, -- Kommunale Lektionen | zusätzlich zur Tafel
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, school_year_id, code)
);

-- Fach in einer Lektionentafel
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: Lehrplan; erzeugt je Klasse die Klassenlektionen
CREATE TABLE lesson_table_subjects (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    lesson_table_id         uuid NOT NULL REFERENCES lesson_tables(id) ON DELETE CASCADE,   -- Lektionentafel | Verweis auf die Tafel
    subject_id              uuid NOT NULL REFERENCES subjects(id),   -- Fach | Verweis auf das Fach
    weekly_lessons          numeric(6,2) NOT NULL,           -- Wochenlektionen | Soll der Schüler/innen
    is_half_class           boolean NOT NULL DEFAULT false,  -- Halbklassen | verdoppelt die Lehrpersonen-Lektionen
    UNIQUE (lesson_table_id, subject_id)
);

-- ------------------------------------------------------------------ Personen und Anstellung

-- Person in der Planung eines Schuljahrs (Name und Kürzel in users)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Personen und Pensen»; Grundlage für Zuteilungen, Pensum und Freigabe
CREATE TABLE staff_members (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),           -- Person | Name und Kürzel aus der Personenreferenz
    school_id               uuid NOT NULL REFERENCES organizations(id),   -- Schule | Planung je Schule
    school_year_id          uuid NOT NULL REFERENCES school_years(id),    -- Schuljahr | Planung je Schuljahr
    staff_type              text NOT NULL CHECK (staff_type IN ('teacher','special_needs_teacher','therapist','principal','assistant','carer','administration','substitute','other')),   -- Art | Auswahl in «Personen und Pensen» | intern | teacher=Lehrperson; special_needs_teacher=Fachperson Sonderpädagogik; therapist=Therapie; principal=Schulleitung; assistant=Assistenz; carer=Betreuung; administration=Verwaltung; substitute=Stellvertretung; other=Weitere
    employment_type         text NOT NULL DEFAULT 'cantonal' CHECK (employment_type IN ('cantonal','municipal','other')),   -- Anstellung | Anstellungsträger | intern | cantonal=kantonal; municipal=kommunal; other=weitere
    birth_on                date,                            -- Geburtsdatum | Alter am Stichtag für die Netto-Jahresarbeitszeit | personenbezogen
    agreed_workload_percent numeric(5,2),                    -- Vereinbarter Beschäftigungsgrad | Soll in «Personen und Pensen»
    previous_workload_percent numeric(5,2),                  -- Pensum Vorjahr | Vergleich
    is_in_induction         boolean NOT NULL DEFAULT false,  -- Berufseinführung | Entlastung im ersten Berufsjahr
    entry_on                date,                            -- Eintritt | Anstellung ab
    exit_on                 date,                            -- Austritt | Anstellung bis
    remark                  text,                            -- Bemerkung | Freitext der Schulleitung | personenbezogen
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (user_id, school_id, school_year_id)
);

-- Fächer, die eine Person unterrichten kann
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Personen und Pensen»; Vorschläge bei Zuteilungen
CREATE TABLE staff_member_subjects (
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    staff_member_id         uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,   -- Person | Verweis auf die Person in der Planung
    subject_id              uuid NOT NULL REFERENCES subjects(id),   -- Fach | Verweis auf das Fach
    PRIMARY KEY (staff_member_id, subject_id)
);

-- ------------------------------------------------------------------ Klassen und Unterricht

-- Klasse eines Schuljahrs
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Klassen»; Grundlage für Klassenlektionen, VZE und Klassengrösse
CREATE TABLE classes (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_id               uuid NOT NULL REFERENCES organizations(id),   -- Schule | Planung je Schule
    school_year_id          uuid NOT NULL REFERENCES school_years(id),    -- Schuljahr | Planung je Schuljahr
    code                    text NOT NULL,                   -- Klasse | z. B. «1A»
    grade                   integer NOT NULL,                -- Jahrgang | 1.–3. Sek
    track                   text,                            -- Abteilung | A, B oder C
    lesson_table_id         uuid NOT NULL REFERENCES lesson_tables(id),   -- Lektionentafel | erzeugt die Klassenlektionen
    student_count           integer NOT NULL DEFAULT 0 CHECK (student_count >= 0),   -- Schülerzahl | für Klassengrösse und VZE
    previous_code           text,                            -- Name im Vorjahr | Folgejahr-Übernahme
    remark                  text,                            -- Bemerkung | Freitext
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (school_id, school_year_id, code)
);

-- Klassenlehrperson mit Stundenanteil
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Klassen»; 100 Stunden je Klasse, frei aufteilbar
CREATE TABLE class_teachers (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    class_id                uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,   -- Klasse | Verweis auf die Klasse
    staff_member_id         uuid NOT NULL REFERENCES staff_members(id),   -- Klassenlehrperson | Verweis auf die Person in der Planung
    hours                   numeric(6,2),                    -- Stundenanteil | leer = gleichmässig aufteilen
    UNIQUE (class_id, staff_member_id)
);

-- Ressourcentyp mit Budget (VZE Berufsauftrag, Gestaltungspool, kommunal, DaZ, Assistenz …)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Ressourcen»; Budget, Verbrauch und Saldo
CREATE TABLE resources (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_id               uuid NOT NULL REFERENCES organizations(id),   -- Schule | Planung je Schule
    school_year_id          uuid NOT NULL REFERENCES school_years(id),    -- Schuljahr | Planung je Schuljahr
    code                    text NOT NULL,                   -- Kürzel | z. B. «pool»
    name                    text NOT NULL,                   -- Ressource | z. B. «Gestaltungspool»
    unit                    text NOT NULL CHECK (unit IN ('weekly_lessons','percent','weekly_hours','hours','fte')),   -- Einheit | Budget und Zuteilungen | intern | weekly_lessons=WL; percent=%; weekly_hours=WStd; hours=Stunden; fte=VZE
    is_calculated           boolean NOT NULL DEFAULT false,  -- Berechnet | Budget aus der VZE-Formel statt Eingabe
    is_cantonal             boolean NOT NULL DEFAULT false,  -- Kantonal | kantonal finanziert
    budget                  numeric(10,2),                   -- Budget | Eingabe, wenn nicht berechnet
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (school_id, school_year_id, code)
);

-- Unterrichts- oder Einsatzgefäss: Klassenlektion, weitere Lektion, Sonderpädagogik oder Anstellung
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Unterricht und Einsätze»; erzeugt aus der Lektionentafel oder von Hand
CREATE TABLE assignments (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_id               uuid NOT NULL REFERENCES organizations(id),   -- Schule | Planung je Schule
    school_year_id          uuid NOT NULL REFERENCES school_years(id),    -- Schuljahr | Planung je Schuljahr
    assignment_group        text NOT NULL CHECK (assignment_group IN ('class_lesson','other_lesson','special_needs','position')),   -- Gruppe | Register in «Unterricht und Einsätze» | intern | class_lesson=Klassenlektionen; other_lesson=weitere Lektionen; special_needs=Sonderpädagogik; position=Anstellungen
    category                text,                            -- Kategorie | Wahlfach, Freifach, Kurs, Niveau, Betreuung …
    name                    text,                            -- Bezeichnung | frei bei weiteren Lektionen und Anstellungen
    class_id                uuid REFERENCES classes(id) ON DELETE CASCADE,   -- Klasse | bei Klassenlektionen
    subject_id              uuid REFERENCES subjects(id),    -- Fach | bei Lektionen
    level                   text,                            -- Stufe | z. B. «Sek 3»
    unit                    text NOT NULL DEFAULT 'weekly_lessons' CHECK (unit IN ('weekly_lessons','percent','weekly_hours')),   -- Einheit | Soll und Zuteilungen | intern | weekly_lessons=WL; percent=%; weekly_hours=WStd
    student_lessons         numeric(6,2),                    -- WL Schüler/innen | aus der Lektionentafel
    teacher_amount          numeric(6,2),                    -- Soll Lehrperson | WL, % oder WStd; leer = aus WL Schüler/innen
    is_half_class           boolean NOT NULL DEFAULT false,  -- Halbklassen | verdoppelt die Lehrpersonen-Lektionen
    is_first_semester       boolean NOT NULL DEFAULT true,   -- 1. Semester | Semesterfach zählt halb
    is_second_semester      boolean NOT NULL DEFAULT true,   -- 2. Semester | Semesterfach zählt halb
    hours_factor            numeric(6,2),                    -- Abweichender Faktor | Stunden je Jahreslektion; leer = Standard
    is_additional           boolean NOT NULL DEFAULT false,  -- Zusätzlich | ausserhalb der Lektionentafel (IF, DaZ, Teamteaching)
    resource_id             uuid NOT NULL REFERENCES resources(id),   -- Ressource | Finanzierung
    remark                  text,                            -- Bemerkung | Freitext
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    CHECK (assignment_group <> 'class_lesson' OR class_id IS NOT NULL),
    CHECK (is_first_semester OR is_second_semester)
);

-- Zuteilung eines Gefässes an eine Person
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Unterricht und Einsätze» und «Klasse – Fach – Lehrperson»; ergibt das Pensum
CREATE TABLE assignment_allocations (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    assignment_id           uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,   -- Gefäss | Verweis auf das Gefäss
    staff_member_id         uuid NOT NULL REFERENCES staff_members(id),   -- Person | Verweis auf die Person in der Planung
    amount                  numeric(6,2) NOT NULL CHECK (amount >= 0),    -- Menge | in der Einheit des Gefässes
    UNIQUE (assignment_id, staff_member_id)
);

-- ------------------------------------------------------------------ Berufsauftrag

-- Gefäss des Berufsauftrags (Konferenz, Amt, Kustodie, Weiterbildung …)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Berufsauftrag»; Stunden je Person nach Regel
CREATE TABLE job_duties (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_id               uuid NOT NULL REFERENCES organizations(id),   -- Schule | Planung je Schule
    school_year_id          uuid NOT NULL REFERENCES school_years(id),    -- Schuljahr | Planung je Schuljahr
    name                    text NOT NULL,                   -- Bezeichnung | z. B. «Schulkonferenz»
    code                    text,                            -- Kürzel | z. B. «SK»
    area                    text NOT NULL CHECK (area IN ('teaching','school','collaboration','training','flex')),   -- Tätigkeitsbereich | Berufsauftrag | intern | teaching=Unterricht; school=Schule; collaboration=Zusammenarbeit; training=Weiterbildung; flex=Flex
    funding_type            text NOT NULL CHECK (funding_type IN ('allowance','additional')),   -- Art | aus Pauschale oder zusätzlich | intern | allowance=aus Pauschale; additional=zusätzlich
    rule_type               text NOT NULL CHECK (rule_type IN ('fixed','linear')),   -- Regel | Stunden je Person | intern | fixed=fix; linear=nach Wochenlektionen
    hours                   numeric(7,2),                    -- Stunden | bei fixer Regel
    base_hours              numeric(7,2),                    -- Sockel | bei linearer Regel
    base_up_to_lessons      numeric(6,2),                    -- Sockel bis (WL) | bei linearer Regel
    full_from_lessons       numeric(6,2),                    -- Gesamte Zeit ab (WL) | bei linearer Regel
    maximum_hours           numeric(7,2),                    -- Höchstens | Obergrenze
    session_count           integer,                         -- Anzahl Sitzungen | Präsenz × Anzahl
    attendance_hours        numeric(6,2),                    -- Präsenz je Sitzung | Stunden
    preparation_hours       numeric(6,2),                    -- Vorbereitung je Sitzung | Stunden
    is_office               boolean NOT NULL DEFAULT false,  -- Amt | z. B. Stufenleitung
    is_custodianship        boolean NOT NULL DEFAULT false,  -- Kustodie | z. B. Informatikräume
    is_compensated          boolean NOT NULL DEFAULT false,  -- Entschädigt | separat entschädigt
    target_hours            numeric(7,2),                    -- Stunden-Soll | bei Ämtern und Kustodien
    resource_id             uuid REFERENCES resources(id),   -- Ressource | Finanzierung zusätzlicher Stunden
    description             text,                            -- Beschreibung | Freitext
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- Teilnahme einer Person an einem Gefäss des Berufsauftrags
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Berufsauftrag»; Stunden fliessen ins Pensum
CREATE TABLE job_duty_participants (
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    job_duty_id             uuid NOT NULL REFERENCES job_duties(id) ON DELETE CASCADE,   -- Gefäss | Verweis auf das Gefäss
    staff_member_id         uuid NOT NULL REFERENCES staff_members(id),   -- Person | Verweis auf die Person in der Planung
    hours_override          numeric(7,2),                    -- Abweichende Stunden | Entlastung bzw. individuelle Stunden
    PRIMARY KEY (job_duty_id, staff_member_id)
);

-- ------------------------------------------------------------------ Freigabe und Anstellung

-- Freigabe des Pensums einer Person mit eingefrorenem Stand
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «Freigaben»: Schulleitung gibt frei, Schulverwaltung stellt an; Änderungen danach werden erkannt
CREATE TABLE releases (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    staff_member_id         uuid NOT NULL REFERENCES staff_members(id),   -- Person | Verweis auf die Person in der Planung
    status                  text NOT NULL DEFAULT 'released' CHECK (status IN ('released','employed','completed','withdrawn')),   -- Status | Ablauf der Freigabe | intern | released=freigegeben; employed=angestellt; completed=erledigt; withdrawn=zurückgezogen
    snapshot                jsonb NOT NULL,                  -- Stand bei Freigabe | WL, Stunden, Beschäftigungsgrad, Posten (Abbild)
    released_at             timestamptz NOT NULL DEFAULT now(),   -- Freigegeben am | Zeitpunkt der Freigabe
    released_by_id          uuid NOT NULL,                   -- Freigegeben von | Schulleitung (ohne Constraint)
    employed_at             timestamptz,                     -- Angestellt am | Schulverwaltung
    employed_by_id          uuid,                            -- Angestellt von | Schulverwaltung (ohne Constraint)
    remark                  text,                            -- Bemerkung | Freitext der Schulleitung
    administration_note     text,                            -- Rückmeldung Schulverwaltung | Freitext
    lock_version            integer NOT NULL DEFAULT 1
);

-- Verlauf der Planung (wer hat was getan)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: geschrieben bei Freigabe, Anstellung, Sperre, Umfrage; Anzeige «Verlauf» in «Freigaben»
CREATE TABLE planning_events (
    id                      bigserial PRIMARY KEY,
    event_id                uuid NOT NULL UNIQUE,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_id               uuid REFERENCES organizations(id),   -- Schule | Planung je Schule
    occurred_at             timestamptz NOT NULL DEFAULT now(),  -- Zeitpunkt | wann
    actor_id                uuid,                            -- Auslöser | Person (ohne Constraint)
    actor_role              text NOT NULL,                   -- Rolle | Rolle beim Auslösen
    text                    text NOT NULL,                   -- Eintrag | Beschreibung des Vorgangs
    subject_type            text,                            -- Bezug (Tabelle) | betroffene Tabelle
    subject_id              uuid                             -- Bezug (ID) | betroffener Datensatz
);

-- ------------------------------------------------------------------ Pensenumfrage

-- Pensenumfrage einer Person für das nächste Schuljahr
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: ausgefüllt von der Person in «Pensenumfrage»; Grundlage der Planung
CREATE TABLE workload_surveys (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    staff_member_id         uuid NOT NULL UNIQUE REFERENCES staff_members(id),   -- Person | Verweis auf die Person in der Planung | intern
    status                  text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','in_progress','submitted','applied')),   -- Status | Ablauf der Umfrage | intern | invited=eingeladen; in_progress=in Bearbeitung; submitted=eingereicht; applied=übernommen
    continuation            text CHECK (continuation IN ('yes','no','open')),   -- Weiterbeschäftigung | Antwort der Person | personenbezogen | yes=ja; no=nein; open=offen
    desired_workload_percent numeric(5,2),                   -- Wunschpensum (%) | Antwort der Person
    desired_lessons         numeric(6,2),                    -- Wunschpensum (WL) | Antwort der Person
    levels                  text,                            -- Stufen | Antwort der Person
    subjects_wish           text,                            -- Fächer | Antwort der Person
    class_teacher_wish      text CHECK (class_teacher_wish IN ('yes','no','any')),   -- Klassenlehrperson | Antwort der Person | personenbezogen | yes=ja; no=nein; any=egal
    wishes                  text,                            -- Wünsche | Freitext der Person
    blocked_times           text,                            -- Sperrzeiten | Freitext der Person
    free_days               text,                            -- Freie Tage | Freitext der Person
    remark                  text,                            -- Bemerkung | Freitext der Person
    invited_at              timestamptz,                     -- Eingeladen am | Einladung | intern
    reminded_at             timestamptz,                     -- Erinnert am | Erinnerung | intern
    submitted_at            timestamptz,                     -- Eingereicht am | Abgabe | intern
    updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------------ Stellvertretungen und Mutationen

-- Ausfall einer Person mit Stellvertretung
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Stellvertretungen»; Meldung an den Kanton, Finanzierung
CREATE TABLE absences (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    staff_member_id         uuid NOT NULL REFERENCES staff_members(id),   -- Person | abwesende Person
    reason                  text NOT NULL CHECK (reason IN ('illness','accident','training','maternity','leave','military_service','other')),   -- Grund | nur Kategorie, keine Diagnose | besonders schützenswert | illness=Krankheit; accident=Unfall; training=Weiterbildung; maternity=Mutterschaft; leave=Urlaub; military_service=Militär/Zivildienst; other=Andere
    valid_from              date NOT NULL,                   -- Von | erster Tag
    valid_until             date NOT NULL,                   -- Bis | letzter Tag
    weekly_lessons          numeric(6,2) NOT NULL,           -- Wochenlektionen | zu vertretende Lektionen
    substitute_id           uuid REFERENCES staff_members(id),   -- Stellvertretung | vertretende Person
    funding                 text NOT NULL,                   -- Finanzierung | z. B. «Kurzvikariat», «Gestaltungspool»
    status                  text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','planned','reported','closed')),   -- Status | Ablauf | intern | recorded=erfasst; planned=geplant; reported=an Kanton gemeldet; closed=abgeschlossen
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    CHECK (valid_until >= valid_from)
);

-- Rapport der gehaltenen Vikariatslektionen je Tag
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Stellvertretungen»; Abrechnung und Meldung
CREATE TABLE absence_reports (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    absence_id              uuid NOT NULL REFERENCES absences(id) ON DELETE CASCADE,   -- Ausfall | Verweis auf den Ausfall
    held_on                 date NOT NULL,                   -- Datum | Tag der Vertretung
    lessons                 numeric(4,1) NOT NULL CHECK (lessons >= 0),   -- Lektionen | gehaltene Lektionen
    UNIQUE (absence_id, held_on)
);

-- Mutation während des Schuljahrs (Teamteaching, Teilung …)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Stellenplan und VZE»; Begründung und Finanzierung
CREATE TABLE mid_year_changes (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    class_id                uuid REFERENCES classes(id),     -- Klasse | betroffene Klasse
    change_type             text NOT NULL,                   -- Was | z. B. «Teamteaching»
    reason                  text NOT NULL,                   -- Warum | Begründung
    weekly_lessons          numeric(6,2) NOT NULL,           -- Lektionen | zusätzliche Wochenlektionen
    funding                 text NOT NULL,                   -- Finanzierung | z. B. «Gestaltungspool»
    staff_member_id         uuid REFERENCES staff_members(id),   -- Person | übernehmende Person
    starts_on               date NOT NULL,                   -- Start | ab wann
    status                  text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','requested','approved','rejected')),   -- Status | Bewilligung | intern | recorded=erfasst; requested=beantragt; approved=bewilligt; rejected=abgelehnt
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- ------------------------------------------------------------------ Gespräche und Personaldossier

-- Mitarbeitendengespräch, Probezeitgespräch, Unterrichtsbesuch
-- Geltungsbereich: Organisation · Datenklasse: besonders schützenswert
-- Herkunft/Verwendung: geplant in «Personalgespräche»; Dokumentation im Personaldossier
CREATE TABLE staff_reviews (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | Mitarbeiterin bzw. Mitarbeiter | intern
    review_type             text NOT NULL,                   -- Art | z. B. «Probezeitgespräch» | intern
    held_on                 date NOT NULL,                   -- Datum | Termin | intern
    status                  text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','form_prepared','held','documented')),   -- Status | Ablauf | intern | planned=geplant; form_prepared=Formular vorbereitet; held=durchgeführt; documented=dokumentiert
    is_shared               boolean NOT NULL DEFAULT false,  -- Freigegeben | für die Person einsehbar | intern
    lead_user_id            uuid REFERENCES users(id) ON DELETE SET NULL,   -- Gesprächsleitung | Schulleitung | intern
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- Kategorie des Personaldossiers
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Personalführung; Gliederung in «Personaldossier»
CREATE TABLE dossier_categories (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    position                integer NOT NULL,                -- Reihenfolge | Anzeige
    name                    text NOT NULL,                   -- Kategorie | z. B. «Mitarbeitendenbeurteilung»
    retention_years         integer,                         -- Aufbewahrung (Jahre) | Löschfrist nach Archivgesetz (zu prüfen)
    UNIQUE (organization_id, position)
);

-- Vorlage für einen Dossiereintrag
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «+ Eintrag aus Vorlage» im Personaldossier
CREATE TABLE dossier_templates (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    title                   text NOT NULL,                   -- Titel | z. B. «Zielvereinbarung»
    dossier_category_id     uuid NOT NULL REFERENCES dossier_categories(id)   -- Kategorie | Verweis auf die Kategorie
);

-- Eintrag im Personaldossier; die Datei liegt in der Dokumentenablage
-- Geltungsbereich: Organisation · Datenklasse: besonders schützenswert
-- Herkunft/Verwendung: erfasst in «Personaldossier»; Nachweis der Personalführung
CREATE TABLE dossier_entries (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | Mitarbeiterin bzw. Mitarbeiter | intern
    dossier_category_id     uuid NOT NULL REFERENCES dossier_categories(id),   -- Kategorie | Gliederung | intern
    title                   text NOT NULL,                   -- Titel | z. B. «Anstellungsverfügung»
    entry_on                date NOT NULL,                   -- Datum | Datum des Dokuments | intern
    note                    text,                            -- Notiz | Freitext
    document_uri            text,                            -- Dokument | Verweis in die Dokumentenablage (z. B. EduKSX-Sign) | intern
    staff_review_id         uuid REFERENCES staff_reviews(id),   -- Gespräch | Verweis auf das Gespräch | intern
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);

-- ------------------------------------------------------------------ Tagesstrukturen und Termine

-- Angebot der Tagesstrukturen an einem Wochentag
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: erfasst in «Tagesstrukturen»; Bedarf an Betreuungspersonen
CREATE TABLE care_offerings (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_id               uuid NOT NULL REFERENCES organizations(id),   -- Schule | Planung je Schule
    school_year_id          uuid NOT NULL REFERENCES school_years(id),    -- Schuljahr | Planung je Schuljahr
    name                    text NOT NULL,                   -- Angebot | z. B. «Mittagstisch»
    weekday                 smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),   -- Wochentag | 1 = Montag
    starts_at_time          time NOT NULL,                   -- Von | Uhrzeit
    ends_at_time            time NOT NULL,                   -- Bis | Uhrzeit
    child_count             integer NOT NULL DEFAULT 0,      -- Kinder | angemeldete Kinder
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1,
    CHECK (ends_at_time > starts_at_time)
);

-- Frist im Jahresablauf der Planung
-- Geltungsbereich: Organisation · Datenklasse: öffentlich
-- Herkunft/Verwendung: «Jahresablauf und Fristen»; als Ereignis im Jahreskalender von EduKSX-Flow
CREATE TABLE deadlines (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    school_year_id          uuid NOT NULL REFERENCES school_years(id),   -- Schuljahr | Gültigkeit
    due_on                  date NOT NULL,                   -- Datum | Frist
    title                   text NOT NULL,                   -- Titel | z. B. «Stichtag Schülerzahlen»
    responsible_role        text NOT NULL,                   -- Wer | zuständige Rolle
    flow_event_code         text                             -- Kalenderereignis | Verweis auf EduKSX-Flow
);

-- ------------------------------------------------------------------ Ansichten (berechnet, nicht gespeichert)

-- Zugeteilte Menge je Person und Einheit
-- Grundlage für «Personen und Pensen» (Ist-Pensum); Semesterfächer zählen halb
CREATE VIEW staff_member_totals AS
SELECT a.organization_id, g.school_id, g.school_year_id, a.staff_member_id, g.unit,
       sum(a.amount * (CASE WHEN g.is_first_semester AND g.is_second_semester THEN 1 ELSE 0.5 END)) AS annual_amount
FROM assignment_allocations a JOIN assignments g ON g.id = a.assignment_id
WHERE g.deleted_at IS NULL
GROUP BY a.organization_id, g.school_id, g.school_year_id, a.staff_member_id, g.unit;

-- Verbrauch je Ressource
-- Grundlage für «Ressourcen» (Budget, Verplant, Saldo)
CREATE VIEW resource_usages AS
SELECT r.id AS resource_id, r.organization_id, r.school_id, r.school_year_id, r.code, r.unit, r.budget,
       coalesce(sum(a.amount * (CASE WHEN g.is_first_semester AND g.is_second_semester THEN 1 ELSE 0.5 END)), 0) AS allocated
FROM resources r
LEFT JOIN assignments g ON g.resource_id = r.id AND g.deleted_at IS NULL
LEFT JOIN assignment_allocations a ON a.assignment_id = g.id
GROUP BY r.id;

-- Offene Menge je Gefäss
-- Soll minus zugeteilt, z. B. «Stelle noch offen»
CREATE VIEW assignment_open_amounts AS
SELECT g.id AS assignment_id, g.organization_id, g.school_id, g.school_year_id,
       coalesce(g.teacher_amount, g.student_lessons * CASE WHEN g.is_half_class THEN 2 ELSE 1 END) AS target_amount,
       coalesce(sum(a.amount), 0) AS allocated
FROM assignments g LEFT JOIN assignment_allocations a ON a.assignment_id = g.id
GROUP BY g.id;

-- Ausnahmetabelle (doppelt gespeichert, DB A2)
-- releases.snapshot: Abbild von Pensum und Posten bei der Freigabe – Grund: Änderungen nach der Freigabe erkennen; nie aktualisiert
-- planning_events.text: lesbarer Text des Vorgangs – Grund: Verlauf bleibt lesbar, auch wenn Daten geändert werden; nie aktualisiert

-- >>> indizes
CREATE INDEX organizations_parent_id_index ON organizations (parent_id);
CREATE INDEX users_organization_id_index ON users (organization_id);
CREATE INDEX school_holidays_organization_id_index ON school_holidays (organization_id);
CREATE INDEX school_holidays_school_year_id_index ON school_holidays (school_year_id);
CREATE INDEX planning_parameters_school_year_id_index ON planning_parameters (school_year_id);
CREATE INDEX planning_parameter_age_bands_organization_id_index ON planning_parameter_age_bands (organization_id);
CREATE INDEX staffing_plans_organization_id_index ON staffing_plans (organization_id);
CREATE INDEX staffing_plans_school_year_id_index ON staffing_plans (school_year_id);
CREATE INDEX staffing_plan_coordinations_organization_id_index ON staffing_plan_coordinations (organization_id);
CREATE INDEX staffing_plan_coordinations_staffing_plan_id_index ON staffing_plan_coordinations (staffing_plan_id);
CREATE INDEX staffing_plan_coordinations_user_id_index ON staffing_plan_coordinations (user_id);
CREATE INDEX lesson_tables_school_year_id_index ON lesson_tables (school_year_id);
CREATE INDEX lesson_table_subjects_organization_id_index ON lesson_table_subjects (organization_id);
CREATE INDEX lesson_table_subjects_subject_id_index ON lesson_table_subjects (subject_id);
CREATE INDEX staff_members_organization_id_index ON staff_members (organization_id);
CREATE INDEX staff_members_school_id_index ON staff_members (school_id);
CREATE INDEX staff_members_school_year_id_index ON staff_members (school_year_id);
CREATE INDEX staff_member_subjects_organization_id_index ON staff_member_subjects (organization_id);
CREATE INDEX classes_organization_id_index ON classes (organization_id);
CREATE INDEX classes_school_year_id_index ON classes (school_year_id);
CREATE INDEX classes_lesson_table_id_index ON classes (lesson_table_id);
CREATE INDEX class_teachers_organization_id_index ON class_teachers (organization_id);
CREATE INDEX class_teachers_staff_member_id_index ON class_teachers (staff_member_id);
CREATE INDEX resources_organization_id_index ON resources (organization_id);
CREATE INDEX resources_school_year_id_index ON resources (school_year_id);
CREATE INDEX assignments_organization_id_index ON assignments (organization_id);
CREATE INDEX assignments_school_id_index ON assignments (school_id);
CREATE INDEX assignments_school_year_id_index ON assignments (school_year_id);
CREATE INDEX assignments_class_id_index ON assignments (class_id);
CREATE INDEX assignments_subject_id_index ON assignments (subject_id);
CREATE INDEX assignments_resource_id_index ON assignments (resource_id);
CREATE INDEX assignment_allocations_organization_id_index ON assignment_allocations (organization_id);
CREATE INDEX assignment_allocations_staff_member_id_index ON assignment_allocations (staff_member_id);
CREATE INDEX job_duties_organization_id_index ON job_duties (organization_id);
CREATE INDEX job_duties_school_id_index ON job_duties (school_id);
CREATE INDEX job_duties_school_year_id_index ON job_duties (school_year_id);
CREATE INDEX job_duties_resource_id_index ON job_duties (resource_id);
CREATE INDEX job_duty_participants_organization_id_index ON job_duty_participants (organization_id);
CREATE INDEX releases_organization_id_index ON releases (organization_id);
CREATE INDEX releases_staff_member_id_index ON releases (staff_member_id);
CREATE INDEX planning_events_organization_id_index ON planning_events (organization_id);
CREATE INDEX planning_events_school_id_index ON planning_events (school_id);
CREATE INDEX workload_surveys_organization_id_index ON workload_surveys (organization_id);
CREATE INDEX absences_organization_id_index ON absences (organization_id);
CREATE INDEX absences_staff_member_id_index ON absences (staff_member_id);
CREATE INDEX absences_substitute_id_index ON absences (substitute_id);
CREATE INDEX absence_reports_organization_id_index ON absence_reports (organization_id);
CREATE INDEX mid_year_changes_organization_id_index ON mid_year_changes (organization_id);
CREATE INDEX mid_year_changes_class_id_index ON mid_year_changes (class_id);
CREATE INDEX mid_year_changes_staff_member_id_index ON mid_year_changes (staff_member_id);
CREATE INDEX staff_reviews_organization_id_index ON staff_reviews (organization_id);
CREATE INDEX staff_reviews_user_id_index ON staff_reviews (user_id);
CREATE INDEX staff_reviews_lead_user_id_index ON staff_reviews (lead_user_id);
CREATE INDEX dossier_templates_organization_id_index ON dossier_templates (organization_id);
CREATE INDEX dossier_templates_dossier_category_id_index ON dossier_templates (dossier_category_id);
CREATE INDEX dossier_entries_organization_id_index ON dossier_entries (organization_id);
CREATE INDEX dossier_entries_user_id_index ON dossier_entries (user_id);
CREATE INDEX dossier_entries_dossier_category_id_index ON dossier_entries (dossier_category_id);
CREATE INDEX dossier_entries_staff_review_id_index ON dossier_entries (staff_review_id);
CREATE INDEX care_offerings_organization_id_index ON care_offerings (organization_id);
CREATE INDEX care_offerings_school_id_index ON care_offerings (school_id);
CREATE INDEX care_offerings_school_year_id_index ON care_offerings (school_year_id);
CREATE INDEX deadlines_organization_id_index ON deadlines (organization_id);
CREATE INDEX deadlines_school_year_id_index ON deadlines (school_year_id);
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
COMMENT ON TABLE planning_parameters IS 'Kantonale und kommunale Parameter eines Schuljahrs – Weisung VZE und Lehrpersonalverordnung des Kantons; gepflegt in «Parameter und Lektionentafeln», Grundlage aller Berechnungen';
COMMENT ON COLUMN planning_parameters.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN planning_parameters.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN planning_parameters.school_year_id IS 'Schuljahr – Gültigkeit der Parameter';
COMMENT ON COLUMN planning_parameters.canton IS 'Kanton – Herkunft der Vorgaben';
COMMENT ON COLUMN planning_parameters.reference_year IS 'Stichjahr – Alter der Personen am Stichtag';
COMMENT ON COLUMN planning_parameters.planning_on IS 'Planungsdatum – Stand der Planung';
COMMENT ON COLUMN planning_parameters.hours_per_annual_lesson IS 'Faktor je Jahreslektion – Stunden je Wochenlektion und Jahr';
COMMENT ON COLUMN planning_parameters.class_teacher_hours IS 'Klassenlehrperson (Stunden) – je Klasse, frei aufteilbar';
COMMENT ON COLUMN planning_parameters.school_allowance_hours IS 'Pauschale Schule – Berufsauftrag bei 100 %';
COMMENT ON COLUMN planning_parameters.collaboration_allowance_hours IS 'Pauschale Zusammenarbeit – Berufsauftrag bei 100 %';
COMMENT ON COLUMN planning_parameters.training_allowance_hours IS 'Pauschale Weiterbildung – Berufsauftrag bei 100 %';
COMMENT ON COLUMN planning_parameters.gross_annual_hours IS 'Brutto-Jahresarbeitszeit – Umrechnung Stunden ↔ Prozent';
COMMENT ON COLUMN planning_parameters.minimum_workload_percent IS 'Mindestpensum – Prüfregel Personen und Pensen';
COMMENT ON COLUMN planning_parameters.maximum_workload_percent IS 'Maximalpensum – Prüfregel Personen und Pensen';
COMMENT ON COLUMN planning_parameters.minimum_teaching_share_percent IS 'Mindestanteil Unterricht – Prüfregel';
COMMENT ON COLUMN planning_parameters.class_teacher_minimum_lessons IS 'Mindestlektionen Klassenlehrperson – Prüfregel';
COMMENT ON COLUMN planning_parameters.custodian_maximum_hours IS 'Kustodie höchstens – Prüfregel Ämter';
COMMENT ON COLUMN planning_parameters.lessons_per_fte IS 'Wochenlektionen je VZE – Umrechnung VZE ↔ Lektionen';
COMMENT ON COLUMN planning_parameters.base_value IS 'Basiswert – VZE-Formel';
COMMENT ON COLUMN planning_parameters.correction_factor IS 'Korrekturfaktor – VZE-Formel';
COMMENT ON COLUMN planning_parameters.principal_base_fte IS 'Schulleitung Sockel – VZE Schulleitung';
COMMENT ON COLUMN planning_parameters.principal_per_fte IS 'Schulleitung je VZE – VZE Schulleitung';
COMMENT ON COLUMN planning_parameters.principal_large_per_25_fte IS 'Schulleitung je 25 VZE – ab 25 VZE';
COMMENT ON COLUMN planning_parameters.design_pool_per_fte IS 'Gestaltungspool je VZE – Gestaltungspool';
COMMENT ON COLUMN planning_parameters.coordination_per_fte IS 'Koordination Sek je VZE – Koordination';
COMMENT ON COLUMN planning_parameters.therapy_max_per_100_students IS 'Therapien höchstens je 100 SuS – Prüfregel Stellenplan';
COMMENT ON COLUMN planning_parameters.gsl_first_year_lessons IS 'DaZ 1. Jahr (WL) – DaZ-Aufnahmeunterricht';
COMMENT ON COLUMN planning_parameters.gsl_following_year_lessons IS 'DaZ Folgejahre (WL) – DaZ-Aufnahmeunterricht';
COMMENT ON COLUMN planning_parameters.substitute_pool_maximum_weeks IS 'Vikariate aus Pool höchstens (Wochen) – Stellvertretungen';
COMMENT ON COLUMN planning_parameters.maximum_class_sizes IS 'Höchstzahlen je Abteilung – Prüfregel Klassengrösse, z. B. {"A":25}';
COMMENT ON COLUMN planning_parameters.care_ratio IS 'Betreuungsschlüssel – Kinder je Betreuungsperson';
COMMENT ON COLUMN planning_parameters.care_minimum_staff IS 'Mindestbesetzung – Tagesstrukturen';
COMMENT ON COLUMN planning_parameters.school_weeks IS 'Schulwochen – Wochenstunden ↔ Jahr';
COMMENT ON COLUMN planning_parameters.care_annual_hours IS 'Jahresarbeitszeit Betreuung – Tagesstrukturen';
COMMENT ON COLUMN planning_parameters.source IS 'Quelle – z. B. «Weisung VZE 2026/27»';
COMMENT ON COLUMN planning_parameters.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN planning_parameters.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN planning_parameters.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN planning_parameters.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN planning_parameters.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE planning_parameter_age_bands IS 'Netto-Jahresarbeitszeit nach Altersstufe – Lehrpersonalverordnung; für Pensum in Stunden je Person';
COMMENT ON COLUMN planning_parameter_age_bands.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN planning_parameter_age_bands.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN planning_parameter_age_bands.planning_parameter_id IS 'Parameter – Verweis auf die Parameter';
COMMENT ON COLUMN planning_parameter_age_bands.maximum_age IS 'Alter bis – Altersstufe';
COMMENT ON COLUMN planning_parameter_age_bands.net_hours IS 'Netto-Jahresarbeitszeit – Stunden bei 100 %';
COMMENT ON COLUMN planning_parameter_age_bands.vacation_days IS 'Ferientage – Anspruch der Altersstufe';
COMMENT ON TABLE staffing_plans IS 'Stellenplan einer Schule für ein Schuljahr (Eingaben der VZE-Formel) – erfasst in «Stellenplan und VZE»; Grundlage für VZE, Schulleitung, Gestaltungspool';
COMMENT ON COLUMN staffing_plans.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN staffing_plans.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN staffing_plans.school_id IS 'Schule – Auswahl in der Kopfzeile';
COMMENT ON COLUMN staffing_plans.school_year_id IS 'Schuljahr – Auswahl in der Kopfzeile';
COMMENT ON COLUMN staffing_plans.student_count IS 'Schülerzahl – Stichtag 15. September; VZE-Formel';
COMMENT ON COLUMN staffing_plans.social_index IS 'Sozialindex – Mittel der drei Vorjahre; VZE-Formel';
COMMENT ON COLUMN staffing_plans.gsl_first_year_count IS 'DaZ 1. Jahr (Anzahl) – Schüler/innen im ersten Jahr';
COMMENT ON COLUMN staffing_plans.gsl_following_year_count IS 'DaZ Folgejahre (Anzahl) – Schüler/innen in Folgejahren';
COMMENT ON COLUMN staffing_plans.therapy_fte IS 'Therapie (VZE) – Therapien der Schule';
COMMENT ON COLUMN staffing_plans.status IS 'Status – Meldung an den Kanton';
COMMENT ON COLUMN staffing_plans.is_budget_locked IS 'Budget gesperrt – Sperre der Schulverwaltung in «Ressourcen»';
COMMENT ON COLUMN staffing_plans.is_care_released IS 'Betreuung freigegeben – Freigabe in «Tagesstrukturen»';
COMMENT ON COLUMN staffing_plans.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN staffing_plans.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN staffing_plans.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN staffing_plans.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN staffing_plans.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN staffing_plans.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN staffing_plans.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE staffing_plan_coordinations IS 'Koordination Sekundarschule je Person – erfasst in «Stellenplan und VZE»; Teil des Stellenplans';
COMMENT ON COLUMN staffing_plan_coordinations.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN staffing_plan_coordinations.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN staffing_plan_coordinations.staffing_plan_id IS 'Stellenplan – Verweis auf den Stellenplan';
COMMENT ON COLUMN staffing_plan_coordinations.user_id IS 'Person – koordinierende Person';
COMMENT ON COLUMN staffing_plan_coordinations.fte IS 'VZE – Anteil Koordination';
COMMENT ON TABLE subjects IS 'Fach mit Kürzel (D, E, F, Ma, NT …) – Lehrplan; gepflegt in «Parameter und Lektionentafeln», für Klassenlektionen und Matrix';
COMMENT ON COLUMN subjects.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN subjects.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN subjects.code IS 'Kürzel – z. B. «Ma»';
COMMENT ON COLUMN subjects.name IS 'Fach – z. B. «Mathematik»';
COMMENT ON COLUMN subjects.is_active IS 'Aktiv – in Auswahllisten anzeigen';
COMMENT ON COLUMN subjects.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN subjects.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN subjects.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE lesson_tables IS 'Lektionentafel eines Jahrgangs bzw. einer Abteilung – Lehrplan und Tabelle «Klassen und VZE»; erzeugt die Klassenlektionen';
COMMENT ON COLUMN lesson_tables.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN lesson_tables.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN lesson_tables.school_year_id IS 'Schuljahr – Gültigkeit';
COMMENT ON COLUMN lesson_tables.code IS 'Kürzel – z. B. «3A»';
COMMENT ON COLUMN lesson_tables.name IS 'Bezeichnung – z. B. «3. Sek A»';
COMMENT ON COLUMN lesson_tables.fte IS 'VZE je Klasse – Stellenplan';
COMMENT ON COLUMN lesson_tables.class_lessons IS 'Wochenlektionen der Klasse – Soll der Schüler/innen';
COMMENT ON COLUMN lesson_tables.compulsory_lessons IS 'Pflichtlektionen – Zahl oder Spanne wie im Lehrplan';
COMMENT ON COLUMN lesson_tables.municipal_lessons IS 'Kommunale Lektionen – zusätzlich zur Tafel';
COMMENT ON COLUMN lesson_tables.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN lesson_tables.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN lesson_tables.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE lesson_table_subjects IS 'Fach in einer Lektionentafel – Lehrplan; erzeugt je Klasse die Klassenlektionen';
COMMENT ON COLUMN lesson_table_subjects.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN lesson_table_subjects.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN lesson_table_subjects.lesson_table_id IS 'Lektionentafel – Verweis auf die Tafel';
COMMENT ON COLUMN lesson_table_subjects.subject_id IS 'Fach – Verweis auf das Fach';
COMMENT ON COLUMN lesson_table_subjects.weekly_lessons IS 'Wochenlektionen – Soll der Schüler/innen';
COMMENT ON COLUMN lesson_table_subjects.is_half_class IS 'Halbklassen – verdoppelt die Lehrpersonen-Lektionen';
COMMENT ON TABLE staff_members IS 'Person in der Planung eines Schuljahrs (Name und Kürzel in users) – erfasst in «Personen und Pensen»; Grundlage für Zuteilungen, Pensum und Freigabe';
COMMENT ON COLUMN staff_members.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN staff_members.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN staff_members.user_id IS 'Person – Name und Kürzel aus der Personenreferenz';
COMMENT ON COLUMN staff_members.school_id IS 'Schule – Planung je Schule';
COMMENT ON COLUMN staff_members.school_year_id IS 'Schuljahr – Planung je Schuljahr';
COMMENT ON COLUMN staff_members.staff_type IS 'Art – Auswahl in «Personen und Pensen»';
COMMENT ON COLUMN staff_members.employment_type IS 'Anstellung – Anstellungsträger';
COMMENT ON COLUMN staff_members.birth_on IS 'Geburtsdatum – Alter am Stichtag für die Netto-Jahresarbeitszeit';
COMMENT ON COLUMN staff_members.agreed_workload_percent IS 'Vereinbarter Beschäftigungsgrad – Soll in «Personen und Pensen»';
COMMENT ON COLUMN staff_members.previous_workload_percent IS 'Pensum Vorjahr – Vergleich';
COMMENT ON COLUMN staff_members.is_in_induction IS 'Berufseinführung – Entlastung im ersten Berufsjahr';
COMMENT ON COLUMN staff_members.entry_on IS 'Eintritt – Anstellung ab';
COMMENT ON COLUMN staff_members.exit_on IS 'Austritt – Anstellung bis';
COMMENT ON COLUMN staff_members.remark IS 'Bemerkung – Freitext der Schulleitung';
COMMENT ON COLUMN staff_members.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN staff_members.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN staff_members.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN staff_members.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN staff_members.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN staff_members.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN staff_members.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE staff_member_subjects IS 'Fächer, die eine Person unterrichten kann – erfasst in «Personen und Pensen»; Vorschläge bei Zuteilungen';
COMMENT ON COLUMN staff_member_subjects.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN staff_member_subjects.staff_member_id IS 'Person – Verweis auf die Person in der Planung';
COMMENT ON COLUMN staff_member_subjects.subject_id IS 'Fach – Verweis auf das Fach';
COMMENT ON TABLE classes IS 'Klasse eines Schuljahrs – erfasst in «Klassen»; Grundlage für Klassenlektionen, VZE und Klassengrösse';
COMMENT ON COLUMN classes.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN classes.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN classes.school_id IS 'Schule – Planung je Schule';
COMMENT ON COLUMN classes.school_year_id IS 'Schuljahr – Planung je Schuljahr';
COMMENT ON COLUMN classes.code IS 'Klasse – z. B. «1A»';
COMMENT ON COLUMN classes.grade IS 'Jahrgang – 1.–3. Sek';
COMMENT ON COLUMN classes.track IS 'Abteilung – A, B oder C';
COMMENT ON COLUMN classes.lesson_table_id IS 'Lektionentafel – erzeugt die Klassenlektionen';
COMMENT ON COLUMN classes.student_count IS 'Schülerzahl – für Klassengrösse und VZE';
COMMENT ON COLUMN classes.previous_code IS 'Name im Vorjahr – Folgejahr-Übernahme';
COMMENT ON COLUMN classes.remark IS 'Bemerkung – Freitext';
COMMENT ON COLUMN classes.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN classes.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN classes.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN classes.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN classes.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN classes.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN classes.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE class_teachers IS 'Klassenlehrperson mit Stundenanteil – erfasst in «Klassen»; 100 Stunden je Klasse, frei aufteilbar';
COMMENT ON COLUMN class_teachers.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN class_teachers.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN class_teachers.class_id IS 'Klasse – Verweis auf die Klasse';
COMMENT ON COLUMN class_teachers.staff_member_id IS 'Klassenlehrperson – Verweis auf die Person in der Planung';
COMMENT ON COLUMN class_teachers.hours IS 'Stundenanteil';
COMMENT ON TABLE resources IS 'Ressourcentyp mit Budget (VZE Berufsauftrag, Gestaltungspool, kommunal, DaZ, Assistenz …) – erfasst in «Ressourcen»; Budget, Verbrauch und Saldo';
COMMENT ON COLUMN resources.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN resources.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN resources.school_id IS 'Schule – Planung je Schule';
COMMENT ON COLUMN resources.school_year_id IS 'Schuljahr – Planung je Schuljahr';
COMMENT ON COLUMN resources.code IS 'Kürzel – z. B. «pool»';
COMMENT ON COLUMN resources.name IS 'Ressource – z. B. «Gestaltungspool»';
COMMENT ON COLUMN resources.unit IS 'Einheit – Budget und Zuteilungen';
COMMENT ON COLUMN resources.is_calculated IS 'Berechnet – Budget aus der VZE-Formel statt Eingabe';
COMMENT ON COLUMN resources.is_cantonal IS 'Kantonal – kantonal finanziert';
COMMENT ON COLUMN resources.budget IS 'Budget – Eingabe, wenn nicht berechnet';
COMMENT ON COLUMN resources.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN resources.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN resources.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE assignments IS 'Unterrichts- oder Einsatzgefäss: Klassenlektion, weitere Lektion, Sonderpädagogik oder Anstellung – erfasst in «Unterricht und Einsätze»; erzeugt aus der Lektionentafel oder von Hand';
COMMENT ON COLUMN assignments.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN assignments.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN assignments.school_id IS 'Schule – Planung je Schule';
COMMENT ON COLUMN assignments.school_year_id IS 'Schuljahr – Planung je Schuljahr';
COMMENT ON COLUMN assignments.assignment_group IS 'Gruppe – Register in «Unterricht und Einsätze»';
COMMENT ON COLUMN assignments.category IS 'Kategorie – Wahlfach, Freifach, Kurs, Niveau, Betreuung …';
COMMENT ON COLUMN assignments.name IS 'Bezeichnung – frei bei weiteren Lektionen und Anstellungen';
COMMENT ON COLUMN assignments.class_id IS 'Klasse – bei Klassenlektionen';
COMMENT ON COLUMN assignments.subject_id IS 'Fach – bei Lektionen';
COMMENT ON COLUMN assignments.level IS 'Stufe – z. B. «Sek 3»';
COMMENT ON COLUMN assignments.unit IS 'Einheit – Soll und Zuteilungen';
COMMENT ON COLUMN assignments.student_lessons IS 'WL Schüler/innen – aus der Lektionentafel';
COMMENT ON COLUMN assignments.teacher_amount IS 'Soll Lehrperson – WL, % oder WStd; leer = aus WL Schüler/innen';
COMMENT ON COLUMN assignments.is_half_class IS 'Halbklassen – verdoppelt die Lehrpersonen-Lektionen';
COMMENT ON COLUMN assignments.is_first_semester IS '1. Semester – Semesterfach zählt halb';
COMMENT ON COLUMN assignments.is_second_semester IS '2. Semester – Semesterfach zählt halb';
COMMENT ON COLUMN assignments.hours_factor IS 'Abweichender Faktor – Stunden je Jahreslektion; leer = Standard';
COMMENT ON COLUMN assignments.is_additional IS 'Zusätzlich – ausserhalb der Lektionentafel (IF, DaZ, Teamteaching)';
COMMENT ON COLUMN assignments.resource_id IS 'Ressource – Finanzierung';
COMMENT ON COLUMN assignments.remark IS 'Bemerkung – Freitext';
COMMENT ON COLUMN assignments.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN assignments.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN assignments.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN assignments.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN assignments.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN assignments.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN assignments.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE assignment_allocations IS 'Zuteilung eines Gefässes an eine Person – erfasst in «Unterricht und Einsätze» und «Klasse – Fach – Lehrperson»; ergibt das Pensum';
COMMENT ON COLUMN assignment_allocations.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN assignment_allocations.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN assignment_allocations.assignment_id IS 'Gefäss – Verweis auf das Gefäss';
COMMENT ON COLUMN assignment_allocations.staff_member_id IS 'Person – Verweis auf die Person in der Planung';
COMMENT ON COLUMN assignment_allocations.amount IS 'Menge – in der Einheit des Gefässes';
COMMENT ON TABLE job_duties IS 'Gefäss des Berufsauftrags (Konferenz, Amt, Kustodie, Weiterbildung …) – erfasst in «Berufsauftrag»; Stunden je Person nach Regel';
COMMENT ON COLUMN job_duties.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN job_duties.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN job_duties.school_id IS 'Schule – Planung je Schule';
COMMENT ON COLUMN job_duties.school_year_id IS 'Schuljahr – Planung je Schuljahr';
COMMENT ON COLUMN job_duties.name IS 'Bezeichnung – z. B. «Schulkonferenz»';
COMMENT ON COLUMN job_duties.code IS 'Kürzel – z. B. «SK»';
COMMENT ON COLUMN job_duties.area IS 'Tätigkeitsbereich – Berufsauftrag';
COMMENT ON COLUMN job_duties.funding_type IS 'Art – aus Pauschale oder zusätzlich';
COMMENT ON COLUMN job_duties.rule_type IS 'Regel – Stunden je Person';
COMMENT ON COLUMN job_duties.hours IS 'Stunden – bei fixer Regel';
COMMENT ON COLUMN job_duties.base_hours IS 'Sockel – bei linearer Regel';
COMMENT ON COLUMN job_duties.base_up_to_lessons IS 'Sockel bis (WL) – bei linearer Regel';
COMMENT ON COLUMN job_duties.full_from_lessons IS 'Gesamte Zeit ab (WL) – bei linearer Regel';
COMMENT ON COLUMN job_duties.maximum_hours IS 'Höchstens – Obergrenze';
COMMENT ON COLUMN job_duties.session_count IS 'Anzahl Sitzungen – Präsenz × Anzahl';
COMMENT ON COLUMN job_duties.attendance_hours IS 'Präsenz je Sitzung – Stunden';
COMMENT ON COLUMN job_duties.preparation_hours IS 'Vorbereitung je Sitzung – Stunden';
COMMENT ON COLUMN job_duties.is_office IS 'Amt – z. B. Stufenleitung';
COMMENT ON COLUMN job_duties.is_custodianship IS 'Kustodie – z. B. Informatikräume';
COMMENT ON COLUMN job_duties.is_compensated IS 'Entschädigt – separat entschädigt';
COMMENT ON COLUMN job_duties.target_hours IS 'Stunden-Soll – bei Ämtern und Kustodien';
COMMENT ON COLUMN job_duties.resource_id IS 'Ressource – Finanzierung zusätzlicher Stunden';
COMMENT ON COLUMN job_duties.description IS 'Beschreibung – Freitext';
COMMENT ON COLUMN job_duties.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN job_duties.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN job_duties.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN job_duties.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN job_duties.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN job_duties.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN job_duties.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE job_duty_participants IS 'Teilnahme einer Person an einem Gefäss des Berufsauftrags – erfasst in «Berufsauftrag»; Stunden fliessen ins Pensum';
COMMENT ON COLUMN job_duty_participants.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN job_duty_participants.job_duty_id IS 'Gefäss – Verweis auf das Gefäss';
COMMENT ON COLUMN job_duty_participants.staff_member_id IS 'Person – Verweis auf die Person in der Planung';
COMMENT ON COLUMN job_duty_participants.hours_override IS 'Abweichende Stunden – Entlastung bzw. individuelle Stunden';
COMMENT ON TABLE releases IS 'Freigabe des Pensums einer Person mit eingefrorenem Stand – «Freigaben»: Schulleitung gibt frei, Schulverwaltung stellt an; Änderungen danach werden erkannt';
COMMENT ON COLUMN releases.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN releases.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN releases.staff_member_id IS 'Person – Verweis auf die Person in der Planung';
COMMENT ON COLUMN releases.status IS 'Status – Ablauf der Freigabe';
COMMENT ON COLUMN releases.snapshot IS 'Stand bei Freigabe – WL, Stunden, Beschäftigungsgrad, Posten (Abbild)';
COMMENT ON COLUMN releases.released_at IS 'Freigegeben am – Zeitpunkt der Freigabe';
COMMENT ON COLUMN releases.released_by_id IS 'Freigegeben von – Schulleitung (ohne Constraint)';
COMMENT ON COLUMN releases.employed_at IS 'Angestellt am – Schulverwaltung';
COMMENT ON COLUMN releases.employed_by_id IS 'Angestellt von – Schulverwaltung (ohne Constraint)';
COMMENT ON COLUMN releases.remark IS 'Bemerkung – Freitext der Schulleitung';
COMMENT ON COLUMN releases.administration_note IS 'Rückmeldung Schulverwaltung – Freitext';
COMMENT ON COLUMN releases.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE planning_events IS 'Verlauf der Planung (wer hat was getan) – geschrieben bei Freigabe, Anstellung, Sperre, Umfrage; Anzeige «Verlauf» in «Freigaben»';
COMMENT ON COLUMN planning_events.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN planning_events.event_id IS 'Ereignis-ID – eindeutig über Module und Exporte hinweg';
COMMENT ON COLUMN planning_events.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN planning_events.school_id IS 'Schule – Planung je Schule';
COMMENT ON COLUMN planning_events.occurred_at IS 'Zeitpunkt – wann';
COMMENT ON COLUMN planning_events.actor_id IS 'Auslöser – Person (ohne Constraint)';
COMMENT ON COLUMN planning_events.actor_role IS 'Rolle – Rolle beim Auslösen';
COMMENT ON COLUMN planning_events.text IS 'Eintrag – Beschreibung des Vorgangs';
COMMENT ON COLUMN planning_events.subject_type IS 'Bezug (Tabelle) – betroffene Tabelle';
COMMENT ON COLUMN planning_events.subject_id IS 'Bezug (ID) – betroffener Datensatz';
COMMENT ON TABLE workload_surveys IS 'Pensenumfrage einer Person für das nächste Schuljahr – ausgefüllt von der Person in «Pensenumfrage»; Grundlage der Planung';
COMMENT ON COLUMN workload_surveys.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN workload_surveys.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN workload_surveys.staff_member_id IS 'Person – Verweis auf die Person in der Planung';
COMMENT ON COLUMN workload_surveys.status IS 'Status – Ablauf der Umfrage';
COMMENT ON COLUMN workload_surveys.continuation IS 'Weiterbeschäftigung – Antwort der Person';
COMMENT ON COLUMN workload_surveys.desired_workload_percent IS 'Wunschpensum (%) – Antwort der Person';
COMMENT ON COLUMN workload_surveys.desired_lessons IS 'Wunschpensum (WL) – Antwort der Person';
COMMENT ON COLUMN workload_surveys.levels IS 'Stufen – Antwort der Person';
COMMENT ON COLUMN workload_surveys.subjects_wish IS 'Fächer – Antwort der Person';
COMMENT ON COLUMN workload_surveys.class_teacher_wish IS 'Klassenlehrperson – Antwort der Person';
COMMENT ON COLUMN workload_surveys.wishes IS 'Wünsche – Freitext der Person';
COMMENT ON COLUMN workload_surveys.blocked_times IS 'Sperrzeiten – Freitext der Person';
COMMENT ON COLUMN workload_surveys.free_days IS 'Freie Tage – Freitext der Person';
COMMENT ON COLUMN workload_surveys.remark IS 'Bemerkung – Freitext der Person';
COMMENT ON COLUMN workload_surveys.invited_at IS 'Eingeladen am – Einladung';
COMMENT ON COLUMN workload_surveys.reminded_at IS 'Erinnert am – Erinnerung';
COMMENT ON COLUMN workload_surveys.submitted_at IS 'Eingereicht am – Abgabe';
COMMENT ON COLUMN workload_surveys.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN workload_surveys.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN workload_surveys.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE absences IS 'Ausfall einer Person mit Stellvertretung – erfasst in «Stellvertretungen»; Meldung an den Kanton, Finanzierung';
COMMENT ON COLUMN absences.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN absences.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN absences.staff_member_id IS 'Person – abwesende Person';
COMMENT ON COLUMN absences.reason IS 'Grund – nur Kategorie, keine Diagnose';
COMMENT ON COLUMN absences.valid_from IS 'Von – erster Tag';
COMMENT ON COLUMN absences.valid_until IS 'Bis – letzter Tag';
COMMENT ON COLUMN absences.weekly_lessons IS 'Wochenlektionen – zu vertretende Lektionen';
COMMENT ON COLUMN absences.substitute_id IS 'Stellvertretung – vertretende Person';
COMMENT ON COLUMN absences.funding IS 'Finanzierung – z. B. «Kurzvikariat», «Gestaltungspool»';
COMMENT ON COLUMN absences.status IS 'Status – Ablauf';
COMMENT ON COLUMN absences.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN absences.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN absences.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN absences.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN absences.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN absences.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN absences.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE absence_reports IS 'Rapport der gehaltenen Vikariatslektionen je Tag – erfasst in «Stellvertretungen»; Abrechnung und Meldung';
COMMENT ON COLUMN absence_reports.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN absence_reports.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN absence_reports.absence_id IS 'Ausfall – Verweis auf den Ausfall';
COMMENT ON COLUMN absence_reports.held_on IS 'Datum – Tag der Vertretung';
COMMENT ON COLUMN absence_reports.lessons IS 'Lektionen – gehaltene Lektionen';
COMMENT ON TABLE mid_year_changes IS 'Mutation während des Schuljahrs (Teamteaching, Teilung …) – erfasst in «Stellenplan und VZE»; Begründung und Finanzierung';
COMMENT ON COLUMN mid_year_changes.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN mid_year_changes.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN mid_year_changes.class_id IS 'Klasse – betroffene Klasse';
COMMENT ON COLUMN mid_year_changes.change_type IS 'Was – z. B. «Teamteaching»';
COMMENT ON COLUMN mid_year_changes.reason IS 'Warum – Begründung';
COMMENT ON COLUMN mid_year_changes.weekly_lessons IS 'Lektionen – zusätzliche Wochenlektionen';
COMMENT ON COLUMN mid_year_changes.funding IS 'Finanzierung – z. B. «Gestaltungspool»';
COMMENT ON COLUMN mid_year_changes.staff_member_id IS 'Person – übernehmende Person';
COMMENT ON COLUMN mid_year_changes.starts_on IS 'Start – ab wann';
COMMENT ON COLUMN mid_year_changes.status IS 'Status – Bewilligung';
COMMENT ON COLUMN mid_year_changes.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN mid_year_changes.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN mid_year_changes.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN mid_year_changes.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN mid_year_changes.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN mid_year_changes.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN mid_year_changes.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE staff_reviews IS 'Mitarbeitendengespräch, Probezeitgespräch, Unterrichtsbesuch – geplant in «Personalgespräche»; Dokumentation im Personaldossier';
COMMENT ON COLUMN staff_reviews.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN staff_reviews.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN staff_reviews.user_id IS 'Person – Mitarbeiterin bzw. Mitarbeiter';
COMMENT ON COLUMN staff_reviews.review_type IS 'Art – z. B. «Probezeitgespräch»';
COMMENT ON COLUMN staff_reviews.held_on IS 'Datum – Termin';
COMMENT ON COLUMN staff_reviews.status IS 'Status – Ablauf';
COMMENT ON COLUMN staff_reviews.is_shared IS 'Freigegeben – für die Person einsehbar';
COMMENT ON COLUMN staff_reviews.lead_user_id IS 'Gesprächsleitung – Schulleitung';
COMMENT ON COLUMN staff_reviews.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN staff_reviews.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN staff_reviews.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN staff_reviews.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN staff_reviews.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN staff_reviews.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN staff_reviews.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE dossier_categories IS 'Kategorie des Personaldossiers – Personalführung; Gliederung in «Personaldossier»';
COMMENT ON COLUMN dossier_categories.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN dossier_categories.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN dossier_categories.position IS 'Reihenfolge – Anzeige';
COMMENT ON COLUMN dossier_categories.name IS 'Kategorie – z. B. «Mitarbeitendenbeurteilung»';
COMMENT ON COLUMN dossier_categories.retention_years IS 'Aufbewahrung (Jahre) – Löschfrist nach Archivgesetz (zu prüfen)';
COMMENT ON TABLE dossier_templates IS 'Vorlage für einen Dossiereintrag – «+ Eintrag aus Vorlage» im Personaldossier';
COMMENT ON COLUMN dossier_templates.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN dossier_templates.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN dossier_templates.title IS 'Titel – z. B. «Zielvereinbarung»';
COMMENT ON COLUMN dossier_templates.dossier_category_id IS 'Kategorie – Verweis auf die Kategorie';
COMMENT ON TABLE dossier_entries IS 'Eintrag im Personaldossier; die Datei liegt in der Dokumentenablage – erfasst in «Personaldossier»; Nachweis der Personalführung';
COMMENT ON COLUMN dossier_entries.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN dossier_entries.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN dossier_entries.user_id IS 'Person – Mitarbeiterin bzw. Mitarbeiter';
COMMENT ON COLUMN dossier_entries.dossier_category_id IS 'Kategorie – Gliederung';
COMMENT ON COLUMN dossier_entries.title IS 'Titel – z. B. «Anstellungsverfügung»';
COMMENT ON COLUMN dossier_entries.entry_on IS 'Datum – Datum des Dokuments';
COMMENT ON COLUMN dossier_entries.note IS 'Notiz – Freitext';
COMMENT ON COLUMN dossier_entries.document_uri IS 'Dokument – Verweis in die Dokumentenablage (z. B. EduKSX-Sign)';
COMMENT ON COLUMN dossier_entries.staff_review_id IS 'Gespräch – Verweis auf das Gespräch';
COMMENT ON COLUMN dossier_entries.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN dossier_entries.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN dossier_entries.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN dossier_entries.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN dossier_entries.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN dossier_entries.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN dossier_entries.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE care_offerings IS 'Angebot der Tagesstrukturen an einem Wochentag – erfasst in «Tagesstrukturen»; Bedarf an Betreuungspersonen';
COMMENT ON COLUMN care_offerings.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN care_offerings.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN care_offerings.school_id IS 'Schule – Planung je Schule';
COMMENT ON COLUMN care_offerings.school_year_id IS 'Schuljahr – Planung je Schuljahr';
COMMENT ON COLUMN care_offerings.name IS 'Angebot – z. B. «Mittagstisch»';
COMMENT ON COLUMN care_offerings.weekday IS 'Wochentag';
COMMENT ON COLUMN care_offerings.starts_at_time IS 'Von – Uhrzeit';
COMMENT ON COLUMN care_offerings.ends_at_time IS 'Bis – Uhrzeit';
COMMENT ON COLUMN care_offerings.child_count IS 'Kinder – angemeldete Kinder';
COMMENT ON COLUMN care_offerings.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN care_offerings.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN care_offerings.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE deadlines IS 'Frist im Jahresablauf der Planung – «Jahresablauf und Fristen»; als Ereignis im Jahreskalender von EduKSX-Flow';
COMMENT ON COLUMN deadlines.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN deadlines.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN deadlines.school_year_id IS 'Schuljahr – Gültigkeit';
COMMENT ON COLUMN deadlines.due_on IS 'Datum – Frist';
COMMENT ON COLUMN deadlines.title IS 'Titel – z. B. «Stichtag Schülerzahlen»';
COMMENT ON COLUMN deadlines.responsible_role IS 'Wer – zuständige Rolle';
COMMENT ON COLUMN deadlines.flow_event_code IS 'Kalenderereignis – Verweis auf EduKSX-Flow';
COMMENT ON VIEW staff_member_totals IS 'Zugeteilte Menge je Person und Einheit';
COMMENT ON VIEW resource_usages IS 'Verbrauch je Ressource';
COMMENT ON VIEW assignment_open_amounts IS 'Offene Menge je Gefäss';
-- <<< kommentare
