-- EduKSX-Time – Datenbankstruktur (Zeiterfassung / Stempeln)
-- Stand 2026-11-20 · Status ENTWURF · Grundlage: Prototyp prototypen/zeiterfassung (0.3.x)
-- Voraussetzung: core-referenz.sql (core.mandant, core.person, core.schuljahr, core.ferien)
--
-- Schritt 1 (im Prototyp): Buchungen Kommen/Pause/Gehen mit Buchungsart, Soll aus Pensum, Ist/Saldo,
-- gesetzliche Pause, Rückgängig, Nachtragen, Offline-Erfassung mit späterer Übertragung.
-- Ausbau (im Prototyp unter «Folgt»): Abwesenheiten, Korrekturen, Monatsabschluss mit Visum.
-- Ist, Saldo und gesetzliche Pause werden berechnet (Funktion/Ansicht), Monatswerte beim Abschluss eingefroren.

CREATE SCHEMA IF NOT EXISTS time;

-- ------------------------------------------------------------------ Regeln und Arbeitsmodell

-- Arbeitszeitregeln je Mandant (gültig ab)
CREATE TABLE time.regel (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    gueltig_ab              date NOT NULL,
    soll_100_min            integer NOT NULL DEFAULT 504,      -- 8:24 je Arbeitstag bei 100 % (42-h-Woche)
    pause_ab_min            integer NOT NULL DEFAULT 300,      -- gesetzliche Pause nach 5 h (ZU PRÜFEN, ArG Art. 15)
    pause_dauer_min         integer NOT NULL DEFAULT 30,
    pause_stufen            jsonb,                             -- Alternative nach ArG: [{"ab":330,"min":15},{"ab":420,"min":30},{"ab":540,"min":60}]
    rueckgaengig_sek        integer NOT NULL DEFAULT 120,      -- letzte Buchung rückgängig
    max_nachtrag_tage       integer NOT NULL DEFAULT 7,
    homeoffice_erlaubt      boolean NOT NULL DEFAULT true,
    UNIQUE (mandant_id, gueltig_ab)
);

-- Arbeitsmodell einer Person (Pensum, Arbeitstage) – kommt aus dem freigegebenen Pensum (EduKSX-Staffing) oder von Hand
CREATE TABLE time.arbeitsmodell (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    person_id               uuid NOT NULL REFERENCES core.person(id),
    gueltig_ab              date NOT NULL,
    gueltig_bis             date,
    pensum                  numeric(5,2) NOT NULL CHECK (pensum > 0 AND pensum <= 100),
    funktion                text,
    arbeitstage             smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',   -- 1 = Montag
    soll_je_tag_min         integer,                                     -- abweichend; NULL = regel.soll_100_min × pensum
    quelle                  text NOT NULL DEFAULT 'manuell' CHECK (quelle IN ('manuell','staffing')),
    staffing_freigabe_id    uuid,                                        -- Verweis auf staffing.freigabe
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    CHECK (gueltig_bis IS NULL OR gueltig_bis >= gueltig_ab)
);
CREATE INDEX ON time.arbeitsmodell (person_id, gueltig_ab DESC);

-- Buchungsarten (Arbeitszeit, Homeoffice; später weitere)
CREATE TABLE time.buchungsart (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    schluessel              text NOT NULL,                     -- arbeitszeit, homeoffice
    name                    text NOT NULL,
    zeichen                 text,
    zaehlt_als_arbeitszeit  boolean NOT NULL DEFAULT true,
    aktiv                   boolean NOT NULL DEFAULT true,
    UNIQUE (mandant_id, schluessel)
);

-- ------------------------------------------------------------------ Buchungen

-- Stempelbuchung. Nie überschreiben: Rückgängig = storniert, Korrektur = neue Buchung mit Verweis.
CREATE TABLE time.buchung (
    id                      uuid PRIMARY KEY,                  -- vom Gerät erzeugt (crypto.randomUUID) → idempotente Übertragung
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    person_id               uuid NOT NULL REFERENCES core.person(id),
    typ                     text NOT NULL CHECK (typ IN ('kommen','pause_beginn','pause_ende','gehen')),
    zeit                    timestamptz NOT NULL,              -- Zeitpunkt der Buchung (Gerätezeit, geprüft)
    tag                     date NOT NULL,                     -- Arbeitstag (Europe/Zurich)
    buchungsart_id          uuid NOT NULL REFERENCES time.buchungsart(id),
    herkunft                text NOT NULL DEFAULT 'app' CHECK (herkunft IN ('app','web','terminal','nachtrag','korrektur','import')),
    nachgetragen            boolean NOT NULL DEFAULT false,    -- «Gehen nachtragen»
    offline_erfasst         boolean NOT NULL DEFAULT false,
    erfasst_am              timestamptz NOT NULL,              -- auf dem Gerät
    empfangen_am            timestamptz NOT NULL DEFAULT now(),-- auf dem Server («übertragen»)
    geraet                  text,                              -- Geräte-ID der App (kein Fingerprinting)
    storniert_am            timestamptz,                       -- rückgängig gemacht
    storniert_grund         text,
    ersetzt_id              uuid REFERENCES time.buchung(id),  -- bei Korrektur: welche Buchung ersetzt wird
    bemerkung               text,
    CHECK (empfangen_am >= erfasst_am - interval '5 minutes')
);
CREATE INDEX ON time.buchung (person_id, tag, zeit) WHERE storniert_am IS NULL;

-- ------------------------------------------------------------------ Ausbau: Abwesenheiten, Korrekturen, Monatsabschluss

CREATE TABLE time.abwesenheitsart (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    schluessel              text NOT NULL,                     -- ferien, krankheit, unfall, weiterbildung, militaer, urlaub
    name                    text NOT NULL,
    zaehlt_als_soll         boolean NOT NULL DEFAULT true,     -- Soll gilt als erfüllt
    reduziert_ferien        boolean NOT NULL DEFAULT false,
    braucht_bewilligung     boolean NOT NULL DEFAULT false,
    UNIQUE (mandant_id, schluessel)
);

CREATE TABLE time.abwesenheit (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    person_id               uuid NOT NULL REFERENCES core.person(id),
    abwesenheitsart_id      uuid NOT NULL REFERENCES time.abwesenheitsart(id),
    von                     date NOT NULL,
    bis                     date NOT NULL,
    halbtag                 text CHECK (halbtag IN ('vormittag','nachmittag')),
    status                  text NOT NULL DEFAULT 'beantragt' CHECK (status IN ('beantragt','bewilligt','abgelehnt','erfasst')),
    bemerkung               text,                              -- keine Diagnosen
    bewilligt_von           uuid,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    CHECK (bis >= von)
);

-- Korrekturantrag (Buchung ändern/ergänzen), von der vorgesetzten Person bestätigt
CREATE TABLE time.korrektur (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    person_id               uuid NOT NULL REFERENCES core.person(id),
    tag                     date NOT NULL,
    buchung_id              uuid REFERENCES time.buchung(id),  -- NULL = fehlende Buchung ergänzen
    neu_typ                 text CHECK (neu_typ IN ('kommen','pause_beginn','pause_ende','gehen')),
    neu_zeit                timestamptz,
    loeschen                boolean NOT NULL DEFAULT false,
    begruendung             text NOT NULL,
    status                  text NOT NULL DEFAULT 'beantragt' CHECK (status IN ('beantragt','bestaetigt','abgelehnt')),
    entschieden_von         uuid,
    entschieden_am          timestamptz,
    erstellt_am             timestamptz NOT NULL DEFAULT now()
);

-- Ferienguthaben je Person und Jahr
CREATE TABLE time.ferienanspruch (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    person_id               uuid NOT NULL REFERENCES core.person(id),
    jahr                    integer NOT NULL,
    anspruch_tage           numeric(5,2) NOT NULL,
    uebertrag_tage          numeric(5,2) NOT NULL DEFAULT 0,
    UNIQUE (person_id, jahr)
);

-- Monatsabschluss: eingefrorene Werte, eingereicht und visiert (Visum der Schulleitung, ggf. mit EduKSX-Sign)
CREATE TABLE time.monat (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id              uuid NOT NULL REFERENCES core.mandant(id),
    person_id               uuid NOT NULL REFERENCES core.person(id),
    monat                   date NOT NULL CHECK (extract(day FROM monat) = 1),
    soll_min                integer NOT NULL,
    ist_min                 integer NOT NULL,
    abwesend_min            integer NOT NULL DEFAULT 0,
    saldo_monat_min         integer NOT NULL,
    saldo_vortrag_min       integer NOT NULL,
    saldo_total_min         integer NOT NULL,
    ferien_bezogen_tage     numeric(5,2) NOT NULL DEFAULT 0,
    ferien_rest_tage        numeric(5,2),
    status                  text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen','eingereicht','visiert','zurueckgewiesen')),
    eingereicht_am          timestamptz,
    visiert_von             uuid,
    visiert_am              timestamptz,
    sign_prozess_ref        text,                              -- Verweis auf EduKSX-Sign
    bemerkung               text,
    version integer NOT NULL DEFAULT 1,
    UNIQUE (person_id, monat)
);

-- ------------------------------------------------------------------ Berechnung (Referenz für die API)

-- Tageswerte aus den Buchungen: Anwesenheit, gestempelte Pausen, gesetzliche Pause, Ist
-- (gesetzliche Pause = max(0, pause_dauer − gestempelte Pausen), sobald Anwesenheit − Pausen > pause_ab)
CREATE VIEW time.v_tag AS
WITH b AS (
    SELECT person_id, mandant_id, tag, typ, zeit,
           lead(zeit) OVER (PARTITION BY person_id, tag ORDER BY zeit) AS naechste
    FROM time.buchung WHERE storniert_am IS NULL
), sum AS (
    SELECT person_id, mandant_id, tag,
           coalesce(sum(extract(epoch FROM naechste - zeit)) FILTER (WHERE typ IN ('kommen','pause_ende')), 0)::integer / 60 AS arbeit_min,
           coalesce(sum(extract(epoch FROM naechste - zeit)) FILTER (WHERE typ = 'pause_beginn'), 0)::integer / 60 AS pause_min,
           bool_or(naechste IS NULL AND typ <> 'gehen') AS offen
    FROM b GROUP BY person_id, mandant_id, tag
)
SELECT s.*, r.pause_ab_min, r.pause_dauer_min,
       CASE WHEN s.arbeit_min > r.pause_ab_min THEN greatest(0, r.pause_dauer_min - s.pause_min) ELSE 0 END AS gesetzliche_pause_min,
       s.arbeit_min - CASE WHEN s.arbeit_min > r.pause_ab_min THEN greatest(0, r.pause_dauer_min - s.pause_min) ELSE 0 END AS ist_min
FROM sum s
JOIN LATERAL (SELECT * FROM time.regel r WHERE r.mandant_id = s.mandant_id AND r.gueltig_ab <= s.tag ORDER BY r.gueltig_ab DESC LIMIT 1) r ON true;
