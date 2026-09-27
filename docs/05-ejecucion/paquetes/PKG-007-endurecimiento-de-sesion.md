# PKG-007 Endurecimiento De Sesion

## Objetivo

Eliminar el JWT persistido en `localStorage` y habilitar renovacion controlada mediante refresh token opaco rotativo en cookie `HttpOnly`.

## Entregado

- `AuthSession` persistida con hash SHA-256, vencimiento y revocacion.
- `POST /api/v1/auth/login` crea la cookie `torneos_pesca_refresh` y devuelve el access token de corta duracion.
- `POST /api/v1/auth/refresh` rota el refresh token y emite un access token nuevo.
- `POST /api/v1/auth/logout` revoca la sesion y expira la cookie.
- frontend conserva la sesion solo en memoria, recupera la sesion con refresh al iniciar y reintenta una vez los `401` con una renovacion serializada.
- las rotaciones concurrentes tienen un unico ganador; logout deja auditoria `auth.logout` cuando revoca una sesion.
- `POST /api/v1/auth/refresh` y `POST /api/v1/auth/logout` tienen rate limit local por IP, como los demas bordes publicos de auth.

## Configuracion

- `AUTH_REFRESH_EXPIRES_IN` es obligatoria y usa formato `numero + s|m|h|d`, por ejemplo `7d`.
- La cookie es `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` y `Secure` fuera de desarrollo.
- `JWT_EXPIRES_IN=15m` y `AUTH_REFRESH_EXPIRES_IN=7d` son los valores operativos recomendados.

## Riesgos Diferidos

- Rate limiting distribuido requiere infraestructura compartida.
- La migracion debe aplicarse con `npm run prisma:deploy` en cada ambiente antes de desplegar backend.

## Cierre Operativo Local 2026-09-26

- se aplico `20260919120000_pkg007_auth_sessions` sobre la base local configurada.
- smoke HTTP autenticado en `http://localhost:3006/api/v1`: health, login, perfil y torneos respondieron `200`.
- smoke especifico de sesion: login con cookie, refresh rotativo, logout y rechazo `401` de refresh posterior a logout.
