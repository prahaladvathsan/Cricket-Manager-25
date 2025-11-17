/**
 * @file PlayerCard.jsx
 * @description Reusable player card component for displaying player information
 * across Auction, Squad, and other views. Football Manager-inspired design.
 */

import React, { useMemo } from 'react';
import { Award, TrendingUp, Target, Zap } from 'lucide-react';
import PlayerValuation from '../../core/auction-system/PlayerValuation';
import TeamName from './TeamName';

/**
 * PlayerCard Component
 *
 * @param {Object} player - Player object with stats and playstyles
 * @param {string} variant - Display variant: 'full' | 'compact' | 'auction' (default: 'full')
 * @param {number} soldPrice - Optional sold price to display
 * @param {boolean} showAttributes - Show top attributes (default: false)
 * @param {boolean} showPlaystyles - Show playstyle ratings (default: true)
 * @param {function} onClick - Optional click handler
 * @param {string} className - Additional CSS classes
 * @param {function} onTeamClick - Callback when team name is clicked (to close parent modal)
 */
const PlayerCard = ({
  player,
  variant = 'full',
  soldPrice = null,
  showAttributes = false,
  showPlaystyles = true,
  onClick = null,
  className = '',
  onTeamClick = null
}) => {
  if (!player) return null;

  // Create valuation instance for price formatting
  const valuation = useMemo(() => new PlayerValuation(), []);

  // Role colors
  const roleColors = {
    'batsman': 'bg-blue-900/30 text-blue-400',
    'bowler': 'bg-red-900/30 text-red-400',
    'all-rounder': 'bg-purple-900/30 text-purple-400',
    'wicket-keeper': 'bg-cyan-900/30 text-cyan-400'
  };

  const roleColor = roleColors[player.role?.toLowerCase()] || 'bg-bg-tertiary text-text-secondary';

  // Get top attributes for display
  const getTopAttributes = () => {
    if (!player.attributes) return [];

    const battingAttrs = player.attributes.batting || {};
    const bowlingAttrs = player.attributes.bowling || {};

    // Combine and sort all attributes
    const allAttrs = [
      ...Object.entries(battingAttrs).map(([key, value]) => ({ name: key, value, type: 'batting' })),
      ...Object.entries(bowlingAttrs).map(([key, value]) => ({ name: key, value, type: 'bowling' }))
    ];

    return allAttrs
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Compact variant - minimal info for lists
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center justify-between p-2 bg-bg-secondary border border-border-primary rounded hover:border-border-accent transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary truncate">{player.name}</div>
            <div className="text-xs text-text-secondary flex items-center gap-2 flex-wrap">
              {player.currentTeam && (
                <TeamName
                  teamId={player.currentTeam}
                  variant="short"
                  inline={true}
                  className="text-xs"
                  onBeforeOpen={onTeamClick}
                />
              )}
              {player.role?.toLowerCase() === 'wicket-keeper' && player.primaryPlaystyle?.fielding ? (
                <span>{player.primaryPlaystyle.fielding}</span>
              ) : (
                <>
                  {player.primaryPlaystyle?.batting && (
                    <span>{player.primaryPlaystyle.batting}</span>
                  )}
                  {player.primaryPlaystyle?.bowling && (
                    <span>| {player.primaryPlaystyle.bowling}</span>
                  )}
                </>
              )}
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${roleColor}`}>
            {player.role}
          </span>
        </div>
        {soldPrice && (
          <div className="text-sm font-bold text-cricket-accent ml-3">
            {valuation.formatPrice(soldPrice)}
          </div>
        )}
      </div>
    );
  }

  // Auction variant - optimized for bidding screen
  if (variant === 'auction') {
    return (
      <div className={`card p-3 ${className}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cricket-accent flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-text-primary">{player.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColor}`}>
                  {player.role}
                </span>
                {player.currentTeam && (
                  <TeamName
                    teamId={player.currentTeam}
                    variant="short"
                    inline={true}
                    className="text-xs"
                    onBeforeOpen={onTeamClick}
                  />
                )}
                <span className="text-xs text-text-secondary">
                  {player.nationality} • {player.age}y
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Playstyle Ratings - Simple Color Highlight for Primary */}
        {showPlaystyles && player.topPlaystyles && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Batting */}
            <div className="p-2 bg-bg-tertiary rounded">
              <div className="text-xs font-semibold text-blue-400 mb-1.5">Batting</div>
              <div className="space-y-1">
                {player.topPlaystyles.batting?.slice(0, 3).map((style, idx) => {
                  const isPrimary = player.primaryPlaystyle?.batting === style.name;
                  return (
                    <div key={idx} className="flex items-center justify-between">
                      <span className={`text-xs truncate mr-1 ${isPrimary ? 'text-blue-400 font-medium' : 'text-text-secondary'}`}>
                        {style.name}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${isPrimary ? 'text-blue-400' : 'text-text-primary'}`}>
                        {style.rating.toFixed(0)}
                      </span>
                    </div>
                  );
                }) || <span className="text-xs text-text-tertiary">—</span>}
              </div>
            </div>

            {/* Fielding (for wicket-keepers) OR Bowling (for others) */}
            {player.role?.toLowerCase() === 'wicket-keeper' ? (
              player.topPlaystyles.fielding && player.topPlaystyles.fielding.length > 0 && (
                <div className="p-2 bg-bg-tertiary rounded">
                  <div className="text-xs font-semibold text-cyan-400 mb-1.5">Fielding</div>
                  <div className="space-y-1">
                    {player.topPlaystyles.fielding.slice(0, 3).map((style, idx) => {
                      const isPrimary = player.primaryPlaystyle?.fielding === style.name;
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <span className={`text-xs truncate mr-1 ${isPrimary ? 'text-cyan-400 font-medium' : 'text-text-secondary'}`}>
                            {style.name}
                          </span>
                          <span className={`text-xs font-bold tabular-nums ${isPrimary ? 'text-cyan-400' : 'text-text-primary'}`}>
                            {style.rating.toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ) : (
              <div className="p-2 bg-bg-tertiary rounded">
                <div className="text-xs font-semibold text-red-400 mb-1.5">Bowling</div>
                <div className="space-y-1">
                  {player.topPlaystyles.bowling?.slice(0, 3).map((style, idx) => {
                    const isPrimary = player.primaryPlaystyle?.bowling === style.name;
                    return (
                      <div key={idx} className="flex items-center justify-between">
                        <span className={`text-xs truncate mr-1 ${isPrimary ? 'text-red-400 font-medium' : 'text-text-secondary'}`}>
                          {style.name}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${isPrimary ? 'text-red-400' : 'text-text-primary'}`}>
                          {style.rating.toFixed(0)}
                        </span>
                      </div>
                    );
                  }) || <span className="text-xs text-text-tertiary">—</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats - Compact */}
        <div className="pt-2 border-t border-border-primary">
          <div className="text-xxs text-text-secondary mb-1">Career</div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-1.5 bg-bg-secondary rounded">
              <div className="text-xxs text-text-tertiary">Matches</div>
              <div className="text-sm font-bold text-text-primary">{player.stats?.matches || 0}</div>
            </div>
            <div className="p-1.5 bg-bg-secondary rounded">
              <div className="text-xxs text-text-tertiary">Runs</div>
              <div className="text-sm font-bold text-text-primary">{player.stats?.runs || 0}</div>
            </div>
            <div className="p-1.5 bg-bg-secondary rounded">
              <div className="text-xxs text-text-tertiary">Wickets</div>
              <div className="text-sm font-bold text-text-primary">{player.stats?.wickets || 0}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full variant - complete player details
  return (
    <div className={`card p-4 ${onClick ? 'cursor-pointer hover:border-cricket-accent' : ''} ${className}`} onClick={onClick}>
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4 pb-3 border-b border-border-primary">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-cricket-accent flex-shrink-0" />
            <h3 className="text-xl font-bold text-text-primary">{player.name}</h3>
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className={`px-2 py-1 rounded text-xs font-medium ${roleColor}`}>
              {player.role}
            </span>
            {player.currentTeam && (
              <span className="text-sm">
                <TeamName
                  teamId={player.currentTeam}
                  variant="short"
                  inline={true}
                  onBeforeOpen={onTeamClick}
                />
              </span>
            )}
            <span className="text-text-secondary">{player.nationality}</span>
            <span className="text-text-secondary">{player.age} years</span>
            {player.battingHand && (
              <span className="text-text-tertiary text-xs">
                Bats: {player.battingHand}
              </span>
            )}
            {player.bowlingStyle && (
              <span className="text-text-tertiary text-xs">
                Bowls: {player.bowlingStyle}
              </span>
            )}
          </div>
        </div>
        {soldPrice && (
          <div className="text-right ml-4">
            <div className="text-xs text-text-secondary mb-1">Price</div>
            <div className="text-xl font-bold text-cricket-accent">
              {valuation.formatPrice(soldPrice)}
            </div>
          </div>
        )}
      </div>

      {/* Primary Playstyles */}
      {player.primaryPlaystyle && (
        <div className="mb-4 p-3 bg-cricket-primary/10 border border-cricket-primary/30 rounded-lg">
          <div className="text-xs text-cricket-accent font-semibold mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Primary Playstyles
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {player.primaryPlaystyle.batting && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div>
                  <div className="text-xxs text-text-secondary">Batting</div>
                  <div className="text-sm text-text-primary font-medium">{player.primaryPlaystyle.batting}</div>
                </div>
              </div>
            )}
            {player.role?.toLowerCase() === 'wicket-keeper' ? (
              player.primaryPlaystyle.fielding && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div>
                    <div className="text-xxs text-text-secondary">Fielding</div>
                    <div className="text-sm text-text-primary font-medium">{player.primaryPlaystyle.fielding}</div>
                  </div>
                </div>
              )
            ) : (
              player.primaryPlaystyle.bowling && (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div>
                    <div className="text-xxs text-text-secondary">Bowling</div>
                    <div className="text-sm text-text-primary font-medium">{player.primaryPlaystyle.bowling}</div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Top Attributes */}
      {showAttributes && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-text-primary mb-2">Top Attributes</div>
          <div className="grid grid-cols-5 gap-2">
            {getTopAttributes().map((attr, idx) => (
              <div key={idx} className="text-center p-2 bg-bg-tertiary rounded">
                <div className="text-xs text-text-secondary capitalize truncate">{attr.name}</div>
                <div className="text-lg font-bold text-cricket-accent">{attr.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playstyle Ratings */}
      {showPlaystyles && player.topPlaystyles && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Batting Playstyles */}
          <div className="p-3 bg-bg-tertiary rounded-lg">
            <div className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Batting Playstyles
            </div>
            <div className="space-y-2">
              {player.topPlaystyles.batting?.slice(0, 5).map((style, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">{style.name}</span>
                  <span className="text-sm font-bold text-text-primary tabular-nums">{style.rating.toFixed(1)}</span>
                </div>
              )) || <span className="text-xs text-text-tertiary">No batting data</span>}
            </div>
          </div>

          {/* Fielding (for wicket-keepers) OR Bowling (for others) */}
          {player.role?.toLowerCase() === 'wicket-keeper' ? (
            player.topPlaystyles.fielding && player.topPlaystyles.fielding.length > 0 && (
              <div className="p-3 bg-bg-tertiary rounded-lg">
                <div className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Fielding Playstyles
                </div>
                <div className="space-y-2">
                  {player.topPlaystyles.fielding.slice(0, 5).map((style, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{style.name}</span>
                      <span className="text-sm font-bold text-text-primary tabular-nums">{style.rating.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="p-3 bg-bg-tertiary rounded-lg">
              <div className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Bowling Playstyles
              </div>
              <div className="space-y-2">
                {player.topPlaystyles.bowling?.slice(0, 5).map((style, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">{style.name}</span>
                    <span className="text-sm font-bold text-text-primary tabular-nums">{style.rating.toFixed(1)}</span>
                  </div>
                )) || <span className="text-xs text-text-tertiary">No bowling data</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Condition Indicators (if available) */}
      {player.condition && (
        <div className="mt-4 pt-3 border-t border-border-primary">
          <div className="grid grid-cols-2 gap-3">
            {player.condition.fitness !== undefined && (
              <div>
                <div className="text-xs text-text-secondary mb-1">Fitness</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        player.condition.fitness >= 80 ? 'bg-status-excellent' :
                        player.condition.fitness >= 60 ? 'bg-status-good' :
                        player.condition.fitness >= 40 ? 'bg-status-average' : 'bg-status-poor'
                      }`}
                      style={{ width: `${player.condition.fitness}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-text-primary tabular-nums w-8 text-right">
                    {player.condition.fitness}
                  </span>
                </div>
              </div>
            )}
            {player.condition.form !== undefined && (
              <div>
                <div className="text-xs text-text-secondary mb-1">Form</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        player.condition.form >= 80 ? 'bg-status-excellent' :
                        player.condition.form >= 60 ? 'bg-status-good' :
                        player.condition.form >= 40 ? 'bg-status-average' : 'bg-status-poor'
                      }`}
                      style={{ width: `${player.condition.form}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-text-primary tabular-nums w-8 text-right">
                    {player.condition.form}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerCard;
