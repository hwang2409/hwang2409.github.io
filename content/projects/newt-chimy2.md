---
title: newt + chimy2
excerpt: a deterministic physics engine and software renderer built together from first principles
date: 09/04/2026
order: 3
---

Most physics demos hide the handoff between simulation and rendering. This one
makes the handoff the subject. Newt owns body state. Chimy2 turns scene data
into pixels. A small showcase adapter connects them without letting rendering
alter the simulation.

Newt and chimy2 are two Rust projects in the same tooling monorepo. Newt
simulates rigid bodies. Chimy2 renders the result. The long-term target is an
interactive robot simulation that can run in the browser, including a biped
walker.

## newt starts with the numbers

Newt is a rigid-body physics engine written from scratch. The early core has free bodies, spatial algebra, gravity, and fourth-order Runge-Kutta integration. Later layers add kinematic trees, hinge, slide, ball, and free-root joints, collision geometry, friction, actuators, sensors, tendons, and constraint solvers.

The design puts determinism ahead of convenience. The engine has no runtime dependencies. It uses a fixed timestep and a defined scalar policy. Transcendental functions are hand-written instead of delegated to platform math libraries. The current byte-identical golden claim covers macOS and Linux. Browser execution through WebAssembly is a planned target, not part of that current claim.

That constraint changes how I test physics. A plausible picture is not enough. The test suite checks energy and momentum, compares independent dynamics calculations, and stores byte-level trajectory goldens. If a change alters the numbers, I want to know before a visual demo hides it.

## from one body to a tree

The engine's generalized state follows a dense joint layout. A tree can mix hinges, slides, balls, and a free root. Forward dynamics use Featherstone's Articulated Body Algorithm, which keeps the cost linear in the number of links.

The same tree also has an independent mass-matrix and inverse-dynamics path. Newt can compare the two algorithms instead of letting one implementation confirm itself. A forward solve followed by inverse dynamics should reconstruct the applied forces. That kind of round trip catches frame, sign, and lever-arm mistakes that a single trajectory can miss.

The contact path follows the same preference for explicit stages. With the PGS or Newton solver and Euler or implicitfast integration, a step computes forward kinematics, detects current contacts, assembles rows, solves, integrates, then evaluates sensors. Penalty mode follows a different path: it evaluates contacts and penalty forces at each RK4 stage, or once for its current-state Euler wrench.

## chimy2 is a small software gpu

Chimy2 is a software renderer with a narrow pipeline:

![newt biped walk demo rendered through chimy2](/projects/newt-chimy2-1.png)

```text
vertex stage -> clip and cull -> raster core -> fragment stage
```

The raster core handles barycentric coverage, perspective-correct interpolation, and the depth test. Shaders handle materials and lighting. That split supports flat colors, textures, Blinn-Phong and physically based shading, normal maps, shadows, particles, and post-processing without putting scene knowledge into the pixel loop.

The renderer also has a deterministic parallel path. It bins triangles into fixed-size screen tiles. Each worker owns a tile-local color and depth buffer, so workers do not fight over individual pixels. The serial and parallel paths share the per-pixel body and are tested for pixel identity.

The same rules apply to assets. The renderer has hand-written image and mesh loaders, a strict data-driven scene format, and headless screenshot tests. A scene with interpenetrating bars, a receding checker floor, or a lit textured planet becomes a repeatable test case rather than a one-off demo.

## the showcase seam

Newt's showcase adapter advances the simulation by fixed steps, passes poses and geometry to chimy2, and writes a video from rendered frames. Rendering does not update the simulation. A dedicated test runs the same simulation with and without rendering and compares the final state bytes.

That check is small but important. It prevents a visual convenience from becoming a hidden physics input. It also lets me improve cameras, materials, and lighting without changing the behavior that the demo is meant to show.

The biped example makes the seam concrete. It uses a 0.005-second fixed step, runs 5000 steps in its default showcase, and samples eight phase frames. The simulation remains the source of poses; chimy2 only turns those poses into frames.

## what's next

Building both sides exposed the value of a narrow seam. In newt, a clean separation between generalized dynamics and rendering keeps the solver testable. In chimy2, a clean separation between rasterization and shaders makes new materials local changes.

Determinism is not only for tests. It makes debugging concrete. When a biped falls, I can compare the exact state, contact rows, and rendered frame across changes. When a triangle is wrong, I can reduce the scene and compare pixels.

The next milestone is the browser walker. The current boundary gives that work
one clear question: can a planned WebAssembly build preserve the same readable
simulation-to-renderer split?
