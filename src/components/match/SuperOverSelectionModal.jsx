/**
 * @file SuperOverSelectionModal.jsx
 * @description Modal for selecting super over squad (3 batsmen + 1 bowler)
 */

import React, { useState, useMemo } from 'react';
import { X, Zap, Users, Target, Check, AlertCircle } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import useTeamStore from '../../stores/teamStore';

const SuperOverSelectionModal = ({
  isOpen,
  onClose,
  onStartSuperOver,
  userTeamId,
  opponentTeamId,
  userPlayingXI,
  opponentPlayingXI,
  userBatsFirst // true if user's team bats first in super over
}) => {
  const getPlayer = usePlayerStore(state => state.getPlayer);
  const teams = useTeamStore(state => state.teams);

  const [selectedBatsmen, setSelectedBatsmen] = useState([]);
  const [selectedBowler, setSelectedBowler] = useState(null);

  const userTeam = teams[userTeamId];
  const opponentTeam = teams[opponentTeamId];

  // Get player details for playing XI
  const userPlayers = useMemo(() => {
    return userPlayingXI.map(id => getPlayer(id)).filter(Boolean);
  }, [userPlayingXI, getPlayer]);

  const opponentPlayers = useMemo(() => {
    return opponentPlayingXI.map(id => getPlayer(id)).filter(Boolean);
  }, [opponentPlayingXI, getPlayer]);

  // Auto-select AI opponent's best players
  const aiSelection = useMemo(() => {
    const sortedByBatting = [...opponentPlayers].sort((a, b) =>
      (b.ratings?.batting || 0) - (a.ratings?.batting || 0)
    );
    const sortedByBowling = [...opponentPlayers].sort((a, b) =>
      (b.ratings?.bowling || 0) - (a.ratings?.bowling || 0)
    );

    return {
      batsmen: sortedByBatting.slice(0, 3),
      bowler: sortedByBowling[0]
    };
  }, [opponentPlayers]);

  // Handle batsman selection
  const handleBatsmanToggle = (playerId) => {
    if (selectedBatsmen.includes(playerId)) {
      setSelectedBatsmen(selectedBatsmen.filter(id => id !== playerId));
    } else if (selectedBatsmen.length < 3) {
      setSelectedBatsmen([...selectedBatsmen, playerId]);
    }
  };

  // Handle bowler selection
  const handleBowlerSelect = (playerId) => {
    setSelectedBowler(playerId);
  };

  // Validation
  const isValid = selectedBatsmen.length === 3 && selectedBowler;

  // Handle start super over
  const handleStart = () => {
    if (!isValid) return;

    onStartSuperOver({
      userSelection: {
        batsmen: selectedBatsmen,
        bowler: selectedBowler
      },
      aiSelection: {
        batsmen: aiSelection.batsmen.map(p => p.id),
        bowler: aiSelection.bowler?.id
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-black/85 backdrop-blur-md border border-border-primary rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-cricket-accent p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Super Over!</h2>
              <p className="text-sm text-white/80">Match Tied - Select your squad</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Batting Order Info */}
        <div className="bg-bg-tertiary p-3 border-b border-border-primary">
          <div className="flex items-center justify-center gap-2 text-text-secondary text-sm">
            <Target className="w-4 h-4" />
            <span>
              {userBatsFirst ? (
                <><span className="text-cricket-accent font-semibold">{userTeam?.name}</span> bats first in Super Over</>
              ) : (
                <><span className="text-cricket-accent font-semibold">{opponentTeam?.name}</span> bats first, you chase</>
              )}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* User Team Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-cricket-accent" />
                <h3 className="font-semibold text-text-primary">{userTeam?.name} - Your Selection</h3>
              </div>

              {/* Batsmen Selection */}
              <div className="card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Select 3 Batsmen</span>
                  <span className={`text-xs ${selectedBatsmen.length === 3 ? 'text-green-500' : 'text-text-secondary'}`}>
                    {selectedBatsmen.length}/3 selected
                  </span>
                </div>
                <div className="space-y-1">
                  {userPlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => handleBatsmanToggle(player.id)}
                      disabled={selectedBatsmen.length >= 3 && !selectedBatsmen.includes(player.id)}
                      className={`w-full p-2 rounded flex items-center justify-between text-left transition-colors ${
                        selectedBatsmen.includes(player.id)
                          ? 'bg-cricket-accent/20 border border-cricket-accent'
                          : selectedBatsmen.length >= 3
                            ? 'bg-bg-tertiary opacity-50 cursor-not-allowed'
                            : 'bg-bg-tertiary hover:bg-bg-tertiary/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedBatsmen.includes(player.id) && (
                          <Check className="w-4 h-4 text-cricket-accent" />
                        )}
                        <span className="text-sm text-text-primary">{player.name}</span>
                        <span className="text-xs text-text-secondary">({player.role})</span>
                      </div>
                      <span className="text-xs text-cricket-accent">
                        BAT: {player.ratings?.batting || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bowler Selection */}
              <div className="card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Select 1 Bowler</span>
                  <span className={`text-xs ${selectedBowler ? 'text-green-500' : 'text-text-secondary'}`}>
                    {selectedBowler ? '1/1 selected' : '0/1 selected'}
                  </span>
                </div>
                <div className="space-y-1">
                  {userPlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => handleBowlerSelect(player.id)}
                      className={`w-full p-2 rounded flex items-center justify-between text-left transition-colors ${
                        selectedBowler === player.id
                          ? 'bg-cricket-accent/20 border border-cricket-accent'
                          : 'bg-bg-tertiary hover:bg-bg-tertiary/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedBowler === player.id && (
                          <Check className="w-4 h-4 text-cricket-accent" />
                        )}
                        <span className="text-sm text-text-primary">{player.name}</span>
                        <span className="text-xs text-text-secondary">({player.role})</span>
                      </div>
                      <span className="text-xs text-blue-400">
                        BOWL: {player.ratings?.bowling || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Opponent Team (AI Selected) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-text-primary">{opponentTeam?.name} - AI Selection</h3>
              </div>

              {/* AI Batsmen */}
              <div className="card p-3 opacity-75">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Batsmen</span>
                  <span className="text-xs text-green-500">3/3 selected</span>
                </div>
                <div className="space-y-1">
                  {aiSelection.batsmen.map((player, idx) => (
                    <div
                      key={player.id}
                      className="w-full p-2 rounded bg-bg-tertiary flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary w-4">{idx + 1}.</span>
                        <span className="text-sm text-text-primary">{player.name}</span>
                        <span className="text-xs text-text-secondary">({player.role})</span>
                      </div>
                      <span className="text-xs text-cricket-accent">
                        BAT: {player.ratings?.batting || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Bowler */}
              <div className="card p-3 opacity-75">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Bowler</span>
                  <span className="text-xs text-green-500">1/1 selected</span>
                </div>
                {aiSelection.bowler && (
                  <div className="w-full p-2 rounded bg-bg-tertiary flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-primary">{aiSelection.bowler.name}</span>
                      <span className="text-xs text-text-secondary">({aiSelection.bowler.role})</span>
                    </div>
                    <span className="text-xs text-blue-400">
                      BOWL: {aiSelection.bowler.ratings?.bowling || 0}
                    </span>
                  </div>
                )}
              </div>

              {/* Rules Info */}
              <div className="card p-3 bg-bg-tertiary/50">
                <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-cricket-accent" />
                  Super Over Rules
                </h4>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li>• Each team faces 6 balls maximum</li>
                  <li>• Maximum 2 wickets per team</li>
                  <li>• Team with more runs wins</li>
                  <li>• If tied, team batting first wins</li>
                  <li>• Stats don't count toward career records</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-primary bg-bg-tertiary">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              {!isValid && (
                <span className="text-yellow-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Select 3 batsmen and 1 bowler to continue
                </span>
              )}
            </div>
            <button
              onClick={handleStart}
              disabled={!isValid}
              className={`px-6 py-2 rounded font-semibold flex items-center gap-2 transition-colors ${
                isValid
                  ? 'bg-cricket-accent text-white hover:bg-cricket-accent/80'
                  : 'bg-bg-secondary text-text-tertiary cursor-not-allowed'
              }`}
            >
              <Zap className="w-5 h-5" />
              Start Super Over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperOverSelectionModal;
