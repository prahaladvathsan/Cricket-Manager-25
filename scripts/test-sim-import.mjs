// Smoke test: can we import SimpleBallSimulator in Node?
import SimpleBallSimulator from '../src/core/match-engine/core/SimpleBallSimulator.js';
console.log('Import OK');
const sim = new SimpleBallSimulator({ silent: true, captureMetadata: true });
console.log('Constructor OK');
console.log(sim.getInfo().name);
