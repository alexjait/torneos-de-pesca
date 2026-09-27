# DevOps Infra

Owner recomendado: `devops_infra`

## Objetivo Operativo De PKG-006

Cerrar la capa minima de productizacion para pasar de uso local a `pre-release` controlado sin cambiar el modelo funcional del sistema.

Este documento deja:

- plantillas por entorno
- reglas de configuracion
- smoke HTTP/autenticado post-deploy
- checklist de release y rollback
- politica minima de backup/retencion

## Ambientes Cerrados

### Dev

- uso local o sandbox individual
- `JWT_EXPIRES_IN=15m`
- `AUTH_REFRESH_EXPIRES_IN=7d`
- `TRUST_PROXY_HEADERS=false`
- `MEDIA_STORAGE_DIR` puede ser relativo al repo o al runtime local
- backup manual antes de migraciones o pruebas destructivas

### Staging

- primer entorno compartido
- misma topologia logica que `prod`
- `JWT_EXPIRES_IN=15m`
- `AUTH_REFRESH_EXPIRES_IN=7d`
- `TRUST_PROXY_HEADERS=true` solo si hay proxy confiable delante
- storage persistente obligatorio para `MEDIA_STORAGE_DIR`
- backup diario de base y archivos

### Prod

- salida real controlada
- secretos dedicados por entorno
- `JWT_EXPIRES_IN=15m`
- `AUTH_REFRESH_EXPIRES_IN=7d`
- `ALLOW_BOOTSTRAP_ADMIN=false`
- storage persistente obligatorio
- backup diario de base y archivos

## Fuente De Configuracion

- no hay plantillas `.env*` versionadas; las variables se administran en el runtime o secret store de cada ambiente.
- nunca versionar `.env` reales ni secretos.
- antes de desplegar, contrastar las variables de este runbook con la configuracion efectiva del ambiente.

## Variables Obligatorias

### Backend

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `AUTH_REFRESH_EXPIRES_IN`
- `APP_BASE_URL`
- `ALLOW_BOOTSTRAP_ADMIN`
- `CORS_ALLOWED_ORIGINS`
- `TRUST_PROXY_HEADERS`
- `MEDIA_STORAGE_DIR`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_APP_NAME`

### Opcionales Condicionadas

- `RESEND_API_KEY`
- `EMAIL_FROM`

## Reglas Operativas De Configuracion

- `JWT_SECRET` no puede ser `local-dev-secret` ni `change-me`
- `ALLOW_BOOTSTRAP_ADMIN` debe quedar en `false` por defecto
- `APP_BASE_URL` apunta al frontend, no al backend
- `dev`, `staging` y `prod` no comparten:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `MEDIA_STORAGE_DIR`
- `TRUST_PROXY_HEADERS=true` solo cuando el proxy delantero es confiable y controlado
- `MEDIA_STORAGE_DIR` no puede vivir en disco efimero en `staging/prod`
- `JWT_EXPIRES_IN` debe ser corto (`15m`) y `AUTH_REFRESH_EXPIRES_IN` define la vida maxima de la cookie (`7d` recomendado).
- aplicar `npm run prisma:deploy` con la migracion `20260919120000_pkg007_auth_sessions` antes de desplegar una version que use refresh tokens.

## Smoke HTTP/Autenticado

Script versionado:

- `backend/tests/pkg006.release-smoke.ts`

Script npm:

- `npm run test:release-smoke`

Variables requeridas para ejecutarlo:

- `SMOKE_BASE_URL`
  - default: `http://localhost:3004/api/v1`
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

Secuencia cerrada:

1. `GET /health/live`
2. `GET /health/ready`
3. `POST /auth/login`
4. `GET /auth/me`
5. `GET /tournaments`

Regla:

- el smoke es de solo lectura
- no crea ni destruye datos
- si `health/live` o `health/ready` no existen todavia, el siguiente agente es `backend_web`

Ejemplo PowerShell local:

```powershell
$env:SMOKE_BASE_URL="http://localhost:3004/api/v1"
$env:SMOKE_ADMIN_EMAIL="qa-admin@example.com"
$env:SMOKE_ADMIN_PASSWORD="reemplazar"
npm run test:release-smoke
```

## Release Checklist

1. confirmar variables correctas del entorno objetivo
2. confirmar secretos dedicados por entorno
3. confirmar backup de base y archivos dentro de la misma ventana
4. ejecutar `npm run prisma:deploy` en backend
5. desplegar backend y frontend del mismo corte
6. verificar `health/live`
7. verificar `health/ready`
8. ejecutar `npm run test:release-smoke`
9. monitorear logs tecnicos al menos `15` minutos

## Rollback Checklist

1. si falla antes de migraciones, volver al artefacto anterior
2. si falla despues de migraciones pero antes de smoke verde:
   - volver backend/frontend al artefacto anterior
   - restaurar base y archivos desde el backup de la ventana
3. no usar `down migration` ad hoc como estrategia principal

## Backup Y Retencion

### Dev

- backup manual antes de migraciones o pruebas destructivas

### Staging

- backup diario de base
- snapshot o copia diaria de `MEDIA_STORAGE_DIR`
- retencion `7` dias

### Prod

- backup diario de base
- snapshot o copia diaria de `MEDIA_STORAGE_DIR`
- retencion `30` dias

Reglas:

- base y archivos se respaldan en la misma ventana diaria
- antes del primer release real debe probarse al menos una restauracion en entorno aislado
- objetivo minimo:
  - `RPO <= 24h`
  - `RTO <= 4h` en `staging`
  - `RTO <= 8h` en `prod`

## Riesgos Operativos Abiertos

- `health/live` y `health/ready` estan disponibles; `health/ready` no escribe probes temporales por request
- el access token vive solo en memoria del frontend; el refresh token es opaco, rotativo y queda en cookie `HttpOnly`.
- el rate limiting actual sigue siendo en memoria por proceso
- el storage actual de media/exportaciones requiere volumen persistente y backup coordinado

## Estado Del Slice DevOps

- plantillas por entorno: `done`
- smoke runner post-deploy: `done`
- runbook de release/rollback: `done`
- politica de backup/retencion: `done`
- healthchecks runtime: `done`

## Referencias

- [PKG-006](../05-ejecucion/paquetes/PKG-006-productizacion-operativa-y-pre-release.md)
- [Project State](../00-indice/project-state.md)
- RNF-001 Seguridad, trazabilidad y auditoria
- RNF-002 Usabilidad, rendimiento y continuidad operativa
