# Kindle Book Maker - 電子書籍作成ツール

Kindle向け電子書籍（EPUB形式）を簡単に作成できるWebアプリケーション

## 技術スタック

- **Framework**: SvelteKit
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Styling**: Tailwind CSS + DaisyUI
- **Hosting**: Vercel
- **Type Safety**: TypeScript + Zod

## セットアップ

### 1. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PUBLIC_APP_URL=http://localhost:5173
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Supabaseのセットアップ

1. [Supabase](https://app.supabase.com)でプロジェクトを作成
2. SQLエディタで`supabase/migrations/`内のSQLファイルを順番に実行
3. Authentication設定でGoogle/GitHub OAuthを有効化（オプション）

### 4. 開発サーバーの起動

```bash
npm run dev
```

## 主な機能

- 📝 リッチテキストエディター
- 💾 リアルタイム自動保存
- 📱 マルチデバイス対応
- 👁️ プレビュー機能
- 🎯 KDP最適化
- 🌐 多言語対応（日本語、英語、中国語、韓国語）

## プロジェクト構造

```
src/
├── lib/
│   ├── api/           # API関連
│   ├── components/    # 共通コンポーネント
│   ├── schemas/       # Zodスキーマ
│   ├── stores/        # Svelteストア
│   ├── types/         # TypeScript型定義
│   └── utils/         # ユーティリティ関数
├── routes/
│   ├── auth/          # 認証ページ
│   ├── dashboard/     # ダッシュボード
│   ├── editor/        # エディター
│   ├── preview/       # プレビュー
│   └── export/        # エクスポート
└── app.css            # グローバルスタイル
```

## デプロイ

### Vercelへのデプロイ

```bash
npm run build
vercel deploy
```

必要な環境変数をVercelのダッシュボードで設定してください。

## ライセンス

MIT