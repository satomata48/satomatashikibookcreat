import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { Database } from './types/database';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

// デバッグログ（本番環境でも一時的に表示）
console.log('Environment check:');
console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables');
}

// URL形式の検証
if (!supabaseUrl.startsWith('https://')) {
	throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`);
}

if (!supabaseAnonKey.startsWith('eyJ')) {
	throw new Error(`Invalid Supabase key format: ${supabaseAnonKey.substring(0, 10)}...`);
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