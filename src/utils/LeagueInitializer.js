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
import { emitSeasonOpener } from '../core/news/emitters/seasonOpener.js';

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

  // Generate league fixtures with FIXED season start dates
  // Odd seasons start January 13, Even seasons start July 6
  const currentYear = new Date(currentDate).getFullYear();
  const isOddSeason = currentSeason % 2 === 1;

  const leagueStartDate = new Date(
    currentYear,
    isOddSeason ? 0 : 6, // January = 0, July = 6
    isOddSeason ? 13 : 6
  );

  // If calculated date is in the past, move to next year
  if (leagueStartDate < new Date(currentDate)) {
    leagueStartDate.setFullYear(leagueStartDate.getFullYear() + 1);
  }

  console.log(`📅 Season ${currentSeason} (${isOddSeason ? 'Odd' : 'Even'}) league start: ${leagueStartDate.toDateString()}`);

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

  // Get final match date (last playoff)
  const finalMatchDate = new Date(Math.max(...playoffFixtures.map(f => new Date(f.dateObj))));

  // DYNAMIC SEASON END CALCULATION (based on actual final match date, not hardcoded dates)
  // Add 3-day buffer after final for celebration/processing
  const seasonEndDate = new Date(finalMatchDate);
  seasonEndDate.setDate(seasonEndDate.getDate() + 3);
  const seasonEndDay = Math.ceil((seasonEndDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

  // Off-season starts the day after season end
  const offseasonStartDate = new Date(seasonEndDate);
  offseasonStartDate.setDate(offseasonStartDate.getDate() + 1);
  const offseasonStartDay = Math.ceil((offseasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

  // Transfer window: 30 days starting from offseason start
  const transferWindowStartDate = new Date(offseasonStartDate);
  const transferWindowStartDay = offseasonStartDay;

  const transferWindowEndDate = new Date(transferWindowStartDate);
  transferWindowEndDate.setDate(transferWindowEndDate.getDate() + 30);
  const transferWindowEndDay = Math.ceil((transferWindowEndDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;

  const nextSeason = currentSeason + 1;
  const nextSeasonHasRetention = nextSeason % 2 === 1 && nextSeason >= 3;

  // Odd-season transitions: retention Jan 6, auction (new_season_start) Jan 7 of next league year.
  // Even-season transitions: new_season_start day after transfer window close.
  let retentionStartDay = null;
  let newSeasonStartDay;
  if (nextSeasonHasRetention) {
    const auctionYear = leagueStartDate.getFullYear() + 1;
    const retentionDate = new Date(auctionYear, 0, 6);
    const auctionDate = new Date(auctionYear, 0, 7);
    retentionStartDay = Math.ceil((retentionDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
    newSeasonStartDay = Math.ceil((auctionDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
  } else {
    const nextSeasonStartDate = new Date(transferWindowEndDate);
    nextSeasonStartDate.setDate(nextSeasonStartDate.getDate() + 1);
    newSeasonStartDay = Math.ceil((nextSeasonStartDate - gameStartDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  console.log(`📅 Season ${currentSeason} schedule: offseason ${offseasonStartDate.toDateString()}, window ${transferWindowStartDate.toDateString()} - ${transferWindowEndDate.toDateString()}, new season day ${newSeasonStartDay}${nextSeasonHasRetention ? ` (retention day ${retentionStartDay})` : ''}`);

  // season_end is dynamically scheduled by recordResult() after the Final.
  const additionalEvents = [
    { day: offseasonStartDay, type: 'offseason_start' },
    { day: transferWindowStartDay, type: 'transfer_window_open' },
    { day: transferWindowEndDay, type: 'transfer_window_close' },
    ...(nextSeasonHasRetention ? [{ day: retentionStartDay, type: 'retention_start', data: { season: nextSeason } }] : []),
    { day: newSeasonStartDay, type: 'new_season_start', data: { season: nextSeason } }
  ];

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

  // Emit the season opener news article. Runs after fixtures + standings are
  // wired so the opener can reference the actual first fixture and defending
  // champion. Mirrored in Home.jsx for the Season-1 path.
  emitSeasonOpener({ gameStore, teamStore, leagueStore });

  return {
    fixturesScheduled: allFixtures.length,
    leagueMatches: fixtures.length,
    playoffMatches: playoffFixtures.length,
    eventsScheduled: matchEvents.length + additionalEvents.length
  };
}

export default { initializeLeague };
