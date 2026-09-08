import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Transpile the dependency-free models in memory; no browser or generated files.
async function physics(name) {
  const source = await readFile(new URL(`../src/lib/physics/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { simulatePendulum, pendulumPositions, pendulumBytes } = await physics('pendulum');
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
