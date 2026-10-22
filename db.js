const sql = require('mssql');

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'PECANTOJOS',
  user: 'sa',
  password: 'CAMBIAR_SOLO_EN_TU_PC', // ⚠ credencial escrita en el código: problema que resuelve el ADR-002
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('Conexion a SQL Server establecida');
  }
  return pool;
}

module.exports = { getPool, sql };