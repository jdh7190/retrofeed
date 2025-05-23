var CACHE_NAME = 'v0.50';
var urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/info/index.html',
  '/profile/index.html',
  '/reader/index.html',
  '/sMon/index.html',
  '/tx/index.html',
  '/scripts/api.js',
  '/scripts/bSocial.js',
  '/scripts/bsv-ecies.min.js',
  '/scripts/bsv.browser.min.js',
  '/scripts/config.js',
  '/scripts/chat.js',
  '/scripts/helpers.js',
  '/scripts/html.js',
  '/scripts/interactions.js',
  '/scripts/like.js',
  '/scripts/message.js',
  '/scripts/ordinals.js',
  '/scripts/picmo.min.js',
  '/scripts/popup-picker.min.js',
  '/scripts/post.js',
  '/scripts/profile.js',
  '/scripts/readability.js',
  '/scripts/relayone.js',
  '/scripts/retro.js',
  '/scripts/SHUAllet.js',
  '/styles/base.css',
  '/styles/chat.css',
  '/styles/icons.css',
  '/styles/info.css',
  '/styles/modal.css',
  '/styles/ordinals.css',
  '/styles/orig.css',
  '/styles/profile.css',
  '/styles/pwa.min.css',
  '/styles/read.css',
  '/styles/tx.css',
  '/styles/wallet.css',
  '/assets/images/back.png',
  '/assets/images/back.svg',
  '/assets/images/chat.png',
  '/assets/images/reply.png',
  '/assets/images/emoji-reaction.svg',
  '/assets/images/feed.png',
  '/assets/images/hc_icon.png',
  '/assets/images/profile.svg',
  '/assets/images/question_block_32.png',
  '/assets/images/relayx.svg',
  '/assets/images/shuacoin.png',
  '/assets/images/userprofile.png',
  '/assets/images/videoplay.png',
  '/assets/sounds/heartpiece.wav',
  '/assets/sounds/nes_coin.wav',
  '/assets/sounds/get_heart.wav',
  '/assets/sounds/pickupCoin.wav',
  '/assets/fonts/ndsbios.ttf',
  '/sMon/stats/sMonStats.js'
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