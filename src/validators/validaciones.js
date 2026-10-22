/**
 * Validación de datos de entrada — ADR-005 (docs/adr/0005-validar-datos-de-entrada.md).
 *
 * Reglas para Clientes, Pedidos y Detalle de pedido. Se ejecutan en la capa services/ (ADR-001)
 * ANTES de abrir una transacción (ADR-003) o de llegar al repository, para que un dato inválido
 * nunca toque la base de datos.
 *
 * Si hay errores, se lanza un único HttpError(400) que lista TODOS los problemas encontrados,
 * para que el frontend pueda mostrarle al usuario qué corregir de una sola vez.
 */
const { HttpError } = require('../utils/httpError');

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONO = /^\+?[0-9\s-]{7,20}$/;

// ---------- Ayudantes genéricos ----------

function estaVacio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

function esEnteroPositivo(valor) {
  if (estaVacio(valor)) return false;
  const texto = String(valor).trim();
  return /^\d+$/.test(texto) && Number(texto) > 0;
}

function esNumeroNoNegativo(valor) {
  if (estaVacio(valor)) return false;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0;
}

function esFechaValida(valor) {
  if (estaVacio(valor)) return false;
  const fecha = new Date(valor);
  return !Number.isNaN(fecha.getTime());
}

function lanzarSiHayErrores(errores) {
  if (errores.length > 0) {
    const err = new HttpError(400, `Datos inválidos: ${errores.join('; ')}`);
    err.errores = errores;
    throw err;
  }
}

// ---------- Identificadores (parámetros de la URL) ----------

function validarId(valor, nombre = 'id') {
  if (!esEnteroPositivo(valor)) {
    throw new HttpError(400, `Datos inválidos: el ${nombre} debe ser un número entero mayor que 0`);
  }
  return Number(valor);
}

// ---------- Cliente ----------

function validarCliente(datos = {}) {
  const errores = [];

  if (estaVacio(datos.nombre_cliente)) {
    errores.push('el nombre del cliente es obligatorio');
  }
  if (!estaVacio(datos.correo) && !REGEX_CORREO.test(String(datos.correo).trim())) {
    errores.push('el correo no tiene un formato válido');
  }
  if (!estaVacio(datos.telefono) && !REGEX_TELEFONO.test(String(datos.telefono).trim())) {
    errores.push('el teléfono solo puede tener números, espacios, guiones y + (mínimo 7 caracteres)');
  }
  if (!estaVacio(datos.fecha_registro) && !esFechaValida(datos.fecha_registro)) {
    errores.push('la fecha de registro no es una fecha válida');
  }

  lanzarSiHayErrores(errores);
}

// ---------- Pedido ----------

function validarPedido(datos = {}) {
  const errores = [];

  if (!esEnteroPositivo(datos.id_cliente)) {
    errores.push('el id_cliente es obligatorio y debe ser un número entero mayor que 0');
  }
  if (!estaVacio(datos.fecha_pedido) && !esFechaValida(datos.fecha_pedido)) {
    errores.push('la fecha del pedido no es una fecha válida');
  }
  if (!estaVacio(datos.fecha_entrega) && !esFechaValida(datos.fecha_entrega)) {
    errores.push('la fecha de entrega no es una fecha válida');
  }
  if (esFechaValida(datos.fecha_pedido) && esFechaValida(datos.fecha_entrega)
      && new Date(datos.fecha_entrega) < new Date(datos.fecha_pedido)) {
    errores.push('la fecha de entrega no puede ser anterior a la fecha del pedido');
  }
  if (!estaVacio(datos.valor_total) && !esNumeroNoNegativo(datos.valor_total)) {
    errores.push('el valor total debe ser un número mayor o igual a 0');
  }

  lanzarSiHayErrores(errores);
}

// ---------- Detalle de pedido ----------

function validarDetalle(datos = {}) {
  const errores = [];

  if (!esEnteroPositivo(datos.id_producto)) {
    errores.push('el id_producto es obligatorio y debe ser un número entero mayor que 0');
  }
  if (!esEnteroPositivo(datos.cantidad)) {
    errores.push('la cantidad es obligatoria y debe ser un número entero mayor que 0');
  }
  if (!esNumeroNoNegativo(datos.precio_unitario)) {
    errores.push('el precio unitario es obligatorio y debe ser un número mayor o igual a 0');
  }

  lanzarSiHayErrores(errores);
}

module.exports = {
  validarId,
  validarCliente,
  validarPedido,
  validarDetalle,
};
