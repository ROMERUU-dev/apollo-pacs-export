# Apollo PACS frontend

Aplicación React para operación clínica y administrativa de Apollo PACS. Sustituye
los prototipos `.dc.html` con rutas navegables y conectadas a FastAPI.

## Requisitos y comandos

- Node.js `^20.19.0 || >=22.12.0`
- npm 10+

```bash
npm install
npm run dev
npm run build
npm test
npm run test:e2e
```

Vite publica el frontend en desarrollo y redirige `/api` a
`http://localhost:8000`. `VITE_APOLLO_API_URL` permite reemplazar la base de la
API; en producción el valor recomendado es `/api/v1`.

El catálogo visible proviene siempre de Apollo API. Para cargar en una base de
desarrollo los 18 precios de referencia de Recepción, ejecuta desde
`apollo_server`:

```bash
PYTHONPATH=src python3 scripts/seed-demo-catalog.py
```

El seed es idempotente: solo inserta códigos demo faltantes y nunca reemplaza
precios o registros existentes. No forma parte del arranque de producción.

## Rutas

- `/`: panel según los roles de la sesión.
- `/recepcion`: pacientes, órdenes, catálogo MXN/USD, tasas, cotizaciones, caja y enlaces.
- `/tecnico`: worklist, estudios y lanzamiento de OHIF.
- `/medico`: reportes versionados y enlaces temporales.
- `/visor`: lanzamiento controlado de OHIF.
- `/portal`: canje y uso de un enlace de paciente.

Las rutas internas consultan `GET /api/v1/session` y se limitan a los roles
`apollo-receptionist`, `apollo-technician` y `apollo-physician`. El portal usa una
cookie HttpOnly emitida por el backend. El navegador nunca recibe credenciales de
Orthanc.

## Despliegue

El contenedor compila con Node 22 y sirve el bundle con Nginx. La regla
`try_files ... /index.html` permite recargar directamente cualquier ruta React.
No se cargan fuentes, scripts ni estilos desde dominios externos.
