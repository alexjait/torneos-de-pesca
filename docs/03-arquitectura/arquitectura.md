# Arquitectura

Owner recomendado: `software_architect`

## Resumen De Arquitectura

Se recomienda una arquitectura de `monolito modular` para el MVP, compuesta por:

- `frontend web` en Next.js
- `backend API` en NestJS
- `base de datos` Postgres
- `ORM` Prisma
- `almacenamiento de archivos` para evidencia fotografica
- `servicio de correo transaccional` Resend para alta y validacion de cuentas

La decision principal es evitar microservicios en esta etapa. El dominio funcional es suficientemente rico como para requerir buena separacion interna, pero no necesita distribucion fisica temprana. Un monolito modular da:

- menor complejidad operativa
- despliegue mas simple
- menor costo de coordinacion
- mejores tiempos de desarrollo inicial
- posibilidad de evolucion posterior sin rehacer el dominio

La arquitectura propuesta busca ser potente pero facil de administrar, con limites modulares claros, contratos explicitados y crecimiento controlado.

## Decisiones Tecnicas Clave

### DEC-001 Monolito modular

Se adopta `monolito modular` en lugar de multiples servicios.

Rationale:

- el MVP tiene un equipo y un alcance donde la complejidad principal esta en reglas, trazabilidad, offline y auditoria, no en escalado independiente por servicio
- scoring, ranking, capturas, validaciones y horarios comparten transacciones y reglas de negocio fuertemente relacionadas
- simplifica desarrollo, testing, observabilidad y despliegue

Consecuencia:

- separar por modulos de dominio dentro del backend
- exponer contratos estables por API
- dejar preparada evolucion futura a extraccion de servicios si volumen o integraciones lo justifican

### DEC-002 Stack recomendado

Stack recomendado para el MVP:

- Next.js para frontend web
- NestJS para backend
- Postgres para persistencia principal
- Prisma como ORM principal

Rationale:

- encaja bien con la necesidad de producto web responsive con buena DX
- NestJS favorece estructura modular, DI, validacion, guardias, interceptores y patrones limpios para dominio
- Postgres ofrece solidez transaccional, consultas complejas, auditoria y soporte para crecimiento razonable
- Prisma simplifica esquema, migraciones y tipado para un equipo pequeno o mediano sin agregar complejidad innecesaria

### DEC-003 Dominio orientado a modulos y servicios de aplicacion

Se recomienda organizar el backend con capas y modulos:

- `presentation`
- `application`
- `domain`
- `infrastructure`

Patrones sugeridos:

- servicios de aplicacion para casos de uso
- repositorios para acceso a persistencia
- entidades/agregados para invariantes relevantes
- eventos de dominio o eventos de aplicacion internos cuando aporten desacople sin sobrediseño
- políticas/estrategias simples para scoring

No se recomienda introducir CQRS completo, event sourcing ni bus distribuido en el MVP.

### DEC-003A Estrategia de frontend para MVP

Se recomienda mantener `Next.js web responsive mobile-first` para el MVP y no iniciar con React Native en esta etapa.

Rationale:

- la ERS ya define como alcance inicial una aplicacion web responsive optimizada para uso movil
- una app nativa agregaria complejidad de desarrollo, distribucion y soporte demasiado temprano
- el offline requerido para el MVP es acotado y puede resolverse razonablemente en web
- permite validar la operacion real de fiscales antes de abrir un segundo frente de cliente

Evolucion prevista:

- si la operacion en campo demuestra necesidad de capacidades nativas mas profundas, React Native queda como opcion valida para una segunda etapa
- especialmente si crecen necesidades de almacenamiento offline robusto, integraciones nativas de camara/GPS o sincronizacion mas agresiva

### DEC-004 Offline acotado en frontend

El offline del MVP se resuelve del lado cliente para el flujo de capturas, no como capacidad full offline del sistema.

Estrategia:

- cache local de datos necesarios del torneo
- cola local de capturas pendientes
- sincronizacion al recuperar conectividad
- estado visible de pendiente, sincronizando, sincronizado o error

No se propone sincronizacion bidireccional generalizada ni resolucion avanzada de conflictos en esta etapa.

### DEC-005 Ranking en vivo sin sobrediseño

El ranking en vivo se resuelve con recalculo backend disparado por eventos de validacion/cambio relevante y lectura optimizada desde tablas o vistas persistidas.

No se recomienda introducir streaming complejo ni infra de tiempo real dedicada en el MVP si no hay evidencia operativa de necesidad.

Se puede resolver con:

- recalculo inmediato o cuasi inmediato luego de validar capturas
- polling liviano desde frontend para vistas de ranking

### DEC-006 Soft delete y auditoria first-class

La arquitectura debe contemplar desde el inicio:

- borrado logico en entidades administrativas e historicas
- auditoria de acciones relevantes

Estas capacidades no deben quedar como agregados laterales; forman parte del diseño base del dominio y la persistencia.

## Modulos Y Limites

### Frontend web

Aplicacion Next.js con dos grandes zonas funcionales:

- `zona publica / acceso`
  - login
  - validacion de cuenta
  - auto-registro
  - ranking publico o semi-publico si corresponde
- `zona autenticada`
  - administracion
  - operacion de fiscales
  - consulta de participantes
  - reportes y cierre

Estructura recomendada:

- rutas por area funcional
- componentes de UI desacoplados de fetch
- capa de acceso a API centralizada
- manejo explicito de estados offline para captura

### Backend API

Modulos recomendados:

- `auth`
  - login
  - sesion/token
  - validacion de email
  - credenciales temporales
- `users-access`
  - usuarios
  - roles
  - permisos
  - estados de cuenta
- `tournaments`
  - torneos
  - estados
  - horarios
  - reglamento referenciado
- `participants`
  - participantes
  - equipos
  - embarcaciones
  - relaciones y habilitaciones
- `registrations`
  - inscripcion administrativa
  - auto-registro
  - aprobacion o rechazo
- `officials`
  - fiscales
  - asignacion por torneo
- `captures`
  - captura
  - evidencia
  - estado
  - geolocalizacion
  - sincronizacion recibida
  - validacion
  - integracion futura con ranking
- `scoring-ranking`
  - parametros de scoring
  - calculo de puntajes
  - ranking en vivo
  - ranking final
- `reports-exports`
  - reportes
  - exportaciones
- `audit`
  - logs de auditoria
- `notifications`
  - envio de email transaccional

### Limites recomendados

- `captures` no calcula ranking; emite cambios relevantes al modulo `scoring-ranking`
- `registrations` y `officials` dependen de `users-access` para estado de cuenta, no duplican logica de identidad
- `audit` registra eventos desde servicios de aplicacion e infraestructura sensible
- `notifications` abstrae proveedor de correo

### RF-003 Inscripcion y auto-registro

Para `PKG-002` se recomienda modelar la inscripcion como un agregado propio y acotado a torneo:

- `Registration` representa la solicitud o alta de inscripcion a un torneo, no el perfil maestro de `Participant`
- `Participant` sigue siendo la entidad maestra reutilizable del dominio
- `Registration` referencia a `Participant` cuando ya existe o cuando la solicitud fue aprobada y materializada

Canales soportados:

- `ADMIN`
  - alta administrativa de inscripcion sobre un `participant_id` existente
  - la inscripcion se crea ya revisada en estado `APPROVED`
- `SELF_SERVICE`
  - alta publica desde formulario de auto-registro
  - la inscripcion persiste primero como solicitud con snapshot de datos del postulante
  - no crea cuenta operativa ni habilita competir hasta resolucion administrativa

Estados persistidos recomendados para `Registration.review_status`:

- `PENDING_REVIEW`
- `APPROVED`
- `REJECTED`

Estado operativo derivado recomendado para UI y contratos:

- `PENDING_REVIEW`
- `PENDING_ACCOUNT_ACTIVATION`
- `READY_TO_COMPETE`
- `REJECTED`

Reglas arquitectonicas de este flujo:

- el auto-registro guarda `accepted_rules_at` y snapshot del reglamento resumido vigente al momento del envio
- la aprobacion administrativa resuelve si la solicitud se vincula a un participante existente o crea uno nuevo
- la cuenta de acceso para auto-registro se crea solo al aprobar, si todavia no existe una identidad utilizable para ese participante
- la activacion de cuenta reutiliza el flujo ya definido en `auth` y `users-access`; no se introduce un segundo mecanismo de activacion
- la inscripcion aprobada no calcula ranking ni habilita capturas por si sola; solo deja la elegibilidad del participante lista para slices posteriores
- el auto-registro no gestiona altas inline de equipos o embarcaciones en `PKG-002`
- `PKG-002` no incorpora offline, capturas ni ranking

### PKG-003 Operacion fiscal y capturas

Para `PKG-003` se recomienda implementar un unico modulo NestJS `captures`.

Alcance del modulo:

- alta online de capturas
- edicion de capturas pendientes
- sincronizacion offline item por item
- validacion `approve | observe | reject`
- evaluacion horaria operativa
- persistencia de evidencia fotografica
- punto de integracion interno con ranking futuro

No se recomienda crear un modulo fisico separado `validation` en esta etapa. La validacion forma parte del mismo agregado operativo de captura y comparte invariantes, permisos, auditoria y ventanas horarias.

#### Modelo de dominio recomendado para PKG-003

Entidad `Capture`:

- `id`
- `tournamentId`
- `participantId` obligatorio
- `teamId` nullable como snapshot del equipo vigente al momento de la captura
- `officialId`
- `clientCaptureId` obligatorio para online y offline
- `status` con valores `PENDING_VALIDATION | APPROVED | OBSERVED | REJECTED`
- `species` como string normalizada
- `length` como decimal positivo
- `capturedAt` como fecha/hora operativa de la captura
- `recordedAt` como fecha/hora de persistencia inicial en backend
- `deviceRecordedAt` nullable para conservar timestamp local de origen
- `syncedAt` nullable para altas originadas offline
- `observation` nullable
- `gps` nullable
- `createdAt`
- `updatedAt`

Entidad `CaptureMedia`:

- `id`
- `captureId`
- `storageKey`
- `originalFileName`
- `mimeType`
- `sizeBytes`
- `checksumSha256`
- `uploadedAt`
- `status` con valores `ACTIVE | REPLACED`

Entidad `CaptureValidation`:

- `id`
- `captureId`
- `action` con valores `APPROVE | OBSERVE | REJECT`
- `reason` nullable solo en `APPROVE`
- `validatedByUserId`
- `validatorOfficialId` nullable
- `createdAt`

Invariantes:

- `participantId` es obligatorio en `PKG-003`; `teamId` queda como snapshot auxiliar para ranking futuro
- `clientCaptureId` debe ser unico por `tournamentId + officialId + clientCaptureId`
- una captura solo es editable en estado `PENDING_VALIDATION`
- `OBSERVED` y `REJECTED` son estados terminales para esa captura; si hace falta correccion se registra una nueva
- `CaptureMedia` soporta mas de un registro por evolucion futura, pero en `PKG-003` debe existir al menos una foto asociada y la UI consume la ultima vigente

#### Evaluacion horaria operativa

`TournamentSchedule` ya existente queda como fuente de verdad horaria.

Reglas concretas:

- ventana de carga online: `fishingStartAt <= now <= fishingEndAt`
- ventana de sincronizacion offline: `fishingStartAt <= capturedAt <= fishingEndAt` y `now <= validationDeadlineAt`
- ventana de edicion pendiente: `now <= validationDeadlineAt`
- ventana de validacion: `now <= validationDeadlineAt`

Decisiones:

- para altas online, backend asigna `capturedAt = recordedAt = now` en UTC
- para altas offline, frontend genera `capturedAt` local y backend lo persiste normalizado a UTC; `recordedAt` y `syncedAt` reflejan el momento de recepcion del servidor
- si faltan `fishingStartAt`, `fishingEndAt` o `validationDeadlineAt`, el backend debe bloquear carga, sync y validacion con error funcional; `startAt` queda informativo para este paquete
- no se introduce override horario en `PKG-003`; ni `ADMIN` ni `OFFICIAL` pueden saltear la ventana en este slice

#### Storage de fotos

La foto no debe vivir en Postgres.

Decision concreta:

- persistir metadata en Postgres
- guardar binario en filesystem privado del backend en esta etapa
- leer evidencia solo via endpoint backend autenticado

Reglas de integracion:

- backend recibe la imagen serializada como `dataUrl`, la persiste en storage privado y luego cierra la operacion
- lectura de evidencia solo mediante endpoint backend autenticado; no usar URLs publicas permanentes
- frontend encola la imagen en `IndexedDB` para offline acotado

#### Offline acotado ejecutable

El offline de `PKG-003` se limita a una cola local en navegador y cache operativa minima por torneo.

Decision concreta de cliente:

- usar `IndexedDB` para cola de capturas y blobs de foto
- no depender de `localStorage` para fotos ni payloads grandes
- no depender de service worker ni sync en background para el MVP; la sincronizacion se dispara al reabrir la pantalla o al detectar conectividad

Cache minima permitida:

- torneo activo y sus horarios
- perfil del fiscal autenticado
- participantes habilitados del torneo con snapshot minimo de equipo

Modelo de cola local recomendado:

- `clientCaptureId`
- `tournamentId`
- `participantId`
- `teamId` snapshot nullable
- `species`
- `length`
- `capturedAt`
- `gps`
- `observation`
- `photoDataUrl`
- `localSyncStatus` con valores `PENDING_SYNC | SYNCING | SYNCED | ERROR`
- `lastSyncErrorCode` nullable

Reglas:

- la cola sincroniza item por item sobre `POST /api/v1/captures/sync`
- no hay merge automatico ni deduplicacion por contenido; la estrategia anti-duplicados del MVP es idempotencia estricta por `clientCaptureId`
- los estados `OFFLINE`, `PENDING_SYNC`, `SYNCING`, `SYNCED` y `ERROR` viven en frontend; backend persiste solo `source`, `recordedAt` y `syncedAt`

#### Punto de integracion con ranking posterior

`PKG-003` no calcula ranking ni expone UI de ranking.

El seam a dejar listo es:

- servicio interno `RankingIntegrationPort`
- llamado desde `approve`, `observe` y `reject`
- operacion minima: `markTournamentPendingRecalculation(tournamentId, captureId)`

En `PKG-003` este puerto puede resolverse con implementacion no-op o marcador simple. `RF-008` reemplaza esa implementacion sin mover contratos de `captures`.

### PKG-004 Scoring, ranking y reportes basicos

Para `PKG-004` se recomienda mantener `RF-008` y `RF-010` en el mismo paquete.

Motivo concreto:

- los reportes obligatorios y las exportaciones basicas consumen exactamente los mismos snapshots, metadatos de scoring y read models de capturas que necesita ranking
- separar `RF-010` ahora obligaria a duplicar persistencia de lectura, contratos y evidencia tecnica sin reducir un riesgo tecnico real del MVP

El corte tecnico interno del paquete queda entre dos modulos:

- `scoring-ranking`
  - scoring por torneo
  - ajustes manuales de puntaje
  - ranking live
  - ranking final oficial
- `reports-exports`
  - reportes consultables
  - exportaciones `CSV` y `XLSX`
  - metadata y descarga segura de archivos generados

#### Modelo de dominio recomendado para PKG-004

Entidad `TournamentScoringConfig`:

- `id`
- `tournamentId`
- `pointsPerValidPiece`
- `largestCaptureBonusPoints`
- `distinctSpeciesPoints`
- `tieBreakerStrategy` con valor fijo inicial `MVP_V1`
- `updatedByUserId`
- `updatedAt`

Entidad `ScoreAdjustment`:

- `id`
- `tournamentId`
- `participantId`
- `teamId` nullable como snapshot para ranking por equipo
- `pointsDelta`
- `reason`
- `status` con valores `ACTIVE | REVOKED`
- `createdByUserId`
- `createdAt`
- `revokedByUserId` nullable
- `revokedAt` nullable

Regla concreta:

- en el MVP, `ScoreAdjustment` se usa para penalizaciones manuales auditables
- `pointsDelta` debe ser negativo en creacion para no abrir un frente de bonificaciones manuales fuera de alcance

Entidad `TournamentRankingState`:

- `tournamentId`
- `liveVersion`
- `lastCalculatedAt`
- `dirty` boolean
- `dirtyReason` nullable
- `finalVersion` nullable
- `finalizedAt` nullable
- `finalizedByUserId` nullable

Entidad `RankingEntry`:

- `id`
- `tournamentId`
- `snapshotType` con valores `LIVE | FINAL`
- `scope` con valores `INDIVIDUAL | TEAM`
- `version`
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
- `calculatedAt`

Entidad `ExportRecord`:

- `id`
- `tournamentId`
- `exportType`
- `format` con valores `CSV | XLSX`
- `status` con valores `READY | FAILED`
- `scope` nullable
- `storageKey`
- `fileName`
- `mimeType`
- `sizeBytes`
- `requestedByUserId`
- `requestedAt`
- `generatedAt` nullable
- `sourceSnapshotType` nullable
- `sourceSnapshotVersion` nullable
- `errorCode` nullable

#### Reglas e invariantes de PKG-004

- solo capturas `APPROVED` participan en scoring
- el ranking live se recalcula ante:
  - `capture.approved`
  - `capture.observed`
  - `capture.rejected`
  - cambio de `TournamentScoringConfig`
  - alta o revocacion de `ScoreAdjustment`
- el ranking final oficial se genera al cerrar torneo y queda congelado
- `reports-exports` no recalcula puntajes; lee snapshots y consultas consolidadas
- el ranking por equipo usa `Capture.teamId` como snapshot operativo; no rehace composicion historica desde relaciones maestras
- los desempates se resuelven exclusivamente en backend con la secuencia definida en ERS

#### Estrategia de recalculo y cierre

Decision ejecutable del MVP:

- `RankingIntegrationPort.markTournamentPendingRecalculation(tournamentId, captureId)` deja de ser marcador y delega en `scoring-ranking`
- el monolito intenta recalculo live inline despues de cada cambio relevante
- si el recalculo falla:
  - la mutacion de negocio original no se revierte
  - `TournamentRankingState.dirty = true`
  - `GET` de ranking devuelve el ultimo snapshot valido con `meta.isStale = true`
  - el siguiente cambio relevante vuelve a intentar recalcular
- `POST /api/v1/tournaments/{id}/close` debe:
  - verificar que exista snapshot live consistente
  - materializar snapshot `FINAL`
  - persistir `finalVersion` y `finalizedAt`
  - recien despues cerrar el torneo

No se introduce worker ni cola dedicada para recalculo en este paquete.

#### Reportes y exportaciones basicas

Decision ejecutable del MVP:

- los reportes consultables salen por `GET` JSON paginado o completo segun necesidad administrativa
- las exportaciones se generan de forma sincronica desde los mismos read models
- el archivo generado se guarda en storage privado del backend con metadata en Postgres
- la descarga ocurre por endpoint autenticado, no por URL publica permanente

No se recomienda separar aun un subsistema de jobs asincronicos. Si el volumen real lo exige, la evolucion futura debe conservar el contrato funcional de solicitud y consulta de exportacion.

## Integraciones

### Correo transaccional

Uso:

- alta administrativa de participantes
- alta de fiscales
- validacion de cuenta
- posible recuperacion de acceso futura

Proveedor recomendado para el MVP:

- `Resend`

Contrato esperado:

- envio asincronico preferente
- reintentos controlados
- trazabilidad de envio y estado
- uso server-side exclusivo, nunca desde cliente
- uso de idempotency keys por evento de negocio para evitar emails duplicados en reintentos

### Almacenamiento de archivos

Uso:

- fotos de captura

Recomendacion:

- no guardar binarios grandes en Postgres
- guardar metadata, puntero y estado en Postgres
- almacenar archivos en object storage o almacenamiento equivalente administrable

### Integraciones futuras no MVP

- clima
- pagos
- notificaciones avanzadas

No deben condicionar la arquitectura del MVP salvo dejar puntos de extension simples.

## Datos Y Persistencia

### Base principal

Postgres como fuente de verdad principal.

### ORM recomendado

Se recomienda `Prisma` como ORM principal sobre Postgres.

Criterio de uso:

- Prisma para modelado, migraciones y acceso tipado a la mayor parte del dominio
- SQL puntual encapsulado o repositorios especificos para consultas exigentes de ranking, reportes o auditoria si Prisma no resulta suficiente o legible

Restriccion:

- la logica de negocio no debe vivir en el ORM; Prisma queda en infraestructura y acceso a datos

### Entidades principales recomendadas

- `users`
- `roles`
- `user_role_assignments`
- `email_verification_tokens`
- `password_setup_tokens`
- `tournaments`
- `tournament_schedule`
- `tournament_scoring_rules`
- `participants`
- `teams`
- `boats`
- `participant_team_links`
- `participant_boat_links`
- `registrations`
- `officials`
- `official_tournament_assignments`
- `captures`
- `capture_media`
- `capture_validations`
- `tournament_scoring_config`
- `score_adjustments`
- `tournament_ranking_state`
- `ranking_entries`
- `audit_logs`
- `exports`

### Modelo de captura recomendado

La tabla `captures` debe cubrir altas online y sincronizadas sin duplicar logica.

Campos recomendados:

- `id`
- `tournament_id`
- `participant_id`
- `team_id` nullable
- `official_id`
- `client_capture_id`
- `source`
- `status`
- `species`
- `length_cm`
- `captured_at`
- `recorded_at`
- `synced_at` nullable
- `notes` nullable
- `gps_lat` nullable
- `gps_lng` nullable
- `gps_accuracy_meters` nullable
- `created_at`
- `updated_at`

Restricciones recomendadas:

- `@@unique([tournament_id, official_id, client_capture_id])`
- indice por `tournament_id + status + captured_at desc`
- indice por `participant_id + captured_at desc`
- indice por `official_id + created_at desc`

Decisiones:

- `captures` no usa soft delete
- `species` se persiste como string normalizada; no se introduce catalogo maestro en `PKG-003`
- `team_id` es snapshot para integracion futura con ranking por equipos; no reemplaza la relacion maestra del participante

La tabla `capture_media` debe guardar:

- `id`
- `capture_id`
- `storage_key`
- `original_file_name`
- `mime_type`
- `size_bytes`
- `checksum_sha256`
- `uploaded_at`
- `status`

Restricciones recomendadas:

- indice por `capture_id + status`
- garantizar desde servicio que exista una sola foto `ACTIVE` por captura en `PKG-003`

La tabla `capture_validations` debe guardar:

- `id`
- `capture_id`
- `action`
- `reason`
- `validated_by_user_id`
- `validator_official_id` nullable
- `created_at`

Restricciones recomendadas:

- indice por `capture_id + created_at desc`
- motivo obligatorio solo para `OBSERVE` y `REJECT`

### Modelo de inscripcion recomendado

La tabla `registrations` debe cubrir tanto alta administrativa como auto-registro.

Campos recomendados:

- `id`
- `tournament_id`
- `participant_id` nullable hasta aprobacion o vinculacion
- `channel`
- `review_status`
- `applicant_first_name`
- `applicant_last_name`
- `applicant_document_id`
- `applicant_email`
- `applicant_phone`
- `accepted_rules_at`
- `accepted_rules_snapshot`
- `status_lookup_token_hash` solo para consulta publica de estado
- `review_notes`
- `reviewed_by_user_id`
- `reviewed_at`
- `rejection_reason`
- `created_at`
- `updated_at`

Restricciones recomendadas:

- una inscripcion aprobada por `tournament_id + participant_id`
- una solicitud abierta por `tournament_id + applicant_email` cuando el email exista
- una solicitud abierta por `tournament_id + applicant_document_id` cuando el documento exista
- indices por `tournament_id + review_status + created_at`
- indice unico por `status_lookup_token_hash`

Decisiones:

- `registrations` no usa soft delete por defecto; la historia de aprobacion/rechazo debe quedar visible
- la consulta publica de estado no expone email ni documento como clave de busqueda; usa token opaco hasheado en persistencia
- la resolucion de duplicados se hace en backend al aprobar, comparando email y/o documento contra `participants` y `users`

### Soft delete

Se recomienda columnas estandar:

- `deleted_at`
- `deleted_by`

Aplicar a:

- participantes
- equipos
- embarcaciones
- fiscales
- relaciones administrativas donde corresponda

No aplicar por defecto a logs de auditoria ni a registros que deban ser inmutables por trazabilidad.

### Auditoria

Modelo recomendado:

- tabla `audit_logs`
- evento con:
  - actor
  - rol
  - accion
  - entidad
  - entidad_id
  - timestamp
  - contexto
  - diff resumido cuando aplique
  - origen online/offline si corresponde

Registrar al menos:

- altas y modificaciones administrativas
- aprobacion/rechazo de auto-registros
- altas de fiscales
- envio/validacion de cuenta
- alta/edicion/anulacion de capturas
- validacion/observacion/rechazo de capturas
- cierre de torneo
- sincronizaciones offline

### Manejo de evidencia fotografica

En `capture_media` guardar:

- capture_id
- storage_key
- nombre original
- mime_type
- size
- checksum opcional
- uploaded_at
- status

Esto facilita trazabilidad, integridad y migraciones futuras de storage.

### Ranking y scoring

Modelo recomendado:

- `TournamentScoringConfig` como unica configuracion vigente por torneo
- `ScoreAdjustment` para penalizaciones manuales auditables del MVP
- `TournamentRankingState` para versionado, frescura y cierre oficial
- `RankingEntry` para snapshots `LIVE` y `FINAL` por `scope`

Algoritmo recomendado:

- agrupar solo capturas `APPROVED`
- calcular puntos por pieza valida
- sumar bonus por pieza mas grande por `scope`
- sumar puntos por especies distintas por competidor
- aplicar `ScoreAdjustment` activos
- resolver desempates por:
  - mayor puntaje total
  - mayor longitud de mejor captura
  - mayor cantidad de piezas validas
  - menor fecha/hora de la ultima captura valida que aporto puntaje

Restricciones:

- no usar reglas hardcodeadas dispersas en controladores o frontend
- `FINAL` es inmutable luego de cierre
- `LIVE` puede reescribirse por version sin perder historial inmediato del estado vigente

### Reportes y exportaciones

Modelo recomendado:

- `reports-exports` opera sobre snapshots y consultas consolidadas
- `ExportRecord` guarda metadata y referencia segura de descarga

Reportes obligatorios del MVP:

- inscriptos por torneo
- ranking live
- ranking final
- capturas por pescador
- capturas por equipo
- capturas observadas y rechazadas

Formatos obligatorios del MVP:

- `CSV`
- `XLSX`

Restricciones:

- no incluir `PDF` ni formatos regulatorios especiales en `PKG-004`
- mantener generacion sincronica mientras el volumen operativo lo permita
- toda exportacion debe quedar auditada con usuario, torneo, tipo y momento de generacion

## Seguridad

### Identidad y acceso

Modelo recomendado:

- autenticacion centralizada en backend
- control de acceso por roles server-side
- email como identificador de cuenta
- contraseña temporal para altas administrativas y fiscales
- validacion obligatoria de cuenta antes de habilitar acceso efectivo

### Flujo de alta administrativa

- administrador crea usuario/fiscal
- backend genera cuenta en estado `pending_email_verification`
- backend genera token de activacion y credencial temporal o flujo de seteo inicial
- se envia email
- usuario valida cuenta
- cuenta pasa a estado operativo segun rol

### Autorizacion

Usar controles por:

- rol global
- pertenencia al torneo
- estado del torneo
- estado de la cuenta

### Consideraciones de seguridad

- tokens de validacion con expiracion
- hashes de contraseña
- no almacenar secretos ni contraseñas temporales en texto plano
- limitar acceso a evidencia fotografica
- auditar acciones sensibles

### Controles adicionales para RF-003

- rate limiting y validaciones antifraude basicas en endpoints publicos de auto-registro y consulta de estado
- respuestas de consulta publica de estado minimas y sin datos sensibles del participante

## Observabilidad Y Performance

### Logs operativos

Separar:

- `logs tecnicos`
- `logs de auditoria`

Los logs tecnicos deben incluir:

- errores de API
- fallos de envio de email
- fallos de storage
- eventos de sincronizacion offline
- tiempos de endpoints criticos

### Metricas recomendadas

- tiempo de respuesta de login
- tiempo de alta de captura
- tiempo de validacion de captura
- tiempo de recalculo de ranking
- tasa de ranking `dirty`
- cantidad de capturas pendientes de sincronizacion
- tasa de fallo de envio de email
- cantidad de auto-registros recibidos
- tiempo de resolucion de inscripciones pendientes
- tasa de aprobacion y rechazo
- tasa de fallo de envio de activacion posterior a aprobacion
- tiempo de generacion de exportaciones
- tasa de fallo de exportaciones

### Performance

Recomendaciones:

- indices por torneo, participante, fiscal, estado y fechas
- ranking materializado o precalculado
- paginacion en listados administrativos
- compresion y validacion de imagenes antes o durante upload segun definicion UX/infra

## PKG-006 Productizacion Operativa Y Pre-Release

### Ambientes y configuracion

Para `PKG-006` se cierra una estrategia de tres ambientes:

- `dev`
  - local o sandbox individual
  - `JWT_EXPIRES_IN=8h`
  - `TRUST_PROXY_HEADERS=false`
  - backup manual antes de migraciones o pruebas destructivas
- `staging`
  - entorno compartido para validar release
  - misma topologia logica que `prod`
  - `JWT_EXPIRES_IN=4h`
  - credenciales dedicadas de smoke
- `prod`
  - entorno de salida real controlada
  - secretos unicos por entorno
  - `ALLOW_BOOTSTRAP_ADMIN=false`
  - storage persistente obligatorio para media y exportaciones

Reglas cerradas:

- `dev`, `staging` y `prod` no comparten `DATABASE_URL`, `JWT_SECRET` ni `MEDIA_STORAGE_DIR`
- `APP_BASE_URL` siempre apunta al frontend
- `NEXT_PUBLIC_API_BASE_URL` define el backend consumido por frontend por entorno
- los secretos solo viven en runtime o secret store; no en archivos versionados

### Salud, smoke y diagnostico minimo

El backend debe exponer:

- `GET /api/v1/health/live`
  - chequea que el proceso este levantado
- `GET /api/v1/health/ready`
  - chequea Postgres
  - chequea acceso a `MEDIA_STORAGE_DIR`
  - devuelve `503` si una dependencia esencial no esta lista

Smoke obligatorio para `staging` y release candidato:

1. `GET /health/live`
2. `GET /health/ready`
3. `POST /auth/login` con cuenta administrativa de smoke
4. `GET /auth/me`
5. `GET /tournaments`

La evidencia del smoke debe salir de HTTP real contra instancia desplegada o equivalente, no solo de suites internas del proceso.

### Observabilidad minima

No se introduce stack externo obligatorio de monitoreo en este paquete. La base minima es:

- logs tecnicos estructurados
- `requestId` por request
- campos minimos `timestamp`, `level`, `requestId`, `method`, `path`, `statusCode`, `durationMs`
- para acciones autenticadas: `userId`, `role`, `module`, `event`
- errores de storage, base, auth y exportaciones distinguibles en logs

### Postura de sesion

`PKG-006` no migra la sesion actual de `JWT bearer` almacenado en `localStorage`.

Compensaciones aceptadas:

- expiracion mas corta en `staging/prod`
- secreto unico por entorno
- revalidacion server-side de cuenta activa y roles vigentes

Restriccion:

- esta postura se acepta para `pre-release` controlado y salida restringida
- una exposicion publica amplia con este mismo modelo queda fuera de `PKG-006` y requiere un paquete posterior de sesion con cookies `HttpOnly` y renovacion controlada

### Backups y rollback

Postura minima:

- `staging`
  - backup diario de base
  - snapshot diario de `MEDIA_STORAGE_DIR`
  - retencion `7` dias
- `prod`
  - backup diario de base
  - snapshot diario de `MEDIA_STORAGE_DIR`
  - retencion `30` dias

Reglas:

- base y archivos se respaldan en la misma ventana operativa
- no se acepta disco efimero para media/exportaciones en `staging/prod`
- antes del primer release a `prod` debe ejecutarse una restauracion de prueba
- la estrategia principal de rollback ante migracion aplicada es restaurar base + archivos + artefacto previo, no `down migrations` ad hoc

### Limites del paquete

Si entra en `PKG-006`:

- configuracion por entorno
- salud y readiness
- smoke HTTP real
- logging minimo
- backups/retencion

No entra en `PKG-006`:

- nuevas features
- rediseño de auth
- rate limiting distribuido
- HA multi-instancia o multi-region
- observabilidad enterprise
- eleccion obligatoria de proveedor cloud

## Estrategias Tecnicas Especificas

### Monolito modular vs multiples servicios

Se recomienda `monolito modular`.

No se recomienda separar en multiples servicios ahora porque:

- complejiza autenticacion, observabilidad y consistencia
- agrega costo operativo prematuro
- no aporta valor claro al MVP

### Estrategia backend para reglas de negocio y scoring

- reglas en capa de dominio/aplicacion del backend
- scoring implementado como servicio dedicado dentro del modulo `scoring-ranking`
- parametrizacion por torneo en base de datos
- frontend solo consume resultados y configuraciones

### Modelo de persistencia en Postgres

- modelo transaccional normalizado para entidades de negocio
- tablas auxiliares para tokens, auditoria, media y ranking materializado
- soft delete en entidades administrativas
- Prisma como ORM principal con posibilidad de consultas SQL encapsuladas para necesidades puntuales

### Almacenamiento de fotos/evidencia

- object storage para binario
- Postgres para metadata y referencias

### Estrategia de sincronizacion offline del MVP

- frontend mantiene cola local de capturas pendientes
- cada captura offline incluye identificador cliente, timestamps locales y estado
- backend recibe lote o item individual y resuelve idempotencia por identificador cliente + contexto
- conflictos complejos quedan fuera del MVP; se registra error visible para resolucion manual u operativa

### Ranking en vivo sin sobrediseñar

- recalculo backend al validar captura o al cambiar scoring
- persistencia de resultado de ranking
- frontend refresca por polling

### Auditoria y borrado logico

- auditoria en tabla dedicada
- soft delete en entidades administrativas
- capturas y validaciones no se eliminan fisicamente salvo politicas excepcionales fuera del MVP

### Estructura frontend Next.js

- App Router
- layouts por area funcional
- rutas separadas para:
  - acceso
  - administracion
  - fiscal/campo
  - ranking/reportes
- capa de fetch tipada y centralizada
- UI de captura optimizada mobile-first

### React Native como evolucion futura

- no recomendado para el MVP actual
- recomendable reevaluarlo luego de validar uso real en campo
- seria una buena opcion si el producto necesita offline mas profundo, mejor integracion nativa o distribucion por stores

### Preparacion para crecer

- modulos de dominio estables
- contratos versionables
- servicios de infraestructura abstraidos
- storage desacoplado de base
- ranking encapsulado en modulo propio

## Riesgos Y Tradeoffs

- el monolito modular simplifica hoy, pero exige disciplina para no mezclar dominio e infraestructura
- el offline acotado evita sobrediseño, pero no cubre escenarios de conflicto complejos
- polling para ranking reduce complejidad, pero no ofrece tiempo real estricto
- object storage agrega una dependencia mas, pero evita degradar la base con binarios pesados
- email obligatorio mejora seguridad operativa, pero agrega dependencia de entregabilidad

## Handoff Tecnico Por Especialidad

### Para `ux_ui_web_mobile`

- definir flujos y estados de:
  - activacion de cuenta
  - auto-registro pendiente
  - consulta publica de estado por token
  - aprobacion y rechazo administrativo
  - carga offline
  - sincronizacion
  - validacion/observacion/rechazo
- respetar separacion entre zona administrativa y zona operativa de fiscal

### Para `backend_web`

- implementar monolito modular en NestJS
- respetar modulos y limites definidos
- centralizar reglas de negocio y scoring en backend
- modelar auditoria y soft delete desde el inicio
- crear modulo `registrations` con persistencia, DTOs, controladores publico/admin y servicio de aprobacion
- reutilizar `participants`, `users-access`, `notifications` y `audit` sin duplicar logica de identidad
- materializar token opaco de consulta publica hasheado en base
- dejar validado que `PKG-002` no mete capturas, ranking ni offline

### Para `frontend_web`

- estructurar Next.js por areas funcionales
- implementar cliente API centralizado
- priorizar UX mobile-first en capturas
- soportar cola offline acotada solo para flujo de captura
- implementar `autoregistro`, `estado de inscripcion` y `admin/inscripciones` con los estados derivados definidos
- reutilizar el patron `toolbar + listado + panel de detalle/drawer` ya establecido en backoffice para la bandeja administrativa

### Para `devops_infra`

- preparar runtime para frontend, backend, Postgres, object storage y correo transaccional
- preparar configuracion para Prisma y ejecucion de migraciones
- definir configuracion por ambientes
- definir estrategia de logs y metricas

### Para `security_reviewer`

- revisar tokens, credenciales temporales, RBAC, acceso a evidencia y exposicion de endpoints
- revisar anti-enumeracion, rate limiting y fuga de datos en consulta publica de estado

### Para `testing`

- cubrir contratos de modulos, flujos de activacion, captura offline, scoring, ranking y auditoria
- cubrir auto-registro, consulta publica de estado, aprobacion, rechazo, duplicados y aprobacion con activacion de cuenta

## Referencias Tecnicas Requeridas Para Implementadores

- arquitectura de modulos y limites de dominio
- contratos de API y DTOs
- modelo de `Registration` por torneo y estados derivados
- reglas de scoring parametrizable
- politicas de soft delete y auditoria
- politicas de manejo de archivos
- criterio de uso de Prisma y consultas especiales
- flujo de identidad y validacion de email
- modelo de sincronizacion offline acotado
