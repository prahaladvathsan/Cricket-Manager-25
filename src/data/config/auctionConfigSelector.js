/**
 * @file auctionConfigSelector.js
 * @description Selects the auction config matching the current difficulty tier.
 *
 * Only AI valuation aggression varies per tier; slabs/increments/quotas/squad
 * sizes/timing are identical across the three configs. The default (Hard)
 * config is also exported as the canonical baseline for retention/transfer
 * code paths that don't switch on difficulty.
 */

import { DIFFICULTY } from '../../core/tactics/DifficultyBuffs.js';
import auctionConfigHard from './auctionConfig.json';
import auctionConfigNormal from './auctionConfig.normal.json';
import auctionConfigImpossible from './auctionConfig.impossible.json';

const CONFIGS = {
  [DIFFICULTY.NORMAL]: auctionConfigNormal,
  [DIFFICULTY.HARD]: auctionConfigHard,
  [DIFFICULTY.IMPOSSIBLE]: auctionConfigImpossible
};

export function getAuctionConfigForDifficulty(difficulty) {
  return CONFIGS[difficulty] || auctionConfigNormal;
}

export default getAuctionConfigForDifficulty;
