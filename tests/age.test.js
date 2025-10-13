const mongoose = require("mongoose");
const supertest = require("supertest");
const {app, server} = require("../api/index");
const api = supertest(app) 
const { calculateAge, validateAge } = require("../src/controllers/authController");


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

describe("validateAge()", () => {
  test("debería devolver la edad si está entre 0 y 100", () => {
    const dob = "1989-05-10";
    const age = validateAge(dob);
    expect(age).toBeGreaterThanOrEqual(0);
    expect(age).toBeLessThanOrEqual(100);
  });

  test("debería lanzar error si la edad es negativa (fecha futura)", () => {
    const futureDate = "2234-01-01";
    expect(() => validateAge(futureDate)).toThrow("Edad inválida");
  });

  test("debería lanzar error si la edad es mayor a 100 años", () => {
    const oldDate = "1700-01-01";
    expect(() => validateAge(oldDate)).toThrow("Edad inválida");
  });

  test("debería lanzar error si la fecha es inválida", () => {
    const invalidDate = "fecha-no-valida";
    expect(() => validateAge(invalidDate)).toThrow("Edad inválida");
  });
});

afterAll(() => {
  mongoose.connection.close();
  server.close();
});