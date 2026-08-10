CREATE POLICY "own_media_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('videos','media') AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own_media_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('videos','media') AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own_media_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('videos','media') AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own_media_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('videos','media') AND auth.uid()::text = (storage.foldername(name))[1]);