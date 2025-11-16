/**
 * @file useMatchResultModal.jsx
 * @description Custom hook for managing match result modal state and logic
 * Centralizes all modal-related functionality in one reusable place
 * Includes data formatting to keep everything in one place
 */

import { useState } from 'react';
import MatchResultModal from '../components/shared/MatchResultModal';

/**
 * Format match result data for the modal
 * @param {Object} data - Raw match result data
 * @returns {Object} Formatted result for MatchResultModal
 */
function formatMatchResultForModal({
  venue,
  matchType = 'World Premier League T20',
  firstBattingTeam,
  secondBattingTeam,
  innings1Data,
  innings2Data,
  winner,
  margin,
  playerOfMatch
}) {
  // Format batsmen stats
  const formatBatsmen = (batsmen) => {
    if (!batsmen || batsmen.length === 0) return [];
    return batsmen.map(b => ({
      id: b.id,
      name: b.name,
      runs: b.runs || 0,
      balls: b.balls || 0,
      fours: b.fours || 0,
      sixes: b.sixes || 0,
      strikeRate: b.strikeRate || '0.0'
    }));
  };

  // Format bowlers stats
  const formatBowlers = (bowlers) => {
    if (!bowlers || bowlers.length === 0) return [];
    return bowlers.map(b => ({
      id: b.id,
      name: b.name,
      overs: b.overs || '0.0',
      wickets: b.wickets || 0,
      runs: b.runs || 0,
      economy: b.economy || '0.00'
    }));
  };

  return {
    venue,
    matchType,
    innings1: {
      teamId: firstBattingTeam.id,
      teamName: firstBattingTeam.name,
      teamColors: firstBattingTeam.colors,
      totalScore: innings1Data.totalScore || 0,
      wickets: innings1Data.wickets || 0,
      overs: innings1Data.overs || 0,
      balls: innings1Data.balls || 0,
      topBatsmen: formatBatsmen(innings1Data.topBatsmen),
      topBowlers: formatBowlers(innings1Data.topBowlers)
    },
    innings2: {
      teamId: secondBattingTeam.id,
      teamName: secondBattingTeam.name,
      teamColors: secondBattingTeam.colors,
      totalScore: innings2Data.totalScore || 0,
      wickets: innings2Data.wickets || 0,
      overs: innings2Data.overs || 0,
      balls: innings2Data.balls || 0,
      topBatsmen: formatBatsmen(innings2Data.topBatsmen),
      topBowlers: formatBowlers(innings2Data.topBowlers)
    },
    winner,
    margin,
    playerOfMatch: playerOfMatch ? {
      id: playerOfMatch.id || 'unknown',
      performance: playerOfMatch.performance || 'N/A'
    } : null
  };
}

/**
 * Custom hook for match result modal management
 * @param {Object} options - Configuration options
 * @param {Function} options.onClose - Optional callback when modal closes
 * @returns {Object} Modal state and controls
 */
export function useMatchResultModal({ onClose } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  /**
   * Show the modal with match result data
   * @param {Object} resultData - Raw result data from match simulation
   * @param {Object} resultData.venue - Match venue
   * @param {Object} resultData.firstBattingTeam - First batting team {id, name, colors}
   * @param {Object} resultData.secondBattingTeam - Second batting team {id, name, colors}
   * @param {Object} resultData.innings1Data - First innings data
   * @param {Object} resultData.innings2Data - Second innings data
   * @param {string} resultData.winner - Winner team ID
   * @param {string} resultData.margin - Win margin
   * @param {Object} resultData.playerOfMatch - Player of match
   */
  const showResult = (resultData) => {
    // Format the data internally
    const formattedResult = formatMatchResultForModal(resultData);
    setMatchResult(formattedResult);
    setIsOpen(true);
  };

  /**
   * Close the modal
   */
  const closeResult = () => {
    setIsOpen(false);
    // Call optional onClose callback
    if (onClose) {
      onClose();
    }
  };

  /**
   * The modal component ready to render
   */
  const ModalComponent = (
    <MatchResultModal
      isOpen={isOpen}
      onClose={closeResult}
      matchResult={matchResult}
    />
  );

  return {
    isOpen,
    matchResult,
    showResult,
    closeResult,
    ModalComponent
  };
}

export default useMatchResultModal;
