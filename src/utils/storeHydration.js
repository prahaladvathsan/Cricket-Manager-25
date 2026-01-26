/**
 * @file storeHydration.js
 * @description Tracks hydration state of all Zustand stores with async storage
 *
 * Since IndexedDB is async, stores need time to rehydrate from storage.
 * This utility tracks when all stores are ready before rendering the app.
 */

// Track hydration status for each store
const hydrationStatus = {
  game: false,
  team: false,
  player: false,
  league: false,
  finance: false,
  match: false,
  auction: false,
  inbox: false,
  transfer: false,
  auth: false
};

// Callbacks to notify when all stores are hydrated
const listeners = new Set();

/**
 * Mark a store as hydrated
 * @param {string} storeName - Name of the store
 */
export function markHydrated(storeName) {
  hydrationStatus[storeName] = true;
  console.log(`💾 Store hydrated: ${storeName}`);

  if (isAllHydrated()) {
    console.log('✅ All stores hydrated');
    listeners.forEach(callback => callback());
    listeners.clear();
  }
}

/**
 * Check if all stores are hydrated
 * @returns {boolean}
 */
export function isAllHydrated() {
  return Object.values(hydrationStatus).every(status => status);
}

/**
 * Get current hydration status
 * @returns {Object}
 */
export function getHydrationStatus() {
  return { ...hydrationStatus };
}

/**
 * Wait for all stores to be hydrated
 * @param {number} timeout - Maximum time to wait in ms (default 5000)
 * @returns {Promise<void>}
 */
export function waitForHydration(timeout = 5000) {
  return new Promise(resolve => {
    if (isAllHydrated()) {
      resolve();
      return;
    }

    // Set timeout to avoid infinite wait
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Hydration timeout - proceeding anyway. Status:', getHydrationStatus());
      listeners.delete(resolve);
      resolve();
    }, timeout);

    // Clean up timeout when resolved normally
    const wrappedResolve = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    listeners.add(wrappedResolve);
  });
}

/**
 * Reset hydration status (for testing)
 */
export function resetHydration() {
  Object.keys(hydrationStatus).forEach(key => {
    hydrationStatus[key] = false;
  });
}
