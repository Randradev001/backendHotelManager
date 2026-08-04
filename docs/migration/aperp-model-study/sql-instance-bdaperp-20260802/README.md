# Contraste de BDAPERP local con el modelo GeneXus

## Veredicto

**NO EQUIVALENTE.** La base representa un esquema anterior o parcial: solo 160 de 218 tablas del XPZ actual coinciden por nombre (73.4%).

El analisis uso exclusivamente consultas `SELECT` de metadatos sobre la base adjunta; no ejecuto DDL, DML ni cambios de configuracion.

## Fuentes comparadas

- Modelo: `\\apserver01\Respaldos\EXpor_APERP\APERP_Base de conocimiento.xpz`, SHA-256 `c05c2c680d18fab6cd53fdd30460cb91e41591b258d1bc794463fb3cfaa7be8a`.
- Base adjunta: `C:\BD\BDAPERP.mdf` (75,497,472 bytes, ROWS); `C:\BD\BDAPERP_log.ldf` (75,497,472 bytes, LOG).
- Version interna original informada por SQL Server: no registrada; compatibilidad: 130.
- Instancia de estudio: DESKTOP-SOOAP92\SQLEXPRESS, SQL Server 16.0.1000.6.

## Resultado estructural

| Medida | XPZ actual | SQL local | Resultado |
|---|---:|---:|---|
| Tablas | 218 | 163 | 160 coincidencias exactas |
| Tablas sin diferencias en los controles aplicados | 218 | n/a | 72 |
| Columnas almacenadas/fisicas | 2710 | 1740 | 1674 coincidencias en tablas de igual nombre |
| Llaves primarias | 218 declaradas | 163 | 156 iguales y 4 distintas en tablas coincidentes |
| Indices fisicos | n/a como equivalencia directa | 326 | inventariados |
| Llaves foraneas | GX configurado para no generarlas | 0 | coherente, no concluyente |
| Columnas calculadas SQL | formulas GX no necesariamente fisicas | 0 | inventariadas |

Hay 58 tablas del modelo que no existen con ese nombre en la base local y 3 tablas locales sin nombre exacto en el XPZ. 3 tablas locales parecen nombres historicos de tablas actualmente faltantes. Aun considerando esas asociaciones, faltan al menos 55 tablas del modelo actual.

En las 160 tablas de nombre coincidente se detectaron 333 columnas esperadas ausentes, 8 columnas locales adicionales y 10 incompatibilidades de familia de tipo. El detalle completo esta en `column-differences.csv`.

## Cobertura por area

| Area | Tablas XPZ | Coincidencias SQL | Ausentes | Cobertura | Columnas ausentes | Llaves distintas |
|---|---:|---:|---:|---:|---:|---:|
| AMaeG | 25 | 23 | 2 | 92% | 7 | 0 |
| Facturacion | 17 | 17 | 0 | 100% | 50 | 0 |
| Framework | 9 | 9 | 0 | 100% | 11 | 0 |
| MasRoles | 1 | 1 | 0 | 100% | 2 | 0 |
| Seguridad | 12 | 12 | 0 | 100% | 12 | 0 |
| bod | 62 | 6 | 56 | 9.7% | 67 | 4 |
| operac | 68 | 68 | 0 | 100% | 133 | 0 |
| person | 24 | 24 | 0 | 100% | 51 | 0 |

El area `bod` es la brecha principal: solo 6 de 62 tablas coinciden por nombre y faltan 56. Esta base no es suficiente como esquema equivalente para el modulo de bodega.

## Diferencias de llave

| Tabla | Llave del XPZ actual | Llave SQL local |
|---|---|---|
| Gru | GECODEMP \| FamFam \| GruGru | FAMFAM \| GRUGRU |
| MSucBod | GECODEMP \| MSBsuc \| MSBBod \| MSBNdoc \| MSBRut \| MSBTDoc | gecodemp \| MSBSUC \| MSBBOD \| MSBNDOC \| MSBTDOC \| MSBRUT |
| OrdComp | GECODEMP \| OrdNum \| OrdRut | ORDNUM \| ORDRUT |
| SolCon | GECODEMP \| SolSuc \| SolNum \| SolRut | SOLSUC \| SOLNUM \| SOLRUT |

Estas diferencias impiden considerar equivalente el alcance multiempresa y la identidad de los registros dentro del subconjunto presente.

## Nombres historicos probables

| Tabla SQL local | Tabla probable del XPZ actual | Confianza | Evidencia |
|---|---|---|---|
| MSUCBOD1 | MSucBodDet | HIGH | Candidato calculado por similitud de nombre, columnas y llave; requiere validacion funcional. |
| ORDCOMP1 | OrdCompDet | MEDIUM | Candidato calculado por similitud de nombre, columnas y llave; requiere validacion funcional. |
| SOLCON1 | SolConDet | HIGH | Candidato calculado por similitud de nombre, columnas y llave; requiere validacion funcional. |

Estas asociaciones no autorizan renombrar ni reorganizar la base; deben validarse contra reglas y datos antes de migrar.

## Datos presentes

93 tablas tienen filas en esta base:

| Tabla | Filas |
|---|---:|
| Anticipos | 6 |
| AnticiposAnt1 | 20 |
| AproCOB | 3 |
| AreaTrab | 11 |
| Asig | 71 |
| AsigProg | 332 |
| AsigSist | 32 |
| Asistencia | 8 |
| AsistenciaAsis1 | 40 |
| BitMan | 1 |
| BitManM1 | 1 |
| BitPerPPer | 8 |
| BitRec | 2 |
| BitRecDet | 6 |
| Cargo | 307 |
| CargoSCar | 96 |
| CargosRec | 2 |
| CargosRec1 | 3 |
| CCDoc | 10 |
| CCDOC1 | 17 |
| CobrosIOM | 2 |
| CobrosIOMDet | 5 |
| ContAC | 3 |
| ContACCAC1 | 9 |
| CORDOC | 3 |
| EmpCli | 1 |
| Entidad | 387 |
| Entidad1 | 597 |
| EntSuc | 486 |
| ExamPersona | 2 |
| FACTDetalleHES | 6 |
| FactVentas | 12 |
| FactVentasDet | 15 |
| FVDetallePresu | 3 |
| g_emp | 2 |
| ING_IOM | 3 |
| IOM_Vehiculos | 9 |
| IOMInfRea | 3 |
| IOMMante00 | 5 |
| IOMObS | 1 |
| IOMPerAsis | 5 |
| MAAdmPension | 8 |
| MAArticv | 7028 |
| MABancos | 1 |
| MACCosto1 | 103 |
| MACcosto2 | 8201 |
| MAControlFechas | 6 |
| MACorrelativos | 2 |
| MaeArt | 2 |
| MAFamv | 17 |
| MAGruv | 152 |
| MAPARIVA | 1 |
| MAPrevision | 10 |
| MATipoDoc | 2 |
| MATipoDoc1 | 2 |
| MATiProce | 3 |
| Modulos | 20 |
| MSUCBOD | 1 |
| MSUCBOD1 | 2 |
| MTPROV | 1 |
| Pabellones | 14377 |
| PagosDoc | 5 |
| PagosDocDet | 7 |
| ParamGen | 20 |
| ParamGenLevel1 | 89 |
| ParCambus | 2 |
| ParCobros | 5 |
| ParCobrosFechas | 155 |
| PerCarFami | 3 |
| Perscont | 2 |
| PersMatrizlog | 9 |
| Personal | 117 |
| ProBL001 | 16 |
| Program | 86 |
| PS_InfResu | 33 |
| Req001 | 1 |
| Sistemas | 7 |
| sucu | 1 |
| TipAnti | 33 |
| TipMan | 26 |
| TipMan1 | 6002 |
| TipOBS | 7 |
| TipoContra | 3 |
| TiposE | 3 |
| TiposE1 | 6 |
| TiposPagos | 1 |
| TipPOC | 72 |
| TVehiculo | 10 |
| UMed | 1 |
| UROLES | 1 |
| URolesPorUser | 3 |
| Usuarios | 5 |
| VEHICULOS | 189 |

## Conclusion para la migracion

Esta base no puede usarse como representacion fisica equivalente del XPZ analizado. Puede utilizarse como fuente parcial, pero cada tabla migrada debe validarse contra el modelo actual y sus reglas.

## Artefactos

- `comparison-summary.json`: resultado y conteos verificables.
- `area-coverage.csv`: cobertura de tablas por area del modelo.
- `table-comparison.csv`: cobertura, columnas, llaves e indices por tabla.
- `column-differences.csv`: diferencias de columnas y tipos.
- `rename-candidates.csv`: posibles correspondencias historicas.
- `sql-tables.csv`, `sql-columns.csv`, `sql-primary-keys.csv`, `sql-indexes.csv`, `sql-foreign-keys.csv`: inventario fisico extraido.
