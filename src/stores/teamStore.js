/**
 * @file teamStore.js
 * @description Store for all teams and rosters management
 * @module stores/teamStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import usePlayerStore from './playerStore';
import { compressedStorageOptions } from '../utils/compression.js';
import { indexedDBStorage } from '../utils/indexedDBStorage.js';
import { markHydrated } from '../utils/storeHydration.js';
import aiCore from '../core/ai/AICore.js';

/**
 * @typedef {Object} BowlingPlans
 * @property {string} lineLength - Line-length plan (4 options)
 * @property {string} variation - Variation plan (4 options)
 */

/**
 * @typedef {Object} TeamTactics
 * @property {string[]} squadSelection - Array of 11 player IDs in playing XI
 * @property {Object.<string, string>} playstyleOverrides - Player ID → playstyle name (only if different from primary)
 * @property {string[]} battingOrder - Array of 11 player IDs in batting order
 * @property {Object.<string, string>} accelerationTiers - Player ID → acceleration tier name
 * @property {Object.<string, BowlingPlans>} bowlingPlans - Player ID → bowling plans
 * @property {number[]} bowlingRotation - Array of player IDs in preferred bowling order
 * @property {string} fieldFormation - Field formation ID (e.g., 'attacking_pace_cordon', 'neutral_orthodox', 'defensive_ring_fence')
 */

/**
 * @typedef {Object} TeamStore
 * @property {Object.<string, Team>} teams - All teams indexed by ID
 * @property {string} userTeamId - ID of team controlled by user
 * @property {Object.<string, string[]>} squadLists - Current squad for each team
 * @property {Object.<string, TeamTactics>} teamTactics - Tactics for each team
 */

const useTeamStore = create(
  persist(
    (set, get) => ({
      // Team Data
      teams: {},
      userTeamId: null,
      squadLists: {},

      // Team Tactics
      teamTactics: {}, // teamId -> TeamTactics

      // Performance Stats (reset on transfer)
      playerStats: {}, // teamId -> { playerId -> stats }
      teamStats: {}, // teamId -> aggregated team stats

      // Actions
      /**
       * Initialize teams from data
       * @param {Team[]} teamsData - Array of team objects
       */
      initializeTeams: (teamsData) => set(() => {
        const teamsMap = {};
        const squads = {};

        teamsData.forEach(team => {
          teamsMap[team.id] = team;
          squads[team.id] = team.playerIds || [];
        });

        return {
          teams: teamsMap,
          squadLists: squads
        };
      }),

      /**
       * Set the user's team
       * @param {string} teamId - ID of team to control
       */
      setUserTeam: (teamId) => set({ userTeamId: teamId }),

      /**
       * Initialize a random team for test mode
       * Randomly selects one of the available teams
       * @returns {string} The selected team ID
       */
      initializeRandomTeam: () => {
        const state = get();
        const teamIds = Object.keys(state.teams);

        if (teamIds.length === 0) {
          console.error('No teams available for selection');
          return null;
        }

        // Randomly select a team
        const randomIndex = Math.floor(Math.random() * teamIds.length);
        const selectedTeamId = teamIds[randomIndex];

        set({ userTeamId: selectedTeamId });

        console.log(`🎲 Test mode: Randomly selected ${state.teams[selectedTeamId]?.shortName || selectedTeamId}`);

        return selectedTeamId;
      },

      /**
       * Get team by ID
       * @param {string} teamId - Team ID
       * @returns {Team|null} Team object or null
       */
      getTeam: (teamId) => {
        const state = get();
        return state.teams[teamId] || null;
      },

      /**
       * Get user's team
       * @returns {Team|null} User's team or null
       */
      getUserTeam: () => {
        const state = get();
        return state.userTeamId ? state.teams[state.userTeamId] : null;
      },

      /**
       * Update team information
       * @param {string} teamId - Team ID
       * @param {Object} updates - Fields to update
       */
      updateTeam: (teamId, updates) => set((state) => ({
        teams: {
          ...state.teams,
          [teamId]: { ...state.teams[teamId], ...updates }
        }
      })),

      /**
       * Add player to team squad
       * @param {string} teamId - Team ID
       * @param {string} playerId - Player ID
       */
      addPlayerToSquad: (teamId, playerId) => set((state) => ({
        squadLists: {
          ...state.squadLists,
          [teamId]: [...(state.squadLists[teamId] || []), playerId]
        }
      })),

      /**
       * Remove player from team squad
       * @param {string} teamId - Team ID
       * @param {string} playerId - Player ID
       */
      removePlayerFromSquad: (teamId, playerId) => set((state) => ({
        squadLists: {
          ...state.squadLists,
          [teamId]: (state.squadLists[teamId] || []).filter(id => id !== playerId)
        }
      })),

      /**
       * Set team captain
       * @param {string} teamId - Team ID
       * @param {string} playerId - Player ID
       */
      setCaptain: (teamId, playerId) => set((state) => ({
        teams: {
          ...state.teams,
          [teamId]: { ...state.teams[teamId], captainId: playerId }
        }
      })),

      /**
       * Initialize player stats for a team
       * @param {string} teamId - Team ID
       */
      initializeTeamStats: (teamId) => set((state) => ({
        playerStats: {
          ...state.playerStats,
          [teamId]: {}
        },
        teamStats: {
          ...state.teamStats,
          [teamId]: {
            matches: 0,
            battingAverage: 0,
            strikeRate: 0,
            economy: 0,
            bowlingAverage: 0
          }
        }
      })),

      /**
       * Update player stats after a match
       * @param {string} teamId - Team ID
       * @param {string} playerId - Player ID
       * @param {Object} matchStats - Stats from match
       */
      updatePlayerStats: (teamId, playerId, matchStats) => set((state) => {
        const teamPlayerStats = state.playerStats[teamId] || {};
        const currentStats = teamPlayerStats[playerId] || {
          matches: 0,
          runs: 0,
          ballsFaced: 0,
          dismissed: 0,
          battingAverage: 0,
          strikeRate: 0,
          wickets: 0,
          ballsBowled: 0,
          runsConceded: 0,
          economy: 0,
          bowlingAverage: 0,
          // Fielding stats
          catches: 0,
          runOuts: 0,
          // Impact metrics (DLS-based)
          battingImpact: 0,
          bowlingImpact: 0,
          fieldingImpact: 0,
          totalImpact: 0
        };

        // Accumulate stats
        const newMatches = currentStats.matches + 1;
        const newRuns = currentStats.runs + (matchStats.runs || 0);
        const newBallsFaced = currentStats.ballsFaced + (matchStats.ballsFaced || 0);
        const newDismissed = currentStats.dismissed + (matchStats.dismissed ? 1 : 0);
        const newWickets = currentStats.wickets + (matchStats.wickets || 0);
        const newBallsBowled = currentStats.ballsBowled + (matchStats.ballsBowled || 0);
        const newRunsConceded = currentStats.runsConceded + (matchStats.runsConceded || 0);

        // Accumulate fielding stats
        const newCatches = (currentStats.catches || 0) + (matchStats.catches || 0);
        const newRunOuts = (currentStats.runOuts || 0) + (matchStats.runOuts || 0);

        // Accumulate impact stats
        const newBattingImpact = (currentStats.battingImpact || 0) + (matchStats.battingImpact || 0);
        const newBowlingImpact = (currentStats.bowlingImpact || 0) + (matchStats.bowlingImpact || 0);
        const newFieldingImpact = (currentStats.fieldingImpact || 0) + (matchStats.fieldingImpact || 0);
        const newTotalImpact = newBattingImpact + newBowlingImpact + newFieldingImpact;

        // Calculate derived stats
        const newBattingAverage = newDismissed > 0 ? newRuns / newDismissed : newRuns;
        const newStrikeRate = newBallsFaced > 0 ? (newRuns / newBallsFaced) * 100 : 0;
        const newEconomy = newBallsBowled > 0 ? (newRunsConceded / newBallsBowled) * 6 : 0;
        const newBowlingAverage = newWickets > 0 ? newRunsConceded / newWickets : 0;

        return {
          playerStats: {
            ...state.playerStats,
            [teamId]: {
              ...teamPlayerStats,
              [playerId]: {
                matches: newMatches,
                runs: newRuns,
                ballsFaced: newBallsFaced,
                dismissed: newDismissed,
                battingAverage: newBattingAverage,
                strikeRate: newStrikeRate,
                wickets: newWickets,
                ballsBowled: newBallsBowled,
                runsConceded: newRunsConceded,
                economy: newEconomy,
                bowlingAverage: newBowlingAverage,
                catches: newCatches,
                runOuts: newRunOuts,
                battingImpact: newBattingImpact,
                bowlingImpact: newBowlingImpact,
                fieldingImpact: newFieldingImpact,
                totalImpact: newTotalImpact
              }
            }
          }
        };
      }),

      /**
       * Batch update player stats for a team in a single setState call
       * This reduces localStorage writes significantly during match simulation
       * @param {string} teamId - Team ID
       * @param {Object} allPlayerStats - Map of playerId -> matchStats
       */
      batchUpdatePlayerStats: (teamId, allPlayerStats) => set((state) => {
        const teamPlayerStats = { ...(state.playerStats[teamId] || {}) };

        Object.entries(allPlayerStats).forEach(([playerId, matchStats]) => {
          const currentStats = teamPlayerStats[playerId] || {
            matches: 0,
            runs: 0,
            ballsFaced: 0,
            dismissed: 0,
            battingAverage: 0,
            strikeRate: 0,
            wickets: 0,
            ballsBowled: 0,
            runsConceded: 0,
            economy: 0,
            bowlingAverage: 0,
            catches: 0,
            runOuts: 0,
            battingImpact: 0,
            bowlingImpact: 0,
            fieldingImpact: 0,
            totalImpact: 0
          };

          // Accumulate stats
          const newMatches = currentStats.matches + 1;
          const newRuns = currentStats.runs + (matchStats.runs || 0);
          const newBallsFaced = currentStats.ballsFaced + (matchStats.ballsFaced || 0);
          const newDismissed = currentStats.dismissed + (matchStats.dismissed ? 1 : 0);
          const newWickets = currentStats.wickets + (matchStats.wickets || 0);
          const newBallsBowled = currentStats.ballsBowled + (matchStats.ballsBowled || 0);
          const newRunsConceded = currentStats.runsConceded + (matchStats.runsConceded || 0);
          const newCatches = (currentStats.catches || 0) + (matchStats.catches || 0);
          const newRunOuts = (currentStats.runOuts || 0) + (matchStats.runOuts || 0);
          const newBattingImpact = (currentStats.battingImpact || 0) + (matchStats.battingImpact || 0);
          const newBowlingImpact = (currentStats.bowlingImpact || 0) + (matchStats.bowlingImpact || 0);
          const newFieldingImpact = (currentStats.fieldingImpact || 0) + (matchStats.fieldingImpact || 0);
          const newTotalImpact = newBattingImpact + newBowlingImpact + newFieldingImpact;

          // Calculate derived stats
          const newBattingAverage = newDismissed > 0 ? newRuns / newDismissed : newRuns;
          const newStrikeRate = newBallsFaced > 0 ? (newRuns / newBallsFaced) * 100 : 0;
          const newEconomy = newBallsBowled > 0 ? (newRunsConceded / newBallsBowled) * 6 : 0;
          const newBowlingAverage = newWickets > 0 ? newRunsConceded / newWickets : 0;

          teamPlayerStats[playerId] = {
            matches: newMatches,
            runs: newRuns,
            ballsFaced: newBallsFaced,
            dismissed: newDismissed,
            battingAverage: newBattingAverage,
            strikeRate: newStrikeRate,
            wickets: newWickets,
            ballsBowled: newBallsBowled,
            runsConceded: newRunsConceded,
            economy: newEconomy,
            bowlingAverage: newBowlingAverage,
            catches: newCatches,
            runOuts: newRunOuts,
            battingImpact: newBattingImpact,
            bowlingImpact: newBowlingImpact,
            fieldingImpact: newFieldingImpact,
            totalImpact: newTotalImpact
          };
        });

        return {
          playerStats: {
            ...state.playerStats,
            [teamId]: teamPlayerStats
          }
        };
      }),

      /**
       * Recalculate team aggregate stats
       * @param {string} teamId - Team ID
       */
      recalculateTeamStats: (teamId) => set((state) => {
        const teamPlayerStats = state.playerStats[teamId] || {};
        const playerStatsArray = Object.values(teamPlayerStats);

        if (playerStatsArray.length === 0) {
          return state;
        }

        // Calculate averages across all players
        const avgBattingAverage = playerStatsArray.reduce((sum, p) => sum + (p.battingAverage || 0), 0) / playerStatsArray.length;
        const avgStrikeRate = playerStatsArray.reduce((sum, p) => sum + (p.strikeRate || 0), 0) / playerStatsArray.length;
        const avgEconomy = playerStatsArray.reduce((sum, p) => sum + (p.economy || 0), 0) / playerStatsArray.length;
        const avgBowlingAverage = playerStatsArray.reduce((sum, p) => sum + (p.bowlingAverage || 0), 0) / playerStatsArray.length;

        return {
          teamStats: {
            ...state.teamStats,
            [teamId]: {
              matches: Math.max(...playerStatsArray.map(p => p.matches)),
              battingAverage: avgBattingAverage,
              strikeRate: avgStrikeRate,
              economy: avgEconomy,
              bowlingAverage: avgBowlingAverage
            }
          }
        };
      }),

      /**
       * Reset player stats when they transfer teams
       * @param {string} playerId - Player ID
       * @param {string} oldTeamId - Old team ID
       */
      resetPlayerStats: (playerId, oldTeamId) => set((state) => {
        const teamPlayerStats = state.playerStats[oldTeamId] || {};
        const { [playerId]: removed, ...remaining } = teamPlayerStats;

        return {
          playerStats: {
            ...state.playerStats,
            [oldTeamId]: remaining
          }
        };
      }),

      /**
       * Get player stats for a team
       * @param {string} teamId - Team ID
       * @param {string} playerId - Player ID
       * @returns {Object|null} Player stats or null
       */
      getPlayerStats: (teamId, playerId) => {
        const state = get();
        return state.playerStats[teamId]?.[playerId] || null;
      },

      /**
       * Get team aggregate stats
       * @param {string} teamId - Team ID
       * @returns {Object|null} Team stats or null
       */
      getTeamStats: (teamId) => {
        const state = get();
        return state.teamStats[teamId] || null;
      },

      // ==================== TACTICS ACTIONS ====================

      /**
       * Get default bowling plans based on player's primary bowling playstyle
       * @param {Object} player - Player object
       * @returns {Object} Default bowling plans {lineLength, variation}
       */
      getDefaultBowlingPlansForPlaystyle: (player) => {
        const primaryBowlingPlaystyle = player.primaryPlaystyle?.bowling;

        // Mapping from bowling playstyles to their optimal bowling plans
        const playstyleToPlans = {
          // Pace bowlers
          'Swing Bowler': {
            lineLength: 'Attacking Line',
            variation: 'Swing/Seam Focus'
          },
          'Hit-the-Deck Seamer': {
            lineLength: 'Wide Line',
            variation: 'Consistent Accuracy'
          },
          'Short-Ball Specialist': {
            lineLength: 'Short-Pitched',
            variation: 'Bouncer Barrage'
          },
          'Death Specialist': {
            lineLength: 'Yorker Execution',
            variation: 'Pace Variation Mix'
          },
          // Spin bowlers
          'Classical Spinner': {
            lineLength: 'Flight & Loop',
            variation: 'Flight Variation'
          },
          'Flat Spinner': {
            lineLength: 'Flat & Fast',
            variation: 'Pace Variation'
          },
          'Mystery Spinner': {
            lineLength: 'Wide of Off',
            variation: 'Turn Candy Bag'
          },
          'Containment Spinner': {
            lineLength: 'Flat & Fast', // Default for containment
            variation: 'Consistent Line'
          }
        };

        // Return plans for the playstyle, or fallback based on bowling type
        if (primaryBowlingPlaystyle && playstyleToPlans[primaryBowlingPlaystyle]) {
          return playstyleToPlans[primaryBowlingPlaystyle];
        }

        // Fallback based on bowlingType if no primary playstyle
        if (player.bowlingType === 'spin') {
          return { lineLength: 'Flight & Loop', variation: 'Flight Variation' };
        } else {
          return { lineLength: 'Wide Line', variation: 'Consistent Accuracy' };
        }
      },

      // NOTE: selectBalancedPlayingXI, initializeDefaultTactics, and initializeAllTeamsTactics
      // have been moved to AITacticsManager.js for centralized AI tactics management

      /**
       * Validate that a playing XI has required roles
       * @param {string[]} playerIds - Array of 11 player IDs
       * @param {Object} playerStore - Player store to get player objects
       * @returns {{valid: boolean, errors: string[]}} Validation result
       */
      validatePlayingXI: (playerIds, playerStore) => {
        const errors = [];
        const players = playerIds.map(id => playerStore.players[id]).filter(Boolean);

        if (players.length !== 11) {
          errors.push(`Playing XI must have exactly 11 players (has ${players.length})`);
        }

        // Check for wicketkeeper
        const wicketkeepers = players.filter(p => p.role === 'wicket-keeper');
        if (wicketkeepers.length === 0) {
          errors.push('Playing XI must have at least 1 wicketkeeper');
        } else if (wicketkeepers.length > 1) {
          errors.push(`Playing XI should have only 1 wicketkeeper (has ${wicketkeepers.length})`);
        }

        // Check for bowling options
        const bowlers = players.filter(p => p.role === 'bowler' || p.role === 'all-rounder');
        if (bowlers.length < 5) {
          errors.push(`Playing XI should have at least 5 bowlers/all-rounders (has ${bowlers.length})`);
        }

        return {
          valid: errors.length === 0,
          errors
        };
      },

      /**
       * Get tactics for a specific team
       * @param {string} teamId - Team ID
       * @returns {TeamTactics|null} Team tactics or null
       */
      getTeamTactics: (teamId) => {
        const state = get();
        return state.teamTactics[teamId] || null;
      },

      /**
       * Set complete tactics for a team (used by AITacticsManager)
       * @param {string} teamId - Team ID
       * @param {TeamTactics} tactics - Complete tactics object
       */
      setTeamTactics: (teamId, tactics) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: tactics
          }
        }));
      },

      /**
       * Update squad selection (playing XI)
       * Automatically syncs batting order to maintain consistency
       * @param {string} teamId - Team ID
       * @param {string[]} playerIds - Array of 11 player IDs
       */
      updateSquadSelection: (teamId, playerIds) => {
        set((state) => {
          const currentTactics = state.teamTactics[teamId];
          const currentBattingOrder = currentTactics?.battingOrder || [];

          // Sync batting order with new squad:
          // 1. Keep players that are still in squad in their current batting positions
          // 2. Add new players at the end
          const keptPlayers = currentBattingOrder.filter(id => playerIds.includes(id));
          const newPlayers = playerIds.filter(id => !keptPlayers.includes(id));
          const newBattingOrder = [...keptPlayers, ...newPlayers];

          // Clean up tactics for removed players
          const newAccelerationTiers = { ...(currentTactics?.accelerationTiers || {}) };
          const newBowlingPlans = { ...(currentTactics?.bowlingPlans || {}) };
          const newPlaystyleOverrides = { ...(currentTactics?.playstyleOverrides || {}) };
          const currentBowlingRotation = currentTactics?.bowlingRotation || [];

          // Remove data for players no longer in squad
          Object.keys(newAccelerationTiers).forEach(playerId => {
            if (!playerIds.includes(playerId)) {
              delete newAccelerationTiers[playerId];
            }
          });
          Object.keys(newBowlingPlans).forEach(playerId => {
            if (!playerIds.includes(playerId)) {
              delete newBowlingPlans[playerId];
            }
          });
          Object.keys(newPlaystyleOverrides).forEach(playerId => {
            if (!playerIds.includes(playerId)) {
              delete newPlaystyleOverrides[playerId];
            }
          });

          // Filter bowling rotation to only include players in the new squad
          const newBowlingRotation = currentBowlingRotation.filter(playerId =>
            playerIds.includes(playerId)
          );

          // CRITICAL: Also clear overAssignments when squad changes
          // overAssignments takes priority over bowlingRotation in MatchEngine,
          // so we must clear it to force regeneration with the updated squad
          // The match engine will auto-regenerate valid assignments via ensureCompleteBowlingRotation
          const currentOverAssignments = currentTactics?.overAssignments || {};
          const hasInvalidOverAssignments = Object.values(currentOverAssignments).some(
            bowlerId => bowlerId && !playerIds.includes(bowlerId)
          );

          return {
            teamTactics: {
              ...state.teamTactics,
              [teamId]: {
                ...currentTactics,
                squadSelection: playerIds,
                battingOrder: newBattingOrder,
                accelerationTiers: newAccelerationTiers,
                bowlingPlans: newBowlingPlans,
                playstyleOverrides: newPlaystyleOverrides,
                bowlingRotation: newBowlingRotation,
                // Clear overAssignments if any bowler is no longer in squad
                overAssignments: hasInvalidOverAssignments ? {} : currentOverAssignments
              }
            }
          };
        });
      },

      /**
       * Update playstyle override for a player
       * @param {string} teamId - Team ID
       * @param {string} playerId - Player ID
       * @param {Object|null} playstyles - {batting?: string, bowling?: string} or null to remove all overrides
       */
      updatePlaystyleOverride: (teamId, playerId, playstyles) => {
        set((state) => {
          const teamTactics = state.teamTactics[teamId];
          const overrides = { ...teamTactics.playstyleOverrides };

          if (playstyles === null) {
            // Remove all overrides for this player
            delete overrides[playerId];
          } else {
            // Update overrides (merge with existing)
            overrides[playerId] = {
              ...(overrides[playerId] || {}),
              ...playstyles
            };

            // Clean up if both are null/undefined
            if (!overrides[playerId].batting && !overrides[playerId].bowling) {
              delete overrides[playerId];
            }
          }

          return {
            teamTactics: {
              ...state.teamTactics,
              [teamId]: {
                ...teamTactics,
                playstyleOverrides: overrides
              }
            }
          };
        });
      },

      /**
       * Update batting order
       * @param {string} teamId - Team ID
       * @param {string[]} orderedPlayerIds - Array of player IDs in batting order
       */
      updateBattingOrder: (teamId, orderedPlayerIds) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              battingOrder: orderedPlayerIds
            }
          }
        }));
      },

      /**
       * Update acceleration tier for a player
       * @param {string} teamId - Team ID
       * @param {string} playerId - Player ID
       * @param {string} tier - Acceleration tier name
       */
      updateAccelerationTier: (teamId, playerId, tier) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              accelerationTiers: {
                ...state.teamTactics[teamId].accelerationTiers,
                [playerId]: tier
              }
            }
          }
        }));
      },

      /**
       * Update bowling plans for a player
       * @param {string} teamId - Team ID
       * @param {string} playerId - Player ID
       * @param {BowlingPlans} plans - Bowling plans object
       */
      updateBowlingPlans: (teamId, playerId, plans) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              bowlingPlans: {
                ...state.teamTactics[teamId].bowlingPlans,
                [playerId]: plans
              }
            }
          }
        }));
      },

      /**
       * Update bowling rotation order
       * @param {string} teamId - Team ID
       * @param {string[]} rotationOrder - Array of player IDs in rotation order
       */
      updateBowlingRotation: (teamId, rotationOrder) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              bowlingRotation: rotationOrder
            }
          }
        }));
      },

      /**
       * Update over assignments (which bowler bowls which over)
       * @param {string} teamId - Team ID
       * @param {Object} overAssignments - Object mapping over number to bowler ID { 1: 'id', 2: 'id', ... }
       */
      updateOverAssignments: (teamId, overAssignments) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              overAssignments
            }
          }
        }));
      },

      /**
       * Update field formation
       * @param {string} teamId - Team ID
       * @param {string} formation - Formation ID (e.g., 'attacking_pace_cordon', 'neutral_orthodox', 'defensive_ring_fence')
       */
      updateFieldFormation: (teamId, formation) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              fieldFormation: formation
            }
          }
        }));
      },

      /**
       * Update team fielding setup (comprehensive version with powerplay/post-powerplay)
       * @param {string} teamId - Team ID
       * @param {Object} fieldingSetup - Fielding setup object with powerplay and postPowerplay configurations
       */
      updateFieldingSetup: (teamId, fieldingSetup) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              fielding: fieldingSetup
            }
          }
        }));
      },

      /**
       * Update team captain
       * @param {string} teamId - Team ID
       * @param {string|null} playerId - Player ID or null to unset
       */
      updateCaptain: (teamId, playerId) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              captain: playerId
            }
          }
        }));
      },

      /**
       * Update team vice-captain
       * @param {string} teamId - Team ID
       * @param {string|null} playerId - Player ID or null to unset
       */
      updateViceCaptain: (teamId, playerId) => {
        set((state) => ({
          teamTactics: {
            ...state.teamTactics,
            [teamId]: {
              ...state.teamTactics[teamId],
              viceCaptain: playerId
            }
          }
        }));
      },

      /**
       * Update team wicket-keeper
       * Also updates fielding assignments to put the keeper at position 1 (wicket-keeper position)
       * @param {string} teamId - Team ID
       * @param {string|null} playerId - Player ID or null to unset
       */
      updateWicketKeeper: (teamId, playerId) => {
        set((state) => {
          const currentTactics = state.teamTactics[teamId] || {};
          const currentFielding = currentTactics.fielding || {};

          // Update fielding assignments to put keeper at position 1
          const updatedFielding = { ...currentFielding };

          // Helper function to update assignments for a phase
          const updatePhaseAssignments = (phaseData) => {
            if (!phaseData) return phaseData;

            const assignments = { ...(phaseData.playerAssignments || {}) };

            if (playerId) {
              // Remove this player from any existing assignment
              Object.keys(assignments).forEach(pos => {
                if (assignments[pos] === playerId) {
                  assignments[pos] = null;
                }
              });
              // Assign to position 1 (keeper position)
              assignments[1] = playerId;
            } else {
              // If clearing keeper, also clear position 1
              assignments[1] = null;
            }

            return {
              ...phaseData,
              playerAssignments: assignments
            };
          };

          // Update powerplay assignments (create if doesn't exist)
          if (updatedFielding.powerplay) {
            updatedFielding.powerplay = updatePhaseAssignments(updatedFielding.powerplay);
          } else if (playerId) {
            // Initialize powerplay with just the keeper assignment
            updatedFielding.powerplay = {
              template: 'attacking_powerplay_press',
              playerAssignments: { 1: playerId }
            };
          }

          // Update post-powerplay assignments (create if doesn't exist)
          if (updatedFielding.postPowerplay) {
            updatedFielding.postPowerplay = updatePhaseAssignments(updatedFielding.postPowerplay);
          } else if (playerId) {
            // Initialize postPowerplay with just the keeper assignment
            updatedFielding.postPowerplay = {
              template: 'defensive_ring_fence',
              playerAssignments: { 1: playerId }
            };
          }

          return {
            teamTactics: {
              ...state.teamTactics,
              [teamId]: {
                ...currentTactics,
                wicketKeeper: playerId,
                fielding: updatedFielding
              }
            }
          };
        });
      },

      /**
       * Auto-assign bowling rotation using intelligent selection algorithm
       * Uses aiCore.canBowl() to filter eligible bowlers, with fallback to part-timers if needed
       * Assigns all 20 overs to bowlers from playing XI based on their attributes and playstyles
       * @param {string} teamId - Team ID
       * @returns {string[]} Array of 20 player IDs (one per over)
       */
      autoAssignBowlingRotation: (teamId) => {
        const state = get();
        const playerStore = usePlayerStore.getState();
        const tactics = state.teamTactics[teamId];

        if (!tactics || !tactics.squadSelection) {
          console.warn(`Cannot auto-assign bowling rotation for team ${teamId}: no tactics or squad`);
          return [];
        }

        // Get all players from playing XI
        const playingXI = tactics.squadSelection
          .map(id => playerStore.players[id])
          .filter(Boolean);

        // Filter primary eligible bowlers using aiCore.canBowl()
        // This includes: role='bowler'/'all-rounder' OR bowling rating >= 30
        let eligibleBowlers = playingXI.filter(player => aiCore.canBowl(player));

        // Sort by bowling rating (highest first)
        eligibleBowlers.sort((a, b) => {
          const ratingA = aiCore.getBowlingRating(a);
          const ratingB = aiCore.getBowlingRating(b);
          return ratingB - ratingA;
        });

        // FALLBACK: If fewer than 5 eligible bowlers, add part-timers from playing XI
        // Cricket requires at least 5 bowlers to avoid consecutive overs (4 overs × 5 bowlers = 20)
        if (eligibleBowlers.length < 5) {
          console.warn(`Team ${teamId} has only ${eligibleBowlers.length} eligible bowlers - adding part-timers`);

          // Get non-bowlers from playing XI, sorted by bowling playstyle rating
          const partTimers = playingXI
            .filter(player => !aiCore.canBowl(player))
            .map(player => {
              // Get best bowling playstyle rating for this player
              const bowlingRatings = player.playstyleRatings?.bowling || {};
              const bestBowlingRating = Math.max(...Object.values(bowlingRatings), 0);
              return { player, rating: bestBowlingRating };
            })
            .sort((a, b) => b.rating - a.rating);

          // Add part-timers until we have at least 5 bowlers
          const needed = 5 - eligibleBowlers.length;
          const addedPartTimers = partTimers.slice(0, needed).map(pt => pt.player);

          if (addedPartTimers.length > 0) {
            console.log(`Added ${addedPartTimers.length} part-timer(s) to bowling rotation: ${addedPartTimers.map(p => p.name).join(', ')}`);
            eligibleBowlers = [...eligibleBowlers, ...addedPartTimers];
          }
        }

        if (eligibleBowlers.length === 0) {
          console.warn(`No eligible bowlers found for team ${teamId}`);
          return [];
        }

        // Auto-assign algorithm
        const newAssignments = [];
        const oversBowled = {};
        const maxOversPerBowler = 4;
        let previousBowler = null;

        // Initialize overs bowled
        eligibleBowlers.forEach(bowler => {
          oversBowled[bowler.id] = 0;
        });

        // Assign each over (0-19)
        for (let overIndex = 0; overIndex < 20; overIndex++) {
          // Determine phase for this over
          let phase = 'powerplay';
          if (overIndex >= 6 && overIndex < 12) phase = 'middle';
          else if (overIndex >= 12 && overIndex < 16) phase = 'middle';
          else if (overIndex >= 16) phase = 'death';

          // Score each eligible bowler
          const scoredBowlers = eligibleBowlers
            .filter(bowler =>
              bowler.id !== previousBowler &&
              oversBowled[bowler.id] < maxOversPerBowler
            )
            .map(bowler => {
              const bowlerPlaystyle = bowler.primaryPlaystyle?.bowling || '';
              const bowlingRating = aiCore.getBowlingRating(bowler);

              // Rotation bonus - MUST be dominant to ensure even distribution
              // With 5 bowlers and 20 overs, we need 4-4-4-4-4 distribution
              // Strong weight (×20) ensures rotation takes priority over quality
              let score = (maxOversPerBowler - oversBowled[bowler.id]) * 20;

              // Base score from bowling rating (secondary consideration)
              score += bowlingRating / 10;

              // Phase-based bonuses (tertiary consideration)
              const phaseBonuses = {
                powerplay: { 'Swing Bowler': 3, 'Wicket-Taker': 3 },
                middle: { 'Flat Spinner': 2, 'Containment Spinner': 2, 'Hit-the-Deck Seamer': 2 },
                death: { 'Death Specialist': 4, 'Yorker Specialist': 3 },
              };
              score += phaseBonuses[phase]?.[bowlerPlaystyle] || 0;

              return { bowler, score };
            });

          // Sort by score and select best
          scoredBowlers.sort((a, b) => b.score - a.score);

          if (scoredBowlers.length > 0) {
            const selectedBowler = scoredBowlers[0].bowler;
            newAssignments[overIndex] = selectedBowler.id;
            oversBowled[selectedBowler.id]++;
            previousBowler = selectedBowler.id;
          } else {
            // No valid bowler found - this shouldn't happen with the part-timer fallback
            console.error(
              `❌ CRITICAL: Cannot assign bowler for over ${overIndex + 1}. ` +
              `Team ${teamId} - ${eligibleBowlers.length} bowlers available. ` +
              `Cricket rules require: no consecutive overs, max 4 overs per bowler.`
            );
            console.error('Eligible bowlers:', eligibleBowlers.map(b => b.name));
            console.error('Current overs bowled:', oversBowled);
            console.error('Previous bowler:', previousBowler);

            // Return incomplete rotation - match will fail at initialization
            return newAssignments;
          }
        }

        return newAssignments;
      },

      /**
       * Ensure over assignments are complete and valid before match starts
       * Only validates overAssignments (the actual per-over bowler mapping)
       * Note: bowlingRotation is just a priority list of bowlers (5-8 entries), NOT per-over assignments
       * @param {string} teamId - Team ID
       */
      ensureCompleteBowlingRotation: (teamId) => {
        const state = get();
        const tactics = state.teamTactics[teamId];

        if (!tactics) {
          console.warn(`Cannot ensure bowling rotation for team ${teamId}: no tactics found`);
          return;
        }

        const currentOverAssignments = tactics.overAssignments || {};
        const playingXI = tactics.squadSelection || [];

        // Check if we need to regenerate over assignments
        let needsReassignment = false;
        let reassignmentReason = '';

        // Check 1: Does overAssignments have all 20 overs?
        const assignedOversCount = Object.keys(currentOverAssignments).length;
        if (assignedOversCount < 20) {
          needsReassignment = true;
          reassignmentReason = `overAssignments has ${assignedOversCount} overs (needs 20)`;
        }

        // Check 2: Are all bowlers in overAssignments in the current playing XI?
        if (!needsReassignment) {
          const invalidOverBowlers = Object.values(currentOverAssignments)
            .filter(bowlerId => bowlerId && !playingXI.includes(bowlerId));

          if (invalidOverBowlers.length > 0) {
            needsReassignment = true;
            reassignmentReason = `overAssignments contains ${invalidOverBowlers.length} bowler(s) not in playing XI`;
          }
        }

        if (needsReassignment) {
          console.log(`[ensureCompleteBowlingRotation] Team ${teamId}: ${reassignmentReason} - regenerating`);

          // Auto-assign complete rotation
          const completeRotation = get().autoAssignBowlingRotation(teamId);

          if (completeRotation.length === 20) {
            // Update bowlingRotation
            get().updateBowlingRotation(teamId, completeRotation);

            // CRITICAL: Also generate and update overAssignments from the new rotation
            const newOverAssignments = {};
            completeRotation.forEach((bowlerId, index) => {
              if (bowlerId) {
                newOverAssignments[index + 1] = bowlerId; // 1-indexed overs
              }
            });
            get().updateOverAssignments(teamId, newOverAssignments);

            console.log(`✓ Auto-completed bowling rotation and over assignments for team ${teamId}`);
          } else {
            console.warn(`⚠ Failed to auto-complete bowling rotation for team ${teamId}`);
          }
        }
      },

      /**
       * Export tactics in format suitable for match initialization
       * @param {string} teamId - Team ID
       * @returns {Object|null} Tactics formatted for match engine
       */
      getTacticsForMatch: (teamId) => {
        const state = get();
        const tactics = state.teamTactics[teamId];

        if (!tactics) {
          return null;
        }

        return {
          squadSelection: tactics.squadSelection,
          playstyleOverrides: tactics.playstyleOverrides,
          battingOrder: tactics.battingOrder,
          accelerationTiers: tactics.accelerationTiers,
          bowlingPlans: tactics.bowlingPlans,
          bowlingRotation: tactics.bowlingRotation,
          overAssignments: tactics.overAssignments, // Explicit over-by-over assignments (preferred over bowlingRotation)
          fieldFormation: tactics.fieldFormation
        };
      },

      /**
       * Reset tactics for a team (clears tactics so AITacticsManager regenerates them)
       * @param {string} teamId - Team ID
       */
      resetTacticsToDefaults: (teamId) => {
        set((state) => {
          const newTactics = { ...state.teamTactics };
          delete newTactics[teamId];
          return { teamTactics: newTactics };
        });
        console.log(`🔄 Cleared tactics for team ${teamId} - will regenerate before next match`);
      },

      /**
       * Check if team has tactics initialized
       * @param {string} teamId - Team ID
       * @returns {boolean} True if tactics exist
       */
      hasTactics: (teamId) => {
        const state = get();
        return !!state.teamTactics[teamId];
      },

      // NOTE: initializeAllTeamsTactics has been moved to AITacticsManager.js
      // Called via LeagueInitializer.js after auction

      /**
       * Reset all team tactics (used when starting a new game)
       * Clears all tactics data to ensure fresh start
       */
      resetAllTactics: () => set({
        teamTactics: {}
      })
    }),
    {
      name: 'cm25-team-store',
      version: 3, // Bumped version for compressed storage migration
      storage: createJSONStorage(() => indexedDBStorage, compressedStorageOptions),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate teamStore:', error);
        }
        markHydrated('team');
      }
    }
  )
);

export default useTeamStore;