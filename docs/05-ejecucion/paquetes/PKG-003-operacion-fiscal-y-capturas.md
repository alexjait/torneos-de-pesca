# PKG-003 Operacion Fiscal Y Capturas

Owner recomendado: `orchestrator`

## ID Del Paquete

PKG-003

## Nombre Corto

Operacion fiscal y capturas

## Objetivo De Negocio

Habilitar la operacion de campo para fiscales con carga de capturas, validacion operativa, control horario y continuidad offline acotada, dejando preparado el terreno para ranking y reportes sin meterlos todavia.

Este paquete toma la elegibilidad ya resuelta en `PKG-002` y deja operativa la captura de evidencia del torneo.

## Historia O Requerimiento Fuente

- RF-006 Carga de capturas
- RF-007 Validacion de capturas
- RF-009 Control horario operativo
- RF-011 Operacion offline acotada
- RNF-001 Seguridad, trazabilidad y auditoria
- RNF-002 Usabilidad, rendimiento y continuidad operativa

## Agente Owner Recomendado

`software_architect`

## Estado Operativo Actual

- `PKG-003` cerrado operativamente
- backend y frontend implementados
- migracion Prisma aplicada en entorno local
- testing tecnico local, smoke real de API y ajustes finales de UI completados
- observaciones residuales registradas como no bloqueantes

## Alcance Incluido

- zona operativa de fiscal en web responsive
- carga de captura por fiscal asignado
- foto obligatoria y metadatos de captura
- longitud manual
- fecha y hora automaticas
- GPS cuando el dispositivo y permisos lo permitan
- estado inicial `pendiente de validacion`
- edicion de captura solo mientras siga pendiente
- bandeja de validacion con aprobar, observar y rechazar
- motivo obligatorio para observacion y rechazo
- control horario para carga y validacion segun hitos del torneo
- cola offline acotada para capturas
- sincronizacion posterior de capturas pendientes
- trazabilidad y auditoria de altas, validaciones y sincronizaciones

## Fuera De Alcance

- ranking en vivo y ranking final como experiencia de usuario
- reportes y exportaciones
- carga de capturas por participantes
- medicion automatica por imagen
- offline completo del sistema
- resolucion avanzada de conflictos offline
- notificaciones avanzadas sobre capturas

## Dependencias

- `PKG-001` cerrado
- `PKG-002` cerrado
- arquitectura base aprobada en [Arquitectura](../../03-arquitectura/arquitectura.md)
- contratos base aprobados en [Contratos](../../03-arquitectura/contratos.md)
- UX/UI base definida en [UX/UI](../../04-ux-ui/ux-ui.md)
- datos operativos ya disponibles de torneos, participantes, inscripciones y fiscales

## Entradas Obligatorias

- [RF-006](../../02-funcional/requerimientos/RF-006-carga-de-capturas.md)
- [RF-007](../../02-funcional/requerimientos/RF-007-validacion-de-capturas.md)
- [RF-009](../../02-funcional/requerimientos/RF-009-control-horario-operativo.md)
- [RF-011](../../02-funcional/requerimientos/RF-011-operacion-offline-acotada.md)
- [RNF-001](../../02-funcional/requerimientos/RNF-001-seguridad-trazabilidad-y-auditoria.md)
- [RNF-002](../../02-funcional/requerimientos/RNF-002-usabilidad-rendimiento-y-continuidad-operativa.md)
- [ERS](../../02-funcional/ers.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [PKG-002](./PKG-002-inscripcion-y-autoregistro.md)
- [Project State](../../00-indice/project-state.md)
- [UX/UI](../../04-ux-ui/ux-ui.md)

## Referencias Funcionales

- [RF-006](../../02-funcional/requerimientos/RF-006-carga-de-capturas.md)
- [RF-007](../../02-funcional/requerimientos/RF-007-validacion-de-capturas.md)
- [RF-009](../../02-funcional/requerimientos/RF-009-control-horario-operativo.md)
- [RF-011](../../02-funcional/requerimientos/RF-011-operacion-offline-acotada.md)
- [RNF-001](../../02-funcional/requerimientos/RNF-001-seguridad-trazabilidad-y-auditoria.md)
- [RNF-002](../../02-funcional/requerimientos/RNF-002-usabilidad-rendimiento-y-continuidad-operativa.md)

## Referencias De Arquitectura Y Contratos

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

Puntos obligatorios para este paquete:

- mantener separacion entre zona administrativa y zona operativa de fiscal
- la fuente de verdad de captura, validacion y horario vive en backend
- el offline se limita a capturas y cache operativa minima
- `POST /api/v1/captures/sync` debe ser idempotente por `client_capture_id`
- toda evidencia relevante debe quedar auditada
- no meter ranking UI ni reportes en este paquete
- dejar puntos de integracion listos para `RF-008` sin implementar la experiencia completa de ranking

## Referencias UX/UI

- [UX/UI](../../04-ux-ui/ux-ui.md)

Flujos UX a respetar:

- nueva captura mobile-first
- cola de capturas pendientes de sincronizacion
- validacion de captura con evidencia visible
- bloqueo por horario con mensaje claro

Reglas UX obligatorias:

- copy visible en espanol correcto y consistente
- no usar `window.alert`, `window.confirm` ni `window.prompt`
- mostrar estados offline y de sincronizacion de forma explicita
- no depender solo de color para estados
- priorizar una sola columna y CTA principal fija en operacion fiscal mobile

## Criterios De Aceptacion

- un fiscal asignado puede registrar una captura con foto obligatoria y campos esenciales
- el sistema asigna fecha y hora de registro automaticamente
- el sistema captura GPS cuando esta disponible y autorizado
- la captura queda en `pendiente de validacion`
- un usuario autorizado puede aprobar, observar o rechazar una captura
- observar o rechazar exige motivo
- las acciones fuera de ventana horaria quedan bloqueadas con registro auditable
- sin conectividad, el fiscal puede guardar capturas localmente y verlas `pendiente de sincronizacion`
- al recuperar conectividad, el sistema sincroniza sin duplicar dentro de la estrategia definida
- las validaciones y sincronizaciones dejan trazabilidad suficiente para auditoria y para slice posterior de ranking

## Arquitectura Ejecutable Cerrada

Decisiones concretas de paquete:

- implementar un unico modulo backend `captures`; la validacion vive dentro del mismo modulo
- `clientCaptureId` es obligatorio tanto online como offline
- `participantId` es obligatorio; `teamId` queda como snapshot auxiliar para ranking futuro
- `Capture.status` usa solo `PENDING_VALIDATION`, `APPROVED`, `OBSERVED`, `REJECTED`
- los estados `OFFLINE`, `PENDING_SYNC`, `SYNCING`, `SYNCED` y `ERROR` viven solo en frontend
- en esta implementacion local, la foto se guarda en filesystem privado del backend y se lee via endpoint autenticado; Postgres guarda metadata y referencias
- `POST /api/v1/captures`, `PATCH /api/v1/captures/{id}` y `POST /api/v1/captures/sync` usan JSON con `dataUrl` de imagen para no abrir un frente extra de multipart en este slice
- el offline usa `IndexedDB`; no se introduce service worker ni background sync en este paquete
- la estrategia anti-duplicados del MVP es idempotencia estricta por `tournamentId + officialId + clientCaptureId`
- no hay override horario en `PKG-003`

Reglas horarias cerradas:

- alta online: permitida solo entre `fishingStartAt` y `fishingEndAt`
- sync offline: `capturedAt` debe caer entre `fishingStartAt` y `fishingEndAt`, y el sync debe ocurrir antes de `validationDeadlineAt`
- edicion pendiente: permitida hasta `validationDeadlineAt`
- validacion: permitida hasta `validationDeadlineAt`
- si faltan hitos horarios requeridos, backend bloquea la operacion con error funcional auditable

Punto de integracion con ranking posterior:

- `captures` debe invocar un puerto interno `RankingIntegrationPort.markTournamentPendingRecalculation(tournamentId, captureId)` en `approve`, `observe` y `reject`
- en este paquete la implementacion puede ser no-op o marcador simple; no se expone UI de ranking

## Cierre De `software_architect`

Queda cerrado en:

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

Contenido ya definido:

- modelo `Capture`, `CaptureMedia` y `CaptureValidation`
- storage de fotos y metadatos
- contratos finales de `captures`, `sync` y validacion
- evaluacion horaria sin override en este slice
- idempotencia por `clientCaptureId`
- seam de integracion con ranking posterior sin UI de ranking

## Handoff Para `backend_web`

- crear modulo `captures` y flujo de persistencia de media
- no crear modulo NestJS separado `validation`; mantener approve/observe/reject dentro de `captures`
- implementar control de acceso para fiscales asignados y validadores autorizados
- implementar validaciones de negocio para foto obligatoria, estado editable y ventanas horarias
- implementar `clientCaptureId` obligatorio tambien en alta online
- persistir `source`, `recordedAt` y `syncedAt`; no persistir estados locales `OFFLINE/PENDING_SYNC/SYNCING/ERROR`
- implementar sincronizacion idempotente por item
- emitir auditoria minima:
  - `capture.created`
  - `capture.updated`
  - `capture.synced`
  - `capture.approved`
  - `capture.observed`
  - `capture.rejected`
  - `capture.blocked_by_schedule`
- dejar integracion preparada para recalculo o marca de impacto a ranking posterior
- cubrir pruebas de servicio e integracion para alta, edicion pendiente, bloqueo horario, sync y validacion

## Handoff Para `frontend_web`

- implementar zona `official` con foco mobile-first
- implementar pantalla `Nueva captura`
- implementar cola visible de capturas pendientes de sincronizacion
- implementar pantalla de validacion de capturas pendientes
- usar `IndexedDB` para cola y blobs de foto
- sincronizar item por item contra `POST /api/v1/captures/sync`
- para esta implementacion, serializar imagen como `dataUrl` y no como `multipart/form-data`
- consumir y mostrar estados:
  - `PENDING_VALIDATION`
  - `APPROVED`
  - `OBSERVED`
  - `REJECTED`
  - `OFFLINE`
  - `PENDING_SYNC`
  - `SYNCING`
  - `SYNCED`
  - `ERROR`
- mantener copy visible final:
  - sin conexion: `Estas sin conexion. La captura se guardara en este dispositivo.`
  - pendiente sync: `Esta captura sigue pendiente de sincronizacion.`
  - sync ok: `La captura se sincronizo correctamente.`
  - sync error: `No pudimos sincronizar esta captura. Revisala e intenta de nuevo.`
  - save ok: `La captura quedo registrada y pendiente de validacion.`
- feedback post-accion:
  - guardar online: confirmacion visible y retorno claro al contexto
  - guardar offline: marca persistente de pendiente de sincronizacion
  - validar: feedback visible y salida de la bandeja de pendientes
- errores visibles para usuario:
  - foto obligatoria
  - fuera de horario
  - sin conectividad
  - conflicto de sincronizacion
  - permiso insuficiente

## Handoff Para `ux_ui_web_mobile`

- cerrar flujo exacto de captura mobile-first
- cerrar copy final de estados offline, sincronizacion y validacion
- definir visual de evidencia fotografica, GPS y timestamps en validacion
- definir tratamiento de errores visibles sin sobrecargar la pantalla
- validar labels visibles de estado:
  - `Pendiente de validacion`
  - `Aprobada`
  - `Observada`
  - `Rechazada`
  - `Sin conexion`
  - `Pendiente de sincronizacion`
  - `Sincronizando`
  - `Sincronizada`
  - `Con error`

## Handoff Para `testing`

- cubrir carga online exitosa
- cubrir foto obligatoria
- cubrir edicion solo en pendiente
- cubrir bloqueo fuera de horario
- cubrir captura offline y sincronizacion posterior
- cubrir duplicado o reintento en `sync`
- cubrir aprobacion
- cubrir observacion con motivo obligatorio
- cubrir rechazo con motivo obligatorio
- cubrir permisos por rol y asignacion
- verificar auditoria y trazabilidad de sincronizacion

## Evidencia Esperada

- migraciones Prisma y esquema actualizado
- contratos backend implementados para capturas, validacion y sync
- evidencia de almacenamiento de media y trazabilidad
- recorrido UI fiscal mobile-first y de validacion
- evidencia de estados offline y sincronizacion
- resultados de pruebas del paquete

## Riesgos Y Supuestos

Riesgos:

- el offline y la foto obligatoria elevan complejidad tecnica y de UX respecto de `PKG-002`
- el almacenamiento de media sigue local al backend en esta etapa; una salida compartida o productiva requiere moverlo a storage dedicado
- mezclar ranking en este paquete agrandaria alcance y retrasaria salida operativa
- la sincronizacion offline puede generar edge cases si la estrategia de idempotencia queda floja

Supuestos:

- la experiencia de ranking queda para paquete posterior
- la validacion de captura debe quedar operativa aun si el ranking oficial todavia no se expone
- la web responsive alcanza para operacion fiscal del MVP

## Siguiente Agente Recomendado

`orchestrator`

## Paquete Exacto De Entrada

- [PKG-003](./PKG-003-operacion-fiscal-y-capturas.md)
- [ERS](../../02-funcional/ers.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [UX/UI](../../04-ux-ui/ux-ui.md)
- [RF-006](../../02-funcional/requerimientos/RF-006-carga-de-capturas.md)
- [RF-007](../../02-funcional/requerimientos/RF-007-validacion-de-capturas.md)
- [RF-009](../../02-funcional/requerimientos/RF-009-control-horario-operativo.md)
- [RF-011](../../02-funcional/requerimientos/RF-011-operacion-offline-acotada.md)

## Cierre Operativo

- conclusion: `PKG-003` cerrado operativamente
- alcance entregado:
  - operacion fiscal en `/operacion`
  - carga online y offline acotada
  - validacion de capturas
  - control horario operativo
  - evidencia privada y trazabilidad
- observaciones no bloqueantes:
  - storage local de media/evidencia sigue pensado para entorno local o instancia unica
  - falta automatizacion funcional real del modulo `captures`
  - quedan mejoras futuras de UX/copy y hardening posibles, fuera del criterio de cierre del paquete
