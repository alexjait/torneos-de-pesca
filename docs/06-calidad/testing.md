# Testing

Owner recomendado: `testing`

## Estrategia

- re-testing funcional focalizado en `PKG-001 Base administrativa y acceso`
- validacion por HTTP real contra `http://localhost:3004/api/v1`
- soporte con consultas puntuales a base local para verificar estados de cuenta, soft delete y auditoria
- revalidacion especifica de los tres hallazgos corregidos por `backend_web`
- nota metodologica: para cubrir activacion de cuenta se inyecto un token de prueba en la base local, ya que el link no se expone por API y la entrega real de email sigue condicionada por la configuracion actual de `Resend`
- pasada integrada frontend + backend desde navegador real en `http://localhost:3005`, levantando backend local con override de `APP_BASE_URL=http://localhost:3005` para que los enlaces de activacion apunten a la UI correcta
- nueva pasada integrada frontend + backend posterior a la remediacion CORS del `2026-04-22`, con backend levantado usando:
  - `APP_BASE_URL=http://localhost:3005`
  - `CORS_ALLOWED_ORIGINS=http://localhost:3005`

## Cobertura

- autenticacion:
  - login exitoso
  - login fallido por password invalida
  - login rechazado para cuenta pendiente
  - `GET /auth/me`
- activacion de cuenta:
  - token invalido
  - token valido con cambio de estado a `ACTIVE`
  - login posterior a activacion
- torneos:
  - alta
  - edicion
  - configuracion de schedule
  - configuracion de scoring
- equipos:
  - alta de dos registros
  - conflicto de unicidad en update de `name`
  - soft delete
- embarcaciones:
  - alta de dos registros
  - conflicto de unicidad en update de `registrationNumber`
  - soft delete
- participantes:
  - alta con email
  - estado de cuenta pendiente
  - edicion
  - vinculacion a equipo y embarcacion
  - soft delete
- fiscales:
  - alta con email
  - estado de cuenta pendiente
  - asignacion a torneo
- auditoria:
  - evidencia de `auth.login`
  - evidencia de `user.activated`
  - evidencia de `tournament.created`, `tournament.updated`, `tournament.schedule_updated`, `tournament.scoring_updated`
  - evidencia de `team.created`, `team.deleted`
  - evidencia de `boat.created`, `boat.deleted`
  - evidencia de `participant.created`, `participant.updated`, `participant.team_linked`, `participant.boat_linked`, `participant.deleted`
  - evidencia de `official.created`, `official.assigned_to_tournament`
- revalidacion de hallazgos previos:
  - links de activacion para `participants` y `officials` ahora dependen de `APP_BASE_URL`
  - `notifications` prioriza `EMAIL_FROM`, luego `RESEND_FROM_EMAIL`
  - conflictos `P2002` de `teams` y `boats` ahora devuelven error funcional legible
- frontend web:
  - carga de `/login`
  - intento de login fallido desde UI
  - intento de activacion de cuenta desde UI con token fresco de prueba
  - inspeccion de consola de navegador y red
  - verificacion puntual de ausencia de `window.alert`, `window.confirm` y `window.prompt` por inspeccion de codigo en `frontend/`
  - revalidacion posterior a CORS de:
    - login fallido desde UI con mensaje funcional
    - cuenta pendiente desde UI con mensaje funcional
    - activacion de cuenta desde UI sin bloqueo CORS
    - login administrativo desde UI con acceso real al dashboard
    - carga de rutas administrativas principales desde navegador real:
      - `/admin`
      - `/admin/torneos`
      - `/admin/participantes`
      - `/admin/embarcaciones`
      - `/admin/fiscales`
    - alta de torneo desde UI con persistencia y auditoria

## Casos Ejecutados

- `POST /auth/login` con admin activo `qa-admin-pkg001@example.com`: ok, devuelve token y perfil `ADMIN`
- `POST /auth/login` con password invalida: ok, responde `401 Credenciales invalidas`
- `POST /auth/login` con `admin@test.com` en estado pendiente: ok, responde `401 La cuenta no esta activa`
- `POST /auth/activate-account` con token invalido: ok, responde `400 Token de activacion invalido o expirado`
- `POST /auth/activate-account` con token valido de prueba: ok, cambia cuenta a `ACTIVE`
- `POST /auth/login` luego de activar `admin@test.com`: ok
- `GET /auth/me` con bearer token valido: ok
- `POST /tournaments`: ok
- `PATCH /tournaments/{id}`: ok
- `PATCH /tournaments/{id}/schedule`: ok
- `PATCH /tournaments/{id}/scoring`: ok
- `POST /teams` x2: ok
- `PATCH /teams/{id}` intentando duplicar `name`: ok, responde `400 Ya existe un equipo con ese nombre`
- `POST /boats` x2: ok
- `PATCH /boats/{id}` intentando duplicar `registrationNumber`: ok, responde `400 Ya existe una embarcacion con ese numero de matricula`
- `POST /participants` con email: ok, crea usuario asociado en `PENDING_EMAIL_VERIFICATION`
- `PATCH /participants/{id}`: ok
- `POST /participants/{id}/teams`: ok
- `POST /participants/{id}/boats`: ok
- `POST /officials` con email: ok, crea usuario asociado en `PENDING_EMAIL_VERIFICATION`
- `POST /officials/{id}/assignments`: ok
- `DELETE /participants/{id}`: ok, persiste `deletedAt` y `deletedBy`
- `DELETE /teams/{id}`: ok, persiste `deletedAt` y `deletedBy`
- `DELETE /boats/{id}`: ok, persiste `deletedAt` y `deletedBy`
- verificacion de auditoria por base local: ok, se encontraron registros de autenticacion, activacion, ABM, vinculaciones y asignacion
- revalidacion de links de activacion: ok por inspeccion de codigo y alineacion de `APP_BASE_URL=http://localhost:3004`; no se pudo validar el link desde un email efectivamente entregado en este entorno
- `GET http://localhost:3005/login`: ok, la pantalla carga y muestra formularios de login y reenvio
- intento de login fallido desde UI con credenciales invalidas: bloqueado por CORS antes de llegar al backend; la UI muestra `Failed to fetch`
- `GET http://localhost:3005/activar-cuenta?token=ui-activation-token-pkg001`: ok, la pantalla carga y precarga el token
- intento de activacion desde UI con token fresco y password valida: bloqueado por CORS antes de llegar al backend; la UI muestra `Failed to fetch`
- inspeccion de consola de navegador:
  - error confirmado: `Access to fetch at 'http://localhost:3004/api/v1/auth/login' from origin 'http://localhost:3005' has been blocked by CORS policy`
  - error confirmado: `Access to fetch at 'http://localhost:3004/api/v1/auth/activate-account' from origin 'http://localhost:3005' has been blocked by CORS policy`
  - observacion menor: falta `favicon.ico` en frontend
  - observacion menor: inputs de password sin `autocomplete` sugerido por el navegador
- inspeccion de codigo frontend para dialogs nativos: sin hallazgos; `rg` no encontro uso de `window.alert`, `window.confirm` ni `window.prompt` en `frontend/`
- `POST /auth/login` desde UI con credenciales invalidas luego de la remediacion CORS: ok, muestra `Credenciales invalidas`
- `POST /auth/login` desde UI para cuenta pendiente luego de reset controlado de datos: ok, muestra `Cuenta pendiente` y mensaje de validacion pendiente
- `POST /auth/activate-account` desde UI con token `ui-activation-token-pkg001-retest`: ok, consume backend, activa cuenta y redirige nuevamente a `/login`
- verificacion por base local posterior a activacion: ok, `qa-pending-pkg001@example.com` paso a `ACTIVE` y registro `user.activated` presente en auditoria
- `POST /auth/login` desde UI con admin `qa-admin-pkg001@example.com`: ok, ingresa a `/admin`
- carga autenticada de `/admin`, `/admin/torneos`, `/admin/participantes`, `/admin/embarcaciones` y `/admin/fiscales`: ok desde navegador real, sin nuevos errores CORS en consola
- alta de torneo desde UI luego de remediacion CORS: ok, aparece mensaje `Torneo creado`; adicionalmente se verifico persistencia por base local y registro `tournament.created` en auditoria
- inspeccion de consola posterior a remediacion CORS:
  - sin errores CORS en login, activacion ni rutas administrativas revalidadas
  - observacion menor persistente: falta `favicon.ico` en frontend
  - observacion menor persistente: inputs de password sin `autocomplete` sugerido por el navegador

## Defectos

- no se detectaron defectos nuevos de backend sobre los tres hallazgos remediados
- defecto bloqueante previo:
  - `status`: resolved
  - `owner`: `backend_web`
  - `titulo`: CORS faltante para `http://localhost:3005`
  - `evidencia de cierre`: login, activacion y carga de rutas administrativas ya consumen backend desde navegador real sin errores CORS; preflight validado previamente por `backend_web`
- observaciones no bloqueantes de frontend:
  - falta `favicon.ico`
  - inputs de password sin `autocomplete` sugerido (`current-password` / `new-password`)
  - owner recomendado: `frontend_web`
- riesgo operativo abierto:
  - `Resend` rechaza envios a destinatarios de prueba externos en este entorno local y devuelve `accepted: false`, `errorCode: validation_error`
  - impacto: no queda validado el recorrido extremo a extremo de entrega de email real para activacion
  - aclaracion operativa registrada: `Resend` si acepta envios a `alex.jait.altman@gmail.com`
  - owner recomendado: `devops_infra` o responsable humano de configuracion del proveedor
  - remediacion sugerida: usar dominio verificado en `Resend` y destinatarios habilitados para pruebas reales

## Riesgo Remanente

- el backend de `PKG-001` queda funcionalmente estable para autenticacion, activacion, ABM administrativo, soft delete y auditoria
- la integracion de correo esta implementada y responde de forma controlada, pero la entregabilidad real sigue sin validacion extremo a extremo por restricciones operativas del entorno
- la revalidacion del link de activacion para `participants` y `officials` fue indirecta:
  - evidencia por codigo y configuracion
  - sin evidencia de email recibido en bandeja real
- la experiencia web integrada ya no presenta bloqueo tecnico por CORS en esta corrida
- el riesgo remanente principal sigue siendo operativo sobre entregabilidad real de email, no un bloqueo funcional del paquete

## Conclusion Operativa

- conclusion: `apto para cierre de PKG-001`
- la remediacion CORS quedo revalidada con navegador real
- login, cuenta pendiente, activacion, acceso administrativo y carga de rutas principales del backoffice ya funcionan integrados con backend
- no se detectaron defectos bloqueantes nuevos en esta corrida
- siguiente agente recomendado: `orchestrator`

## Referencias A Requerimientos O Paquetes

- `PKG-001 Base administrativa y acceso`
- RF-001 Gestion de torneos
- RF-002 Gestion de participantes, equipos y embarcaciones
- RF-004 Cuentas, credenciales y validacion de email
- RF-005 Gestion de fiscales
- RNF-001 Seguridad, trazabilidad y auditoria

## Pasada PKG-006 Release Readiness 2026-05-25

- alcance de esta pasada:
  - smoke HTTP real sobre backend local con Postgres disponible
  - validacion de `health/live`, `health/ready`, `auth/login`, `auth/me` y `tournaments`
  - verificacion puntual de `X-Request-Id`
- entorno usado:
  - backend en `http://localhost:3004`
  - base local configurada por `backend/.env`
  - cuenta administrativa controlada creada para smoke:
    - `qa-smoke-pkg006@example.com`
- preparacion necesaria:
  - se corrigio drift de contrato en `POST /auth/login` para devolver `200` en lugar de `201`

## Casos Ejecutados PKG-006 Release Readiness 2026-05-25

- `GET /api/v1/health/live`: ok, `200`
- `GET /api/v1/health/ready`: ok, `200`
- `POST /api/v1/auth/login` con `qa-smoke-pkg006@example.com`: ok, `200`
- `GET /api/v1/auth/me` con bearer del smoke: ok, `200`
- `GET /api/v1/tournaments` con bearer del smoke: ok, `200`
- `GET /api/v1/health/live` con header `X-Request-Id=pkg006-manual-request-id`: ok, el backend ecoa el mismo request id
- `GET /api/v1/health/ready` sin header entrante: ok, responde `X-Request-Id` generado por servidor

## Defectos PKG-006 Release Readiness 2026-05-25

- defecto encontrado y corregido en la misma pasada:
  - `status`: resolved
  - `owner`: `backend_web`
  - `titulo`: `POST /auth/login` devolvia `201` y rompia el contrato operativo de smoke
  - `evidencia de cierre`: `test:release-smoke` paso en verde luego de aplicar `@HttpCode(HttpStatus.OK)`

## Riesgo Remanente PKG-006 Release Readiness 2026-05-25

- el smoke ya es ejecutable y paso contra HTTP real local
- la evidencia sigue siendo local/pre-release; no reemplaza una pasada en `staging`
- no se hizo validacion browser ni deploy remoto en esta corrida

## Conclusion Operativa PKG-006 Release Readiness 2026-05-25

- conclusion: `apto para pasar a security review de PKG-006`
- no quedaron hallazgos bloqueantes abiertos en el smoke operativo
- siguiente agente recomendado: `security_reviewer`

## Pasada Integrada 2026-04-22 Post UX/UI

- alcance de esta pasada:
  - re-testing integrado frontend + backend luego de remediaciones de `ux_ui_web_mobile`, `frontend_web` y `backend_web`
  - foco especifico sobre feedback visible, lenguaje apto para usuario final, activacion via frontend, visualizacion de vinculos y error funcional de asignacion duplicada
- entorno usado:
  - backend en `http://localhost:3004`
  - frontend en `http://localhost:3005`
  - `APP_BASE_URL=http://localhost:3005`
  - `CORS_ALLOWED_ORIGINS=http://localhost:3005`
- metodologia adicional:
  - para revalidar activacion desde frontend se genero una cuenta pendiente controlada y se inyecto un token de activacion de prueba en la base local, manteniendo la misma estrategia ya documentada para tokens no expuestos por API

## Casos Ejecutados 2026-04-22 Post UX/UI

- `GET /login` desde navegador real: ok, sin referencias visibles a paquete, contrato o implementacion
- login con admin `qa-admin-pkg001@example.com`: ok, acceso a `/admin`
- login con cuenta pendiente controlada `qa-official-ui-20260422134305@example.com`: ok, muestra `Cuenta pendiente de activación` con lenguaje apto para usuario final
- activacion desde `http://localhost:3005/activar-cuenta?token=ui-activation-final-20260422`: ok, el frontend consume backend, activa la cuenta y vuelve a login
- verificacion posterior por API y base local de la cuenta activada: ok, `accountStatus=ACTIVE`
- `GET /admin/torneos`: ok, no se observan explicaciones tecnicas de soft delete y la accion visible queda como `Dar de baja`
- `GET /admin/participantes`: ok, se visualizan explicitamente equipo y embarcacion vinculados; cuando no hubiera vinculo el diseno previsto es `Sin equipo` / `Sin embarcación`
- `GET /admin/fiscales`: ok, no se muestra texto tecnico sobre password temporal; el bloque visible habla de activacion de cuenta en lenguaje de usuario final
- duplicado de asignacion de fiscal a torneo desde UI: ok, muestra `Ese fiscal ya estaba asignado a este torneo`
- feedback de exito luego de crear equipo desde UI: ok, se muestra aviso cerrable y desaparece automaticamente luego de unos segundos
- feedback de error luego de duplicar asignacion de fiscal: ok, permanece visible hasta nueva accion o cierre manual
- ausencia de `window.alert`, `window.confirm` y `window.prompt` en `frontend/`: ok por inspeccion con `rg`
- links de activacion al frontend: ok por configuracion (`APP_BASE_URL`) e inspeccion de codigo en backend; el flujo de activacion frontend quedo revalidado con token controlado
- emails con presentacion cuidada: ok por inspeccion de plantilla HTML en `notifications.service.ts`; no hubo validacion extremo a extremo de inbox real en esta pasada

## Defectos 2026-04-22 Post UX/UI

- defecto abierto:
  - `status`: open
  - `owner`: `frontend_web`
  - `titulo`: copy visible con error gramatical en ABM de embarcaciones
  - `evidencia`: en `/admin/embarcaciones` el formulario muestra `Nuevo embarcación` en lugar de una forma correcta para usuario final
  - `impacto`: incumple el criterio explicitado por usuario de mantener ortografia y copy final cuidados en español
  - `severidad`: baja
- observacion operativa no bloqueante:
  - el diseño HTML de emails quedó mejorado por inspeccion de plantilla, pero la entrega y visualizacion en inbox real sigue condicionada por el entorno de correo local

## Riesgo Remanente 2026-04-22 Post UX/UI

- la remediacion UX/copy/visual quedó mayormente validada en navegador real
- no reaparecieron textos tecnicos visibles como `PKG-001`, `PENDING_EMAIL_VERIFICATION`, `Baja lógica`, `soft delete` o errores crudos de servidor en los flujos revalidados
- persiste una deuda menor de copy visible en frontend
- la validacion de emails sigue siendo parcial: plantilla y URL correctas por codigo/configuracion, pero sin evidencia de inbox real en esta corrida

## Conclusion Operativa 2026-04-22 Post UX/UI

- conclusion: `requiere remediacion frontend`
- estado general:
  - los puntos reportados por usuario quedaron mayormente corregidos
  - la integracion frontend + backend funciona
  - el flujo de activacion ya abre en frontend y completa contra backend
  - el error funcional de duplicado de asignacion de fiscal ya es apto para usuario final
- motivo para no cerrar aun `PKG-001`:
  - queda al menos un defecto visible de copy en frontend (`Nuevo embarcación`)
- dueño recomendado: `frontend_web`
- siguiente agente recomendado: `frontend_web`

## Pasada Corta 2026-04-22 Confirmacion Final

- alcance de esta pasada:
  - verificacion puntual del copy corregido en `/admin/embarcaciones`
  - revision de textos equivalentes del mismo flujo para asegurar que no reaparezca el error gramatical
- metodologia:
  - inspeccion puntual del componente compartido en `frontend/src/components/admin-pages.tsx`
  - busqueda dirigida de cadenas conflictivas e inspeccion del patron de titulos y mensajes de exito
  - validacion tecnica minima de frontend con `npm run lint` y `npm run build`

## Casos Ejecutados 2026-04-22 Confirmacion Final

- verificacion del formulario de `/admin/embarcaciones`: ok, el titulo esperado queda como `Nueva embarcación`
- verificacion del patron compartido para la entidad `embarcación`: ok, el componente usa genero gramatical femenino para:
  - titulo de alta
  - mensaje de creacion exitosa
  - mensaje de actualizacion exitosa
- busqueda puntual en `frontend/`:
  - sin coincidencias de `Nuevo embarcación`
  - sin coincidencias de variantes defectuosas equivalentes alrededor del mismo flujo
- validacion tecnica:
  - `npm run lint`: ok
  - `npm run build`: ok

## Defectos 2026-04-22 Confirmacion Final

- no se detectaron defectos abiertos en esta pasada corta
- el defecto previo de copy en embarcaciones queda:
  - `status`: resolved
  - `owner`: `frontend_web`
  - `evidencia de cierre`: el flujo de embarcaciones ya presenta `Nueva embarcación` y no reaparecen textos equivalentes incorrectos en el mismo patron

## Conclusion Operativa 2026-04-22 Confirmacion Final

- conclusion: `apto para cierre de PKG-001`
- `PKG-001` puede cerrarse
- no quedan defectos abiertos en la linea de remediacion de copy de embarcaciones
- siguiente agente recomendado: `orchestrator`

## Pasada Visual 2026-04-23 Revalidacion Segunda Correccion

- alcance de esta pasada:
  - revalidacion visual puntual de densidad de backoffice sobre `/admin/equipos`, `/admin/embarcaciones` y `/admin/fiscales`
  - foco sobre alturas de botones, cortes de texto en acciones de tabla, altura de campos y estabilidad del layout en escritorio
- entorno usado:
  - backend en `http://localhost:3004`
  - frontend reconstruido con `npm run build` y servido en `http://localhost:3005`
  - navegador real en viewport de escritorio `1440x1200`
- evidencia generada:
  - `output/playwright/admin-equipos-2.png`
  - `output/playwright/admin-embarcaciones-2.png`
  - `output/playwright/admin-fiscales-2.png`

## Casos Ejecutados 2026-04-23 Revalidacion Segunda Correccion

- `GET /admin/equipos`: ok, formulario compacto y legible; input principal ~`40px` de alto y boton `Crear equipo` ~`38px`
- acciones de tabla en `/admin/equipos`: ok, `Editar` y `Dar de baja` sin cortes de texto y con altura consistente ~`38px`
- `GET /admin/embarcaciones`: ok, formulario compacto y legible; ambos inputs ~`40px` de alto y boton `Crear embarcación` ~`38px`
- acciones de tabla en `/admin/embarcaciones`: ok, `Editar` y `Dar de baja` sin cortes de texto y con altura consistente ~`38px`
- `GET /admin/fiscales`: no ok, persiste layout de escritorio desbalanceado; la columna del formulario queda de ~`147px` de ancho frente a ~`943px` del listado
- formulario de `/admin/fiscales`: no ok, aunque inputs y boton ya bajaron a ~`40px`/`38px`, el ancho util del formulario es insuficiente y deja campos de ~`47px` a `109px`, afectando legibilidad y densidad real
- acciones `Quitar`, `Editar` y `Dar de baja` en `/admin/fiscales`: ok, sin cortes de texto y con altura consistente ~`38px`

## Defectos 2026-04-23 Revalidacion Segunda Correccion

- defecto abierto:
  - `status`: open
  - `owner`: `frontend_web`
  - `titulo`: layout de escritorio roto en `/admin/fiscales`
  - `evidencia`: `output/playwright/admin-fiscales-2.png`
  - `detalle tecnico acotado`: el formulario de fiscales sigue usando `split-card` en vez del patron corregido `split-card-form`, por lo que la columna izquierda colapsa a ~`147px`
  - `impacto`: incumple el criterio de conservar legibilidad y no romper layout en escritorio
  - `severidad`: media

## Conclusion Operativa 2026-04-23 Revalidacion Segunda Correccion

- conclusion: `requiere remediacion frontend`
- estado general:
  - `equipos` y `embarcaciones` quedaron visualmente aptos para el objetivo de densidad
  - las acciones de tabla evaluadas ya no muestran sobredimensionamiento ni cortes de texto
  - el bloqueo remanente queda concentrado en el layout de `/admin/fiscales`
- siguiente agente recomendado: `frontend_web`

## Pasada Visual 2026-04-23 Revalidacion Final Fiscales

- alcance de esta pasada:
  - revalidacion puntual de `/admin/fiscales` luego de la tercera correccion orientada a evitar el colapso de la columna del formulario en escritorio
- entorno usado:
  - backend en `http://localhost:3004`
  - frontend reconstruido con `npm run build` y servido en `http://localhost:3005`
  - navegador real en viewport `1440x1200`
- evidencia generada:
  - `output/playwright/admin-fiscales-3.png`

## Casos Ejecutados 2026-04-23 Revalidacion Final Fiscales

- `GET /admin/fiscales`: ok, el formulario ya no colapsa de ancho en escritorio
- medicion de layout:
  - columna formulario: ~`588px`
  - columna listado: ~`462px`
  - inputs en grilla: ~`268px` de ancho y `40px` de alto
  - input de documento: ~`550px` de ancho y `40px` de alto
  - boton `Crear fiscal`: ~`38px` de alto
- acciones `Quitar`, `Editar` y `Dar de baja`: ok, sin cortes de texto y con altura consistente ~`38px`

## Defectos 2026-04-23 Revalidacion Final Fiscales

- no se detectaron defectos visuales remanentes en `/admin/fiscales` para el alcance puntual de esta pasada
- el defecto previo de colapso de layout en escritorio queda:
  - `status`: resolved
  - `owner`: `frontend_web`
  - `evidencia de cierre`: `output/playwright/admin-fiscales-3.png`

## Conclusion Operativa 2026-04-23 Revalidacion Final Fiscales

- conclusion: `apto`
- el formulario de `/admin/fiscales` ya no colapsa de ancho en escritorio
- la remediacion puntual de densidad y layout queda validada para esta pantalla

## Pasada Visual 2026-04-23 CRUD Backoffice Drawer

- alcance de esta pasada:
  - validacion UX y regresion visual de la remediacion estructural `toolbar + listado + drawer` en `/admin/torneos`, `/admin/equipos`, `/admin/embarcaciones`, `/admin/participantes` y `/admin/fiscales`
  - foco en protagonismo de tabla, CTA principal, drawer de alta/edicion, paneles laterales relacionales, estados `sin resultados`, balance del shell administrativo y legibilidad en desktop
- marco de evaluacion aplicado:
  - skill `crud-ui-ux`
  - criterio de tablas protagonistas, acciones destructivas subordinadas, continuidad de contexto con drawer y separacion clara de relaciones
- entorno usado:
  - backend en `http://localhost:3004`
  - frontend en `http://localhost:3005`
  - navegador real en viewport `1440x1200`
- preparacion de entorno:
  - se creo cuenta administrativa controlada `qa-admin-ui-20260423@example.com` por base local para ejecutar la pasada, ya que no habia una credencial operativa documentada para esta validacion puntual
- evidencia generada:
  - `output/playwright/admin-torneos-crud-2026-04-23.png`
  - `output/playwright/admin-torneos-drawer-crud-2026-04-23.png`
  - `output/playwright/admin-equipos-crud-2026-04-23.png`
  - `output/playwright/admin-equipos-drawer-crud-2026-04-23.png`
  - `output/playwright/admin-embarcaciones-crud-2026-04-23.png`
  - `output/playwright/admin-embarcaciones-drawer-crud-2026-04-23.png`
  - `output/playwright/admin-participantes-crud-2026-04-23.png`
  - `output/playwright/admin-participantes-drawer-crud-2026-04-23.png`
  - `output/playwright/admin-fiscales-crud-2026-04-23.png`
  - `output/playwright/admin-fiscales-drawer-crud-2026-04-23.png`

## Casos Ejecutados 2026-04-23 CRUD Backoffice Drawer

- `GET /admin/torneos`: ok, toolbar visible con busqueda local, CTA `Nuevo torneo`, tabla protagonista y accion destructiva visualmente subordinada
- `GET /admin/torneos` con busqueda sin coincidencias: ok, muestra `No encontramos resultados`
- drawer de `torneos`: ok, abre en panel lateral amplio, mantiene contexto del listado y presenta foco inicial visible
- `GET /admin/equipos`: ok, toolbar visible, CTA `Nuevo equipo`, listado protagonista y accion `Dar de baja` menos prominente que `Editar`
- `GET /admin/equipos` con busqueda sin coincidencias: ok, muestra `No encontramos resultados`
- drawer de `equipos`: ok, abre en panel lateral corto y mantiene el listado como contexto
- `GET /admin/embarcaciones`: ok, toolbar visible, CTA `Nueva embarcación`, listado protagonista y jerarquia correcta entre nombre y matricula
- `GET /admin/embarcaciones` con busqueda sin coincidencias: ok, muestra `No encontramos resultados`
- drawer de `embarcaciones`: ok, abre en panel lateral corto y mantiene el listado como contexto
- `GET /admin/participantes`: no ok completo; el patron general se alinea al objetivo, pero la tabla en desktop requiere scroll horizontal y deja acciones parcialmente fuera de vista
- `GET /admin/participantes` con busqueda sin coincidencias: ok, muestra `No encontramos resultados` y el panel lateral pasa a estado vacio `Sin participante seleccionado`
- panel lateral de `participantes`: ok, es usable, muestra vinculos actuales y permite seleccionar otro registro sin editar dentro de la fila
- drawer de `participantes`: ok, la edicion queda fuera de fila y mantiene contexto
- `GET /admin/fiscales`: no ok completo; el patron general se alinea al objetivo, pero la tabla en desktop requiere scroll horizontal y el contador visible muestra copy incorrecto `2 fiscals`
- `GET /admin/fiscales` con busqueda sin coincidencias: ok, muestra `No encontramos resultados` y el panel lateral pasa a estado vacio `Sin fiscal seleccionado`
- panel lateral de `fiscales`: ok, asignaciones y remociones quedan separadas de la fila principal
- drawer de `fiscales`: ok, la edicion queda fuera de fila y mantiene contexto
- shell administrativo en desktop: ok, sidebar mas liviana y proporcion razonable respecto al area util; medicion DOM en `/admin/fiscales`:
  - sidebar ~`248px`
  - main ~`1192px`
  - sin overflow horizontal del shell a `1440px`
- consola de navegador durante la pasada: ok, sin errores ni warnings nuevos

## Defectos 2026-04-23 CRUD Backoffice Drawer

- defecto abierto:
  - `status`: open
  - `owner`: `frontend_web`
  - `titulo`: tablas de `participantes` y `fiscales` desbordan horizontalmente en desktop y recortan acciones clave
  - `evidencia`:
    - `output/playwright/admin-participantes-crud-2026-04-23.png`
    - `output/playwright/admin-fiscales-crud-2026-04-23.png`
    - medicion DOM `participantes`: `wrapClientWidth=678`, `wrapScrollWidth=927`, `overflowsX=true`
    - medicion DOM `fiscales`: `wrapClientWidth=678`, `wrapScrollWidth=1000`, `overflowsX=true`
  - `impacto`: incumple el objetivo de tabla protagonista legible en desktop; obliga a scroll horizontal para completar lectura y descubrir acciones
  - `severidad`: media
- defecto abierto:
  - `status`: open
  - `owner`: `frontend_web`
  - `titulo`: copy visible incorrecto en contador de resultados de `fiscales`
  - `evidencia`:
    - `output/playwright/admin-fiscales-crud-2026-04-23.png`
    - el toolbar muestra `2 fiscals` y en sin resultados muestra `0 fiscals`
  - `impacto`: incumple el criterio de copy final en español y expone pluralizacion tecnica no apta para usuario final
  - `severidad`: baja

## Riesgo Remanente 2026-04-23 CRUD Backoffice Drawer

- el patron `toolbar + listado + drawer` ya quedo bien encaminado en `torneos`, `equipos` y `embarcaciones`
- `participantes` y `fiscales` mejoraron la separacion entre lectura, edicion y relaciones, pero todavia tienen deuda de legibilidad horizontal en desktop
- no se ejercio un estado vacio real de datos porque las entidades ya tenian registros cargados; se revalido `sin resultados` con evidencia directa

## Conclusion Operativa 2026-04-23 CRUD Backoffice Drawer

- conclusion: `requiere remediacion frontend`
- motivo:
  - quedan dos defectos visibles y accionables en el alcance pedido
  - el mas relevante es el scroll horizontal en tablas relacionales de desktop
- estado general:
  - `torneos`, `equipos` y `embarcaciones`: aptos para el patron nuevo
  - `participantes` y `fiscales`: parcialmente alineados, pero no listos para cierre visual final por legibilidad y copy

## Pasada Final 2026-04-23 Revalidacion Puntual Participantes Y Fiscales

- alcance de esta pasada:
  - revalidacion final en navegador real sobre `/admin/participantes` y `/admin/fiscales`
  - foco exclusivo en overflow horizontal desktop, remocion de acciones redundantes por fila, resumen de vinculos/asignaciones y plural visible de `fiscales`
- nota de ejecucion:
  - la primera instancia servida en `3005` no reflejaba los cambios ya presentes en `frontend/src/components/admin-pages.tsx`
  - para validar el resultado real actualizado se ejecuto `npm run build` y se reinicio `next start` en `frontend/`
- entorno usado:
  - frontend en `http://localhost:3005`
  - backend en `http://localhost:3004`
  - navegador real en viewport `1440x1200`
- evidencia generada:
  - `output/playwright/admin-participantes-final-retest-2-2026-04-23.png`
  - `output/playwright/admin-fiscales-final-retest-2026-04-23.png`

## Casos Ejecutados 2026-04-23 Revalidacion Puntual Participantes Y Fiscales

- `GET /admin/participantes` luego de rebuild: no ok
  - desaparece la accion redundante `Ver vínculos`
  - los vinculos quedan resumidos (`1 equipo`, `1 embarcación`, etc.)
  - pero persiste overflow horizontal en desktop
  - medicion DOM: `wrapClientWidth=678`, `wrapScrollWidth=750`, `overflowsX=true`
- `GET /admin/fiscales` luego de rebuild: ok
  - desaparece la accion redundante `Gestionar torneos`
  - las asignaciones quedan resumidas (`3 torneos`, `... y más`)
  - el contador visible queda correcto: `2 fiscales`
  - no queda overflow horizontal en desktop
  - medicion DOM: `wrapClientWidth=678`, `wrapScrollWidth=678`, `overflowsX=false`

## Defectos 2026-04-23 Revalidacion Puntual Participantes Y Fiscales

- defecto abierto:
  - `status`: open
  - `owner`: `frontend_web`
  - `titulo`: `/admin/participantes` todavia requiere scroll horizontal en desktop luego de resumir vinculos
  - `evidencia`:
    - `output/playwright/admin-participantes-final-retest-2-2026-04-23.png`
    - medicion DOM: `wrapClientWidth=678`, `wrapScrollWidth=750`, `overflowsX=true`
  - `impacto`: la tabla principal sigue recortando contenido y acciones en desktop, por lo que no cumple el criterio de eliminar overflow horizontal
  - `severidad`: media
- defecto cerrado:
  - `status`: resolved
  - `owner`: `frontend_web`
  - `titulo`: plural visible incorrecto en contador de `fiscales`
  - `evidencia de cierre`:
    - `output/playwright/admin-fiscales-final-retest-2026-04-23.png`
    - el toolbar muestra `2 fiscales`

## Conclusion Operativa 2026-04-23 Revalidacion Puntual Participantes Y Fiscales

- conclusion: `requiere remediacion frontend`
- resumen:
  - `/admin/fiscales`: apto en esta revalidacion puntual
  - `/admin/participantes`: no apto aun por overflow horizontal desktop remanente

## Pasada Final 2026-04-23 Cierre Participantes

- alcance de esta pasada:
  - verificacion puntual final solo sobre `/admin/participantes`
  - foco en confirmar eliminacion del overflow horizontal desktop luego de combinar `Cuenta` + `Estado` y resumir `Vínculos`
- nota de ejecucion:
  - se ejecuto `npm run build` y se reinicio `next start` en `frontend/` antes de validar para asegurar que la instancia servida refleje el cambio final
- entorno usado:
  - frontend en `http://localhost:3005`
  - navegador real en viewport `1440x1200`
- evidencia generada:
  - `output/playwright/admin-participantes-final-closeout-2026-04-23.png`

## Casos Ejecutados 2026-04-23 Cierre Participantes

- `GET /admin/participantes` luego del rebuild final: ok
  - la tabla ahora muestra columnas `Persona`, `Cuenta y estado`, `Vínculos` y `Acciones`
  - `Cuenta` y `Estado` quedan efectivamente combinados en una sola celda
  - `Vínculos` queda resumido en formato corto (`1 equipo · 1 embarcación`, `2 equipos · 1 embarcación`)
  - no queda scroll horizontal en desktop
  - medicion DOM: `wrapClientWidth=678`, `wrapScrollWidth=678`, `overflowsX=false`

## Conclusion Operativa 2026-04-23 Cierre Participantes

- conclusion: `apto`
- cierre final de esta remediacion UX:
  - `/admin/participantes` ya no presenta overflow horizontal en desktop
  - con esta pasada final, la remediacion UX puntual de `participantes` queda cerrada

## Cierre Puntual 2026-04-24 RF-002 Desvinculacion De Participantes

- alcance:
  - quitar vinculo de participante con equipo
  - quitar vinculo de participante con embarcacion
- validacion ejecutada:
  - backend `npm run lint`, `npm run build`, `npm run test:smoke`
  - frontend `npm run lint`, `npm run build`
  - navegador real en `/admin/participantes`
- resultado:
  - botones `Quitar` visibles por vinculo
  - feedback visible tras accion
  - estados finales `Sin equipo` y `Sin embarcacion`
- conclusion: `apto`; no se requiere nueva pasada formal de testing para cerrar `PKG-001`

## Pasada 2026-04-24 PKG-002 Backend Readiness

- alcance de esta pasada:
  - verificacion estatica y tecnica barata del backend de `PKG-002`
  - contraste contra `PKG-002`, `RF-003`, arquitectura, contratos y handoff backend
  - foco en compilacion, endpoints/DTOs, duplicados, aprobacion, rechazo, consulta publica, auditoria y no exposicion sensible
- restriccion explicita de esta pasada:
  - no se edita frontend ni se bloquea el paquete por UI aun no cerrada
  - el E2E web de `PKG-002` queda pendiente hasta que `frontend_web` cierre `/autoregistro`, `/autoregistro/estado/[lookupToken]` y `/admin/inscripciones`
- rutas revisadas:
  - `docs/05-ejecucion/paquetes/PKG-002-inscripcion-y-autoregistro.md`
  - `docs/05-ejecucion/paquetes/PKG-002-inscripcion-y-autoregistro.md`
  - `docs/03-arquitectura/contratos.md`
  - `docs/03-arquitectura/arquitectura.md`
  - `docs/02-funcional/requerimientos/RF-003-inscripcion-y-autoregistro.md`
  - `docs/04-ux-ui/ux-ui.md`
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/20260424170000_pkg002_registrations/migration.sql`
  - `backend/src/app.module.ts`
  - `backend/src/common/auth/public-auth-rate-limit.guard.ts`
  - `backend/src/modules/registrations/`

## Estrategia 2026-04-24 PKG-002 Backend Readiness

- validar primero integridad de entrega barata:
  - `npm run lint`
  - `npm run build`
  - `npm run test:smoke`
- contrastar luego:
  - presencia real de endpoints y DTOs en NestJS
  - alineacion de schema + migracion
  - reglas de negocio minimas del paquete
  - riesgos de datos sensibles y de consistencia transaccional
- registrar defectos concretos y brechas de cobertura sin esperar al frontend

## Cobertura 2026-04-24 PKG-002 Backend Readiness

- contratos backend:
  - `POST /api/v1/registrations`: presente
  - `POST /api/v1/registrations/self-register`: presente
  - `GET /api/v1/registrations`: presente
  - `GET /api/v1/registrations/{id}`: presente
  - `POST /api/v1/registrations/{id}/approve`: presente
  - `POST /api/v1/registrations/{id}/reject`: presente
  - `GET /api/v1/public/registrations/status/{lookupToken}`: presente
- DTOs validados por codigo:
  - alta administrativa requiere `tournamentId`, `participantId`, `acceptedRules: true`
  - auto-registro requiere `tournamentId`, `firstName`, `lastName`, `email`, `acceptedRules: true`; `documentId` y `phone` opcionales
  - aprobacion soporta `notes` opcional
  - rechazo soporta `reason` opcional
  - listado soporta filtros `tournamentId`, `reviewStatus`, `channel`
- persistencia:
  - tabla `Registration` y enums presentes
  - indices de lookup, aprobada unica por torneo+participante y pendientes unicas por torneo+email/documento presentes en migracion
- concerns transversales cubiertos parcialmente por revision:
  - rate limiting publico: presente, en memoria
  - auditoria declarada: presente en codigo para `registration.created`, `registration.self_registered`, `registration.approved`, `registration.rejected`
  - no exposicion sensible en endpoint publico: parcial, con brecha en `rejection_reason`
  - trazabilidad documental contrato vs implementacion: parcial, con desvio abierto

## Casos Ejecutados 2026-04-24 PKG-002 Backend Readiness

- `backend npm run lint`: ok
- `backend npm run build`: ok
- `backend npm run test:smoke`: ok tecnico, pero solo devuelve `No automated tests yet`
- revision de wiring NestJS: ok, `RegistrationsModule` importado en `AppModule` y `main.ts` mantiene prefijo global `/api/v1`
- revision de endpoints/controladores: ok, los endpoints esperados estan declarados y protegidos segun corresponda
- revision de DTOs: ok, el contrato de campos obligatorios y `acceptedRules: true` esta codificado
- revision de migracion PKG-002: ok, schema y SQL estan alineados para tabla, enums, FK e indices
- revision de duplicados:
  - ok por implementacion para pendientes por email/documento y aprobadas por torneo+participante
  - sin evidencia automatizada ni corrida HTTP/DB en esta pasada
- revision de aprobacion/rechazo:
  - ok por presencia de `409` cuando la solicitud ya esta resuelta
  - no ok para atomicidad completa de `approve`; ver defectos
- revision de consulta publica:
  - ok en que no expone email ni documento
  - no ok en criterio de exposicion segura de `rejection_reason`; ver defectos

## Defectos 2026-04-24 PKG-002 Backend Readiness

- defecto abierto:
  - `status`: open
  - `owner`: `backend_web`
  - `titulo`: `approve` crea participante/usuario fuera de la transaccion final y puede dejar residuos si la aprobacion falla
  - `evidencia`:
    - `backend/src/modules/registrations/application/registrations.service.ts:225`
    - `backend/src/modules/registrations/application/registrations.service.ts:232`
    - `backend/src/modules/registrations/application/registrations.service.ts:495`
    - `backend/src/modules/registrations/application/registrations.service.ts:536`
  - `detalle`: `resolveParticipantAndUser()` puede crear `Participant`, `User`, `UserRoleAssignment` y token de activacion antes de `ensureNoApprovedRegistrationForParticipant()` y antes del `transaction` que resuelve la inscripcion
  - `impacto`: ante conflicto tardio, carrera o fallo posterior pueden quedar identidades creadas o vinculaciones parciales sin una inscripcion aprobada que las justifique
  - `severidad`: alta
  - `remediacion sugerida`: mover resolucion/creacion de participante+usuario al mismo `transaction` que actualiza la inscripcion, o compensar explicitamente los side effects si la aprobacion no termina
- defecto abierto:
  - `status`: open
  - `owner`: `backend_web`
  - `titulo`: el endpoint publico expone `rejection_reason` sin filtro de aptitud para usuario final
  - `evidencia`:
    - `docs/03-arquitectura/contratos.md:207`
    - `backend/src/modules/registrations/application/registrations.service.ts:341`
  - `detalle`: el contrato permite devolver `rejection_reason` solo si es apta para exposicion al postulante; la implementacion devuelve cualquier texto cargado en rechazo
  - `impacto`: riesgo de filtrar copy interna, comentarios operativos o texto no apto en un endpoint publico
  - `severidad`: media
  - `remediacion sugerida`: diferenciar `internal_review_notes` de un motivo publico o aplicar sanitizacion/allowlist antes de exponerlo

## Riesgos y Gaps 2026-04-24 PKG-002 Backend Readiness

- gap de automatizacion:
  - no hay pruebas unitarias ni de integracion para `registrations`
  - el paquete pedia cubrir duplicados, aprobacion idempotente, rechazo y consulta de estado
- gap de evidencia:
  - no se ejecuto pasada HTTP con base local para probar `registration.*` en auditoria ni respuestas reales de endpoints
  - no se valido entrega real de email de activacion posterior a aprobacion
- gap de trazabilidad:
  - `HO-001` documenta que `public status` ya no devuelve `registrationId`, pero el contrato canonico todavia lo lista como respuesta minima
  - hoy no es bloqueo tecnico, pero si un desvio documental a cerrar antes de cierre formal del paquete
- riesgo residual:
  - el rate limit publico sigue siendo en memoria por proceso, suficiente para local pero no para despliegue distribuido
  - el matching por email/documento sigue sensible a historicos incompletos, como ya anticipa el paquete

## Conclusion Operativa 2026-04-24 PKG-002 Backend Readiness

- conclusion: `requiere remediacion backend y mas evidencia`
- estado general:
  - backend compila
  - endpoints y DTOs principales existen y estan conectados al modulo correcto
  - no hay evidencia automatizada del paquete
  - hay al menos dos brechas accionables antes de declarar listo el backend de `PKG-002`
- decision de avance:
  - `frontend_web` puede seguir avanzando en paralelo y no queda bloqueado por esta pasada
  - el cierre integrado web/E2E de `PKG-002` queda pendiente hasta terminar frontend y revalidar con navegador real

## Pasada 2026-04-25 PKG-002 Retest De Cierre

- alcance de esta pasada:
  - retest de `PKG-002` despues de la remediacion backend y del cierre frontend
  - revision de diffs finales sobre backend, frontend, contratos y UX
  - verificacion barata de compilacion/tipado para confirmar wiring final
- restricciones explicitas de esta pasada:
  - no se editaron frontend ni backend; solo evidencia y documentacion de testing
  - no se ejecuto E2E real ni HTTP contra servidores levantados porque en esta corrida no se preparo entorno con base/datos ni seeds controlados
- rutas revisadas:
  - `docs/05-ejecucion/paquetes/PKG-002-inscripcion-y-autoregistro.md`
  - `docs/05-ejecucion/paquetes/PKG-002-inscripcion-y-autoregistro.md`
  - `docs/03-arquitectura/arquitectura.md`
  - `docs/03-arquitectura/contratos.md`
  - `docs/04-ux-ui/ux-ui.md`
  - `docs/00-indice/project-state.md`
  - `backend/src/common/auth/public-auth-rate-limit.guard.ts`
  - `backend/src/modules/tournaments/application/tournaments.service.ts`
  - `backend/src/modules/tournaments/presentation/public-tournaments.controller.ts`
  - `backend/src/modules/registrations/application/registrations.service.ts`
  - `frontend/src/lib/api.ts`
  - `frontend/src/lib/labels.ts`
  - `frontend/src/components/registration-pages.tsx`
  - `frontend/app/autoregistro/page.tsx`
  - `frontend/app/autoregistro/estado/[lookupToken]/page.tsx`
  - `frontend/app/admin/inscripciones/page.tsx`
  - `frontend/app/globals.css`

## Estrategia 2026-04-25 PKG-002 Retest De Cierre

- validar primero integridad tecnica barata en ambos lados:
  - frontend `npm run lint`
  - frontend `npm run build`
  - backend `npm run lint`
  - backend `npm run build`
  - backend `npm run test:smoke`
- contrastar luego implementacion real contra:
  - alcance y criterios de `PKG-002`
  - `RF-003`
  - contratos publicos/admin
  - UX ejecutable de `/autoregistro`, `/autoregistro/estado/[lookupToken]` y `/admin/inscripciones`
- cerrar especificamente los hallazgos previos:
  - atomicidad de `approve`
  - no exposicion de motivo libre en endpoint publico
  - consumo frontend del endpoint publico de torneos para auto-registro
- registrar defectos reales, gaps de cobertura y riesgo residual sin inventar evidencia E2E inexistente

## Cobertura 2026-04-25 PKG-002 Retest De Cierre

- backend revalidado por codigo:
  - `GET /api/v1/public/tournaments/registration-options`: presente; lista solo `PUBLISHED | ACTIVE`
  - `GET /api/v1/public/registrations/status/{lookupToken}`: presente; ya no devuelve `rejection_reason`
  - `POST /api/v1/registrations/{id}/approve`: resuelve participante/usuario dentro de `transaction` serializable
- frontend revalidado por codigo:
  - `/autoregistro`: consume `GET /api/v1/public/tournaments/registration-options`
  - `/autoregistro/estado/[lookupToken]`: consume `GET /api/v1/public/registrations/status/:lookupToken`
  - `/admin/inscripciones`: consume `GET /api/v1/registrations`, `GET /api/v1/registrations/:id`, `POST /approve` y `POST /reject`
  - navegacion administrativa incorpora `Inscripciones`
- trazabilidad a requerimientos y UX:
  - `PKG-002` y `RF-003`: auto-registro, consulta publica de estado y revision administrativa cubiertos por lectura de implementacion
  - contratos: endpoint publico nuevo alineado en docs y en codigo
  - UX/UI: labels visibles derivados, feedback persistente y patron admin cubiertos parcialmente; ver defecto abierto por reglamento

## Cobertura Transversal 2026-04-25 PKG-002 Retest De Cierre

- seguridad y no exposicion sensible:
  - ok por revision de codigo: token de consulta hasheado en persistencia y consulta publica sin email, documento ni ids internos
  - ok por revision de codigo: `rejection_reason` ya no sale en el endpoint publico
- rate limiting publico:
  - ok por presencia en `PublicAuthRateLimitGuard` para `self-register`, `public status` y `registration-options`
  - gap: no hubo evidencia HTTP real ni validacion distribuida; sigue siendo en memoria por proceso
- auditoria:
  - ok por presencia de `registration.self_registered`, `registration.approved`, `registration.rejected`
  - gap: no se ejecuto corrida real para comprobar eventos persistidos
- notificaciones y activacion:
  - ok por wiring de envio de email de activacion luego de `approve`
  - gap: sin evidencia real de entrega, contenido ni idempotencia en esta pasada
- UX/copy:
  - ok parcial: estados visibles y mensajes principales estan mapeados
  - no ok: `Leer reglamento` sigue como control placeholder visible; ver defectos

## Casos Ejecutados 2026-04-25 PKG-002 Retest De Cierre

- `frontend npm run lint`: ok
- `frontend npm run build`: ok
  - se generan `/autoregistro`, `/autoregistro/estado/[lookupToken]` y `/admin/inscripciones`
- `backend npm run lint`: ok
- `backend npm run build`: ok
- `backend npm run test:smoke`: ok tecnico, pero sigue devolviendo `No automated tests yet`
- revision de remediacion backend previa:
  - ok: `approve()` mueve la resolucion de participante/usuario al mismo `transaction` serializable que actualiza la inscripcion
  - ok: `publicStatus()` ya no expone motivo libre de rechazo
- revision de integracion frontend/backend:
  - ok: `/autoregistro` ya no consume `GET /api/v1/tournaments`; usa `GET /api/v1/public/tournaments/registration-options`
  - ok: `project-state` y contratos reflejan el endpoint publico nuevo
  - no ok: `HO-002` quedo con riesgo stale y sigue describiendo el gap viejo del selector publico
- E2E no ejecutado:
  - sin servidor levantado ni dataset controlado no se verificaron formularios reales, toasts, drawer mobile, auditoria persistida ni entrega de email

## Defectos 2026-04-25 PKG-002 Retest De Cierre

- defecto resuelto:
  - `status`: resolved
  - `owner`: `backend_web`
  - `titulo`: `approve` deja de crear residuos fuera de la transaccion final
  - `evidencia`:
    - `backend/src/modules/registrations/application/registrations.service.ts`
  - `detalle`: la resolucion de participante/usuario ahora vive dentro del mismo `transaction` serializable que actualiza la inscripcion
- defecto resuelto:
  - `status`: resolved
  - `owner`: `backend_web`
  - `titulo`: la consulta publica deja de exponer motivo libre de rechazo
  - `evidencia`:
    - `backend/src/modules/registrations/application/registrations.service.ts`
    - `docs/03-arquitectura/contratos.md`
  - `detalle`: `publicStatus()` retorna solo `tournamentName`, estados, `account_status` y `next_action`
- defecto abierto:
  - `status`: open
  - `owner`: `software_architect` + `backend_web` + `frontend_web`
  - `titulo`: `/autoregistro` muestra `Leer reglamento` pero el control no es navegable ni presenta el reglamento aprobado
  - `evidencia`:
    - `docs/04-ux-ui/ux-ui.md`
    - `docs/05-ejecucion/paquetes/PKG-002-inscripcion-y-autoregistro.md`
    - `frontend/src/components/registration-pages.tsx`
  - `detalle`: el flujo exige aceptacion de reglamento y la UX aprobada define un link secundario `Leer reglamento`, pero la implementacion usa `href=\"#\"` con `preventDefault()`. La persona debe aceptar sin poder abrir el contenido del reglamento desde la pantalla
  - `impacto`: degrada la validez operativa del consentimiento, deja un control placeholder visible y contradice la UX aprobada para el flujo publico
  - `severidad`: media
  - `remediacion sugerida`: definir una fuente publica aprobada para el reglamento por torneo y conectarla al link, o reemplazar el link por una presentacion aprobada del reglamento usando el dato disponible en contrato

## Riesgos y Gaps 2026-04-25 PKG-002 Retest De Cierre

- gap de automatizacion:
  - el paquete sigue sin pruebas unitarias, integracion ni E2E automatizados para `registrations`
  - `test:smoke` no da cobertura funcional del modulo
- gap de evidencia:
  - no hay corrida real de auditoria, de emails de activacion ni de respuestas HTTP con base local sembrada
  - no hay verificacion con navegador real sobre mobile, drawer, focus y copy final visible
- gap documental (historico, resuelto):
  - el registro de cierre ya no conserva un handoff separado; la especificacion final esta consolidada en `PKG-002`
  - `docs/00-indice/project-state.md` fue actualizado en la limpieza de publicacion
- riesgo residual:
  - el rate limit publico sigue siendo en memoria por proceso
  - la entregabilidad de email real sigue dependiendo de configuracion externa
  - falta validar con datos reales duplicados, conflicto `409`, rechazo con y sin motivo y flujo `PENDING_ACCOUNT_ACTIVATION`

## Conclusion Operativa 2026-04-25 PKG-002 Retest De Cierre

- outcome de ejecucion: `completed`
- conclusion: `no listo para cierre funcional limpio`
- estado general:
  - backend y frontend compilan con el wiring final esperado para `PKG-002`
  - los dos defectos backend abiertos en la pasada anterior quedaron revalidados como resueltos
  - el endpoint publico `GET /api/v1/public/tournaments/registration-options` esta integrado en frontend
  - queda un defecto UX real en `Leer reglamento` y persisten gaps de evidencia E2E/auditoria/email
- decision de avance:
  - no recomiendo declarar cierre final de `PKG-002` hasta resolver el acceso al reglamento desde `/autoregistro`
  - si el equipo decide diferir ese punto, la decision debe quedar explicitada como excepcion de alcance/UX y no como cierre limpio
- sugerencias para `docs/00-indice/project-state.md`:
  - actualizar `Testing En Curso` a retest ejecutado de `PKG-002` con backend/frontend compilando y un defecto UX abierto sobre reglamento
  - registrar que los hallazgos backend previos quedaron cerrados
  - mover el pendiente principal de `PKG-002` a resolucion del acceso al reglamento y validacion E2E real cuando exista entorno/datos

## Pasada 2026-04-28 PKG-002 Retest De Cierre Con Alta Administrativa

- alcance de esta pasada:
  - retest de cierre de `PKG-002` luego de completar el flujo de alta administrativa en backoffice
  - foco principal sobre `/admin/inscripciones`
  - regresion real de auto-registro, consulta publica de estado y revision administrativa existente
- entorno usado:
  - la instancia residente en `http://localhost:3005` devolvia `Server Error` de Next.js al abrir `/login`
  - para no interferir con procesos ajenos y separar problema de entorno vs producto, la validacion real se ejecuto en un par limpio:
    - backend: `http://localhost:3016/api/v1`
    - frontend: `http://localhost:3017`
    - `APP_BASE_URL=http://localhost:3017`
    - `CORS_ALLOWED_ORIGINS=http://localhost:3017`
    - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3016/api/v1`
- datos de QA controlados:
  - torneo publicado `Torneo QA PKG002 20260428`
  - admin `qa-pkg002-admin-20260428@example.com`
  - participante con cuenta `ACTIVE`
  - participante con cuenta `PENDING_EMAIL_VERIFICATION`
  - postulantes unicos para auto-registro de aprobacion, rechazo y smoke visual de `/autoregistro`
- evidencia generada:
  - `output/playwright/pkg002-admin-ready-to-compete-2026-04-28.png`
  - `output/playwright/pkg002-admin-pending-activation-2026-04-28.png`
  - `output/playwright/pkg002-public-pending-activation-2026-04-28.png`
  - `output/playwright/pkg002-public-self-register-success-2026-04-28.png`

## Estrategia 2026-04-28 PKG-002 Retest De Cierre Con Alta Administrativa

- validar primero sanidad tecnica barata:
  - `frontend npm run lint`
  - `frontend npm run build`
  - `backend npm run lint`
  - `backend npm run build`
  - `backend npm run test:smoke`
- ejecutar despues una pasada real combinando:
  - navegador real sobre `/admin/inscripciones`, `/autoregistro` y `/autoregistro/estado/[lookupToken]`
  - llamadas HTTP reales a endpoints publicos para confirmar estados y token lookup
  - consultas puntuales a base local para verificar persistencia, cuentas derivadas y auditoria
- contrastar cada evidencia contra:
  - `PKG-002`
  - `RF-003`
  - `docs/03-arquitectura/contratos.md`
  - `docs/04-ux-ui/ux-ui.md`
  - `RNF-001`

## Cobertura 2026-04-28 PKG-002 Retest De Cierre Con Alta Administrativa

- alta administrativa en backoffice:
  - creacion feliz desde `/admin/inscripciones`
  - resultado `READY_TO_COMPETE`
  - resultado `PENDING_ACCOUNT_ACTIVATION`
  - intento duplicado sobre mismo torneo + participante
  - visibilidad en listado y drawer de detalle
- auto-registro y consulta publica:
  - carga visual de `/autoregistro`
  - apertura inline de `Leer reglamento` con `rulesSummary`
  - envio exitoso desde UI con panel persistente, codigo de consulta y CTA a estado
  - consulta publica de estado para:
    - `PENDING_REVIEW`
    - `PENDING_ACCOUNT_ACTIVATION`
    - `REJECTED`
    - token invalido
- revision administrativa existente:
  - apertura de solicitud `SELF_SERVICE` en drawer
  - aprobacion desde dialogo con avance automatico a la siguiente pendiente
  - rechazo con motivo desde dialogo
- concerns transversales cubiertos en esta pasada:
  - no exposicion sensible en UI publica y endpoint publico
  - auditoria persistida de `registration.created`, `registration.self_registered`, `registration.approved`, `registration.rejected` y `user.created` cuando la aprobacion crea identidad
  - validacion parcial de activacion posterior a aprobacion por creacion real de `User` + token de verificacion

## Casos Ejecutados 2026-04-28 PKG-002 Retest De Cierre Con Alta Administrativa

- `frontend npm run lint`: ok
- `frontend npm run build`: ok
- `backend npm run lint`: ok
- `backend npm run build`: ok
- `backend npm run test:smoke`: ok tecnico, sigue devolviendo `No automated tests yet`
- `GET /login` en `http://localhost:3005`: no usable por `Server Error` de Next.js en esa instancia residente
- `GET /login` en `http://localhost:3017`: ok; login real con `qa-pkg002-admin-20260428@example.com`: ok
- `/admin/inscripciones` con filtro inicial `Pendiente de revision`: ok; bandeja vacia consistente antes de sembrar solicitudes
- alta administrativa sobre participante con cuenta `ACTIVE`: ok
  - toast visible: `Inscripción creada. Ya quedó habilitada para competir.`
  - listado filtrado por torneo + canal `Carga administrativa`: ok
  - drawer: ok, muestra `Habilitada para competir`, cuenta `Activa`, participante vinculado y resolucion por admin
- duplicado de la misma alta administrativa: ok
  - UI muestra error funcional persistente
  - no se crea segunda inscripcion
- alta administrativa sobre participante con cuenta `PENDING_EMAIL_VERIFICATION`: ok
  - toast visible: `Inscripción creada. Falta que active su cuenta desde el email.`
  - listado y drawer: ok
  - drawer muestra `Pendiente de activación`, cuenta `Pendiente de activación` y participante habilitado
- `POST /registrations/self-register` x2 contra backend limpio: ok
  - ambas solicitudes nacen en `PENDING_REVIEW`
  - `lookup_token` devuelto solo en respuesta de alta: ok
- `GET /public/registrations/status/{lookupToken}` antes de resolver: ok
  - estado visible `PENDING_REVIEW`
  - sin email, documento ni ids internos
- `/autoregistro` desde UI limpia: ok
  - selector de torneo visible
  - `Leer reglamento` despliega `rulesSummary` inline
  - envio exitoso muestra panel persistente con `Código de consulta`, `Consultar estado` y `Copiar enlace`
- aprobacion administrativa de solicitud `SELF_SERVICE`: ok
  - se abre desde drawer con CTA `Aprobar inscripción`
  - luego de aprobar, la bandeja filtrada en `Pendiente de revisión` avanza sola a la siguiente pendiente
  - toast visible: `Inscripción aprobada. Falta que active su cuenta desde el email.`
  - persistencia verificada: se crea `Participant`, `User` `PARTICIPANT`, token de verificacion y auditoria `user.created`
- rechazo administrativo de segunda solicitud `SELF_SERVICE` con motivo: ok
  - dialogo acepta motivo
  - luego de rechazar, la bandeja queda en empty state `No hay pendientes para revisar`
- `/autoregistro/estado/[lookupToken]` luego de aprobar: ok
  - UI muestra `Pendiente de activación`
  - no expone email, documento ni ids internos
- `/autoregistro/estado/[lookupToken]` luego de rechazar: ok
  - UI muestra `Rechazada`
  - no expone el motivo libre cargado internamente
- `/autoregistro/estado/[lookupToken]` con token invalido: ok
  - UI usa mensaje uniforme `No pudimos abrir esta consulta`
- verificacion por base local: ok
  - altas administrativas persisten `reviewStatus=APPROVED`
  - auto-registro aprobado persiste `reviewStatus=APPROVED` + `participant.user.accountStatus=PENDING_EMAIL_VERIFICATION`
  - auto-registro rechazado persiste `reviewStatus=REJECTED`
  - auditoria encontrada para `registration.created`, `registration.self_registered`, `registration.approved`, `registration.rejected` y `user.created`

## Cobertura Transversal 2026-04-28 PKG-002 Retest De Cierre Con Alta Administrativa

- seguridad y no exposicion sensible:
  - ok en corrida real: la UI publica y el endpoint publico no muestran email, documento ni ids internos
  - ok en corrida real: el rechazo visible al postulante deriva de estado y siguiente paso; el motivo libre queda interno
- auditoria y trazabilidad:
  - ok con evidencia en base local para eventos de alta administrativa, auto-registro, aprobacion, rechazo y alta de usuario derivada
- notificaciones y activacion:
  - ok parcial: la aprobacion que requiere cuenta crea `User` pendiente y token de verificacion real
  - gap: no hubo validacion de inbox real ni de entregabilidad extremo a extremo del email
- rate limiting publico:
  - cubierto solo por lectura de wiring y smoke funcional simple
  - no se ejecuto estres ni validacion distribuida
- UX/copy:
  - ok en corrida real: `Leer reglamento` ya no es placeholder; despliega el contenido inline
  - ok en corrida real: toasts, empty states y estados derivados visibles son aptos para usuario final

## Defectos 2026-04-28 PKG-002 Retest De Cierre Con Alta Administrativa

- no se detectaron issues bloqueantes nuevos de producto en esta pasada
- defecto resuelto:
  - `status`: resolved
  - `owner`: `frontend_web`
  - `titulo`: `/autoregistro` ya no deja `Leer reglamento` como placeholder sin contenido
  - `evidencia`:
    - `frontend/src/components/registration-pages.tsx`
    - `output/playwright/pkg002-public-self-register-success-2026-04-28.png`
  - `detalle`: el flujo ahora abre `rulesSummary` inline para el torneo seleccionado y permite aceptar reglamento con contenido visible
- observacion operativa no bloqueante:
  - la instancia residente en `http://localhost:3005` estaba rota al inicio de la pasada (`Server Error` de Next.js), pero la build limpia del repo y la corrida aislada en `3016/3017` no reprodujeron ese problema
  - tratar como ruido de entorno local o proceso stale hasta que alguien necesite dejar `3005` estable nuevamente

## Riesgos y Gaps 2026-04-28 PKG-002 Retest De Cierre Con Alta Administrativa

- gap de automatizacion:
  - `registrations` sigue sin pruebas unitarias, integracion ni E2E automatizados
  - `test:smoke` no aporta cobertura funcional
- gap de entorno:
  - la corrida cerrada de producto requirio aislar frontend/backend en puertos alternativos por una instancia local previa no confiable
- riesgo residual:
  - la entregabilidad real del email de activacion posterior a aprobacion sigue sin evidencia de inbox
  - el rate limiting publico sigue en memoria por proceso
  - no se revalido comportamiento mobile/drawer full-screen en esta pasada de cierre

## Conclusion Operativa 2026-04-28 PKG-002 Retest De Cierre Con Alta Administrativa

- outcome de ejecucion: `completed`
- conclusion: `apto para cierre operativo de PKG-002`
- estado general:
  - `/admin/inscripciones` ya permite alta administrativa usable en backoffice
  - la creacion administrativa cubre correctamente `Habilitada para competir` y `Pendiente de activación`
  - el duplicado admin queda bloqueado con feedback funcional
  - auto-registro, consulta publica de estado y revision administrativa existente quedaron revalidados con corrida real
  - el defecto previo del reglamento queda cerrado
- sugerencias para `docs/00-indice/project-state.md`:
  - mover `PKG-002` a cerrado operativamente
  - dejar visible como riesgo residual no bloqueante la falta de evidencia de inbox real y la ausencia de automatizacion del modulo `registrations`
  - registrar como nota de entorno que la instancia vieja de `3005` no fue tomada como evidencia de producto

## Cobertura 2026-04-29 PKG-003 Retest De Operacion Fiscal Y Capturas

- alcance ejecutado:
  - review de alcance y contratos en `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md`, `docs/03-arquitectura/arquitectura.md`, `docs/03-arquitectura/contratos.md`, `RF-006`, `RF-007`, `RF-009` y `RF-011`
  - review de implementacion en `backend/src/modules/captures/**`, `frontend/src/components/official-pages.tsx`, `frontend/src/lib/api.ts` y `frontend/src/lib/capture-queue.ts`
  - validaciones tecnicas locales:
    - `backend npm run lint`: ok
    - `backend npm run build`: ok
    - `backend npm run test:smoke`: ok tecnico, sigue devolviendo `No automated tests yet`
    - `frontend npm run lint`: ok
    - `frontend npm run build`: ok
- limitaciones:
  - no se ejecuto E2E autenticado real de `/operacion` por falta de dataset operativo y de entorno controlado ya levantado para fiscal, participantes y torneo con hitos horarios consistentes
  - la conclusion queda basada en evidencia de contrato + wiring + compilacion, no en corrida funcional completa del flujo

## Defectos 2026-04-29 PKG-003 Retest De Operacion Fiscal Y Capturas

- `high` `backend/src/modules/captures/application/captures.service.ts:299`, `backend/src/modules/captures/application/captures.service.ts:705`
  - la edicion de capturas pendientes usa la ventana de carga (`fishingStartAt .. fishingEndAt`) en lugar de la ventana de edicion/validacion (`now <= validationDeadlineAt`)
  - impacto: una captura `PENDING_VALIDATION` deja de poder corregirse apenas cierra pesca, aunque el paquete permite editarla hasta `validationDeadlineAt`
  - trazabilidad: `docs/03-arquitectura/arquitectura.md:328`, `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md:164`
- `high` `backend/src/modules/captures/application/captures.service.ts:410`, `backend/src/modules/captures/application/captures.service.ts:706`, `backend/src/modules/captures/application/captures.service.ts:725`
  - el sync offline valida solo `capturedAt` contra la ventana de pesca; no exige `now <= validationDeadlineAt` y tampoco bloquea cuando faltan `fishingStartAt`, `fishingEndAt` o `validationDeadlineAt`
  - impacto: el backend puede aceptar sincronizaciones tardias o sobre torneos con hitos horarios incompletos, contra la regla cerrada del paquete
  - trazabilidad: `docs/03-arquitectura/arquitectura.md:327`, `docs/03-arquitectura/arquitectura.md:335`, `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md:163`, `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md:166`
- `medium` `frontend/src/lib/api.ts:286`, `frontend/src/lib/api.ts:532`, `frontend/src/lib/api.ts:544`, `backend/src/modules/captures/presentation/captures.controller.ts:60`, `backend/src/modules/captures/dto/create-capture.dto.ts:48`, `backend/src/modules/captures/dto/sync-captures.dto.ts:52`, `backend/src/modules/captures/application/captures.service.ts:730`, `frontend/src/lib/capture-queue.ts:9`
  - el slice quedo implementado con JSON + `media.dataUrl` de punta a punta y la cola offline persiste base64 completo en IndexedDB; no usa `multipart/form-data` ni `photoBlob` como definieron arquitectura y contratos
  - impacto: el modulo no cumple el contrato aprobado para uploads, aumenta peso de payload/almacenamiento offline y deja el soporte de blobs fuera de la implementacion aceptada
  - trazabilidad: `docs/03-arquitectura/contratos.md:330`, `docs/03-arquitectura/contratos.md:359`, `docs/03-arquitectura/contratos.md:469`, `docs/03-arquitectura/contratos.md:562`, `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md:155`, `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md:156`

## Riesgos y Gaps 2026-04-29 PKG-003 Retest De Operacion Fiscal Y Capturas

- gap de automatizacion:
  - `captures` no aporta pruebas unitarias, integracion ni E2E; `test:smoke` sigue sin cobertura funcional
- gap de ejecucion:
  - no hay evidencia corrida de login fiscal, alta online, edicion, cola offline, sync ni validacion en navegador contra un dataset controlado
- riesgo residual:
  - no se valido tamano real de fotos, presion de IndexedDB ni comportamiento mobile/offline en dispositivos
  - no se ejercitaron permisos cruzados `ADMIN` versus `OFFICIAL` ni paginacion/filtros de bandeja

## Conclusion Operativa 2026-04-29 PKG-003 Retest De Operacion Fiscal Y Capturas

- outcome de ejecucion: `completed`
- conclusion: `no apto para cierre operativo de PKG-003 en su estado actual`
- estado general:
  - el slice compila y el wiring principal existe en backend y frontend
  - hay desalineaciones bloqueantes en reglas horarias y una desalineacion media de contrato/arquitectura en la subida y persistencia offline de fotos
- sugerencias para `docs/00-indice/project-state.md`:
  - mantener `PKG-003` en validacion o reabrirlo con foco en ventana de edicion, sync offline y alineacion del contrato de media
  - registrar como gap explicito la ausencia de automatizacion funcional del modulo `captures`

## Pasada 2026-04-29 PKG-003 Review Actualizada

- alcance de esta pasada:
  - re-review dirigido del arbol actual de `PKG-003` para validar si los hallazgos documentados mas temprano ese mismo dia siguen reproduciendo
  - contraste puntual contra `PKG-003`, arquitectura, contratos, UX/UI y requerimientos `RF-006`, `RF-007`, `RF-009` y `RF-011`
  - sanidad tecnica local de backend y frontend
- validaciones tecnicas ejecutadas:
  - `backend npm run lint`: ok
  - `backend npm run build`: ok
  - `backend npm run test:smoke`: ok tecnico, sigue devolviendo `No automated tests yet`
  - `frontend npm run build`: ok
  - `frontend npm run lint`: no ok; falla por referencias faltantes en `.next/types/app/login/page.ts`, `.next/types/app/operacion/layout.ts` y `.next/types/app/operacion/page.ts`
- aclaracion de trazabilidad:
  - los dos hallazgos horarios listados en la seccion previa de `PKG-003` ya no reproducen sobre el codigo actual
  - en el arbol actual la edicion pendiente usa `assertPendingEditWindow()` y el sync offline si exige `validationDeadlineAt` y `now <= validationDeadlineAt`
  - esta pasada reemplaza la conclusion tecnica anterior para `PKG-003`

## Defectos 2026-04-29 PKG-003 Review Actualizada

- `high` `backend/src/modules/captures/dto/create-capture.dto.ts:35`, `backend/src/modules/captures/application/captures.service.ts:233`
  - el alta online acepta `capturedAt` enviado por cliente y lo persiste en lugar de fijarlo en servidor
  - impacto: un cliente puede forzar timestamps operativos arbitrarios en una captura online y romper la regla cerrada `capturedAt = recordedAt = now`
  - trazabilidad: `docs/03-arquitectura/arquitectura.md:333`, `docs/03-arquitectura/contratos.md:350`, `docs/03-arquitectura/contratos.md:351`
- `high` `backend/prisma/schema.prisma:291`, `backend/src/modules/captures/application/captures.service.ts:217`, `backend/src/modules/captures/application/captures.service.ts:392`
  - la idempotencia quedo modelada y consultada con unicidad global por `clientCaptureId`, no por `tournamentId + officialId + clientCaptureId`
  - impacto: dos fiscales o dos torneos pueden chocar entre si por el mismo `clientCaptureId`, generando duplicados falsos o bloqueos indebidos en create/sync
  - trazabilidad: `docs/03-arquitectura/arquitectura.md:315`, `docs/03-arquitectura/contratos.md:353`, `docs/03-arquitectura/contratos.md:488`, `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md:156`
- `medium` `backend/src/modules/captures/application/captures.service.ts:695`, `backend/src/modules/captures/application/captures.service.ts:701`, `backend/src/modules/captures/application/captures.service.ts:706`, `backend/src/modules/captures/application/captures.service.ts:710`
  - la carga online solo valida `fishingStartAt` y `fishingEndAt`; no bloquea si falta `validationDeadlineAt`
  - impacto: el backend puede aceptar capturas en torneos con hitos horarios incompletos, contra la regla cerrada del paquete
  - trazabilidad: `docs/03-arquitectura/arquitectura.md:335`, `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md:166`
- `medium` `backend/src/modules/captures/presentation/captures.controller.ts:60`, `backend/src/modules/captures/dto/create-capture.dto.ts:48`, `backend/src/modules/captures/dto/sync-captures.dto.ts:52`, `backend/src/modules/captures/application/captures.service.ts:756`, `frontend/src/lib/api.ts:286`, `frontend/src/lib/api.ts:532`, `frontend/src/lib/api.ts:544`, `frontend/src/lib/capture-queue.ts:9`, `frontend/src/components/official-pages.tsx:100`, `frontend/src/components/official-pages.tsx:130`
  - el flujo de media sigue implementado con JSON + `dataUrl` y la cola offline persiste base64 completo en IndexedDB; no usa `multipart/form-data` ni `photoBlob`
  - impacto: incumple el contrato aprobado, infla payloads/almacenamiento local y deja fuera el modelo de blobs definido para este slice
  - trazabilidad: `docs/03-arquitectura/arquitectura.md:350`, `docs/03-arquitectura/arquitectura.md:360`, `docs/03-arquitectura/contratos.md:330`, `docs/03-arquitectura/contratos.md:359`, `docs/03-arquitectura/contratos.md:469`, `docs/03-arquitectura/contratos.md:562`
- `medium` `backend/src/modules/captures/application/captures.service.ts:271`, `backend/src/modules/captures/application/captures.service.ts:372`, `backend/src/modules/captures/application/captures.service.ts:457`, `backend/src/modules/captures/application/captures.service.ts:544`
  - no aparece auditoria de intentos bloqueados por horario (`capture.blocked_by_schedule`) y los `throw` de ventana salen sin registro previo
  - impacto: queda incumplida la trazabilidad minima pedida para intentos fuera de ventana operativa
  - trazabilidad: `docs/05-ejecucion/paquetes/PKG-003-operacion-fiscal-y-capturas.md:205`, `docs/02-funcional/requerimientos/RF-009-control-horario-operativo.md:34`

## Riesgos y Gaps 2026-04-29 PKG-003 Review Actualizada

- gap de automatizacion:
  - `captures` sigue sin unit tests, integration tests ni E2E
  - `test:smoke` no aporta cobertura funcional
- gap de ejecucion:
  - no hubo corrida autenticada real de `/operacion` con dataset controlado para fiscales, participantes, fotos y ventanas horarias
- gap de arquitectura ejecutable:
  - no aparece implementado el seam `RankingIntegrationPort.markTournamentPendingRecalculation(...)` pedido por `PKG-003`
- gap de tooling:
  - `frontend npm run lint` no es evidencia confiable hoy porque depende de archivos `.next/types` faltantes en el arbol actual

## Conclusion Operativa 2026-04-29 PKG-003 Review Actualizada

- outcome de ejecucion: `completed`
- conclusion: `no apto para cierre operativo de PKG-003 en su estado actual`
- estado general:
  - el slice compila en build y la UI de operacion existe
  - persisten dos hallazgos `high` de contrato/regla de negocio y tres gaps `medium` de horario, media y auditoria
- sugerencias para `docs/00-indice/project-state.md`:
  - mover `PKG-003` de listo para implementacion a implementado con findings abiertos de QA
  - registrar especificamente los defectos abiertos sobre `capturedAt` online, idempotencia por `clientCaptureId`, bloqueo horario incompleto y drift del contrato de media
  - anotar como gap de calidad la falta de pruebas automatizadas reales del modulo `captures` y la falla actual de `frontend lint`

## Cierre 2026-04-29 PKG-003 Smoke Final

- alcance de esta pasada:
  - revalidacion final del backend ya remediado
  - smoke real de API contra instancia estable en `http://localhost:3006/api/v1`
  - contraste de contratos reales con `PKG-003`, arquitectura y contratos
- validaciones ejecutadas:
  - `backend npm run lint`: ok
  - `backend npm run build`: ok
  - `frontend npm run lint`: ok
  - `frontend npm run build`: ok
  - login fiscal x2: ok
  - `GET /captures/context`: ok
  - `POST /captures` online sin `capturedAt` cliente: ok
  - mismo `clientCaptureId` para dos fiscales del mismo torneo: ok, ambas altas aceptadas
  - alta sobre torneo sin `validationDeadlineAt`: ok, bloqueada con `400`
- conclusion tecnica:
  - los hallazgos previos de `capturedAt` online, unicidad global por `clientCaptureId` y bloqueo incompleto por hitos horarios ya no reproducen
  - el contrato operativo vigente del slice queda alineado a JSON + `dataUrl` + `IndexedDB`, sin bloquear cierre por no usar multipart en este paquete
- riesgos residuales:
  - sin automatizacion funcional real del modulo `captures`
  - sin evidencia de dispositivo real para presion de `IndexedDB`, tamano de fotos y comportamiento mobile offline
- conclusion operativa:
  - `apto para cierre operativo de PKG-003 con observaciones`

## Pasada 2026-04-30 PKG-004 Validacion Acotada

## Estrategia

- foco acotado sobre `PKG-004` segun pedido: verificacion ejecutable minima y util
  - contraste de alcance y contratos contra surfaces nuevas de backend y frontend
- evidencia tecnica con:
  - `backend npm run lint`
  - `backend npm run build`
  - `backend npm run test:pkg004`
  - `frontend npm run lint`
  - `frontend npm run build`
- sin implementar features ni abrir una pasada E2E completa autenticada

## Cobertura

- entradas revisadas:
  - `docs/05-ejecucion/paquetes/PKG-004-scoring-ranking-y-reportes-basicos.md`
  - `docs/03-arquitectura/contratos.md`
  - `docs/05-ejecucion/paquetes/PKG-004-frontend-handoff.md`
  - contraste puntual con `ERS`, arquitectura, UX/UI y `project-state`
- backend:
  - surfaces de scoring y ranking
  - surfaces de reportes y exportaciones
  - persistencia nueva en Prisma para scoring, snapshots y exports
  - wiring de cierre de torneo con congelamiento `FINAL`
- frontend:
  - `/admin/scoring`
  - `/admin/ranking`
  - `/admin/reportes`
  - labels visibles y feedback principal del slice

## Casos Ejecutados

- `backend npm run lint`: ok
- `backend npm run build`: ok
- `backend npm run test:pkg004`: ok
  - valida calculo de ranking, desempate y buffers `CSV/XLSX`
  - evidencia: `backend/tests/pkg004.slice.test.ts`
- `frontend npm run lint`: ok
- `frontend npm run build`: ok
  - evidencia de rutas compiladas:
    - `/admin/scoring`
    - `/admin/ranking`
    - `/admin/reportes`

## Review De Contratos Y Surfaces

- backend alineado al contrato en endpoints nuevos:
  - `score-adjustments`, `ranking`, `ranking/final`
  - `reports/*`, `exports`, `exports/{id}/download`
  - evidencia:
    - `backend/src/modules/scoring-ranking/presentation/scoring-ranking.controller.ts`
    - `backend/src/modules/reports-exports/presentation/reports-exports.controller.ts`
- backend respeta decisiones sensibles del paquete:
  - recalculo live ante cambio de scoring y ajustes
  - `dirty` + `meta.isStale` como fallback si falla el recalculo
  - `FINAL` previo al cierre de torneo
  - auditoria de `scoring.*`, `ranking.*` y `report.export_*`
  - evidencia:
    - `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts`
    - `backend/src/modules/reports-exports/application/reports-exports.service.ts`
    - `backend/src/modules/tournaments/application/tournaments.service.ts`
- persistencia nueva presente para:
  - `TournamentScoringConfig`
  - `ScoreAdjustment`
  - `TournamentRankingState`
  - `RankingEntry`
  - `ExportRecord`
  - evidencia: `backend/prisma/schema.prisma`
- frontend consume las surfaces nuevas sin recalculo cliente visible en esta pasada:
  - ranking en vivo/final, `Desactualizado`, exportacion `CSV/XLSX`, penalizacion aplicada/revocada
  - evidencia: `frontend/src/components/scoring-reporting-pages.tsx`

## Cobertura Transversal 2026-04-30 PKG-004 Validacion Acotada

- seguridad y autorizacion:
  - ok por review de guards y descarga autenticada de exportaciones
  - no hubo corrida manual de permisos cruzados `ADMIN` vs `OFFICIAL` vs `PARTICIPANT`
- auditoria y trazabilidad:
  - ok por review de eventos auditados en scoring, ranking y exportaciones
  - no se verifico persistencia real en base en esta pasada acotada
- UX/copy:
  - ok por review puntual de labels y feedback principal del slice
  - no se detectaron mensajes crudos evidentes ni labels tecnicos en las pantallas nuevas revisadas
- continuidad operativa y performance:
  - ok por review de estrategia inline + `isStale`
  - no hubo fault injection para forzar recalculo fallido ni medicion de latencia/volumen

## Defectos 2026-04-30 PKG-004 Validacion Acotada

- no encontre hallazgos bloqueantes en el alcance pedido
- no abro defectos nuevos en esta pasada

## Riesgos Y Gaps 2026-04-30 PKG-004 Validacion Acotada

- gap de ejecucion:
  - no hubo smoke HTTP autenticado real de scoring, ranking, cierre y exportaciones contra un dataset controlado
- gap de automatizacion:
  - `test:pkg004` cubre calculo y generacion de archivos, pero no cubre controladores, autorizacion ni persistencia end-to-end
- gap de resiliencia:
  - no se revalido por ejecucion el caso `meta.isStale = true` ni la descarga real de un archivo generado
- riesgo residual:
  - el recalculo inline y la generacion sincronica `XLSX` quedan sin validacion de volumen en esta pasada breve

## Conclusion Operativa 2026-04-30 PKG-004 Validacion Acotada

- outcome de ejecucion: `completed`
- conclusion:
  - no encontre bloqueantes para `PKG-004` dentro del foco acotado pedido
  - backend y frontend pasan `lint/build` y la suite `test:pkg004` pasa
  - la revision de contratos y surfaces nuevas no encontro desalineaciones criticas
- sugerencias para `docs/00-indice/project-state.md`:
  - registrar que `testing` ejecuto validacion acotada de `PKG-004` sin hallazgos bloqueantes
  - dejar visibles como riesgos residuales la falta de smoke HTTP/E2E autenticado y la falta de evidencia ejecutada de `isStale`/descarga real

## Pasada 2026-05-02 PKG-005 Validacion Acotada

## Estrategia

- foco estrictamente acotado al paquete `PKG-005 Hardening y release readiness del MVP`
- contraste contra:
  - `docs/05-ejecucion/paquetes/PKG-005-hardening-y-release-readiness-del-mvp.md`
  - `docs/00-indice/project-state.md`
  - `docs/06-calidad/testing.md`
  - `docs/06-calidad/security-review.md`
  - `docs/02-funcional/ers.md`
  - `docs/03-arquitectura/arquitectura.md`
  - `docs/03-arquitectura/contratos.md`
  - `docs/04-ux-ui/ux-ui.md`
- validacion ejecutable limitada a:
  - `backend npm run lint`
  - `backend npm run build`
  - `backend npm run test:smoke`
  - `backend npm run test:pkg004`
  - `frontend npm run lint`
  - `frontend npm run build`
- review focal de implementacion para confirmar:
  - que `test:smoke` ya no sea placeholder
  - que la auditoria critica del paquete use el mismo limite transaccional en los puntos cerrados por alcance
  - que descargas autenticadas de exportaciones y media privada expongan headers conservadores

## Cobertura

- gate tecnico local de release:
  - `backend/package.json`
  - `frontend/package.json`
- smoke automatizado del paquete:
  - `backend/tests/pkg005.smoke.test.ts`
- auditoria transaccional:
  - `backend/src/common/audit/audit.service.ts`
  - `backend/src/modules/registrations/application/registrations.service.ts`
  - `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts`
  - `backend/src/modules/tournaments/application/tournaments.service.ts`
  - `backend/src/modules/reports-exports/application/reports-exports.service.ts`
- hardening de file serving autenticado:
  - `backend/src/modules/reports-exports/presentation/reports-exports.controller.ts`
  - `backend/src/modules/captures/presentation/captures.controller.ts`

## Casos Ejecutados

- `backend npm run lint`: ok
- `backend npm run build`: ok
- `backend npm run test:smoke`: ok
  - salida: `PKG-005 smoke checks passed`
- `backend npm run test:pkg004`: ok
  - salida: `PKG-004 slice checks passed`
- `frontend npm run lint`: ok
- `frontend npm run build`: ok
  - compilan las rutas administrativas y operativas relevantes del MVP, incluyendo `/admin/scoring`, `/admin/ranking`, `/admin/reportes`, `/admin/inscripciones`, `/autoregistro` y `/operacion`

## Review De Implementacion Y Trazabilidad

- `test:smoke` ya no es placeholder:
  - `backend/package.json:13`
  - `backend/tests/pkg005.smoke.test.ts:485`
- el smoke cubre los casos minimos del paquete pedidos por handoff:
  - aprobacion y rechazo de inscripcion con evidencia auditable:
    - `backend/tests/pkg005.smoke.test.ts:63`
  - cierre bloqueado con capturas pendientes:
    - `backend/tests/pkg005.smoke.test.ts:176`
  - cierre valido con ranking final y auditoria:
    - `backend/tests/pkg005.smoke.test.ts:203`
  - exportacion `READY` y `FAILED`:
    - `backend/tests/pkg005.smoke.test.ts:328`
  - headers endurecidos para exportaciones y media:
    - `backend/tests/pkg005.smoke.test.ts:452`
- `AuditService` incorpora escritura explicita sobre `Prisma.TransactionClient`:
  - `backend/src/common/audit/audit.service.ts:23`
- `registrations` mueve a borde transaccional los eventos del alcance del paquete:
  - `createAdmin`: `backend/src/modules/registrations/application/registrations.service.ts:95`
  - `selfRegister`: `backend/src/modules/registrations/application/registrations.service.ts:157`
  - `approve`: `backend/src/modules/registrations/application/registrations.service.ts:229`
  - `reject`: `backend/src/modules/registrations/application/registrations.service.ts:343`
- `scoring-ranking` deja transaccional la trazabilidad critica del paquete:
  - `updateScoringConfig`: `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:68`
  - `createScoreAdjustment`: `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:157`
  - `revokeScoreAdjustment`: `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:215`
  - `finalizeTournamentRanking`: `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:347`
- `tournaments.close` bloquea pendientes antes del cierre y audita el cambio en la transaccion de cierre:
  - `backend/src/modules/tournaments/application/tournaments.service.ts:111`
  - `backend/src/modules/tournaments/application/tournaments.service.ts:131`
- `reports-exports.createExport` registra `READY` y `FAILED` con auditoria consistente dentro de la misma transaccion del `ExportRecord`:
  - `backend/src/modules/reports-exports/application/reports-exports.service.ts:191`
  - `backend/src/modules/reports-exports/application/reports-exports.service.ts:232`
- descargas autenticadas exponen headers conservadores:
  - exportaciones:
    - `backend/src/modules/reports-exports/presentation/reports-exports.controller.ts:84`
  - media privada:
    - `backend/src/modules/captures/presentation/captures.controller.ts:43`

## Cobertura Transversal 2026-05-02 PKG-005

- seguridad y hardening:
  - ok en el alcance pedido por revision de `nosniff`, `Cache-Control: private, no-store` y `attachment` para exportaciones
- auditoria y trazabilidad:
  - ok en el alcance pedido por review de puntos transaccionales y smoke slice-level
- continuidad operativa:
  - ok en el alcance pedido porque `test:smoke` pasa a ser gate automatizado real de release local
- UX/UI:
  - no hubo cambios de interfaz obligatorios en este paquete
  - `frontend lint/build` pasan como gate de regresion; no se ejecuto browser/E2E porque quedaba fuera del foco pedido
- contratos y arquitectura:
  - ok dentro del alcance del paquete; no se detectaron cambios de contrato publico ni drift arquitectonico nuevo

## Defectos 2026-05-02 PKG-005 Validacion Acotada

- no encontre findings abiertos de severidad `high`, `medium` ni `low` dentro del foco pedido

## Riesgos Y Gaps 2026-05-02 PKG-005 Validacion Acotada

- gap de ejecucion:
  - el smoke nuevo es valido como gate barato de release local, pero sigue siendo una suite slice-level con dobles; no reemplaza una pasada HTTP o browser integrada
- gap de cobertura:
  - el smoke ejecutado verifica `approve` y `reject` en `registrations`, pero no ejerce por corrida el camino de `createAdmin` ni `selfRegister`; esos puntos quedaron cubiertos por review de implementacion transaccional, no por ejecucion directa
- riesgo residual:
  - `ranking.live_recalculated` sigue auditandose fuera de la transaccion de recalculo live:
    - `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:466`
    - `backend/src/modules/scoring-ranking/application/scoring-ranking.service.ts:532`
  - no lo considero finding abierto para `PKG-005` porque el paquete cerro la atomicidad de las mutaciones criticas listadas en alcance y el recalculo live tiene estrategia explicita de tolerancia con `dirty/isStale`

## Conclusion Operativa 2026-05-02 PKG-005 Validacion Acotada

- outcome de ejecucion: `completed`
- conclusion:
  - `PKG-005` queda validado dentro del foco acotado pedido
  - `test:smoke` ya no es decorativo; ejecuta verificaciones reales del paquete y pasa
  - backend y frontend pasan los gates tecnicos exigidos
  - no abro defectos nuevos en esta pasada
- sugerencias para `docs/00-indice/project-state.md`:
  - mover `PKG-005 Hardening y release readiness del MVP` de `listo para implementacion` a `cerrado operativamente`
  - registrar que `testing` ejecuto validacion acotada de `PKG-005` con `backend lint/build/test:smoke/test:pkg004` y `frontend lint/build` en verde
  - dejar visible como riesgo residual no bloqueante que el gate nuevo es slice-level/local y no sustituye una corrida HTTP/E2E integrada

## Revalidacion PKG-006 2026-09-19

- `backend/npm run test:pkg006`: ok
- `backend/npm run lint`: ok
- `backend/npm run build`: ok
- cobertura agregada: `health/ready` no crea probes temporales por request; `X-Request-Id` invalido, con espacios o mayor a 128 caracteres se reemplaza por UUID del servidor
- smoke HTTP: pendiente de repetir contra una instancia con credenciales de smoke; no se registra como evidencia verde en esta corrida

## Validacion PKG-007 2026-09-19

- `backend/npm run test:pkg007`, `test:pkg006`, `test:smoke`, `test:pkg004`, `lint` y `build`: ok.
- `frontend/npm run lint` y `build`: ok.
- no quedan referencias a sesion, access token o refresh token en `localStorage` o `sessionStorage`.
- smoke HTTP de cookie/refresh pendiente de una instancia con migracion aplicada y credenciales inyectadas.

## Revalidacion PKG-007 2026-09-25

- `backend/npm run test:pkg007`: ok; cubre configuracion obligatoria, rotacion de refresh, carrera de dos rotaciones, auditoria de logout y rate limit de refresh/logout.
- `frontend/npm run test:pkg007`: ok; dos respuestas `401` simultaneas comparten una unica renovacion y ambos requests se reintentan una vez con el access token nuevo.
- `backend/npm run test:pkg006`, `test:smoke`, `test:pkg004`, `lint` y `build`: ok.
- `frontend/npm run lint` y `build`: ok.
- el runbook declara `AUTH_REFRESH_EXPIRES_IN`, duracion corta de JWT y el orden de migracion previo al deploy.
- pendiente externo: aplicar la migracion y ejecutar smoke HTTP de cookie/refresh en un ambiente configurado; no se presenta como evidencia ejecutada.

## Cierre Operativo PKG-007 2026-09-26

- `20260919120000_pkg007_auth_sessions`: aplicada con `prisma migrate deploy`; Prisma confirmo el esquema actualizado.
- `test:release-smoke` contra `http://localhost:3006/api/v1`: `health/live`, `health/ready`, login, `auth/me` y torneos respondieron `200`.
- smoke de sesion adicional: login entrega cookie, refresh rota la sesion, logout la revoca y el refresh posterior responde `401`.
- la instancia temporal se detuvo al finalizar la corrida.
