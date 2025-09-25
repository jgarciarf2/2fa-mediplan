const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const { getAuditLogs } = require('../controllers/auditController');
//const userRoutes = require('./userRoutes');

router.use("/auth", authRoutes);
router.get("/audit-logs", getAuditLogs);
//router.use("/users", userRoutes);

module.exports = router;