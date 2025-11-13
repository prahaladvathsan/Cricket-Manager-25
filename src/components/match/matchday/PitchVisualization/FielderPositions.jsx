import React, { useMemo } from 'react';
import useMatchStore from '../../../../stores/matchStore';
import useTeamStore from '../../../../stores/teamStore';
import usePlayerStore from '../../../../stores/playerStore';
import fieldPositioningConfig from '../../../../data/config/field-positioning-config.json';

/**
 * FielderPositions - Renders 11 fielders as dots on the cricket field
 *
 * Features:
 * - Reads positions from field-positioning-config.json
 * - Maps fielders from bowling team squad to positions
 * - Highlights bowler and keeper with Trophy Gold
 * - Shows hover labels with fielder name + position
 * - Highlights closest fielder to last ball (optional)
 *
 * Position Assignment Logic:
 * 1. Position 0 (bowler) → Current bowler
 * 2. Position 1 (keeper) → Wicketkeeper from squad
 * 3. Positions 2-10 → Remaining fielders from bowling squad
 *
 * Coordinate Transform:
 * - Field config: (x, y) in meters, y-axis points up
 * - SVG: Same coordinate system (using transform on parent SVG)
 */
const FielderPositions = ({ highlightClosest = false }) => {
  const getPlayer = usePlayerStore(state => state.getPlayer);

  // Get match state
  const teams = useMatchStore(state => state.teams);
  const currentBowlerId = useMatchStore(state => state.innings?.bowler);
  const ballByBall = useMatchStore(state => state.ballByBall);

  // Get bowling team ID
  const bowlingTeamId = teams?.bowling?.id;

  // Get field formation from team store
  const fieldFormation = useTeamStore(state =>
    bowlingTeamId ? state.teams[bowlingTeamId]?.fieldFormation : null
  ) || 'neutral';

  // Get bowling team squad
  const bowlingSquad = teams?.bowling?.squad || [];

  // Calculate fielder positions with assigned players
  const positionedFielders = useMemo(() => {
    if (!bowlingSquad || bowlingSquad.length === 0) {
      return [];
    }

    // Get positions from config for current formation
    const formationPositions = fieldPositioningConfig.formations[fieldFormation]?.positions || [];

    if (formationPositions.length === 0) {
      return [];
    }

    // Get current bowler
    const currentBowler = currentBowlerId ? getPlayer(currentBowlerId) : null;

    // Find wicketkeeper from squad
    const wicketkeeper = bowlingSquad
      .map(id => getPlayer(id))
      .find(player => player?.role === 'Wicketkeeper' || player?.primaryRole === 'Wicketkeeper');

    // Get remaining fielders (exclude bowler and keeper)
    const remainingFielders = bowlingSquad
      .map(id => getPlayer(id))
      .filter(player =>
        player &&
        player.id !== currentBowlerId &&
        player.id !== wicketkeeper?.id
      );

    // Assign fielders to positions
    return formationPositions.map((pos, index) => {
      let assignedFielder = null;

      if (index === 0 && currentBowler) {
        // Position 0 = bowler
        assignedFielder = currentBowler;
      } else if (index === 1 && wicketkeeper) {
        // Position 1 = keeper
        assignedFielder = wicketkeeper;
      } else {
        // Remaining positions = other fielders
        const fielderIndex = index - 2;
        assignedFielder = remainingFielders[fielderIndex] || null;
      }

      return {
        ...pos,
        fielder: assignedFielder,
        index
      };
    }).filter(pos => pos.fielder !== null);
  }, [bowlingSquad, fieldFormation, currentBowlerId, getPlayer]);

  // Determine closest fielder to last ball (if highlighting enabled)
  const closestFielderIndex = useMemo(() => {
    if (!highlightClosest || ballByBall.length === 0) {
      return null;
    }

    const lastBall = ballByBall[ballByBall.length - 1];
    const trajectory = lastBall?.metadata?.trajectoryResult;

    if (!trajectory || !trajectory.direction || !trajectory.expectedDistance) {
      return null;
    }

    // Calculate ball landing position
    const angleRad = (trajectory.direction * Math.PI) / 180;
    const strikerY = -10.06; // Striker offset
    const ballX = trajectory.expectedDistance * Math.cos(angleRad);
    const ballY = strikerY + trajectory.expectedDistance * Math.sin(angleRad);

    // Find closest fielder
    let closestIndex = null;
    let minDistance = Infinity;

    positionedFielders.forEach((pos, idx) => {
      const dx = pos.x - ballX;
      const dy = pos.y - ballY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    return closestIndex;
  }, [ballByBall, positionedFielders, highlightClosest]);

  if (positionedFielders.length === 0) {
    return null;
  }

  return (
    <g id="fielder-positions">
      {positionedFielders.map((pos, idx) => {
        const isBowlerOrKeeper = pos.index === 0 || pos.index === 1;
        const isClosest = highlightClosest && idx === closestFielderIndex;

        // Determine circle styling
        const radius = isBowlerOrKeeper ? 1.2 : 0.8;
        const fill = isBowlerOrKeeper ? '#D4AF37' : 'white';
        const stroke = isClosest ? '#EA4335' : 'rgba(255, 255, 255, 0.8)';
        const strokeWidth = isClosest ? 0.3 : 0.15;
        const opacity = isClosest ? 1 : 0.9;

        return (
          <g key={`fielder-${idx}`}>
            {/* Fielder circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={radius}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
            >
              {/* Hover title (tooltip) */}
              <title>
                {pos.fielder?.name || 'Unknown'} ({pos.name})
              </title>
            </circle>

            {/* Pulse animation for closest fielder */}
            {isClosest && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill="none"
                stroke="#EA4335"
                strokeWidth={0.2}
                opacity={0.6}
              >
                <animate
                  attributeName="r"
                  from={radius}
                  to={radius + 2}
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.6"
                  to="0"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Label for bowler and keeper */}
            {isBowlerOrKeeper && (
              <text
                x={pos.x}
                y={pos.y - 2}
                textAnchor="middle"
                fontSize="1.5"
                fill="white"
                fontWeight="bold"
                opacity="0.9"
                style={{ pointerEvents: 'none' }}
              >
                {pos.index === 0 ? 'B' : 'K'}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default FielderPositions;
