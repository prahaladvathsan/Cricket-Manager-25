/**
 * @file PlayerCardModal.jsx
 * @description Modal wrapper for displaying detailed player information
 * Includes "Edit Player" button to open the PlayerEditorModal
 * Uses React Portal to render at document body level for proper stacking
 */

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart3, Activity, Edit3, Sparkles, ArrowRightLeft, DollarSign, TrendingUp } from 'lucide-react';
import usePlayerStore from '../../stores/playerStore';
import useTransferStore from '../../stores/transferStore';
import useLeagueStore from '../../stores/leagueStore';
import { aggregateStats } from '../../utils/matchAnalytics';
import WagonZoneMap from './WagonZoneMap';
import { computePlayerRatings } from '../../utils/ratingHelper';
import TeamName from './TeamName';
import CountryFlag from './CountryFlag';
import PlaystyleBadge from './PlaystyleBadge';
import PlayerEditorModal from '../modals/PlayerEditorModal';

const formatPrice = (price) => {
  if (!price || price === 0) return '-';
  return price >= 1000000
    ? `$${(price / 1000000).toFixed(1)}M`
    : `$${(price / 1000).toFixed(0)}K`;
};

const TransferHistorySection = ({ player, playerId, completedTransfers, activeListings }) => {
  // Get transfers involving this player
  const playerTransfers = useMemo(() => {
    return (completedTransfers || [])
      .filter(t => t.playerId === playerId)
      .reverse(); // newest first
  }, [completedTransfers, playerId]);

  // Get current active listing for this player
  const currentListing = useMemo(() => {
    return (activeListings || []).find(l => l.playerId === playerId);
  }, [activeListings, playerId]);

  return (
    <div className="space-y-4">
      {/* Current Value */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
          <DollarSign className="w-4 h-4 text-trophy-gold" />
          <h3 className="text-base font-semibold text-text-primary">Current Value</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-bg-tertiary rounded">
            <div className="text-xs text-text-secondary mb-1">Annual Salary</div>
            <div className="text-lg font-bold text-trophy-gold">
              {formatPrice(player.soldPrice)}
            </div>
          </div>
          <div className="p-3 bg-bg-tertiary rounded">
            <div className="text-xs text-text-secondary mb-1">Current Team</div>
            <div className="text-sm font-semibold text-text-primary mt-1">
              {player.currentTeam
                ? <TeamName teamId={player.currentTeam} variant="short" inline={true} />
                : <span className="text-gray-500 italic">Free Agent</span>}
            </div>
          </div>
          <div className="p-3 bg-bg-tertiary rounded">
            <div className="text-xs text-text-secondary mb-1">Status</div>
            <div className="text-sm font-semibold text-text-primary mt-1">
              {currentListing ? (
                <span className="text-yellow-400">Listed for Transfer</span>
              ) : !player.currentTeam ? (
                <span className="text-red-400">Uncontracted</span>
              ) : (
                <span className="text-green-400">Contracted</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Listing Info */}
      {currentListing && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
            <ArrowRightLeft className="w-4 h-4 text-yellow-400" />
            <h3 className="text-base font-semibold text-text-primary">Active Listing</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-2 bg-bg-tertiary rounded">
              <div className="text-xs text-text-secondary">Asking Price</div>
              <div className="text-sm font-bold text-trophy-gold">{formatPrice(currentListing.listingPrice)}</div>
            </div>
            <div className="p-2 bg-bg-tertiary rounded">
              <div className="text-xs text-text-secondary">Top Bid</div>
              <div className="text-sm font-bold text-cricket-accent">
                {currentListing.currentBid > 0 ? formatPrice(currentListing.currentBid) : 'No bids'}
              </div>
            </div>
          </div>
          {currentListing.bids && currentListing.bids.length > 0 && (
            <div>
              <div className="text-xs text-text-secondary mb-2">Bid History ({currentListing.bids.length} bid{currentListing.bids.length !== 1 ? 's' : ''})</div>
              <div className="space-y-1">
                {[...currentListing.bids].reverse().slice(0, 5).map((bid, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-bg-tertiary rounded">
                    <TeamName teamId={bid.teamId} className="text-text-secondary" />
                    <span className="text-text-primary font-semibold">{formatPrice(bid.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transfer History */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-primary">
          <ArrowRightLeft className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-base font-semibold text-text-primary">Transfer History</h3>
        </div>
        {playerTransfers.length > 0 ? (
          <div className="space-y-2">
            {playerTransfers.map((transfer, idx) => (
              <div key={transfer.id || idx} className="flex items-center gap-3 p-2 bg-bg-tertiary rounded text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {transfer.fromTeamId ? (
                      <TeamName teamId={transfer.fromTeamId} variant="short" inline={true} className="text-text-secondary" />
                    ) : (
                      <span className="text-text-tertiary italic">Free Agent</span>
                    )}
                    <span className="text-text-tertiary">→</span>
                    {transfer.toTeamId ? (
                      <TeamName teamId={transfer.toTeamId} variant="short" inline={true} className="text-text-primary font-medium" />
                    ) : (
                      <span className="text-text-tertiary italic">Free Agent</span>
                    )}
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5">
                    {transfer.type === 'release' ? 'Released' : transfer.type === 'free_agency' ? 'Signed' : 'Transfer'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-trophy-gold">{formatPrice(transfer.newPrice)}</div>
                  {transfer.oldPrice > 0 && (
                    <div className="text-xs text-text-tertiary">was {formatPrice(transfer.oldPrice)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-text-tertiary text-sm">
            No transfer history — player acquired at auction
          </div>
        )}
      </div>
    </div>
  );
};

const PHASE_LABELS = {
  powerplay:   'Powerplay',
  earlyMiddle: 'Early Mid',
  lateMiddle:  'Late Mid',
  death:       'Death',
};
const PHASES = ['powerplay', 'earlyMiddle', 'lateMiddle', 'death'];

function sr(runs, balls) { return balls ? ((runs / balls) * 100).toFixed(1) : '-'; }
function econ(runs, balls) { return balls ? ((runs / balls) * 6).toFixed(2) : '-'; }

/**
 * Analytics tab content for a player card.
 * Aggregates across all results in leagueStore that contain analytics for this player.
 */
const PlayerAnalyticsSection = ({ playerId, player }) => {
  const { results } = useLeagueStore();

  // Gather all batting/bowling/wagon segments for this player across all matches
  const { allBatting, allBowling, allWagon, matchLog } = useMemo(() => {
    const allBatting = [];
    const allBowling = [];
    const allWagon = [];
    const matchLog = [];

    for (const result of results) {
      if (!result.analytics?.innings) continue;
      for (const inn of result.analytics.innings) {
        const pData = inn.players?.[playerId];
        if (!pData) continue;
        if (pData.batting?.length) {
          allBatting.push(...pData.batting);
          // Match log entry
          const agg = aggregateStats(pData.batting, {});
          if (agg.balls > 0) {
            matchLog.push({
              matchId: result.matchId,
              date: result.date,
              inningsNumber: inn.inningsNumber,
              opponent: inn.battingTeamId === (result.homeTeam) ? result.awayTeam : result.homeTeam,
              type: 'bat',
              runs: agg.runs,
              balls: agg.balls,
              fours: agg.fours,
              sixes: agg.sixes,
              dismissed: agg.wickets,
            });
          }
        }
        if (pData.bowling?.length) {
          allBowling.push(...pData.bowling);
          const agg = aggregateStats(pData.bowling, {});
          if (agg.balls > 0) {
            matchLog.push({
              matchId: result.matchId,
              date: result.date,
              inningsNumber: inn.inningsNumber,
              opponent: inn.bowlingTeamId === (result.homeTeam) ? result.awayTeam : result.homeTeam,
              type: 'bowl',
              runs: agg.runs,
              balls: agg.balls,
              wickets: agg.wickets,
              dots: agg.dots,
            });
          }
        }
        if (pData.wagonZones?.length) allWagon.push(...pData.wagonZones);
      }
    }

    // Sort match log newest first (approximate by array order reversed)
    matchLog.reverse();

    return { allBatting, allBowling, allWagon, matchLog };
  }, [results, playerId]);

  const isBatter = player.role === 'batsman' || player.role === 'wicket-keeper' || player.role === 'all-rounder';
  const isBowler = player.role === 'bowler' || player.role === 'all-rounder';

  if (allBatting.length === 0 && allBowling.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
        <p className="text-text-secondary text-sm">No analytics data yet.</p>
        <p className="text-text-tertiary text-xs mt-1">Play matches to generate stats.</p>
      </div>
    );
  }

  // Shared table styles for legibility
  const thCls = 'text-left pb-1.5 font-semibold text-text-secondary text-xs';
  const thRCls = 'text-right pb-1.5 font-semibold text-text-secondary text-xs';
  const tdLCls = 'py-1 font-medium text-white/90 text-xs';
  const tdRCls = 'py-1 text-right font-mono font-semibold text-xs';

  return (
    <div className="space-y-4">
      {/* Batting Phase Breakdown */}
      {allBatting.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-primary pb-1">Batting by Phase</h4>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className={thCls}>Phase</th>
                <th className={thRCls}>R</th>
                <th className={thRCls}>B</th>
                <th className={thRCls}>4s</th>
                <th className={thRCls}>6s</th>
                <th className={thRCls}>SR</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map(phase => {
                const agg = aggregateStats(allBatting, { phase });
                if (!agg.balls) return null;
                return (
                  <tr key={phase} className="border-b border-border-primary/40">
                    <td className={tdLCls}>{PHASE_LABELS[phase]}</td>
                    <td className={`${tdRCls} text-trophy-gold`}>{agg.runs}</td>
                    <td className={`${tdRCls} text-white/80`}>{agg.balls}</td>
                    <td className={`${tdRCls} text-blue-300`}>{agg.fours}</td>
                    <td className={`${tdRCls} text-purple-300`}>{agg.sixes}</td>
                    <td className={`${tdRCls} text-green-300`}>{sr(agg.runs, agg.balls)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bowling Phase Breakdown */}
      {allBowling.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-primary pb-1">Bowling by Phase</h4>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className={thCls}>Phase</th>
                <th className={thRCls}>R</th>
                <th className={thRCls}>B</th>
                <th className={thRCls}>W</th>
                <th className={thRCls}>Dots</th>
                <th className={thRCls}>Econ</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map(phase => {
                const agg = aggregateStats(allBowling, { phase });
                if (!agg.balls) return null;
                return (
                  <tr key={phase} className="border-b border-border-primary/40">
                    <td className={tdLCls}>{PHASE_LABELS[phase]}</td>
                    <td className={`${tdRCls} text-white/80`}>{agg.runs}</td>
                    <td className={`${tdRCls} text-white/80`}>{agg.balls}</td>
                    <td className={`${tdRCls} text-red-300`}>{agg.wickets}</td>
                    <td className={`${tdRCls} text-white/60`}>{agg.dots}</td>
                    <td className={`${tdRCls} text-yellow-300`}>{econ(agg.runs, agg.balls)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bowling Plan Breakdown */}
      {allBowling.length > 0 && (() => {
        const plans = [...new Set(allBowling.map(s => s.plan).filter(Boolean))];
        if (!plans.length) return null;
        return (
          <div className="card p-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-primary pb-1">By Bowling Plan</h4>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className={thCls}>Plan</th>
                  <th className={thRCls}>B</th>
                  <th className={thRCls}>W</th>
                  <th className={thRCls}>Econ</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => {
                  const agg = aggregateStats(allBowling, { plan });
                  if (!agg.balls) return null;
                  return (
                    <tr key={plan} className="border-b border-border-primary/40">
                      <td className={tdLCls}>{plan}</td>
                      <td className={`${tdRCls} text-white/80`}>{agg.balls}</td>
                      <td className={`${tdRCls} text-red-300`}>{agg.wickets}</td>
                      <td className={`${tdRCls} text-yellow-300`}>{econ(agg.runs, agg.balls)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Batting Acceleration Tier Breakdown */}
      {allBatting.length > 0 && (() => {
        const tiers = [...new Set(allBatting.map(s => s.tier).filter(Boolean))];
        if (!tiers.length) return null;
        return (
          <div className="card p-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-primary pb-1">By Acceleration Tier</h4>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className={thCls}>Tier</th>
                  <th className={thRCls}>R</th>
                  <th className={thRCls}>B</th>
                  <th className={thRCls}>SR</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => {
                  const agg = aggregateStats(allBatting, { tier });
                  if (!agg.balls) return null;
                  return (
                    <tr key={tier} className="border-b border-border-primary/40">
                      <td className={tdLCls}>{tier}</td>
                      <td className={`${tdRCls} text-trophy-gold`}>{agg.runs}</td>
                      <td className={`${tdRCls} text-white/80`}>{agg.balls}</td>
                      <td className={`${tdRCls} text-green-300`}>{sr(agg.runs, agg.balls)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Wagon Zone Map */}
      {allWagon.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-primary pb-1">Wagon Zone (Season)</h4>
          <WagonZoneMap data={allWagon} />
        </div>
      )}

      {/* Match Log */}
      {matchLog.length > 0 && (
        <div className="card p-3">
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 border-b border-border-primary pb-1">Recent Matches</h4>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className={thCls}>Date</th>
                <th className={thCls}>Type</th>
                <th className={thRCls}>R / W</th>
                <th className={thRCls}>Balls</th>
                <th className={thRCls}>SR / Econ</th>
              </tr>
            </thead>
            <tbody>
              {matchLog.slice(0, 10).map((entry, i) => (
                <tr key={i} className="border-b border-border-primary/40">
                  <td className="py-1 text-xs text-white/60">{entry.date || '—'}</td>
                  <td className="py-1 text-xs font-medium text-white/80 capitalize">{entry.type}</td>
                  <td className={`${tdRCls} text-trophy-gold`}>
                    {entry.type === 'bat' ? entry.runs : entry.wickets}
                  </td>
                  <td className={`${tdRCls} text-white/80`}>{entry.balls}</td>
                  <td className={`${tdRCls} text-green-300`}>
                    {entry.type === 'bat' ? sr(entry.runs, entry.balls) : econ(entry.runs, entry.balls)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const PlayerCardModal = ({ isOpen, onClose, playerId, initialTab }) => {
  const { players, careerStats, currentSeasonId, isPlayerCustomized } = usePlayerStore();
  const { completedTransfers, activeListings } = useTransferStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(initialTab || 'profile');

  if (!isOpen || !playerId) return null;

  const player = players[playerId];
  const computed = player ? computePlayerRatings(player) : null;
  const topPlaystyles = computed?.topPlaystyles || player?.topPlaystyles;
  const primaryPlaystyle = computed?.primaryPlaystyle || player?.primaryPlaystyle;
  const seasonStats = careerStats[playerId]?.seasons?.[currentSeasonId] || null;
  const customizationStatus = isPlayerCustomized ? isPlayerCustomized(playerId) : { isModified: false, isCustom: false };

  if (!player) {
    return createPortal(
      <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] p-4">
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
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] p-4">
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

        {/* Tab Navigation */}
        <div className="flex border-b border-border-primary px-4">
          <button
            onClick={() => setActiveSection('profile')}
            className={`px-3 py-2 text-sm border-b-2 transition-colors ${
              activeSection === 'profile'
                ? 'border-cricket-accent text-text-primary font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveSection('transfers')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
              activeSection === 'transfers'
                ? 'border-cricket-accent text-text-primary font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfer History
          </button>
          <button
            onClick={() => setActiveSection('analytics')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
              activeSection === 'analytics'
                ? 'border-cricket-accent text-text-primary font-semibold'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Performance
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'profile' && (<>
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

          </>)}

          {activeSection === 'transfers' && (
            <TransferHistorySection
              player={player}
              playerId={playerId}
              completedTransfers={completedTransfers}
              activeListings={activeListings}
            />
          )}

          {activeSection === 'analytics' && (
            <PlayerAnalyticsSection playerId={playerId} player={player} />
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
