# Cambios a llamado de programas ProgNomGX

## Objetivo

Actualizar la regla de formacion del menu para que `PROGRAM.ProgNomGX` guarde directamente la ruta que React debe abrir.

Antes, `ProgNomGX` guardaba nombres o llamadas GeneXus, por ejemplo:

```text
bod.FamWW.aspx
TProgramWW.aspx
```

React tenia una tabla de equivalencias para convertir esos valores a rutas internas.

La regla nueva elimina esa equivalencia:

```text
PROGRAM.ProgNomGX = ruta React directa
```

Ejemplos:

```text
/maestros-gx/familias
/seguridad/programas
```

## Regla funcional

Para que un programa aparezca en el menu del usuario:

1. Debe existir en `PROGRAM`.
2. Debe tener `ProgTipo = 1`.
3. Debe estar asignado al usuario o a uno de sus roles mediante `ASIGPROG`.
4. `ProgNomGX` debe contener una ruta React valida, comenzando con `/`.
5. La ruta debe existir en el router React.

`ProgNomGX` ya no se interpreta como nombre GeneXus ni requiere mapeo en el frontend.

## Cambio en React

Archivo:

```text
frontEndBodega/src/menu-items/authorizedMenu.jsx
```

La funcion de resolucion queda reducida a validar que el valor venga como ruta React:

```js
export const resolveProgramRoute = (route) => {
  const value = String(route || '').trim();
  return value.startsWith('/') ? value : null;
};
```

Y el menu mantiene el uso:

```js
.map((program) => ({ ...program, url: resolveProgramRoute(program.llamadoGX) }))
.filter((program) => program.url)
```

Con esto, si `ProgNomGX` viene vacio o con un valor antiguo como `bod.FamWW.aspx`, el programa no se muestra en el menu porque no es una ruta React valida.

## Script SQL base

Archivo generado en este proyecto:

```text
database/20260804_update_program_react_routes.sql
```

Script:

```sql
USE [BDAPERP];
GO

/*
  Actualiza PROGRAM.ProgNomGX para que el menu use rutas React directas.
  Alcance: solo sistema 1. No crea programas ni cambia asignaciones.
*/

DECLARE @Routes TABLE (
  SistCod NUMERIC(4, 0) NOT NULL,
  Modcod NUMERIC(3, 0) NOT NULL,
  ProgCod NUMERIC(3, 0) NOT NULL,
  ReactRoute VARCHAR(100) NOT NULL
);

INSERT INTO @Routes (SistCod, Modcod, ProgCod, ReactRoute)
VALUES
  (1, 1, 1, '/maestros-gx/empresas'),
  (1, 1, 2, '/seguridad/sistemas'),
  (1, 1, 3, '/seguridad/modulos'),
  (1, 1, 4, '/seguridad/programas'),
  (1, 1, 5, '/seguridad/usuarios'),
  (1, 1, 6, '/seguridad/roles'),
  (1, 1, 7, '/maestros-gx/tipos-familia'),
  (1, 1, 8, '/maestros-gx/familias'),
  (1, 1, 20, '/seguridad/asignaciones');

UPDATE P
SET ProgNomGX = R.ReactRoute
FROM dbo.PROGRAM P
INNER JOIN @Routes R
  ON R.SistCod = P.SistCod
 AND R.Modcod = P.Modcod
 AND R.ProgCod = P.ProgCod
WHERE P.SistCod = 1
  AND ISNULL(RTRIM(P.ProgNomGX), '') <> R.ReactRoute;

SELECT
  P.SistCod,
  P.Modcod,
  P.ProgCod,
  RTRIM(P.ProgDes) AS ProgDes,
  RTRIM(P.ProgNomGX) AS ProgNomGX,
  P.ProgTipo,
  CASE WHEN R.ReactRoute IS NULL THEN 'SIN_MAPEO_EN_SCRIPT' ELSE 'OK' END AS EstadoRutaReact
FROM dbo.PROGRAM P
LEFT JOIN @Routes R
  ON R.SistCod = P.SistCod
 AND R.Modcod = P.Modcod
 AND R.ProgCod = P.ProgCod
WHERE P.SistCod = 1
ORDER BY P.Modcod, P.ProgCod;
GO
```

## Ajuste a scripts de creacion de menu

Todo script que cree registros en `PROGRAM` debe guardar rutas React directas en `ProgNomGX`.

Ejemplo correcto:

```sql
INSERT INTO dbo.PROGRAM (
  SistCod,
  Modcod,
  ProgCod,
  ProgDes,
  ProgFcrea,
  ProgTipo,
  ProgNomGX,
  ProgIDmenu,
  ProgTarget
)
VALUES (
  1,
  1,
  8,
  'Familias de articulos',
  CAST(GETDATE() AS date),
  1,
  '/maestros-gx/familias',
  ' ',
  ' '
);
```

Ejemplo antiguo que ya no debe usarse:

```sql
ProgNomGX = 'bod.FamWW.aspx'
```

## Impacto esperado

El backend sigue construyendo el menu desde:

```text
ASIGPROG directo del usuario
+ ASIGPROG heredado por rol
+ PROGRAM.ProgTipo = 1
```

El frontend ya no traduce nombres GeneXus. Solo muestra programas cuyo `ProgNomGX` sea una ruta React directa.

## Verificacion recomendada

1. Ejecutar el script SQL de actualizacion.
2. Revisar que todos los programas visibles del sistema tengan `ProgNomGX` iniciado con `/`.
3. Confirmar que esas rutas existen en `MainRoutes.jsx`.
4. Iniciar sesion nuevamente o refrescar la sesion.
5. Ejecutar build del frontend.

Comando usado en este proyecto:

```bash
npm run build
```

Resultado esperado:

```text
Build aprobado sin errores.
```
