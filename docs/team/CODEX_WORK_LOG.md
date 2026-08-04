# Log de Trabajo - OpenAI Codex

### 2026-08-04 - Migración limitada de maestros de artículos

* **Alcance:** Se migraron exclusivamente `bod.Fam` y `bod.FamTipo`, únicos objetos indicados con estado `Ready`; el resto de `Maestros_Artic` se dejó fuera.
* **Implementación:** CRUD Node/Express y pantallas React reutilizando el patrón de mantenedores; aislamiento por `req.context.empCod`, tablas GeneXus `Fam`/`FamTipo`, validación de tipo de familia y script SQL idempotente.
* **Seguridad:** La empresa no se recibe desde la pantalla. La eliminación de familias permanece bloqueada hasta relevar dependencias hijas; los tipos se bloquean si están en uso.
* **Documentación y verificación:** Se registró el contrato y pruebas reproducibles en `docs/migration/maestros-artic-migration.md` y se agregaron pruebas estructurales de configuración.
* **Menú autorizado:** Se vincularon las llamadas GeneXus `FamTipoWW` y `FamWW` a las opciones React “Tipos de familia” y “Familias de artículos”.
* **Script de menú:** Se agregó `database/20260804_menu_familias.sql`, que crea los programas 7 y 8 en APERP/Seguridad y los entrega al rol `ADMINFULL`.
* **Prompt de familia:** Se incorporó `tiposFamilia` al cargador centralizado de opciones del CRUD React para poblar `FamTCod` al crear o editar una familia.
* **Formulario de familia:** Se retiró de la interfaz el campo derivado `FamTDescrip`; el backend lo sigue calculando desde el tipo seleccionado.
* **Listado de familias:** Se restituyó `FamTDescrip` exclusivamente como columna de listado, aplicando la regla de mostrar la descripción de referencias sin exponer el campo en el formulario.
* **Corrección de regla de formulario:** Se agregó el soporte `formHidden` al descriptor de texto; antes sólo se propagaba para campos numéricos, por lo que `FamTDescrip` seguía visible pese a estar configurado como sólo listado.
* **Tipo de programa:** `ProgTipo` quedó como selector `1 - Usuarios` / `2 - Sistema`; el listado presenta la descripción y el backend sólo acepta esos valores. Se confirmó que el menú consulta exclusivamente `ProgTipo=1`.
* **Rutas React en menú:** `ProgNomGX` queda como ruta React directa; se agregó `database/20260804_update_program_react_routes.sql` para actualizar sólo `PROGRAM.ProgNomGX` del sistema `1`, y React dejó de usar equivalencias GeneXus para armar las URLs.

---

Este log registra todas las tareas, análisis, endpoints y desarrollos realizados por **OpenAI Codex** en el proyecto APERP Control Bodega.

---

### 2026-08-04 11:48 - Coordinación con Desarrollo01 / JC

* **Objetivo:** Registrar que el miembro del grupo **Desarrollo01** será referido como **JC** durante la coordinación del proyecto APERP Bodega.
* **Archivos modificados:**
  * `docs/team/CODEX_WORK_LOG.md` — registro de la convención de nombre y criterio de coordinación.
* **Resumen técnico:** Se recomienda trabajar por funcionalidades independientes, con rama propia por responsable, lectura previa de los logs de equipo y cierre de cada tarea con verificación y actualización documental.
* **Próximas tareas pendientes:** Definir el primer reparto de funcionalidades entre Codex y JC antes de iniciar cambios de backend o frontend.

---

### 2026-08-04 - Inventario Excel de migración APERP Bodega

* **Objetivo:** Generar un inventario inicial desde `APERP_Bodega.xpz` para apoyar la migración del módulo Bodega.
* **Archivos creados:**
  * `outputs/019fcd26-b3bf-7191-a7e8-dcb732e3da53/Inventario_Migracion_APERP_Bodega.xlsx` — libro con las hojas `Resumen` y `Detalle de objetos`.
* **Resultado técnico:** Se extrajeron 609 objetos de la exportación XML. El detalle prioriza las columnas solicitadas: Módulo, Folder y Tipo de objeto; agrega nombre, nombre calificado, descripción, padre, fecha de actualización y GUID. El resumen agrupa y cuenta los objetos por módulo, folder y tipo.
* **Verificación:** Se inspeccionaron las fórmulas de indicadores, no se detectaron errores de fórmula y se renderizaron visualmente ambas hojas.

---

### 2026-08-04 - Estudio técnico integral del proyecto

* **Objetivo:** Revisar el backend Node.js, su contrato con el frontend React, el estado de la migración GeneXus y la verificabilidad actual, sin cambiar comportamiento funcional.
* **Archivos modificados:**
  * `docs/team/CODEX_WORK_LOG.md` — registro de este estudio.
* **Hallazgos técnicos:**
  * El backend expone actualmente Maestros y Seguridad bajo `/backendDocker`; DTE y correo existen como código no montado en el router principal.
  * Seguridad conserva la jerarquía GeneXus, sesión opaca en cookie `HttpOnly`, alcance de empresa desde `req.context` y reglas unitarias aprobadas.
  * La migración sigue en fase temprana: el catálogo CONEX registra 225 procedimientos, de los cuales 224 continúan en `PENDING_ANALYSIS`; el inventario de objetos aún está en `DISCOVERED`.
  * La comparación documentada de la base APERP contra el modelo GX18 concluye `NOT_EQUIVALENT`: 163 tablas SQL frente a 218 del modelo y cobertura de 9,7 % para Bodega. Antes de ampliar módulos se debe decidir la fuente de datos y el mapeo de empresa.
  * `npm test` ejecuta también `scripts/test-aperp-connection.js`, por lo que falla cuando SQL Server no está disponible; la ejecución acotada `npm test -- test` aprobó 9 de 9 pruebas unitarias.
* **Pendientes recomendados:** decidir la arquitectura de datos/empresa; separar pruebas unitarias de diagnósticos de conectividad; aplicar permisos VA2 por operación y completar pruebas de integración contra una base controlada.

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
