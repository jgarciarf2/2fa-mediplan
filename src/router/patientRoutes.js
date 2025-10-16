const express = require('express');
const router = express.Router();
const patientService = require('../controllers/patientController');
const searchController = require('../controllers/searchController');
const { uploadMultiple } = require('../config/multer');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

//http://localhost:3002/api/v1/patients
router.post('/', authenticateJWT, authorize(["ADMIN"]), patientService.createPatient);
router.get('/', authenticateJWT, authorize(["ADMIN"]), patientService.getAllPatients);

//búsqueda avanzada
router.get('/advanced-search', authenticateJWT, authorize(["ADMIN", "MEDICO"]), searchController.searchPatients);

router.get('/:id', authenticateJWT, authorize(["ADMIN"]), patientService.getPatientById);
router.get('/user/:userId', authenticateJWT, authorize(["ADMIN"]), patientService.getPatientByUserId);
router.put('/:id', authenticateJWT, authorize(["ADMIN"]), patientService.updatePatient);
router.delete('/:id', authenticateJWT, authorize(["ADMIN"]), patientService.deletePatient);

router.post('/:patientId/diagnostics', authenticateJWT, authorize(["MEDICO"]), uploadMultiple, patientService.createDiagnostic);

module.exports = router;
