// Column-major matrices; camera looks along -z. Mutating output keeps frame work allocation-free.
export function identity(out: Float64Array) {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
}

export function transform(out: Float64Array, offset: number, m: Float64Array, x: number, y: number, z: number, w = 1) {
  for (let row = 0; row < 4; row += 1) {
    out[offset + row] = m[row] * x + m[4 + row] * y + m[8 + row] * z + m[12 + row] * w;
  }
}

export function modelMatrix(out: Float64Array, angle: number, scale: number, x: number, y: number, z: number) {
  identity(out);
  const c = Math.cos(angle) * scale, s = Math.sin(angle) * scale;
  out[0] = c; out[2] = -s; out[5] = scale; out[8] = s; out[10] = c;
  out[12] = x; out[13] = y; out[14] = z;
}

export function viewMatrix(out: Float64Array, yaw: number, pitch: number, x: number, y: number, z: number) {
  identity(out);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  out[0] = cy; out[4] = 0; out[8] = -sy;
  out[1] = -sy * sp; out[5] = cp; out[9] = -cy * sp;
  out[2] = sy * cp; out[6] = sp; out[10] = cy * cp;
  out[12] = -(out[0] * x + out[8] * z);
  out[13] = -(out[1] * x + out[5] * y + out[9] * z);
  out[14] = -(out[2] * x + out[6] * y + out[10] * z);
}

export function projectionMatrix(out: Float64Array, aspect: number, near: number, far: number) {
  out.fill(0);
  const focal = 1 / Math.tan(Math.PI / 6);
  out[0] = focal / aspect; out[5] = focal;
  out[10] = -(far + near) / (far - near);
  out[11] = -1;
  out[14] = -2 * far * near / (far - near);
}

export function clipDistance(vertices: Float64Array, offset: number, plane: number) {
  const axis = Math.floor(plane / 2);
  return vertices[offset + 3] + (plane % 2 === 0 ? vertices[offset + axis] : -vertices[offset + axis]);
}

// Conservative AABB test: reject only when every corner lies outside one plane.
export function boundsVisible(view: Float64Array, projection: Float64Array, scratch: Float64Array,
  x: number, y: number, z: number, radius: number) {
  for (let corner = 0; corner < 8; corner += 1) {
    const offset = corner * 4;
    transform(scratch, offset, view, x + (corner & 1 ? radius : -radius),
      y + (corner & 2 ? radius : -radius), z + (corner & 4 ? radius : -radius));
    transform(scratch, offset, projection, scratch[offset], scratch[offset + 1], scratch[offset + 2]);
  }
  for (let plane = 0; plane < 6; plane += 1) {
    let outside = 0;
    for (let corner = 0; corner < 8; corner += 1) if (clipDistance(scratch, corner * 4, plane) < 0) outside += 1;
    if (outside === 8) return false;
  }
  return true;
}
