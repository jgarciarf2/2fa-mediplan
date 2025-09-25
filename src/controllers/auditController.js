const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

const getAuditLogs = async (req, res) => {
  try {
    const { userId, email, action, outcome } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (email) filters.email = email;
    if (action) filters.action = action;
    if (outcome) filters.outcome = outcome;

    const logs = await prisma.auditLog.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
    });

    res.json(logs);
  } catch (error) {
    console.error("Error obteniendo audit logs:", error);
    res.status(500).json({ msg: "Error interno del servidor" });
  }
};

module.exports = { getAuditLogs };
