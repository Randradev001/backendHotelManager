# Contraste de BDAPERP local con el modelo GeneXus

## Veredicto

**NO EQUIVALENTE.** La base local representa un esquema anterior o parcial: solo 57 de 218 tablas del XPZ actual coinciden por nombre (26.1%).

El analisis se realizo sobre una copia adjunta en modo `READ_ONLY`; los MDF/LDF originales no se modificaron.

## Fuentes comparadas

- Modelo: `\\apserver01\Respaldos\EXpor_APERP\APERP_Base de conocimiento.xpz`, SHA-256 `c05c2c680d18fab6cd53fdd30460cb91e41591b258d1bc794463fb3cfaa7be8a`.
- Base local: `C:\paso\BDatos_APERP\BDAPERP.mdf`, 8,388,608 bytes, fecha 2025-12-31T14:09:36.600Z.
- Referencia de red observada previamente: 75,497,472 bytes, fecha 2026-07-31T10:28:57-05:00; no estuvo disponible para adjuntarla durante este contraste.
- Version interna original informada por SQL Server: 852; compatibilidad: 130.
- Instancia de estudio: DESKTOP-SOOAP92\SQLEXPRESS, SQL Server 16.0.1000.6.

## Resultado estructural

| Medida | XPZ actual | SQL local | Resultado |
|---|---:|---:|---|
| Tablas | 218 | 61 | 57 coincidencias exactas |
| Columnas almacenadas/fisicas | 2710 | 524 | 459 coincidencias en tablas de igual nombre |
| Llaves primarias | 218 declaradas | 61 | 53 iguales y 4 distintas en tablas coincidentes |
| Indices fisicos | n/a como equivalencia directa | 101 | inventariados |
| Llaves foraneas | GX configurado para no generarlas | 0 | coherente, no concluyente |
| Columnas calculadas SQL | formulas GX no necesariamente fisicas | 0 | inventariadas |

Hay 161 tablas del modelo que no existen con ese nombre en la base local y 4 tablas locales sin nombre exacto en el XPZ. Tres de las tablas locales parecen nombres historicos de tablas actualmente faltantes; `DefEmp` parece una empresa legada adicional porque `G_Emp` tambien existe. Aun considerando esas asociaciones, faltan al menos 158 tablas del modelo actual.

En las 57 tablas de nombre coincidente se detectaron 119 columnas esperadas ausentes, 11 columnas locales adicionales y 3 incompatibilidades de familia de tipo. El detalle completo esta en `column-differences.csv`.

## Diferencias criticas de llave

| Tabla | Llave del XPZ actual | Llave SQL local |
|---|---|---|
| CCDoc | GECODEMP \| CCDRUT \| CCDTDOC \| CCDNDOC | GECODEMP \| CCDRut \| CCDNDoc |
| CCDOC1 | GECODEMP \| CCDRUT \| CCDTDOC \| CCDNDOC \| CCD1Cor | GECODEMP \| CCDRut \| CCDNDoc \| CCD1Cor |
| TiposPagos | GECODEMP \| TPDCOD | TPDCod |
| TipPOC | GECODEMP \| TPCod | TPCod |

En particular, `TiposPagos` y `TipPOC` no incluyen `GECODEMP` en la llave local, aunque el modelo actual lo exige. Esto impide considerar equivalente el alcance multiempresa incluso dentro del subconjunto de tablas presentes.

## Nombres historicos probables

| Tabla SQL local | Tabla probable del XPZ actual | Confianza | Evidencia |
|---|---|---|---|
| DefEmp | g_emp | LOW | Parece una empresa legada adicional: G_Emp tambien existe, y la llave y casi todos los atributos son distintos. |
| FactVentas1 | FactVentasDet | HIGH | Es el nivel detalle historico de FactVentas; conserva la llave del encabezado y atributos FV1. |
| MAUMed | UMed | HIGH | Coinciden UmCod, UMSig, UMDes y UMCantSal; el XPZ actual agrega GECODEMP a la llave. |
| PagosDoc1 | PagosDocDet | HIGH | Es el nivel detalle historico de PagosDoc y coincide su estructura de llave/atributos PAGD1. |

Estas asociaciones no autorizan renombrar ni reorganizar la base; deben validarse contra reglas y datos antes de migrar.

## Datos presentes

Solo 10 tablas tienen filas en esta copia:

| Tabla | Filas |
|---|---:|
| Asig | 9 |
| AsigProg | 14 |
| AsigSist | 8 |
| G_Emp | 1 |
| MenuItem | 5 |
| Modulos | 3 |
| Program | 8 |
| Sistemas | 4 |
| Usuarios | 3 |
| WWP_Parameter | 8 |

## Conclusion para la migracion

Esta base sirve como muestra historica de seguridad, parametros y una parte reducida del dominio, pero **no puede usarse como representacion fisica equivalente del XPZ analizado**. Para certificar el esquema vigente hace falta contrastar la copia de red mas reciente o una copia de produccion/control con fecha y hash confirmados.

## Artefactos

- `comparison-summary.json`: resultado y conteos verificables.
- `table-comparison.csv`: cobertura, columnas, llaves e indices por tabla.
- `column-differences.csv`: diferencias de columnas y tipos.
- `rename-candidates.csv`: posibles correspondencias historicas.
- `sql-tables.csv`, `sql-columns.csv`, `sql-primary-keys.csv`, `sql-indexes.csv`, `sql-foreign-keys.csv`: inventario fisico extraido.
