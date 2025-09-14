import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { Database } from './types/database';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// 環境変数を取得し、空白文字を除去
const supabaseUrl = PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY?.trim();

// デバッグログ（詳細な文字検査を含む）
console.warn('=== SUPABASE DEBUG INFO ===');
console.warn('URL raw length:', PUBLIC_SUPABASE_URL?.length || 0);
console.warn('URL after trim length:', supabaseUrl?.length || 0);
console.warn('URL preview:', supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : 'MISSING');
console.warn('URL contains whitespace:', PUBLIC_SUPABASE_URL ? /\s/.test(PUBLIC_SUPABASE_URL) : false);
console.warn('URL has line breaks:', PUBLIC_SUPABASE_URL ? /[\r\n]/.test(PUBLIC_SUPABASE_URL) : false);

console.warn('Key raw length:', PUBLIC_SUPABASE_ANON_KEY?.length || 0);
console.warn('Key after trim length:', supabaseAnonKey?.length || 0);
console.warn('Key preview:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 50)}...` : 'MISSING');
console.warn('Key contains whitespace:', PUBLIC_SUPABASE_ANON_KEY ? /\s/.test(PUBLIC_SUPABASE_ANON_KEY) : false);
console.warn('Key has line breaks:', PUBLIC_SUPABASE_ANON_KEY ? /[\r\n]/.test(PUBLIC_SUPABASE_ANON_KEY) : false);
console.warn('=== END DEBUG INFO ===');

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