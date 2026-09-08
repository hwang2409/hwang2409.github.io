'use client';

import IntegratorsWidget from './IntegratorsWidget';
import SpringWidget from './SpringWidget';
import TimestepWidget from './TimestepWidget';

import PendulumTreeWidget from './PendulumTreeWidget';
import SolverIterationsWidget from './SolverIterationsWidget';
import FrictionConeWidget from './FrictionConeWidget';
import DeterminismWidget from './DeterminismWidget';

const widgets = {
  integrators: IntegratorsWidget,
  timestep: TimestepWidget,
  spring: SpringWidget,
  'pendulum-tree': PendulumTreeWidget,
  'solver-iterations': SolverIterationsWidget,
  'friction-cone': FrictionConeWidget,
  'determinism-replay': DeterminismWidget,
} as const;

export type ProjectWidgetName = keyof typeof widgets;

export default function ProjectWidget({ name }: { name: ProjectWidgetName }) {
  const Widget = widgets[name];
  return <Widget />;
}
