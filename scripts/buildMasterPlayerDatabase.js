/**
 * @file buildMasterPlayerDatabase.js
 * @description Generates master player database with all playstyle ratings pre-calculated
 * @usage node scripts/buildMasterPlayerDatabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import playstyleCalculator from '../src/utils/PlaystyleCalculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏗️  Building Master Player Database with Playstyle Data');
console.log('=======================================================\n');

try {
  // Load source database
  const sourceDbPath = path.join(__dirname, '../src/data/players/processed/player_database_from_excel.json');
  console.log(`📂 Loading source database: ${sourceDbPath}`);

  const rawData = fs.readFileSync(sourceDbPath, 'utf8');
  const players = JSON.parse(rawData);
  console.log(`✅ Loaded ${players.length} players\n`);

  // Process each player
  console.log('⚙️  Calculating playstyle data for all players...');
  const startTime = Date.now();
  let processedCount = 0;

  const enrichedPlayers = players.map((player, index) => {
    // Ensure player has ID
    const playerWithId = {
      ...player,
      id: player.id || `player_${index}`,
      bowlingType: player.bowlingType || (player.role && player.role.toLowerCase().includes('bowler') ? 'medium' : null)
    };

    // Calculate all playstyle ratings
    const ratings = playstyleCalculator.calculateAllPlaystyleRatings(playerWithId);

    // Get top 3 playstyles for each category
    const battingPlaystyles = Object.entries(ratings.batting)
      .map(([name, rating]) => ({ name, rating }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);

    const bowlingPlaystyles = Object.entries(ratings.bowling)
      .map(([name, rating]) => ({ name, rating }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);

    // Determine primary playstyles based on role
    let primaryBatting = null;
    let primaryBowling = null;

    if (player.role === 'batsman' || player.role === 'all-rounder' || player.role === 'wicket-keeper') {
      primaryBatting = battingPlaystyles[0]?.name || null;
    }

    if (player.role === 'bowler' || player.role === 'all-rounder') {
      primaryBowling = bowlingPlaystyles[0]?.name || null;
    }

    processedCount++;
    if (processedCount % 100 === 0) {
      process.stdout.write(`\r   Processed ${processedCount}/${players.length} players...`);
    }

    return {
      ...playerWithId,
      playstyleRatings: ratings,
      topPlaystyles: {
        batting: battingPlaystyles,
        bowling: bowlingPlaystyles
      },
      primaryPlaystyle: {
        batting: primaryBatting,
        bowling: primaryBowling
      }
    };
  });

  const endTime = Date.now();
  console.log(`\r✅ Processed ${processedCount}/${players.length} players in ${endTime - startTime}ms\n`);

  // Create master database with metadata
  const masterDatabase = {
    version: '2.0.0',
    generated: new Date().toISOString(),
    configVersions: {
      'playstyle-weightings': '1.0.0',
      'playstyle-modifiers': '1.0.0'
    },
    playerCount: enrichedPlayers.length,
    schema: 'player-schema.json v2.0.0',
    description: 'Master player database with pre-calculated playstyle ratings and top 3 playstyles',
    players: enrichedPlayers
  };

  // Save to new master database file
  const outputPath = path.join(__dirname, '../src/data/players/master_player_database.json');
  console.log(`💾 Saving master database to: ${outputPath}`);

  fs.writeFileSync(outputPath, JSON.stringify(masterDatabase, null, 2), 'utf8');

  const stats = fs.statSync(outputPath);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`✅ Master database saved successfully`);
  console.log(`   File size: ${fileSizeMB} MB`);
  console.log(`   Players: ${masterDatabase.playerCount}`);
  console.log(`   Version: ${masterDatabase.version}`);
  console.log(`   Generated: ${masterDatabase.generated}\n`);

  // Display sample player
  console.log('📊 Sample Player Data:');
  console.log('=====================');
  const sample = enrichedPlayers[0];
  console.log(`Name: ${sample.name}`);
  console.log(`Role: ${sample.role}`);
  console.log(`Primary Playstyles:`);
  if (sample.primaryPlaystyle.batting) {
    console.log(`   Batting: ${sample.primaryPlaystyle.batting}`);
  }
  if (sample.primaryPlaystyle.bowling) {
    console.log(`   Bowling: ${sample.primaryPlaystyle.bowling}`);
  }
  console.log(`\nTop 3 Batting Playstyles:`);
  sample.topPlaystyles.batting.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}: ${p.rating.toFixed(1)}/100`);
  });
  console.log(`\nTop 3 Bowling Playstyles:`);
  sample.topPlaystyles.bowling.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}: ${p.rating.toFixed(1)}/100`);
  });

  console.log('\n🎉 Master player database build completed successfully!\n');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
