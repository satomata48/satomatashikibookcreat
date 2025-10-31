import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
	const { session, supabase } = await parent();

	if (!session) {
		throw redirect(303, '/auth');
	}

	try {
		// プレゼンテーション情報取得
		const { data: presentation, error: presentationError } = await supabase
			.from('presentations')
			.select('*')
			.eq('id', params.id)
			.eq('user_id', session.user.id)
			.single();

		if (presentationError || !presentation) {
			console.error('Presentation not found:', presentationError);
			throw redirect(303, '/dashboard');
		}

		// スライドデータ取得
		const { data: slides, error: slidesError } = await supabase
			.from('slides')
			.select('*')
			.eq('presentation_id', params.id)
			.order('order_number');

		if (slidesError) {
			console.error('Error fetching slides:', slidesError);
		}

		return {
			session,
			supabase,
			presentation,
			slides: slides || []
		};
	} catch (err) {
		console.error('Slide editor load error:', err);
		throw redirect(303, '/dashboard');
	}
};
