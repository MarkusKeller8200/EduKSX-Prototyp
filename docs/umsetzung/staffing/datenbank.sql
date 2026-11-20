-- EduKSX-Staffing – Datenbankstruktur (Einsatzplanung)
-- Stand 2026-11-20 · Status ENTWURF · Grundlage: Prototyp prototypen/einsatzplanung (0.1.x)
-- Voraussetzung: core-referenz.sql (core.mandant, core.organisation, core.person, core.schuljahr)
--
-- Gespeichert wird, was der Prototyp anzeigt und bearbeitet. Berechnete Werte (VZE-Zuteilung, Ist-Pensum,
-- Saldo je Ressource, Prüfregeln) liefern die Ansichten am Ende bzw. die API; eingefroren wird nur der
-- Stand bei der Freigabe (staffing.freigabe.stand).

CREATE SCHEMA IF NOT EXISTS staffing;

-- ------------------------------------------------------------------ Parameter und Grundlagen

-- Kantonale und kommunale Parameter je Schuljahr (Weisung VZE, LPVO); ein Datensatz je Kanton/Mandant und Jahr
CREATE TABLE staffing.parameter (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id                  uuid NOT NULL REFERENCES core.mandant(id),
    schuljahr_id                uuid NOT NULL REFERENCES core.schuljahr(id),
    kanton                      char(2) NOT NULL DEFAULT 'ZH',
    stichjahr                   integer NOT NULL,
    planungsdatum               date,
    faktor_lektion              numeric(6,2) NOT NULL,      -- Stunden je Jahreslektion (LPVO § 10)
    klassenlehrperson_stunden   numeric(6,2) NOT NULL,      -- 100 h je Klasse
    pauschale_schule            numeric(6,2) NOT NULL,
    pauschale_zusammenarbeit    numeric(6,2) NOT NULL,
    pauschale_weiterbildung     numeric(6,2) NOT NULL,
    brutto_jahresarbeitszeit    numeric(7,2) NOT NULL,
    mindestpensum               numeric(5,2),
    max_pensum                  numeric(5,2),
    anteil_unterricht_min       numeric(5,2),
    klp_mindestlektionen        numeric(5,2),
    kustodie_max_stunden        numeric(6,2),
    lektionen_je_vze            numeric(6,2) NOT NULL,
    basiswert                   numeric(10,4) NOT NULL,
    korrekturfaktor             numeric(8,4) NOT NULL,
    sl_sockel                   numeric(6,2),
    sl_je_vze                   numeric(6,2),
    sl_gross_je_25              numeric(6,2),
    gestaltungspool_je_vze      numeric(6,2),
    koordination_sek_je_vze     numeric(6,2),
    therapie_max_je_100         numeric(6,2),
    daz_erstes_jahr_wl          numeric(6,2),
    daz_folgejahr_wl            numeric(6,2),
    vikariat_pool_max_wochen    numeric(5,2),
    max_klassengroesse          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"A":25,"B":25,"C":20}
    betreuungsschluessel        numeric(5,2),
    mindestbesetzung            integer,
    schulwochen                 integer,
    jahresarbeitszeit_betreuung numeric(7,2),
    quelle                      text,                       -- z. B. «Weisung VZE 2026/27»
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    UNIQUE (mandant_id, schuljahr_id)
);

-- Netto-Jahresarbeitszeit nach Alter (Ferientage)
CREATE TABLE staffing.parameter_nettoarbeitszeit (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    parameter_id    uuid NOT NULL REFERENCES staffing.parameter(id) ON DELETE CASCADE,
    bis_alter       integer NOT NULL,
    stunden         numeric(7,2) NOT NULL,
    ferientage      integer NOT NULL,
    UNIQUE (parameter_id, bis_alter)
);

-- Stellenplan-Grundlagen je Schule und Schuljahr (Eingaben für die VZE-Formel)
CREATE TABLE staffing.stellengrundlage (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    schule_id           uuid NOT NULL REFERENCES core.organisation(id),
    schuljahr_id        uuid NOT NULL REFERENCES core.schuljahr(id),
    schuelerzahl        integer NOT NULL CHECK (schuelerzahl >= 0),
    sozialindex         numeric(6,2) NOT NULL,
    daz_erstes_jahr     integer NOT NULL DEFAULT 0,
    daz_folgejahre      integer NOT NULL DEFAULT 0,
    therapie_vze        numeric(8,4) NOT NULL DEFAULT 0,
    status              text NOT NULL DEFAULT 'planung' CHECK (status IN ('planung','gemeldet','bewilligt')),
    budget_gesperrt     boolean NOT NULL DEFAULT false,      -- «Sperre» der Ressourcen durch die Schulverwaltung
    betreuung_freigegeben boolean NOT NULL DEFAULT false,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    UNIQUE (schule_id, schuljahr_id)
);

-- Koordination Sek: VZE je Person
CREATE TABLE staffing.koordination (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    stellengrundlage_id uuid NOT NULL REFERENCES staffing.stellengrundlage(id) ON DELETE CASCADE,
    person_id           uuid NOT NULL REFERENCES core.person(id),
    vze                 numeric(8,4) NOT NULL CHECK (vze >= 0)
);

-- Fächer (Kürzel wie im Lehrplan: D, E, F, Ma, NT …)
CREATE TABLE staffing.fach (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    kurz            text NOT NULL,
    name            text NOT NULL,
    aktiv           boolean NOT NULL DEFAULT true,
    UNIQUE (mandant_id, kurz)
);

-- Lektionentafel (z. B. «1. Sek», «3. Sek A») mit VZE-Gewicht
CREATE TABLE staffing.lektionentafel (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schuljahr_id    uuid NOT NULL REFERENCES core.schuljahr(id),
    code            text NOT NULL,                 -- «1», «2», «3A», «3B»
    name            text NOT NULL,
    vze             numeric(8,4) NOT NULL,
    wl_klasse       numeric(6,2) NOT NULL,          -- WL der Klasse gesamt
    pflicht         text,                           -- Pflichtlektionen (Zahl oder Spanne als Text, wie im Lehrplan)
    kommunal        numeric(6,2) NOT NULL DEFAULT 0, -- kommunale Zusatzlektionen
    UNIQUE (mandant_id, schuljahr_id, code)
);

CREATE TABLE staffing.lektionentafel_fach (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    lektionentafel_id   uuid NOT NULL REFERENCES staffing.lektionentafel(id) ON DELETE CASCADE,
    fach_id             uuid NOT NULL REFERENCES staffing.fach(id),
    wl                  numeric(6,2) NOT NULL,
    halbklassen         boolean NOT NULL DEFAULT false,
    UNIQUE (lektionentafel_id, fach_id)
);

-- ------------------------------------------------------------------ Personen und Anstellung

-- Planungsdaten einer Person je Schuljahr (Stammdaten wie Name, Kürzel, Geburtsdatum in core.person)
CREATE TABLE staffing.planungsperson (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    person_id           uuid NOT NULL REFERENCES core.person(id),
    schule_id           uuid NOT NULL REFERENCES core.organisation(id),
    schuljahr_id        uuid NOT NULL REFERENCES core.schuljahr(id),
    art                 text NOT NULL CHECK (art IN ('Lehrperson','Fachperson Sonderpädagogik','Therapie','Schulleitung','Assistenz','Betreuung','Verwaltung','Stellvertretung','Weitere')),
    anstellung          text NOT NULL DEFAULT 'kantonal' CHECK (anstellung IN ('kantonal','kommunal','weitere')),
    bg_soll             numeric(5,2),                   -- vereinbarter Beschäftigungsgrad in %
    pensum_vorjahr      numeric(5,2),
    berufseinfuehrung   boolean NOT NULL DEFAULT false,
    eintritt            date,
    austritt            date,
    bemerkung           text,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    UNIQUE (person_id, schule_id, schuljahr_id)
);

-- Unterrichtsberechtigung / Fächer einer Person
CREATE TABLE staffing.person_fach (
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    planungsperson_id   uuid NOT NULL REFERENCES staffing.planungsperson(id) ON DELETE CASCADE,
    fach_id             uuid NOT NULL REFERENCES staffing.fach(id),
    PRIMARY KEY (planungsperson_id, fach_id)
);

-- ------------------------------------------------------------------ Klassen und Unterricht

CREATE TABLE staffing.klasse (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    schule_id           uuid NOT NULL REFERENCES core.organisation(id),
    schuljahr_id        uuid NOT NULL REFERENCES core.schuljahr(id),
    kurz                text NOT NULL,                  -- «1A»
    jahrgang            integer NOT NULL,
    abteilung           text,                           -- A, B, C
    lektionentafel_id   uuid NOT NULL REFERENCES staffing.lektionentafel(id),
    schuelerzahl        integer NOT NULL DEFAULT 0 CHECK (schuelerzahl >= 0),
    name_vorjahr        text,
    bemerkung           text,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    UNIQUE (schule_id, schuljahr_id, kurz)
);

-- Klassenlehrpersonen mit frei aufteilbarem Stundenanteil (100 h je Klasse)
CREATE TABLE staffing.klassenlehrperson (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    klasse_id           uuid NOT NULL REFERENCES staffing.klasse(id) ON DELETE CASCADE,
    planungsperson_id   uuid NOT NULL REFERENCES staffing.planungsperson(id),
    stunden             numeric(6,2),                   -- NULL = gleichmässig aufteilen
    UNIQUE (klasse_id, planungsperson_id)
);

-- Ressourcentypen mit Budget (VZE Berufsauftrag, Gestaltungspool, kommunal, DaZ, Assistenz, SL, Betreuung …)
CREATE TABLE staffing.ressource (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    schule_id           uuid NOT NULL REFERENCES core.organisation(id),
    schuljahr_id        uuid NOT NULL REFERENCES core.schuljahr(id),
    code                text NOT NULL,                  -- ba, pool, kommunal, daz, assistenz, sl, betreuung, kommAnst
    name                text NOT NULL,
    einheit             text NOT NULL CHECK (einheit IN ('WL','%','WStd','h','VZE')),
    berechnet           boolean NOT NULL DEFAULT false, -- Budget aus Formel statt Eingabe
    kantonal            boolean NOT NULL DEFAULT false,
    budget              numeric(10,2),                  -- nur wenn nicht berechnet
    UNIQUE (schule_id, schuljahr_id, code)
);

-- Unterrichts- und Einsatzgefäss: Klassenlektion, weitere Lektion, Sonderpädagogik oder Anstellung
CREATE TABLE staffing.einsatz (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    schule_id           uuid NOT NULL REFERENCES core.organisation(id),
    schuljahr_id        uuid NOT NULL REFERENCES core.schuljahr(id),
    gruppe              text NOT NULL CHECK (gruppe IN ('klasse','weitere','sp','anstellung')),
    kategorie           text,                           -- Wahlfach, Freifach, Kurs, Niveauunterricht, Begabungsförderung, Betreuung …
    name                text,                           -- frei bei weiteren Lektionen/Anstellungen
    klasse_id           uuid REFERENCES staffing.klasse(id) ON DELETE CASCADE,
    fach_id             uuid REFERENCES staffing.fach(id),
    stufe               text,
    einheit             text NOT NULL DEFAULT 'WL' CHECK (einheit IN ('WL','%','WStd')),
    wl_sus              numeric(6,2),                   -- WL der Schüler/innen
    wl_lp               numeric(6,2),                   -- Soll der Lehrpersonen-Lektionen bzw. Stellen-% / Wochenstunden; NULL = aus wl_sus
    halbklassen         boolean NOT NULL DEFAULT false,
    semester_1          boolean NOT NULL DEFAULT true,
    semester_2          boolean NOT NULL DEFAULT true,
    faktor              numeric(6,2),                   -- abweichender Faktor (LPVO § 10 Abs. 1), NULL = Standard
    zusatz              boolean NOT NULL DEFAULT false, -- zusätzlich zur Lektionentafel (IF, DaZ, Teamteaching)
    ressource_id        uuid NOT NULL REFERENCES staffing.ressource(id),
    bemerkung           text,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    CHECK (gruppe <> 'klasse' OR klasse_id IS NOT NULL),
    CHECK (semester_1 OR semester_2)
);
CREATE INDEX ON staffing.einsatz (schule_id, schuljahr_id, gruppe);

-- Zuteilung eines Einsatzes an eine oder mehrere Personen
CREATE TABLE staffing.zuteilung (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    einsatz_id          uuid NOT NULL REFERENCES staffing.einsatz(id) ON DELETE CASCADE,
    planungsperson_id   uuid NOT NULL REFERENCES staffing.planungsperson(id),
    menge               numeric(6,2) NOT NULL CHECK (menge >= 0),  -- in der Einheit des Einsatzes
    UNIQUE (einsatz_id, planungsperson_id)
);

-- ------------------------------------------------------------------ Berufsauftrag

-- Gefäss des Berufsauftrags (Konferenzen, Ämter, Kustodien, Weiterbildung …)
CREATE TABLE staffing.gefaess (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    schule_id           uuid NOT NULL REFERENCES core.organisation(id),
    schuljahr_id        uuid NOT NULL REFERENCES core.schuljahr(id),
    name                text NOT NULL,
    kurz                text,
    bereich             text NOT NULL CHECK (bereich IN ('Unterricht','Schule','Zusammenarbeit','Weiterbildung','Flex')),
    art                 text NOT NULL CHECK (art IN ('pauschal','zusatz')),      -- aus Pauschale oder zusätzlich
    regel               text NOT NULL CHECK (regel IN ('fix','linear')),
    stunden             numeric(7,2),                  -- fix: Stunden je Person
    sockel              numeric(7,2),                  -- linear: Sockel
    sockel_bis          numeric(6,2),                  -- linear: bis WL
    gesamt_ab           numeric(6,2),                  -- linear: volle Stunden ab WL
    max                 numeric(7,2),
    anzahl              integer,                       -- Anzahl Sitzungen
    praesenz            numeric(6,2),                  -- Stunden je Sitzung
    vorbereitung        numeric(6,2),
    amt                 boolean NOT NULL DEFAULT false,
    kustodie            boolean NOT NULL DEFAULT false,
    entschaedigt        boolean NOT NULL DEFAULT false,
    soll                numeric(7,2),                  -- Stunden-Soll bei Ämtern/Kustodien
    ressource_id        uuid REFERENCES staffing.ressource(id),
    beschreibung        text,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1
);

CREATE TABLE staffing.gefaess_teilnahme (
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    gefaess_id          uuid NOT NULL REFERENCES staffing.gefaess(id) ON DELETE CASCADE,
    planungsperson_id   uuid NOT NULL REFERENCES staffing.planungsperson(id),
    stunden_abweichend  numeric(7,2),                  -- Entlastung / individuelle Stunden
    PRIMARY KEY (gefaess_id, planungsperson_id)
);

-- ------------------------------------------------------------------ Freigabe und Anstellung

-- Freigabe je Person: Stand bei der Freigabe wird eingefroren, damit Änderungen danach erkannt werden
CREATE TABLE staffing.freigabe (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    planungsperson_id   uuid NOT NULL REFERENCES staffing.planungsperson(id),
    status              text NOT NULL DEFAULT 'freigegeben' CHECK (status IN ('freigegeben','angestellt','erledigt','zurueckgezogen')),
    stand               jsonb NOT NULL,                -- {"wl":..,"stunden":..,"bgIst":..,"posten":[".."]}
    freigegeben_am      timestamptz NOT NULL DEFAULT now(),
    freigegeben_von     uuid NOT NULL,
    angestellt_am       timestamptz,
    angestellt_von      uuid,
    bemerkung           text,
    aenderung_sv        text,                          -- Rückmeldung der Schulverwaltung
    version integer NOT NULL DEFAULT 1
);
CREATE INDEX ON staffing.freigabe (planungsperson_id, freigegeben_am DESC);

-- Verlauf (Protokoll) aller planungsrelevanten Aktionen
CREATE TABLE staffing.verlauf (
    id              bigserial PRIMARY KEY,
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schule_id       uuid REFERENCES core.organisation(id),
    zeit            timestamptz NOT NULL DEFAULT now(),
    benutzer_id     uuid,
    rolle           text NOT NULL,
    text            text NOT NULL,
    bezug_tabelle   text,
    bezug_id        uuid
);

-- ------------------------------------------------------------------ Pensenumfrage

CREATE TABLE staffing.umfrage (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    planungsperson_id   uuid NOT NULL REFERENCES staffing.planungsperson(id),
    status              text NOT NULL DEFAULT 'eingeladen' CHECK (status IN ('eingeladen','in Bearbeitung','eingereicht','übernommen')),
    weiter              text CHECK (weiter IN ('ja','nein','offen')),
    wunsch_prozent      numeric(5,2),
    wunsch_wl           numeric(6,2),
    stufen              text,
    faecher             text,
    klp                 text CHECK (klp IN ('ja','nein','egal')),
    wuensche            text,
    sperrzeiten         text,
    frei                text,
    bemerkung           text,
    eingeladen_am       timestamptz,
    erinnert_am         timestamptz,
    eingereicht_am      timestamptz,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    UNIQUE (planungsperson_id)
);

-- ------------------------------------------------------------------ Stellvertretungen und Mutationen

CREATE TABLE staffing.ausfall (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    planungsperson_id   uuid NOT NULL REFERENCES staffing.planungsperson(id),
    grund               text NOT NULL CHECK (grund IN ('Krankheit','Unfall','Weiterbildung','Mutterschaft','Urlaub','Militär/Zivildienst','Andere')),
    von                 date NOT NULL,
    bis                 date NOT NULL,
    wl                  numeric(6,2) NOT NULL,
    vertretung_id       uuid REFERENCES staffing.planungsperson(id),
    finanzierung        text NOT NULL,                 -- «Kurzvikariat (ausserhalb Berufsauftrag)», «Gestaltungspool» …
    status              text NOT NULL DEFAULT 'erfasst' CHECK (status IN ('erfasst','geplant','an Kanton gemeldet','abgeschlossen')),
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    CHECK (bis >= von)
);

-- Rapport der gehaltenen Vikariatslektionen
CREATE TABLE staffing.ausfall_rapport (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    ausfall_id      uuid NOT NULL REFERENCES staffing.ausfall(id) ON DELETE CASCADE,
    datum           date NOT NULL,
    lektionen       numeric(4,1) NOT NULL CHECK (lektionen >= 0),
    UNIQUE (ausfall_id, datum)
);

-- Mutation während des Schuljahrs (Teamteaching, Klassenteilung …)
CREATE TABLE staffing.mutation (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    klasse_id           uuid REFERENCES staffing.klasse(id),
    was                 text NOT NULL,
    warum               text NOT NULL,
    lektionen           numeric(6,2) NOT NULL,
    finanzierung        text NOT NULL,
    planungsperson_id   uuid REFERENCES staffing.planungsperson(id),
    start               date NOT NULL,
    status              text NOT NULL DEFAULT 'erfasst' CHECK (status IN ('erfasst','beantragt','bewilligt','abgelehnt')),
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------------ Gespräche und Personaldossier

CREATE TABLE staffing.gespraech (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    person_id           uuid NOT NULL REFERENCES core.person(id),
    art                 text NOT NULL,                 -- Probezeitgespräch, Mitarbeitendenbeurteilung, Unterrichtsbesuch …
    datum               date NOT NULL,
    status              text NOT NULL DEFAULT 'geplant' CHECK (status IN ('geplant','Formular vorbereitet','durchgeführt','dokumentiert')),
    freigegeben         boolean NOT NULL DEFAULT false, -- für die betroffene Person einsehbar
    leitung_id          uuid REFERENCES core.person(id),
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1
);

CREATE TABLE staffing.dossierkategorie (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    nr              integer NOT NULL,
    name            text NOT NULL,
    aufbewahrung_jahre integer,                         -- ZU PRÜFEN je Kategorie (Archivgesetz)
    UNIQUE (mandant_id, nr)
);

CREATE TABLE staffing.dossiervorlage (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    titel               text NOT NULL,
    dossierkategorie_id uuid NOT NULL REFERENCES staffing.dossierkategorie(id)
);

-- Eintrag im Personaldossier; Dateien liegen in der Dokumentablage (z. B. EduKSX-Sign), hier nur der Verweis
CREATE TABLE staffing.dossiereintrag (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    person_id           uuid NOT NULL REFERENCES core.person(id),
    dossierkategorie_id uuid NOT NULL REFERENCES staffing.dossierkategorie(id),
    titel               text NOT NULL,
    datum               date NOT NULL,
    notiz               text,
    dokument_ref        text,                          -- URI des Dokuments (Ablage/Sign)
    gespraech_id        uuid REFERENCES staffing.gespraech(id),
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1
);
CREATE INDEX ON staffing.dossiereintrag (person_id, datum DESC);

-- ------------------------------------------------------------------ Tagesstrukturen und Termine

CREATE TABLE staffing.betreuungsangebot (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schule_id       uuid NOT NULL REFERENCES core.organisation(id),
    schuljahr_id    uuid NOT NULL REFERENCES core.schuljahr(id),
    name            text NOT NULL,                     -- Mittagstisch, Aufgabenbetreuung …
    wochentag       smallint NOT NULL CHECK (wochentag BETWEEN 1 AND 7),   -- 1 = Montag
    von             time NOT NULL,
    bis             time NOT NULL,
    kinder          integer NOT NULL DEFAULT 0,        -- angemeldete Kinder
    CHECK (bis > von)
);

-- Jahresablauf mit Fristen (Stichtag Schülerzahlen, Meldung VZE …)
CREATE TABLE staffing.termin (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id      uuid NOT NULL REFERENCES core.mandant(id),
    schuljahr_id    uuid NOT NULL REFERENCES core.schuljahr(id),
    datum           date NOT NULL,
    titel           text NOT NULL,
    wer             text NOT NULL,                     -- zuständige Rolle
    flow_ereignis   text                               -- Verweis auf ein Ereignis im Jahreskalender von EduKSX-Flow
);

-- ------------------------------------------------------------------ Ansichten (berechnet, nicht gespeichert)

-- Zugeteilte Menge je Person und Einheit (Grundlage Ist-Pensum, «Personen und Pensen»)
CREATE VIEW staffing.v_zuteilung_person AS
SELECT z.mandant_id, e.schule_id, e.schuljahr_id, z.planungsperson_id, e.einheit,
       sum(z.menge * (CASE WHEN e.semester_1 AND e.semester_2 THEN 1 ELSE 0.5 END)) AS menge_jahr
FROM staffing.zuteilung z JOIN staffing.einsatz e ON e.id = z.einsatz_id
GROUP BY z.mandant_id, e.schule_id, e.schuljahr_id, z.planungsperson_id, e.einheit;

-- Verplant je Ressource (Grundlage «Ressourcen»: Budget, Verplant, Saldo)
CREATE VIEW staffing.v_ressource_verbrauch AS
SELECT r.id AS ressource_id, r.mandant_id, r.schule_id, r.schuljahr_id, r.code, r.einheit, r.budget,
       coalesce(sum(z.menge * (CASE WHEN e.semester_1 AND e.semester_2 THEN 1 ELSE 0.5 END)), 0) AS verplant
FROM staffing.ressource r
LEFT JOIN staffing.einsatz e ON e.ressource_id = r.id
LEFT JOIN staffing.zuteilung z ON z.einsatz_id = e.id
GROUP BY r.id;

-- Offene Lektionen je Einsatz (Soll minus zugeteilt), z. B. «Stelle noch offen»
CREATE VIEW staffing.v_einsatz_offen AS
SELECT e.id AS einsatz_id, e.mandant_id, e.schule_id, e.schuljahr_id,
       coalesce(e.wl_lp, e.wl_sus * CASE WHEN e.halbklassen THEN 2 ELSE 1 END) AS soll,
       coalesce(sum(z.menge), 0) AS zugeteilt
FROM staffing.einsatz e LEFT JOIN staffing.zuteilung z ON z.einsatz_id = e.id
GROUP BY e.id;
