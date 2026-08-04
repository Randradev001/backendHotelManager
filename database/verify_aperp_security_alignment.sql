/* Verificacion reproducible y sin cambios de datos para Seguridad APERP. */
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.VW_APERP_SEG_EMPRESAS', N'V') IS NULL
   OR OBJECT_ID(N'dbo.VW_APERP_SEG_USUARIOS', N'V') IS NULL
   OR OBJECT_ID(N'dbo.SEGUSUCRED', N'U') IS NULL
   OR OBJECT_ID(N'dbo.SEGSESION', N'U') IS NULL
  THROW 50101, 'Faltan objetos de la adaptacion de Seguridad APERP.', 1;

IF COL_LENGTH(N'dbo.SEGUSUCRED', N'GECODEMP') IS NULL
   OR COL_LENGTH(N'dbo.SEGSESION', N'GECODEMP') IS NULL
  THROW 50102, 'Credenciales o sesiones no estan aisladas por GECODEMP.', 1;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes I
  INNER JOIN sys.index_columns IC
    ON IC.object_id=I.object_id AND IC.index_id=I.index_id
  INNER JOIN sys.columns C
    ON C.object_id=IC.object_id AND C.column_id=IC.column_id
  WHERE I.object_id=OBJECT_ID(N'dbo.SEGUSUCRED')
    AND I.is_primary_key=1 AND IC.key_ordinal=1 AND C.name=N'GECODEMP'
) OR NOT EXISTS (
  SELECT 1
  FROM sys.indexes I
  INNER JOIN sys.index_columns IC
    ON IC.object_id=I.object_id AND IC.index_id=I.index_id
  INNER JOIN sys.columns C
    ON C.object_id=IC.object_id AND C.column_id=IC.column_id
  WHERE I.object_id=OBJECT_ID(N'dbo.SEGUSUCRED')
    AND I.is_primary_key=1 AND IC.key_ordinal=2 AND C.name=N'UsuLogin'
)
  THROW 50103, 'SEGUSUCRED no tiene llave primaria (GECODEMP, UsuLogin).', 1;

IF (SELECT COUNT_BIG(*) FROM dbo.VW_APERP_SEG_EMPRESAS)
   <> (SELECT COUNT_BIG(*) FROM dbo.g_emp)
  THROW 50104, 'La vista de empresas no equivale a g_emp.', 1;

IF (SELECT COUNT_BIG(*) FROM dbo.VW_APERP_SEG_USUARIOS)
   <> (SELECT COUNT_BIG(*) FROM dbo.Usuarios)
  THROW 50105, 'La vista de usuarios no equivale a Usuarios.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.UROLES WHERE RTRIM(ROLCod)=N'ADMINFULL')
  THROW 50106, 'No existe el rol administrador ADMINFULL.', 1;

DECLARE @Huerfanos bigint =
  (SELECT COUNT_BIG(*) FROM dbo.AsigSist A LEFT JOIN dbo.Usuarios U
     ON U.GECODEMP=A.GECODEMP AND U.UsuLogin=A.AsgSisLogin
   WHERE A.GECODEMP<>0 AND U.UsuLogin IS NULL)
  + (SELECT COUNT_BIG(*) FROM dbo.Asig A LEFT JOIN dbo.Usuarios U
       ON U.GECODEMP=A.GECODEMP AND U.UsuLogin=A.AsigUsu
     WHERE A.GECODEMP<>0 AND U.UsuLogin IS NULL)
  + (SELECT COUNT_BIG(*) FROM dbo.AsigProg A LEFT JOIN dbo.Usuarios U
       ON U.GECODEMP=A.GECODEMP AND U.UsuLogin=A.UsuLogin
     WHERE A.GECODEMP<>0 AND U.UsuLogin IS NULL)
  + (SELECT COUNT_BIG(*) FROM dbo.AsigProg1 A LEFT JOIN dbo.Usuarios U
       ON U.GECODEMP=A.GECODEMP AND U.UsuLogin=A.UsuLogin
     WHERE A.GECODEMP<>0 AND U.UsuLogin IS NULL)
  + (SELECT COUNT_BIG(*) FROM dbo.URolesPorUser A LEFT JOIN dbo.Usuarios U
       ON U.GECODEMP=A.GECODEMP AND U.UsuLogin=A.UsuLogin
     WHERE U.UsuLogin IS NULL);

IF @Huerfanos<>0
  THROW 50107, 'Existen asignaciones directas o roles sin usuario en su empresa.', 1;

SELECT
  DB_NAME() AS BaseDatos,
  (SELECT COUNT_BIG(*) FROM dbo.VW_APERP_SEG_EMPRESAS) AS Empresas,
  (SELECT COUNT_BIG(*) FROM dbo.VW_APERP_SEG_USUARIOS) AS UsuariosEmpresa,
  (SELECT COUNT_BIG(*) FROM dbo.SEGUSUCRED) AS CredencialesModernas,
  (SELECT COUNT_BIG(*) FROM dbo.SEGSESION WHERE Revocada=0 AND FechaExpiracion>SYSUTCDATETIME()) AS SesionesActivas,
  (SELECT COUNT_BIG(*) FROM dbo.URolesPorUser) AS RolesAsignados,
  (SELECT COUNT_BIG(*) FROM dbo.AsigProg WHERE GECODEMP<>0) AS ProgramasDirectos,
  (SELECT COUNT_BIG(*) FROM dbo.AsigProg WHERE GECODEMP=0) AS ProgramasPlantilla,
  N'OK' AS Resultado;
