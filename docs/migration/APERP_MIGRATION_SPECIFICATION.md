# Especificación Técnica de Migración APERP: Módulo Control Bodega (`bod`)

## 📋 Resumen del Módulo

El área de **Control Bodega (`bod`)** en la Base de Conocimiento GeneXus `APERP_Base de conocimiento.xpz` comprende la gestión completa de inventario, guías de despacho, recepciones, movimientos sucursal-bodega, ordenes de compra y solicitudes de consumo.

* **Documento Excel Relacionado:** [`Especificacion_Migracion_APERP_Control_Bodega.xlsx`](file:///c:/Proyectos2025/aperp%20Bod/backendAperp/backendCOBodega/docs/migration/Especificacion_Migracion_APERP_Control_Bodega.xlsx)
* **Total Transacciones:** 65
* **Total Tablas Físicas:** 62
* **Regla Multiempresa:** Prácticamente el 100% de las tablas operativas contienen `GECODEMP` como primer atributo de llave primaria. La empresa es inyectada automáticamente por la sesión activa (`req.context.empCod`).

---

## 🏗️ Matriz Principales Transacciones y Tablas (`bod`)

| Código | Transacción | Tabla Física | Niveles | Llave Primaria | Patrón UI Propuesto |
| --- | --- | --- | --- | --- | --- |
| `MSucBod` | Movimientos Sucursal Bodega | `MSucBod` / `MSucBodDet` | 2 | `GECODEMP, MSBsuc, MSBBod, MSBNdoc...` | Cabecera + Modal Detalle de Ítems |
| `BodCent` | Bodega Central | `BodCent` / `BodCentDet` | 2 | `GECODEMP, BCNdoc, BCTDoc, BCRutP` | Cabecera + Modal Detalle |
| `GuiasD` | Guías de Despacho | `GuiasD` / `GuiasDDet` | 2 | `GECODEMP, GDSuc, GDBod, GDTdoc...` | Cabecera + Grid Detalle |
| `OrdComp` | Órdenes de Compra | `OrdComp` / `OrdCompDet` | 2 | `GECODEMP, OrdNum, OrdRut` | Cabecera + Modal Detalle |
| `SolComp` | Solicitudes de Compra | `SolComp` / `SolCompDet` | 2 | `GECODEMP, SComNum` | Cabecera + Modal Detalle |
| `SolCon` | Solicitudes de Consumo | `SolCon` / `SolConDet` | 2 | `GECODEMP, SolSuc, SolNum, SolRut` | Cabecera + Modal Detalle |
| `DesOC` | Despacho Orden Compra | `DesOC` / `DesOCDet` | 2 | `GECODEMP, DOCNum, DOCRut...` | Cabecera + Modal Detalle |
| `POMaeAr` | Maestro Ubicaciones/Posiciones | `POMaeAr` / `POMaeArDet` | 2 | `GECODEMP, SucCod, BodCod, PosCod` | Árbol de Ubicaciones + Modal |
| `MOVMAS` | Movimientos Masivos | `MOVMAS` / `MOVMASFam` | 2 | `GECODEMP, MVMID` | Cabecera + Grid |

---

## ⚡ Reglas de Migración y Arquitectura

1. **Aislamiento de Empresa (`req.context.empCod`):**
   * Todas las consultas SQL generadas en Node.js filtrarán por `GECODEMP = @empCod`.
   * El cliente React **nunca** enviará `GECODEMP` en los payloads de formulario.

2. **Manejo de Transacciones Cabecera - Detalle (Nivel 2):**
   * Los subniveles (como `MSucBodDet`, `OrdCompDet`, `SolConDet`) **no aparecen en el menú principal**.
   * Se editan, insertan y eliminan dentro del modal o sección de detalle de la cabecera correspondiente.

3. **Validación de RUT y Stock:**
   * La validación de RUT utiliza el servicio unificado `Verirut`.
   * Las operaciones de movimiento de stock ejecutan validaciones atómicas en el backend dentro de transacciones SQL (`BEGIN TRANSACTION` / `COMMIT`).

4. **Navegación y Permisos:**
   * Los accesos están sujetos a los permisos en `ASIGPROG` / Roles activos del usuario.
   * La ruta en React se registra en `authorizedMenu.jsx`.
