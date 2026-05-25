/**
 * @file TransferAI.js
 * @description Transfer System V2 - AI transfer decisions
 * Weekly listing cycle: Three-pass model (Composition Surplus → Dead Capital → VFM Failure)
 * Daily bidding cycle: All interested teams bid once per day, highest bid wins
 */

import transferConfig from '../../data/config/transferConfig.json';
import PerformanceValuation from './PerformanceValuation.js';
import AuctionTransferAI from '../ai/AuctionTransferAI.js';
import useGameStore from '../../stores/gameStore.js';

export default class TransferAI {
  constructor(transferMarket, financeStore, teamStore = null, playerStore = null, transferStore = null) {
    this.config = transferConfig;
    this.transferMarket = transferMarket;
    this.financeStore = financeStore;
    this.teamStore = teamStore;
    this.playerStore = playerStore;
    this.transferStore = transferStore;
    this.valuation = new PerformanceValuation();

    // Cached AuctionTransferAI instance for composition checks
    this._auctionAI = null;

    // Track purchase prices for sell decisions (fallback for in-session recordings)
    this.purchasePrices = new Map(); // playerId -> price

    // Candidate queue: overflow candidates waiting to replace expired listings
    // Map<teamId, Array<{player, listingPrice, reason, detail}>>
    this.candidateQueues = new Map();

    // Reference to parent TransferManager (set after construction)
    this._transferManager = null;
  }

  /**
   * Check if AI should skip this team (user team in normal play mode).
   * In sim-to-date mode, AI controls all teams. In normal mode, user team is manual only.
   * @param {string} teamId
   * @returns {boolean} true if AI should skip this team
   */
  _shouldSkipTeam(teamId) {
    const userTeamId = this.teamStore?.getState().userTeamId;
    if (teamId !== userTeamId) return false;
    // Only allow AI to control user team when TransferManager explicitly enables it (sim-to-date)
    return !(this._transferManager?.allowUserTeamAI);
  }

  /**
   * Get or create cached AuctionTransferAI instance
   * @returns {AuctionTransferAI}
   */
  _getAuctionAI() {
    if (!this._auctionAI) {
      this._auctionAI = new AuctionTransferAI();
    }
    return this._auctionAI;
  }

  /**
   * Record a player's purchase price
   * @param {string} playerId - Player ID
   * @param {number} price - Purchase price
   */
  recordPurchasePrice(playerId, price) {
    this.purchasePrices.set(playerId, price);
  }

  /**
   * Get player's purchase price
   * Falls back to player.soldPrice from playerStore (persisted across sessions)
   * @param {string} playerId - Player ID
   * @returns {number} Purchase price or 0
   */
  getPurchasePrice(playerId) {
    const cached = this.purchasePrices.get(playerId);
    if (cached) return cached;

    if (this.playerStore) {
      const player = this.playerStore.getState().players[playerId];
      if (player?.soldPrice) return player.soldPrice;
    }

    return 0;
  }

  // =============================================================================
  // COMPOSITION SURPLUS CHECK
  // =============================================================================

  /**
   * Check if a player is surplus to squad composition needs
   * Uses AuctionTransferAI's composition engine to detect role/playstyle surpluses
   * @param {Object} player - Player to evaluate
   * @param {Array} squad - Full squad
   * @param {Object} listingConfig - aiListingCriteria.compositionSurplus config
   * @returns {boolean} True if player is composition surplus
   */
  /**
   * Rating-quota-based composition surplus detection.
   * Uses AuctionTransferAI's playstyleRatingQuotas to find over-filled categories,
   * then sheds lowest-fitScore players until each category is at/below quota.
   *
   * All-rounders must be flagged in BOTH batting + bowling to be surplus.
   * Keepers must be flagged in BOTH batting + wicketkeeping to be surplus.
   *
   * @param {Array} squad - Full squad
   * @param {Set} alreadyListedIds - Player IDs already listed (excluded)
   * @returns {Array<{player, listingPrice, reason, detail, fitScore}>}
   */
  _getCompositionSurplusCandidates(squad, alreadyListedIds) {
    const auctionAI = this._getAuctionAI();
    const roleProtection = this.config.transferRules.roleProtection;
    const quotas = auctionAI.config.playstyleRatingQuotas;

    // Compute coverage and fitScores for the full squad
    const coverage = auctionAI.analyzePlaystyleCoverage(squad);
    const teamNeeds = auctionAI.analyzeTeamNeeds(squad);

    // Eligible players (exclude already-listed)
    const eligible = squad.filter(p => !alreadyListedIds.has(p.id));

    // Map each eligible player to their primary categories + fitScore
    const playerInfo = new Map();
    const battingGroups = {};  // category → [{player, rating, fitScore}]
    const bowlingGroups = {};  // category → [{player, rating, fitScore}]
    const keepingGroup = [];   // [{player, rating, fitScore}]

    for (const player of eligible) {
      const primaryBatting = auctionAI.getPrimaryBattingPlaystyle(player);
      const fit = auctionAI.evaluatePlayerFit(player, teamNeeds);

      const info = {
        batCategory: primaryBatting.category,
        batRating: primaryBatting.rating,
        bowlCategory: null,
        bowlRating: 0,
        fitScore: fit.fitScore
      };

      // Secondary: keepers → wicketkeeping, others → bowling
      if (player.role === 'wicket-keeper') {
        info.bowlCategory = '_wicketkeeper';
        info.bowlRating = auctionAI.getWicketkeepingRating(player);
        keepingGroup.push({ player, rating: info.bowlRating, fitScore: info.fitScore });
      } else {
        const primaryBowling = auctionAI.getPrimaryBowlingPlaystyle(player, coverage.bowling);
        info.bowlCategory = primaryBowling.category;
        info.bowlRating = primaryBowling.rating;
        if (info.bowlCategory) {
          if (!bowlingGroups[info.bowlCategory]) bowlingGroups[info.bowlCategory] = [];
          bowlingGroups[info.bowlCategory].push({ player, rating: info.bowlRating, fitScore: info.fitScore });
        }
      }

      playerInfo.set(player.id, info);

      if (info.batCategory) {
        if (!battingGroups[info.batCategory]) battingGroups[info.batCategory] = [];
        battingGroups[info.batCategory].push({ player, rating: info.batRating, fitScore: info.fitScore });
      }
    }

    // --- Flag players in over-quota categories (lowest fitScore shed first) ---
    // Use half of auction quotas as surplus ceiling (auction quotas are aspirational targets,
    // half is a reasonable maximum before a category is considered over-stocked)

    const flaggedBatting = new Set();
    for (const [category, group] of Object.entries(battingGroups)) {
      const ceiling = Math.floor((quotas.batting[category] || 0) / 2);
      if (!ceiling) continue;
      let currentRating = coverage.batting[category]?.currentRating || 0;
      if (currentRating <= ceiling) continue;

      // Sort ascending by fitScore — shed least valuable first
      const sorted = [...group].sort((a, b) => a.fitScore - b.fitScore);
      for (const entry of sorted) {
        if (currentRating <= ceiling) break;
        flaggedBatting.add(entry.player.id);
        currentRating -= entry.rating;
      }
    }

    const flaggedBowling = new Set();
    for (const [category, group] of Object.entries(bowlingGroups)) {
      const ceiling = Math.floor((quotas.bowling[category] || 0) / 2);
      if (!ceiling) continue;
      let currentRating = coverage.bowling[category]?.currentRating || 0;
      if (currentRating <= ceiling) continue;

      const sorted = [...group].sort((a, b) => a.fitScore - b.fitScore);
      for (const entry of sorted) {
        if (currentRating <= ceiling) break;
        flaggedBowling.add(entry.player.id);
        currentRating -= entry.rating;
      }
    }

    const flaggedKeeping = new Set();
    const wkCeiling = Math.floor((quotas.fielding?.wicketkeeper || 0) / 2);
    if (wkCeiling && keepingGroup.length > 0) {
      let currentRating = coverage.fielding?.wicketkeeper?.currentRating || 0;
      if (currentRating > wkCeiling) {
        const sorted = [...keepingGroup].sort((a, b) => a.fitScore - b.fitScore);
        for (const entry of sorted) {
          if (currentRating <= wkCeiling) break;
          flaggedKeeping.add(entry.player.id);
          currentRating -= entry.rating;
        }
      }
    }

    // --- Build master surplus list with dual-flag requirement ---

    // Collect every flagged player ID
    const allFlagged = new Set([...flaggedBatting, ...flaggedBowling, ...flaggedKeeping]);

    // Role counts for protection floor
    const roleCounts = { batsman: 0, bowler: 0, 'all-rounder': 0, 'wicket-keeper': 0 };
    squad.forEach(p => { roleCounts[p.role || 'batsman'] = (roleCounts[p.role || 'batsman'] || 0) + 1; });
    const roleMin = {
      'batsman': roleProtection.minimumBatsmen,
      'bowler': roleProtection.minimumBowlers,
      'all-rounder': roleProtection.minimumAllRounders,
      'wicket-keeper': roleProtection.minimumKeepers
    };

    const results = [];

    // Sort flagged by fitScore ascending so we shed least valuable first
    const flaggedSorted = [...allFlagged]
      .map(id => ({ id, info: playerInfo.get(id) }))
      .sort((a, b) => a.info.fitScore - b.info.fitScore);

    for (const { id } of flaggedSorted) {
      const player = squad.find(p => p.id === id);
      if (!player) continue;
      const info = playerInfo.get(id);

      // Role-aware flag requirements:
      // Batsmen:      surplus only if flagged in BATTING (batting is their value)
      // Bowlers:      surplus only if flagged in BOWLING (bowling is their value)
      // All-rounders: surplus only if flagged in BOTH batting AND bowling
      // Keepers:      surplus only if flagged in BOTH batting AND keeping
      if (player.role === 'all-rounder') {
        if (!flaggedBatting.has(id) || !flaggedBowling.has(id)) continue;
      } else if (player.role === 'wicket-keeper') {
        if (!flaggedBatting.has(id) || !flaggedKeeping.has(id)) continue;
      } else if (player.role === 'bowler') {
        if (!flaggedBowling.has(id)) continue;
      } else {
        // batsman — only batting category matters
        if (!flaggedBatting.has(id)) continue;
      }

      // Role protection floor
      if (roleCounts[player.role] <= (roleMin[player.role] || 0)) continue;

      const listingPrice = this.valuation.calculateListingPrice(
        player, null, this.config.aiListingCriteria, 'composition_surplus'
      );

      // Build detail
      let detail;
      if (player.role === 'all-rounder') {
        detail = `Surplus in ${info.batCategory} (bat) + ${info.bowlCategory} (bowl), fit ${info.fitScore.toFixed(1)}`;
      } else if (player.role === 'wicket-keeper') {
        detail = `Surplus in ${info.batCategory} (bat) + wicketkeeper, fit ${info.fitScore.toFixed(1)}`;
      } else if (player.role === 'bowler') {
        detail = `Surplus in ${info.bowlCategory} (bowl), fit ${info.fitScore.toFixed(1)}`;
      } else {
        detail = `Surplus in ${info.batCategory} (bat), fit ${info.fitScore.toFixed(1)}`;
      }

      results.push({ player, listingPrice, reason: 'composition_surplus', detail });
      roleCounts[player.role]--;
    }

    return results;
  }

  // =============================================================================
  // WEEKLY LISTING CYCLE — Three-pass model
  // =============================================================================

  /**
   * Weekly listing cycle - Three-pass evaluation:
   * 1. Composition Surplus (no stats needed)
   * 2. Dead Capital (expensive bench warmers)
   * 3. VFM Failure (overpaid underperformers)
   *
   * @param {Object} team - Team object with squad
   * @param {number} weekNumber - Current week number
   * @returns {Array} Listing results
   */
  async evaluateWeeklyListings(team, weekNumber) {
    if (!this.teamStore || !this.financeStore) {
      return [];
    }

    // Guard: AI never lists user's players in normal play mode
    if (this._shouldSkipTeam(team.id)) {
      return [];
    }

    const squad = team.squad || [];
    if (squad.length === 0) return [];

    const listingConfig = this.config.aiListingCriteria;
    if (!listingConfig) return [];

    // Check effective squad size (squad - active listings must stay >= minimum)
    const minEffectiveSquad = listingConfig.minimumEffectiveSquad || 18;
    const currentTeamListings = this.transferMarket.getTeamListings(team.id)
      .filter(l => l.status === 'active');
    const effectiveSquadSize = squad.length - currentTeamListings.length;
    if (effectiveSquadSize <= minEffectiveSquad) {
      return [];
    }

    // Listing budget: capped by config and effective squad headroom
    const maxPerCycle = listingConfig.maxListingsPerCycle || 5;
    const listingBudget = Math.min(maxPerCycle, effectiveSquadSize - minEffectiveSquad);

    if (listingBudget <= 0) return [];

    // Exclude players already listed
    const alreadyListedIds = new Set(currentTeamListings.map(l => l.playerId));

    // Use shared 3-pass candidate generation
    const candidates = await this._generateListingCandidates(team, alreadyListedIds);

    // List top candidates up to budget, queue the rest
    const toList = candidates.slice(0, listingBudget);
    const overflow = candidates.slice(listingBudget);

    // Store overflow in candidate queue for this team (replaces previous queue)
    if (overflow.length > 0) {
      this.candidateQueues.set(team.id, overflow);
    } else {
      this.candidateQueues.delete(team.id);
    }

    // Submit listings
    const listings = [];
    const currentGameDay = useGameStore.getState().gameDay;

    for (const candidate of toList) {
      const result = this.transferMarket.listPlayer({
        teamId: team.id,
        playerId: candidate.player.id,
        player: candidate.player,
        listingPrice: candidate.listingPrice,
        previousPrice: this.valuation.getActualPrice(candidate.player),
        gameDay: currentGameDay,
        reason: candidate.reason
      });

      if (result.success) {
        listings.push({
          player: candidate.player.name,
          listingPrice: candidate.listingPrice,
          reason: candidate.reason,
          detail: candidate.detail
        });
      }
    }

    return listings;
  }

  // =============================================================================
  // DAILY LISTING — Single player per team per day (replaces weekly bulk)
  // =============================================================================

  /**
   * Daily listing decision — Should team list a player today?
   * 50% probability gate, respects active listing cap, uses candidate queue.
   *
   * @param {Object} team - Team object with squad
   * @returns {Array} Array of listing results (0 or 1 entries)
   */
  async evaluateDailyListing(team) {
    if (!this.teamStore || !this.financeStore) return [];

    // Guard: AI never lists user's players in normal play mode
    if (this._shouldSkipTeam(team.id)) return [];

    // 50% daily probability gate
    if (Math.random() > 0.5) return [];

    const squad = team.squad || [];
    if (squad.length === 0) return [];

    const listingConfig = this.config.aiListingCriteria;
    if (!listingConfig) return [];

    // Check active listings cap (max 5 per team)
    const maxPerCycle = listingConfig.maxListingsPerCycle || 5;
    const currentTeamListings = this.transferMarket.getTeamListings(team.id)
      .filter(l => l.status === 'active');
    if (currentTeamListings.length >= maxPerCycle) return [];

    // Check effective squad size
    const minEffectiveSquad = listingConfig.minimumEffectiveSquad || 18;
    const effectiveSquadSize = squad.length - currentTeamListings.length;
    if (effectiveSquadSize <= minEffectiveSquad) return [];

    // Try candidate queue first
    const queue = this.candidateQueues.get(team.id) || [];
    const alreadyListedIds = new Set(currentTeamListings.map(l => l.playerId));
    const squadIds = new Set(squad.map(p => p.id));

    // Find a valid queued candidate
    let candidate = null;
    const newQueue = [];
    for (const c of queue) {
      if (candidate) {
        newQueue.push(c);
        continue;
      }
      if (alreadyListedIds.has(c.player.id) || !squadIds.has(c.player.id)) continue;
      candidate = c;
    }

    if (newQueue.length > 0) {
      this.candidateQueues.set(team.id, newQueue);
    } else {
      this.candidateQueues.delete(team.id);
    }

    // If no queued candidate, regenerate via 3-pass model (candidates only, don't list yet)
    if (!candidate) {
      const freshCandidates = await this._generateListingCandidates(team, alreadyListedIds);
      if (freshCandidates.length === 0) return [];

      // Take first candidate, queue the rest
      candidate = freshCandidates[0];
      const overflow = freshCandidates.slice(1);
      if (overflow.length > 0) {
        this.candidateQueues.set(team.id, overflow);
      }
    }

    // List the single candidate
    const currentGameDay = useGameStore.getState().gameDay;
    const result = this.transferMarket.listPlayer({
      teamId: team.id,
      playerId: candidate.player.id,
      player: candidate.player,
      listingPrice: candidate.listingPrice,
      previousPrice: this.valuation.getActualPrice(candidate.player),
      gameDay: currentGameDay,
      reason: candidate.reason
    });

    if (result.success) {
      return [{
        player: candidate.player.name,
        listingPrice: candidate.listingPrice,
        reason: candidate.reason,
        detail: candidate.detail
      }];
    }

    return [];
  }

  // =============================================================================
  // CANDIDATE GENERATION — 3-pass model for finding listing candidates
  // =============================================================================

  /**
   * Generate listing candidates using the 3-pass model (composition surplus,
   * dead capital, VFM failure) without actually listing them.
   * @param {Object} team - Team with squad
   * @param {Set} alreadyListedIds - IDs of players already listed
   * @returns {Array} Sorted candidate array
   */
  async _generateListingCandidates(team, alreadyListedIds) {
    const squad = team.squad || [];
    const listingConfig = this.config.aiListingCriteria;
    if (!listingConfig) return [];

    const teamStats = this.teamStore.getState().getTeamStats(team.id);
    const candidates = [];
    const candidateIds = new Set();

    const getPlayerStats = (playerId) => {
      return this.teamStore.getState().getPlayerStats(team.id, playerId);
    };

    // ─── PASS 1: Composition Surplus ───
    if (listingConfig.compositionSurplus?.enabled) {
      const surplusCandidates = this._getCompositionSurplusCandidates(squad, alreadyListedIds);
      for (const candidate of surplusCandidates) {
        candidates.push(candidate);
        candidateIds.add(candidate.player.id);
      }
    }

    // ─── PASS 2: Dead Capital ───
    if (listingConfig.deadCapital?.enabled && teamStats && teamStats.matches >= listingConfig.deadCapital.minimumTeamMatches) {
      for (const player of squad) {
        if (candidateIds.has(player.id) || alreadyListedIds.has(player.id)) continue;
        const playerStats = getPlayerStats(player.id);
        if (this.valuation.isDeadCapital(player, playerStats, teamStats, listingConfig.deadCapital)) {
          const actualPrice = this.valuation.getActualPrice(player);
          const listingPrice = this.valuation.calculateListingPrice(player, null, listingConfig, 'dead_capital');
          const detail = `Expensive bench warmer ($${(actualPrice / 1000).toFixed(0)}K cost, ${playerStats?.matches || 0} matches, listed at $${(listingPrice / 1000).toFixed(0)}K)`;
          candidates.push({ player, listingPrice, reason: 'dead_capital', detail });
          candidateIds.add(player.id);
        }
      }
    }

    // ─── PASS 3: VFM Failure ───
    if (listingConfig.vfmEngine?.enabled && teamStats && teamStats.matches >= listingConfig.vfmEngine.minimumMatches) {
      const minMatches = listingConfig.vfmEngine.minimumMatches;
      const ipmRanked = squad
        .map(p => ({ id: p.id, ipm: this.valuation.calculateIPM(getPlayerStats(p.id)), matches: getPlayerStats(p.id)?.matches || 0 }))
        .filter(p => p.matches >= minMatches)
        .sort((a, b) => b.ipm - a.ipm);
      const top5Ids = new Set(ipmRanked.slice(0, 5).map(p => p.id));

      for (const player of squad) {
        if (candidateIds.has(player.id) || alreadyListedIds.has(player.id)) continue;
        if (top5Ids.has(player.id)) continue;
        const playerStats = getPlayerStats(player.id);
        if (!playerStats || playerStats.matches < minMatches) continue;

        const vfm = this.valuation.calculateVFMScore(
          squad, player, playerStats,
          (pid) => getPlayerStats(pid),
          listingConfig.vfmEngine.minimumMatches
        );

        if (vfm.vfmScore < listingConfig.vfmEngine.vfmThreshold) {
          const listingPrice = this.valuation.calculateListingPrice(player, vfm.justifiedPrice, listingConfig, 'vfm_failure');
          const detail = `VFM ${(vfm.vfmScore * 100).toFixed(0)}% (rank #${vfm.performanceRank}, IPM ${vfm.ipm.toFixed(1)}, cost $${(vfm.actualPrice / 1000).toFixed(0)}K → justified $${(vfm.justifiedPrice / 1000).toFixed(0)}K → listed $${(listingPrice / 1000).toFixed(0)}K)`;
          candidates.push({ player, listingPrice, reason: 'vfm_failure', detail });
          candidateIds.add(player.id);
        }
      }
    }

    // Sort: dead_capital first, then vfm_failure, then composition_surplus
    const priorityOrder = { dead_capital: 0, vfm_failure: 1, composition_surplus: 2 };
    candidates.sort((a, b) => (priorityOrder[a.reason] ?? 9) - (priorityOrder[b.reason] ?? 9));


    return candidates;
  }

  // =============================================================================
  // CANDIDATE QUEUE — Promote queued candidates when listings expire
  // =============================================================================

  /**
   * Promote queued candidates to active listings after expired listings are cleared.
   * Called by TransferManager after processExpiredListings().
   * For each team with a non-empty queue, lists the next candidate(s) if squad headroom allows.
   * @param {number} expiredCount - Number of listings that just expired (for logging)
   * @returns {number} Total promotions made
   */
  promoteFromQueue(expiredCount = 0) {
    // Only promote when listings have expired (1:1 replacement)
    if (this.candidateQueues.size === 0 || expiredCount <= 0) return 0;

    const listingConfig = this.config.aiListingCriteria;
    const minEffectiveSquad = listingConfig?.minimumEffectiveSquad || 18;
    const currentGameDay = useGameStore.getState().gameDay;
    let totalPromoted = 0;

    for (const [teamId, queue] of this.candidateQueues.entries()) {
      if (queue.length === 0 || this._shouldSkipTeam(teamId)) {
        this.candidateQueues.delete(teamId);
        continue;
      }

      // Get current active listings for this team
      const activeListings = this.transferMarket.getTeamListings(teamId)
        .filter(l => l.status === 'active');
      const alreadyListedIds = new Set(activeListings.map(l => l.playerId));

      // Respect per-team listing cap
      const maxPerCycle = listingConfig?.maxListingsPerCycle || 5;
      if (activeListings.length >= maxPerCycle) continue;

      // Get squad size from teamStore
      const squadList = this.teamStore?.getState().squadLists?.[teamId] || [];
      const effectiveSquad = squadList.length - activeListings.length;

      // Only promote 1 per team per day (replacement for expired listing)
      const squadHeadroom = effectiveSquad - minEffectiveSquad;
      const capHeadroom = maxPerCycle - activeListings.length;
      const headroom = Math.min(squadHeadroom, capHeadroom, 1); // Max 1 promotion per team per day
      if (headroom <= 0) continue;

      let promoted = 0;
      const newQueue = [];

      for (const candidate of queue) {
        // Skip if player was already sold or is now listed
        if (alreadyListedIds.has(candidate.player.id)) continue;
        // Check player is still on the squad
        if (!squadList.some(pid => pid === candidate.player.id)) continue;

        if (promoted >= headroom) {
          newQueue.push(candidate); // Keep in queue
          continue;
        }

        const result = this.transferMarket.listPlayer({
          teamId,
          playerId: candidate.player.id,
          player: candidate.player,
          listingPrice: candidate.listingPrice,
          previousPrice: this.valuation.getActualPrice(candidate.player),
          gameDay: currentGameDay
        });

        if (result.success) {
          promoted++;
          totalPromoted++;
        } else {
          newQueue.push(candidate); // Failed to list, keep in queue
        }
      }

      if (newQueue.length > 0) {
        this.candidateQueues.set(teamId, newQueue);
      } else {
        this.candidateQueues.delete(teamId);
      }
    }


    return totalPromoted;
  }

  // =============================================================================
  // DAILY BIDDING — Using AuctionTransferAI for valuation
  // =============================================================================

  /**
   * Calculate how much a team values a listed player.
   * Delegates to AuctionTransferAI's working methods (correct nested playstyleRatings).
   * @param {Object} player - Listed player object (from listing.player)
   * @param {Object} team - Team object with squad
   * @returns {number} Team's valuation of the player in dollars
   */
  calculatePlayerValuation(player, team) {
    const auctionAI = this._getAuctionAI();
    const squad = team.squad || [];
    const teamNeeds = auctionAI.analyzeTeamNeeds(squad);
    // Use fullPlayer for all evaluations — listing stubs lack currentTeam, full playstyleRatings etc.
    const fullPlayer = this.playerStore?.getState().players[player.id] || player;
    const playerFit = auctionAI.evaluatePlayerFit(fullPlayer, teamNeeds);

    const teamFinances = this.financeStore?.getState().getTeamFinances(team.id);
    const annualBudget = teamFinances?.annualBudget || ((teamFinances?.currentBudget || 0) + (teamFinances?.totalExpenses || 0));

    // Use soldPrice as base value (actual game economy price), fall back to auction slab
    const soldPrice = fullPlayer.soldPrice || player.soldPrice || 0;
    const primaryRating = auctionAI.core.getPrimaryPlaystyleRatingScore(fullPlayer);
    const baseValue = soldPrice > 0
      ? (primaryRating / 100) * soldPrice
      : (primaryRating / 100) * auctionAI.calculateBasePrice(player);

    const valCfg = auctionAI.config.valuation;
    const fitValue = playerFit.fitScore * valCfg.fitValueMultiplier;
    const performanceBonus = auctionAI.calculatePerformanceBonus(fullPlayer, squad, this.teamStore);

    // Squad gap urgency
    const minSquad = auctionAI.config.squadSize?.min || 18;
    const squadGap = minSquad - squad.length;
    const squadMultiplier = squadGap > 0 ? valCfg.squadGapMultiplier : 1.0;

    const budgetPenalty = auctionAI.calculateBudgetPenalty(annualBudget, squad.length);

    const valuation = (baseValue + fitValue + performanceBonus) * squadMultiplier * budgetPenalty;
    const finalVal = Math.round(Math.max(0, valuation));

    console.log(`💰 VAL ${(player.name || '?').padEnd(20)} by ${team.id}: soldPrice=$${(soldPrice/1000).toFixed(0)}K rating=${primaryRating} → base=$${(baseValue/1000).toFixed(0)}K + fit=$${(fitValue/1000).toFixed(0)}K (${playerFit.fitScore}) + perf=$${(performanceBonus/1000).toFixed(0)}K × sqMult=${squadMultiplier} × budPen=${budgetPenalty.toFixed(2)} = $${(finalVal/1000).toFixed(0)}K`);

    return finalVal;
  }

  /**
   * Daily bidding decision — Should team bid on a listing this day?
   * Teams bid once per day. Current highest bidder passes (no double-bidding).
   * Bid amount is a function of valuation vs current price.
   *
   * @param {Object} team - Team object with squad
   * @param {Object} listing - Listing object
   * @returns {Object} {shouldBid, bidAmount?, valuation?, reason}
   */
  evaluateDailyBid(team, listing) {
    if (!this.financeStore) {
      return { shouldBid: false, reason: 'No finance store available' };
    }

    // Guard: AI never bids for user team in normal play mode
    if (this._shouldSkipTeam(team.id)) {
      return { shouldBid: false, reason: 'User team — manual only' };
    }

    // Current highest bidder passes — they already hold the top bid
    if (listing.currentBidder === team.id) {
      return { shouldBid: false, reason: 'Already holds current bid' };
    }

    // 50% daily skip probability — teams don't bid every day
    const dailyBidProb = this.config.aiBuyingBehavior?.dailyBidProbability ?? 0.50;
    if (Math.random() > dailyBidProb) {
      return { shouldBid: false, reason: 'Skipped today' };
    }

    // Squad size check — can't buy if at 25 (account for listed players as outgoing)
    const squad = team.squad || [];
    const teamListedCount = this.transferMarket ? this.transferMarket.getTeamListings(team.id).filter(l => l.status === 'active').length : 0;
    const effectiveSquadSize = squad.length - teamListedCount;
    if (effectiveSquadSize >= 25) {
      return { shouldBid: false, reason: 'Squad full (25 players)' };
    }

    const teamFinances = this.financeStore.getState().getTeamFinances(team.id);
    if (!teamFinances) {
      return { shouldBid: false, reason: 'No team finances available' };
    }

    const currentPrice = listing.currentBid > 0 ? listing.currentBid : listing.listingPrice;
    const valuation = this.calculatePlayerValuation(listing.player, team);

    // Must value the player above the current price to bid
    if (valuation <= currentPrice) {
      return {
        shouldBid: false,
        reason: `Valuation ($${(valuation / 1000).toFixed(0)}K) <= current price ($${(currentPrice / 1000).toFixed(0)}K)`
      };
    }

    // Calculate bid amount: bid between current price and valuation
    // Fraction is 10-70% random to create varied bidding behavior
    const surplus = valuation - currentPrice;
    const bidFracMin = this.config.aiBuyingBehavior?.bidFractionMin ?? 0.10;
    const bidFracMax = this.config.aiBuyingBehavior?.bidFractionMax ?? 0.70;
    const fraction = bidFracMin + Math.random() * (bidFracMax - bidFracMin);
    const rawBid = currentPrice + surplus * fraction;

    // Minimum bid is current price + $10K (or listing price if no bids)
    const minBid = listing.currentBid > 0 ? currentPrice + 10000 : listing.listingPrice;
    const bidAmount = Math.max(minBid, Math.round(rawBid / 10000) * 10000);

    // Half-price budget check: only half the bid is actually deducted
    const RESERVE = this.config.aiBuyingBehavior?.reserveAfterBid ?? 100000;
    if (teamFinances.currentBudget < bidAmount / 2 + RESERVE) {
      return { shouldBid: false, reason: 'Insufficient budget (after reserve, half-price)' };
    }

    return {
      shouldBid: true,
      bidAmount,
      valuation,
      reason: `Valued at $${(valuation / 1000).toFixed(0)}K, bidding $${(bidAmount / 1000).toFixed(0)}K`
    };
  }

  // =============================================================================
  // PLAYER RELEASES
  // =============================================================================

  /**
   * Release underperforming/surplus players before transfer window opens (week 22)
   * Called once per off-season for AI teams only.
   * @param {Array} teams - All teams with squad arrays
   * @returns {Array} Released players [{teamId, player, reason}]
   */
  releasePreTransferWindow(teams) {
    const userTeamId = this.teamStore?.getState().userTeamId;
    const releaseRules = this.config.releaseRules || {};
    const squadThreshold = releaseRules.preWindowSquadThreshold || 23;
    const maxReleases = releaseRules.preWindowMaxReleases || 2;
    const unplayedMinPrice = releaseRules.unplayedMinPrice || 200000;
    const minSquadSize = this.config.transferRules?.squadSizeMin || 15;

    const released = [];

    console.group(`🔴 Pre-window release evaluation (${teams.length} teams, threshold >${squadThreshold}, userTeam=${userTeamId})`);

    for (const team of teams) {
      if (team.id === userTeamId) continue;
      const squad = team.squad || [];
      if (squad.length <= squadThreshold) {
        continue;
      }

      console.log(`${team.id}: squad=${squad.length}, evaluating releases...`);

      let releasedCount = 0;
      let currentSquadSize = squad.length;

      // Release 1: Unplayed expensive player (matches === 0 AND soldPrice >= threshold)
      if (releasedCount < maxReleases && currentSquadSize > minSquadSize) {
        const unplayed = squad
          .filter(p => {
            const stats = this.teamStore?.getState().getPlayerStats(team.id, p.id);
            return (!stats || stats.matches === 0) && (p.soldPrice || 0) >= unplayedMinPrice;
          })
          .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));

        console.log(`  R1 unplayed expensive (matches=0, price>=$${unplayedMinPrice/1000}K): ${unplayed.length} candidates`);

        if (unplayed.length > 0) {
          const player = unplayed[0];
          try {
            this._releasePlayer(team.id, player, 'unplayed_expensive');
            released.push({ teamId: team.id, player, reason: 'unplayed_expensive' });
            releasedCount++;
            currentSquadSize--;
            console.log(`  🔴 Released ${player.name} (unplayed, $${((player.soldPrice || 0) / 1000).toFixed(0)}K)`);
          } catch (e) {
            console.error(`  ❌ Failed to release ${player.name}:`, e);
          }
        }
      }

      // Release 2: Worst surplus by fitScore (composition surplus)
      if (releasedCount < maxReleases && currentSquadSize > minSquadSize) {
        const alreadyReleasedIds = new Set(released.filter(r => r.teamId === team.id).map(r => r.player.id));
        const remainingSquad = squad.filter(p => !alreadyReleasedIds.has(p.id));
        const surplusCandidates = this._getCompositionSurplusCandidates(remainingSquad, alreadyReleasedIds);

        console.log(`  R2 composition surplus: ${surplusCandidates.length} candidates`);

        if (surplusCandidates.length > 0) {
          const worst = surplusCandidates[surplusCandidates.length - 1];
          try {
            this._releasePlayer(team.id, worst.player, 'composition_surplus');
            released.push({ teamId: team.id, player: worst.player, reason: 'composition_surplus' });
            releasedCount++;
            console.log(`  🔴 Released ${worst.player.name} (surplus, fit ${worst.fitScore?.toFixed(1) || 'N/A'})`);
          } catch (e) {
            console.error(`  ❌ Failed to release ${worst.player.name}:`, e);
          }
        }
      }

    }

    console.groupEnd();

    if (released.length > 0) {
      console.log(`🔴 Pre-window releases: ${released.length} player(s) released across ${new Set(released.map(r => r.teamId)).size} team(s)`);
    } else {
      console.log(`🔴 Pre-window releases: 0 — no teams above threshold ${squadThreshold}`);
    }

    return released;
  }

  /**
   * Auto-release a player whose listing expired with 0 bids
   * Decision based on listing reason category.
   * @param {Object} listing - The expired listing
   * @param {string} teamId - Team that listed the player
   * @returns {boolean} Whether the player was released
   */
  autoReleaseExpiredListing(listing, teamId) {
    // Guard: AI never auto-releases user team's players in normal play mode
    if (this._shouldSkipTeam(teamId)) return false;

    const reason = listing.reason || 'manual';
    const releaseRules = this.config.releaseRules?.autoReleaseOnExpiry || {};
    const player = listing.player;
    const minSquadSize = this.config.transferRules?.squadSizeMin || 15;

    // Check squad size guard
    const squadIds = this.teamStore?.getState().squadLists?.[teamId] || [];
    if (squadIds.length <= minSquadSize) return false;

    let shouldRelease = false;

    if (reason === 'composition_surplus' && releaseRules.compositionSurplus) {
      const rules = releaseRules.compositionSurplus;
      // Re-check if still surplus
      if (rules.requireStillSurplus) {
        const players = this.playerStore?.getState().players || {};
        const squad = squadIds.map(id => players[id]).filter(Boolean);
        const alreadyListed = new Set();
        const surplusCandidates = this._getCompositionSurplusCandidates(squad, alreadyListed);
        const isStillSurplus = surplusCandidates.some(c => c.player.id === player.id);
        if (!isStillSurplus) return false;
      }
      // Check not in top 11 IPM
      if (rules.requireNotTop11IPM) {
        const teamStats = this.teamStore?.getState();
        const ipmList = squadIds.map(id => {
          const stats = teamStats?.getPlayerStats(teamId, id);
          return { id, ipm: stats && stats.matches > 0 ? (stats.totalImpact || 0) / stats.matches : 0 };
        }).sort((a, b) => b.ipm - a.ipm);
        const top11Ids = new Set(ipmList.slice(0, 11).map(p => p.id));
        if (top11Ids.has(player.id)) return false;
      }
      shouldRelease = true;
    } else if (reason === 'dead_capital' && releaseRules.deadCapital) {
      const rules = releaseRules.deadCapital;
      const stats = this.teamStore?.getState().getPlayerStats(teamId, player.id);
      if (rules.requireZeroMatches && (!stats || stats.matches === 0)) {
        if ((player.soldPrice || player.previousPrice || 0) >= (rules.minPrice || 200000)) {
          shouldRelease = true;
        }
      }
    } else if (reason === 'vfm_failure' && releaseRules.vfmFailure) {
      const rules = releaseRules.vfmFailure;
      const playerObj = this.playerStore?.getState().players[player.id];
      if (playerObj) {
        const players = this.playerStore?.getState().players || {};
        const squad = squadIds.map(id => players[id]).filter(Boolean);
        const playerStats = this.teamStore?.getState().getPlayerStats(teamId, player.id);
        if (playerStats && playerStats.matches >= 3) {
          const vfm = this.valuation.calculateVFMScore(
            squad, playerObj, playerStats,
            (pid) => this.teamStore?.getState().getPlayerStats(teamId, pid),
            3
          );
          if (vfm.vfmScore < (rules.maxVfmScore || 0.30)) {
            shouldRelease = true;
          }
        }
      }
    }

    if (shouldRelease) {
      this._releasePlayer(teamId, player, `auto_release_${reason}`);
      console.log(`🔴 Auto-release: ${player.name} from ${teamId} [${reason}]`);
      return true;
    }

    return false;
  }

  /**
   * Internal helper — execute a player release
   * @param {string} teamId - Team ID
   * @param {Object} player - Player object (can be listing.player or full player)
   * @param {string} reason - Release reason for logging
   */
  _releasePlayer(teamId, player, reason) {
    // Get full player object if we only have listing stub
    const fullPlayer = this.playerStore?.getState().players[player.id] || player;

    // Financial recoup
    if (this.financeStore) {
      this.financeStore.getState().processPlayerRelease(teamId, fullPlayer);
    }

    // Remove from team
    if (this.playerStore) {
      this.playerStore.getState().releasePlayer(player.id);
    }
    if (this.teamStore) {
      this.teamStore.getState().removePlayerFromSquad(teamId, player.id);
    }

    // Add to free agency and record as completed transfer
    if (this.transferStore) {
      const auctionAI = this._getAuctionAI();
      const askingPrice = auctionAI.calculateBasePrice(fullPlayer);
      this.transferStore.getState().addFreeAgent({
        id: player.id,
        name: fullPlayer.name || player.name,
        role: fullPlayer.role || player.role,
        playstyleRatings: fullPlayer.playstyleRatings || player.playstyleRatings,
        topPlaystyles: fullPlayer.topPlaystyles || player.topPlaystyles,
        askingPrice,
        status: 'released'
      });

      // Record release in completed transfers
      const releaseRecoup = this.financeStore
        ? Math.round((fullPlayer.soldPrice || 0) * 0.5 * 0.3)
        : 0;
      this.transferStore.getState().addCompletedTransfer({
        playerId: player.id,
        playerName: fullPlayer.name || player.name,
        playerRole: fullPlayer.role || player.role,
        playerRating: fullPlayer.rating || player.rating || null,
        fromTeamId: teamId,
        toTeamId: null,
        oldPrice: fullPlayer.soldPrice || 0,
        newPrice: releaseRecoup,
        type: 'release'
      });
    }
  }

  /**
   * Display team's transfer activity summary
   * @param {string} teamId - Team ID
   * @param {Object} actions - Actions taken {listed, bids}
   */
  displayTransferSummary(teamId, actions) {
    if (actions.listed.length === 0 && actions.bids.length === 0) {
      return;
    }

    const parts = [];
    if (actions.listed.length > 0) parts.push(`${actions.listed.length} listed`);
    if (actions.bids.length > 0) parts.push(`${actions.bids.length} bids`);

    console.groupCollapsed(`📊 ${teamId}: ${parts.join(', ')}`);
    if (actions.listed.length > 0) {
      actions.listed.forEach(item => {
        console.log(`Listed: ${item.player} at $${(item.listingPrice / 1000).toFixed(0)}K [${item.reason}] ${item.detail || ''}`);
      });
    }
    if (actions.bids.length > 0) {
      actions.bids.forEach(item => {
        console.log(`Bid: ${item.player} ($${(item.bidAmount / 1000).toFixed(0)}K)`);
      });
    }
    console.groupEnd();
  }
}
