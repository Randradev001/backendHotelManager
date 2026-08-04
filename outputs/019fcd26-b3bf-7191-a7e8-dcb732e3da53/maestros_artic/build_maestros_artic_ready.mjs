import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = 'C:/ProyectosAP/aperp-bodega/documentacionIA/Inventario_Migracion_APERP_Bodega.xlsx';
const outputPath = 'C:/ProyectosAP/aperp-bodega/backendAperpBodega/outputs/019fcd26-b3bf-7191-a7e8-dcb732e3da53/Inventario_Migracion_APERP_Bodega_Maestros_Artic_Ready.xlsx';
const outputDir = 'C:/ProyectosAP/aperp-bodega/backendAperpBodega/outputs/019fcd26-b3bf-7191-a7e8-dcb732e3da53/maestros_artic';

const migrationRows = [
  ['FamTipo', 'Transaction', 'FamTipo', 'GECODEMP, FamTCod', 'Tipos de familias de artículos', 'Empresa autenticada', 'Ready'],
  ['Fam', 'Transaction', 'Fam', 'GECODEMP, FamFam', 'Familias de artículos', 'FamTipo; empresa autenticada', 'Ready'],
  ['Gru', 'Transaction', 'Gru', 'GECODEMP, FamFam, GruGru', 'Grupos dentro de una familia', 'Fam; empresa autenticada', 'Ready'],
  ['MaeArt', 'Transaction', 'MaeArt', 'GECODEMP, FamFam, GruGru, ArtNum', 'Maestro de artículos', 'Fam, Gru, UMed; empresa autenticada', 'Ready'],
  ['ArtCodB', 'Transaction', 'ArtCodB', 'GECODEMP, ACBbarra', 'Códigos de barra por artículo', 'Artículo por familia/grupo; validar regla exacta', 'Ready'],
  ['CorMat', 'Transaction', 'CorMat', 'GECODEMP, corFam, corGru', 'Correlación contable/material', 'Fam, Gru; empresa autenticada', 'Ready'],
  ['PrecEspe', 'Transaction', 'PrecEspe', 'GECODEMP, FamFam, GruGru, ArtNum, PrEsFecD, PrEsFecH', 'Precios especiales por artículo y vigencia', 'MaeArt; validar solapamiento de fechas', 'Ready'],
  ['SalApe', 'Transaction', 'SalApe', 'GECODEMP, SalFam, SalGru, SalArt', 'Saldos de apertura por artículo', 'Artículo; validar efecto sobre existencias', 'Ready']
];

const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const detail = workbook.worksheets.getItem('Detalle de objetos');
const used = detail.getUsedRange(true);
const rowCount = used.rowCount;
const folderValues = detail.getRange(`B5:B${rowCount}`).values;
const statusValues = detail.getRange(`F5:F${rowCount}`).values;
let readyCount = 0;
for (let index = 0; index < folderValues.length; index += 1) {
  if (String(folderValues[index][0] || '').trim() === 'Maestros_Artic') {
    statusValues[index][0] = 'Ready';
    readyCount += 1;
  }
}
detail.getRange(`F5:F${rowCount}`).values = statusValues;
detail.getRange(`F5:F${rowCount}`).conditionalFormats.add('containsText', {
  text: 'Ready',
  format: { fill: '#E2F0D9', font: { bold: true, color: '#375623' } }
});

const plan = workbook.worksheets.getOrAdd('Plan Maestros_Artic');
plan.showGridLines = false;
plan.mergeCells('A1:G1');
plan.getRange('A1').values = [['Plan de migración — Maestros_Artic']];
plan.mergeCells('A2:G2');
plan.getRange('A2').values = [['Estado decidido: Ready. Se conserva el patrón técnico, visual y de seguridad ya usado por APERP Bodega.']];
plan.getRange('A4:B8').values = [
  ['Indicador', 'Valor'],
  ['Objetos Ready', readyCount],
  ['Transacciones principales', migrationRows.length],
  ['Patrón backend', 'Node.js + Express + mssql'],
  ['Patrón frontend', 'React + Vite + Material UI + TanStack Query']
];
plan.getRange('D4:G8').values = [
  ['Regla', 'Aplicación', 'Estado', 'Fuente'],
  ['Empresa', 'req.context.empCod; no aceptar EmpCod desde pantalla', 'Obligatorio', 'AGENTS.md'],
  ['Autorización', 'authContext + requirePermission por ruta', 'Obligatorio', 'ADR-001'],
  ['Niveles GX', 'Los detalles no se exponen como maestros independientes', 'Obligatorio', 'AGENTS.md'],
  ['Escrituras', 'Transacciones SQL y consultas parametrizadas', 'Obligatorio', 'Estilo backend actual']
];
plan.getRange('A10:G10').values = [['Objeto GX', 'Tipo', 'Tabla física', 'Llave primaria', 'Propósito', 'Dependencias', 'Estado']];
plan.getRangeByIndexes(10, 0, migrationRows.length, 7).values = migrationRows;
plan.getRange('A21:G21').merge();
plan.getRange('A21').values = [['Los paneles, prompts, selectores, WorkWithPlus y procedimientos auxiliares del folder quedan asociados al maestro correspondiente; no se migran como módulos independientes.']];

const titleFormat = { fill: '#0B559B', font: { bold: true, color: '#FFFFFF', size: 16 }, horizontalAlignment: 'left', verticalAlignment: 'center' };
const subtitleFormat = { fill: '#DCEAF7', font: { color: '#244A6C', italic: true }, verticalAlignment: 'center' };
const headerFormat = { fill: '#1F6FAF', font: { bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true };
plan.getRange('A1:G1').format = titleFormat;
plan.getRange('A2:G2').format = subtitleFormat;
plan.getRange('A4:B4').format = headerFormat;
plan.getRange('D4:G4').format = headerFormat;
plan.getRange('A10:G10').format = headerFormat;
plan.getRange('A4:B8').format.borders = { preset: 'all', style: 'thin', color: '#B8C7D9' };
plan.getRange('D4:G8').format.borders = { preset: 'all', style: 'thin', color: '#B8C7D9' };
plan.getRange(`A10:G${10 + migrationRows.length}`).format.borders = { preset: 'outside', style: 'thin', color: '#B8C7D9' };
plan.getRange(`G11:G${10 + migrationRows.length}`).conditionalFormats.add('containsText', {
  text: 'Ready',
  format: { fill: '#E2F0D9', font: { bold: true, color: '#375623' } }
});
plan.getRange('A1:G1').format.rowHeight = 28;
plan.getRange('A2:G2').format.rowHeight = 22;
plan.getRange('A21:G21').format = { fill: '#FFF2CC', font: { color: '#7F6000', italic: true }, wrapText: true, verticalAlignment: 'center' };
plan.getRange('A21:G21').format.rowHeight = 36;
plan.getRange('A:A').format.columnWidth = 20;
plan.getRange('B:B').format.columnWidth = 16;
plan.getRange('C:C').format.columnWidth = 18;
plan.getRange('D:D').format.columnWidth = 42;
plan.getRange('E:E').format.columnWidth = 34;
plan.getRange('F:F').format.columnWidth = 40;
plan.getRange('G:G').format.columnWidth = 15;
plan.getRange(`A11:G${10 + migrationRows.length}`).format.wrapText = true;
plan.freezePanes.freezeRows(10);
plan.freezePanes.freezeColumns(2);

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
const inspect = await workbook.inspect({ kind: 'table', range: 'Plan Maestros_Artic!A1:G21', include: 'values,formulas', tableMaxRows: 21, tableMaxCols: 7 });
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A', options: { useRegex: true, maxResults: 50 }, summary: 'formula errors' });
const detailPreview = await workbook.render({ sheetName: 'Detalle de objetos', range: 'A1:I26', scale: 1.2, format: 'png' });
const planPreview = await workbook.render({ sheetName: 'Plan Maestros_Artic', range: 'A1:G22', scale: 1.3, format: 'png' });
await fs.writeFile(`${outputDir}/detalle_ready.png`, new Uint8Array(await detailPreview.arrayBuffer()));
await fs.writeFile(`${outputDir}/plan_maestros_artic.png`, new Uint8Array(await planPreview.arrayBuffer()));
console.log(JSON.stringify({ outputPath, readyCount }));
console.log(inspect.ndjson);
console.log(errors.ndjson);
