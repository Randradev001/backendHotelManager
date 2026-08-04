import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const xpzPath = 'C:/ProyectosAP/aperp-bodega/documentacionIA/APERP_Bodega.xpz';
const workbookPath = 'C:/ProyectosAP/aperp-bodega/documentacionIA/Inventario_Migracion_APERP_Bodega.xlsx';
const outputDir = 'C:/ProyectosAP/aperp-bodega/backendAperpBodega/outputs/019fcd26-b3bf-7191-a7e8-dcb732e3da53/maestros_artic';
const asArray = (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const sourceBuffer = await fs.readFile(xpzPath);
const zip = await JSZip.loadAsync(sourceBuffer);
const xmlEntry = Object.values(zip.files).find((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.xml'));
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', parseTagValue: false, trimValues: false });
const exportFile = parser.parse((await xmlEntry.async('text'))).ExportFile;
const objects = asArray(exportFile.Objects?.Object);
const references = asArray(exportFile.Dependencies?.Reference);
const typeNames = new Map(references
  .filter((item) => String(item['@Type']) === 'Object')
  .map((item) => [String(item['@Id']), clean(item.Properties?.['@Name']) || String(item['@Id'])]));
const typed = objects.map((object) => ({ ...object, typeName: typeNames.get(String(object['@type'])) || String(object['@type']) }));
const byGuid = new Map(typed.map((object) => [String(object['@guid']), object]));
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
const rows = typed
  .map((object) => ({
    type: object.typeName,
    name: clean(object['@name']),
    fqn: clean(object['@fullyQualifiedName']),
    description: clean(object['@description']),
    folder: folderPath(object),
    parent: clean(byGuid.get(String(object['@parentGuid']))?.['@fullyQualifiedName'] || object['@parent'] || ''),
    parts: asArray(object.Part).map((part) => String(part['@type'] || '')).filter(Boolean),
    lastUpdate: clean(object['@lastUpdate'])
  }))
  .filter((row) => row.folder === 'Maestros_Artic' || row.folder.startsWith('Maestros_Artic / '))
  .sort((left, right) => left.folder.localeCompare(right.folder, 'es') || left.type.localeCompare(right.type, 'es') || left.name.localeCompare(right.name, 'es'));
const typeCounts = Object.entries(rows.reduce((result, row) => ({ ...result, [row.type]: (result[row.type] || 0) + 1 }), {})).sort(([left], [right]) => left.localeCompare(right));
const blob = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(blob);
const summary = await workbook.inspect({ kind: 'table', range: 'Resumen!A1:F16', include: 'values,formulas', tableMaxRows: 16, tableMaxCols: 6 });
const details = await workbook.inspect({ kind: 'table', range: 'Detalle de objetos!A1:I12', include: 'values,formulas', tableMaxRows: 12, tableMaxCols: 9 });
const preview = await workbook.render({ sheetName: 'Resumen', range: 'A1:F24', scale: 1.5, format: 'png' });
await fs.writeFile(`${outputDir}/referencia_resumen.png`, new Uint8Array(await preview.arrayBuffer()));
await fs.writeFile(`${outputDir}/maestros_artic.json`, JSON.stringify({ count: rows.length, typeCounts, rows }, null, 2));
console.log(JSON.stringify({ count: rows.length, typeCounts, rows }, null, 2));
console.log(summary.ndjson);
console.log(details.ndjson);
