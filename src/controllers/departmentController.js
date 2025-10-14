const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { logEvent } = require("../services/auditService");

// Crear departamento
const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ msg: "Nombre requerido" });
    }

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ msg: "El departamento ya existe" });
    }

    const department = await prisma.department.create({
      data: { name }
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "CREATE_DEPARTMENT",
      outcome: "SUCCESS",
      reason: `Departamento ${name} creado`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json(department);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "CREATE_DEPARTMENT",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error creando departamento: " + err.message });
  }
};

// Obtener todos los departamentos
const getDepartments = async (req, res) => {
  try {
    const user = req.user;
    const { page, limit } = req.query;
    const hasPagination = page && limit;
    let departments, total;

    if (hasPagination) {
      const pageNum = parseInt(page);
      const pageSize = parseInt(limit);
      const skip = (pageNum - 1) * pageSize;

      if (user.role === "ADMIN") {
        [departments, total] = await Promise.all([
          prisma.department.findMany({
            include: { specialties: true, users: true },
            skip,
            take: pageSize,
            orderBy: { id: "asc" },
          }),
          prisma.department.count(),
        ]);
      } else {
        [departments, total] = await Promise.all([
          prisma.department.findMany({
            where: { id: user.departmentId },
            include: { specialties: true, users: true },
            skip,
            take: pageSize,
            orderBy: { id: "asc" },
          }),
          prisma.department.count({ where: { id: user.departmentId } }),
        ]);
      }

      res
        .set("X-Total-Count", total)
        .set("X-Total-Pages", Math.ceil(total / pageSize))
        .status(200)
        .json(departments);
    } else {
      // Sin paginación
      if (user.role === "ADMIN") {
        departments = await prisma.department.findMany({
          include: { specialties: true, users: true },
        });
      } else {
        departments = await prisma.department.findMany({
          where: { id: user.departmentId },
          include: { specialties: true, users: true },
        });
      }

      res.status(200).json(departments);
    }
  } catch (err) {
    return res.status(500).json({ msg: "Error obteniendo departamentos: " + err.message });
  }
};

// Obtener un departamento por ID
const getDepartmentById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (user.role !== "ADMIN" && user.departmentId !== id) {
      return res.status(403).json({ msg: "Acceso denegado a este departamento" });
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: { specialties: true, users: true }
    });

    if (!department) {
      return res.status(404).json({ msg: "Departamento no encontrado" });
    }

    return res.json(department);
  } catch (err) {
    return res.status(500).json({ msg: "Error obteniendo departamento: " + err.message });
  }
};

// Actualizar departamento
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ msg: "Nombre requerido" });
    }

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      return res.status(400).json({ msg: "Ya existe un departamento con ese nombre" });
    }

    const department = await prisma.department.update({
      where: { id },
      data: { name }
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "UPDATE_DEPARTMENT",
      outcome: "SUCCESS",
      reason: `Departamento ${id} actualizado a ${name}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json(department);
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "UPDATE_DEPARTMENT",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error actualizando departamento: " + err.message });
  }
};

// Eliminar departamento
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
      return res.status(404).json({ msg: "Departamento no encontrado" });
    }

    await prisma.department.delete({ where: { id } });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "DELETE_DEPARTMENT",
      outcome: "SUCCESS",
      reason: `Departamento ${id} eliminado`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ msg: "Departamento eliminado correctamente" });
  } catch (err) {
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "DELETE_DEPARTMENT",
      outcome: "FAILURE",
      reason: err.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(500).json({ msg: "Error eliminando departamento: " + err.message });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
};
