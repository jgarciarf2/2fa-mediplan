const express = require('express');
const multer = require('multer');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

const adminController = require('../controllers/adminController');
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

router.post('/upload', authenticateJWT, authorize(["ADMIN"]), upload.single('file'), adminController.bulkUploadUsers);
router.delete('/delete', authenticateJWT, authorize(["ADMIN"]), upload.single('file'), adminController.bulkDeleteUsers);

module.exports = router;