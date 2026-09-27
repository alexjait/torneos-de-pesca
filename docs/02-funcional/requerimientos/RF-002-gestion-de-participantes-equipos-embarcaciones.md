# RF-002 Gestion De Participantes, Equipos Y Embarcaciones

Owner recomendado: `functional_analyst`

## ID

RF-002

## Titulo

Gestion de participantes, equipos y embarcaciones

## Tipo

funcional

## Estado

ready_for_architecture

## Prioridad

alta

## Origen

- brief de negocio
- insumo inicial del sistema de torneos de pesca

## Objetivo

Permitir administrar participantes, equipos y embarcaciones junto con sus relaciones funcionales para habilitar inscripcion, competencia, capturas y reportes.

## Alcance

- alta, modificacion, consulta y baja logica
- relacion entre participante, equipo y embarcacion
- datos identificatorios y de contacto
- estado de habilitacion para competir

## Fuera De Alcance

- validaciones regulatorias documentales no definidas
- relaciones especiales fuera de las reglas de torneo configuradas

## Reglas

- un participante puede pertenecer a un equipo segun modalidad del torneo
- una embarcacion puede asociarse a uno o mas participantes o equipos segun reglas definidas
- el sistema debe conservar historico de cambios relevantes

## Dependencias

- RF-001
- RF-003

## Criterios De Aceptacion

- el administrador puede dar de alta participantes, equipos y embarcaciones
- el administrador puede vincular participantes con equipos y embarcaciones
- el sistema permite modificar y deshabilitar registros sin perder historico
- el sistema permite consultar el estado de habilitacion de cada participante

## Owner Sugerido

`software_architect`

## Referencias De Arquitectura

- definir entidades y relaciones de dominio

## Referencias UX/UI

- formularios administrativos y listados

## Paquetes De Ejecucion Relacionados

- slice 1
