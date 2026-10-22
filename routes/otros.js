const express = require('express');
const { getPool, sql } = require('../db');

// ADR-004: aplica los filtros de búsqueda como parámetros SQL (@nombre, @estado, ...) en vez de
// concatenar el texto que llega en req.query dentro de la consulta.
function aplicarParametros(request, params) {
  for (const [nombre, valor] of Object.entries(params)) request.input(nombre, sql.VarChar, valor);
  return request;
}

// ===== CATEGORIAS =====
const categorias = express.Router();
categorias.get('/', async (req, res) => {
  try { const p=await getPool(); const r=await p.request().query('SELECT * FROM CATEGORIA ORDER BY id'); res.json(r.recordset); } catch(e){ res.status(500).json({error:e.message}); }
});
categorias.get('/:id', async (req, res) => {
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).query('SELECT * FROM CATEGORIA WHERE id=@id'); if(!r.recordset[0]) return res.status(404).json({error:'No encontrado'}); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
categorias.post('/', async (req, res) => {
  const {nombre_categoria,descripcion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('n',sql.VarChar,nombre_categoria).input('d',sql.VarChar,descripcion).query('INSERT INTO CATEGORIA(nombre_categoria,descripcion) OUTPUT INSERTED.* VALUES(@n,@d)'); res.status(201).json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
categorias.put('/:id', async (req, res) => {
  const {nombre_categoria,descripcion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).input('n',sql.VarChar,nombre_categoria).input('d',sql.VarChar,descripcion).query('UPDATE CATEGORIA SET nombre_categoria=@n,descripcion=@d OUTPUT INSERTED.* WHERE id=@id'); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
categorias.delete('/:id', async (req, res) => {
  try { const p=await getPool(); await p.request().input('id',sql.Int,req.params.id).query('DELETE FROM CATEGORIA WHERE id=@id'); res.json({message:'Eliminado'}); } catch(e){ res.status(500).json({error:e.message}); }
});

// ===== PROMOCIONES =====
const promociones = express.Router();
promociones.get('/', async (req, res) => {
  const { estado } = req.query;
  const where = estado ? 'WHERE estado_promocion=@estado' : '';
  try { const p=await getPool(); const r=await aplicarParametros(p.request(), estado ? { estado } : {}).query(`SELECT * FROM PROMOCIONES ${where} ORDER BY id`); res.json(r.recordset); } catch(e){ res.status(500).json({error:e.message}); }
});
promociones.get('/:id', async (req, res) => {
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).query('SELECT * FROM PROMOCIONES WHERE id=@id'); if(!r.recordset[0]) return res.status(404).json({error:'No encontrada'}); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
promociones.post('/', async (req, res) => {
  const {nombre_promocion,descripcion,descuento,fecha_inicio,fecha_fin,estado_promocion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('n',sql.VarChar,nombre_promocion).input('d',sql.VarChar,descripcion).input('dc',sql.Int,descuento).input('fi',sql.Date,fecha_inicio).input('ff',sql.Date,fecha_fin).input('e',sql.VarChar,estado_promocion||'Pendiente').query('INSERT INTO PROMOCIONES(nombre_promocion,descripcion,descuento,fecha_inicio,fecha_fin,estado_promocion) OUTPUT INSERTED.* VALUES(@n,@d,@dc,@fi,@ff,@e)'); res.status(201).json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
promociones.put('/:id', async (req, res) => {
  const {nombre_promocion,descripcion,descuento,fecha_inicio,fecha_fin,estado_promocion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).input('n',sql.VarChar,nombre_promocion).input('d',sql.VarChar,descripcion).input('dc',sql.Int,descuento).input('fi',sql.Date,fecha_inicio).input('ff',sql.Date,fecha_fin).input('e',sql.VarChar,estado_promocion).query('UPDATE PROMOCIONES SET nombre_promocion=@n,descripcion=@d,descuento=@dc,fecha_inicio=@fi,fecha_fin=@ff,estado_promocion=@e OUTPUT INSERTED.* WHERE id=@id'); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
promociones.delete('/:id', async (req, res) => {
  try { const p=await getPool(); await p.request().input('id',sql.Int,req.params.id).query('DELETE FROM PROMOCIONES WHERE id=@id'); res.json({message:'Eliminada'}); } catch(e){ res.status(500).json({error:e.message}); }
});

// ===== PROVEEDORES =====
const proveedores = express.Router();
proveedores.get('/', async (req, res) => {
  try { const p=await getPool(); const r=await p.request().query('SELECT * FROM PROVEEDORES ORDER BY id'); res.json(r.recordset); } catch(e){ res.status(500).json({error:e.message}); }
});
proveedores.get('/:id', async (req, res) => {
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).query('SELECT * FROM PROVEEDORES WHERE id=@id'); if(!r.recordset[0]) return res.status(404).json({error:'No encontrado'}); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
proveedores.post('/', async (req, res) => {
  const {nombre_proveedor,telefono,direccion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('n',sql.VarChar,nombre_proveedor).input('t',sql.VarChar,telefono).input('d',sql.VarChar,direccion).query('INSERT INTO PROVEEDORES(nombre_proveedor,telefono,direccion) OUTPUT INSERTED.* VALUES(@n,@t,@d)'); res.status(201).json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
proveedores.put('/:id', async (req, res) => {
  const {nombre_proveedor,telefono,direccion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).input('n',sql.VarChar,nombre_proveedor).input('t',sql.VarChar,telefono).input('d',sql.VarChar,direccion).query('UPDATE PROVEEDORES SET nombre_proveedor=@n,telefono=@t,direccion=@d OUTPUT INSERTED.* WHERE id=@id'); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
proveedores.delete('/:id', async (req, res) => {
  try { const p=await getPool(); await p.request().input('id',sql.Int,req.params.id).query('DELETE FROM PROVEEDORES WHERE id=@id'); res.json({message:'Eliminado'}); } catch(e){ res.status(500).json({error:e.message}); }
});

// ===== INSUMOS =====
const insumos = express.Router();
insumos.get('/', async (req, res) => {
  const { nombre, proveedor } = req.query;
  let where = []; const params = {};
  if (nombre) { where.push('i.nombre_insumo LIKE @nombre'); params.nombre = `%${nombre}%`; }
  if (proveedor) { where.push('pr.nombre_proveedor LIKE @proveedor'); params.proveedor = `%${proveedor}%`; }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try { const p=await getPool(); const r=await aplicarParametros(p.request(), params).query(`SELECT i.*,pr.nombre_proveedor FROM INSUMOS i LEFT JOIN PROVEEDORES pr ON i.id_proveedor=pr.id ${whereClause} ORDER BY i.id`); res.json(r.recordset); } catch(e){ res.status(500).json({error:e.message}); }
});
insumos.get('/:id', async (req, res) => {
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).query('SELECT i.*,pr.nombre_proveedor FROM INSUMOS i LEFT JOIN PROVEEDORES pr ON i.id_proveedor=pr.id WHERE i.id=@id'); if(!r.recordset[0]) return res.status(404).json({error:'No encontrado'}); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
insumos.post('/', async (req, res) => {
  const {id_proveedor,nombre_insumo,descripcion,tamaño,stock_actual,fecha_actualizacion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('ip',sql.Int,id_proveedor).input('n',sql.VarChar,nombre_insumo).input('d',sql.VarChar,descripcion).input('t',sql.VarChar,tamaño).input('s',sql.Int,stock_actual||0).input('f',sql.Date,fecha_actualizacion||new Date()).query('INSERT INTO INSUMOS(id_proveedor,nombre_insumo,descripcion,tamaño,stock_actual,fecha_actualizacion) OUTPUT INSERTED.* VALUES(@ip,@n,@d,@t,@s,@f)'); res.status(201).json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
insumos.put('/:id', async (req, res) => {
  const {id_proveedor,nombre_insumo,descripcion,tamaño,stock_actual,fecha_actualizacion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).input('ip',sql.Int,id_proveedor).input('n',sql.VarChar,nombre_insumo).input('d',sql.VarChar,descripcion).input('t',sql.VarChar,tamaño).input('s',sql.Int,stock_actual).input('f',sql.Date,fecha_actualizacion).query('UPDATE INSUMOS SET id_proveedor=@ip,nombre_insumo=@n,descripcion=@d,tamaño=@t,stock_actual=@s,fecha_actualizacion=@f OUTPUT INSERTED.* WHERE id=@id'); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
insumos.delete('/:id', async (req, res) => {
  try { const p=await getPool(); await p.request().input('id',sql.Int,req.params.id).query('DELETE FROM INSUMOS WHERE id=@id'); res.json({message:'Eliminado'}); } catch(e){ res.status(500).json({error:e.message}); }
});

// ===== INVENTARIO — stock agregado SUMA al stock actual =====
const inventario = express.Router();
inventario.get('/', async (req, res) => {
  const { producto } = req.query;
  const where = producto ? 'WHERE pr.nombre_producto LIKE @producto' : '';
  try { const p=await getPool(); const r=await aplicarParametros(p.request(), producto ? { producto: `%${producto}%` } : {}).query(`SELECT i.*,pr.nombre_producto FROM INVENTARIO i LEFT JOIN PRODUCTO pr ON i.id_producto=pr.id ${where} ORDER BY i.id`); res.json(r.recordset); } catch(e){ res.status(500).json({error:e.message}); }
});
inventario.post('/', async (req, res) => {
  const {id_producto,stock_actual,stock_agregado,fecha_actualizacion}=req.body;
  try { const p=await getPool(); const r=await p.request().input('ip',sql.Int,id_producto).input('sa',sql.Int,stock_actual||0).input('sg',sql.Int,stock_agregado||0).input('f',sql.Date,fecha_actualizacion||new Date()).query('INSERT INTO INVENTARIO(id_producto,stock_actual,stock_agregado,fecha_actualizacion) OUTPUT INSERTED.* VALUES(@ip,@sa,@sg,@f)'); res.status(201).json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
// PUT — stock_agregado SE SUMA al stock_actual
inventario.put('/:id', async (req, res) => {
  const {id_producto, stock_agregado, fecha_actualizacion} = req.body;
  const agregado = parseInt(stock_agregado) || 0;
  try {
    const pool = await getPool();
    // Obtener stock actual
    const actual = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT stock_actual FROM INVENTARIO WHERE id=@id');
    if (!actual.recordset[0]) return res.status(404).json({ error: 'Registro no encontrado' });
    const nuevoStock = actual.recordset[0].stock_actual + agregado;
    const r = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('ip', sql.Int, id_producto)
      .input('sa', sql.Int, nuevoStock)
      .input('sg', sql.Int, agregado)
      .input('f', sql.Date, fecha_actualizacion || new Date())
      .query(`UPDATE INVENTARIO SET id_producto=@ip, stock_actual=@sa, stock_agregado=@sg,
              fecha_actualizacion=@f OUTPUT INSERTED.* WHERE id=@id`);
    res.json(r.recordset[0]);
  } catch(e){ res.status(500).json({error:e.message}); }
});
inventario.delete('/:id', async (req, res) => {
  try { const p=await getPool(); await p.request().input('id',sql.Int,req.params.id).query('DELETE FROM INVENTARIO WHERE id=@id'); res.json({message:'Eliminado'}); } catch(e){ res.status(500).json({error:e.message}); }
});

// ===== PAGOS =====
const pagos = express.Router();
pagos.get('/', async (req, res) => {
  const { estado, metodo } = req.query;
  let where = []; const params = {};
  if (estado) { where.push('pg.estado=@estado'); params.estado = estado; }
  if (metodo) { where.push('pg.metodo_pago=@metodo'); params.metodo = metodo; }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try { const p=await getPool(); const r=await aplicarParametros(p.request(), params).query(`SELECT pg.*,pd.estado_pedido,c.nombre_cliente FROM PAGO pg LEFT JOIN PEDIDOS pd ON pg.id_pedidos=pd.id LEFT JOIN CLIENTE c ON pd.id_cliente=c.id ${whereClause} ORDER BY pg.id`); res.json(r.recordset); } catch(e){ res.status(500).json({error:e.message}); }
});
pagos.post('/', async (req, res) => {
  const {id_pedidos,metodo_pago,valor_pagado,fecha_pago,estado}=req.body;
  try { const p=await getPool(); const r=await p.request().input('ip',sql.Int,id_pedidos).input('m',sql.VarChar,metodo_pago).input('v',sql.Decimal(10,2),valor_pagado).input('f',sql.Date,fecha_pago||new Date()).input('e',sql.VarChar,estado||'Pendiente').query('INSERT INTO PAGO(id_pedidos,metodo_pago,valor_pagado,fecha_pago,estado) OUTPUT INSERTED.* VALUES(@ip,@m,@v,@f,@e)'); res.status(201).json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
pagos.put('/:id', async (req, res) => {
  const {id_pedidos,metodo_pago,valor_pagado,fecha_pago,estado}=req.body;
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).input('ip',sql.Int,id_pedidos).input('m',sql.VarChar,metodo_pago).input('v',sql.Decimal(10,2),valor_pagado).input('f',sql.Date,fecha_pago).input('e',sql.VarChar,estado).query('UPDATE PAGO SET id_pedidos=@ip,metodo_pago=@m,valor_pagado=@v,fecha_pago=@f,estado=@e OUTPUT INSERTED.* WHERE id=@id'); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
pagos.delete('/:id', async (req, res) => {
  try { const p=await getPool(); await p.request().input('id',sql.Int,req.params.id).query('DELETE FROM PAGO WHERE id=@id'); res.json({message:'Eliminado'}); } catch(e){ res.status(500).json({error:e.message}); }
});

// ===== COMPRA INSUMOS =====
const compras = express.Router();
compras.get('/', async (req, res) => {
  const { estado, proveedor } = req.query;
  let where = []; const params = {};
  if (estado) { where.push('c.estado_pago=@estado'); params.estado = estado; }
  if (proveedor) { where.push('pr.nombre_proveedor LIKE @proveedor'); params.proveedor = `%${proveedor}%`; }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try { const p=await getPool(); const r=await aplicarParametros(p.request(), params).query(`SELECT c.*,pr.nombre_proveedor FROM COMPRA_INSUMOS c LEFT JOIN PROVEEDORES pr ON c.id_proveedor=pr.id ${whereClause} ORDER BY c.fecha_compra DESC`); res.json(r.recordset); } catch(e){ res.status(500).json({error:e.message}); }
});
compras.get('/:id', async (req, res) => {
  try {
    const p=await getPool();
    const compra=await p.request().input('id',sql.Int,req.params.id).query('SELECT c.*,pr.nombre_proveedor FROM COMPRA_INSUMOS c LEFT JOIN PROVEEDORES pr ON c.id_proveedor=pr.id WHERE c.id=@id');
    const detalle=await p.request().input('id',sql.Int,req.params.id).query('SELECT d.*,i.nombre_insumo FROM DETALLE_COMPRA_INSUMOS d LEFT JOIN INSUMOS i ON d.id_insumo=i.id WHERE d.id_compra=@id');
    if(!compra.recordset[0]) return res.status(404).json({error:'No encontrada'});
    res.json({...compra.recordset[0], detalle: detalle.recordset});
  } catch(e){ res.status(500).json({error:e.message}); }
});
compras.post('/', async (req, res) => {
  const {id_proveedor,fecha_compra,valor_total,metodo_pago,estado_pago}=req.body;
  try { const p=await getPool(); const r=await p.request().input('ip',sql.Int,id_proveedor).input('f',sql.Date,fecha_compra||new Date()).input('v',sql.Decimal(10,2),valor_total||0).input('m',sql.VarChar,metodo_pago).input('e',sql.VarChar,estado_pago||'Pendiente').query('INSERT INTO COMPRA_INSUMOS(id_proveedor,fecha_compra,valor_total,metodo_pago,estado_pago) OUTPUT INSERTED.* VALUES(@ip,@f,@v,@m,@e)'); res.status(201).json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
compras.post('/:id/detalle', async (req, res) => {
  const { id_insumo, cantidad, precio_unitario } = req.body;
  const id_compra = parseInt(req.params.id);
  const cant = parseInt(cantidad);
  const precio = parseFloat(precio_unitario);
  const subtotal = cant * precio;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id_compra', sql.Int, id_compra)
      .input('id_insumo', sql.Int, id_insumo)
      .input('cantidad', sql.Int, cant)
      .input('precio_unitario', sql.Decimal(10,2), precio)
      .input('subtotal', sql.Decimal(10,2), subtotal)
      .query(`INSERT INTO DETALLE_COMPRA_INSUMOS (id_compra,id_insumo,cantidad,precio_unitario,subtotal) VALUES (@id_compra,@id_insumo,@cantidad,@precio_unitario,@subtotal)`);
    await pool.request()
      .input('id_insumo', sql.Int, id_insumo)
      .input('cantidad', sql.Int, cant)
      .query(`UPDATE INSUMOS SET stock_actual=stock_actual+@cantidad, fecha_actualizacion=GETDATE() WHERE id=@id_insumo`);
    await pool.request()
      .input('id_compra', sql.Int, id_compra)
      .query(`UPDATE COMPRA_INSUMOS SET valor_total=(SELECT ISNULL(SUM(subtotal),0) FROM DETALLE_COMPRA_INSUMOS WHERE id_compra=@id_compra) WHERE id=@id_compra`);
    res.status(201).json({ message: 'Insumo agregado y stock actualizado' });
  } catch(e){ res.status(500).json({error:e.message}); }
});
compras.delete('/:id/detalle/:detalleId', async (req, res) => {
  try {
    const pool = await getPool();
    const detalleResult = await pool.request().input('id',sql.Int,req.params.detalleId).query('SELECT * FROM DETALLE_COMPRA_INSUMOS WHERE id=@id');
    if (!detalleResult.recordset[0]) return res.status(404).json({ error: 'Detalle no encontrado' });
    const { id_insumo, cantidad } = detalleResult.recordset[0];
    await pool.request().input('id',sql.Int,req.params.detalleId).query('DELETE FROM DETALLE_COMPRA_INSUMOS WHERE id=@id');
    await pool.request().input('id_insumo',sql.Int,id_insumo).input('cantidad',sql.Int,cantidad).query(`UPDATE INSUMOS SET stock_actual=stock_actual-@cantidad, fecha_actualizacion=GETDATE() WHERE id=@id_insumo`);
    await pool.request().input('id_compra',sql.Int,req.params.id).query(`UPDATE COMPRA_INSUMOS SET valor_total=(SELECT ISNULL(SUM(subtotal),0) FROM DETALLE_COMPRA_INSUMOS WHERE id_compra=@id_compra) WHERE id=@id_compra`);
    res.json({ message: 'Insumo eliminado y stock revertido' });
  } catch(e){ res.status(500).json({error:e.message}); }
});
compras.put('/:id', async (req, res) => {
  const {id_proveedor,fecha_compra,valor_total,metodo_pago,estado_pago}=req.body;
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).input('ip',sql.Int,id_proveedor).input('f',sql.Date,fecha_compra).input('v',sql.Decimal(10,2),valor_total).input('m',sql.VarChar,metodo_pago).input('e',sql.VarChar,estado_pago).query('UPDATE COMPRA_INSUMOS SET id_proveedor=@ip,fecha_compra=@f,valor_total=@v,metodo_pago=@m,estado_pago=@e OUTPUT INSERTED.* WHERE id=@id'); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
// DELETE en cascada: revertir stock → detalles → compra
compras.delete('/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const detalles = await pool.request().input('id',sql.Int,req.params.id).query('SELECT id_insumo, cantidad FROM DETALLE_COMPRA_INSUMOS WHERE id_compra=@id');
    for (const d of detalles.recordset) {
      await pool.request().input('ii',sql.Int,d.id_insumo).input('c',sql.Int,d.cantidad).query('UPDATE INSUMOS SET stock_actual=stock_actual-@c WHERE id=@ii');
    }
    await pool.request().input('id',sql.Int,req.params.id).query('DELETE FROM DETALLE_COMPRA_INSUMOS WHERE id_compra=@id');
    await pool.request().input('id',sql.Int,req.params.id).query('DELETE FROM COMPRA_INSUMOS WHERE id=@id');
    res.json({message:'Compra eliminada y stock revertido'});
  } catch(e){ res.status(500).json({error:e.message}); }
});

// ===== PRODUCTOS =====
const productos = express.Router();
productos.get('/', async (req, res) => {
  const { nombre, categoria, disponibilidad } = req.query;
  let where = []; const params = {};
  if (nombre) { where.push('p.nombre_producto LIKE @nombre'); params.nombre = `%${nombre}%`; }
  if (categoria) { where.push('c.nombre_categoria LIKE @categoria'); params.categoria = `%${categoria}%`; }
  if (disponibilidad) { where.push('p.disponibilidad=@disponibilidad'); params.disponibilidad = disponibilidad; }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
  try { const p=await getPool(); const r=await aplicarParametros(p.request(), params).query(`SELECT p.*,c.nombre_categoria,pr.nombre_promocion FROM PRODUCTO p LEFT JOIN CATEGORIA c ON p.id_categoria=c.id LEFT JOIN PROMOCIONES pr ON p.id_promociones=pr.id ${whereClause} ORDER BY p.id`); res.json(r.recordset); } catch(e){ res.status(500).json({error:e.message}); }
});
productos.get('/:id', async (req, res) => {
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).query('SELECT p.*,c.nombre_categoria,pr.nombre_promocion FROM PRODUCTO p LEFT JOIN CATEGORIA c ON p.id_categoria=c.id LEFT JOIN PROMOCIONES pr ON p.id_promociones=pr.id WHERE p.id=@id'); if(!r.recordset[0]) return res.status(404).json({error:'No encontrado'}); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
productos.post('/', async (req, res) => {
  const {id_categoria,id_promociones,nombre_producto,descripcion,precio,disponibilidad}=req.body;
  try { const p=await getPool(); const r=await p.request().input('ic',sql.Int,id_categoria).input('ip',sql.Int,id_promociones||null).input('n',sql.VarChar,nombre_producto).input('d',sql.VarChar,descripcion).input('pr',sql.Decimal(10,2),precio).input('dis',sql.VarChar,disponibilidad||'Disponible').query('INSERT INTO PRODUCTO(id_categoria,id_promociones,nombre_producto,descripcion,precio,disponibilidad) OUTPUT INSERTED.* VALUES(@ic,@ip,@n,@d,@pr,@dis)'); res.status(201).json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
productos.put('/:id', async (req, res) => {
  const {id_categoria,id_promociones,nombre_producto,descripcion,precio,disponibilidad}=req.body;
  try { const p=await getPool(); const r=await p.request().input('id',sql.Int,req.params.id).input('ic',sql.Int,id_categoria).input('ip',sql.Int,id_promociones||null).input('n',sql.VarChar,nombre_producto).input('d',sql.VarChar,descripcion).input('pr',sql.Decimal(10,2),precio).input('dis',sql.VarChar,disponibilidad).query('UPDATE PRODUCTO SET id_categoria=@ic,id_promociones=@ip,nombre_producto=@n,descripcion=@d,precio=@pr,disponibilidad=@dis OUTPUT INSERTED.* WHERE id=@id'); res.json(r.recordset[0]); } catch(e){ res.status(500).json({error:e.message}); }
});
productos.delete('/:id', async (req, res) => {
  try { const p=await getPool(); await p.request().input('id',sql.Int,req.params.id).query('DELETE FROM PRODUCTO WHERE id=@id'); res.json({message:'Eliminado'}); } catch(e){ res.status(500).json({error:e.message}); }
});

module.exports = { categorias, promociones, proveedores, insumos, inventario, pagos, compras, productos };
