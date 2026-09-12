-- ============================================================
-- SUPABASE CLOUD DATABASE INIT & PERMISSIONS FOR NOXH.HELP
-- Copy TOÀN BỘ mã này dán vào Supabase SQL Editor -> Bấm RUN
-- ============================================================

-- BƯỚC 1: TẠO TẤT CẢ CÁC BẢNG (TABLES)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    role VARCHAR(50) DEFAULT 'user',
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to existing users table if they already exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    investor VARCHAR(255),
    progress INT DEFAULT 0,
    status VARCHAR(100) DEFAULT 'Đang cập nhật',
    is_draft BOOLEAN NOT NULL DEFAULT false,
    details_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    slug TEXT,
    previous_slugs TEXT[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT projects_slug_format_check CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- The publication migration finalizes/backfills these values for an existing
-- database. New installations should still run that migration after 05B.
CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique_idx ON public.projects (slug) WHERE slug IS NOT NULL;

-- projectCode is stored inside details_json so existing deployments do not need
-- a new table column. Once assigned (PRJ1, PRJ2, ...), it belongs to that row.
CREATE UNIQUE INDEX IF NOT EXISTS projects_project_code_unique_idx
ON public.projects ((details_json->>'projectCode'))
WHERE COALESCE(details_json->>'projectCode', '') <> '';

-- Normalize the legacy final-stage labels to the current project status contract.
UPDATE public.projects
SET status = 'Bàn giao'
WHERE status IN ('Chờ bàn giao', 'Đã bàn giao');

-- Normalize the legacy accepting-applications label.
UPDATE public.projects
SET status = 'Đang nhận hồ sơ'
WHERE status = 'Đang nhận đơn';

-- Dự án mà mỗi người dùng đã lưu.
CREATE TABLE IF NOT EXISTS public.user_saved_projects (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
);

-- Dự án mà mỗi người dùng đang theo dõi.
CREATE TABLE IF NOT EXISTS public.user_followed_projects (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
);

-- Bootstrap only: public project images live in their own bucket. Access policies
-- are created by supabase_migrations/20260910_05b_security_hardening.sql.
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Đơn đăng ký',
    doc_type VARCHAR(50) DEFAULT 'PDF',
    file_url TEXT,
    content TEXT,
    is_draft BOOLEAN NOT NULL DEFAULT false,
    draft_key TEXT,
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

-- BƯỚC 2: BẬT RLS. Không tạo policy mở ở bootstrap; chạy migration 05B ngay sau file này.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_followed_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Do not add policies here. The canonical migration recreates the minimal
-- policies after it links Supabase Auth profiles and installs admin checks.

-- BƯỚC 3: DỮ LIỆU BAN ĐẦU
-- Default administrator seed removed. Create identities through Supabase Auth
-- and assign admin roles through a separately authorized server-side process.
