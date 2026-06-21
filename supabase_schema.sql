-- =========================================================================
-- SKEMA DATABASE SUPABASE: STOKPLAN (DENGAN AUTH & ISOLASI MULTI-TOKO)
-- =========================================================================
-- Deskripsi: Skema database untuk mencatat barang, stok, kelompok/kategori,
--            dan mutasi transaksi, dengan pengamanan data tingkat baris (RLS).
-- Salin skema ini ke SQL Editor di dasbor Supabase Anda.
-- =========================================================================

-- 1. Hapus tabel jika sudah ada (Opsional, gunakan untuk reset)
-- DROP TABLE IF EXISTS stock_transactions;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS categories;

-- 2. Membuat Tabel Kategori (categories)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kategori TEXT NOT NULL,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, -- Mengaitkan ke ID pengguna Supabase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Nama kategori harus unik per pengguna/toko
    UNIQUE (nama_kategori, user_id)
);

-- 3. Membuat Tabel Produk (products) dengan referensi ke Kategori
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_barang TEXT NOT NULL,
    harga_modal NUMERIC NOT NULL CHECK (harga_modal > 0),
    harga_jual NUMERIC NOT NULL CHECK (harga_jual > 0),
    stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE, -- Mengaitkan ke ID pengguna Supabase
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Nama barang harus unik per pengguna/toko
    UNIQUE (nama_barang, user_id)
);

-- Index untuk mempercepat pencarian nama barang & kategori
CREATE INDEX idx_products_nama ON products (nama_barang);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_user ON products (user_id);
CREATE INDEX idx_categories_user ON categories (user_id);

-- 4. Membuat Tabel Transaksi Stok (stock_transactions)
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    tipe TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index untuk mempercepat query relasi & sorting tanggal
CREATE INDEX idx_transactions_product_id ON stock_transactions (product_id);
CREATE INDEX idx_transactions_created_at ON stock_transactions (created_at DESC);


-- 5. MENGAKTIFKAN ROW LEVEL SECURITY (RLS)
-- Ini adalah langkah krusial untuk mengisolasi data antar toko/pengguna.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- 6. KEBIJAKAN AKSES (POLICIES)
-- Kebijakan untuk Tabel Kategori
CREATE POLICY "Users can manage their own categories" ON categories
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Kebijakan untuk Tabel Produk
CREATE POLICY "Users can manage their own products" ON products
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Kebijakan untuk Tabel Transaksi
CREATE POLICY "Users can manage their own transactions" ON stock_transactions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM products 
            WHERE products.id = stock_transactions.product_id 
            AND products.user_id = auth.uid()
        )
    );


-- 7. Postgres Function (RPC) untuk Transaksi Stok Atomik
-- Diperbarui agar mendukung verifikasi hak akses pengguna saat pemanggilan.
CREATE OR REPLACE FUNCTION adjust_stock(
    p_product_id UUID,
    p_tipe TEXT,
    p_jumlah INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Menjalankan fungsi dengan hak akses pembuat, namun logika RLS tetap membatasi.
AS $$
DECLARE
    v_stok_saat_ini INTEGER;
    v_product_owner UUID;
BEGIN
    -- 1. Validasi tipe transaksi
    IF p_tipe NOT IN ('masuk', 'keluar') THEN
        RAISE EXCEPTION 'Tipe transaksi harus "masuk" atau "keluar"';
    END IF;

    -- 2. Validasi jumlah harus positif
    IF p_jumlah <= 0 THEN
        RAISE EXCEPTION 'Jumlah transaksi harus lebih besar dari 0';
    END IF;

    -- 3. Mengunci baris produk dan mendapatkan pemilik produk
    SELECT stok, user_id INTO v_stok_saat_ini, v_product_owner
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;

    -- Jika barang tidak ditemukan
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barang tidak ditemukan';
    END IF;

    -- 4. Verifikasi bahwa user yang memanggil RPC adalah pemilik barang tersebut
    IF v_product_owner != auth.uid() THEN
        RAISE EXCEPTION 'Akses ditolak: Anda bukan pemilik barang ini';
    END IF;

    -- 5. Validasi stok jika keluar (penjualan)
    IF p_tipe = 'keluar' AND v_stok_saat_ini < p_jumlah THEN
        RAISE EXCEPTION 'Stok tidak cukup';
    END IF;

    -- 6. Update stok di tabel products
    UPDATE products
    SET stok = CASE 
        WHEN p_tipe = 'masuk' THEN stok + p_jumlah
        ELSE stok - p_jumlah
    END
    WHERE id = p_product_id;

    -- 7. Catat riwayat di tabel stock_transactions
    INSERT INTO stock_transactions (product_id, tipe, jumlah)
    VALUES (p_product_id, p_tipe, p_jumlah);

END;
$$;
