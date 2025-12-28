/**
 * @file SimulationOverlay.jsx
 * @description Fullscreen overlay for simulation progress with live event summaries
 */

import React from 'react';
import {
  Trophy,
  DollarSign,
  Gavel,
  ArrowRightLeft,
  Calendar,
  Square,
  HeartPulse
} from 'lucide-react';
import TeamName from './TeamName';
import CricketBallSpinner from './CricketBallSpinner';

/**
 * Match result summary item (reuses League Results patterns)
 */
const MatchResultItem = ({ result }) => {
  if (!result) return null;

  const innings1Team = result.innings1?.battingTeam;
  const innings2Team = result.innings2?.battingTeam;

  return (
    <div className="bg-bg-tertiary/50 border border-border-primary rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 space-y-1">
          {/* First Innings */}
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${result.winner === innings1Team ? 'text-text-primary' : 'text-text-secondary'}`}>
              <TeamName teamId={innings1Team} inline={true} disableClick={true} />
            </span>
            <span className="font-mono text-text-primary">
              {result.innings1?.totalScore || 0}/{result.innings1?.wickets || 0}
            </span>
          </div>
          {/* Second Innings */}
          <div className="flex items-center justify-between text-sm">
            <span className={`font-medium ${result.winner === innings2Team ? 'text-text-primary' : 'text-text-secondary'}`}>
              <TeamName teamId={innings2Team} inline={true} disableClick={true} />
            </span>
            <span className="font-mono text-text-primary">
              {result.innings2?.totalScore || 0}/{result.innings2?.wickets || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="text-xs text-cricket-accent border-t border-border-primary pt-2">
        <TeamName teamId={result.winner} inline={true} disableClick={true} /> won by {result.margin}
      </div>
    </div>
  );
};

/**
 * Auction summary item
 */
const AuctionSummaryItem = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3">
      <div className="flex items-center gap-2 mb-2">
        <Gavel className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-purple-400">Auction Complete</span>
      </div>
      <div className="text-xs text-text-secondary space-y-1">
        <p>Players sold: {summary.playersSold || 0}</p>
        <p>Total spent: ${((summary.totalSpent || 0) / 1000000).toFixed(1)}M</p>
      </div>
    </div>
  );
};

/**
 * Transfer completion item
 */
const TransferItem = ({ transfer }) => {
  if (!transfer) return null;

  return (
    <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-4 h-4 text-green-400" />
        <span className="text-sm text-text-primary">{transfer.playerName}</span>
      </div>
      <div className="text-xs text-text-secondary mt-1">
        <TeamName teamId={transfer.fromTeam} inline={true} disableClick={true} /> → <TeamName teamId={transfer.toTeam} inline={true} disableClick={true} />
        {transfer.fee && ` • $${(transfer.fee / 1000000).toFixed(1)}M`}
      </div>
    </div>
  );
};

/**
 * Season end summary item
 */
const SeasonEndItem = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium text-yellow-400">Season {summary.season} Complete</span>
      </div>
      {summary.champion && (
        <div className="text-xs text-text-secondary">
          Champion: <TeamName teamId={summary.champion} inline={true} disableClick={true} />
        </div>
      )}
    </div>
  );
};

/**
 * Injury event item
 */
const InjuryItem = ({ injury }) => {
  if (!injury) return null;

  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
      <div className="flex items-center gap-2">
        <HeartPulse className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400 font-medium">{injury.playerName}</span>
      </div>
      <div className="text-xs text-text-secondary mt-1">
        {injury.injuryType} - Out for {injury.daysOut} days
        {injury.teamId && (
          <span className="ml-1">
            (<TeamName teamId={injury.teamId} inline={true} disableClick={true} variant="short" />)
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * SimulationOverlay - Fullscreen overlay showing simulation progress
 * @param {Object} props
 * @param {boolean} props.isVisible - Whether overlay is visible
 * @param {Object} props.progress - Progress data {daysSimulated, totalDays, matchesSimulated, etc}
 * @param {Array} props.events - Array of events that occurred during simulation
 * @param {Function} props.onStop - Callback to stop simulation (null if not stoppable)
 * @param {string} props.message - Current status message
 */
const SimulationOverlay = ({
  isVisible,
  progress = {},
  events = [],
  onStop = null,
  message = 'Simulating...'
}) => {
  if (!isVisible) return null;

  const { daysSimulated = 0, totalDays = 0, matchesSimulated = 0, auctionProgress = null } = progress;

  // Calculate progress - use auctionProgress if in auction phase, otherwise day progress
  const isInAuction = auctionProgress !== null && auctionProgress !== undefined;
  const percentComplete = isInAuction
    ? auctionProgress
    : (totalDays > 0 ? (daysSimulated / totalDays) * 100 : 0);

  // Get the last 5 events for display (most recent first)
  const recentEvents = events.slice(-5).reverse();

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
      <div className="w-full max-w-2xl mx-4">
        {/* Main Progress Card */}
        <div className="bg-cricket-surface border-2 border-cricket-accent rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-cricket-primary/30 px-6 py-4 border-b border-cricket-accent/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <CricketBallSpinner className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    Simulating Season...
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {message}
                  </p>
                </div>
              </div>

              {/* Stop Button */}
              {onStop && (
                <button
                  onClick={onStop}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="px-6 py-4 border-b border-border-primary">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">Progress</span>
                <span className="text-cricket-accent font-mono">
                  {isInAuction
                    ? `${auctionProgress}% auction complete`
                    : `${daysSimulated} / ${totalDays} days`
                  }
                </span>
              </div>
              <div className="w-full bg-bg-tertiary rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cricket-accent to-cricket-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cricket-accent font-mono">
                  {isInAuction ? (progress.playersSold || 0) : daysSimulated}
                </div>
                <div className="text-xs text-text-secondary">
                  {isInAuction ? 'Players Sold' : 'Days Simulated'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary font-mono">
                  {matchesSimulated}
                </div>
                <div className="text-xs text-text-secondary">Matches Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary font-mono">
                  {Math.round(percentComplete)}%
                </div>
                <div className="text-xs text-text-secondary">Complete</div>
              </div>
            </div>
          </div>

          {/* Live Events Feed */}
          <div className="px-6 py-4 max-h-80 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary">
                Live Event Feed
              </h3>
            </div>

            {recentEvents.length > 0 ? (
              <div className="space-y-2">
                {recentEvents.map((event, idx) => {
                  if (event.type === 'match') {
                    return <MatchResultItem key={idx} result={event.data} />;
                  } else if (event.type === 'auction') {
                    return <AuctionSummaryItem key={idx} summary={event.data} />;
                  } else if (event.type === 'transfer') {
                    return <TransferItem key={idx} transfer={event.data} />;
                  } else if (event.type === 'season_end') {
                    return <SeasonEndItem key={idx} summary={event.data} />;
                  } else if (event.type === 'injury') {
                    return <InjuryItem key={idx} injury={event.data} />;
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-text-tertiary">
                <CricketBallSpinner className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Waiting for events...</p>
              </div>
            )}
          </div>
        </div>

        {/* Info Text */}
        <div className="text-center mt-4 space-y-3">
          <p className="text-text-tertiary text-xs">
            {onStop
              ? 'Click Stop to pause simulation at the current day'
              : 'Simulation in progress...'
            }
          </p>
          <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-lg px-4 py-2 inline-block">
            <p className="text-yellow-400 text-sm">
              Brief pauses are normal during heavy processing. Please wait for simulation to complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationOverlay;
