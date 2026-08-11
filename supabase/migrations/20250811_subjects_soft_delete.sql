-- =============================================================
-- Soft-delete de matérias
-- Rode este script no SQL Editor do Supabase Dashboard.
--
-- Evita que uma matéria excluída em um dispositivo seja
-- "ressuscitada" pela sincronização em outro dispositivo.
-- =============================================================

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
