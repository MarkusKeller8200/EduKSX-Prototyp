/*
 * EduKSX-AI – Testdaten (alle Personen, Organisationen, Unterhaltungen und Dokumente erfunden)
 *
 * Modelle und Schweizer Anbieter: öffentlich angebotene Lösungen, mit Quelle verlinkt (Stand 23.11.2026, vor einem
 * Einsatz neu prüfen). Angaben zu Grösse, Lizenz und Kontext aus den Modellkarten bzw. Anbieterseiten; wo unsicher,
 * steht «laut Modellkarte prüfen».
 */
window.AI_DATEN = (function () {
  "use strict";

  const ORGANISATION = {
    name: "Schule Muster",
    adresse: "Schulweg 1, 9999 Musterwil",
    telefon: "+41 00 000 00 00",
    mail: "sekretariat@schule-muster.example",
    web: "https://schule-muster.example",
    hinweis: "Wir schreiben Schweizer Hochdeutsch (ss statt ß), sprechen Eltern mit «Sie» an und nennen keine Namen von Lernenden in Beispielen.",
  };

  const ICH = { id: "u1", name: "Lea Beispiel", kurz: "LB", funktion: "Fachstelle ICT", rolle: "admin" };

  const BENUTZER = [
    { id: "u1", name: "Lea Beispiel", mail: "lea.beispiel@schule-muster.example", rolle: "admin", gruppen: ["g-ict", "g-verwaltung"], aktiv: true, zuletzt: "2026-11-23T08:52" },
    { id: "u2", name: "Beat Beispiel", mail: "beat.beispiel@schule-muster.example", rolle: "redaktion", gruppen: ["g-schulleitung"], aktiv: true, zuletzt: "2026-11-22T16:10" },
    { id: "u3", name: "Carla Test", mail: "carla.test@schule-muster.example", rolle: "mitarbeitende", gruppen: ["g-verwaltung"], aktiv: true, zuletzt: "2026-11-23T07:41" },
    { id: "u4", name: "Daniel Demo", mail: "daniel.demo@schule-muster.example", rolle: "mitarbeitende", gruppen: ["g-lehrpersonen"], aktiv: true, zuletzt: "2026-11-21T19:03" },
    { id: "u5", name: "Eva Exempel", mail: "eva.exempel@schule-muster.example", rolle: "mitarbeitende", gruppen: ["g-lehrpersonen"], aktiv: true, zuletzt: "2026-11-20T12:30" },
    { id: "u6", name: "Fabio Fiktiv", mail: "fabio.fiktiv@schule-muster.example", rolle: "mitarbeitende", gruppen: ["g-verwaltung"], aktiv: false, zuletzt: "2026-10-02T09:15" },
    { id: "u7", name: "Gina Gedacht", mail: "gina.gedacht@schule-muster.example", rolle: "mitarbeitende", gruppen: ["g-schulsozialarbeit"], aktiv: true, zuletzt: "2026-11-22T11:47" },
    { id: "u8", name: "Hans Hypothese", mail: "hans.hypothese@schule-muster.example", rolle: "redaktion", gruppen: ["g-lehrpersonen", "g-ict"], aktiv: true, zuletzt: "2026-11-23T08:05" },
  ];

  const GRUPPEN = [
    { id: "g-schulleitung", name: "Schulleitung", beschreibung: "Schulleitungen aller Schulhäuser" },
    { id: "g-verwaltung", name: "Schulverwaltung", beschreibung: "Sekretariat, Finanzen, Personal" },
    { id: "g-lehrpersonen", name: "Lehrpersonen", beschreibung: "Alle Lehrpersonen" },
    { id: "g-schulsozialarbeit", name: "Schulsozialarbeit", beschreibung: "Mitarbeitende Schulsozialarbeit" },
    { id: "g-ict", name: "Fachstelle ICT", beschreibung: "Betrieb und Support" },
  ];

  // Rollen und Rechte (Admin hat immer alle Rechte)
  const RECHTE = [
    ["chat", "Chat verwenden"],
    ["anhang", "Dateien an Unterhaltungen anhängen"],
    ["web", "Websuche verwenden"],
    ["assistent_erstellen", "Eigene Assistenten erstellen"],
    ["assistent_freigeben", "Assistenten für Gruppen oder die ganze Organisation freigeben"],
    ["wissen_erstellen", "Wissenssammlungen erstellen"],
    ["wissen_freigeben", "Wissenssammlungen freigeben"],
    ["modell_waehlen", "Modell selbst wählen (sonst immer Standardmodell)"],
    ["vertraulich", "Daten mit Schutzbedarf «vertraulich» verarbeiten"],
    ["verwaltung", "Verwaltung öffnen"],
  ];
  const ROLLEN = [
    { id: "admin", name: "Administration", beschreibung: "Betreibt die Plattform. Hat immer alle Rechte.", fest: true, rechte: RECHTE.map((r) => r[0]) },
    { id: "redaktion", name: "Wissensredaktion", beschreibung: "Pflegt Wissenssammlungen und Assistenten für die Organisation.", fest: false, rechte: ["chat", "anhang", "web", "assistent_erstellen", "assistent_freigeben", "wissen_erstellen", "wissen_freigeben", "modell_waehlen", "vertraulich"] },
    { id: "mitarbeitende", name: "Mitarbeitende", beschreibung: "Alle angemeldeten Mitarbeiterinnen und Mitarbeiter.", fest: false, rechte: ["chat", "anhang", "web", "assistent_erstellen", "wissen_erstellen", "modell_waehlen", "vertraulich"] },
    { id: "lernende", name: "Lernende", beschreibung: "Optional: eingeschränkter Zugang für Lernende (nur freigegebene Assistenten).", fest: false, rechte: ["chat"] },
  ];

  // Schutzbedarf (Klassifizierung nach ISMS) – bestimmt, welche Betriebsorte zulässig sind
  const SCHUTZ = [
    { id: "oeffentlich", name: "Öffentlich", kurz: "Ö", text: "Für die Öffentlichkeit bestimmt, z. B. Website-Texte, Merkblätter." },
    { id: "intern", name: "Intern", kurz: "I", text: "Nur für Mitarbeitende, keine Personendaten, z. B. Abläufe, Vorlagen." },
    { id: "vertraulich", name: "Vertraulich", kurz: "V", text: "Personendaten oder Geschäftsgeheimnisse, z. B. Personalakten, Elternkorrespondenz." },
    { id: "geheim", name: "Besonders schützenswert", kurz: "B", text: "Besonders schützenswerte Personendaten, z. B. Gesundheit, Massnahmen, Sonderpädagogik." },
  ];

  // Betriebsorte: interner Server oder geprüfte Schweizer Anbieter. art: intern | ch-api | ch-gpu | extern
  const BETRIEBSORTE = [
    {
      id: "bo-intern", name: "Interner KI-Server", art: "intern", standort: "Serverraum Schule Muster (eigene Hardware)",
      url: "https://ki.intern.schule-muster.example/v1", schnittstelle: "OpenAI-kompatibel (vLLM)", maxSchutz: "geheim",
      hardware: "2 × GPU-Server, je 4 × 80 GB GPU-Speicher", zert: "eigener Betrieb nach ISMS", cloudAct: false, avv: "nicht nötig (eigener Betrieb)",
      freigabe: "freigegeben", geprueft: "2026-11-10", aktiv: true, quelle: "", zustand: { ok: true, ms: 38, last: 62 },
    },
    {
      id: "bo-infomaniak", name: "Infomaniak – AI Tools / Inferenz-API", art: "ch-api", standort: "Genf (Rechenzentren in der Schweiz)",
      url: "https://api.infomaniak.com/1/ai/…/openai", schnittstelle: "OpenAI-kompatibel", maxSchutz: "vertraulich",
      hardware: "geteilte Inferenz", zert: "ISO 27001; keine Speicherung der Anfragen laut Anbieter", cloudAct: false, avv: "abgeschlossen",
      freigabe: "freigegeben", geprueft: "2026-11-12", aktiv: true, quelle: "https://www.infomaniak.com", zustand: { ok: true, ms: 210, last: null },
    },
    {
      id: "bo-phoeniqs", name: "PHOENIQS – Inferenz-API", art: "ch-api", standort: "Arlesheim BL (Rechenzentrum), Sitz Freienbach",
      url: "https://api.phoeniqs.example/v1", schnittstelle: "OpenAI-kompatibel", maxSchutz: "vertraulich",
      hardware: "geteilte Inferenz, Confidential Computing laut Anbieter", zert: "DSG/DSGVO laut Anbieter", cloudAct: false, avv: "in Prüfung",
      freigabe: "pruefung", geprueft: "", aktiv: false, quelle: "https://www.phoeniqs.com", zustand: { ok: null, ms: null, last: null },
    },
    {
      id: "bo-swisscom", name: "Swisscom – Swiss AI Platform", art: "ch-api", standort: "Schweiz (mehrere Standorte)",
      url: "https://…swisscom…/v1", schnittstelle: "OpenAI-kompatibel", maxSchutz: "vertraulich",
      hardware: "geteilte bzw. dedizierte Inferenz", zert: "revDSG, ISO, FINMA laut Anbieter", cloudAct: false, avv: "offen",
      freigabe: "pruefung", geprueft: "", aktiv: false, quelle: "https://www.swisscom.ch", zustand: { ok: null, ms: null, last: null },
    },
    {
      id: "bo-safeswiss", name: "Safe Swiss Cloud – Inferenz-API", art: "ch-api", standort: "Zürich",
      url: "https://…safeswisscloud…/v1", schnittstelle: "OpenAI-kompatibel", maxSchutz: "vertraulich",
      hardware: "geteilte Inferenz", zert: "ISO 27001/27017/27018, revDSG laut Anbieter", cloudAct: false, avv: "offen",
      freigabe: "pruefung", geprueft: "", aktiv: false, quelle: "https://www.safeswisscloud.ch", zustand: { ok: null, ms: null, last: null },
    },
    {
      id: "bo-exoscale", name: "Exoscale – Dedicated Inference (Zone CH)", art: "ch-gpu", standort: "Genf (CH-GVA-2) und Zürich (CH-DK-2)",
      url: "https://…exoscale…/v1", schnittstelle: "OpenAI-kompatibel (eigenes Modell auf GPU)", maxSchutz: "vertraulich",
      hardware: "dedizierte GPU-Instanz", zert: "ISO laut Anbieter", cloudAct: false, avv: "offen",
      freigabe: "pruefung", geprueft: "", aktiv: false, quelle: "https://www.exoscale.com", zustand: { ok: null, ms: null, last: null },
    },
    {
      id: "bo-cloudscale", name: "cloudscale.ch – GPU-Server (selbst betrieben)", art: "ch-gpu", standort: "Rümlang ZH und Lupfig AG",
      url: "https://ki-cloud.schule-muster.example/v1", schnittstelle: "OpenAI-kompatibel (eigener vLLM auf gemieteter GPU)", maxSchutz: "vertraulich",
      hardware: "gemietete GPU-VM, Betrieb durch die Schule", zert: "Schweizer Hosting", cloudAct: false, avv: "abgeschlossen",
      freigabe: "freigegeben", geprueft: "2026-11-15", aktiv: true, quelle: "https://www.cloudscale.ch", zustand: { ok: true, ms: 64, last: 35 },
    },
    {
      id: "bo-maia", name: "MAIA – KI-Plattform (Hosting EU)", art: "extern", standort: "EU laut Anbieter",
      url: "https://…getmaia…/api", schnittstelle: "eigene API", maxSchutz: "intern",
      hardware: "Plattform (SaaS)", zert: "DSGVO laut Anbieter, ISO 27001 im Audit", cloudAct: false, avv: "offen",
      freigabe: "abgelehnt", geprueft: "2026-11-20", aktiv: false, quelle: "https://www.getmaia.ai/de/", zustand: { ok: null, ms: null, last: null },
      bemerkung: "Hosting in der EU, nicht in der Schweiz – nur für Schutzbedarf bis «intern» denkbar; als Komplettplattform nicht als Betriebsort für eigene Modelle geeignet.",
    },
  ];

  // Modellkatalog (offene Modelle). quelle: Modellkarte; betrieb: Betriebsort-ID(s)
  const MODELLE = [
    { id: "m-apertus-70b", name: "Apertus 1.5 70B", kennung: "swiss-ai/Apertus-v1.5-70B", herkunft: "Swiss AI Initiative (ETH Zürich, EPFL, CSCS) · CH", lizenz: "vollständig offen (laut Modellkarte prüfen)", groesse: "70 Mrd.", kontext: "262 144", faehig: ["text", "denken", "mehrsprachig"], betrieb: ["bo-intern", "bo-infomaniak"], aktiv: true, quelle: "https://huggingface.co/swiss-ai", text: "Schweizer Modell, stark mehrsprachig inkl. Schweizerdeutsch und Rätoromanisch; Trainingsdaten und Code offengelegt." },
    { id: "m-apertus-8b", name: "Apertus 1.5 8B", kennung: "swiss-ai/Apertus-v1.5-8B", herkunft: "Swiss AI Initiative · CH", lizenz: "vollständig offen (laut Modellkarte prüfen)", groesse: "8 Mrd.", kontext: "262 144", faehig: ["text", "mehrsprachig", "schnell"], betrieb: ["bo-intern"], aktiv: true, quelle: "https://huggingface.co/swiss-ai", text: "Klein und schnell, läuft auf einer einzelnen GPU – gut für Übersetzen und einfache Texte." },
    { id: "m-qwen", name: "Qwen3.5 397B-A17B", kennung: "Qwen/Qwen3.5-397B-A17B", herkunft: "Qwen (Alibaba) · CN", lizenz: "laut Modellkarte prüfen", groesse: "397 Mrd. (17 Mrd. aktiv)", kontext: "laut Modellkarte", faehig: ["text", "denken", "code", "bild"], betrieb: ["bo-cloudscale"], aktiv: true, quelle: "https://huggingface.co/Qwen", text: "Starkes Allzweckmodell mit Bildverständnis; Mixture-of-Experts, braucht mehrere GPUs." },
    { id: "m-deepseek", name: "DeepSeek V4.1 Flash", kennung: "deepseek-ai/DeepSeek-V4.1-Flash", herkunft: "DeepSeek · CN", lizenz: "MIT", groesse: "552 Mrd. (MoE)", kontext: "laut Modellkarte", faehig: ["text", "denken", "code"], betrieb: [], aktiv: false, quelle: "https://huggingface.co/deepseek-ai", text: "Sehr stark beim Schlussfolgern und Programmieren; für den eigenen Server zu gross – nur über CH-Anbieter sinnvoll." },
    { id: "m-glm", name: "GLM-5.2", kennung: "zai-org/GLM-5.2", herkunft: "Z.ai (Zhipu) · CN", lizenz: "MIT", groesse: "744 Mrd. (40 Mrd. aktiv)", kontext: "≈ 1 Mio.", faehig: ["text", "denken", "code", "werkzeuge"], betrieb: [], aktiv: false, quelle: "https://huggingface.co/zai-org", text: "Stark bei Werkzeugnutzung und langen Aufgaben; grosser Ressourcenbedarf." },
    { id: "m-kimi", name: "Kimi K3", kennung: "moonshotai/Kimi-K3", herkunft: "Moonshot AI · CN", lizenz: "eigene Lizenz (modifizierte MIT, laut Modellkarte prüfen)", groesse: "≈ 2,8 Bio. (MoE)", kontext: "≈ 1 Mio.", faehig: ["text", "denken", "code", "werkzeuge"], betrieb: [], aktiv: false, quelle: "https://huggingface.co/moonshotai", text: "Eines der stärksten offenen Modelle; nur auf grosser Infrastruktur eines Anbieters betreibbar." },
    { id: "m-gptoss", name: "gpt-oss 120B", kennung: "openai/gpt-oss-120b", herkunft: "OpenAI · US (offene Gewichte)", lizenz: "Apache 2.0", groesse: "117 Mrd. (MoE)", kontext: "128 000", faehig: ["text", "denken", "werkzeuge"], betrieb: ["bo-intern"], aktiv: true, quelle: "https://huggingface.co/openai/gpt-oss-120b", text: "Läuft auf einer einzelnen 80-GB-GPU; gutes Verhältnis von Qualität zu Hardware." },
    { id: "m-embed", name: "Qwen3 Embedding 8B", kennung: "Qwen/Qwen3-Embedding-8B", herkunft: "Qwen (Alibaba) · CN", lizenz: "Apache 2.0", groesse: "8 Mrd.", kontext: "32 000", faehig: ["einbettung"], betrieb: ["bo-intern"], aktiv: true, quelle: "https://huggingface.co/Qwen", text: "Erzeugt die Vektoren für den Suchindex der Wissenssammlungen (nicht für den Chat)." },
    { id: "m-whisper", name: "Whisper large-v3", kennung: "openai/whisper-large-v3", herkunft: "OpenAI · US (offene Gewichte)", lizenz: "MIT", groesse: "1,55 Mrd.", kontext: "–", faehig: ["sprache"], betrieb: ["bo-intern"], aktiv: false, quelle: "https://huggingface.co/openai/whisper-large-v3", text: "Transkription von Audio (Sitzungen, Diktate); noch nicht freigeschaltet." },
  ];

  const WISSEN = [
    { id: "w-reglemente", name: "Reglemente und Weisungen", beschreibung: "Organisationsstatut, Schulordnung, ICT-Nutzungsweisung", schutz: "intern", freigabe: { art: "organisation", gruppen: [] }, besitzer: "u2",
      dateien: [{ name: "Schulordnung_2026.pdf", groesse: 412000, status: "indexiert", teile: 38 }, { name: "ICT-Nutzungsweisung.docx", groesse: 98000, status: "indexiert", teile: 14 }, { name: "Organisationsstatut.pdf", groesse: 655000, status: "indexiert", teile: 52 }], favorit: true },
    { id: "w-elternbriefe", name: "Vorlagen Elternkommunikation", beschreibung: "Musterbriefe, Textbausteine, Anrede", schutz: "intern", freigabe: { art: "gruppen", gruppen: ["g-lehrpersonen", "g-schulleitung", "g-verwaltung"] }, besitzer: "u2",
      dateien: [{ name: "Textbausteine_Elternbriefe.docx", groesse: 76000, status: "indexiert", teile: 22 }, { name: "Elternabend_Einladung_Muster.docx", groesse: 31000, status: "indexiert", teile: 4 }], favorit: false },
    { id: "w-ict", name: "ICT-Handbuch", beschreibung: "Anleitungen Geräte, Konten, WLAN, Drucker", schutz: "intern", freigabe: { art: "organisation", gruppen: [] }, besitzer: "u1",
      dateien: [{ name: "Anleitung_Geraeteausgabe.pdf", groesse: 201000, status: "indexiert", teile: 17 }, { name: "Passwort_zuruecksetzen.md", groesse: 6000, status: "indexiert", teile: 2 }, { name: "Druckerliste.xlsx", groesse: 18000, status: "ohne Text", teile: 0 }], favorit: true },
    { id: "w-personal", name: "Personaldossiers (Pilot)", beschreibung: "Nur Schulverwaltung – Verarbeitung ausschliesslich auf dem internen Server", schutz: "vertraulich", freigabe: { art: "gruppen", gruppen: ["g-verwaltung"] }, besitzer: "u3",
      dateien: [{ name: "Pensenuebersicht_2026-27.xlsx", groesse: 44000, status: "indexiert", teile: 9 }], favorit: false },
  ];

  const ASSISTENTEN = [
    { id: "a-elternbrief", name: "Elternbrief-Helfer", symbol: "✉", beschreibung: "Entwirft Briefe und E-Mails an Eltern im Ton der Schule.", anweisung: "Du schreibst Briefe an Eltern im Namen der Schule. Sachlich, freundlich, kurz. Schweizer Hochdeutsch, ss statt ß. Keine Namen von Lernenden erfinden. Am Schluss Rückfragen an das Sekretariat anbieten.", modell: "m-apertus-70b", wissen: ["w-elternbriefe"], web: false, schutz: "intern", freigabe: { art: "gruppen", gruppen: ["g-lehrpersonen", "g-schulleitung"] }, besitzer: "u2", favorit: true, starter: ["Einladung zum Elternabend am Donnerstag, 19.30 Uhr", "Information zur Projektwoche"] },
    { id: "a-einfach", name: "Einfache Sprache", symbol: "Aa", beschreibung: "Formuliert Texte in einfacher Sprache (Niveau A2/B1) um.", anweisung: "Formuliere den Text in einfacher Sprache um: kurze Sätze, bekannte Wörter, eine Aussage pro Satz. Bedeutung nicht verändern.", modell: "m-apertus-8b", wissen: [], web: false, schutz: "intern", freigabe: { art: "organisation", gruppen: [] }, besitzer: "u8", favorit: false, starter: ["Diesen Absatz vereinfachen: …"] },
    { id: "a-uebersetzen", name: "Übersetzen", symbol: "⇄", beschreibung: "Übersetzt in Landessprachen und häufige Herkunftssprachen.", anweisung: "Übersetze genau und vollständig. Nenne am Schluss Begriffe, die kulturell erklärt werden sollten.", modell: "m-apertus-70b", wissen: [], web: false, schutz: "intern", freigabe: { art: "organisation", gruppen: [] }, besitzer: "u1", favorit: true, starter: ["Ins Albanische übersetzen: …", "Auf Rätoromanisch (Rumantsch Grischun): …"] },
    { id: "a-ict", name: "ICT-Support", symbol: "⚙", beschreibung: "Beantwortet Fragen zu Geräten und Konten aus dem ICT-Handbuch.", anweisung: "Beantworte nur mit dem ICT-Handbuch. Wenn die Antwort fehlt, verweise auf ein Support-Ticket.", modell: "m-gptoss", wissen: ["w-ict"], web: false, schutz: "intern", freigabe: { art: "organisation", gruppen: [] }, besitzer: "u1", favorit: false, starter: ["Wie setze ich mein Passwort zurück?", "Wo hole ich ein Ersatzgerät?"] },
  ];

  const UNTERHALTUNGEN = [
    {
      id: "c1", titel: "Merkblatt Medienkompetenz kürzen", modell: "m-apertus-70b", assistent: null, wissen: [], schutz: "intern", angeheftet: true, geaendert: "2026-11-22T15:20",
      nachrichten: [
        { rolle: "ich", text: "Kannst du das Merkblatt zur Medienkompetenz auf eine A4-Seite kürzen? Zielgruppe sind Eltern der 1. Sek.", zeit: "2026-11-22T15:18" },
        { rolle: "ki", text: "Gerne. Hier ein Vorschlag mit vier Abschnitten:\n\n**1. Worum es geht** – Ihr Kind nutzt digitale Medien im Unterricht und zu Hause. Wir begleiten es dabei.\n\n**2. Was die Schule macht** – Unterricht nach Lehrplan 21 (Medien und Informatik), klare Regeln zur Gerätenutzung, Ansprechperson bei Problemen.\n\n**3. Was Sie tun können** – Bildschirmzeiten gemeinsam abmachen, Interesse zeigen, Geräte nachts ausserhalb des Zimmers laden.\n\n**4. Kontakt** – Bei Fragen wenden Sie sich an die Klassenlehrperson.", zeit: "2026-11-22T15:18", modell: "m-apertus-70b", ort: "bo-intern", tokens: 312, dauer: 4.1 },
      ],
    },
    {
      id: "c2", titel: "Passwort-Reset Lernende", modell: "m-gptoss", assistent: "a-ict", wissen: ["w-ict"], schutz: "intern", angeheftet: false, geaendert: "2026-11-21T10:02",
      nachrichten: [
        { rolle: "ich", text: "Wie setze ich das Passwort eines Lernenden zurück?", zeit: "2026-11-21T10:01" },
        { rolle: "ki", text: "Laut ICT-Handbuch geht das so:\n\n1. Im Verwaltungsportal unter «Konten» die Person suchen.\n2. «Passwort zurücksetzen» wählen – es entsteht ein Einmal-Passwort.\n3. Das Einmal-Passwort persönlich übergeben; beim ersten Anmelden muss ein neues gesetzt werden.", zeit: "2026-11-21T10:02", modell: "m-gptoss", ort: "bo-intern", tokens: 148, dauer: 1.6, quellen: [{ wissen: "w-ict", datei: "Passwort_zuruecksetzen.md", stelle: "Abschnitt 2" }] },
      ],
    },
    { id: "c3", titel: "Einladung Elternabend 3. Sek", modell: "m-apertus-70b", assistent: "a-elternbrief", wissen: ["w-elternbriefe"], schutz: "intern", angeheftet: false, geaendert: "2026-11-18T13:40", nachrichten: [] },
    { id: "c4", titel: "Traktandenliste Teamsitzung", modell: "m-qwen", assistent: null, wissen: [], schutz: "intern", angeheftet: false, geaendert: "2026-11-04T08:15", nachrichten: [] },
    { id: "c5", titel: "Pensenübersicht prüfen", modell: "m-apertus-70b", assistent: null, wissen: ["w-personal"], schutz: "vertraulich", angeheftet: false, geaendert: "2026-10-28T17:30", nachrichten: [] },
  ];

  // Werkzeuge / Anbindungen (über Model Context Protocol oder intern)
  const WERKZEUGE = [
    { id: "t-dateien", name: "Dateien lesen", art: "intern", text: "PDF, Word, Excel, Text und Bilder aus Anhängen lesen", aktiv: true, maxSchutz: "geheim" },
    { id: "t-wissen", name: "Wissenssammlungen", art: "intern", text: "Suche im eigenen Suchindex (Vektorsuche, interner Server)", aktiv: true, maxSchutz: "geheim" },
    { id: "t-web", name: "Websuche", art: "extern", text: "Suchanfragen verlassen die Schule – nur bei Schutzbedarf «öffentlich»", aktiv: true, maxSchutz: "oeffentlich" },
    { id: "t-codex", name: "EduKSX-Codex", art: "eduksx", text: "Rechtssammlung: Erlasse von Bund, Kanton und Gemeinde nachschlagen", aktiv: true, maxSchutz: "intern", url: "https://…/codex/mcp" },
    { id: "t-glossary", name: "EduKSX-Glossary", art: "eduksx", text: "Begriffe der Volksschule einheitlich erklären", aktiv: true, maxSchutz: "intern", url: "https://glossary.eduksx.ch/mcp" },
    { id: "t-flow", name: "EduKSX-Flow", art: "eduksx", text: "Termine und Abläufe der Jahresplanung abfragen", aktiv: false, maxSchutz: "intern", url: "https://…/flow/mcp" },
  ];

  const VORSCHLAEGE = [
    ["✉", "Elternbrief entwerfen", "Entwirf einen kurzen Elternbrief zur Projektwoche vom 9. bis 13. März."],
    ["Aa", "In einfache Sprache", "Formuliere diesen Text in einfacher Sprache: «Die Schulpflege hat die Anpassung der Blockzeiten beschlossen.»"],
    ["☰", "Sitzung zusammenfassen", "Fasse die folgenden Notizen als Protokoll mit Beschlüssen und Pendenzen zusammen: …"],
    ["§", "Rechtsgrundlage finden", "Welche Rechtsgrundlage regelt im Kanton Zürich die Dispensation vom Unterricht?"],
  ];

  return { ORGANISATION, ICH, BENUTZER, GRUPPEN, RECHTE, ROLLEN, SCHUTZ, BETRIEBSORTE, MODELLE, WISSEN, ASSISTENTEN, UNTERHALTUNGEN, WERKZEUGE, VORSCHLAEGE };
})();
