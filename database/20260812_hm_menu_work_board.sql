SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @SistCod NUMERIC(4,0)=40, @ModCod NUMERIC(3,0)=1, @ProgCod NUMERIC(3,0)=6;
IF NOT EXISTS(SELECT 1 FROM dbo.PROGRAM WHERE SistCod=@SistCod AND Modcod=@ModCod AND ProgCod=@ProgCod)
  INSERT dbo.PROGRAM(SistCod,Modcod,ProgCod,ProgDes,ProgFcrea,ProgTipo,ProgNomGX,ProgIDmenu,ProgTarget) VALUES(@SistCod,@ModCod,@ProgCod,'Work Board',CAST(GETDATE() AS date),1,'/hotel-manager/work-board',' ',' ');
UPDATE dbo.PROGRAM SET ProgDes='Work Board',ProgNomGX='/hotel-manager/work-board',ProgTipo=1 WHERE SistCod=@SistCod AND Modcod=@ModCod AND ProgCod=@ProgCod;
INSERT dbo.ASIGPROG(GECODEMP,UsuLogin,SistCod,Modcod,ProgCod,ProgUsuC)
SELECT A.GECODEMP,A.UsuLogin,@SistCod,@ModCod,@ProgCod,'MIGRACION' FROM dbo.ASIGPROG A
WHERE A.SistCod=@SistCod AND A.Modcod=@ModCod AND A.ProgCod=2 AND NOT EXISTS(SELECT 1 FROM dbo.ASIGPROG X WHERE X.GECODEMP=A.GECODEMP AND X.UsuLogin=A.UsuLogin AND X.SistCod=@SistCod AND X.Modcod=@ModCod AND X.ProgCod=@ProgCod);
COMMIT TRANSACTION;
