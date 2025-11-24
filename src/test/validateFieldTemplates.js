/**
 * @file validateFieldTemplates.js
 * @description Test script to validate all field formations against T20 rules
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { validateFieldingSetup, getViolationMessages } from '../core/match-engine/validation/FieldingRulesValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load both config files
const formationsConfig = JSON.parse(
  readFileSync(join(__dirname, '../data/config/field-formations-config.json'), 'utf-8')
);
const positionsDatabase = JSON.parse(
  readFileSync(join(__dirname, '../data/config/fielding-positions-complete.json'), 'utf-8')
);

// Create position lookup
const positionLookup = {};
positionsDatabase.positions.forEach(pos => {
  positionLookup[pos.id] = pos;
});

// Resolve position IDs to full position data
function resolveFormationPositions(positionIds) {
  return positionIds
    .map(posId => positionLookup[posId])
    .filter(pos => pos !== null);
}

console.log('='.repeat(80));
console.log('FIELD FORMATION VALIDATION TEST');
console.log('='.repeat(80));
console.log('');

const formations = formationsConfig.formations;
const formationNames = Object.keys(formations);

console.log(`Testing ${formationNames.length} field formations...\n`);

let totalTemplates = 0;
let validPowerplay = 0;
let validPostPowerplay = 0;
let totalViolations = 0;

// Test each formation
formationNames.forEach((formationKey) => {
  const formation = formations[formationKey];
  // Resolve position IDs to full position data
  const positions = resolveFormationPositions(formation.positionIds);

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📋 Formation: ${formation.name || formationKey}`);
  console.log(`   Style: ${formation.formationStyle || 'neutral'}`);
  console.log(`   Description: ${formation.description || 'N/A'}`);
  console.log(`${'─'.repeat(80)}`);

  if (!positions || positions.length !== 11) {
    console.log(`❌ ERROR: Invalid formation - ${positions?.length || 0} positions (need 11)`);
    console.log(`   Missing positions: ${formation.positionIds.filter(id => !positionLookup[id]).join(', ')}`);
    return;
  }

  totalTemplates++;

  // Test for powerplay (over 1)
  console.log('\n🔍 Powerplay Test (Over 1):');
  const powerplayResult = validateFieldingSetup(positions, 1);

  if (powerplayResult.isValid) {
    console.log(`  ✅ VALID for powerplay`);
    validPowerplay++;
  } else {
    console.log(`  ❌ INVALID for powerplay - ${powerplayResult.criticalCount} critical violation(s)`);
    totalViolations += powerplayResult.violations.length;
  }

  console.log(`  📊 Stats:`);
  console.log(`     - Fielders outside circle: ${powerplayResult.summary.fieldersOutsideCircle}/${powerplayResult.summary.maxOutsideCircle}`);
  console.log(`     - Close catchers: ${powerplayResult.summary.closeCatchers || 0}`);
  console.log(`     - Fielders on leg side: ${powerplayResult.summary.fieldersLegSide}/${powerplayResult.summary.maxLegSide}`);
  console.log(`     - Behind square leg: ${powerplayResult.summary.fieldersBehindSquareLeg}/${powerplayResult.summary.maxBehindSquareLeg}`);

  if (powerplayResult.violations.length > 0) {
    console.log(`  ⚠️  Violations:`);
    getViolationMessages(powerplayResult.violations).forEach(msg => {
      console.log(`     ${msg}`);
    });
  }

  // Test for post-powerplay (over 10)
  console.log('\n🔍 Post-Powerplay Test (Over 10):');
  const postPowerplayResult = validateFieldingSetup(positions, 10);

  if (postPowerplayResult.isValid) {
    console.log(`  ✅ VALID for post-powerplay`);
    validPostPowerplay++;
  } else {
    console.log(`  ❌ INVALID for post-powerplay - ${postPowerplayResult.criticalCount} critical violation(s)`);
    totalViolations += postPowerplayResult.violations.length;
  }

  console.log(`  📊 Stats:`);
  console.log(`     - Fielders outside circle: ${postPowerplayResult.summary.fieldersOutsideCircle}/${postPowerplayResult.summary.maxOutsideCircle}`);
  console.log(`     - Fielders on leg side: ${postPowerplayResult.summary.fieldersLegSide}/${postPowerplayResult.summary.maxLegSide}`);
  console.log(`     - Behind square leg: ${postPowerplayResult.summary.fieldersBehindSquareLeg}/${postPowerplayResult.summary.maxBehindSquareLeg}`);

  if (postPowerplayResult.violations.length > 0) {
    console.log(`  ⚠️  Violations:`);
    getViolationMessages(postPowerplayResult.violations).forEach(msg => {
      console.log(`     ${msg}`);
    });
  }
});

// Summary
console.log('\n');
console.log('='.repeat(80));
console.log('VALIDATION SUMMARY');
console.log('='.repeat(80));
console.log(`Total Templates Tested: ${totalTemplates}`);
console.log(`Valid for Powerplay: ${validPowerplay}/${totalTemplates} (${Math.round(validPowerplay/totalTemplates*100)}%)`);
console.log(`Valid for Post-Powerplay: ${validPostPowerplay}/${totalTemplates} (${Math.round(validPostPowerplay/totalTemplates*100)}%)`);
console.log(`Total Violations Found: ${totalViolations}`);
console.log('');

if (validPowerplay === totalTemplates && validPostPowerplay === totalTemplates) {
  console.log('✅ ALL TEMPLATES PASSED VALIDATION!');
} else {
  console.log('⚠️  SOME TEMPLATES HAVE VIOLATIONS - Review and fix before deployment');
}

console.log('='.repeat(80));
