-- ============================================================
-- CLEAR ALL SAMPLE DATA FOR NOXH.HELP (CHỈ GIỮ LẠI ADMIN USER)
-- Copy toàn bộ dán vào Supabase SQL Editor -> Bấm RUN để xóa trắng dữ liệu mẫu
-- ============================================================

-- Xóa tất cả Dự án mẫu
TRUNCATE TABLE public.projects RESTART IDENTITY CASCADE;

-- Xóa tất cả Tài liệu mẫu
TRUNCATE TABLE public.documents RESTART IDENTITY CASCADE;

-- Xóa tất cả Câu hỏi FAQ mẫu
TRUNCATE TABLE public.faqs RESTART IDENTITY CASCADE;

-- Xóa tất cả Tin tức mẫu
TRUNCATE TABLE public.news RESTART IDENTITY CASCADE;

-- Xóa tất cả User thông thường (GIỮ LẠI tài khoản Admin)
DELETE FROM public.users WHERE role != 'admin';
