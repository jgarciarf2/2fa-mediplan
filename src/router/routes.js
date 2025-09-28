const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const departments = require('./departmentRoutes');
const specialties = require('./specialityRoutes');
const userSpecialties = require('./userSpecialityRoutes');
const userRoutes = require('./userRoutes');
const { getAuditLogs } = require('../controllers/auditController');
//const userRoutes = require('./userRoutes');

router.use("/auth", authRoutes);
router.use("/departments", departments);
router.use("/specialties", specialties);
router.use("/user-specialties", userSpecialties);
router.get("/audit-logs", getAuditLogs);
router.use("/users", userRoutes);

module.exports = router;