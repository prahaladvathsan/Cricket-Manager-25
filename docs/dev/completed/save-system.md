# Save System Documentation

## Overview

The game uses IndexedDB for persistence with automatic hydration tracking. This provides 50MB+ storage capacity (vs 5-10MB localStorage limit) and supports multi-slot saves with autosave functionality.

## Architecture

```
IndexedDB (via idb-keyval)
    ↓
Zustand persist middleware (async)
    ↓
storeHydration.js (tracks when all stores ready)
    ↓
App.jsx (waits for hydration before rendering)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/utils/indexedDBStorage.js` | IndexedDB adapter compatible with Zustand |
| `src/utils/storeHydration.js` | Tracks hydration status of all 9 stores |
| `src/utils/SaveGameManager.js` | Multi-slot save management |
| `src/utils/compression.js` | Pako gzip compression for saves |

## Stores Using Persistence

All stores use IndexedDB with hydration tracking:
- gameStore, leagueStore, teamStore, playerStore, financeStore
- matchStore, auctionStore, inboxStore, transferStore

## Save Types

1. **Autosaves** - Created automatically:
   - After every user match (with opponent name, result, score)
   - After auction completion (with players acquired, budget spent)
   - Maximum 10 autosaves kept (oldest deleted)

2. **Manual Saves** - Created by user from Load Game screen

3. **Export/Import** - `.cm25` files (compressed with pako)

## Hydration Flow

```javascript
// 1. App loads
// 2. Zustand stores initialize with default state
// 3. Stores begin async rehydration from IndexedDB
// 4. Each store calls markHydrated('storeName') when done
// 5. App.jsx waits: await waitForHydration()
// 6. App renders with saved data
```

## Adding New Persistent Stores

When creating a new store with persistence:

```javascript
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

const useNewStore = create(
  persist(
    (set, get) => ({ /* state */ }),
    {
      name: 'cm25-new-store',
      version: 1,
      storage: createJSONStorage(() => indexedDBStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) console.error('Rehydration failed:', error);
        markHydrated('newStore'); // Add to storeHydration.js hydrationStatus
      }
    }
  )
);
```

Also update `storeHydration.js` to include the new store in `hydrationStatus`.

## SaveGameManager API

```javascript
// List saves
const saves = await SaveGameManager.listSaves();
const autosaves = await SaveGameManager.listSavesByType('autosave');

// Create saves
await SaveGameManager.createManualSave(stores, 'My Save Name');
await SaveGameManager.autosaveAfterMatch(stores, { opponentName, result, score });
await SaveGameManager.autosaveAfterAuction(stores, { playersAcquired, budgetSpent });

// Load/delete
await SaveGameManager.loadSave(saveId, stores);
await SaveGameManager.deleteSave(saveId);

// Export/import
await SaveGameManager.exportSave(saveId);
await SaveGameManager.importSave(file);
```

## Migration

Legacy localStorage saves are automatically migrated to IndexedDB on first load via `migrateFromLocalStorage()` in App.jsx.
