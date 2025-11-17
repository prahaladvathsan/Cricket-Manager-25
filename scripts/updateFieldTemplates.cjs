/**
 * Update field templates to use corrected coordinates from fielding-positions-complete.json
 */

const fs = require('fs');
const path = require('path');

// Read the corrected positions
const positionsPath = path.join(__dirname, '../src/data/config/fielding-positions-complete.json');
const positionsData = JSON.parse(fs.readFileSync(positionsPath, 'utf8'));

// Read the field templates
const templatesPath = path.join(__dirname, '../src/data/config/field-positioning-config.json');
const templatesData = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

// Create a lookup map of position names to coordinates
const positionLookup = {};
positionsData.positions.forEach(pos => {
  positionLookup[pos.id] = { x: pos.x, y: pos.y };
  // Also add variations with underscores replaced
  const altId = pos.id.replace(/_/g, ' ').toLowerCase();
  positionLookup[altId] = { x: pos.x, y: pos.y };
});

console.log('Updating field templates with corrected coordinates...\n');

let totalUpdates = 0;
let totalPositions = 0;

// Update each template
Object.entries(templatesData.formations).forEach(([templateId, template]) => {
  console.log(`\n📋 ${template.name}`);
  let templateUpdates = 0;

  template.positions.forEach((pos, idx) => {
    totalPositions++;
    const posName = pos.name.toLowerCase();

    // Try to find matching position
    const correctCoords = positionLookup[posName] || positionLookup[posName.replace(/\s+/g, '_')];

    if (correctCoords) {
      if (pos.x !== correctCoords.x || pos.y !== correctCoords.y) {
        console.log(`  ${idx}. ${pos.name.padEnd(20)} (${pos.x}, ${pos.y}) → (${correctCoords.x}, ${correctCoords.y})`);
        pos.x = correctCoords.x;
        pos.y = correctCoords.y;
        templateUpdates++;
        totalUpdates++;
      }
    } else {
      console.log(`  ⚠️  ${idx}. ${pos.name} - no match found in position database`);
    }
  });

  if (templateUpdates === 0) {
    console.log('  ✓ All positions already correct');
  }
});

// Write back the updated templates
fs.writeFileSync(templatesPath, JSON.stringify(templatesData, null, 2));

console.log(`\n\n✅ ${totalUpdates} positions updated across ${Object.keys(templatesData.formations).length} templates`);
console.log(`📊 Total positions checked: ${totalPositions}`);
console.log('Field templates file updated successfully!');
