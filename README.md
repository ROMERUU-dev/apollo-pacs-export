# Apollo PACS frontend

Base de migración gradual del prototipo visual de Apollo PACS hacia una aplicación
React mantenible. Las pantallas exportadas originales se conservan sin cambios y se
sirven desde `public/prototype/` mientras cada flujo se migra de forma incremental.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Instalación

```bash
npm install
cp .env.example .env.local
```

## Desarrollo

```bash
npm run dev
```

Vite mostrará la URL local. La página inicial enlaza las cuatro vistas preservadas:

- Apollo PACS
- Recepción
- Portal Paciente
- ViewerShell

## Build de producción

```bash
npm run build
```

El resultado se genera en `dist/`. Para revisarlo localmente:

```bash
npm run preview
```

## Variables de entorno

| Variable | Descripción | Valor de desarrollo |
|---|---|---|
| `VITE_APOLLO_API_URL` | URL base del backend/API de Apollo | `http://localhost:8000` |

Las variables con prefijo `VITE_` quedan disponibles en el navegador. Nunca deben
contener contraseñas, secretos, API keys ni credenciales de Orthanc.

## Arquitectura inicial

```text
src/
├── api/                 Transporte preparado para la API de Apollo
├── components/states/  Estados loading, error y empty
├── mocks/               Datos ficticios claramente aislados
└── models/              Interfaces iniciales del dominio PACS

public/prototype/        Exportación visual legacy preservada
```

La función genérica de `src/api/client.ts` no define endpoints. Los servicios por
dominio se agregarán cuando exista un contrato aprobado del backend de Apollo.

## Límite de seguridad

El navegador debe comunicarse exclusivamente con el backend/API de Apollo.

```text
Frontend Apollo PACS → Backend/API Apollo → Orthanc
```

**Orthanc no debe llamarse directamente desde el navegador.** Sus credenciales,
configuración y API deben permanecer protegidas en el backend o en infraestructura
privada. Este repositorio no incluye credenciales ni una integración DICOM real.

## Estado actual

- El diseño exportado sigue disponible como prototipo legacy.
- Los datos del prototipo y de `src/mocks/` son simulados.
- No existe todavía integración con Apollo, Orthanc o un visor DICOM real.
- Caja y facturación permanecen sin cambios dentro del prototipo.
