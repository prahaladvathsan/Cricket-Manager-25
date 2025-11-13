/**
 * @file ManhattanChart.jsx
 * @description Bar chart showing runs scored in each over (current innings only)
 * Uses team colors with gradient based on run count
 */

import React, { useMemo, useState } from 'react';
import useMatchStore from '../../../../stores/matchStore';
import useLeagueStore from '../../../../stores/leagueStore';

const ManhattanChart = () => {
  const ballByBall = useMatchStore(state => state.ballByBall);
  const firstBattingTeamId = useMatchStore(state => state.firstBattingTeamId);
  const homeTeamId = useMatchStore(state => state.homeTeamId);
  const awayTeamId = useMatchStore(state => state.awayTeamId);
  const [hoveredBar, setHoveredBar] = useState(null);

  const getClub = useLeagueStore(state => state.getClub);

  // Get current innings
  const currentInnings = useMemo(() => {
    if (ballByBall.length === 0) return 1;
    return Math.max(...ballByBall.map(b => b.innings || 1));
  }, [ballByBall]);

  const hasSecondInnings = currentInnings >= 2;

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

  const teamColors = getTeamColors(currentInnings);

  // Calculate manhattan data for a specific innings
  const calculateInningsManhattan = useMemo(() => (inningsNum) => {
    const inningsBalls = ballByBall.filter(ball => ball.innings === inningsNum);

    const overData = Array(20).fill(null).map((_, idx) => ({
      over: idx + 1,
      runs: 0
    }));

    inningsBalls.forEach(ball => {
      const overNum = ball.over;
      if (overNum !== undefined && overNum >= 0 && overNum < 20) {
        overData[overNum].runs += (ball.runs || 0);
      }
    });

    return overData;
  }, [ballByBall]);

  // Current innings data
  const manhattanData = calculateInningsManhattan(currentInnings);

  // Background data (1st innings when viewing 2nd innings)
  const backgroundData = (hasSecondInnings && currentInnings === 2) ? calculateInningsManhattan(1) : null;

  // SVG dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const maxRuns = Math.max(...manhattanData.map(d => d.runs), 15);
  const barWidth = chartWidth / 20;

  const xScale = (over) => padding.left + (over - 1) * barWidth;
  const yScale = (runs) => padding.top + chartHeight - (runs / maxRuns) * chartHeight;
  const barHeight = (runs) => (runs / maxRuns) * chartHeight;

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round((maxRuns / yTickCount) * i)
  );

  return (
    <div className="space-y-3">
      {/* SVG Chart */}
      <div className="bg-bg-tertiary rounded-lg p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ maxHeight: '300px' }}
        >
          {/* Define gradients */}
          <defs>
            <linearGradient id="barGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={teamColors.primary} stopOpacity="0.9" />
              <stop offset="100%" stopColor={teamColors.secondary} stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="barGradientBg" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor={getTeamColors(1).primary} stopOpacity="0.8" />
              <stop offset="100%" stopColor={getTeamColors(1).secondary} stopOpacity="0.8" />
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
              strokeDasharray="2,2"
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map(tick => (
            <text
              key={`y-label-${tick}`}
              x={padding.left - 10}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="text-xs fill-text-secondary"
              style={{ fontSize: '11px' }}
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

            return (
              <g key={i}>
                <rect
                  x={x + 2}
                  y={y}
                  width={barWidth - 4}
                  height={h || 2}
                  fill={d.runs === 0 ? '#4B5563' : 'url(#barGradient)'}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={() => setHoveredBar(d)}
                  onMouseLeave={() => setHoveredBar(null)}
                />
                {/* X-axis tick label (every 2 overs) */}
                {d.over % 2 === 1 && (
                  <text
                    x={x + barWidth / 2}
                    y={height - padding.bottom + 20}
                    textAnchor="middle"
                    className="text-xs fill-text-secondary"
                    style={{ fontSize: '10px' }}
                  >
                    {d.over}
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
            className="text-xs fill-text-secondary font-medium"
            style={{ fontSize: '12px' }}
          >
            Over
          </text>

          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="text-xs fill-text-secondary font-medium"
            style={{ fontSize: '12px' }}
          >
            Runs
          </text>

          {/* Hover tooltip */}
          {hoveredBar && (
            <g>
              <rect
                x={xScale(hoveredBar.over) + barWidth / 2 - 30}
                y={yScale(hoveredBar.runs) - 35}
                width="60"
                height="30"
                fill="#1A1F26"
                stroke={teamColors.primary}
                strokeWidth="2"
                rx="4"
              />
              <text
                x={xScale(hoveredBar.over) + barWidth / 2}
                y={yScale(hoveredBar.runs) - 22}
                textAnchor="middle"
                className="fill-text-primary"
                style={{ fontSize: '11px', fontWeight: '600' }}
              >
                {hoveredBar.runs} runs
              </text>
              <text
                x={xScale(hoveredBar.over) + barWidth / 2}
                y={yScale(hoveredBar.runs) - 11}
                textAnchor="middle"
                className="fill-text-secondary"
                style={{ fontSize: '10px' }}
              >
                Over {hoveredBar.over}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        {hasSecondInnings ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded" style={{
                background: `linear-gradient(to top, ${getTeamColors(1).primary}, ${getTeamColors(1).secondary})`,
                opacity: 0.8
              }}></div>
              <span className="text-text-secondary">{getTeamColors(1).name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-4 rounded" style={{
                background: `linear-gradient(to top, ${teamColors.primary}, ${teamColors.secondary})`
              }}></div>
              <span className="text-text-secondary">{teamColors.name}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 rounded" style={{
              background: `linear-gradient(to top, ${teamColors.primary}, ${teamColors.secondary})`
            }}></div>
            <span className="text-text-secondary">{teamColors.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ManhattanChart);
