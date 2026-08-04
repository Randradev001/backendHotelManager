require('dotenv').config();
const { getPool, sql } = require('../src/conectorMysql/conectorSqlServer');

async function testConnection() {
  console.log('--- Probando Conexión a Base de Datos APERP ---');
  console.log('Host:', process.env.SQLSERVER_HOST);
  console.log('Database:', process.env.SQLSERVER_DATABASE);
  console.log('Instance:', process.env.SQLSERVER_INSTANCE);

  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT DB_NAME() AS current_db, COUNT(*) AS table_count FROM sys.tables");
    console.log('✅ Conexión exitosa!');
    console.log('Base de Datos Activa:', result.recordset[0].current_db);
    console.log('Total de Tablas en BD:', result.recordset[0].table_count);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
}

testConnection();
