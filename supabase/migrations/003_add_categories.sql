-- Add categories functionality to the database
-- Migration: 003_add_categories.sql

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#2196F3', -- Hex color code
    icon TEXT DEFAULT 'book', -- Icon identifier
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique category names per user
    UNIQUE(user_id, name)
);

-- Add category_id column to books table
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(user_id, name);
CREATE INDEX IF NOT EXISTS idx_books_category_id ON public.books(category_id);

-- Enable Row Level Security for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);

-- Add trigger for updating updated_at timestamp on categories
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories for existing users
INSERT INTO public.categories (user_id, name, description, color, icon)
SELECT DISTINCT
    user_id,
    'デフォルト' as name,
    'デフォルトカテゴリ' as description,
    '#2196F3' as color,
    'book' as icon
FROM public.books
WHERE NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE categories.user_id = books.user_id
    AND categories.name = 'デフォルト'
)
ON CONFLICT (user_id, name) DO NOTHING;