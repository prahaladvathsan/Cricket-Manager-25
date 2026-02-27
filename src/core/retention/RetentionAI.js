/**
 * @file RetentionAI.js
 * @description AI decision logic for team player retention
 * Uses IPM/VFM metrics from PerformanceValuation and market values from AuctionTransferAI
 */

import AuctionTransferAI from '../ai/AuctionTransferAI.js';
import PerformanceValuation from '../finance/PerformanceValuation.js';
import retentionConfig from '../../data/config/retentionConfig.json';
import { evaluateOffer } from './PlayerAcceptance.js';

export default class RetentionAI {
  constructor() {
    this.auctionAI = new AuctionTransferAI();
    this.perfValuation = new PerformanceValuation();
    this.config = retentionConfig;
  }

  /**
   * Process AI retention decisions for a team
   * @param {Object} team - Team object { id, name, budget }
   * @param {Array} squad - Array of player objects in this team's squad
   * @param {Function} getPlayerStatsFn - Function(playerId) returning player season stats
   * @returns {{ retainedPlayers: Array, releasedPlayers: Array, totalSalary: number }}
   */
  processTeamRetention(team, squad, getPlayerStatsFn) {
    const aiCfg = this.config.ai;
    const tierCaps = this.config.retentionCaps.tiers;
    const maxRetentions = aiCfg.maxRetentions;

    // Step 1: Compute IPM and market value for each player
    const playerData = squad.map(player => {
      const stats = getPlayerStatsFn(player.id);
      const ipm = this.perfValuation.calculateIPM(stats);
      const marketValue = this.getMarketValue(player);
      const primaryRating = this.getPrimaryRating(player);

      return { player, stats, ipm, marketValue, primaryRating };
    });

    // Step 2: Separate elite players (always retain if config says so)
    const elites = [];
    const nonElites = [];

    for (const pd of playerData) {
      if (aiCfg.eliteAlwaysRetain && pd.primaryRating >= aiCfg.eliteMinRating) {
        elites.push(pd);
      } else {
        nonElites.push(pd);
      }
    }

    // Step 3: Sort non-elites by IPM descending
    nonElites.sort((a, b) => b.ipm - a.ipm);

    // Step 4: Greedily retain — elites first, then by IPM
    const candidates = [...elites, ...nonElites];
    const retained = [];
    const released = [];
    let totalSalary = 0;

    for (const pd of candidates) {
      if (retained.length >= maxRetentions) {
        released.push({ playerId: pd.player.id, reason: 'max_retentions_reached' });
        continue;
      }

      // Filter out low-IPM non-elite players
      const isElite = pd.primaryRating >= aiCfg.eliteMinRating;
      if (!isElite && pd.ipm < aiCfg.minIpmThreshold && pd.stats?.matches >= 3) {
        released.push({ playerId: pd.player.id, reason: 'low_ipm' });
        continue;
      }

      // Calculate offered salary
      const offeredSalary = Math.round(pd.marketValue * aiCfg.fairMarketFraction);
      const proposedTotal = totalSalary + offeredSalary;

      // Check tier cap
      const currentCount = retained.length + 1;
      const applicableTier = tierCaps.find(t => currentCount <= t.retentionsUpTo);
      if (!applicableTier || proposedTotal > applicableTier.cumulativeSalaryCap) {
        released.push({ playerId: pd.player.id, reason: 'salary_cap_exceeded' });
        continue;
      }

      // Simulate player acceptance (AI offers fair market fraction)
      const result = evaluateOffer(pd.player, offeredSalary, pd.marketValue, 1);

      if (result.accepted) {
        retained.push({ playerId: pd.player.id, salary: offeredSalary });
        totalSalary += offeredSalary;
      } else if (result.counterOffer) {
        // AI accepts counter-offer if it still fits under cap
        const counterTotal = totalSalary + result.counterOffer;
        if (counterTotal <= applicableTier.cumulativeSalaryCap) {
          retained.push({ playerId: pd.player.id, salary: result.counterOffer });
          totalSalary += result.counterOffer;
        } else {
          released.push({ playerId: pd.player.id, reason: 'counter_too_expensive' });
        }
      } else {
        released.push({ playerId: pd.player.id, reason: 'player_rejected' });
      }
    }

    // Release anyone not retained
    const retainedIds = new Set(retained.map(r => r.playerId));
    for (const pd of playerData) {
      if (!retainedIds.has(pd.player.id) && !released.find(r => r.playerId === pd.player.id)) {
        released.push({ playerId: pd.player.id, reason: 'not_selected' });
      }
    }

    const auctionPurse = Math.max(
      this.config.auctionPurse.minimumRemaining,
      this.config.auctionPurse.base - totalSalary
    );

    return { retainedPlayers: retained, releasedPlayers: released, totalSalary, auctionPurse };
  }

  /**
   * Get estimated market value for a player (simplified — uses base price as proxy)
   * @param {Object} player - Player object
   * @returns {number} Estimated market value
   */
  getMarketValue(player) {
    const basePrice = this.auctionAI.calculateBasePrice(player);
    const primaryRating = this.getPrimaryRating(player);
    // Scale base price by rating to get a market value estimate
    return Math.round(basePrice * (primaryRating / 80));
  }

  /**
   * Get primary rating for a player (consistent with AuctionEngine)
   * @param {Object} player
   * @returns {number}
   */
  getPrimaryRating(player) {
    if (!player.topPlaystyles) return 0;
    switch (player.role) {
      case 'batsman':
        return player.topPlaystyles.batting?.[0]?.rating || 0;
      case 'bowler':
        return player.topPlaystyles.bowling?.[0]?.rating || 0;
      case 'wicket-keeper': {
        const bat = player.topPlaystyles.batting?.[0]?.rating || 0;
        const keep = player.topPlaystyles.fielding?.[0]?.rating || 0;
        return Math.max((bat + keep) / 2, bat);
      }
      case 'all-rounder': {
        const batting = player.topPlaystyles.batting?.[0]?.rating || 0;
        const bowling = player.topPlaystyles.bowling?.[0]?.rating || 0;
        return Math.max(batting, bowling);
      }
      default:
        return 0;
    }
  }
}
