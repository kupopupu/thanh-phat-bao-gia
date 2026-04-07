/**
 * api/quotes/[id].js
 * GET    /api/quotes/:id  → lấy 1 báo giá
 * PUT    /api/quotes/:id  → cập nhật báo giá
 * DELETE /api/quotes/:id  → xóa báo giá
 */
const { getPool, rowToQuote } = require('../lib/db');

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const UPSERT_SQL = `
INSERT INTO quotes (
    id, customer_code, customer_name, customer_phone, customer_address,
    total, vat_percent, quote_type,
    deposit_disabled, deposit_amount, deposit_confirmed, paid,
    order_status, received_amount, balance,
    items, created_at, saved_at, updated_at
) VALUES (
    $1,$2,$3,$4,$5,
    $6,$7,$8,
    $9,$10,$11,$12,
    $13,$14,$15,
    $16::jsonb,
    $17::timestamptz, $18::timestamptz, NOW()
)
ON CONFLICT (id) DO UPDATE SET
    customer_code    = EXCLUDED.customer_code,
    customer_name    = EXCLUDED.customer_name,
    customer_phone   = EXCLUDED.customer_phone,
    customer_address = EXCLUDED.customer_address,
    total            = EXCLUDED.total,
    vat_percent      = EXCLUDED.vat_percent,
    quote_type       = EXCLUDED.quote_type,
    deposit_disabled = EXCLUDED.deposit_disabled,
    deposit_amount   = EXCLUDED.deposit_amount,
    deposit_confirmed= EXCLUDED.deposit_confirmed,
    paid             = EXCLUDED.paid,
    order_status     = EXCLUDED.order_status,
    received_amount  = EXCLUDED.received_amount,
    balance          = EXCLUDED.balance,
    items            = EXCLUDED.items,
    saved_at         = EXCLUDED.saved_at,
    updated_at       = NOW()
`;

module.exports = async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const pool = getPool();
    try {
        if (req.method === 'GET') {
            const { rows } = await pool.query('SELECT * FROM quotes WHERE id = $1', [id]);
            if (!rows.length) return res.status(404).json({ error: 'Not found' });
            return res.status(200).json(rowToQuote(rows[0]));
        }

        if (req.method === 'PUT') {
            const q = req.body;
            if (!q) return res.status(400).json({ error: 'Missing body' });
            const params = [
                id,
                q.customerCode    || '',
                q.customerName    || '',
                q.customerPhone   || '',
                q.customerAddress || '',
                Number(q.total)   || 0,
                Number(q.vatPercent) || 0,
                q.quoteType       || 'cup',
                !!q.depositDisabled,
                Number(q.depositAmount) || 0,
                !!q.depositConfirmed,
                !!q.paid,
                q.orderStatus     || 'pending',
                Number(q.receivedAmount) || 0,
                Number(q.balance) || 0,
                JSON.stringify(q.items || []),
                q.createdAt || new Date().toISOString(),
                q.savedAt   || q.createdAt || new Date().toISOString(),
            ];
            await pool.query(UPSERT_SQL, params);
            return res.status(200).json({ ok: true });
        }

        if (req.method === 'DELETE') {
            await pool.query('DELETE FROM quotes WHERE id = $1', [id]);
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[api/quotes/[id]]', err.message);
        return res.status(500).json({ error: err.message });
    }
};
