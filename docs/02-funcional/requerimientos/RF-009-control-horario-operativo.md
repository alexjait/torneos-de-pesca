# RF-009 Control Horario Operativo

Owner recomendado: `functional_analyst`

## ID

RF-009

## Titulo

Control horario operativo

## Tipo

funcional

## Estado

ready_for_architecture

## Prioridad

media

## Origen

- brief de negocio
- insumo inicial del sistema de torneos de pesca

## Objetivo

Permitir definir hitos horarios del torneo y restringir acciones fuera de las ventanas operativas autorizadas.

## Alcance

- configuracion de largada
- configuracion de inicio de pesca habilitada
- configuracion de cierre de pesca
- configuracion de limite de entrega o validacion final
- bloqueo de acciones fuera de horario
- registro de eventos relevantes

## Fuera De Alcance

- automatizaciones avanzadas no declaradas por el negocio

## Reglas

- las acciones fuera de horario se bloquean salvo permisos especiales definidos por la organizacion
- la configuracion horaria pertenece al torneo y debe ser visible para los actores autorizados

## Dependencias

- RF-001
- RF-006
- RF-007

## Criterios De Aceptacion

- el administrador puede definir hitos horarios del torneo
- el sistema impide cargar o validar capturas fuera de la ventana permitida cuando asi corresponde
- el sistema registra eventos relevantes de incumplimiento o intento fuera de horario

## Owner Sugerido

`software_architect`

## Referencias De Arquitectura

- definir evaluacion temporal y permisos especiales

## Referencias UX/UI

- mensajes claros de bloqueo por horario
- visualizacion de horarios oficiales

## Paquetes De Ejecucion Relacionados

- slice 3
