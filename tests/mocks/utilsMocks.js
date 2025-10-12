const bcrypt = require("bcrypt");

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

jest.mock("../../src/utils/sendVerificationEmail", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../../src/utils/generateVerificationCode", () => ({
  generateVerificationCode: jest.fn().mockReturnValue("123456"),
}));

jest.mock("../../src/utils/validateAge", () => ({
  validateAge: jest.fn().mockReturnValue(25),
}));

module.exports = { bcrypt };
