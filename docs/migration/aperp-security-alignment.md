# Adaptacion de Seguridad para APERP

## Objetivo

Nivelar la funcionalidad de Seguridad con la version vigente de CONEX sin convertir el modelo fisico APERP al modelo global de usuarios de CONEX. La empresa autenticada continua publicandose como `req.context.empCod`, pero todas las tablas GeneXus de Seguridad conservan el nombre fisico `GECODEMP`.

## Evidencia GeneXus

El XPZ APERP confirma estas reglas:

- `PVeriUsu` valida `UsuClave` sobre `Usuarios`.
- `PCamClave` cambia la clave usando `GECODEMP` y `USULOGIN`.
- `PVA2` autoriza por `GECODEMP`, usuario, sistema, modulo, programa y accion.
- `MenuOptionsDataAP` arma el menu filtrando `AsigSist`, `Asig` y `AsigProg` por `GECODEMP` y usuario.
- `Usuarios` tiene llave fisica `(GECODEMP, UsuLogin)`; no es una identidad global como `USUARIOS` en CONEX GX8.
- `AsigProg1` se conserva como segundo nivel de `AsigProg`.

## Esquema observado

En `BDAPERP` existen `g_emp`, `Usuarios`, `Sistemas`, `Modulos`, `Program`, `Program1`, `AsigSist`, `Asig`, `AsigProg`, `AsigProg1`, `UROLES` y `URolesPorUser`.

Antes de esta adaptacion no existian `DEFEMP`, `SEGUSUEMP`, `SEGUSUCRED`, `SEGSESION` ni `NIVSEG`. Los datos existentes incluian permisos directos y plantillas de rol con `GECODEMP=0`; la migracion los conserva sin copiarlos ni transformarlos. Solo agrega `SEGUSUCRED` y `SEGSESION`; no crea las tablas CONEX restantes.

## Decision de adaptacion

1. Conservar `Usuarios(GECODEMP, UsuLogin)` como identidad y pertenencia empresarial.
2. Conservar `g_emp(GECODEMP)` como maestro de empresa.
3. Crear vistas de lectura `VW_APERP_SEG_EMPRESAS` y `VW_APERP_SEG_USUARIOS` para aislar la equivalencia que necesita Node sin fingir que existen las tablas CONEX `DEFEMP` y `SEGUSUEMP`.
4. Crear `SEGUSUCRED` con llave `(GECODEMP, UsuLogin)` y `SEGSESION` con la empresa de la sesion en `GECODEMP`.
5. Mantener sincronizada la clave legada de GeneXus durante la convivencia. Las credenciales nuevas usan `scrypt`, pero una creacion o cambio desde React tambien actualiza `UsuClave`; por la longitud fisica de APERP, la clave queda temporalmente limitada a 8-10 caracteres.
6. Calcular permisos efectivos uniendo asignaciones directas de la empresa con plantillas de roles en `GECODEMP=0`.
7. Administrar Seguridad mediante `ADMINFULL` o logins configurados. APERP no expone `NIVSEG`; no se crea una tabla ficticia ni una pantalla para ella.
8. Portar desde CONEX solamente la experiencia vigente de asignaciones: pestaña `Directos`, pestañas por rol, alta/baja de roles y editor de plantillas. No se usa el proyecto `AS`.

## Controles obligatorios

- Ningun endpoint acepta `GECODEMP` desde React para reemplazar la empresa de sesion.
- Las consultas de usuario incluyen siempre `GECODEMP` junto con `UsuLogin`.
- Eliminar un usuario de una empresa no elimina sus filas de otra empresa.
- Quitar un rol no elimina permisos directos.
- Quitar un programa elimina su nivel `AsigProg1`.
- Las vistas son contratos de lectura; las escrituras se realizan sobre las tablas fisicas o las tablas aditivas correspondientes.

## Archivos de implementacion

- `database/20260802_APERP_security_alignment.sql`
- `database/verify_aperp_security_alignment.sql`
- `src/services/seguridad.service.js`
- `src/services/seguridadCatalogos.service.js`
- `src/services/seguridadAsignaciones.service.js`
- `src/services/seguridadRoles.service.js`
- `src/middleware/securityAuthorization.js`
- frontend `src/pages/seguridad/` y configuracion de rutas de Seguridad.

## Estado y verificacion

Aplicado el 2 de agosto de 2026 sobre `BDAPERP` en `DESKTOP-SOOAP92\SQLEXPRESS`, despues de probar la migracion dos veces sobre una restauracion temporal. El respaldo previo verificado con checksum se conserva en `C:\BD\BDAPERP_pre_security_20260802.bak`.

- Migracion repetible: aprobada en la copia restaurada.
- Aislamiento de un mismo login en dos empresas: aprobado para credenciales y sesiones dentro de una transaccion revertida.
- Verificador SQL sobre la base operativa: `OK` con 2 empresas, 5 filas empresa/usuario, 3 roles asignados, 249 programas directos y 83 programas de plantilla.
- Pruebas backend: 9 aprobadas.
- Build de produccion frontend: aprobado.
- ESLint dirigido: sin errores; conserva advertencias de fin de linea ya presentes en el proyecto.

Esta adaptacion resuelve el contrato de Seguridad, no la brecha general del modelo de bodega: `BDAPERP` sigue sin ser equivalente al XPZ completo en las tablas del area `bod`.
