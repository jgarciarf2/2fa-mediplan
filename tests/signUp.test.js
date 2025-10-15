const mockPrisma = require("./mocks/prismaMock");
const mockUtils = require("./mocks/utilsMocks");
const mongoose = require("mongoose");
const request = require("supertest");
const {app, server} = require("../api/index");
const bcrypt = require("bcryptjs");


describe("POST /signup", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Faltan datos obligatorios
  test("debería devolver 400 si faltan datos obligatorios", async () => {
    const res = await request(app)
      .post("/api/v1/test/sign-up")
      .send({ email: "test@example.com" }); // faltan campos

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Faltan datos obligatorios.");
  });

  // 2️. Formato de email inválido
  test("debería devolver 400 si el formato de email es incorrecto", async () => {
    const res = await request(app)
      .post("/api/v1/test/sign-up")
      .send({
        email: "correo-invalido",
        current_password: "Password123!",
        fullname: "Test User",
        date_of_birth: "1999-05-10"
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Formato de correo electronico incorrecto.");
  });

  // 3️. Contraseña muy corta
  test("debería devolver 400 si la contraseña tiene menos de 6 caracteres", async () => {
    const res = await request(app)
      .post("/api/v1/test/sign-up")
      .send({
        email: "test@example.com",
        current_password: "Ab1!",
        fullname: "Test User",
        date_of_birth: "1999-05-10"
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("La contraseña debe tener al menos 6 caracteres.");
  });

  // 4️. Contraseña sin complejidad
  test("debería devolver 400 si la contraseña no cumple con la complejidad", async () => {
    const res = await request(app)
      .post("/api/v1/test/sign-up")
      .send({
        email: "test@example.com",
        current_password: "abcdefg",
        fullname: "Test User",
        date_of_birth: "1999-05-10"
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/La contraseña debe contener al menos una letra mayúscula/);
  });

  // 5️. Usuario ya existente
  test("debería devolver 400 si el email ya está registrado", async () => {
    mockPrisma.users.findUnique.mockResolvedValueOnce({ id: 1, email: "test@example.com" });

    const res = await request(app)
      .post("/api/v1/test/sign-up")
      .send({
        email: "test@example.com",
        current_password: "Password123!",
        fullname: "Test User",
        date_of_birth: "1999-05-10"
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("El correo electronico ya está registrado.");
  });

  // 6️. Fecha de nacimiento inválida
  test("debería devolver 400 si la fecha de nacimiento tiene formato incorrecto", async () => {
    mockPrisma.users.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/v1/test/sign-up")
      .send({
        email: "test@example.com",
        current_password: "Password123!",
        fullname: "Test User",
        date_of_birth: "fecha-mala"
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Formato de fecha de nacimiento inválido. Use YYYY-MM-DD");
  });

  // 7️. Éxito al crear usuario
  test("debería crear el usuario y devolver 201", async () => {
    mockPrisma.users.findUnique.mockResolvedValueOnce(null);
    mockPrisma.users.create.mockResolvedValueOnce({
      id: 1,
      email: "test@example.com",
      fullname: "Test User",
      role: "ADMIN",
      status: "PENDING"
    });
    sendVerificationEmail.mockResolvedValueOnce({ success: true });

    const res = await request(app)
      .post("/api/v1/test/sign-up")
      .send({
        email: "test@example.com",
        current_password: "Password123!",
        fullname: "Test User",
        date_of_birth: "1999-05-10"
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("test@example.com");
    expect(sendVerificationEmail).toHaveBeenCalled();
  });
});
afterAll(() => {
  mongoose.connection.close();
  server.close();
});
