<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	$: ({ supabase, session } = data);

	async function handleLogout() {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error('ログアウトエラー:', error);
		} else {
			goto('/');
		}
	}
</script>

<div class="min-h-screen bg-base-100">
	<nav class="navbar navbar-blue">
		<div class="navbar-start">
			<a href="/" class="btn btn-ghost text-xl text-blue-900 hover:bg-blue-50">
				<div class="icon-blue mr-2">
					<svg class="book-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
					</svg>
				</div>
				さとまた式電子書籍クリエイター
			</a>
		</div>
		<div class="navbar-center hidden lg:flex">
			<ul class="menu menu-horizontal px-1 text-blue-700">
				<li><a href="/" class="hover:bg-blue-50 rounded-lg">ホーム</a></li>
				{#if session}
					<li><a href="/dashboard" class="hover:bg-blue-50 rounded-lg">ダッシュボード</a></li>
				{/if}
			</ul>
		</div>
		<div class="navbar-end">
			{#if session}
				<div class="flex items-center space-x-4">
					<span class="text-sm text-blue-600">こんにちは、{session.user.email}</span>
					<div class="dropdown dropdown-end">
						<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
						<!-- svelte-ignore a11y-label-has-associated-control -->
						<label tabindex="0" class="btn btn-ghost btn-circle avatar hover:bg-blue-50">
							<div class="w-10 rounded-full border-2 border-blue-200">
								<img src={`https://ui-avatars.com/api/?name=${session.user.email}&background=2196F3&color=fff`} alt="Avatar" />
							</div>
						</label>
						<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
						<ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-white rounded-xl border border-blue-100 w-52">
							<li><a href="/dashboard" class="text-blue-700 hover:bg-blue-50 rounded-lg">
								<span class="icon-blue text-sm">📊</span> ダッシュボード
							</a></li>
							<li><button on:click={handleLogout} class="w-full text-left text-blue-700 hover:bg-blue-50 rounded-lg" type="button">
								<span class="icon-blue text-sm">🚪</span> ログアウト
							</button></li>
						</ul>
					</div>
					<button 
						on:click={handleLogout} 
						class="btn btn-outline btn-sm border-blue-300 text-blue-700 hover:bg-blue-50"
						type="button"
					>
						ログアウト
					</button>
				</div>
			{:else}
				<a href="/auth" class="btn bg-blue-500 hover:bg-blue-600 text-white border-0">ログイン</a>
			{/if}
		</div>
	</nav>
	
	<main>
		<slot />
	</main>
	
	<footer class="footer footer-center p-10 bg-blue-50 text-blue-700 rounded mt-20 border-t border-blue-100">
		<div>
			<p class="font-medium">© 2024 さとまた式電子書籍クリエイター - All rights reserved</p>
		</div>
	</footer>
</div>