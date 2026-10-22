# ADR-003: Introducir control transaccional en operaciones críticas

**Estado:** Propuesta
**Atributo de calidad que mejora:** Confiabilidad
**Responsable sugerido:** *(asignar a un integrante del equipo)*

## Contexto

Dos operaciones del módulo de Pedidos y Clientes ejecutan varios pasos de escritura en la base
de datos sin agruparlos en una transacción:

1. **`POST /api/pedidos/:id/detalle`** (agregar producto a un pedido): ejecuta, en secuencia,
   (a) insertar el detalle del pedido, (b) actualizar el stock en `INVENTARIO`, y (c) recalcular
   `valor_total` en `PEDIDOS`. Son tres sentencias SQL independientes.
2. **`DELETE /api/pedidos/:id`** y **`DELETE /api/clientes/:id`** (eliminación en cascada):
   recorren en un bucle los detalles y pagos relacionados, devolviendo stock al inventario y
   borrando físicamente los registros, todo en sentencias SQL independientes.

Esto fue identificado como los Problemas 3 y 4 en la Semana 3, y confirmado contra el código
real en la Semana 13 (ver `routes/pedidos.js`, `routes/clientes.js`).

**Impacto del problema:** si el proceso falla a mitad de camino (por ejemplo, se pierde la
conexión después de actualizar el inventario pero antes de recalcular el total del pedido), el
sistema queda en un estado inconsistente: inventario descontado sin un pedido completo, o un
pedido a medio eliminar con algunos detalles borrados y otros no.

## Decisión

Introducir un mecanismo de transacciones explícito en la capa `services/` (ver ADR-001), de
forma que las operaciones de varios pasos se ejecuten dentro de un `BEGIN TRANSACTION`, y se
reviertan completas (`ROLLBACK`) si cualquier paso falla, o se confirmen completas (`COMMIT`)
si todos los pasos tienen éxito.

```js
// src/services/pedidoService.js (boceto)
async function agregarDetalle(idPedido, item) {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await pedidoRepository.insertarDetalle(item, tx);
    await inventarioRepository.descontarStock(item, tx);
    await pedidoRepository.recalcularTotal(idPedido, tx);
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
```

El mismo patrón se aplica a la eliminación en cascada de pedidos y de clientes.

## Código afectado

- `routes/pedidos.js` — endpoints `POST /:id/detalle`, `DELETE /:id/detalle/:detalleId`,
  `DELETE /:id`.
- `routes/clientes.js` — endpoint `DELETE /:id`.
- Nuevos métodos en `src/services/pedidoService.js` y `src/services/clienteService.js` que
  envuelven estas operaciones en una transacción, apoyándose en los repositorios del ADR-001.

## Consecuencias

**Positivas:**
- Elimina los estados inconsistentes entre pedidos, detalles e inventario ante una falla.
- El comportamiento "todo o nada" es más fácil de razonar y de probar que el manejo manual de
  errores paso a paso.

**Negativas / costos:**
- Las transacciones mantienen bloqueos en SQL Server mientras están abiertas; conviene mantener
  cada transacción lo más corta posible para no afectar el rendimiento con varios usuarios
  concurrentes (hoy no es un problema por el volumen del negocio, pero se deja documentado).
- Requiere pasar el objeto de transacción (`tx`) a través de los repositorios, lo cual acopla
  ligeramente la firma de sus métodos (se considera un costo aceptable frente al riesgo que
  mitiga).

## Alternativas consideradas

- **Dejar las operaciones como están y solo mejorar el manejo de errores (try/catch más
  detallado):** descartada porque no resuelve el problema de fondo: un error a mitad de camino
  seguiría dejando cambios parciales ya aplicados en la base de datos.
- **Mover la responsabilidad de consistencia a un proceso de reconciliación periódico (cron
  job) que revise y corrija inconsistencias:** descartada por ser más compleja de implementar y
  por corregir el problema después de que ocurre, en vez de prevenirlo.

## Cómo se mide el cumplimiento (RNF-03, ver `docs/arquitectura.md`)

Ante una falla simulada durante el registro de un pedido, se registran 0 casos de
inconsistencia entre pedidos e inventario; toda operación incompleta se revierte
automáticamente (rollback) en menos de 3 segundos.
