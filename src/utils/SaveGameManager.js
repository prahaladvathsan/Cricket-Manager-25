/**
 * @file SaveGameManager.js
 * @description Single-save game manager with autosave and export/import support
 *
 * Model:
 * - One "current game" auto-saved to localStorage
 * - Export to .cm25 file for backup/sharing
 * - Import .cm25 file to replace current game
 */

import { compressData, decompressData, getCompressionStats } from './compression';

const SAVE_KEY = 'cm25_current_save';
const SAVE_FORMAT_VERSION = '2.0.0';
const MIN_COMPATIBLE_VERSION = '1.0.0';

class SaveGameManager {
  /**
   * Check if a saved game exists
   * @returns {boolean}
   */
  hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  /**
   * Get current save metadata (for display without loading full save)
   * @returns {Object|null}
   */
  getSaveInfo() {
    try {
      const saveStr = localStorage.getItem(SAVE_KEY);
      if (!saveStr) return null;

      const save = JSON.parse(saveStr);
      return {
        saveName: save.saveName,
        timestamp: save.timestamp,
        metadata: save.metadata,
        version: save.version
      };
    } catch (error) {
      console.error('Error reading save info:', error);
      return null;
    }
  }

  /**
   * Save current game state (used for both manual and auto-save)
   * @param {Object} stores - All Zustand stores
   * @param {string} reason - Why save was triggered (for logging)
   * @returns {boolean} Success status
   */
  saveGame(stores, reason = 'manual') {
    try {
      console.log(`Saving game (${reason})...`);

      // Extract state from all stores
      const gameState = stores.gameStore.getState();
      const teamState = stores.teamStore.getState();
      const playerState = stores.playerStore.getState();
      const leagueState = stores.leagueStore.getState();
      const financeState = stores.financeStore.getState();
      const matchState = stores.matchStore.getState();
      const auctionState = stores.auctionStore?.getState();
      const inboxState = stores.inboxStore?.getState();
      const transferState = stores.transferStore?.getState();

      const saveData = {
        version: SAVE_FORMAT_VERSION,
        timestamp: new Date().toISOString(),
        lastSaveReason: reason,
        saveName: this._generateSaveName(gameState, teamState),

        gameState: {
          currentSeason: gameState.currentSeason,
          currentPhase: gameState.currentPhase,
          currentWeek: gameState.currentWeek,
          currentDate: gameState.currentDate,
          gameDay: gameState.gameDay || 1,
          calendarEvents: gameState.calendarEvents || [],
          settings: gameState.settings,
          seasonObjectives: gameState.seasonObjectives || [],
          objectiveTracking: gameState.objectiveTracking || {}
        },

        teamState: {
          teams: teamState.teams,
          userTeamId: teamState.userTeamId,
          squadLists: Object.fromEntries(
            Object.entries(teamState.squadLists || {}).map(([teamId, playerIds]) => [
              teamId,
              Array.isArray(playerIds) ? playerIds : []
            ])
          ),
          teamTactics: teamState.teamTactics || {},
          playerStats: teamState.playerStats,
          teamStats: teamState.teamStats
        },

        playerState: {
          careerStats: playerState.careerStats,
          currentSeasonId: playerState.currentSeasonId,
          playerTeamAssignments: Object.entries(playerState.players)
            .filter(([_, player]) => player.currentTeam)
            .reduce((acc, [playerId, player]) => {
              acc[playerId] = player.currentTeam;
              return acc;
            }, {}),
          playerConditions: Object.entries(playerState.players)
            .reduce((acc, [playerId, player]) => {
              if (player.condition) {
                acc[playerId] = player.condition;
              }
              return acc;
            }, {})
        },

        leagueState: {
          seasonId: leagueState.seasonId,
          seasonName: leagueState.seasonName,
          currentMatchday: leagueState.currentMatchday,
          currentWeek: leagueState.currentWeek,
          currentFixtureIndex: leagueState.currentFixtureIndex,
          stage: leagueState.stage,
          fixtures: leagueState.fixtures,
          matchWeeks: leagueState.matchWeeks,
          results: leagueState.results,
          standings: leagueState.standings,
          clubs: leagueState.clubs,
          stats: leagueState.stats,
          playoffFixtures: leagueState.playoffFixtures,
          playoffResults: leagueState.playoffResults,
          champion: leagueState.champion
        },

        financeState: {
          seasonId: financeState.seasonId,
          initialized: financeState.initialized,
          teamFinances: financeState.teamFinances instanceof Map
            ? Array.from(financeState.teamFinances.entries())
            : Array.isArray(financeState.teamFinances)
              ? financeState.teamFinances
              : [],
          transactionHistory: financeState.transactionHistory
        },

        matchState: {
          matchId: matchState.matchId,
          status: matchState.status
        },

        auctionState: auctionState ? {
          auctionState: auctionState.auctionState,
          rounds: auctionState.rounds,
          currentRound: auctionState.currentRound,
          currentPlayerIndex: auctionState.currentPlayerIndex,
          soldPlayers: auctionState.soldPlayers,
          userMaxBid: auctionState.userMaxBid,
          userMaxBidPlayerId: auctionState.userMaxBidPlayerId
        } : null,

        inboxState: inboxState ? {
          messages: inboxState.messages || [],
          unreadCount: inboxState.unreadCount || 0
        } : null,

        transferState: transferState ? {
          activeListings: transferState.activeListings || [],
          userListings: transferState.userListings || [],
          userBids: transferState.userBids || [],
          freeAgents: transferState.freeAgents || [],
          notifications: transferState.notifications || [],
          transferWindow: transferState.transferWindow || { isOpen: false }
        } : null,

        metadata: {
          userTeamName: teamState.teams[teamState.userTeamId]?.name || 'Unknown',
          season: gameState.currentSeason,
          phase: gameState.currentPhase,
          matchday: leagueState.currentMatchday,
          position: this._getTeamPosition(leagueState.standings, teamState.userTeamId),
          budget: financeState.teamFinances instanceof Map
            ? financeState.teamFinances.get(teamState.userTeamId)?.currentBudget || 0
            : 0
        }
      };

      // Generate checksum
      saveData.checksum = this._generateChecksum(saveData);

      // Save to localStorage
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));

      console.log(`Game saved: ${saveData.saveName}`);
      return true;
    } catch (error) {
      console.error('Error saving game:', error);
      return false;
    }
  }

  /**
   * Load saved game
   * @param {Object} stores - All Zustand stores
   * @returns {boolean} Success status
   */
  loadGame(stores) {
    try {
      const saveStr = localStorage.getItem(SAVE_KEY);
      if (!saveStr) {
        console.error('No save found');
        return false;
      }

      let saveData = JSON.parse(saveStr);

      // Migrate if needed
      saveData = this._migrateSaveData(saveData);

      // Restore states
      this._restoreStoreStates(saveData, stores);

      console.log(`Game loaded: ${saveData.saveName}`);
      return true;
    } catch (error) {
      console.error('Error loading game:', error);
      return false;
    }
  }

  /**
   * Delete current save
   * @returns {boolean}
   */
  deleteSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
      console.log('Save deleted');
      return true;
    } catch (error) {
      console.error('Error deleting save:', error);
      return false;
    }
  }

  /**
   * Export current save to .cm25 file
   * @param {string} filename - Optional custom filename
   * @returns {boolean}
   */
  exportSave(filename = null) {
    try {
      const saveStr = localStorage.getItem(SAVE_KEY);
      if (!saveStr) {
        console.error('No save to export');
        return false;
      }

      const saveData = JSON.parse(saveStr);

      // Add export metadata
      const exportData = {
        ...saveData,
        exportedAt: new Date().toISOString(),
        exportVersion: SAVE_FORMAT_VERSION
      };

      // Log compression stats
      const stats = getCompressionStats(exportData);
      console.log(`Export: ${stats.originalKB}KB -> ${stats.compressedKB}KB (${stats.ratio} savings)`);

      // Compress and download
      const compressed = compressData(exportData);
      const blob = new Blob([compressed], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const safeName = (saveData.saveName || 'save').replace(/[^a-z0-9]/gi, '_');
      // Use in-game day for filename
      const gameDay = saveData.gameState?.gameDay || 1;
      const defaultFilename = filename || `cm25_${safeName}_Day${gameDay}.cm25`;

      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Exported to ${defaultFilename}`);
      return true;
    } catch (error) {
      console.error('Error exporting save:', error);
      return false;
    }
  }

  /**
   * Import save from .cm25 file (replaces current save)
   * @param {File} file
   * @returns {Promise<{success: boolean, error?: string, saveName?: string}>}
   */
  async importSave(file) {
    return new Promise((resolve) => {
      if (!file.name.toLowerCase().endsWith('.cm25')) {
        resolve({ success: false, error: 'Invalid file type. Expected .cm25 file.' });
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          let saveData;
          try {
            saveData = decompressData(e.target.result);
          } catch {
            resolve({ success: false, error: 'Failed to decompress. File may be corrupted.' });
            return;
          }

          if (!this._isVersionCompatible(saveData.version)) {
            resolve({ success: false, error: `Incompatible version: ${saveData.version}` });
            return;
          }

          if (!saveData.gameState || !saveData.teamState) {
            resolve({ success: false, error: 'Invalid save structure.' });
            return;
          }

          // Migrate and save
          saveData = this._migrateSaveData(saveData);
          saveData.importedAt = new Date().toISOString();
          saveData.importedFrom = file.name;
          saveData.checksum = this._generateChecksum(saveData);

          localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));

          console.log(`Imported: ${saveData.saveName}`);
          resolve({ success: true, saveName: saveData.saveName });
        } catch (error) {
          console.error('Import error:', error);
          resolve({ success: false, error: 'Failed to parse save file.' });
        }
      };

      reader.onerror = () => resolve({ success: false, error: 'Failed to read file.' });
      reader.readAsText(file);
    });
  }

  /**
   * Get save format version
   */
  getVersion() {
    return SAVE_FORMAT_VERSION;
  }

  // ============================================
  // Private Methods
  // ============================================

  _restoreStoreStates(saveData, stores) {
    // Game Store
    stores.gameStore.setState({
      currentSeason: saveData.gameState.currentSeason,
      currentPhase: saveData.gameState.currentPhase,
      currentWeek: saveData.gameState.currentWeek,
      currentDate: saveData.gameState.currentDate,
      gameDay: saveData.gameState.gameDay || 1,
      calendarEvents: saveData.gameState.calendarEvents || [],
      settings: saveData.gameState.settings,
      seasonObjectives: saveData.gameState.seasonObjectives || [],
      objectiveTracking: saveData.gameState.objectiveTracking || {},
      isSimulating: false
    });

    // Team Store
    stores.teamStore.setState({
      teams: saveData.teamState.teams,
      userTeamId: saveData.teamState.userTeamId,
      squadLists: saveData.teamState.squadLists,
      teamTactics: saveData.teamState.teamTactics || {},
      playerStats: saveData.teamState.playerStats,
      teamStats: saveData.teamState.teamStats
    });

    // Player Store
    const playerTeamAssignments = saveData.playerState.playerTeamAssignments || {};
    const playerConditions = saveData.playerState.playerConditions || {};
    const players = stores.playerStore.getState().players;

    const updatedPlayers = { ...players };
    const assignedPlayerIds = new Set();

    Object.entries(playerTeamAssignments).forEach(([playerId, teamId]) => {
      if (updatedPlayers[playerId]) {
        updatedPlayers[playerId] = { ...updatedPlayers[playerId], currentTeam: teamId };
        assignedPlayerIds.add(playerId);
      }
    });

    Object.entries(playerConditions).forEach(([playerId, condition]) => {
      if (updatedPlayers[playerId]) {
        updatedPlayers[playerId] = { ...updatedPlayers[playerId], condition };
      }
    });

    Object.keys(updatedPlayers).forEach(playerId => {
      if (!assignedPlayerIds.has(playerId) && updatedPlayers[playerId].currentTeam) {
        updatedPlayers[playerId] = { ...updatedPlayers[playerId], currentTeam: null };
      }
    });

    const availablePlayers = Object.keys(updatedPlayers).filter(
      playerId => !updatedPlayers[playerId].currentTeam
    );

    stores.playerStore.setState({
      players: updatedPlayers,
      availablePlayers,
      careerStats: saveData.playerState.careerStats || {},
      currentSeasonId: saveData.playerState.currentSeasonId
    });

    // League Store
    stores.leagueStore.setState({
      seasonId: saveData.leagueState.seasonId,
      seasonName: saveData.leagueState.seasonName,
      currentMatchday: saveData.leagueState.currentMatchday,
      currentWeek: saveData.leagueState.currentWeek,
      currentFixtureIndex: saveData.leagueState.currentFixtureIndex,
      stage: saveData.leagueState.stage,
      fixtures: saveData.leagueState.fixtures,
      matchWeeks: saveData.leagueState.matchWeeks,
      results: saveData.leagueState.results,
      standings: saveData.leagueState.standings,
      clubs: saveData.leagueState.clubs,
      stats: saveData.leagueState.stats,
      playoffFixtures: saveData.leagueState.playoffFixtures,
      playoffResults: saveData.leagueState.playoffResults,
      champion: saveData.leagueState.champion
    });

    // Finance Store
    const teamFinancesMap = new Map(saveData.financeState.teamFinances);
    stores.financeStore.setState({
      seasonId: saveData.financeState.seasonId,
      initialized: saveData.financeState.initialized,
      teamFinances: teamFinancesMap,
      transactionHistory: saveData.financeState.transactionHistory,
      lastUpdate: Date.now()
    });
    const financeEngine = stores.financeStore.getState().engine;
    if (financeEngine) {
      financeEngine.teamFinances = teamFinancesMap;
      financeEngine.transactionHistory = saveData.financeState.transactionHistory;
    }

    // Match Store
    stores.matchStore.setState({
      matchId: saveData.matchState?.matchId || null,
      status: saveData.matchState?.status || 'idle'
    });

    // Auction Store
    if (saveData.auctionState && stores.auctionStore) {
      stores.auctionStore.setState({
        auctionState: saveData.auctionState.auctionState,
        rounds: saveData.auctionState.rounds,
        currentRound: saveData.auctionState.currentRound,
        currentPlayerIndex: saveData.auctionState.currentPlayerIndex,
        soldPlayers: saveData.auctionState.soldPlayers,
        userMaxBid: saveData.auctionState.userMaxBid || null,
        userMaxBidPlayerId: saveData.auctionState.userMaxBidPlayerId || null
      });
    }

    // Inbox Store
    if (saveData.inboxState && stores.inboxStore) {
      stores.inboxStore.setState({
        messages: saveData.inboxState.messages || [],
        unreadCount: saveData.inboxState.unreadCount || 0
      });
    }

    // Transfer Store
    if (saveData.transferState && stores.transferStore) {
      stores.transferStore.setState({
        activeListings: saveData.transferState.activeListings || [],
        userListings: saveData.transferState.userListings || [],
        userBids: saveData.transferState.userBids || [],
        freeAgents: saveData.transferState.freeAgents || [],
        notifications: saveData.transferState.notifications || [],
        transferWindow: saveData.transferState.transferWindow || { isOpen: false }
      });
    }
  }

  _migrateSaveData(saveData) {
    let data = { ...saveData };

    if (!data.version || data.version === '1.0.0') {
      console.log('Migrating save from v1.0.0 to v2.0.0');

      if (!data.transferState) {
        data.transferState = {
          activeListings: [], userListings: [], userBids: [],
          freeAgents: [], notifications: [], transferWindow: { isOpen: false }
        };
      }

      if (data.gameState && !data.gameState.objectiveTracking) {
        data.gameState.seasonObjectives = data.gameState.seasonObjectives || [];
        data.gameState.objectiveTracking = {};
      }

      if (data.playerState && !data.playerState.playerConditions) {
        data.playerState.playerConditions = {};
      }

      if (data.leagueState) {
        data.leagueState.currentFixtureIndex = data.leagueState.currentFixtureIndex || 0;
        data.leagueState.matchWeeks = data.leagueState.matchWeeks || [];
      }

      data.version = '2.0.0';
      data.migratedAt = new Date().toISOString();
    }

    return data;
  }

  _isVersionCompatible(version) {
    if (!version) return true;
    const [major] = version.split('.').map(Number);
    const [minMajor] = MIN_COMPATIBLE_VERSION.split('.').map(Number);
    return major >= minMajor;
  }

  _generateChecksum(data) {
    const { checksum, ...rest } = data;
    const str = JSON.stringify(rest);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  _generateSaveName(gameState, teamState) {
    const teamName = teamState.teams[teamState.userTeamId]?.name || 'Unknown';
    return `${teamName} - S${gameState.currentSeason} ${gameState.currentPhase}`;
  }

  _getTeamPosition(standings, teamId) {
    if (!standings?.length) return null;
    const sorted = [...standings].sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate
    );
    const pos = sorted.findIndex(s => s.clubId === teamId);
    return pos >= 0 ? pos + 1 : null;
  }
}

export default new SaveGameManager();
