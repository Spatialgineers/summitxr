# Spatialgineers Summit 2026 · Webapp

> **Agentes de IA y personas nuevas en el código:** antes de cambiar nada, lee [`docs/GUIA_WEBAPP.md`](docs/GUIA_WEBAPP.md). Es la referencia completa de la app: rutas, módulos, SGX Pass, gamificación, motor en vivo, Highbot, admin, datos y seguridad, pruebas y despliegue. También tiene las reglas de marca que el código y los textos deben respetar. El resto de la documentación está en [`docs/README.md`](docs/README.md).

La webapp del Spatialgineers Summit 2026 (11–13 de diciembre de 2026) vive en `https://summit.spatialgineers.com`. Está hecha con React 19, Vite y Three.js en el cliente, y Express con WebSocket en un solo servicio de Cloud Run, con Firebase Auth y Firestore.

```bash
npm install
npm run dev     # tsx server.ts (Vite en modo middleware)
npm run lint    # tsc --noEmit
npm run build   # vite build + server.js (server.js va en el repo)
```
