/**
 * Reusable select field component.
 * Wraps a dropdown with optional label and validation error display.
 */
import clsx from "clsx";
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, children, ...props },
  ref
) {
  return (
    <label className="field">
      {label ? <span className="field__label">{label}</span> : null}
      <select
        ref={ref}
        className={clsx("field__control", error && "field__control--error", className)}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
});
