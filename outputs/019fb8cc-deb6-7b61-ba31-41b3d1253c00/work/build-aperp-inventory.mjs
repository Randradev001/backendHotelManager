import fs from 'node:fs/promises';
import path from 'node:path';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const root = 'C:/Proyectos2025/aperp Bod/backendAperp/backendCOBodega';
const study = path.join(root, 'docs/migration/aperp-model-study');
const outputDir = path.join(root, 'outputs/019fb8cc-deb6-7b61-ba31-41b3d1253c00');
const outputPath = path.join(outputDir, 'Inventario_GX18_APERP_Actualizado_2026-08-04.xlsx');

const COLORS = {
  navy: '#20323F',
  green: '#2F7D5C',
  blue: '#2E5D7B',
  paleBlue: '#EAF1F5',
  paleGreen: '#E9F3EE',
  gold: '#E0AA38',
  body: '#F3F5F6',
  ink: '#24313A',
  border: '#D7E0E3'
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

const loadCsv = async (name) => parseCsv(await fs.readFile(path.join(study, name), 'utf8'));
const safe = (value) => value ?? '';

const columnLetter = (index) => {
  let value = index;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
};

const standardHeader = {
  fill: COLORS.navy,
  font: { bold: true, color: '#FFFFFF', fontSize: 10, name: 'Aptos' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  wrapText: true,
  borders: { preset: 'outside', style: 'thin', color: COLORS.navy }
};

const standardBody = {
  fill: '#FFFFFF',
  font: { color: COLORS.ink, fontSize: 9, name: 'Aptos' },
  verticalAlignment: 'top',
  wrapText: false,
  borders: { preset: 'insideHorizontal', style: 'thin', color: COLORS.border }
};

const addDataSheet = (workbook, name, headers, rows, widths = []) => {
  const sheet = workbook.worksheets.add(name);
  sheet.showGridLines = false;
  const data = [headers, ...rows.map((row) => headers.map((header) => safe(row[header])))];
  const lastCol = columnLetter(headers.length);
  const lastRow = data.length;
  const range = sheet.getRange(`A1:${lastCol}${lastRow}`);
  range.values = data;
  sheet.getRange(`A1:${lastCol}1`).format = standardHeader;
  if (lastRow > 1) sheet.getRange(`A2:${lastCol}${lastRow}`).format = standardBody;
  sheet.getRange(`A1:${lastCol}1`).format.rowHeight = 32;
  for (let index = 0; index < headers.length; index += 1) {
    sheet.getRange(`${columnLetter(index + 1)}:${columnLetter(index + 1)}`).format.columnWidth = widths[index] || 18;
    if (/actualizacion/i.test(headers[index])) {
      sheet.getRange(`${columnLetter(index + 1)}2:${columnLetter(index + 1)}${lastRow}`).format.numberFormat = 'yyyy-mm-dd hh:mm';
    }
  }
  sheet.freezePanes.freezeRows(1);
  if (lastRow > 1) {
    const table = sheet.tables.add(`A1:${lastCol}${lastRow}`, true, `Table${name.replace(/[^A-Za-z0-9]/g, '')}`.slice(0, 240));
    table.showFilterButton = true;
  }
  return { sheet, range: `A1:${lastCol}${lastRow}` };
};

const objectRow = (object) => ({
  Tipo: object.type,
  'Nombre GX': object.name,
  Descripcion: object.description,
  Carpeta: object.parent,
  'Ultima actualizacion': object.lastUpdate,
  ID: object.guid,
  Area: object.area,
  Framework: object.framework,
  Usuario: object.user,
  'Nombre completo': object.fullyQualifiedName
});

const classifyTarget = (type) => {
  if (type === 'Procedure') return 'Backend Node.js';
  if (type === 'Transaction') return 'API + interfaz';
  if (type.includes('Panel') || type.includes('WorkWithPlus')) return 'Frontend React';
  if (type === 'Table') return 'SQL Server';
  return 'Analisis';
};

const summaryFormula = (sheetName, endRow) => `=COUNTA('${sheetName}'!A2:A${Math.max(2, endRow)})`;

const main = async () => {
  const [summary, objects, transactions, tables, attributes, confirmedRelations, candidateRelations] = await Promise.all([
    fs.readFile(path.join(study, 'model-summary.json'), 'utf8').then(JSON.parse),
    loadCsv('objects.csv'),
    loadCsv('transactions.csv'),
    loadCsv('tables.csv'),
    loadCsv('attributes.csv'),
    loadCsv('relations-confirmed.csv'),
    loadCsv('relations-candidates.csv')
  ]);

  const allObjectRows = objects.map(objectRow);
  const procedures = objects.filter((object) => object.type === 'Procedure').map(objectRow);
  const panels = objects.filter((object) => object.type.includes('Panel') || object.type.includes('WorkWithPlus')).map(objectRow);
  const reports = objects.filter((object) => object.type === 'Report').map(objectRow);
  const groups = objects.filter((object) => ['Category', 'Module', 'Subtype Group'].includes(object.type)).map(objectRow);
  const folders = objects.filter((object) => object.type === 'Folder').map(objectRow);
  const mainTypes = new Set(['Procedure', 'Transaction', 'Web Master Panel', 'WorkWithPlus', 'Table', 'Folder', 'Category', 'Module', 'Subtype Group', 'Report']);
  const otherObjects = objects.filter((object) => !mainTypes.has(object.type)).map(objectRow);

  const txRows = transactions.map((tx) => ({
    Area: tx.area,
    Transaccion: tx.transaction,
    'Nombre completo': tx.transactionFqn,
    Framework: tx.framework,
    Descripcion: tx.description,
    Nivel: tx.levelDepth,
    'Tabla raiz': tx.parentTable,
    'Llave primaria': tx.primaryKey,
    Indices: tx.indexCount,
    Columnas: tx.columnCount,
    'Columnas almacenadas': tx.storedColumnCount,
    Formulas: tx.formulaCount,
    'Niveles hijos': tx.childLevelCount || '',
    'Metodo de resolucion': tx.resolutionMethods,
    'Ultima actualizacion': tx.lastUpdate
  }));

  const tableRows = tables.map((table) => ({
    Area: table.area,
    Tabla: table.table,
    'Nombre completo': table.fullyQualifiedName,
    Transaccion: table.transaction,
    Nivel: table.levelDepth,
    'Llave primaria': table.primaryKey,
    Columnas: table.columnCount,
    'Con GECODEMP/EmpCod': table.hasCompanyAttribute,
    Observacion: table.notes || table.resolutionMethods || ''
  }));

  const attributeRows = attributes.map((attribute) => ({
    Atributo: attribute.name,
    Descripcion: attribute.description,
    Dominio: attribute.domain,
    Tipo: attribute.type,
    Largo: attribute.length,
    Decimales: attribute.decimals,
    Formula: attribute.formula,
    Tablas: attribute.tables,
    'Es clave': attribute.isKey
  }));

  const dependencyRows = [
    ...confirmedRelations.map((relation) => ({
      Area: relation.area,
      Padre: relation.parentTransaction,
      Hijo: relation.childTransaction,
      Tabla: relation.table,
      Llave: relation.keyAttribute,
      Estado: 'Confirmada',
      Observacion: relation.note || relation.rationale || ''
    })),
    ...candidateRelations.map((relation) => ({
      Area: relation.area,
      Padre: relation.parentTransaction,
      Hijo: relation.childTransaction,
      Tabla: relation.table,
      Llave: relation.keyAttribute,
      Estado: 'Requiere revision',
      Observacion: relation.note || relation.rationale || relation.reason || ''
    }))
  ];

  const reviewRows = objects.map((object) => ({
    Tipo: object.type,
    'Nombre GX': object.fullyQualifiedName,
    Area: object.area,
    Framework: object.framework,
    Destino: classifyTarget(object.type),
    Estado: object.framework === 'true' ? 'Fuera de alcance' : 'Pendiente',
    Prioridad: object.type === 'Transaction' || object.type === 'Procedure' ? 'Alta' : 'Media',
    Dependencias: '',
    Observaciones: object.description
  }));

  const procedureMigrationRows = objects.filter((object) => object.type === 'Procedure').map((object) => ({
    'Nombre GX': object.fullyQualifiedName,
    Area: object.area,
    Descripcion: object.description,
    'Destino tecnico': 'Backend Node.js',
    Estrategia: 'Analizar reglas, tablas y dependencias antes de migrar',
    'Entradas conocidas': '',
    'Salidas conocidas': '',
    'Tablas involucradas': '',
    Estado: object.framework === 'true' ? 'Fuera de alcance' : 'Pendiente',
    Prioridad: 'Alta',
    Evidencia: '',
    Observaciones: ''
  }));

  const masterRows = [
    ['Seguridad', 'Usuarios, Roles y Asignaciones', 'GECODEMP', 'Implementado', 'Alta', 'Alineado con g_emp y asignaciones GeneXus'],
    ['Empresa', 'Seguridad.Empresas', 'g_emp / GECODEMP', 'Implementado', 'Alta', 'Maestro raíz; eliminación deshabilitada'],
    ['Especies', 'ESPECIES / ESPECIES1', 'EmpCod + Especod', 'Implementado', 'Alta', 'Cabecera-detalle'],
    ['Envases', 'ENVCAT / ENVCAT1', 'EmpCod + EnvCod', 'Implementado', 'Alta', 'Cabecera-detalle'],
    ['Productores', 'PRODUCTORES / PRODUCTORES1', 'EmpCod + ProdCod', 'Implementado', 'Alta', 'Cabecera-detalle'],
    ['Clientes', 'CLIENTES', 'EmpCod + CliCod', 'Implementado', 'Media', 'Control de dependencias antes de eliminar'],
    ['Agentes', 'AGENTES', 'EmpCod + AgeCod', 'Implementado', 'Media', 'Control de dependencias antes de eliminar'],
    ['Consignatarios', 'CONSIG', 'EmpCod + ConsCod', 'Implementado', 'Media', 'Control de dependencias antes de eliminar'],
    ['Bodega', 'Objetos área bod', 'GECODEMP', 'En estudio', 'Alta', 'Confirmar equivalencia física SQL'],
    ['Facturación', 'Objetos Facturacion', 'GECODEMP', 'En estudio', 'Alta', 'Priorizar documentos y DTE']
  ];

  const workbook = Workbook.create();
  const summarySheet = workbook.worksheets.add('Resumen');
  summarySheet.showGridLines = false;
  summarySheet.getRange('A1:H1').merge();
  summarySheet.getRange('A1').values = [['Inventario General GeneXus 18 - APERP']];
  summarySheet.getRange('A1:H1').format = {
    fill: COLORS.navy,
    font: { bold: true, color: '#FFFFFF', fontSize: 22, name: 'Aptos Display' },
    verticalAlignment: 'center'
  };
  summarySheet.getRange('A1:H1').format.rowHeight = 40;
  summarySheet.getRange('A4:B4').values = [['Dato', 'Valor']];
  summarySheet.getRange('A4:B4').format = { fill: COLORS.green, font: { bold: true, color: '#FFFFFF' } };
  summarySheet.getRange('A5:B8').values = [
    ['Modelo', summary.knowledgeBase.name],
    ['Tipo de modelo', `GeneXus 18 / ${summary.knowledgeBase.generatedLanguage}`],
    ['Origen', summary.source.label],
    ['Inventario generado', new Date()]
  ];
  summarySheet.getRange('A5:A8').format = { font: { bold: true, color: COLORS.ink } };
  summarySheet.getRange('B5:B8').format = { fill: COLORS.paleGreen, font: { color: COLORS.ink } };
  summarySheet.getRange('B8').format.numberFormat = 'yyyy-mm-dd hh:mm';
  summarySheet.getRange('D4:G4').values = [['Objetos GX', 'Procedimientos', 'Tablas', 'Atributos']];
  summarySheet.getRange('D4:G4').format = { fill: COLORS.blue, font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center' };
  summarySheet.getRange('D5:G5').formulas = [[
    summaryFormula('Todos Objetos', allObjectRows.length + 1),
    summaryFormula('Procedimientos', procedures.length + 1),
    summaryFormula('Tablas', tableRows.length + 1),
    summaryFormula('Atributos', attributeRows.length + 1)
  ]];
  summarySheet.getRange('D5:G5').format = { fill: COLORS.paleBlue, font: { bold: true, color: COLORS.blue, fontSize: 18, name: 'Aptos Display' }, horizontalAlignment: 'center' };
  summarySheet.getRange('A10:C10').values = [['Clasificacion', 'Cantidad', 'Hoja de trabajo']];
  summarySheet.getRange('A10:C10').format = { fill: COLORS.gold, font: { bold: true, color: COLORS.navy } };
  summarySheet.getRange('A11:C18').values = [
    ['Procedimientos', null, 'Procedimientos'],
    ['Transacciones', null, 'Transacciones'],
    ['Paneles', null, 'Paneles'],
    ['Reportes', null, 'Reportes'],
    ['Tablas', null, 'Tablas'],
    ['Atributos', null, 'Atributos'],
    ['Grupos / módulos', null, 'Grupos'],
    ['Carpetas', null, 'Carpetas']
  ];
  summarySheet.getRange('B11:B18').formulas = [[
    summaryFormula('Procedimientos', procedures.length + 1)
  ], [
    summaryFormula('Transacciones', txRows.length + 1)
  ], [
    summaryFormula('Paneles', panels.length + 1)
  ], [
    summaryFormula('Reportes', reports.length + 1)
  ], [
    summaryFormula('Tablas', tableRows.length + 1)
  ], [
    summaryFormula('Atributos', attributeRows.length + 1)
  ], [
    summaryFormula('Grupos', groups.length + 1)
  ], [
    summaryFormula('Carpetas', folders.length + 1)
  ]];
  summarySheet.getRange('A11:C18').format = { fill: COLORS.body, font: { color: COLORS.ink } };
  summarySheet.getRange('B11:B18').format = { fill: COLORS.body, font: { bold: true, color: COLORS.ink }, horizontalAlignment: 'right' };
  summarySheet.getRange('E10:H10').merge();
  summarySheet.getRange('E10').values = [['Como usar este inventario']];
  summarySheet.getRange('E10:H10').format = { fill: COLORS.green, font: { bold: true, color: '#FFFFFF' } };
  summarySheet.getRange('E11:H14').merge();
  summarySheet.getRange('E11').values = [['El libro conserva los nombres APERP extraídos del XPZ. Use "Revision general" para clasificar cada objeto y "Migracion procedimientos" para documentar reglas, dependencias, destino técnico y evidencia de pruebas.']];
  summarySheet.getRange('E11:H14').format = { fill: COLORS.paleGreen, font: { color: COLORS.ink }, wrapText: true, verticalAlignment: 'top' };
  summarySheet.getRange('E16:H16').values = [['Dependencias detectadas', 'Requieren revision', 'Revision general', 'Revision procedimientos']];
  summarySheet.getRange('E16:H16').format = { fill: COLORS.blue, font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center' };
  summarySheet.getRange('E17:H17').formulas = [[
    `=COUNTA('Dependencias'!F2:F${dependencyRows.length + 1})`,
    `=COUNTIF('Dependencias'!F2:F${dependencyRows.length + 1},"Requiere revision")`,
    summaryFormula('Revision general', reviewRows.length + 1),
    summaryFormula('Migracion procedimientos', procedureMigrationRows.length + 1)
  ]];
  summarySheet.getRange('E17:H17').format = { fill: COLORS.paleBlue, font: { bold: true, color: COLORS.blue, fontSize: 16 }, horizontalAlignment: 'center' };
  summarySheet.getRange('A20:H20').merge();
  summarySheet.getRange('A20').values = [['Estado de migracion APERP - 2026-08-04']];
  summarySheet.getRange('A20:H20').format = { fill: COLORS.green, font: { bold: true, color: '#FFFFFF' } };
  summarySheet.getRange('A21:H21').values = [['Maestros implementados', 8, 'Objetos en estudio', 2, 'Tablas con empresa', summary.companyScope.applicationTablesWithCompanyAttribute, 'Base SQL verificada', 'BDAPERP']];
  summarySheet.getRange('A21:H21').format = { fill: COLORS.paleGreen, font: { color: COLORS.ink } };
  summarySheet.getRange('A21:H21').getCell(0, 1).format.font = { bold: true, color: COLORS.ink };
  summarySheet.getRange('A21:H21').getCell(0, 3).format.font = { bold: true, color: COLORS.ink };
  summarySheet.getRange('A21:H21').getCell(0, 5).format.font = { bold: true, color: COLORS.ink };
  summarySheet.getRange('A21:H21').getCell(0, 7).format.font = { bold: true, color: COLORS.ink };
  ['A','B','C','D','E','F','G','H'].forEach((column, index) => { summarySheet.getRange(`${column}:${column}`).format.columnWidth = [24, 37, 20, 19, 24, 18, 21, 24][index]; });
  summarySheet.freezePanes.freezeRows(4);

  addDataSheet(workbook, 'Todos Objetos', ['Tipo', 'Nombre GX', 'Descripcion', 'Carpeta', 'Ultima actualizacion', 'ID', 'Area', 'Framework', 'Usuario', 'Nombre completo'], allObjectRows, [18, 28, 34, 28, 21, 38, 16, 12, 22, 42]);
  addDataSheet(workbook, 'Procedimientos', ['Tipo', 'Nombre GX', 'Descripcion', 'Carpeta', 'Ultima actualizacion', 'ID', 'Area', 'Framework', 'Usuario', 'Nombre completo'], procedures, [18, 30, 38, 28, 21, 38, 16, 12, 22, 44]);
  addDataSheet(workbook, 'Transacciones', ['Area', 'Transaccion', 'Nombre completo', 'Framework', 'Descripcion', 'Nivel', 'Tabla raiz', 'Llave primaria', 'Indices', 'Columnas', 'Columnas almacenadas', 'Formulas', 'Niveles hijos', 'Metodo de resolucion', 'Ultima actualizacion'], txRows, [14, 22, 34, 12, 28, 10, 20, 34, 10, 11, 18, 10, 14, 25, 21]);
  addDataSheet(workbook, 'Paneles', ['Tipo', 'Nombre GX', 'Descripcion', 'Carpeta', 'Ultima actualizacion', 'ID', 'Area', 'Framework', 'Usuario', 'Nombre completo'], panels, [22, 32, 38, 28, 21, 38, 16, 12, 22, 44]);
  addDataSheet(workbook, 'Reportes', ['Tipo', 'Nombre GX', 'Descripcion', 'Carpeta', 'Ultima actualizacion', 'ID', 'Area', 'Framework', 'Usuario', 'Nombre completo'], reports, [18, 30, 38, 28, 21, 38, 16, 12, 22, 44]);
  addDataSheet(workbook, 'Tablas', ['Area', 'Tabla', 'Nombre completo', 'Transaccion', 'Nivel', 'Llave primaria', 'Columnas', 'Con GECODEMP/EmpCod', 'Observacion'], tableRows, [16, 24, 34, 28, 10, 38, 12, 22, 36]);
  addDataSheet(workbook, 'Atributos', ['Atributo', 'Descripcion', 'Dominio', 'Tipo', 'Largo', 'Decimales', 'Formula', 'Tablas', 'Es clave'], attributeRows, [26, 35, 24, 22, 12, 12, 34, 58, 14]);
  addDataSheet(workbook, 'Dependencias', ['Area', 'Padre', 'Hijo', 'Tabla', 'Llave', 'Estado', 'Observacion'], dependencyRows, [16, 28, 28, 24, 24, 20, 48]);
  addDataSheet(workbook, 'Grupos', ['Tipo', 'Nombre GX', 'Descripcion', 'Carpeta', 'Ultima actualizacion', 'ID', 'Area', 'Framework', 'Usuario', 'Nombre completo'], groups, [18, 28, 34, 28, 21, 38, 16, 12, 22, 44]);
  addDataSheet(workbook, 'Carpetas', ['Tipo', 'Nombre GX', 'Descripcion', 'Carpeta', 'Ultima actualizacion', 'ID', 'Area', 'Framework', 'Usuario', 'Nombre completo'], folders, [18, 28, 34, 28, 21, 38, 16, 12, 22, 44]);
  addDataSheet(workbook, 'Otros GX', ['Tipo', 'Nombre GX', 'Descripcion', 'Carpeta', 'Ultima actualizacion', 'ID', 'Area', 'Framework', 'Usuario', 'Nombre completo'], otherObjects, [24, 30, 38, 28, 21, 38, 16, 12, 22, 44]);
  addDataSheet(workbook, 'Revision general', ['Tipo', 'Nombre GX', 'Area', 'Framework', 'Destino', 'Estado', 'Prioridad', 'Dependencias', 'Observaciones'], reviewRows, [22, 42, 16, 12, 20, 20, 14, 24, 42]);
  addDataSheet(workbook, 'Migracion procedimientos', ['Nombre GX', 'Area', 'Descripcion', 'Destino tecnico', 'Estrategia', 'Entradas conocidas', 'Salidas conocidas', 'Tablas involucradas', 'Estado', 'Prioridad', 'Evidencia', 'Observaciones'], procedureMigrationRows, [42, 16, 34, 20, 44, 24, 24, 26, 18, 14, 22, 34]);

  const masterSheet = workbook.worksheets.add('Estado maestros');
  masterSheet.showGridLines = false;
  masterSheet.getRange('A1:H1').merge();
  masterSheet.getRange('A1').values = [['Estado de migracion de maestros APERP']];
  masterSheet.getRange('A1:H1').format = { fill: COLORS.navy, font: { bold: true, color: '#FFFFFF', fontSize: 18, name: 'Aptos Display' } };
  masterSheet.getRange('A3:F3').values = [['Area', 'Objeto / transaccion', 'Llave / tabla', 'Estado', 'Prioridad', 'Observacion']];
  masterSheet.getRange('A3:F3').format = { fill: COLORS.green, font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center' };
  masterSheet.getRange(`A4:F${masterRows.length + 3}`).values = masterRows;
  masterSheet.getRange(`A4:F${masterRows.length + 3}`).format = { fill: '#FFFFFF', font: { color: COLORS.ink }, borders: { preset: 'insideHorizontal', style: 'thin', color: COLORS.border } };
  masterSheet.getRange(`D4:D${masterRows.length + 3}`).conditionalFormats.add('containsText', { text: 'Implementado', format: { fill: '#DCEFE5', font: { color: '#1E6B4F', bold: true } } });
  masterSheet.getRange(`D4:D${masterRows.length + 3}`).conditionalFormats.add('containsText', { text: 'En estudio', format: { fill: '#FFF1CC', font: { color: '#8A5D00', bold: true } } });
  [16, 32, 28, 18, 14, 48].forEach((width, index) => { masterSheet.getRange(`${columnLetter(index + 1)}:${columnLetter(index + 1)}`).format.columnWidth = width; });
  masterSheet.getRange(`A3:F${masterRows.length + 3}`).format.wrapText = true;
  masterSheet.freezePanes.freezeRows(3);
  masterSheet.tables.add(`A3:F${masterRows.length + 3}`, true, 'TableEstadoMaestros');

  const check = await workbook.inspect({ kind: 'table', range: 'Resumen!A1:H21', include: 'values,formulas', tableMaxRows: 22, tableMaxCols: 8 });
  console.log(check.ndjson);
  const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A', options: { useRegex: true, maxResults: 100 }, summary: 'formula scan' });
  console.log(errors.ndjson);

  await fs.mkdir(outputDir, { recursive: true });
  for (const sheetName of workbook.worksheets.items.map((sheet) => sheet.name)) {
    const image = await workbook.render({ sheetName, range: sheetName === 'Resumen' ? 'A1:H21' : 'A1:H15', scale: 1, format: 'png' });
    await fs.writeFile(path.join(outputDir, `preview-${sheetName.replace(/[^A-Za-z0-9]/g, '_')}.png`), new Uint8Array(await image.arrayBuffer()));
  }

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  console.log(`EXPORTED ${outputPath}`);
};

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
