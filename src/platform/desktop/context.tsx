import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BrowserAdapter } from '@apollo/bridge-client';
import { createDesktopPlatform } from './platform';
import { unavailableCapabilities, type DesktopPlatform, type DesktopStatus } from './types';

const initialStatus: DesktopStatus = {
  environment: 'browser',
  bridgeState: 'checking',
  capabilities: { ...unavailableCapabilities },
};

const DesktopPlatformContext = createContext<DesktopPlatform | undefined>(undefined);

export function DesktopPlatformProvider({
  children,
  factory = createDesktopPlatform,
}: {
  children: ReactNode;
  factory?: () => Promise<DesktopPlatform>;
}) {
  const [platform, setPlatform] = useState<DesktopPlatform>();
  useEffect(() => {
    let active = true;
    void factory().then((value) => {
      if (!active) return;
      setPlatform(value);
      if (import.meta.env.VITE_APOLLO_E2E_EVIDENCE === 'true') {
        const evidence = {
          environment: value.status.environment,
          bridgeState: value.status.bridgeState,
          capabilities: value.status.capabilities,
        };
        void fetch('/__evidence/desktop-platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evidence),
        });
      }
    }).catch(() => {
      if (active) setPlatform({ bridge: new BrowserAdapter(), status: { ...initialStatus, bridgeState: 'error', errorCode: 'INTERNAL_ERROR' } });
    });
    return () => { active = false; };
  }, [factory]);

  return <DesktopPlatformContext.Provider value={platform}>{children}</DesktopPlatformContext.Provider>;
}

export function useDesktopPlatform(): DesktopPlatform | { bridge?: undefined; status: DesktopStatus } {
  return useContext(DesktopPlatformContext) ?? { status: initialStatus };
}
