/**
 * api/quotes.js
 * GET  /api/quotes       → trả về tối đa 200 báo giá gần nhất
 * POST /api/quotes       → tạo hoặc cập nhật 1 báo giá (upsert theo id)
 * POST /api/quotes?bulk=1 → bulk upsert mảng báo giá từ client
 */
const { getPool, rowToQuote } = require('./lib/db');

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

async function upsertOne(pool, q) {
    const params = [
        q.id,
        q.customerCode    || '',
        q.customerName    || '',
        q.customerPhone   || '',
        q.customerAddress || '',
        Number(q.total)           || 0,
        Number(q.vatPercent)      || 0,
        q.quoteType       || 'cup',
        !!q.depositDisabled,
        Number(q.depositAmount)   || 0,
        !!q.depositConfirmed,
        !!q.paid,
        q.orderStatus     || 'pending',
        Number(q.receivedAmount)  || 0,
        Number(q.balance)         || 0,
        JSON.stringify(q.items    || []),
        q.createdAt || new Date().toISOString(),
        q.savedAt   || q.createdAt || new Date().toISOString(),
    ];
    await pool.query(UPSERT_SQL, params);
}

module.exports = async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    const pool = getPool();
    try {
        if (req.method === 'GET') {
            const { rows } = await pool.query(
                'SELECT * FROM quotes ORDER BY saved_at DESC LIMIT 200'
            );
            return res.status(200).json(rows.map(rowToQuote));
        }

        if (req.method === 'POST') {
            const body = req.body;

            // fullSync=1: xóa toàn bộ quotes trên DB rồi insert mảng mới từ client
            if (req.query.fullSync === '1' && Array.isArray(body)) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await client.query('TRUNCATE quotes');
                    for (const q of body) {
                        if (q && q.id) await upsertOne(client, q);
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

            // bulk=1: upsert nhiều quotes không xóa những cái khác
            if (req.query.bulk === '1' && Array.isArray(body)) {
                for (const q of body) {
                    if (q && q.id) await upsertOne(pool, q);
                }
                return res.status(200).json({ ok: true, count: body.length });
            }

            // Single upsert
            if (!body || !body.id) return res.status(400).json({ error: 'Missing id' });
            await upsertOne(pool, body);
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[api/quotes]', err.message);
        return res.status(500).json({ error: err.message });
    }
};
