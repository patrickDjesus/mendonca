-- =============================================================
-- Nested Groups: adiciona parent_id para hierarquia de grupos
-- Rode este script no SQL Editor do Supabase Dashboard
-- =============================================================

-- 1. Adiciona parent_id (nullable — grupos raiz ficam NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'note_groups' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE note_groups ADD COLUMN parent_id UUID REFERENCES note_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Índice para buscas por grupo pai
CREATE INDEX IF NOT EXISTS idx_note_groups_parent
  ON note_groups (parent_id);

-- 3. Função para deletar grupo e promover filhos ao pai
CREATE OR REPLACE FUNCTION delete_group_promote_children(group_id UUID)
RETURNS void AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  SELECT parent_id INTO v_parent_id FROM note_groups WHERE id = group_id;

  -- Promove filhos ao pai do grupo deletado (ou para raiz se era raiz)
  UPDATE note_groups SET parent_id = v_parent_id WHERE parent_id = group_id;

  -- Deleta o grupo (as notas ficam sem grupo via ON DELETE SET NULL no video_notes)
  DELETE FROM note_groups WHERE id = group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
