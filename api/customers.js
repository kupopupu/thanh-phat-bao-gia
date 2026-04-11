/**
 * api/customers.js
 * GET  /api/customers  → tất cả khách hàng (dạng object {code: {...}})
 * POST /api/customers  → tạo / cập nhật 1 khách hàng
 */
const { getPool } = require('./lib/db');

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    const pool = getPool();
    try {
        if (req.method === 'GET') {
            const { rows } = await pool.query('SELECT * FROM customers ORDER BY updated_at DESC');
            const map = {};
            rows.forEach(r => {
                map[r.code] = {
                    code:      r.code,
                    name:      r.name      || '',
                    phone:     r.phone     || '',
                    address:   r.address   || '',
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : '',
                };
            });
            return res.status(200).json(map);
        }

        if (req.method === 'POST') {
            const c = req.body;
            if (!c || !c.code) return res.status(400).json({ error: 'Missing code' });
            await pool.query(
                `INSERT INTO customers (code, name, phone, address, updated_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (code) DO UPDATE SET
                     name       = EXCLUDED.name,
                     phone      = EXCLUDED.phone,
                     address    = EXCLUDED.address,
                     updated_at = NOW()`,
                [c.code, c.name || '', c.phone || '', c.address || '']
            );
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[api/customers]', err.message);
        return res.status(500).json({ error: err.message });
    }
};
