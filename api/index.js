const express = require('express');
const serverless = require('serverless-http');
const database = require('../src/config/database');
const routes = require('../src/router/routes');
const bodyParser = require('body-parser');
const cors = require('cors');

//elastic para búsqueda avanzada de paciventes
const { createPatientIndex } = require("../src/config/elasticSetup");
createPatientIndex().catch(err => console.error("Error creando índice:", err));

require('dotenv').config();
const port =  process.env.PORT || 3002;


console.log('FRONTEND_PORT:', process.env.FRONTEND_PORT);
console.log('PORT:', port);

const app = express();

<<<<<<< Updated upstream
// Configuración de CORS
=======
const server = app.listen(port, () => {
  console.log(`Servidor local corriendo en http://localhost:${port}`);
})

>>>>>>> Stashed changes
app.use(cors({
    origin: process.env.FRONTEND_PORT,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
}));

// Middleware: POST, PUT, PATCH
app.use(bodyParser.json());

// Debug middleware para ver todas las peticiones
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.use('/api/v1', routes);

if (process.env.NODE_ENV === "test") {
  const testRoutes = require("../src/router/testRoutes");
  app.use("/api/v1/test", testRoutes);
} else {
  const routes = require("../src/router/routes");
  app.use("/api/v1", routes);
}

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor activo 🚀' });
});

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
    console.log(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada' });
});

const server = app.listen(port, () => {
  console.log(`Servidor local corriendo en http://localhost:${port}`);
})

if (require.main === module) {
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Servidor local corriendo en http://localhost:${port}`);
  });
}

// Iniciar el servidor 
database();

module.exports = {app, server}; // exporta la app
module.exports.handler = serverless(app); // handler que usa Vercel