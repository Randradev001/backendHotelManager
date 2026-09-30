/*
  Test-only HM Hotel Manager hotel and account.
  The user is granted only the initial Hotel Manager menu hierarchy.
*/
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @EmpCod DECIMAL(10, 0) = 6002;
DECLARE @Rut INT = 17526007;
DECLARE @Dv NCHAR(1) = N'2';
DECLARE @Login NCHAR(10) = N'AANDRADE';
DECLARE @TemporaryPassword NCHAR(10) = N'HmTest26!';
DECLARE @Actor NCHAR(10) = N'MIGRACION';
DECLARE @SistCod NUMERIC(4, 0) = 40;
DECLARE @ModCod NUMERIC(3, 0) = 1;

IF EXISTS (SELECT 1 FROM dbo.g_emp WHERE GECODEMP = @EmpCod AND GErut <> @Rut)
  THROW 50001, 'GECODEMP 6002 already belongs to a different hotel.', 1;

IF EXISTS (SELECT 1 FROM dbo.USUARIOS WHERE UsuRut = @Rut AND GECODEMP <> @EmpCod)
  THROW 50002, 'The test RUT is already assigned to another hotel account.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.SISTEMAS WHERE SistCod = @SistCod)
  THROW 50003, 'Hotel Manager menu system has not been registered.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.g_emp WHERE GECODEMP = @EmpCod)
BEGIN
  INSERT INTO dbo.g_emp (
    GECODEMP, GERAZSOC, GerazSMS, GEgiro1, GEgiro2, GEfonNum, GErut, GEDv,
    GEdire, GEregion, GEciudad, GeComuna, GeCordinador, geCorreo, GeEstado,
    GeLogo, GePaginaWeb, GeFecContIni, GeFecContFin
  )
  VALUES (
    @EmpCod, N'HM Test Hotel - Andres Andrade', N'HM Test Hotel', N'Hotel Management', NULL, 0, @Rut, @Dv,
    N'Winnipeg, Manitoba', N'Manitoba', N'Winnipeg', N'Winnipeg', N'Andres Andrade Vargas', N'andres.andrade@hotelmanager.test', 1,
    0x, N'.', CAST(GETDATE() AS date), DATEADD(year, 1, CAST(GETDATE() AS date))
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.USUARIOS WHERE GECODEMP = @EmpCod AND RTRIM(UsuLogin) = RTRIM(@Login))
BEGIN
  INSERT INTO dbo.USUARIOS (
    GECODEMP, UsuLogin, UsuClave, UsuRut, UsuDV, Usunom, UsuCargo, usucrea,
    UsuCorreo, UsuEstado, UsuPerfil, UsuTipo, usuFecCrea
  )
  VALUES (
    @EmpCod, @Login, @TemporaryPassword, @Rut, @Dv, N'Andres Andrade Vargas', N'Hotel Manager Tester', @Actor,
    N'andres.andrade@hotelmanager.test', 1, N'HMTEST', 1, GETDATE()
  );
END;

/* Reset prior sessions so the new direct permissions are read at next login. */
UPDATE dbo.SEGSESION
SET Revocada = 1
WHERE GECODEMP = @EmpCod AND RTRIM(UsuLogin) = RTRIM(@Login) AND Revocada = 0;

IF NOT EXISTS (SELECT 1 FROM dbo.ASIGSIST WHERE GECODEMP = @EmpCod AND RTRIM(AsgSisLogin) = RTRIM(@Login) AND SistCod = @SistCod)
  INSERT INTO dbo.ASIGSIST (GECODEMP, AsgSisLogin, SistCod) VALUES (@EmpCod, @Login, @SistCod);

IF NOT EXISTS (SELECT 1 FROM dbo.ASIG WHERE GECODEMP = @EmpCod AND RTRIM(AsigUsu) = RTRIM(@Login) AND SistCod = @SistCod AND AsigMod = @ModCod)
  INSERT INTO dbo.ASIG (GECODEMP, AsigUsu, SistCod, AsigMod, AsigAsig) VALUES (@EmpCod, @Login, @SistCod, @ModCod, @Actor);

INSERT INTO dbo.ASIGPROG (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgUsuC)
SELECT @EmpCod, @Login, @SistCod, @ModCod, P.ProgCod, @Actor
FROM dbo.PROGRAM P
WHERE P.SistCod = @SistCod AND P.Modcod = @ModCod AND P.ProgTipo = 1
  AND NOT EXISTS (
    SELECT 1 FROM dbo.ASIGPROG A
    WHERE A.GECODEMP = @EmpCod AND RTRIM(A.UsuLogin) = RTRIM(@Login)
      AND A.SistCod = @SistCod AND A.Modcod = @ModCod AND A.ProgCod = P.ProgCod
  );

COMMIT TRANSACTION;

SELECT E.GECODEMP, RTRIM(E.GERAZSOC) AS Hotel, RTRIM(U.UsuLogin) AS Login, RTRIM(U.Usunom) AS UserName,
       U.UsuRut, RTRIM(U.UsuDV) AS UsuDV, U.UsuEstado,
       (SELECT COUNT(*) FROM dbo.ASIGPROG A WHERE A.GECODEMP = @EmpCod AND RTRIM(A.UsuLogin) = RTRIM(@Login) AND A.SistCod = @SistCod) AS HMPrograms
FROM dbo.g_emp E
INNER JOIN dbo.USUARIOS U ON U.GECODEMP = E.GECODEMP AND RTRIM(U.UsuLogin) = RTRIM(@Login)
WHERE E.GECODEMP = @EmpCod;
