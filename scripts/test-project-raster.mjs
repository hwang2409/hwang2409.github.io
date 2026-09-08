import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Use the existing TypeScript compiler, as in test-project-physics.mjs.
// CommonJS output lets Node resolve the models' extensionless local imports.
const directory = await mkdtemp(new URL('../.raster-check-', import.meta.url));
const require = createRequire(import.meta.url);
let triangle, depth, perspective, shading, transform, mesh, pipeline, scene;
try {
  for (const name of ['triangle', 'frame', 'depth', 'perspective', 'shading', 'transform', 'mesh', 'pipeline', 'scene']) {
    const source = await readFile(new URL(`../src/lib/raster/${name}.ts`, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
    await writeFile(join(directory, `${name}.js`), outputText);
  }
  triangle = require(join(directory, 'triangle.js'));
  depth = require(join(directory, 'depth.js'));
  perspective = require(join(directory, 'perspective.js'));
  shading = require(join(directory, 'shading.js'));
  transform = require(join(directory, 'transform.js'));
  mesh = require(join(directory, 'mesh.js'));
  pipeline = require(join(directory, 'pipeline.js'));
  scene = require(join(directory, 'scene.js'));
} finally {
  await rm(directory, { recursive: true, force: true });
}
const { edge, interpolate, rasterize } = triangle;
const { renderDepth } = depth;
const { perspectiveAttribute, renderChecker } = perspective;
const { blinnPhong, lightDirection, renderSphere } = shading;

test('every project content widget marker is accepted by the page registry', async () => {
  const source = await readFile(new URL('../src/components/project-widgets/ProjectWidget.tsx', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } });
  // Only inspect registry names; client component imports need no DOM or rendering.
  const registry = {};
  runInNewContext(outputText, { exports: registry, require: () => ({}) });
  const projects = new URL('../content/projects/', import.meta.url);
  let count = 0;
  for (const file of (await readdir(projects)).filter((name) => name.endsWith('.md'))) {
    const content = await readFile(new URL(file, projects), 'utf8');
    for (const match of content.matchAll(/<!--\s*widget:\s*(.*?)\s*-->/gu)) {
      const accepted = [...match[0].matchAll(registry.widgetMarker)];
      assert.equal(accepted.length, 1, `${file}: unmapped widget ${match[1]}`);
      assert.equal(accepted[0][1], match[1]);
      assert.ok(registry.isProjectWidgetName(match[1]), `${file}: rejected widget ${match[1]}`);
      count += 1;
    }
  }
  assert.ok(count > 0, 'no project markers were checked');
  assert.equal(registry.isProjectWidgetName('toString'), false);
});

test('edge signs and barycentric interpolation match pixel centers', () => {
  const a = { x: 0, y: 0 }, b = { x: 4, y: 0 }, c = { x: 0, y: 4 };
  assert.equal(edge(a, b, c), 16);
  assert.equal(edge(b, a, c), -16);
  assert.equal(edge(a, b, { x: 2, y: 0 }), 0);
  rasterize([a, b, c], 4, 4, (x, y, weights) => {
    assert.deepEqual(weights, [1 - (x + y + 1) / 4, (x + 0.5) / 4, (y + 0.5) / 4]);
    assert.equal(interpolate([0, 4, 0], weights), x + 0.5);
    assert.equal(interpolate([0, 0, 4], weights), y + 0.5);
  });
});

test('shared diagonal belongs to exactly one triangle, with either winding', () => {
  const first = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }];
  const second = [{ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
  for (const reverse of [false, true]) {
    const counts = new Uint8Array(16);
    for (const triangle of [first, second]) {
      const points = reverse ? [triangle[2], triangle[1], triangle[0]] : triangle;
      rasterize(points, 4, 4, (x, y, weights) => {
        counts[y * 4 + x] += 1;
        assert.ok(weights.every((weight) => weight >= 0 && weight <= 1));
        assert.ok(Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
      });
    }
    assert.ok(counts.every((count) => count === 1));
  }
});

test('degenerate and wholly offscreen triangles emit no pixels', () => {
  for (const triangle of [
    [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }],
    [{ x: -5, y: -5 }, { x: -3, y: -5 }, { x: -3, y: -3 }],
  ]) {
    rasterize(triangle, 4, 4, () => assert.fail('unexpected coverage'));
  }
});

test('partly offscreen coverage stays within the framebuffer', () => {
  let count = 0;
  rasterize([{ x: -100, y: -100 }, { x: 100, y: 0 }, { x: 0, y: 100 }], 4, 4, (x, y) => {
    assert.ok(x >= 0 && x < 4 && y >= 0 && y < 4);
    count += 1;
  });
  assert.equal(count, 16);
});

test('depth test resolves both sides of the intersection independent of order', () => {
  const correct = renderDepth(true, false);
  assert.deepEqual(correct.pixels, renderDepth(true, true).pixels);
  const left = (90 * correct.width + 95) * 4;
  const right = (90 * correct.width + 145) * 4;
  assert.ok(correct.pixels[left] < correct.pixels[right]);
  for (const reverse of [false, true]) {
    const painter = renderDepth(false, reverse);
    assert.equal(painter.pixels[left], painter.pixels[right]);
    assert.notDeepEqual(painter.pixels, correct.pixels);
  }
});

test('perspective correction follows homogeneous interpolation', () => {
  assert.equal(perspectiveAttribute([0, 1, 0], [1, 1, 1], [0.5, 0.5, 0]), 0.5);
  assert.ok(Math.abs(perspectiveAttribute([0, 1, 0], [1, 0.25, 1], [0.5, 0.5, 0]) - 0.2) < 1e-12);
});

test('checker modes agree face-on and differ when tilted', () => {
  assert.deepEqual(renderChecker(0, false).pixels, renderChecker(0, true).pixels);
  assert.notDeepEqual(renderChecker(52, false).pixels, renderChecker(52, true).pixels);
});

test('the projected quad has a white border throughout the tilt range', () => {
  for (let tilt = 0; tilt <= 72; tilt += 1) {
    const frame = renderChecker(tilt, true);
    for (let y = 0; y < frame.height; y += 1) {
      assert.equal(frame.pixels[(y * frame.width) * 4], 255);
      assert.equal(frame.pixels[(y * frame.width + frame.width - 1) * 4], 255);
    }
    for (let x = 0; x < frame.width; x += 1) {
      assert.equal(frame.pixels[x * 4], 255);
      assert.equal(frame.pixels[((frame.height - 1) * frame.width + x) * 4], 255);
    }
  }
});

test('Blinn-Phong suppresses backlit specular and peaks toward the light', () => {
  assert.equal(blinnPhong({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }), 0.035);
  assert.ok(blinnPhong({ x: 0, y: 0, z: 1 }, lightDirection(0, 0)) > blinnPhong({ x: 0, y: 0, z: 1 }, lightDirection(60, 0)));
});

test('shading changes interior pixels but preserves the mesh silhouette', () => {
  const modes = ['flat', 'gouraud', 'blinn-phong'];
  const frames = modes.map((mode) => renderSphere(mode, -35, 30));
  for (const frame of frames) {
    for (let i = 0; i < frame.pixels.length; i += 4) {
      assert.equal(frame.pixels[i], frame.pixels[i + 1]);
      assert.equal(frame.pixels[i], frame.pixels[i + 2]);
      assert.equal(frame.pixels[i + 3], 255);
    }
  }
  assert.notDeepEqual(frames[0].pixels, frames[1].pixels);
  assert.notDeepEqual(frames[1].pixels, frames[2].pixels);
  // Backlighting keeps specular white from being confused with the background.
  const unlit = modes.map((mode) => renderSphere(mode, 180, 0).pixels
    .filter((_, i) => i % 4 === 0).map((gray) => gray === 255 ? 0 : 1));
  assert.ok(unlit[0].reduce((sum, value) => sum + value, 0) > 10000);
  assert.deepEqual(unlit[0], unlit[1]);
  assert.deepEqual(unlit[1], unlit[2]);
});

test('moving the light moves the highlight across the sphere', () => {
  function highlightX(azimuth) {
    const frame = renderSphere('blinn-phong', azimuth, 0);
    let total = 0;
    let count = 0;
    for (let y = 40; y < 140; y += 1) {
      for (let x = 40; x < 140; x += 1) {
        if (Math.hypot(x + 0.5 - 90, y + 0.5 - 90) >= 60) continue;
        if (frame.pixels[(y * frame.width + x) * 4] > 240) { total += x; count += 1; }
      }
    }
    assert.ok(count > 0);
    return total / count;
  }
  assert.ok(highlightX(-40) < 90);
  assert.ok(highlightX(40) > 90);
});

const { identity, transform: apply, modelMatrix, viewMatrix, projectionMatrix, boundsVisible } = transform;
const { Pipeline, stages, signedArea, depthTest } = pipeline;
const { Scene, objects } = scene;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('model rotation and camera view round-trip known coordinates', () => {
  const model = new Float64Array(16), view = new Float64Array(16), point = new Float64Array(4);
  for (const angle of [-2, -0.4, 0, 1.3]) {
    modelMatrix(model, angle, 1, 2, -3, 4);
    viewMatrix(view, angle, 0, 2, -3, 4);
    apply(point, 0, model, 0.2, 0.7, -2);
    apply(point, 0, view, point[0], point[1], point[2]);
    close(point[0], 0.2); close(point[1], 0.7); close(point[2], -2); close(point[3], 1);
  }
  for (const pitch of [-0.8, 0, 0.7]) {
    const yaw = 0.9, distance = 4.8;
    viewMatrix(view, yaw, pitch, Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance);
    apply(point, 0, view, 0, 0, 0);
    close(point[0], 0); close(point[1], 0); close(point[2], -distance);
  }
});

test('projection maps near and far exactly; inverse projection recovers distance and x/y', () => {
  const projection = new Float64Array(16), point = new Float64Array(4);
  const near = 0.5, far = 12;
  projectionMatrix(projection, 4 / 3, near, far);
  for (const distance of [near, 1, 4.8, far]) {
    apply(point, 0, projection, 0.2, -0.3, -distance);
    const z = point[2] / point[3];
    const recovered = 2 * near * far / (far + near - z * (far - near));
    close(recovered, distance);
    close(point[0] / point[3] * recovered / projection[0], 0.2);
    close(point[1] / point[3] * recovered / projection[5], -0.3);
    if (distance === near) close(z, -1);
    if (distance === far) close(z, 1);
  }
});

function trianglePipeline(vertices, stage = 'flat', size = 16) {
  const raster = new Pipeline(size, size), matrix = new Float64Array(16);
  identity(matrix);
  raster.begin(stage);
  raster.submit(new Float64Array(vertices), matrix, matrix, matrix);
  return raster;
}

const front = [-0.75, -0.75, -0.5, 0.75, -0.75, -0.5, 0, 0.75, -0.5];

test('backface sign keeps outward faces toward camera and rejects reversed winding', () => {
  assert.ok(signedArea(-0.75, -0.75, 0.75, -0.75, 0, 0.75) > 0);
  const forward = trianglePipeline(front);
  const reverse = trianglePipeline([...front.slice(6), ...front.slice(3, 6), ...front.slice(0, 3)]);
  assert.equal(forward.drawn, 1); assert.equal(forward.culled, 0);
  assert.equal(reverse.drawn, 0); assert.equal(reverse.culled, 1);
  assert.equal(trianglePipeline([...front.slice(6), ...front.slice(3, 6), ...front.slice(0, 3)], 'wireframe').drawn, 1);
});

test('depth rejects equal or farther fragments and accepts a nearer replacement', () => {
  const buffer = new Float64Array(1).fill(Infinity);
  assert.equal(depthTest(buffer, 0, 0.5), true);
  assert.equal(depthTest(buffer, 0, 0.8), false);
  assert.equal(depthTest(buffer, 0, 0.5), false);
  assert.equal(buffer[0], 0.5);
  assert.equal(depthTest(buffer, 0, 0.2), true);
  assert.equal(buffer[0], 0.2);
});

test('scanline coverage fills a 4x4 square exactly once across its shared diagonal', () => {
  const vertices = [-1,-1,-0.5, 1,-1,-0.5, 1,1,-0.5, -1,-1,-0.5, 1,1,-0.5, -1,1,-0.5];
  const raster = trianglePipeline(vertices, 'flat', 4);
  raster.scanline(-1); raster.scanline(4); raster.scanline(1.5);
  assert.equal(raster.shaded, 0);
  for (let row = 0; row < 4; row += 1) {
    raster.scanline(row);
    assert.equal(raster.shaded, (row + 1) * 4);
    assert.equal(raster.rejectedCount, 0);
    assert.equal(raster.depth.filter(Number.isFinite).length, (row + 1) * 4);
  }
});

test('clipped triangles keep coverage bounded and wholly clipped faces disappear', () => {
  const partial = trianglePipeline([-3,-1,-0.5, 3,-1,-0.5, 0,3,-0.5]);
  partial.render();
  assert.equal(partial.shaded, 256);
  assert.equal(partial.rejectedCount, 0);
  assert.ok(partial.depth.every((value) => value >= 0 && value <= 1));
  const outside = trianglePipeline([2,-1,-0.5, 3,-1,-0.5, 2,1,-0.5]);
  assert.equal(outside.triangleCount, 0);
  const crossing = trianglePipeline([-0.8,-0.8,-2, 0.8,-0.8,0, 0,0.8,0], 'wireframe');
  assert.ok(crossing.triangleCount > 0);
  crossing.stage = 'flat'; crossing.render();
  assert.ok(crossing.shaded > 0);
  assert.ok(crossing.depth.filter(Number.isFinite).every((value) => value >= 0 && value <= 1));
});

test('scanline theater produces the same frame and rejection counts as full rendering', () => {
  const a = new Scene(192, 144), b = new Scene(192, 144);
  a.orbit('blinn-phong', 0.6, 0.05, 0.18, 4.8); b.orbit('blinn-phong', 0.6, 0.05, 0.18, 4.8);
  a.raster.render();
  for (let row = 0; row < b.raster.height; row += 1) {
    b.raster.scanline(row);
    assert.ok(b.raster.depth.slice((row + 1) * b.raster.width).every((depth) => depth === Infinity));
  }
  assert.deepEqual(a.raster.pixels, b.raster.pixels);
  assert.deepEqual(a.raster.depth, b.raster.depth);
  assert.deepEqual(a.raster.rejected, b.raster.rejected);
  assert.equal(a.raster.shaded, b.raster.shaded);
  assert.equal(a.raster.rejectedCount, b.raster.rejectedCount);
  assert.ok(a.raster.rejectedCount > 100);
  b.raster.clear(); assert.equal(b.raster.shaded, 0); assert.equal(b.raster.rejectedCount, 0);
  assert.ok(b.raster.pixels.every((value) => value === 255));
});

test('all stage views render; lit stages preserve the silhouette and change the light', () => {
  const demo = new Scene();
  const masks = [], images = [];
  for (const stage of stages) {
    demo.orbit(stage, 0.6, 0.05, 0.18, 4.8); demo.raster.render();
    assert.equal(demo.raster.drawn + demo.raster.culled, 240);
    assert.ok(demo.raster.pixels.some((value) => value < 255));
    if (['flat', 'gouraud', 'blinn-phong'].includes(stage)) {
      masks.push(demo.raster.depth.map((value) => Number.isFinite(value) ? 1 : 0));
      images.push(demo.raster.pixels.slice());
    }
  }
  assert.deepEqual(masks[0], masks[1]); assert.deepEqual(masks[1], masks[2]);
  assert.notDeepEqual(images[0], images[1]); assert.notDeepEqual(images[1], images[2]);
  assert.equal(mesh.smoothMesh.length / 9, 80);
});

test('frustum containment covers all six planes, straddling bounds, and rotated cameras', () => {
  const view = new Float64Array(16), projection = new Float64Array(16), scratch = new Float64Array(32);
  viewMatrix(view, 0, 0, 0, 0, 0); projectionMatrix(projection, 1, 0.5, 12);
  const visible = (x, y, z, radius = 0.1) => boundsVisible(view, projection, scratch, x, y, z, radius);
  assert.equal(visible(0, 0, -3), true);
  for (const position of [[-10,0,-3],[10,0,-3],[0,-10,-3],[0,10,-3],[0,0,1],[0,0,-14]]) {
    assert.equal(visible(...position), false);
  }
  assert.equal(visible(0, 0, -0.5, 0.2), true);
  assert.equal(visible(0, 0, -12, 0.2), true);
  assert.equal(visible(Math.tan(Math.PI / 6) * 3, 0, -3, 0.2), true);
  viewMatrix(view, Math.PI / 2, 0, 0, 0, 0);
  assert.equal(visible(-3, 0, 0), true); assert.equal(visible(3, 0, 0), false);
});

test('frustum bounds rejection preserves rendered pixels across camera headings', () => {
  const culled = new Scene(), all = new Scene();
  for (let yaw = -180; yaw <= 180; yaw += 15) {
    culled.frustum(yaw * Math.PI / 180);
    all.raster.begin('blinn-phong');
    for (let i = 0; i < objects.length; i += 1) {
      const object = objects[i];
      modelMatrix(all.model, i * 0.3, object.radius, object.x, 0, object.z);
      all.raster.submit(mesh.coarseMesh, all.model, culled.view, culled.projection);
    }
    all.raster.render();
    assert.deepEqual(culled.raster.pixels, all.raster.pixels);
    assert.ok(culled.drawnObjects > 0 && culled.drawnObjects < objects.length);
  }
});

test('the new raster pipeline resolves intersecting surfaces regardless of submission order', () => {
  const a = [-0.8,-0.8,-0.9, 0.8,-0.8,-0.1, 0,0.8,-0.5];
  const b = [-0.8,-0.8,-0.1, 0.8,-0.8,-0.9, 0,0.8,-0.5];
  const first = trianglePipeline([...a,...b]); first.render();
  const second = trianglePipeline([...b,...a]); second.render();
  assert.deepEqual(first.pixels, second.pixels);
  assert.deepEqual(first.depth, second.depth);
  assert.ok(first.rejectedCount > 0 && second.rejectedCount > 0);
});
