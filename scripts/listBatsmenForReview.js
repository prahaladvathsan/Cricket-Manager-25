import fs from 'fs';

const db = JSON.parse(fs.readFileSync('C:/Users/praha/Documents/Projects/Cricket-Manager-25/src/data/players/master_player_database.json', 'utf8'));

// Already identified wicketkeepers
const confirmedKeepers = [
  '28081',    // MS Dhoni
  '308967',   // Jos Buttler
  '333066',   // Johnson Charles
  '379140',   // Devon Conway
  '379143',   // Quinton de Kock
  '422108',   // KL Rahul
  '436757',   // Heinrich Klaasen
  '521637',   // Ben Duckett
  '536936',   // Litton Das
  '581379',   // Shai Hope
  '595978',   // Tristan Stubbs
  '604302',   // Nicholas Pooran
  '629074',   // Kusal Mendis
  '669365',   // Phil Salt
  '720471',   // Ishan Kishan
  '931581',   // Rishabh Pant
  '959759',   // Finn Allen
  '974087',   // Rahmanullah Gurbaz
  '1159641',  // Monank Patel
  '1206190'   // Shreyas Movva
];

// Get all batsmen who are NOT already marked as keepers
const batsmen = db.players.filter(p =>
  p.role === 'batsman' && !confirmedKeepers.includes(p.id)
);

console.log('=== BATSMEN FOR WICKETKEEPER REVIEW ===');
console.log(`Total batsmen (excluding ${confirmedKeepers.length} confirmed keepers): ${batsmen.length}\n`);
console.log('Please review the list below and mark any additional wicketkeepers:\n');

// Sort alphabetically for easier review
batsmen.sort((a, b) => a.name.localeCompare(b.name));

batsmen.forEach((player, index) => {
  console.log(`${(index + 1).toString().padStart(3)}. ${player.name.padEnd(35)} (ID: ${player.id})`);
});

console.log(`\n\nTotal: ${batsmen.length} batsmen to review`);
console.log('\nInstructions: Copy this list and mark any additional wicketkeepers you identify.');

// Also save to file for easier editing
const outputPath = 'C:/Users/praha/Documents/Projects/Cricket-Manager-25/scripts/batsmen_for_keeper_review.txt';
const output = batsmen.map((p, i) => `${(i + 1).toString().padStart(3)}. ${p.name.padEnd(35)} (ID: ${p.id})`).join('\n');
fs.writeFileSync(outputPath, output);
console.log(`\n✓ List also saved to: ${outputPath}`);
