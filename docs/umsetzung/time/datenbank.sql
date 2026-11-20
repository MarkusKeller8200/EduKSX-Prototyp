-- EduKSX-Time – Datenbankstruktur (Zeiterfassung / Stempeln)
-- Stand 2026-11-20 · Status ENTWURF · DB-Standard 1.3 · Grundlage: Prototyp prototypen/zeiterfassung
-- Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert. Erzeugte Blöcke (>>> … <<<) nicht von Hand
-- ändern: python3 tools/umsetzung_bauen.py
--
-- Schritt 1 (im Prototyp): Buchungen Kommen/Pause/Gehen mit Buchungsart, Soll aus dem Pensum, Ist/Saldo,
-- gesetzliche Pause, Rückgängig, Nachtragen, Offline-Erfassung. Ausbau: Abwesenheiten, Korrekturen, Monatsabschluss.
-- Ist, Saldo und gesetzliche Pause werden berechnet (Ansicht daily_totals), Monatswerte beim Abschluss eingefroren.

CREATE SCHEMA IF NOT EXISTS time;
SET search_path TO time;

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

-- ------------------------------------------------------------------ Regeln und Arbeitsmodell

-- Arbeitszeitregel der Organisation (gültig ab)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Personalrecht der Gemeinde (zu prüfen); Sollzeit, gesetzliche Pause, Rückgängig, Nachtragen
CREATE TABLE working_time_rules (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    valid_from              date NOT NULL,                   -- Gültig ab | Regel gilt für Tage ab diesem Datum
    daily_target_minutes    integer NOT NULL DEFAULT 504,    -- Sollzeit je Arbeitstag (100 %) | 8:24 bei der 42-Stunden-Woche
    break_after_minutes     integer NOT NULL DEFAULT 300,    -- Gesetzliche Pause ab | nach 5 Stunden Arbeit
    break_minutes           integer NOT NULL DEFAULT 30,     -- Gesetzliche Pause | Dauer, zählt nicht als Arbeitszeit
    break_steps             jsonb,                           -- Pausenstufen | Alternative nach Arbeitsgesetz, z. B. ab 5,5 h 15 Min.
    undo_seconds            integer NOT NULL DEFAULT 120,    -- Rückgängig (Sekunden) | letzte Buchung zurücknehmen
    max_backdate_days       integer NOT NULL DEFAULT 7,      -- Nachtragen höchstens (Tage) | offline und vergessenes Gehen
    is_home_office_allowed  boolean NOT NULL DEFAULT true,   -- Homeoffice erlaubt | Buchungsart anbieten
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1,
    UNIQUE (organization_id, valid_from)
);

-- Arbeitsmodell einer Person (Pensum, Arbeitstage)
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: aus dem freigegebenen Pensum in EduKSX-Staffing oder von Hand («Mehr» › Pensum); Soll je Tag
CREATE TABLE work_schedules (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | Mitarbeiterin bzw. Mitarbeiter | intern
    valid_from              date NOT NULL,                   -- Gültig ab | Beginn
    valid_until             date,                            -- Gültig bis | leer = offen
    workload_percent        numeric(5,2) NOT NULL CHECK (workload_percent > 0 AND workload_percent <= 100),   -- Pensum | in Prozent
    job_title               text,                            -- Funktion | Anzeige im Kopf
    workdays                smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',   -- Arbeitstage | 1 = Montag
    daily_target_minutes    integer,                         -- Sollzeit je Tag | abweichend; leer = Regel × Pensum
    source                  text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','staffing')),   -- Herkunft | woher das Pensum stammt | intern | manual=von Hand; staffing=aus EduKSX-Staffing
    staffing_release_id     uuid,                            -- Freigabe in Staffing | Verweis (ohne Constraint) | intern
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1,
    CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

-- Buchungsart (Arbeitszeit, Homeoffice)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Auswahl vor dem Kommen
CREATE TABLE booking_types (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    type_key                text NOT NULL,                   -- Schlüssel | z. B. «home_office»
    name                    text NOT NULL,                   -- Buchungsart | Anzeige
    symbol                  text,                            -- Zeichen | Anzeige in der Tagesliste
    counts_as_working_time  boolean NOT NULL DEFAULT true,   -- Zählt als Arbeitszeit | Ist
    is_active               boolean NOT NULL DEFAULT true,   -- Aktiv | in der Auswahl
    UNIQUE (organization_id, type_key)
);

-- ------------------------------------------------------------------ Buchungen

-- Stempelbuchung (nie überschrieben: Rückgängig = storniert, Korrektur = neue Buchung mit Verweis)
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Stempeltasten der App, offline erfasst und später übertragen; Tagesliste, Ist und Saldo
CREATE TABLE bookings (
    id                      uuid PRIMARY KEY,                -- ID vom Gerät erzeugt → Übertragung idempotent
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | stempelnde Person | intern
    booking_kind            text NOT NULL CHECK (booking_kind IN ('clock_in','break_start','break_end','clock_out')),   -- Buchung | Stempeltaste | personenbezogen | clock_in=Kommen; break_start=Pause; break_end=Pause beendet; clock_out=Gehen
    booked_at               timestamptz NOT NULL,            -- Zeitpunkt | Zeit der Buchung
    work_on                 date NOT NULL,                   -- Arbeitstag | Tag in Europe/Zurich
    booking_type_id         uuid NOT NULL REFERENCES booking_types(id),   -- Buchungsart | Arbeitszeit oder Homeoffice
    origin                  text NOT NULL DEFAULT 'app' CHECK (origin IN ('app','web','terminal','backdated','correction','import')),   -- Herkunft | Erfassungsweg | intern | app=App; web=Web; terminal=Terminal; backdated=nachgetragen; correction=Korrektur; import=Import
    is_backdated            boolean NOT NULL DEFAULT false,  -- Nachgetragen | vergessenes Gehen
    is_offline              boolean NOT NULL DEFAULT false,  -- Offline erfasst | ohne Verbindung gestempelt | intern
    recorded_at             timestamptz NOT NULL,            -- Erfasst am (Gerät) | Zeit auf dem Gerät | intern
    received_at             timestamptz NOT NULL DEFAULT now(),   -- Übertragen am | Eingang auf dem Server | intern
    device_id               text,                            -- Gerät | Installations-ID der App, kein Fingerprinting | intern
    cancelled_at            timestamptz,                     -- Storniert am | rückgängig gemacht | intern
    cancel_reason           text,                            -- Storniergrund | Freitext
    replaces_id             uuid REFERENCES bookings(id),    -- Ersetzt Buchung | bei Korrektur | intern
    remark                  text,                            -- Bemerkung | Freitext
    CHECK (received_at >= recorded_at - interval '5 minutes')
);
CREATE INDEX bookings_user_id_work_on_index ON bookings (user_id, work_on, booked_at) WHERE cancelled_at IS NULL;

-- ------------------------------------------------------------------ Ausbau: Abwesenheiten, Korrekturen, Monatsabschluss

-- Art einer Abwesenheit (Ferien, Krankheit, Unfall, Weiterbildung …)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Personalrecht; Auswahl im Antrag
CREATE TABLE absence_types (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    type_key                text NOT NULL,                   -- Schlüssel | z. B. «vacation»
    name                    text NOT NULL,                   -- Abwesenheit | Anzeige
    counts_as_target        boolean NOT NULL DEFAULT true,   -- Soll erfüllt | Tag gilt als gearbeitet
    reduces_vacation        boolean NOT NULL DEFAULT false,  -- Ferienbezug | reduziert das Ferienguthaben
    needs_approval          boolean NOT NULL DEFAULT false,  -- Bewilligung nötig | Antrag an die Schulleitung
    UNIQUE (organization_id, type_key)
);

-- Abwesenheit einer Person
-- Geltungsbereich: persönlich · Datenklasse: besonders schützenswert
-- Herkunft/Verwendung: Antrag der Person, bewilligt von der Schulleitung; Soll und Ferienguthaben
CREATE TABLE absences (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | abwesende Person | intern
    absence_type_id         uuid NOT NULL REFERENCES absence_types(id),   -- Art | Kategorie, keine Diagnose
    valid_from              date NOT NULL,                   -- Von | erster Tag
    valid_until             date NOT NULL,                   -- Bis | letzter Tag
    half_day                text CHECK (half_day IN ('morning','afternoon')),   -- Halbtag | nur Vor- oder Nachmittag | besonders schützenswert | morning=Vormittag; afternoon=Nachmittag
    status                  text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','recorded')),   -- Status | Bewilligung | intern | requested=beantragt; approved=bewilligt; rejected=abgelehnt; recorded=erfasst
    remark                  text,                            -- Bemerkung | ohne Diagnosen
    approved_by_id          uuid,                            -- Bewilligt von | Schulleitung (ohne Constraint) | intern
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    CHECK (valid_until >= valid_from)
);

-- Korrekturantrag zu einer Buchung
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Antrag der Person mit Begründung, Bestätigung durch die vorgesetzte Person
CREATE TABLE booking_corrections (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | antragstellende Person | intern
    work_on                 date NOT NULL,                   -- Arbeitstag | betroffener Tag
    booking_id              uuid REFERENCES bookings(id),    -- Buchung | leer = fehlende Buchung ergänzen | intern
    new_booking_kind        text CHECK (new_booking_kind IN ('clock_in','break_start','break_end','clock_out')),   -- Neue Buchung | Art | personenbezogen | clock_in=Kommen; break_start=Pause; break_end=Pause beendet; clock_out=Gehen
    new_booked_at           timestamptz,                     -- Neuer Zeitpunkt | korrigierte Zeit
    is_deletion             boolean NOT NULL DEFAULT false,  -- Löschen | Buchung entfernen
    reason                  text NOT NULL,                   -- Begründung | Pflicht
    status                  text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','rejected')),   -- Status | Entscheid | intern | requested=beantragt; confirmed=bestätigt; rejected=abgelehnt
    decided_by_id           uuid,                            -- Entschieden von | vorgesetzte Person (ohne Constraint) | intern
    decided_at              timestamptz,                     -- Entschieden am | Zeitpunkt | intern
    created_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1
);

-- Ferienanspruch einer Person je Jahr
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Personalrecht und Arbeitsmodell; Ferienguthaben in der Monatsübersicht
CREATE TABLE vacation_entitlements (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | Mitarbeiterin bzw. Mitarbeiter | intern
    year                    integer NOT NULL,                -- Jahr | Kalenderjahr | intern
    entitlement_days        numeric(5,2) NOT NULL,           -- Anspruch (Tage) | Ferientage
    carried_over_days       numeric(5,2) NOT NULL DEFAULT 0, -- Übertrag (Tage) | aus dem Vorjahr
    UNIQUE (user_id, year)
);

-- Monatsabschluss mit eingefrorenen Werten, Einreichen und Visum
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: «Monat einreichen»; Visum der Schulleitung, optional mit EduKSX-Sign
CREATE TABLE month_closings (
    id                      uuid PRIMARY KEY,
    organization_id         uuid NOT NULL REFERENCES organizations(id),
    user_id                 uuid NOT NULL REFERENCES users(id),   -- Person | Mitarbeiterin bzw. Mitarbeiter | intern
    month_on                date NOT NULL CHECK (extract(day FROM month_on) = 1),   -- Monat | erster Tag des Monats | intern
    target_minutes          integer NOT NULL,                -- Soll (Minuten) | Monat
    actual_minutes          integer NOT NULL,                -- Ist (Minuten) | Monat
    absence_minutes         integer NOT NULL DEFAULT 0,      -- Abwesenheit (Minuten) | angerechnet
    balance_minutes         integer NOT NULL,                -- Saldo Monat (Minuten) | Ist minus Soll
    carried_balance_minutes integer NOT NULL,                -- Saldovortrag (Minuten) | aus dem Vormonat
    total_balance_minutes   integer NOT NULL,                -- Saldo total (Minuten) | Vortrag plus Monat
    vacation_taken_days     numeric(5,2) NOT NULL DEFAULT 0, -- Ferien bezogen (Tage) | Monat
    vacation_remaining_days numeric(5,2),                    -- Ferien Rest (Tage) | nach dem Monat
    status                  text NOT NULL DEFAULT 'open' CHECK (status IN ('open','submitted','approved','returned')),   -- Status | Abschluss | intern | open=offen; submitted=eingereicht; approved=visiert; returned=zurückgewiesen
    submitted_at            timestamptz,                     -- Eingereicht am | Zeitpunkt | intern
    approved_by_id          uuid,                            -- Visiert von | Schulleitung (ohne Constraint) | intern
    approved_at             timestamptz,                     -- Visiert am | Zeitpunkt | intern
    sign_process_reference  text,                            -- Signatur | Verweis auf EduKSX-Sign | intern
    remark                  text,                            -- Bemerkung | Freitext
    lock_version            integer NOT NULL DEFAULT 1,
    UNIQUE (user_id, month_on)
);

-- ------------------------------------------------------------------ Ansichten

-- Tageswerte: Anwesenheit, gestempelte Pausen, gesetzliche Pause, Ist
-- gesetzliche Pause = Pausendauer minus gestempelte Pausen, sobald Arbeit über der Schwelle liegt
CREATE VIEW daily_totals AS
WITH b AS (
    SELECT user_id, organization_id, work_on, booking_kind, booked_at,
           lead(booked_at) OVER (PARTITION BY user_id, work_on ORDER BY booked_at) AS next_at
    FROM bookings WHERE cancelled_at IS NULL
), s AS (
    SELECT user_id, organization_id, work_on,
           coalesce(sum(extract(epoch FROM next_at - booked_at)) FILTER (WHERE booking_kind IN ('clock_in','break_end')), 0)::integer / 60 AS present_minutes,
           coalesce(sum(extract(epoch FROM next_at - booked_at)) FILTER (WHERE booking_kind = 'break_start'), 0)::integer / 60 AS break_taken_minutes,
           bool_or(next_at IS NULL AND booking_kind <> 'clock_out') AS is_open
    FROM b GROUP BY user_id, organization_id, work_on
)
SELECT s.*, r.break_after_minutes, r.break_minutes,
       CASE WHEN s.present_minutes > r.break_after_minutes THEN greatest(0, r.break_minutes - s.break_taken_minutes) ELSE 0 END AS legal_break_minutes,
       s.present_minutes - CASE WHEN s.present_minutes > r.break_after_minutes THEN greatest(0, r.break_minutes - s.break_taken_minutes) ELSE 0 END AS actual_minutes
FROM s
JOIN LATERAL (SELECT * FROM working_time_rules r WHERE r.organization_id = s.organization_id AND r.valid_from <= s.work_on ORDER BY r.valid_from DESC LIMIT 1) r ON true;

-- Ausnahmetabelle (doppelt gespeichert, DB A2)
-- month_closings: Monatswerte (Soll, Ist, Saldo, Ferien) – Grund: Stand beim Einreichen und Visum festhalten; nie nachgeführt

-- >>> indizes
CREATE INDEX organizations_parent_id_index ON organizations (parent_id);
CREATE INDEX users_organization_id_index ON users (organization_id);
CREATE INDEX school_holidays_organization_id_index ON school_holidays (organization_id);
CREATE INDEX school_holidays_school_year_id_index ON school_holidays (school_year_id);
CREATE INDEX work_schedules_organization_id_index ON work_schedules (organization_id);
CREATE INDEX work_schedules_user_id_index ON work_schedules (user_id);
CREATE INDEX bookings_organization_id_index ON bookings (organization_id);
CREATE INDEX bookings_user_id_index ON bookings (user_id);
CREATE INDEX bookings_booking_type_id_index ON bookings (booking_type_id);
CREATE INDEX bookings_replaces_id_index ON bookings (replaces_id);
CREATE INDEX absences_organization_id_index ON absences (organization_id);
CREATE INDEX absences_user_id_index ON absences (user_id);
CREATE INDEX absences_absence_type_id_index ON absences (absence_type_id);
CREATE INDEX booking_corrections_organization_id_index ON booking_corrections (organization_id);
CREATE INDEX booking_corrections_user_id_index ON booking_corrections (user_id);
CREATE INDEX booking_corrections_booking_id_index ON booking_corrections (booking_id);
CREATE INDEX vacation_entitlements_organization_id_index ON vacation_entitlements (organization_id);
CREATE INDEX month_closings_organization_id_index ON month_closings (organization_id);
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
COMMENT ON TABLE working_time_rules IS 'Arbeitszeitregel der Organisation (gültig ab) – Personalrecht der Gemeinde (zu prüfen); Sollzeit, gesetzliche Pause, Rückgängig, Nachtragen';
COMMENT ON COLUMN working_time_rules.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN working_time_rules.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN working_time_rules.valid_from IS 'Gültig ab – Regel gilt für Tage ab diesem Datum';
COMMENT ON COLUMN working_time_rules.daily_target_minutes IS 'Sollzeit je Arbeitstag (100 %) – 8:24 bei der 42-Stunden-Woche';
COMMENT ON COLUMN working_time_rules.break_after_minutes IS 'Gesetzliche Pause ab – nach 5 Stunden Arbeit';
COMMENT ON COLUMN working_time_rules.break_minutes IS 'Gesetzliche Pause – Dauer, zählt nicht als Arbeitszeit';
COMMENT ON COLUMN working_time_rules.break_steps IS 'Pausenstufen – Alternative nach Arbeitsgesetz, z. B. ab 5,5 h 15 Min.';
COMMENT ON COLUMN working_time_rules.undo_seconds IS 'Rückgängig (Sekunden) – letzte Buchung zurücknehmen';
COMMENT ON COLUMN working_time_rules.max_backdate_days IS 'Nachtragen höchstens (Tage) – offline und vergessenes Gehen';
COMMENT ON COLUMN working_time_rules.is_home_office_allowed IS 'Homeoffice erlaubt – Buchungsart anbieten';
COMMENT ON COLUMN working_time_rules.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN working_time_rules.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN working_time_rules.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN working_time_rules.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN working_time_rules.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE work_schedules IS 'Arbeitsmodell einer Person (Pensum, Arbeitstage) – aus dem freigegebenen Pensum in EduKSX-Staffing oder von Hand («Mehr» › Pensum); Soll je Tag';
COMMENT ON COLUMN work_schedules.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN work_schedules.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN work_schedules.user_id IS 'Person – Mitarbeiterin bzw. Mitarbeiter';
COMMENT ON COLUMN work_schedules.valid_from IS 'Gültig ab – Beginn';
COMMENT ON COLUMN work_schedules.valid_until IS 'Gültig bis';
COMMENT ON COLUMN work_schedules.workload_percent IS 'Pensum – in Prozent';
COMMENT ON COLUMN work_schedules.job_title IS 'Funktion – Anzeige im Kopf';
COMMENT ON COLUMN work_schedules.workdays IS 'Arbeitstage';
COMMENT ON COLUMN work_schedules.daily_target_minutes IS 'Sollzeit je Tag – abweichend; leer = Regel × Pensum';
COMMENT ON COLUMN work_schedules.source IS 'Herkunft – woher das Pensum stammt';
COMMENT ON COLUMN work_schedules.staffing_release_id IS 'Freigabe in Staffing – Verweis (ohne Constraint)';
COMMENT ON COLUMN work_schedules.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN work_schedules.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN work_schedules.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN work_schedules.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN work_schedules.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE booking_types IS 'Buchungsart (Arbeitszeit, Homeoffice) – Auswahl vor dem Kommen';
COMMENT ON COLUMN booking_types.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN booking_types.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN booking_types.type_key IS 'Schlüssel – z. B. «home_office»';
COMMENT ON COLUMN booking_types.name IS 'Buchungsart – Anzeige';
COMMENT ON COLUMN booking_types.symbol IS 'Zeichen – Anzeige in der Tagesliste';
COMMENT ON COLUMN booking_types.counts_as_working_time IS 'Zählt als Arbeitszeit – Ist';
COMMENT ON COLUMN booking_types.is_active IS 'Aktiv – in der Auswahl';
COMMENT ON TABLE bookings IS 'Stempelbuchung (nie überschrieben: Rückgängig = storniert, Korrektur = neue Buchung mit Verweis) – Stempeltasten der App, offline erfasst und später übertragen; Tagesliste, Ist und Saldo';
COMMENT ON COLUMN bookings.id IS 'ID vom Gerät erzeugt → Übertragung idempotent – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN bookings.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN bookings.user_id IS 'Person – stempelnde Person';
COMMENT ON COLUMN bookings.booking_kind IS 'Buchung – Stempeltaste';
COMMENT ON COLUMN bookings.booked_at IS 'Zeitpunkt – Zeit der Buchung';
COMMENT ON COLUMN bookings.work_on IS 'Arbeitstag – Tag in Europe/Zurich';
COMMENT ON COLUMN bookings.booking_type_id IS 'Buchungsart – Arbeitszeit oder Homeoffice';
COMMENT ON COLUMN bookings.origin IS 'Herkunft – Erfassungsweg';
COMMENT ON COLUMN bookings.is_backdated IS 'Nachgetragen – vergessenes Gehen';
COMMENT ON COLUMN bookings.is_offline IS 'Offline erfasst – ohne Verbindung gestempelt';
COMMENT ON COLUMN bookings.recorded_at IS 'Erfasst am (Gerät) – Zeit auf dem Gerät';
COMMENT ON COLUMN bookings.received_at IS 'Übertragen am – Eingang auf dem Server';
COMMENT ON COLUMN bookings.device_id IS 'Gerät – Installations-ID der App, kein Fingerprinting';
COMMENT ON COLUMN bookings.cancelled_at IS 'Storniert am – rückgängig gemacht';
COMMENT ON COLUMN bookings.cancel_reason IS 'Storniergrund – Freitext';
COMMENT ON COLUMN bookings.replaces_id IS 'Ersetzt Buchung – bei Korrektur';
COMMENT ON COLUMN bookings.remark IS 'Bemerkung – Freitext';
COMMENT ON TABLE absence_types IS 'Art einer Abwesenheit (Ferien, Krankheit, Unfall, Weiterbildung …) – Personalrecht; Auswahl im Antrag';
COMMENT ON COLUMN absence_types.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN absence_types.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN absence_types.type_key IS 'Schlüssel – z. B. «vacation»';
COMMENT ON COLUMN absence_types.name IS 'Abwesenheit – Anzeige';
COMMENT ON COLUMN absence_types.counts_as_target IS 'Soll erfüllt – Tag gilt als gearbeitet';
COMMENT ON COLUMN absence_types.reduces_vacation IS 'Ferienbezug – reduziert das Ferienguthaben';
COMMENT ON COLUMN absence_types.needs_approval IS 'Bewilligung nötig – Antrag an die Schulleitung';
COMMENT ON TABLE absences IS 'Abwesenheit einer Person – Antrag der Person, bewilligt von der Schulleitung; Soll und Ferienguthaben';
COMMENT ON COLUMN absences.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN absences.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN absences.user_id IS 'Person – abwesende Person';
COMMENT ON COLUMN absences.absence_type_id IS 'Art – Kategorie, keine Diagnose';
COMMENT ON COLUMN absences.valid_from IS 'Von – erster Tag';
COMMENT ON COLUMN absences.valid_until IS 'Bis – letzter Tag';
COMMENT ON COLUMN absences.half_day IS 'Halbtag – nur Vor- oder Nachmittag';
COMMENT ON COLUMN absences.status IS 'Status – Bewilligung';
COMMENT ON COLUMN absences.remark IS 'Bemerkung – ohne Diagnosen';
COMMENT ON COLUMN absences.approved_by_id IS 'Bewilligt von – Schulleitung (ohne Constraint)';
COMMENT ON COLUMN absences.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN absences.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN absences.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN absences.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN absences.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN absences.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN absences.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE booking_corrections IS 'Korrekturantrag zu einer Buchung – Antrag der Person mit Begründung, Bestätigung durch die vorgesetzte Person';
COMMENT ON COLUMN booking_corrections.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN booking_corrections.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN booking_corrections.user_id IS 'Person – antragstellende Person';
COMMENT ON COLUMN booking_corrections.work_on IS 'Arbeitstag – betroffener Tag';
COMMENT ON COLUMN booking_corrections.booking_id IS 'Buchung';
COMMENT ON COLUMN booking_corrections.new_booking_kind IS 'Neue Buchung – Art';
COMMENT ON COLUMN booking_corrections.new_booked_at IS 'Neuer Zeitpunkt – korrigierte Zeit';
COMMENT ON COLUMN booking_corrections.is_deletion IS 'Löschen – Buchung entfernen';
COMMENT ON COLUMN booking_corrections.reason IS 'Begründung – Pflicht';
COMMENT ON COLUMN booking_corrections.status IS 'Status – Entscheid';
COMMENT ON COLUMN booking_corrections.decided_by_id IS 'Entschieden von – vorgesetzte Person (ohne Constraint)';
COMMENT ON COLUMN booking_corrections.decided_at IS 'Entschieden am – Zeitpunkt';
COMMENT ON COLUMN booking_corrections.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN booking_corrections.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE vacation_entitlements IS 'Ferienanspruch einer Person je Jahr – Personalrecht und Arbeitsmodell; Ferienguthaben in der Monatsübersicht';
COMMENT ON COLUMN vacation_entitlements.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN vacation_entitlements.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN vacation_entitlements.user_id IS 'Person – Mitarbeiterin bzw. Mitarbeiter';
COMMENT ON COLUMN vacation_entitlements.year IS 'Jahr – Kalenderjahr';
COMMENT ON COLUMN vacation_entitlements.entitlement_days IS 'Anspruch (Tage) – Ferientage';
COMMENT ON COLUMN vacation_entitlements.carried_over_days IS 'Übertrag (Tage) – aus dem Vorjahr';
COMMENT ON TABLE month_closings IS 'Monatsabschluss mit eingefrorenen Werten, Einreichen und Visum – «Monat einreichen»; Visum der Schulleitung, optional mit EduKSX-Sign';
COMMENT ON COLUMN month_closings.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN month_closings.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN month_closings.user_id IS 'Person – Mitarbeiterin bzw. Mitarbeiter';
COMMENT ON COLUMN month_closings.month_on IS 'Monat – erster Tag des Monats';
COMMENT ON COLUMN month_closings.target_minutes IS 'Soll (Minuten) – Monat';
COMMENT ON COLUMN month_closings.actual_minutes IS 'Ist (Minuten) – Monat';
COMMENT ON COLUMN month_closings.absence_minutes IS 'Abwesenheit (Minuten) – angerechnet';
COMMENT ON COLUMN month_closings.balance_minutes IS 'Saldo Monat (Minuten) – Ist minus Soll';
COMMENT ON COLUMN month_closings.carried_balance_minutes IS 'Saldovortrag (Minuten) – aus dem Vormonat';
COMMENT ON COLUMN month_closings.total_balance_minutes IS 'Saldo total (Minuten) – Vortrag plus Monat';
COMMENT ON COLUMN month_closings.vacation_taken_days IS 'Ferien bezogen (Tage) – Monat';
COMMENT ON COLUMN month_closings.vacation_remaining_days IS 'Ferien Rest (Tage) – nach dem Monat';
COMMENT ON COLUMN month_closings.status IS 'Status – Abschluss';
COMMENT ON COLUMN month_closings.submitted_at IS 'Eingereicht am – Zeitpunkt';
COMMENT ON COLUMN month_closings.approved_by_id IS 'Visiert von – Schulleitung (ohne Constraint)';
COMMENT ON COLUMN month_closings.approved_at IS 'Visiert am – Zeitpunkt';
COMMENT ON COLUMN month_closings.sign_process_reference IS 'Signatur – Verweis auf EduKSX-Sign';
COMMENT ON COLUMN month_closings.remark IS 'Bemerkung – Freitext';
COMMENT ON COLUMN month_closings.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON VIEW daily_totals IS 'Tageswerte: Anwesenheit, gestempelte Pausen, gesetzliche Pause, Ist';
-- <<< kommentare
