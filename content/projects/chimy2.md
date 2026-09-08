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
with SDL2. then i stopped. no z-buffer: crossing surfaces looked wrong.
no textures or lighting. a frozen camera. getting triangles onto the screen
had left most of the interesting work undone.

[chimy2](https://github.com/hwang2409/tooling/tree/main/chimy2) is the Rust
rebuild. start with the finished picture, then take it apart:

<!-- widget: raster-pipeline -->

<p class="project-demo-note">these twelve demos are small, dependency-free TypeScript rasterizers. they mirror chimy2's concepts; they do not run its Rust code, wasm, or WebGL.</p>

## one frame, one line at a time

three meshes. 240 triangles. a color buffer and a depth buffer. each
triangle goes through model, view, and projection transforms before its
screen-space edges decide which pixel centers belong to it.

<!-- widget: scanline-theater -->

the strip records rejected fragments on the current line. turn off the
hatching to see the finished image underneath. this deliberately slow scan
uses the same pixel routine as the rotating scene. chimy2's parallel path
instead bins triangles into tiles, with private buffers for each worker.

## cut before dividing

a triangle can cross the camera's near plane. dropping the whole triangle
makes it disappear too soon; projecting it unchanged lets rejected geometry
fill the screen. [chimy2 clips first](https://github.com/hwang2409/tooling/blob/main/chimy2/src/clip.rs):
keep the inside vertices and intersect each crossing edge with the plane.

<!-- widget: near-plane-clipping -->

move the camera forward. one outside corner leaves a quad, split into two
triangles along the solid diagonal. two outside corners leave one triangle;
three leave nothing. the map and rendered view use the same output vertices.
without clipping, a corner behind the camera projects onto the wrong side.

## start with a framebuffer

pixel `(x, y)` lives at `y * width + x`. three edge functions tell me
whether its center is inside a triangle. divide those signed areas by the
triangle's area and i get barycentric weights: enough to interpolate a
gray value, depth, or a normal.

<!-- widget: triangle-raster -->

drag a corner. coverage and gray values change together. a top-left rule
assigns each shared edge to one triangle; a zero-area triangle owns no
samples. the large scene above applies this same idea thousands of times.

## depth belongs to the pixel

the first renderer sorted whole triangles. that fails when surfaces cross:
one triangle can be nearer on the left and farther away on the right.
there is no correct whole-triangle order.

<!-- widget: zbuffer-toggle -->

swap the order in painter mode, then enable the z-buffer. each pixel now
keeps its nearest depth, so submission order stops deciding the picture.
this small example uses orthographic projection to isolate that decision.

## look inside the depth buffer

in perspective, the rasterizer interpolates post-divide depth in screen
space. the color is only half the result. every visible surface also
leaves a distance behind:

<!-- widget: depth-buffer-view -->

switch buffers and move the camera. the grayscale view linearizes stored
depth so distance changes are readable. lighting disappears; overlaps
remain. white pixels have never passed a depth test.

## choose the camera's projection

six equal frames make a corridor. the [camera](https://github.com/hwang2409/tooling/blob/main/chimy2/src/camera.rs)
uses perspective: divide projected coordinates by distance, and far frames
shrink. chimy2's math also provides an orthographic matrix, which keeps scale
constant with distance.

<!-- widget: projection -->

switch projections. the scene and view stay fixed: parallel rails converge
under perspective and stay parallel under orthographic. the field-of-view
slider changes the perspective crop without moving the camera. it cannot
change the orthographic view, so that control is disabled there.

## perspective changes the weights

i had also skipped perspective-correct interpolation. screen-space
weights alone cannot keep a texture attached to a receding surface.
the near end takes more screen space; the texture must account for that.

<!-- widget: perspective-texture -->

face the checkerboard toward the camera: both halves agree. tilt it: the
affine version distorts. the fix interpolates `u/w`, `v/w`, and `1/w`, then
divides the first two by the third. this demo uses nearest sampling and
no mipmaps to keep that difference visible.

## a texture between texels

UVs rarely land exactly on a texel. nearest takes one sample; bilinear
weights four neighbors. both read the same small ring texture here.

<!-- widget: texture-filtering -->

zoom in. nearest grows hard blocks, while bilinear makes a continuous
transition. like chimy2's texture path, this demo blends linear values and
encodes them to sRGB afterward. smoothing does not recover missing detail.

## small details need smaller textures

the opposite problem appears in the distance: one pixel covers many checks.
four samples cannot summarize them. the [mipmap pipeline](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/srgb-mipmaps.md)
builds successively smaller textures by averaging linear texels.

<!-- widget: mipmap-levels -->

turn mipmaps off to see distant checks shimmer. turn on false-color levels
to read the selection as a grayscale ramp. this floor derives its texture
footprint from ray-plane derivatives, then blends neighboring mip levels.
chimy2 derives footprints from triangle varyings instead.

## light a surface, not just its corners

one normal per face produces facets. vertex normals describe a smoother
surface, but lighting only those vertices can miss a narrow highlight.
Blinn-Phong combines ambient, diffuse, and a specular term built from the
halfway direction between light and viewer.

<!-- widget: shading-model -->

drag the light. flat evaluates each face; gouraud interpolates vertex
intensities; blinn-phong interpolates normals and evaluates each pixel.
these are teaching modes, not an exact chimy2 API. the mesh silhouette
stays the same: smooth lighting does not add triangles.

## avoid work outside the camera

a moving camera makes mistakes harder to hide. chimy2 adds orbit and fly
controllers, then rejects meshes that cannot enter their view. it
transforms all eight corners of a mesh's bounding box and rejects only
when every corner lies outside one frustum plane.

<!-- widget: frustum-culling -->

rotate the camera. the map and rendered view share the same camera and
projection. boxes crossing an edge stay; their triangles get clipped
later. shadow passes need a separate light frustum: an offscreen object
can still cast a visible shadow.

## what the toy leaves out

the real renderer keeps the same from-scratch rule. `winit` handles the
window; `softbuffer` exposes its pixels. the math, clipping, rasterization,
asset parsing, and tile workers are hand-written. the
[texture pipeline](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/srgb-mipmaps.md)
filters in linear light, builds mipmaps, and derives texture footprints
from perspective-correct UV derivatives. the floor above isolates sampling;
it does not implement chimy2's general shader interface.

above that core sit [glTF scenes](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/gltf.md),
[environment lighting](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/ibl.md),
and [depth of field](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/dof.md).
[newt](/projects/newt/) supplies physics poses without making rendering
advance the simulation. those pieces work because the boundary stays small:
shaders own materials; the raster core owns coverage, interpolation, and
depth. the first chimy got me to a window. rebuilding it finished the path
to a pixel i could explain.
