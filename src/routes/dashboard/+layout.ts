import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent }) => {
	const { session, supabase } = await parent();

	if (!session) {
		throw redirect(303, '/auth');
	}

	try {
		// プロフィールが存在するか確認し、なければ作成
		const { data: profile } = await supabase
			.from('profiles')
			.select('id')
			.eq('id', session.user.id)
			.single();

		if (!profile) {
			await supabase.from('profiles').insert({
				id: session.user.id,
				full_name: session.user.user_metadata?.full_name || null,
				avatar_url: session.user.user_metadata?.avatar_url || null,
			});
		}

		return {
			session,
			supabase
		};
	} catch (err) {
		console.error('Dashboard layout load error:', err);
		return {
			session,
			supabase
		};
	}
};
