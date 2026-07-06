import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { SystemStatus } from './components/dashboard';
import { DoctorPage } from './pages/DoctorPage';
import { PortalPage } from './pages/PortalPage';
import { ReceptionPage } from './pages/ReceptionPage';
import { TechnicalPage } from './pages/TechnicalPage';
import { ViewerPage } from './pages/ViewerPage';
import { RoleRoute, SessionProvider, useSession } from './session';

const RECEPTION = ['apollo-receptionist'];
const CLINICAL = ['apollo-technician', 'apollo-physician'];
const PHYSICIAN = ['apollo-physician'];

function Layout({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const can = (roles: string[]) => session?.roles.some((role) => roles.includes(role));
  return <main className="app-shell"><header className="app-header"><Link className="brand-link" to="/"><span className="brand-mark" aria-hidden="true">⊙</span><span><strong>Apollo <em>PACS</em></strong><small>Gestión de estudios e imágenes</small></span></Link>
    <nav>{can(RECEPTION) && <NavLink to="/recepcion">Recepción</NavLink>}{can(CLINICAL) && <NavLink to="/tecnico">Técnico</NavLink>}{can(PHYSICIAN) && <NavLink to="/medico">Médico</NavLink>}{can(CLINICAL) && <NavLink to="/visor">Visor PACS</NavLink>}</nav><span className="user-chip">{session?.username ?? '…'}</span></header><div className="content-shell">{children}</div></main>;
}

function Dashboard() {
  const { session, error } = useSession();
  const cards = [
    { path: '/recepcion', name: 'Recepción', role: 'apollo-receptionist', text: 'Pacientes, catálogo, cotizaciones y caja.' },
    { path: '/tecnico', name: 'Técnico', role: 'apollo-technician', text: 'Worklist, estudios y adquisición.' },
    { path: '/medico', name: 'Médico', role: 'apollo-physician', text: 'Lectura, reportes y enlaces temporales.' },
    { path: '/visor', name: 'Visor OHIF', role: 'apollo-technician', text: 'Imágenes DICOM del estudio autorizado.' },
  ];
  return <><section className="hero-panel"><p className="eyebrow">Centro de operación</p><h1>Apollo PACS</h1><p>Flujo clínico y administrativo con contabilidad MXN, cobros MXN/USD y trazabilidad completa.</p>{error && <p className="alert alert--error">{error}</p>}</section><SystemStatus /><section className="screen-grid">{cards.filter((card) => session?.roles.includes(card.role) || (card.path === '/visor' && session?.roles.includes('apollo-physician'))).map((card) => <Link className="screen-card" to={card.path} key={card.path}><strong>{card.name}</strong><p>{card.text}</p><span>Abrir →</span></Link>)}</section></>;
}

function App() {
  return <Routes>
    <Route path="/portal" element={<PortalPage />} />
    <Route path="*" element={<SessionProvider><Layout><Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/recepcion" element={<RoleRoute roles={RECEPTION}><ReceptionPage /></RoleRoute>} />
      <Route path="/tecnico" element={<RoleRoute roles={CLINICAL}><TechnicalPage /></RoleRoute>} />
      <Route path="/medico" element={<RoleRoute roles={PHYSICIAN}><DoctorPage /></RoleRoute>} />
      <Route path="/visor" element={<RoleRoute roles={CLINICAL}><ViewerPage /></RoleRoute>} />
      <Route path="*" element={<section className="panel"><h2>Ruta no encontrada</h2><Link to="/">Volver al inicio</Link></section>} />
    </Routes></Layout></SessionProvider>} />
  </Routes>;
}

export default App;
