/**
 * @file OffSeasonManager.js
 * @description Orchestrates the 6-week off-season period between seasons
 *
 * Off-Season Timeline (6 weeks = 26 total weeks per season):
 * - Week 1-18: League stage
 * - Week 19-20: Playoffs
 * - Week 21: Prize distribution + Season summary
 * - Week 22-26: Transfer window (5 active weeks)
 * - Week 27 (Next Season Week 1): New season begins
 */

import PrizeDistributor from './PrizeDistributor.js';

class OffSeasonManager {
  constructor(gameStore, leagueStore, financeStore, transferManager = null, teamStore = null, playerStore = null) {
    this.gameStore = gameStore;
    this.leagueStore = leagueStore;
    this.financeStore = financeStore;
    this.transferManager = transferManager;
    this.teamStore = teamStore;
    this.playerStore = playerStore;
    this.prizeDistributor = new PrizeDistributor(financeStore);

    this.offSeasonStartWeek = 21; // Week 21 = First off-season week
    this.offSeasonEndWeek = 26;   // Week 26 = Last off-season week
    this.transferStartWeek = 22;  // Week 22 = Transfer window opens
    this.transferEndWeek = 26;    // Week 26 = Transfer window closes
  }

  /**
   * Start the off-season period
   * @param {Object} seasonResults - Final season results
   * @returns {Object} Off-season initialization result
   */
  startOffSeason(seasonResults) {
    console.log('\n' + '='.repeat(80));
    console.log('🏖️  OFF-SEASON BEGINS');
    console.log('='.repeat(80));
    console.log(`Duration: ${this.offSeasonEndWeek - this.offSeasonStartWeek + 1} weeks`);
    console.log(`Transfer Window: Week ${this.transferStartWeek}-${this.transferEndWeek}`);
    console.log('='.repeat(80) + '\n');

    // Update game phase
    if (this.gameStore) {
      this.gameStore.getState().setPhase('offseason');
    }

    // Update league stage
    if (this.leagueStore) {
      this.leagueStore.getState().setStage('offseason');
    }

    // Week 21: Distribute prizes
    const { standings, champion } = seasonResults;
    const prizeResults = this.prizeDistributor.distributePrizes(standings, champion);

    // Generate season summary
    const seasonSummary = this.generateSeasonSummary(seasonResults, prizeResults);

    return {
      phase: 'offseason',
      currentWeek: this.offSeasonStartWeek,
      prizeDistribution: prizeResults,
      seasonSummary,
      transferWindowStatus: 'pending', // Will open in week 22
      weeksRemaining: this.offSeasonEndWeek - this.offSeasonStartWeek + 1
    };
  }

  /**
   * Process a single off-season week
   * @param {number} weekNumber - Current week number (21-26)
   * @returns {Object} Week processing result
   */
  async processOffSeasonWeek(weekNumber) {
    console.log(`\n⏳ Off-Season Week ${weekNumber} (Week ${weekNumber - this.offSeasonStartWeek + 1}/6)`);

    const result = {
      weekNumber,
      events: [],
      transferActivity: null
    };

    // Week 21: Already handled in startOffSeason()
    if (weekNumber === this.offSeasonStartWeek) {
      result.events.push({
        type: 'season_summary',
        description: 'Season summary and prize distribution completed'
      });
    }

    // Week 22: Open transfer window
    if (weekNumber === this.transferStartWeek && this.transferManager) {
      console.log('🔓 Opening transfer window...');
      this.transferManager.openWindow('offSeason', 14);
      result.events.push({
        type: 'transfer_window_open',
        description: 'Transfer window is now open (5 weeks)'
      });
    }

    // Week 22-26: Process transfers
    if (weekNumber >= this.transferStartWeek && weekNumber <= this.transferEndWeek && this.transferManager) {
      console.log('💼 Processing transfer activity...');

      // Build team objects with squad arrays for AI evaluation
      const teams = this.buildTeamsWithSquads();

      const transferActivity = await this.transferManager.processWeeklyTransferCycle(
        teams,
        weekNumber
      );
      result.transferActivity = transferActivity;
      result.events.push({
        type: 'transfer_activity',
        description: `${transferActivity.completedTransfers || 0} transfers completed this week`
      });
    }

    // Week 26: Close transfer window
    if (weekNumber === this.transferEndWeek && this.transferManager) {
      console.log('🔒 Closing transfer window...');
      this.transferManager.closeWindow();
      result.events.push({
        type: 'transfer_window_closed',
        description: 'Transfer window has closed'
      });
    }

    // Last week: Prepare for new season
    if (weekNumber === this.offSeasonEndWeek) {
      result.events.push({
        type: 'season_preparation',
        description: 'Preparing for new season'
      });
    }

    return result;
  }

  /**
   * Build team objects with populated squad arrays for transfer AI evaluation
   * @returns {Array} Teams with squad player objects
   */
  buildTeamsWithSquads() {
    const clubs = this.leagueStore.getState().clubs || {};
    const squadLists = this.teamStore ? this.teamStore.getState().squadLists : {};
    const players = this.playerStore ? this.playerStore.getState().players : {};

    return Object.values(clubs).map(club => {
      const squadIds = squadLists[club.id] || [];
      const squad = squadIds
        .map(id => players[id])
        .filter(Boolean);

      return {
        ...club,
        squad
      };
    });
  }

  /**
   * Check if re-auction should be triggered (even seasons)
   * @param {number} seasonNumber - Current season number
   * @returns {boolean} True if re-auction should happen
   */
  shouldTriggerReAuction(seasonNumber) {
    // Re-auction every 2 seasons (even-numbered seasons)
    return seasonNumber % 2 === 0;
  }

  /**
   * Complete off-season and prepare for new season
   * @param {number} nextSeasonNumber - Next season number
   * @returns {Object} Transition result
   */
  completeOffSeason(nextSeasonNumber) {
    console.log('\n' + '='.repeat(80));
    console.log('✅ OFF-SEASON COMPLETE');
    console.log('='.repeat(80));

    const needsReAuction = this.shouldTriggerReAuction(nextSeasonNumber);

    if (needsReAuction) {
      console.log('🔔 RE-AUCTION REQUIRED: Even-numbered season');
      console.log('   Teams must retain 3-8 players before auction');
    } else {
      console.log('✨ Ready to start Season', nextSeasonNumber);
    }

    console.log('='.repeat(80) + '\n');

    return {
      offSeasonComplete: true,
      nextSeasonNumber,
      requiresReAuction: needsReAuction,
      nextPhase: needsReAuction ? 'retention' : 'preseason'
    };
  }

  /**
   * Generate comprehensive season summary
   * @param {Object} seasonResults - Season results
   * @param {Object} prizeResults - Prize distribution results
   * @returns {Object} Season summary
   */
  generateSeasonSummary(seasonResults, prizeResults) {
    const { standings, champion, playoffResults, statistics } = seasonResults;

    // Sort standings for final positions
    const sortedStandings = [...standings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.netRunRate - a.netRunRate;
    });

    // Calculate season statistics
    const totalMatches = sortedStandings.reduce((sum, team) => sum + team.played, 0) / 2;
    const averageScore = sortedStandings.reduce((sum, team) => sum + team.runsScored, 0) / totalMatches / 2;

    return {
      seasonComplete: true,
      champion: champion ? {
        teamId: champion.championId,
        teamName: champion.championName,
        runnerUp: champion.runnerUpName,
        margin: champion.margin
      } : null,
      standings: sortedStandings.map((team, idx) => ({
        position: idx + 1,
        teamId: team.clubId,
        teamName: team.clubName,
        points: team.points,
        netRunRate: team.netRunRate,
        prize: prizeResults.prizeDistribution[idx]?.prize || 0
      })),
      statistics: {
        totalMatches,
        averageScore: Math.round(averageScore),
        highestScore: statistics?.highestScore || null,
        lowestScore: statistics?.lowestScore || null
      },
      playoffSummary: playoffResults ? {
        qualifier1Winner: playoffResults.q1?.winner || null,
        eliminatorWinner: playoffResults.eliminator?.winner || null,
        finalist1: champion?.championId || null,
        finalist2: champion?.runnerUpId || null
      } : null,
      prizePool: prizeResults.totalDistributed,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current off-season status
   * @param {number} currentWeek - Current week number
   * @returns {Object} Off-season status
   */
  getOffSeasonStatus(currentWeek) {
    if (currentWeek < this.offSeasonStartWeek) {
      return {
        inOffSeason: false,
        status: 'season_active'
      };
    }

    if (currentWeek > this.offSeasonEndWeek) {
      return {
        inOffSeason: false,
        status: 'season_active'
      };
    }

    const weeksCompleted = currentWeek - this.offSeasonStartWeek;
    const weeksRemaining = this.offSeasonEndWeek - currentWeek;

    return {
      inOffSeason: true,
      status: 'offseason',
      currentWeek,
      weeksCompleted,
      weeksRemaining,
      transferWindowOpen: currentWeek >= this.transferStartWeek && currentWeek <= this.transferEndWeek,
      transferWeeksRemaining: currentWeek < this.transferEndWeek ? this.transferEndWeek - currentWeek : 0
    };
  }

  /**
   * Get off-season schedule/calendar
   * @returns {Array} Off-season events schedule
   */
  getOffSeasonSchedule() {
    return [
      {
        week: 21,
        title: 'Season Summary',
        description: 'Prize distribution and season review',
        type: 'summary'
      },
      {
        week: 22,
        title: 'Transfer Window Opens',
        description: 'Begin squad building for next season',
        type: 'transfer_start'
      },
      {
        week: 23,
        title: 'Transfer Activity',
        description: 'Active transfer negotiations',
        type: 'transfer'
      },
      {
        week: 24,
        title: 'Transfer Activity',
        description: 'Active transfer negotiations',
        type: 'transfer'
      },
      {
        week: 25,
        title: 'Transfer Activity',
        description: 'Active transfer negotiations',
        type: 'transfer'
      },
      {
        week: 26,
        title: 'Transfer Window Closes',
        description: 'Final transfers and season preparation',
        type: 'transfer_end'
      }
    ];
  }
}

export default OffSeasonManager;
