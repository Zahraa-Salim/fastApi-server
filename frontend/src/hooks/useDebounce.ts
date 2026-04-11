/**
 * Debounce hook for input state.
 * Returns a delayed value to limit frequent updates and API requests.
 */
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
