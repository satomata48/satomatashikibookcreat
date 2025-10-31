-- user_settingsテーブルを拡張して複数のLLM設定を保存

-- 既存のgemini_api_keyカラムを削除し、llm_settingsカラムに統合
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS gemini_api_key;

-- LLM設定用のJSONBカラムを追加
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS llm_settings JSONB DEFAULT '{
  "selected_model": "gemini-pro",
  "api_keys": {
    "gemini": "",
    "openai": "",
    "claude": "",
    "openrouter": ""
  },
  "model_preferences": {}
}'::jsonb;

-- デフォルトモデル設定カラム
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS default_llm_provider TEXT DEFAULT 'gemini';

-- コメント追加
COMMENT ON COLUMN public.user_settings.llm_settings IS 'LLM設定: selected_model, api_keys, model_preferences';
COMMENT ON COLUMN public.user_settings.default_llm_provider IS 'デフォルトのLLMプロバイダー: gemini, openai, claude, openrouter';
