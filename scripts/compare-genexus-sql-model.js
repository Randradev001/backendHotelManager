const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const parseArgs = (argv) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    if (!key.startsWith('--') || argv[index + 1] === undefined) {
      throw new Error(`Argumento invalido: ${key}`);
    }
    options[key.slice(2)] = argv[index + 1];
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
const server = options.server || '.\\SQLEXPRESS';
const database = options.database;
const modelDir = path.resolve(options['model-dir'] || path.join(__dirname, '..', 'docs', 'migration', 'aperp-model-study'));
const outputDir = path.resolve(options['output-dir'] || path.join(modelDir, 'sql-local'));
const sourceMdf = options.mdf ? path.resolve(options.mdf) : null;
const sourceLdf = options.ldf ? path.resolve(options.ldf) : null;
const sourceDatabaseVersion = options['source-version'] || null;
const referenceMdfSize = options['reference-mdf-size'] ? Number(options['reference-mdf-size']) : null;
const referenceMdfTime = options['reference-mdf-time'] || null;
const requireReadOnly = options['require-read-only'] !== 'false';

if (!database) {
  console.error('Uso: node scripts/compare-genexus-sql-model.js --database <base> [--server <instancia>] [--model-dir <directorio>] [--output-dir <directorio>] [--mdf <archivo>] [--ldf <archivo>] [--source-version <numero>]');
  process.exit(1);
}

const sqlIdentifier = (value) => `[${String(value).replace(/]/g, ']]')}]`;
const sqlString = (value) => `N'${String(value).replace(/'/g, "''")}'`;

const queryJsonRows = (query) => {
  const output = execFileSync('sqlcmd', [
    '-S', server,
    '-E',
    '-d', database,
    '-b',
    '-r', '1',
    '-h', '-1',
    '-y', '8000',
    '-w', '65535',
    '-Q', `SET NOCOUNT ON; ${query}`
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line));
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows
    .filter((values) => values.some((value) => value !== ''))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
};

const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const writeCsv = (fileName, columns, rows) => {
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(','));
  fs.writeFileSync(path.join(outputDir, fileName), `${lines.join('\n')}\n`, 'utf8');
};

const lower = (value) => String(value || '').toLocaleLowerCase('en-US');
const splitKey = (value) => String(value || '').split('|').map((item) => item.trim()).filter(Boolean);
const sameList = (left, right) => left.length === right.length && left.every((value, index) => lower(value) === lower(right[index]));
const pct = (part, total) => total ? Number((part * 100 / total).toFixed(1)) : 0;
const bool = (value) => value === true || value === 1 || value === '1' || lower(value) === 'true';

const sha256 = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
};

const fileMetadata = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const stats = fs.statSync(filePath);
  return {
    path: filePath,
    sizeBytes: stats.size,
    lastWriteTime: stats.mtime.toISOString(),
    sha256: sha256(filePath)
  };
};

const typeFamily = (gxType) => {
  const value = lower(gxType).replace(/^bas:/, '');
  if (['numeric', 'int', 'integer'].includes(value)) return 'numeric';
  if (['character', 'varchar', 'longvarchar'].includes(value)) return 'text';
  if (['boolean'].includes(value)) return 'boolean';
  if (['date'].includes(value)) return 'date';
  if (['datetime'].includes(value)) return 'datetime';
  if (['blob', 'image', 'binary'].includes(value)) return 'binary';
  if (['guid'].includes(value)) return 'guid';
  return value || 'unknown';
};

const sqlTypeFamily = (sqlType) => {
  const value = lower(sqlType);
  if (['decimal', 'numeric', 'int', 'smallint', 'bigint', 'tinyint', 'float', 'real', 'money', 'smallmoney'].includes(value)) return 'numeric';
  if (['char', 'nchar', 'varchar', 'nvarchar', 'text', 'ntext', 'xml'].includes(value)) return 'text';
  if (value === 'bit') return 'boolean';
  if (value === 'date') return 'date';
  if (['datetime', 'smalldatetime', 'datetime2', 'datetimeoffset', 'time'].includes(value)) return 'datetime';
  if (['binary', 'varbinary', 'image', 'timestamp', 'rowversion'].includes(value)) return 'binary';
  if (value === 'uniqueidentifier') return 'guid';
  return value;
};

const compatibleType = (modelType, sqlType) => {
  const modelFamily = typeFamily(modelType);
  const physicalFamily = sqlTypeFamily(sqlType);
  if (modelFamily === physicalFamily) return true;
  if (modelFamily === 'boolean' && physicalFamily === 'numeric') return true;
  if (modelFamily === 'date' && physicalFamily === 'datetime') return true;
  if (modelFamily === 'datetime' && physicalFamily === 'date') return true;
  return false;
};

const normalizeName = (value) => lower(value).replace(/det(alle)?|level|mae|def|_/g, '').replace(/\d+$/g, '');
const bigrams = (value) => {
  const normalized = normalizeName(value);
  if (normalized.length < 2) return new Set([normalized]);
  return new Set(Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)));
};
const dice = (left, right) => {
  const a = bigrams(left);
  const b = bigrams(right);
  const common = [...a].filter((item) => b.has(item)).length;
  return a.size + b.size ? (2 * common) / (a.size + b.size) : 0;
};
const jaccard = (left, right) => {
  const a = new Set(left.map(lower));
  const b = new Set(right.map(lower));
  const union = new Set([...a, ...b]);
  return union.size ? [...a].filter((item) => b.has(item)).length / union.size : 0;
};

const main = () => {
  fs.mkdirSync(outputDir, { recursive: true });

  const modelSummary = JSON.parse(fs.readFileSync(path.join(modelDir, 'model-summary.json'), 'utf8'));
  const modelTables = parseCsv(fs.readFileSync(path.join(modelDir, 'tables.csv'), 'utf8'));
  const rawModelColumns = parseCsv(fs.readFileSync(path.join(modelDir, 'table-columns.csv'), 'utf8'))
    .filter((column) => bool(column.stored));

  const modelColumnMap = new Map();
  for (const column of rawModelColumns) {
    const key = `${lower(column.table)}\u0000${lower(column.attribute)}`;
    if (!modelColumnMap.has(key)) modelColumnMap.set(key, column);
  }
  const modelColumns = [...modelColumnMap.values()];

  const databaseInfo = queryJsonRows(`
    SELECT (
      SELECT
        CONVERT(nvarchar(128), SERVERPROPERTY('ServerName')) AS serverName,
        CONVERT(nvarchar(128), SERVERPROPERTY('ProductVersion')) AS productVersion,
        CONVERT(nvarchar(128), SERVERPROPERTY('Edition')) AS edition,
        d.name AS databaseName,
        d.create_date AS createDate,
        d.compatibility_level AS compatibilityLevel,
        d.collation_name AS collation,
        d.state_desc AS state,
        d.user_access_desc AS userAccess,
        d.is_read_only AS isReadOnly,
        (SELECT SUM(size) * 8 * 1024 FROM sys.master_files WHERE database_id = d.database_id) AS allocatedBytes
      FROM sys.databases d
      WHERE d.name = ${sqlString(database)}
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS JsonRow;
  `)[0];

  if (!databaseInfo) throw new Error(`No se encontro la base ${database} en ${server}`);
  if (requireReadOnly && !databaseInfo.isReadOnly) {
    throw new Error(`La base ${database} no esta en modo READ_ONLY; use --require-read-only false solo para consultas de metadatos autorizadas`);
  }

  const databaseFiles = queryJsonRows(`
    SELECT (
      SELECT
        file_id AS fileId,
        name AS logicalName,
        type_desc AS fileType,
        physical_name AS physicalName,
        CONVERT(bigint, size) * 8192 AS allocatedBytes,
        state_desc AS state
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS JsonRow
    FROM sys.database_files
    ORDER BY file_id;
  `);

  const sqlTables = queryJsonRows(`
    SELECT (
      SELECT
        s.name AS schemaName,
        t.name AS tableName,
        CONVERT(bigint, COALESCE((
          SELECT SUM(p.rows)
          FROM sys.indexes i
          JOIN sys.partitions p ON p.object_id = i.object_id AND p.index_id = i.index_id
          WHERE i.object_id = t.object_id AND i.index_id IN (0, 1)
        ), 0)) AS [rowCount],
        t.create_date AS createDate,
        t.modify_date AS modifyDate
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS JsonRow
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
    ORDER BY s.name, t.name;
  `);

  const sqlColumns = queryJsonRows(`
    SELECT (
      SELECT
        s.name AS schemaName,
        t.name AS tableName,
        c.column_id AS ordinal,
        c.name AS columnName,
        ty.name AS dataType,
        c.max_length AS maxLengthBytes,
        CASE
          WHEN c.max_length = -1 THEN -1
          WHEN ty.name IN ('nchar', 'nvarchar') THEN c.max_length / 2
          ELSE c.max_length
        END AS characterLength,
        c.precision AS numericPrecision,
        c.scale AS numericScale,
        c.is_nullable AS isNullable,
        c.is_identity AS isIdentity,
        c.is_computed AS isComputed,
        cc.definition AS computedDefinition,
        dc.definition AS defaultDefinition,
        c.collation_name AS collation
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS JsonRow
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.columns c ON c.object_id = t.object_id
    JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    LEFT JOIN sys.computed_columns cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
    LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE t.is_ms_shipped = 0
    ORDER BY s.name, t.name, c.column_id;
  `);

  const sqlPrimaryKeys = queryJsonRows(`
    SELECT (
      SELECT
        s.name AS schemaName,
        t.name AS tableName,
        kc.name AS constraintName,
        ic.key_ordinal AS keyOrdinal,
        c.name AS columnName,
        ic.is_descending_key AS isDescending
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS JsonRow
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.key_constraints kc ON kc.parent_object_id = t.object_id AND kc.type = 'PK'
    JOIN sys.index_columns ic ON ic.object_id = t.object_id AND ic.index_id = kc.unique_index_id
    JOIN sys.columns c ON c.object_id = t.object_id AND c.column_id = ic.column_id
    WHERE t.is_ms_shipped = 0 AND ic.key_ordinal > 0
    ORDER BY s.name, t.name, ic.key_ordinal;
  `);

  const sqlIndexes = queryJsonRows(`
    SELECT (
      SELECT
        s.name AS schemaName,
        t.name AS tableName,
        i.name AS indexName,
        i.type_desc AS indexType,
        i.is_unique AS isUnique,
        i.is_primary_key AS isPrimaryKey,
        i.is_unique_constraint AS isUniqueConstraint,
        ic.key_ordinal AS keyOrdinal,
        ic.is_included_column AS isIncluded,
        ic.is_descending_key AS isDescending,
        c.name AS columnName,
        i.filter_definition AS filterDefinition
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS JsonRow
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.indexes i ON i.object_id = t.object_id AND i.index_id > 0 AND i.is_hypothetical = 0
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE t.is_ms_shipped = 0
    ORDER BY s.name, t.name, i.index_id, ic.key_ordinal, ic.index_column_id;
  `);

  const sqlForeignKeys = queryJsonRows(`
    SELECT (
      SELECT
        sch.name AS schemaName,
        parentTable.name AS tableName,
        fk.name AS foreignKeyName,
        fkc.constraint_column_id AS columnOrdinal,
        parentColumn.name AS columnName,
        refSch.name AS referencedSchema,
        refTable.name AS referencedTable,
        refColumn.name AS referencedColumn,
        fk.delete_referential_action_desc AS deleteAction,
        fk.update_referential_action_desc AS updateAction,
        fk.is_disabled AS isDisabled
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS JsonRow
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.tables parentTable ON parentTable.object_id = fk.parent_object_id
    JOIN sys.schemas sch ON sch.schema_id = parentTable.schema_id
    JOIN sys.columns parentColumn ON parentColumn.object_id = fkc.parent_object_id AND parentColumn.column_id = fkc.parent_column_id
    JOIN sys.tables refTable ON refTable.object_id = fk.referenced_object_id
    JOIN sys.schemas refSch ON refSch.schema_id = refTable.schema_id
    JOIN sys.columns refColumn ON refColumn.object_id = fkc.referenced_object_id AND refColumn.column_id = fkc.referenced_column_id
    ORDER BY sch.name, parentTable.name, fk.name, fkc.constraint_column_id;
  `);

  const modelByName = new Map(modelTables.map((table) => [lower(table.name), table]));
  const sqlByName = new Map(sqlTables.map((table) => [lower(table.tableName), table]));
  const modelColumnsByTable = new Map();
  const sqlColumnsByTable = new Map();
  const sqlPkByTable = new Map();
  const sqlIndexNamesByTable = new Map();

  for (const column of modelColumns) {
    const key = lower(column.table);
    if (!modelColumnsByTable.has(key)) modelColumnsByTable.set(key, []);
    modelColumnsByTable.get(key).push(column);
  }
  for (const column of sqlColumns) {
    const key = lower(column.tableName);
    if (!sqlColumnsByTable.has(key)) sqlColumnsByTable.set(key, []);
    sqlColumnsByTable.get(key).push(column);
  }
  for (const keyPart of sqlPrimaryKeys) {
    const key = lower(keyPart.tableName);
    if (!sqlPkByTable.has(key)) sqlPkByTable.set(key, []);
    sqlPkByTable.get(key).push(keyPart.columnName);
  }
  for (const index of sqlIndexes) {
    const key = lower(index.tableName);
    if (!sqlIndexNamesByTable.has(key)) sqlIndexNamesByTable.set(key, new Set());
    sqlIndexNamesByTable.get(key).add(lower(index.indexName));
  }

  const tableNames = [...new Set([...modelByName.keys(), ...sqlByName.keys()])].sort();
  const tableComparisons = [];
  const columnDifferences = [];
  let matchedColumns = 0;
  let missingColumns = 0;
  let extraColumns = 0;
  let typeMismatches = 0;
  let pkMatches = 0;
  let pkMismatches = 0;

  for (const normalizedTableName of tableNames) {
    const modelTable = modelByName.get(normalizedTableName);
    const sqlTable = sqlByName.get(normalizedTableName);
    const expectedColumns = modelColumnsByTable.get(normalizedTableName) || [];
    const actualColumns = sqlColumnsByTable.get(normalizedTableName) || [];
    const expectedByName = new Map(expectedColumns.map((column) => [lower(column.attribute), column]));
    const actualByName = new Map(actualColumns.map((column) => [lower(column.columnName), column]));
    let tableMatchedColumns = 0;
    let tableMissingColumns = 0;
    let tableExtraColumns = 0;
    let tableTypeMismatches = 0;

    if (modelTable && sqlTable) {
      for (const [name, expected] of expectedByName) {
        const actual = actualByName.get(name);
        if (!actual) {
          tableMissingColumns += 1;
          missingColumns += 1;
          columnDifferences.push({ table: modelTable.name, column: expected.attribute, difference: 'MISSING_IN_SQL', modelType: expected.type, sqlType: '', modelLength: expected.length, sqlLength: '', modelDecimals: expected.decimals, sqlScale: '', detail: 'Columna almacenada en el XPZ pero ausente en SQL Server' });
          continue;
        }
        tableMatchedColumns += 1;
        matchedColumns += 1;
        if (!compatibleType(expected.type, actual.dataType)) {
          tableTypeMismatches += 1;
          typeMismatches += 1;
          columnDifferences.push({ table: modelTable.name, column: expected.attribute, difference: 'TYPE_FAMILY_MISMATCH', modelType: expected.type, sqlType: actual.dataType, modelLength: expected.length, sqlLength: actual.characterLength, modelDecimals: expected.decimals, sqlScale: actual.numericScale, detail: `${typeFamily(expected.type)} != ${sqlTypeFamily(actual.dataType)}` });
        }
      }
      for (const [name, actual] of actualByName) {
        if (!expectedByName.has(name)) {
          tableExtraColumns += 1;
          extraColumns += 1;
          columnDifferences.push({ table: sqlTable.tableName, column: actual.columnName, difference: 'EXTRA_IN_SQL', modelType: '', sqlType: actual.dataType, modelLength: '', sqlLength: actual.characterLength, modelDecimals: '', sqlScale: actual.numericScale, detail: 'Columna fisica no declarada para esta tabla en el XPZ actual' });
        }
      }
    }

    const modelPk = modelTable ? splitKey(modelTable.primaryKey) : [];
    const sqlPk = sqlPkByTable.get(normalizedTableName) || [];
    let pkMatch = '';
    if (modelTable && sqlTable) {
      pkMatch = sameList(modelPk, sqlPk);
      if (pkMatch) pkMatches += 1;
      else pkMismatches += 1;
    }

    const status = modelTable && sqlTable ? 'EXACT_TABLE_NAME' : modelTable ? 'MISSING_IN_SQL' : 'SQL_ONLY';
    tableComparisons.push({
      table: modelTable ? modelTable.name : sqlTable.tableName,
      area: modelTable ? modelTable.area : '',
      framework: modelTable ? modelTable.framework : '',
      status,
      sqlRows: sqlTable ? sqlTable.rowCount : '',
      modelStoredColumns: modelTable ? expectedColumns.length : '',
      sqlColumns: sqlTable ? actualColumns.length : '',
      matchedColumns: modelTable && sqlTable ? tableMatchedColumns : '',
      missingColumns: modelTable && sqlTable ? tableMissingColumns : '',
      extraColumns: modelTable && sqlTable ? tableExtraColumns : '',
      typeFamilyMismatches: modelTable && sqlTable ? tableTypeMismatches : '',
      modelPrimaryKey: modelTable ? modelPk.join(' | ') : '',
      sqlPrimaryKey: sqlTable ? sqlPk.join(' | ') : '',
      primaryKeyMatch: pkMatch,
      modelIndexCount: modelTable ? modelTable.indexCount : '',
      sqlIndexCount: sqlTable ? (sqlIndexNamesByTable.get(normalizedTableName) || new Set()).size : ''
    });
  }

  const modelOnlyTables = modelTables.filter((table) => !sqlByName.has(lower(table.name)));
  const sqlOnlyTables = sqlTables.filter((table) => !modelByName.has(lower(table.tableName)));
  const manualCandidates = {
    defemp: { target: 'g_emp', confidence: 'LOW', rationale: 'Parece una empresa legada adicional: G_Emp tambien existe, y la llave y casi todos los atributos son distintos.' },
    factventas1: { target: 'FactVentasDet', confidence: 'HIGH', rationale: 'Es el nivel detalle historico de FactVentas; conserva la llave del encabezado y atributos FV1.' },
    maumed: { target: 'UMed', confidence: 'HIGH', rationale: 'Coinciden UmCod, UMSig, UMDes y UMCantSal; el XPZ actual agrega GECODEMP a la llave.' },
    pagosdoc1: { target: 'PagosDocDet', confidence: 'HIGH', rationale: 'Es el nivel detalle historico de PagosDoc y coincide su estructura de llave/atributos PAGD1.' }
  };

  const renameCandidates = sqlOnlyTables.map((sqlTable) => {
    const actualColumns = (sqlColumnsByTable.get(lower(sqlTable.tableName)) || []).map((column) => column.columnName);
    const actualPk = sqlPkByTable.get(lower(sqlTable.tableName)) || [];
    const manual = manualCandidates[lower(sqlTable.tableName)];
    let candidate;

    if (manual) {
      candidate = modelByName.get(lower(manual.target));
    } else {
      candidate = modelOnlyTables
        .map((table) => {
          const expectedColumns = (modelColumnsByTable.get(lower(table.name)) || []).map((column) => column.attribute);
          const pkSimilarity = jaccard(actualPk, splitKey(table.primaryKey));
          const columnSimilarity = jaccard(actualColumns, expectedColumns);
          const nameSimilarity = dice(sqlTable.tableName, table.name);
          return { table, score: 0.45 * pkSimilarity + 0.4 * columnSimilarity + 0.15 * nameSimilarity, pkSimilarity, columnSimilarity, nameSimilarity };
        })
        .sort((left, right) => right.score - left.score)[0]?.table;
    }

    const expectedColumns = candidate ? (modelColumnsByTable.get(lower(candidate.name)) || []).map((column) => column.attribute) : [];
    const pkSimilarity = candidate ? jaccard(actualPk, splitKey(candidate.primaryKey)) : 0;
    const columnSimilarity = candidate ? jaccard(actualColumns, expectedColumns) : 0;
    const nameSimilarity = candidate ? dice(sqlTable.tableName, candidate.name) : 0;
    const score = 0.45 * pkSimilarity + 0.4 * columnSimilarity + 0.15 * nameSimilarity;
    const confidence = manual ? manual.confidence : score >= 0.75 ? 'HIGH' : score >= 0.5 ? 'MEDIUM' : 'LOW';

    return {
      sqlTable: sqlTable.tableName,
      likelyCurrentModelTable: candidate ? candidate.name : '',
      confidence,
      heuristicScore: score.toFixed(3),
      primaryKeySimilarity: pkSimilarity.toFixed(3),
      columnSimilarity: columnSimilarity.toFixed(3),
      nameSimilarity: nameSimilarity.toFixed(3),
      rationale: manual ? manual.rationale : 'Candidato calculado por similitud de nombre, columnas y llave; requiere validacion funcional.'
    };
  });

  const exactTables = modelTables.filter((table) => sqlByName.has(lower(table.name))).length;
  const areas = [...new Set(modelTables.map((table) => table.area || '(sin area)'))].sort();
  const areaCoverage = areas.map((area) => {
    const areaTables = modelTables.filter((table) => (table.area || '(sin area)') === area);
    const exactAreaTables = areaTables.filter((table) => sqlByName.has(lower(table.name))).length;
    const exactAreaComparisons = tableComparisons.filter((table) => table.status === 'EXACT_TABLE_NAME' && (table.area || '(sin area)') === area);
    return {
      area,
      modelTables: areaTables.length,
      exactSqlTables: exactAreaTables,
      missingSqlTables: areaTables.length - exactAreaTables,
      exactCoveragePercent: pct(exactAreaTables, areaTables.length),
      missingColumnsOnExactTables: exactAreaComparisons.reduce((sum, table) => sum + Number(table.missingColumns || 0), 0),
      extraColumnsOnExactTables: exactAreaComparisons.reduce((sum, table) => sum + Number(table.extraColumns || 0), 0),
      primaryKeyMismatches: exactAreaComparisons.filter((table) => table.primaryKeyMatch === false).length
    };
  });
  const historicalCandidatesForMissingTables = renameCandidates.filter((item) => (
    modelOnlyTables.some((table) => lower(table.name) === lower(item.likelyCurrentModelTable))
  )).length;
  const uniqueSqlIndexCount = new Set(sqlIndexes.map((index) => `${lower(index.schemaName)}\u0000${lower(index.tableName)}\u0000${lower(index.indexName)}`)).size;
  const nonEmptyTables = sqlTables.filter((table) => Number(table.rowCount) > 0);
  const exactTablesWithoutDetectedStructuralDifferences = tableComparisons.filter((table) => (
    table.status === 'EXACT_TABLE_NAME'
    && Number(table.missingColumns) === 0
    && Number(table.extraColumns) === 0
    && Number(table.typeFamilyMismatches) === 0
    && table.primaryKeyMatch === true
  )).length;
  const isEquivalent = exactTables === modelTables.length
    && sqlTables.length === modelTables.length
    && missingColumns === 0
    && extraColumns === 0
    && typeMismatches === 0
    && pkMismatches === 0;
  const summary = {
    generatedAt: new Date().toISOString(),
    verdict: isEquivalent ? 'EQUIVALENT' : 'NOT_EQUIVALENT',
    verdictReason: isEquivalent
      ? 'El esquema fisico coincide con las tablas, columnas, familias de tipo y llaves primarias declaradas por el XPZ.'
      : 'La base contiene solo una fraccion o una version diferente del esquema fisico declarado por el XPZ actual.',
    safety: {
      comparisonMode: bool(databaseInfo.isReadOnly) ? 'READ_ONLY attached copy' : 'SELECT-only metadata queries against attached database',
      databaseWasReadOnly: bool(databaseInfo.isReadOnly),
      writesPerformedByAnalyzer: false
    },
    attachedDatabaseFiles: databaseFiles,
    sourceFiles: {
      mdf: fileMetadata(sourceMdf),
      ldf: fileMetadata(sourceLdf),
      originalDatabaseVersion: sourceDatabaseVersion,
      newerNetworkReference: referenceMdfSize || referenceMdfTime ? {
        observedSizeBytes: referenceMdfSize,
        observedLastWriteTime: referenceMdfTime,
        availableDuringComparison: false
      } : null
    },
    sqlServer: databaseInfo,
    modelSource: modelSummary.source,
    modelKnowledgeBase: modelSummary.knowledgeBase,
    counts: {
      modelTables: modelTables.length,
      sqlTables: sqlTables.length,
      exactTableNameMatches: exactTables,
      exactTablesWithoutDetectedStructuralDifferences,
      exactModelTableCoveragePercent: pct(exactTables, modelTables.length),
      exactSqlTableRecognitionPercent: pct(exactTables, sqlTables.length),
      modelOnlyTables: modelOnlyTables.length,
      sqlOnlyTables: sqlOnlyTables.length,
      likelyHistoricalRenames: renameCandidates.length,
      historicalCandidatesCoveringMissingModelTables: historicalCandidatesForMissingTables,
      modelStoredColumns: modelColumns.length,
      sqlColumns: sqlColumns.length,
      matchedColumnsOnExactTables: matchedColumns,
      missingColumnsOnExactTables: missingColumns,
      extraColumnsOnExactTables: extraColumns,
      typeFamilyMismatchesOnMatchedColumns: typeMismatches,
      sqlPrimaryKeys: new Set(sqlPrimaryKeys.map((keyPart) => `${lower(keyPart.schemaName)}\u0000${lower(keyPart.tableName)}`)).size,
      matchingPrimaryKeysOnExactTables: pkMatches,
      differingPrimaryKeysOnExactTables: pkMismatches,
      sqlIndexes: uniqueSqlIndexCount,
      sqlForeignKeys: new Set(sqlForeignKeys.map((foreignKey) => `${lower(foreignKey.schemaName)}\u0000${lower(foreignKey.foreignKeyName)}`)).size,
      sqlComputedColumns: sqlColumns.filter((column) => bool(column.isComputed)).length,
      nonEmptySqlTables: nonEmptyTables.length
    },
    nonEmptyTables: nonEmptyTables.map((table) => ({ table: table.tableName, rows: table.rowCount })),
    areaCoverage,
    sqlOnlyTables: sqlOnlyTables.map((table) => table.tableName),
    notes: [
      'La ausencia de llaves foraneas es coherente con la configuracion GeneXus Database Referential Integrity = No, pero no prueba equivalencia.',
      'Las coincidencias de tipo comparan familias logicas; no certifican por si solas precision, escala ni longitud.',
      'Los candidatos de renombre son evidencia historica y no deben aplicarse como cambios automaticos.'
    ]
  };

  writeCsv('sql-tables.csv', ['schemaName', 'tableName', 'rowCount', 'createDate', 'modifyDate'], sqlTables);
  writeCsv('sql-columns.csv', ['schemaName', 'tableName', 'ordinal', 'columnName', 'dataType', 'maxLengthBytes', 'characterLength', 'numericPrecision', 'numericScale', 'isNullable', 'isIdentity', 'isComputed', 'computedDefinition', 'defaultDefinition', 'collation'], sqlColumns);
  writeCsv('sql-primary-keys.csv', ['schemaName', 'tableName', 'constraintName', 'keyOrdinal', 'columnName', 'isDescending'], sqlPrimaryKeys);
  writeCsv('sql-indexes.csv', ['schemaName', 'tableName', 'indexName', 'indexType', 'isUnique', 'isPrimaryKey', 'isUniqueConstraint', 'keyOrdinal', 'isIncluded', 'isDescending', 'columnName', 'filterDefinition'], sqlIndexes);
  writeCsv('sql-foreign-keys.csv', ['schemaName', 'tableName', 'foreignKeyName', 'columnOrdinal', 'columnName', 'referencedSchema', 'referencedTable', 'referencedColumn', 'deleteAction', 'updateAction', 'isDisabled'], sqlForeignKeys);
  writeCsv('table-comparison.csv', ['table', 'area', 'framework', 'status', 'sqlRows', 'modelStoredColumns', 'sqlColumns', 'matchedColumns', 'missingColumns', 'extraColumns', 'typeFamilyMismatches', 'modelPrimaryKey', 'sqlPrimaryKey', 'primaryKeyMatch', 'modelIndexCount', 'sqlIndexCount'], tableComparisons);
  writeCsv('column-differences.csv', ['table', 'column', 'difference', 'modelType', 'sqlType', 'modelLength', 'sqlLength', 'modelDecimals', 'sqlScale', 'detail'], columnDifferences);
  writeCsv('rename-candidates.csv', ['sqlTable', 'likelyCurrentModelTable', 'confidence', 'heuristicScore', 'primaryKeySimilarity', 'columnSimilarity', 'nameSimilarity', 'rationale'], renameCandidates);
  writeCsv('area-coverage.csv', ['area', 'modelTables', 'exactSqlTables', 'missingSqlTables', 'exactCoveragePercent', 'missingColumnsOnExactTables', 'extraColumnsOnExactTables', 'primaryKeyMismatches'], areaCoverage);
  fs.writeFileSync(path.join(outputDir, 'comparison-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  const renameRows = renameCandidates.map((item) => `| ${item.sqlTable} | ${item.likelyCurrentModelTable} | ${item.confidence} | ${item.rationale} |`).join('\n');
  const dataRows = nonEmptyTables.map((table) => `| ${table.tableName} | ${table.rowCount} |`).join('\n');
  const pkDifferenceRows = tableComparisons
    .filter((table) => table.status === 'EXACT_TABLE_NAME' && table.primaryKeyMatch === false)
    .map((table) => `| ${table.table} | ${table.modelPrimaryKey.replace(/\|/g, '\\|')} | ${table.sqlPrimaryKey.replace(/\|/g, '\\|')} |`)
    .join('\n');
  const areaCoverageRows = areaCoverage
    .map((area) => `| ${area.area} | ${area.modelTables} | ${area.exactSqlTables} | ${area.missingSqlTables} | ${area.exactCoveragePercent}% | ${area.missingColumnsOnExactTables} | ${area.primaryKeyMismatches} |`)
    .join('\n');
  const bodCoverage = areaCoverage.find((area) => lower(area.area) === 'bod');
  const bodCoverageFinding = bodCoverage && bodCoverage.missingSqlTables > 0
    ? `\n\nEl area \`bod\` es la brecha principal: solo ${bodCoverage.exactSqlTables} de ${bodCoverage.modelTables} tablas coinciden por nombre y faltan ${bodCoverage.missingSqlTables}. Esta base no es suficiente como esquema equivalente para el modulo de bodega.`
    : '';
  const networkReferenceLine = referenceMdfSize || referenceMdfTime
    ? `- Referencia de red observada previamente: ${referenceMdfSize ? `${referenceMdfSize.toLocaleString('en-US')} bytes` : 'tamano no registrado'}${referenceMdfTime ? `, fecha ${referenceMdfTime}` : ''}; no estuvo disponible para adjuntarla durante este contraste.\n`
    : '';
  const attachedFilesText = databaseFiles.map((file) => `\`${file.physicalName}\` (${Number(file.allocatedBytes).toLocaleString('en-US')} bytes, ${file.fileType})`).join('; ');
  const analysisSafetyText = bool(databaseInfo.isReadOnly)
    ? 'El analisis se realizo sobre una copia adjunta en modo `READ_ONLY`; el analizador no ejecuto cambios.'
    : 'El analisis uso exclusivamente consultas `SELECT` de metadatos sobre la base adjunta; no ejecuto DDL, DML ni cambios de configuracion.';
  const report = `# Contraste de BDAPERP local con el modelo GeneXus\n\n## Veredicto\n\n**${isEquivalent ? 'EQUIVALENTE' : 'NO EQUIVALENTE'}.** ${isEquivalent ? 'El esquema fisico coincide con el XPZ bajo los controles aplicados.' : `La base representa un esquema anterior o parcial: solo ${exactTables} de ${modelTables.length} tablas del XPZ actual coinciden por nombre (${pct(exactTables, modelTables.length)}%).`}\n\n${analysisSafetyText}\n\n## Fuentes comparadas\n\n- Modelo: \`${modelSummary.source.label}\`, SHA-256 \`${modelSummary.source.sha256}\`.\n- Base adjunta: ${attachedFilesText || 'archivos no informados por SQL Server'}.\n${sourceMdf ? `- Archivo fuente verificado: \`${sourceMdf}\`${fs.existsSync(sourceMdf) ? `, ${fs.statSync(sourceMdf).size.toLocaleString('en-US')} bytes, fecha ${fs.statSync(sourceMdf).mtime.toISOString()}` : ''}.\n` : ''}${networkReferenceLine}- Version interna original informada por SQL Server: ${sourceDatabaseVersion || 'no registrada'}; compatibilidad: ${databaseInfo.compatibilityLevel}.\n- Instancia de estudio: ${databaseInfo.serverName}, SQL Server ${databaseInfo.productVersion}.\n\n## Resultado estructural\n\n| Medida | XPZ actual | SQL local | Resultado |\n|---|---:|---:|---|\n| Tablas | ${modelTables.length} | ${sqlTables.length} | ${exactTables} coincidencias exactas |\n| Tablas sin diferencias en los controles aplicados | ${modelTables.length} | n/a | ${exactTablesWithoutDetectedStructuralDifferences} |\n| Columnas almacenadas/fisicas | ${modelColumns.length} | ${sqlColumns.length} | ${matchedColumns} coincidencias en tablas de igual nombre |\n| Llaves primarias | ${modelTables.length} declaradas | ${summary.counts.sqlPrimaryKeys} | ${pkMatches} iguales y ${pkMismatches} distintas en tablas coincidentes |\n| Indices fisicos | n/a como equivalencia directa | ${uniqueSqlIndexCount} | inventariados |\n| Llaves foraneas | GX configurado para no generarlas | ${summary.counts.sqlForeignKeys} | coherente, no concluyente |\n| Columnas calculadas SQL | formulas GX no necesariamente fisicas | ${summary.counts.sqlComputedColumns} | inventariadas |\n\nHay ${modelOnlyTables.length} tablas del modelo que no existen con ese nombre en la base local y ${sqlOnlyTables.length} tablas locales sin nombre exacto en el XPZ. ${renameCandidates.length ? `${historicalCandidatesForMissingTables} tablas locales parecen nombres historicos de tablas actualmente faltantes. Aun considerando esas asociaciones, faltan al menos ${modelOnlyTables.length - historicalCandidatesForMissingTables} tablas del modelo actual.` : ''}\n\nEn las ${exactTables} tablas de nombre coincidente se detectaron ${missingColumns} columnas esperadas ausentes, ${extraColumns} columnas locales adicionales y ${typeMismatches} incompatibilidades de familia de tipo. El detalle completo esta en \`column-differences.csv\`.\n\n## Cobertura por area\n\n| Area | Tablas XPZ | Coincidencias SQL | Ausentes | Cobertura | Columnas ausentes | Llaves distintas |\n|---|---:|---:|---:|---:|---:|---:|\n${areaCoverageRows}${bodCoverageFinding}\n\n## Diferencias de llave\n\n| Tabla | Llave del XPZ actual | Llave SQL local |\n|---|---|---|\n${pkDifferenceRows || '| Ninguna | | |'}\n\n${pkMismatches ? 'Estas diferencias impiden considerar equivalente el alcance multiempresa y la identidad de los registros dentro del subconjunto presente.' : 'Las llaves primarias de las tablas coincidentes son iguales.'}\n\n## Nombres historicos probables\n\n| Tabla SQL local | Tabla probable del XPZ actual | Confianza | Evidencia |\n|---|---|---|---|\n${renameRows || '| Ninguna | | | |'}\n\nEstas asociaciones no autorizan renombrar ni reorganizar la base; deben validarse contra reglas y datos antes de migrar.\n\n## Datos presentes\n\n${nonEmptyTables.length} tablas tienen filas en esta base:\n\n| Tabla | Filas |\n|---|---:|\n${dataRows || '| Ninguna | 0 |'}\n\n## Conclusion para la migracion\n\n${isEquivalent ? 'El esquema puede considerarse equivalente bajo los controles estructurales ejecutados; las reglas de negocio y los datos requieren validacion separada.' : 'Esta base no puede usarse como representacion fisica equivalente del XPZ analizado. Puede utilizarse como fuente parcial, pero cada tabla migrada debe validarse contra el modelo actual y sus reglas.'}\n\n## Artefactos\n\n- \`comparison-summary.json\`: resultado y conteos verificables.\n- \`area-coverage.csv\`: cobertura de tablas por area del modelo.\n- \`table-comparison.csv\`: cobertura, columnas, llaves e indices por tabla.\n- \`column-differences.csv\`: diferencias de columnas y tipos.\n- \`rename-candidates.csv\`: posibles correspondencias historicas.\n- \`sql-tables.csv\`, \`sql-columns.csv\`, \`sql-primary-keys.csv\`, \`sql-indexes.csv\`, \`sql-foreign-keys.csv\`: inventario fisico extraido.\n`;
  fs.writeFileSync(path.join(outputDir, 'README.md'), report, 'utf8');

  console.log(JSON.stringify({ outputDir, verdict: summary.verdict, counts: summary.counts }, null, 2));
};

main();
