import type { RasterFrame } from '@/lib/raster/frame';

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
