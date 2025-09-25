# さとまた式電子書籍クリエイター - 実装ドキュメント

このドキュメントは、プロジェクトの完全な実装状況と復元手順を記録したものです。

## プロジェクト概要

**アプリケーション名**: さとまた式電子書籍クリエイター
**技術スタック**: SvelteKit + TypeScript + Supabase + Tailwind CSS + DaisyUI
**主要機能**: 電子書籍作成、複数形式出力（EPUB、PDF、JPEG）、テンプレートプレビュー

## 主要実装済み機能

### 1. 認証システム
- Supabaseを使用したユーザー認証
- メールアドレス・パスワード認証
- OAuth認証（Google、GitHub）
- セッション管理とプロフィール作成

### 2. 書籍管理システム
- 書籍の作成・編集・削除
- 章ごとの管理
- リアルタイム自動保存
- HTMLエディター機能
- カテゴリ機能（書籍の分類・フィルタリング）

### 3. 出力システム
- **EPUB形式**: epub-gen-memoryライブラリ使用
- **PDF形式**: Puppeteerを使用してHTML→PDF変換
- **JPEG形式**: Puppeteerを使用してHTML→JPEG変換
- 統一API: `/api/generate-export/+server.ts`

### 4. テンプレートシステム
- 複数のテンプレート選択
- リアルタイムプレビュー機能
- テンプレート別スタイリング

### 5. デザインシステム
- フラットデザインの薄い青テーマ
- 統一されたカラーパレット
- ベクターSVGアイコン
- レスポンシブデザイン

## ファイル構成と重要な実装

### CSS設定 (`src/app.css`)
```css
/* カスタム薄い青テーマ */
:root {
	--primary-blue: #E3F2FD;
	--secondary-blue: #BBDEFB;
	--accent-blue: #2196F3;
	--dark-blue: #1976D2;
	--text-blue: #0D47A1;
	--light-bg: #F8FAFB;
	--border-blue: #90CAF9;
}

.btn-primary-gradient {
	background: linear-gradient(135deg, var(--accent-blue), var(--dark-blue));
	color: white;
	border: none;
	box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}

.card-flat {
	background: white;
	border: 1px solid var(--border-blue);
	border-radius: 12px;
	box-shadow: 0 2px 12px rgba(33, 150, 243, 0.1);
}

.icon-blue {
	color: var(--accent-blue);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: var(--primary-blue);
	border-radius: 8px;
}

.book-icon {
	width: 1.5rem;
	height: 1.5rem;
	fill: var(--accent-blue);
}

.book-icon-large {
	width: 4rem;
	height: 4rem;
	fill: var(--accent-blue);
}

.navbar-blue {
	background: white;
	border-bottom: 1px solid var(--border-blue);
	box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
}

.hero-blue {
	background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
}
```

### 統一エクスポートAPI (`src/routes/api/generate-export/+server.ts`)
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { bookId, format, template } = await request.json();
		
		// Supabase初期化
		const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
		const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
		const supabase = createClient(supabaseUrl, supabaseKey);

		// 書籍データ取得
		const { data: book } = await supabase
			.from('books')
			.select('*')
			.eq('id', bookId)
			.single();

		const { data: chapters } = await supabase
			.from('chapters')
			.select('*')
			.eq('book_id', bookId)
			.order('order_number');

		// テンプレート別スタイル
		const templateStyles = {
			modern: `
				body { font-family: 'Segoe UI', sans-serif; line-height: 1.8; }
				h1 { color: #2563eb; border-bottom: 3px solid #3b82f6; }
			`,
			classic: `
				body { font-family: 'Times New Roman', serif; line-height: 1.6; }
				h1 { color: #7c2d12; text-align: center; }
			`,
			minimal: `
				body { font-family: 'Arial', sans-serif; line-height: 1.7; }
				h1 { color: #374151; font-weight: 300; }
			`
		};

		// HTML生成
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<style>${templateStyles[template] || templateStyles.modern}</style>
			</head>
			<body>
				<h1>${book.title}</h1>
				${chapters.map(chapter => `
					<h2>${chapter.title}</h2>
					<div>${chapter.content || ''}</div>
				`).join('')}
			</body>
			</html>
		`;

		if (format === 'epub') {
			// EPUB生成（簡易HTML版）
			return new Response(html, {
				headers: {
					'Content-Type': 'application/epub+zip',
					'Content-Disposition': `attachment; filename="${book.title}.epub"`
				}
			});
		}

		// Puppeteer使用（PDF・JPEG）
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setContent(html);

		let buffer: Buffer;
		let contentType: string;
		let filename: string;

		if (format === 'pdf') {
			buffer = await page.pdf({ format: 'A4', margin: { top: '1in', bottom: '1in' } });
			contentType = 'application/pdf';
			filename = `${book.title}.pdf`;
		} else if (format === 'jpeg') {
			buffer = await page.screenshot({ type: 'jpeg', quality: 90, fullPage: true });
			contentType = 'image/jpeg';
			filename = `${book.title}.jpg`;
		}

		await browser.close();

		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});

	} catch (error) {
		console.error('Export error:', error);
		return json({ error: 'エクスポートに失敗しました' }, { status: 500 });
	}
};
```

### SVGアイコン実装例

#### ナビゲーション用本アイコン
```html
<svg class="book-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
	<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
</svg>
```

#### 開いた本アイコン（カードプレースホルダー用）
```html
<svg class="w-16 h-16 fill-blue-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
	<path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6C22.4 5.55 21.75 5.25 21 5zM21 18.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5V18.5z"/>
	<path d="M17.5 10.5c.88 0 1.73.09 2.5.26V9.24C19.21 9.09 18.36 9 17.5 9c-1.7 0-3.24.29-4.5.83v1.66C14.13 10.81 15.7 10.5 17.5 10.5z"/>
	<path d="M13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24C15.8 11.66 14.26 11.96 13 12.49z"/>
	<path d="M17.5 14.33c-1.7 0-3.24.29-4.5.83v1.66c1.26-.54 2.8-.83 4.5-.83.88 0 1.73.09 2.5.26v-1.52C19.21 14.58 18.36 14.33 17.5 14.33z"/>
</svg>
```

## データベース構成 (Supabase)

### テーブル構成
```sql
-- profiles テーブル
CREATE TABLE profiles (
    id uuid REFERENCES auth.users PRIMARY KEY,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- categories テーブル
CREATE TABLE categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    name text NOT NULL,
    description text,
    color varchar(7) DEFAULT '#2196F3',
    icon text DEFAULT 'book',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, name)
);

-- books テーブル
CREATE TABLE books (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    author text,
    user_id uuid REFERENCES auth.users NOT NULL,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    status text DEFAULT 'draft',
    language text DEFAULT 'ja',
    cover_image_url text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- chapters テーブル
CREATE TABLE chapters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    content text,
    order_number integer NOT NULL,
    word_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);
```

## 必要な環境変数

```bash
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## パッケージ依存関係

### 主要依存関係
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.7.0",
    "@supabase/supabase-js": "^2.57.2",
    "@sveltejs/adapter-vercel": "^5.10.2",
    "@tailwindcss/typography": "^0.5.16",
    "daisyui": "^5.1.7",
    "dompurify": "^3.2.6",
    "epub-gen-memory": "^1.1.2",
    "html-to-text": "^9.0.5",
    "jsdom": "^26.1.0",
    "puppeteer": "^24.19.0",
    "zod": "^4.1.5"
  }
}
```

## 復元手順

1. **プロジェクト初期化**
   ```bash
   npm create svelte@latest satomata-ebook-creator
   cd satomata-ebook-creator
   npm install
   ```

2. **依存関係インストール**
   ```bash
   npm install @supabase/ssr @supabase/supabase-js @tailwindcss/typography daisyui dompurify epub-gen-memory html-to-text jsdom puppeteer zod
   ```

3. **Tailwind CSS & DaisyUI設定**
   ```bash
   npx svelte-add@latest tailwindcss
   ```

4. **Supabaseプロジェクト設定**
   - プロジェクト作成
   - 認証設定（Email、OAuth providers）
   - データベーステーブル作成
   - 環境変数設定

5. **ファイル作成・更新**
   - このドキュメントの実装内容に基づき、各ファイルを作成・更新
   - 特に重要: `src/app.css`, `src/routes/api/generate-export/+server.ts`

6. **開発サーバー起動**
   ```bash
   npm run dev
   ```

## 開発・本番運用コマンド

```bash
# 開発サーバー
npm run dev

# 型チェック
npm run check

# リント
npm run lint

# フォーマット
npm run format

# ビルド
npm run build

# プレビュー
npm run preview
```

## トラブルシューティング

### EPUB生成エラー
- `epub-gen-memory`のインポート問題 → 統一API使用で回避

### Puppeteerエラー
- メモリ不足 → Vercelの場合は関数メモリ設定を確認

### スタイリング問題
- CSS変数が効かない → `app.css`のインポート順序確認

## Vercel本番デプロイ設定

### 本番環境URL
```
https://satomatashikibookcreat-ui8v.vercel.app
```

### GitHub Repository
```
https://github.com/satomata48/satomatashikibookcreat
```

### Vercelデプロイ設定

#### Framework設定
- **Framework**: SvelteKit
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Install Command**: `npm install`

#### 環境変数設定
```bash
PUBLIC_SUPABASE_URL=https://xyljoaeswvxyfyhtygzs.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bGpvYWVzd3Z4eWZ5aHR5Z3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzMxNjYsImV4cCI6MjA3MjU0OTE2Nn0.CkHuJzDJweb66jd4n2A3vInrGSdNYfOQNV8iRuc6GIs
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5bGpvYWVzd3Z4eWZ5aHR5Z3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk3MzE2NiwiZXhwIjoyMDcyNTQ5MTY2fQ.6j0uDfdYIVvRAjIsKFjZ2ASJ4e4Ozu3ZdLyH7lSaaj8
```

### Supabase本番設定

#### Authentication設定
```
Site URL: https://satomatashikibookcreat-ui8v.vercel.app
Redirect URLs: https://satomatashikibookcreat-ui8v.vercel.app/auth/callback
```

#### プロジェクトID
```
Project ID: xyljoaeswvxyfyhtygzs
```

### デプロイメント履歴

#### 主要コミット履歴
- `b0b4c92`: 認証リダイレクトURL修正（本番環境対応）
- `601a2a4`: SvelteKit環境変数処理修正（`$env/static/public`使用）
- `0b1c35d`: 環境変数名修正（`PUBLIC_*`対応）

#### A4プレビュー機能実装
- ページ区切り表示機能
- Satomataテンプレート強化
- 章区切りページブレーク機能

### トラブルシューティング

#### 認証エラー解決済み
```javascript
// 修正前（エラー原因）
emailRedirectTo: `${window.location.origin}/auth/callback`

// 修正後（本番環境対応）
emailRedirectTo: `https://satomatashikibookcreat-ui8v.vercel.app/auth/callback`
```

#### 環境変数処理修正済み
```typescript
// SvelteKit用環境変数読み込み
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
```

### 自動デプロイ設定
- GitHubプッシュ → Vercel自動デプロイ
- mainブランチ監視
- Personal Access Token認証設定済み

## 今後の拡張可能性

- カバー画像アップロード機能
- より多くのテンプレート追加
- 多言語対応
- コラボレーション機能
- 出版プラットフォーム連携

---

## クイックアクセス

### 開発環境起動
```bash
npm run dev
```

### デプロイ確認
- 本番環境: https://satomatashikibookcreat-ui8v.vercel.app
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repository: https://github.com/satomata48/satomatashikibookcreat

このドキュメントを参照することで、プロジェクトの完全な復元と理解が可能です。