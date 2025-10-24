import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { session, supabase } = await parent();

	try {
		const { data: books, error } = await supabase
			.from('books')
			.select('*')
			.eq('user_id', session.user.id)
			.order('updated_at', { ascending: false });

		if (error) {
			console.error('Error fetching books:', error);
		}

		return {
			session,
			supabase,
			books: books || []
		};
	} catch (err) {
		console.error('Books page load error:', err);
		return {
			session,
			supabase,
			books: []
		};
	}
};
