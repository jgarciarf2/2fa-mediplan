const bcrypt = require("bcrypt");

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

jest.mock("../../src/config/emailConfig", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../../src/config/emailConfig", () => ({
  generateVerificationCode: jest.fn().mockReturnValue("123456"),
}));

jest.mock("../../src/controllers/authController", () => ({
  signUp: jest.fn((req, res) => res.status(201).json({ msg: "Usuario creado (mock)" })),
  validateAge: jest.fn().mockReturnValue(25),
}));



module.exports = { };
