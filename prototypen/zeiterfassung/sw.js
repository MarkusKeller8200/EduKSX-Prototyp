/*
 * EduKSX-Time – Service Worker (Prototyp)
 * Netz zuerst, bei fehlender Verbindung aus dem Zwischenspeicher. So ist nach einem Update sofort der neue Stand da
 * (GitHub Pages hängt ?v=<Prüfsumme> an CSS/JS), und Stempeln geht auch offline.
 * Bei Änderungen an der Dateiliste VERSION erhöhen.
 */
const VERSION = "eduksx-time-0.4.0";
const DATEIEN = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/eduksx.css",
  "assets/time.css",
  "assets/app.js",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/favicon-32.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n.startsWith("eduksx-time-") && n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const anfrage = e.request;
  const url = new URL(anfrage.url);
  if (anfrage.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/entwickler/")) return; // Entwicklerbereich nicht zwischenspeichern (gross, nicht offline nötig)
  e.respondWith(
    fetch(anfrage)
      .then((antwort) => {
        if (antwort.ok) {
          const kopie = antwort.clone();
          caches.open(VERSION).then((c) => c.put(anfrage, kopie));
        }
        return antwort;
      })
      .catch(() =>
        caches.match(anfrage, { ignoreSearch: true }).then((treffer) =>
          treffer || (anfrage.mode === "navigate" ? caches.match("index.html") : Response.error()),
        ),
      ),
  );
});
