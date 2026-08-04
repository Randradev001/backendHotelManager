const test = require('node:test');
const assert = require('node:assert/strict');

const { catalogs } = require('../src/services/seguridadCatalogos.service');

test('ProgTipo admite exclusivamente programas de usuario o de sistema', () => {
  const field = catalogs.programas.fields.ProgTipo;

  assert.equal(field.required, true);
  assert.equal(field.defaultValue, 1);
  assert.deepEqual(field.choices, [1, 2]);
});
