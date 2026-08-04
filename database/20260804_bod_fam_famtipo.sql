USE [BDAPERP];
GO

-- bod.FamTipo (GX): maestro nivel 1, clave GECODEMP + FamTCod.
IF OBJECT_ID(N'dbo.FamTipo', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.FamTipo (
    GECODEMP NUMERIC(10, 0) NOT NULL,
    FamTCod NUMERIC(4, 0) NOT NULL,
    FamTDescrip VARCHAR(25) NOT NULL,
    CONSTRAINT PK_FamTipo PRIMARY KEY (GECODEMP, FamTCod)
  );
END;
GO

-- bod.Fam (GX): maestro nivel 1. FamTDescrip se conserva como atributo fisico GX.
IF OBJECT_ID(N'dbo.Fam', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Fam (
    GECODEMP NUMERIC(10, 0) NOT NULL,
    FamFam NUMERIC(3, 0) NOT NULL,
    FamDesc VARCHAR(45) NOT NULL,
    FamEQ NUMERIC(2, 0) NULL,
    FamTCod NUMERIC(4, 0) NOT NULL,
    FamTDescrip VARCHAR(25) NULL,
    CONSTRAINT PK_Fam PRIMARY KEY (GECODEMP, FamFam)
  );

  CREATE INDEX IX_Fam_Empresa_Tipo ON dbo.Fam (GECODEMP, FamTCod);
END;
GO
