-- ============================================================
-- SUPABASE CLOUD DATABASE INIT & PERMISSIONS FOR NOXH.HELP
-- Copy TOÀN BỘ mã này dán vào Supabase SQL Editor -> Bấm RUN
-- ============================================================

-- BƯỚC 1: TẠO TẤT CẢ CÁC BẢNG (TABLES)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    investor VARCHAR(255),
    progress INT DEFAULT 0,
    status VARCHAR(100) DEFAULT 'Đang cập nhật',
    details_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Đơn mua',
    doc_type VARCHAR(50) DEFAULT 'PDF',
    file_url TEXT,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'published',
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BƯỚC 2: PHÂN QUYỀN TRUY CẬP ĐỌC / GHI CSDL (RLS POLICIES)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon full access users" ON public.users;
DROP POLICY IF EXISTS "Anon full access projects" ON public.projects;
DROP POLICY IF EXISTS "Anon full access documents" ON public.documents;
DROP POLICY IF EXISTS "Anon full access faqs" ON public.faqs;
DROP POLICY IF EXISTS "Anon full access news" ON public.news;

CREATE POLICY "Anon full access users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access faqs" ON public.faqs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access news" ON public.news FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 3: DỮ LIỆU BAN ĐẦU
INSERT INTO public.users (email, password_hash, full_name, role)
VALUES ('admin@noxh.help', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Nguyễn Văn A (Admin)', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.projects (title, location, investor, progress, status)
VALUES 
('NHS Trung Văn', 'Nam Từ Liêm, Hà Nội', 'Công ty Cổ phần Đầu tư Xây dựng NHS', 85, 'Đang mở bán'),
('Udic Ecotrans', 'Hoàng Mai, Hà Nội', 'Tổng Công ty UDIC', 60, 'Đang xây dựng'),
('Rice City Tố Hữu', 'Hà Đông, Hà Nội', 'Công ty Cổ phần BIC Việt Nam', 100, 'Bàn giao');
