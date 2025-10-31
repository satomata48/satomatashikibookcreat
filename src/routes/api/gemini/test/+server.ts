import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { prompt } = await request.json();

		if (!prompt) {
			return json({ error: 'プロンプトが必要です' }, { status: 400 });
		}

		if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
			return json({ error: 'Gemini APIキーが設定されていません。.env.localファイルにGEMINI_API_KEYを設定してください。' }, { status: 500 });
		}

		// Gemini API初期化
		const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
		const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

		// テキスト生成
		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();

		return json({
			success: true,
			text,
			prompt
		});

	} catch (error: any) {
		console.error('Gemini API error:', error);
		return json({
			error: 'AI処理中にエラーが発生しました',
			details: error.message
		}, { status: 500 });
	}
};
