import type { InputHTMLAttributes, ReactNode } from 'react';

export function ControlGroup({ label, actions, children }: {
  label: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
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
