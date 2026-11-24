/* Tekadu Registration System - service worker
   Cache name is bumped so installed apps pick up this new version.
   NOTE: Firebase / Google traffic is never cached, and the page itself is
   fetched network-first so new deployments show up when the device is online. */
var CACHE = 'tekadu-v3';
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS).catch(function(){}); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var url = e.request.url;
  /* Always let Firebase / Google API / font traffic go straight to the network. */
  if(/firebaseio|googleapis|gstatic|firebaseapp|firebasestorage|identitytoolkit|firebaseinstallations|firebase/.test(url)) return;

  /* The page: network-first so a freshly deployed version loads when online,
     falling back to the cached copy when offline. */
  if(e.request.mode === 'navigate'){
    e.respondWith(
      fetch(e.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        return resp;
      }).catch(function(){
        return caches.match(e.request).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* Other static assets: cache-first, then network. */
  e.respondWith(
    caches.match(e.request).then(function(r){ return r || fetch(e.request); })
  );
});
