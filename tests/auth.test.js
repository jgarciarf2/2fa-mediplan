const request = require("supertest");
const app = require("../src/index");

jest.setTimeout(20000);

// Inicia el servidor antes de las pruebas
beforeAll(async () => {
  jest.setTimeout(20000); // aumenta el tiempo máximo de ejecución a 20s
  server = app.listen(3003, () => console.log("Servidor de pruebas corriendo en 3003"));
});

// Cierra el servidor después de las pruebas
afterAll(async () => {
  if (server) {
    server.close();
  }
});

describe("Pruebas del endpoint /sign-up", () => {
  it("Debería registrar un usuario nuevo correctamente", async () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const response = await request(server)
      .post("/api/v1/auth/sign-up")
      .send({
        fullname: "Test User",
        email: uniqueEmail,
        current_password: "Password123!",
        date_of_birth: "1995-05-20",
      });

    console.log("Respuesta del servidor:", response.body);

    expect([200, 201]).toContain(response.statusCode);
    expect(response.body).toHaveProperty("email", uniqueEmail);
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("status");

  });
});
