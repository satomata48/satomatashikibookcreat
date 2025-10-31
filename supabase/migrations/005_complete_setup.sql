-- 完全なデータベースセットアップ（スライド機能含む）
-- このSQLファイルをSupabaseダッシュボードのSQL Editorで実行してください

-- ========================================
-- 1. Categoriesテーブル作成
-- ========================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#2196F3',
    icon TEXT DEFAULT 'book',
    type TEXT DEFAULT 'book' CHECK (type IN ('book', 'slide')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Categoriesテーブルにtype列を追加（既存テーブル用）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'categories'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.categories ADD COLUMN type TEXT DEFAULT 'book' CHECK (type IN ('book', 'slide'));
    END IF;
END $$;

-- ========================================
-- 2. Presentationsテーブル作成（スライド本体）
-- ========================================
CREATE TABLE IF NOT EXISTS public.presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    theme TEXT DEFAULT 'modern' CHECK (theme IN ('modern', 'classic', 'minimal', 'business')),
    cover_image_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. Slidesテーブル作成（個別スライド）
-- ========================================
CREATE TABLE IF NOT EXISTS public.slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presentation_id UUID REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    content TEXT,
    layout_type TEXT DEFAULT 'title-content' CHECK (layout_type IN ('title-only', 'title-content', 'two-column', 'image-text', 'full-image')),
    background_color VARCHAR(7) DEFAULT '#FFFFFF',
    background_image_url TEXT,
    order_number INTEGER NOT NULL,
    speaker_notes TEXT,
    transition TEXT DEFAULT 'fade' CHECK (transition IN ('fade', 'slide', 'zoom', 'none')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(presentation_id, order_number)
);

-- ========================================
-- 4. インデックス作成
-- ========================================
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(user_id, name);
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON public.presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_category_id ON public.presentations(category_id);
CREATE INDEX IF NOT EXISTS idx_slides_presentation_id ON public.slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_slides_order ON public.slides(presentation_id, order_number);

-- ========================================
-- 5. RLS有効化
-- ========================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. RLSポリシー（Categories）
-- ========================================
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own categories" ON public.categories;
CREATE POLICY "Users can create own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);

-- ========================================
-- 7. RLSポリシー（Presentations）
-- ========================================
DROP POLICY IF EXISTS "Users can view own presentations" ON public.presentations;
CREATE POLICY "Users can view own presentations"
    ON public.presentations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own presentations" ON public.presentations;
CREATE POLICY "Users can insert own presentations"
    ON public.presentations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presentations" ON public.presentations;
CREATE POLICY "Users can update own presentations"
    ON public.presentations FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own presentations" ON public.presentations;
CREATE POLICY "Users can delete own presentations"
    ON public.presentations FOR DELETE
    USING (auth.uid() = user_id);

-- ========================================
-- 8. RLSポリシー（Slides）
-- ========================================
DROP POLICY IF EXISTS "Users can manage slides of own presentations" ON public.slides;
CREATE POLICY "Users can manage slides of own presentations"
    ON public.slides FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.presentations
            WHERE presentations.id = slides.presentation_id
            AND presentations.user_id = auth.uid()
        )
    );

-- ========================================
-- 9. 自動更新日時トリガー関数
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ========================================
-- 10. トリガー設定
-- ========================================
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_presentations_updated_at ON public.presentations;
CREATE TRIGGER update_presentations_updated_at
    BEFORE UPDATE ON public.presentations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_slides_updated_at ON public.slides;
CREATE TRIGGER update_slides_updated_at
    BEFORE UPDATE ON public.slides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 完了メッセージ
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '✅ スライド機能のデータベースセットアップが完了しました！';
    RAISE NOTICE '📊 作成されたテーブル: categories, presentations, slides';
    RAISE NOTICE '🔒 RLSポリシーが有効化されました';
END $$;
