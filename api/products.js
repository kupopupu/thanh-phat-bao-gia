/**
 * api/products.js
 * GET  /api/products           → trả về tất cả sản phẩm (mảng)
 * POST /api/products           → upsert 1 sản phẩm (theo name)
 * POST /api/products?bulk=1    → upsert nhiều sản phẩm (mảng)
 * DELETE /api/products?name=X  → xóa 1 sản phẩm theo name
 */
const { getPool } = require('./lib/db');

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const UPSERT_SQL = `
    INSERT INTO products (name, unit, price, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (name) DO UPDATE SET
        unit       = EXCLUDED.unit,
        price      = EXCLUDED.price,
        updated_at = NOW()
`;

function rowToProduct(r) {
    return {
        code:      r.code       || '',
        name:      r.name       || '',
        unit:      r.unit       || '',
        price:     Number(r.price) || 0,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : '',
    };
}

module.exports = async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    const pool = getPool();
    try {
        // ── GET: tải toàn bộ danh mục ─────────────────────────
        if (req.method === 'GET') {
            const { rows } = await pool.query(
                'SELECT * FROM products ORDER BY name ASC'
            );
            return res.status(200).json(rows.map(rowToProduct));
        }

        // ── DELETE: xóa 1 sản phẩm ────────────────────────────
        if (req.method === 'DELETE') {
            const name = req.query.name || (req.body && req.body.name);
            if (!name) return res.status(400).json({ error: 'Missing name' });
            await pool.query('DELETE FROM products WHERE name = $1', [name]);
            return res.status(200).json({ ok: true });
        }

        // ── POST: upsert 1 hoặc nhiều sản phẩm ───────────────
        if (req.method === 'POST') {
            const body = req.body;

            // bulk=1: mảng sản phẩm
            if (req.query.bulk === '1' && Array.isArray(body)) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    for (const p of body) {
                        if (p && p.name && p.name.trim()) {
                            await client.query(UPSERT_SQL, [
                                p.name.trim(),
                                p.unit  || '',
                                Number(p.price) || 0,
                            ]);
                        }
                    }
                    await client.query('COMMIT');
                } catch (e) {
                    await client.query('ROLLBACK');
                    throw e;
                } finally {
                    client.release();
                }
                return res.status(200).json({ ok: true, count: body.length });
            }

            // Single upsert: return the saved product object (including generated `code`)
            if (!body || !body.name) return res.status(400).json({ error: 'Missing name' });
            await pool.query(UPSERT_SQL, [
                body.name.trim(),
                body.unit  || '',
                Number(body.price) || 0,
            ]);
            // Fetch the saved row to return full object (including code)
            const { rows } = await pool.query('SELECT * FROM products WHERE name = $1', [body.name.trim()]);
            if (!rows || !rows.length) return res.status(200).json({ ok: true });
            const prod = rows[0];
            return res.status(200).json({ ok: true, product: rowToProduct(prod) });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[api/products]', err.message);
        return res.status(500).json({ error: err.message });
    }
};
