import type { ComponentProps, InputHTMLAttributes, ReactNode } from 'react';

type ControlGroupProps = {
  label: string;
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
      {label ? <ControlGroup label={label} actions={actions}>{children}</ControlGroup> : children}
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

export function ControlGroup({ label, actions, children }: ControlGroupProps) {
  return (
    <fieldset className="project-widget-group">
      <legend>{label}</legend>
      <div className="project-widget-group-content">
        {actions && <div className="project-widget-actions">{actions}</div>}
        {children && <div className="project-widget-fields">{children}</div>}
      </div>
    </fieldset>
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
