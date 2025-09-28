const departmentController = require('../controllers/departmentController');
const express = require('express');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');
const router = express.Router();

//http://localhost:3002/api/v1/departments

// Rutas públicas
router.get("/", authenticateJWT, departmentController.getDepartments);
router.get("/:id", authenticateJWT, departmentController.getDepartmentById);
// Rutas protegidas (solo ADMIN)
router.post("/", authenticateJWT, authorize(["ADMIN"]), departmentController.createDepartment);
router.put("/:id", authenticateJWT, authorize(["ADMIN"]), departmentController.updateDepartment);
router.delete("/:id", authenticateJWT, authorize(["ADMIN"]), departmentController.deleteDepartment);

module.exports = router;