/**
 * Pruebas de ADR-005 (validación de datos de entrada) — sin base de datos real.
 * Reemplaza `db.js` por un simulador y verifica que:
 *   - un dato inválido responde 400 con un mensaje claro
 *   - un dato inválido NO llega a la base de datos (0 consultas, no se abre transacción)
 *   - un dato válido sigue funcionando igual que antes
 * Ejecutar con:  npm test   (equivale a: node --test)
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const eventos = [];

class FakeRequest {
  input() { return this; }
  async query(text) {
    eventos.push('QUERY');
    const t = String(text);
    if (t.includes('SELECT stock_actual')) return { recordset: [{ stock_actual: 100 }] };
    if (t.includes('INSERT INTO CLIENTE') || t.includes('INSERT INTO PEDIDOS')) return { recordset: [{ id: 1 }] };
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

const dbPath = path.resolve(__dirname, '..', 'db.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getPool: async () => ({ request: () => new FakeRequest() }), sql: fakeSql },
};

const pedidoService = require('../src/services/pedidoService');
const clienteService = require('../src/services/clienteService');

function reset() { eventos.length = 0; }

/** Comprueba que la promesa falla con 400 y que el mensaje menciona `texto`. */
async function rechaza400(promesa, texto) {
  await assert.rejects(promesa, (err) => {
    assert.strictEqual(err.status, 400);
    assert.match(err.message, texto);
    return true;
  });
}

// ---------- Detalle de pedido (el caso más crítico: toca inventario) ----------

test('agregarDetalle: cantidad negativa -> 400 y no toca la base de datos', async () => {
  reset();
  await rechaza400(
    pedidoService.agregarDetalle(5, { id_producto: 1, cantidad: -3, precio_unitario: 3000 }),
    /cantidad/
  );
  assert.deepStrictEqual(eventos, [], 'no debe abrir transacción ni ejecutar consultas');
});

test('agregarDetalle: cantidad vacía o texto -> 400 (antes se guardaba NaN)', async () => {
  for (const cantidad of ['', 'abc', undefined, 0, 2.5]) {
    reset();
    await rechaza400(
      pedidoService.agregarDetalle(5, { id_producto: 1, cantidad, precio_unitario: 3000 }),
      /cantidad/
    );
    assert.deepStrictEqual(eventos, []);
  }
});

test('agregarDetalle: varios errores a la vez -> un solo 400 que los lista todos', async () => {
  reset();
  await assert.rejects(
    pedidoService.agregarDetalle(5, { id_producto: 'x', cantidad: -1, precio_unitario: -10 }),
    (err) => err.status === 400 && Array.isArray(err.errores) && err.errores.length === 3
  );
});

test('agregarDetalle: id de pedido inválido -> 400', async () => {
  reset();
  await rechaza400(
    pedidoService.agregarDetalle('abc', { id_producto: 1, cantidad: 2, precio_unitario: 3000 }),
    /id del pedido/
  );
  assert.deepStrictEqual(eventos, []);
});

test('agregarDetalle: datos válidos (también como texto, como llegan del formulario) -> COMMIT', async () => {
  reset();
  await pedidoService.agregarDetalle('5', { id_producto: '1', cantidad: '2', precio_unitario: '3000' });
  assert.strictEqual(eventos[0], 'BEGIN');
  assert.ok(eventos.includes('COMMIT'));
});

// ---------- Pedido ----------

test('crear pedido: sin id_cliente -> 400 y no llega a la base de datos', async () => {
  reset();
  await rechaza400(pedidoService.crear({ estado_pedido: 'Pendiente' }), /id_cliente/);
  assert.deepStrictEqual(eventos, []);
});

test('crear pedido: fecha de entrega antes que la del pedido -> 400', async () => {
  reset();
  await rechaza400(
    pedidoService.crear({ id_cliente: 1, fecha_pedido: '2026-10-20', fecha_entrega: '2026-10-10' }),
    /fecha de entrega/
  );
});

test('crear pedido: datos válidos -> se guarda', async () => {
  reset();
  await pedidoService.crear({ id_cliente: 1, fecha_pedido: '2026-10-20', fecha_entrega: '2026-10-25' });
  assert.deepStrictEqual(eventos, ['QUERY']);
});

test('eliminar pedido: id inválido -> 400 sin abrir transacción', async () => {
  reset();
  await rechaza400(pedidoService.eliminar('-1'), /id del pedido/);
  assert.deepStrictEqual(eventos, []);
});

// ---------- Cliente ----------

test('crear cliente: sin nombre -> 400 y no llega a la base de datos', async () => {
  reset();
  await rechaza400(clienteService.crear({ correo: 'ana@correo.com' }), /nombre del cliente/);
  assert.deepStrictEqual(eventos, []);
});

test('crear cliente: correo y teléfono mal escritos -> 400 con ambos errores', async () => {
  reset();
  await assert.rejects(
    clienteService.crear({ nombre_cliente: 'Ana', correo: 'ana@', telefono: 'abc' }),
    (err) => err.status === 400 && /correo/.test(err.message) && /teléfono/.test(err.message)
  );
  assert.deepStrictEqual(eventos, []);
});

test('crear cliente: datos válidos -> se guarda (revisa correo repetido y luego inserta)', async () => {
  reset();
  await clienteService.crear({
    nombre_cliente: 'Ana Pérez', correo: 'ana@correo.com', telefono: '300 123 4567', ciudad: 'Medellín',
  });
  assert.deepStrictEqual(eventos, ['QUERY', 'QUERY']);
});

test('eliminar cliente: id inválido -> 400 sin abrir transacción', async () => {
  reset();
  await rechaza400(clienteService.eliminar('abc'), /id del cliente/);
  assert.deepStrictEqual(eventos, []);
});
