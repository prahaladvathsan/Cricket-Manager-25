/**
 * @file financeStore.js
 * @description Zustand store for financial management - wraps FinanceEngine
 * @module stores/financeStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import FinanceEngine from '../core/finance/FinanceEngine.js';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

/**
 * @typedef {Object} FinanceState
 * @property {FinanceEngine} engine - The FinanceEngine instance
 * @property {string|null} seasonId - Current season ID
 * @property {Map} teamFinances - Map of team finances (teamId -> finance object)
 * @property {Array} transactionHistory - All financial transactions
 * @property {boolean} initialized - Whether finances are initialized for current season
 */

const useFinanceStore = create(
  persist(
    (set, get) => ({
  // Core State
  engine: new FinanceEngine(),
  seasonId: null,
  initialized: false,
  lastUpdate: null,

  // Cached State (for React reactivity)
  teamFinances: new Map(),
  transactionHistory: [],

  // ============================================
  // INITIALIZATION & SEASON MANAGEMENT
  // ============================================

  /**
   * Initialize finances for a new season
   * @param {Array} teams - Array of team objects
   * @param {string} seasonId - Season identifier
   * @param {Object} previousSeasonStandings - Previous season final standings
   * @returns {Object} Financial summary
   */
  initializeSeason: (teams, seasonId, previousSeasonStandings = null) => {
    console.log('💰 financeStore.initializeSeason called with:', { teams, seasonId, previousSeasonStandings });
    const state = get();

    console.log('💰 financeStore - Current engine:', state.engine);
    console.log('💰 financeStore - Engine teamFinances before init:', state.engine.teamFinances);

    const summary = state.engine.initializeSeasonFinances(teams, seasonId, previousSeasonStandings);

    console.log('💰 financeStore - After engine initialization:');
    console.log('  - engine.teamFinances:', state.engine.teamFinances);
    console.log('  - engine.teamFinances.size:', state.engine.teamFinances.size);
    console.log('  - engine.teamFinances keys:', Array.from(state.engine.teamFinances.keys()));

    const newTeamFinances = new Map(state.engine.teamFinances);
    console.log('💰 financeStore - Created new Map:', newTeamFinances);
    console.log('  - new Map size:', newTeamFinances.size);
    console.log('  - new Map keys:', Array.from(newTeamFinances.keys()));

    set({
      seasonId,
      initialized: true,
      teamFinances: newTeamFinances,
      transactionHistory: [...state.engine.transactionHistory],
      lastUpdate: Date.now()
    });

    const newState = get();
    console.log('💰 financeStore - After set, state:');
    console.log('  - seasonId:', newState.seasonId);
    console.log('  - initialized:', newState.initialized);
    console.log('  - teamFinances:', newState.teamFinances);
    console.log('  - teamFinances type:', newState.teamFinances?.constructor?.name);
    console.log('  - teamFinances.size:', newState.teamFinances?.size);
    console.log('  - teamFinances keys:', newState.teamFinances instanceof Map ? Array.from(newState.teamFinances.keys()) : 'NOT A MAP');

    return summary;
  },

  /**
   * Reset finance state (for new game or season restart)
   */
  resetFinances: () => {
    set({
      engine: new FinanceEngine(),
      seasonId: null,
      initialized: false,
      teamFinances: new Map(),
      transactionHistory: [],
      lastUpdate: null
    });
  },

  // ============================================
  // EXPENSES
  // ============================================

  /**
   * Process auction spending for a team
   * @param {string} teamId - Team ID
   * @param {number} amount - Amount spent
   * @param {Array} playersPurchased - Players purchased
   * @returns {boolean} Success status
   */
  processAuctionSpending: (teamId, amount, playersPurchased = []) => {
    const state = get();
    console.log(`💰 financeStore.processAuctionSpending for team ${teamId}, amount: ${amount}`);

    const success = state.engine.processAuctionSpending(teamId, amount, playersPurchased);
    console.log(`💰 Engine processAuctionSpending returned: ${success}`);

    if (success) {
      console.log(`💰 Updating financeStore state...`);
      const newTeamFinances = new Map(state.engine.teamFinances);
      const teamFinance = newTeamFinances.get(teamId);
      console.log(`💰 Team ${teamId} finances after spending:`, teamFinance);

      set({
        teamFinances: newTeamFinances,
        transactionHistory: [...state.engine.transactionHistory],
        lastUpdate: Date.now()
      });
      console.log(`💰 financeStore state updated successfully`);
    } else {
      console.error(`💰 Failed to process auction spending for team ${teamId}`);
    }

    return success;
  },

  /**
   * Process a transfer purchase
   * @param {string} buyerTeamId - Buying team
   * @param {string} sellerTeamId - Selling team
   * @param {Object} player - Player object
   * @param {number} transferFee - Transfer fee
   * @returns {boolean} Success status
   */
  processTransferPurchase: (buyerTeamId, sellerTeamId, player, transferFee) => {
    const state = get();
    const success = state.engine.processTransferPurchase(buyerTeamId, sellerTeamId, player, transferFee);

    if (success) {
      set({
        teamFinances: new Map(state.engine.teamFinances),
        transactionHistory: [...state.engine.transactionHistory],
        lastUpdate: Date.now()
      });
    }

    return success;
  },

  // ============================================
  // REVENUES
  // ============================================

  /**
   * Award match win prize money
   * @param {string} teamId - Winning team ID
   * @returns {number} Prize amount
   */
  awardMatchWinPrize: (teamId) => {
    const state = get();
    const prize = state.engine.awardMatchWinPrize(teamId);

    if (prize > 0) {
      set({
        teamFinances: new Map(state.engine.teamFinances),
        transactionHistory: [...state.engine.transactionHistory],
        lastUpdate: Date.now()
      });
    }

    return prize;
  },

  /**
   * Update match result for a team (performance tracking)
   * @param {string} teamId - Team ID
   * @param {boolean} won - Did team win?
   * @param {boolean} isHomeMatch - Was it a home match?
   * @param {number} currentStanding - Current league position
   */
  updateMatchResult: (teamId, won, isHomeMatch = false, currentStanding = null) => {
    const state = get();
    state.engine.updateMatchResult(teamId, won, isHomeMatch, currentStanding);

    set({
      teamFinances: new Map(state.engine.teamFinances),
      lastUpdate: Date.now()
    });
  },

  /**
   * Calculate and award ticket revenue for a home match
   * @param {string} teamId - Home team ID
   * @returns {number} Ticket revenue
   */
  calculateTicketRevenue: (teamId) => {
    const state = get();
    const revenue = state.engine.calculateTicketRevenue(teamId);

    if (revenue > 0) {
      set({
        teamFinances: new Map(state.engine.teamFinances),
        transactionHistory: [...state.engine.transactionHistory],
        lastUpdate: Date.now()
      });
    }

    return revenue;
  },

  /**
   * Calculate and award broadcast revenue for a match
   * @param {string} teamId - Team ID
   * @returns {number} Broadcast revenue
   */
  calculateBroadcastRevenue: (teamId) => {
    const state = get();
    const revenue = state.engine.calculateBroadcastRevenue(teamId);

    if (revenue > 0) {
      set({
        teamFinances: new Map(state.engine.teamFinances),
        transactionHistory: [...state.engine.transactionHistory],
        lastUpdate: Date.now()
      });
    }

    return revenue;
  },

  /**
   * Distribute end-of-season prize money
   * @param {Array} finalStandings - Array of {teamId, position}
   * @returns {Object} Prize distribution
   */
  distributeSeasonEndPrizes: (finalStandings) => {
    const state = get();
    const distribution = state.engine.distributeSeasonEndPrizes(finalStandings);

    set({
      teamFinances: new Map(state.engine.teamFinances),
      transactionHistory: [...state.engine.transactionHistory],
      lastUpdate: Date.now()
    });

    return distribution;
  },

  /**
   * Add revenue to a team's finances
   * @param {string} teamId - Team ID
   * @param {Object} revenueData - Revenue transaction data
   * @returns {string} Transaction ID
   */
  addRevenue: (teamId, revenueData) => {
    const state = get();
    const transactionId = state.engine.recordTransaction({
      teamId,
      type: revenueData.category || 'revenue_other',
      amount: revenueData.amount,
      description: revenueData.description,
      metadata: revenueData.metadata || {}
    });

    // Update team's budget
    const finance = state.engine.teamFinances.get(teamId);
    if (finance) {
      finance.budget += revenueData.amount;
    }

    set({
      teamFinances: new Map(state.engine.teamFinances),
      transactionHistory: [...state.engine.transactionHistory],
      lastUpdate: Date.now()
    });

    return transactionId;
  },

  // ============================================
  // QUERIES & GETTERS
  // ============================================

  /**
   * Get current budget for a team
   * @param {string} teamId - Team ID
   * @returns {number} Current budget
   */
  getTeamBudget: (teamId) => {
    const state = get();
    return state.engine.getTeamBudget(teamId);
  },

  /**
   * Get complete financial details for a team
   * @param {string} teamId - Team ID
   * @returns {Object|null} Finance object
   */
  getTeamFinances: (teamId) => {
    const state = get();
    //console.log('💰 getTeamFinances called for teamId:', teamId);
    // console.log('💰 Current state:', {
    //   initialized: state.initialized,
    //   seasonId: state.seasonId,
    //   teamFinancesSize: state.teamFinances?.size,
    //   hasEngine: !!state.engine,
    //   engineHasMethod: !!(state.engine && typeof state.engine.getTeamFinances === 'function')
    // });

    // Safety check: ensure engine exists and has the method
    if (!state.engine || typeof state.engine.getTeamFinances !== 'function') {
      console.warn('FinanceEngine not properly initialized, reinitializing...');
      const newEngine = new FinanceEngine();
      if (state.teamFinances && state.teamFinances.size > 0) {
        newEngine.teamFinances = state.teamFinances;
        newEngine.transactionHistory = state.transactionHistory || [];
      }
      set({ engine: newEngine });
      const result = newEngine.getTeamFinances(teamId);
      //console.log('💰 getTeamFinances - After reinit, returning:', result);
      return result;
    }
    const result = state.engine.getTeamFinances(teamId);
    //console.log('💰 getTeamFinances - Returning from engine:', result);
    return result;
  },

  /**
   * Get all team finances as an array
   * @returns {Array} Array of finance objects
   */
  getAllTeamFinances: () => {
    const state = get();
    return state.engine.getAllTeamFinances();
  },

  /**
   * Get financial summary for all teams
   * @returns {Object} Summary object
   */
  getFinancialSummary: () => {
    const state = get();
    return state.engine.getFinancialSummary();
  },

  /**
   * Get transaction history for a team
   * @param {string} teamId - Team ID
   * @returns {Array} Transactions
   */
  getTeamTransactionHistory: (teamId) => {
    const state = get();
    return state.engine.getTeamTransactionHistory(teamId);
  },

  /**
   * Get transactions by type
   * @param {string} type - Transaction type
   * @returns {Array} Transactions
   */
  getTransactionsByType: (type) => {
    const state = get();
    return state.engine.getTransactionsByType(type);
  },

  /**
   * Validate if team can afford an expense
   * @param {string} teamId - Team ID
   * @param {number} amount - Expense amount
   * @returns {Object} Validation result
   */
  validateBudget: (teamId, amount) => {
    const state = get();
    return state.engine.validateBudget(teamId, amount);
  },

  /**
   * Generate detailed financial report for a team
   * @param {string} teamId - Team ID
   * @returns {Object|null} Financial report
   */
  generateTeamReport: (teamId) => {
    const state = get();
    return state.engine.generateTeamReport(teamId);
  },

  // ============================================
  // BATCH OPERATIONS (for league integration)
  // ============================================

  /**
   * Process match financials for both teams
   * @param {Object} matchResult - Match result object
   * @param {Array} currentStandings - Current league standings
   */
  processMatchFinancials: (matchResult, currentStandings) => {
    const state = get();

    // Get team standings
    const homeStanding = currentStandings.findIndex(s => s.clubId === matchResult.homeTeam) + 1;
    const awayStanding = currentStandings.findIndex(s => s.clubId === matchResult.awayTeam) + 1;

    // Home team processing
    const homeWon = matchResult.winner === matchResult.homeTeam;
    state.engine.updateMatchResult(matchResult.homeTeam, homeWon, true, homeStanding);
    state.engine.calculateTicketRevenue(matchResult.homeTeam);
    state.engine.calculateBroadcastRevenue(matchResult.homeTeam);

    if (homeWon) {
      state.engine.awardMatchWinPrize(matchResult.homeTeam);
    }

    // Away team processing
    const awayWon = matchResult.winner === matchResult.awayTeam;
    state.engine.updateMatchResult(matchResult.awayTeam, awayWon, false, awayStanding);
    state.engine.calculateBroadcastRevenue(matchResult.awayTeam);

    if (awayWon) {
      state.engine.awardMatchWinPrize(matchResult.awayTeam);
    }

    // Update store state
    set({
      teamFinances: new Map(state.engine.teamFinances),
      transactionHistory: [...state.engine.transactionHistory],
      lastUpdate: Date.now()
    });
  },

  /**
   * Process auction results for all teams
   * @param {Array} auctionResults - Array of {teamId, spending, players}
   */
  processAuctionResults: (auctionResults) => {
    const state = get();
    let anySuccess = false;

    auctionResults.forEach(({ teamId, spending, players }) => {
      const success = state.engine.processAuctionSpending(teamId, spending, players);
      if (success) anySuccess = true;
    });

    if (anySuccess) {
      set({
        teamFinances: new Map(state.engine.teamFinances),
        transactionHistory: [...state.engine.transactionHistory],
        lastUpdate: Date.now()
      });
    }
  },

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Get league-wide financial statistics
   * @returns {Object} Statistics
   */
  getLeagueFinancialStats: () => {
    const state = get();
    const allFinances = state.engine.getAllTeamFinances();

    return {
      totalBudget: allFinances.reduce((sum, f) => sum + f.currentBudget, 0),
      avgBudget: allFinances.reduce((sum, f) => sum + f.currentBudget, 0) / allFinances.length,
      totalRevenue: allFinances.reduce((sum, f) => sum + f.totalRevenue, 0),
      totalExpenses: allFinances.reduce((sum, f) => sum + f.totalExpenses, 0),
      richestTeam: allFinances.reduce((max, f) =>
        f.currentBudget > max.currentBudget ? f : max, allFinances[0]),
      poorestTeam: allFinances.reduce((min, f) =>
        f.currentBudget < min.currentBudget ? f : min, allFinances[0]),
      totalTransactions: state.engine.transactionHistory.length
    };
  },

  /**
   * Get teams sorted by budget
   * @param {boolean} ascending - Sort ascending or descending
   * @returns {Array} Sorted teams
   */
  getTeamsByBudget: (ascending = false) => {
    const state = get();
    const finances = state.engine.getAllTeamFinances();

    return finances.sort((a, b) =>
      ascending
        ? a.currentBudget - b.currentBudget
        : b.currentBudget - a.currentBudget
    );
  },

  /**
   * Check if any team is below minimum reserve
   * @returns {Array} Teams below reserve
   */
  getTeamsBelowReserve: () => {
    const state = get();
    const finances = state.engine.getAllTeamFinances();
    const minReserve = state.engine.config.budgetLimits.minimumReserve.amount;

    return finances.filter(f => f.currentBudget < minReserve);
  }
    }),
    {
      name: 'cm25-finance-store',
      version: 1,
      storage: createJSONStorage(() => indexedDBStorage, {
        // Custom serialization to handle Map and FinanceEngine
        serialize: (state) => {
          console.log('💰 SERIALIZE - state.state:', state.state);
          const { engine, ...rest } = state.state;
          console.log('💰 SERIALIZE - rest:', rest);
          console.log('💰 SERIALIZE - rest.teamFinances:', rest.teamFinances);
          console.log('💰 SERIALIZE - rest.teamFinances type:', rest.teamFinances?.constructor?.name);

          // Convert Map to plain object for serialization
          const teamFinancesArray = rest.teamFinances instanceof Map
            ? Array.from(rest.teamFinances.entries())
            : [];

          console.log('💰 SERIALIZE - teamFinancesArray:', teamFinancesArray);

          const serializedState = {
            ...rest,
            teamFinancesArray
          };
          delete serializedState.teamFinances;

          const result = JSON.stringify({ state: serializedState, version: state.version });
          console.log('💰 SERIALIZE - result length:', result.length);
          return result;
        },
        deserialize: (str) => {
          console.log('💰 DESERIALIZE - str length:', str.length);
          const { state: serializedState, version } = JSON.parse(str);
          console.log('💰 DESERIALIZE - serializedState:', serializedState);

          // Recreate Map from array
          const teamFinancesMap = new Map(serializedState.teamFinancesArray || []);
          console.log('💰 DESERIALIZE - teamFinancesMap:', teamFinancesMap);
          console.log('💰 DESERIALIZE - teamFinancesMap.size:', teamFinancesMap.size);

          delete serializedState.teamFinancesArray;

          // Recreate FinanceEngine and restore its state
          const engine = new FinanceEngine();
          if (teamFinancesMap.size > 0) {
            engine.teamFinances = teamFinancesMap;
            engine.transactionHistory = serializedState.transactionHistory || [];
          }

          console.log('💰 DESERIALIZE - engine.teamFinances.size:', engine.teamFinances.size);

          return {
            state: {
              ...serializedState,
              engine,
              teamFinances: teamFinancesMap
            },
            version
          };
        }
      }),
      // Ensure engine is always properly initialized after rehydration
      onRehydrateStorage: () => (state) => {
        console.log('💰 onRehydrateStorage - state:', state);

        if (!state) {
          console.log('💰 onRehydrateStorage - No state to rehydrate');
          return;
        }

        // Migration: If initialized but no teamFinances, reset to force re-initialization
        const hasNoFinances = !state.teamFinances
          || (state.teamFinances instanceof Map && state.teamFinances.size === 0)
          || (!(state.teamFinances instanceof Map) && Object.keys(state.teamFinances).length === 0);

        if (state.initialized && state.seasonId && hasNoFinances) {
          console.log('🔄 MIGRATION: Old save detected without finances');
          console.log('💰 MIGRATION: teamFinances type:', state.teamFinances?.constructor?.name);
          console.log('💰 MIGRATION: teamFinances value:', state.teamFinances);
          console.log('💰 MIGRATION: Resetting finance state - finances will be initialized when needed');

          // Reset the finance state - finances will be initialized next time the game starts
          state.initialized = false;
          state.seasonId = null;
          state.teamFinances = new Map();
          state.transactionHistory = [];
          state.engine = new FinanceEngine();

          console.log('✅ MIGRATION: Finance state reset');
        }

        // Normal rehydration - ensure engine exists
        if (!state.engine || typeof state.engine.getTeamFinances !== 'function') {
          console.log('Reinitializing FinanceEngine after rehydration');
          const newEngine = new FinanceEngine();
          if (state.teamFinances && state.teamFinances.size > 0) {
            newEngine.teamFinances = state.teamFinances;
            newEngine.transactionHistory = state.transactionHistory || [];
          }
          state.engine = newEngine;
        }

        // Mark as hydrated
        markHydrated('finance');
      }
    }
  )
);

export default useFinanceStore;
