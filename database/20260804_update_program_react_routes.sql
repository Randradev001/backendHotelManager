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
