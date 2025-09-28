const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Asignar especialidad a un usuario
const assignSpecialtyToUser = async (req, res) => {
  try {
    const { userId, specialtyId } = req.body;

    // Verificar que existan usuario y especialidad
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!specialty) return res.status(404).json({ msg: "Especialidad no encontrada" });

    // Crear asignación
    const userSpecialty = await prisma.userSpecialty.create({
      data: { userId, specialtyId }
    });

    return res.status(201).json(userSpecialty);
  } catch (err) {
    return res.status(500).json({ msg: "Error asignando especialidad: " + err.message });
  }
};

// Obtener todas las especialidades de un usuario
const getUserSpecialties = async (req, res) => {
  try {
    const currentUser = req.user;
    const { userId } = req.params;

    // Validación de acceso: solo ADMIN y el propio usuario pueden ver sus especialidades
    if (currentUser.role !== "ADMIN" && currentUser.userId !== userId) {
      return res.status(403).json({ msg: "Acceso denegado: solo puedes ver tus especialidades" });
    }

    const userSpecialties = await prisma.userSpecialty.findMany({
      where: { userId },
      include: { specialty: { include: { department: true } } }
    });

    return res.json(userSpecialties);
  } catch (err) {
    return res.status(500).json({ msg: "Error obteniendo especialidades del usuario: " + err.message });
  }
};

// Obtener todos los usuarios de una especialidad
const getSpecialtyUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    const { specialtyId } = req.params;

    const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!specialty) return res.status(404).json({ msg: "Especialidad no encontrada" });

    // Validación de acceso:
    // ADMIN puede ver cualquier usuario de su departamento
    // MEDICO solo puede ver usuarios de su especialidad y mismo departamento
    if (currentUser.role === "MEDICO" && specialty.departmentId !== currentUser.departmentId) {
      return res.status(403).json({ msg: "Acceso denegado: especialidad fuera de tu departamento" });
    }

    const specialtyUsers = await prisma.userSpecialty.findMany({
      where: { specialtyId },
      include: { user: true }
    });

    return res.json(specialtyUsers);
  } catch (err) {
    return res.status(500).json({ msg: "Error obteniendo usuarios de la especialidad: " + err.message });
  }
};

// Eliminar asignación (desvincular especialidad de un usuario)
const removeUserSpecialty = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.userSpecialty.delete({ where: { id } });

    return res.json({ msg: "Asignación eliminada" });
  } catch (err) {
    return res.status(500).json({ msg: "Error eliminando asignación: " + err.message });
  }
};

module.exports = {
  assignSpecialtyToUser,
  getUserSpecialties,
  getSpecialtyUsers,
  removeUserSpecialty
};
