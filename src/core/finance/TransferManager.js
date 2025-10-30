/**
 * @file TransferManager.js
 * @description Transfer System V2 - Orchestrates weekly listings and daily bidding
 * Manages transfer windows and coordinates AI transfer cycles (Weeks 10-12)
 */

import TransferMarket from './TransferMarket.js';
import TransferAI from './TransferAI.js';

export default class TransferManager {
  constructor(financeStore, teamStore = null) {
    this.financeStore = financeStore;
    this.teamStore = teamStore;
    this.transferMarket = new TransferMarket(financeStore, teamStore);
    this.transferAI = new TransferAI(this.transferMarket, financeStore, teamStore);

    this.currentWeek = 0;
    this.transferWindowHistory = [];
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
   * Check if transfer window should open (Week 10)
   * @returns {boolean} True if window should open
   */
  shouldOpenWindow() {
    if (this.currentWeek !== 10) return false;

    // Check if already opened
    const alreadyOpened = this.transferWindowHistory.some(w => w.type === 'midSeason');
    return !alreadyOpened;
  }

  /**
   * Check if transfer window should close (End of Week 12)
   * @returns {boolean} True if window should close
   */
  shouldCloseWindow() {
    if (!this.transferMarket.windowOpen) return false;
    return this.currentWeek > 12; // Close after Week 12
  }

  /**
   * Open transfer window
   * @param {string} windowType - Type of window (default: 'midSeason')
   * @returns {boolean} Success status
   */
  openWindow(windowType = 'midSeason') {
    const success = this.transferMarket.openTransferWindow(windowType, this.currentWeek);

    if (success) {
      this.transferWindowHistory.push({
        type: windowType,
        week: this.currentWeek,
        openedAt: Date.now()
      });
    }

    return success;
  }

  /**
   * Close current transfer window
   */
  closeWindow() {
    // Process any remaining expired listings before closing
    this.transferMarket.processExpiredListings();
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

    console.log('\n' + '═'.repeat(80));
    console.log(`📤 WEEKLY LISTING PHASE (Week ${weekNumber})`);
    console.log('═'.repeat(80));

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

    // Identify interested teams for all new listings
    if (totalListings > 0) {
      console.log(`\n🔍 Identifying interested teams...`);

      const activeListings = this.transferMarket.getActiveListings();
      activeListings.forEach(listing => {
        // Skip listings that already have interested teams identified
        if (listing.interestedTeams && listing.interestedTeams.length > 0) return;

        this.transferMarket.identifyInterestedTeams(
          listing,
          teams,
          (player, team) => {
            const categoryGaps = this.transferAI.getCategoryGaps(team.squad || []);
            const teamFinances = this.financeStore.getState().getTeamFinances(team.id);
            return this.transferAI.valuation.calculatePurchaseValue(
              player,
              team,
              teamFinances,
              categoryGaps
            );
          }
        );
      });
    }

    console.log('═'.repeat(80));
    console.log(`✅ Listing phase complete: ${totalListings} players listed`);
    console.log('═'.repeat(80) + '\n');

    return { totalListings, teamListings };
  }

  /**
   * Daily bidding cycle - Run 24 hourly auctions
   * Called once per day during transfer window
   * @param {Array} teams - All teams
   * @param {number} dayNumber - Day number (0-6 within the week)
   * @returns {Object} Summary of bidding activity
   */
  async processDailyBidding(teams, dayNumber) {
    if (!this.transferMarket.windowOpen) {
      return { totalBids: 0, hourlyBids: [] };
    }

    const activeListings = this.transferMarket.getActiveListings();

    if (activeListings.length === 0) {
      return { totalBids: 0, hourlyBids: [] };
    }

    console.log(`\n⏰ Daily Bidding Cycle (Day ${dayNumber}) - ${activeListings.length} active listings`);

    let totalBids = 0;
    const hourlyBids = [];

    // Run 24 hourly auctions
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = new Date(Date.now() + (hour * 3600000));
      let hourBids = 0;

      // Process each active listing
      for (const listing of activeListings) {
        if (!listing.interestedTeams || listing.interestedTeams.length === 0) continue;

        // Filter teams that haven't bid today
        const eligibleTeams = listing.interestedTeams.filter(teamId => {
          const todaysBids = listing.bids.filter(bid => {
            const bidDate = new Date(bid.timestamp);
            const today = new Date(timestamp);
            return bidDate.toDateString() === today.toDateString() && bid.teamId === teamId;
          });
          return todaysBids.length === 0; // Haven't bid today
        });

        if (eligibleTeams.length === 0) continue;

        // Randomly select one team
        const selectedTeamId = eligibleTeams[Math.floor(Math.random() * eligibleTeams.length)];
        const team = teams.find(t => t.id === selectedTeamId);

        if (!team) continue;

        // Evaluate bid decision
        const bidDecision = this.transferAI.evaluateHourlyBid(team, listing);

        if (bidDecision.shouldBid) {
          const result = this.transferMarket.placeBid(
            listing.id,
            selectedTeamId,
            bidDecision.bidAmount,
            timestamp
          );

          if (result.success) {
            hourBids++;
            totalBids++;
          }
        }
      }

      if (hourBids > 0) {
        hourlyBids.push({ hour, bids: hourBids });
      }
    }

    if (totalBids > 0) {
      console.log(`   💰 ${totalBids} bids placed across 24 hours\n`);
    }

    return { totalBids, hourlyBids };
  }

  /**
   * Process weekly transfer cycle (called at start of each week during window)
   * Combines listing phase + 7 days of bidding + expired listing processing
   * @param {Array} teams - All teams
   * @param {number} weekNumber - Current week number
   * @returns {Object} Summary of all activity
   */
  async processWeeklyTransferCycle(teams, weekNumber) {
    console.log('\n' + '═'.repeat(100));
    console.log(`🔄 WEEKLY TRANSFER CYCLE - WEEK ${weekNumber}`);
    console.log('═'.repeat(100));

    // Phase 1: Weekly listings
    const listingSummary = await this.processWeeklyListings(teams, weekNumber);

    // Phase 2: Daily bidding cycles (7 days)
    let totalBids = 0;
    for (let day = 0; day < 7; day++) {
      const biddingSummary = await this.processDailyBidding(teams, day);
      totalBids += biddingSummary.totalBids;
    }

    // Phase 3: Process expired listings
    const expiredSummary = this.transferMarket.processExpiredListings();

    console.log('\n' + '═'.repeat(100));
    console.log(`📊 WEEK ${weekNumber} TRANSFER SUMMARY`);
    console.log('═'.repeat(100));
    console.log(`   New Listings: ${listingSummary.totalListings}`);
    console.log(`   Total Bids: ${totalBids}`);
    console.log(`   Transfers Completed: ${expiredSummary.completed}`);
    console.log(`   Listings Expired: ${expiredSummary.expired}`);
    console.log('═'.repeat(100) + '\n');

    return {
      weekNumber,
      listings: listingSummary,
      totalBids,
      transfers: expiredSummary
    };
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

    console.log('\n' + '═'.repeat(80));
    console.log('📊 TRANSFER MARKET STATUS');
    console.log('═'.repeat(80));
    console.log(`   Week: ${status.currentWeek}`);
    console.log(`   Window: ${status.windowOpen ? `OPEN (${status.currentWindow})` : 'CLOSED'}`);
    console.log(`   Active Listings: ${status.activeListings}`);
    console.log(`   Completed Transfers: ${status.completedTransfers}`);

    if (status.windowHistory.length > 0) {
      console.log(`\n   Window History:`);
      status.windowHistory.forEach(w => {
        console.log(`     - ${w.type} opened at Week ${w.week}`);
      });
    }

    console.log('═'.repeat(80) + '\n');
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

    console.log('\n' + '═'.repeat(100));
    console.log(`🔄 WEEKLY TRANSFER SUMMARY (Week ${this.currentWeek})`);
    console.log('═'.repeat(100));

    // Display active listings
    this.transferMarket.displayTransferList();

    // Display completed transfers
    this.transferMarket.displayCompletedTransfers();

    console.log('═'.repeat(100) + '\n');
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
