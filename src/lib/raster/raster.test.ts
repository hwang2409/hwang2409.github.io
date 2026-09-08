import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { renderDepth } from './depth';
import { perspectiveAttribute, renderChecker } from './perspective';
import { blinnPhong, lightDirection, renderSphere, type ShadingMode } from './shading';
import { rasterize, type Triangle } from './triangle';

test('shared diagonal belongs to exactly one triangle, with either winding', () => {
  const first: Triangle = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }];
  const second: Triangle = [{ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
  for (const reverse of [false, true]) {
    const counts = new Uint8Array(16);
    for (const triangle of [first, second]) {
      const points: Triangle = reverse ? [triangle[2], triangle[1], triangle[0]] : triangle;
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
  ] satisfies Triangle[]) {
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
  const modes: ShadingMode[] = ['flat', 'gouraud', 'blinn-phong'];
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
  function highlightX(azimuth: number) {
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
