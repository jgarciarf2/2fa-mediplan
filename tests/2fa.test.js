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

// Endpoint sign-up, verify-email, sign-in y verificar-2fa

describe("Pruebas del endpoint /sign-up /verify-email /sign-in /verify-2fa", () => {
    it("Debería iniciar sesión y luego verificar 2FA correctamente", async () => {  
        const uniqueEmail = `test_${Date.now()}@example.com`;
        const password = "Password123!";
        // Primero, registra un usuario nuevo
        const signUpResponse = await request(server)
            .post("/api/v1/auth/sign-up")
            .send({
                fullname: "Test User",
                email: uniqueEmail,         
                current_password: password,
                date_of_birth: "1995-05-20",
            });
        expect([200, 201]).toContain(signUpResponse.statusCode);        
        // Simula obtener el código de verificación (en un caso real, esto vendría del email)
        const verificationCode = signUpResponse.body.verificationCode; // Debe coincidir con el código generado en el controlador
        // Luego, verifica el email con el código simulado
        const verifyResponse = await request(server)
            .post("/api/v1/auth/verify-email")          
            .send({
                email: uniqueEmail,
                verificationCode: verificationCode, // usa el código real
            });
        expect(verifyResponse.statusCode).toBe(200);
        expect(verifyResponse.body).toHaveProperty("msg", "Email verified successfully");   
        // Ahora, intenta iniciar sesión
        const signInResponse = await request(server)
            .post("/api/v1/auth/sign-in")       
            .send({
                email: uniqueEmail,
                current_password: password, 
            }); 
        expect(signInResponse.statusCode).toBe(200);
        expect(signInResponse.body).toHaveProperty("tempToken");
        const tempToken = signInResponse.body.tempToken;
        expect(tempToken).toBeDefined();    
        // Simula obtener el código 2FA (en un caso real, esto vendría de una app de autenticación)
        // Aquí asumimos que el código 2FA es "123456" para fines de prueba
        const twoFACode = "123456"; // Debe coincidir con el código generado en el controlador
        // Luego, verifica el 2FA con el código simulado
        const verify2FAResponse = await request(server)         
            .post("/api/v1/auth/verify-2fa")
            .send({
                email: uniqueEmail, 
                code: signInResponse.body.code, // usa el código real
                tempToken: tempToken,
            }); 
        expect(verify2FAResponse.statusCode).toBe(200);
        expect(verify2FAResponse.body).toHaveProperty("accessToken");
        expect(verify2FAResponse.body).toHaveProperty("refreshToken");
    }
    );  
    it("Debería fallar al verificar 2FA con un código inválido", async () => {  
        const uniqueEmail = `test_${Date.now()}@example.com`;
        const password = "Password123!";        
        // Primero, registra un usuario nuevo
        const signUpResponse = await request(server)    
            .post("/api/v1/auth/sign-up")
            .send({
                fullname: "Test User",
                email: uniqueEmail,         
                current_password: password,
                date_of_birth: "1995-05-20",    
            }); 
        expect([200, 201]).toContain(signUpResponse.statusCode);        
        // Simula obtener el código de verificación (en un caso real, esto vendría del email)
        const verificationCode = signUpResponse.body.verificationCode; // Debe coincidir con el código generado en el controlador   
        // Luego, verifica el email con el código simulado
        const verifyResponse = await request(server)
            .post("/api/v1/auth/verify-email")
            .send({
                email: uniqueEmail, 
                verificationCode: verificationCode, // usa el código real
            });
        expect(verifyResponse.statusCode).toBe(200);
        expect(verifyResponse.body).toHaveProperty("msg", "Email verified successfully");   
        // Ahora, intenta iniciar sesión
        const signInResponse = await request(server)
            .post("/api/v1/auth/sign-in")   
            .send({
                email: uniqueEmail,
                current_password: password, 
            }); 
        expect(signInResponse.statusCode).toBe(200);
        expect(signInResponse.body).toHaveProperty("tempToken");
        const tempToken = signInResponse.body.tempToken;
        expect(tempToken).toBeDefined();    
        // Intenta verificar el 2FA con un código incorrecto
        const invalidCode = "000000";
        const verify2FAResponse = await request(server)         
            .post("/api/v1/auth/verify-2fa")
            .send({
                email: uniqueEmail, 
                code: invalidCode, // código inválido
                tempToken: tempToken,
            }); 
        expect(verify2FAResponse.statusCode).toBe(400);
        expect(verify2FAResponse.body).toHaveProperty("msg", "Invalid or expired 2FA code");
    });
});
