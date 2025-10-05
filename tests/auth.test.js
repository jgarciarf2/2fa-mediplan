const request = require("supertest");
const app = require("../src/index");


describe("Pruebas del endpoint /sign-up", () => {
  it("Debería registrar un usuario nuevo correctamente", async () => {
    const uniqueEmail = `test_${Date.now()}@example.com`; // correo único para cada prueba
    const strongPassword = "Abc123$"; // cumple cON regex
    const dateOfBirth = "1995-05-20"; // formato válido

    const response = await request(app)
      .post("/api/v1/auth/sign-up")
      .send({
        email: uniqueEmail,
        current_password: strongPassword,
        fullname: "Test User",
        date_of_birth: dateOfBirth,
        role: "ADMIN"
      });

    console.log("Respuesta del servidor:", response.body); 

    expect([200, 201]).toContain(response.statusCode); // acepta 200 o 201
    expect(response.body).toHaveProperty("email", uniqueEmail);
  });
});
