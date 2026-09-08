// Triangle soup is small here: 20 faces, or 80 after one subdivision.
export function icosphere(subdivide: boolean) {
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices = [[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],
    [0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
  const indices = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],
    [11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  const faces: number[] = [];
  const unit = (v: number[]) => { const length = Math.hypot(...v); return v.map((n) => n / length); };
  const midpoint = (a: number[], b: number[]) => unit(a.map((n, i) => n + b[i]));
  for (const face of indices) {
    const [a, b, c] = face.map((i) => unit(vertices[i]));
    if (subdivide) {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      faces.push(...a,...ab,...ca,...b,...bc,...ab,...c,...ca,...bc,...ab,...bc,...ca);
    } else faces.push(...a,...b,...c);
  }
  return new Float64Array(faces);
}

export const coarseMesh = icosphere(false);
export const smoothMesh = icosphere(true);
