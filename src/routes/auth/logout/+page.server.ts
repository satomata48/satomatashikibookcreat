import { redirect } from '@sveltejs/kit';
import { createClient } from '$lib/supabase';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async () => {
		const supabase = createClient();
		const { error } = await supabase.auth.signOut();
		
		if (error) {
			console.error('ログアウトエラー:', error);
		}
		
		throw redirect(303, '/');
	},
};