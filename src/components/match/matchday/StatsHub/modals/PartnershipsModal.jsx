/**
 * @file PartnershipsModal.jsx
 * @description Full-screen modal with innings-separated partnerships display
 * Features milestone indicators (50+, 100+ runs), minimal spacing, and innings tabs
 */

import React, { useMemo, useState } from 'react';
import { X, Users2, Trophy } from 'lucide-react';
import useMatchStore from '../../../../../stores/matchStore';
import useLeagueStore from '../../../../../stores/leagueStore';
import usePlayerStore from '../../../../../stores/playerStore';
import PlayerName from '../../../../shared/PlayerName';

const PartnershipsModal = ({ isOpen, onClose }) => {
  // Subscribe to stores
  const ballByBall = useMatchStore(state => state.ballByBall);
  const firstBattingTeamId = useMatchStore(state => state.firstBattingTeamId);
  const homeTeamId = useMatchStore(state => state.homeTeamId);
  const awayTeamId = useMatchStore(state => state.awayTeamId);
  const getPlayer = usePlayerStore(state => state.getPlayer);
  const getClub = useLeagueStore(state => state.getClub);

  // Determine which innings to show tabs for
  const maxInnings = Math.max(...ballByBall.map(b => b.innings || 1), 1);
  const hasSecondInnings = maxInnings >= 2;

  const [activeInnings, setActiveInnings] = useState(maxInnings); // Default to current innings

  // Get team colors for a specific innings
  const getTeamColors = (inningsNum) => {
    let teamId;
    if (inningsNum === 1) {
      teamId = firstBattingTeamId;
    } else {
      // 2nd innings is the other team
      teamId = firstBattingTeamId === homeTeamId ? awayTeamId : homeTeamId;
    }

    const club = getClub(teamId);
    return {
      primary: club?.colors?.primary || '#D4AF37',
      secondary: club?.colors?.secondary || '#B8941F'
    };
  };

  // Calculate partnerships for a specific innings
  const calculateInningsPartnerships = useMemo(() => (inningsNum) => {
    const inningsBalls = ballByBall.filter(ball => ball.innings === inningsNum);

    if (inningsBalls.length === 0) return [];

    const partnershipsList = [];
    let currentPartnership = null;
    let partnershipRuns = 0;
    let partnershipBalls = 0;
    let bat1Runs = 0;
    let bat2Runs = 0;
    let boundaries = 0;
    let dots = 0;

    inningsBalls.forEach((ball) => {
      const batsmen = [ball.striker, ball.nonStriker].sort();

      // Start new partnership or continue existing
      if (!currentPartnership) {
        currentPartnership = {
          batsman1Id: batsmen[0],
          batsman2Id: batsmen[1],
          wicket: partnershipsList.length === 0 ? null : partnershipsList.length,
        };
      }

      // Check if partnership changed
      const currentBatsmen = [currentPartnership.batsman1Id, currentPartnership.batsman2Id].sort();
      if (batsmen[0] !== currentBatsmen[0] || batsmen[1] !== currentBatsmen[1]) {
        // Partnership ended, save it
        partnershipsList.push({
          ...currentPartnership,
          runs: partnershipRuns,
          balls: partnershipBalls,
          batsman1Runs: bat1Runs,
          batsman2Runs: bat2Runs,
          boundaries,
          dots,
          strikeRate: partnershipBalls > 0 ? ((partnershipRuns / partnershipBalls) * 100).toFixed(1) : '0.0',
          isActive: false
        });

        // Start new partnership
        currentPartnership = {
          batsman1Id: batsmen[0],
          batsman2Id: batsmen[1],
          wicket: partnershipsList.length,
        };
        partnershipRuns = 0;
        partnershipBalls = 0;
        bat1Runs = 0;
        bat2Runs = 0;
        boundaries = 0;
        dots = 0;
      }

      // Add to partnership totals
      const runsThisBall = ball.runs || 0;
      partnershipRuns += runsThisBall;

      if (ball.striker === currentPartnership.batsman1Id) {
        bat1Runs += runsThisBall;
      } else {
        bat2Runs += runsThisBall;
      }

      if (ball.isLegal !== false && !ball.isWide) {
        partnershipBalls += 1;

        // Count boundaries and dots
        if (runsThisBall === 4 || runsThisBall === 6) {
          boundaries += 1;
        }
        if (runsThisBall === 0) {
          dots += 1;
        }
      }
    });

    // Add current partnership
    if (currentPartnership) {
      // Only mark as active if this is the current active innings
      const isCurrentInnings = inningsNum === maxInnings;
      partnershipsList.push({
        ...currentPartnership,
        runs: partnershipRuns,
        balls: partnershipBalls,
        batsman1Runs: bat1Runs,
        batsman2Runs: bat2Runs,
        boundaries,
        dots,
        strikeRate: partnershipBalls > 0 ? ((partnershipRuns / partnershipBalls) * 100).toFixed(1) : '0.0',
        isActive: isCurrentInnings
      });
    }

    return partnershipsList;
  }, [ballByBall, maxInnings]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Format overs
  const formatOvers = (balls) => {
    const completedOvers = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return remainingBalls > 0 ? `${completedOvers}.${remainingBalls}` : `${completedOvers}`;
  };

  if (!isOpen) return null;

  const partnerships = calculateInningsPartnerships(activeInnings);
  const maxRuns = Math.max(...partnerships.map(p => p.runs), 50);
  const teamColors = getTeamColors(activeInnings);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-cricket-accent" />
              <h2 className="text-lg font-semibold text-text-primary">
                Partnerships
                <span className="ml-2 text-sm text-text-secondary">
                  ({partnerships.length} partnership{partnerships.length !== 1 ? 's' : ''})
                </span>
              </h2>
            </div>
            {/* Innings Tabs */}
            {hasSecondInnings && (
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveInnings(1)}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    activeInnings === 1
                      ? 'bg-cricket-primary text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  1st Innings
                </button>
                <button
                  onClick={() => setActiveInnings(2)}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    activeInnings === 2
                      ? 'bg-cricket-primary text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  2nd Innings
                </button>
              </div>
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

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <style jsx>{`
            .flex-1::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {partnerships.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              No partnerships yet
            </div>
          ) : (
            <div className="space-y-1">
              {/* Partnerships with minimal spacing */}
              <div className="bg-bg-tertiary rounded-lg p-4 space-y-1">
                {partnerships.map((partnership, idx) => {
                  const bat1Percentage = (partnership.batsman1Runs / maxRuns) * 100;
                  const bat2Percentage = (partnership.batsman2Runs / maxRuns) * 100;
                  const player1 = getPlayer(partnership.batsman1Id);
                  const player2 = getPlayer(partnership.batsman2Id);
                  const player1LastName = player1?.name?.split(' ').pop() || 'Unknown';
                  const player2LastName = player2?.name?.split(' ').pop() || 'Unknown';

                  // Milestone detection
                  const is100Plus = partnership.runs >= 100;
                  const is50Plus = partnership.runs >= 50 && partnership.runs < 100;

                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded ${
                        partnership.isActive
                          ? 'bg-cricket-primary/20 border-2 border-cricket-accent'
                          : is100Plus
                          ? 'bg-yellow-900/20 border-2 border-yellow-400'
                          : is50Plus
                          ? 'bg-cricket-accent/20 border border-cricket-accent'
                          : ''
                      }`}
                    >
                      {/* Partnership total - minimal margin */}
                      <div className="flex items-center justify-center gap-2 mb-0.5">
                        {/* Milestone trophy */}
                        {(is50Plus || is100Plus) && (
                          <Trophy className={`w-4 h-4 ${is100Plus ? 'text-yellow-400' : 'text-cricket-accent'}`} />
                        )}
                        <span className="text-base font-mono font-bold text-cricket-accent">
                          {partnership.runs}
                        </span>
                        <span className="text-xs text-text-secondary">
                          ({partnership.balls} balls)
                        </span>
                        {partnership.isActive && (
                          <div className="w-2 h-2 bg-cricket-accent rounded-full animate-pulse"></div>
                        )}
                      </div>

                      {/* Horizontal bar chart */}
                      <div className="relative h-8 flex items-center mb-0.5">
                        {/* Center axis line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border-primary z-10"></div>

                        {/* Left side - Batsman 1 */}
                        <div className="absolute left-0 right-1/2 h-full flex items-center pr-1">
                          <div className="flex-1 flex items-center justify-end gap-1 text-xs">
                            <span className="text-text-primary truncate">
                              {player1LastName}
                            </span>
                            {partnership.batsman1Runs > 0 && (
                              <div
                                className="h-6 rounded-l flex items-center justify-end pr-1 min-w-[24px]"
                                style={{
                                  width: `${bat1Percentage}%`,
                                  background: `linear-gradient(to left, ${teamColors.secondary}E6, ${teamColors.primary}B3)`
                                }}
                              >
                                <span className="text-xs font-mono font-bold text-white">
                                  {partnership.batsman1Runs}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right side - Batsman 2 */}
                        <div className="absolute left-1/2 right-0 h-full flex items-center pl-1">
                          <div className="flex-1 flex items-center gap-1 text-xs">
                            {partnership.batsman2Runs > 0 && (
                              <div
                                className="h-6 rounded-r flex items-center justify-start pl-1 min-w-[24px]"
                                style={{
                                  width: `${bat2Percentage}%`,
                                  background: `linear-gradient(to right, ${teamColors.secondary}E6, ${teamColors.primary}B3)`
                                }}
                              >
                                <span className="text-xs font-mono font-bold text-white">
                                  {partnership.batsman2Runs}
                                </span>
                              </div>
                            )}
                            <span className="text-text-primary truncate">
                              {player2LastName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Partnership details */}
                      <div className="flex items-center justify-center gap-4 text-xs text-text-secondary">
                        <span>SR: {partnership.strikeRate}</span>
                        <span>Boundaries: {partnership.boundaries}</span>
                        <span>Dots: {partnership.dots}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Milestone Summary */}
              {partnerships.some(p => p.runs >= 50) && (
                <div className="card p-4 mt-2">
                  <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-cricket-accent" />
                    Milestone Partnerships
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {partnerships
                      .filter(p => p.runs >= 50)
                      .map((p, idx) => {
                        const player1 = getPlayer(p.batsman1Id);
                        const player2 = getPlayer(p.batsman2Id);
                        return (
                          <div key={idx} className="p-3 bg-bg-tertiary rounded">
                            <div className="flex items-center gap-2 mb-1">
                              <Trophy className={`w-4 h-4 ${p.runs >= 100 ? 'text-yellow-400' : 'text-cricket-accent'}`} />
                              <span className="text-lg font-mono font-bold text-cricket-accent">
                                {p.runs} runs
                              </span>
                            </div>
                            <div className="text-xs text-text-primary">
                              <PlayerName playerId={p.batsman1Id} /> ({p.batsman1Runs}) &{' '}
                              <PlayerName playerId={p.batsman2Id} /> ({p.batsman2Runs})
                            </div>
                            <div className="text-xs text-text-secondary mt-1">
                              {p.balls} balls, SR: {p.strikeRate}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PartnershipsModal);
