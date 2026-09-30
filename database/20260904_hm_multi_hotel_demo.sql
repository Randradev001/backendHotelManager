USE HotelManagerDB;
GO
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
IF OBJECT_ID('dbo.HMUSERHOTELACCESS','U') IS NULL
CREATE TABLE dbo.HMUSERHOTELACCESS(
  HomeEmpCod DECIMAL(10,0) NOT NULL, UsuLogin VARCHAR(10) NOT NULL, HotelEmpCod DECIMAL(10,0) NOT NULL,
  CanManage BIT NOT NULL DEFAULT(0), CreatedAt DATETIME2(0) NOT NULL DEFAULT(SYSUTCDATETIME()),
  CONSTRAINT PK_HMUSERHOTELACCESS PRIMARY KEY(HomeEmpCod,UsuLogin,HotelEmpCod),
  CONSTRAINT FK_HMUSERHOTELACCESS_User FOREIGN KEY(HomeEmpCod,UsuLogin) REFERENCES dbo.USUARIOS(GECODEMP,UsuLogin),
  CONSTRAINT FK_HMUSERHOTELACCESS_Hotel FOREIGN KEY(HotelEmpCod) REFERENCES dbo.g_emp(GECODEMP));
GO
IF COL_LENGTH('dbo.HMWORKORDERTASK','ParentTaskId') IS NULL ALTER TABLE dbo.HMWORKORDERTASK ADD ParentTaskId BIGINT NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_HMWORKORDERTASK_Parent')
 ALTER TABLE dbo.HMWORKORDERTASK ADD CONSTRAINT FK_HMWORKORDERTASK_Parent FOREIGN KEY(GECODEMP,ParentTaskId) REFERENCES dbo.HMWORKORDERTASK(GECODEMP,TaskId);
GO

DECLARE @Hotels TABLE(EmpCod DECIMAL(10,0),Name VARCHAR(100),City VARCHAR(50));
INSERT @Hotels VALUES
(6101,'Travelodge Brandon','Brandon'),(6102,'Courtis Winnipeg','Winnipeg'),(6103,'Travelodge Winnipeg','Winnipeg'),
(6104,'Clarion Lakeside','Winnipeg'),(6105,'Colonial Inn Brandon','Brandon'),(6106,'Keystone Brandon','Brandon');
INSERT dbo.g_emp(GECODEMP,GERAZSOC,GerazSMS,GEregion,GEciudad,GeComuna,GeEstado)
SELECT EmpCod,Name,Name,'Manitoba',City,City,1 FROM @Hotels h WHERE NOT EXISTS(SELECT 1 FROM dbo.g_emp e WHERE e.GECODEMP=h.EmpCod);
INSERT dbo.HMUSERHOTELACCESS(HomeEmpCod,UsuLogin,HotelEmpCod,CanManage)
SELECT 6002,'AANDRADE',EmpCod,1 FROM @Hotels h WHERE NOT EXISTS(SELECT 1 FROM dbo.HMUSERHOTELACCESS a WHERE a.HomeEmpCod=6002 AND a.UsuLogin='AANDRADE' AND a.HotelEmpCod=h.EmpCod);
IF NOT EXISTS(SELECT 1 FROM dbo.HMUSERHOTELACCESS WHERE HomeEmpCod=6002 AND UsuLogin='AANDRADE' AND HotelEmpCod=6002) INSERT dbo.HMUSERHOTELACCESS VALUES(6002,'AANDRADE',6002,1,SYSUTCDATETIME());

/* Common categories and hotel root locations. */
INSERT dbo.HMCATEGORY(GECODEMP,CategoryName,IconName,ColourCode,DefaultPriority)
SELECT EmpCod,'Renovation','tool','#0B8F9C','NORMAL' FROM @Hotels h WHERE NOT EXISTS(SELECT 1 FROM dbo.HMCATEGORY c WHERE c.GECODEMP=h.EmpCod AND c.CategoryName='Renovation');
INSERT dbo.HMLOCATION(GECODEMP,LocationType,LocationCode,LocationName)
SELECT EmpCod,'BUILDING','MAIN',Name FROM @Hotels h WHERE NOT EXISTS(SELECT 1 FROM dbo.HMLOCATION l WHERE l.GECODEMP=h.EmpCod AND l.LocationCode='MAIN');

/* Colonial Inn: 23 independent room renovation orders, each with six tasks. */
DECLARE @Room INT=1;
WHILE @Room<=23
BEGIN
  IF NOT EXISTS(SELECT 1 FROM dbo.HMLOCATION WHERE GECODEMP=6105 AND LocationCode=CONCAT('ROOM-',@Room))
   INSERT dbo.HMLOCATION(GECODEMP,ParentLocationId,LocationType,LocationCode,LocationName,FloorLabel) SELECT 6105,LocationId,'ROOM',CONCAT('ROOM-',@Room),CONCAT('Room ',@Room),CONCAT('Floor ',CEILING(@Room/10.0)) FROM dbo.HMLOCATION WHERE GECODEMP=6105 AND LocationCode='MAIN';
  IF NOT EXISTS(SELECT 1 FROM dbo.HMWORKORDER WHERE GECODEMP=6105 AND WorkOrderNumber=@Room)
  BEGIN
   DECLARE @ColonialOrder BIGINT;
   INSERT dbo.HMWORKORDER(GECODEMP,WorkOrderNumber,LocationId,CategoryId,Title,Description,Priority,Status,ReportedByLogin)
   SELECT 6105,@Room,l.LocationId,c.CategoryId,CONCAT('Room ',@Room,' Renovation'),'Complete guest-room renovation scope.','NORMAL','NEW','AANDRADE' FROM dbo.HMLOCATION l CROSS JOIN dbo.HMCATEGORY c WHERE l.GECODEMP=6105 AND l.LocationCode=CONCAT('ROOM-',@Room) AND c.GECODEMP=6105 AND c.CategoryName='Renovation';
   SET @ColonialOrder=SCOPE_IDENTITY();
   INSERT dbo.HMWORKORDERTASK(GECODEMP,WorkOrderId,TaskDescription,TaskStatus,SortOrder) VALUES
   (6105,@ColonialOrder,'Flooring renovation','TODO',1),(6105,@ColonialOrder,'Interior painting','TODO',2),(6105,@ColonialOrder,'Bathroom fixture installation','TODO',3),(6105,@ColonialOrder,'Electrical and lighting inspection','TODO',4),(6105,@ColonialOrder,'Bathroom tile installation','TODO',5),(6105,@ColonialOrder,'Exhaust fan installation','TODO',6);
  END
  SET @Room+=1;
END;

/* Clarion: carpet replacement with one task per floor. */
IF NOT EXISTS(SELECT 1 FROM dbo.HMWORKORDER WHERE GECODEMP=6104 AND WorkOrderNumber=1)
BEGIN
 DECLARE @ClarionOrder BIGINT;
 INSERT dbo.HMWORKORDER(GECODEMP,WorkOrderNumber,LocationId,CategoryId,Title,Description,Priority,Status,ReportedByLogin) SELECT 6104,1,l.LocationId,c.CategoryId,'Carpet Replacement - Five Floors','Replace corridor carpet throughout all five floors.','HIGH','NEW','AANDRADE' FROM dbo.HMLOCATION l CROSS JOIN dbo.HMCATEGORY c WHERE l.GECODEMP=6104 AND l.LocationCode='MAIN' AND c.GECODEMP=6104 AND c.CategoryName='Renovation';
 SET @ClarionOrder=SCOPE_IDENTITY();
 INSERT dbo.HMWORKORDERTASK(GECODEMP,WorkOrderId,TaskDescription,TaskStatus,SortOrder) VALUES(6104,@ClarionOrder,'Replace carpet - Floor 1','TODO',1),(6104,@ClarionOrder,'Replace carpet - Floor 2','TODO',2),(6104,@ClarionOrder,'Replace carpet - Floor 3','TODO',3),(6104,@ClarionOrder,'Replace carpet - Floor 4','TODO',4),(6104,@ClarionOrder,'Replace carpet - Floor 5','TODO',5);
END;

/* Courtis: demolition, conveyor, and hierarchical furniture assembly. */
IF NOT EXISTS(SELECT 1 FROM dbo.HMWORKORDER WHERE GECODEMP=6102 AND WorkOrderNumber=1)
BEGIN
 DECLARE @CourtisLocation BIGINT=(SELECT LocationId FROM dbo.HMLOCATION WHERE GECODEMP=6102 AND LocationCode='MAIN'),@CourtisCategory BIGINT=(SELECT CategoryId FROM dbo.HMCATEGORY WHERE GECODEMP=6102 AND CategoryName='Renovation'),@Order BIGINT,@Parent BIGINT,@N INT;
 INSERT dbo.HMWORKORDER(GECODEMP,WorkOrderNumber,LocationId,CategoryId,Title,Description,Priority,Status,ReportedByLogin) VALUES(6102,1,@CourtisLocation,@CourtisCategory,'Vendor Room Demolition','Remove existing interior finishes from the vendor room.','HIGH','NEW','AANDRADE'); SET @Order=SCOPE_IDENTITY();
 INSERT dbo.HMWORKORDERTASK(GECODEMP,WorkOrderId,TaskDescription,TaskStatus,SortOrder) VALUES(6102,@Order,'Remove insulation','TODO',1),(6102,@Order,'Remove drywall','TODO',2);
 INSERT dbo.HMWORKORDER(GECODEMP,WorkOrderNumber,LocationId,CategoryId,Title,Description,Priority,Status,ReportedByLogin) VALUES(6102,2,@CourtisLocation,@CourtisCategory,'Conveyor Belt Installation','Complete electrical preparation and install the conveyor.','HIGH','NEW','AANDRADE'); SET @Order=SCOPE_IDENTITY();
 INSERT dbo.HMWORKORDERTASK(GECODEMP,WorkOrderId,TaskDescription,TaskStatus,SortOrder) VALUES(6102,@Order,'Modify electrical branch circuit','TODO',1),(6102,@Order,'Replace electrical switch','TODO',2),(6102,@Order,'Install conveyor belt','TODO',3);
 INSERT dbo.HMWORKORDER(GECODEMP,WorkOrderNumber,LocationId,CategoryId,Title,Description,Priority,Status,ReportedByLogin) VALUES(6102,3,@CourtisLocation,@CourtisCategory,'Guest Room Furniture Assembly','Assemble furniture for 23 guest rooms.','NORMAL','NEW','AANDRADE'); SET @Order=SCOPE_IDENTITY();
 DECLARE @Parents TABLE(TaskId BIGINT,SortOrder INT);
 INSERT dbo.HMWORKORDERTASK(GECODEMP,WorkOrderId,TaskDescription,TaskStatus,SortOrder) OUTPUT INSERTED.TaskId,INSERTED.SortOrder INTO @Parents VALUES(6102,@Order,'Assemble bed furniture','TODO',1),(6102,@Order,'Assemble microwave cabinet','TODO',2),(6102,@Order,'Assemble desk','TODO',3);
 DECLARE ParentCursor CURSOR LOCAL FAST_FORWARD FOR SELECT TaskId FROM @Parents ORDER BY SortOrder; OPEN ParentCursor; FETCH NEXT FROM ParentCursor INTO @Parent;
 WHILE @@FETCH_STATUS=0 BEGIN SET @N=1; WHILE @N<=23 BEGIN INSERT dbo.HMWORKORDERTASK(GECODEMP,WorkOrderId,ParentTaskId,TaskDescription,TaskStatus,SortOrder) VALUES(6102,@Order,@Parent,CONCAT('Room ',@N),'TODO',@N); SET @N+=1; END; FETCH NEXT FROM ParentCursor INTO @Parent; END; CLOSE ParentCursor; DEALLOCATE ParentCursor;
END;
GO
