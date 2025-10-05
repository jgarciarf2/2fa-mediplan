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

// Endpoint para sign-up y  verify-email
describe("Pruebas del endpoint /sign-up y /verify-email", () => {
  it("Debería verificar el email correctamente con un código válido", async () => { 
    const uniqueEmail = `test_${Date.now()}@example.com`;
    // Registro de un nuevo usuario 
    const signUpResponse = await request(server)
        .post("/api/v1/auth/sign-up")
        .send({
            fullname: "Test User",
            email: uniqueEmail,
            current_password: "Password123!",
            date_of_birth: "1995-05-20",
        }); 

    console.log("Respuesta del servidor:", signUpResponse.body);
    expect([200, 201]).toContain(signUpResponse.statusCode);

    // Simula obtener el código de verificación (en un caso real, esto vendría del email)
    //const verificationCode = "123456"; // Debe coincidir con el código generado en el controlador   
    // Luego, verifica el email con el código simulado
    const verifyResponse = await request(server)
        .post("/api/v1/auth/verify-email")
        .send({
            email: uniqueEmail,
            verificationCode: signUpResponse.body.verificationCode, // usa el código real
        });
    console.log("Respuesta de verificación:", verifyResponse.body);
    expect(verifyResponse.statusCode).toBe(200);
    expect(verifyResponse.body).toHaveProperty("msg", "Email verified successfully");
  });

  it("Debería fallar al verificar el email con un código inválido", async () => {   
    const uniqueEmail = `test_${Date.now()}@example.com`;
    // Primero, registra un usuario nuevo
    const signUpResponse = await request(server)
        .post("/api/v1/auth/sign-up")
        .send({
            fullname: "Test User",
            email: uniqueEmail,
            current_password: "Password123!",
            date_of_birth: "1995-05-20",
        }); 
    expect([200, 201]).toContain(signUpResponse.statusCode);    
    // Intenta verificar el email con un código incorrecto
    //const invalidCode = "000000";       
    const verifyResponse = await request(server)
        .post("/api/v1/auth/verify-email")
        .send({ 
            email: uniqueEmail,
            verificationCode: "000000", // código inválido
        }); 
    console.log("Respuesta de verificación con código inválido:", verifyResponse.body);
    expect(verifyResponse.statusCode).toBe(400);
    expect(verifyResponse.body).toHaveProperty("msg", "Invalid or expired verification code");
  });
});
