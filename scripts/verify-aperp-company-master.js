require('dotenv').config();
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const sql = require('mssql');

const config = {
  server: process.env.SQLSERVER_HOST,
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  database: process.env.SQLSERVER_DATABASE,
  port: 1433,
  options: {
    instanceName: process.env.SQLSERVER_INSTANCE,
    encrypt: process.env.SQLSERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQLSERVER_TRUST_CERT === 'true'
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

const expectedColumns = [
  'GECODEMP', 'GERAZSOC', 'GerazSMS', 'GEgiro1', 'GEgiro2', 'GEfonNum', 'GErut', 'GEDv',
  'GEdire', 'GEregion', 'GEciudad', 'GeComuna', 'GeCordinador', 'geCorreo', 'GeEstado',
  'GeLogo', 'GePaginaWeb', 'GeFecContIni', 'GeFecContFin'
];

async function verifyCompanyMaster() {
  const controllerPath = path.join(__dirname, '..', 'src', 'controllers', 'maestrosController.js');
  const controllerSource = fs.readFileSync(controllerPath, 'utf8');
  assert.match(controllerSource, /empresas:\s*\{[\s\S]*?table:\s*'g_emp'/, 'El catalogo empresas debe usar g_emp');

  const pool = await sql.connect(config);
  let transaction;

  try {
    const objects = await pool.request().query(`
      SELECT OBJECT_ID(N'dbo.g_emp', N'U') AS g_emp_id,
             OBJECT_ID(N'dbo.DEFEMP') AS defemp_id
    `);
    assert.ok(objects.recordset[0].g_emp_id, 'No existe dbo.g_emp');
    assert.equal(objects.recordset[0].defemp_id, null, 'DEFEMP no debe ser la equivalencia APERP');

    const columns = await pool.request().query(`
      SELECT name FROM sys.columns
      WHERE object_id = OBJECT_ID(N'dbo.g_emp')
      ORDER BY column_id
    `);
    assert.deepEqual(columns.recordset.map((column) => column.name), expectedColumns);

    const counts = await pool.request().query(`
      SELECT
        (SELECT COUNT_BIG(*) FROM dbo.g_emp) AS physical_count,
        (SELECT COUNT_BIG(*) FROM dbo.VW_APERP_SEG_EMPRESAS) AS security_view_count
    `);
    assert.equal(counts.recordset[0].physical_count, counts.recordset[0].security_view_count);

    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const testCode = 9999999001;
    const request = new sql.Request(transaction);
    request.input('code', sql.Decimal(10, 0), testCode);
    await request.query(`
      INSERT INTO dbo.g_emp (
        GECODEMP, GERAZSOC, GerazSMS, GEgiro1, GEgiro2, GEfonNum, GErut, GEDv,
        GEdire, GEregion, GEciudad, GeComuna, GeCordinador, geCorreo, GeEstado,
        GeLogo, GePaginaWeb, GeFecContIni, GeFecContFin
      ) VALUES (
        @code, N'VERIFICACION APERP', N'VERIF', N'PRUEBA', NULL, 0, 1, N'9',
        N'', N'', N'RANCAGUA', N'RANCAGUA', N'', N'', 1,
        0x, N'', '2026-01-01', '9999-12-31'
      );

      UPDATE dbo.g_emp SET GEregion=N'REVERTIR' WHERE GECODEMP=@code;
    `);

    const inserted = await new sql.Request(transaction)
      .input('code', sql.Decimal(10, 0), testCode)
      .query('SELECT GECODEMP, RTRIM(GEregion) AS GEregion FROM dbo.g_emp WHERE GECODEMP=@code');
    assert.equal(inserted.recordset[0]?.GEregion, 'REVERTIR');

    await transaction.rollback();
    transaction = null;

    const afterRollback = await pool.request()
      .input('code', sql.Decimal(10, 0), testCode)
      .query('SELECT COUNT(*) AS total FROM dbo.g_emp WHERE GECODEMP=@code');
    assert.equal(afterRollback.recordset[0].total, 0, 'La verificacion no debe dejar registros');

    console.log(`Maestro Empresa APERP verificado: ${counts.recordset[0].physical_count} empresas, escritura transaccional revertida.`);
  } finally {
    if (transaction) await transaction.rollback();
    await pool.close();
  }
}

verifyCompanyMaster().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
