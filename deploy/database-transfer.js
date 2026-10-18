const sql = require('mssql');
require('dotenv').config();

const [action, backupPath] = process.argv.slice(2);
const literal = (value) => `N'${String(value).replaceAll("'", "''")}'`;

async function main() {
  if (!['backup', 'restore'].includes(action) || !backupPath?.startsWith('/var/opt/mssql/')) {
    throw new Error('Uso: node deploy/database-transfer.js backup|restore /var/opt/mssql/data/hotelmanager.bak');
  }
  const pool = await sql.connect({
    server: process.env.SQLSERVER_HOST,
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    database: 'master',
    port: 1433,
    options: { encrypt: true, trustServerCertificate: true },
    requestTimeout: 600000
  });
  try {
    if (action === 'backup') {
      await pool.request().query(`BACKUP DATABASE [HotelManagerDB] TO DISK=${literal(backupPath)} WITH COPY_ONLY, CHECKSUM`);
    } else {
      const existing = await pool.request().query("SELECT DB_ID(N'HotelManagerDB') AS id");
      if (existing.recordset[0].id !== null) throw new Error('HotelManagerDB ya existe; no se sobrescribira.');
      const header = await pool.request().query(`RESTORE HEADERONLY FROM DISK=${literal(backupPath)}`);
      const backups = header.recordset.filter((row) => row.DatabaseName === 'HotelManagerDB' && row.BackupType === 1);
      const backup = backups.sort((a, b) => b.Position - a.Position)[0];
      if (!backup) throw new Error('El archivo no contiene un backup completo de HotelManagerDB.');
      const position = Number(backup.Position);
      const files = await pool.request().query(`RESTORE FILELISTONLY FROM DISK=${literal(backupPath)} WITH FILE=${position}`);
      if (files.recordset.some((file) => !['D', 'L'].includes(file.Type))) throw new Error('Backup con tipos de archivo no soportados por este asistente.');
      const moves = files.recordset.map((file, index) => `MOVE ${literal(file.LogicalName)} TO ${literal(`/var/opt/mssql/data/HotelManagerDB_${index}.${file.Type === 'L' ? 'ldf' : 'mdf'}`)}`);
      await pool.request().query(`RESTORE VERIFYONLY FROM DISK=${literal(backupPath)} WITH FILE=${position}, CHECKSUM`);
      await pool.request().query(`RESTORE DATABASE [HotelManagerDB] FROM DISK=${literal(backupPath)} WITH FILE=${position}, ${moves.join(', ')}, RECOVERY`);
    }
    console.log(`${action} de HotelManagerDB completado.`);
  } finally {
    await pool.close();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
