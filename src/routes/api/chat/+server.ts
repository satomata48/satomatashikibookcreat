import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { apiKey, model, messages } = await request.json();

		if (!apiKey) {
			return json({ error: 'APIキーが必要です' }, { status: 400 });
		}

		if (!model) {
			return json({ error: 'モデルが必要です' }, { status: 400 });
		}

		if (!messages || !Array.isArray(messages)) {
			return json({ error: 'メッセージが必要です' }, { status: 400 });
		}

		console.log('🔍 Gemini Chat API呼び出し開始 - モデル:', model);

		// Gemini APIフォーマットに変換
		const contents = messages.map(msg => ({
			role: msg.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: msg.content }]
		}));

		// Gemini APIへのリクエスト
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					contents
				})
			}
		);

		console.log('✅ Fetch完了 - ステータス:', response.status, response.statusText);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('⚠️ Gemini API Error Response:', {
				status: response.status,
				statusText: response.statusText,
				error: errorData
			});
			throw new Error(`Gemini APIエラー (${response.status}): ${errorData.error?.message || response.statusText}`);
		}

		const data = await response.json();

		// レスポンスからテキストを抽出
		const messageText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'レスポンスがありませんでした';

		return json({
			success: true,
			message: messageText
		});

	} catch (error: any) {
		console.error('Chat API error:', error);
		return json({
			error: 'チャット処理に失敗しました: ' + error.message,
			details: error.message
		}, { status: 500 });
	}
};
