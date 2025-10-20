const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

//http://localhost:3002/api/v1/documents
router.get("/:id", authenticateJWT, authorize(["MEDICO"]), documentController.downloadDocument);
router.delete("/:id", authenticateJWT, authorize(["MEDICO"]), documentController.deleteDocument);


module.exports = router;