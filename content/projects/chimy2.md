---
title: chimy2
excerpt: rebuilding a software rasterizer in rust, from a pixel buffer to lit scenes
date: 09/08/2026
order: 4
image: /projects/chimy2-hero-orbit.webp
imageAlt: a textured sphere lit by directional and point lights in chimy2's hero orbit scene
imageWidth: 960
imageHeight: 720
---

## where the first one stopped

the original [chimy](https://github.com/hwang2409/chimy) drew meshes in C
with SDL2. no z-buffer, textures, lighting, or camera movement. crossing
surfaces looked wrong.

[chimy2](https://github.com/hwang2409/tooling/tree/main/chimy2) is the Rust
rebuild. start with the finished picture, then take it apart:

<!-- widget: raster-pipeline -->

<p class="project-demo-note">these twelve TypeScript demos explain chimy2's concepts; they do not run its Rust code.</p>

## one frame, one line at a time

everything downstream is one type: a `Framebuffer` holds one color and
one depth entry per pixel, laid out row-major.

```rust
pub struct Framebuffer {
    pub color: Vec<u32>,
    pub depth: Vec<f32>,
    pub width: usize,
    pub height: usize,
    // ...
}
```

three meshes. 240 triangles. each triangle transforms through model,
view, and projection before its screen-space edges decide which pixel
centers belong to it. a fragment writes into `color[y*width+x]` and
compares against `depth[y*width+x]` before either update lands.

<!-- widget: scanline-theater -->

hatching marks rejected fragments; the strip records the current line. this
slow scan uses the same pixel routine as the rotating scene. chimy2's
parallel path instead bins triangles into tiles, with private buffers for
each worker.

## cut before dividing

a triangle can cross the camera's near plane. dropping the whole triangle
makes it disappear too soon; projecting it unchanged lets rejected geometry
fill the screen. [chimy2 clips first](https://github.com/hwang2409/tooling/blob/main/chimy2/src/clip.rs)
in homogeneous clip space, where each vertex still carries its post-vertex
attributes:

```rust
pub struct ClipVertex<V> {
    pub position: Vec4,
    pub varyings: V,
}

pub struct ClippedTriangles<V> {
    triangles: [Option<[ClipVertex<V>; 3]>; 2],
    count: usize,
}
```

the near-plane test is `z + w >= 0` in clip space. the fixed two-slot
array is the geometric bound: clipping one triangle against one plane
produces at most two, and interpolated varyings ride along on any new
edge vertex.

<!-- widget: near-plane-clipping -->

one outside corner leaves a quad, split along the solid diagonal; two leave
a triangle; three leave nothing. without clipping, a corner behind the
camera projects onto the wrong side.

## start with a framebuffer

pixel `(x, y)` lives at `y * width + x`. coverage comes from three edge
functions: signed twice-area of the triangle spanned by an edge and the
sample point.

```rust
fn edge(a: Vec3, b: Vec3, point: Vec3) -> f32 {
    (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)
}
```

divide those three edge values by the triangle's total signed area and i
get barycentric weights: enough to interpolate any per-vertex value carried
by a `MeshVertex`.

```rust
pub struct MeshVertex {
    position: Vec3,
    texcoord: Option<Vec2>,
    normal: Option<Vec3>,
    normal_derived: bool,
    tangent: Option<Vec4>,
}
```

<!-- widget: triangle-raster -->

a top-left rule assigns each shared edge to one triangle; a zero-area
triangle owns no samples. `texcoord` feeds the perspective-corrected UV
story below; `normal` and `tangent` feed the shading section.

## depth belongs to the pixel

the first renderer sorted whole triangles. that fails when surfaces cross:
one triangle can be nearer on the left and farther away on the right.
there is no correct whole-triangle order.

chimy2 replaces the sort with a per-pixel depth test. every raster call
takes a small state block that decides whether it reads, writes, or both:

```rust
pub struct RasterState {
    pub depth_test: bool,
    pub depth_write: bool,
    pub color_write: bool,
    pub blend: bool,
}
```

opaque passes read and write; transparent passes read but skip depth
writes; the shadow pre-pass writes depth with color writes off.

<!-- widget: zbuffer-toggle -->

the z-buffer keeps each pixel's nearest depth, independent of submission
order. orthographic projection isolates that decision here.

## look inside the depth buffer

each triangle enters the raster as three `ScreenVertex` records that
carry interpolated depth in `position.z` and `1/w` for perspective-correct
varyings:

```rust
pub struct ScreenVertex<V> {
    pub position: Vec3,
    pub inverse_w: f32,
    pub varyings: V,
}
```

the kernel interpolates `position.z` in screen space, compares against
`Framebuffer.depth`, and writes back the nearer value.

<!-- widget: depth-buffer-view -->

grayscale linearizes stored depth: near is dark, far is light. white pixels
have never passed a depth test.

## choose the camera's projection

the [camera](https://github.com/hwang2409/tooling/blob/main/chimy2/src/camera.rs)
is a quaternion pose plus a perspective frustum:

```rust
pub struct Camera {
    pub position: Vec3,
    pub orientation: Quat,
    pub fov_y: f32,
    pub aspect: f32,
    pub near: f32,
    pub far: f32,
}
```

`view_matrix` composes the conjugate orientation with a translation that
undoes `position`; `projection_matrix` is
`Mat4::perspective(fov_y, aspect, near, far)`. chimy2's math also provides
an orthographic matrix, which keeps scale constant with distance.

<!-- widget: projection -->

field of view changes the perspective crop without moving the camera; it has
no effect on the orthographic view.

## perspective changes the weights

i had also skipped perspective-correct interpolation. screen-space
weights alone cannot keep a texture attached to a receding surface.
the near end takes more screen space; the texture must account for that.

<!-- widget: perspective-texture -->

the fix is the `inverse_w` field on `ScreenVertex`: the raster interpolates
`u * inverse_w`, `v * inverse_w`, and `inverse_w` linearly in screen space,
then divides the first two by the third at each pixel. this demo uses
nearest sampling and no mipmaps to keep that difference visible.

## a texture between texels

a texture is bytes plus a decoded linear mip chain:

```rust
pub struct Texture {
    width: usize,
    height: usize,
    pixels: Vec<[u8; 4]>,
    color_space: ColorSpace,
    pub wrap_mode: WrapMode,
    linear_mips: Vec<MipLevel>,
}
```

UVs rarely land exactly on a texel. nearest takes one sample; bilinear
weights four neighbors. both read the same small ring texture here, after
decode into `linear_mips`.

<!-- widget: texture-filtering -->

`wrap_mode` chooses between `Repeat` and `ClampToEdge` at the border.
like chimy2, this demo blends linear values, then encodes to sRGB. smoothing
does not recover missing detail.

## small details need smaller textures

the opposite problem appears in the distance: one pixel covers many checks.
four samples cannot summarize them. the [mipmap pipeline](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/srgb-mipmaps.md)
stores each smaller level alongside the base:

```rust
pub struct MipLevel {
    pub width: usize,
    pub height: usize,
    pub pixels: Vec<[f32; 4]>,
}
```

each level halves the previous one and averages linear texels. floats, not
bytes, so repeated averaging does not drift.

<!-- widget: mipmap-levels -->

the level view shows mip selection as a grayscale ramp. this floor derives
texture footprints from ray-plane derivatives and blends neighboring levels.
chimy2 derives footprints from triangle varyings instead.

## light a surface, not just its corners

one normal per face produces facets. vertex normals describe a smoother
surface, but lighting only those vertices can miss a narrow highlight.
Blinn-Phong combines ambient, diffuse, and a specular term built from the
halfway direction between light and viewer.

the light types carry only what they need:

```rust
pub struct DirectionalLight {
    pub direction: Vec3,
    pub color: Vec3,
}

pub struct PointLight {
    pub position: Vec3,
    pub color: Vec3,
    pub constant_attenuation: f32,
    pub linear_attenuation: f32,
    pub quadratic_attenuation: f32,
}
```

each mesh submits with a parsed `Material` that supplies its coefficients
and any bound textures:

```rust
pub struct Material {
    pub name: String,
    pub ambient: Vec3,
    pub diffuse: Vec3,
    pub specular: Vec3,
    pub shininess: f32,
    pub alpha: f32,
    // map_kd, map_bump, cached textures ...
}
```

<!-- widget: shading-model -->

flat evaluates each face; gouraud interpolates vertex intensities;
blinn-phong interpolates normals and evaluates each pixel. these are
teaching modes, not an exact chimy2 API. the mesh silhouette stays the
same: smooth lighting does not add triangles.

## avoid work outside the camera

a moving camera makes mistakes harder to hide. chimy2 rejects meshes whose
axis-aligned bounding box lies fully outside one plane of the view frustum.
the culling types stay tiny:

```rust
pub struct Aabb {
    min: Vec3,
    max: Vec3,
}

pub struct Frustum {
    planes: [Plane; 6],
}
```

`Frustum::from_view_projection` extracts left, right, bottom, top, near,
and far planes with Gribb-Hartmann. `intersects_aabb` transforms all eight
corners of the box and rejects only when every corner lies outside one
plane.

<!-- widget: frustum-culling -->

boxes crossing a frustum edge stay; their triangles get clipped later.
shadow passes need a separate light frustum: an offscreen object can still
cast a visible shadow.

## what the toy leaves out

the real renderer keeps the same from-scratch rule. `winit` handles the
window; `softbuffer` exposes its pixels. the math, clipping, rasterization,
asset parsing, and tile workers are hand-written. the
[texture pipeline](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/srgb-mipmaps.md)
filters in linear light, builds mipmaps, and derives texture footprints
from perspective-correct UV derivatives. the floor demo isolates sampling.

above that core sit [glTF scenes](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/gltf.md),
[environment lighting](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/ibl.md),
and [depth of field](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/dof.md).
[newt](/projects/newt/) supplies physics poses without making rendering
advance the simulation. those pieces work because the boundary stays small:
shaders own materials; the raster core owns coverage, interpolation, and
depth. the first chimy got me to a window. rebuilding it finished the path
to a pixel i could explain.
