/**
 * Comprehensive test of 2D fielding simulation system
 */

import fs from 'fs';
import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js';

console.log('🏏 2D Fielding Simulation Test');
console.log('==============================\n');

try {
  // Load player data
  const playerData = JSON.parse(fs.readFileSync('src/data/players/processed/player_database_from_excel.json', 'utf8'));
  console.log(`✅ Loaded ${playerData.length} players`);

  // Get sample players
  const striker = playerData.find(p => p.name === 'Sai Sudharsan');
  const nonStriker = playerData.find(p => p.name === 'Dewald Brevis');
  const bowler = playerData.find(p => p.name === 'Cameron Green');
  const fielders = playerData.slice(10, 19); // Get 9 fielders

  console.log(`\n🏏 Test Setup:`);
  console.log(`   Striker: ${striker.name} (Range360: ${striker.attributes.batting.range360}, Placement: ${striker.attributes.batting.placement})`);
  console.log(`   Non-Striker: ${nonStriker.name}`);
  console.log(`   Bowler: ${bowler.name}`);
  console.log(`   Fielders: ${fielders.length} players\n`);

  // Initialize simulator
  const simulator = new SimpleBallSimulator();
  console.log('✅ SimpleBallSimulator with 2D simulation initialized\n');

  // Display simulator info
  console.log('📊 Simulator Information:');
  console.log(JSON.stringify(simulator.getInfo(), null, 2));
  console.log('');

  // Set field formation
  console.log('📍 Setting Field Formation:');
  const fieldingPositions = simulator.setFieldFormation('neutral', fielders);
  console.log(`   Formation: neutral`);
  console.log(`   Positioned fielders: ${fieldingPositions.length}`);
  fieldingPositions.slice(0, 3).forEach((pos, i) => {
    console.log(`   ${i+1}. ${pos.name} at (${pos.x}, ${pos.y}) - ${pos.fielder.name}`);
  });
  console.log('   ...\n');

  // Create fielding team object
  const fieldingTeam = {
    squad: fielders,
    fieldingPositions: fieldingPositions
  };

  // Test multiple ball simulations
  console.log('🎯 Ball Simulation Tests:');
  console.log('=========================\n');

  for (let test = 1; test <= 5; test++) {
    console.log(`Test ${test}:`);
    console.log('--------');

    const ballContext = {
      striker,
      nonStriker,
      bowler,
      fieldingTeam,
      wicketKeeper: fielders[0],
      battingMentality: test <= 2 ? 'attacking' : test <= 4 ? 'neutral' : 'defensive',
      bowlingMentality: 'neutral'
    };

    const result = await simulator.simulateBall(ballContext);

    console.log(`   Outcome: ${result.outcome}`);
    console.log(`   Runs: ${result.runs}`);
    console.log(`   Wicket: ${result.isWicket ? 'Yes' : 'No'}`);
    console.log(`   Commentary: "${result.commentary}"`);

    // Show detailed breakdown if available
    if (result.metadata?.trajectoryResult) {
      const trajectory = result.metadata.trajectoryResult;
      console.log(`   Shot Type: ${trajectory.shotType}`);
      console.log(`   Shot Speed: ${trajectory.shotSpeed}`);
      console.log(`   Direction: ${trajectory.direction}°`);

      if (trajectory.breakdown?.directionSelection) {
        const direction = trajectory.breakdown.directionSelection;
        console.log(`   Range360: ${direction.range360} (${direction.numDirections} options)`);
        console.log(`   Placement: ${direction.placement} (used ${direction.usedBestDirection ? 'best' : '2nd best'})`);
      }
    }

    // Show fielding details if available
    if (result.metadata?.fieldingResult) {
      const fielding = result.metadata.fieldingResult;
      console.log(`   Fielding Action: ${fielding.fieldingAction?.type}`);
      if (fielding.fieldingAction?.fielder) {
        console.log(`   Fielder: ${fielding.fieldingAction.fielder.name}`);
      }
      if (fielding.runningDecision) {
        const running = fielding.runningDecision;
        console.log(`   Runs Attempted: ${running.runsAttempted} (Max Safe: ${running.maxSafeRuns})`);
        console.log(`   Run Out: ${running.isRunOut ? 'Yes' : 'No'}`);
      }
    }

    console.log('');
  }

  // Test specific scenarios
  console.log('🔬 Specific Scenario Tests:');
  console.log('============================\n');

  // Test 1: High range360 player
  console.log('Test A: High Range360 Player Direction Options');
  const highRange360Player = playerData.find(p => p.attributes.batting.range360 >= 18) || striker;
  console.log(`   Player: ${highRange360Player.name} (Range360: ${highRange360Player.attributes.batting.range360})`);

  const testContext = {
    striker: highRange360Player,
    nonStriker,
    bowler,
    fieldingTeam,
    wicketKeeper: fielders[0],
    battingMentality: 'attacking',
    bowlingMentality: 'neutral'
  };

  for (let i = 0; i < 3; i++) {
    const result = await simulator.simulateBall(testContext);
    const trajectory = result.metadata?.trajectoryResult;
    if (trajectory?.breakdown?.directionSelection) {
      const direction = trajectory.breakdown.directionSelection;
      console.log(`   Run ${i+1}: ${direction.numDirections} options, chose direction ${trajectory.direction}°`);
    }
  }
  console.log('');

  // Test 2: Field formation impact
  console.log('Test B: Field Formation Impact');

  // Test attacking formation
  const attackingPositions = simulator.setFieldFormation('attacking', fielders);
  fieldingTeam.fieldingPositions = attackingPositions;

  console.log('   Attacking Formation:');
  const attackingResult = await simulator.simulateBall(testContext);
  console.log(`   Result: ${attackingResult.outcome} - ${attackingResult.runs} runs`);

  // Test defensive formation
  const defensivePositions = simulator.setFieldFormation('defensive', fielders);
  fieldingTeam.fieldingPositions = defensivePositions;

  console.log('   Defensive Formation:');
  const defensiveResult = await simulator.simulateBall(testContext);
  console.log(`   Result: ${defensiveResult.outcome} - ${defensiveResult.runs} runs`);
  console.log('');

  // Performance test
  console.log('⚡ Performance Test:');
  console.log('===================\n');

  fieldingTeam.fieldingPositions = simulator.setFieldFormation('neutral', fielders);

  const startTime = Date.now();
  const numTests = 100;

  for (let i = 0; i < numTests; i++) {
    await simulator.simulateBall(testContext);
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / numTests;

  console.log(`   Simulated ${numTests} balls in ${totalTime}ms`);
  console.log(`   Average time per ball: ${avgTime.toFixed(2)}ms`);
  console.log(`   Balls per second: ${(1000 / avgTime).toFixed(0)}`);

  console.log('\n✅ 2D Simulation Test Complete!');

} catch (error) {
  console.error('❌ Test failed:', error);
  console.error('Stack trace:', error.stack);
}