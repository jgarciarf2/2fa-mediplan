const express = require('express');
const serverless = require('serverless-http');
const database = require('../src/config/database');
const routes = require('../src/router/routes');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();
const port = process.env.PORT || 5173;

console.log('FRONTEND_PORT:', process.env.FRONTEND_PORT);
console.log('PORT:', port);

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_PORT,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // Para soportar navegadores legacy
}));

// Middleware: POST, PUT, PATCH
app.use(bodyParser.json());

// Debug middleware para ver todas las peticiones
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

app.get('/', (req, res) => {
  res.json({ mensaje: 'Servidor activo 🚀' });
});

app.use('/api/v1', routes);

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
    console.log(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada' });
});

module.exports = app; // exporta la app
module.exports.handler = serverless(app); // handler que usa Vercel

// Iniciar el servidor 
database(); // ✅ Ejecuta la conexión al iniciar