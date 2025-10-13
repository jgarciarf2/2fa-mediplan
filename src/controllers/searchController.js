const client = require("../config/elasticClient");
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

async function searchPatients(req, res) {
  try {
    const { fullName, age, diagnosis } = req.query;

    const patients = await prisma.patientDemographics.findMany({
      where: {
        fullName: fullName ? { contains: fullName, mode: 'insensitive' } : undefined,
        age: age ? Number(age) : undefined,
        patientHistory: diagnosis
          ? {
              medicalRecords: {
                some: {
                  diagnosis: { contains: diagnosis, mode: 'insensitive' }
                }
              }
            }
          : undefined,
      },
      include: {
        patientHistory: {
          include: {
            medicalRecords: true,
          },
        },
        department: true,
        specialty: true,
      },
    });

    res.json(patients);
  } catch (error) {
    console.error('Error buscando pacientes:', error);
    res.status(500).json({ message: 'Error al realizar búsqueda avanzada', error: error.message });
  }
}

module.exports = { searchPatients };
