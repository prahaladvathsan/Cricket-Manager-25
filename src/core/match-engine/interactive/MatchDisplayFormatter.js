/**
 * @file MatchDisplayFormatter.js
 * @description Handles all console display formatting for interactive matches
 * Centralized UI display logic to avoid repetition and improve maintainability
 */

class MatchDisplayFormatter {
  constructor(playerStore) {
    this.playerStore = playerStore;
  }

  /**
   * Format player name as "F. LastName" for compact display
   * @param {string} fullName - Full player name
   * @returns {string} Formatted name with first initial
   */
  formatCompactName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return fullName; // Single name, return as is

    const firstInitial = parts[0][0];
    const lastName = parts[parts.length - 1];
    return `${firstInitial}. ${lastName}`;
  }

  /**
   * Get player rating display string
   * @param {Object} player - Player object
   * @returns {string} Formatted rating display
   */
  getPlayerRatingDisplay(player) {
    const battingRating = player.topPlaystyles?.batting?.[0]?.rating;
    const bowlingRating = player.topPlaystyles?.bowling?.[0]?.rating;

    const batStr = battingRating ? battingRating.toFixed(1) : 'N/A';
    const bowStr = bowlingRating ? bowlingRating.toFixed(1) : 'N/A';
    return `Bat: ${batStr} | Bow: ${bowStr}`;
  }

  /**
   * Get player playstyle display string
   * @param {Object} player - Player object
   * @returns {string} Formatted playstyle display
   */
  getPlayerPlaystyleDisplay(player) {
    const battingStyle = player.primaryPlaystyle?.batting || player.topPlaystyles?.batting?.[0]?.name;
    const bowlingStyle = player.primaryPlaystyle?.bowling || player.topPlaystyles?.bowling?.[0]?.name;

    if (player.role === 'bowler') {
      return bowlingStyle || 'N/A';
    } else if (player.role === 'all-rounder') {
      const batStyle = battingStyle || 'N/A';
      const bowStyle = bowlingStyle || 'N/A';
      return `${batStyle} / ${bowStyle}`;
    } else {
      return battingStyle || 'N/A';
    }
  }

  /**
   * Display squad composition summary
   * @param {Object} team - Team object with fullSquad
   */
  displaySquadComposition(team) {
    console.log(`\n${team.name} Squad (25 players):`);

    const byRole = {
      'batsman': team.fullSquad.filter(p => p.role === 'batsman'),
      'bowler': team.fullSquad.filter(p => p.role === 'bowler'),
      'all-rounder': team.fullSquad.filter(p => p.role === 'all-rounder'),
      'wicket-keeper': team.fullSquad.filter(p => p.role === 'wicket-keeper')
    };

    console.log(`  Batsmen: ${byRole.batsman.length} | Bowlers: ${byRole.bowler.length} | All-rounders: ${byRole['all-rounder'].length} | Keepers: ${byRole['wicket-keeper'].length}`);

    console.log('\n  First 5 players:');
    team.fullSquad.slice(0, 5).forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.name.padEnd(25)} ${p.role.padEnd(15)} ${this.getPlayerRatingDisplay(p)}`);
    });
    console.log('    ... (20 more players)');
  }

  /**
   * Display playing 11 composition
   * @param {Object} team - Team object with players array
   */
  displayTeamComposition(team) {
    console.log(`\n${team.name}:`);
    team.players.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name.padEnd(25)} ${p.role.padEnd(15)} ${this.getPlayerRatingDisplay(p)}`);
    });

    const bowlers = team.players.filter(p => p.role === 'bowler').length;
    const allRounders = team.players.filter(p => p.role === 'all-rounder').length;
    const batsmen = team.players.filter(p => p.role === 'batsman').length;
    const keepers = team.players.filter(p => p.role === 'wicket-keeper').length;

    console.log(`\n  Composition: ${batsmen} Batsmen, ${allRounders} All-rounders, ${bowlers} Bowlers, ${keepers} Keeper(s)`);
    console.log(`  Bowling options: ${bowlers + allRounders}`);
  }

  /**
   * Display squad selection table (for manual selection)
   * @param {Array} available - Available players
   * @param {Array} selected - Already selected players
   */
  displaySquadSelectionTable(available, selected) {
    console.log(`\n${'='.repeat(140)}`);
    console.log(`SQUAD SELECTION - ${selected.length}/11 Players Selected`);
    console.log('='.repeat(140));
    console.log(`${'SEL'.padEnd(5)} ${'#'.padEnd(4)} ${'PLAYER NAME'.padEnd(25)} ${'ROLE'.padEnd(17)} ${'RATING'.padEnd(25)} ${'PLAYSTYLE'.padEnd(45)}`);
    console.log('-'.repeat(140));

    available.forEach((p, i) => {
      const isSelected = selected.includes(p);
      const marker = isSelected ? '[✓]' : '[ ]';
      const num = (i + 1).toString().padStart(2);
      const name = p.name.padEnd(25);
      const role = p.role.padEnd(17);
      const rating = this.getPlayerRatingDisplay(p).padEnd(25);
      const playstyle = this.getPlayerPlaystyleDisplay(p).padEnd(45);
      console.log(`${marker.padEnd(5)} ${num.padEnd(4)} ${name} ${role} ${rating} ${playstyle}`);
    });

    console.log('='.repeat(140));
    console.log(`Selected: ${selected.length}/11`);
    if (selected.length > 0) {
      const selectedNames = selected.map(p => p.name).join(', ');
      console.log(`Players: ${selectedNames}`);
    }
    console.log('='.repeat(140));
  }

  /**
   * Display ball situation header
   * @param {Object} matchState - Current match state
   * @param {string} currentFieldFormation - Current field formation
   */
  displayBallHeader(matchState, currentFieldFormation) {
    const { currentBall, innings, teams, tacticsState } = matchState;

    const striker = this.playerStore.getState().getPlayer(innings.striker);
    const nonStriker = this.playerStore.getState().getPlayer(innings.nonStriker);
    const bowler = this.playerStore.getState().getPlayer(innings.bowler);

    console.log('\n' + '-'.repeat(80));
    console.log(`📊 Over ${currentBall.over}.${currentBall.ball + 1}`);
    console.log('-'.repeat(80));

    // Score
    const totalBalls = currentBall.over * 6 + currentBall.ball;
    const runRate = totalBalls > 0 ? (teams.batting.totalScore / totalBalls * 6).toFixed(2) : '0.00';

    let scoreDisplay = `Score: ${teams.batting.totalScore}/${teams.batting.wickets} (${currentBall.over}.${currentBall.ball} overs) | RR: ${runRate}`;

    if (innings.number === 2) {
      const required = innings.target - teams.batting.totalScore;
      const ballsLeft = currentBall.matchSituation.ballsLeft || 0;
      const reqRunRate = ballsLeft > 0 ? (required / ballsLeft * 6).toFixed(2) : '0.00';
      scoreDisplay += ` | Target: ${innings.target} | Need: ${required} from ${ballsLeft} balls | RRR: ${reqRunRate}`;
    }

    console.log(scoreDisplay);

    // Players
    console.log(`Bowling: ${bowler.name} (${bowler.bowlingType}) to ${striker.name}* | Other: ${nonStriker.name}`);

    // Tactics
    const battingTier = tacticsState.currentAcceleration?.striker || 'Unknown';
    const bowlerPlans = tacticsState.bowlingPlans?.[bowler.id] || bowler.tactics?.defaultBowlingPlans || {
      lineLength: 'Wide Line',
      variation: 'Consistent Accuracy'
    };

    console.log(`Tactics: [Batting: ${battingTier}] [Bowling: ${bowlerPlans.lineLength}, ${bowlerPlans.variation}] [Field: ${currentFieldFormation}]`);

    // Pressure
    const pressure = tacticsState.pressureIndex;
    console.log(`Pressure: Batting ${pressure.batting} | Bowling ${pressure.bowling}`);
    console.log('-'.repeat(80));
  }

  /**
   * Display full match scorecard
   * @param {Object} matchState - Match state
   * @param {Object} battingFirst - First batting team
   * @param {Object} bowlingFirst - First bowling team
   */
  displayFullStats(matchState, battingFirst, bowlingFirst) {
    const { ballByBall, innings } = matchState;

    // Separate ball-by-ball data by innings
    const firstInningsData = ballByBall.filter(ball => ball.innings === 1);
    const secondInningsData = ballByBall.filter(ball => ball.innings === 2);

    console.log('\n' + '='.repeat(115));
    console.log('📊 MATCH SCORECARD'.padStart(62));
    console.log('='.repeat(115));

    // Display first innings
    this.displayInningsScorecard(battingFirst, bowlingFirst, firstInningsData, 1);

    // Display second innings if it exists
    if (secondInningsData.length > 0 || innings.number === 2) {
      this.displayInningsScorecard(bowlingFirst, battingFirst, secondInningsData, 2);
    }

    console.log('='.repeat(115));
  }

  /**
   * Display innings scorecard (batting and bowling figures)
   * @param {Object} battingTeam - Batting team
   * @param {Object} bowlingTeam - Bowling team
   * @param {Array} inningsData - Ball-by-ball data for this innings
   * @param {number} inningsNum - Innings number
   */
  displayInningsScorecard(battingTeam, bowlingTeam, inningsData, inningsNum) {
    console.log(`\n${battingTeam.name} Innings`.toUpperCase());
    console.log('-'.repeat(115));

    // Calculate batting stats
    const battingStats = {};
    inningsData.forEach(ball => {
      if (!battingStats[ball.striker]) {
        battingStats[ball.striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: '', bowlerName: '', fielderName: '', dismissalType: '' };
      }
      if (ball.isLegal) {
        battingStats[ball.striker].runs += ball.runs;
        battingStats[ball.striker].balls += 1;
        if (ball.runs === 4) battingStats[ball.striker].fours += 1;
        if (ball.runs === 6) battingStats[ball.striker].sixes += 1;
      }
      if (ball.isWicket && ball.dismissalType) {
        battingStats[ball.striker].out = true;
        battingStats[ball.striker].dismissalType = ball.dismissalType;

        // Get bowler name - try ball.bowlerName first, then look up from store
        let bowlerName = ball.bowlerName;
        if (!bowlerName && ball.bowler) {
          const bowlerPlayer = this.playerStore.getState().getPlayer(ball.bowler);
          bowlerName = bowlerPlayer ? bowlerPlayer.name : 'Unknown';
        }
        battingStats[ball.striker].bowlerName = bowlerName || 'Unknown';

        // Get fielder name - try ball.fielderName first, then look up from store
        let fielderName = ball.fielderName;
        if (!fielderName && ball.fielderId) {
          const fielderPlayer = this.playerStore.getState().getPlayer(ball.fielderId);
          fielderName = fielderPlayer ? fielderPlayer.name : '';
        }
        battingStats[ball.striker].fielderName = fielderName || '';
      }
    });

    // Display batting scorecard
    console.log(`${'BATSMAN'.padEnd(25)} ${'Dismissal'.padEnd(35)} ${'R'.padStart(4)} ${'B'.padStart(4)} ${'4s'.padStart(3)} ${'6s'.padStart(3)} ${'SR'.padStart(6)}`);
    console.log('-'.repeat(115));

    // Sort batsmen by appearance order
    const sortedBatsmen = Object.keys(battingStats)
      .map(id => ({
        player: this.playerStore.getState().getPlayer(id),
        stats: battingStats[id]
      }))
      .sort((a, b) => {
        const aFirstBall = inningsData.findIndex(ball => ball.striker === a.player.id);
        const bFirstBall = inningsData.findIndex(ball => ball.striker === b.player.id);
        return aFirstBall - bFirstBall;
      });

    sortedBatsmen.forEach(({ player, stats }) => {
      const sr = stats.balls > 0 ? (stats.runs / stats.balls * 100).toFixed(1) : '0.0';

      // Format dismissal according to cricket scorecard conventions
      // Use compact names (First Initial. Last Name) to save space
      let dismissal = 'not out';
      if (stats.out) {
        const dismissalType = stats.dismissalType;
        const bowler = this.formatCompactName(stats.bowlerName);
        const fielder = this.formatCompactName(stats.fielderName);

        if (dismissalType === 'bowled') {
          dismissal = `b ${bowler}`;
        } else if (dismissalType === 'caught') {
          dismissal = `c ${fielder} b ${bowler}`;
        } else if (dismissalType === 'caught_behind') {
          dismissal = `c ${fielder} b ${bowler}`;
        } else if (dismissalType === 'lbw') {
          dismissal = `lbw b ${bowler}`;
        } else if (dismissalType === 'stumped') {
          dismissal = `st ${fielder} b ${bowler}`;
        } else if (dismissalType === 'run_out') {
          dismissal = fielder ? `run out (${fielder})` : 'run out';
        } else {
          dismissal = dismissalType; // Fallback
        }
      }

      console.log(`${player.name.padEnd(25)} ${dismissal.padEnd(35)} ${stats.runs.toString().padStart(4)} ${stats.balls.toString().padStart(4)} ${stats.fours.toString().padStart(3)} ${stats.sixes.toString().padStart(3)} ${sr.padStart(6)}`);
    });

    // Calculate totals
    const totalRuns = Object.values(battingStats).reduce((sum, s) => sum + s.runs, 0);
    const totalWickets = Object.values(battingStats).filter(s => s.out).length;
    const legalBalls = inningsData.filter(b => b.isLegal);
    const totalOvers = Math.floor(legalBalls.length / 6);
    const totalBalls = legalBalls.length % 6;
    const runRate = legalBalls.length > 0 ? (totalRuns / legalBalls.length * 6).toFixed(2) : '0.00';

    console.log('-'.repeat(115));
    console.log(`${'TOTAL'.padEnd(25)} ${`${totalWickets}/10`.padEnd(35)} ${totalRuns.toString().padStart(4)} ${''.padStart(4)} ${''.padStart(3)} ${''.padStart(3)} ${''.padStart(6)}`);
    console.log(`Overs: ${totalOvers}.${totalBalls} | Run Rate: ${runRate}`);
    console.log('');

    // Display bowling figures
    console.log(`${bowlingTeam.name} Bowling:`.toUpperCase());
    console.log('-'.repeat(115));
    console.log(`${'BOWLER'.padEnd(25)} ${'O'.padStart(5)} ${'M'.padStart(3)} ${'R'.padStart(4)} ${'W'.padStart(3)} ${'Econ'.padStart(6)} ${'Dots'.padStart(5)}`);
    console.log('-'.repeat(115));

    const bowlingStats = {};
    inningsData.forEach(ball => {
      if (!bowlingStats[ball.bowler]) {
        bowlingStats[ball.bowler] = { balls: 0, runs: 0, wickets: 0, dots: 0, maidens: 0 };
      }
      if (ball.isLegal) {
        bowlingStats[ball.bowler].balls += 1;
        if (ball.runs === 0) bowlingStats[ball.bowler].dots += 1;
      }
      bowlingStats[ball.bowler].runs += ball.runs;
      if (ball.isWicket) bowlingStats[ball.bowler].wickets += 1;
    });

    // Sort bowlers by appearance order
    const sortedBowlers = Object.entries(bowlingStats)
      .map(([playerId, stats]) => ({
        player: this.playerStore.getState().getPlayer(playerId),
        stats
      }))
      .sort((a, b) => {
        const aFirstBall = inningsData.findIndex(ball => ball.bowler === a.player.id);
        const bFirstBall = inningsData.findIndex(ball => ball.bowler === b.player.id);
        return aFirstBall - bFirstBall;
      });

    sortedBowlers.forEach(({ player, stats }) => {
      const overs = Math.floor(stats.balls / 6);
      const balls = stats.balls % 6;
      const oversDisplay = `${overs}.${balls}`;
      const econ = stats.balls > 0 ? (stats.runs / stats.balls * 6).toFixed(2) : '0.00';
      console.log(`${player.name.padEnd(25)} ${oversDisplay.padStart(5)} ${stats.maidens.toString().padStart(3)} ${stats.runs.toString().padStart(4)} ${stats.wickets.toString().padStart(3)} ${econ.padStart(6)} ${stats.dots.toString().padStart(5)}`);
    });

    console.log('');
  }

  /**
   * Display section header
   * @param {string} title - Section title
   * @param {number} width - Width of header line
   */
  displaySectionHeader(title, width = 80) {
    console.log('\n' + '='.repeat(width));
    console.log(title.padStart((width + title.length) / 2));
    console.log('='.repeat(width));
  }

  /**
   * Display start of over header
   * @param {number} overNumber - Over number (1-indexed)
   * @param {string} teamName - Batting team name
   * @param {number} score - Current score
   * @param {number} wickets - Wickets fallen
   */
  displayStartOfOverHeader(overNumber, teamName, score, wickets) {
    console.log('\n' + '='.repeat(80));
    console.log(`START OF OVER ${overNumber}`.padStart(45));
    console.log('='.repeat(80));
    console.log(`${teamName}: ${score}/${wickets}`);
    console.log('='.repeat(80));
  }
}

export default MatchDisplayFormatter;
