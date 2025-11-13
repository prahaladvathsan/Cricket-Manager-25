/**
 * @file ManhattanModal.jsx
 * @description Full-screen modal with enhanced manhattan chart showing bowler names per over
 * Uses team colors with gradient based on runs, shows 1st innings faded in 2nd innings background
 */

import React, { useMemo, useState } from 'react';
import { X, BarChart3 } from 'lucide-react';
import useMatchStore from '../../../../../stores/matchStore';
import useLeagueStore from '../../../../../stores/leagueStore';
import usePlayerStore from '../../../../../stores/playerStore';

const ManhattanModal = ({ isOpen, onClose }) => {
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
      secondary: club?.colors?.secondary || '#B8941F',
      name: club?.name || 'Team'
    };
  };

  // Calculate manhattan data for a specific innings
  const calculateInningsManhattan = useMemo(() => (inningsNum) => {
    const inningsBalls = ballByBall.filter(ball => ball.innings === inningsNum);

    const overData = Array(20).fill(null).map((_, idx) => ({
      over: idx + 1,
      runs: 0,
      bowler: null,
      balls: []
    }));

    inningsBalls.forEach(ball => {
      const overNum = ball.over;
      if (overNum !== undefined && overNum >= 0 && overNum < 20) {
        // Accumulate runs
        overData[overNum].runs += (ball.runs || 0);

        // Set bowler (first ball of over determines the bowler)
        if (!overData[overNum].bowler) {
          overData[overNum].bowler = ball.bowler;
        }

        // Add ball to breakdown
        if (ball.isWicket) {
          overData[overNum].balls.push('W');
        } else {
          overData[overNum].balls.push(ball.runs || 0);
        }
      }
    });

    return overData;
  }, [ballByBall]);

  // SVG dimensions (larger for modal)
  const width = 800;
  const height = 500;
  const padding = { top: 30, right: 50, bottom: 80, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const [hoveredBar, setHoveredBar] = useState(null);

  // Calculate scales
  const manhattanData = calculateInningsManhattan(activeInnings);
  const maxRuns = Math.max(...manhattanData.map(d => d.runs), 15);
  const barWidth = chartWidth / 20;

  const xScale = (over) => padding.left + (over - 1) * barWidth;
  const yScale = (runs) => padding.top + chartHeight - (runs / maxRuns) * chartHeight;
  const barHeight = (runs) => (runs / maxRuns) * chartHeight;

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

  // Format ball-by-ball breakdown
  const formatBallBreakdown = (balls) => {
    if (balls.length === 0) return 'No balls bowled';
    return balls.join(', ');
  };

  if (!isOpen) return null;

  // Get background data (1st innings when viewing 2nd innings)
  const backgroundData = (hasSecondInnings && activeInnings === 2) ? calculateInningsManhattan(1) : null;
  const teamColors = getTeamColors(activeInnings);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cricket-accent" />
              <h2 className="text-lg font-semibold text-text-primary">
                Manhattan Chart (Runs per Over)
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

          <div className="bg-bg-tertiary rounded-lg p-4">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full"
              style={{ maxHeight: '500px' }}
            >
              {/* Define gradients */}
              <defs>
                <linearGradient id="barGradientMain" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor={teamColors.primary} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={teamColors.secondary} stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="barGradientBg" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor={getTeamColors(1).primary} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={getTeamColors(1).secondary} stopOpacity="0.5" />
                </linearGradient>
              </defs>

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

              {/* Background bars (1st innings when viewing 2nd innings) */}
              {backgroundData && backgroundData.map((d, i) => {
                const x = xScale(d.over);
                const y = yScale(d.runs);
                const h = barHeight(d.runs);

                return (
                  <rect
                    key={`bg-${i}`}
                    x={x + 2}
                    y={y}
                    width={barWidth - 4}
                    height={h || 2}
                    fill="url(#barGradientBg)"
                    opacity="0.8"
                  />
                );
              })}

              {/* Main bars (current innings) */}
              {manhattanData.map((d, i) => {
                const x = xScale(d.over);
                const y = yScale(d.runs);
                const h = barHeight(d.runs);
                const bowlerName = d.bowler ? getPlayer(d.bowler)?.name : null;
                const lastName = bowlerName ? bowlerName.split(' ').pop() : '';

                return (
                  <g key={i}>
                    {/* Bar */}
                    <rect
                      x={x + 2}
                      y={y}
                      width={barWidth - 4}
                      height={h || 2}
                      fill="url(#barGradientMain)"
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onMouseEnter={() => setHoveredBar(d)}
                      onMouseLeave={() => setHoveredBar(null)}
                    />

                    {/* Over number */}
                    <text
                      x={x + barWidth / 2}
                      y={height - padding.bottom + 20}
                      textAnchor="middle"
                      className="fill-text-secondary"
                      style={{ fontSize: '12px' }}
                    >
                      {d.over}
                    </text>

                    {/* Bowler name (only for active innings) */}
                    {lastName && (
                      <text
                        x={x + barWidth / 2}
                        y={height - padding.bottom + 35}
                        textAnchor="middle"
                        className="fill-text-tertiary"
                        style={{ fontSize: '10px' }}
                        transform={`rotate(-45, ${x + barWidth / 2}, ${height - padding.bottom + 35})`}
                      >
                        {lastName}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Axis labels */}
              <text
                x={width / 2}
                y={height - 5}
                textAnchor="middle"
                className="fill-text-secondary font-medium"
                style={{ fontSize: '14px' }}
              >
                Over
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

              {/* Enhanced hover tooltip with ball-by-ball breakdown */}
              {hoveredBar && (
                <g>
                  <rect
                    x={xScale(hoveredBar.over) + barWidth / 2 - 70}
                    y={yScale(hoveredBar.runs) - 70}
                    width="140"
                    height="65"
                    fill="#1A1F26"
                    stroke={teamColors.primary}
                    strokeWidth="2"
                    rx="4"
                  />
                  {/* Over number */}
                  <text
                    x={xScale(hoveredBar.over) + barWidth / 2}
                    y={yScale(hoveredBar.runs) - 52}
                    textAnchor="middle"
                    className="fill-text-secondary"
                    style={{ fontSize: '11px', fontWeight: '600' }}
                  >
                    Over {hoveredBar.over}
                  </text>
                  {/* Total runs */}
                  <text
                    x={xScale(hoveredBar.over) + barWidth / 2}
                    y={yScale(hoveredBar.runs) - 38}
                    textAnchor="middle"
                    className="fill-text-primary"
                    style={{ fontSize: '13px', fontWeight: '700' }}
                  >
                    {hoveredBar.runs} runs
                  </text>
                  {/* Ball breakdown */}
                  <text
                    x={xScale(hoveredBar.over) + barWidth / 2}
                    y={yScale(hoveredBar.runs) - 24}
                    textAnchor="middle"
                    className="fill-text-secondary"
                    style={{ fontSize: '10px' }}
                  >
                    {formatBallBreakdown(hoveredBar.balls)}
                  </text>
                  {/* Bowler name */}
                  {hoveredBar.bowler && (
                    <text
                      x={xScale(hoveredBar.over) + barWidth / 2}
                      y={yScale(hoveredBar.runs) - 11}
                      textAnchor="middle"
                      className="fill-cricket-accent"
                      style={{ fontSize: '10px', fontStyle: 'italic' }}
                    >
                      {getPlayer(hoveredBar.bowler)?.name || 'Unknown'}
                    </text>
                  )}
                </g>
              )}
            </svg>
          </div>

          {/* Legend - Team names */}
          <div className="flex items-center gap-6 text-sm mt-4 flex-wrap">
            {activeInnings === 2 ? (
              <>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{
                      background: `linear-gradient(to top, ${getTeamColors(1).primary}, ${getTeamColors(1).secondary})`,
                      opacity: 0.8
                    }}
                  ></div>
                  <span className="text-text-secondary">{getTeamColors(1).name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded"
                    style={{
                      background: `linear-gradient(to top, ${teamColors.primary}, ${teamColors.secondary})`
                    }}
                  ></div>
                  <span className="text-text-secondary">{teamColors.name}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded"
                  style={{
                    background: `linear-gradient(to top, ${teamColors.primary}, ${teamColors.secondary})`
                  }}
                ></div>
                <span className="text-text-secondary">{teamColors.name}</span>
              </div>
            )}
          </div>

          {/* Over Summary Table */}
          <div className="mt-6 card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Over-by-Over Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <style jsx>{`
                .grid::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {manhattanData.filter(d => d.balls.length > 0).map((d, idx) => (
                <div key={idx} className="text-xs p-2 bg-bg-tertiary rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-text-secondary font-semibold">Over {d.over}</span>
                    <span className="text-text-primary font-mono font-bold">{d.runs}</span>
                  </div>
                  <div className="text-text-tertiary truncate">
                    {d.bowler && getPlayer(d.bowler)?.name}
                  </div>
                  <div className="text-text-secondary font-mono mt-1">
                    {formatBallBreakdown(d.balls)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ManhattanModal);
