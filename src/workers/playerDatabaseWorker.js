/**
 * @file playerDatabaseWorker.js
 * @description Web Worker for parsing large player database off main thread
 * Prevents UI blocking during 1.9 MB JSON parse
 */

self.addEventListener('message', async (e) => {
  if (e.data.type === 'LOAD_PLAYERS') {
    try {
      // Fetch from public directory
      const response = await fetch('/data/master_player_database.json');
      const text = await response.text();

      // Parse JSON off main thread
      const data = JSON.parse(text);

      // Send parsed data back to main thread
      self.postMessage({
        type: 'PLAYERS_LOADED',
        players: data.players,
        metadata: {
          version: data.version,
          playerCount: data.playerCount,
          generated: data.generated
        }
      });
    } catch (error) {
      self.postMessage({
        type: 'PLAYERS_ERROR',
        error: error.message
      });
    }
  }
});
