/**
 * @file matchStore.js
 * @description Store for active match state and ball-by-ball simulation
 * @module stores/matchStore
 */

import { create } from 'zustand';

/**
 * @typedef {Object} MatchState
 * @property {string|null} matchId - Current match ID
 * @property {string} status - 'scheduled' | 'live' | 'innings_break' | 'completed'
 * @property {Object} teams - Both teams data
 * @property {Object} innings - Current innings data
 * @property {Object} currentBall - Current ball state
 * @property {Array} ballByBall - Complete ball-by-ball record
 * @property {Object} matchConditions - Player conditions during match
 * @property {Array} commentary - Match commentary
 */

const useMatchStore = create((set, get) => ({
  // Match Identification & Status
  matchId: null,
  status: 'scheduled', // scheduled | live | innings_break | completed
  matchType: 'T20', // T20 | ODI | Test
  venue: null,
  date: null,

  // Teams & Players
  teams: {
    batting: {
      id: null,
      name: '',
      squad: [], // Playing XI
      totalScore: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: {
        byes: 0,
        legByes: 0,
        wides: 0,
        noBalls: 0,
        penalties: 0
      },
      partnerships: [],
      fallOfWickets: []
    },
    bowling: {
      id: null,
      name: '',
      squad: [], // Playing XI
      bowlingFigures: {},
      fieldingPositions: {}
    }
  },

  // Current Innings State
  innings: {
    number: 1, // 1 or 2
    target: null, // null for first innings, runs needed for second
    battingTeam: null,
    bowlingTeam: null,
    striker: null, // player on strike
    nonStriker: null, // player at non-striker end
    bowler: null, // current bowler
    isComplete: false
  },

  // Current Ball State
  currentBall: {
    over: 0,
    ball: 0, // 0-5 for legal deliveries
    bowler: null,
    striker: null,
    nonStriker: null,
    fieldingPositions: {},
    matchSituation: {
      phase: 'powerplay', // powerplay | middle | death
      required: null, // runs required (2nd innings)
      ballsLeft: null // balls remaining (2nd innings)
    }
  },

  // Ball-by-Ball Record
  ballByBall: [],

  // Player Conditions (dynamic during match)
  matchConditions: {
    // playerId: { energy: 100, confidence: 50, fatigue: 0 }
  },

  // Commentary
  commentary: [],

  // Match Settings
  settings: {
    simulationSpeed: 'normal', // fast | normal | slow
    autoSimulate: false,
    showDetailedCommentary: true
  },

  // Actions
  /**
   * Initialize a new match
   * @param {Object} matchConfig - Match configuration
   */
  initializeMatch: (matchConfig) => set(() => {
    const { homeTeam, awayTeam, venue, tossWinner, tossDecision } = matchConfig;

    // Determine batting/bowling teams based on toss
    const battingFirst = tossDecision === 'bat' ? tossWinner :
                        (tossWinner === homeTeam.id ? awayTeam.id : homeTeam.id);
    const bowlingFirst = battingFirst === homeTeam.id ? awayTeam.id : homeTeam.id;

    return {
      matchId: `match_${Date.now()}`,
      status: 'live',
      venue,
      date: new Date().toISOString(),
      teams: {
        batting: {
          id: battingFirst,
          name: battingFirst === homeTeam.id ? homeTeam.name : awayTeam.name,
          squad: battingFirst === homeTeam.id ? homeTeam.playingXI : awayTeam.playingXI,
          totalScore: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 },
          partnerships: [],
          fallOfWickets: []
        },
        bowling: {
          id: bowlingFirst,
          name: bowlingFirst === homeTeam.id ? homeTeam.name : awayTeam.name,
          squad: bowlingFirst === homeTeam.id ? homeTeam.playingXI : awayTeam.playingXI,
          bowlingFigures: {},
          fieldingPositions: {}
        }
      },
      innings: {
        number: 1,
        target: null,
        battingTeam: battingFirst,
        bowlingTeam: bowlingFirst,
        striker: null, // Will be set when opening batsmen are selected
        nonStriker: null,
        bowler: null,
        isComplete: false
      },
      currentBall: {
        over: 0,
        ball: 0,
        bowler: null,
        striker: null,
        nonStriker: null,
        fieldingPositions: {},
        matchSituation: {
          phase: 'powerplay',
          required: null,
          ballsLeft: 120 // 20 overs * 6 balls
        }
      },
      ballByBall: [],
      matchConditions: {},
      commentary: [`${tossWinner === homeTeam.id ? homeTeam.name : awayTeam.name} won the toss and chose to ${tossDecision === 'bat' ? 'bat first' : 'bowl first'}`]
    };
  }),

  /**
   * Set opening batsmen
   * @param {string} striker - Opening batsman on strike
   * @param {string} nonStriker - Opening batsman at non-striker end
   */
  setOpeningBatsmen: (striker, nonStriker) => set((state) => ({
    innings: {
      ...state.innings,
      striker,
      nonStriker
    },
    currentBall: {
      ...state.currentBall,
      striker,
      nonStriker
    }
  })),

  /**
   * Set opening bowler
   * @param {string} bowler - Opening bowler
   */
  setOpeningBowler: (bowler) => set((state) => ({
    innings: {
      ...state.innings,
      bowler
    },
    currentBall: {
      ...state.currentBall,
      bowler
    }
  })),

  /**
   * Process ball result
   * @param {Object} ballResult - Result of simulated ball
   */
  processBallResult: (ballResult) => set((state) => {
    const newBallByBall = [...state.ballByBall, ballResult];
    const newCommentary = [...state.commentary, ballResult.commentary];

    // Update scores
    const newTeams = { ...state.teams };
    newTeams.batting.totalScore += ballResult.runs || 0;

    if (ballResult.isWicket) {
      newTeams.batting.wickets += 1;
      newTeams.batting.fallOfWickets.push({
        wicket: newTeams.batting.wickets,
        runs: newTeams.batting.totalScore,
        over: state.currentBall.over,
        ball: state.currentBall.ball,
        batsman: ballResult.dismissedPlayer,
        dismissalType: ballResult.dismissalType
      });
    }

    // Update ball count for legal deliveries
    let newBall = state.currentBall.ball;
    let newOver = state.currentBall.over;

    if (ballResult.isLegal) {
      newBall += 1;
      if (newBall === 6) {
        newBall = 0;
        newOver += 1;
      }
    }

    // Calculate match phase
    const totalBalls = newOver * 6 + newBall;
    let phase = 'powerplay';
    if (totalBalls > 36) phase = 'middle'; // After 6 overs
    if (totalBalls > 96) phase = 'death'; // After 16 overs

    return {
      teams: newTeams,
      currentBall: {
        ...state.currentBall,
        over: newOver,
        ball: newBall,
        matchSituation: {
          ...state.currentBall.matchSituation,
          phase,
          ballsLeft: 120 - totalBalls
        }
      },
      ballByBall: newBallByBall,
      commentary: newCommentary,
      matchConditions: {
        ...state.matchConditions,
        ...ballResult.conditionUpdates
      }
    };
  }),

  /**
   * Start second innings
   */
  startSecondInnings: () => set((state) => {
    const target = state.teams.batting.totalScore + 1;

    return {
      status: 'live',
      innings: {
        number: 2,
        target,
        battingTeam: state.teams.bowling.id,
        bowlingTeam: state.teams.batting.id,
        striker: null,
        nonStriker: null,
        bowler: null,
        isComplete: false
      },
      teams: {
        batting: {
          ...state.teams.bowling,
          totalScore: 0,
          wickets: 0,
          overs: 0,
          balls: 0,
          extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 },
          partnerships: [],
          fallOfWickets: []
        },
        bowling: state.teams.batting
      },
      currentBall: {
        over: 0,
        ball: 0,
        bowler: null,
        striker: null,
        nonStriker: null,
        fieldingPositions: {},
        matchSituation: {
          phase: 'powerplay',
          required: target,
          ballsLeft: 120
        }
      },
      commentary: [...state.commentary, `Second innings begins. Target: ${target} runs`]
    };
  }),

  /**
   * Complete match
   * @param {string} result - Match result description
   */
  completeMatch: (result) => set((state) => ({
    status: 'completed',
    commentary: [...state.commentary, `Match completed. ${result}`]
  })),

  /**
   * Reset match state
   */
  resetMatch: () => set({
    matchId: null,
    status: 'scheduled',
    teams: {
      batting: {
        id: null,
        name: '',
        squad: [],
        totalScore: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        extras: { byes: 0, legByes: 0, wides: 0, noBalls: 0, penalties: 0 },
        partnerships: [],
        fallOfWickets: []
      },
      bowling: {
        id: null,
        name: '',
        squad: [],
        bowlingFigures: {},
        fieldingPositions: {}
      }
    },
    innings: {
      number: 1,
      target: null,
      battingTeam: null,
      bowlingTeam: null,
      striker: null,
      nonStriker: null,
      bowler: null,
      isComplete: false
    },
    currentBall: {
      over: 0,
      ball: 0,
      bowler: null,
      striker: null,
      nonStriker: null,
      fieldingPositions: {},
      matchSituation: {
        phase: 'powerplay',
        required: null,
        ballsLeft: 120
      }
    },
    ballByBall: [],
    matchConditions: {},
    commentary: []
  }),

  /**
   * Update match settings
   * @param {Object} newSettings - Settings to update
   */
  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  /**
   * Get current match situation
   * @returns {Object} Current match situation
   */
  getCurrentSituation: () => {
    const state = get();
    const { teams, currentBall, innings } = state;

    return {
      score: `${teams.batting.totalScore}/${teams.batting.wickets}`,
      overs: `${currentBall.over}.${currentBall.ball}`,
      phase: currentBall.matchSituation.phase,
      required: innings.target ? innings.target - teams.batting.totalScore : null,
      ballsLeft: currentBall.matchSituation.ballsLeft,
      runRate: teams.batting.totalScore / ((currentBall.over * 6 + currentBall.ball) / 6),
      requiredRate: innings.target ?
        ((innings.target - teams.batting.totalScore) / (currentBall.matchSituation.ballsLeft / 6)) : null
    };
  }
}));

export default useMatchStore;