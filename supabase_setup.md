# Supabase データベース設定手順

以下の手順でSupabaseデータベースを設定してください：

## 1. Supabaseプロジェクトにアクセス
https://app.supabase.com でプロジェクトを開く

## 2. SQL Editorでマイグレーションを実行

### Step 1: 基本テーブルの作成
`supabase/migrations/001_initial_schema.sql` の内容をSQL Editorにコピー&ペーストして実行

### Step 2: ストレージバケットの作成
`supabase/migrations/002_storage_buckets.sql` の内容をSQL Editorにコピー&ペーストして実行

## 3. Authentication設定（オプション）
- Settings > Authentication > Providers
- Google/GitHub OAuth を有効化する場合は各プロバイダーを設定

## 4. 確認事項
- `profiles` テーブルが作成されている
- `books` テーブルが作成されている  
- `chapters` テーブルが作成されている
- `export_history` テーブルが作成されている
- `autosave_drafts` テーブルが作成されている
- Storage buckets が作成されている:
  - `book-covers` (公開)
  - `book-images` (公開)
  - `epub-exports` (非公開)

## 注意事項
- RLS（Row Level Security）が有効になっているため、ユーザーは自分のデータのみアクセス可能
- プロフィールは新規ユーザー登録時に自動作成される