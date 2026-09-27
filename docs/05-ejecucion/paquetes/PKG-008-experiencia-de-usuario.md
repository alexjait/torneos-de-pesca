# PKG-008 — Experiencia de usuario

## Objetivo

Mejorar la navegación y las tareas operativas de la aplicación sin cambiar las reglas de negocio ni los contratos de API.

## Alcance implementado

- La barra lateral de administración y fiscal queda fija e independiente del desplazamiento del contenido en escritorio.
- La navegación se agrupa por contexto y muestra el perfil y el cierre de sesión de forma consistente.
- En móvil, la barra lateral pasa a un menú lateral accesible, con cierre por `Escape`, foco contenido y restauración del foco de origen.
- El padrón de participantes usa tarjetas legibles en móvil, preservando sus acciones y la confirmación de baja existente.
- Los listados de gestión permiten ordenar sus columnas comparables, con dirección visible y semántica accesible.
- La operación fiscal usa dos columnas en escritorio (captura y estado) y una secuencia vertical clara en móvil.
- Se corrigió el contraste de la navegación fiscal sobre fondo claro.

## Fuera de alcance

- No se modificaron permisos, flujos de autenticación, datos, reglas de captura ni endpoints.

## Verificación

- Pruebas de contrato visual de PKG-008.
- Lint y build de frontend.
- Recorridos visuales autenticados de administración y fiscal en escritorio y móvil.
