/**
 * @file LoadGame.jsx
 * @description Continue game or import a save file
 *
 * Game state is auto-persisted via Zustand middleware.
 * This screen lets users continue their game or import a .cm25 file.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Upload,
  AlertCircle,
  CheckCircle,
  Trophy,
  Calendar,
  Trash2
} from 'lucide-react';
import SaveGameManager from '../../utils/SaveGameManager';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useLeagueStore from '../../stores/leagueStore';
import useFinanceStore from '../../stores/financeStore';
import useMatchStore from '../../stores/matchStore';
import useAuctionStore from '../../stores/auctionStore';
import useInboxStore from '../../stores/inboxStore';
import useTransferStore from '../../stores/transferStore';
import GameController from '../../core/game/GameController';
import LoadingScreen from '../shared/LoadingScreen';
import '../../styles/wallpaper.css';

const LoadGame = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const stores = {
    gameStore: useGameStore,
    teamStore: useTeamStore,
    playerStore: usePlayerStore,
    leagueStore: useLeagueStore,
    financeStore: useFinanceStore,
    matchStore: useMatchStore,
    auctionStore: useAuctionStore,
    inboxStore: useInboxStore,
    transferStore: useTransferStore
  };

  // Get current game state from Zustand (already rehydrated from localStorage)
  const currentSeason = useGameStore(s => s.currentSeason);
  const currentPhase = useGameStore(s => s.currentPhase);
  const currentDate = useGameStore(s => s.currentDate);
  const userTeamId = useTeamStore(s => s.userTeamId);
  const teams = useTeamStore(s => s.teams);
  const standings = useLeagueStore(s => s.standings);

  const userTeam = teams[userTeamId];
  const hasSave = !!userTeamId && !!userTeam;

  // Get team position
  const getPosition = () => {
    if (!standings?.length || !userTeamId) return null;
    const sorted = [...standings].sort((a, b) =>
      b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate
    );
    const pos = sorted.findIndex(s => s.clubId === userTeamId);
    return pos >= 0 ? pos + 1 : null;
  };

  const handleContinue = () => {
    setLoading(true);

    setTimeout(() => {
      // Check if auction is in progress
      const auctionState = useAuctionStore.getState();
      if (auctionState.auctionState === 'in_progress') {
        navigate('/game/auction');
        return;
      }

      // Use GameController to determine next screen
      const controller = new GameController({
        gameStore: useGameStore.getState(),
        leagueStore: useLeagueStore.getState(),
        teamStore: useTeamStore.getState(),
        playerStore: usePlayerStore.getState(),
        matchStore: useMatchStore.getState(),
        auctionStore: useAuctionStore.getState()
      });

      const nextEvent = controller.getNextEvent();

      switch (nextEvent.type) {
        case 'team_selection':
          navigate('/team-selection');
          break;
        case 'auction':
          navigate('/game/auction');
          break;
        case 'match':
        case 'playoff_match':
          navigate('/game/match', { state: { matchData: nextEvent.data } });
          break;
        default:
          navigate('/game/home');
      }
    }, 300);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setImporting(true);
    setResult(null);

    try {
      const importResult = await SaveGameManager.importSave(file);
      if (importResult.success) {
        const loadSuccess = SaveGameManager.loadGame(stores);
        if (loadSuccess) {
          setResult({ success: true, message: `Imported "${importResult.saveName}"!` });
          // Small delay then continue to game
          setTimeout(() => handleContinue(), 1500);
        } else {
          setResult({ success: false, message: 'Failed to load imported save.' });
        }
      } else {
        setResult({ success: false, message: importResult.error });
      }
    } catch (error) {
      console.error('Import error:', error);
      setResult({ success: false, message: 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteSave = () => {
    if (confirm('Delete your saved game? This cannot be undone.')) {
      // Clear all Zustand persist data
      localStorage.removeItem('cm25-game-store');
      localStorage.removeItem('cm25-team-store');
      localStorage.removeItem('cm25-player-store');
      localStorage.removeItem('cm25-league-store');
      localStorage.removeItem('cm25-finance-store');
      localStorage.removeItem('cm25-match-store');
      localStorage.removeItem('cm25-auction-store');
      localStorage.removeItem('cm25-inbox-store');
      localStorage.removeItem('cm25-ui-store');
      localStorage.removeItem('transfer-storage');
      localStorage.removeItem('cm25_current_save');

      // Reload to reset state
      window.location.reload();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen app-wallpaper p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-cricket-text-primary">
            {hasSave ? 'Continue Game' : 'Load Game'}
          </h1>
          <div className="w-24"></div>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`mb-6 p-4 rounded flex items-center gap-2 ${
            result.success
              ? 'bg-green-900/30 border border-green-700 text-green-400'
              : 'bg-red-900/30 border border-red-700 text-red-400'
          }`}>
            {result.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{result.message}</span>
          </div>
        )}

        {hasSave ? (
          /* Has existing save */
          <div className="space-y-6">
            {/* Save Info Card */}
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-cricket-text-primary">
                    {userTeam.name}
                  </h2>
                  <p className="text-cricket-text-secondary">
                    Season {currentSeason} - {currentPhase}
                  </p>
                </div>
                <button
                  onClick={handleDeleteSave}
                  className="p-2 hover:bg-red-900/30 rounded transition-colors"
                  title="Delete save"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-cricket-secondary rounded">
                  <div className="flex items-center gap-2 text-cricket-text-secondary text-sm mb-1">
                    <Calendar className="w-4 h-4" />
                    Date
                  </div>
                  <div className="font-semibold text-cricket-text-primary">
                    {formatDate(currentDate)}
                  </div>
                </div>
                <div className="p-3 bg-cricket-secondary rounded">
                  <div className="flex items-center gap-2 text-cricket-text-secondary text-sm mb-1">
                    <Trophy className="w-4 h-4" />
                    Position
                  </div>
                  <div className="font-semibold text-cricket-text-primary">
                    {getPosition() ? `#${getPosition()}` : 'N/A'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinue}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-3"
              >
                <Play className="w-5 h-5" />
                {loading ? 'Loading...' : 'Continue'}
              </button>
            </div>

            {/* Import Option */}
            <div className="text-center">
              <p className="text-cricket-text-secondary mb-3">Or import a different save:</p>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="btn-secondary flex items-center justify-center gap-2 mx-auto"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : 'Import Save (.cm25)'}
              </button>
            </div>
          </div>
        ) : (
          /* No existing save */
          <div className="card p-8 text-center">
            <AlertCircle className="w-16 h-16 text-cricket-text-secondary mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-cricket-text-primary mb-2">
              No Saved Game Found
            </h3>
            <p className="text-cricket-text-secondary mb-6">
              Start a new career or import an existing save file.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={() => navigate('/team-selection')}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                New Game
              </button>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : 'Import Save'}
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".cm25"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Loading overlay */}
        {loading && (
          <LoadingScreen
            message="Loading Game"
            submessage="Preparing your saved game..."
          />
        )}

        {/* Importing overlay */}
        {importing && (
          <LoadingScreen
            message="Importing Save"
            submessage="Reading save file..."
          />
        )}
      </div>
    </div>
  );
};

export default LoadGame;
