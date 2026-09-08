'use client';

import IntegratorsWidget from './IntegratorsWidget';
import SpringWidget from './SpringWidget';
import TimestepWidget from './TimestepWidget';
import TriangleRasterWidget from './TriangleRasterWidget';
import ZBufferWidget from './ZBufferWidget';
import PerspectiveTextureWidget from './PerspectiveTextureWidget';
import ShadingModelWidget from './ShadingModelWidget';
import PipelineWidget from './PipelineWidget';
import ScanlineWidget from './ScanlineWidget';
import DepthViewWidget from './DepthViewWidget';
import FrustumWidget from './FrustumWidget';

import PendulumTreeWidget from './PendulumTreeWidget';
import SolverIterationsWidget from './SolverIterationsWidget';
import FrictionConeWidget from './FrictionConeWidget';
import DeterminismWidget from './DeterminismWidget';

import PlaygroundWidget, { ProjectileStackWidget } from './PlaygroundWidget';
import BroadPhaseWidget from './BroadPhaseWidget';
import MuscleArmWidget from './MuscleArmWidget';

const widgets = {
  playground: PlaygroundWidget,
  'projectile-stack': ProjectileStackWidget,
  'broad-phase': BroadPhaseWidget,
  'muscle-arm': MuscleArmWidget,
  integrators: IntegratorsWidget,
  timestep: TimestepWidget,
  spring: SpringWidget,
  'pendulum-tree': PendulumTreeWidget,
  'solver-iterations': SolverIterationsWidget,
  'friction-cone': FrictionConeWidget,
  'determinism-replay': DeterminismWidget,
  'triangle-raster': TriangleRasterWidget,
  'zbuffer-toggle': ZBufferWidget,
  'perspective-texture': PerspectiveTextureWidget,
  'shading-model': ShadingModelWidget,
  'raster-pipeline': PipelineWidget,
  'scanline-theater': ScanlineWidget,
  'depth-buffer-view': DepthViewWidget,
  'frustum-culling': FrustumWidget,
} as const;

export type ProjectWidgetName = keyof typeof widgets;

export default function ProjectWidget({ name }: { name: ProjectWidgetName }) {
  const Widget = widgets[name];
  return <Widget />;
}
