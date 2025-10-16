/**
 * @file generateTacticsData.js
 * @description Utility script to add tactics data to all players in master database
 * @usage node src/utils/generateTacticsData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to master player database
const DATABASE_PATH = path.join(__dirname, '../data/players/master_player_database.json');

// Bowling styles for matchup preferences
const BOWLING_STYLES = [
  'Swing Bowler',
  'Hit-the-Deck Seamer',
  'Short-Ball Specialist',
  'Death Specialist',
  'Classical Spinner',
  'Flat Spinner',
  'Mystery Spinner',
  'Containment Spinner'
];

// Default acceleration tiers
const DEFAULT_ACCELERATION_TIERS = ['Rotate', 'Cruise', 'Build', 'Blitz', 'Blockade', 'Hit Out/Get Out'];

// Pace bowling plans
const PACE_LINE_LENGTH_PLANS = ['Attacking Line', 'Wide Line', 'Short-Pitched', 'Yorker Execution'];
const PACE_VARIATION_PLANS = ['Pace Variation Mix', 'Swing/Seam Focus', 'Bouncer Barrage', 'Consistent Accuracy'];

// Spin bowling plans
const SPIN_LINE_LENGTH_PLANS = ['Flight & Loop', 'Flat & Fast', 'Wide of Off', 'Stumps Attack'];
const SPIN_VARIATION_PLANS = ['Turn Candy Bag', 'Flight Variation', 'Pace Variation', 'Consistent Line'];

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate random matchup preferences (1-8 rankings)
 * @returns {Object} Bowling style to rank mapping
 */
function generateMatchupPreferences() {
  const rankings = [1, 2, 3, 4, 5, 6, 7, 8];
  const shuffled = shuffleArray(rankings);

  const preferences = {};
  BOWLING_STYLES.forEach((style, index) => {
    preferences[style] = shuffled[index];
  });

  return preferences;
}

/**
 * Select default acceleration tier based on player playstyle
 * @param {Object} player - Player object
 * @returns {string} Default tier name
 */
function selectDefaultTier(player) {
  if (!player.topPlaystyles || !player.topPlaystyles.batting || player.topPlaystyles.batting.length === 0) {
    return 'Rotate'; // Default fallback
  }

  const primaryPlaystyle = player.topPlaystyles.batting[0].name;

  // Map playstyles to default tiers
  if (primaryPlaystyle.includes('Slogger') || primaryPlaystyle === 'Pinch-Hitter') {
    return 'Blitz';
  } else if (primaryPlaystyle.includes('Anchor') || primaryPlaystyle === 'Wall') {
    return 'Build';
  } else if (primaryPlaystyle === 'Finisher') {
    return 'Cruise';
  } else if (primaryPlaystyle === 'Runner') {
    return 'Rotate';
  } else {
    return 'Rotate'; // Balanced default
  }
}

/**
 * Select default bowling plans based on bowler type and playstyle
 * @param {Object} player - Player object
 * @returns {Object} Default bowling plans
 */
function selectDefaultBowlingPlans(player) {
  const bowlingType = player.bowlingType || 'pace';

  if (bowlingType === 'pace') {
    let lineLength = 'Wide Line'; // Default
    let variation = 'Consistent Accuracy'; // Default

    if (player.topPlaystyles && player.topPlaystyles.bowling && player.topPlaystyles.bowling.length > 0) {
      const primaryBowlingPlaystyle = player.topPlaystyles.bowling[0].name;

      if (primaryBowlingPlaystyle === 'Swing Bowler') {
        lineLength = 'Attacking Line';
        variation = 'Swing/Seam Focus';
      } else if (primaryBowlingPlaystyle === 'Short-Ball Specialist') {
        lineLength = 'Short-Pitched';
        variation = 'Bouncer Barrage';
      } else if (primaryBowlingPlaystyle === 'Death Specialist') {
        lineLength = 'Yorker Execution';
        variation = 'Pace Variation Mix';
      }
    }

    return { lineLength, variation };
  } else {
    // Spin bowler
    let lineLength = 'Flat & Fast'; // Default
    let variation = 'Consistent Line'; // Default

    if (player.topPlaystyles && player.topPlaystyles.bowling && player.topPlaystyles.bowling.length > 0) {
      const primaryBowlingPlaystyle = player.topPlaystyles.bowling[0].name;

      if (primaryBowlingPlaystyle === 'Classical Spinner') {
        lineLength = 'Flight & Loop';
        variation = 'Flight Variation';
      } else if (primaryBowlingPlaystyle === 'Mystery Spinner') {
        lineLength = 'Wide of Off';
        variation = 'Turn Candy Bag';
      } else if (primaryBowlingPlaystyle === 'Flat Spinner') {
        lineLength = 'Flat & Fast';
        variation = 'Pace Variation';
      } else if (primaryBowlingPlaystyle === 'Containment Spinner') {
        lineLength = 'Stumps Attack';
        variation = 'Consistent Line';
      }
    }

    return { lineLength, variation };
  }
}

/**
 * Add tactics data to a player
 * @param {Object} player - Player object
 * @returns {Object} Player with tactics data
 */
function addTacticsData(player) {
  // Generate matchup preferences
  const bowlingStylePreferences = generateMatchupPreferences();

  // Select default tier
  const defaultBattingTier = selectDefaultTier(player);

  // Select default bowling plans
  const defaultBowlingPlans = selectDefaultBowlingPlans(player);

  // Add tactics field
  player.tactics = {
    bowlingStylePreferences,
    defaultBattingTier,
    defaultBowlingPlans
  };

  // Add confidence to condition if not present
  if (!player.condition.confidence) {
    player.condition.confidence = player.condition.morale || 50;
  }

  // Add energy to condition (will be initialized to fitness at match start)
  if (!player.condition.energy) {
    player.condition.energy = player.condition.fitness || 100;
  }

  // Add injuryDuration to condition if not present
  if (player.condition.injuryDuration === undefined) {
    player.condition.injuryDuration = null;
  }

  return player;
}

/**
 * Main function to process master database
 */
function main() {
  console.log('🔧 Reading master player database...');

  // Read database
  const databaseRaw = fs.readFileSync(DATABASE_PATH, 'utf8');
  const database = JSON.parse(databaseRaw);

  console.log(`📊 Found ${database.playerCount} players`);
  console.log('⚙️  Adding tactics data to all players...');

  // Process each player
  database.players = database.players.map((player, index) => {
    if ((index + 1) % 100 === 0) {
      console.log(`   Processed ${index + 1}/${database.playerCount} players...`);
    }
    return addTacticsData(player);
  });

  // Update version
  database.version = '2.1.0';
  database.schema = 'player-schema.json v2.1.0 (with tactics data)';

  // Create backup
  const backupPath = DATABASE_PATH.replace('.json', '_backup_pre_tactics.json');
  console.log(`💾 Creating backup at: ${path.basename(backupPath)}`);
  fs.writeFileSync(backupPath, databaseRaw, 'utf8');

  // Write updated database
  console.log('✍️  Writing updated database...');
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(database, null, 2), 'utf8');

  console.log('✅ Successfully added tactics data to all players!');
  console.log(`   Version: ${database.version}`);
  console.log(`   Backup saved at: ${path.basename(backupPath)}`);
}

// Run script
main();
