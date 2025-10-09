const authController = require('../controllers/authController');
const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');
const multer = require('multer');
const os = require('os');

// Configuración de multer para manejar archivos en memoria
const upload = multer({
  dest: os.tmpdir(),
});
console.log('Cargando authRoutes...');

//http://localhost:3002/api/v1/auth
router.post('/sign-up', authenticateJWT, authorize(["ADMIN"]), authController.signUp);
router.post('/sign-up', authController.signUp);
router.post('/sign-in', authController.signIn);
router.post("/resend-verification", authController.resendVerificationCode);
router.post("/verify-email", authController.verifyEmail);
router.post("/verify-2fa", authController.verify2faLogin);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);
router.post("/password-reset", authController.requestPasswordReset);
router.post("/verify-password", authController.resetPasswordWithCode);
module.exports = router;