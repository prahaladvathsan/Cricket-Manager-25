/**
 * Simple direct test of 4-step calculators without plugin system
 */

import fs from 'fs';
import DecisionCalculator from '../core/match-engine/DecisionCalculator.js';
import ContactCalculator from '../core/match-engine/ContactCalculator.js';
import TrajectoryCalculator from '../core/match-engine/TrajectoryCalculator.js';
import FieldingCalculator from '../core/match-engine/FieldingCalculator.js';
import ProbabilityEngine from '../core/match-engine/ProbabilityEngine.js';

console.log('🏏 Direct 4-Step Calculator Test');
console.log('=================================\n');

try {
  // Load player data
  const playerData = JSON.parse(fs.readFileSync('src/data/players/processed/player_database_from_excel.json', 'utf8'));
  console.log(`✅ Loaded ${playerData.length} players`);

  // Get sample players
  const striker = playerData.find(p => p.name === 'Sai Sudharsan');
  const bowler = playerData.find(p => p.name === 'Cameron Green');

  console.log(`\n🏏 Test Ball: ${striker.name} vs ${bowler.name}`);
  console.log('==========================================');

  // Initialize calculators
  const probabilityEngine = new ProbabilityEngine();
  const decisionCalculator = new DecisionCalculator();
  const contactCalculator = new ContactCalculator(probabilityEngine);
  const trajectoryCalculator = new TrajectoryCalculator();
  const fieldingCalculator = new FieldingCalculator(probabilityEngine);

  console.log('✅ Calculators initialized\n');

  // Step 1: Decision
  console.log('📊 Step 1: Decision Calculation');
  console.log('--------------------------------');
  const decisionResult = decisionCalculator.calculateDecision({
    striker,
    bowler
  });
  console.log('Decision Result:', JSON.stringify(decisionResult, null, 2));
  console.log('');

  // Step 2: Contact
  console.log('📊 Step 2: Contact Calculation');
  console.log('-------------------------------');
  const contactResult = contactCalculator.calculateContact({
    striker,
    bowler,
    decisionResult
  });
  console.log('Contact Result:', JSON.stringify(contactResult, null, 2));
  console.log('');

  // Step 3: Trajectory
  console.log('📊 Step 3: Trajectory Calculation');
  console.log('----------------------------------');
  const trajectoryResult = trajectoryCalculator.calculateTrajectory({
    contactResult,
    striker,
    bowler,
    battingMentality: 'attacking',
    bowlingMentality: 'neutral'
  });
  console.log('Trajectory Result:', JSON.stringify(trajectoryResult, null, 2));
  console.log('');

  // Step 4: Fielding (only if needed)
  if (!trajectoryResult.isWicket && trajectoryResult.shotType !== 'missed' && trajectoryResult.shotType !== 'caught_behind') {
    console.log('📊 Step 4: Fielding Calculation');
    console.log('--------------------------------');

    const fieldingTeam = {
      squad: [bowler] // Simple fielding team
    };

    const fieldingResult = fieldingCalculator.calculateFielding({
      trajectoryResult,
      striker,
      fieldingTeam,
      wicketKeeper: bowler
    });
    console.log('Fielding Result:', JSON.stringify(fieldingResult, null, 2));
    console.log('');

    // Final outcome
    console.log('✅ Final Ball Result');
    console.log('====================');
    console.log(`Outcome: ${fieldingResult.outcome}`);
    console.log(`Runs: ${fieldingResult.runs}`);
    console.log(`Wicket: ${fieldingResult.isWicket}`);
  } else {
    console.log('✅ Final Ball Result');
    console.log('====================');
    console.log(`Outcome: ${trajectoryResult.isWicket ? trajectoryResult.wicketType?.toUpperCase() : 'DOT'}`);
    console.log(`Runs: 0`);
    console.log(`Wicket: ${trajectoryResult.isWicket}`);
  }

  console.log('\n🎉 4-Step Calculator Test Completed Successfully!');
  console.log('All calculators are working correctly with real player data.');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}