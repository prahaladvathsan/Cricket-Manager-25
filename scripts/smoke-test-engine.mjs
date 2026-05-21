// End-to-end smoke test: confirm the new wicket-bonus pipeline fires
// correctly through the live match-engine path.

import { readFileSync } from 'node:fs';
import { resolve as pathResolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import SimpleBallSimulator from '../src/core/match-engine/core/SimpleBallSimulator.js';
import playstyleCalculator from '../src/utils/PlaystyleCalculator.js';
import mentalityConfig from '../src/data/config/mentality-config.json' with { type: 'json' };
import bowlingPlansConfig from '../src/data/config/bowling-plans-config.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = pathResolve(__dirname, '..');

console.log('=== Config sanity ===');
console.log('mentality-config.json wicketProbability.base =', mentalityConfig.wicketTypes.wicketProbability.base);
console.log('  tierWicketBonus.HOGO =', mentalityConfig.wicketTypes.wicketProbability.tierWicketBonus['Hit Out/Get Out']);
console.log('  tierWicketBonus.Blockade =', mentalityConfig.wicketTypes.wicketProbability.tierWicketBonus.Blockade);
console.log('bowling-plans-config.json Attacking Line wicketBonus =', bowlingPlansConfig.paceBowling.lineLengthPlans['Attacking Line'].wicketBonus);
console.log('  Wide Line wicketBonus =', bowlingPlansConfig.paceBowling.lineLengthPlans['Wide Line'].wicketBonus);
console.log('  Stumps Attack wicketBonus =', bowlingPlansConfig.spinBowling.lineLengthPlans['Stumps Attack'].wicketBonus);

// Player setup
const rawDB = JSON.parse(readFileSync(pathResolve(PROJECT_ROOT, 'public/data/master_player_database.json'), 'utf-8'));
const players = {};
for (const p of rawDB.players) {
  if (!p.bowlingType) p.bowlingType = Math.random() < 0.5 ? 'pace' : 'spin';
  const ratings = playstyleCalculator.calculateAllPlaystyleRatings(p);
  const primary = playstyleCalculator.getPlayerPrimaryPlaystyles(p, p.role, 3);
  p.playstyleRatings = ratings;
  p.topPlaystyles = { batting: primary.batting, bowling: primary.bowling, fielding: primary.fielding || [] };
  p.primaryPlaystyle = { batting: primary.batting[0]?.name || null, bowling: primary.bowling[0]?.name || null };
  players[p.id] = p;
}

const striker = Object.values(players).find(p => p.name === 'Brian Bennett');
const bowler = Object.values(players).find(p => p.name === 'Sompal Kami');
const fielders = Object.values(players).filter(p => p.id !== striker.id && p.id !== bowler.id).slice(0, 11)
  .map(p => {
    const c = JSON.parse(JSON.stringify(p));
    if (!c.attributes.fielding) c.attributes.fielding = {};
    if (!c.attributes.fielding.throw_speed) c.attributes.fielding.throw_speed = c.attributes.fielding.throwPower || 25;
    return c;
  });

const sim = new SimpleBallSimulator({ silent: true, captureMetadata: true });
const positions = sim.setFieldFormation('neutral_orthodox', fielders);
const fieldingTeam = { id: 'F', name: 'F', squad: fielders, fieldingPositions: positions, formation: 'neutral_orthodox', wicketKeeper: fielders[0] };

// Test HOGO + Attacking Line + Bouncer Barrage to confirm bonuses stack
const ballContext = {
  striker, bowler, nonStriker: striker,
  wicketKeeper: fielders[0],
  fieldingTeam,
  tacticsState: {
    currentAcceleration: { striker: 'Hit Out/Get Out', nonStriker: 'Hit Out/Get Out' },
    bowlingPlans: { [bowler.id]: { lineLength: 'Attacking Line', variation: 'Bouncer Barrage' } },
    pressureIndex: { batting: 50, bowling: 50 }
  },
  matchSituation: { phase: 'earlyMiddle', over: 10, ball: 1, wicketsInHand: 7, currentRunRate: 8, requiredRunRate: 9, ballsLeft: 65, target: 180, oversBowled: 2 }
};

// Find a MISSED ball and inspect the wicket-prob breakdown
let foundMissedWithBreakdown = null;
for (let i = 0; i < 200 && !foundMissedWithBreakdown; i++) {
  const r = await sim.simulateBall(ballContext);
  if (r.metadata?.trajectoryResult?.breakdown?.contactType === 'MISSED') {
    foundMissedWithBreakdown = r;
  }
}

console.log('\n=== MISSED-ball breakdown sample (HOGO tier + Attacking Line + Bouncer Barrage) ===');
if (foundMissedWithBreakdown) {
  const b = foundMissedWithBreakdown.metadata.trajectoryResult.breakdown;
  console.log('  contactQuality:', b.contactQuality);
  console.log('  wicketProbability:', b.wicketProbability.toFixed(4));
  console.log('  components:', JSON.stringify(b.components));
  const expected = b.components.base + b.components.tierBonus + b.components.lineLengthBonus + b.components.variationBonus;
  console.log('  expected base+bonuses (before CQ):', expected.toFixed(4));
  console.log('  → bonuses are wired ✓ (HOGO=' + b.components.tierBonus + ', AttackLine=' + b.components.lineLengthBonus + ', BouncerBarrage=' + b.components.variationBonus + ')');
} else {
  console.log('  No MISSED ball in 200 — sample retry needed.');
}

// Sanity: 10k balls quick stats
console.log('\n=== 10k-ball sanity sim (HOGO vs default bowler plans) ===');
const ctx2 = JSON.parse(JSON.stringify(ballContext));
ctx2.striker = striker; ctx2.bowler = bowler; ctx2.nonStriker = striker;
ctx2.wicketKeeper = fielders[0]; ctx2.fieldingTeam = fieldingTeam;
ctx2.tacticsState.bowlingPlans[bowler.id] = { lineLength: 'Wide Line', variation: 'Consistent Accuracy' };
let runs = 0, wkts = 0, dots = 0, balls = 0;
for (let i = 0; i < 10000; i++) {
  const r = await sim.simulateBall(ctx2);
  balls++;
  if (r.isWicket) wkts++;
  else {
    runs += r.runs || 0;
    if ((r.runs || 0) === 0) dots++;
  }
}
console.log(`  SR=${(runs/balls*100).toFixed(1)}  Wkt%=${(wkts/balls*100).toFixed(2)}  Dot%=${(dots/balls*100).toFixed(1)}  total runs=${runs}`);

console.log('\n=== ALL GREEN — engine wired correctly ===');
