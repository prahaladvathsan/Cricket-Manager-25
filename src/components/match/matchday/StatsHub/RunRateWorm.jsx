/**
 * @file RunRateWorm.jsx
 * @description Line chart showing cumulative runs over balls (current innings only)
 * Uses team colors, shows wickets, and includes required run rate for 2nd innings
 */

import React, { useMemo, useState } from 'react';
import useMatchStore from '../../../../stores/matchStore';
import useLeagueStore from '../../../../stores/leagueStore';

const RunRateWorm = () => {
  const ballByBall = useMatchStore(state => state.ballByBall);
  const innings = useMatchStore(state => state.innings);
  const firstBattingTeamId = useMatchStore(state => state.firstBattingTeamId);
  const homeTeamId = useMatchStore(state => state.homeTeamId);
  const awayTeamId = useMatchStore(state => state.awayTeamId);
  const [hoveredPoint, setHoveredPoint] = useState(null);

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

  // Calculate worm data for a specific innings
  const calculateInningsWorm = useMemo(() => (inningsNum) => {
    const inningsBalls = ballByBall.filter(ball => ball.innings === inningsNum);

    if (inningsBalls.length === 0) return { data: [], wickets: [] };

    let cumulative = 0;
    const data = [{ ballNumber: 0, over: 0, runs: 0 }];
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

  // Calculate data for both innings
  const innings1 = calculateInningsWorm(1);
  const innings2 = hasSecondInnings ? calculateInningsWorm(2) : null;

  const colors1 = getTeamColors(1);
  const colors2 = hasSecondInnings ? getTeamColors(2) : null;

  // Calculate required run rate line for 2nd innings
  const requiredRateLine = useMemo(() => {
    if (!innings.target || currentInnings !== 2) return null;

    return [
      { ballNumber: 0, runs: 0 },
      { ballNumber: 120, runs: innings.target }
    ];
  }, [innings, currentInnings]);

  // SVG dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const maxRuns = Math.max(
    ...innings1.data.map(d => d.runs),
    ...(innings2 ? innings2.data.map(d => d.runs) : []),
    requiredRateLine ? requiredRateLine[1].runs : 0,
    200 // Minimum scale
  );
  const maxBalls = 120; // 20 overs

  const xScale = (ballNumber) => padding.left + (ballNumber / maxBalls) * chartWidth;
  const yScale = (runs) => padding.top + chartHeight - (runs / maxRuns) * chartHeight;

  // Generate path strings for both innings worms
  const wormPath1 = useMemo(() => {
    if (innings1.data.length === 0) return '';
    return innings1.data.map((d, i) => {
      const x = xScale(d.ballNumber);
      const y = yScale(d.runs);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  }, [innings1.data]);

  const wormPath2 = useMemo(() => {
    if (!innings2 || innings2.data.length === 0) return '';
    return innings2.data.map((d, i) => {
      const x = xScale(d.ballNumber);
      const y = yScale(d.runs);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  }, [innings2]);

  // Generate path string for required rate line
  const requiredPath = useMemo(() => {
    if (!requiredRateLine) return '';
    return requiredRateLine.map((d, i) => {
      const x = xScale(d.ballNumber);
      const y = yScale(d.runs);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  }, [requiredRateLine]);

  // X-axis ticks (overs: 0, 5, 10, 15, 20)
  const xTicks = [0, 30, 60, 90, 120];
  const xLabels = ['0', '5', '10', '15', '20'];

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

          {xTicks.map(tick => (
            <line
              key={`x-grid-${tick}`}
              x1={xScale(tick)}
              y1={padding.top}
              x2={xScale(tick)}
              y2={height - padding.bottom}
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

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={`x-label-${tick}`}
              x={xScale(tick)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-text-secondary"
              style={{ fontSize: '11px' }}
            >
              {xLabels[i]}
            </text>
          ))}

          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-xs fill-text-secondary font-medium"
            style={{ fontSize: '12px' }}
          >
            Overs
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

          {/* Required rate line (2nd innings) */}
          {requiredRateLine && (
            <path
              d={requiredPath}
              fill="none"
              stroke="#9AA0A6"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}

          {/* 1st Innings Worm */}
          <path
            d={wormPath1}
            fill="none"
            stroke={colors1.primary}
            strokeWidth="3"
            opacity={hasSecondInnings ? "0.6" : "0.9"}
          />

          {/* 1st Innings Interactive Points (over boundaries) - render before wickets */}
          {innings1.data.map((d, i) => {
            if (i % 6 !== 0 && i !== innings1.data.length - 1) return null;
            return (
              <circle
                key={`p1-${i}`}
                cx={xScale(d.ballNumber)}
                cy={yScale(d.runs)}
                r="4"
                fill={colors1.primary}
                stroke="#0F1419"
                strokeWidth="2"
                opacity={hasSecondInnings ? "0.6" : "1"}
                className="cursor-pointer hover:r-6 transition-all"
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
              opacity={hasSecondInnings ? "0.6" : "1"}
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
                    r="4"
                    fill={colors2.primary}
                    stroke="#0F1419"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
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
                y={yScale(hoveredPoint.runs) - 30}
                width="100"
                height={hoveredPoint.type === 'wicket' ? "55" : "45"}
                fill="#1A1F26"
                stroke={hoveredPoint.innings === 1 ? colors1.primary : colors2.primary}
                strokeWidth="2"
                rx="4"
              />
              <text
                x={xScale(hoveredPoint.ballNumber) + 60}
                y={yScale(hoveredPoint.runs) - 15}
                textAnchor="middle"
                className="fill-text-secondary"
                style={{ fontSize: '10px', fontWeight: '600' }}
              >
                {hoveredPoint.innings === 1 ? colors1.name : colors2.name}
              </text>
              <text
                x={xScale(hoveredPoint.ballNumber) + 60}
                y={yScale(hoveredPoint.runs) - 2}
                textAnchor="middle"
                className="fill-text-primary"
                style={{ fontSize: '12px', fontWeight: '700' }}
              >
                {hoveredPoint.runs} runs
              </text>
              <text
                x={xScale(hoveredPoint.ballNumber) + 60}
                y={yScale(hoveredPoint.runs) + 11}
                textAnchor="middle"
                className="fill-text-secondary"
                style={{ fontSize: '9px' }}
              >
                {hoveredPoint.over.toFixed(1)} overs
              </text>
              {hoveredPoint.type === 'wicket' && hoveredPoint.player && (
                <text
                  x={xScale(hoveredPoint.ballNumber) + 60}
                  y={yScale(hoveredPoint.runs) + 23}
                  textAnchor="middle"
                  className="fill-cricket-accent"
                  style={{ fontSize: '9px', fontStyle: 'italic' }}
                >
                  Wicket
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        {hasSecondInnings ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5" style={{ backgroundColor: colors1.primary, opacity: 0.6 }}></div>
              <span className="text-text-secondary">{colors1.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5" style={{ backgroundColor: colors2.primary }}></div>
              <span className="text-text-secondary">{colors2.name}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ backgroundColor: colors1.primary }}></div>
            <span className="text-text-secondary">{colors1.name}</span>
          </div>
        )}
        {requiredRateLine && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-text-secondary" style={{ borderTop: '2px dashed' }}></div>
            <span className="text-text-secondary">Required rate</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(RunRateWorm);
