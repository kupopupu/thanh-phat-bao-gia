require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Enable CORS for cross-origin requests (e.g. IDE Live Preview on port 3000 calling API on 3001)
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Map Vercel API routes BEFORE express.static
app.all(['/api/quotes/:id', '/api/quotes/:id/'], (req, res) => {
    req.query = req.query || {};
    req.query.id = req.params.id;
    require('./api/quotes/[id]')(req, res);
});
app.all(['/api/quotes', '/api/quotes/'], (req, res) => require('./api/quotes')(req, res));
app.all(['/api/customers', '/api/customers/'], (req, res) => require('./api/customers')(req, res));
app.all(['/api/products', '/api/products/'], (req, res) => require('./api/products')(req, res));
app.all(['/api/health', '/api/health/'], (req, res) => require('./api/health')(req, res));

// Serve static files AFTER API routes
app.use(express.static(__dirname, { redirect: false }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running locally at http://localhost:${PORT}`);
});
