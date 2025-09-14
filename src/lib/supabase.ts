import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { Database } from './types/database';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// 環境変数を取得し、空白文字を除去
const supabaseUrl = PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY?.trim();


if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables');
}

// より詳細な検証
if (!supabaseUrl.startsWith('https://')) {
	throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

if (!supabaseAnonKey.startsWith('eyJ')) {
	throw new Error(`Invalid Supabase key format: ${supabaseAnonKey.substring(0, 10)}...`);
}

// 非表示文字のチェック
if (/[\r\n\t]/.test(supabaseUrl)) {
	throw new Error('Supabase URL contains invalid characters (newlines/tabs)');
}

if (/[\r\n\t]/.test(supabaseAnonKey)) {
	throw new Error('Supabase key contains invalid characters (newlines/tabs)');
}

export const createClient = (event?: { cookies: any; request?: Request }) => {
	if (isBrowser()) {
		return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
	}

	if (event?.cookies) {
		return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
			cookies: {
				get: (key) => event.cookies.get(key),
				set: (key, value, options) => event.cookies.set(key, value, options),
				remove: (key, options) => event.cookies.delete(key, options),
			},
		});
	}

	// Fallback for server-side without proper event context
	return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};