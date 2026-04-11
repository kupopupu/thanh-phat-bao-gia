/**
 * api/health.js
 * GET /api/health → kiểm tra kết nối DB
 * Truy cập: https://your-domain.vercel.app/api/health
 */
const { getPool } = require('./lib/db');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const hasDatabaseUrl = !!process.env.DATABASE_URL;

    if (!hasDatabaseUrl) {
        return res.status(500).json({
            ok: false,
            error: 'DATABASE_URL is not set in environment variables',
            hint: 'Go to Vercel Dashboard → Settings → Environment Variables and add DATABASE_URL',
        });
    }

    try {
        const pool = getPool();
        const { rows } = await pool.query('SELECT NOW() AS time, current_database() AS db');
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name IN ('quotes','customers')
            ORDER BY table_name
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        const missingTables = ['customers', 'quotes'].filter(t => !tables.includes(t));

        return res.status(200).json({
            ok: true,
            db: rows[0].db,
            time: rows[0].time,
            tables,
            missingTables,
            hint: missingTables.length > 0
                ? `Cần chạy migrate: node scripts/migrate.js (thiếu bảng: ${missingTables.join(', ')})`
                : 'DB sẵn sàng!',
        });
    } catch (err) {
        return res.status(500).json({
            ok: false,
            error: err.message,
            hint: 'Kiểm tra lại DATABASE_URL — connection string có thể sai',
        });
    }
};
