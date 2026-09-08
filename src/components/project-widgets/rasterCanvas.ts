import type { RasterFrame } from '@/lib/raster/frame';
import colors from './colors';

// The raster result changes only with controls. Upload it once, not every frame.
export function rasterPainter(frame: RasterFrame) {
  let surface: HTMLCanvasElement | undefined;
  return (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    if (!surface) {
      surface = document.createElement('canvas');
      surface.width = frame.width;
      surface.height = frame.height;
      const image = new ImageData(new Uint8ClampedArray(frame.pixels), frame.width, frame.height);
      surface.getContext('2d')?.putImageData(image, 0, 0);
    }
    context.imageSmoothingEnabled = false;
    context.drawImage(surface, x, y, width, height);
  };
}

export function clearRasterCanvas(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = colors.background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = colors.foreground;
  // TODO(WEB-30): Replace with the shared font helper after rebasing.
  context.font = `12px ${getComputedStyle(context.canvas).fontFamily}`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.lineWidth = 1;
}
