/**
 * @file aiTacticsTest.js
 * @description Test script for AI Tactics Manager - Playing XI selection and tactics generation
 *
 * Displays output in the same order as the 5-stage tactics pipeline:
 *   Stage 1: Playing XI Selection (greedy + refinement)
 *   Stage 2: Playstyle Revision + C/VC/WK Assignment
 *   Stage 3: Batting Order + Acceleration Tiers
 *   Stage 4: Bowling Over Assignment + Plans
 *   Stage 5: Field Setup
 *
 * Usage: node src/test/aiTacticsTest.js
 */

import aiTacticsManager from '../core/ai/AITacticsManager.js';
import fs from 'fs';

// Load player database
const playerDatabase = JSON.parse(fs.readFileSync('src/data/players/master_player_database.json', 'utf8'));

// Test squad - player names to pull from database
const TEST_SQUAD_NAMES = [
  'Ashutosh Sharma',
  'Evin Lewis',
  'Finn Allen',
  'Gerhard Erasmus',
  'Harshit Kaushik',
  'Ish Sodhi',
  'Josh Hazlewood',
  'Kagiso Rabada',
  'Mark Chapman',
  'Nitish Kumar Reddy',
  'Nurul Hasan',
  'Pat Cummins',
  'Richie Berrington',
  'Ruben Trumpelmann',
  'Saim Ayub',
  'Saiteja Mukkamalla',
  'Shakeel Ahmed',
  'Suryakumar Yadav',
  'Tanzim Hasan Sakib',
  'Travis Head',
  'Tristan Stubbs',
  'Virat Kohli',
  'Wessly Madhevere'
];

/**
 * Load squad from player database by name
 */
function loadSquadFromDatabase(playerNames) {
  const squad = [];
  const notFound = [];

  for (const name of playerNames) {
    const player = playerDatabase.players.find(p =>
      p.name.toLowerCase() === name.toLowerCase() ||
      p.fullName?.toLowerCase() === name.toLowerCase()
    );

    if (player) {
      squad.push(player);
    } else {
      notFound.push(name);
    }
  }

  if (notFound.length > 0) {
    console.warn(`[Warning] Players not found in database: ${notFound.join(', ')}`);
  }

  return squad;
}

/**
 * Get highest playstyle rating and name for a type
 */
function getTopPlaystyle(player, type) {
  const ratings = player.playstyleRatings?.[type];
  if (!ratings || Object.keys(ratings).length === 0) {
    return { name: '-', rating: 0 };
  }

  let topName = '-';
  let topRating = 0;

  for (const [name, rating] of Object.entries(ratings)) {
    if (rating > topRating) {
      topRating = rating;
      topName = name;
    }
  }

  return { name: topName, rating: topRating };
}

/**
 * Format player for display
 */
function formatPlayer(player, index) {
  const topBatting = getTopPlaystyle(player, 'batting');
  const topBowling = getTopPlaystyle(player, 'bowling');
  const fitness = player.condition?.fitness ?? 100;

  const battingStr = topBatting.rating > 0 ? topBatting.name : '-';
  const battingRatingStr = topBatting.rating > 0 ? topBatting.rating.toFixed(1) : '-';
  const bowlingStr = topBowling.rating > 0 ? topBowling.name : '-';
  const bowlingRatingStr = topBowling.rating > 0 ? topBowling.rating.toFixed(1) : '-';

  return `${String(index + 1).padStart(2)}. ${player.name.padEnd(22)} | ${player.role.padEnd(14)} | Bat: ${battingStr.padEnd(24)} (${battingRatingStr.padStart(5)}) | Bowl: ${bowlingStr.padEnd(20)} (${bowlingRatingStr.padStart(5)}) | Fit: ${fitness}`;
}

/**
 * Display score table header
 */
function printScoreHeader(includeRank = true, includeDiff = false) {
  const cols = [];
  if (includeRank) cols.push('Rank');
  cols.push('Player'.padEnd(22), 'Role'.padEnd(12), 'PrimRat'.padStart(7), 'Base'.padStart(6), 'FitScr'.padStart(7), 'RolePen'.padStart(7), 'FitPen'.padStart(7), 'TOTAL'.padStart(7));
  if (includeDiff) cols.push('Diff'.padStart(8));
  console.log(cols.join(' | '));
  console.log('-'.repeat(includeDiff ? 130 : 120));
}

/**
 * Format score row
 */
function formatScoreRow(player, breakdown, rank = null, diff = null, marker = '') {
  const cols = [];
  if (rank !== null) cols.push(String(rank).padStart(4));
  cols.push(
    player.name.padEnd(22),
    player.role.padEnd(12),
    breakdown.primaryRating.toFixed(1).padStart(7),
    breakdown.baseScore.toFixed(1).padStart(6),
    breakdown.playstyleFitScore.toFixed(1).padStart(7),
    breakdown.roleGapPenalty.toFixed(1).padStart(7),
    breakdown.fitnessPenalty.toFixed(1).padStart(7),
    breakdown.totalScore.toFixed(1).padStart(7)
  );
  if (diff !== null) {
    const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
    cols.push(diffStr.padStart(8));
  }
  return cols.join(' | ') + marker;
}

/**
 * Main test function
 */
function runTest() {
  console.log('='.repeat(140));
  console.log('AI TACTICS MANAGER TEST - 5-Stage Pipeline');
  console.log('='.repeat(140));
  console.log();

  // Load squad from database
  console.log('Loading squad from database...');
  const squad = loadSquadFromDatabase(TEST_SQUAD_NAMES);
  console.log(`Loaded ${squad.length} players\n`);

  // Display full squad
  console.log('-'.repeat(140));
  console.log('FULL SQUAD');
  console.log('-'.repeat(140));
  squad.forEach((p, i) => console.log(formatPlayer(p, i)));

  // Generate tactics (this runs all 5 stages internally)
  console.log('\n' + '='.repeat(140));
  console.log('GENERATING TACTICS...');
  console.log('='.repeat(140));

  const tactics = aiTacticsManager.generateTactics('test-team', squad, null);

  if (!tactics) {
    console.error('Failed to generate tactics!');
    return;
  }

  // ====================================================================================
  // STAGE 1: PLAYING XI SELECTION
  // ====================================================================================
  console.log('\n' + '█'.repeat(140));
  console.log('STAGE 1: PLAYING XI SELECTION');
  console.log('█'.repeat(140));
  console.log(`Weights: Primary Rating = ${(aiTacticsManager.config.squadSelection.weights.primaryRoleRating * 100).toFixed(0)}%, Playstyle Fit = ${(aiTacticsManager.config.squadSelection.weights.playstyleFit * 100).toFixed(0)}%`);
  console.log(`Max Refinement Iterations: ${aiTacticsManager.config.squadSelection.refinementIterations || 5}`);

  // Simulate the selection process to show iterations
  const availablePlayers = squad.filter(p => !p.condition?.injury);
  const maxIterations = aiTacticsManager.config.squadSelection.refinementIterations || 5;

  // --- Stage 1a: Greedy Selection ---
  console.log('\n' + '-'.repeat(140));
  console.log('STAGE 1a: GREEDY SELECTION');
  console.log('-'.repeat(140));

  let currentXI = [];
  let currentRemaining = [...availablePlayers];

  while (currentXI.length < 11 && currentRemaining.length > 0) {
    const scoredPlayers = currentRemaining.map(player => {
      const breakdown = aiTacticsManager.getPlayerScoreBreakdown(player, currentXI);
      return { player, breakdown };
    });
    scoredPlayers.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);
    const best = scoredPlayers[0];
    currentXI.push(best.player);
    currentRemaining.splice(currentRemaining.indexOf(best.player), 1);
  }

  console.log('Initial XI (Greedy Selection Result):');
  currentXI.forEach((p, i) => console.log(`${String(i + 1).padStart(2)}. ${p.name.padEnd(22)} | ${p.role}`));

  // --- Stage 1b: Refinement Iterations ---
  console.log('\n' + '-'.repeat(140));
  console.log('STAGE 1b: REFINEMENT ITERATIONS');
  console.log('-'.repeat(140));

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log('\n' + '#'.repeat(140));
    console.log(`ITERATION ${iteration + 1}`);
    console.log('#'.repeat(140));

    // STEP 1: Score all XI players against other 10 (excluding self)
    console.log('\nSTEP 1: Score XI Players (each against other 10)');
    console.log('-'.repeat(120));
    printScoreHeader(true, false);

    const xiScores = currentXI.map((player, idx) => {
      const othersInXI = currentXI.filter((_, j) => j !== idx);
      const breakdown = aiTacticsManager.getPlayerScoreBreakdown(player, othersInXI);
      return { player, breakdown, index: idx };
    });

    // Sort by score ascending (worst first)
    xiScores.sort((a, b) => a.breakdown.totalScore - b.breakdown.totalScore);

    xiScores.forEach(({ player, breakdown }, rank) => {
      const marker = rank === 0 ? ' ← WORST' : '';
      console.log(formatScoreRow(player, breakdown, rank + 1, null, marker));
    });

    // STEP 2 & 3: Try replacing each XI player starting from worst
    let swapMade = false;

    for (let candidateRank = 0; candidateRank < xiScores.length; candidateRank++) {
      const candidate = xiScores[candidateRank];

      console.log('\n' + '-'.repeat(120));
      console.log(`STEP 2.${candidateRank + 1}: Evaluate replacing "${candidate.player.name}" (Rank ${candidateRank + 1}, Score: ${candidate.breakdown.totalScore.toFixed(1)})`);
      console.log('-'.repeat(120));

      // Create baseline: XI minus this candidate (10 players)
      const baseline = currentXI.filter((_, j) => j !== candidate.index);

      // Score all unselected against this baseline
      const unselectedScores = currentRemaining.map(player => {
        const breakdown = aiTacticsManager.getPlayerScoreBreakdown(player, baseline);
        return { player, breakdown };
      });

      // Sort by score descending (best first)
      unselectedScores.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

      printScoreHeader(true, true);

      unselectedScores.forEach(({ player, breakdown }, rank) => {
        const diff = breakdown.totalScore - candidate.breakdown.totalScore;
        const marker = rank === 0 ? (diff > 0 ? ' ← SWAP!' : ' ← BEST') : '';
        console.log(formatScoreRow(player, breakdown, rank + 1, diff, marker));
      });

      const bestUnselected = unselectedScores[0];
      if (bestUnselected && bestUnselected.breakdown.totalScore > candidate.breakdown.totalScore) {
        // Swap found!
        console.log(`\n>>> SWAP: ${candidate.player.name} (${candidate.breakdown.totalScore.toFixed(1)}) OUT → ${bestUnselected.player.name} (${bestUnselected.breakdown.totalScore.toFixed(1)}) IN <<<`);

        // Perform the swap
        currentXI[candidate.index] = bestUnselected.player;
        currentRemaining.splice(currentRemaining.indexOf(bestUnselected.player), 1);
        currentRemaining.push(candidate.player);

        swapMade = true;
        break;
      } else {
        console.log(`\nNo swap possible for ${candidate.player.name} - trying next worst...`);
      }
    }

    if (!swapMade) {
      console.log('\n' + '!'.repeat(80));
      console.log('NO SWAPS FOUND - REFINEMENT COMPLETE');
      console.log('!'.repeat(80));
      break;
    }

    // Show updated XI after swap
    console.log('\n' + '-'.repeat(120));
    console.log(`XI After Iteration ${iteration + 1}:`);
    console.log('-'.repeat(120));
    currentXI.forEach((p, i) => console.log(`${String(i + 1).padStart(2)}. ${p.name.padEnd(22)} | ${p.role}`));
  }

  // --- Stage 1 Final Result ---
  console.log('\n' + '='.repeat(140));
  console.log('STAGE 1 RESULT: FINAL PLAYING XI');
  console.log('='.repeat(140));

  const finalXI = tactics.squadSelection.map(id => squad.find(p => p.id === id));

  printScoreHeader(false, false);

  const finalScores = finalXI.map((player) => {
    const othersInXI = finalXI.filter(p => p.id !== player.id);
    const breakdown = aiTacticsManager.getPlayerScoreBreakdown(player, othersInXI);
    return { player, breakdown };
  });

  // Sort by total score descending for display
  finalScores.sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);

  finalScores.forEach(({ player, breakdown }) => {
    console.log(formatScoreRow(player, breakdown));
  });

  // ====================================================================================
  // STAGE 2: PLAYSTYLE REVISION + C/VC/WK ASSIGNMENT
  // ====================================================================================
  console.log('\n' + '█'.repeat(140));
  console.log('STAGE 2: PLAYSTYLE REVISION + C/VC/WK ASSIGNMENT');
  console.log('█'.repeat(140));

  const captain = squad.find(p => p.id === tactics.captain);
  const viceCaptain = squad.find(p => p.id === tactics.viceCaptain);
  const wicketKeeper = squad.find(p => p.id === tactics.wicketKeeper);

  console.log(`\nCaptain:       ${captain?.name || 'None'}`);
  console.log(`Vice-Captain:  ${viceCaptain?.name || 'None'}`);
  console.log(`Wicket-Keeper: ${wicketKeeper?.name || 'None'}`);

  // Playstyle Overrides
  if (Object.keys(tactics.playstyleOverrides).length > 0) {
    console.log('\nPlaystyle Overrides:');
    console.log('-'.repeat(60));
    for (const [playerId, overrides] of Object.entries(tactics.playstyleOverrides)) {
      const player = squad.find(p => p.id === playerId);
      console.log(`  ${player?.name}: ${JSON.stringify(overrides)}`);
    }
  } else {
    console.log('\nNo playstyle overrides.');
  }

  // ====================================================================================
  // STAGE 3: BATTING ORDER + ACCELERATION TIERS
  // ====================================================================================
  console.log('\n' + '█'.repeat(140));
  console.log('STAGE 3: BATTING ORDER + ACCELERATION TIERS');
  console.log('█'.repeat(140));

  const battingOrder = tactics.battingOrder.map(id => squad.find(p => p.id === id));

  console.log('\n' + ['#'.padStart(3), 'Player'.padEnd(22), 'Role'.padEnd(14), 'Batting Playstyle'.padEnd(26), 'Accel Tier'].join(' | '));
  console.log('-'.repeat(100));

  battingOrder.forEach((p, i) => {
    const accelTier = tactics.accelerationTiers[p.id] || '-';
    const topBatting = getTopPlaystyle(p, 'batting');
    console.log([
      String(i + 1).padStart(3),
      p.name.padEnd(22),
      p.role.padEnd(14),
      (topBatting.name + ` (${topBatting.rating.toFixed(0)})`).padEnd(26),
      accelTier
    ].join(' | '));
  });

  // ====================================================================================
  // STAGE 4: BOWLING OVER ASSIGNMENT + PLANS
  // ====================================================================================
  console.log('\n' + '█'.repeat(140));
  console.log('STAGE 4: BOWLING OVER ASSIGNMENT + PLANS');
  console.log('█'.repeat(140));

  // Count overs per bowler
  const oversPerBowler = {};
  const powerplayOvers = {};
  const middleOvers = {};
  const deathOvers = {};

  for (const [over, playerId] of Object.entries(tactics.overAssignments)) {
    const overNum = parseInt(over);
    oversPerBowler[playerId] = (oversPerBowler[playerId] || 0) + 1;

    if (overNum <= 6) {
      powerplayOvers[playerId] = (powerplayOvers[playerId] || 0) + 1;
    } else if (overNum <= 15) {
      middleOvers[playerId] = (middleOvers[playerId] || 0) + 1;
    } else {
      deathOvers[playerId] = (deathOvers[playerId] || 0) + 1;
    }
  }

  console.log('\nBowling Rotation:');
  console.log('-'.repeat(120));
  console.log(['#'.padStart(3), 'Bowler'.padEnd(22), 'Bowling Playstyle'.padEnd(22), 'Overs'.padStart(5), 'PP'.padStart(3), 'Mid'.padStart(4), 'Death'.padStart(5), 'Plan'].join(' | '));
  console.log('-'.repeat(120));

  tactics.bowlingRotation.forEach((id, i) => {
    const bowler = squad.find(p => p.id === id);
    const totalOvers = oversPerBowler[id] || 0;
    const pp = powerplayOvers[id] || 0;
    const mid = middleOvers[id] || 0;
    const death = deathOvers[id] || 0;

    const plan = tactics.bowlingPlans[id];
    const planStr = plan ? `${plan.lineLength} / ${plan.variation}` : '-';
    const topBowling = getTopPlaystyle(bowler, 'bowling');

    console.log([
      String(i + 1).padStart(3),
      bowler?.name.padEnd(22),
      (topBowling.name + ` (${topBowling.rating.toFixed(0)})`).padEnd(22),
      String(totalOvers).padStart(5),
      String(pp).padStart(3),
      String(mid).padStart(4),
      String(death).padStart(5),
      planStr
    ].join(' | '));
  });

  // Over-by-over assignment
  console.log('\nOver-by-Over Assignment:');
  console.log('-'.repeat(80));
  const oversList = Object.entries(tactics.overAssignments)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  let currentPhase = '';
  for (const [over, playerId] of oversList) {
    const overNum = parseInt(over);
    let phase = '';
    if (overNum <= 6) phase = 'Powerplay';
    else if (overNum <= 15) phase = 'Middle';
    else phase = 'Death';

    if (phase !== currentPhase) {
      console.log(`\n  [${phase}]`);
      currentPhase = phase;
    }

    const bowler = squad.find(p => p.id === playerId);
    console.log(`    Over ${String(overNum).padStart(2)}: ${bowler?.name}`);
  }

  // ====================================================================================
  // STAGE 5: FIELD SETUP
  // ====================================================================================
  console.log('\n' + '█'.repeat(140));
  console.log('STAGE 5: FIELD SETUP');
  console.log('█'.repeat(140));

  console.log(`\nField Formation: ${tactics.fieldFormation}`);

  // ====================================================================================
  // DEBUG: DETAILED SCORE BREAKDOWN
  // ====================================================================================
  console.log('\n' + '█'.repeat(140));
  console.log('DEBUG: DETAILED FIT SCORE BREAKDOWN FOR FINAL XI');
  console.log('█'.repeat(140));

  finalXI.forEach((player, idx) => {
    const othersInXI = finalXI.filter(p => p.id !== player.id);
    const debugBreakdown = aiTacticsManager.getPlayerScoreBreakdown(player, othersInXI, true);

    console.log(`\n${idx + 1}. ${player.name} (${player.role})`);
    console.log(`   Primary Playstyle - Batting: ${player.primaryPlaystyle?.batting || 'null'} | Bowling: ${player.primaryPlaystyle?.bowling || 'null'}`);

    if (debugBreakdown.fitDebug?.batting) {
      const b = debugBreakdown.fitDebug.batting;
      const contributors = b.contributors.length > 0
        ? b.contributors.map(c => `${c.name.split(' ').pop()}(${c.rating.toFixed(0)})`).join(', ')
        : 'none';
      console.log(`   BATTING: ${b.playstyle} | Rating: ${b.playerRating.toFixed(1)} | Cat: ${b.category} (cap:${b.cap}/req:${b.requiredCount})`);
      console.log(`            Others: [${contributors}] = ${b.otherPlayersSum.toFixed(1)} | Sum: ${b.currentSum.toFixed(1)} | FitScore: ${b.fitScore.toFixed(2)}`);
    } else {
      console.log(`   BATTING: No primary batting playstyle`);
    }

    if (debugBreakdown.fitDebug?.bowling) {
      const b = debugBreakdown.fitDebug.bowling;
      const contributors = b.contributors.length > 0
        ? b.contributors.map(c => `${c.name.split(' ').pop()}(${c.rating.toFixed(0)})`).join(', ')
        : 'none';
      console.log(`   BOWLING: ${b.playstyle} | Rating: ${b.playerRating.toFixed(1)} | Matched: [${b.allMatchingCategories}]`);
      console.log(`            Selected: ${b.category} (cap:${b.cap}/req:${b.requiredCount}/fill:${b.fillPercentage})`);
      console.log(`            Others: [${contributors}] = ${b.otherPlayersSum.toFixed(1)} | Sum: ${b.currentSum.toFixed(1)} | FitScore: ${b.fitScore.toFixed(2)}`);
    } else {
      console.log(`   BOWLING: Not a bowler or no primary bowling playstyle`);
    }

    if (debugBreakdown.fitDebug?.fielding) {
      const f = debugBreakdown.fitDebug.fielding;
      const otherKeepers = f.otherKeepers?.length > 0
        ? f.otherKeepers.map(c => `${c.name.split(' ').pop()}(${c.rating.toFixed(0)})`).join(', ')
        : 'none';
      console.log(`   FIELDING: ${f.playstyle} | Rating: ${f.playerRating.toFixed(1)} | Highest: ${f.isHighestRated}`);
      console.log(`             Other Keepers: [${otherKeepers}] | Formula: ${f.formula} | FitScore: ${f.fitScore.toFixed(2)}`);
    }

    console.log(`   TOTAL FitRaw: ${debugBreakdown.playstyleFitRaw.toFixed(2)} | FitScore (×50%): ${debugBreakdown.playstyleFitScore.toFixed(2)} | TOTAL: ${debugBreakdown.totalScore.toFixed(2)}`);
  });

  console.log('\n' + '='.repeat(140));
  console.log('TEST COMPLETE');
  console.log('='.repeat(140));
}

// Run test
runTest();
