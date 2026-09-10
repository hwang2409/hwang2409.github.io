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

drop a box, pull a ball, or turn gravity off. the layers below explain what
makes this scene work.

<!-- widget: playground -->

<p class="project-demo-note">these fifteen TypeScript demos explain the math; they do not run newt or establish MuJoCo parity.</p>

## a body and a step

everything downstream is one type. a `Body` carries mass, an inertia
tensor and its precomputed inverse, a world-frame position, a unit
quaternion orientation, a linear velocity of the COM, and a body-frame
angular velocity:

```rust
pub struct Body {
    pub mass: f32,
    pub inertia_body: Mat3,
    pub inertia_body_inverse: Mat3,
    pub position: Vec3,
    pub linear_velocity: Vec3,
    pub orientation: Quat,
    pub angular_velocity_body: Vec3,
    // ...
}
```

angular velocity stays in body coordinates so the inertia tensor is
constant across the step. `inertia_body_inverse` is stored so the hot path
never inverts a 3x3 in the loop.

<!-- widget: integrators -->

the integrator itself is a small enum on the world:

```rust
pub enum Integrator {
    /// MuJoCo-style semi-implicit Euler.
    Euler,
    /// MuJoCo's documented implicit-in-velocity approximation.
    ImplicitFast,
    /// The original four-stage integrator. This is the default.
    #[default]
    Rk4,
}
```

explicit euler uses the old velocity; `Euler` (semi-implicit) uses the new
one. `Rk4` is four derivative evaluations, then one weighted update, with
quaternion normalization at the end, not between stages. `ImplicitFast`
folds supported joint damping and actuator velocity terms into the
mass-matrix solve; tendon coupling and force-clamp derivatives stay
explicit.

## make the clock boring

the world advances by a fixed `dt`, not the last frame's duration. a viewer
accumulates real time, spends it in whole steps, and carries the remainder:

```rust
self.step_accumulator += self.speed;
let steps = self.step_accumulator.floor() as usize;
self.step_accumulator -= steps as f32;
for _ in 0..steps {
    self.world.step();
}
```

<!-- widget: timestep -->

fixed steps are necessary, but ordering and arithmetic matter too. newt
uses stable contact order, index tie breaks, and its own scalar routines:
sin/cos range reduction and polynomials, plus tan, asin, and atan2. golden
trajectories serialize state at fixed steps. repeatability is separate from
matching another engine.

## repeatable does not mean predictable

identical pendulum inputs produce identical trace bytes. perturb one
starting angle by `1e-6` radians to expose their sensitivity.

<!-- widget: determinism-replay -->

the log plot shows actual angle differences, not a fitted line. this
JavaScript calculation does not prove newt's cross-platform scalar policy.

## contact starts as a spring

my first contacts used a penalty force: stiffness times penetration, minus
damping times normal velocity, clamped at zero. a separating contact cannot
pull. applying that force away from the center also creates torque. the
narrow-phase output is one flat record per contact:

```rust
pub struct Contact {
    pub geom_a: usize,
    pub geom_b: usize,
    pub position_world: Vec3,
    /// Unit normal in world coordinates, pointing FROM B into A.
    pub normal_world: Vec3,
    pub penetration: f32,
    pub friction: f32,
    pub gap: f32,
}
```

`normal_world` fixes the sign convention, `penetration` is already shifted
by the pair margin so the solver skips a contact while `penetration <= gap`,
and `friction` is the pair Coulomb coefficient. per-pair `solref`/`solimp`
live off the geom pair, not on the contact.

<!-- widget: spring -->

newt's penalty path remains the legacy default. before building stacks, i
checked static compression, bounce energy loss, and equal-and-opposite
collision forces.

## from bodies to joint coordinates

robots need connected bodies. a `JointKind` names what motion each joint
permits:

```rust
pub enum JointKind {
    Free,
    Fixed,
    Hinge { axis: Vec3, range: Option<(f32, f32)>, damping: f32, armature: f32, limit: JointLimit },
    Slide { axis: Vec3, range: Option<(f32, f32)>, damping: f32, armature: f32, limit: JointLimit },
    Ball  { damping: f32, armature: f32 },
}
```

a hinge stores one axis and one `q`; a ball stores four `q` (a quaternion)
and three `qdot` (a body-frame angular velocity). position and velocity
arrays have different lengths on purpose. `armature` is the reflected rotor
inertia that ABA adds to `Sᵀ IA S`.

the containing `Tree` stitches links together and stores those coordinates
as one flat vector each:

```rust
pub struct Tree {
    pub links: Vec<Link>,
    pub q_offset: Vec<usize>,
    pub v_offset: Vec<usize>,
    pub q: Vec<f32>,       // generalized position, follows JointKind::nq
    pub qdot: Vec<f32>,    // generalized velocity, follows JointKind::nv
    pub qfrc_applied: Vec<f32>,
    pub actuators: Vec<Actuator>,
    pub applied_wrenches: Vec<(Vec3, Vec3)>,
    pub tendons: Vec<Tendon>,
    // ...
}
```

<!-- widget: pendulum-tree -->

the demo solves two coupled point-mass equations with RK4. newt uses
Featherstone's ABA over this `Tree`: an outward velocity pass, an inward
articulated-inertia pass, then outward acceleration recovery. CRB mass
matrices and RNE inverse dynamics reuse the same layout for independent
round-trip checks.

the browser round trip checks coupled equations against cartesian forces
and moments: apply torque, calculate acceleration, then recover the torque.

<!-- widget: inverse-dynamics -->

this instantaneous dynamics check does not measure integrator error. newt's
documented round-trip tolerance is `5e-4`; browser arithmetic is f64.

## finding what touches

broad phase chooses pairs; narrow phase finds contact geometry. every geom
has an AABB, and the default broadphase is a dynamic AABB tree with fat
bounds:

```rust
pub struct Aabb {
    pub min: Vec3,
    pub max: Vec3,
}

pub enum BroadPhaseMode {
    #[default]
    DynamicAabbTree,
    /// Quadratic fallback kept for comparison and diagnostics.
    Naive,
}
```

<!-- widget: broad-phase -->

this sweep is a browser comparison, not a claim about newt's broad phase.
newt's documented baseline enumerates stable, filtered geometry pairs.
narrow phase uses primitive routines, box separating-axis tests, and GJK/EPA
for convex queries. face contacts need manifold recovery too. support
remains pair-specific: several heightfield pairs are rejected, and box-mesh
remains deferred after a measured normal mismatch.

## soft constraints and friction cones

v1 added soft constraints. a Jacobian maps joint velocity into contact
motion; `solref` sets reference response and `solimp` sets impedance.
regularization allows finite compliance, so a small overlap under load can
be intentional. the impedance profile is the five-parameter sigmoid:

```rust
pub struct SolImp {
    pub dmin: f32,
    pub dmax: f32,
    pub width: f32,
    pub midpoint: f32,
    pub power: u32,
}
```

`d(r)` interpolates from `dmin` at zero violation to `dmax` at `width`; the
fraction `d` is projected in the cone, the remainder `1 - d` becomes
regularization on `A`'s diagonal. friction bounds tangential force by `μN`;
the cone shape is a separate enum:

```rust
pub enum ConeKind {
    Pyramidal,
    Elliptic,
}
```

<!-- widget: contact-softness -->

<!-- widget: friction-cone -->

sliding starts when `tan(θ)` exceeds `μ`. this cross-section assumes equal
static and kinetic friction and no rotation. newt's PGS supports both
cones; their different boundaries change the force projection.

## one correction changes the next

the world-level solver configuration picks between penalty, PGS, and
Newton, and fixes the iteration count so runs stay bit-repeatable:

```rust
pub struct SolverConfig {
    pub mode: SolverMode,   // Penalty | Pgs | Newton
    pub iterations: u32,
    pub cone: ConeKind,
}
```

<!-- widget: solver-iterations -->

this demo projects positions, not newt's regularized force-space PGS rows.
the playground and wall share its mass-weighted correction, extended to 2d
contacts with rotation, friction, and restitution impulses. `Newton` runs a
dense Hessian with line search and rejects elliptic cones; CG is not
counted as implemented.

warm start applies the prior frame's impulses before the first sweep. cold
start rebuilds support forces from zero.

<!-- widget: warm-start -->

this velocity-space comparison illustrates a solver technique; it does not
claim that newt implements caching.

## put the pieces under load

the projectile has eight times each box's mass. aim low to remove support
or high to peel boxes off the wall.

<!-- widget: projectile-stack -->

the scene uses fixed steps, clipped box contacts, and sequential impulses.
position correction repairs overlap without adding velocity. it is a small
rigid-body model, not newt's soft-contact solver. newt still has a
documented RK4 difference: PGS/Newton forces stay fixed through stages,
while MuJoCo reevaluates them.

## make an actuator do work

newt grew from clamped position servos into a pipeline: control,
activation, gain, bias, transmission, and force limits. the transmission
model is a variant per flavor:

```rust
pub enum ActuatorFlavor {
    Position { kp: f32, kv: f32 },
    Velocity { kv: f32 },
    Motor    { gear: f32 },
    General  { gain_type: GainType, gain_prm: [f32; 3],
               bias_type: BiasType, bias_prm: [f32; 3], gear: f32 },
    Muscle   { gain_prm: [f32; 9], bias_prm: [f32; 9],
               length_range: [f32; 2], acc0: f32, gear: f32 },
}
```

each attached `Actuator` binds one flavor to a hinge/slide `link_idx` or
to a `tendon_target`, and carries an activation state:

```rust
pub struct Actuator {
    pub link_idx: usize,
    pub tendon_target: Option<usize>,
    pub flavor: ActuatorFlavor,
    pub dyn_type: DynType,        // None | Filter | Muscle
    pub ctrl_range: Option<(f32, f32)>,
    pub force_range: Option<(f32, f32)>,
    pub ctrl: f32,
    pub act: f32,
}
```

muscles add length and velocity curves. the same `act` cannot produce the
same force at every length or shortening speed.

<!-- widget: muscle-arm -->

this demo uses newt's documented active curve shapes with a simple straight
tendon and damped two-link dynamics; it omits passive muscle force. newt
also supports fixed and spatial tendons, wrapping, and length Jacobians.
its muscle loader requires a `length_range` instead of discovering one
automatically.

wrapping adds two tangent points and an arc around the peg. tendon length
stays continuous when the straight path clears it. wrap objects sit
between adjacent sites:

```rust
pub enum SpatialWrap {
    Sphere(WrapSphere),
    Cylinder(WrapCylinder),
}
```

<!-- widget: tendon-wrap -->

newt extends this construction to sphere and cylinder wraps. length
derivatives turn tendon tension into joint torque, so a routing error
becomes a force error.

## a model you can inspect

JSON came first, then a hand-written XML parser for an MJCF subset. the
loader assembles a `Scene`: a runtime `World` plus name tables that resolve
back to indices:

```rust
pub struct Scene {
    pub world: World,
    pub bodies_by_name: HashMap<String, usize>,
    pub trees_by_name: HashMap<String, usize>,
    pub links_by_name: Vec<HashMap<String, usize>>,
    pub geoms_by_name: HashMap<String, usize>,
    pub sites_by_name: HashMap<String, usize>,
    pub actuators_by_name: HashMap<String, (usize, usize)>,
    pub sensors_by_name: HashMap<String, usize>,
    pub tendons_by_name: HashMap<String, (usize, usize)>,
    // ...
}
```

paired fixtures must produce byte-identical newt trajectories. unsupported
fields must fail: silently ignoring a damping setting means silently
loading a different physical model.

sensors and queries made controllers possible. one enum spans every reading
newt exports; each variant is a validated index tuple:

```rust
pub enum SensorKind {
    JointPos { tree: usize, link: usize },
    JointVel { tree: usize, link: usize },
    Gyro(SiteFrame),
    Accelerometer(SiteFrame),
    Touch { geom: usize },
    Force { tree: usize, link: usize },
    Torque { tree: usize, link: usize },
    Rangefinder(SiteFrame),
    // ...
}
```

frames matter: an accelerometer reports specific force, reading zero in
free fall and support against gravity at rest. joint readings, gyros,
touch, force, torque, rangefinders, keyframes, and point Jacobians each
need explicit semantics.

## the biped was the integration test

the walker combined a free pelvis, ten hinges, foot contacts, actuators,
and a gait controller at `dt = 0.005 s`. the recorded assisted 5000-step
run covered about 2.52 meters at 117.60 bpm, with roughly 0.20 meters of
foot clearance. these are documented engine results, not browser
measurements.

![newt’s assisted biped rendered through chimy2](/projects/newt-chimy2-1.png)

assistance matters: `assist_scale=0.8` applies a balance wrench at the
root. in the matched v3 oracle, both engines walk at 0.8 and fall at lower
levels. the 0.4 run still has a 205-step fall-time gap. the milestone was a
robot whose differences i could measure, not unassisted walking.

## evidence before speed

analytic anchors check known answers. goldens check repeatability.
differential tests compare against offline MuJoCo captures with matched
models, state, steps, and controls. those comparisons need tolerances:
newt state is f32, captured MuJoCo state is f64. a measured residual
belongs beside its bound; raising a tolerance does not explain a mismatch.

performance work then removed repeated allocation in ABA, tendon, and
Newton workspace while preserving fixtures. timings vary by scene and
machine; there is no general real-time guarantee. the useful result is
being able to replay inputs and explain why the motion changed.
