# PKG-005 Hardening Y Release Readiness Del MVP

Owner recomendado: `backend_web`

## ID Del Paquete

PKG-005

## Nombre Corto

Hardening y release readiness del MVP

## Objetivo De Negocio

Cerrar un paquete tecnico chico posterior al backlog funcional del ERS para dejar el MVP con una base de release mas confiable, reduciendo riesgos reales ya visibles en el repo sin abrir dependencias externas ni redefinir alcance de producto.

El objetivo concreto es que el MVP quede con mejor trazabilidad backend, un gate minimo de regresion automatizada y respuestas autenticadas de archivos mas endurecidas, manteniendo intactos los flujos funcionales ya cerrados.

## Historia O Requerimiento Fuente

- RNF-001 Seguridad, trazabilidad y auditoria
- RNF-002 Usabilidad, rendimiento y continuidad operativa
- observaciones residuales ya documentadas en `testing` y `security-review` de `PKG-002`, `PKG-003` y `PKG-004`

## Agente Owner Recomendado

`backend_web`

## Estado Operativo Actual

- backend endurecido en auditoria critica y serving autenticado de archivos
- `test:smoke` convertido en gate automatizado real y barato
- testing focal ejecutado sin hallazgos bloqueantes
- security review cerrado como `apto con observaciones`
- paquete cerrado operativamente

## Alcance Incluido

- endurecimiento de auditoria critica en backend para que las mutaciones sensibles del cierre MVP no queden desacopladas del rastro operativo
- reemplazo del placeholder actual de `backend/npm run test:smoke` por una corrida automatizada real y barata
- hardening de respuestas autenticadas de archivos en backend para exportaciones y media privada
- evidencia documental minima para declarar readiness tecnica del MVP dentro del contexto actual del repo

## Fuera De Alcance

- nuevas features funcionales del ERS
- rediseño de sesion a cookies `HttpOnly`
- cambio de `localStorage` o `IndexedDB` en frontend
- rate limiting distribuido, WAF o controles dependientes de infraestructura externa
- migracion de archivos a storage externo o cloud
- validacion de entregabilidad real de email en inbox
- E2E browser completo o smoke con dependencias remotas

## Dependencias

- `PKG-001` a `PKG-004` cerrados operativamente
- arquitectura vigente en [Arquitectura](../../03-arquitectura/arquitectura.md)
- contratos vigentes en [Contratos](../../03-arquitectura/contratos.md)
- backend actual en `backend/src/modules/registrations`, `tournaments`, `scoring-ranking`, `reports-exports` y `captures`
- patron de pruebas livianas ya existente en `backend/tests/pkg004.slice.test.ts`

## Entradas Obligatorias

- [Project State](../../00-indice/project-state.md)
- [Testing](../../06-calidad/testing.md)
- [Security Review](../../06-calidad/security-review.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [PKG-004](./PKG-004-scoring-ranking-y-reportes-basicos.md)

## Referencias Funcionales

- [RNF-001](../../02-funcional/requerimientos/RNF-001-seguridad-trazabilidad-y-auditoria.md)
- [RNF-002](../../02-funcional/requerimientos/RNF-002-usabilidad-rendimiento-y-continuidad-operativa.md)

## Referencias De Arquitectura Y Contratos

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

Decisiones ejecutables del paquete:

- no se agregan endpoints nuevos ni cambios funcionales visibles obligatorios
- se mantiene el monolito modular actual
- el hardening se resuelve con cambios internos de backend y pruebas automatizadas locales
- la auditoria critica debe pasar a escribirse dentro de la misma transaccion Prisma del cambio principal, o mediante helper transaccional equivalente, sin introducir outbox ni infraestructura nueva
- `test:smoke` deja de ser decorativo y pasa a ser gate minimo obligatorio de release local
- las descargas autenticadas y la media privada deben responder con headers conservadores de seguridad y cache

## Referencias UX/UI

- no aplica como fuente de cambios de interfaz
- frontend solo participa como consumidor existente y como regression gate de `lint/build`

## Criterios De Aceptacion

- `backend/npm run test:smoke` deja de imprimir `No automated tests yet` y ejecuta verificaciones reales del MVP
- existe cobertura automatizada minima sobre los riesgos hoy abiertos de release:
  - transiciones de `registrations`
  - cierre de torneo con ranking final
  - generacion de exportaciones
- las mutaciones criticas del paquete no pueden confirmar cambios de negocio en los slices incluidos sin persistir tambien su evento de auditoria dentro del mismo limite transaccional
- `reports-exports` registra consistentemente `READY` y `FAILED` junto con su trazabilidad critica
- `GET /exports/:id/download` y `GET /captures/media/:mediaId` exponen al menos `X-Content-Type-Options: nosniff` y politicas de cache conservadoras; exportaciones mantienen `attachment`
- `backend/npm run lint`
- `backend/npm run build`
- `backend/npm run test:smoke`
- `backend/npm run test:pkg004`
- `frontend/npm run lint`
- `frontend/npm run build`

## Arquitectura Ejecutable Cerrada

### 1. Auditoria transaccional minima

Aplicar el hardening solo en los flujos que hoy concentran el riesgo residual mas relevante para release:

- `backend/src/modules/registrations/application/registrations.service.ts`
  - `createAdmin`
  - `selfRegister`
  - `approve`
  - `reject`
- `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts`
  - `updateScoringConfig`
  - `createScoreAdjustment`
  - `revokeScoreAdjustment`
  - `finalizeTournamentRanking`
- `backend/src/modules/tournaments/application/tournaments.service.ts`
  - `close`
- `backend/src/modules/reports-exports/application/reports-exports.service.ts`
  - `createExport`

Patron requerido:

- extender `AuditService` con soporte explicito para escribir sobre `Prisma.TransactionClient`
- evitar rediseño transversal del repo completo; el paquete solo toca los puntos de cierre MVP listados arriba
- no introducir colas, workers ni `outbox` en esta pasada

### 2. Gate automatizado de release local

Reemplazar el smoke actual por una suite barata basada en `ts-node` y `node:assert/strict`, consistente con el estilo ya usado en `backend/tests/pkg004.slice.test.ts`.

Cobertura minima obligatoria:

- aprobacion y rechazo de inscripcion con evidencia auditable
- cierre de torneo bloqueado si hay pendientes y cierre valido con ranking final
- generacion de exportacion `READY` y `FAILED`
- chequeo de headers endurecidos para descargas autenticadas o de la funcion/controlador que los arma

No hace falta:

- montar navegador
- depender de inbox real
- probar infraestructura distribuida

### 3. Hardening de file serving

Alcance tecnico acotado:

- `backend/src/modules/reports-exports/presentation/reports-exports.controller.ts`
- `backend/src/modules/captures/presentation/captures.controller.ts`

Controles minimos:

- `X-Content-Type-Options: nosniff`
- `Cache-Control: private, no-store`
- mantener `Content-Disposition: attachment` para exportaciones

No se cambia en este paquete:

- formato de uploads
- storage root
- autorizacion funcional ya vigente

## Cierre De `software_architect`

No hace falta reabrir `docs/03-arquitectura/arquitectura.md` ni `docs/03-arquitectura/contratos.md` porque el paquete no cambia el stack, no agrega integraciones y no abre contratos publicos nuevos. El cambio es de disciplina interna de backend y de gate de release.

## Handoff Para `backend_web`

- agregar helper transaccional de auditoria sobre Prisma
- mover a borde transaccional las auditorias criticas listadas en este paquete
- convertir `backend/npm run test:smoke` en suite real
- endurecer headers de media y exportaciones autenticadas
- mantener cambios acotados; no expandir el paquete a sesiones, rate limiting distribuido ni storage externo

## Handoff Para `frontend_web`

- no hay implementacion funcional esperada
- conservar `frontend/npm run lint` y `frontend/npm run build` como regression gate del paquete

## Handoff Para `devops_infra`

- no hay trabajo externo requerido en esta pasada
- cualquier evolucion futura a rate limit distribuido, secretos por entorno o storage externo queda fuera de `PKG-005`

## Handoff Para `security_reviewer`

- revalidar que el hardening propuesto efectivamente reduzca riesgo en:
  - trazabilidad de `registrations`, `tournaments`, `scoring-ranking` y `reports-exports`
  - respuestas autenticadas de media y exportaciones
- no reabrir observaciones ya aceptadas de `localStorage`, `IndexedDB` o rate limiting en memoria salvo regresion nueva

## Handoff Para `testing`

- verificar que `test:smoke` ya sea evidencia real y no placeholder
- contrastar que los casos elegidos cubran regresion de release y no solo helpers puros
- ejecutar pasada corta sobre comandos locales:
  - `backend/npm run lint`
  - `backend/npm run build`
  - `backend/npm run test:smoke`
  - `backend/npm run test:pkg004`
  - `frontend/npm run lint`
  - `frontend/npm run build`

## Evidencia Esperada

- diff en `backend/package.json` con `test:smoke` real
- uno o mas tests nuevos bajo `backend/tests/`
- helper o extension de auditoria transaccional en `backend/src/common/audit/`
- cambios acotados en:
  - `registrations.service.ts`
  - `scoring-ranking.service.ts`
  - `tournaments.service.ts`
  - `reports-exports.service.ts`
  - `reports-exports.controller.ts`
  - `captures.controller.ts`
- salida de comandos locales de lint, build y tests en verde

## Riesgos Y Supuestos

Riesgos:

- tocar transacciones puede exponer acoples viejos o requerir reordenar efectos laterales no transaccionales
- si se intenta abarcar todos los `auditService.log(...)` del repo, el paquete se agranda y pierde cerrabilidad
- el smoke puede degradarse a chequeo superficial si no se mantiene focalizado en mutaciones de release reales

Supuestos:

- el criterio de release del MVP sigue siendo local o de instancia unica
- no se necesita resolver en esta pasada ni email real ni escalado horizontal
- el backlog funcional del ERS ya esta agotado y no compite con este paquete

## Siguiente Agente Recomendado

`backend_web`

## Paquete Exacto De Entrada

- [PKG-005](./PKG-005-hardening-y-release-readiness-del-mvp.md)
- [Project State](../../00-indice/project-state.md)
- [Testing](../../06-calidad/testing.md)
- [Security Review](../../06-calidad/security-review.md)
- [PKG-004](./PKG-004-scoring-ranking-y-reportes-basicos.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

## Estado De Salida Esperado

- backend endurecido en los puntos criticos definidos
- `test:smoke` automatizado y util como gate local de release
- revalidacion breve de `testing` ejecutada sin hallazgos bloqueantes
- revalidacion focal de `security_review` cerrada como `apto con observaciones`
- paquete cerrado operativamente sin abrir dependencias externas
