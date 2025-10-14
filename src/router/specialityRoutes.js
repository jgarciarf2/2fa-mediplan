const specialtyController = require('../controllers/specialtyController');
const express = require('express');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');
const router = express.Router();

//http://localhost:3002/api/v1/specialties

// Rutas públicas
router.get("/", authenticateJWT, authorize(["ADMIN", "MEDICO", "ENFERMERO"]), specialtyController.getSpecialties);
router.get("/:id", authenticateJWT, authorize(["ADMIN", "MEDICO", "ENFERMERO"]), specialtyController.getSpecialtyById);
router.get('/departmentId/:departmentId/', authenticateJWT, authorize(["ADMIN", "MEDICO", "ENFERMERO"]), specialtyController.getSpecialtiesByDepartment);
// Rutas protegidas (solo ADMIN)
router.post("/", authenticateJWT, authorize(["ADMIN"]), specialtyController.createSpecialty);
router.put("/:id", authenticateJWT, authorize(["ADMIN"]), specialtyController.updateSpecialty);
router.delete("/:id", authenticateJWT, authorize(["ADMIN"]), specialtyController.deleteSpecialty);

module.exports = router;
