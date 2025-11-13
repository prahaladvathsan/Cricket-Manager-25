/**
 * @file PartnershipsPanel.jsx
 * @description Single unified partnership chart with horizontal bars
 * All partnerships displayed in one continuous visualization
 */

import React from 'react';
import { Users2 } from 'lucide-react';
import useMatchStore from '../../../../stores/matchStore';
import useLeagueStore from '../../../../stores/leagueStore';
import usePlayerStore from '../../../../stores/playerStore';
import PlayerName from '../../../shared/PlayerName';

const PartnershipsPanel = () => {
  const teams = useMatchStore(state => state.teams);
  const ballByBall = useMatchStore(state => state.ballByBall);
  const innings = useMatchStore(state => state.innings);
  const getPlayer = usePlayerStore(state => state.getPlayer);
  const getClub = useLeagueStore(state => state.getClub);
  const fallOfWickets = teams.batting?.fallOfWickets || [];

  // Get current innings
  const currentInnings = React.useMemo(() => {
    if (ballByBall.length === 0) return 1;
    return Math.max(...ballByBall.map(b => b.innings || 1));
  }, [ballByBall]);

  // Get current batting team's colors
  const battingTeamId = innings.battingTeam;
  const club = getClub(battingTeamId);
  const teamColors = {
    primary: club?.colors?.primary || '#D4AF37',
    secondary: club?.colors?.secondary || '#B8941F'
  };

  // Calculate partnerships from ballByBall data (current innings only)
  const partnerships = React.useMemo(() => {
    // Filter by current innings only
    const inningsBalls = ballByBall.filter(ball => ball.innings === currentInnings);
    if (inningsBalls.length === 0) return [];

    const partnershipsList = [];
    let currentPartnership = null;
    let partnershipRuns = 0;
    let partnershipBalls = 0;
    let bat1Runs = 0;
    let bat2Runs = 0;

    inningsBalls.forEach((ball, idx) => {
      const batsmen = [ball.striker, ball.nonStriker].sort();

      // Start new partnership or continue existing
      if (!currentPartnership) {
        currentPartnership = {
          batsman1Id: batsmen[0],
          batsman2Id: batsmen[1],
          wicket: partnershipsList.length === 0 ? null : partnershipsList.length,
        };
      }

      // Check if partnership changed (wicket fell)
      const currentBatsmen = [currentPartnership.batsman1Id, currentPartnership.batsman2Id].sort();
      if (batsmen[0] !== currentBatsmen[0] || batsmen[1] !== currentBatsmen[1]) {
        // Partnership ended, save it
        partnershipsList.push({
          ...currentPartnership,
          runs: partnershipRuns,
          balls: partnershipBalls,
          batsman1Runs: bat1Runs,
          batsman2Runs: bat2Runs,
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
      }
    });

    // Add current partnership
    if (currentPartnership) {
      partnershipsList.push({
        ...currentPartnership,
        runs: partnershipRuns,
        balls: partnershipBalls,
        batsman1Runs: bat1Runs,
        batsman2Runs: bat2Runs,
        isActive: true
      });
    }

    return partnershipsList;
  }, [ballByBall, currentInnings]);

  // Calculate max runs for scaling
  const maxRuns = Math.max(...partnerships.map(p => p.runs), 50);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users2 className="w-4 h-4 text-cricket-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Partnerships</h3>
        </div>
        {partnerships.length > 0 && (
          <div className="text-xs text-text-secondary">
            {partnerships.length} partnership{partnerships.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Single Unified Partnership Chart */}
      {partnerships.length === 0 ? (
        <div className="text-center py-8 text-text-secondary text-sm">
          No partnerships yet
        </div>
      ) : (
        <div className="bg-bg-tertiary rounded-lg p-4 space-y-1">
          {partnerships.map((partnership, idx) => {
            const bat1Percentage = (partnership.batsman1Runs / maxRuns) * 100;
            const bat2Percentage = (partnership.batsman2Runs / maxRuns) * 100;
            const player1 = getPlayer(partnership.batsman1Id);
            const player2 = getPlayer(partnership.batsman2Id);

            // Extract last names
            const player1LastName = player1?.name?.split(' ').pop() || 'Unknown';
            const player2LastName = player2?.name?.split(' ').pop() || 'Unknown';

            return (
              <div
                key={idx}
                className={`${
                  partnership.isActive
                    ? 'bg-cricket-primary/20 border border-cricket-accent rounded p-2'
                    : 'p-2'
                }`}
              >
                {/* Partnership total - centered at top */}
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <span className="text-sm font-mono font-bold text-cricket-accent">
                    {partnership.runs}
                  </span>
                  <span className="text-xs text-text-secondary">
                    ({partnership.balls})
                  </span>
                  {partnership.isActive && (
                    <div className="w-2 h-2 bg-cricket-accent rounded-full animate-pulse"></div>
                  )}
                </div>

                {/* Horizontal bar chart */}
                <div className="relative h-8 flex items-center">
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
              </div>
            );
          })}
        </div>
      )}

      {/* Fall of Wickets Summary */}
      {fallOfWickets.length > 0 && (
        <div className="bg-bg-tertiary rounded-lg p-3">
          <div className="text-xs font-medium text-text-secondary mb-2">Fall of Wickets</div>
          <div className="flex flex-wrap gap-3">
            {fallOfWickets.map((fow, idx) => {
              const player = getPlayer(fow.batsman);
              const playerName = player?.name || 'Unknown';
              const completedOvers = Math.floor(fow.balls / 6);
              const remainingBalls = fow.balls % 6;
              const oversStr = remainingBalls > 0 ? `${completedOvers}.${remainingBalls}` : `${completedOvers}`;

              return (
                <div key={idx} className="text-xs">
                  <span className="font-mono text-cricket-accent font-semibold">
                    {fow.score}/{fow.wicket}
                  </span>
                  <span className="text-text-secondary ml-1">
                    ({playerName}, {oversStr} ov)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for ordinal suffix
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export default React.memo(PartnershipsPanel);
