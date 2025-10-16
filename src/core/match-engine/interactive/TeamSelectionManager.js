/**
 * @file TeamSelectionManager.js
 * @description Handles team selection logic (squad generation, playing 11 selection)
 * Centralizes team building and composition logic
 */

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

    // Step 1: Add best keeper (optional - only if available in database)
    // NOTE: Currently database has no wicket-keepers, so this is skipped
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

    // Log final composition for debugging
    const composition = this.getSquadComposition(team);
    console.log(`[DEBUG] Team composition: ${composition.bowlers} bowlers + ${composition.allRounders} all-rounders = ${composition.bowlingOptions} bowling options (target: ${TARGET_BOWLING_OPTIONS}, min: ${MIN_BOWLING_OPTIONS})`);

    return team;
  }

  /**
   * Classify players by role based on attributes
   * Modifies players in-place by assigning role and bowlingType
   * @param {Array} players - Players to classify
   */
  classifyPlayers(players) {
    players.forEach(player => {
      const battingAttrs = player.attributes.batting;
      const bowlingAttrs = player.attributes.bowling;

      const battingAvg = Object.values(battingAttrs).reduce((a, b) => a + b, 0) / Object.keys(battingAttrs).length;
      const bowlingAvg = Object.values(bowlingAttrs).reduce((a, b) => a + b, 0) / Object.keys(bowlingAttrs).length;

      // Assign bowlingType if not already set
      if (!player.bowlingType) {
        if (bowlingAttrs.turn > 10 || bowlingAttrs.variations > 10) {
          player.bowlingType = 'spin';
        } else {
          player.bowlingType = 'pace';
        }
      }

      // Assign role based on attribute averages
      if (battingAvg >= 10 && bowlingAvg >= 10) {
        player.role = 'all-rounder';
      } else if (bowlingAvg > battingAvg && bowlingAvg >= 8) {
        player.role = 'bowler';
      }
      // Note: batsman and wicket-keeper roles should be pre-assigned in database
    });
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
   * Optimize batting order based on playstyles and roles
   * Places aggressive openers first, anchors in middle, finishers at end
   * @param {Array} team - Team players to order
   * @returns {Array} Optimized batting order
   */
  optimizeBattingOrder(team) {
    // Separate players by batting role type
    const batsmen = team.filter(p => ['batsman', 'all-rounder', 'wicket-keeper'].includes(p.role));
    const bowlers = team.filter(p => p.role === 'bowler');

    // Categorize batsmen by playstyle (using primaryPlaystyle instead of playstyles)
    const openers = [];
    const anchors = [];
    const finishers = [];
    const others = [];

    batsmen.forEach(player => {
      const playstyle = player.primaryPlaystyle?.batting || '';

      // Openers: Aggressive top-order batsmen
      if (playstyle && (playstyle.includes('Opener') || playstyle.includes('Slogger') || playstyle.includes('Pinch-Hitter'))) {
        openers.push(player);
      }
      // Anchors: Balanced and accumulator types for middle order
      else if (playstyle && (playstyle.includes('Balanced') || playstyle.includes('Anchor') || playstyle.includes('Builder') || playstyle.includes('Wall'))) {
        anchors.push(player);
      }
      // Finishers: Aggressive middle-order and power hitters
      else if (playstyle && (playstyle.includes('Finisher') || playstyle.includes('Big Hitter') || playstyle.includes('Power Striker'))) {
        finishers.push(player);
      }
      else {
        // This includes players with no/null playstyle (like some all-rounders)
        others.push(player);
      }
    });

    // Sort each category by rating
    const sortByRating = (a, b) => b.rating - a.rating;
    openers.sort(sortByRating);
    anchors.sort(sortByRating);
    finishers.sort(sortByRating);
    others.sort(sortByRating);

    // Build batting order - use Set to prevent duplicates
    const order = [];
    const added = new Set();

    // Helper to add players without duplicates (use object reference instead of ID for Set)
    const addPlayers = (players, maxCount = Infinity) => {
      let count = 0;
      for (const player of players) {
        if (count >= maxCount) break;
        // Check if player is already in order array directly (more reliable than ID check)
        if (!order.includes(player)) {
          order.push(player);
          count++;
        }
      }
    };

    // Positions 1-2: Best openers
    addPlayers(openers, 2);

    // If not enough openers, fill with best remaining batsmen
    if (order.length < 2) {
      const remaining = [...anchors, ...finishers, ...others].sort(sortByRating);
      addPlayers(remaining, 2 - order.length);
    }

    // Positions 3-5: Remaining openers, then anchors (but not limiting anchors to 3)
    addPlayers(openers, Infinity); // Add any remaining openers

    // Add ALL remaining batsmen (anchors, finishers, others) in priority order
    // This ensures we use all batsmen before moving to bowlers
    addPlayers(anchors, Infinity);
    addPlayers(finishers, Infinity);
    addPlayers(others, Infinity);

    // Add bowlers at the end (tail) - only add what's needed to reach team size
    addPlayers(bowlers.sort(sortByRating), Infinity);

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
      let score = (playstyleRatings[bowlerPlaystyle] || b.player.rating * 5) / 10; // Adjusted fallback

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
