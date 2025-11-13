/**
 * @file leagueStore.js
 * @description Store for league state, fixtures, and standings
 * @module stores/leagueStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const useLeagueStore = create(
  persist(
    (set, get) => ({
  // Season Information
  seasonId: null,
  seasonName: '',
  currentMatchday: 0,
  currentWeek: 0,
  currentFixtureIndex: 0, // Current fixture index for linear progression
  stage: 'league', // league | playoffs | completed
  useMatchWeeks: false,

  // Fixtures & Results
  fixtures: [], // All scheduled matches
  matchWeeks: [], // Match week schedule (if using match weeks)
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
    const { seasonId, seasonName, clubs, fixtures, matchWeeks = null, useMatchWeeks = false } = config;

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
      currentWeek: 0,
      currentFixtureIndex: 0,
      stage: 'league',
      useMatchWeeks,
      fixtures,
      matchWeeks: matchWeeks || [],
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
   * Recalculate standings from all results (including NRR)
   * Call this after each match to update the league table
   */
  recalculateStandings: () => set((state) => {
    const { results, standings, clubs } = state;

    // Reset all standings to initial state
    const updatedStandings = standings.map(team => ({
      ...team,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      runsScored: 0,
      runsConceded: 0,
      ballsFaced: 0,
      ballsBowled: 0,
      netRunRate: 0.0
    }));

    // Create a map for quick lookup
    const standingsMap = {};
    updatedStandings.forEach(team => {
      standingsMap[team.clubId] = team;
    });

    // Process each result
    results.forEach(result => {
      const homeTeam = standingsMap[result.homeTeam];
      const awayTeam = standingsMap[result.awayTeam];

      if (!homeTeam || !awayTeam) {
        console.warn('Team not found in standings:', result.homeTeam, result.awayTeam);
        return;
      }

      // Update matches played
      homeTeam.played++;
      awayTeam.played++;

      // Get innings data
      const innings1 = result.innings1; // First team batting
      const innings2 = result.innings2; // Second team batting

      // Determine which team batted first (check which innings belongs to which team)
      const homeTeamBattedFirst = innings1.battingTeam === result.homeTeam;

      // Home team stats
      if (homeTeamBattedFirst) {
        homeTeam.runsScored += innings1.totalScore;
        homeTeam.ballsFaced += innings1.ballsFaced || (innings1.oversCompleted * 6 + (innings1.ballsInCurrentOver || 0));
        homeTeam.runsConceded += innings2.totalScore;
        homeTeam.ballsBowled += innings2.ballsFaced || (innings2.oversCompleted * 6 + (innings2.ballsInCurrentOver || 0));
      } else {
        homeTeam.runsScored += innings2.totalScore;
        homeTeam.ballsFaced += innings2.ballsFaced || (innings2.oversCompleted * 6 + (innings2.ballsInCurrentOver || 0));
        homeTeam.runsConceded += innings1.totalScore;
        homeTeam.ballsBowled += innings1.ballsFaced || (innings1.oversCompleted * 6 + (innings1.ballsInCurrentOver || 0));
      }

      // Away team stats (opposite of home team)
      if (homeTeamBattedFirst) {
        awayTeam.runsScored += innings2.totalScore;
        awayTeam.ballsFaced += innings2.ballsFaced || (innings2.oversCompleted * 6 + (innings2.ballsInCurrentOver || 0));
        awayTeam.runsConceded += innings1.totalScore;
        awayTeam.ballsBowled += innings1.ballsFaced || (innings1.oversCompleted * 6 + (innings1.ballsInCurrentOver || 0));
      } else {
        awayTeam.runsScored += innings1.totalScore;
        awayTeam.ballsFaced += innings1.ballsFaced || (innings1.oversCompleted * 6 + (innings1.ballsInCurrentOver || 0));
        awayTeam.runsConceded += innings2.totalScore;
        awayTeam.ballsBowled += innings2.ballsFaced || (innings2.oversCompleted * 6 + (innings2.ballsInCurrentOver || 0));
      }

      // Update win/loss/tie
      if (result.winner === result.homeTeam) {
        homeTeam.won++;
        awayTeam.lost++;
      } else if (result.winner === result.awayTeam) {
        awayTeam.won++;
        homeTeam.lost++;
      } else if (result.winner === 'tie') {
        homeTeam.tied++;
        awayTeam.tied++;
      } else {
        homeTeam.noResult++;
        awayTeam.noResult++;
      }
    });

    // Calculate points and NRR for each team
    updatedStandings.forEach(team => {
      // Points: Win = 2, Tie/NR = 1, Loss = 0
      team.points = (team.won * 2) + team.tied + team.noResult;

      // Calculate NRR: (runs scored per over) - (runs conceded per over)
      const runRateScored = team.ballsFaced > 0 ? (team.runsScored / team.ballsFaced) * 6 : 0;
      const runRateConceded = team.ballsBowled > 0 ? (team.runsConceded / team.ballsBowled) * 6 : 0;
      team.netRunRate = runRateScored - runRateConceded;
    });

    // Sort standings: Points DESC, then NRR DESC
    updatedStandings.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.netRunRate - a.netRunRate;
    });

    return {
      standings: updatedStandings
    };
  }),

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
   * Advance to next week
   */
  advanceWeek: () => set((state) => ({
    currentWeek: state.currentWeek + 1
  })),

  /**
   * Set current week
   * @param {number} week - Week number
   */
  setWeek: (week) => set(() => ({
    currentWeek: week
  })),

  /**
   * Get a fixture by ID
   * @param {string} fixtureId - Fixture ID (matchId)
   * @returns {Object|null} Fixture object or null if not found
   */
  getFixtureById: (fixtureId) => {
    const state = get();
    // Search in league fixtures by matchId field
    const leagueFixture = state.fixtures.find(f => f.matchId === fixtureId || f.id === fixtureId);
    if (leagueFixture) return leagueFixture;

    // Search in playoff fixtures if not found
    const playoffFixture = state.playoffFixtures.find(f => f.matchId === fixtureId || f.id === fixtureId);
    return playoffFixture || null;
  },

  /**
   * Get the next fixture to be played
   * @returns {Object|null} Next fixture or null if season complete
   */
  getNextFixture: () => {
    const state = get();
    if (state.currentFixtureIndex >= state.fixtures.length) {
      // Check if there are playoff fixtures
      if (state.stage === 'league' && state.playoffFixtures.length > 0) {
        return state.playoffFixtures[0];
      }
      return null; // Season complete
    }
    return state.fixtures[state.currentFixtureIndex];
  },

  /**
   * Check if a fixture involves the user's team
   * @param {Object} fixture - Fixture object
   * @param {string} userTeamId - User's team ID
   * @returns {boolean} True if user team is playing
   */
  isUserTeamMatch: (fixture, userTeamId) => {
    if (!fixture || !userTeamId) return false;
    return fixture.homeTeam === userTeamId || fixture.awayTeam === userTeamId;
  },

  /**
   * Advance to the next fixture
   * @returns {Object|null} Next fixture after advancing, or null if season complete
   */
  advanceToNextMatch: () => {
    set((state) => ({
      currentFixtureIndex: state.currentFixtureIndex + 1,
      currentMatchday: state.currentMatchday + 1
    }));

    return get().getNextFixture();
  },

  /**
   * Record a match as completed and advance
   * @param {string} matchId - Match ID
   * @param {Object} result - Match result
   */
  recordMatchComplete: (matchId, result) => {
    const state = get();

    // Record the result
    state.recordResult(result);

    // Update standings
    state.updateStandings(result);

    // Advance to next match
    return state.advanceToNextMatch();
  },

  /**
   * Get current season progress
   * @returns {Object} Progress information
   */
  getSeasonProgress: () => {
    const state = get();
    const totalMatches = state.fixtures.length;
    const completedMatches = state.results.length;
    const progressPercent = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

    return {
      currentFixture: state.currentFixtureIndex,
      totalFixtures: totalMatches,
      completed: completedMatches,
      remaining: totalMatches - completedMatches,
      progressPercent: Math.round(progressPercent),
      currentWeek: state.currentWeek,
      stage: state.stage
    };
  },

  /**
   * Reset league state
   */
  resetLeague: () => set({
    seasonId: null,
    seasonName: '',
    currentMatchday: 0,
    currentWeek: 0,
    currentFixtureIndex: 0,
    stage: 'league',
    useMatchWeeks: false,
    fixtures: [],
    matchWeeks: [],
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
    }),
    {
      name: 'cm25-league-store',
      version: 2
    }
  )
);

export default useLeagueStore;
