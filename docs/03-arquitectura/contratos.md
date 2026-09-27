# Contratos

Owner recomendado: `software_architect`

## Contratos De Backend

### Convenciones generales

- API HTTP JSON versionada bajo `/api/v1`
- respuestas consistentes con:
  - `data`
  - `meta` cuando aplique
  - `error` en fallos
- ids estables para entidades
- timestamps en UTC
- endpoints protegidos por autenticacion y autorizacion server-side cuando corresponda

### Modulos y endpoints base

#### Salud y operacion

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

Objeto `HealthStatus`:

- `status`
- `timestamp`
- `checks`
  - `database`
  - `storage`
  - `config`

`GET /api/v1/health/live`

Uso:

- confirmar que el proceso HTTP arranco

Restricciones:

- no requiere autenticacion
- responde `200` si el proceso puede atender requests
- no consulta base ni storage
- no devuelve secretos, rutas internas completas ni stack traces

`GET /api/v1/health/ready`

Uso:

- confirmar que la instancia esta lista para trafico

Restricciones:

- no requiere autenticacion
- responde `200` solo si base, storage y configuracion obligatoria estan operativos
- responde `503` si falla una dependencia esencial
- no devuelve secretos ni diagnostico forense detallado; solo estado resumido por check

#### Auth y cuentas

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/activate-account`
- `POST /api/v1/auth/request-password-setup`
- `POST /api/v1/auth/complete-password-setup`
- `GET /api/v1/auth/me`

Objetos clave:

- `UserSession`
- `ActivationRequest`
- `PasswordSetupRequest`

Nota para `RF-003`:

- `POST /api/v1/auth/activate-account` se reutiliza sin cambios cuando una aprobacion de inscripcion dispare alta de cuenta y email de activacion

#### Torneos

- `GET /api/v1/tournaments`
- `POST /api/v1/tournaments`
- `GET /api/v1/tournaments/{id}`
- `PATCH /api/v1/tournaments/{id}`
- `POST /api/v1/tournaments/{id}/close`
- `PATCH /api/v1/tournaments/{id}/schedule`
- `PATCH /api/v1/tournaments/{id}/scoring`
- `GET /api/v1/public/tournaments/registration-options`

Objeto `Tournament`:

- id
- name
- date
- location
- status
- rules_summary
- schedule
- scoring_config

`GET /api/v1/public/tournaments/registration-options`

Uso:

- selector publico de torneos para `/autoregistro` sin sesion

Response minima:

- `id`
- `name`
- `eventDate`
- `location`
- `status`
- `rulesSummary` opcional

Restricciones:

- no requiere autenticacion
- no devuelve `scoring_config`, `schedule` ni metadata administrativa
- solo lista torneos aptos para auto-registro publico
- supuesto vigente del backend para `PKG-002`: apto para auto-registro = `PUBLISHED` o `ACTIVE`
- aplicar rate limiting publico consistente con los demas endpoints sin sesion

#### Participantes, equipos y embarcaciones

- `GET /api/v1/participants`
- `POST /api/v1/participants`
- `PATCH /api/v1/participants/{id}`
- `GET /api/v1/teams`
- `POST /api/v1/teams`
- `GET /api/v1/boats`
- `POST /api/v1/boats`

#### Inscripciones

- `POST /api/v1/registrations`
- `POST /api/v1/registrations/self-register`
- `GET /api/v1/registrations`
- `GET /api/v1/registrations/{id}`
- `POST /api/v1/registrations/{id}/approve`
- `POST /api/v1/registrations/{id}/reject`
- `GET /api/v1/public/registrations/status/{lookupToken}`

Objeto `Registration`:

- id
- tournament_id
- participant_id nullable
- channel
- review_status
- operational_status derivado
- applicant
- accepted_rules_at
- accepted_rules_snapshot
- reviewed_by
- reviewed_at
- rejection_reason
- account_status nullable

`POST /api/v1/registrations`

Uso:

- alta administrativa de inscripcion sobre participante existente

Request:

- `tournamentId`
- `participantId`
- `acceptedRules: true`

Response:

- `review_status = APPROVED`
- `operational_status = READY_TO_COMPETE` o `PENDING_ACCOUNT_ACTIVATION` segun estado de cuenta vinculado

`POST /api/v1/registrations/self-register`

Uso:

- auto-registro publico

Request:

- `tournamentId`
- `firstName`
- `lastName`
- `documentId` opcional
- `email`
- `phone` opcional
- `acceptedRules: true`

Response:

- `id`
- `review_status = PENDING_REVIEW`
- `operational_status = PENDING_REVIEW`
- `lookup_token` solo en esta respuesta
- `next_action = WAIT_REVIEW`

`GET /api/v1/registrations`

Uso:

- bandeja administrativa

Filtros recomendados:

- `tournamentId`
- `reviewStatus`
- `channel`

`GET /api/v1/registrations/{id}`

Uso:

- detalle administrativo para revision

Incluye:

- datos de torneo
- snapshot del postulante
- participante vinculado si existe
- estado de cuenta si existe

`POST /api/v1/registrations/{id}/approve`

Request:

- `notes` opcional

Response:

- `review_status = APPROVED`
- `operational_status = READY_TO_COMPETE` o `PENDING_ACCOUNT_ACTIVATION`
- `participant_id`
- `account_status` si aplica
- `meta.activationEmail` si la aprobacion creo cuenta y disparo email

Reglas de contrato:

- si la solicitud ya estaba resuelta, responder `409`
- si la aprobacion detecta participante existente, vincular sin duplicar
- si no existe cuenta para el participante aprobado y hay email utilizable, crear identidad y reutilizar `auth/activate-account`

`POST /api/v1/registrations/{id}/reject`

Request:

- `reason` opcional

Response:

- `review_status = REJECTED`
- `operational_status = REJECTED`

`GET /api/v1/public/registrations/status/{lookupToken}`

Uso:

- consulta publica de estado sin sesion

Response minima:

- `tournamentName`
- `review_status`
- `operational_status`
- `account_status` si ya existe cuenta
- `next_action`

Restricciones:

- no devolver email, documento ni ids internos adicionales al lookup
- el `lookupToken` se persiste hasheado, nunca en texto plano
- si no existe un campo separado para exposicion publica del rechazo, no devolver motivo libre en esta consulta; la UI publica debe derivar el mensaje desde `review_status`, `operational_status` y `next_action`
- aplicar rate limiting y respuestas uniformes para evitar enumeracion

#### Fiscales

- `GET /api/v1/officials`
- `POST /api/v1/officials`
- `PATCH /api/v1/officials/{id}`
- `POST /api/v1/officials/{id}/assignments`
- `DELETE /api/v1/officials/{id}/assignments/{assignmentId}`

Objeto `Official`:

- id
- first_name
- last_name
- document_id
- phone
- email
- account_status

#### Capturas

- `GET /api/v1/captures/context`
- `GET /api/v1/captures`
- `POST /api/v1/captures`
- `PATCH /api/v1/captures/{id}`
- `POST /api/v1/captures/sync`
- `GET /api/v1/captures/{id}`

Objeto `Capture`:

- id
- tournament_id
- participant_id
- team_id nullable
- official_id
- client_capture_id
- species
- length
- captured_at
- recorded_at
- device_recorded_at nullable
- synced_at nullable
- gps
- status
- sync_status
- media[]
- validations[]

Estados persistidos de `Capture.status`:

- `PENDING_VALIDATION`
- `APPROVED`
- `OBSERVED`
- `REJECTED`

`GET /api/v1/captures`

Uso:

- bandeja operativa del fiscal
- bandeja de validacion del torneo

Filtros recomendados:

- `tournamentId` opcional
- `status`

Reglas de acceso:

- `OFFICIAL` solo ve capturas del torneo donde esta asignado
- `ADMIN` puede consultar cualquier torneo

`GET /api/v1/captures/{id}`

Uso:

- detalle de captura y evidencia

Incluye:

- datos de torneo, participante y equipo snapshot
- metadata de media
- referencia de lectura segura de foto
- ultima validacion si existe

`GET /api/v1/captures/context`

Uso:

- bootstrap operativo para `/operacion`

Incluye:

- torneos asignados al fiscal autenticado
- horarios operativos del torneo
- participantes habilitados para competir

`POST /api/v1/captures`

Content-Type:

- `application/json`

Uso:

- alta online de captura

Request JSON:

- `clientCaptureId`
- `tournamentId`
- `participantId`
- `teamId` opcional
- `species`
- `length`
- `observation` opcional
- `gps` opcional
- `media`
  - `originalName`
  - `mimeType`
  - `dataUrl`

Reglas de contrato:

- `clientCaptureId` es obligatorio tambien online para soportar reintentos idempotentes desde cliente
- backend asigna `captured_at = recorded_at = now`
- requiere fiscal asignado
- responde `409` si ya existe un `clientCaptureId` persistido

`PATCH /api/v1/captures/{id}`

Content-Type:

- `application/json`

Uso:

- correccion de captura pendiente

Request JSON:

- cualquiera de:
  - `participantId`
  - `teamId`
  - `species`
  - `length`
  - `observation`
  - `gps`
  - `media` opcional para reemplazo

Reglas de contrato:

- solo permitido en estado `PENDING_VALIDATION`
- solo permitido hasta `validationDeadlineAt`
- la reemplazo de foto crea nuevo `CaptureMedia` y marca el previo como `REPLACED`

#### Validacion

- `POST /api/v1/captures/{id}/approve`
- `POST /api/v1/captures/{id}/observe`
- `POST /api/v1/captures/{id}/reject`

Objeto `CaptureValidation`:

- capture_id
- action
- reason
- validated_by
- validated_at

`POST /api/v1/captures/{id}/approve`

Request:

- body vacio o `notes` opcional para contexto no operativo

Response:

- `status = APPROVED`
- `latest_validation`

`POST /api/v1/captures/{id}/observe`

Request:

- `reason` obligatorio

Response:

- `status = OBSERVED`
- `latest_validation`

`POST /api/v1/captures/{id}/reject`

Request:

- `reason` obligatorio

Response:

- `status = REJECTED`
- `latest_validation`

Reglas de contrato para validacion:

- solo `ADMIN` u `OFFICIAL` asignado al torneo pueden validar
- la validacion queda bloqueada si `now > validationDeadlineAt`
- cada accion crea registro en `capture_validations` y actualiza `captures.status`
- `reason` nunca es obligatorio en `approve`

#### Ranking y scoring

- `GET /api/v1/tournaments/{id}/scoring`
- `PATCH /api/v1/tournaments/{id}/scoring`
- `GET /api/v1/tournaments/{id}/score-adjustments`
- `POST /api/v1/tournaments/{id}/score-adjustments`
- `POST /api/v1/tournaments/{id}/score-adjustments/{adjustmentId}/revoke`
- `GET /api/v1/tournaments/{id}/ranking`
- `GET /api/v1/tournaments/{id}/ranking/final`

Objeto `TournamentScoringConfig`:

- `tournamentId`
- `pointsPerValidPiece`
- `largestCaptureBonusPoints`
- `distinctSpeciesPoints`
- `tieBreakerStrategy`
- `updatedAt`
- `updatedBy`

Objeto `ScoreAdjustment`:

- `id`
- `tournamentId`
- `participantId`
- `teamId` nullable
- `pointsDelta`
- `reason`
- `status`
- `createdAt`
- `createdBy`
- `revokedAt` nullable
- `revokedBy` nullable

Objeto `RankingEntry`:

- `position`
- `competitorType`
- `competitorId`
- `competitorName`
- `totalPoints`
- `validPieces`
- `totalLength`
- `bestCaptureLength`
- `distinctSpeciesCount`
- `penaltyPoints`
- `lastScoringCaptureAt`

Objeto `RankingResponseMeta`:

- `scope`
- `snapshotType`
- `version`
- `calculatedAt`
- `isOfficial`
- `isStale`

`GET /api/v1/tournaments/{id}/scoring`

Uso:

- leer configuracion vigente de scoring del torneo

`PATCH /api/v1/tournaments/{id}/scoring`

Uso:

- actualizar configuracion de scoring soportada por el MVP

Request:

- `pointsPerValidPiece`
- `largestCaptureBonusPoints`
- `distinctSpeciesPoints`

Reglas:

- solo `ADMIN`
- todos los valores deben ser enteros mayores o iguales a `0`
- el cambio deja auditoria y dispara recalculo live

`GET /api/v1/tournaments/{id}/score-adjustments`

Uso:

- listar penalizaciones manuales vigentes o revocadas del torneo

Filtros recomendados:

- `status`
- `participantId`
- `teamId`

`POST /api/v1/tournaments/{id}/score-adjustments`

Uso:

- aplicar penalizacion manual auditable

Request:

- `participantId`
- `teamId` opcional
- `pointsDelta`
- `reason`

Reglas:

- solo `ADMIN`
- `pointsDelta` debe ser entero negativo en el MVP
- `reason` es obligatorio
- la creacion deja auditoria y dispara recalculo live

`POST /api/v1/tournaments/{id}/score-adjustments/{adjustmentId}/revoke`

Uso:

- revocar penalizacion aplicada por error o cambio operativo

Request:

- `reason` opcional

Reglas:

- solo `ADMIN`
- una penalizacion revocada no puede revocarse de nuevo
- la revocacion deja auditoria y dispara recalculo live

`GET /api/v1/tournaments/{id}/ranking`

Uso:

- leer ranking live vigente

Query params:

- `scope=INDIVIDUAL | TEAM`

Response:

- `data.entries[]` de `RankingEntry`
- `meta` de `RankingResponseMeta`

Reglas:

- `scope` default `INDIVIDUAL`
- si `TournamentRankingState.dirty = true`, se devuelve el ultimo snapshot valido con `meta.isStale = true`
- `PARTICIPANT` puede consultar ranking segun permisos de torneo

`GET /api/v1/tournaments/{id}/ranking/final`

Uso:

- leer ranking final oficial congelado

Query params:

- `scope=INDIVIDUAL | TEAM`

Reglas:

- responde `409` si el torneo aun no genero ranking final oficial
- `meta.isOfficial = true`

#### Reportes y exportaciones

- `GET /api/v1/tournaments/{id}/reports/registrations`
- `GET /api/v1/tournaments/{id}/reports/live-ranking`
- `GET /api/v1/tournaments/{id}/reports/final-ranking`
- `GET /api/v1/tournaments/{id}/reports/captures-by-participant`
- `GET /api/v1/tournaments/{id}/reports/captures-by-team`
- `GET /api/v1/tournaments/{id}/reports/rejected-observed`
- `POST /api/v1/tournaments/{id}/exports`
- `GET /api/v1/exports/{id}`
- `GET /api/v1/exports/{id}/download`

Objeto `ExportRecord`:

- `id`
- `tournamentId`
- `exportType`
- `format`
- `status`
- `fileName`
- `mimeType`
- `sizeBytes` nullable
- `requestedAt`
- `generatedAt` nullable
- `downloadUrl` nullable
- `sourceSnapshotType` nullable
- `sourceSnapshotVersion` nullable
- `errorCode` nullable

Reglas comunes de reportes:

- los `GET /reports/*` devuelven JSON consultable
- los datos deben reflejar el estado oficial vigente al momento de la respuesta
- `reports/live-ranking` lee snapshot `LIVE`
- `reports/final-ranking` lee snapshot `FINAL`
- los reportes de capturas no recalculan scoring

`POST /api/v1/tournaments/{id}/exports`

Uso:

- solicitar una exportacion basica del torneo

Request:

- `exportType`
  - `REGISTRATIONS`
  - `LIVE_RANKING`
  - `FINAL_RANKING`
  - `CAPTURES_BY_PARTICIPANT`
  - `CAPTURES_BY_TEAM`
  - `REJECTED_OBSERVED_CAPTURES`
- `format`
  - `CSV`
  - `XLSX`
- `scope` opcional para exportaciones de ranking

Response:

- `data` de `ExportRecord`

Reglas:

- en `PKG-004` la generacion es sincronica
- si la generacion es exitosa, `status = READY` y se informa `downloadUrl`
- si falla, `status = FAILED`
- toda exportacion deja auditoria

`GET /api/v1/exports/{id}`

Uso:

- consultar metadata de una exportacion ya generada

`GET /api/v1/exports/{id}/download`

Uso:

- descargar el archivo generado mediante control de acceso server-side

### Contratos de idempotencia y offline

Para `PKG-003`, `POST /api/v1/captures/sync` sincroniza uno o mas items por request.

Content-Type:

- `application/json`

Request:

- `items[]`
  - `clientCaptureId`
  - `tournamentId`
  - `participantId`
  - `teamId` opcional
  - `species`
  - `length`
  - `capturedAt`
  - `deviceRecordedAt`
  - `observation` opcional
  - `gps` opcional
  - `media`
    - `originalName`
    - `mimeType`
    - `dataUrl`

Reglas:

- el backend resuelve idempotencia por `tournamentId + officialId + clientCaptureId`
- si el item ya existe por esa clave, responde item `duplicate` con el `capture_id` persistido
- si el item es aceptado, responde item `accepted`
- si el item queda bloqueado por horario, permisos o validacion funcional, responde item `rejected` con mensaje funcional
- para sync offline el backend acepta que `capturedAt` sea anterior a `recordedAt`, pero exige que caiga dentro de la ventana `fishingStartAt .. fishingEndAt`

Response minima:

- `items[]`
  - `client_capture_id`
  - `status` con valores `accepted | duplicate | rejected`
  - `capture_id` cuando aplica
  - `error` cuando aplica

Codigos funcionales recomendados:

- `PHOTO_REQUIRED`
- `OFFICIAL_NOT_ASSIGNED`
- `OUTSIDE_CAPTURE_WINDOW`
- `OUTSIDE_VALIDATION_WINDOW`
- `CAPTURE_NOT_EDITABLE`
- `DUPLICATE_CLIENT_CAPTURE`

## Contratos Operativos De Release

### Smoke post-deploy obligatorio

El smoke minimo de `PKG-006` reutiliza contratos existentes y debe correr contra HTTP real de la instancia desplegada o equivalente.

Secuencia obligatoria:

1. `GET /api/v1/health/live` devuelve `200`
2. `GET /api/v1/health/ready` devuelve `200`
3. `POST /api/v1/auth/login` con credencial administrativa de smoke devuelve `200`
4. `GET /api/v1/auth/me` con el bearer emitido devuelve `200`
5. `GET /api/v1/tournaments` con el mismo bearer devuelve `200`

Restricciones:

- las credenciales de smoke se inyectan fuera de la app, no por contrato publico
- el smoke obligatorio es `read-only`
- un release sin smoke en verde no se considera promovible a `staging` estable ni a `prod`

## Contratos De Frontend

### Estructura de consumo

El frontend debe consumir la API mediante una capa centralizada y tipada, evitando fetch disperso en componentes.

### Areas funcionales

- `public`
  - login
  - activacion de cuenta
  - auto-registro
  - estado de inscripcion
  - ranking
- `admin`
  - torneos
  - participantes
  - equipos
  - embarcaciones
  - fiscales
  - aprobaciones
  - inscripciones
  - reportes
- `official`
  - captura
  - validacion
  - cola offline

### Estados de UI obligatorios

- `idle`
- `loading`
- `success`
- `error`
- `offline`
- `pending_sync`
- `syncing`
- `synced`

Nota de contrato:

- `PENDING_VALIDATION | APPROVED | OBSERVED | REJECTED` son estados de dominio devueltos por backend
- `OFFLINE | PENDING_SYNC | SYNCING | SYNCED | ERROR` son estados locales de sincronizacion manejados por frontend
- frontend no debe persistir `syncing` ni `error` en backend como si fueran estados canonicos de la captura

### Restricciones frontend

- no implementar reglas de scoring en cliente como fuente de verdad
- no asumir permisos solo por ocultar UI
- no almacenar secretos
- usar almacenamiento local solo para soporte offline acotado de capturas y cache necesaria
- usar `IndexedDB` para blobs de foto y cola offline de `PKG-003`
- no persistir `lookup_token` de estado en lugares compartidos o permanentes mas alla de lo necesario para retomar el flujo del usuario

## Contratos De Integracion

### Correo transaccional

El backend necesita un proveedor abstracto con operaciones:

- `sendAccountActivationEmail`
- `sendOfficialRegistrationEmail`
- `sendParticipantRegistrationEmail`

Proveedor recomendado para el MVP:

- `Resend`

Respuesta minima esperada:

- provider_message_id
- accepted
- error_code si falla

Restricciones de integracion:

- el envio debe ocurrir solo desde backend o procesos server-side
- cada envio transaccional debe contemplar `idempotency key` derivada del evento de negocio
- la integracion debe tratar explicitamente la respuesta `{ data, error }` del SDK y no asumir excepciones como unico mecanismo de fallo

### Storage de imagenes

Operaciones requeridas:

- `upload`
- `getSecureReadReference`

La lectura de evidencia no debe quedar expuesta mediante URLs publicas permanentes sin control.

Para `PKG-003` la implementacion vigente usa JSON + `dataUrl` y lectura privada de evidencia via backend autenticado. Si mas adelante el peso real de fotos lo exige, el siguiente paso razonable es migrar a blobs/multipart u object storage sin romper contratos funcionales del slice.

### Exportaciones

En `PKG-004` las exportaciones se generan de forma sincronica y quedan registradas en `ExportRecord`.

Si el volumen crece, este contrato debe poder evolucionar a estados intermedios como `PROCESSING` sin romper la semantica de:

- `POST /api/v1/tournaments/{id}/exports`
- `GET /api/v1/exports/{id}`
- `GET /api/v1/exports/{id}/download`

## Restricciones Y Compatibilidad

- el MVP debe mantener compatibilidad con navegadores modernos de escritorio y movil
- el flujo offline se limita a capturas, no a administracion general
- los contratos deben soportar crecimiento sin romper ids ni estados
- cualquier extension futura a tiempo real, clima o pagos debe agregarse sin romper los modulos centrales
- auditoria y soft delete son restricciones de arquitectura, no optativos de implementación
