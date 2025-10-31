-- user_settingsテーブルを更新して用途別LLM設定に変更

-- 既存のllm_settingsカラムを削除
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS llm_settings;
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS default_llm_provider;

-- Gemini APIキー（単一）
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- 用途別モデル設定（JSONB）
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS purpose_models JSONB DEFAULT '{
  "text": "",
  "design": "",
  "image": ""
}'::jsonb;

-- 利用可能なモデル一覧キャッシュ（JSONB）
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS available_models JSONB DEFAULT '[]'::jsonb;

-- 最終更新日時
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS models_updated_at TIMESTAMP WITH TIME ZONE;

-- コメント追加
COMMENT ON COLUMN public.user_settings.gemini_api_key IS 'Gemini APIキー';
COMMENT ON COLUMN public.user_settings.purpose_models IS '用途別モデル設定: text, design, image';
COMMENT ON COLUMN public.user_settings.available_models IS 'APIから取得した利用可能なモデル一覧キャッシュ';
COMMENT ON COLUMN public.user_settings.models_updated_at IS 'モデル一覧の最終更新日時';
