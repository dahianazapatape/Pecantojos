require('dotenv').config(); // ADR-002: variables de entorno (.env)
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Auth
app.use('/api/auth', require('./routes/auth'));

// Rutas principales
app.use('/api/clientes',    require('./src/routes/clienteRoutes'));
app.use('/api/pedidos',     require('./src/routes/pedidoRoutes'));

const { categorias, promociones, proveedores, insumos,
        inventario, pagos, compras, productos } = require('./routes/otros');
app.use('/api/categorias',  categorias);
app.use('/api/promociones', promociones);
app.use('/api/proveedores', proveedores);
app.use('/api/insumos',     insumos);
app.use('/api/inventario',  inventario);
app.use('/api/pagos',       pagos);
app.use('/api/compras',     compras);
app.use('/api/productos',   productos);
app.use('/api/reportes', require('./routes/reportes'));

app.get('/api', (req, res) => res.json({ mensaje: '🍪 PECANTOJOS API v2 corriendo' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

/*
  ═══ EJECUTAR EN SSMS ANTES DE USAR EL LOGIN ═══

  CREATE TABLE ADMINS (
    id INT PRIMARY KEY IDENTITY(1,1),
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    nombre VARCHAR(100)
  );

  INSERT INTO ADMINS (usuario, password, nombre)
  VALUES ('admin', '<elige-una-contraseña>', 'Administrador Principal');
*/
