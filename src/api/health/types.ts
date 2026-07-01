export type HealthStatus = 'online' | 'unavailable' | 'unknown';

export interface HealthCheckResponse {
  status?: HealthStatus | string;
  service?: string;
  version?: string;
  timestamp?: string;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}
