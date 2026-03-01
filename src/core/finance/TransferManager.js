/**
 * @file TransferManager.js
 * @description Transfer System V2 - Orchestrates weekly listings and daily bidding
 * Manages transfer windows and coordinates AI transfer cycles
 */

import TransferMarket from './TransferMarket.js';
import TransferAI from './TransferAI.js';
import useGameStore from '../../stores/gameStore.js';
import useTransferStore from '../../stores/transferStore.js';
import useInboxStore from '../../stores/inboxStore.js';

export default class TransferManager {
  constructor(financeStore, teamStore = null, playerStore = null) {
    this.financeStore = financeStore;
    this.teamStore = teamStore;
    this.playerStore = playerStore;
    this.transferMarket = new TransferMarket(financeStore, teamStore, playerStore);
    this.transferAI = new TransferAI(this.transferMarket, financeStore, teamStore, playerStore, useTransferStore);
    this.transferAI._transferManager = this;

    this.currentWeek = 0;
    this.lastListingWeek = -1; // Track which week we last ran listings
    this.transferWindowHistory = [];

    // When true, AI can make decisions for all teams including user team (sim-to-date mode).
    // When false (normal play), AI skips user team for listings, bids, and releases.
    this.allowUserTeamAI = false;
  }

  /**
   * Update current week (called by league simulator)
   * @param {number} weekNumber - Current match week
   */
  setCurrentWeek(weekNumber) {
    this.currentWeek = weekNumber;
    this.transferMarket.currentWeek = weekNumber;
  }

  /**
   * Restore in-memory TransferMarket state from persisted transferStore.
   * Called after save load to rebuild the listings Map and window state.
   */
  restoreFromStore() {
    const transferState = useTransferStore.getState();

    // Restore active listings into TransferMarket's in-memory Map
    const activeListings = transferState.activeListings || [];
    this.transferMarket.listings.clear();
    for (const listing of activeListings) {
      if (listing.id) {
        this.transferMarket.listings.set(listing.id, { ...listing });
      }
    }

    // Restore window state
    const windowState = transferState.transferWindow;
    if (windowState && windowState.isOpen) {
      this.transferMarket.windowOpen = true;
      this.transferMarket.currentWindow = {
        type: windowState.type || 'offSeason',
        name: windowState.name || 'Off-Season Transfer Window',
        startWeek: windowState.startWeek,
        endWeek: windowState.endWeek,
        duration: windowState.daysRemaining || 14,
        enabled: true
      };
    }

    // Restore current week from game state
    const gameState = useGameStore.getState();
    this.currentWeek = gameState.currentWeek || 0;
    this.transferMarket.currentWeek = this.currentWeek;

    if (activeListings.length > 0 || windowState?.isOpen) {
      console.log(`🔧 TransferManager restored: ${activeListings.length} listings, window ${windowState?.isOpen ? 'OPEN' : 'CLOSED'}`);
    }
  }

  /**
   * Open transfer window
   * @param {string} windowType - Type of window ('offSeason', 'preAuction', 'emergency')
   * @param {number} listingDurationDays - Duration for listings in days (default 14 for off-season)
   * @returns {boolean} Success status
   */
  openWindow(windowType = 'offSeason', listingDurationDays = 14) {
    const success = this.transferMarket.openTransferWindow(windowType, this.currentWeek, listingDurationDays);

    if (success) {
      this.transferWindowHistory.push({
        type: windowType,
        week: this.currentWeek,
        openedAt: Date.now(),
        listingDuration: listingDurationDays
      });
    }

    return success;
  }

  /**
   * Close current transfer window
   * Force-expires all remaining active listings with normal expiry logic
   */
  closeWindow() {
    // Process naturally expired listings first
    const currentGameDay = useGameStore.getState().gameDay;
    this.transferMarket.processExpiredListings(currentGameDay);

    // Force-expire all remaining active listings (window is closing)
    const remainingListings = this.transferMarket.getActiveListings();
    if (remainingListings.length > 0) {
      console.log(`🔒 Force-expiring ${remainingListings.length} remaining listings on window close`);
      let completed = 0;
      let released = 0;
      for (const listing of remainingListings) {
        if (listing.bids.length > 0) {
          // Has bids — complete the transfer to highest bidder
          const result = this.transferMarket.completeTransfer(listing);
          if (result.success) completed++;
        } else {
          // No bids — auto-release via TransferAI
          if (this.transferAI.autoReleaseExpiredListing(listing, listing.teamId)) {
            released++;
          }
          listing.status = 'expired';
          this.transferMarket.listings.delete(listing.id);
        }
      }
      if (completed > 0 || released > 0) {
        console.log(`   ${completed} transfers completed, ${released} auto-released`);
      }
    }

    // Sync final state before closing
    this.syncToStore();

    this.transferMarket.closeTransferWindow();
  }

  /**
   * Weekly listing phase - All teams list underperforming players
   * Called at start of each week during transfer window (Weeks 10-12)
   * @param {Array} teams - All teams
   * @param {number} weekNumber - Current week number
   * @returns {Object} Summary of listings
   */
  async processWeeklyListings(teams, weekNumber) {
    if (!this.transferMarket.windowOpen) {
      return { totalListings: 0, teamListings: [] };
    }

    console.groupCollapsed(`📤 WEEKLY LISTING PHASE (Week ${weekNumber})`);

    const teamListings = [];
    let totalListings = 0;

    for (const team of teams) {
      const listings = await this.transferAI.evaluateWeeklyListings(team, weekNumber);

      if (listings.length > 0) {
        teamListings.push({
          teamId: team.id,
          teamName: team.name,
          listings
        });
        totalListings += listings.length;
      }
    }

    // Identify interested teams for ALL active listings (including user-listed players)
    const activeListings = this.transferMarket.getActiveListings();
    const listingsNeedingInterest = activeListings.filter(
      listing => !listing.interestedTeams || listing.interestedTeams.length === 0
    );

    if (listingsNeedingInterest.length > 0) {
      listingsNeedingInterest.forEach(listing => {
        this.transferMarket.identifyInterestedTeams(
          listing,
          teams,
          (player, team) => this.transferAI.calculatePlayerValuation(player, team)
        );
      });
    }

    console.log(`Listing phase complete: ${totalListings} players listed`);
    console.groupEnd();

    return { totalListings, teamListings };
  }

  /**
   * Daily bidding cycle — All interested teams bid once per day.
   * Each team evaluates each listing and places a single bid if interested.
   * Current highest bidder on a listing passes (no double-bidding).
   * Highest bid at end of day becomes the new current bid.
   *
   * @param {Array} teams - All teams
   * @param {number} dayNumber - Day number
   * @returns {Object} Summary of bidding activity
   */
  async processDailyBidding(teams, dayNumber) {
    if (!this.transferMarket.windowOpen) {
      return { totalBids: 0 };
    }

    const activeListings = this.transferMarket.getActiveListings();

    if (activeListings.length === 0) {
      return { totalBids: 0 };
    }

    let totalBids = 0;
    const timestamp = new Date();
    const bidDetails = [];

    // Process each active listing
    for (const listing of activeListings) {
      if (!listing.interestedTeams || listing.interestedTeams.length === 0) continue;

      // Collect all bids for this listing today
      const dayBids = [];

      for (const teamId of listing.interestedTeams) {
        const team = teams.find(t => t.id === teamId);
        if (!team) continue;

        // Evaluate bid decision (handles double-bid prevention, squad size, valuation)
        const bidDecision = this.transferAI.evaluateDailyBid(team, listing);

        if (bidDecision.shouldBid) {
          dayBids.push({ teamId, bidAmount: bidDecision.bidAmount, valuation: bidDecision.valuation });
        }
      }

      if (dayBids.length === 0) continue;

      // Sort by bid amount descending — highest bid wins the day
      dayBids.sort((a, b) => b.bidAmount - a.bidAmount);

      // Track previous bidder before placing new bid (for outbid notification)
      const previousBidder = listing.currentBidder;
      const previousBid = listing.currentBid;

      // Place the highest bid (the only one that actually gets recorded)
      const topBid = dayBids[0];
      const result = this.transferMarket.placeBid(
        listing.id,
        topBid.teamId,
        topBid.bidAmount,
        timestamp
      );

      if (result.success) {
        totalBids++;
        bidDetails.push({ teamId: topBid.teamId, player: listing.player.name, amount: topBid.bidAmount, valuation: topBid.valuation, competitors: dayBids.length });

        // Notify user if they were outbid
        const userTeamId = this.teamStore?.getState().userTeamId;
        if (previousBidder === userTeamId && topBid.teamId !== userTeamId) {
          useInboxStore.getState().addMessage({
            type: 'transfer_outbid',
            subject: `Outbid on ${listing.player.name}`,
            body: `You have been outbid on **${listing.player.name}**.\n\nYour bid: **$${(previousBid / 1000).toFixed(0)}K**\nNew top bid: **$${(topBid.bidAmount / 1000).toFixed(0)}K**\n\nVisit the Marketplace to place a higher bid.`,
            sender: 'Transfer Market',
            metadata: {
              playerId: listing.playerId,
              listingId: listing.id,
              previousBid,
              newBid: topBid.bidAmount
            }
          });
        }
      }
    }

    return { totalBids, bidDetails };
  }

  /**
   * Process weekly transfer cycle (called at start of each week during window)
   * Combines listing phase + 7 days of bidding + expired listing processing
   * @param {Array} teams - All teams
   * @param {number} weekNumber - Current week number
   * @returns {Object} Summary of all activity
   */
  async processWeeklyTransferCycle(teams, weekNumber) {
    console.groupCollapsed(`🔄 WEEKLY TRANSFER CYCLE - WEEK ${weekNumber}`);

    // Phase 1: Daily listings for each team (7 rounds to simulate a week)
    let totalListings = 0;
    let totalBids = 0;
    for (let day = 0; day < 7; day++) {
      for (const team of teams) {
        const listings = await this.transferAI.evaluateDailyListing(team);
        totalListings += listings.length;
      }

      // Identify interested teams for new listings
      const newListings = this.transferMarket.getActiveListings().filter(
        listing => !listing.interestedTeams || listing.interestedTeams.length === 0
      );
      newListings.forEach(listing => {
        this.transferMarket.identifyInterestedTeams(
          listing,
          teams,
          (player, team) => this.transferAI.calculatePlayerValuation(player, team)
        );
      });

      // Daily bidding
      const biddingSummary = await this.processDailyBidding(teams, day);
      totalBids += biddingSummary.totalBids;
    }
    const listingSummary = { totalListings };

    // Phase 2: Process expired listings
    const expiredSummary = this.transferMarket.processExpiredListings();

    // Phase 2.5: Auto-release expired listings with no bids
    let autoReleased = 0;
    if (expiredSummary.expiredNoBid && expiredSummary.expiredNoBid.length > 0) {
      for (const listing of expiredSummary.expiredNoBid) {
        if (this.transferAI.autoReleaseExpiredListing(listing, listing.teamId)) {
          autoReleased++;
        }
      }
    }

    // Phase 3: Promote queued candidates to replace expired listings
    const promoted = this.transferAI.promoteFromQueue(expiredSummary.expired);

    // Phase 4: Identify interested teams for promoted listings
    if (promoted > 0) {
      const promotedListings = this.transferMarket.getActiveListings().filter(
        listing => !listing.interestedTeams || listing.interestedTeams.length === 0
      );
      promotedListings.forEach(listing => {
        this.transferMarket.identifyInterestedTeams(
          listing,
          teams,
          (player, team) => this.transferAI.calculatePlayerValuation(player, team)
        );
      });
    }

    console.log(`Week ${weekNumber}: ${listingSummary.totalListings} listings, ${totalBids} bids, ${expiredSummary.completed} transfers, ${expiredSummary.expired} expired, ${promoted} promotions`);
    console.groupEnd();

    // Sync in-memory state to persisted store
    this.syncToStore();

    return {
      weekNumber,
      listings: listingSummary,
      totalBids,
      transfers: expiredSummary
    };
  }

  /**
   * Process a single day of transfer activity (called once per game-day advance)
   * - Runs weekly listings only on the first day of each new week
   * - Runs 1 day of bidding (24 hourly auctions)
   * - Processes expired listings using game-day comparison
   * @param {Array} teams - All teams
   * @param {number} weekNumber - Current week number
   * @returns {Object} Summary of activity
   */
  async processDailyTransferCycle(teams, weekNumber) {
    if (!this.transferMarket.windowOpen) {
      return { listings: { totalListings: 0 }, totalBids: 0, transfers: { completed: 0, expired: 0 } };
    }

    const currentGameDay = useGameStore.getState().gameDay;

    // Phase 1: Daily listings — each team has a chance to list one player per day
    let listingSummary = { totalListings: 0, teamListings: [] };
    let totalNewListings = 0;

    for (const team of teams) {
      const listings = await this.transferAI.evaluateDailyListing(team);
      if (listings.length > 0) {
        listingSummary.teamListings.push({ teamId: team.id, listings });
        totalNewListings += listings.length;
      }
    }
    listingSummary.totalListings = totalNewListings;

    // Identify interested teams for any new listings (including user-listed players)
    const activeListings = this.transferMarket.getActiveListings();
    const listingsNeedingInterest = activeListings.filter(
      listing => !listing.interestedTeams || listing.interestedTeams.length === 0
    );
    if (listingsNeedingInterest.length > 0) {
      listingsNeedingInterest.forEach(listing => {
        this.transferMarket.identifyInterestedTeams(
          listing,
          teams,
          (player, team) => this.transferAI.calculatePlayerValuation(player, team)
        );
      });
    }

    // Phase 2: Daily bidding — all interested teams bid once
    const biddingSummary = await this.processDailyBidding(teams, currentGameDay % 7);

    // Phase 3: Process expired listings using game-day comparison
    // Snapshot completed count to detect new completions
    const prevCompletedCount = this.transferMarket.completedTransfers.length;
    const expiredSummary = this.transferMarket.processExpiredListings(currentGameDay);

    // Send notifications for auto-completed transfers (expired with bids)
    const userTeamId = this.teamStore?.getState().userTeamId;
    if (expiredSummary.completed > 0 && userTeamId) {
      const newTransfers = this.transferMarket.completedTransfers.slice(prevCompletedCount);
      for (const transfer of newTransfers) {
        // Notify seller if it's the user
        if (transfer.fromTeamId === userTeamId) {
          useInboxStore.getState().addMessage({
            type: 'transfer_completed',
            subject: `Transfer Completed - ${transfer.player.name} Sold`,
            body: `**${transfer.player.name}** has been sold for **$${(transfer.transferFee / 1000).toFixed(0)}K**.\n\nThe listing expired and the highest bid was automatically accepted. The transfer fee has been added to your budget.`,
            sender: 'Transfer Market',
            metadata: {
              playerId: transfer.player.id,
              transferFee: transfer.transferFee,
              buyerTeamId: transfer.toTeamId
            }
          });
        }
        // Notify buyer if it's the user
        if (transfer.toTeamId === userTeamId) {
          useInboxStore.getState().addMessage({
            type: 'transfer_acquired',
            subject: `Player Acquired - ${transfer.player.name}`,
            body: `Your bid on **${transfer.player.name}** was successful! The player has been added to your squad for **$${(transfer.transferFee / 1000).toFixed(0)}K** (cost: **$${(Math.round(transfer.transferFee / 2) / 1000).toFixed(0)}K**).`,
            sender: 'Transfer Market',
            metadata: {
              playerId: transfer.player.id,
              transferFee: transfer.transferFee,
              sellerTeamId: transfer.fromTeamId
            }
          });
        }
      }
    }

    // Phase 3.5: Auto-release expired listings with no bids
    let autoReleased = 0;
    if (expiredSummary.expiredNoBid && expiredSummary.expiredNoBid.length > 0) {
      for (const listing of expiredSummary.expiredNoBid) {
        // Notify user if their listing expired with no bids
        if (listing.teamId === userTeamId) {
          useInboxStore.getState().addMessage({
            type: 'listing_expired',
            subject: `Listing Expired - ${listing.player.name}`,
            body: `Your listing for **${listing.player.name}** expired with no bids.\n\nThe player has been released to free agency.`,
            sender: 'Transfer Market',
            metadata: {
              playerId: listing.playerId,
              listingId: listing.id
            }
          });
        }

        if (this.transferAI.autoReleaseExpiredListing(listing, listing.teamId)) {
          autoReleased++;
        }
      }
    }

    // Phase 4: Promote queued candidates to replace expired listings
    const promoted = this.transferAI.promoteFromQueue(expiredSummary.expired);

    // Phase 5: Identify interested teams for any newly promoted listings
    if (promoted > 0) {
      const newListings = this.transferMarket.getActiveListings().filter(
        listing => !listing.interestedTeams || listing.interestedTeams.length === 0
      );
      if (newListings.length > 0) {
        newListings.forEach(listing => {
          this.transferMarket.identifyInterestedTeams(
            listing,
            teams,
            (player, team) => this.transferAI.calculatePlayerValuation(player, team)
          );
        });
      }
    }

    // Condensed day summary with expandable details
    const summaryLine = `📅 Day ${currentGameDay} (Wk ${weekNumber}): ${listingSummary.totalListings} listings, ${biddingSummary.totalBids} bids, ${expiredSummary.completed} transfers, ${autoReleased} releases, ${promoted} promotions`;
    console.groupCollapsed(summaryLine);
    if (listingSummary.teamListings.length > 0) {
      console.log('Listings:', listingSummary.teamListings.map(tl => `${tl.teamId}: ${tl.listings.map(l => `${l.player || l.player?.name || '?'} ($${((l.listingPrice || 0)/1000).toFixed(0)}K)`).join(', ')}`).join(' | '));
    }
    if (biddingSummary.bidDetails && biddingSummary.bidDetails.length > 0) {
      console.log('Bids:', biddingSummary.bidDetails.map(b => `${b.teamId} → ${b.player} $${(b.amount/1000).toFixed(0)}K (val: $${(b.valuation/1000).toFixed(0)}K, ${b.competitors} bidders)`).join(' | '));
    }
    if (expiredSummary.completed > 0) {
      console.log('Transfers completed:', expiredSummary.completed);
    }
    if (autoReleased > 0) {
      console.log('Auto-releases:', autoReleased);
    }
    console.groupEnd();

    // Phase 6: Send inbox bid summary for user's listed players
    this._sendBidSummaryNotification();

    // Phase 7: Sync in-memory TransferMarket state to persisted transferStore
    this.syncToStore();

    return {
      weekNumber,
      listings: listingSummary,
      totalBids: biddingSummary.totalBids,
      transfers: expiredSummary
    };
  }

  /**
   * Sync in-memory TransferMarket state to the persisted transferStore.
   * Ensures UI stays updated regardless of which page the user is viewing.
   */
  syncToStore() {
    const store = useTransferStore.getState();
    const activeListings = this.transferMarket.getActiveListings();
    store.setActiveListings(activeListings);

    // Sync free agents from TransferMarket completed transfers
    // (free agents are already added directly to transferStore by TransferAI._releasePlayer)
  }

  /**
   * Send daily inbox summary of bids on user's listed players
   */
  _sendBidSummaryNotification() {
    const userTeamId = this.teamStore?.getState().userTeamId;
    if (!userTeamId) return;

    const userListings = this.transferMarket.getActiveListings()
      .filter(l => l.teamId === userTeamId && l.bids && l.bids.length > 0);

    if (userListings.length === 0) return;

    const lines = userListings.map(l => {
      const bidCount = l.bids.length;
      const topBid = l.currentBid || 0;
      return `- **${l.player.name}**: ${bidCount} bid${bidCount !== 1 ? 's' : ''}, top bid **$${(topBid / 1000).toFixed(0)}K** (asking $${(l.listingPrice / 1000).toFixed(0)}K)`;
    });

    useInboxStore.getState().addMessage({
      type: 'transfer_bid_summary',
      subject: `Transfer Bids Summary (${userListings.length} player${userListings.length !== 1 ? 's' : ''})`,
      body: `Here's today's bid activity on your listed players:\n\n${lines.join('\n')}`,
      sender: 'Transfer Market',
      metadata: {
        listingCount: userListings.length
      }
    });
  }

  /**
   * Record purchase price for a player (called after auction or transfer)
   * @param {string} playerId - Player ID
   * @param {number} price - Purchase price
   */
  recordPurchasePrice(playerId, price) {
    this.transferAI.recordPurchasePrice(playerId, price);
  }

  /**
   * Record multiple purchase prices (batch operation for auction results)
   * @param {Object} auctionResults - Auction results with player purchases
   */
  recordAuctionPurchases(auctionResults) {
    if (!auctionResults || !auctionResults.teams) return;

    Object.values(auctionResults.teams).forEach(teamResult => {
      if (teamResult.squad) {
        teamResult.squad.forEach(player => {
          if (player.purchasePrice) {
            this.recordPurchasePrice(player.id, player.purchasePrice);
          }
        });
      }
    });

    console.log(`📝 Recorded purchase prices for ${Object.keys(auctionResults.teams).length} teams`);
  }

  /**
   * Get transfer market status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      currentWeek: this.currentWeek,
      windowOpen: this.transferMarket.windowOpen,
      currentWindow: this.transferMarket.currentWindow?.name || 'None',
      activeListings: this.transferMarket.getActiveListings().length,
      completedTransfers: this.transferMarket.completedTransfers.length,
      windowHistory: this.transferWindowHistory
    };
  }

  /**
   * Display current transfer market status
   */
  displayStatus() {
    const status = this.getStatus();

    console.groupCollapsed(`📊 Transfer Market: Wk ${status.currentWeek}, ${status.windowOpen ? 'OPEN' : 'CLOSED'}, ${status.activeListings} listings, ${status.completedTransfers} transfers`);
    console.log(`Window: ${status.windowOpen ? `OPEN (${status.currentWindow})` : 'CLOSED'}`);
    if (status.windowHistory.length > 0) {
      status.windowHistory.forEach(w => console.log(`${w.type} opened at Week ${w.week}`));
    }
    console.groupEnd();
  }

  /**
   * Display active listings
   */
  displayActiveListings() {
    this.transferMarket.displayTransferList();
  }

  /**
   * Display completed transfers
   */
  displayCompletedTransfers() {
    this.transferMarket.displayCompletedTransfers();
  }

  /**
   * Display weekly transfer summary (active + completed)
   */
  displayWeeklyTransferSummary() {
    if (!this.transferMarket.windowOpen) {
      console.log('\n📋 No transfer window currently open\n');
      return;
    }

    console.groupCollapsed(`🔄 WEEKLY TRANSFER SUMMARY (Week ${this.currentWeek})`);
    this.transferMarket.displayTransferList();
    this.transferMarket.displayCompletedTransfers();
    console.groupEnd();
  }

  /**
   * Get all completed transfers
   * @returns {Array} Completed transfers
   */
  getCompletedTransfers() {
    return this.transferMarket.completedTransfers;
  }

  /**
   * Get transfer market summary statistics
   * @returns {Object} Summary stats
   */
  getTransferSummaryStats() {
    const transfers = this.getCompletedTransfers();

    if (transfers.length === 0) {
      return {
        totalTransfers: 0,
        totalValue: 0,
        averageValue: 0,
        highestTransfer: null
      };
    }

    const totalValue = transfers.reduce((sum, t) => sum + t.transferFee, 0);
    const averageValue = totalValue / transfers.length;
    const highestTransfer = transfers.reduce((max, t) =>
      t.transferFee > max.transferFee ? t : max
    );

    return {
      totalTransfers: transfers.length,
      totalValue,
      averageValue,
      highestTransfer
    };
  }
}
