/**
 * @file leagueStore.js
 * @description Store for league state, fixtures, and standings
 * @module stores/leagueStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import PlayoffGenerator from '../core/league/PlayoffGenerator.js';
import MatchWeekScheduleGenerator from '../core/league/MatchWeekScheduleGenerator.js';
import useGameStore from './gameStore';
import { getNewsDispatcher } from '../core/news/newsDispatcherSingleton.js';
import { compressedStorageOptions } from '../utils/compression.js';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';

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

// Pure helper: apply a single match result to a standings array and return a new,
// sorted standings array. No side effects — used by both `recordResult` (so the
// news emit inside the same set() sees post-match standings) and the legacy
// `updateStandingsForMatch` action.
function applyResultToStandings(standings, result) {
  if (!Array.isArray(standings) || !result) return standings;

  const updated = standings.map(team => ({ ...team }));
  const byId = {};
  updated.forEach(t => { byId[t.clubId] = t; });

  const homeTeam = byId[result.homeTeam];
  const awayTeam = byId[result.awayTeam];
  if (!homeTeam || !awayTeam) {
    console.warn('[applyResultToStandings] Team not found:', result.homeTeam, result.awayTeam);
    return standings;
  }

  homeTeam.played++;
  awayTeam.played++;

  const innings1 = result.innings1;
  const innings2 = result.innings2;
  const homeTeamBattedFirst = innings1?.battingTeam === result.homeTeam;

  // Balls calculation (mirrors recalculateStandings)
  const calculateBalls = (innings) => {
    if (!innings) return 0;
    if (innings.ballsBowled != null && innings.ballsBowled > 0) return innings.ballsBowled;
    if (innings.ballsFaced != null && innings.ballsFaced > 0) return innings.ballsFaced;
    if (innings.overs != null && innings.balls != null) {
      return (parseInt(innings.overs, 10) || 0) * 6 + (parseInt(innings.balls, 10) || 0);
    }
    if (innings.overs != null) {
      const oversFloat = parseFloat(innings.overs);
      const completeOvers = Math.floor(oversFloat);
      const ballsInOver = Math.round((oversFloat - completeOvers) * 10);
      return completeOvers * 6 + ballsInOver;
    }
    if (innings.oversCompleted != null) {
      return innings.oversCompleted * 6 + (innings.ballsInCurrentOver || 0);
    }
    if (innings.balls != null && innings.balls > 0) return innings.balls;
    return 0;
  };

  const innings1Balls = calculateBalls(innings1);
  const innings2Balls = calculateBalls(innings2);
  // T20 NRR rule: all-out side gets credited the full 120-ball quota
  const innings1BallsForNRR = innings1?.wickets === 10 ? 120 : innings1Balls;
  const innings2BallsForNRR = innings2?.wickets === 10 ? 120 : innings2Balls;

  if (homeTeamBattedFirst) {
    homeTeam.runsScored += innings1?.totalScore || 0;
    homeTeam.ballsFaced += innings1BallsForNRR;
    homeTeam.runsConceded += innings2?.totalScore || 0;
    homeTeam.ballsBowled += innings2BallsForNRR;
    awayTeam.runsScored += innings2?.totalScore || 0;
    awayTeam.ballsFaced += innings2BallsForNRR;
    awayTeam.runsConceded += innings1?.totalScore || 0;
    awayTeam.ballsBowled += innings1BallsForNRR;
  } else {
    homeTeam.runsScored += innings2?.totalScore || 0;
    homeTeam.ballsFaced += innings2BallsForNRR;
    homeTeam.runsConceded += innings1?.totalScore || 0;
    homeTeam.ballsBowled += innings1BallsForNRR;
    awayTeam.runsScored += innings1?.totalScore || 0;
    awayTeam.ballsFaced += innings1BallsForNRR;
    awayTeam.runsConceded += innings2?.totalScore || 0;
    awayTeam.ballsBowled += innings2BallsForNRR;
  }

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

  [homeTeam, awayTeam].forEach(team => {
    team.points = (team.won * 2) + team.tied + team.noResult;
    const runRateScored = team.ballsFaced > 0 ? (team.runsScored / team.ballsFaced) * 6 : 0;
    const runRateConceded = team.ballsBowled > 0 ? (team.runsConceded / team.ballsBowled) * 6 : 0;
    team.netRunRate = runRateScored - runRateConceded;
  });

  updated.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.netRunRate - a.netRunRate;
  });

  return updated;
}

// Pure helper: given current fixtures + calendar events + clubs + a playoff result,
// returns the updated fixtures and calendar events. No side effects — caller applies them.
// This is the single source of truth for playoff bracket progression.
function computePlayoffBracketUpdate(currentFixtures, currentCalendarEvents, clubs, result) {
  const playoffGenerator = new PlayoffGenerator();
  const playoffFixtures = currentFixtures.filter(f => f.type === 'playoff');
  const updatedPlayoffFixtures = playoffGenerator.updatePlayoffFixtures(
    playoffFixtures,
    result,
    clubs
  );

  const updatedById = new Map(updatedPlayoffFixtures.map(f => [f.matchId, f]));

  const updatedFixtures = currentFixtures.map(f =>
    f.type === 'playoff' ? (updatedById.get(f.matchId) || f) : f
  );

  const updatedCalendarEvents = currentCalendarEvents.map(event => {
    if (event.type === 'match' && event.data && event.data.type === 'playoff') {
      const updatedFixture = updatedById.get(event.data.matchId);
      if (updatedFixture) {
        return { ...event, data: { ...event.data, ...updatedFixture } };
      }
    }
    return event;
  });

  return { fixtures: updatedFixtures, calendarEvents: updatedCalendarEvents };
}

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
   * @param {Object} fullScorecard - Optional full scorecard data (for match result modal)
   */
  recordResult: (result, fullScorecard = null) => set((state) => {
    // Store result with optional full scorecard. Tag with gameDay/date from
    // the gameStore so downstream consumers (weekly roundup, news context)
    // can filter recent results without re-deriving the calendar.
    const gsForTag = useGameStore.getState();
    const resultToStore = {
      ...result,
      ...(fullScorecard ? { fullScorecard } : {}),
      gameDay: result.gameDay ?? gsForTag.gameDay,
      recordedDate: result.recordedDate ?? gsForTag.currentDate ?? new Date().toISOString(),
      season: result.season ?? gsForTag.currentSeason
    };

    const newResults = [...state.results, resultToStore];
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

    // Update playoff results if in playoff stage
    let updatedPlayoffResults = state.playoffResults;
    let updatedFixtures = state.fixtures;
    let extraStateUpdate = {};

    const isPlayoffMatch = state.stage === 'playoffs' &&
      (result.type === 'playoff' || result.matchId?.startsWith('playoff_'));

    if (isPlayoffMatch) {
      console.log(`🏆 Recording playoff result for ${result.matchId}`);
      updatedPlayoffResults = [...state.playoffResults, result];

      // Atomic bracket update: callers no longer need to invoke a separate helper.
      // This is the architectural fix for the recurring "Final shows TBD" bug —
      // previously MatchdayUI.jsx (interactive play-through) recorded the result
      // but never advanced the bracket, leaving Q2/Final unpopulated.
      const gameStore = useGameStore.getState();
      const bracketUpdate = computePlayoffBracketUpdate(
        state.fixtures,
        gameStore.calendarEvents,
        state.clubs,
        result
      );
      updatedFixtures = bracketUpdate.fixtures;
      useGameStore.setState({ calendarEvents: bracketUpdate.calendarEvents });

      const q2After = bracketUpdate.fixtures.find(f => f.matchId === 'playoff_q2');
      const finalAfter = bracketUpdate.fixtures.find(f => f.matchId === 'playoff_final');
      console.log(`   Q2:    ${q2After?.homeTeamName} vs ${q2After?.awayTeamName} — ${q2After?.status}`);
      console.log(`   Final: ${finalAfter?.homeTeamName} vs ${finalAfter?.awayTeamName} — ${finalAfter?.status}`);

      // If this is the Final match, crown the champion and dynamically schedule season_end.
      // season_end is NEVER pre-scheduled (see CLAUDE.md) — it's set one day after the Final.
      if (result.matchId === 'playoff_final') {
        console.log('🏆 FINAL MATCH COMPLETED — Setting champion and scheduling season end...');
        const championId = result.winner;
        const runnerUpId = result.winner === result.homeTeam ? result.awayTeam : result.homeTeam;
        const championTeam = state.clubs[championId];
        const runnerUpTeam = state.clubs[runnerUpId];

        let margin = '';
        const finalNumeric = typeof result.winMargin === 'number' ? result.winMargin : Number(result.margin);
        if (result.winByRuns || result.winType === 'runs') margin = `${finalNumeric} runs`;
        else if (result.winByWickets || result.winType === 'wickets') margin = `${finalNumeric} wickets`;
        else if (typeof result.margin === 'string') margin = result.margin.replace(/^by\s+/, '');

        const championInfo = {
          championId,
          runnerUpId,
          championName: championTeam?.name || 'Unknown',
          runnerUpName: runnerUpTeam?.name || 'Unknown',
          margin,
          finalResult: result
        };

        const nextDay = gameStore.gameDay + 1;
        gameStore.scheduleEvent(nextDay, 'season_end', {
          season: gameStore.currentSeason,
          championId,
          finalMatchId: result.matchId
        });
        console.log(`📅 Season end scheduled for day ${nextDay}`);
        console.log(`✅ Champion: ${championInfo.championName} defeated ${championInfo.runnerUpName}`);

        extraStateUpdate = { stage: 'completed', champion: championInfo };

        // Emit champion crowned news event (covers both Normal UI and Sim-to-Date paths)
        try {
          getNewsDispatcher().emit({
            type: 'playoff.champion_crowned',
            season: gameStore.currentSeason,
            gameDay: gameStore.gameDay,
            date: gameStore.currentDate || new Date().toISOString(),
            payload: {
              champion: { id: championId, name: championInfo.championName },
              runnerUp: { id: runnerUpId, name: championInfo.runnerUpName },
              margin: championInfo.margin,
              finalMatchId: result.matchId
            }
          });
        } catch (err) {
          console.error('[leagueStore] Failed to emit playoff.champion_crowned news:', err);
        }
      }
    }

    // Apply the result to the standings IN THE SAME set() callback so the news
    // emit below sees the post-match table (winner credited their +2 points
    // already). Previously the standings update lived in a separate
    // `updateStandingsForMatch` action that callers ran AFTER recordResult,
    // which meant the news fired with stale pre-match standings — articles
    // would say "climbed to 6th on 0 points" even when the team had just won.
    // Playoff matches don't move the regular-season table — skip the update.
    const updatedStandings = isPlayoffMatch
      ? state.standings
      : applyResultToStandings(state.standings, result);

    // Emit per-match news for EVERY recorded match (sim + Normal UI both reach here).
    // This is the canonical source for the Home news carousel — replaces the AI-vs-AI
    // match result modal flash (gated by `settings.matchResultModalMode`).
    try {
      const gs = useGameStore.getState();
      const clubsMap = state.clubs || {};
      const homeName = clubsMap[result.homeTeam]?.name || result.homeTeam;
      const awayName = clubsMap[result.awayTeam]?.name || result.awayTeam;
      const winnerId = result.winner;
      const loserId = winnerId === result.homeTeam ? result.awayTeam : result.homeTeam;
      const winnerName = clubsMap[winnerId]?.name || winnerId;
      const loserName = clubsMap[loserId]?.name || loserId;

      const homeRuns = result.innings1?.totalScore ?? 0;
      const homeWkts = result.innings1?.wickets ?? 0;
      const awayRuns = result.innings2?.totalScore ?? 0;
      const awayWkts = result.innings2?.wickets ?? 0;
      const winnerScore = winnerId === result.homeTeam ? `${homeRuns}/${homeWkts}` : `${awayRuns}/${awayWkts}`;
      const loserScore = winnerId === result.homeTeam ? `${awayRuns}/${awayWkts}` : `${homeRuns}/${homeWkts}`;
      const totalRuns = homeRuns + awayRuns;

      // QuickSimMatch produces `winType` ('runs' | 'wickets' | 'super over') +
      // `winMargin` (numeric) + `margin` (pre-formatted "by 8 wickets"). The
      // older code only knew `winByRuns/winByWickets` and fell through to the
      // pre-formatted string, producing "Lose by by 8 wickets". Handle both.
      const numericMargin = typeof result.winMargin === 'number'
        ? result.winMargin
        : Number(result.margin);
      const isRunsMargin = result.winByRuns || result.winType === 'runs';
      const isWicketsMargin = result.winByWickets || result.winType === 'wickets';
      const marginLabel = isRunsMargin
        ? `${numericMargin} runs`
        : isWicketsMargin
          ? `${numericMargin} wickets`
          : (typeof result.margin === 'string'
              ? result.margin.replace(/^by\s+/, '')
              : 'an unknown margin');

      // Classify the match for template predicate matching
      const isPlayoff = isPlayoffMatch;
      const stageLabel = result.matchId === 'playoff_q1' ? 'Qualifier 1'
        : result.matchId === 'playoff_q2' ? 'Qualifier 2'
        : result.matchId === 'playoff_eliminator' ? 'Eliminator'
        : result.matchId === 'playoff_final' ? 'Final'
        : '';
      const stageTag = result.matchId?.replace('playoff_', '') || '';
      const isHighScoring = totalRuns >= 360;
      const marginRuns = isRunsMargin ? numericMargin : null;
      const marginWkts = isWicketsMargin ? numericMargin : null;
      const isCloseFinish = (marginRuns != null && marginRuns <= 10) || (marginWkts != null && marginWkts <= 2);
      const isOneSided = (marginRuns != null && marginRuns >= 60) || (marginWkts != null && marginWkts >= 8);
      const potmName = result.playerOfMatch?.name || result.playerOfMatch?.id;
      const potmLine = potmName
        ? `${potmName} was named Player of the Match for a standout performance.`
        : 'Both sides will reflect on key passages of play before the next round of fixtures.';

      const venue = result.venue || clubsMap[result.homeTeam]?.homeGround || 'the ground';
      // Matchday should be a plain number. If the fixture didn't carry one,
      // try to extract it from a matchId like "match_6"; otherwise fall back
      // to the matchId as-is. Prevents "Matchday match_6" leaking into copy.
      let matchday = '';
      if (typeof result.matchday === 'number' || (typeof result.matchday === 'string' && result.matchday.length > 0)) {
        matchday = result.matchday;
      } else if (typeof result.matchId === 'string') {
        const m = result.matchId.match(/^(?:match|playoff)_(\w+)$/);
        matchday = m ? m[1] : result.matchId;
      }

      getNewsDispatcher().emit({
        type: 'match.result',
        season: gs.currentSeason,
        gameDay: gs.gameDay,
        date: gs.currentDate || new Date().toISOString(),
        payload: {
          matchId: result.matchId,
          matchday,
          venue,
          home: { id: result.homeTeam, name: homeName, score: `${homeRuns}/${homeWkts}` },
          away: { id: result.awayTeam, name: awayName, score: `${awayRuns}/${awayWkts}` },
          winner: { id: winnerId, name: winnerName, score: winnerScore },
          loser: { id: loserId, name: loserName, score: loserScore },
          margin: marginLabel,
          marginRuns,
          marginWkts,
          totalRuns,
          isPlayoff,
          stageLabel,
          stageTag,
          isHighScoring,
          isCloseFinish,
          isOneSided,
          potmLine,
          playerOfMatch: result.playerOfMatch || null
        },
        // Heavy render-only data — the block assembler reads this, inboxSubscriber
        // strips it before persisting so IndexedDB doesn't get bloated by per-ball logs.
        context: {
          fullScorecard,
          ballByBall: Array.isArray(result.ballByBall) ? result.ballByBall : [],
          // Post-match standings so the closing-line block reads the table
          // the team will be on AFTER tonight, not before.
          standingsSnapshot: updatedStandings,
          playoffResults: state.playoffResults
        }
      });
    } catch (err) {
      console.error('[leagueStore] Failed to emit match.result news:', err);
    }

    return {
      results: newResults,
      stats: newStats,
      standings: updatedStandings,
      playoffResults: updatedPlayoffResults,
      fixtures: updatedFixtures,
      ...extraStateUpdate
    };
  }),

  /**
   * Legacy API kept for backward compatibility with existing call sites in
   * Header.jsx and SimulationEngine.js. The bracket update is now performed
   * atomically inside recordResult(), making this call redundant but idempotent:
   * re-running PlayoffGenerator.updatePlayoffFixtures on already-updated fixtures
   * yields the same fixtures.
   * @param {Object} result - Playoff match result
   */
  updatePlayoffFixturesAfterResult: (result) => set((state) => {
    if (!result || !result.matchId?.startsWith('playoff_')) {
      console.warn('updatePlayoffFixturesAfterResult called with non-playoff match');
      return state;
    }
    const gameStore = useGameStore.getState();
    const bracketUpdate = computePlayoffBracketUpdate(
      state.fixtures,
      gameStore.calendarEvents,
      state.clubs,
      result
    );
    useGameStore.setState({ calendarEvents: bracketUpdate.calendarEvents });
    return { fixtures: bracketUpdate.fixtures };
  }),

  /**
   * Self-healing: rebuilds playoff bracket state from completed results.
   * Replays each playoff result against current fixtures in chronological order,
   * populating any TBD slots. Idempotent — safe to call any number of times.
   *
   * Used at:
   *   - app rehydration (fixes pre-existing broken save games)
   *   - advanceToNextMatch (defensive guard before next fixture lookup)
   */
  reconcilePlayoffFixtures: () => set((state) => {
    if (state.stage !== 'playoffs' && state.stage !== 'completed') {
      return state;
    }
    const playoffResultsInOrder = state.results.filter(
      r => r.matchId?.startsWith('playoff_')
    );
    if (playoffResultsInOrder.length === 0) {
      return state;
    }

    let fixtures = state.fixtures;
    const gameStore = useGameStore.getState();
    let calendarEvents = gameStore.calendarEvents;

    for (const result of playoffResultsInOrder) {
      const update = computePlayoffBracketUpdate(fixtures, calendarEvents, state.clubs, result);
      fixtures = update.fixtures;
      calendarEvents = update.calendarEvents;
    }

    useGameStore.setState({ calendarEvents });
    return { fixtures };
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
    results.forEach((result, idx) => {
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

      // Calculate balls from the innings data
      const calculateBalls = (innings) => {
        // Try multiple sources for ball count (in order of preference)
        // 1. ballsBowled - most accurate total
        if (innings.ballsBowled !== undefined && innings.ballsBowled !== null && innings.ballsBowled > 0) {
          return innings.ballsBowled;
        }
        // 2. ballsFaced - alternative total
        if (innings.ballsFaced !== undefined && innings.ballsFaced !== null && innings.ballsFaced > 0) {
          return innings.ballsFaced;
        }
        // 3. CRITICAL: Check if we have separate overs and balls fields (from matchStore)
        // In this case, overs is an integer (completed overs) and balls is balls in current over (0-5)
        if (innings.overs !== undefined && innings.overs !== null &&
            innings.balls !== undefined && innings.balls !== null) {
          const completeOvers = parseInt(innings.overs, 10) || 0;
          const ballsInOver = parseInt(innings.balls, 10) || 0;
          return completeOvers * 6 + ballsInOver;
        }
        // 4. Calculate from overs in cricket notation (e.g., 19.4 -> 19*6 + 4 = 118)
        if (innings.overs !== undefined && innings.overs !== null) {
          const oversFloat = parseFloat(innings.overs);
          const completeOvers = Math.floor(oversFloat);
          const ballsInOver = Math.round((oversFloat - completeOvers) * 10);
          return completeOvers * 6 + ballsInOver;
        }
        // 5. oversCompleted + ballsInCurrentOver
        if (innings.oversCompleted !== undefined && innings.oversCompleted !== null) {
          const ballsInCurrentOver = innings.ballsInCurrentOver || 0;
          const calculated = innings.oversCompleted * 6 + ballsInCurrentOver;
          return calculated;
        }
        // 6. Last resort: use balls field alone (might be ballsInCurrentOver - unreliable!)
        if (innings.balls !== undefined && innings.balls !== null && innings.balls > 0) {
          return innings.balls;
        }
        return 0;
      };

      const innings1Balls = calculateBalls(innings1);
      const innings2Balls = calculateBalls(innings2);

      // CRITICAL NRR RULE: If team was all out (10 wickets), use full quota (120 balls for T20)
      // This prevents teams that get bowled out from having artificially inflated run rates
      const innings1BallsForNRR = innings1.wickets === 10 ? 120 : innings1Balls;
      const innings2BallsForNRR = innings2.wickets === 10 ? 120 : innings2Balls;

      // Home team stats
      if (homeTeamBattedFirst) {
        homeTeam.runsScored += innings1.totalScore;
        homeTeam.ballsFaced += innings1BallsForNRR;
        homeTeam.runsConceded += innings2.totalScore;
        homeTeam.ballsBowled += innings2BallsForNRR;
      } else {
        homeTeam.runsScored += innings2.totalScore;
        homeTeam.ballsFaced += innings2BallsForNRR;
        homeTeam.runsConceded += innings1.totalScore;
        homeTeam.ballsBowled += innings1BallsForNRR;
      }

      // Away team stats (opposite of home team)
      if (homeTeamBattedFirst) {
        awayTeam.runsScored += innings2.totalScore;
        awayTeam.ballsFaced += innings2BallsForNRR;
        awayTeam.runsConceded += innings1.totalScore;
        awayTeam.ballsBowled += innings1BallsForNRR;
      } else {
        awayTeam.runsScored += innings1.totalScore;
        awayTeam.ballsFaced += innings1BallsForNRR;
        awayTeam.runsConceded += innings2.totalScore;
        awayTeam.ballsBowled += innings2BallsForNRR;
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
   * @deprecated `recordResult()` now updates the standings atomically in the
   * same `set()` so that the news emit sees post-match data. Existing call
   * sites have been removed; this action is kept only for any external/legacy
   * callers and is a thin wrapper over the shared `applyResultToStandings`
   * helper. Calling it after `recordResult` will double-count.
   * @param {Object} result - Single match result object
   */
  updateStandingsForMatch: (result) => set((state) => ({
    standings: applyResultToStandings(state.standings, result)
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
    // Search in all fixtures (including playoffs)
    const fixture = state.fixtures.find(f => f.matchId === fixtureId || f.id === fixtureId);
    return fixture || null;
  },

  /**
   * Get the next fixture to be played
   * @returns {Object|null} Next fixture or null if season complete
   */
  getNextFixture: () => {
    const state = get();

    // If in playoffs stage, find next unplayed playoff fixture
    if (state.stage === 'playoffs') {
      const playoffFixtures = state.fixtures.filter(f => f.type === 'playoff');
      const playedMatchIds = new Set(state.results.map(r => r.matchId));

      // Return first playoff fixture that hasn't been played yet
      const nextPlayoffFixture = playoffFixtures.find(f =>
        !playedMatchIds.has(f.matchId) && f.status === 'scheduled' && f.homeTeam && f.awayTeam
      );

      return nextPlayoffFixture || null;
    }

    // Otherwise return league fixtures based on currentFixtureIndex
    if (state.currentFixtureIndex >= state.fixtures.length) {
      return null; // League complete
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
   * Advance to the next fixture and check if playoffs should be triggered
   * @returns {Object|null} Next fixture after advancing, or null if season complete
   */
  advanceToNextMatch: () => {
    set((state) => ({
      currentFixtureIndex: state.currentFixtureIndex + 1,
      currentMatchday: state.currentMatchday + 1
    }));

    const state = get();

    // Defensive self-heal: if in playoffs, ensure bracket reflects all recorded
    // results before the next fixture lookup. Cheap and idempotent — protects
    // against any current or future code path that records a playoff result
    // without going through the recordResult() bracket update.
    if (state.stage === 'playoffs') {
      get().reconcilePlayoffFixtures();
    }

    // Check if we just completed the last group stage match
    if (state.stage === 'league') {
      const groupStageFixtures = state.fixtures.filter(f => !f.type || f.type === 'league');
      const groupStageResults = state.results.filter(r => {
        const fixture = state.fixtures.find(f => f.matchId === r.matchId);
        return fixture && (!fixture.type || fixture.type === 'league');
      });

      // Trigger playoffs if all group matches are complete
      if (groupStageResults.length >= groupStageFixtures.length) {
        console.log('🏆 Last group stage match complete! Triggering playoffs from advanceToNextMatch...');
        // Trigger playoffs synchronously (matches SimulationEngine behavior)
        get().checkAndTriggerPlayoffs();
      }
    }

    return get().getNextFixture();
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
   * Populate playoff fixtures with top 4 teams (fixtures already exist with TBD teams)
   */
  checkAndTriggerPlayoffs: () => {
    const state = get();

    // Only trigger if still in league stage
    if (state.stage !== 'league') {
      console.log('Already past league stage, skipping playoff population');
      return;
    }

    // Check if all GROUP STAGE matches are complete (exclude playoff fixtures)
    const groupStageFixtures = state.fixtures.filter(f => !f.type || f.type === 'league');
    const groupStageResults = state.results.filter(r => {
      const fixture = state.fixtures.find(f => f.matchId === r.matchId);
      return fixture && (!fixture.type || fixture.type === 'league');
    });

    const allLeagueMatchesComplete = groupStageResults.length >= groupStageFixtures.length;
    if (!allLeagueMatchesComplete) {
      console.log(`League not complete yet: ${groupStageResults.length}/${groupStageFixtures.length} group stage matches played`);
      return;
    }

    console.log('🏆 League complete! Populating playoff fixtures with top 4 teams...');

    // Get top 4 teams from standings
    const sortedStandings = [...state.standings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.netRunRate - a.netRunRate;
    });

    const top4Teams = sortedStandings.slice(0, 4);

    console.log('Playoff qualifiers:', top4Teams.map((t, i) => `${i + 1}. ${t.clubName} (${t.points} pts)`).join(', '));

    // Update existing playoff fixtures in state with team info
    // Do NOT create new fixtures or reschedule - just populate the existing TBD teams
    const updatedFixtures = state.fixtures.map(fixture => {
      if (fixture.matchId === 'playoff_q1') {
        // Qualifier 1: 1st vs 2nd
        return {
          ...fixture,
          homeTeam: top4Teams[0].clubId,
          homeTeamName: top4Teams[0].clubName,
          awayTeam: top4Teams[1].clubId,
          awayTeamName: top4Teams[1].clubName,
          status: 'scheduled'
        };
      } else if (fixture.matchId === 'playoff_eliminator') {
        // Eliminator: 3rd vs 4th
        return {
          ...fixture,
          homeTeam: top4Teams[2].clubId,
          homeTeamName: top4Teams[2].clubName,
          awayTeam: top4Teams[3].clubId,
          awayTeamName: top4Teams[3].clubName,
          status: 'scheduled'
        };
      }
      return fixture;
    });

    // Also update calendar events with team info
    const gameStore = useGameStore.getState();
    const updatedEvents = gameStore.calendarEvents.map(event => {
      if (event.type === 'match' && event.data) {
        if (event.data.matchId === 'playoff_q1') {
          return {
            ...event,
            data: {
              ...event.data,
              homeTeam: top4Teams[0].clubId,
              homeTeamName: top4Teams[0].clubName,
              awayTeam: top4Teams[1].clubId,
              awayTeamName: top4Teams[1].clubName,
              status: 'scheduled'
            }
          };
        } else if (event.data.matchId === 'playoff_eliminator') {
          return {
            ...event,
            data: {
              ...event.data,
              homeTeam: top4Teams[2].clubId,
              homeTeamName: top4Teams[2].clubName,
              awayTeam: top4Teams[3].clubId,
              awayTeamName: top4Teams[3].clubName,
              status: 'scheduled'
            }
          };
        }
      }
      return event;
    });

    // Update calendar events
    gameStore.clearEvents();
    gameStore.scheduleEvents(updatedEvents);

    console.log('✅ Playoff fixtures populated with teams (Q1 and Eliminator ready to play)');
    console.log(`   Q1: ${top4Teams[0].clubName} vs ${top4Teams[1].clubName}`);
    console.log(`   Eliminator: ${top4Teams[2].clubName} vs ${top4Teams[3].clubName}`);

    // Update state with populated fixtures
    // Note: playoffFixtures is now a computed getter from fixtures
    set({
      stage: 'playoffs',
      fixtures: updatedFixtures
    });

    console.log('🏁 League stage complete - Playoffs ready!');
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
    playoffResults: [],
    champion: null
  })
    }),
    {
      name: 'cm25-league-store',
      version: 3, // Bumped version for compressed storage migration
      storage: createJSONStorage(() => indexedDBStorage, compressedStorageOptions),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate leagueStore:', error);
        }
        markHydrated('league');

        // Self-heal save games stuck mid-playoffs (pre-fix saves where Q2/Final
        // were left as TBD). Deferred to let gameStore finish rehydrating its
        // calendarEvents before we read them.
        if (state && (state.stage === 'playoffs' || state.stage === 'completed')) {
          setTimeout(() => {
            try {
              useLeagueStore.getState().reconcilePlayoffFixtures();
            } catch (e) {
              console.error('reconcilePlayoffFixtures on rehydration failed:', e);
            }
          }, 100);
        }
      }
    }
  )
);

export default useLeagueStore;
