/**
 * @file FieldVisualEditor.jsx
 * @description Visual cricket field editor with player assignment and drag-and-drop customization
 *
 * Coordinate System:
 * - Data: Positive Y = striker/keeper end, Negative Y = bowler end
 * - Rendering: SVG Y-axis is flipped via transform="scale(1, -1)"
 * - Visual result: Keeper/striker at TOP, bowler at BOTTOM (correct orientation)
 */

import React, { useState } from 'react';
import { Edit3, Lock } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import fieldPositionsComplete from '../../../data/config/fielding-positions-complete.json';

const FieldVisualEditor = ({ positions, validationResult, phase, currentSetup, onUpdateSetup }) => {
  const [customizeMode, setCustomizeMode] = useState(false);
  const [selectedFielderIndex, setSelectedFielderIndex] = useState(null);

  const { getUserTeam, getTeamTactics } = useTeamStore();
  const { players } = usePlayerStore();

  const userTeam = getUserTeam();
  const teamId = userTeam?.id;
  const teamTactics = teamId ? getTeamTactics(teamId) : null;

  if (!positions || positions.length !== 11) {
    return null;
  }

  // Field dimensions (same as MatchdayUI)
  const BOUNDARY_RADIUS = 70;
  const INNER_CIRCLE_RADIUS = 30;
  const PITCH_LENGTH = 20.12;
  const PITCH_WIDTH = 3.05;
  const STRIKER_OFFSET = 10.06;
  const STUMP_RADIUS = 0.5;

  // Player assignments (must be defined before using it)
  const playerAssignments = currentSetup?.playerAssignments || {};

  // Get playing XI from squadSelection for fielding position assignments
  // The 11th player (leftover) will be the bowler or sub when bowler is bowling
  const playingXI = teamTactics?.squadSelection || [];
  const allXIPlayers = playingXI.map(playerId => players[playerId]).filter(p => p);

  // Debug logging
  const samplePlayer = allXIPlayers.find(p => p.role === 'wicket-keeper');
  console.log('FieldVisualEditor Debug:', {
    teamId,
    hasTeamTactics: !!teamTactics,
    allXIPlayers: allXIPlayers.length,
    sampleWicketkeeper: samplePlayer ? {
      name: samplePlayer.name,
      playstyleRatings: samplePlayer.playstyleRatings
    } : 'none found'
  });

  // Get assigned wicketkeeper ID
  const assignedWicketkeeperId = playerAssignments[1]; // Position 1 is wicketkeeper

  // For wicketkeeper position: show only wicketkeepers with wicketkeeper playstyle rating
  const wicketkeeperCandidates = allXIPlayers.filter(p =>
    p.role === 'wicket-keeper' || p.primaryRole === 'wicket-keeper' ||
    p.role === 'Wicketkeeper' || p.primaryRole === 'Wicketkeeper'
  );

  // For non-wicketkeeper positions: exclude the assigned wicketkeeper
  const teamPlayers = allXIPlayers.filter(p => p.id !== assignedWicketkeeperId);

  // Get all available positions for customize mode
  const allPositions = fieldPositionsComplete.positions;

  // Get fielder color based on zone (from position data)
  const getFielderColor = (position) => {
    // Use zone property from fielding-positions-complete.json (4 zones)
    switch (position.zone) {
      case 'silly':
        return '#EF4444'; // Red - very close (<12m), high risk
      case 'close':
        return '#F97316'; // Orange - close catching (12-20m), medium risk
      case 'ring':
        return '#EAB308'; // Yellow - 30-yard circle (20-30m), low risk
      case 'boundary':
        return '#3B82F6'; // Blue - deep/boundary (30-70m), defensive
      default:
        return '#FFFFFF'; // White fallback
    }
  };

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

    // Find nearest available position
    const newPosition = {
      name: newPositionData.id,
      x: newPositionData.x,
      y: newPositionData.y,
      zone: newPositionData.zone
    };

    // Update positions array
    const newPositions = [...positions];
    newPositions[selectedFielderIndex] = newPosition;

    // Call update handler
    if (onUpdateSetup) {
      onUpdateSetup({
        ...currentSetup,
        positions: newPositions
      });
    }

    // Clear selection after moving
    setSelectedFielderIndex(null);
  };

  // Handle player assignment change
  const handlePlayerAssignment = (positionIndex, playerId) => {
    if (!onUpdateSetup) return;

    const newAssignments = { ...playerAssignments };

    // If player is being assigned (not cleared)
    if (playerId) {
      // Find and clear any existing assignment of this player
      Object.keys(newAssignments).forEach(key => {
        if (newAssignments[key] === playerId && key !== String(positionIndex)) {
          newAssignments[key] = null; // Vacate the old position
        }
      });
    }

    // Assign player to new position (or clear if playerId is null)
    newAssignments[positionIndex] = playerId || null;

    onUpdateSetup({
      ...currentSetup,
      playerAssignments: newAssignments
    });
  };

  // Get player name for position
  const getPlayerName = (positionIndex) => {
    const playerId = playerAssignments[positionIndex];
    if (!playerId) return null;
    const player = players[playerId];
    return player ? player.name : null;
  };

  return (
    <div className="card p-4">
      {/* Header with customize toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-1">
            Field Setup
          </h4>
          <p className="text-xs text-text-secondary">
            {customizeMode ? 'Click a fielder, then click a position to move' : 'Visual representation with player assignments'}
          </p>
        </div>
        <button
          onClick={() => {
            setCustomizeMode(!customizeMode);
            // Reset selection when toggling off
            if (customizeMode) setSelectedFielderIndex(null);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            customizeMode
              ? 'bg-cricket-primary text-white'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
          }`}
        >
          {customizeMode ? (
            <>
              <Lock className="w-3 h-3" />
              Lock Positions
            </>
          ) : (
            <>
              <Edit3 className="w-3 h-3" />
              Customize Field
            </>
          )}
        </button>
      </div>

      {/* Main layout: Field on left, positions list on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Field Visualization - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="bg-bg-tertiary rounded-lg p-4">
            <svg
              viewBox="-80 -80 160 160"
              className="w-full h-auto"
              style={{ aspectRatio: '1 / 1' }}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Apply Y-axis flip: positive Y data = top of screen */}
              <g transform="scale(1, -1)">
              {/* Background - Cricket Green */}
              <rect x="-80" y="-80" width="160" height="160" fill="#2D5F3F" />

              {/* Boundary Circle */}
              <circle cx="0" cy="0" r={BOUNDARY_RADIUS} fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />

              {/* Inner Circle (30m) */}
              <circle cx="0" cy="0" r={INNER_CIRCLE_RADIUS} fill="none" stroke="white" strokeWidth="0.3" strokeDasharray="2 1" opacity="0.6" />

              {/* Pitch Rectangle */}
              <rect
                x={-PITCH_WIDTH / 2}
                y={-PITCH_LENGTH / 2}
                width={PITCH_WIDTH}
                height={PITCH_LENGTH}
                fill="#3D7050"
                stroke="white"
                strokeWidth="0.2"
                opacity="0.8"
              />

              {/* Creases */}
              <line x1={-PITCH_WIDTH} y1={-STRIKER_OFFSET} x2={PITCH_WIDTH} y2={-STRIKER_OFFSET} stroke="white" strokeWidth="0.15" opacity="0.7" />
              <line x1={-PITCH_WIDTH} y1={STRIKER_OFFSET} x2={PITCH_WIDTH} y2={STRIKER_OFFSET} stroke="white" strokeWidth="0.15" opacity="0.7" />

              {/* Stumps - Striker End (bottom) */}
              <circle cx="0" cy={-STRIKER_OFFSET} r={STUMP_RADIUS} fill="#D4AF37" stroke="white" strokeWidth="0.1" />

              {/* Stumps - Bowler End (top) */}
              <circle cx="0" cy={STRIKER_OFFSET} r={STUMP_RADIUS} fill="#D4AF37" stroke="white" strokeWidth="0.1" />

              {/* Available positions in customize mode - white dots */}
              {customizeMode && allPositions.map((pos) => {
                // Don't show bowler and keeper positions
                if (pos.id === 'bowler' || pos.id === 'wicketkeeper') return null;

                // Check if position is already occupied
                const isOccupied = positions.some(p =>
                  Math.abs(p.x - pos.x) < 1 && Math.abs(p.y - pos.y) < 1
                );

                const isClickable = selectedFielderIndex !== null;

                return (
                  <circle
                    key={pos.id}
                    cx={pos.x}
                    cy={pos.y}
                    r={isOccupied ? 0 : 1.5}
                    fill="white"
                    opacity={isClickable ? 0.6 : 0.2}
                    stroke={isClickable ? '#D4AF37' : 'none'}
                    strokeWidth={isClickable ? 0.2 : 0}
                    className={isClickable ? 'cursor-pointer' : ''}
                    style={{ pointerEvents: 'all' }}
                    onClick={() => handlePositionClick(pos)}
                  >
                    <title>{isClickable ? 'Click to move fielder here' : 'Select a fielder first'}</title>
                  </circle>
                );
              })}

              {/* Current fielder positions */}
              {positions.map((position, index) => {
                const isKeeper = index === 1;
                const isBowler = index === 0;
                const isBowlerOrKeeper = isBowler || isKeeper;
                const color = getFielderColor(position);
                const playerName = getPlayerName(index);
                const isClickable = customizeMode && !isBowlerOrKeeper;
                const isSelected = selectedFielderIndex === index;

                // Stroke: selected > default
                let stroke = 'white';
                let strokeWidth = 0.4;
                if (isSelected) {
                  stroke = '#D4AF37'; // Gold for selected
                  strokeWidth = 0.6;
                }

                return (
                  <g key={index}>
                    {/* Fielder marker */}
                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={isBowler ? 2.5 : isKeeper ? 2.5 : 2}
                      fill={color}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      className={isClickable ? 'cursor-pointer' : ''}
                      style={{ pointerEvents: 'all' }}
                      onClick={() => handleFielderClick(index)}
                    >
                      <title>
                        {playerName || position.name}
                        {isClickable && ' - Click to select'}
                        {isBowlerOrKeeper && ' - Locked'}
                      </title>
                    </circle>

                    {/* Selection ring for selected fielder */}
                    {isSelected && (
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r={3}
                        fill="none"
                        stroke="#D4AF37"
                        strokeWidth={0.3}
                        opacity={0.8}
                      >
                        <animate
                          attributeName="r"
                          from="2.5"
                          to="3.5"
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

                    {/* Player name below */}
                    {playerName && (
                      <text
                        x={position.x}
                        y={position.y - 3.5}
                        textAnchor="middle"
                        fill="white"
                        fontSize="2.5"
                        fontWeight="600"
                        className="select-none"
                        style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
                        transform={`scale(1, -1) translate(0, ${-2 * (position.y - 4)})`}
                      >
                        {playerName.split(' ').pop()}
                      </text>
                    )}

                    {/* Position label Above */}
                    <text
                      x={position.x}
                      y={position.y + (playerName ? 5 : 4)}
                      textAnchor="middle"
                      fill="white"
                      fontSize="2"
                      fontWeight="500"
                      opacity="1"
                      className="select-none"
                      transform={`scale(1, -1) translate(0, ${-2 * (position.y + (3.5))})`}
                    >
                      {position.name?.replace(/_/g, ' ').split(' ').map(w =>
                        w.charAt(0).toUpperCase() + w.slice(1)
                      ).join(' ').substring(0, 12)}
                    </text>

                    {/* Special markers */}
                    {isKeeper && (
                      <text
                        x={position.x}
                        y={position.y + 1}
                        textAnchor="middle"
                        fill="#000000"
                        fontSize="2"
                        fontWeight="bold"
                        transform={`scale(1, -1) translate(0, ${-2 * (position.y)})`}
                      >
                        WK
                      </text>
                    )}
                    {isBowler && (
                      <text
                        x={position.x}
                        y={position.y + 0.8}
                        textAnchor="middle"
                        fill="#000000"
                        fontSize="2"
                        fontWeight="bold"
                        transform={`scale(1, -1) translate(0, ${-2 * (position.y)})`}
                      >
                        B
                      </text>
                    )}
                  </g>
                );
              })}
              </g> {/* Close transform group */}
            </svg>
          </div>

          {/* Zone Legend */}
          <div className="flex gap-3 text-xs mt-2 justify-center flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
              <span className="text-text-secondary">Silly (&lt;12m)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F97316' }}></div>
              <span className="text-text-secondary">Close (12-20m)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EAB308' }}></div>
              <span className="text-text-secondary">Ring (20-30m)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-text-secondary">Boundary (30-70m)</span>
            </div>
          </div>
        </div>

        {/* Position List with Player Assignment - 1/3 width */}
        <div className="lg:col-span-1">
          <div className="card p-2 bg-bg-tertiary max-h-[600px] overflow-y-auto">
            <h5 className="text-xs font-semibold text-text-primary mb-2 sticky top-0 bg-bg-tertiary pb-1 border-b border-border-primary">
              Player Assignments
            </h5>
            <div className="space-y-1">
              {/* Sort positions: keeper first, then fielders (2-10), bowler last */}
              {[...positions].map((position, originalIndex) => ({ position, originalIndex }))
                .sort((a, b) => {
                  // Keeper (1) first
                  if (a.originalIndex === 1) return -1;
                  if (b.originalIndex === 1) return 1;
                  // Bowler (0) last
                  if (a.originalIndex === 0) return 1;
                  if (b.originalIndex === 0) return -1;
                  // Others by original order
                  return a.originalIndex - b.originalIndex;
                })
                .map(({ position, originalIndex: index }) => {
                const isKeeper = index === 1;
                const isBowler = index === 0;
                const color = getFielderColor(position);

                return (
                  <div
                    key={index}
                    className="flex items-center gap-1.5 p-1.5 rounded bg-bg-secondary border border-border-primary"
                  >
                    <div className={`w-3 h-3 rounded-full flex-shrink-0`} style={{ backgroundColor: color }}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">
                        {index + 1}. {position.name?.replace(/_/g, ' ').split(' ').map(w =>
                          w.charAt(0).toUpperCase() + w.slice(1)
                        ).join(' ')}
                      </div>

                      {/* Player assignment dropdown */}
                      {isBowler ? (
                        <div className="text-xs text-text-secondary">
                          Bowler (auto)
                        </div>
                      ) : isKeeper ? (
                        <select
                          value={playerAssignments[index] || ''}
                          onChange={(e) => handlePlayerAssignment(index, e.target.value)}
                          className="w-full text-xs bg-bg-tertiary border border-border-primary rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:border-cricket-accent"
                        >
                          <option value="">Auto-assign wicketkeeper</option>
                          {wicketkeeperCandidates.map(player => {
                            // Get wicketkeeper playstyle rating
                            const wicketkeeperRating = Math.round(player.playstyleRatings?.fielding.Wicketkeeper || 0);

                            return (
                              <option key={player.id} value={player.id}>
                                {player.name} ({wicketkeeperRating})
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <select
                          value={playerAssignments[index] || ''}
                          onChange={(e) => handlePlayerAssignment(index, e.target.value)}
                          className="w-full text-xs bg-bg-tertiary border border-border-primary rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:border-cricket-accent"
                        >
                          <option value="">Auto-assign</option>
                          {teamPlayers.map(player => {
                            // Get fielding attribute
                            const fieldingRating = player.fielding || player.catching || 10;

                            return (
                              <option key={player.id} value={player.id}>
                                {player.name} ({fieldingRating})
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldVisualEditor;
