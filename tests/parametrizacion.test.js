/**
 * Pruebas de ADR-004 (consultas parametrizadas) — sin base de datos real.
 * Verifica que un texto de inyección SQL llegue a la base como PARÁMETRO y nunca dentro del
 * texto de la consulta, y que no queden filtros construidos por concatenación en el código.
 * Ejecutar con:  npm test   (equivale a: node --test)
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PAYLOAD = "' OR '1'='1";
const consultas = []; // { text, params }

class FakeRequest {
  constructor() { this.params = {}; }
  input(name, _type, value) { this.params[name] = value; return this; }
  async query(text) { consultas.push({ text: String(text), params: { ...this.params } }); return { recordset: [] }; }
}
const fakeSql = { Int: 'Int', VarChar: 'VarChar', Date: 'Date', Decimal: () => 'Decimal', Request: FakeRequest };
const dbPath = path.resolve(__dirname, '..', 'db.js');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getPool: async () => ({ request: () => new FakeRequest() }), sql: fakeSql },
};

const clienteRepo = require('../src/repositories/clienteRepository');
const pedidoRepo = require('../src/repositories/pedidoRepository');

function ultima() { return consultas[consultas.length - 1]; }
function valores(q) { return Object.values(q.params).map(String); }

test('clientes: ciudad/nombre/correo con payload de inyección van como parámetros', async () => {
  await clienteRepo.findAll({ ciudad: PAYLOAD, nombre: PAYLOAD, correo: PAYLOAD });
  const q = ultima();
  assert.ok(!q.text.includes(PAYLOAD), 'el payload NO debe aparecer en el texto SQL');
  assert.ok(!q.text.includes("1'='1"));
  assert.match(q.text, /@ciudad/);
  assert.match(q.text, /@nombre/);
  assert.match(q.text, /@correo/);
  assert.ok(valores(q).some((v) => v.includes(PAYLOAD)), 'el payload debe viajar como parámetro');
});

test('pedidos: estado/cliente/fechas con payload de inyección van como parámetros', async () => {
  await pedidoRepo.findAll({ estado: PAYLOAD, cliente: PAYLOAD, fecha_inicio: PAYLOAD, fecha_fin: PAYLOAD });
  const q = ultima();
  assert.ok(!q.text.includes(PAYLOAD));
  assert.ok(!q.text.includes("1'='1"));
  for (const p of ['@estado', '@cliente', '@fecha_inicio', '@fecha_fin']) assert.ok(q.text.includes(p), p);
  assert.ok(valores(q).some((v) => v.includes(PAYLOAD)));
});

test('sin filtros: la consulta sigue funcionando y no agrega WHERE', async () => {
  await clienteRepo.findAll({});
  assert.ok(!/WHERE/.test(ultima().text));
  await pedidoRepo.findAll({});
  assert.ok(!/WHERE/.test(ultima().text));
});

test('código fuente: no quedan filtros construidos por concatenación en routes/ ni src/', () => {
  const raiz = path.resolve(__dirname, '..');
  const archivos = [];
  for (const dir of ['routes', 'src']) {
    (function recorrer(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const ruta = path.join(d, e.name);
        if (e.isDirectory()) recorrer(ruta);
        else if (e.name.endsWith('.js')) archivos.push(ruta);
      }
    })(path.join(raiz, dir));
  }
  // Busca comillas SQL abiertas alrededor de una interpolación: ='${x}'  o  LIKE '%${x}%'
  const peligroso = /(=|>=|<=|LIKE)\s*'%?\$\{/;
  const culpables = archivos.filter((f) => peligroso.test(fs.readFileSync(f, 'utf8')));
  assert.deepStrictEqual(culpables.map((f) => path.relative(raiz, f)), [],
    'Archivos con interpolación dentro de comillas SQL: ' + culpables.join(', '));
});
