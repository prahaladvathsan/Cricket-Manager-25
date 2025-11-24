/**
 * @file UserTransferHandler.js
 * @description User interaction layer for transfer market
 * Provides user-friendly interface for listing, bidding, and signing players
 * Validates all user actions against budget and squad constraints
 */

import useInboxStore from '../../stores/inboxStore';

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
    this.MAX_SQUAD_SIZE = 20; // Cannot sign above this
    this.MIN_BID_INCREMENT = 10000; // $10K minimum bid increment
  }

  /**
   * List a player for sale
   * @param {string} userTeamId - User's team ID
   * @param {string} playerId - Player ID to list
   * @param {number} askingPrice - User's asking price
   * @returns {Object} Result {success, listingId?, error?, message?}
   */
  listPlayerForSale(userTeamId, playerId, askingPrice) {
    // Validate transfer window
    if (!this.transferMarket.windowOpen) {
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

    // List player on market
    const result = this.transferMarket.listPlayer({
      teamId: userTeamId,
      playerId,
      player,
      listingPrice: askingPrice,
      previousPrice,
      performanceMultiplier
    });

    if (result.success) {
      // Add to user listings in transferStore
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
    // Validate transfer window
    if (!this.transferMarket.windowOpen) {
      return {
        success: false,
        error: 'Transfer window is currently closed'
      };
    }

    // Get listing
    const listing = this.transferMarket.getListing(listingId);
    if (!listing) {
      return {
        success: false,
        error: 'Listing not found'
      };
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

    const validation = this.financeStore.getState().validateBudget(userTeamId, bidAmount);
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
   * Accept a bid on user's listing
   * @param {string} userTeamId - User's team ID
   * @param {string} listingId - Listing ID
   * @returns {Object} Result {success, transfer?, error?, message?}
   */
  acceptBid(userTeamId, listingId) {
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

    // Check if there are bids
    if (!listing.currentBidder || listing.bids.length === 0) {
      return {
        success: false,
        error: 'No bids to accept'
      };
    }

    // Complete transfer immediately
    const result = this.transferMarket.completeTransfer(listing);

    if (result.success) {
      // Remove from user listings
      this.transferStore.getState().removeListing(listingId);

      // Send inbox message
      this.inboxStore.getState().addMessage({
        type: 'transfer_completed',
        subject: '✅ Transfer Completed - Player Sold',
        body: `**${listing.player.name}** has been sold to **${result.transfer?.buyerTeam || 'another team'}** for **$${(listing.currentBid / 1000).toFixed(0)}K**.\n\nThe transfer fee has been added to your budget.`,
        sender: 'Transfer Market',
        metadata: {
          playerId: listing.playerId,
          listingId,
          transferFee: listing.currentBid,
          buyerTeamId: listing.currentBidder
        }
      });

      return {
        success: true,
        transfer: result.transfer,
        message: `${listing.player.name} sold for $${(listing.currentBid / 1000).toFixed(0)}K`
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
  signFreeAgent(userTeamId, playerId, signPrice) {
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

    // Validate budget
    const validation = this.financeStore.getState().validateBudget(userTeamId, signPrice);
    if (!validation.canAfford) {
      return {
        success: false,
        error: `Insufficient budget - need $${(validation.shortfall / 1000).toFixed(0)}K more`,
        shortfall: validation.shortfall
      };
    }

    // Process signing through finance system
    const success = this.financeStore.getState().processTransferPurchase(
      userTeamId,
      null, // No seller for free agents
      player,
      signPrice
    );

    if (success) {
      // Remove from free agents
      this.transferStore.getState().removeFreeAgent(playerId);

      // Send inbox message
      this.inboxStore.getState().addMessage({
        type: 'free_agent_signed',
        subject: '✍️ Free Agent Signed',
        body: `**${player.name}** has been signed as a free agent for **$${(signPrice / 1000).toFixed(0)}K**.\n\nThe player has been added to your squad.`,
        sender: 'Transfer Market',
        metadata: {
          playerId,
          signPrice
        }
      });

      return {
        success: true,
        message: `${player.name} signed for $${(signPrice / 1000).toFixed(0)}K`
      };
    }

    return {
      success: false,
      error: 'Failed to process signing'
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

    const suggestedBid = minBid + 20000; // +$20K over minimum
    const maxBid = listing.listingPrice * 1.5; // 150% of listing price

    return {
      minBid,
      suggestedBid,
      maxBid,
      currentBid: listing.currentBid
    };
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
