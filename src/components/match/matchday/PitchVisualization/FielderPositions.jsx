import React, { useMemo, useState, useEffect } from 'react';
import useMatchStore from '../../../../stores/matchStore';
import useTeamStore from '../../../../stores/teamStore';
import usePlayerStore from '../../../../stores/playerStore';
import { getFormationWithPositions } from '../../../../utils/fieldingFormationResolver.js';
import { buildFielderArray, assignFieldersToPositions } from '../../../../utils/fielderArrayBuilder.js';
import fieldPositionsComplete from '../../../../data/config/fielding-positions-complete.json';

/**
 * FielderPositions - Renders 11 fielders as dots on the cricket field with customize mode
 *
 * Features:
 * - Reads positions from fielding formations
 * - Maps fielders from bowling team squad to positions
 * - Customize mode: Click-to-select system (click fielder, then click destination)
 * - Shows all valid positions when in customize mode
 * - Updates matchStore with customized positions
 *
 * Position Assignment Logic:
 * 1. Position 0 (bowler) → Current bowler (LOCKED)
 * 2. Position 1 (keeper) → Wicketkeeper from squad (LOCKED)
 * 3. Positions 2-10 → Clickable fielders
 */
const FielderPositions = ({ highlightClosest = false }) => {
  const [customizeMode, setCustomizeMode] = useState(false);
  const [selectedFielderIndex, setSelectedFielderIndex] = useState(null);

  const getPlayer = usePlayerStore(state => state.getPlayer);

  // Listen for customize mode toggle from TacticsHub
  useEffect(() => {
    const handleToggle = (event) => {
      setCustomizeMode(event.detail.enabled);
      // Reset selection when exiting customize mode
      if (!event.detail.enabled) {
        setSelectedFielderIndex(null);
      }
    };
    window.addEventListener('toggleFieldCustomize', handleToggle);
    return () => window.removeEventListener('toggleFieldCustomize', handleToggle);
  }, []);

  // Get match state
  const teams = useMatchStore(state => state.teams);
  const innings = useMatchStore(state => state.innings);
  const currentBowlerId = innings?.bowler;
  const ballByBall = useMatchStore(state => state.ballByBall);
  const updateFieldFormation = useMatchStore(state => state.updateFieldFormation);

  // Get field formation from matchStore (live match state)
  const currentFormation = innings?.currentFieldFormation || 'neutral_orthodox';
  const customPositions = innings?.fieldPositions;

  // Get bowling team squad
  const bowlingSquad = teams?.bowling?.squad || [];

  // Get all available positions for customize mode
  const allPositions = fieldPositionsComplete.positions;

  // Calculate fielder positions with assigned players
  // CRITICAL: Uses centralized buildFielderArray to match match engine's logic
  const positionedFielders = useMemo(() => {
    if (!bowlingSquad || bowlingSquad.length === 0) {
      return [];
    }

    if (!currentBowlerId) {
      return [];
    }

    // Build standardized fielder array (SAME logic as match engine)
    const fielders = buildFielderArray({
      bowlingSquad: bowlingSquad,
      currentBowlerId: currentBowlerId,
      playerStore: usePlayerStore
    });

    if (fielders.length === 0) {
      console.warn('[FielderPositions] Failed to build fielder array');
      return [];
    }

    // Get positions from formation or custom positions
    let formationPositions;
    if (customPositions && customPositions.length > 0) {
      formationPositions = customPositions;
    } else {
      const formation = getFormationWithPositions(currentFormation);
      formationPositions = formation?.positions || [];
    }

    if (formationPositions.length === 0) {
      return [];
    }

    // Assign fielders to positions (SAME logic as match engine)
    const positioned = assignFieldersToPositions(fielders, formationPositions);

    const DEBUG_UI = false;
    if (DEBUG_UI) {
      console.log('[FielderPositions] UI fielder array built:', {
        bowler: fielders[0]?.name,
        keeper: fielders[1]?.name,
        totalPositioned: positioned.length
      });
    }

    return positioned;
  }, [bowlingSquad, currentFormation, customPositions, currentBowlerId, getPlayer]);

  // Handle fielder click (select fielder to move)
  const handleFielderClick = (index) => {
    if (!customizeMode) return;
    // Don't allow selecting bowler (0) or keeper (1)
    if (index === 0 || index === 1) return;

    // Toggle selection
    if (selectedFielderIndex === index) {
      setSelectedFielderIndex(null); // Deselect if clicking same fielder
    } else {
      setSelectedFielderIndex(index);
    }
  };

  // Handle position click (move selected fielder to this position)
  const handlePositionClick = (newPositionData) => {
    if (!customizeMode || selectedFielderIndex === null) return;

    // Update positions array
    const newPositions = positionedFielders.map((pos, idx) => {
      if (idx === selectedFielderIndex) {
        return {
          name: newPositionData.id,
          x: newPositionData.x,
          y: newPositionData.y,
          zone: newPositionData.zone
        };
      }
      return {
        name: pos.name,
        x: pos.x,
        y: pos.y,
        zone: pos.zone
      };
    });

    // Update matchStore with new positions
    updateFieldFormation(
      currentFormation,
      newPositions,
      innings.fieldPlayerAssignments
    );

    // Clear selection after moving
    setSelectedFielderIndex(null);
  };

  // Get closest fielder from match engine (already calculated with proper physics)
  const closestFielderIndex = useMemo(() => {
    if (!highlightClosest || ballByBall.length === 0) {
      return null;
    }

    const lastBall = ballByBall[ballByBall.length - 1];
    const fieldingResult = lastBall?.metadata?.fieldingResult;

    // Get closest fielder from match engine's calculation
    const closestFielder = fieldingResult?.closestFielder;

    if (!closestFielder || !closestFielder.fielder) {
      console.log('👥 [FIELDER] No closest fielder data from match engine');
      return null;
    }

    // Match the fielder by ID to find the index in positionedFielders
    const closestFielderId = closestFielder.fielder.id;
    const closestIndex = positionedFielders.findIndex(pos => pos.fielder?.id === closestFielderId);

    if (closestIndex !== -1) {
      console.log('👥 [FIELDER] Closest fielder from match engine:', {
        index: closestIndex,
        name: closestFielder.fielder.name,
        positionName: closestFielder.positionName, // Now comes directly from match engine
        polarCoords: {
          r: closestFielder.position?.r?.toFixed(2) + 'm',
          theta: closestFielder.position?.theta?.toFixed(1) + '°',
          note: 'Polar coordinates from striker position'
        },
        canIntercept: closestFielder.canIntercept,
        distanceToTravel: closestFielder.distance?.toFixed(2) + 'm', // Distance fielder must run to intercept
        expectedShotDistance: closestFielder.expectedDistance === -1
          ? 'CATCH (aerial interception)'
          : closestFielder.expectedDistance?.toFixed(2) + 'm', // Total shot distance if fielder intercepts
        angleDiff: closestFielder.angleDiff?.toFixed(1) + '°', // Angle between shot direction and fielder position
        ...(closestFielder.distanceFromBounce && {
          distanceFromBounce: closestFielder.distanceFromBounce?.toFixed(2) + 'm'
        })
      });

      // Also log running decision if available
      const runningDecision = fieldingResult?.runningDecision;
      if (runningDecision) {
        console.log('🏃 [RUNNING] Running decision from match engine:', {
          runsAttempted: runningDecision.runsAttempted,
          maxSafeRuns: runningDecision.maxSafeRuns,
          isRunOut: runningDecision.isRunOut,
          ...(runningDecision.runOutPlayer && { runOutPlayer: runningDecision.runOutPlayer }),
          errorProbability: (runningDecision.errorProbability * 100).toFixed(1) + '%',
          breakdown: {
            strikerSpeed: runningDecision.breakdown?.strikerSpeed?.toFixed(2) + ' m/s',
            nonStrikerSpeed: runningDecision.breakdown?.nonStrikerSpeed?.toFixed(2) + ' m/s',
            combinedJudgment: runningDecision.breakdown?.combinedJudgment?.toFixed(1),
            fieldingTime: runningDecision.breakdown?.fieldingTime?.toFixed(2) + 's',
            mentality: runningDecision.breakdown?.mentality,
            timeAvailable: runningDecision.breakdown?.calculation?.timeAvailable?.toFixed(2) + 's',
            timeRequired: runningDecision.breakdown?.calculation?.timeRequired?.toFixed(2) + 's',
            safetyMargin: runningDecision.breakdown?.calculation?.safetyMargin?.toFixed(2) + 's'
          }
        });
      }
    } else {
      console.warn('👥 [FIELDER] Could not find fielder in positioned fielders:', closestFielderId);
    }

    return closestIndex !== -1 ? closestIndex : null;
  }, [ballByBall, positionedFielders, highlightClosest]);

  if (positionedFielders.length === 0) {
    return null;
  }

  return (
    <g id="fielder-positions">
      {/* Available positions (show in customize mode) */}
      {customizeMode && allPositions.map((pos, idx) => {
        const isClickable = selectedFielderIndex !== null;

        return (
          <circle
            key={`available-${idx}`}
            cx={pos.x}
            cy={pos.y}
            r={1}
            fill="white"
            opacity={isClickable ? 0.6 : 0.2}
            stroke={isClickable ? '#D4AF37' : 'none'}
            strokeWidth={isClickable ? 0.2 : 0}
            style={{ pointerEvents: 'all', cursor: isClickable ? 'pointer' : 'default' }}
            onClick={() => handlePositionClick(pos)}
          >
            <title>{isClickable ? 'Click to move fielder here' : 'Select a fielder first'}</title>
          </circle>
        );
      })}

      {/* Fielders */}
      {positionedFielders.map((pos, idx) => {
        const isBowler = pos.index === 0;
        const isKeeper = pos.index === 1;
        const isBowlerOrKeeper = isBowler || isKeeper;
        const isClosest = highlightClosest && idx === closestFielderIndex;
        const isClickable = customizeMode && !isBowlerOrKeeper;
        const isSelected = selectedFielderIndex === idx;

        // Determine circle styling based on position zone (slightly bigger)
        const radius = isBowlerOrKeeper ? 1.5 : 1.1;

        // Zone-based coloring (bowler/keeper to black)
        let fill = 'white';
        if (isBowlerOrKeeper) {
          fill = '#000000'; // BLACK for bowler/keeper
        } else {
          switch (pos.zone) {
            case 'silly':
              fill = '#EF4444'; // Red
              break;
            case 'close':
              fill = '#F97316'; // Orange
              break;
            case 'ring':
              fill = '#EAB308'; // Yellow
              break;
            case 'boundary':
              fill = '#3B82F6'; // Blue
              break;
            default:
              fill = 'white';
          }
        }

        // Stroke: selected > closest > default
        let stroke = 'rgba(255, 255, 255, 0.8)';
        let strokeWidth = 0.15;
        if (isSelected) {
          stroke = '#D4AF37'; // Gold for selected
          strokeWidth = 0.5;
        } else if (isClosest) {
          stroke = '#EA4335';
          strokeWidth = 0.3;
        }

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
              style={{
                cursor: isClickable ? 'pointer' : 'default',
                pointerEvents: 'all'
              }}
              onClick={() => handleFielderClick(idx)}
            >
              {/* Hover title (tooltip) */}
              <title>
                {pos.fielder?.name || 'Unknown'} ({pos.name})
                {isClickable && ' - Click to select'}
                {isBowlerOrKeeper && ' - Locked'}
              </title>
            </circle>

            {/* Selection ring for selected fielder */}
            {isSelected && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius + 1}
                fill="none"
                stroke="#D4AF37"
                strokeWidth={0.3}
                opacity={0.8}
              >
                <animate
                  attributeName="r"
                  from={radius + 0.5}
                  to={radius + 1.5}
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.8"
                  to="0.3"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Pulse animation for closest fielder */}
            {isClosest && !isSelected && (
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
                y={pos.y - 2.5}
                textAnchor="middle"
                fontSize="1.8"
                fill="white"
                fontWeight="bold"
                opacity="0.95"
                style={{ pointerEvents: 'none' }}
              >
                {isBowler ? 'B' : 'K'}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default FielderPositions;
