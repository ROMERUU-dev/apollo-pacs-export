import { SystemStatus } from './components/dashboard';

const moduleLinks = [
  {
    name: 'Recepción',
    description: 'Ingreso y consulta inicial de estudios.',
    file: 'Recepcion.dc.html',
  },
  {
    name: 'Técnico',
    description: 'Flujo operativo para adquisición y revisión.',
    file: 'Apollo%20PACS.dc.html',
  },
  {
    name: 'Médico',
    description: 'Cola de lectura y reporte médico.',
    file: 'Apollo%20PACS.dc.html',
  },
  {
    name: 'Visor PACS',
    description: 'Visualización de imágenes del estudio.',
    file: 'ViewerShell.dc.html',
  },
] as const;

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true" />
        <div>
          <h1>Apollo <span>PACS</span></h1>
          <p>Frontend clínico en desarrollo</p>
        </div>
      </header>

      <section className="hero-panel">
        <p className="eyebrow">Versión de desarrollo</p>
        <h2>Panel de operación Apollo PACS</h2>
        <p>
          Punto de entrada temporal para validar conectividad, revisar el estado
          del sistema y acceder a los módulos principales durante la integración.
        </p>
      </section>

      <SystemStatus />

      <section className="quick-access" aria-labelledby="quick-access-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Módulos</p>
            <h2 id="quick-access-title">Accesos rápidos</h2>
          </div>
        </div>

        <div className="screen-grid">
          {moduleLinks.map((screen) => (
          <a
            className="screen-card"
            href={`/prototype/${screen.file}`}
            key={screen.file}
          >
            <strong>{screen.name}</strong>
            <p>{screen.description}</p>
            <span>Abrir módulo →</span>
          </a>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
