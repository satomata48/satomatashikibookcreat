import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
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

		// 書籍データ取得
		const { data: books, error: booksError } = await supabase
			.from('books')
			.select('*')
			.eq('user_id', session.user.id)
			.order('updated_at', { ascending: false });

		if (booksError) {
			console.error('Error fetching books:', booksError);
		}

		// プレゼンテーションデータ取得
		const { data: presentations, error: presentationsError } = await supabase
			.from('presentations')
			.select('*')
			.eq('user_id', session.user.id)
			.order('updated_at', { ascending: false });

		if (presentationsError) {
			console.error('Error fetching presentations:', presentationsError);
		}

		// ユーザー設定取得
		const { data: userSettings, error: settingsError } = await supabase
			.from('user_settings')
			.select('*')
			.eq('user_id', session.user.id)
			.single();

		if (settingsError && settingsError.code !== 'PGRST116') {
			console.error('Error fetching user settings:', settingsError);
		}

		return {
			session,
			supabase,
			books: books || [],
			presentations: presentations || [],
			userSettings: userSettings || null
		};
	} catch (err) {
		console.error('Dashboard load error:', err);
		return {
			session,
			supabase,
			books: [],
			presentations: [],
			userSettings: null
		};
	}
};