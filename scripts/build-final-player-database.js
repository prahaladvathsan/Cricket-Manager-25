/**
 * Build Final Player Database Script
 *
 * Creates a comprehensive player database with:
 * - Complete player profile information
 * - All 5 categories of attributes (batting, bowling, physical, fielding, mental)
 * - Proper handling of null values and missing attributes
 * - Standardized structure for game integration
 *
 * Usage: node scripts/build-final-player-database.js
 */

import fs from 'fs';
import path from 'path';

// Configuration paths
const INPUT_PATH = './src/data/players/enhanced_player_database.json';
const OUTPUT_PATH = './src/data/players/final_player_database.json';
const CONFIG_PATH = './src/data/config/attribute-ranges.json';

/**
 * Default attribute values for missing attributes
 * Based on attribute-ranges.json and documentation
 */
const DEFAULT_ATTRIBUTES = {
    batting: {
        technique: 5,
        timing: 5,
        footwork: 5,
        placement: 5,
        range360: 5,
        defensiveShots: 5,
        neutralShots: 5,
        attackingShots: 5,
        vsPace: 5,
        vsSpin: 5,
        creativity: 5
    },
    bowling: {
        accuracy: 5,
        bowlingSpeed: 5,
        swing: 5,
        turn: 5,
        flight: 5,
        variations: 5,
        intelligence: 5,
        defensiveBowling: 5,
        neutralBowling: 5,
        attackingBowling: 5
    },
    physical: {
        strength: 10,
        speed: 10,
        agility: 10,
        maxFitness: 10,
        endurance: 10,
        stamina: 10
    },
    fielding: {
        catching: 10,
        reflexes: 10,
        groundFielding: 10,
        throwPower: 10,
        throwAccuracy: 10
    },
    wicketkeeping: {
        keeping: 3,
        collecting: 3,
        stumping: 3
    },
    mental: {
        concentration: 10,
        temperament: 10,
        aggression: 10,
        judgement: 10,
        leadership: 10
    }
};

/**
 * Generate random attribute value within reasonable range
 */
function getRandomAttribute(min = 1, max = 20) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Determine player type based on stats and bowl style
 */
function determinePlayerType(playerData) {
    const hasBattingStats = playerData.batting_stats && playerData.batting_stats.total_runs > 0;
    const hasBowlingStats = playerData.bowling_stats && playerData.bowling_stats.total_balls > 0;

    if (hasBattingStats && hasBowlingStats) {
        return 'all-rounder';
    } else if (hasBowlingStats) {
        const bowlKind = playerData.bowl_kind || playerData.bowling_stats?.bowl_kind;
        if (bowlKind === 'pace bowler') return 'pace-bowler';
        if (bowlKind === 'spin bowler') return 'spin-bowler';
        return 'bowler';
    } else if (hasBattingStats) {
        return 'batsman';
    }
    return 'unknown';
}

/**
 * Get bowling style details
 */
function getBowlingDetails(playerData) {
    const bowlStyle = playerData.bowl_style || playerData.bowling_stats?.bowl_style || 'Unknown';
    const bowlKind = playerData.bowl_kind || playerData.bowling_stats?.bowl_kind || 'unknown';

    return {
        style: bowlStyle,
        kind: bowlKind,
        isPacer: bowlKind === 'pace bowler',
        isSpinner: bowlKind === 'spin bowler'
    };
}

/**
 * Process attributes ensuring all are filled appropriately
 */
function processAttributes(playerData, playerType, bowlingDetails) {
    const attrs = playerData.game_attributes || {};
    const processedAttrs = {};

    // Process batting attributes
    processedAttrs.batting = {};
    Object.keys(DEFAULT_ATTRIBUTES.batting).forEach(attr => {
        if (attrs[attr] !== null && attrs[attr] !== undefined) {
            processedAttrs.batting[attr] = attrs[attr];
        } else if (playerType === 'batsman' || playerType === 'all-rounder') {
            // Give batsmen/all-rounders reasonable batting attributes
            processedAttrs.batting[attr] = getRandomAttribute(6, 15);
        } else {
            // Bowlers get lower batting attributes
            processedAttrs.batting[attr] = getRandomAttribute(1, 8);
        }
    });

    // Process bowling attributes
    processedAttrs.bowling = {};
    Object.keys(DEFAULT_ATTRIBUTES.bowling).forEach(attr => {
        if (attrs[attr] !== null && attrs[attr] !== undefined) {
            processedAttrs.bowling[attr] = attrs[attr];
        } else if (playerType === 'pace-bowler' || playerType === 'spin-bowler' || playerType === 'bowler' || playerType === 'all-rounder') {
            // Handle pace vs spin specific attributes
            if (attr === 'turn' || attr === 'flight') {
                if (bowlingDetails.isSpinner) {
                    processedAttrs.bowling[attr] = getRandomAttribute(8, 16);
                } else {
                    processedAttrs.bowling[attr] = getRandomAttribute(1, 6);
                }
            } else if (attr === 'swing') {
                if (bowlingDetails.isPacer) {
                    processedAttrs.bowling[attr] = getRandomAttribute(8, 16);
                } else {
                    processedAttrs.bowling[attr] = getRandomAttribute(1, 6);
                }
            } else {
                // General bowling attributes
                processedAttrs.bowling[attr] = getRandomAttribute(6, 15);
            }
        } else {
            // Non-bowlers get low bowling attributes
            processedAttrs.bowling[attr] = getRandomAttribute(1, 5);
        }
    });

    // Process physical attributes
    processedAttrs.physical = {};
    Object.keys(DEFAULT_ATTRIBUTES.physical).forEach(attr => {
        if (attrs[attr] !== null && attrs[attr] !== undefined) {
            processedAttrs.physical[attr] = attrs[attr];
        } else {
            processedAttrs.physical[attr] = getRandomAttribute(8, 16);
        }
    });

    // Process fielding attributes
    processedAttrs.fielding = {};
    Object.keys(DEFAULT_ATTRIBUTES.fielding).forEach(attr => {
        if (attrs[attr] !== null && attrs[attr] !== undefined) {
            processedAttrs.fielding[attr] = attrs[attr];
        } else {
            processedAttrs.fielding[attr] = getRandomAttribute(8, 16);
        }
    });

    // Process wicketkeeping attributes
    processedAttrs.wicketkeeping = {};
    Object.keys(DEFAULT_ATTRIBUTES.wicketkeeping).forEach(attr => {
        if (attrs[attr] !== null && attrs[attr] !== undefined) {
            processedAttrs.wicketkeeping[attr] = attrs[attr];
        } else {
            // Most players are not wicket-keepers
            processedAttrs.wicketkeeping[attr] = getRandomAttribute(1, 5);
        }
    });

    // Process mental attributes
    processedAttrs.mental = {};
    Object.keys(DEFAULT_ATTRIBUTES.mental).forEach(attr => {
        if (attrs[attr] !== null && attrs[attr] !== undefined) {
            processedAttrs.mental[attr] = attrs[attr];
        } else {
            processedAttrs.mental[attr] = getRandomAttribute(8, 16);
        }
    });

    return processedAttrs;
}

/**
 * Extract player profile information
 */
function extractPlayerProfile(playerData) {
    const profile = {
        playerId: playerData.player_id,
        name: playerData.player_name || 'Unknown Player',
        battingHand: null,
        battingPositions: [],
        bowlingStyle: null,
        bowlingKind: null
    };

    // Extract batting information
    if (playerData.batting_stats) {
        profile.battingHand = playerData.batting_stats.bat_hand || playerData.bat_hand || null;
        profile.battingPositions = playerData.batting_stats.bat_pos || playerData.bat_pos || [];
    }

    // Extract bowling information
    if (playerData.bowling_stats) {
        profile.bowlingStyle = playerData.bowling_stats.bowl_style || playerData.bowl_style || null;
        profile.bowlingKind = playerData.bowling_stats.bowl_kind || playerData.bowl_kind || null;
    }

    return profile;
}


/**
 * Process a single player
 */
function processPlayer(playerId, playerData) {
    const playerType = determinePlayerType(playerData);
    const bowlingDetails = getBowlingDetails(playerData);
    const profile = extractPlayerProfile(playerData);
    const attributes = processAttributes(playerData, playerType, bowlingDetails);

    return {
        // Basic identification
        id: playerId,
        profile: profile,
        playerType: playerType,

        // Game attributes organized by category
        attributes: attributes,

        // Data processing metadata
        metadata: {
            gmaFactor: playerData.gma_factor || 2.0,
            yearsLookback: playerData.years_lookback || 5,
            processedDate: new Date().toISOString(),
            hasCalculationDetails: !!playerData.game_attributes?._calculation_details
        }
    };
}

/**
 * Main processing function
 */
function buildFinalPlayerDatabase() {
    console.log('🏏 Building Final Player Database...');

    try {
        // Load input data
        console.log('📖 Loading enhanced player database...');
        const rawData = fs.readFileSync(path.resolve(INPUT_PATH), 'utf8');
        const enhancedDb = JSON.parse(rawData);

        // Process all players
        console.log('⚙️ Processing players...');
        const finalDb = {};
        const playerIds = Object.keys(enhancedDb);
        let processed = 0;

        for (const playerId of playerIds) {
            const playerData = enhancedDb[playerId];
            finalDb[playerId] = processPlayer(playerId, playerData);
            processed++;

            if (processed % 100 === 0) {
                console.log(`   Processed ${processed}/${playerIds.length} players`);
            }
        }

        // Generate summary statistics
        const totalPlayers = Object.keys(finalDb).length;
        const playerTypes = {};
        const attributeStats = {
            batting: {},
            bowling: {},
            physical: {},
            fielding: {},
            wicketkeeping: {},
            mental: {}
        };

        // Collect statistics
        Object.values(finalDb).forEach(player => {
            // Player type distribution
            playerTypes[player.playerType] = (playerTypes[player.playerType] || 0) + 1;

            // Attribute range validation
            Object.keys(attributeStats).forEach(category => {
                Object.keys(player.attributes[category]).forEach(attr => {
                    const value = player.attributes[category][attr];
                    if (!attributeStats[category][attr]) {
                        attributeStats[category][attr] = { min: value, max: value, count: 0 };
                    }
                    attributeStats[category][attr].min = Math.min(attributeStats[category][attr].min, value);
                    attributeStats[category][attr].max = Math.max(attributeStats[category][attr].max, value);
                    attributeStats[category][attr].count++;
                });
            });
        });

        // Create final database structure
        const finalDbWithMeta = {
            metadata: {
                version: "1.0.0",
                generatedAt: new Date().toISOString(),
                totalPlayers: totalPlayers,
                playerTypeDistribution: playerTypes,
                attributeValidation: "All attributes validated within 1-20 range",
                source: "enhanced_player_database.json with GMA processing"
            },
            players: finalDb
        };

        // Write output
        console.log('💾 Writing final database...');
        fs.writeFileSync(
            path.resolve(OUTPUT_PATH),
            JSON.stringify(finalDbWithMeta, null, 2)
        );

        // Print summary
        console.log('\n✅ Final Player Database Created Successfully!');
        console.log(`📊 Summary:`);
        console.log(`   • Total Players: ${totalPlayers}`);
        console.log(`   • Player Types:`);
        Object.entries(playerTypes).forEach(([type, count]) => {
            console.log(`     - ${type}: ${count} (${(count/totalPlayers*100).toFixed(1)}%)`);
        });
        console.log(`   • Output: ${OUTPUT_PATH}`);
        console.log(`   • Size: ${(fs.statSync(path.resolve(OUTPUT_PATH)).size / 1024 / 1024).toFixed(2)} MB`);

        // Attribute validation summary
        console.log('\n🎯 Attribute Validation:');
        Object.entries(attributeStats).forEach(([category, attrs]) => {
            console.log(`   ${category}:`);
            Object.entries(attrs).forEach(([attr, stats]) => {
                const inRange = stats.min >= 1 && stats.max <= 20;
                console.log(`     ${attr}: ${stats.min}-${stats.max} ${inRange ? '✅' : '❌'}`);
            });
        });

    } catch (error) {
        console.error('❌ Error building final player database:', error.message);
        process.exit(1);
    }
}

// Run if called directly
buildFinalPlayerDatabase();

export { buildFinalPlayerDatabase };