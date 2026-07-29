-- =============================================================
-- Storage RLS para o bucket "documents"
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- ── Bucket "documents" ──────────────────────────────────────
-- Certifique-se de que o bucket foi criado manualmente via
-- Dashboard > Storage > Create bucket > "documents" (público)

-- ── Políticas para storage.objects ──────────────────────────

-- 1. Upload de arquivos (usuários autenticados)
CREATE POLICY "documents_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- 2. Leitura pública (qualquer um pode baixar)
CREATE POLICY "documents_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

-- 3. Atualizar arquivo (próprio usuário)
CREATE POLICY "documents_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND auth.uid() = owner::uuid)
WITH CHECK (bucket_id = 'documents' AND auth.uid() = owner::uuid);

-- 4. Deletar arquivo (próprio usuário)
CREATE POLICY "documents_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND auth.uid() = owner::uuid);
