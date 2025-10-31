import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// 利用可能なLLMモデル一覧
	const models = [
		{
			id: 'gemini-pro',
			provider: 'gemini',
			name: 'Gemini Pro',
			description: 'Googleの高性能AI（テキスト生成）',
			capabilities: ['text', 'chat'],
			requiresApiKey: true,
			apiKeyLabel: 'Gemini API Key',
			getKeyUrl: 'https://makersuite.google.com/app/apikey'
		},
		{
			id: 'gemini-1.5-pro',
			provider: 'gemini',
			name: 'Gemini 1.5 Pro',
			description: 'Geminiの最新バージョン（高精度）',
			capabilities: ['text', 'chat', 'vision'],
			requiresApiKey: true,
			apiKeyLabel: 'Gemini API Key',
			getKeyUrl: 'https://makersuite.google.com/app/apikey'
		},
		{
			id: 'gpt-4',
			provider: 'openai',
			name: 'GPT-4',
			description: 'OpenAIの高性能モデル',
			capabilities: ['text', 'chat'],
			requiresApiKey: true,
			apiKeyLabel: 'OpenAI API Key',
			getKeyUrl: 'https://platform.openai.com/api-keys'
		},
		{
			id: 'gpt-3.5-turbo',
			provider: 'openai',
			name: 'GPT-3.5 Turbo',
			description: 'OpenAIの高速モデル',
			capabilities: ['text', 'chat'],
			requiresApiKey: true,
			apiKeyLabel: 'OpenAI API Key',
			getKeyUrl: 'https://platform.openai.com/api-keys'
		},
		{
			id: 'claude-3-opus',
			provider: 'claude',
			name: 'Claude 3 Opus',
			description: 'Anthropicの最高性能モデル',
			capabilities: ['text', 'chat', 'vision'],
			requiresApiKey: true,
			apiKeyLabel: 'Anthropic API Key',
			getKeyUrl: 'https://console.anthropic.com/settings/keys'
		},
		{
			id: 'claude-3-sonnet',
			provider: 'claude',
			name: 'Claude 3 Sonnet',
			description: 'Anthropicのバランス型モデル',
			capabilities: ['text', 'chat', 'vision'],
			requiresApiKey: true,
			apiKeyLabel: 'Anthropic API Key',
			getKeyUrl: 'https://console.anthropic.com/settings/keys'
		},
		{
			id: 'openrouter-auto',
			provider: 'openrouter',
			name: 'OpenRouter (自動選択)',
			description: '複数のLLMから最適なものを自動選択',
			capabilities: ['text', 'chat'],
			requiresApiKey: true,
			apiKeyLabel: 'OpenRouter API Key',
			getKeyUrl: 'https://openrouter.ai/keys'
		}
	];

	// プロバイダー別のグループ化情報
	const providers = [
		{
			id: 'gemini',
			name: 'Google Gemini',
			logo: '🔵',
			description: 'Googleの生成AI',
			color: '#4285F4'
		},
		{
			id: 'openai',
			name: 'OpenAI',
			logo: '🟢',
			description: 'ChatGPTの開発元',
			color: '#10A37F'
		},
		{
			id: 'claude',
			name: 'Anthropic Claude',
			logo: '🟣',
			description: 'Anthropicの対話AI',
			color: '#7C3AED'
		},
		{
			id: 'openrouter',
			name: 'OpenRouter',
			logo: '🔶',
			description: '複数のLLMへのアクセス',
			color: '#F97316'
		}
	];

	return json({
		success: true,
		models,
		providers
	});
};
