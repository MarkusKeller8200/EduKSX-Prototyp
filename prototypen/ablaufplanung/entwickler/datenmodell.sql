-- EduKSX-Flow – Datenmodell (Entwurf), direkt ausführbar: zuerst Core-Platzhalter, dann das Modul
-- Quelle: docs/umsetzung/core-referenz.sql und docs/umsetzung/flow/datenbank.sql

-- EduKSX – Core-Referenz (PLATZHALTER)
-- Stand 2026-11-20 · Status ENTWURF
--
-- Legt die Core-Tabellen an, auf die alle Modulschemas verweisen, damit jedes Modulskript für sich
-- ausführbar und prüfbar ist. Massgeblich ist das Datenmodell von EduKSX-Core; dieses Skript wird dort
-- NICHT übernommen. Personendaten liegen nur hier (einmal für alle Module).

CREATE SCHEMA IF NOT EXISTS core;

-- Mandant = Schulträger (Schulgemeinde, politische Gemeinde mit Schule, Zweckverband)
CREATE TABLE IF NOT EXISTS core.mandant (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    kurz            text NOT NULL UNIQUE,
    kanton          char(2) NOT NULL DEFAULT 'ZH',
    erstellt_am     timestamptz NOT NULL DEFAULT now()
);

-- Organisationseinheit innerhalb eines Mandanten: Schule, Schuleinheit, Verwaltung, Tagesstruktur, Behörde
CREATE TABLE IF NOT EXISTS core.organisation (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    eltern_id       uuid REFERENCES core.organisation(id),
    art             text NOT NULL CHECK (art IN ('schulgemeinde','schule','schuleinheit','verwaltung','tagesstruktur','behoerde','kommission','extern')),
    name            text NOT NULL,
    kurz            text,
    erstellt_am     timestamptz NOT NULL DEFAULT now()
);

-- Person (Mitarbeitende, Behördenmitglieder, externe Unterzeichnende); Verschlüsselung OFFEN
CREATE TABLE IF NOT EXISTS core.person (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    name            text NOT NULL,
    vorname         text,
    kuerzel         text,
    geburtsdatum    date,
    mail            text,
    telefon         text,
    funktion        text,
    extern          boolean NOT NULL DEFAULT false,
    erstellt_am     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (mandant_id, kuerzel)
);

-- Benutzer:in (Anmeldung über EduKSX-Ident); verknüpft die Anmeldung mit der Person
CREATE TABLE IF NOT EXISTS core.benutzer (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    person_id       uuid REFERENCES core.person(id),
    ident_sub       text NOT NULL UNIQUE,      -- «sub» aus dem Token von EduKSX-Ident
    aktiv           boolean NOT NULL DEFAULT true,
    erstellt_am     timestamptz NOT NULL DEFAULT now()
);

-- Rolle einer Person in einer Organisation (Schulleitung, Schulverwaltung, Ressortvorstand …)
CREATE TABLE IF NOT EXISTS core.rollenzuweisung (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    person_id       uuid NOT NULL REFERENCES core.person(id),
    organisation_id uuid REFERENCES core.organisation(id),
    rolle           text NOT NULL,             -- Schlüssel, z. B. SL, SV, SPF, RV, LP, ICT
    gueltig_von     date,
    gueltig_bis     date
);

-- Schuljahr mit Semestern, Trimestern und Ferien (von Staffing, Flow und Time gemeinsam benutzt)
CREATE TABLE IF NOT EXISTS core.schuljahr (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    name                text NOT NULL,          -- «2026/27»
    beginn              date NOT NULL,
    ende                date NOT NULL,
    wechsel             date,                   -- Schuljahreswechsel (Stichtag)
    semesterende_1      date,
    semesterwechsel     date,
    trimester_2         date,
    trimester_3         date,
    UNIQUE (mandant_id, name),
    CHECK (ende > beginn)
);

CREATE TABLE IF NOT EXISTS core.ferien (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schuljahr_id    uuid NOT NULL REFERENCES core.schuljahr(id) ON DELETE CASCADE,
    name            text NOT NULL,
    von             date NOT NULL,
    bis             date NOT NULL,
    art             text NOT NULL DEFAULT 'ferien' CHECK (art IN ('ferien','feiertag','brueckentag','weiterbildung','frei')),
    CHECK (bis >= von)
);

-- EduKSX-Flow – Datenbankstruktur (Ablaufplanung / Termine und ToDo)
-- Stand 2026-11-20 · Status ENTWURF · Grundlage: Prototyp prototypen/ablaufplanung (0.5.x)
-- Voraussetzung: core-referenz.sql (core.mandant, core.person, core.schuljahr, core.ferien)
--
-- Inhalt: Rollen und Funktionendiagramm, Vorgangsregister der Module, Ablaufvorlagen (versioniert) mit
-- Schritten, laufende Abläufe als Kopie der Vorlage, Aufgaben, Aufrufprotokoll, Hinweise sowie der
-- Jahreskalender mit Zeitregeln, Schuljahren/Ferien (Core) und Erledigt-Vermerken je Vorkommen.
-- Fristen, «bereit»-Status und Kalendervorkommen werden berechnet (Motor), nicht gespeichert – ausser dem
-- Zustand je Schritt eines laufenden Ablaufs.

CREATE SCHEMA IF NOT EXISTS flow;

-- ------------------------------------------------------------------ Rollen, Funktionendiagramm, Quellen

-- Rollen der Abläufe (SPF, RV, SL, SV, HD, ICT, LP …) und des Jahreskalenders (LB, PICTS, TICTS, ISV …)
CREATE TABLE flow.rolle (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    kurz            text NOT NULL,
    name            text NOT NULL,
    bereich         text NOT NULL DEFAULT 'ablauf' CHECK (bereich IN ('ablauf','kalender','beide')),
    UNIQUE (mandant_id, kurz)
);

-- Zuordnung Ablaufrolle → Kalenderrollen (KAL_ZUORDNUNG)
CREATE TABLE flow.rolle_zuordnung (
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    rolle_id            uuid NOT NULL REFERENCES flow.rolle(id) ON DELETE CASCADE,
    kalenderrolle_id    uuid NOT NULL REFERENCES flow.rolle(id) ON DELETE CASCADE,
    PRIMARY KEY (rolle_id, kalenderrolle_id)
);

-- Funktionendiagramm (Nummer, Aufgabe, Kompetenz je Rolle: V, E, A, M, I …)
CREATE TABLE flow.funktion (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    nr              text NOT NULL,                       -- «5.2.2»
    titel           text NOT NULL,
    UNIQUE (mandant_id, nr)
);

CREATE TABLE flow.funktion_rolle (
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    funktion_id     uuid NOT NULL REFERENCES flow.funktion(id) ON DELETE CASCADE,
    rolle_id        uuid NOT NULL REFERENCES flow.rolle(id),
    kompetenz       text NOT NULL,                       -- V (verantwortlich), E (entscheidet), I (informiert) …
    PRIMARY KEY (funktion_id, rolle_id)
);

-- Quellenverzeichnis (Gesetze, Merkblätter, Prozessliste …); bei jedem Schritt Pflicht
CREATE TABLE flow.quelle (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    kurz            text NOT NULL,                       -- «LPVO», «VSA Vikariat», «Prozessliste»
    titel           text NOT NULL,
    url             text,
    codex_ref       text,                                -- Verweis auf den Erlass in EduKSX-Codex
    UNIQUE (mandant_id, kurz)
);

-- ------------------------------------------------------------------ Vorgangsregister der Module

-- Modul, das Vorgänge anbietet (core, ident, staffing, time, sign …)
CREATE TABLE flow.modul (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schluessel      text NOT NULL,
    name            text NOT NULL,
    aufgabe         text,
    endpunkt        text,                                -- Basis-URL der API des Moduls
    erreichbar      boolean NOT NULL DEFAULT true,       -- letzter Gesundheitsstatus
    geprueft_am     timestamptz,
    UNIQUE (mandant_id, schluessel)
);

-- Vorgang eines Moduls mit Parametern und Ergebnissen («ident.konto.anlegen» → benutzername)
CREATE TABLE flow.vorgang (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    modul_id        uuid NOT NULL REFERENCES flow.modul(id) ON DELETE CASCADE,
    schluessel      text NOT NULL,                       -- «core.dossier.eroeffnen»
    titel           text NOT NULL,
    parameter       text[] NOT NULL DEFAULT '{}',
    ergebnis        text[] NOT NULL DEFAULT '{}',
    art             text NOT NULL DEFAULT 'sofort' CHECK (art IN ('sofort','rueckmeldung')),
    aktiv           boolean NOT NULL DEFAULT true,
    UNIQUE (mandant_id, schluessel)
);

-- ------------------------------------------------------------------ Ablaufvorlagen

-- Vorlage; jede Änderung nach der Freigabe erzeugt eine neue Version (laufende Abläufe behalten ihre Kopie)
CREATE TABLE flow.vorlage (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    code            text NOT NULL,                       -- fachliche ID, z. B. «EIN-LP»
    version         integer NOT NULL DEFAULT 1,
    titel           text NOT NULL,
    gruppe          text NOT NULL DEFAULT 'Weitere',     -- Personal (kantonal), Gemeindeversammlung, ICT …
    status          text NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf','freigegeben','archiviert')),
    stichtag_name   text NOT NULL,                       -- Bezeichnung des Stichtags («Eintrittsdatum»)
    beschreibung    text,
    freigegeben_am  timestamptz,
    freigegeben_von uuid,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    UNIQUE (mandant_id, code, version)
);

-- Eingabefeld beim Start (person, funktion, pensum, stichtag …)
CREATE TABLE flow.vorlage_feld (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    vorlage_id      uuid NOT NULL REFERENCES flow.vorlage(id) ON DELETE CASCADE,
    reihenfolge     integer NOT NULL,
    schluessel      text NOT NULL,
    label           text NOT NULL,
    typ             text NOT NULL CHECK (typ IN ('text','zahl','datum','auswahl','person')),
    optionen        text[],                              -- bei «auswahl»
    pflicht         boolean NOT NULL DEFAULT true,
    UNIQUE (vorlage_id, schluessel)
);

-- Schritt einer Vorlage
CREATE TABLE flow.vorlage_schritt (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    vorlage_id      uuid NOT NULL REFERENCES flow.vorlage(id) ON DELETE CASCADE,
    code            text NOT NULL,                       -- «o1»
    reihenfolge     integer NOT NULL,
    titel           text NOT NULL,
    rolle_id        uuid NOT NULL REFERENCES flow.rolle(id),
    tage            integer NOT NULL DEFAULT 0,          -- Frist relativ zum Stichtag (negativ = vorher)
    vorgang_id      uuid REFERENCES flow.vorgang(id),    -- NULL = Aufgabe ohne Modulaufruf
    parameter       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Werte mit Platzhaltern «{person}», «{o3.benutzername}»
    automatisch     boolean NOT NULL DEFAULT false,      -- ohne Bestätigung ausführen
    bedingung       jsonb,                               -- {"feld":"funktion","op":"in","wert":"…"}
    funktion_id     uuid REFERENCES flow.funktion(id),   -- Nummer im Funktionendiagramm
    quelle_id       uuid REFERENCES flow.quelle(id),
    quelle_stelle   text,                                -- «§ 12 Abs. 2», Seite …
    UNIQUE (vorlage_id, code),
    CHECK (quelle_id IS NOT NULL OR quelle_stelle IS NOT NULL)   -- Quellenangabe bei jedem Schritt (BESCHLOSSEN)
);

-- Vorgänger eines Schritts («nach»)
CREATE TABLE flow.vorlage_schritt_nach (
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schritt_id      uuid NOT NULL REFERENCES flow.vorlage_schritt(id) ON DELETE CASCADE,
    vorgaenger_id   uuid NOT NULL REFERENCES flow.vorlage_schritt(id) ON DELETE CASCADE,
    PRIMARY KEY (schritt_id, vorgaenger_id),
    CHECK (schritt_id <> vorgaenger_id)
);

-- Zu informierende Rollen eines Schritts
CREATE TABLE flow.vorlage_schritt_informiert (
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schritt_id      uuid NOT NULL REFERENCES flow.vorlage_schritt(id) ON DELETE CASCADE,
    rolle_id        uuid NOT NULL REFERENCES flow.rolle(id),
    PRIMARY KEY (schritt_id, rolle_id)
);

-- ------------------------------------------------------------------ Laufende Abläufe

-- Ablauf = Kopie einer Vorlage in der Version beim Start
CREATE TABLE flow.lauf (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    nummer          text NOT NULL,                       -- «L001»
    vorlage_id      uuid NOT NULL REFERENCES flow.vorlage(id),
    vorlage_version integer NOT NULL,
    titel           text NOT NULL,
    stichtag_name   text NOT NULL,
    stichtag        date NOT NULL,
    kontext         jsonb NOT NULL,                      -- Eingaben beim Start: {"person":"…","funktion":"…","pensum":80}
    person_id       uuid REFERENCES core.person(id),     -- betroffene Person, falls vorhanden
    status          text NOT NULL DEFAULT 'laeuft' CHECK (status IN ('laeuft','abgeschlossen','abgebrochen')),
    gestartet_am    date NOT NULL DEFAULT current_date,
    gestartet_von   uuid,
    abgeschlossen_am date,
    ausloeser       text,                                -- «manuell», «staffing.pensumFreigegeben», «kalender:k001»
    UNIQUE (mandant_id, nummer)
);
CREATE INDEX ON flow.lauf (mandant_id, status);

-- Schritt eines laufenden Ablaufs (Kopie aus der Vorlage plus Zustand)
CREATE TABLE flow.lauf_schritt (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    lauf_id         uuid NOT NULL REFERENCES flow.lauf(id) ON DELETE CASCADE,
    code            text NOT NULL,
    reihenfolge     integer NOT NULL,
    titel           text NOT NULL,
    rolle_kurz      text NOT NULL,
    zustaendig_id   uuid REFERENCES core.person(id),     -- konkrete Person, wenn zugewiesen
    tage            integer NOT NULL,
    frist           date NOT NULL,                       -- Stichtag + tage (beim Start berechnet, änderbar)
    vorgaenger      text[] NOT NULL DEFAULT '{}',        -- Codes der Vorgänger
    informiert      text[] NOT NULL DEFAULT '{}',
    vorgang         text,                                -- Schlüssel des Vorgangs
    parameter_vorlage jsonb NOT NULL DEFAULT '{}'::jsonb,
    parameter       jsonb,                               -- aufgelöste Parameter beim Aufruf
    automatisch     boolean NOT NULL DEFAULT false,
    bedingung       jsonb,
    funktion_nr     text,
    quelle          text NOT NULL,
    status          text NOT NULL DEFAULT 'wartet' CHECK (status IN ('wartet','bereit','geplant','laeuft','erledigt','uebersprungen','fehler')),
    ergebnis        jsonb,                               -- Rückgabe des Moduls, für Platzhalter späterer Schritte
    erledigt_am     date,
    erledigt_von    uuid,
    bemerkung       text,
    UNIQUE (lauf_id, code)
);
CREATE INDEX ON flow.lauf_schritt (mandant_id, status, frist);

-- Aufrufprotokoll: jeder Aufruf an ein Modul mit aufgelösten Parametern und Antwort
CREATE TABLE flow.aufruf (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    nummer          text NOT NULL,                       -- «A0001»
    zeit            timestamptz NOT NULL DEFAULT now(),
    lauf_id         uuid NOT NULL REFERENCES flow.lauf(id),
    lauf_schritt_id uuid NOT NULL REFERENCES flow.lauf_schritt(id),
    vorgang         text NOT NULL,
    parameter       jsonb NOT NULL,
    status          text NOT NULL CHECK (status IN ('ok','fehler','ausstehend','wiederholt')),
    antwort         jsonb,
    dauer_ms        integer,
    ausgeloest_von  uuid,                                -- NULL = automatisch
    UNIQUE (mandant_id, nummer)
);

-- Hinweise an Rollen («Ablauf gestartet», «Aufruf fehlgeschlagen»)
CREATE TABLE flow.hinweis (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    rolle_kurz      text NOT NULL,
    datum           date NOT NULL DEFAULT current_date,
    lauf_id         uuid REFERENCES flow.lauf(id) ON DELETE CASCADE,
    text            text NOT NULL,
    gelesen_von     uuid[] NOT NULL DEFAULT '{}'
);

-- ------------------------------------------------------------------ Jahreskalender

-- Themenbereich (budget, beschaffung, ma, sus, sjw, apps, wb, ds, qual, komm, digi, betrieb)
CREATE TABLE flow.kalender_bereich (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schluessel      text NOT NULL,
    name            text NOT NULL,
    farbe           text,
    UNIQUE (mandant_id, schluessel)
);

-- Ereignis mit Zeitregel. Zeitregel als JSON, Aufbau je «regel»:
--   (ohne regel)    {"q":1} | {"kw":12} | {"am":"03-15"} | {"von":"09-01","bis":"09-15"}   jährlich
--   stichtag        {"regel":"stichtag","anker":"schuljahresende","versatz":-30,"einheit":"tage|wochen|monate"}
--   trimester|semester|quartal {"regel":"semester","bezug":"beginn|ende|ganz","versatz":5}
--   monatlich       {"regel":"monatlich","tag":1|"letzter"}
--   woechentlich    {"regel":"woechentlich","wochentag":1}
--   taeglich | wochentage | wochenende | arbeitstage | schultage   {"regel":"…"}
--   Ferienanker     {"regel":"stichtag","anker":"sommerferien",…}
CREATE TABLE flow.kalender_ereignis (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    code            text NOT NULL,                       -- «k001»
    titel           text NOT NULL,
    bereich_id      uuid REFERENCES flow.kalender_bereich(id),
    zeit            jsonb NOT NULL,
    nur_jahr        integer,                             -- nur in diesem Jahr, sonst wiederkehrend
    ferienregel     text CHECK (ferienregel IN ('vorher','nachher','auslassen')),   -- Einzeltermin auf Nicht-Schultag
    quelle_id       uuid REFERENCES flow.quelle(id),
    vorlage_code    text,                                -- verknüpfte Ablaufvorlage (Start aus dem Kalender)
    notiz           text,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    UNIQUE (mandant_id, code)
);

-- Beteiligung je Kalenderrolle (E, M, V, E/V …)
CREATE TABLE flow.kalender_ereignis_rolle (
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    ereignis_id     uuid NOT NULL REFERENCES flow.kalender_ereignis(id) ON DELETE CASCADE,
    rolle_id        uuid NOT NULL REFERENCES flow.rolle(id),
    beteiligung     text NOT NULL,
    PRIMARY KEY (ereignis_id, rolle_id)
);

-- Teilaufgaben (Checkliste) eines Ereignisses
CREATE TABLE flow.kalender_teil (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    ereignis_id     uuid NOT NULL REFERENCES flow.kalender_ereignis(id) ON DELETE CASCADE,
    nr              integer NOT NULL,
    titel           text NOT NULL,
    UNIQUE (ereignis_id, nr)
);

-- Erledigt-Vermerk je Vorkommen (Schlüssel = Ereignis + Datum des Vorkommens, optional Teilaufgabe)
CREATE TABLE flow.kalender_erledigt (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    ereignis_id     uuid NOT NULL REFERENCES flow.kalender_ereignis(id) ON DELETE CASCADE,
    vorkommen       date NOT NULL,
    teil_nr         integer,
    erledigt_am     date NOT NULL DEFAULT current_date,
    erledigt_von    uuid,
    lauf_id         uuid REFERENCES flow.lauf(id),       -- falls aus dem Vorkommen ein Ablauf gestartet wurde
    UNIQUE NULLS NOT DISTINCT (ereignis_id, vorkommen, teil_nr)
);
