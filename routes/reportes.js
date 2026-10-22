const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db');

// ═══════════════════════════════════════════════════════════
// CONSULTAS DIRECTAS (SELECT + JOIN + WHERE + GROUP BY)
// ═══════════════════════════════════════════════════════════

// SELECT básico — todos los productos con categoría
router.get('/productos-categoria', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        P.nombre_producto,
        P.precio,
        P.disponibilidad,
        C.nombre_categoria
      FROM PRODUCTO P
      INNER JOIN CATEGORIA C ON P.id_categoria = C.id`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// JOIN — pedidos con datos del cliente
router.get('/pedidos-clientes', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        CL.nombre_cliente,
        CL.ciudad,
        PD.id AS id_pedido,
        PD.fecha_pedido,
        PD.estado_pedido,
        PD.valor_total
      FROM PEDIDOS PD
      INNER JOIN CLIENTE CL ON PD.id_cliente = CL.id
      ORDER BY PD.fecha_pedido DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// JOIN múltiple — detalle completo de pedidos
router.get('/detalle-completo', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        CL.nombre_cliente,
        PD.id AS id_pedido,
        PD.estado_pedido,
        PR.nombre_producto,
        DP.cantidad,
        DP.precio_unitario,
        DP.subtotal
      FROM CLIENTE CL
      INNER JOIN PEDIDOS PD         ON CL.id          = PD.id_cliente
      INNER JOIN DETALLE_PEDIDOS DP ON PD.id          = DP.id_pedido
      INNER JOIN PRODUCTO PR        ON DP.id_producto = PR.id`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// WHERE — productos disponibles con precio > 10000
router.get('/productos-precio', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT nombre_producto, precio, disponibilidad
      FROM PRODUCTO
      WHERE precio > 10000
        AND disponibilidad = 'Disponible'
      ORDER BY precio DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GROUP BY + COUNT + SUM — pedidos por estado
router.get('/pedidos-por-estado', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        estado_pedido,
        COUNT(id)        AS cantidad,
        SUM(valor_total) AS valor_total,
        AVG(valor_total) AS valor_promedio
      FROM PEDIDOS
      WHERE valor_total > 0
      GROUP BY estado_pedido
      ORDER BY cantidad DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GROUP BY — ventas por cliente
router.get('/ventas-por-cliente', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        CL.nombre_cliente,
        CL.ciudad,
        COUNT(PD.id)        AS total_pedidos,
        SUM(PD.valor_total) AS total_comprado,
        AVG(PD.valor_total) AS promedio_pedido,
        MAX(PD.valor_total) AS pedido_mas_alto
      FROM CLIENTE CL
      LEFT JOIN PEDIDOS PD ON CL.id = PD.id_cliente
      GROUP BY CL.id, CL.nombre_cliente, CL.ciudad
      ORDER BY total_comprado DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GROUP BY — productos más vendidos
router.get('/productos-mas-vendidos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        PR.nombre_producto,
        CAT.nombre_categoria,
        PR.precio,
        SUM(DP.cantidad)    AS unidades_vendidas,
        SUM(DP.subtotal)    AS ingresos_totales,
        COUNT(DP.id_pedido) AS veces_pedido
      FROM PRODUCTO PR
      LEFT JOIN DETALLE_PEDIDOS DP ON PR.id          = DP.id_producto
      LEFT JOIN CATEGORIA CAT       ON PR.id_categoria = CAT.id
      GROUP BY PR.id, PR.nombre_producto, CAT.nombre_categoria, PR.precio
      ORDER BY unidades_vendidas DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GROUP BY — ingresos por método de pago
router.get('/ingresos-por-metodo', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        PA.metodo_pago,
        COUNT(PA.id)         AS cantidad_pagos,
        SUM(PA.valor_pagado) AS total_recaudado,
        AVG(PA.valor_pagado) AS promedio_pago,
        MAX(PA.valor_pagado) AS pago_mas_alto
      FROM PAGO PA
      INNER JOIN PEDIDOS PD ON PD.id = PA.id_pedidos
      WHERE PA.estado = 'Pagado'
      GROUP BY PA.metodo_pago
      ORDER BY total_recaudado DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SUBCONSULTA — clientes sin pedidos
router.get('/clientes-sin-pedidos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT nombre_cliente, correo, ciudad, fecha_registro
      FROM CLIENTE
      WHERE id NOT IN (
        SELECT DISTINCT id_cliente FROM PEDIDOS
      )
      ORDER BY fecha_registro DESC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// SUBCONSULTA — productos con stock bajo vs promedio
router.get('/stock-bajo', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        PR.nombre_producto,
        CAT.nombre_categoria,
        INV.stock_actual,
        (SELECT AVG(stock_actual) FROM INVENTARIO) AS stock_promedio,
        (SELECT SUM(DP.cantidad)
         FROM DETALLE_PEDIDOS DP
         WHERE DP.id_producto = PR.id) AS total_vendido
      FROM INVENTARIO INV
      INNER JOIN PRODUCTO PR   ON PR.id          = INV.id_producto
      INNER JOIN CATEGORIA CAT ON CAT.id         = PR.id_categoria
      WHERE INV.stock_actual < (
        SELECT AVG(stock_actual) FROM INVENTARIO
      )
      ORDER BY INV.stock_actual ASC`);
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
// VISTAS — Creadas en SQL Server, consultadas desde la API
// ═══════════════════════════════════════════════════════════

// Vista: productos con categoría y promoción
router.get('/vista-productos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM vw_ProductosDetalle');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vista: pedidos pendientes
router.get('/vista-pedidos-pendientes', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM vw_PedidosPendientes');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vista: detalle completo de pedidos
router.get('/vista-detalle-pedidos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM vw_DetallePedidos');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vista: inventario con producto
router.get('/vista-inventario', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM vw_InventarioProductos');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Vista: insumos con proveedor
router.get('/vista-insumos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .query('SELECT * FROM vw_InsumosProveedores');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
// FUNCIONES — Creadas en SQL Server, llamadas desde la API
// ═══════════════════════════════════════════════════════════

// Función: total de pedidos de un cliente
router.get('/fn-pedidos-cliente/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT dbo.fn_TotalPedidosCliente(@id) AS total_pedidos');
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Función: stock actual de un producto
router.get('/fn-stock-producto/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT dbo.fn_StockProducto(@id) AS stock_actual');
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Función: total pagado por un cliente
router.get('/fn-total-pagado/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT dbo.fn_TotalPagadoCliente(@id) AS total_pagado');
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Función: productos de una categoría
router.get('/fn-productos-categoria/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT dbo.fn_TotalProductosCategoria(@id) AS total_productos');
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
// PROCEDIMIENTOS — Creados en SQL Server, ejecutados desde la API
// ═══════════════════════════════════════════════════════════

// Procedimiento: listar todos los productos
router.get('/sp-listar-productos', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .execute('ListarProductos');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Procedimiento: pedidos de un cliente específico
router.get('/sp-pedidos-cliente/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id_cliente', sql.Int, req.params.id)
      .execute('PedidosPorCliente');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Procedimiento: productos disponibles
router.get('/sp-productos-disponibles', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .execute('ProductosDisponibles');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Procedimiento: insumos con stock bajo (parámetro límite)
router.get('/sp-stock-bajo/:limite', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('limite', sql.Int, req.params.limite)
      .execute('InsumosStockBajo');
    res.json(result.recordset);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════
// RESUMEN GENERAL
// ═══════════════════════════════════════════════════════════
router.get('/resumen', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM CLIENTE)                                       AS total_clientes,
        (SELECT COUNT(*) FROM PEDIDOS)                                       AS total_pedidos,
        (SELECT COUNT(*) FROM PEDIDOS WHERE estado_pedido = 'Entregado')     AS pedidos_entregados,
        (SELECT ISNULL(SUM(valor_total),  0) FROM PEDIDOS)                   AS ingresos_totales,
        (SELECT ISNULL(SUM(valor_pagado), 0) FROM PAGO WHERE estado='Pagado') AS total_cobrado,
        (SELECT COUNT(*) FROM PRODUCTO)                                      AS total_productos,
        (SELECT COUNT(*) FROM INSUMOS WHERE stock_actual < 5)                AS insumos_criticos,
        (SELECT COUNT(*) FROM PROVEEDORES)                                   AS total_proveedores`);
    res.json(result.recordset[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
