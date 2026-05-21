/**
 * @file archetypePresets.js
 * @description Archetype presets for the testing suite. Each preset describes
 * a target player archetype + the recommended tactical context, and resolves
 * to a concrete player by ranking the player DB against the preset's
 * `pickScore` function.
 *
 * Two kinds of presets:
 *  1. Real-DB picks — find the closest existing player to a target archetype.
 *  2. Synthetic outliers — pick any player as a base, then override key
 *     attributes to manufacture an extreme test case. The overrides are
 *     passed through TestSimulator via config.attributeOverrides.
 */

// ---------- helpers ----------

function getAttr(p, path, def = 10) {
  const segs = path.split('.');
  let cur = p?.attributes;
  for (const s of segs) {
    cur = cur?.[s];
    if (cur === undefined || cur === null) return def;
  }
  return cur;
}

function getBatRating(p) {
  const style = p?.primaryPlaystyle?.batting;
  if (!style) return 0;
  return p?.playstyleRatings?.batting?.[style] ?? 0;
}

function getBowlRating(p) {
  const style = p?.primaryPlaystyle?.bowling;
  if (!style) return 0;
  return p?.playstyleRatings?.bowling?.[style] ?? 0;
}

function rolesFor(p) {
  return (p?.role || '').toLowerCase();
}

function playstyleIncludes(p, fragments, side = 'batting') {
  // Check primary playstyle first, then fall back to top-N playstyles
  const primary = (p?.primaryPlaystyle?.[side] || '').toLowerCase();
  if (fragments.some(f => primary.includes(f.toLowerCase()))) return true;
  const top = p?.topPlaystyles?.[side] || [];
  return top.some(ts => fragments.some(f => (ts?.name || '').toLowerCase().includes(f.toLowerCase())));
}

// Build a top-N ranked list and pick one
function pickByScore(players, scoreFn, filterFn = null) {
  const arr = Object.values(players)
    .filter(p => p && (filterFn ? filterFn(p) : true))
    .map(p => ({ p, score: scoreFn(p) }))
    .sort((a, b) => b.score - a.score);
  return arr[0]?.p?.id || null;
}

// ---------- BATTER ARCHETYPES ----------

export const BATTER_ARCHETYPES = [
  {
    id: 'top-power-hitter',
    label: 'Top Power Hitter (IRL: Russell/SKY)',
    description: 'Elite slogger — top strength + timing, attacking shots',
    accelerationTier: 'Hit Out/Get Out',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'physical.strength') * 2 + getAttr(p, 'batting.timing') + getAttr(p, 'batting.attackingShots') + getBatRating(p) / 10,
      p => playstyleIncludes(p, ['Slogger', 'Pinch-Hitter', 'Finisher'])
    )
  },
  {
    id: 'top-anchor',
    label: 'Top Anchor (IRL: Babar/Root)',
    description: 'Elite anchor — top technique + concentration, defensive shots',
    accelerationTier: 'Build',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'batting.technique') * 2 + getAttr(p, 'mental.concentration') + getAttr(p, 'batting.defensiveShots') + getBatRating(p) / 10,
      p => playstyleIncludes(p, ['Anchor', 'Wall'])
    )
  },
  {
    id: 'top-balanced',
    label: 'Top Balanced Bat (IRL: Kohli)',
    description: 'Elite balanced — top all-round batting attributes',
    accelerationTier: 'Cruise',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'batting.timing') + getAttr(p, 'batting.technique') + getAttr(p, 'batting.placement') + getAttr(p, 'physical.strength') + getBatRating(p) / 5,
      p => playstyleIncludes(p, ['Balanced'])
    )
  },
  {
    id: 'top-finisher',
    label: 'Top Finisher (IRL: Dhoni late)',
    description: 'Elite middle-order finisher — strength + creativity, must be a specialist batter',
    accelerationTier: 'Cruise',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'physical.strength') * 2 + getAttr(p, 'batting.creativity') + getAttr(p, 'batting.range360') + getBatRating(p) / 5,
      p => ['batsman', 'wicketkeeper', 'all-rounder'].includes(p.role?.toLowerCase()) &&
           (p.attributes?.overall?.batting_overall ?? 0) >= 12 &&
           playstyleIncludes(p, ['Finisher', 'Slogger', 'Pinch-Hitter', 'Lower Order', 'Middle Order'])
    )
  },
  {
    id: 'mid-balanced',
    label: 'Mid-Tier Balanced Bat',
    description: 'Median batter — balanced playstyle ~50-65 overall',
    accelerationTier: 'Rotate',
    find: (players) => {
      const candidates = Object.values(players).filter(p => playstyleIncludes(p, ['Balanced']));
      candidates.sort((a, b) => getBatRating(b) - getBatRating(a));
      // Pick the median
      return candidates[Math.floor(candidates.length / 2)]?.id || null;
    }
  },
  {
    id: 'mid-slogger',
    label: 'Mid-Tier Slogger',
    description: 'Median slogger — to compare against elite/poor sloggers',
    accelerationTier: 'Blitz',
    find: (players) => {
      const candidates = Object.values(players).filter(p => playstyleIncludes(p, ['Slogger']));
      candidates.sort((a, b) => getBatRating(b) - getBatRating(a));
      return candidates[Math.floor(candidates.length / 2)]?.id || null;
    }
  },
  {
    id: 'tail-biffer',
    label: 'Tail Biffer (IRL: Cummins/Boult bat)',
    description: 'Low-rating batter — bowler\'s batting',
    accelerationTier: 'Hit Out/Get Out',
    find: (players) => pickByScore(
      players,
      p => -getAttr(p, 'batting.technique') - getAttr(p, 'batting.timing') + (rolesFor(p) === 'bowler' ? 5 : 0),
      p => rolesFor(p) === 'bowler' && getAttr(p, 'batting.timing') < 10
    )
  },
  {
    id: 'weak-batter',
    label: 'Weak Batter (bottom percentile)',
    description: 'Lowest-rated proper batter for floor comparison',
    accelerationTier: 'Rotate',
    find: (players) => pickByScore(
      players,
      p => -(getAttr(p, 'batting.timing') + getAttr(p, 'batting.technique') + getAttr(p, 'batting.footwork')),
      p => ['batsman', 'wicketkeeper'].includes(rolesFor(p))
    )
  },
  // ---------- Synthetic outliers ----------
  {
    id: 'synthetic-maxed',
    label: 'SYNTHETIC: Maxed Batter (20s)',
    description: 'All key batting attrs forced to 20 — engine upper bound',
    accelerationTier: 'Hit Out/Get Out',
    find: (players) => pickByScore(
      players,
      p => getBatRating(p),
      p => playstyleIncludes(p, ['Slogger', 'Balanced'])
    ),
    attributeOverrides: {
      batting: { timing: 20, footwork: 20, technique: 20, strength: 20, placement: 20, range360: 20, attackingShots: 20, creativity: 20 },
      physical: { strength: 20 },
      mental: { judgement: 20, concentration: 20 }
    }
  },
  {
    id: 'synthetic-floor',
    label: 'SYNTHETIC: Floored Batter (3s)',
    description: 'All key batting attrs forced to 3 — engine lower bound',
    accelerationTier: 'Rotate',
    find: (players) => pickByScore(players, p => getBatRating(p), p => playstyleIncludes(p, ['Balanced'])),
    attributeOverrides: {
      batting: { timing: 3, footwork: 3, technique: 3, strength: 3, placement: 3, range360: 3, attackingShots: 3, defensiveShots: 3, creativity: 3 },
      physical: { strength: 3 },
      mental: { judgement: 3, concentration: 3 }
    }
  }
];

// ---------- BOWLER ARCHETYPES ----------

export const BOWLER_ARCHETYPES = [
  {
    id: 'top-attacking-pace',
    label: 'Top Attacking Pace (IRL: Bumrah/Rabada)',
    description: 'Elite wicket-taking pacer',
    lineLength: 'Attacking Line',
    variation: 'Swing/Seam Focus',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'bowling.bowlingSpeed') + getAttr(p, 'bowling.swing') + getAttr(p, 'bowling.accuracy') + getBowlRating(p) / 5,
      p => p?.bowlingType?.toLowerCase() === 'pace'
    )
  },
  {
    id: 'top-death-pace',
    label: 'Top Death Pacer (IRL: Bumrah death)',
    description: 'Yorker specialist — accuracy + variations',
    lineLength: 'Yorker Execution',
    variation: 'Pace Variation Mix',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'bowling.accuracy') * 2 + getAttr(p, 'bowling.variations') + getBowlRating(p) / 5,
      p => p?.bowlingType?.toLowerCase() === 'pace'
    )
  },
  {
    id: 'top-swing-bowler',
    label: 'Top Swing Bowler (IRL: Boult/Anderson)',
    description: 'New-ball swing specialist',
    lineLength: 'Attacking Line',
    variation: 'Swing/Seam Focus',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'bowling.swing') * 2 + getAttr(p, 'bowling.accuracy') + getBowlRating(p) / 5,
      p => p?.bowlingType?.toLowerCase() === 'pace'
    )
  },
  {
    id: 'top-leg-spinner',
    label: 'Top Leg Spinner (IRL: Rashid Khan)',
    description: 'Wicket-taking spinner — turn + variations',
    lineLength: 'Stumps Attack',
    variation: 'Turn Candy Bag',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'bowling.turn') * 2 + getAttr(p, 'bowling.variations') + getBowlRating(p) / 5,
      p => /Leg|wrist|LWS/i.test(p?.bowlingStyle || '')
    )
  },
  {
    id: 'top-finger-spinner',
    label: 'Top Finger Spinner (IRL: Ashwin)',
    description: 'Containment + flight specialist',
    lineLength: 'Wide of Off',
    variation: 'Consistent Line',
    find: (players) => pickByScore(
      players,
      p => getAttr(p, 'bowling.accuracy') + getAttr(p, 'bowling.flight', 10) + getAttr(p, 'bowling.turn') + getBowlRating(p) / 5,
      p => /Off|orthodox|SLA/i.test(p?.bowlingStyle || '')
    )
  },
  {
    id: 'mid-pace',
    label: 'Mid-Tier Pace',
    description: 'Median pacer (specialist bowler only — excludes part-timers)',
    lineLength: 'Wide Line',
    variation: 'Consistent Accuracy',
    find: (players) => {
      const candidates = Object.values(players)
        .filter(p => p?.bowlingType?.toLowerCase() === 'pace')
        .filter(p => ['bowler', 'all-rounder'].includes(p.role?.toLowerCase()))
        .filter(p => (p.attributes?.overall?.bowling_overall ?? 0) >= 8);  // exclude players with cheap part-time bowling
      candidates.sort((a, b) => (b.attributes?.overall?.bowling_overall ?? 0) - (a.attributes?.overall?.bowling_overall ?? 0));
      return candidates[Math.floor(candidates.length / 2)]?.id || null;
    }
  },
  {
    id: 'mid-spin',
    label: 'Mid-Tier Spinner',
    description: 'Median spinner (specialist bowler only)',
    lineLength: 'Wide of Off',
    variation: 'Consistent Line',
    find: (players) => {
      const candidates = Object.values(players)
        .filter(p => p?.bowlingType?.toLowerCase() === 'spin')
        .filter(p => ['bowler', 'all-rounder'].includes(p.role?.toLowerCase()))
        .filter(p => (p.attributes?.overall?.bowling_overall ?? 0) >= 8);
      candidates.sort((a, b) => (b.attributes?.overall?.bowling_overall ?? 0) - (a.attributes?.overall?.bowling_overall ?? 0));
      return candidates[Math.floor(candidates.length / 2)]?.id || null;
    }
  },
  {
    id: 'weak-bowler',
    label: 'Weak Pace Bowler (bottom percentile)',
    description: 'Floor pace bowler for comparison',
    lineLength: 'Wide Line',
    variation: 'Consistent Accuracy',
    find: (players) => pickByScore(
      players,
      p => -(getAttr(p, 'bowling.accuracy') + getAttr(p, 'bowling.swing') + getAttr(p, 'bowling.bowlingSpeed')),
      p => ['bowler', 'all-rounder'].includes(rolesFor(p)) && p?.bowlingType?.toLowerCase() === 'pace' && (p.attributes?.overall?.bowling_overall ?? 0) >= 5
    )
  },
  // ---------- Synthetic outliers ----------
  {
    id: 'synthetic-maxed-bowler',
    label: 'SYNTHETIC: Maxed Bowler (20s)',
    description: 'All key bowling attrs forced to 20 — engine upper bound',
    lineLength: 'Attacking Line',
    variation: 'Swing/Seam Focus',
    find: (players) => pickByScore(players, p => getBowlRating(p), p => p?.bowlingType?.toLowerCase() === 'pace'),
    attributeOverrides: {
      bowling: { accuracy: 20, swing: 20, bowlingSpeed: 20, variations: 20, intelligence: 20, turn: 20, flight: 20 }
    }
  }
];

// ---------- Resolver ----------

/**
 * Resolve a preset to a concrete player ID + optional attribute overrides.
 */
export function resolvePreset(preset, players) {
  if (!preset || !players) return null;
  const playerId = preset.find(players);
  if (!playerId) return null;
  return {
    playerId,
    attributeOverrides: preset.attributeOverrides || null,
    accelerationTier: preset.accelerationTier || null,
    lineLength: preset.lineLength || null,
    variation: preset.variation || null
  };
}
