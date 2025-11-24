/**
 * @file TestMode.jsx
 * @description Automated testing mode for full season simulation without user team
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Square,
  Trophy,
  Calendar,
  ArrowRight,
  TrendingUp,
  Users,
  DollarSign,
  Target
} from 'lucide-react';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import useLeagueStore from '../../stores/leagueStore';
import usePlayerStore from '../../stores/playerStore';
import useFinanceStore from '../../stores/financeStore';
import useTransferStore from '../../stores/transferStore';
import quickSimMatch from '../../core/match-engine/utils/QuickSimMatch';
import TeamName from '../shared/TeamName';

const TestMode = () => {
  const navigate = useNavigate();

  // Stores
  const {
    currentSeason,
    currentPhase,
    currentWeek,
    gameDay,
    testModeProgress,
    enableTestMode,
    disableTestMode,
    updateTestProgress,
    advanceDay,
    getCurrentEvent,
    advancePhase
  } = useGameStore();

  const {
    initializeRandomTeam,
    teams
  } = useTeamStore();

  const {
    standings,
    fixtures,
    results,
    recordResult,
    recalculateStandings,
    advanceToNextMatch,
    initializeSeason,
    stage
  } = useLeagueStore();

  const {
    listings,
    sales
  } = useTransferStore((state) => ({
    listings: state.listings,
    sales: state.sales
  }));

  // Component state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentActivity, setCurrentActivity] = useState('Initializing...');
  const [simulationLog, setSimulationLog] = useState([]);

  // Initialize test mode on mount
  useEffect(() => {
    if (!isInitialized) {
      console.log('🧪 Test Mode: Initializing...');

      // Enable test mode
      enableTestMode();

      // Auto-select random team (for internal tracking only, not displayed)
      initializeRandomTeam();

      addLog('Test mode initialized');
      addLog('All teams are AI-controlled');
      setCurrentActivity('Ready to simulate');
      setIsInitialized(true);
    }

    // Cleanup on unmount
    return () => {
      if (isInitialized) {
        disableTestMode();
      }
    };
  }, []);

  // Add log entry
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setSimulationLog(prev => [...prev, { timestamp, message }].slice(-10)); // Keep last 10 entries
  };

  // Simulate one week
  const simulateWeek = async () => {
    setIsSimulating(true);
    updateTestProgress({ isRunning: true });

    try {
      addLog(`Simulating Week ${currentWeek}...`);
      setCurrentActivity(`Simulating Week ${currentWeek}`);

      // Get all fixtures for this week
      const weekStart = gameDay;
      const weekEnd = weekStart + 7;

      const weekFixtures = fixtures.filter((fixture, index) => {
        const completed = results.some(r => r.matchId === fixture.matchId);
        return !completed && index >= results.length && index < results.length + 10; // Sim ~10 matches per week
      });

      // Simulate each match
      for (const fixture of weekFixtures) {
        const result = await quickSimMatch({
          matchId: fixture.matchId,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          homeTeam: teams[fixture.homeTeamId],
          awayTeam: teams[fixture.awayTeamId],
          venue: fixture.venue
        });

        // Record result
        recordResult(result);

        // Update progress
        updateTestProgress({
          completedMatches: results.length + 1
        });

        addLog(`✓ ${teams[fixture.homeTeamId]?.shortName || 'Home'} vs ${teams[fixture.awayTeamId]?.shortName || 'Away'}`);
      }

      // Recalculate standings after week
      recalculateStandings();

      // Advance to next match
      advanceToNextMatch();

      // Update week progress
      updateTestProgress({
        completedWeeks: currentWeek,
        completedMatches: results.length
      });

      addLog(`Week ${currentWeek} complete`);

      // Check if playoffs should start
      if (results.length >= 90 && stage === 'league') {
        advancePhase('playoffs');
        addLog('⚡ Playoffs starting!');
      }

      // Check if offseason should start
      if (stage === 'playoffs' && results.length >= 94) {
        advancePhase('offseason');
        addLog('📊 Season complete!');
      }

    } catch (error) {
      console.error('Simulation error:', error);
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setIsSimulating(false);
      updateTestProgress({ isRunning: false });
      setCurrentActivity('Waiting for next action');
    }
  };

  // Stop test mode and return to start
  const handleStop = () => {
    disableTestMode();
    navigate('/');
  };

  // Calculate progress percentage
  const progressPercent = Math.round((results.length / 94) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                🧪 Test Mode
              </h1>
              <p className="text-gray-400">
                Automated AI-only season simulation
              </p>
            </div>
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop & Exit
            </button>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Season Progress
            </h2>
            <div className="text-sm text-gray-400">
              Season {currentSeason} • Week {currentWeek}/26
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Matches</span>
              <span className="text-gray-400">{results.length}/94</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-right text-sm text-gray-400 mt-1">
              {progressPercent}% complete
            </div>
          </div>

          {/* Phase Badge */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-400">Current Phase:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              currentPhase === 'league' ? 'bg-blue-900 text-blue-200' :
              currentPhase === 'playoffs' ? 'bg-purple-900 text-purple-200' :
              currentPhase === 'offseason' ? 'bg-yellow-900 text-yellow-200' :
              'bg-gray-700 text-gray-300'
            }`}>
              {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}
            </span>
          </div>

          {/* Current Activity */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-gray-300">{currentActivity}</span>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Controls
          </h2>
          <div className="flex gap-4">
            <button
              onClick={simulateWeek}
              disabled={isSimulating || currentPhase === 'offseason'}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                isSimulating || currentPhase === 'offseason'
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-5 h-5" />
                  Simulating...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Continue (Simulate Week)
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Simulates all matches for the current week, then pauses for review.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* League Standings */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Current Standings (Top 4)
            </h2>
            <div className="space-y-2">
              {standings.slice(0, 4).map((team, index) => (
                <div
                  key={team.clubId}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-600 text-yellow-100' :
                      index === 1 ? 'bg-gray-400 text-gray-900' :
                      index === 2 ? 'bg-amber-700 text-amber-100' :
                      'bg-gray-600 text-gray-200'
                    }`}>
                      {index + 1}
                    </div>
                    <TeamName teamId={team.clubId} />
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-gray-400 text-xs">Pts</div>
                      <div className="font-bold">{team.points}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 text-xs">NRR</div>
                      <div className="font-semibold">{team.netRunRate.toFixed(3)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Activity Log
            </h2>
            <div className="space-y-1 text-sm max-h-64 overflow-y-auto">
              {simulationLog.length === 0 ? (
                <div className="text-gray-500 italic">No activity yet...</div>
              ) : (
                simulationLog.map((entry, index) => (
                  <div key={index} className="flex gap-2 p-2 hover:bg-gray-700/30 rounded">
                    <span className="text-gray-500 text-xs">{entry.timestamp}</span>
                    <span className="text-gray-300">{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">Matches Played</h3>
            </div>
            <div className="text-3xl font-bold">{results.length}</div>
            <div className="text-sm text-gray-400 mt-1">
              {94 - results.length} remaining
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold">Transfer Activity</h3>
            </div>
            <div className="text-3xl font-bold">{sales?.length || 0}</div>
            <div className="text-sm text-gray-400 mt-1">
              {listings?.length || 0} listings
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold">Current Week</h3>
            </div>
            <div className="text-3xl font-bold">{currentWeek}</div>
            <div className="text-sm text-gray-400 mt-1">
              Week {currentWeek} of 26
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMode;
