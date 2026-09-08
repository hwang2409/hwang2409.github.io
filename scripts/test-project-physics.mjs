import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Transpile the dependency-free models in memory; no browser or generated files.
const modules = new Map();
async function physicsUrl(name) {
  if (modules.has(name)) return modules.get(name);
  let source = await readFile(new URL(`../src/lib/physics/${name}.ts`, import.meta.url), 'utf8');
  for (const match of source.matchAll(/from ['"]\.\/(\w+)['"]/g)) {
    source = source.replace(match[0], `from '${await physicsUrl(match[1])}'`);
  }
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  modules.set(name, url);
  return url;
}
async function physics(name) { return import(await physicsUrl(name)); }

const { simulatePendulum, pendulumPositions, pendulumBytes, stepPendulum } = await physics('pendulum');
const { sampleIndex } = await physics('sampling');
const { simulateStack } = await physics('stack');
const { inclineForces } = await physics('friction');
const { simulateSpring, sampleSpring } = await physics('spring');
const { simulateProjectile } = await physics('integrators');
const { simulateFixedTrace, sampleTrace } = await physics('timestep');

const a = simulatePendulum(2.2, 0.4);
assert.deepEqual(pendulumBytes(a), pendulumBytes(simulatePendulum(2.2, 0.4)));
const changed = simulatePendulum(2.2 + 1e-6, 0.4);
assert.notDeepEqual(pendulumBytes(a), pendulumBytes(changed));
const tipA = pendulumPositions(a.at(-1));
const tipB = pendulumPositions(changed.at(-1));
assert.ok(Math.hypot(tipA.x2 - tipB.x2, tipA.y2 - tipB.y2) > 0.5, 'perturbation must visibly separate the final tips');

// Independent energy equation: two unit point masses, two unit rods.
const energy = s => s.v1 ** 2 + 0.5 * (s.v1 + s.v2) ** 2
  + s.v1 * (s.v1 + s.v2) * Math.cos(s.q2)
  - 9.81 * (2 * Math.cos(s.q1) + Math.cos(s.q1 + s.q2));
let energyError = 0;
for (const p of a) {
  assert.ok(Object.values(p).every(Number.isFinite));
  const xy = pendulumPositions(p);
  assert.ok(Math.abs(Math.hypot(xy.x1, xy.y1) - 1) < 1e-12);
  assert.ok(Math.abs(Math.hypot(xy.x2 - xy.x1, xy.y2 - xy.y1) - 1) < 1e-12);
  energyError = Math.max(energyError, Math.abs(energy(p) - energy(a[0])));
}
assert.ok(energyError < 0.002, `RK4 energy drift: ${energyError}`);
for (const q1 of [-Math.PI, 0, Math.PI]) {
  for (const q2 of [-Math.PI, 0, Math.PI]) {
    assert.ok(simulatePendulum(q1, q2, 20).every(p => Object.values(p).every(Number.isFinite)));
  }
}
assert.equal(sampleIndex(a, -1), 0);
assert.equal(sampleIndex(a, 1e6), a.length - 1);
const slow = simulatePendulum(0.1, 0.2, 1, 0.02);
assert.equal(sampleIndex(slow, 0.105), 5);
for (const trace of [a, slow]) {
  for (let index = 0; index < trace.length; index += 1) {
    assert.equal(sampleIndex(trace, trace[index].time), index, `exact timestamp at sample ${index}`);
    if (index + 1 < trace.length) {
      const midpoint = (trace[index].time + trace[index + 1].time) / 2;
      assert.equal(sampleIndex(trace, midpoint), index, `between samples ${index} and ${index + 1}`);
    }
  }
}
for (const time of [-1, 2, 100]) {
  assert.equal(sampleIndex([{ time: 2 }], time), 0);
}

const low = simulateStack(1).at(-1);
const high = simulateStack(30).at(-1);
assert.ok(low.penetration > 0.1, 'low iterations visibly compress the stack');
assert.ok(high.penetration < 0.001, 'high iterations restore the stack');
assert.ok(high.penetration < low.penetration / 100);
for (let iterations = 1; iterations <= 30; iterations += 1) {
  assert.ok(simulateStack(iterations).every(p => p.heights.every(Number.isFinite)));
}
assert.equal(inclineForces(25, 0.5).acceleration, 0);
assert.ok(inclineForces(32, 0.5).acceleration > 0);
assert.equal(inclineForces(0, 0).acceleration, 0);
assert.ok(Math.abs(inclineForces(30, 0).acceleration - 4.905) < 1e-12);

const spring = simulateSpring(1, 0, 1, 0.02);
assert.equal(sampleSpring(spring, -1), spring[0].displacement);
assert.equal(sampleSpring(spring, 0.105), spring[5].displacement);
assert.equal(sampleSpring(spring, 100), spring.at(-1).displacement);
const projectile = simulateProjectile({ x: 7, y: 8 }, 'rk4', 0.17, 1);
for (const p of projectile) {
  assert.ok(Math.abs(p.y - (8 * p.time - 9.81 * p.time ** 2 / 2)) < 1e-10);
}
const fixed = simulateFixedTrace(0, 0, 3);
assert.deepEqual(fixed, simulateFixedTrace(1, 17, 3));
assert.equal(sampleTrace(fixed, -1), fixed[0].height);
assert.equal(sampleTrace(fixed, 100), fixed.at(-1).height);
console.log(`physics checks passed; energy drift ${energyError.toExponential(2)}, stack overlap ${low.penetration.toFixed(4)} -> ${high.penetration.toFixed(6)} m`);

const { body, Contacts, solveVelocity } = await physics('contacts');
const { createScene, stepScene, sceneEnergy, spawnBody, fireProjectile, createClock, SCENE_DT, BODY_LIMIT } = await physics('scene');
const { createBroadPhase, stepBroadPhase, findPairs } = await physics('broadphase');
const { muscleLength, muscleVelocity, muscleForce, muscleGeometry, createArm, stepArm } = await physics('muscle');

const playground = createScene();
const initialEnergy = sceneEnergy(playground);
let peakEnergy = initialEnergy;
for (let i = 0; i < 1800; i += 1) {
  stepScene(playground);
  peakEnergy = Math.max(peakEnergy, sceneEnergy(playground));
  for (const b of playground.bodies) {
    assert.ok([b.x, b.y, b.vx, b.vy, b.angle, b.spin].every(Number.isFinite));
    assert.ok(b.x > -0.05 && b.x < playground.width + 0.05 && b.y > -0.05 && b.y < playground.height + 0.05, 'bodies stay inside the scene');
  }
}
assert.ok(peakEnergy < initialEnergy * 1.03, `unforced playground energy grew: ${initialEnergy} -> ${peakEnergy}`);
assert.ok(sceneEnergy(playground) < initialEnergy * 0.65, 'friction and bounce dissipate energy');
const replayA = createScene(), replayB = createScene();
for (let i = 0; i < 180; i += 1) { stepScene(replayA); stepScene(replayB); }
assert.deepEqual(replayA.bodies, replayB.bodies, 'composed scenes replay deterministically');

// Exact momentum and restitution anchor without external forces or boundary contact.
const impact = createScene(); impact.bodies.length = 0; impact.gravity = 0; impact.friction = 0; impact.restitution = 0.6;
const shot = body('ball', 3, 4, 0.4, 8), target = body('ball', 5, 4, 0.4, 1);
shot.vx = 8; impact.bodies.push(shot, target);
const momentum = shot.mass * shot.vx;
for (let i = 0; i < 60; i += 1) stepScene(impact);
assert.ok(Math.abs(shot.mass * shot.vx + target.mass * target.vx - momentum) < 1e-9, 'isolated projectile conserves linear momentum');
assert.ok(Math.abs(target.vx - shot.vx - 0.6 * 8) < 1e-9, 'normal impulse obeys restitution');

// Clipped box contacts transmit impulse and angular momentum, including off-center impact.
const contacts = new Contacts(8);
const box = body('box', 5, 4, 0.5, 1), ball = body('ball', 4.15, 4.3, 0.4, 8);
ball.vx = 8;
contacts.pair(ball, box, 0.3);
assert.ok(contacts.count > 0);
for (let i = 0; i < 20; i += 1) for (let j = 0; j < contacts.count; j += 1) solveVelocity(contacts.rows[j], 0.55);
assert.ok(Math.abs(box.spin) > 0.1, 'off-center impact rotates the box');
assert.ok(Math.abs(ball.mass * ball.vx + box.mass * box.vx - 64) < 1e-9);
const angularMomentum = b => b.mass * (b.x * b.vy - b.y * b.vx) + b.spin / b.inverseInertia;
assert.ok(Math.abs(angularMomentum(ball) + angularMomentum(box) - (-4.3 * 64)) < 1e-9, 'contact impulse conserves angular momentum');
const wall = createScene(true);
assert.equal(fireProjectile(wall, 12 * Math.PI / 180, 14), true);
assert.equal(fireProjectile(wall, 0, 14), false, 'cannot spawn intersecting projectiles');
for (let i = 0; i < 540; i += 1) stepScene(wall);
assert.ok(wall.bodies.slice(0, 15).filter(b => Math.abs(b.x - 7.62) > 1.2).length >= 4, 'projectile visibly scatters the wall');
assert.ok(wall.bodies.every(b => [b.x, b.y, b.angle, b.spin].every(Number.isFinite)));

const capped = createScene(); capped.bodies.length = 0;
for (let i = 0; i < BODY_LIMIT; i += 1) assert.ok(spawnBody(capped, 'box', 1 + i % 8, 1 + Math.floor(i / 8)));
assert.equal(spawnBody(capped, 'ball'), false);
assert.equal(capped.bodies.length, BODY_LIMIT);
const clockA = createClock(SCENE_DT), clockB = createClock(SCENE_DT);
let stepsA = 0, stepsB = 0;
clockA(-100, () => stepsA++);
for (const time of [13, 40, 77, 180, 300]) clockA(time, () => stepsA++);
clockB(300, () => stepsB++);
assert.equal(stepsA, stepsB, 'fixed-step accumulator is independent of frame partition');
assert.equal(stepsA, 54);

// Live elapsed can exceed the first reduced-motion [step] timestamp.
const switched = createScene(), switchedClock = createClock(SCENE_DT);
for (const elapsed of [300, 600, 900, 1203]) switchedClock(elapsed, () => stepScene(switched));
const liveTime = switched.time;
switchedClock(350, () => stepScene(switched));
assert.ok(Math.abs(switched.time - liveTime - 0.35) < 1e-12, 'first reduced-motion step advances 63 physics steps');
switchedClock(700, () => stepScene(switched));
assert.ok(Math.abs(switched.time - liveTime - 0.7) < 1e-12, 'second reduced-motion step advances normally');

const broad = createBroadPhase();
assert.deepEqual(broad.bodies, createBroadPhase().bodies, 'seeded broad phase repeats');
for (let frame = 0; frame < 240; frame += 1) {
  stepBroadPhase(broad, 1 / 120);
  assert.equal(findPairs(broad, false), 780);
  const expected = new Set();
  for (let i = 0; i < broad.bodies.length; i += 1) for (let j = i + 1; j < broad.bodies.length; j += 1) {
    const a = broad.bodies[i], b = broad.bodies[j];
    if (Math.abs(a.x - b.x) <= a.radius + b.radius && Math.abs(a.y - b.y) <= a.radius + b.radius) expected.add(`${i}:${j}`);
  }
  assert.ok(findPairs(broad, true) < 780 / 4, 'sweep prunes candidate pairs');
  assert.ok(broad.comparisons < 780 / 3, 'sweep does less pair work');
  const actual = new Set();
  for (let i = 0; i < broad.count; i += 1) {
    const a = broad.pairs[2 * i], b = broad.pairs[2 * i + 1];
    actual.add(`${Math.min(a, b)}:${Math.max(a, b)}`);
  }
  assert.deepEqual(actual, expected, 'sweep retains exactly every overlapping AABB pair');
}
assert.equal(muscleLength(0.5), 0); assert.equal(muscleLength(1.6), 0);
assert.equal(muscleLength(1), 1);
assert.equal(muscleLength(0.75), 0.5);
assert.ok(Math.abs(muscleLength(1.3) - 0.5) < 1e-12);
assert.ok(muscleLength(0.8) > muscleLength(0.6));
assert.ok(muscleLength(1.1) > muscleLength(1.4));
assert.equal(muscleVelocity(-1), 0); assert.equal(muscleVelocity(0), 1); assert.equal(muscleVelocity(1), 1.2);
assert.ok(muscleVelocity(-0.5) < muscleVelocity(0) && muscleVelocity(0.1) > muscleVelocity(0));
assert.equal(muscleForce(0, 0.8, 0), 0);
assert.equal(muscleForce(1, 0.8, 0), 100);
for (const q of [0.2, 0.8, 1.8, 2.8]) {
  const h = 1e-6;
  const derivative = (muscleGeometry(q + h, 0).length - muscleGeometry(q - h, 0).length) / (2 * h);
  assert.ok(Math.abs(derivative + muscleGeometry(q, 0).momentArm) < 1e-9, 'tendon moment arm equals negative length Jacobian');
}
// Compare one full step against a refined reference and the former Euler-first scheme.
const firstStep = createArm(), refined = createArm(), oldScheme = createArm();
const armDt = 1 / 240;
stepArm(firstStep, armDt);
for (let i = 0; i < 256; i += 1) stepArm(refined, armDt / 256);
oldScheme.activation += armDt * oldScheme.control / 0.02;
oldScheme.state = stepPendulum(oldScheme.state, armDt, s => {
  const g = muscleGeometry(s.q2, s.v2);
  return { shoulder: -0.8 * s.v1, elbow: muscleForce(oldScheme.activation, g.length, g.velocity) * g.momentArm - 0.6 * s.v2 };
});
// Full-step RK4 truncation error is below 2e-5; Euler-first errors exceed 0.01.
assert.ok(Math.abs(firstStep.activation - refined.activation) < 2e-5, 'activation follows RK4 on the first step');
for (const key of ['q1', 'q2', 'v1', 'v2']) {
  assert.ok(Math.abs(firstStep.state[key] - refined.state[key]) < 2e-5, `mechanical stage integration: ${key}`);
}
assert.ok(Math.abs(firstStep.activation - oldScheme.activation) > 0.01, 'first activation differs from Euler-pre-step');
assert.ok(Math.abs(firstStep.state.v2 - oldScheme.state.v2) > 0.005, 'first elbow velocity differs from Euler-pre-step');
const relaxed = createArm(); relaxed.control = 0;
const active = createArm(); active.control = 0.8;
const activeReplay = createArm(); activeReplay.control = 0.8;
const armEnergy = energy(relaxed.state);
let maxArmEnergy = armEnergy;
for (let i = 0; i < 2400; i += 1) {
  stepArm(relaxed, 1 / 240); stepArm(active, 1 / 240); stepArm(activeReplay, 1 / 240);
  maxArmEnergy = Math.max(maxArmEnergy, energy(relaxed.state));
  assert.ok(Object.values(active.state).every(Number.isFinite));
}
assert.ok(maxArmEnergy <= armEnergy + 1e-6, 'zero activation cannot add mechanical energy');
assert.equal(relaxed.activation, 0);
assert.deepEqual(active, activeReplay, 'coupled muscle stages replay deterministically');
assert.ok(Math.abs(active.state.q2 - relaxed.state.q2) > 0.3, 'activation moves the gravity-loaded elbow');
console.log(`composed checks passed; playground peak ${peakEnergy.toFixed(2)}/${initialEnergy.toFixed(2)} J; sweep ${broad.count}/780 pairs`);
