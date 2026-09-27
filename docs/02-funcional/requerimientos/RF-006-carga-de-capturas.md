# RF-006 Carga De Capturas

Owner recomendado: `functional_analyst`

## ID

RF-006

## Titulo

Carga de capturas

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

Permitir que fiscales registren capturas durante el torneo con evidencia suficiente para validacion y auditoria posterior.

## Alcance

- seleccion de participante o equipo asociado
- carga de especie
- adjunto de foto obligatoria
- carga manual de longitud
- registro automatico de fecha y hora
- registro de ubicacion GPS cuando este disponible
- observaciones adicionales
- estado inicial pendiente de validacion

## Fuera De Alcance

- carga por participantes
- medicion automatica por imagen

## Reglas

- toda captura debe contar con foto obligatoria
- la longitud se carga manualmente
- solo los fiscales pueden registrar capturas en el MVP
- la captura solo puede editarse mientras este pendiente de validacion

## Dependencias

- RF-005
- RF-009
- RF-011

## Criterios De Aceptacion

- un fiscal asignado puede registrar una captura con los campos obligatorios
- el sistema asigna automaticamente fecha y hora de registro
- el sistema permite registrar GPS cuando el dispositivo lo permite
- la captura queda en estado pendiente de validacion
- el sistema impide registrar captura sin foto obligatoria

## Owner Sugerido

`software_architect`

## Referencias De Arquitectura

- definir almacenamiento de imagenes y metadatos
- definir modelo de captura y estados

## Referencias UX/UI

- flujo movil de carga rapida
- estados de adjunto, guardado y pendiente

## Paquetes De Ejecucion Relacionados

- slice 3
