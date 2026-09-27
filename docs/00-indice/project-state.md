# Estado del proyecto

## Resumen

**Torneos de Pesca** es un sistema web para la administración de torneos, inscripciones, fiscalización de capturas, scoring, ranking y reportes.

El MVP y su primera mejora de experiencia de usuario están cerrados: `PKG-001` a `PKG-008`.

## Estado actual

- Producto: funcional para uso local y preparación de un entorno compartido.
- Paquetes: no hay un paquete de implementación abierto.
- Publicación: se prepara una limpieza documental y de artefactos para compartir el repositorio como portfolio.

## Capacidades entregadas

- Administración de usuarios, torneos y entidades operativas.
- Inscripción pública, activación de cuenta y aprobación administrativa.
- Operación de fiscales con evidencia fotográfica y sincronización offline acotada.
- Puntajes, ranking y exportaciones.
- Sesiones con refresh token rotativo y cookie `HttpOnly`.
- Navegación responsive, tablas ordenables y mejoras de accesibilidad de PKG-008.

## Riesgos y próximos pasos

- Antes de un despliegue público, usar secretos, base de datos y almacenamiento dedicados por ambiente.
- El rate limiting actual está en memoria y debe evolucionar para una instalación distribuida.
- Las copias de seguridad de base de datos y archivos son obligatorias para staging o producción.
- La entrega real de correo requiere configurar y verificar Resend en el ambiente correspondiente.

## Referencias

- [Arquitectura](../03-arquitectura/arquitectura.md)
- [Operación e infraestructura](../07-operacion/devops-infra.md)
- [Testing](../06-calidad/testing.md)
- [Revisión de seguridad](../06-calidad/security-review.md)
- [Paquetes de ejecución](../05-ejecucion/paquetes/)
