/*
  Soporte aditivo para la Seguridad React/Node sobre el modelo APERP.

  - Conserva Usuarios(GECODEMP, UsuLogin) y g_emp(GECODEMP).
  - Las vistas son contratos de lectura, no sustitutos actualizables.
  - Credenciales y sesiones quedan aisladas por empresa.
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.g_emp', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Usuarios', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AsigSist', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Asig', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AsigProg', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AsigProg1', N'U') IS NULL
   OR OBJECT_ID(N'dbo.UROLES', N'U') IS NULL
   OR OBJECT_ID(N'dbo.URolesPorUser', N'U') IS NULL
BEGIN
  THROW 50001, 'La base seleccionada no corresponde al modelo de Seguridad APERP esperado.', 1;
END;

IF COL_LENGTH(N'dbo.Usuarios', N'GECODEMP') IS NULL
   OR COL_LENGTH(N'dbo.Usuarios', N'UsuLogin') IS NULL
BEGIN
  THROW 50002, 'Usuarios no conserva la llave multiempresa GECODEMP, UsuLogin.', 1;
END;

IF OBJECT_ID(N'dbo.SEGUSUCRED', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.SEGUSUCRED', N'GECODEMP') IS NULL
BEGIN
  THROW 50003, 'SEGUSUCRED existe con un contrato no compatible con APERP.', 1;
END;

IF OBJECT_ID(N'dbo.SEGSESION', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.SEGSESION', N'GECODEMP') IS NULL
BEGIN
  THROW 50004, 'SEGSESION existe con un contrato no compatible con APERP.', 1;
END;

BEGIN TRANSACTION;

EXEC(N'
CREATE OR ALTER VIEW dbo.VW_APERP_SEG_EMPRESAS
AS
SELECT
  GECODEMP,
  RTRIM(GERAZSOC) AS EmpNom,
  GERAZSOC,
  GErut,
  GEDv,
  GEdire,
  geCorreo,
  GeEstado
FROM dbo.g_emp;
');

EXEC(N'
CREATE OR ALTER VIEW dbo.VW_APERP_SEG_USUARIOS
AS
SELECT
  GECODEMP,
  UsuLogin,
  UsuClave,
  UsuRut,
  UsuDV,
  Usunom,
  UsuCargo,
  usucrea,
  UsuCorreo,
  UsuEstado,
  UsuPerfil,
  UsuTipo,
  usuFecCrea,
  CAST(0 AS smallint) AS UsuNseg,
  CAST(NULL AS datetime) AS UsuExpira
FROM dbo.Usuarios;
');

IF OBJECT_ID(N'dbo.SEGUSUCRED', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SEGUSUCRED (
    GECODEMP decimal(10,0) NOT NULL,
    UsuLogin nchar(10) NOT NULL,
    PasswordSalt varchar(64) NOT NULL,
    PasswordHash varchar(256) NOT NULL,
    MigradoDesdeGX bit NOT NULL CONSTRAINT DF_APERP_SEGUSUCRED_Migrado DEFAULT (0),
    FechaCambio datetime2(0) NOT NULL CONSTRAINT DF_APERP_SEGUSUCRED_Fecha DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_APERP_SEGUSUCRED PRIMARY KEY (GECODEMP, UsuLogin),
    CONSTRAINT FK_APERP_SEGUSUCRED_Usuarios FOREIGN KEY (GECODEMP, UsuLogin)
      REFERENCES dbo.Usuarios (GECODEMP, UsuLogin)
  );
END;

IF OBJECT_ID(N'dbo.SEGSESION', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SEGSESION (
    TokenHash varchar(64) NOT NULL,
    GECODEMP decimal(10,0) NOT NULL,
    UsuLogin nchar(10) NOT NULL,
    FechaCreacion datetime2(0) NOT NULL,
    FechaExpiracion datetime2(0) NOT NULL,
    UltimoUso datetime2(0) NOT NULL,
    Revocada bit NOT NULL CONSTRAINT DF_APERP_SEGSESION_Revocada DEFAULT (0),
    CONSTRAINT PK_APERP_SEGSESION PRIMARY KEY (TokenHash),
    CONSTRAINT FK_APERP_SEGSESION_Usuarios FOREIGN KEY (GECODEMP, UsuLogin)
      REFERENCES dbo.Usuarios (GECODEMP, UsuLogin)
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.SEGSESION') AND name=N'IX_APERP_SEGSESION_Usuario'
)
  CREATE INDEX IX_APERP_SEGSESION_Usuario
    ON dbo.SEGSESION (GECODEMP, UsuLogin, Revocada, FechaExpiracion);

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id=OBJECT_ID(N'dbo.Usuarios') AND name=N'IX_APERP_Usuarios_Rut'
)
  CREATE INDEX IX_APERP_Usuarios_Rut ON dbo.Usuarios (UsuRut, GECODEMP);

IF NOT EXISTS (SELECT 1 FROM dbo.UROLES WHERE RTRIM(ROLCod)=N'ADMINFULL')
BEGIN
  INSERT INTO dbo.UROLES (ROLCod, ROLNombre, ROLFCrea, ROLUCrea)
  VALUES (N'ADMINFULL', N'Administrador acceso completo', GETDATE(), N'MIGRACION');
END;

COMMIT TRANSACTION;

SELECT
  DB_NAME() AS BaseDatos,
  (SELECT COUNT(*) FROM dbo.VW_APERP_SEG_EMPRESAS) AS Empresas,
  (SELECT COUNT(*) FROM dbo.VW_APERP_SEG_USUARIOS) AS UsuariosEmpresa,
  (SELECT COUNT(*) FROM dbo.UROLES) AS Roles,
  (SELECT COUNT(*) FROM dbo.AsigProg WHERE GECODEMP<>0) AS ProgramasDirectos,
  (SELECT COUNT(*) FROM dbo.AsigProg WHERE GECODEMP=0) AS ProgramasPlantilla;

