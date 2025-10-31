-- API設定を複数保存するためのテーブル作成

CREATE TABLE IF NOT EXISTS public.api_configurations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('text', 'design', 'image')),
    name text NOT NULL,
    api_key text NOT NULL,
    model text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS api_configurations_user_id_idx ON public.api_configurations(user_id);
CREATE INDEX IF NOT EXISTS api_configurations_purpose_idx ON public.api_configurations(purpose);

-- RLSポリシー設定
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の設定のみ閲覧可能
CREATE POLICY "Users can view own API configurations"
    ON public.api_configurations
    FOR SELECT
    USING (auth.uid() = user_id);

-- ユーザーは自分の設定を作成可能
CREATE POLICY "Users can create own API configurations"
    ON public.api_configurations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の設定を更新可能
CREATE POLICY "Users can update own API configurations"
    ON public.api_configurations
    FOR UPDATE
    USING (auth.uid() = user_id);

-- ユーザーは自分の設定を削除可能
CREATE POLICY "Users can delete own API configurations"
    ON public.api_configurations
    FOR DELETE
    USING (auth.uid() = user_id);

-- コメント追加
COMMENT ON TABLE public.api_configurations IS 'ユーザーごとの複数API設定を保存';
COMMENT ON COLUMN public.api_configurations.purpose IS '用途: text(テキスト生成), design(デザイン), image(画像生成)';
COMMENT ON COLUMN public.api_configurations.name IS '設定の識別名';
COMMENT ON COLUMN public.api_configurations.api_key IS 'Gemini APIキー';
COMMENT ON COLUMN public.api_configurations.model IS '使用するモデル名';
