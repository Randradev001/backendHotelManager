const test = require('node:test');
const assert = require('node:assert/strict');

const { catalogs } = require('../src/controllers/maestrosController');

test('bod.Fam y bod.FamTipo conservan sus claves GeneXus y empresa autenticada', () => {
  assert.deepEqual(catalogs.tiposFamilia.primaryKey, ['EmpCod', 'FamTCod']);
  assert.deepEqual(catalogs.familias.primaryKey, ['EmpCod', 'FamFam']);
  assert.equal(catalogs.tiposFamilia.columnMap.EmpCod, 'GECODEMP');
  assert.equal(catalogs.familias.columnMap.EmpCod, 'GECODEMP');
  assert.equal(catalogs.tiposFamilia.requiresEmpCod, true);
  assert.equal(catalogs.familias.requiresEmpCod, true);
});

test('bod.Fam mantiene el tipo como relacion controlada por backend', () => {
  assert.equal(catalogs.familias.fields.FamTCod.required, true);
  assert.equal(catalogs.familias.fields.FamTDescrip.serverManaged, true);
  assert.equal(catalogs.familias.allowDelete, false);
  assert.deepEqual(catalogs.tiposFamilia.deleteDependencies, [
    { table: 'Fam', fields: ['EmpCod', 'FamTCod'], columnMap: { EmpCod: 'GECODEMP' } }
  ]);
});
