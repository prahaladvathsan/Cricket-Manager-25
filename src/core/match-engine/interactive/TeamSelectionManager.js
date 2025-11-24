/**
 * @file TeamSelectionManager.js
 * @description Handles team selection logic (squad generation, playing 11 selection)
 * Centralizes team building and composition logic
 */

import { getPlayerRating } from '../../../utils/ratingHelper.js';

class TeamSelectionManager {
  /**
   * Select a balanced squad from available players
   * @param {Array} availablePlayers - Pool of available players
   * @param {number} squadSize - Size of squad to select (default 25)
   * @returns {Array} Selected squad
   */
  selectBalancedSquad(availablePlayers, squadSize = 25) {
    const bowlers = availablePlayers.filter(p => p.role === 'bowler');
    const allRounders = availablePlayers.filter(p => p.role === 'all-rounder');
    const batsmen = availablePlayers.filter(p => p.role === 'batsman');
    const keepers = availablePlayers.filter(p => p.role === 'wicket-keeper');

    const squad = [];

    // Aim for balanced squad: ~2 keepers, 6-8 bowlers, 5-7 all-rounders, 10-12 batsmen
    const keepersNeeded = Math.min(2, keepers.length);
    const bowlersNeeded = Math.min(8, bowlers.length);
    const allRoundersNeeded = Math.min(7, allRounders.length);

    // Add keepers
    for (let i = 0; i < keepersNeeded && squad.length < squadSize; i++) {
      squad.push(keepers[i]);
    }

    // Add all-rounders
    for (let i = 0; i < allRoundersNeeded && squad.length < squadSize; i++) {
      squad.push(allRounders[i]);
    }

    // Add bowlers
    for (let i = 0; i < bowlersNeeded && squad.length < squadSize; i++) {
      squad.push(bowlers[i]);
    }

    // Fill remaining slots with batsmen and others
    const remaining = availablePlayers.filter(p => !squad.includes(p));

    while (squad.length < squadSize && remaining.length > 0) {
      squad.push(remaining.shift());
    }

    return squad;
  }

  /**
   * Select a balanced playing 11 from squad
   * Optimized to ensure 5-6 bowling options and best batting lineup
   * @param {Array} availablePlayers - Squad players to choose from
   * @param {number} teamSize - Size of team (default 11)
   * @returns {Array} Selected playing 11
   */
  selectBalancedTeam(availablePlayers, teamSize = 11) {
    // Sort players by rating first
    const sortedPlayers = [...availablePlayers].sort((a, b) => b.rating - a.rating);

    const bowlers = sortedPlayers.filter(p => p.role === 'bowler');
    const allRounders = sortedPlayers.filter(p => p.role === 'all-rounder');
    const batsmen = sortedPlayers.filter(p => p.role === 'batsman');
    const keepers = sortedPlayers.filter(p => p.role === 'wicket-keeper');

    const team = [];
    const MIN_BOWLING_OPTIONS = 5;
    const TARGET_BOWLING_OPTIONS = 6;

    // Step 1: Add wicket-keeper (highest rated keeper)
    if (keepers.length > 0) {
      team.push(keepers[0]);
    }

    // Step 2: Ensure we have TARGET_BOWLING_OPTIONS
    // Start with all-rounders (they provide both batting and bowling)
    const allRoundersToSelect = Math.min(allRounders.length, 2);
    for (let i = 0; i < allRoundersToSelect && team.length < teamSize; i++) {
      team.push(allRounders[i]);
    }

    // Calculate how many specialist bowlers needed to reach target
    let currentBowlingOptions = team.filter(p =>
      p.role === 'all-rounder' || p.role === 'bowler'
    ).length;

    const bowlersNeeded = Math.max(0, TARGET_BOWLING_OPTIONS - currentBowlingOptions);

    // Add best specialist bowlers
    for (let i = 0; i < bowlersNeeded && i < bowlers.length && team.length < teamSize; i++) {
      team.push(bowlers[i]);
    }

    // Verify we have at least MIN_BOWLING_OPTIONS
    currentBowlingOptions = team.filter(p =>
      p.role === 'all-rounder' || p.role === 'bowler'
    ).length;

    // If still below minimum, add more all-rounders or bowlers
    if (currentBowlingOptions < MIN_BOWLING_OPTIONS) {
      const additionalNeeded = MIN_BOWLING_OPTIONS - currentBowlingOptions;

      // Try unused all-rounders first
      const unusedAllRounders = allRounders.filter(ar => !team.includes(ar));
      for (let i = 0; i < Math.min(additionalNeeded, unusedAllRounders.length) && team.length < teamSize; i++) {
        team.push(unusedAllRounders[i]);
        currentBowlingOptions++;
      }

      // Then unused bowlers if still needed
      if (currentBowlingOptions < MIN_BOWLING_OPTIONS) {
        const unusedBowlers = bowlers.filter(b => !team.includes(b));
        const stillNeeded = MIN_BOWLING_OPTIONS - currentBowlingOptions;
        for (let i = 0; i < Math.min(stillNeeded, unusedBowlers.length) && team.length < teamSize; i++) {
          team.push(unusedBowlers[i]);
        }
      }
    }

    // Step 3: Fill ALL remaining slots with best batsmen
    // This ensures we always get exactly 11 players
    while (team.length < teamSize) {
      const availableBatsmen = batsmen.filter(p => !team.includes(p));

      if (availableBatsmen.length > 0) {
        team.push(availableBatsmen[0]);
      } else {
        // If no batsmen left, fill with any remaining players
        const remaining = sortedPlayers.filter(p => !team.includes(p));
        if (remaining.length > 0) {
          team.push(remaining[0]);
        } else {
          // This should never happen, but break to avoid infinite loop
          console.error('[ERROR] Cannot fill team to required size - not enough players available');
          break;
        }
      }
    }

    // Initialize selectedPlaystyle for all players (will be refined in optimizeBattingOrder)
    // For now, just set to primary playstyles
    team.forEach(player => {
      if (!player.selectedPlaystyle) {
        player.selectedPlaystyle = {
          batting: player.primaryPlaystyle?.batting || null,
          bowling: player.primaryPlaystyle?.bowling || null
        };
      }
    });

    return team;
  }

  /**
   * Validate squad composition
   * @param {Array} squad - Squad to validate
   * @returns {Object} Validation result with { valid: boolean, issues: string[] }
   */
  validateSquadComposition(squad) {
    const issues = [];

    const byRole = {
      batsman: squad.filter(p => p.role === 'batsman').length,
      bowler: squad.filter(p => p.role === 'bowler').length,
      'all-rounder': squad.filter(p => p.role === 'all-rounder').length,
      'wicket-keeper': squad.filter(p => p.role === 'wicket-keeper').length
    };

    // Minimum requirements for a valid playing 11
    if (byRole['wicket-keeper'] === 0) {
      issues.push('No wicket-keeper selected');
    }

    const bowlingOptions = byRole.bowler + byRole['all-rounder'];
    if (bowlingOptions < 5) {
      issues.push(`Only ${bowlingOptions} bowling options (need at least 5)`);
    }

    if (squad.length !== 11) {
      issues.push(`Squad has ${squad.length} players (need exactly 11)`);
    }

    return {
      valid: issues.length === 0,
      issues,
      composition: byRole
    };
  }

  /**
   * Get squad composition summary
   * @param {Array} squad - Squad to analyze
   * @returns {Object} Composition breakdown
   */
  getSquadComposition(squad) {
    return {
      batsmen: squad.filter(p => p.role === 'batsman').length,
      bowlers: squad.filter(p => p.role === 'bowler').length,
      allRounders: squad.filter(p => p.role === 'all-rounder').length,
      keepers: squad.filter(p => p.role === 'wicket-keeper').length,
      bowlingOptions: squad.filter(p => ['bowler', 'all-rounder'].includes(p.role)).length
    };
  }

  /**
   * Optimize batting order based on playstyles
   * Assigns optimal playstyle for each position and returns ordered team with selected playstyles
   * Order: 2 Openers, 2 Top Order, 2 Middle Order, 2 Lower Order, then rest sorted by primary batting playstyle rating
   * @param {Array} team - Team players to order
   * @returns {Array} Optimized batting order with selectedPlaystyle property added to each player
   */
  optimizeBattingOrder(team) {
    const order = [];
    const remaining = [...team];

    /**
     * Find best player for a specific playstyle category from remaining players
     * @param {Array} players - Available players
     * @param {string} playstyleCategory - Category to match (e.g., 'Opener', 'Top Order')
     * @param {number} count - Number of players needed
     * @returns {Array} Selected players with selectedPlaystyle set
     */
    const selectByPlaystyle = (players, playstyleCategory, count) => {
      const selected = [];

      for (let i = 0; i < count && players.length > 0; i++) {
        // First, try to find players whose primary playstyle matches the category
        const primaryMatches = players.filter(p => {
          const primary = p.primaryPlaystyle?.batting || '';
          return primary.includes(playstyleCategory);
        });

        if (primaryMatches.length > 0) {
          // Sort by rating and pick the best
          primaryMatches.sort((a, b) => b.rating - a.rating);
          const chosen = primaryMatches[0];
          chosen.selectedPlaystyle = {
            batting: chosen.primaryPlaystyle.batting,
            bowling: chosen.primaryPlaystyle?.bowling || null
          };
          selected.push(chosen);
          players.splice(players.indexOf(chosen), 1);
        } else {
          // No primary match, find player with highest playstyle rating for this category
          const scoredPlayers = players.map(p => {
            const playstyleRatings = p.playstyleRatings?.batting || {};

            // Find the highest rated playstyle that matches the category
            let bestRating = 0;
            let bestPlaystyleName = null;

            Object.entries(playstyleRatings).forEach(([name, rating]) => {
              if (name.includes(playstyleCategory) && rating > bestRating) {
                bestRating = rating;
                bestPlaystyleName = name;
              }
            });

            return {
              player: p,
              playstyleRating: bestRating,
              playstyleName: bestPlaystyleName
            };
          });

          // Sort by playstyle rating for this category
          scoredPlayers.sort((a, b) => b.playstyleRating - a.playstyleRating);

          if (scoredPlayers.length > 0 && scoredPlayers[0].playstyleRating > 0) {
            const chosen = scoredPlayers[0].player;
            chosen.selectedPlaystyle = {
              batting: scoredPlayers[0].playstyleName,
              bowling: chosen.primaryPlaystyle?.bowling || null
            };
            selected.push(chosen);
            players.splice(players.indexOf(chosen), 1);
          } else {
            // Fallback: no suitable playstyle rating, use best remaining player by rating
            players.sort((a, b) => b.rating - a.rating);
            if (players.length > 0) {
              const chosen = players[0];
              chosen.selectedPlaystyle = {
                batting: chosen.primaryPlaystyle?.batting || null,
                bowling: chosen.primaryPlaystyle?.bowling || null
              };
              selected.push(chosen);
              players.splice(0, 1);
            }
          }
        }
      }

      return selected;
    };

    // Position 1-2: Openers
    const openers = selectByPlaystyle(remaining, 'Opener', 2);
    order.push(...openers);

    // Position 3-4: Top Order
    const topOrder = selectByPlaystyle(remaining, 'Top Order', 2);
    order.push(...topOrder);

    // Position 5-6: Middle Order
    const middleOrder = selectByPlaystyle(remaining, 'Middle Order', 2);
    order.push(...middleOrder);

    // Position 7-8: Lower Order
    const lowerOrder = selectByPlaystyle(remaining, 'Lower Order', 2);
    order.push(...lowerOrder);

    // Positions 9-11: Fill with remaining players sorted by their primary batting playstyle rating
    remaining.forEach(player => {
      const primary = player.primaryPlaystyle?.batting;
      const primaryRating = primary ? (player.playstyleRatings?.batting?.[primary] || 0) : 0;
      player._sortRating = primaryRating;
    });

    remaining.sort((a, b) => b._sortRating - a._sortRating);

    remaining.forEach(player => {
      player.selectedPlaystyle = {
        batting: player.primaryPlaystyle?.batting || null,
        bowling: player.primaryPlaystyle?.bowling || null
      };
      order.push(player);
      delete player._sortRating; // Clean up temporary property
    });

    // Ensure we return exactly the team size
    if (order.length !== team.length) {
      console.error(`[ERROR] Batting order size mismatch! Expected ${team.length}, got ${order.length}`);
    }

    return order;
  }

  /**
   * Select next bowler intelligently based on match situation and playstyles
   * @param {Object} matchSituation - Current match situation (over, phase, etc.)
   * @param {Array} bowlingSquad - Available bowlers (player IDs)
   * @param {string} currentBowler - Current bowler ID (to avoid consecutive overs)
   * @param {Object} oversBowled - Map of bowler IDs to overs bowled
   * @param {Object} playerStore - Player store to fetch player data
   * @param {number} maxBowlerOvers - Max overs per bowler (default 4)
   * @returns {string} Selected bowler ID
   */
  selectNextBowler(matchSituation, bowlingSquad, currentBowler, oversBowled, playerStore, maxBowlerOvers = 4) {
    const { over: currentOver = 0, phase = 'powerplay', strikerId, nonStrikerId } = matchSituation;

    const striker = strikerId ? playerStore.getState().getPlayer(strikerId) : null;
    const nonStriker = nonStrikerId ? playerStore.getState().getPlayer(nonStrikerId) : null;
    
    const getMatchupScore = (bowlerPlaystyle, batsman) => {
      if (!batsman || !batsman.tactics?.bowlingStylePreferences) return 0;
      // Higher preference value means batsman is weaker against that style.
      const preference = batsman.tactics.bowlingStylePreferences[bowlerPlaystyle] || 4; // Default to neutral (4 out of 8)
      // Scale the 1-8 preference to a more impactful score, e.g., 0 to 7
      return (preference - 1);
    };

    const allBowlers = bowlingSquad
      .map(id => ({
        id,
        player: playerStore.getState().getPlayer(id),
        overs: oversBowled[id] || 0,
      }))
      .filter(b => 
        b.player &&
        b.player.role !== 'wicket-keeper' &&
        b.id !== currentBowler &&
        b.overs < maxBowlerOvers &&
        ['bowler', 'all-rounder'].includes(b.player.role)
      );

    if (allBowlers.length === 0) {
      console.warn('No eligible bowlers found, using fallback');
      const fallback = bowlingSquad.find(id => {
        const p = playerStore.getState().getPlayer(id);
        return p && ['bowler', 'all-rounder'].includes(p.role) && id !== currentBowler;
      });
      return fallback || currentBowler;
    }

    const scoredBowlers = allBowlers.map(b => {
      const bowlerPlaystyle = b.player.primaryPlaystyle?.bowling || '';
      const playstyleRatings = b.player.playstyleRatings?.bowling || {};
      // Base score from bowler's own rating for their primary playstyle
      let score = (playstyleRatings[bowlerPlaystyle] || getPlayerRating(b.player)) / 10; // Adjusted fallback

      // 1. Phase-based scoring
      const phaseBonuses = {
        powerplay: { 'Swing Bowler': 3, 'Wicket-Taker': 3 },
        middle: { 'Flat Spinner': 2, 'Containment Spinner': 2, 'Hit-the-Deck Seamer': 2 },
        death: { 'Death Specialist': 4, 'Yorker Specialist': 3 },
      };
      score += phaseBonuses[phase]?.[bowlerPlaystyle] || 0;

      // 2. Matchup-based scoring using batsman's preferences
      const strikerMatchupScore = getMatchupScore(bowlerPlaystyle, striker);
      const nonStrikerMatchupScore = getMatchupScore(bowlerPlaystyle, nonStriker);
      // Weighted average: 70% striker, 30% non-striker. Scaled by 0.5 to balance with other scores.
      const totalMatchupScore = ((0.7 * strikerMatchupScore) + (0.3 * nonStrikerMatchupScore)) * 0.5;
      score += totalMatchupScore;
      
      // 3. Rotation bonus - ensures bowlers are rotated
      score += (maxBowlerOvers - b.overs) * 1.5; // Increased weight

      return { ...b, score, matchupScore: totalMatchupScore };
    });

    scoredBowlers.sort((a, b) => b.score - a.score);
    
    console.log('🤖 AI Bowler Selection Analysis:');
    if (striker || nonStriker) {
        console.log(`   vs Striker: ${striker?.name || 'N/A'}, Non-Striker: ${nonStriker?.name || 'N/A'}`);
    }
    scoredBowlers.slice(0, 3).forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.player.name} (Score: ${b.score.toFixed(2)}, Style: ${b.player.primaryPlaystyle?.bowling || 'N/A'}, Matchup: ${b.matchupScore.toFixed(2)})`);
    });

    return scoredBowlers[0].id;
  }
}

export default TeamSelectionManager;
