import fs from 'fs';

const db = JSON.parse(fs.readFileSync('C:/Users/praha/Documents/Projects/Cricket-Manager-25/src/data/players/master_player_database.json', 'utf8'));

// All wicketkeeper names from web research
const keeperNames = [
  'MS Dhoni',
  'Dinesh Karthik',
  'Jos Buttler',
  'Matthew Wade',
  'Mushfiqur Rahim',
  'Jonny Bairstow',
  'Quinton de Kock',
  'Mohammad Rizwan',
  'KL Rahul',
  'Alex Carey',
  'Heinrich Klaasen',
  'Phil Salt',
  'Shai Hope',
  'Nicholas Pooran',
  'Ishan Kishan',
  'Tom Banton',
  'Rishabh Pant',
  'Kusal Mendis',
  'Monank Patel',
  'Shreyas Movva',
  'Ben Duckett',
  'Litton Das',
  'Sarfaraz Ahmed',
  'Andre Fletcher',
  'Johnson Charles',
  'Sadeera Samarawickrama',
  'Lorcan Tucker',
  'Devon Conway',
  'Rahmanullah Gurbaz',
  'Zane Green',
  'Finn Allen',
  'Tristan Stubbs'
];

console.log('Searching for wicketkeepers in database...\n');

const found = [];
const notFound = [];

keeperNames.forEach(name => {
  const player = db.players.find(p => p.name === name);
  if (player) {
    found.push({ name, id: player.id, currentRole: player.role });
  } else {
    notFound.push(name);
  }
});

console.log(`✓ FOUND ${found.length} wicketkeepers in database:\n`);
found.forEach(p => {
  console.log(`  "${p.id}",  // ${p.name} (currently: ${p.currentRole})`);
});

console.log(`\n⚠ NOT FOUND (${notFound.length} players):`);
notFound.forEach(name => console.log(`  - ${name}`));

console.log(`\n\nTotal: ${found.length} of ${keeperNames.length} wicketkeepers found in database`);
