# PKG-004 Scoring, Ranking Y Reportes Basicos

Owner recomendado: `orchestrator`

## ID Del Paquete

PKG-004

## Nombre Corto

Scoring, ranking y reportes basicos

## Objetivo De Negocio

Cerrar el slice funcional de resultado oficial del torneo sobre la base ya operativa de `PKG-003`, habilitando scoring configurable, ranking en vivo, ranking final oficial y reportes/exportaciones basicas sin reprocesos manuales.

Este paquete toma capturas y validaciones ya resueltas, y las transforma en resultado competitivo auditable y exportable para administracion y participantes.

## Historia O Requerimiento Fuente

- RF-008 Scoring y ranking
- RF-010 Reportes y exportaciones
- RNF-001 Seguridad, trazabilidad y auditoria
- RNF-002 Usabilidad, rendimiento y continuidad operativa

## Agente Owner Recomendado

`backend_web`

## Estado Operativo Actual

- `PKG-004` implementado en backend y frontend
- testing acotado ejecutado sin hallazgos bloqueantes
- security review cerrado como `apto con observaciones`
- cerrado operativamente

## Alcance Incluido

- modulo backend `scoring-ranking`
- modulo backend `reports-exports`
- configuracion de scoring por torneo para:
  - puntos por pieza valida
  - bonus por pieza mas grande
  - puntos por especies distintas
- penalizaciones manuales auditables como ajustes de puntaje por competidor
- ranking en vivo por pescador
- ranking en vivo por equipo cuando exista `teamId` snapshot aplicable
- snapshot final oficial al cierre del torneo
- lectura de ranking con ultima actualizacion y version de snapshot
- reportes de:
  - inscriptos
  - ranking en vivo
  - ranking final oficial
  - capturas por pescador
  - capturas por equipo
  - capturas observadas y rechazadas
- exportacion basica de resultados y capturas en `CSV` o `XLSX`
- auditoria de cambios de scoring, ajustes, recalculos, cierre y exportaciones

## Fuera De Alcance

- formatos regulatorios especiales
- reportes analiticos avanzados o historicos multi-torneo
- `PDF`, dashboards BI o paquetes de visualizacion extra
- push en tiempo real, `WebSocket` o `SSE`
- colas dedicadas o workers separados para recalculo y exportacion
- modulo separado de infracciones o sanciones
- exportaciones masivas o asincronicas pesadas fuera del volumen razonable del MVP

## Dependencias

- `PKG-001` cerrado
- `PKG-002` cerrado
- `PKG-003` cerrado operativamente
- seam `RankingIntegrationPort` ya dejado en `captures`
- endpoint de cierre de torneo ya existente en `tournaments`
- arquitectura aprobada en [Arquitectura](../../03-arquitectura/arquitectura.md)
- contratos aprobados en [Contratos](../../03-arquitectura/contratos.md)
- UX/UI base definida en [UX/UI](../../04-ux-ui/ux-ui.md)

## Entradas Obligatorias

- [ERS](../../02-funcional/ers.md)
- [RF-008](../../02-funcional/requerimientos/RF-008-scoring-y-ranking.md)
- [RF-010](../../02-funcional/requerimientos/RF-010-reportes-y-exportaciones.md)
- [PKG-003](./PKG-003-operacion-fiscal-y-capturas.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [Project State](../../00-indice/project-state.md)
- [Indice maestro de requerimientos](../../00-indice/requerimientos-index.md)
- [UX/UI](../../04-ux-ui/ux-ui.md)

## Referencias Funcionales

- [RF-008](../../02-funcional/requerimientos/RF-008-scoring-y-ranking.md)
- [RF-010](../../02-funcional/requerimientos/RF-010-reportes-y-exportaciones.md)
- [RNF-001](../../02-funcional/requerimientos/RNF-001-seguridad-trazabilidad-y-auditoria.md)
- [RNF-002](../../02-funcional/requerimientos/RNF-002-usabilidad-rendimiento-y-continuidad-operativa.md)

## Referencias De Arquitectura Y Contratos

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

Puntos obligatorios para este paquete:

- la fuente de verdad de scoring, ranking y exportacion vive en backend
- el ranking en vivo solo considera capturas `APPROVED` y ajustes activos
- el ranking final oficial se congela al cerrar torneo y no se reescribe
- `reports-exports` consume snapshots y read models; no recalcula puntajes por su cuenta
- las penalizaciones del MVP se modelan como ajustes manuales auditables, no como modulo de sanciones separado
- `RF-010` queda dentro de `PKG-004` porque sus reportes obligatorios consumen exactamente los read models y snapshots del ranking de `RF-008`; separarlo ahora duplicaria contratos y evidencia tecnica sin reducir riesgo operativo

## Referencias UX/UI

- [UX/UI](../../04-ux-ui/ux-ui.md)

Flujos UX a respetar:

- configuracion administrativa de scoring
- consulta de ranking en vivo
- consulta de ranking final
- aplicacion y revocacion de penalizacion manual
- reportes administrativos
- exportacion y descarga de archivo generado
- cierre de torneo con confirmacion clara del impacto sobre ranking final

Reglas UX obligatorias:

- mantener patron de backoffice ya establecido
- mostrar `ultima actualizacion` y estado del ranking
- no usar `window.alert`, `window.confirm` ni `window.prompt`
- no depender solo de color para cambios de posicion o estados de exportacion

## Criterios De Aceptacion

- el administrador puede configurar los parametros iniciales de scoring soportados
- el administrador puede crear y revocar ajustes manuales de puntaje con motivo obligatorio
- el sistema recalcula ranking en vivo al aprobar, observar o rechazar capturas, y tambien al cambiar scoring o ajustes
- el ranking en vivo expone puntaje total, piezas validas, longitud total, mejor captura y ultima actualizacion
- el ranking puede consultarse por pescador y por equipo cuando corresponda
- el cierre del torneo genera un ranking final oficial persistido e inmutable
- el sistema permite emitir reportes operativos basicos del torneo
- el sistema permite exportar resultados y capturas en `CSV` o `XLSX`
- scoring, ajustes, recalculos, cierre y exportaciones dejan trazabilidad auditable

## Arquitectura Ejecutable Cerrada

Decisiones concretas de paquete:

- implementar dos modulos backend:
  - `scoring-ranking`
  - `reports-exports`
- `scoring-ranking` es owner de:
  - configuracion de scoring
  - ajustes manuales de puntaje
  - recalculo de ranking live
  - snapshot final oficial
- `reports-exports` es owner de:
  - reportes consultables
  - generacion de `CSV`
  - generacion de `XLSX`
  - metadata y descarga segura de exportaciones
- `RankingIntegrationPort.markTournamentPendingRecalculation(tournamentId, captureId)` deja de ser `no-op` y pasa a delegar en `scoring-ranking`
- el recalculo live del MVP corre inline dentro del monolito despues de cambios relevantes; no se introduce worker dedicado
- si un recalculo falla, la mutacion de negocio ya aplicada se conserva, `ranking_state` queda `dirty` y la lectura de ranking devuelve el ultimo snapshot valido con `meta.isStale = true`
- el cierre de torneo debe invocar `finalizeTournamentRanking(tournamentId)` antes de persistir estado `CLOSED`
- las exportaciones del MVP se generan de forma sincronica, se guardan en storage privado del backend y se descargan por endpoint autenticado
- no se separa `RF-010` en otro paquete porque el corte tecnico natural ya queda entre:
  - calculo y snapshots en `scoring-ranking`
  - lectura/exportacion en `reports-exports`

## Cierre De `software_architect`

Queda cerrado en:

- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)

Contenido ya definido:

- modelo de `TournamentScoringConfig`, `ScoreAdjustment`, `TournamentRankingState`, `RankingEntry` y `ExportRecord`
- estrategia de recalculo live y snapshot final
- contratos iniciales de scoring, ranking, reportes y exportaciones
- decision de exportacion sincronica basica con storage privado
- motivo concreto para mantener `RF-008` y `RF-010` dentro de `PKG-004`

## Handoff Para `backend_web`

- crear modulo `scoring-ranking` y su persistencia
- implementar `TournamentScoringConfig`, `ScoreAdjustment`, `TournamentRankingState`, `RankingEntry` y `ExportRecord`
- reemplazar implementacion `no-op` del seam de `PKG-003`
- recalcular ranking live al aprobar, observar o rechazar capturas, al cambiar scoring y al crear o revocar ajustes
- congelar snapshot final oficial en `close`
- exponer contratos de ranking, scoring, reportes y exportaciones
- reutilizar snapshots persistidos para reportes/exportaciones; no recalcular en cada descarga
- auditar como minimo:
  - `scoring.config_updated`
  - `scoring.adjustment_created`
  - `scoring.adjustment_revoked`
  - `ranking.live_recalculated`
  - `ranking.finalized`
  - `report.export_generated`
  - `report.export_downloaded`
- cubrir pruebas de dominio e integracion sobre scoring, desempates, ajustes, cierre y exportacion

## Handoff Para `frontend_web`

- implementar vistas administrativas para configuracion de scoring, ranking, reportes y exportaciones
- consumir ranking live y final con `ultima actualizacion`, `version` e indicador `desactualizado` cuando `meta.isStale = true`
- soportar filtros de ranking por torneo y `scope` `INDIVIDUAL | TEAM`
- exponer flujo de ajuste manual con motivo obligatorio y accion separada de revocacion
- para reportes, priorizar tabla consultable y CTA claro `Exportar CSV` / `Exportar XLSX`
- no recalcular ni ordenar por reglas propias fuera de lo que entregue backend
- labels visibles recomendadas:
  - `Ranking en vivo`
  - `Ranking final oficial`
  - `Ultima actualizacion`
  - `Desactualizado`
  - `Penalizacion aplicada`
  - `Penalizacion revocada`
  - `Exportacion lista`
  - `No pudimos generar la exportacion`

## Handoff Para `ux_ui_web_mobile`

- definir la pantalla administrativa de scoring con ayuda contextual breve sobre cada regla
- definir ranking responsive priorizando en mobile:
  - posicion
  - nombre
  - puntaje
  - mejor captura
- definir tratamiento visual de `isStale`, cierre oficial y exportacion lista o fallida
- mantener reportes como experiencia administrativa web; no hace falta flujo mobile-first especial en este paquete

## Handoff Para `frontend_mobile`

- no aplica en este MVP
- si en una fase futura aparece cliente nativo, debe consumir los mismos endpoints de ranking y reportes sin mover reglas al cliente

## Handoff Para `devops_infra`

- asegurar storage privado reutilizable para archivos de exportacion
- validar limites razonables de tamano y tiempo para generacion `CSV/XLSX`
- exponer logs y metricas para recalculo y exportacion
- mantener configuracion simple de monolito; no abrir worker ni cola dedicada en este paquete

## Handoff Para `security_reviewer`

- revisar autorizacion de lectura de ranking y descargas de exportacion
- revisar que ajustes manuales exijan actor autorizado y motivo auditable
- revisar que archivos exportados no queden expuestos por URL publica permanente
- revisar minimizacion de datos en reportes segun perfil y torneo

## Handoff Para `testing`

- cubrir configuracion de scoring valida e invalida
- cubrir ranking live por pescador y por equipo
- cubrir todos los desempates definidos en ERS
- cubrir ajuste manual de puntaje y revocacion
- cubrir recalculo posterior a aprobacion, observacion y rechazo
- cubrir cierre de torneo con congelamiento de ranking final
- cubrir reportes consultables y exportaciones `CSV/XLSX`
- verificar auditoria y `meta.isStale` cuando falle un recalculo

## Evidencia Esperada

- migracion Prisma y esquema actualizado para scoring, snapshots y exports
- contratos backend implementados para scoring, ranking, reportes y exportaciones
- evidencia de ranking live y final oficial
- evidencia de ajuste manual auditado
- evidencia de descarga autenticada de exportaciones
- resultados de pruebas del paquete

## Riesgos Y Supuestos

Riesgos:

- recalcular inline simplifica el MVP pero puede tensionar latencia si el volumen real crece
- la generacion `XLSX` puede requerir pasar a asincronico si el torneo acumula demasiadas filas
- el ranking por equipo depende de que `teamId` snapshot haya quedado bien preservado desde capturas

Supuestos:

- el volumen del MVP permite recalculo y exportacion sincronicos en tiempos operativos razonables
- las penalizaciones necesarias del MVP pueden resolverse como ajustes manuales de puntaje sin flujo separado de infracciones
- el cierre oficial del torneo sigue pasando por el modulo `tournaments`

## Siguiente Agente Recomendado

`orchestrator`

## Paquete Exacto De Entrada

- [PKG-004](./PKG-004-scoring-ranking-y-reportes-basicos.md)
- [PKG-003](./PKG-003-operacion-fiscal-y-capturas.md)
- [ERS](../../02-funcional/ers.md)
- [Arquitectura](../../03-arquitectura/arquitectura.md)
- [Contratos](../../03-arquitectura/contratos.md)
- [UX/UI](../../04-ux-ui/ux-ui.md)
- [RF-008](../../02-funcional/requerimientos/RF-008-scoring-y-ranking.md)
- [RF-010](../../02-funcional/requerimientos/RF-010-reportes-y-exportaciones.md)

## Estado De Salida

- backend implementado
- frontend implementado
- testing acotado ejecutado sin hallazgos bloqueantes
- security review cerrado como `apto con observaciones`
- paquete cerrado operativamente
