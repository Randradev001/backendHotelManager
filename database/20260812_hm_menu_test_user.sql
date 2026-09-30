/*
  HM Hotel Manager - initial menu registration for the test user identified
  by RUT 14.332.241-6. The access is direct and limited to that user's active
  hotel accounts; it does not expand permissions for other ADMINFULL users.
*/
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @SistCod NUMERIC(4, 0) = 40;
DECLARE @ModCod NUMERIC(3, 0) = 1;
DECLARE @Rut NUMERIC(9, 0) = 14332241;

IF NOT EXISTS (SELECT 1 FROM dbo.SISTEMAS WHERE SistCod = @SistCod)
  INSERT INTO dbo.SISTEMAS (SistCod, SistNombre, SistFecCrea, SistFAIcons)
  VALUES (@SistCod, 'Hotel Manager', CAST(GETDATE() AS date), 'hotel');

IF NOT EXISTS (SELECT 1 FROM dbo.MODULOS WHERE SistCod = @SistCod AND Modcod = @ModCod)
  INSERT INTO dbo.MODULOS (SistCod, Modcod, ModDes, ModTipo, Modprg, ModFcrea, ModFAIcons)
  VALUES (@SistCod, @ModCod, 'Maintenance', 1, 'HM', CAST(GETDATE() AS date), 'tool');

DECLARE @Programs TABLE (
  ProgCod NUMERIC(3, 0) NOT NULL PRIMARY KEY,
  ProgDes VARCHAR(35) NOT NULL,
  ProgNomGX VARCHAR(100) NOT NULL
);

INSERT INTO @Programs (ProgCod, ProgDes, ProgNomGX)
VALUES
  (1, 'Operations Dashboard', '/hotel-manager/dashboard'),
  (2, 'Work Orders', '/hotel-manager/work-orders'),
  (3, 'Locations', '/hotel-manager/locations'),
  (4, 'Maintenance Categories', '/hotel-manager/categories'),
  (5, 'Assets', '/hotel-manager/assets');

INSERT INTO dbo.PROGRAM (SistCod, Modcod, ProgCod, ProgDes, ProgFcrea, ProgTipo, ProgNomGX, ProgIDmenu, ProgTarget)
SELECT @SistCod, @ModCod, P.ProgCod, P.ProgDes, CAST(GETDATE() AS date), 1, P.ProgNomGX, ' ', ' '
FROM @Programs P
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.PROGRAM X
  WHERE X.SistCod = @SistCod AND X.Modcod = @ModCod AND X.ProgCod = P.ProgCod
);

/* Keep names and React routes correct if the script is applied again. */
UPDATE P
SET ProgDes = X.ProgDes,
    ProgNomGX = X.ProgNomGX,
    ProgTipo = 1
FROM dbo.PROGRAM P
INNER JOIN @Programs X ON X.ProgCod = P.ProgCod
WHERE P.SistCod = @SistCod AND P.Modcod = @ModCod;

DECLARE @Users TABLE (
  GECODEMP DECIMAL(10, 0) NOT NULL,
  UsuLogin VARCHAR(10) NOT NULL,
  PRIMARY KEY (GECODEMP, UsuLogin)
);

INSERT INTO @Users (GECODEMP, UsuLogin)
SELECT U.GECODEMP, RTRIM(U.UsuLogin)
FROM dbo.USUARIOS U
WHERE U.UsuRut = @Rut
  AND U.UsuEstado = 1;

IF NOT EXISTS (SELECT 1 FROM @Users)
  THROW 50001, 'No active user was found for RUT 14.332.241-6.', 1;

INSERT INTO dbo.ASIGSIST (GECODEMP, AsgSisLogin, SistCod)
SELECT U.GECODEMP, U.UsuLogin, @SistCod
FROM @Users U
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.ASIGSIST A
  WHERE A.GECODEMP = U.GECODEMP AND RTRIM(A.AsgSisLogin) = U.UsuLogin AND A.SistCod = @SistCod
);

INSERT INTO dbo.ASIG (GECODEMP, AsigUsu, SistCod, AsigMod, AsigAsig)
SELECT U.GECODEMP, U.UsuLogin, @SistCod, @ModCod, U.UsuLogin
FROM @Users U
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.ASIG A
  WHERE A.GECODEMP = U.GECODEMP AND RTRIM(A.AsigUsu) = U.UsuLogin
    AND A.SistCod = @SistCod AND A.AsigMod = @ModCod
);

INSERT INTO dbo.ASIGPROG (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgUsuC)
SELECT U.GECODEMP, U.UsuLogin, @SistCod, @ModCod, P.ProgCod, U.UsuLogin
FROM @Users U
CROSS JOIN @Programs P
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.ASIGPROG A
  WHERE A.GECODEMP = U.GECODEMP AND RTRIM(A.UsuLogin) = U.UsuLogin
    AND A.SistCod = @SistCod AND A.Modcod = @ModCod AND A.ProgCod = P.ProgCod
);

COMMIT TRANSACTION;

SELECT U.GECODEMP, U.UsuLogin, P.ProgCod, P.ProgDes, P.ProgNomGX
FROM @Users U
INNER JOIN dbo.ASIGPROG A
  ON A.GECODEMP = U.GECODEMP AND RTRIM(A.UsuLogin) = U.UsuLogin
INNER JOIN dbo.PROGRAM P
  ON P.SistCod = A.SistCod AND P.Modcod = A.Modcod AND P.ProgCod = A.ProgCod
WHERE A.SistCod = @SistCod AND A.Modcod = @ModCod
ORDER BY U.GECODEMP, P.ProgCod;
