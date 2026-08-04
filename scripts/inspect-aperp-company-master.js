require('dotenv').config();
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

async function inspectCompanyMaster() {
  const pool = await sql.connect(config);

  try {
    const objects = await pool.request().query(`
      SELECT name, type_desc
      FROM sys.objects
      WHERE name IN ('DEFEMP', 'g_emp', 'VW_APERP_SEG_EMPRESAS')
      ORDER BY name
    `);

    const columns = await pool.request().query(`
      SELECT
        c.column_id,
        c.name,
        TYPE_NAME(c.user_type_id) AS data_type,
        c.max_length,
        c.precision,
        c.scale,
        c.is_nullable,
        dc.definition AS default_definition
      FROM sys.columns c
      LEFT JOIN sys.default_constraints dc ON dc.object_id = c.default_object_id
      WHERE c.object_id = OBJECT_ID(N'dbo.g_emp')
      ORDER BY c.column_id
    `);

    const rows = await pool.request().query(`
      SELECT
        GECODEMP, RTRIM(GERAZSOC) AS GERAZSOC, RTRIM(GerazSMS) AS GerazSMS,
        RTRIM(GEgiro1) AS GEgiro1, RTRIM(COALESCE(GEgiro2, '')) AS GEgiro2,
        GEfonNum, GErut, RTRIM(GEDv) AS GEDv, RTRIM(GEdire) AS GEdire,
        RTRIM(GEregion) AS GEregion, RTRIM(GEciudad) AS GEciudad,
        RTRIM(GeComuna) AS GeComuna, RTRIM(GeCordinador) AS GeCordinador,
        RTRIM(geCorreo) AS geCorreo, GeEstado, RTRIM(GePaginaWeb) AS GePaginaWeb,
        GeFecContIni, GeFecContFin
      FROM dbo.g_emp
      ORDER BY GECODEMP
    `);

    console.log(JSON.stringify({
      database: process.env.SQLSERVER_DATABASE,
      objects: objects.recordset,
      columns: columns.recordset,
      companies: rows.recordset
    }, null, 2));
  } finally {
    await pool.close();
  }
}

inspectCompanyMaster().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
