/**
 * Reusable button component.
 * Provides consistent button variants, loading state, and full-width mode.
 */
import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  className,
  disabled,
  fullWidth = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx("btn", `btn--${variant}`, fullWidth && "btn--full", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
