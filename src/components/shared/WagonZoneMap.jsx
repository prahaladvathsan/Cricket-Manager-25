/**
 * @file WagonZoneMap.jsx
 * @description 6-zone wagon wheel SVG heatmap for match analytics.
 * Zones: fineLeg | midWicket | midOn | midOff | cover | point
 */

import React, { useMemo } from 'react';

// Coordinate system: deg=0 → TOP (WK end), deg=90 → RIGHT (LEG side),
// deg=180 → BOTTOM (Bowler end), deg=270 → LEFT (OFF side).
// Equal 60° sectors clockwise from WK-top:
//   fineLeg:   0°–60°   upper-right (leg side near WK)
//   midWicket: 60°–120° right (square leg)
//   midOn:     120°–180° lower-right (straight leg)
//   midOff:    180°–240° lower-left (straight off)
//   cover:     240°–300° left (forward off)
//   point:     300°–360° upper-left (behind square off)
const ZONE_SECTORS = [
  { key: 'fineLeg',   startDeg: 0,   endDeg: 60  },
  { key: 'midWicket', startDeg: 60,  endDeg: 120 },
  { key: 'midOn',     startDeg: 120, endDeg: 180 },
  { key: 'midOff',    startDeg: 180, endDeg: 240 },
  { key: 'cover',     startDeg: 240, endDeg: 300 },
  { key: 'point',     startDeg: 300, endDeg: 360 },
];

const ZONE_LABELS = {
  fineLeg: 'Fine Leg',
  midWicket: 'Mid Wkt',
  midOn: 'Mid On',
  midOff: 'Mid Off',
  cover: 'Cover',
  point: 'Point',
};

const CX = 200, CY = 200, R = 165, INNER_R = 30;

function polarToXY(cx, cy, r, deg) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(cx, cy, r, innerR, startDeg, endDeg) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const si = polarToXY(cx, cy, innerR, startDeg);
  const ei = polarToXY(cx, cy, innerR, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${si.x} ${si.y}`,
    `L ${s.x} ${s.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`,
    `L ${ei.x} ${ei.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${si.x} ${si.y}`,
    'Z'
  ].join(' ');
}

function labelPos(cx, cy, startDeg, endDeg) {
  const mid = (startDeg + endDeg) / 2;
  const r = R * 0.65;
  return polarToXY(cx, cy, r, mid);
}

/**
 * WagonZoneMap
 * @param {Array} data - Array of { zone, runs, balls, fours, sixes } (can be filtered by parent)
 * @param {Function} onZoneClick - Called with zone key when a zone is clicked
 * @param {string} selectedZone - Currently highlighted zone key (optional)
 */
const WagonZoneMap = ({ data = [], onZoneClick, selectedZone }) => {
  const zoneStats = useMemo(() => {
    const map = {};
    for (const entry of data) {
      if (!map[entry.zone]) map[entry.zone] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      map[entry.zone].runs += entry.runs || 0;
      map[entry.zone].balls += entry.balls || 0;
      map[entry.zone].fours += entry.fours || 0;
      map[entry.zone].sixes += entry.sixes || 0;
    }
    return map;
  }, [data]);

  const maxRuns = useMemo(() => {
    return Math.max(1, ...Object.values(zoneStats).map(z => z.runs));
  }, [zoneStats]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 400 400" className="w-full max-w-[320px]">
        {/* Outer boundary circle */}
        <circle cx={CX} cy={CY} r={R + 8} fill="none" stroke="#2D5F3F" strokeWidth="2" />
        {/* Inner circle (pitch) */}
        <circle cx={CX} cy={CY} r={INNER_R} fill="#1a2e1a" stroke="#2D5F3F" strokeWidth="1.5" />

        {/* Zone sectors */}
        {ZONE_SECTORS.map(({ key, startDeg, endDeg }) => {
          const stats = zoneStats[key] || { runs: 0, balls: 0 };
          const intensity = stats.runs / maxRuns;
          const isSelected = selectedZone === key;
          const path = sectorPath(CX, CY, R, INNER_R, startDeg, endDeg);
          const lp = labelPos(CX, CY, startDeg, endDeg);

          // Color: green at low runs → gold at high runs
          const r = Math.round(45 + intensity * (212 - 45));
          const g = Math.round(95 + intensity * (175 - 95));
          const b = Math.round(63 + intensity * (55 - 63));
          const fill = intensity < 0.05 ? '#1a3a2a' : `rgb(${r},${g},${b})`;
          const opacity = isSelected ? 1 : 0.85;

          return (
            <g key={key} onClick={() => onZoneClick?.(key)} style={{ cursor: onZoneClick ? 'pointer' : 'default' }}>
              <path
                d={path}
                fill={fill}
                opacity={opacity}
                stroke={isSelected ? '#D4AF37' : '#2D5F3F'}
                strokeWidth={isSelected ? 2 : 1}
              />
              {/* Label */}
              <text
                x={lp.x}
                y={lp.y - 6}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="11"
                fontWeight="600"
              >
                {ZONE_LABELS[key]}
              </text>
              {stats.runs > 0 && (
                <text
                  x={lp.x}
                  y={lp.y + 8}
                  textAnchor="middle"
                  fill="#D4AF37"
                  fontSize="12"
                  fontWeight="700"
                >
                  {stats.runs}
                </text>
              )}
            </g>
          );
        })}

        {/* Centre stumps (oriented: bails at top = toward fine leg / behind batter) */}
        <rect x={CX - 3} y={CY - 12} width={6} height={24} rx={1} fill="#6b7280" />
        <rect x={CX - 9} y={CY - 14} width={18} height={2} rx={1} fill="#9ca3af" />

        {/* Orientation labels */}
        <text x={CX} y={18} textAnchor="middle" fill="#6b7280" fontSize="9" fontWeight="500">▼ WK</text>
        <text x={CX} y={394} textAnchor="middle" fill="#6b7280" fontSize="9" fontWeight="500">▲ BOWLER</text>
        <text x={390} y={CY + 3} textAnchor="end" fill="#6b7280" fontSize="9" fontWeight="500">LEG</text>
        <text x={10} y={CY + 3} textAnchor="start" fill="#6b7280" fontSize="9" fontWeight="500">OFF</text>
      </svg>

      {/* Zone summary table */}
      {Object.keys(zoneStats).length > 0 && (
        <div className="w-full max-w-xs">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-tertiary border-b border-border-primary">
                <th className="text-left pb-1">Zone</th>
                <th className="text-right pb-1">Runs</th>
                <th className="text-right pb-1">4s</th>
                <th className="text-right pb-1">6s</th>
              </tr>
            </thead>
            <tbody>
              {ZONE_SECTORS.map(({ key }) => {
                const s = zoneStats[key];
                if (!s || s.runs === 0) return null;
                return (
                  <tr
                    key={key}
                    onClick={() => onZoneClick?.(key)}
                    className={`border-b border-border-primary/40 ${onZoneClick ? 'cursor-pointer hover:bg-bg-tertiary' : ''} ${selectedZone === key ? 'bg-cricket-accent/10' : ''}`}
                  >
                    <td className="py-0.5 text-text-secondary">{ZONE_LABELS[key]}</td>
                    <td className="py-0.5 text-right text-trophy-gold font-mono">{s.runs}</td>
                    <td className="py-0.5 text-right text-blue-400 font-mono">{s.fours}</td>
                    <td className="py-0.5 text-right text-purple-400 font-mono">{s.sixes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WagonZoneMap;
