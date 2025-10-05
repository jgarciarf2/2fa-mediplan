const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { logEvent } = require("../services/auditService");

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

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "CREATE_SPECIALTY",
      outcome: "SUCCESS",
      reason: `Especialidad '${name}' creada en depto ${departmentId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json(specialty);
  } catch (err) {
    return res.status(500).json({ msg: "Error creando especialidad: " + err.message });
  }
};


// Obtener todas las especialidades
const getSpecialties = async (req, res) => {
  const user = req.user;
  try {
    let specialties;

    if (user.role === "ADMIN") {
      specialties = await prisma.specialty.findMany({ include: { department: true } });
    } else {
      specialties = await prisma.specialty.findMany({
        where: { userSpecialties: { some: { userId: user.userId } } },
        include: { department: true }
      });
    }

    await logEvent({
      userId: user.id,
      email: user.email,
      role: user.role,
      action: "GET_SPECIALTIES",
      outcome: "SUCCESS",
      reason: `Obtuvo ${specialties.length} especialidades`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json(specialties);
  } catch (err) {
    await logEvent({
      userId: user.id,
      email: user.email,
      role: user.role,
      action: "GET_SPECIALTIES",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return res.status(500).json({ msg: "Error listando especialidades: " + err.message });
  }
};

// Obtener una especialidad por ID
const getSpecialtyById = async (req, res) => {
  try {
    const { id } = req.params;

    const specialty = await prisma.specialty.findUnique({
      where: { id },
      include: { department: true, userSpecialties: true }
    });

    if (!specialty) {
      await logEvent({
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        action: "GET_SPECIALTY",
        outcome: "FAILURE",
        reason: `Especialidad ${id} no encontrada`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return res.status(404).json({ msg: "Especialidad no encontrada" });
    }

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_SPECIALTY",
      outcome: "SUCCESS",
      reason: `Consultó especialidad ${id}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json(specialty);

  } catch (err) {
    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_SPECIALTY",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
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

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "UPDATE_SPECIALTY",
      outcome: "SUCCESS",
      reason: `Especialidad ${id} actualizada`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json(specialty);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "UPDATE_SPECIALTY",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return res.status(500).json({ msg: "Error actualizando especialidad: " + err.message });
  }
};

// Eliminar especialidad
const deleteSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const specialty = await prisma.specialty.findUnique({ where: { id } });
    if (!specialty) {
      await logEvent({
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        action: "DELETE_SPECIALTY",
        outcome: "FAILURE",
        reason: `Especialidad ${id} no encontrada`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(404).json({ msg: "Especialidad no encontrada" });
    }

    await prisma.specialty.delete({ where: { id } });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "DELETE_SPECIALTY",
      outcome: "SUCCESS",
      reason: `Especialidad ${id} eliminada`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json({ msg: "Especialidad eliminada correctamente" });
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "DELETE_SPECIALTY",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

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
