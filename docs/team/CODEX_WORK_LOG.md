# Log de Trabajo - OpenAI Codex

Este log registra todas las tareas, análisis, endpoints y desarrollos realizados por **OpenAI Codex** en el proyecto APERP Control Bodega.

---

### 2026-08-04 - Inventario Excel APERP regenerado

* **Objetivo:** Regenerar el inventario de migración APERP tomando solo el formato visual del inventario GX8 de CONEX.
* **Resultado:** Se creó `Inventario_GX18_APERP_Actualizado_2026-08-04.xlsx` con resumen y 15 hojas pobladas desde el estudio del XPZ APERP.
* **Contenido:** Objetos, procedimientos, transacciones, paneles, tablas, atributos, dependencias, grupos, carpetas, revisión general, hoja de migración de procedimientos y estado de maestros.
* **Verificación:** Se renderizaron las 15 hojas y el análisis de fórmulas no encontró errores.

---

### 2026-08-03 - Alineacion del maestro Empresa con APERP

* **Incidente:** El mantenedor apuntaba a `DEFEMP`, tabla del modelo CONEX que no existe en `BDAPERP`.
* **Fuente GeneXus:** Se verifico la transaccion `Seguridad.Empresas`, cuya tabla fisica es `g_emp` y cuya llave es `GECODEMP`.
* **Backend:**
  * El catalogo `empresas` ahora consulta y mantiene directamente los 19 atributos de `g_emp`.
  * Los textos `nchar` se enlazan como Unicode y se entregan sin relleno derecho.
  * `GeLogo` se preserva al modificar y se inicializa vacio al crear.
  * La eliminacion se bloqueo para proteger las numerosas dependencias por `GECODEMP`.
* **Frontend:** La grilla y el formulario usan los nombres, largos y campos APERP; ya no muestran el contrato `DEFEMP`.
* **Vista SQL:** `VW_APERP_SEG_EMPRESAS` se mantiene solo para lectura de Seguridad y no se usa como vista actualizable del maestro.
* **Seguridad operativa:** El conector SQL dejo de imprimir credenciales en la consola.
* **Verificacion:** `verify:aperp-company` confirmo 2 empresas y revirtio completamente su escritura de prueba; 11 pruebas backend, ESLint dirigido y build Vite/PWA aprobados.

---

### 2026-08-03 - Remaster visual APERP Control Bodega

* **Objetivo:** Modernizar la identidad y la experiencia del login y de la aplicacion autenticada sin cambiar React, Vite, Material UI, Node.js ni la semantica GeneXus.
* **Frontend:**
  * Se creo un isotipo APERP vectorial reutilizable para logo completo, version compacta y favicon.
  * Se rediseñaron login adaptable, tema, encabezado, menu lateral, pie, tarjetas y pagina de inicio.
  * Los accesos del inicio apuntan solamente a rutas implementadas de Maestros y Seguridad.
  * Se eliminaron textos visibles heredados de CONEX-CO en las superficies remasterizadas.
* **Mantenedores de dos niveles:**
  * Se mantuvo el detalle dentro de la cabecera en el componente generico `gxMaestroCrud.jsx`.
  * Se reforzo visualmente la relacion cabecera-detalle sin modificar llaves heredadas, endpoints ni reglas de negocio.
  * Se documentaron los casos `ESPECIES/ESPECIES1`, `ENVCAT/ENVCAT1` y `PRODUCTORES/PRODUCTORES1`.
* **Documentacion:**
  * `docs/migration/aperp-ui-remaster.md` registra identidad, alcance, restricciones y verificacion.
  * El README del frontend ahora describe tecnologias, estructura, seguridad multiempresa y niveles GeneXus.
* **Verificacion:**
  * `npm run build`: aprobado.
  * ESLint dirigido con `--quiet`: aprobado sin errores.
  * `git diff --check` en ambos repositorios: aprobado.
  * La aceptacion visual manual queda pendiente porque el visor integrado bloqueo por politica la recarga de la URL local.

---

### 2026-08-03 - Correccion del selector de empresa en login

* **Incidente:** Al autenticar un usuario asociado a mas de una empresa, React Router mostraba `Cannot read properties of undefined (reading 'persist')`.
* **Causa:** Material UI ejecuta `onBlur()` sin evento al deshabilitar un `InputBase` que conserva el foco. El manejador directo de Formik intentaba acceder a `event.persist`.
* **Correccion:** Los campos RUT, clave y empresa ahora usan `setFieldTouched` para registrar el desenfoque sin depender del evento sintetico.
* **Alcance:** No cambia autenticacion, seleccion de empresa, permisos ni contexto multiempresa; solo evita la excepcion durante la transicion entre ambos pasos del login.
* **Verificacion:** ESLint dirigido, build Vite/PWA de produccion y `git diff --check` aprobados.

---

## 📅 Registro de Actividades

### 2026-08-02 - Inicialización del Log de Codex

* **Objetivo:** Registro inicial para el seguimiento de tareas asignadas a Codex.
* **Archivos Creados / Modificados:**
  * [`docs/team/CODEX_WORK_LOG.md`](file:///c:/Proyectos2025/aperp%20Bod/backendAperp/backendCOBodega/docs/team/CODEX_WORK_LOG.md) — Log de trabajo de Codex.
* **Resumen de Cambios:**
  * Espacio de trabajo preparado para que Codex consigne los avances de backend o frontend.

---
