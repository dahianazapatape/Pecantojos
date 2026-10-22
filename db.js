const sql = require('mssql');
const config = require('./src/config/dbConfig'); // ADR-002: configuración externalizada (.env)

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('Conexion a SQL Server establecida');
  }
  return pool;
}

module.exports = { getPool, sql };
