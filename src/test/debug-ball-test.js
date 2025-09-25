/**
 * Debug test to check why ball simulation returns undefined commentary
 */

import fs from 'fs';
import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js';

console.log('🔍 Debug Ball Simulation Test');
console.log('=============================\n');

try {
  // Load player data
  const playerData = JSON.parse(fs.readFileSync('src/data/players/processed/player_database_from_excel.json', 'utf8'));

  // Get sample players
  const striker = playerData.find(p => p.name === 'Sai Sudharsan');
  const nonStriker = playerData.find(p => p.name === 'Dewald Brevis');
  const bowler = playerData.find(p => p.name === 'Cameron Green');
  const fielders = playerData.slice(10, 19);

  console.log('✅ Players loaded');
  console.log(`   Striker: ${striker?.name || 'NOT FOUND'}`);
  console.log(`   NonStriker: ${nonStriker?.name || 'NOT FOUND'}`);
  console.log(`   Bowler: ${bowler?.name || 'NOT FOUND'}`);
  console.log(`   Fielders: ${fielders.length}\n`);

  // Initialize simulator
  const simulator = new SimpleBallSimulator();

  // Set field formation
  const fieldingPositions = simulator.setFieldFormation('neutral', fielders);
  console.log(`✅ Field formation set with ${fieldingPositions.length} fielders\n`);

  // Create ball context
  const ballContext = {
    striker,
    nonStriker,
    bowler,
    fieldingTeam: {
      squad: fielders,
      fieldingPositions
    },
    wicketKeeper: fielders[0],
    battingMentality: 'neutral',
    bowlingMentality: 'neutral',
    matchSituation: {
      phase: 'powerplay',
      ballsLeft: 120,
      required: null
    }
  };

  console.log('📊 Ball Context Created:');
  console.log(`   Striker: ${ballContext.striker?.name}`);
  console.log(`   NonStriker: ${ballContext.nonStriker?.name}`);
  console.log(`   Bowler: ${ballContext.bowler?.name}`);
  console.log(`   Fielding Positions: ${ballContext.fieldingTeam?.fieldingPositions?.length}`);
  console.log(`   Mentalities: ${ballContext.battingMentality}/${ballContext.bowlingMentality}\n`);

  // Simulate ball
  console.log('🏏 Simulating Ball...');
  const result = await simulator.simulateBall(ballContext);

  console.log('\n📋 Ball Result:');
  console.log(`   Outcome: ${result?.outcome || 'UNDEFINED'}`);
  console.log(`   Runs: ${result?.runs !== undefined ? result.runs : 'UNDEFINED'}`);
  console.log(`   Wicket: ${result?.isWicket !== undefined ? result.isWicket : 'UNDEFINED'}`);
  console.log(`   Commentary: "${result?.commentary || 'UNDEFINED'}"`);
  console.log(`   Legal: ${result?.isLegal}`);

  // Full result object for debugging
  console.log('\n🔍 Full Result Object:');
  console.log(JSON.stringify(result, null, 2));

  if (result?.metadata) {
    console.log('\n🔬 Metadata:');
    console.log(`   Decision Result: ${result.metadata.decisionResult ? 'Present' : 'Missing'}`);
    console.log(`   Contact Result: ${result.metadata.contactResult ? 'Present' : 'Missing'}`);
    console.log(`   Trajectory Result: ${result.metadata.trajectoryResult ? 'Present' : 'Missing'}`);
    console.log(`   Fielding Result: ${result.metadata.fieldingResult ? 'Present' : 'Missing'}`);

    if (result.metadata.trajectoryResult) {
      console.log(`   Shot Type: ${result.metadata.trajectoryResult.shotType}`);
      console.log(`   Shot Speed: ${result.metadata.trajectoryResult.shotSpeed}`);
      console.log(`   Direction: ${result.metadata.trajectoryResult.direction}`);
      console.log(`   Is Wicket: ${result.metadata.trajectoryResult.isWicket}`);
    }
  }

  console.log('\n✅ Debug test complete!');

} catch (error) {
  console.error('❌ Debug test failed:', error);
  console.error('Stack trace:', error.stack);
}