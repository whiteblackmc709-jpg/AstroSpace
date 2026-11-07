import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../play/play.js', import.meta.url), 'utf8');
const extract = (name, next) => {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}()`);
  const end = next ? source.indexOf(`\nfunction ${next}(`, start) : source.length;
  assert.notEqual(end, -1, `Missing next function after ${name}()`);
  return source.slice(start, end);
};

const advance = extract('advanceRegion', 'jump');
const travel = extract('updateInterplanetaryTravel', 'advanceRegion');
const startTravel = extract('beginPlayerFlight', 'updateTransitPanel');
const finish = extract('finishTravelLanding', 'updateInterplanetaryTravel');
const input = extract('onKeyDown', 'onPointerDown');

assert.match(advance, /beginPlayerFlight\(to\)/,
  'Every region transition must use the player-powered flight sequence.');
assert.doesNotMatch(advance, /buildWorld\(/,
  'Region completion must not teleport directly into a rebuilt world.');
assert.match(travel, /tr\.samePlanet/, 'Regional and interplanetary routes need separate phases.');
assert.match(travel, /VERTICAL ASCENT/, 'Regional route must lift the player above the surface.');
assert.match(travel, /AERIAL FRONTIER CROSSING/, 'Regional route must fly across the terrain.');
assert.match(travel, /DEEP-SPACE CROSSING/, 'Interplanetary route must cross a space scene.');
assert.match(travel, /ATMOSPHERIC RE-ENTRY|POWERED TOUCHDOWN/, 'Travel must end with a powered descent.');
assert.match(startTravel, /flightMode=true/, 'The exosuit must enter flight mode.');
assert.match(startTravel, /touchKeys\.clear\(\)/, 'Held input must be cleared before the cinematic.');
assert.match(finish, /flightMode=false/, 'The player must regain ground movement after landing.');
assert.match(input, /if\(travelSequence\)/, 'Keyboard input must not interrupt scripted flight.');
assert.match(source, /function animateExosuitFlight\(dt\)/, 'The pilot pose and thrusters must animate during transit.');
assert.match(source, /function updateFlightReadout\(\)/, 'Flight must expose live altitude and velocity.');
assert.doesNotMatch(source, /function createCraft\(/, 'There must be no carrier/aircraft travel generator.');

console.log('Flight transition contract: PASS — every region uses pilot-powered ascent, aerial traversal or deep-space crossing, controlled re-entry and landing.');
