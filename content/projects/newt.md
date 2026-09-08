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

i wanted to recreate MuJoCo from scratch in rust. not just a falling-box demo:
articulated dynamics, soft contacts, actuators, tendons, sensors, and models
loaded from MJCF. feature parity is the direction, not a claim that i have
finished it.

the constraint was zero runtime dependencies. no physics engine underneath,
no linear algebra crate, no collision library. even the transcendental math
is mine. newt runs on the CPU. a separate renderer consumes its poses, but
rendering is outside the engine.

i built it in layers. first free bodies, then contacts, then hinge trees and
actuators, then a model format. the later passes added more joints, a real
constraint solver, sensors, robot controls, and closer comparisons with
MuJoCo. each layer needed a way to prove something before the next one
could depend on it.

<p class="project-demo-note">the seven interactive demos below are small, dependency-free typescript models. they explain the ideas; they do not run newt or establish MuJoCo parity.</p>

## a body and a step

the first body needed more than a position. it had mass, a center of mass,
linear velocity, orientation, angular velocity, and an inertia tensor.
inertia describes how hard it is to rotate the body around different axes.
a long box does not respond to every torque in the same way.

i stored orientation as a unit quaternion. angular velocity lives in body
coordinates, where the inertia tensor stays constant. positions and linear
velocities live in world coordinates. that choice makes the rotational
equation compact, but makes every conversion between frames important.

the first integrator was RK4. it evaluates the derivative at four stages of
a step and takes their weighted sum. the intermediate quaternion states
stay unnormalized; i normalize once at the end. changing intermediate
states would change the method i was trying to test.

later i added euler and implicitfast. newt's euler advances velocity first,
then advances position using that new velocity. the order is the difference
between explicit and semi-implicit euler:

```text
explicit:       position += old_velocity * dt
semi-implicit:  position += new_velocity * dt
```

<!-- widget: integrators -->

drag the launch handle or change either velocity. this throw uses a large
0.17-second step so the difference stays visible. the dashed path is explicit
euler, the solid path is semi-implicit euler, and the dotted path is RK4.
explicit euler is a comparison here, not a fourth newt integrator.

under constant gravity, using the old vertical velocity puts the projectile
too high. using the new velocity puts it too low. RK4 recovers the constant
acceleration arc at its sample points. the displayed trails stop at the
ground; this demo does not solve an exact impact time.

implicitfast addresses a different problem: strong velocity-dependent
forces. newt's euler already folds joint damping into the acceleration solve.
implicitfast also folds in supported joint-actuator velocity terms. that
avoids applying a large damper as a force based only on the old velocity.

this is a limited implicitfast implementation. tendon-actuator velocity terms
remain explicit because their coupling is a dense matrix, not a diagonal
joint correction. force-clamp derivatives are omitted too. the integrator
name alone does not establish identical behavior to MuJoCo.

## make the clock boring

a fixed timestep came before elaborate scenes. the world advances by `dt`,
not by however long the last frame took. a viewer can accumulate frame time,
spend it in fixed simulation steps, and carry the remainder forward.

<!-- widget: timestep -->

increase frame jitter, then replay. the previous run stays as a dashed ghost.
the fixed-step bounce follows the same samples. the frame-step bounce changes
because it integrates a different sequence of step sizes. the jitter here
is a generated timing sequence, not a measurement of your browser.

fixed steps are necessary for repeatable runs, but they are not sufficient.
contact ordering matters. so does the order of arithmetic. a different last
bit today can become a different contact tomorrow.

i used a deterministic scalar policy. basic arithmetic and square root stay
on the IEEE path. sin, cos, tan, exp, and ln use hand-written range reduction
and polynomial approximations instead of platform libm. range reduction
brings an input into a small interval where a polynomial can approximate it
well. sin and cos reduce around multiples of π/2 before evaluating their
small-interval polynomials.

i also kept state and contacts in deterministic order, with index-based tie
breaks. the golden trajectories serialize state at fixed step counts. the
original cross-platform gate compared those bytes between macOS and linux.
that tests repeatability of newt; it is separate from matching another engine.

<!-- widget: determinism-replay -->

the two double pendulums start from the same state and integrate separately.
`run bytes` compares their full traces as bytes. replay uses the same inputs,
so it produces the same trace again in this implementation.

press [perturb] to add `1e-6` radians to the first angle on the right. the
motion initially looks identical, then separates. deterministic does not
mean insensitive. it means the same input follows the same calculation.
this browser example uses JavaScript math; it does not demonstrate newt's
cross-platform scalar policy. reduced motion shows the perturbed end state,
and [step] lets you inspect the start.

## contact starts as a spring

the next layer was contact. detecting an overlap does not say what force to
apply. my first version used a penalty model: penetration acts like a
compressed spring, and relative normal velocity supplies damping.

```text
normal_force = max(0, stiffness * penetration - damping * normal_velocity)
```

the zero clamp matters. a separating contact must not pull two bodies back
together. the force acts at the contact point, so it also creates a torque
about each body's center of mass. the other body receives the opposite
force. getting the force right but dropping that lever arm still produces
a wrong simulation.

<!-- widget: spring -->

drag the mass or set its displacement. change damping to see oscillation,
fast settling near critical damping, and slow return under heavy damping.
this is a unit-mass spring with stiffness 18, integrated with semi-implicit
euler. the small plot fits its own trace.

penalty contact gave me an understandable first checkpoint: a resting body
should compress the spring until its force balances weight. a bounce should
lose energy with damping. a two-body collision should conserve total linear
momentum. those checks made more useful claims than a stack that merely
looked plausible.

the penalty path remains available. it is also the legacy default. the soft
constraint solvers came later; they did not silently replace every old run.

## from bodies to joint coordinates

independent free bodies were a starting point, not the representation i
wanted for a robot. for an articulated chain i chose generalized coordinates:
store the degrees of freedom the joints actually permit.

a maximal-coordinate approach would store every link's independent pose and
velocity, then use constraints to keep the joints together. in a tree,
joint-space state makes those connections part of the representation.
forward kinematics reconstructs body poses from the root through the links.
there is no separate hinge-position error to repair after every step.

`q` holds positions; `qdot` holds velocities. a hinge contributes one angle
and one angular rate. a slide contributes one displacement and one linear
rate. a ball joint needs four quaternion components for position but only
three angular-velocity components. a free root needs seven position values
and six velocity values. `q` and `qdot` therefore need not have equal lengths.

<!-- widget: pendulum-tree -->

drag either link or use its angle slider. joint 2's angle is relative to
joint 1, so moving the parent also moves the child's frame. the rods remain
connected because their endpoints come from the joint angles.

this demo solves the coupled equations for two unit point masses on massless
rods, using RK4. it is not ABA. it exposes the joint-space state that ABA
operates on, without hiding a large engine behind the diagram.

the first tree supported hinges and free roots. slide and ball joints joined
later. the same ordered link list visits parents before children. keeping
that order explicit made both the kinematics and the dynamics easier to
check.

## solve the tree in three passes

Featherstone's Articulated Body Algorithm, ABA, computes forward dynamics:
given a pose, velocity, and applied forces, find the joint accelerations.
it runs in O(n) for a tree of n links with bounded joint sizes. that is a
claim about the tree dynamics, not the entire collision and solver pipeline.

the first pass walks from root to leaves. it computes transforms, velocities,
and velocity-dependent bias terms. the second walks back toward the root,
collecting each subtree's articulated inertia and eliminating its joint
motion. the third walks outward again to recover accelerations.

spatial algebra makes these passes manageable. a six-component motion vector
combines angular and linear velocity. a corresponding force vector combines
torque and force. transforming both correctly preserves their relationship
across body frames. most of the difficulty was in signs, frame conventions,
and where a force acts, not the length of the final loop.

v1 added two independent paths. composite rigid body, CRB, constructs the
joint-space mass matrix. recursive Newton–Euler, RNE, computes inverse
dynamics: which forces would produce a requested acceleration?

```text
M(q) * qddot + h(q, qdot) = applied_force
```

`M` describes inertia in joint coordinates. `h` includes gravity and the
Coriolis and centrifugal terms. a hand-written Cholesky factorization solves
the dense positive-definite mass-matrix systems when that path is needed.

the strongest check was a round trip. feed forces into ABA, take its
accelerations, and ask RNE to reconstruct the forces. they should agree
within tolerance when the same force conventions apply. CRB supplies another
check: solving the mass-matrix equation should agree with ABA too.

these are different algorithms. one does not call the other to produce its
answer. mixed joints, nonzero velocities, and free roots make the checks
exercise the places where a symmetric or stationary toy can hide a mistake.

## finding what touches

collision has two questions. which pairs should i examine? and, for each
candidate, where do the surfaces meet?

the first is the broad-phase concern. the documented baseline enumerates
geometry pairs in a stable order and applies filters such as same-body and
static–static exclusion. explicit pair lists can restrict that work. this
baseline is not a claim of a subquadratic spatial broad phase.

the narrow phase is geometric. simple primitive pairs have direct routines.
boxes need separating-axis tests, including edge–edge axes. supporting only
obvious vertex–face cases missed contacts between rotated boxes. a contact
manifold can need several points to support a face without letting it tip.

for convex queries, a support function returns the farthest point in a given
direction. GJK uses support queries on the difference of two convex shapes
to test whether that difference contains the origin. EPA expands the
resulting polytope to estimate penetration and a separating direction.
newt implements this machinery itself.

one penetration point is not always enough. the mesh–mesh path adds feature
recovery and clipping after GJK/EPA, with up to four face contacts. heightfields
split grid cells into triangular prisms. their bases and outside walls matter
too; terrain is not just an infinitely thin graph of heights.

support stays pair-specific. sphere, capsule, and box heightfield pairs are
documented; several other heightfield pairs are rejected. box–mesh remains
deferred because of a measured normal mismatch. having a support function
for a shape does not mean every collision pair is validated.

## soft constraints and friction cones

v1 introduced the soft-constraint model. a Jacobian maps generalized velocity
to motion along a contact direction. the solver uses those rows to relate
contact forces to the motions they must resist.

`solref` specifies the reference response, including its time constant and
damping ratio. `solimp` controls impedance: how strongly the constraint acts
as penetration grows. diagonal regularization gives the constraint finite
compliance. a small overlap under load can be part of this model, not proof
that the iteration loop failed.

friction adds a bound. with normal force `N`, the available tangential force
is limited by `μN`. in two tangential directions, an elliptic cone has a
round cross-section for equal coefficients. a pyramidal cone replaces the
curved boundary with flat facets. that choice changes both the admissible
forces and the projection used by the solver.

<!-- widget: friction-cone -->

on this incline, gravity requires tangential support `mg sin(θ)` and normal
support `mg cos(θ)`. their ratio is `tan(θ)`. the block can stick when that
ratio is no greater than `μ`. otherwise it slides with acceleration
`g(sin(θ) - μ cos(θ))`.

the drawing shows a two-dimensional cone cross-section. it assumes equal
static and kinetic coefficients, a rigid plane, and no rotation. newt's soft
contacts have more state and a coupled solve. the threshold here isolates
the part that decides whether the required support force fits in the cone.

## one correction changes the next

projected Gauss–Seidel, PGS, updates one constraint row at a time. it computes
a residual, corrects that row's force, and projects the result into its
allowed range. a normal contact cannot pull; a friction force must stay
inside its cone. the next row sees the update immediately.

a stack shows why one sweep is insufficient. pushing the bottom box out of
the floor changes its contact with the next box. fixing that contact changes
the next one. information must pass through the stack more than once.

<!-- widget: solver-iterations -->

increase the iteration count from 1 to 30. this small model integrates four
vertically moving unit boxes, then projects their penetrations in sequence.
its deliberately large `1/12`-second step makes the remaining overlap visible.
the readout measures the maximum remaining penetration after each solve.

this is position correction, not newt's regularized force-space PGS solver.
it demonstrates repeated local updates. more sweeps reduce its residual;
they do not change the underlying force law or make the timestep smaller.

warm starting would reuse a previous step's contact forces as the next
initial guess. that can help persistent contacts, but only if the old and
new contact rows still correspond. i am not claiming a shipped warm-start
speedup here: the solver docs describe the fixed-sweep baseline.

Newton came later. it uses the same soft-constraint rows, a dense Hessian,
Cholesky solves, and a line search over the supported projection regions.
it can take a more global correction. one documented stack anchor accepted
one Newton step where the baseline PGS ran 30 sweeps. those are different
units of work; that result is not a universal 30× speedup.

conjugate gradient is another iterative search approach, using conjugate
search directions instead of a dense Newton factorization. the documented
shipped soft-constraint modes in this build story are PGS and Newton; i do
not count CG as implemented. Newton also rejects elliptic cones in the
current documented path because its line search assumes piecewise-quadratic
regions. PGS supports both cone choices.

integration still matters after the solve. euler detects and solves the
current contact set before advancing state. penalty RK4 recomputes contact
forces at each stage. PGS and Newton under RK4 hold the constraint forces
through the stages. MuJoCo reevaluates them. that remaining difference is
visible in differential tests.

## make a robot model useful

actuators arrived early as clamped position servos for a three-link arm.
the later general model separated control, activation, gain, bias,
transmission, and force limits. motor, position, and velocity actuators are
different settings of that pipeline. a gear factor belongs to transmission
space: it affects the position and velocity the actuator sees, as well as
the force it delivers.

a muscle adds force–length and force–velocity curves. equal activation does
not produce equal force at every length or shortening speed. activation and
deactivation also have their own time constants. the supported loader
requires a length range; it does not run MuJoCo's automatic compiler search
to discover one.

tendons connect that force to several joints. a fixed tendon is a weighted
sum of joint coordinates. a spatial tendon follows sites through the world.
when it wraps around a sphere, its path contains two tangent segments and an
arc. cylinder wrapping and pulley branches extend the same length model.
the length Jacobian turns a scalar tendon force into generalized joint forces.
getting length right while getting that derivative wrong still drives the
robot incorrectly.

sensors made the state usable by a controller. joint and frame readings have
specified coordinates and frames. an accelerometer reports specific force,
including the offset from the center of mass: it reads zero in free fall
and measures support against gravity at rest. gyro, touch, force, torque,
and rangefinder readings each need similarly explicit semantics.

the native model format was JSON with a hand-written parser. MJCF came
later through a hand-written XML parser and a documented subset. defaults
and classes resolve into the same scene representation. paired JSON and
MJCF fixtures should then produce byte-identical newt trajectories.

unsupported fields must produce an error. silently ignoring a misspelled
damping field would load a different physical model while pretending it was
the same one. keyframes, point Jacobians, inverse-dynamics queries, and mocap
poses round out the interface between a robot controller and the simulation.

## make the comparison independent

i needed three kinds of evidence. analytic anchors check things with known
answers: free fall, a pendulum, momentum, or a static friction threshold.
goldens check whether newt repeats its own recorded trajectory. differential
tests check how it differs from real MuJoCo.

the differential harness captures MuJoCo runs offline, with their model,
initial state, timestep, solver, and controls. rust tests load the same model
and compare state at the same sampled steps. these are tolerance comparisons,
not byte comparisons: MuJoCo's captured values are f64, while newt's engine
state is f32.

an error bound needs a measured error beside it. the scorecard separates
parity, bounded divergence, and open findings. a contact-count mismatch,
a phase-order mismatch, and an integrator mismatch can all move a body,
but they need different fixes. raising a trajectory tolerance does not
explain which one happened.

## the biped was the integration test

the walker joined the layers: a free pelvis, ten hinges, joint damping and
armature, foot contacts, position actuators, site queries, and a gait
controller. the fixed step is 0.005 seconds. i ported the model and controller
rather than treating any vaguely walking robot as a match.

the assisted 5000-step acceptance run covered about 2.52 meters at 117.60 bpm,
with roughly 0.20 meters of foot clearance and no self-contact force steps.
those are recorded results from the documented configuration, not numbers
from these browser demos.

assistance is part of that sentence. `assist_scale=0.8` applies a source-style
balance wrench at the root. a later sweep reduced it to 0.4, 0.2, and zero.
in the matched v3 oracle, both engines walk at 0.8 and fall at the lower
levels. matching that outcome class does not mean their fall times match.
the 0.4 run still has a documented 205-step fall-time gap.

the milestone was an end-to-end robot model whose differences i could measure.
it was not an unassisted walking claim. contact masks, target angles, and
state checkpoints made a failed run something i could inspect below the
level of “the robot fell.”

## performance after correctness

i measured fixed scenes across penalty/RK4, PGS/euler, and Newton/euler.
the benchmark records distributions over repeated samples, not just a single
best time. timing is separate from physics acceptance.

the useful changes were often about work i should not have repeated:
reuse ABA workspace across steps and RK4 stages, reuse tendon scratch
storage, and reuse Newton response buffers. allocation checks make part of
that promise testable. the performance passes kept the existing golden and
differential fixtures unchanged.

the measurements also kept their limits. some workspace changes looked much
faster on one machine and nearly neutral in a review run. the biped timing
includes setup that other scene timings exclude. i would rather retain those
details than flatten the table into one speedup number.

there is still no GPU compute, no external runtime crate, and no general
real-time guarantee. sparse factorization remains future work in the Newton
docs. a browser build is a possible extension, not a requirement that shaped
the core or something these typescript widgets deliver.

starting from zero made every boundary visible: coordinate frames, force
transmission, collision support, solver residuals, and the clock itself.
the result is useful when i can change one of those pieces, replay the
same inputs, and explain exactly why the motion changed.
