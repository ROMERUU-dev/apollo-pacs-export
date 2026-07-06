import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { operationsApi, type Session } from './api/operations';
import { ErrorState, LoadingState } from './components/states';

interface SessionState { session?: Session; loading: boolean; error?: string }
const SessionContext = createContext<SessionState>({ loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ loading: true });
  useEffect(() => {
    operationsApi.session()
      .then((session) => setState({ session, loading: false }))
      .catch((error: Error) => setState({ loading: false, error: error.message }));
  }, []);
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() { return useContext(SessionContext); }

export function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const state = useSession();
  const allowed = useMemo(() => state.session?.roles.some((role) => roles.includes(role)), [roles, state.session]);
  if (state.loading) return <main className="app-shell"><LoadingState message="Validando sesión…" /></main>;
  if (state.error) return <main className="app-shell"><ErrorState message={state.error} /></main>;
  return allowed ? children : <Navigate to="/" replace />;
}
