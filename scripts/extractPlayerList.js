/**
 * Extract player IDs and names for wicketkeeper identification
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const masterDbPath = path.join(__dirname, '..', 'src', 'data', 'players', 'master_player_database.json');
const outputPath = path.join(__dirname, 'player_list_for_keeper_research.json');

console.log('Loading master player database...');
const database = JSON.parse(fs.readFileSync(masterDbPath, 'utf-8'));
const players = database.players || [];

console.log(`Total players in database: ${players.length}`);

// Extract ID, name, role, and keeping attributes
const playerList = players.map(player => ({
  id: player.id,
  name: player.name,
  currentRole: player.role,
  keepingAttributes: {
    keeping: player.attributes?.fielding?.keeping || 0,
    collecting: player.attributes?.fielding?.collecting || 0,
    stumping: player.attributes?.fielding?.stumping || 0,
    reflexes: player.attributes?.fielding?.reflexes || 0
  }
}));

// Sort by keeping attribute (highest first) to help identify likely keepers
playerList.sort((a, b) => b.keepingAttributes.keeping - a.keepingAttributes.keeping);

// Save full list
fs.writeFileSync(outputPath, JSON.stringify(playerList, null, 2));
console.log(`\nPlayer list saved to: ${outputPath}`);

// Display top 30 players by keeping attribute (likely keepers)
console.log('\n=== Top 30 Players by Keeping Attribute ===');
console.log('(Likely wicketkeepers - for web research verification)\n');
playerList.slice(0, 30).forEach((player, index) => {
  console.log(`${index + 1}. ${player.name} (ID: ${player.id}) - Current Role: ${player.currentRole}`);
  console.log(`   Keeping: ${player.keepingAttributes.keeping}, Collecting: ${player.keepingAttributes.collecting}, Stumping: ${player.keepingAttributes.stumping}, Reflexes: ${player.keepingAttributes.reflexes}`);
});

// Count by current role
const roleCount = {};
playerList.forEach(player => {
  roleCount[player.currentRole] = (roleCount[player.currentRole] || 0) + 1;
});

console.log('\n=== Current Role Distribution ===');
Object.entries(roleCount).forEach(([role, count]) => {
  console.log(`${role}: ${count}`);
});

console.log('\n✓ Done!');
