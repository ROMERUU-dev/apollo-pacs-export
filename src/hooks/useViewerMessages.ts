import { useEffect, useRef } from 'react';

// Messages the Apollo médico OHIF viewer posts back to its opener. The viewer
// uses its own window.location.origin as targetOrigin; on staging the viewer
// and this workspace are same-origin, so we only trust our own origin.
export type ViewerMessage =
  | { type: 'apollo:open-report'; studyInstanceUID: string }
  | { type: 'apollo:close-study'; studyInstanceUID: string };

const VIEWER_MESSAGE_TYPES = ['apollo:open-report', 'apollo:close-study'];

function parseViewerMessage(data: unknown): ViewerMessage | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const { type, studyInstanceUID } = data as Record<string, unknown>;
  if (typeof type !== 'string' || !VIEWER_MESSAGE_TYPES.includes(type)) return undefined;
  if (typeof studyInstanceUID !== 'string' || !studyInstanceUID) return undefined;
  return { type, studyInstanceUID } as ViewerMessage;
}

// Subscribes to viewer postMessage events. The handler is kept in a ref so the
// listener registers exactly once (safe under StrictMode's double-invoked
// effects) while always seeing the latest component state.
export function useViewerMessages(handler: (message: ViewerMessage) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Security: never act on foreign-origin messages.
      if (event.origin !== window.location.origin) return;
      const message = parseViewerMessage(event.data);
      if (message) handlerRef.current(message);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}
