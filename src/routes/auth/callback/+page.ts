import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, parent }) => {
	const { supabase } = await parent();
	const code = url.searchParams.get('code');
	const error_param = url.searchParams.get('error');
	
	// エラーパラメータがある場合は認証ページにリダイレクト
	if (error_param) {
		throw redirect(303, `/auth?error=${error_param}`);
	}
	
	// 認証コードがある場合は処理
	if (code) {
		try {
			const { data, error } = await supabase.auth.exchangeCodeForSession(code);
			
			if (error) {
				console.error('Auth callback error:', error);
				throw redirect(303, '/auth?error=callback_failed');
			}
			
			if (data.user) {
				// プロフィールが存在するか確認
				const { data: profile, error: profileFetchError } = await supabase
					.from('profiles')
					.select('id')
					.eq('id', data.user.id)
					.single();
				
				// プロフィールが存在しない場合は作成
				if (!profile) {
					const { error: profileInsertError } = await supabase.from('profiles').insert({
						id: data.user.id,
						full_name: data.user.user_metadata?.full_name || null,
						avatar_url: data.user.user_metadata?.avatar_url || null,
					});
					
					if (profileInsertError) {
						console.error('Profile creation error:', profileInsertError);
					}
				}
				
				// ユーザー認証成功
				// セッション更新を確実にするためのリダイレクト
				throw redirect(303, '/dashboard');
			}
		} catch (error) {
			console.error('Callback processing error:', error);
			throw redirect(303, '/auth?error=callback_processing_failed');
		}
	}
	
	// コードもエラーもない場合（直接アクセスなど）は認証ページへ
	throw redirect(303, '/auth');
};