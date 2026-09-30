const { getPool, sql } = require("../conectorMysql/conectorSqlServer");

const LOCATION_TYPES = new Set([
  "BUILDING",
  "FLOOR",
  "ROOM",
  "AREA",
  "EQUIPMENT_ROOM",
]);

const clean = (value) => (typeof value === "string" ? value.trim() : value);

const listLocations = async (empCod) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod).query(`
    SELECT L.LocationId, L.ParentLocationId, L.LocationType, RTRIM(L.LocationCode) AS LocationCode,
           RTRIM(L.LocationName) AS LocationName, RTRIM(L.FloorLabel) AS FloorLabel, L.IsActive,
           RTRIM(P.LocationName) AS ParentLocationName
    FROM HMLOCATION L
    LEFT JOIN HMLOCATION P ON P.GECODEMP=L.GECODEMP AND P.LocationId=L.ParentLocationId
    WHERE L.GECODEMP=@empCod
    ORDER BY L.LocationType, L.LocationName
  `);
  return result.recordset.map((row) => ({
    ...row,
    LocationCode: clean(row.LocationCode),
    FloorLabel: clean(row.FloorLabel),
    ParentLocationName: clean(row.ParentLocationName),
  }));
};

const createLocation = async (empCod, login, payload = {}) => {
  const locationType = String(payload.locationType || "")
    .trim()
    .toUpperCase();
  const locationName = String(payload.locationName || "").trim();
  const locationCode = String(payload.locationCode || "").trim();
  const floorLabel = String(payload.floorLabel || "").trim();
  const parentLocationId =
    payload.parentLocationId === undefined ||
    payload.parentLocationId === null ||
    payload.parentLocationId === ""
      ? null
      : Number(payload.parentLocationId);

  if (!LOCATION_TYPES.has(locationType))
    throw Object.assign(new Error("Select a valid location type."), {
      status: 400,
    });
  if (!locationName || locationName.length > 120)
    throw Object.assign(
      new Error(
        "Location name is required and must be 120 characters or fewer.",
      ),
      { status: 400 },
    );
  if (
    locationCode.length > 50 ||
    floorLabel.length > 30 ||
    (parentLocationId !== null &&
      (!Number.isInteger(parentLocationId) || parentLocationId < 1))
  ) {
    throw Object.assign(new Error("One or more location fields are invalid."), {
      status: 400,
    });
  }

  const pool = await getPool();
  const request = pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .input("locationType", sql.VarChar(30), locationType)
    .input("locationName", sql.NVarChar(120), locationName)
    .input("locationCode", sql.VarChar(50), locationCode || null)
    .input("floorLabel", sql.NVarChar(30), floorLabel || null)
    .input("parentLocationId", sql.BigInt, parentLocationId)
    .input("login", sql.VarChar(10), login);

  if (parentLocationId !== null) {
    const parent = await request.query(
      "SELECT 1 AS found FROM HMLOCATION WHERE GECODEMP=@empCod AND LocationId=@parentLocationId",
    );
    if (!parent.recordset.length)
      throw Object.assign(
        new Error(
          "The selected parent location does not belong to this hotel.",
        ),
        { status: 400 },
      );
  }

  const result = await request.query(`
    INSERT INTO HMLOCATION (GECODEMP, ParentLocationId, LocationType, LocationCode, LocationName, FloorLabel)
    OUTPUT INSERTED.LocationId
    VALUES (@empCod, @parentLocationId, @locationType, @locationCode, @locationName, @floorLabel)
  `);
  return result.recordset[0];
};

const updateLocation = async (empCod, payload = {}) => {
  const locationId = Number(payload.locationId);
  if (!Number.isInteger(locationId) || locationId < 1)
    throw Object.assign(new Error("A valid location is required."), {
      status: 400,
    });
  const locationType = String(payload.locationType || "")
    .trim()
    .toUpperCase();
  const locationName = String(payload.locationName || "").trim();
  const locationCode = String(payload.locationCode || "").trim();
  const floorLabel = String(payload.floorLabel || "").trim();
  const parentLocationId =
    payload.parentLocationId === undefined ||
    payload.parentLocationId === null ||
    payload.parentLocationId === ""
      ? null
      : Number(payload.parentLocationId);
  const isActive =
    payload.isActive === undefined ? true : Boolean(payload.isActive);
  if (
    !LOCATION_TYPES.has(locationType) ||
    !locationName ||
    locationName.length > 120 ||
    locationCode.length > 50 ||
    floorLabel.length > 30 ||
    parentLocationId === locationId
  ) {
    throw Object.assign(new Error("One or more location fields are invalid."), {
      status: 400,
    });
  }
  const pool = await getPool();
  const request = pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .input("locationId", sql.BigInt, locationId)
    .input("locationType", sql.VarChar(30), locationType)
    .input("locationName", sql.NVarChar(120), locationName)
    .input("locationCode", sql.VarChar(50), locationCode || null)
    .input("floorLabel", sql.NVarChar(30), floorLabel || null)
    .input("parentLocationId", sql.BigInt, parentLocationId)
    .input("isActive", sql.Bit, isActive);
  if (parentLocationId !== null) {
    const parent = await request.query(
      "SELECT 1 AS found FROM HMLOCATION WHERE GECODEMP=@empCod AND LocationId=@parentLocationId",
    );
    if (!parent.recordset.length)
      throw Object.assign(
        new Error(
          "The selected parent location does not belong to this hotel.",
        ),
        { status: 400 },
      );
  }
  const result = await request.query(
    `UPDATE HMLOCATION SET ParentLocationId=@parentLocationId, LocationType=@locationType, LocationCode=@locationCode, LocationName=@locationName, FloorLabel=@floorLabel, IsActive=@isActive, UpdatedAt=SYSUTCDATETIME() WHERE GECODEMP=@empCod AND LocationId=@locationId`,
  );
  if (!result.rowsAffected[0])
    throw Object.assign(new Error("Location not found."), { status: 404 });
};

const removeLocation = async (empCod, locationId) => {
  const id = Number(locationId);
  if (!Number.isInteger(id) || id < 1)
    throw Object.assign(new Error("A valid location is required."), {
      status: 400,
    });
  const pool = await getPool();
  const request = pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .input("locationId", sql.BigInt, id);
  const dependencies = await request.query(
    `SELECT TOP (1) 1 AS found FROM HMLOCATION WHERE GECODEMP=@empCod AND ParentLocationId=@locationId UNION ALL SELECT TOP (1) 1 FROM HMWORKORDER WHERE GECODEMP=@empCod AND LocationId=@locationId UNION ALL SELECT TOP (1) 1 FROM HMASSET WHERE GECODEMP=@empCod AND LocationId=@locationId`,
  );
  if (dependencies.recordset.length)
    throw Object.assign(
      new Error("This location is in use and cannot be deleted."),
      { status: 409 },
    );
  const result = await request.query(
    "DELETE FROM HMLOCATION WHERE GECODEMP=@empCod AND LocationId=@locationId",
  );
  if (!result.rowsAffected[0])
    throw Object.assign(new Error("Location not found."), { status: 404 });
};

const listCategories = async (empCod) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .query(
      `SELECT CategoryId, RTRIM(CategoryName) AS CategoryName, RTRIM(IconName) AS IconName, ColourCode, DefaultPriority, IsActive FROM HMCATEGORY WHERE GECODEMP=@empCod ORDER BY CategoryName`,
    );
  return result.recordset;
};

const saveCategory = async (empCod, payload = {}) => {
  const categoryId = payload.categoryId ? Number(payload.categoryId) : null;
  const categoryName = String(payload.categoryName || "").trim();
  const iconName = String(payload.iconName || "").trim();
  const colourCode = String(payload.colourCode || "").trim();
  const defaultPriority = String(payload.defaultPriority || "NORMAL")
    .trim()
    .toUpperCase();
  const isActive =
    payload.isActive === undefined ? true : Boolean(payload.isActive);
  if (
    !categoryName ||
    categoryName.length > 80 ||
    iconName.length > 60 ||
    !["LOW", "NORMAL", "HIGH", "URGENT"].includes(defaultPriority) ||
    (colourCode && !/^#[0-9A-Fa-f]{6}$/.test(colourCode))
  )
    throw Object.assign(new Error("One or more category fields are invalid."), {
      status: 400,
    });
  const pool = await getPool();
  const request = pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .input("categoryName", sql.NVarChar(80), categoryName)
    .input("iconName", sql.VarChar(60), iconName || null)
    .input("colourCode", sql.Char(7), colourCode || null)
    .input("defaultPriority", sql.VarChar(10), defaultPriority)
    .input("isActive", sql.Bit, isActive);
  if (categoryId) {
    request.input("categoryId", sql.BigInt, categoryId);
    const r = await request.query(
      "UPDATE HMCATEGORY SET CategoryName=@categoryName, IconName=@iconName, ColourCode=@colourCode, DefaultPriority=@defaultPriority, IsActive=@isActive WHERE GECODEMP=@empCod AND CategoryId=@categoryId",
    );
    if (!r.rowsAffected[0])
      throw Object.assign(new Error("Category not found."), { status: 404 });
    return;
  }
  await request.query(
    "INSERT INTO HMCATEGORY(GECODEMP,CategoryName,IconName,ColourCode,DefaultPriority,IsActive) VALUES(@empCod,@categoryName,@iconName,@colourCode,@defaultPriority,@isActive)",
  );
};

const removeCategory = async (empCod, id) => {
  const categoryId = Number(id);
  const pool = await getPool();
  const request = pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .input("categoryId", sql.BigInt, categoryId);
  const used = await request.query(
    "SELECT TOP (1) 1 AS found FROM HMASSET WHERE GECODEMP=@empCod AND CategoryId=@categoryId UNION ALL SELECT TOP (1) 1 FROM HMWORKORDER WHERE GECODEMP=@empCod AND CategoryId=@categoryId",
  );
  if (used.recordset.length)
    throw Object.assign(
      new Error("This category is in use and cannot be deleted."),
      { status: 409 },
    );
  const r = await request.query(
    "DELETE FROM HMCATEGORY WHERE GECODEMP=@empCod AND CategoryId=@categoryId",
  );
  if (!r.rowsAffected[0])
    throw Object.assign(new Error("Category not found."), { status: 404 });
};

const listAssets = async (empCod) => {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .query(
      `SELECT A.AssetId,RTRIM(A.AssetTag) AssetTag,RTRIM(A.AssetName) AssetName,A.LocationId,A.CategoryId,RTRIM(A.Manufacturer) Manufacturer,RTRIM(A.Model) Model,RTRIM(A.SerialNumber) SerialNumber,A.AssetStatus,A.IsActive,RTRIM(L.LocationName) LocationName,RTRIM(C.CategoryName) CategoryName FROM HMASSET A LEFT JOIN HMLOCATION L ON L.GECODEMP=A.GECODEMP AND L.LocationId=A.LocationId LEFT JOIN HMCATEGORY C ON C.GECODEMP=A.GECODEMP AND C.CategoryId=A.CategoryId WHERE A.GECODEMP=@empCod ORDER BY A.AssetTag`,
    );
  return r.recordset;
};
const saveAsset = async (empCod, p = {}) => {
  const id = p.assetId ? Number(p.assetId) : null,
    tag = String(p.assetTag || "").trim(),
    name = String(p.assetName || "").trim(),
    manufacturer = String(p.manufacturer || "").trim(),
    model = String(p.model || "").trim(),
    serialNumber = String(p.serialNumber || "").trim(),
    status = String(p.assetStatus || "ACTIVE").toUpperCase(),
    locationId = p.locationId ? Number(p.locationId) : null,
    categoryId = p.categoryId ? Number(p.categoryId) : null;
  if (
    !tag ||
    !name ||
    tag.length > 50 ||
    name.length > 120 ||
    !["ACTIVE", "OUT_OF_SERVICE", "RETIRED"].includes(status)
  )
    throw Object.assign(new Error("One or more asset fields are invalid."), {
      status: 400,
    });
  const pool = await getPool(),
    q = pool
      .request()
      .input("empCod", sql.Decimal(10, 0), empCod)
      .input("assetTag", sql.VarChar(50), tag)
      .input("assetName", sql.NVarChar(120), name)
      .input("manufacturer", sql.NVarChar(80), manufacturer || null)
      .input("model", sql.NVarChar(80), model || null)
      .input("serialNumber", sql.NVarChar(100), serialNumber || null)
      .input("assetStatus", sql.VarChar(20), status)
      .input("locationId", sql.BigInt, locationId)
      .input("categoryId", sql.BigInt, categoryId);
  if (id) {
    q.input("assetId", sql.BigInt, id);
    const r = await q.query(
      "UPDATE HMASSET SET LocationId=@locationId,CategoryId=@categoryId,AssetTag=@assetTag,AssetName=@assetName,Manufacturer=@manufacturer,Model=@model,SerialNumber=@serialNumber,AssetStatus=@assetStatus WHERE GECODEMP=@empCod AND AssetId=@assetId",
    );
    if (!r.rowsAffected[0])
      throw Object.assign(new Error("Asset not found."), { status: 404 });
  } else
    await q.query(
      "INSERT HMASSET(GECODEMP,LocationId,CategoryId,AssetTag,AssetName,Manufacturer,Model,SerialNumber,AssetStatus) VALUES(@empCod,@locationId,@categoryId,@assetTag,@assetName,@manufacturer,@model,@serialNumber,@assetStatus)",
    );
};
const removeAsset = async (empCod, id) => {
  const pool = await getPool(),
    q = pool
      .request()
      .input("empCod", sql.Decimal(10, 0), empCod)
      .input("id", sql.BigInt, Number(id));
  const used = await q.query(
    "SELECT TOP(1) 1 found FROM HMWORKORDER WHERE GECODEMP=@empCod AND AssetId=@id",
  );
  if (used.recordset.length)
    throw Object.assign(
      new Error("This asset is used by work orders and cannot be deleted."),
      { status: 409 },
    );
  const r = await q.query(
    "DELETE HMASSET WHERE GECODEMP=@empCod AND AssetId=@id",
  );
  if (!r.rowsAffected[0])
    throw Object.assign(new Error("Asset not found."), { status: 404 });
};
const listAccessibleHotels = async (empCod, login) => {
  const pool=await getPool();
  const result=await pool.request().input('empCod',sql.Decimal(10,0),empCod).input('login',sql.VarChar(10),login).query(`
    DECLARE @IsAdmin bit=CASE WHEN EXISTS(SELECT 1 FROM URolesPorUser WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@login AND RTRIM(ROLCod)='ADMINFULL') THEN 1 ELSE 0 END;
    SELECT DISTINCT E.GECODEMP AS HotelEmpCod,RTRIM(E.GERAZSOC) HotelName,CAST(CASE WHEN @IsAdmin=1 OR E.GECODEMP=@empCod THEN 1 ELSE ISNULL(A.CanManage,0) END AS bit) CanManage,@IsAdmin IsAdministrator
    FROM g_emp E LEFT JOIN HMUSERHOTELACCESS A ON A.HotelEmpCod=E.GECODEMP AND A.HomeEmpCod=@empCod AND RTRIM(A.UsuLogin)=@login
    WHERE @IsAdmin=1 OR E.GECODEMP=@empCod OR A.HotelEmpCod IS NOT NULL ORDER BY HotelName`);
  return result.recordset;
};
const resolveHotelAccess = async (empCod, login, requestedHotel, manage=false) => {
  const target=Number(requestedHotel || empCod);
  if(!Number.isSafeInteger(target)||target<1) throw Object.assign(new Error('Invalid hotel selection.'),{status:400});
  if(target===Number(empCod)) return target;
  const pool=await getPool();
  const admin=await pool.request().input('home',sql.Decimal(10,0),empCod).input('login',sql.VarChar(10),login)
    .query("SELECT 1 found FROM URolesPorUser WHERE GECODEMP=@home AND RTRIM(UsuLogin)=@login AND RTRIM(ROLCod)='ADMINFULL'");
  if(admin.recordset.length) return target;
  const result=await pool.request().input('home',sql.Decimal(10,0),empCod).input('login',sql.VarChar(10),login).input('target',sql.Decimal(10,0),target)
    .query(`SELECT CanManage FROM HMUSERHOTELACCESS WHERE HomeEmpCod=@home AND RTRIM(UsuLogin)=@login AND HotelEmpCod=@target`);
  if(!result.recordset.length || (manage&&!result.recordset[0].CanManage)) throw Object.assign(new Error('You are not authorized to access the selected hotel.'),{status:403});
  return target;
};
const listWorkOrders = async (empCod, login=null, requestedHotel=empCod) => {
  const pool = await getPool();
  const hotelFilter=requestedHotel===null?null:await resolveHotelAccess(empCod,login,requestedHotel,false);
  const r = await pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .input("login",sql.VarChar(10),login)
    .input("hotelFilter",sql.Decimal(10,0),hotelFilter)
    .query(
      `WITH AllowedHotels AS (SELECT @empCod HotelEmpCod UNION SELECT HotelEmpCod FROM HMUSERHOTELACCESS WHERE HomeEmpCod=@empCod AND RTRIM(UsuLogin)=@login UNION SELECT GECODEMP FROM g_emp WHERE EXISTS(SELECT 1 FROM URolesPorUser WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@login AND RTRIM(ROLCod)='ADMINFULL'))
       SELECT W.GECODEMP HotelEmpCod,RTRIM(E.GERAZSOC) HotelName,W.WorkOrderId,W.WorkOrderNumber,W.LocationId,W.AssetId,W.CategoryId,RTRIM(W.Title) Title,RTRIM(W.Description) Description,W.Priority,W.Status,RTRIM(W.AssignedToLogin) AssignedToLogin,W.StartedAt,W.DueAt,W.CompletedAt,W.CreatedAt,RTRIM(L.LocationName) LocationName,RTRIM(A.AssetName) AssetName,RTRIM(C.CategoryName) CategoryName FROM HMWORKORDER W INNER JOIN AllowedHotels H ON H.HotelEmpCod=W.GECODEMP INNER JOIN g_emp E ON E.GECODEMP=W.GECODEMP LEFT JOIN HMLOCATION L ON L.GECODEMP=W.GECODEMP AND L.LocationId=W.LocationId LEFT JOIN HMASSET A ON A.GECODEMP=W.GECODEMP AND A.AssetId=W.AssetId LEFT JOIN HMCATEGORY C ON C.GECODEMP=W.GECODEMP AND C.CategoryId=W.CategoryId WHERE (@hotelFilter IS NULL OR W.GECODEMP=@hotelFilter) ORDER BY W.CreatedAt DESC;
       WITH AllowedHotels AS (SELECT @empCod HotelEmpCod UNION SELECT HotelEmpCod FROM HMUSERHOTELACCESS WHERE HomeEmpCod=@empCod AND RTRIM(UsuLogin)=@login UNION SELECT GECODEMP FROM g_emp WHERE EXISTS(SELECT 1 FROM URolesPorUser WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@login AND RTRIM(ROLCod)='ADMINFULL'))
       SELECT T.GECODEMP HotelEmpCod,T.TaskId,T.ParentTaskId,T.WorkOrderId,RTRIM(T.TaskDescription) TaskDescription,T.TaskStatus,RTRIM(T.ResponsibleLogin) ResponsibleLogin,T.SortOrder,RTRIM(U.Usunom) ResponsibleName
       FROM HMWORKORDERTASK T LEFT JOIN USUARIOS U ON U.GECODEMP=T.GECODEMP AND U.UsuLogin=T.ResponsibleLogin
       INNER JOIN AllowedHotels H ON H.HotelEmpCod=T.GECODEMP WHERE (@hotelFilter IS NULL OR T.GECODEMP=@hotelFilter) ORDER BY T.WorkOrderId,T.ParentTaskId,T.SortOrder,T.TaskId;`,
    );
  const tasksByOrder = new Map();
  for (const task of r.recordsets[1]) {
    const key=`${task.HotelEmpCod}:${task.WorkOrderId}`;
    if (!tasksByOrder.has(key)) tasksByOrder.set(key, []);
    tasksByOrder.get(key).push(task);
  }
  return r.recordsets[0].map((order) => ({ ...order, Tasks: tasksByOrder.get(`${order.HotelEmpCod}:${order.WorkOrderId}`) || [] }));
};
const normalizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) throw Object.assign(new Error('Tasks must be an array.'), { status: 400 });
  return tasks.map((task, index) => {
    const description = String(task.taskDescription ?? task.TaskDescription ?? task.description ?? '').trim();
    const status = String(task.taskStatus ?? task.TaskStatus ?? task.status ?? 'TODO').trim().toUpperCase();
    const responsible = String(task.responsibleLogin ?? task.ResponsibleLogin ?? task.responsible ?? '').trim().toUpperCase() || null;
    const taskId = Number(task.taskId ?? task.TaskId) || null;
    const parentTaskId = Number(task.parentTaskId ?? task.ParentTaskId) || null;
    if (!description || description.length > 300 || !['TODO','IN_PROGRESS','COMPLETED','CANCELLED'].includes(status))
      throw Object.assign(new Error(`Task ${index + 1} is invalid.`), { status: 400 });
    return { taskId, parentTaskId, description, status, responsible, sortOrder: index };
  });
};
const hasIncompleteTasks = (tasks) => tasks.some((task) => task.status !== 'COMPLETED');
const assertStoredTasksCompleted = async (request, empCod, workOrderId) => {
  const pending = await request.input('taskEmpCod',sql.Decimal(10,0),empCod).input('taskWorkOrderId',sql.BigInt,workOrderId)
    .query("SELECT TOP (1) 1 found FROM HMWORKORDERTASK WHERE GECODEMP=@taskEmpCod AND WorkOrderId=@taskWorkOrderId AND TaskStatus<>'COMPLETED'");
  if (pending.recordset.length) throw Object.assign(new Error('Every task to do must be completed before completing the work order.'), { status: 400 });
};
const assertTasksAvailableForProgress = async (request, empCod, workOrderId) => {
  const result = await request.input('progressEmpCod',sql.Decimal(10,0),empCod).input('progressWorkOrderId',sql.BigInt,workOrderId)
    .query("SELECT COUNT(*) Total,SUM(CASE WHEN TaskStatus IN ('TODO','IN_PROGRESS') THEN 1 ELSE 0 END) OpenTasks FROM HMWORKORDERTASK WHERE GECODEMP=@progressEmpCod AND WorkOrderId=@progressWorkOrderId");
  const row=result.recordset[0];
  if(Number(row.Total)>0 && Number(row.OpenTasks || 0)===0) throw Object.assign(new Error('At least one task must remain open to move the work order to in progress.'),{status:400});
};
const saveWorkOrderTasks = async (empCod, workOrderId, inputTasks = []) => {
  const id = Number(workOrderId), tasks = normalizeTasks(inputTasks);
  if (!Number.isSafeInteger(id) || id < 1) throw Object.assign(new Error('Invalid work order.'), { status: 400 });
  const pool = await getPool(), transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const exists = await new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('id',sql.BigInt,id)
      .query('SELECT 1 found FROM HMWORKORDER WHERE GECODEMP=@empCod AND WorkOrderId=@id');
    if (!exists.recordset.length) throw Object.assign(new Error('Work order not found.'), { status: 404 });
    const orderStatus = await new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('id',sql.BigInt,id)
      .query('SELECT Status FROM HMWORKORDER WHERE GECODEMP=@empCod AND WorkOrderId=@id');
    if (orderStatus.recordset[0].Status === 'COMPLETED' && hasIncompleteTasks(tasks))
      throw Object.assign(new Error('A completed work order cannot contain pending tasks.'), { status: 400 });
    const responsibleLogins = [...new Set(tasks.map((task) => task.responsible).filter(Boolean))];
    for (const responsible of responsibleLogins) {
      const user = await new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('login',sql.VarChar(10),responsible)
        .query('SELECT 1 found FROM USUARIOS WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@login AND UsuEstado=1');
      if (!user.recordset.length) throw Object.assign(new Error(`Responsible user ${responsible} is not active in this hotel.`), { status: 400 });
    }
    await new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('id',sql.BigInt,id)
      .query('DELETE HMWORKORDERTASK WHERE GECODEMP=@empCod AND WorkOrderId=@id');
    const taskIdMap=new Map();
    for (const task of [...tasks.filter((item)=>!item.parentTaskId),...tasks.filter((item)=>item.parentTaskId)]) {
      const mappedParent=task.parentTaskId ? taskIdMap.get(task.parentTaskId) : null;
      if(task.parentTaskId&&!mappedParent) throw Object.assign(new Error('A subtask references an invalid parent task.'),{status:400});
      const inserted=await new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('id',sql.BigInt,id)
        .input('description',sql.NVarChar(300),task.description).input('status',sql.VarChar(20),task.status)
        .input('responsible',sql.VarChar(10),task.responsible).input('sortOrder',sql.Int,task.sortOrder).input('parent',sql.BigInt,mappedParent)
        .query('INSERT HMWORKORDERTASK(GECODEMP,WorkOrderId,ParentTaskId,TaskDescription,TaskStatus,ResponsibleLogin,SortOrder) OUTPUT INSERTED.TaskId VALUES(@empCod,@id,@parent,@description,@status,@responsible,@sortOrder)');
      if(task.taskId) taskIdMap.set(task.taskId,Number(inserted.recordset[0].TaskId));
    }
    await transaction.commit();
  } catch (error) { await transaction.rollback(); throw error; }
};
const saveWorkOrder = async (empCod, login, p = {}) => {
  const id = p.workOrderId ? Number(p.workOrderId) : null,
    title = String(p.title || "").trim(),
    description = String(p.description || "").trim(),
    priority = String(p.priority || "NORMAL").toUpperCase(),
    status = String(p.status || "NEW").toUpperCase(),
    assigned =
      String(p.assignedToLogin || "")
        .trim()
        .toUpperCase() || null,
    locationId = p.locationId ? Number(p.locationId) : null,
    assetId = p.assetId ? Number(p.assetId) : null,
    categoryId = p.categoryId ? Number(p.categoryId) : null,
    startedAt = p.startedAt ? new Date(p.startedAt) : null,
    dueAt = p.dueAt ? new Date(p.dueAt) : null,
    completedAt = p.completedAt ? new Date(p.completedAt) : null;
  const normalizedTasks = Array.isArray(p.tasks) ? normalizeTasks(p.tasks) : null;
  if (status === 'IN_PROGRESS' && normalizedTasks?.length && !normalizedTasks.some((task) => ['TODO','IN_PROGRESS'].includes(task.status)))
    throw Object.assign(new Error('At least one task must remain open to move the work order to in progress.'), { status: 400 });
  if (
    !title ||
    title.length > 160 ||
    !["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority) ||
    ![
      "NEW",
      "ASSIGNED",
      "IN_PROGRESS",
      "ON_HOLD",
      "COMPLETED",
      "CANCELLED",
    ].includes(status) ||
    (startedAt && Number.isNaN(startedAt.getTime())) ||
    (dueAt && Number.isNaN(dueAt.getTime())) ||
    (completedAt && Number.isNaN(completedAt.getTime())) ||
    (startedAt && dueAt && dueAt < startedAt)
  )
    throw Object.assign(
      new Error("One or more work order fields are invalid."),
      { status: 400 },
    );
  const pool = await getPool(),
    q = pool
      .request()
      .input("empCod", sql.Decimal(10, 0), empCod)
      .input("title", sql.NVarChar(160), title)
      .input("description", sql.NVarChar(sql.MAX), description || null)
      .input("priority", sql.VarChar(10), priority)
      .input("status", sql.VarChar(20), status)
      .input("assigned", sql.VarChar(10), assigned)
      .input("locationId", sql.BigInt, locationId)
      .input("assetId", sql.BigInt, assetId)
      .input("categoryId", sql.BigInt, categoryId)
      .input("startedAt", sql.DateTime2, startedAt)
      .input("dueAt", sql.DateTime2, dueAt)
      .input("completedAt", sql.DateTime2, completedAt);
  if (id) {
    q.input("id", sql.BigInt, id);
    if (status === 'COMPLETED') {
      if (normalizedTasks ? hasIncompleteTasks(normalizedTasks) : false)
        throw Object.assign(new Error('Complete or cancel every task to do before completing the work order.'), { status: 400 });
      if (!normalizedTasks) await assertStoredTasksCompleted(pool.request(), empCod, id);
    }
    if (status === 'IN_PROGRESS' && !normalizedTasks) await assertTasksAvailableForProgress(pool.request(), empCod, id);
    const r = await q.query(
      `UPDATE HMWORKORDER SET LocationId=@locationId,AssetId=@assetId,CategoryId=@categoryId,Title=@title,Description=@description,Priority=@priority,Status=@status,AssignedToLogin=@assigned,StartedAt=COALESCE(@startedAt,CASE WHEN @status='IN_PROGRESS' AND StartedAt IS NULL THEN SYSUTCDATETIME() ELSE StartedAt END),DueAt=@dueAt,CompletedAt=COALESCE(@completedAt,CASE WHEN @status='COMPLETED' AND CompletedAt IS NULL THEN SYSUTCDATETIME() ELSE CompletedAt END),UpdatedAt=SYSUTCDATETIME() WHERE GECODEMP=@empCod AND WorkOrderId=@id`,
    );
    if (!r.rowsAffected[0])
      throw Object.assign(new Error("Work order not found."), { status: 404 });
    await q.query(
      `INSERT HMWORKORDEREVENT(GECODEMP,WorkOrderId,EventType,PerformedByLogin,Details) VALUES(@empCod,@id,'STATUS_CHANGED','${login.replace(/'/g, "''")}','Work order updated.')`,
    );
    if (normalizedTasks) await saveWorkOrderTasks(empCod, id, normalizedTasks);
    return id;
  }
  const n = await q.query(
    "SELECT ISNULL(MAX(WorkOrderNumber),0)+1 AS n FROM HMWORKORDER WHERE GECODEMP=@empCod",
  );
  q.input("number", sql.Int, n.recordset[0].n).input(
    "login",
    sql.VarChar(10),
    login,
  );
  const r = await q.query(
    `INSERT HMWORKORDER(GECODEMP,WorkOrderNumber,LocationId,AssetId,CategoryId,Title,Description,Priority,Status,ReportedByLogin,AssignedToLogin,StartedAt,DueAt,CompletedAt) OUTPUT INSERTED.WorkOrderId VALUES(@empCod,@number,@locationId,@assetId,@categoryId,@title,@description,@priority,@status,@login,@assigned,@startedAt,@dueAt,@completedAt)`,
  );
  q.input("id", sql.BigInt, r.recordset[0].WorkOrderId);
  await q.query(
    `INSERT HMWORKORDEREVENT(GECODEMP,WorkOrderId,EventType,PerformedByLogin,Details) VALUES(@empCod,@id,'CREATED',@login,'Work order created.')`,
  );
  if (normalizedTasks) await saveWorkOrderTasks(empCod, r.recordset[0].WorkOrderId, normalizedTasks);
  return r.recordset[0].WorkOrderId;
};
const removeWorkOrder = async (empCod, id) => {
  const pool = await getPool();
  const q = pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .input("id", sql.BigInt, Number(id));
  await q.query(
    "DELETE HMWORKORDERTASK WHERE GECODEMP=@empCod AND WorkOrderId=@id; DELETE HMWORKORDERATTACHMENT WHERE GECODEMP=@empCod AND WorkOrderId=@id; DELETE HMWORKORDERCOMMENT WHERE GECODEMP=@empCod AND WorkOrderId=@id; DELETE HMWORKORDERASSIGNMENT WHERE GECODEMP=@empCod AND WorkOrderId=@id; DELETE HMWORKORDEREVENT WHERE GECODEMP=@empCod AND WorkOrderId=@id; DELETE HMWORKORDER WHERE GECODEMP=@empCod AND WorkOrderId=@id",
  );
};
const transitionWorkOrder = async (empCod, login, id, payload = {}) => {
  const workOrderId = Number(id), target = String(payload.status || '').trim().toUpperCase(), note = String(payload.note || '').trim(), assigned = String(payload.assignedToLogin || '').trim().toUpperCase() || null;
  const transitionTasks = Array.isArray(payload.tasks) ? normalizeTasks(payload.tasks) : null;
  const allowed = { NEW: ['ASSIGNED','CANCELLED'], ASSIGNED: ['IN_PROGRESS','CANCELLED'], IN_PROGRESS: ['ON_HOLD','COMPLETED','CANCELLED'], ON_HOLD: ['IN_PROGRESS','CANCELLED'] };
  const pool = await getPool(), transaction = new sql.Transaction(pool); await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const request = new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('id',sql.BigInt,workOrderId).input('target',sql.VarChar(20),target).input('note',sql.NVarChar(1000),note||null).input('assigned',sql.VarChar(10),assigned).input('login',sql.VarChar(10),login);
    const current = await request.query('SELECT Status FROM HMWORKORDER WITH (UPDLOCK,ROWLOCK) WHERE GECODEMP=@empCod AND WorkOrderId=@id');
    if(!current.recordset.length) throw Object.assign(new Error('Work order not found.'),{status:404});
    const from=current.recordset[0].Status;
    if(!allowed[from]?.includes(target)) throw Object.assign(new Error(`Cannot move from ${from.replaceAll('_',' ')} to ${target.replaceAll('_',' ')}.`),{status:400});
    if(target==='ASSIGNED'&&!assigned) throw Object.assign(new Error('Select the person responsible for this work order.'),{status:400});
    if(target==='ASSIGNED'){const user=await request.query('SELECT 1 found FROM USUARIOS WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@assigned AND UsuEstado=1');if(!user.recordset.length)throw Object.assign(new Error('The selected user is not active in this hotel.'),{status:400});}
    if(['IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED'].includes(target)&&!note) throw Object.assign(new Error('Enter the requested comment or reason.'),{status:400});
    if(transitionTasks){
      for(const task of transitionTasks){
        if(task.responsible){
          const taskUser=await new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('login',sql.VarChar(10),task.responsible)
            .query('SELECT 1 found FROM USUARIOS WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@login AND UsuEstado=1');
          if(!taskUser.recordset.length) throw Object.assign(new Error(`Responsible user ${task.responsible} is not active in this hotel.`),{status:400});
        }
      }
      await new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('id',sql.BigInt,workOrderId)
        .query('DELETE HMWORKORDERTASK WHERE GECODEMP=@empCod AND WorkOrderId=@id');
      const taskIdMap=new Map();
      for(const task of [...transitionTasks.filter((item)=>!item.parentTaskId),...transitionTasks.filter((item)=>item.parentTaskId)]){
        const mappedParent=task.parentTaskId ? taskIdMap.get(task.parentTaskId) : null;
        if(task.parentTaskId&&!mappedParent) throw Object.assign(new Error('A subtask references an invalid parent task.'),{status:400});
        const inserted=await new sql.Request(transaction).input('empCod',sql.Decimal(10,0),empCod).input('id',sql.BigInt,workOrderId)
          .input('description',sql.NVarChar(300),task.description).input('status',sql.VarChar(20),task.status)
          .input('responsible',sql.VarChar(10),task.responsible).input('sortOrder',sql.Int,task.sortOrder).input('parent',sql.BigInt,mappedParent)
          .query('INSERT HMWORKORDERTASK(GECODEMP,WorkOrderId,ParentTaskId,TaskDescription,TaskStatus,ResponsibleLogin,SortOrder) OUTPUT INSERTED.TaskId VALUES(@empCod,@id,@parent,@description,@status,@responsible,@sortOrder)');
        if(task.taskId) taskIdMap.set(task.taskId,Number(inserted.recordset[0].TaskId));
      }
    }
    if(target==='COMPLETED') await assertStoredTasksCompleted(new sql.Request(transaction), empCod, workOrderId);
    if(target==='IN_PROGRESS') await assertTasksAvailableForProgress(new sql.Request(transaction), empCod, workOrderId);
    request.input('from',sql.VarChar(20),from);
    await request.query(`UPDATE HMWORKORDER SET Status=@target,AssignedToLogin=CASE WHEN @target='ASSIGNED' THEN @assigned ELSE AssignedToLogin END,StartedAt=CASE WHEN @target='IN_PROGRESS' AND StartedAt IS NULL THEN SYSUTCDATETIME() ELSE StartedAt END,CompletedAt=CASE WHEN @target='COMPLETED' THEN SYSUTCDATETIME() ELSE CompletedAt END,UpdatedAt=SYSUTCDATETIME() WHERE GECODEMP=@empCod AND WorkOrderId=@id; INSERT HMWORKORDEREVENT(GECODEMP,WorkOrderId,EventType,PerformedByLogin,PreviousValue,NewValue,Details) VALUES(@empCod,@id,'STATUS_CHANGED',@login,@from,@target,@note);`);
    await transaction.commit();
  } catch(error){await transaction.rollback();throw error;}
};
const listHotelUsers = async (empCod) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod).query(`
    SELECT RTRIM(UsuLogin) AS Login, RTRIM(Usunom) AS Name, RTRIM(UsuCorreo) AS Email, RTRIM(UsuCargo) AS JobTitle
    FROM USUARIOS WHERE GECODEMP=@empCod AND UsuEstado=1 ORDER BY Usunom
  `);
  return result.recordset;
};

const getDashboard = async (empCod, assignedToLogin = null) => {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("empCod", sql.Decimal(10, 0), empCod)
    .input("assignedToLogin", sql.VarChar(10), assignedToLogin).query(`
    SELECT
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin)) AS TotalOrders,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status NOT IN ('COMPLETED','CANCELLED')) AS OpenOrders,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status='IN_PROGRESS') AS InProgress,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Priority='URGENT' AND Status NOT IN ('COMPLETED','CANCELLED')) AS UrgentOrders,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status='COMPLETED' AND CAST(CompletedAt AS date)=CAST(SYSUTCDATETIME() AS date)) AS CompletedToday,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status='COMPLETED') AS CompletedOrders,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status NOT IN ('COMPLETED','CANCELLED') AND DueAt < SYSUTCDATETIME()) AS OverdueOrders,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status NOT IN ('COMPLETED','CANCELLED') AND AssignedToLogin IS NULL) AS UnassignedOrders,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status NOT IN ('COMPLETED','CANCELLED') AND DueAt >= SYSUTCDATETIME() AND DueAt < DATEADD(day,3,SYSUTCDATETIME())) AS DueSoonOrders,
      (SELECT COUNT(*) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status='COMPLETED' AND DueAt IS NOT NULL AND CompletedAt <= DueAt) AS CompletedOnTime,
      (SELECT CAST(AVG(CAST(DATEDIFF(minute,CreatedAt,CompletedAt) AS decimal(18,2))) / 60.0 AS decimal(10,1)) FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status='COMPLETED' AND CompletedAt IS NOT NULL) AS AvgResolutionHours,
      (SELECT COUNT(*) FROM HMASSET WHERE GECODEMP=@empCod AND AssetStatus='ACTIVE') AS ActiveAssets,
      (SELECT COUNT(*) FROM HMLOCATION WHERE GECODEMP=@empCod AND IsActive=1) AS ActiveLocations;
    SELECT Status, COUNT(*) AS Total FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) GROUP BY Status;
    SELECT Priority, COUNT(*) AS Total FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status NOT IN ('COMPLETED','CANCELLED') GROUP BY Priority;
    SELECT TOP (6) WorkOrderId, WorkOrderNumber, RTRIM(Title) AS Title, Priority, Status, RTRIM(AssignedToLogin) AS AssignedToLogin, DueAt
    FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin) AND Status NOT IN ('COMPLETED','CANCELLED') ORDER BY CASE WHEN DueAt < SYSUTCDATETIME() THEN 0 ELSE 1 END, CASE Priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END, DueAt;
    SELECT CONVERT(char(7),CreatedAt,120) AS Period, COUNT(*) AS Created,
      SUM(CASE WHEN Status='COMPLETED' THEN 1 ELSE 0 END) AS Completed
    FROM HMWORKORDER WHERE GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(AssignedToLogin)=@assignedToLogin)
      AND CreatedAt >= DATEADD(month,-5,DATEFROMPARTS(YEAR(SYSUTCDATETIME()),MONTH(SYSUTCDATETIME()),1))
    GROUP BY CONVERT(char(7),CreatedAt,120) ORDER BY Period;
    SELECT TOP (5) W.LocationId, COALESCE(RTRIM(L.LocationName),'Not specified') AS Name, COUNT(*) AS Total,
      SUM(CASE WHEN W.Status NOT IN ('COMPLETED','CANCELLED') THEN 1 ELSE 0 END) AS OpenCount,
      SUM(CASE WHEN W.Status NOT IN ('COMPLETED','CANCELLED') AND W.DueAt < SYSUTCDATETIME() THEN 1 ELSE 0 END) AS OverdueCount
    FROM HMWORKORDER W LEFT JOIN HMLOCATION L ON L.GECODEMP=W.GECODEMP AND L.LocationId=W.LocationId
    WHERE W.GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(W.AssignedToLogin)=@assignedToLogin)
    GROUP BY W.LocationId,L.LocationName ORDER BY OpenCount DESC,Total DESC;
    SELECT TOP (5) W.AssetId, COALESCE(RTRIM(A.AssetName),'No asset') AS Name, COUNT(*) AS Total,
      SUM(CASE WHEN W.Status NOT IN ('COMPLETED','CANCELLED') THEN 1 ELSE 0 END) AS OpenCount
    FROM HMWORKORDER W LEFT JOIN HMASSET A ON A.GECODEMP=W.GECODEMP AND A.AssetId=W.AssetId
    WHERE W.GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(W.AssignedToLogin)=@assignedToLogin)
    GROUP BY W.AssetId,A.AssetName ORDER BY Total DESC,OpenCount DESC;
    SELECT TOP (6) COALESCE(RTRIM(W.AssignedToLogin),'UNASSIGNED') AS Name, COUNT(*) AS Total,
      SUM(CASE WHEN W.Status NOT IN ('COMPLETED','CANCELLED') THEN 1 ELSE 0 END) AS OpenCount,
      SUM(CASE WHEN W.Status='COMPLETED' THEN 1 ELSE 0 END) AS CompletedCount
    FROM HMWORKORDER W WHERE W.GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(W.AssignedToLogin)=@assignedToLogin)
    GROUP BY W.AssignedToLogin ORDER BY OpenCount DESC,Total DESC;
    SELECT TOP (5) COALESCE(RTRIM(C.CategoryName),'Not categorized') AS Name, COUNT(*) AS Total,
      SUM(CASE WHEN W.Status NOT IN ('COMPLETED','CANCELLED') THEN 1 ELSE 0 END) AS OpenCount
    FROM HMWORKORDER W LEFT JOIN HMCATEGORY C ON C.GECODEMP=W.GECODEMP AND C.CategoryId=W.CategoryId
    WHERE W.GECODEMP=@empCod AND (@assignedToLogin IS NULL OR RTRIM(W.AssignedToLogin)=@assignedToLogin)
    GROUP BY C.CategoryName ORDER BY Total DESC;
  `);
  return {
    summary: result.recordsets[0][0],
    byStatus: result.recordsets[1],
    byPriority: result.recordsets[2],
    attention: result.recordsets[3],
    trend: result.recordsets[4],
    byLocation: result.recordsets[5],
    byAsset: result.recordsets[6],
    byAssignee: result.recordsets[7],
    byCategory: result.recordsets[8],
  };
};
module.exports = {
  listLocations,
  createLocation,
  updateLocation,
  removeLocation,
  listCategories,
  saveCategory,
  removeCategory,
  listAssets,
  saveAsset,
  removeAsset,
  listWorkOrders,
  listAccessibleHotels,
  resolveHotelAccess,
  saveWorkOrder,
  saveWorkOrderTasks,
  removeWorkOrder,
  transitionWorkOrder,
  getDashboard,
  listHotelUsers,
};
