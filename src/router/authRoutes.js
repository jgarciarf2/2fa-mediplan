const authController = require('../controllers/authController');
const express = require('express');
const router = express.Router();

//http://localhost:3000/api/v1/auth/sign-up
router.post('/sign-up', authController.signUp);
router.post('/sign-in', authController.signIn);
router.post("/resend-verification", authController.resendVerificationCode);
router.post("/verify-email", authController.verifyEmail);
router.post("/verify-2fa", authController.verify2faLogin);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

module.exports = router;