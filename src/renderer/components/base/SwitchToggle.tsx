import React from 'react';
import '../../assets/styles/components/SwitchToggle.scss';

export interface SwitchToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  disabled?: boolean;
}

export default function SwitchToggle({
  id,
  checked,
  onChange,
  label,
  helperText,
  disabled,
}: SwitchToggleProps) {
  return (
    <div
      className={`modern-switch-group ${disabled ? 'is-disabled' : ''} ${
        checked ? 'is-checked' : ''
      }`}
    >
      <div className="switch-content">
        {label && (
          <label htmlFor={id} className="switch-label">
            {label}
          </label>
        )}
        {helperText && <span className="switch-helper">{helperText}</span>}
      </div>

      <label htmlFor={id} className="switch-control">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch-slider" />
      </label>
    </div>
  );
}

SwitchToggle.defaultProps = {
  label: null,
  helperText: null,
  disabled: false,
};
