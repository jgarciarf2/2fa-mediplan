const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const testRoutes = require('./testRoutes');

const departments = require('./departmentRoutes');
const specialties = require('./specialityRoutes');
const userSpecialties = require('./userSpecialityRoutes');
const userRoutes = require('./userRoutes');
const bulkRoutes = require('./bulkRoutes');
const patientRoutes = require('./patientRoutes');
const { getAuditLogs } = require('../controllers/auditController');

console.log('Cargando rutas principales...');

// Endpoint para verificar el estado del servidor
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Servidor funcionando correctamente 🚀",
    timestamp: new Date().toISOString()
  });
});

router.use("/auth", authRoutes);
router.use("/departments", departments);
router.use("/specialties", specialties);
router.use("/user-specialties", userSpecialties);
router.get("/audit-logs", getAuditLogs);
router.use("/users", userRoutes);
router.use("/bulk", bulkRoutes);
router.use('/patients', patientRoutes);
router.use("/test", testRoutes);

module.exports = router;