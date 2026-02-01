/**
 * @file LeagueInitializer.js
 * @description Shared league initialization logic used by all game flows
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for league initialization
 * Used by: SimulationEngine, Header (normal UI), and Transfers (auction completion)
 */

import MatchWeekScheduleGenerator from '../core/league/MatchWeekScheduleGenerator';
import PlayoffGenerator from '../core/league/PlayoffGenerator';
import MessageGenerator from './MessageGenerator';
import aiTacticsManager from '../core/ai/AITacticsManager';

/**
 * Initialize league season with fixtures, finances, and tactics
 * @param {Object} params - Initialization parameters
 * @param {Object} params.stores - All required stores
 * @param {Object} params.stores.gameStore - Game state store
 * @param {Object} params.stores.teamStore - Team management store
 * @param {Object} params.stores.leagueStore - League/standings store
 * @param {Object} params.stores.financeStore - Finance store
 * @param {Object} params.stores.auctionStore - Auction store
 * @param {Object} params.stores.inboxStore - Inbox/messaging store (optional)
 * @param {Object} params.stores.playerStore - Player store
 * @param {boolean} params.isFirstSeasonInit - True if this is Season 1 initial setup
 * @returns {Object} Summary of initialization
 */
export function initializeLeague({ stores, isFirstSeasonInit = false }) {
  console.log('🏏 Initializing league...');

  const {
    gameStore,
    teamStore,
    leagueStore,
    financeStore,
    auctionStore,
    inboxStore,
    playerStore
  } = stores;

  // Get current game state
  const currentSeason = gameStore.getState().currentSeason;
  const currentDate = gameStore.getState().currentDate;
  const gameDay = gameStore.getState().gameDay;
  const userTeamId = teamStore.getState().userTeamId;
  const soldPlayers = auctionStore.getState().soldPlayers;

  // Clear old season events
  gameStore.getState().clearEvents();

  // Generate season objectives for Season 1 if needed
  if (isFirstSeasonInit) {
    const existingObjectives = gameStore.getState().seasonObjectives;
    if (!existingObjectives || existingObjectives.length === 0) {
      const teams = Object.values(teamStore.getState().teams);
      const rivalTeam = teams.find(t => t.id !== userTeamId);
      gameStore.getState().generateSeasonObjectives(rivalTeam?.name || 'Sydney Sharks');
      console.log('📋 Season objectives generated');
    }
  }

  // Calculate game start date dynamically
  const currentGameDate = new Date(currentDate);
  const gameStartDate = new Date(currentGameDate);
  gameStartDate.setDate(gameStartDate.getDate() - (gameDay - 1));

  // Create clubs array
  const teams = Object.values(teamStore.getState().teams);
  const clubs = teams.map(team => ({
    id: team.id,
    name: team.name,
    shortName: team.shortName || team.name.substring(0, 3).toUpperCase(),
    homeVenue: team.homeVenue || `${team.name} Stadium`,
    homeGround: team.homeVenue || `${team.name} Stadium`,
    colors: team.colors || { primary: '#2D5F3F', secondary: '#D4AF37' }
  }));

  // Generate league fixtures (starts 7 days from now)
  const leagueStartDate = new Date(currentDate);
  leagueStartDate.setDate(leagueStartDate.getDate() + 7);

  const scheduleGenerator = new MatchWeekScheduleGenerator();
  const { fixtures } = scheduleGenerator.generateMatchWeekSchedule(clubs, leagueStartDate);

  // Find last group match date
  const lastGroupMatchDate = new Date(Math.max(...fixtures.map(f => new Date(f.dateObj))));

  // Calculate playoff start date (next Monday after last group match)
  const playoffStartDate = new Date(lastGroupMatchDate);
  const dayOfWeek = playoffStartDate.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  playoffStartDate.setDate(playoffStartDate.getDate() + daysUntilMonday);

  // Generate playoff fixtures with TBD teams
  const playoffGenerator = new PlayoffGenerator();
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

  // Initialize league store with ALL fixtures
  leagueStore.getState().initializeSeason({
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
  financeStore.getState().initializeSeason(teamsForFinances, `season_${currentSeason}`, null);

  // Record auction spending for each team
  teams.forEach(team => {
    const squadList = teamStore.getState().squadLists[team.id] || [];
    const teamSales = soldPlayers.filter(sale => sale.teamId === team.id);
    const totalSpent = teamSales.reduce((sum, sale) => sum + sale.price, 0);

    financeStore.getState().processAuctionSpending(team.id, totalSpent, squadList);
  });

  // Initialize tactics for all teams using AITacticsManager
  let tacticsInitialized = 0;
  Object.keys(teamStore.getState().teams).forEach(teamId => {
    const squadIds = teamStore.getState().squadLists[teamId] || [];
    const squad = squadIds
      .map(id => playerStore.getState().players[id])
      .filter(Boolean);

    if (squad.length >= 11) {
      aiTacticsManager.generateTactics(teamId, squad, teamStore);
      tacticsInitialized++;
    }
  });
  if (tacticsInitialized > 0) {
    console.log(`✅ Initialized AI tactics for ${tacticsInitialized} teams`);
  }

  // Convert ALL fixtures (league + playoffs) to match events with dynamic game day calculation
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

  // Calculate season parity for event scheduling
  const isOddSeason = currentSeason % 2 === 1;

  // Get final match date (last playoff)
  const finalMatchDate = new Date(Math.max(...playoffFixtures.map(f => new Date(f.dateObj))));

  // Off-season starts the day after final
  const offseasonStartDate = new Date(finalMatchDate);
  offseasonStartDate.setDate(offseasonStartDate.getDate() + 1);
  const offseasonStartDay = Math.ceil((offseasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

  // Transfer window: June 1-30 for odd seasons, Dec 1-31 for even seasons
  const transferWindowStartDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, 1);
  const transferWindowEndDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, isOddSeason ? 30 : 31);

  const transferWindowStartDay = Math.ceil((transferWindowStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
  const transferWindowEndDay = Math.ceil((transferWindowEndDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

  // Season end date
  const seasonEndDate = new Date(leagueStartDate.getFullYear(), isOddSeason ? 5 : 11, isOddSeason ? 30 : 31);
  const seasonEndDay = Math.ceil((seasonEndDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

  // Next season start
  const nextSeasonStartDate = new Date(transferWindowEndDate);
  nextSeasonStartDate.setDate(nextSeasonStartDate.getDate() + 1);
  const nextSeasonStartDay = Math.ceil((nextSeasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

  const additionalEvents = [
    { day: offseasonStartDay, type: 'offseason_start' },
    { day: transferWindowStartDay, type: 'transfer_window_open' },
    { day: transferWindowEndDay, type: 'transfer_window_close' },
    { day: seasonEndDay, type: 'season_end', data: { season: currentSeason } }
  ];

  // Schedule next season start event
  additionalEvents.push({ day: nextSeasonStartDay, type: 'new_season_start', data: { season: currentSeason + 1 } });

  // Schedule all events
  gameStore.getState().scheduleEvents([...matchEvents, ...additionalEvents]);
  gameStore.getState().advancePhase('league');

  // Add auction summary message (welcome/expectations/tutorial already sent at team selection)
  if (inboxStore && isFirstSeasonInit) {
    const userSquadIds = teamStore.getState().squadLists[userTeamId] || [];
    const userSquad = userSquadIds.map(id => playerStore.getState().players[id]).filter(Boolean);
    const userTeamSales = soldPlayers.filter(sale => sale.teamId === userTeamId);
    const finances = {
      totalSpent: userTeamSales.reduce((sum, sale) => sum + sale.price, 0),
      budgetRemaining: 0
    };
    inboxStore.getState().addMessage(MessageGenerator.generateAuctionSummaryMessage(userSquad, finances));
  }

  console.log(`✅ League initialized: ${fixtures.length} group matches, ${playoffFixtures.length} playoff matches`);

  return {
    fixturesScheduled: allFixtures.length,
    leagueMatches: fixtures.length,
    playoffMatches: playoffFixtures.length,
    eventsScheduled: matchEvents.length + additionalEvents.length
  };
}

export default { initializeLeague };
