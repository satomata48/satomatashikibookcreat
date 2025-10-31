-- スライド作成機能用のテーブル追加

-- 1. categoriesテーブルにtype列を追加（既存のカテゴリがbookかslideか区別）
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type text DEFAULT 'book' CHECK (type IN ('book', 'slide'));

-- 2. presentationsテーブル作成（スライド本体）
CREATE TABLE IF NOT EXISTS presentations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    user_id uuid REFERENCES auth.users NOT NULL,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    theme text DEFAULT 'modern' CHECK (theme IN ('modern', 'classic', 'minimal', 'business')),
    cover_image_url text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. slidesテーブル作成（個別スライド）
CREATE TABLE IF NOT EXISTS slides (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    presentation_id uuid REFERENCES presentations(id) ON DELETE CASCADE NOT NULL,
    title text,
    content text,
    layout_type text DEFAULT 'title-content' CHECK (layout_type IN ('title-only', 'title-content', 'two-column', 'image-text', 'full-image')),
    background_color varchar(7) DEFAULT '#FFFFFF',
    background_image_url text,
    order_number integer NOT NULL,
    speaker_notes text,
    transition text DEFAULT 'fade' CHECK (transition IN ('fade', 'slide', 'zoom', 'none')),
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(presentation_id, order_number)
);

-- 4. RLSポリシー設定（presentations）
ALTER TABLE presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own presentations" ON presentations;
CREATE POLICY "Users can view own presentations"
    ON presentations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own presentations" ON presentations;
CREATE POLICY "Users can insert own presentations"
    ON presentations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own presentations" ON presentations;
CREATE POLICY "Users can update own presentations"
    ON presentations FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own presentations" ON presentations;
CREATE POLICY "Users can delete own presentations"
    ON presentations FOR DELETE
    USING (auth.uid() = user_id);

-- 5. RLSポリシー設定（slides）
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage slides of own presentations" ON slides;
CREATE POLICY "Users can manage slides of own presentations"
    ON slides FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM presentations
            WHERE presentations.id = slides.presentation_id
            AND presentations.user_id = auth.uid()
        )
    );

-- 6. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_category_id ON presentations(category_id);
CREATE INDEX IF NOT EXISTS idx_slides_presentation_id ON slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_slides_order ON slides(presentation_id, order_number);

-- 7. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_presentations_updated_at ON presentations;
CREATE TRIGGER update_presentations_updated_at
    BEFORE UPDATE ON presentations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_slides_updated_at ON slides;
CREATE TRIGGER update_slides_updated_at
    BEFORE UPDATE ON slides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
