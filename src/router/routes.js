const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');

console.log('Cargando rutas principales...');
const departments = require('./departmentRoutes');
const specialties = require('./specialityRoutes');
const userSpecialties = require('./userSpecialityRoutes');
const userRoutes = require('./userRoutes');
const bulkRoutes = require('./bulkRoutes')
const { getAuditLogs } = require('../controllers/auditController');
//const userRoutes = require('./userRoutes');

// ✅ Endpoint para verificar el estado del servidor
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Servidor funcionando correctamente 🚀",
    timestamp: new Date().toISOString()
  });
});

console.log('Registrando ruta /auth...');
router.use("/auth", authRoutes);
router.use("/departments", departments);
router.use("/specialties", specialties);
router.use("/user-specialties", userSpecialties);
router.get("/audit-logs", getAuditLogs);
router.use("/users", userRoutes);
router.use("/bulk", bulkRoutes)

module.exports = router;