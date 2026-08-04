USE [BDAPERP];
GO

/*
  Registra las opciones React para bod.FamTipo y bod.Fam en el menú APERP.
  Destino confirmado en la base actual: SISTEMAS=1 / MODULOS=1 (Seguridad).
  Los programas se entregan al rol ADMINFULL mediante ASIGPROG con empresa 0.
*/
DECLARE @SistCod NUMERIC(4, 0) = 1;
DECLARE @Modcod NUMERIC(3, 0) = 1;
DECLARE @RoleLogin VARCHAR(10) = 'ADMINFULL';

IF NOT EXISTS (SELECT 1 FROM dbo.SISTEMAS WHERE SistCod = @SistCod)
  THROW 50001, 'No existe el sistema APERP (SistCod=1).', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.MODULOS WHERE SistCod = @SistCod AND Modcod = @Modcod)
  THROW 50002, 'No existe el módulo Seguridad (SistCod=1, Modcod=1).', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod = @SistCod AND Modcod = @Modcod AND ProgCod = 7)
BEGIN
  INSERT INTO dbo.PROGRAM (SistCod, Modcod, ProgCod, ProgDes, ProgFcrea, ProgTipo, ProgNomGX, ProgIDmenu, ProgTarget)
  VALUES (@SistCod, @Modcod, 7, 'Tipos de familia', CAST(GETDATE() AS date), 1, '/maestros-gx/tipos-familia', ' ', ' ');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod = @SistCod AND Modcod = @Modcod AND ProgCod = 8)
BEGIN
  INSERT INTO dbo.PROGRAM (SistCod, Modcod, ProgCod, ProgDes, ProgFcrea, ProgTipo, ProgNomGX, ProgIDmenu, ProgTarget)
  VALUES (@SistCod, @Modcod, 8, 'Familias de articulos', CAST(GETDATE() AS date), 1, '/maestros-gx/familias', ' ', ' ');
END;

/* Permite que los usuarios con rol ADMINFULL vean ambas opciones de inmediato. */
IF NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG WHERE GECODEMP = 0 AND UsuLogin = @RoleLogin AND SistCod = @SistCod AND Modcod = @Modcod AND ProgCod = 7)
  INSERT INTO dbo.ASIGPROG (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgUsuC)
  VALUES (0, @RoleLogin, @SistCod, @Modcod, 7, 'MIGRACION');

IF NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG WHERE GECODEMP = 0 AND UsuLogin = @RoleLogin AND SistCod = @SistCod AND Modcod = @Modcod AND ProgCod = 8)
  INSERT INTO dbo.ASIGPROG (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgUsuC)
  VALUES (0, @RoleLogin, @SistCod, @Modcod, 8, 'MIGRACION');
GO

/* Validación posterior a la ejecución. */
SELECT SistCod, Modcod, ProgCod, ProgDes, ProgNomGX, ProgTipo
FROM dbo.PROGRAM
WHERE SistCod = 1 AND Modcod = 1 AND ProgCod IN (7, 8)
ORDER BY ProgCod;
GO
