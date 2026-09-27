# UX UI

Owner recomendado: `ux_ui_web_mobile`

## Flujos

### Mapa general de flujos

- Acceso publico
  - login
  - activacion de cuenta
  - auto-registro
  - ranking publico o semi-publico
- Operacion administrativa
  - gestion de torneos
  - gestion de participantes, equipos y embarcaciones
  - altas administrativas
  - alta y asignacion de fiscales
  - revision y aprobacion de auto-registros
  - configuracion de scoring y horarios
  - reportes y cierre
- Operacion fiscal
  - acceso al torneo asignado
  - carga de capturas
  - captura offline y sincronizacion
  - validacion, observacion o rechazo
  - consulta de ranking
- Consulta participante
  - estado de inscripcion
  - estado de cuenta
  - ranking
  - consulta de sus capturas

### Arquitectura de navegacion

Se define una navegacion separada por zonas:

- `Zona publica`
  - `/login`
  - `/activar-cuenta`
  - `/autoregistro`
  - `/ranking`
- `Zona administrativa`
  - dashboard
  - torneos
  - participantes
  - equipos
  - embarcaciones
  - inscripciones
  - fiscales
  - scoring y horarios
  - reportes
  - cierre
- `Zona operativa fiscal`
  - mi torneo
  - nueva captura
  - cola de sincronizacion
  - validacion de capturas
  - ranking

La separacion entre zona administrativa y zona operativa debe ser explicita en navegacion, layout, tono visual y prioridades de accion.

### Flujo de login

Objetivo:

- permitir acceso simple y rapido por email y contraseña

Secuencia:

1. Usuario abre login.
2. Ingresa email y contraseña.
3. Sistema valida formato y muestra errores inline.
4. Si la cuenta no esta activada o validada, el usuario no entra y se deriva al flujo de activacion.
5. Si credenciales correctas y cuenta activa, el sistema redirige a la zona segun rol.

Estados:

- inicial
- cargando
- credenciales invalidas
- cuenta pendiente de validacion
- cuenta activa
- error tecnico

Mensajes criticos:

- "No pudimos iniciar sesion. Revisá tus datos."
- "Tu cuenta todavía no fue validada. Revisá tu email."
- "No pudimos conectarnos. Intentá nuevamente."

### Flujo de activacion / validacion de cuenta

Objetivo:

- completar el alta de cuentas creadas administrativamente y fiscales

Secuencia:

1. Usuario recibe email.
2. Abre enlace de activacion.
3. Ve pantalla de validacion con estado del token.
4. Si corresponde, define o confirma contraseña.
5. Sistema confirma activacion.
6. Usuario puede ir a login.

Estados:

- token valido
- token expirado
- token ya usado
- activacion exitosa
- error tecnico

Mensajes criticos:

- "Tu cuenta fue activada correctamente."
- "El enlace vencio. Solicitá uno nuevo."
- "Este enlace ya no es valido."

### Flujo de auto-registro de participante

Objetivo:

- permitir que un participante cargue sus datos y quede pendiente de revision

Secuencia:

1. Usuario abre auto-registro.
2. Completa datos personales y acepta reglamento.
3. Sistema valida campos obligatorios.
4. Se confirma el envio.
5. El estado queda `pendiente de revision`.
6. El participante puede consultar ese estado.

Estados:

- formulario vacio
- errores de validacion
- envio en progreso
- enviado correctamente
- pendiente de revision
- rechazado

Mensajes criticos:

- "Tu solicitud fue enviada y queda pendiente de revision."
- "Te avisaremos cuando la organizacion apruebe tu inscripcion."

### Flujo de revision y aprobacion administrativa

Objetivo:

- permitir a organizacion revisar solicitudes y resolverlas sin ambiguedad

Secuencia:

1. Administrador abre bandeja de inscripciones pendientes.
2. Revisa datos de la solicitud.
3. Decide aprobar o rechazar.
4. El sistema exige confirmacion antes de resolver.
5. Se actualiza el estado y queda trazabilidad.

Estados:

- bandeja vacia
- pendientes
- aprobada
- rechazada
- error al resolver

Comportamientos UX:

- acciones principales visibles arriba del detalle
- motivo de rechazo opcional o requerido segun regla funcional futura; si aun no esta cerrado, mostrar campo disponible para observacion
- feedback inmediato luego de aprobar o rechazar

## Remediacion Post-Validacion PKG-001

Objetivo:

- corregir copy, feedback visual, naming, visualizacion de estados y presentacion general sin expandir alcance funcional

Lineamientos ejecutables:

- no mostrar referencias internas de paquete, implementacion, contratos o decisiones tecnicas en textos visibles al usuario
- todo texto visible en espanol debe usar acentos y ortografia correctos
- los mensajes de exito, error, advertencia e informacion deben redactarse para usuario final, no para equipo tecnico
- los mensajes de resultado deben mostrarse como toast o banner cerrable y ademas auto-ocultarse luego de unos segundos si no requieren accion
- los textos de estado deben traducirse a lenguaje natural para usuario final
- las acciones destructivas o de retiro operativo deben usar naming comprensible, nunca terminologia tecnica como `baja logica` o `soft delete`
- cuando exista un vinculo relevante para la operacion, la UI debe mostrar a que entidad esta vinculado, no solo cantidades
- los emails transaccionales deben tener estructura HTML simple pero cuidada, con encabezado, bloque de accion principal y texto de soporte
- los enlaces de activacion deben abrir la experiencia web del frontend y desde ahi completar la interaccion con backend

Mapa de copy obligatorio para PKG-001:

- `PKG-001 · Base administrativa` -> `Administracion`
- `Password temporal encapsulada` -> no mostrar
- explicaciones sobre `soft delete` -> no mostrar
- `Baja logica` -> `Dar de baja`
- `PENDING_EMAIL_VERIFICATION` -> `Pendiente de activacion`
- `ACTIVE` -> `Activa`
- `DISABLED` -> `Desactivada`
- `Internal server error` -> reemplazar por mensaje funcional segun contexto

Criterio de feedback:

- exito: toast verde o banner de exito, auto-oculta a los 4-6 segundos y con boton `Cerrar`
- error: banner o toast rojo, no usar mensajes crudos del sistema; mantener visible hasta cierre manual o nueva accion relevante
- advertencia: banner ambar para estados pendientes o situaciones no bloqueantes
- informacion: usar solo cuando el usuario realmente necesita contexto para completar la tarea

Criterio de mensajes:

- hablar en segunda persona o en lenguaje neutro de tarea completada
- evitar palabras como `contrato`, `paquete`, `tecnico`, `soft delete`, `encapsulada`, `internal server error`
- ejemplos:
  - `Torneo dado de baja` + `El torneo ya no aparece entre los activos.`
  - `Fiscal asignado` + `El fiscal ya quedo asociado al torneo seleccionado.`
  - `No pudimos asignar el fiscal` + `Ese fiscal ya estaba asignado a este torneo.`

Criterio de visualizacion de vinculos:

- en participantes, mostrar explicitamente equipo y embarcacion vinculados si existen
- si no existe vinculo, mostrar `Sin equipo` o `Sin embarcacion`
- las cantidades pueden mantenerse como apoyo, pero no reemplazan el detalle

Criterio visual general:

- reemplazar botones con geometria extrema o desproporcionada por botones consistentes con radio moderado
- priorizar jerarquia visual clara: titulo, descripcion breve, accion primaria, acciones secundarias
- usar espaciado mas generoso, superficies limpias y contraste suficiente
- mantener una unica familia visual de botones, badges, inputs y mensajes
- evitar composiciones que parezcan demo tecnica o tablero interno

Lineamiento para emails HTML:

- encabezado con nombre del producto
- saludo con nombre de la persona
- explicacion breve de por que recibe el email
- boton principal `Activar cuenta`
- enlace de respaldo visible debajo del boton
- pie corto con aclaracion de seguridad y soporte basico

### Flujo de alta administrativa de usuario

Objetivo:

- permitir a administracion crear usuario desde backoffice con envio de email

Secuencia:

1. Administrador abre alta.
2. Completa datos obligatorios.
3. Confirma.
4. Sistema crea cuenta pendiente de validacion.
5. Se informa que se envio email de activacion.

Estados:

- formulario
- guardando
- alta exitosa con email enviado
- alta exitosa con email pendiente o fallido

Regla UX:

- si el email falla, el alta puede quedar creada pero con alerta operativa visible

### Flujo de alta y asignacion de fiscales

Objetivo:

- permitir crear fiscales y asignarlos por torneo

Secuencia:

1. Administrador abre modulo de fiscales.
2. Da de alta fiscal con datos obligatorios.
3. Asigna torneo desde la misma pantalla o flujo inmediato posterior.
4. Sistema confirma alta y envio de email.
5. El fiscal queda visible con estado de cuenta y estado de asignacion.

Estados:

- sin fiscales
- listado
- alta en progreso
- asignacion exitosa
- cuenta pendiente de validacion
- error de envio de email

### Flujo de carga de captura

Objetivo:

- permitir al fiscal registrar una captura con minima friccion

Secuencia base online:

1. Fiscal abre `Nueva captura`.
2. Selecciona participante o equipo.
3. Selecciona especie.
4. Adjunta foto.
5. Ingresa longitud.
6. Agrega observacion opcional.
7. Sistema registra fecha/hora automaticamente.
8. Si hay GPS disponible y permiso, lo incorpora.
9. Fiscal confirma.
10. La captura queda `pendiente de validacion`.

Principios UX:

- una sola columna en mobile
- acciones grandes y alcanzables con una mano
- persistencia visible del progreso
- resumen corto previo a guardar si hace falta confirmar

Estados:

- sin datos
- foto pendiente
- guardando
- guardada pendiente de validacion
- error de guardado

Mensajes criticos:

- "La foto es obligatoria."
- "La captura quedó registrada y pendiente de validacion."

### Flujo de captura en conectividad limitada

Objetivo:

- permitir continuidad operativa sin ocultar el estado real

Secuencia offline:

1. El fiscal entra a la pantalla de captura.
2. El sistema detecta falta de conectividad.
3. Muestra estado `offline` sin bloquear toda la operacion.
4. Permite cargar captura con datos locales disponibles.
5. Guarda localmente.
6. La captura queda `pendiente de sincronizacion`.
7. Cuando vuelve la conectividad, inicia sincronizacion o la ofrece segun comportamiento final definido por frontend.
8. El fiscal ve resultado por item.

Estados obligatorios:

- offline
- pending_sync
- syncing
- synced
- error

Mensajes criticos:

- "Estás sin conexión. La captura se guardará en este dispositivo."
- "Esta captura sigue pendiente de sincronización."
- "Sincronizando captura..."
- "La captura se sincronizó correctamente."
- "No pudimos sincronizar esta captura. Revisala e intentá de nuevo."

### Flujo de validacion / observacion / rechazo de captura

Objetivo:

- revisar evidencia de forma rapida y trazable

Secuencia:

1. Usuario autorizado abre listado de capturas pendientes.
2. Ingresa al detalle.
3. Visualiza foto, especie, longitud, timestamps, GPS si existe y observaciones.
4. Selecciona aprobar, observar o rechazar.
5. Si observa o rechaza, sistema pide motivo.
6. Confirma accion.
7. Se muestra feedback y la captura sale de pendientes.

Estados:

- sin pendientes
- listado con pendientes
- detalle
- aprobada
- observada
- rechazada
- error al resolver

### Flujo de ranking en vivo

Objetivo:

- permitir lectura rapida del estado competitivo

Secuencia:

1. Usuario abre ranking.
2. Ve posiciones, puntaje, piezas validas, longitud total y mejor captura.
3. Puede filtrar segun permisos y necesidad.
4. El sistema refresca periodicamente.

Estados:

- cargando
- sin datos
- ranking disponible
- ultima actualizacion visible
- error de carga

### Flujo de reportes y cierre

Objetivo:

- dar salida operativa clara a administracion

Secuencia:

1. Administrador abre reportes.
2. Selecciona torneo y tipo de reporte.
3. Visualiza resumen.
4. Exporta si corresponde.
5. Para cierre, confirma accion de cierre de torneo.

Estados:

- sin reportes
- generando
- disponible
- exportado
- error

## Arquitectura De Informacion

### Estructura principal

- Publico
  - Login
  - Activacion de cuenta
  - Auto-registro
  - Ranking
- Administracion
  - Dashboard
  - Torneos
  - Participantes
  - Equipos
  - Embarcaciones
  - Inscripciones
  - Fiscales
  - Scoring y horarios
  - Reportes
  - Cierre
- Operacion fiscal
  - Inicio de torneo
  - Nueva captura
  - Cola de sincronizacion
  - Validaciones
  - Ranking

### Pantallas minimas del MVP

- login
- activacion de cuenta
- auto-registro
- estado de auto-registro
- dashboard administrativo
- listado y alta de torneos
- detalle/configuracion de torneo
- listado de participantes
- listado de equipos
- listado de embarcaciones
- bandeja de inscripciones pendientes
- listado y alta de fiscales
- asignacion de fiscal a torneo
- pantalla de nueva captura
- cola de capturas pendientes de sincronizacion
- listado de capturas pendientes de validacion
- detalle de captura
- ranking en vivo
- reportes
- confirmacion de cierre

## Pantallas Y Estados

### Login

- campos: email, contraseña
- acciones: ingresar, recuperar acceso futura, reenviar activacion futura si aplica
- estados: idle, loading, error, cuenta pendiente

### Activacion de cuenta

- info del email asociado
- estado del token
- accion principal: activar / definir contraseña
- estados: valido, expirado, ya usado, exito, error

### Auto-registro

- formulario con pasos simples o una sola pantalla segun densidad
- checkbox de aceptacion de reglamento
- confirmacion final clara
- estados: vacio, validando, pendiente, rechazado

### Bandeja de inscripciones

- listado con filtros minimos
- contador de pendientes
- detalle lateral o pantalla de detalle
- acciones: aprobar, rechazar
- estados: vacio, con resultados, resolviendo, resuelto

### Alta de fiscal

- formulario corto
- confirmacion de asignacion
- estado visible de cuenta: pendiente de validacion / activa

### Nueva captura

- campos ordenados por prioridad operativa:
  - participante/equipo
  - especie
  - foto
  - longitud
  - observaciones
- barra o chip de estado de conectividad siempre visible
- CTA principal fijo en mobile

### Cola de sincronizacion

- lista de capturas locales
- estado por item
- accion de reintento cuando corresponda
- detalle minimo del error comprensible

### Validacion de captura

- imagen protagonista
- datos de captura resumidos arriba
- acciones primarias al final o fijas en mobile
- campo motivo visible cuando la accion lo requiera

### Ranking

- tabla o cards compactas
- filtros
- ultima actualizacion
- buen comportamiento en pantallas pequenas

### Reportes

- selector de torneo
- tarjetas o lista de reportes disponibles
- accion de ver/exportar
- estado de generacion

### Estados transversales obligatorios

- loading
- empty
- success
- error
- offline
- pending_sync
- syncing
- synced

## Notas Web

- en escritorio, la zona administrativa puede usar navegacion lateral persistente
- listados administrativos deben privilegiar escaneo rapido, filtros visibles y acciones agrupadas
- ranking y reportes pueden usar tablas responsivas con prioridad de columnas
- confirmaciones destructivas o sensibles deben usar dialogos claros
- no usar `window.alert`, `window.confirm` ni `window.prompt` en la UI final del producto
- reemplazar dialogs nativos por componentes consistentes del sistema visual:
  - dialogos modales para confirmaciones
  - toasts para feedback no bloqueante
  - banners o mensajes inline para errores persistentes o estados de atencion
- auditoria visible cuando aplique:
  - ultima actualizacion
  - usuario que resolvio
  - timestamp de resolucion

## Notas Mobile

- la experiencia del fiscal es la prioridad mobile-first
- usar headers compactos y CTA principal fijo para captura y validacion
- minimizar scroll antes de la accion principal en `Nueva captura`
- el estado de conectividad no puede quedar escondido
- los errores de sincronizacion deben verse como items accionables, no como mensajes efimeros
- evitar tablas densas en mobile; usar cards o listas jerarquizadas
- en ranking mobile, mostrar primero:
  - posicion
  - nombre
  - puntaje
  - mejor captura

## Accesibilidad

- contraste suficiente en estados criticos y badges
- labels visibles y asociados a campos
- mensajes de error vinculados al campo correspondiente
- no depender solo de color para estados como aprobado, rechazado, offline o error
- botones y areas tactiles amplias en mobile
- foco visible en teclado
- orden logico de tabulacion
- textos de accion claros:
  - "Aprobar captura"
  - "Rechazar captura"
  - "Reintentar sincronizacion"
- feedback anunciable para lectores de pantalla en:
  - exito de guardado
  - error de validacion
  - cambio de estado de sincronizacion

## Criterios UX Para Testing

- un usuario nuevo puede completar auto-registro sin ayuda externa
- un administrador entiende rapidamente que solicitudes estan pendientes y puede resolverlas sin ambiguedad
- un usuario dado de alta administrativamente entiende desde la UI que debe validar su cuenta antes de operar
- un fiscal puede registrar una captura desde mobile en pocos pasos y con feedback claro
- la falta de conectividad no bloquea silenciosamente la operacion de captura
- el usuario puede distinguir claramente entre:
  - captura pendiente de validacion
  - captura pendiente de sincronizacion
  - captura sincronizada
  - captura con error
- una validacion, observacion o rechazo de captura deja claro el resultado y su trazabilidad
- ranking y reportes siguen siendo legibles en mobile y escritorio
- todos los formularios tienen estados de carga, error y exito visibles
- los estados vacios explican que falta hacer y, cuando corresponde, ofrecen CTA
- la navegacion entre zona publica, administrativa y operativa no genera confusion de contexto

## Handoff Para Frontend Y QA

- Frontend debe implementar primero layout y navegacion por zonas antes de profundizar pantallas
- Los componentes criticos del MVP son:
  - formularios de acceso/registro
  - bandejas administrativas
  - captura mobile-first
  - estados de sincronizacion
  - detalle de validacion
  - ranking responsivo
- QA debe cubrir escenarios de:
  - activacion vencida
  - auto-registro aprobado/rechazado
  - alta administrativa con email pendiente
  - captura online
  - captura offline
  - reintento de sincronizacion
  - rechazo con motivo
  - estados vacios y errores de red
- QA debe verificar que no se usen dialogs nativos del navegador en flujos del producto final y que las confirmaciones/errores respeten los componentes definidos por la UI

## Auditoria Y Remediacion UX De CRUD Administrativos

### Contexto auditado

- evidencia visual revisada:
  - `output/playwright/admin-equipos-2.png`
  - `output/playwright/admin-embarcaciones-2.png`
  - `output/playwright/admin-fiscales-3.png`
- implementacion revisada:
  - `frontend/src/components/admin-pages.tsx`
  - `frontend/src/components/admin-shell.tsx`
  - `frontend/app/globals.css`

### Diagnostico principal

El problema dominante no es de color ni de copy. El backoffice actual usa un patron repetido de `formulario a la izquierda + tabla a la derecha` para casi todo, incluso cuando la entidad requiere consulta, comparacion y acciones secundarias. Eso genera una sensacion de CRUD debil porque:

- la pantalla queda dominada por un formulario vacio aunque la tarea frecuente sea buscar o editar algo existente
- la tabla pierde protagonismo y capacidad de escaneo
- las acciones de fila quedan apretadas y compiten entre si
- las relaciones operativas se resuelven dentro de la tabla, mezclando lectura y mutacion
- el layout general deja demasiado peso visual en la sidebar y demasiado aire improductivo en el contenido

### Problemas De Usabilidad

- Jerarquia equivocada en catalogos simples:
  - equipos y embarcaciones muestran primero el alta y despues el listado
  - para un operador recurrente, el objetivo mas comun es revisar, encontrar y editar
- Area principal subutilizada:
  - la combinacion `sidebar ancha + cards contenidas + formulario fijo` deja mucho espacio vacio y hace que el CRUD parezca pobre aunque haya datos
- Tabla con acciones pesadas:
  - cada fila repite botones con el mismo peso visual
  - no hay separacion clara entre accion primaria, secundaria y destructiva
- Falta de barra de herramientas:
  - no hay busqueda
  - no hay filtro por estado o por vinculo
  - no hay CTA global `Nuevo ...` en header
- Edicion demasiado anclada al formulario lateral:
  - editar implica mirar a la fila y luego cambiar de foco a otra zona de la pantalla
  - no hay contexto explicito de registro seleccionado
- Participantes y fiscales mezclan demasiado contenido por fila:
  - datos base
  - estado de cuenta
  - vinculos o asignaciones
  - acciones de vinculacion inmediata
  - acciones de editar y baja
- Falta de estados intermedios utiles:
  - no existe estado `sin resultados`
  - no hay feedback inline por accion de fila
  - no hay bloqueo o vacio especifico cuando faltan torneos, equipos o embarcaciones para vincular

### Impacto Operativo

- baja velocidad para operadores frecuentes porque primero deben reorientarse visualmente
- mayor probabilidad de errores al tocar acciones de fila en tablas apretadas
- menor legibilidad de relaciones clave en participantes y fiscales
- peor escalabilidad visual cuando aumente el volumen de datos
- sensacion de sistema incompleto aunque funcionalmente responda

### Mapa De Flujos CRUD Recomendado

- Catalogos simples:
  - entrar a listado
  - buscar o escanear
  - crear desde CTA principal
  - editar en drawer lateral
  - dar de baja desde accion secundaria con confirmacion
- Entidades relacionales:
  - entrar a listado con filtros
  - seleccionar fila
  - ver resumen y relaciones en panel lateral
  - editar datos base en drawer
  - gestionar vinculos desde seccion dedicada del panel lateral
- Entidades operativas:
  - entrar a listado con estado visible
  - filtrar por estado
  - abrir detalle o drawer amplio
  - ejecutar accion de negocio principal
  - confirmar solo acciones destructivas o irreversibles

### Arquitectura De Informacion Recomendada Para Backoffice

- Header de modulo
  - titulo
  - descripcion corta
  - accion primaria `Nuevo ...`
- Barra de herramientas
  - busqueda por texto
  - filtro principal segun entidad
  - contador de resultados
- Area de listado
  - tabla como vista base en desktop
  - filas con una accion principal visible y menu de acciones secundarias cuando haga falta
- Panel lateral o drawer
  - alta o edicion
  - detalle resumido del registro seleccionado
  - relaciones o asignaciones cuando apliquen

### Patron CRUD Recomendado Por Tipo De Entidad

#### Equipos

- complejidad: CRUD simple
- patron recomendado:
  - tabla protagonista
  - CTA `Nuevo equipo` en header
  - alta y edicion en drawer corto
  - columnas: `Nombre`, `Participantes vinculados` si el dato existe, `Estado`, `Acciones`
- notas:
  - no usar formulario fijo en pantalla
  - si no hay datos, mostrar empty state con CTA para crear el primero

#### Embarcaciones

- complejidad: CRUD simple con identificador secundario
- patron recomendado:
  - tabla protagonista
  - CTA `Nueva embarcación`
  - alta y edicion en drawer corto
  - columnas: `Nombre`, `Matrícula`, `Participantes vinculados` si el dato existe, `Acciones`
- notas:
  - `Matrícula` debe verse como dato secundario, no competir con el nombre

#### Participantes

- complejidad: CRUD medio relacional
- patron recomendado:
  - listado con busqueda por nombre, documento o email
  - filtros: `Con cuenta`, `Sin cuenta`, `Habilitado para competir`, `Sin equipo`, `Sin embarcación`
  - fila resumida: persona, cuenta, estado competitivo, resumen de vínculos
  - editar en drawer mediano
  - gestionar vínculos en panel lateral del registro seleccionado, no embebido dentro de cada fila
- notas:
  - la tabla debe servir para detectar rapido faltantes operativos
  - los selects de vinculación no deben vivir dentro de todas las filas al mismo tiempo

#### Fiscales

- complejidad: CRUD medio relacional
- patron recomendado:
  - listado con busqueda por nombre, documento o email
  - filtros: `Pendiente de activación`, `Activa`, `Sin torneos asignados`, `Con asignaciones`
  - alta y edicion en drawer mediano
  - asignaciones por torneo en panel lateral del fiscal seleccionado
  - tabla con columnas: `Fiscal`, `Cuenta`, `Asignaciones`, `Acciones`
- notas:
  - la asignacion es una tarea recurrente y debe tener bloque propio
  - quitar asignacion puede resolverse inline dentro del panel lateral, no en la tabla principal

#### Torneos

- complejidad: CRUD operativo
- patron recomendado:
  - listado con estado y fecha visibles
  - filtros por estado
  - CTA `Nuevo torneo`
  - edicion en drawer amplio para este paquete
  - acciones de negocio visibles: `Editar`, `Cerrar torneo`
  - accion destructiva menos prominente y separada
- notas:
  - si mas adelante crece configuracion de reglamento, horarios y scoring, pasar a pagina de detalle

### Comportamiento De Pantallas Y Componentes

- Header:
  - la accion primaria vive en header, no dentro de la card del formulario
- Toolbar:
  - visible arriba del listado
  - no esconder busqueda o filtros detras de menus para estos modulos
- Tabla:
  - header sticky cuando haya scroll vertical
  - hover suave
  - densidad media, no compacta extrema
  - una columna principal visualmente dominante
- Drawer:
  - ancho corto para equipos y embarcaciones
  - ancho medio para participantes y fiscales
  - titulo dinamico `Nuevo ...` o `Editar ...`
  - CTA persistente al pie: `Guardar` y `Cancelar`
- Acciones:
  - primaria: `Editar` o `Ver detalle`
  - secundaria: `Cerrar torneo`, `Asignar torneo`, `Gestionar vínculos`
  - destructiva: `Dar de baja` solo en menu secundario o boton visualmente separado

### Estados, Validaciones Y Feedback

- loading:
  - skeleton o bloque de carga para toolbar y tabla
- empty:
  - mensaje + CTA principal
- no-results:
  - `No encontramos resultados para esta búsqueda. Probá con otro nombre o limpiá los filtros.`
- success:
  - toast superior derecho
  - auto-cierre a los 5 segundos
  - boton `Cerrar`
- error:
  - toast o banner persistente hasta cierre manual
  - copy accionable y no tecnica
- validacion:
  - error al pie del campo
  - resumen corto arriba del drawer si hay multiples errores

### Copy Visible Recomendado

- CTA header:
  - `Nuevo equipo`
  - `Nueva embarcación`
  - `Nuevo participante`
  - `Nuevo fiscal`
  - `Nuevo torneo`
- placeholders de busqueda:
  - `Buscar por nombre`
  - `Buscar por nombre, documento o email`
  - `Buscar por nombre o matrícula`
- estados vacios:
  - `Todavía no hay equipos cargados.`
  - `Todavía no hay embarcaciones registradas.`
  - `Todavía no hay participantes cargados.`
  - `Todavía no hay fiscales cargados.`
- confirmacion de baja:
  - titulo: `Dar de baja`
  - descripcion: `Este registro dejará de mostrarse entre los activos. Su historial seguirá disponible.`
  - CTA: `Confirmar baja`

### Web-Specific Notes

- mantener tabla como patron base para escritorio
- reducir el ancho visual de la sidebar o quitar protagonismo del bloque de perfil
- permitir que el area principal llegue a un ancho mas util para listados
- para entidades medianas, preferir master-detail:
  - tabla a la izquierda
  - panel lateral a la derecha solo cuando haya una fila seleccionada

### Mobile-Specific Notes

- en mobile no reutilizar tabla horizontal densa
- usar lista de cards resumidas por registro
- CTA principal fijo o visible al inicio
- filtros en sheet o bloque desplegable
- drawer en mobile se comporta como pantalla completa

### Accesibilidad

- la fila seleccionada debe tener estado visible, no solo hover
- el drawer debe recibir foco al abrir y devolverlo al trigger al cerrar
- confirmaciones destructivas con foco inicial en `Cancelar`
- no depender solo del color para estados de cuenta o habilitacion
- inputs y selects con labels siempre visibles

### Criterios UX Para Testing De Esta Remediacion

- un operador puede crear un registro nuevo sin recorrer toda la pantalla para encontrar el formulario
- un operador puede encontrar un registro existente usando busqueda sin revisar manualmente todas las filas
- editar un registro no obliga a perder el contexto del listado
- participantes sin equipo o sin embarcacion se detectan en menos de 5 segundos visuales
- fiscales sin torneo asignado se detectan sin abrir cada fila
- la accion destructiva no compite visualmente con la accion principal
- en mobile las entidades administrativas siguen siendo legibles sin scroll horizontal de tabla

### Cambios Concretos Priorizados Para Frontend Web

#### Quick wins de alto impacto

- mover la accion `Nuevo ...` al header de cada modulo
- invertir prioridad visual:
  - primero toolbar + listado
  - formulario solo al crear o editar
- agregar busqueda local cliente para equipos, embarcaciones, participantes, fiscales y torneos
- reducir el peso visual de `Dar de baja`
- agregar contador de resultados sobre la tabla
- reducir ancho o densidad visual de sidebar administrativa
- agregar estado `sin resultados`

#### Rediseño estructural razonable dentro de alcance

- reemplazar `split-card-form` por patron `toolbar + table + drawer`
- reutilizar un drawer generico para:
  - equipos
  - embarcaciones
  - participantes
  - fiscales
  - torneos
- separar gestion de vinculos y asignaciones del cuerpo de la tabla
- convertir participantes y fiscales a patron master-detail liviano

### Plan Ejecutable Para `frontend_web`

#### Fase 1

- crear componentes reutilizables:
  - `AdminToolbar`
  - `AdminDrawer`
  - `AdminTableEmptyState`
- adaptar `SimpleCatalogPage` para abrir `create/edit` en drawer
- agregar busqueda cliente simple por columnas visibles
- llevar CTA principal al `PageHeader`

#### Fase 2

- refactorizar `ParticipantsPage`
  - sacar selects de vinculo de la tabla
  - mostrar resumen de vinculos en tabla
  - panel lateral para gestionar equipo y embarcacion
- refactorizar `OfficialsPage`
  - sacar asignacion directa de la tabla
  - panel lateral para asignaciones por torneo

#### Fase 3

- ajustar `TournamentsPage` al mismo patron
- revisar densidad, sticky header y jerarquia de acciones
- agregar pruebas de interfaz para:
  - abrir drawer
  - crear
  - editar
  - buscar
  - ver estado vacio y sin resultados

### Riesgos Y Tradeoffs

- pasar a drawer aumenta algo la complejidad de estado en frontend, pero mejora mucho la continuidad visual
- la busqueda cliente es suficiente para este paquete, pero puede quedar corta con volumen alto futuro
- participantes y fiscales requieren mas trabajo que catalogos simples por mezclar CRUD y relacionamiento
- torneos podria necesitar luego pagina propia de detalle, pero no hace falta abrir ese frente ahora

### Decision De Avance

- `frontend_web` puede avanzar sin mas definicion humana para esta remediacion
- decision explicitada:
  - aplicar patron `toolbar + listado + drawer`
  - dejar `participants` y `officials` con panel de relacionamiento en esta misma sesion o paquete inmediato
  - no esperar nueva definicion funcional para quick wins ni para el rediseño acotado

### Sugerencias Para `project-state.md`

- actualizar `Objetivo Actual` para reflejar remediacion estructural UX del backoffice administrativo
- marcar que `PKG-001` esta funcionalmente cerrado pero con remediacion UX de CRUD en curso o pendiente de ejecucion
- agregar como siguiente paso recomendado a `frontend_web` la implementacion del patron `toolbar + listado + drawer`

## Adenda UX Ejecutable Para CRUD Desktop Con Panel Lateral

### Contexto De Esta Adenda

- pedido puntual sobre remanentes en:
  - `frontend/src/components/admin-pages.tsx`
  - `frontend/app/globals.css`
- modulos mas sensibles:
  - `Participantes`
  - `Fiscales`

### Problemas Observados

- hay copy visible redactado como explicacion de arquitectura de pantalla y no como ayuda para la tarea del usuario final
- el panel lateral usa `sticky` pero no tiene altura ni comportamiento de scroll definidos, por lo que cambia de posicion percibida cuando varia el contenido
- la tabla larga depende del scroll de pagina completo; eso degrada estabilidad visual, pierde encabezados y complica uso con muchas filas

### Cambio Recomendado 1: Copy Apto Para Usuario Final

Decision:

- eliminar textos que describen la solucion de layout o separacion interna de responsabilidades
- el copy visible debe explicar que puede hacer la persona en esa pantalla, no como esta armada

Reemplazos concretos para `frontend/src/components/admin-pages.tsx`:

- `Participantes` `PageHeader.description`
  - reemplazar por: `Consultá el padrón, editá datos y revisá equipo o embarcación sin salir del listado.`
- `Participantes` `DetailPanel.description` con fila seleccionada
  - reemplazar por: `Revisá y actualizá el equipo y la embarcación de este participante.`
- `Participantes` `DetailPanel.description` sin fila seleccionada
  - reemplazar por: `Seleccioná un participante para ver su información y sus vínculos.`
- `Participantes` `EmptyState.description`
  - reemplazar por: `Seleccioná una fila del listado para ver el detalle.`
- `Fiscales` `PageHeader.description`
  - reemplazar por: `Consultá el listado, editá datos y administrá los torneos asignados desde el detalle.`
- `Fiscales` `DetailPanel.description` con fila seleccionada
  - reemplazar por: `Asigná o quitá torneos para este fiscal desde el detalle.`
- `Fiscales` `DetailPanel.description` sin fila seleccionada
  - reemplazar por: `Seleccioná un fiscal para ver su información y sus torneos asignados.`
- `Fiscales` `EmptyState.description`
  - reemplazar por: `Seleccioná una fila del listado para ver el detalle.`

Regla de copy:

- evitar frases como `la tabla concentra`, `panel lateral`, `no mezclar lectura con edición`, `lectura operativa`
- usar verbos de tarea:
  - `consultá`
  - `revisá`
  - `editá`
  - `asigná`
  - `quitá`

### Cambio Recomendado 2: Estabilidad Visual Del Panel Lateral

Decision:

- el panel lateral debe quedar top-aligned y estable aunque cambie el contenido
- en escritorio el panel lateral sigue siendo `sticky`, pero con altura acotada y scroll interno propio
- el contenido del panel no debe empujar visualmente la pagina completa cuando cambia entre vacio, resumen corto o lista larga

Implementacion UX esperada en `frontend/app/globals.css`:

- mantener `align-items: start` en `.admin-detail-layout`
- cambiar `.detail-panel` para que use:
  - `position: sticky`
  - `top: 24px`
  - `align-self: start`
  - `max-height: calc(100vh - 48px)`
  - `overflow: hidden`
- hacer que el cuerpo desplazable sea `.detail-panel-content`:
  - `overflow-y: auto`
  - `max-height: calc(100vh - 180px)` como base ajustable segun header real del panel
  - `padding-right` corto para que la barra de scroll no pegue sobre el contenido
- si el panel muestra estado vacio, summary, notice y lista, ese bloque completo debe quedar dentro del contenedor scrolleable del panel

Resultado esperado:

- el borde superior del panel no cambia al seleccionar filas distintas
- la seleccion de una fila nunca recentra la pagina
- `Fiscales` deja de producir sensacion de salto vertical cuando aparecen muchas asignaciones

### Cambio Recomendado 3: Patron De Scroll Para Tablas Largas En Desktop

Decision explicita:

- usar header sticky y scroll interno razonable para tablas largas
- no dejar que una tabla administrativa larga dependa solo del scroll del documento
- mantener scroll horizontal solo como fallback; el caso principal es scroll vertical dentro de la tarjeta de listado

Implementacion UX esperada en `frontend/app/globals.css`:

- convertir `.table-wrap` en contenedor de scroll bidireccional:
  - `overflow: auto`
  - `max-height: calc(100vh - 320px)` en desktop como base ajustable segun header + toolbar reales
- aplicar sticky header en `.data-table thead th`:
  - `position: sticky`
  - `top: 0`
  - `z-index` suficiente para quedar sobre filas
  - fondo solido equivalente al card para evitar transparencia al scrollear
- mantener una sola barra de scroll principal dentro de la tabla, no una por columna o por subbloque
- cuando haya muchas filas, la pagina debe conservar visibles:
  - header del modulo
  - toolbar de busqueda
  - encabezado de columnas al menos mientras se recorre el listado

Notas de comportamiento:

- escritorio:
  - tabla y panel lateral pueden tener scroll independiente
  - el usuario no pierde contexto del item seleccionado mientras recorre muchas filas
- mobile:
  - desactivar sticky del panel lateral como ya esta definido
  - no forzar alturas fijas ni doble scroll en mobile

### Criterios De Aceptacion Para Testing

- no queda copy visible con lenguaje de arquitectura de interfaz en `Participantes` ni `Fiscales`
- al seleccionar distintas filas en `Fiscales`, el panel lateral mantiene el mismo borde superior visible
- si un fiscal tiene muchas asignaciones, el scroll sucede dentro del panel y no mueve bruscamente toda la pagina
- con 30 o mas filas en `Participantes` o `Fiscales`, el header de columnas permanece visible al hacer scroll del listado
- con 30 o mas filas, la toolbar de busqueda sigue fuera de la zona scrolleable de la tabla
- al cambiar de una fila sin asignaciones a otra con muchas asignaciones, no hay salto perceptible del layout
- el estado vacio del panel lateral ocupa el mismo contenedor y no altera la alineacion superior del layout
- en desktop no aparecen dos scrolls verticales compitiendo dentro del mismo bloque de tabla
- en mobile el layout vuelve a una sola columna sin sticky lateral ni contenedores con altura fija

### Decision De Avance

- `frontend_web` puede avanzar sin humano para esta remediacion
- alcance autorizado para esta sesion:
  - reemplazo de copy visible en `Participantes` y `Fiscales`
  - endurecimiento CSS de panel lateral sticky con scroll interno
  - endurecimiento CSS de tablas largas con header sticky y scroll interno desktop

## Especificacion Ejecutable PKG-002 Inscripcion Y Auto-Registro

Estado de madurez:

- no hay gaps funcionales bloqueantes para cerrar UX de `PKG-002`
- se toma como base el contrato de `Inscripciones` y el patron `toolbar + listado + panel lateral/drawer` ya validado en `PKG-001`

### Mapa De Flujos PKG-002

- Flujo publico de auto-registro
  - entrar a `/autoregistro`
  - elegir torneo si hay mas de uno habilitado; si hay uno solo, verlo preseleccionado
  - completar datos personales
  - aceptar reglamento
  - enviar solicitud
  - ver confirmacion persistente con enlace de consulta y codigo de consulta
  - continuar a `/autoregistro/estado/[lookupToken]`
- Flujo publico de consulta de estado
  - abrir `/autoregistro/estado/[lookupToken]`
  - ver estado derivado, proximo paso y eventual motivo visible
  - volver a la portada publica o iniciar una nueva solicitud cuando corresponda
- Flujo administrativo de revision
  - entrar a `/admin/inscripciones`
  - usar toolbar para buscar y filtrar
  - abrir una solicitud en panel lateral
  - revisar datos del postulante y de la solicitud
  - aprobar o rechazar desde acciones primarias del panel
  - recibir feedback inmediato y continuar con la siguiente pendiente

### Arquitectura De Informacion PKG-002

- Zona publica
  - `/autoregistro`
  - `/autoregistro/estado/[lookupToken]`
- Zona administrativa
  - `/admin/inscripciones`
    - toolbar
    - listado
    - panel lateral de detalle
    - dialogo de aprobacion
    - dialogo de rechazo

### Labels Visibles De Estados Derivados

- `PENDING_REVIEW` -> `Pendiente de revision`
- `PENDING_ACCOUNT_ACTIVATION` -> `Pendiente de activacion`
- `READY_TO_COMPETE` -> `Habilitada para competir`
- `REJECTED` -> `Rechazada`

Regla de uso:

- en badges y tablas usar la etiqueta corta
- en vistas publicas acompañar la etiqueta con un titulo y una bajada explicando el siguiente paso
- no mostrar enums crudos ni estados internos adicionales al usuario final

### Pantalla Publica `/autoregistro`

Objetivo:

- permitir que una persona se inscriba sin ayuda, en una sola pagina y sin exponer campos fuera de alcance

Estructura:

- header publico con titulo, bajada corta y bloque de torneo
- formulario en una sola columna visual, aun en desktop
- bloque final de aceptacion del reglamento
- CTA principal al cierre del formulario
- estado de confirmacion en reemplazo del formulario despues del envio exitoso

Campos visibles:

- `Torneo` obligatorio
- `Nombre` obligatorio
- `Apellido` obligatorio
- `Documento` opcional
- `Email` obligatorio
- `Celular` opcional
- checkbox obligatorio `Acepto el reglamento del torneo`
- link secundario `Leer reglamento`

Reglas de presentacion:

- si hay un solo torneo habilitado, mostrarlo en un bloque resumen no editable
- si hay varios torneos habilitados, usar selector visible arriba del formulario
- no mostrar campos de equipo, embarcacion, pago, documentos ni observaciones libres en este paquete

Validaciones visibles:

- `Torneo`: `Elegi un torneo para continuar.`
- `Nombre`: `Ingresá tu nombre.`
- `Apellido`: `Ingresá tu apellido.`
- `Email` vacio: `Ingresá tu email.`
- `Email` invalido: `Ingresá un email valido.`
- `Aceptacion de reglamento`: `Necesitás aceptar el reglamento para enviar la inscripcion.`
- errores multiples:
  - resumen superior: `Revisá los campos marcados para continuar.`

Estados:

- loading inicial:
  - skeleton de bloque de torneo y formulario
- empty sin torneos habilitados:
  - titulo: `Ahora no hay inscripciones abiertas`
  - descripcion: `Cuando haya un torneo disponible, vas a poder inscribirte desde aca.`
  - CTA: `Volver al inicio`
- error de carga:
  - titulo: `No pudimos cargar la inscripcion`
  - descripcion: `Probá de nuevo en unos minutos.`
  - CTA: `Reintentar`
- envio en progreso:
  - CTA disabled con texto `Enviando inscripcion...`
- envio exitoso:
  - reemplazar formulario por panel de exito persistente
  - titulo: `Recibimos tu inscripcion`
  - descripcion: `La organizacion la va a revisar antes de confirmarla.`
  - bloque visible `Codigo de consulta`
  - texto de ayuda: `Guarda este enlace o copia el codigo. Lo vas a necesitar para seguir el estado.`
  - CTA primario: `Consultar estado`
  - CTA secundario: `Copiar enlace`
- error al enviar:
  - banner persistente arriba del formulario
  - titulo: `No pudimos enviar tu inscripcion`
  - descripcion: `Probá de nuevo. Si el problema sigue, comunicate con la organizacion.`

Mensajes funcionales recomendados:

- solicitud duplicada:
  - `Ya hay una inscripcion en revision o aprobada con estos datos para este torneo.`
- torneo ya no disponible:
  - `Este torneo ya no acepta nuevas inscripciones.`

### Pantalla Publica `/autoregistro/estado/[lookupToken]`

Objetivo:

- permitir consulta publica sin sesion y sin exponer datos sensibles

Estructura:

- card central con nombre del torneo, badge de estado, titulo, descripcion y proximo paso
- bloque opcional `Motivo informado por la organizacion` solo si existe contenido apto para mostrar
- acciones de salida simples

Contenido visible minimo:

- nombre del torneo
- estado derivado visible
- proximo paso
- motivo visible si fue cargado y es publico

Estados por resultado:

- `Pendiente de revision`
  - titulo: `Tu inscripcion esta en revision`
  - descripcion: `Ya recibimos tus datos. Cuando haya una definicion, la vas a ver aca.`
  - tono visual: informativo
- `Pendiente de activacion`
  - titulo: `Tu inscripcion fue aprobada`
  - descripcion: `Para terminar, activa tu cuenta desde el email que te enviamos.`
  - ayuda: `Revisa tambien correo no deseado o spam.`
  - tono visual: exito con paso pendiente
- `Habilitada para competir`
  - titulo: `Tu inscripcion ya esta lista`
  - descripcion: `Quedo aprobada y habilitada para competir en este torneo.`
  - tono visual: exito
- `Rechazada`
  - titulo: `Tu inscripcion no fue aprobada`
  - descripcion: `Si la organizacion dejo un motivo, lo vas a ver abajo.`
  - ayuda: `Si necesitas mas informacion, comunicate con la organizacion del torneo.`
  - tono visual: advertencia

Estados invalidos o no disponibles:

- token invalido, inexistente o consumido:
  - usar una misma estructura visual para no filtrar informacion sensible
  - titulo: `No pudimos abrir esta consulta`
  - descripcion: `Revisa el enlace o usa el codigo de consulta que recibiste al enviar la inscripcion.`
  - CTA primario: `Volver a auto-registro`
- token expirado si el backend lo distingue:
  - titulo: `Este enlace ya no esta disponible`
  - descripcion: `Si todavia tenes el codigo o un enlace mas reciente, usa ese acceso para continuar.`
  - CTA primario: `Volver a auto-registro`
- loading:
  - skeleton de card central
- error tecnico:
  - titulo: `No pudimos consultar el estado`
  - descripcion: `Probá de nuevo en unos minutos.`
  - CTA: `Reintentar`

### Pantalla Administrativa `/admin/inscripciones`

Objetivo:

- resolver revision y decision con el patron administrativo ya establecido y sin ambiguedad operativa

Patron visual:

- mismo layout de `PKG-001`
- header de modulo
- toolbar visible
- listado protagonista
- panel lateral de detalle en desktop
- drawer full-screen en mobile

Header:

- titulo: `Inscripciones`
- descripcion: `Revisa solicitudes, confirma el estado y segui las pendientes desde un solo lugar.`
- accion secundaria opcional: `Actualizar`

Toolbar:

- busqueda: `Buscar por nombre o email`
- filtro `Torneo`
- filtro `Estado`
- filtro `Canal`
- contador de resultados
- no incluir exportacion ni acciones masivas en `PKG-002`

Canales visibles:

- `SELF_SERVICE` -> `Auto-registro`
- `ADMIN` -> `Carga administrativa`

Listado desktop:

- columnas:
  - `Postulante`
  - `Torneo`
  - `Estado`
  - `Canal`
  - `Ultima actualizacion`
  - `Acciones`
- `Postulante` muestra nombre como dato primario y email como dato secundario
- `Acciones` deja una accion principal `Ver detalle`; aprobar y rechazar viven en el panel, no en cada fila
- fila seleccionada con estado visual persistente

Listado mobile:

- cards resumidas con:
  - nombre
  - torneo
  - estado
  - canal
  - fecha relativa o corta
  - CTA `Ver detalle`

Panel lateral de detalle:

- encabezado con nombre del postulante, torneo y badge de estado
- seccion `Datos del postulante`
- seccion `Datos de la solicitud`
- seccion `Participante y cuenta` si el backend devuelve vinculacion o estado de cuenta
- seccion `Resolucion` visible solo si ya esta aprobada o rechazada
- footer fijo con acciones

Campos visibles en detalle:

- nombre
- apellido
- documento si existe
- email
- celular si existe
- torneo
- canal
- fecha de envio
- fecha de aceptacion de reglamento
- participante vinculado si existe
- estado de cuenta si existe
- motivo de rechazo si existe y corresponde mostrarlo

Acciones:

- si el estado es `Pendiente de revision`:
  - primario `Aprobar inscripcion`
  - secundario `Rechazar`
- si la solicitud ya esta resuelta:
  - ocultar acciones de resolucion
  - mostrar resumen de resolucion en modo lectura

Dialogo de aprobacion:

- titulo: `Aprobar inscripcion`
- descripcion: `La solicitud va a pasar a aprobada y, si hace falta, se va a preparar la activacion de cuenta.`
- CTA primario: `Aprobar inscripcion`
- CTA secundario: `Cancelar`

Dialogo de rechazo:

- titulo: `Rechazar inscripcion`
- descripcion: `Podes dejar un motivo breve para que la persona lo vea en su consulta de estado.`
- campo visible: `Motivo para la persona solicitante` opcional
- placeholder: `Ejemplo: Falta validar un dato de contacto.`
- CTA primario: `Rechazar inscripcion`
- CTA secundario: `Cancelar`

Comportamiento despues de resolver:

- si el filtro activo es `Pendiente de revision`, refrescar listado y abrir automaticamente la siguiente pendiente en desktop
- si no quedan pendientes, cerrar panel y mostrar empty state correspondiente
- en mobile, volver al listado con toast de resultado

Estados de la bandeja:

- loading:
  - skeleton para toolbar, tabla y panel
- empty general:
  - titulo: `Todavia no hay inscripciones`
  - descripcion: `Cuando entren solicitudes o se creen inscripciones administrativas, las vas a ver aca.`
- empty filtrado pendientes:
  - titulo: `No hay pendientes para revisar`
  - descripcion: `Las nuevas solicitudes van a aparecer en esta bandeja.`
- no-results:
  - `No encontramos resultados para esa busqueda o filtros.`
- error de carga:
  - titulo: `No pudimos cargar las inscripciones`
  - descripcion: `Actualiza la bandeja o probá de nuevo en unos minutos.`
  - CTA: `Reintentar`
- error al resolver:
  - banner o toast persistente
  - titulo: `No pudimos actualizar la inscripcion`
  - descripcion: `Actualiza la bandeja e intenta de nuevo.`

### Feedback De Acciones

Envio de auto-registro:

- usar panel de exito persistente, no toast efimero
- el mensaje queda visible hasta salir de la pantalla

Aprobacion administrativa:

- toast de exito, auto-cierre a los 5 segundos y boton `Cerrar`
- variantes:
  - `Inscripcion aprobada. Ya quedo habilitada para competir.`
  - `Inscripcion aprobada. Falta que active su cuenta desde el email.`

Rechazo administrativo:

- toast de confirmacion, auto-cierre a los 5 segundos y boton `Cerrar`
- mensaje: `Inscripcion rechazada. El estado ya quedo actualizado.`

Errores:

- mantener visibles hasta cierre manual o nueva accion relevante
- no exponer mensajes tecnicos del backend

### Reglas De Copy Y Mensajes De Error

Mensajes visibles para usuario final:

- evitar `solicitud creada`, `lookup token`, `enum`, `409` o equivalentes tecnicos
- hablar de `inscripcion`, `estado`, `revision`, `activacion` y `organizacion`

Mensajes de error sugeridos:

- duplicado:
  - `Ya existe una inscripcion para este torneo con estos datos.`
- conflicto al aprobar o rechazar:
  - `Esta inscripcion ya fue resuelta desde otra sesion. Actualiza la bandeja para ver el estado actual.`
- problema temporal:
  - `No pudimos completar la accion en este momento. Probá de nuevo.`

### Notas Web Especificas

- en desktop mantener tabla con header sticky y panel lateral visible
- el toolbar debe quedar fuera del area scrolleable del listado
- el panel lateral debe sostener acciones primarias en el footer, siempre visibles
- la consulta publica de estado usa card centrada y ancho contenido; no tabla ni layout administrativo

### Notas Mobile Especificas

- `/autoregistro` en una sola columna, con CTA principal de ancho completo
- el bloque `Codigo de consulta` debe poder copiarse sin precision fina
- `/autoregistro/estado/[lookupToken]` prioriza titulo, badge y proximo paso antes que cualquier metadata
- en `/admin/inscripciones` reemplazar tabla por cards y abrir detalle en vista completa
- acciones `Aprobar inscripcion` y `Rechazar inscripcion` fijas al pie de la vista de detalle mobile

### Accesibilidad PKG-002

- asociar todos los errores al campo correspondiente y anunciar el resumen superior
- el checkbox de reglamento debe ser navegable por teclado y tener link al reglamento sin romper foco
- el estado derivado debe leerse por texto completo, no solo por color de badge
- el panel de exito del auto-registro debe anunciarse por `aria-live`
- los dialogos de aprobacion y rechazo abren con foco en el titulo y vuelven al trigger al cerrar

### Criterios UX Para Testing PKG-002

- una persona nueva puede completar `/autoregistro` sin ayuda y sin encontrar campos fuera de alcance
- el exito del auto-registro deja visible el enlace de consulta antes de abandonar la pagina
- la consulta publica nunca muestra email, documento ni ids internos
- el estado `Pendiente de activacion` deja claro que la aprobacion ya ocurrio y que falta revisar el email
- un admin puede revisar una solicitud completa sin salir del listado
- aprobar o rechazar una solicitud no obliga a refrescar manualmente la pantalla para seguir trabajando
- la bandeja administrativa mantiene el patron visual ya usado en `PKG-001`
- en mobile el flujo publico sigue siendo usable sin zoom ni scroll horizontal

### Consideraciones Transversales Aplicables

- persistencia del enlace de consulta:
  - mostrar `Copiar enlace` y `Codigo de consulta`
  - no depender de almacenamiento permanente compartido para retomar el flujo
- sincronizacion entre tabs o sesiones:
  - si una solicitud cambia de estado mientras el admin la tiene abierta, mostrar banner `Esta inscripcion cambio en otra sesion. Actualiza para ver el estado mas reciente.`
- creacion inline:
  - no habilitar alta inline de participantes, equipos ni embarcaciones desde `PKG-002`
- exportaciones, carga de archivos grandes y offline:
  - no aplican a este paquete y no deben aparecer como affordances vacias

### Handoff Ejecutable Para Frontend Y QA

- implementar rutas:
  - `/autoregistro`
  - `/autoregistro/estado/[lookupToken]`
  - `/admin/inscripciones`
- reutilizar componentes del patron administrativo existente:
  - `PageHeader`
  - toolbar con filtros visibles
  - listado principal
  - panel lateral o drawer segun breakpoint
  - dialogs propios de confirmacion
  - toast y banner, nunca dialogs nativos
- modelar los estados visibles derivados exactamente como:
  - `Pendiente de revision`
  - `Pendiente de activacion`
  - `Habilitada para competir`
  - `Rechazada`
- QA debe validar:
  - selector de torneo con un torneo y con multiples torneos
  - guardado y copia del enlace de consulta
  - token invalido o expirado
  - aprobacion con resultado `Habilitada para competir`
  - aprobacion con resultado `Pendiente de activacion`
  - rechazo con y sin motivo visible

### Normalizacion Final De Copy Visible PKG-002

Esta subseccion prevalece sobre cualquier variante sin acentos que haya quedado en el documento por arrastre historico.

Estados visibles finales:

- `Pendiente de revisión`
- `Pendiente de activación`
- `Habilitada para competir`
- `Rechazada`

Mensajes visibles finales:

- `/autoregistro`
  - `Elegí un torneo para continuar.`
  - `Ingresá tu nombre.`
  - `Ingresá tu apellido.`
  - `Ingresá tu email.`
  - `Ingresá un email válido.`
  - `Necesitás aceptar el reglamento para enviar la inscripción.`
  - `Recibimos tu inscripción`
  - `La organización la va a revisar antes de confirmarla.`
  - `Código de consulta`
  - `Guardá este enlace o copiá el código. Lo vas a necesitar para seguir el estado.`
  - `No pudimos enviar tu inscripción`
- `/autoregistro/estado/[lookupToken]`
  - `Tu inscripción está en revisión`
  - `Tu inscripción fue aprobada`
  - `Tu inscripción ya está lista`
  - `Tu inscripción no fue aprobada`
  - `No pudimos abrir esta consulta`
  - `Este enlace ya no está disponible`
- `/admin/inscripciones`
  - `Revisá solicitudes, confirmá el estado y seguí las pendientes desde un solo lugar.`
  - `Aprobar inscripción`
  - `Rechazar inscripción`
  - `Todavía no hay inscripciones`
  - `No pudimos actualizar la inscripción`
  - `Inscripción aprobada. Ya quedó habilitada para competir.`
  - `Inscripción aprobada. Falta que active su cuenta desde el email.`
  - `Inscripción rechazada. El estado ya quedó actualizado.`
