# ADR-001: Separar la lógica de `routes/` en capas (controllers → services → repositories)

**Estado:** Implementada para los módulos Clientes y Pedidos (MVP); `server.js` ya usa las rutas en capas. Pendiente: migrar `productos`, `otros` (categorías, promociones, proveedores, insumos, inventario, pagos, compras), `reportes` y `auth`.
**Atributo de calidad que mejora:** Mantenibilidad
**Responsable:** Dahiana Zapata

## Contexto

El servidor (`server.js`) ya registra las rutas separadas por recurso (`routes/clientes.js`,
`routes/pedidos.js`, `routes/productos.js`, `routes/otros.js`, `routes/reportes.js`,
`routes/auth.js`), pero dentro de cada archivo de ruta, cada manejador de endpoint mezcla tres
responsabilidades distintas en el mismo bloque de código:

1. Validación de la entrada (`req.body`, `req.query`, `req.params`).
2. Lógica de negocio (por ejemplo, verificar stock disponible antes de agregar un producto al
   pedido, o recalcular el total del pedido después de cada cambio).
3. Construcción y ejecución directa de la consulta SQL contra el pool de conexión (`pool.request()...query(...)`).

No existe una capa de servicios ni de repositorios independiente. Esto fue identificado como el
Problema 1 en la Semana 3 y evidenciado contra el código real en la Semana 13 (ver
`docs/arquitectura.md`, sección 2).

**Impacto del problema:** cualquier cambio de regla de negocio obliga a modificar un archivo que
también contiene el enrutamiento y el SQL, aumentando el riesgo de romper otras funcionalidades
no relacionadas con el cambio. No es posible probar la lógica de negocio sin un servidor HTTP
corriendo y sin una base de datos real conectada.

## Decisión

Introducir tres capas nuevas dentro de `src/`, siguiendo el diagrama de paquetes de la Semana 8:

- **`controllers/`** — adapta la petición y la respuesta HTTP (lee `req`, llama al servicio,
  arma el `res.json(...)`). No contiene lógica de negocio ni SQL.
- **`services/`** — contiene las reglas de negocio (ej. `PedidoService.registrarPedido()`,
  `InventarioService.descontar()`). No conoce `req`/`res`, ni construye SQL directamente: delega
  en los repositorios.
- **`repositories/`** — único punto de acceso a SQL (ej. `PedidoRepository.insertar()`). No
  contiene reglas de negocio.

`routes/` se mantiene como está (ya separado por recurso), pero cada ruta dejará de llamar a
`db.js` directamente y pasará a llamar al controlador correspondiente.

## Código afectado

- `routes/pedidos.js`, `routes/clientes.js`, `routes/productos.js`, `routes/otros.js`,
  `routes/reportes.js`, `routes/auth.js` — se simplifican para delegar en `controllers/`.
- Nuevos archivos en `src/controllers/`, `src/services/`, `src/repositories/` (uno por recurso,
  empezando por Pedidos y Clientes, el módulo MVP).
- `db.js` pasa a ser usado únicamente por la capa `repositories/`, no por las rutas.

## Consecuencias

**Positivas:**
- Un cambio de regla de negocio se aísla en `services/`, sin tocar rutas ni SQL de otros recursos.
- La lógica de negocio se puede probar con pruebas unitarias, sin depender de un servidor HTTP
  corriendo (ver `tests/`).
- Reduce el riesgo de introducir errores en funcionalidades no relacionadas al hacer un cambio.

**Negativas / costos:**
- Más archivos y más indirección para seguir el flujo de una petición (se compensa con la
  ganancia en mantenibilidad a medida que el proyecto crece).
- Requiere migrar recurso por recurso; mientras dura la migración, el proyecto tendrá rutas
  "antiguas" (llamando a `db.js` directo) y rutas "nuevas" (en capas) conviviendo.

## Alternativas consideradas

- **Dejar la lógica dentro de `routes/`, solo reorganizando el orden del código:** descartada
  porque no resuelve el problema de fondo (responsabilidades mezcladas en el mismo archivo).
- **Introducir un ORM (ej. Sequelize, Prisma) en lugar de repositorios manuales:** se considera
  una evolución futura; no se adopta ahora por el tiempo disponible y porque el equipo ya tiene
  las consultas SQL funcionando con `mssql`.

## Cómo se mide el cumplimiento (RNF-01, ver `docs/arquitectura.md`)

Un cambio de regla de negocio se implementa modificando un único módulo de `services/`, en
menos de 2 horas, sin generar regresiones en las demás rutas del sistema.

## Avance de implementación

- ✅ **Clientes** — `src/{routes,controllers,services,repositories}/cliente*.js`.
- ✅ **Pedidos** — `src/{routes,controllers,services,repositories}/pedido*.js`, incluyendo
  agregar/eliminar detalle (validación de stock, descuento/devolución de inventario, recálculo del total)
  y la eliminación en cascada. Mismos endpoints y comportamiento que `routes/pedidos.js`.
- ✅ `server.js` monta `src/routes/clienteRoutes.js` y `src/routes/pedidoRoutes.js` en lugar de
  `routes/clientes.js` y `routes/pedidos.js` (los archivos heredados se eliminan una vez validado).
- ✅ Las notas `TODO(ADR-003)` y `TODO(ADR-004)` en `services/` y `repositories/` marcan dónde
  entran las otras dos decisiones, para mantener cada ADR como un cambio independiente.
- ⏳ Falta migrar los demás recursos (`productos`, `otros`, `reportes`, `auth`) con el mismo patrón.
