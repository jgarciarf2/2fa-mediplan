// database.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  const { DATABASE_URL, DATABASE_URL_TEST, NODE_ENV } = process.env;

  const connectString = NODE_ENV === 'test' 
    ? DATABASE_URL_TEST 
    : DATABASE_URL;

  if (!connectString) {
    throw new Error('❌ Verificar que el archivo .env tenga TODAS las variables de entorno definidas');
  }

  try {
    const conn = await mongoose.connect(connectString);
    console.log(`✅ MongoDB Connected: ${conn.connection.name} (${NODE_ENV})`);
  } catch (error) {
    console.error('❌ Error al conectar con MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
