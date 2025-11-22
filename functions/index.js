const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));

app.use(express.json());

// No endpoints are defined, but the API function is kept for potential future use.
// Example:
// app.post('/hello', (req, res) => {
//   const name = req.body.name || 'World';
//   res.status(200).send(`Hello, ${name}!`);
// });

exports.api = functions.https.onRequest(app);