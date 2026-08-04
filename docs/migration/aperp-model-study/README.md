# Estudio inicial del modelo APERP

## Alcance

Este inventario estudia exclusivamente el modelo logico exportado por GeneXus. No implementa funcionalidad, no cambia estados de migracion y no considera una tabla de nivel subordinado como maestro independiente.

La fuente APERP se mantiene separada del inventario GX8 de CONEX ya existente en este repositorio.

## Fuente y entorno

- XPZ: `\\apserver01\Respaldos\EXpor_APERP\APERP_Base de conocimiento.xpz`
- SHA-256: `c05c2c680d18fab6cd53fdd30460cb91e41591b258d1bc794463fb3cfaa7be8a`
- Knowledge Base: **APERP**
- Entorno: **NETFrameworkSQLServer**; generador **.NET Framework**; datastore SQL Server (DBMS 12)
- Multitenancy GeneXus: **False**
- Integridad referencial generada en base: **No**
- KMW: 4.0, build 185416

## Magnitud del modelo

- Objetos exportados: **3676**
- Transacciones: **209** (201 de aplicacion y 8 de framework)
- Tablas fisicas declaradas por GeneXus: **218** (209 asociadas a la aplicacion)
- Niveles logicos de transaccion: **276**, de los cuales **67** son subordinados
- Atributos globales: **2204**
- Dominios: **59**
- Grupos de subtipos: **75**, con 318 mapeos
- Atributos formula: **84**; hay 64 usos virtuales y 19 usos redundantes persistidos
- Atributos autonumerados: **6**

Aunque la propiedad multitenant de GeneXus esta desactivada, **197** de 209 tablas de aplicacion incluyen explicitamente `GECODEMP` o `EmpCod`; las 12 restantes deben clasificarse individualmente como globales o pendientes de alcance empresarial.

## Transacciones de aplicacion por area

| Area | Transacciones | Tablas fisicas |
|---|---:|---:|
| AMaeG | 20 | 25 |
| Facturacion | 16 | 17 |
| MasRoles | 1 | 1 |
| Seguridad | 10 | 12 |
| bod | 65 | 62 |
| operac | 67 | 68 |
| person | 22 | 24 |

## Niveles subordinados confirmados

- `SecObject` -> `SecObjectFunctionalities` (SecObjectName)
- `ParamGen` -> `ParamGenLevel1` (GECODEMP, PARCod)
- `AsigProg` -> `AsigProg1` (GECODEMP, USULOGIN, SISTCOD, MODCOD, PROGCOD)
- `Program` -> `Program1` (SISTCOD, MODCOD, PROGCOD)
- `Entidad` -> `Entidad1` (GECODEMP, ENTRUT)
- `MACCosto1` -> `MACcosto2` (GECODEMP, SECCOD)
- `CCDoc` -> `CCDOC1` (GECODEMP, CCDRUT, CCDTDOC, CCDNDOC)
- `DetEP` -> `DetEP1` (GECODEMP, EPAGNum, DEPnum)
- `EstadoPago` -> `EstadoPago1` (GECODEMP, EPAGNum)
- `PagosDoc` -> `PagosDocDet` (GECODEMP, PAGDRUT, PAGDTIPO, PAGDNDOCPAGO)
- `FactVentas` -> `FactVentasDet` (GECODEMP, CODTIPDOC, FVNumDoc)
- `TiposE` -> `TiposE1` (GECODEMP, TipECod)
- `MATipoDoc` -> `MATipoDoc1` (GECODEMP, CODTIPDOC)
- `MTPROV` -> `MTPROVSuc` (GECODEMP, MPRUT)
- `Anticipos` -> `AnticiposAnt1` (GECODEMP, AntAA, AntMM, TAntCod)
- `Anticipos` -> `AnticiposAnt1` (GECODEMP, AntAA, AntMM, TAntCod)
- `Anticipos` -> `AnticiposAnt1` (GECODEMP, AntAA, AntMM, TAntCod)
- `ContAC` -> `ContACCAC1` (GECODEMP, PERCod, TAntCod, CACNum)
- `Cargo` -> `CargoSCar` (GECODEMP, CarID)
- `Asistencia` -> `AsistenciaAsis1` (GECODEMP, AsisAA, AsisMM, PERCod)
- `CobrosIOM` -> `CobrosIOMDet` (GECODEMP, ENTRUT, COBCC1, COBID)
- `ING_IOM` -> `IOMPerAsis` (GECODEMP, IOMNUM)
- `ING_IOM` -> `IOMInfPab` (GECODEMP, IOMNUM)
- `IOMInfRea` -> `IOMMante00` (GECODEMP, IOMNUM, INFNum)
- `Personal` -> `PersMatrizlog` (GECODEMP, PERCod)
- `BitMan` -> `BitManM1` (GECODEMP, VEHPATENTE, BitMCorr)
- `BitRecDet` -> `BitPerPPer` (GECODEMP, BitRAA, BitRMM, VEHPATENTE, BitR1Cor)
- `BitRec` -> `BitRecDet` (GECODEMP, BitRAA, BitRMM, VEHPATENTE)
- `CargosRec` -> `CargosRec1` (GECODEMP, CARRAA, CARRMM, VEHPATENTE, CARRFECHA)
- `CargosRec` -> `CargosRec1` (GECODEMP, CARRAA, CARRMM, VEHPATENTE, CARRFECHA)
- `RevFac_Gui` -> `RevFac_GuiRev1` (GECODEMP, REVRUT, CCODTIPDOC, REVNDOC)
- `TipMan` -> `TipMan1` (GECODEMP, MANCOD)
- `CCPaGNF` -> `CCPaGNFCCNF1` (GECODEMP, ENTRUT, CCNFCC1, CCNFID)
- `PAGNoFac` -> `PAGNoFacPNF1` (GECODEMP, ENTRUT, PNFTipo, PNFNTipo, PNFNum)
- `VACONS01` -> `VACONS01VA1` (GECODEMP, VAPercod)
- `VAIngSolicit` -> `VASolicitVT1` (GECODEMP, VTONsol)
- `cpevaluacion` -> `cpevaluacionLevel1` (GECODEMP, InstCod)
- `cpevaluacion` -> `cpevaluacionLevel1` (GECODEMP, InstCod)
- `DetEP` -> `DetEP1` (GECODEMP, EPAGNum, DEPnum)
- `IOMVirPan` -> `IOMVirVir` (GECODEMP, VirID, VirIOM)
- `ParCobros` -> `ParCobrosFechas` (GECODEMP, PCOBCod)
- `FlujosNiv` -> `FlujosNivFL1` (GECODEMP, TFLCod, FL0Cod)
- `MSucBod` -> `MSucBodDet` (GECODEMP, MSBsuc, MSBBod, MSBNdoc, MSBRut, MSBTDoc)
- `FactVentas` -> `FactVentasDet` (GECODEMP, CODTIPDOC, FVNumDoc)
- `FactVentas` -> `FactVentasDet` (GECODEMP, CODTIPDOC, FVNumDoc)
- `MOVMAS` -> `MOVMASFam` (GECODEMP, MVMID)
- `OrdComp` -> `OrdCompDet` (GECODEMP, OrdNum, OrdRut)
- `BodCent` -> `BodCentDet` (GECODEMP, BCNdoc, BCTDoc, BCRutP)
- `MSucBod` -> `MSucBodDet` (GECODEMP, MSBsuc, MSBBod, MSBNdoc, MSBRut, MSBTDoc)
- `MSucBod` -> `MSucBodDet` (GECODEMP, MSBsuc, MSBBod, MSBNdoc, MSBRut, MSBTDoc)
- `BodCent` -> `BodCentDet` (GECODEMP, BCNdoc, BCTDoc, BCRutP)
- `MSucBod` -> `MSucBodDet` (GECODEMP, MSBsuc, MSBBod, MSBNdoc, MSBRut, MSBTDoc)
- `TiposE` -> `TiposE1` (GECODEMP, TipECod)
- `OrdComp` -> `OrdCompDet` (GECODEMP, OrdNum, OrdRut)
- `OrdComp` -> `OrdCompDet` (GECODEMP, OrdNum, OrdRut)
- `DesOC` -> `DesOCDet` (GECODEMP, DOCNum, DOCRut, DOCFam, DOCGru, DOCArt)
- `OrdComp` -> `OrdCompDet` (GECODEMP, OrdNum, OrdRut)
- `OrdComp` -> `OrdCompDet` (GECODEMP, OrdNum, OrdRut)
- `GuiasD` -> `GuiasDDet` (GECODEMP, GDSuc, GDBod, GDTdoc, GDNumI)
- `SolComp` -> `SolCompDet` (GECODEMP, SComNum)
- `SComObs` -> `SComObsDet` (GECODEMP, SComProc, SComNum, SCOCorr)
- `CC_Cuenta` -> `CC_CuentaC2` (C1Cemp)
- `SolCon` -> `SolConDet` (GECODEMP, SolSuc, SolNum, SolRut)
- `SolCon` -> `SolConDet` (GECODEMP, SolSuc, SolNum, SolRut)
- `SolCon` -> `SolConDet` (GECODEMP, SolSuc, SolNum, SolRut)
- `SolCon` -> `SolConDet` (GECODEMP, SolSuc, SolNum, SolRut)
- `POMaeAr` -> `POMaeArDet` (GECODEMP, SucCod, BodCod, PosCod)

Estas 67 relaciones provienen directamente de la estructura de las transacciones GeneXus. Ademas, 32 tablas fisicas son reutilizadas por mas de una vista transaccional; no representan tablas duplicadas. El archivo `relations-candidates.csv` contiene asociaciones inferidas por reutilizacion de llaves GeneXus y requiere validacion contra reglas o SQL Server.

## Controles de consistencia

- Todas las tablas se vincularon a un nivel de transaccion.
- Todos los niveles tienen una tabla fisica declarada en el XPZ.
- Todos los niveles se asociaron sin ambiguedad por nombre o llave.
- Todas las tablas tienen llave primaria GeneXus.
- Todos los atributos usados tienen definicion global.
- Todos los atributos usados resuelven tipo base o dominio.
- Los nombres de tabla respetan el limite configurado de 30 caracteres.
- Atributos sobre el limite de 30 caracteres: **2** (`MenuItemShowDeveloperMenuOption`, `SecParentFunctionalityDescription`).

## Estado del contraste fisico

Se contrasto directamente `BDAPERP` en `DESKTOP-SOOAP92\SQLEXPRESS`, mediante consultas de metadatos sin DDL ni DML. Sus archivos son `C:\BD\BDAPERP.mdf` y `C:\BD\BDAPERP_log.ldf`, de 75,497,472 bytes cada uno. El resultado sigue siendo **NO EQUIVALENTE** al XPZ actual:

- 163 tablas SQL frente a 218 del modelo; 160 coinciden por nombre (73.4% de cobertura).
- El area `bod` es la brecha central: solo 6 de 62 tablas coinciden y faltan 56.
- Las demas areas tienen cobertura de nombres completa, salvo `AMaeG`, donde faltan 2 tablas.
- En las tablas coincidentes faltan 333 columnas, hay 8 columnas adicionales, 10 diferencias de familia de tipo y 4 llaves primarias distintas.
- Solo 72 tablas no presentan diferencias bajo los controles estructurales aplicados.
- `MSUCBOD1`, `ORDCOMP1` y `SOLCON1` parecen nombres historicos de los niveles actuales `MSucBodDet`, `OrdCompDet` y `SolConDet`.

El informe vigente y los inventarios fisicos estan en [`sql-instance-bdaperp-20260802/README.md`](sql-instance-bdaperp-20260802/README.md). El estudio previo de la copia pequena de diciembre de 2025 se conserva en [`sql-local-20251231/README.md`](sql-local-20251231/README.md) como referencia historica.

## Archivos generados

- `model-summary.json`: resumen verificable y controles.
- `objects.csv`: inventario completo de objetos y clasificacion framework/aplicacion.
- `transactions.csv`: transacciones, area y niveles.
- `tables.csv`: tablas, llaves, indices y jerarquia.
- `table-columns.csv`: columnas logicas por tabla, incluidas llaves heredadas de niveles superiores.
- `attributes.csv`, `domains.csv`, `subtypes.csv`: diccionarios del modelo. Cuando el XPZ omite el tipo base explicito, se registra el valor predeterminado GeneXus `Numeric`.
- `relations-confirmed.csv`: relaciones padre-hijo confirmadas por niveles GeneXus.
- `relations-candidates.csv`: relaciones candidatas que aun no deben tratarse como constraints confirmados.
- `sql-instance-bdaperp-20260802/`: contraste directo de `BDAPERP` en la instancia local.
- `sql-local-20251231/`: contraste fisico de la base local, diferencias por tabla/columna e inventario SQL Server.
