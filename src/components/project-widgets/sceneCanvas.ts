import type { Scene } from '@/lib/raster/scene';

// One offscreen surface and ImageData per mounted demo, reused for every frame.
export function scenePainter(scene: Scene) {
  let surface: HTMLCanvasElement | undefined;
  let upload: CanvasRenderingContext2D | null = null;
  let image: ImageData | undefined;
  return (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number,
    depth = false, rejection = false) => {
    const raster = scene.raster;
    if (!surface) {
      surface = document.createElement('canvas');
      surface.width = raster.width; surface.height = raster.height;
      upload = surface.getContext('2d');
      image = upload?.createImageData(raster.width, raster.height);
    }
    if (!image || !upload) return;
    image.data.set(raster.pixels);
    if (depth || rejection) {
      for (let i = 0; i < raster.depth.length; i += 1) {
        let gray = image.data[i * 4];
        if (depth && Number.isFinite(raster.depth[i])) {
          // Linearize stored post-divide depth so camera distance is readable.
          const z = raster.depth[i] * 2 - 1;
          const distance = 2 * scene.near * scene.far / (scene.far + scene.near - z * (scene.far - scene.near));
          gray = 240 * (distance - scene.near) / (scene.far - scene.near);
        }
        if (rejection && raster.rejected[i] && (i % raster.width + Math.floor(i / raster.width)) % 4 < 2) gray = 255 - gray;
        image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = gray;
      }
    }
    upload.putImageData(image, 0, 0);
    context.imageSmoothingEnabled = false;
    context.drawImage(surface, x, y, width, height);
  };
}
