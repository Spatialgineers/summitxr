# Documentación · Spatialgineers Summit 2026

**Empieza por [`GUIA_WEBAPP.md`](GUIA_WEBAPP.md).** Es la referencia maestra de la webapp: rutas, cada página y módulo, el SGX Pass, la gamificación, el motor en vivo, el Highbot, el admin, los datos y la seguridad, las pruebas y el despliegue. Los demás documentos amplían un tema.

| Documento | Para qué |
|---|---|
| [`GUIA_WEBAPP.md`](GUIA_WEBAPP.md) | La guía completa de la app (léela primero) |
| [`DEPLOY.md`](DEPLOY.md) | Cloud Run con una sola instancia y afinidad de sesión; admins del motor en vivo; publicar las reglas |
| [`ADMIN_GUIDE.md`](ADMIN_GUIDE.md) | El Centro de mando: CSV, fechas límite, prensa, pantalla del escenario, qué pide el SGX Pass |
| [`FIRESTORE_RULES.md`](FIRESTORE_RULES.md) | Quién lee y escribe cada colección |
| [`security_spec.md`](security_spec.md) | Invariantes y payloads que las reglas deben rechazar |
| [`EMAIL_SETUP.md`](EMAIL_SETUP.md) | Configurar el mailer de Apps Script (correos automáticos desde info@) |
| [`HIGHBOT_COMPANION.md`](HIGHBOT_COMPANION.md) | Conectar el Highbot a Claude de forma segura: capas de protección, variables, kill switch |
| [`highbot/HIGHBOT_AGENT.md`](highbot/HIGHBOT_AGENT.md) | El prompt del agente Highbot |
| [`highbot/spatialgineers-summit-app/SKILL.md`](highbot/spatialgineers-summit-app/SKILL.md) | Los hechos del evento, el mapa de la app y las reglas de marca (para Highbot y otros agentes) |
| [`SHADER_GUIDE.md`](SHADER_GUIDE.md) | Los efectos WebGL y el núcleo 3D |
| [`ACCESIBILIDAD.md`](ACCESIBILIDAD.md) | La auditoría de accesibilidad (axe WCAG 2.1 AA y teclado) |
| [`campaign/YOUTUBE_KIT.md`](campaign/YOUTUBE_KIT.md) | Títulos, descripciones y tags de los videos de la campaña; dónde va cada ID |
| [`PLAN_CIERRE.md`](PLAN_CIERRE.md) | La auditoría de cierre y el orden obligatorio para desplegar sin romper Firestore |
| [`PLAN_ADMIN_VISOR.md`](PLAN_ADMIN_VISOR.md), [`PLAN_MOTION.md`](PLAN_MOTION.md) | Planes ya ejecutados (historia del admin, el núcleo 3D y el hero) |
| [`SKILLS_RESEARCH.md`](SKILLS_RESEARCH.md) | Licencias de los skills abiertos que se evaluaron |

READMEs de los scripts:

- [`scripts/e2e/README.md`](../scripts/e2e/README.md)
- [`scripts/loadtest/README.md`](../scripts/loadtest/README.md)
- [`scripts/rules-test/README.md`](../scripts/rules-test/README.md)
- [`scripts/promo/README.md`](../scripts/promo/README.md)
