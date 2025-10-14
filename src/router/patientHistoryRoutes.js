const express = require('express');
const router = express.Router();
const patientHistoryController = require('../controllers/patientHistoryController');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

//http://localhost:3002/api/v1/patientHistories
router.put('/:patientId', authenticateJWT, authorize(["ADMIN", "MEDICO"]), patientHistoryController.updatePatientHistory);
router.get('/:patientId', authenticateJWT, authorize(["ADMIN", "MEDICO"]), patientHistoryController.getPatientHistory);
router.get('/timeline/:patientId', authenticateJWT, authorize(["ADMIN", "MEDICO"]), patientHistoryController.getPatientTimeline);

module.exports = router;