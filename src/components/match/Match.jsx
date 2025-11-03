/**
 * @file Match.jsx
 * @description Live match view for playing matches interactively
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipForward, Target, TrendingUp, Trophy,
  Users, Activity, ChevronRight, FastForward
} from 'lucide-react';
import useMatchStore from '../../stores/matchStore';
import usePlayerStore from '../../stores/playerStore';
import useTeamStore from '../../stores/teamStore';
import MatchEngine from '../../core/match-engine/core/MatchEngine';

const Match = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const matchData = location.state?.matchData;

  // Subscribe to matchStore updates properly (component will re-render on changes)
  const teams = useMatchStore((state) => state.teams);
  const innings = useMatchStore((state) => state.innings);
  const currentBall = useMatchStore((state) => state.currentBall);
  const ballByBall = useMatchStore((state) => state.ballByBall);
  const tacticsState = useMatchStore((state) => state.tacticsState);
  const matchStatus = useMatchStore((state) => state.status);
  const matchStoreId = useMatchStore((state) => state.matchId);

  // Store actions
  const initializeMatchStore = useMatchStore((state) => state.initializeMatch);
  const resetMatchStore = useMatchStore((state) => state.resetMatch);

  // Get player and team functions
  const getPlayer = usePlayerStore((state) => state.getPlayer);
  const getTeam = useTeamStore((state) => state.getTeam);

  // Component local state
  const [matchEngine, setMatchEngine] = useState(null);
  const [matchState, setMatchState] = useState('not_started');
  const [isSimulating, setIsSimulating] = useState(false);
  const [commentary, setCommentary] = useState([]);
  const [activeTab, setActiveTab] = useState('live');
  const autoSimulateRef = useRef(null);

  useEffect(() => {
    // If no match data is provided, redirect back to dashboard
    if (!matchData) {
      console.warn('No match data provided, redirecting to dashboard');
      navigate('/game/dashboard');
      return;
    }

    // Initialize match
    initializeMatch();

    return () => {
      // Cleanup
      if (autoSimulateRef.current) {
        clearInterval(autoSimulateRef.current);
      }
    };
  }, [matchData, navigate]);

  // Initialize match
  const initializeMatch = () => {
    try {
      // Initialize matchStore with match configuration
      initializeMatchStore({
        homeTeam: matchData.homeTeam,
        awayTeam: matchData.awayTeam,
        venue: matchData.venue,
        tossWinner: matchData.homeTeam.id,
        tossDecision: 'bat'
      });

      // Create match engine - pass the hooks themselves
      const engine = new MatchEngine(
        useMatchStore,
        usePlayerStore,
        useTeamStore,
        { silent: false }
      );

      engine.config.interactiveMode = true;
      engine.config.showBallByBall = true;

      setMatchEngine(engine);
      addCommentary('Match initialized. Ready to start!', 'info');
    } catch (error) {
      console.error('Error initializing match:', error);
      addCommentary('Error initializing match: ' + error.message, 'error');
    }
  };

  // Start match
  const handleStartMatch = async () => {
    if (!matchEngine || !matchData) return;

    try {
      setMatchState('in_progress');
      addCommentary(`Match starting: ${matchData.homeTeam?.name} vs ${matchData.awayTeam?.name}`, 'match_start');

      await matchEngine.startMatch(matchData);

      setMatchState('completed');
      addCommentary('Match completed!', 'match_end');
    } catch (error) {
      console.error('Error during match:', error);
      addCommentary('Match error: ' + error.message, 'error');
      setMatchState('completed');
    }
  };

  // Simulate single ball
  const handlePlayBall = async () => {
    if (!matchEngine || matchState !== 'in_progress') return;

    try {
      setIsSimulating(true);
      // Match engine will update store which triggers re-render
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsSimulating(false);
    } catch (error) {
      console.error('Error simulating ball:', error);
      addCommentary('Error: ' + error.message, 'error');
      setIsSimulating(false);
    }
  };

  // Skip entire over
  const handleSkipOver = async () => {
    if (!matchEngine || matchState !== 'in_progress') return;

    try {
      setIsSimulating(true);
      addCommentary('Skipping to end of over...', 'info');

      const ballsRemaining = 6 - currentBall.ball;
      for (let i = 0; i < ballsRemaining; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setIsSimulating(false);
      addCommentary('Over completed', 'info');
    } catch (error) {
      console.error('Error skipping over:', error);
      setIsSimulating(false);
    }
  };

  // Auto-simulate entire match
  const handleAutoSimulate = () => {
    if (!matchEngine || matchState !== 'in_progress') {
      if (matchState === 'not_started') {
        handleStartMatch();
      }
      return;
    }

    addCommentary('Auto-simulating match...', 'info');
    setIsSimulating(true);
  };

  // Add commentary message
  const addCommentary = (message, type = 'ball') => {
    setCommentary(prev => [
      {
        message,
        type,
        timestamp: new Date().toLocaleTimeString(),
        over: currentBall?.over || 0,
        ball: currentBall?.ball || 0
      },
      ...prev
    ].slice(0, 100));
  };

  // Format score display
  const formatScore = (team) => {
    if (!team) return '0/0';
    return `${team.totalScore || 0}/${team.wickets || 0}`;
  };

  // Format overs
  const formatOvers = () => {
    if (!currentBall) return '0.0';
    return `${currentBall.over}.${currentBall.ball}`;
  };

  // Get current batsmen
  const getCurrentBatsmen = () => {
    if (!innings || !innings.striker) return [];
    const striker = getPlayer(innings.striker);
    const nonStriker = getPlayer(innings.nonStriker);
    return [striker, nonStriker].filter(Boolean);
  };

  // Get current bowler
  const getCurrentBowler = () => {
    if (!innings || !innings.bowler) return null;
    return getPlayer(innings.bowler);
  };

  if (!matchData) {
    return null;
  }

  const tabs = [
    { id: 'live', label: 'Live Match', icon: Activity },
    { id: 'scorecard', label: 'Scorecard', icon: Users },
    { id: 'commentary', label: 'Commentary', icon: TrendingUp }
  ];

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-cricket-text-primary flex items-center gap-2">
              <Trophy className="w-6 h-6 text-cricket-accent" />
              {matchData.homeTeam?.name} vs {matchData.awayTeam?.name}
            </h1>
            <p className="text-sm text-cricket-text-secondary mt-1">
              T20 Match • {matchData.venue || 'Unknown Venue'}
            </p>
          </div>
          {matchState === 'in_progress' && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded animate-pulse">
                LIVE
              </span>
            </div>
          )}
          {matchState === 'completed' && (
            <button onClick={() => navigate('/game/dashboard')} className="btn-primary">
              <ChevronRight className="w-5 h-5 inline mr-2" />
              Continue
            </button>
          )}
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-2 gap-6">
          <div className={`text-center p-4 rounded ${innings?.battingTeam === matchData.homeTeam?.id ? 'bg-cricket-primary/20 border-2 border-cricket-primary' : 'bg-cricket-secondary'}`}>
            <div className="text-xl font-bold text-cricket-text-primary">
              {matchData.homeTeam?.name}
            </div>
            <div className="text-4xl font-bold text-cricket-accent mt-2">
              {innings?.battingTeam === matchData.homeTeam?.id ? formatScore(teams.batting) : formatScore(teams.bowling)}
            </div>
            <div className="text-sm text-cricket-text-secondary mt-1">
              {innings?.battingTeam === matchData.homeTeam?.id ? formatOvers() : ''} overs
            </div>
          </div>
          <div className={`text-center p-4 rounded ${innings?.battingTeam === matchData.awayTeam?.id ? 'bg-cricket-primary/20 border-2 border-cricket-primary' : 'bg-cricket-secondary'}`}>
            <div className="text-xl font-bold text-cricket-text-primary">
              {matchData.awayTeam?.name}
            </div>
            <div className="text-4xl font-bold text-cricket-accent mt-2">
              {innings?.battingTeam === matchData.awayTeam?.id ? formatScore(teams.batting) : formatScore(teams.bowling)}
            </div>
            <div className="text-sm text-cricket-text-secondary mt-1">
              {innings?.battingTeam === matchData.awayTeam?.id ? formatOvers() : ''} overs
            </div>
          </div>
        </div>

        {/* Target Display (2nd Innings) */}
        {innings?.number === 2 && innings?.target && (
          <div className="mt-4 p-3 bg-cricket-secondary rounded text-center">
            <span className="text-cricket-text-secondary">Target: </span>
            <span className="text-lg font-bold text-cricket-accent">{innings.target}</span>
            <span className="text-cricket-text-secondary ml-4">Required Rate: </span>
            <span className="text-lg font-bold">
              {((innings.target - teams.batting.totalScore) / ((120 - (currentBall.over * 6 + currentBall.ball)) / 6)).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Match Controls */}
      {matchState !== 'completed' && (
        <div className="card p-6">
          <div className="flex items-center justify-center gap-4">
            {matchState === 'not_started' ? (
              <button
                onClick={handleStartMatch}
                className="btn-primary flex items-center gap-2 text-lg px-8 py-3"
              >
                <Play className="w-6 h-6" />
                Start Match
              </button>
            ) : (
              <>
                <button
                  onClick={handlePlayBall}
                  disabled={isSimulating || matchState !== 'in_progress'}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Play Ball
                </button>
                <button
                  onClick={handleSkipOver}
                  disabled={isSimulating || matchState !== 'in_progress'}
                  className="btn-secondary flex items-center gap-2"
                >
                  <SkipForward className="w-5 h-5" />
                  Skip Over
                </button>
                <button
                  onClick={handleAutoSimulate}
                  disabled={isSimulating}
                  className="btn-primary flex items-center gap-2"
                >
                  <FastForward className="w-5 h-5" />
                  Auto-Simulate
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-cricket-primary text-cricket-primary'
                    : 'border-transparent text-cricket-text-secondary hover:text-cricket-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Batsmen */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cricket-accent" />
              Current Batsmen
            </h2>
            <div className="space-y-3">
              {getCurrentBatsmen().map((batsman, idx) => (
                <div key={idx} className="p-3 bg-cricket-secondary rounded flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{batsman?.name || 'Unknown'}</div>
                    <div className="text-xs text-cricket-text-secondary">
                      {idx === 0 ? 'Striker' : 'Non-Striker'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">0 <span className="text-sm text-cricket-text-secondary">(0)</span></div>
                    <div className="text-xs text-cricket-text-secondary">Runs (Balls)</div>
                  </div>
                </div>
              ))}
              {getCurrentBatsmen().length === 0 && (
                <div className="text-center text-cricket-text-secondary py-4">
                  No batsmen yet
                </div>
              )}
            </div>
          </div>

          {/* Current Bowler */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cricket-accent" />
              Current Bowler
            </h2>
            {getCurrentBowler() ? (
              <div className="p-4 bg-cricket-secondary rounded">
                <div className="font-semibold text-lg mb-3">{getCurrentBowler().name}</div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-cricket-text-secondary">Overs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-cricket-text-secondary">Runs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-cricket-text-secondary">Wickets</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">0.00</div>
                    <div className="text-xs text-cricket-text-secondary">Economy</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-cricket-text-secondary py-8">
                No bowler selected yet
              </div>
            )}
          </div>

          {/* Match Stats */}
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cricket-accent" />
              Match Stats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-cricket-secondary rounded text-center">
                <div className="text-sm text-cricket-text-secondary">Run Rate</div>
                <div className="text-2xl font-bold">
                  {teams.batting ? (teams.batting.totalScore / ((currentBall.over * 6 + currentBall.ball) / 6 || 1)).toFixed(2) : '0.00'}
                </div>
              </div>
              <div className="p-3 bg-cricket-secondary rounded text-center">
                <div className="text-sm text-cricket-text-secondary">Boundaries</div>
                <div className="text-2xl font-bold">0</div>
              </div>
              <div className="p-3 bg-cricket-secondary rounded text-center">
                <div className="text-sm text-cricket-text-secondary">Dot Balls</div>
                <div className="text-2xl font-bold">0</div>
              </div>
              <div className="p-3 bg-cricket-secondary rounded text-center">
                <div className="text-sm text-cricket-text-secondary">Extras</div>
                <div className="text-2xl font-bold">0</div>
              </div>
            </div>
          </div>

          {/* 2D Pitch Visualization Placeholder */}
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cricket-accent" />
              Pitch View
            </h2>
            <div className="bg-cricket-pitch aspect-[2/1] rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Target className="w-12 h-12 text-cricket-text-secondary mx-auto mb-2 opacity-50" />
                <p className="text-cricket-text-secondary">2D Pitch Visualization Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scorecard' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Scorecard</h2>
          <div className="text-center text-cricket-text-secondary py-12">
            Full scorecard coming soon
          </div>
        </div>
      )}

      {activeTab === 'commentary' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Ball-by-Ball Commentary</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {commentary.map((entry, idx) => (
              <div
                key={idx}
                className={`p-3 rounded text-sm ${
                  entry.type === 'match_start' ? 'bg-blue-900/30 border border-blue-700' :
                  entry.type === 'match_end' ? 'bg-green-900/30 border border-green-700' :
                  entry.type === 'wicket' ? 'bg-red-900/30 border border-red-700' :
                  entry.type === 'boundary' ? 'bg-green-900/20 border border-green-700' :
                  entry.type === 'error' ? 'bg-red-900/50 border border-red-700' :
                  'bg-cricket-secondary'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="font-mono text-xs text-cricket-text-secondary mr-2">
                      {entry.timestamp}
                    </span>
                    {entry.over > 0 && (
                      <span className="font-mono text-xs text-cricket-accent mr-2">
                        {entry.over}.{entry.ball}
                      </span>
                    )}
                    <span>{entry.message}</span>
                  </div>
                </div>
              </div>
            ))}
            {commentary.length === 0 && (
              <div className="text-center text-cricket-text-secondary py-12">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No commentary yet</p>
                <p className="text-sm mt-2">Start the match to see ball-by-ball updates</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Match;
