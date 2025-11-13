/**
 * @file WormModal.jsx
 * @description Full-screen modal with enhanced worm chart
 * Shows both innings worms simultaneously, each starting from 0,0 with team colors
 */

import React, { useMemo, useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import useMatchStore from '../../../../../stores/matchStore';
import useLeagueStore from '../../../../../stores/leagueStore';
import usePlayerStore from '../../../../../stores/playerStore';

const WormModal = ({ isOpen, onClose }) => {
  // Subscribe to stores
  const ballByBall = useMatchStore(state => state.ballByBall);
  const innings = useMatchStore(state => state.innings);
  const firstBattingTeamId = useMatchStore(state => state.firstBattingTeamId);
  const homeTeamId = useMatchStore(state => state.homeTeamId);
  const awayTeamId = useMatchStore(state => state.awayTeamId);
  const getPlayer = usePlayerStore(state => state.getPlayer);
  const getClub = useLeagueStore(state => state.getClub);

  // Determine which innings exist
  const maxInnings = Math.max(...ballByBall.map(b => b.innings || 1), 1);
  const hasSecondInnings = maxInnings >= 2;

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
      secondary: club?.colors?.secondary || '#B8941F',
      name: club?.name || 'Team'
    };
  };

  // Calculate worm data for a specific innings (each innings starts from 0,0)
  const calculateInningsWorm = useMemo(() => (inningsNum) => {
    const inningsBalls = ballByBall.filter(ball => ball.innings === inningsNum);

    if (inningsBalls.length === 0) return { data: [], wickets: [] };

    let cumulative = 0;
    const data = [{ ballNumber: 0, over: 0, runs: 0 }]; // Start at 0,0
    const wickets = [];

    inningsBalls.forEach((ball, idx) => {
      cumulative += (ball.runs || 0);
      const ballNumber = idx + 1;

      data.push({
        ballNumber: ballNumber,
        over: Math.floor(ballNumber / 6) + ((ballNumber % 6) / 10),
        runs: cumulative
      });

      // Track wickets
      if (ball.isWicket) {
        wickets.push({
          ballNumber: ballNumber,
          over: Math.floor(ballNumber / 6) + ((ballNumber % 6) / 10),
          runs: cumulative,
          player: ball.dismissedPlayer
        });
      }
    });

    return { data, wickets };
  }, [ballByBall]);

  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Calculate data for both innings
  const innings1 = calculateInningsWorm(1);
  const innings2 = hasSecondInnings ? calculateInningsWorm(2) : null;

  // SVG dimensions (larger for modal)
  const width = 900;
  const height = 600;
  const padding = { top: 40, right: 60, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales based on all data
  const allData = [...innings1.data, ...(innings2?.data || [])];
  const maxRuns = Math.max(...allData.map(d => d.runs), 200);
  const maxBalls = 120; // 20 overs

  const xScale = (ballNumber) => padding.left + (ballNumber / maxBalls) * chartWidth;
  const yScale = (runs) => padding.top + chartHeight - (runs / maxRuns) * chartHeight;

  // Calculate required rate line (only for 2nd innings)
  const requiredRateLine = useMemo(() => {
    if (!hasSecondInnings || !innings.target) return null;

    return [
      { ballNumber: 0, runs: 0 },
      { ballNumber: 120, runs: innings.target }
    ];
  }, [hasSecondInnings, innings.target]);

  // Generate path for required rate line
  const requiredPath = useMemo(() => {
    if (!requiredRateLine) return '';
    return requiredRateLine.map((d, i) => {
      const x = xScale(d.ballNumber);
      const y = yScale(d.runs);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  }, [requiredRateLine]);

  // Generate path string for worm line
  const generateWormPath = (data) => {
    if (data.length === 0) return '';
    return data.map((d, i) => {
      const x = xScale(d.ballNumber);
      const y = yScale(d.runs);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  const wormPath1 = generateWormPath(innings1.data);
  const wormPath2 = innings2 ? generateWormPath(innings2.data) : null;

  // X-axis ticks (overs: 0, 5, 10, 15, 20)
  const xTicks = [0, 30, 60, 90, 120];
  const xLabels = ['0', '5', '10', '15', '20'];

  // Y-axis ticks
  const yTickCount = 6;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round((maxRuns / yTickCount) * i)
  );

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const colors1 = getTeamColors(1);
  const colors2 = hasSecondInnings ? getTeamColors(2) : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cricket-accent" />
            <h2 className="text-lg font-semibold text-text-primary">
              Run Rate Worm Chart
            </h2>
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

          <div className="bg-bg-tertiary rounded-lg p-4">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full"
              style={{ maxHeight: '600px' }}
            >
              {/* Grid lines */}
              {yTicks.map(tick => (
                <line
                  key={`y-grid-${tick}`}
                  x1={padding.left}
                  y1={yScale(tick)}
                  x2={width - padding.right}
                  y2={yScale(tick)}
                  stroke="#2D3748"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
              ))}

              {xTicks.map(tick => (
                <line
                  key={`x-grid-${tick}`}
                  x1={xScale(tick)}
                  y1={padding.top}
                  x2={xScale(tick)}
                  y2={height - padding.bottom}
                  stroke="#2D3748"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
              ))}

              {/* Y-axis labels */}
              {yTicks.map(tick => (
                <text
                  key={`y-label-${tick}`}
                  x={padding.left - 10}
                  y={yScale(tick) + 5}
                  textAnchor="end"
                  className="fill-text-secondary"
                  style={{ fontSize: '13px' }}
                >
                  {tick}
                </text>
              ))}

              {/* X-axis labels */}
              {xTicks.map((tick, i) => (
                <text
                  key={`x-label-${tick}`}
                  x={xScale(tick)}
                  y={height - padding.bottom + 25}
                  textAnchor="middle"
                  className="fill-text-secondary"
                  style={{ fontSize: '13px' }}
                >
                  {xLabels[i]}
                </text>
              ))}

              {/* Axis labels */}
              <text
                x={width / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-text-secondary font-medium"
                style={{ fontSize: '14px' }}
              >
                Overs
              </text>

              <text
                x={20}
                y={height / 2}
                textAnchor="middle"
                transform={`rotate(-90, 20, ${height / 2})`}
                className="fill-text-secondary font-medium"
                style={{ fontSize: '14px' }}
              >
                Runs
              </text>

              {/* Required rate line (2nd innings) */}
              {requiredRateLine && (
                <path
                  d={requiredPath}
                  fill="none"
                  stroke="#9AA0A6"
                  strokeWidth="2"
                  strokeDasharray="8,4"
                  opacity="0.7"
                />
              )}

              {/* 1st Innings Worm */}
              <path
                d={wormPath1}
                fill="none"
                stroke={colors1.primary}
                strokeWidth="3"
                opacity="0.9"
              />

              {/* 1st Innings Interactive Points (over boundaries) - render before wickets */}
              {innings1.data.map((d, i) => {
                if (i % 6 !== 0 && i !== innings1.data.length - 1) return null;
                return (
                  <circle
                    key={`p1-${i}`}
                    cx={xScale(d.ballNumber)}
                    cy={yScale(d.runs)}
                    r="5"
                    fill={colors1.primary}
                    stroke="#0F1419"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-7 transition-all"
                    onMouseEnter={() => setHoveredPoint({ ...d, innings: 1, type: 'over' })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}

              {/* 1st Innings Wickets - render after to be on top */}
              {innings1.wickets.map((w, i) => (
                <circle
                  key={`w1-${i}`}
                  cx={xScale(w.ballNumber)}
                  cy={yScale(w.runs)}
                  r="8"
                  fill={colors1.secondary}
                  stroke={colors1.primary}
                  strokeWidth="2"
                  className="cursor-pointer hover:r-10 transition-all"
                  onMouseEnter={() => setHoveredPoint({ ...w, innings: 1, type: 'wicket' })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* 2nd Innings Worm */}
              {wormPath2 && (
                <>
                  <path
                    d={wormPath2}
                    fill="none"
                    stroke={colors2.primary}
                    strokeWidth="3"
                    opacity="0.9"
                  />

                  {/* 2nd Innings Interactive Points (over boundaries) - render before wickets */}
                  {innings2.data.map((d, i) => {
                    if (i % 6 !== 0 && i !== innings2.data.length - 1) return null;
                    return (
                      <circle
                        key={`p2-${i}`}
                        cx={xScale(d.ballNumber)}
                        cy={yScale(d.runs)}
                        r="5"
                        fill={colors2.primary}
                        stroke="#0F1419"
                        strokeWidth="2"
                        className="cursor-pointer hover:r-7 transition-all"
                        onMouseEnter={() => setHoveredPoint({ ...d, innings: 2, type: 'over' })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}

                  {/* 2nd Innings Wickets - render after to be on top */}
                  {innings2.wickets.map((w, i) => (
                    <circle
                      key={`w2-${i}`}
                      cx={xScale(w.ballNumber)}
                      cy={yScale(w.runs)}
                      r="8"
                      fill={colors2.secondary}
                      stroke={colors2.primary}
                      strokeWidth="2"
                      className="cursor-pointer hover:r-10 transition-all"
                      onMouseEnter={() => setHoveredPoint({ ...w, innings: 2, type: 'wicket' })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </>
              )}

              {/* Hover tooltip */}
              {hoveredPoint && (
                <g>
                  <rect
                    x={xScale(hoveredPoint.ballNumber) + 10}
                    y={yScale(hoveredPoint.runs) - 35}
                    width="120"
                    height={hoveredPoint.type === 'wicket' ? "65" : "50"}
                    fill="#1A1F26"
                    stroke={hoveredPoint.innings === 1 ? colors1.primary : colors2.primary}
                    strokeWidth="2"
                    rx="4"
                  />
                  <text
                    x={xScale(hoveredPoint.ballNumber) + 70}
                    y={yScale(hoveredPoint.runs) - 18}
                    textAnchor="middle"
                    className="fill-text-secondary"
                    style={{ fontSize: '11px', fontWeight: '600' }}
                  >
                    {hoveredPoint.innings === 1 ? colors1.name : colors2.name}
                  </text>
                  <text
                    x={xScale(hoveredPoint.ballNumber) + 70}
                    y={yScale(hoveredPoint.runs) - 4}
                    textAnchor="middle"
                    className="fill-text-primary"
                    style={{ fontSize: '13px', fontWeight: '700' }}
                  >
                    {hoveredPoint.runs} runs
                  </text>
                  <text
                    x={xScale(hoveredPoint.ballNumber) + 70}
                    y={yScale(hoveredPoint.runs) + 10}
                    textAnchor="middle"
                    className="fill-text-secondary"
                    style={{ fontSize: '10px' }}
                  >
                    {hoveredPoint.over.toFixed(1)} overs
                  </text>
                  {hoveredPoint.type === 'wicket' && hoveredPoint.player && (
                    <text
                      x={xScale(hoveredPoint.ballNumber) + 70}
                      y={yScale(hoveredPoint.runs) + 24}
                      textAnchor="middle"
                      className="fill-cricket-accent"
                      style={{ fontSize: '10px', fontStyle: 'italic' }}
                    >
                      {getPlayer(hoveredPoint.player)?.name || 'Wicket'}
                    </text>
                  )}
                </g>
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-sm mt-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 rounded" style={{ backgroundColor: colors1.primary }}></div>
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: colors1.secondary, border: `2px solid ${colors1.primary}` }}
                >
                  W
                </div>
              </div>
              <span className="text-text-secondary">{colors1.name} (1st Innings)</span>
            </div>
            {hasSecondInnings && colors2 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-8 h-1 rounded" style={{ backgroundColor: colors2.primary }}></div>
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ backgroundColor: colors2.secondary, border: `2px solid ${colors2.primary}` }}
                  >
                    W
                  </div>
                </div>
                <span className="text-text-secondary">{colors2.name} (2nd Innings)</span>
              </div>
            )}
            {requiredRateLine && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-text-secondary border-t-2 border-dashed"></div>
                <span className="text-text-secondary">Required rate ({innings.target} runs)</span>
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1st Innings Summary */}
            <div className="card p-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: colors1.primary }}>
                {colors1.name} - 1st Innings
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Final Score:</span>
                  <span className="font-mono font-bold text-text-primary">
                    {innings1.data[innings1.data.length - 1]?.runs || 0} runs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Wickets:</span>
                  <span className="font-mono text-text-primary">{innings1.wickets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Run Rate:</span>
                  <span className="font-mono text-text-primary">
                    {innings1.data.length > 1
                      ? ((innings1.data[innings1.data.length - 1].runs / (innings1.data.length - 1)) * 6).toFixed(2)
                      : '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2nd Innings Summary */}
            {hasSecondInnings && innings2 && colors2 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold mb-3" style={{ color: colors2.primary }}>
                  {colors2.name} - 2nd Innings
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Final Score:</span>
                    <span className="font-mono font-bold text-text-primary">
                      {innings2.data[innings2.data.length - 1]?.runs || 0} runs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Wickets:</span>
                    <span className="font-mono text-text-primary">{innings2.wickets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Run Rate:</span>
                    <span className="font-mono text-text-primary">
                      {innings2.data.length > 1
                        ? ((innings2.data[innings2.data.length - 1].runs / (innings2.data.length - 1)) * 6).toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WormModal);
