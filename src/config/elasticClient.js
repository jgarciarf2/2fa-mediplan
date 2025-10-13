const { Client } = require("@elastic/elasticsearch");

const client = new Client({
  node: process.env.ELASTIC_URL || "http://localhost:9200",
  auth: {
    username: process.env.ELASTIC_USERNAME || "elastic",
    password: process.env.ELASTIC_PASSWORD || "Test123"
  }
});

module.exports = client;
