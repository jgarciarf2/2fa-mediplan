const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Crear departamento
const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ msg: "Nombre requerido" });

    // Verificar si ya existe un departamento con el mismo nombre
    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ msg: "El departamento ya existe" });

    const department = await prisma.department.create({
      data: { name }
    });

    return res.status(201).json(department);
  } catch (err) {
    return res.status(500).json({ msg: "Error creando departamento: " + err.message });
  }
};

// Obtener todos los departamentos
const getDepartments = async (req, res) => {
  try {
    const user = req.user; // viene del authenticateJWT

    let departments;

    // ADMIN ve todos los departamentos
    if (user.role === "ADMIN") {
      departments = await prisma.department.findMany({
        include: { specialties: true, users: true }
      });
    } else {
      // Médicos y enfermeros solo ven su departamento
      departments = await prisma.department.findMany({
        where: { id: user.departmentId },
        include: { specialties: true, users: true }
      });
    }

    return res.json(departments);
  } catch (err) {
    return res.status(500).json({ msg: "Error obteniendo departamentos: " + err.message });
  }
};


// Obtener un departamento por ID
const getDepartmentById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Solo ADMIN o usuarios del mismo departamento pueden acceder
    if (user.role !== "ADMIN" && user.departmentId !== id) {
      return res.status(403).json({ msg: "Acceso denegado a este departamento" });
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: { specialties: true, users: true }
    });

    if (!department) return res.status(404).json({ msg: "Departamento no encontrado" });

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

    const department = await prisma.department.update({
      where: { id },
      data: { name }
    });

    return res.json(department);
  } catch (err) {
    return res.status(500).json({ msg: "Error actualizando departamento: " + err.message });
  }
};

// Eliminar departamento
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.department.delete({
      where: { id }
    });

    return res.json({ msg: "Departamento eliminado" });
  } catch (err) {
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
