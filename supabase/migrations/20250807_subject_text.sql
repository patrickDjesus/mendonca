-- =============================================================
-- Matérias personalizadas + "N/A"
-- Rode este script no SQL Editor do Supabase Dashboard.
--
-- Converte TODAS as colunas do tipo enum `subject_type` para
-- TEXT, permitindo que o app salve matérias criadas pelo usuário
-- e o valor sentinela "N/A" (usado ao excluir uma matéria).
-- =============================================================

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE data_type = 'USER-DEFINED'
      AND udt_name = 'subject_type'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING %I::text',
      col.table_name,
      col.column_name,
      col.column_name
    );
  END LOOP;
END $$;
