# RF-008 Scoring Y Ranking

Owner recomendado: `functional_analyst`

## ID

RF-008

## Titulo

Scoring y ranking

## Tipo

funcional

## Estado

ready_for_architecture

## Prioridad

alta

## Origen

- brief de negocio
- decisiones cerradas sobre scoring inicial

## Objetivo

Permitir parametrizar el scoring inicial del torneo y calcular ranking en vivo y final oficial con criterios trazables.

## Alcance

- configuracion de puntos por pieza
- configuracion de bonus por pieza mas grande
- configuracion de puntos por especies distintas
- configuracion de penalizaciones por incumplimiento reglamentario
- calculo de ranking en vivo
- emision de ranking final oficial
- aplicacion de desempates definidos

## Fuera De Alcance

- scoring avanzado fuera de las reglas iniciales cerradas

## Reglas

- solo capturas validadas impactan en ranking
- el desempate se resuelve por puntaje total, mejor captura, cantidad de piezas validas y fecha/hora de ultima captura valida que aporto puntaje
- el ranking debe poder verse por pescador y por equipo cuando corresponda

## Dependencias

- RF-001
- RF-007

## Criterios De Aceptacion

- el administrador puede configurar los parametros iniciales de scoring soportados
- el sistema recalcula posiciones segun capturas validadas
- el ranking en vivo refleja puntaje total, cantidad de piezas validas, longitud total y mejor captura
- el sistema emite ranking final oficial al cierre
- el sistema aplica automaticamente los desempates definidos

## Owner Sugerido

`software_architect`

## Referencias De Arquitectura

- definir motor de calculo y contratos de ranking

## Referencias UX/UI

- vistas de ranking en vivo y final
- filtros por torneo, equipo, participante, especie y estado

## Paquetes De Ejecucion Relacionados

- slice 4
