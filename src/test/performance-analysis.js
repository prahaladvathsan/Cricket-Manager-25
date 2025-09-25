/**
 * Performance analysis of 2D simulation components
 */

import fs from 'fs';
import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js';

console.log('⚡ Performance Analysis of 2D Simulation');
console.log('========================================\n');

async function performanceTest() {
  try {
    // Load player data
    const playerData = JSON.parse(fs.readFileSync('src/data/players/processed/player_database_from_excel.json', 'utf8'));

    // Get sample players
    const striker = playerData.find(p => p.name === 'Sai Sudharsan');
    const nonStriker = playerData.find(p => p.name === 'Dewald Brevis');
    const bowler = playerData.find(p => p.name === 'Cameron Green');
    const fielders = playerData.slice(10, 19);

    // Initialize simulator
    console.log('🔧 Initializing Simulator...');
    const initStart = Date.now();
    const simulator = new SimpleBallSimulator();
    const initTime = Date.now() - initStart;
    console.log(`   Initialization: ${initTime}ms\n`);

    // Set field formation
    console.log('📍 Setting Field Formation...');
    const formationStart = Date.now();
    const fieldingPositions = simulator.setFieldFormation('neutral', fielders);
    const formationTime = Date.now() - formationStart;
    console.log(`   Field Formation: ${formationTime}ms\n`);

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

    // Test single ball timing
    console.log('🏏 Single Ball Performance Test:');
    console.log('================================');

    const singleStart = Date.now();
    const result = await simulator.simulateBall(ballContext);
    const singleTime = Date.now() - singleStart;
    console.log(`   Single Ball: ${singleTime}ms`);
    console.log(`   Outcome: ${result.outcome} - ${result.runs} runs\n`);

    // Test multiple balls
    console.log('🔄 Multiple Balls Performance Test:');
    console.log('===================================');

    const numBalls = 20;
    const times = [];
    const outcomes = [];

    for (let i = 0; i < numBalls; i++) {
      const ballStart = Date.now();
      const ballResult = await simulator.simulateBall(ballContext);
      const ballTime = Date.now() - ballStart;
      times.push(ballTime);
      outcomes.push(`${ballResult.outcome}(${ballResult.runs})`);
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / numBalls;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`   Balls Simulated: ${numBalls}`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Average Time: ${avgTime.toFixed(2)}ms`);
    console.log(`   Min Time: ${minTime}ms`);
    console.log(`   Max Time: ${maxTime}ms`);
    console.log(`   Balls/Second: ${(1000 / avgTime).toFixed(0)}`);
    console.log(`   Outcomes: ${outcomes.slice(0, 10).join(', ')}...\n`);

    // Component timing breakdown
    console.log('🔍 Component Timing Breakdown:');
    console.log('==============================');

    const componentTimes = {
      decision: [],
      contact: [],
      trajectory: [],
      fielding: [],
      total: []
    };

    for (let i = 0; i < 10; i++) {
      const totalStart = Date.now();

      // Step 1: Decision
      const decisionStart = Date.now();
      const decisionResult = simulator.decisionCalculator.calculateDecision({
        striker: ballContext.striker,
        bowler: ballContext.bowler
      });
      componentTimes.decision.push(Date.now() - decisionStart);

      // Step 2: Contact
      const contactStart = Date.now();
      const contactResult = simulator.contactCalculator.calculateContact({
        striker: ballContext.striker,
        bowler: ballContext.bowler,
        decisionResult
      });
      componentTimes.contact.push(Date.now() - contactStart);

      // Step 3: Trajectory
      const trajectoryStart = Date.now();
      const trajectoryResult = simulator.trajectoryCalculator.calculateTrajectory({
        contactResult,
        striker: ballContext.striker,
        bowler: ballContext.bowler,
        battingMentality: ballContext.battingMentality || 'neutral',
        bowlingMentality: ballContext.bowlingMentality || 'neutral',
        wicketKeeper: ballContext.wicketKeeper || ballContext.bowler,
        fieldingTeam: ballContext.fieldingTeam,
        ballPhysics: simulator.ballPhysics,
        fielderMovement: simulator.fielderMovement
      });
      componentTimes.trajectory.push(Date.now() - trajectoryStart);

      // Step 4: Fielding (if needed)
      let fieldingTime = 0;
      if (!trajectoryResult.isWicket &&
          trajectoryResult.shotType !== 'missed' &&
          trajectoryResult.shotType !== 'caught_behind') {

        const fieldingStart = Date.now();
        const fieldingResult = simulator.fieldingCalculator.calculateFielding({
          trajectoryResult,
          striker: ballContext.striker,
          nonStriker: ballContext.nonStriker,
          fieldingTeam: ballContext.fieldingTeam,
          wicketKeeper: ballContext.wicketKeeper || ballContext.bowler,
          battingMentality: ballContext.battingMentality || 'neutral'
        });
        fieldingTime = Date.now() - fieldingStart;
      }
      componentTimes.fielding.push(fieldingTime);

      componentTimes.total.push(Date.now() - totalStart);
    }

    // Calculate averages
    for (const [component, times] of Object.entries(componentTimes)) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      console.log(`   ${component.padEnd(10)}: ${avg.toFixed(2)}ms avg (${min}-${max}ms)`);
    }

    console.log('\n📊 Performance Insights:');
    console.log('========================');

    const trajectoryAvg = componentTimes.trajectory.reduce((a, b) => a + b, 0) / componentTimes.trajectory.length;
    const fieldingAvg = componentTimes.fielding.reduce((a, b) => a + b, 0) / componentTimes.fielding.length;
    const totalAvg = componentTimes.total.reduce((a, b) => a + b, 0) / componentTimes.total.length;

    console.log(`   Slowest Component: ${trajectoryAvg > fieldingAvg ? 'Trajectory' : 'Fielding'}`);
    console.log(`   Trajectory takes: ${((trajectoryAvg / totalAvg) * 100).toFixed(1)}% of time`);
    console.log(`   Fielding takes: ${((fieldingAvg / totalAvg) * 100).toFixed(1)}% of time`);

    if (trajectoryAvg > 5) {
      console.log(`   ⚠️  Trajectory calculation is slow (${trajectoryAvg.toFixed(2)}ms)`);
      console.log(`       Likely bottleneck: Direction evaluation with multiple options`);
    }

    if (fieldingAvg > 5) {
      console.log(`   ⚠️  Fielding calculation is slow (${fieldingAvg.toFixed(2)}ms)`);
      console.log(`       Likely bottleneck: 2D interception analysis for 9 fielders`);
    }

    console.log('\n✅ Performance analysis complete!');

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

performanceTest();