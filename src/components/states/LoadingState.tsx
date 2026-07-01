interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando información…' }: LoadingStateProps) {
  return <div className="resource-state" role="status">{message}</div>;
}
