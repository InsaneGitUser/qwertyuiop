self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('game.unx')) {
    event.respondWith(
      fetch('http://77network.org/storage/game.unx')
    );
  }
});
