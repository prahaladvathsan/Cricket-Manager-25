/**
 * @file simplified-physics-test.js
 * @description Test the simplified algebraic physics calculations
 */

import SimpleBallSimulator from '../core/match-engine/SimpleBallSimulator.js';

// Mock player data for testing
const striker = {
  name: 'Test Batsman',
  attributes: {
    batting: {
      timing: 15,
      footwork: 14,
      technique: 16,
      shotPower: 18,
      range360: 12,
      placement: 14
    },
    mental: {
      judgement: 15, // Note: 'judgement' spelling as expected by DecisionCalculator
      concentration: 14,
      temperament: 13
    },
    physical: {
      speed: 12,
      agility: 13,
      fitness: 14
    }
  }
};

const bowler = {
  name: 'Test Bowler',
  attributes: {
    bowling: {
      accuracy: 16,
      swing: 12,
      speed: 14,
      intelligence: 15,
      variations: 11
    }
  }
};

const fielders = [];
for (let i = 0; i < 9; i++) {
  fielders.push({
    name: `Fielder ${i + 1}`,
    attributes: {
      fielding: {
        catching: 12,
        reflexes: 11,
        throwPower: 13,
        speed: 12
      },
      physical: {
        speed: 13,
        agility: 12
      }
    }
  });
}

async function testSimplifiedPhysics() {
  console.log('🧪 Testing Simplified Physics Calculations\n');

  const simulator = new SimpleBallSimulator();

  // Set up field formation
  const fieldingPositions = simulator.setFieldFormation('neutral', fielders);
  console.log(`✅ Field formation set: ${fieldingPositions.length} fielders positioned\n`);

  // Test ball context
  const ballContext = {
    striker,
    nonStriker: striker,
    bowler,
    fieldingTeam: {
      squad: fielders,
      fieldingPositions
    },
    wicketKeeper: fielders[0],
    battingMentality: 'attacking',
    bowlingMentality: 'neutral',
    matchSituation: {
      over: 1,
      ball: 1,
      score: { runs: 0, wickets: 0 }
    }
  };

  console.log('📊 Running 10 test balls to validate physics...\n');

  const results = [];

  for (let i = 0; i < 10; i++) {
    try {
      const result = await simulator.simulateBall(ballContext);
      results.push(result);

      console.log(`Ball ${i + 1}:`);
      console.log(`  Outcome: ${result.outcome}`);
      console.log(`  Runs: ${result.runs}`);
      console.log(`  Commentary: ${result.commentary}`);

      if (result.metadata.trajectoryResult) {
        console.log(`  Direction: ${result.metadata.trajectoryResult.direction}°`);
        console.log(`  Speed: ${result.metadata.trajectoryResult.shotSpeed} mph`);
        console.log(`  Type: ${result.metadata.trajectoryResult.shotType}`);
      }

      if (result.metadata.fieldingResult) {
        console.log(`  Fielding: ${result.metadata.fieldingResult.fieldingAction?.type || 'N/A'}`);
      }

      console.log('');

    } catch (error) {
      console.error(`❌ Ball ${i + 1} failed:`, error.message);
    }
  }

  // Analyze results
  console.log('📈 Results Summary:');
  console.log(`  Total balls: ${results.length}`);
  console.log(`  Dots: ${results.filter(r => r.outcome === 'DOT').length}`);
  console.log(`  Runs: ${results.filter(r => r.outcome === 'RUNS').length}`);
  console.log(`  Fours: ${results.filter(r => r.outcome === 'FOUR').length}`);
  console.log(`  Sixes: ${results.filter(r => r.outcome === 'SIX').length}`);
  console.log(`  Wickets: ${results.filter(r => r.isWicket).length}`);

  const totalRuns = results.reduce((sum, r) => sum + r.runs, 0);
  console.log(`  Total runs: ${totalRuns}`);
  console.log(`  Average per ball: ${(totalRuns / results.length).toFixed(2)}`);

  console.log('\n✅ Simplified physics test completed successfully!');
}

// Run the test
testSimplifiedPhysics().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});