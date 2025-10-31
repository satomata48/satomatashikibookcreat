import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { topic, slideCount = 5, theme = 'modern', userApiKey, referenceData } = await request.json();

		if (!topic) {
			return json({ error: 'トピックが必要です' }, { status: 400 });
		}

		// ユーザーのAPIキーまたはサーバーのAPIキーを使用
		const apiKey = userApiKey || GEMINI_API_KEY;

		if (!apiKey || apiKey === 'your_gemini_api_key_here') {
			return json({
				error: 'Gemini APIキーが設定されていません。ダッシュボードでAPIキーを設定してください。'
			}, { status: 500 });
		}

		// Gemini API初期化
		const genAI = new GoogleGenerativeAI(apiKey);
		const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

		// 参考スライドの分析情報を構築
		let referenceAnalysis = '';
		if (referenceData?.slides && referenceData.slides.length > 0) {
			const sampleSlides = referenceData.slides.slice(0, 3); // 最初の3枚を参考
			referenceAnalysis = `

参考プレゼンテーション: ${referenceData.presentation?.title || ''}
テーマ: ${referenceData.presentation?.theme || theme}

参考スライドの構成例:
${sampleSlides.map((slide: any, idx: number) => `
スライド${idx + 1}:
- タイトル: ${slide.title}
- レイアウト: ${slide.layout_type}
- 内容の特徴: ${slide.content?.substring(0, 200)}...
`).join('')}

上記の参考スライドのスタイル、構成、トーンを参考にしながら、新しいトピックに合わせたスライドを作成してください。
`;
		}

		// スライド生成用プロンプト
		const prompt = `
あなたはプレゼンテーション資料作成の専門家です。
以下のトピックについて、${slideCount}枚のスライドを作成してください。

トピック: ${topic}
${referenceAnalysis}

各スライドは以下のJSON形式で出力してください：
[
  {
    "title": "スライドのタイトル",
    "content": "スライドの本文（HTML形式で、<h2>、<p>、<ul>、<li>タグを使用）",
    "layout_type": "title-content",
    "speaker_notes": "発表者用のメモ"
  }
]

ルール:
1. 最初のスライドはタイトルスライドにする
2. 各スライドは簡潔で分かりやすい内容にする
3. 箇条書きを効果的に使用する
4. HTMLタグは<h2>、<h3>、<p>、<ul>、<li>、<strong>、<em>のみ使用
5. layout_typeは以下から選択: "title-only", "title-content", "two-column"
6. speaker_notesには発表時のポイントを記載
7. **JSON配列のみを出力し、説明文は含めない**
${referenceAnalysis ? '8. 参考スライドのスタイルやトーンを維持しながら、新しいトピックに適した内容を作成する' : ''}

JSON配列を出力してください：
`.trim();

		// AIにスライド生成を依頼
		const result = await model.generateContent(prompt);
		const response = await result.response;
		let text = response.text();

		// JSONのみを抽出（マークダウンコードブロックを除去）
		text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

		// JSON解析
		let slides;
		try {
			slides = JSON.parse(text);
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			console.error('Raw response:', text);
			return json({
				error: 'AIの応答をJSON形式で解析できませんでした',
				rawResponse: text
			}, { status: 500 });
		}

		// バリデーション
		if (!Array.isArray(slides)) {
			return json({
				error: 'AIの応答が配列形式ではありません',
				rawResponse: text
			}, { status: 500 });
		}

		return json({
			success: true,
			slides,
			topic,
			theme
		});

	} catch (error: any) {
		console.error('Gemini API error:', error);
		return json({
			error: 'AI処理中にエラーが発生しました',
			details: error.message
		}, { status: 500 });
	}
};
