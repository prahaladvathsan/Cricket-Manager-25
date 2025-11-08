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
- Total Spent: ₹${(totalSpent / 10000000).toFixed(2)} Cr
- Average Price: ₹${(avgPrice / 10000000).toFixed(2)} Cr
- Remaining Budget: ₹${(remaining / 10000000).toFixed(2)} Cr

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
}

export default MessageGenerator;
