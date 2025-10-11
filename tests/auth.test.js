const mongoose = require("mongoose");
const supertest = require("supertest");
const {app, server} = require("../api/index");
const api = supertest(app) 
const { calculateAge } = require("../src/controllers/authController");

describe("calculateAge()", () => {
  test("debería calcular correctamente la edad para una fecha de nacimiento pasada", () => {
    // Simulamos una fecha de nacimiento: 2000-10-10
    const birthDate = "2000-10-10";
    const expectedAge = new Date().getFullYear() - 2000;

    // Llamamos la función
    const result = calculateAge(birthDate);

    // Verificamos que el resultado sea correcto
    // Puede variar 1 año si el cumpleaños aún no ha pasado este año
    expect([expectedAge, expectedAge - 1]).toContain(result);
  });

  test("debería devolver 0 si la fecha de nacimiento es hoy", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = calculateAge(today);
    expect(result).toBe(0);
  });
});


afterAll(() => {
  mongoose.connection.close();
  server.close();
});