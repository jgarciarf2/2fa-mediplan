const express = require('express');
const router = express.Router();

const medicalRecordController = require('../controllers/medicalRecordController');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');


//http://localhost:3002/api/v1/medicalRecords
router.post('/', authenticateJWT, authorize(["ADMIN", "MEDICO"]), medicalRecordController.createMedicalRecord);
router.get('/history/:patientHistoryId', authenticateJWT, authorize(["ADMIN", "MEDICO"]), medicalRecordController.getMedicalRecordsByHistory);
router.put('/:id', authenticateJWT, authorize(["ADMIN", "MEDICO"]), medicalRecordController.updateMedicalRecord);

module.exports = router;