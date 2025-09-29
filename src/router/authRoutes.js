const authController = require('../controllers/authController');
const express = require('express');
const router = express.Router();

console.log('Cargando authRoutes...');

//http://localhost:3002/api/v1/auth
console.log('Registrando rutas POST /sign-up y /sign-in...');
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