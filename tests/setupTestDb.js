const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

// Borra recursos de prueba (ajusta según modelos que uses en tests)
async function clearTestData() {
  try {
    // Borrar usuarios con emails que comienzan por 'test_'
    await prisma.users.deleteMany({
      where: {
        email: { startsWith: 'test_' }
      }
    });

    // Si tienes otros modelos de prueba, borralos aquí. Ejemplo:
    // await prisma.patients.deleteMany({ where: { name: { contains: 'test_' } } });

  } catch (err) {
    console.warn('Error limpiando datos de prueba:', err.message);
  }
}

module.exports = { prisma, clearTestData };
