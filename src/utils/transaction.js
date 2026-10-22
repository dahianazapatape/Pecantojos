/**
 * Utilidades de transacción — ADR-003 (docs/adr/0003-control-transaccional.md).
 *
 * withTransaction(work): abre una transacción, ejecuta `work(tx)` y hace COMMIT si todo sale
 * bien o ROLLBACK si algo lanza un error (el error se vuelve a lanzar para que el controller
 * responda). getRequest(tx): devuelve un Request ligado a la transacción (si se pasa `tx`) o
 * al pool normal (si no), así los repositories funcionan con y sin transacción.
 */
const { getPool, sql } = require('../../db');

async function withTransaction(work) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const resultado = await work(tx);
    await tx.commit();
    return resultado;
  } catch (err) {
    try {
      await tx.rollback();
    } catch (rollbackErr) {
      // Si el rollback falla (conexión caída), se informa el error original, no este.
    }
    throw err;
  }
}

async function getRequest(tx) {
  if (tx) return new sql.Request(tx);
  const pool = await getPool();
  return pool.request();
}

module.exports = { withTransaction, getRequest };
