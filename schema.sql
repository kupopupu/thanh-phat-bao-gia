-- ==========================================================
-- Thanh Phát – Báo Giá  |  Neon PostgreSQL Schema
-- Chạy một lần: node scripts/migrate.js
-- ==========================================================

-- ── Bảng báo giá ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
    id               TEXT        PRIMARY KEY,
    customer_code    TEXT        NOT NULL DEFAULT '',
    customer_name    TEXT        NOT NULL DEFAULT '',
    customer_phone   TEXT        NOT NULL DEFAULT '',
    customer_address TEXT        NOT NULL DEFAULT '',
    total            BIGINT      NOT NULL DEFAULT 0,         -- VNĐ
    vat_percent      NUMERIC(5,2) NOT NULL DEFAULT 0,
    quote_type       TEXT        NOT NULL DEFAULT 'cup',     -- 'cup' | 'other'
    deposit_disabled BOOLEAN     NOT NULL DEFAULT FALSE,
    deposit_amount   BIGINT      NOT NULL DEFAULT 0,
    deposit_confirmed BOOLEAN    NOT NULL DEFAULT FALSE,
    paid             BOOLEAN     NOT NULL DEFAULT FALSE,
    order_status     TEXT        NOT NULL DEFAULT 'pending', -- 'pending'|'deposited'|'no_deposit'|'completed'
    received_amount  BIGINT      NOT NULL DEFAULT 0,
    balance          BIGINT      NOT NULL DEFAULT 0,
    items            JSONB       NOT NULL DEFAULT '[]',      -- [{name,unit,qty,price,discount,lineTotal}]
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    saved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_phone    ON quotes(customer_phone);
CREATE INDEX IF NOT EXISTS idx_quotes_status   ON quotes(order_status);
CREATE INDEX IF NOT EXISTS idx_quotes_saved_at ON quotes(saved_at DESC);

-- ── Bảng khách hàng ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    code       TEXT        PRIMARY KEY,
    name       TEXT        NOT NULL DEFAULT '',
    phone      TEXT        NOT NULL DEFAULT '',
    address    TEXT        NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ── Bảng danh mục sản phẩm ───────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    name       TEXT        PRIMARY KEY,
    unit       TEXT        NOT NULL DEFAULT '',
    price      BIGINT      NOT NULL DEFAULT 0,
    code       TEXT        UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
-- Ensure products have a stable unique code (SP00001...) and sequence for future inserts
-- Add column if missing (for existing DBs created before this change)
ALTER TABLE products ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

CREATE SEQUENCE IF NOT EXISTS products_seq START 1;

-- Set default generation for new rows
ALTER TABLE products ALTER COLUMN code SET DEFAULT ('SP' || lpad(nextval('products_seq')::text,5,'0'));

-- Assign codes to existing products that don't have one yet, and advance sequence
DO $$
DECLARE
    _name TEXT;
BEGIN
    FOR _name IN SELECT name FROM products WHERE code IS NULL LOOP
        UPDATE products SET code = ('SP' || lpad(nextval('products_seq')::text,5,'0')) WHERE name = _name;
    END LOOP;
    -- Set sequence to current max numeric part (or 0)
    PERFORM setval('products_seq', COALESCE((SELECT MAX((regexp_replace(code, '[^0-9]', '', 'g'))::bigint) FROM products WHERE code IS NOT NULL), 0));
END$$;

-- ── View: thống kê theo tháng (tiện cho báo cáo) ──────────
CREATE OR REPLACE VIEW monthly_stats AS
SELECT
    TO_CHAR(saved_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM') AS month,
    COUNT(*)                                         AS total_orders,
    SUM(total)                                       AS revenue,
    SUM(received_amount)                             AS received,
    SUM(CASE WHEN order_status = 'deposited'
             THEN GREATEST(0, total - deposit_amount)
             WHEN order_status = 'no_deposit' THEN total
             ELSE 0 END)                             AS debt,
    SUM(
        (SELECT COALESCE(SUM((item->>'discount')::numeric * (item->>'qty')::numeric),0)
         FROM jsonb_array_elements(items) AS item)
    )                                                AS total_discount
FROM quotes
GROUP BY 1
ORDER BY 1 DESC;
