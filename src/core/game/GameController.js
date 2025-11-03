/**
 * @file GameController.js
 * @description Controls game progression and phase transitions
 */

class GameController {
  constructor(stores) {
    this.gameStore = stores.gameStore;
    this.leagueStore = stores.leagueStore;
    this.teamStore = stores.teamStore;
    this.playerStore = stores.playerStore;
    this.matchStore = stores.matchStore;
  }

  /**
   * Determine next event based on current game state
   * @returns {Object} Next event details { type, data }
   */
  getNextEvent() {
    const { currentPhase } = this.gameStore;
    const { stage, fixtures, results } = this.leagueStore;
    const { userTeamId, getTeam } = this.teamStore;

    // Preseason phase
    if (currentPhase === 'preseason') {
      if (!userTeamId) {
        return { type: 'team_selection', message: 'Select your team to begin' };
      }

      // Check if auction is needed
      const userTeam = getTeam(userTeamId);
      const squad = this.playerStore.getPlayersByTeam(userTeamId);

      if (!squad || squad.length === 0) {
        return { type: 'auction', message: 'Build your squad through the auction' };
      }

      // Ready to start season
      return { type: 'season_start', message: 'Start the league season' };
    }

    // League phase
    if (currentPhase === 'league' || stage === 'league') {
      // Find next match for user's team
      const nextMatch = fixtures.find(f =>
        (f.homeTeam === userTeamId || f.awayTeam === userTeamId) &&
        f.status !== 'completed' &&
        !results.find(r => r.matchId === f.id)
      );

      if (nextMatch) {
        return {
          type: 'match',
          message: 'Play your next match',
          data: nextMatch
        };
      }

      // Check if all league matches are complete
      const totalMatches = fixtures.length;
      const completedMatches = results.length;

      if (completedMatches >= totalMatches) {
        return {
          type: 'league_end',
          message: 'League stage complete - Playoffs ahead!'
        };
      }

      // Simulate other teams' matches
      return {
        type: 'simulate_others',
        message: 'Other teams are playing...'
      };
    }

    // Playoffs phase
    if (currentPhase === 'playoffs' || stage === 'playoffs') {
      const { playoffFixtures, playoffResults } = this.leagueStore;

      const nextPlayoffMatch = playoffFixtures?.find(f =>
        (f.homeTeam === userTeamId || f.awayTeam === userTeamId) &&
        !playoffResults?.find(r => r.matchId === f.id)
      );

      if (nextPlayoffMatch) {
        return {
          type: 'playoff_match',
          message: `${nextPlayoffMatch.name} - Play your match`,
          data: nextPlayoffMatch
        };
      }

      // Check if playoffs are complete
      if (playoffResults && playoffResults.length >= (playoffFixtures?.length || 0)) {
        return {
          type: 'season_end',
          message: 'Season complete!'
        };
      }

      return {
        type: 'simulate_playoff',
        message: 'Playoff matches in progress...'
      };
    }

    // Offseason
    if (currentPhase === 'offseason') {
      return {
        type: 'new_season',
        message: 'Prepare for next season'
      };
    }

    // Default
    return {
      type: 'idle',
      message: 'Continue'
    };
  }

  /**
   * Advance game to next week/match
   */
  advanceToNext() {
    const event = this.getNextEvent();

    // Return event for UI to handle
    return event;
  }

  /**
   * Initialize league season
   */
  initializeLeagueSeason() {
    this.gameStore.setPhase('league');
    this.leagueStore.setStage('league');
  }

  /**
   * Start playoffs
   */
  startPlayoffs() {
    this.gameStore.setPhase('playoffs');
    this.leagueStore.setStage('playoffs');
  }

  /**
   * End season
   */
  endSeason() {
    this.gameStore.setPhase('offseason');
    this.leagueStore.setStage('completed');
  }
}

export default GameController;
