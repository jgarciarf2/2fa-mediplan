const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

const authorize = (allowedRoles = [], allowedDepartments = [], allowedSpecialties = []) => {
  return async (req, res, next) => {
    const user = req.user;

    // Verificar rol
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para acceder a este recurso",
        requiredRole: allowedRoles,
        yourRole: user.role
      });
    }

    // Verificar departamento
    if (allowedDepartments.length && !allowedDepartments.includes(user.departmentId)) {
      return res.status(403).json({
        success: false,
        message: "Acceso denegado: departamento inválido",
        requiredDepartments: allowedDepartments,
        yourDepartment: user.departmentId
      });
    }

    // Verificar especialidades
    if (allowedSpecialties.length) {
      const userSpecialties = await prisma.userSpecialty.findMany({
        where: { userId: user.userId },
        select: { specialtyId: true }
      });
      const userSpecialtyIds = userSpecialties.map(us => us.specialtyId);

      const hasSpecialty = allowedSpecialties.some(spec => userSpecialtyIds.includes(spec));
      if (!hasSpecialty) {
        return res.status(403).json({
          success: false,
          message: "Acceso denegado: especialidad inválida",
          requiredSpecialties: allowedSpecialties,
          yourSpecialties: userSpecialtyIds
        });
      }
    }
    next();
  };
};

module.exports = authorize;