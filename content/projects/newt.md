---
title: newt
excerpt: building a deterministic rigid-body physics engine from scratch in rust, from a tumbling box to an assisted biped walk
date: 09/04/2026
order: 3
image: /projects/newt-chimy2-1.png
imageAlt: newt biped walk demo rendered through chimy2
imageWidth: 960
imageHeight: 640
---

i wanted to recreate MuJoCo from scratch in rust: bodies, contacts, joint
trees, actuators, and models loaded from MJCF. zero runtime dependencies.
feature parity is the direction, not a finished claim.

start with the playground. drop a box onto the stack, pull a ball across it,
or turn gravity off. the layers below explain what has to agree for that
small scene to work.

<!-- widget: playground -->

<p class="project-demo-note">these fifteen dependency-free typescript demos explain the math. they do not run newt, use wasm, or establish MuJoCo parity. newt itself is a CPU engine; a separate renderer consumes its poses.</p>

## a body and a step

a body needs mass, inertia, position, orientation, and velocity. newt stores
orientation as a unit quaternion and angular velocity in body coordinates.
its first integrator was RK4: four derivative evaluations, then one weighted
update. quaternion normalization happens at the end, not between stages.

<!-- widget: integrators -->

throw the same projectile three ways. explicit euler uses the old velocity;
newt's semi-implicit euler uses the new one. RK4 recovers the constant-gravity
arc at its samples. explicit euler is only a comparison. newt also has
implicitfast, which handles supported joint damping and actuator velocity
terms implicitly; tendon coupling and force-clamp derivatives remain limited.

## make the clock boring

the world advances by a fixed `dt`, not the last frame's duration. a viewer
accumulates time, spends it in whole steps, and carries the remainder.
change the generated frame jitter below: only the frame-step bounce changes.

<!-- widget: timestep -->

fixed steps are necessary, but ordering and arithmetic matter too. newt uses
stable contact order, index tie breaks, and its own scalar routines: sin/cos
range reduction and polynomials, plus tan, asin, and atan2. golden trajectories
serialize state at fixed steps. repeatability is separate from matching
another engine.

## repeatable does not mean predictable

the pendulums integrate separately. identical inputs produce identical trace
bytes. [perturb] changes one starting angle by `1e-6` radians. the log plot
makes separation visible before your eye can distinguish the rods.

<!-- widget: determinism-replay -->

upward stretches on the log plot expose exponential separation; later growth
saturates and fluctuates. the plot shows actual angle differences, not a fitted
line. this browser calculation uses JavaScript math. it does not prove newt's
cross-platform scalar policy.

## contact starts as a spring

my first contacts used a penalty force: stiffness times penetration, minus
damping times normal velocity, clamped at zero. a separating contact cannot
pull. applying that force away from the center also creates torque.

<!-- widget: spring -->

change damping or pull the mass. oscillation, settling, and slow overdamped
return come from the same equation. newt's penalty path remains available as
the legacy default. before building stacks, i checked static compression,
bounce energy loss, and equal-and-opposite collision forces.

## from bodies to joint coordinates

robots need connected bodies. generalized coordinates store only the motion
a joint permits; forward kinematics reconstructs link poses. a hinge needs
one angle, while a ball joint uses four quaternion position components and
three angular-velocity components. position and velocity arrays can differ
in length.

<!-- widget: pendulum-tree -->

move the parent angle: the child's frame moves with it. these rods remain
connected by construction. the demo solves two coupled point-mass equations
with RK4. newt uses Featherstone's ABA: an outward velocity pass, an inward
articulated-inertia pass, then outward acceleration recovery. CRB mass matrices
and RNE inverse dynamics supply independent round-trip checks.

give the arm a torque, calculate acceleration, then ask what torque would
produce it. newt checks ABA against an independent RNE pass. the browser
version below checks coupled equations against cartesian forces and moments.

<!-- widget: inverse-dynamics -->

the lines should overlap. this is an instantaneous dynamics check along a
simulated trajectory, not proof that the integrator has no time-step error.
newt's documented round-trip tolerance is `5e-4`; browser arithmetic is f64.

## finding what touches

broad phase chooses pairs; narrow phase finds contact geometry. the visualizer
compares all pairs with a sweep over sorted x bounds and a y-overlap test.
switch modes while it moves: the motion stays the same, the candidate work
changes.

<!-- widget: broad-phase -->

this sweep is a browser comparison, not a claim about newt's broad phase.
newt's documented baseline enumerates stable, filtered geometry pairs.
narrow phase uses primitive routines, box separating-axis tests, and GJK/EPA
for convex queries. face contacts need manifold recovery too. support remains
pair-specific: several heightfield pairs are rejected, and box–mesh remains
deferred after a measured normal mismatch.

## soft constraints and friction cones

v1 added soft constraints. a Jacobian maps joint velocity into contact motion;
`solref` sets reference response and `solimp` sets impedance. regularization
allows finite compliance, so a small overlap under load can be intentional.
friction bounds tangential force by `μN`.

drop the ball with hard contact, then soften it. finite stiffness permits
penetration before the restoring force wins. this spring model exposes that
tradeoff; newt's regularized constraints use a different force law.

<!-- widget: contact-softness -->

<!-- widget: friction-cone -->

raise the incline until `tan(θ)` exceeds `μ`. the required support leaves the
cone and the block slides. this cross-section assumes equal static and
kinetic friction and no rotation. newt's PGS supports elliptic and pyramidal
cones; their different boundaries change the force projection.

## one correction changes the next

fixing a floor contact changes the box above it. fixing that contact changes
the next. a solver must send those corrections through the stack repeatedly.
increase the sweeps below and watch the measured overlap shrink.

<!-- widget: solver-iterations -->

this demo projects positions, not newt's regularized force-space PGS rows.
the playground and wall share its mass-weighted correction, extended to 2d
contacts with rotation, friction, and restitution impulses. newt also ships
Newton with a dense Hessian and line search; CG is not counted as implemented,
and the documented Newton path rejects elliptic cones.

a solver can also remember its last answer. warm start applies the prior
frame's impulses before the first sweep. cold start has to rebuild the
support forces from zero, even when the stack barely changed.

<!-- widget: warm-start -->

this velocity-space comparison adds warm start to the same four-box setup.
it illustrates a solver technique, not a claim that newt implements caching.
a small kick changes the answer; reuse still reduces the measured work here.

## put the pieces under load

a heavy projectile makes the coupling visible. aim low to remove support,
or high to peel boxes off the wall. the projectile has eight times each
box's mass. every impact changes the constraints the next sweep will see.

<!-- widget: projectile-stack -->

the scene uses fixed steps, clipped box contacts, and sequential impulses.
position correction repairs overlap without adding velocity. it is a small
rigid-body model, not newt's soft-contact solver. newt still has a documented
RK4 difference: PGS/Newton forces stay fixed through stages, while MuJoCo
reevaluates them.

## make an actuator do work

newt grew from clamped position servos into a pipeline: control, activation,
gain, bias, transmission, and force limits. muscles add length and velocity
curves. the same activation cannot produce the same force at every length
or shortening speed.

<!-- widget: muscle-arm -->

raise activation and watch elbow torque change as the tendon shortens.
this demo uses newt's documented active curve shapes with a simple straight
tendon and damped two-link dynamics; it omits passive muscle force. newt also
supports fixed and spatial tendons, wrapping, and length Jacobians. its muscle
loader requires a length range instead of discovering one automatically.

a straight tendon is only the first case. swing the link below: the tendon
finds two tangent points and an arc around the peg. when it clears the peg,
the arc shrinks to zero and the length stays continuous.

<!-- widget: tendon-wrap -->

newt extends this construction to sphere and cylinder wraps. length derivatives
turn tendon tension into joint torque, so a routing error becomes a force error.

## a model you can inspect

JSON came first, then a hand-written XML parser for an MJCF subset. paired
fixtures must produce byte-identical newt trajectories. unsupported fields
must fail: silently ignoring a damping setting means silently loading a
different physical model.

sensors and queries made controllers possible. frames matter: an accelerometer
reports specific force, reading zero in free fall and support against gravity
at rest. joint readings, gyros, touch, force, torque, rangefinders, keyframes,
and point Jacobians each need explicit semantics.

## the biped was the integration test

the walker combined a free pelvis, ten hinges, foot contacts, actuators, and
a gait controller at `dt = 0.005 s`. the recorded assisted 5000-step run covered
about 2.52 meters at 117.60 bpm, with roughly 0.20 meters of foot clearance.
these are documented engine results, not browser measurements.

![newt’s assisted biped rendered through chimy2](/projects/newt-chimy2-1.png)

assistance matters: `assist_scale=0.8` applies a balance wrench at the root.
in the matched v3 oracle, both engines walk at 0.8 and fall at lower levels.
the 0.4 run still has a 205-step fall-time gap. the milestone was a robot
whose differences i could measure, not unassisted walking.

## evidence before speed

analytic anchors check known answers. goldens check repeatability. differential
tests compare against offline MuJoCo captures with matched models, state,
steps, and controls. those comparisons need tolerances: newt state is f32,
captured MuJoCo state is f64. a measured residual belongs beside its bound;
raising a tolerance does not explain a mismatch.

performance work then removed repeated allocation in ABA, tendon, and Newton
workspace while preserving fixtures. timings vary by scene and machine;
there is no general real-time guarantee. starting from zero made the boundaries
visible. the useful result is being able to change one, replay the inputs,
and explain why the motion changed.
