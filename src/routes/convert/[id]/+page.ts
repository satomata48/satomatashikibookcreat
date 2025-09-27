import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
	const { session, supabase } = await parent();
	
	if (!session) {
		throw redirect(303, '/auth');
	}
	
	const bookId = params.id;
	
	try {
		// 書籍情報を取得
		const { data: book, error: bookError } = await supabase
			.from('books')
			.select('*')
			.eq('id', bookId)
			.eq('user_id', session.user.id)
			.single();
		
		if (bookError || !book) {
			throw redirect(303, '/dashboard');
		}
		
		// 章情報を取得（順序付き）- editorページと同じカラム名を使用
		const { data: chapters, error: chaptersError } = await supabase
			.from('chapters')
			.select('*')
			.eq('book_id', bookId)
			.order('order_index', { ascending: true });
		
		if (chaptersError) {
			console.error('Error fetching chapters:', chaptersError);
		}
		
		return {
			session,
			supabase,
			book,
			chapters: chapters || []
		};
	} catch (err) {
		console.error('Convert page load error:', err);
		throw redirect(303, '/dashboard');
	}
};