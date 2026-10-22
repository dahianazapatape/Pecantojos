# Diagramas C4 — Pecantojos

Diagramas del modelo C4 de la arquitectura **objetivo** (post-refactorización) del módulo de
Pedidos y Clientes, según lo decidido en los ADR (`docs/adr/`) y documentado en
`docs/arquitectura.md`.

| Nivel | Archivo | Qué muestra |
|-------|---------|-------------|
| 1 — Contexto | [`1_c4_contexto.png`](1_c4_contexto.png) | Quién usa el sistema (Encargado del negocio) y con qué otro sistema interactúa (SQL Server). |
| 2 — Contenedores | [`2_c4_contenedores.png`](2_c4_contenedores.png) | Los bloques desplegables del sistema: Frontend Web, Backend API (Node.js + Express), sus piezas transversales (`config/`, `middleware/`) y la base de datos SQL Server. |
| 3 — Componentes | [`3_c4_componentes.png`](3_c4_componentes.png) | La estructura interna en capas del Backend API: `routes → controllers → services → repositories`, más `middleware/`, `config/` y `models/`. |

## Cómo leerlos

- Las etiquetas **ADR-00X** dentro de cada componente (nivel 3) señalan qué decisión de
  `docs/adr/` introduce o modifica ese componente:
  - **ADR-001** (mantenibilidad) — crea `controllers/`, `services/` y `repositories/`.
  - **ADR-002** (portabilidad) — crea `config/`, que lee la conexión desde `.env`.
  - **ADR-003** (confiabilidad) — agrega control transaccional dentro de `services/`.
  - **ADR-004** (seguridad) — parametriza las consultas dentro de `repositories/`.
- Estos diagramas representan la arquitectura **objetivo**, es decir, cómo debería verse el
  sistema una vez aplicados los 4 ADR — no el estado actual del código heredado (`routes/`,
  `db.js` en la raíz del proyecto), que todavía mezcla estas responsabilidades en un solo
  archivo por recurso.

## Cómo se generaron

Los PNG se generaron con un script de Python (`matplotlib`) siguiendo la notación estándar de
[C4 Model](https://c4model.com/) (persona, sistema, contenedor, componente, base de datos). El
script no se incluye en este repositorio porque no es parte del código de la aplicación; si se
necesita volver a generarlos o editarlos, puede rehacerse con cualquier herramienta de
diagramación (draw.io, Structurizr, Mermaid, etc.) siguiendo el mismo contenido.
