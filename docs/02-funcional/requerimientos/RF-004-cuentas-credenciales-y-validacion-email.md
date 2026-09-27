# RF-004 Cuentas, Credenciales Y Validacion De Email

Owner recomendado: `functional_analyst`

## ID

RF-004

## Titulo

Cuentas, credenciales y validacion de email

## Tipo

funcional

## Estado

ready_for_architecture

## Prioridad

alta

## Origen

- brief de negocio
- decision cerrada sobre email y validacion de cuenta

## Objetivo

Permitir crear y activar cuentas de usuario vinculadas a participantes y fiscales, incluyendo envio de email de registracion, credenciales temporales cuando aplique y validacion obligatoria de cuenta.

## Alcance

- creacion de cuenta asociada a usuario
- uso de email como identificador de acceso
- envio de email de registracion
- envio de credenciales temporales cuando el alta sea administrativa
- validacion de cuenta por email
- control de cuenta pendiente o validada

## Fuera De Alcance

- autenticacion social
- recuperacion avanzada de cuenta no definida aun

## Reglas

- todo usuario dado de alta administrativamente debe recibir email con datos de registracion
- ningun usuario dado de alta administrativamente queda plenamente operativo sin validar email
- el mismo criterio aplica a fiscales
- el email es el usuario de acceso

## Dependencias

- RF-003
- RF-005
- RNF-001

## Criterios De Aceptacion

- al dar de alta administrativamente un participante, el sistema envia email de registracion
- al dar de alta un fiscal, el sistema envia email de registracion con credencial temporal
- el sistema permite validar cuenta mediante email
- el sistema refleja si una cuenta esta pendiente de validacion o validada
- un usuario sin cuenta validada no puede quedar habilitado segun reglas de acceso definidas

## Owner Sugerido

`software_architect`

## Referencias De Arquitectura

- definir flujo de identidad, activacion y credenciales temporales
- definir integracion de envio de correo

## Referencias UX/UI

- pantalla de activacion y validacion
- mensajes de cuenta pendiente, validada o expirada

## Paquetes De Ejecucion Relacionados

- slice 1
