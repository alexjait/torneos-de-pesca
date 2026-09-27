# PKG-004 Frontend Handoff

## Estado

- frontend web implementado para:
  - `/admin/scoring`
  - `/admin/ranking`
  - `/admin/reportes`

## Pantallas E Interacciones

- `Scoring`
  - selector de torneo
  - edicion de `pointsPerValidPiece`, `largestCaptureBonusPoints`, `distinctSpeciesPoints`
  - alta de penalizacion manual con motivo obligatorio
  - listado de penalizaciones y revocacion desde dialogo propio
- `Ranking`
  - selector de torneo
  - scope `INDIVIDUAL | TEAM`
  - conmutacion entre `Ranking en vivo` y `Ranking final oficial`
  - muestra `Ultima actualizacion`, `Version` y estado `Desactualizado`
- `Reportes`
  - selector de torneo
  - selector de reporte
  - scope cuando aplica a ranking
  - tabla consultable
  - CTA `Exportar CSV` y `Exportar XLSX`
  - historial de exportaciones generadas en la sesion y descarga autenticada cuando `downloadUrl` viene listo

## Contratos Consumidos

- `GET/PATCH /api/v1/tournaments/{id}/scoring`
- `GET/POST /api/v1/tournaments/{id}/score-adjustments`
- `POST /api/v1/tournaments/{id}/score-adjustments/{adjustmentId}/revoke`
- `GET /api/v1/tournaments/{id}/ranking`
- `GET /api/v1/tournaments/{id}/ranking/final`
- `GET /api/v1/tournaments/{id}/reports/*`
- `POST /api/v1/tournaments/{id}/exports`
- `GET /api/v1/exports/{id}/download` via `downloadUrl`

## Notas De Testing

- validar carga de pantallas con backend implementado y con backend todavia ausente
- validar que `409` de ranking final muestre estado vacio funcional y no mensaje crudo
- validar que `meta.isStale = true` muestre `Desactualizado`
- validar creacion y revocacion de penalizaciones con feedback visible
- validar exportacion `READY` con descarga y `FAILED` con feedback `No pudimos generar la exportacion`
- validar responsive en mobile para cards de ranking y tablas administrativas

## Limitaciones Conocidas

- los reportes JSON no tienen forma cerrada en contratos; la tabla renderiza columnas dinamicas segun lo que entregue backend
- el historial de exportaciones se conserva en estado de la pantalla; no hay bandeja persistente hasta que backend exponga metadata adicional o un listado dedicado
- no se recalculan reglas ni se reordenan posiciones del lado cliente; la UI depende del orden y metricas del backend

## Evidencia De Verificacion

- `frontend`: `npm run lint`
- `frontend`: `npm run build`
