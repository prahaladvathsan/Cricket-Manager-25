/**
 * @file LeagueSimulator.js
 * @description Main league simulation engine
 * Orchestrates complete league season: squad distribution → fixtures → simulation → standings
 */

import fs from 'fs';
import SquadDistributor from './SquadDistributor.js';
import ScheduleGenerator from './ScheduleGenerator.js';
import MatchWeekScheduleGenerator from './MatchWeekScheduleGenerator.js';
import PlayoffGenerator from './PlayoffGenerator.js';
import PlayoffSimulator from './PlayoffSimulator.js';
import MatchOrchestrator from './MatchOrchestrator.js';
import StandingsCalculator from './StandingsCalculator.js';
import LeaderboardsCalculator from './LeaderboardsCalculator.js';
import AuctionEngine from '../auction-system/AuctionEngine.js';
import { create } from 'zustand';

class LeagueSimulator {
  constructor(leagueStore, playerStore, teamStore, matchStore, financeStore = null, transferManager = null) {
    this.leagueStore = leagueStore;
    this.playerStore = playerStore;
    this.teamStore = teamStore;
    this.matchStore = matchStore;
    this.financeStore = financeStore; // Optional finance tracking
    this.transferManager = transferManager; // Optional transfer system

    this.squadDistributor = new SquadDistributor();
    this.scheduleGenerator = new ScheduleGenerator();
    this.matchWeekScheduleGenerator = new MatchWeekScheduleGenerator();
    this.playoffGenerator = new PlayoffGenerator();
    this.matchOrchestrator = new MatchOrchestrator(playerStore, teamStore, matchStore, leagueStore, teamStore, playerStore);
    this.playoffSimulator = new PlayoffSimulator(this.matchOrchestrator, leagueStore);
    this.standingsCalculator = new StandingsCalculator();
    this.leaderboards = new LeaderboardsCalculator(teamStore, playerStore, leagueStore); // V3: Pass teamStore, playerStore, and leagueStore
  }

  /**
   * Run auction to distribute players among clubs
   * @param {Array} clubsData - Club definitions
   * @param {Array} playersData - Player pool
   * @param {Function} userBidCallback - Optional user bidding callback for interactive mode
   * @param {Object} options - Auction options (fastMode, etc.)
   * @returns {Promise<Array>} Clubs with auction-assigned squads
   */
  async runAuction(clubsData, playersData, userBidCallback = null, options = {}) {
    console.log('\n' + '='.repeat(80));
    console.log('💰 AUCTION MODE: Player Distribution via Auction');
    console.log('='.repeat(80) + '\n');

    const auctionEngine = new AuctionEngine({
      fastMode: options.fastMode || false,
      difficulty: options.difficulty || 'normal'
    });

    // Prepare teams for auction
    const teams = clubsData.map(club => ({
      id: club.id,
      name: club.name,
      shortName: club.shortName,
      isUserControlled: club.isUserControlled || false
    }));

    // Initialize auction
    auctionEngine.initializeAuction(teams, playersData);

    // Categorize and create rounds
    const categorizedPlayers = auctionEngine.categorizePlayers();
    const rounds = auctionEngine.createAuctionRounds(categorizedPlayers);

    console.log(`\n🎬 Starting auction (${rounds.length} rounds)...\n`);

    // Run auction rounds
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];

      console.log(`\n${'='.repeat(80)}`);
      console.log(`📅 AUCTION ROUND ${i + 1} of ${rounds.length}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`   ${round.length} players in this round\n`);

      for (const player of round) {
        await auctionEngine.auctionPlayer(player, userBidCallback);
      }

      auctionEngine.displaySquadSummary();
    }

    // Run unsold round
    await auctionEngine.runUnsoldRound(userBidCallback);
    auctionEngine.displaySquadSummary();

    // Get auction results for finance tracking
    const auctionResults = auctionEngine.getAuctionResults();

    // Convert auction teams back to club format
    const clubsWithSquads = clubsData.map(club => {
      const auctionTeam = auctionEngine.teams.find(t => t.id === club.id);
      return {
        ...club,
        squad: auctionTeam ? auctionTeam.squad : []
      };
    });

    console.log('\n✅ Auction completed!\n');

    // Process auction spending through finance system (if financeStore provided)
    if (this.financeStore) {
      console.log('💰 Processing auction spending through finance system...');
      this.financeStore.getState().processAuctionResults(auctionResults);

      // Display team budgets after auction
      console.log('\n💵 TEAM BUDGETS AFTER AUCTION:');
      auctionResults.forEach(result => {
        const teamFinances = this.financeStore.getState().getTeamFinances(result.teamId);
        if (teamFinances) {
          const budgetFormatted = (teamFinances.currentBudget / 1000000).toFixed(2);
          const spentFormatted = (result.spending / 1000000).toFixed(2);
          console.log(`   ${result.teamName}: $${budgetFormatted}M remaining (spent $${spentFormatted}M on ${result.players.length} players)`);
        }
      });
      console.log();
    }

    // Record auction prices in TransferManager for future sell decisions (V2)
    if (this.transferManager) {
      console.log('💾 Recording auction prices for transfer system...');
      this.transferManager.recordAuctionPurchases(auctionResults);
      console.log();
    }

    return clubsWithSquads;
  }

  /**
   * Initialize a new league season
   * @param {Object} config - League configuration
   * @returns {Promise<Object>} Initialization result
   */
  async initializeLeague(config) {
    const { clubsData, playersData, seasonName, useMatchWeeks = true, seasonStartDate, useAuction = false, fastAuction = false, userBidCallback = null } = config;

    console.log('\n' + '='.repeat(80));
    console.log('🏆 INITIALIZING WORLD PREMIER LEAGUE SEASON');
    console.log('='.repeat(80) + '\n');

    // Clean up old match logs
    this.cleanupMatchLogs();

    let clubsWithSquads;
    let validation = null;

    if (useAuction) {
      // Step 1: Run auction
      console.log('📋 Step 1: Running auction for player distribution...');
      clubsWithSquads = await this.runAuction(clubsData, playersData, userBidCallback, {
        fastMode: fastAuction
      });
      // Auction doesn't need separate validation - already validated during auction
      validation = { valid: true, issues: [] };
    } else {
      // Step 1: Distribute squads randomly (original method)
      console.log('📋 Step 1: Distributing players across clubs (random)...');
      clubsWithSquads = this.squadDistributor.distributeSquads(
        playersData,
        clubsData,
        25 // Squad size
      );

      // Validate distribution
      validation = this.squadDistributor.validateDistribution(clubsWithSquads);
      if (!validation.valid) {
        console.warn(`⚠️ Squad distribution issues: ${validation.issues.join(', ')}`);
      } else {
        console.log('✅ Squad distribution validated\n');
      }
    }

    // Step 2: Generate league schedule
    console.log('📅 Step 2: Generating league schedule...');
    let fixtures, matchWeeks, scheduleValidation;

    if (useMatchWeeks) {
      const scheduleData = this.matchWeekScheduleGenerator.generateMatchWeekSchedule(
        clubsWithSquads,
        seasonStartDate
      );
      fixtures = scheduleData.fixtures;
      matchWeeks = scheduleData.matchWeeks;

      // Validate match week schedule
      scheduleValidation = this.matchWeekScheduleGenerator.validateMatchWeekSchedule(
        matchWeeks,
        clubsWithSquads
      );
      if (!scheduleValidation.valid) {
        throw new Error(`Match week schedule validation failed: ${scheduleValidation.issues.join(', ')}`);
      }
      console.log(`✅ Generated ${fixtures.length} fixtures across ${matchWeeks.length} match weeks\n`);
    } else {
      fixtures = this.scheduleGenerator.generateLeagueSchedule(clubsWithSquads);
      scheduleValidation = this.scheduleGenerator.validateSchedule(fixtures, clubsWithSquads);
      if (!scheduleValidation.valid) {
        throw new Error(`Schedule validation failed: ${scheduleValidation.issues.join(', ')}`);
      }
      console.log(`✅ Generated ${fixtures.length} fixtures (double round-robin)\n`);
    }

    // Step 3: Initialize league store
    console.log('💾 Step 3: Initializing league state...');
    const seasonId = `wpl_${Date.now()}`;
    this.leagueStore.getState().initializeSeason({
      seasonId,
      seasonName: seasonName || 'WPL 2025',
      clubs: clubsWithSquads,
      fixtures,
      matchWeeks: matchWeeks || null,
      useMatchWeeks
    });
    console.log('✅ League state initialized\n');

    // Step 4: Initialize finances (if financeStore provided)
    if (this.financeStore) {
      console.log('💰 Step 4: Initializing team finances...');
      const teams = clubsWithSquads.map(club => ({ id: club.id, name: club.name }));
      this.financeStore.getState().initializeSeason(teams, seasonId);
      console.log('✅ Team finances initialized\n');
    }

    // Step 5: Initialize team stats and player career stats (V2)
    console.log('📊 Step 5: Initializing player statistics tracking...');

    // Initialize playerStore with all players from all clubs
    const allPlayers = [];
    clubsWithSquads.forEach(club => {
      if (club.squad) {
        allPlayers.push(...club.squad);
      }
    });
    this.playerStore.getState().initializePlayers(allPlayers);

    // Initialize team stats for each team
    clubsWithSquads.forEach(club => {
      this.teamStore.getState().initializeTeamStats(club.id);
    });

    // Set current season ID and initialize career stats for all players
    this.playerStore.getState().setCurrentSeasonId(seasonId);
    clubsWithSquads.forEach(club => {
      club.squad.forEach(player => {
        this.playerStore.getState().initializeCareerStats(player.id);
      });
    });

    console.log('✅ Player statistics tracking initialized\n');

    // Step 6: Initialize transfer manager
    if (this.transferManager) {
      console.log('🔄 Step 6: Configuring transfer system...');
      this.transferManager.setCurrentWeek(0);
    }

    console.log('='.repeat(80));
    console.log('✅ LEAGUE INITIALIZATION COMPLETE');
    console.log('='.repeat(80) + '\n');

    return {
      clubs: clubsWithSquads,
      fixtures,
      matchWeeks,
      validation,
      scheduleValidation
    };
  }

  /**
   * Simulate complete league season (all 90 matches)
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Season results
   */
  async simulateFullLeague(options = {}) {
    const {
      showProgress = true,
      showStandingsAfterEvery = 10, // Show standings every N matches
      pauseAfter = null // Pause after N matches (for testing)
    } = options;

    const state = this.leagueStore.getState();
    const { fixtures, clubs } = state;

    if (!fixtures || fixtures.length === 0) {
      throw new Error('No fixtures found. Please initialize league first.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('⚽ STARTING FULL LEAGUE SIMULATION');
    console.log('='.repeat(80));
    console.log(`Total matches: ${fixtures.length}`);
    console.log(`Clubs: ${Object.keys(clubs).length}`);
    console.log('='.repeat(80) + '\n');

    const clubsMap = state.clubs;
    const startTime = Date.now();
    let matchCount = 0;

    // Simulate all league matches
    for (const fixture of fixtures) {
      matchCount++;

      const homeClub = clubsMap[fixture.homeTeam];
      const awayClub = clubsMap[fixture.awayTeam];

      if (!homeClub || !awayClub) {
        console.error(`❌ Club not found for fixture ${fixture.matchday}`);
        continue;
      }

      // Simulate match
      const result = await this.matchOrchestrator.simulateMatch(fixture, homeClub, awayClub);

      // Update finances (if financeStore provided)
      if (this.financeStore) {
        const currentStandings = this.leagueStore.getState().getCurrentStandings();
        this.financeStore.getState().processMatchFinancials(result, currentStandings);
      }

      // Show progress
      if (showProgress && matchCount % showStandingsAfterEvery === 0) {
        this.displayProgress(matchCount, fixtures.length, startTime);
      }

      // Pause if requested (for testing)
      if (pauseAfter && matchCount >= pauseAfter) {
        console.log(`\n⏸️ Paused after ${matchCount} matches`);
        break;
      }

      // Reset match store for next match
      this.matchStore.getState().resetMatch();
    }

    // Calculate final results
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('🏁 LEAGUE STAGE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Matches completed: ${matchCount}`);
    console.log(`Time taken: ${duration}s`);
    console.log(`Average time per match: ${(duration / matchCount).toFixed(2)}s`);
    console.log('='.repeat(80) + '\n');

    // Display final standings
    this.matchOrchestrator.postMatchProcessor.displayStandings();

    // Get playoff qualifiers
    const finalStandings = this.leagueStore.getState().getCurrentStandings();
    const playoffTeams = this.standingsCalculator.getPlayoffQualifiers(finalStandings);

    console.log('\n🏆 PLAYOFF QUALIFIERS (Top 4):');
    playoffTeams.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.clubName} (${team.points} points, NRR: ${team.netRunRate.toFixed(3)})`);
    });
    console.log();

    return {
      matchesPlayed: matchCount,
      duration,
      finalStandings,
      playoffTeams,
      leaderboards: this.leaderboards.getAllLeaderboards()
    };
  }

  /**
   * Simulate full season including playoffs
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Complete season results
   */
  async simulateFullSeason(options = {}) {
    const {
      includePlayoffs = true,
      showLeaderboards = true
    } = options;

    // Simulate league stage
    const leagueResults = await this.simulateFullLeague(options);

    // Display leaderboards after league stage
    if (showLeaderboards) {
      this.leaderboards.displayLeaderboards(10);
    }

    let playoffResults = null;
    let champion = null;

    // Simulate playoffs if requested
    if (includePlayoffs) {
      const clubsMap = this.leagueStore.getState().clubs;
      playoffResults = await this.playoffSimulator.simulatePlayoffs(clubsMap, leagueResults.finalStandings);
      champion = playoffResults.champion;

      // Update playoff finances (if financeStore provided)
      if (this.financeStore) {
        const currentStandings = leagueResults.finalStandings;
        playoffResults.results.forEach(result => {
          this.financeStore.getState().processMatchFinancials(result, currentStandings);
        });

        // Distribute season-end prizes based on final standings
        console.log('\n💰 Distributing season-end prize money...');
        const prizeDistribution = this.financeStore.getState().distributeSeasonEndPrizes(
          leagueResults.finalStandings.map((standing, index) => ({
            teamId: standing.clubId,
            position: index + 1
          }))
        );

        // Display prize distribution
        console.log('\n🏆 SEASON-END PRIZE MONEY:');
        Object.entries(prizeDistribution).forEach(([teamId, info]) => {
          const prizeFormatted = (info.prize / 1000000).toFixed(2);
          console.log(`   ${info.position}. ${info.teamName}: $${prizeFormatted}M`);
        });
        console.log();
      }

      // Update league store stage
      this.leagueStore.getState().setStage('completed');
      this.leagueStore.getState().setChampion(champion);
    }

    // Display final leaderboards after playoffs
    if (showLeaderboards && includePlayoffs) {
      console.log('\n\n');
      console.log('='.repeat(80));
      console.log('📊 FINAL SEASON LEADERBOARDS (Including Playoffs)');
      console.log('='.repeat(80));
      this.leaderboards.displayLeaderboards(10);
    }

    return {
      league: leagueResults,
      playoffs: playoffResults,
      champion,
      leaderboards: this.leaderboards.getAllLeaderboards()
    };
  }

  /**
   * Simulate league week by week
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Season results
   */
  async simulateByMatchWeek(options = {}) {
    const {
      showProgress = true,
      pauseAfterWeeks = null,
      includePlayoffs = true,
      showLeaderboards = true
    } = options;

    const state = this.leagueStore.getState();
    const { matchWeeks, clubs } = state;

    if (!matchWeeks || matchWeeks.length === 0) {
      throw new Error('No match weeks found. Please initialize league with useMatchWeeks=true');
    }

    console.log('\n' + '='.repeat(80));
    console.log('📅 STARTING WEEK-BY-WEEK LEAGUE SIMULATION');
    console.log('='.repeat(80));
    console.log(`Total match weeks: ${matchWeeks.length}`);
    console.log(`Clubs: ${Object.keys(clubs).length}`);
    console.log('='.repeat(80) + '\n');

    const clubsMap = state.clubs;
    const startTime = Date.now();
    let totalMatchCount = 0;

    // Simulate each match week
    for (const week of matchWeeks) {
      if (pauseAfterWeeks && week.weekNumber > pauseAfterWeeks) {
        console.log(`\n⏸️ Paused after Week ${pauseAfterWeeks}`);
        break;
      }

      console.log('\n' + '═'.repeat(80));
      console.log(`📆 MATCH WEEK ${week.weekNumber} - ${week.date}`);
      console.log('═'.repeat(80));

      // Update transfer manager's current week tracking
      if (this.transferManager) {
        this.transferManager.setCurrentWeek(week.weekNumber);
      }

      // Simulate all matches in this week
      for (const fixture of week.fixtures) {
        const homeClub = clubsMap[fixture.homeTeam];
        const awayClub = clubsMap[fixture.awayTeam];

        if (!homeClub || !awayClub) {
          console.error(`❌ Club not found for fixture ${fixture.matchId}`);
          continue;
        }

        // Simulate match
        const result = await this.matchOrchestrator.simulateMatch(fixture, homeClub, awayClub);

        // Update finances (if financeStore provided)
        if (this.financeStore) {
          const currentStandings = this.leagueStore.getState().getCurrentStandings();
          this.financeStore.getState().processMatchFinancials(result, currentStandings);
        }

        totalMatchCount++;

        // Reset match store for next match
        this.matchStore.getState().resetMatch();
      }

      // Display standings and leaderboards after each week
      console.log('\n' + '─'.repeat(80));
      console.log(`📊 STANDINGS AFTER WEEK ${week.weekNumber}`);
      console.log('─'.repeat(80));
      this.matchOrchestrator.postMatchProcessor.displayStandings();
      console.log('─'.repeat(80));

      // Display financial summary after each week
      if (this.financeStore) {
        console.log('\n' + '─'.repeat(80));
        console.log(`💰 TEAM FINANCES AFTER WEEK ${week.weekNumber}`);
        console.log('─'.repeat(80));
        this.displayTeamFinances();
        console.log('─'.repeat(80));
      }

      // Display transfer summary during transfer window
      if (this.transferManager && this.transferManager.transferMarket.windowOpen) {
        this.transferManager.displayWeeklyTransferSummary();
      }

      // Display top 5 leaderboards after each week
      console.log('\n' + '─'.repeat(80));
      console.log(`📊 LEADERBOARDS AFTER WEEK ${week.weekNumber}`);
      console.log('─'.repeat(80));
      this.leaderboards.displayLeaderboards(5);
      console.log('─'.repeat(80));
    }

    // Calculate final results
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('🏁 LEAGUE STAGE COMPLETE');
    console.log('='.repeat(80));
    console.log(`Match weeks completed: ${pauseAfterWeeks || matchWeeks.length}`);
    console.log(`Total matches: ${totalMatchCount}`);
    console.log(`Time taken: ${duration}s`);
    console.log(`Average time per match: ${(duration / totalMatchCount).toFixed(2)}s`);
    console.log('='.repeat(80) + '\n');

    // Get playoff qualifiers
    const finalStandings = this.leagueStore.getState().getCurrentStandings();
    const playoffTeams = this.standingsCalculator.getPlayoffQualifiers(finalStandings);

    console.log('🏆 PLAYOFF QUALIFIERS (Top 4):');
    playoffTeams.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.clubName} (${team.points} points, NRR: ${team.netRunRate.toFixed(3)})`);
    });
    console.log();

    // Display leaderboards after league stage
    if (showLeaderboards) {
      this.leaderboards.displayLeaderboards(10);
    }

    let playoffResults = null;
    let champion = null;

    // Simulate playoffs if requested and league is complete
    if (includePlayoffs && (!pauseAfterWeeks || pauseAfterWeeks >= matchWeeks.length)) {
      // Get the last match week's date for playoff scheduling
      const lastWeek = matchWeeks[matchWeeks.length - 1];
      const playoffSchedule = this.matchWeekScheduleGenerator.generatePlayoffSchedule(
        lastWeek.dateObj,
        playoffTeams
      );

      console.log('\n' + '='.repeat(80));
      console.log('🏆 PLAYOFF STAGE');
      console.log('='.repeat(80));

      playoffResults = await this.playoffSimulator.simulatePlayoffsWithSchedule(
        clubsMap,
        finalStandings,
        playoffSchedule
      );
      champion = playoffResults.champion;

      // Update playoff finances (if financeStore provided)
      if (this.financeStore) {
        playoffResults.results.forEach(result => {
          this.financeStore.getState().processMatchFinancials(result, finalStandings);
        });

        // Distribute season-end prizes based on final standings
        console.log('\n💰 Distributing season-end prize money...');
        const prizeDistribution = this.financeStore.getState().distributeSeasonEndPrizes(
          finalStandings.map((standing, index) => ({
            teamId: standing.clubId,
            position: index + 1
          }))
        );

        // Display prize distribution
        console.log('\n🏆 SEASON-END PRIZE MONEY:');
        Object.entries(prizeDistribution).forEach(([teamId, info]) => {
          const prizeFormatted = (info.prize / 1000000).toFixed(2);
          console.log(`   ${info.position}. ${info.teamName}: $${prizeFormatted}M`);
        });
        console.log();
      }

      // Update league store stage
      this.leagueStore.getState().setStage('completed');
      this.leagueStore.getState().setChampion(champion);
    }

    // Display final leaderboards after playoffs
    if (showLeaderboards && includePlayoffs && playoffResults) {
      console.log('\n\n');
      console.log('='.repeat(80));
      console.log('📊 FINAL SEASON LEADERBOARDS (Including Playoffs)');
      console.log('='.repeat(80));
      this.leaderboards.displayLeaderboards(10);
    }

    return {
      matchesPlayed: totalMatchCount,
      weeksCompleted: pauseAfterWeeks || matchWeeks.length,
      duration,
      finalStandings,
      playoffTeams,
      playoffs: playoffResults,
      champion,
      leaderboards: this.leaderboards.getAllLeaderboards()
    };
  }

  /**
   * Simulate matches up to a specific matchday
   * @param {number} targetMatchday - Target matchday
   * @returns {Promise<Object>} Results up to matchday
   */
  async simulateUpToMatchday(targetMatchday) {
    const state = this.leagueStore.getState();
    const { fixtures, clubs, currentMatchday } = state;

    const clubsMap = state.clubs;
    const fixturesToPlay = fixtures.filter(f =>
      f.matchday > currentMatchday && f.matchday <= targetMatchday
    );

    console.log(`\nSimulating matchdays ${currentMatchday + 1} to ${targetMatchday}...`);
    console.log(`Matches to play: ${fixturesToPlay.length}\n`);

    for (const fixture of fixturesToPlay) {
      const homeClub = clubsMap[fixture.homeTeam];
      const awayClub = clubsMap[fixture.awayTeam];

      await this.matchOrchestrator.simulateMatch(fixture, homeClub, awayClub);

      // Reset match store
      this.matchStore.getState().resetMatch();
    }

    // Update current matchday
    this.leagueStore.getState().setMatchday(targetMatchday);

    const currentStandings = this.leagueStore.getState().getCurrentStandings();

    return {
      matchesPlayed: fixturesToPlay.length,
      currentMatchday: targetMatchday,
      standings: currentStandings
    };
  }

  /**
   * Display simulation progress
   * @param {number} completed - Matches completed
   * @param {number} total - Total matches
   * @param {number} startTime - Simulation start time
   */
  displayProgress(completed, total, startTime) {
    const percentage = ((completed / total) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgTime = (elapsed / completed).toFixed(2);
    const remaining = ((total - completed) * avgTime).toFixed(1);

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📊 Progress: ${completed}/${total} matches (${percentage}%)`);
    console.log(`⏱️  Elapsed: ${elapsed}s | Avg: ${avgTime}s/match | Est. remaining: ${remaining}s`);
    console.log(`${'─'.repeat(80)}\n`);

    // Show current standings
    this.matchOrchestrator.postMatchProcessor.displayStandings();
  }

  /**
   * Display team finances in a compact table format
   */
  displayTeamFinances() {
    if (!this.financeStore) return;

    const teamFinances = this.financeStore.getState().getAllTeamFinances();

    // Sort by current budget (descending)
    teamFinances.sort((a, b) => b.currentBudget - a.currentBudget);

    console.log('\nPos  Team                      Budget      Revenue     Expenses    Transfers');
    console.log('─'.repeat(80));

    teamFinances.forEach((finance, index) => {
      const pos = (index + 1).toString().padStart(2);
      const team = finance.teamName.padEnd(25);
      const budget = `$${(finance.currentBudget / 1000000).toFixed(2)}M`.padStart(10);
      const revenue = `$${(finance.totalRevenue / 1000000).toFixed(2)}M`.padStart(10);
      const expenses = `$${(finance.totalExpenses / 1000000).toFixed(2)}M`.padStart(10);
      const transfers = `${finance.transfersIn}→${finance.transfersOut}`.padStart(10);

      console.log(`${pos}   ${team} ${budget}  ${revenue}  ${expenses}  ${transfers}`);
    });

    console.log('─'.repeat(80));

    // League totals
    const totalBudget = teamFinances.reduce((sum, f) => sum + f.currentBudget, 0);
    const totalRevenue = teamFinances.reduce((sum, f) => sum + f.totalRevenue, 0);
    const totalExpenses = teamFinances.reduce((sum, f) => sum + f.totalExpenses, 0);

    console.log(`TOT  League Total            $${(totalBudget / 1000000).toFixed(2)}M  $${(totalRevenue / 1000000).toFixed(2)}M  $${(totalExpenses / 1000000).toFixed(2)}M\n`);
  }

  /**
   * Export league data to file
   * @param {string} filename - Output filename
   */
  exportLeagueData(filename) {
    const state = this.leagueStore.getState();

    const exportData = {
      seasonId: state.seasonId,
      seasonName: state.seasonName,
      stage: state.stage,
      currentMatchday: state.currentMatchday,
      standings: state.getCurrentStandings(),
      results: state.results,
      stats: state.stats
    };

    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`💾 League data exported to: ${filename}`);
  }

  /**
   * Get league statistics
   * @returns {Object} League statistics
   */
  getLeagueStats() {
    const state = this.leagueStore.getState();

    return {
      totalMatches: state.stats.totalMatches,
      completedMatches: state.stats.completedMatches,
      remainingMatches: state.stats.totalMatches - state.stats.completedMatches,
      highestScore: state.stats.highestScore,
      lowestScore: state.stats.lowestScore,
      standings: state.getCurrentStandings()
    };
  }

  /**
   * Clean up old match logs and league results
   */
  cleanupMatchLogs() {
    try {
      // Clean up match logs directory
      const matchLogsDir = 'match_logs/league';
      if (fs.existsSync(matchLogsDir)) {
        const files = fs.readdirSync(matchLogsDir);
        files.forEach(file => {
          fs.unlinkSync(`${matchLogsDir}/${file}`);
        });
        console.log(`🗑️  Cleaned up ${files.length} old match log(s)`);
      }

      // Clean up old league results files
      const rootFiles = fs.readdirSync('.');
      const leagueResultFiles = rootFiles.filter(f => f.startsWith('league_results_') && f.endsWith('.json'));
      leagueResultFiles.forEach(file => {
        fs.unlinkSync(file);
      });
      if (leagueResultFiles.length > 0) {
        console.log(`🗑️  Cleaned up ${leagueResultFiles.length} old league result(s)\n`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not clean up old logs: ${error.message}`);
    }
  }
}

export default LeagueSimulator;
