-- EduKSX-Sign – Datenmodell (Entwurf), direkt ausführbar (inkl. Standardtabellen)
-- Quelle: docs/umsetzung/sign/datenbank.sql

-- EduKSX-Sign – Datenbankstruktur (Signatur / Persönliche Ablage)
-- Stand 2026-11-20 · Status ENTWURF · DB-Standard 1.3 · Grundlage: Prototyp prototypen/signatur
-- Namen englisch, deutsche Beschreibungen je Tabelle, Spalte und Wert. Erzeugte Blöcke (>>> … <<<) nicht von Hand
-- ändern: python3 tools/umsetzung_bauen.py
--
-- Dateiinhalte liegen im Objektspeicher (Schweiz); die Datenbank hält Metadaten, Versionen, Anmerkungen,
-- Signaturprozesse, Anfragen aus anderen Modulen und den Abgleich mit der Cloud-Ablage. Die Signatur selbst erstellt
-- ein Signaturdienst (Anbieter offen); gespeichert werden Nachweise.

CREATE SCHEMA IF NOT EXISTS sign;
SET search_path TO sign;

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

-- ------------------------------------------------------------------ Persönliche Ablage

-- Ordner der persönlichen Ablage (oberste Ebene = «Meine Ablage»)
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: angelegt in «Meine Ablage» oder vom Abgleich mit der Cloud-Ablage
CREATE TABLE folders (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Besitzerin bzw. Besitzer | nur sie bzw. er sieht den Ordner | intern
    parent_id           uuid REFERENCES folders(id) ON DELETE CASCADE,   -- Übergeordneter Ordner | leer = «Meine Ablage» | intern
    name                text NOT NULL,                   -- Ordner | Name
    system_folder       text CHECK (system_folder IN ('received_signatures','inbox')),   -- Systemordner | vom System angelegt | intern | received_signatures=Unterzeichnet erhalten; inbox=Eingang
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE NULLS NOT DISTINCT (user_id, parent_id, name)
);

-- Dokument (Datei) in der persönlichen Ablage
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: hochgeladen, aus der Cloud-Ablage, aus einem Modul oder Ergebnis einer Signatur
CREATE TABLE documents (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Besitzerin bzw. Besitzer | nur sie bzw. er sieht das Dokument | intern
    folder_id           uuid REFERENCES folders(id) ON DELETE SET NULL,   -- Ordner | leer = oberste Ebene | intern
    name                text NOT NULL,                   -- Dateiname | Anzeige, Suffix «_sign» bzw. «_seal» bei Ergebnissen
    document_type       text NOT NULL CHECK (document_type IN ('pdf','word','excel','image','text','other')),   -- Typ | Anzeige und Werkzeuge | intern | pdf=PDF; word=Word; excel=Excel; image=Bild; text=Text; other=andere
    mime_type           text NOT NULL,                   -- MIME-Typ | technischer Dateityp | intern
    size_bytes          bigint NOT NULL,                 -- Grösse | Bytes | intern
    status              text CHECK (status IN ('in_signing','signed','sealed')),   -- Status | leer = bearbeitbar | intern | in_signing=in Signatur; signed=signiert; sealed=versiegelt
    is_locked           boolean NOT NULL DEFAULT false,  -- Gesperrt | signiert oder versiegelt, nur als Kopie bearbeitbar | intern
    derived_from_id     uuid REFERENCES documents(id),   -- Abgeleitet von | Original zu PDF/A, _sign, _seal oder Kopie | intern
    derivation          text CHECK (derivation IN ('pdfa','signed','sealed','copy','word_edit')),   -- Ableitung | Art der Ableitung | intern | pdfa=PDF/A-Umwandlung; signed=signiert; sealed=versiegelt; copy=Kopie; word_edit=Word bearbeitet
    sync_status         text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('ok','pending','conflict','excluded')),   -- Abgleich | Stand mit der Cloud-Ablage | intern | ok=abgeglichen; pending=ausstehend; conflict=Konflikt; excluded=ausgeschlossen
    current_version     integer NOT NULL DEFAULT 1,      -- Aktuelle Version | Nummer | intern
    content_changed_at  timestamptz NOT NULL DEFAULT now(),   -- Inhalt geändert am | Anzeige «geändert» | intern
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid
);
CREATE UNIQUE INDEX documents_user_id_folder_id_name_unique ON documents (user_id, coalesce(folder_id, '00000000-0000-0000-0000-000000000000'::uuid), name) WHERE deleted_at IS NULL;

-- Version des Dateiinhalts (jede Speicherung, Umwandlung, Änderung aus der Cloud)
-- Geltungsbereich: persönlich · Datenklasse: intern
-- Herkunft/Verwendung: geschrieben beim Speichern; Versionsliste und Wiederherstellen
CREATE TABLE document_versions (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Besitzerin bzw. Besitzer | wie beim Dokument
    document_id         uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,   -- Dokument | Verweis
    version_number      integer NOT NULL,                -- Version | laufende Nummer
    storage_key         text NOT NULL,                   -- Speicherort | Objekt im Objektspeicher
    sha256              char(64) NOT NULL,               -- Prüfsumme | SHA-256 des Inhalts
    size_bytes          bigint NOT NULL,                 -- Grösse | Bytes
    page_count          integer,                         -- Seiten | bei PDF
    pdfa_level          text,                            -- PDF/A | z. B. «PDF/A-2b» nach Umwandlung
    origin              text NOT NULL CHECK (origin IN ('upload','edit','conversion','signature','seal','cloud','module')),   -- Herkunft | Art der Version | intern | upload=hochgeladen; edit=bearbeitet; conversion=umgewandelt; signature=signiert; seal=versiegelt; cloud=aus der Cloud-Ablage; module=aus einem Modul
    created_at          timestamptz NOT NULL DEFAULT now(),
    created_by_id       uuid,
    UNIQUE (document_id, version_number)
);

-- Anmerkung oder Formularwert auf einem PDF (Text, Kommentar, Datum, Unterschriftsfeld, Siegel)
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Werkzeugleiste im Dokument; wird beim Umwandeln oder Signieren eingebrannt
CREATE TABLE document_annotations (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Besitzerin bzw. Besitzer | wie beim Dokument | intern
    document_id         uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,   -- Dokument | Verweis | intern
    annotation_type     text NOT NULL CHECK (annotation_type IN ('text','comment','date','signature_field','form_value','seal','checkmark')),   -- Art | Werkzeug | intern | text=Text; comment=Kommentar; date=Datum; signature_field=Unterschriftsfeld; form_value=Formularwert; seal=Siegel; checkmark=Haken
    page_index          integer NOT NULL CHECK (page_index >= 0),   -- Seite | ab 0 | intern
    x_percent           numeric(6,2) NOT NULL,           -- Position links (%) | relativ zur Seitenbreite | intern
    y_percent           numeric(6,2) NOT NULL,           -- Position oben (%) | relativ zur Seitenhöhe | intern
    width_percent       numeric(6,2),                    -- Breite (%) | relativ | intern
    height_percent      numeric(6,2),                    -- Höhe (%) | relativ | intern
    content             text,                            -- Inhalt | Text, Kommentar, Datum oder Formularwert
    form_field_name     text,                            -- Formularfeld | Name im PDF-Formular | intern
    is_flattened        boolean NOT NULL DEFAULT false,  -- Eingebrannt | fest ins PDF übernommen | intern
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------------ Signaturprozess

-- Signaturprozess (aus der Ablage oder als Anfrage eines Moduls)
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Assistent «Signieren» bzw. Schnittstelle für Module; Ergebnis «<Name>_sign.pdf» im Ursprungsordner
CREATE TABLE signature_processes (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    number              text NOT NULL,                   -- Nummer | Anzeige
    document_id         uuid REFERENCES documents(id),   -- Quelle | Dokument in der Ablage
    source_name         text NOT NULL,                   -- Quelldatei | Dateiname der Quelle
    title               text NOT NULL,                   -- Titel | Betreff für die Unterzeichnenden
    initiator_id        uuid NOT NULL REFERENCES users(id),   -- Gestartet von | Person
    status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','completed','declined','withdrawn','expired')),   -- Status | Stand des Prozesses | intern | draft=Entwurf; running=laufend; completed=abgeschlossen; declined=abgelehnt; withdrawn=zurückgezogen; expired=abgelaufen
    wizard_step         integer NOT NULL DEFAULT 0,      -- Assistent | 0 Dokument … 3 Senden
    is_converted        boolean NOT NULL DEFAULT false,  -- PDF/A erzeugt | Umwandlung vor dem Signieren
    keep_pdfa_copy      boolean NOT NULL DEFAULT false,  -- PDF/A ablegen | Kopie in der Ablage behalten
    has_placeholders    boolean NOT NULL DEFAULT false,  -- Platzhalter übernommen | «#sign#n#» erkannt
    signing_order       text NOT NULL DEFAULT 'sequential' CHECK (signing_order IN ('sequential','parallel')),   -- Reihenfolge | Unterschriften | intern | sequential=nacheinander; parallel=gleichzeitig
    signature_level     text NOT NULL DEFAULT 'advanced' CHECK (signature_level IN ('simple','advanced','qualified')),   -- Signaturstufe | rechtliche Wirkung | intern | simple=einfach (SES); advanced=fortgeschritten (FES); qualified=qualifiziert (QES)
    jurisdiction        text NOT NULL DEFAULT 'zertes' CHECK (jurisdiction IN ('zertes','eidas')),   -- Rechtsraum | Signaturrecht | intern | zertes=Schweiz (ZertES); eidas=EU (eIDAS)
    message             text,                            -- Nachricht | an die Unterzeichnenden
    due_on              date,                            -- Frist | Unterschrift bis
    reminder_days       integer,                         -- Erinnerung (Tage) | Abstand der Erinnerungen
    seal_after          boolean NOT NULL DEFAULT false,  -- Versiegeln | nach Abschluss mit dem Organisationssiegel
    result_document_id  uuid REFERENCES documents(id),   -- Ergebnis | «<Name>_sign.pdf»
    provider_reference  text,                            -- Anbieter-ID | Kennung beim Signaturdienst
    source_module       text,                            -- Anfragendes Modul | Modulschlüssel, z. B. «time»
    source_reference    text,                            -- Bezug im Modul | Rückverweis
    sent_at             timestamptz,                     -- Gesendet am | Versand
    completed_at        timestamptz,                     -- Abgeschlossen am | letzte Unterschrift
    created_at timestamptz NOT NULL DEFAULT now(), created_by_id uuid, updated_at timestamptz NOT NULL DEFAULT now(), updated_by_id uuid, lock_version integer NOT NULL DEFAULT 1, deleted_at timestamptz, deleted_by_id uuid,
    UNIQUE (organization_id, number)
);

-- Beteiligte Person eines Signaturprozesses (unterschreiben, genehmigen, Kopie)
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Assistent Schritt 2; intern über die Personenreferenz, extern mit Name und E-Mail
CREATE TABLE signature_process_participants (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    signature_process_id uuid NOT NULL REFERENCES signature_processes(id) ON DELETE CASCADE,   -- Signaturprozess | Verweis | intern
    position            integer NOT NULL,                -- Reihenfolge | bei «nacheinander» | intern
    user_id             uuid REFERENCES users(id) ON DELETE SET NULL,   -- Person | intern, sonst leer
    display_name        text NOT NULL,                   -- Name | Anzeige und Signaturprotokoll
    email               text NOT NULL,                   -- E-Mail | Einladung
    mobile_number       text,                            -- Mobiltelefon | Code für FES, nur solange nötig
    participant_role    text NOT NULL CHECK (participant_role IN ('signer','approver','copy')),   -- Rolle | Aufgabe im Prozess | intern | signer=unterschreiben; approver=genehmigen; copy=Kopie erhalten
    status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open','notified','signed','approved','declined')),   -- Status | Stand der Person | intern | open=offen; notified=benachrichtigt; signed=signiert; approved=genehmigt; declined=abgelehnt
    acted_at            timestamptz,                     -- Zeitpunkt | Unterschrift bzw. Entscheid | intern
    decline_reason      text,                            -- Begründung | bei Ablehnung
    UNIQUE (signature_process_id, position)
);

-- Unterschriftsfeld je Person
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: Assistent Schritt 3; von Hand platziert oder aus Platzhalter «#sign#n#»
CREATE TABLE signature_process_fields (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    signature_process_id uuid NOT NULL REFERENCES signature_processes(id) ON DELETE CASCADE,   -- Signaturprozess | Verweis
    participant_id      uuid NOT NULL REFERENCES signature_process_participants(id) ON DELETE CASCADE,   -- Person | unterschreibt hier
    page_index          integer NOT NULL,                -- Seite | ab 0
    x_percent           numeric(6,2) NOT NULL,           -- Position links (%) | relativ
    y_percent           numeric(6,2) NOT NULL,           -- Position oben (%) | relativ
    width_percent       numeric(6,2) NOT NULL DEFAULT 36,   -- Breite (%) | relativ
    height_percent      numeric(6,2) NOT NULL DEFAULT 9,    -- Höhe (%) | relativ
    placeholder         text                             -- Platzhalter | z. B. «0-1» aus «#sign#1#»
);

-- Signaturprotokoll eines Prozesses (unveränderlich)
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: geschrieben bei jedem Schritt; Teil des Ergebnisses
CREATE TABLE signature_process_events (
    id                  bigserial PRIMARY KEY,
    event_id            uuid NOT NULL UNIQUE,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    signature_process_id uuid NOT NULL REFERENCES signature_processes(id) ON DELETE CASCADE,   -- Signaturprozess | Verweis | intern
    occurred_at         timestamptz NOT NULL DEFAULT now(),   -- Zeitpunkt | wann | intern
    text                text NOT NULL,                   -- Eintrag | z. B. «Lea Muster hat unterschrieben»
    actor_id            uuid                             -- Person | Auslöser (ohne Constraint) | intern
);

-- Nachweis einer geleisteten Signatur
-- Geltungsbereich: Organisation · Datenklasse: personenbezogen
-- Herkunft/Verwendung: vom Signaturdienst; Prüfbericht und Signaturprotokoll
CREATE TABLE signatures (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    document_id         uuid NOT NULL REFERENCES documents(id),   -- Dokument | signiertes Dokument | intern
    participant_id      uuid REFERENCES signature_process_participants(id),   -- Person im Prozess | Verweis | intern
    signer_name         text NOT NULL,                   -- Name | wie im Zertifikat
    signer_function     text,                            -- Funktion | Anzeige
    signature_level     text NOT NULL CHECK (signature_level IN ('simple','advanced','qualified')),   -- Signaturstufe | rechtliche Wirkung | intern | simple=einfach (SES); advanced=fortgeschritten (FES); qualified=qualifiziert (QES)
    jurisdiction        text NOT NULL CHECK (jurisdiction IN ('zertes','eidas')),   -- Rechtsraum | Signaturrecht | intern | zertes=Schweiz (ZertES); eidas=EU (eIDAS)
    signed_at           timestamptz NOT NULL,            -- Zeitpunkt | Zeitstempel der Signatur | intern
    certificate_issuer  text,                            -- Zertifikat von | Aussteller | intern
    validation          jsonb,                           -- Prüfbericht | Ergebnis des Dienstes | intern
    UNIQUE (document_id, participant_id)
);

-- Siegel der Organisation auf einem Dokument
-- Geltungsbereich: Organisation · Datenklasse: intern
-- Herkunft/Verwendung: «Versiegeln» bzw. Schnittstelle für Module; Ergebnis «<Name>_seal.pdf»
CREATE TABLE seals (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    document_id         uuid NOT NULL REFERENCES documents(id),   -- Dokument | versiegeltes Dokument
    seal_holder         text NOT NULL,                   -- Organisation | Inhaberin des Siegels
    seal_level          text NOT NULL CHECK (seal_level IN ('advanced','qualified')),   -- Stufe | fortgeschritten oder qualifiziert | intern | advanced=fortgeschritten; qualified=qualifiziert
    jurisdiction        text NOT NULL CHECK (jurisdiction IN ('zertes','eidas')),   -- Rechtsraum | Signaturrecht | intern | zertes=Schweiz (ZertES); eidas=EU (eIDAS)
    is_visible          boolean NOT NULL DEFAULT true,   -- Sichtbar | Siegelbild auf der letzten Seite
    sealed_at           timestamptz NOT NULL DEFAULT now(),   -- Versiegelt am | Zeitstempel
    sealed_by_id        uuid NOT NULL                    -- Ausgelöst von | Person (ohne Constraint)
);

-- Persönliche Standardwerte für Signaturen
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: «Meine Unterschrift»; Vorgabe im Assistenten
CREATE TABLE signing_preferences (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL UNIQUE REFERENCES users(id),   -- Person | Besitzerin bzw. Besitzer | intern
    signature_level     text NOT NULL DEFAULT 'advanced' CHECK (signature_level IN ('simple','advanced','qualified')),   -- Signaturstufe | Vorgabe | intern | simple=einfach (SES); advanced=fortgeschritten (FES); qualified=qualifiziert (QES)
    jurisdiction        text NOT NULL DEFAULT 'zertes' CHECK (jurisdiction IN ('zertes','eidas')),   -- Rechtsraum | Vorgabe | intern | zertes=Schweiz (ZertES); eidas=EU (eIDAS)
    signature_image_key text,                            -- Unterschriftsbild | gespeichertes Bild (ohne rechtliche Wirkung, offen)
    updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------------ Eingang (Anfragen aus Modulen)

-- Signaturanfrage an eine Person (aus Staffing, Time, Flow, Core oder von Kolleginnen und Kollegen)
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Schnittstelle für Module; Liste «Zu unterschreiben»
CREATE TABLE signature_requests (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Empfängerin bzw. Empfänger | soll unterschreiben | intern
    source_module       text NOT NULL,                   -- Modul | Modulschlüssel, z. B. «staffing» | intern
    sender_label        text NOT NULL,                   -- Von | Absender (Person bzw. Rolle)
    title               text NOT NULL,                   -- Titel | z. B. «Monatsvisum November»
    file_name           text NOT NULL,                   -- Datei | Dateiname
    document_id         uuid REFERENCES documents(id),   -- Dokument | Kopie in der Ablage | intern
    signature_process_id uuid REFERENCES signature_processes(id),   -- Signaturprozess | Verweis | intern
    received_at         timestamptz NOT NULL DEFAULT now(),   -- Erhalten am | Eingang | intern
    due_on              date,                            -- Frist | Unterschrift bis | intern
    signature_level     text NOT NULL CHECK (signature_level IN ('simple','advanced','qualified')),   -- Signaturstufe | verlangt | intern | simple=einfach (SES); advanced=fortgeschritten (FES); qualified=qualifiziert (QES)
    jurisdiction        text NOT NULL CHECK (jurisdiction IN ('zertes','eidas')),   -- Rechtsraum | Signaturrecht | intern | zertes=Schweiz (ZertES); eidas=EU (eIDAS)
    status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open','signed','declined','expired')),   -- Status | Stand der Anfrage | intern | open=offen; signed=signiert; declined=abgelehnt; expired=abgelaufen
    message             text,                            -- Nachricht | vom Absender
    callback_url        text,                            -- Rückmeldung an | Adresse im Modul | intern
    idempotency_key     text NOT NULL,                   -- Idempotenzschlüssel | verhindert Doppelanfragen | intern
    UNIQUE (organization_id, source_module, idempotency_key)
);

-- ------------------------------------------------------------------ Abgleich mit der Cloud-Ablage

-- Einstellungen des Abgleichs einer Person
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: «Synchronisation»; Verbindung über EduKSX-Connect
CREATE TABLE sync_settings (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL UNIQUE REFERENCES users(id),   -- Person | Besitzerin bzw. Besitzer | intern
    is_active           boolean NOT NULL DEFAULT false,  -- Aktiv | Abgleich eingeschaltet | intern
    target_path         text NOT NULL,                   -- Zielordner | Ordner in der Cloud-Ablage
    direction           text NOT NULL DEFAULT 'both' CHECK (direction IN ('both','upload','download')),   -- Richtung | Abgleich | intern | both=beide Richtungen; upload=nur hochladen; download=nur herunterladen
    interval_minutes    integer NOT NULL DEFAULT 5,      -- Intervall (Minuten) | Abstand | intern
    conflict_rule       text NOT NULL DEFAULT 'keep_both' CHECK (conflict_rule IN ('keep_both','local','cloud','newer')),   -- Konfliktregel | bei Änderungen auf beiden Seiten | intern | keep_both=beide behalten; local=lokal gewinnt; cloud=Cloud gewinnt; newer=neuere gewinnt
    connect_reference   text,                            -- Verbindung | Kennung in EduKSX-Connect | intern
    last_synced_at      timestamptz,                     -- Letzter Abgleich | Zeitpunkt | intern
    delta_token         text,                            -- Änderungsstand | Token der Cloud-Ablage | geheim
    updated_at timestamptz NOT NULL DEFAULT now(), lock_version integer NOT NULL DEFAULT 1
);

-- Zuordnung lokales Objekt ↔ Objekt in der Cloud-Ablage
-- Geltungsbereich: persönlich · Datenklasse: intern
-- Herkunft/Verwendung: Abgleichsdienst; Ordnerabgleich und Konflikte
CREATE TABLE sync_items (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Person | Besitzerin bzw. Besitzer
    folder_id           uuid REFERENCES folders(id) ON DELETE CASCADE,     -- Ordner | lokal
    document_id         uuid REFERENCES documents(id) ON DELETE CASCADE,   -- Dokument | lokal
    cloud_item_id       text NOT NULL,                   -- Cloud-ID | Objekt in der Cloud-Ablage
    cloud_etag          text,                            -- Cloud-Stand | ETag der Cloud
    local_version       integer,                         -- Lokale Version | Nummer
    status              text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','pending','conflict','failed')),   -- Status | Abgleich | intern | ok=abgeglichen; pending=ausstehend; conflict=Konflikt; failed=Fehler
    synced_at           timestamptz,                     -- Abgeglichen am | Zeitpunkt
    CHECK ((folder_id IS NULL) <> (document_id IS NULL)),
    UNIQUE (user_id, cloud_item_id)
);

-- Protokoll des Abgleichs
-- Geltungsbereich: persönlich · Datenklasse: personenbezogen
-- Herkunft/Verwendung: Abgleichsdienst; Anzeige «Protokoll» in «Synchronisation»
CREATE TABLE sync_events (
    id                  bigserial PRIMARY KEY,
    event_id            uuid NOT NULL UNIQUE,
    organization_id     uuid NOT NULL REFERENCES organizations(id),
    user_id             uuid NOT NULL REFERENCES users(id),   -- Person | Besitzerin bzw. Besitzer | intern
    occurred_at         timestamptz NOT NULL DEFAULT now(),   -- Zeitpunkt | wann | intern
    text                text NOT NULL                    -- Eintrag | z. B. «+ Ordner Verträge»
);

-- Ausnahmetabelle (doppelt gespeichert, DB A2)
-- signature_process_participants.display_name/email: Name und E-Mail auch bei internen Personen – Grund: Signaturprotokoll bleibt lesbar; Stand beim Senden
-- signatures.signer_name: Name wie im Zertifikat – Grund: Nachweis; unveränderlich

-- >>> indizes
CREATE INDEX organizations_parent_id_index ON organizations (parent_id);
CREATE INDEX users_organization_id_index ON users (organization_id);
CREATE INDEX school_holidays_organization_id_index ON school_holidays (organization_id);
CREATE INDEX school_holidays_school_year_id_index ON school_holidays (school_year_id);
CREATE INDEX folders_organization_id_index ON folders (organization_id);
CREATE INDEX folders_parent_id_index ON folders (parent_id);
CREATE INDEX documents_organization_id_index ON documents (organization_id);
CREATE INDEX documents_user_id_index ON documents (user_id);
CREATE INDEX documents_folder_id_index ON documents (folder_id);
CREATE INDEX documents_derived_from_id_index ON documents (derived_from_id);
CREATE INDEX document_versions_organization_id_index ON document_versions (organization_id);
CREATE INDEX document_versions_user_id_index ON document_versions (user_id);
CREATE INDEX document_annotations_organization_id_index ON document_annotations (organization_id);
CREATE INDEX document_annotations_user_id_index ON document_annotations (user_id);
CREATE INDEX document_annotations_document_id_index ON document_annotations (document_id);
CREATE INDEX signature_processes_document_id_index ON signature_processes (document_id);
CREATE INDEX signature_processes_initiator_id_index ON signature_processes (initiator_id);
CREATE INDEX signature_processes_result_document_id_index ON signature_processes (result_document_id);
CREATE INDEX signature_process_participants_organization_id_index ON signature_process_participants (organization_id);
CREATE INDEX signature_process_participants_user_id_index ON signature_process_participants (user_id);
CREATE INDEX signature_process_fields_organization_id_index ON signature_process_fields (organization_id);
CREATE INDEX signature_process_fields_signature_process_id_index ON signature_process_fields (signature_process_id);
CREATE INDEX signature_process_fields_participant_id_index ON signature_process_fields (participant_id);
CREATE INDEX signature_process_events_organization_id_index ON signature_process_events (organization_id);
CREATE INDEX signature_process_events_signature_process_id_index ON signature_process_events (signature_process_id);
CREATE INDEX signatures_organization_id_index ON signatures (organization_id);
CREATE INDEX signatures_participant_id_index ON signatures (participant_id);
CREATE INDEX seals_organization_id_index ON seals (organization_id);
CREATE INDEX seals_document_id_index ON seals (document_id);
CREATE INDEX signing_preferences_organization_id_index ON signing_preferences (organization_id);
CREATE INDEX signature_requests_user_id_index ON signature_requests (user_id);
CREATE INDEX signature_requests_document_id_index ON signature_requests (document_id);
CREATE INDEX signature_requests_signature_process_id_index ON signature_requests (signature_process_id);
CREATE INDEX sync_settings_organization_id_index ON sync_settings (organization_id);
CREATE INDEX sync_items_organization_id_index ON sync_items (organization_id);
CREATE INDEX sync_items_folder_id_index ON sync_items (folder_id);
CREATE INDEX sync_items_document_id_index ON sync_items (document_id);
CREATE INDEX sync_events_organization_id_index ON sync_events (organization_id);
CREATE INDEX sync_events_user_id_index ON sync_events (user_id);
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
COMMENT ON TABLE folders IS 'Ordner der persönlichen Ablage (oberste Ebene = «Meine Ablage») – angelegt in «Meine Ablage» oder vom Abgleich mit der Cloud-Ablage';
COMMENT ON COLUMN folders.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN folders.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN folders.user_id IS 'Besitzerin bzw. Besitzer – nur sie bzw. er sieht den Ordner';
COMMENT ON COLUMN folders.parent_id IS 'Übergeordneter Ordner';
COMMENT ON COLUMN folders.name IS 'Ordner – Name';
COMMENT ON COLUMN folders.system_folder IS 'Systemordner – vom System angelegt';
COMMENT ON COLUMN folders.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN folders.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN folders.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN folders.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN folders.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN folders.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN folders.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE documents IS 'Dokument (Datei) in der persönlichen Ablage – hochgeladen, aus der Cloud-Ablage, aus einem Modul oder Ergebnis einer Signatur';
COMMENT ON COLUMN documents.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN documents.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN documents.user_id IS 'Besitzerin bzw. Besitzer – nur sie bzw. er sieht das Dokument';
COMMENT ON COLUMN documents.folder_id IS 'Ordner';
COMMENT ON COLUMN documents.name IS 'Dateiname – Anzeige, Suffix «_sign» bzw. «_seal» bei Ergebnissen';
COMMENT ON COLUMN documents.document_type IS 'Typ – Anzeige und Werkzeuge';
COMMENT ON COLUMN documents.mime_type IS 'MIME-Typ – technischer Dateityp';
COMMENT ON COLUMN documents.size_bytes IS 'Grösse – Bytes';
COMMENT ON COLUMN documents.status IS 'Status';
COMMENT ON COLUMN documents.is_locked IS 'Gesperrt – signiert oder versiegelt, nur als Kopie bearbeitbar';
COMMENT ON COLUMN documents.derived_from_id IS 'Abgeleitet von – Original zu PDF/A, _sign, _seal oder Kopie';
COMMENT ON COLUMN documents.derivation IS 'Ableitung – Art der Ableitung';
COMMENT ON COLUMN documents.sync_status IS 'Abgleich – Stand mit der Cloud-Ablage';
COMMENT ON COLUMN documents.current_version IS 'Aktuelle Version – Nummer';
COMMENT ON COLUMN documents.content_changed_at IS 'Inhalt geändert am – Anzeige «geändert»';
COMMENT ON COLUMN documents.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN documents.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN documents.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN documents.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN documents.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN documents.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN documents.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE document_versions IS 'Version des Dateiinhalts (jede Speicherung, Umwandlung, Änderung aus der Cloud) – geschrieben beim Speichern; Versionsliste und Wiederherstellen';
COMMENT ON COLUMN document_versions.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN document_versions.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN document_versions.user_id IS 'Besitzerin bzw. Besitzer – wie beim Dokument';
COMMENT ON COLUMN document_versions.document_id IS 'Dokument – Verweis';
COMMENT ON COLUMN document_versions.version_number IS 'Version – laufende Nummer';
COMMENT ON COLUMN document_versions.storage_key IS 'Speicherort – Objekt im Objektspeicher';
COMMENT ON COLUMN document_versions.sha256 IS 'Prüfsumme – SHA-256 des Inhalts';
COMMENT ON COLUMN document_versions.size_bytes IS 'Grösse – Bytes';
COMMENT ON COLUMN document_versions.page_count IS 'Seiten – bei PDF';
COMMENT ON COLUMN document_versions.pdfa_level IS 'PDF/A – z. B. «PDF/A-2b» nach Umwandlung';
COMMENT ON COLUMN document_versions.origin IS 'Herkunft – Art der Version';
COMMENT ON COLUMN document_versions.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN document_versions.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON TABLE document_annotations IS 'Anmerkung oder Formularwert auf einem PDF (Text, Kommentar, Datum, Unterschriftsfeld, Siegel) – Werkzeugleiste im Dokument; wird beim Umwandeln oder Signieren eingebrannt';
COMMENT ON COLUMN document_annotations.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN document_annotations.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN document_annotations.user_id IS 'Besitzerin bzw. Besitzer – wie beim Dokument';
COMMENT ON COLUMN document_annotations.document_id IS 'Dokument – Verweis';
COMMENT ON COLUMN document_annotations.annotation_type IS 'Art – Werkzeug';
COMMENT ON COLUMN document_annotations.page_index IS 'Seite – ab 0';
COMMENT ON COLUMN document_annotations.x_percent IS 'Position links (%) – relativ zur Seitenbreite';
COMMENT ON COLUMN document_annotations.y_percent IS 'Position oben (%) – relativ zur Seitenhöhe';
COMMENT ON COLUMN document_annotations.width_percent IS 'Breite (%) – relativ';
COMMENT ON COLUMN document_annotations.height_percent IS 'Höhe (%) – relativ';
COMMENT ON COLUMN document_annotations.content IS 'Inhalt – Text, Kommentar, Datum oder Formularwert';
COMMENT ON COLUMN document_annotations.form_field_name IS 'Formularfeld – Name im PDF-Formular';
COMMENT ON COLUMN document_annotations.is_flattened IS 'Eingebrannt – fest ins PDF übernommen';
COMMENT ON COLUMN document_annotations.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN document_annotations.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN document_annotations.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE signature_processes IS 'Signaturprozess (aus der Ablage oder als Anfrage eines Moduls) – Assistent «Signieren» bzw. Schnittstelle für Module; Ergebnis «<Name>_sign.pdf» im Ursprungsordner';
COMMENT ON COLUMN signature_processes.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN signature_processes.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN signature_processes.number IS 'Nummer – Anzeige';
COMMENT ON COLUMN signature_processes.document_id IS 'Quelle – Dokument in der Ablage';
COMMENT ON COLUMN signature_processes.source_name IS 'Quelldatei – Dateiname der Quelle';
COMMENT ON COLUMN signature_processes.title IS 'Titel – Betreff für die Unterzeichnenden';
COMMENT ON COLUMN signature_processes.initiator_id IS 'Gestartet von – Person';
COMMENT ON COLUMN signature_processes.status IS 'Status – Stand des Prozesses';
COMMENT ON COLUMN signature_processes.wizard_step IS 'Assistent – 0 Dokument … 3 Senden';
COMMENT ON COLUMN signature_processes.is_converted IS 'PDF/A erzeugt – Umwandlung vor dem Signieren';
COMMENT ON COLUMN signature_processes.keep_pdfa_copy IS 'PDF/A ablegen – Kopie in der Ablage behalten';
COMMENT ON COLUMN signature_processes.has_placeholders IS 'Platzhalter übernommen – «#sign#n#» erkannt';
COMMENT ON COLUMN signature_processes.signing_order IS 'Reihenfolge – Unterschriften';
COMMENT ON COLUMN signature_processes.signature_level IS 'Signaturstufe – rechtliche Wirkung';
COMMENT ON COLUMN signature_processes.jurisdiction IS 'Rechtsraum – Signaturrecht';
COMMENT ON COLUMN signature_processes.message IS 'Nachricht – an die Unterzeichnenden';
COMMENT ON COLUMN signature_processes.due_on IS 'Frist – Unterschrift bis';
COMMENT ON COLUMN signature_processes.reminder_days IS 'Erinnerung (Tage) – Abstand der Erinnerungen';
COMMENT ON COLUMN signature_processes.seal_after IS 'Versiegeln – nach Abschluss mit dem Organisationssiegel';
COMMENT ON COLUMN signature_processes.result_document_id IS 'Ergebnis – «<Name>_sign.pdf»';
COMMENT ON COLUMN signature_processes.provider_reference IS 'Anbieter-ID – Kennung beim Signaturdienst';
COMMENT ON COLUMN signature_processes.source_module IS 'Anfragendes Modul – Modulschlüssel, z. B. «time»';
COMMENT ON COLUMN signature_processes.source_reference IS 'Bezug im Modul – Rückverweis';
COMMENT ON COLUMN signature_processes.sent_at IS 'Gesendet am – Versand';
COMMENT ON COLUMN signature_processes.completed_at IS 'Abgeschlossen am – letzte Unterschrift';
COMMENT ON COLUMN signature_processes.created_at IS 'Erstellt am – Zeitpunkt der Erfassung (UTC)';
COMMENT ON COLUMN signature_processes.created_by_id IS 'Erstellt von – Person, die den Datensatz angelegt hat (ohne Constraint)';
COMMENT ON COLUMN signature_processes.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN signature_processes.updated_by_id IS 'Geändert von – Person der letzten Änderung (ohne Constraint)';
COMMENT ON COLUMN signature_processes.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON COLUMN signature_processes.deleted_at IS 'Gelöscht am – Papierkorb: vorläufig gelöscht';
COMMENT ON COLUMN signature_processes.deleted_by_id IS 'Gelöscht von – Person, die gelöscht hat (ohne Constraint)';
COMMENT ON TABLE signature_process_participants IS 'Beteiligte Person eines Signaturprozesses (unterschreiben, genehmigen, Kopie) – Assistent Schritt 2; intern über die Personenreferenz, extern mit Name und E-Mail';
COMMENT ON COLUMN signature_process_participants.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN signature_process_participants.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN signature_process_participants.signature_process_id IS 'Signaturprozess – Verweis';
COMMENT ON COLUMN signature_process_participants.position IS 'Reihenfolge – bei «nacheinander»';
COMMENT ON COLUMN signature_process_participants.user_id IS 'Person – intern, sonst leer';
COMMENT ON COLUMN signature_process_participants.display_name IS 'Name – Anzeige und Signaturprotokoll';
COMMENT ON COLUMN signature_process_participants.email IS 'E-Mail – Einladung';
COMMENT ON COLUMN signature_process_participants.mobile_number IS 'Mobiltelefon – Code für FES, nur solange nötig';
COMMENT ON COLUMN signature_process_participants.participant_role IS 'Rolle – Aufgabe im Prozess';
COMMENT ON COLUMN signature_process_participants.status IS 'Status – Stand der Person';
COMMENT ON COLUMN signature_process_participants.acted_at IS 'Zeitpunkt – Unterschrift bzw. Entscheid';
COMMENT ON COLUMN signature_process_participants.decline_reason IS 'Begründung – bei Ablehnung';
COMMENT ON TABLE signature_process_fields IS 'Unterschriftsfeld je Person – Assistent Schritt 3; von Hand platziert oder aus Platzhalter «#sign#n#»';
COMMENT ON COLUMN signature_process_fields.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN signature_process_fields.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN signature_process_fields.signature_process_id IS 'Signaturprozess – Verweis';
COMMENT ON COLUMN signature_process_fields.participant_id IS 'Person – unterschreibt hier';
COMMENT ON COLUMN signature_process_fields.page_index IS 'Seite – ab 0';
COMMENT ON COLUMN signature_process_fields.x_percent IS 'Position links (%) – relativ';
COMMENT ON COLUMN signature_process_fields.y_percent IS 'Position oben (%) – relativ';
COMMENT ON COLUMN signature_process_fields.width_percent IS 'Breite (%) – relativ';
COMMENT ON COLUMN signature_process_fields.height_percent IS 'Höhe (%) – relativ';
COMMENT ON COLUMN signature_process_fields.placeholder IS 'Platzhalter – z. B. «0-1» aus «#sign#1#»';
COMMENT ON TABLE signature_process_events IS 'Signaturprotokoll eines Prozesses (unveränderlich) – geschrieben bei jedem Schritt; Teil des Ergebnisses';
COMMENT ON COLUMN signature_process_events.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN signature_process_events.event_id IS 'Ereignis-ID – eindeutig über Module und Exporte hinweg';
COMMENT ON COLUMN signature_process_events.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN signature_process_events.signature_process_id IS 'Signaturprozess – Verweis';
COMMENT ON COLUMN signature_process_events.occurred_at IS 'Zeitpunkt – wann';
COMMENT ON COLUMN signature_process_events.text IS 'Eintrag – z. B. «Lea Muster hat unterschrieben»';
COMMENT ON COLUMN signature_process_events.actor_id IS 'Person – Auslöser (ohne Constraint)';
COMMENT ON TABLE signatures IS 'Nachweis einer geleisteten Signatur – vom Signaturdienst; Prüfbericht und Signaturprotokoll';
COMMENT ON COLUMN signatures.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN signatures.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN signatures.document_id IS 'Dokument – signiertes Dokument';
COMMENT ON COLUMN signatures.participant_id IS 'Person im Prozess – Verweis';
COMMENT ON COLUMN signatures.signer_name IS 'Name – wie im Zertifikat';
COMMENT ON COLUMN signatures.signer_function IS 'Funktion – Anzeige';
COMMENT ON COLUMN signatures.signature_level IS 'Signaturstufe – rechtliche Wirkung';
COMMENT ON COLUMN signatures.jurisdiction IS 'Rechtsraum – Signaturrecht';
COMMENT ON COLUMN signatures.signed_at IS 'Zeitpunkt – Zeitstempel der Signatur';
COMMENT ON COLUMN signatures.certificate_issuer IS 'Zertifikat von – Aussteller';
COMMENT ON COLUMN signatures.validation IS 'Prüfbericht – Ergebnis des Dienstes';
COMMENT ON TABLE seals IS 'Siegel der Organisation auf einem Dokument – «Versiegeln» bzw. Schnittstelle für Module; Ergebnis «<Name>_seal.pdf»';
COMMENT ON COLUMN seals.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN seals.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN seals.document_id IS 'Dokument – versiegeltes Dokument';
COMMENT ON COLUMN seals.seal_holder IS 'Organisation – Inhaberin des Siegels';
COMMENT ON COLUMN seals.seal_level IS 'Stufe – fortgeschritten oder qualifiziert';
COMMENT ON COLUMN seals.jurisdiction IS 'Rechtsraum – Signaturrecht';
COMMENT ON COLUMN seals.is_visible IS 'Sichtbar – Siegelbild auf der letzten Seite';
COMMENT ON COLUMN seals.sealed_at IS 'Versiegelt am – Zeitstempel';
COMMENT ON COLUMN seals.sealed_by_id IS 'Ausgelöst von – Person (ohne Constraint)';
COMMENT ON TABLE signing_preferences IS 'Persönliche Standardwerte für Signaturen – «Meine Unterschrift»; Vorgabe im Assistenten';
COMMENT ON COLUMN signing_preferences.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN signing_preferences.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN signing_preferences.user_id IS 'Person – Besitzerin bzw. Besitzer';
COMMENT ON COLUMN signing_preferences.signature_level IS 'Signaturstufe – Vorgabe';
COMMENT ON COLUMN signing_preferences.jurisdiction IS 'Rechtsraum – Vorgabe';
COMMENT ON COLUMN signing_preferences.signature_image_key IS 'Unterschriftsbild – gespeichertes Bild (ohne rechtliche Wirkung, offen)';
COMMENT ON COLUMN signing_preferences.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN signing_preferences.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE signature_requests IS 'Signaturanfrage an eine Person (aus Staffing, Time, Flow, Core oder von Kolleginnen und Kollegen) – Schnittstelle für Module; Liste «Zu unterschreiben»';
COMMENT ON COLUMN signature_requests.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN signature_requests.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN signature_requests.user_id IS 'Empfängerin bzw. Empfänger – soll unterschreiben';
COMMENT ON COLUMN signature_requests.source_module IS 'Modul – Modulschlüssel, z. B. «staffing»';
COMMENT ON COLUMN signature_requests.sender_label IS 'Von – Absender (Person bzw. Rolle)';
COMMENT ON COLUMN signature_requests.title IS 'Titel – z. B. «Monatsvisum November»';
COMMENT ON COLUMN signature_requests.file_name IS 'Datei – Dateiname';
COMMENT ON COLUMN signature_requests.document_id IS 'Dokument – Kopie in der Ablage';
COMMENT ON COLUMN signature_requests.signature_process_id IS 'Signaturprozess – Verweis';
COMMENT ON COLUMN signature_requests.received_at IS 'Erhalten am – Eingang';
COMMENT ON COLUMN signature_requests.due_on IS 'Frist – Unterschrift bis';
COMMENT ON COLUMN signature_requests.signature_level IS 'Signaturstufe – verlangt';
COMMENT ON COLUMN signature_requests.jurisdiction IS 'Rechtsraum – Signaturrecht';
COMMENT ON COLUMN signature_requests.status IS 'Status – Stand der Anfrage';
COMMENT ON COLUMN signature_requests.message IS 'Nachricht – vom Absender';
COMMENT ON COLUMN signature_requests.callback_url IS 'Rückmeldung an – Adresse im Modul';
COMMENT ON COLUMN signature_requests.idempotency_key IS 'Idempotenzschlüssel – verhindert Doppelanfragen';
COMMENT ON TABLE sync_settings IS 'Einstellungen des Abgleichs einer Person – «Synchronisation»; Verbindung über EduKSX-Connect';
COMMENT ON COLUMN sync_settings.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN sync_settings.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN sync_settings.user_id IS 'Person – Besitzerin bzw. Besitzer';
COMMENT ON COLUMN sync_settings.is_active IS 'Aktiv – Abgleich eingeschaltet';
COMMENT ON COLUMN sync_settings.target_path IS 'Zielordner – Ordner in der Cloud-Ablage';
COMMENT ON COLUMN sync_settings.direction IS 'Richtung – Abgleich';
COMMENT ON COLUMN sync_settings.interval_minutes IS 'Intervall (Minuten) – Abstand';
COMMENT ON COLUMN sync_settings.conflict_rule IS 'Konfliktregel – bei Änderungen auf beiden Seiten';
COMMENT ON COLUMN sync_settings.connect_reference IS 'Verbindung – Kennung in EduKSX-Connect';
COMMENT ON COLUMN sync_settings.last_synced_at IS 'Letzter Abgleich – Zeitpunkt';
COMMENT ON COLUMN sync_settings.delta_token IS 'Änderungsstand – Token der Cloud-Ablage';
COMMENT ON COLUMN sync_settings.updated_at IS 'Geändert am – Zeitpunkt der letzten Änderung (UTC)';
COMMENT ON COLUMN sync_settings.lock_version IS 'Version – optimistisches Sperren; ETag und If-Match';
COMMENT ON TABLE sync_items IS 'Zuordnung lokales Objekt ↔ Objekt in der Cloud-Ablage – Abgleichsdienst; Ordnerabgleich und Konflikte';
COMMENT ON COLUMN sync_items.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN sync_items.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN sync_items.user_id IS 'Person – Besitzerin bzw. Besitzer';
COMMENT ON COLUMN sync_items.folder_id IS 'Ordner – lokal';
COMMENT ON COLUMN sync_items.document_id IS 'Dokument – lokal';
COMMENT ON COLUMN sync_items.cloud_item_id IS 'Cloud-ID – Objekt in der Cloud-Ablage';
COMMENT ON COLUMN sync_items.cloud_etag IS 'Cloud-Stand – ETag der Cloud';
COMMENT ON COLUMN sync_items.local_version IS 'Lokale Version – Nummer';
COMMENT ON COLUMN sync_items.status IS 'Status – Abgleich';
COMMENT ON COLUMN sync_items.synced_at IS 'Abgeglichen am – Zeitpunkt';
COMMENT ON TABLE sync_events IS 'Protokoll des Abgleichs – Abgleichsdienst; Anzeige «Protokoll» in «Synchronisation»';
COMMENT ON COLUMN sync_events.id IS 'ID – UUID v7, von der Anwendung vergeben';
COMMENT ON COLUMN sync_events.event_id IS 'Ereignis-ID – eindeutig über Module und Exporte hinweg';
COMMENT ON COLUMN sync_events.organization_id IS 'Organisation – Mandant; aus dem Token, nie aus der Eingabe';
COMMENT ON COLUMN sync_events.user_id IS 'Person – Besitzerin bzw. Besitzer';
COMMENT ON COLUMN sync_events.occurred_at IS 'Zeitpunkt – wann';
COMMENT ON COLUMN sync_events.text IS 'Eintrag – z. B. «+ Ordner Verträge»';
-- <<< kommentare
