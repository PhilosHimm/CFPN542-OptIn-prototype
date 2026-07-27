-- Reconstructed verbatim from supabase_migrations.schema_migrations (project
-- iokxjsvlpqlekptexjxy), version 20260327190219, on 2026-07-27.
-- This is what actually ran in production. Do not edit.

ALTER TABLE games ADD COLUMN IF NOT EXISTS cancellation_reason text;
