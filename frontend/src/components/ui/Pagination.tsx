/**
 * Pagination navigation component.
 * Handles previous/next page controls and current page indicator.
 */
import { Button } from "./Button";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function Pagination({ page, totalPages, onPageChange, disabled = false }: PaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className="card pagination">
      <Button
        variant="secondary"
        className="pagination__nav-btn"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span>Previous</span>
      </Button>
      <p className="pagination__text">
        Page {page} of {safeTotalPages}
      </p>
      <Button
        variant="secondary"
        className="pagination__nav-btn"
        disabled={disabled || page >= safeTotalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <span>Next</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </Button>
    </div>
  );
}
