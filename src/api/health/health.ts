import { apiRequest } from '../client';
import type { HealthCheckResponse } from './types';

const HEALTH_TIMEOUT_MS = 5_000;

export function getApiHealth(): Promise<HealthCheckResponse | undefined> {
  return apiRequest<HealthCheckResponse>('/health', {
    method: 'GET',
    timeoutMs: HEALTH_TIMEOUT_MS,
  });
}

export function getPacsHealth(): Promise<HealthCheckResponse | undefined> {
  return apiRequest<HealthCheckResponse>('/pacs/health', {
    method: 'GET',
    timeoutMs: HEALTH_TIMEOUT_MS,
  });
}
