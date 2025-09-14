-- Create storage buckets for the application

-- Create bucket for book covers
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'book-covers',
    'book-covers',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for book images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'book-images',
    'book-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create bucket for EPUB exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'epub-exports',
    'epub-exports',
    false,
    52428800, -- 50MB
    ARRAY['application/epub+zip']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for book-covers bucket
CREATE POLICY "Users can upload own book covers"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'book-covers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own book covers"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'book-covers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own book covers"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'book-covers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Book covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');

-- Storage policies for book-images bucket
CREATE POLICY "Users can upload own book images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'book-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own book images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'book-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own book images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'book-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Book images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-images');

-- Storage policies for epub-exports bucket
CREATE POLICY "Users can upload own EPUB exports"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'epub-exports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can access own EPUB exports"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'epub-exports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own EPUB exports"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'epub-exports' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);