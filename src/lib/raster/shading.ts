import { createFrame, writeGray } from './frame';
import { clamp, interpolate, rasterize, type Weights } from './triangle';

type Vector = { x: number; y: number; z: number };
export type ShadingMode = 'flat' | 'gouraud' | 'blinn-phong';

function dot(a: Vector, b: Vector) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v: Vector): Vector {
  const length = Math.hypot(v.x, v.y, v.z);
  return length > 1e-10 ? { x: v.x / length, y: v.y / length, z: v.z / length } : { x: 0, y: 0, z: 1 };
}

export function lightDirection(azimuth: number, elevation: number): Vector {
  const az = azimuth * Math.PI / 180;
  const el = elevation * Math.PI / 180;
  return { x: Math.sin(az) * Math.cos(el), y: Math.sin(el), z: Math.cos(az) * Math.cos(el) };
}

export function blinnPhong(normal: Vector, light: Vector) {
  const diffuse = Math.max(0, dot(normal, light));
  const half = normalize({ x: light.x, y: light.y, z: light.z + 1 });
  const specular = diffuse > 0 ? Math.max(0, dot(normal, half)) ** 48 : 0;
  return clamp(0.035 + 0.48 * diffuse + 0.65 * specular, 0, 1);
}

function faceNormal(a: Vector, b: Vector, c: Vector) {
  const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const normal = normalize({ x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x });
  return dot(normal, a) < 0 ? { x: -normal.x, y: -normal.y, z: -normal.z } : normal;
}

function sphereMesh() {
  const rings = 12;
  const segments = 24;
  const vertices: Vector[] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const latitude = ring * Math.PI / rings;
    for (let segment = 0; segment <= segments; segment += 1) {
      const longitude = (segment + 0.3) * Math.PI * 2 / segments;
      vertices.push({ x: Math.sin(latitude) * Math.cos(longitude), y: Math.cos(latitude), z: Math.sin(latitude) * Math.sin(longitude) });
    }
  }
  const faces: [Vector, Vector, Vector][] = [];
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * (segments + 1) + segment;
      const b = a + segments + 1;
      if (ring > 0) faces.push([vertices[a], vertices[b], vertices[a + 1]]);
      if (ring < rings - 1) faces.push([vertices[a + 1], vertices[b], vertices[b + 1]]);
    }
  }
  return faces;
}

const sphere = sphereMesh();
export const sphereSize = 180;
export const sphereRadius = 70;

export function renderSphere(mode: ShadingMode, azimuth: number, elevation: number) {
  const frame = createFrame(sphereSize, sphereSize);
  const depths = new Float64Array(sphereSize * sphereSize).fill(Infinity);
  const light = lightDirection(azimuth, elevation);
  for (const [a, b, c] of sphere) {
    const normal = faceNormal(a, b, c);
    if (normal.z <= 0) continue;
    const project = (v: Vector) => ({ x: sphereSize / 2 + v.x * sphereRadius, y: sphereSize / 2 - v.y * sphereRadius });
    const xs: Weights = [a.x, b.x, c.x];
    const ys: Weights = [a.y, b.y, c.y];
    const zs: Weights = [a.z, b.z, c.z];
    const flat = blinnPhong(normal, light);
    const intensities: Weights = [blinnPhong(a, light), blinnPhong(b, light), blinnPhong(c, light)];
    rasterize([project(a), project(b), project(c)], sphereSize, sphereSize, (x, y, weights) => {
      const z = interpolate(zs, weights);
      const index = y * sphereSize + x;
      if (-z >= depths[index]) return;
      depths[index] = -z;
      let intensity = flat;
      if (mode === 'gouraud') intensity = interpolate(intensities, weights);
      if (mode === 'blinn-phong') {
        intensity = blinnPhong(normalize({ x: interpolate(xs, weights), y: interpolate(ys, weights), z }), light);
      }
      const encoded = intensity <= 0.0031308 ? 12.92 * intensity : 1.055 * intensity ** (1 / 2.4) - 0.055;
      writeGray(frame, x, y, encoded);
    });
  }
  return frame;
}
