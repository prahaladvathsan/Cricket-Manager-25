/**
 * @file AuctionEngine.js
 * @description Main auction orchestration - player categorization, bidding logic, winner determination
 */

import { getAuctionConfigForDifficulty } from '../../data/config/auctionConfigSelector.js';
import AuctionTransferAI from '../ai/AuctionTransferAI.js';
import aiCore from '../ai/AICore.js';

class AuctionEngine {
  constructor(options = {}) {
    this.difficulty = options.difficulty || 'normal';
    this.config = getAuctionConfigForDifficulty(this.difficulty);
    this.ai = new AuctionTransferAI(this.difficulty);
    this.core = aiCore;

    // Auction state
    this.teams = [];
    this.playerPool = [];
    this.auctionedPlayers = [];
    this.unsoldPlayers = [];
    this.permanentlyUnsold = []; // Players unsold twice (done for good)
    this.currentPlayer = null;
    this.currentBids = [];
    this.currentHighestBid = null;
    this.roundMetadata = []; // Initialize to empty array

    // Fast mode: no bidding delays, random winner from willing bidders
    this.fastMode = options.fastMode || false;
  }

  /**
   * Get player's primary playstyle rating score based on their role
   * @param {Object} player - Player object
   * @returns {number} Primary playstyle rating score (0-100)
   */
  getPrimaryPlaystyleRatingScore(player) {
    if (!player.topPlaystyles) return 0;

    // Get the highest rated playstyle based on role
    switch (player.role) {
      case 'batsman':
        return player.topPlaystyles.batting?.[0]?.rating || 0;
      case 'bowler':
        return player.topPlaystyles.bowling?.[0]?.rating || 0;
      case 'wicket-keeper':
        // Wicket-keepers: use simplified rating max((batting + keeping) / 2, batting)
        // to prevent pure keepers from dominating Marquee status
        const batRating = player.topPlaystyles.batting?.[0]?.rating || 0;
        const keepRating = player.topPlaystyles.fielding?.[0]?.rating || 0;
        return Math.max((batRating + keepRating) / 2, batRating);
      case 'all-rounder':
        // All-rounders: use the higher of batting or bowling
        const battingRating = player.topPlaystyles.batting?.[0]?.rating || 0;
        const bowlingRating = player.topPlaystyles.bowling?.[0]?.rating || 0;
        return Math.max(battingRating, bowlingRating);
      default:
        return 0;
    }
  }

  /**
   * Initialize auction with teams and player pool
   * @param {Array} teams - Array of team objects { id, name, budget }
   * @param {Array} players - Array of player objects from master database
   * @param {Object} [options] - Optional retention data
   * @param {Object} [options.teamPurses] - Map of teamId -> auction purse amount (from retention)
   * @param {Object} [options.retainedSquads] - Map of teamId -> array of retained player objects
   */
  initializeAuction(teams, players, options = {}) {
    const { teamPurses, retainedSquads } = options;

    // Initialize teams with auction state, using retained data if available
    this.teams = teams.map(team => {
      const retained = retainedSquads?.[team.id] || [];
      const purse = teamPurses?.[team.id] ?? this.config.budget.total;
      return {
        ...team,
        squad: [...retained],
        budgetRemaining: purse,
        totalSpent: this.config.budget.total - purse
      };
    });

    // Collect all retained player IDs to exclude from pool
    const retainedIds = new Set();
    if (retainedSquads) {
      for (const squad of Object.values(retainedSquads)) {
        for (const p of squad) {
          retainedIds.add(p.id);
        }
      }
    }

    // Filter and prepare player pool (exclude retained players)
    // Use primary playstyle rating >= 30 (on 0-100 scale) as minimum quality threshold
    this.playerPool = players
      .filter(p => this.getPrimaryPlaystyleRatingScore(p) >= 30 && !retainedIds.has(p.id))
      .map(p => ({
        ...p,
        basePrice: this.ai.calculateBasePrice(p),
        isMarquee: this.ai.isMarqueePlayer(p),
        status: 'available'
      }));

  }

  /**
   * Categorize players for auction order
   * Categories: marquee (elite 90+), wicket-keepers, all-rounders, batsmen, bowlers
   * @returns {Object} Categorized players sorted by base rating within each category
   */
  categorizePlayers() {
    const categories = {
      marquee: [],
      keepers: [],
      allRounders: [],
      batsmen: [],
      bowlers: []
    };

    // Sort function by base price (which is derived from combined rating)
    const sortByBasePrice = (a, b) => b.basePrice - a.basePrice;

    this.playerPool.forEach(player => {
      // Marquee = elite players (90+ combined rating = $200K base price)
      if (player.basePrice >= 200000) {
        categories.marquee.push(player);
      } else {
        // Non-marquee: categorize by role
        switch (player.role) {
          case 'wicket-keeper':
            categories.keepers.push(player);
            break;
          case 'all-rounder':
            categories.allRounders.push(player);
            break;
          case 'batsman':
            categories.batsmen.push(player);
            break;
          case 'bowler':
            categories.bowlers.push(player);
            break;
          default:
            categories.batsmen.push(player); // Fallback
        }
      }
    });

    // Sort each category by base price (descending)
    categories.marquee.sort(sortByBasePrice);
    categories.keepers.sort(sortByBasePrice);
    categories.allRounders.sort(sortByBasePrice);
    categories.batsmen.sort(sortByBasePrice);
    categories.bowlers.sort(sortByBasePrice);

    return categories;
  }

  /**
   * Split a category into rounds of specified size
   * Last round can be combined if small (less than half of round size)
   * @param {Array} players - Players in this category
   * @param {string} categoryName - Name for labeling (e.g., 'marquee', 'wicket-keepers')
   * @param {number} playersPerRound - Players per round
   * @returns {Array} Array of round objects { label, players }
   */
  splitCategoryIntoRounds(players, categoryName, playersPerRound) {
    if (players.length === 0) return [];

    const rounds = [];
    let roundNum = 1;

    for (let i = 0; i < players.length; i += playersPerRound) {
      const roundPlayers = players.slice(i, i + playersPerRound);

      // Check if this is a small last round that should be combined with previous
      if (roundPlayers.length < playersPerRound / 2 && rounds.length > 0) {
        // Combine with previous round
        rounds[rounds.length - 1].players.push(...roundPlayers);
      } else {
        // Shuffle players within round
        this.shuffleArray(roundPlayers);

        rounds.push({
          label: `${categoryName}${roundNum}`,
          category: categoryName,
          roundNumber: roundNum,
          players: roundPlayers
        });
        roundNum++;
      }
    }

    return rounds;
  }

  /**
   * Create auction rounds with new structure:
   * 1. Split each category into rounds of 10, sorted by base rating
   * 2. Shuffle within rounds
   * 3. Label rounds: marquee1, marquee2..., wicket-keepers1, all-rounders1, batsmen1, bowlers1...
   * 4. Order: All marquee first, then interleaved (wk1, ar1, bat1, bowl1, wk2, ar2, bat2, bowl2...)
   * @param {Object} categorizedPlayers - Players organized by category
   * @returns {Array} Array of rounds, each containing { label, players }
   */
  createAuctionRounds(categorizedPlayers) {
    const { marquee, keepers, allRounders, batsmen, bowlers } = categorizedPlayers;
    const playersPerRound = this.config.rounds.playersPerRound;

    // Split each category into rounds
    const marqueeRounds = this.splitCategoryIntoRounds(marquee, 'marquee', playersPerRound);
    const keeperRounds = this.splitCategoryIntoRounds(keepers, 'wicket-keepers', playersPerRound);
    const allRounderRounds = this.splitCategoryIntoRounds(allRounders, 'all-rounders', playersPerRound);
    const batsmenRounds = this.splitCategoryIntoRounds(batsmen, 'batsmen', playersPerRound);
    const bowlerRounds = this.splitCategoryIntoRounds(bowlers, 'bowlers', playersPerRound);

    // Tag marquee players with their round index so AI valuation can apply a star-player multiplier
    marqueeRounds.forEach((round, idx) => {
      round.players.forEach(p => {
        p.marqueeRoundIndex = idx;
        p.totalMarqueeRounds = marqueeRounds.length;
      });
    });

    // Build final round order
    const orderedRounds = [];

    // 1. All marquee rounds first (in order)
    marqueeRounds.forEach(round => orderedRounds.push(round));

    // 2. Interleave remaining categories: wk1, ar1, bat1, bowl1, wk2, ar2, bat2, bowl2...
    const maxRounds = Math.max(
      keeperRounds.length,
      allRounderRounds.length,
      batsmenRounds.length,
      bowlerRounds.length
    );

    for (let i = 0; i < maxRounds; i++) {
      if (i < keeperRounds.length) orderedRounds.push(keeperRounds[i]);
      if (i < allRounderRounds.length) orderedRounds.push(allRounderRounds[i]);
      if (i < batsmenRounds.length) orderedRounds.push(batsmenRounds[i]);
      if (i < bowlerRounds.length) orderedRounds.push(bowlerRounds[i]);
    }

    // Store round metadata for UI access
    this.roundMetadata = orderedRounds.map((round, idx) => ({
      index: idx,
      label: round.label,
      category: round.category,
      playerCount: round.players.length
    }));

    // Convert to simple array of player arrays for backwards compatibility
    const rounds = orderedRounds.map(round => round.players);

    return rounds;
  }

  /**
   * Get round metadata for UI display
   * @returns {Array} Array of { index, label, category, playerCount }
   */
  getRoundMetadata() {
    return this.roundMetadata || [];
  }

  /**
   * Get current round label
   * @param {number} roundIndex - Current round index
   * @returns {string} Round label (e.g., 'marquee1', 'batsmen2')
   */
  getRoundLabel(roundIndex) {
    if (!this.roundMetadata || roundIndex >= this.roundMetadata.length) {
      return `Round ${roundIndex + 1}`;
    }
    return this.roundMetadata[roundIndex].label;
  }

  /**
   * Check if there are unsold players that need a second chance
   * @returns {boolean} True if unsold round is needed
   */
  hasUnsoldPlayers() {
    return this.unsoldPlayers.length > 0;
  }

  /**
   * Create unsold round - all unsold players in one mega round at 50% base price
   * @returns {Object} { players: Array, metadata: Object }
   */
  createUnsoldRound() {
    if (this.unsoldPlayers.length === 0) {
      return { players: [], metadata: null };
    }

    // Reduce base prices by 50% and mark as being in unsold round
    const unsoldPlayers = this.unsoldPlayers.map(player => {
      player.basePrice = Math.floor(player.basePrice * 0.5);
      player.hasBeenInUnsoldRound = true;
      player.status = 'available'; // Reset status for re-auction
      return player;
    });

    // Sort by base price descending
    unsoldPlayers.sort((a, b) => b.basePrice - a.basePrice);

    // Shuffle for variety
    this.shuffleArray(unsoldPlayers);

    // Clear the unsold array (they're now in the unsold round)
    this.unsoldPlayers = [];

    // Create metadata for the unsold round
    const metadata = {
      index: this.roundMetadata.length,
      label: 'unsold-round',
      category: 'unsold',
      playerCount: unsoldPlayers.length
    };

    // Add to round metadata
    this.roundMetadata.push(metadata);

    return { players: unsoldPlayers, metadata };
  }

  /**
   * Floor a bid amount to the nearest valid bid increment
   * @param {number} amount - Bid amount to floor
   * @returns {number} Floored bid amount
   */
  floorToValidBidAmount(amount) {
    // Find appropriate increment based on bid increments config
    const increments = this.config.bidIncrements.increments;

    for (const tier of increments) {
      if (amount <= tier.maxPrice) {
        const increment = tier.increment;
        // Floor to nearest increment
        return Math.floor(amount / increment) * increment;
      }
    }

    // Fallback: use last increment
    const lastIncrement = increments[increments.length - 1].increment;
    return Math.floor(amount / lastIncrement) * lastIncrement;
  }

  /**
   * Auction a single player
   * @param {Object} player - Player to auction
   * @param {Function} userBidCallback - Optional callback for user bidding (team, player, currentPrice) => { action, amount }
   * @param {number} auctionProgress - Progress through auction (0.0 to 1.0)
   * @returns {Promise<Object>} Auction result { player, winner, finalPrice, bidHistory }
   */
  async auctionPlayer(player, userBidCallback = null, auctionProgress = 0) {
    this.currentPlayer = player;
    this.currentBids = [];
    let currentPrice = player.basePrice;
    let lastBidder = null;
    let secondsSinceLastBid = 0;


    // FAST MODE: Find highest bid and randomly award to one of the highest bidders
    if (this.fastMode) {
      // Get all teams willing to bid
      const willingBidders = [];

      for (const team of this.teams) {
        // Skip if squad is full
        if (team.squad.length >= this.config.squadSize.max) {
          continue;
        }

        // Check if AI wants to bid
        const aiDecision = this.ai.shouldBid(player, currentPrice, team, auctionProgress);

        if (aiDecision.shouldBid) {
          willingBidders.push({
            team,
            maxBid: aiDecision.maxBid,
            reason: aiDecision.reason
          });
        }
      }

      // If teams are willing to bid
      if (willingBidders.length > 0) {
        // SECOND-PRICE AUCTION: Winner pays 2nd highest bid + increment
        const bids = willingBidders.map(b => ({
          teamId: b.team.id,
          team: b.team,
          amount: this.floorToValidBidAmount(b.maxBid)
        }));

        const result = this.ai.determineWinningBid(bids);

        if (result) {
          lastBidder = result.team;
          currentPrice = result.paidPrice;
        }
      }
    }
    // NORMAL MODE: Bidding loop
    else {
      let biddingActive = true;
      const bidTimer = this.config.timing.bidTimer;

      while (biddingActive) {
      // SIMULTANEOUS BIDDING: All teams make decisions at the same time
      const bidPromises = [];

      for (const team of this.teams) {
        // Skip if squad is full
        if (team.squad.length >= this.config.squadSize.max) {
          continue;
        }

        // Skip if this team is the current highest bidder
        if (lastBidder && team.id === lastBidder.id) {
          continue;
        }

        // User-controlled team
        if (userBidCallback && team.isUserControlled) {
          bidPromises.push(
            userBidCallback(team, player, currentPrice).then(userDecision => ({
              team,
              decision: userDecision,
              timestamp: Date.now()
            }))
          );
        }
        // AI-controlled team
        else {
          bidPromises.push(
            this.getAIBid(team, player, currentPrice, auctionProgress).then(result => ({
              team,
              decision: result.decision,
              timestamp: result.timestamp,
              reason: result.reason
            }))
          );
        }
      }

      // Wait for all teams to make decisions simultaneously
      const results = await Promise.all(bidPromises);

      // Filter only teams that decided to bid
      const bids = results
        .filter(r => r.decision.action === 'bid')
        .map(r => ({
          team: r.team,
          amount: r.decision.amount || this.ai.calculateNextBid(currentPrice),
          timestamp: r.timestamp,
          reason: r.reason
        }));

      // Process bids (first timestamp wins)
      if (bids.length > 0) {
        // Sort by timestamp (earliest wins)
        bids.sort((a, b) => a.timestamp - b.timestamp);
        const winningBid = bids[0];

        // Update price and bidder
        currentPrice = winningBid.amount;
        lastBidder = winningBid.team;
        secondsSinceLastBid = 0;

        // Record bid
        this.currentBids.push({
          teamName: winningBid.team.name,
          amount: winningBid.amount,
          reason: winningBid.reason || ''
        });
      } else {
        // No bids - increment timer
        secondsSinceLastBid += 1;

        if (secondsSinceLastBid >= bidTimer) {
          biddingActive = false;
        } else {
          // Simulate 1 second passing
          await this.sleep(100); // Shortened for demo
        }
      }

      // Check if only one team can still bid (excluding current bidder)
      const eligibleTeams = this.teams.filter(t =>
        t.budgetRemaining > currentPrice &&
        t.squad.length < this.config.squadSize.max &&
        (!lastBidder || t.id !== lastBidder.id) // Exclude current highest bidder
      );

      if (eligibleTeams.length === 0) {
        biddingActive = false;
      }
      }
    } // End of normal mode bidding loop

    // Auction complete
    const result = {
      player,
      winner: lastBidder,
      finalPrice: lastBidder ? currentPrice : 0,
      bidHistory: this.currentBids,
      status: lastBidder ? 'sold' : 'unsold'
    };

    if (lastBidder) {
      // Assign player to winning team
      lastBidder.squad.push(player);
      lastBidder.budgetRemaining -= currentPrice;
      lastBidder.totalSpent += currentPrice;

      player.status = 'sold';
      player.soldTo = lastBidder.id;
      player.soldPrice = currentPrice;

      this.auctionedPlayers.push(result);
    } else {
      // Player unsold
      player.status = 'unsold';

      // Check if this player was already in unsold round (had reduced price)
      if (player.hasBeenInUnsoldRound) {
        // Second time unsold - permanently done
        player.status = 'permanently_unsold';
        this.permanentlyUnsold.push(player);
      } else {
        // First time unsold - can go to unsold round
        this.unsoldPlayers.push(player);
      }
    }

    return result;
  }

  /**
   * Run unsold players round (final chance at reduced base price)
   * @param {Function} userBidCallback - Optional user bid callback
   * @returns {Promise<Array>} Array of auction results
   */
  async runUnsoldRound(userBidCallback = null) {
    if (this.unsoldPlayers.length === 0) {
      return [];
    }

    // Create a snapshot of unsold players (to avoid issues with array modification during iteration)
    const playersForUnsoldRound = [...this.unsoldPlayers];

    // Clear the unsold array (players will be re-added if unsold again, or moved to permanentlyUnsold)
    this.unsoldPlayers = [];

    // Reduce base prices and mark as being in unsold round
    playersForUnsoldRound.forEach(p => {
      p.basePrice = Math.floor(p.basePrice * 0.5);
      p.hasBeenInUnsoldRound = true; // Mark so we know if they go unsold again
    });

    // Shuffle unsold players
    this.shuffleArray(playersForUnsoldRound);

    // Auction each unsold player
    const results = [];
    const totalPlayers = playersForUnsoldRound.length;

    for (let i = 0; i < playersForUnsoldRound.length; i++) {
      const player = playersForUnsoldRound[i];
      // Unsold round is at the end, so progress should be high (0.95+)
      const unsoldProgress = 0.95 + (i / totalPlayers) * 0.05;
      const result = await this.auctionPlayer(player, userBidCallback, unsoldProgress);
      results.push(result);
    }

    return results;
  }

  /**
   * Display squad summary for all teams
   */
  displaySquadSummary() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 SQUAD SUMMARY`);
    console.log(`${'='.repeat(80)}\n`);

    this.teams.forEach(team => {
      const composition = this.getSquadComposition(team.squad);

      console.log(`${team.name}:`);
      console.log(`   Squad Size: ${team.squad.length}/${this.config.squadSize.max}`);
      console.log(`   Composition: ${composition.batsmen}B, ${composition.bowlers}Bw, ${composition.allRounders}AR, ${composition.keepers}WK`);
      console.log(`   Total Spent: ${this.core.formatPrice(team.totalSpent)}`);
      console.log(`   Budget Remaining: ${this.core.formatPrice(team.budgetRemaining)}`);
      console.log();
    });
  }

  /**
   * Get squad composition breakdown
   * @param {Array} squad - Squad players
   * @returns {Object} Composition counts
   */
  getSquadComposition(squad) {
    return {
      batsmen: squad.filter(p => p.role === 'batsman').length,
      bowlers: squad.filter(p => p.role === 'bowler').length,
      allRounders: squad.filter(p => p.role === 'all-rounder').length,
      keepers: squad.filter(p => p.role === 'wicket-keeper').length
    };
  }

  /**
   * Get auction statistics
   * @returns {Object} Auction stats
   */
  getAuctionStats() {
    const totalSpent = this.teams.reduce((sum, t) => sum + t.totalSpent, 0);
    const avgPrice = this.auctionedPlayers.length > 0 ? totalSpent / this.auctionedPlayers.length : 0;

    const highestSale = this.auctionedPlayers.reduce((max, result) =>
      result.finalPrice > max.finalPrice ? result : max,
      { finalPrice: 0 }
    );

    return {
      totalPlayers: this.playerPool.length,
      sold: this.auctionedPlayers.length,
      unsold: this.permanentlyUnsold.length, // Players unsold after unsold round
      totalSpent,
      avgPrice,
      highestSale: highestSale.finalPrice > 0 ? highestSale : null
    };
  }

  /**
   * Get auction spending results for all teams (for finance integration)
   * @returns {Array} Array of {teamId, spending, players}
   */
  getAuctionResults() {
    return this.teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      spending: team.totalSpent,
      budgetRemaining: team.budgetRemaining,
      players: team.squad
    }));
  }

  /**
   * Get auction prices for all sold players (for transfer system)
   * @returns {Object} Map of playerId -> price
   */
  getAuctionPrices() {
    const prices = {};
    this.auctionedPlayers.forEach(result => {
      prices[result.player.id] = result.finalPrice;
    });
    return prices;
  }

  /**
   * Shuffle array in place (Fisher-Yates algorithm)
   * @param {Array} array - Array to shuffle
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Get AI team's bid decision (async to simulate thinking time)
   * @param {Object} team - AI team
   * @param {Object} player - Player being auctioned
   * @param {number} currentPrice - Current bid price
   * @param {number} auctionProgress - Progress through auction (0.0 to 1.0)
   * @returns {Promise<Object>} { decision: { action, amount }, timestamp, reason }
   */
  async getAIBid(team, player, currentPrice, auctionProgress = 0) {
    // Simulate AI thinking delay (all teams think simultaneously)
    await this.sleep(this.ai.getRandomBidDelay());

    const aiDecision = this.ai.shouldBid(player, currentPrice, team, auctionProgress);

    if (aiDecision.shouldBid) {
      return {
        decision: { action: 'bid', amount: this.ai.calculateNextBid(currentPrice) },
        timestamp: Date.now(),
        reason: aiDecision.reason
      };
    } else {
      return {
        decision: { action: 'pass' },
        timestamp: Date.now(),
        reason: aiDecision.reason
      };
    }
  }

  /**
   * Sleep utility for async delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AuctionEngine;
