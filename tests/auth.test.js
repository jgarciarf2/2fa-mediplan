const request = require("supertest");
const {app, server} = require("../src/index");

const api = supertest(app) 


afterAll(() => {
  server.close();
});