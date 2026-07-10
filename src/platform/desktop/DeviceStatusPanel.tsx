import { useDesktopPlatform } from './context';
import type { DesktopStatus } from './types';

const availability = (value: boolean) => value ? 'Disponible' : 'No disponible';
const bridgeLabel = { checking: 'Comprobando', connected: 'Connected', unavailable: 'Unavailable', error: 'Error' } as const;

export function DeviceStatusPanel({ status: suppliedStatus }: { status?: DesktopStatus }) {
  const platform = useDesktopPlatform();
  const status = suppliedStatus ?? platform.status;
  return <article className="device-status" data-environment={status.environment} data-bridge-state={status.bridgeState}>
    <div className="panel-kicker">DISPOSITIVO</div>
    <h3>{status.environment === 'macos' ? 'macOS' : 'Browser'}</h3>
    <dl>
      <div><dt>Bridge</dt><dd>{bridgeLabel[status.bridgeState]}</dd></div>
      <div><dt>Protocol</dt><dd>{status.protocol ? `${status.protocol} v${status.protocolVersion ?? '?'}` : 'No disponible'}</dd></div>
      <div><dt>Aplicación nativa</dt><dd>{status.nativeAppVersion ?? 'No disponible'}</dd></div>
      <div><dt>Printing</dt><dd>{availability(status.capabilities.printing)}</dd></div>
      <div><dt>Printer status</dt><dd>{availability(status.capabilities.printerStatus)}</dd></div>
      <div><dt>Cash drawer</dt><dd>{availability(status.capabilities.cashDrawer)}</dd></div>
      <div><dt>Device settings</dt><dd>{availability(status.capabilities.deviceSettings)}</dd></div>
    </dl>
    {status.bridgeState === 'error' && <small>Bridge error: {status.errorCode ?? 'INTERNAL_ERROR'}</small>}
  </article>;
}
