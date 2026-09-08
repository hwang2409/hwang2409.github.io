import { createFrame, type RasterFrame } from './frame';
import { clamp } from './triangle';

export type Texture = { size: number; texels: Float64Array };

// Texel values stay linear until the framebuffer boundary.
export function encodeGray(linear: number) {
  const value = clamp(linear, 0, 1);
  return Math.round(255 * (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055));
}

export function writeLinear(frame: RasterFrame, x: number, y: number, value: number) {
  const offset = (y * frame.width + x) * 4;
  frame.pixels[offset] = frame.pixels[offset + 1] = frame.pixels[offset + 2] = encodeGray(value);
}

export function bilinearWeights(out: Float64Array, x: number, y: number) {
  out[0] = (1 - x) * (1 - y); out[1] = x * (1 - y);
  out[2] = (1 - x) * y; out[3] = x * y;
}

function texel(texture: Texture, x: number, y: number, repeat: boolean) {
  const size = texture.size;
  x = repeat ? ((x % size) + size) % size : clamp(x, 0, size - 1);
  y = repeat ? ((y % size) + size) % size : clamp(y, 0, size - 1);
  return texture.texels[y * size + x];
}

// Coordinates address texel centers: an integer selects that texel exactly.
export function sampleNearest(texture: Texture, x: number, y: number, repeat = false) {
  return texel(texture, Math.floor(x + 0.5), Math.floor(y + 0.5), repeat);
}

export function sampleBilinear(texture: Texture, x: number, y: number, weights: Float64Array, repeat = false) {
  const left = Math.floor(x), top = Math.floor(y);
  bilinearWeights(weights, x - left, y - top);
  return texel(texture, left, top, repeat) * weights[0]
    + texel(texture, left + 1, top, repeat) * weights[1]
    + texel(texture, left, top + 1, repeat) * weights[2]
    + texel(texture, left + 1, top + 1, repeat) * weights[3];
}

export function renderFiltering(zoom: number, bilinear: boolean) {
  const texture: Texture = { size: 16, texels: new Float64Array(256) };
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const radius = Math.hypot(x - 7.5, y - 7.5);
      texture.texels[y * 16 + x] = radius < 3 || (radius > 5 && radius < 7) ? 0.015 : 0.85;
    }
  }
  const frame = createFrame(128, 128), weights = new Float64Array(4);
  const scale = 8 * clamp(zoom, 1, 8);
  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const u = 7.5 + (x + 0.5 - 64) / scale, v = 4.5 + (y + 0.5 - 64) / scale;
      writeLinear(frame, x, y, bilinear ? sampleBilinear(texture, u, v, weights) : sampleNearest(texture, u, v));
    }
  }
  return frame;
}
