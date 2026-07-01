interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'No fue posible cargar la información.', onRetry }: ErrorStateProps) {
  return (
    <div className="resource-state resource-state--error" role="alert">
      <span>{message}</span>
      {onRetry && <button type="button" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}
