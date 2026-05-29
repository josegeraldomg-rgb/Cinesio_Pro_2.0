-- =============================================
-- Migration 022: Bucket de Avatares
-- =============================================

-- Bucket público para fotos de perfil de usuários, pacientes e profissionais
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket avatars
-- (executar no SQL Editor do Supabase — RLS precisa estar habilitado em storage.objects)

-- Leitura pública (sem autenticação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'avatars_public_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY avatars_public_read
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars')
    $policy$;
  END IF;
END $$;

-- Upload por usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'avatars_auth_insert'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY avatars_auth_insert
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars')
    $policy$;
  END IF;
END $$;

-- Atualização por usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'avatars_auth_update'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY avatars_auth_update
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars')
    $policy$;
  END IF;
END $$;

-- Exclusão por usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'avatars_auth_delete'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY avatars_auth_delete
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'avatars')
    $policy$;
  END IF;
END $$;
