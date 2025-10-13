const client = require("./elasticClient");

async function createPatientIndex() {
  const exists = await client.indices.exists({ index: "patients" });
  if (!exists) {
    await client.indices.create({
      index: "patients",
      body: {
        mappings: {
          properties: {
            fullName: { type: "text" },
            phone: { type: "keyword" },
            email: { type: "keyword" },
            age: { type: "integer" },
            gender: { type: "keyword" },
            address: { type: "text" },
            departmentId: { type: "keyword" },
            specialtyId: { type: "keyword" },
            diagnosis: { type: "text" },
            createdAt: { type: "date" }
          }
        }
      }
    });
    console.log("Índice 'patients' creado");
  } else {
    console.log("Índice 'patients' ya existe");
  }
}

module.exports = { createPatientIndex };
