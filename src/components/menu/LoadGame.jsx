/**
 * @file LoadGame.jsx
 * @description Load game screen showing all save slots
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Trash2,
  Calendar,
  Trophy,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import SaveGameManager from '../../utils/SaveGameManager';
import useGameStore from '../../stores/gameStore';
import useTeamStore from '../../stores/teamStore';
import usePlayerStore from '../../stores/playerStore';
import useLeagueStore from '../../stores/leagueStore';
import useFinanceStore from '../../stores/financeStore';
import useMatchStore from '../../stores/matchStore';
import useAuctionStore from '../../stores/auctionStore';
import useUIStore from '../../stores/uiStore';
import useInboxStore from '../../stores/inboxStore';
import useNavigationStore from '../../stores/navigationStore';
import GameController from '../../core/game/GameController';
import '../../styles/wallpaper.css';

const LoadGame = () => {
  const navigate = useNavigate();
  const [saves, setSaves] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  const stores = {
    gameStore: useGameStore,
    teamStore: useTeamStore,
    playerStore: usePlayerStore,
    leagueStore: useLeagueStore,
    financeStore: useFinanceStore,
    matchStore: useMatchStore,
    auctionStore: useAuctionStore,
    uiStore: useUIStore,
    inboxStore: useInboxStore,
    navigationStore: useNavigationStore
  };

  useEffect(() => {
    loadSaves();
  }, []);

  const loadSaves = () => {
    const allSaves = SaveGameManager.getAllSaves();
    setSaves(allSaves);
  };

  const handleLoadGame = async (slot) => {
    setLoading(true);
    try {
      const success = SaveGameManager.loadGame(slot, stores);

      if (success) {
        // Determine where to navigate based on current game state
        setTimeout(() => {
          // Check if auction is in progress first
          const auctionState = useAuctionStore.getState();
          if (auctionState.auctionState === 'in_progress') {
            // Directly navigate to auction
            navigate('/game/auction');
            return;
          }

          // Create GameController with loaded stores
          const controller = new GameController({
            gameStore: useGameStore.getState(),
            leagueStore: useLeagueStore.getState(),
            teamStore: useTeamStore.getState(),
            playerStore: usePlayerStore.getState(),
            matchStore: useMatchStore.getState(),
            auctionStore: useAuctionStore.getState()
          });

          const nextEvent = controller.getNextEvent();

          // Navigate to appropriate screen based on game state
          switch (nextEvent.type) {
            case 'team_selection':
              navigate('/team-selection');
              break;
            case 'auction':
              navigate('/game/auction');
              break;
            case 'match':
            case 'playoff_match':
              // Navigate to match with data
              navigate('/game/match', { state: { matchData: nextEvent.data } });
              break;
            case 'season_start':
            case 'league_end':
            case 'season_end':
            case 'simulate_others':
            case 'simulate_playoff':
            case 'new_season':
            case 'idle':
            default:
              // For all other states, go to home
              navigate('/game/home');
              break;
          }
        }, 500);
      } else {
        alert('Failed to load save. The save file may be corrupted.');
      }
    } catch (error) {
      console.error('Error loading game:', error);
      alert('Failed to load save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSave = (slot, e) => {
    e.stopPropagation();

    if (confirm('Are you sure you want to delete this save? This cannot be undone.')) {
      SaveGameManager.deleteSave(slot);
      loadSaves();
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen app-wallpaper p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Menu
          </button>
          <h1 className="text-3xl font-bold text-cricket-text-primary">
            Load Game
          </h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        {/* Saves Grid */}
        {saves.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {saves.map((save) => (
              <div
                key={save.slot}
                onClick={() => !loading && handleLoadGame(save.slot)}
                onMouseEnter={() => setSelectedSlot(save.slot)}
                onMouseLeave={() => setSelectedSlot(null)}
                className={`
                  card p-6 cursor-pointer transition-all duration-200
                  ${selectedSlot === save.slot ? 'ring-2 ring-cricket-primary scale-105' : ''}
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cricket-primary/10'}
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cricket-secondary rounded">
                      <Save className="w-5 h-5 text-cricket-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-cricket-text-primary">
                        {save.saveName}
                      </h3>
                      <p className="text-xs text-cricket-text-secondary flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(save.timestamp)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSave(save.slot, e)}
                    className="p-2 hover:bg-red-900/30 rounded transition-colors"
                    title="Delete save"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-cricket-secondary rounded">
                    <div className="text-cricket-text-secondary text-xs mb-1">Season</div>
                    <div className="font-semibold text-cricket-text-primary">
                      Season {save.metadata.season}
                    </div>
                  </div>
                  <div className="p-2 bg-cricket-secondary rounded">
                    <div className="text-cricket-text-secondary text-xs mb-1">Phase</div>
                    <div className="font-semibold text-cricket-text-primary capitalize">
                      {save.metadata.phase}
                    </div>
                  </div>
                  <div className="p-2 bg-cricket-secondary rounded">
                    <div className="text-cricket-text-secondary text-xs mb-1 flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Position
                    </div>
                    <div className="font-semibold text-cricket-text-primary">
                      {save.metadata.position ? `#${save.metadata.position}` : 'N/A'}
                    </div>
                  </div>
                  <div className="p-2 bg-cricket-secondary rounded">
                    <div className="text-cricket-text-secondary text-xs mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Budget
                    </div>
                    <div className="font-semibold text-cricket-text-primary text-xs">
                      {formatCurrency(save.metadata.budget)}
                    </div>
                  </div>
                </div>

                {/* Slot number badge */}
                <div className="mt-3 text-right">
                  <span className="text-xs text-cricket-text-secondary">
                    Slot {save.slot + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <AlertCircle className="w-16 h-16 text-cricket-text-secondary mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-cricket-text-primary mb-2">
              No Saved Games
            </h3>
            <p className="text-cricket-text-secondary mb-6">
              You haven't saved any games yet. Start a new game to begin your career.
            </p>
            <button
              onClick={() => navigate('/team-selection')}
              className="btn-primary"
            >
              Start New Game
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="card p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cricket-primary mx-auto mb-4"></div>
                <p className="text-cricket-text-primary font-semibold">Loading game...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadGame;
