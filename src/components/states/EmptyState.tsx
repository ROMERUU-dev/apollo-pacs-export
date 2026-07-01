interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = 'No hay elementos para mostrar.' }: EmptyStateProps) {
  return <div className="resource-state">{message}</div>;
}
