var CACHE_NAME = 'v0.06';
var urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/info/index.html',
  '/profile/index.html',
  '/scripts/api.js',
  '/scripts/bSocial.js',
  '/scripts/bsv-ecies.min.js',
  '/scripts/bsv.browser.min.js',
  '/scripts/config.js',
  '/scripts/helpers.js',
  '/scripts/html.js',
  '/scripts/interactions.js',
  '/scripts/like.js',
  '/scripts/message.js',
  '/scripts/post.js',
  '/scripts/profile.js',
  '/scripts/readability.js',
  '/scripts/retro.js',
  '/styles/icons.css',
  '/styles/info.css',
  '/styles/modal.css',
  '/styles/orig.css',
  '/styles/profile.css',
  '/styles/pwa.min.css',
  '/styles/read.css',
  '/styles/tx.css',
  '/assets/images/back.png',
  '/assets/images/back.svg',
  '/assets/images/hc_icon.png',
  '/assets/images/profile.svg',
  '/assets/images/question_block_32.png',
  '/assets/images/videoplay.png',
  '/assets/sounds/heartpiece.wav',
  '/assets/sounds/nes_coin.wav'
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