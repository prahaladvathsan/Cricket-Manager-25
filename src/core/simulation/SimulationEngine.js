/**
 * @file SimulationEngine.js
 * @description Core engine for simulating game progression to a specific date
 * Replicates exact game flow: auction -> league init -> day-by-day progression
 */

import quickSimMatch from '../match-engine/utils/QuickSimMatch';
import AuctionEngine from '../auction-system/AuctionEngine';
import AuctionTransferAI from '../ai/AuctionTransferAI';
import MatchWeekScheduleGenerator from '../league/MatchWeekScheduleGenerator';
import PlayoffGenerator from '../league/PlayoffGenerator';
import MessageGenerator from '../../utils/MessageGenerator';
import PrizeDistributor from '../offseason/PrizeDistributor';
import { initializeLeague as sharedInitializeLeague } from '../../utils/LeagueInitializer';
import { updateObjectivesAfterMatch, updateTransferObjectives } from '../../utils/ObjectiveTracker';
import aiTacticsManager from '../ai/AITacticsManager';
import SaveGameManager from '../../utils/SaveGameManager';
import { getTransferManager, getHasRunPreReleases, setHasRunPreReleases } from '../finance/transferManagerSingleton';
import { indexedDBStorage } from '../../utils/indexedDBStorage';
import RetentionEngine from '../retention/RetentionEngine';
import RetentionAI from '../retention/RetentionAI';
// Retention state now lives in gameStore + teamStore

/**
 * Simulation Engine for fast-forwarding game state
 * Handles all phases: auction, league initialization, matches
 */
class SimulationEngine {
  constructor({
    gameStore,
    leagueStore,
    teamStore,
    playerStore,
    financeStore,
    transferStore,
    inboxStore,
    auctionStore,
    matchStore,
    userTeamAI = null
  }) {
    this.gameStore = gameStore;
    this.leagueStore = leagueStore;
    this.teamStore = teamStore;
    this.playerStore = playerStore;
    this.financeStore = financeStore;
    this.transferStore = transferStore;
    this.inboxStore = inboxStore;
    this.auctionStore = auctionStore;
    this.matchStore = matchStore;
    this.userTeamAI = userTeamAI;

    // Simulation state
    this.isRunning = false;
    this.shouldStop = false;
    this.onEventCallback = null; // Callback for live event feed
    this.onProgressCallback = null; // Callback for progress updates
    this.currentProgress = {
      startDay: 0,
      targetDay: 0,
      currentDay: 0,
      daysSimulated: 0,
      totalDays: 0,
      eventsProcessed: 0,
      matchesSimulated: 0,
      transfersProcessed: 0
    };

    // Track tab visibility for adaptive yielding
    this.isTabVisible = !document.hidden;
    this.handleVisibilityChange = () => {
      this.isTabVisible = !document.hidden;
      console.log(`📊 Tab visibility changed: ${this.isTabVisible ? 'visible' : 'hidden'}`);
    };

    // Listen for visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Simulate to a specific target date
   * @param {string} targetDate - ISO date string to simulate to
   * @param {Function} onProgress - Progress callback (progress object)
   * @param {Function} onComplete - Completion callback (summary)
   * @param {Function} onError - Error callback (error)
   * @param {Function} onEvent - Event callback for live event feed (event object)
   * @returns {Promise<Object>} Simulation summary
   */
  async simulateToDate(targetDate, onProgress = null, onComplete = null, onError = null, onEvent = null) {
    try {
      // Validate inputs
      const target = new Date(targetDate);
      const current = new Date(this.gameStore.getState().currentDate);

      if (target <= current) {
        throw new Error('Target date must be in the future');
      }

      // Calculate day difference
      const dayDiff = Math.ceil((target - current) / (1000 * 60 * 60 * 24));

      // Initialize simulation
      this.isRunning = true;
      this.shouldStop = false;
      this.onEventCallback = onEvent;
      this.currentProgress = {
        startDay: this.gameStore.getState().gameDay,
        targetDay: this.gameStore.getState().gameDay + dayDiff,
        currentDay: this.gameStore.getState().gameDay,
        daysSimulated: 0,
        totalDays: dayDiff,
        eventsProcessed: 0,
        matchesSimulated: 0,
        transfersProcessed: 0
      };

      console.log(`🎮 Starting simulation: ${dayDiff} days to simulate`);

      // Batch IndexedDB writes to prevent memory leak from queued IDB transactions
      indexedDBStorage.startBatching();

      // Store callbacks for use in sub-operations
      this.onProgressCallback = onProgress;
      this.onEventCallback = onEvent;

      // Yield to allow UI to render overlay before starting
      // Use double yieldToBrowser for reliable initial render
      await this.yieldToBrowser();
      await this.yieldToBrowser();

      // STEP 1: Simulate day by day
      for (let i = 0; i < dayDiff; i++) {
        if (this.shouldStop) {
          console.log('⏸ Simulation stopped by user');
          break;
        }

        // Process current day
        const eventSummary = await this.simulateDay();

        // Update progress
        this.currentProgress.daysSimulated++;
        this.currentProgress.currentDay = this.gameStore.getState().gameDay;
        this.currentProgress.eventsProcessed += eventSummary.eventsProcessed;
        this.currentProgress.matchesSimulated += eventSummary.matchesPlayed;
        this.currentProgress.transfersProcessed += eventSummary.transfersCompleted;

        // Call progress callback
        if (onProgress) {
          // When hidden, only update every 10 days to reduce overhead
          if (this.isTabVisible || this.currentProgress.daysSimulated % 10 === 0) {
            onProgress({ ...this.currentProgress });
          }
        }

        // Yield to browser EVERY day to keep UI responsive
        // This allows React to re-render and the browser to paint
        await this.yieldToBrowser();
      }

      // Flush all buffered IndexedDB writes
      await indexedDBStorage.stopBatching();

      // Simulation complete
      this.isRunning = false;
      const wasStopped = this.shouldStop;

      const summary = {
        daysSimulated: this.currentProgress.daysSimulated,
        eventsProcessed: this.currentProgress.eventsProcessed,
        matchesSimulated: this.currentProgress.matchesSimulated,
        transfersProcessed: this.currentProgress.transfersProcessed,
        finalDate: this.gameStore.getState().currentDate,
        phase: this.gameStore.getState().currentPhase,
        wasStopped
      };

      console.log(wasStopped ? '⏸ Simulation stopped:' : '✅ Simulation complete:', summary);

      if (onComplete) {
        onComplete(summary);
      }

      return summary;

    } catch (error) {
      console.error('❌ Simulation error:', error);
      // Ensure batching is stopped even on error to flush pending writes
      await indexedDBStorage.stopBatching();
      this.isRunning = false;

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }

  /**
   * Run the retention phase (automated — all teams processed by AI)
   */
  async runRetention() {
    console.log('🔄 Running automated retention phase...');
    await this.updateProgressMessage('Running retention phase...');

    const retentionEngine = new RetentionEngine();
    const retentionAIInstance = new RetentionAI();
    const allTeams = Object.values(this.teamStore.getState().teams);
    const allPlayers = this.playerStore.getState().players;
    const allSquadLists = this.teamStore.getState().squadLists;

    // Initialize retention state
    const teamRetentions = retentionEngine.initializeRetentionPhase(allTeams, allSquadLists, allPlayers);

    // Process ALL teams via AI (including user team in sim mode)
    for (const team of allTeams) {
      const squadIds = allSquadLists[team.id] || [];
      const squad = squadIds.map(id => allPlayers[id]).filter(Boolean);
      const getStats = (playerId) => this.teamStore.getState().playerStats?.[team.id]?.[playerId] || null;
      const result = retentionAIInstance.processTeamRetention(team, squad, getStats);
      teamRetentions[team.id] = { ...teamRetentions[team.id], ...result, completed: true };
    }

    // Finalize — update squads and player assignments
    retentionEngine.finalizeRetentions(teamRetentions, {
      playerStore: this.playerStore,
      teamStore: this.teamStore
    });

    // Update stores with retention data
    this.teamStore.getState().setTeamRetentions(teamRetentions);
    this.gameStore.getState().startRetentionPhase();
    this.gameStore.getState().completeRetentionPhase();

    console.log('✅ Retention phase complete');
  }

  /**
   * Run the auction (automated)
   */
  async runAuction() {
    console.log('📋 Running automated auction...');

    // Update progress to show auction starting
    await this.updateProgressMessage('Running auction...');

    const teams = Object.values(this.teamStore.getState().teams);
    const allPlayers = Object.values(this.playerStore.getState().players);
    const userTeamId = this.teamStore.getState().userTeamId;

    // Build retention options if retention phase was completed
    const retentionPhase = this.gameStore.getState().retentionState;
    const teamRetentions = this.teamStore.getState().teamRetentions;
    const auctionOptions = {};
    if (retentionPhase === 'completed' && Object.keys(teamRetentions).length > 0) {
      const teamPurses = {};
      const retainedSquads = {};
      for (const [teamId, ret] of Object.entries(teamRetentions)) {
        teamPurses[teamId] = ret.auctionPurse;
        retainedSquads[teamId] = (ret.retainedPlayers || []).map(r => {
          const p = allPlayers.find ? allPlayers.find(pl => pl.id === r.playerId) : allPlayers[r.playerId];
          return p;
        }).filter(Boolean);
      }
      auctionOptions.teamPurses = teamPurses;
      auctionOptions.retainedSquads = retainedSquads;
    }

    // Initialize auction engine
    const auctionEngine = new AuctionEngine({ fastMode: true });
    auctionEngine.initializeAuction(teams, allPlayers, auctionOptions);

    // Categorize players
    const categorizedPlayers = auctionEngine.categorizePlayers();

    // Create auction rounds
    const rounds = auctionEngine.createAuctionRounds(categorizedPlayers);

    // Initialize auction store with rounds (just player IDs)
    const roundPlayerIds = rounds.map(round => round.map(p => p.id));
    this.auctionStore.getState().initializeAuction(roundPlayerIds);

    // Auction each player in all rounds
    let totalPlayers = 0;
    rounds.forEach(round => totalPlayers += round.length);
    let playerIndex = 0;
    let playersSold = 0;

    for (const round of rounds) {
      for (const player of round) {
        const auctionProgress = playerIndex / totalPlayers;
        const result = await auctionEngine.auctionPlayer(player, null, auctionProgress);

        // Record sale if player was sold
        if (result.status === 'sold' && result.winner) {
          this.auctionStore.getState().recordSale(player.id, result.winner.id, result.finalPrice);
          playersSold++;
        }

        playerIndex++;

        // Update progress and yield every 10 players
        if (playerIndex % 10 === 0) {
          const percent = Math.round((playerIndex / totalPlayers) * 100);
          await this.updateProgressMessage(`Auction: ${playerIndex}/${totalPlayers} players (${percent}%)`, {
            auctionProgress: percent,
            playersSold
          });
        }
      }
    }

    // Run unsold players round
    const unsoldResults = await auctionEngine.runUnsoldRound();

    // Record unsold round sales
    unsoldResults.forEach(result => {
      if (result.status === 'sold' && result.winner) {
        this.auctionStore.getState().recordSale(result.player.id, result.winner.id, result.finalPrice);
      }
    });

    // Update team squads in teamStore
    const newSquadLists = {};
    auctionEngine.teams.forEach(auctionTeam => {
      const playerIds = auctionTeam.squad.map(p => p.id);
      newSquadLists[auctionTeam.id] = playerIds;

      // Also update player team assignments and sold prices
      auctionTeam.squad.forEach(player => {
        this.playerStore.getState().updatePlayer(player.id, { currentTeam: auctionTeam.id });
        // Set the sold price from auction
        if (player.soldPrice) {
          this.playerStore.getState().setPlayerSoldPrice(player.id, player.soldPrice);
        }
      });
    });

    // Update all squad lists at once
    this.teamStore.setState((state) => ({
      squadLists: {
        ...state.squadLists,
        ...newSquadLists
      }
    }));

    // Log squad assignments for debugging
    Object.entries(newSquadLists).forEach(([teamId, playerIds]) => {
      const team = this.teamStore.getState().teams[teamId];
      console.log(`✅ ${team?.shortName || teamId}: ${playerIds.length} players`);
    });

    // Verify user team squad
    const userSquad = this.teamStore.getState().squadLists[userTeamId];
    console.log(`User team (${userTeamId}) squad: ${userSquad?.length || 0} players`);

    // Mark auction as complete
    this.auctionStore.getState().completeAuction();

    // Populate free agency with permanently unsold auction players
    if (auctionEngine.permanentlyUnsold && auctionEngine.permanentlyUnsold.length > 0) {
      const auctionAI = new AuctionTransferAI();
      const freeAgents = auctionEngine.permanentlyUnsold.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        playstyleRatings: p.playstyleRatings,
        topPlaystyles: p.topPlaystyles,
        askingPrice: auctionAI.calculateBasePrice(p),
        currentTeam: null,
        status: 'unsold'
      }));
      this.transferStore.getState().setFreeAgents(freeAgents);
      console.log(`🆓 ${freeAgents.length} permanently unsold players added to free agency`);
    }

    // Emit auction event for live feed
    this.emitEvent('auction', {
      playersSold: totalPlayers,
      totalSpent: auctionEngine.teams.reduce((sum, t) => sum + (t.spent || 0), 0)
    });

    console.log('✅ Auction complete');
  }

  /**
   * Initialize the league after auction
   * Uses shared league initialization logic
   */
  async initializeLeague() {
    // Update progress to show league init
    await this.updateProgressMessage('Initializing league schedule...');

    const currentSeason = this.gameStore.getState().currentSeason;
    const isFirstSeasonInit = currentSeason === 1;

    return sharedInitializeLeague({
      stores: {
        gameStore: this.gameStore,
        teamStore: this.teamStore,
        leagueStore: this.leagueStore,
        financeStore: this.financeStore,
        auctionStore: this.auctionStore,
        inboxStore: this.inboxStore,
        playerStore: this.playerStore
      },
      isFirstSeasonInit
    });
  }

  /**
   * Trigger autosave after auction completes
   * Mirrors the behavior in Transfers.jsx completeAuction
   */
  async autosaveAfterAuction() {
    const userTeamId = this.teamStore.getState().userTeamId;
    const soldPlayers = this.auctionStore.getState().soldPlayers || [];
    const userTeamPlayers = soldPlayers.filter(p => p.teamId === userTeamId);
    const totalSpent = userTeamPlayers.reduce((sum, p) => sum + (p.price || 0), 0);

    try {
      const result = await SaveGameManager.autosaveAfterAuction(
        {
          gameStore: this.gameStore,
          teamStore: this.teamStore,
          playerStore: this.playerStore,
          leagueStore: this.leagueStore,
          financeStore: this.financeStore,
          matchStore: this.matchStore,
          auctionStore: this.auctionStore,
          inboxStore: this.inboxStore,
          transferStore: this.transferStore
        },
        {
          playersAcquired: userTeamPlayers.length,
          budgetSpent: totalSpent
        }
      );

      if (result.success) {
        console.log('💾 Autosave created after auction (sim engine)');
      }
    } catch (error) {
      console.error('Failed to autosave after auction:', error);
    }
  }

  /**
   * Simulate a single day
   * @returns {Object} Day summary {eventsProcessed, matchesPlayed, transfersCompleted}
   */
  async simulateDay() {
    const summary = {
      eventsProcessed: 0,
      matchesPlayed: 0,
      transfersCompleted: 0
    };

    // Check if auction needs to happen for Season 1 ONLY (preseason phase, first day)
    // For Season 2+ transitions, new_season_start event handles everything
    if (this.gameStore.getState().currentPhase === 'preseason' &&
      this.gameStore.getState().gameDay === 1 &&
      this.gameStore.getState().currentSeason === 1) {
      // Season 1 initial auction and league setup
      console.log('📋 Season 1 - Running initial auction...');
      // Yield before auction to ensure UI shows the starting state
      await this.yieldToBrowser();
      await this.runAuction();
      summary.eventsProcessed++;

      console.log('🏏 Season 1 - Initializing league after auction...');
      await this.initializeLeague();
      summary.eventsProcessed++;

      // Autosave after auction completion
      await this.autosaveAfterAuction();
    }

    // Get current day's event
    const event = this.gameStore.getState().getCurrentEvent();

    // Handle retention_start event (pre-auction retention for odd seasons >= 3)
    if (event && event.type === 'retention_start') {
      console.log(`🏏 Retention Start - Season ${event.data.season} (sim mode)`);
      // Inbox message (sim mode — no popup)
      this.inboxStore.getState().addMessage({
        type: 'board',
        subject: '🏏 Retention Phase Begins',
        body: `Season ${event.data.season} is approaching. Before the auction, you can retain key players from your squad at a negotiated salary. Head to the Retention screen to decide who to keep and at what price.`,
        sender: 'Board of Directors',
        metadata: { link: '/game/retention' }
      });
      await this.runRetention();
      summary.eventsProcessed++;
    }

    // Handle new_season_start event (Season transitions)
    if (event && event.type === 'new_season_start') {
      // Guard: Don't start new season if playoffs haven't completed
      const leagueStageCheck = this.leagueStore.getState().stage;
      const championCheck = this.leagueStore.getState().champion;
      if (leagueStageCheck === 'playoffs' && !championCheck) {
        console.warn('⚠️ new_season_start fired but playoffs not complete - skipping');
        return;
      }

      console.log(`🔄 New Season Start - Transitioning to Season ${event.data.season}...`);

      // Reset for new season (increments season number, resets calendar)
      this.gameStore.getState().resetForNewSeason();

      // Invalidate AI tactics cache at season start (squads may have changed)
      aiTacticsManager.invalidateCache();
      console.log(`✅ Season transitioned to ${this.gameStore.getState().currentSeason}`);

      // Generate objectives for the new season
      const teams = Object.values(this.teamStore.getState().teams);
      const userTeamId = this.teamStore.getState().userTeamId;
      const rivalTeam = teams.find(t => t.id !== userTeamId);
      this.gameStore.getState().generateSeasonObjectives(rivalTeam?.name || 'Sydney Sharks');
      console.log(`📋 Objectives generated for Season ${this.gameStore.getState().currentSeason}`);

      // Determine if this new season needs auction or direct league init
      const newSeason = this.gameStore.getState().currentSeason;
      const isNewSeasonOdd = newSeason % 2 === 1;

      if (isNewSeasonOdd) {
        // Odd season: retention_start event (if applicable) already ran retention
        // Season 1 has no retention. Season 3+ retention ran on previous day's retention_start event.
        console.log(`🏏 Season ${newSeason} is ODD - Running auction...`);
        await this.runAuction();
        // Clear retention data after auction
        this.gameStore.getState().resetRetention();
        this.teamStore.getState().clearTeamRetentions();
        await this.initializeLeague();
        // Autosave after auction completion
        await this.autosaveAfterAuction();
      } else {
        // Even season (2, 4, 6...): Initialize league with existing squads (no auction)
        console.log(`🏏 Season ${newSeason} is EVEN - Initializing league directly...`);
        await this.initializeLeague();
      }

      summary.eventsProcessed++;
    }

    if (event && event.type === 'match') {
      // Simulate the match
      const result = await this.simulateMatch(event.data);

      // Only count as played if match actually simulated (not TBD)
      if (result) {
        summary.matchesPlayed++;
      }
      summary.eventsProcessed++;

      // Check if all group stage matches are complete and populate playoffs
      await this.checkAndPopulatePlayoffs();
    } else if (event && event.type === 'auction') {
      // Check if this is a preseason auction (Season 1 initial) or a new season auction
      const isPreseasonAuction = event.data?.phase === 'preseason';

      if (!isPreseasonAuction) {
        // NEW SEASON AUCTION (after previous season ends) - for Season 2, 3, etc.
        console.log('🔄 Auction event - Starting new season...');

        // Reset season state and generate objectives
        this.gameStore.getState().resetForNewSeason();

        // Invalidate AI tactics cache (auction will change squads)
        aiTacticsManager.invalidateCache();
        const teams = Object.values(this.teamStore.getState().teams);
        const userTeamId = this.teamStore.getState().userTeamId;
        const rivalTeam = teams.find(t => t.id !== userTeamId);
        this.gameStore.getState().generateSeasonObjectives(rivalTeam?.name || 'Sydney Sharks');
        console.log(`✅ Season transition complete - Now in Season ${this.gameStore.getState().currentSeason}`);
      } else {
        console.log('📋 Preseason auction - no season transition needed');
      }

      // Run auction
      await this.runAuction();
      summary.eventsProcessed++;

      // Initialize league
      await this.initializeLeague();
      summary.eventsProcessed++;
    } else if (event && event.type === 'offseason_start') {
      // Guard: Don't start offseason if playoffs haven't completed
      const leagueStageForOffseason = this.leagueStore.getState().stage;
      const championForOffseason = this.leagueStore.getState().champion;
      if (leagueStageForOffseason === 'playoffs' && !championForOffseason) {
        console.warn('⚠️ offseason_start fired but playoffs not complete - skipping');
        return;
      }

      // OFFSEASON START — set phase and open transfer window immediately.
      // transfer_window_open fires on the same calendar day but find() only returns one
      // event per day; opening here keeps game behaviour in sync with the calendar display.
      console.log('📅 Off-season started — setting phase to offseason and opening transfer window');
      this.gameStore.getState().advancePhase('offseason');

      const currentWeek = this.gameStore.getState().currentWeek;
      const transferManager = getTransferManager();
      if (!transferManager.transferMarket.windowOpen) {
        transferManager.allowUserTeamAI = true; // Sim mode: AI controls all teams
        transferManager.setCurrentWeek(currentWeek);

        if (!getHasRunPreReleases()) {
          const preReleaseTeams = Object.values(this.teamStore.getState().teams || {}).map(team => {
            const squadIds = this.teamStore.getState().squadLists[team.id] || [];
            return { ...team, squad: squadIds.map(id => this.playerStore.getState().players[id]).filter(Boolean) };
          });
          transferManager.transferAI.releasePreTransferWindow(preReleaseTeams);
          setHasRunPreReleases(true);
        }

        transferManager.openWindow('offSeason', 14);
        const gameDay = this.gameStore.getState().gameDay;
        this.transferStore.getState().openTransferWindow(currentWeek, currentWeek + 4, gameDay);
        console.log(`🔓 Transfer window opened on gameDay ${gameDay} (Week ${currentWeek})`);

        // Inbox message (sim mode — no popup)
        this.inboxStore.getState().addMessage({
          type: 'transfer',
          subject: '🔓 Transfer Window Now Open',
          body: 'The off-season transfer window is now open for 5 weeks. Browse available players in the Transfer Market, list your own players for sale, or pick up free agents. Listings expire after 14 days — highest bid is automatically accepted.',
          sender: 'League Office',
          metadata: { link: '/game/transfers' }
        });
      }

      summary.eventsProcessed++;
    } else if (event && event.type === 'transfer_window_close') {
      // TRANSFER WINDOW CLOSE — calendar event fires at the correct close date
      console.log('🔒 Transfer window close event — closing transfer window');
      const transferManager = getTransferManager();
      if (transferManager.transferMarket.windowOpen) {
        transferManager.closeWindow();
        setHasRunPreReleases(false);

        const useTransferStore = (await import('../../stores/transferStore')).default;
        const tStore = useTransferStore.getState();
        const completedTransfersCopy = [...tStore.completedTransfers];
        tStore.setTransferWindowSummary({
          completedTransfers: completedTransfersCopy,
          totalListings: tStore.activeListings.length,
          freeAgents: [...tStore.freeAgents]
        });
        useTransferStore.getState().closeTransferWindow();
        console.log('🔒 Transfer window closed and summary saved');

        // Update transfer-related board objectives
        const userTeamId = this.teamStore.getState().userTeamId;
        if (userTeamId) {
          completedTransfersCopy.forEach(ct => {
            if (ct.fromTeamId === userTeamId) {
              updateTransferObjectives(
                { type: 'sale', playerId: ct.playerId, price: ct.newPrice, soldPrice: ct.oldPrice },
                userTeamId, this.gameStore, this.playerStore
              );
            }
            if (ct.toTeamId === userTeamId) {
              updateTransferObjectives(
                { type: 'signing', playerId: ct.playerId, price: ct.newPrice },
                userTeamId, this.gameStore, this.playerStore
              );
            }
          });
        }
      }
      summary.eventsProcessed++;
    } else if (event && event.type === 'season_end') {
      // CRITICAL: Check if playoffs are actually complete before processing season end
      const leagueStage = this.leagueStore.getState().stage;
      const champion = this.leagueStore.getState().champion;

      if (leagueStage === 'playoffs' && !champion) {
        console.warn('⚠️ Season end event triggered but playoffs not complete - skipping to allow playoffs to finish');
        return; // Don't process season end yet
      }

      // SEASON END EVENT - Distribute prizes and send inbox message
      console.log('🏆 Season End Event - Processing prize distribution...');

      try {
        const standings = this.leagueStore.getState().standings || [];

        // 1. Distribute prize money to all teams
        const prizeDistributor = new PrizeDistributor(this.financeStore);
        const prizeResults = prizeDistributor.distributePrizes(standings, champion);
        console.log(`💰 Prize distribution complete: $${(prizeResults.totalDistributed / 1000000).toFixed(2)}M distributed`);

        // 2. Send comprehensive season summary inbox message to user
        const userTeamId = this.teamStore.getState().userTeamId;
        if (userTeamId && this.inboxStore) {
          const userTeam = this.teamStore.getState().teams[userTeamId];

          if (userTeam) {
            // Find user team's final position
            const sortedStandings = [...standings].sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              return b.netRunRate - a.netRunRate;
            });

            const userStanding = sortedStandings.find(s => s.clubId === userTeamId);
            const finalPosition = sortedStandings.indexOf(userStanding) + 1;
            const prizeMoney = prizeDistributor.getPrizeForPosition(finalPosition);

            // Build season stats for the user's team
            const stats = {
              matchesPlayed: userStanding?.played || 0,
              wins: userStanding?.won || 0,
              losses: userStanding?.lost || 0,
              points: userStanding?.points || 0,
              nrr: userStanding?.netRunRate || 0
            };

            // Send inbox message
            this.inboxStore.getState().addMessage(MessageGenerator.generateSeasonSummaryMessage(
              this.gameStore.getState().currentSeason,
              userTeam,
              finalPosition,
              prizeMoney,
              champion,
              stats
            ));
            console.log(`📬 Season summary message sent to ${userTeam.name}`);
          }
        }

        // Record season to history
        const sortedForHistory = [...standings].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.netRunRate - a.netRunRate;
        });
        const userTeamIdForHistory = this.teamStore.getState().userTeamId;
        this.gameStore.getState().recordSeasonHistory({
          season: this.gameStore.getState().currentSeason,
          champion: champion?.championName || null,
          runnerUp: champion?.runnerUpName || null,
          standings: sortedForHistory.map(s => ({ clubId: s.clubId, clubName: s.clubName, points: s.points, nrr: s.netRunRate })),
          userPosition: userTeamIdForHistory ? sortedForHistory.findIndex(s => s.clubId === userTeamIdForHistory) + 1 : null
        });

        summary.eventsProcessed++;

        // Emit season end event for live feed
        this.emitEvent('season_end', {
          season: this.gameStore.getState().currentSeason,
          champion: champion?.id || null
        });

        // NOTE: Do NOT call resetForNewSeason() here!
        // Season transition happens later when auction or preseason_start event is reached
        console.log('✅ Season end processing complete. Transfer window and offseason will follow.');
      } catch (error) {
        console.error('Error processing season end:', error);
      }
    } else if (event && event.type === 'preseason_start') {
      // EVEN SEASON START (after ODD season ends)
      console.log('🔄 Preseason start - Starting new EVEN season...');

      // Reset season state and generate objectives
      this.gameStore.getState().resetForNewSeason();
      const teams = Object.values(this.teamStore.getState().teams);
      const userTeamId = this.teamStore.getState().userTeamId;
      const rivalTeam = teams.find(t => t.id !== userTeamId);
      this.gameStore.getState().generateSeasonObjectives(rivalTeam?.name || 'Sydney Sharks');
      console.log(`✅ Season transition complete - Now in Season ${this.gameStore.getState().currentSeason}`);

      console.log('🏏 Initializing league with existing squads...');
      await this.initializeLeague();
      summary.eventsProcessed++;
    }

    // Process daily transfer cycle if the window is open.
    // Open/close is driven by calendar events (offseason_start / transfer_window_close),
    // not by week numbers — this keeps sim-to-date in sync with the calendar display.
    const currentPhase = this.gameStore.getState().currentPhase;
    const currentWeek = this.gameStore.getState().currentWeek;

    if (currentPhase === 'offseason' && getTransferManager().transferMarket.windowOpen) {
      try {
        const transferManager = getTransferManager();
        transferManager.allowUserTeamAI = true;
        transferManager.setCurrentWeek(currentWeek);
        const teams = Object.values(this.teamStore.getState().teams || {}).map(team => {
          const squadIds = this.teamStore.getState().squadLists[team.id] || [];
          return { ...team, squad: squadIds.map(id => this.playerStore.getState().players[id]).filter(Boolean) };
        });
        const transferResult = await transferManager.processDailyTransferCycle(teams, currentWeek);
        summary.transfersCompleted += (transferResult.transfers?.completed || 0);
      } catch (error) {
        console.error('Error processing off-season transfers:', error);
      }
    }

    // Advance to next day
    this.gameStore.getState().advanceDay();

    return summary;
  }

  /**
   * Check if group stage is complete and populate playoff fixtures with top 4 teams
   */
  async checkAndPopulatePlayoffs() {
    const leagueState = this.leagueStore.getState();
    const fixtures = leagueState.fixtures || [];

    // Find all playoff fixtures
    const playoffFixtures = fixtures.filter(f => f.type === 'playoff');
    if (playoffFixtures.length === 0) return;

    // Check if playoffs are already populated
    const q1 = playoffFixtures.find(f => f.matchId === 'playoff_q1');
    if (q1 && q1.homeTeam !== null) {
      // Playoffs already populated
      return;
    }

    // Check if all group stage matches are complete
    const groupStageFixtures = fixtures.filter(f => f.type !== 'playoff');
    const allGroupMatchesComplete = groupStageFixtures.every(f => f.status === 'completed');

    if (!allGroupMatchesComplete) {
      // Group stage not finished yet
      return;
    }

    console.log('🏆 Group stage complete! Populating playoff fixtures...');

    // Get final standings (top 4)
    const standings = leagueState.standings || [];
    const top4 = standings.slice(0, 4);

    if (top4.length < 4) {
      console.error('Not enough teams in standings for playoffs');
      return;
    }

    // Update playoff fixtures with actual teams
    const updatedFixtures = fixtures.map(fixture => {
      if (fixture.matchId === 'playoff_q1') {
        return {
          ...fixture,
          homeTeam: top4[0].clubId,
          homeTeamName: top4[0].clubName,
          awayTeam: top4[1].clubId,
          awayTeamName: top4[1].clubName,
          status: 'scheduled'
        };
      } else if (fixture.matchId === 'playoff_eliminator') {
        return {
          ...fixture,
          homeTeam: top4[2].clubId,
          homeTeamName: top4[2].clubName,
          awayTeam: top4[3].clubId,
          awayTeamName: top4[3].clubName,
          status: 'scheduled'
        };
      }
      return fixture;
    });

    // Update fixtures in league store
    this.leagueStore.setState({
      fixtures: updatedFixtures,
      stage: 'playoffs'
    });

    // Also update calendar events with team info
    const gameStore = this.gameStore.getState();
    const updatedEvents = gameStore.calendarEvents.map(event => {
      if (event.type === 'match' && event.data) {
        if (event.data.matchId === 'playoff_q1') {
          return {
            ...event,
            data: {
              ...event.data,
              homeTeam: top4[0].clubId,
              homeTeamName: top4[0].clubName,
              awayTeam: top4[1].clubId,
              awayTeamName: top4[1].clubName,
              status: 'scheduled'
            }
          };
        } else if (event.data.matchId === 'playoff_eliminator') {
          return {
            ...event,
            data: {
              ...event.data,
              homeTeam: top4[2].clubId,
              homeTeamName: top4[2].clubName,
              awayTeam: top4[3].clubId,
              awayTeamName: top4[3].clubName,
              status: 'scheduled'
            }
          };
        }
      }
      return event;
    });

    // Update calendar events
    this.gameStore.setState({ calendarEvents: updatedEvents });

    console.log(`✅ Playoffs populated: ${top4[0].clubName} vs ${top4[1].clubName} (Q1), ${top4[2].clubName} vs ${top4[3].clubName} (Eliminator)`);
  }

  /**
   * Simulate a single match
   * @param {Object} fixture - Match fixture data
   * @returns {Promise<Object>} Match result
   */
  async simulateMatch(fixture) {
    try {
      // Skip playoff fixtures that haven't been populated yet (TBD teams)
      if (!fixture.homeTeam || !fixture.awayTeam || fixture.homeTeam === null || fixture.awayTeam === null) {
        console.log(`Skipping TBD playoff match: ${fixture.matchId || 'unknown'}`);
        return null;
      }

      const teams = this.teamStore.getState().teams;
      const homeTeam = teams[fixture.homeTeam];
      const awayTeam = teams[fixture.awayTeam];

      if (!homeTeam || !awayTeam) {
        console.error('Match teams not found:', fixture);
        return null;
      }

      // Generate tactics for ALL teams before EVERY match in sim-to-date mode
      // This ensures tactics reflect current squad state (injuries, fitness, etc.)
      // User team is included in sim mode to auto-fix any invalid bowling assignments
      const userTeamId = this.teamStore.getState().userTeamId;

      // Home team tactics - regenerate for ALL teams in sim mode
      const homeSquadIds = this.teamStore.getState().squadLists[homeTeam.id] || [];
      const homeSquad = homeSquadIds
        .map(id => this.playerStore.getState().players[id])
        .filter(Boolean);
      let homeTactics = null;
      if (homeSquad.length >= 11) {
        homeTactics = aiTacticsManager.generateTactics(homeTeam.id, homeSquad, this.teamStore);
      } else {
        homeTactics = this.teamStore.getState().getTeamTactics(homeTeam.id);
      }

      // Away team tactics - regenerate for ALL teams in sim mode
      const awaySquadIds = this.teamStore.getState().squadLists[awayTeam.id] || [];
      const awaySquad = awaySquadIds
        .map(id => this.playerStore.getState().players[id])
        .filter(Boolean);
      let awayTactics = null;
      if (awaySquad.length >= 11) {
        awayTactics = aiTacticsManager.generateTactics(awayTeam.id, awaySquad, this.teamStore);
      } else {
        awayTactics = this.teamStore.getState().getTeamTactics(awayTeam.id);
      }

      let homePlayingXI, awayPlayingXI;

      if (homeTactics?.squadSelection && homeTactics.squadSelection.length === 11) {
        homePlayingXI = homeTactics.squadSelection;
      } else {
        const homePlayers = this.playerStore.getState().getPlayersByTeam(homeTeam.id);
        homePlayingXI = homePlayers.slice(0, 11).map(p => p.id);
      }

      if (awayTactics?.squadSelection && awayTactics.squadSelection.length === 11) {
        awayPlayingXI = awayTactics.squadSelection;
      } else {
        const awayPlayers = this.playerStore.getState().getPlayersByTeam(awayTeam.id);
        awayPlayingXI = awayPlayers.slice(0, 11).map(p => p.id);
      }

      // Toss
      const tossWinnerId = Math.random() < 0.5 ? homeTeam.id : awayTeam.id;
      const tossDecision = Math.random() < 0.5 ? 'bat' : 'bowl';

      const matchConfig = {
        id: fixture.matchId,
        homeTeam: {
          ...homeTeam,
          playingXI: homePlayingXI,
          players: homePlayingXI
        },
        awayTeam: {
          ...awayTeam,
          playingXI: awayPlayingXI,
          players: awayPlayingXI
        },
        venue: fixture.venue || homeTeam.homeGround,
        tossWinner: tossWinnerId,
        tossDecision: tossDecision
      };

      // Quick sim match
      const result = await quickSimMatch(
        matchConfig,
        this.matchStore,
        this.playerStore,
        this.teamStore,
        this.leagueStore
      );

      if (!result || !result.winner) {
        throw new Error('Invalid match result');
      }

      // Determine which team batted first
      const firstBattingTeam = result.innings1.battingTeam === homeTeam.id ? homeTeam : awayTeam;
      const secondBattingTeam = result.innings2.battingTeam === homeTeam.id ? homeTeam : awayTeam;

      // Prepare full scorecard data for storage
      const fullScorecard = {
        venue: fixture.venue || homeTeam.homeGround,
        matchType: 'World Premier League T20',
        firstBattingTeam: {
          id: firstBattingTeam.id,
          name: firstBattingTeam.name,
          colors: firstBattingTeam.colors
        },
        secondBattingTeam: {
          id: secondBattingTeam.id,
          name: secondBattingTeam.name,
          colors: secondBattingTeam.colors
        },
        innings1Data: {
          totalScore: result.innings1.totalScore,
          wickets: result.innings1.wickets,
          overs: result.innings1.overs,
          balls: result.innings1.balls,
          topBatsmen: result.innings1.topBatsmen,
          topBowlers: result.innings1.topBowlers
        },
        innings2Data: {
          totalScore: result.innings2.totalScore,
          wickets: result.innings2.wickets,
          overs: result.innings2.overs,
          balls: result.innings2.balls,
          topBatsmen: result.innings2.topBatsmen,
          topBowlers: result.innings2.topBowlers
        },
        winner: result.winner,
        margin: result.margin.replace('by ', ''),
        playerOfMatch: result.playerOfMatch
      };

      // Record result with full scorecard for clickable results
      this.leagueStore.getState().recordResult(result, fullScorecard);
      // Use incremental standings update (O(1)) instead of full recalculation (O(n))
      this.leagueStore.getState().updateStandingsForMatch(result);

      // Emit match event for live feed
      this.emitEvent('match', {
        innings1: result.innings1,
        innings2: result.innings2,
        winner: result.winner,
        margin: result.margin.replace('by ', '')
      });

      // Check for injuries from this match and emit them
      if (result.injuries && result.injuries.length > 0) {
        result.injuries.forEach(injury => {
          const player = this.playerStore.getState().players[injury.playerId];
          this.emitEvent('injury', {
            playerName: player?.name || 'Unknown Player',
            playerId: injury.playerId,
            teamId: player?.currentTeam,
            injuryType: injury.type || 'Injury',
            daysOut: injury.daysOut || 7
          });
        });
      }

      // Update objectives tracking if this match involved the user team
      const isUserMatch = userTeamId && (fixture.homeTeam === userTeamId || fixture.awayTeam === userTeamId);
      if (isUserMatch) {
        updateObjectivesAfterMatch(result, fixture, userTeamId, this.gameStore, this.leagueStore, this.teamStore, this.playerStore);
      }

      // Process match financials (revenue and performance tracking) - matches Normal UI behavior
      const standings = this.leagueStore.getState().standings;
      this.financeStore.getState().processMatchFinancials(result, standings);

      // Check if this was the last group stage match BEFORE advancing
      const wasLastGroupMatch = fixture.type !== 'playoff' &&
        this.leagueStore.getState().stage === 'league' &&
        (() => {
          const leagueState = this.leagueStore.getState();
          const groupStageFixtures = leagueState.fixtures.filter(f => !f.type || f.type === 'league');
          const groupStageResults = leagueState.results.filter(r => {
            const matchFixture = leagueState.fixtures.find(f => f.matchId === r.matchId);
            return matchFixture && (!matchFixture.type || matchFixture.type === 'league');
          });
          return groupStageResults.length >= groupStageFixtures.length;
        })();

      // Advance to next match
      this.leagueStore.getState().advanceToNextMatch();

      // Trigger playoffs synchronously if this was the last group match (SimulationEngine only)
      if (wasLastGroupMatch) {
        console.log('🏆 Last group stage match complete! Triggering playoffs from SimulationEngine...');
        this.leagueStore.getState().checkAndTriggerPlayoffs();

        // Advance game phase to playoffs
        if (this.leagueStore.getState().stage === 'playoffs') {
          console.log('🏆 Advancing game phase to playoffs');
          this.gameStore.getState().advancePhase('playoffs');
        }
      }

      // If this was a playoff match, update subsequent playoff fixtures
      if (fixture.type === 'playoff') {
        await this.updatePlayoffFixturesAfterMatch(result);
      }

      return result;

    } catch (error) {
      console.error('Error simulating match:', error);
      return null;
    }
  }

  /**
   * Update playoff fixtures after a playoff match completes
   * Uses unified leagueStore method for consistency with Normal UI mode
   * @param {Object} result - Match result
   */
  async updatePlayoffFixturesAfterMatch(result) {
    // Use unified method from leagueStore (same logic as Normal UI mode)
    this.leagueStore.getState().updatePlayoffFixturesAfterResult(result);
    console.log(`✅ Playoff fixtures updated after ${result.matchId} (SimulationEngine)`);
  }

  /**
   * Stop the simulation
   */
  stop() {
    this.shouldStop = true;
    console.log('🛑 Simulation stop requested');
  }

  /**
   * Get current progress
   * @returns {Object} Current progress state
   */
  getProgress() {
    return { ...this.currentProgress };
  }

  /**
   * Check if simulation is running
   * @returns {boolean}
   */
  isSimulating() {
    return this.isRunning;
  }

  /**
   * Sleep helper for yielding to UI
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update progress with a custom message (for sub-operations like auction)
   * @param {string} message - Status message to display
   * @param {Object} extraData - Additional progress data to merge
   */
  async updateProgressMessage(message, extraData = {}) {
    if (this.onProgressCallback) {
      this.onProgressCallback({
        ...this.currentProgress,
        ...extraData,
        message
      });
    }
    // Yield to allow UI to update
    await this.yieldToBrowser();
  }

  /**
   * Yield to browser to allow UI updates (adaptive based on tab visibility)
   * Visible: Uses requestAnimationFrame for smooth 60fps UI updates
   * Hidden: Uses minimal delays to avoid browser throttling
   * @returns {Promise}
   */
  yieldToBrowser() {
    return new Promise(resolve => {
      if (this.isTabVisible) {
        // VISIBLE TAB: Use RAF for smooth 60fps UI updates
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            setTimeout(resolve, 0); // Let React commit
          });
        } else {
          setTimeout(resolve, 16); // ~60fps fallback
        }
      } else {
        // HIDDEN TAB: Use minimal delay to avoid throttling
        const now = Date.now();

        // Only yield every 50ms to maintain performance while allowing
        // browser to process pending tasks (visibility changes, stop button, etc.)
        if (!this._lastYieldTime || (now - this._lastYieldTime) > 50) {
          this._lastYieldTime = now;
          setTimeout(resolve, 1); // Minimal delay
        } else {
          // Immediate resolution - no yield needed
          resolve();
        }
      }
    });
  }

  /**
   * Emit an event to the callback (for live event feed)
   * @param {string} type - Event type (match, auction, transfer, injury, season_end)
   * @param {Object} data - Event data
   */
  emitEvent(type, data) {
    if (this.onEventCallback) {
      this.onEventCallback({ type, data });
    }
  }

  /**
   * Clean up event listeners (call when simulation completes/errors)
   */
  cleanup() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

export default SimulationEngine;
