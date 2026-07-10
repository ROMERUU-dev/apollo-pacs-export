import { render, screen, waitFor } from '@testing-library/react';
import { JsonBridgeClient, createApolloWebKitTransport, type ApolloWebKitWindow } from '@apollo/bridge-client';
import { describe, expect, it, vi } from 'vitest';
import { DesktopPlatformProvider } from './context';
import { DeviceStatusPanel } from './DeviceStatusPanel';
import { createDesktopPlatform, probeDesktopBridge } from './platform';
import { unavailableCapabilities, type DesktopStatus } from './types';

const nativeWindow = (overrides: { correlate?: boolean; malformed?: boolean; never?: boolean } = {}): ApolloWebKitWindow => ({
  apolloNativeBridge: {
    postMessage: vi.fn(async (request: unknown) => {
      if (overrides.never) return new Promise(() => undefined);
      const value = request as { requestId: string; command: string; payload: { nonce?: string } };
      const requestId = overrides.correlate === false ? '10000000-0000-4000-8000-000000000099' : value.requestId;
      if (overrides.malformed) return { version: 1, requestId, ok: true, result: { invalid: true } };
      const result = value.command === 'bridge.getVersion'
        ? { bridgeVersion: 1, protocol: 'apollo-desktop-bridge' }
        : value.command === 'bridge.getCapabilities'
          ? { bridgeVersion: 1, platform: 'macos', capabilities: { ...unavailableCapabilities } }
          : { pong: value.payload.nonce ?? '', timestamp: '2026-01-01T00:00:00.000Z' };
      return { version: 1, requestId, ok: true, result };
    }),
  },
});

describe('Apollo desktop platform boundary', () => {
  it('uses BrowserAdapter in a normal browser', async () => {
    const platform = await createDesktopPlatform({ DEV: false }, {});
    expect(platform.status).toMatchObject({ environment: 'browser', bridgeState: 'unavailable' });
  });

  it('detects macOS through a real v1 handshake rather than user-agent', async () => {
    const platform = await createDesktopPlatform({ DEV: false }, nativeWindow());
    expect(platform.status).toMatchObject({ environment: 'macos', bridgeState: 'connected' });
  });

  it('performs bridge.ping during the macOS handshake', async () => {
    const windowLike = nativeWindow();
    await createDesktopPlatform({ DEV: false }, windowLike);
    expect(windowLike.apolloNativeBridge?.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'bridge.ping' }));
  });

  it('performs bridge.getVersion during the macOS handshake', async () => {
    const windowLike = nativeWindow();
    const platform = await createDesktopPlatform({ DEV: false }, windowLike);
    expect(windowLike.apolloNativeBridge?.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'bridge.getVersion' }));
    expect(platform.status.protocol).toBe('apollo-desktop-bridge');
  });

  it('performs bridge.getCapabilities and identifies platform macos', async () => {
    const windowLike = nativeWindow();
    const platform = await createDesktopPlatform({ DEV: false }, windowLike);
    expect(windowLike.apolloNativeBridge?.postMessage).toHaveBeenCalledWith(expect.objectContaining({ command: 'bridge.getCapabilities' }));
    expect(platform.status.environment).toBe('macos');
  });

  it('respects all false native hardware capabilities', async () => {
    const platform = await createDesktopPlatform({ DEV: false }, nativeWindow());
    expect(platform.status.capabilities).toEqual(unavailableCapabilities);
  });

  it('falls back without crashing when the native bridge is unavailable', async () => {
    await expect(createDesktopPlatform({ DEV: false }, {})).resolves.toMatchObject({
      status: { bridgeState: 'unavailable', capabilities: unavailableCapabilities },
    });
  });

  it('maps a bridge timeout to an operational error state', async () => {
    const bridge = new JsonBridgeClient(createApolloWebKitTransport(nativeWindow({ never: true })), { timeoutMs: 5 });
    await expect(probeDesktopBridge(bridge, true)).resolves.toMatchObject({ bridgeState: 'error', errorCode: 'TIMEOUT' });
  });

  it('maps a malformed native response to INVALID_REQUEST', async () => {
    const bridge = new JsonBridgeClient(createApolloWebKitTransport(nativeWindow({ malformed: true })), { timeoutMs: 50 });
    await expect(probeDesktopBridge(bridge, true)).resolves.toMatchObject({ bridgeState: 'error', errorCode: 'INVALID_REQUEST' });
  });

  it('rejects mismatched response correlation', async () => {
    const bridge = new JsonBridgeClient(createApolloWebKitTransport(nativeWindow({ correlate: false })), { timeoutMs: 50 });
    await expect(probeDesktopBridge(bridge, true)).resolves.toMatchObject({ bridgeState: 'error', errorCode: 'INVALID_REQUEST' });
  });

  it('allows the real mock only with explicit development opt-in', async () => {
    const platform = await createDesktopPlatform({ DEV: true, VITE_APOLLO_DESKTOP_MODE: 'mock' }, {});
    await expect(platform.bridge.getCapabilities()).resolves.toMatchObject({ platform: 'mock-linux' });
  });

  it('rejects mock mode in production even if configured externally', async () => {
    await expect(createDesktopPlatform({ DEV: false, VITE_APOLLO_DESKTOP_MODE: 'mock' }, {}))
      .rejects.toThrow(/forbidden in production/);
  });

  it('keeps direct native global access out of React components', () => {
    const sources = import.meta.glob('../../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    for (const [name, source] of Object.entries(sources)) {
      if (name.endsWith('platform.test.tsx')) continue;
      expect(source, name).not.toContain(['window', 'webkit'].join('.'));
      expect(source, name).not.toContain(['window', 'apolloNativeBridge'].join('.'));
    }
  });
});

describe('DeviceStatusPanel', () => {
  const browser: DesktopStatus = { environment: 'browser', bridgeState: 'unavailable', capabilities: { ...unavailableCapabilities } };
  const macos: DesktopStatus = {
    environment: 'macos', bridgeState: 'connected', protocol: 'apollo-desktop-bridge', protocolVersion: 1,
    nativeAppVersion: 'No expuesta por Bridge Protocol v1', capabilities: { ...unavailableCapabilities },
  };

  it('renders browser status without native actions', () => {
    render(<DeviceStatusPanel status={browser} />);
    expect(screen.getByRole('heading', { name: 'Browser' })).toBeVisible();
    expect(screen.getByText('Unavailable')).toBeVisible();
  });

  it('renders a connected macOS handshake', () => {
    render(<DeviceStatusPanel status={macos} />);
    expect(screen.getByRole('heading', { name: 'macOS' })).toBeVisible();
    expect(screen.getByText('Connected')).toBeVisible();
    expect(screen.getByText('apollo-desktop-bridge v1')).toBeVisible();
  });

  it('does not enable hardware actions when capabilities are false', () => {
    render(<DeviceStatusPanel status={macos} />);
    expect(screen.getAllByText('No disponible')).toHaveLength(4);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('updates from the central provider without exposing raw bridge data', async () => {
    render(<DesktopPlatformProvider factory={async () => ({ bridge: await createDesktopPlatform({ DEV: false }, {}).then((value) => value.bridge), status: macos })}><DeviceStatusPanel /></DesktopPlatformProvider>);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'macOS' })).toBeVisible());
    expect(screen.queryByText(/requestId|raw JSON|custom command/i)).not.toBeInTheDocument();
  });
});
