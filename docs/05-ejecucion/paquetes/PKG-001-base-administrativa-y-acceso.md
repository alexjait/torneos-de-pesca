# PKG-001 Base Administrativa Y Acceso

Owner recomendado: `orchestrator`

## ID Del Paquete

PKG-001

## Nombre Corto

Base administrativa y acceso

## Objetivo De Negocio

Construir la base operativa del MVP para que la organizacion pueda administrar torneos, participantes, equipos, embarcaciones y fiscales, con acceso por cuenta validada, trazabilidad y seguridad desde el inicio.

Este paquete habilita la estructura fundacional sobre la que luego se apoyan:

- auto-registro y aprobacion completa
- carga y validacion de capturas
- scoring y ranking
- reportes y cierre

## Historia O Requerimiento Fuente

- RF-001 Gestion de torneos
- RF-002 Gestion de participantes, equipos y embarcaciones
- RF-004 Cuentas, credenciales y validacion de email
- RF-005 Gestion de fiscales
- RNF-001 Seguridad, trazabilidad y auditoria

## Agente Owner Recomendado

`backend_web`

## Estado Operativo Actual

- desarrollo backend reportado como finalizado
- validaciones locales ejecutadas en `backend`: `npm run lint`, `npm run build` y `npm run test:smoke`
- frontend web base implementado en `frontend/`
- testing integrado frontend + backend ejecutado
- remediacion backend aplicada para permitir CORS desde `http://localhost:3005` hacia `http://localhost:3004/api/v1`
- re-testing integrado frontend + backend ejecutado con conclusion `apto para cierre de PKG-001`
- remediaciones UX/copy/visual ejecutadas y revalidadas
- remediacion final RF-002 ejecutada: participantes permite quitar vinculos con equipos y embarcaciones desde `/admin/participantes`
- estado recomendado del paquete: `closed`
- siguiente agente recomendado: `orchestrator`

## Alcance Incluido

- autenticacion base y control de acceso por roles
- alta administrativa de usuarios con cuenta pendiente de validacion
- activacion y validacion de cuenta por email
- alta y gestion base de torneos
- alta y gestion base de participantes
- alta y gestion base de equipos
- alta y gestion base de embarcaciones
- alta y asignacion de fiscales por torneo
- soft delete en entidades administrativas aplicables
- auditoria de acciones relevantes del paquete
- integracion inicial con Resend para emails transaccionales de activacion
- estructura de persistencia inicial en Postgres con Prisma
- contratos de backend necesarios para este alcance

## Fuera De Alcance

- auto-registro de participantes como experiencia completa de slice 2
- carga de capturas
- validacion de capturas
- scoring y ranking
- control horario operativo completo en campo
- reportes y exportaciones completas
- integracion meteorologica
- offline de capturas
- React Native o aplicacion nativa
- autenticacion social
- recuperacion avanzada de cuenta no definida aun

## Dependencias

- ERS aprobada
- arquitectura aprobada
- contratos base aprobados
- UX/UI aprobada para acceso, altas administrativas y fiscales
- decisiones tecnicas aprobadas sobre:
  - monolito modular
  - Next.js, NestJS, Postgres, Prisma
  - Resend
  - soft delete y auditoria

## Entradas Obligatorias

- [Brief de negocio](../../01-negocio/brief-negocio.md)
- [ERS](../../02-funcional/ers.md)
- [Indice maestro de requerimientos](../../00-indice/requerimientos-index.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [UX/UI](../../04-ux-ui/ux-ui.md)
- [Indice de decisiones](../../00-indice/decisiones-index.md)

## Referencias Funcionales

- [RF-001](../../02-funcional/requerimientos/RF-001-gestion-de-torneos.md)
- [RF-002](../../02-funcional/requerimientos/RF-002-gestion-de-participantes-equipos-embarcaciones.md)
- [RF-004](../../02-funcional/requerimientos/RF-004-cuentas-credenciales-y-validacion-email.md)
- [RF-005](../../02-funcional/requerimientos/RF-005-gestion-de-fiscales.md)
- [RNF-001](../../02-funcional/requerimientos/RNF-001-seguridad-trazabilidad-y-auditoria.md)

## Referencias De Arquitectura Y Contratos

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

Puntos de arquitectura especialmente obligatorios en este paquete:

- monolito modular
- Prisma como ORM principal
- Resend como proveedor de correo transaccional
- soft delete y auditoria desde la base
- control de acceso por roles server-side
- no mezclar logica de negocio con infraestructura

## Referencias UX/UI

- [UX/UI](../../04-ux-ui/ux-ui.md)

Flujos UX a respetar en este paquete:

- login
- activacion / validacion de cuenta
- alta administrativa de usuario
- alta y asignacion de fiscales

Reglas UX obligatorias:

- no usar `window.alert`, `window.confirm` ni `window.prompt` en la UI final
- usar dialogos, toasts y mensajes inline consistentes con el sistema visual

## Criterios De Aceptacion

- existe autenticacion base con acceso por email y contraseña
- un usuario dado de alta administrativamente queda en estado pendiente de validacion
- el sistema envia email de activacion a usuarios y fiscales via Resend
- el flujo de activacion permite validar la cuenta y dejarla operativa
- el administrador puede crear, editar y consultar torneos
- el administrador puede crear, editar y consultar participantes, equipos y embarcaciones
- el administrador puede vincular y desvincular participantes con equipos y embarcaciones
- el administrador puede crear fiscales y asignarlos por torneo
- el sistema registra auditoria de altas, cambios, asignaciones, activaciones y accesos relevantes
- las entidades administrativas contemplan soft delete donde aplica
- el backend expone contratos compatibles con la arquitectura definida
- la UI implementada para este paquete respeta los estados de loading, success, error y cuenta pendiente
- no se usan dialogs nativos del navegador en flujos de producto final

## Notas De Testing

- probar login exitoso, login fallido y cuenta pendiente de validacion
- probar activacion de cuenta exitosa, token expirado y token invalido
- probar alta administrativa de usuario con envio de email
- probar alta de fiscal y asignacion a torneo
- probar ABM base de torneos
- probar ABM base de participantes, equipos y embarcaciones
- verificar auditoria de eventos criticos del paquete
- verificar soft delete en entidades administrativas
- verificar integracion con Resend sin duplicados en reintentos
- verificar ausencia de `alert/confirm/prompt` nativos en la UI de este alcance

## Evidencia Esperada

- migraciones iniciales de base de datos
- contratos implementados para auth, torneos, participantes, equipos, embarcaciones y fiscales
- evidencia de envio de emails de activacion
- evidencia de auditoria
- capturas o recorrido funcional de UI de acceso y altas administrativas
- resultado de pruebas del paquete

## Riesgos Y Supuestos

Riesgos:

- configuracion o entregabilidad de Resend puede demorar validacion de cuenta
- el equipo puede intentar meter auto-registro o capturas en este paquete y agrandarlo de mas
- si la auditoria no se implementa desde el inicio, luego se vuelve costoso corregir
- Prisma puede requerir consultas SQL puntuales encapsuladas para algunos reportes o trazabilidad futura

Supuestos:

- este paquete construye solo la base administrativa y de acceso
- no se debe anticipar funcionalidad del slice 2 o 3 salvo las dependencias tecnicas estrictamente necesarias
- los implementadores respetaran modulos y limites definidos en arquitectura

## Nota De Handoff Frontend 2026-04-22

- alcance: remediacion puntual de look and feel en `frontend/` para mejorar densidad visual del backoffice sin cambiar flujos ni contratos
- pantallas impactadas: resumen administrativo, torneos, participantes, equipos, embarcaciones y fiscales
- remediaciones aplicadas:
  - botones y acciones compactados con altura uniforme y `nowrap` para evitar cortes innecesarios
  - formularios administrativos con menor padding vertical, labels mas cercanos y campos mas bajos
  - tablas, metricas, notices y sidebar con gaps y paddings reducidos para una densidad mas razonable de backoffice
- validacion tecnica esperada: `npm run lint` y `npm run build` en `frontend/`
- recomendacion para testing: revalidar visualmente acciones de tablas (`Editar`, `Dar de baja`, `Quitar`) y formularios de alta/edicion, especialmente `Nuevo equipo`, `Crear embarcacion` y `Crear fiscal`

## Nota De Handoff Frontend 2026-04-23

- alcance: remediacion estructural de CRUD administrativos en `frontend/` con patron `toolbar + listado + drawer`, sin cambios de backend ni contratos
- primitives incorporadas:
  - toolbar reusable de listado con busqueda local y contador de resultados
  - drawer reusable para alta y edicion
  - estado vacio y sin resultados orientado a tabla
- pantallas impactadas:
  - `torneos`: CTA principal en header, busqueda local, listado protagonista y drawer amplio para alta/edicion
  - `equipos` y `embarcaciones`: refactor de `SimpleCatalogPage` al nuevo patron reusable
  - `participantes`: tabla protagonista, busqueda local, edicion en drawer y gestion de vinculos fuera de la fila principal en panel lateral
  - `fiscales`: tabla protagonista, busqueda local, edicion en drawer y asignaciones por torneo fuera de la tabla principal en panel lateral
  - `admin-shell`: sidebar mas angosta y liviana para devolver ancho util a la zona de trabajo
- comportamiento visual aplicado:
  - accion destructiva con menor protagonismo que la accion primaria
  - tabla con seleccion visible para paneles laterales de participantes y fiscales
  - no-results explicito cuando la busqueda no devuelve filas
- validacion tecnica ejecutada:
  - `npm run lint`
  - `npm run build`
- recomendacion para testing:
  - validar apertura y cierre de drawers en `torneos`, `equipos`, `embarcaciones`, `participantes` y `fiscales`
  - validar busqueda local y estado `sin resultados` en los cinco modulos
  - validar gestion de vinculos de participantes desde panel lateral
  - validar asignacion y remocion de torneos en fiscales desde panel lateral
  - revisar responsive de sidebar, toolbar y drawers en ancho desktop angosto y mobile

## Nota De Handoff Frontend 2026-04-23 B

- alcance: endurecimiento puntual de copy visible y comportamiento de scroll/sticky en `participantes` y `fiscales`, sin cambios de backend
- archivos impactados:
  - `frontend/src/components/admin-pages.tsx`
  - `frontend/app/globals.css`
- cambios aplicados:
  - reemplazo de copy tecnico por copy de tarea en headers, paneles laterales y estados vacios de `Participantes` y `Fiscales`
  - `DetailPanel` con body scrollable consistente para estado vacio y contenido largo
  - panel lateral sticky en desktop con `max-height` acotado y scroll interno en `.detail-panel-content`
  - `table-wrap` con scroll interno razonable en desktop y `thead th` sticky con fondo solido y `z-index`
  - fallback mobile para evitar doble scroll vertical y desactivar sticky cuando la pantalla pasa a una sola columna
- validacion tecnica ejecutada:
  - `npm run lint`
  - `npm run build`
- recomendacion para testing:
  - validar con 30 o mas filas que el encabezado de tabla siga visible al recorrer el listado
  - validar que el panel lateral mantenga el borde superior estable al alternar entre registros con poco y mucho contenido
  - validar responsive mobile sin doble scroll vertical en tabla y panel

## Nota De Cierre RF-002 2026-04-24

- alcance: remediacion puntual para quitar vinculos de participante con equipo y embarcacion, siguiendo el patron de `Fiscales`
- backend:
  - `DELETE /participants/:id/teams/:linkId`
  - `DELETE /participants/:id/boats/:linkId`
  - soft delete de vinculos con auditoria `participant.team_unlinked` y `participant.boat_unlinked`
- frontend:
  - panel lateral de `Participantes` lista vinculos actuales con accion `Quitar`
  - feedback visible post-accion y estados `Sin equipo` / `Sin embarcacion`
- validacion ejecutada:
  - backend `npm run lint`, `npm run build`, `npm run test:smoke`
  - frontend `npm run lint`, `npm run build`
  - navegador real en `/admin/participantes`
- conclusion: `PKG-001` cerrado; no requiere nueva pasada de `testing` ni `security_reviewer` para esta remediacion puntual
