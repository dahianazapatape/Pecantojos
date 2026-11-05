# Diagramas — Pecantojos

Aquí están los diagramas del módulo de **Pedidos y Clientes** tal como quedó después de la
re-arquitectura. Reflejan el código que hay hoy en `src/` y lo que se explica en
[`docs/arquitectura.md`](../arquitectura.md).

Todos se hicieron en Lucidchart, en un mismo documento con una página por diagrama:
https://lucid.app/lucidchart/8f597297-0546-4bd8-9de5-e2fae9d2facf/edit?invitationId=inv_52a9cd85-d435-4f74-8687-7a15eefbdbca

## Modelo C4

El modelo C4 muestra el sistema en tres niveles de detalle, como si se hiciera zoom.

| Diagrama | Qué muestra |
|----------|-------------|
| [1. Contexto](1_c4_contexto.webp) | Quién usa el sistema y con qué se conecta. El módulo de Pedidos y Clientes aparece resaltado; los módulos que todavía no se reorganizaron, en gris. |
| [2. Contenedores](2_c4_contenedores.webp) | Las piezas que se ejecutan: la página web, la API, la base de datos y el archivo `.env`, donde se guardan los datos de conexión. |
| [3. Componentes](3_c4_componentes.webp) | Cómo está organizada la API por dentro: cada petición pasa por rutas, controladores, servicios y repositorios hasta llegar a la base de datos. |

## Otras vistas

| Diagrama | Qué muestra |
|----------|-------------|
| [1. Contexto](1_c4_contexto.webp) | Quién usa el sistema y con qué se conecta. El módulo de Pedidos y Clientes aparece resaltado; los módulos que todavía no se reorganizaron, en gris. |
| [2. Contenedores](2_c4_contenedores.webp) | Las piezas que se ejecutan: la página web, la API, la base de datos y el archivo `.env`, donde se guardan los datos de conexión. |
| [3. Componentes](3_c4_componentes.webp) | Cómo está organizada la API por dentro: cada petición pasa por rutas, controladores, servicios y repositorios hasta llegar a la base de datos. |

## Cómo leer los diagramas

Cada caja indica la carpeta del proyecto a la que corresponde y la decisión de arquitectura
(ADR) que la originó:

- **ADR-001:** el código se separó en capas para que sea más fácil de mantener.
- **ADR-002:** los datos de conexión a la base salen del archivo `.env`, no del código.
- **ADR-003:** las operaciones de varios pasos se guardan completas o no se guardan.
- **ADR-004:** las búsquedas usan consultas parametrizadas para evitar inyección SQL.
- **ADR-005:** los datos se revisan antes de llegar a la base de datos.

El borde naranja señala la pieza principal de cada diagrama.

## Cómo actualizarlos

Edita el diagrama en Lucidchart y exporta esa página con **Archivo → Exportar → PNG**.
Guárdala en esta carpeta con el mismo nombre para reemplazar la imagen anterior.


## Historial

- **Semana 13:** se presentaron los diagramas de la arquitectura propuesta. Incluían las
  carpetas `middleware/` y `models/`, que al final no se usaron.
- **Semana 15:** se reemplazaron por la versión final, que coincide con el código real, y se
  agregaron la vista lógica, el despliegue y la secuencia.