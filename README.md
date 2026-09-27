# Torneos de Pesca

Aplicación web para administrar torneos de pesca, desde la preparación del evento hasta la carga de capturas, el ranking y los reportes.

## Funcionalidades

- Administración de torneos, participantes, equipos, embarcaciones y fiscales.
- Inscripción pública y activación de cuentas por correo.
- Operación de fiscalización en campo: captura, evidencia fotográfica y cola offline acotada.
- Cálculo de puntajes, ranking y exportaciones CSV/XLSX.
- Sesiones con refresh token rotativo en cookie `HttpOnly`.
- Interfaz responsive para administración y operación.

## Stack

- Frontend: Next.js 16, React 18 y TypeScript.
- Backend: NestJS 11, Prisma y PostgreSQL.
- Correo transaccional: Resend (opcional en desarrollo local).

## Puesta en marcha local

Requisitos: Node.js 20+, npm y una instancia de PostgreSQL.

1. Copiá las plantillas de entorno y completá los valores locales.

   ```powershell
   Copy-Item backend/.env.example backend/.env
   Copy-Item frontend/.env.example frontend/.env.local
   ```

   Generá un valor aleatorio para `JWT_SECRET`, configurá `DATABASE_URL` y conservá `ALLOW_BOOTSTRAP_ADMIN=false` salvo durante la creación controlada del primer administrador.

2. Instalá dependencias y prepará la base.

   ```powershell
   cd backend
   npm ci
   npm run prisma:generate
   npm run prisma:migrate
   ```

3. En una terminal, iniciá el backend.

   ```powershell
   cd backend
   npm run start:dev
   ```

4. En otra terminal, iniciá el frontend.

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

La interfaz queda disponible en `http://localhost:3005` y la API en `http://localhost:3004/api/v1`.

Para enviar correos reales, configurá `RESEND_API_KEY` y `EMAIL_FROM` en `backend/.env`. Sin esas variables, el flujo local sigue disponible, pero los mensajes se registran en consola.

## Calidad

```powershell
cd backend
npm run lint
npm run build
npm run test:pkg004
npm run test:pkg006
npm run test:pkg007

cd ../frontend
npm run lint
npm run test:pkg007
npm run test:pkg008
npm run build
```

La documentación funcional, técnica y de paquetes se encuentra en [docs/00-indice](docs/00-indice/README.md).

## Desarrollo asistido por IA

El proyecto fue desarrollado con asistencia de IA como parte de un portfolio técnico. Las decisiones de producto, el alcance y la validación final corresponden a su autor.

## Licencia

Distribuido bajo la licencia [MIT](LICENSE).
