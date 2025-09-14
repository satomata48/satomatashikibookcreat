import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { createClient } from '$lib/supabase';

export const load: LayoutServerLoad = async ({ url, cookies }) => {
	const supabase = createClient({ cookies });

	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();

	// Protected routes redirect to auth if no session
	const protectedPaths = ['/dashboard', '/editor', '/convert'];
	const isProtectedPath = protectedPaths.some(path => url.pathname.startsWith(path));

	if (isProtectedPath && !session) {
		throw redirect(303, '/auth');
	}

	return {
		session,
	};
};