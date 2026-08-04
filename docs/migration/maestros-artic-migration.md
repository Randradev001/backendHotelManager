# Migración APERP Bodega — `bod.Fam` y `bod.FamTipo`

## Alcance aprobado

La migración queda limitada exclusivamente a los objetos con estado `Ready`:

| Objeto GX | Módulo / folder | Tabla física | Nivel | Clave |
| --- | --- | --- | --- | --- |
| `bod.FamTipo` | `bod / Maestros_Artic` | `FamTipo` | 1 | `GECODEMP, FamTCod` |
| `bod.Fam` | `bod / Maestros_Artic` | `Fam` | 1 | `GECODEMP, FamFam` |

No se migran en este cambio los demás objetos del folder, incluidos `Gru`, `MaeArt`, procedimientos, WorkWithPlus, prompts ni selectores.

## Comportamiento implementado

- `FamTipo` mantiene los tipos de familia por empresa autenticada.
- `Fam` mantiene las familias de artículos por empresa autenticada y exige que `FamTCod` exista en `FamTipo` para esa misma empresa.
- `FamTDescrip` es un atributo físico de `Fam` en GeneXus; el backend lo deriva desde `FamTipo` al crear o cambiar el tipo, en lugar de confiar en el valor enviado por la pantalla.
- `GECODEMP` se obtiene exclusivamente desde `req.context.empCod`. El cliente no puede seleccionar ni sobrescribir la empresa.
- Se conservan nombres de tablas y atributos GeneXus. El script `database/20260804_bod_fam_famtipo.sql` crea las dos tablas sólo si aún no existen; no se ejecuta automáticamente.

## Dependencias y decisiones pendientes

La exportación identifica que `Fam` es padre de varios maestros e históricos. Como esas dependencias aún no están migradas ni verificadas en SQL Server, la eliminación de `Fam` queda deshabilitada. La eliminación de `FamTipo` se bloquea si existe una familia que lo utiliza.

Las rutas requieren sesión autenticada. Para que aparezcan en el menú actual se asignan los programas `7` y `8` del sistema `1`, módulo `1`, mediante `database/20260804_menu_familias.sql`; el script entrega ambas opciones al rol `ADMINFULL` sin alterar otras asignaciones.

## Verificación reproducible

1. Aplicar el script SQL en una base de prueba `BDAPERP`.
2. Autenticar dos empresas distintas y crear un mismo `FamTCod` en ambas.
3. Crear una familia usando un tipo de la empresa activa: debe resultar exitosa.
4. Intentar crearla con un tipo existente sólo en la otra empresa: debe devolver `400`.
5. Intentar eliminar un tipo utilizado: debe devolver `409`; intentar eliminar una familia debe devolver `405`.
