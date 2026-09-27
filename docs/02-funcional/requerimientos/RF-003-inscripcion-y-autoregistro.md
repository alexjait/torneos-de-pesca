# RF-003 Inscripcion Y Auto-Registro

Owner recomendado: `functional_analyst`

## ID

RF-003

## Titulo

Inscripcion y auto-registro

## Tipo

funcional

## Estado

ready_for_architecture

## Prioridad

alta

## Origen

- brief de negocio
- decision cerrada sobre auto-registro

## Objetivo

Permitir inscripcion administrativa y auto-registro de participantes con un flujo de aprobacion que garantice control organizativo antes de habilitar la competencia.

## Alcance

- alta administrativa de inscripcion
- auto-registro por participante
- aceptacion digital simple del reglamento
- estado pendiente de revision y aprobacion
- aprobacion o rechazo administrativo
- consulta del estado de la inscripcion

## Fuera De Alcance

- pagos en linea
- firma digital avanzada

## Reglas

- el auto-registro no habilita competir automaticamente
- toda inscripcion debe reflejar estado operativo visible
- la aceptacion del reglamento forma parte del flujo de inscripcion

## Dependencias

- RF-002
- RF-004

## Criterios De Aceptacion

- el administrador puede registrar participantes manualmente
- un participante puede auto-registrarse
- el sistema deja el auto-registro en estado pendiente de revision/aprobacion
- el administrador puede aprobar o rechazar una solicitud
- el participante puede consultar el estado de su inscripcion

## Owner Sugerido

`software_architect`

## Referencias De Arquitectura

- definir estados de inscripcion y aprobacion

## Referencias UX/UI

- flujo de auto-registro y pantalla de estado
- flujo administrativo de revision y aprobacion

## Paquetes De Ejecucion Relacionados

- slice 2
