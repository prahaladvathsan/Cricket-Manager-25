/**
 * Simple match simulation test using real player data
 */

import fs from 'fs';
import path from 'path';

console.log('🏏 Starting Simple Cricket Match Test');
console.log('====================================\n');

try {
  // Load player data
  console.log('Loading player data...');
  const playerData = JSON.parse(fs.readFileSync('src/data/players/processed/player_database_from_excel.json', 'utf8'));
  console.log(`✅ Loaded ${playerData.length} players`);

  // Select top players
  const topPlayers = playerData
    .filter(p => p.rating > 4.0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 30);

  console.log(`\nTop 10 players by rating:`);
  topPlayers.slice(0, 10).forEach((player, i) => {
    console.log(`${i+1}. ${player.name} (${player.role}) - Rating: ${player.rating}`);
  });

  // Create two teams
  console.log('\n🏏 TEAM SELECTION');
  console.log('==================');

  const teamA = {
    name: 'Mumbai Thunders',
    players: topPlayers.slice(0, 11)
  };

  const teamB = {
    name: 'London Lions',
    players: topPlayers.slice(11, 22)
  };

  console.log(`\nTeam A: ${teamA.name}`);
  teamA.players.forEach((p, i) => {
    console.log(`${i+1}. ${p.name} (${p.role}) - ${p.rating}`);
  });

  console.log(`\nTeam B: ${teamB.name}`);
  teamB.players.forEach((p, i) => {
    console.log(`${i+1}. ${p.name} (${p.role}) - ${p.rating}`);
  });

  // Simple match simulation
  console.log('\n🏏 MATCH SIMULATION');
  console.log('===================');

  const match = {
    teamA: { ...teamA, score: 0, wickets: 0, overs: 0 },
    teamB: { ...teamB, score: 0, wickets: 0, overs: 0 },
    ballCount: 0,
    commentary: []
  };

  // Toss
  const tossWinner = Math.random() < 0.5 ? 'A' : 'B';
  const tossDecision = Math.random() < 0.6 ? 'bat' : 'bowl';
  console.log(`Toss: Team ${tossWinner} wins and chooses to ${tossDecision}`);

  const battingFirst = tossDecision === 'bat' ? tossWinner : (tossWinner === 'A' ? 'B' : 'A');
  console.log(`${battingFirst === 'A' ? teamA.name : teamB.name} batting first\n`);

  // Simulate innings
  for (let innings = 1; innings <= 2; innings++) {
    console.log(`🏏 INNINGS ${innings}`);
    console.log('==============');

    const battingTeam = innings === 1 ?
      (battingFirst === 'A' ? match.teamA : match.teamB) :
      (battingFirst === 'A' ? match.teamB : match.teamA);

    battingTeam.score = 0;
    battingTeam.wickets = 0;
    battingTeam.overs = 0;

    // Simulate 20 overs
    for (let over = 1; over <= 20; over++) {
      if (battingTeam.wickets >= 10) break;

      let overRuns = 0;

      for (let ball = 1; ball <= 6; ball++) {
        if (battingTeam.wickets >= 10) break;

        // Simple ball simulation using player attributes
        const striker = battingTeam.players[Math.min(battingTeam.wickets, 10)];
        const battingRating = calculateBattingRating(striker);

        // Outcome probabilities based on rating
        const random = Math.random();
        let outcome, runs = 0, isWicket = false;

        if (random < 0.02 + (20 - battingRating) * 0.01) {
          // Wicket
          outcome = 'WICKET';
          isWicket = true;
          battingTeam.wickets++;
        } else if (random < 0.08 + battingRating * 0.008) {
          // Six
          outcome = 'SIX';
          runs = 6;
        } else if (random < 0.18 + battingRating * 0.015) {
          // Four
          outcome = 'FOUR';
          runs = 4;
        } else if (random < 0.35 + battingRating * 0.02) {
          // Single/Double
          runs = Math.random() < 0.7 ? 1 : 2;
          outcome = runs === 1 ? 'SINGLE' : 'DOUBLE';
        } else {
          // Dot ball
          outcome = 'DOT';
          runs = 0;
        }

        battingTeam.score += runs;
        overRuns += runs;
        match.ballCount++;

        const commentary = generateCommentary(striker, outcome, runs);

        // Print key events
        if (isWicket || runs >= 4 || over % 5 === 0) {
          console.log(`${over}.${ball}: ${battingTeam.score}/${battingTeam.wickets} - ${commentary}`);
        }
      }

      battingTeam.overs = over;

      // Print over summary
      if (over % 5 === 0 || overRuns >= 15) {
        const runRate = (battingTeam.score / over).toFixed(1);
        console.log(`After ${over} overs: ${battingTeam.score}/${battingTeam.wickets} (RR: ${runRate})`);
      }

      // Check target in second innings
      if (innings === 2) {
        const target = (battingFirst === 'A' ? match.teamA.score : match.teamB.score) + 1;
        if (battingTeam.score >= target) {
          console.log(`🎯 Target achieved! ${battingTeam.name} wins!`);
          break;
        }
      }
    }

    console.log(`Innings ${innings} completed: ${battingTeam.score}/${battingTeam.wickets} in ${battingTeam.overs} overs\n`);
  }

  // Match result
  console.log('🏆 MATCH RESULT');
  console.log('===============');

  const team1Score = battingFirst === 'A' ? match.teamA.score : match.teamB.score;
  const team2Score = battingFirst === 'A' ? match.teamB.score : match.teamA.score;
  const team1Name = battingFirst === 'A' ? teamA.name : teamB.name;
  const team2Name = battingFirst === 'A' ? teamB.name : teamA.name;

  console.log(`${team1Name}: ${team1Score}/${battingFirst === 'A' ? match.teamA.wickets : match.teamB.wickets}`);
  console.log(`${team2Name}: ${team2Score}/${battingFirst === 'A' ? match.teamB.wickets : match.teamA.wickets}`);

  if (team2Score >= team1Score + 1) {
    const margin = 10 - (battingFirst === 'A' ? match.teamB.wickets : match.teamA.wickets);
    console.log(`\n🎉 ${team2Name} won by ${margin} wicket${margin !== 1 ? 's' : ''}!`);
  } else {
    const margin = team1Score - team2Score;
    console.log(`\n🎉 ${team1Name} won by ${margin} run${margin !== 1 ? 's' : ''}!`);
  }

  console.log(`\n📊 Match Statistics:`);
  console.log(`Total balls simulated: ${match.ballCount}`);
  console.log(`Highest individual rating: ${topPlayers[0].rating} (${topPlayers[0].name})`);
  console.log('\n✅ Match simulation completed successfully!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
}

function calculateBattingRating(player) {
  const batting = player.attributes.batting;
  return Object.values(batting).reduce((sum, val) => sum + val, 0) / Object.keys(batting).length;
}

function generateCommentary(player, outcome, runs) {
  switch (outcome) {
    case 'SIX':
      return `SIX! ${player.name} sends it into the stands!`;
    case 'FOUR':
      return `FOUR! Excellent shot by ${player.name}!`;
    case 'WICKET':
      return `OUT! ${player.name} has to go!`;
    case 'SINGLE':
    case 'DOUBLE':
      return `${player.name} picks up ${runs} run${runs !== 1 ? 's' : ''}`;
    default:
      return `Dot ball from ${player.name}`;
  }
}