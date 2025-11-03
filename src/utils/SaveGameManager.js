/**
 * @file SaveGameManager.js
 * @description Manages game save/load functionality with max 10 saves
 */

const MAX_SAVES = 10;
const SAVE_KEY_PREFIX = 'cm25_save_';
const SAVES_INDEX_KEY = 'cm25_saves_index';

class SaveGameManager {
  /**
   * Get all save game metadata
   * @returns {Array} Array of save metadata
   */
  getAllSaves() {
    try {
      const indexStr = localStorage.getItem(SAVES_INDEX_KEY);
      if (!indexStr) return [];

      const index = JSON.parse(indexStr);
      return index.saves || [];
    } catch (error) {
      console.error('Error loading saves index:', error);
      return [];
    }
  }

  /**
   * Get a specific save by slot
   * @param {number} slot - Save slot number (0-9)
   * @returns {Object|null} Save data or null
   */
  getSave(slot) {
    try {
      const saveKey = `${SAVE_KEY_PREFIX}${slot}`;
      const saveStr = localStorage.getItem(saveKey);
      if (!saveStr) return null;

      return JSON.parse(saveStr);
    } catch (error) {
      console.error(`Error loading save ${slot}:`, error);
      return null;
    }
  }

  /**
   * Save current game state
   * @param {number} slot - Save slot number (0-9)
   * @param {Object} stores - All Zustand stores
   * @param {string} saveName - Custom save name
   * @returns {boolean} Success status
   */
  saveGame(slot, stores, saveName = null) {
    if (slot < 0 || slot >= MAX_SAVES) {
      console.error(`Invalid save slot: ${slot}. Must be 0-${MAX_SAVES - 1}`);
      return false;
    }

    try {
      console.log('🎮 Starting save to slot', slot);

      // Extract state from all stores
      const gameState = stores.gameStore.getState();
      const teamState = stores.teamStore.getState();
      const playerState = stores.playerStore.getState();
      const leagueState = stores.leagueStore.getState();
      const financeState = stores.financeStore.getState();
      const matchState = stores.matchStore.getState();
      const auctionState = stores.auctionStore?.getState();
      const uiState = stores.uiStore.getState();

      console.log('🎮 Auction state:', auctionState ? auctionState.auctionState : 'No auction store');
      console.log('🎮 Finance teamFinances type:', financeState.teamFinances?.constructor?.name || typeof financeState.teamFinances);

      // Create save object
      const saveData = {
        version: '1.0.0',
        slot,
        timestamp: new Date().toISOString(),
        saveName: saveName || this._generateSaveName(gameState, teamState),

        // Game state snapshot
        gameState: {
          currentSeason: gameState.currentSeason,
          currentPhase: gameState.currentPhase,
          currentWeek: gameState.currentWeek,
          currentDate: gameState.currentDate,
          settings: gameState.settings
        },

        teamState: {
          teams: teamState.teams,
          userTeamId: teamState.userTeamId,
          // Save only player IDs in squads, not full objects
          squadLists: Object.fromEntries(
            Object.entries(teamState.squadLists || {}).map(([teamId, playerIds]) => [
              teamId,
              Array.isArray(playerIds) ? playerIds : []
            ])
          ),
          playerStats: teamState.playerStats,
          teamStats: teamState.teamStats
        },

        // Don't save full player database (545 players = too large!)
        // Players are static data loaded from JSON, no need to save
        playerState: {
          careerStats: playerState.careerStats,
          currentSeasonId: playerState.currentSeasonId
        },

        leagueState: {
          seasonId: leagueState.seasonId,
          seasonName: leagueState.seasonName,
          currentMatchday: leagueState.currentMatchday,
          currentWeek: leagueState.currentWeek,
          stage: leagueState.stage,
          fixtures: leagueState.fixtures,
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
          status: matchState.status,
          teams: matchState.teams,
          innings: matchState.innings,
          currentBall: matchState.currentBall,
          tacticsState: matchState.tacticsState
        },

        auctionState: auctionState ? {
          auctionState: auctionState.auctionState,
          rounds: auctionState.rounds,
          currentRound: auctionState.currentRound,
          currentPlayerIndex: auctionState.currentPlayerIndex,
          soldPlayers: auctionState.soldPlayers
        } : null,

        // Metadata for display
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

      // Save to localStorage
      const saveKey = `${SAVE_KEY_PREFIX}${slot}`;
      localStorage.setItem(saveKey, JSON.stringify(saveData));

      // Update saves index
      this._updateSavesIndex(slot, saveData);

      console.log(`✅ Game saved to slot ${slot}: ${saveData.saveName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving game to slot ${slot}:`, error);
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
      return false;
    }
  }

  /**
   * Load a saved game
   * @param {number} slot - Save slot number (0-9)
   * @param {Object} stores - All Zustand stores
   * @returns {boolean} Success status
   */
  loadGame(slot, stores) {
    try {
      const saveData = this.getSave(slot);
      if (!saveData) {
        console.error(`No save found in slot ${slot}`);
        return false;
      }

      // Restore all store states
      // Game Store
      stores.gameStore.setState({
        currentSeason: saveData.gameState.currentSeason,
        currentPhase: saveData.gameState.currentPhase,
        currentWeek: saveData.gameState.currentWeek,
        currentDate: saveData.gameState.currentDate,
        settings: saveData.gameState.settings,
        isSimulating: false
      });

      // Team Store
      stores.teamStore.setState({
        teams: saveData.teamState.teams,
        userTeamId: saveData.teamState.userTeamId,
        squadLists: saveData.teamState.squadLists,
        playerStats: saveData.teamState.playerStats,
        teamStats: saveData.teamState.teamStats
      });

      // Player Store (players are loaded from static JSON, don't restore)
      stores.playerStore.setState({
        careerStats: saveData.playerState.careerStats || {},
        currentSeasonId: saveData.playerState.currentSeasonId
      });

      // League Store
      stores.leagueStore.setState({
        seasonId: saveData.leagueState.seasonId,
        seasonName: saveData.leagueState.seasonName,
        currentMatchday: saveData.leagueState.currentMatchday,
        currentWeek: saveData.leagueState.currentWeek,
        stage: saveData.leagueState.stage,
        fixtures: saveData.leagueState.fixtures,
        results: saveData.leagueState.results,
        standings: saveData.leagueState.standings,
        clubs: saveData.leagueState.clubs,
        stats: saveData.leagueState.stats,
        playoffFixtures: saveData.leagueState.playoffFixtures,
        playoffResults: saveData.leagueState.playoffResults,
        champion: saveData.leagueState.champion
      });

      // Finance Store - reconstruct Map
      const teamFinancesMap = new Map(saveData.financeState.teamFinances);
      stores.financeStore.setState({
        seasonId: saveData.financeState.seasonId,
        initialized: saveData.financeState.initialized,
        teamFinances: teamFinancesMap,
        transactionHistory: saveData.financeState.transactionHistory,
        lastUpdate: Date.now()
      });
      // Also update the engine's internal state
      stores.financeStore.getState().engine.teamFinances = teamFinancesMap;
      stores.financeStore.getState().engine.transactionHistory = saveData.financeState.transactionHistory;

      // Match Store
      stores.matchStore.setState({
        matchId: saveData.matchState.matchId,
        status: saveData.matchState.status,
        teams: saveData.matchState.teams,
        innings: saveData.matchState.innings,
        currentBall: saveData.matchState.currentBall,
        tacticsState: saveData.matchState.tacticsState
      });

      // Auction Store (if exists in save)
      if (saveData.auctionState && stores.auctionStore) {
        stores.auctionStore.setState({
          auctionState: saveData.auctionState.auctionState,
          rounds: saveData.auctionState.rounds,
          currentRound: saveData.auctionState.currentRound,
          currentPlayerIndex: saveData.auctionState.currentPlayerIndex,
          soldPlayers: saveData.auctionState.soldPlayers
        });
      }

      console.log(`✅ Game loaded from slot ${slot}: ${saveData.saveName}`);
      return true;
    } catch (error) {
      console.error(`Error loading game from slot ${slot}:`, error);
      return false;
    }
  }

  /**
   * Delete a save
   * @param {number} slot - Save slot number (0-9)
   * @returns {boolean} Success status
   */
  deleteSave(slot) {
    try {
      const saveKey = `${SAVE_KEY_PREFIX}${slot}`;
      localStorage.removeItem(saveKey);

      // Update index
      const saves = this.getAllSaves();
      const updatedSaves = saves.filter(s => s.slot !== slot);
      localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify({ saves: updatedSaves }));

      console.log(`✅ Save deleted from slot ${slot}`);
      return true;
    } catch (error) {
      console.error(`Error deleting save ${slot}:`, error);
      return false;
    }
  }

  /**
   * Get empty save slots
   * @returns {Array<number>} Array of empty slot numbers
   */
  getEmptySlots() {
    const saves = this.getAllSaves();
    const usedSlots = new Set(saves.map(s => s.slot));
    const emptySlots = [];

    for (let i = 0; i < MAX_SAVES; i++) {
      if (!usedSlots.has(i)) {
        emptySlots.push(i);
      }
    }

    return emptySlots;
  }

  /**
   * Check if saves are full
   * @returns {boolean}
   */
  isFull() {
    return this.getAllSaves().length >= MAX_SAVES;
  }

  /**
   * Generate automatic save name
   * @private
   */
  _generateSaveName(gameState, teamState) {
    const teamName = teamState.teams[teamState.userTeamId]?.name || 'Unknown Team';
    const phase = gameState.currentPhase;
    const season = gameState.currentSeason;

    return `${teamName} - S${season} ${phase}`;
  }

  /**
   * Get team position in standings
   * @private
   */
  _getTeamPosition(standings, teamId) {
    if (!standings || standings.length === 0) return null;

    const sorted = [...standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.netRunRate - a.netRunRate;
    });

    const position = sorted.findIndex(s => s.clubId === teamId);
    return position >= 0 ? position + 1 : null;
  }

  /**
   * Update saves index
   * @private
   */
  _updateSavesIndex(slot, saveData) {
    try {
      const saves = this.getAllSaves();

      // Remove existing entry for this slot
      const filteredSaves = saves.filter(s => s.slot !== slot);

      // Add new entry
      filteredSaves.push({
        slot,
        timestamp: saveData.timestamp,
        saveName: saveData.saveName,
        metadata: saveData.metadata
      });

      // Sort by timestamp (newest first)
      filteredSaves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify({ saves: filteredSaves }));
    } catch (error) {
      console.error('Error updating saves index:', error);
    }
  }
}

export default new SaveGameManager();
