/**
 * Add additional wicketkeepers identified manually by user
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDbPath = path.join(__dirname, '..', 'src', 'data', 'players', 'master_player_database.json');
const backupPath = path.join(__dirname, '..', 'src', 'data', 'players', 'master_player_database_backup_pre_additional_keepers.json');

// Additional wicketkeepers identified by user
const ADDITIONAL_KEEPERS = [
  '1277545',  // Abishek Porel
  '1175488',  // Dhruv Jurel
  '824541',   // Jaker Ali
  '1096092',  // Jamie Smith
  '721867',   // Jitesh Sharma
  '662235',   // Josh Inglis
  '300631',   // Kusal Perera
  '417268',   // Matthew Cross
  '1205559',  // Mohammad Haris
  '1161024',  // Prabhsimran Singh
  '1388460',  // Rahul Chopra
  '596097',   // Rubin Hermann
  '425943',   // Sanju Samson
  '1127317',  // Scott Edwards
  '625964'    // Tim Seifert
];

// Create backup first
console.log('Creating backup...');
fs.copyFileSync(sourceDbPath, backupPath);
console.log(`✓ Backup saved to: ${backupPath}`);

console.log('\nLoading player database from:', sourceDbPath);
const database = JSON.parse(fs.readFileSync(sourceDbPath, 'utf-8'));
const players = database.players || [];

console.log(`Total players in database: ${players.length}`);
console.log(`Additional wicketkeepers to add: ${ADDITIONAL_KEEPERS.length}\n`);

let updatedCount = 0;
let notFoundCount = 0;
const notFound = [];

// Update each additional wicketkeeper
players.forEach(player => {
  if (ADDITIONAL_KEEPERS.includes(player.id)) {
    const oldRole = player.role;

    // Update role
    player.role = 'wicket-keeper';

    // Update keeping attributes to 10-20 range (elite keepers)
    if (player.attributes && player.attributes.fielding) {
      const fielding = player.attributes.fielding;

      // Generate realistic keeping attributes (10-20 range)
      fielding.keeping = Math.floor(Math.random() * 11) + 10;     // 10-20
      fielding.collecting = Math.floor(Math.random() * 11) + 10;  // 10-20
      fielding.stumping = Math.floor(Math.random() * 11) + 10;    // 10-20

      // Reflexes might already be good, ensure it's at least 8
      if (fielding.reflexes < 8) {
        fielding.reflexes = Math.floor(Math.random() * 8) + 8;    // 8-15
      }
    }

    console.log(`✓ Updated ${player.name} (${player.id}): ${oldRole} → wicket-keeper`);
    console.log(`  Keeping: ${player.attributes.fielding.keeping}, Collecting: ${player.attributes.fielding.collecting}, Stumping: ${player.attributes.fielding.stumping}`);
    updatedCount++;
  }
});

// Check for keepers not found
ADDITIONAL_KEEPERS.forEach(id => {
  const found = players.find(p => p.id === id);
  if (!found) {
    notFound.push(id);
    notFoundCount++;
  }
});

// Save updated database (preserve original structure)
fs.writeFileSync(sourceDbPath, JSON.stringify(database, null, 2));

console.log('\n=== Update Summary ===');
console.log(`✓ Successfully updated ${updatedCount} additional wicketkeepers`);
if (notFoundCount > 0) {
  console.log(`⚠ ${notFoundCount} wicketkeepers not found in database:`);
  notFound.forEach(id => console.log(`  - ${id}`));
}
console.log(`\n✓ Database saved to: ${sourceDbPath}`);
console.log(`✓ Backup available at: ${backupPath}`);

// Count total keepers now
const totalKeepers = players.filter(p => p.role === 'wicket-keeper').length;
console.log(`\n✓ Total wicketkeepers in database: ${totalKeepers}`);
console.log('\n✓ Done! Additional wicketkeeper roles and attributes updated.');
