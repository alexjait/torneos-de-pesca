# Brief De Negocio

Owner recomendado: `business_analyst`

## Problema U Oportunidad

La organizacion de torneos de pesca hoy puede depender de procesos manuales, planillas dispersas, validaciones poco trazables y coordinacion operativa compleja entre organizadores, fiscales y participantes. Eso genera riesgo de errores en inscripcion, carga de capturas, calculo de puntajes, armado del ranking y cierre del torneo.

La oportunidad de negocio es ofrecer una plataforma unica que ordene la operacion completa del torneo, mejore la transparencia del resultado oficial y reduzca friccion operativa en campo, incluso cuando la conectividad sea limitada o nula.

## Objetivo De Negocio

Construir un producto digital que permita administrar torneos de pesca de punta a punta de forma confiable, simple de operar y auditable, priorizando una primera version que ya entregue valor real a organizadores, fiscales y participantes.

Objetivos de negocio explicitados a partir del insumo:

- centralizar la gestion del torneo en una sola plataforma
- reducir errores operativos y tiempos de coordinacion
- mejorar la trazabilidad de capturas, validaciones y resultados
- publicar ranking en vivo con base en datos controlados
- sostener la operacion en contextos de baja conectividad
- habilitar una base reusable para multiples torneos e historico

## Usuarios O Actores

Actores principales:

- Organizador / Administrador
  Responsable del alta y configuracion del torneo, gestion operativa, parametrizacion, auditoria y cierre.
- Fiscal
  Responsable de la carga y validacion de capturas durante el torneo.
- Participante
  Usuario final que consulta informacion del torneo, ranking y sus capturas.

Actores secundarios o externos:

- Organizacion del evento
  Puede incluir personal administrativo o de soporte que interviene en inscripciones, control documental o cierre.
- Servicio externo meteorologico
  Proveedor de informacion climatica para mostrar datos del dia del torneo.

Necesidades por actor, en nivel negocio:

- Organizador: control integral, confiabilidad, trazabilidad, reportes y capacidad de operar mas de un torneo.
- Fiscal: flujo rapido, simple y robusto para cargar y validar capturas en campo.
- Participante: visibilidad del torneo, de su estado competitivo y de los resultados oficiales.

## Plataformas Esperadas

Para la version inicial, el producto se orienta a una aplicacion web responsive optimizada para uso movil.

Esto implica, a nivel negocio:

- acceso desde celulares, tablets y escritorio
- prioridad de uso en campo para fiscales
- despliegue y adopcion mas rapidos que una app nativa

Queda explicitamente fuera del alcance inicial una app mobile nativa, aunque se reconoce como posible evolucion futura.

## Restricciones Conocidas

Restricciones de alcance y operacion ya conocidas:

- la version inicial prioriza salida al mercado simple y operable sobre cobertura total de escenarios avanzados
- en la version inicial, solo los fiscales cargan capturas
- toda captura debe ser validada para impactar en el ranking oficial
- la medicion base de scoring inicial sera por longitud y no por peso
- no se implementara medicion automatica por imagen en esta primera version
- la operacion debe contemplar escenarios offline con posterior sincronizacion
- la carga y validacion deben respetar horarios configurables del torneo, salvo permisos especiales
- la solucion debe ser usable en dispositivos moviles y en contexto de campo
- la aceptacion del reglamento sera digital simple, sin firma digital avanzada

Restricciones de contexto que deben mantenerse visibles:

- la conectividad puede ser deficiente o inexistente en zonas de pesca
- la evidencia fotografica es obligatoria y parte central de la confianza del sistema
- el producto debe ser escalable a multiples torneos e historico
- la organizacion necesita exportaciones y reportes basicos obligatorios desde la primera version

## Integraciones Conocidas

Integraciones probables o conocidas desde negocio:

- servicio externo meteorologico para mostrar clima del dia segun ubicacion del torneo
- mecanismos de exportacion de datos a formatos de uso operativo como Excel o CSV

Integraciones no confirmadas aun:

- servicios de autenticacion externos
- pasarelas de pago para inscripcion
- mensajeria, notificaciones o canales oficiales de comunicacion
- mapas o servicios geoespaciales adicionales

Estas integraciones no deben asumirse como parte del MVP hasta validacion explicita.

## Consideraciones Transversales Conocidas

Aplican claramente:

- trazabilidad y auditoria de acciones relevantes
- control de acceso por roles
- trabajo offline con sincronizacion posterior
- resguardo de evidencia fotografica
- bloqueo operativo por ventanas horarias
- exportacion de resultados y capturas
- soporte para bajas logicas y preservacion de historico cuando corresponda

No aplican en el MVP, segun el insumo actual:

- firma digital avanzada
- carga de capturas por participantes
- medicion automatica por imagen
- app mobile nativa

Pendientes de validacion:

- alcance exacto del comportamiento offline en MVP
- politica de resolucion de conflictos de sincronizacion
- nivel de detalle de auditoria visible para cada perfil
- alcance real de reportes mas alla de los obligatorios
- necesidad de notificaciones operativas

Recorte explicito de MVP de negocio propuesto:

- gestion de torneos con configuracion general, reglamento, horarios y scoring parametrizable inicial
- gestion de participantes, equipos, embarcaciones y fiscales
- inscripcion con aceptacion digital simple del reglamento
- carga de capturas solo por fiscales, con foto obligatoria y longitud manual
- validacion obligatoria de capturas por fiscal
- ranking en vivo y ranking final oficial
- estadisticas y exportaciones operativas basicas
- capacidad offline para consulta de datos descargados, registro local de capturas y sincronizacion posterior
- visualizacion informativa de clima del dia

Fuera de este MVP propuesto:

- carga de capturas por participantes
- firma digital avanzada
- medicion automatica por imagen
- app mobile nativa
- reglas de scoring avanzadas no necesarias para la primera salida
- funcionalidades avanzadas de comunicacion o integraciones no explicitadas en el insumo

## Fecha O Prioridad

Prioridad sugerida: alta.

Motivo:

- el insumo describe una necesidad operativa concreta y recurrente
- existe una definicion deliberada de version inicial para acelerar salida al mercado
- el valor de negocio aparece temprano si se resuelven operacion, validacion y ranking con confiabilidad

No hay una fecha objetivo confirmada en el insumo. Debe validarse si existe un torneo hito o ventana comercial concreta.

## Criterios De Exito

Criterios de exito de negocio propuestos para validar la primera version:

- el organizador puede configurar un torneo completo sin depender de herramientas paralelas
- los fiscales pueden registrar y validar capturas con un flujo suficientemente rapido para uso real en campo
- el ranking en vivo refleja solo capturas validadas y puede sostenerse durante el torneo
- el cierre del torneo produce ranking final y reportes exportables sin reprocesos manuales significativos
- el sistema mantiene continuidad operativa cuando la conectividad falla y sincroniza luego sin perdida visible de informacion critica
- existe trazabilidad suficiente para auditar altas, capturas, validaciones, rechazos y sincronizaciones
- participantes y organizacion obtienen mayor transparencia sobre resultados y estado de capturas

Indicadores sugeridos para validar en discovery y luego en producto:

- reduccion de planillas o procesos manuales paralelos
- tiempo operativo para registrar una captura en campo
- porcentaje de capturas con evidencia completa
- cantidad de incidencias por errores de ranking o validacion
- cantidad de eventos resueltos correctamente luego de operar offline
- tiempo de emision del ranking final oficial al cierre del torneo

## Dudas Abiertas

Decisiones humanas pendientes:

- si la capacidad offline completa entra como parte obligatoria del MVP o si se admite una primera salida con alcance offline mas acotado
- que nivel de configurabilidad real necesita el scoring inicial y cuantas variantes reglamentarias deben soportarse desde la primera version
- si la inscripcion incluye o no autogestion por parte de participantes, o solo carga administrativa/manual
- si los fiscales validan solo capturas que ellos mismos registran o pueden validar capturas de otros fiscales
- que alcance tendra la asignacion de fiscales: por zona, equipo, embarcacion, participante o combinaciones
- si existen requerimientos regulatorios o legales adicionales sobre consentimiento, tratamiento de imagen o datos personales
- si el clima es un complemento deseable o una necesidad operacional obligatoria en el MVP
- si las exportaciones deben responder a formatos oficiales ya usados por la organizacion
- si existe un torneo piloto concreto que deba usarse como caso base para priorizar alcance

Supuestos explicitados para continuar con functional analysis:

- la necesidad principal es operativa y no orientada a monetizacion inicial
- el primer foco comercial es resolver bien la operatoria del torneo y la confianza del resultado oficial
- el producto sera usado en entornos mixtos de escritorio y movil, con fuerte prioridad movil para fiscales
- la version inicial buscara simplicidad de adopcion antes que cobertura maxima de excepciones
- el valor del sistema depende fuertemente de trazabilidad, evidencia y continuidad operativa en campo

Handoff para `functional_analyst`:

- Esta claro el problema de negocio, los actores principales, el valor esperado y el recorte preliminar de MVP.
- Tambien estan claras varias definiciones iniciales ya adoptadas: web responsive, scoring por longitud, carga solo por fiscales, validacion obligatoria, sin medicion automatica por imagen y sin firma digital avanzada.
- Aun necesitan validacion funcional detallada el alcance offline exacto, las variantes de scoring requeridas, las reglas de asignacion de fiscales, el modo de inscripcion y ciertos criterios operativos de sincronizacion y auditoria.
- El siguiente paso recomendado es convertir este brief en ERS, descomponer requerimientos trazables y separar claramente MVP, fuera de alcance y decisiones pendientes.
