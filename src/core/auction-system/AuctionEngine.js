/**
 * @file AuctionEngine.js
 * @description Main auction orchestration - player categorization, bidding logic, winner determination
 */

import auctionConfig from '../../data/config/auctionConfig.json';
import PlayerValuation from './PlayerValuation.js';
import AuctionAI from './AuctionAI.js';

class AuctionEngine {
  constructor(options = {}) {
    this.config = auctionConfig;
    this.valuation = new PlayerValuation();
    this.ai = new AuctionAI();

    // Auction state
    this.teams = [];
    this.playerPool = [];
    this.auctionedPlayers = [];
    this.unsoldPlayers = [];
    this.permanentlyUnsold = []; // Players unsold twice (done for good)
    this.currentPlayer = null;
    this.currentBids = [];
    this.currentHighestBid = null;

    // Fast mode: no bidding delays, random winner from willing bidders
    this.fastMode = options.fastMode || false;
  }

  /**
   * Get player's primary playstyle rating based on their role
   * @param {Object} player - Player object
   * @returns {number} Primary playstyle rating (0-100)
   */
  getPrimaryPlaystyleRating(player) {
    if (!player.topPlaystyles) return 0;

    // Get the highest rated playstyle based on role
    switch (player.role) {
      case 'batsman':
        return player.topPlaystyles.batting?.[0]?.rating || 0;
      case 'bowler':
        return player.topPlaystyles.bowling?.[0]?.rating || 0;
      case 'wicket-keeper':
        // Wicket-keepers: use fielding if available, otherwise batting
        return player.topPlaystyles.fielding?.[0]?.rating ||
               player.topPlaystyles.batting?.[0]?.rating || 0;
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
   */
  initializeAuction(teams, players) {
    // Initialize teams with auction state
    this.teams = teams.map(team => ({
      ...team,
      squad: [],
      budgetRemaining: this.config.budget.total,
      totalSpent: 0
    }));

    // Filter and prepare player pool
    // Use primary playstyle rating >= 30 (on 0-100 scale) as minimum quality threshold
    this.playerPool = players.filter(p => this.getPrimaryPlaystyleRating(p) >= 30).map(p => ({
      ...p,
      basePrice: this.valuation.calculateBasePrice(p),
      isMarquee: this.valuation.isMarqueePlayer(p),
      status: 'available'
    }));

    console.log(`\n🏏 AUCTION INITIALIZED`);
    console.log(`   Teams: ${this.teams.length}`);
    console.log(`   Player Pool: ${this.playerPool.length}`);
    console.log(`   Budget per team: ${this.valuation.formatPrice(this.config.budget.total)}`);
  }

  /**
   * Categorize players for auction order
   * @returns {Object} Categorized players { marquee, batsmen, bowlers, allRounders, keepers }
   */
  categorizePlayers() {
    const categories = {
      marquee: [],
      batsmen: [],
      bowlers: [],
      allRounders: [],
      keepers: []
    };

    this.playerPool.forEach(player => {
      if (player.isMarquee) {
        categories.marquee.push(player);
      } else {
        switch (player.role) {
          case 'batsman':
            categories.batsmen.push(player);
            break;
          case 'bowler':
            categories.bowlers.push(player);
            break;
          case 'all-rounder':
            categories.allRounders.push(player);
            break;
          case 'wicket-keeper':
            categories.keepers.push(player);
            break;
          default:
            categories.batsmen.push(player); // Fallback
        }
      }
    });

    // Sort each category by primary playstyle rating
    const sortByRating = (a, b) => {
      const ratingA = this.valuation.getPrimaryPlaystyleRating(a);
      const ratingB = this.valuation.getPrimaryPlaystyleRating(b);
      return ratingB - ratingA; // Descending
    };

    categories.marquee.sort(sortByRating);
    categories.batsmen.sort(sortByRating);
    categories.bowlers.sort(sortByRating);
    categories.allRounders.sort((a, b) => {
      // All-rounders: sort by average of top batting and bowling ratings
      const getRating = (player) => {
        const batting = Math.max(...Object.values(player.playstyleRatings?.batting || {}), 0);
        const bowling = Math.max(...Object.values(player.playstyleRatings?.bowling || {}), 0);
        return (batting + bowling) / 2;
      };
      return getRating(b) - getRating(a);
    });
    categories.keepers.sort(sortByRating);

    console.log(`\n📋 PLAYER CATEGORIZATION:`);
    console.log(`   Marquee: ${categories.marquee.length}`);
    console.log(`   Batsmen: ${categories.batsmen.length}`);
    console.log(`   Bowlers: ${categories.bowlers.length}`);
    console.log(`   All-Rounders: ${categories.allRounders.length}`);
    console.log(`   Wicket-Keepers: ${categories.keepers.length}`);

    return categories;
  }

  /**
   * Create auction rounds - INTERLEAVED order (Marquee, then Bat→Bowl→AR→WK cycle)
   * @param {Object} categorizedPlayers - Players organized by category
   * @returns {Array} Array of rounds, each containing array of players
   */
  createAuctionRounds(categorizedPlayers) {
    const { marquee, batsmen, bowlers, allRounders, keepers } = categorizedPlayers;

    // Start with marquee players (auctioned first as a block)
    const orderedPlayers = [...marquee];

    // Interleave remaining roles: Bat1→Bowl1→AR1→WK1→Bat2→Bowl2→AR2→WK2...
    const maxLength = Math.max(batsmen.length, bowlers.length, allRounders.length, keepers.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < batsmen.length) orderedPlayers.push(batsmen[i]);
      if (i < bowlers.length) orderedPlayers.push(bowlers[i]);
      if (i < allRounders.length) orderedPlayers.push(allRounders[i]);
      if (i < keepers.length) orderedPlayers.push(keepers[i]);
    }

    // Split into rounds of playersPerRound
    const rounds = [];
    const playersPerRound = this.config.rounds.playersPerRound;

    for (let i = 0; i < orderedPlayers.length; i += playersPerRound) {
      const roundPlayers = orderedPlayers.slice(i, i + playersPerRound);

      // Shuffle players within this round for variety
      this.shuffleArray(roundPlayers);

      rounds.push(roundPlayers);
    }

    console.log(`\n📅 AUCTION STRUCTURE:`);
    console.log(`   Total Rounds: ${rounds.length}`);
    console.log(`   Order: Marquee block, then Bat→Bowl→AR→WK interleaved`);
    console.log(`   Players per Round: ${playersPerRound} (shuffled within round)`);

    return rounds;
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

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 NOW AUCTIONING: ${player.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   Role: ${player.role}`);
    console.log(`   Primary Rating: ${this.valuation.getPrimaryPlaystyleRating(player).toFixed(1)}`);
    console.log(`   Base Price: ${this.valuation.formatPrice(player.basePrice)}`);
    if (player.isMarquee) {
      console.log(`   ⭐ MARQUEE PLAYER`);
    }
    console.log(`${'─'.repeat(80)}`);

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
        // Find the highest max bid
        let highestBid = Math.max(...willingBidders.map(b => b.maxBid));

        // Floor to valid bid increment
        highestBid = this.floorToValidBidAmount(highestBid);

        // Filter to only teams willing to bid at the highest amount
        const highestBidders = willingBidders.filter(b => b.maxBid >= highestBid);

        // Randomly select from highest bidders
        const randomIndex = Math.floor(Math.random() * highestBidders.length);
        const winner = highestBidders[randomIndex];

        lastBidder = winner.team;
        currentPrice = highestBid;

        console.log(`   💰 ${winner.team.name} wins at ${this.valuation.formatPrice(highestBid)} (${highestBidders.length} teams at max, ${willingBidders.length} total interested)`);
      } else {
        console.log(`   ❌ No bidders`);
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

        console.log(`   💰 ${winningBid.team.name} bids ${this.valuation.formatPrice(winningBid.amount)}`);
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

      console.log(`\n   🏆 SOLD to ${lastBidder.name} for ${this.valuation.formatPrice(currentPrice)}!`);
      console.log(`   💰 ${lastBidder.name} Budget Remaining: ${this.valuation.formatPrice(lastBidder.budgetRemaining)}`);
      console.log(`   📊 Squad Size: ${lastBidder.squad.length}/${this.config.squadSize.max}`);
    } else {
      // Player unsold
      player.status = 'unsold';

      // Check if this player was already in unsold round (had reduced price)
      if (player.hasBeenInUnsoldRound) {
        // Second time unsold - permanently done
        player.status = 'permanently_unsold';
        this.permanentlyUnsold.push(player);
        console.log(`\n   ❌ UNSOLD (2nd time) - Player will not return`);
      } else {
        // First time unsold - can go to unsold round
        this.unsoldPlayers.push(player);
        console.log(`\n   ❌ UNSOLD - Will return in unsold round`);
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
      console.log(`\n✅ No unsold players - auction complete!`);
      return [];
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 UNSOLD PLAYERS ROUND`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   ${this.unsoldPlayers.length} players available`);
    console.log(`   Base prices reduced by 50%\n`);

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
      console.log(`   Total Spent: ${this.valuation.formatPrice(team.totalSpent)}`);
      console.log(`   Budget Remaining: ${this.valuation.formatPrice(team.budgetRemaining)}`);
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
