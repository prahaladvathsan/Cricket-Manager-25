import financeConfig from '../../data/config/financeConfig.json';

/**
 * FinanceEngine - Core financial management system
 *
 * Responsibilities:
 * - Initialize team finances at season start
 * - Process all financial transactions (auction, transfers, prizes, revenues)
 * - Calculate and distribute revenues
 * - Validate budget constraints
 * - Generate financial reports
 */
export default class FinanceEngine {
  constructor() {
    this.config = financeConfig;
    this.teamFinances = new Map(); // teamId -> finance object
    this.transactionHistory = []; // All transactions for audit
    this.seasonId = null;
    this.seasonStartDate = null;
  }

  /**
   * Initialize finances for a new season
   * @param {Array} teams - Array of team objects
   * @param {string} seasonId - Unique season identifier
   * @param {Object} previousSeasonStandings - Previous season final standings (for sponsorship)
   * @returns {Object} - Initialized finance state
   */
  initializeSeasonFinances(teams, seasonId, previousSeasonStandings = null) {
    this.seasonId = seasonId;
    this.seasonStartDate = new Date().toISOString();
    this.teamFinances.clear();
    this.transactionHistory = [];

    teams.forEach(team => {
      // Calculate sponsorship revenue based on previous season standing
      const previousPosition = previousSeasonStandings?.[team.id] || 5; // Default to mid-table
      const sponsorshipRevenue = this.calculateSponsorshipRevenue(previousPosition);

      const initialBudget = this.config.initialBudgets.seasonStart + sponsorshipRevenue;

      this.teamFinances.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        currentBudget: initialBudget,
        initialBudget: this.config.initialBudgets.seasonStart,
        annualBudget: initialBudget, // Total budget before salaries (used for budget penalty calc)

        // Revenue tracking
        totalRevenue: sponsorshipRevenue,
        sponsorshipRevenue,
        ticketRevenue: 0,
        broadcastRevenue: 0,
        prizeMoneyWins: 0,
        prizeMoneySeasonEnd: 0,

        // Expense tracking
        totalExpenses: 0,
        auctionSpending: 0,
        transferSpending: 0,
        transferEarnings: 0, // Money received from selling players
        salaryExpenses: 0,
        releaseEarnings: 0,

        // Performance tracking (for revenue calculation)
        matchesPlayed: 0,
        homeMatchesPlayed: 0,
        wins: 0,
        losses: 0,
        recentForm: [], // Last 5 results for ticket revenue calculation
        currentStanding: 5, // Updated after each match week

        // Transaction IDs for this team
        transactionIds: []
      });

      // Record sponsorship revenue transaction
      this.recordTransaction({
        type: 'revenue_sponsorship',
        teamId: team.id,
        amount: sponsorshipRevenue,
        description: `Season sponsorship deal (based on previous season position: ${previousPosition})`,
        metadata: { previousPosition }
      });
    });

    return this.getFinancialSummary();
  }

  /**
   * Calculate sponsorship revenue based on previous season standing
   * @param {number} position - Final position from previous season (1-10)
   * @returns {number} - Sponsorship amount
   */
  calculateSponsorshipRevenue(position) {
    const amounts = this.config.revenueStreams.sponsorship.amounts;
    return amounts[Math.min(position, 10)] || amounts[10];
  }

  /**
   * Record a financial transaction
   * @param {Object} transaction - Transaction details
   * @returns {string} - Transaction ID
   */
  recordTransaction(transaction) {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullTransaction = {
      id: transactionId,
      timestamp: new Date().toISOString(),
      seasonId: this.seasonId,
      ...transaction
    };

    this.transactionHistory.push(fullTransaction);

    // Add transaction ID to team's transaction list
    if (transaction.teamId) {
      const finance = this.teamFinances.get(transaction.teamId);
      if (finance) {
        finance.transactionIds.push(transactionId);
      }
    }

    return transactionId;
  }

  /**
   * Process auction spending for a team
   * @param {string} teamId - Team identifier
   * @param {number} amount - Amount spent at auction
   * @param {Array} playersPurchased - Array of player objects purchased
   * @returns {boolean} - Success status
   */
  processAuctionSpending(teamId, amount, playersPurchased = []) {
    const finance = this.teamFinances.get(teamId);
    if (!finance) {
      console.error(`Team ${teamId} not found in finance system`);
      return false;
    }

    // Validate budget
    if (amount > finance.currentBudget) {
      console.error(`Team ${teamId} cannot afford auction spending of $${(amount / 1000000).toFixed(1)}M`);
      return false;
    }

    // Update finances
    finance.currentBudget -= amount;
    finance.auctionSpending += amount;
    finance.totalExpenses += amount;

    // Record transaction
    this.recordTransaction({
      type: 'expense_auction',
      teamId,
      amount: amount,
      description: `Auction spending: ${playersPurchased.length} players purchased`,
      metadata: {
        playerCount: playersPurchased.length,
        playerIds: playersPurchased
      }
    });

    return true;
  }

  /**
   * Award prize money for a match win
   * @param {string} teamId - Winning team ID
   * @returns {number} - Prize money awarded
   */
  awardMatchWinPrize(teamId) {
    const finance = this.teamFinances.get(teamId);
    if (!finance) return 0;

    const prizeAmount = this.config.prizeMoneyPerWin.amount;

    finance.currentBudget += prizeAmount;
    finance.prizeMoneyWins += prizeAmount;
    finance.totalRevenue += prizeAmount;
    finance.wins++;

    this.recordTransaction({
      type: 'revenue_match_win',
      teamId,
      amount: prizeAmount,
      description: `Match win prize ($${prizeAmount})`
    });

    return prizeAmount;
  }

  /**
   * Update match result for revenue calculations
   * @param {string} teamId - Team ID
   * @param {boolean} won - Did team win?
   * @param {boolean} isHomeMatch - Was it a home match?
   * @param {number} currentStanding - Current league position
   */
  updateMatchResult(teamId, won, isHomeMatch = false, currentStanding = null) {
    const finance = this.teamFinances.get(teamId);
    if (!finance) return;

    finance.matchesPlayed++;
    if (isHomeMatch) finance.homeMatchesPlayed++;
    if (!won) finance.losses++;

    // Update recent form (for ticket revenue calculation)
    finance.recentForm.push(won ? 'W' : 'L');
    if (finance.recentForm.length > 5) {
      finance.recentForm.shift(); // Keep only last 5 results
    }

    // Update standing (for broadcast revenue calculation)
    if (currentStanding !== null) {
      finance.currentStanding = currentStanding;
    }
  }

  /**
   * Calculate and award ticket revenue for a home match
   * @param {string} teamId - Home team ID
   * @returns {number} - Ticket revenue
   */
  calculateTicketRevenue(teamId) {
    const finance = this.teamFinances.get(teamId);
    if (!finance) return 0;

    const config = this.config.revenueStreams.matchTickets;
    let revenue = config.baseRevenue;

    // Performance bonus based on recent form
    const recentWins = finance.recentForm.filter(r => r === 'W').length;
    const recentLosses = finance.recentForm.filter(r => r === 'L').length;

    revenue += (recentWins * config.performanceBonus.perWin);
    revenue += (recentLosses * config.performanceBonus.perLoss);

    // Ensure non-negative
    revenue = Math.max(revenue, 5000);

    finance.currentBudget += revenue;
    finance.ticketRevenue += revenue;
    finance.totalRevenue += revenue;

    this.recordTransaction({
      type: 'revenue_tickets',
      teamId,
      amount: revenue,
      description: `Home match ticket revenue`,
      metadata: {
        recentForm: finance.recentForm.join(''),
        recentWins,
        recentLosses
      }
    });

    return revenue;
  }

  /**
   * Calculate and award broadcast revenue for a match
   * @param {string} teamId - Team ID
   * @returns {number} - Broadcast revenue
   */
  calculateBroadcastRevenue(teamId) {
    const finance = this.teamFinances.get(teamId);
    if (!finance) return 0;

    const config = this.config.revenueStreams.broadcastRights;
    let revenue = config.baseRevenue;

    // Performance multiplier based on current standing
    const multipliers = config.performanceMultiplier;
    if (finance.currentStanding <= 4) {
      revenue *= multipliers.top4;
    } else if (finance.currentStanding <= 7) {
      revenue *= multipliers.top7;
    } else {
      revenue *= multipliers.bottom3;
    }

    revenue = Math.round(revenue);

    finance.currentBudget += revenue;
    finance.broadcastRevenue += revenue;
    finance.totalRevenue += revenue;

    this.recordTransaction({
      type: 'revenue_broadcast',
      teamId,
      amount: revenue,
      description: `Broadcast rights revenue`,
      metadata: {
        standing: finance.currentStanding
      }
    });

    return revenue;
  }

  /**
   * Distribute end-of-season prize money
   * @param {Array} finalStandings - Array of {teamId, position} ordered by final standing
   * @returns {Object} - Prize distribution summary
   */
  distributeSeasonEndPrizes(finalStandings) {
    const prizes = this.config.seasonEndPrizes.prizes;
    const distribution = {};

    finalStandings.forEach(({teamId, position}) => {
      let prizeAmount = 0;

      if (position <= 4) {
        prizeAmount = prizes[position].amount;
      } else {
        prizeAmount = prizes[5].amount; // 5th-10th place prize
      }

      if (prizeAmount > 0) {
        const finance = this.teamFinances.get(teamId);
        if (finance) {
          finance.currentBudget += prizeAmount;
          finance.prizeMoneySeasonEnd += prizeAmount;
          finance.totalRevenue += prizeAmount;

          this.recordTransaction({
            type: 'revenue_season_end_prize',
            teamId,
            amount: prizeAmount,
            description: `Season end prize: ${prizes[position <= 4 ? position : 5].position}`,
            metadata: { finalPosition: position }
          });

          distribution[teamId] = {
            position,
            prize: prizeAmount,
            teamName: finance.teamName
          };
        }
      }
    });

    return distribution;
  }

  /**
   * Process a transfer purchase
   * @param {string} buyerTeamId - Buying team
   * @param {string} sellerTeamId - Selling team (null if free agent)
   * @param {Object} player - Player object
   * @param {number} transferFee - Transfer fee amount
   * @returns {boolean} - Success status
   */
  processTransferPurchase(buyerTeamId, sellerTeamId, player, transferFee) {
    const buyerFinance = this.teamFinances.get(buyerTeamId);
    if (!buyerFinance) return false;

    // Half-price economics: transferFee = full annual salary (winning bid)
    // Actual money exchanged is half (half-year salary)
    const halfFee = Math.round(transferFee / 2);

    // Validate buyer budget against half fee
    if (halfFee > buyerFinance.currentBudget) {
      console.error(`Team ${buyerTeamId} cannot afford transfer fee of $${halfFee} (half of $${transferFee})`);
      return false;
    }

    // Deduct half fee from buyer
    buyerFinance.currentBudget -= halfFee;
    buyerFinance.transferSpending += halfFee;
    buyerFinance.totalExpenses += halfFee;

    this.recordTransaction({
      type: 'expense_transfer_purchase',
      teamId: buyerTeamId,
      amount: -halfFee,
      description: `Purchased ${player.name}${sellerTeamId ? ` from ${sellerTeamId}` : ''} (half-year salary)`,
      metadata: {
        playerId: player.id,
        sellerTeamId,
        transferFee,
        halfFee
      }
    });

    // Credit seller half fee if applicable
    if (sellerTeamId) {
      const sellerFinance = this.teamFinances.get(sellerTeamId);
      if (sellerFinance) {
        sellerFinance.currentBudget += halfFee;
        sellerFinance.transferEarnings += halfFee;
        sellerFinance.totalRevenue += halfFee;

        this.recordTransaction({
          type: 'revenue_transfer_sale',
          teamId: sellerTeamId,
          amount: halfFee,
          description: `Sold ${player.name} to ${buyerTeamId} (half-year salary)`,
          metadata: {
            playerId: player.id,
            buyerTeamId,
            transferFee,
            halfFee
          }
        });
      }
    }

    return true;
  }

  /**
   * Deduct squad salaries for a team at season start
   * @param {string} teamId - Team ID
   * @param {number} totalSalary - Total squad salary (sum of soldPrice)
   * @returns {boolean} Success status
   */
  deductSquadSalaries(teamId, totalSalary) {
    const finance = this.teamFinances.get(teamId);
    if (!finance) return false;

    finance.currentBudget -= totalSalary;
    finance.salaryExpenses = totalSalary;
    finance.totalExpenses += totalSalary;

    this.recordTransaction({
      type: 'expense_salary',
      teamId,
      amount: -totalSalary,
      description: `Squad salary deduction for season`,
      metadata: { totalSalary }
    });

    return true;
  }

  /**
   * Process a player release — recoup 30% of half-year salary
   * @param {string} teamId - Team releasing the player
   * @param {Object} player - Player being released
   * @returns {number} Amount recouped
   */
  processPlayerRelease(teamId, player) {
    const finance = this.teamFinances.get(teamId);
    if (!finance) return 0;

    const soldPrice = player.soldPrice || 0;
    const recoup = Math.round(soldPrice * 0.5 * 0.3); // 30% of half-year salary

    finance.currentBudget += recoup;
    finance.releaseEarnings = (finance.releaseEarnings || 0) + recoup;
    finance.totalRevenue += recoup;

    this.recordTransaction({
      type: 'revenue_player_release',
      teamId,
      amount: recoup,
      description: `Released ${player.name} (recouped $${(recoup / 1000).toFixed(0)}K)`,
      metadata: {
        playerId: player.id,
        soldPrice,
        recoup
      }
    });

    return recoup;
  }

  /**
   * Get current budget for a team
   * @param {string} teamId - Team ID
   * @returns {number} - Current budget
   */
  getTeamBudget(teamId) {
    const finance = this.teamFinances.get(teamId);
    return finance ? finance.currentBudget : 0;
  }

  /**
   * Get complete financial details for a team
   * @param {string} teamId - Team ID
   * @returns {Object|null} - Finance object or null
   */
  getTeamFinances(teamId) {
    return this.teamFinances.get(teamId) || null;
  }

  /**
   * Get all team finances as an array
   * @returns {Array} - Array of finance objects
   */
  getAllTeamFinances() {
    return Array.from(this.teamFinances.values());
  }

  /**
   * Get financial summary for all teams
   * @returns {Object} - Summary object
   */
  getFinancialSummary() {
    const teams = this.getAllTeamFinances();

    return {
      seasonId: this.seasonId,
      totalTeams: teams.length,
      totalBudget: teams.reduce((sum, t) => sum + t.currentBudget, 0),
      totalRevenue: teams.reduce((sum, t) => sum + t.totalRevenue, 0),
      totalExpenses: teams.reduce((sum, t) => sum + t.totalExpenses, 0),
      totalTransactions: this.transactionHistory.length,
      teams: teams.map(t => ({
        teamId: t.teamId,
        teamName: t.teamName,
        currentBudget: t.currentBudget,
        totalRevenue: t.totalRevenue,
        totalExpenses: t.totalExpenses,
        netPosition: t.currentBudget - t.initialBudget
      }))
    };
  }

  /**
   * Get transaction history for a specific team
   * @param {string} teamId - Team ID
   * @returns {Array} - Array of transactions
   */
  getTeamTransactionHistory(teamId) {
    return this.transactionHistory.filter(txn => txn.teamId === teamId);
  }

  /**
   * Get all transactions of a specific type
   * @param {string} type - Transaction type
   * @returns {Array} - Array of transactions
   */
  getTransactionsByType(type) {
    return this.transactionHistory.filter(txn => txn.type === type);
  }

  /**
   * Validate if team can afford an expense
   * @param {string} teamId - Team ID
   * @param {number} amount - Expense amount
   * @returns {Object} - {canAfford: boolean, currentBudget: number, shortfall: number}
   */
  validateBudget(teamId, amount) {
    const finance = this.teamFinances.get(teamId);
    if (!finance) {
      return { canAfford: false, currentBudget: 0, shortfall: amount };
    }

    const canAfford = finance.currentBudget >= amount;
    const shortfall = canAfford ? 0 : amount - finance.currentBudget;

    return {
      canAfford,
      currentBudget: finance.currentBudget,
      shortfall,
      belowReserve: finance.currentBudget - amount < this.config.budgetLimits.minimumReserve.amount
    };
  }

  /**
   * Generate a detailed financial report for a team
   * @param {string} teamId - Team ID
   * @returns {Object|null} - Detailed report
   */
  generateTeamReport(teamId) {
    const finance = this.getTeamFinances(teamId);
    if (!finance) return null;

    const transactions = this.getTeamTransactionHistory(teamId);

    return {
      team: {
        id: finance.teamId,
        name: finance.teamName
      },
      budgets: {
        initial: finance.initialBudget,
        current: finance.currentBudget,
        change: finance.currentBudget - finance.initialBudget,
        changePercentage: ((finance.currentBudget - finance.initialBudget) / finance.initialBudget * 100).toFixed(2)
      },
      revenues: {
        total: finance.totalRevenue,
        breakdown: {
          sponsorship: finance.sponsorshipRevenue,
          tickets: finance.ticketRevenue,
          broadcast: finance.broadcastRevenue,
          prizeMoneyWins: finance.prizeMoneyWins,
          prizeMoneySeasonEnd: finance.prizeMoneySeasonEnd,
          transferSales: finance.transferEarnings,
          playerReleases: finance.releaseEarnings || 0
        }
      },
      expenses: {
        total: finance.totalExpenses,
        breakdown: {
          auction: finance.auctionSpending,
          transfers: finance.transferSpending,
          salaries: finance.salaryExpenses || 0
        }
      },
      performance: {
        matchesPlayed: finance.matchesPlayed,
        homeMatchesPlayed: finance.homeMatchesPlayed,
        wins: finance.wins,
        losses: finance.losses,
        recentForm: finance.recentForm.join(''),
        currentStanding: finance.currentStanding
      },
      transactions: {
        count: transactions.length,
        recent: transactions.slice(-10) // Last 10 transactions
      }
    };
  }
}
