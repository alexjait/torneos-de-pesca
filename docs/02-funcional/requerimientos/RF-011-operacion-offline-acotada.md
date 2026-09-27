# RF-011 Operacion Offline Acotada

Owner recomendado: `functional_analyst`

## ID

RF-011

## Titulo

Operacion offline acotada

## Tipo

funcional

## Estado

ready_for_architecture

## Prioridad

alta

## Origen

- brief de negocio
- decision cerrada sobre MVP offline acotado

## Objetivo

Permitir continuidad operativa minima del flujo de capturas cuando no exista conectividad, sin comprometer la salida temprana del MVP.

## Alcance

- consulta de informacion previamente descargada o cacheada del torneo
- registro local de capturas por fiscales
- almacenamiento local temporal de foto y datos asociados
- marcado de registros pendientes de sincronizacion
- sincronizacion posterior al recuperar conectividad
- visualizacion de estado de sincronizacion

## Fuera De Alcance

- offline completo del sistema
- sincronizacion avanzada de todas las entidades
- resolucion compleja de conflictos entre multiples sesiones o actores

## Reglas

- una captura creada offline debe conservar usuario, fecha/hora local, fecha/hora de sincronizacion y estado del registro
- el sistema debe evitar duplicidades al sincronizar dentro de las reglas que defina la arquitectura
- el usuario debe poder identificar que registros siguen pendientes de sincronizacion

## Dependencias

- RF-006
- RNF-002

## Criterios De Aceptacion

- sin conectividad, un fiscal puede consultar informacion ya descargada del torneo
- sin conectividad, un fiscal puede registrar capturas con sus datos esenciales y foto obligatoria
- el sistema marca la captura como pendiente de sincronizacion
- al volver la conectividad, el sistema sincroniza las capturas pendientes
- el usuario puede ver el estado de sincronizacion de cada captura

## Owner Sugerido

`software_architect`

## Referencias De Arquitectura

- definir almacenamiento local, modelo de sincronizacion y estrategia anti-duplicados

## Referencias UX/UI

- estados offline, pendiente, sincronizando, sincronizado y error

## Paquetes De Ejecucion Relacionados

- slice 3
