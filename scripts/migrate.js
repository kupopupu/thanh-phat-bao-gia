/**
 * scripts/migrate.js
 * Chạy schema.sql trên Neon để tạo / cập nhật bảng.
 * Sử dụng: node scripts/migrate.js
 * Cần biến môi trường DATABASE_URL (hoặc tạo file .env rồi chạy với dotenv).
 */
const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');

// Hỗ trợ file .env cục bộ
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf-8')
            .split('\n')
            .filter(l => l.trim() && !l.startsWith('#'))
            .forEach(l => {
                const [k, ...v] = l.split('=');
                if (k) process.env[k.trim()] = v.join('=').trim();
            });
    }
} catch (_) {}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌  Thiếu biến DATABASE_URL. Tạo file .env hoặc export trước khi chạy.');
    process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const sql  = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf-8');

(async () => {
    try {
        console.log('🔗  Đang kết nối Neon …');
        await pool.query(sql);
        console.log('✅  Schema đã được áp dụng thành công!');
    } catch (err) {
        console.error('❌  Lỗi khi chạy schema:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
