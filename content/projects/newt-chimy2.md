---
title: newt + chimy2
excerpt: a deterministic physics engine and software renderer built together from first principles
date: 09/04/2026
order: 3
---

Newt and chimy2 are two Rust projects in the same tooling monorepo. Newt simulates rigid bodies. Chimy2 renders the result. The long-term target is an interactive robot simulation that can run in the browser, including a biped walker.

The pairing is useful because it keeps the boundary visible. Newt should produce state without knowing how that state will look. Chimy2 should turn scene data into pixels without changing the simulation. The demos are where the two meet.

![newt simulation rendered through chimy2](/projects/newt-chimy2-1.png)
<!-- screenshot supplied by orchestrator -->

## newt starts with the numbers

Newt is a rigid-body physics engine written from scratch. The early core has free bodies, spatial algebra, gravity, and fourth-order Runge-Kutta integration. Later layers add kinematic trees, hinge, slide, ball, and free-root joints, collision geometry, friction, actuators, sensors, tendons, and constraint solvers.

The design puts determinism ahead of convenience. The engine has no runtime dependencies. It uses a fixed timestep and a defined scalar policy. Transcendental functions are hand-written instead of delegated to platform math libraries. The goal is byte-identical output across macOS, Linux, and WebAssembly for the same input.

That constraint changes how I test physics. A plausible picture is not enough. The test suite checks energy and momentum, compares independent dynamics calculations, and stores byte-level trajectory goldens. If a change alters the numbers, I want to know before a visual demo hides it.

## from one body to a tree

The engine's generalized state follows a dense joint layout. A tree can mix hinges, slides, balls, and a free root. Forward dynamics use Featherstone's Articulated Body Algorithm, which keeps the cost linear in the number of links.

The same tree also has an independent mass-matrix and inverse-dynamics path. Newt can compare the two algorithms instead of letting one implementation confirm itself. A forward solve followed by inverse dynamics should reconstruct the applied forces. That kind of round trip catches frame, sign, and lever-arm mistakes that a single trajectory can miss.

The contact path follows the same preference for explicit stages. It can use a penalty model, or an optional soft-constraint solver with friction and joint limits. A step has a clear order: update positions, find contacts, assemble rows, solve, integrate, then evaluate sensors.

## chimy2 is a small software gpu

Chimy2 is a software renderer with a narrow pipeline:

```text
vertex stage -> clip and cull -> raster core -> fragment stage
```

The raster core handles barycentric coverage, perspective-correct interpolation, and the depth test. Shaders handle materials and lighting. That split supports flat colors, textures, Blinn-Phong and physically based shading, normal maps, shadows, particles, and post-processing without putting scene knowledge into the pixel loop.

The renderer also has a deterministic parallel path. It bins triangles into fixed-size screen tiles. Each worker owns a tile-local color and depth buffer, so workers do not fight over individual pixels. The serial and parallel paths share the per-pixel body and are tested for pixel identity.

The same rules apply to assets. The renderer has hand-written image and mesh loaders, a strict data-driven scene format, and headless screenshot tests. A scene with interpenetrating bars, a receding checker floor, or a lit textured planet becomes a repeatable test case rather than a one-off demo.

## the showcase seam

Newt's showcase adapter advances the simulation by fixed steps, passes poses and geometry to chimy2, and writes a video from rendered frames. Rendering does not update the simulation. A dedicated test runs the same simulation with and without rendering and compares the final state bytes.

That check is small but important. It prevents a visual convenience from becoming a hidden physics input. It also lets me improve cameras, materials, and lighting without changing the behavior that the demo is meant to show.

## what i learned

Building both sides exposed the value of a narrow seam. In newt, a clean separation between generalized dynamics and rendering keeps the solver testable. In chimy2, a clean separation between rasterization and shaders makes new materials local changes.

Determinism is not only for tests. It makes debugging concrete. When a biped falls, I can compare the exact state, contact rows, and rendered frame across changes. When a triangle is wrong, I can reduce the scene and compare pixels.

The projects are still experiments. That is part of their purpose. I am learning how much of a physics engine and renderer can stay understandable when every important layer is written down, measured, and given one clear owner.
