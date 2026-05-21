// Verify the new contextual modifiers fire correctly per over.

import { readFileSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import contextualManager from '../src/core/tactics/ContextualModifierManager.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = pathResolve(__dirname, '..');

// Make a couple of synthetic players so we can inspect attribute deltas.
function mkBowler(type = 'pace') {
  return {
    id: 'b', name: 'TestBowler', bowlingType: type,
    attributes: {
      bowling: { accuracy: 15, swing: 12, bowlingSpeed: 14, turn: 5 },
      batting: { timing: 5 },
      physical: { speed: 10 },
      mental: { judgement: 10 },
      fielding: { catching: 10 }
    }
  };
}
function mkStriker(hand = 'right') {
  return {
    id: 's', name: 'TestStriker', battingHand: hand,
    attributes: {
      batting: { timing: 12, technique: 12, footwork: 12 },
      bowling: { accuracy: 5 },
      physical: { strength: 14, speed: 10 },
      mental: { judgement: 10 },
      fielding: { catching: 10 }
    }
  };
}
function mkNonStriker(hand = 'right') { return { ...mkStriker(hand), id: 'n', name: 'TestNonStriker' }; }

console.log('Manager info:', JSON.stringify(contextualManager.getInfo(), null, 2));
console.log('');

console.log('=== New Ball Boost (overs 1-6, pace bowler) ===');
console.log('Expected: swing goes 12 → +5/+4/+3/+2/+1/+0 across overs 1-6');
console.log('over | bowler.swing | flags');
for (let over = 1; over <= 7; over++) {
  const result = contextualManager.applyAllContextualModifiers(mkBowler('pace'), mkStriker('right'), mkNonStriker('right'), over);
  console.log(`  ${over.toString().padStart(2)}  |  ${String(result.bowler.attributes.bowling.swing).padStart(4)}  | newBall=${result.flags.newBallActive} oldBall=${result.flags.oldBallActive}`);
}

console.log('');
console.log('=== Old Ball Penalty (overs 17-20, pace bowler) ===');
console.log('Expected: swing goes 12 → 0/-1/-2/-3 (12, 11, 10, 9) across overs 17-20');
console.log('over | bowler.swing | flags');
for (let over = 16; over <= 20; over++) {
  const result = contextualManager.applyAllContextualModifiers(mkBowler('pace'), mkStriker('right'), mkNonStriker('right'), over);
  console.log(`  ${over.toString().padStart(2)}  |  ${String(result.bowler.attributes.bowling.swing).padStart(4)}  | newBall=${result.flags.newBallActive} oldBall=${result.flags.oldBallActive}`);
}

console.log('');
console.log('=== Death Overs Batter Power (overs 17-20, striker) ===');
console.log('Expected: striker.strength goes 14 → 14/15/16/17 across overs 17-20');
console.log('over | striker.strength | flags');
for (let over = 16; over <= 20; over++) {
  const result = contextualManager.applyAllContextualModifiers(mkBowler('pace'), mkStriker('right'), mkNonStriker('right'), over);
  console.log(`  ${over.toString().padStart(2)}  |  ${String(result.striker.attributes.physical.strength).padStart(4)}  | deathPower=${result.flags.deathPowerActive}`);
}

console.log('');
console.log('=== Spin bowler — should NOT get new-ball or old-ball swing changes ===');
for (const over of [1, 4, 18, 20]) {
  const result = contextualManager.applyAllContextualModifiers(mkBowler('spin'), mkStriker('right'), mkNonStriker('right'), over);
  console.log(`  over ${over}: spin bowler.swing = ${result.bowler.attributes.bowling.swing}  (should be 12 unchanged)  flags ${JSON.stringify(result.flags)}`);
}

console.log('');
console.log('=== Left-Right Partnership (always −2 accuracy when LH + RH at crease) ===');
for (const [s, n] of [['right','right'], ['left','right'], ['right','left'], ['left','left']]) {
  const result = contextualManager.applyAllContextualModifiers(mkBowler('pace'), mkStriker(s), mkNonStriker(n), 10);
  console.log(`  striker=${s.padEnd(5)} nonstriker=${n.padEnd(5)}  bowler.accuracy=${result.bowler.attributes.bowling.accuracy}  leftRight=${result.flags.leftRightActive}`);
}

console.log('');
console.log('=== Combined at over 20 (pace, mixed-hand partnership) ===');
const r = contextualManager.applyAllContextualModifiers(mkBowler('pace'), mkStriker('left'), mkNonStriker('right'), 20);
console.log(`  bowler.accuracy: 15 → ${r.bowler.attributes.bowling.accuracy}  (expected 13: −2 for left-right)`);
console.log(`  bowler.swing:    12 → ${r.bowler.attributes.bowling.swing}  (expected 9: −3 for old ball)`);
console.log(`  striker.strength: 14 → ${r.striker.attributes.physical.strength}  (expected 17: +3 for death overs)`);
console.log(`  flags: ${JSON.stringify(r.flags)}`);

console.log('');
console.log('=== ALL GREEN ===');
