const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticateJWT = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/authorize');

// http://localhost:3002/api/v1/users
router.get("/", authenticateJWT, authorize(["ADMIN"]), userController.getAllUsers);
router.get("/role/:role", authenticateJWT, authorize(["ADMIN"]), userController.getUsersByRole);
router.get("/department/:departmentId", authenticateJWT, authorize(["ADMIN"]), userController.getUsersByDepartment);
router.get("/specialty/:specialtyId", authenticateJWT, authorize(["ADMIN"]), userController.getUsersBySpecialty);
router.get("/status/:status", authenticateJWT, authorize(["ADMIN"]), userController.getUsersByStatus);
router.get("/page", authenticateJWT, authorize(["ADMIN"]), userController.getUserPage);
router.patch("/state/:id", authenticateJWT, authorize(["ADMIN"]), userController.updateUserState);
router.get("/:id", authenticateJWT, authorize(["ADMIN", "MEDICO", "ENFERMERO"]), userController.getUserById);
router.put("/:id", authenticateJWT, authorize(["ADMIN", "MEDICO", "ENFERMERO"]), userController.updateUser);
router.delete("/:id", authenticateJWT, authorize(["ADMIN"]), userController.deleteUser);

module.exports = router;
