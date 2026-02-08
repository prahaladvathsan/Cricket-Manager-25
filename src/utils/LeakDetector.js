/**
 * @file LeakDetector.js
 * @description Out-of-the-box memory leak detection for edge cases
 */

/**
 * Detect potential memory leaks in player data
 */
export function detectPlayerLeaks(playerStore) {
  const players = playerStore.getState().players;
  const playerIds = Object.keys(players);

  console.group('🔍 Player Data Leak Detection');
  console.log(`Total players: ${playerIds.length}`);

  // Check for duplicate player objects
  const playerInstances = new Set();
  let duplicates = 0;

  playerIds.forEach(id => {
    const player = players[id];
    if (playerInstances.has(player)) {
      duplicates++;
    } else {
      playerInstances.add(player);
    }
  });

  if (duplicates > 0) {
    console.warn(`⚠️ Found ${duplicates} duplicate player objects!`);
  } else {
    console.log('✅ No duplicate player objects');
  }

  // Check career stats size
  const careerStats = playerStore.getState().careerStats || {};
  const statsKeys = Object.keys(careerStats);
  console.log(`Career stats entries: ${statsKeys.length}`);

  // Sample a career stats entry
  if (statsKeys.length > 0) {
    const sample = careerStats[statsKeys[0]];
    const sampleStr = JSON.stringify(sample);
    console.log(`Sample career stat size: ${sampleStr.length} chars`);

    if (sampleStr.length > 1000) {
      console.warn('⚠️ Career stats are unusually large - possible leak!');
      console.log('Sample:', sample);
    }
  }

  console.groupEnd();
}

/**
 * Detect leaks in tactics cache
 */
export function detectTacticsLeaks(aiTacticsManager) {
  console.group('🔍 AI Tactics Cache Leak Detection');

  // Check if cache exists and its size
  if (aiTacticsManager.tacticsCache) {
    const cacheSize = aiTacticsManager.tacticsCache.size;
    console.log(`Tactics cache size: ${cacheSize} entries`);

    if (cacheSize > 20) {
      console.warn(`⚠️ Tactics cache has ${cacheSize} entries (expected: 10)!`);
    } else {
      console.log('✅ Tactics cache size is normal');
    }
  } else {
    console.log('No tactics cache found');
  }

  console.groupEnd();
}

/**
 * Detect IndexedDB transaction queue buildup
 */
export async function detectIndexedDBLeaks() {
  console.group('🔍 IndexedDB Leak Detection');

  try {
    // Check if there are open database connections
    const dbs = await indexedDB.databases();
    console.log(`Open databases: ${dbs.length}`);

    dbs.forEach(db => {
      console.log(`  - ${db.name} (version ${db.version})`);
    });

    // Check storage usage
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usageMB = (estimate.usage / 1048576).toFixed(2);
      const quotaMB = (estimate.quota / 1048576).toFixed(2);

      console.log(`Storage usage: ${usageMB}MB / ${quotaMB}MB`);

      if (estimate.usage > 50 * 1048576) { // 50MB
        console.warn(`⚠️ IndexedDB using ${usageMB}MB - may be accumulating!`);
      }
    }
  } catch (error) {
    console.error('Failed to check IndexedDB:', error);
  }

  console.groupEnd();
}

/**
 * Detect closure leaks in callbacks
 */
export function detectClosureLeaks() {
  console.group('🔍 Closure Leak Detection');

  // Check global callbacks
  const globalCallbacks = [];

  if (window.onEvent) globalCallbacks.push('onEvent');
  if (window.onProgress) globalCallbacks.push('onProgress');
  if (window.onComplete) globalCallbacks.push('onComplete');

  if (globalCallbacks.length > 0) {
    console.warn(`⚠️ Found global callbacks: ${globalCallbacks.join(', ')}`);
    console.log('These may create closure leaks if not cleaned up');
  } else {
    console.log('✅ No global callbacks found');
  }

  console.groupEnd();
}

/**
 * Detect React state leaks
 */
export function detectReactLeaks() {
  console.group('🔍 React State Leak Detection');

  // Count React fiber nodes (requires React DevTools)
  const root = document.getElementById('root');

  if (root) {
    // Count child nodes recursively
    const countNodes = (node) => {
      let count = 1;
      for (let i = 0; i < node.children.length; i++) {
        count += countNodes(node.children[i]);
      }
      return count;
    };

    const nodeCount = countNodes(root);
    console.log(`DOM node count: ${nodeCount}`);

    if (nodeCount > 5000) {
      console.warn(`⚠️ High DOM node count: ${nodeCount} - possible React leak!`);
    } else {
      console.log('✅ DOM node count is normal');
    }
  }

  console.groupEnd();
}

/**
 * Detect leaks in match engine
 */
export function detectMatchEngineLeaks(matchStore) {
  console.group('🔍 Match Engine Leak Detection');

  const state = matchStore.getState();

  // Check ballByBall array
  if (state.ballByBall && state.ballByBall.length > 0) {
    console.warn(`⚠️ ballByBall array not cleared: ${state.ballByBall.length} balls`);
  } else {
    console.log('✅ ballByBall array is clear');
  }

  // Check commentary array
  if (state.commentary && state.commentary.length > 0) {
    console.warn(`⚠️ commentary array not cleared: ${state.commentary.length} entries`);
  } else {
    console.log('✅ commentary array is clear');
  }

  // Check matchConditions object
  const conditionKeys = Object.keys(state.matchConditions || {});
  if (conditionKeys.length > 0) {
    console.warn(`⚠️ matchConditions not cleared: ${conditionKeys.length} players`);
  } else {
    console.log('✅ matchConditions is clear');
  }

  // Check results array
  if (state.results && state.results.length > 0) {
    console.warn(`⚠️ results array not cleared: ${state.results.length} innings`);
  } else {
    console.log('✅ results array is clear');
  }

  console.groupEnd();
}

/**
 * Detect league store accumulation
 */
export function detectLeagueStoreLeaks(leagueStore) {
  console.group('🔍 League Store Leak Detection');

  const state = leagueStore.getState();

  // Check results array
  if (state.results) {
    console.log(`results array: ${state.results.length} matches`);

    // Calculate average result size
    if (state.results.length > 0) {
      const sampleSize = JSON.stringify(state.results[0]).length;
      const totalSize = sampleSize * state.results.length;
      const totalMB = (totalSize / 1048576).toFixed(2);

      console.log(`Estimated results size: ${totalMB}MB`);

      if (totalSize > 1048576) { // 1MB
        console.warn(`⚠️ results array using ${totalMB}MB - may contribute to OOM`);
      }
    }
  }

  // Check fixtures array
  if (state.fixtures) {
    console.log(`fixtures array: ${state.fixtures.length} fixtures`);
  }

  console.groupEnd();
}

/**
 * Run all leak detection checks
 */
export async function runAllLeakDetection(stores) {
  console.log('🚨 Running Comprehensive Leak Detection');
  console.log('═'.repeat(50));

  if (stores.playerStore) detectPlayerLeaks(stores.playerStore);
  if (stores.matchStore) detectMatchEngineLeaks(stores.matchStore);
  if (stores.leagueStore) detectLeagueStoreLeaks(stores.leagueStore);

  await detectIndexedDBLeaks();
  detectClosureLeaks();
  detectReactLeaks();

  console.log('═'.repeat(50));
  console.log('✅ Leak detection complete');
}
