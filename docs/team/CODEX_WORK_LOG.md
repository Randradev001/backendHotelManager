# Log de Trabajo - OpenAI Codex

### 2026-10-18 - Revision de frontend Vercel actual

* **Consulta:** Revisada la publicacion actual: HTML ya referencia recursos desde /js y /css, sin prefijo /free. Configuracion local de Vercel mantiene API del mismo origen y falta el destino publico Railway para incorporar el proxy. Sin cambios funcionales ni despliegue.


### 2026-10-18 - SQL Server en Railway

* **Consulta:** Confirmada la opcion de desplegar la imagen oficial SQL Server como servicio separado del backend Node.js, con volumen /var/opt/mssql y conexion privada. Explicada la necesidad de restaurar HotelManagerDB y elegir Express o licencia de produccion, sin asumir que una plantilla Developer sirve para produccion. No se crearon servicios remotos.


### 2026-10-18 - Configuracion Vercel y Railway Node.js

* **Correccion de alcance:** Usuario confirma frontend Vercel y backend Railway sin Docker propio. Se conserva la configuracion Docker anterior como alternativa, sin aplicarla al servicio actual.
* **Preparacion:** Ejemplo de variables deploy/railway-node.env.example para el servicio Node.js existente, con origen Vercel, sesiones y destino SQL pendiente. Conservada la compatibilidad de la opcion TLS heredada.
* **Pendientes:** URL publica Railway y ubicacion de SQL Server para completar el proxy Vercel y la conectividad. No se publicaron cambios ni se configuraron servicios de pago.


### 2026-10-15 - Esquema de despliegue en Railway

* **Consulta:** Explicado frontend Vercel con proxy hacia backend Railway y SQL Server como servicio separado en red privada con volumen persistente. Se requiere adaptar Dockerfile seleccionado, variables, persistencia y restaurar HotelManagerDB; no se presento SQL Server como servicio administrado nativo.
* **Estado:** Documentacion oficial de Railway consultada; ninguna cuenta, servicio de pago o despliegue creado.


### 2026-10-15 - Alternativas de alojamiento Docker

* **Consulta:** Revisadas fuentes oficiales de DigitalOcean, Hetzner, Railway y requisitos SQL Server para alternativas al servidor compartido. VPS Linux x86-64 conserva el Compose; plataformas administradas requieren adaptar servicios, red y persistencia. Sin contratacion ni despliegue.


### 2026-10-14 - Identificacion del servidor remoto

* **Entrada:** Usuario identifica 190.3.171.48 como servidor de CONEX/APERP.
* **Comprobacion de solo lectura:** HTTP 80 responde 200 y Microsoft-IIS/10.0. HTTPS 443 no valida la cadena; inspeccion de metadatos del certificado muestra Cloudflare Origin CA para *.busapp.cl y busapp.cl. No se enviaron credenciales ni se modificaron servicios remotos.
* **Pendiente:** Confirmar control del dominio y disponibilidad de Linux/Docker o VM para el Compose preparado. No se configuro Vercel contra HTTPS por IP con certificado no confiable. Guia actualizada con estos limites.


### 2026-10-14 - Pantalla blanca en frontend publicado en Vercel

* **Evidencia remota:** https://front-hotel-manager-mu.vercel.app devuelve HTML con recursos /free/js/index-Xze-4F6d.js y /free/css/index-DMouZ4Os.css, ambos 404; /js/index-Xze-4F6d.js responde 200. /login y /free/ tambien respondian 404.
* **Correccion local frontend:** Creado vercel.json activo que compila con base / y API del mismo origen, instala con npm ci y aplica fallback de React excluyendo /backendDocker. Router alineado a import.meta.env.BASE_URL; cliente API usa / como valor de produccion predeterminado. Plantilla con proxy actualizada; el proxy real sigue pendiente de direccion HTTPS del backend.
* **Docker/documentacion:** APP_ORIGIN del ejemplo de servidor actualizado con el dominio Vercel proporcionado. Guia distingue dominio frontend de destino SQL/API y explica que se requiere subir cambios y volver a desplegar.
* **Verificacion:** Build con el comando exacto de vercel.json aprobado; manifest PWA en / y HTML sin referencias /free. Navegador Chromium aislado contra el build local: / y /login muestran el formulario de acceso sin errores JavaScript, simulando API no desplegada con respuesta 404. Separacion de rutas SPA/API y git diff --check aprobados. No se modificaron datos ni reglas de negocio; no se publico ni se conecto el servidor remoto. Se preservaron los cambios preexistentes, incluido package-lock.json del frontend.


### 2026-10-10 - Preparacion Docker aislado y frontend Vercel

* **Alcance final:** Backend y SQL Server dedicados para convivir con CONEX/APERP; frontend preferentemente en Vercel. Compose independiente, red privada, volumen SQL propio y API publicada solo en loopback 3088. Perfil web opcional en 8088 sin ocupar 80/443. Ningun despliegue remoto, backup o restauracion ejecutado.
* **Archivos:** compose.server.yml, deploy/Dockerfile, ejemplo de entorno, guia y asistente explicito backup/restore de HotelManagerDB (rechaza sobrescritura). En frontend: Dockerfile/Caddy opcionales, plantilla Vercel con proxy de API y exclusion de entornos del contexto Docker. Manifest PWA ahora respeta VITE_APP_BASE_NAME para publicar en / o /free/.
* **Verificacion:** Compose validado; imagen backend construida con npm ci y prueba HTTP /ping en contenedor sin red aprobada; 12/12 pruebas backend. Compilacion frontend con variables de Vercel aprobada y manifest start_url/scope verificados en /. git diff --check aprobado en ambos repositorios. Imagen construida localmente en ARM; construir en el servidor Linux x86-64 para produccion. Perfil web Docker y flujo backup/restore no probados integralmente.
* **Pendientes:** Endpoint HTTPS publico del backend/proxy existente, URL Vercel y datos de servidor por confirmar. SQL no se inicializa con demos automaticamente. Auditoria de npm durante build reporta 32 vulnerabilidades (2 criticas, 18 altas, 9 moderadas y 3 bajas); no se realizaron actualizaciones forzadas. Revisar dependencias y usar credencial SQL dedicada antes del despliegue definitivo; configuracion inicial usa sa en red privada.


### 2026-10-10 - Conexion SQL confirmada tras iniciar Docker

* **Verificacion:** Contenedor sqlserver2022 activo, puerto publicado 127.0.0.1:1433. `node scripts/test-aperp-connection.js` finalizo correctamente con el entorno actual: base HotelManagerDB, 25 tablas.
* **Resultado:** Resuelto el bloqueo de conectividad local al iniciar Docker. Sin cambios en configuracion, credenciales o datos; login de aplicacion no probado en esta verificacion.


### 2026-10-10 - Diagnostico de conexion SQL local

* **Resultado:** El entorno apunta a localhost / HotelManagerDB y ya contiene usuario y clave sin marcadores. Prueba TCP a 127.0.0.1:1433 devuelve ECONNREFUSED: no hay servicio aceptando conexiones en ese destino. Docker CLI instalado, pero su daemon no esta disponible.
* **Pendiente:** Confirmar donde reside HotelManagerDB (servidor remoto o entorno local) antes de cambiar el destino o provisionar una base. No se modificaron credenciales ni datos.


### 2026-10-10 - Consulta de acceso de prueba

* **Accion:** Identificado el acceso administrador de prueba AANDRADE por correo en el instalador standalone, linea 62, para hotel 6002. Se informo la credencial inicial solicitada sin modificar usuarios ni claves.
* **Limite:** Evidencia de scripts de instalacion; no se verifico que la clave siga vigente en la base de datos activa.


### 2026-10-10 - Reparacion de dependencias nativas del frontend en macOS

* **Problema:** Vite no iniciaba en Node 20.19.1 / darwin arm64 por ausencia de @rollup/rollup-darwin-arm64 para Rollup 4.59.0.
* **Accion:** Ejecutado en el frontend `npm install --no-save --package-lock=false @rollup/rollup-darwin-arm64@4.59.0`. npm recompuso node_modules (21 paquetes agregados, 32 eliminados y 583 cambiados); no se modificaron manifiesto ni archivos lock. Se preservo la modificacion previa de yarn.lock.
* **Verificacion:** Build de produccion y generacion PWA aprobados. Vite iniciado con puerto explicito 5173 para evitar colision con backend 3000; respuesta HTTP 200 en /free/. Servidor de desarrollo dejado activo.
* **Observacion:** npm reporto cinco vulnerabilidades de dependencias (una baja, cuatro altas); no se aplicaron actualizaciones forzadas ajenas a la reparacion.


### 2026-10-10 - Configuracion local de entorno

* **Cambio:** Creado `.env` local con puerto 3000, origenes frontend de desarrollo, base HotelManagerDB, sesiones y rol ADMINFULL. Host localhost como supuesto explicito; usuario y clave SQL quedan como marcadores a completar. No se reutilizaron credenciales de la configuracion PM2 heredada de otra base.
* **Compatibilidad:** Documentada en el archivo la interpretacion invertida de SQLSERVER_ENCRYPT en el conector actual; no se modifico codigo funcional.
* **Verificacion:** Archivo parseado mediante dotenv; permisos locales 0600. Conexion a SQL pendiente de completar los datos reales.


### 2026-10-10 - Inspeccion general del proyecto

* **Alcance:** Estudio de arquitectura backend, rutas, servicios, autenticacion, autorizacion, migraciones SQL y documentacion; lectura complementaria del frontend vecino (rutas, sesion, API y ubicaciones). Sin cambios funcionales ni ejecucion de migraciones.
* **Modelo actual:** Hotel Manager de mantenimiento sobre SQL Server, con dashboard, ubicaciones, categorias, activos, ordenes y tareas jerarquicas. Conserva seguridad GeneXus y rutas maestras CONEX/APERP. La documentacion establece HotelManagerDB y acceso multi-hotel mediante ADMINFULL o HMUSERHOTELACCESS.
* **Hallazgos por lectura de codigo:** (1) La API frontend elimina locationId del cuerpo al actualizar una ubicacion, pero el controlador no incorpora req.params.locationId y el servicio lo exige. (2) saveWorkOrder persiste cabecera/evento antes de guardar tareas en otra transaccion: un error posterior puede dejar cambios parciales. (3) La edicion directa acepta estados sin aplicar el grafo de transitionWorkOrder. (4) Varias rutas maestras exigen sesion, pero no permiso de programa. (5) SQLSERVER_ENCRYPT compara contra 'false', invirtiendo el significado de la opcion. (6) getSession no rechaza UsuEstado inactivo; la vista instalada tampoco lo filtra. Estos hallazgos requieren correccion/verificacion especifica; no se ejecutaron reproducciones contra SQL Server.
* **Verificacion:** `node --test test/*.test.js`: 12/12 aprobadas; carga del router raiz correcta. La suite revisada cubre seguridad y configuracion de maestros, sin pruebas especificas de Hotel Manager. Host/base/instancia SQL no definidos en el proceso local, por lo que no se valido operacion integrada. El cambio previo en yarn.lock se preservo.


### 2026-08-19 - Canadian email-based login

* **Authentication:** Replaced RUT lookup with normalized, case-insensitive `UsuCorreo` lookup while preserving password migration, sessions, roles, permissions and company isolation.
* **Multi-hotel:** One email can resolve the same user's assigned hotels and continues through the existing protected hotel selection step.
* **Frontend:** Replaced the RUT control with an English email field, Canadian placeholder, email validation and appropriate icon/autocomplete semantics.

### 2026-08-18 - Management Intelligence home dashboard

* **Business intelligence:** Expanded the hotel-scoped dashboard with backlog, overdue exposure, on-time completion, average resolution time, six-month demand, lifecycle, priorities, workload, locations, assets and category concentration.
* **Conclusions:** Every analytical block includes an English data-driven management conclusion, including risk and recommended focus.
* **Navigation:** The BI dashboard is now the authenticated landing page and the main Dashboard menu destination.
* **Security:** All aggregates continue to use session `GECODEMP`; the optional user filter cannot change company context.

### 2026-08-12 - HM TaskManager visual identity and hotel login

* **Branding:** Replaced the APERP mark with a restrained HM TaskManager SVG combining an `HM` monogram and task checkmark.
* **Login:** Added a generated hospitality image featuring a contemporary Winnipeg hotel operation and rebuilt the login hero with English hotel-focused messaging.
* **Consistency:** Updated logo accessibility labels and the dashboard footer brand.
* **Login copy:** Removed the remaining visible APERP references from the login and browser metadata; authentication now uses English HM TaskManager and Hotel terminology.

### 2026-08-12 - Status workflow from Work Order list

* **Frontend:** Added a status-change action to each eligible Work Order row.
* **Workflow:** The modal displays all six statuses, identifies the current one, disables invalid transitions, and applies the same required assignment, resolution, hold, completion, and cancellation inputs used by the Work Board.
* **Integration:** Successful changes refresh both the Work Order list and Operations Dashboard while using the existing audited, company-scoped transition endpoint.
* **Verification:** Frontend production/PWA build passed.

### 2026-08-12 - Work Order dates and overdue alerts

* **Backend:** Work order create/update now persists `StartedAt`, `DueAt`, and `CompletedAt`, rejecting invalid ranges.
* **Frontend:** The CRUD captures start and expected completion, displays actual completion, and includes the schedule in the grid and record preview.
* **Work Board:** Cards show From/To dates; open orders past `DueAt` receive a red background, border, due date, and `OVERDUE` badge.
* **Correction:** Fixed the date declarations so they belong to `saveWorkOrder` rather than `saveAsset`; the misplaced declarations caused a `ReferenceError` and generic HTTP 500 while editing.
* **Verification:** Backend syntax check and frontend production/PWA build passed.

### 2026-08-12 - HM Work Board workflow

* **Frontend:** Replaced the Work Board placeholder with six drag-and-drop lanes: New, Assigned, In Progress, On Hold, Completed and Cancelled. Dropping a card opens the required contextual form.
* **Workflow:** Assignment requires an active hotel user; In Progress requires the planned resolution; On Hold, Completed and Cancelled require their respective reason/comment. Invalid transitions are rejected.
* **Backend:** Added a transactional transition endpoint scoped by session `GECODEMP`. Each accepted movement updates operational dates and appends the previous/new state plus note to `HMWORKORDEREVENT`.
* **Verification:** Backend syntax checks and frontend production/PWA build passed.

### 2026-08-12 - HM Operations Dashboard

* **Objective:** Add a professional, data-driven operations dashboard for each active hotel.
* **Backend:** Added the authorized `GET /backendDocker/hotel-manager/dashboard` aggregate, scoped to session `GECODEMP`, for work order state/priority, attention queue, active locations and active assets.
* **Frontend:** Replaced the dashboard placeholder with operational metrics, priority and status breakdowns, attention list, deep links and automatically generated quick conclusions.
* **Verification:** Backend syntax checks, a live `GECODEMP 6002` dashboard read, and frontend production/PWA build all passed.

### 2026-08-12 - HM professional list experience

* **Assets and Work Orders:** Reworked both registers to match the Locations master pattern: search plus status filter, icon-led primary cell, compact chips for status/priority, icon action buttons and consistent gradient headers/modal forms.
* **Verification:** Frontend production build and PWA generation completed successfully.

### 2026-08-12 - HM test operational data

* **Objective:** Make the new Andres Andrade test hotel immediately useful for the first HM CRUD validation.
* **Execution:** Applied `database/20260812_hm_test_data_6002.sql` to `BDAPERP`. It adds Main Lobby, Room 101 and Mechanical Room; HVAC, Plumbing and Electrical categories; HVAC-01; and an assigned sample work order with its audit event.

### 2026-08-12 - First working HM CRUD: Locations

* **Objective:** Replace the HM Locations placeholder with an operational, hotel-isolated registration screen.
* **Backend:** Added `GET` and `POST /backendDocker/hotel-manager/locations`, both protected by the existing session and program permission `40/1/3`. `GECODEMP` always comes from `req.context.empCod`; parent locations are validated in the same hotel.
* **Frontend:** Added the English Locations workspace: load current locations and create building, floor, room, area, or equipment-room records. It is routed from the authorized HM menu.
* **Verification:** Node syntax checks passed, `npm run build` passed, and an integration read for test hotel `GECODEMP 6002` returned zero locations as expected for a new hotel.

### 2026-08-12 - HM test hotel and user for Andres Andrade Vargas

* **Objective:** Provision a dedicated, active test hotel and a minimally privileged account for RUT `17.526.007-2`.
* **Artifact:** Added `database/20260812_hm_test_hotel_andres_andrade.sql`. It creates `GECODEMP 6002` (`HM Test Hotel - Andres Andrade`), user `AANDRADE`, and grants only system 40 / Maintenance programs.
* **Security:** Existing sessions for this account are revoked on rerun. The test account is not granted the global `ADMINFULL` role or unrelated APERP programs.
* **Execution:** Applied and verified in `BDAPERP`; the active account has five Hotel Manager menu programs for `GECODEMP 6002`.

### 2026-08-12 - HM menu routes available in React

* **Incident:** The new authorized HM menu links led to the React Router default `404 Not Found` because their routes had not yet been registered.
* **Frontend:** Added a shared English Hotel Manager foundation page and registered `/hotel-manager/dashboard`, `/work-orders`, `/locations`, `/categories` and `/assets`. Each entry shows the active hotel session context and an appropriate module-specific next step.
* **Verification:** `npm run build` completed successfully, including PWA generation.

### 2026-08-12 - HM menu registration for test user

* **Objective:** Register the initial Hotel Manager menu without changing permissions for any other user.
* **Artifact:** Added `database/20260812_hm_menu_test_user.sql`. It creates system `40 - Hotel Manager`, module `1 - Maintenance`, and the initial Dashboard, Work Orders, Locations, Maintenance Categories and Assets menu programs.
* **Access scope:** The script resolves active accounts by RUT `14.332.241-6` and grants the hierarchy in `ASIGSIST`, `ASIG` and `ASIGPROG` only for those hotel companies. It is safe to run again.
* **Execution:** Applied and verified in `BDAPERP`; `MANDRADE` now has the five HM programs under system 40 for `GECODEMP` 100 and 6001.

### 2026-08-12 - HM Hotel Manager foundation

* **Objective:** Establish the reviewable relational foundation for the new hotel maintenance product without changing existing APERP/GeneXus behaviour or executing database changes.
* **Tenant model:** Each existing `g_emp` company is one hotel. Every HM table, primary key and internal foreign key includes `GECODEMP`, which is obtained only from the authenticated session context.
* **Artifacts:** Added `database/20260812_hm_foundation.sql` with idempotent DDL for locations, categories, assets, work orders, assignments, audit events, comments and attachment metadata; added `docs/architecture/hm-hotel-manager-foundation.md` with lifecycle, API boundary and unresolved design decisions.
* **Security:** The DDL deliberately retains legacy `UsuLogin` as the audit actor while a future email-login migration can change the credential lookup without breaking permissions or historical records.

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
### 2026-08-19 - HM TaskManager executive presentation

* **Objective:** Create an English executive presentation for Canadian hotel leadership covering multi-hotel management, company security, operational flow, Business Intelligence, and conclusions.
* **Artifact:** `outputs/hm-taskmanager-executive-presentation.pptx`.
* **Evidence:** Used the stored HM TaskManager login visual and seeded HM test data names from the front end and migration scripts; presentation render completed and `slides_test.py` reported no overflow.
### 2026-08-19 - HM TaskManager deck updated with real UI captures

* **Objective:** Replace interface-faithful panels with authenticated HM TaskManager screenshots.
* **Artifact:** Updated `outputs/hm-taskmanager-executive-presentation.pptx`; real captures are in `outputs/real-ui-captures/`.
* **Verification:** Captured Login, Dashboard, Work Orders, Work Board, Locations, Maintenance Categories, and Assets using the local frontend/backend and the seeded HM test user. Rendered slides and passed `slides_test.py` with no overflow.

### 2026-09-04 - Standalone Hotel Manager database

* **Objective:** Separate Hotel Manager from `BDAPERP` while retaining the compatible multi-company security layer.
* **Implementation:** Created and executed `database/20260904_hotel_manager_standalone.sql`. The installer provisions `HotelManagerDB`, security catalogs and assignments, credentials/sessions, the eight Hotel Manager operational tables, tenant constraints, six menu entries, hotel `6002`, administrator `AANDRADE`, and sample maintenance records.
* **Canadian access:** Authentication and security views now use Hotel Manager-specific views; email is required and legacy RUT fields are optional in user maintenance.
* **Isolation:** The backend connection now targets `HotelManagerDB`; `BDAPERP` was not modified or removed.
* **Verification:** Installer rerun was idempotent; email login returned hotel `6002`, role `ADMINFULL` and six menu items. CRUD reads returned 3 locations, 3 categories, 1 asset and 1 work order; dashboard aggregation succeeded. `npm test` passed 14/14 tests and `git diff --check` passed.

### 2026-09-04 - Work order task collection

* **Objective:** Add a dynamic task list to work orders with status and optional responsible person, including later management from the work-order register.
* **Implementation:** Added tenant-scoped level-two table `HMWORKORDERTASK`, collection persistence in create/edit, a dedicated bulk update endpoint, and a task-management action/dialog in the frontend list.
* **Verification:** Applied the migration to `HotelManagerDB`; persisted and read one unassigned and one assigned task for the sample order. Backend tests passed 14/14 and the frontend production/PWA build completed successfully.
* **Completion rule:** The backend now rejects every attempt to complete a work order while a child task remains `TODO` or `IN_PROGRESS`; the work-order register also disables that transition and explains why.
* **Startup correction:** Restored the missing `removeAsset` controller export that caused Express to receive an undefined callback for `DELETE /assets/:assetId`. Both the Hotel Manager router and root router now load successfully.
* **Integrated transition:** Both Change Status and Work Board dialogs now display their child tasks and allow status/responsible edits. The backend persists those edits atomically with the header transition and then evaluates the completion rule.
* **Board task summary:** Work Board cards now open task management on click and display pending/completed counts plus a readiness message indicating how many tasks remain before the order can be completed. Frontend/PWA production build passed.
* **Multi-hotel operations:** Added permission-scoped hotel access, the Work Board hotel filter, cross-hotel mutation validation, compact card metadata, and hierarchical tasks through `ParentTaskId`. Loaded six Manitoba hotels and 27 real-world sample orders: 23 Colonial room renovations, one Clarion carpet project, and three Courtis projects. Verified seven visible hotels including the administrator's home hotel, 28 total orders including the original sample, and preservation of all 72 furniture task/tree rows after editing.
* **Administrator visibility:** `ADMINFULL` now receives all hotels and all work orders by default, with a hotel selector in both Work Board and Work Orders. The selector is hidden for regular users, whose query remains session-hotel scoped. Backend authorization, routers, 14 tests, and the production PWA build passed.
* **Compact Work Board cards:** Reduced card spacing and typography, removed the large coloured task-summary panel, and moved progress beside the work-order number using the compact format `pending/total · percentage`. Location/assignee and From/To now each share one line. Production PWA build passed.
* **Lane-coloured cards:** Work Board cards now use a subtle translucent background, border, and hover shadow derived from their lane colour. Overdue cards retain the stronger red warning treatment. Production PWA build passed.
* **Demo workforce:** Added and executed the repeatable worker seed for Remigio Andres Andrade, Erwin, Greg, Ron Lemuel Cruz, Ronwell Cruz, and Jose. Six active `TECHNICIAN` users now exist in each of the seven demo hotels (42 hotel-user records) with role-based Dashboard, Work Orders, and Work Board access.
* **Task/header state rules:** `IN_PROGRESS` now requires at least one child task in `TODO` or `IN_PROGRESS` when tasks exist. `COMPLETED` requires every child task to be exactly `COMPLETED`; cancelled tasks no longer satisfy completion. Both scenarios were verified against SQL Server, backend tests passed 14/14, and the PWA build passed.

### 2026-09-04 - Simple user guide presentation

* **Objective:** Create a concise English PowerPoint explaining the primary HM TaskManager screens for managers and maintenance workers.
* **Artifact:** `outputs/hm-taskmanager-simple-user-guide-final.pptx` with nine slides covering secure access, the management dashboard, work orders, task/status rules, Work Board, locations, categories, assets, and the daily operating routine.
* **Evidence:** Navigated the local application and reused authenticated real-screen captures. The final deck passed presentation integrity/layout validation and `slides_test.py` reported no overflow after visual review of every slide.
