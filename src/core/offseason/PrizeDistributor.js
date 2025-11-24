/**
 * @file PrizeDistributor.js
 * @description Distributes season-end prize money to teams based on final standings
 */

/**
 * Season-end prize money structure (1st-10th graduated)
 * All amounts in USD
 */
const SEASON_PRIZES = {
  1: 5000000,   // $5M Champion
  2: 3000000,   // $3M Runner-up
  3: 2000000,   // $2M Third place
  4: 1500000,   // $1.5M Fourth place
  5: 1000000,   // $1M Fifth place
  6: 750000,    // $750K Sixth place
  7: 500000,    // $500K Seventh place
  8: 400000,    // $400K Eighth place
  9: 300000,    // $300K Ninth place
  10: 200000    // $200K Tenth place
};

class PrizeDistributor {
  constructor(financeStore) {
    this.financeStore = financeStore;
  }

  /**
   * Distribute prizes to all teams based on final standings
   * @param {Array} standings - Final league standings (sorted by position)
   * @param {Object} champion - Champion info from playoffs
   * @returns {Object} Prize distribution summary
   */
  distributePrizes(standings, champion = null) {
    console.log('\n' + '='.repeat(80));
    console.log('💰 SEASON-END PRIZE DISTRIBUTION');
    console.log('='.repeat(80));

    const prizeDistribution = [];
    let totalDistributed = 0;

    // Sort standings by final position (points, then NRR)
    const sortedStandings = [...standings].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      return b.netRunRate - a.netRunRate;
    });

    // Distribute prizes based on league position
    sortedStandings.forEach((team, idx) => {
      const position = idx + 1;
      const prize = SEASON_PRIZES[position] || 0;

      if (prize > 0) {
        // Add to team's finances
        if (this.financeStore) {
          this.financeStore.getState().addRevenue(team.clubId, {
            amount: prize,
            category: 'prize_money',
            description: `Season-end prize (${this.getPositionSuffix(position)} place)`,
            date: new Date().toISOString()
          });
        }

        prizeDistribution.push({
          position,
          clubId: team.clubId,
          clubName: team.clubName,
          prize,
          points: team.points,
          netRunRate: team.netRunRate
        });

        totalDistributed += prize;

        // Log prize
        console.log(
          `${this.getPositionSuffix(position).padEnd(5)} ${team.clubName.padEnd(25)} $${(prize / 1000000).toFixed(2)}M`
        );
      }
    });

    console.log('='.repeat(80));
    console.log(`Total Prize Money: $${(totalDistributed / 1000000).toFixed(2)}M`);
    console.log('='.repeat(80) + '\n');

    return {
      prizeDistribution,
      totalDistributed,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get position suffix (1st, 2nd, 3rd, etc.)
   * @param {number} position - Position number
   * @returns {string} Position with suffix
   */
  getPositionSuffix(position) {
    const j = position % 10;
    const k = position % 100;

    if (j === 1 && k !== 11) {
      return `${position}st`;
    }
    if (j === 2 && k !== 12) {
      return `${position}nd`;
    }
    if (j === 3 && k !== 13) {
      return `${position}rd`;
    }
    return `${position}th`;
  }

  /**
   * Calculate total prize pool
   * @returns {number} Total prize money available
   */
  getTotalPrizePool() {
    return Object.values(SEASON_PRIZES).reduce((sum, prize) => sum + prize, 0);
  }

  /**
   * Get prize for specific position
   * @param {number} position - Position (1-10)
   * @returns {number} Prize amount
   */
  getPrizeForPosition(position) {
    return SEASON_PRIZES[position] || 0;
  }

  /**
   * Generate prize structure for display
   * @returns {Array} Prize structure array
   */
  getPrizeStructure() {
    return Object.entries(SEASON_PRIZES).map(([position, amount]) => ({
      position: parseInt(position),
      amount,
      label: this.getPositionSuffix(parseInt(position)),
      formatted: `$${(amount / 1000000).toFixed(2)}M`
    }));
  }
}

export default PrizeDistributor;
