# PKG-006 Productizacion Operativa Y Pre-Release

Owner recomendado: `orchestrator`

## ID Del Paquete

PKG-006

## Nombre Corto

Productizacion operativa y pre-release

## Objetivo De Negocio

Llevar el producto desde un MVP funcional cerrado a una base operativa mas cercana a uso real, con foco en despliegue controlado, observabilidad, endurecimiento de sesion y evidencia minima de release end-to-end.

El objetivo concreto es cerrar la brecha entre "aplicacion que funciona en repo/local" y "producto que puede pasar a un entorno compartido con menor riesgo operativo", sin abrir todavia un nuevo frente funcional de negocio.

## Historia O Requerimiento Fuente

- RNF-001 Seguridad, trazabilidad y auditoria
- RNF-002 Usabilidad, rendimiento y continuidad operativa
- restricciones y evoluciones post-MVP declaradas en [Brief de negocio](../../01-negocio/brief-negocio.md)
- riesgos residuales abiertos en `project-state`, `testing` y `security-review`

## Agente Owner Recomendado

`devops_infra`

## Estado Operativo Actual

- arquitectura ejecutable cerrada
- `devops_infra` ya dejo plantillas por entorno, smoke runner y runbook operativo
- `backend_web` ya implemento healthchecks runtime, request id y logging minimo
- `testing` ya ejecuto smoke real local en verde
- `security_reviewer` ya dejo el paquete `apto con observaciones`

## Alcance Incluido

- estrategia de ambientes `dev`, `staging` y `prod`
- configuracion y secretos por entorno
- checklist de despliegue y release
- smoke HTTP/autenticado real posterior a deploy
- observabilidad minima de aplicacion:
  - logs utiles
  - puntos de chequeo de salud
  - criterios basicos de diagnostico
- endurecimiento de sesion y configuracion operativa donde el repo ya permita avanzar sin depender de proveedores externos
- criterios de backup/retencion para base de datos y archivos
- documentacion operativa minima para correr, desplegar y validar

## Fuera De Alcance

- nuevas features funcionales del negocio
- app mobile nativa
- offline completo
- pagos
- clima
- notificaciones avanzadas
- migracion obligatoria a cloud o proveedor especifico si todavia no esta decidido
- SOC, SIEM, WAF o controles enterprise
- migracion de sesion a cookies `HttpOnly`, refresh tokens o SSO
- rate limiting distribuido o multi-region
- alta disponibilidad multi-instancia

## Dependencias

- `PKG-001` a `PKG-005` cerrados operativamente
- backend y frontend funcionales en repo
- arquitectura vigente en [Arquitectura](../../03-arquitectura/arquitectura.md)
- contratos vigentes en [Contratos](../../03-arquitectura/contratos.md)
- riesgos abiertos documentados en [Project State](../../00-indice/project-state.md)

## Entradas Obligatorias

- [Brief de negocio](../../01-negocio/brief-negocio.md)
- [ERS](../../02-funcional/ers.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [Project State](../../00-indice/project-state.md)
- [Testing](../../06-calidad/testing.md)
- [Security Review](../../06-calidad/security-review.md)

## Referencias Funcionales

- [RNF-001](../../02-funcional/requerimientos/RNF-001-seguridad-trazabilidad-y-auditoria.md)
- [RNF-002](../../02-funcional/requerimientos/RNF-002-usabilidad-rendimiento-y-continuidad-operativa.md)

## Referencias De Arquitectura Y Contratos

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

## Referencias UX/UI

- [UX/UI](../../04-ux-ui/ux-ui.md)

Si el paquete agrega cualquier pantalla o feedback visible de operacion:

- copy visible:
  - lenguaje operativo claro
  - evitar terminos tecnicos crudos para usuario final
- errores visibles:
  - mensajes accionables
  - nunca mostrar excepciones o stack traces
- labels visibles:
  - `Entorno`
  - `Estado del servicio`
  - `Ultimo chequeo`
  - `Configuracion incompleta` cuando aplique
- feedback post-accion:
  - confirmar guardado, deploy o chequeo ejecutado
  - indicar siguiente paso recomendado
- idioma y calidad visual:
  - espanol correcto
  - mantener patron visual actual del backoffice
  - no introducir vistas tecnicas confusas para perfiles no tecnicos

## Criterios De Aceptacion

- existe una definicion cerrada de ambientes y variables requeridas por entorno
- existe una forma clara y documentada de levantar backend y frontend fuera del contexto del desarrollador original
- existe smoke HTTP/autenticado real ejecutable contra una instancia desplegada o un entorno equivalente
- existe checklist de release y rollback basico
- existe estrategia minima de observabilidad y diagnostico
- existe postura de backup/retencion declarada para base y archivos
- los riesgos abiertos del MVP quedan re-clasificados entre:
  - aceptados temporalmente
  - obligatorios antes de prod real
  - diferidos a paquetes posteriores

## Arquitectura Ejecutable Cerrada

### 1. Objetivo tecnico exacto

`PKG-006` no abre features ni rediseña el stack. Cierra la capa operativa minima para pasar de uso local a `pre-release` controlado con:

- ambientes definidos `dev`, `staging` y `prod`
- configuracion separada por entorno
- `healthcheck` y `smoke` HTTP real posteriores a deploy
- logging y diagnostico minimo
- backups y retencion declarados para base y archivos
- checklist de release y rollback

El paquete no redefine el dominio de torneos ni reemplaza la estrategia actual de sesion.

### 2. Ambientes y configuracion por entorno

Ambientes cerrados:

- `dev`
  - uso local o sandbox individual
  - permite correo deshabilitado
  - `JWT_EXPIRES_IN=8h`
  - `TRUST_PROXY_HEADERS=false`
  - backups solo manuales antes de migraciones o pruebas destructivas
- `staging`
  - primer entorno compartido para validacion previa a release
  - misma topologia logica que `prod`: `frontend`, `backend`, `Postgres`, storage persistente para media/exportaciones
  - `JWT_EXPIRES_IN=4h`
  - `TRUST_PROXY_HEADERS=true` solo si hay proxy confiable delante
  - debe tener credenciales dedicadas de smoke y datos controlados
- `prod`
  - entorno reservado para salida real controlada
  - secretos unicos por entorno
  - `JWT_EXPIRES_IN=4h`
  - `ALLOW_BOOTSTRAP_ADMIN=false`
  - storage persistente obligatorio; nunca disco efimero

Variables minimas obligatorias de backend en `staging/prod`:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_BASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `TRUST_PROXY_HEADERS`
- `MEDIA_STORAGE_DIR`

Variables obligatorias de frontend en `staging/prod`:

- `NEXT_PUBLIC_API_BASE_URL`

Variables opcionales condicionadas:

- `RESEND_API_KEY`
- `EMAIL_FROM`

Decisiones irreversibles de configuracion:

- `dev`, `staging` y `prod` no comparten `DATABASE_URL`, `JWT_SECRET` ni `MEDIA_STORAGE_DIR`
- ningun secreto sale de `.env` versionado; vive solo en el runtime o secret store del entorno
- `APP_BASE_URL` siempre apunta al origen del frontend, no al backend
- las credenciales de smoke no forman parte del runtime de la app; se inyectan solo al runner operativo o pipeline

### 3. Healthcheck y observabilidad minima

Se agregan dos endpoints operativos al backend:

- `GET /api/v1/health/live`
  - sin autenticacion
  - responde `200` si el proceso arranco y puede atender HTTP
  - no consulta dependencias
- `GET /api/v1/health/ready`
  - sin autenticacion
  - responde `200` solo si:
    - Postgres responde
    - `MEDIA_STORAGE_DIR` existe y es accesible para lectura/escritura
    - la configuracion obligatoria cargo sin errores
  - responde `503` si falla cualquiera de esos checks

Observabilidad minima obligatoria del paquete:

- logs tecnicos estructurados a `stdout` o archivo del proceso
- un `requestId` por request propagado en logs y respuestas
- campos minimos por request: `timestamp`, `level`, `requestId`, `method`, `path`, `statusCode`, `durationMs`
- campos minimos para acciones autenticadas: `userId`, `role`, `module`, `event`
- errores con stack solo server-side; nunca en payload al cliente

Diagnostico minimo esperado:

- `live=200` y `ready=503` implica problema de dependencia o permisos
- login falla con `ready=200` implica problema de auth/configuracion, no de bootstrap del proceso
- errores de exportaciones o media deben permitir distinguir `db`, `storage` o `email` en logs

### 4. Smoke HTTP/autenticado real

Se cierra un smoke post-deploy minimo y obligatorio para `staging` y cualquier release candidato:

1. `GET /api/v1/health/live` debe devolver `200`
2. `GET /api/v1/health/ready` debe devolver `200`
3. `POST /api/v1/auth/login` con usuario administrativo de smoke debe devolver `200`
4. `GET /api/v1/auth/me` con el bearer emitido debe devolver `200`
5. `GET /api/v1/tournaments` con el mismo bearer debe devolver `200`

Decision de cerrabilidad:

- el smoke obligatorio del paquete es de solo lectura
- no crea ni destruye datos
- el flujo de fiscal `login + GET /captures/context` queda recomendado para una pasada posterior de validacion operativa, pero no bloquea `PKG-006`

### 5. Postura de sesion

Decision cerrada:

- `PKG-006` no migra la sesion actual basada en `JWT bearer` persistido en `localStorage`
- se acepta esa postura solo para `pre-release` controlado y `prod` restringido a operadores internos o acceso acotado
- no se habilita en este paquete una salida a internet publica general para participantes apoyada en esta misma mecanica de sesion

Compensaciones obligatorias dentro del paquete:

- `JWT_SECRET` unico por entorno
- expiracion de token mas corta en `staging/prod` que en `dev`
- revalidacion server-side de usuario activo y roles vigente se mantiene como restriccion base
- logout cliente debe seguir limpiando la sesion local

Decision diferida explicita:

- migrar a cookies `HttpOnly` + refresh token queda fuera de `PKG-006` y pasa a ser prerequisito de una apertura publica amplia o endurecimiento de seguridad posterior

### 6. Backups, retencion y restauracion

Postura minima cerrada sin atar proveedor:

- `dev`
  - backup manual antes de migraciones o pruebas destructivas
  - sin SLA de retencion
- `staging`
  - backup diario de base
  - snapshot o copia diaria de `MEDIA_STORAGE_DIR`
  - retencion de `7` dias
- `prod`
  - backup diario de base
  - snapshot o copia diaria de `MEDIA_STORAGE_DIR`
  - retencion de `30` dias

Reglas operativas:

- base y archivos deben respaldarse dentro de la misma ventana operativa diaria
- no se acepta `MEDIA_STORAGE_DIR` sobre disco efimero en `staging/prod`
- antes del primer release a `prod` debe ejecutarse al menos una restauracion de prueba en entorno aislado
- objetivo operativo minimo del paquete:
  - `RPO <= 24h`
  - `RTO <= 4h` para `staging`
  - `RTO <= 8h` para `prod`

### 7. Checklist de release y rollback

Checklist minimo de release:

- validar diff de variables por entorno y ausencia de secretos locales reutilizados
- confirmar backup exitoso de base y archivos del entorno objetivo
- ejecutar `prisma migrate deploy`
- desplegar backend y frontend con artefactos del mismo corte
- verificar `health/live` y `health/ready`
- ejecutar smoke HTTP/autenticado real
- monitorear logs tecnicos al menos `15` minutos posteriores al deploy

Checklist minimo de rollback:

- si falla antes de aplicar migraciones, volver al artefacto anterior
- si falla despues de migraciones pero antes de smoke en verde:
  - volver frontend/backend al artefacto anterior
  - restaurar base y archivos desde el backup tomado para la ventana
- no se aceptan `down migrations` ad hoc no probadas como estrategia principal de rollback

Restriccion ejecutable:

- las migraciones de este paquete deben ser compatibles hacia atras durante la ventana de release; si una migracion no lo es, no entra en `PKG-006`

### 8. Limites exactos por especialidad

Para `devops_infra`:

- si entra:
  - plantillas/env vars por entorno
  - scripts o runbooks de deploy
  - smoke runner HTTP real
  - backup job y politica de retencion
  - volumen persistente para `MEDIA_STORAGE_DIR`
- no entra:
  - elegir cloud nuevo si no esta decidido
  - multi-region
  - WAF, SIEM, observabilidad enterprise

Para `backend_web`:

- si entra:
  - endpoints `health/live` y `health/ready`
  - chequeo real de DB y `MEDIA_STORAGE_DIR`
  - logging estructurado y `requestId`
  - ajustes menores de configuracion necesarios para separar entornos
- no entra:
  - nuevas reglas de negocio
  - rediseño de auth
  - cambios de contratos funcionales existentes fuera de salud/operacion

Para `testing`:

- si entra:
  - ejecutar smoke HTTP real sobre instancia desplegada o equivalente
  - dejar evidencia de `health`, `login`, `auth/me` y lectura protegida
  - validar checklist de release/rollback a nivel de ejecucion operativa
- no entra:
  - regresion funcional completa del MVP
  - E2E browser amplio

Para `security_reviewer`:

- si entra:
  - revisar minimizacion de datos en `health`
  - revisar secretos por entorno, `TRUST_PROXY_HEADERS`, `CORS_ALLOWED_ORIGINS` y postura de sesion aceptada
  - revisar que backup/retencion y release no abran superficie publica nueva
- no entra:
  - exigir cookies `HttpOnly` dentro de este mismo paquete
  - controles enterprise fuera del alcance aprobado

No se espera redefinir el dominio de torneo ni los contratos funcionales centrales del producto.

## Handoff Para `software_architect`

- arquitectura operativa del pre-release cerrada en este documento
- la postura de sesion queda explicitamente partida: sin migracion en `PKG-006`
- el alcance tecnico queda definido sin depender de proveedor de infraestructura especifico

## Handoff Para `devops_infra`

- implementar configuracion por entorno
- scripts y documentacion de deploy
- checks de salud y smoke
- lineamientos de backup/restore
- endurecimiento operativo basico
- no abrir trabajo de cloud selection, multi-region ni observabilidad enterprise

### Outcome De `devops_infra`

- `completed`
- artefactos dejados:
  - `backend/.env.example`
  - `backend/.env.staging.example`
  - `backend/.env.prod.example`
  - `frontend/.env.example`
  - `frontend/.env.staging.example`
  - `frontend/.env.prod.example`
  - `backend/tests/pkg006.release-smoke.ts`
  - `docs/07-operacion/devops-infra.md`
- nota:
  - el smoke runner ya quedo versionado pero depende de que `backend_web` exponga `health/live` y `health/ready`

## Handoff Para `backend_web`

- exponer o ajustar endpoints/utilidades necesarias para healthcheck y smoke real
- endurecer configuracion y comportamiento runtime cuando aplique
- no cambiar el modelo funcional de sesion ni abrir endpoints de negocio nuevos

### Outcome De `backend_web`

- `completed`
- implementado:
  - `GET /api/v1/health/live`
  - `GET /api/v1/health/ready`
  - chequeo real de `Postgres`
  - chequeo real de `MEDIA_STORAGE_DIR`
  - `X-Request-Id` en respuestas
  - logging estructurado minimo por request
  - `TRUST_PROXY_HEADERS` aplicado sobre Express cuando corresponde
- archivos:
  - `backend/src/modules/health/health.module.ts`
  - `backend/src/modules/health/presentation/health.controller.ts`
  - `backend/src/modules/health/application/health.service.ts`
  - `backend/src/common/http/request-logging.middleware.ts`
  - `backend/src/main.ts`
  - `backend/src/app.module.ts`
- validacion:
  - `npm run lint`: ok
  - `npm run build`: ok
- observacion:
  - la prueba runtime en esta sesion no pudo completar `health/ready` porque la DB local configurada en `localhost:5434` no estaba alcanzable

## Handoff Para `frontend_web`

- solo si hace falta:
  - feedback visible de entorno/estado
  - ajustes de configuracion de cliente por entorno

## Handoff Para `testing`

- definir y ejecutar smoke real posterior a deploy
- dejar evidencia de release readiness
- no reemplazar este paquete por una regresion E2E completa

### Outcome De `testing`

- `completed`
- smoke ejecutado sobre `http://localhost:3004/api/v1`
- evidencia en verde:
  - `GET /health/live` -> `200`
  - `GET /health/ready` -> `200`
  - `POST /auth/login` -> `200`
  - `GET /auth/me` -> `200`
  - `GET /tournaments` -> `200`
- evidencia adicional:
  - `X-Request-Id` ecoado si llega por header
  - `X-Request-Id` generado por servidor si no llega
- hallazgo resuelto en la misma pasada:
  - `POST /auth/login` devolvia `201`; se ajusto a `200`

## Handoff Para `security_reviewer`

- revisar configuracion por entorno
- revisar postura de sesion y headers
- revisar superficie publica minima de release
- mantener el criterio conservador: aceptar `localStorage` solo para `pre-release` controlado

### Outcome De `security_reviewer`

- `completed`
- conclusion operativa:
  - `apto con observaciones`
- observaciones vigentes:
  - `health/ready` escribe probe file en cada request
  - `X-Request-Id` acepta y ecoa valores de cliente sin normalizacion estricta
- criterio:
  - no bloquean `PKG-006` para `pre-release` controlado

## Riesgos Y Supuestos

Riesgos:

- sin este paquete, el sistema puede seguir funcionando pero permanecer demasiado atado a uso local o controlado
- mezclar productizacion con nuevas features funcionales diluye foco y posterga salida real
- algunas decisiones de despliegue pueden depender de infraestructura todavia no elegida

Supuestos:

- el producto no puede quedar solo como MVP de demo
- la siguiente prioridad es operativa, no funcional
- se acepta un paquete tecnico antes de abrir nuevas capacidades de negocio

## Referencias Tecnicas Requeridas Para Implementadores

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [Project State](../../00-indice/project-state.md)
- [Testing](../../06-calidad/testing.md)
- [Security Review](../../06-calidad/security-review.md)
- `backend/src/config/env.validation.ts`
- `backend/src/main.ts`
- `frontend/src/lib/session.ts`
- `docs/07-operacion/devops-infra.md`

## Outcome De Ejecucion Arquitectonica

- `completed`
- razon:
  - el paquete queda cerrado a nivel de arquitectura ejecutable con decisiones operativas, limites por especialidad y postura explicita de sesion

## Siguiente Agente Recomendado

`orchestrator`

## Paquete Exacto De Entrada

- [PKG-006](./PKG-006-productizacion-operativa-y-pre-release.md)
- [Project State](../../00-indice/project-state.md)
- [Brief de negocio](../../01-negocio/brief-negocio.md)
- [ERS](../../02-funcional/ers.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [Testing](../../06-calidad/testing.md)
- [Security Review](../../06-calidad/security-review.md)

## Estado De Salida Esperado

- arquitectura ejecutable cerrada
- `devops_infra` completado con artefactos operativos versionados
- `backend_web` completado con runtime health/logging implementado
- `testing` completado con smoke real y evidencia de release readiness
- `security_reviewer` completado con criterio `apto con observaciones`
- siguiente foco del proyecto movido a cierre operativo del paquete
