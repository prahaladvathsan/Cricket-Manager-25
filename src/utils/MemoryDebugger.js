/**
 * @file MemoryDebugger.js
 * @description Comprehensive memory leak debugging utilities
 */

class MemoryDebugger {
  constructor() {
    this.snapshots = [];
    this.matchCount = 0;
    this.startMemory = null;
    this.componentCounts = {};
    this._storeSetCounts = {};   // storeName → count of set() calls
    this._patchedStores = new Set();
  }

  /**
   * Initialize memory tracking
   */
  initialize() {
    this.startMemory = this.getMemoryUsage();
    console.log('🔍 Memory Debugger Initialized');
    console.log(`📊 Initial Memory: ${this.startMemory.usedMB.toFixed(2)} MB`);

    // Track initial object counts
    this.logObjectCounts('INITIAL');
  }

  /**
   * Get current memory usage (works in Chrome)
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        usedMB: performance.memory.usedJSHeapSize / 1048576,
        totalMB: performance.memory.totalJSHeapSize / 1048576,
        limitMB: performance.memory.jsHeapSizeLimit / 1048576,
        usedBytes: performance.memory.usedJSHeapSize
      };
    }
    return { usedMB: 0, totalMB: 0, limitMB: 0, usedBytes: 0 };
  }

  /**
   * Log memory after each match
   */
  logMatchMemory(matchNumber, stores = {}) {
    this.matchCount = matchNumber;
    const memory = this.getMemoryUsage();
    const delta = memory.usedMB - this.startMemory.usedMB;
    const perMatch = delta / matchNumber;

    console.group(`🏏 Match ${matchNumber} Memory Report`);
    console.log(`📊 Current: ${memory.usedMB.toFixed(2)} MB`);
    console.log(`📈 Delta: +${delta.toFixed(2)} MB`);
    console.log(`📉 Per Match Avg: ${perMatch.toFixed(2)} MB`);
    console.log(`⚠️ Heap Limit: ${memory.limitMB.toFixed(2)} MB`);
    console.log(`🎯 Usage: ${((memory.usedMB / memory.limitMB) * 100).toFixed(1)}%`);

    // Store snapshot
    this.snapshots.push({
      match: matchNumber,
      memory: memory.usedMB,
      delta,
      timestamp: Date.now()
    });

    // Log store sizes
    if (Object.keys(stores).length > 0) {
      console.log('\n📦 Store Sizes:');
      for (const [name, store] of Object.entries(stores)) {
        const state = store.getState();
        const size = this.estimateObjectSize(state);
        console.log(`  ${name}: ${(size / 1024).toFixed(2)} KB`);
      }
    }

    // Check for memory leak pattern
    if (matchNumber >= 5) {
      const recentSnapshots = this.snapshots.slice(-5);
      const avgGrowth = recentSnapshots.reduce((sum, s, i) => {
        if (i === 0) return 0;
        return sum + (s.memory - recentSnapshots[i - 1].memory);
      }, 0) / 4;

      if (avgGrowth > 5) {
        console.warn(`⚠️ LEAK DETECTED: Growing ${avgGrowth.toFixed(2)} MB per match!`);
      }
    }

    console.groupEnd();
  }

  /**
   * Estimate object size in bytes (rough approximation)
   */
  estimateObjectSize(obj) {
    const seen = new WeakSet();

    const sizeof = (value) => {
      if (value === null || value === undefined) return 0;

      const type = typeof value;

      if (type === 'boolean') return 4;
      if (type === 'number') return 8;
      if (type === 'string') return value.length * 2;

      if (type === 'object') {
        if (seen.has(value)) return 0; // Circular reference
        seen.add(value);

        let size = 0;

        if (Array.isArray(value)) {
          size += value.length * 8; // Array overhead
          value.forEach(item => size += sizeof(item));
        } else {
          const keys = Object.keys(value);
          size += keys.length * 8; // Object overhead
          keys.forEach(key => {
            size += key.length * 2; // Key size
            size += sizeof(value[key]); // Value size
          });
        }

        return size;
      }

      return 0;
    };

    return sizeof(obj);
  }

  /**
   * Log counts of specific object types in stores
   */
  logObjectCounts(label = '') {
    console.group(`🔢 Object Counts ${label ? `(${label})` : ''}`);

    // Count DOM nodes
    console.log(`DOM Nodes: ${document.getElementsByTagName('*').length}`);

    // Count event listeners (approximate)
    const eventListenerEstimate = this.countEventListeners();
    console.log(`Event Listeners (est): ${eventListenerEstimate}`);

    console.groupEnd();
  }

  /**
   * Estimate event listener count (rough heuristic)
   * Note: getEventListeners is only available in DevTools console, not in code
   */
  countEventListeners() {
    // getEventListeners is a DevTools-only API, not available in regular code
    // We can't accurately count listeners from code, so return estimate
    const elements = document.getElementsByTagName('*');

    // Rough estimate: assume 10% of elements have listeners
    return Math.round(elements.length * 0.1);
  }

  /**
   * Log detailed store breakdown
   */
  logStoreBreakdown(stores) {
    console.group('📊 Detailed Store Breakdown');

    for (const [name, store] of Object.entries(stores)) {
      const state = store.getState();
      console.group(`📦 ${name}`);

      // Count arrays
      const arrays = {};
      const traverse = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const fullPath = path ? `${path}.${key}` : key;

          if (Array.isArray(value)) {
            arrays[fullPath] = value.length;
          } else if (value && typeof value === 'object') {
            traverse(value, fullPath);
          }
        });
      };

      traverse(state);

      console.table(arrays);
      console.groupEnd();
    }

    console.groupEnd();
  }

  /**
   * Check for IndexedDB growth
   */
  async logIndexedDBSize() {
    if (!navigator.storage || !navigator.storage.estimate) {
      console.log('❌ Storage API not available');
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usageMB = estimate.usage / 1048576;
      const quotaMB = estimate.quota / 1048576;

      console.group('💾 IndexedDB Storage');
      console.log(`Usage: ${usageMB.toFixed(2)} MB`);
      console.log(`Quota: ${quotaMB.toFixed(2)} MB`);
      console.log(`Percent: ${((usageMB / quotaMB) * 100).toFixed(2)}%`);
      console.groupEnd();
    } catch (error) {
      console.error('Failed to estimate storage:', error);
    }
  }

  /**
   * Generate memory report
   */
  generateReport() {
    console.group('📋 FINAL MEMORY REPORT');
    console.log(`Matches Simulated: ${this.matchCount}`);
    console.log(`Initial Memory: ${this.startMemory.usedMB.toFixed(2)} MB`);

    const currentMemory = this.getMemoryUsage();
    console.log(`Final Memory: ${currentMemory.usedMB.toFixed(2)} MB`);
    console.log(`Total Growth: +${(currentMemory.usedMB - this.startMemory.usedMB).toFixed(2)} MB`);

    if (this.snapshots.length > 0) {
      console.log('\n📈 Growth Pattern:');
      console.table(this.snapshots);
    }

    console.groupEnd();
  }

  /**
   * Patch a Zustand store to count set() calls.
   * Call once per store before simulation starts.
   * @param {string} name - Store name for logging
   * @param {Object} store - Zustand store (useStore)
   */
  patchStoreSetCounter(name, store) {
    if (this._patchedStores.has(name)) return; // Already patched
    this._patchedStores.add(name);
    this._storeSetCounts[name] = 0;

    const originalSetState = store.setState.bind(store);
    store.setState = (...args) => {
      this._storeSetCounts[name]++;
      return originalSetState(...args);
    };
  }

  /** Reset all set() counters (call before each match) */
  resetSetCounters() {
    for (const name in this._storeSetCounts) {
      this._storeSetCounts[name] = 0;
    }
  }

  /** Get current set() counts */
  getSetCounts() {
    return { ...this._storeSetCounts };
  }

  /**
   * Log a full per-match diagnostic: heap before, set() counts, heap after.
   * Call AFTER match completes and resetMatch().
   * @param {number} matchNumber
   */
  logMatchDiagnostic(matchNumber) {
    const mem = this.getMemoryUsage();
    const delta = mem.usedMB - this.startMemory.usedMB;
    const perMatch = delta / matchNumber;
    const setCounts = this.getSetCounts();
    const totalSets = Object.values(setCounts).reduce((a, b) => a + b, 0);

    console.log(
      `[MEM] Match ${matchNumber} | ` +
      `Heap: ${mem.usedMB.toFixed(0)}MB (+${delta.toFixed(0)}MB total, ${perMatch.toFixed(1)}MB/match) | ` +
      `set() calls: ${totalSets} (${Object.entries(setCounts).map(([k, v]) => `${k}:${v}`).join(', ')})`
    );

    this.snapshots.push({
      match: matchNumber,
      memory: mem.usedMB,
      delta,
      setCounts: { ...setCounts },
      timestamp: Date.now()
    });

    this.resetSetCounters();
  }

  /**
   * Force garbage collection (Chrome only, requires --enable-precise-memory-info flag)
   */
  forceGC() {
    if (window.gc) {
      console.log('🗑️ Forcing garbage collection...');
      window.gc();
      setTimeout(() => {
        const memory = this.getMemoryUsage();
        console.log(`✅ After GC: ${memory.usedMB.toFixed(2)} MB`);
      }, 100);
    } else {
      console.warn('⚠️ GC not available (run Chrome with --js-flags="--expose-gc")');
    }
  }

  /**
   * Create heap snapshot (requires DevTools open)
   */
  takeHeapSnapshot() {
    console.log('📸 Take heap snapshot in Chrome DevTools:');
    console.log('1. Open DevTools');
    console.log('2. Go to Memory tab');
    console.log('3. Click "Take heap snapshot"');
    console.log('4. Compare snapshots before/after matches');
  }
}

// Create singleton instance
const memoryDebugger = new MemoryDebugger();

export default memoryDebugger;
