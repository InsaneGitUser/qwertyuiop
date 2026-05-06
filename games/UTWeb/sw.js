self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('game.unx')) {
    event.respondWith(
      fetch('https://github.com/InsaneGitUser/key/raw/refs/heads/main/games/UTWeb/game.unx')
    );
  }
});
