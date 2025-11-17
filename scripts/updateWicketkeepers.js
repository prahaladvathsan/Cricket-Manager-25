/**
 * Update player database to set wicketkeeper roles and attributes
 * Based on web research identifying 29 confirmed wicketkeepers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to source database (the one we edit)
const sourceDbPath = path.join(__dirname, '..', 'src', 'data', 'players', 'master_player_database.json');
const backupPath = path.join(__dirname, '..', 'src', 'data', 'players', 'master_player_database_backup_pre_keepers.json');

// Confirmed wicketkeepers from web research (using actual database IDs)
const WICKETKEEPER_IDS = [
  '28081',    // MS Dhoni
  '308967',   // Jos Buttler
  '379143',   // Quinton de Kock
  '422108',   // KL Rahul
  '436757',   // Heinrich Klaasen
  '669365',   // Phil Salt
  '581379',   // Shai Hope
  '604302',   // Nicholas Pooran
  '720471',   // Ishan Kishan
  '931581',   // Rishabh Pant
  '629074',   // Kusal Mendis
  '1159641',  // Monank Patel
  '1206190',  // Shreyas Movva
  '521637',   // Ben Duckett
  '536936',   // Litton Das
  '333066',   // Johnson Charles
  '379140',   // Devon Conway
  '974087',   // Rahmanullah Gurbaz
];

// Medium confidence (can keep but primarily batsmen)
const MEDIUM_CONFIDENCE_KEEPERS = [
  '959759',   // Finn Allen
  '595978',   // Tristan Stubbs
];

// All wicketkeepers to update (high + medium)
const ALL_KEEPERS = [...WICKETKEEPER_IDS, ...MEDIUM_CONFIDENCE_KEEPERS];

// Create backup first
console.log('Creating backup...');
fs.copyFileSync(sourceDbPath, backupPath);
console.log(`✓ Backup saved to: ${backupPath}`);

console.log('\nLoading player database from:', sourceDbPath);
const database = JSON.parse(fs.readFileSync(sourceDbPath, 'utf-8'));
const players = database.players || database; // Handle both formats

console.log(`Total players in database: ${players.length}`);
console.log(`Wicketkeepers to update: ${ALL_KEEPERS.length}\n`);

let updatedCount = 0;
let notFoundCount = 0;
const notFound = [];

// Update each wicketkeeper
players.forEach(player => {
  if (ALL_KEEPERS.includes(player.id)) {
    const oldRole = player.role;

    // Update role
    player.role = 'wicket-keeper';

    // Update keeping attributes to 10-20 range (elite keepers)
    if (player.attributes && player.attributes.fielding) {
      const fielding = player.attributes.fielding;

      // Generate realistic keeping attributes (10-20 range)
      // MS Dhoni special case - boost his keeping to 18
      if (player.id === '28081') {
        fielding.keeping = 18;
        fielding.collecting = 17;
        fielding.stumping = 19;  // Legendary stumping
        fielding.reflexes = 16;
      } else {
        // Other keepers: random 10-20 range
        fielding.keeping = Math.floor(Math.random() * 11) + 10;     // 10-20
        fielding.collecting = Math.floor(Math.random() * 11) + 10;  // 10-20
        fielding.stumping = Math.floor(Math.random() * 11) + 10;    // 10-20

        // Reflexes might already be good, ensure it's at least 8
        if (fielding.reflexes < 8) {
          fielding.reflexes = Math.floor(Math.random() * 8) + 8;    // 8-15
        }
      }
    }

    console.log(`✓ Updated ${player.name} (${player.id}): ${oldRole} → wicket-keeper`);
    console.log(`  Keeping: ${player.attributes.fielding.keeping}, Collecting: ${player.attributes.fielding.collecting}, Stumping: ${player.attributes.fielding.stumping}`);
    updatedCount++;
  }
});

// Check for keepers not found
ALL_KEEPERS.forEach(id => {
  const found = players.find(p => p.id === id);
  if (!found) {
    notFound.push(id);
    notFoundCount++;
  }
});

// Update non-keepers to have low keeping attributes (1-4 range)
console.log('\nUpdating non-keepers to have low keeping attributes...');
let nonKeeperUpdates = 0;

players.forEach(player => {
  if (player.role !== 'wicket-keeper' && player.attributes && player.attributes.fielding) {
    const fielding = player.attributes.fielding;

    // Only update if keeping is currently high (>4)
    if (fielding.keeping > 4) {
      fielding.keeping = Math.floor(Math.random() * 4) + 1;       // 1-4
      fielding.collecting = Math.floor(Math.random() * 4) + 1;    // 1-4
      fielding.stumping = Math.floor(Math.random() * 4) + 1;      // 1-4
      nonKeeperUpdates++;
    }
  }
});

console.log(`✓ Updated ${nonKeeperUpdates} non-keepers to have low keeping attributes (1-4)`);

// Save updated database (preserve original structure)
fs.writeFileSync(sourceDbPath, JSON.stringify(database, null, 2));

console.log('\n=== Update Summary ===');
console.log(`✓ Successfully updated ${updatedCount} wicketkeepers`);
console.log(`✓ Updated ${nonKeeperUpdates} non-keepers to low keeping attributes`);
if (notFoundCount > 0) {
  console.log(`⚠ ${notFoundCount} wicketkeepers not found in database:`);
  notFound.forEach(id => console.log(`  - ${id}`));
}
console.log(`\n✓ Database saved to: ${sourceDbPath}`);
console.log(`✓ Backup available at: ${backupPath}`);
console.log('\n✓ Done! Player roles and attributes updated.');
