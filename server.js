require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // serve static files (index.html, assets, etc)

// Map Vercel API routes
app.all('/api/quotes', (req, res) => require('./api/quotes')(req, res));
app.all('/api/customers', (req, res) => require('./api/customers')(req, res));
app.all('/api/products', (req, res) => require('./api/products')(req, res));
app.all('/api/health', (req, res) => require('./api/health')(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running locally at http://localhost:${PORT}`);
});
