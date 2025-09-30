const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Listar todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    // Opcional: recibir query params para filtrar
    const { role, departmentId, specialtyId } = req.query;

    // Construir condiciones dinámicas
    let where = {};
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (specialtyId) where.specialtyId = specialtyId;

    const users = await prisma.users.findMany({
      where,
      include: {
        department: true,
        specialty: true,
      },
    });

    res.status(200).json(users);
  } catch (error) {
    console.log("Error fetching users:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.users.findUnique({
      where: { id },
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log("Error fetching user:", error);
    res.status(500).json({
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

module.exports = { getAllUsers, getUserById };
