/**
 * Reusable input field component.
 * Wraps a text input with optional label and validation error display.
 */
import clsx from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, ...props },
  ref
) {
  return (
    <label className="field">
      {label ? <span className="field__label">{label}</span> : null}
      <input
        ref={ref}
        className={clsx("field__control", error && "field__control--error", className)}
        {...props}
      />
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  );
});
