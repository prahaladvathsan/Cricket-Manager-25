/**
 * @file DifficultyBuffs.js
 * @description AI-side buffs for Hard / Impossible difficulty modes
 * @module core/tactics/DifficultyBuffs
 *
 * Buffs only fire on user-vs-AI matches. AI-vs-AI sim-to-date fixtures are
 * unaffected because the gate requires `userTeamId` to be one of the two
 * team IDs in the current match.
 */

export const DIFFICULTY = Object.freeze({
  NORMAL: 'normal',
  HARD: 'hard',
  IMPOSSIBLE: 'impossible'
});

const NO_BUFFS = Object.freeze({
  strikerBuffed: false,
  bowlerBuffed: false,
  pressureNoPenalty: false,
  energyNoPenalty: false,
  confidenceLocked: false,
  baselineBuff: 0,
  difficulty: DIFFICULTY.NORMAL
});

/**
 * Compute which buffs apply to the striker / bowler this ball.
 *
 * @param {Object} args
 * @param {string} args.difficulty - 'normal' | 'hard' | 'impossible'
 * @param {string|null} args.userTeamId - User team ID, or null/undefined for no user
 * @param {string} args.battingTeamId
 * @param {string} args.bowlingTeamId
 * @returns {{strikerBuffed: boolean, bowlerBuffed: boolean, pressureNoPenalty: boolean,
 *           energyNoPenalty: boolean, confidenceLocked: boolean, baselineBuff: number,
 *           difficulty: string}}
 */
export function computeAiBuffs({ difficulty, userTeamId, battingTeamId, bowlingTeamId }) {
  if (!difficulty || difficulty === DIFFICULTY.NORMAL) return NO_BUFFS;
  if (!userTeamId) return NO_BUFFS;

  const userIsBatting = userTeamId === battingTeamId;
  const userIsBowling = userTeamId === bowlingTeamId;
  if (!userIsBatting && !userIsBowling) return NO_BUFFS; // AI-vs-AI fixture

  const strikerBuffed = userIsBowling; // AI bats → striker is AI
  const bowlerBuffed = userIsBatting;  // AI bowls → bowler is AI

  const isImpossible = difficulty === DIFFICULTY.IMPOSSIBLE;

  return {
    strikerBuffed,
    bowlerBuffed,
    pressureNoPenalty: true,
    energyNoPenalty: true,
    confidenceLocked: true,
    baselineBuff: isImpossible ? 2 : 0,
    difficulty
  };
}

/**
 * Apply a flat additive modifier to every attribute on the player.
 * Mutates the passed player object — caller is responsible for cloning.
 */
export function applyFlatAttributeBuff(player, modifier) {
  if (!player?.attributes || !modifier) return;
  ['batting', 'bowling', 'physical', 'mental', 'fielding'].forEach(category => {
    const bucket = player.attributes[category];
    if (!bucket) return;
    Object.keys(bucket).forEach(attr => {
      bucket[attr] += modifier;
    });
  });
}

/**
 * Deep-clone the attribute sub-objects so a downstream mutator can't bleed
 * back into the shared player record. Mirrors the pattern used by
 * ConfidenceManager / EnergyManager.
 */
export function cloneForAttributeMutation(player) {
  return {
    ...player,
    attributes: {
      ...player.attributes,
      batting: { ...player.attributes?.batting },
      bowling: { ...player.attributes?.bowling },
      physical: { ...player.attributes?.physical },
      mental: { ...player.attributes?.mental },
      fielding: { ...player.attributes?.fielding }
    },
    condition: { ...player.condition }
  };
}
