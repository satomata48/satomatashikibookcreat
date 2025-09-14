<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { LayoutData } from '../$types';
	
	export let data: LayoutData;
	
	// 既にログインしている場合はダッシュボードへリダイレクト
	onMount(() => {
		if (data.session) {
			goto('/dashboard');
		}
		
		// URLからエラーメッセージを取得
		const urlParams = new URLSearchParams(window.location.search);
		const urlError = urlParams.get('error');
		if (urlError) {
			switch (urlError) {
				case 'callback_failed':
					error = 'メール認証の処理に失敗しました。もう一度お試しください。';
					break;
				case 'callback_processing_failed':
					error = 'メール認証後の処理に問題がありました。';
					break;
				case 'no_code':
					error = '認証コードが見つかりませんでした。';
					break;
				default:
					error = '認証エラーが発生しました。';
			}
		}
	});
	
	let email = '';
	let password = '';
	let isLogin = true;
	let loading = false;
	let error: string | null = null;
	
	const handleAuth = async () => {
		loading = true;
		error = null;
		
		try {
			if (isLogin) {
				console.warn('=== LOGIN ATTEMPT DEBUG ===');
				console.warn('Email:', email);
				console.warn('Password length:', password.length);
				console.warn('Supabase client exists:', !!data.supabase);
				console.warn('Auth method exists:', !!data.supabase.auth.signInWithPassword);
				
				const { data: signInData, error: signInError } = await data.supabase.auth.signInWithPassword({
					email,
					password,
				});
				
				if (signInError) {
					console.error('ログインエラー:', signInError);
					// より詳細なエラーメッセージを提供
					if (signInError.message === 'Email not confirmed') {
						error = 'メールアドレスが確認されていません。確認メールをご確認ください。';
					} else if (signInError.message === 'Invalid login credentials') {
						error = 'メールアドレスまたはパスワードが正しくありません。';
					} else {
						error = `認証エラー: ${signInError.message}`;
					}
					return;
				}
				
				// ログイン成功時、プロフィールが存在するか確認
				if (signInData.user) {
					const { data: profile } = await data.supabase
						.from('profiles')
						.select('id')
						.eq('id', signInData.user.id)
						.single();
					
					// プロフィールが存在しない場合は作成
					if (!profile) {
						await data.supabase.from('profiles').insert({
							id: signInData.user.id,
							full_name: signInData.user.user_metadata?.full_name || null,
							avatar_url: signInData.user.user_metadata?.avatar_url || null,
						});
					}
					
					// セッション状態を確実に更新するためにページをリロード
					window.location.href = '/dashboard';
				}
			} else {
				const { data: signUpData, error: signUpError } = await data.supabase.auth.signUp({
					email,
					password,
					options: {
						emailRedirectTo: `https://satomatashikibookcreat-ui8v.vercel.app/auth/callback`,
					},
				});
				
				if (signUpError) throw signUpError;
				
				// 即座に確認された場合（開発環境など）はプロフィールを作成
				if (signUpData.user && signUpData.user.email_confirmed_at) {
					const { error: profileError } = await data.supabase.from('profiles').insert({
						id: signUpData.user.id,
						full_name: null,
						avatar_url: null,
					});
					
					if (!profileError) {
						window.location.href = '/dashboard';
						return;
					}
				}
				
				alert('確認メールを送信しました。メールをご確認ください。');
				return; // 新規登録でメール確認が必要な場合はリダイレクトしない
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'エラーが発生しました';
		} finally {
			loading = false;
		}
	};
	
	const handleOAuthLogin = async (provider: 'google' | 'github') => {
		loading = true;
		error = null;
		
		try {
			const { error: oauthError } = await data.supabase.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/auth/callback`,
				},
			});
			
			if (oauthError) throw oauthError;
		} catch (err) {
			error = err instanceof Error ? err.message : 'エラーが発生しました';
			loading = false;
		}
	};
</script>

<svelte:head>
	<title>{isLogin ? 'ログイン' : '新規登録'} - さとまた式電子書籍クリエイター</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center px-4">
	<div class="card-flat w-full max-w-md">
		<div class="card-body">
			<h2 class="card-title text-2xl font-bold text-center mb-6 text-blue-900">
				{isLogin ? 'ログイン' : '新規登録'}
			</h2>
			
			{#if error}
				<div class="alert bg-red-50 border border-red-200 text-red-700 mb-4">
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>{error}</span>
				</div>
			{/if}
			
			<form on:submit|preventDefault={handleAuth}>
				<div class="form-control">
					<label class="label" for="email">
						<span class="label-text text-blue-700">メールアドレス</span>
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="input input-bordered border-blue-200 focus:border-blue-400"
						placeholder="email@example.com"
						disabled={loading}
					/>
				</div>
				
				<div class="form-control mt-4">
					<label class="label" for="password">
						<span class="label-text text-blue-700">パスワード</span>
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						class="input input-bordered border-blue-200 focus:border-blue-400"
						placeholder="••••••••"
						disabled={loading}
					/>
				</div>
				
				<div class="form-control mt-6">
					<button type="submit" class="btn btn-primary-gradient btn-lg shadow-lg" disabled={loading}>
						{#if loading}
							<span class="loading loading-spinner"></span>
						{/if}
						{isLogin ? 'ログイン' : '新規登録'}
					</button>
				</div>
			</form>
			
			<div class="divider">または</div>
			
			<div class="space-y-2">
				<button
					on:click={() => handleOAuthLogin('google')}
					class="btn btn-outline w-full border-blue-200 text-blue-700 hover:bg-blue-50"
					disabled={loading}
				>
					<svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Googleでログイン
				</button>
				
				<button
					on:click={() => handleOAuthLogin('github')}
					class="btn btn-outline w-full border-blue-200 text-blue-700 hover:bg-blue-50"
					disabled={loading}
				>
					<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					GitHubでログイン
				</button>
			</div>
			
			<div class="text-center mt-6">
				<button
					type="button"
					on:click={() => isLogin = !isLogin}
					class="link text-blue-600 hover:text-blue-800"
				>
					{isLogin ? '新規登録はこちら' : 'ログインはこちら'}
				</button>
			</div>
		</div>
	</div>
</div>