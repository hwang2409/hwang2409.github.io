---
title: newt + chimy2
excerpt: a deterministic physics engine and software renderer built together from first principles
date: 09/04/2026
order: 3
image: /projects/newt-chimy2-1.png
imageAlt: newt biped walk demo rendered through chimy2
imageWidth: 960
imageHeight: 640
---

<p class="project-demo-note">these demos illustrate concepts; they are not newt itself.</p>

## a body and a step

Numerical integration turns acceleration into velocity, then velocity into
position. The order matters. Newt exposes rk4, euler, and implicitfast; its
euler path updates velocity before it integrates position. That is the
semi-implicit step shown here.

<!-- widget: integrators -->

Drag the launch point. With a deliberately chunky timestep, the three methods
trace the same throw but land in different places. rk4 samples four stages;
the two euler paths take one.

## the fixed timestep

Newt advances its world with a fixed `dt`. The frame clock can jitter, but the
simulation sees the same-sized steps. An accumulator carries spare frame time
forward. This makes a run repeatable, which makes a changed trajectory easier
to explain.

<!-- widget: timestep -->

The fixed trace retraces its path after replay. The variable trace takes each
frame as a step, so small timing changes add up.

## springs and damping

A spring turns displacement into a restoring force. Damping turns velocity
into resistance. Together they decide whether a body overshoots, settles at
the edge of critical damping, or crawls back without crossing the target.

<!-- widget: spring -->

The engine uses damping in joints, limits, contacts, and tendons. This small
mass-and-spring model keeps the idea visible without pretending to be a full
newt scene.

## from one body to a tree

Newt is a rigid-body engine written from scratch. Its state can grow from free
bodies into trees of hinge, slide, ball, and free-root joints. Featherstone's
Articulated Body Algorithm keeps forward dynamics linear in link count.

The engine also has independent mass-matrix and inverse-dynamics paths. A
forward solve followed by inverse dynamics should recover the applied forces.
That round trip catches frame, sign, and lever-arm mistakes.

## chimy2 is a small software gpu

Chimy2 is a software renderer with a narrow pipeline:

```text
vertex stage -> clip and cull -> raster core -> fragment stage
```

The raster core handles barycentric coverage, perspective-correct
interpolation, and the depth test. Shaders handle materials and lighting. The
split keeps scene knowledge out of the pixel loop.

The renderer also has a deterministic parallel path. It bins triangles into
fixed-size screen tiles. Each worker owns a tile-local color and depth buffer.
The serial and parallel paths are tested for pixel identity.

Hand-written image and mesh loaders, a data-driven scene format, and headless
screenshot tests make renderer changes repeatable.

## the showcase seam

Newt's showcase adapter advances the simulation by fixed steps, passes poses
and geometry to chimy2, and writes a video from rendered frames. Rendering
does not update the simulation. A test runs the same simulation with and
without rendering and compares the final state bytes.

That check is small but important. It prevents a visual convenience from becoming a hidden physics input. It also lets me improve cameras, materials, and lighting without changing the behavior that the demo is meant to show.

The biped example makes the seam concrete. It uses a 0.005-second fixed step
and samples phase frames. Newt remains the source of poses; chimy2 only turns
those poses into frames.

## what's next

Building both sides exposed the value of a narrow seam. In newt, a clean separation between generalized dynamics and rendering keeps the solver testable. In chimy2, a clean separation between rasterization and shaders makes new materials local changes.

Determinism is not only for tests. It makes debugging concrete. When a biped falls, I can compare the exact state, contact rows, and rendered frame across changes. When a triangle is wrong, I can reduce the scene and compare pixels.

The next milestone is the browser walker. The current boundary gives that work
one clear question: can a planned WebAssembly build preserve the same readable
simulation-to-renderer split?
