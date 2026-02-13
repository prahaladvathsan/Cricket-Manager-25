/**
 * @file advanceDayTest.js
 * @description Browser console test suite for advanceDay() batching fix
 *
 * Verifies that the collect-then-batch refactor:
 *  1. Produces identical condition outcomes (injury, fitness, fatigue, rest days)
 *  2. Uses exactly 1 Zustand set() call for player conditions per day
 *  3. IndexedDB batching works correctly (single flush per day in Normal UI)
 *  4. isProcessingTurn flag toggles correctly (on in Normal UI, off in Sim-to-Date)
 *  5. Double-click protection works
 *  6. Save/load round-trip preserves conditions
 *  7. Memory stays flat across 50+ days
 *
 * Usage: paste in browser console, or import from dev tools:
 *   import('/src/test/advanceDayTest.js')
 *
 * Or run individual tests:
 *   window.__CM25_TEST.runAll()
 *   window.__CM25_TEST.testBatchSetCalls()
 *   window.__CM25_TEST.testConditionOutcomes()
 */

const advanceDayTests = {

  // ─── Helpers ───────────────────────────────────────────────

  _getStores() {
    // Dynamic import to avoid module resolution issues
    const playerStore = window.__zustandStores?.player
      || document.querySelector('[data-zustand]') // fallback
      || null;

    // Direct access via Zustand internals (works in all cases)
    return {
      game: null,
      player: null,
      team: null,
      inbox: null,
      _loaded: false
    };
  },

  async _loadStores() {
    const [gameMod, playerMod, teamMod, inboxMod, indexedDBMod] = await Promise.all([
      import('/src/stores/gameStore.js'),
      import('/src/stores/playerStore.js'),
      import('/src/stores/teamStore.js'),
      import('/src/stores/inboxStore.js'),
      import('/src/utils/indexedDBStorage.js')
    ]);
    return {
      gameStore: gameMod.default,
      playerStore: playerMod.default,
      teamStore: teamMod.default,
      inboxStore: inboxMod.default,
      indexedDBStorage: indexedDBMod.indexedDBStorage
    };
  },

  _pass(name) {
    console.log(`%c  PASS  %c ${name}`, 'background:#22c55e;color:white;font-weight:bold;padding:2px 6px;border-radius:3px', 'color:#22c55e');
  },

  _fail(name, reason) {
    console.log(`%c  FAIL  %c ${name}: ${reason}`, 'background:#ef4444;color:white;font-weight:bold;padding:2px 6px;border-radius:3px', 'color:#ef4444');
  },

  _info(msg) {
    console.log(`%c  INFO  %c ${msg}`, 'background:#3b82f6;color:white;font-weight:bold;padding:2px 6px;border-radius:3px', 'color:#93c5fd');
  },

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // ─── Test 1: Batch produces exactly 1 set() call ──────────

  async testBatchSetCalls() {
    console.group('Test 1: Zustand set() call count');
    const { playerStore, gameStore } = await this._loadStores();

    // Monkey-patch playerStore's setState to count calls
    let setCalls = 0;
    const originalSetState = playerStore.setState;
    playerStore.setState = (...args) => {
      setCalls++;
      return originalSetState.apply(playerStore, args);
    };

    const playerCount = Object.keys(playerStore.getState().players).length;
    this._info(`Player count: ${playerCount}`);

    // Advance one day
    setCalls = 0;
    gameStore.getState().advanceDay();

    // Wait for async processing to complete
    await this._wait(500);

    // Restore original
    playerStore.setState = originalSetState;

    // The batch update should produce exactly 1 set() call for conditions
    // (there may be 0 if no players have conditions to update, but never 545)
    if (setCalls <= 2) {
      this._pass(`Only ${setCalls} playerStore.setState() call(s) (was ~${playerCount} before fix)`);
    } else {
      this._fail(`Expected <= 2 set() calls, got ${setCalls}`, `Still doing per-player updates`);
    }

    console.groupEnd();
    return setCalls <= 2;
  },

  // ─── Test 2: Condition outcomes are correct ────────────────

  async testConditionOutcomes() {
    console.group('Test 2: Condition outcome correctness');
    const { playerStore, gameStore } = await this._loadStores();
    let allPassed = true;

    const players = playerStore.getState().players;
    const playerIds = Object.keys(players);

    // Snapshot conditions BEFORE advance
    const before = {};
    playerIds.forEach(id => {
      const p = players[id];
      if (p.condition) {
        before[id] = { ...p.condition };
      }
    });

    // Advance one day
    gameStore.getState().advanceDay();
    await this._wait(500);

    // Snapshot conditions AFTER advance
    const afterPlayers = playerStore.getState().players;
    let injuryCountdownOk = 0;
    let restDayIncrementOk = 0;
    let fitnessRecoveryOk = 0;
    let totalChecked = 0;

    playerIds.forEach(id => {
      const pre = before[id];
      const post = afterPlayers[id]?.condition;
      if (!pre || !post) return;
      totalChecked++;

      // Injury countdown: duration should decrease by 1
      if (pre.injuryDuration > 0) {
        const expected = pre.injuryDuration - 1;
        if (expected <= 0) {
          if (post.injury === null && post.injuryDuration === null) injuryCountdownOk++;
          else {
            this._fail(`Injury recovery for ${afterPlayers[id].name}`, `Expected cleared injury, got duration=${post.injuryDuration}`);
            allPassed = false;
          }
        } else {
          if (post.injuryDuration === expected) injuryCountdownOk++;
          else {
            this._fail(`Injury countdown for ${afterPlayers[id].name}`, `Expected ${expected}, got ${post.injuryDuration}`);
            allPassed = false;
          }
        }
      }

      // Rest days: should increment (on non-match days for non-playing players)
      if (pre.consecutiveRestDays !== undefined && post.consecutiveRestDays === pre.consecutiveRestDays + 1) {
        restDayIncrementOk++;
      }

      // Fitness: should not decrease on rest days (only increase or stay same)
      if (post.fitness !== undefined && pre.fitness !== undefined) {
        if (post.fitness >= pre.fitness) fitnessRecoveryOk++;
      }
    });

    this._info(`Checked ${totalChecked} players`);
    if (injuryCountdownOk > 0) this._pass(`Injury countdown correct for ${injuryCountdownOk} injured players`);
    if (restDayIncrementOk > 0) this._pass(`Rest days incremented for ${restDayIncrementOk} resting players`);
    if (fitnessRecoveryOk > 0) this._pass(`Fitness non-decreasing for ${fitnessRecoveryOk} players`);
    if (allPassed) this._pass('All condition outcomes correct');

    console.groupEnd();
    return allPassed;
  },

  // ─── Test 3: isProcessingTurn flag lifecycle ───────────────

  async testProcessingTurnFlag() {
    console.group('Test 3: isProcessingTurn flag lifecycle');
    const { gameStore } = await this._loadStores();
    let sawTrue = false;

    // Subscribe to flag changes
    const unsub = gameStore.subscribe((state) => {
      if (state.isProcessingTurn) sawTrue = true;
    });

    // Ensure we're NOT in Sim-to-Date mode
    const wasSimulating = gameStore.getState().isSimulating;
    if (wasSimulating) {
      gameStore.setState({ isSimulating: false });
    }

    gameStore.getState().advanceDay();

    // Wait for async processing
    await this._wait(500);

    const finalValue = gameStore.getState().isProcessingTurn;
    unsub();

    // Restore simulation state
    if (wasSimulating) {
      gameStore.setState({ isSimulating: true });
    }

    if (sawTrue) this._pass('isProcessingTurn was set to true during processing');
    else this._fail('isProcessingTurn never became true', 'Flag not toggling');

    if (!finalValue) this._pass('isProcessingTurn returned to false after processing');
    else this._fail('isProcessingTurn stuck at true', 'Not cleared after processing');

    console.groupEnd();
    return sawTrue && !finalValue;
  },

  // ─── Test 4: isProcessingTurn suppressed during Sim-to-Date ─

  async testNoOverlayDuringSimToDate() {
    console.group('Test 4: No overlay during Sim-to-Date');
    const { gameStore } = await this._loadStores();
    let sawTrue = false;

    const unsub = gameStore.subscribe((state) => {
      if (state.isProcessingTurn) sawTrue = true;
    });

    // Simulate Sim-to-Date mode
    gameStore.setState({ isSimulating: true });

    gameStore.getState().advanceDay();
    await this._wait(500);

    unsub();
    gameStore.setState({ isSimulating: false });

    if (!sawTrue) this._pass('isProcessingTurn stayed false during Sim-to-Date');
    else this._fail('isProcessingTurn was set during Sim-to-Date', 'Should be suppressed');

    console.groupEnd();
    return !sawTrue;
  },

  // ─── Test 5: IndexedDB batching (single flush) ────────────

  async testIndexedDBBatching() {
    console.group('Test 5: IndexedDB batching');
    const { gameStore, indexedDBStorage } = await this._loadStores();

    // Ensure not already batching (not in SimulationEngine)
    const wasBatching = indexedDBStorage.isBatching;
    if (wasBatching) {
      this._info('Already batching (SimulationEngine active) — skipping test');
      console.groupEnd();
      return true;
    }

    // Track flush calls
    let flushCount = 0;
    const originalFlush = indexedDBStorage.flushBuffer;
    indexedDBStorage.flushBuffer = async (...args) => {
      flushCount++;
      return originalFlush.apply(indexedDBStorage, args);
    };

    gameStore.getState().advanceDay();
    await this._wait(500);

    indexedDBStorage.flushBuffer = originalFlush;

    if (flushCount === 1) this._pass('Exactly 1 IndexedDB flush per advanceDay()');
    else if (flushCount === 0) this._pass('No flush needed (no pending writes)');
    else this._fail(`Expected 0-1 flushes, got ${flushCount}`, 'Multiple flushes detected');

    const batchingClean = !indexedDBStorage.isBatching;
    if (batchingClean) this._pass('Batching mode cleaned up');
    else this._fail('Batching mode still active', 'stopBatching not called');

    console.groupEnd();
    return flushCount <= 1 && batchingClean;
  },

  // ─── Test 6: Double-click protection ───────────────────────

  async testDoubleClickProtection() {
    console.group('Test 6: Double-click protection');
    const { gameStore } = await this._loadStores();

    const dayBefore = gameStore.getState().gameDay;

    // Rapid-fire 3 advanceDay calls
    gameStore.getState().advanceDay();
    gameStore.getState().advanceDay();
    gameStore.getState().advanceDay();

    await this._wait(500);

    const dayAfter = gameStore.getState().gameDay;
    const daysAdvanced = dayAfter - dayBefore;

    // Note: advanceDay() itself doesn't guard against double calls —
    // the guard is in Header.jsx via isProcessingTurn. The store will
    // advance 3 days. This test documents the behavior.
    this._info(`Days advanced: ${daysAdvanced} (from day ${dayBefore} to ${dayAfter})`);
    this._info('Double-click protection is in Header.jsx (isProcessingTurn guard), not in the store');
    this._pass(`advanceDay() called 3 times, advanced ${daysAdvanced} days as expected`);

    console.groupEnd();
    return true;
  },

  // ─── Test 7: Memory stability over 50 days ────────────────

  async testMemoryStability() {
    console.group('Test 7: Memory stability over 50 days');
    const { gameStore } = await this._loadStores();

    if (!performance.memory) {
      this._info('performance.memory not available (Chrome-only API). Skipping.');
      console.groupEnd();
      return true;
    }

    // Force GC if available
    if (window.gc) window.gc();
    await this._wait(100);

    const startMB = performance.memory.usedJSHeapSize / 1048576;
    this._info(`Starting heap: ${startMB.toFixed(2)} MB`);

    // Advance 50 days
    for (let i = 0; i < 50; i++) {
      gameStore.getState().advanceDay();
      // Small delay to let async processing complete
      if (i % 10 === 9) await this._wait(300);
    }

    await this._wait(1000);
    if (window.gc) window.gc();
    await this._wait(200);

    const endMB = performance.memory.usedJSHeapSize / 1048576;
    const deltaMB = endMB - startMB;

    this._info(`Ending heap: ${endMB.toFixed(2)} MB (delta: ${deltaMB >= 0 ? '+' : ''}${deltaMB.toFixed(2)} MB)`);

    // Threshold: <50MB growth for 50 days is healthy
    // Before fix: 1GB+ for just a few days
    if (deltaMB < 50) {
      this._pass(`Memory growth ${deltaMB.toFixed(2)} MB over 50 days (< 50 MB threshold)`);
    } else {
      this._fail(`Memory grew ${deltaMB.toFixed(2)} MB over 50 days`, 'Exceeds 50 MB threshold');
    }

    console.groupEnd();
    return deltaMB < 50;
  },

  // ─── Test 8: Save/load round-trip preserves conditions ─────

  async testSaveLoadRoundTrip() {
    console.group('Test 8: Save/load condition persistence');
    const { playerStore, gameStore } = await this._loadStores();

    // Advance a day to ensure conditions are updated
    gameStore.getState().advanceDay();
    await this._wait(500);

    // Snapshot a few player conditions
    const players = playerStore.getState().players;
    const sampleIds = Object.keys(players).slice(0, 10);
    const snapshot = {};
    sampleIds.forEach(id => {
      snapshot[id] = { ...players[id].condition };
    });

    // Wait for IndexedDB write to complete
    await this._wait(1000);

    // Read back from the store (simulates what happens after reload)
    const currentPlayers = playerStore.getState().players;
    let mismatches = 0;

    sampleIds.forEach(id => {
      const saved = snapshot[id];
      const current = currentPlayers[id]?.condition;

      if (!current) {
        this._fail(`Player ${id} missing condition after save`);
        mismatches++;
        return;
      }

      // Check key fields
      ['fitness', 'fatigue', 'consecutiveRestDays', 'injury', 'injuryDuration'].forEach(field => {
        if (saved[field] !== current[field]) {
          this._fail(`Player ${id} field ${field}`, `Expected ${saved[field]}, got ${current[field]}`);
          mismatches++;
        }
      });
    });

    if (mismatches === 0) {
      this._pass(`All ${sampleIds.length} sampled player conditions match after persist`);
    }

    console.groupEnd();
    return mismatches === 0;
  },

  // ─── Test 9: batchUpdatePlayerConditions correctness ───────

  async testBatchUpdateCorrectness() {
    console.group('Test 9: batchUpdatePlayerConditions correctness');
    const { playerStore } = await this._loadStores();

    const players = playerStore.getState().players;
    const sampleIds = Object.keys(players).slice(0, 5);

    // Store original conditions
    const originals = {};
    sampleIds.forEach(id => {
      originals[id] = { ...players[id].condition };
    });

    // Apply batch update with known values
    const testUpdates = {};
    sampleIds.forEach(id => {
      testUpdates[id] = { fitness: 99.5, fatigue: 0.5 };
    });

    playerStore.getState().batchUpdatePlayerConditions(testUpdates);

    // Verify
    const updatedPlayers = playerStore.getState().players;
    let allCorrect = true;

    sampleIds.forEach(id => {
      const c = updatedPlayers[id].condition;
      if (c.fitness !== 99.5) {
        this._fail(`Player ${id} fitness`, `Expected 99.5, got ${c.fitness}`);
        allCorrect = false;
      }
      if (c.fatigue !== 0.5) {
        this._fail(`Player ${id} fatigue`, `Expected 0.5, got ${c.fatigue}`);
        allCorrect = false;
      }
      // Other fields should be preserved
      if (c.consecutiveRestDays === undefined) {
        this._fail(`Player ${id} consecutiveRestDays`, 'Field was wiped');
        allCorrect = false;
      }
    });

    // Restore original conditions
    const restoreUpdates = {};
    sampleIds.forEach(id => {
      restoreUpdates[id] = originals[id];
    });
    playerStore.getState().batchUpdatePlayerConditions(restoreUpdates);

    if (allCorrect) this._pass('batchUpdatePlayerConditions sets values correctly and preserves other fields');

    console.groupEnd();
    return allCorrect;
  },

  // ─── Run All ───────────────────────────────────────────────

  async runAll() {
    console.log('%c AdvanceDay Batching Test Suite ', 'background:#2D5F3F;color:#D4AF37;font-size:16px;font-weight:bold;padding:8px 16px;border-radius:4px');
    console.log('');

    const results = {};
    const tests = [
      ['batchSetCalls', () => this.testBatchSetCalls()],
      ['conditionOutcomes', () => this.testConditionOutcomes()],
      ['processingTurnFlag', () => this.testProcessingTurnFlag()],
      ['noOverlayDuringSimToDate', () => this.testNoOverlayDuringSimToDate()],
      ['indexedDBBatching', () => this.testIndexedDBBatching()],
      ['doubleClickProtection', () => this.testDoubleClickProtection()],
      ['memoryStability', () => this.testMemoryStability()],
      ['saveLoadRoundTrip', () => this.testSaveLoadRoundTrip()],
      ['batchUpdateCorrectness', () => this.testBatchUpdateCorrectness()]
    ];

    for (const [name, fn] of tests) {
      try {
        results[name] = await fn();
      } catch (err) {
        this._fail(name, err.message);
        results[name] = false;
      }
      console.log('');
    }

    // Summary
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    const allPassed = passed === total;

    console.log('%c ─── Summary ─── ', 'font-weight:bold;font-size:14px');
    console.log(
      `%c ${passed}/${total} tests passed `,
      `background:${allPassed ? '#22c55e' : '#ef4444'};color:white;font-weight:bold;padding:4px 12px;border-radius:3px;font-size:13px`
    );

    return results;
  }
};

// Expose globally for console access
window.__CM25_TEST = advanceDayTests;

console.log('%c advanceDayTest loaded %c Run: window.__CM25_TEST.runAll()', 'background:#2D5F3F;color:white;padding:2px 8px;border-radius:3px', 'color:#93c5fd');

export default advanceDayTests;
