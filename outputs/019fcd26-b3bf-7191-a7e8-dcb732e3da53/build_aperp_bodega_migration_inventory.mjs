import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const sourcePath = 'C:/ProyectosAP/aperp-bodega/documentacionIA/APERP_Bodega.xpz';
const outputDir = 'C:/ProyectosAP/aperp-bodega/backendAperpBodega/outputs/019fcd26-b3bf-7191-a7e8-dcb732e3da53';
const outputPath = path.join(outputDir, 'Inventario_Migracion_APERP_Bodega.xlsx');

const asArray = (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const safeSheetText = (value) => clean(value).replace(/^=/, "'");
const formatLastUpdate = (value) => value
  ? `\u200B${String(value).replace('T', ' ').replace(/\.\d+(?:Z)?$/, '')}`
  : '';

const main = async () => {
  const sourceBuffer = await fs.readFile(sourcePath);
  const zip = await JSZip.loadAsync(sourceBuffer);
  const xmlEntry = Object.values(zip.files).find((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.xml'));
  if (!xmlEntry) throw new Error('La exportacion XPZ no contiene un XML.');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    parseTagValue: false,
    trimValues: false
  });
  const exportFile = parser.parse((await xmlEntry.async('text'))).ExportFile;
  const objects = asArray(exportFile.Objects?.Object);
  const references = asArray(exportFile.Dependencies?.Reference);
  const typeNames = new Map(references
    .filter((item) => String(item['@Type']) === 'Object')
    .map((item) => [String(item['@Id']), clean(item.Properties?.['@Name']) || String(item['@Id'])]));

  const typedObjects = objects.map((object) => ({
    ...object,
    typeName: typeNames.get(String(object['@type'])) || String(object['@type'])
  }));
  const byGuid = new Map(typedObjects.map((object) => [String(object['@guid']), object]));
  const modulesByGuid = new Map(typedObjects
    .filter((object) => object.typeName === 'Module')
    .map((object) => [String(object['@guid']), clean(object['@name'])]));

  const folderPath = (object) => {
    const folders = [];
    const seen = new Set();
    let parentGuid = String(object['@parentGuid'] || '');
    while (parentGuid && byGuid.has(parentGuid) && !seen.has(parentGuid)) {
      seen.add(parentGuid);
      const parent = byGuid.get(parentGuid);
      if (parent.typeName === 'Folder') folders.unshift(clean(parent['@name']));
      parentGuid = String(parent['@parentGuid'] || '');
    }
    return folders.join(' / ') || '(raíz)';
  };

  const rows = typedObjects.map((object) => {
    const qualifiedName = clean(object['@fullyQualifiedName']);
    const moduleName = modulesByGuid.get(String(object['@moduleGuid'])) || (qualifiedName.includes('.') ? qualifiedName.split('.')[0] : '(sin módulo)');
    const parent = byGuid.get(String(object['@parentGuid']));
    const lastUpdate = clean(object['@lastUpdate']);
    return {
      module: moduleName,
      folder: folderPath(object),
      type: object.typeName,
      name: clean(object['@name']),
      qualifiedName,
      description: clean(object['@description']),
      parent: clean(parent?.['@fullyQualifiedName'] || object['@parent'] || ''),
      lastUpdate,
      guid: clean(object['@guid'])
    };
  }).sort((left, right) =>
    left.module.localeCompare(right.module, 'es') ||
    left.folder.localeCompare(right.folder, 'es') ||
    left.type.localeCompare(right.type, 'es') ||
    left.name.localeCompare(right.name, 'es'));

  const summaryRows = [...new Map(rows.map((row) => {
    const key = [row.module, row.folder, row.type].join('\u0001');
    return [key, { module: row.module, folder: row.folder, type: row.type, count: 0 }];
  })).values()];
  for (const group of summaryRows) {
    group.count = rows.filter((row) => row.module === group.module && row.folder === group.folder && row.type === group.type).length;
  }
  summaryRows.sort((left, right) =>
    left.module.localeCompare(right.module, 'es') ||
    left.folder.localeCompare(right.folder, 'es') ||
    left.type.localeCompare(right.type, 'es'));

  const workbook = Workbook.create();
  const summary = workbook.worksheets.add('Resumen');
  const detail = workbook.worksheets.add('Detalle de objetos');
  summary.showGridLines = false;
  detail.showGridLines = false;

  const lastDetailRow = rows.length + 4;
  summary.mergeCells('A1:F1');
  summary.getRange('A1').values = [['Inventario de migración — APERP Bodega']];
  summary.getRange('A2:F2').merge();
  summary.getRange('A2').values = [[`Fuente: ${path.basename(sourcePath)} · XML: ${xmlEntry.name} · Extraído el 2026-08-04`]];
  summary.getRange('A4:B7').values = [
    ['Indicador', 'Valor'],
    ['Objetos exportados', null],
    ['Módulos identificados', null],
    ['Folders identificados', null]
  ];
  summary.getRange('B5').formulas = [[`=COUNTA('Detalle de objetos'!D5:D${lastDetailRow})`]];
  summary.getRange('B6').formulas = [[`=COUNTA(UNIQUE('Detalle de objetos'!A5:A${lastDetailRow}))`]];
  summary.getRange('B7').formulas = [[`=COUNTIF('Detalle de objetos'!C5:C${lastDetailRow},"Folder")`]];
  summary.getRange('D4:F7').values = [
    ['Cobertura', 'Valor', 'Nota'],
    ['Tipos de objeto', null, 'Clasificación original de GeneXus'],
    ['Archivo fuente', path.basename(sourcePath), 'Exportación XPZ suministrada'],
    ['Alcance', 'Módulo Bodega', 'No infiere estado de migración']
  ];
  summary.getRange('E5').formulas = [[`=COUNTA(UNIQUE('Detalle de objetos'!C5:C${lastDetailRow}))`]];

  summary.getRange('A10:D10').values = [['Módulo', 'Folder', 'Tipo de objeto', 'Cantidad']];
  if (summaryRows.length) {
    summary.getRangeByIndexes(10, 0, summaryRows.length, 4).values = summaryRows.map((row) => [
      safeSheetText(row.module), safeSheetText(row.folder), safeSheetText(row.type), row.count
    ]);
    summary.tables.add(`A10:D${summaryRows.length + 10}`, true, 'ResumenObjetos');
  }

  detail.mergeCells('A1:I1');
  detail.getRange('A1').values = [['Detalle de objetos — APERP Bodega']];
  detail.mergeCells('A2:I2');
  detail.getRange('A2').values = [['Las tres primeras columnas responden al orden solicitado: Módulo, Folder y Tipo de objeto.']];
  detail.getRange('A4:I4').values = [[
    'Módulo', 'Folder', 'Tipo de objeto', 'Nombre', 'Nombre calificado', 'Descripción', 'Padre', 'Última actualización', 'GUID'
  ]];
  if (rows.length) {
    detail.getRangeByIndexes(4, 0, rows.length, 9).values = rows.map((row) => [
      safeSheetText(row.module), safeSheetText(row.folder), safeSheetText(row.type), safeSheetText(row.name),
      safeSheetText(row.qualifiedName), safeSheetText(row.description), safeSheetText(row.parent),
      formatLastUpdate(row.lastUpdate), safeSheetText(row.guid)
    ]);
    detail.tables.add(`A4:I${lastDetailRow}`, true, 'DetalleObjetos');
  }

  const titleFormat = { fill: '#0B559B', font: { bold: true, color: '#FFFFFF', size: 16 }, horizontalAlignment: 'left', verticalAlignment: 'center' };
  const subtitleFormat = { fill: '#DCEAF7', font: { color: '#244A6C', italic: true }, verticalAlignment: 'center' };
  const headerFormat = { fill: '#1F6FAF', font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true };
  summary.getRange('A1:F1').format = titleFormat;
  detail.getRange('A1:I1').format = titleFormat;
  summary.getRange('A2:F2').format = subtitleFormat;
  detail.getRange('A2:I2').format = subtitleFormat;
  summary.getRange('A4:B4').format = headerFormat;
  summary.getRange('D4:F4').format = headerFormat;
  summary.getRange('A10:D10').format = headerFormat;
  detail.getRange('A4:I4').format = headerFormat;
  summary.getRange('A4:B7').format.borders = { preset: 'all', style: 'thin', color: '#B8C7D9' };
  summary.getRange('D4:F7').format.borders = { preset: 'all', style: 'thin', color: '#B8C7D9' };
  summary.getRange('A10:D10').format.borders = { preset: 'outside', style: 'thin', color: '#B8C7D9' };
  summary.getRange('B5:B7').format.numberFormat = '#,##0';
  summary.getRange('E5').format.numberFormat = '#,##0';
  summary.getRange('D11:D' + (summaryRows.length + 10)).format.numberFormat = '#,##0';
  summary.getRange('A1:F1').format.rowHeight = 28;
  detail.getRange('A1:I1').format.rowHeight = 28;
  summary.getRange('A2:F2').format.rowHeight = 22;
  detail.getRange('A2:I2').format.rowHeight = 22;
  summary.getRange('A:D').format.autofitColumns();
  detail.getRange('A:I').format.autofitColumns();
  summary.getRange('A:A').format.columnWidth = 24;
  summary.getRange('B:B').format.columnWidth = 26;
  summary.getRange('C:C').format.columnWidth = 24;
  summary.getRange('D:D').format.columnWidth = 12;
  summary.getRange('E:E').format.columnWidth = 24;
  summary.getRange('F:F').format.columnWidth = 36;
  detail.getRange('A:A').format.columnWidth = 18;
  detail.getRange('B:B').format.columnWidth = 32;
  detail.getRange('C:C').format.columnWidth = 22;
  detail.getRange('D:D').format.columnWidth = 28;
  detail.getRange('E:E').format.columnWidth = 42;
  detail.getRange('F:F').format.columnWidth = 36;
  detail.getRange('G:G').format.columnWidth = 42;
  detail.getRange('H:H').format.columnWidth = 24;
  detail.getRange('I:I').format.columnWidth = 38;
  detail.getRange(`A5:I${lastDetailRow}`).format.wrapText = false;
  summary.freezePanes.freezeRows(10);
  detail.freezePanes.freezeRows(4);
  detail.freezePanes.freezeColumns(3);

  await fs.mkdir(outputDir, { recursive: true });
  const file = await SpreadsheetFile.exportXlsx(workbook);
  await file.save(outputPath);

  const inspect = await workbook.inspect({
    kind: 'table',
    range: 'Resumen!A1:F16',
    include: 'values,formulas',
    tableMaxRows: 16,
    tableMaxCols: 6
  });
  const errors = await workbook.inspect({
    kind: 'match',
    searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
    options: { useRegex: true, maxResults: 50 },
    summary: 'formula errors'
  });
  const summaryPng = await workbook.render({ sheetName: 'Resumen', range: 'A1:F24', scale: 1.5, format: 'png' });
  const detailPng = await workbook.render({ sheetName: 'Detalle de objetos', range: 'A1:I22', scale: 1.2, format: 'png' });
  await fs.writeFile(path.join(outputDir, 'inventario_resumen.png'), new Uint8Array(await summaryPng.arrayBuffer()));
  await fs.writeFile(path.join(outputDir, 'inventario_detalle.png'), new Uint8Array(await detailPng.arrayBuffer()));
  console.log(JSON.stringify({ outputPath, objects: rows.length, modules: new Set(rows.map((row) => row.module)).size, folders: rows.filter((row) => row.type === 'Folder').length, types: new Set(rows.map((row) => row.type)).size }));
  console.log(inspect.ndjson);
  console.log(errors.ndjson);
};

await main();
