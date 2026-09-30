USE HotelManagerDB;
GO
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
DECLARE @Hotels TABLE(EmpCod DECIMAL(10,0) PRIMARY KEY);
INSERT @Hotels VALUES(6002),(6101),(6102),(6103),(6104),(6105),(6106);
DECLARE @Workers TABLE(Login VARCHAR(10) PRIMARY KEY,FullName VARCHAR(35),Email VARCHAR(80));
INSERT @Workers VALUES
('RANDRADE','Remigio Andres Andrade','remigio.andrade@hotelmanager.test'),
('ERWIN','Erwin','erwin@hotelmanager.test'),
('GREG','Greg','greg@hotelmanager.test'),
('RLCruz','Ron Lemuel Cruz','ron.lemuel.cruz@hotelmanager.test'),
('RWCruz','Ronwell Cruz','ronwell.cruz@hotelmanager.test'),
('JOSE','Jose','jose@hotelmanager.test');

INSERT dbo.USUARIOS(GECODEMP,UsuLogin,UsuClave,Usunom,UsuCargo,usucrea,UsuCorreo,UsuEstado,UsuPerfil,UsuTipo)
SELECT H.EmpCod,UPPER(W.Login),'HmWork26!',W.FullName,'Maintenance Technician','AANDRADE',W.Email,1,'TECHNICIAN',1
FROM @Hotels H CROSS JOIN @Workers W
WHERE NOT EXISTS(SELECT 1 FROM dbo.USUARIOS U WHERE U.GECODEMP=H.EmpCod AND RTRIM(U.UsuLogin)=UPPER(W.Login));

IF NOT EXISTS(SELECT 1 FROM dbo.UROLES WHERE ROLCod='TECHNICIAN')
 INSERT dbo.UROLES(ROLCod,ROLNombre,ROLFCrea,ROLUCrea) VALUES('TECHNICIAN','Maintenance technicians',SYSUTCDATETIME(),'AANDRADE');
INSERT dbo.URolesPorUser(GECODEMP,UsuLogin,ROLCod,RXUFecCrea)
SELECT H.EmpCod,UPPER(W.Login),'TECHNICIAN',SYSUTCDATETIME() FROM @Hotels H CROSS JOIN @Workers W
WHERE NOT EXISTS(SELECT 1 FROM dbo.URolesPorUser R WHERE R.GECODEMP=H.EmpCod AND RTRIM(R.UsuLogin)=UPPER(W.Login) AND R.ROLCod='TECHNICIAN');

/* Role-level Hotel Manager access, inherited in every hotel through GECODEMP=0. */
IF NOT EXISTS(SELECT 1 FROM dbo.ASIGSIST WHERE GECODEMP=0 AND AsgSisLogin='TECHNICIAN' AND SistCod=40) INSERT dbo.ASIGSIST VALUES(0,'TECHNICIAN',40);
IF NOT EXISTS(SELECT 1 FROM dbo.ASIG WHERE GECODEMP=0 AND AsigUsu='TECHNICIAN' AND SistCod=40 AND AsigMod=1) INSERT dbo.ASIG VALUES(0,'TECHNICIAN',40,1,'AANDRADE');
INSERT dbo.ASIGPROG(GECODEMP,UsuLogin,SistCod,Modcod,ProgCod,ProgUsuC)
SELECT 0,'TECHNICIAN',40,1,P.ProgCod,'AANDRADE' FROM dbo.PROGRAM P
WHERE P.SistCod=40 AND P.Modcod=1 AND P.ProgCod IN(1,2,6)
AND NOT EXISTS(SELECT 1 FROM dbo.ASIGPROG A WHERE A.GECODEMP=0 AND A.UsuLogin='TECHNICIAN' AND A.SistCod=40 AND A.Modcod=1 AND A.ProgCod=P.ProgCod);
GO
