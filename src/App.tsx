const prototypeScreens = [
  { name: 'Apollo PACS', file: 'Apollo%20PACS.dc.html' },
  { name: 'Recepción', file: 'Recepcion.dc.html' },
  { name: 'Portal Paciente', file: 'Portal%20Paciente.dc.html' },
  { name: 'ViewerShell', file: 'ViewerShell.dc.html' },
] as const;

function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true" />
        <div>
          <h1>Apollo <span>PACS</span></h1>
          <p>Base de migración frontend</p>
        </div>
      </header>

      <section className="intro">
        <p>
          Las pantallas originales permanecen disponibles sin cambios mientras sus
          flujos se migran gradualmente a componentes mantenibles.
        </p>
      </section>

      <section className="screen-grid" aria-label="Pantallas del prototipo">
        {prototypeScreens.map((screen) => (
          <a
            className="screen-card"
            href={`/prototype/${screen.file}`}
            key={screen.file}
          >
            <strong>{screen.name}</strong>
            <span>Abrir prototipo →</span>
          </a>
        ))}
      </section>
    </main>
  );
}

export default App;
