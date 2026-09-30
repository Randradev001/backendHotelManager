/* Repeatable operational sample data for HM Test Hotel - Andres Andrade (6002). */
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @EmpCod DECIMAL(10,0)=6002;
DECLARE @Login VARCHAR(10)='AANDRADE';
IF NOT EXISTS (SELECT 1 FROM dbo.g_emp WHERE GECODEMP=@EmpCod) THROW 50001, 'Test hotel 6002 does not exist.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.HMLOCATION WHERE GECODEMP=@EmpCod AND LocationCode='LOBBY')
  INSERT dbo.HMLOCATION(GECODEMP,LocationType,LocationCode,LocationName,FloorLabel) VALUES(@EmpCod,'AREA','LOBBY','Main Lobby','Ground');
IF NOT EXISTS (SELECT 1 FROM dbo.HMLOCATION WHERE GECODEMP=@EmpCod AND LocationCode='101')
  INSERT dbo.HMLOCATION(GECODEMP,LocationType,LocationCode,LocationName,FloorLabel) VALUES(@EmpCod,'ROOM','101','Room 101','1');
IF NOT EXISTS (SELECT 1 FROM dbo.HMLOCATION WHERE GECODEMP=@EmpCod AND LocationCode='BOILER')
  INSERT dbo.HMLOCATION(GECODEMP,LocationType,LocationCode,LocationName,FloorLabel) VALUES(@EmpCod,'EQUIPMENT_ROOM','BOILER','Mechanical Room','Basement');

IF NOT EXISTS (SELECT 1 FROM dbo.HMCATEGORY WHERE GECODEMP=@EmpCod AND CategoryName='HVAC') INSERT dbo.HMCATEGORY(GECODEMP,CategoryName,IconName,ColourCode,DefaultPriority) VALUES(@EmpCod,'HVAC','snow','#0B8F9C','HIGH');
IF NOT EXISTS (SELECT 1 FROM dbo.HMCATEGORY WHERE GECODEMP=@EmpCod AND CategoryName='Plumbing') INSERT dbo.HMCATEGORY(GECODEMP,CategoryName,IconName,ColourCode,DefaultPriority) VALUES(@EmpCod,'Plumbing','water','#087DF1','NORMAL');
IF NOT EXISTS (SELECT 1 FROM dbo.HMCATEGORY WHERE GECODEMP=@EmpCod AND CategoryName='Electrical') INSERT dbo.HMCATEGORY(GECODEMP,CategoryName,IconName,ColourCode,DefaultPriority) VALUES(@EmpCod,'Electrical','bolt','#E49B21','HIGH');

DECLARE @BoilerLocation BIGINT=(SELECT LocationId FROM dbo.HMLOCATION WHERE GECODEMP=@EmpCod AND LocationCode='BOILER');
DECLARE @HvacCategory BIGINT=(SELECT CategoryId FROM dbo.HMCATEGORY WHERE GECODEMP=@EmpCod AND CategoryName='HVAC');
IF NOT EXISTS (SELECT 1 FROM dbo.HMASSET WHERE GECODEMP=@EmpCod AND AssetTag='HVAC-01') INSERT dbo.HMASSET(GECODEMP,LocationId,CategoryId,AssetTag,AssetName,Manufacturer,Model,AssetStatus) VALUES(@EmpCod,@BoilerLocation,@HvacCategory,'HVAC-01','Main HVAC Unit','Daikin','VRV-S','ACTIVE');

DECLARE @Room101 BIGINT=(SELECT LocationId FROM dbo.HMLOCATION WHERE GECODEMP=@EmpCod AND LocationCode='101');
IF NOT EXISTS (SELECT 1 FROM dbo.HMWORKORDER WHERE GECODEMP=@EmpCod AND WorkOrderNumber=1)
BEGIN
  INSERT dbo.HMWORKORDER(GECODEMP,WorkOrderNumber,LocationId,CategoryId,Title,Description,Priority,Status,ReportedByLogin,AssignedToLogin,DueAt)
  VALUES(@EmpCod,1,@Room101,@HvacCategory,'Room 101 temperature issue','Guest room is warmer than the configured temperature.','HIGH','ASSIGNED',@Login,@Login,DATEADD(hour,4,SYSUTCDATETIME()));
  DECLARE @OrderId BIGINT=SCOPE_IDENTITY();
  INSERT dbo.HMWORKORDEREVENT(GECODEMP,WorkOrderId,EventType,PerformedByLogin,Details) VALUES(@EmpCod,@OrderId,'CREATED',@Login,'Sample work order created for testing.');
END;
COMMIT TRANSACTION;
