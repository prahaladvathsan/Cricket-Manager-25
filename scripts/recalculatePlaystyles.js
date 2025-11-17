/**
 * Recalculate playstyle ratings including fielding for all players
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PlaystyleCalculator } from '../src/utils/PlaystyleCalculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'src', 'data', 'players', 'master_player_database.json');
const backupPath = path.join(__dirname, '..', 'src', 'data', 'players', 'master_player_database_backup_pre_playstyle_recalc.json');

console.log('🏏 Recalculating Playstyle Ratings...\n');

// Create backup
console.log('Creating backup...');
fs.copyFileSync(dbPath, backupPath);
console.log(`✓ Backup saved to: ${backupPath}\n`);

// Load database
console.log('Loading player database...');
const database = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const players = database.players || [];
console.log(`Loaded ${players.length} players\n`);

// Initialize calculator
const calculator = new PlaystyleCalculator();

// Recalculate for each player
let keeperCount = 0;
let updated = 0;

players.forEach((player, idx) => {
  // Calculate all playstyle ratings (including fielding)
  const allRatings = calculator.calculateAllPlaystyleRatings(player);

  // Get top playstyles by sorting and slicing
  const battingPlaystyles = Object.entries(allRatings.batting)
    .map(([name, rating]) => ({ name, rating }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const bowlingPlaystyles = Object.entries(allRatings.bowling)
    .map(([name, rating]) => ({ name, rating }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  const fieldingPlaystyles = Object.entries(allRatings.fielding)
    .map(([name, rating]) => ({ name, rating }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  // Update playstyleRatings - add fielding ratings
  player.playstyleRatings = {
    batting: allRatings.batting,
    bowling: allRatings.bowling,
    fielding: allRatings.fielding
  };

  // Update player - only include fielding for wicket-keepers
  player.topPlaystyles = {
    batting: battingPlaystyles,
    bowling: bowlingPlaystyles,
    fielding: player.role === 'wicket-keeper' ? fieldingPlaystyles : []
  };

  // Determine primary playstyles based on role
  let primaryBatting = null;
  let primaryBowling = null;
  let primaryFielding = null;

  if (player.role === 'batsman' || player.role === 'all-rounder' || player.role === 'wicket-keeper') {
    primaryBatting = battingPlaystyles[0]?.name || null;
  }

  if (player.role === 'bowler' || player.role === 'all-rounder') {
    primaryBowling = bowlingPlaystyles[0]?.name || null;
  }

  if (player.role === 'wicket-keeper') {
    primaryFielding = fieldingPlaystyles[0]?.name || null;
  }

  player.primaryPlaystyle = {
    batting: primaryBatting,
    bowling: primaryBowling,
    fielding: primaryFielding
  };

  updated++;

  // Track keepers
  if (player.role === 'wicket-keeper') {
    keeperCount++;
    if (keeperCount <= 5) {
      console.log(`✓ ${player.name}:`);
      console.log(`  Fielding: ${player.topPlaystyles.fielding[0]?.name} (${player.topPlaystyles.fielding[0]?.rating.toFixed(1)})`);
      console.log(`  Batting: ${player.topPlaystyles.batting[0]?.name} (${player.topPlaystyles.batting[0]?.rating.toFixed(1)})`);
    }
  }

  // Progress indicator
  if ((idx + 1) % 100 === 0) {
    console.log(`Processed ${idx + 1}/${players.length} players...`);
  }
});

// Save updated database
fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

console.log('\n=== Summary ===');
console.log(`✓ Updated ${updated} players`);
console.log(`✓ Found ${keeperCount} wicket-keepers with fielding ratings`);
console.log(`✓ Database saved to: ${dbPath}`);
console.log(`✓ Backup available at: ${backupPath}`);
console.log('\n✓ Done! Playstyle ratings recalculated.');
