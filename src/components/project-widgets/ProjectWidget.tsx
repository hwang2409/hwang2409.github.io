'use client';

import IntegratorsWidget from './IntegratorsWidget';
import SpringWidget from './SpringWidget';
import TimestepWidget from './TimestepWidget';

const widgets = {
  integrators: IntegratorsWidget,
  timestep: TimestepWidget,
  spring: SpringWidget,
} as const;

export type ProjectWidgetName = keyof typeof widgets;

export default function ProjectWidget({ name }: { name: ProjectWidgetName }) {
  const Widget = widgets[name];
  return <Widget />;
}
