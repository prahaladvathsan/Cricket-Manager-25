/**
 * Fix fielding coordinates to match correct coordinate system
 *
 * Correct system:
 * - Bowler/Non-striker: y = -10 (BOTTOM of screen, negative Y)
 * - Keeper/Striker: y = +20 (TOP of screen, positive Y)
 * - Origin at center (0, 0)
 * - Positive X = leg side (right-hander)
 * - Negative X = off side
 *
 * Cricket field geometry:
 * - "Behind striker" = positive Y (towards keeper, above striker)
 * - "In front of striker" = negative Y (towards bowler, below striker)
 * - "Square" = Y around 0-10 (perpendicular to pitch)
 * - "Behind square" on leg side = positive Y > 11
 * - "In front of square" on leg side = negative Y < 11
 */

const fs = require('fs');
const path = require('path');

// Read the current positions file
const positionsPath = path.join(__dirname, '../src/data/config/fielding-positions-complete.json');
const positionsData = JSON.parse(fs.readFileSync(positionsPath, 'utf8'));

// Positions that need Y-coordinate adjustments
// Format: { id: 'position_id', correctY: number, reason: 'explanation' }
const corrections = [
  // Deep fielders on off side (should be around boundary ~65m from striker)
  { id: 'deep_point', correctY: 5, reason: 'Square on off side, slightly forward of striker' },
  { id: 'deep_cover', correctY: -15, reason: 'Forward of square on off side' },
  { id: 'deep_extra_cover', correctY: -20, reason: 'Between cover and long-off' },
  { id: 'long_off', correctY: -55, reason: 'Straight, deep on off side (near boundary behind bowler)' },

  // Deep fielders on leg side
  { id: 'deep_square_leg', correctY: 5, reason: 'Square on leg side, slightly forward' },
  { id: 'deep_mid_wicket', correctY: -10, reason: 'Forward of square on leg side' },
  { id: 'long_on', correctY: -55, reason: 'Straight, deep on leg side (near boundary behind bowler)' },

  // Behind square on leg side
  { id: 'deep_fine_leg', correctY: 40, reason: 'Behind square leg, near boundary behind striker' },
  { id: 'long_leg', correctY: 35, reason: 'Behind square, between square leg and fine leg' },

  // Behind square on off side
  { id: 'deep_backward_point', correctY: 15, reason: 'Behind square on off side' },
  { id: 'third_man', correctY: 40, reason: 'Behind square on off side, near boundary' },

  // Ensure close fielders are correct
  { id: 'short_third_man', correctY: 12, reason: 'Behind striker, close on off side' },
  { id: 'short_fine_leg', correctY: 14, reason: 'Behind striker, close on leg side' },
];

console.log('Fixing fielding coordinates...\n');

// Apply corrections
let changesCount = 0;
corrections.forEach(correction => {
  const position = positionsData.positions.find(p => p.id === correction.id);
  if (position) {
    const oldY = position.y;
    position.y = correction.correctY;

    // Recalculate polar coordinates
    const distance = Math.sqrt(position.x * position.x + position.y * position.y);
    const angleRad = Math.atan2(position.y, position.x);
    const angleDeg = angleRad * 180 / Math.PI;

    position.polarDistance = Math.round(distance * 10) / 10;
    position.polarAngle = Math.round(angleDeg);

    console.log(`✓ ${position.name.padEnd(20)} y: ${String(oldY).padStart(4)} → ${String(correction.correctY).padStart(4)} (${correction.reason})`);
    changesCount++;
  } else {
    console.log(`✗ Position '${correction.id}' not found`);
  }
});

// Write back the corrected file
fs.writeFileSync(positionsPath, JSON.stringify(positionsData, null, 2));

console.log(`\n${changesCount} positions corrected.`);
console.log('Fielding positions file updated successfully!');
