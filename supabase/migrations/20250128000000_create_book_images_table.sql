-- 画像管理用テーブルの作成
CREATE TABLE book_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
    file_name text NOT NULL,
    original_name text NOT NULL,
    file_size integer,
    mime_type text,
    storage_path text NOT NULL,
    public_url text NOT NULL,
    alt_text text DEFAULT '',
    caption text DEFAULT '',
    image_sizes jsonb DEFAULT '{}', -- 複数サイズの情報を格納
    metadata jsonb DEFAULT '{}', -- 画像の幅、高さ、その他のメタデータ
    uploaded_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- インデックスの作成
CREATE INDEX idx_book_images_book_id ON book_images(book_id);
CREATE INDEX idx_book_images_uploaded_at ON book_images(uploaded_at DESC);

-- RLS (Row Level Security) ポリシーの設定
ALTER TABLE book_images ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の書籍の画像のみアクセス可能
CREATE POLICY "Users can manage images for their books" ON book_images
    USING (
        book_id IN (
            SELECT id FROM books WHERE user_id = auth.uid()
        )
    );

-- Supabase Storage用のポリシー
CREATE POLICY "Users can upload images for their books" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'book-images' AND
        auth.uid()::text IS NOT NULL
    );

CREATE POLICY "Users can view images" ON storage.objects
    FOR SELECT USING (bucket_id = 'book-images');

CREATE POLICY "Users can update images for their books" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'book-images' AND
        auth.uid()::text IS NOT NULL
    );

CREATE POLICY "Users can delete images for their books" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'book-images' AND
        auth.uid()::text IS NOT NULL
    );