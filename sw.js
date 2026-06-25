const CACHE = 'infoici-v4';
const URLS = [
  '/', '/index.html', '/style.css', '/app.js',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return c.addAll(URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.rss2json.com') ||
      e.request.url.includes('wikimedia.org') ||
      e.request.url.includes('wikipedia.org') ||
      e.request.url.includes('wiktionary.org') ||
      e.request.url.includes('wikibooks.org') ||
      e.request.url.includes('wikiquote.org') ||
      e.request.url.includes('wikinews.org') ||
      e.request.url.includes('wttr.in') ||
      e.request.url.includes('googleapis.com') ||
      e.request.url.includes('youtube-nocookie.com')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => new Response(
      'Contenu non disponible hors ligne', { status: 503 }
    )))
  );
});
