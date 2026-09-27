# RF-005 Gestion De Fiscales

Owner recomendado: `functional_analyst`

## ID

RF-005

## Titulo

Gestion de fiscales

## Tipo

funcional

## Estado

ready_for_architecture

## Prioridad

alta

## Origen

- brief de negocio
- decision cerrada sobre alta y asignacion de fiscales

## Objetivo

Permitir registrar fiscales, asignarlos por torneo y habilitarlos para operar capturas y validaciones con trazabilidad.

## Alcance

- alta de fiscal con nombre y apellido, documento o identificacion, telefono, email y contraseña temporal
- asignacion de fiscal a torneo
- consulta y modificacion de asignaciones
- habilitacion o deshabilitacion operativa
- trazabilidad de acciones de fiscal

## Fuera De Alcance

- asignacion granular por zona, embarcacion o participante en el MVP

## Reglas

- el fiscal se asigna por torneo
- el email del fiscal es su usuario
- el alta del fiscal requiere email de registracion y validacion de cuenta

## Dependencias

- RF-004
- RF-006
- RF-007

## Criterios De Aceptacion

- el administrador puede dar de alta un fiscal con los datos obligatorios
- el administrador puede asignar uno o mas fiscales a un torneo
- el sistema permite consultar fiscales por torneo
- el sistema registra trazabilidad de acciones realizadas por cada fiscal

## Owner Sugerido

`software_architect`

## Referencias De Arquitectura

- definir relacion entre fiscal, cuenta y torneo

## Referencias UX/UI

- flujo administrativo de alta y asignacion
- consulta de fiscales por torneo

## Paquetes De Ejecucion Relacionados

- slice 1
