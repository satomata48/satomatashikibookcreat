import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { Database } from './types/database';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables');
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