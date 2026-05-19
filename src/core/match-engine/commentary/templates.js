/**
 * @file templates.js
 * @description Outcome-keyed commentary templates with optional `when` predicates.
 * @module core/match-engine/commentary/templates
 *
 * Each entry: `{ when?: { tagKey: value, ... }, text: string }`
 * - `when` is matched against tags from inferActions.js. All keys must match.
 * - `text` supports ${striker}, ${bowler}, ${runs}, ${fielder}, ${position},
 *   ${zone}, ${rrr}, ${needed}, ${ballsLeft}.
 *
 * Outcomes covered: DOT, RUNS, FOUR, SIX, CAUGHT, CAUGHT_BEHIND, BOWLED, LBW,
 * RUN_OUT, STUMPED, WICKET (catch-all), DEFAULT.
 */

const DOT = [
  { text: '${striker} defends solidly back to ${bowler}.' },
  { text: 'Played and missed — ${bowler} beats the bat.' },
  { text: '${striker} watches it through to the keeper.' },
  { text: "Tight from ${bowler}, ${striker} can't get it away." },
  { text: '${striker} leaves it alone outside off.' },
  { text: 'Dot ball, good length from ${bowler}.' },
  { when: { phase: 'powerplay' }, text: '${striker} respects the new ball, eased back to ${bowler}.' },
  { when: { phase: 'death', chasePressure: 'high' }, text: 'Huge dot ball! ${needed} still needed off ${ballsLeft}.' },
  { when: { phase: 'death' }, text: '${bowler} nails the yorker — no run.' },
  { when: { closeMatch: true }, text: 'Dot ball under pressure — ${needed} off ${ballsLeft} now.' }
];

const RUNS = [
  { when: { runs: 1 }, text: '${striker} works it to ${zone} for a single.' },
  { when: { runs: 1 }, text: 'Pushed into ${zone}, single taken.' },
  { when: { runs: 1 }, text: 'Quick single, ${striker} rotates the strike.' },
  { when: { runs: 1 }, text: 'Nudged to ${zone}, ${striker} jogs through.' },
  { when: { runs: 1, phase: 'death', chasePressure: 'high' }, text: 'Just a single — ${needed} needed off ${ballsLeft}.' },
  { when: { runs: 2 }, text: '${striker} drives into the gap at ${zone} for two.' },
  { when: { runs: 2 }, text: 'Worked square to ${zone}, comfortable two runs.' },
  { when: { runs: 2 }, text: 'Good running, ${striker} picks up a couple to ${zone}.' },
  { when: { runs: 3 }, text: 'Threaded through ${zone} — three runs to ${striker}!' },
  { when: { runs: 3 }, text: '${fielder} cuts it off at ${position}, but three runs come.' },
  { when: { runs: 3 }, text: 'Excellent running between the wickets — three to ${striker}.' },
  // Fallback for runs that don't match above (shouldn't happen, but safe)
  { text: '${striker} picks up ${runs} runs to ${zone}.' }
];

const FOUR = [
  { text: 'FOUR! ${striker} times it sweetly through ${zone}.' },
  { text: '${striker} finds the gap at ${zone} — to the fence!' },
  { text: 'Crashed through ${zone} for four!' },
  { text: 'FOUR! Sweetly struck, races away to ${zone}.' },
  { text: '${striker} threads the field at ${zone} — boundary.' },
  { when: { shotType: 'aerial' }, text: 'FOUR! ${striker} lofts it over the infield, lands safe at ${zone}.' },
  { when: { shotType: 'aerial' }, text: 'In the air — but safe! Four runs through ${zone}.' },
  { when: { phase: 'powerplay' }, text: '${striker} punishes the field restrictions — four through ${zone}!' },
  { when: { phase: 'death' }, text: 'Boundary at the death! ${striker} muscles it through ${zone}.' },
  { when: { phase: 'death', chasePressure: 'high' }, text: 'FOUR! Just what the chase needed — ${needed} off ${ballsLeft} now.' },
  { when: { closeMatch: true }, text: 'HUGE boundary! ${striker} keeps the chase alive — ${needed} needed off ${ballsLeft}!' },
  { when: { chasePressure: 'high' }, text: 'FOUR! ${striker} takes ${bowler} on — ${needed} off ${ballsLeft}.' }
];

const SIX = [
  { text: 'SIX! ${striker} launches it over ${zone}!' },
  { text: 'Maximum! Cleanly struck over ${zone}.' },
  { text: '${striker} goes downtown — six over ${zone}!' },
  { text: 'Smashed into the stands over ${zone}!' },
  { text: 'SIX! That has gone a long way over ${zone}.' },
  { when: { phase: 'powerplay' }, text: '${striker} takes the aerial route early — SIX over ${zone}!' },
  { when: { phase: 'death' }, text: 'SIX! ${striker} clears the rope at the death over ${zone}!' },
  { when: { phase: 'death', chasePressure: 'high' }, text: 'MASSIVE SIX! The chase is on — ${needed} off ${ballsLeft}!' },
  { when: { closeMatch: true }, text: 'SIX! ${striker} keeps it alive — ${needed} needed off ${ballsLeft}!' },
  { when: { chasePressure: 'high' }, text: 'SIX! Huge blow from ${striker} in the chase — ${needed} off ${ballsLeft}.' }
];

const CAUGHT = [
  { text: 'OUT! ${striker} skies it — caught by ${fielder} at ${position}.' },
  { text: 'GONE! ${fielder} takes it at ${position}. ${bowler} strikes.' },
  { text: 'Caught! ${striker} picks out ${fielder} at ${position}.' },
  { text: '${striker} holes out to ${fielder} at ${position}. ${bowler} celebrates.' },
  { when: { fielder: undefined }, text: 'Caught! ${bowler} gets ${striker}.' },
  { when: { phase: 'death' }, text: 'Wicket at the death! ${fielder} pouches it at ${position}.' },
  { when: { phase: 'powerplay' }, text: 'Early wicket! ${striker} caught at ${position} by ${fielder}.' },
  { when: { chasePressure: 'high' }, text: 'Massive wicket! ${striker} caught at ${position} — ${needed} off ${ballsLeft} now.' },
  { when: { closeMatch: true }, text: 'WICKET in the chase! ${fielder} takes it at ${position} — ${needed} off ${ballsLeft}.' }
];

const CAUGHT_BEHIND = [
  { text: 'Caught behind! ${striker} edges it through to the keeper off ${bowler}.' },
  { text: 'Thin edge — and gone! ${striker} caught behind.' },
  { text: '${bowler} draws the edge, the keeper does the rest. ${striker} departs.' },
  { text: 'Nicked off! ${striker} can hardly believe it. ${bowler} gets the wicket.' },
  { when: { chasePressure: 'high' }, text: 'Edge through! ${striker} caught behind — ${needed} off ${ballsLeft} now.' }
];

const BOWLED = [
  { text: 'BOWLED HIM! ${bowler} cleans up ${striker}!' },
  { text: 'Through the gate! ${striker} bowled by ${bowler}.' },
  { text: 'Timber! ${bowler} crashes through the defenses of ${striker}.' },
  { text: '${striker} is bowled — what a delivery from ${bowler}.' },
  { text: 'Stumps everywhere! ${bowler} gets ${striker}.' },
  { when: { phase: 'powerplay' }, text: 'Early breakthrough! ${bowler} bowls ${striker}.' },
  { when: { phase: 'death' }, text: '${bowler} smashes the stumps — ${striker} bowled at the death!' },
  { when: { chasePressure: 'high' }, text: 'BOWLED! ${striker} departs — ${needed} off ${ballsLeft}, huge moment.' }
];

const LBW = [
  { text: 'LBW! ${striker} trapped in front by ${bowler}.' },
  { text: 'Plumb! ${striker} is lbw, ${bowler} celebrates.' },
  { text: 'Big shout — and given! ${striker} lbw to ${bowler}.' },
  { text: '${bowler} traps ${striker} in front. LBW!' },
  { text: 'Up goes the finger! ${striker} lbw, ${bowler} strikes.' },
  { when: { chasePressure: 'high' }, text: 'LBW! Huge wicket in the chase — ${needed} off ${ballsLeft}.' }
];

const RUN_OUT = [
  { text: 'RUN OUT! ${fielder} hits the stumps from ${position}.' },
  { text: 'Disaster in the middle — ${striker} is run out by ${fielder}!' },
  { text: 'Direct hit from ${position}! ${fielder} ends ${striker}\'s innings.' },
  { text: 'Mix-up between the batters — ${striker} run out by ${fielder} at ${position}.' },
  { when: { fielder: undefined }, text: 'RUN OUT! Brilliant fielding ends ${striker}\'s innings.' },
  { when: { chasePressure: 'high' }, text: 'RUN OUT in the chase! Costly mix-up — ${needed} off ${ballsLeft}.' },
  { when: { closeMatch: true }, text: 'RUN OUT! ${fielder} from ${position} — drama at the death!' }
];

const STUMPED = [
  { text: 'STUMPED! ${striker} dragged out of the crease — quick work behind the stumps.' },
  { text: 'Stumped! ${bowler} draws ${striker} forward and the keeper does the rest.' },
  { text: 'Lightning stumping! ${striker} departs.' }
];

const WICKET = [
  { text: 'OUT! ${striker} on his way.' },
  { text: 'Wicket! ${bowler} gets the breakthrough.' },
  { text: '${striker} departs. Big moment for ${bowler}.' }
];

const DEFAULT = [
  { text: '${striker} plays the ball.' }
];

export const TEMPLATES = {
  DOT,
  RUNS,
  FOUR,
  SIX,
  CAUGHT,
  CAUGHT_BEHIND,
  BOWLED,
  LBW,
  RUN_OUT,
  STUMPED,
  WICKET,
  DEFAULT
};
