const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

async function logEvent({ userId, email, role, action, outcome, reason, ip, userAgent }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        email,
        action,
        outcome,
        reason,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Error guardando audit log:", error);
  }
}

module.exports = { logEvent };
