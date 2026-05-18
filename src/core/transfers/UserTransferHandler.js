/**
 * @file UserTransferHandler.js
 * @description User interaction layer for transfer market
 * Provides user-friendly interface for listing, bidding, and signing players
 * Validates all user actions against budget and squad constraints
 */

import useInboxStore from '../../stores/inboxStore';
import useGameStore from '../../stores/gameStore';
import { getTransferManager } from '../finance/transferManagerSingleton.js';

export default class UserTransferHandler {
  constructor(transferMarket, financeStore, teamStore, transferStore, playerStore) {
    this.transferMarket = transferMarket;
    this.financeStore = financeStore;
    this.teamStore = teamStore;
    this.transferStore = transferStore;
    this.playerStore = playerStore;
    this.inboxStore = useInboxStore;

    // Squad constraints
    this.MIN_SQUAD_SIZE = 11; // Cannot sell below this
    this.MAX_SQUAD_SIZE = 25; // Cannot sign above this (must match auctionConfig.squadSize.max)
    this.MIN_BID_INCREMENT = 10000; // $10K minimum bid increment
  }

  /**
   * Check if transfer window is open — checks both in-memory TransferMarket
   * AND the persisted transferStore. If the store says open but in-memory says
   * closed, syncs the in-memory state (handles the case where Header.jsx
   * hasn't called handleContinue yet but UI store already marked window open).
   * @returns {boolean}
   */
  _isWindowOpen() {
    if (this.transferMarket.windowOpen) return true;

    // Fallback: check store state and sync in-memory if needed
    const storeWindow = this.transferStore.getState().transferWindow;
    if (storeWindow && storeWindow.isOpen) {
      // Open the in-memory window to match store state
      this.transferMarket.windowOpen = true;
      this.transferMarket.currentWindow = {
        type: storeWindow.type || 'offSeason',
        name: storeWindow.name || 'Off-Season Transfer Window',
        startWeek: storeWindow.startWeek,
        endWeek: storeWindow.endWeek,
        duration: storeWindow.daysRemaining || 14,
        enabled: true
      };
      const gameState = useGameStore.getState();
      this.transferMarket.currentWeek = gameState.currentWeek || 0;
      this.transferMarket.listingDurationDays = 14;
      console.log('🔧 UserTransferHandler: Synced in-memory window state from store');
      return true;
    }

    return false;
  }

  /**
   * List a player for sale
   * @param {string} userTeamId - User's team ID
   * @param {string} playerId - Player ID to list
   * @param {number} askingPrice - User's asking price
   * @returns {Object} Result {success, listingId?, error?, message?}
   */
  listPlayerForSale(userTeamId, playerId, askingPrice) {
    // Validate transfer window (checks both in-memory and store state)
    if (!this._isWindowOpen()) {
      return {
        success: false,
        error: 'Transfer window is currently closed'
      };
    }

    // Get team squad
    const squad = this.teamStore.getState().squadLists[userTeamId] || [];

    // Check minimum squad size
    if (squad.length <= this.MIN_SQUAD_SIZE) {
      return {
        success: false,
        error: `Cannot sell - minimum squad size is ${this.MIN_SQUAD_SIZE} players`
      };
    }

    // Check player exists in squad
    if (!squad.includes(playerId)) {
      return {
        success: false,
        error: 'Player not found in your squad'
      };
    }

    // Get player details
    const player = this.playerStore.getState().players[playerId];
    if (!player) {
      return {
        success: false,
        error: 'Player data not found'
      };
    }

    // Validate asking price (minimum $50K)
    if (askingPrice < 50000) {
      return {
        success: false,
        error: 'Asking price must be at least $50K'
      };
    }

    // Get purchase price (for performance calculation)
    const previousPrice = player.purchasePrice || 500000; // Default if unknown
    const performanceMultiplier = 1.0; // Could calculate based on performance

    // List player on market (pass current gameDay for game-day-based expiry)
    const currentGameDay = useGameStore.getState().gameDay;
    const result = this.transferMarket.listPlayer({
      teamId: userTeamId,
      playerId,
      player,
      listingPrice: askingPrice,
      previousPrice,
      performanceMultiplier,
      gameDay: currentGameDay
    });

    if (result.success) {
      // Add to both activeListings (marketplace) and userListings (my listings tab)
      // addUserListing only updates userListings; addListing updates activeListings
      // Without addListing, marketplace doesn't show the listing until the 1-second sync fires
      this.transferStore.getState().addListing(result.listing);
      this.transferStore.getState().addUserListing(result.listing);

      // Send inbox message
      this.inboxStore.getState().addMessage({
        type: 'transfer_listing',
        subject: '📋 Player Listed for Transfer',
        body: `You have successfully listed **${player.name}** for transfer at **$${(askingPrice / 1000).toFixed(0)}K**.\n\nThe listing will expire in 14 days. You will be notified when you receive bids.`,
        sender: 'Transfer Market',
        metadata: {
          playerId,
          listingId: result.listingId,
          askingPrice
        }
      });

      return {
        success: true,
        listingId: result.listingId,
        message: `${player.name} listed successfully for $${(askingPrice / 1000).toFixed(0)}K`
      };
    }

    return result;
  }

  /**
   * Place a bid on a listing
   * @param {string} userTeamId - User's team ID
   * @param {string} listingId - Listing ID
   * @param {number} bidAmount - Bid amount
   * @returns {Object} Result {success, error?, message?}
   */
  placeBid(userTeamId, listingId, bidAmount) {
    // Validate transfer window (checks both in-memory and store state)
    if (!this._isWindowOpen()) {
      return {
        success: false,
        error: 'Transfer window is currently closed'
      };
    }

    // One-shot recovery if in-memory Map is stale (post-reload desync with persisted store)
    let listing = this.transferMarket.getListing(listingId);
    if (!listing) {
      const storeListings = this.transferStore.getState().activeListings || [];
      const storeListing = storeListings.find((l) => l.id === listingId);
      const mapSize = this.transferMarket.listings.size;
      console.warn(`[placeBid] Listing ${listingId} not in Map (size=${mapSize}). Store has ${storeListings.length} listings. Match in store: ${!!storeListing}`);
      if (storeListing) {
        try {
          getTransferManager().restoreFromStore();
          console.log(`[placeBid] After restoreFromStore: Map size=${this.transferMarket.listings.size}`);
        } catch (err) {
          console.error('[placeBid] TransferManager re-restore failed:', err);
        }
        listing = this.transferMarket.getListing(listingId);
      }
      if (!listing) {
        console.error(`[placeBid] Listing ${listingId} still not found after recovery. Store IDs: ${storeListings.map(l => l.id).join(', ')}`);
        return { success: false, error: 'Listing not found' };
      }
      console.log(`[placeBid] Recovery succeeded for listing ${listingId}`);
    }

    // Check if user owns this player
    if (listing.teamId === userTeamId) {
      return {
        success: false,
        error: 'Cannot bid on your own player'
      };
    }

    // Check squad size limit
    const squad = this.teamStore.getState().squadLists[userTeamId] || [];
    console.log(`[placeBid] Squad check: userTeamId=${userTeamId}, squad.length=${squad.length}, MAX=${this.MAX_SQUAD_SIZE}, squadIds=`, squad);
    if (squad.length >= this.MAX_SQUAD_SIZE) {
      return {
        success: false,
        error: `Cannot sign - maximum squad size is ${this.MAX_SQUAD_SIZE} players`
      };
    }

    // Validate budget
    const teamFinances = this.financeStore.getState().getTeamFinances(userTeamId);
    if (!teamFinances) {
      return {
        success: false,
        error: 'Team finances not found'
      };
    }

    // Half-price economics: only half the bid amount is actually deducted
    const validation = this.financeStore.getState().validateBudget(userTeamId, Math.round(bidAmount / 2));
    if (!validation.canAfford) {
      return {
        success: false,
        error: `Insufficient budget - need $${(validation.shortfall / 1000).toFixed(0)}K more`,
        shortfall: validation.shortfall
      };
    }

    // Place bid
    const result = this.transferMarket.placeBid(listingId, userTeamId, bidAmount);

    if (result.success) {
      // Add to user bids in transferStore
      this.transferStore.getState().placeBid({
        id: `bid_${Date.now()}_${listingId}`,
        listingId,
        teamId: userTeamId,
        amount: bidAmount,
        timestamp: new Date().toISOString()
      });

      // Update listing in transferStore
      this.transferStore.getState().updateListing(listingId, {
        currentBid: bidAmount,
        currentBidder: userTeamId
      });

      // Send inbox message
      this.inboxStore.getState().addMessage({
        type: 'transfer_bid',
        subject: '💰 Bid Placed on Player',
        body: `You have placed a bid of **$${(bidAmount / 1000).toFixed(0)}K** on **${listing.player.name}**.\n\nYou will be notified if you are outbid or if your bid is accepted.`,
        sender: 'Transfer Market',
        metadata: {
          playerId: listing.playerId,
          listingId,
          bidAmount
        }
      });

      return {
        success: true,
        message: `Bid placed: $${(bidAmount / 1000).toFixed(0)}K on ${listing.player.name}`
      };
    }

    return result;
  }

  /**
   * Cancel user's listing (before any bids)
   * @param {string} userTeamId - User's team ID
   * @param {string} listingId - Listing ID
   * @returns {Object} Result {success, error?, message?}
   */
  cancelListing(userTeamId, listingId) {
    // Get listing
    const listing = this.transferMarket.getListing(listingId);
    if (!listing) {
      return {
        success: false,
        error: 'Listing not found'
      };
    }

    // Check ownership
    if (listing.teamId !== userTeamId) {
      return {
        success: false,
        error: 'You do not own this listing'
      };
    }

    // Cannot cancel if there are bids
    if (listing.bids.length > 0) {
      return {
        success: false,
        error: 'Cannot cancel listing with active bids'
      };
    }

    // Mark as expired and remove
    listing.status = 'cancelled';
    this.transferMarket.listings.delete(listingId);

    // Remove from transferStore
    this.transferStore.getState().removeListing(listingId);

    // Send inbox message
    this.inboxStore.getState().addMessage({
      type: 'listing_cancelled',
      subject: '🚫 Transfer Listing Cancelled',
      body: `Your transfer listing for **${listing.player.name}** has been cancelled.\n\nThe player remains in your squad.`,
      sender: 'Transfer Market',
      metadata: {
        playerId: listing.playerId,
        listingId
      }
    });

    return {
      success: true,
      message: `Listing cancelled for ${listing.player.name}`
    };
  }

  /**
   * Sign a free agent
   * @param {string} userTeamId - User's team ID
   * @param {string} playerId - Player ID
   * @param {number} signPrice - Signing price
   * @returns {Object} Result {success, error?, message?}
   */
  signFreeAgent(userTeamId, playerId, askingPrice) {
    // Check squad size limit
    const squad = this.teamStore.getState().squadLists[userTeamId] || [];
    if (squad.length >= this.MAX_SQUAD_SIZE) {
      return {
        success: false,
        error: `Cannot sign - maximum squad size is ${this.MAX_SQUAD_SIZE} players`
      };
    }

    // Get player details
    const player = this.playerStore.getState().players[playerId];
    if (!player) {
      return {
        success: false,
        error: 'Player not found'
      };
    }

    // Check if player is actually a free agent
    const freeAgents = this.transferStore.getState().freeAgents;
    if (!freeAgents.some(fa => fa.id === playerId)) {
      return {
        success: false,
        error: 'Player is not a free agent'
      };
    }

    // Half-price economics: signing cost = askingPrice / 2
    // processTransferPurchase handles the halving internally
    const signingCost = Math.round(askingPrice / 2);

    // Validate budget against half-price cost
    const validation = this.financeStore.getState().validateBudget(userTeamId, signingCost);
    if (!validation.canAfford) {
      return {
        success: false,
        error: `Insufficient budget - need $${(validation.shortfall / 1000).toFixed(0)}K more`,
        shortfall: validation.shortfall
      };
    }

    // Process signing through finance system (pass full askingPrice — engine halves it)
    const success = this.financeStore.getState().processTransferPurchase(
      userTeamId,
      null, // No seller for free agents
      player,
      askingPrice
    );

    if (success) {
      // Set player's soldPrice to full asking price (annual salary)
      this.playerStore.getState().setPlayerSoldPrice(playerId, askingPrice);
      // Assign player to team
      this.playerStore.getState().assignPlayerToTeam(playerId, userTeamId);
      this.teamStore.getState().addPlayerToSquad(userTeamId, playerId);

      // Remove from free agents
      this.transferStore.getState().removeFreeAgent(playerId);

      // Record completed transfer
      this.transferStore.getState().addCompletedTransfer({
        playerId,
        playerName: player.name,
        playerRole: player.primaryRole || player.role,
        playerRating: player.rating || null,
        fromTeamId: null,
        toTeamId: userTeamId,
        oldPrice: 0,
        newPrice: askingPrice,
        type: 'free_agency'
      });

      // Send inbox message
      this.inboxStore.getState().addMessage({
        type: 'free_agent_signed',
        subject: '✍️ Free Agent Signed',
        body: `**${player.name}** has been signed as a free agent for **$${(signingCost / 1000).toFixed(0)}K** (half-year salary of $${(askingPrice / 1000).toFixed(0)}K).\n\nThe player has been added to your squad.`,
        sender: 'Transfer Market',
        metadata: {
          playerId,
          askingPrice,
          signingCost
        }
      });

      return {
        success: true,
        message: `${player.name} signed for $${(signingCost / 1000).toFixed(0)}K`
      };
    }

    return {
      success: false,
      error: 'Failed to process signing'
    };
  }

  /**
   * Release a player from the user's squad (adds to free agency)
   * @param {string} userTeamId - User's team ID
   * @param {string} playerId - Player ID to release
   * @returns {Object} Result {success, error?, message?}
   */
  releasePlayer(userTeamId, playerId) {
    // Get team squad
    const squad = this.teamStore.getState().squadLists[userTeamId] || [];

    // Check minimum squad size
    if (squad.length <= this.MIN_SQUAD_SIZE) {
      return {
        success: false,
        error: `Cannot release - minimum squad size is ${this.MIN_SQUAD_SIZE} players`
      };
    }

    // Check player exists in squad
    if (!squad.includes(playerId)) {
      return {
        success: false,
        error: 'Player not found in your squad'
      };
    }

    // Check player is not currently listed
    const userListings = this.getUserListings(userTeamId);
    if (userListings.some(l => l.playerId === playerId)) {
      return {
        success: false,
        error: 'Cannot release a player with an active listing. Cancel the listing first.'
      };
    }

    // Get player details
    const player = this.playerStore.getState().players[playerId];
    if (!player) {
      return {
        success: false,
        error: 'Player data not found'
      };
    }

    // Process financial recoup (30% of half-year salary)
    this.financeStore.getState().processPlayerRelease(userTeamId, player);

    const squadBefore = this.teamStore.getState().squadLists[userTeamId]?.length ?? 0;
    this.playerStore.getState().releasePlayer(playerId);
    this.teamStore.getState().removePlayerFromSquad(userTeamId, playerId);
    const squadAfter = this.teamStore.getState().squadLists[userTeamId]?.length ?? 0;
    console.log(`[releasePlayer] ${player.name} (${playerId}): squad ${squadBefore} -> ${squadAfter}`);

    // Add to free agency
    const askingPrice = player.soldPrice || 200000;
    this.transferStore.getState().addFreeAgent({
      id: player.id,
      name: player.name,
      role: player.role,
      playstyleRatings: player.playstyleRatings,
      topPlaystyles: player.topPlaystyles,
      askingPrice,
      status: 'released'
    });

    // Calculate recoup amount for display
    const recoup = Math.round((player.soldPrice || 0) * 0.5 * 0.3);

    // Record in completed transfers
    this.transferStore.getState().addCompletedTransfer({
      playerId,
      playerName: player.name,
      playerRole: player.primaryRole || player.role,
      fromTeamId: userTeamId,
      toTeamId: null,
      oldPrice: player.soldPrice || 0,
      newPrice: recoup,
      type: 'release'
    });

    // Send inbox message
    this.inboxStore.getState().addMessage({
      type: 'player_released',
      subject: 'Player Released',
      body: `**${player.name}** has been released from your squad.${recoup > 0 ? `\n\nYou recouped **$${(recoup / 1000).toFixed(0)}K** from the release.` : ''}\n\nThe player is now a free agent.`,
      sender: 'Transfer Market',
      metadata: {
        playerId,
        recoup
      }
    });

    return {
      success: true,
      message: `${player.name} released${recoup > 0 ? ` ($${(recoup / 1000).toFixed(0)}K recouped)` : ''}`
    };
  }

  /**
   * Get user's active listings with current bid info
   * @param {string} userTeamId - User's team ID
   * @returns {Array} User's listings
   */
  getUserListings(userTeamId) {
    const allListings = this.transferMarket.getActiveListings();
    return allListings.filter(l => l.teamId === userTeamId);
  }

  /**
   * Get user's active bids
   * @param {string} userTeamId - User's team ID
   * @returns {Array} User's active bids
   */
  getUserBids(userTeamId) {
    const allListings = this.transferMarket.getActiveListings();
    const userBids = [];

    allListings.forEach(listing => {
      const userBid = listing.bids.find(b => b.teamId === userTeamId);
      if (userBid) {
        userBids.push({
          listingId: listing.id,
          player: listing.player,
          bidAmount: userBid.amount,
          currentBid: listing.currentBid,
          isWinning: listing.currentBidder === userTeamId,
          expiresAt: listing.expiresAt
        });
      }
    });

    return userBids;
  }

  /**
   * Calculate recommended bid for a listing
   * @param {string} listingId - Listing ID
   * @returns {Object} {minBid, suggestedBid, maxBid}
   */
  getRecommendedBid(listingId) {
    const listing = this.transferMarket.getListing(listingId);
    if (!listing) {
      return null;
    }

    const minBid = listing.currentBid > 0
      ? listing.currentBid + this.MIN_BID_INCREMENT
      : listing.listingPrice;

    const suggestedBid = minBid + 20000;
    return { minBid, suggestedBid, currentBid: listing.currentBid };
  }

  /**
   * Validate if user can list more players
   * @param {string} userTeamId - User's team ID
   * @returns {Object} {canList, reason?}
   */
  canListMorePlayers(userTeamId) {
    const squad = this.teamStore.getState().squadLists[userTeamId] || [];
    const currentListings = this.getUserListings(userTeamId);

    // Calculate available players to list
    const availableToList = squad.length - currentListings.length;

    if (availableToList <= this.MIN_SQUAD_SIZE) {
      return {
        canList: false,
        reason: `Cannot list more players - would go below minimum squad size of ${this.MIN_SQUAD_SIZE}`
      };
    }

    return {
      canList: true,
      availableToList: availableToList - this.MIN_SQUAD_SIZE
    };
  }

  /**
   * Get transfer market summary for user
   * @param {string} userTeamId - User's team ID
   * @returns {Object} Summary stats
   */
  getUserTransferSummary(userTeamId) {
    const listings = this.getUserListings(userTeamId);
    const bids = this.getUserBids(userTeamId);

    const listingsWithBids = listings.filter(l => l.bids.length > 0);
    const winningBids = bids.filter(b => b.isWinning);

    const potentialRevenue = listingsWithBids.reduce((sum, l) => sum + l.currentBid, 0);
    const potentialCost = winningBids.reduce((sum, b) => sum + b.currentBid, 0);

    return {
      activeListings: listings.length,
      listingsWithBids: listingsWithBids.length,
      activeBids: bids.length,
      winningBids: winningBids.length,
      potentialRevenue,
      potentialCost,
      netPosition: potentialRevenue - potentialCost
    };
  }
}
