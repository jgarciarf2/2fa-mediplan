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
  validateAge: jest.fn().mockReturnValue(25),
}));



module.exports = { bcrypt };
