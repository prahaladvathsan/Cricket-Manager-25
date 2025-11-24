/**
 * @file SimulationEngine.js
 * @description Core engine for simulating game progression to a specific date
 * Replicates exact game flow: auction -> league init -> day-by-day progression
 */

import quickSimMatch from '../match-engine/utils/QuickSimMatch';
import AuctionEngine from '../auction-system/AuctionEngine';
import MatchWeekScheduleGenerator from '../league/MatchWeekScheduleGenerator';
import PlayoffGenerator from '../league/PlayoffGenerator';
import MessageGenerator from '../../utils/MessageGenerator';
import PrizeDistributor from '../offseason/PrizeDistributor';

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
  }

  /**
   * Simulate to a specific target date
   * @param {string} targetDate - ISO date string to simulate to
   * @param {Function} onProgress - Progress callback (progress object)
   * @param {Function} onComplete - Completion callback (summary)
   * @param {Function} onError - Error callback (error)
   * @returns {Promise<Object>} Simulation summary
   */
  async simulateToDate(targetDate, onProgress = null, onComplete = null, onError = null) {
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
          onProgress({ ...this.currentProgress });
        }

        // Yield to UI every 5 days
        if (i % 5 === 0) {
          await this.sleep(10);
        }
      }

      // Simulation complete
      this.isRunning = false;

      const summary = {
        daysSimulated: this.currentProgress.daysSimulated,
        eventsProcessed: this.currentProgress.eventsProcessed,
        matchesSimulated: this.currentProgress.matchesSimulated,
        transfersProcessed: this.currentProgress.transfersProcessed,
        finalDate: this.gameStore.getState().currentDate,
        phase: this.gameStore.getState().currentPhase
      };

      console.log('✅ Simulation complete:', summary);

      if (onComplete) {
        onComplete(summary);
      }

      return summary;

    } catch (error) {
      console.error('❌ Simulation error:', error);
      this.isRunning = false;

      if (onError) {
        onError(error);
      }

      throw error;
    }
  }

  /**
   * Run the auction (automated)
   */
  async runAuction() {
    console.log('📋 Running automated auction...');

    const teams = Object.values(this.teamStore.getState().teams);
    const allPlayers = Object.values(this.playerStore.getState().players);
    const userTeamId = this.teamStore.getState().userTeamId;

    console.log(`User team ID: ${userTeamId}`);

    // Initialize auction engine
    const auctionEngine = new AuctionEngine({ fastMode: true });
    auctionEngine.initializeAuction(teams, allPlayers);

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

    for (const round of rounds) {
      for (const player of round) {
        const auctionProgress = playerIndex / totalPlayers;
        const result = await auctionEngine.auctionPlayer(player, null, auctionProgress);

        // Record sale if player was sold
        if (result.status === 'sold' && result.winner) {
          this.auctionStore.getState().recordSale(player.id, result.winner.id, result.finalPrice);
        }

        playerIndex++;
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

    console.log('✅ Auction complete');
  }

  /**
   * Initialize the league after auction
   */
  async initializeLeague() {
    console.log('🏏 Initializing league...');

    const currentSeason = this.gameStore.getState().currentSeason;
    const currentDate = this.gameStore.getState().currentDate;
    const gameDay = this.gameStore.getState().gameDay;
    const userTeamId = this.teamStore.getState().userTeamId;
    const soldPlayers = this.auctionStore.getState().soldPlayers;

    // Create clubs array from teamStore
    const teams = Object.values(this.teamStore.getState().teams);
    const clubs = teams.map(team => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName || team.name.substring(0, 3).toUpperCase(),
      homeVenue: team.homeGround || `${team.name} Stadium`,
      homeGround: team.homeGround || `${team.name} Stadium`,
      colors: team.colors || { primary: '#2D5F3F', secondary: '#D4AF37' }
    }));

    // Generate fixtures with season-aware timing
    // Odd seasons (1,3,5...): Jan-June, end by June 30
    // Even seasons (2,4,6...): July-Dec, end by Dec 31
    const isOddSeason = currentSeason % 2 === 1;

    const leagueStartDate = new Date(currentDate);
    leagueStartDate.setDate(leagueStartDate.getDate() + 7);

    const scheduleGenerator = new MatchWeekScheduleGenerator();
    const { fixtures } = scheduleGenerator.generateMatchWeekSchedule(
      clubs,
      leagueStartDate
    );

    // Find last group stage match date
    const lastGroupMatchDate = new Date(Math.max(...fixtures.map(f => new Date(f.dateObj))));

    // Calculate next Monday after last group match
    const playoffStartDate = new Date(lastGroupMatchDate);
    const dayOfWeek = playoffStartDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek); // If Sunday, add 1 day. Otherwise, add days to reach next Monday
    playoffStartDate.setDate(playoffStartDate.getDate() + daysUntilMonday);

    const playoffGenerator = new PlayoffGenerator();
    // Generate playoff fixtures with TBD teams (will be populated at end of league stage)
    const placeholderStandings = [
      { clubId: null, clubName: 'TBD (1st)', position: 1 },
      { clubId: null, clubName: 'TBD (2nd)', position: 2 },
      { clubId: null, clubName: 'TBD (3rd)', position: 3 },
      { clubId: null, clubName: 'TBD (4th)', position: 4 }
    ];

    const playoffFixturesRaw = playoffGenerator.generatePlayoffFixtures(placeholderStandings);

    // Space playoffs over 10 days: Q1 (day 0), Eliminator (day 3), Q2 (day 6), Final (day 10)
    const playoffFixtures = playoffFixturesRaw.map((fixture, index) => {
      const dayOffset = index === 0 ? 0 : index === 1 ? 3 : index === 2 ? 6 : 10;
      const fixtureDate = new Date(playoffStartDate);
      fixtureDate.setDate(fixtureDate.getDate() + dayOffset);

      return {
        ...fixture,
        date: fixtureDate.toISOString().split('T')[0],
        dateObj: fixtureDate
      };
    });

    // Combine league and playoff fixtures
    const allFixtures = [...fixtures, ...playoffFixtures];

    // Get final match date (last playoff)
    const finalMatchDate = new Date(Math.max(...playoffFixtures.map(f => new Date(f.dateObj))));

    // Calculate season end date based on season parity
    const seasonEndDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, isOddSeason ? 30 : 31); // June 30 or Dec 31

    // Initialize league season with all fixtures (league + playoffs)
    this.leagueStore.getState().initializeSeason({
      seasonId: `season_${currentSeason}`,
      seasonName: `Season ${currentSeason}`,
      clubs,
      fixtures: allFixtures,
      useMatchWeeks: false
    });

    // Initialize finances
    const teamsForFinances = teams.map(team => ({
      id: team.id,
      name: team.name
    }));
    this.financeStore.getState().initializeSeason(teamsForFinances, `season_${currentSeason}`, null);

    // Record auction spending for each team
    teams.forEach(team => {
      const squadList = this.teamStore.getState().squadLists[team.id] || [];
      const teamSales = soldPlayers.filter(sale => sale.teamId === team.id);
      const totalSpent = teamSales.reduce((sum, sale) => sum + sale.price, 0);

      this.financeStore.getState().processAuctionSpending(team.id, totalSpent, squadList);
    });

    // Initialize tactics for all teams
    this.teamStore.getState().initializeAllTeamsTactics();

    // Calculate game day offsets for all events
    const currentGameDate = new Date(currentDate);
    const gameStartDate = new Date(currentGameDate);
    gameStartDate.setDate(gameStartDate.getDate() - (gameDay - 1));

    // Convert all fixtures (league + playoffs) to match events
    const matchEvents = allFixtures.map(fixture => {
      const matchDate = new Date(fixture.dateObj);
      const daysSinceStart = Math.ceil((matchDate - gameStartDate) / (1000 * 60 * 60 * 24));
      const matchGameDay = daysSinceStart + 1;

      return {
        day: matchGameDay,
        type: 'match',
        data: fixture
      };
    });

    // Off-season starts the day after final
    const offseasonStartDate = new Date(finalMatchDate);
    offseasonStartDate.setDate(offseasonStartDate.getDate() + 1);
    const offseasonStartDay = Math.ceil((offseasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

    // Transfer window: June 1-30 for odd seasons, Dec 1-31 for even seasons
    const transferWindowStartDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, 1); // June 1 or Dec 1
    const transferWindowEndDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, isOddSeason ? 30 : 31); // June 30 or Dec 31

    const transferWindowStartDay = Math.ceil((transferWindowStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
    const transferWindowEndDay = Math.ceil((transferWindowEndDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

    // Season ends on transfer window close date
    const seasonEndDay = transferWindowEndDay;

    // Next season auction (first day after current season ends)
    const nextSeasonStartDate = new Date(transferWindowEndDate);
    nextSeasonStartDate.setDate(nextSeasonStartDate.getDate() + 1);
    const nextSeasonStartDay = Math.ceil((nextSeasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

    const additionalEvents = [
      { day: offseasonStartDay, type: 'offseason_start' },
      { day: transferWindowStartDay, type: 'transfer_window_open' },
      { day: transferWindowEndDay, type: 'transfer_window_close' },
      { day: seasonEndDay, type: 'season_end', data: { season: currentSeason } },
      { day: nextSeasonStartDay, type: 'auction', data: { season: currentSeason + 1 } }
    ];

    this.gameStore.getState().scheduleEvents([...matchEvents, ...additionalEvents]);
    this.gameStore.getState().advancePhase('league');

    // Add inbox messages
    const userTeam = this.teamStore.getState().teams[userTeamId];
    if (this.inboxStore && userTeam) {
      this.inboxStore.getState().addMessage(MessageGenerator.generateWelcomeMessage(userTeam, currentSeason));
      this.inboxStore.getState().addMessage(MessageGenerator.generateExpectationsMessage(userTeam, currentSeason));
      this.inboxStore.getState().addMessage(MessageGenerator.generateTutorialMessage());

      const userSquadIds = this.teamStore.getState().squadLists[userTeamId] || [];
      const userSquad = userSquadIds.map(id => this.playerStore.getState().players[id]).filter(Boolean);
      const userTeamSales = soldPlayers.filter(sale => sale.teamId === userTeamId);
      const finances = {
        totalSpent: userTeamSales.reduce((sum, sale) => sum + sale.price, 0),
        budgetRemaining: 0 // Will be calculated by finance store
      };
      this.inboxStore.getState().addMessage(MessageGenerator.generateAuctionSummaryMessage(userSquad, finances));
    }

    console.log('✅ League initialized');
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

    // Check if auction needs to happen (preseason phase)
    if (this.gameStore.getState().currentPhase === 'preseason') {
      console.log('📋 Auction day - running auction...');
      await this.runAuction();
      summary.eventsProcessed++;

      // After auction, initialize league with fixtures starting from a future date
      console.log('🏏 Initializing league after auction...');
      await this.initializeLeague();
      summary.eventsProcessed++;
    }

    // Get current day's event
    const event = this.gameStore.getState().getCurrentEvent();

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
    } else if (event && (event.type === 'season_end' || event.type === 'offseason_start')) {
      // SEASON END EVENT - Distribute prizes and send inbox message
      console.log('🏆 Season End Event - Processing prize distribution...');

      try {
        const standings = this.leagueStore.getState().standings || [];
        const champion = this.leagueStore.getState().champion;

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

        summary.eventsProcessed++;
      } catch (error) {
        console.error('Error processing season end:', error);
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

      // Get tactics or use first 11 players
      const homeTactics = this.teamStore.getState().getTeamTactics(homeTeam.id);
      const awayTactics = this.teamStore.getState().getTeamTactics(awayTeam.id);

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
      this.leagueStore.getState().recalculateStandings();

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
   * @param {Object} result - Match result
   */
  async updatePlayoffFixturesAfterMatch(result) {
    const leagueState = this.leagueStore.getState();
    const fixtures = leagueState.fixtures || [];
    const clubs = leagueState.clubs || {};

    const playoffGenerator = new PlayoffGenerator();
    const updatedFixtures = playoffGenerator.updatePlayoffFixtures(fixtures, result, clubs);

    // Update fixtures in league store
    this.leagueStore.setState({ fixtures: updatedFixtures });

    console.log(`✅ Playoff fixtures updated after ${result.matchId}`);
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
}

export default SimulationEngine;
