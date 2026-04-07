/**
 * api/lib/db.js
 * Pool kết nối PostgreSQL (Neon) dùng chung cho mọi API route.
 * Biến DATABASE_URL được đặt trong Vercel Environment Variables.
 */
const { Pool } = require('pg');

let _pool;
function getPool() {
    if (!_pool) {
        _pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            max: 5,
            idleTimeoutMillis: 30000,
        });
    }
    return _pool;
}

/** Ánh xạ hàng DB (snake_case) → object JS (camelCase) khớp với frontend */
function rowToQuote(row) {
    return {
        id:              row.id,
        customerCode:    row.customer_code    || '',
        customerName:    row.customer_name    || '',
        customerPhone:   row.customer_phone   || '',
        customerAddress: row.customer_address || '',
        total:           Number(row.total)    || 0,
        vatPercent:      Number(row.vat_percent) || 0,
        quoteType:       row.quote_type       || 'cup',
        depositDisabled: !!row.deposit_disabled,
        depositAmount:   Number(row.deposit_amount) || 0,
        depositConfirmed:!!row.deposit_confirmed,
        paid:            !!row.paid,
        orderStatus:     row.order_status     || 'pending',
        receivedAmount:  Number(row.received_amount) || 0,
        balance:         Number(row.balance)  || 0,
        items:           Array.isArray(row.items) ? row.items : [],
        createdAt:       row.created_at ? new Date(row.created_at).toISOString() : '',
        savedAt:         row.saved_at   ? new Date(row.saved_at).toISOString()   : '',
    };
}

module.exports = { getPool, rowToQuote };
