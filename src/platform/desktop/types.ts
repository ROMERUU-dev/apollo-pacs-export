import type { ApolloDesktopBridge } from '@apollo/bridge-client';
import type { DesktopCapabilities } from '@apollo/bridge-contract';

export type DesktopEnvironment = 'browser' | 'macos';
export type DesktopBridgeState = 'checking' | 'connected' | 'unavailable' | 'error';

export const unavailableCapabilities: DesktopCapabilities['capabilities'] = {
  printing: false,
  cashDrawer: false,
  printerStatus: false,
  deviceSettings: false,
};

export interface DesktopStatus {
  environment: DesktopEnvironment;
  bridgeState: DesktopBridgeState;
  protocol?: string;
  protocolVersion?: number;
  nativeAppVersion?: string;
  capabilities: DesktopCapabilities['capabilities'];
  errorCode?: string;
}

export interface DesktopPlatform {
  bridge: ApolloDesktopBridge;
  status: DesktopStatus;
}
