/**
 * Error HTTP simple para que la capa de servicio pueda indicarle a la capa de
 * controlador qué código de estado usar (404, 400, etc.) sin acoplar la lógica
 * de negocio a Express. Parte de ADR-001 (docs/adr/0001-separar-en-capas.md).
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

module.exports = { HttpError };
