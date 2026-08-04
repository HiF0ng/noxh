-- NOXH.HELP: document drafts
-- Run once in Supabase SQL Editor.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS draft_key TEXT;

CREATE INDEX IF NOT EXISTS documents_draft_key_idx
  ON public.documents (draft_key)
  WHERE is_draft = true;
