const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Ruta de prueba para registrar usuarios sin autorización
router.post("/sign-up", authController.signUp);

module.exports = router;