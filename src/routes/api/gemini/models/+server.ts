import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { apiKey } = await request.json();

		if (!apiKey) {
			return json({ error: 'APIキーが必要です' }, { status: 400 });
		}

		console.log('🔍 Gemini API呼び出し開始 - APIキー長さ:', apiKey?.length);

		// Gemini APIから直接モデル一覧を取得
		let response;
		try {
			response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
			console.log('✅ Fetch完了 - ステータス:', response.status, response.statusText);
		} catch (fetchError: any) {
			console.error('❌ Fetch自体が失敗:', {
				message: fetchError.message,
				stack: fetchError.stack
			});
			throw new Error(`Gemini APIへの接続に失敗しました: ${fetchError.message}`);
		}

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
		const models = data.models || [];

		// モデル情報を整形
		const formattedModels = models.map((model: any) => ({
			name: model.name,
			displayName: model.displayName || model.name.replace('models/', ''),
			description: model.description || '',
			supportedGenerationMethods: model.supportedGenerationMethods || [],
			// 用途を判定
			purposes: determinePurposes(model)
		}));

		return json({
			success: true,
			models: formattedModels
		});

	} catch (error: any) {
		console.error('Gemini API error:', error);
		return json({
			error: 'モデル一覧の取得に失敗しました: ' + error.message,
			details: error.message
		}, { status: 500 });
	}
};

// モデルの用途を判定
function determinePurposes(model: any): string[] {
	const purposes: string[] = [];
	const name = model.name.toLowerCase();
	const displayName = (model.displayName || '').toLowerCase();
	const methods = model.supportedGenerationMethods || [];

	// テキスト生成（generateContentメソッドがあるもの）
	if (methods.includes('generateContent')) {
		purposes.push('text');
	}

	// デザイン・マルチモーダル（Vision系）
	if (name.includes('vision') || displayName.includes('vision') || name.includes('pro-vision')) {
		purposes.push('design');
		purposes.push('text'); // Visionモデルもテキスト生成可能
	}

	// 画像生成（Imagen等）
	if (name.includes('imagen') || displayName.includes('imagen')) {
		purposes.push('image');
	}

	// デフォルトでテキストを含める（generateContentがあれば）
	if (purposes.length === 0 && methods.includes('generateContent')) {
		purposes.push('text');
	}

	return purposes;
}
