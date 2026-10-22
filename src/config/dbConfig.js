/**
 * Configuración de conexión a SQL Server — ADR-002
 * (docs/adr/0002-externalizar-configuracion-conexion.md).
 *
 * Todos los parámetros salen de variables de entorno (.env, cargado con dotenv). No hay
 * usuario, contraseña ni servidor escritos en el código. Copia .env.example a .env y
 * completa tus datos.
 */
require('dotenv').config();

const REQUERIDAS = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const faltantes = REQUERIDAS.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  throw new Error(
    `Faltan variables de entorno para conectar a la base de datos: ${faltantes.join(', ')}. ` +
    'Copia .env.example a .env y completa los valores.'
  );
}

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Con una instancia con nombre (ej. localhost\SQLEXPRESS) NO se debe indicar puerto:
// SQL Server lo resuelve solo. Solo se agrega si DB_PORT está definido.
if (process.env.DB_PORT) {
  config.port = parseInt(process.env.DB_PORT, 10);
}

module.exports = config;
