import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const source = 'C:/ProyectosAP/aperp-bodega/documentacionIA/Inventario_Migracion_APERP_Bodega.xlsx';
const outputDir = 'C:/ProyectosAP/aperp-bodega/backendAperpBodega/outputs/019fcd26-b3bf-7191-a7e8-dcb732e3da53';
const outputPath = `${outputDir}/Inventario_Migracion_APERP_Bodega.xlsx`;

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const detail = workbook.worksheets.getItem('Detalle de objetos');
const used = detail.getUsedRange();
const rows = used.values;
const headerRowIndex = rows.findIndex((row) => row.some((value) => String(value) === 'Nombre calificado'));
if (headerRowIndex < 0) throw new Error('No se encontró la fila de encabezados del inventario.');
const headers = rows[headerRowIndex].map((value) => String(value));
const qualifiedIndex = headers.indexOf('Nombre calificado');
const statusIndex = headers.indexOf('Estado');

if (qualifiedIndex < 0 || statusIndex < 0) throw new Error('No se encontraron las columnas requeridas en el inventario.');

for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
  if (rows[rowIndex][qualifiedIndex] === 'bod.Fam' || rows[rowIndex][qualifiedIndex] === 'bod.FamTipo') {
    detail.getCell(rowIndex, statusIndex).values = [['Implementado - pendiente SQL']];
  }
}

const check = await workbook.inspect({
  kind: 'table',
  range: 'Detalle de objetos!A1:I20',
  include: 'values',
  tableMaxRows: 20,
  tableMaxCols: 9,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 50 },
  summary: 'formula error scan',
});
console.log(errors.ndjson);

for (const sheetName of ['Resumen', 'Detalle de objetos']) {
  const rendered = await workbook.render({ sheetName, autoCrop: 'all', scale: 1, format: 'png' });
  await fs.writeFile(`${outputDir}/${sheetName.replaceAll(' ', '_')}.png`, new Uint8Array(await rendered.arrayBuffer()));
}

await fs.mkdir(outputDir, { recursive: true });
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);
console.log(outputPath);
