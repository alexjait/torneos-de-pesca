# PKG-002 Inscripcion Y Auto-Registro

Owner recomendado: `orchestrator`

## ID Del Paquete

PKG-002

## Nombre Corto

Inscripcion y auto-registro

## Objetivo De Negocio

Habilitar la inscripcion a torneos por via administrativa y por auto-registro, con trazabilidad de estado, revision administrativa y activacion de cuenta cuando corresponda.

Este paquete toma la base ya cerrada en `PKG-001` y deja lista la elegibilidad de participantes para slices posteriores, sin adelantar capturas, ranking ni offline.

## Historia O Requerimiento Fuente

- RF-003 Inscripcion y auto-registro
- RF-004 Cuentas, credenciales y validacion de email
- RNF-001 Seguridad, trazabilidad y auditoria

## Agente Owner Recomendado

`backend_web`

## Estado Operativo Actual

- `PKG-002` implementado y cerrado operativamente
- backend, frontend, testing y security review ejecutados
- resultado de cierre: `apto con observaciones`

## Alcance Incluido

- modulo `registrations` dentro del monolito modular
- inscripcion administrativa a torneo sobre participante existente
- auto-registro publico con aceptacion simple de reglamento
- estado `pendiente de revision`, `aprobado` y `rechazado`
- consulta publica de estado por token opaco
- bandeja administrativa de revision y resolucion
- aprobacion administrativa con vinculacion a participante existente o creacion de participante si hace falta
- alta de cuenta y envio de email de activacion solo cuando la aprobacion lo requiera
- auditoria de alta, revision, aprobacion y rechazo

## Fuera De Alcance

- capturas
- ranking
- offline
- pagos
- carga de documentos o validaciones documentales
- alta inline de equipos y embarcaciones desde auto-registro
- notificaciones avanzadas fuera del email de activacion cuando aplique
- recuperacion avanzada de cuenta

## Dependencias

- `PKG-001` cerrado
- arquitectura aprobada en [Arquitectura](../../03-arquitectura/arquitectura.md)
- contratos aprobados en [Contratos](../../03-arquitectura/contratos.md)
- UX/UI base definida en [UX/UI](../../04-ux-ui/ux-ui.md)
- modulos existentes `auth`, `users-access`, `participants`, `teams`, `boats`, `notifications` y `audit`

## Entradas Obligatorias

- [RF-003](../../02-funcional/requerimientos/RF-003-inscripcion-y-autoregistro.md)
- [ERS](../../02-funcional/ers.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [PKG-001](./PKG-001-base-administrativa-y-acceso.md)
- [Project State](../../00-indice/project-state.md)
- [UX/UI](../../04-ux-ui/ux-ui.md)

## Referencias Funcionales

- [RF-003](../../02-funcional/requerimientos/RF-003-inscripcion-y-autoregistro.md)
- [RF-004](../../02-funcional/requerimientos/RF-004-cuentas-credenciales-y-validacion-email.md)
- [RNF-001](../../02-funcional/requerimientos/RNF-001-seguridad-trazabilidad-y-auditoria.md)

## Referencias De Arquitectura Y Contratos

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

Puntos obligatorios para este paquete:

- `Registration` es entidad por torneo y no reemplaza a `Participant`
- `SELF_SERVICE` no crea cuenta activa hasta aprobacion
- `ADMIN` registra contra un participante existente
- consulta publica de estado solo por token opaco hasheado en persistencia
- no meter capturas, ranking ni offline en este paquete
- reutilizar flujo de activacion de `PKG-001` cuando la aprobacion genere cuenta

## Referencias UX/UI

- [UX/UI](../../04-ux-ui/ux-ui.md)

Flujos UX a respetar:

- auto-registro publico
- estado de inscripcion
- bandeja administrativa de inscripciones
- aprobacion y rechazo administrativo
- activacion de cuenta posterior a aprobacion si aplica

Reglas UX obligatorias:

- no usar `window.alert`, `window.confirm` ni `window.prompt`
- mantener el patron de backoffice ya establecido en `PKG-001`
- traducir estados tecnicos a lenguaje de usuario final

## Criterios De Aceptacion

- un participante puede enviar auto-registro para un torneo publicado o habilitado
- el sistema deja la solicitud en `PENDING_REVIEW`
- el sistema devuelve `lookup_token` para consulta publica de estado
- un administrador puede listar, abrir detalle, aprobar y rechazar solicitudes
- la inscripcion administrativa crea registro aprobado para un participante existente
- al aprobar, el backend evita duplicar participantes si ya existe uno compatible
- si la aprobacion requiere cuenta nueva, se crea identidad `PARTICIPANT`, queda `PENDING_EMAIL_VERIFICATION` y se envia email de activacion
- la consulta publica de estado muestra estado y proximo paso sin filtrar datos sensibles
- todas las transiciones relevantes quedan auditadas
- el alcance implementado no incluye capturas, ranking ni offline

## Handoff Para `backend_web`

- crear migracion Prisma para `registrations` con snapshot de postulante, `review_status`, `channel`, `status_lookup_token_hash` y referencias de revision
- implementar modulo `registrations` en `backend/src/modules/registrations`
- exponer:
  - `POST /api/v1/registrations`
  - `POST /api/v1/registrations/self-register`
  - `GET /api/v1/registrations`
  - `GET /api/v1/registrations/{id}`
  - `POST /api/v1/registrations/{id}/approve`
  - `POST /api/v1/registrations/{id}/reject`
  - `GET /api/v1/public/registrations/status/{lookupToken}`
- en aprobacion:
  - vincular participante existente por `participantId` o resolver por email/documento
  - crear `Participant` si no existe
  - crear `User` rol `PARTICIPANT` y token de activacion solo si hace falta
  - reutilizar `notifications` y `users-access`
- aplicar auditoria minima:
  - `registration.created`
  - `registration.self_registered`
  - `registration.approved`
  - `registration.rejected`
- agregar rate limiting a endpoints publicos
- agregar pruebas unitarias/integracion para duplicados, aprobacion idempotente, rechazo y consulta de estado

## Handoff Para `frontend_web`

- implementar pagina publica `/autoregistro`
- implementar pagina publica de estado de inscripcion por token en `/autoregistro/estado/[lookupToken]`
- implementar vista administrativa `/admin/inscripciones`
- consumir estados derivados:
  - `PENDING_REVIEW`
  - `PENDING_ACCOUNT_ACTIVATION`
  - `READY_TO_COMPETE`
  - `REJECTED`
- reutilizar componentes y patron `toolbar + listado + panel lateral/drawer` ya usados en `participantes` y `fiscales`
- no asumir que aprobar implica cuenta activa inmediata; mostrar `Pendiente de activación` cuando corresponda
- mantener feedback con toast/banner y mensajes inline, no dialogs nativos
- en `/autoregistro`, mostrar selector de torneo solo si hay mas de un torneo habilitado; si hay uno solo, dejarlo preseleccionado en modo lectura
- en el exito de auto-registro, mostrar `Código de consulta`, `Copiar enlace` y CTA `Consultar estado` como feedback persistente
- en `/admin/inscripciones`, aprobar y rechazar desde el panel lateral o drawer; no usar acciones masivas en este paquete
- labels visibles finales:
  - `PENDING_REVIEW` -> `Pendiente de revisión`
  - `PENDING_ACCOUNT_ACTIVATION` -> `Pendiente de activación`
  - `READY_TO_COMPETE` -> `Habilitada para competir`
  - `REJECTED` -> `Rechazada`

## Handoff Para `ux_ui_web_mobile`

- cerrar contenido del formulario de auto-registro sin meter campos fuera de alcance
- definir copy final de:
  - confirmacion de envio
  - estado pendiente
  - estado rechazado
  - pendiente de activacion
- definir la bandeja administrativa con foco en revision rapida y resolucion sin ambiguedad
- definir comportamiento de consulta de estado cuando el token no existe, expiro o ya fue consumido por otro flujo si ese caso apareciera

## Handoff Para `testing`

- cubrir auto-registro exitoso
- cubrir validaciones de campos obligatorios y aceptacion de reglamento
- cubrir consulta publica de estado valida e invalida
- cubrir aprobacion administrativa con participante existente
- cubrir aprobacion administrativa creando participante y cuenta
- cubrir rechazo con y sin motivo
- cubrir intento duplicado de auto-registro para mismo torneo
- cubrir regresion de activacion de cuenta posterior a aprobacion
- verificar auditoria y no exposicion de datos sensibles en endpoint publico

## Evidencia Esperada

- migracion Prisma y esquema actualizado
- contratos backend implementados
- evidencia de auditoria para alta, aprobacion y rechazo
- evidencia de email de activacion cuando aplica
- recorrido UI publico y administrativo
- resultados de pruebas del paquete

## Estado De Cierre

- cierre operativo: completado
- backend:
  - modulo `registrations` implementado
  - endpoint publico de torneos para auto-registro implementado
  - remediaciones de seguridad `high` y `medium` aplicadas
- frontend:
  - `/autoregistro`
  - `/autoregistro/estado/[lookupToken]`
  - `/admin/inscripciones`
  - alta administrativa usable en backoffice implementada
- testing:
  - retest real de alta administrativa, auto-registro, consulta publica, aprobacion, rechazo y auditoria sin issues bloqueantes
- security review:
  - cierre `apto con observaciones`

Observaciones no bloqueantes:

- entregabilidad de email real no validada por inbox extremo a extremo en esta corrida
- falta automatizacion del modulo `registrations`
- falta pasada mobile especifica
- auditoria de inscripciones no atomica con la transicion de negocio

## Riesgos Y Supuestos

Riesgos:

- el matching por email/documento puede requerir ajuste fino si hay datos historicos incompletos
- la consulta publica de estado necesita cuidado para no habilitar enumeracion
- la entregabilidad de email sigue dependiendo de configuracion real de `Resend`

Supuestos:

- la inscripcion administrativa trabaja sobre participantes ya existentes en el maestro
- equipos y embarcaciones siguen administrandose por flujos de `RF-002`
- el email de activacion posterior a aprobacion es suficiente para dejar encaminado el acceso del participante

## Siguiente Agente Recomendado

`orchestrator`

## Paquete Exacto De Entrada

- paquete cerrado; pedir siguiente paquete funcional al `orchestrator`
