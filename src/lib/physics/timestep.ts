export type BouncePoint = {
  time: number;
  height: number;
};

const gravity = -9.81;
const bounce = 0.82;

function nextHeight(height: number, velocity: number, dt: number) {
  let nextVelocity = velocity + gravity * dt;
  let nextHeight = height + nextVelocity * dt;

  if (nextHeight < 0) {
    nextHeight = -nextHeight;
    nextVelocity = -nextVelocity * bounce;
  }

  return { height: nextHeight, velocity: nextVelocity };
}
export function simulateFixedTrace(
  jitter = 0,
  seed = 0,
  duration = 3,
  dt = 1 / 60,
): BouncePoint[] {
  let height = 1;
  let velocity = 0;
  let frameTime = 0;
  let simulationTime = 0;
  let accumulator = 0;
  const maxAccumulator = dt * 5;
  const stepEpsilon = dt * 1e-9;
  const points: BouncePoint[] = [{ time: simulationTime, height }];

  for (let frame = 0; frameTime < duration; frame += 1) {
    const frameDt = Math.min(frameDelta(frame, jitter, seed), duration - frameTime);
    frameTime += frameDt;
    accumulator = Math.min(maxAccumulator, accumulator + frameDt);

    while (accumulator + stepEpsilon >= dt && simulationTime < duration) {
      ({ height, velocity } = nextHeight(height, velocity, dt));
      simulationTime += dt;
      accumulator = Math.max(0, accumulator - dt);
      points.push({ time: simulationTime, height });
    }
  }

  return points;
}

function frameDelta(frame: number, jitter: number, seed: number) {
  const wave = Math.sin((frame + seed * 13) * 1.7) * 0.5 + Math.sin((frame + seed) * 0.73) * 0.5;
  return Math.max(0.006, 1 / 60 + wave * jitter * 0.012);
}

export function simulateVariableTrace(
  jitter: number,
  seed: number,
  duration = 3,
): BouncePoint[] {
  let height = 1;
  let velocity = 0;
  let time = 0;
  const points: BouncePoint[] = [{ time, height }];

  for (let frame = 0; time < duration; frame += 1) {
    const dt = Math.min(frameDelta(frame, jitter, seed), duration - time);
    ({ height, velocity } = nextHeight(height, velocity, dt));
    time += dt;
    points.push({ time, height });
  }

  return points;
}

export function sampleTrace(trace: BouncePoint[], time: number) {
  for (let index = 1; index < trace.length; index += 1) {
    if (trace[index].time >= time) {
      const previous = trace[index - 1];
      const current = trace[index];
      const span = current.time - previous.time || 1;
      const amount = (time - previous.time) / span;
      return previous.height + (current.height - previous.height) * amount;
    }
  }

  return trace[trace.length - 1].height;
}
