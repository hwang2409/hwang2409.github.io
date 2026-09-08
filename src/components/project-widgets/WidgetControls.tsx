import { Children, isValidElement, type ComponentProps, type InputHTMLAttributes, type ReactNode } from 'react';

type ControlGroupProps = {
  label?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function WidgetControls({ label, actions, children, readout, note }: {
  label?: string;
  actions?: ReactNode;
  children: ReactNode;
  readout?: ComponentProps<'p'>;
  note?: ReactNode;
}) {
  return <>
    <div className="project-widget-controls">
      {label || actions ? <ControlGroup label={label} actions={actions}>{children}</ControlGroup> : children}
    </div>
    {readout && <p className="project-widget-readout" {...readout} />}
    {note && <p className="project-widget-note">{note}</p>}
  </>;
}

export function PauseButton({ paused, onClick }: {
  paused: boolean;
  onClick: () => void;
}) {
  return <button type="button" aria-pressed={paused} onClick={onClick}>[{paused ? 'play' : 'pause'}]</button>;
}

function controlCount(children: ReactNode): number {
  return Children.toArray(children).reduce<number>((count, child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return count;
    if (child.type === 'button' || child.type === 'input' || child.type === 'select' || child.type === 'textarea'
      || child.type === Slider || child.type === ControlField || child.type === PauseButton) return count + 1;
    return count + controlCount(child.props.children);
  }, 0);
}

export function ControlGroup({ label, actions, children }: ControlGroupProps) {
  const legend = label && controlCount([actions, children]) > 1 ? label : undefined;
  const Group = legend ? 'fieldset' : 'div';
  return (
    <Group className="project-widget-group">
      {legend && <legend>{legend}</legend>}
      <div className="project-widget-group-content">
        {actions && <div className="project-widget-actions">{actions}</div>}
        {children && <div className="project-widget-fields">{children}</div>}
      </div>
    </Group>
  );
}

export function ControlField({ label, value, children }: {
  label: string;
  value?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="project-widget-field">
      <span className="project-widget-field-heading">
        <span>{label}</span>
        {value !== undefined && <span className="project-widget-value">{value}</span>}
      </span>
      {children}
    </label>
  );
}

export function Slider({ label, valueText, ...inputProps }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  valueText: string;
}) {
  return (
    <ControlField label={label} value={valueText}>
      <input type="range" {...inputProps} />
    </ControlField>
  );
}
