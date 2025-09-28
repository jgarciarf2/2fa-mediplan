const express = require("express");
const router = express.Router();
const { getUsers } = require("../controllers/userController");

// http://localhost:3002/api/v1/users
router.get("/", getUsers);

module.exports = router;
