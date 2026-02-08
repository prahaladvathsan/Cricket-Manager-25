import fs from 'fs';
import path from 'path';

const files = [
  'public/data/master_player_database.json',
  'public/data/master_player_database_updated.json'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`Processing ${file}...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (data.players && Array.isArray(data.players)) {
      data.players = data.players.map(player => {
        const { playstyleRatings, topPlaystyles, primaryPlaystyle, ...rest } = player;
        return rest;
      });
      
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Successfully stripped playstyle data from ${file}`);
    } else {
      console.log(`No players array found in ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
