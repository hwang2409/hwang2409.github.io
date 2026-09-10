import WalSegmentWidget from './WalSegmentWidget';
import VectorQueryWidget from './VectorQueryWidget';
import HnswBuildWidget from './HnswBuildWidget';
import RecallWidget from './RecallWidget';
import Bm25Widget from './Bm25Widget';
import HybridSearchWidget from './HybridSearchWidget';
import ContactSoftnessWidget from './ContactSoftnessWidget';
import TendonWrapWidget from './TendonWrapWidget';
import WarmStartWidget from './WarmStartWidget';
import InverseDynamicsWidget from './InverseDynamicsWidget';
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
import TextureFilteringWidget from './TextureFilteringWidget';
import MipmapWidget from './MipmapWidget';
import ProjectionWidget from './ProjectionWidget';
import NearClippingWidget from './NearClippingWidget';

import PendulumTreeWidget from './PendulumTreeWidget';
import SolverIterationsWidget from './SolverIterationsWidget';
import FrictionConeWidget from './FrictionConeWidget';
import DeterminismWidget from './DeterminismWidget';

import PlaygroundWidget, { ProjectileStackWidget } from './PlaygroundWidget';
import BroadPhaseWidget from './BroadPhaseWidget';
import MuscleArmWidget from './MuscleArmWidget';

const widgets = {
  'wal-segments': WalSegmentWidget,
  'vector-query': VectorQueryWidget,
  'hnsw-build': HnswBuildWidget,
  'recall-tradeoff': RecallWidget,
  'bm25-scoring': Bm25Widget,
  'hybrid-search': HybridSearchWidget,

  'contact-softness': ContactSoftnessWidget,
  'tendon-wrap': TendonWrapWidget,
  'warm-start': WarmStartWidget,
  'inverse-dynamics': InverseDynamicsWidget,
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
  'texture-filtering': TextureFilteringWidget,
  'mipmap-levels': MipmapWidget,
  projection: ProjectionWidget,
  'near-plane-clipping': NearClippingWidget,
} as const;

export type ProjectWidgetName = keyof typeof widgets;

export function isProjectWidgetName(name: string): name is ProjectWidgetName {
  return Object.prototype.hasOwnProperty.call(widgets, name);
}

export default function ProjectWidget({ name }: { name: ProjectWidgetName }) {
  const Widget = widgets[name];
  return <Widget />;
}
