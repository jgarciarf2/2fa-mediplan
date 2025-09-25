const express = require('express');
const database = require('./config/database');
const routes = require('./router/routes');
const bodyParser = require('body-parser');
require('dotenv').config();
const port = process.env.PORT || 3000;

const app = express();
// Middleware: POST, PUT, PATCH
app.use(bodyParser.json());
app.use('/api/v1', routes);

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
    database();
});