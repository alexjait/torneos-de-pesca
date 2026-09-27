# Especificacion De Requerimientos De Software

Owner recomendado: `functional_analyst`

## Resumen Ejecutivo

Esta ERS define el alcance funcional y no funcional de la primera version del sistema integral de gestion de torneos de pesca. El objetivo del MVP es cubrir la operacion central del torneo con una plataforma web responsive, priorizando la administracion del evento, la inscripcion, la gestion de fiscales, la carga y validacion de capturas, el scoring configurable inicial, el ranking oficial y el cierre con reportes.

La especificacion deja explicitamente separado:

- lo que entra en MVP
- lo que queda fuera de alcance inicial
- las reglas de negocio ya cerradas
- los supuestos operativos
- las decisiones que otras especialidades deben tomar sin reinterpretar el negocio

El MVP admite un alcance offline inicial acotado y deja prevista una evolucion futura a offline completo.

## Objetivos De Negocio

- centralizar la gestion operativa de torneos en una sola plataforma
- reducir errores manuales en inscripcion, capturas, validacion, scoring y cierre
- mejorar la trazabilidad y auditabilidad del resultado oficial
- sostener la operacion con conectividad limitada mediante un alcance offline acotado
- brindar visibilidad de ranking y estado de capturas a los actores del torneo
- dejar una base reusable para multiples torneos e historico

## Decisiones Cerradas

- la primera version sera web responsive optimizada para uso movil
- en el MVP solo los fiscales cargan capturas
- una captura solo impacta en el ranking si fue validada
- la medicion inicial de scoring se basa en longitud y no en peso
- no se implementa medicion automatica por imagen en el MVP
- se admite un offline MVP acotado, no offline completo
- el scoring inicial debe permitir configurar:
  - puntos por pieza
  - bonus por la pieza mas grande
  - puntos por especies distintas
  - penalizaciones por incumplimiento del reglamento
- habra inscripcion administrativa y tambien auto-registro de participantes
- el auto-registro queda pendiente de revision y aprobacion
- los fiscales se asignan por torneo
- el clima queda fuera del MVP y pasa a una segunda etapa
- cuando un usuario sea dado de alta administrativamente, debe recibir email con datos de registracion y validar su cuenta
- la misma validacion de email aplica a fiscales

## Supuestos

- el organizador define reglamento, horarios y parametros del torneo antes de habilitar la operacion en campo
- el uso principal en movilidad durante el torneo corresponde a fiscales
- participantes pueden consultar informacion del torneo y su estado, pero no cargar capturas en el MVP
- la organizacion requiere historico de torneos y bajas logicas cuando aplique
- el flujo de aprobacion de auto-registro sera realizado por perfiles administrativos del torneo
- las exportaciones del MVP no requieren formatos regulatorios especiales no declarados aun

## Actores Y Roles

- Administrador / Organizador
  Gestiona torneos, parametros, participantes, equipos, embarcaciones, fiscales, aprobaciones, auditoria, ranking y cierre.
- Fiscal
  Registra y valida capturas dentro de los torneos donde fue asignado.
- Participante
  Puede auto-registrarse, consultar informacion del torneo, ranking y sus capturas.
- Servicio de correo transaccional
  Actor externo para envio de credenciales, avisos de registracion y validacion de cuenta.

### Permisos funcionales base

- Administrador:
  - alta, edicion, consulta y cierre de torneos
  - administracion de participantes, equipos, embarcaciones y fiscales
  - aprobacion o rechazo de auto-registros
  - configuracion de scoring y horarios
  - visualizacion y auditoria integral
  - generacion de reportes y exportaciones
- Fiscal:
  - consulta del torneo asignado
  - carga de capturas
  - validacion, observacion o rechazo de capturas segun regla operativa
  - consulta de ranking segun permisos
- Participante:
  - auto-registro
  - validacion de cuenta de email
  - consulta de informacion del torneo
  - consulta de ranking
  - consulta de sus capturas y estado

## Alcance Funcional

### MVP funcional

- gestion de torneos
- gestion de participantes, equipos y embarcaciones
- inscripcion administrativa
- auto-registro de participantes con estado pendiente de revision/aprobacion
- cuentas de usuario y validacion de email
- gestion y asignacion de fiscales por torneo
- carga de capturas por fiscales
- validacion de capturas
- scoring configurable inicial
- ranking en vivo y ranking final oficial
- control de horarios operativos
- reportes y exportaciones basicas
- offline acotado para operacion de capturas
- trazabilidad y auditoria

### Modulos funcionales

#### 1. Gestion de torneos

Permite crear, editar, consultar, publicar y cerrar torneos con configuracion general, reglamento aplicable, horarios oficiales y parametros de scoring.

#### 2. Gestion de participantes, equipos y embarcaciones

Permite administrar entidades del torneo y sus relaciones, incluyendo altas, modificaciones, consulta, bajas logicas y habilitacion para competir.

#### 3. Inscripcion

Incluye dos canales:

- administrativa, realizada por organizacion
- auto-registro del participante, sujeto a revision y aprobacion

#### 4. Cuentas y validacion de email

Incluye generacion o activacion de cuentas, envio de email de registracion y proceso de validacion de cuenta para usuarios dados de alta administrativamente y para fiscales.

#### 5. Gestion de fiscales

Permite alta, asignacion por torneo, habilitacion y trazabilidad de acciones.

#### 6. Capturas

Permite carga por fiscal con evidencia obligatoria, estado, datos de contexto y asociacion al participante o equipo correspondiente.

#### 7. Validacion

Permite aprobar, observar o rechazar capturas con trazabilidad y motivo registrado.

#### 8. Scoring y ranking

Permite configurar reglas iniciales soportadas y calcular ranking oficial considerando solo capturas validadas.

#### 9. Horarios operativos

Permite parametrizar ventanas operativas y bloquear acciones fuera de horario, salvo excepciones administrativas si el reglamento lo permite.

#### 10. Reportes y exportaciones

Permite generar reportes operativos y exportaciones basicas del torneo.

#### 11. Offline acotado MVP

Permite consultar informacion descargada y registrar capturas localmente cuando no hay conectividad, con sincronizacion posterior. No incluye resolucion avanzada de conflictos multiusuario ni cobertura completa del sistema fuera de linea.

## Alcance No Funcional

### Seguridad y acceso

- autenticacion con control de acceso por roles
- validacion de cuenta de email para cuentas dadas de alta administrativamente y fiscales
- resguardo de datos sensibles y evidencia fotografica
- trazabilidad de acciones relevantes

### Robustez y continuidad operativa

- tolerancia a fallos de conectividad
- persistencia local temporal en el alcance offline MVP
- no perdida silenciosa de capturas pendientes de sincronizacion
- recuperacion visible del estado de sincronizacion

### Usabilidad

- interfaz simple e intuitiva
- flujo de carga en campo de baja friccion
- experiencia responsive priorizada para uso movil

### Rendimiento

- respuesta agil en carga de capturas y consulta de ranking
- recalculo de ranking oportuno ante validaciones
- exportaciones ejecutables en tiempos operativos razonables

### Auditoria

- registro de altas, cambios, validaciones, rechazos y sincronizaciones
- historial consultable para soporte operativo y cierre de torneo

## Fuera De Alcance

- app mobile nativa
- carga de capturas por participantes
- firma digital avanzada
- medicion automatica por imagen
- integracion meteorologica
- pagos de inscripcion
- autenticacion social
- notificaciones avanzadas no vinculadas al alta o validacion de cuenta
- offline completo para todos los modulos
- resolucion avanzada de conflictos offline complejos
- variantes de scoring adicionales no explicitadas en las decisiones cerradas
- formatos regulatorios especiales de exportacion no definidos

## Reglas De Negocio

- toda captura debe incluir foto obligatoria
- la fecha y hora de captura se registran automaticamente
- la ubicacion GPS es recomendada y depende de permisos y disponibilidad del dispositivo
- solo las capturas validadas impactan en el ranking oficial
- en el MVP solo los fiscales cargan capturas
- una captura puede editarse solo mientras este pendiente de validacion
- una vez aprobada o rechazada, la captura no se edita; se anula y se registra una nueva si corresponde
- las acciones operativas deben respetar horarios configurados del torneo, salvo permisos especiales definidos por la organizacion
- el scoring inicial debe soportar puntos por pieza, bonus por pieza mas grande, puntos por especies distintas y penalizaciones
- los desempates se resuelven por:
  - mayor puntaje total
  - mayor longitud de la mejor captura
  - mayor cantidad de piezas validas
  - menor fecha/hora de la ultima captura valida que aporto puntaje
- el auto-registro de participante no habilita competir hasta ser revisado y aprobado
- el alta administrativa de usuario y el alta de fiscal requieren envio de email y validacion de cuenta
- toda accion relevante debe quedar auditada

## Dependencias Y Restricciones

### Dependencias funcionales

- la carga de capturas depende de la existencia de torneo activo, participante habilitado y fiscal asignado
- el ranking depende de scoring configurado y capturas validadas
- el cierre del torneo depende de la disponibilidad de informacion consolidada de capturas y validaciones
- la validacion de cuenta depende de un servicio de envio de correo y del flujo de activacion correspondiente

### Restricciones funcionales

- no se deben asumir integraciones no aprobadas
- el modelo funcional debe preservar historico de torneos
- la asignacion de fiscales se realiza por torneo en el MVP
- el alcance offline MVP solo cubre consulta de datos descargados y registro local de capturas con sincronizacion posterior

### Consideraciones transversales aplicables

- borrado logico: aplica para entidades administrativas e historicas cuando corresponda
- exportacion sincronica y asincronica: pendiente de definicion arquitectonica, pero funcionalmente el sistema debe permitir exportar reportes del MVP
- upload de archivos grandes con progreso: aplica por evidencia fotografica; UX y arquitectura deben definir experiencia y restricciones
- sincronizacion entre sesiones abiertas: pendiente de tratamiento tecnico; funcionalmente debe mantenerse consistencia operativa razonable

## Riesgos Y Supuestos

### Riesgos abiertos

- el alcance offline acotado puede ser insuficiente para ciertos torneos si la conectividad real es peor a la prevista
- la configuracion de scoring inicial puede quedarse corta frente a reglamentos no contemplados
- el proceso de auto-registro puede requerir validaciones documentales adicionales no definidas aun
- la validacion de email agrega dependencia operativa sobre entregabilidad de correos
- la asignacion de fiscales por torneo podria necesitar granularidad adicional en futuras iteraciones

### Pendientes para otras especialidades

- arquitectura:
  - estrategia tecnica para persistencia local y sincronizacion offline
  - mecanismo de autenticacion, gestion de credenciales temporales y validacion de cuenta
  - modelo de auditoria y almacenamiento de imagenes
  - estrategia de recalculo de ranking
- UX/UI:
  - flujos detallados de auto-registro, validacion de email, aprobacion administrativa y carga en campo
  - estados offline, pendiente de sincronizacion, error y recuperacion
  - flujos de validacion, observacion y rechazo
- testing:
  - cobertura funcional de escenarios de aprobacion, horarios, scoring, ranking y sincronizacion
- security review:
  - validacion del flujo de credenciales temporales
  - proteccion de datos personales y evidencia fotografica

## Criterios De Aceptacion Globales

- el administrador puede crear y configurar un torneo completo con datos generales, horarios y scoring inicial soportado
- el sistema permite gestionar participantes, equipos, embarcaciones y fiscales con sus relaciones basicas
- un participante puede auto-registrarse y quedar pendiente de revision/aprobacion
- un usuario dado de alta administrativamente recibe email de registracion y no queda operativo hasta validar la cuenta
- un fiscal dado de alta recibe email de registracion y debe validar su cuenta
- un fiscal asignado a un torneo puede registrar capturas con foto obligatoria y longitud manual
- las capturas pueden ser aprobadas, observadas o rechazadas con trazabilidad
- el ranking oficial considera solo capturas validadas y aplica las reglas de scoring y desempate definidas
- el sistema bloquea acciones fuera de horario segun configuracion del torneo
- el sistema genera ranking final oficial y reportes/exportaciones basicas del MVP
- sin conectividad, el sistema puede consultar informacion descargada y registrar capturas pendientes de sincronizacion
- al recuperar conectividad, el sistema sincroniza capturas pendientes y deja visible su estado

## Backlog Funcional Agrupado Por Especialidad

### Para `software_architect`

- definir arquitectura de modulos del MVP
- definir contratos funcionales para torneos, inscripciones, usuarios, fiscales, capturas, validacion, ranking y reportes
- definir estrategia de offline acotado y sincronizacion
- definir modelo de auditoria, archivos y trazabilidad

### Para `ux_ui_web_mobile`

- disenar flujos de administracion, auto-registro, aprobacion y validacion de cuenta
- disenar flujo de carga de captura en movilidad
- disenar estados de validacion y sincronizacion
- disenar pantallas de ranking, reportes y cierre

### Para `backend_web`

- implementar dominio y reglas de negocio de torneos, usuarios, fiscales, capturas, scoring, ranking y reportes
- implementar envio de email de registracion y validacion de cuenta
- implementar soporte de auditoria y sincronizacion

### Para `frontend_web`

- implementar panel administrativo, auto-registro, validacion de cuenta, ranking y reportes
- implementar flujo de captura en movilidad y estados offline del MVP

### Para `devops_infra`

- preparar entorno operativo para archivos, correos, configuraciones y observabilidad

### Para `security_reviewer`

- revisar flujo de autenticacion, credenciales temporales, validacion de cuenta, acceso por roles y proteccion de evidencia

### Para `testing`

- definir matriz de pruebas funcionales, no funcionales y de regresion del MVP

## Slices Funcionales Recomendados

- Slice 1:
  - RF-001, RF-002, RF-005, RF-004
  - objetivo: base administrativa y de acceso
- Slice 2:
  - RF-003
  - objetivo: inscripcion administrativa y auto-registro con aprobacion
- Slice 3:
  - RF-006, RF-007, RF-009, RF-011
  - objetivo: operacion de campo y trazabilidad
- Slice 4:
  - RF-008, RF-010
  - objetivo: ranking, cierre y exportaciones
- Slice transversal:
  - RNF-001, RNF-002
  - objetivo: seguridad, auditoria, usabilidad, performance y continuidad operativa

## Referencias A Requerimientos Individuales

- [RF-001 Gestion de torneos](requerimientos/RF-001-gestion-de-torneos.md)
- [RF-002 Gestion de participantes, equipos y embarcaciones](requerimientos/RF-002-gestion-de-participantes-equipos-embarcaciones.md)
- [RF-003 Inscripcion y auto-registro](requerimientos/RF-003-inscripcion-y-autoregistro.md)
- [RF-004 Cuentas, credenciales y validacion de email](requerimientos/RF-004-cuentas-credenciales-y-validacion-email.md)
- [RF-005 Gestion de fiscales](requerimientos/RF-005-gestion-de-fiscales.md)
- [RF-006 Carga de capturas](requerimientos/RF-006-carga-de-capturas.md)
- [RF-007 Validacion de capturas](requerimientos/RF-007-validacion-de-capturas.md)
- [RF-008 Scoring y ranking](requerimientos/RF-008-scoring-y-ranking.md)
- [RF-009 Control horario operativo](requerimientos/RF-009-control-horario-operativo.md)
- [RF-010 Reportes y exportaciones](requerimientos/RF-010-reportes-y-exportaciones.md)
- [RF-011 Operacion offline acotada](requerimientos/RF-011-operacion-offline-acotada.md)
- [RNF-001 Seguridad, trazabilidad y auditoria](requerimientos/RNF-001-seguridad-trazabilidad-y-auditoria.md)
- [RNF-002 Usabilidad, rendimiento y continuidad operativa](requerimientos/RNF-002-usabilidad-rendimiento-y-continuidad-operativa.md)
