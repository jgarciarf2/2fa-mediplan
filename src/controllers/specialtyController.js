const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Crear especialidad
const createSpecialty = async (req, res) => {
  try {
    const { name, departmentId } = req.body;
    if (!name || !departmentId) {
      return res.status(400).json({ msg: "Nombre y departamento son requeridos" });
    }

    const existing = await prisma.specialty.findFirst({ where: { name, departmentId } });
    if (existing) {
      return res.status(400).json({ msg: "La especialidad ya existe en este departamento" });
    }

    // Validar que exista el departamento
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      return res.status(400).json({ msg: "Departamento no encontrado" });
    }

    const specialty = await prisma.specialty.create({
      data: { name, departmentId }
    });

    return res.status(201).json(specialty);
  } catch (err) {
    return res.status(500).json({ msg: "Error creando especialidad: " + err.message });
  }
};


// Obtener todas las especialidades
const getSpecialties = async (req, res) => {
  const user = req.user;

  // Admin ve todo
  if (user.role === "ADMIN") {
    const specialties = await prisma.specialty.findMany({ include: { department: true } });
    return res.json(specialties);
  }

  // Médicos y enfermeros solo ven sus especialidades
  const specialties = await prisma.specialty.findMany({
    where: {
      userSpecialties: {
        some: { userId: user.userId } // solo sus especialidades
      }
    },
    include: { department: true }
  });

  res.json(specialties);
};

// Obtener una especialidad por ID
const getSpecialtyById = async (req, res) => {
  try {
    const { id } = req.params;

    const specialty = await prisma.specialty.findUnique({
      where: { id },
      include: { department: true, userSpecialties: true }
    });

    if (!specialty) return res.status(404).json({ msg: "Especialidad no encontrada" });

    return res.json(specialty);
  } catch (err) {
    return res.status(500).json({ msg: "Error obteniendo especialidad: " + err.message });
  }
};

// Actualizar especialidad
const updateSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId } = req.body;

    const specialty = await prisma.specialty.update({
      where: { id },
      data: { name, departmentId }
    });

    return res.json(specialty);
  } catch (err) {
    return res.status(500).json({ msg: "Error actualizando especialidad: " + err.message });
  }
};

// Eliminar especialidad
const deleteSpecialty = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.specialty.delete({
      where: { id }
    });

    return res.json({ msg: "Especialidad eliminada" });
  } catch (err) {
    return res.status(500).json({ msg: "Error eliminando especialidad: " + err.message });
  }
};

module.exports = {
  createSpecialty,
  getSpecialties,
  getSpecialtyById,
  updateSpecialty,
  deleteSpecialty
};
