const sql = require('mssql');

async function testWinAuth() {
  console.log('--- Probando Autenticación Windows / Trusted Connection ---');
  const config = {
    server: 'localhost',
    database: 'BDAPERP',
    options: {
      instanceName: 'SQLEXPRESS',
      trustedConnection: true,
      trustServerCertificate: true
    }
  };

  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT DB_NAME() AS current_db, COUNT(*) AS table_count FROM sys.tables");
    console.log('✅ Conexión con Autenticación Windows exitosa!');
    console.log('Base de datos activa:', result.recordset[0].current_db);
    console.log('Total tablas:', result.recordset[0].table_count);
    await pool.close();
  } catch (err) {
    console.error('❌ Error Windows Auth:', err.message);
  }
}

testWinAuth();
