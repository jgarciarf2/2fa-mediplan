const userSpecialtiesController = require('../controllers/userSpecialtyController');
const express = require('express');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');
const router = express.Router();

//http://localhost:3002/api/v1/user-specialties

// Consultar especialidades por usuario solo ADMIN/MEDICO/ENFERMERO
router.get("/user/:userId", authenticateJWT, authorize(["ADMIN", "MEDICO", "ENFERMERO"]), userSpecialtiesController.getUserSpecialties);
// Consultar usuarios por especialidad solo ADMIN/MEDICO
router.get("/specialty/:specialtyId", authenticateJWT, authorize(["ADMIN", "MEDICO"]), userSpecialtiesController.getSpecialtyUsers);
// Rutas protegidas (solo ADMIN)
router.post("/", authenticateJWT, authorize(["ADMIN"]), userSpecialtiesController.assignSpecialtyToUser);
router.delete("/:userId", authenticateJWT, authorize(["ADMIN"]), userSpecialtiesController.removeUserSpecialty);

module.exports = router;