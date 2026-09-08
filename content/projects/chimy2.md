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

i wrote the original [chimy](https://github.com/hwang2409/chimy) in C with
SDL2. no engine, no math library, no graphics API. i wanted to understand
what happened between a list of vertices and a picture.

it opened a window, drew lines, triangulated shapes, and rendered meshes
with painter's-algorithm ordering. then i stopped. there was no z-buffer,
so interpenetrating geometry looked wrong. no shading model. no textures.
the camera was frozen.

there was also no perspective-correct interpolation. adding textures would
have exposed another problem: patterns that slide across a receding surface
instead of staying attached to it. getting triangles onto the screen had
left most of the interesting work undone.

[chimy2](https://github.com/hwang2409/tooling/tree/main/chimy2) is the rebuild
in Rust. i started over to work through those missing parts. the borrow
checker also made buffer ownership something i had to settle explicitly.

<p class="project-demo-note">the four demos below are small TypeScript implementations of the concepts, not the Rust renderer. the screenshots come from chimy2.</p>

## the rule

i kept the rule: write everything myself. two native runtime crates handle
the window boundary. `winit` opens the window and delivers input events.
`softbuffer` gives me access to its pixel buffer. those are concessions to
operating-system plumbing, not replacements for the rendering work.

after that buffer, i own the math and the pixels. vectors, matrices,
quaternions, clipping, rasterization, OBJ parsing, PPM and QOI decoding,
tile binning, and threading are hand-written. benchmark tooling is separate
from the runtime rule.

the point is not to minimize dependencies as a performance trick. it is to
make the renderer small enough that i can explain each stage without
pointing to an engine that does it for me.

## start with a framebuffer

a framebuffer is a flat array plus a width and height. pixel `(x, y)` lives
at `y * width + x`. plotting a point gives me a first visible result. a line
turns that into an edge. three edges suggest a triangle, but filling its
interior needs a different question: which pixel centers are inside?

an edge function answers that question with a signed area. for each pixel
center, i evaluate it against all three edges. consistent signs mean the
sample lies inside. dividing by the triangle's signed area gives three
barycentric weights.

<!-- widget: triangle-raster -->

drag the vertices. the grid is the framebuffer, enlarged until individual
samples are visible. the fill is a weighted mixture of the three vertex
grays. moving a vertex changes both coverage and the mixture.

```text
E(a, b, p) = (b.x - a.x) * (p.y - a.y)
           - (b.y - a.y) * (p.x - a.x)

wa = E(b, c, p) / E(a, b, c)
wb = E(c, a, p) / E(a, b, c)
wc = 1 - wa - wb

value(p) = wa * value(a) + wb * value(b) + wc * value(c)
```

those weights became the workhorse. the same coverage calculation supports
depth, texture coordinates, and normals. a top-left edge rule assigns a
shared boundary to one triangle, so neighboring triangles do not both own
the same sample. a triangle with zero area owns no samples.

## depth belongs to the pixel

the old renderer sorted whole triangles and painted the far ones first.
that works only when a useful whole-triangle order exists. two surfaces can
cross: one triangle is closer on the left and farther away on the right.
there is no order that fixes both halves.

the z-buffer stores a depth next to every color pixel. a triangle produces
a candidate fragment. if its depth is nearer than the stored depth, it
replaces both values. otherwise it contributes nothing there.

<!-- widget: zbuffer-toggle -->

start in painter mode and swap the order. the mistake moves to the other
side. turn on the z-buffer and swap again. the visible result stays the
same because the decision now happens where the surfaces cross.

this demo uses orthographic projection to isolate the depth test. chimy2's
perspective pipeline interpolates post-divide depth in screen space and
uses OpenGL-style normalized-device depth. depth and arbitrary vertex
attributes do not follow the same interpolation rule.

![three orthogonal bars pass through a central sphere; the z-buffer resolves their intersections](/projects/chimy2-depth-interlock.webp)

the `depth_interlock` scene made the change concrete. three bars pierce a
sphere, all sharing one framebuffer. it is exactly the kind of scene that
the first chimy could not resolve with a submission order.

## perspective changes the weights

a projected midpoint is not generally the midpoint of the original edge.
the near end occupies more screen space. if i interpolate texture
coordinates directly with screen-space weights, i tell the texture to
ignore that difference.

on a tilted checkerboard, straight texture lines bend across the diagonal
between triangles. changing the tilt makes the error move. this is the
texture swimming problem i had left for later.

<!-- widget: perspective-texture -->

the two halves use the same quad, triangle split, and checker sampler.
only interpolation changes. face the quad toward the camera and they
agree. tilt it and the affine version loses the surface's spacing.

the fix is to interpolate `u/w`, `v/w`, and `1/w`. then divide the first two
results by the third. `w` is the vertex's clip-space w, before perspective
division.

```text
u(p) = (lambda_a * u_a / w_a + lambda_b * u_b / w_b + lambda_c * u_c / w_c)
     / (lambda_a / w_a       + lambda_b / w_b       + lambda_c / w_c)
```

here `lambda` names a screen-space barycentric weight and `w` names a
clip-space coordinate. the distinction matters. i put this
correction in the raster core, so each shader does not have to invent its
own version.

## give the surface a normal

depth makes geometry overlap correctly. lighting makes its shape readable.
the next piece is a normal: the direction perpendicular to a surface.

one normal per face makes a mesh look faceted. vertex normals let adjacent
faces describe a smooth surface. when an OBJ has no normals, chimy2 builds
smooth, area-weighted normals from its faces. transformed normals need the
inverse-transpose matrix, especially when scale differs between axes.

for Blinn-Phong lighting, i combine ambient, diffuse, and specular terms.
diffuse light depends on `max(dot(normal, light), 0)`. the specular term uses
the halfway direction between the light and the viewer. raising that dot
product to a power controls the highlight's width.

<!-- widget: shading-model -->

all three modes use the same triangle sphere and lighting equation. flat
evaluates one face normal. gouraud evaluates lighting at vertices and
interpolates the resulting intensities. the blinn-phong mode interpolates
normals, normalizes them again, and evaluates lighting at each pixel.

drag the light or change its angles. gouraud can lose a narrow highlight
when it falls between vertices. per-pixel lighting keeps the highlight
moving across the face. smooth lighting does not add geometry, though:
the sphere's silhouette still comes from the same mesh.

these are teaching modes for comparing where lighting happens. they are
not a claim that chimy2 exposes this exact three-button API.

## textures need a color space

correct coordinates were only part of texture sampling. nearest sampling
chooses one texel. bilinear sampling blends four neighbors. when many
texels shrink into a pixel, neither alone gives the sampler an appropriate
representation of the distant surface.

i added mipmaps: progressively smaller versions of the texture. the
sampler chooses a level from the texture footprint. trilinear sampling
blends bilinear samples from two neighboring levels. chimy2 derives that
footprint from analytic derivatives of the perspective-correct UVs.

averaging stored image bytes introduces another error. most color textures
use sRGB encoding. those bytes are not proportional to light. the
[texture pipeline](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/srgb-mipmaps.md)
decodes color into linear RGB before filtering, lighting, and blending.
the framebuffer encodes it once at the end. normal maps use linear decoding
because their channels describe directions, not display colors.

the mip builder uses a box filter in linear light. odd-sized dimensions
round upward when halved, and edge boxes average only texels that exist.
small rules like these matter: an attractive sphere can hide a broken
sampler for a long time.

the checker demo deliberately uses nearest sampling and no mipmaps. that
keeps the interpolation error visible; it is not the full texture pipeline.

## a scene and a moving camera

the frozen camera had made the first renderer easy to fool. an overlap or
transform can look plausible from one position and fail when i move.
chimy2 has a quaternion camera, an orbit controller, and a WASD fly
controller. changing the view became part of checking a scene.

scene organization grew above the rasterizer. glTF nodes form a hierarchy;
child transforms compose with their parents. the separate JSON
[scene format](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/scene.md)
describes a camera, lights, objects, materials, and post-processing passes.
its object list preserves file order, and unknown fields produce errors
with paths into the input.

that distinction keeps two ideas separate. a hierarchy answers where an
object is. a scene file answers which objects and rendering settings to
load. neither needs to change how a triangle covers pixels.

## avoid work that cannot matter

frustum culling asks whether a mesh could enter the view before submitting
its triangles. chimy2 keeps a local axis-aligned bounding box per mesh and
transforms all eight corners. it rejects the submission only when all
corners lie outside one frustum plane. a box that straddles a plane stays.

shadow passes need their own light frusta. something outside the camera's
view can still cast a visible shadow. reusing the camera test there would
remove geometry that matters.

LOD reduces work for meshes that occupy fewer pixels. `LodMesh` stores a
source mesh and simplified levels built with deterministic quadric-error
edge collapses. selection measures the projected source bounds. the same
selection can serve color and depth submissions. this is explicit,
opt-in behavior, not an automatic rewrite of every mesh.

the parallel raster path works lower down. it bins triangles into screen
tiles and gives each worker a private color and depth buffer for its tile.
serial and parallel rendering share the per-pixel body. tests compare
their rendered pixels, rather than accepting images that merely look close.

## what fits above the raster core

once the pipeline boundary held, more features could use it. these are
separate pieces with their own limits:

- **glTF loading.** JSON `.gltf` assets bring meshes, node transforms, CPU
  skinning, and animation. translation, rotation, and scale support linear
  and step interpolation. GLB and sparse accessors remain unsupported.
- **morph targets.** weighted position and normal deltas deform vertices on
  the CPU before submission. node weights and animation can override mesh
  defaults. rebuilt bounds follow the deformation. morph targets do not
  combine with `LodMesh`.
- **skybox.** six cube faces supply the environment. the sky pass derives
  camera rays and fills untouched far-depth pixels between opaque and
  transparent draws. camera translation does not move the sky.
- **image-based lighting.** the renderer bakes irradiance, a roughness
  hierarchy, and a BRDF lookup table from the environment. a fixed
  Hammersley sequence keeps the bake deterministic. the GGX material path
  uses those maps for diffuse and specular environment light.
- **depth of field.** a thin-lens circle of confusion drives a deterministic
  24-tap gather in linear color. depth rejection reduces foreground halos.
  it is not a full near-field scatter model.
- **shader packs.** toon, dithering, fog, normal visualization, wireframe,
  and PSX-style vertex snapping use the shader boundary. the PSX material
  does not add affine texture mapping. the core still has one
  perspective-correct interpolation path.

the dedicated guides cover [glTF](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/gltf.md),
[morph targets](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/morph.md),
[skyboxes](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/skybox.md),
[IBL](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/ibl.md),
[depth of field](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/dof.md),
and [shader packs](https://github.com/hwang2409/tooling/blob/main/chimy2/docs/shader-pack.md).
the morph guide describes support added after the older glTF overview's
exclusion list.

## the same pixels in a browser

the browser build compiles the Rust crate to `wasm32-unknown-unknown`.
the native window crates sit behind a target condition. a thin browser
driver calls the renderer and copies its flat framebuffer into a canvas.
the CPU still rasterizes the triangles; WebGL does not take over that job.

the [browser showcase source](https://github.com/hwang2409/tooling/tree/main/chimy2/web)
includes the build script and local run instructions. it is a separate
application from this post's small concept demos.

the other payoff is [newt](/projects/newt/). its showcase adapter
advances a physics world at fixed steps and passes poses and geometry to
chimy2. the renderer turns those states into lit frames. rendering does
not advance the physics, and a test compares simulation state with and
without rendering. i can change cameras and materials without making a
different physics experiment. the newt post covers that side.

## the boundary i wanted

```text
vertex stage -> clip and cull -> raster core -> fragment stage
```

that is the useful result of the rebuild. shaders own material behavior.
the raster core owns coverage, perspective correction, and the depth test.
the scene owns what gets submitted.

the core has no clock and no randomness. the same scene produces the same
pixels, which lets golden-image tests name a regression exactly. when an
image goes wrong, i can reduce it to a triangle, a sample, and the values
that reached that sample.

the first chimy got me to the window. rebuilding it made me finish the
path from geometry to a pixel i could explain.
