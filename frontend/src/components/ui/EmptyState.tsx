/**
 * Empty-state presentation component.
 * Displays a friendly title and description when a dataset has no results.
 */
type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="card empty-state">
      <h3 className="empty-state__title">{title}</h3>
      {description ? <p className="empty-state__description">{description}</p> : null}
    </div>
  );
}
