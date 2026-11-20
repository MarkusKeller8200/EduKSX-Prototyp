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
