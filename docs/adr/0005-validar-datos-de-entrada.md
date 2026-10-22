# ADR-005: Validar los datos de entrada antes de llegar a la base de datos

**Estado:** Implementada para Clientes y Pedidos
**Atributo de calidad que mejora:** Confiabilidad (integridad de los datos) *(hallazgo adicional,
Semana 13; complementa el ADR-003 y no reemplaza los 3 atributos priorizados en Semana 4/8)*
**Responsable:** Anggie Rivera

## Contexto

Al migrar Clientes y Pedidos a capas (ADR-001) se revisó qué validaciones hacía el código sobre
los datos que llegan en `req.body` y `req.params`. Hoy casi no hay ninguna: los valores pasan
directo al repository y la base de datos es la única barrera.

El caso más grave está en **`POST /api/pedidos/:id/detalle`** (agregar un producto a un pedido):

```js
// src/services/pedidoService.js (antes de este ADR)
const cant = parseInt(cantidad);          // "" o "abc" -> NaN ;  "-3" -> -3
if (stockActual < cant) throw ...         // 100 < NaN es false ; 100 < -3 es false
await repo.descontarStock(id_producto, cant, tx);
```

- Si `cantidad` llega vacía o como texto, `parseInt` devuelve `NaN`, la verificación de stock
  **no lo detiene** y se intenta guardar un detalle con cantidad y subtotal `NaN`.
- Si `cantidad` llega **negativa**, la verificación de stock la deja pasar y "descontar"
  `-3` unidades **aumenta** el inventario, y el total del pedido queda negativo.

Otros casos encontrados:

- `POST /api/clientes` acepta un cliente sin nombre o con un correo mal escrito (`ana@`).
- `POST /api/pedidos` acepta un pedido sin `id_cliente`, o con fecha de entrega anterior a la
  fecha del pedido.
- Un id no numérico en la URL (`/api/pedidos/abc`) llega hasta SQL Server y se responde con un
  error 500 genérico en vez de un 400 que explique el problema.

**Impacto del problema:** datos corruptos en la base (inventario y totales descuadrados, clientes
incompletos) que el ADR-003 no puede evitar, porque una transacción confirma (COMMIT) igual de
bien un dato válido que uno inválido. Además, el frontend recibe errores 500 poco claros.

## Decisión

Validar los datos de entrada en la capa `services/` (ADR-001), **antes** de abrir una
transacción (ADR-003) o de llamar al repository, mediante un módulo único de reglas:
`src/validators/validaciones.js`.

- Si un dato no cumple una regla, se lanza un `HttpError(400)` cuyo mensaje lista **todos** los
  problemas encontrados (no solo el primero), para que el usuario corrija todo de una vez.
- Un dato inválido **no ejecuta ninguna consulta**: no se abre transacción ni se toca la base.

```js
// src/services/pedidoService.js (después de este ADR)
async function agregarDetalle(idPedidoParam, datos = {}) {
  const id_pedido = validarId(idPedidoParam, 'id del pedido');
  validarDetalle(datos);            // 400 si cantidad <= 0, NaN, decimal, o precio negativo
  // ... recién aquí se abre la transacción del ADR-003
}
```

### Reglas implementadas

| Entidad | Campo | Regla |
|---------|-------|-------|
| Cliente | `nombre_cliente` | Obligatorio (no vacío) |
| Cliente | `correo` | Opcional; si viene, formato `algo@dominio.ext` |
| Cliente | `telefono` | Opcional; si viene, solo números, espacios, guiones y `+` (7 a 20 caracteres) |
| Cliente | `fecha_registro` | Opcional; si viene, fecha válida |
| Pedido | `id_cliente` | Obligatorio; entero mayor que 0 |
| Pedido | `fecha_pedido`, `fecha_entrega` | Opcionales; fechas válidas; la entrega no puede ser anterior al pedido |
| Pedido | `valor_total` | Opcional; número mayor o igual a 0 |
| Detalle | `id_producto` | Obligatorio; entero mayor que 0 |
| Detalle | `cantidad` | Obligatorio; entero mayor que 0 |
| Detalle | `precio_unitario` | Obligatorio; número mayor o igual a 0 |
| Todas | `id` en la URL | Entero mayor que 0 |

Se aceptan números escritos como texto (`"2"`, `"3000"`), porque así llegan desde los
formularios HTML del frontend.

## Código afectado

- **Nuevo:** `src/validators/validaciones.js` — `validarId`, `validarCliente`, `validarPedido`,
  `validarDetalle`.
- `src/services/clienteService.js` — `obtenerPorId`, `obtenerDependencias`, `crear`,
  `actualizar` y `eliminar` validan antes de continuar.
- `src/services/pedidoService.js` — `obtenerPorId`, `obtenerDependencias`, `crear`, `actualizar`,
  `agregarDetalle`, `eliminarDetalle` y `eliminar` validan antes de continuar.
- **No cambian:** controllers, routes ni repositories. Los controllers ya traducen `HttpError` a
  su código de estado, así que el 400 llega al frontend sin tocar nada más.

## Consecuencias

**Positivas:**
- Se cierra el error de inventario con cantidades negativas o `NaN`.
- Los datos inválidos se rechazan antes de llegar a SQL Server: menos carga y nunca se abre una
  transacción innecesaria.
- El frontend recibe un 400 con un mensaje que dice exactamente qué corregir, en lugar de un 500.
- Las reglas quedan en un solo archivo, fácil de leer, probar y ampliar (apoya RNF-01).

**Negativas / costos:**
- Algunas reglas se repiten con las restricciones de la base de datos (por ejemplo, `NOT NULL`).
  Se acepta esa duplicación porque la validación en el código da mensajes claros y evita viajes
  innecesarios a la base.
- Si en el futuro cambia una regla de negocio (por ejemplo, permitir precio 0 solo en
  promociones), hay que actualizar `validaciones.js`.
- Las reglas de longitud máxima de texto no se incluyeron todavía; deben alinearse con el tamaño
  real de las columnas `VARCHAR` de la base de datos.

## Alternativas consideradas

- **Confiar solo en las restricciones de SQL Server (`NOT NULL`, `CHECK`):** descartada porque
  la base no detecta todos los casos (una cantidad negativa es un entero válido para SQL Server)
  y sus errores llegan al usuario como un 500 poco claro.
- **Usar una librería de validación (Joi, express-validator, zod):** descartada por ahora para no
  agregar dependencias en esta entrega; las reglas son pocas y se pueden migrar a una librería
  más adelante sin cambiar los services.
- **Validar como middleware en `routes/`:** descartada porque el ADR-001 ubica las reglas de
  negocio en `services/`, y así las mismas reglas protegen cualquier otra forma de llamar al
  servicio (por ejemplo, las pruebas o un futuro proceso por lotes).

## Cómo se mide el cumplimiento (RNF-05, ver `docs/arquitectura.md`)

El 100% de las operaciones de escritura de Clientes y Pedidos valida sus datos antes de llegar a
la base. Una petición con datos inválidos (cantidad negativa o vacía, cliente sin nombre, correo
mal escrito, id no numérico) responde **400** con un mensaje que explica el error y ejecuta
**0 consultas** contra la base de datos.

## Avance de implementación

- ✅ `src/validators/validaciones.js` — reglas de Cliente, Pedido, Detalle e id.
- ✅ `src/services/clienteService.js` y `pedidoService.js` — validan antes de abrir la transacción
  (ADR-003) o de llamar al repository.
- ✅ `tests/validacion.test.js` — 13 pruebas con una base de datos simulada: verifican el 400, que
  un dato inválido no ejecute ninguna consulta, y que un dato válido siga funcionando igual.
  Se ejecutan con `npm test`.
- ⏳ Falta una prueba manual contra SQL Server real (por ejemplo, agregar un detalle con
  `cantidad: -3` debe responder 400 y el stock del producto no debe cambiar).
- ⏳ Falta mostrar el mensaje del 400 en el frontend, si hoy solo muestra "Error".
