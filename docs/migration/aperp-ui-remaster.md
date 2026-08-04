# Remaster visual APERP

## Objetivo

Actualizar la experiencia visual de APERP Control Bodega usando la estructura tecnica existente: React, Vite, Material UI, React Router, los componentes genericos del proyecto y el backend Node.js actual. El cambio no modifica reglas de negocio, llaves GeneXus ni el alcance multiempresa.

Las capturas entregadas el 3 de agosto de 2026 se usan como referencia de identidad y jerarquia visual, no como una copia literal de la interfaz antigua.

## Identidad visual

- Marca principal: `APERP`.
- Mensaje de marca: `Impulsando tu negocio`.
- Color primario: azul APERP `#087DF1`.
- Azul profundo de navegacion: `#061B36`.
- Azul institucional: `#0B559B`.
- Fondos de trabajo: `#F4F7FB` y blanco.
- Acento de informacion: celeste `#38BDF8`.
- Bordes y separadores: azul grisaceo de baja intensidad.

El isotipo se reconstruye como SVG dentro del sistema de componentes para que conserve nitidez en login, barra lateral, favicon y tamaños compactos. La flecha ascendente y el contraste azul/blanco mantienen la idea de crecimiento presente en la marca original.

## Superficies incluidas

### Inicio de sesion

- Composicion dividida en escritorio: relato de marca a la izquierda y formulario a la derecha.
- Formulario accesible para RUT, clave y seleccion de empresa.
- Adaptacion a una sola columna en telefono y tablet.
- La seleccion de empresa permanece controlada por el flujo de autenticacion; no se usa para sobreescribir la empresa de sesion desde una pantalla interna.

### Aplicacion autenticada

- Encabezado compacto con identidad APERP, acceso al perfil y contexto de empresa.
- Navegacion lateral oscura, con estado activo azul y jerarquia legible.
- Inicio con accesos que apuntan solamente a rutas implementadas.
- Tarjetas, tablas, dialogos y formularios conservan los componentes MUI existentes.

## Mantenedores de dos niveles

Se conserva el patron vigente de CONEX y la semantica de niveles de transaccion GeneXus:

1. El nivel uno es la cabecera y controla la seleccion del registro.
2. El nivel dos se consulta y edita dentro de la vista o dialogo de su cabecera.
3. Las llaves heredadas se obtienen de la empresa autenticada y del registro padre; no se solicitan de nuevo al usuario.
4. Crear, editar o eliminar un detalle invalida tanto la consulta del detalle como el resumen de la cabecera.
5. Un nivel dos no se presenta como maestro independiente, aunque una ruta historica pueda redirigir al mantenedor de su cabecera.
6. Los niveles especializados de Seguridad se mantienen dentro de sus flujos compuestos de Programas, Roles y Asignaciones.

El patron ya esta implementado en `gxMaestroCrud.jsx` para:

- `ESPECIES` -> `ESPECIES1` (Variedades).
- `ENVCAT` -> `ENVCAT1` (Categorias de envase).
- `PRODUCTORES` -> `PRODUCTORES1` (Cuarteles).

La remasterizacion puede cambiar presentacion, espaciado y estados visuales de estos mantenedores, pero no separa el detalle de su padre ni duplica reglas en React.

## Restricciones

- No cambiar la tecnologia ni introducir un segundo sistema de componentes.
- No enlazar tarjetas a rutas inexistentes.
- No codificar empresa o usuario en la interfaz.
- No reproducir reglas de validacion del backend en hooks nuevos.
- No usar el proyecto AS como fuente visual o funcional.
- Mantener documentados los cambios y registrar el cierre en `docs/team/CODEX_WORK_LOG.md`.

## Verificacion requerida

- Build de produccion del frontend: aprobado el 3 de agosto de 2026.
- ESLint dirigido sobre los archivos modificados: aprobado sin errores el 3 de agosto de 2026.
- `git diff --check` en frontend y backend: aprobado el 3 de agosto de 2026.
- Revision estructural del login adaptable, rutas del inicio, identidad visible y navegacion: aprobada.
- Revision del flujo cabecera-detalle sin convertir tablas de nivel dos en maestros independientes: aprobada sobre la configuracion generica existente.
- Revision visual automatizada en navegador: pendiente de confirmacion manual porque la politica del visor integrado bloqueo la recarga de la URL local durante el cierre de esta tarea.

## Estado

Implementacion terminada; queda la aceptacion visual manual en escritorio y telefono.
