const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

// http://localhost:3002/api/v1/users
router.get("/", authenticateJWT, authorize(["ADMIN", "MEDICO", "ENFERMERO"]), userController.getAllUsers);
router.get("/:id", authenticateJWT, authorize(["ADMIN", "MEDICO", "ENFERMERO"]), userController.getUserById);

module.exports = router;
