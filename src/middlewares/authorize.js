const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// Middleware de autorización basado en roles, departamentos y especialidades
const authorize = (allowedRoles = [], allowedDepartments = [], allowedSpecialties = []) => {
  return async (req, res, next) => {
    const user = req.user;

    // Rol
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ msg: "Acceso denegado: rol inválido" });
    }

    // Departamento
    if (allowedDepartments.length && !allowedDepartments.includes(user.departmentId)) {
      return res.status(403).json({ msg: "Acceso denegado: departamento inválido" });
    }

    // Especialidades
    if (allowedSpecialties.length) {
      const userSpecialties = await prisma.userSpecialty.findMany({
        where: { userId: user.userId },
        select: { specialtyId: true }
      });
      const userSpecialtyIds = userSpecialties.map(us => us.specialtyId);

      const hasSpecialty = allowedSpecialties.some(spec => userSpecialtyIds.includes(spec));
      if (!hasSpecialty) {
        return res.status(403).json({ msg: "Acceso denegado: especialidad inválida" });
      }
    }

    next();
  };
};

module.exports = authorize;
