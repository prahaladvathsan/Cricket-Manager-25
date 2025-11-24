/**
 * @file updateJudgementValues.js
 * @description Update judgement values in master player database based on player roles
 *
 * Judgment Distribution:
 * - Batsmen: 17-20 (best decision-making)
 * - All-rounders: 15-17 (good decision-making)
 * - Bowlers: 10-13 (average decision-making)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DATABASE_PATH = path.join(__dirname, '../src/data/players/master_player_database.json');
const BACKUP_PATH = path.join(__dirname, '../src/data/players/master_player_database_backup_pre_judgment_update.json');

const JUDGMENT_RANGES = {
  batsman: { min: 17, max: 20 },
  allRounder: { min: 15, max: 17 },
  bowler: { min: 10, max: 13 }
};

/**
 * Get random integer between min and max (inclusive)
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Determine player type based on batting and bowling overall ratings
 * @param {Object} player - Player object
 * @returns {string} Player type: 'batsman', 'allRounder', or 'bowler'
 */
function determinePlayerType(player) {
  const battingOverall = player.attributes?.overall?.batting_overall || 0;
  const bowlingOverall = player.attributes?.overall?.bowling_overall || 0;

  // All-rounder: Both batting and bowling overall > 10
  if (battingOverall >= 10 && bowlingOverall >= 10) {
    return 'allRounder';
  }

  // Batsman: Batting overall > bowling overall
  if (battingOverall > bowlingOverall) {
    return 'batsman';
  }

  // Bowler: Otherwise
  return 'bowler';
}

/**
 * Update judgment values for all players
 */
function updateJudgmentValues() {
  console.log('🔄 Starting judgment value update...\n');

  // Read player database
  console.log(`📖 Reading database from: ${DATABASE_PATH}`);
  const database = JSON.parse(fs.readFileSync(DATABASE_PATH, 'utf-8'));

  if (!database.players || !Array.isArray(database.players)) {
    console.error('❌ Error: Invalid database structure (missing players array)');
    process.exit(1);
  }

  // Create backup
  console.log(`💾 Creating backup at: ${BACKUP_PATH}`);
  fs.writeFileSync(BACKUP_PATH, JSON.stringify(database, null, 2));

  // Statistics
  const stats = {
    total: database.players.length,
    batsmen: 0,
    allRounders: 0,
    bowlers: 0,
    updated: 0,
    skipped: 0
  };

  // Update each player
  console.log('\n🎯 Updating judgment values...\n');

  database.players.forEach((player, index) => {
    // Skip if no mental attributes
    if (!player.attributes?.mental) {
      console.warn(`⚠️  Skipping ${player.name} (no mental attributes)`);
      stats.skipped++;
      return;
    }

    // Determine player type
    const playerType = determinePlayerType(player);
    const range = JUDGMENT_RANGES[playerType];

    // Get old value
    const oldJudgment = player.attributes.mental.judgement;

    // Assign new random judgment within range
    const newJudgment = getRandomInt(range.min, range.max);
    player.attributes.mental.judgement = newJudgment;

    // Update stats
    if (playerType === 'batsman') stats.batsmen++;
    else if (playerType === 'allRounder') stats.allRounders++;
    else if (playerType === 'bowler') stats.bowlers++;
    stats.updated++;

    // Log sample updates (every 50th player)
    if (index % 50 === 0) {
      console.log(`  ${player.name} (${playerType}): ${oldJudgment} → ${newJudgment}`);
    }
  });

  // Write updated database
  console.log('\n💾 Writing updated database...');
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(database, null, 2));

  // Print statistics
  console.log('\n✅ Update Complete!\n');
  console.log('📊 Statistics:');
  console.log(`  Total players: ${stats.total}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`\n  Batsmen: ${stats.batsmen} (judgment ${JUDGMENT_RANGES.batsman.min}-${JUDGMENT_RANGES.batsman.max})`);
  console.log(`  All-rounders: ${stats.allRounders} (judgment ${JUDGMENT_RANGES.allRounder.min}-${JUDGMENT_RANGES.allRounder.max})`);
  console.log(`  Bowlers: ${stats.bowlers} (judgment ${JUDGMENT_RANGES.bowler.min}-${JUDGMENT_RANGES.bowler.max})`);
  console.log(`\n  Backup saved to: ${BACKUP_PATH}`);
}

// Run the script
try {
  updateJudgmentValues();
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
