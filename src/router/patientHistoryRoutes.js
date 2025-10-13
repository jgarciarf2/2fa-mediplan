const express = require('express');
const router = express.Router();

const patientHistoryController = require('../controllers/patientHistoryController');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

router.put('/:patientId', authenticateJWT, authorize(["ADMIN", "MEDICO"]), patientHistoryController.updatePatientHistory);
router.get('/:patientId', authenticateJWT, authorize(["ADMIN", "MEDICO"]), patientHistoryController.getPatientHistory);

module.exports = router;