const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Listar todos los usuarios
const getUsers = async (req, res) => {
  try {
    // Opcional: recibir query params para filtrar
    const { role, departmentId, specialtyId } = req.query;

    // Construir condiciones dinámicas
    let where = {};
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (specialtyId) where.userSpecialties = { some: { specialtyId } };

    const users = await prisma.users.findMany({
      where,
      include: {
        department: true,
        userSpecialties: { include: { specialty: true } },
      },
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

module.exports = { getUsers };
