/**
 * @file leagueStore.js
 * @description Store for league state, fixtures, and standings
 * @module stores/leagueStore
 */

import { create } from 'zustand';

/**
 * @typedef {Object} LeagueState
 * @property {string} seasonId - Current season ID
 * @property {number} currentMatchday - Current matchday number (1-90 for league stage)
 * @property {string} stage - 'league' | 'playoffs' | 'completed'
 * @property {Array} fixtures - All match fixtures
 * @property {Array} results - Completed match results
 * @property {Array} standings - Current league standings
 * @property {Object} clubs - Club data indexed by ID
 */

const useLeagueStore = create((set, get) => ({
  // Season Information
  seasonId: null,
  seasonName: '',
  currentMatchday: 0,
  stage: 'league', // league | playoffs | completed

  // Fixtures & Results
  fixtures: [], // All scheduled matches
  results: [], // Completed match results

  // Standings
  standings: [], // Current league table

  // Clubs
  clubs: {}, // Club data indexed by ID

  // Statistics
  stats: {
    totalMatches: 0,
    completedMatches: 0,
    highestScore: null,
    lowestScore: null
  },

  // Playoffs
  playoffFixtures: [],
  playoffResults: [],
  champion: null,

  // Actions
  /**
   * Initialize a new league season
   * @param {Object} config - League configuration
   */
  initializeSeason: (config) => set(() => {
    const { seasonId, seasonName, clubs, fixtures } = config;

    // Initialize standings for each club
    const standings = clubs.map(club => ({
      clubId: club.id,
      clubName: club.name,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      netRunRate: 0.0,
      runsScored: 0,
      runsConceded: 0,
      ballsFaced: 0,
      ballsBowled: 0
    }));

    // Index clubs by ID
    const clubsMap = {};
    clubs.forEach(club => {
      clubsMap[club.id] = club;
    });

    return {
      seasonId,
      seasonName,
      currentMatchday: 0,
      stage: 'league',
      fixtures,
      results: [],
      standings,
      clubs: clubsMap,
      stats: {
        totalMatches: fixtures.length,
        completedMatches: 0,
        highestScore: null,
        lowestScore: null
      }
    };
  }),

  /**
   * Record a match result
   * @param {Object} result - Match result object
   */
  recordResult: (result) => set((state) => {
    const newResults = [...state.results, result];
    const newStats = { ...state.stats };

    // Update highest/lowest scores
    const firstInningsScore = result.innings1.totalScore;
    const secondInningsScore = result.innings2.totalScore;

    if (!newStats.highestScore || firstInningsScore > newStats.highestScore.score) {
      newStats.highestScore = {
        score: firstInningsScore,
        team: result.homeTeam,
        matchId: result.matchId
      };
    }
    if (!newStats.highestScore || secondInningsScore > newStats.highestScore.score) {
      newStats.highestScore = {
        score: secondInningsScore,
        team: result.awayTeam,
        matchId: result.matchId
      };
    }

    if (!newStats.lowestScore || firstInningsScore < newStats.lowestScore.score) {
      newStats.lowestScore = {
        score: firstInningsScore,
        team: result.homeTeam,
        matchId: result.matchId
      };
    }
    if (!newStats.lowestScore || secondInningsScore < newStats.lowestScore.score) {
      newStats.lowestScore = {
        score: secondInningsScore,
        team: result.awayTeam,
        matchId: result.matchId
      };
    }

    newStats.completedMatches = newResults.length;

    return {
      results: newResults,
      stats: newStats
    };
  }),

  /**
   * Update league standings
   * @param {Array} newStandings - Updated standings array
   */
  updateStandings: (newStandings) => set(() => ({
    standings: newStandings
  })),

  /**
   * Advance to next matchday
   */
  advanceMatchday: () => set((state) => ({
    currentMatchday: state.currentMatchday + 1
  })),

  /**
   * Set current matchday
   * @param {number} matchday - Matchday number
   */
  setMatchday: (matchday) => set(() => ({
    currentMatchday: matchday
  })),

  /**
   * Set league stage
   * @param {string} stage - League stage
   */
  setStage: (stage) => set(() => ({
    stage
  })),

  /**
   * Set playoff fixtures
   * @param {Array} fixtures - Playoff fixtures
   */
  setPlayoffFixtures: (fixtures) => set(() => ({
    playoffFixtures: fixtures
  })),

  /**
   * Add playoff result
   * @param {Object} result - Playoff match result
   */
  addPlayoffResult: (result) => set((state) => ({
    playoffResults: [...state.playoffResults, result]
  })),

  /**
   * Set season champion
   * @param {Object} championInfo - Champion information
   */
  setChampion: (championInfo) => set(() => ({
    champion: championInfo
  })),

  /**
   * Get club by ID
   * @param {string} clubId - Club ID
   * @returns {Object|null} Club object or null
   */
  getClub: (clubId) => {
    const state = get();
    return state.clubs[clubId] || null;
  },

  /**
   * Get fixtures for specific matchday
   * @param {number} matchday - Matchday number
   * @returns {Array} Fixtures for the matchday
   */
  getMatchdayFixtures: (matchday) => {
    const state = get();
    return state.fixtures.filter(f => f.matchday === matchday);
  },

  /**
   * Get current standings sorted by points and NRR
   * @returns {Array} Sorted standings
   */
  getCurrentStandings: () => {
    const state = get();
    return [...state.standings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.netRunRate - a.netRunRate;
    });
  },

  /**
   * Get match results for a specific club
   * @param {string} clubId - Club ID
   * @returns {Array} Club's match results
   */
  getClubResults: (clubId) => {
    const state = get();
    return state.results.filter(r =>
      r.homeTeam === clubId || r.awayTeam === clubId
    );
  },

  /**
   * Reset league state
   */
  resetLeague: () => set({
    seasonId: null,
    seasonName: '',
    currentMatchday: 0,
    stage: 'league',
    fixtures: [],
    results: [],
    standings: [],
    clubs: {},
    stats: {
      totalMatches: 0,
      completedMatches: 0,
      highestScore: null,
      lowestScore: null
    },
    playoffFixtures: [],
    playoffResults: [],
    champion: null
  })
}));

export default useLeagueStore;
