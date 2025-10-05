const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { logEvent } = require("../services/auditService");

// Asignar especialidad a un usuario
const assignSpecialtyToUser = async (req, res) => {
  try {
    const { userId, specialtyId } = req.body;

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!specialty) return res.status(404).json({ msg: "Especialidad no encontrada" });

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { specialtyId },
      include: { specialty: { include: { department: true } } }
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "ASSIGN_SPECIALTY",
      outcome: "SUCCESS",
      reason: `Se asignó la especialidad ${specialtyId} al usuario ${userId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json(updatedUser);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "ASSIGN_SPECIALTY",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error asignando especialidad: " + err.message });
  }
};

// Obtener la especialidad de un usuario
const getUserSpecialties = async (req, res) => {
  try {
    const currentUser = req.user;
    const { userId } = req.params;

    if (currentUser.role !== "ADMIN" && currentUser.userId !== userId) {
      return res.status(403).json({ msg: "Acceso denegado: solo puedes ver tu especialidad" });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { specialty: { include: { department: true } } }
    });

    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USER_SPECIALTY",
      outcome: "SUCCESS",
      reason: `Se consultó la especialidad del usuario ${userId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json(user.specialty);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_USER_SPECIALTY",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error obteniendo especialidad del usuario: " + err.message });
  }
};

// Obtener usuarios por especialidad
const getSpecialtyUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    const { specialtyId } = req.params;

    const specialty = await prisma.specialty.findUnique({ where: { id: specialtyId } });
    if (!specialty) return res.status(404).json({ msg: "Especialidad no encontrada" });

    if (currentUser.role === "MEDICO" && specialty.departmentId !== currentUser.departmentId) {
      return res.status(403).json({ msg: "Acceso denegado: especialidad fuera de tu departamento" });
    }

    const users = await prisma.users.findMany({
      where: { specialtyId },
      include: { department: true }
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_SPECIALTY_USERS",
      outcome: "SUCCESS",
      reason: `Se listaron usuarios de la especialidad ${specialtyId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json(users);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_SPECIALTY_USERS",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error obteniendo usuarios de la especialidad: " + err.message });
  }
};

// Quitar especialidad de un usuario
const removeUserSpecialty = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ msg: "Falta el userId en los parámetros" });
    }

    const user = await prisma.users.findUnique({
      where: { id: String(userId) }
    });

    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    if (!user.specialtyId) {
      await logEvent({
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        action: "REMOVE_SPECIALTY",
        outcome: "FAILURE",
        reason: `El usuario ${userId} no tiene ninguna especialidad asignada`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(400).json({ msg: "El usuario no tiene ninguna especialidad asignada" });
    }

    const updatedUser = await prisma.users.update({
      where: { id: String(userId) },
      data: { specialtyId: null }
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "REMOVE_SPECIALTY",
      outcome: "SUCCESS",
      reason: `Se removió la especialidad del usuario ${userId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ msg: "Especialidad removida del usuario", user: updatedUser });
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "REMOVE_SPECIALTY",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error removiendo especialidad: " + err.message });
  }
};

module.exports = { assignSpecialtyToUser, getSpecialtyUsers, removeUserSpecialty, getUserSpecialties };