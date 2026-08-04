const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { nextCorrelative } = require('../services/gxCorrelatives.service');

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

const catalogos = {
  empresas: {
    table: 'g_emp',
    gxLevel: 1,
    // g_emp es la transaccion Empresas de APERP y la raiz de GECODEMP.
    requiresEmpCod: false,
    allowDelete: false,
    trimTextColumns: true,
    rutFields: { number: 'GErut', verifier: 'GEDv' },
    primaryKey: ['GECODEMP'],
    columns: [
      'GECODEMP', 'GERAZSOC', 'GerazSMS', 'GEgiro1', 'GEgiro2', 'GEfonNum', 'GErut', 'GEDv',
      'GEdire', 'GEregion', 'GEciudad', 'GeComuna', 'GeCordinador', 'geCorreo', 'GeEstado',
      'GePaginaWeb', 'GeFecContIni', 'GeFecContFin'
    ],
    orderBy: ['GECODEMP'],
    searchColumns: ['GERAZSOC', 'GerazSMS', 'GErut', 'GEdire', 'GEciudad', 'GeComuna', 'geCorreo'],
    fields: {
      GECODEMP: { type: 'decimal', precision: 10, scale: 0, required: true, min: 1 },
      GERAZSOC: { type: 'text', length: 50, unicode: true, required: true },
      GerazSMS: { type: 'text', length: 20, unicode: true, insertDefault: '' },
      GEgiro1: { type: 'text', length: 40, unicode: true, insertDefault: '' },
      GEgiro2: { type: 'text', length: 40, unicode: true },
      GEfonNum: { type: 'decimal', precision: 10, scale: 0, min: 0, insertDefault: 0 },
      GErut: { type: 'int', required: true, min: 1, max: 999999999 },
      GEDv: { type: 'text', length: 1, unicode: true, required: true, uppercase: true },
      GEdire: { type: 'text', length: 50, unicode: true, insertDefault: '' },
      GEregion: { type: 'text', length: 25, unicode: true, insertDefault: '' },
      GEciudad: { type: 'text', length: 25, unicode: true, insertDefault: '' },
      GeComuna: { type: 'text', length: 25, unicode: true, insertDefault: '' },
      GeCordinador: { type: 'text', length: 25, unicode: true, insertDefault: '' },
      geCorreo: { type: 'text', length: 80, unicode: true, insertDefault: '' },
      GeEstado: { type: 'int', required: true, choices: [0, 1], insertDefault: 1 },
      GeLogo: { type: 'binary', serverManaged: true, serverValueOnInsert: 'emptyBinary' },
      GePaginaWeb: { type: 'text', length: 50, unicode: true, insertDefault: '' },
      GeFecContIni: { type: 'date', required: true },
      GeFecContFin: { type: 'date', required: true }
    }
  },
  temporadas: {
    table: 'TEMP01',
    gxLevel: 1,
    parentTable: 'DEFEMP',
    parentKey: ['EmpCod'],
    requiresEmpCod: true,
    primaryKey: ['EmpCod', 'TempCod'],
    columns: ['EmpCod', 'TempCod', 'TempDes', 'TempFecAbre', 'TempLogA', 'TempFecCierra', 'TempLogC', 'TempActiva'],
    orderBy: ['TempCod'],
    searchColumns: ['TempCod', 'TempDes'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      TempCod: { type: 'text', length: 9, required: true },
      TempDes: { type: 'text', length: 20, required: true },
      TempFecAbre: { type: 'date', serverValueOnInsert: 'serverDate', serverManaged: true },
      TempLogA: { type: 'text', length: 10, serverValueOnInsert: 'contextLogin', serverManaged: true },
      TempFecCierra: { type: 'date' },
      TempLogC: { type: 'text', length: 10 },
      TempActiva: { type: 'int', choices: [0, 1], insertDefault: 1 }
    }
  },
  tiposFamilia: {
    table: 'FamTipo',
    gxLevel: 1,
    requiresEmpCod: true,
    columnMap: { EmpCod: 'GECODEMP' },
    primaryKey: ['EmpCod', 'FamTCod'],
    columns: ['EmpCod', 'FamTCod', 'FamTDescrip'],
    orderBy: ['FamTCod'],
    searchColumns: ['FamTCod', 'FamTDescrip'],
    fields: {
      EmpCod: { type: 'decimal', precision: 10, scale: 0, required: true, min: 1 },
      FamTCod: { type: 'int', required: true, min: 1, max: 9999 },
      FamTDescrip: { type: 'text', length: 25, required: true }
    },
    deleteDependencies: [
      { table: 'Fam', fields: ['EmpCod', 'FamTCod'], columnMap: { EmpCod: 'GECODEMP' } }
    ]
  },
  familias: {
    table: 'Fam',
    gxLevel: 1,
    requiresEmpCod: true,
    columnMap: { EmpCod: 'GECODEMP' },
    primaryKey: ['EmpCod', 'FamFam'],
    columns: ['EmpCod', 'FamFam', 'FamDesc', 'FamEQ', 'FamTCod', 'FamTDescrip'],
    orderBy: ['FamFam'],
    searchColumns: ['FamFam', 'FamDesc', 'FamTCod', 'FamTDescrip'],
    // FamTDescrip se replica desde FamTipo; no se acepta como valor editable del cliente.
    fields: {
      EmpCod: { type: 'decimal', precision: 10, scale: 0, required: true, min: 1 },
      FamFam: { type: 'int', required: true, min: 1, max: 999 },
      FamDesc: { type: 'text', length: 45, required: true },
      FamEQ: { type: 'int', min: 0, max: 99 },
      FamTCod: { type: 'int', required: true, min: 1, max: 9999 },
      FamTDescrip: { type: 'text', length: 25, serverManaged: true }
    },
    // Hay maestros e historicos hijos no migrados aun; su eliminacion se habilitara al relevarlos.
    allowDelete: false
  },
  especies: {
    table: 'ESPECIES',
    gxLevel: 1,
    parentTable: 'DEFEMP',
    parentKey: ['EmpCod'],
    requiresEmpCod: true,
    primaryKey: ['EmpCod', 'Especod'],
    columns: ['EmpCod', 'Especod', 'EspeNom', 'EspeDiaV', 'EspeSag', 'EspeNomC', 'EspePLU', 'EspeCMP', 'EspeNomExt', 'EspeSECod'],
    orderBy: ['Especod'],
    searchColumns: ['EspeNom', 'EspeNomC', 'EspeNomExt'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      Especod: { type: 'int', required: true, min: 1 },
      EspeNom: { type: 'text', length: 20, required: true },
      EspeDiaV: { type: 'int' },
      EspeSag: { type: 'int' },
      EspeNomC: { type: 'text', length: 4, required: true },
      EspePLU: { type: 'text', length: 15 },
      EspeCMP: { type: 'int' },
      EspeNomExt: { type: 'text', length: 20 },
      EspeSECod: { type: 'text', length: 10 }
    }
  },
  variedades: {
    table: 'ESPECIES1',
    gxLevel: 2,
    parentTable: 'ESPECIES',
    parentKey: ['EmpCod', 'Especod'],
    requiresEmpCod: true,
    primaryKey: ['EmpCod', 'Especod', 'VarCod'],
    columns: ['EmpCod', 'Especod', 'VarCod', 'VarNom', 'varnomC', 'VarPLU', 'VarSECod'],
    orderBy: ['Especod', 'VarCod'],
    filters: [{ param: 'Especod', column: 'Especod', type: 'int', required: true }],
    searchColumns: ['VarNom', 'varnomC'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      Especod: { type: 'int', required: true, min: 1 },
      VarCod: { type: 'int', required: true, min: 1 },
      VarNom: { type: 'text', length: 20, required: true },
      varnomC: { type: 'text', length: 4, required: true },
      VarPLU: { type: 'text', length: 15 },
      VarSECod: { type: 'text', length: 10 }
    }
  },
  calibres: {
    table: 'CALIBRES',
    gxLevel: 1,
    parentTable: 'ESPECIES',
    parentKey: ['EmpCod', 'Especod'],
    requiresEmpCod: true,
    primaryKey: ['EmpCod', 'Especod', 'Calibre'],
    // Calibre es clave fisica, pero GeneXus permite corregirlo conservando la clave anterior.
    mutablePrimaryKey: { Calibre: 'OriginalCalibre' },
    columns: ['EmpCod', 'Especod', 'Calibre', 'CalCod'],
    orderBy: ['Especod', 'CalCod', 'Calibre'],
    filters: [{ param: 'Especod', column: 'Especod', type: 'int', required: true }],
    searchColumns: ['Calibre', 'CalCod'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      Especod: { type: 'int', required: true, min: 1 },
      Calibre: { type: 'text', length: 10, required: true },
      CalCod: { type: 'int', min: 1, serverGenerated: true }
    }
  },
  envases: {
    table: 'ENVCAT',
    gxLevel: 1,
    parentTable: 'DEFEMP',
    parentKey: ['EmpCod'],
    requiresEmpCod: true,
    primaryKey: ['EmpCod', 'EnvCod'],
    columns: ['EmpCod', 'EnvCod', 'EnvNom', 'EnvPeso', 'EnvDestare', 'EnvPesoB', 'EnvUso', 'EnvnomC', 'EnvCMP', 'EnvNomExt', 'EnvSECod'],
    orderBy: ['EnvCod'],
    searchColumns: ['EnvNom', 'EnvnomC', 'EnvNomExt'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      EnvCod: { type: 'int', required: true, min: 1 },
      EnvNom: { type: 'text', length: 20, required: true },
      EnvPeso: { type: 'decimal', precision: 10, scale: 4, required: true, exclusiveMin: 0 },
      EnvDestare: { type: 'decimal', precision: 10, scale: 4 },
      EnvPesoB: { type: 'decimal', precision: 10, scale: 4 },
      EnvUso: { type: 'int', required: true, min: 1, insertDefault: 1 },
      EnvnomC: { type: 'text', length: 10 },
      EnvCMP: { type: 'int' },
      EnvNomExt: { type: 'text', length: 20 },
      EnvSECod: { type: 'text', length: 10 }
    }
  },
  categoriasEnvase: {
    table: 'ENVCAT1',
    gxLevel: 2,
    parentTable: 'ENVCAT',
    parentKey: ['EmpCod', 'EnvCod'],
    requiresEmpCod: true,
    primaryKey: ['EmpCod', 'EnvCod', 'Catcod'],
    columns: ['EmpCod', 'EnvCod', 'Catcod', 'CatNom', 'CatNomC', 'CatnomExt', 'CatSECod'],
    orderBy: ['EnvCod', 'Catcod'],
    filters: [{ param: 'EnvCod', column: 'EnvCod', type: 'int', required: true }],
    searchColumns: ['CatNom', 'CatNomC', 'CatnomExt'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      EnvCod: { type: 'int', required: true, min: 1 },
      Catcod: { type: 'int', required: true, min: 1 },
      CatNom: { type: 'text', length: 20, required: true },
      CatNomC: { type: 'text', length: 4, required: true },
      CatnomExt: { type: 'text', length: 20 },
      CatSECod: { type: 'text', length: 10 }
    }
  },
  comunas: {
    table: 'COMUNAS',
    columns: ['ComCod', 'Comdesc'],
    orderBy: ['Comdesc'],
    searchColumns: ['ComCod', 'Comdesc']
  },
  productores: {
    table: 'PRODUCTORES',
    gxLevel: 1,
    parentTable: 'Empresas',
    parentKey: ['EmpCod'],
    requiresEmpCod: true,
    rutFields: { number: 'ProdRut', verifier: 'ProdDv' },
    primaryKey: ['EmpCod', 'ProdCod'],
    columns: ['EmpCod', 'ProdCod', 'ProdNom', 'ProdRut', 'ProdDv', 'ProdComuna', 'ProdProvincia', 'ProdPack', 'ProdPackCom', 'ProdPackProv', 'ProdCodExt', 'Prodnom2', 'ProdCodSAG', 'ProdSECod'],
    orderBy: ['ProdCod'],
    searchColumns: ['ProdCod', 'ProdNom', 'ProdRut', 'ProdCodSAG'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      ProdCod: { type: 'text', length: 6, required: true },
      ProdNom: { type: 'text', length: 35, required: true },
      ProdRut: { type: 'int' },
      ProdDv: { type: 'text', length: 1 },
      ProdComuna: { type: 'text', length: 20 },
      ProdProvincia: { type: 'text', length: 20 },
      ProdPack: { type: 'text', length: 30 },
      ProdPackCom: { type: 'text', length: 20 },
      ProdPackProv: { type: 'text', length: 20 },
      ProdCodExt: { type: 'text', length: 10 },
      Prodnom2: { type: 'text', length: 20 },
      ProdCodSAG: { type: 'text', length: 10, required: true },
      ProdSECod: { type: 'text', length: 10 }
    }
  },
  cuarteles: {
    table: 'PRODUCTORES1',
    gxLevel: 2,
    parentTable: 'PRODUCTORES',
    parentKey: ['EmpCod', 'ProdCod'],
    requiresEmpCod: true,
    primaryKey: ['EmpCod', 'ProdCod', 'CuarCod'],
    columns: ['EmpCod', 'ProdCod', 'CuarCod', 'CuarNom', 'CuarnomC'],
    orderBy: ['ProdCod', 'CuarCod'],
    filters: [{ param: 'ProdCod', column: 'ProdCod', type: 'text', length: 6, required: true }],
    searchColumns: ['ProdCod', 'CuarNom', 'CuarnomC'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      ProdCod: { type: 'text', length: 6, required: true },
      CuarCod: { type: 'int', required: true, min: 1 },
      CuarNom: { type: 'text', length: 35, required: true },
      CuarnomC: { type: 'text', length: 4, required: true }
    }
  },
  clientes: {
    table: 'CLIENTES',
    gxLevel: 1,
    parentTable: 'DEFEMP',
    parentKey: ['EmpCod'],
    requiresEmpCod: true,
    rutFields: { number: 'Clirut', verifier: 'CliDv' },
    primaryKey: ['EmpCod', 'CliCod'],
    columns: ['EmpCod', 'CliCod', 'Clirut', 'CliDv', 'CliNom', 'Clidirec', 'CliGiro', 'Cliciu', 'CliCom', 'CliFono', 'CliRegion'],
    orderBy: ['CliCod'],
    filters: [{ param: 'CliNom', column: 'CliNom', type: 'text', length: 40, operator: 'like' }],
    searchColumns: ['CliCod', 'Clirut', 'CliDv', 'CliNom', 'Clidirec', 'CliGiro', 'Cliciu', 'CliCom', 'CliFono', 'CliRegion'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      CliCod: { type: 'int', required: true, min: 1, max: 99999 },
      Clirut: { type: 'int', max: 999999999 },
      CliDv: { type: 'text', length: 1, uppercase: true },
      CliNom: { type: 'text', length: 40, required: true },
      Clidirec: { type: 'text', length: 40 },
      CliGiro: { type: 'text', length: 30 },
      Cliciu: { type: 'text', length: 30 },
      CliCom: { type: 'text', length: 30 },
      CliFono: { type: 'text', length: 30 },
      CliRegion: { type: 'text', length: 20 }
    },
    deleteDependencies: [
      { table: 'CAP001', fields: ['EmpCod', 'CliCod'] },
      { table: 'DESCLI_FP', fields: ['EmpCod', 'CliCod'] },
      { table: 'DESPCAJS', fields: ['EmpCod', 'CliCod'] },
      { table: 'FACTURA', fields: ['EmpCod', 'CliCod'] },
      { table: 'GUIASD', fields: ['EmpCod', 'CliCod'] },
      { table: 'GUIASD_Back', fields: ['EmpCod', 'CliCod'] },
      { table: 'LISTPRECIOS', fields: ['EmpCod', 'CliCod'] },
      { table: 'PACKLIST', fields: ['EmpCod', 'CliCod'] }
    ]
  },
  exportadoras: {
    table: 'EXPORT1',
    requiresEmpCod: true,
    columns: ['EmpCod', 'ExpCod', 'ExpRut', 'ExpDv', 'ExpNom', 'EXPCodMP', 'EXPSECod'],
    orderBy: ['ExpCod'],
    searchColumns: ['ExpNom', 'ExpRut']
  },
  consignatarios: {
    table: 'CONSIG',
    gxLevel: 1,
    parentTable: 'DEFEMP',
    parentKey: ['EmpCod'],
    requiresEmpCod: true,
    rutFields: { number: 'ConsRut', verifier: 'ConsDV' },
    primaryKey: ['EmpCod', 'ConsCod'],
    columns: ['EmpCod', 'ConsCod', 'ConsRut', 'ConsDV', 'ConsNom'],
    orderBy: ['ConsCod'],
    searchColumns: ['ConsCod', 'ConsRut', 'ConsDV', 'ConsNom'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      ConsCod: { type: 'int', required: true, min: 1, max: 999 },
      ConsRut: { type: 'int', max: 999999999 },
      ConsDV: { type: 'text', length: 1, uppercase: true },
      ConsNom: { type: 'text', length: 30, required: true }
    },
    deleteDependencies: [
      { table: 'DESORIGEN', fields: ['EmpCod', 'ConsCod'] },
      { table: 'PACKLIST', fields: ['EmpCod', 'ConsCod'] }
    ]
  },
  agentes: {
    table: 'AGENTES',
    gxLevel: 1,
    parentTable: 'DEFEMP',
    parentKey: ['EmpCod'],
    requiresEmpCod: true,
    rutFields: { number: 'Agerut', verifier: 'AgeDv' },
    primaryKey: ['EmpCod', 'AgeCod'],
    columns: ['EmpCod', 'AgeCod', 'Agerut', 'AgeDv', 'AgeNom', 'AgecodMP'],
    orderBy: ['AgeCod'],
    searchColumns: ['AgeCod', 'Agerut', 'AgeDv', 'AgeNom', 'AgecodMP'],
    fields: {
      EmpCod: { type: 'int', required: true, min: 1 },
      AgeCod: { type: 'int', required: true, min: 1, max: 999 },
      Agerut: { type: 'int', required: true, min: 1, max: 999999999 },
      AgeDv: { type: 'text', length: 1, required: true, uppercase: true },
      AgeNom: { type: 'text', length: 30, required: true },
      AgecodMP: { type: 'int', max: 99999 }
    },
    deleteDependencies: [
      { table: 'DESORIGEN', fields: ['EmpCod', 'AgeCod'] },
      { table: 'PACKLIST', fields: ['EmpCod', 'AgeCod'] }
    ]
  },
  origenes: {
    table: 'ORIGEN',
    requiresEmpCod: true,
    columns: ['EmpCod', 'OriCod', 'Orinom', 'OriEst'],
    orderBy: ['OriCod'],
    searchColumns: ['Orinom']
  },
  condiciones: {
    table: 'CONDICION',
    columns: ['ConCod', 'ConNom', 'ConEst', 'ConNomC'],
    orderBy: ['ConCod'],
    searchColumns: ['ConNom', 'ConNomC']
  },
  destinos: {
    table: 'DESTINOS',
    columns: ['DestCod', 'DestNom', 'DestCMP'],
    orderBy: ['DestCod'],
    searchColumns: ['DestNom']
  },
  tiposDocumento: {
    table: 'TIPDOC',
    columns: ['TdCod', 'TdNom', 'TdInter', 'TdBloq'],
    orderBy: ['TdCod'],
    searchColumns: ['TdNom']
  }
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const findParam = (source, name) => {
  if (!source) return { found: false, value: undefined };
  if (hasOwn(source, name)) return { found: true, value: source[name] };

  const lowerName = name.toLowerCase();
  const matchingKey = Object.keys(source).find((key) => key.toLowerCase() === lowerName);
  if (!matchingKey) return { found: false, value: undefined };

  return { found: true, value: source[matchingKey] };
};

const quoteName = (name) => `[${name}]`;

const getDbColumn = (config, fieldName) => config.columnMap?.[fieldName] || fieldName;

const getSelectColumn = (config, fieldName) => {
  const dbColumn = getDbColumn(config, fieldName);
  if (config.trimTextColumns && config.fields?.[fieldName]?.type === 'text') {
    return `RTRIM(${quoteName(dbColumn)}) AS ${quoteName(fieldName)}`;
  }
  return dbColumn === fieldName ? quoteName(fieldName) : `${quoteName(dbColumn)} AS ${quoteName(fieldName)}`;
};

const getParam = (req, name) => {
  const queryParam = findParam(req.query, name);
  if (queryParam.found) return queryParam.value;

  const bodyParam = findParam(req.body, name);
  if (bodyParam.found) return bodyParam.value;

  return undefined;
};

const getContextEmpCod = (req) => {
  const empCod = Number(req.context?.empCod);
  if (!Number.isInteger(empCod) || empCod <= 0) {
    throw httpError(500, 'Contexto de empresa no configurado');
  }

  return empCod;
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getIntParam = (req, name, required = true) => {
  const value = getParam(req, name);

  if (value === undefined || value === null || value === '') {
    if (!required) return null;
    throw httpError(400, `Parametro requerido: ${name}`);
  }

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) {
    throw httpError(400, `Parametro invalido: ${name} debe ser entero`);
  }

  return numberValue;
};

const getTextParam = (req, name) => {
  const value = getParam(req, name);
  if (value === undefined || value === null || value === '') return null;
  return String(value).trim();
};

const getLimit = (req) => {
  const rawLimit = getParam(req, 'limit');
  if (rawLimit === undefined || rawLimit === null || rawLimit === '') return DEFAULT_LIMIT;

  const limit = Number(rawLimit);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw httpError(400, 'Parametro invalido: limit debe ser entero positivo');
  }

  return Math.min(limit, MAX_LIMIT);
};

const bindFilter = (request, filter, value) => {
  if (filter.type === 'int') {
    const intValue = Number(value);
    if (!Number.isInteger(intValue)) {
      throw httpError(400, `Parametro invalido: ${filter.param} debe ser entero`);
    }
    request.input(filter.param, sql.Int, intValue);
    return;
  }

  const textValue = String(value).trim();
  const boundValue = filter.operator === 'like' ? `%${textValue}%` : textValue;
  request.input(filter.param, sql.VarChar((filter.length || 50) + (filter.operator === 'like' ? 2 : 0)), boundValue);
};

const buildSearchClause = (request, config, q) => {
  if (!q || !config.searchColumns || config.searchColumns.length === 0) return null;

  request.input('q', sql.NVarChar(120), `%${q}%`);
  return `(${config.searchColumns.map((column) => `CAST(${quoteName(getDbColumn(config, column))} AS NVARCHAR(120)) LIKE @q`).join(' OR ')})`;
};

const listCatalog = (catalogName) => async (req, res) => {
  const config = catalogos[catalogName];

  try {
    const pool = await getPool();
    const request = pool.request();
    const where = [];
    const limit = getLimit(req);

    request.input('limit', sql.Int, limit);

    if (config.requiresEmpCod) {
      request.input('empCod', sql.Int, getContextEmpCod(req));
      where.push(`${quoteName(getDbColumn(config, 'EmpCod'))} = @empCod`);
    }

    for (const filter of config.filters || []) {
      const value = getParam(req, filter.param);
      const hasValue = value !== undefined && value !== null && value !== '';

      if (!hasValue && filter.required) {
        throw httpError(400, `Parametro requerido: ${filter.param}`);
      }

      if (!hasValue) continue;

      bindFilter(request, filter, value);
      const operator = filter.operator === 'like' ? 'LIKE' : '=';
      where.push(`${quoteName(getDbColumn(config, filter.column))} ${operator} @${filter.param}`);
    }

    const q = getTextParam(req, 'q');
    const searchClause = buildSearchClause(request, config, q);
    if (searchClause) where.push(searchClause);

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const query = `
      SELECT TOP (@limit)
        ${config.columns.map((column) => getSelectColumn(config, column)).join(',\n        ')}
      FROM ${quoteName(config.table)}
      ${whereSql}
      ORDER BY ${config.orderBy.map((column) => quoteName(getDbColumn(config, column))).join(', ')}
    `;

    const result = await request.query(query);

    return res.json({
      success: true,
      catalog: catalogName,
      count: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      catalog: catalogName,
      message: status === 500 ? 'Error consultando maestro' : error.message,
      error: error.message
    });
  }
};

const hasWriteParam = (req, name) => {
  if (findParam(req.body, name).found) return true;
  if (findParam(req.query, name).found) return true;
  return false;
};

const getWriteParam = (req, name) => {
  const bodyParam = findParam(req.body, name);
  if (bodyParam.found) return bodyParam.value;

  const queryParam = findParam(req.query, name);
  if (queryParam.found) return queryParam.value;

  return undefined;
};

const hasCatalogWriteParam = (req, config, name) => (
  (name === 'EmpCod' && config.requiresEmpCod) || hasWriteParam(req, name)
);

const getCatalogWriteParam = (req, config, name) => {
  if (name === 'EmpCod' && config.requiresEmpCod) return getContextEmpCod(req);
  return getWriteParam(req, name);
};

const getSqlType = (field) => {
  if (field.type === 'int') return sql.Int;
  if (field.type === 'date') return sql.Date;
  if (field.type === 'decimal') return sql.Decimal(field.precision || 18, field.scale ?? 4);
  if (field.type === 'binary') return sql.VarBinary(sql.MAX);
  if (field.unicode) return sql.NVarChar(field.length || 255);
  return sql.VarChar(field.length || 255);
};

const buildDate = (year, month, day) => {
  const dateValue = new Date(Date.UTC(year, month - 1, day));
  if (
    dateValue.getUTCFullYear() !== year ||
    dateValue.getUTCMonth() !== month - 1 ||
    dateValue.getUTCDate() !== day
  ) {
    return null;
  }
  return dateValue;
};

const parseDateValue = (value) => {
  if (value instanceof Date) return value;

  const textValue = String(value).trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(textValue);
  if (isoMatch) {
    return buildDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const compactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(textValue);
  if (compactMatch) {
    return buildDate(Number(compactMatch[1]), Number(compactMatch[2]), Number(compactMatch[3]));
  }

  return new Date(textValue);
};

const validateChoice = (fieldName, field, value) => {
  if (!field.choices || value === null) return;

  const isAllowed = field.choices.some((choice) => String(choice) === String(value));
  if (!isAllowed) {
    throw httpError(400, `Campo invalido: ${fieldName} valor no permitido`);
  }
};

const validateRange = (fieldName, field, value) => {
  if (value === null) return;

  if (field.min !== undefined && value < field.min) {
    throw httpError(400, `Campo invalido: ${fieldName} debe ser mayor o igual a ${field.min}`);
  }

  if (field.exclusiveMin !== undefined && value <= field.exclusiveMin) {
    throw httpError(400, `Campo invalido: ${fieldName} debe ser mayor a ${field.exclusiveMin}`);
  }

  if (field.max !== undefined && value > field.max) {
    throw httpError(400, `Campo invalido: ${fieldName} debe ser menor o igual a ${field.max}`);
  }
};

const normalizeValue = (fieldName, field, value, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw httpError(400, `Campo requerido: ${fieldName}`);
    return null;
  }

  if (field.type === 'int') {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue)) {
      throw httpError(400, `Campo invalido: ${fieldName} debe ser entero`);
    }
    validateChoice(fieldName, field, numberValue);
    validateRange(fieldName, field, numberValue);
    return numberValue;
  }

  if (field.type === 'date') {
    const dateValue = parseDateValue(value);
    if (!dateValue || Number.isNaN(dateValue.getTime())) {
      throw httpError(400, `Campo invalido: ${fieldName} debe ser fecha valida`);
    }
    return dateValue;
  }

  if (field.type === 'decimal') {
    const numberValue = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(numberValue)) {
      throw httpError(400, `Campo invalido: ${fieldName} debe ser numerico`);
    }
    validateChoice(fieldName, field, numberValue);
    validateRange(fieldName, field, numberValue);
    return numberValue;
  }

  if (field.type === 'binary') {
    if (Buffer.isBuffer(value)) return value;
    throw httpError(400, `Campo invalido: ${fieldName} debe ser binario`);
  }

  const textValue = String(value).trim();
  if (textValue === '') {
    if (required) throw httpError(400, `Campo requerido: ${fieldName}`);
    return null;
  }
  if (field.length && textValue.length > field.length) {
    throw httpError(400, `Campo invalido: ${fieldName} maximo ${field.length} caracteres`);
  }
  const normalizedText = field.uppercase ? textValue.toUpperCase() : textValue;
  validateChoice(fieldName, field, normalizedText);

  return normalizedText;
};

const bindField = (request, paramName, fieldName, field, value, required = false) => {
  const normalizedValue = normalizeValue(fieldName, field, value, required);
  request.input(paramName, getSqlType(field), normalizedValue);
  return normalizedValue;
};

const getWritableCatalog = (catalogName) => {
  const config = catalogos[catalogName];
  if (!config || !config.fields || !config.primaryKey) {
    throw httpError(500, `Catalogo no configurado para escritura: ${catalogName}`);
  }
  return config;
};

const getKeyPayload = (req, config) => config.primaryKey.reduce((payload, column) => {
  payload[column] = getCatalogWriteParam(req, config, column);
  return payload;
}, {});

const getInsertValue = (req, config, column, field) => {
  if (field.serverValueOnInsert === 'serverDate') return new Date();
  if (field.serverValueOnInsert === 'contextLogin') return req.context?.login || 'MIGRACION';
  if (field.serverValueOnInsert === 'emptyBinary') return Buffer.alloc(0);

  const suppliedValue = getCatalogWriteParam(req, config, column);
  if (suppliedValue !== undefined && suppliedValue !== null && suppliedValue !== '') return suppliedValue;

  return field.insertDefault !== undefined ? field.insertDefault : suppliedValue;
};

const getConfiguredDefault = (definition) => {
  if (definition.serverValue === 'serverDate') return new Date();
  return definition.value;
};

const calculateRutVerifier = (rut) => {
  let value = Number(rut);
  let factor = 2;
  let sum = 0;

  while (value > 0) {
    sum += (value % 10) * factor;
    value = Math.floor(value / 10);
    factor = factor === 7 ? 2 : factor + 1;
  }

  const result = 11 - (sum % 11);
  if (result === 11) return '0';
  if (result === 10) return 'K';
  return String(result);
};

const validateRut = (config, values) => {
  if (!config.rutFields) return;

  const numberField = config.rutFields.number;
  const verifierField = config.rutFields.verifier;
  const rut = values[numberField];
  const verifier = values[verifierField];
  const touchesRut = rut !== undefined || verifier !== undefined;

  if (!touchesRut || (rut === null && verifier === null)) return;
  if (rut === undefined || rut === null || verifier === undefined || verifier === null) {
    throw httpError(400, 'Debe informar RUT y digito verificador');
  }

  if (calculateRutVerifier(rut) !== String(verifier).trim().toUpperCase()) {
    throw httpError(400, 'RUT incorrecto');
  }
};

const sendWriteError = (res, catalogName, error, defaultMessage) => {
  let status = error.status || 500;
  let message = status === 500 ? defaultMessage : error.message;

  if (error.number === 2601 || error.number === 2627) {
    status = 409;
    message = 'Registro duplicado';
  }

  if (error.number === 547) {
    status = 409;
    message = 'Registro relacionado o llave foranea invalida';
  }

  return res.status(status).json({
    success: false,
    catalog: catalogName,
    message,
    error: error.message
  });
};

const insertCatalog = (catalogName) => async (req, res) => {
  try {
    const config = getWritableCatalog(catalogName);
    const pool = await getPool();
    const request = pool.request();
    const columns = Object.keys(config.fields).filter((column) => !config.fields[column].serverGenerated);
    const normalizedValues = {};

    for (const column of columns) {
      const field = config.fields[column];
      const isRequired = config.primaryKey.includes(column) || field.required === true;
      normalizedValues[column] = bindField(request, column, column, field, getInsertValue(req, config, column, field), isRequired);
    }

    validateRut(config, normalizedValues);

    const extraColumns = Object.entries(config.insertDefaults || {});
    for (const [column, definition] of extraColumns) {
      bindField(request, `default_${column}`, column, definition, getConfiguredDefault(definition), true);
    }

    const query = `
      INSERT INTO ${quoteName(config.table)}
        (${[
          ...columns.map((column) => quoteName(getDbColumn(config, column))),
          ...extraColumns.map(([column]) => quoteName(column))
        ].join(', ')})
      VALUES
        (${[
          ...columns.map((column) => `@${column}`),
          ...extraColumns.map(([column]) => `@default_${column}`)
        ].join(', ')})
    `;

    await request.query(query);

    return res.status(201).json({
      success: true,
      catalog: catalogName,
      message: 'Registro creado',
      key: getKeyPayload(req, config)
    });
  } catch (error) {
    return sendWriteError(res, catalogName, error, 'Error insertando maestro');
  }
};

const updateCatalog = (catalogName) => async (req, res) => {
  try {
    const config = getWritableCatalog(catalogName);
    const pool = await getPool();
    const request = pool.request();
    const normalizedValues = {};

    const mutablePrimaryKey = config.mutablePrimaryKey || {};

    for (const column of config.primaryKey) {
      const originalParam = mutablePrimaryKey[column];
      const originalValue = originalParam ? getWriteParam(req, originalParam) : undefined;
      const keyValue = originalValue === undefined ? getCatalogWriteParam(req, config, column) : originalValue;
      bindField(request, `key_${column}`, column, config.fields[column], keyValue, true);
    }

    const updateColumns = Object.keys(config.fields).filter((column) => (
      (!config.primaryKey.includes(column) || Boolean(mutablePrimaryKey[column])) &&
      !config.fields[column].serverGenerated &&
      !config.fields[column].serverManaged &&
      hasCatalogWriteParam(req, config, column)
    ));

    if (updateColumns.length === 0) {
      throw httpError(400, 'Debe informar al menos un campo para actualizar');
    }

    for (const column of updateColumns) {
      normalizedValues[column] = bindField(
        request,
        column,
        column,
        config.fields[column],
        getCatalogWriteParam(req, config, column),
        config.fields[column].required === true
      );
    }

    validateRut(config, normalizedValues);

    const query = `
      UPDATE ${quoteName(config.table)}
      SET ${updateColumns.map((column) => `${quoteName(getDbColumn(config, column))} = @${column}`).join(', ')}
      WHERE ${config.primaryKey.map((column) => `${quoteName(getDbColumn(config, column))} = @key_${column}`).join(' AND ')}
    `;

    const result = await request.query(query);

    return res.json({
      success: true,
      catalog: catalogName,
      message: 'Registro actualizado',
      rowsAffected: result.rowsAffected[0] || 0,
      key: getKeyPayload(req, config)
    });
  } catch (error) {
    return sendWriteError(res, catalogName, error, 'Error actualizando maestro');
  }
};

const assertDeleteDependencies = async (pool, req, config) => {
  for (const dependency of config.deleteDependencies || []) {
    const request = pool.request();
    const where = [];

    for (const fieldName of dependency.fields) {
      const field = config.fields[fieldName];
      const paramName = `dependency_${fieldName}`;
      bindField(request, paramName, fieldName, field, getCatalogWriteParam(req, config, fieldName), true);
      where.push(`${quoteName(dependency.columnMap?.[fieldName] || fieldName)} = @${paramName}`);
    }

    // La base GX8 no declara estas relaciones como FK; se conservan antes de eliminar.
    const result = await request.query(`
      SELECT TOP (1) 1 AS [Exists]
      FROM ${quoteName(dependency.table)}
      WHERE ${where.join(' AND ')}
    `);

    if (result.recordset.length > 0) {
      throw httpError(409, `No se puede eliminar: el registro esta utilizado en ${dependency.table}`);
    }
  }
};

const synchronizeFamilyTypeDescription = async (req, required) => {
  const rawCode = getCatalogWriteParam(req, catalogos.familias, 'FamTCod');
  if (rawCode === undefined || rawCode === null || rawCode === '') {
    if (required) return;
    return;
  }

  const typeCode = normalizeValue('FamTCod', catalogos.familias.fields.FamTCod, rawCode, true);
  const pool = await getPool();
  const request = pool.request();
  request.input('empCod', sql.Int, getContextEmpCod(req));
  request.input('famTCod', sql.Int, typeCode);

  const result = await request.query(`
    SELECT TOP (1) RTRIM([FamTDescrip]) AS [FamTDescrip]
    FROM [FamTipo]
    WHERE [GECODEMP] = @empCod AND [FamTCod] = @famTCod
  `);

  if (result.recordset.length === 0) {
    throw httpError(400, 'El tipo de familia indicado no existe para la empresa autenticada');
  }

  req.body = { ...(req.body || {}), FamTDescrip: result.recordset[0].FamTDescrip };
};

const withFamilyTypeDescription = (handler, required) => async (req, res) => {
  try {
    if (required || hasWriteParam(req, 'FamTCod')) {
      await synchronizeFamilyTypeDescription(req, required);
    }
    return handler(req, res);
  } catch (error) {
    return sendWriteError(res, 'familias', error, 'Error validando tipo de familia');
  }
};

const deleteCatalog = (catalogName) => async (req, res) => {
  try {
    const config = getWritableCatalog(catalogName);
    if (config.allowDelete === false) {
      throw httpError(405, 'La eliminacion de empresas esta deshabilitada para proteger sus datos relacionados');
    }
    const pool = await getPool();
    const request = pool.request();

    await assertDeleteDependencies(pool, req, config);

    for (const column of config.primaryKey) {
      bindField(request, `key_${column}`, column, config.fields[column], getCatalogWriteParam(req, config, column), true);
    }

    const query = `
      DELETE FROM ${quoteName(config.table)}
      WHERE ${config.primaryKey.map((column) => `${quoteName(getDbColumn(config, column))} = @key_${column}`).join(' AND ')}
    `;

    const result = await request.query(query);

    return res.json({
      success: true,
      catalog: catalogName,
      message: 'Registro eliminado',
      rowsAffected: result.rowsAffected[0] || 0,
      key: getKeyPayload(req, config)
    });
  } catch (error) {
    return sendWriteError(res, catalogName, error, 'Error eliminando maestro');
  }
};

const insertCalibre = async (req, res) => {
  const catalogName = 'calibres';
  let transaction;
  let transactionStarted = false;

  try {
    const config = getWritableCatalog(catalogName);
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;

    const calCod = await nextCorrelative({
      transaction,
      empCod: getContextEmpCod(req),
      code: 'CAL',
      digits: 5
    });
    if (calCod > 999) {
      throw httpError(409, 'Correlativo CalCod excede el largo Numeric(3) definido en GX8');
    }

    const request = new sql.Request(transaction);
    const columns = Object.keys(config.fields);

    for (const column of columns) {
      const field = config.fields[column];
      const rawValue = column === 'CalCod' ? calCod : getInsertValue(req, config, column, field);
      bindField(request, column, column, field, rawValue, true);
    }

    await request.query(`
      INSERT INTO [${config.table}]
        (${columns.map(quoteName).join(', ')})
      VALUES
        (${columns.map((column) => `@${column}`).join(', ')})
    `);

    await transaction.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      catalog: catalogName,
      message: 'Registro creado',
      key: getKeyPayload(req, config),
      CalCod: calCod
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error revirtiendo insercion de calibre', rollbackError);
      }
    }

    return sendWriteError(res, catalogName, error, 'Error insertando maestro');
  }
};

const getCatalogos = (req, res) => {
  res.json({
    success: true,
    catalogs: Object.keys(catalogos)
  });
};

module.exports = {
  catalogs: catalogos,
  getCatalogos,
  listEmpresas: listCatalog('empresas'),
  insertEmpresa: insertCatalog('empresas'),
  updateEmpresa: updateCatalog('empresas'),
  deleteEmpresa: deleteCatalog('empresas'),
  listTemporadas: listCatalog('temporadas'),
  insertTemporada: insertCatalog('temporadas'),
  updateTemporada: updateCatalog('temporadas'),
  deleteTemporada: deleteCatalog('temporadas'),
  listTiposFamilia: listCatalog('tiposFamilia'),
  insertTipoFamilia: insertCatalog('tiposFamilia'),
  updateTipoFamilia: updateCatalog('tiposFamilia'),
  deleteTipoFamilia: deleteCatalog('tiposFamilia'),
  listFamilias: listCatalog('familias'),
  insertFamilia: withFamilyTypeDescription(insertCatalog('familias'), true),
  updateFamilia: withFamilyTypeDescription(updateCatalog('familias'), false),
  deleteFamilia: deleteCatalog('familias'),
  listEspecies: listCatalog('especies'),
  insertEspecie: insertCatalog('especies'),
  updateEspecie: updateCatalog('especies'),
  deleteEspecie: deleteCatalog('especies'),
  listVariedades: listCatalog('variedades'),
  insertVariedad: insertCatalog('variedades'),
  updateVariedad: updateCatalog('variedades'),
  deleteVariedad: deleteCatalog('variedades'),
  listCalibres: listCatalog('calibres'),
  insertCalibre,
  updateCalibre: updateCatalog('calibres'),
  deleteCalibre: deleteCatalog('calibres'),
  listEnvases: listCatalog('envases'),
  insertEnvase: insertCatalog('envases'),
  updateEnvase: updateCatalog('envases'),
  deleteEnvase: deleteCatalog('envases'),
  listCategoriasEnvase: listCatalog('categoriasEnvase'),
  insertCategoriaEnvase: insertCatalog('categoriasEnvase'),
  updateCategoriaEnvase: updateCatalog('categoriasEnvase'),
  deleteCategoriaEnvase: deleteCatalog('categoriasEnvase'),
  listComunas: listCatalog('comunas'),
  listProductores: listCatalog('productores'),
  insertProductor: insertCatalog('productores'),
  updateProductor: updateCatalog('productores'),
  deleteProductor: deleteCatalog('productores'),
  listCuarteles: listCatalog('cuarteles'),
  insertCuartel: insertCatalog('cuarteles'),
  updateCuartel: updateCatalog('cuarteles'),
  deleteCuartel: deleteCatalog('cuarteles'),
  listClientes: listCatalog('clientes'),
  insertCliente: insertCatalog('clientes'),
  updateCliente: updateCatalog('clientes'),
  deleteCliente: deleteCatalog('clientes'),
  listExportadoras: listCatalog('exportadoras'),
  listConsignatarios: listCatalog('consignatarios'),
  insertConsignatario: insertCatalog('consignatarios'),
  updateConsignatario: updateCatalog('consignatarios'),
  deleteConsignatario: deleteCatalog('consignatarios'),
  listAgentes: listCatalog('agentes'),
  insertAgente: insertCatalog('agentes'),
  updateAgente: updateCatalog('agentes'),
  deleteAgente: deleteCatalog('agentes'),
  listOrigenes: listCatalog('origenes'),
  listCondiciones: listCatalog('condiciones'),
  listDestinos: listCatalog('destinos'),
  listTiposDocumento: listCatalog('tiposDocumento')
};
