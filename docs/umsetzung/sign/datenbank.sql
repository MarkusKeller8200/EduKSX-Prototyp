-- EduKSX-Sign – Datenbankstruktur (Signatur / Persönliche Ablage)
-- Stand 2026-11-20 · Status ENTWURF · Grundlage: Prototyp prototypen/signatur (0.1.x)
-- Voraussetzung: core-referenz.sql (core.mandant, core.person)
--
-- Dateiinhalte liegen im Objektspeicher (S3-kompatibel, Schweiz); die Datenbank hält Metadaten, Versionen,
-- Anmerkungen, Signaturprozesse, Eingang aus anderen Modulen und den Abgleich mit der Cloud-Ablage.
-- Die eigentliche Signatur erstellt ein Signaturdienst (Anbieter OFFEN); gespeichert werden Nachweise.

CREATE SCHEMA IF NOT EXISTS sign;

-- ------------------------------------------------------------------ Persönliche Ablage

-- Ordner einer Person (Baum über eltern_id; eltern_id NULL = «Meine Ablage»)
CREATE TABLE sign.ordner (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    besitzer_id         uuid NOT NULL REFERENCES core.person(id),
    eltern_id           uuid REFERENCES sign.ordner(id) ON DELETE CASCADE,
    name                text NOT NULL,
    system              text CHECK (system IN ('unterzeichnet_erhalten','eingang')),   -- vom System angelegte Ordner
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    UNIQUE NULLS NOT DISTINCT (besitzer_id, eltern_id, name)
);

-- Dokument (Datei) in der Ablage
CREATE TABLE sign.dokument (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    besitzer_id         uuid NOT NULL REFERENCES core.person(id),
    ordner_id           uuid REFERENCES sign.ordner(id) ON DELETE SET NULL,   -- NULL = oberste Ebene
    name                text NOT NULL,
    typ                 text NOT NULL CHECK (typ IN ('pdf','docx','xlsx','bild','text','andere')),
    mime                text NOT NULL,
    groesse             bigint NOT NULL,
    status              text CHECK (status IN ('in_signatur','signiert','versiegelt')),   -- NULL = bearbeitbar
    gesperrt            boolean NOT NULL DEFAULT false,                        -- signiert/versiegelt → nur Kopie bearbeiten
    abgeleitet_von_id   uuid REFERENCES sign.dokument(id),                     -- _sign/_seal/PDF/A-Kopie verweist auf Original
    ableitung           text CHECK (ableitung IN ('pdfa','sign','seal','kopie','word_bearbeitet')),
    sync_status         text NOT NULL DEFAULT 'ausstehend' CHECK (sync_status IN ('ok','ausstehend','konflikt','ausgeschlossen')),
    aktuelle_version    integer NOT NULL DEFAULT 1,
    geaendert_inhalt_am timestamptz NOT NULL DEFAULT now(),
    archiviert_am       timestamptz,
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1
);
CREATE INDEX ON sign.dokument (besitzer_id, ordner_id);
CREATE UNIQUE INDEX dokument_name_je_ordner ON sign.dokument (besitzer_id, coalesce(ordner_id, '00000000-0000-0000-0000-000000000000'::uuid), name) WHERE archiviert_am IS NULL;

-- Version des Dateiinhalts (jede Speicherung, Umwandlung, Ergänzung aus der Cloud)
CREATE TABLE sign.dokument_version (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    dokument_id         uuid NOT NULL REFERENCES sign.dokument(id) ON DELETE CASCADE,
    nr                  integer NOT NULL,
    speicher_schluessel text NOT NULL,                                         -- Objekt im Speicher
    sha256              char(64) NOT NULL,
    groesse             bigint NOT NULL,
    seiten              integer,
    pdfa                text,                                                  -- «PDF/A-2b», wenn umgewandelt
    herkunft            text NOT NULL CHECK (herkunft IN ('hochgeladen','bearbeitet','umgewandelt','signiert','versiegelt','cloud','modul')),
    erstellt_am         timestamptz NOT NULL DEFAULT now(),
    erstellt_von        uuid,
    UNIQUE (dokument_id, nr)
);

-- Anmerkungen/Formularwerte auf einem PDF (Text, Kommentar, Datum, Unterschriftsfeld, Formularfeld, Siegel)
CREATE TABLE sign.element (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    dokument_id         uuid NOT NULL REFERENCES sign.dokument(id) ON DELETE CASCADE,
    art                 text NOT NULL CHECK (art IN ('text','kommentar','datum','feld','formular','siegel','haken')),
    seite               integer NOT NULL CHECK (seite >= 0),
    x                   numeric(6,2) NOT NULL,                                 -- Position in % der Seitenbreite
    y                   numeric(6,2) NOT NULL,
    b                   numeric(6,2),
    h                   numeric(6,2),
    inhalt              text,                                                  -- Text, Kommentar, Datum, Formularwert
    formularfeld        text,                                                  -- Name des PDF-Formularfelds
    eingebrannt         boolean NOT NULL DEFAULT false,                        -- beim Umwandeln/Signieren fest ins PDF übernommen
    erstellt_am timestamptz NOT NULL DEFAULT now(), erstellt_von uuid,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1
);

-- ------------------------------------------------------------------ Signaturprozess

CREATE TABLE sign.prozess (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    nummer              text NOT NULL,
    dokument_id         uuid REFERENCES sign.dokument(id),                     -- Quelle in der Ablage
    quelle_name         text NOT NULL,                                         -- Dateiname der Quelle
    titel               text NOT NULL,
    initiant_id         uuid NOT NULL REFERENCES core.person(id),
    status              text NOT NULL DEFAULT 'entwurf' CHECK (status IN ('entwurf','laufend','abgeschlossen','abgelehnt','zurueckgezogen','abgelaufen')),
    schritt             integer NOT NULL DEFAULT 0,                            -- Assistent: 0 Dokument … 3 Senden
    umgewandelt         boolean NOT NULL DEFAULT false,                        -- PDF/A erzeugt
    pdfa_ablegen        boolean NOT NULL DEFAULT false,                        -- PDF/A-Kopie in der Ablage behalten
    platzhalter_uebernommen boolean NOT NULL DEFAULT false,                    -- #sign#n# erkannt
    reihenfolge         text NOT NULL DEFAULT 'nacheinander' CHECK (reihenfolge IN ('nacheinander','gleichzeitig')),
    stufe               text NOT NULL DEFAULT 'aes' CHECK (stufe IN ('ses','aes','qes')),
    rechtsraum          text NOT NULL DEFAULT 'zertes' CHECK (rechtsraum IN ('zertes','eidas')),
    nachricht           text,
    frist               date,
    erinnerung_tage     integer,
    versiegeln          boolean NOT NULL DEFAULT false,                        -- nach Abschluss versiegeln
    ergebnis_id         uuid REFERENCES sign.dokument(id),                     -- <Name>_sign.pdf
    anbieter_ref        text,                                                  -- ID beim Signaturdienst
    herkunft_modul      text,                                                  -- staffing, time, flow, core … (Anfrage aus Modul)
    herkunft_ref        text,                                                  -- Rückverweis/Callback im Modul
    erstellt_am         timestamptz NOT NULL DEFAULT now(),
    gesendet_am         timestamptz,
    abgeschlossen_am    timestamptz,
    geaendert_am timestamptz NOT NULL DEFAULT now(), geaendert_von uuid,
    version integer NOT NULL DEFAULT 1,
    UNIQUE (mandant_id, nummer)
);

-- Beteiligte: unterschreiben, genehmigen, Kopie (intern über person_id, extern mit Name/Mail)
CREATE TABLE sign.prozess_person (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    prozess_id          uuid NOT NULL REFERENCES sign.prozess(id) ON DELETE CASCADE,
    reihenfolge         integer NOT NULL,
    person_id           uuid REFERENCES core.person(id),
    name                text NOT NULL,
    mail                text NOT NULL,
    mobil               text,                                                  -- für Code (FES) – nur solange nötig
    rolle               text NOT NULL CHECK (rolle IN ('unterschreiben','genehmigen','kopie')),
    status              text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen','benachrichtigt','signiert','genehmigt','abgelehnt')),
    zeit                timestamptz,
    begruendung         text,                                                  -- bei Ablehnung
    UNIQUE (prozess_id, reihenfolge)
);

-- Unterschriftsfeld je Person (Position in %, aus Platzhalter oder von Hand)
CREATE TABLE sign.prozess_feld (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    prozess_id          uuid NOT NULL REFERENCES sign.prozess(id) ON DELETE CASCADE,
    prozess_person_id   uuid NOT NULL REFERENCES sign.prozess_person(id) ON DELETE CASCADE,
    seite               integer NOT NULL,
    x                   numeric(6,2) NOT NULL,
    y                   numeric(6,2) NOT NULL,
    b                   numeric(6,2) NOT NULL DEFAULT 36,
    h                   numeric(6,2) NOT NULL DEFAULT 9,
    platzhalter         text                                                   -- «0-1» = Seite-Nummer aus #sign#1#
);

-- Signaturprotokoll (unveränderbar, Teil des Ergebnisses)
CREATE TABLE sign.prozess_protokoll (
    id                  bigserial PRIMARY KEY,
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    prozess_id          uuid NOT NULL REFERENCES sign.prozess(id) ON DELETE CASCADE,
    zeit                timestamptz NOT NULL DEFAULT now(),
    text                text NOT NULL,
    person_id           uuid
);

-- Nachweis einer geleisteten Signatur (vom Signaturdienst)
CREATE TABLE sign.signatur (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    dokument_id         uuid NOT NULL REFERENCES sign.dokument(id),
    prozess_person_id   uuid REFERENCES sign.prozess_person(id),
    name                text NOT NULL,
    funktion            text,
    stufe               text NOT NULL CHECK (stufe IN ('ses','aes','qes')),
    rechtsraum          text NOT NULL CHECK (rechtsraum IN ('zertes','eidas')),
    zeit                timestamptz NOT NULL,
    zertifikat_aussteller text,
    validierung         jsonb,                                                 -- Prüfbericht des Dienstes
    UNIQUE (dokument_id, prozess_person_id)
);

-- Siegel der Organisation auf einem Dokument
CREATE TABLE sign.siegel (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    dokument_id         uuid NOT NULL REFERENCES sign.dokument(id),
    organisation        text NOT NULL,
    stufe               text NOT NULL CHECK (stufe IN ('aes','qes')),
    rechtsraum          text NOT NULL CHECK (rechtsraum IN ('zertes','eidas')),
    sichtbar            boolean NOT NULL DEFAULT true,
    zeit                timestamptz NOT NULL DEFAULT now(),
    ausgeloest_von      uuid NOT NULL
);

-- Persönliche Einstellungen (Standardstufe, Rechtsraum, gespeicherte Unterschrift als Bild)
CREATE TABLE sign.einstellung (
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    person_id           uuid PRIMARY KEY REFERENCES core.person(id),
    stufe               text NOT NULL DEFAULT 'aes' CHECK (stufe IN ('ses','aes','qes')),
    rechtsraum          text NOT NULL DEFAULT 'zertes' CHECK (rechtsraum IN ('zertes','eidas')),
    unterschrift_bild   text,                                                  -- Objekt im Speicher (OFFEN, ob gewünscht)
    geaendert_am        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------ Eingang (Anfragen aus Modulen)

CREATE TABLE sign.anfrage (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    empfaenger_id       uuid NOT NULL REFERENCES core.person(id),
    quelle_modul        text NOT NULL,                                         -- «EduKSX-Staffing», «EduKSX-Time» …
    von                 text NOT NULL,                                         -- Absender (Person/Rolle)
    titel               text NOT NULL,
    datei               text NOT NULL,
    dokument_id         uuid REFERENCES sign.dokument(id),
    prozess_id          uuid REFERENCES sign.prozess(id),
    erhalten            timestamptz NOT NULL DEFAULT now(),
    frist               date,
    stufe               text NOT NULL CHECK (stufe IN ('ses','aes','qes')),
    rechtsraum          text NOT NULL CHECK (rechtsraum IN ('zertes','eidas')),
    status              text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen','signiert','abgelehnt','abgelaufen')),
    nachricht           text,
    rueckruf_url        text,                                                  -- Callback an das Modul
    idempotenz          text NOT NULL,                                         -- Schlüssel des Moduls (Doppelanfragen)
    UNIQUE (mandant_id, quelle_modul, idempotenz)
);

-- ------------------------------------------------------------------ Abgleich mit der Cloud-Ablage

CREATE TABLE sign.sync_konfiguration (
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    person_id           uuid PRIMARY KEY REFERENCES core.person(id),
    aktiv               boolean NOT NULL DEFAULT false,
    ziel                text NOT NULL,                                         -- Zielordner in der Cloud-Ablage
    richtung            text NOT NULL DEFAULT 'beide' CHECK (richtung IN ('beide','hochladen','herunterladen')),
    intervall_min       integer NOT NULL DEFAULT 5,
    konflikt            text NOT NULL DEFAULT 'beide' CHECK (konflikt IN ('beide','lokal','cloud','neuere')),
    connect_ref         text,                                                  -- Verbindung in EduKSX-Connect
    letzte              timestamptz,
    delta_token         text,                                                  -- Änderungsstand der Cloud
    geaendert_am        timestamptz NOT NULL DEFAULT now()
);

-- Zuordnung lokales Objekt ↔ Cloud-Objekt
CREATE TABLE sign.sync_eintrag (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    person_id           uuid NOT NULL REFERENCES core.person(id),
    ordner_id           uuid REFERENCES sign.ordner(id) ON DELETE CASCADE,
    dokument_id         uuid REFERENCES sign.dokument(id) ON DELETE CASCADE,
    cloud_id            text NOT NULL,
    cloud_etag          text,
    lokal_version       integer,
    status              text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','ausstehend','konflikt','fehler')),
    zuletzt             timestamptz,
    CHECK ((ordner_id IS NULL) <> (dokument_id IS NULL)),
    UNIQUE (person_id, cloud_id)
);

CREATE TABLE sign.sync_protokoll (
    id                  bigserial PRIMARY KEY,
    mandant_id          uuid NOT NULL REFERENCES core.mandant(id),
    person_id           uuid NOT NULL REFERENCES core.person(id),
    zeit                timestamptz NOT NULL DEFAULT now(),
    text                text NOT NULL
);
