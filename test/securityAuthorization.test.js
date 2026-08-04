const test = require('node:test');
const assert = require('node:assert/strict');

const { hasPermission, requireSecurityAdmin } = require('../src/middleware/securityAuthorization');

const response = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const withAdminEnv = (values, callback) => {
  const names = ['SECURITY_ADMIN_LOGINS', 'SECURITY_ADMIN_ROLES', 'SECURITY_ADMIN_MIN_LEVEL'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  names.forEach((name) => {
    if (values[name] === undefined) delete process.env[name];
    else process.env[name] = values[name];
  });
  try {
    callback();
  } finally {
    names.forEach((name) => {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    });
  }
};

test('autoriza programas y acciones con la llave completa GeneXus', () => {
  const permissions = {
    programas: [{ SistCod: 1, Modcod: 2, ProgCod: 3 }],
    acciones: [{ SistCod: 1, Modcod: 2, ProgCod: 3, ProgOPCod: 4 }]
  };

  assert.equal(hasPermission(permissions, { sistema: 1, modulo: 2, programa: 3 }), true);
  assert.equal(hasPermission(permissions, { sistema: 1, modulo: 2, programa: 3, accion: 4 }), true);
  assert.equal(hasPermission(permissions, { sistema: 1, modulo: 2, programa: 3, accion: 5 }), false);
});

test('ADMINFULL administra seguridad sin depender de NIVSEG', () => withAdminEnv({}, () => {
  const req = { auth: { user: { login: 'usuario', nivelSeguridad: 0, roles: ['adminfull'] } } };
  const res = response();
  let called = false;

  requireSecurityAdmin(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.equal(res.statusCode, null);
}));

test('un nivel alto no concede administracion si APERP no configura el umbral', () => withAdminEnv({}, () => {
  const req = { auth: { user: { login: 'usuario', nivelSeguridad: 999, roles: [] } } };
  const res = response();

  requireSecurityAdmin(req, res, () => assert.fail('No debio autorizar por nivel.'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'SECURITY_ADMIN_REQUIRED');
}));

test('el umbral legado solo se usa cuando se configura expresamente', () => withAdminEnv({ SECURITY_ADMIN_MIN_LEVEL: '900' }, () => {
  const req = { auth: { user: { login: 'usuario', nivelSeguridad: 900, roles: [] } } };
  const res = response();
  let called = false;

  requireSecurityAdmin(req, res, () => { called = true; });

  assert.equal(called, true);
}));
