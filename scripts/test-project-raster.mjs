import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Use the existing TypeScript compiler, as in test-project-physics.mjs.
// CommonJS output lets Node resolve the models' extensionless local imports.
const directory = await mkdtemp(new URL('../.raster-check-', import.meta.url));
const require = createRequire(import.meta.url);
let triangle, depth, perspective, shading, transform, mesh, pipeline, scene, filtering, mipmaps, camera, clipping;
try {
  for (const name of ['triangle', 'frame', 'depth', 'perspective', 'shading', 'transform', 'mesh', 'pipeline', 'scene',
    'textureFiltering', 'mipmapFloor', 'cameraProjection', 'nearClipping']) {
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
  filtering = require(join(directory, 'textureFiltering.js'));
  mipmaps = require(join(directory, 'mipmapFloor.js'));
  camera = require(join(directory, 'cameraProjection.js'));
  clipping = require(join(directory, 'nearClipping.js'));
} finally {
  await rm(directory, { recursive: true, force: true });
}
const { edge, interpolate, rasterize } = triangle;
const { renderDepth } = depth;
const { perspectiveAttribute, renderChecker } = perspective;
const { blinnPhong, lightDirection, renderSphere } = shading;

async function loadTypeScript(path, resolve) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
  } });
  const exports = {};
  runInNewContext(outputText, { exports, require: resolve });
  return exports;
}

test('pause controls expose both toggle states and preserve the click action', async () => {
  const { PauseButton } = await loadTypeScript('../src/components/project-widgets/WidgetControls.tsx', require);
  for (const paused of [false, true]) {
    let clicks = 0;
    const button = PauseButton({ paused, onClick: () => { clicks += 1; } });
    assert.equal(renderToStaticMarkup(button),
      `<button type="button" aria-pressed="${paused}">[${paused ? 'play' : 'pause'}]</button>`);
    button.props.onClick();
    assert.equal(clicks, 1);
  }
});

test('control groups label multiple controls, never a lone control or decorative sibling', async () => {
  const { ControlGroup, Slider, PauseButton, WidgetControls } = await loadTypeScript('../src/components/project-widgets/WidgetControls.tsx', require);
  const slider = createElement(Slider, { label: 'angle', valueText: '45°', defaultValue: 45 });
  const action = createElement(PauseButton, { paused: false, onClick() {} });
  for (const children of [slider, createElement(Fragment, null, false, slider),
    createElement('div', null, slider, createElement('span', null, 'degrees'))]) {
    const html = renderToStaticMarkup(createElement(ControlGroup, { label: 'angle' }, children));
    assert.doesNotMatch(html, /<legend>|<fieldset/);
    assert.match(html, /<label/);
  }
  const props = { actions: createElement(Fragment, null, action), children: slider };
  assert.match(renderToStaticMarkup(createElement(ControlGroup, { ...props, label: 'camera' })), /<legend>camera<\/legend>/);
  assert.doesNotMatch(renderToStaticMarkup(createElement(ControlGroup, props)), /<legend>/);
  assert.match(renderToStaticMarkup(createElement(WidgetControls, props)), /\[pause\]/);
});

// Exercise the real dispatcher; stub only its client widget imports.
const widgetStub = (name) => function WidgetStub() {
  return createElement('section', { 'data-widget': name }, name);
};
const widgetImports = {
  './ContactSoftnessWidget': { default: widgetStub('contact-softness') },
  './TendonWrapWidget': { default: widgetStub('tendon-wrap') },
  './WarmStartWidget': { default: widgetStub('warm-start') },
  './InverseDynamicsWidget': { default: widgetStub('inverse-dynamics') },
  'react/jsx-runtime': require('react/jsx-runtime'),
  './IntegratorsWidget': { default: widgetStub('integrators') },
  './SpringWidget': { default: widgetStub('spring') },
  './TimestepWidget': { default: widgetStub('timestep') },
  './TriangleRasterWidget': { default: widgetStub('triangle-raster') },
  './ZBufferWidget': { default: widgetStub('zbuffer-toggle') },
  './PerspectiveTextureWidget': { default: widgetStub('perspective-texture') },
  './ShadingModelWidget': { default: widgetStub('shading-model') },
  './PipelineWidget': { default: widgetStub('raster-pipeline') },
  './ScanlineWidget': { default: widgetStub('scanline-theater') },
  './DepthViewWidget': { default: widgetStub('depth-buffer-view') },
  './FrustumWidget': { default: widgetStub('frustum-culling') },
  './TextureFilteringWidget': { default: widgetStub('texture-filtering') },
  './MipmapWidget': { default: widgetStub('mipmap-levels') },
  './ProjectionWidget': { default: widgetStub('projection') },
  './NearClippingWidget': { default: widgetStub('near-plane-clipping') },
  './PendulumTreeWidget': { default: widgetStub('pendulum-tree') },
  './SolverIterationsWidget': { default: widgetStub('solver-iterations') },
  './FrictionConeWidget': { default: widgetStub('friction-cone') },
  './DeterminismWidget': { default: widgetStub('determinism-replay') },
  './PlaygroundWidget': { default: widgetStub('playground'), ProjectileStackWidget: widgetStub('projectile-stack') },
  './BroadPhaseWidget': { default: widgetStub('broad-phase') },
  './MuscleArmWidget': { default: widgetStub('muscle-arm') },
};
const registry = await loadTypeScript('../src/components/project-widgets/ProjectWidget.tsx', (name) => {
  assert.ok(Object.hasOwn(widgetImports, name), `unexpected widget import ${name}`);
  return widgetImports[name];
});
const parser = await loadTypeScript('../src/components/project-widgets/parseProjectContent.ts', () => registry);

test('every project content marker reaches ProjectWidget through the actual page', async () => {
  let project;
  const imports = {
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': { default: ({ children }) => children },
    'next/navigation': { notFound: () => assert.fail('project was not found') },
    '@/lib/blog': { getBlogPost: () => null },
    '@/lib/projects': { getProject: () => project },
    '@/lib/markdown': { markdownToHtmlWithSections: async (html) => ({ html, sections: [] }) },
    '@/lib/dates': { formatDate: (date) => date },
    '@/components/Contents': { default: () => null },
    '@/components/LightboxImageTrigger': { default: () => null },
    '@/components/project-widgets/parseProjectContent': parser,
    '@/components/project-widgets/ProjectWidget': registry,
  };
  const page = await loadTypeScript('../src/app/projects/[slug]/page.tsx', (name) => {
    assert.ok(Object.hasOwn(imports, name), `unexpected page import ${name}`);
    return imports[name];
  });
  const projects = new URL('../content/projects/', import.meta.url);
  let count = 0;
  for (const file of (await readdir(projects)).filter((name) => name.endsWith('.md'))) {
    const content = await readFile(new URL(file, projects), 'utf8');
    const expected = [...content.matchAll(/<!--\s*widget:\s*(.*?)\s*-->/gu)].map((match) => match[1]);
    for (const name of expected) {
      assert.ok(registry.isProjectWidgetName(name), `unregistered widget ${name}`);
    }
    const blocks = parser.parseProjectContent(content);
    assert.deepEqual(Array.from(blocks.filter((block) => 'widget' in block), (block) => block.widget), expected, file);
    project = { slug: file.slice(0, -3), title: file, date: '2026-09-08', content };
    const html = renderToStaticMarkup(await page.default({ params: Promise.resolve({ slug: project.slug }) }));
    const mounted = [...html.matchAll(/data-widget="([^"]+)"/gu)].map((match) => match[1]);
    assert.deepEqual(mounted, expected, `${file}: page dropped or reordered a widget`);
    assert.doesNotMatch(html, /<!--\s*widget:/u, `${file}: unconsumed widget marker`);
    count += expected.length;
  }
  assert.ok(count > 0, 'no project markers were checked');
  assert.equal(registry.isProjectWidgetName('toString'), false);
});

test('marker parsing preserves prose and treats registry names literally', async () => {
  const { parseProjectContent } = await loadTypeScript('../src/components/project-widgets/parseProjectContent.ts', () => ({
    isProjectWidgetName: (name) => name === 'demo.v2',
  }));
  const before = '<p>before</p><!-- widget: demoXv2 --><!-- widget: toString -->';
  const after = '<p>after</p>';
  assert.deepEqual(Array.from(parseProjectContent(`${before}<!-- widget: demo.v2 -->${after}`), (block) => ({ ...block })), [
    { html: before }, { widget: 'demo.v2' }, { html: after },
  ]);
  assert.equal(parseProjectContent('<!--widget:demo.v2--><!-- widget: demo.v2 -->').length, 2);
  assert.equal(parseProjectContent('').length, 0);
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

test('bilinear weights partition unity and sampling preserves each corner', () => {
  const weights = new Float64Array(4);
  const texture = { size: 2, texels: new Float64Array([0.01, 0.2, 0.5, 0.9]) };
  for (let x = 0; x <= 20; x += 1) {
    for (let y = 0; y <= 20; y += 1) {
      filtering.bilinearWeights(weights, x / 20, y / 20);
      close(weights.reduce((sum, value) => sum + value, 0), 1);
      assert.ok(weights.every((value) => value >= 0 && value <= 1));
      const actual = filtering.sampleBilinear(texture, x / 20, y / 20, weights);
      const top = 0.01 + (0.2 - 0.01) * x / 20, bottom = 0.5 + (0.9 - 0.5) * x / 20;
      close(actual, top + (bottom - top) * y / 20);
    }
  }
  for (const [x, y, expected] of [[0,0,0.01],[1,0,0.2],[0,1,0.5],[1,1,0.9]]) {
    assert.equal(filtering.sampleBilinear(texture, x, y, weights), expected);
    assert.equal(filtering.sampleNearest(texture, x, y), expected);
  }
  assert.equal(filtering.sampleBilinear(texture, -3, 0, weights), 0.01);
  close(filtering.sampleBilinear(texture, -0.5, 0, weights, true), 0.105);
  close(filtering.sampleBilinear(texture, 1.5, 0, weights, true), 0.105);
  assert.equal(filtering.encodeGray(0), 0); assert.equal(filtering.encodeGray(1), 255);
  assert.equal(filtering.encodeGray(0.5), 188);
  for (const zoom of [1, 2, 4, 8]) {
    const nearest = filtering.renderFiltering(zoom, false), smooth = filtering.renderFiltering(zoom, true);
    assert.notDeepEqual(nearest.pixels, smooth.pixels);
    const nearestValues = new Set(nearest.pixels.filter((_, i) => i % 4 === 0));
    const smoothValues = new Set(smooth.pixels.filter((_, i) => i % 4 === 0));
    assert.equal(nearestValues.size, 2);
    assert.ok(smoothValues.size > 50);
  }
});

test('mip chains average linear texels and do not duplicate odd edges', () => {
  const levels = mipmaps.buildMipmaps({ size: 3, texels: new Float64Array([0, 1, 2, 3, 4, 5, 6, 7, 8]) });
  assert.deepEqual(levels.map((level) => level.size), [3, 2, 1]);
  assert.deepEqual([...levels[1].texels], [2, 3.5, 6.5, 8]);
  assert.equal(levels[2].texels[0], 5);
  const floor = new mipmaps.MipmapFloor();
  close(floor.levels.at(-1).texels[0], (0.015 + 0.85) / 2);
});

test('mip level selection increases monotonically with distance along a view ray', () => {
  for (const ray of [0, 0.3, 1]) {
    let previous = 0;
    for (let distance = 0.25; distance <= 64; distance += 0.25) {
      const lod = mipmaps.floorLod(distance, distance * ray, 110, 32, 6);
      assert.ok(lod >= previous && lod <= 6);
      previous = lod;
    }
    assert.equal(previous, 6);
  }
  close(mipmaps.floorLod(4, 0, 128, 32, 6), 2);
  close(mipmaps.floorLod(8, 0, 128, 32, 6), 4);
});

test('mipmaps suppress distant temporal aliasing and false-color shows the selected levels', () => {
  const floor = new mipmaps.MipmapFloor(), pixels = floor.frame.pixels;
  const temporalChange = (enabled) => {
    floor.render(0, enabled, false); const first = pixels.slice();
    floor.render(0.03, enabled, false);
    let difference = 0;
    for (let y = 26; y < 65; y += 1) {
      for (let x = 0; x < floor.frame.width; x += 1) {
        const offset = (y * floor.frame.width + x) * 4;
        difference += Math.abs(first[offset] - pixels[offset]);
      }
    }
    return difference;
  };
  const unfiltered = temporalChange(false), filtered = temporalChange(true);
  assert.ok(unfiltered > 10000);
  assert.ok(filtered < unfiltered / 4, `${filtered} should be much lower than ${unfiltered}`);
  floor.render(0, true, true);
  const tones = new Set(pixels.filter((_, i) => i % 4 === 0));
  assert.ok(tones.size >= 5);
  floor.render(0, false, true);
  assert.equal(new Set(pixels.filter((_, i) => i % 4 === 0)).size, 2); // sky + level zero
  assert.equal(floor.frame.pixels, pixels, 'animation must reuse the framebuffer');
});

test('projection matrices preserve parallel edges in ortho and converge them in perspective', () => {
  const quad = [[-1,-0.8,-3], [1,-0.8,-3], [1,0.8,-9], [-1,0.8,-9]];
  for (const mode of ['orthographic', 'perspective']) {
    const matrix = camera.cameraProjection(mode, 60), out = new Float64Array(4);
    const points = quad.map(([x, y, z]) => {
      apply(out, 0, matrix, x, y, z);
      return [out[0] / out[3], out[1] / out[3]];
    });
    const nearWidth = points[1][0] - points[0][0], farWidth = points[2][0] - points[3][0];
    if (mode === 'orthographic') {
      close(farWidth, nearWidth);
      close(points[3][0] - points[0][0], points[2][0] - points[1][0]);
      close(points[3][1] - points[0][1], points[2][1] - points[1][1]);
    } else {
      close(farWidth / nearWidth, 1 / 3);
      assert.ok(points[3][0] > points[0][0]); assert.ok(points[2][0] < points[1][0]);
    }
    for (const [distance, expected] of [[1, -1], [20, 1]]) {
      apply(out, 0, matrix, 0, 0, -distance); close(out[2] / out[3], expected);
    }
  }
  assert.deepEqual(camera.renderProjection('orthographic', 35).pixels, camera.renderProjection('orthographic', 95).pixels);
  assert.notDeepEqual(camera.renderProjection('perspective', 35).pixels, camera.renderProjection('perspective', 95).pixels);
  assert.notDeepEqual(camera.renderProjection('orthographic', 60).pixels, camera.renderProjection('perspective', 60).pixels);
});

test('near clipping emits the expected polygon, including exact plane endpoints', () => {
  for (const [zs, expected] of [
    [[-2,-3,-4],3], [[-0.5,-3,-4],4], [[-0.5,-0.75,-4],3], [[0,1,2],0],
    [[-1,-3,-4],3], [[-1,-0.5,-4],3], [[-1,-1,-4],3], [[-1,-1,-0.5],2], [[-1,0,1],1],
  ]) {
    const input = new Float64Array([-1,0,zs[0], 1,0,zs[1], 0,1,zs[2]]), output = new Float64Array(12);
    const count = clipping.clipNear(input, output, 1);
    assert.equal(count, expected, `depths ${zs}`);
    const unique = new Set();
    for (let i = 0; i < count; i += 1) {
      const point = [...output.slice(i * 3, i * 3 + 3)];
      assert.ok(point[2] <= -1); unique.add(point.join(','));
      // Every output vertex lies on an original triangle edge.
      const onEdge = [0,1,2].some((a) => {
        const b = (a + 1) % 3;
        const delta = [0,1,2].map((axis) => input[b * 3 + axis] - input[a * 3 + axis]);
        const axis = delta.findIndex((value) => value !== 0);
        const t = (point[axis] - input[a * 3 + axis]) / delta[axis];
        return t >= 0 && t <= 1 && point.every((value, axis) => Math.abs(value - input[a * 3 + axis] - delta[axis] * t) < 1e-10);
      });
      assert.ok(onEdge);
    }
    assert.equal(unique.size, count, 'plane endpoints must not produce duplicate vertices');
  }
});

test('the clipping demo exposes triangle-to-quad transitions and the unclipped artifact', () => {
  assert.equal(clipping.renderNearClipping(-0.5, true).count, 3);
  assert.equal(clipping.renderNearClipping(0.7, true).count, 4);
  assert.equal(clipping.renderNearClipping(2.5, true).count, 3);
  assert.equal(clipping.renderNearClipping(4.5, true).count, 0);
  for (const dolly of [0.7, 1.5, 2.5, 4.5]) {
    const clipped = clipping.renderNearClipping(dolly, true), raw = clipping.renderNearClipping(dolly, false);
    assert.notDeepEqual(clipped.frame.pixels, raw.frame.pixels);
    assert.ok(clipped.output.slice(0, clipped.count * 3).every(Number.isFinite));
  }
  const singular = clipping.renderNearClipping(1.13, false);
  assert.equal(singular.singular, true);
  assert.ok(singular.frame.pixels.every((value) => value === 255));
});
