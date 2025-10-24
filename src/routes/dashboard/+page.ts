import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { session, supabase } = await parent();

	try {
		// すべての書籍を取得
		const { data: allBooks } = await supabase
			.from('books')
			.select('*')
			.eq('user_id', session.user.id);

		// 統計情報を計算
		const stats = {
			totalBooks: allBooks?.length || 0,
			publishedBooks: allBooks?.filter(b => b.status === 'published').length || 0,
			draftBooks: allBooks?.filter(b => b.status === 'draft').length || 0,
			categories: 0 // カテゴリ機能は後で実装
		};

		// 最近更新された書籍（最大6件）
		const { data: recentBooks } = await supabase
			.from('books')
			.select('*')
			.eq('user_id', session.user.id)
			.order('updated_at', { ascending: false })
			.limit(6);

		return {
			session,
			supabase,
			stats,
			recentBooks: recentBooks || []
		};
	} catch (err) {
		console.error('Dashboard load error:', err);
		return {
			session,
			supabase,
			stats: {
				totalBooks: 0,
				publishedBooks: 0,
				draftBooks: 0,
				categories: 0
			},
			recentBooks: []
		};
	}
};
