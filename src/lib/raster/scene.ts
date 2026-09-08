import { coarseMesh, smoothMesh } from './mesh';
import { Pipeline, type Stage } from './pipeline';
import { boundsVisible, modelMatrix, projectionMatrix, viewMatrix } from './transform';

export const objects = Array.from({ length: 16 }, (_, i) => {
  const angle = i * Math.PI * 2 / 16 + 0.12;
  const radius = i % 2 === 0 ? 3.2 : 6.6;
  return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius, radius: 0.45 + (i % 3) * 0.12 };
});

export class Scene {
  readonly raster: Pipeline;
  readonly model = new Float64Array(16);
  readonly view = new Float64Array(16);
  readonly projection = new Float64Array(16);
  readonly visible = new Uint8Array(objects.length);
  private readonly corners = new Float64Array(32);
  drawnObjects = 0;
  near = 0.5;
  far = 12;

  constructor(width = 240, height = 180) {
    this.raster = new Pipeline(width, height);
  }

  orbit(stage: Stage, rotation: number, yaw: number, pitch: number, distance: number) {
    this.raster.begin(stage);
    viewMatrix(this.view, yaw, pitch, Math.sin(yaw) * Math.cos(pitch) * distance,
      Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance);
    projectionMatrix(this.projection, this.raster.width / this.raster.height, this.near, this.far);
    // At the initial pose the near satellite arrives first, exposing depth rejection.
    modelMatrix(this.model, rotation, 0.64, -Math.cos(rotation) * 0.9, -0.48, 0.3 + Math.sin(rotation) * 0.9);
    this.raster.submit(smoothMesh, this.model, this.view, this.projection);
    modelMatrix(this.model, -rotation * 0.7, 1, 0.18, 0.18, -0.25);
    this.raster.submit(smoothMesh, this.model, this.view, this.projection);
    modelMatrix(this.model, rotation * 1.3, 0.45, Math.cos(rotation * 0.7) * 1.25, -0.55, -0.6 + Math.sin(rotation * 0.7));
    this.raster.submit(smoothMesh, this.model, this.view, this.projection);
  }

  frustum(yaw: number) {
    this.raster.begin('blinn-phong');
    viewMatrix(this.view, yaw, 0, 0, 0.4, 0);
    projectionMatrix(this.projection, this.raster.width / this.raster.height, this.near, this.far);
    this.drawnObjects = 0;
    for (let i = 0; i < objects.length; i += 1) {
      const object = objects[i];
      this.visible[i] = boundsVisible(this.view, this.projection, this.corners, object.x, 0, object.z, object.radius) ? 1 : 0;
      if (!this.visible[i]) continue;
      this.drawnObjects += 1;
      modelMatrix(this.model, i * 0.3, object.radius, object.x, 0, object.z);
      this.raster.submit(coarseMesh, this.model, this.view, this.projection);
    }
    this.raster.render();
  }
}
