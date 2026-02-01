/**
 * @file FieldVisualEditor.jsx
 * @description Visual cricket field editor with player assignment and full-screen customization modal
 *
 * Coordinate System:
 * - Data: Positive Y = striker/keeper end, Negative Y = bowler end
 * - Rendering: SVG Y-axis is flipped via transform="scale(1, -1)"
 * - Visual result: Keeper/striker at TOP, bowler at BOTTOM (correct orientation)
 */

import React, { useState } from 'react';
import { Edit3, X } from 'lucide-react';
import useTeamStore from '../../../stores/teamStore';
import usePlayerStore from '../../../stores/playerStore';
import fieldPositionsComplete from '../../../data/config/fielding-positions-complete.json';

const FieldVisualEditor = ({ positions, validationResult, phase, currentSetup, onUpdateSetup }) => {
  const [customizeMode, setCustomizeMode] = useState(false);
  const [selectedFielderIndex, setSelectedFielderIndex] = useState(null);

  const { getUserTeam, getTeamTactics, updateWicketKeeper } = useTeamStore();
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
  // Merge with wicketKeeper from teamTactics if set (from Overview tab)
  const rawPlayerAssignments = currentSetup?.playerAssignments || {};
  const playerAssignments = {
    ...rawPlayerAssignments,
    // If wicketKeeper is set in teamTactics, use it for position 1 (unless already set)
    1: rawPlayerAssignments[1] || teamTactics?.wicketKeeper || null
  };

  // Get playing XI from squadSelection for fielding position assignments
  const playingXI = teamTactics?.squadSelection || [];
  const allXIPlayers = playingXI.map(playerId => players[playerId]).filter(p => p);

  // Get assigned wicketkeeper ID (prioritize explicit assignment, then teamTactics.wicketKeeper)
  const assignedWicketkeeperId = playerAssignments[1];

  // For wicketkeeper position: show ALL players, natural keepers first
  const naturalKeepers = allXIPlayers.filter(p =>
    p.role === 'wicket-keeper' || p.primaryRole === 'wicket-keeper' ||
    p.role === 'Wicketkeeper' || p.primaryRole === 'Wicketkeeper'
  );
  const otherPlayers = allXIPlayers.filter(p =>
    p.role !== 'wicket-keeper' && p.primaryRole !== 'wicket-keeper' &&
    p.role !== 'Wicketkeeper' && p.primaryRole !== 'Wicketkeeper'
  ).sort((a, b) => (b.playstyleRatings?.fielding?.Wicketkeeper || 0) - (a.playstyleRatings?.fielding?.Wicketkeeper || 0));

  // For non-wicketkeeper positions: exclude the assigned wicketkeeper
  const teamPlayers = allXIPlayers.filter(p => p.id !== assignedWicketkeeperId);

  // Get all available positions for customize mode
  const allPositions = fieldPositionsComplete.positions;

  // Get fielder color based on zone (from position data)
  const getFielderColor = (position) => {
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
      setSelectedFielderIndex(null);
    } else {
      setSelectedFielderIndex(index);
    }
  };

  // Handle position click (move selected fielder to this position)
  const handlePositionClick = (newPositionData) => {
    if (!customizeMode || selectedFielderIndex === null) return;

    const newPosition = {
      name: newPositionData.id,
      x: newPositionData.x,
      y: newPositionData.y,
      zone: newPositionData.zone
    };

    const newPositions = [...positions];
    newPositions[selectedFielderIndex] = newPosition;

    if (onUpdateSetup) {
      onUpdateSetup({
        ...currentSetup,
        positions: newPositions
      });
    }

    setSelectedFielderIndex(null);
  };

  // Handle player assignment change
  const handlePlayerAssignment = (positionIndex, playerId) => {
    if (!onUpdateSetup) return;

    // For keeper position (index 1), sync to global store
    if (positionIndex === 1 && teamId) {
      updateWicketKeeper(teamId, playerId || null);
      return;
    }

    const newAssignments = { ...playerAssignments };

    if (playerId) {
      Object.keys(newAssignments).forEach(key => {
        if (newAssignments[key] === playerId && key !== String(positionIndex)) {
          newAssignments[key] = null;
        }
      });
    }

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

  // Close customize modal
  const closeCustomizeMode = () => {
    setCustomizeMode(false);
    setSelectedFielderIndex(null);
  };

  // Render the field SVG (reusable for both normal and modal views)
  const renderFieldSVG = (isModal = false) => (
    <svg
      viewBox="-80 -80 160 160"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
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

        {/* Stumps */}
        <circle cx="0" cy={-STRIKER_OFFSET} r={STUMP_RADIUS} fill="#D4AF37" stroke="white" strokeWidth="0.1" />
        <circle cx="0" cy={STRIKER_OFFSET} r={STUMP_RADIUS} fill="#D4AF37" stroke="white" strokeWidth="0.1" />

        {/* Available positions in customize mode - white dots */}
        {isModal && allPositions.map((pos) => {
          if (pos.id === 'bowler' || pos.id === 'wicketkeeper') return null;

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
          const isClickable = isModal && !isBowlerOrKeeper;
          const isSelected = selectedFielderIndex === index;

          let stroke = 'white';
          let strokeWidth = 0.4;
          if (isSelected) {
            stroke = '#D4AF37';
            strokeWidth = 0.6;
          }

          return (
            <g key={index}>
              <circle
                cx={position.x}
                cy={position.y}
                r={isBowler ? 2.5 : isKeeper ? 2.5 : 2}
                fill={color}
                stroke={stroke}
                strokeWidth={strokeWidth}
                className={isClickable ? 'cursor-pointer' : ''}
                style={{ pointerEvents: 'all' }}
                onClick={() => isModal && handleFielderClick(index)}
              >
                <title>
                  {playerName || position.name}
                  {isClickable && ' - Click to select'}
                  {isBowlerOrKeeper && ' - Locked'}
                </title>
              </circle>

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
                  <animate attributeName="r" from="2.5" to="3.5" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0.3" dur="1s" repeatCount="indefinite" />
                </circle>
              )}

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
      </g>
    </svg>
  );

  return (
    <>
      <div className="card p-3">
        {/* Header with customize toggle */}
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-text-primary">Field Setup</h4>
          <button
            onClick={() => setCustomizeMode(true)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors bg-transparent border border-white/10 text-text-secondary hover:text-text-primary border border-border-primary"
          >
            <Edit3 className="w-3 h-3" />
            Customize
          </button>
        </div>

        {/* Main layout: Field on left, positions list on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Field Visualization - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="bg-transparent border border-white/10 rounded-lg p-2" style={{ aspectRatio: '1 / 1' }}>
              {renderFieldSVG(false)}
            </div>

            {/* Zone Legend */}
            <div className="flex gap-3 text-xs mt-2 justify-center flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                <span className="text-text-secondary">Silly</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F97316' }}></div>
                <span className="text-text-secondary">Close</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EAB308' }}></div>
                <span className="text-text-secondary">Ring</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                <span className="text-text-secondary">Boundary</span>
              </div>
            </div>
          </div>

          {/* Position List with Player Assignment - 1/3 width */}
          <div className="lg:col-span-1">
            <div className="fielding-player-assignments card p-2 bg-transparent border border-white/10">
              <h5 className="text-xs font-semibold text-text-primary mb-2 pb-1 border-b border-border-primary">
                Player Assignments
              </h5>
              <div className="space-y-1">
                {[...positions].map((position, originalIndex) => ({ position, originalIndex }))
                  .sort((a, b) => {
                    if (a.originalIndex === 1) return -1;
                    if (b.originalIndex === 1) return 1;
                    if (a.originalIndex === 0) return 1;
                    if (b.originalIndex === 0) return -1;
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
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-text-primary truncate">
                            {index + 1}. {position.name?.replace(/_/g, ' ').split(' ').map(w =>
                              w.charAt(0).toUpperCase() + w.slice(1)
                            ).join(' ')}
                          </div>

                          {isBowler ? (
                            <div className="text-xs text-text-secondary">Bowler (auto)</div>
                          ) : isKeeper ? (
                            <select
                              value={playerAssignments[index] || ''}
                              onChange={(e) => handlePlayerAssignment(index, e.target.value)}
                              className="w-full text-xs bg-bg-tertiary border border-border-primary rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:border-cricket-accent"
                            >
                              <option value="">Auto-assign wicketkeeper</option>
                              {naturalKeepers.length > 0 && (
                                <optgroup label="Wicket-keepers">
                                  {naturalKeepers.map(player => (
                                    <option key={player.id} value={player.id}>
                                      {player.name} ({Math.round(player.playstyleRatings?.fielding?.Wicketkeeper || 0)})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {otherPlayers.length > 0 && (
                                <optgroup label="Other Players (Part-time)">
                                  {otherPlayers.map(player => (
                                    <option key={player.id} value={player.id}>
                                      {player.name} ({Math.round(player.playstyleRatings?.fielding?.Wicketkeeper || 0)})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          ) : (
                            <select
                              value={playerAssignments[index] || ''}
                              onChange={(e) => handlePlayerAssignment(index, e.target.value)}
                              className="w-full text-xs bg-bg-tertiary border border-border-primary rounded px-1.5 py-0.5 text-text-primary focus:outline-none focus:border-cricket-accent"
                            >
                              <option value="">Auto-assign</option>
                              {teamPlayers.map(player => {
                                // Calculate fielding rating from attributes
                                const fieldingAttrs = player.attributes?.fielding || {};
                                const catching = fieldingAttrs.catching || 0;
                                const groundFielding = fieldingAttrs.groundFielding || 0;
                                const throwAccuracy = fieldingAttrs.throwAccuracy || 0;
                                const fieldingRating = Math.round((catching + groundFielding + throwAccuracy) / 3);
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

      {/* Full-screen Customize Modal - positioned to avoid sidebar */}
      {customizeMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ left: '200px' }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" onClick={closeCustomizeMode} />

          {/* Field container - fills available space */}
          <div className="relative w-full h-full p-4 flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeCustomizeMode}
              className="absolute top-4 right-4 z-10 p-2 bg-bg-secondary/90 hover:bg-bg-tertiary rounded-full text-text-primary transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Instructions */}
            <div className="absolute top-4 left-4 z-10 px-3 py-2 bg-bg-secondary/90 rounded text-xs text-text-secondary">
              {selectedFielderIndex !== null ? (
                <span className="text-cricket-accent font-medium">Click a position to move the fielder</span>
              ) : (
                <span>Click a fielder to select (bowler & keeper locked)</span>
              )}
            </div>

            {/* Zone Legend */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-4 px-4 py-2 bg-bg-secondary/90 rounded text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                <span className="text-text-secondary">Silly</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F97316' }}></div>
                <span className="text-text-secondary">Close</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EAB308' }}></div>
                <span className="text-text-secondary">Ring</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3B82F6' }}></div>
                <span className="text-text-secondary">Boundary</span>
              </div>
            </div>

            {/* Full-screen field */}
            <div className="w-full h-full max-w-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
              {renderFieldSVG(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FieldVisualEditor;
