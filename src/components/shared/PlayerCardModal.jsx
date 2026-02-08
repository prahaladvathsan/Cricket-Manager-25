/**
 * @file PlayerCardModal.jsx
 * @description Modal wrapper for displaying detailed player information
 * Includes "Edit Player" button to open the PlayerEditorModal
 * Uses React Portal to render at document body level for proper stacking
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart3, Activity, Edit3, Sparkles } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import { computePlayerRatings } from '../../utils/ratingHelper';
import TeamName from './TeamName';
import CountryFlag from './CountryFlag';
import PlaystyleBadge from './PlaystyleBadge';
import PlayerEditorModal from '../modals/PlayerEditorModal';

const PlayerCardModal = ({ isOpen, onClose, playerId }) => {
  const { players, careerStats, currentSeasonId, isPlayerCustomized } = usePlayerStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  if (!isOpen || !playerId) return null;

  const player = players[playerId];
  const computed = player ? computePlayerRatings(player) : null;
  const topPlaystyles = computed?.topPlaystyles || player?.topPlaystyles;
  const primaryPlaystyle = computed?.primaryPlaystyle || player?.primaryPlaystyle;
  const seasonStats = careerStats[playerId]?.seasons[currentSeasonId] || null;
  const customizationStatus = isPlayerCustomized ? isPlayerCustomized(playerId) : { isModified: false, isCustom: false };

  if (!player) {
    return createPortal(
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-3xl w-full">
          <div className="p-6 text-center">
            <p className="text-text-secondary">Player not found</p>
            <button
              onClick={onClose}
              className="btn-secondary mt-4 py-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cricket-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Player Profile
            </h2>
            {customizationStatus.isCustom && (
              <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Custom
              </span>
            )}
            {customizationStatus.isModified && !customizationStatus.isCustom && (
              <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                Modified
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-tertiary rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Player Header */}
          <div className="card p-4 mb-4">
            <div className="flex items-start justify-between mb-3 pb-3 border-b border-border-primary">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-text-primary">{player.name}</h3>
                </div>
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    player.role === 'batsman' ? 'bg-blue-900/30 text-blue-400' :
                    player.role === 'bowler' ? 'bg-red-900/30 text-red-400' :
                    player.role === 'all-rounder' ? 'bg-purple-900/30 text-purple-400' :
                    player.role === 'wicket-keeper' ? 'bg-cyan-900/30 text-cyan-400' :
                    'bg-bg-tertiary text-text-secondary'
                  }`}>
                    {player.role}
                  </span>
                  {player.currentTeam && (
                    <span className="text-sm">
                      <TeamName
                        teamId={player.currentTeam}
                        variant="short"
                        inline={true}
                        onBeforeOpen={onClose}
                      />
                    </span>
                  )}
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <CountryFlag nationality={player.nationality} className="w-5 h-3" />
                    {player.nationality}
                  </span>
                  <span className="text-text-secondary">{player.age} years</span>
                  {player.battingHand && (
                    <span className="text-text-tertiary text-xs">Bats: {player.battingHand}</span>
                  )}
                  {player.bowlingStyle && (
                    <span className="text-text-tertiary text-xs">Bowls: {player.bowlingStyle}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Top 3 Playstyles */}
            {topPlaystyles && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Batting Top 3 - show for all players */}
                {topPlaystyles.batting && topPlaystyles.batting.length > 0 && (
                  <div className="p-2 bg-bg-tertiary rounded">
                    <div className="text-xs font-semibold text-blue-400 mb-2">Top Batting Playstyles</div>
                    <div className="space-y-1">
                      {topPlaystyles.batting.slice(0, 3).map((style, idx) => {
                        const isPrimary = primaryPlaystyle?.batting === style.name;
                        return (
                          <div key={idx} className="flex items-center justify-between">
                            <span className={`text-xs truncate mr-1 ${
                              isPrimary ? 'text-blue-400 font-bold' : 'text-text-secondary'
                            }`}>
                              {isPrimary && '★ '}{style.name}
                            </span>
                            <span className={`text-xs font-bold tabular-nums ${
                              isPrimary ? 'text-blue-400' : 'text-text-primary'
                            }`}>
                              {style.rating.toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fielding Top 3 - for wicket-keepers instead of bowling */}
                {player.role === 'wicket-keeper' ? (
                  topPlaystyles.fielding && topPlaystyles.fielding.length > 0 && (
                    <div className="p-2 bg-bg-tertiary rounded">
                      <div className="text-xs font-semibold text-cyan-400 mb-2">Top Fielding Playstyles</div>
                      <div className="space-y-1">
                        {topPlaystyles.fielding.slice(0, 3).map((style, idx) => {
                          const isPrimary = primaryPlaystyle?.fielding === style.name;
                          return (
                            <div key={idx} className="flex items-center justify-between">
                              <span className={`text-xs truncate mr-1 ${
                                isPrimary ? 'text-cyan-400 font-bold' : 'text-text-secondary'
                              }`}>
                                {isPrimary && '★ '}{style.name}
                              </span>
                              <span className={`text-xs font-bold tabular-nums ${
                                isPrimary ? 'text-cyan-400' : 'text-text-primary'
                              }`}>
                                {style.rating.toFixed(0)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                ) : (
                  /* Bowling Top 3 - for non-wicket-keepers */
                  topPlaystyles.bowling && topPlaystyles.bowling.length > 0 && (
                    <div className="p-2 bg-bg-tertiary rounded">
                      <div className="text-xs font-semibold text-red-400 mb-2">Top Bowling Playstyles</div>
                      <div className="space-y-1">
                        {topPlaystyles.bowling.slice(0, 3).map((style, idx) => {
                          const isPrimary = primaryPlaystyle?.bowling === style.name;
                          return (
                            <div key={idx} className="flex items-center justify-between">
                              <span className={`text-xs truncate mr-1 ${
                                isPrimary ? 'text-red-400 font-bold' : 'text-text-secondary'
                              }`}>
                                {isPrimary && '★ '}{style.name}
                              </span>
                              <span className={`text-xs font-bold tabular-nums ${
                                isPrimary ? 'text-red-400' : 'text-text-primary'
                              }`}>
                                {style.rating.toFixed(0)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* All Attributes */}
          {player.attributes && (
            <div className="card p-4 mb-4">
              <h3 className="text-base font-semibold text-text-primary mb-3 pb-2 border-b border-border-primary">
                Attributes
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Batting Attributes */}
                {player.attributes.batting && Object.keys(player.attributes.batting).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-blue-400 mb-2">Batting</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(player.attributes.batting).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs p-1 bg-bg-tertiary rounded">
                          <span className="text-text-secondary capitalize truncate">{key}</span>
                          <span className="text-text-primary font-mono font-semibold ml-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bowling Attributes */}
                {player.attributes.bowling && Object.keys(player.attributes.bowling).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-red-400 mb-2">Bowling</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(player.attributes.bowling).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs p-1 bg-bg-tertiary rounded">
                          <span className="text-text-secondary capitalize truncate">{key}</span>
                          <span className="text-text-primary font-mono font-semibold ml-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Career Statistics Section */}
          {player.stats && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
                <Activity className="w-4 h-4 text-cricket-accent" />
                <h3 className="text-base font-semibold text-text-primary">Career Statistics</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Batting Stats */}
                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Matches</div>
                  <div className="text-xl font-bold text-text-primary">
                    {player.stats.matches || 0}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Runs</div>
                  <div className="text-xl font-bold text-text-primary">
                    {player.stats.runs || 0}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Average</div>
                  <div className="text-xl font-bold text-text-primary">
                    {player.stats.average?.toFixed(1) || '0.0'}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Strike Rate</div>
                  <div className="text-xl font-bold text-text-primary">
                    {player.stats.strikeRate?.toFixed(1) || '0.0'}
                  </div>
                </div>

                {/* Bowling Stats */}
                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Wickets</div>
                  <div className="text-xl font-bold text-text-primary">
                    {player.stats.wickets || 0}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Economy</div>
                  <div className="text-xl font-bold text-text-primary">
                    {player.stats.economy?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Bowling Avg</div>
                  <div className="text-xl font-bold text-text-primary">
                    {player.stats.bowlingAverage?.toFixed(1) || '0.0'}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Best Figures</div>
                  <div className="text-xl font-bold text-text-primary">
                    {player.stats.bestBowling || '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Season Impact Section */}
          {seasonStats && (seasonStats.battingImpact || seasonStats.bowlingImpact || seasonStats.fieldingImpact) && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
                <Activity className="w-4 h-4 text-trophy-gold" />
                <h3 className="text-base font-semibold text-text-primary">Season Impact</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Batting</div>
                  <div className={`text-xl font-bold ${
                    (seasonStats.battingImpact || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(seasonStats.battingImpact || 0) >= 0 ? '+' : ''}{(seasonStats.battingImpact || 0).toFixed(1)}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Bowling</div>
                  <div className={`text-xl font-bold ${
                    (seasonStats.bowlingImpact || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(seasonStats.bowlingImpact || 0) >= 0 ? '+' : ''}{(seasonStats.bowlingImpact || 0).toFixed(1)}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded">
                  <div className="text-xs text-text-secondary mb-1">Fielding</div>
                  <div className={`text-xl font-bold ${
                    (seasonStats.fieldingImpact || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(seasonStats.fieldingImpact || 0) >= 0 ? '+' : ''}{(seasonStats.fieldingImpact || 0).toFixed(1)}
                  </div>
                </div>

                <div className="p-3 bg-bg-tertiary rounded border-2 border-trophy-gold/30">
                  <div className="text-xs text-trophy-gold mb-1">Total Impact</div>
                  <div className={`text-xl font-bold ${
                    (seasonStats.totalImpact || 0) >= 0 ? 'text-trophy-gold' : 'text-red-400'
                  }`}>
                    {(seasonStats.totalImpact || 0) >= 0 ? '+' : ''}{(seasonStats.totalImpact || 0).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex justify-between gap-2 px-4 py-3 border-t border-border-primary">
          <button
            onClick={() => setIsEditorOpen(true)}
            className="btn-secondary px-4 py-2 text-sm flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit Player
          </button>
          <button
            onClick={onClose}
            className="btn-primary px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Player Editor Modal */}
      <PlayerEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        playerId={playerId}
      />
    </div>,
    document.body
  );
};

export default PlayerCardModal;
