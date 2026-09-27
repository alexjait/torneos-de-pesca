# Security Review

Owner recomendado: `security_reviewer`

## Resumen Ejecutivo

- paquete revisado: `PKG-001 Base administrativa y acceso`
- conclusion operativa final: `apto con observaciones`
- estado general:
  - las remediaciones de `backend_web` y `devops_infra` corrigen los hallazgos que antes impedian avanzar
  - no quedan hallazgos confirmados que obliguen a nueva remediacion antes de continuar con el flujo normal del proyecto
  - se mantienen observaciones de endurecimiento y riesgos aceptados por tratarse de un entorno local de desarrollo

## Findings

- `resolved` sanitizacion de respuestas con `user`
  - evidencia:
    - [participants.service.ts](../../backend/src/modules/participants/application/participants.service.ts) ya usa `safeUserSelect`
    - [officials.service.ts](../../backend/src/modules/officials/application/officials.service.ts) ya usa `safeUserSelect`
    - [safe-selects.ts](../../backend/src/common/prisma/safe-selects.ts) excluye `passwordHash`
  - conclusion:
    - resuelto

- `resolved` proteccion de `bootstrap-admin`
  - evidencia:
    - [auth.service.ts](../../backend/src/modules/auth/application/auth.service.ts) bloquea bootstrap salvo `ALLOW_BOOTSTRAP_ADMIN=true`
    - [env.validation.ts](../../backend/src/config/env.validation.ts) fuerza valor explicito y valida la variable
    - [backend/.env.example](../../backend/.env.example) deja `ALLOW_BOOTSTRAP_ADMIN="false"` por defecto
  - conclusion:
    - resuelto

- `resolved` desactivacion de cuentas asociadas en soft delete
  - evidencia:
    - [participants.service.ts](../../backend/src/modules/participants/application/participants.service.ts) invoca `disableUserAccess`
    - [officials.service.ts](../../backend/src/modules/officials/application/officials.service.ts) invoca `disableUserAccess`
    - [users-access.service.ts](../../backend/src/modules/users-access/application/users-access.service.ts) implementa `disableUserAccess`
  - conclusion:
    - resuelto

- `resolved` eliminacion del envio de passwords temporales por email
  - evidencia:
    - [notifications.service.ts](../../backend/src/modules/notifications/notifications.service.ts) ya no incluye `temporaryPassword` en el HTML
    - los correos indican seteo de password al activar cuenta
  - conclusion:
    - resuelto

- `resolved` ausencia de enumeracion obvia en `request-password-setup`
  - evidencia:
    - [auth.service.ts](../../backend/src/modules/auth/application/auth.service.ts) responde `requested: true`
    - [users-access.service.ts](../../backend/src/modules/users-access/application/users-access.service.ts) usa `findUserForPasswordSetup` y devuelve `null` si no existe
  - conclusion:
    - resuelto

- `resolved` eliminacion de fallbacks inseguros de JWT y validacion estricta de entorno
  - evidencia:
    - [auth.module.ts](../../backend/src/modules/auth/auth.module.ts) usa `getOrThrow('JWT_SECRET')`
    - [jwt.strategy.ts](../../backend/src/modules/auth/infrastructure/jwt.strategy.ts) usa `getOrThrow('JWT_SECRET')`
    - [app.module.ts](../../backend/src/app.module.ts) usa `validateEnv`
    - [env.validation.ts](../../backend/src/config/env.validation.ts) rechaza `local-dev-secret` y `change-me`
  - conclusion:
    - resuelto

- `resolved` saneamiento operativo de plantilla y entorno
  - evidencia:
    - [backend/.env.example](../../backend/.env.example) define variables obligatorias, opcionales y valores seguros por defecto
    - [devops-infra.md](../07-operacion/devops-infra.md) documenta uso, reglas y condicion de entorno
    - [.gitignore](../../.gitignore) cubre `.env` y logs
  - conclusion:
    - resuelto

- `low` rate limiting basico solo en memoria
  - evidencia:
    - [public-auth-rate-limit.guard.ts](../../backend/src/common/auth/public-auth-rate-limit.guard.ts) aplica limites por proceso y por IP/ruta
  - impacto:
    - suficiente para desarrollo y un monolito simple local, pero no es una defensa robusta para escalado horizontal o entornos distribuidos
  - owner recomendado: `backend_web` o `devops_infra` segun despliegue futuro
  - conclusion:
    - observacion no bloqueante

- `low` credenciales locales de desarrollo siguen existiendo en `backend/.env`
  - evidencia:
    - el usuario confirmo que `DATABASE_URL`, `JWT_SECRET` y `RESEND_API_KEY` actuales son solo de entorno local en su PC
    - el flujo actual ya los mantiene fuera de archivos versionables
  - impacto:
    - no constituye incidente productivo ni obliga rotacion inmediata, pero sigue siendo disciplina obligatoria mantenerlos fuera del repo y reemplazarlos antes de cualquier entorno compartido
  - owner recomendado: `devops_infra`
  - conclusion:
    - riesgo aceptado por contexto local de desarrollo

## Riesgos De Exposicion De Secretos

- no quedan secretos obligados a rotacion inmediata por incidente productivo segun la aclaracion del usuario sobre el caracter exclusivamente local del entorno
- si el proyecto sale de la PC local o pasa a un entorno compartido, deben reemplazarse:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `RESEND_API_KEY`

## Recomendaciones De Remediacion

- antes de cualquier entorno compartido o remoto:
  - generar un `JWT_SECRET` nuevo por entorno
  - usar nueva `DATABASE_URL` o nuevas credenciales
  - emitir nueva `RESEND_API_KEY`
- antes de escalar despliegue:
  - evaluar un rate limit distribuido o dependiente de infraestructura
- como mejora futura:
  - simplificar DTOs que todavia aceptan `temporaryPassword` aunque ya no se expone por email

## Riesgo Remanente

- el riesgo remanente actual es compatible con continuar el flujo normal del proyecto mientras el trabajo siga en entorno local controlado
- las observaciones abiertas no bloquean avanzar a la siguiente etapa funcional
- el principal cambio de criterio futuro aparece si el proyecto pasa a entorno compartido, staging remoto o produccion

## Referencias A Requerimientos O Paquetes

- `PKG-001 Base administrativa y acceso`
- RF-004 Cuentas, credenciales y validacion de email
- RF-005 Gestion de fiscales
- RNF-001 Seguridad, trazabilidad y auditoria

## PKG-002 Inscripcion y auto-registro

### Resumen Ejecutivo

- paquete revisado: `PKG-002 Inscripcion y auto-registro`
- conclusion operativa: `no apto para cierre sin remediaciones`
- validaciones ejecutadas:
  - inspeccion de codigo y contratos del slice
  - `backend/npm run lint`
  - `frontend/npm run lint`
- conclusion general:
  - no se observaron secretos hardcodeados ni fugas obvias de datos sensibles en los endpoints publicos revisados
  - `GET /api/v1/public/registrations/status/:lookupToken` usa token opaco de 32 bytes y hash SHA-256 en persistencia
  - `GET /api/v1/public/tournaments/registration-options` expone un set minimo de campos alineado al contrato
  - quedan hallazgos confirmados en revocacion de sesion privilegiada, antiabuso publico y consistencia de auditoria

### Findings

- `high` revocacion incompleta de usuarios autenticados permite seguir operando con JWT ya emitidos
  - areas afectadas:
    - autenticacion y autorizacion server-side
    - endpoints admin de `registrations` y `tournaments`
  - evidencia:
    - [jwt.strategy.ts](../../backend/src/modules/auth/infrastructure/jwt.strategy.ts) devuelve el payload del token sin reconsultar `User`, `accountStatus`, `deletedAt` ni roles vigentes
    - [auth.module.ts](../../backend/src/modules/auth/auth.module.ts) emite JWT con expiracion de hasta `8h`
    - [users-access.service.ts](../../backend/src/modules/users-access/application/users-access.service.ts) deshabilita cuentas con `accountStatus = DISABLED` y `deletedAt`, pero ese cambio no invalida tokens ya emitidos
    - [registrations.controller.ts](../../backend/src/modules/registrations/presentation/registrations.controller.ts) y [tournaments.controller.ts](../../backend/src/modules/tournaments/presentation/tournaments.controller.ts) confian en `JwtAuthGuard + RolesGuard`, que hoy operan sobre claims stale
  - impacto:
    - un admin deshabilitado o dado de baja puede seguir listando, aprobando o rechazando inscripciones y administrando torneos hasta que expire el JWT
    - la baja operativa y la revocacion de privilegios no son efectivas en tiempo real para acciones sensibles de `PKG-002`
  - remediacion recomendada:
    - en `JwtStrategy.validate` o en un guard posterior, revalidar el usuario contra base y rechazar cuentas `deletedAt != null` o `accountStatus != ACTIVE`
    - cargar roles vigentes desde persistencia o introducir versionado/revocacion de token para invalidar sesiones anteriores a cambios de estado/rol
    - cubrir regression de usuario deshabilitado con token aun vigente

- `medium` rate limiting publico evadible en endpoints de auto-registro y consulta de estado
  - areas afectadas:
    - `POST /api/v1/registrations/self-register`
    - `GET /api/v1/public/registrations/status/:lookupToken`
    - `GET /api/v1/public/tournaments/registration-options`
  - evidencia:
    - [public-auth-rate-limit.guard.ts](../../backend/src/common/auth/public-auth-rate-limit.guard.ts) arma la clave como `ip:method:path`; para `status/:lookupToken` cada token distinto genera un bucket nuevo
    - el mismo guard toma `x-forwarded-for` sin verificar proxy confiable, por lo que un cliente directo puede spoofear IP y resetear el limite
    - el handoff backend de `PKG-002` ya advertia que el control era solo en memoria, pero no cubria estas dos vias concretas de bypass
  - impacto:
    - el control antiabuso actual no limita de forma efectiva intentos distribuidos o spoofeados
    - facilita spam sobre auto-registro y reduce el valor del control anti-enumeracion/anti-bruteforce esperado para la consulta publica
    - la alta entropia del lookup token baja el riesgo practico de enumeracion masiva hoy, pero el hardening prometido por contrato no queda realmente cumplido
  - remediacion recomendada:
    - usar una clave de rate limit por ruta normalizada, no por path completo con token
    - no confiar en `x-forwarded-for` salvo detras de proxy explicitamente confiable
    - mover el rate limit a infraestructura o storage compartido antes de cualquier release no local
    - considerar un control antifraude adicional para `self-register` si el endpoint pasa a internet publica

- `low` auditoria de inscripciones no es atomica con las transiciones de negocio
  - areas afectadas:
    - `registration.created`
    - `registration.self_registered`
    - `registration.approved`
    - `registration.rejected`
    - `user.created` derivado de aprobacion
  - evidencia:
    - [registrations.service.ts](../../backend/src/modules/registrations/application/registrations.service.ts) persiste cambios de negocio y luego registra auditoria en llamadas separadas a `auditService.log`
    - en aprobacion, la transaccion serializable cierra antes del envio de email y antes de los eventos `user.created` y `registration.approved`
    - en rechazo y auto-registro, el registro de auditoria tambien ocurre despues de haber persistido el cambio principal
  - impacto:
    - ante fallo de base o error operacional entre commit y auditoria, puede quedar una aprobacion/rechazo/alta efectiva sin evidencia completa en `audit_logs`
    - para un flujo cuya trazabilidad es requisito explicito, la consistencia del rastro no queda garantizada
  - remediacion recomendada:
    - escribir auditoria dentro de la misma transaccion para eventos criticos o usar outbox transaccional con reproceso
    - agregar prueba de integridad que cubra la expectativa de trazabilidad minima del paquete

### Riesgos De Exposicion De Secretos

- no se observaron secretos hardcodeados en los archivos revisados del slice
- no se detecto exposicion publica de email, documento ni ids internos en `GET /api/v1/public/registrations/status/:lookupToken`
- el frontend revisado no persiste el `lookup_token` en almacenamiento compartido por defecto; lo usa para feedback inmediato y navegacion explicita del usuario

### Riesgo Remanente

- el riesgo remanente no es aceptable para declarar cerrado `PKG-002` mientras siga abierto el hallazgo de revocacion de JWT privilegiados
- el hallazgo de rate limiting puede aceptarse solo para entorno local controlado; no alcanza para una exposicion publica real del auto-registro
- queda un gap menor de consistencia UX/seguridad: [registration-pages.tsx](../../frontend/src/components/registration-pages.tsx) todavia sugiere al admin que el motivo de rechazo sera visible en la consulta publica, pero el backend ya no lo expone; hoy esto evita fuga, pero conviene alinear el copy para no inducir notas sensibles en un campo ambiguo

### Recomendaciones De Remediacion

- priorizar antes de cierre de `PKG-002`:
  - invalidacion efectiva de sesiones para usuarios deshabilitados o con roles cambiados
  - endurecimiento del rate limit publico con storage compartido o control de infraestructura
- priorizar antes de pasar a entorno compartido:
  - prueba integrada de aprobacion/rechazo con verificacion de auditoria
  - alineacion del copy administrativo sobre motivo de rechazo y visibilidad real
- mantener como control valido ya implementado:
  - token opaco hasheado para consulta publica
  - minimizacion de datos expuestos en endpoints publicos del slice

### Referencias A Requerimientos O Paquetes

- `PKG-002 Inscripcion y auto-registro`
- RF-003 Inscripcion y auto-registro
- RF-004 Cuentas, credenciales y validacion de email
- RNF-001 Seguridad, trazabilidad y auditoria

## PKG-002 Retest 2026-04-25

### Resumen Ejecutivo

- este retest reemplaza el criterio operativo anterior de `PKG-002` y deja vigente solo esta reevaluacion para cierre
- paquete revalidado: `PKG-002 Inscripcion y auto-registro`
- alcance puntual del retest:
  - [jwt.strategy.ts](../../backend/src/modules/auth/infrastructure/jwt.strategy.ts)
  - [users-access.service.ts](../../backend/src/modules/users-access/application/users-access.service.ts)
  - [current-user.decorator.ts](../../backend/src/common/auth/current-user.decorator.ts)
  - [public-auth-rate-limit.guard.ts](../../backend/src/common/auth/public-auth-rate-limit.guard.ts)
  - [env.validation.ts](../../backend/src/config/env.validation.ts)
  - [registration-pages.tsx](../../frontend/src/components/registration-pages.tsx)
  - [PKG-002](../05-ejecucion/paquetes/PKG-002-inscripcion-y-autoregistro.md)
- verificaciones ejecutadas:
  - `backend/npm run lint`
  - `frontend/npm run lint`
- conclusion operativa actual:
  - el `high` de JWT stale quedo mitigado dentro de la implementacion actual
  - el `medium` de rate limit publico evadible quedo mitigado dentro de la arquitectura actual de monolito simple / instancia unica
  - `PKG-002` pasa de `no apto para cierre sin remediaciones` a `apto con observaciones`

### Findings Vigentes

- `low` auditoria de inscripciones no es atomica con las transiciones de negocio
  - areas afectadas:
    - `registration.created`
    - `registration.self_registered`
    - `registration.approved`
    - `registration.rejected`
    - `user.created` derivado de aprobacion
  - evidencia:
    - [registrations.service.ts](../../backend/src/modules/registrations/application/registrations.service.ts) sigue persistiendo cambios y auditando en llamadas separadas
    - la aprobacion confirma el cambio dentro de transaccion serializable, pero `user.created`, envio de email y `registration.approved` ocurren despues del commit
    - `createAdmin`, `selfRegister` y `reject` tambien registran auditoria fuera de una transaccion compartida con el cambio principal
  - impacto:
    - un fallo operacional entre commit y `auditService.log` puede dejar transiciones efectivas sin rastro completo en `audit_logs`
    - el riesgo es de trazabilidad e investigacion posterior, no de escalacion directa de privilegios
  - remediacion recomendada:
    - mover la auditoria critica a la misma transaccion o usar outbox transaccional con reproceso
  - conclusion:
    - observacion vigente no bloqueante para el contexto actual

### Hallazgos Cerrados En Este Retest

- `resolved` JWT stale para usuarios deshabilitados o con roles cambiados
  - evidencia:
    - [jwt.strategy.ts](../../backend/src/modules/auth/infrastructure/jwt.strategy.ts) ahora reconsulta al usuario via `getUserForActiveSession`
    - [users-access.service.ts](../../backend/src/modules/users-access/application/users-access.service.ts) rechaza sesiones de usuarios `deletedAt != null` o `accountStatus != ACTIVE`
    - [current-user.decorator.ts](../../backend/src/common/auth/current-user.decorator.ts) expone el `request.user` recalculado por estrategia
  - conclusion:
    - la autorizacion ya no depende de claims stale para cuentas deshabilitadas o roles revocados

- `resolved` rate limit publico evadible por bucket dinamico y spoofing trivial de IP
  - evidencia:
    - [public-auth-rate-limit.guard.ts](../../backend/src/common/auth/public-auth-rate-limit.guard.ts) usa buckets normalizados para `status/:lookupToken` y `registration-options`
    - [public-auth-rate-limit.guard.ts](../../backend/src/common/auth/public-auth-rate-limit.guard.ts) solo toma `x-forwarded-for` cuando `TRUST_PROXY_HEADERS=true`
    - [env.validation.ts](../../backend/src/config/env.validation.ts) valida `TRUST_PROXY_HEADERS` y deja `false` por defecto
  - conclusion:
    - la via concreta de bypass reportada en la revision anterior ya no aplica en la arquitectura actual

### Riesgos De Exposicion De Secretos Y Configuracion

- no se observaron secretos hardcodeados en los archivos revalidados del slice
- no se detecto exposicion publica de `email`, `documentId` ni `rejection_reason` en `GET /api/v1/public/registrations/status/:lookupToken`
- la configuracion nueva de `TRUST_PROXY_HEADERS` reduce spoofing accidental en despliegues sin proxy confiable
- riesgo residual real:
  - el rate limit sigue siendo en memoria por proceso; es aceptable para el contexto actual, pero no debe considerarse control suficiente para despliegue distribuido o internet publica sin capa adicional de infraestructura

### Impacto En Release

- criterio actualizado de release para `PKG-002`:
  - `apto con observaciones` dentro de la arquitectura actual
- condicion de cambio de criterio:
  - si el slice pasa a entorno compartido, multiples instancias o exposicion publica real, el rate limit en memoria deja de ser suficiente y debe endurecerse antes de promover release

### Observaciones De Documentacion

- el registro histórico de PKG-002 fue consolidado en su paquete de ejecución durante la limpieza de publicación
- el drift documental no reabre riesgo de seguridad por sí mismo, pero conviene evitar supuestos falsos en futuras validaciones

## PKG-003 Revisión 2026-04-29

### Resumen Ejecutivo

- paquete revisado: `PKG-003 Operacion fiscal y capturas`
- alcance revisado:
  - modulo `captures`
  - lectura de media privada
  - cola offline
  - sincronizacion
  - validacion
  - rutas de fiscal
- verificaciones ejecutadas:
  - inspeccion de codigo y contratos del slice
  - `backend/npm run lint`
  - `frontend/npm run lint`
- conclusion operativa:
  - hay hallazgos bloqueantes de integridad temporal y control horario
  - no se observaron bypasses directos de auth en lectura de media dentro de la implementacion actual

### Findings

- `high` control horario e integridad temporal de capturas son evadibles
  - areas afectadas:
    - alta online
    - edicion pendiente
    - sync offline
    - trazabilidad temporal
  - evidencia:
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts) valida altas online contra `now`, pero luego acepta `dto.capturedAt` controlado por cliente
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts) permite cambiar `capturedAt` en edicion y vuelve a validar contra `now`, no contra el timestamp propuesto
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts) en sync solo verifica `capturedAt`, pero no bloquea `now > validationDeadlineAt`
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts) y [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts) dejan pasar operacion y validacion si faltan hitos horarios requeridos
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts) persiste `recordedAt` con `deviceRecordedAt` enviado por cliente, contradiciendo el contrato del slice
  - impacto:
    - un fiscal puede backdatear o alterar la hora efectiva de una captura online o editada
    - una captura offline puede entrar al sistema despues del deadline de sync previsto
    - la traza temporal deja de ser confiable para auditoria y resolucion operativa
  - remediacion recomendada:
    - en online fijar `capturedAt = recordedAt = now` server-side
    - en edicion no permitir mover `capturedAt` fuera de la politica cerrada o revalidarlo contra ventana de captura real
    - en sync exigir `now <= validationDeadlineAt` y persistir `recordedAt = now`, dejando `deviceRecordedAt` solo como dato auxiliar
    - bloquear carga, sync y validacion cuando falten `fishingStartAt`, `fishingEndAt` o `validationDeadlineAt`

- `medium` evidencia privada y token operativo quedan persistidos en storage web accesible al origen
  - areas afectadas:
    - cola offline del fiscal
    - sesion autenticada del frontend
  - evidencia:
    - [session.ts](../../frontend/src/lib/session.ts) guarda el `SessionPayload` completo en `localStorage`
    - [capture-queue.ts](../../frontend/src/lib/capture-queue.ts) guarda en `IndexedDB` el `CapturePayload` completo
    - [official-pages.tsx](../../frontend/src/components/official-pages.tsx) construye el payload offline con `photoDataUrl`, `participantId`, GPS y observaciones, y lo persiste via `saveQueuedCapture`
  - impacto:
    - cualquier XSS en el origen del frontend o compromiso local del perfil del navegador puede extraer token, evidencia fotografica, GPS y datos operativos pendientes de sync
    - el riesgo aumenta precisamente en el slice donde la evidencia es sensible y puede quedar acumulada por falta de conectividad
  - remediacion recomendada:
    - mover la sesion a cookie `HttpOnly` si la arquitectura lo permite o reducir al minimo el material sensible persistido en `localStorage`
    - persistir en la cola offline blobs minimizados y metadatos minimos, con politica explicita de expiracion y borrado al sincronizar
    - documentar este riesgo como aceptacion consciente si el MVP sigue con storage local legible por JS

- `low` idempotencia de capturas esta implementada con unicidad global y no por `tournamentId + officialId + clientCaptureId`
  - areas afectadas:
    - alta online
    - sync offline
    - estrategia anti-duplicados
  - evidencia:
    - [schema.prisma](../../backend/prisma/schema.prisma) define `clientCaptureId @unique`
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts) y [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts) resuelven duplicados solo por `clientCaptureId`
  - impacto:
    - una colision de `clientCaptureId` entre torneos o fiscales distintos produce falsos duplicados o `403`, rompiendo la semantica de idempotencia cerrada para el paquete
    - no vi una via sencilla de explotacion remota mas alla de colisiones o clientes defectuosos, por eso queda como `low`
  - remediacion recomendada:
    - cambiar la restriccion a unicidad compuesta por `tournamentId + officialId + clientCaptureId`
    - al detectar duplicado, responder con semantica consistente de idempotencia para ese ambito y no por clave global

### Riesgos De Exposicion De Secretos Y Configuracion

- no observe secretos hardcodeados en el modulo revisado
- la lectura de media queda detras de `JwtAuthGuard + RolesGuard` y control adicional de acceso a la captura
- riesgo residual real:
  - [captures.controller.ts](../../backend/src/modules/captures/presentation/captures.controller.ts) devuelve media privada por backend autenticado, pero la implementacion sigue en filesystem local (`uploads/`) y no en object storage privado como preveia la arquitectura; hoy no vi exposicion publica directa, pero sigue siendo una decision operativa sensible a despliegue

### Riesgo Remanente

- el paquete no esta listo para cierre seguro mientras siga abierto el hallazgo `high` de integridad temporal y control horario
- no vi un bypass directo de permisos para lectura autenticada de media en este repo
- quedan observaciones menores de hardening de storage local, idempotencia y validacion de datos

## PKG-003 Revision Focal 2026-04-29

### Resumen Ejecutivo

- alcance puntual revisado:
  - `backend/src/modules/captures`
  - media privada en filesystem local
  - auth/roles efectivos sobre capturas y evidencia
  - `frontend /operacion`
  - cola offline y persistencia local
- verificaciones ejecutadas:
  - inspeccion focal de codigo y artefactos locales del slice
  - no se ejecutaron pruebas automatizadas en esta pasada
- conclusion operativa:
  - `PKG-003` sigue `no apto para cierre` por un bloqueo confirmado en integridad temporal y control horario
  - ademas quedan hallazgos vigentes de sobreexposicion intra-torneo, validacion insuficiente de `data:` URLs y retencion local sensible

### Findings

- `high` integridad temporal y ventanas horarias siguen siendo manipulables desde cliente
  - areas afectadas:
    - alta online
    - edicion pendiente
    - sync offline
    - trazabilidad temporal
  - evidencia:
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:233) acepta `dto.capturedAt` en alta online aunque el contrato pedia `capturedAt = recordedAt = now` server-side
    - [create-capture.dto.ts](../../backend/src/modules/captures/dto/create-capture.dto.ts:35) sigue exponiendo `capturedAt` como input opcional del cliente
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:330) permite mover `capturedAt` en edicion de capturas pendientes
    - [update-capture.dto.ts](../../backend/src/modules/captures/dto/update-capture.dto.ts:32) expone el mismo campo en update
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:427) persiste `recordedAt` desde `deviceRecordedAt` enviado por cliente en sync offline
  - impacto:
    - un fiscal puede backdatear o alterar timestamps operativos y erosionar la evidencia auditable del torneo
    - el sistema deja de garantizar el control horario cerrado por `RF-006`, `RF-009` y `PKG-003`
  - remediacion recomendada:
    - fijar `capturedAt` y `recordedAt` server-side en alta online
    - tratar `deviceRecordedAt` solo como dato auxiliar y persistir `recordedAt = now` al sincronizar
    - bloquear cambios de `capturedAt` salvo una politica explicitamente cerrada y revalidada server-side

- `medium` cualquier fiscal asignado al torneo puede leer evidencia y PII operativa de todo el torneo, sin scope minimo
  - areas afectadas:
    - `GET /captures/context`
    - `GET /captures`
    - `GET /captures/:id`
    - `GET /captures/media/:mediaId`
  - evidencia:
    - [captures.controller.ts](../../backend/src/modules/captures/presentation/captures.controller.ts:30), [captures.controller.ts](../../backend/src/modules/captures/presentation/captures.controller.ts:48) y [captures.controller.ts](../../backend/src/modules/captures/presentation/captures.controller.ts:54) habilitan lectura de contexto, listados y detalle para cualquier `OFFICIAL`
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:161) no implementa `scope=MINE|PENDING_VALIDATION|ALL`; un fiscal asignado obtiene todas las capturas del torneo
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:682) considera autorizada a cualquier cuenta `OFFICIAL` asignada al torneo para acceder a evidencia de terceros
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:835) serializa `documentId`, `phone` y `user` del participante hacia frontend
    - [safe-selects.ts](../../backend/src/common/prisma/safe-selects.ts:3) incluye `email`, `accountStatus`, `deletedAt` y `deletedBy` dentro de una seleccion reutilizada en este flujo
  - impacto:
    - aumenta innecesariamente la exposicion de evidencia fotografica y datos personales entre fiscales del mismo torneo
    - rompe el criterio de minimizacion esperado para la cache operativa minima del slice
  - remediacion recomendada:
    - reintroducir scopes explicitos de lectura y limitar por defecto a `MINE` o `PENDING_VALIDATION`
    - devolver en `context` y `captures` solo el snapshot minimo operativo necesario para campo/validacion

- `medium` la validacion de imagenes y `data:` URLs es insuficiente y permite almacenar contenido arbitrario con MIME controlado por cliente
  - areas afectadas:
    - alta online
    - edicion de evidencia
    - sync offline
    - lectura de media privada
  - evidencia:
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:756) acepta cualquier `mimeType` que empiece por `image/`, incluyendo tipos no cerrados por el paquete, y no valida magic bytes reales
    - [captures.controller.ts](../../backend/src/modules/captures/presentation/captures.controller.ts:43) devuelve la evidencia con `Content-Type` tomado de metadata persistida y en modo inline
    - [api.ts](../../frontend/src/lib/api.ts:157) y [official-pages.tsx](../../frontend/src/components/official-pages.tsx:100) envian la foto como `dataUrl` JSON completo en vez de `multipart/form-data`
  - impacto:
    - un usuario autenticado puede subir binarios o formatos activos disfrazados de imagen y hacer que el backend los sirva con el MIME elegido por el atacante
    - se agranda la superficie de fuga por logs, proxies o tooling que capture cuerpos JSON completos con base64
  - remediacion recomendada:
    - restringir tipos a una allowlist cerrada (`image/jpeg`, `image/png`, `image/webp`)
    - validar firma/binario real del archivo antes de persistir
    - servir evidencia con `X-Content-Type-Options: nosniff` y preferentemente `Content-Disposition: attachment` si no se necesita inline

- `medium` la evidencia offline y el token operativo quedan persistidos en storage legible por JS, y la cola ni siquiera cumple el contrato de sync
  - areas afectadas:
    - sesion autenticada del fiscal
    - cola offline
    - retencion local de evidencia
  - evidencia:
    - [session.ts](../../frontend/src/lib/session.ts:24) persiste `accessToken` en `localStorage`
    - [capture-queue.ts](../../frontend/src/lib/capture-queue.ts:9) guarda todo `CapturePayload` en `IndexedDB`, incluido `dataUrl` con foto, GPS y observaciones
    - [official-pages.tsx](../../frontend/src/components/official-pages.tsx:471) guarda la captura offline completa tras serializar la foto a `dataUrl`
    - [api.ts](../../frontend/src/lib/api.ts:163) define `CapturePayload` sin `deviceRecordedAt`
    - [api.ts](../../frontend/src/lib/api.ts:544) tipa `syncCaptures` como `{ items: CapturePayload[] }`
    - [sync-captures.dto.ts](../../backend/src/modules/captures/dto/sync-captures.dto.ts:37) exige `capturedAt` y `deviceRecordedAt` en backend
  - impacto:
    - cualquier XSS en el origen del frontend o acceso local al perfil del navegador puede exfiltrar token, fotos, GPS y observaciones
    - un fallo de contrato en sync puede dejar evidencia privada retenida localmente mucho mas tiempo del previsto
  - remediacion recomendada:
    - mover la sesion a cookie `HttpOnly` o reducir al minimo el material persistido del lado cliente
    - guardar blobs/minimos metadatos, con expiracion y borrado garantizado tras sync
    - alinear de inmediato el contrato de cola offline con `capturedAt` y `deviceRecordedAt`

- `low` la idempotencia real sigue siendo global por `clientCaptureId` y no por el ambito cerrado del paquete
  - areas afectadas:
    - alta online
    - sync offline
    - reintentos de cliente
  - evidencia:
    - [schema.prisma](../../backend/prisma/schema.prisma:291) declara `clientCaptureId @unique` global
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:217) y [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:392) buscan duplicados solo por `clientCaptureId`
  - impacto:
    - colisiones entre torneos o fiscales distintos pueden romper la semantica de idempotencia esperada y generar falsos duplicados o respuestas `403`
  - remediacion recomendada:
    - cambiar a unicidad compuesta por `tournamentId + officialId + clientCaptureId`

- `low` el filesystem local de evidencia sigue siendo facil de filtrar o commitear por accidente
  - areas afectadas:
    - `backend/uploads`
    - higiene del repo y de estaciones locales
  - evidencia:
    - existen archivos de evidencia reales en `backend/uploads/captures/...` dentro del workspace
    - [.gitignore](../../.gitignore) no excluye `backend/uploads/`
  - impacto:
    - un descuido operacional puede terminar exponiendo evidencia real en commits, backups o sincronizaciones del puesto local
  - remediacion recomendada:
    - excluir `backend/uploads/` del repo
    - mover la evidencia a storage privado externo o a un path operativo fuera del arbol de codigo

### Riesgos De Exposicion De Secretos Y Configuracion

- no observe secretos hardcodeados nuevos en el slice revisado
- el riesgo dominante del alcance no es secreto en codigo sino:
  - exposicion de `accessToken` por `localStorage`
  - retencion local de evidencia y GPS en `IndexedDB`
  - persistencia de evidencia en filesystem local no ignorado

### Riesgo Remanente

- el release de `PKG-003` no deberia cerrarse mientras siga abierto el hallazgo `high` de integridad temporal y ventanas horarias
- aun resolviendo ese `high`, quedarian observaciones relevantes de minimizacion de datos, validacion de imagenes y storage local
- no confirme un bypass inter-torneo directo para lectura de media autenticada; el problema real actual es la sobreexposicion dentro del mismo torneo y la retencion local sensible

## PKG-003 Cierre Focal 2026-04-29

### Resumen Ejecutivo

- paquete revalidado: `PKG-003 Operacion fiscal y capturas`
- conclusion operativa actual: `apto con observaciones`
- remediaciones confirmadas:
  - alta online ya no acepta `capturedAt` del cliente
  - edicion ya no expone ni mueve `capturedAt`
  - sync offline exige `validationDeadlineAt` y `now <= validationDeadlineAt`
  - idempotencia efectiva por `tournamentId + officialId + clientCaptureId`
  - intentos bloqueados por horario registran `capture.blocked_by_schedule`
  - media limitada a `image/png`, `image/jpeg` y `image/webp` con validacion basica de firma
  - `backend/uploads/` queda fuera del repo
- evidencia adicional:
  - smoke real sobre backend estable con dos fiscales, alta online aceptada, colision valida por fiscal distinto y bloqueo correcto sobre torneo sin deadline

### Findings Vigentes

- `medium` la evidencia offline y el token operativo siguen persistidos en storage legible por JS
  - impacto:
    - un XSS en el origen del frontend seguiria pudiendo leer token de sesion, foto, GPS y observaciones pendientes
  - conclusion:
    - riesgo aceptado para este MVP web responsive con offline acotado; no bloquea cierre local

- `medium` la evidencia privada sigue almacenada en filesystem local del backend
  - impacto:
    - suficiente para entorno local o instancia unica, pero no es la opcion final para despliegue compartido o productivo
  - conclusion:
    - observacion operativa no bloqueante

- `low` cualquier fiscal asignado al torneo sigue pudiendo leer capturas del torneo completo
  - impacto:
    - hay mas exposicion intra-torneo que la minima posible
  - conclusion:
    - no vi bypass inter-torneo ni exposicion publica; queda como hardening futuro

### Riesgo Remanente

- el slice queda razonable para continuar el proyecto y dar por cerrado `PKG-003`
- si mas adelante hay despliegue compartido o necesidad de endurecimiento mayor, los siguientes pasos naturales son:
  - mover sesion a cookie `HttpOnly`
  - reducir o cifrar evidencia offline local
  - migrar media a storage privado dedicado
  - minimizar aun mas el scope de lectura entre fiscales

## PKG-004 Revision 2026-04-30

### Resumen Ejecutivo

- paquete revisado: `PKG-004 Scoring, ranking y reportes basicos`
- alcance revisado:
  - `backend/src/modules/scoring-ranking/**`
  - `backend/src/modules/reports-exports/**`
  - `backend/src/modules/tournaments/**` para cierre y scoring
  - `frontend/src/components/scoring-reporting-pages.tsx`
  - `frontend/src/lib/api.ts`
  - `frontend/src/lib/session.ts`
  - contratos y handoffs del slice
- verificaciones ejecutadas:
  - inspeccion de codigo y documentos del slice
  - `backend/npm run lint`
  - `backend/npm run test:pkg004`
  - `frontend/npm run lint`
- controles confirmados:
  - scoring y ajustes manuales quedan restringidos a `ADMIN` por `JwtAuthGuard + RolesGuard`
  - lectura de ranking aplica control server-side adicional de pertenencia real al torneo para `OFFICIAL` y `PARTICIPANT`
  - reportes y exportaciones quedan restringidos a `ADMIN`
  - las exportaciones se guardan en storage privado del backend y la descarga ocurre por endpoint autenticado, no por URL publica permanente
  - no observe exposicion de media, `documentId`, secretos o credenciales dentro de reportes/exportaciones del slice
- conclusion operativa:
  - no vi bypass directo de auth en scoring, ranking, reportes o descarga autenticada
  - si hay hallazgos de integridad y trazabilidad que conviene mantener visibles antes de declarar cerrado el slice
  - criterio actual: `apto con observaciones`

### Findings

- `medium` un torneo cerrado sigue admitiendo cambios de scoring y penalizaciones que reescriben el snapshot `LIVE`
  - areas afectadas:
    - integridad post-cierre del resultado competitivo
    - consistencia entre ranking en vivo, ranking final y exportaciones posteriores al cierre
  - evidencia:
    - [tournaments.service.ts](../../backend/src/modules/tournaments/application/tournaments.service.ts:111) cierra el torneo recien despues de congelar `FINAL`
    - [tournaments.service.ts](../../backend/src/modules/tournaments/application/tournaments.service.ts:174) sigue delegando `PATCH /tournaments/{id}/scoring` sin validar estado `CLOSED`
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:138) permite crear ajustes manuales sobre cualquier torneo existente
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:184) permite revocar ajustes sin validar estado del torneo
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:556) solo exige que el torneo exista y no este borrado
    - [reports-exports.service.ts](../../backend/src/modules/reports-exports/application/reports-exports.service.ts:329) sigue exportando `LIVE_RANKING` desde el ultimo snapshot live disponible
  - impacto:
    - un `ADMIN` o una sesion administrativa comprometida puede alterar el ranking live y emitir exportaciones live distintas despues del cierre oficial
    - aunque `FINAL` no se reescribe, el sistema queda habilitado para generar artefactos post-cierre potencialmente contradictorios con el resultado oficial ya congelado
  - remediacion recomendada:
    - bloquear cambios de scoring y ajustes manuales cuando `tournament.status = CLOSED`
    - decidir explicitamente si un torneo cerrado debe seguir exponiendo `LIVE_RANKING`; si no, responder `409` o redirigir operativamente a `FINAL`
    - cubrir regression con prueba integrada de post-cierre para scoring, ajustes y exportaciones

- `low` la auditoria de scoring, ajustes, cierre y exportaciones no es atomica con la mutacion sensible ni con la descarga efectiva
  - areas afectadas:
    - `scoring.config_updated`
    - `scoring.adjustment_created`
    - `scoring.adjustment_revoked`
    - `ranking.finalized`
    - `report.export_generated`
    - `report.export_downloaded`
  - evidencia:
    - [audit.service.ts](../../backend/src/common/audit/audit.service.ts:19) escribe auditoria en una operacion separada y sin transaccion compartida
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:67), [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:154), [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:206) y [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:334) persisten primero el cambio de negocio y auditan despues
    - [reports-exports.service.ts](../../backend/src/modules/reports-exports/application/reports-exports.service.ts:191) crea `ExportRecord` y luego registra `report.export_generated`
    - [reports-exports.service.ts](../../backend/src/modules/reports-exports/application/reports-exports.service.ts:290) registra `report.export_downloaded` antes de que [reports-exports.controller.ts](../../backend/src/modules/reports-exports/presentation/reports-exports.controller.ts:84) termine de enviar el archivo
  - impacto:
    - un fallo entre el commit principal y `auditService.log` puede dejar cambios efectivos de scoring o exportacion sin rastro completo
    - la descarga puede quedar auditada como exitosa aunque el `sendFile` falle despues
    - para un slice cuyo objetivo es resultado oficial auditable, esto erosiona confianza forense mas que confidencialidad directa
  - remediacion recomendada:
    - mover los eventos criticos a la misma transaccion o usar outbox transaccional con reproceso
    - separar evento `download_requested` de `download_completed`, o registrar exito solo cuando el envio termine correctamente

### Riesgos De Exposicion De Secretos Y Configuracion

- no observe secretos hardcodeados nuevos en los archivos revisados de `PKG-004`
- la descarga autenticada de exportaciones cumple el contrato de no exponer URL publica permanente
- riesgo residual heredado:
  - [session.ts](../../frontend/src/lib/session.ts:24) sigue guardando el `accessToken` en `localStorage`, por lo que la descarga autenticada hereda el riesgo de exfiltracion ante `XSS` ya aceptado en revisiones previas

### Minimización De Datos Y Exposicion De Reportes

- los reportes del slice no exponen media fotografica ni referencias directas a archivos privados
- `ranking` devuelve solo metricas competitivas y metadata de snapshot
- los reportes administrativos quedan bien acotados a `ADMIN`, pero el de inscriptos incluye `applicantEmail` y `applicantPhone`; en el modelo actual de admin global esto es coherente con el contrato, aunque conviene mantenerlo asi de acotado y no ampliarlo por defecto

### Riesgo Remanente

- el riesgo remanente principal es de integridad post-cierre y de trazabilidad, no de bypass directo de auth
- no se ejecutaron pruebas HTTP/integracion completas sobre descarga autenticada y restricciones de post-cierre; la confianza actual sale de inspeccion de codigo y checks de slice
- si el producto va a usar `FINAL` como unica salida valida despues del cierre, conviene endurecer eso en backend antes de considerar `PKG-004` realmente cerrado

### Impacto En Release

- criterio actual de release para `PKG-004`:
  - `apto con observaciones`
- condicion que puede cambiar el criterio:
  - si negocio o testing requieren que despues del cierre no exista ninguna salida live mutable, el hallazgo `medium` debe remediarse antes del cierre operativo del paquete

## PKG-004 Retest Focal 2026-04-30

### Resumen Ejecutivo

- alcance puntual del retest:
  - fix backend que devuelve `409` para scoring y ajustes sobre torneos `CLOSED`
  - reevaluacion del hallazgo `medium` de integridad post-cierre
- verificaciones ejecutadas:
  - inspeccion focal de [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts)
  - inspeccion cruzada de [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts)
  - `backend/npm run lint`
  - `backend/npm run test:pkg004`
- conclusion operativa:
  - el fix cierra correctamente la via original de scoring y ajustes manuales sobre torneos cerrados
  - el hallazgo `medium` no puede marcarse como `resolved` todavia porque el mismo riesgo de `LIVE` mutable post-cierre sigue entrando por validaciones de capturas en torneo `CLOSED`
  - el slice puede seguir en `apto con observaciones`; no veo un bloqueo nuevo de release solo por este retest puntual

### Reevaluacion Del Hallazgo `medium`

- `resolved` para la via original de scoring y ajustes manuales
  - evidencia:
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:65) valida torneo y llama `assertTournamentMutable`
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:144) aplica el mismo guard antes de crear ajustes
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:193) aplica el mismo guard antes de revocar ajustes
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:703) devuelve `ConflictException` cuando `status === CLOSED`
  - conclusion:
    - ya no veo la via reportada originalmente para reescribir `LIVE` mediante scoring o penalizaciones en torneos cerrados

- `medium` riesgo residual: una captura pendiente todavia puede validarse con el torneo `CLOSED`, mutando el ranking `LIVE` despues del cierre
  - evidencia:
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:518) `approve/observe/reject` siguen entrando por `resolveValidation`
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:544) la validacion solo chequea `assertValidationWindow`
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:788) `assertValidationWindow` no valida `tournament.status`
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:590) una validacion exitosa vuelve a llamar `markTournamentPendingRecalculation`
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:736) el chequeo `status === ACTIVE` existe para carga online, no para validacion
  - impacto:
    - si el torneo se cierra mientras todavia existen capturas `PENDING_VALIDATION` y la ventana de validacion sigue abierta, un actor autorizado puede seguir cambiando el `LIVE`
    - eso mantiene posible la divergencia entre `FINAL` ya congelado y artefactos live posteriores al cierre
  - remediacion recomendada:
    - bloquear validaciones cuando `tournament.status !== ACTIVE`
    - o impedir el cierre mientras existan capturas pendientes o la ventana de validacion siga abierta
  - conclusion:
    - el problema ya no esta en scoring/ajustes, pero la integridad post-cierre sigue incompleta

## PKG-004 Retest Final 2026-04-30

### Resumen Ejecutivo

- alcance puntual del retest final:
  - bloqueo de `close()` cuando existan capturas `PENDING_VALIDATION`
  - bloqueo de `approve/observe/reject` cuando el torneo ya esta `CLOSED`
- verificaciones ejecutadas:
  - inspeccion focal de [tournaments.service.ts](../../backend/src/modules/tournaments/application/tournaments.service.ts)
  - inspeccion focal de [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts)
  - `backend/npm run lint`
- conclusion operativa:
  - el riesgo `medium` de `LIVE` mutable post-cierre queda resuelto con estas remediaciones
  - no veo una via relevante restante dentro del mismo riesgo revisado
  - `PKG-004` puede quedar `apto con observaciones`

### Cierre Del Hallazgo `medium`

- `resolved` integridad post-cierre de `LIVE` frente a scoring, ajustes, cierre con pendientes y validaciones posteriores
  - evidencia:
    - [tournaments.service.ts](../../backend/src/modules/tournaments/application/tournaments.service.ts:117) cuenta capturas `PENDING_VALIDATION` antes de cerrar
    - [tournaments.service.ts](../../backend/src/modules/tournaments/application/tournaments.service.ts:123) devuelve `409` si quedan pendientes
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:543) bloquea `approve/observe/reject` cuando el torneo ya esta `CLOSED`
    - [captures.service.ts](../../backend/src/modules/captures/application/captures.service.ts:596) el recalculo posterior ya no puede dispararse desde validaciones en torneo cerrado
  - conclusion:
    - el circuito post-cierre ya no admite la mutacion relevante que mantenia abierto el hallazgo `medium`

## PKG-005 Revision 2026-05-02

### Resumen Ejecutivo

- paquete revisado: `PKG-005 Hardening y release readiness del MVP`
- alcance revisado:
  - auditoria transaccional de `registrations`, `scoring-ranking`, `tournaments` y `reports-exports`
  - hardening de headers en `GET /exports/{id}/download` y `GET /captures/media/{mediaId}`
  - valor real del nuevo `backend/npm run test:smoke` como gate minimo de release
- verificaciones ejecutadas:
  - inspeccion de codigo y diff de `PKG-005`
  - `backend/npm run lint`
  - `backend/npm run build`
  - `backend/npm run test:smoke`
  - `backend/npm run test:pkg004`
  - `frontend/npm run lint`
  - `frontend/npm run build`
- controles confirmados:
  - `AuditService` ahora permite escribir sobre `Prisma.TransactionClient`
  - las mutaciones criticas pedidas por el paquete ya registran auditoria dentro de la misma transaccion del cambio principal
  - `reports-exports` persiste y audita consistentemente estados `READY` y `FAILED`
  - descargas autenticadas de exportaciones y media privada ya responden `X-Content-Type-Options: nosniff` y `Cache-Control: private, no-store`
  - la media privada sigue limitada a `image/jpeg`, `image/png` y `image/webp` con validacion basica de firma; no vi regresion a tipos activos
- conclusion operativa:
  - `PKG-005` mejora de forma real la trazabilidad y el hardening minimo de file serving
  - no observe secretos hardcodeados nuevos ni una regresion de credenciales/configuracion dentro del alcance revisado
  - queda un gap relevante de integridad transaccional en el cierre de torneo y un gap menor de calidad de evidencia en el smoke
  - criterio actual: `apto con observaciones`

### Findings

- `medium` el cierre de torneo sigue partido en dos commits y puede dejar un `FINAL` oficial persistido sin cerrar el torneo
  - areas afectadas:
    - `tournaments`
    - `scoring-ranking`
    - integridad del resultado oficial y de la trazabilidad de cierre
  - evidencia:
    - [tournaments.service.ts](../../backend/src/modules/tournaments/application/tournaments.service.ts:129) llama `finalizeTournamentRanking()` antes de abrir la transaccion que marca `status = CLOSED`
    - [tournaments.service.ts](../../backend/src/modules/tournaments/application/tournaments.service.ts:131) recien despues persiste `tournament.closed` junto al cambio de estado
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:347) materializa `FINAL` y `finalVersion` en una transaccion separada
    - [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:145) y [scoring-ranking.service.ts](../../backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:198) solo bloquean cambios posteriores cuando `tournament.status === CLOSED`
  - impacto:
    - si el segundo commit falla luego de materializar `FINAL`, el torneo queda `ACTIVE` pero ya con ranking final oficial persistido
    - en ese estado anomalo un `ADMIN` todavia puede mutar scoring o ajustes manuales porque el guard de mutabilidad depende del `status`, no de `finalVersion`
    - el sistema puede quedar con resultado oficial congelado, torneo formalmente abierto y trazabilidad de cierre incompleta
  - remediacion recomendada:
    - mover el chequeo de pendientes, la finalizacion de ranking y el cambio de `status = CLOSED` al mismo limite transaccional
    - si se mantiene el split actual, agregar recuperacion explicita para el caso `finalVersion != null && status != CLOSED` y bloquear scoring/ajustes tambien por `finalVersion`

- `low` el nuevo `test:smoke` ya no es decorativo, pero sigue siendo una evidencia debil como gate de hardening
  - areas afectadas:
    - release readiness local
    - deteccion temprana de regresiones en auditoria transaccional y file serving
  - evidencia:
    - [pkg005.smoke.test.ts](../../backend/tests/pkg005.smoke.test.ts:49) usa `createAuditAwareTransaction(...)` y dobles en memoria en lugar de un cliente Prisma real
    - [pkg005.smoke.test.ts](../../backend/tests/pkg005.smoke.test.ts:369) y [pkg005.smoke.test.ts](../../backend/tests/pkg005.smoke.test.ts:417) reemplazan `buildExportDataset` por monkeypatch y fuerzan ramas internas sin wiring real de reportes
    - [pkg005.smoke.test.ts](../../backend/tests/pkg005.smoke.test.ts:453) y [pkg005.smoke.test.ts](../../backend/tests/pkg005.smoke.test.ts:473) validan headers con controladores y `Response` dobles, no por HTTP real
  - impacto:
    - una regresion en el wiring real de Prisma, en los limites transaccionales efectivos o en el serving HTTP puede seguir pasando el smoke
    - el gate aporta valor como sanidad rapida de clases y contratos internos, pero no como evidencia fuerte de release sobre los riesgos exactos que `PKG-005` prometia cerrar
  - remediacion recomendada:
    - mantener este smoke como suite barata, pero sumar al menos una prueba de integracion corta que use Prisma real y/o request HTTP real para:
      - una transicion de `registrations` con auditoria persistida
      - un `createExport` `READY/FAILED`
      - verificacion real de headers en `download` o `media`

### Riesgos De Exposicion De Secretos Y Configuracion

- no observe secretos hardcodeados nuevos en los cambios de `PKG-005`
- no vi nueva exposicion de credenciales, tokens o rutas privadas en controladores de media/exportaciones
- los riesgos aceptados previos del proyecto permanecen vigentes pero no se reabren en esta revision:
  - sesion en `localStorage`
  - cola offline en `IndexedDB`
  - rate limiting en memoria por proceso

### Riesgo Remanente

- el riesgo remanente principal ya no esta en headers ni en la ausencia total de auditoria transaccional, sino en la consistencia del cierre final del torneo ante fallos entre commits
- el smoke nuevo mejora el baseline de release, pero todavia no reemplaza una evidencia de integracion minima sobre los puntos endurecidos
- para el contexto actual de MVP local/instancia unica, el paquete puede seguir como `apto con observaciones`
- para declarar `release readiness` fuerte del hardening de `PKG-005`, convendria cerrar el hallazgo `medium`

### Impacto En Release

- criterio actual de release para `PKG-005`:
  - `apto con observaciones`
- condicion que cambia el criterio:
  - si el equipo quiere considerar `PKG-005` como cierre completo de hardening y readiness del MVP, el split transaccional de `close()` deberia remediarse antes
- evidencia tecnica de esta pasada:
  - `backend/npm run lint`: ok
  - `backend/npm run build`: ok
  - `backend/npm run test:smoke`: ok
  - `backend/npm run test:pkg004`: ok
  - `frontend/npm run lint`: ok
  - `frontend/npm run build`: ok

### Referencias A Requerimientos O Paquetes

- `PKG-005 Hardening y release readiness del MVP`
- RNF-001 Seguridad, trazabilidad y auditoria
- RNF-002 Usabilidad, rendimiento y continuidad operativa

## PKG-006 Revision 2026-05-28

### Resumen Ejecutivo

- paquete revisado: `PKG-006 Productizacion operativa y pre-release`
- alcance revisado:
  - `backend/src/modules/health/**`
  - `backend/src/common/http/request-logging.middleware.ts`
  - `backend/src/main.ts`
  - plantillas de entorno y smoke operativo del paquete
- verificaciones ejecutadas:
  - inspeccion de codigo y documentos del slice
  - evidencia de `testing` sobre smoke real local en verde
- controles confirmados:
  - `GET /api/v1/health/live` y `GET /api/v1/health/ready` responden payload minimo
  - `health/ready` no expone detalles de `db`, rutas ni configuracion sensible al cliente
  - `X-Request-Id` queda disponible para trazabilidad server/client
  - `TRUST_PROXY_HEADERS` sigue opt-in y `false` por defecto
  - plantillas de entorno separan `dev`, `staging` y `prod` sin versionar secretos reales
- conclusion operativa:
  - no veo hallazgos bloqueantes para el alcance aprobado de `PKG-006`
  - el paquete queda `apto con observaciones`

### Findings

- `low` `health/ready` no es read-only: escribe un archivo temporal en `MEDIA_STORAGE_DIR` en cada request
  - areas afectadas:
    - superficie publica operativa
    - storage local/persistente
  - evidencia:
    - [health.service.ts](../../backend/src/modules/health/application/health.service.ts) ejecuta `mkdir`, `writeFile` y `unlink` por cada `GET /api/v1/health/ready`
    - el endpoint es publico y sin autenticacion por contrato operativo
  - impacto:
    - introduce I/O evitable sobre disco en cada probe
    - un monitoreo agresivo o abuso externo puede amplificar carga sobre el volumen de media
    - el healthcheck deja de ser estrictamente observacional y pasa a mutar storage
  - remediacion recomendada:
    - preferir una verificacion read-only cuando el volumen ya existe
    - si se necesita confirmar escritura, mover esa prueba a startup, job interno o chequeo con cache/TTL
  - conclusion:
    - observacion no bloqueante para `pre-release` controlado

- `low` `X-Request-Id` confia y ecoa sin normalizacion un valor totalmente controlado por cliente
  - areas afectadas:
    - logging estructurado
    - trazabilidad operativa
  - evidencia:
    - [request-logging.middleware.ts](../../backend/src/common/http/request-logging.middleware.ts) toma `req.header('x-request-id')?.trim()` y lo reutiliza en logs y respuesta
    - no hay limite explicito de longitud ni charset permitido
  - impacto:
    - facilita ruido operacional con IDs arbitrariamente largos o poco consistentes
    - no vi inyeccion directa por el uso de `JSON.stringify`, pero si una superficie innecesariamente flexible para observabilidad
  - remediacion recomendada:
    - aceptar solo un charset/largo acotado y generar uno nuevo si el valor entrante no cumple
    - documentar largo maximo si se quiere preservar correlacion externa
  - conclusion:
    - observacion no bloqueante

### Riesgos Heredados Relevantes

- la sesion sigue basada en `JWT bearer` persistido en `localStorage`; aceptado por alcance de `PKG-006`
- el rate limiting de auth/publico sigue en memoria por proceso; aceptado para instancia unica/local
- `TRUST_PROXY_HEADERS=true` sigue siendo una configuracion sensible y debe usarse solo detras de proxy controlado

### Riesgo Remanente

- el riesgo remanente principal del paquete es de endurecimiento operativo fino, no de bypass directo de auth ni de exposicion de secretos
- para `pre-release` controlado, el estado actual es compatible con cierre del paquete
- para una salida mas expuesta o con monitoreo intensivo, conviene remediar las dos observaciones nuevas antes de promover

### Impacto En Release

- criterio actual de release para `PKG-006`:
  - `apto con observaciones`
- no se reabre el alcance de sesion, rate limit distribuido ni WAF; siguen fuera del paquete como estaba aprobado

### Referencias A Requerimientos O Paquetes

- `PKG-006 Productizacion operativa y pre-release`
- RNF-001 Seguridad, trazabilidad y auditoria
- RNF-002 Usabilidad, rendimiento y continuidad operativa

## PKG-006 Revalidacion 2026-09-19

- `health/ready` crea y valida el directorio de storage al iniciar el servicio; cada request posterior solo verifica permisos `R_OK | W_OK` y no escribe archivos temporales.
- `X-Request-Id` acepta solo `[A-Za-z0-9._-]{1,128}`; todo valor ausente o invalido se reemplaza por UUID generado por servidor.
- las dos observaciones bajas propias de PKG-006 quedan remediadas.
- conclusion: `PKG-006` queda apto para cierre operativo; sesion en `localStorage` y rate limiting por proceso pasan a PKG-007 y trabajo de infraestructura posterior, respectivamente.

## PKG-007 Implementacion 2026-09-19

- el refresh token es opaco, solo se persiste su hash SHA-256 y JavaScript no puede leer la cookie `HttpOnly`.
- cada refresh revoca el token previo antes de crear su reemplazo; logout es idempotente.
- el access token queda en memoria del frontend y los endpoints protegidos conservan bearer JWT y revalidacion de usuario/roles.
- riesgo remanente: falta evidencia HTTP contra una base con la migracion aplicada; rate limiting distribuido sigue fuera de alcance.

## PKG-007 Revalidacion 2026-09-25

- la revocacion durante refresh usa `updateMany` condicionado por sesion activa y vencimiento; dos refresh concurrentes ya no pueden emitir dos sucesores validos.
- el cliente centraliza la recuperacion ante `401`, serializa el refresh y reintenta una sola vez con el token nuevo; no persiste tokens en el navegador.
- logout deja auditoria cuando hay una sesion revocada y refresh/logout reciben rate limit local por IP.
- el runbook incorpora `AUTH_REFRESH_EXPIRES_IN=7d`, `JWT_EXPIRES_IN=15m` y el deploy de la migracion antes del backend.
- riesgo remanente: rate limiting distribuido y la evidencia HTTP contra un ambiente migrado siguen diferidos por requerir infraestructura/credenciales externas.

## PKG-007 Cierre Operativo Local 2026-09-26

- migracion aplicada y evidencia HTTP local en verde para login, refresh rotativo, logout y rechazo de refresh luego de revocacion.
- el riesgo de falta de evidencia HTTP local queda cerrado; rate limiting distribuido sigue diferido para infraestructura compartida.
