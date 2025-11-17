import fs from 'fs';
const db = JSON.parse(fs.readFileSync('C:/Users/praha/Documents/Projects/Cricket-Manager-25/src/data/players/master_player_database.json', 'utf8'));
console.log('Wicketkeepers in database:');
db.players.filter(p => p.role === 'wicket-keeper').forEach(p => {
  console.log(`${p.name} (ID: ${p.id})`);
});
console.log(`\nTotal: ${db.players.filter(p => p.role === 'wicket-keeper').length} wicketkeepers`);
