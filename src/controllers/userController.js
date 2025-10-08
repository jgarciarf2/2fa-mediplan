const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const { logEvent } = require("../services/auditService");

// Listar todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const { role, departmentId, specialtyId, status } = req.query;

    let where = {};
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (specialtyId) where.specialtyId = specialtyId;
    if (status) where.status = status;

    const users = await prisma.users.findMany({
      where,
      include: {
        department: true,
        specialty: true,
      },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_ALL_USERS",
      outcome: "SUCCESS",
      reason: `Listó usuarios con filtros ${JSON.stringify(req.query)}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(users);
  } catch (error) {
    console.log("Error fetching users:", error);
    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_ALL_USERS",
      outcome: "FAILURE",
      reason: `Listó usuarios con filtros ${JSON.stringify(req.query)}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// Listar usuarios por rol
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    const users = await prisma.users.findMany({
      where: { role },
      include: {
        department: true,
        specialty: true,
      },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USERS_BY_ROLE",
      outcome: "SUCCESS",
      reason: `Listó usuarios con rol ${role}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users by role:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// Listar usuarios por departamento
const getUsersByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const users = await prisma.users.findMany({
      where: { departmentId: parseInt(departmentId) },
      include: {
        department: true,
        specialty: true,
      },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USERS_BY_DEPARTMENT",
      outcome: "SUCCESS",
      reason: `Listó usuarios del departamento ${departmentId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users by department:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// Listar usuarios por especialidad
const getUsersBySpecialty = async (req, res) => {
  try {
    const { specialtyId } = req.params;

    const users = await prisma.users.findMany({
      where: { specialtyId: parseInt(specialtyId) },
      include: {
        department: true,
        specialty: true,
      },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USERS_BY_SPECIALTY",
      outcome: "SUCCESS",
      reason: `Listó usuarios con especialidad ${specialtyId}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users by specialty:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// Listar usuarios por estado
const getUsersByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const users = await prisma.users.findMany({
      where: { status },
      include: {
        department: true,
        specialty: true,
      },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USERS_BY_STATUS",
      outcome: "SUCCESS",
      reason: `Listó usuarios con estado ${status}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users by status:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

// Obtener usuario por ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.users.findUnique({
      where: { id },
      include: { department: true, specialty: true },
    });
    if (!user) {
      await logEvent({
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        action: "GET_USER",
        outcome: "FAILURE",
        reason: `Usuario ${id} no encontrado`,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USER",
      outcome: "SUCCESS",
      reason: `Consultó al usuario ${id}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(user);
  } catch (error) {
    console.log("Error fetching user:", error);

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USER",
      outcome: "FAILURE",
      reason: `Consultó al usuario ${id}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({
      message: "Error obteniendo usuario",
      error: error.message,
    });
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullname, phone, date_of_birth } = req.body;

  try {
    let age = null;
    let dob = null;
    if (date_of_birth) {
      dob = new Date(date_of_birth);
      age = calculateAge(dob);
    }

    const updatedUser = await prisma.users.update({
      where: { id },
      data: {
        fullname: fullname ? fullname.trim().toUpperCase() : undefined,
        phone: phone || undefined,
        date_of_birth: dob || undefined,
        age: age || undefined,
      },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "UPDATE_USER",
      outcome: "SUCCESS",
      reason: `Usuario ${id} actualizado`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "UPDATE_USER",
      outcome: "FAILURE",
      reason: error.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(500).json({ msg: "Error actualizando usuario", error: error.message });
  }
};

// Cambiar estado del usuario (ACTIVO/INACTIVO)
const updateUserState = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return res.status(400).json({ msg: "Estado inválido (use ACTIVE o INACTIVE)" });
  }

  try {
    const user = await prisma.users.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const updatedUser = await prisma.users.update({
      where: { id },
      data: { status },
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "UPDATE_USER_STATE",
      outcome: "SUCCESS",
      reason: `Estado cambiado a ${status} para usuario ${id}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user state:", error);
    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "UPDATE_USER_STATE",
      outcome: "FAILURE",
      reason: error.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    res.status(500).json({ msg: "Error cambiando estado", error: error.message });
  }
};

// Listado paginado de usuarios
const getUserPage = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: { department: true, specialty: true },
      }),
      prisma.users.count({ where }),
    ]);

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USER_PAGE",
      outcome: "SUCCESS",
      reason: `Página ${page}, límite ${limit}, filtros ${JSON.stringify(req.query)}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json({
      data: users,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "GET_USER_PAGE",
      outcome: "FAILURE",
      reason: `Página ${page}, límite ${limit}, filtros ${JSON.stringify(req.query)}`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({ msg: "Error listando usuarios", error: error.message });
  }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si existe el usuario
    const userExists = await prisma.users.findUnique({
      where: { id }
    });

    if (!userExists) {
      return res.status(404).json({ msg: `No se encontró el usuario con id ${id}` });
    }

    // Eliminar usuario
    await prisma.users.delete({
      where: { id }
    });

    await logEvent({
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      action: "DELETE_USER",
      outcome: "SUCCESS",
      reason: `Usuario ${id} eliminado`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ msg: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando usuario:", error);

    await logEvent({
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      action: "DELETE_USER",
      outcome: "FAILURE",
      reason: error.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(500).json({ msg: "Error eliminando usuario", error: error.message });
  }
};

const calculateAge = (date) => {
  const today = new Date();
  const birthDate = new Date(date);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

module.exports = { getAllUsers, getUserById, updateUser, updateUserState, getUserPage, deleteUser, getUsersByRole, getUsersByDepartment, getUsersBySpecialty, getUsersByStatus };
