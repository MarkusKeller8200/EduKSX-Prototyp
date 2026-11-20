-- EduKSX-Codex – Datenbankstruktur (systematische Rechtssammlung)
-- Stand 2026-11-20 · Status ENTWURF · Grundlage: Prototyp prototypen/rechtssammlung (0.20.x)
-- Voraussetzung: core-referenz.sql (core.mandant)
--
-- Besonderheit: Bundes- und Kantonsrecht, Gemeindeverzeichnis, Pflichtkatalog und Normenhierarchien sind für alle
-- Mandanten gleich → mandant_id NULL = gemeinsamer Bestand (nur Redaktion EduKSX-Codex darf schreiben).
-- Erlasse einer Gemeinde/Schulgemeinde gehören dem Mandanten (mandant_id gesetzt) und sind öffentlich lesbar.
--
-- Kern: organisation (herausgebende Stelle) › rubrik (Sachgebiet, verschachtelt) › erlass › fassung (Version mit
-- Datei/Text). Dazu: Rechtsgrundlagen, Quellenkatalog, Normenhierarchien (Knoten/Kanten), Pflichtkatalog,
-- Vergleichsmatrix, Leitfaden-Prüfung und Analysen der Evaluation.

CREATE SCHEMA IF NOT EXISTS codex;

-- ------------------------------------------------------------------ Gemeindeverzeichnis (Kanton Zürich)

CREATE TABLE codex.gemeinde (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),            -- NULL = gemeinsam
    bfs_nr              integer UNIQUE,
    name                text NOT NULL,
    bezirk              text NOT NULL,
    typ                 text NOT NULL DEFAULT 'Politische Gemeinde',
    einheitsgemeinde    boolean,                                     -- «EG»
    einheit_sicher      boolean NOT NULL DEFAULT false,
    website             text,
    website_quelle      text,
    cms                 text,                                        -- erkanntes CMS (intern, nicht angezeigt in Produkt)
    rechtssammlung_url  text,
    erfassung           text NOT NULL DEFAULT 'offen' CHECK (erfassung IN ('offen','erfasst','geprueft')),
    schultraeger_primar text,
    schultraeger_sek    text,
    geaendert_am timestamptz NOT NULL DEFAULT now(), version integer NOT NULL DEFAULT 1
);

CREATE TABLE codex.schulgemeinde (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    typ                 text NOT NULL CHECK (typ IN ('Volksschulgemeinde','Primarschulgemeinde','Sekundarschulgemeinde','Zweckverband')),
    name                text NOT NULL,
    kurz                text,
    bezirk              text NOT NULL,
    sitz                text,
    mitglieder_sicher   boolean NOT NULL DEFAULT false,
    quelle              text,                                        -- «Verzeichnis der Gemeinden, Stand 1.7.2026»
    UNIQUE (name)
);

CREATE TABLE codex.schulgemeinde_mitglied (
    mandant_id          uuid REFERENCES core.mandant(id),
    schulgemeinde_id    uuid NOT NULL REFERENCES codex.schulgemeinde(id) ON DELETE CASCADE,
    gemeinde_id         uuid NOT NULL REFERENCES codex.gemeinde(id),
    sicher              boolean NOT NULL DEFAULT true,
    PRIMARY KEY (schulgemeinde_id, gemeinde_id)
);

-- ------------------------------------------------------------------ Herausgeber und Rechtssammlung

-- Herausgebende Stelle mit eigener Rechtssammlung (Bund, Kanton, Bildungsrat, Gemeinde, Schulgemeinde, Schule der EG)
CREATE TABLE codex.organisation (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),            -- gesetzt für Gemeinden/Schulgemeinden mit EduKSX
    schluessel          text NOT NULL UNIQUE,                        -- «ps-truellikon», «bund», «kanton-zh»
    ebene               text NOT NULL CHECK (ebene IN ('Bund','Interkantonal','Kanton','Bildungsrat','Gemeinde')),
    typ                 text NOT NULL,                               -- Politische Gemeinde, Primarschulgemeinde …
    name                text NOT NULL,
    kurz                text,
    bezirk              text,
    gemeinde_id         uuid REFERENCES codex.gemeinde(id),
    schulgemeinde_id    uuid REFERENCES codex.schulgemeinde(id),
    sitz                text,
    website             text,
    rechtssammlung_url  text,
    menu_pfad           text[] NOT NULL DEFAULT '{}',               -- Menüpfad auf der Website (Evaluation)
    weitere_einstiege   text[] NOT NULL DEFAULT '{}',
    struktur            text,                                        -- Beschreibung der Gliederung
    nummerierung        text,
    einbettbar          boolean NOT NULL DEFAULT false,              -- Website erlaubt iFrame
    pdf_vorschau        boolean NOT NULL DEFAULT false,
    darstellung         jsonb,                                       -- Nachbau: {"font":"…","primary":"#…",…} (ohne Logo)
    stand               date,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1
);

-- Rubrik/Sachgebiet (höchstens 9 Sachgebiete je Leitfaden; Unterordner über eltern_id)
CREATE TABLE codex.rubrik (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    organisation_id     uuid NOT NULL REFERENCES codex.organisation(id) ON DELETE CASCADE,
    eltern_id           uuid REFERENCES codex.rubrik(id) ON DELETE CASCADE,
    nummer              text,                                        -- «1», «1.2»
    titel               text NOT NULL,
    reihenfolge         integer NOT NULL DEFAULT 0
);
CREATE INDEX ON codex.rubrik (organisation_id, eltern_id, reihenfolge);

-- Sachbereiche (Rechtsgrundlagenverzeichnis) und Themen (Normenhierarchien)
CREATE TABLE codex.sachbereich (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    nr                  integer NOT NULL UNIQUE,
    titel               text NOT NULL
);

CREATE TABLE codex.thema (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    schluessel          text NOT NULL UNIQUE,                        -- «volksschule», «personal», «datenschutz»
    titel               text NOT NULL,
    gruppe              text,                                        -- «Schule», «Personal», …
    reihenfolge         integer NOT NULL DEFAULT 0
);

-- Erlass bzw. Dokument einer Rechtssammlung
CREATE TABLE codex.erlass (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    organisation_id     uuid NOT NULL REFERENCES codex.organisation(id),
    rubrik_id           uuid REFERENCES codex.rubrik(id) ON DELETE SET NULL,
    schluessel          text NOT NULL UNIQUE,                        -- stabile ID («vid»), z. B. «pg-truellikon:entschaedigungsv», «sr-101», «ls-412.100»
    titel               text NOT NULL,
    original_titel      text,                                        -- Titel wie auf der Website
    abk                 text,                                        -- «VSG»
    fundstelle          text,                                        -- «SR 101», «LS 412.100», eigene Nummer
    ordnungsnummer      text,
    art                 text NOT NULL DEFAULT 'unklar' CHECK (art IN ('verfassung','gesetz','verordnung','gemeindeerlass','behoerdenerlass','vertrag','raumplan','nicht_rechtsetzend','nicht_sr','unklar')),
    quellenklasse       char(1),                                     -- A Rechtsnorm, B … (codex.quellenklasse)
    herausgeber         text,
    publikationsstelle  text,
    verbindlichkeit     text,
    textfassung         boolean NOT NULL DEFAULT false,              -- Volltext vorhanden
    geprueft            boolean NOT NULL DEFAULT false,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1
);
CREATE INDEX ON codex.erlass (organisation_id, rubrik_id);
CREATE INDEX ON codex.erlass (fundstelle);

CREATE TABLE codex.erlass_thema (
    mandant_id          uuid REFERENCES core.mandant(id),
    erlass_id           uuid NOT NULL REFERENCES codex.erlass(id) ON DELETE CASCADE,
    thema_id            uuid NOT NULL REFERENCES codex.thema(id),
    PRIMARY KEY (erlass_id, thema_id)
);

-- Fassung (Version) eines Erlasses: Nachtrag/«Stand am», Gültigkeit, Datei und Text
CREATE TABLE codex.fassung (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    erlass_id           uuid NOT NULL REFERENCES codex.erlass(id) ON DELETE CASCADE,
    bezeichnung         text NOT NULL,                               -- «Stand 03.03.2024», «Nachtrag 129», «erfasst»
    nachtrag            text,
    veroeffentlicht     date,
    in_kraft_ab         date,
    in_kraft_bis        date,
    datum_herkunft      text,                                        -- woher das Datum stammt (Titel, PDF-Metadaten, Website)
    status              text NOT NULL DEFAULT 'aktuell' CHECK (status IN ('entwurf','aktuell','aufgehoben','ersetzt')),
    quelle_url          text,                                        -- Seite, auf der die Fassung publiziert ist
    datei_url           text,                                        -- Original-Datei
    datei_typ           text,                                        -- PDF, DOCX, HTML
    datei_groesse       bigint,
    datei_sha256        char(64),
    ablage_ref          text,                                        -- Kopie in der EduKSX-Dokumentenablage
    seiten              integer,
    absaetze            integer,
    fussnoten           integer,
    text_markdown       text,                                        -- Textfassung (Volltextsuche)
    erfasst_am          date NOT NULL DEFAULT current_date,
    CHECK (in_kraft_bis IS NULL OR in_kraft_ab IS NULL OR in_kraft_bis >= in_kraft_ab)
);
CREATE INDEX ON codex.fassung (erlass_id, in_kraft_ab DESC);
CREATE INDEX fassung_volltext ON codex.fassung USING gin (to_tsvector('german', coalesce(text_markdown, '')));

-- Unterschiede zwischen zwei Fassungen (vorab berechnet)
CREATE TABLE codex.fassung_unterschied (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    fassung_alt_id      uuid NOT NULL REFERENCES codex.fassung(id) ON DELETE CASCADE,
    fassung_neu_id      uuid NOT NULL REFERENCES codex.fassung(id) ON DELETE CASCADE,
    unterschiede        jsonb NOT NULL,                              -- [{"art":"geaendert","stelle":"§ 12","alt":"…","neu":"…"}]
    UNIQUE (fassung_alt_id, fassung_neu_id)
);

-- Verweis eines Erlasses auf einen anderen (aus Ingress, Fussnoten, Text)
CREATE TABLE codex.verweis (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    von_erlass_id       uuid NOT NULL REFERENCES codex.erlass(id) ON DELETE CASCADE,
    nach_erlass_id      uuid REFERENCES codex.erlass(id),
    ziel_fundstelle     text NOT NULL,                               -- auch wenn der Zielerlass fehlt
    stelle              text,
    anzahl              integer NOT NULL DEFAULT 1,
    UNIQUE (von_erlass_id, ziel_fundstelle)
);

-- ------------------------------------------------------------------ Rechtsgrundlagen und Quellen

-- Verzeichnis der Rechtsgrundlagen für Schulen (Erlass + Stelle + Relevanz je Sachbereich)
CREATE TABLE codex.rechtsgrundlage (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    nr                  integer NOT NULL,
    sachbereich_id      uuid NOT NULL REFERENCES codex.sachbereich(id),
    erlass_id           uuid NOT NULL REFERENCES codex.erlass(id),
    stelle              text,                                        -- «Art. 19, 62»
    relevanz            text,
    quelle              text,
    quelle_generisch    boolean NOT NULL DEFAULT false,
    geprueft            boolean NOT NULL DEFAULT false,
    UNIQUE NULLS NOT DISTINCT (mandant_id, nr)
);

CREATE TABLE codex.quellenklasse (
    klasse              char(1) PRIMARY KEY,
    mandant_id          uuid REFERENCES core.mandant(id),
    titel               text NOT NULL,                               -- «Rechtsnormen»
    aufnahme            text NOT NULL                                -- «vollständig aufnehmen»
);

-- Publikationsquellen (Fedlex, ZH-Lex, Gemeinde-Websites …)
CREATE TABLE codex.quelle (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    klasse              char(1) REFERENCES codex.quellenklasse(klasse),
    ebene               text NOT NULL,
    name                text NOT NULL,
    herausgeber         text,
    inhalt              text,
    url                 text,
    prioritaet          text CHECK (prioritaet IN ('hoch','mittel','tief')),
    versionierung       text,
    verbindlichkeit     text,
    abruf               text CHECK (abruf IN ('api','sparql','pdf','html','manuell')),
    zuletzt_abgerufen   timestamptz
);

-- ------------------------------------------------------------------ Normenhierarchien

CREATE TABLE codex.hierarchie (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    schluessel          text NOT NULL UNIQUE,                        -- «volksschule»
    titel               text NOT NULL,
    gruppe              text,
    ebenen              text[] NOT NULL,                             -- ["Bund","Interkantonal","Kanton","Bildungsrat","Gemeinde"]
    hinweis             text,
    reihenfolge         integer NOT NULL DEFAULT 0
);

CREATE TABLE codex.hierarchie_knoten (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    hierarchie_id       uuid NOT NULL REFERENCES codex.hierarchie(id) ON DELETE CASCADE,
    schluessel          text NOT NULL,                               -- «bv», «vsg»
    ebene               integer NOT NULL,                            -- Index in hierarchie.ebenen
    erlass_id           uuid REFERENCES codex.erlass(id),            -- NULL = kommunal je Organisation bzw. fehlt noch
    titel               text NOT NULL,
    art                 text,                                        -- «Gesetz (Kantonsrat)»
    hinweis             text,
    UNIQUE (hierarchie_id, schluessel)
);

-- Verbindung zwischen zwei Knoten mit Beleg (Fundstelle + Textstelle)
CREATE TABLE codex.hierarchie_kante (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    hierarchie_id       uuid NOT NULL REFERENCES codex.hierarchie(id) ON DELETE CASCADE,
    von_knoten_id       uuid NOT NULL REFERENCES codex.hierarchie_knoten(id) ON DELETE CASCADE,
    nach_knoten_id      uuid NOT NULL REFERENCES codex.hierarchie_knoten(id) ON DELETE CASCADE,
    art                 text NOT NULL,                               -- Grundlage, Vollzug, verweist auf, subsidiär …
    beleg_fundstelle    text,
    beleg_stelle        text,
    beleg_text          text,
    verweise            integer,
    status              text NOT NULL DEFAULT 'vorschlag' CHECK (status IN ('vorschlag','nur_hand','bestaetigt','abgelehnt','kommunal_oder_ohne_text')),
    geprueft_von        uuid,
    geprueft_am         timestamptz,
    CHECK (von_knoten_id <> nach_knoten_id)
);

-- ------------------------------------------------------------------ Pflichtkatalog und Vergleichsmatrix

CREATE TABLE codex.pflichtkategorie (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    nr                  integer NOT NULL UNIQUE,
    titel               text NOT NULL
);

-- Pflichtdokument einer Schulgemeinde (P Pflicht, B bedingte Pflicht, O optional)
CREATE TABLE codex.pflichtdokument (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    schluessel          text NOT NULL UNIQUE,                        -- «p1»
    kategorie_id        uuid NOT NULL REFERENCES codex.pflichtkategorie(id),
    dokument            text NOT NULL,
    stufe               char(1) NOT NULL CHECK (stufe IN ('P','B','O')),
    aufnahme            text NOT NULL,                               -- in die Rechtssammlung aufnehmen?
    quelle              text,
    quelle_url          text,
    muster              text,                                        -- Suchmuster (Regex) für die automatische Zuordnung
    muster_unsicher     text,
    bemerkung           text,
    status              text NOT NULL DEFAULT 'zu_pruefen' CHECK (status IN ('zu_pruefen','geprueft'))
);

-- Zeile der Vergleichsmatrix (Rubrik › Unterordner › Dokumenttyp)
CREATE TABLE codex.matrix_zeile (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    schluessel          text NOT NULL UNIQUE,                        -- «k6»
    menu                text NOT NULL,
    unter               text,
    dokument            text NOT NULL,
    sammel              boolean NOT NULL DEFAULT false,
    stufe               char(1) CHECK (stufe IN ('P','B','O')),
    pflicht             boolean NOT NULL DEFAULT false,
    aufnahme            text,
    pflichtdokument_id  uuid REFERENCES codex.pflichtdokument(id),
    reihenfolge         integer NOT NULL DEFAULT 0
);

-- Zelle: Hat Organisation X das Dokument der Zeile? Mit zugeordneten Erlassen
CREATE TABLE codex.matrix_zelle (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    zeile_id            uuid NOT NULL REFERENCES codex.matrix_zeile(id) ON DELETE CASCADE,
    organisation_id     uuid NOT NULL REFERENCES codex.organisation(id) ON DELETE CASCADE,
    status              text NOT NULL CHECK (status IN ('ja','unsicher','nein','nicht_zutreffend')),
    hinweise            text[] NOT NULL DEFAULT '{}',
    zuordnung           text NOT NULL DEFAULT 'automatisch' CHECK (zuordnung IN ('automatisch','hand')),
    UNIQUE (zeile_id, organisation_id)
);

CREATE TABLE codex.matrix_zelle_erlass (
    mandant_id          uuid REFERENCES core.mandant(id),
    zelle_id            uuid NOT NULL REFERENCES codex.matrix_zelle(id) ON DELETE CASCADE,
    erlass_id           uuid NOT NULL REFERENCES codex.erlass(id) ON DELETE CASCADE,
    PRIMARY KEY (zelle_id, erlass_id)
);

-- ------------------------------------------------------------------ Leitfaden-Prüfung und Analysen

-- Anforderungen des Leitfadens (Gemeindeamt ZH, 2018/2019)
CREATE TABLE codex.leitfaden_regel (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    ziffer              text NOT NULL UNIQUE,
    titel               text NOT NULL,
    text                text,
    automatisch         boolean NOT NULL DEFAULT true                -- maschinell prüfbar (Titel/Ablageort)
);

-- Analyse einer Rechtssammlung (Evaluation, wiederholbar)
CREATE TABLE codex.analyse (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    organisation_id     uuid NOT NULL REFERENCES codex.organisation(id) ON DELETE CASCADE,
    analyse_version     integer NOT NULL,
    datum               date NOT NULL,
    art                 text NOT NULL,                               -- «Erfassung», «Nachführung»
    bemerkung           text,
    anzahl_dokumente    integer NOT NULL,
    anzahl_rubriken     integer NOT NULL,
    max_tiefe           integer,
    arten               jsonb NOT NULL DEFAULT '{}'::jsonb,          -- Anzahl je Dokumentart
    befunde             text[] NOT NULL DEFAULT '{}',
    UNIQUE (organisation_id, analyse_version)
);

CREATE TABLE codex.leitfaden_pruefung (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid REFERENCES core.mandant(id),
    analyse_id          uuid NOT NULL REFERENCES codex.analyse(id) ON DELETE CASCADE,
    regel_id            uuid NOT NULL REFERENCES codex.leitfaden_regel(id),
    status              text NOT NULL CHECK (status IN ('ja','nein','unsicher','info')),
    text                text,
    UNIQUE (analyse_id, regel_id)
);

-- ------------------------------------------------------------------ Ansichten

-- Gültige Fassung je Erlass zu einem Stichtag (Standard: heute)
CREATE VIEW codex.v_fassung_aktuell AS
SELECT DISTINCT ON (f.erlass_id) f.*
FROM codex.fassung f
WHERE f.status <> 'entwurf'
  AND (f.in_kraft_ab IS NULL OR f.in_kraft_ab <= current_date)
  AND (f.in_kraft_bis IS NULL OR f.in_kraft_bis > current_date)
ORDER BY f.erlass_id, f.in_kraft_ab DESC NULLS LAST, f.veroeffentlicht DESC NULLS LAST;

-- Erfassungsstand je Bezirk (Übersicht «Fortschritt je Bezirk»)
CREATE VIEW codex.v_fortschritt_bezirk AS
SELECT g.bezirk, count(*) AS gemeinden, count(*) FILTER (WHERE g.erfassung <> 'offen') AS erfasst
FROM codex.gemeinde g GROUP BY g.bezirk;
