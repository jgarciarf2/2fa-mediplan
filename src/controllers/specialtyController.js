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
    const { page, limit } = req.query;
    const hasPagination = page && limit;
    let specialties, total;

    if (hasPagination) {
      const pageNum = parseInt(page);
      const pageSize = parseInt(limit);
      const skip = (pageNum - 1) * pageSize;

      if (user.role === "ADMIN") {
        [specialties, total] = await Promise.all([
          prisma.specialty.findMany({
            include: { department: true },
            skip,
            take: pageSize,
            orderBy: { id: "asc" },
          }),
          prisma.specialty.count(),
        ]);
      } else {
        [specialties, total] = await Promise.all([
          prisma.specialty.findMany({
            where: { userSpecialties: { some: { userId: user.userId } } },
            include: { department: true },
            skip,
            take: pageSize,
            orderBy: { id: "asc" },
          }),
          prisma.specialty.count({
            where: { userSpecialties: { some: { userId: user.userId } } },
          }),
        ]);
      }

      res
        .set("X-Total-Count", total)
        .set("X-Total-Pages", Math.ceil(total / pageSize))
        .status(200)
        .json(specialties);
    } else {
      // Sin paginación
      if (user.role === "ADMIN") {
        specialties = await prisma.specialty.findMany({ include: { department: true } });
      } else {
        specialties = await prisma.specialty.findMany({
          where: { userSpecialties: { some: { userId: user.userId } } },
          include: { department: true },
        });
      }

      res.status(200).json(specialties);
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

// Obtener especialidades de un departamento específico
const getSpecialtiesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { page, limit } = req.query;
    const hasPagination = page && limit;

    // Validar que el departamento exista
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      return res.status(404).json({ msg: "Departamento no encontrado" });
    }

    let specialties, total;

    if (hasPagination) {
      const pageNum = parseInt(page);
      const pageSize = parseInt(limit);
      const skip = (pageNum - 1) * pageSize;

      [specialties, total] = await Promise.all([
        prisma.specialty.findMany({
          where: { departmentId },
          include: { department: true },
          skip,
          take: pageSize,
          orderBy: { id: "asc" },
        }),
        prisma.specialty.count({ where: { departmentId } }),
      ]);

      res
        .set("X-Total-Count", total)
        .set("X-Total-Pages", Math.ceil(total / pageSize))
        .status(200)
        .json(specialties);
    } else {
      specialties = await prisma.specialty.findMany({
        where: { departmentId },
        include: { department: true },
        orderBy: { id: "asc" },
      });

      res.status(200).json(specialties);
    }

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_SPECIALTIES_BY_DEPARTMENT",
      outcome: "SUCCESS",
      reason: `Listó especialidades del departamento ${departmentId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (err) {
    console.error("Error listando especialidades por departamento:", err);
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "GET_SPECIALTIES_BY_DEPARTMENT",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error listando especialidades por departamento: " + err.message });
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
  deleteSpecialty,
  getSpecialtiesByDepartment
};
