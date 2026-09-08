import { createFrame } from './frame';
import { clamp } from './triangle';
import { sampleBilinear, writeLinear, type Texture } from './textureFiltering';

export function buildMipmaps(base: Texture) {
  const levels = [base];
  while (levels[levels.length - 1].size > 1) {
    const source = levels[levels.length - 1], size = Math.ceil(source.size / 2);
    const texels = new Float64Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let sum = 0, count = 0;
        for (let dy = 0; dy < 2 && y * 2 + dy < source.size; dy += 1) {
          for (let dx = 0; dx < 2 && x * 2 + dx < source.size; dx += 1) {
            sum += source.texels[(y * 2 + dy) * source.size + x * 2 + dx]; count += 1;
          }
        }
        texels[y * size + x] = sum / count;
      }
    }
    levels.push({ size, texels });
  }
  return levels;
}

// A level camera, one unit above y=0. UVs are world x/z times texelsPerUnit.
// Differentiate the ray/plane intersection, including the off-center du/dy.
export function floorLod(distance: number, worldX: number, focal: number, texelsPerUnit: number, maxLevel: number) {
  const dx = texelsPerUnit * distance / focal;
  const dy = texelsPerUnit * distance * Math.hypot(worldX, distance) / focal;
  return clamp(Math.log2(Math.max(1, dx, dy)), 0, maxLevel);
}

export class MipmapFloor {
  readonly frame = createFrame(240, 160);
  readonly levels: Texture[];
  private readonly weights = new Float64Array(4);
  readonly horizon = 24;
  readonly focal = 110;
  readonly texelsPerUnit = 32;

  constructor() {
    const size = 64, texels = new Float64Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) texels[y * size + x] = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 0.015 : 0.85;
    }
    this.levels = buildMipmaps({ size, texels });
  }

  render(travel: number, mipmaps: boolean, falseColor: boolean) {
    const { frame, focal, texelsPerUnit } = this;
    frame.pixels.fill(255);
    for (let y = this.horizon; y < frame.height; y += 1) {
      const distance = focal / (y + 0.5 - this.horizon);
      for (let x = 0; x < frame.width; x += 1) {
        const worldX = (x + 0.5 - frame.width / 2) * distance / focal;
        const lod = mipmaps ? floorLod(distance, worldX, focal, texelsPerUnit, this.levels.length - 1) : 0;
        const lower = Math.floor(lod), upper = Math.min(lower + 1, this.levels.length - 1);
        if (falseColor) {
          writeLinear(frame, x, y, 0.025 + 0.8 * lower / (this.levels.length - 1));
          continue;
        }
        const u = worldX * texelsPerUnit, v = (distance + travel) * texelsPerUnit;
        // Preserve the half-texel offset when changing texture resolution.
        const a = sampleBilinear(this.levels[lower], u / 2 ** lower - 0.5, v / 2 ** lower - 0.5, this.weights, true);
        const b = lod === lower ? a : sampleBilinear(this.levels[upper], u / 2 ** upper - 0.5, v / 2 ** upper - 0.5, this.weights, true);
        const value = a + (b - a) * (lod - lower);
        writeLinear(frame, x, y, value);
      }
    }
  }
}
