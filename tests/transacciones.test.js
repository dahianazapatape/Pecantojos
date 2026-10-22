/**
 * Pruebas de ADR-003 (control transaccional) — sin base de datos real.
 * Reemplaza `db.js` por un simulador y verifica que:
 *   - si todos los pasos funcionan  -> COMMIT y no ROLLBACK
 *   - si un paso falla a mitad      -> ROLLBACK y no COMMIT (y el error llega al llamador)
 * Ejecutar con:  npm test   (equivale a: node --test)
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const eventos = [];
let queryNumber = 0;
let failOnQuery = null; // número de consulta (1-based) que debe fallar

class FakeRequest {
  constructor() { this.params = {}; }
  input(name, _type, value) { this.params[name] = value; return this; }
  async query(text) {
    queryNumber += 1;
    eventos.push('QUERY ' + queryNumber);
    if (failOnQuery === queryNumber) throw new Error('fallo simulado en la consulta ' + queryNumber);
    const t = String(text);
    if (t.includes('SELECT stock_actual')) return { recordset: [{ stock_actual: 100 }] };
    if (t.includes('SELECT * FROM DETALLE_PEDIDOS')) return { recordset: [{ id_producto: 1, cantidad: 2 }] };
    if (t.includes('SELECT id_producto, cantidad')) return { recordset: [{ id_producto: 1, cantidad: 2 }] };
    if (t.includes('SELECT id FROM PEDIDOS')) return { recordset: [{ id: 10 }] };
    return { recordset: [] };
  }
}
class FakeTransaction {
  async begin() { eventos.push('BEGIN'); }
  async commit() { eventos.push('COMMIT'); }
  async rollback() { eventos.push('ROLLBACK'); }
}
const fakeSql = {
  Int: 'Int', VarChar: 'VarChar', Date: 'Date', Decimal: () => 'Decimal',
  Request: FakeRequest,
  Transaction: FakeTransaction,
};
const fakePool = { request: () => new FakeRequest() };

const dbPath = path.resolve(__dirname, '..', 'db.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getPool: async () => fakePool, sql: fakeSql },
};

const pedidoService = require('../src/services/pedidoService');
const clienteService = require('../src/services/clienteService');

function reset(fail = null) { eventos.length = 0; queryNumber = 0; failOnQuery = fail; }

test('agregarDetalle: todo bien -> COMMIT', async () => {
  reset();
  await pedidoService.agregarDetalle(5, { id_producto: 1, cantidad: 2, precio_unitario: 3000 });
  assert.ok(eventos.includes('COMMIT'));
  assert.ok(!eventos.includes('ROLLBACK'));
  assert.strictEqual(eventos[0], 'BEGIN');
});

test('agregarDetalle: falla el descuento de stock -> ROLLBACK, sin COMMIT', async () => {
  reset(3); // 1=leer stock, 2=insertar detalle, 3=descontar stock
  await assert.rejects(
    pedidoService.agregarDetalle(5, { id_producto: 1, cantidad: 2, precio_unitario: 3000 }),
    /fallo simulado/
  );
  assert.ok(eventos.includes('ROLLBACK'));
  assert.ok(!eventos.includes('COMMIT'));
});

test('agregarDetalle: stock insuficiente -> error 400 y ROLLBACK (no se escribe nada)', async () => {
  reset();
  await assert.rejects(
    pedidoService.agregarDetalle(5, { id_producto: 1, cantidad: 500, precio_unitario: 3000 }),
    (err) => err.status === 400 && /Stock insuficiente/.test(err.message)
  );
  assert.ok(eventos.includes('ROLLBACK'));
  assert.ok(!eventos.includes('COMMIT'));
});

test('eliminar cliente en cascada: falla a mitad -> ROLLBACK, sin COMMIT', async () => {
  reset(4); // 1=pedidos del cliente, 2=detalles, 3=devolver stock, 4=borrar pagos
  await assert.rejects(clienteService.eliminar(7), /fallo simulado/);
  assert.ok(eventos.includes('ROLLBACK'));
  assert.ok(!eventos.includes('COMMIT'));
});

test('eliminar cliente en cascada: todo bien -> COMMIT', async () => {
  reset();
  const r = await clienteService.eliminar(7);
  assert.match(r.message, /eliminados correctamente/);
  assert.ok(eventos.includes('COMMIT'));
});

test('eliminar pedido: falla al borrar el pedido -> ROLLBACK', async () => {
  reset(5); // 1=detalles, 2=devolver stock, 3=pagos, 4=detalles, 5=pedido
  await assert.rejects(pedidoService.eliminar(10), /fallo simulado/);
  assert.ok(eventos.includes('ROLLBACK'));
  assert.ok(!eventos.includes('COMMIT'));
});
