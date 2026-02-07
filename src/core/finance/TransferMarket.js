/**
 * @file TransferMarket.js
 * @description Transfer System V2 - Weekly bidding with 7-day listings
 * Players listed at internal value, teams bid hourly for 7 days
 */

import transferConfig from '../../data/config/transferConfig.json';
import { getPlayerRating } from '../../utils/ratingHelper.js';

export default class TransferMarket {
  constructor(financeStore = null, teamStore = null, playerStore = null) {
    this.config = transferConfig;
    this.financeStore = financeStore;
    this.teamStore = teamStore;
    this.playerStore = playerStore;

    // Market state
    this.listings = new Map(); // listingId -> listing object
    this.completedTransfers = [];

    // Transfer window state
    this.currentWindow = null;
    this.windowOpen = false;
    this.currentWeek = 0;
    this.listingDurationDays = 7; // Default 7 days, can be 14 for off-season
  }

  /**
   * Open a transfer window
   * @param {string} windowType - Type of window ('preAuction', 'midSeason', 'emergency', 'offSeason')
   * @param {number} currentWeek - Current match week
   * @param {number} listingDurationDays - Duration for listings in days (default: 7)
   */
  openTransferWindow(windowType, currentWeek = 0, listingDurationDays = 7) {
    const window = this.config.transferWindows[windowType];

    if (!window || !window.enabled) {
      console.error(`Transfer window ${windowType} not available or disabled`);
      return false;
    }

    this.currentWindow = {
      type: windowType,
      ...window,
      openedAt: Date.now(),
      listingDurationDays
    };

    this.windowOpen = true;
    this.currentWeek = currentWeek;
    this.listingDurationDays = listingDurationDays;

    console.log(`\n🔓 TRANSFER WINDOW OPENED: ${window.name}`);
    console.log(`   Duration: ${window.duration} days`);
    console.log(`   Listing Duration: ${listingDurationDays} days`);
    console.log(`   Current Week: ${currentWeek}`);
    console.log();

    return true;
  }

  /**
   * Close current transfer window
   */
  closeTransferWindow() {
    if (!this.windowOpen) {
      console.log('No transfer window is currently open');
      return;
    }

    console.log(`\n🔒 TRANSFER WINDOW CLOSED: ${this.currentWindow.name}`);
    console.log(`   Total transfers completed: ${this.completedTransfers.length}`);
    console.log(`   Active listings: ${this.listings.size}`);
    console.log();

    // Clear all active listings
    this.listings.clear();

    this.windowOpen = false;
    this.currentWindow = null;
  }

  /**
   * List a player for transfer (V2 design)
   * @param {Object} params - {teamId, playerId, player, listingPrice, previousPrice, performanceMultiplier}
   * @returns {Object} Result {success, listingId?, listing?, error?}
   */
  listPlayer(params) {
    const {
      teamId,
      playerId,
      player,
      listingPrice,
      previousPrice,
      performanceMultiplier
    } = params;

    // Validate transfer window
    if (!this.windowOpen) {
      return { success: false, error: 'Transfer window is closed' };
    }

    // Create listing with configurable expiry (7 or 14 days)
    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const listedAt = Date.now();
    const durationDays = this.listingDurationDays || 7;
    const expiresAt = listedAt + (durationDays * 24 * 60 * 60 * 1000);

    const listing = {
      id: listingId,
      teamId,
      playerId,
      player: {
        id: player.id,
        name: player.name,
        role: player.role,
        rating: getPlayerRating(player),
        playstyles: player.playstyles || {},
        playstyleRatings: player.playstyleRatings || {}
      },

      // Pricing
      listingPrice,
      previousPrice,
      performanceMultiplier,

      // Bidding state
      currentBid: 0, // No bids yet
      currentBidder: null,
      bids: [],
      interestedTeams: [], // Will be populated after listing

      // Timing
      listedAt,
      expiresAt,
      lastBidAt: null,

      status: 'active'
    };

    this.listings.set(listingId, listing);

    console.log(`📋 Listed ${player.name} from team ${teamId} at $${(listingPrice / 1000).toFixed(0)}K (${(performanceMultiplier * 100).toFixed(0)}% performance)`);

    return {
      success: true,
      listingId,
      listing
    };
  }

  /**
   * Identify teams interested in a listing (valuation > listing price)
   * @param {Object} listing - Listing object
   * @param {Array} allTeams - All teams in league
   * @param {Function} calculateValuation - Function to calculate team's valuation (player, team) => number
   * @returns {Array} Array of interested teamIds
   */
  identifyInterestedTeams(listing, allTeams, calculateValuation) {
    const interestedTeams = [];

    allTeams.forEach(team => {
      // Skip the selling team
      if (team.id === listing.teamId) return;

      // Calculate this team's valuation of the player
      const valuation = calculateValuation(listing.player, team);

      // Interested if valuation > listing price and budget allows
      if (valuation > listing.listingPrice) {
        // Check if team has budget for at least initial bid
        const teamFinances = this.financeStore?.getState().getTeamFinances(team.id);
        if (teamFinances && teamFinances.currentBudget > listing.listingPrice + 500000) {
          interestedTeams.push(team.id);
        }
      }
    });

    // Update listing with interested teams
    listing.interestedTeams = interestedTeams;

    console.log(`   ${interestedTeams.length} teams interested in ${listing.player.name}`);

    return interestedTeams;
  }

  /**
   * Place a bid on a listing
   * @param {string} listingId - Listing ID
   * @param {string} teamId - Bidding team ID
   * @param {number} bidAmount - Bid amount
   * @param {Date} timestamp - Bid timestamp
   * @returns {Object} Result {success, error?}
   */
  placeBid(listingId, teamId, bidAmount, timestamp = new Date()) {
    const listing = this.listings.get(listingId);

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.status !== 'active') {
      return { success: false, error: 'Listing is no longer active' };
    }

    // Check if listing has expired
    if (Date.now() > listing.expiresAt) {
      return { success: false, error: 'Listing has expired' };
    }

    // Cannot bid on own player
    if (listing.teamId === teamId) {
      return { success: false, error: 'Cannot bid on your own player' };
    }

    // Validate bid amount
    const minBid = listing.currentBid > 0 ? listing.currentBid + 10000 : listing.listingPrice;
    const maxJump = listing.currentBid + 50000;

    if (bidAmount < minBid) {
      return { success: false, error: `Bid must be at least $${(minBid / 1000).toFixed(0)}K` };
    }

    if (bidAmount > maxJump) {
      return { success: false, error: `Bid cannot exceed $${(maxJump / 1000).toFixed(0)}K (max jump $50K)` };
    }

    // Validate budget
    if (this.financeStore) {
      const validation = this.financeStore.getState().validateBudget(teamId, bidAmount);
      if (!validation.canAfford) {
        return { success: false, error: 'Insufficient budget', shortfall: validation.shortfall };
      }
    }

    // Place bid
    const bid = {
      teamId,
      amount: bidAmount,
      timestamp: timestamp instanceof Date ? timestamp.toISOString() : timestamp
    };

    listing.bids.push(bid);
    listing.currentBid = bidAmount;
    listing.currentBidder = teamId;
    listing.lastBidAt = bid.timestamp;

    return { success: true };
  }

  /**
   * Process expired listings (complete transfers or remove)
   * @param {Date} currentDate - Current date
   * @returns {Object} {completed: number, expired: number}
   */
  processExpiredListings(currentDate = new Date()) {
    const now = currentDate instanceof Date ? currentDate.getTime() : Date.now();
    let completed = 0;
    let expired = 0;

    const expiredListings = Array.from(this.listings.values())
      .filter(l => l.status === 'active' && now >= l.expiresAt);

    expiredListings.forEach(listing => {
      if (listing.bids.length > 0) {
        // Transfer to highest bidder
        const result = this.completeTransfer(listing);
        if (result.success) {
          completed++;
        }
      } else {
        // No bids, remove listing
        listing.status = 'expired';
        this.listings.delete(listing.id);
        expired++;
      }
    });

    if (completed > 0 || expired > 0) {
      console.log(`\n🔄 Processed expired listings: ${completed} completed, ${expired} removed`);
    }

    return { completed, expired };
  }

  /**
   * Complete a transfer (called when listing expires with bids)
   * @param {Object} listing - Listing object
   * @returns {Object} Result {success, transfer?, error?}
   */
  completeTransfer(listing) {
    if (!listing.currentBidder || listing.bids.length === 0) {
      return { success: false, error: 'No bids on this listing' };
    }

    const winningBid = listing.currentBid;
    const buyerTeamId = listing.currentBidder;

    // Check buyer squad size (must be < 25)
    if (this.teamStore) {
      const buyerSquad = this.teamStore.getState().squadLists[buyerTeamId] || [];
      const MAX_SQUAD_SIZE = 25; // Must match auctionConfig.squadSize.max
      if (buyerSquad.length >= MAX_SQUAD_SIZE) {
        console.warn(`⚠️  Transfer failed: ${buyerTeamId} has reached squad cap (${MAX_SQUAD_SIZE} players)`);
        listing.status = 'expired';
        this.listings.delete(listing.id);
        return { success: false, error: `Buyer has reached maximum squad size (${MAX_SQUAD_SIZE} players)` };
      }
    }

    // Final budget validation
    if (this.financeStore) {
      const validation = this.financeStore.getState().validateBudget(buyerTeamId, winningBid);
      if (!validation.canAfford) {
        console.warn(`⚠️  Transfer failed: ${buyerTeamId} cannot afford $${(winningBid / 1000).toFixed(0)}K`);
        listing.status = 'expired';
        this.listings.delete(listing.id);
        return { success: false, error: 'Buyer budget insufficient' };
      }

      // Process financial transaction
      const transferSuccess = this.financeStore.getState().processTransferPurchase(
        buyerTeamId,
        listing.teamId,
        listing.player,
        winningBid
      );

      if (!transferSuccess) {
        listing.status = 'expired';
        this.listings.delete(listing.id);
        return { success: false, error: 'Financial transaction failed' };
      }
    }

    // Move player between teams
    if (this.playerStore) {
      this.playerStore.getState().assignPlayerToTeam(listing.playerId, buyerTeamId);
      // Update sold price for future transfer valuation
      this.playerStore.getState().setPlayerSoldPrice(listing.playerId, winningBid);
    }
    if (this.teamStore) {
      this.teamStore.getState().removePlayerFromSquad(listing.teamId, listing.playerId);
      this.teamStore.getState().addPlayerToSquad(buyerTeamId, listing.playerId);
      // Recalculate team aggregate stats (preserves player stats for historical viewing)
      this.teamStore.getState().recalculateTeamStats(listing.teamId);
      this.teamStore.getState().recalculateTeamStats(buyerTeamId);
    }

    // Record completed transfer
    const transfer = {
      id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player: listing.player,
      fromTeamId: listing.teamId,
      toTeamId: buyerTeamId,
      transferFee: winningBid,
      listingPrice: listing.listingPrice,
      previousPrice: listing.previousPrice,
      performanceMultiplier: listing.performanceMultiplier,
      totalBids: listing.bids.length,
      completedAt: new Date().toISOString()
    };

    this.completedTransfers.push(transfer);

    // Remove listing
    listing.status = 'sold';
    this.listings.delete(listing.id);

    console.log(`✅ Transfer completed: ${listing.player.name} to ${buyerTeamId} for $${(winningBid / 1000).toFixed(0)}K (${listing.bids.length} bids)`);

    return { success: true, transfer };
  }

  /**
   * Get all active listings
   * @returns {Array} Active listings
   */
  getActiveListings() {
    return Array.from(this.listings.values()).filter(l => l.status === 'active');
  }

  /**
   * Get listing by ID
   * @param {string} listingId - Listing ID
   * @returns {Object|null} Listing or null
   */
  getListing(listingId) {
    return this.listings.get(listingId) || null;
  }

  /**
   * Get listings by team
   * @param {string} teamId - Team ID
   * @returns {Array} Team's listings
   */
  getTeamListings(teamId) {
    return Array.from(this.listings.values()).filter(l => l.teamId === teamId);
  }

  /**
   * Get completed transfers
   * @returns {Array} Completed transfers
   */
  getCompletedTransfers() {
    return this.completedTransfers;
  }

  /**
   * Display transfer list as a table (V2 format with bidding)
   */
  displayTransferList() {
    const activeListings = this.getActiveListings();

    if (activeListings.length === 0) {
      console.log('\n📋 No players currently listed for transfer\n');
      return;
    }

    // Sort by current bid (descending), then listing price
    activeListings.sort((a, b) => {
      const aBid = a.currentBid > 0 ? a.currentBid : a.listingPrice;
      const bBid = b.currentBid > 0 ? b.currentBid : b.listingPrice;
      return bBid - aBid;
    });

    console.log('\n' + '═'.repeat(110));
    console.log('📋 ACTIVE LISTINGS (ordered by current bid)');
    console.log('═'.repeat(110));
    console.log('Player                Rating  Listed By                List Price  Current Bid  Bids  Days Left');
    console.log('─'.repeat(110));

    const now = Date.now();

    activeListings.forEach(listing => {
      const player = listing.player.name.padEnd(20);
      const rating = listing.player.rating.toFixed(1).padStart(6);
      const team = (listing.teamId || 'Unknown').padEnd(20);
      const listPrice = `$${(listing.listingPrice / 1000).toFixed(0)}K`.padStart(11);
      const currentBid = listing.currentBid > 0
        ? `$${(listing.currentBid / 1000).toFixed(0)}K`.padStart(12)
        : '-'.padStart(12);
      const bids = listing.bids.length.toString().padStart(5);
      const daysLeft = Math.max(0, Math.ceil((listing.expiresAt - now) / (24 * 60 * 60 * 1000))).toString().padStart(10);

      console.log(`${player} ${rating}  ${team} ${listPrice}  ${currentBid}  ${bids}  ${daysLeft}`);
    });

    console.log('─'.repeat(110));
    console.log(`Total: ${activeListings.length} active listings\n`);
  }

  /**
   * Display completed transfers as a table (V2 format)
   */
  displayCompletedTransfers() {
    if (this.completedTransfers.length === 0) {
      console.log('\n🔄 No transfers completed yet\n');
      return;
    }

    // Sort by price (descending)
    const sorted = [...this.completedTransfers].sort((a, b) => b.transferFee - a.transferFee);

    console.log('\n' + '═'.repeat(100));
    console.log('🔄 COMPLETED TRANSFERS THIS WEEK (ordered by price)');
    console.log('═'.repeat(100));
    console.log('Player                From                      To                        Price       ');
    console.log('─'.repeat(100));

    sorted.forEach(transfer => {
      const player = transfer.player.name.padEnd(20);
      const from = transfer.fromTeamId.padEnd(25);
      const to = transfer.toTeamId.padEnd(25);
      const price = `$${(transfer.transferFee / 1000).toFixed(0)}K`.padStart(10);

      console.log(`${player} ${from} ${to} ${price}`);
    });

    console.log('─'.repeat(100));
    const totalValue = sorted.reduce((sum, t) => sum + t.transferFee, 0);
    console.log(`Total: ${this.completedTransfers.length} transfers completed, $${(totalValue / 1000000).toFixed(1)}M total value\n`);
  }

  /**
   * Display market summary (V2 format)
   */
  displayMarketSummary() {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 TRANSFER MARKET SUMMARY');
    console.log('═'.repeat(80));

    if (!this.windowOpen) {
      console.log('   Status: CLOSED');
      console.log('═'.repeat(80) + '\n');
      return;
    }

    console.log(`   Status: OPEN (${this.currentWindow.name})`);
    console.log(`   Week: ${this.currentWeek}`);
    console.log(`   Active Listings: ${this.listings.size}`);
    console.log(`   Completed Transfers: ${this.completedTransfers.length}`);

    if (this.completedTransfers.length > 0) {
      const totalValue = this.completedTransfers.reduce((sum, t) => sum + t.transferFee, 0);
      const avgValue = totalValue / this.completedTransfers.length;
      const mostExpensive = this.completedTransfers.reduce((max, t) =>
        t.transferFee > max.transferFee ? t : max
      );

      console.log(`\n   Total Transfer Value: $${(totalValue / 1000000).toFixed(2)}M`);
      console.log(`   Average Transfer: $${(avgValue / 1000).toFixed(0)}K`);
      console.log(`   Most Expensive: ${mostExpensive.player.name} ($${(mostExpensive.transferFee / 1000).toFixed(0)}K)`);
    }

    console.log('═'.repeat(80) + '\n');
  }
}
