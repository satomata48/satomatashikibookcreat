<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	let isSidebarOpen = true;

	const toggleSidebar = () => {
		isSidebarOpen = !isSidebarOpen;
	};

	const logout = async () => {
		await data.supabase.auth.signOut();
		goto('/');
	};

	// ナビゲーションアイテム
	const navItems = [
		{
			name: 'ダッシュボード',
			path: '/dashboard',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		},
		{
			name: '電子書籍',
			path: '/dashboard/books',
			icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
		},
		{
			name: 'カテゴリ',
			path: '/dashboard/categories',
			icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
			disabled: true
		},
		{
			name: '設定',
			path: '/dashboard/settings',
			icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
			disabled: true
		}
	];
</script>

<svelte:head>
	<title>ダッシュボード - さとまた式電子書籍クリエイター</title>
</svelte:head>

<div class="drawer lg:drawer-open">
	<input id="sidebar-toggle" type="checkbox" class="drawer-toggle" bind:checked={isSidebarOpen} />
	<div class="drawer-content flex flex-col">
		<!-- トップバー -->
		<div class="navbar-blue sticky top-0 z-10 px-4 lg:px-6">
			<div class="flex-none lg:hidden">
				<label for="sidebar-toggle" class="btn btn-square btn-ghost text-blue-700">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-6 h-6 stroke-current">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
					</svg>
				</label>
			</div>
			<div class="flex-1">
				<h1 class="text-xl font-bold text-blue-900 lg:hidden">さとまた式電子書籍クリエイター</h1>
			</div>
			<div class="flex-none">
				<div class="dropdown dropdown-end">
					<label tabindex="0" class="btn btn-ghost btn-circle avatar placeholder">
						<div class="bg-blue-100 text-blue-700 rounded-full w-10">
							<span class="text-lg">{data.session?.user.email?.[0].toUpperCase() || 'U'}</span>
						</div>
					</label>
					<ul tabindex="0" class="mt-3 p-2 shadow-lg menu menu-compact dropdown-content bg-white rounded-box w-52 border border-blue-100">
						<li class="menu-title">
							<span class="text-blue-900">{data.session?.user.email}</span>
						</li>
						<li><a href="/dashboard/settings" class="text-blue-700">設定</a></li>
						<li><button on:click={logout} class="text-red-600">ログアウト</button></li>
					</ul>
				</div>
			</div>
		</div>

		<!-- メインコンテンツ -->
		<main class="flex-1 bg-light-bg">
			<slot />
		</main>
	</div>

	<!-- サイドバー -->
	<div class="drawer-side border-r border-blue-100">
		<label for="sidebar-toggle" class="drawer-overlay"></label>
		<aside class="w-64 bg-white h-full flex flex-col">
			<!-- ロゴエリア -->
			<div class="p-6 border-b border-blue-100">
				<div class="flex items-center gap-3">
					<div class="icon-blue p-2">
						<svg class="w-8 h-8 fill-blue-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
						</svg>
					</div>
					<div>
						<h2 class="font-bold text-blue-900 text-sm">さとまた式</h2>
						<p class="text-xs text-blue-600">電子書籍クリエイター</p>
					</div>
				</div>
			</div>

			<!-- ナビゲーションメニュー -->
			<nav class="flex-1 p-4 overflow-y-auto">
				<ul class="menu gap-2">
					{#each navItems as item}
						{#if item.disabled}
							<li class="disabled">
								<a class="text-gray-400 cursor-not-allowed" title="近日公開">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
									</svg>
									{item.name}
									<span class="badge badge-xs">準備中</span>
								</a>
							</li>
						{:else}
							<li>
								<a
									href={item.path}
									class="text-blue-700 hover:bg-blue-50 {$page.url.pathname === item.path ? 'bg-blue-100 font-semibold' : ''}"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
									</svg>
									{item.name}
								</a>
							</li>
						{/if}
					{/each}
				</ul>
			</nav>

			<!-- フッター -->
			<div class="p-4 border-t border-blue-100">
				<button
					on:click={logout}
					class="btn btn-outline btn-sm w-full border-red-300 text-red-600 hover:bg-red-50"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
					ログアウト
				</button>
			</div>
		</aside>
	</div>
</div>
