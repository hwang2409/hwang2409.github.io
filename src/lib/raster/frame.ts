import { clamp } from './triangle';

export function createFrame(width: number, height: number) {
  return { width, height, pixels: new Uint8ClampedArray(width * height * 4).fill(255) };
}

export type RasterFrame = ReturnType<typeof createFrame>;

// Demo luminance is display-encoded grayscale, bounded by the site's ink and paper.
export function writeGray(frame: RasterFrame, x: number, y: number, luminance: number) {
  const offset = (y * frame.width + x) * 4;
  const gray = Math.round(17 + 238 * clamp(luminance, 0, 1));
  frame.pixels[offset] = gray;
  frame.pixels[offset + 1] = gray;
  frame.pixels[offset + 2] = gray;
}
