/**
 * @file MessageGenerator.js
 * @description Generates inbox messages for various game events
 */

class MessageGenerator {
  /**
   * Generate welcome message (game start)
   * @param {Object} team - User's team
   * @param {number} season - Current season
   * @returns {Object} Message data
   */
  static generateWelcomeMessage(team, season) {
    return {
      type: 'welcome',
      subject: `Welcome to ${team.name}!`,
      sender: 'Board of Directors',
      body: `Dear Manager,

On behalf of the entire ${team.name} organization, we are thrilled to welcome you as our new head coach for Season ${season} of the World Premier League!

You've inherited a franchise with great potential, and we have high expectations for success. The auction is your first major responsibility - build a squad that can compete for the championship.

**Your Responsibilities:**
- Manage the squad and tactics
- Make strategic decisions on match days
- Handle player acquisitions and transfers
- Meet the board's season objectives

We look forward to a successful partnership!

Best regards,
**${team.name} Board of Directors**`,
      metadata: {
        team: team.id,
        season
      }
    };
  }

  /**
   * Generate season expectations message
   * @param {Object} team - User's team
   * @param {number} season - Current season
   * @returns {Object} Message data
   */
  static generateExpectationsMessage(team, season) {
    // Determine expectations based on team (simplified - could be more complex)
    const expectation = 'Qualify for Playoffs';

    return {
      type: 'expectations',
      subject: `Season ${season} Objectives`,
      sender: 'Chairman',
      body: `Manager,

The board has set the following objectives for Season ${season}:

**Primary Objective:** ${expectation}

The fans are eager for success, and the owners expect results. We've provided you with a competitive budget for the auction - use it wisely.

Additional goals:
- Build team chemistry and cohesion
- Develop a winning tactical approach
- Maintain financial responsibility

Failure to meet these objectives may result in a review of your position.

Good luck,
**${team.name} Chairman**`,
      metadata: {
        team: team.id,
        season,
        objective: expectation
      }
    };
  }

  /**
   * Generate tutorial/manual primer message
   * @returns {Object} Message data
   */
  static generateTutorialMessage() {
    return {
      type: 'tutorial',
      subject: 'Getting Started - Game Manual',
      sender: 'Game Support',
      body: `Welcome to Cricket Manager 25!

Here's a quick guide to get you started:

**Navigation:**
- Use the sidebar to access different sections
- The Continue button (top-right) advances the game day-by-day
- Use the back button to return to previous screens

**Key Screens:**
- **Home:** Overview of your season progress
- **Squad:** View and manage your players
- **Tactics:** Set your playing XI and match strategy
- **League:** View standings and fixtures
- **Matches:** Watch live matches or view results

**Tips:**
- Set your tactics before each match
- Monitor player form and fitness
- Pay attention to match-ups and opposition strengths
- Balance your squad with different playstyles

For detailed information, visit the game manual (link coming soon).

Enjoy the game!`,
      metadata: {
        link: '/manual' // Placeholder
      }
    };
  }

  /**
   * Generate auction summary message
   * @param {Object} squad - User's final squad
   * @param {Object} finances - Budget spent info
   * @returns {Object} Message data
   */
  static generateAuctionSummaryMessage(squad, finances) {
    const totalSpent = finances.totalSpent || 0;
    const remaining = finances.budgetRemaining || 0;
    const avgPrice = squad.length > 0 ? totalSpent / squad.length : 0;

    return {
      type: 'auction_summary',
      subject: 'Auction Complete - Squad Summary',
      sender: 'Auction Commissioner',
      body: `Manager,

The auction has concluded, and your squad is now finalized for the season.

**Auction Summary:**
- Players Acquired: ${squad.length}
- Total Spent: $${(totalSpent / 1000000).toFixed(2)}M
- Average Price: $${(avgPrice / 1000000).toFixed(2)}M
- Remaining Budget: $${(remaining / 1000000).toFixed(2)}M

**Next Steps:**
1. Review your squad composition
2. Set your default tactics and playing XI
3. Prepare for the season opener

The league fixtures will be released shortly. Good luck with your squad!

View your complete squad in the Squad section.`,
      metadata: {
        squadSize: squad.length,
        totalSpent,
        remaining,
        link: '/game/squad'
      }
    };
  }

  /**
   * Generate pre-match tactics reminder
   * @param {Object} fixture - Upcoming match details
   * @param {Object} homeTeam - Home team
   * @param {Object} awayTeam - Away team
   * @param {boolean} isUserHome - Whether user is home team
   * @returns {Object} Message data
   */
  static generateMatchReminderMessage(fixture, homeTeam, awayTeam, isUserHome) {
    const opponent = isUserHome ? awayTeam : homeTeam;
    const venue = isUserHome ? 'at home' : 'away';

    return {
      type: 'match_reminder',
      subject: `Match Tomorrow: vs ${opponent.name}`,
      sender: 'Team Analyst',
      body: `Manager,

We have an important match tomorrow against **${opponent.name}** ${venue}.

**Match Details:**
- **Opponent:** ${opponent.name}
- **Venue:** ${fixture.venue}
- **Match Day:** ${fixture.matchday}

**Pre-Match Checklist:**
- [ ] Review and set tactics
- [ ] Confirm playing XI
- [ ] Check player fitness and form
- [ ] Study opposition strengths

The opposition has been performing ${Math.random() > 0.5 ? 'well' : 'inconsistently'} this season. Make sure your tactics are optimized for this matchup.

Set your tactics before the match begins!`,
      metadata: {
        matchId: fixture.matchId,
        opponent: opponent.id,
        venue: fixture.venue,
        link: '/game/squad' // Link to tactics
      }
    };
  }

  /**
   * Generate match result summary message
   * @param {Object} result - Match result
   * @param {boolean} won - Whether user won
   * @returns {Object} Message data
   */
  static generateMatchResultMessage(result, won) {
    return {
      type: 'match_result',
      subject: won ? `Victory! Match Won` : `Match Lost`,
      sender: 'Match Commissioner',
      body: `Manager,

**Match Result:**
${result.homeTeam.name} vs ${result.awayTeam.name}

**Winner:** ${result.winner === result.homeTeam.id ? result.homeTeam.name : result.awayTeam.name}

${won ?
  'Congratulations on the victory! The team executed the game plan perfectly.' :
  'Unfortunately, we came up short today. Review the tactics and make adjustments for the next match.'}

**Key Stats:**
- Runs Scored: ${result.homeTeam.runs}/${result.homeTeam.wickets} vs ${result.awayTeam.runs}/${result.awayTeam.wickets}
- Player of the Match: ${result.playerOfTheMatch?.name || 'TBD'}

${won ? 'Keep up the momentum!' : 'Learn from this and come back stronger.'}`,
      metadata: {
        matchId: result.id,
        won,
        link: `/game/match/${result.id}`
      }
    };
  }

  /**
   * Generate season summary message with prize money breakdown
   * @param {number} season - Completed season number
   * @param {Object} userTeam - User's team
   * @param {number} finalPosition - User's final league position
   * @param {number} prizeMoney - Prize money won
   * @param {Object} champion - Champion details
   * @param {Object} stats - Season statistics
   * @returns {Object} Message data
   */
  static generateSeasonSummaryMessage(season, userTeam, finalPosition, prizeMoney, champion, stats) {
    const formatMoney = (amount) => `$${(amount / 1000000).toFixed(2)}M`;
    const getPositionSuffix = (pos) => {
      const j = pos % 10;
      const k = pos % 100;
      if (j === 1 && k !== 11) return `${pos}st`;
      if (j === 2 && k !== 12) return `${pos}nd`;
      if (j === 3 && k !== 13) return `${pos}rd`;
      return `${pos}th`;
    };

    const wasChampion = champion && champion.championId === userTeam.id;
    const qualifiedPlayoffs = finalPosition <= 4;

    let performanceReview = '';
    if (wasChampion) {
      performanceReview = '🏆 **OUTSTANDING!** You led the team to championship glory! The board is absolutely thrilled with this performance.';
    } else if (finalPosition === 2) {
      performanceReview = '🥈 **EXCELLENT!** Runner-up finish is a fantastic achievement. Just one step away from the championship!';
    } else if (qualifiedPlayoffs) {
      performanceReview = '✅ **GOOD!** You successfully qualified for the playoffs. The board is satisfied with your performance.';
    } else if (finalPosition <= 7) {
      performanceReview = '⚠️ **AVERAGE.** Mid-table finish. The board expected better results given the squad investment.';
    } else {
      performanceReview = '❌ **DISAPPOINTING.** This finish is below expectations. The board will review your position for next season.';
    }

    return {
      type: 'season_summary',
      subject: `Season ${season} Complete - Final Report`,
      sender: 'Chairman',
      body: `Manager,

Season ${season} of the World Premier League has concluded.

**${userTeam.name} - Season ${season} Final Report**

**League Position:** ${getPositionSuffix(finalPosition)} place
${wasChampion ? '**Status:** 🏆 **WPL CHAMPIONS!**\n' : ''}
**Prize Money Awarded:** ${formatMoney(prizeMoney)}

**Performance Review:**
${performanceReview}

**Season Statistics:**
- Total Matches Played: ${stats.matchesPlayed || 0}
- Victories: ${stats.wins || 0}
- Defeats: ${stats.losses || 0}
- Points: ${stats.points || 0}
- Net Run Rate: ${stats.nrr >= 0 ? '+' : ''}${stats.nrr?.toFixed(3) || '0.000'}

**Champion:** ${champion ? champion.championName : 'TBD'}
${champion && !wasChampion ? `Defeated ${champion.runnerUpName} in the Final (${champion.margin})\n` : ''}
**Total Prize Pool Distributed:** $14.65M across all teams

**Prize Money Distribution (Top 5):**
- 1st: $5.00M 🏆
- 2nd: $3.00M
- 3rd: $2.00M
- 4th: $1.50M
- 5th: $1.00M

**Next Steps:**
1. Review the full season summary in the Off-Season hub
2. Plan for the transfer window (opening soon)
3. Prepare squad building strategy for next season

${qualifiedPlayoffs ?
  'The playoff run was exciting! Let\'s build on this momentum for next season.' :
  'Use the off-season to strengthen your squad and come back stronger next season.'}

The prize money has been added to your team finances.

Best regards,
**${userTeam.name} Chairman**`,
      metadata: {
        season,
        team: userTeam.id,
        finalPosition,
        prizeMoney,
        wasChampion,
        qualifiedPlayoffs,
        link: '/game/offseason'
      }
    };
  }

  /**
   * Generate injury message
   * @param {Object} player - Injured player
   * @param {number} duration - Injury duration in days
   * @param {string} severity - Injury severity (minor/major/severe)
   * @param {string} matchId - Match ID where injury occurred
   * @returns {Object} Message data
   */
  static generateInjuryMessage(player, duration, severity, matchId) {
    const severityEmoji = {
      minor: '🟡',
      major: '🟠',
      severe: '🔴'
    };

    const severityText = {
      minor: 'Minor Injury',
      major: 'Major Injury',
      severe: 'Severe Injury'
    };

    const injuryDescriptions = {
      minor: 'a minor knock',
      major: 'a significant injury',
      severe: 'a serious injury'
    };

    return {
      type: 'injury',
      subject: `${severityEmoji[severity]} ${player.name} - ${severityText[severity]}`,
      sender: 'Medical Staff',
      body: `Manager,

We regret to inform you that **${player.name}** has sustained ${injuryDescriptions[severity]} during the recent match.

**Injury Report:**
- **Player:** ${player.name}
- **Severity:** ${severityText[severity]}
- **Expected Recovery:** ${duration} days
- **Status:** Unavailable for selection

**Medical Staff Recommendation:**
The player should not participate in matches until fully recovered. Please remove them from your Playing XI if currently selected.

**Next Steps:**
→ [Update your tactics and remove injured player](/game/tactics)

We will monitor their recovery and inform you when they are fit to return to action.

Best regards,
**${player.teamId ? 'Team' : 'Club'} Medical Staff**`,
      metadata: {
        playerId: player.id,
        playerName: player.name,
        duration,
        severity,
        matchId,
        link: '/game/tactics'
      }
    };
  }

  /**
   * Generate recovery message
   * @param {Object} player - Recovered player
   * @returns {Object} Message data
   */
  static generateRecoveryMessage(player) {
    return {
      type: 'recovery',
      subject: `✅ ${player.name} - Fit and Available`,
      sender: 'Medical Staff',
      body: `Manager,

Good news! **${player.name}** has successfully completed their recovery and is now fully fit for selection.

**Recovery Status:**
- **Player:** ${player.name}
- **Status:** ✅ Fit and available
- **Condition:** Cleared for match participation

The player has been training with the squad and is ready to be selected for upcoming matches.

**Next Steps:**
→ [View squad and update tactics](/game/squad)

Welcome back, ${player.name}!

Best regards,
**${player.teamId ? 'Team' : 'Club'} Medical Staff**`,
      metadata: {
        playerId: player.id,
        playerName: player.name,
        link: '/game/squad'
      }
    };
  }

  /**
   * Generate board objectives announcement message
   * @param {number} season - Season number
   * @param {Array} objectives - Array of objective objects
   * @param {string} teamName - User's team name
   * @returns {Object} Message data
   */
  static generateBoardObjectivesMessage(season, objectives, teamName) {
    // Format objectives list
    const objectivesList = objectives.map((obj, idx) => {
      const priority = obj.isMandatory ? '🎯 **CRITICAL**' : `📌 Priority ${idx}`;
      const weight = objectives.find(t => t.id === obj.id)?.weight || 0;
      return `${idx + 1}. ${priority} - ${obj.title} (${weight}% of board score)\n   ${obj.description}`;
    }).join('\n\n');

    return {
      type: 'board_objectives',
      subject: `Season ${season} Board Objectives - ${teamName}`,
      sender: 'Board of Directors',
      body: `Manager,

Welcome to Season ${season}! The Board of Directors has established your performance objectives for this season.

**Your Season ${season} Objectives:**

${objectivesList}

**Performance Evaluation:**
Your overall board score will be calculated based on the weighted completion of these objectives. The score ranges from 0-100 and will determine the board's assessment of your performance at season end.

- **75-100:** Outstanding performance
- **50-74:** Good performance
- **25-49:** Average performance
- **0-24:** Below expectations

We have full confidence in your ability to lead ${teamName} to success this season. Your performance will be reviewed continuously throughout the season.

**Next Steps:**
→ [View objectives and track progress](/game/board)

Good luck, and let's make this a successful season!

Best regards,
**Board of Directors**`,
      metadata: {
        season,
        objectivesCount: objectives.length,
        link: '/game/board'
      }
    };
  }
}

export default MessageGenerator;
