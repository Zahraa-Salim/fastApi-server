/**
 * Loading indicator component.
 * Shows a spinner with optional message during async operations.
 */
export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="spinner">
      <div className="spinner__dot" />
      <span>{label}</span>
    </div>
  );
}
