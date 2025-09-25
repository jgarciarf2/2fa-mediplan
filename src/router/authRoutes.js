const authController = require('../controllers/authController');
const express = require('express');
const router = express.Router();

//http://localhost:3000/api/v1/auth/sign-up
router.post('/sign-up', authController.signUp);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationCode);

module.exports = router;