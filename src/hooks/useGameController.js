/**
 * @file useGameController.js
 * @description Custom React hook for GameController integration
 */

import { useMemo } from 'react';
import useGameStore from '../stores/gameStore';
import useLeagueStore from '../stores/leagueStore';
import useTeamStore from '../stores/teamStore';
import usePlayerStore from '../stores/playerStore';
import useMatchStore from '../stores/matchStore';
import GameController from '../core/game/GameController';

/**
 * Hook to access GameController with all stores
 * @returns {Object} { controller, nextEvent }
 */
const useGameController = () => {
  // Get store instances
  const gameStore = useGameStore();
  const leagueStore = useLeagueStore();
  const teamStore = useTeamStore();
  const playerStore = usePlayerStore();
  const matchStore = useMatchStore();

  // Create GameController instance (memoized to avoid recreation)
  const controller = useMemo(() => {
    return new GameController({
      gameStore,
      leagueStore,
      teamStore,
      playerStore,
      matchStore
    });
  }, []); // Empty deps - stores are stable references

  // Get next event based on current game state
  const nextEvent = controller.getNextEvent();

  return {
    controller,
    nextEvent,
    // Helper methods
    advanceToNext: () => controller.advanceToNext(),
    initializeLeagueSeason: () => controller.initializeLeagueSeason(),
    startPlayoffs: () => controller.startPlayoffs(),
    endSeason: () => controller.endSeason()
  };
};

export default useGameController;
