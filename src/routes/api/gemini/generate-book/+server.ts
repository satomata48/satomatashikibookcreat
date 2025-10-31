import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { topic, chapterCount = 5, bookTitle, userApiKey, referenceData } = await request.json();

		if (!topic && !bookTitle) {
			return json({ error: 'トピックまたは書籍タイトルが必要です' }, { status: 400 });
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

		const title = bookTitle || topic;

		// 参考書籍の分析情報を構築
		let referenceAnalysis = '';
		if (referenceData?.chapters && referenceData.chapters.length > 0) {
			const sampleChapters = referenceData.chapters.slice(0, 3); // 最初の3章を参考
			referenceAnalysis = `

参考書籍: ${referenceData.book?.title || ''}
著者: ${referenceData.book?.author || '未設定'}

参考章の構成例:
${sampleChapters.map((chapter: any, idx: number) => `
第${idx + 1}章: ${chapter.title}
- 文字数: ${chapter.word_count || 0}文字
- 内容の特徴: ${chapter.content?.substring(0, 300)}...
`).join('')}

上記の参考書籍の文体、構成、トーンを参考にしながら、新しいトピックに合わせた書籍を作成してください。
`;
		}

		// 書籍生成用プロンプト
		const prompt = `
あなたはプロの著者・編集者です。
以下のトピック/タイトルについて、${chapterCount}章構成の電子書籍の内容を作成してください。

タイトル/トピック: ${title}
${referenceAnalysis}

各章は以下のJSON形式で出力してください：
[
  {
    "title": "章のタイトル",
    "content": "章の本文（HTML形式で、<h2>、<h3>、<p>、<ul>、<li>、<strong>、<em>タグを使用。段落は<p>タグで囲む。最低1000文字以上）"
  }
]

ルール:
1. 各章は独立した内容にし、読みやすく構成する
2. 最初の章は導入・概要にする
3. 各章は最低1000文字以上の充実した内容にする
4. HTMLタグは<h2>、<h3>、<p>、<ul>、<li>、<strong>、<em>のみ使用
5. 段落は必ず<p>タグで囲む
6. 箇条書きは<ul><li>を使用
7. 重要な部分は<strong>で強調
8. 専門用語には<em>を使用
9. **JSON配列のみを出力し、説明文は含めない**
10. 各章の内容は具体的で実用的な情報を含める
${referenceAnalysis ? '11. 参考書籍の文体やトーンを維持しながら、新しいトピックに適した内容を作成する' : ''}

JSON配列を出力してください：
`.trim();

		// AIに書籍生成を依頼
		const result = await model.generateContent(prompt);
		const response = await result.response;
		let text = response.text();

		// JSONのみを抽出（マークダウンコードブロックを除去）
		text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

		// JSON解析
		let chapters;
		try {
			chapters = JSON.parse(text);
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			console.error('Raw response:', text);
			return json({
				error: 'AIの応答をJSON形式で解析できませんでした',
				rawResponse: text
			}, { status: 500 });
		}

		// バリデーション
		if (!Array.isArray(chapters)) {
			return json({
				error: 'AIの応答が配列形式ではありません',
				rawResponse: text
			}, { status: 500 });
		}

		return json({
			success: true,
			chapters,
			bookTitle: title,
			chapterCount: chapters.length
		});

	} catch (error: any) {
		console.error('Gemini API error:', error);
		return json({
			error: 'AI処理中にエラーが発生しました',
			details: error.message
		}, { status: 500 });
	}
};
