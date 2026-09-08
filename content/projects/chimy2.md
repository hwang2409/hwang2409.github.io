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

<p class="project-demo-note">these eight demos are small, dependency-free TypeScript rasterizers. they mirror chimy2's concepts; they do not run its Rust code, wasm, or WebGL.</p>

## one frame, one line at a time

three meshes. 240 triangles. a color buffer and a depth buffer. each
triangle goes through model, view, and projection transforms before its
screen-space edges decide which pixel centers belong to it.

<!-- widget: scanline-theater -->

the strip records rejected fragments on the current line. turn off the
hatching to see the finished image underneath. this deliberately slow scan
uses the same pixel routine as the rotating scene. chimy2's parallel path
instead bins triangles into tiles, with private buffers for each worker.

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

## perspective changes the weights

i had also skipped perspective-correct interpolation. screen-space
weights alone cannot keep a texture attached to a receding surface.
the near end takes more screen space; the texture must account for that.

<!-- widget: perspective-texture -->

face the checkerboard toward the camera: both halves agree. tilt it: the
affine version distorts. the fix interpolates `u/w`, `v/w`, and `1/w`, then
divides the first two by the third. this demo uses nearest sampling and
no mipmaps to keep that difference visible.

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
from perspective-correct UV derivatives. the demos here do not implement
that sampler.

above that core sit [glTF scenes](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/gltf.md),
[environment lighting](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/ibl.md),
and [depth of field](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/dof.md).
[newt](/projects/newt/) supplies physics poses without making rendering
advance the simulation. those pieces work because the boundary stays small:
shaders own materials; the raster core owns coverage, interpolation, and
depth. the first chimy got me to a window. rebuilding it finished the path
to a pixel i could explain.
