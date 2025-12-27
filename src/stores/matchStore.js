/**
 * @file matchStore.js
 * @description Store for active match state and ball-by-ball simulation
 * @module stores/matchStore
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

const useMatchStore = create(
  persist(
    (set, get) => ({
  // Match Identification & Status
  matchId: null,
  status: 'scheduled', // scheduled | live | innings_break | completed
  winner: null, // Team ID of the winning team
  matchType: 'T20', // T20 | ODI | Test
  venue: null,
  date: null,
  homeTeamId: null,
  awayTeamId: null,
  tossWinner: null,
  tossDecision: null,
  firstBattingTeamId: null, // Fixed throughout match for UI positioning

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
    isComplete: false,
    battedPlayers: [], // Track all players who have batted in this innings
    // Fielding state (dynamically updated during match)
    currentFieldFormation: 'neutral_orthodox', // Current fielding formation ID
    fieldPositions: [], // Array of 11 position objects with x, y coordinates
    fieldPlayerAssignments: {} // Position index → Player ID mapping
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

  // Match Results (stores completed innings data)
  results: [], // Array of innings results: [innings1Data, innings2Data]

  // Player Conditions (dynamic during match)
  matchConditions: {
    // playerId: { energy: 100, confidence: 50, fatigue: 0 }
  },

  // Match Tracking (for confidence/energy calculations)
  matchTracking: {
    consecutiveDots: {},      // playerId → consecutive dot ball count
    batsmanMilestones: {},    // playerId → [25, 50, ...] milestones reached
    overTargets: {}           // teamId → required run rate
  },

  // Current Modifier Breakdown (for UI display)
  currentModifierBreakdown: null, // { striker: {...}, bowler: {...}, strikerName, bowlerName }

  // Commentary
  commentary: [],

  // Tactics State
  tacticsState: {
    battingParScore: null,      // User-set pre-match par score
    bowlingParScore: null,      // User-set pre-match par score
    targetRunRate: 8.0,         // Auto-calculated from par/target
    overTargets: [],            // DLS-based per-over targets {over, runs, wickets}
    accelerationMode: 'auto',   // 'auto' or 'manual'
    currentAcceleration: {      // Per batsman acceleration tier
      striker: 'Rotate',
      nonStriker: 'Rotate'
    },
    bowlingPlans: {},           // Per bowler: {bowlerId: {lineLength, variation}}
    pressureIndex: {            // Calculated each ball
      batting: 50,
      bowling: 50
    }
  },

  // Match Settings
  settings: {
    simulationSpeed: 'normal', // fast | normal | slow
    autoSimulate: false,
    showDetailedCommentary: true
  },

  // Super Over State
  superOver: {
    isActive: false,
    phase: null, // 'team1_batting' | 'team2_batting' | 'completed'
    team1: {
      teamId: null,
      teamName: '',
      runs: 0,
      wickets: 0,
      balls: 0,
      batsmen: [], // [playerId, playerId, playerId] - 3 batsmen
      bowler: null // playerId
    },
    team2: {
      teamId: null,
      teamName: '',
      runs: 0,
      wickets: 0,
      balls: 0,
      batsmen: [],
      bowler: null
    },
    ballByBall: [], // Super over ball records
    winner: null
  },

  // Actions
  /**
   * Initialize a new match
   * @param {Object} matchConfig - Match configuration
   */
  initializeMatch: (matchConfig) => set(() => {
    const { matchId, homeTeam, awayTeam, venue, tossWinner, tossDecision } = matchConfig;

    // Determine batting/bowling teams based on toss
    const battingFirst = tossDecision === 'bat' ? tossWinner :
                        (tossWinner === homeTeam.id ? awayTeam.id : homeTeam.id);
    const bowlingFirst = battingFirst === homeTeam.id ? awayTeam.id : homeTeam.id;

    return {
      matchId: matchId || `match_${Date.now()}`, // Use provided matchId or generate new one
      status: 'live',
      venue,
      date: new Date().toISOString(),
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      tossWinner,
      tossDecision,
      firstBattingTeamId: battingFirst,
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
        isComplete: false,
        currentFieldFormation: 'neutral_orthodox',
        fieldPositions: [],
        fieldPlayerAssignments: {}
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
      results: [], // Reset results array for new match
      matchConditions: {},
      commentary: [`${tossWinner === homeTeam.id ? homeTeam.name : awayTeam.name} won the toss and chose to ${tossDecision === 'bat' ? 'bat first' : 'bowl first'}`],
      tacticsState: {
        battingParScore: matchConfig.battingParScore || null,
        bowlingParScore: matchConfig.bowlingParScore || null,
        targetRunRate: 8.0,
        overTargets: [],
        accelerationMode: 'auto',
        currentAcceleration: {
          striker: 'Rotate',
          nonStriker: 'Rotate'
        },
        bowlingPlans: {},
        pressureIndex: {
          batting: 50,
          bowling: 50
        }
      }
    };
  }),

  /**
   * Set opening batsmen
   * @param {string} striker - Opening batsman on strike
   * @param {string} nonStriker - Opening batsman at non-striker end
   */
  setOpeningBatsmen: (striker, nonStriker) => set((state) => {
    // Add new batsmen to battedPlayers list if not already there
    const battedPlayers = new Set(state.innings.battedPlayers);
    if (striker) battedPlayers.add(striker);
    if (nonStriker) battedPlayers.add(nonStriker);

    return {
      innings: {
        ...state.innings,
        striker,
        nonStriker,
        battedPlayers: Array.from(battedPlayers)
      },
      currentBall: {
        ...state.currentBall,
        striker,
        nonStriker
      }
    };
  }),

  /**
   * Set current bowler (for any over, not just opening over)
   * @param {string} bowler - Current bowler ID
   */
  setCurrentBowler: (bowler) => set((state) => ({
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
   * Update fielding formation and positions during match
   * @param {string} formation - Formation template ID
   * @param {Array} positions - Array of 11 position objects (optional)
   * @param {Object} assignments - Position index to player ID mapping (optional)
   */
  updateFieldFormation: (formation, positions = null, assignments = null) => set((state) => ({
    innings: {
      ...state.innings,
      currentFieldFormation: formation,
      ...(positions && { fieldPositions: positions }),
      ...(assignments && { fieldPlayerAssignments: assignments })
    }
  })),

  /**
   * Update tactics state
   * @param {Object} tacticsUpdate - Tactics state updates
   */
  updateTacticsState: (tacticsUpdate) => set((state) => ({
    tacticsState: {
      ...state.tacticsState,
      ...tacticsUpdate
    }
  })),

  /**
   * Process ball result
   * @param {Object} ballResult - Result of simulated ball
   */
  processBallResult: (ballResult) => set((state) => {
    // Enrich ballResult with current ball context
    const enrichedBallResult = {
      ...ballResult,
      innings: state.innings.number, // Add innings number for tracking
      over: state.currentBall.over,
      ball: state.currentBall.ball,
      striker: state.innings.striker,
      bowler: state.innings.bowler,
      nonStriker: state.innings.nonStriker
    };

    const newBallByBall = [...state.ballByBall, enrichedBallResult];
    const newCommentary = [...state.commentary, ballResult.commentary];

    // Update scores
    const newTeams = { ...state.teams };
    newTeams.batting.totalScore += ballResult.runs || 0;

    if (ballResult.isWicket) {
      newTeams.batting.wickets += 1;

      // Calculate total balls bowled for this fall of wicket
      const totalBalls = state.currentBall.over * 6 + state.currentBall.ball;

      newTeams.batting.fallOfWickets.push({
        wicket: newTeams.batting.wickets,
        score: newTeams.batting.totalScore,
        balls: totalBalls,
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
      },
      tacticsState: state.tacticsState // Preserve tactics state
    };
  }),

  /**
   * Start second innings
   */
  startSecondInnings: () => set((state) => {
    const target = state.teams.batting.totalScore + 1;

    // Save first innings data to results array before resetting
    const firstInningsData = {
      inningsNumber: 1,
      battingTeam: state.teams.batting.id,
      bowlingTeam: state.teams.bowling.id,
      totalScore: state.teams.batting.totalScore,
      wickets: state.teams.batting.wickets,
      overs: state.currentBall.over,
      balls: state.currentBall.ball,
      extras: { ...state.teams.batting.extras },
      fallOfWickets: [...state.teams.batting.fallOfWickets],
      partnerships: [...state.teams.batting.partnerships]
    };

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
        isComplete: false,
        battedPlayers: [], // Reset for second innings
        currentFieldFormation: 'neutral_orthodox',
        fieldPositions: [],
        fieldPlayerAssignments: {}
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
      results: [firstInningsData], // Store first innings data
      commentary: [...state.commentary, `Second innings begins. Target: ${target} runs`]
    };
  }),

  /**
   * Complete match
   * @param {Object} matchResult - Match result object from MatchEngine
   * @param {string} matchResult.winningTeam - Winner team ID
   * @param {string} matchResult.description - Result description
   */
  completeMatch: (matchResult) => set((state) => {
    // Save second innings data to results array
    const secondInningsData = {
      inningsNumber: 2,
      battingTeam: state.teams.batting.id,
      bowlingTeam: state.teams.bowling.id,
      totalScore: state.teams.batting.totalScore,
      wickets: state.teams.batting.wickets,
      overs: state.currentBall.over,
      balls: state.currentBall.ball,
      extras: { ...state.teams.batting.extras },
      fallOfWickets: [...state.teams.batting.fallOfWickets],
      partnerships: [...state.teams.batting.partnerships]
    };

    return {
      status: 'completed',
      winner: matchResult.winningTeam || null, // Store winner team ID
      results: [...state.results, secondInningsData], // Add second innings to results
      commentary: [...state.commentary, `Match completed. ${matchResult.description || matchResult}`]
    };
  }),

  /**
   * Reset match state
   */
  resetMatch: () => set({
    matchId: null,
    status: 'scheduled',
    winner: null,
    superOver: {
      isActive: false,
      phase: null,
      team1: {
        teamId: null,
        teamName: '',
        runs: 0,
        wickets: 0,
        balls: 0,
        batsmen: [],
        bowler: null
      },
      team2: {
        teamId: null,
        teamName: '',
        runs: 0,
        wickets: 0,
        balls: 0,
        batsmen: [],
        bowler: null
      },
      ballByBall: [],
      winner: null
    },
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
      isComplete: false,
      currentFieldFormation: 'neutral_orthodox',
      fieldPositions: [],
      fieldPlayerAssignments: {}
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
    results: [], // Reset results array
    matchConditions: {},
    commentary: [],
    tacticsState: {
      battingParScore: null,
      bowlingParScore: null,
      targetRunRate: 8.0,
      overTargets: [],
      accelerationMode: 'auto',
      currentAcceleration: {
        striker: 'Rotate',
        nonStriker: 'Rotate'
      },
      bowlingPlans: {},
      pressureIndex: {
        batting: 50,
        bowling: 50
      }
    }
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
  },

  /**
   * Get player's confidence level name
   * @param {string} playerId - Player ID
   * @returns {string} Confidence level name
   */
  getPlayerConfidenceLevel: (playerId) => {
    const state = get();
    const confidence = state.matchConditions[playerId]?.confidence ?? 50;

    if (confidence >= 81) return 'Sky-High';
    if (confidence >= 61) return 'High';
    if (confidence >= 41) return 'Normal';
    if (confidence >= 21) return 'Low';
    return 'Shattered';
  },

  /**
   * Get player's energy level name
   * @param {string} playerId - Player ID
   * @returns {string} Energy level name
   */
  getPlayerEnergyLevel: (playerId) => {
    const state = get();
    const energy = state.matchConditions[playerId]?.energy ?? 100;

    if (energy >= 80) return 'Fresh';
    if (energy >= 60) return 'Slightly Tired';
    if (energy >= 40) return 'Tired';
    if (energy >= 20) return 'Exhausted';
    return 'Gassed';
  },

  /**
   * Update player conditions
   * @param {string} playerId - Player ID
   * @param {Object} updates - Condition updates { confidence?, energy?, fatigue? }
   */
  updatePlayerConditions: (playerId, updates) => set((state) => ({
    matchConditions: {
      ...state.matchConditions,
      [playerId]: {
        ...(state.matchConditions[playerId] || {}),
        ...updates
      }
    }
  })),

  /**
   * Set modifier breakdown for UI display
   * @param {Object} breakdown - Modifier breakdown { striker, bowler, strikerName, bowlerName }
   */
  setModifierBreakdown: (breakdown) => set(() => ({
    currentModifierBreakdown: breakdown
  })),

  // Super Over Actions

  /**
   * Initialize super over after a tie
   * @param {string} team1Id - Team batting first in super over (2nd innings batting team)
   * @param {string} team1Name - Team 1 name
   * @param {string} team2Id - Team bowling first in super over
   * @param {string} team2Name - Team 2 name
   */
  initiateSuperOver: (team1Id, team1Name, team2Id, team2Name) => set((state) => ({
    superOver: {
      ...state.superOver,
      isActive: true,
      phase: 'team1_batting',
      team1: {
        teamId: team1Id,
        teamName: team1Name,
        runs: 0,
        wickets: 0,
        balls: 0,
        batsmen: [],
        bowler: null
      },
      team2: {
        teamId: team2Id,
        teamName: team2Name,
        runs: 0,
        wickets: 0,
        balls: 0,
        batsmen: [],
        bowler: null
      },
      ballByBall: [],
      winner: null
    }
  })),

  /**
   * Set super over squad for a team
   * @param {string} teamId - Team ID
   * @param {Array} batsmen - Array of 3 batsmen player IDs
   * @param {string} bowler - Bowler player ID
   */
  setSuperOverSquad: (teamId, batsmen, bowler) => set((state) => {
    const teamKey = state.superOver.team1.teamId === teamId ? 'team1' : 'team2';
    return {
      superOver: {
        ...state.superOver,
        [teamKey]: {
          ...state.superOver[teamKey],
          batsmen,
          bowler
        }
      }
    };
  }),

  /**
   * Update super over score for a team
   * @param {string} teamId - Team ID
   * @param {number} runs - Total runs
   * @param {number} wickets - Total wickets
   * @param {number} balls - Total balls faced
   */
  updateSuperOverScore: (teamId, runs, wickets, balls) => set((state) => {
    const teamKey = state.superOver.team1.teamId === teamId ? 'team1' : 'team2';
    return {
      superOver: {
        ...state.superOver,
        [teamKey]: {
          ...state.superOver[teamKey],
          runs,
          wickets,
          balls
        }
      }
    };
  }),

  /**
   * Add a ball to super over ball-by-ball record
   * @param {Object} ballData - Ball data
   */
  addSuperOverBall: (ballData) => set((state) => ({
    superOver: {
      ...state.superOver,
      ballByBall: [...state.superOver.ballByBall, ballData]
    }
  })),

  /**
   * Switch to team 2 batting in super over
   */
  switchSuperOverInnings: () => set((state) => ({
    superOver: {
      ...state.superOver,
      phase: 'team2_batting'
    }
  })),

  /**
   * Complete super over and set winner
   * @param {string} winnerId - Winning team ID
   */
  completeSuperOver: (winnerId) => set((state) => ({
    status: 'completed',
    winner: winnerId,
    superOver: {
      ...state.superOver,
      phase: 'completed',
      winner: winnerId
    }
  })),

  /**
   * Reset super over state
   */
  resetSuperOver: () => set((state) => ({
    superOver: {
      isActive: false,
      phase: null,
      team1: {
        teamId: null,
        teamName: '',
        runs: 0,
        wickets: 0,
        balls: 0,
        batsmen: [],
        bowler: null
      },
      team2: {
        teamId: null,
        teamName: '',
        runs: 0,
        wickets: 0,
        balls: 0,
        batsmen: [],
        bowler: null
      },
      ballByBall: [],
      winner: null
    }
  }))
    }),
    {
      name: 'cm25-match-store',
      version: 1,
      // Exclude large arrays to avoid localStorage quota issues
      partialize: (state) => {
        // Don't persist match data - it's ephemeral and causes quota issues
        // Match data should be regenerated if needed
        return {
          matchId: null,
          status: 'scheduled'
        };
      }
    }
  )
);

export default useMatchStore;