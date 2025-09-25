/**
 * @file storage.js
 * @description Save/load functionality for game state persistence
 * @module utils/storage
 */

/**
 * Save game state to localStorage
 * @param {string} slotName - Save slot name
 * @param {Object} gameData - Complete game state
 * @returns {boolean} Success status
 */
export function saveGame(slotName = 'manual', gameData) {
  try {
    const saveData = {
      version: "1.0.0",
      metadata: {
        saveName: slotName,
        date: new Date().toISOString(),
        season: gameData.currentSeason || 1,
        week: gameData.currentWeek || 1,
        checksum: generateChecksum(gameData)
      },
      gameState: gameData,
      timestamp: Date.now()
    };

    localStorage.setItem(`cricket_save_${slotName}`, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

/**
 * Load game state from localStorage
 * @param {string} slotName - Save slot name
 * @returns {Object|null} Game state or null if failed
 */
export function loadGame(slotName) {
  try {
    const savedData = localStorage.getItem(`cricket_save_${slotName}`);
    if (!savedData) return null;

    const parsed = JSON.parse(savedData);
    
    // Validate save file
    if (!parsed.version || !parsed.gameState) {
      console.error('Invalid save file format');
      return null;
    }

    return parsed.gameState;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

/**
 * Get list of available save slots
 * @returns {Array} Array of save slot metadata
 */
export function getSaveSlots() {
  const slots = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cricket_save_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        slots.push({
          slotName: key.replace('cricket_save_', ''),
          metadata: data.metadata,
          timestamp: data.timestamp
        });
      } catch (error) {
        console.error('Error reading save slot:', key, error);
      }
    }
  }
  
  return slots.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Delete a save slot
 * @param {string} slotName - Save slot name
 * @returns {boolean} Success status
 */
export function deleteSave(slotName) {
  try {
    localStorage.removeItem(`cricket_save_${slotName}`);
    return true;
  } catch (error) {
    console.error('Failed to delete save:', error);
    return false;
  }
}

/**
 * Auto-save game state
 * @param {Object} gameData - Game state to save
 */
export function autoSave(gameData) {
  const autoSaveSlots = ['auto_1', 'auto_2', 'auto_3'];
  const currentSlot = `auto_${(Date.now() % 3) + 1}`;
  
  saveGame(currentSlot, gameData);
}

/**
 * Generate simple checksum for save validation
 * @param {Object} data - Data to checksum
 * @returns {string} Checksum string
 */
function generateChecksum(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(16);
}

/**
 * Export save data as file
 * @param {string} slotName - Save slot name
 */
export function exportSave(slotName) {
  const saveData = localStorage.getItem(`cricket_save_${slotName}`);
  if (!saveData) return;

  const blob = new Blob([saveData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `cricket_manager_${slotName}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

/**
 * Import save data from file
 * @param {File} file - Save file
 * @param {string} slotName - Target slot name
 * @returns {Promise<boolean>} Success status
 */
export function importSave(file, slotName) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const saveData = JSON.parse(e.target.result);
        
        // Validate imported data
        if (!saveData.version || !saveData.gameState) {
          console.error('Invalid save file format');
          resolve(false);
          return;
        }
        
        localStorage.setItem(`cricket_save_${slotName}`, e.target.result);
        resolve(true);
      } catch (error) {
        console.error('Failed to import save:', error);
        resolve(false);
      }
    };
    
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
}