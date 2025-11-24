/**
 * @file buildMasterPlayerDatabase.js
 * @description Generates master player database from enhanced GMA source with playstyle ratings
 * @usage node scripts/buildMasterPlayerDatabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PlaystyleCalculator } from '../src/utils/PlaystyleCalculator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config files
const tacticsConfigPath = path.join(__dirname, '../src/data/config/tactics-config.json');
const bowlingPlansConfigPath = path.join(__dirname, '../src/data/config/bowling-plans-config.json');
const tacticsConfig = JSON.parse(fs.readFileSync(tacticsConfigPath, 'utf8'));
const bowlingPlansConfig = JSON.parse(fs.readFileSync(bowlingPlansConfigPath, 'utf8'));

// Extract tier names from config (in order)
const accelerationTierNames = Object.keys(tacticsConfig.accelerationTiers);
// Tier mapping: 1=Blockade, 2=Build, 3=Rotate, 4=Cruise, 5=Blitz, 6=Hit Out/Get Out

console.log('🏗️  Building Master Player Database from Enhanced GMA Source');
console.log('===========================================================\n');

// Helper function to determine role
function determineRole(player) {
  const battingOverall = player.game_attributes?.batting_overall || 0;
  const bowlingOverall = player.game_attributes?.bowling_overall || 0;
  const keeping = player.game_attributes?.keeping || 0;

  // Wicket-keeper if keeping >= 10
  if (keeping >= 10) {
    return 'wicket-keeper';
  }

  // All-rounder if both batting and bowling are decent (>=5)
  if (battingOverall >= 5 && bowlingOverall >= 5) {
    return 'all-rounder';
  }

  // Bowler if bowling_overall > batting_overall
  if (bowlingOverall > battingOverall) {
    return 'bowler';
  }

  // Default to batsman
  return 'batsman';
}

// Helper function to map bowling hand from bowl_style
function mapBowlingHand(bowlStyle) {
  if (!bowlStyle) return null;
  const style = bowlStyle.toUpperCase();
  // Left-arm styles: LF, LFM, LM, LS, SLA, LBG, etc.
  if (style.startsWith('L')) return 'left';
  // Right-arm styles: RF, RFM, RM, RS, OB, LBG, etc.
  if (style.startsWith('R')) return 'right';
  // Spin styles without R/L prefix
  if (style === 'OB' || style === 'LB') return 'right';
  if (style === 'SLA') return 'left';
  return null;
}

// Helper function to determine bowling type
function mapBowlingType(bowlKind, bowlStyle) {
  if (!bowlKind) return null;
  const kind = bowlKind.toLowerCase();
  if (kind.includes('pace')) return 'pace';
  if (kind.includes('spin')) return 'spin';
  // Fallback: check bowl_style
  if (bowlStyle) {
    const style = bowlStyle.toUpperCase();
    if (style.includes('F') || style.includes('M')) return 'pace'; // Fast/Medium
    if (style.includes('OB') || style.includes('SLA') || style.includes('LB')) return 'spin';
  }
  return null;
}

// Helper function to expand bowl style abbreviation
function expandBowlStyle(bowlStyle) {
  if (!bowlStyle) return null;
  const styleMap = {
    'RF': 'Right-arm fast',
    'RFM': 'Right-arm fast-medium',
    'RM': 'Right-arm medium',
    'RMF': 'Right-arm medium-fast',
    'LF': 'Left-arm fast',
    'LFM': 'Left-arm fast-medium',
    'LM': 'Left-arm medium',
    'LMF': 'Left-arm medium-fast',
    'OB': 'Off Break',
    'SLA': 'Slow left-arm orthodox',
    'LB': 'Leg Break',
    'LBG': 'Left-arm wrist spin'
  };
  return styleMap[bowlStyle.toUpperCase()] || bowlStyle;
}

// Helper function to get default tactics data
function getDefaultTactics(role, bowlingType, primaryBattingPlaystyle, primaryBowlingPlaystyle) {
  const tactics = {
    bowlingStylePreferences: {
      'Swing Bowler': 1,
      'Hit-the-Deck Seamer': 2,
      'Short-Ball Specialist': 3,
      'Death Specialist': 4,
      'Classical Spinner': 5,
      'Flat Spinner': 6,
      'Mystery Spinner': 7,
      'Containment Spinner': 8
    },
    defaultBattingTier: accelerationTierNames[3] || 'Cruise', // Default: tier 4 (Cruise)
    defaultBowlingPlans: {
      lineLength: 'Wide Line',
      variation: 'Consistent Accuracy'
    }
  };

  // Set batting tier based on primary batting playstyle
  if (primaryBattingPlaystyle) {
    const playstyleLower = primaryBattingPlaystyle.toLowerCase();

    // Sloggers: tier 5 (Blitz) or tier 6 (Hit Out/Get Out) - use Blitz
    if (playstyleLower.includes('slogger') || playstyleLower.includes('pinch-hitter')) {
      tactics.defaultBattingTier = accelerationTierNames[4] || 'Blitz';
    }
    // Anchors: tier 3 (Rotate)
    else if (playstyleLower.includes('anchor') || playstyleLower === 'wall') {
      tactics.defaultBattingTier = accelerationTierNames[2] || 'Rotate';
    }
    // Everyone else: tier 4 (Cruise)
    else {
      tactics.defaultBattingTier = accelerationTierNames[3] || 'Cruise';
    }
  }

  // Set bowling plans based on bowling type and primary bowling playstyle
  if (bowlingType === 'pace') {
    const paceLinePlans = Object.keys(bowlingPlansConfig.paceBowling.lineLengthPlans);
    const paceVarPlans = Object.keys(bowlingPlansConfig.paceBowling.variationPlans);

    // Default pace plans
    let linePlan = paceLinePlans[0] || 'Attacking Line';
    let varPlan = paceVarPlans[0] || 'Pace Variation Mix';

    // Customize based on bowling playstyle
    if (primaryBowlingPlaystyle) {
      if (primaryBowlingPlaystyle === 'Swing Bowler') {
        linePlan = 'Attacking Line';
        varPlan = 'Swing/Seam Focus';
      } else if (primaryBowlingPlaystyle === 'Hit-the-Deck Seamer') {
        linePlan = 'Wide Line';
        varPlan = 'Consistent Accuracy';
      } else if (primaryBowlingPlaystyle === 'Short-Ball Specialist') {
        linePlan = 'Short-Pitched';
        varPlan = 'Bouncer Barrage';
      } else if (primaryBowlingPlaystyle === 'Death Specialist') {
        linePlan = 'Yorker Execution';
        varPlan = 'Pace Variation Mix';
      }
    }

    tactics.defaultBowlingPlans = {
      lineLength: linePlan,
      variation: varPlan
    };
  } else if (bowlingType === 'spin') {
    const spinLinePlans = Object.keys(bowlingPlansConfig.spinBowling.lineLengthPlans);
    const spinVarPlans = Object.keys(bowlingPlansConfig.spinBowling.variationPlans);

    // Default spin plans
    let linePlan = spinLinePlans[0] || 'Flight & Loop';
    let varPlan = spinVarPlans[1] || 'Flight Variation';

    // Customize based on bowling playstyle
    if (primaryBowlingPlaystyle) {
      if (primaryBowlingPlaystyle === 'Classical Spinner') {
        linePlan = 'Flight & Loop';
        varPlan = 'Flight Variation';
      } else if (primaryBowlingPlaystyle === 'Flat Spinner') {
        linePlan = 'Flat & Fast';
        varPlan = 'Pace Variation';
      } else if (primaryBowlingPlaystyle === 'Mystery Spinner') {
        linePlan = 'Stumps Attack';
        varPlan = 'Turn Candy Bag';
      } else if (primaryBowlingPlaystyle === 'Containment Spinner') {
        linePlan = 'Wide of Off';
        varPlan = 'Pace Variation';
      }
    }

    tactics.defaultBowlingPlans = {
      lineLength: linePlan,
      variation: varPlan
    };
  }

  return tactics;
}

// Transform player from source format to target schema
function transformPlayer(sourcePlayer, calculator) {
  const playerId = sourcePlayer.player_id.toString();
  const playerName = sourcePlayer.player_name || 'Unknown Player';

  // Determine role first
  const role = determineRole(sourcePlayer);

  // Map basic fields
  let battingHand = sourcePlayer.bat_hand === 'RHB' ? 'right' :
                    sourcePlayer.bat_hand === 'LHB' ? 'left' : null;
  let bowlingHand = mapBowlingHand(sourcePlayer.bowl_style);

  // Initialize batting hand from bowling hand if null (and vice versa)
  if (!battingHand && bowlingHand) {
    battingHand = bowlingHand;
  }
  if (!bowlingHand && battingHand) {
    bowlingHand = battingHand;
  }

  let bowlingType = mapBowlingType(sourcePlayer.bowl_kind, sourcePlayer.bowl_style);
  let bowlingStyle = expandBowlStyle(sourcePlayer.bowl_style);
  let bowlingStyleAbbrev = sourcePlayer.bowl_style || null;

  // Assign default bowling style if null
  if (!bowlingType) {
    bowlingType = 'pace';
  }
  if (!bowlingStyle || !bowlingStyleAbbrev) {
    // Default to RFM or LFM based on bowling hand
    if (bowlingHand === 'left') {
      bowlingStyle = 'Left-arm fast-medium';
      bowlingStyleAbbrev = 'LFM';
    } else {
      bowlingStyle = 'Right-arm fast-medium';
      bowlingStyleAbbrev = 'RFM';
    }
  }

  const primaryBattingPosition = sourcePlayer.batting_stats?.primary_bat_pos ||
                                 (sourcePlayer.bat_pos && sourcePlayer.bat_pos[0]) ||
                                 null;

  // Build attributes object
  const attrs = sourcePlayer.game_attributes || {};
  const attributes = {
    batting: {
      technique: attrs.technique || 1,
      timing: attrs.timing || 1,
      footwork: attrs.footwork || 1,
      placement: attrs.placement || 1,
      range360: attrs.range360 || 1,
      defensiveShots: attrs.defensiveShots || 1,
      neutralShots: attrs.neutralShots || 1,
      attackingShots: attrs.attackingShots || 1,
      vsPace: attrs.vsPace || 1,
      vsSpin: attrs.vsSpin || 1,
      creativity: attrs.creativity || 1
    },
    bowling: {
      accuracy: attrs.accuracy || 1,
      bowlingSpeed: attrs.bowlingSpeed || 1,
      swing: attrs.swing || 1,
      turn: attrs.turn || 1,
      flight: attrs.flight || 1,
      variations: attrs.variations || 1,
      intelligence: attrs.intelligence || 1,
      defensiveBowling: attrs.defensiveBowling || 1,
      neutralBowling: attrs.neutralBowling || 1,
      attackingBowling: attrs.attackingBowling || 1
    },
    physical: {
      strength: attrs.strength || 1,
      speed: attrs.speed || 1,
      agility: attrs.agility || 10,
      maxFitness: attrs.maxFitness || 1,
      endurance: attrs.endurance || 1,
      stamina: attrs.stamina || 1
    },
    fielding: {
      catching: attrs.catching || 1,
      reflexes: attrs.reflexes || 1,
      groundFielding: attrs.groundFielding || 1,
      throwPower: attrs.throwPower || 1,
      throwAccuracy: attrs.throwAccuracy || 1,
      keeping: attrs.keeping || 1,
      collecting: attrs.collecting || 1,
      stumping: attrs.stumping || 1
    },
    mental: {
      concentration: attrs.concentration || 1,
      temperament: attrs.temperament || 1,
      aggression: attrs.aggression || 1,
      judgement: attrs.judgement || 1,
      leadership: attrs.leadership || 1
    },
    overall: {
      batting_overall: attrs.batting_overall || 1,
      bowling_overall: attrs.bowling_overall || 1
    }
  };

  // Build base player object
  const player = {
    id: playerId,
    name: playerName,
    fullName: playerName,
    age: 25, // Default age
    nationality: sourcePlayer.nationality || 'Unknown',
    role: role,
    battingHand: battingHand,
    bowlingHand: bowlingHand,
    bowlingType: bowlingType,
    bowlingStyle: bowlingStyle,
    bowlingStyleAbbrev: bowlingStyleAbbrev,
    primaryBattingPosition: primaryBattingPosition,
    teams: [],
    currentTeam: null,
    attributes: attributes,
    careerStats: {
      matches: 0,
      innings: 0,
      runs: 0,
      wickets: 0,
      catches: 0,
      stumpings: 0
    },
    seasonStats: {
      matches: 0,
      innings: 0,
      runs: 0,
      wickets: 0,
      catches: 0,
      stumpings: 0
    },
    condition: {
      form: 50,
      fitness: 85,
      fatigue: 0,
      morale: 50,
      injury: null,
      confidence: 50,
      energy: 85,
      injuryDuration: null
    },
    contract: {
      salary: 1000000,
      duration: 1,
      retentionStatus: 'available'
    }
  };

  // Calculate playstyle ratings
  const allRatings = calculator.calculateAllPlaystyleRatings(player);

  // Get top playstyles
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

  // Determine primary playstyles based on role
  let primaryBatting = null;
  let primaryBowling = null;
  let primaryFielding = null;

  if (role === 'batsman' || role === 'all-rounder' || role === 'wicket-keeper') {
    primaryBatting = battingPlaystyles[0]?.name || null;
  }

  if (role === 'bowler' || role === 'all-rounder') {
    primaryBowling = bowlingPlaystyles[0]?.name || null;
  }

  if (role === 'wicket-keeper') {
    primaryFielding = fieldingPlaystyles[0]?.name || null;
  }

  // Add playstyle data
  player.playstyleRatings = allRatings;
  player.topPlaystyles = {
    batting: battingPlaystyles,
    bowling: bowlingPlaystyles,
    fielding: role === 'wicket-keeper' ? fieldingPlaystyles : []
  };
  player.primaryPlaystyle = {
    batting: primaryBatting,
    bowling: primaryBowling,
    fielding: primaryFielding
  };

  // Add tactics (pass primary playstyles for better defaults)
  player.tactics = getDefaultTactics(role, bowlingType, primaryBatting, primaryBowling);

  return player;
}

// Main execution
try {
  // Load source database
  const sourceDbPath = path.join(__dirname, '../src/data/players/processed/enhanced_player_database_gma.json');
  console.log(`📂 Loading source database: ${sourceDbPath}`);

  const rawData = fs.readFileSync(sourceDbPath, 'utf8');
  const sourceData = JSON.parse(rawData);
  const playerIds = Object.keys(sourceData);
  console.log(`✅ Loaded ${playerIds.length} players\n`);

  // Create backup of existing master database
  const masterDbPath = path.join(__dirname, '../src/data/players/master_player_database.json');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(__dirname, `../src/data/players/master_player_database_backup_${timestamp}.json`);

  if (fs.existsSync(masterDbPath)) {
    console.log('💾 Creating backup of existing master database...');
    fs.copyFileSync(masterDbPath, backupPath);
    console.log(`✅ Backup saved to: ${backupPath}\n`);
  }

  // Initialize calculator
  const calculator = new PlaystyleCalculator();

  // Process each player
  console.log('⚙️  Transforming and calculating playstyles for all players...');
  const startTime = Date.now();
  let processedCount = 0;
  let keeperCount = 0;

  const enrichedPlayers = playerIds.map((playerId) => {
    const sourcePlayer = sourceData[playerId];
    const player = transformPlayer(sourcePlayer, calculator);

    processedCount++;
    if (player.role === 'wicket-keeper') {
      keeperCount++;
    }

    if (processedCount % 50 === 0) {
      process.stdout.write(`\r   Processed ${processedCount}/${playerIds.length} players...`);
    }

    return player;
  });

  const endTime = Date.now();
  console.log(`\r✅ Processed ${processedCount}/${playerIds.length} players in ${endTime - startTime}ms\n`);

  // Create master database with metadata
  const masterDatabase = {
    version: '2.2.0',
    generated: new Date().toISOString(),
    configVersions: {
      'playstyle-weightings': '1.0.0',
      'playstyle-modifiers': '1.0.0',
      'tactics-data': '1.0.0'
    },
    playerCount: enrichedPlayers.length,
    schema: 'player-schema.json v2.1.0 (with tactics data)',
    description: 'Master player database with pre-calculated playstyle ratings, top playstyles, and tactics data',
    players: enrichedPlayers
  };

  // Save to master database file
  console.log(`💾 Saving master database to: ${masterDbPath}`);
  fs.writeFileSync(masterDbPath, JSON.stringify(masterDatabase, null, 2), 'utf8');

  const stats = fs.statSync(masterDbPath);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

  console.log(`✅ Master database saved successfully`);
  console.log(`   File size: ${fileSizeMB} MB`);
  console.log(`   Players: ${masterDatabase.playerCount}`);
  console.log(`   Wicket-keepers: ${keeperCount}`);
  console.log(`   Version: ${masterDatabase.version}`);
  console.log(`   Generated: ${masterDatabase.generated}\n`);

  // Validate output
  console.log('🔍 Validating output...');
  let validationPassed = true;

  if (enrichedPlayers.length !== playerIds.length) {
    console.error(`❌ Player count mismatch: expected ${playerIds.length}, got ${enrichedPlayers.length}`);
    validationPassed = false;
  }

  // Check sample player has required fields
  const sample = enrichedPlayers[0];
  const requiredFields = ['id', 'name', 'attributes', 'playstyleRatings', 'topPlaystyles', 'primaryPlaystyle', 'tactics'];
  for (const field of requiredFields) {
    if (!sample[field]) {
      console.error(`❌ Sample player missing required field: ${field}`);
      validationPassed = false;
    }
  }

  if (validationPassed) {
    console.log(`✅ Validation passed\n`);

    // Delete backup
    if (fs.existsSync(backupPath)) {
      console.log('🗑️  Deleting backup (validation successful)...');
      fs.unlinkSync(backupPath);
      console.log(`✅ Backup deleted\n`);
    }
  } else {
    console.log(`⚠️  Validation failed - keeping backup at: ${backupPath}\n`);
  }

  // Display sample player
  console.log('📊 Sample Player Data:');
  console.log('=====================');
  console.log(`Name: ${sample.name}`);
  console.log(`Role: ${sample.role}`);
  console.log(`Nationality: ${sample.nationality}`);
  console.log(`Primary Playstyles:`);
  if (sample.primaryPlaystyle.batting) {
    console.log(`   Batting: ${sample.primaryPlaystyle.batting}`);
  }
  if (sample.primaryPlaystyle.bowling) {
    console.log(`   Bowling: ${sample.primaryPlaystyle.bowling}`);
  }
  if (sample.primaryPlaystyle.fielding) {
    console.log(`   Fielding: ${sample.primaryPlaystyle.fielding}`);
  }
  console.log(`\nTop 3 Batting Playstyles:`);
  sample.topPlaystyles.batting.slice(0, 3).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}: ${p.rating.toFixed(1)}/100`);
  });
  console.log(`\nTop 3 Bowling Playstyles:`);
  sample.topPlaystyles.bowling.slice(0, 3).forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name}: ${p.rating.toFixed(1)}/100`);
  });

  // Show a wicket-keeper example if available
  const keeper = enrichedPlayers.find(p => p.role === 'wicket-keeper');
  if (keeper) {
    console.log(`\n📊 Sample Wicket-Keeper:`);
    console.log('========================');
    console.log(`Name: ${keeper.name}`);
    console.log(`Keeping Attribute: ${keeper.attributes.fielding.keeping}/20`);
    console.log(`Primary Fielding Playstyle: ${keeper.primaryPlaystyle.fielding}`);
    if (keeper.topPlaystyles.fielding.length > 0) {
      console.log(`Wicketkeeper Rating: ${keeper.topPlaystyles.fielding[0].rating.toFixed(1)}/100`);
    }
  }

  console.log('\n🎉 Master player database build completed successfully!\n');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
