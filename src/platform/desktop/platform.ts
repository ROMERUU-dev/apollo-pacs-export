import {
  BrowserAdapter,
  DesktopBridgeError,
  hasApolloWebKitBridge,
  type ApolloDesktopBridge,
  type ApolloWebKitWindow,
} from '@apollo/bridge-client';
import { selectDesktopBridge, type DesktopMode } from '@apollo/react-integration';
import { unavailableCapabilities, type DesktopPlatform, type DesktopStatus } from './types';

export interface DesktopRuntimeEnvironment {
  DEV: boolean;
  VITE_APOLLO_DESKTOP_MODE?: string;
}

function configuredMode(environment: DesktopRuntimeEnvironment): DesktopMode {
  const mode = environment.VITE_APOLLO_DESKTOP_MODE?.trim() || 'auto';
  if (!['auto', 'browser', 'mock'].includes(mode)) throw new Error('Unsupported Apollo desktop mode.');
  if (mode === 'mock' && !environment.DEV) throw new Error('Mock desktop mode is forbidden in production builds.');
  return mode as DesktopMode;
}

export async function probeDesktopBridge(
  bridge: ApolloDesktopBridge,
  nativeCandidate: boolean,
): Promise<DesktopStatus> {
  if (!nativeCandidate) {
    const capabilities = await bridge.getCapabilities();
    return {
      environment: 'browser',
      bridgeState: 'unavailable',
      protocol: (await bridge.getVersion()).protocol,
      protocolVersion: capabilities.bridgeVersion,
      capabilities: { ...capabilities.capabilities },
    };
  }

  try {
    const nonce = 'apollo-react-handshake';
    const pong = await bridge.ping(nonce);
    if (pong.pong !== nonce) throw new DesktopBridgeError('INVALID_REQUEST', 'Bridge ping correlation failed.');
    const version = await bridge.getVersion();
    const capabilities = await bridge.getCapabilities();
    if (capabilities.platform !== 'macos') {
      throw new DesktopBridgeError('INVALID_REQUEST', 'Native bridge did not identify macOS.');
    }
    return {
      environment: 'macos',
      bridgeState: 'connected',
      protocol: version.protocol,
      protocolVersion: version.bridgeVersion,
      nativeAppVersion: 'No expuesta por Bridge Protocol v1',
      capabilities: { ...capabilities.capabilities },
    };
  } catch (error) {
    return {
      environment: 'macos',
      bridgeState: 'error',
      capabilities: { ...unavailableCapabilities },
      errorCode: error instanceof DesktopBridgeError ? error.code : 'INTERNAL_ERROR',
    };
  }
}

export async function createDesktopPlatform(
  environment: DesktopRuntimeEnvironment = import.meta.env,
  windowLike: ApolloWebKitWindow | undefined = typeof window === 'undefined'
    ? undefined
    : window as unknown as ApolloWebKitWindow,
): Promise<DesktopPlatform> {
  const mode = configuredMode(environment);
  let mock: ApolloDesktopBridge | undefined;
  if (mode === 'mock') {
    const { MockDesktopAdapter } = await import('@apollo/hardware-mock');
    mock = new MockDesktopAdapter({ printerState: 'unavailable', drawerState: 'unavailable' });
  }

  const nativeCandidate = mode === 'auto' && Boolean(windowLike && hasApolloWebKitBridge(windowLike));
  const bridge = selectDesktopBridge({
    mode,
    isDevelopment: environment.DEV,
    browser: new BrowserAdapter(),
    mock,
    windowLike,
    bridgeClientOptions: { timeoutMs: 5_000 },
  });
  const status = await probeDesktopBridge(bridge, nativeCandidate);
  return { bridge, status };
}
