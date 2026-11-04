# 🍪 Pecantojos — Módulo de Pedidos y Clientes

## Descripción

Pecantojos es el sistema de gestión de un emprendimiento de galletas y postres, que reemplaza el
control manual de clientes, productos, pedidos e inventario. Este repositorio contiene la
**re-arquitectura** del módulo MVP **Pedidos y Clientes**: la aplicación full-stack original
(Node.js/Express + SQL Server + HTML/CSS/JS) se reorganizó en capas y se corrigieron sus problemas
de configuración, consistencia, seguridad y validación.

**Estado:** los 5 ADR están implementados en `main` para Clientes y Pedidos, con 23 pruebas
automáticas y verificación manual contra SQL Server real (ver [Estado actual](#estado-actual)).

## Integrantes

- Dahiana Zapata
- Jhonatan Quintero
- Anggie Rivera
- Sofía Carvajal
- Valentina Marín

## Tecnologías

**Backend:**
- Node.js + [Express](https://expressjs.com/) (`express`, `cors`, `express.Router()`)
- SQL Server con el paquete [`mssql`](https://www.npmjs.com/package/mssql) (driver `tedious`)
- `dotenv`: la conexión se lee de `.env` mediante `src/config/dbConfig.js` (ADR-002)

**Frontend:** HTML, CSS y JavaScript sin frameworks, consumiendo la API con `fetch`.

**Base de datos:** SQL Server, base `PECANTOJOS`.

**Pruebas:** ejecutor nativo de Node (`node --test`), con una base de datos simulada.

> Nota de corrección: la documentación de la Semana 3 describía el backend como Node.js con el
> módulo `http` nativo. El código real usa **Express**; los problemas arquitectónicos no cambian.

## Problemas arquitectónicos identificados

| # | Problema | Decisión |
|---|----------|----------|
| 1 | Rutas que mezclan lógica de negocio y SQL (sin capas) | ADR-001 |
| 2 | Credenciales de la base escritas en `db.js` | ADR-002 |
| 3 | Operaciones de varios pasos sin transacción (agregar detalle, descontar stock, recalcular total) | ADR-003 |
| 4 | Eliminación en cascada sin transacción ni historial | ADR-003 (atomicidad); borrado lógico pendiente |
| 5 | Filtros de búsqueda armados concatenando texto: inyección SQL | ADR-004 |
| 6 | Datos de entrada sin validar: una cantidad negativa aumentaba el stock | ADR-005 |

Detalle y evidencia: [`docs/arquitectura.md`](docs/arquitectura.md).

## Instrucciones de ejecución

1. Clonar el repositorio e instalar dependencias:
   ```bash
   npm install
   ```
2. Configurar la base de datos: copiar `.env.example` a `.env` (no se versiona) y completar
   `DB_USER` y `DB_PASSWORD`. Con SQL Server Express deja `DB_SERVER=localhost\SQLEXPRESS` y no
   definas `DB_PORT`; con una instancia por puerto usa `DB_SERVER=localhost` y `DB_PORT=1433`.
3. Iniciar el servidor:
   ```bash
   npm start
   ```
   Si falta alguna variable en `.env`, el servidor no arranca y dice cuál.
4. Abrir `index.html` en el navegador.
5. Ejecutar las pruebas (no necesitan base de datos):
   ```bash
   npm test
   ```
   Resultado esperado: 23 pruebas, 0 fallos.

## Estructura de carpetas

```
Pecantojos/
├── src/                     ← Código refactorizado en capas (módulo MVP)
│   ├── routes/              ← clienteRoutes.js, pedidoRoutes.js            (ADR-001)
│   ├── controllers/         ← clienteController.js, pedidoController.js    (ADR-001)
│   ├── services/            ← clienteService.js, pedidoService.js          (ADR-001, 003, 005)
│   ├── repositories/        ← clienteRepository.js, pedidoRepository.js    (ADR-001, 003, 004)
│   ├── validators/          ← validaciones.js                              (ADR-005)
│   ├── config/              ← dbConfig.js, lee .env                        (ADR-002)
│   └── utils/               ← httpError.js, transaction.js                 (ADR-001, 003)
├── routes/                  ← Recursos aún no migrados a capas (ver abajo)
├── tests/                   ← transacciones.test.js, parametrizacion.test.js, validacion.test.js
├── docs/
│   ├── arquitectura.md      ← Arquitectura objetivo, RNF, componentes, decisiones
│   ├── adr/                 ← 0001 a 0005, un archivo por decisión
│   └── diagramas/           ← C4: contexto, contenedores, componentes
├── resources/               ← Recursos de apoyo
├── server.js                ← Punto de entrada Express (monta las rutas en capas)
├── db.js                    ← Pool de SQL Server con la configuración de dbConfig.js
├── sesion.js                ← Contraseñas cifradas (scrypt) y tokens de sesión
├── index.html               ← Frontend
├── .env.example             ← Plantilla de configuración (el .env real no se sube)
├── README.md
└── CHANGELOG.md
```

`routes/clientes.js` y `routes/pedidos.js` se eliminaron: los reemplazan las versiones en capas de
`src/`. Siguen en `routes/` los recursos fuera del MVP: `auth.js`, `productos.js`, `reportes.js` y
`otros.js` (categorías, promociones, proveedores, insumos, inventario, pagos, compras). Los filtros
de `otros.js` ya están parametrizados (ADR-004).

## Arquitectura

- Arquitectura objetivo, RNF, componentes y decisiones: [`docs/arquitectura.md`](docs/arquitectura.md)
- Diagramas C4: [`docs/diagramas/`](docs/diagramas/)
- Decisiones de refactorización: [`docs/adr/`](docs/adr/)

## Estado actual

- [x] Semana 3: módulo MVP seleccionado, problemas arquitectónicos y justificación de viabilidad.
- [x] Semana 4/8: atributos de calidad (mantenibilidad, portabilidad, confiabilidad) y escenarios.
- [x] Semana 8: diagramas de casos de uso, flujo, paquetes y clases.
- [x] Semana 13: arquitectura objetivo, tabla de componentes, diagramas C4 y 5 ADR.
- [x] ADR-001 implementado: Clientes y Pedidos en capas; `server.js` monta `src/routes/`.
- [x] ADR-002 implementado: la conexión se lee de `.env`; `db.js` sin credenciales.
- [x] ADR-003 implementado: agregar/eliminar detalle, eliminar pedido y la cascada de clientes
  corren en transacciones (COMMIT o ROLLBACK).
- [x] ADR-004 implementado: filtros de Clientes, Pedidos y `routes/otros.js` parametrizados.
- [x] ADR-005 implementado: los servicios validan los datos antes de abrir la transacción.
- [x] 23 pruebas automáticas (`npm test`).
- [x] Verificación manual con SQL Server real:
  - sin `.env`, el servidor no arranca y nombra las variables faltantes;
  - `GET /api/clientes` y `GET /api/pedidos` listan los datos reales;
  - `GET /api/clientes?ciudad=' OR '1'='1` devuelve una lista vacía;
  - `GET /api/pedidos/abc` responde 400 con un mensaje claro;
  - el frontend inicia sesión y lista clientes y pedidos igual que antes.

### Pendiente para la Semana 15

- [ ] Medir las métricas de los RNF con SQL Server real: rollback ante un fallo provocado
  (RNF-03), instalación en otro equipo solo con `.env` (RNF-02) y stock sin cambios ante una
  cantidad inválida (RNF-05).
- [ ] Agregar las fuentes editables de los diagramas C4 en `docs/diagramas/`.
- [ ] Borrado lógico con historial para pedidos y clientes (problema 4).
- [ ] Mostrar en el frontend el mensaje de los errores 400.
- [ ] Migrar a capas los recursos que siguen en `routes/`.

## Reparto de trabajo

Cada integrante implementó su decisión en una rama propia y la integró a `main` con un pull request.

| Decisión | Atributo | Archivos principales | Responsable | PR |
|----------|----------|----------------------|-------------|----|
| ADR-001 — Separar en capas | Mantenibilidad | `src/routes`, `controllers`, `services`, `repositories`, `server.js` | Dahiana Zapata | #1 |
| ADR-002 — Externalizar configuración | Portabilidad | `src/config/dbConfig.js`, `db.js`, `.env.example` | Sofía Carvajal | #7 |
| ADR-003 — Control transaccional | Confiabilidad | `src/utils/transaction.js`, servicios y repositorios | Valentina Marín | #8 |
| ADR-004 — Parametrizar consultas | Seguridad | `src/repositories/*`, `routes/otros.js` | Jhonatan Quintero | #9 |
| ADR-005 — Validar datos de entrada | Confiabilidad | `src/validators/validaciones.js`, servicios | Anggie Rivera | #10 |
| Documentación final | — | `README.md`, `CHANGELOG.md`, `docs/arquitectura.md` | Dahiana Zapata | — |
