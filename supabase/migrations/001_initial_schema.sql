-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create books table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    cover_image_url TEXT,
    language VARCHAR(10) DEFAULT 'ja',
    isbn TEXT,
    publisher TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    order_index INTEGER NOT NULL,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create export_history table
CREATE TABLE IF NOT EXISTS public.export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    format VARCHAR(20) DEFAULT 'epub',
    settings JSONB DEFAULT '{}',
    exported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create autosave_drafts table
CREATE TABLE IF NOT EXISTS public.autosave_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_user_id ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);
CREATE INDEX IF NOT EXISTS idx_books_updated_at ON public.books(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON public.chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON public.chapters(book_id, order_index);
CREATE INDEX IF NOT EXISTS idx_export_history_book_id ON public.export_history(book_id);
CREATE INDEX IF NOT EXISTS idx_export_history_user_id ON public.export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_exported_at ON public.export_history(exported_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autosave_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- RLS Policies for books
CREATE POLICY "Users can view own books" 
    ON public.books FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own books" 
    ON public.books FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books" 
    ON public.books FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own books" 
    ON public.books FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for chapters
CREATE POLICY "Users can manage chapters of own books" 
    ON public.chapters FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.books 
            WHERE books.id = chapters.book_id 
            AND books.user_id = auth.uid()
        )
    );

-- RLS Policies for export_history
CREATE POLICY "Users can view own export history" 
    ON public.export_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export history" 
    ON public.export_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for autosave_drafts
CREATE POLICY "Users can manage autosaves for own chapters" 
    ON public.autosave_drafts FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.chapters 
            JOIN public.books ON books.id = chapters.book_id
            WHERE chapters.id = autosave_drafts.chapter_id 
            AND books.user_id = auth.uid()
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old autosaves
CREATE OR REPLACE FUNCTION cleanup_old_autosaves()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.autosave_drafts
    WHERE chapter_id = NEW.chapter_id
    AND saved_at < NOW() - INTERVAL '7 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up old autosaves
CREATE TRIGGER trigger_cleanup_autosaves
AFTER INSERT ON public.autosave_drafts
FOR EACH ROW EXECUTE FUNCTION cleanup_old_autosaves();

-- Function to create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();