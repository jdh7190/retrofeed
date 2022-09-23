var CACHE_NAME = 'v0.01';
var urlsToCache = [
  /* '/index.html',
  '/login/index.html',
  '/info/index.html',
  '/styles/info.css',
  '/styles/login.css',
  '/styles/orig.css',
  '/styles/dialog-polyfill.css',
  '/scripts/dialog-polyfill.js',
  '/scripts/login.js',
  '/scripts/retro.js',
  '/scripts/BSVABI.js',
  '/styles/nes.min.css',
  '/scripts/bsv.browser.min.js' */
]
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching...')
        cache.addAll(urlsToCache)
      }).then(() => {
        self.skipWaiting();
      })
  )
})
self.addEventListener('activate', event => {
  console.log('Activated.')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    })
  )
})
self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(
      cached => cached || fetch(e.request))
    );
});